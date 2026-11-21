// Orvane — LE BANC DES SOUCHES ET DES SYMBIOSES (bancs/pathogenes.js, docs/18)
//  1. le jour un : un monde sans souches tourne exactement comme le moteur sans moteur/pathogenes.js ;
//  2. un monde à souches tient : des souches naissent, circulent, s'éteignent ; autant de lignées, autant de bêtes ; chaque
//     événement de souche dit laquelle et ce qui lui arrive (souche, nature), et son texte la même chose (une extinction réelle : 5 bis) ;
//  3. une souche passe d'une parcelle à l'autre, de proche en proche ; la vue par biome publie l'infection de chaque parcelle,
//     dont celle du biome est la moyenne ; les aides de lecture (souches, souche, infection, infectes, foyers, evenements) ;
//  4. elle prend chez les lignées proches, pas chez les lointaines ; jamais chez les machines ni les plantes ;
//  5. l'immunité : une seconde vague dans une population guérie est plus petite ;
//  6. le compromis : une souche moyennement virulente gagne plus d'hôtes que la plus douce et que la plus virulente ;
//  7. la pollinisation : sans ses butineurs, la prairie fleurie repousse moins ;
//  8. le contrat, le cycle de nuit.
//   node bancs/pathogenes.js [--court]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Pa = require(racine('moteur/pathogenes.js')), Flore = require(racine('moteur/flore.js')), Parcelles = require(racine('moteur/parcelles.js')), Syn = require(racine('moteur/synthetique.js'));
const Chronique = require(racine('moteur/chronique.js'));
const court = process.argv.includes('--court'), CYCLES = court ? 60 : 120;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const vivants = I => I.taxons.filter(t => !t.eteint), tot = I => somme(vivants(I).map(t => somme(t.populations.map(p => p.effectif))));
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane d'avant ses souches — sa génération 0 — : etat.json les a éveillées le 4 novembre)
const I0 = lireJ('mondes/orvane/generation-0.json'), t0 = Date.now();
// une souche posée à la main dans une population
const poser = (I, tid, bid, v, i = .05, id = 'souche-essai') => { I = clone(I); if (!I.monde.pathogenes) I = Pa.eveiller(I).inst;
  I.monde.pathogenes.souches[id] = { nom: 'Essaiose', virulence: v, transmission: Pa.transmission(v), origine: tid, apparu: I.cycle.n, hotes: [tid] };
  const p = I.taxons.find(t => t.id === tid).populations.find(q => q.biome === bid); p.infection = { ...(p.infection || {}), [id]: { i, r: 0 } }; return I; };
const infectes = (I, id = 'souche-essai', f = () => true) => somme(vivants(I).filter(f).flatMap(t => t.populations.map(p => (p.infection?.[id]?.i || 0) * p.effectif)));

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './pathogenes.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, B = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); B = mod.exports.cycle(B, {}); }
  verif(empreinte(A) === empreinte(B), 'un monde sans souches tourne exactement comme le moteur sans elles');
}

console.log('2. Un monde à souches');
let W = Pa.eveiller(I0).inst, T = clone(I0); const nes = [], eteintes = [], natures = {}, fautes = [];
// (docs/18) un événement de souche dit laquelle (souche) et ce qui lui arrive (nature) ; son texte seul (un instantané d'avant ces
// champs, lu par la chronique) dit la même chose ; une épidémie d'avant les souches ne dit ni l'un ni l'autre
// une extinction dit aussi le nom de la souche, ses hôtes, et les lieux où elle avait encore des malades au début du cycle (triés)
const derniers = (av, s) => [...new Set(av.taxons.flatMap(t => t.populations.filter(p => (p.infection?.[s]?.i || 0) > 0).map(p => p.biome)))].sort();
const lire = (e, av, ap, F = fautes, N = natures) => { const S = ap.monde.pathogenes.souches, SA = av.monde.pathogenes.souches, x = Chronique.natureDe((({ souche, nature, nom, lieux, hotes, ...r }) => r)(e), av, ap);
  if (!e.souche) { if (e.nature || x) F.push(`sans souche : ${e.detail}`); return; }
  N[e.nature] = (N[e.nature] || 0) + 1;
  const bon = e.nature === 'extinction' ? e.type === 'remission' && !S[e.souche] && SA[e.souche] && e.nom === SA[e.souche].nom && JSON.stringify(e.hotes) === JSON.stringify(SA[e.souche].hotes) && e.lieux.length && JSON.stringify(e.lieux) === JSON.stringify(derniers(av, e.souche))
    : e.type === 'epidemie' && S[e.souche] && (e.nature !== 'saut_hote' || S[e.souche].hotes.includes(e.taxon)) && (e.nature !== 'naissance' || (S[e.souche].apparu === ap.cycle.n && S[e.souche].origine === e.taxon));
  // (le texte seul, relu par la chronique, désigne la même souche, même quand une autre porte son nom)
  if (!bon || !Pa.NATURES.includes(e.nature) || x?.nature !== e.nature || x?.souche !== e.souche) F.push(`${e.nature} ${e.souche} : ${e.detail}`); };
for (let k = 0; k < CYCLES; k++) { const av = W; W = Orvane.cycle(W, {}); T = Orvane.cycle(T, {});
  for (const e of W.evenements) { if (/souche nouvelle/.test(e.detail || '')) nes.push(e); if (/la souche .* s'éteint/.test(e.detail || '')) eteintes.push(e);
    if (e.type === 'epidemie' || e.type === 'remission') lire(e, av, W); } }
{ const Sx = Object.values(W.monde.pathogenes.souches), hotes = Sx.map(s => s.hotes.length).sort((a, b) => a - b);
  verif(nes.length >= 3 && Sx.length >= 2, `en ${CYCLES} cycles, ${nes.length} souches naissent dans des populations entassées, ${eteintes.length} s'éteignent ; ${Sx.length} circulent à la fin, sur ${hotes.join(', ')} lignées chacune (« ${nes[0]?.detail} »)`);
  verif(Math.abs(vivants(W).length / vivants(T).length - 1) < .06 && Math.abs(tot(W) / tot(T) - 1) < .1, `le monde tient : ${vivants(W).length} lignées et ${fx(tot(W) / 1e6, 1)} millions de bêtes, contre ${vivants(T).length} et ${fx(tot(T) / 1e6, 1)} millions avec les épidémies d'avant`);
  verif(!fautes.length && (natures.naissance || 0) === nes.length && (natures.extinction || 0) === eteintes.length && natures.saut_hote > 0,
    `chaque événement de souche dit laquelle et ce qui lui arrive : ${Object.entries(natures).map(([k, v]) => `${v} ${k}`).join(', ')} ; son texte seul, la même chose (une extinction réelle : plus bas, 5 bis)` + (fautes.length ? ` ; ${fautes.length} fautes : ${fautes.slice(0, 2).join(' ; ')}` : ''));
}

console.log("3. D'une parcelle à l'autre");
{ let P = Parcelles.decouper(I0, { par: 4 }); const cible = vivants(P).filter(t => t.plan.regime === 'herbivore').map(t => [t, t.populations.filter(p => p.biome.startsWith('prairie~'))]).filter(([, L]) => L.length === 4).sort((x, y) => somme(y[1].map(p => p.effectif)) - somme(x[1].map(p => p.effectif)))[0][0];
  P = poser(P, cible.id, 'prairie~1', .12); const d = { 'prairie~1': 0 }, file = ['prairie~1']; while (file.length) { const x = file.shift(); for (const v of P.biomes.find(b => b.id === x).voisins) if (v.startsWith('prairie~') && d[v] == null) { d[v] = d[x] + 1; file.push(v); } }
  const arrivee = {}; for (let k = 1; k <= (court ? 25 : 40); k++) { P = Orvane.cycle(P, {}); for (const p of P.taxons.find(t => t.id === cible.id).populations) if (p.biome.startsWith('prairie~') && (p.infection?.['souche-essai']?.i || 0) >= .01 && arrivee[p.biome] == null) arrivee[p.biome] = k; }
  const L = Object.entries(d).filter(([b]) => b !== 'prairie~1'), okOrdre = L.every(([b, x]) => arrivee[b] != null) && L.every(([b, x]) => L.every(([c, y]) => x <= y || arrivee[b] >= arrivee[c]));
  verif(okOrdre, `${cible.nom}, infecté dans une parcelle de prairie : la souche gagne les autres de proche en proche (` + L.map(([b, x]) => `${b} à ${x} pas : cycle ${arrivee[b] ?? '—'}`).join(', ') + ')');
  // (docs/15, 18) la vue par biome publie l'infection de chaque parcelle, à côté de son effectif ; celle du biome en est la moyenne
  const V = Parcelles.regrouper(P), tv = V.taxons.find(t => t.id === cible.id), pv = tv.populations.find(p => p.biome === 'prairie'), ps = P.taxons.find(t => t.id === cible.id).populations.filter(p => p.biome.startsWith('prairie~'));
  const ipp = pv.infection_par_parcelle || {}, part = I => I?.['souche-essai']?.i || 0, moy = somme(ps.map(p => part(p.infection) * p.effectif)) / somme(ps.map(p => p.effectif));
  verif(ps.length === 4 && ps.every(p => JSON.stringify(ipp[p.biome] || {}) === JSON.stringify(p.infection || {})) && Object.keys(ipp).every(q => q in pv.parcelles) && Math.abs(moy - part(pv.infection)) < 1e-6,
    `la vue par biome publie l'infection de chaque parcelle (infection_par_parcelle), à côté de son effectif : ${ps.map(p => `${p.biome} ${fx(part(ipp[p.biome]) * 100, 1)} %`).join(', ')} ; la prairie, ${fx(part(pv.infection) * 100, 2)} %, en est la moyenne pesée par l'effectif`);
  // les aides de lecture d'un jeu (moteur/pathogenes.js), et les mêmes sur un instantané d'avant l'infection par parcelle
  const q = ps.map(p => p.biome).sort((a, b) => part(ipp[b]) - part(ipp[a]))[0], F = Pa.foyers(V, 'souche-essai').filter(f => f.taxon === cible.id && f.biome === 'prairie');
  const ancien = clone(V); delete ancien.taxons.find(t => t.id === cible.id).populations.find(p => p.biome === 'prairie').infection_par_parcelle;
  verif(Pa.souche(V, 'souche-essai')?.nom === 'Essaiose' && Pa.souches(V).some(s => s.id === 'souche-essai') && Pa.souche(V, 'souche-inconnue') === null
    && JSON.stringify(Pa.infection(V, cible.id, q)) === JSON.stringify(ipp[q]) && JSON.stringify(Pa.infection(V, tv, 'prairie')) === JSON.stringify(pv.infection)
    && Math.abs(Pa.infectes(V, cible.id, q, 'souche-essai') - part(ipp[q]) * pv.parcelles[q]) < 1e-9 && F.length === ps.filter(p => part(p.infection) > 0).length && Pa.foyers(V, 'souche-essai').every(f => f.parcelle && f.parcelle.split('~')[0] === f.biome)
    && !Object.keys(Pa.infection(V, cible.id, 'nulle-part')).length && !Object.keys(Pa.infection(V, 'lignee-inconnue', 'prairie')).length && Pa.infectes(V, cible.id, 'nulle-part') === 0
    && JSON.stringify(Pa.infection(ancien, cible.id, q)) === JSON.stringify(pv.infection),
    `les aides d'un jeu la lisent : ${q}, ${fx(Pa.infectes(V, cible.id, q, 'souche-essai'), 0)} bêtes infectées ; ${F.length} foyers dans la prairie, parcelle par parcelle ; un lieu, une lignée inconnus : rien ; un instantané d'avant : l'infection de son biome`);
}

console.log('4. Les hôtes');
{ const hb = vivants(I0).filter(t => t.plan.regime === 'herbivore' && (t.populations.find(p => p.biome === 'prairie')?.effectif || 0) > 1000);
  const Tm = new Map(I0.taxons.map(t => [t.id, t])), o = hb.sort((x, y) => (y.populations.find(p => p.biome === 'prairie').effectif) - (x.populations.find(p => p.biome === 'prairie').effectif))[0];
  let J = poser(Syn.eveiller(Flore.eveiller(I0).inst).inst, o.id, 'prairie', .12); const proches = new Set(), loin = new Set();
  for (const t of vivants(J)) { if (t === o || t.plan.regime === 'vegetal' || t.plan.regime === 'synthetique' || !t.populations.some(p => p.biome === 'prairie')) continue;
    const p = Orvane.parente(o, t, Tm); const age = p ? J.cycle.n - p.depuis : Infinity; if (age < 80 && Math.abs(Math.log10(t.plan.masse_kg / o.plan.masse_kg)) < .5) proches.add(t.id); else if (!p) loin.add(t.id); }
  for (let k = 0; k < 30; k++) J = Orvane.cycle(J, {});
  const pris = J.monde.pathogenes.souches['souche-essai']?.hotes || [], machines = infectes(J, 'souche-essai', t => t.plan.regime === 'synthetique'), plantes = J.taxons.filter(t => t.plan.regime === 'vegetal').some(t => t.populations.some(p => p.infection));
  verif([...loin].every(id => !pris.includes(id)) && !machines && !plantes && pris.length >= 1, `née chez ${o.nom}, la souche prend chez ${pris.length - 1} autre${pris.length > 2 ? 's' : ''} lignée${pris.length > 2 ? 's' : ''} (dont ${pris.filter(id => proches.has(id)).length} des ${proches.size} proches parentes de sa taille) ; aucune des ${loin.size} lignées sans ancêtre commun, ni machine, ni plante`);
}

console.log("5. L'immunité");
{ const o = vivants(I0).filter(t => t.plan.regime === 'herbivore').sort((x, y) => (y.populations.find(p => p.biome === 'prairie')?.effectif || 0) - (x.populations.find(p => p.biome === 'prairie')?.effectif || 0))[0];
  const pic = J => { let m = 0; for (let k = 0; k < 25; k++) { J = Orvane.cycle(J, {}); m = Math.max(m, J.taxons.find(t => t.id === o.id).populations.find(p => p.biome === 'prairie')?.infection?.['souche-essai']?.i || 0); } return [m, J]; };
  const [p1, J1] = pic(poser(I0, o.id, 'prairie', .02)); const J2 = clone(J1), p = J2.taxons.find(t => t.id === o.id).populations.find(q => q.biome === 'prairie');
  const r = p.infection?.['souche-essai']?.r || 0; p.infection = { 'souche-essai': { i: .02, r } }; J2.monde.pathogenes.souches['souche-essai'] ??= clone(J1.monde.pathogenes.souches['souche-essai'] || { nom: 'Essaiose', virulence: .12, transmission: Pa.transmission(.12), origine: o.id, apparu: J2.cycle.n, hotes: [o.id] });
  const [p2] = pic(J2);
  verif(p2 < .7 * p1, `${o.nom} : la première vague infecte jusqu'à ${fx(p1 * 100, 1)} % de la prairie ; après elle, ${fx(r * 100, 0)} % sont immunisés, et la même souche revenue n'en infecte plus que ${fx(p2 * 100, 1)} %`);
}

console.log('5 bis. Une épidémie qui s\'éteint (REGLES.locale)');
{ // une petite population (150 bêtes) et une plus grande (600), seules de leur lignée : la même souche, avec et sans le seuil
  const tid = vivants(I0).filter(t => t.populations.length === 1 && t.populations[0].effectif >= 300).sort((a, b) => a.populations[0].effectif - b.populations[0].effectif)[0].id;
  const fin = {}, essai = (N, k) => { const av = Pa.REGLES.locale; Pa.REGLES.locale = k;
    try { let X = poser(I0, tid, I0.taxons.find(t => t.id === tid).populations[0].biome, .15, .1); const p0 = X.taxons.find(t => t.id === tid).populations[0], f = N / p0.effectif; p0.effectif = N; if (p0.N) p0.N = p0.N.map(x => x * f);
      for (let c = 1; c <= 30; c++) { const Y = X; X = Orvane.cycle(X, {}); if (!X.monde.pathogenes.souches['souche-essai']) { Object.assign(fin, { avant: Y, apres: X }); return c; } } return 0; } finally { Pa.REGLES.locale = av; } };
  const a = essai(150, 0), b = essai(150, Pa.REGLES.locale), c = essai(600, Pa.REGLES.locale);
  verif(!a && b > 0 && !c, `dans une population de 150 bêtes, sans le seuil, la souche ne s'éteint jamais (quelques malades pour toujours) ; avec lui (moins de ${Pa.REGLES.locale} malades), elle s'éteint au cycle ${b} ; dans une population de 600 bêtes, elle reste`);
  // une extinction réelle : son événement dit la souche, sa nature, son nom, ses hôtes, ses derniers lieux ; son texte seul, la même chose
  const E = fin.apres ? fin.apres.evenements.filter(e => e.souche === 'souche-essai') : [], F5 = [], N5 = {}; for (const e of E) lire(e, fin.avant, fin.apres, F5, N5);
  const e5 = E[0], ici5 = I0.taxons.find(t => t.id === tid).populations[0].biome;
  verif(E.length === 1 && N5.extinction === 1 && !F5.length && e5.type === 'remission' && e5.nom === 'Essaiose' && JSON.stringify(e5.lieux) === JSON.stringify([ici5]) && JSON.stringify(e5.hotes) === JSON.stringify([tid]),
    `l'extinction, au cycle ${b} : remission, nature « ${e5?.nature} », souche ${e5?.souche}, « ${e5?.nom} », derniers lieux ${JSON.stringify(e5?.lieux)}, hôtes ${JSON.stringify(e5?.hotes)} ; son texte seul, la même chose` + (F5.length ? ` ; ${F5.join(' ; ')}` : ''));
}

console.log('6. Le compromis');
{ const o = vivants(I0).filter(t => t.plan.regime === 'herbivore').sort((x, y) => (y.populations.find(p => p.biome === 'prairie')?.effectif || 0) - (x.populations.find(p => p.biome === 'prairie')?.effectif || 0))[1];
  const essai = v => { let J = poser(I0, o.id, 'prairie', v, .02); let cumul = 0; for (let k = 0; k < (court ? 30 : 40); k++) { J = Orvane.cycle(J, {}); cumul += infectes(J); } return cumul; };
  const [a, b, c] = [.02, .15, .45].map(essai);
  verif(b > a && b > c, `chez ${o.nom}, la même souche à trois virulences : 2 % par cycle infecte ${fx(a / 1e3, 0)} milliers de bêtes-cycles, 15 % en infecte ${fx(b / 1e3, 0)} milliers, 45 % ${fx(c / 1e3, 0)} milliers ; trop douce, elle se transmet mal ; trop virulente, elle tue ses hôtes`);
}

console.log('7. La pollinisation');
{ let F = Flore.eveiller(I0).inst; F = Orvane.cycle(F, {});   // (le premier cycle pose la référence des butineurs)
  const butineurs = vivants(F).filter(Flore.estButineur);
  const cible = {}; for (const t of butineurs) { const p = t.populations.find(q => q.biome === 'prairie'); if (p) cible[t.id] = p.effectif; }
  const fleurs = I => somme(I.taxons.filter(t => t.plan.regime === 'vegetal' && ['herbe', 'buisson', 'arbre'].includes(t.plan.forme)).flatMap(t => t.populations.filter(p => p.biome === 'prairie').map(p => p.effectif * t.plan.masse_kg)));
  let X = clone(F), Y = clone(F); for (let k = 0; k < 30; k++) { X = Orvane.cycle(X, {}); Y = Orvane.cycle(Y, {}); for (const t of Y.taxons) { const p = cible[t.id] != null && t.populations.find(q => q.biome === 'prairie'); if (p) p.effectif = cible[t.id] * .05; } }
  verif(Object.keys(cible).length && fleurs(Y) < .985 * fleurs(X), `les ${Object.keys(cible).length} lignées de butineurs de la prairie tenues à 5 % de leur nombre 30 cycles : les plantes à fleurs de la prairie y pèsent ${fx(fleurs(Y) / fleurs(X) * 100, 1)} % de ce qu'elles pèsent avec eux`);
}

console.log('8. Le contrat, le cycle de nuit');
{ const e = val(S, W, '$'); verif(!e.length, "l'instantané d'un monde à souches respecte schemas/instantane.schema.json" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-souches'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const pf = lireJ('mondes/orvane/profil.json'); const profil = { ...pf, monde: { ...pf.monde, id: 'essai-souches', pathogenes: true, synthetique: false, flore: false, fusions: [], parcelles: undefined, pressions: undefined } };
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil)); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-souches', '--sans-reseau', '--cycles', '2', '--forcer'], { encoding: 'utf8' });
    const Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/souches : les maladies/g) || []).length === 1 && Ip.monde.pathogenes, 'le cycle de nuit : le profil demande les souches, le monde les reçoit une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
