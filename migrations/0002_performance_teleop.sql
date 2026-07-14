-- =============================================
-- MAF Formation - Performance Teleoperateurs
-- Migration v2.0
-- =============================================

-- Enrichissement des prospects pour piloter le meilleur prochain appel
ALTER TABLE prospects ADD COLUMN score_potentiel INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prospects ADD COLUMN temperature TEXT NOT NULL DEFAULT 'FROID';
ALTER TABLE prospects ADD COLUMN priorite_manuelle INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prospects ADD COLUMN secteur_activite TEXT;
ALTER TABLE prospects ADD COLUMN besoin_formation TEXT;
ALTER TABLE prospects ADD COLUMN meilleur_creneau TEXT;
ALTER TABLE prospects ADD COLUMN dernier_resume TEXT;
ALTER TABLE prospects ADD COLUMN qualite_saisie_score INTEGER NOT NULL DEFAULT 100;

-- Enrichissement des appels pour analyser les objections et la qualite commerciale
ALTER TABLE appels ADD COLUMN sous_motif TEXT;
ALTER TABLE appels ADD COLUMN objection TEXT;
ALTER TABLE appels ADD COLUMN prochaine_action TEXT;
ALTER TABLE appels ADD COLUMN contact_argumente INTEGER NOT NULL DEFAULT 0;
ALTER TABLE appels ADD COLUMN temps_saisie_secondes INTEGER;

-- Confirmation des rendez-vous
ALTER TABLE rdv ADD COLUMN confirmation_envoyee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rdv ADD COLUMN date_confirmation TEXT;
ALTER TABLE rdv ADD COLUMN canal_confirmation TEXT;

-- Objectifs commerciaux si absents du schema initial
CREATE TABLE IF NOT EXISTS objectifs (
    id INTEGER PRIMARY KEY,
    cible_appels INTEGER NOT NULL DEFAULT 50,
    cible_rdv INTEGER NOT NULL DEFAULT 3,
    cible_ar INTEGER NOT NULL DEFAULT 10,
    actif INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO objectifs (id, cible_appels, cible_rdv, cible_ar, actif)
VALUES (1, 50, 3, 10, 1);

-- Catalogue formations MAF utilisable pendant l'appel
CREATE TABLE IF NOT EXISTS formations_catalogue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    categorie TEXT NOT NULL,
    duree_heures INTEGER,
    public_cible TEXT,
    argumentaire_court TEXT,
    financement TEXT,
    actif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO formations_catalogue (titre, categorie, duree_heures, public_cible, argumentaire_court, financement)
SELECT 'Televente et prise de rendez-vous', 'Commercial', 21, 'TPE, artisans, dirigeants', 'Structurer les appels, traiter les objections et transformer plus de contacts en rendez-vous.', 'OPCO selon branche'
WHERE NOT EXISTS (SELECT 1 FROM formations_catalogue WHERE titre = 'Televente et prise de rendez-vous');

INSERT INTO formations_catalogue (titre, categorie, duree_heures, public_cible, argumentaire_court, financement)
SELECT 'Developper son activite avec l IA', 'Digital', 14, 'Dirigeants TPE, artisans', 'Utiliser ChatGPT et les outils IA pour gagner du temps, communiquer et vendre mieux.', 'OPCO selon branche'
WHERE NOT EXISTS (SELECT 1 FROM formations_catalogue WHERE titre = 'Developper son activite avec l IA');

INSERT INTO formations_catalogue (titre, categorie, duree_heures, public_cible, argumentaire_court, financement)
SELECT 'Reseaux sociaux et communication digitale', 'Digital', 21, 'Independants, commercants, artisans', 'Publier mieux, creer des contenus utiles et gagner en visibilite locale.', 'OPCO selon branche'
WHERE NOT EXISTS (SELECT 1 FROM formations_catalogue WHERE titre = 'Reseaux sociaux et communication digitale');

INSERT INTO formations_catalogue (titre, categorie, duree_heures, public_cible, argumentaire_court, financement)
SELECT 'Creation site internet et referencement naturel', 'Digital', 35, 'TPE, artisans, commercants', 'Construire une presence web propre et ameliorer la visibilite sur Google.', 'OPCO selon branche'
WHERE NOT EXISTS (SELECT 1 FROM formations_catalogue WHERE titre = 'Creation site internet et referencement naturel');

-- Scripts et objections prets a l'emploi
CREATE TABLE IF NOT EXISTS scripts_appel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_script TEXT NOT NULL,
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    actif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO scripts_appel (type_script, titre, contenu)
SELECT 'ACCROCHE', 'Accroche MAF Formation', 'Bonjour, je vous appelle de la part de MAF Formation. Nous accompagnons les artisans et TPE pour mettre en place des formations utiles, souvent finançables par leur OPCO, sans désorganiser leur activité.'
WHERE NOT EXISTS (SELECT 1 FROM scripts_appel WHERE type_script = 'ACCROCHE');

INSERT INTO scripts_appel (type_script, titre, contenu)
SELECT 'OBJECTION', 'Je n ai pas le temps', 'Justement, l appel est court. L objectif est simplement de voir si vous avez un budget formation mobilisable et un besoin concret cette année.'
WHERE NOT EXISTS (SELECT 1 FROM scripts_appel WHERE titre = 'Je n ai pas le temps');

INSERT INTO scripts_appel (type_script, titre, contenu)
SELECT 'OBJECTION', 'Envoyez-moi un mail', 'Bien sur. Pour vous envoyer quelque chose d utile, vous etes plutot interesse par le commercial, le digital, la gestion, l IA ou un sujet metier ?'
WHERE NOT EXISTS (SELECT 1 FROM scripts_appel WHERE titre = 'Envoyez-moi un mail');

INSERT INTO scripts_appel (type_script, titre, contenu)
SELECT 'CLOTURE_RDV', 'Proposition de rendez-vous', 'Le plus simple est de caler un court rendez-vous pour verifier votre besoin et le financement possible. Vous preferez plutot le matin ou l apres-midi ?'
WHERE NOT EXISTS (SELECT 1 FROM scripts_appel WHERE type_script = 'CLOTURE_RDV');

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_prospects_score_queue ON prospects(statut, locked_by, priorite_manuelle DESC, score_potentiel DESC, date_rappel, created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_temperature ON prospects(temperature, statut);
CREATE INDEX IF NOT EXISTS idx_appels_objection ON appels(objection, created_at);
CREATE INDEX IF NOT EXISTS idx_appels_sous_motif ON appels(sous_motif, created_at);
CREATE INDEX IF NOT EXISTS idx_rdv_confirmation ON rdv(statut, confirmation_envoyee, date_rdv);

-- Initialisation simple du score commercial sur la base existante
UPDATE prospects
SET score_potentiel =
    COALESCE(priorite_manuelle, 0) * 10
    + CASE WHEN budget_identifie IS NOT NULL AND budget_identifie > 0 THEN 25 ELSE 0 END
    + CASE WHEN opco IS NOT NULL THEN 20 ELSE 0 END
    + CASE WHEN code_ape IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN statut = 'AR' THEN 15 ELSE 0 END
    + CASE WHEN statut = 'RDV' THEN 30 ELSE 0 END
    - CASE WHEN compteur_nrp >= 3 THEN 10 ELSE 0 END,
    temperature = CASE
      WHEN statut = 'RDV' THEN 'CHAUD'
      WHEN statut = 'AR' THEN 'TIEDE'
      WHEN compteur_nrp >= 3 THEN 'FROID'
      ELSE temperature
    END,
    updated_at = datetime('now');
