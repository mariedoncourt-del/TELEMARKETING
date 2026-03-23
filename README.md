# MAF Formation - Plateforme Télémarketing

## Apercu du projet

**Nom**: MAF Telemarketing  
**Objectif**: Application de gestion de campagnes de télémarketing pour MAF Formation, société de formation professionnelle continue basée a Castres (81).  
**Client**: Marie Doncourt - MAF Formation

## Fonctionnalites implementees

### Authentification et roles
- Connexion JWT avec tokens 8h
- 3 roles : **Admin**, **Superviseur**, **Teleoperateur**
- Hachage SHA-256 des mots de passe (Web Crypto API)
- Middleware de protection des routes par role

### File d'attente commune (anti-collision)
- Algorithme de distribution avec **priorites metier** :
  1. AR en retard (urgence maximale)
  2. AR du jour
  3. Nouveaux prospects
- **Verrouillage atomique** : un prospect ne peut etre traite que par un seul operateur
- Timer de verrou (10 min) avec liberation automatique
- Equite : evite qu'un agent monopolise les memes prospects

### Gestion des appels
- **NRP** : compteur automatique (5 NRP = cloture), rappel automatique dans 2h
- **AR** : programmation de la date/heure de rappel
- **RDV** : creation du rendez-vous avec details (date, lieu, type, formation)
- **FIN** : cloture avec motif (pas interesse, hors cible, faux numero, doublon)

### Dashboard superviseur
- Statistiques globales en temps reel (refresh 30s)
- Jauge de progression de la campagne
- Performance par operateur (appels, RDV, taux de conversion)
- Liste des RDV a venir (7 jours)
- Indicateurs visuels : AR en retard (clignotant), prospects en cours

### Gestion des RDV
- Liste des RDV avec filtres
- Details complets (entreprise, contact, formation, type)
- Statuts : Planifie, Confirme, Realise, Annule, Reporte

### Administration
- Gestion des utilisateurs (creation, activation/desactivation)
- Import CSV de prospects (separateur point-virgule)
- Ajout manuel de prospects
- Liste des prospects avec filtres et recherche

## URLs et points d'entree API

### Pages
| URL | Description | Acces |
|-----|-------------|-------|
| `/#login` | Page de connexion | Public |
| `/#operator` | Poste d'appel teleoperateur | Tous |
| `/#dashboard` | Dashboard superviseur | Admin, Superviseur |
| `/#prospects` | Liste des prospects | Admin, Superviseur |
| `/#rdv` | Liste des RDV | Tous |
| `/#admin` | Administration | Admin |

### API REST
| Methode | Endpoint | Description | Acces |
|---------|----------|-------------|-------|
| POST | `/api/auth/login` | Connexion | Public |
| GET | `/api/auth/me` | Verifier token | Connecte |
| POST | `/api/auth/change-password` | Changer mot de passe | Connecte |
| GET | `/api/prospects/next` | Prochain prospect (file) | Connecte |
| POST | `/api/prospects/:id/release` | Liberer un prospect | Connecte |
| GET | `/api/prospects` | Liste prospects | Admin/Superviseur |
| GET | `/api/prospects/:id` | Detail prospect | Connecte |
| POST | `/api/prospects` | Creer prospect | Admin/Superviseur |
| POST | `/api/prospects/import` | Import CSV | Admin |
| PUT | `/api/prospects/:id` | Modifier prospect | Admin/Superviseur |
| POST | `/api/appels` | Enregistrer un appel | Connecte |
| GET | `/api/appels/history/:id` | Historique appels | Connecte |
| GET | `/api/appels/my-today` | Mes appels du jour | Connecte |
| GET | `/api/rdv` | Liste des RDV | Connecte |
| GET | `/api/rdv/:id` | Detail RDV | Connecte |
| PUT | `/api/rdv/:id` | Modifier RDV | Connecte |
| DELETE | `/api/rdv/:id` | Annuler RDV | Admin/Superviseur |
| GET | `/api/dashboard/stats` | Stats superviseur | Admin/Superviseur |
| GET | `/api/dashboard/my-stats` | Mes stats | Connecte |
| GET | `/api/users` | Liste utilisateurs | Admin |
| POST | `/api/users` | Creer utilisateur | Admin |
| PUT | `/api/users/:id` | Modifier utilisateur | Admin |
| DELETE | `/api/users/:id` | Desactiver utilisateur | Admin |

## Architecture technique

### Stack
- **Backend**: Hono (TypeScript) sur Cloudflare Workers
- **Base de donnees**: Cloudflare D1 (SQLite distribue)
- **Frontend**: Vanilla JS + Tailwind CSS (CDN) + Font Awesome
- **Auth**: JWT manuel (Web Crypto API, compatible Workers)

### Modeles de donnees

```
users       -> id, email, password_hash, nom, prenom, role, actif
prospects   -> id, nom_entreprise, telephone, statut, locked_by, date_rappel, ...
appels      -> id, prospect_id, user_id, statut_resultat, commentaire, ...
rdv         -> id, prospect_id, pris_par, date_rdv, type_rdv, formation, ...
```

### Structure du projet
```
webapp/
  src/
    index.tsx          # Application Hono principale
    types.ts           # Types TypeScript
    routes/
      auth.ts          # Authentification JWT
      prospects.ts     # File d'attente et gestion prospects
      appels.ts        # Enregistrement des resultats d'appels
      rdv.ts           # Gestion des rendez-vous
      dashboard.ts     # Statistiques superviseur
      users.ts         # Administration utilisateurs
  public/static/
    app.js             # Frontend SPA complet
  migrations/
    0001_initial_schema.sql
  seed.sql             # Donnees de test
```

## Comptes de test

| Email | Mot de passe | Role |
|-------|-------------|------|
| admin@maf-formation.fr | admin | Administrateur |
| superviseur@maf-formation.fr | admin | Superviseur |
| operateur1@maf-formation.fr | admin | Teleoperateur |
| operateur2@maf-formation.fr | admin | Teleoperateur |
| operateur3@maf-formation.fr | admin | Teleoperateur |

## Guide d'utilisation

### Teleoperateur
1. Se connecter avec ses identifiants
2. Cliquer sur "Prochain prospect" pour obtenir une fiche
3. Appeler le numero affiche
4. Saisir le resultat : NRP, AR (avec date de rappel), RDV (avec details), ou FIN
5. Passer au prospect suivant

### Superviseur
1. Consulter le dashboard pour les stats en temps reel
2. Surveiller les AR en retard (indicateur rouge clignotant)
3. Verifier les performances par operateur
4. Gerer les prospects (liste, recherche, filtres)

### Admin
1. Creer/desactiver des utilisateurs
2. Importer des prospects par CSV
3. Acces complet a toutes les fonctionnalites

## Fonctionnalites a venir

- [ ] **Integration Google Calendar** (Service Account) : creation automatique des RDV dans l'agenda de Marie
- [ ] **Export des donnees** (CSV/Excel)
- [ ] **Notifications** : alertes pour AR en retard
- [ ] **Rapports** : rapports hebdomadaires/mensuels
- [ ] **Gestion des formations** : catalogue des formations MAF
- [ ] **SMS de confirmation** de RDV

## Deploiement

- **Plateforme**: Cloudflare Pages
- **Base de donnees**: Cloudflare D1
- **Statut**: En developpement
- **Stack**: Hono + TypeScript + Tailwind CSS
