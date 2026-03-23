import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';

const appels = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/appels - Enregistrer le résultat d'un appel
appels.post('/', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const data = await c.req.json<{
    prospect_id: number;
    statut_resultat: 'NRP' | 'AR' | 'RDV' | 'FIN';
    commentaire?: string;
    duree_secondes?: number;
    date_rappel?: string;
    date_appel?: string;
    motif_fin?: string;
    // Données RDV (si statut_resultat === 'RDV')
    rdv_date?: string;
    rdv_lieu?: string;
    rdv_type?: string;
    rdv_formation?: string;
    rdv_commentaires?: string;
  }>();

  if (!data.prospect_id || !data.statut_resultat) {
    return c.json({ error: 'prospect_id et statut_resultat requis' }, 400);
  }

  // Vérifier que le prospect est bien verrouillé par cet opérateur
  const prospect = await db.prepare(
    'SELECT * FROM prospects WHERE id = ? AND locked_by = ?'
  ).bind(data.prospect_id, user.id).first();

  if (!prospect) {
    return c.json({ error: 'Prospect non trouvé ou non verrouillé par vous' }, 403);
  }

  try {
    // Batch de requêtes pour atomicité
    const statements: D1PreparedStatement[] = [];

    // 1. Enregistrer l'appel avec date_appel saisie par l'opérateur
    statements.push(
      db.prepare(`
        INSERT INTO appels (prospect_id, user_id, statut_resultat, commentaire, duree_secondes, date_rappel, date_appel)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.prospect_id, user.id, data.statut_resultat,
        data.commentaire || null, data.duree_secondes || null,
        data.date_rappel || null, data.date_appel || null
      )
    );

    // 2. Mettre à jour le prospect selon le résultat
    switch (data.statut_resultat) {
      case 'NRP': {
        const newNrp = (prospect.compteur_nrp as number) + 1;
        if (newNrp >= 5) {
          // 5 NRP = fin automatique
          statements.push(
            db.prepare(`
              UPDATE prospects SET 
                statut = 'FIN', motif_fin = 'HORS_CIBLE', 
                compteur_nrp = ?, locked_by = NULL, locked_at = NULL,
                updated_at = datetime('now')
              WHERE id = ?
            `).bind(newNrp, data.prospect_id)
          );
        } else {
          // Rappel automatique dans 2h
          statements.push(
            db.prepare(`
              UPDATE prospects SET 
                compteur_nrp = ?, 
                date_rappel = datetime('now', '+2 hours'),
                statut = 'AR',
                locked_by = NULL, locked_at = NULL,
                updated_at = datetime('now')
              WHERE id = ?
            `).bind(newNrp, data.prospect_id)
          );
        }
        break;
      }

      case 'AR': {
        if (!data.date_rappel) {
          return c.json({ error: 'date_rappel obligatoire pour un AR' }, 400);
        }
        statements.push(
          db.prepare(`
            UPDATE prospects SET 
              statut = 'AR', date_rappel = ?, 
              compteur_nrp = 0,
              locked_by = NULL, locked_at = NULL,
              notes = CASE WHEN ? IS NOT NULL THEN COALESCE(notes || '\n', '') || ? ELSE notes END,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.date_rappel, data.commentaire, data.commentaire, data.prospect_id)
        );
        break;
      }

      case 'RDV': {
        if (!data.rdv_date) {
          return c.json({ error: 'rdv_date obligatoire pour un RDV' }, 400);
        }
        // Mettre à jour le prospect
        statements.push(
          db.prepare(`
            UPDATE prospects SET 
              statut = 'RDV', 
              locked_by = NULL, locked_at = NULL,
              compteur_nrp = 0,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.prospect_id)
        );
        // Créer le RDV
        statements.push(
          db.prepare(`
            INSERT INTO rdv (prospect_id, pris_par, date_rdv, lieu, type_rdv, formation_souhaitee, commentaires)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            data.prospect_id, user.id, data.rdv_date,
            data.rdv_lieu || null, data.rdv_type || 'presentiel',
            data.rdv_formation || null, data.rdv_commentaires || null
          )
        );
        break;
      }

      case 'FIN': {
        statements.push(
          db.prepare(`
            UPDATE prospects SET 
              statut = 'FIN', motif_fin = ?,
              locked_by = NULL, locked_at = NULL,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.motif_fin || 'AUTRE', data.prospect_id)
        );
        break;
      }
    }

    // Exécuter toutes les requêtes en batch
    await db.batch(statements);

    return c.json({ 
      message: `Appel enregistré: ${data.statut_resultat}`,
      statut_resultat: data.statut_resultat
    });

  } catch (e: any) {
    console.error('Erreur enregistrement appel:', e);
    return c.json({ error: 'Erreur serveur lors de l\'enregistrement' }, 500);
  }
});

// GET /api/appels/history/:prospectId - Historique des appels d'un prospect
appels.get('/history/:prospectId', async (c) => {
  const db = c.env.DB;
  const prospectId = parseInt(c.req.param('prospectId'));

  const result = await db.prepare(`
    SELECT a.*, u.nom as operateur_nom, u.prenom as operateur_prenom
    FROM appels a 
    JOIN users u ON a.user_id = u.id
    WHERE a.prospect_id = ?
    ORDER BY a.created_at DESC
  `).bind(prospectId).all();

  return c.json({ appels: result.results });
});

// GET /api/appels/my-today - Mes appels du jour
appels.get('/my-today', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const result = await db.prepare(`
    SELECT a.*, p.nom_entreprise, p.telephone
    FROM appels a
    JOIN prospects p ON a.prospect_id = p.id
    WHERE a.user_id = ? AND date(a.created_at) = date('now')
    ORDER BY a.created_at DESC
  `).bind(user.id).all();

  return c.json({ appels: result.results });
});

export { appels };
