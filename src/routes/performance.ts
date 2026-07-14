import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { requireRole } from './auth';

const performance = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type ScoreInput = {
  statut?: string | null;
  opco?: string | null;
  code_ape?: string | null;
  budget_identifie?: number | null;
  compteur_nrp?: number | null;
  date_rappel?: string | null;
  besoin_formation?: string | null;
  priorite_manuelle?: number | null;
  temperature?: string | null;
};

function computeProspectScore(p: ScoreInput): number {
  let score = 0;
  score += (Number(p.priorite_manuelle || 0) * 10);
  if (p.budget_identifie && Number(p.budget_identifie) > 0) score += 25;
  if (p.opco) score += 20;
  if (p.code_ape) score += 10;
  if (p.besoin_formation) score += 20;
  if (p.statut === 'AR') score += 15;
  if (p.statut === 'RDV') score += 30;
  if (p.temperature === 'CHAUD') score += 30;
  if (p.temperature === 'TIEDE') score += 15;
  if ((p.compteur_nrp || 0) >= 3) score -= 10;
  if ((p.compteur_nrp || 0) >= 5) score -= 30;
  if (p.date_rappel && new Date(p.date_rappel).getTime() <= Date.now()) score += 25;
  return Math.max(0, Math.min(100, score));
}

function computeTemperature(score: number, statut?: string | null, compteurNrp?: number | null): 'FROID' | 'TIEDE' | 'CHAUD' | 'A_NOURRIR' {
  if (statut === 'RDV') return 'CHAUD';
  if ((compteurNrp || 0) >= 4) return 'FROID';
  if (score >= 65) return 'CHAUD';
  if (score >= 35) return 'TIEDE';
  return 'FROID';
}

// GET /api/performance/scripts - Scripts, objections et catalogue formations
performance.get('/scripts', async (c) => {
  const db = c.env.DB;
  const scripts = await db.prepare(`
    SELECT id, type_script, titre, contenu
    FROM scripts_appel
    WHERE actif = 1
    ORDER BY type_script, id
  `).all();

  const formations = await db.prepare(`
    SELECT id, titre, categorie, duree_heures, public_cible, argumentaire_court, financement
    FROM formations_catalogue
    WHERE actif = 1
    ORDER BY categorie, titre
  `).all();

  return c.json({ scripts: scripts.results, formations: formations.results });
});

// GET /api/performance/my-coaching - Coaching simple de l'operateur connecte
performance.get('/my-coaching', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as nb_rdv,
      COUNT(*) FILTER (WHERE statut_resultat = 'AR') as nb_ar,
      COUNT(*) FILTER (WHERE statut_resultat = 'NRP') as nb_nrp,
      COUNT(*) FILTER (WHERE statut_resultat = 'FIN') as nb_fin,
      COUNT(*) FILTER (WHERE contact_argumente = 1) as contacts_argumentes,
      ROUND(AVG(duree_secondes), 0) as duree_moyenne,
      ROUND(AVG(temps_saisie_secondes), 0) as saisie_moyenne
    FROM appels
    WHERE user_id = ? AND date(created_at) = date('now')
  `).bind(user.id).first() as any;

  const total = Number(stats?.total_appels || 0);
  const rdv = Number(stats?.nb_rdv || 0);
  const contacts = Number(stats?.contacts_argumentes || 0);
  const tauxRdvAppels = total ? Math.round((rdv / total) * 1000) / 10 : 0;
  const tauxRdvContacts = contacts ? Math.round((rdv / contacts) * 1000) / 10 : 0;

  let pointFort = 'Activite a demarrer';
  let axe = 'Lancer les premiers appels et qualifier proprement chaque fiche.';
  let conseil = 'Utilisez la phrase d accroche, puis orientez rapidement vers un besoin concret.';

  if (rdv >= 3) {
    pointFort = 'Tres bonne transformation en rendez-vous';
    axe = 'Conserver la qualite de qualification pour eviter les RDV fragiles.';
    conseil = 'Continuez a confirmer le besoin, le financeur potentiel et le bon interlocuteur.';
  } else if (contacts > 0 && tauxRdvContacts < 10) {
    pointFort = 'Vous obtenez des conversations exploitables';
    axe = 'Transformer davantage les contacts argumentes en rendez-vous.';
    conseil = 'Quand le prospect dit envoyez-moi un mail, qualifiez d abord le sujet avant d accepter.';
  } else if (total > 0 && Number(stats?.nb_nrp || 0) / total > 0.5) {
    pointFort = 'Cadence d appels lancee';
    axe = 'Changer de creneau sur les bases qui repondent peu.';
    conseil = 'Privilégiez les rappels chauds et les appels en fin de matinée ou fin d apres-midi.';
  } else if (total >= 50) {
    pointFort = 'Bon volume d appels';
    axe = 'Augmenter la part de contacts argumentes.';
    conseil = 'Notez un sous-motif precis a chaque appel pour ameliorer les prochains passages.';
  }

  return c.json({
    stats,
    indicateurs: {
      taux_rdv_appels: tauxRdvAppels,
      taux_rdv_contacts: tauxRdvContacts
    },
    coaching: { point_fort: pointFort, axe_amelioration: axe, conseil }
  });
});

// GET /api/performance/creneaux - Meilleurs horaires d'appel
performance.get('/creneaux', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const result = await db.prepare(`
    SELECT
      strftime('%H', created_at) as heure,
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat != 'NRP') as contacts,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as rdv,
      CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(COUNT(*) FILTER (WHERE statut_resultat != 'NRP') AS REAL) / COUNT(*) * 100, 1) ELSE 0 END as taux_reponse,
      CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(COUNT(*) FILTER (WHERE statut_resultat = 'RDV') AS REAL) / COUNT(*) * 100, 1) ELSE 0 END as taux_rdv
    FROM appels
    WHERE date(created_at) >= date('now', '-30 days')
    GROUP BY strftime('%H', created_at)
    HAVING COUNT(*) >= 1
    ORDER BY taux_rdv DESC, taux_reponse DESC, total_appels DESC
  `).all();

  return c.json({ creneaux: result.results });
});

// GET /api/performance/objections - Objections et sous-motifs les plus frequents
performance.get('/objections', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const objections = await db.prepare(`
    SELECT
      COALESCE(objection, sous_motif, 'NON_RENSEIGNE') as motif,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as rdv,
      CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(COUNT(*) FILTER (WHERE statut_resultat = 'RDV') AS REAL) / COUNT(*) * 100, 1) ELSE 0 END as taux_transformation
    FROM appels
    WHERE date(created_at) >= date('now', '-30 days')
      AND (objection IS NOT NULL OR sous_motif IS NOT NULL)
    GROUP BY COALESCE(objection, sous_motif, 'NON_RENSEIGNE')
    ORDER BY total DESC, taux_transformation ASC
    LIMIT 20
  `).all();

  return c.json({ objections: objections.results });
});

// GET /api/performance/alerts - Alertes superviseur actionnables
performance.get('/alerts', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const alerts: Array<{ niveau: string; titre: string; detail: string }> = [];

  const arRetard = await db.prepare(`
    SELECT COUNT(*) as total FROM prospects
    WHERE statut = 'AR' AND date_rappel <= datetime('now')
  `).first() as any;

  if (Number(arRetard?.total || 0) > 0) {
    alerts.push({ niveau: 'urgent', titre: 'AR en retard', detail: `${arRetard.total} rappel(s) doivent etre traites sans attendre.` });
  }

  const rdvAConfirmer = await db.prepare(`
    SELECT COUNT(*) as total FROM rdv
    WHERE statut = 'PLANIFIE' AND confirmation_envoyee = 0 AND date_rdv >= datetime('now')
  `).first() as any;

  if (Number(rdvAConfirmer?.total || 0) > 0) {
    alerts.push({ niveau: 'important', titre: 'RDV non confirmes', detail: `${rdvAConfirmer.total} RDV planifie(s) n ont pas encore de confirmation tracee.` });
  }

  const operators = await db.prepare(`
    SELECT u.prenom, u.nom,
      COUNT(a.id) as total_appels,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV') as nb_rdv,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'FIN') as nb_fin
    FROM users u
    LEFT JOIN appels a ON a.user_id = u.id AND date(a.created_at) = date('now')
    WHERE u.role = 'operator' AND u.actif = 1
    GROUP BY u.id
  `).all();

  for (const op of operators.results as any[]) {
    if (Number(op.total_appels || 0) >= 20 && Number(op.nb_rdv || 0) === 0) {
      alerts.push({ niveau: 'coaching', titre: `Coaching ${op.prenom}`, detail: `${op.total_appels} appels aujourd hui sans RDV. Revoir script et objections.` });
    }
    if (Number(op.total_appels || 0) > 0 && Number(op.nb_fin || 0) / Number(op.total_appels) > 0.5) {
      alerts.push({ niveau: 'qualite', titre: `Trop de clotures ${op.prenom}`, detail: `Plus de 50% des appels sont clotures. Verifier la qualification et les motifs.` });
    }
  }

  return c.json({ alerts, timestamp: new Date().toISOString() });
});

// POST /api/performance/prospects/:id/recalculate-score - Recalculer un score prospect
performance.post('/prospects/:id/recalculate-score', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const p = await db.prepare('SELECT * FROM prospects WHERE id = ?').bind(id).first() as any;
  if (!p) return c.json({ error: 'Prospect non trouve' }, 404);

  const score = computeProspectScore(p);
  const temperature = computeTemperature(score, p.statut, p.compteur_nrp);
  await db.prepare(`
    UPDATE prospects SET score_potentiel = ?, temperature = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(score, temperature, id).run();

  return c.json({ id, score_potentiel: score, temperature });
});

// POST /api/performance/recalculate-scores - Recalculer toute la base
performance.post('/recalculate-scores', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const prospects = await db.prepare(`
    SELECT id, statut, opco, code_ape, budget_identifie, compteur_nrp, date_rappel, besoin_formation, priorite_manuelle, temperature
    FROM prospects
  `).all();

  let updated = 0;
  for (const p of prospects.results as any[]) {
    const score = computeProspectScore(p);
    const temperature = computeTemperature(score, p.statut, p.compteur_nrp);
    await db.prepare(`
      UPDATE prospects SET score_potentiel = ?, temperature = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(score, temperature, p.id).run();
    updated++;
  }

  return c.json({ updated });
});

export { performance };
