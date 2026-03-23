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

  return c.json({
    today: todayStats,
    week: weekStats.results,
    upcoming_rdv: myRdv.results
  });
});

export { dashboard };
