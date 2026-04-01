-- =============================================
-- Migration 0003 : Table des objectifs quotidiens
-- Permet à l'admin de configurer les cibles par jour
-- =============================================

CREATE TABLE IF NOT EXISTS objectifs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cible_appels INTEGER NOT NULL DEFAULT 50,
    cible_rdv INTEGER NOT NULL DEFAULT 3,
    cible_ar INTEGER NOT NULL DEFAULT 10,
    actif INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insérer les objectifs par défaut
INSERT OR IGNORE INTO objectifs (id, cible_appels, cible_rdv, cible_ar, actif) 
VALUES (1, 50, 3, 10, 1);
