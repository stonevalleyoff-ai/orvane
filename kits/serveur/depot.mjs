/* @ts-self-types="./depot.d.ts" */
// Orvane — DÉPOSER DEPUIS UN SERVEUR (kits/serveur/depot.mjs) — docs/4
// Le petit client d'un serveur de jeu : il dépose un lot de pressions dans le Supabase d'Orvane (orvane_deposer), avec la clé du
// jeu et, si le jeu en a une, sa clé de dépôt (orvane_cle_depot : réservée au serveur, jamais dans le client). Il donne un id au
// lot s'il n'en a pas, et renvoie le lot quand le réseau ou le serveur flanche : un lot renvoyé avec le même id n'est compté
// qu'une fois (Orvane répond { ok: true, deja: true }). Il ne se sert que de fetch : Node 18 ou plus, Deno (une fonction
// Supabase), un navigateur. Aucune dépendance. En CommonJS (Node) : depot.cjs, la même chose.
//   import { deposer } from './depot.mjs';
//   const r = await deposer({ cle: 'orv_…', cleDepot: 'orvdep_…' }, compteOpaque, lot);
//   // r : { ok: true, id } | { ok: true, deja: true, id } | { ok: false, erreur, id, plusTard, config? }
// plusTard : gardez le lot (avec son id, que deposer a écrit dans lot.id) et renvoyez-le plus tard, tel quel — le réseau, un quota du
// jour, ou (config : true) une erreur de configuration qui se répare : une clé de dépôt renouvelée, absente ou fausse, une clé de jeu
// ou une clé publique fausse, une fonction absente (la migration pas encore appliquée). Signalez-la : elle ne passe pas seule.
// Sinon (plusTard : false), le lot lui-même est refusé (hors du contrat, un id déjà pris) : le renvoyer n'y changera rien ; mettez-le
// de côté, il ne doit pas bloquer les suivants.
// La clé de dépôt ne part que vers une adresse https (ou la machine elle-même, pour un essai) ; elle ne va jamais dans un client.
export const ORVANE = Object.freeze({ url: 'https://rospodujiyltmxitykwc.supabase.co', apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8' });
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;   // (schemas/pression.schema.json, comme orvane_deposer le vérifie)
// les refus qui passent avec le temps (un quota de 24 heures, un jeu suspendu) : le lot se garde et se renvoie plus tard, avec son id ;
// et ceux qui passent quand la configuration est réparée (une clé) : de même, mais il faut le dire
const PLUS_TARD = /trop de dépôts aujourd|quota du jeu atteint|ce jeu est suspendu/, CONFIG = /clé de dépôt|clé de jeu inconnue|depuis son serveur/;

// un id au hasard : 32 chiffres hexadécimaux (128 bits). Deux lots n'ont pas le même ; un lot le garde d'un essai à l'autre
export async function nouvelId() {
  let c = globalThis.crypto;
  if (!c?.getRandomValues) c = (await import('node:crypto')).webcrypto;   // (Node 18 n'a pas encore crypto partout)
  return Array.from(c.getRandomValues(new Uint8Array(16)), o => o.toString(16).padStart(2, '0')).join('');
}

const attendre = ms => new Promise(r => setTimeout(r, ms));
// dépose un lot. options : { cle (la clé du jeu), cleDepot (la clé de dépôt, si le jeu en a une), url, apikey (ceux du Supabase
// d'Orvane par défaut), essais (4), attente (500 ms, doublée à chaque essai), delai (15 s par essai), fetch }
export async function deposer(options, compte, lot) {
  const o = options || {}, nombre = (x, d) => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : d, f = o.fetch || globalThis.fetch;
  const essais = Math.max(1, Math.floor(nombre(o.essais, 4))), attente = nombre(o.attente, 500), delai = Math.max(1, nombre(o.delai, 15000));
  const adresse = `${String(o.url || ORVANE.url).replace(/\/+$/, '')}/rest/v1/rpc/orvane_deposer`;
  // non : le lot lui-même ne passera pas ; conf : le serveur est mal réglé (le lot est bon : le garder, et réparer)
  const non = erreur => ({ ok: false, erreur, id: lot?.id ?? null, plusTard: false }), conf = erreur => ({ ...non(erreur), plusTard: true, config: true });
  if (typeof f !== 'function') return conf('pas de fetch : Node 18 ou plus, Deno, ou options.fetch');
  if (typeof o.cle !== 'string' || !o.cle) return conf('pas de clé de jeu (options.cle)');
  if (o.cleDepot != null && (typeof o.cleDepot !== 'string' || !o.cleDepot)) return conf('clé de dépôt : une chaîne (options.cleDepot)');
  // (la clé de dépôt ne part jamais en clair sur le réseau : https, ou la machine elle-même pour un essai)
  if (o.cleDepot && !/^https:\/\//i.test(adresse) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(adresse)) return conf('la clé de dépôt ne part que vers une adresse https');
  if (typeof compte !== 'string' || compte.length < 1 || compte.length > 128) return conf('compte : 1 à 128 caractères');
  if (!lot || typeof lot !== 'object' || Array.isArray(lot) || !Array.isArray(lot.evenements)) return non('lot mal formé : un objet, avec une liste evenements');
  // l'id d'abord, écrit dans le lot : qui garde le lot pour le renvoyer plus tard garde aussi son id (un lot gelé sans id : refusé,
  // car son renvoi n'aurait pas le même id)
  if (lot.id == null) { const id = await nouvelId(); try { lot.id = id; } catch (e) { /* gelé */ } if (lot.id !== id) return non('lot gelé sans id : donnez-lui un id (nouvelId) avant de le garder'); }
  if (typeof lot.id !== 'string' || !ID.test(lot.id)) return non('id du lot : 1 à 64 lettres, chiffres ou . _ : - (pas au début)');
  const corps = JSON.stringify({ p_cle: o.cle, p_compte: compte, p_lot: lot, ...(o.cleDepot ? { p_cle_depot: o.cleDepot } : {}) });
  let derniere = '';
  for (let k = 1; k <= essais; k++) {
    if (k > 1) await attendre(attente * 2 ** (k - 2) * (0.75 + Math.random() / 2));
    const fin = new AbortController(), minuteur = setTimeout(() => fin.abort(), delai);
    try {
      const r = await f(adresse, { method: 'POST', headers: { apikey: o.apikey || ORVANE.apikey, 'Content-Type': 'application/json' }, body: corps, signal: fin.signal });
      const texte = await r.text();
      // le serveur flanche (5xx), est trop sollicité (429), n'a pas répondu à temps (408) : on renvoie le même lot, le même id
      if (r.status >= 500 || r.status === 429 || r.status === 408) { derniere = `HTTP ${r.status}`; continue; }
      // une clé publique fausse (401, 403), une fonction absente (404 : la migration pas encore appliquée) : la configuration, qui se répare
      if (!r.ok) return { ...non(`HTTP ${r.status} : ${texte.slice(0, 300)}`), id: lot.id, essais: k, ...([401, 403, 404].includes(r.status) ? { plusTard: true, config: true } : {}) };
      let rep = null; try { rep = JSON.parse(texte); } catch (e) { /* une réponse coupée : comme un réseau qui flanche */ }
      if (!rep || typeof rep !== 'object') { derniere = 'réponse illisible'; continue; }
      if (rep.ok === true) return { ok: true, ...(rep.deja ? { deja: true } : {}), id: lot.id, essais: k };
      const erreur = String(rep.erreur || 'refusé'), config = CONFIG.test(erreur);
      return { ok: false, erreur, id: lot.id, essais: k, plusTard: config || PLUS_TARD.test(erreur), ...(config ? { config: true } : {}) };
    } catch (e) { derniere = fin.signal.aborted ? `pas de réponse en ${delai} ms` : String(e?.message || e); }
    finally { clearTimeout(minuteur); }
  }
  return { ok: false, erreur: `${derniere} (${essais} essai${essais > 1 ? 's' : ''})`, id: lot.id, essais, plusTard: true };
}

// les mêmes options pour tous les dépôts : const d = depot({ cle, cleDepot }); await d.deposer(compte, lot)
export function depot(options) { return { deposer: (compte, lot) => deposer(options, compte, lot) }; }
