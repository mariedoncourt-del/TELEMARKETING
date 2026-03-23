// Types pour l'application MAF Telemarketing
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
}

export type Variables = {
  user: JWTPayload;
}

export type JWTPayload = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'supervisor' | 'operator';
}

export type Prospect = {
  id: number;
  nom_entreprise: string;
  nom_dirigeant: string | null;
  telephone: string;
  email: string | null;
  ville: string | null;
  code_postal: string | null;
  code_ape: string | null;
  opco: string | null;
  budget_identifie: number | null;
  statut: 'NOUVEAU' | 'AR' | 'RDV' | 'FIN';
  motif_fin: string | null;
  compteur_nrp: number;
  date_rappel: string | null;
  locked_by: number | null;
  locked_at: string | null;
  last_called_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Appel = {
  id: number;
  prospect_id: number;
  user_id: number;
  statut_resultat: 'NRP' | 'AR' | 'RDV' | 'FIN';
  commentaire: string | null;
  duree_secondes: number | null;
  date_rappel: string | null;
  created_at: string;
}

export type RDV = {
  id: number;
  prospect_id: number;
  appel_id: number | null;
  pris_par: number;
  date_rdv: string;
  duree_minutes: number;
  lieu: string | null;
  type_rdv: 'presentiel' | 'distance' | 'telephone';
  formation_souhaitee: string | null;
  statut: 'PLANIFIE' | 'CONFIRME' | 'REALISE' | 'ANNULE' | 'REPORTE';
  google_event_id: string | null;
  commentaires: string | null;
  created_at: string;
  updated_at: string;
}

export type User = {
  id: number;
  email: string;
  password_hash: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'supervisor' | 'operator';
  actif: number;
  created_at: string;
  updated_at: string;
}
