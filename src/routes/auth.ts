import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Fonction de hachage SHA-256 compatible Web Crypto API (Cloudflare Workers)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Génération JWT manuelle compatible Workers (Web Crypto API)
async function generateJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 8 * 60 * 60 }; // 8h

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'Email et mot de passe requis' }, 400);
  }

  const db = c.env.DB;
  const passwordHash = await hashPassword(password);

  const user = await db.prepare(
    'SELECT id, email, nom, prenom, role, actif FROM users WHERE email = ? AND password_hash = ?'
  ).bind(email, passwordHash).first();

  if (!user) {
    return c.json({ error: 'Identifiants incorrects' }, 401);
  }

  if (!user.actif) {
    return c.json({ error: 'Compte désactivé. Contactez votre administrateur.' }, 403);
  }

  const jwtSecret = c.env.JWT_SECRET || 'maf-formation-secret-dev-2024';
  const token = await generateJWT({
    id: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
  }, jwtSecret);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    }
  });
});

// GET /api/auth/me - Vérifier le token courant
auth.get('/me', async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// POST /api/auth/change-password
auth.post('/change-password', async (c) => {
  const user = c.get('user');
  const { current_password, new_password } = await c.req.json<{ current_password: string; new_password: string }>();

  if (!current_password || !new_password || new_password.length < 6) {
    return c.json({ error: 'Mot de passe actuel et nouveau mot de passe (min 6 car.) requis' }, 400);
  }

  const db = c.env.DB;
  const currentHash = await hashPassword(current_password);
  const existing = await db.prepare('SELECT id FROM users WHERE id = ? AND password_hash = ?')
    .bind(user.id, currentHash).first();

  if (!existing) {
    return c.json({ error: 'Mot de passe actuel incorrect' }, 401);
  }

  const newHash = await hashPassword(new_password);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(newHash, user.id).run();

  return c.json({ message: 'Mot de passe modifié avec succès' });
});

export { auth, hashPassword, generateJWT };

// Middleware d'authentification JWT
export async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token d\'authentification requis' }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET || 'maf-formation-secret-dev-2024';

  try {
    const payload = await verifyJWT(token, jwtSecret);
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ error: 'Token invalide ou expiré' }, 401);
  }
}

// Vérification JWT manuelle
async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token malformé');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  // Décoder la signature
  const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const sigPadded = sigB64 + '='.repeat((4 - sigB64.length % 4) % 4);
  const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error('Signature invalide');

  // Décoder le payload
  const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const payloadPadded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
  const payload = JSON.parse(atob(payloadPadded));

  // Vérifier expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expiré');
  }

  return payload;
}

// Middleware de vérification de rôle
export function requireRole(...roles: string[]) {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Accès non autorisé pour ce rôle' }, 403);
    }
    await next();
  };
}
