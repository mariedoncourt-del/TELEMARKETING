import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { requireRole } from './auth';

const rdv = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/rdv - Liste des RDV
rdv.get('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const statut = c.req.query('statut');
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');

  let where = '1=1';
  const params: any[] = [];

  // Les opérateurs ne voient que leurs RDV
  if (user.role === 'operator') {
    where += ' AND r.pris_par = ?';
    params.push(user.id);
  }

  if (statut) {
    where += ' AND r.statut = ?';
    params.push(statut);
  }
  if (dateFrom) {
    where += ' AND r.date_rdv >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND r.date_rdv <= ?';
    params.push(dateTo);
  }

  const result = await db.prepare(`
    SELECT r.*, 
      p.nom_entreprise, p.nom_dirigeant, p.telephone, p.email, p.ville, p.opco, p.budget_identifie,
      u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    JOIN users u ON r.pris_par = u.id
    WHERE ${where}
    ORDER BY r.date_rdv ASC
  `).bind(...params).all();

  return c.json({ rdv: result.results });
});

// GET /api/rdv/:id - Détail d'un RDV
rdv.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  const result = await db.prepare(`
    SELECT r.*, 
      p.nom_entreprise, p.nom_dirigeant, p.telephone, p.email, p.ville, p.code_postal,
      p.opco, p.budget_identifie, p.code_ape, p.notes as prospect_notes,
      u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    JOIN users u ON r.pris_par = u.id
    WHERE r.id = ?
  `).bind(id).first();

  if (!result) return c.json({ error: 'RDV non trouvé' }, 404);
  return c.json({ rdv: result });
});

// PUT /api/rdv/:id - Modifier un RDV
rdv.put('/:id', async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  await db.prepare(`
    UPDATE rdv SET 
      date_rdv = COALESCE(?, date_rdv),
      duree_minutes = COALESCE(?, duree_minutes),
      lieu = COALESCE(?, lieu),
      type_rdv = COALESCE(?, type_rdv),
      formation_souhaitee = COALESCE(?, formation_souhaitee),
      statut = COALESCE(?, statut),
      commentaires = COALESCE(?, commentaires),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    data.date_rdv || null, data.duree_minutes || null,
    data.lieu || null, data.type_rdv || null,
    data.formation_souhaitee || null, data.statut || null,
    data.commentaires || null, id
  ).run();

  return c.json({ message: 'RDV mis à jour' });
});

// DELETE /api/rdv/:id - Annuler un RDV
rdv.delete('/:id', requireRole('admin', 'supervisor'), async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));

  await db.prepare(`
    UPDATE rdv SET statut = 'ANNULE', updated_at = datetime('now') WHERE id = ?
  `).bind(id).run();

  return c.json({ message: 'RDV annulé' });
});

// GET /api/rdv/upcoming/week - RDV de la semaine
rdv.get('/upcoming/week', async (c) => {
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT r.*, 
      p.nom_entreprise, p.nom_dirigeant, p.telephone, p.ville, p.opco,
      u.nom as pris_par_nom, u.prenom as pris_par_prenom
    FROM rdv r
    JOIN prospects p ON r.prospect_id = p.id
    JOIN users u ON r.pris_par = u.id
    WHERE r.date_rdv >= date('now') 
      AND r.date_rdv <= date('now', '+7 days')
      AND r.statut IN ('PLANIFIE', 'CONFIRME')
    ORDER BY r.date_rdv ASC
  `).all();

  return c.json({ rdv: result.results });
});

export { rdv };
