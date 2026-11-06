// Orvane — LE GARDE-FOU DU CONTRAT (outils/contrat.js) — docs/43
// Compare les schémas du contrat (schemas/*.schema.json) à ceux d'une version de référence (origin/main par défaut), et dit ce qui
// a changé : ce qui casse un jeu, ce qui ne fait qu'ajouter. Un changement qui casse demande une version majeure (package.json) ;
// sans elle, la vérification échoue. Elle vérifie aussi que la version est la même partout (package.json, le moteur, le journal).
//   node outils/contrat.js [--base origin/main]
// Ce qui casse dépend du sens :
//  - ce qu'Orvane écrit et que les jeux lisent (l'instantané) : un champ retiré, un champ qui n'est plus toujours là, un type
//    nouveau pour un champ connu. Ajouter un champ, une valeur, élargir une borne ne casse rien : un jeu ignore ce qu'il ne connaît pas ;
//  - ce que les jeux écrivent et qu'Orvane lit (les lots, les profils) : un champ exigé de plus, un champ ou une valeur qu'Orvane
//    n'accepte plus, un type, une borne, un motif plus étroits. Accepter davantage ne casse rien.
// Sortie : 0 si tout va, 1 si un changement cassant n'a pas sa version majeure (ou si la version n'est pas la même partout).
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const racine = path.join(__dirname, '..');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const base = arg('--base', 'origin/main');
const SCHEMAS = { instantane: 'sortie', pression: 'entree', profil: 'entree' };

const git = (...x) => { try { return execFileSync('git', x, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };
const avant = f => { const t = git('show', `${base}:${f}`); try { return t == null ? null : JSON.parse(t); } catch (e) { return null; } };
const ici = f => JSON.parse(fs.readFileSync(path.join(racine, f), 'utf8'));
const majeur = v => +String(v || '0').split('.')[0], mineur = v => +String(v || '0.0').split('.')[1] || 0;

// un nœud de schéma, ses $ref suivis (dans le même fichier)
const suivre = (S, n, vus = new Set()) => { while (n && n.$ref && n.$ref.startsWith('#/') && !vus.has(n.$ref)) { vus.add(n.$ref); n = n.$ref.slice(2).split('/').reduce((x, k) => x?.[k], S); } return n || {}; };
const types = n => new Set([].concat(n.type ?? []));
const sousEnsemble = (x, y) => [...x].every(v => y.has(v));
const nom = p => p.replace(/^\$\./, '') || '(la racine)';

function comparer(SA, SB, sens) {
  const casse = [], ajoute = [];
  const C = (m) => casse.push(m), A = (m) => ajoute.push(m);
  (function marcher(na, nb, p, prof) {
    na = suivre(SA, na); nb = suivre(SB, nb); if (prof > 40) return;
    // le type
    const ta = types(na), tb = types(nb);
    if (ta.size && tb.size) {
      if (sens === 'sortie' && !sousEnsemble(tb, ta)) C(`${nom(p)} : peut désormais être ${[...tb].filter(t => !ta.has(t)).join(', ')} (était ${[...ta].join(', ')})`);
      if (sens === 'entree' && !sousEnsemble(ta, tb)) C(`${nom(p)} : n'accepte plus ${[...ta].filter(t => !tb.has(t)).join(', ')}`);
      if (sens === 'entree' && !sousEnsemble(tb, ta)) A(`${nom(p)} : accepte aussi ${[...tb].filter(t => !ta.has(t)).join(', ')}`);
    }
    // les valeurs permises
    if (na.enum || nb.enum) {
      const ea = na.enum || [], eb = nb.enum || [], moins = na.enum && nb.enum ? ea.filter(v => !eb.includes(v)) : [], plus = na.enum && nb.enum ? eb.filter(v => !ea.includes(v)) : [];
      if (sens === 'entree' && moins.length) C(`${nom(p)} : n'accepte plus ${JSON.stringify(moins)}`);
      if (sens === 'entree' && !na.enum && nb.enum) C(`${nom(p)} : n'accepte plus que ${JSON.stringify(eb)}`);
      if (plus.length) A(`${nom(p)} : valeur${plus.length > 1 ? 's' : ''} nouvelle${plus.length > 1 ? 's' : ''} ${JSON.stringify(plus)}`);
      if (sens === 'sortie' && moins.length) A(`${nom(p)} : ne vaut plus ${JSON.stringify(moins)}`);
      if (na.enum && !nb.enum) A(`${nom(p)} : n'est plus limité à une liste`); }
    // les bornes et les motifs
    for (const [k, plusEtroit] of [['minimum', (x, y) => y > x], ['exclusiveMinimum', (x, y) => y > x], ['minLength', (x, y) => y > x], ['minItems', (x, y) => y > x],
      ['maximum', (x, y) => y < x], ['exclusiveMaximum', (x, y) => y < x], ['maxLength', (x, y) => y < x], ['maxItems', (x, y) => y < x]]) {
      const x = na[k], y = nb[k]; if (x === y) continue;
      const etroit = y != null && (x == null || plusEtroit(x, y));
      if (sens === 'entree' && etroit) C(`${nom(p)} : ${k} ${x ?? '—'} → ${y} (plus étroit)`);
      else if (!etroit) A(`${nom(p)} : ${k} ${x ?? '—'} → ${y ?? '—'} (plus large)`);
      else if (sens === 'sortie') A(`${nom(p)} : ${k} ${x ?? '—'} → ${y} (plus étroit)`); }
    if (na.pattern !== nb.pattern) { if (sens === 'entree' && nb.pattern) C(`${nom(p)} : motif ${na.pattern ? 'changé' : 'nouveau'} (${nb.pattern})`); else A(`${nom(p)} : motif ${nb.pattern ? 'changé' : 'retiré'}`); }
    // les champs d'un objet
    const pa = na.properties || {}, pb = nb.properties || {}, ra = new Set(na.required || []), rb = new Set(nb.required || []);
    const fermeA = na.additionalProperties === false, fermeB = nb.additionalProperties === false;
    for (const k of Object.keys(pa)) {
      if (!(k in pb)) { if (sens === 'sortie') C(`${nom(p + '.' + k)} : retiré`); else if (fermeB) C(`${nom(p + '.' + k)} : n'est plus accepté`); else A(`${nom(p + '.' + k)} : n'est plus lu`); continue; }
      if (sens === 'sortie' && ra.has(k) && !rb.has(k)) C(`${nom(p + '.' + k)} : n'est plus toujours présent`);
      marcher(pa[k], pb[k], p + '.' + k, prof + 1); }
    for (const k of Object.keys(pb)) if (!(k in pa)) { if (sens === 'entree' && rb.has(k)) C(`${nom(p + '.' + k)} : nouveau, et exigé`); else A(`${nom(p + '.' + k)} : nouveau${rb.has(k) ? ' (toujours présent)' : ''}`); }
    if (sens === 'entree') for (const k of rb) if (!ra.has(k) && k in pa) C(`${nom(p + '.' + k)} : désormais exigé`);
    if (sens === 'entree' && !fermeA && fermeB) C(`${nom(p)} : n'accepte plus de champ inconnu`);
    // les dictionnaires, les tableaux
    if (typeof na.additionalProperties === 'object' && typeof nb.additionalProperties === 'object') marcher(na.additionalProperties, nb.additionalProperties, p + '.*', prof + 1);
    if (na.items && nb.items) marcher(na.items, nb.items, p + '[]', prof + 1);
  })(SA, SB, '$', 0);
  return { casse, ajoute };
}

// --- la version : la même partout ---
const P = ici('package.json'), V = P.version, Pavant = avant('package.json'), Vavant = Pavant?.version || `${(avant('schemas/instantane.schema.json') ? '0.1' : '0.0')}.0`;
const Orvane = require(path.join(racine, 'moteur/orvane.js')), journal = fs.existsSync(path.join(racine, 'CHANGELOG.md')) ? fs.readFileSync(path.join(racine, 'CHANGELOG.md'), 'utf8') : '';
const erreurs = [];
if (Orvane.CONTRAT !== `${majeur(V)}.${mineur(V)}`) erreurs.push(`le moteur dit le contrat ${Orvane.CONTRAT}, package.json la version ${V} : moteur/orvane.js (CONTRAT) doit valoir « ${majeur(V)}.${mineur(V)} »`);
if (!new RegExp(`^## \\[${V.replace(/\./g, '\\.')}\\]`, 'm').test(journal)) erreurs.push(`CHANGELOG.md n'a pas d'entrée « ## [${V}] »`);
const monte = majeur(V) > majeur(Vavant), bouge = V !== Vavant;
if (bouge && (majeur(V) < majeur(Vavant) || (majeur(V) === majeur(Vavant) && mineur(V) < mineur(Vavant)))) erreurs.push(`la version recule : ${Vavant} → ${V}`);

// --- les schémas ---
let casses = 0;
console.log(`Le contrat : ${base} (version ${Vavant}) → ici (version ${V})\n`);
for (const [n, sens] of Object.entries(SCHEMAS)) {
  const f = `schemas/${n}.schema.json`, SA = avant(f), SB = ici(f);
  if (!SA) { console.log(`${n} : pas de version de référence (${base}), rien à comparer`); continue; }
  const { casse, ajoute } = comparer(SA, SB, sens); casses += casse.length;
  console.log(`${n} (${sens === 'sortie' ? 'écrit par Orvane, lu par les jeux' : 'écrit par les jeux, lu par Orvane'}) : ${casse.length ? `${casse.length} changement${casse.length > 1 ? 's' : ''} qui casse${casse.length > 1 ? 'nt' : ''}` : 'rien qui casse'}${ajoute.length ? `, ${ajoute.length} ajout${ajoute.length > 1 ? 's' : ''}` : ''}`);
  for (const m of casse) console.log(`  ✗ ${m}`);
  for (const m of ajoute.slice(0, 30)) console.log(`  + ${m}`);
  if (ajoute.length > 30) console.log(`  + … et ${ajoute.length - 30} autres`);
}
if (casses && !monte) erreurs.push(`${casses} changement${casses > 1 ? 's' : ''} qui casse${casses > 1 ? 'nt' : ''} un jeu, sans version majeure : passer package.json à ${majeur(V) + 1}.0.0 (et CONTRAT, et CHANGELOG.md), ou garder l'ancien format`);
console.log(erreurs.length ? `\nÉCHEC :\n${erreurs.map(e => '  ' + e).join('\n')}` : `\nle contrat tient : version ${V}${casses ? ` (version majeure : ${casses} changement${casses > 1 ? 's' : ''} qui casse${casses > 1 ? 'nt' : ''}, annoncé${casses > 1 ? 's' : ''})` : ''}`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Le contrat : ${erreurs.length ? '✗' : '✓'} version ${V}${casses ? ` · ${casses} changement(s) qui cassent` : ''}\n${erreurs.map(e => '- ' + e).join('\n')}\n`);
process.exit(erreurs.length ? 1 : 0);
