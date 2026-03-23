-- Ajout colonne date_appel pour permettre au teleoperateur de saisir la date de son appel
ALTER TABLE appels ADD COLUMN date_appel TEXT;
