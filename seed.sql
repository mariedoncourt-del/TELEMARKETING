-- =============================================
-- MAF Formation - Données de test
-- =============================================

-- Utilisateurs (mot de passe: "maf2024" pour tous - hash SHA-256 simplifié)
-- En production, utiliser bcrypt ou argon2
INSERT OR IGNORE INTO users (email, password_hash, nom, prenom, role) VALUES 
    ('admin@maf-formation.fr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Doncourt', 'Marie', 'admin'),
    ('superviseur@maf-formation.fr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Martin', 'Sophie', 'supervisor'),
    ('operateur1@maf-formation.fr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Dupont', 'Jean', 'operator'),
    ('operateur2@maf-formation.fr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Bernard', 'Lucie', 'operator'),
    ('operateur3@maf-formation.fr', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Petit', 'Thomas', 'operator');

-- Prospects de test
INSERT OR IGNORE INTO prospects (nom_entreprise, nom_dirigeant, telephone, email, ville, code_postal, code_ape, opco, statut, compteur_nrp, date_rappel, notes) VALUES 
    ('Boulangerie Dupain', 'Pierre Dupain', '05 63 12 34 56', 'contact@boulangerie-dupain.fr', 'Castres', '81100', '1071C', 'AGEFICE', 'NOUVEAU', 0, NULL, 'Boulangerie artisanale, 5 salariés'),
    ('Garage Auto Plus', 'Marc Lefebvre', '05 63 23 45 67', 'garage@autoplus.fr', 'Mazamet', '81200', '4520A', 'AKTO', 'NOUVEAU', 0, NULL, 'Garage automobile, 8 salariés, intéressé par formations sécurité'),
    ('Restaurant Le Tarn', 'Sophie Moreau', '05 63 34 56 78', 'contact@letarn.fr', 'Castres', '81100', '5610A', 'AKTO', 'NOUVEAU', 0, NULL, 'Restaurant gastronomique'),
    ('Plomberie Occitane', 'Jean-Claude Martin', '05 63 45 67 89', 'jc.martin@plomberie-occitane.fr', 'Labruguière', '81290', '4322A', 'FAFCEA', 'NOUVEAU', 0, NULL, 'Plombier chauffagiste indépendant'),
    ('Cabinet Conseil RH Sud', 'Nathalie Blanc', '05 63 56 78 90', 'n.blanc@conseil-rh-sud.fr', 'Castres', '81100', '7022Z', 'ATLAS', 'NOUVEAU', 0, NULL, 'Cabinet de conseil RH, 3 consultants'),
    ('Menuiserie Bois & Co', 'François Durand', '05 63 67 89 01', 'f.durand@bois-co.fr', 'Aussillon', '81200', '1623Z', 'AGEFICE', 'NOUVEAU', 0, NULL, 'Menuiserie bois, 12 salariés'),
    ('Salon Coiffure Éclat', 'Isabelle Roux', '05 63 78 90 12', 'eclat@coiffure.fr', 'Castres', '81100', '9602A', 'FAFCEA', 'NOUVEAU', 0, NULL, 'Salon de coiffure, 4 employées'),
    ('Transport Tarnais', 'Philippe Garcia', '05 63 89 01 23', 'p.garcia@transport-tarnais.fr', 'Castres', '81100', '4941A', 'AKTO', 'AR', 2, datetime('now', '+1 day'), 'Transport routier, 25 salariés - Rappeler demain matin'),
    ('Pharmacie Centrale', 'Dr Anne Leroy', '05 63 90 12 34', 'pharmacie.centrale@gmail.com', 'Mazamet', '81200', '4773Z', 'AGEFICE', 'AR', 1, datetime('now', '-1 hour'), 'Pharmacie, 6 salariés - URGENT rappel en retard'),
    ('Informatique Pro 81', 'Stéphane Dubois', '05 63 01 23 45', 's.dubois@infopro81.fr', 'Castres', '81100', '6201Z', 'ATLAS', 'NOUVEAU', 0, NULL, 'ESN locale, 15 salariés, formations certifiantes'),
    ('Électricité Générale du Sud', 'Christophe Faure', '05 63 11 22 33', 'c.faure@egs81.fr', 'Labruguière', '81290', '4321A', 'FAFCEA', 'NOUVEAU', 0, NULL, 'Électricien, 7 salariés'),
    ('Boucherie Charcuterie Tarnaise', 'Michel Pons', '05 63 44 55 66', NULL, 'Castres', '81100', '4722Z', 'AGEFICE', 'NOUVEAU', 0, NULL, 'Boucherie traditionnelle, 3 employés'),
    ('Centre Auto Vidange', 'Alain Mercier', '05 63 77 88 99', 'a.mercier@centreauto.fr', 'Mazamet', '81200', '4520A', 'AKTO', 'RDV', 0, NULL, 'RDV déjà pris - Formation gestion atelier'),
    ('Imprimerie du Midi', 'Claire Vasseur', '05 63 22 33 44', 'c.vasseur@imprimerie-midi.fr', 'Castres', '81100', '1812Z', 'AGEFICE', 'FIN', 0, NULL, 'Pas intéressé - déjà en formation');

-- Un RDV existant pour le prospect "Centre Auto Vidange"
INSERT OR IGNORE INTO rdv (prospect_id, pris_par, date_rdv, lieu, type_rdv, formation_souhaitee, statut, commentaires) VALUES
    (13, 3, datetime('now', '+3 days'), 'Sur site - Mazamet', 'presentiel', 'Gestion d''atelier automobile - Formation certifiante', 'PLANIFIE', 'M. Mercier souhaite former ses 4 mécaniciens');

-- Quelques appels historiques
INSERT OR IGNORE INTO appels (prospect_id, user_id, statut_resultat, commentaire, duree_secondes, created_at) VALUES
    (8, 3, 'NRP', 'Pas de réponse, messagerie pleine', 15, datetime('now', '-2 days')),
    (8, 4, 'NRP', 'Sonnerie sans réponse', 20, datetime('now', '-1 day')),
    (8, 3, 'AR', 'Occupé, rappeler demain matin', 45, datetime('now', '-4 hours')),
    (9, 4, 'AR', 'En réunion, rappeler dans 1h', 30, datetime('now', '-2 hours')),
    (13, 3, 'RDV', 'RDV pris pour formation gestion atelier', 180, datetime('now', '-1 day')),
    (14, 5, 'FIN', 'Pas intéressé, déjà en formation avec un autre organisme', 90, datetime('now', '-3 days'));
