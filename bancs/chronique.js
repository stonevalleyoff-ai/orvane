// Orvane — LE BANC DE LA CHRONIQUE, DU MUSÉUM ET DES NOMS (bancs/chronique.js, docs/37)
//  1. rien ne change : la chronique et le muséum lisent le monde sans le toucher, et le même monde donne la même chronique ;
//  2. la chronique d'un monde qui vit : ce qu'elle garde (les naissances, les catastrophes…), ce qu'elle laisse (les épidémies
//     ordinaires, les allers-retours des zones hybrides), et combien cela pèse ;
//  3. le muséum : un spécimen par lignée, toujours la même bête ; une lignée éteinte y reste, avec sa cause, quand le moteur l'a oubliée ;
//  4. les noms : le premier nom valable l'emporte ; ni nom réservé d'avance, ni doublon, ni nom refusé par la modération ;
//  5. le cycle de nuit : chronique/ par année, museum.json une ligne par spécimen, le nom commun dans l'instantané et ses morceaux.
//   node bancs/chronique.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), C = require(racine('moteur/chronique.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();

const I0 = lireJ('mondes/genese-7/instantane.json'), N = 40;
// le monde vit N cycles ; la chronique et le muséum le suivent
let inst = I0, et = C.noter(C.vide(I0), I0, { ...I0, evenements: [] }, { premier: true }).etat, mus = C.decrire(null, I0).museum;
const entrees = [], evs = {};
for (let k = 0; k < N; k++) {
  const av = inst; inst = Orvane.cycle(inst, {}, { duree_ms: 864e5 });
  for (const e of inst.evenements) evs[e.type] = (evs[e.type] || 0) + 1;
  const r = C.noter(et, av, inst); et = r.etat; entrees.push(...r.entrees);
  mus = C.decrire(C.fossiliser(mus, av, inst).museum, inst).museum;
}

console.log('1. Rien ne change');
{ const A = JSON.stringify(I0), B = Orvane.cycle(I0, {}, { duree_ms: 864e5 }), sB = JSON.stringify(B);
  C.noter(C.vide(I0), I0, B); C.decrire(null, B); C.fossiliser(C.decrire(null, I0).museum, I0, B); C.publier(B, mus);
  verif(JSON.stringify(I0) === A && JSON.stringify(B) === sB, 'la chronique, le muséum et les noms ne touchent ni au monde d\'avant ni à celui d\'après');
  let i2 = I0, e2 = C.noter(C.vide(I0), I0, { ...I0, evenements: [] }, { premier: true }).etat; const E2 = [];
  for (let k = 0; k < 5; k++) { const av = i2; i2 = Orvane.cycle(i2, {}, { duree_ms: 864e5 }); const r = C.noter(e2, av, i2); e2 = r.etat; E2.push(...r.entrees); }
  verif(JSON.stringify(E2) === JSON.stringify(entrees.filter(e => e.n <= I0.cycle.n + 5)), `le même monde donne la même chronique (${E2.length} entrées en 5 cycles, au caractère près)`); }

console.log('2. La chronique d\'un monde qui vit');
{ const par = {}; for (const e of entrees) par[e.type] = (par[e.type] || 0) + 1;
  const sep = evs.separation || 0, nais = par.naissance || 0, poids = JSON.stringify(entrees).length / N;
  verif(nais === sep, `${N} cycles de la genèse 7 : ${sep} séparations, ${nais} naissances à la chronique ; ${par.catastrophe || 0} catastrophes sur ${evs.catastrophe || 0}`);
  verif((evs.epidemie || 0) > 10 * ((par.epidemie || 0) + 1) && (evs.hybridation || 0) >= (par.hybridation || 0),
    `elle laisse le bruit : ${evs.epidemie || 0} épidémies ordinaires (elle n'en garde que les sauts de souches : ${par.epidemie || 0}), ${evs.hybridation || 0} zones hybrides signalées, ${par.hybridation || 0} paires nouvelles gardées`);
  verif(poids < 2000 && entrees.every(e => e.texte && e.titre && e.n != null && e.importance >= 1 && e.importance <= 3),
    `${entrees.length} entrées, chacune datée, titrée, d'importance 1 à 3 ; ${fx(poids, 0)} octets par cycle (une année de 120 cycles : ${fx(poids * 120 / 1024, 0)} Ko)`);
  const exemple = entrees.find(e => e.type === 'naissance') || entrees[0]; if (exemple) console.log(`     ex. cycle ${exemple.n} · ${exemple.titre} — ${exemple.texte}`); }

console.log('3. Le muséum');
{ const S = mus.specimens, vivants = I0.taxons.filter(t => !t.eteint).length, nes = Object.values(S).filter(s => s.decrit_au > I0.cycle.n).length;
  verif(Object.keys(S).length === vivants + nes && Object.values(S).every(s => s.plan && s.plan.corps && s.lieu),
    `un spécimen par lignée : ${vivants} décrites à l'éveil, ${nes} nées depuis ; chacun a son plan, sa silhouette, son lieu`);
  const t = I0.taxons.find(x => !x.eteint && x.plan.regime !== 'vegetal'), a = C.decrire(null, I0).museum.specimens[t.id].type, b = C.decrire(null, { ...I0, cycle: { ...I0.cycle, n: 999 } }).museum.specimens[t.id].type;
  verif(a && b && JSON.stringify({ ...a, ne: 0 }) === JSON.stringify({ ...b, ne: 0 }) && a.nom && a.sexe, `le spécimen type de ${t.nom} est toujours la même bête : ${a.nom}, ${a.sexe === 'f' ? 'femelle' : 'mâle'}, tirée de sa population`);
  // une lignée chassée jusqu'à la dernière : le muséum la garde, avec sa cause, après que le moteur l'a oubliée
  const V = I0.taxons.find(x => !x.eteint && x.plan.regime === 'herbivore'), T = JSON.parse(JSON.stringify(I0));
  const vT = T.taxons.find(x => x.id === V.id); vT.populations.forEach(p => { p.pression = .8; });
  const apres = JSON.parse(JSON.stringify(T)); const xA = apres.taxons.find(x => x.id === V.id); xA.eteint = T.cycle.n + 1; xA.statut = 'eteint'; xA.populations = []; apres.cycle = { ...T.cycle, n: T.cycle.n + 1 }; apres.evenements = [];
  const m1 = C.fossiliser(C.decrire(null, T).museum, T, apres).museum, s = m1.specimens[V.id], r = C.noter(C.vide(T), T, apres);
  const oublie = { ...apres, taxons: apres.taxons.filter(x => x.id !== V.id), cycle: { ...apres.cycle, n: apres.cycle.n + 11 } }, m2 = C.decrire(m1, oublie).museum;
  verif(s.eteint === T.cycle.n + 1 && /joueurs/.test(s.cause) && r.entrees.some(e => e.type === 'extinction' && e.taxon === V.id && e.importance === 3) && m2.specimens[V.id]?.eteint != null,
    `${V.nom}, chassée jusqu'à la dernière : « ${s.cause} », éteinte au cycle ${s.eteint} après ${s.duree} cycles ; la chronique l'annonce (importance 3) ; dix cycles plus tard, le moteur l'a oubliée, le muséum la garde`);
  const taille = Buffer.byteLength(C.ecrire(mus, 'specimens')) / Object.keys(S).length;
  verif(taille < 4000, `${fx(taille, 0)} octets par spécimen (une ligne chacun : un muséum de 1 000 lignées pèse ${fx(taille / 1024, 0)} Mo… ${fx(taille * 1000 / 1048576, 1)} Mo)`); }

console.log('4. Les noms');
{ const S = Object.values(mus.specimens).filter(s => s.famille === 'animale'), [a, b, c] = S, apres = d => new Date(Date.parse(a.date || '2026-01-01') + d).toISOString();
  const props = [
    { id: 1, jeu: 'stone-valley', auteur: 'Lila', taxon: a.id, nom: 'Grand cerf des brumes', recu: apres(1000) },
    { id: 2, jeu: 'last-embers', taxon: a.id, nom: 'Cerf des cendres', recu: apres(2000) },
    { id: 3, jeu: 'last-embers', taxon: b.id, nom: 'grand cerf  des brumes', recu: apres(3000) },
    { id: 4, jeu: 'last-embers', taxon: b.id, nom: 'http://pub.example', recu: apres(4000) },
    { id: 5, jeu: 'last-embers', taxon: c.id, nom: 'Le Vorace', recu: new Date(Date.parse(a.date || '2026-01-01') - 864e5).toISOString() },
    { id: 6, jeu: 'stone-valley', taxon: b.id, nom: 'Mot interdit', recu: apres(5000) },
    { id: 7, jeu: 'stone-valley', taxon: b.id, nom: 'Petit glaneur d\'automne', recu: apres(6000) },
    { id: 8, jeu: 'stone-valley', taxon: 'lignee-a-naitre', nom: 'Réservé', recu: apres(7000) }];
  const r = C.nommer(mus, props, { n: inst.cycle.n, date: inst.cycle.date, refuses: [6] }), pq = Object.fromEntries(r.refuses.map(x => [x.id, x.pourquoi]));
  verif(r.retenus.map(x => x.id).join(',') === '1,7' && r.museum.specimens[a.id].nom_commun === 'Grand cerf des brumes' && r.museum.specimens[a.id].decrit.par === 'Lila',
    `${a.nom} : « Grand cerf des brumes », de Lila (Stone Valley), le premier ; ${b.nom} : « Petit glaneur d'automne », après trois refus`);
  verif(pq[2] === 'déjà nommée' && pq[3] === 'nom déjà pris dans ce monde' && pq[4] === 'nom non valable' && /avant/.test(pq[5]) && /modération/.test(pq[6]) && pq[8] === 'lignée inconnue',
    'refusés : un second nom, un doublon (casse et espaces comptent pour rien), une adresse, un nom réservé avant la publication, un nom modéré, une lignée inconnue');
  const P = C.publier(inst, r.museum), t = P.taxons.find(x => x.id === a.id);
  verif(t.nom_commun === 'Grand cerf des brumes' && t.nom === inst.taxons.find(x => x.id === a.id).nom && !inst.taxons.find(x => x.id === a.id).nom_commun,
    'publié : le nom commun s\'ajoute, le nom du moteur reste, l\'instantané reçu ne change pas');
  const sch = lireJ('schemas/instantane.schema.json').properties.taxons.items.properties;
  verif(sch.nom_commun && sch.decrit && Object.keys(t.decrit).every(k => sch.decrit.properties[k]), 'le contrat les connaît (schemas/instantane.schema.json : nom_commun, decrit)');
  const sql = fs.readFileSync(racine('hebergement/supabase.sql'), 'utf8');
  verif(/function public\.orvane_nommer/.test(sql) && /function public\.orvane_lire_noms/.test(sql) && /orvane_noms enable row level security/.test(sql) && /revoke all on public\.orvane_noms from anon/.test(sql),
    'le Supabase : orvane_nommer (le jeu), orvane_lire_noms (l\'action, avec le secret) ; la table ne s\'ouvre à personne'); }

console.log('5. Le cycle de nuit');
{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-chronique-'));
  for (const x of ['moteur', 'tampon', 'hebergement']) fs.cpSync(racine(x), path.join(d, x), { recursive: true });
  const M = path.join(d, 'mondes', 'sv-1'); fs.mkdirSync(M, { recursive: true });
  for (const x of ['etat.json', 'profil.json', 'tampon.json', 'generation-0.json', 'historique.json']) if (fs.existsSync(racine('mondes/sv-1/' + x))) fs.copyFileSync(racine('mondes/sv-1/' + x), path.join(M, x));
  const E = lireJ('mondes/sv-1/etat.json'), cible = E.taxons.find(t => !t.eteint).id;
  fs.mkdirSync(path.join(M, 'noms')); fs.writeFileSync(path.join(M, 'noms', 'essai.json'), JSON.stringify([{ taxon: cible, nom: 'Brouteur des collines', auteur: 'Romain', jeu: 'stone-valley' }]));
  const lancer = n => execFileSync('node', [path.join(d, 'hebergement/cycle.js'), 'sv-1', '--sans-reseau', '--forcer', '--cycles', String(n)], { cwd: d, encoding: 'utf8' });
  lancer(3); const idx1 = JSON.parse(fs.readFileSync(path.join(M, 'chronique/index.json'), 'utf8')); lancer(2);
  const idx = JSON.parse(fs.readFileSync(path.join(M, 'chronique/index.json'), 'utf8')), musT = fs.readFileSync(path.join(M, 'museum.json'), 'utf8'), mu = JSON.parse(musT);
  const P = JSON.parse(fs.readFileSync(path.join(M, 'instantane.json'), 'utf8')), an = idx.annees[idx.annees.length - 1];
  const fichierAn = an ? JSON.parse(fs.readFileSync(path.join(M, `chronique/${an.an}.json`), 'utf8')) : null;
  verif(mu.specimens[cible]?.nom_commun === 'Brouteur des collines' && P.taxons.find(t => t.id === cible)?.nom_commun === 'Brouteur des collines' && fs.existsSync(path.join(M, 'noms/traites/essai.json')),
    `un nom déposé dans noms/ : retenu, publié dans l'instantané, le fichier rangé dans noms/traites/`);
  verif(an && fichierAn.entrees.length === an.entrees && idx.derniers.length >= idx1.derniers.length && musT.split('\n').length >= Object.keys(mu.specimens).length,
    `chronique/index.json (${idx.annees.length} année(s), ${idx.derniers.length} dernières entrées), chronique/${an?.an}.json (${an?.entrees} entrées) ; museum.json : une ligne par spécimen (${Object.keys(mu.specimens).length})`);
  fs.rmSync(d, { recursive: true, force: true }); }

console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
