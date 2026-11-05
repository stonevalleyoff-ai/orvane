// Orvane — LE BANC DES CORPS ASSEMBLÉS (bancs/corps.js, docs/24)
//  1. le tirage du cycle ne bouge pas : une lignée qui ne vit pas dans les arbres dérive exactement comme avant ;
//  2. la vie dans les arbres donne des mains ; un porteur de mains se redresse, et debout devient bipède ; ailleurs, jamais de mains ;
//  3. les mains servent : elles cueillent dans les arbres ;
//  4. le monde d'Orvane qui se sépare vite : des simiens naissent chez les grimpeurs des forêts, aucun dans les terres sèches ; le contrat.
//   node bancs/corps.js [--court]
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const CORPS = require(racine('moteur/corps.js')), Flore = require(racine('moteur/flore.js'));
const court = process.argv.includes('--court');
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const rng = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
const compte = R => { const f = () => { f.n++; return R(); }; f.n = 0; return f; };
const mains = c => c.organes.some(o => o.type === 'mains');
const jungle = { id: 'jungle', milieu: 'terrestre', axes: { temperature: .8, humidite: .85, altitude: .2, lumiere: .4, couvert: .95 } };
const savane = { id: 'savane', milieu: 'terrestre', axes: { temperature: .75, humidite: .35, altitude: .2, lumiere: .85, couvert: .25 } };
const desert = { id: 'desert', milieu: 'terrestre', axes: { temperature: .9, humidite: .05, altitude: .2, lumiere: .95, couvert: .02 } };
const grimpeur = { regime: 'omnivore', masse_kg: 8, taille_m: .6, locomotion: ['marche', 'grimpe'] }, marcheur = { regime: 'omnivore', masse_kg: 8, taille_m: .6, locomotion: ['marche', 'course'] };
const base = CORPS.normaliser({ forme: 'quadrupede' });

console.log('1. Le tirage du cycle');
{ let egal = true; for (let k = 0; k < 300; k++) { const a = compte(rng(k + 1)), b = compte(rng(k + 1)); CORPS.deriver(base, grimpeur, jungle, a, 1); CORPS.deriver(base, grimpeur, savane, b, 1); if (a.n !== b.n) egal = false; }
  verif(egal, 'une lignée des arbres et une lignée du sol tirent autant de fois dans le hasard du cycle : les mains ont leur hasard à elles, et le reste du monde ne bouge pas');
}

console.log('2. Des mains, une posture');
{ const un = Array.from({ length: 400 }, (_, k) => CORPS.deriver(base, grimpeur, jungle, rng(k + 7), 1)), part = un.filter(mains).length / un.length;
  const sol = Array.from({ length: 400 }, (_, k) => CORPS.deriver(base, marcheur, desert, rng(k + 7), 1)).filter(mains).length;
  verif(part > .15 && part < .35 && sol === 0, `un omnivore grimpeur de 8 kg qui se sépare dans la jungle : ${fx(part * 100)} % des lignées filles ont des mains ; au désert, un marcheur, jamais (${sol} sur 400)`);
  // une lignée qui se sépare de génération en génération : dans les arbres, puis descendue en terrain ouvert
  let debout = 0, posture = 0, n = 0;
  for (let k = 0; k < 200; k++) { const R = rng(1000 + k); let c = base;
    for (let g = 0; g < 12; g++) c = CORPS.deriver(c, grimpeur, jungle, R, 1);
    if (!mains(c)) continue; n++; posture += c.posture;
    for (let g = 0; g < 8; g++) c = CORPS.deriver(c, { ...marcheur, locomotion: ['marche', 'course', 'grimpe'] }, savane, R, 1);
    if (c.forme === 'bipede' && mains(c)) debout++; }
  verif(n > 150 && posture / n > .3 && debout / n > .3, `douze séparations dans les arbres : ${n} lignées sur 200 ont des mains, et se dressent (posture ${fx(posture / n, 2)}) ; huit de plus dans la savane : ${fx(debout / n * 100)} % sont debout (« ${CORPS.decrire({ ...base, forme: 'bipede', pattes: 2, posture: 1, organes: [{ type: 'mains', taille: .6, nombre: 2, place: 'avant', forme: 'agiles' }] })} »)`);
}

console.log('3. Les mains servent');
{ const h = { ...marcheur, taille_m: .6, corps: base }, hm = { ...h, corps: { ...base, organes: [{ type: 'mains', taille: .6, nombre: 2, place: 'avant', forme: 'agiles' }] } };
  verif(Flore.atteinte(h, [], 'arbre') < .2 && Flore.atteinte(hm, [], 'arbre') === 1, `devant un arbre, un marcheur de 60 cm en atteint ${fx(Flore.atteinte(h, [], 'arbre') * 100)} % ; avec des mains, tout (docs/17)`);
}

console.log('4. Le monde d\'Orvane qui se sépare vite, le contrat');
{ // le monde d'Orvane, avec les règles de séparation de la genèse (des lignées naissent dix fois plus souvent), pendant 100 cycles
  const Orvane = require(racine('moteur/orvane.js')), R0 = JSON.parse(JSON.stringify(Orvane.REGLES)), N = court ? 60 : 100; let I = lireJ('mondes/orvane/etat.json');
  Object.assign(Orvane.REGLES, { separation: { ...R0.separation, cycles: 15, effectif: 40, distance: .8, chance: .03 }, derive: { ...R0.derive, corps: 2.5 } });
  try { for (let k = 0; k < N; k++) I = Orvane.cycle(I, {}, { duree_ms: 0 }); } finally { Object.assign(Orvane.REGLES, R0); }
  const V = I.taxons.filter(t => !t.eteint), sim = V.filter(t => mains(CORPS.normaliser(t.plan.corps))), ou = t => t.populations.slice().sort((a, b) => b.effectif - a.effectif)[0].biome;
  const n0 = lireJ('mondes/orvane/etat.json').cycle.n, nes = V.filter(t => t.apparu > n0).length, sec = sim.filter(t => ['desert', 'desert-froid', 'steppe'].includes(ou(t))).length;
  console.log(`     ${nes} lignées nées en ${N} cycles ; à mains : ${sim.map(t => `${t.nom} (${t.plan.masse_kg} kg, ${t.plan.regime}, ${CORPS.decrire(t.plan.corps).split(',')[0]})`).join(' ; ') || 'aucune'}`);
  verif(sim.length >= 1 && sec === 0 && sim.every(t => (t.plan.locomotion || []).includes('grimpe')), `des lignées à mains naissent d'elles-mêmes chez les grimpeurs des forêts (${sim.length} sur ${nes} lignées nées), aucune dans les terres sèches`);
  const e = val(S.properties.taxons.items.properties.plan.properties.corps, CORPS.normaliser(sim[0]?.plan.corps || base), 'corps');
  verif(!e.length, 'une silhouette à mains et à posture respecte schemas/instantane.schema.json' + (e.length ? ' : ' + e.join(' ; ') : ''));
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
