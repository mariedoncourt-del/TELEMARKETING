import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { requireRole } from './auth';

const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/dashboard/stats - Statistiques globales (superviseur/admin)
dashboard.get('/stats', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;

  // Stats globales de la file
  const globalStats = await db.prepare(`
    SELECT 
      COUNT(*) FILTER (WHERE statut = 'NOUVEAU') as nouveaux,
      COUNT(*) FILTER (WHERE statut = 'AR') as a_rappeler,
      COUNT(*) FILTER (WHERE statut = 'RDV') as rdv_pris,
      COUNT(*) FILTER (WHERE statut = 'FIN') as clotures,
      COUNT(*) FILTER (WHERE locked_by IS NOT NULL) as en_cours,
      COUNT(*) FILTER (WHERE statut = 'AR' AND date_rappel <= datetime('now')) as ar_en_retard,
      COUNT(*) as total
    FROM prospects
  `).first();

  // Stats par opérateur aujourd'hui
  const operatorStats = await db.prepare(`
    SELECT 
      u.id,
      u.nom,
      u.prenom,
      COUNT(a.id) FILTER (WHERE date(a.created_at) = date('now')) as total_appels,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV' AND date(a.created_at) = date('now')) as nb_rdv,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'AR' AND date(a.created_at) = date('now')) as nb_ar,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'NRP' AND date(a.created_at) = date('now')) as nb_nrp,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'FIN' AND date(a.created_at) = date('now')) as nb_fin,
      (SELECT COUNT(*) FROM prospects p2 WHERE p2.locked_by = u.id) as prospect_en_cours
    FROM users u
    LEFT JOIN appels a ON u.id = a.user_id
    WHERE u.role = 'operator' AND u.actif = 1
    GROUP BY u.id, u.nom, u.prenom
    ORDER BY nb_rdv DESC, total_appels DESC
  `).all();

  // Tendance des 7 derniers jours
  const weekTrend = await db.prepare(`
    SELECT 
      date(created_at) as jour,
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as rdv,
      COUNT(*) FILTER (WHERE statut_resultat = 'AR') as ar,
      COUNT(*) FILTER (WHERE statut_resultat = 'NRP') as nrp,
      COUNT(*) FILTER (WHERE statut_resultat = 'FIN') as fin
    FROM appels
    WHERE date(created_at) >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY jour ASC
  `).all();

  // RDV de la semaine à venir
  const upcomingRdv = await db.prepare(`
    SELECT r.date_rdv, r.type_rdv, r.statut,
      p.nom_entreprise, p.ville,
      u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    JOIN users u ON r.pris_par = u.id
    WHERE r.date_rdv >= datetime('now') 
      AND r.date_rdv <= datetime('now', '+7 days')
      AND r.statut IN ('PLANIFIE', 'CONFIRME')
    ORDER BY r.date_rdv ASC
    LIMIT 20
  `).all();

  return c.json({
    global: globalStats,
    operators: operatorStats.results,
    weekTrend: weekTrend.results,
    upcomingRdv: upcomingRdv.results,
    timestamp: new Date().toISOString()
  });
});

// GET /api/dashboard/my-stats - Mes stats (opérateur)
dashboard.get('/my-stats', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const todayStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as nb_rdv,
      COUNT(*) FILTER (WHERE statut_resultat = 'AR') as nb_ar,
      COUNT(*) FILTER (WHERE statut_resultat = 'NRP') as nb_nrp,
      COUNT(*) FILTER (WHERE statut_resultat = 'FIN') as nb_fin
    FROM appels
    WHERE user_id = ? AND date(created_at) = date('now')
  `).bind(user.id).first();

  const weekStats = await db.prepare(`
    SELECT 
      date(created_at) as jour,
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as rdv
    FROM appels
    WHERE user_id = ? AND date(created_at) >= date('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY jour ASC
  `).bind(user.id).all();

  const myRdv = await db.prepare(`
    SELECT r.date_rdv, r.statut, r.type_rdv,
      p.nom_entreprise, p.ville
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    WHERE r.pris_par = ? AND r.date_rdv >= datetime('now')
    ORDER BY r.date_rdv ASC
    LIMIT 10
  `).bind(user.id).all();

  // Objectifs actifs
  const objectifs = await db.prepare(`
    SELECT cible_appels, cible_rdv, cible_ar FROM objectifs WHERE actif = 1 LIMIT 1
  `).first();

  // Mon rang dans le classement du jour (par nb RDV puis nb appels)
  const ranking = await db.prepare(`
    SELECT user_id, 
      COUNT(*) as total_appels,
      COUNT(*) FILTER (WHERE statut_resultat = 'RDV') as nb_rdv
    FROM appels
    WHERE date(created_at) = date('now')
    GROUP BY user_id
    ORDER BY nb_rdv DESC, total_appels DESC
  `).all();

  let monRang = 1;
  let totalOperateurs = ranking.results?.length || 0;
  if (ranking.results) {
    const idx = ranking.results.findIndex((r: any) => r.user_id === user.id);
    if (idx >= 0) monRang = idx + 1;
    else totalOperateurs += 1; // pas encore dans le classement
  }

  // Taux de conversion
  const today = todayStats as any;
  const tauxConversion = today?.total_appels > 0 
    ? ((today.nb_rdv / today.total_appels) * 100).toFixed(1) 
    : '0.0';

  return c.json({
    today: todayStats,
    week: weekStats.results,
    upcoming_rdv: myRdv.results,
    objectifs: objectifs || { cible_appels: 50, cible_rdv: 3, cible_ar: 10 },
    rang: monRang,
    total_operateurs: totalOperateurs,
    taux_conversion: parseFloat(tauxConversion as string)
  });
});

// GET /api/dashboard/leaderboard - Classement des opérateurs (accessible à tous)
dashboard.get('/leaderboard', async (c) => {
  const db = c.env.DB;

  // Classement du jour
  const today = await db.prepare(`
    SELECT 
      u.id,
      u.nom,
      u.prenom,
      COUNT(a.id) as total_appels,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV') as nb_rdv,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'AR') as nb_ar,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'NRP') as nb_nrp,
      CASE WHEN COUNT(a.id) > 0 
        THEN ROUND(CAST(COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV') AS REAL) / COUNT(a.id) * 100, 1)
        ELSE 0 END as taux_conversion,
      (SELECT COUNT(*) FROM prospects p2 WHERE p2.locked_by = u.id) as en_ligne
    FROM users u
    LEFT JOIN appels a ON u.id = a.user_id AND date(a.created_at) = date('now')
    WHERE u.role = 'operator' AND u.actif = 1
    GROUP BY u.id
    ORDER BY nb_rdv DESC, total_appels DESC
  `).all();

  // Classement de la semaine
  const week = await db.prepare(`
    SELECT 
      u.id,
      u.nom,
      u.prenom,
      COUNT(a.id) as total_appels,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV') as nb_rdv,
      COUNT(a.id) FILTER (WHERE a.statut_resultat = 'AR') as nb_ar,
      CASE WHEN COUNT(a.id) > 0 
        THEN ROUND(CAST(COUNT(a.id) FILTER (WHERE a.statut_resultat = 'RDV') AS REAL) / COUNT(a.id) * 100, 1)
        ELSE 0 END as taux_conversion
    FROM users u
    LEFT JOIN appels a ON u.id = a.user_id AND date(a.created_at) >= date('now', '-7 days')
    WHERE u.role = 'operator' AND u.actif = 1
    GROUP BY u.id
    ORDER BY nb_rdv DESC, total_appels DESC
  `).all();

  // Objectifs actifs
  const objectifs = await db.prepare(`
    SELECT cible_appels, cible_rdv, cible_ar FROM objectifs WHERE actif = 1 LIMIT 1
  `).first();

  // Dernier RDV (pour notification)
  const dernierRdv = await db.prepare(`
    SELECT a.created_at, u.prenom, u.nom, p.nom_entreprise
    FROM appels a
    JOIN users u ON a.user_id = u.id
    JOIN prospects p ON a.prospect_id = p.id
    WHERE a.statut_resultat = 'RDV' AND date(a.created_at) = date('now')
    ORDER BY a.created_at DESC
    LIMIT 1
  `).first();

  return c.json({
    today: today.results,
    week: week.results,
    objectifs: objectifs || { cible_appels: 50, cible_rdv: 3, cible_ar: 10 },
    dernier_rdv: dernierRdv,
    timestamp: new Date().toISOString()
  });
});

// GET /api/dashboard/objectifs - Lire les objectifs (admin)
dashboard.get('/objectifs', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const objectifs = await db.prepare(`SELECT * FROM objectifs WHERE actif = 1 LIMIT 1`).first();
  return c.json({ objectifs: objectifs || { cible_appels: 50, cible_rdv: 3, cible_ar: 10 } });
});

// PUT /api/dashboard/objectifs - Modifier les objectifs (admin)
dashboard.put('/objectifs', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { cible_appels, cible_rdv, cible_ar } = await c.req.json();

  if (!cible_appels || !cible_rdv) {
    return c.json({ error: 'cible_appels et cible_rdv sont obligatoires' }, 400);
  }

  // Upsert
  await db.prepare(`
    INSERT INTO objectifs (id, cible_appels, cible_rdv, cible_ar, actif, created_by, updated_at)
    VALUES (1, ?, ?, ?, 1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      cible_appels = excluded.cible_appels,
      cible_rdv = excluded.cible_rdv,
      cible_ar = excluded.cible_ar,
      created_by = excluded.created_by,
      updated_at = datetime('now')
  `).bind(cible_appels, cible_rdv, cible_ar || 10, user.id).run();

  return c.json({ success: true, objectifs: { cible_appels, cible_rdv, cible_ar: cible_ar || 10 } });
});

export { dashboard };
