// Orvane — les types du client de dépôt pour serveur (kits/serveur/depot.mjs, depot.cjs) — docs/4
// (sans import : le fichier se copie tel quel à côté de depot.mjs ; le lot complet est le type Lot de types/orvane.d.ts)

/** Le Supabase d'Orvane : son adresse et sa clé publique (en-tête apikey). */
export declare const ORVANE: { readonly url: string; readonly apikey: string };

/** Un lot de pressions (schemas/pression.schema.json) : ce que ce client en regarde. */
export interface LotDepose {
  /** L'id du lot : 1 à 64 lettres, chiffres ou . _ : - (pas au début). Absent, deposer en donne un. */
  id?: string;
  evenements: object[];
  [champ: string]: unknown;
}

export interface OptionsDepot {
  /** La clé du jeu (orv_…), reçue à l'inscription. */
  cle: string;
  /** La clé de dépôt (orvdep_…, orvane_cle_depot) : réservée au serveur du jeu, jamais dans le client. */
  cleDepot?: string;
  /** L'adresse du Supabase (celui d'Orvane par défaut). */
  url?: string;
  /** Sa clé publique (celle d'Orvane par défaut). */
  apikey?: string;
  /** Combien d'essais en tout quand le réseau ou le serveur flanche (4). */
  essais?: number;
  /** L'attente avant le deuxième essai, en millisecondes, doublée ensuite (500). */
  attente?: number;
  /** Le temps laissé à chaque essai, en millisecondes (15 000). */
  delai?: number;
  /** Un autre fetch que celui de la plateforme. */
  fetch?: typeof fetch;
}

/** La réponse d'un dépôt. */
export type ReponseDepot =
  /** Accepté ; deja : ce lot (le même id) était déjà entré, il n'est pas compté deux fois. */
  | { ok: true; deja?: true; id: string; essais: number }
  /** Refusé. plusTard : le même lot, avec le même id, peut être renvoyé plus tard (le réseau, un quota du jour) ; sinon, il est refusé pour de bon. */
  | { ok: false; erreur: string; id: string | null; essais?: number; plusTard: boolean };

/** Un id de lot au hasard (32 chiffres hexadécimaux). */
export declare function nouvelId(): Promise<string>;
/** Dépose un lot. S'il n'a pas d'id, deposer lui en donne un (écrit dans lot.id) : gardez le lot tel quel pour le renvoyer. */
export declare function deposer(options: OptionsDepot, compte: string, lot: LotDepose): Promise<ReponseDepot>;
/** Les mêmes options pour tous les dépôts. */
export declare function depot(options: OptionsDepot): { deposer(compte: string, lot: LotDepose): Promise<ReponseDepot> };
