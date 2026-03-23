import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { requireRole, hashPassword } from './auth';

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/users - Liste des utilisateurs (admin)
users.get('/', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const result = await db.prepare(`
    SELECT id, email, nom, prenom, role, actif, created_at, updated_at
    FROM users ORDER BY role, nom
  `).all();
  return c.json({ users: result.results });
});

// POST /api/users - Créer un utilisateur (admin)
users.post('/', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const data = await c.req.json<{
    email: string; password: string; nom: string; prenom: string; role: string;
  }>();

  if (!data.email || !data.password || !data.nom || !data.prenom) {
    return c.json({ error: 'Tous les champs sont obligatoires' }, 400);
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(data.email).first();
  if (existing) {
    return c.json({ error: 'Cet email est déjà utilisé' }, 409);
  }

  const passwordHash = await hashPassword(data.password);
  const result = await db.prepare(`
    INSERT INTO users (email, password_hash, nom, prenom, role) VALUES (?, ?, ?, ?, ?)
  `).bind(data.email, passwordHash, data.nom, data.prenom, data.role || 'operator').run();

  return c.json({ id: result.meta.last_row_id, message: 'Utilisateur créé' }, 201);
});

// PUT /api/users/:id - Modifier un utilisateur (admin)
users.put('/:id', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];

  if (data.nom) { sets.push('nom = ?'); params.push(data.nom); }
  if (data.prenom) { sets.push('prenom = ?'); params.push(data.prenom); }
  if (data.email) { sets.push('email = ?'); params.push(data.email); }
  if (data.role) { sets.push('role = ?'); params.push(data.role); }
  if (data.actif !== undefined) { sets.push('actif = ?'); params.push(data.actif ? 1 : 0); }
  if (data.password) {
    const hash = await hashPassword(data.password);
    sets.push('password_hash = ?'); params.push(hash);
  }

  if (sets.length === 0) return c.json({ error: 'Aucune modification' }, 400);

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return c.json({ message: 'Utilisateur mis à jour' });
});

// DELETE /api/users/:id - Désactiver un utilisateur (admin)
users.delete('/:id', requireRole('admin'), async (c) => {
  const db = c.env.DB;
  const id = parseInt(c.req.param('id'));
  const user = c.get('user');

  if (id === user.id) {
    return c.json({ error: 'Vous ne pouvez pas vous désactiver vous-même' }, 400);
  }

  // Libérer les prospects verrouillés par cet utilisateur
  await db.prepare('UPDATE prospects SET locked_by = NULL, locked_at = NULL WHERE locked_by = ?').bind(id).run();
  // Désactiver (pas supprimer pour garder l'historique)
  await db.prepare("UPDATE users SET actif = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();

  return c.json({ message: 'Utilisateur désactivé' });
});

export { users };
