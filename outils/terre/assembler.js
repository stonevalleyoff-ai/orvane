// Orvane — ASSEMBLER UN MONDE RÉEL (outils/terre/assembler.js) — docs/52
// Fait d'une carte (lieux.json : des lieux réels, leurs valeurs physiques, outils/terre/LISEZ-MOI.md) et d'un vivant (especes.json : des
// espèces réelles, leurs traits, où elles vivent) l'amorce d'un monde Orvane au jour : mondes/<monde>/amorce.json.
//  - chaque lieu devient une parcelle (docs/15) d'un des biomes universels (moteur/biomes-universels.json) : ses axes viennent de son
//    climat, par les passages du calendrier (moteur/calendrier.js) ; sa capacité, de ce qui y pousse (la production primaire) et de sa
//    surface ; ses normales mensuelles (normales) font sa saison, jour après jour ;
//  - chaque espèce animale devient une lignée : sa niche est la moyenne des lieux où elle vit, sa tolérance leur dispersion ; sa
//    natalité (les petits qui passent leur première année, par tête et par an) se déduit de sa portée, de sa maturité et de sa
//    longévité ; ses effectifs de sa densité, de la surface de chaque lieu et de ce qu'il lui convient ;
//  - chaque plante devient une lignée de la flore (docs/17) : la place de chaque port (herbe, buisson, arbre…) dans un lieu se
//    partage entre les plantes de ce port qui y vivent ;
//  - le monde vit au jour (monde.temps = { jours: 1 }), au calendrier (monde.calendrier), avec la météo, les saisons des plantes et
//    les régimes en spectre déjà éveillés ; la spéciation, les traits nouveaux et les maladies tirées au hasard sont coupés.
//   node outils/terre/assembler.js [--monde europe] [--date 2026-11-17] [--rodage 0] [--sortie mondes/europe/amorce.json]
'use strict';
const fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', '..', p);
const C = require('../../moteur/calendrier.js'), Orvane = require('../../moteur/orvane.js'), Flore = require('../../moteur/flore.js'), Meteo = require('../../moteur/meteo.js');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const MONDE = arg('--monde', 'europe'), D = arg('--dossier') ? path.resolve(arg('--dossier')) : R(`mondes/${MONDE}`);   // (--dossier : une carte et un vivant ailleurs, pour un essai)
const lire = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d;
const clamp = (v, x = 0, y = 1) => Math.min(y, Math.max(x, v)), r4 = v => +(+v).toFixed(4), r6 = v => +(+v).toFixed(6), somme = L => L.reduce((s, x) => s + x, 0);

// --- les réglages de l'assemblage ---
const A = {
  // la capacité d'un lieu (kg de bêtes que sa production nourrit) : K = facteur × production primaire (g/m²/an) × surface (km²)
  capacite: 5,
  production_eau: { lac: 400, riviere: 350, marais: 1200, cote: 600, large: 180, 'mer-froide': 260, abysses: 15, banquise: 20 },   // (g/m²/an, quand le climat ne la dit pas)
  survie_jeune: m => m >= 20 ? .6 : m >= 1 ? .45 : m >= .05 ? .3 : .2,   // la part des petits qui passent leur première année, selon la masse
  survie_jeune_froid: .05,   // … et chez une bête à sang froid (un amphibien, un reptile) : la plupart des têtards, des petits ne passent pas l'année (docs/53 : à la survie d'un mammifère, la salamandre doublait chaque année)
  meutes: { 'Canis lupus': 6, 'Orcinus orca': 5, 'Lycaon pictus': 8, 'Panthera leo': 4 },
  tolerance: [.2, .7],
  plancher: 4,                // une population de moins de bêtes n'est pas posée
  sang_chaud: new Set(['Mammalia', 'Aves']), sang_froid: .15,   // ce que brûlent les autres, rapporté à un mammifère de leur masse
  natalite_pontes: [0, 1.2],
  front: 25,                  // le front d'une espèce qui s'étend avance chaque année de sa plus longue dispersion / 25 (calé sur le loup)
  dispersion_oiseau: 300,     // la plus longue dispersion d'un oiseau qui vole (km)
  efficacite: [.02, 50],      // l'adresse d'un chasseur, que le calage règle (plus bas) : de 1/50 à 50 fois celle du moteur
  vie_sauvage: 3,              // la vie sauvage d'un oiseau ou d'un mammifère, en années : 3 × masse^0,3 (un cerf ~14 ans, un lapin 3,6, un mulot 1)
  equilibre: [.1, 10]          // la capacité d'un lieu : celle où ses brouteurs comptés sont à l'équilibre, entre 0,1 et 10 fois ce que donne sa production (plus bas)
};
// --- les règles du moteur pour un monde réel (monde.regles) ---
const REGLES = {
  naissances: { force: 1 },  // les petits naissent à leur saison (docs/52)
  nouveau_trait: 0,          // une espèce réelle ne se donne pas de trait nouveau…
  separation: { chance: 0 },  // … ni ne se sépare en deux (à l'échelle d'une vie humaine)
  maladie: { chance: 0 },    // les maladies seront des souches réelles (docs/52, plus tard), pas des épidémies tirées au hasard
  hybride: { actif: false },
  besoin: 6, conversion: .06, // un prédateur mange chaque jour ce que mange une vraie bête (un loup ~1 kg/jour), et peu de cette viande fait des petits
  demi_satiete: 5,           // … et il est rassasié à moitié quand il a cinq fois ce besoin à sa portée (le besoin a grandi : trente fois, il crevait de faim)
  petites_proies: true,      // un mangeur d'insectes prend les insectes, si petits soient-ils
  concurrence_masse: .7,       // deux chasseurs se gênent d'autant moins que leurs masses diffèrent (0,7 décade : l'araignée et la mésange presque pas)
  diapause: { plancher: .1 },  // une bête à sang froid passe l'hiver en diapause : elle meurt, mange, se montre dix fois moins (docs/53)
  viande_part: true,         // un omnivore ne cherche en proies que sa part de chair (docs/53)
  domination: .5,            // entre chasseurs à sang chaud, le plus grand domine le plus petit (docs/53)
  renouvellement: 120,       // une proie offre ce qui est sur pied et ce qui en naît pendant les ~120 jours où se compte le besoin d'un chasseur (docs/53)
  longevite_predateur: 0,
  // les migrateurs partent quand les jours passent sous 13 h 30 après l'été (fin août à 50° N), et reviennent quand ils repassent au-dessus de
  // 11 h 30 (début mars) : un seuil pour tous, tiré de ce que font la plupart des migrateurs d'Europe — pas réglé sur une espèce (docs/53)
  hivernage: { actif: 1, photoperiode: { depart: 13.5, retour: 11.5, largeur: 30 } },
  colonisation: .005         // une lignée fonde un lieu voisin où elle n'est pas de loin en loin : ~1,5 % par an et par voisin favorable
};

const U = Object.fromEntries(require('../../moteur/biomes-universels.json').map(b => [b.id, b]));
const CORPS_OK = new Set(Object.keys(require('../../schemas/instantane.schema.json').properties.taxons.items.properties.plan.properties.corps.properties));
const carte = lire(path.join(D, 'lieux.json')), vivant = lire(path.join(D, 'especes.json')), sources = lire(path.join(D, 'sources.json'), []);
if (!carte) { console.error(`pas de carte : ${path.join(D, 'lieux.json')}`); process.exit(1); }
if (!vivant) { console.error(`pas de vivant : ${path.join(D, 'especes.json')}`); process.exit(1); }

// --- 1. les lieux ---
const EAU = new Set(['aquatique', 'marin']);
const biomes = [];
for (const L of carte.lieux) {
  const T = U[L.type]; if (!T) { console.warn(`type inconnu : ${L.type} (${L.id}) : laissé de côté`); continue; }
  const li = L.lieu || {}, cl = L.climat || L.normales || {}, t = cl.t, p = cl.p, milieu = L.milieu || T.milieu;
  const T0 = Array.isArray(t) ? somme(t) / 12 : null, P0 = Array.isArray(p) ? somme(p) : null;
  const etp = Array.isArray(cl.etp) && cl.etp.length === 12 ? cl.etp : Array.isArray(t) && Number.isFinite(li.lat) ? C.etpThornthwaite(t, li.lat) : null, E0 = etp ? somme(etp) : null;
  const couvert = EAU.has(milieu) || milieu === 'amphibie' && L.type === 'cote' ? T.axes.couvert : clamp(li.couvert_arbre ?? T.axes.couvert);
  const axes = {
    temperature: T0 != null ? C.axeTemperature(T0) : T.axes.temperature,
    humidite: EAU.has(milieu) ? 1 : P0 != null && E0 ? C.axeHumidite(P0, E0) : T.axes.humidite,
    altitude: milieu === 'marin' ? 0 : Number.isFinite(li.altitude_m) ? C.axeAltitude(li.altitude_m) : T.axes.altitude,
    lumiere: L.type === 'abysses' ? 0 : Number.isFinite(li.lat) ? C.axeLumiere(li.lat, couvert) : T.axes.lumiere,
    couvert: r4(couvert)
  };
  if (L.type === 'marais' || milieu === 'amphibie') axes.humidite = Math.max(axes.humidite, .85);
  const prod = Number.isFinite(cl.npp) && cl.npp > 0 && !EAU.has(milieu) ? cl.npp : A.production_eau[L.type] ?? (T0 != null && P0 != null ? C.npp(T0, P0) : 500);
  const capacite = Math.round(A.capacite * prod * Math.max(1, li.surface_km2 || 1));
  const b = { id: L.id, nom: L.nom || L.id, type: L.type, milieu, axes, capacite, voisins: [...new Set(L.voisins || [])], capacite_base: capacite,
    lieu: Object.fromEntries(Object.entries(li).filter(([, v]) => v != null)) };
  if (Array.isArray(t) && t.length === 12) b.normales = { t: t.map(r4), ...(Array.isArray(p) && p.length === 12 ? { p: p.map(r4) } : {}), ...(etp ? { etp: etp.map(r4) } : {}), ...(Number.isFinite(prod) ? { npp: Math.round(prod) } : {}) };
  else b.saisons = T.saisons ?? undefined;
  if (L.type === 'abysses') b.saisons = false;
  biomes.push(b);
}
const ids = new Set(biomes.map(b => b.id)); for (const b of biomes) b.voisins = b.voisins.filter(v => ids.has(v) && v !== b.id).sort();
const parId = new Map(biomes.map(b => [b.id, b]));
// les biomes du monde (la vue que lisent les jeux) : un par type, ses axes la moyenne de ses lieux pesée par leur capacité
const types = [...new Set(biomes.map(b => b.type))].sort().map(ty => { const L = biomes.filter(b => b.type === ty), W = somme(L.map(b => b.capacite)) || 1, T = U[ty];
  const axes = Object.fromEntries(Object.keys(T.axes).map(k => [k, r4(somme(L.map(b => b.axes[k] * b.capacite)) / W)]));
  const voisins = [...new Set(L.flatMap(b => b.voisins.map(v => parId.get(v).type)))].filter(x => x !== ty).sort();
  return { id: ty, nom: T.nom, milieu: T.milieu, axes, capacite: somme(L.map(b => b.capacite)), voisins }; });

// --- 2. le vivant ---
const dist = (x, y) => Math.sqrt(['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'].reduce((s, k) => s + ((x[k] ?? .5) - (y[k] ?? .5)) ** 2, 0));
// les lieux où vit une espèce : ceux de sa présence (cellules H3, ou pays) dont le type est un de ses habitats
const h3court = h => String(h || '').replace(/f+$/, '');
// (docs/53) un groupe d'invertébrés, de petits poissons, de plantes (une guilde qui n'est ni d'oiseaux ni de mammifères) vit partout où est son
// milieu : GBIF le voit mal (les pucerons y étaient sur 128 lieux, le zooplancton des lacs sur 25), et les coccinelles se retrouvaient sans
// pucerons, les truites sans larves. Il est posé dans tous les lieux de ses habitats ; la convenance de chacun fait son abondance
const partout = e => e.guilde && !['Aves', 'Mammalia'].includes(e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0]);
function lieuxDe(e) {
  if (partout(e)) { const H = new Set(e.habitats || []); return biomes.filter(b => !H.size || H.has(b.type)); }
  const H = new Set(e.habitats || []), P = e.presence || {}, cel = P.cellules || P.h3 || null, pays = P.pays || null;
  const enCellule = cel ? new Map(Object.entries(Array.isArray(cel) ? Object.fromEntries(cel.map(c => [c, 1])) : cel).map(([k, v]) => [h3court(k), v])) : null;
  return biomes.filter(b => (!H.size || H.has(b.type)) && (enCellule ? enCellule.has(h3court(b.lieu.h3 || b.id.split('~')[1])) : pays ? (Array.isArray(pays) ? pays.includes(b.lieu.pays) : pays[b.lieu.pays] != null) : true));
}
const ans = x => Math.round(x * 365.25);
const natalite = (pl, chaud = true) => { const L = Math.max(1, pl.longevite) / 365.25, mat = Math.max(1, pl.maturite) / 365.25, m = pl.masse_kg || 1;
  const n = .5 * Math.max(0, pl.portee || 1) * Math.exp(-mat / L) * (chaud ? A.survie_jeune(m) : A.survie_jeune_froid) / (pl.meute > 1 ? pl.meute / 2 : 1);
  return r4(Math.max(n, 1.15 / L)); };   // (au moins de quoi remplacer ses morts : une espèce qui vit encore n'est pas en train de s'éteindre)
const GARDE = new Set(['id', 'nom', 'reel', 'guilde', 'especes', 'plan', 'phenotypes']);
const classe0 = e => e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0];
// la distance entre deux lieux voisins (km, la médiane, d'après leurs centres) : la maille de la carte
const ESPACE = (() => { const D = [], rad = Math.PI / 180; for (const b of biomes) for (const v of b.voisins) { const w = parId.get(v); if (!w || w.lieu?.h3 === b.lieu?.h3) continue;
  const x = (w.lieu.lon - b.lieu.lon) * Math.cos((w.lieu.lat + b.lieu.lat) / 2 * rad), y = w.lieu.lat - b.lieu.lat; D.push(111.2 * Math.hypot(x, y)); }
  D.sort((x, y) => x - y); return D.length ? D[D.length >> 1] : 300; })();
const taxons = [], absents = [];
for (const e of vivant.especes || vivant.taxons || vivant) {
  if (!e?.plan) continue; const vegetal = e.plan.regime === 'vegetal'; if (vegetal) continue;
  const L = lieuxDe(e); if (!L.length) { absents.push(e.id); continue; }
  const plan = { ...e.plan };
  // la niche : la moyenne des lieux où elle vit (pesée par leur surface) ; la tolérance : leur écart à cette moyenne
  const W = L.map(b => Math.max(1, b.lieu.surface_km2 || 1)), SW = somme(W), niche = {};
  // (un oiseau qui vole a la niche de l'été, quand il niche : c'est l'hiver de son lieu qui le chasse vers le sud, docs/53 ; la moyenne de
  //  l'année lui faisait un hiver aussi doux que l'été, et il ne partait jamais)
  const ete = classe0(e) === 'Aves' && (e.plan.locomotion || []).includes('vol'), axDe = b => ete && b.normales ? (C.saisonLieu(b, C.dateDeLaPhase(b, .5, Date.UTC(2026, 5, 1)))?.axes ?? b.axes) : b.axes, AX = L.map(axDe);
  for (const k of ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert']) niche[k] = r4(somme(L.map((b, i) => AX[i][k] * W[i])) / SW);
  const ec = Math.sqrt(somme(L.map((b, i) => dist(AX[i], niche) ** 2 * W[i])) / SW);
  plan.niche = niche; plan.tolerance = r4(clamp(1.3 * ec + .12, A.tolerance[0], A.tolerance[1]));
  if (e.reel?.nom_scientifique && A.meutes[e.reel.nom_scientifique] && !(plan.meute > 1)) plan.meute = A.meutes[e.reel.nom_scientifique];
  // (un oiseau, un mammifère : sa longévité de moteur est une vie sauvage, au plus 3 × masse^0,3 années — la moitié du record fait vivre
  //  un lapin neuf ans, quand il en vit un ou deux ; sa croissance la plus forte, au plus deux fois la loi de Fenchel, r = 0,025 × g^−0,26
  //  par jour : sans ces bornes, au premier printemps, les lapins se multipliaient par trois en un mois)
  const chaud = A.sang_chaud.has(e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0]), mkg = plan.masse_kg || 1;
  if (chaud) plan.longevite = Math.round(Math.min(plan.longevite, A.vie_sauvage * Math.pow(mkg, .3) * 365.25));
  if (!Number.isFinite(plan.natalite)) plan.natalite = natalite(plan, chaud);
  if (chaud) plan.natalite = r4(Math.min(plan.natalite, 2 * 365.25 * .025 * Math.pow(mkg * 1000, -.26) + 365.25 / plan.longevite));
  // (une espèce qui pond par milliers — le hareng, la truite, le cabillaud — se renouvelle vite, et nourrit tout le monde : ses jeunes
  //  qui passent leur première année font ~5 / sa longévité en années, au plus 2 / sa maturité — une tortue qui mûrit à 25 ans se renouvelle
  //  lentement — et au plus 1,2 par tête et par an)
  //  (seulement celles qui vivent au moins deux ans, et jamais moins qu'elles n'avaient : un insecte d'une saison a déjà la sienne)
  if ((plan.portee || 0) > 50 && plan.longevite >= 730) plan.natalite = r4(Math.max(plan.natalite, clamp(Math.min(5 / (plan.longevite / 365.25), 2 / (Math.max(30, plan.maturite) / 365.25)), A.natalite_pontes[0], A.natalite_pontes[1])));
  if (plan.metabolisme == null && !A.sang_chaud.has(e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0])) plan.metabolisme = A.sang_froid;   // (un poisson, un reptile, un insecte brûlent peu)
  // (la dispersion : ce que l'espèce porte loin ses jeunes. La plus longue dispersion d'un mammifère suit sa masse (Sutherland et al. 2000,
  //  Conservation Ecology 4 : 40,7 × M^0,81 km pour un carnivore, 3,31 × M^0,65 pour un herbivore ou un omnivore) ; un oiseau qui vole, 300 km ;
  //  le front d'une espèce qui gagne du terrain avance d'environ cette distance / A.front chaque année (calé sur le retour du loup en
  //  France, docs/53) ; la chance de fonder un lieu voisin, par an, est l'avance du front rapportée à la distance entre deux lieux)
  if (!Number.isFinite(plan.dispersion)) { const viande = (plan.diete?.viande || 0) >= .5 || plan.regime === 'carnivore', vole = (plan.locomotion || []).includes('vol');
    const dmax = classe0(e) === 'Aves' && vole ? A.dispersion_oiseau : classe0(e) === 'Mammalia' ? (viande ? 40.7 * Math.pow(mkg, .81) : 3.31 * Math.pow(mkg, .65)) : null;
    if (dmax != null) { const parAn = clamp(dmax / A.front / ESPACE, 0, .9), base = 1 - Math.pow(1 - REGLES.colonisation, 365.25 / 120); plan.dispersion = +clamp(parAn / base, .02, 60).toPrecision(3); } }
  if (plan.diete && !plan.diete0) plan.diete0 = { ...plan.diete };
  if (plan.corps) plan.corps = Object.fromEntries(Object.entries(plan.corps).filter(([k]) => CORPS_OK.has(k)));   // (la silhouette ne garde que ce que le contrat connaît)
  plan.locomotion ??= ['marche']; plan.activite ??= 'diurne'; plan.sociabilite ??= .3; plan.temperament ??= .4; plan.vitesse_rel ??= 4; plan.perception ??= .5;
  const d = +e.densite_km2 || 1, populations = [];
  for (const b of L) { const c = Orvane.convenance(plan, b), eff = d * (b.lieu.surface_km2 || 1) * Math.max(.05, c);
    if (eff >= A.plancher) populations.push({ biome: b.id, effectif: r4(eff), tendance: 0, depuis: 0 }); }
  if (!populations.length) { absents.push(e.id); continue; }
  const t = { id: e.id, nom: e.nom || e.id, parent: null, apparu: 0, eteint: null, statut: 'stable' };
  for (const k of GARDE) if (k !== 'plan' && e[k] != null && !(k in t)) t[k] = e[k];
  t.plan = plan; t.phenotypes = e.phenotypes || [{ id: 'base', frequence: 1, traits: [] }]; t.populations = populations;
  taxons.push(t);
}
// l'équilibre observé : dans la nature, les effectifs comptés sont ceux d'un équilibre. La capacité d'un lieu est donc celle où ses
// brouteurs, tels qu'on les a posés, ne croissent ni ne décroissent en moyenne sur l'année : pour chacun, la charge de sa bande de masse
// rapportée à la saturation où ses naissances égalent ses morts (1 − mort / naissance) ; la capacité du lieu est la médiane de ces
// besoins, pesée par la racine des biomasses (une guilde d'insectes ne décide pas pour le cerf). Elle reste entre 0,1 et 10 fois ce que
// sa production primaire lui donnait. Sans cela, les lapins, partis bien sous la place que leur donnait la production, la gagnaient
// en un printemps
if (A.equilibre) { const SIG = .35, BANDE = Math.sqrt(2 * Math.PI) * SIG / 4, rec = (x, y) => { const d = Math.log10(x / y); return Math.exp(-(d * d) / (2 * SIG * SIG)); };
  const PARTK = { herbivore: 1, omnivore: .85, detritivore: .3, filtreur: .3 }, parLieuA = new Map();
  for (const t of taxons) { const w = PARTK[t.plan.regime]; if (!w) continue; for (const p of t.populations) (parLieuA.get(p.biome) || parLieuA.set(p.biome, []).get(p.biome)).push({ t, B: p.effectif * (t.plan.masse_kg || 1) * w, m: t.plan.masse_kg || 1 }); }
  for (const b of biomes) { const ici = parLieuA.get(b.id); if (!ici?.length) continue;
    const besoins = ici.map(h => { const r = h.t.plan.natalite / 365.25 * Orvane.convenance(h.t.plan, b), mort = 1 / Math.max(2, h.t.plan.longevite), se = clamp(1 - mort / Math.max(1e-12, r), .2, .95);
      return [somme(ici.map(j => j.B * rec(h.m, j.m))) / (BANDE * se), Math.sqrt(h.B)]; }).sort((x, y) => x[0] - y[0]);
    const W = somme(besoins.map(x => x[1])); let acc = 0, K = besoins[besoins.length - 1][0]; for (const [k, w] of besoins) { acc += w; if (acc >= W / 2) { K = k; break; } }
    b.capacite = b.capacite_base = Math.round(clamp(K, b.capacite * A.equilibre[0], b.capacite * A.equilibre[1])); }
  // … et, une capacité par lieu ne pouvant convenir à tous, chaque espèce y trouve sa place (plan.place) : la part de la capacité qui
  // fait de ses effectifs comptés son équilibre, médiane de ses lieux pesée par sa biomasse, entre 0,001 et 50
  for (const t of taxons) { const w = PARTK[t.plan.regime]; if (!w) continue; const L = [];
    for (const p of t.populations) { const b = parId.get(p.biome), ici = parLieuA.get(p.biome), h = ici.find(x => x.t === t); if (!h) continue;
      const r = t.plan.natalite / 365.25 * Orvane.convenance(t.plan, b), mort = 1 / Math.max(2, t.plan.longevite), se = clamp(1 - mort / Math.max(1e-12, r), .2, .95);
      L.push([somme(ici.map(j => j.B * rec(h.m, j.m))) / (BANDE * se * b.capacite), h.B]); }
    if (!L.length) continue; L.sort((x, y) => x[0] - y[0]); const W = somme(L.map(x => x[1])); let acc = 0, v = L[L.length - 1][0]; for (const [k, x] of L) { acc += x; if (acc >= W / 2) { v = k; break; } }
    t.plan.place = +clamp(v, .001, 50).toPrecision(4); } }
// les plantes : la place de chaque port dans un lieu (celle de la flore d'Orvane, d'après ses axes) se partage entre celles de ce port
// qui y vivent ; une plante qui n'y trouve pas son port s'y voit la place du port le plus proche, s'il n'a personne
const PH = Flore.PHENOS, DEPART = [.85, .06, .06, .03];
const plantesE = (vivant.especes || vivant.taxons || vivant).filter(e => e?.plan?.regime === 'vegetal');
const parLieu = new Map();
for (const e of plantesE) for (const b of lieuxDe(e)) { const k = Flore.portDe(e.plan); (parLieu.get(b.id) || parLieu.set(b.id, []).get(b.id)).push([e, k]); }
const popsPlante = new Map();
for (const b of biomes) { const ici = parLieu.get(b.id) || []; if (!ici.length) continue;
  let comp = Flore.compositionDe(b);
  // (la flore d'Orvane ne donne de lichens qu'aux lieux les plus froids, de champignons qu'au sous-sol : dans un lieu réel, les lichens
  //  prennent une part de l'herbe là où il fait froid, les champignons une petite part de tout là où il y a des arbres)
  const ports = new Set(ici.map(([, k]) => k)), dans = f => comp.some(([g]) => g === f);
  if (ports.has('lichen') && !dans('lichen') && b.axes.temperature < .45 && b.milieu !== 'marin' && b.milieu !== 'aquatique') { const h = comp.find(([g]) => g === 'herbe'); comp = h ? [...comp.map(([g, w]) => [g, g === 'herbe' ? w * .7 : w]), ['lichen', h[1] * .3]] : [...comp, ['lichen', .1]]; }
  if (ports.has('champignon') && !dans('champignon') && b.milieu === 'terrestre' && b.axes.couvert >= .25) comp = [...comp.map(([g, w]) => [g, w * .97]), ['champignon', .03]];
  const parts = new Map(comp);
  // un port que le lieu a et que personne n'y porte : sa place va aux autres ports, au prorata
  const presents = new Set(ici.map(([, k]) => k)), gardes = comp.filter(([f]) => presents.has(f)), Wg = somme(gardes.map(([, w]) => w));
  if (!gardes.length) continue;
  for (const [e, k] of ici) { if (!parts.has(k)) continue; const memes = ici.filter(([, k2]) => k2 === k), poids = memes.map(([x]) => +(x.part?.[b.type] ?? x.abondance ?? 1)), w = +(e.part?.[b.type] ?? e.abondance ?? 1);
    const K = b.capacite * parts.get(k) / Wg * w / somme(poids), m = e.plan.masse_kg || Flore.FORMES[k]?.m || 1; if (!(K > 0)) continue;
    (popsPlante.get(e.id) || popsPlante.set(e.id, []).get(e.id)).push({ biome: b.id, effectif: r4(K / m), tendance: 0, depuis: 0, potentiel: r4(K), frequences: DEPART.slice() }); } }
for (const e of plantesE) { const P = popsPlante.get(e.id); if (!P?.length) { absents.push(e.id); continue; }
  for (const p of P) { p.reference = { effectif: p.effectif, frequences: p.frequences.slice() }; p.reference_diete = { effectif: p.effectif, frequences: p.frequences.slice() }; }
  const F = Flore.FORMES[Flore.portDe(e.plan)] || {}, L = P.map(p => parId.get(p.biome)), W = P.map(p => p.potentiel), SW = somme(W) || 1;
  const niche = Object.fromEntries(['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'].map(k => [k, r4(somme(L.map((b, i) => b.axes[k] * W[i])) / SW)]));
  const plan = { famille: 'vegetale', locomotion: [], longevite: 50, maturite: 1, sociabilite: 0, temperament: 0, activite: 'continue', tolerance: .3, hauteur_m: F.h, masse_kg: F.m, taille_m: F.h, croissance: F.r, ...e.plan, niche, regime: 'vegetal' };
  const t = { id: e.id, nom: e.nom || e.id, parent: null, apparu: 0, eteint: null, statut: 'stable' };
  for (const k of GARDE) if (k !== 'plan' && k !== 'phenotypes' && e[k] != null) t[k] = e[k];
  t.plan = plan; t.populations = P; t.phenotypes = PH.map(([pid, traits], k) => ({ id: pid, frequence: DEPART[k], traits }));
  taxons.push(t); }

// (docs/33) une forme de corps que les jeux ne savent pas forcément dessiner (la méduse : rayonnée) est dite au catalogue du monde, avec son
// repli (le serpent), comme dans un monde aux formes nouvelles
const FORMES = require('../../moteur/formes.js').FORMES || {};
const formesNeuves = T => { const o = {}; for (const t of T) { const f = t.plan.corps?.forme; if (f && FORMES[f]) o[f] = FORMES[f]; } return Object.keys(o).length ? o : null; };
// --- 3. le monde ---
const jour = Date.parse(arg('--date', new Date().toISOString().slice(0, 10)) + 'T03:17:00Z');
let inst = { orvane: Orvane.CONTRAT,
  monde: { id: MONDE, graine: 1, nom: carte.nom || "L'Europe", annee: 365, calendrier: { hemisphere: 'nord' }, temps: { jours: 1 }, regles: { ...REGLES, dispersion: .005, fuite: .5 },
    parcelles: { types, par: 0, graine: 1 }, flore: { depuis: 0, lignees: plantesE.length - absents.filter(x => plantesE.some(e => e.id === x)).length }, phenologie: { depuis: -365 }, dietes: { depuis: 0 } },
  cycle: { n: 0, date: new Date(jour - 864e5).toISOString(), pressions_recues: 0 },
  biomes, catalogue: { version: '0.1', traits: {}, ...(formesNeuves(taxons) ? { monde: { formes: formesNeuves(taxons) } } : {}) }, taxons, evenements: [],
  ...(sources.length ? { attributions: sources.map(s => ({ source: s.nom || s.source, licence: s.licence, url: s.url, usage: s.usage || s.ce_quon_en_tire })) } : {}) };
inst = Meteo.eveiller(inst).inst; inst.monde.meteo = { depuis: 0 };
// le calage par le moteur : l'équilibre observé, cette fois avec ce que le premier jour mesure vraiment — les naissances, les morts, et ce
// que les prédateurs mangent. Chaque passe fait tourner un jour (sans rien garder) et ajuste :
//  - un brouteur : sa place, pour que sa saturation de l'année (celle du jour, rapportée à la production moyenne) soit celle où ses
//    naissances égalent ses morts naturelles ET les bêtes mangées : 1 − (mort + mangés) / (natalité × convenance) ;
//  - un carnivore : son efficacité de chasse (sa part des proies devant ses concurrents), pour que sa satiété soit celle où ses naissances
//    (natalité × satiété) égalent ses morts (la faim les multiplie, 1 + 3 (1 − satiété)²) et les siens mangés. (Ce fut d'abord son métabolisme ;
//    mais le métabolisme d'un chasseur fait aussi son poids devant les autres : relevé chez le renard, il affamait l'épervier, et l'épervier
//    finissait au plus bas, sans rien y gagner — docs/53) ;
// chacun entre des bornes (la place de 0,001 à 50, l'efficacité de 0,02 à 50). Quatre passes, la concurrence se répondant.
// (--depuis <amorce> : reprendre les réglages calés d'une amorce d'avant — la place, l'efficacité de chasse — et ne pas refaire le calage d'un jour)
// Les grands carnivores (le loup, les lynx) n'y sont pas : en Europe, les hommes les tiennent bas. Les mettre à l'équilibre de leurs
// effectifs comptés les figeait (le loup recevait une adresse de 0,38 et ne remontait plus : l'étalon l'a vu, docs/53). Ils gardent celle du
// moteur, et ce qu'ils font dit ce que le moteur sait d'eux. (L'ours et le glouton, omnivores, ont leur place comme les autres brouteurs.)
const TENUS = new Set(['loup', 'lynx-boreal', 'lynx-pardelle', 'ours-brun', 'glouton']);
const DEPUIS = arg('--depuis') ? JSON.parse(fs.readFileSync(path.resolve(arg('--depuis')), 'utf8')) : null;
if (DEPUIS) { const P = new Map(DEPUIS.taxons.map(t => [t.id, t.plan])); for (const t of inst.taxons) { const q = P.get(t.id); if (!q) continue; for (const k of ['place', 'efficacite']) if (q[k] != null && !(k === 'efficacite' && TENUS.has(t.id))) t.plan[k] = q[k]; } }
const CALER = +arg('--caler', DEPUIS ? 0 : 4), OMNI = new Set(['herbivore', 'omnivore', 'filtreur', 'detritivore']);
const seq = (r, m, p) => { if (r <= m + p) return 1; let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const s = (lo + hi) / 2; if (r * s - m * (1 + 3 * (1 - s) ** 2) - p > 0) hi = s; else lo = s; } return hi; };
for (let pass = 0; pass < CALER; pass++) {
  const brut = [], J = Orvane.cycle(inst, {}, { duree_ms: 864e5, trace: x => brut.push(x) });
  // (la production de chaque lieu ce jour : la saturation de l'année est celle du jour × la production du jour)
  const PRO = new Map(J.biomes.map(b => [b.id, b.saison?.production ?? 1])), X = new Map();
  for (const x of brut) { const o = X.get(x.taxon) || X.set(x.taxon, { N: 0, conv: 0, pred: 0, s: 0, prodsat: 0 }).get(x.taxon);
    o.N += x.N; o.conv += x.conv * x.N; o.pred += x.mortsPred; o.s += (x.satiete ?? 0) * x.N; o.prodsat += x.sat * x.N * (PRO.get(x.biome) ?? 1); }
  let nB = 0, nC = 0, ecart = [];
  for (const t of inst.taxons) { const o = X.get(t.id); if (!o || !(o.N > 0) || t.plan.regime === 'vegetal') continue;
    const r = t.plan.natalite, m = 365.25 / Math.max(2, t.plan.longevite), conv = o.conv / o.N, p = o.pred / o.N * 365.25;
    if (OMNI.has(t.plan.regime)) { const sa = o.prodsat / o.N, cible = clamp(1 - (m + p) / Math.max(1e-9, r * conv), .2, .97);
      if (sa > 1e-6) { t.plan.place = +clamp((t.plan.place ?? 1) * sa / cible, .001, 50).toPrecision(4); nB++; ecart.push(Math.abs(Math.log(sa / cible))); } }
    else if (t.plan.regime === 'carnivore' && !TENUS.has(t.id)) { const s = clamp(o.s / o.N, .005, .995), cible = clamp(seq(r * conv, m, p), .02, .98), odds = x => x / (1 - x);
      t.plan.efficacite = +clamp((t.plan.efficacite ?? 1) * odds(cible) / odds(s), A.efficacite[0], A.efficacite[1]).toPrecision(4); nC++; ecart.push(Math.abs(Math.log(odds(s) / odds(cible)))); } }
  ecart.sort((x, y) => x - y); console.log(`calage, passe ${pass + 1} : ${nB} brouteurs, ${nC} carnivores ; écart médian à l'équilibre ${ecart.length ? Math.exp(ecart[ecart.length >> 1]).toFixed(2) : '-'} ×`);
}
// le calage sur une année entière (--caler-annee N, docs/53) : le calage d'un jour ne voit que novembre ; l'étalon a montré qu'au bout de deux
// ans, les insectes chasseurs s'effondraient, les rapaces perdaient les deux tiers, les lapins et les lièvres doublaient. Chaque passe fait
// vivre une année entière, puis compare chaque espèce à elle-même un an plus tôt (λ, à la même saison) : un brouteur qui a crû a trop de
// place, un carnivore qui a crû chasse trop bien ; on corrige d'une part de l'écart (λ^0,8), et l'on recommence.
// Les grands carnivores (le loup, l'ours, les lynx, le glouton) n'y sont pas : en Europe, les hommes les tiennent bas, et sans joueurs ils
// remontent, comme ils remontent en vrai ; les caler les figerait (et le retour du loup ne se ferait plus). Une passe : ~25 minutes.
// Une espèce qui passe d'un côté à l'autre (×10, puis ×0,11 : les papillons) a reçu un pas trop grand : le suivant est deux fois plus petit,
// comme une recherche par moitiés (au plus bas 0,1). Ce que chaque passe a vu (λ et le pas) est gardé à côté de sa sortie
// (<sortie>.lambda.json), et relu par la passe suivante (--depuis).
const ANNEE = +arg('--caler-annee', 0);
const HIST = (() => { try { return DEPUIS ? JSON.parse(fs.readFileSync(path.resolve(arg('--depuis')) + '.lambda.json', 'utf8')) : {}; } catch { return {}; } })();
for (let it = 0; it < ANNEE; it++) {
  const tot = I => new Map(I.taxons.map(t => [t.id, somme(t.populations.map(p => p.effectif))])), N0 = tot(inst), t0 = Date.now(); let J = inst;
  for (let k = 0; k < 365; k++) { J = Orvane.cycle(J, {}, { duree_ms: 864e5 }); if ((k + 1) % 61 === 0) process.stderr.write(`calage sur l'année, passe ${it + 1} : ${J.cycle.jour}\n`); }
  const N1 = tot(J), ec = [], pires = [];
  for (const t of inst.taxons) { if (t.plan.regime === 'vegetal' || TENUS.has(t.id)) continue; const a0 = N0.get(t.id); if (!(a0 > 0)) continue;
    const lam = clamp((N1.get(t.id) || 0) / a0, .1, 10), h = HIST[t.id], volte = h && Math.abs(Math.log(lam)) > .05 && Math.sign(Math.log(lam)) !== Math.sign(Math.log(h.lam));
    const k = volte ? Math.max(.1, (h.k ?? .8) / 2) : .8; HIST[t.id] = { lam: +lam.toPrecision(4), k }; ec.push(Math.abs(Math.log(lam))); pires.push([t.id, lam]);
    if (OMNI.has(t.plan.regime)) t.plan.place = +clamp((t.plan.place ?? 1) * Math.pow(lam, -k), .0005, 100).toPrecision(4);
    else if (t.plan.regime === 'carnivore') t.plan.efficacite = +clamp((t.plan.efficacite ?? 1) * Math.pow(lam, -k), A.efficacite[0], A.efficacite[1]).toPrecision(4); }
  ec.sort((x, y) => x - y); pires.sort((x, y) => Math.abs(Math.log(y[1])) - Math.abs(Math.log(x[1])));
  if (arg('--sortie')) { fs.writeFileSync(arg('--sortie'), JSON.stringify(inst)); fs.writeFileSync(arg('--sortie') + '.lambda.json', JSON.stringify(HIST)); }   // (chaque passe est gardée : un arrêt n'en perd qu'une)
  console.log(`calage sur l'année, passe ${it + 1} (${Math.round((Date.now() - t0) / 6e4)} min) : écart médian ×${Math.exp(ec[ec.length >> 1]).toFixed(2)}, 90 % sous ×${Math.exp(ec[Math.floor(ec.length * .9)]).toFixed(2)} ; les plus loin : ${pires.slice(0, 6).map(([id, l]) => `${id} ×${l.toFixed(2)}`).join(', ')}`);
}
const rodage = +arg('--rodage', 0);
for (let k = 0; k < rodage; k++) { inst = Orvane.cycle(inst, {}, { duree_ms: 864e5 }); if ((k + 1) % 30 === 0) console.log(`rodage : ${inst.cycle.jour}`); }
if (rodage) { inst.cycle.n = 0; inst.evenements = []; for (const t of inst.taxons) { t.apparu = 0; for (const p of t.populations) p.depuis = 0; } }
const sortie = arg('--sortie', path.join(D, 'amorce.json'));
fs.writeFileSync(sortie, JSON.stringify(inst));
const anim = taxons.filter(t => t.plan.regime !== 'vegetal'), pl = taxons.filter(t => t.plan.regime === 'vegetal');
console.log(`${MONDE} : ${biomes.length} lieux (${types.length} types), ${anim.length} lignées animales (${anim.reduce((s, t) => s + t.populations.length, 0)} populations), ${pl.length} plantes (${pl.reduce((s, t) => s + t.populations.length, 0)} populations) ; ${absents.length} sans lieu (${absents.slice(0, 12).join(', ')}${absents.length > 12 ? '…' : ''})`);
console.log(`→ ${path.relative(R('.'), sortie)} (${(fs.statSync(sortie).size / 1e6).toFixed(1)} Mo), premier jour ${C.jourIso(jour)}`);
