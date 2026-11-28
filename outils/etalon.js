// Orvane — L'ÉTALON (outils/etalon.js) — docs/53
// Le monde d'Orvane est inventé : rien ne dit si ses lynx mangent trop, si ses hivers usent assez. L'Europe (mondes/europe/, docs/52)
// tourne sur le même moteur, avec de vraies espèces et un vrai climat : là, la réalité sait la réponse. L'étalon fait vivre l'Europe
// plusieurs années, sans joueurs, et note le moteur sur ce que la réalité connaît ET que l'assemblage n'a pas calé :
//  1. la stabilité : chaque espèce garde son ordre de grandeur d'une année sur l'autre (la moyenne de sa dernière année, rapportée à
//     celle d'avant : deux moyennes sur toutes les saisons ; la première année est celle du calage, docs/53), et aucune ne s'éteint ;
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
// Une année d'Europe prend ~25 minutes sur un ordinateur. Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path');
const Orvane = require('../moteur/orvane.js');
// (docs/59) le protocole : les cibles et les tolérances de chaque test, fixées avant de lancer l'étalon, et verrouillées. L'étalon n'en a
// pas d'autres. Un protocole changé sans nouvelle version, ou une règle du moteur que le protocole ne dit pas (pendant le moratoire, puis
// depuis qu'il est levé, sans une version qui l'ajoute) : l'étalon refuse de juger
// (--protocole-libre : il juge quand même, et son rapport le dit)
const Protocole = require('./protocole.js'), PROTOCOLE = Protocole.lire(), SE = id => Protocole.seuils(PROTOCOLE, id);
const PB = Protocole.verifier(PROTOCOLE, { regles: Object.keys(Orvane.REGLES) }), LIBRE = process.argv.includes('--protocole-libre');
if (PB.length && !LIBRE) { console.error('le protocole ne tient pas (etalon/protocole.json, docs/59) :\n' + PB.map(x => '  ✗ ' + x).join('\n') + '\n(--protocole-libre pour juger quand même)'); process.exit(3); }
const SIGNE = { version: PROTOCOLE.version, date: PROTOCOLE.date, empreinte: PROTOCOLE.empreinte, ...(PB.length ? { verrouille: false, problemes: PB } : {}) };
// chaque test porte sa nature (validation, guide, réglage, garde-fou, calage) ; un test que le protocole ne connaît pas n'est pas jugé
const signer = L => L.map(t => { const P = PROTOCOLE.tests[t.id]; if (!P) throw new Error(`le test ${t.id} n'est pas dans le protocole (etalon/protocole.json)`); return { ...t, nature: P.nature }; });
const NAT = { validation: 'validation', guide: 'guide', reglage: 'réglage', 'garde-fou': 'garde-fou', calage: 'calage' };
const bilanNatures = L => Object.keys(NAT).map(n => { const X = L.filter(t => t.nature === n); if (!X.length) return null; const c = k => X.filter(t => t.etat === k).length;
  return `${NAT[n]} ${c('ok')} ✓ ${c('limite')} ≈ ${c('echec')} ✗`; }).filter(Boolean).join(' · ');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const MONDE = arg('--monde', 'europe'), ANS = Math.max(1, +arg('--ans', 3)), racine = p => path.join(__dirname, '..', p);
const somme = L => L.reduce((s, x) => s + x, 0), r = (x, d = 3) => +Number(x).toFixed(d), clamp = (v, x, y) => Math.min(y, Math.max(x, v));
const doy = j => { const d = new Date(j + 'T12:00:00Z'); return Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1; };
const dateDe = n => new Date(Date.UTC(2027, 0, 1) + (n - 1) * 864e5).toISOString().slice(5, 10).split('-').reverse().join('/');
const classe = t => t.reel?.classe ?? String(t.reel?.groupe || '').split(' ')[0];

// --- plusieurs histoires (--graines K) : le hasard du moteur (les catastrophes, la fondation d'un lieu, les mutations) vient de la graine du
// monde ; une autre graine, une autre histoire aussi plausible. Chaque graine tourne dans son processus, sur son cœur (le moteur est au bit
// près pour une graine donnée) ; un test passe s'il passe pour toutes, il est limite si elles ne s'accordent pas. Le rapport garde chacune
const GRAINES = Math.max(1, +arg('--graines', 1));
if (GRAINES > 1) {
  const { spawn } = require('child_process'), os = require('os'), f0 = arg('--amorce', path.join(__dirname, '..', 'mondes', MONDE, 'amorce.json'));
  const g0 = +arg('--graine', JSON.parse(fs.readFileSync(f0, 'utf8')).monde.graine >>> 0), seeds = Array.from({ length: GRAINES }, (_, i) => (g0 + i * 7919) >>> 0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etalon-')), sans = []; for (let i = 0; i < a.length; i++) { if (['--graines', '--graine', '--sortie'].includes(a[i])) { i++; continue; } sans.push(a[i]); }
  const par = Math.max(1, Math.min(GRAINES, os.cpus().length - 1, +arg('--paralleles', 3))), fins = [];
  const lancer = (g, i) => new Promise(ok => { const out = path.join(tmp, `g${i}.json`), c = spawn(process.execPath, [...process.execArgv, __filename, ...sans, '--graine', String(g), '--sortie', out], { stdio: ['ignore', 'ignore', 'pipe'] });
    c.stderr.on('data', d => process.stderr.write(String(d).split('\n').filter(Boolean).map(l => `[graine ${g}] ${l}`).join('\n') + '\n')); c.on('close', () => ok(fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null)); });
  (async () => { const R = new Array(GRAINES); let next = 0;
    await Promise.all(Array.from({ length: par }, async () => { while (next < GRAINES) { const i = next++; R[i] = await lancer(seeds[i], i); } }));
    const bons = R.filter(Boolean); if (!bons.length) { console.error('aucune graine n\'a fini'); process.exit(1); }
    const etat = L => L.every(e => e === 'ok') ? 'ok' : L.every(e => e === 'echec') ? 'echec' : 'limite';
    const tests = bons[0].tests.map(t0 => { const L = bons.map(b => b.tests.find(t => t.id === t0.id)).filter(Boolean);
      return { ...t0, valeur: L.map(t => t.valeur), valeur_dite: L.map(t => t.valeur_dite ?? t.valeur).join(' | '), etat: etat(L.map(t => t.etat)), detail: undefined }; });
    const comptes = { ok: 0, limite: 0, echec: 0 }; for (const t of tests) comptes[t.etat]++;
    const rapport = { ...bons[0], protocole: SIGNE, graines: seeds.map((g, i) => ({ graine: g, ...(R[i] ? { comptes: R[i].comptes, tests: R[i].tests, ...(R[i].serie ? { serie: R[i].serie } : {}) } : { echec: 'n\'a pas fini' }) })), comptes, tests, serie: undefined };
    const S = { ok: '✓', limite: '≈', echec: '✗' };
    console.log(`L'étalon${bons[0].experience ? ` (${bons[0].experience})` : ''} sur ${GRAINES} graines (${seeds.join(', ')}) : ${comptes.ok} ✓, ${comptes.limite} ≈, ${comptes.echec} ✗`);
    for (const t of tests) console.log(`  ${S[t.etat]} [${NAT[t.nature] ?? '?'}] ${t.nom} : ${t.valeur_dite} — cible ${t.cible}`);
    console.log(`  (le protocole, version ${SIGNE.version} : ${bilanNatures(tests)})`);
    const so = arg('--sortie'); if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(rapport, null, 1)); console.log('→', so); }
    fs.rmSync(tmp, { recursive: true, force: true }); })();
  return;
}

// --- les cibles (la réalité) ---
const CIBLES = {
  stabilite: { ...SE('stabilite'), source: "un monde sans joueurs, au même climat, garde ses espèces : chacune à moins d'un facteur 2 de sa première année" },
  naissances: {
    chevreuil: { ...SE('naissances-chevreuil'), source: 'les chevrillards naissent de mi-mai à mi-juin (Andersen et al., The European Roe Deer, 1998)' },
    'cerf-elaphe': { ...SE('naissances-cerf-elaphe'), source: 'les faons du cerf élaphe naissent de fin mai à juin (Clutton-Brock et al., Red Deer, 1982)' }
  },
  cigogne: { depart: { ...SE('cigogne-depart'), source: 'les cigognes blanches quittent l’Europe de début août à début septembre' },
    retour: { ...SE('cigogne-retour'), source: 'elles reviennent de mi-février à début avril' } },
  carnivores: { a: SE('carnivores').a, b: SE('carnivores').b, tolerance: Math.log10(SE('carnivores').facteur), limite: Math.log10(SE('carnivores').facteur_limite), source: 'Carbone & Gittleman 2002, Science 295 : 89,1 × M^−1,05 carnivores par 10 000 kg de proies' },
  damuth: { ...SE('damuth'), source: 'Damuth 1981 : la densité des mammifères ∝ masse^−0,75' },
  rendement: { ...SE('rendement'), source: "Humphreys 1979 (J. Anim. Ecol. 48) : une bête à sang chaud fait de sa chair 1 à 3 % de ce qu'elle assimile, une à sang froid de 10 à 40 % ; le reste part en chaleur (Lindeman 1942). Plus serait créer de la chair de rien" },
  diversite: { ...SE('diversite'), source: "un monde sans joueurs, au même climat, ne s'appauvrit pas en silence : l'entropie de Shannon des parts de biomasse de chaque lieu garde au moins 90 % de ce qu'elle était" }
};
const note = (ecart, tol) => ecart <= tol ? 'ok' : ecart <= 2 * tol ? 'limite' : 'echec';

// --- les mesures d'un état ---
// la diversité de chaque lieu : l'entropie de Shannon des parts de biomasse de ses bêtes (−Σ p ln p), en moyenne sur les lieux
function shannon(I) { const L = new Map(); for (const t of I.taxons) { if (t.plan.regime === 'vegetal') continue; const m = t.plan.masse_kg || 1;
    for (const p of t.populations) if (p.effectif > 0) (L.get(p.biome) || L.set(p.biome, []).get(p.biome)).push(p.effectif * m); }
  let H = 0; for (const B of L.values()) { const S = somme(B); for (const b of B) { const q = b / S; if (q > 0) H -= q * Math.log(q); } } return L.size ? H / L.size : 0; }
// les carnivores (mammifères carnivores d'au moins 0,5 kg) : leur nombre par 10 000 kg des proies que le moteur leur laisse (les vertébrés :
// les mammifères, les oiseaux, les poissons, les reptiles, les amphibiens), là où ils vivent. Le loup, l'ours, les lynx sont à part : en Europe,
// ce sont les hommes qui les tiennent sous ce que leurs proies nourriraient ; dans un monde sans joueurs, ils doivent remonter vers la loi
const VERTEBRES = new Set(['Mammalia', 'Aves', 'Actinopterygii', 'Elasmobranchii', 'Squamata', 'Testudines', 'Amphibia']), TENUS = new Set(['loup', 'lynx-boreal', 'lynx-pardelle', 'ours-brun', 'glouton']);
function carnivores(I) {
  const T = I.taxons.filter(t => !t.eteint && t.populations.length), parLieu = new Map();
  for (const t of T) for (const p of t.populations) (parLieu.get(p.biome) || parLieu.set(p.biome, []).get(p.biome)).push([t, p.effectif]);
  const out = [];
  for (const c of T) { if (classe(c) !== 'Mammalia' || c.plan.regime !== 'carnivore' || (c.plan.masse_kg || 0) < .5 || c.guilde) continue;
    let N = 0, B = 0;
    for (const p of c.populations) { const ici = parLieu.get(p.biome) || []; let b = 0;
      for (const [q, n] of ici) if (q !== c && VERTEBRES.has(classe(q)) && q.plan.regime !== 'vegetal' && Orvane.appetence(c.plan, q.plan) > 0) b += n * (q.plan.masse_kg || 1);
      if (b > 0) { N += p.effectif; B += b; } }
    if (!(B > 0) || !(N > 0)) continue;
    const obs = N / (B / 1e4), att = CIBLES.carnivores.a * Math.pow(c.plan.masse_kg, CIBLES.carnivores.b);
    out.push({ id: c.id, nom: c.nom, masse_kg: c.plan.masse_kg, effectif: Math.round(N), proies_t: Math.round(B / 1e3), par_10t: r(obs, 3), attendu: r(att, 3), ecart_log10: r(Math.log10(obs / att), 3), ...(TENUS.has(c.id) ? { tenu_par_les_hommes: true } : {}) }); }
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
  const A = JSON.parse(fs.readFileSync(f, 'utf8')); if (arg('--graine') != null) A.monde.graine = +arg('--graine') >>> 0;   // (une autre histoire : --graines)
  const PAYS = new Set(['FR', 'IT', 'CH', 'MC']), GARDE = new Set(['loup', 'cerf-elaphe', 'chevreuil', 'daim', 'sanglier', 'chamois', 'isard', 'bouquetin-alpes', 'mouflon', 'lievre-europe', 'lievre-variable', 'lapin', 'marmotte', 'castor']);
  const B = A.biomes.filter(b => PAYS.has(b.lieu?.pays)), ids = new Set(B.map(b => b.id)), pays = new Map(B.map(b => [b.id, b.lieu.pays]));
  for (const b of B) b.voisins = b.voisins.filter(v => ids.has(v));
  const T = A.taxons.filter(t => GARDE.has(t.id)).map(t => ({ ...t, populations: t.populations.filter(p => ids.has(p.biome)) })).filter(t => t.populations.length);
  const loup = T.find(t => t.id === 'loup'); loup.populations = loup.populations.filter(p => pays.get(p.biome) === 'IT').map(p => ({ ...p, effectif: +(p.effectif * .3).toFixed(4) }));
  let E = { ...A, monde: { ...A.monde, flore: undefined, phenologie: undefined, hommes: undefined, parcelles: { ...A.monde.parcelles, types: A.monde.parcelles.types.filter(ty => B.some(b => b.type === ty.id)) } }, biomes: B, taxons: T, cycle: { ...A.cycle, date: '1992-01-01T03:17:00.000Z' } };
  // les proies à leur équilibre dans ce morceau d'Europe : sans les plantes ni les autres bêtes, la place que l'assemblage leur a calée dans
  // l'Europe entière ne leur convient plus (chaque recalage de l'Europe changeait le loup de France du simple au quadruple). Comme
  // l'assemblage, un jour de moteur, quatre fois : la place de chaque brouteur pour que ses naissances égalent ses morts et les siens mangés.
  // Le loup n'est pas touché
  for (let pass = 0; pass < 4; pass++) { const brut = [], X = new Map(), J = Orvane.cycle(E, {}, { duree_ms: 864e5, trace: x => brut.push(x) }), PRO = new Map(J.biomes.map(b => [b.id, b.saison?.production ?? 1]));
    for (const x of brut) { const o = X.get(x.taxon) || X.set(x.taxon, { N: 0, conv: 0, pred: 0, ps: 0 }).get(x.taxon); o.N += x.N; o.conv += x.conv * x.N; o.pred += x.mortsPred; o.ps += x.sat * x.N * (PRO.get(x.biome) ?? 1); }
    for (const t of E.taxons) { const o = X.get(t.id); if (t.id === 'loup' || !o || !(o.N > 0) || !['herbivore', 'omnivore'].includes(t.plan.regime)) continue;
      const m = 365.25 / Math.max(2, t.plan.longevite), p = o.pred / o.N * 365.25, cible = clamp(1 - (m + p) / Math.max(1e-9, t.plan.natalite * o.conv / o.N), .2, .97), sa = o.ps / o.N;
      if (sa > 1e-6) t.plan = { ...t.plan, place: +clamp((t.plan.place ?? 1) * sa / cible, .0005, 100).toPrecision(4) }; } }
  const ANSX = +arg('--ans', 31), REEL = { 1992: 2, 2000: 35, 2005: 60, 2010: 190, 2015: 300, 2018: 430, 2020: 580, 2023: 1100 }, serie = [], t1 = Date.now();
  const enFrance = I => { const w = I.taxons.find(t => t.id === 'loup'); return w ? somme(w.populations.filter(p => pays.get(p.biome) === 'FR').map(p => p.effectif)) : 0; };
  const lieuxFR = I => (I.taxons.find(t => t.id === 'loup')?.populations || []).filter(p => pays.get(p.biome) === 'FR').length;
  serie.push({ an: 1992, france: 0, lieux: 0, italie: Math.round(somme(loup.populations.map(p => p.effectif))) });
  for (let y = 0; y < ANSX; y++) { for (let k = 0; k < 365; k++) E = Orvane.cycle(E, {}, { duree_ms: 864e5 });
    const w = E.taxons.find(t => t.id === 'loup'); serie.push({ an: 1993 + y, france: Math.round(enFrance(E)), lieux: lieuxFR(E), italie: Math.round(somme((w?.populations || []).filter(p => pays.get(p.biome) === 'IT').map(p => p.effectif))) });
    process.stderr.write(`le loup : ${1993 + y}, ${serie[serie.length - 1].france} en France (${serie[serie.length - 1].lieux} lieux), ${serie[serie.length - 1].italie} en Italie (${((Date.now() - t1) / (y + 1) / 1000).toFixed(0)} s par an)\n`); }
  const premier = serie.find(x => x.france >= 2)?.an ?? null, cent = serie.find(x => x.france >= 100)?.an ?? null, fin = serie[serie.length - 1];
  const tests = signer([
    { id: 'loup-arrivee', nom: 'Le loup arrive en France', valeur: premier, cible: `au plus tard en ${SE('loup-arrivee').ok} (le premier en 1992)`, etat: premier != null && premier <= SE('loup-arrivee').ok ? 'ok' : premier != null && premier <= SE('loup-arrivee').limite ? 'limite' : 'echec' },
    { id: 'loup-cent', nom: 'Cent loups en France', valeur: cent, cible: `vers ${SE('loup-cent').annee} (± ${SE('loup-cent').ecart} ans)`, etat: cent != null && Math.abs(cent - SE('loup-cent').annee) <= SE('loup-cent').ecart ? 'ok' : cent != null && Math.abs(cent - SE('loup-cent').annee) <= SE('loup-cent').ecart_limite ? 'limite' : 'echec' },
    { id: 'loup-2023', nom: `Les loups de France en ${fin.an}`, valeur: fin.france, cible: `~${REEL[2023]} (à moins d'un facteur ${SE('loup-2023').facteur})`, etat: fin.france > 0 && Math.abs(Math.log10(fin.france / REEL[2023])) <= Math.log10(SE('loup-2023').facteur) ? 'ok' : fin.france > 0 && Math.abs(Math.log10(fin.france / REEL[2023])) <= Math.log10(SE('loup-2023').facteur_limite) ? 'limite' : 'echec' }]);
  const rapport = { etalon: 1, experience: 'loup', protocole: SIGNE, monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), ans: ANSX, lieux: B.length, reel: REEL, serie, tests };
  const S = { ok: '✓', limite: '≈', echec: '✗' }; console.log(`Le retour du loup (France, Italie, Suisse ; ${ANSX} ans) :`); for (const t of tests) console.log(`  ${S[t.etat]} [${NAT[t.nature]}] ${t.nom} : ${t.valeur ?? 'jamais'} — cible ${t.cible}`);
  const so = arg('--sortie'); if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(rapport, null, 1)); console.log('→', so); }
  process.exit(0);
}
// --- une expérience : la vague du chacal doré (--experience chacal) ---
// Une validation que rien n'a réglée : la dispersion a été posée d'après le loup ; le chacal doit la confirmer. Vers 1980, il ne vit plus en
// Europe que dans les Balkans (la Bulgarie, la Grèce, la Thrace, la côte dalmate) ; il gagne ensuite l'Europe centrale puis l'ouest. Ce que
// la réalité a vu, les premières observations par pays (Arnold et al. 2012, Mammal Review 42 ; Trouwborst et al. 2015, Biodivers. Conserv. 24) :
// l'Italie 1984, l'Autriche 1987, la Slovaquie 1989, l'Allemagne 1997, la Tchéquie 2006, la Suisse 2011, la Pologne et le Danemark 2015,
// les Pays-Bas 2016, la France 2017. Une première observation est souvent un jeune de passage, loin devant le front : le moteur, qui compte
// une lignée installée (au moins deux bêtes dans le pays), doit arriver un peu plus tard. Avec le chacal, ses proies et le renard, son
// concurrent, mis à leur équilibre comme pour le loup ; ni les plantes ni les autres bêtes
if (arg('--experience') === 'chacal') {
  const A = JSON.parse(fs.readFileSync(f, 'utf8')); if (arg('--graine') != null) A.monde.graine = +arg('--graine') >>> 0;
  const REELC = { IT: 1984, AT: 1987, SK: 1989, DE: 1997, CZ: 2006, CH: 2011, PL: 2015, DK: 2015, NL: 2016, FR: 2017 }, DEPART = new Set(['BG', 'GR', 'TR', 'HR']);
  const PAYS = new Set([...DEPART, ...Object.keys(REELC), 'RO', 'RS', 'BA', 'ME', 'HU', 'BE']);
  const GARDE = new Set(['chacal-dore', 'renard-roux', 'lievre-europe', 'lapin', 'campagnol-champs', 'campagnol-terrestre', 'campagnol-roussatre', 'mulot-sylvestre', 'mulot-collier', 'souris-grise', 'rat-noir', 'surmulot', 'faisan', 'perdrix-grise', 'perdrix-rouge', 'caille', 'hamster-commun', 'spermophile']);
  const B = A.biomes.filter(b => PAYS.has(b.lieu?.pays)), ids = new Set(B.map(b => b.id)), pays = new Map(B.map(b => [b.id, b.lieu.pays]));
  for (const b of B) b.voisins = b.voisins.filter(v => ids.has(v));
  const T = A.taxons.filter(t => GARDE.has(t.id)).map(t => ({ ...t, populations: t.populations.filter(p => ids.has(p.biome)) })).filter(t => t.populations.length);
  const ch = T.find(t => t.id === 'chacal-dore'); ch.populations = ch.populations.filter(p => DEPART.has(pays.get(p.biome)));
  let E = { ...A, monde: { ...A.monde, flore: undefined, phenologie: undefined, hommes: undefined, parcelles: { ...A.monde.parcelles, types: A.monde.parcelles.types.filter(ty => B.some(b => b.type === ty.id)) } }, biomes: B, taxons: T, cycle: { ...A.cycle, date: '1980-01-01T03:17:00.000Z' } };
  for (let pass = 0; pass < 4; pass++) { const brut = [], X = new Map(), J = Orvane.cycle(E, {}, { duree_ms: 864e5, trace: x => brut.push(x) }), PRO = new Map(J.biomes.map(b => [b.id, b.saison?.production ?? 1]));   // (les proies et le renard à leur équilibre)
    for (const x of brut) { const o = X.get(x.taxon) || X.set(x.taxon, { N: 0, conv: 0, pred: 0, ps: 0 }).get(x.taxon); o.N += x.N; o.conv += x.conv * x.N; o.pred += x.mortsPred; o.ps += x.sat * x.N * (PRO.get(x.biome) ?? 1); }
    for (const t of E.taxons) { const o = X.get(t.id); if (t.id === 'chacal-dore' || !o || !(o.N > 0) || !['herbivore', 'omnivore'].includes(t.plan.regime)) continue;
      const m = 365.25 / Math.max(2, t.plan.longevite), p = o.pred / o.N * 365.25, cible = clamp(1 - (m + p) / Math.max(1e-9, t.plan.natalite * o.conv / o.N), .2, .97), sa = o.ps / o.N;
      if (sa > 1e-6) t.plan = { ...t.plan, place: +clamp((t.plan.place ?? 1) * sa / cible, .0005, 100).toPrecision(4) }; } }
  const ANSX = +arg('--ans', 44), arrivee = {}, serie = [], t1 = Date.now(), parPays = I => { const w = I.taxons.find(t => t.id === 'chacal-dore'), o = {}; for (const p of w?.populations || []) { const c = pays.get(p.biome); o[c] = (o[c] || 0) + p.effectif; } return o; };
  for (let y = 0; y < ANSX; y++) { for (let k = 0; k < 365; k++) E = Orvane.cycle(E, {}, { duree_ms: 864e5 });
    const o = parPays(E), an = 1981 + y; for (const c of Object.keys(REELC)) if (arrivee[c] == null && (o[c] || 0) >= 2) arrivee[c] = an;
    serie.push({ an, ...Object.fromEntries(Object.entries(o).map(([c, n]) => [c, Math.round(n)])) });
    process.stderr.write(`le chacal : ${an}, ${Object.keys(REELC).filter(c => arrivee[c]).map(c => c + ' ' + arrivee[c]).join(', ') || 'encore dans les Balkans'} (${((Date.now() - t1) / (y + 1) / 1000).toFixed(0)} s par an)\n`); }
  const fin = 1980 + ANSX, ecarts = Object.entries(REELC).map(([c, r0]) => ({ pays: c, reel: r0, simule: arrivee[c] ?? null, ecart: (arrivee[c] ?? fin + 1) - r0 }));
  // (un pays jamais atteint est un écart sans fin : sans cela, la France, attendue en 2017, ne coûtait que sept ans à un chacal resté dans les Balkans)
  const med = (() => { const v = ecarts.map(e => e.simule == null ? Infinity : Math.abs(e.ecart)).sort((x, y) => x - y); return v[v.length >> 1]; })(), atteints = ecarts.filter(e => e.simule != null).length;
  const tests = signer([{ id: 'chacal-vague', nom: 'La vague du chacal doré', valeur: med, valeur_dite: `écart médian ${Number.isFinite(med) ? med + ' ans' : 'sans fin (la plupart des pays jamais atteints)'} ; ${atteints}/${ecarts.length} pays atteints en ${fin} — ${ecarts.map(e => `${e.pays} ${e.simule ?? '—'} (${e.reel})`).join(', ')}`,
    cible: `au moins ${SE('chacal-vague').pays} pays sur ${ecarts.length} atteints, à moins de ${SE('chacal-vague').ecart_ans} ans des premières observations en médiane (une première observation est souvent un jeune de passage)`, etat: med <= SE('chacal-vague').ecart_ans && atteints >= SE('chacal-vague').pays ? 'ok' : med <= SE('chacal-vague').ecart_limite && atteints >= SE('chacal-vague').pays_limite ? 'limite' : 'echec' }]);
  const rapport = { etalon: 1, experience: 'chacal', protocole: SIGNE, monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), ans: ANSX, lieux: B.length, reel: REELC, ecarts, serie, tests };
  const S = { ok: '✓', limite: '≈', echec: '✗' }; console.log(`La vague du chacal doré (${B.length} lieux ; ${ANSX} ans depuis 1980) :`); for (const t of tests) console.log(`  ${S[t.etat]} [${NAT[t.nature]}] ${t.nom} : ${t.valeur_dite} — cible ${t.cible}`);
  const so = arg('--sortie'); if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(rapport, null, 1)); console.log('→', so); }
  process.exit(0);
}
// --- une expérience : Isle Royale (--experience isle-royale, docs/57) ---
// Le premier pas vers l'Amérique. Isle Royale, une île de 544 km² au milieu du lac Supérieur : des loups et des orignaux, comptés chaque
// hiver depuis 1958, la plus longue étude d'un prédateur et de sa proie. Le monde de l'expérience : l'île (sa forêt boréale, son climat
// de CRU 1991–2020 : etalon/experiences/isle-royale.json) et les espèces de l'Europe qui y vivent — l'orignal (l'élan), le loup, le renard ;
// le castor et le lièvre variable pour le castor du Canada et le lièvre d'Amérique. Chacune garde ce que l'assemblage de l'Europe lui a
// donné : rien n'est calé sur l'île, sauf le castor, le lièvre et le renard, mis à leur équilibre comme les proies du retour du loup.
// Elle part de l'hiver 1980 (664 orignaux, 50 loups) ; les dix-neuf loups lâchés en 2018 et 2019 y sont lâchés. Ce que le moteur ne
// connaît pas : le parvovirus qui a fait tomber les loups de 50 à 14 (1981-1982), la consanguinité qui les a menés à deux (2016-2018),
// l'hiver de 1996 et ses tiques. On compare donc des ordres de grandeur, non une histoire : les orignaux et les loups de 1980 à 2018 en
// moyenne, la part des orignaux que les loups tuent chaque année, et ce que les orignaux fluctuent.
if (arg('--experience') === 'isle-royale') {
  const A = JSON.parse(fs.readFileSync(f, 'utf8')); if (arg('--graine') != null) A.monde.graine = +arg('--graine') >>> 0;
  const C = require('../moteur/calendrier.js'), IR = JSON.parse(fs.readFileSync(racine('etalon/experiences/isle-royale.json'), 'utf8')), L = IR.ile;
  const T0 = somme(L.normales.t) / 12, P0 = somme(L.normales.p), E0 = somme(L.normales.etp), npp = C.npp(T0, P0), K = Math.round(5 * npp * L.surface_km2);   // (la capacité d'un lieu de l'assemblage)
  const ile = { id: `${L.type}~isle-royale`, nom: IR.nom, type: L.type, milieu: 'terrestre',
    axes: { temperature: C.axeTemperature(T0), humidite: C.axeHumidite(P0, E0), altitude: C.axeAltitude(L.altitude_m), lumiere: C.axeLumiere(L.lat, L.couvert), couvert: L.couvert },
    capacite: K, capacite_base: K, voisins: [], lieu: { lat: L.lat, lon: L.lon, altitude_m: L.altitude_m, surface_km2: L.surface_km2, pays: L.pays, fuseau: L.fuseau }, normales: { ...L.normales, npp: Math.round(npp) } };
  const type = { ...A.monde.parcelles.types.find(t => t.id === L.type), axes: ile.axes, capacite: K, voisins: [] };
  // la densité de chaque espèce dans les lieux de ce type en Europe (là où elle vit), pour ce qu'on ne compte pas sur l'île
  const surf = new Map(A.biomes.map(b => [b.id, b.type === L.type ? b.lieu?.surface_km2 || 0 : 0]));
  const densite = t => { let n = 0, s = 0; for (const p of t.populations) { const k = surf.get(p.biome) || 0; if (k > 0) { n += p.effectif; s += k; } } return s > 0 ? n / s : 0; };
  const N0 = IR.comptes[0], an0 = N0.an, ESP = ['elan', 'loup', 'castor', 'lievre-variable', 'renard-roux'];
  const T = ESP.map(id => { const t = A.taxons.find(x => x.id === id); if (!t) throw new Error(`pas de ${id} dans l'amorce`);
    const n = id === 'elan' ? N0.orignaux : id === 'loup' ? N0.loups : Math.max(10, Math.round(densite(t) * L.surface_km2));
    return { ...t, populations: [{ biome: ile.id, effectif: n, tendance: 0, depuis: 0 }] }; });
  let E = { ...A, monde: { ...A.monde, flore: undefined, phenologie: undefined, hommes: undefined, parcelles: { ...A.monde.parcelles, types: [type] } },
    biomes: [ile], taxons: T, cycle: { ...A.cycle, n: 0, date: `${an0 - 1}-12-31T03:17:00.000Z` }, evenements: [] };
  // le castor, le lièvre et le renard à leur équilibre sur l'île (un jour de moteur, quatre fois, comme les proies du retour du loup) ;
  // l'orignal et le loup ne sont pas touchés
  const CALES = new Set(['castor', 'lievre-variable', 'renard-roux']);
  for (let pass = 0; pass < 4; pass++) { const brut = [], X = new Map(), J = Orvane.cycle(E, {}, { duree_ms: 864e5, trace: x => brut.push(x) }), PRO = new Map(J.biomes.map(b => [b.id, b.saison?.production ?? 1]));
    for (const x of brut) { const o = X.get(x.taxon) || X.set(x.taxon, { N: 0, conv: 0, pred: 0, ps: 0 }).get(x.taxon); o.N += x.N; o.conv += x.conv * x.N; o.pred += x.mortsPred; o.ps += x.sat * x.N * (PRO.get(x.biome) ?? 1); }
    for (const t of E.taxons) { const o = X.get(t.id); if (!CALES.has(t.id) || !o || !(o.N > 0) || !['herbivore', 'omnivore'].includes(t.plan.regime)) continue;
      const m = 365.25 / Math.max(2, t.plan.longevite), p = o.pred / o.N * 365.25, cible = clamp(1 - (m + p) / Math.max(1e-9, t.plan.natalite * o.conv / o.N), .2, .97), sa = o.ps / o.N;
      if (sa > 1e-6) t.plan = { ...t.plan, place: +clamp((t.plan.place ?? 1) * sa / cible, .0005, 100).toPrecision(4) }; } }
  // l'île jour après jour ; chaque hiver (le 15 février, au cœur du comptage), ses orignaux et ses loups ; chaque année, la part des
  // orignaux que les loups ont tuée (les orignaux mangés, rapportés à leur nombre moyen)
  const effectif = (I, id) => (I.taxons.find(t => t.id === id)?.populations || []).reduce((s, p) => s + p.effectif, 0);
  const fin = +arg('--jusqua', IR.comptes[IR.comptes.length - 1].an), lachers = new Map((IR.lachers || []).map(x => [x.quand, x.loups]));
  const serie = [], predation = []; let mange = 0, somN = 0, jours = 0; const t1 = Date.now();
  // (et le taux de prédation par loup en hiver, comme le mesure le projet : les orignaux tués du 15 janvier au 1er mars, par loup et par mois)
  const KR = IR.kill, hiver = { tues: 0, loupsJours: 0 }; let tuesJour = 0;
  for (let an = an0; an <= fin; an++) {
    for (let j = 0; j < (an % 4 ? 365 : 366); j++) {
      const jour = new Date(Date.parse(E.cycle.date) + 864e5).toISOString().slice(0, 10), l = lachers.get(jour);
      if (l) { const w = E.taxons.find(t => t.id === 'loup'); if (w) { const p = w.populations.find(q => q.biome === ile.id); if (p) p.effectif += l; else w.populations.push({ biome: ile.id, effectif: l, tendance: 0, depuis: E.cycle.n }); if (w.eteint) w.eteint = null; } }
      tuesJour = 0; E = Orvane.cycle(E, {}, { duree_ms: 864e5, trace: x => { if (x.taxon === 'elan') { mange += x.mortsPred || 0; somN += x.N; jours++; tuesJour += x.mortsPred || 0; } } });
      if (KR && an >= KR.de && an <= KR.a && jour.slice(5) >= '01-15' && jour.slice(5) <= '03-01') { hiver.tues += tuesJour; hiver.loupsJours += effectif(E, 'loup'); }
      if (jour.slice(5) === '02-15') serie.push({ an, orignaux: Math.round(effectif(E, 'elan')), loups: +effectif(E, 'loup').toFixed(1) });
    }
    predation.push({ an, part: somN > 0 ? +(mange / (somN / Math.max(1, jours))).toFixed(4) : null }); mange = 0; somN = 0; jours = 0;
    const s = serie[serie.length - 1]; process.stderr.write(`Isle Royale : ${an}, ${s?.orignaux} orignaux, ${s?.loups} loups (${((Date.now() - t1) / (an - an0 + 1) / 1000).toFixed(1)} s par an)\n`);
  }
  // ce que la réalité a vu, de 1980 à 2018 (avant les lâchers)
  const reel = IR.comptes.filter(x => x.an <= 2018), sim = serie.filter(x => x.an <= 2018 && reel.some(y => y.an === x.an)), moy = L2 => somme(L2) / Math.max(1, L2.length);
  const cv = L2 => { const u = moy(L2); return u > 0 ? Math.sqrt(moy(L2.map(x => (x - u) ** 2))) / u : 0; };
  const oR = moy(reel.map(x => x.orignaux)), oS = moy(sim.map(x => x.orignaux)), lR = moy(reel.map(x => x.loups)), lS = moy(sim.map(x => x.loups));
  const pS = moy(predation.filter(x => x.an <= 2018 && x.part != null).map(x => x.part)), cvR = cv(reel.map(x => x.orignaux)), cvS = cv(sim.map(x => x.orignaux));
  const fac = (x, y) => x > 0 && y > 0 ? Math.max(x / y, y / x) : Infinity, kS = hiver.loupsJours > 0 ? hiver.tues / hiver.loupsJours * 30 : null;
  const tests = signer([
    { id: 'ir-orignaux', nom: "Les orignaux de l'île (1980–2018, en moyenne)", valeur: Math.round(oS), valeur_dite: `${Math.round(oS)} (${(oS / L.surface_km2).toFixed(2)} par km²) ; en vrai ${Math.round(oR)}`, cible: `à moins d'un facteur ${String(SE('ir-orignaux').facteur).replace('.', ',')} de la réalité`, etat: fac(oS, oR) <= SE('ir-orignaux').facteur ? 'ok' : fac(oS, oR) <= SE('ir-orignaux').facteur_limite ? 'limite' : 'echec' },
    { id: 'ir-loups', nom: "Les loups de l'île (1980–2018, en moyenne)", valeur: r(lS, 1), valeur_dite: `${lS.toFixed(1)} ; en vrai ${lR.toFixed(1)}`, cible: `à moins d'un facteur ${SE('ir-loups').facteur} (le moteur ne connaît ni le parvovirus ni la consanguinité, qui les ont tenus bas)`, etat: fac(lS, lR) <= SE('ir-loups').facteur ? 'ok' : fac(lS, lR) <= SE('ir-loups').facteur_limite ? 'limite' : 'echec' },
    { id: 'ir-predation', nom: 'La part des orignaux que les loups tuent chaque année', valeur: r(pS, 3), valeur_dite: `${(100 * pS).toFixed(1)} %`, cible: `de ${Math.round(SE('ir-predation').de * 100)} à ${Math.round(SE('ir-predation').a * 100)} % (un orignal sur dix, la plupart des années)`, etat: pS >= SE('ir-predation').de && pS <= SE('ir-predation').a ? 'ok' : pS >= SE('ir-predation').de / 2 && pS <= SE('ir-predation').a * 2 ? 'limite' : 'echec', source: IR.predation.source },
    ...(KR ? [{ id: 'ir-kill', nom: "Ce qu'un loup tue en hiver", valeur: kS == null ? null : r(kS, 3), valeur_dite: kS == null ? '-' : `${kS.toFixed(2)} orignal par loup et par mois (${Math.max(KR.de, an0)}–${KR.a}) ; en vrai ${KR.moyenne}`, cible: `à moins d'un facteur ${SE('ir-kill').facteur} de ${SE('ir-kill').cible} (${KR.unite})`, etat: fac(kS, SE('ir-kill').cible) <= SE('ir-kill').facteur ? 'ok' : fac(kS, SE('ir-kill').cible) <= SE('ir-kill').facteur_limite ? 'limite' : 'echec', source: KR.source }] : []),
    { id: 'ir-fluctuations', nom: 'Les orignaux fluctuent', valeur: r(cvS, 2), valeur_dite: `coefficient de variation ${cvS.toFixed(2)} ; en vrai ${cvR.toFixed(2)}`, cible: `au moins ${SE('ir-fluctuations').part === .5 ? 'la moitié' : `${SE('ir-fluctuations').part} fois`} de ce qu'ils fluctuent en vrai`, etat: cvS >= cvR * SE('ir-fluctuations').part ? 'ok' : cvS >= cvR * SE('ir-fluctuations').part_limite ? 'limite' : 'echec' }]);
  const rapport = { etalon: 1, experience: 'isle-royale', protocole: SIGNE, monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), de: an0, a: fin, ile: { capacite: K, npp: Math.round(npp), surface_km2: L.surface_km2 },
    places: Object.fromEntries(E.taxons.map(t => [t.id, t.plan.place ?? null])), reel: IR.comptes, serie, predation, tests };
  const S = { ok: '✓', limite: '≈', echec: '✗' }; console.log(`Isle Royale (${an0}–${fin}) :`); for (const t of tests) console.log(`  ${S[t.etat]} [${NAT[t.nature]}] ${t.nom} : ${t.valeur_dite} — cible ${t.cible}`);
  const so = arg('--sortie'); if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(rapport, null, 1)); console.log('→', so); }
  process.exit(0);
}
// --- la vie de l'Europe, sans joueurs ---
let I = JSON.parse(fs.readFileSync(f, 'utf8')); if (arg('--graine') != null) I.monde.graine = +arg('--graine') >>> 0;
if (a.includes('--sans-hommes')) delete I.monde.hommes;   // (docs/56) un monde où personne ne chasse : ce que feraient les bêtes si les hommes cessaient   // (une autre histoire : --graines)
const animaux = I.taxons.filter(t => t.plan.regime !== 'vegetal'), ids = animaux.map(t => t.id), JOURS = +arg('--jours', 365 * ANS), parAn = new Array(ANS).fill(0);   // (--jours : un essai plus court)
const moyennes = Array.from({ length: ANS }, () => new Map(ids.map(id => [id, 0]))), nais = {}, cigogne = { depart: [], retour: [] }, extinctions = [];
for (const id of Object.keys(CIBLES.naissances)) nais[id] = new Array(367).fill(0);
const car0 = carnivores(I), dam0 = damuth(I), sha0 = shannon(I), t0 = Date.now();
// (garde-fou : le second principe) ce que les chasseurs font naître de chair, rapporté à ce qu'ils mangent (leur ration) : les vrais
// carnivores (un omnivore naît de ses plantes, un buveur de sang ne tue pas), à part les bêtes à sang chaud et à sang froid
const REND = { chaud: { prod: 0, mange: 0 }, froid: { prod: 0, mange: 0 } };
// (docs/56) ce que les hommes prennent la dernière année, espèce par espèce (les retraits extérieurs : sans joueurs, c'est la chasse)
const CHASSE = {};
const CH = new Map(animaux.filter(t => t.plan.regime === 'carnivore' && !(t.plan.diete?.sang > 0)).map(t => [t.id, { m: t.plan.masse_kg || 1, g: (t.plan.metabolisme ?? 1) < 1 ? REND.froid : REND.chaud }]));
for (let k = 0; k < JOURS; k++) {
  const an = Math.min(ANS - 1, Math.floor(k / 365)), parJour = {}; parAn[an]++;
  I = Orvane.cycle(I, {}, { duree_ms: 864e5, trace: x => { if (nais[x.taxon]) parJour[x.taxon] = (parJour[x.taxon] || 0) + x.nais;
    if (an === ANS - 1) { const c = CH.get(x.taxon); if (c) { c.g.prod += (x.nais || 0) * c.m; c.g.mange += x.ration || 0; } if (x.mortsExt > 0) CHASSE[x.taxon] = (CHASSE[x.taxon] || 0) + x.mortsExt; } } });   // (le rendement des chasseurs, la dernière année ; la chasse)
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
let tests = [];
{ // 1. la stabilité
  const C = CIBLES.stabilite, L = [];
  // (la dernière année contre l'avant-dernière : l'assemblage cale l'Europe sur sa première année, docs/53 ; ce qui suit, il ne l'a pas vu)
  const y0 = ANS >= 2 ? ANS - 2 : 0;
  for (const t of animaux) { const m0 = moyennes[y0].get(t.id), m1 = moyennes[ANS - 1].get(t.id); if (!(m0 > 0)) continue; L.push({ id: t.id, nom: t.nom, rapport: r(m1 / m0, 3) }); }
  const dans = L.filter(x => x.rapport >= 1 / C.facteur && x.rapport <= C.facteur).length / (L.length || 1);
  L.sort((x, y) => Math.abs(Math.log(y.rapport)) - Math.abs(Math.log(x.rapport)));
  tests.push({ id: 'stabilite', nom: 'La stabilité', valeur: r(dans, 3), cible: `≥ ${C.part} des espèces à moins d'un facteur ${C.facteur} de leur année d'avant${ANS === 1 ? ' (sur une année : la première contre elle-même, le test ne dit rien ; il faut --ans 2 au moins)' : ''}`,
    etat: ANS === 1 ? 'limite' : dans >= C.part && !extinctions.length ? 'ok' : dans >= C.part - C.marge_limite ? 'limite' : 'echec',
    detail: { especes: L.length, extinctions, plus_loin: L.slice(0, 12) }, source: C.source });
  // (docs/53) la stabilité tolère une espèce sur dix loin d'elle-même : celles-là, on les nomme. Aucune ne doit fondre de moitié ou doubler
  // d'une année sur l'autre, dans un monde sans joueurs, au même climat
  const hors = L.filter(x => x.rapport < 1 / C.facteur || x.rapport > C.facteur);
  tests.push({ id: 'hors', nom: 'Aucune espèce ne fond ni ne s\'emballe', valeur: hors.length, valeur_dite: hors.length ? `${hors.length} : ${hors.slice(0, 8).map(x => `${x.id} ×${x.rapport}`).join(', ')}` : 'aucune',
    cible: `aucune espèce sous ×${(1 / C.facteur).toFixed(1)} ni au-dessus de ×${C.facteur} de son année d'avant`, etat: ANS === 1 ? 'limite' : hors.length === 0 ? 'ok' : hors.length <= SE('hors').limite_max ? 'limite' : 'echec', detail: { hors }, source: C.source });
}
{ // 2. les saisons
  for (const [id, C] of Object.entries(CIBLES.naissances)) { const v = nais[id]; if (!v || !somme(v)) continue;
    // le jour médian des naissances (sur l'année tournante qui part du cœur de l'hiver, pour ne pas couper la saison)
    const tot = somme(v); let acc = 0, med = null; for (let j = 1; j <= 366; j++) { acc += v[j]; if (acc >= tot / 2) { med = j; break; } }
    const centre = (C.de + C.a) / 2, ecart = Math.max(0, Math.abs(med - centre) - (C.a - C.de) / 2);
    tests.push({ id: `naissances-${id}`, nom: `Les naissances : ${id}`, valeur: med, valeur_dite: dateDe(med), cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: note(ecart, C.tolerance_jours), detail: { par_mois: Array.from({ length: 12 }, (_, m) => Math.round(somme(v.slice(1 + Math.round(m * 30.5), 1 + Math.round((m + 1) * 30.5))))) }, source: C.source }); }
  for (const sens of ['depart', 'retour']) { const C = CIBLES.cigogne[sens], L = cigogne[sens];
    if (!L.length) { tests.push({ id: `cigogne-${sens}`, nom: `Les cigognes : ${sens === 'depart' ? 'le départ' : 'le retour'}`, valeur: null, cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: 'echec', detail: { pourquoi: 'les cigognes ne migrent pas (aucune migration annoncée)' }, source: C.source }); continue; }
    const j = L[0], centre = (C.de + C.a) / 2, ecart = Math.max(0, Math.abs(j - centre) - (C.a - C.de) / 2);
    tests.push({ id: `cigogne-${sens}`, nom: `Les cigognes : ${sens === 'depart' ? 'le départ' : 'le retour'}`, valeur: j, valeur_dite: dateDe(j), cible: `du ${dateDe(C.de)} au ${dateDe(C.a)}`, etat: note(ecart, C.tolerance_jours), detail: { jours: L.slice(0, ANS) }, source: C.source }); }
}
{ // 3. les prédateurs
  const C = CIBLES.carnivores, car1 = carnivores(I), med = L => { const v = L.filter(x => !x.tenu_par_les_hommes).map(x => Math.abs(x.ecart_log10)).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
  const m1 = med(car1), m0 = med(car0);
  // (les grands carnivores, que les hommes tiennent : sans joueurs, leur écart à la loi doit se réduire — on dit de combien)
  const grands = car1.filter(x => x.tenu_par_les_hommes).map(x => { const d = car0.find(y => y.id === x.id); return { id: x.id, depart: d ? r(Math.pow(10, d.ecart_log10), 3) : null, fin: r(Math.pow(10, x.ecart_log10), 3) }; });
  tests.push({ id: 'carnivores', nom: 'Les prédateurs : combien de carnivores vivent de dix tonnes de proies', valeur: m1 == null ? null : r(Math.pow(10, m1), 2), valeur_dite: m1 == null ? '-' : `écart médian ×${Math.pow(10, m1).toFixed(1)} (au départ ×${Math.pow(10, m0).toFixed(1)})`,
    cible: `à moins d'un facteur ${Math.pow(10, C.tolerance).toFixed(0)} de la loi (hors loup, ours, lynx, glouton)`, etat: m1 == null ? 'echec' : m1 <= C.tolerance ? 'ok' : m1 <= C.limite ? 'limite' : 'echec', detail: { grands_carnivores: grands, fin: car1, depart: car0 }, source: C.source + ". Les grands carnivores d'Europe sont tenus sous la loi par les hommes : ils sont dits à part (grands_carnivores), et doivent remonter vers elle dans un monde sans joueurs" });
}
{ // (docs/53) les grands carnivores : en Europe, les hommes les tiennent sous ce que leurs proies nourriraient ; dans un monde sans joueurs,
  // rien ne les tient bas : chacun doit croître, d'au moins 2 % par an (le loup remonte en vrai de 5 à 10 % par an, là où on le laisse).
  // (Leur écart à la loi des prédateurs le dirait aussi, mais il bouge avec leurs proies : on le donne, sans le noter)
  const c = tests.find(t => t.id === 'carnivores'), G = [];
  for (const id of ['loup', 'lynx-boreal', 'lynx-pardelle', 'ours-brun', 'glouton']) { const m0 = moyennes[0].get(id), m1 = moyennes[ANS - 1].get(id); if (!(m0 > 0)) continue;
    const parAn = Math.pow(m1 / m0, 1 / Math.max(1, ANS - 1)); G.push({ id, par_an: r(parAn, 3), loi: c?.detail?.grands_carnivores?.find(x => x.id === id) || null }); }
  const croissent = G.filter(x => x.par_an >= 1 + SE('grands-carnivores').croissance_par_an).length;
  tests.push({ id: 'grands-carnivores', nom: 'Les grands carnivores remontent (sans joueurs, rien ne les tient bas)', valeur: G.length ? r(croissent / G.length, 2) : null,
    valeur_dite: G.map(x => `${x.id} ${x.par_an >= 1 ? '+' : ''}${((x.par_an - 1) * 100).toFixed(1)} %/an`).join(', ') || '-', cible: `chacun croît d'au moins ${Math.round(SE('grands-carnivores').croissance_par_an * 100)} % par an`,
    etat: ANS === 1 || !G.length ? 'limite' : croissent === G.length ? 'ok' : croissent >= G.length / 2 ? 'limite' : 'echec', detail: { grands: G }, source: 'le loup remonte de 5 à 10 % par an en Europe, là où on le laisse (LCIE)' });
}
{ // (docs/56) les hommes : ce que la chasse du monde prend en un an, rapporté aux tableaux de chasse réels (dans les pays où l'espèce est posée).
  // Un taux que l'assemblage a dû borner (il y pose trop peu de bêtes pour ce que la chasse y prend) fait une chasse plus petite que la vraie
  const H = I.monde.hommes, P = (() => { try { return JSON.parse(fs.readFileSync(racine(`mondes/${MONDE}/hommes.json`), 'utf8')); } catch { return null; } })();
  if (H && P) { const L = [];
    for (const [cle, e] of Object.entries(P.especes || {})) { const ids = (e.taxons || [cle]).filter(id => H.especes?.[id]); if (!ids.length) continue;
      const pays = new Set(ids.flatMap(id => Object.keys(H.especes[id].taux))), reel = Object.entries(e.prelevements || {}).filter(([c]) => pays.has(c)).reduce((s, [, x]) => s + (x.n ?? x), 0);
      const monde = ids.reduce((s, id) => s + (CHASSE[id] || 0), 0); if (reel > 0) L.push({ id: cle, reel: Math.round(reel), monde: Math.round(monde), part: r(monde / reel, 2) }); }
    const parts = L.map(x => x.part).sort((x, y) => x - y), med = parts.length ? parts[parts.length >> 1] : null;
    tests.push({ id: 'chasse', nom: 'Les hommes : la chasse', valeur: med, valeur_dite: L.map(x => `${x.id} ${Math.round(100 * x.part)} %`).join(', ') || '-',
      cible: 'le monde prend au moins la moitié de ce que disent les tableaux de chasse (en médiane sur les espèces chassées)', etat: med == null ? 'limite' : med >= SE('chasse').ok ? 'ok' : med >= SE('chasse').limite ? 'limite' : 'echec',
      detail: { especes: L }, source: 'FACE (2025), Ungulate Harvest Report : les tableaux de chasse de 34 pays (docs/56)' }); }
}
{ // le garde-fou
  const C = CIBLES.damuth, d1 = damuth(I);
  { const C = CIBLES.rendement, v = {}, E = [];
    for (const g of ['chaud', 'froid']) { const o = REND[g], rd = o.mange > 0 ? o.prod / o.mange : null, c = C[g]; v[g] = rd == null ? null : r(rd, 4);
      E.push(rd == null ? 'echec' : rd >= c.de && rd <= c.a ? 'ok' : rd >= c.de / 2 && rd <= c.a * 2 ? 'limite' : 'echec'); }
    const pc = x => x == null ? '—' : `${(x * 100).toFixed(1)} %`;
    tests.push({ id: 'rendement', nom: 'Garde-fou : le rendement des chasseurs', garde_fou: true, valeur: v, valeur_dite: `à sang chaud ${pc(v.chaud)}, à sang froid ${pc(v.froid)} de ce qu'ils mangent devient des petits`,
      cible: `de ${C.chaud.de * 100} à ${C.chaud.a * 100} % (sang chaud), de ${C.froid.de * 100} à ${C.froid.a * 100} % (sang froid)`, etat: E.includes('echec') ? 'echec' : E.includes('limite') ? 'limite' : 'ok', source: C.source }); }
  { const h1 = shannon(I), q = sha0 > 0 ? h1 / sha0 : 1, C = CIBLES.diversite;
    tests.push({ id: 'diversite', nom: 'Garde-fou : la diversité des lieux', garde_fou: true, valeur: r(q, 3), valeur_dite: `Shannon ${r(h1, 3)} (au départ ${r(sha0, 3)}) : ×${q.toFixed(2)}`, cible: `au moins ×${C.min}`, etat: q >= C.min ? 'ok' : q >= 2 * C.min - 1 ? 'limite' : 'echec', source: C.source }); }
  tests.push({ id: 'damuth', nom: 'Garde-fou : la loi de Damuth', garde_fou: true, valeur: d1.pente, valeur_dite: `pente ${d1.pente} (au départ ${dam0.pente}, ${d1.especes} espèces)`, cible: `${C.pente} ± ${C.tolerance}`, etat: note(Math.abs(d1.pente - C.pente), C.tolerance), detail: { depart: dam0, fin: d1 }, source: C.source + " (l'assemblage l'a posée : le moteur ne doit pas la défaire)" });
}
{ // (docs/59) le calage : ce que l'assemblage n'a pas su caler. Une adresse à sa borne, un taux de chasse borné : un échec du moteur, compté
  // comme tel (la nature « calage » du protocole)
  const A = JSON.parse(fs.readFileSync(f, 'utf8')), Sa = SE('calage-adresse'), [b0, b1] = Sa.bornes;
  const ch = A.taxons.filter(t => !t.eteint && t.plan?.efficacite != null), haut = ch.filter(t => t.plan.efficacite >= b1 * .999), bas = ch.filter(t => t.plan.efficacite <= b0 * 1.001), n = haut.length + bas.length;
  if (ch.length) tests.push({ id: 'calage-adresse', nom: 'Le calage : les chasseurs à la borne de leur adresse', valeur: n, valeur_dite: `${n} sur ${ch.length} (${haut.length} à ×${b1}, ${bas.length} à ×${b0})`,
    cible: `aucun chasseur à une borne (×${b0} ou ×${b1}) ; au plus ${Sa.limite_max} ≈`, etat: n === 0 ? 'ok' : n <= Sa.limite_max ? 'limite' : 'echec', detail: { haut: haut.map(t => t.id), bas: bas.map(t => t.id) },
    source: "une adresse à sa borne est un mécanisme qui manque (docs/53, le cinquième rapport)" });
  const Hp = (() => { try { return JSON.parse(fs.readFileSync(racine(`mondes/${MONDE}/hommes.json`), 'utf8')); } catch { return null; } })();
  if (A.monde.hommes && Hp) { const Hx = require('./terre/hommes.js').taux(Hp, A), Sc = SE('calage-chasse'), tot = Object.values(Hx.especes).reduce((s, e) => s + Object.keys(e.taux || {}).length, 0), nb = Hx.bornes.length;
    tests.push({ id: 'calage-chasse', nom: 'Le calage : les taux de chasse bornés', valeur: tot ? r(nb / tot, 3) : null, valeur_dite: `${nb} sur ${tot}`, cible: `aucun taux borné ; au plus ${Math.round(Sc.limite_part * 100)} % ≈`,
      etat: nb === 0 ? 'ok' : nb <= Sc.limite_part * tot ? 'limite' : 'echec', detail: { bornes: Hx.bornes.slice(0, 40) }, source: "l'assemblage pose trop peu de bêtes pour ce que la chasse prend (docs/56)" }); }
}
tests = signer(tests);
const comptes = { ok: 0, limite: 0, echec: 0 }; for (const t of tests) comptes[t.etat]++;
const rapport = { etalon: 1, protocole: SIGNE, monde: MONDE, date: arg('--date', new Date().toISOString().slice(0, 10)), ans: ANS, depart: JSON.parse(fs.readFileSync(f, 'utf8')).cycle.date.slice(0, 10), fin: I.cycle.jour,
  duree_s: Math.round((Date.now() - t0) / 1000), comptes, tests };
const S = { ok: '✓', limite: '≈', echec: '✗' };
console.log(`L'étalon (${MONDE}, ${ANS} an${ANS > 1 ? 's' : ''}, ${rapport.depart} → ${rapport.fin}) : ${comptes.ok} ✓, ${comptes.limite} ≈, ${comptes.echec} ✗`);
for (const t of tests) console.log(`  ${S[t.etat]} [${NAT[t.nature]}] ${t.nom} : ${t.valeur_dite ?? t.valeur} — cible ${t.cible}`);
console.log(`  (le protocole, version ${SIGNE.version} : ${bilanNatures(tests)})`);
const sortie = arg('--sortie'); if (sortie) { fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true }); fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1)); console.log('→', sortie); }
