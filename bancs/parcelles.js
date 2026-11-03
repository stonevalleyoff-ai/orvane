// Orvane — LE BANC DES PARCELLES (bancs/parcelles.js, docs/15)
// Le monde d'Orvane découpé en parcelles, vérifié contre le même monde par biomes :
//  1. le découpage : rien ne se perd, une petite population n'est pas émiettée, les parcelles d'un biome se suivent en
//     boucle, des passages seulement vers les biomes voisins, un aller-retour exact vers la vue par biome, le contrat ;
//  2. les pressions des jeux, données par biome, réparties entre les parcelles sans rien perdre ;
//  3. le monde tourne : autant de lignées, autant de bêtes, pas plus de sursauts qu'avec les biomes ;
//  4. le premier critère de la phase 2 : une espèce introduite sur une parcelle gagne ses voisines de proche en proche ;
//  5. le second : un défrichage sur une parcelle en chasse les bêtes vers les parcelles voisines ;
//  6. le cycle de nuit : le profil demande des parcelles, le monde est découpé une fois, l'instantané publié reste par biome ;
//  7. une fusion dans un monde à parcelles.
//   node bancs/parcelles.js [--cycles 200] [--court] [--par 4]
// --court : 40 cycles. Sortie : 0 si tout passe, 1 sinon.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Parcelles = require(racine('moteur/parcelles.js')), Fusion = require(racine('moteur/fusion.js'));
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; }, court = a.includes('--court');
const CYCLES = court ? 40 : +arg('--cycles', 200), PAR = +arg('--par', 4);
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const vivants = I => I.taxons.filter(t => t.eteint == null);
const total = I => I.taxons.reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0), 0);
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k]; if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const distances = (I, depart) => { const V = new Map(I.biomes.map(b => [b.id, b.voisins || []])), d = new Map([[depart, 0]]), file = [depart];
  while (file.length) { const x = file.shift(); for (const y of V.get(x) || []) if (!d.has(y)) { d.set(y, d.get(x) + 1); file.push(y); } } return d; };

const I0 = lireJ('mondes/orvane/etat.json');
console.log(`\n1. Le découpage : ${I0.monde.nom || I0.monde.id}, cycle ${I0.cycle.n}, ${I0.biomes.length} biomes en ${PAR} parcelles chacun`);
const D = Parcelles.decouper(I0, { par: PAR }), types = new Set(I0.biomes.map(b => b.id)), parType = {};
for (const p of D.biomes) (parType[p.type] ??= []).push(p);
verif(D.biomes.length === I0.biomes.length * PAR && Object.values(parType).every(L => L.length === PAR), `${D.biomes.length} parcelles, ${PAR} par biome`);
verif(Math.abs(total(D) - total(I0)) < 1e-6 * total(I0) && Math.abs(D.biomes.reduce((s, b) => s + b.capacite, 0) - I0.biomes.reduce((s, b) => s + b.capacite, 0)) < 1, `rien ne se perd : ${fx(total(I0), 0)} bêtes, la même capacité`);
const voisinsTypes = new Map(I0.biomes.map(b => [b.id, new Set(b.voisins || [])]));
const enBoucle = Object.values(parType).every(L => L.every(p => L.filter(q => p.voisins.includes(q.id)).length >= Math.min(2, L.length - 1)));
const passagesOk = D.biomes.every(p => p.voisins.every(v => { const q = D.biomes.find(x => x.id === v); return q.type === p.type || voisinsTypes.get(p.type).has(q.type); }));
verif(enBoucle && passagesOk, 'les parcelles d\'un biome se suivent en boucle ; les passages ne mènent qu\'aux biomes voisins');
const d0 = distances(D, D.biomes[0].id), dT = distances({ biomes: I0.biomes }, I0.biomes[0].id);
verif(d0.size === D.biomes.length || dT.size < I0.biomes.length, `d'une parcelle, on atteint toutes les autres (au plus ${Math.max(...d0.values())} pas)`);
const petites = I0.taxons.flatMap(t => t.populations.filter(p => p.effectif < 60).map(p => [t.id, p])), entieres = petites.filter(([id, p]) => D.taxons.find(x => x.id === id).populations.filter(q => q.biome.startsWith(p.biome + Parcelles.SEP) || q.biome === p.biome).length === 1).length;
verif(entieres === petites.length, `une population de moins de 60 bêtes reste entière dans une parcelle (${petites.length} populations)`);
const G = Parcelles.regrouper(D); let ecarts = 0;
for (const t of I0.taxons) { const g = G.taxons.find(x => x.id === t.id);
  for (const p of t.populations) { const q = g.populations.find(x => x.biome === p.biome); if (!q || Math.abs(q.effectif - p.effectif) > 1e-3 * Math.max(1, p.effectif)) ecarts++; }
  for (const ph of t.phenotypes) { const qh = g.phenotypes.find(x => x.id === ph.id); for (const [b, f] of Object.entries(ph.frequence_par_biome || {})) if (Math.abs((qh.frequence_par_biome?.[b] ?? -1) - f) > 1e-3) ecarts++; } }
verif(!ecarts && G.biomes.length === I0.biomes.length, 'regroupé par biome, le monde découpé redonne exactement le monde d\'avant (effectifs, fréquences par biome)');
verif(empreinte(Parcelles.decouper(I0, { par: PAR })) === empreinte(D), 'même monde, même graine : mêmes parcelles');
const erreurs = val(S, { ...G, precedent: undefined }, 'inst').filter(e => !/precedent/.test(e));
verif(!erreurs.length, 'la vue publiée respecte schemas/instantane.schema.json' + (erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' ; ') : ''));

console.log('\n2. Les pressions des jeux, réparties entre les parcelles');
const tP = vivants(I0).find(t => t.populations.filter(p => p.effectif > 1000).length >= 2), bP = tP.populations.slice().sort((x, y) => y.effectif - x.effectif)[0].biome;
const pr = { taxons: { [tP.id]: { [bP]: { retrait: { base: 120, '*': 30 }, contact: { rencontres: 400, danger: 150, aide: 0 }, q: { taille: 1.2 }, deplacement: [{ vers: bP, n: 10 }] } } }, biomes: { [bP]: { habitat: -500 } }, nombre: 3 };
const R = Parcelles.repartir(pr, D), somme = (o, k) => Object.values(R.taxons[tP.id]).reduce((s, x) => s + (k === 'retrait' ? x.retrait.base + x.retrait['*'] : x.contact.rencontres), 0);
verif(Math.abs(somme(0, 'retrait') - 150) < .01 && Math.abs(somme(0, 'contact') - 400) < .01 && Object.keys(R.taxons[tP.id]).every(k => k.startsWith(bP + Parcelles.SEP)), `un retrait et des rencontres sur ${bP} se partagent entre ses parcelles, au total près`);
verif(Math.abs(Object.values(R.biomes).reduce((s, x) => s + x.habitat, 0) + 500) < .01 && Object.values(R.taxons[tP.id]).every(x => x.q.taille === 1.2), 'une perte d\'habitat se partage selon la capacité ; la valeur des bêtes prises (q) suit telle quelle');

// (§222 du jeu) un jeu qui dit la parcelle de ses joueurs : la pression y va tout entière
const laP = bP + Parcelles.SEP + '3', ailleurs = bP + Parcelles.SEP + '1';
const loc = Parcelles.localiser([{ evenements: [{ taxon: tP.id, biome: bP, action: 'prelevement', n: 12, parcelle: laP }, { taxon: tP.id, biome: bP, action: 'rencontre', n: 40, parcelle: laP },
  { taxon: tP.id, biome: bP, action: 'prelevement', n: 5, parcelle: 'savane' + Parcelles.SEP + '1' }, { taxon: tP.id, biome: bP, action: 'habitat_perdu', n: 3, parcelle: ailleurs }] }], D);
const RL = Parcelles.repartir(pr, D, loc), cles = Object.keys(RL.taxons[tP.id] || {});
verif(cles.length === 1 && cles[0] === laP && Math.abs(RL.taxons[tP.id][laP].retrait.base + RL.taxons[tP.id][laP].retrait['*'] - 150) < .01 && Object.keys(RL.biomes).join() === ailleurs,
  `un lot qui dit sa parcelle (${laP}) y pose toute la chasse, et le défrichage dans la sienne (${ailleurs}) ; une parcelle d'un autre biome est ignorée`);

console.log(`\n3. Le monde tourne : ${CYCLES} cycles, par parcelles et par biomes`);
const tourner = (I, n, pressions) => { let J = I, sauts = 0, mesures = 0, prev = null, sep = 0; const t0 = Date.now();
  for (let k = 0; k < n; k++) { J = Orvane.cycle(J, typeof pressions === 'function' ? pressions(k, J) : {}, { duree_ms: 0 }); sep += J.evenements.filter(e => e.type === 'separation').length;
    const V = Parcelles.regrouper(J), cur = new Map(); for (const t of vivants(V)) for (const p of t.populations) if (p.effectif >= 20) cur.set(t.id + '@' + p.biome, p.effectif);
    if (prev && k > 3) for (const [key, v] of cur) { const u = prev.get(key); if (u) { mesures++; if (Math.abs(v - u) / u > .5) sauts++; } } prev = cur; }
  return { J, sauts: sauts / Math.max(1, mesures), sep, ms: (Date.now() - t0) / n }; };
const B = tourner(I0, CYCLES), P = tourner(D, CYCLES);
verif(vivants(P.J).length >= vivants(B.J).length - 3, `autant de lignées : ${vivants(P.J).length} vivantes par parcelles, ${vivants(B.J).length} par biomes (${P.sep} et ${B.sep} séparations)`);
verif(Math.abs(total(P.J) / total(B.J) - 1) < .25, `autant de bêtes, à un quart près : ${fx(total(P.J) / 1e6)} millions par parcelles, ${fx(total(B.J) / 1e6)} par biomes`);
verif(P.sauts <= Math.max(.005, 1.5 * B.sauts), `pas plus de sursauts : ${(P.sauts * 100).toFixed(2)} % des populations varient de plus de moitié d'un cycle à l'autre (${(B.sauts * 100).toFixed(2)} % par biomes)`);
verif(P.ms < 8 * B.ms, `le cycle prend ${fx(P.ms / 1000, 2)} s par parcelles, ${fx(B.ms / 1000, 2)} s par biomes`);

console.log('\n4. Une espèce introduite gagne ses voisines de proche en proche');
// un petit monde : une prairie en huit parcelles, une seule espèce, posée sur la première
const prairie = lireJ('moteur/biomes-universels.json'), bPr = (Array.isArray(prairie) ? prairie : prairie.biomes).find(b => b.id === 'prairie');
const brouteur = vivants(I0).filter(t => t.plan.regime === 'herbivore' && t.populations.some(p => p.biome === 'prairie')).sort((x, y) => (y.plan.portee || 0) - (x.plan.portee || 0))[0];
const petit = { ...JSON.parse(JSON.stringify(I0)), biomes: [{ ...JSON.parse(JSON.stringify(bPr)), voisins: [], capacite: bPr.capacite / 10, capacite_base: bPr.capacite / 10 }],
  taxons: [{ ...JSON.parse(JSON.stringify(brouteur)), parent: null, populations: [{ ...JSON.parse(JSON.stringify(brouteur.populations.find(p => p.biome === 'prairie'))), effectif: 200 }] }], evenements: [] };
delete petit.monde.fusions;
const Pp = Parcelles.decouper(petit, { par: 8, graine: 3 }), depart = Pp.biomes[0].id;
for (const t of Pp.taxons) t.populations = [{ ...t.populations[0], biome: depart, effectif: 200 }];
const dist = distances(Pp, depart), arrivee = new Map([[depart, 0]]); let J = Pp;
for (let k = 1; k <= 300 && arrivee.size < Pp.biomes.length; k++) { J = Orvane.cycle(J, {}, { duree_ms: 0 }); for (const p of J.taxons[0].populations) if (p.effectif >= 1 && !arrivee.has(p.biome)) arrivee.set(p.biome, k); }
const parD = {}; for (const [b, k] of arrivee) if (b !== depart) (parD[dist.get(b)] ??= []).push(k);
const moy = Object.fromEntries(Object.entries(parD).map(([d, L]) => [d, L.reduce((s, x) => s + x, 0) / L.length]));
const croissant = Object.keys(moy).map(Number).sort((x, y) => x - y).every((d, i, L) => i === 0 || moy[d] > moy[L[i - 1]]);
verif(arrivee.size === Pp.biomes.length && croissant, `${brouteur.nom}, posé sur une parcelle de prairie, gagne les ${Pp.biomes.length - 1} autres, d'autant plus tard qu'elles sont loin : ` + Object.entries(moy).map(([d, m]) => `${d} pas → cycle ${fx(m, 0)}`).join(', '));

console.log('\n5. Un défrichage local déplace les populations');
// les quatre cinquièmes d'une parcelle de prairie défrichés d'un coup : ses bêtes fuient vers ses voisines, qui les
// absorbent en quelques cycles ; la parcelle se refait ensuite lentement (la biomasse, contre un témoin non défriché)
const cible = 'prairie' + Parcelles.SEP + '2', capP = D.biomes.find(b => b.id === cible).capacite, voisinsP = D.biomes.find(b => b.id === cible).voisins;
const ici = (I, ids) => I.taxons.reduce((s, t) => s + t.populations.filter(p => ids.includes(p.biome)).reduce((x, p) => x + p.effectif * (t.plan.masse_kg || 1), 0), 0);
const N5 = court ? 20 : 30; let Ta = D, Co = D; const serie = {};
for (let k = 1; k <= N5; k++) { Ta = Orvane.cycle(Ta, {}, { duree_ms: 0 }); Co = Orvane.cycle(Co, k === 1 ? { biomes: { [cible]: { habitat: -.8 * capP } } } : {}, { duree_ms: 0 });
  if (k === 3 || k === N5) serie[k] = { P: ici(Co, [cible]) / ici(Ta, [cible]), V: ici(Co, voisinsP) / ici(Ta, voisinsP) }; }
verif(serie[3].P < .6 && serie[3].V > 1.02, `les quatre cinquièmes de ${cible} défrichés : trois cycles plus tard, elle n'a plus que ${fx(serie[3].P * 100, 0)} % de sa biomasse, et ses ${voisinsP.length} voisines ${fx((serie[3].V - 1) * 100, 1)} % de plus`);
verif(serie[N5].P > serie[3].P && Math.abs(serie[N5].V - 1) < .03, `${N5} cycles plus tard, les voisines ont absorbé les fuyards (${fx((serie[N5].V - 1) * 100, 1)} %) et la parcelle se refait (${fx(serie[N5].P * 100, 0)} %)`);

console.log('\n6. Le cycle de nuit');
const dossier = racine('mondes/.banc-parcelles'), nom = '.banc-parcelles';
try {
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(path.join(dossier, 'lots'), { recursive: true });
  for (const f of ['etat.json', 'generation-0.json', 'tampon.json', 'jeux.json']) fs.copyFileSync(racine('mondes/orvane/' + f), path.join(dossier, f));
  const profil = lireJ('mondes/orvane/profil.json'); profil.monde.id = nom; profil.monde.parcelles = { par: PAR }; delete profil.monde.fusions;
  fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil));
  fs.writeFileSync(path.join(dossier, 'lots', 'essai.json'), JSON.stringify({ orvane: '0.1', monde: I0.monde.id, instantane: I0.cycle.n, jeu: 'stone-valley', source: { jeu: 'stone-valley', compte: 'h:banc' },
    periode: { debut: '2026-10-30T01:00:00Z', fin: '2026-10-30T02:00:00Z' }, evenements: [{ taxon: tP.id, biome: bP, action: 'rencontre', n: 40 }, { taxon: tP.id, biome: bP, action: 'prelevement', n: 12, parcelle: bP + Parcelles.SEP + '2' }] }));
  const out1 = execFileSync('node', [racine('hebergement/cycle.js'), nom, '--sans-reseau'], { encoding: 'utf8' });
  const E1 = JSON.parse(fs.readFileSync(path.join(dossier, 'etat.json'), 'utf8')), I1 = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
  verif(/parcelles : \d+ biomes découpés/.test(out1) && E1.biomes.length === I0.biomes.length * PAR, `le profil demande des parcelles : l'état tourne sur ${E1.biomes.length} parcelles`);
  const e1 = val(S, I1, 'inst');
  verif(I1.biomes.length === I0.biomes.length && (I1.parcelles || []).length === E1.biomes.length && !e1.length && I1.cycle.pressions_recues > 0, `l'instantané publié reste par biome (${I1.biomes.length}), donne ses ${I1.parcelles.length} parcelles, respecte le contrat, et a lu le lot du jeu (${I1.cycle.pressions_recues} événements)`);
  const H = JSON.parse(fs.readFileSync(path.join(dossier, 'historique.json'), 'utf8'));
  verif(H.at(-1).biomes.length === I0.biomes.length && H.at(-1).taxons.every(t => t.populations.every(p => types.has(p.biome))), 'l\'historique, que lit l\'observatoire, reste par biome');
  const out2 = execFileSync('node', [racine('hebergement/cycle.js'), nom, '--sans-reseau'], { encoding: 'utf8' }), E2 = JSON.parse(fs.readFileSync(path.join(dossier, 'etat.json'), 'utf8'));
  verif(!/découpés/.test(out2) && E2.biomes.length === E1.biomes.length && E2.cycle.n === E1.cycle.n + 1, 'la nuit suivante, le monde n\'est pas redécoupé : il continue');
} finally { fs.rmSync(dossier, { recursive: true, force: true }); }

console.log('\n7. Une fusion dans un monde à parcelles');
const source = lireJ(lireJ('mondes/marin/profil.json').monde.amorce), F = Fusion.fusionner(D, source, { id: 'banc-parcelles', part: .5 });
const arr = F.inst.taxons.filter(t => t.origine), Fb = Fusion.fusionner(I0, source, { id: 'banc-parcelles', part: .5 }).inst.taxons.filter(t => t.origine);
const effA = L => L.reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0), 0);
verif(arr.length === Fb.length && arr.every(t => t.populations.every(p => F.inst.biomes.some(b => b.id === p.biome))) && Math.abs(effA(arr) / effA(Fb) - 1) < .01,
  `les ${arr.length} lignées de la mer arrivent réparties entre les parcelles de leurs biomes, avec les mêmes effectifs qu'à un monde par biomes`);
const GF = Parcelles.regrouper(F.inst);
verif(!val(S, GF, 'inst').length && GF.evenements.filter(e => e.type === 'apparition').every(e => types.has(e.biome)), 'regroupée, la fusion respecte le contrat ; ses arrivées sont annoncées par biome');

console.log(ok ? '\nTOUT PASSE' : '\nÉCHEC');
process.exit(ok ? 0 : 1);
