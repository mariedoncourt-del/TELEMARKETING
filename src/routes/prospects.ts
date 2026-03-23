import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { requireRole } from './auth';

const prospects = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const LOCK_TIMEOUT_MINUTES = 10;

// Nettoyer les verrous expirés (appelé à chaque requête critique)
async function cleanupStaleLocks(db: D1Database) {
  await db.prepare(`
    UPDATE prospects 
    SET locked_by = NULL, locked_at = NULL, updated_at = datetime('now')
    WHERE locked_at IS NOT NULL 
      AND locked_at < datetime('now', '-${LOCK_TIMEOUT_MINUTES} minutes')
  `).run();
}

// GET /api/prospects/next - Obtenir le prochain prospect (file d'attente commune)
prospects.get('/next', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 1. Nettoyer les verrous expirés
  await cleanupStaleLocks(db);

  // 2. Vérifier si l'opérateur a déjà un prospect verrouillé
  const alreadyLocked = await db.prepare(
    'SELECT * FROM prospects WHERE locked_by = ?'
  ).bind(user.id).first();

  if (alreadyLocked) {
    return c.json({
      prospect: alreadyLocked,
      locked_until: new Date(new Date(alreadyLocked.locked_at as string).getTime() + LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString(),
      message: 'Vous avez déjà un prospect en cours'
    });
  }

  // 3. Sélection du prochain prospect avec priorités métier
  // D1/SQLite n'a pas FOR UPDATE SKIP LOCKED, on utilise une approche atomique
  const nextProspect = await db.prepare(`
    SELECT id FROM prospects
    WHERE locked_by IS NULL
      AND statut IN ('NOUVEAU', 'AR')
      AND (
        -- Priorité 1: AR en retard (date_rappel passée)
        (statut = 'AR' AND date_rappel <= datetime('now'))
        OR
        -- Priorité 2: AR du jour
        (statut = 'AR' AND date(date_rappel) = date('now'))
        OR
        -- Priorité 3: Nouveaux prospects
        (statut = 'NOUVEAU')
      )
    ORDER BY 
      CASE 
        WHEN statut = 'AR' AND date_rappel <= datetime('now') THEN 1
        WHEN statut = 'AR' AND date(date_rappel) = date('now') THEN 2
        WHEN statut = 'NOUVEAU' THEN 3
        ELSE 4
      END,
      -- Équité: éviter qu'un agent monopolise les mêmes prospects
      CASE WHEN last_called_by = ? THEN 1 ELSE 0 END,
      date_rappel ASC,
      created_at ASC
    LIMIT 1
  `).bind(user.id).first();

  if (!nextProspect) {
    return c.json({ 
      prospect: null,
      message: 'Aucun prospect disponible. Tous sont traités ou verrouillés.' 
    }, 404);
  }

  // 4. Verrouillage atomique avec vérification
  const lockResult = await db.prepare(`
    UPDATE prospects 
    SET locked_by = ?, locked_at = datetime('now'), last_called_by = ?, updated_at = datetime('now')
    WHERE id = ? AND locked_by IS NULL
  `).bind(user.id, user.id, nextProspect.id).run();

  if (!lockResult.meta.changes || lockResult.meta.changes === 0) {
    // Race condition: un autre opérateur a verrouillé entre-temps, on réessaie
    return c.json({ 
      prospect: null,
      message: 'Prospect déjà pris par un collègue. Réessayez.' 
    }, 409);
  }

  // 5. Récupérer le prospect verrouillé avec l'historique
  const prospect = await db.prepare('SELECT * FROM prospects WHERE id = ?').bind(nextProspect.id).first();
  
  const history = await db.prepare(`
    SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom
    FROM appels a 
    JOIN users u ON a.user_id = u.id
    WHERE a.prospect_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).bind(nextProspect.id).all();

  return c.json({
    prospect,
    historique: history.results,
    locked_until: new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString()
  });
});

// POST /api/prospects/:id/release - Libérer un prospect sans action
prospects.post('/:id/release', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const prospectId = parseInt(c.req.param('id'));

  await db.prepare(`
    UPDATE prospects SET locked_by = NULL, locked_at = NULL, updated_at = datetime('now')
    WHERE id = ? AND locked_by = ?
  `).bind(prospectId, user.id).run();

  return c.json({ message: 'Prospect libéré' });
});

// GET /api/prospects - Liste complète (superviseur/admin)
prospects.get('/', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const statut = c.req.query('statut');
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params: any[] = [];

  if (statut) {
    where += ' AND p.statut = ?';
    params.push(statut);
  }

  if (search) {
    where += ' AND (p.nom_entreprise LIKE ? OR p.nom_dirigeant LIKE ? OR p.telephone LIKE ? OR p.ville LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM prospects p WHERE ${where}`
  ).bind(...params).first();

  const results = await db.prepare(`
    SELECT p.*, 
      u1.nom as locked_by_nom, u1.prenom as locked_by_prenom,
      u2.nom as last_called_by_nom, u2.prenom as last_called_by_prenom
    FROM prospects p
    LEFT JOIN users u1 ON p.locked_by = u1.id
    LEFT JOIN users u2 ON p.last_called_by = u2.id
    WHERE ${where}
    ORDER BY 
      CASE p.statut
        WHEN 'AR' THEN 1
        WHEN 'NOUVEAU' THEN 2
        WHEN 'RDV' THEN 3
        WHEN 'FIN' THEN 4
      END,
      p.updated_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  return c.json({
    prospects: results.results,
    pagination: {
      page,
      limit,
      total: (countResult as any).total,
      pages: Math.ceil((countResult as any).total / limit)
    }
  });
});

// GET /api/prospects/:id - Détail d'un prospect
prospects.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  const prospect = await db.prepare('SELECT * FROM prospects WHERE id = ?').bind(id).first();
  if (!prospect) return c.json({ error: 'Prospect non trouvé' }, 404);

  const appels = await db.prepare(`
    SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom
    FROM appels a JOIN users u ON a.user_id = u.id
    WHERE a.prospect_id = ?
    ORDER BY a.created_at DESC
  `).bind(id).all();

  const rdvs = await db.prepare(`
    SELECT r.*, u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r JOIN users u ON r.pris_par = u.id
    WHERE r.prospect_id = ?
    ORDER BY r.date_rdv DESC
  `).bind(id).all();

  return c.json({ prospect, appels: appels.results, rdv: rdvs.results });
});

// POST /api/prospects - Créer un prospect (admin)
prospects.post('/', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const data = await c.req.json();

  const result = await db.prepare(`
    INSERT INTO prospects (nom_entreprise, nom_dirigeant, telephone, email, ville, code_postal, code_ape, opco, budget_identifie, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nom_entreprise, data.nom_dirigeant || null, data.telephone,
    data.email || null, data.ville || null, data.code_postal || null,
    data.code_ape || null, data.opco || null, data.budget_identifie || null,
    data.notes || null
  ).run();

  return c.json({ id: result.meta.last_row_id, message: 'Prospect créé' }, 201);
});

// POST /api/prospects/import - Import CSV/Excel (admin)
// Accepte statut (NOUVEAU/AR/RDV/FIN) et nrp_count pour préserver les données Excel
prospects.post('/import', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const { prospects: prospectsList } = await c.req.json<{ prospects: any[] }>();

  if (!Array.isArray(prospectsList) || prospectsList.length === 0) {
    return c.json({ error: 'Liste de prospects vide ou invalide' }, 400);
  }

  let imported = 0;
  let errors: string[] = [];
  const validStatuts = ['NOUVEAU', 'AR', 'RDV', 'FIN'];

  for (const p of prospectsList) {
    try {
      if (!p.nom_entreprise || !p.telephone) {
        errors.push(`Ligne ignorée: nom_entreprise et telephone obligatoires`);
        continue;
      }
      // Valider et normaliser le statut
      const statut = validStatuts.includes(p.statut) ? p.statut : 'NOUVEAU';
      const nrpCount = typeof p.nrp_count === 'number' ? p.nrp_count : 0;

      await db.prepare(`
        INSERT INTO prospects (nom_entreprise, nom_dirigeant, telephone, email, ville, code_postal, code_ape, opco, budget_identifie, notes, statut, compteur_nrp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        p.nom_entreprise, p.nom_dirigeant || null, p.telephone,
        p.email || null, p.ville || null, p.code_postal || null,
        p.code_ape || null, p.opco || null, p.budget_identifie || null,
        p.notes || null, statut, nrpCount
      ).run();
      imported++;
    } catch (e: any) {
      errors.push(`Erreur pour ${p.nom_entreprise}: ${e.message}`);
    }
  }

  return c.json({ imported, total: prospectsList.length, errors });
});

// DELETE /api/prospects/purge - Supprimer tous les prospects (admin only)
prospects.delete('/purge', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  
  // Supprimer d'abord les tables dépendantes
  await db.prepare('DELETE FROM rdv').run();
  await db.prepare('DELETE FROM appels').run();
  await db.prepare('DELETE FROM prospects').run();
  
  // Reset auto-increment
  await db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('prospects', 'appels', 'rdv')").run();
  
  return c.json({ message: 'Tous les prospects, appels et RDV ont été supprimés' });
});

// PUT /api/prospects/:id - Modifier un prospect (admin/supervisor)
prospects.put('/:id', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  await db.prepare(`
    UPDATE prospects SET 
      nom_entreprise = COALESCE(?, nom_entreprise),
      nom_dirigeant = COALESCE(?, nom_dirigeant),
      telephone = COALESCE(?, telephone),
      email = COALESCE(?, email),
      ville = COALESCE(?, ville),
      code_postal = COALESCE(?, code_postal),
      code_ape = COALESCE(?, code_ape),
      opco = COALESCE(?, opco),
      budget_identifie = COALESCE(?, budget_identifie),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    data.nom_entreprise || null, data.nom_dirigeant || null,
    data.telephone || null, data.email || null,
    data.ville || null, data.code_postal || null,
    data.code_ape || null, data.opco || null,
    data.budget_identifie || null, data.notes || null, id
  ).run();

  return c.json({ message: 'Prospect mis à jour' });
});

export { prospects };
