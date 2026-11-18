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
  meutes: { 'Canis lupus': 6, 'Orcinus orca': 5, 'Lycaon pictus': 8, 'Panthera leo': 4 },
  tolerance: [.2, .7],
  plancher: 4,                // une population de moins de bêtes n'est pas posée
  sang_chaud: new Set(['Mammalia', 'Aves']), sang_froid: .15,   // ce que brûlent les autres, rapporté à un mammifère de leur masse
  natalite_pontes: [0, 1.2],
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
  longevite_predateur: 0,
  hivernage: { actif: 1 },
  colonisation: .005         // une lignée fonde un lieu voisin où elle n'est pas de loin en loin : ~1,5 % par an et par voisin favorable
};

const U = Object.fromEntries(require('../../moteur/biomes-universels.json').map(b => [b.id, b]));
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
function lieuxDe(e) {
  const H = new Set(e.habitats || []), P = e.presence || {}, cel = P.cellules || P.h3 || null, pays = P.pays || null;
  const enCellule = cel ? new Map(Object.entries(Array.isArray(cel) ? Object.fromEntries(cel.map(c => [c, 1])) : cel).map(([k, v]) => [h3court(k), v])) : null;
  return biomes.filter(b => (!H.size || H.has(b.type)) && (enCellule ? enCellule.has(h3court(b.lieu.h3 || b.id.split('~')[1])) : pays ? (Array.isArray(pays) ? pays.includes(b.lieu.pays) : pays[b.lieu.pays] != null) : true));
}
const ans = x => Math.round(x * 365.25);
const natalite = pl => { const L = Math.max(1, pl.longevite) / 365.25, mat = Math.max(1, pl.maturite) / 365.25, m = pl.masse_kg || 1;
  const n = .5 * Math.max(0, pl.portee || 1) * Math.exp(-mat / L) * A.survie_jeune(m) / (pl.meute > 1 ? pl.meute / 2 : 1);
  return r4(Math.max(n, 1.15 / L)); };   // (au moins de quoi remplacer ses morts : une espèce qui vit encore n'est pas en train de s'éteindre)
const GARDE = new Set(['id', 'nom', 'reel', 'guilde', 'especes', 'plan', 'phenotypes']);
const taxons = [], absents = [];
for (const e of vivant.especes || vivant.taxons || vivant) {
  if (!e?.plan) continue; const vegetal = e.plan.regime === 'vegetal'; if (vegetal) continue;
  const L = lieuxDe(e); if (!L.length) { absents.push(e.id); continue; }
  const plan = { ...e.plan };
  // la niche : la moyenne des lieux où elle vit (pesée par leur surface) ; la tolérance : leur écart à cette moyenne
  const W = L.map(b => Math.max(1, b.lieu.surface_km2 || 1)), SW = somme(W), niche = {};
  for (const k of ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert']) niche[k] = r4(somme(L.map((b, i) => b.axes[k] * W[i])) / SW);
  const ec = Math.sqrt(somme(L.map((b, i) => dist(b.axes, niche) ** 2 * W[i])) / SW);
  plan.niche = niche; plan.tolerance = r4(clamp(1.3 * ec + .12, A.tolerance[0], A.tolerance[1]));
  if (e.reel?.nom_scientifique && A.meutes[e.reel.nom_scientifique] && !(plan.meute > 1)) plan.meute = A.meutes[e.reel.nom_scientifique];
  // (un oiseau, un mammifère : sa longévité de moteur est une vie sauvage, au plus 3 × masse^0,3 années — la moitié du record fait vivre
  //  un lapin neuf ans, quand il en vit un ou deux ; sa croissance la plus forte, au plus deux fois la loi de Fenchel, r = 0,025 × g^−0,26
  //  par jour : sans ces bornes, au premier printemps, les lapins se multipliaient par trois en un mois)
  const chaud = A.sang_chaud.has(e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0]), mkg = plan.masse_kg || 1;
  if (chaud) plan.longevite = Math.round(Math.min(plan.longevite, A.vie_sauvage * Math.pow(mkg, .3) * 365.25));
  if (!Number.isFinite(plan.natalite)) plan.natalite = natalite(plan);
  if (chaud) plan.natalite = r4(Math.min(plan.natalite, 2 * 365.25 * .025 * Math.pow(mkg * 1000, -.26) + 365.25 / plan.longevite));
  // (une espèce qui pond par milliers — le hareng, la truite, le cabillaud — se renouvelle vite, et nourrit tout le monde : ses jeunes
  //  qui passent leur première année font ~5 / sa longévité en années, au plus 2 / sa maturité — une tortue qui mûrit à 25 ans se renouvelle
  //  lentement — et au plus 1,2 par tête et par an)
  //  (seulement celles qui vivent au moins deux ans, et jamais moins qu'elles n'avaient : un insecte d'une saison a déjà la sienne)
  if ((plan.portee || 0) > 50 && plan.longevite >= 730) plan.natalite = r4(Math.max(plan.natalite, clamp(Math.min(5 / (plan.longevite / 365.25), 2 / (Math.max(30, plan.maturite) / 365.25)), A.natalite_pontes[0], A.natalite_pontes[1])));
  if (plan.metabolisme == null && !A.sang_chaud.has(e.reel?.classe ?? String(e.reel?.groupe || '').split(' ')[0])) plan.metabolisme = A.sang_froid;   // (un poisson, un reptile, un insecte brûlent peu)
  if (plan.diete && !plan.diete0) plan.diete0 = { ...plan.diete };
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

// --- 3. le monde ---
const jour = Date.parse(arg('--date', new Date().toISOString().slice(0, 10)) + 'T03:17:00Z');
let inst = { orvane: Orvane.CONTRAT,
  monde: { id: MONDE, graine: 1, nom: carte.nom || "L'Europe", annee: 365, calendrier: { hemisphere: 'nord' }, temps: { jours: 1 }, regles: { ...REGLES, dispersion: .005, fuite: .5 },
    parcelles: { types, par: 0, graine: 1 }, flore: { depuis: 0, lignees: plantesE.length - absents.filter(x => plantesE.some(e => e.id === x)).length }, phenologie: { depuis: -365 }, dietes: { depuis: 0 } },
  cycle: { n: 0, date: new Date(jour - 864e5).toISOString(), pressions_recues: 0 },
  biomes, catalogue: { version: '0.1', traits: {} }, taxons, evenements: [],
  ...(sources.length ? { attributions: sources.map(s => ({ source: s.nom || s.source, licence: s.licence, url: s.url, usage: s.usage || s.ce_quon_en_tire })) } : {}) };
inst = Meteo.eveiller(inst).inst; inst.monde.meteo = { depuis: 0 };
// le calage par le moteur : l'équilibre observé, cette fois avec ce que le premier jour mesure vraiment — les naissances, les morts, et ce
// que les prédateurs mangent. Chaque passe fait tourner un jour (sans rien garder) et ajuste :
//  - un brouteur : sa place, pour que sa saturation de l'année (celle du jour, rapportée à la production moyenne) soit celle où ses
//    naissances égalent ses morts naturelles ET les bêtes mangées : 1 − (mort + mangés) / (natalité × convenance) ;
//  - un carnivore : son métabolisme (ce qu'il lui faut), pour que sa satiété soit celle où ses naissances (natalité × satiété) égalent
//    ses morts (la faim les multiplie, 1 + 3 (1 − satiété)²) et les siens mangés ;
// chacun entre des bornes (la place de 0,001 à 50, le métabolisme de 0,02 à 1,5). Quatre passes, la concurrence se répondant.
const CALER = +arg('--caler', 4), OMNI = new Set(['herbivore', 'omnivore', 'filtreur', 'detritivore']);
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
    else if (t.plan.regime === 'carnivore') { const s = clamp(o.s / o.N, .005, .995), cible = clamp(seq(r * conv, m, p), .02, .98), odds = x => x / (1 - x);
      t.plan.metabolisme = +clamp((t.plan.metabolisme ?? 1) * odds(s) / odds(cible), .02, 1.5).toPrecision(4); nC++; ecart.push(Math.abs(Math.log(odds(s) / odds(cible)))); } }
  ecart.sort((x, y) => x - y); console.log(`calage, passe ${pass + 1} : ${nB} brouteurs, ${nC} carnivores ; écart médian à l'équilibre ${ecart.length ? Math.exp(ecart[ecart.length >> 1]).toFixed(2) : '-'} ×`);
}
const rodage = +arg('--rodage', 0);
for (let k = 0; k < rodage; k++) { inst = Orvane.cycle(inst, {}, { duree_ms: 864e5 }); if ((k + 1) % 30 === 0) console.log(`rodage : ${inst.cycle.jour}`); }
if (rodage) { inst.cycle.n = 0; inst.evenements = []; for (const t of inst.taxons) { t.apparu = 0; for (const p of t.populations) p.depuis = 0; } }
const sortie = arg('--sortie', path.join(D, 'amorce.json'));
fs.writeFileSync(sortie, JSON.stringify(inst));
const anim = taxons.filter(t => t.plan.regime !== 'vegetal'), pl = taxons.filter(t => t.plan.regime === 'vegetal');
console.log(`${MONDE} : ${biomes.length} lieux (${types.length} types), ${anim.length} lignées animales (${anim.reduce((s, t) => s + t.populations.length, 0)} populations), ${pl.length} plantes (${pl.reduce((s, t) => s + t.populations.length, 0)} populations) ; ${absents.length} sans lieu (${absents.slice(0, 12).join(', ')}${absents.length > 12 ? '…' : ''})`);
console.log(`→ ${path.relative(R('.'), sortie)} (${(fs.statSync(sortie).size / 1e6).toFixed(1)} Mo), premier jour ${C.jourIso(jour)}`);
