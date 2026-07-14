import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';

const appels = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function buildResume(statut: string, commentaire?: string, sousMotif?: string, objection?: string) {
  const parts = [statut];
  if (sousMotif) parts.push(`motif: ${sousMotif}`);
  if (objection) parts.push(`objection: ${objection}`);
  if (commentaire) parts.push(commentaire);
  return parts.join(' - ').slice(0, 500);
}

function nextTemperature(statut: string, currentTemperature?: string | null, nrpCount = 0): string {
  if (statut === 'RDV') return 'CHAUD';
  if (statut === 'AR') return currentTemperature === 'CHAUD' ? 'CHAUD' : 'TIEDE';
  if (statut === 'FIN') return 'FROID';
  if (nrpCount >= 3) return 'FROID';
  return currentTemperature || 'FROID';
}

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
    sous_motif?: string;
    objection?: string;
    prochaine_action?: string;
    contact_argumente?: boolean | number;
    temps_saisie_secondes?: number;
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
  ).bind(data.prospect_id, user.id).first() as any;

  if (!prospect) {
    return c.json({ error: 'Prospect non trouvé ou non verrouillé par vous' }, 403);
  }

  const contactArgumente = data.contact_argumente === true || data.contact_argumente === 1 || data.statut_resultat === 'RDV' || data.statut_resultat === 'AR' ? 1 : 0;
  const resume = buildResume(data.statut_resultat, data.commentaire, data.sous_motif, data.objection);

  try {
    // Batch de requêtes pour atomicité
    const statements: D1PreparedStatement[] = [];

    // 1. Enregistrer l'appel avec donnees de pilotage commercial
    statements.push(
      db.prepare(`
        INSERT INTO appels (
          prospect_id, user_id, statut_resultat, commentaire, duree_secondes, date_rappel, date_appel,
          sous_motif, objection, prochaine_action, contact_argumente, temps_saisie_secondes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.prospect_id, user.id, data.statut_resultat,
        data.commentaire || null, data.duree_secondes || null,
        data.date_rappel || null, data.date_appel || null,
        data.sous_motif || null, data.objection || null, data.prochaine_action || null,
        contactArgumente, data.temps_saisie_secondes || null
      )
    );

    // 2. Mettre à jour le prospect selon le résultat
    switch (data.statut_resultat) {
      case 'NRP': {
        const newNrp = (prospect.compteur_nrp as number) + 1;
        const temperature = nextTemperature('NRP', prospect.temperature, newNrp);
        if (newNrp >= 5) {
          // 5 NRP = fin automatique
          statements.push(
            db.prepare(`
              UPDATE prospects SET 
                statut = 'FIN', motif_fin = 'HORS_CIBLE', 
                compteur_nrp = ?, locked_by = NULL, locked_at = NULL,
                temperature = ?, dernier_resume = ?,
                score_potentiel = MAX(0, score_potentiel - 30),
                updated_at = datetime('now')
              WHERE id = ?
            `).bind(newNrp, temperature, resume, data.prospect_id)
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
                temperature = ?, dernier_resume = ?,
                score_potentiel = MAX(0, score_potentiel - CASE WHEN ? >= 3 THEN 10 ELSE 0 END),
                updated_at = datetime('now')
              WHERE id = ?
            `).bind(newNrp, temperature, resume, newNrp, data.prospect_id)
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
              temperature = CASE WHEN temperature = 'CHAUD' THEN 'CHAUD' ELSE 'TIEDE' END,
              dernier_resume = ?,
              besoin_formation = COALESCE(?, besoin_formation),
              score_potentiel = MIN(100, score_potentiel + 15),
              notes = CASE WHEN ? IS NOT NULL THEN COALESCE(notes || '\n', '') || ? ELSE notes END,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.date_rappel, resume, data.rdv_formation || null, data.commentaire, data.commentaire, data.prospect_id)
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
              temperature = 'CHAUD',
              dernier_resume = ?,
              besoin_formation = COALESCE(?, besoin_formation),
              score_potentiel = 100,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(resume, data.rdv_formation || null, data.prospect_id)
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
              temperature = 'FROID',
              dernier_resume = ?,
              score_potentiel = 0,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.motif_fin || 'AUTRE', resume, data.prospect_id)
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
