// Orvane — LE BANC DE LA FUSION (bancs/fusion.js, docs/14)
// La fusion d'un monde dans un autre, vérifiée sur les vrais mondes : la mer d'Orvane (mondes/marin) versée dans le
// monde d'Orvane (mondes/orvane), et comparée à un témoin sans fusion.
//  1. la fusion elle-même : qui arrive, où, avec quels effectifs ; des noms tous distincts ; la cible intacte ; la trace ;
//     une fusion n'est jamais faite deux fois ; le déterminisme ; le contrat (schemas/instantane.schema.json) ;
//  2. deux mondes ne s'hybrident pas : aucune lignée arrivée n'est apparentée à une lignée de la cible ;
//  3. ce que le monde en fait, N cycles plus tard : les arrivées tiennent, la cible ne perd rien de plus que le témoin, les
//     eaux sont plus riches, aucune zone hybride entre mondes, pas plus de sursauts que sans fusion ;
//  4. le cycle de nuit : l'ordre du profil est appliqué une fois, et le journal dit les arrivées.
//   node bancs/fusion.js [--cycles 240] [--court] [--cible orvane] [--source marin] [--part 0.5]
// --court : 60 cycles. Sortie : 0 si tout passe, 1 sinon.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Fusion = require(racine('moteur/fusion.js'));
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; }, court = a.includes('--court');
const CYCLES = court ? 60 : +arg('--cycles', 240), CIBLE = arg('--cible', 'orvane'), SOURCE = arg('--source', 'marin'), PART = +arg('--part', .5);
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
const cible = lireJ(`mondes/${CIBLE}/etat.json`), source = lireJ(lireJ(`mondes/${SOURCE}/profil.json`).monde.amorce);
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const vivants = I => I.taxons.filter(t => t.eteint == null);
const mot = t => String(t.nom || t.id).split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const EAU = new Set(cible.biomes.filter(b => ['aquatique', 'marin', 'amphibie'].includes(b.milieu)).map(b => b.id));

// le contrat : un petit validateur (types, enums, requis, propriétés en trop), comme celui du banc de Stone Valley
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k]; if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };

console.log(`\n1. La fusion : ${source.monde.nom || SOURCE} dans ${cible.monde.nom || CIBLE} (cycle ${cible.cycle.n}), part ${PART}`);
const avant = empreinte(cible);
const r = Fusion.fusionner(cible, source, { id: 'banc', part: PART }), F = r.inst, n = cible.cycle.n;
const arrivees = F.taxons.filter(t => t.origine), idsCible = new Set(cible.taxons.map(t => t.id));
const attendues = source.taxons.filter(t => t.eteint == null && t.populations.some(p => EAU.has(p.biome) && Math.round(p.effectif * PART) >= 1)).length;
verif(empreinte(cible) === avant, 'la cible passée à la fusion n\'est pas modifiée (une copie est rendue)');
verif(arrivees.length === attendues && arrivees.length === r.bilan.lignees, `les ${attendues} lignées vivantes de la source qui ont au moins un individu à venir arrivent toutes (${arrivees.length})`);
const ids = F.taxons.map(t => t.id), motsCible = new Set(cible.taxons.map(mot)), motsArr = arrivees.map(mot);
verif(new Set(ids).size === ids.length && arrivees.every(t => !idsCible.has(t.id)), `les identifiants restent uniques (${r.bilan.renommees} lignée(s) renommée(s))`);
verif(motsArr.every(m => !motsCible.has(m)) && new Set(motsArr).size === motsArr.length, 'aucune arrivée ne porte le nom d\'une lignée de la cible (ni d\'une autre arrivée)');
// (le renommage, sur une source dont deux noms sont déjà pris dans la cible)
const prise = JSON.parse(JSON.stringify(source)), vA = vivants(prise).filter(t => t.populations.some(p => EAU.has(p.biome) && Math.round(p.effectif * PART) >= 1)), cT = vivants(cible);
vA[0].id = cT[0].id; vA[1].nom = cT[1].nom.split(' ')[0] + ' ' + vA[1].nom.split(' ').slice(1).join(' ');
const rp = Fusion.fusionner(cible, prise, { id: 'banc-noms', part: PART }), arrP = rp.inst.taxons.filter(t => t.origine);
verif(rp.bilan.renommees === 2 && arrP.every(t => !idsCible.has(t.id) && !motsCible.has(mot(t))) && arrP.filter(t => t.parent).every(t => arrP.some(x => x.id === t.parent)),
  'un identifiant ou un nom déjà pris dans la cible est remplacé par un nom neuf, et les parents suivent');
verif(cible.taxons.every(t => empreinte(t) === empreinte(F.taxons.find(x => x.id === t.id))), 'les lignées de la cible sont exactement celles d\'avant');
verif(arrivees.every(t => t.apparu === n && t.origine.monde === source.monde.id && t.origine.fusion === 'banc'), 'une arrivée apparaît au cycle de la fusion, et garde son monde d\'origine');
verif(arrivees.every(t => t.parent === null || arrivees.some(x => x.id === t.parent)), 'son parent est une autre arrivée, ou aucun : l\'arbre de la source garde sa racine');
const effOk = arrivees.every(t => { const s = source.taxons.find(x => x.id === t.origine.id); return t.populations.every(p => p.effectif >= 1 && p.depuis === n && p.effectif === Math.round(s.populations.find(q => q.biome === p.biome).effectif * PART)); });
verif(effOk, `chaque population arrive avec ${PART * 100} % de son effectif, installée du cycle de la fusion`);
verif((F.monde.fusions || []).length === (cible.monde.fusions || []).length + 1 && F.monde.fusions.at(-1).lignees === arrivees.length, 'le monde garde la trace de la fusion (monde.fusions)');
verif(r.evenements.length === arrivees.length && r.evenements.every(e => e.type === 'apparition'), 'une « apparition » au journal par lignée arrivée');
const r2 = Fusion.fusionner(F, source, { id: 'banc', part: PART });
verif(r2.bilan.deja && empreinte(r2.inst) === empreinte(F), 'la même fusion, demandée deux fois, n\'est faite qu\'une fois');
verif(empreinte(Fusion.fusionner(cible, source, { id: 'banc', part: PART }).inst) === empreinte(F), 'mêmes mondes, mêmes options : même résultat, au caractère près');
const recif = Fusion.fusionner(cible, source, { id: 'banc-recif', part: PART, biomes: ['recif'] }).inst.taxons.filter(t => t.origine);
verif(recif.length > 0 && recif.every(t => t.populations.every(p => p.biome === 'recif')), `restreinte au récif, la fusion n'apporte que des populations du récif (${recif.length} lignées)`);
const erreurs = val(S, F, 'inst');
verif(!erreurs.length, 'le monde fusionné respecte schemas/instantane.schema.json' + (erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' ; ') : ''));

console.log('\n2. Deux mondes ne s\'hybrident pas');
const T = new Map(F.taxons.map(t => [t.id, t])); let paires = 0, apparentees = 0;
for (const x of vivants(cible)) for (const y of arrivees) { paires++; if (Orvane.parente(x, y, T)) apparentees++; }
verif(apparentees === 0 && arrivees.every(y => vivants(cible).every(x => Orvane.isolement(x, y, T, n) === 1)), `aucune des ${paires} paires (une lignée de la cible, une arrivée) n'est apparentée : leur isolement est total`);

console.log(`\n3. ${CYCLES} cycles plus tard, contre un témoin sans fusion`);
const origineDe = (I, id) => { const M = new Map(I.taxons.map(t => [t.id, t])); let t = M.get(id); const vus = new Set();
  while (t && !t.origine && t.parent && !vus.has(t.id)) { vus.add(t.id); t = M.get(t.parent); } return t?.origine ? 'source' : 'cible'; };
const tourner = I0 => { let I = I0, sauts = 0, mesures = 0, prev = null, hyb = [];
  for (let k = 0; k < CYCLES; k++) { I = Orvane.cycle(I, {}, { duree_ms: 0 });
    for (const e of I.evenements) if (e.type === 'hybridation') { const avec = (/avec ([^\s:]+)/.exec(e.detail || '') || [])[1]; if (avec) hyb.push([e.taxon, avec, I]); }
    const cur = new Map(); for (const t of vivants(I)) for (const p of t.populations) if (p.effectif >= 20) cur.set(t.id + '@' + p.biome, p.effectif);
    if (prev && k > 5) for (const [key, v] of cur) { const u = prev.get(key); if (u) { mesures++; if (Math.abs(v - u) / u > .5) sauts++; } }
    prev = cur; }
  return { I, sauts: sauts / Math.max(1, mesures), hyb }; };
const temoin = tourner(JSON.parse(JSON.stringify(cible))), fusion = tourner(F);
const perdues = R => [...idsCible].filter(id => cible.taxons.find(t => t.id === id).eteint == null && R.I.taxons.find(t => t.id === id)?.eteint != null).length;
const tiennent = arrivees.filter(t => fusion.I.taxons.find(x => x.id === t.id)?.eteint == null).length;
verif(tiennent >= .8 * arrivees.length, `les arrivées tiennent : ${tiennent} sur ${arrivees.length} vivent encore`);
verif(perdues(fusion) <= perdues(temoin) + 1, `la cible ne perd pas plus de lignées qu'avec le témoin (${perdues(fusion)} éteintes, ${perdues(temoin)} sans fusion)`);
const parBiome = I => Object.fromEntries([...EAU].map(b => [b, vivants(I).filter(t => t.populations.some(p => p.biome === b && p.effectif >= 1)).length]));
const pt = parBiome(temoin.I), pf = parBiome(fusion.I);
const mers = ['recif', 'large', 'mer-froide', 'abysses'].filter(b => EAU.has(b));
verif(mers.every(b => pf[b] >= 2 * pt[b]), 'les mers ont au moins deux fois plus de lignées : ' + mers.map(b => `${b} ${pt[b]} → ${pf[b]}`).join(', '));
const entre = fusion.hyb.filter(([x, y, I]) => origineDe(I, x) !== origineDe(I, y));
verif(!entre.length, `aucune zone hybride entre lignées des deux mondes (${fusion.hyb.length} zones hybrides en tout, chacune dans son monde)`);
verif(fusion.sauts <= Math.max(.005, temoin.sauts * 1.5), `pas plus de sursauts qu'avant : ${(fusion.sauts * 100).toFixed(2)} % des populations varient de plus de moitié d'un cycle à l'autre (${(temoin.sauts * 100).toFixed(2)} % sans fusion)`);

console.log('\n4. Le cycle de nuit');
const dossier = racine('mondes/.banc-fusion'), dossierNom = '.banc-fusion';
try {
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier);
  for (const f of ['etat.json', 'generation-0.json', 'tampon.json', 'jeux.json']) if (fs.existsSync(racine(`mondes/${CIBLE}/${f}`))) fs.copyFileSync(racine(`mondes/${CIBLE}/${f}`), path.join(dossier, f));
  const profil = lireJ(`mondes/${CIBLE}/profil.json`); profil.monde.id = dossierNom; profil.monde.fusions = [{ id: 'banc-nuit', source: `mondes/${SOURCE}/amorce.json`, part: PART }];
  fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil));
  const out1 = execFileSync('node', [racine('hebergement/cycle.js'), dossierNom, '--sans-reseau'], { encoding: 'utf8' });
  const I1 = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
  const app = I1.evenements.filter(e => e.type === 'apparition' && /fusion banc-nuit/.test(e.detail || ''));
  verif(/fusion banc-nuit : \d+ lignées/.test(out1) && I1.taxons.filter(t => t.origine?.fusion === 'banc-nuit').length === arrivees.length, `l'ordre du profil est appliqué avant le cycle : ${arrivees.length} lignées arrivent`);
  verif(app.length === arrivees.length, `le journal du cycle publié dit les ${app.length} arrivées`);
  const out2 = execFileSync('node', [racine('hebergement/cycle.js'), dossierNom, '--sans-reseau'], { encoding: 'utf8' });
  const I2 = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
  verif(!/fusion banc-nuit/.test(out2) && I2.monde.fusions.filter(x => x.id === 'banc-nuit').length === 1 && I2.cycle.n === I1.cycle.n + 1, 'la nuit suivante, la fusion n\'est pas refaite : le monde tourne normalement');
} finally { fs.rmSync(dossier, { recursive: true, force: true }); }

console.log(ok ? '\nTOUT PASSE' : '\nÉCHEC');
process.exit(ok ? 0 : 1);
