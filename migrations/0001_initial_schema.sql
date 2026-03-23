-- =============================================
-- MAF Formation - Telemarketing Application
-- Schema Initial - v1.0
-- =============================================

-- Table des utilisateurs (téléopérateurs, superviseurs, admins)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'supervisor', 'operator')),
    actif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Table des prospects
CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_entreprise TEXT NOT NULL,
    nom_dirigeant TEXT,
    telephone TEXT NOT NULL,
    email TEXT,
    ville TEXT,
    code_postal TEXT,
    code_ape TEXT,
    opco TEXT CHECK (opco IS NULL OR opco IN ('AGEFICE', 'FAFCEA', 'AKTO', 'ATLAS', 'OPCO_EP', 'AUTRE')),
    budget_identifie REAL,
    
    -- Statut de traitement
    statut TEXT NOT NULL DEFAULT 'NOUVEAU' CHECK (statut IN ('NOUVEAU', 'AR', 'RDV', 'FIN')),
    motif_fin TEXT CHECK (
        statut != 'FIN' OR motif_fin IN ('PAS_INTERESSE', 'HORS_CIBLE', 'FAUX_NUMERO', 'DOUBLON', 'AUTRE')
    ),
    
    -- Gestion des tentatives NRP
    compteur_nrp INTEGER NOT NULL DEFAULT 0,
    date_rappel TEXT,
    
    -- Système anti-collision (file d'attente commune)
    locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locked_at TEXT,
    last_called_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Métadonnées
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Table des appels (historique complet)
CREATE TABLE IF NOT EXISTS appels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statut_resultat TEXT NOT NULL CHECK (statut_resultat IN ('NRP', 'AR', 'RDV', 'FIN')),
    commentaire TEXT,
    duree_secondes INTEGER,
    date_rappel TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Table des RDV
CREATE TABLE IF NOT EXISTS rdv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    appel_id INTEGER REFERENCES appels(id) ON DELETE SET NULL,
    pris_par INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Détails du RDV
    date_rdv TEXT NOT NULL,
    duree_minutes INTEGER NOT NULL DEFAULT 60,
    lieu TEXT,
    type_rdv TEXT NOT NULL DEFAULT 'presentiel' CHECK (type_rdv IN ('presentiel', 'distance', 'telephone')),
    
    -- Formation
    formation_souhaitee TEXT,
    
    -- Statut du RDV
    statut TEXT NOT NULL DEFAULT 'PLANIFIE' CHECK (statut IN ('PLANIFIE', 'CONFIRME', 'REALISE', 'ANNULE', 'REPORTE')),
    
    -- Google Calendar (prévu pour intégration future)
    google_event_id TEXT,
    
    -- Notes
    commentaires TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- INDEX CRITIQUES POUR PERFORMANCES
-- =============================================

-- Index principal pour la distribution des prospects (file d'attente)
CREATE INDEX IF NOT EXISTS idx_prospects_queue 
    ON prospects(statut, locked_by, date_rappel, created_at);

-- Index pour les verrous actifs
CREATE INDEX IF NOT EXISTS idx_prospects_locks 
    ON prospects(locked_by, locked_at);

-- Index pour la recherche par statut
CREATE INDEX IF NOT EXISTS idx_prospects_statut 
    ON prospects(statut);

-- Index pour les appels par prospect
CREATE INDEX IF NOT EXISTS idx_appels_prospect 
    ON appels(prospect_id, created_at);

-- Index pour les appels par utilisateur (stats)
CREATE INDEX IF NOT EXISTS idx_appels_user_date 
    ON appels(user_id, created_at);

-- Index pour les RDV par date
CREATE INDEX IF NOT EXISTS idx_rdv_date 
    ON rdv(date_rdv);

-- Index pour les RDV par statut
CREATE INDEX IF NOT EXISTS idx_rdv_statut 
    ON rdv(statut, date_rdv);

-- Index pour les utilisateurs actifs
CREATE INDEX IF NOT EXISTS idx_users_actif_role 
    ON users(actif, role);
