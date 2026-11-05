// Orvane — LE VÉRIFICATEUR DU CONTRAT (outils/verifier.js) — docs/39
// Un jeu qui se branche vérifie ce qu'il envoie et ce qu'il lit, hors ligne, avant le premier dépôt :
//   node outils/verifier.js mon-lot.json                 un lot de pressions (schemas/pression.schema.json)
//   node outils/verifier.js mondes/orvane/instantane.json un instantané (schemas/instantane.schema.json)
//   node outils/verifier.js mon-profil.json --profil      un profil ou une exposition (schemas/profil.schema.json)
// Le genre du fichier se devine (evenements : un lot ; taxons : un instantané ; influence ou exposition : un profil), ou se dit
// (--lot, --instantane, --profil). Pour un lot, il dit aussi ce que le Supabase d'Orvane refusera (orvane_deposer) : la taille,
// le nombre d'événements, une action inconnue, un n hors de 0 à 10 000. Sort en erreur (code 1) s'il trouve quelque chose.
// Le validateur ne connaît que ce dont les schémas d'Orvane se servent (type, required, properties, additionalProperties, items,
// enum, const, minimum, maximum, minItems, maxItems, pattern, anyOf, oneOf, $ref local). Zéro dépendance ; utilisable en module :
//   const { verifier } = require('./outils/verifier.js'); verifier(objet, 'lot') → [erreurs]
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const SCHEMAS = { lot: 'pression', instantane: 'instantane', profil: 'profil' };
const typeDe = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
function valider(s, v, ou, racineS, E) {
  if (!s || typeof s !== 'object' || E.length > 200) return;
  if (s.$ref) { const m = /^#\/\$defs\/(.+)$/.exec(s.$ref); return valider(m ? racineS.$defs?.[m[1]] : null, v, ou, racineS, E); }
  if (s.anyOf || s.oneOf) { const ok = (s.anyOf || s.oneOf).some(x => { const e = []; valider(x, v, ou, racineS, e); return !e.length; }); if (!ok) E.push(`${ou} : ne correspond à aucune des formes permises`); return; }
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : null, t = typeDe(v);
  if (types && !types.some(x => x === t || (x === 'integer' && t === 'number' && Number.isInteger(v)) || (x === 'number' && t === 'number'))) { E.push(`${ou} : ${t} au lieu de ${types.join(' ou ')}`); return; }
  if (t === 'number' && types?.includes('integer') && !types.includes('number') && !Number.isInteger(v)) E.push(`${ou} : ${v} n'est pas un entier`);
  if (s.enum && !s.enum.some(x => x === v)) E.push(`${ou} : « ${v} » n'est pas dans ${JSON.stringify(s.enum)}`);
  if (s.const !== undefined && s.const !== v) E.push(`${ou} : doit valoir ${JSON.stringify(s.const)}`);
  if (t === 'number') { if (s.minimum != null && v < s.minimum) E.push(`${ou} : ${v} < ${s.minimum}`); if (s.maximum != null && v > s.maximum) E.push(`${ou} : ${v} > ${s.maximum}`);
    if (!Number.isFinite(v)) E.push(`${ou} : nombre non fini`); }
  if (t === 'string' && s.pattern && !new RegExp(s.pattern, 'u').test(v)) E.push(`${ou} : « ${v} » ne suit pas ${s.pattern}`);
  if (t === 'array') { if (s.minItems != null && v.length < s.minItems) E.push(`${ou} : au moins ${s.minItems} éléments`); if (s.maxItems != null && v.length > s.maxItems) E.push(`${ou} : au plus ${s.maxItems} éléments`);
    if (s.items) v.forEach((x, i) => valider(Array.isArray(s.items) ? s.items[i] : s.items, x, `${ou}[${i}]`, racineS, E)); }
  if (t === 'object') { const P = s.properties || {};
    for (const r of s.required || []) if (!(r in v)) E.push(`${ou} : il manque « ${r} »`);
    for (const [k, x] of Object.entries(v)) { if (P[k]) valider(P[k], x, `${ou}.${k}`, racineS, E);
      else if (s.additionalProperties === false) E.push(`${ou} : champ inconnu « ${k} »`);
      else if (s.additionalProperties && typeof s.additionalProperties === 'object') valider(s.additionalProperties, x, `${ou}.${k}`, racineS, E); } }
}
// ce que le Supabase d'Orvane refusera, en plus du schéma (hebergement/supabase.sql, orvane_deposer)
const ACTIONS = ['rencontre', 'prelevement', 'capture', 'liberation', 'nourrissage', 'reproduction', 'deplacement', 'habitat_perdu', 'habitat_gagne', 'defrichage', 'reboisement', 'assechement', 'irrigation', 'construction', 'transformation'];
function depot(lot) {
  const E = [], ev = Array.isArray(lot?.evenements) ? lot.evenements : [];
  if (Buffer.byteLength(JSON.stringify(lot)) > 65536) E.push('le lot dépasse 64 Ko : orvane_deposer le refusera (« lot trop gros »)');
  if (ev.length > 500) E.push(`${ev.length} événements : 500 au plus par lot`);
  ev.forEach((e, i) => { const ou = `evenements[${i}]`;
    if (!e || typeof e !== 'object') return E.push(`${ou} : un événement est un objet`);
    if (!ACTIONS.includes(e.action)) E.push(`${ou} : action « ${e.action} » inconnue`);
    if (!(typeof e.n === 'number' && e.n >= 0 && e.n <= 1e4)) E.push(`${ou} : n doit être un nombre de 0 à 10 000`);
    for (const k of ['taxon', 'biome', 'vers', 'parcelle', 'phenotype']) if (e[k] != null && (typeof e[k] !== 'string' || /^(__proto__|constructor|prototype)$/.test(e[k]))) E.push(`${ou}.${k} : une chaîne, et pas un nom réservé`); });
  return E;
}
function genre(o) { return o?.taxons ? 'instantane' : o?.evenements ? 'lot' : o?.influence || o?.exposition ? 'profil' : null; }
function verifier(o, g = genre(o)) {
  if (!SCHEMAS[g]) return [`je ne sais pas ce qu'est ce fichier : --lot, --instantane ou --profil`];
  const S = JSON.parse(fs.readFileSync(racine(`schemas/${SCHEMAS[g]}.schema.json`), 'utf8')), E = [];
  valider(S, o, '$', S, E); if (g === 'lot') E.push(...depot(o)); return E;
}
if (require.main === module) {
  const a = process.argv.slice(2), f = a.find(x => !x.startsWith('--')); if (!f) { console.log('node outils/verifier.js <fichier.json> [--lot|--instantane|--profil]'); process.exit(2); }
  let o; try { o = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`${f} ne se lit pas : ${e.message}`); process.exit(1); }
  const g = ['lot', 'instantane', 'profil'].find(x => a.includes('--' + x)) || genre(o), E = verifier(o, g);
  if (!E.length) { console.log(`✓ ${f} : ${g === 'lot' ? 'un lot' : g === 'instantane' ? 'un instantané' : 'un profil'} conforme au contrat${g === 'lot' ? ', qu\'orvane_deposer acceptera' : ''}`); process.exit(0); }
  console.log(`✗ ${f} (${g}) : ${E.length} problème${E.length > 1 ? 's' : ''}`); for (const e of E.slice(0, 50)) console.log('  ' + e); if (E.length > 50) console.log(`  … et ${E.length - 50} autres`); process.exit(1);
}
module.exports = { verifier, valider, depot, genre };
