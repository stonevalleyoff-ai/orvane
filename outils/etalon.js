// Orvane — L'ÉTALON (outils/etalon.js) — docs/53
// Le monde d'Orvane est inventé : rien ne dit si ses lynx mangent trop, si ses hivers usent assez. L'Europe (mondes/europe/, docs/52)
// tourne sur le même moteur, avec de vraies espèces et un vrai climat : là, la réalité sait la réponse. L'étalon fait vivre l'Europe
// plusieurs années, sans joueurs, et note le moteur sur ce que la réalité connaît ET que l'assemblage n'a pas calé :
//  1. la stabilité : chaque espèce garde son ordre de grandeur d'une année sur l'autre (la moyenne de sa dernière année, rapportée à
//     celle de sa première : les deux sont des moyennes sur toutes les saisons), et aucune ne s'éteint ;
//  2. les saisons : le jour de l'année où naissent la plupart des faons (le chevreuil, le cerf) ; le jour où les cigognes partent
//     hiverner et celui où elles reviennent ;
//  3. les prédateurs : combien de carnivores vivent de dix tonnes de proies. Carbone et Gittleman (2002, Science 295) le mesurent sur
//     25 espèces : 89,1 × masse^−1,05 bêtes par 10 000 kg de proies (un loup de 30 kg : 2,5). Pour chaque carnivore, ses proies sont
//     les oiseaux et les mammifères que le moteur lui laisse manger, dans les lieux où il vit ;
//  et un garde-fou, que l'assemblage a posé et que le moteur ne doit pas défaire : la loi de Damuth (la densité des mammifères suit
//  leur masse^−0,75).
// Chaque test a sa cible, sa tolérance, sa source : il passe (✓), il est limite (≈, au plus deux fois la tolérance) ou il échoue (✗).
// Un échec est un renseignement, pas une panne : il dit ce que le moteur ne sait pas encore faire.
//   node outils/etalon.js [--monde europe] [--ans 3] [--sortie etalon/europe/AAAA-MM-JJ.json] [--date AAAA-MM-JJ]
// L'amorce du monde (mondes/<monde>/amorce.json) est le point de départ, toujours le même : deux lancements donnent le même rapport.
// Une année d'Europe prend ~50 minutes sur un ordinateur. Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path');
const Orvane = require('../moteur/orvane.js');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const MONDE = arg('--monde', 'europe'), ANS = Math.max(1, +arg('--ans', 3)), racine = p => path.join(__dirname, '..', p);
const somme = L => L.reduce((s, x) => s + x, 0), r = (x, d = 3) => +Number(x).toFixed(d), clamp = (v, x, y) => Math.min(y, Math.max(x, v));
const doy = j => { const d = new Date(j + 'T12:00:00Z'); return Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1; };
const dateDe = n => new Date(Date.UTC(2027, 0, 1) + (n - 1) * 864e5).toISOString().slice(5, 10).split('-').reverse().join('/');
const classe = t => t.reel?.classe ?? String(t.reel?.groupe || '').split(' ')[0];

// --- les cibles (la réalité) ---
const CIBLES = {
  stabilite: { part: .9, facteur: 2, source: "un monde sans joueurs, au même climat, garde ses espèces : chacune à moins d'un facteur 2 de sa première année" },
  naissances: {
    chevreuil: { de: 130, a: 175, source: 'les chevrillards naissent de mi-mai à mi-juin (Andersen et al., The European Roe Deer, 1998)' },
    'cerf-elaphe': { de: 140, a: 185, source: 'les faons du cerf élaphe naissent de fin mai à juin (Clutton-Brock et al., Red Deer, 1982)' }
  },
  cigogne: { depart: { de: 215, a: 255, source: 'les cigognes blanches quittent l’Europe de début août à début septembre' },
    retour: { de: 45, a: 100, source: 'elles reviennent de mi-février à début avril' } },
  carnivores: { a: 89.1, b: -1.05, tolerance: Math.log10(3), source: 'Carbone & Gittleman 2002, Science 295 : 89,1 × M^−1,05 carnivores par 10 000 kg de proies' },
  damuth: { pente: -.75, tolerance: .15, source: 'Damuth 1981 : la densité des mammifères ∝ masse^−0,75' }
};
const note = (ecart, tol) => ecart <= tol ? 'ok' : ecart <= 2 * tol ? 'limite' : 'echec';

// --- les mesures d'un état ---
// les carnivores (mammifères carnivores d'au moins 0,5 kg) : leur nombre par 10 000 kg des proies que le moteur leur laisse, là où ils vivent
function carnivores(I) {
  const T = I.taxons.filter(t => !t.eteint && t.populations.length), parLieu = new Map();
  for (const t of T) for (const p of t.populations) (parLieu.get(p.biome) || parLieu.set(p.biome, []).get(p.biome)).push([t, p.effectif]);
  const out = [];
  for (const c of T) { if (classe(c) !== 'Mammalia' || c.plan.regime !== 'carnivore' || (c.plan.masse_kg || 0) < .5 || c.guilde) continue;
    let N = 0, B = 0;
    for (const p of c.populations) { const ici = parLieu.get(p.biome) || []; let b = 0;
      for (const [q, n] of ici) if (q !== c && ['Mammalia', 'Aves'].includes(classe(q)) && q.plan.regime !== 'vegetal' && Orvane.appetence(c.plan, q.plan) > 0) b += n * (q.plan.masse_kg || 1);
      if (b > 0) { N += p.effectif; B += b; } }
    if (!(B > 0) || !(N > 0)) continue;
    const obs = N / (B / 1e4), att = CIBLES.carnivores.a * Math.pow(c.plan.masse_kg, CIBLES.carnivores.b);
    out.push({ id: c.id, nom: c.nom, masse_kg: c.plan.masse_kg, effectif: Math.round(N), proies_t: Math.round(B / 1e3), par_10t: r(obs, 3), attendu: r(att, 3), ecart_log10: r(Math.log10(obs / att), 3) }); }
  return out.sort((x, y) => x.ecart_log10 - y.ecart_log10);
}
// la pente densité ~ masse des mammifères (sur la surface des lieux où chacun vit)
function damuth(I) {
  const S = new Map(I.biomes.map(b => [b.id, b.lieu?.surface_km2 || 0])), P = [];
  for (const t of I.taxons) { if (t.eteint || classe(t) !== 'Mammalia' || t.guilde) continue; const N = somme(t.populations.map(p => p.effectif)), A = somme(t.populations.map(p => S.get(p.biome) || 0));
    if (N > 0 && A > 0) P.push([Math.log10(t.plan.masse_kg), Math.log10(N / A)]); }
  const n = P.length, mx = somme(P.map(p => p[0])) / n, my = somme(P.map(p => p[1])) / n;
  return { pente: r(somme(P.map(p => (p[0] - mx) * (p[1] - my))) / somme(P.map(p => (p[0] - mx) ** 2)), 3), especes: n };
}

const f = arg('--amorce') ? path.resolve(arg('--amorce')) : racine(`mondes/${MONDE}/amorce.json`);   // (--amorce : une autre amorce, pour un essai) if (!fs.existsSync(f)) { console.error(`pas d'amorce : ${f}`); process.exit(1); }
// --- une expérience : le retour du loup en France (--experience loup) ---
// Un morceau de l'Europe (la France, l'Italie, la Suisse, Monaco), en 1992 : plus un loup en France ni en Suisse, l'Italie à ~30 % de ses loups
// d'aujourd'hui (ils étaient ~400 vers 1990, ~3 300 en 2021). Avec le loup, ses grandes proies (les ongulés, les lièvres, le lapin, la
// marmotte, le castor) ; ni les autres carnivores ni les plantes, pour aller vite (une année en une trentaine de secondes). Ce que la réalité
// a vu (l'Office français de la biodiversité) : le premier loup dans le Mercantour en 1992, une centaine vers 2008, ~1 100 en 2023.
if (arg('--experience') === 'loup') {
  const A = JSON.parse(fs.readFileSync(f, 'utf8')), PAYS = new Set(['FR', 'IT', 'CH', 'MC']), GARDE = new Set(['loup', 'cerf-elaphe', 'chevreuil', 'daim', 'sanglier', 'chamois', 'isard', 'bouquetin-alpes', 'mouflon', 'lievre-europe', 'lievre-variable', 'lapin', 'marmotte', 'castor']);
  const B = A.biomes.filter(b => PAYS.has(b.lieu?.pays)), ids = new Set(B.map(b => b.id)), pays = new Map(B.map(b => [b.id, b.lieu.pays]));
  for (const b of B) b.voisins = b.voisins.filter(v => ids.has(v));
  const T = A.taxons.filter(t => GARDE.has(t.id)).map(t => ({ ...t, populations: t.populations.filter(p => ids.has(p.biome)) })).filter(t => t.populations.length);
  const loup = T.find(t => t.id === 'loup'); loup.populations = loup.populations.filter(p => pays.get(p.biome) === 'IT').map(p => ({ ...p, effectif: +(p.effectif * .3).toFixed(4) }));
  let E = { ...A, monde: { ...A.monde, flore: undefined, phenologie: undefined, parcelles: { ...A.monde.parcelles, types: A.monde.parcelles.types.filter(ty => B.some(b => b.type === ty.id)) } }, biomes: B, taxons: T, cycle: { ...A.cycle, date: '1992-01-01T03:17:00.000Z' } };
  const ANSX = +arg('--ans', 31), REEL = { 1992: 2, 2000: 35, 2005: 60, 2010: 190, 2015: 300, 2018: 430, 2020: 580, 2023: 1100 }, serie = [], t1 = Date.now();
  const enFrance = I => { const w = I.taxons.find(t => t.id === 'loup'); return w ? somme(w.populations.filter(p => pays.get(p.biome) === 'FR').map(p => p.effectif)) : 0; };
  const lieuxFR = I => (I.taxons.find(t => t.id === 'loup')?.populations || []).filter(p => pays.get(p.biome) === 'FR').length;
  serie.push({ an: 1992, france: 0, lieux: 0, italie: Math.round(somme(loup.populations.map(p => p.effectif))) });
  for (let y = 0; y < ANSX; y++) { for (let k = 0; k < 365; k++) E = Orvane.cycle(E, {}, { duree_ms: 864e5 });
    const w = E.taxons.find(t => t.id === 'loup'); serie.push({ an: 1993 + y, france: Math.round(enFrance(E)), lieux: lieuxFR(E), italie: Math.round(somme((w?.populations || []).filter(p => pays.get(p.biome) === 'IT').map(p => p.effectif))) });
    process.stderr.write(`le loup : ${1993 + y}, ${serie[serie.length - 1].france} en France (${serie[serie.length - 1].lieux} lieux), ${serie[serie.length - 1].italie} en Italie (${((Date.now() - t1) / (y + 1) / 1000).toFixed(0)} s par an)\n`); }
  const premier = serie.find(x => x.france >= 2)?.an ?? null, cent = serie.find(x => x.france >= 100)?.an ?? null, fin = serie[serie.length - 1];
  const tests = [
    { id: 'loup-arrivee', nom: 'Le loup arrive en France', valeur: premier, cible: 'au plus tard en 1995 (le premier en 1992)', etat: premier != null && premier <= 1995 ? 'ok' : premier != null && premier <= 2000 ? 'limite' : 'echec' },
    { id: 'loup-cent', nom: 'Cent loups en France', valeur: cent, cible: 'vers 2008 (± 6 ans)', etat: cent != null && Math.abs(cent - 2008) <= 6 ? 'ok' : cent != null && Math.abs(cent - 2008) <= 12 ? 'limite' : 'echec' },
    { id: 'loup-2023', nom: `Les loups de France en ${fin.an}`, valeur: fin.france, cible: `~${REEL[2023]} (à moins d'un facteur 3)`, etat: fin.france > 0 && Math.abs(Math.log10(fin.france / REEL[2023])) <= Math.log10(3) ? 'ok' : fin.france > 0 && Math.abs(Math.log10(fin.france / REEL[2023])) <= Math.log10(9) ? 'limite' : 'echec' }];
  const rapport = { etalon: 1, experience: 'loup', monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), ans: ANSX, lieux: B.length, reel: REEL, serie, tests };
  const S = { ok: '✓', limite: '≈', echec: '✗' }; console.log(`Le retour du loup (France, Italie, Suisse ; ${ANSX} ans) :`); for (const t of tests) console.log(`  ${S[t.etat]} ${t.nom} : ${t.valeur ?? 'jamais'} — cible ${t.cible}`);
  const so = arg('--sortie'); if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(rapport, null, 1)); console.log('→', so); }
  process.exit(0);
}
// --- la vie de l'Europe, sans joueurs ---
let I = JSON.parse(fs.readFileSync(f, 'utf8'));
const animaux = I.taxons.filter(t => t.plan.regime !== 'vegetal'), ids = animaux.map(t => t.id), JOURS = +arg('--jours', 365 * ANS), parAn = new Array(ANS).fill(0);   // (--jours : un essai plus court)
const moyennes = Array.from({ length: ANS }, () => new Map(ids.map(id => [id, 0]))), nais = {}, cigogne = { depart: [], retour: [] }, extinctions = [];
for (const id of Object.keys(CIBLES.naissances)) nais[id] = new Array(367).fill(0);
const car0 = carnivores(I), dam0 = damuth(I), t0 = Date.now();
for (let k = 0; k < JOURS; k++) {
  const an = Math.min(ANS - 1, Math.floor(k / 365)), parJour = {}; parAn[an]++;
  I = Orvane.cycle(I, {}, { duree_ms: 864e5, trace: x => { if (nais[x.taxon]) parJour[x.taxon] = (parJour[x.taxon] || 0) + x.nais; } });
  const j = doy(I.cycle.jour);
  for (const [id, v] of Object.entries(parJour)) nais[id][j] += v;
  const M = moyennes[an]; for (const t of I.taxons) if (M.has(t.id)) M.set(t.id, M.get(t.id) + somme(t.populations.map(p => p.effectif)));
  for (const e of I.evenements) {
    if (e.type === 'extinction' && !e.biome) extinctions.push({ taxon: e.taxon, jour: I.cycle.jour });
    if (e.type === 'migration' && e.taxon === 'cigogne-blanche' && /migration d'automne/.test(e.detail || '')) cigogne.depart.push(j);
    if (e.type === 'migration' && e.taxon === 'cigogne-blanche' && /migration de printemps/.test(e.detail || '')) cigogne.retour.push(j); }
  if ((k + 1) % 30 === 0) process.stderr.write(`étalon : ${I.cycle.jour} (${k + 1}/${JOURS} jours, ${((Date.now() - t0) / (k + 1) / 1000).toFixed(1)} s par jour)\n`);
}

for (let y = 0; y < ANS; y++) for (const [id, v] of moyennes[y]) moyennes[y].set(id, parAn[y] ? v / parAn[y] : 0);
// --- les tests ---
const tests = [];
{ // 1. la stabilité
  const C = CIBLES.stabilite, L = [];
  for (const t of animaux) { const m0 = moyennes[0].get(t.id), m1 = moyennes[ANS - 1].get(t.id); if (!(m0 > 0)) continue; L.push({ id: t.id, nom: t.nom, rapport: r(m1 / m0, 3) }); }
  const dans = L.filter(x => x.rapport >= 1 / C.facteur && x.rapport <= C.facteur).length / (L.length || 1);
  L.sort((x, y) => Math.abs(Math.log(y.rapport)) - Math.abs(Math.log(x.rapport)));
  tests.push({ id: 'stabilite', nom: 'La stabilité', valeur: r(dans, 3), cible: `≥ ${C.part} des espèces à moins d'un facteur ${C.facteur} de leur première année${ANS === 1 ? ' (sur une année : la première contre elle-même, le test ne dit rien ; il faut --ans 2 au moins)' : ''}`,
    etat: ANS === 1 ? 'limite' : dans >= C.part && !extinctions.length ? 'ok' : dans >= C.part - .1 ? 'limite' : 'echec',
    detail: { especes: L.length, extinctions, plus_loin: L.slice(0, 12) }, source: C.source });
}
{ // 2. les saisons
  for (const [id, C] of Object.entries(CIBLES.naissances)) { const v = nais[id]; if (!v || !somme(v)) continue;
    // le jour médian des naissances (sur l'année tournante qui part du cœur de l'hiver, pour ne pas couper la saison)
    const tot = somme(v); let acc = 0, med = null; for (let j = 1; j <= 366; j++) { acc += v[j]; if (acc >= tot / 2) { med = j; break; } }
    const centre = (C.de + C.a) / 2, ecart = Math.max(0, Math.abs(med - centre) - (C.a - C.de) / 2);
    tests.push({ id: `naissances-${id}`, nom: `Les naissances : ${id}`, valeur: med, valeur_dite: dateDe(med), cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: note(ecart, 15), detail: { par_mois: Array.from({ length: 12 }, (_, m) => Math.round(somme(v.slice(1 + Math.round(m * 30.5), 1 + Math.round((m + 1) * 30.5))))) }, source: C.source }); }
  for (const sens of ['depart', 'retour']) { const C = CIBLES.cigogne[sens], L = cigogne[sens];
    if (!L.length) { tests.push({ id: `cigogne-${sens}`, nom: `Les cigognes : ${sens === 'depart' ? 'le départ' : 'le retour'}`, valeur: null, cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: 'echec', detail: { pourquoi: 'les cigognes ne migrent pas (aucune migration annoncée)' }, source: C.source }); continue; }
    const j = L[0], centre = (C.de + C.a) / 2, ecart = Math.max(0, Math.abs(j - centre) - (C.a - C.de) / 2);
    tests.push({ id: `cigogne-${sens}`, nom: `Les cigognes : ${sens === 'depart' ? 'le départ' : 'le retour'}`, valeur: j, valeur_dite: dateDe(j), cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: note(ecart, 15), detail: { jours: L.slice(0, ANS) }, source: C.source }); }
}
{ // 3. les prédateurs
  const C = CIBLES.carnivores, car1 = carnivores(I), med = L => { const v = L.map(x => Math.abs(x.ecart_log10)).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  const m1 = med(car1), m0 = med(car0);
  tests.push({ id: 'carnivores', nom: 'Les prédateurs : combien de carnivores vivent de dix tonnes de proies', valeur: m1 == null ? null : r(Math.pow(10, m1), 2), valeur_dite: m1 == null ? '-' : `écart médian ×${Math.pow(10, m1).toFixed(1)} (au départ ×${Math.pow(10, m0).toFixed(1)})`,
    cible: `à moins d'un facteur ${Math.pow(10, C.tolerance).toFixed(0)} de la loi`, etat: m1 == null ? 'echec' : note(m1, C.tolerance), detail: { fin: car1, depart: car0 }, source: C.source });
}
{ // le garde-fou
  const C = CIBLES.damuth, d1 = damuth(I);
  tests.push({ id: 'damuth', nom: 'Garde-fou : la loi de Damuth', garde_fou: true, valeur: d1.pente, valeur_dite: `pente ${d1.pente} (au départ ${dam0.pente}, ${d1.especes} espèces)`, cible: `${C.pente} ± ${C.tolerance}`, etat: note(Math.abs(d1.pente - C.pente), C.tolerance), detail: { depart: dam0, fin: d1 }, source: C.source + " (l'assemblage l'a posée : le moteur ne doit pas la défaire)" });
}
const comptes = { ok: 0, limite: 0, echec: 0 }; for (const t of tests) comptes[t.etat]++;
const rapport = { etalon: 1, monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), ans: ANS, depart: JSON.parse(fs.readFileSync(f, 'utf8')).cycle.date.slice(0, 10), fin: I.cycle.jour,
  duree_s: Math.round((Date.now() - t0) / 1000), comptes, tests };
const S = { ok: '✓', limite: '≈', echec: '✗' };
console.log(`L'étalon (${MONDE}, ${ANS} an${ANS > 1 ? 's' : ''}, ${rapport.depart} → ${rapport.fin}) : ${comptes.ok} ✓, ${comptes.limite} ≈, ${comptes.echec} ✗`);
for (const t of tests) console.log(`  ${S[t.etat]} ${t.nom} : ${t.valeur_dite ?? t.valeur} — cible ${t.cible}`);
const sortie = arg('--sortie'); if (sortie) { fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true }); fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1)); console.log('→', sortie); }
