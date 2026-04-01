/**
 * MAF Telemarketing - Serveur Node.js standalone
 * Remplace Cloudflare Workers/D1 par Express + better-sqlite3
 */

import Database from 'better-sqlite3';
import express from 'express';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'maf-formation-secret-dev-2024';
const DB_PATH = process.env.DB_PATH || join(__dirname, 'maf-telemarketing.db');

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// =============================================
// INITIALISATION BASE DE DONNÉES
// =============================================
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  const schema = readFileSync(join(__dirname, 'migrations/0001_initial_schema.sql'), 'utf8');
  db.exec(schema);
  // migration 2 — ALTER TABLE est idempotent via try/catch
  const m2 = join(__dirname, 'migrations/0002_add_date_appel.sql');
  if (existsSync(m2)) { try { db.exec(readFileSync(m2, 'utf8')); } catch(e) { /* colonne déjà présente */ } }
  console.log('✅ Base de données initialisée');
}

// =============================================
// CRYPTO - SHA-256 + JWT (synchrone pour Node.js)
// =============================================
function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

import { createHmac } from 'crypto';

function makeJWT(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const pl = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 8 * 3600 }));
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${pl}`).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${pl}.${sig}`;
}

function verifyJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token malformé');
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${parts[0]}.${parts[1]}`).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (sig !== parts[2]) throw new Error('Signature invalide');
  const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expiré');
  return payload;
}

// =============================================
// MIDDLEWARE AUTH
// =============================================
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: "Token d'authentification requis" });
  try {
    req.user = verifyJWT(auth.substring(7));
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Accès non autorisé pour ce rôle' });
    next();
  };
}

// =============================================
// ROUTES AUTH
// =============================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const hash = hashPassword(password);
  const user = db.prepare('SELECT id, email, nom, prenom, role, actif FROM users WHERE email = ? AND password_hash = ?').get(email, hash);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
  if (!user.actif) return res.status(403).json({ error: 'Compte désactivé.' });
  const token = makeJWT({ id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => res.json({ user: req.user }));

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis (min 6 car.)' });
  const existing = db.prepare('SELECT id FROM users WHERE id = ? AND password_hash = ?').get(req.user.id, hashPassword(current_password));
  if (!existing) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hashPassword(new_password), req.user.id);
  res.json({ message: 'Mot de passe modifié avec succès' });
});

// =============================================
// ROUTES PROSPECTS
// =============================================
const LOCK_TIMEOUT = 10; // minutes

function cleanupLocks() {
  db.prepare(`UPDATE prospects SET locked_by = NULL, locked_at = NULL, updated_at = datetime('now')
    WHERE locked_at IS NOT NULL AND locked_at < datetime('now', '-${LOCK_TIMEOUT} minutes')`).run();
}

app.get('/api/prospects/next', authMiddleware, (req, res) => {
  cleanupLocks();
  const already = db.prepare('SELECT * FROM prospects WHERE locked_by = ?').get(req.user.id);
  if (already) {
    const lockedUntil = new Date(new Date(already.locked_at).getTime() + LOCK_TIMEOUT * 60000).toISOString();
    const history = db.prepare(`SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom
      FROM appels a JOIN users u ON a.user_id = u.id WHERE a.prospect_id = ? ORDER BY a.created_at DESC LIMIT 10`).all(already.id);
    return res.json({ prospect: already, historique: history, locked_until: lockedUntil, message: 'Vous avez déjà un prospect en cours' });
  }
  const next = db.prepare(`SELECT id FROM prospects WHERE locked_by IS NULL AND statut IN ('NOUVEAU', 'AR')
    AND ((statut = 'AR' AND date_rappel <= datetime('now')) OR (statut = 'AR' AND date(date_rappel) = date('now')) OR statut = 'NOUVEAU')
    ORDER BY CASE WHEN statut = 'AR' AND date_rappel <= datetime('now') THEN 1 WHEN statut = 'AR' AND date(date_rappel) = date('now') THEN 2 WHEN statut = 'NOUVEAU' THEN 3 ELSE 4 END,
    CASE WHEN last_called_by = ? THEN 1 ELSE 0 END, date_rappel ASC, created_at ASC LIMIT 1`).get(req.user.id);
  if (!next) return res.status(404).json({ prospect: null, message: 'Aucun prospect disponible.' });
  const lock = db.prepare(`UPDATE prospects SET locked_by = ?, locked_at = datetime('now'), last_called_by = ?, updated_at = datetime('now') WHERE id = ? AND locked_by IS NULL`).run(req.user.id, req.user.id, next.id);
  if (lock.changes === 0) return res.status(409).json({ prospect: null, message: 'Prospect déjà pris. Réessayez.' });
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(next.id);
  const history = db.prepare(`SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom FROM appels a JOIN users u ON a.user_id = u.id WHERE a.prospect_id = ? ORDER BY a.created_at DESC LIMIT 10`).all(next.id);
  res.json({ prospect, historique: history, locked_until: new Date(Date.now() + LOCK_TIMEOUT * 60000).toISOString() });
});

app.post('/api/prospects/:id/release', authMiddleware, (req, res) => {
  db.prepare(`UPDATE prospects SET locked_by = NULL, locked_at = NULL, updated_at = datetime('now') WHERE id = ? AND locked_by = ?`).run(req.params.id, req.user.id);
  res.json({ message: 'Prospect libéré' });
});

app.get('/api/prospects', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const { statut, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1'; const params = [];
  if (statut) { where += ' AND p.statut = ?'; params.push(statut); }
  if (search) { where += ' AND (p.nom_entreprise LIKE ? OR p.nom_dirigeant LIKE ? OR p.telephone LIKE ? OR p.ville LIKE ?)'; const s = `%${search}%`; params.push(s,s,s,s); }
  const total = db.prepare(`SELECT COUNT(*) as total FROM prospects p WHERE ${where}`).get(...params).total;
  const results = db.prepare(`SELECT p.*, u1.nom as locked_by_nom, u1.prenom as locked_by_prenom, u2.nom as last_called_by_nom, u2.prenom as last_called_by_prenom
    FROM prospects p LEFT JOIN users u1 ON p.locked_by = u1.id LEFT JOIN users u2 ON p.last_called_by = u2.id
    WHERE ${where} ORDER BY CASE p.statut WHEN 'AR' THEN 1 WHEN 'NOUVEAU' THEN 2 WHEN 'RDV' THEN 3 WHEN 'FIN' THEN 4 END, p.updated_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ prospects: results, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
});

app.get('/api/prospects/:id', authMiddleware, (req, res) => {
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
  if (!prospect) return res.status(404).json({ error: 'Prospect non trouvé' });
  const appelsData = db.prepare(`SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom FROM appels a JOIN users u ON a.user_id = u.id WHERE a.prospect_id = ? ORDER BY a.created_at DESC`).all(req.params.id);
  const rdvData = db.prepare(`SELECT r.*, u.nom as pris_par_nom, u.prenom as pris_par_prenom FROM rdv r JOIN users u ON r.pris_par = u.id WHERE r.prospect_id = ? ORDER BY r.date_rdv DESC`).all(req.params.id);
  res.json({ prospect, appels: appelsData, rdv: rdvData });
});

app.post('/api/prospects', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const d = req.body;
  if (!d.nom_entreprise || !d.telephone) return res.status(400).json({ error: 'nom_entreprise et telephone requis' });
  const result = db.prepare(`INSERT INTO prospects (nom_entreprise, nom_dirigeant, telephone, email, ville, code_postal, code_ape, opco, budget_identifie, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(d.nom_entreprise, d.nom_dirigeant||null, d.telephone, d.email||null, d.ville||null, d.code_postal||null, d.code_ape||null, d.opco||null, d.budget_identifie||null, d.notes||null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Prospect créé' });
});

app.post('/api/prospects/import', authMiddleware, requireRole('admin'), (req, res) => {
  const { prospects: list } = req.body;
  if (!Array.isArray(list) || list.length === 0) return res.status(400).json({ error: 'Liste vide' });
  let imported = 0; const errors = [];
  const validStatuts = ['NOUVEAU', 'AR', 'RDV', 'FIN'];
  const stmt = db.prepare(`INSERT INTO prospects (nom_entreprise, nom_dirigeant, telephone, email, ville, code_postal, code_ape, opco, budget_identifie, notes, statut, compteur_nrp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertMany = db.transaction((items) => {
    for (const p of items) {
      if (!p.nom_entreprise || !p.telephone) { errors.push(`Ignoré: nom_entreprise et telephone requis`); continue; }
      const statut = validStatuts.includes(p.statut) ? p.statut : 'NOUVEAU';
      try { stmt.run(p.nom_entreprise, p.nom_dirigeant||null, p.telephone, p.email||null, p.ville||null, p.code_postal||null, p.code_ape||null, p.opco||null, p.budget_identifie||null, p.notes||null, statut, p.nrp_count||0); imported++; }
      catch(e) { errors.push(`Erreur ${p.nom_entreprise}: ${e.message}`); }
    }
  });
  insertMany(list);
  res.json({ imported, total: list.length, errors });
});

app.delete('/api/prospects/purge', authMiddleware, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM rdv').run();
  db.prepare('DELETE FROM appels').run();
  db.prepare('DELETE FROM prospects').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('prospects', 'appels', 'rdv')").run();
  res.json({ message: 'Tous les prospects, appels et RDV ont été supprimés' });
});

app.put('/api/prospects/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const d = req.body;
  db.prepare(`UPDATE prospects SET nom_entreprise=COALESCE(?,nom_entreprise), nom_dirigeant=COALESCE(?,nom_dirigeant), telephone=COALESCE(?,telephone), email=COALESCE(?,email), ville=COALESCE(?,ville), code_postal=COALESCE(?,code_postal), code_ape=COALESCE(?,code_ape), opco=COALESCE(?,opco), budget_identifie=COALESCE(?,budget_identifie), notes=COALESCE(?,notes), updated_at=datetime('now') WHERE id=?`).run(d.nom_entreprise||null,d.nom_dirigeant||null,d.telephone||null,d.email||null,d.ville||null,d.code_postal||null,d.code_ape||null,d.opco||null,d.budget_identifie||null,d.notes||null,req.params.id);
  res.json({ message: 'Prospect mis à jour' });
});

// =============================================
// ROUTES APPELS
// =============================================
app.post('/api/appels', authMiddleware, (req, res) => {
  const user = req.user;
  const d = req.body;
  if (!d.prospect_id || !d.statut_resultat) return res.status(400).json({ error: 'prospect_id et statut_resultat requis' });
  const prospect = db.prepare('SELECT * FROM prospects WHERE id = ? AND locked_by = ?').get(d.prospect_id, user.id);
  if (!prospect) return res.status(403).json({ error: 'Prospect non trouvé ou non verrouillé par vous' });
  
  const insertAppel = db.prepare(`INSERT INTO appels (prospect_id, user_id, statut_resultat, commentaire, duree_secondes, date_rappel, date_appel) VALUES (?,?,?,?,?,?,?)`);
  
  try {
    db.transaction(() => {
      insertAppel.run(d.prospect_id, user.id, d.statut_resultat, d.commentaire||null, d.duree_secondes||null, d.date_rappel||null, d.date_appel||null);
      switch(d.statut_resultat) {
        case 'NRP': {
          const nrp = (prospect.compteur_nrp || 0) + 1;
          if (nrp >= 5) db.prepare(`UPDATE prospects SET statut='FIN', motif_fin='HORS_CIBLE', compteur_nrp=?, locked_by=NULL, locked_at=NULL, updated_at=datetime('now') WHERE id=?`).run(nrp, d.prospect_id);
          else db.prepare(`UPDATE prospects SET compteur_nrp=?, date_rappel=datetime('now','+2 hours'), statut='AR', locked_by=NULL, locked_at=NULL, updated_at=datetime('now') WHERE id=?`).run(nrp, d.prospect_id);
          break;
        }
        case 'AR': {
          if (!d.date_rappel) throw new Error('date_rappel requis');
          db.prepare(`UPDATE prospects SET statut='AR', date_rappel=?, compteur_nrp=0, locked_by=NULL, locked_at=NULL, updated_at=datetime('now') WHERE id=?`).run(d.date_rappel, d.prospect_id);
          break;
        }
        case 'RDV': {
          if (!d.rdv_date) throw new Error('rdv_date requis');
          db.prepare(`UPDATE prospects SET statut='RDV', locked_by=NULL, locked_at=NULL, compteur_nrp=0, updated_at=datetime('now') WHERE id=?`).run(d.prospect_id);
          db.prepare(`INSERT INTO rdv (prospect_id, pris_par, date_rdv, lieu, type_rdv, formation_souhaitee, commentaires) VALUES (?,?,?,?,?,?,?)`).run(d.prospect_id, user.id, d.rdv_date, d.rdv_lieu||null, d.rdv_type||'presentiel', d.rdv_formation||null, d.rdv_commentaires||null);
          break;
        }
        case 'FIN': {
          db.prepare(`UPDATE prospects SET statut='FIN', motif_fin=?, locked_by=NULL, locked_at=NULL, updated_at=datetime('now') WHERE id=?`).run(d.motif_fin||'AUTRE', d.prospect_id);
          break;
        }
      }
    })();
    res.json({ message: `Appel enregistré: ${d.statut_resultat}`, statut_resultat: d.statut_resultat });
  } catch(e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/appels/history/:prospectId', authMiddleware, (req, res) => {
  const appelsData = db.prepare(`SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom FROM appels a JOIN users u ON a.user_id = u.id WHERE a.prospect_id = ? ORDER BY a.created_at DESC`).all(req.params.prospectId);
  res.json({ appels: appelsData });
});

app.get('/api/appels/my-today', authMiddleware, (req, res) => {
  const appelsData = db.prepare(`SELECT a.*, p.nom_entreprise, p.telephone FROM appels a JOIN prospects p ON a.prospect_id = p.id WHERE a.user_id = ? AND date(a.created_at) = date('now') ORDER BY a.created_at DESC`).all(req.user.id);
  res.json({ appels: appelsData });
});

// =============================================
// ROUTES RDV
// =============================================
app.get('/api/rdv', authMiddleware, (req, res) => {
  const { statut, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where = '1=1'; const params = [];
  if (statut) { where += ' AND r.statut = ?'; params.push(statut); }
  const total = db.prepare(`SELECT COUNT(*) as total FROM rdv r WHERE ${where}`).get(...params).total;
  const results = db.prepare(`SELECT r.*, p.nom_entreprise, p.telephone, p.ville, u.nom as pris_par_nom, u.prenom as pris_par_prenom FROM rdv r JOIN prospects p ON r.prospect_id = p.id JOIN users u ON r.pris_par = u.id WHERE ${where} ORDER BY r.date_rdv ASC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ rdv: results, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/parseInt(limit)) } });
});

app.get('/api/rdv/:id', authMiddleware, (req, res) => {
  const rdvData = db.prepare(`SELECT r.*, p.nom_entreprise, p.telephone, p.ville, p.nom_dirigeant, u.nom as pris_par_nom, u.prenom as pris_par_prenom FROM rdv r JOIN prospects p ON r.prospect_id = p.id JOIN users u ON r.pris_par = u.id WHERE r.id = ?`).get(req.params.id);
  if (!rdvData) return res.status(404).json({ error: 'RDV non trouvé' });
  res.json({ rdv: rdvData });
});

app.put('/api/rdv/:id', authMiddleware, (req, res) => {
  const d = req.body;
  db.prepare(`UPDATE rdv SET statut=COALESCE(?,statut), date_rdv=COALESCE(?,date_rdv), lieu=COALESCE(?,lieu), type_rdv=COALESCE(?,type_rdv), formation_souhaitee=COALESCE(?,formation_souhaitee), commentaires=COALESCE(?,commentaires), updated_at=datetime('now') WHERE id=?`).run(d.statut||null,d.date_rdv||null,d.lieu||null,d.type_rdv||null,d.formation_souhaitee||null,d.commentaires||null,req.params.id);
  res.json({ message: 'RDV mis à jour' });
});

app.delete('/api/rdv/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  db.prepare(`UPDATE rdv SET statut='ANNULE', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ message: 'RDV annulé' });
});

// =============================================
// ROUTES DASHBOARD
// =============================================
app.get('/api/dashboard/stats', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as n FROM prospects").get().n;
  const nouveaux = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE statut='NOUVEAU'").get().n;
  const a_rappeler = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE statut='AR'").get().n;
  const rdv_pris = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE statut='RDV'").get().n;
  const clotures = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE statut='FIN'").get().n;
  const ar_en_retard = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE statut='AR' AND date_rappel IS NOT NULL AND date_rappel <= datetime('now')").get().n;
  const en_cours = db.prepare("SELECT COUNT(*) as n FROM prospects WHERE locked_by IS NOT NULL").get().n;

  const upcomingRdv = db.prepare(`
    SELECT r.*, p.nom_entreprise, p.telephone, p.ville,
      u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    JOIN users u ON r.pris_par = u.id
    WHERE r.statut NOT IN ('ANNULE','REPORTE') AND r.date_rdv >= datetime('now')
    ORDER BY r.date_rdv ASC LIMIT 10
  `).all();

  const operators = db.prepare(`
    SELECT u.id, u.nom, u.prenom,
      COUNT(a.id) as total_appels,
      SUM(CASE WHEN a.statut_resultat='RDV' THEN 1 ELSE 0 END) as nb_rdv,
      SUM(CASE WHEN a.statut_resultat='AR'  THEN 1 ELSE 0 END) as nb_ar,
      SUM(CASE WHEN a.statut_resultat='NRP' THEN 1 ELSE 0 END) as nb_nrp,
      SUM(CASE WHEN a.statut_resultat='FIN' THEN 1 ELSE 0 END) as nb_fin,
      MAX(CASE WHEN p2.locked_by = u.id THEN 1 ELSE 0 END) as prospect_en_cours
    FROM users u
    LEFT JOIN appels a ON u.id = a.user_id AND date(a.created_at) = date('now')
    LEFT JOIN prospects p2 ON p2.locked_by = u.id
    WHERE u.actif=1 AND u.role IN ('operator','supervisor','admin')
    GROUP BY u.id
    ORDER BY total_appels DESC
  `).all();

  res.json({
    global: { total, nouveaux, a_rappeler, ar_en_retard, rdv_pris, en_cours, clotures },
    operators,
    upcomingRdv
  });
});

app.get('/api/dashboard/my-stats', authMiddleware, (req, res) => {
  const today = db.prepare("SELECT COUNT(*) as n FROM appels WHERE user_id=? AND date(created_at)=date('now')").get(req.user.id).n;
  const rdvToday = db.prepare("SELECT COUNT(*) as n FROM appels WHERE user_id=? AND statut_resultat='RDV' AND date(created_at)=date('now')").get(req.user.id).n;
  const nrpToday = db.prepare("SELECT COUNT(*) as n FROM appels WHERE user_id=? AND statut_resultat='NRP' AND date(created_at)=date('now')").get(req.user.id).n;
  res.json({ appels_aujourd_hui: today, rdv_aujourd_hui: rdvToday, nrp_aujourd_hui: nrpToday });
});

// =============================================
// ROUTES USERS
// =============================================
app.get('/api/users', authMiddleware, requireRole('admin'), (req, res) => {
  const users = db.prepare("SELECT id, email, nom, prenom, role, actif, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ users });
});

app.post('/api/users', authMiddleware, requireRole('admin'), (req, res) => {
  const d = req.body;
  if (!d.email || !d.password || !d.nom || !d.prenom || !d.role)
    return res.status(400).json({ error: 'email, password, nom, prenom, role requis' });
  try {
    const result = db.prepare(`INSERT INTO users (email, password_hash, nom, prenom, role) VALUES (?,?,?,?,?)`).run(d.email, hashPassword(d.password), d.nom, d.prenom, d.role);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Utilisateur créé' });
  } catch(e) { res.status(400).json({ error: 'Email déjà utilisé' }); }
});

app.put('/api/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const d = req.body;
  if (d.password) db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hashPassword(d.password), req.params.id);
  db.prepare(`UPDATE users SET nom=COALESCE(?,nom), prenom=COALESCE(?,prenom), role=COALESCE(?,role), actif=COALESCE(?,actif), updated_at=datetime('now') WHERE id=?`).run(d.nom||null,d.prenom||null,d.role||null,d.actif!=null?d.actif:null,req.params.id);
  res.json({ message: 'Utilisateur mis à jour' });
});

app.delete('/api/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = req.params.id;
  // Empêcher l'admin de se supprimer lui-même
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
  // Libérer les prospects verrouillés par cet utilisateur
  db.prepare("UPDATE prospects SET locked_by=NULL, locked_at=NULL WHERE locked_by=?").run(id);
  // Supprimer définitivement
  db.prepare("DELETE FROM users WHERE id=?").run(id);
  res.json({ message: 'Utilisateur supprimé' });
});

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'MAF Telemarketing' }));

// =============================================
// SPA - Servir le frontend
// =============================================
app.use('/static', (req, res, next) => {
  const file = req.path.replace(/^\/+/, '');
  if (!file) return next();
  const filePath = join(__dirname, 'public/static', file);
  if (!existsSync(filePath)) return next();
  res.sendFile(filePath);
});

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MAF Formation - Plateforme Telemarketing</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="/static/tailwind.js?v=1774348216"><\/script>
    <link href="/static/fontawesome.css?v=1774348216" rel="stylesheet">
    <script src="/static/axios.min.js?v=1774348216"><\/script>
    <script src="/static/xlsx.min.js?v=1774348216"><\/script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              maf: {
                50: '#fff4f0',
                100: '#ffe6dc',
                200: '#ffcab3',
                300: '#ffa480',
                400: '#f47650',
                500: '#e8642c',
                600: '#d4501e',
                700: '#b03c16',
                800: '#8e3218',
                900: '#742c18',
                950: '#3f130a',
              },
              surface: {
                50: '#fafafa',
                100: '#f0f0f2',
                200: '#e2e2e6',
                300: '#c7c7ce',
                400: '#9e9eab',
                500: '#78788a',
                600: '#5c5c6e',
                700: '#48485a',
                800: '#2c2c38',
                900: '#1c1c24',
                950: '#111116',
              }
            },
            fontFamily: {
              sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
              mono: ['JetBrains Mono', 'monospace'],
            }
          }
        }
      }
    <\/script>
    <style>
      *, *::before, *::after { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
      
      /* =====================================================
         MAF FORMATION - WARM LIGHT PREMIUM UI v5.0
         Identite visuelle : BLANC + GRIS CHAUD + ORANGE MAF
         Palette : #FFFFFF / #F5F5F5 / #EEEEEE / #E8642C
         Effet Apple : lumineux, aere, joyeux, premium
         ===================================================== */

      /* ====== ROOT VARIABLES ====== */
      :root {
        --maf-orange: #E8642C;
        --maf-orange-light: #F06525;
        --maf-orange-glow: rgba(232,100,44,0.15);
        --maf-peach: #FDEAE3;
        --maf-peach-light: #FFF4F0;
        --bg-primary: #F5F5F5;
        --bg-white: #FFFFFF;
        --bg-card: #FFFFFF;
        --text-dark: #111111;
        --text-medium: #222222;
        --text-light: #444444;
        --text-muted: #666666;
        --border-light: #E8E8E8;
        --border-medium: #DDDDDD;
        --shadow-soft: 0 2px 12px rgba(0,0,0,0.06);
        --shadow-medium: 0 8px 30px rgba(0,0,0,0.08);
        --shadow-hover: 0 12px 40px rgba(232,100,44,0.12), 0 4px 12px rgba(0,0,0,0.06);
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --radius-xl: 20px;
      }

      /* ====== BODY - FOND BLANC/GRIS LUMINEUX ====== */
      body {
        background: var(--bg-primary);
        min-height: 100vh;
        overflow-x: hidden;
        color: var(--text-dark);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Lueur orange tres subtile en haut a gauche - style Apple */
      body::before {
        content: '';
        position: fixed;
        top: -20%; left: -10%;
        width: 60%; height: 60%;
        background: radial-gradient(ellipse, rgba(232,100,44,0.06) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      /* Lueur peche en bas a droite */
      body::after {
        content: '';
        position: fixed;
        bottom: -20%; right: -10%;
        width: 50%; height: 50%;
        background: radial-gradient(ellipse, rgba(251,146,60,0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
      #app { position: relative; z-index: 1; }

      /* ====== CARTES BLANCHES - Apple Card Style ====== */
      .glass {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-soft);
      }
      .glass-light {
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.6);
      }
      .glass-card {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        box-shadow: var(--shadow-soft);
      }
      .glass-card:hover {
        border-color: rgba(232,100,44,0.25);
        transform: translateY(-3px);
        box-shadow: var(--shadow-hover);
      }
      .glass-card-static {
        background: var(--bg-white);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-soft);
      }

      /* ====== INPUTS - Propres et lumineux ====== */
      .glass-input {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
      }
      .glass-input:focus {
        background: var(--bg-white);
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        outline: none;
      }
      .glass-input::placeholder { color: #999999; }

      /* ====== ANIMATIONS - Fluides Apple-like ====== */
      .fade-in { animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .slide-up { animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      .scale-in { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      
      .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
      .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
      .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
      .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
      .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
      .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
      .stagger-children > * { animation-fill-mode: both; }

      .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 6px 24px rgba(232,100,44,0.2); }
        50% { box-shadow: 0 10px 48px rgba(232,100,44,0.35); }
      }
      .float { animation: float 6s ease-in-out infinite; }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

      .count-up { animation: countReveal 0.6s ease-out both; }
      @keyframes countReveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      /* Rotation douce pour l'icone login */
      .icon-breathe { animation: iconBreathe 4s ease-in-out infinite; }
      @keyframes iconBreathe {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.05) rotate(2deg); }
        75% { transform: scale(1.05) rotate(-2deg); }
      }

      /* ====== PULSE & URGENCE ====== */
      .pulse-dot { animation: pulseDot 2s infinite; }
      @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .timer-urgent { animation: urgentPulse 1s infinite; color: #dc2626; }
      @keyframes urgentPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

      /* ====== BOUTONS - Orange MAF vibrant ====== */
      .btn-primary {
        background: linear-gradient(135deg, #E8642C 0%, #F06525 50%, #E8642C 100%);
        background-size: 200% auto;
        color: white;
        font-weight: 600;
        padding: 0.625rem 1.5rem;
        border-radius: var(--radius-sm);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        box-shadow: 0 4px 14px rgba(232,100,44,0.3);
        cursor: pointer;
        letter-spacing: 0.01em;
      }
      .btn-primary:hover {
        background-position: right center;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(232,100,44,0.4);
      }
      .btn-primary:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(232,100,44,0.3); }

      .btn-secondary {
        background: var(--bg-white);
        color: var(--text-medium);
        font-weight: 500;
        padding: 0.5rem 1.25rem;
        border-radius: var(--radius-sm);
        border: 1.5px solid var(--border-medium);
        transition: all 0.25s ease;
        cursor: pointer;
      }
      .btn-secondary:hover { background: #F0F0F0; color: var(--text-dark); border-color: #CCCCCC; transform: translateY(-1px); }

      .btn-danger { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(239,68,68,0.25); cursor: pointer; }
      .btn-danger:hover { box-shadow: 0 8px 25px rgba(239,68,68,0.35); transform: translateY(-2px); }
      .btn-success { background: linear-gradient(135deg, #10B981, #059669); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(16,185,129,0.25); cursor: pointer; }
      .btn-success:hover { box-shadow: 0 8px 25px rgba(16,185,129,0.35); transform: translateY(-2px); }
      .btn-warning { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; font-weight: 600; padding: 0.5rem 1.25rem; border-radius: var(--radius-sm); border: none; transition: all 0.25s; box-shadow: 0 4px 14px rgba(245,158,11,0.25); cursor: pointer; }
      .btn-warning:hover { box-shadow: 0 8px 25px rgba(245,158,11,0.35); transform: translateY(-2px); }

      /* ====== BADGES ====== */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.7rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      /* ====== STAT CARDS - Effet elevation ====== */
      .stat-card {
        transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: var(--accent, var(--maf-orange));
        border-radius: 3px 3px 0 0;
        opacity: 0;
        transition: opacity 0.35s;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }

      /* ====== MODAL - Backdrop flou lumineux ====== */
      .modal-overlay {
        background: rgba(0,0,0,0.25);
        backdrop-filter: blur(12px) saturate(120%);
        -webkit-backdrop-filter: blur(12px) saturate(120%);
      }

      /* ====== SCROLLBAR - Orange subtil ====== */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #D5D5D5; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #E8642C; }

      /* ====== TABLE - Claire et aeree ====== */
      .dark-table { border-collapse: separate; border-spacing: 0; width: 100%; }
      .dark-table thead th {
        color: #444444;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.875rem 1rem;
        border-bottom: 2px solid #EEEEEE;
        background: #FAFAFA;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .dark-table tbody tr { transition: all 0.2s ease; }
      .dark-table tbody tr:hover { background: var(--maf-peach-light); }
      .dark-table tbody td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid #F0F0F0;
        color: #1A1A1A;
        font-size: 0.82rem;
      }

      /* ====== CONFETTI ====== */
      .confetti-container { position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden; }
      .confetti { position: absolute; opacity: 0; animation: confettiFall 3.5s ease-in forwards; }
      @keyframes confettiFall { 
        0% { opacity: 1; transform: translateY(-100vh) rotate(0deg) scale(1); } 
        50% { opacity: 1; }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg) scale(0.5); } 
      }

      .success-glow { animation: successGlow 2.5s ease-out; }
      @keyframes successGlow { 
        0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 
        40% { box-shadow: 0 0 50px 20px rgba(16,185,129,0.15); } 
        100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } 
      }

      /* ====== PROGRESS BAR ====== */
      .progress-bar-glow { position: relative; overflow: hidden; border-radius: 999px; }
      .progress-bar-glow::after {
        content: '';
        position: absolute;
        top: 0; left: -50%;
        width: 50%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        animation: progressSweep 2s ease-in-out infinite;
      }
      @keyframes progressSweep { 0% { left: -50%; } 100% { left: 150%; } }

      /* ====== TYPOGRAPHY ====== */
      .text-gradient {
        background: linear-gradient(135deg, #E8642C, #F59E0B);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ====== ACTION BUTTONS - pour resultats appel ====== */
      .action-btn {
        background: var(--bg-white);
        border: 1.5px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 1rem 1.125rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .action-btn:hover {
        transform: translateX(6px);
        border-color: var(--btn-color, var(--border-medium));
        background: var(--btn-bg, var(--maf-peach-light));
        box-shadow: 0 6px 20px var(--btn-glow, rgba(0,0,0,0.05));
      }

      /* ====== FORM ELEMENTS ====== */
      select, input[type="number"] {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        border-radius: var(--radius-sm);
        transition: all 0.25s;
      }
      select:focus, input[type="number"]:focus {
        outline: none;
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        background: var(--bg-white);
      }
      select option { background: var(--bg-white); color: var(--text-dark); }
      textarea {
        background: #F8F8F8;
        border: 1.5px solid var(--border-medium);
        color: var(--text-dark);
        border-radius: var(--radius-sm);
        transition: all 0.25s;
      }
      textarea:focus {
        outline: none;
        border-color: var(--maf-orange);
        box-shadow: 0 0 0 3px var(--maf-orange-glow);
        background: var(--bg-white);
      }
      textarea::placeholder { color: #999999; }
      input[type="datetime-local"], input[type="text"], input[type="tel"], input[type="email"], input[type="password"] {
        color-scheme: light;
      }

      /* ====== DIVERS ====== */
      .divider { height: 1px; background: linear-gradient(90deg, transparent, #E0E0E0, transparent); margin: 0.5rem 0; }
      
      .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; position: relative; display: inline-block; }
      .live-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(16,185,129,0.25); animation: livePing 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      @keyframes livePing { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
      
      .hover-lift { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
      
      .particle-field { display: none; }

      /* ====== LOGIN PAGE SPECIFIC ====== */
      .login-bg {
        background: linear-gradient(160deg, #F5F5F5 0%, #FDEAE3 40%, #FFF4F0 60%, #F5F5F5 100%);
        min-height: 100vh;
      }
      .login-card {
        background: var(--bg-white);
        border-radius: var(--radius-xl);
        box-shadow: 0 25px 80px rgba(232,100,44,0.08), 0 8px 32px rgba(0,0,0,0.06);
        border: 1px solid rgba(232,100,44,0.06);
      }
      .login-icon-circle {
        width: 80px; height: 80px;
        border-radius: 50%;
        background: var(--maf-peach);
        display: flex; align-items: center; justify-content: center;
      }
      .login-icon-circle i { color: var(--maf-orange); font-size: 2rem; }

      /* ====== NAVBAR - Clean white Apple-style ====== */
      .nav-bar {
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid rgba(0,0,0,0.06);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .nav-link {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-weight: 600;
        transition: all 0.25s ease;
        color: var(--text-muted);
        text-decoration: none;
        display: flex;
        align-items: center;
      }
      .nav-link:hover { color: var(--text-medium); background: #F5F5F5; }
      .nav-link.active { color: var(--maf-orange); background: var(--maf-peach-light); }

      /* ====== SECTION HEADERS ====== */
      .section-title { 
        font-size: 1.375rem; 
        font-weight: 800; 
        color: var(--text-dark);
        letter-spacing: -0.02em;
      }
      .section-subtitle { 
        font-size: 0.85rem; 
        color: var(--text-light); 
        margin-top: 0.25rem;
        font-weight: 400;
      }
    </style>
</head>
<body>
    <div id="app"></div>
    <script src="/static/app.js?v=1774349509"><\/script>
</body>
</html>`;

app.use((req, res) => {
  console.log('SPA fallback hit:', req.method, req.path);
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.type('html').send(HTML);
});

// =============================================
// SEED - Comptes de démo si DB vide
// =============================================
function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) as n FROM users").get().n;
  if (count > 0) return;
  const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
  // Le seed.sql utilise des hash SHA-256 — on insère directement
  try { db.exec(seed); console.log('✅ Données de démo insérées'); }
  catch(e) { console.warn('⚠️ Seed partiel:', e.message); }
}

// =============================================
// DÉMARRAGE
// =============================================
initDB();
seedIfEmpty();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MAF Telemarketing démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📊 DB: ${DB_PATH}`);
});
