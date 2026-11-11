// Orvane — LA FLORE (moteur/flore.js) — docs/17
// Les plantes deviennent des lignées : herbes, buissons, arbres, roseaux, algues, lichens, succulentes, champignons, chacune
// avec sa hauteur, sa repousse, et deux défenses qui se transmettent (des feuilles toxiques, des épines). Un brouteur ne mange
// que ce qu'il atteint (la hauteur, l'eau, la grimpe, le vol) et ce qu'il supporte (cuir épais contre les épines, métabolisme
// lent contre les toxines) : sa nourriture est la sienne, et elle s'épuise sous la dent. Les plantes broutées gagnent des
// défenses, qui coûtent en repousse ; les brouteurs qui les supportent en tirent plus. Les deux coévoluent.
// La flore s'éveille une fois (eveiller), au point d'équilibre avec les brouteurs du moment : le jour de son éveil, chaque
// brouteur a la nourriture qu'avait son biome. Le moteur (moteur/orvane.js) l'appelle à quelques points de son cycle ; un
// monde sans flore n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneFlore).
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const somme = a => a.reduce((s, x) => s + x, 0);
const typeDe = b => b.type || b.id;
const estPlante = t => t?.plan?.regime === 'vegetal';
// (docs/48) le port d'une plante : ce qu'elle est pour la mécanique (herbe, buisson, arbre, roseau, algue, lichen, succulente,
// champignon). Une forme de la flore riche (un palmier, une fougère) dit son port (plan.port) ; les huit formes d'origine sont le leur.
// Une lignée de la flore riche porte une clé (plan.cle) : ce qui la distingue devant un brouteur (sa hauteur, ce qu'elle donne)
const portDe = plan => plan.port || plan.forme, cleDe = plan => plan.cle || plan.forme;
const DIE = (typeof require === 'function' ? require('./dietes.js') : racine.OrvaneDietes) || null;   // (docs/30) les régimes en spectre
const PHE = (typeof require === 'function' ? require('./phenologie.js') : racine.OrvanePhenologie) || null;   // (docs/46) les saisons des plantes
// ce que les traits font devant les plantes, d'après leur champ flore (moteur/catalogue.js) : ceux du moteur, et ceux qu'un monde
// porte (catalogue.monde.traits, docs/20) ; le moteur passe le catalogue du monde à chaque cycle (ctx.cat), l'éveil le lit
const CATM = (typeof require === 'function' ? require('./catalogue.js') : racine.OrvaneCatalogue)?.TRAITS || {};
let TR = CATM; const catDe = I => ({ ...(I?.catalogue?.traits || {}), ...(I?.catalogue?.monde?.traits || {}), ...CATM });
// un butineur (docs/18) : un petit herbivore ou omnivore qui vole ou grimpe (moins de 100 g), ou un tout petit (moins de 20 g)
const estButineur = t => { const m = t?.plan?.masse_kg || 1, L = t?.plan?.locomotion || []; return (t?.plan?.regime === 'herbivore' || t?.plan?.regime === 'omnivore') && (m < .02 || (m < .1 && (L.includes('vol') || L.includes('grimpe')))); };

const REGLES = {
  broutage: .05,             // ce qu'un kg de brouteur prélève de nourriture par cycle, en unités de capacité
  prise_max: .5,             // au plus la moitié d'une plante disparaît en un cycle
  mutation: .002,            // la part des pousses qui changent de défense
  pollinisation: { gain: .3, demi: .05 },    // (docs/18) jusqu'à 30 % de repousse en plus ; à moitié atteint quand les butineurs pèsent 5 % de la place
  renouveau: .03,            // la part des pieds qui meurent et repoussent chaque cycle : même sans dent, les défenses coûtent
  declin: -1,                // la place la plus négative : une plante au-dessus de sa place ne perd au plus que sa repousse par cycle
  rodage: 400,               // les cycles d'équilibre à l'éveil (les plantes seules, sous les brouteurs du moment)
  ratio: [.2, 2],            // la nourriture d'un brouteur, rapportée à celle de l'éveil : bornée
  concurrence: [.3, 1.5],    // la charge de sa bande, pesée par le régime commun et rapportée à son arrivée : bornée
  defenses: { toxique: { cout: .2, effet: .7 }, epineux: { cout: .15, effet: .5 } }   // ce qu'une défense coûte en repousse, ce qu'elle retire au goût
};
const FORMES = {
  herbe: { nom: 'herbe', h: .3, m: .05, r: .5 }, buisson: { nom: 'buisson', h: 1.5, m: 5, r: .3 }, arbre: { nom: 'arbre', h: 12, m: 500, r: .25 },
  roseau: { nom: 'roseau', h: 1.8, m: .3, r: .4 }, algue: { nom: 'algue', h: .5, m: .1, r: .6 }, lichen: { nom: 'lichen', h: .02, m: .01, r: .06 },
  succulente: { nom: 'succulente', h: .8, m: 3, r: .1 }, champignon: { nom: 'champignon', h: .1, m: .05, r: .4 }
};
const FLEURS = new Set(['herbe', 'buisson', 'arbre', 'succulente']);   // les formes qui fleurissent : les pollinisateurs les font repousser (docs/18)
// (docs/48) ce qu'une plante donne de chaque part : le sien (plan.rendement, une lignée de la flore riche), sinon celui de son port ;
// si elle fleurit pour les butineurs (une plante que le vent féconde n'a pas de nectar), si elle porte des fruits
const rendDe = plan => plan.rendement || DIE?.RENDEMENT[portDe(plan)] || { feuilles: 1 };
const aFleurs = plan => plan.rendement ? (plan.rendement.nectar || 0) > 0 : FLEURS.has(portDe(plan));
const aFruits = plan => plan.rendement ? (plan.rendement.fruits || 0) > 0 : !!DIE?.FRUITS.has(portDe(plan));
const PHENOS = [['base', []], ['toxique', ['toxique']], ['epineux', ['epineux']], ['epineux+toxique', ['epineux', 'toxique']]];
const DEPART = [.85, .06, .06, .03];
const TRAITS = {
  toxique: { domaine: 'vegetal', organe: 'feuilles', effet: 'feuilles toxiques : un brouteur qui ne les supporte pas en mange peu', cout: .2 },
  epineux: { domaine: 'vegetal', organe: 'tiges', effet: 'épines : un brouteur sans cuir épais s\'y blesse et en mange peu', cout: .15 }
};
const SYL = ['ver', 'al', 'mi', 'sa', 'lune', 'ro', 'fe', 'ni', 'ar', 'bel', 'ul', 'sor', 'ta', 'ème', 'li', 'gra', 'dé', 'on'];

// --- ce qui pousse dans un biome : ses formes et la part de la place qu'elles prennent ---
function compositionDe(b) {
  const ax = b.axes || {}, c = clamp(ax.couvert ?? 0, 0, 1), hum = ax.humidite ?? .5, T = ax.temperature ?? .5, L = [];
  if (b.milieu === 'marin') { if ((ax.lumiere ?? 0) > .2) L.push(['algue', 1]); }
  else if (b.milieu === 'aquatique') L.push(['algue', .6], ['roseau', .4]);
  else if (b.milieu === 'souterrain') L.push(['champignon', 1]);
  else if (b.milieu === 'aerien') L.push(['lichen', .5], ['herbe', .5]);   // (docs/20) un ciel : des lichens et des herbes qui flottent dans la brume
  else if (b.milieu === 'amphibie') { L.push(['roseau', .5 * (1 - c)], ['algue', .2 * (1 - c)]); if (c > .2) L.push(['arbre', c]); else L.push(['herbe', .3]); }
  else if (T < .1) L.push(['lichen', .7], ['herbe', .3]);
  else if (hum < .25 || (T > .8 && hum < .35)) L.push(['succulente', .45], ['herbe', .4], ['buisson', .15]);
  else { L.push(['herbe', .7 * (1 - c)], ['buisson', .3 * (1 - c)]); if (c >= .15) L.push(['arbre', c]); }
  const W = somme(L.map(x => x[1])) || 1; return L.filter(x => x[1] / W >= .03).map(([f, w]) => [f, w / W]);
}

// --- un brouteur devant une plante ---
// ce qu'il en atteint : l'herbe, tout le monde ; un arbre, qui grimpe, vole ou plane, sinon selon sa hauteur ; une algue, qui nage
function atteinte(h, traits, pl) {
  const riche = typeof pl === 'object' && pl.cle ? pl : null, forme = typeof pl === 'string' ? pl : portDe(pl), ap = riche?.appetence ?? 1;   // (docs/48) une plante de la flore riche : sa hauteur dit qui l'atteint, et ses feuilles coriaces rebutent
  const loco = h.locomotion || []; let pe = 1, haut = loco.includes('grimpe') || loco.includes('vol') || !!h.corps?.organes?.some(o => o.type === 'mains');   // (docs/24) des mains cueillent dans les arbres
  for (const id of traits || []) { const f = TR[id]?.flore; if (f) { pe += f.portee || 0; haut = haut || !!f.haut; } }   // des pattes longues, une queue préhensile…
  const reach = (h.taille_m || .5) * pe;
  switch (forme) {
    case 'arbre': return ap * (haut ? 1 : clamp(reach / (riche ? riche.hauteur_m / 3 : 4), .02, 1));
    case 'buisson': return ap * (haut ? 1 : clamp(reach / (riche ? riche.hauteur_m / 1.875 : .8), .2, 1));
    case 'roseau': return ap * clamp(reach / (riche ? riche.hauteur_m / 3.6 : .5), .3, 1);
    case 'algue': return ap * (loco.includes('nage') ? 1 : .1);
    default: return ap;
  }
}
// ce qu'il en supporte, phénotype par phénotype de la plante : le cuir épais contre les épines (et les toutes petites bêtes,
// qui passent entre), le métabolisme lent ou un grand estomac contre les toxines
function resistances(h, traits) { let tox = 0, epi = (h.masse_kg || 1) < .1 ? .5 : 0;
  for (const id of traits || []) { const f = TR[id]?.flore; if (f) { tox = Math.max(tox, f.toxique || 0); epi = Math.max(epi, f.epineux || 0); } }
  return { toxique: tox, epineux: epi }; }
const gout = (R, k) => { let g = 1; for (const d of PHENOS[k][1]) g *= 1 - REGLES.defenses[d].effet * (1 - R[d]); return g; };
// (vitesse, 7 novembre) un brouteur devant les plantes d'un lieu : ce qu'il atteint ne dépend que de la forme de la plante, ce qu'il
// supporte que du phénotype de la plante, ce qu'il en tire part par part des deux ; chaque calcul est fait une fois par brouteur,
// non une fois par plante : les mêmes nombres, des centaines de fois moins souvent
// Un même brouteur (le plan d'un phénotype, le même objet dans tous ses lieux) se retrouve devant les plantes de chacun de ses lieux :
// ce qu'il en tire est gardé le temps du cycle (VC, refait à chaque preparer), pour ce plan et ces traits-là.
let VC = new WeakMap();
function devant(h, traits, R) {
  const A = new Map(), P = new Map(), PV = new Map(), G = [0, 1, 2, 3].map(k => gout(R, k));
  const at = pl => { const c = cleDe(pl); let a = A.get(c); if (a === undefined) { a = atteinte(h, traits, pl); A.set(c, a); } return a; };   // (pl : le plan de la plante)
  return { R, at, g: k => G[k], parts: (pl, k) => { const c = cleDe(pl) + '|' + k; let v = P.get(c); if (!v) { v = parts(h, R, at(pl), pl, k); P.set(c, v); } return v; },
    pv: (pl, k) => { const c = cleDe(pl) + '|' + k; let v = PV.get(c); if (!v) { v = partsV(h, R, at(pl), pl, k); PV.set(c, v); } return v; } };   // (docs/46) part par part, pour le calendrier
}
function devantDe(h, traits) {
  const c = h && typeof h === 'object' ? VC.get(h) : null; if (c && c.traits === traits) return c.V;
  const V = devant(h, traits, resistances(h, traits)); if (h && typeof h === 'object' && !c) VC.set(h, { traits, V }); return V;
}

// --- l'éveil de la flore : une lignée par forme et par biome, au point d'équilibre avec les brouteurs du moment ---
function eveiller(inst, cfg = {}, ctx = {}) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.flore) return { inst: out, evenements: [] }; TR = catDe(out);
  const n = out.cycle?.n ?? 0, types = out.monde?.parcelles?.types || out.biomes, ids = new Set(out.taxons.map(t => t.id)), ev = [];
  let g = ((out.monde?.graine ?? 1) ^ 0x51ab) >>> 0; const R = () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
  let nb = 0;
  for (const B of types) for (const [forme, part] of compositionDe(B)) {
    const F = FORMES[forme], ty = B.id; let id = `flore-${ty}-${forme}`, k = 2; while (ids.has(id)) id = `flore-${ty}-${forme}-${k++}`; ids.add(id);
    const nom = (SYL[Math.floor(R() * SYL.length)] + SYL[Math.floor(R() * SYL.length)]).replace(/^./, c => c.toUpperCase());
    const parcelles = out.biomes.filter(b => typeDe(b) === ty), pops = [];
    for (const b of parcelles) { const K = (b.capacite_base ?? b.capacite ?? 0) * part; if (!(K > 0)) continue;
      pops.push({ biome: b.id, effectif: +(K / F.m).toFixed(2), tendance: 0, depuis: n, potentiel: +K.toFixed(2), frequences: DEPART.slice() }); }
    if (!pops.length) continue;
    out.taxons.push({ id, nom: `${nom} ${F.nom} (${B.nom || ty})`, parent: null, apparu: n, eteint: null, statut: 'stable',
      plan: { regime: 'vegetal', famille: 'vegetale', forme, hauteur_m: F.h, masse_kg: F.m, taille_m: F.h, croissance: F.r, locomotion: [], longevite: 50, maturite: 1, sociabilite: 0, temperament: 0, activite: 'continue', niche: { ...B.axes }, tolerance: .3 },
      populations: pops, phenotypes: PHENOS.map(([pid, traits], k) => ({ id: pid, frequence: DEPART[k], traits })) });
    nb++;
  }
  out.monde = { ...out.monde, flore: { depuis: n, lignees: nb } };
  // le rodage : les plantes seules sous les brouteurs du moment, jusqu'à l'équilibre ; ce qu'elles sont alors est la référence
  { const H = brouteursDe(out); for (let k = 0; k < REGLES.rodage; k++) pousser(out, H, null); }
  for (const t of out.taxons) if (estPlante(t)) for (const p of t.populations) p.reference = { effectif: p.effectif, frequences: p.frequences.slice() };
  ev.push({ type: 'eveil', taxon: out.taxons.find(estPlante)?.id, detail: `la flore s'éveille : ${nb} lignées de plantes, des herbes aux arbres, avec leurs défenses (toxines, épines)` });
  return { inst: out, evenements: ev };
}

// --- la nourriture d'un brouteur dans un lieu (maintenant, ou à la référence) ---
// (ref : true, l'état de référence de la plante ; 'diete', son état à l'éveil des régimes en spectre, docs/30)
const etatDe = (p, ref) => ref === 'diete' ? p.reference_diete || p.reference || p : ref ? p.reference || p : p;
function offre(plantes, h, traits, ref, nectar, ph) {
  const V = devantDe(h, traits); let S = 0, N = 0;
  for (const { t, p } of plantes) { const A = V.at(t.plan); if (!(A > 0)) continue;
    const e = etatDe(p, ref), B = e.effectif ?? p.effectif, f = e.frequences || p.frequences;
    let G = 0; for (let k = 0; k < 4; k++) G += (f[k] || 0) * V.g(k); S += B * t.plan.masse_kg * A * G;
    if (nectar && aFleurs(t.plan)) N += B * t.plan.masse_kg; }   // (un butineur : la moitié de ce qu'il mange est du nectar, que les défenses ne gardent pas)
  return nectar ? (ph ? .5 * S + .5 * N * ph.nectar : .5 * S + .5 * N) : S;   // (docs/46 : le nectar a sa saison)
}
// (docs/30) ce qu'une plante donne à une bête qui a un spectre, part par part : chaque part vient de certaines formes, et les
// défenses ne la gardent pas toutes pareil (un fruit est fait pour être mangé) ; x(k, part) pour chaque phénotype k de la plante
const goutPart = (R, k, part) => { let g = 1; for (const d of PHENOS[k][1]) g *= 1 - REGLES.defenses[d].effet * (DIE.DEFENSE[part]?.[d] ?? 1) * (1 - R[d]); return g; };
function parts(h, R, A, pl, k) { const d = h.diete, Y = rendDe(pl); let x = 0, l = 0;
  for (const part of DIE.VEG) { const w = d[part], y = Y[part]; if (!w || !y) continue; const v = w * y * A * goutPart(R, k, part); x += v; l += v * DIE.PERTE[part]; } return [x, l]; }
// (docs/46) les mêmes parts, une à une, et ce qu'elles donnent quand chacune a sa saison (ph : { nectar, fruits, graines })
function partsV(h, R, A, pl, k) { const d = h.diete, Y = rendDe(pl), o = [];
  for (const part of DIE.VEG) { const w = d[part], y = Y[part]; if (!w || !y) continue; o.push([part, w * y * A * goutPart(R, k, part)]); } return o; }
const enSaison = (pv, ph) => { let x = 0, l = 0; for (const [part, v] of pv) { const u = v * (ph[part] ?? 1); x += u; l += u * DIE.PERTE[part]; } return [x, l]; };
function offreD(plantes, h, traits, ref, ph) {
  const V = devantDe(h, traits); let S = 0;
  for (const { t, p } of plantes) { const A = V.at(t.plan); if (!(A > 0)) continue;
    const e = etatDe(p, ref), B = (e.effectif ?? p.effectif) * t.plan.masse_kg, f = e.frequences || p.frequences;
    for (let k = 0; k < 4; k++) if (f[k]) S += B * f[k] * (ph ? enSaison(V.pv(t.plan, k), ph) : V.parts(t.plan, k))[0]; }
  return S;
}
// les plantes de chaque lieu
function parLieu(inst) { const L = {}; for (const t of inst.taxons) if (estPlante(t) && !t.eteint) for (const p of t.populations) (L[p.biome] ??= []).push({ t, p }); return L; }

// --- la pousse : la repousse (selon la saison et ce qui reste de place), le broutage, la sélection, la mutation ---
// H : par lieu, les brouteurs [{ plan, traits, bio }] ; prod : par lieu, le facteur de saison (null : 1)
// (docs/30) la perte d'une plante sous les régimes en spectre est rapportée à l'éveil des régimes : la première fois qu'une plante
// est broutée part par part, on note, phénotype par phénotype, le rapport entre ce que lui prenaient les brouteurs d'hier (toute
// bouchée vaut une feuille) et ce que leur spectre lui prend ; ce calage la suit ensuite. Le jour de l'éveil, rien ne change ; après,
// ce sont les écarts qui comptent : plus de mangeurs de fruits, moins d'arbres tués. (Gardé dans reference_diete.perte, sinon
// reference.perte_diete.)
const calageDe = p => p.reference_diete ? p.reference_diete.perte : p.reference?.perte_diete;
const caler = (p, c) => { if (p.reference_diete) p.reference_diete.perte = c; else if (p.reference) p.reference.perte_diete = c; };
function pousser(inst, H, prod, disp, PH, SU) {
  const L = parLieu(inst);
  for (const [bid, plantes] of Object.entries(L)) {
    const ph = PH ? PH.parts(bid) : null, dent = PH ? PH.dent(bid) : 1;   // (docs/46) ce que chaque part donne en cette saison ; la dent, qui la suit
    const herb = H[bid] || [], perte = plantes.map(() => [0, 0, 0, 0]);
    const parts_ = DIE && herb.some(h => h.plan.diete), perteC = parts_ && plantes.some(({ p }) => !calageDe(p) && (p.reference_diete || p.reference)) ? plantes.map(() => [0, 0, 0, 0]) : null;
    // (toute bouchée vaut une feuille : la mesure d'avant les régimes en spectre)
    const classique = (h, R, P, V) => { const part = h.nectar ? .5 : 1, u = plantes.map(({ t, p }) => { const A = V.at(t.plan); return [0, 1, 2, 3].map(k => p.effectif * t.plan.masse_kg * (p.frequences[k] || 0) * A * V.g(k)); });
      const S = somme(u.map(somme)); if (!(S > 0)) return; const I = REGLES.broutage * h.bio * part;   // (un butineur ne broute que la moitié de ce qu'il mange)
      u.forEach((v, i) => v.forEach((x, k) => { P[i][k] += I * x / S; })); };
    for (const h of herb) { const V = devantDe(h.plan, h.traits), R = V.R;
      if (h.plan.diete && DIE) {   // (docs/30) une bouchée de fruit, de nectar, de graine ne prend pas à la plante ce que prend une feuille
        if (perteC) classique(h, R, perteC, V);
        const u = plantes.map(({ t, p }) => { return [0, 1, 2, 3].map(k => { const B = p.effectif * t.plan.masse_kg * (p.frequences[k] || 0); if (!(B > 0)) return [0, 0]; const [x, l] = ph ? enSaison(V.pv(t.plan, k), ph) : V.parts(t.plan, k); return [B * x, B * l]; }); });
        const S = somme(u.map(v => somme(v.map(x => x[0])))); if (!(S > 0)) continue; const I = REGLES.broutage * h.bio;
        u.forEach((v, i) => v.forEach(([, l], k) => { perte[i][k] += I * l / S; })); continue; }
      classique(h, R, perte, V); if (perteC) classique(h, R, perteC, V); }
    if (parts_) plantes.forEach(({ p }, i) => { let c = calageDe(p);
      if (!c && perteC && (p.reference_diete || p.reference)) { caler(p, perte[i].map((x, k) => x > 0 ? perteC[i][k] / x : 1)); perte[i] = perteC[i]; return; }   // (ce jour-là, la mesure d'hier telle quelle)
      if (c) perte[i] = perte[i].map((x, k) => x * (c[k] ?? 1)); });
    const bonus = SU ? plantes.map(({ t, p }) => SU.place(bid, t, p)) : null;   // (docs/47) la place que les pionnières prennent aux arbres disparus
    plantes.forEach(({ t, p }, i) => {
      const m = t.plan.masse_kg, B = p.effectif * m, K = bonus && p.potentiel != null ? p.potentiel + bonus[i] : p.potentiel ?? B, sec = SU ? SU.sec(bid, t.plan) : 0, r = t.plan.croissance * (aFleurs(t.plan) && !t.plan.vent ? prod?.[bid] ?? 1 : 1) * (disp && aFruits(t.plan) ? disp[bid] ?? 1 : 1) * (PH ? PH.pousse(bid, t.plan) : 1);   // (docs/30 : qui mange les fruits sème)
      // (une place qui fond ne tue pas une plante d'un coup : au pire elle perd sa repousse chaque cycle, jusqu'à sa nouvelle place ;
      //  une place nulle — la forme n'a plus sa place ici — la fait décliner de même)
      const Bk = [0, 1, 2, 3].map(k => B * (p.frequences[k] || 0)), place = K > 0 ? Math.max(REGLES.declin, 1 - B / K) : REGLES.declin;
      const nv = Bk.map((x, k) => { const cout = PHENOS[k][1].reduce((c, d) => c + REGLES.defenses[d].cout, 0);
        return Math.max(0, x + (r * place + REGLES.renouveau) * (1 - cout) * x - REGLES.renouveau * x - Math.min(dent === 1 ? perte[i][k] : perte[i][k] * dent, REGLES.prise_max * x) - (sec > 0 ? sec * x : 0)); });   // (docs/47 : le sec qui dure tue)
      const tot = somme(nv), semer = () => { if (p.graines > 0) p.effectif = +(p.effectif + p.graines).toFixed(m >= 1 ? 4 : 2); delete p.graines; };   // (docs/22 : les graines venues d'un voisin)
      if (!(tot > 0)) { p.effectif = 0; semer(); return; }
      const f = nv.map(x => x / tot).map(x => (1 - REGLES.mutation) * x + REGLES.mutation / 4);
      p.tendance = +(B > 0 ? (tot - B) / B : 0).toFixed(3); p.effectif = +(tot / m).toFixed(m >= 1 ? 4 : 2); p.frequences = f.map(x => +x.toFixed(5)); semer();
    });
  }
}

// --- un cycle : ce que le moteur appelle ---
function preparer(ctx) {
  const { plantes, etat, taxons, biomes, phase } = ctx; if (!plantes.length) return null; TR = ctx.cat || CATM; VC = new WeakMap();
  const inst = { taxons: plantes }, L = parLieu(inst), cache = new Map();
  const PH = PHE && ctx.monde?.phenologie ? PHE.preparer({ monde: ctx.monde, n: ctx.n, phase, biomes, saisons: ctx.saisons }) : null;   // (docs/46) les saisons des plantes
  const broute = t => t.plan.regime === 'herbivore' || t.plan.regime === 'omnivore';
  // la nourriture d'un brouteur, phénotype par phénotype : maintenant et à la référence
  const nourriture = (t, bid) => { const k = t.id + '|' + bid; if (cache.has(k)) return cache.get(k);
    const E = etat.get(t.id), P = E?.pops[bid], pl = L[bid]; let r = null;
    if (P && pl && pl.length) { const nec = estButineur(t), D = ctx.dietes && DIE && E.plans[0]?.diete, ph = PH ? PH.parts(bid) : null;
      // (docs/30) une bête qui a un spectre : sa nourriture part par part, rapportée à l'éveil des régimes ; ce qu'elle était alors
      // (l'ancienne mesure, de l'éveil des régimes à celui de la flore) la raccorde : le jour de l'éveil, rien ne bouge
      const S = t.phenotypes.map((q, i) => D ? offreD(pl, E.plans[i], q.traits, false, ph) : offre(pl, E.plans[i], q.traits, false, nec, ph)), S0 = t.phenotypes.map((q, i) => D ? offreD(pl, E.plans[i], q.traits, 'diete') : offre(pl, E.plans[i], q.traits, true, nec));
      const N = somme(P.N) || 1; let m = somme(P.N.map((x, i) => x * S[i])) / N, m0 = somme(P.N.map((x, i) => x * S0[i])) / N;
      if (D) { const c = somme(P.N.map((x, i) => x * offre(pl, E.plans[i], t.phenotypes[i].traits, 'diete', nec))), c0 = somme(P.N.map((x, i) => x * offre(pl, E.plans[i], t.phenotypes[i].traits, true, nec))); if (c0 > 0 && m0 > 0) m0 = m0 * c0 / c; }
      // (le facteur de chaque phénotype : l'inverse de sa nourriture, ramené à une moyenne de 1 sur la population : la sélection
      //  déplace les naissances d'un phénotype à l'autre sans changer leur total)
      const Sx = D ? S.map((s, i) => S0[i] > 0 ? offre(pl, E.plans[i], t.phenotypes[i].traits, false, nec) * s / S0[i] : s) : S;   // (docs/30 : raccordée à l'éveil, elle aussi)
      // (la moyenne se prend avec le poids de chaque phénotype dans les naissances, son effectif et ce que ses traits lui coûtent ;
      //  elle est refaite après les bornes : la somme pondérée des facteurs reste celle des effectifs)
      const w = P.N.map((x, i) => x * (1 - (E.couts?.[i] || 0))), W = somme(w) || 1, inv = Sx.map(s => s > 0 ? 1 / s : 0), mi = somme(w.map((x, i) => x * inv[i])) / W;
      let fa = inv.map(v => mi > 0 && v > 0 ? clamp(v / mi, .5, 2) : 1);
      for (let k = 0; k < 3; k++) { const m1 = somme(w.map((x, i) => x * fa[i])) / W; if (!(m1 > 0) || Math.abs(m1 - 1) < 1e-12) break; fa = fa.map(v => clamp(v / m1, .5, 2)); }
      r = { ratio: m0 > 0 ? clamp(m / m0, REGLES.ratio[0], REGLES.ratio[1]) : 1, facteur: fa }; }
    cache.set(k, r); return r; };
  // la concurrence par ce qu'on mange en commun : par lieu, chaque bête qui pèse sur la place, son régime de plantes (ce qu'elle
  // atteint et supporte de chacune) ; deux brouteurs qui ne mangent pas les mêmes plantes se gênent peu
  const conc = new Map(), mangeurs = {}, araccorder = new Set();   // (docs/30) les lieux où une population attend son raccord : l'ancienne mesure y est prise pour tous
  if (ctx.dietes) for (const t of taxons) { const E = etat.get(t.id); if (E) for (const [bid, P] of Object.entries(E.pops)) if (P.recAvant > 0) araccorder.add(bid); }
  for (const t of taxons) { if (t.eteint) continue; const E = etat.get(t.id); if (!E) continue; const w = ctx.PART_K[t.plan.regime] ?? 1; if (!(w > 0)) continue;
    for (const [bid, P] of Object.entries(E.pops)) { const Bio = somme(P.N.map((x, i) => x * (E.plans[i].masse_kg || 1))) * w; if (!(Bio > 0)) continue;
      const pl = L[bid], D = ctx.dietes && DIE && E.plans[0]?.diete, u = broute(t) && pl ? pl.flatMap(({ t: q, p }) => { const A = atteinte(E.plans[0], t.phenotypes[0]?.traits, q.plan), R = resistances(E.plans[0], t.phenotypes[0]?.traits);
        if (D) { const Y = rendDe(q.plan); return [0, 1, 2, 3].flatMap(k => DIE.VEG.map(part => p.effectif * q.plan.masse_kg * (p.frequences[k] || 0) * A * (D[part] || 0) * (Y[part] || 0) * goutPart(R, k, part))); }   // (docs/30 : part par part)
        return [0, 1, 2, 3].map(k => p.effectif * q.plan.masse_kg * (p.frequences[k] || 0) * A * gout(R, k)); }) : null;
      // (docs/30) l'ancienne mesure aussi, le temps de raccorder la référence de chaque population à l'éveil des régimes
      const uo = D && broute(t) && pl && araccorder.has(bid) ? pl.flatMap(({ t: q, p }) => { const A = atteinte(E.plans[0], t.phenotypes[0]?.traits, q.plan), R = resistances(E.plans[0], t.phenotypes[0]?.traits); return [0, 1, 2, 3].map(k => p.effectif * q.plan.masse_kg * (p.frequences[k] || 0) * A * gout(R, k)); }) : null;
      (mangeurs[bid] ??= []).push({ t, P, Bio, m: t.plan.masse_kg || 1, u, n2: u ? Math.sqrt(somme(u.map(x => x * x))) : 0, uo, n2o: uo ? Math.sqrt(somme(uo.map(x => x * x))) : 0 }); } }
  const recouvrementDe = (t, bid, ancien) => { const k = t.id + '|' + bid + (ancien ? '|a' : ''); if (conc.has(k)) return conc.get(k);
    const M = mangeurs[bid] || [], h = M.find(x => x.t === t), U = x => ancien && x.uo ? x.uo : x.u, Z = x => ancien && x.uo ? x.n2o : x.n2; let r = null;
    if (h && U(h) && Z(h) > 0) { let num = 0, den = 0;
      for (const j of M) { const w = j.Bio * ctx.recouvrement(h.m, j.m); if (!(w > 0)) continue;
        const O = j === h ? 1 : U(j) && Z(j) > 0 && U(j).length === U(h).length ? somme(U(h).map((x, i) => x * U(j)[i])) / (Z(h) * Z(j)) : 1; num += w * O; den += w; }
      r = den > 0 ? num / den : null; }
    conc.set(k, r); return r; };
  const F = {
    ratio: (t, bid) => broute(t) ? nourriture(t, bid)?.ratio ?? 1 : 1,
    // la place d'un brouteur : la charge de sa bande, pesée par ce qu'il mange en commun avec elle, rapportée à ce qu'elle était à
    // son arrivée (le jour de l'éveil, rien ne change) : qui se raréfie et mange autre chose que ses voisins regagne de la place
    concurrence: (t, bid) => { if (!broute(t)) return 1; const r = recouvrementDe(t, bid), P = etat.get(t.id)?.pops[bid]; if (r == null || !P) return 1;
      if (!(P.rec0 > 0) && P.recAvant > 0) { const ro = recouvrementDe(t, bid, true); P.rec0 = ro > 0 ? P.recAvant * r / ro : r; delete P.recAvant; }   // (docs/30 : raccordée, le jour de l'éveil rien ne change)
      if (!(P.rec0 > 0)) { P.rec0 = r; return 1; } return clamp(r / P.rec0, REGLES.concurrence[0], REGLES.concurrence[1]); },
    facteur: (t, bid, i) => broute(t) ? nourriture(t, bid)?.facteur[i] ?? 1 : 1,
    // après la dynamique des bêtes : la pousse des plantes, sous les brouteurs du début du cycle
    apres: () => {
      const H = {}, prod = {};
      for (const t of taxons) { if (t.eteint || !broute(t)) continue; const E = etat.get(t.id); if (!E) continue;
        for (const [bid, P] of Object.entries(E.pops)) { const w = t.plan.regime === 'omnivore' ? .6 : 1;
          const nectar = estButineur(t); P.N.forEach((x, i) => { if (x > 0) (H[bid] ??= []).push({ plan: E.plans[i], traits: t.phenotypes[i]?.traits || [], bio: x * (E.plans[i].masse_kg || 1) * w, nectar }); }); } }
      // (docs/18) la pollinisation : les petites bêtes qui butinent (les herbivores et omnivores de moins de 100 g qui volent ou
      // grimpent, et tous ceux de moins de 20 g : les insectes) font
      // repousser les plantes à fleurs de leur lieu, jusqu'à 30 % de plus ; rapporté à ce qu'elles faisaient à l'éveil, ou à leur
      // première fois (le jour un ne change rien) ; sans elles, les fleurs repoussent moins
      const poll = {};
      for (const t of taxons) { if (t.eteint || !estButineur(t)) continue; const E = etat.get(t.id); if (!E) continue;
        for (const [bid, P] of Object.entries(E.pops)) poll[bid] = (poll[bid] || 0) + somme(P.N.map((x, i) => x * (E.plans[i].masse_kg || 1))); }
      for (const [bid, pl] of Object.entries(L)) { const K = somme(pl.map(({ p }) => p.potentiel || 0)), pi = K > 0 ? (poll[bid] || 0) / ((poll[bid] || 0) + REGLES.pollinisation.demi * K) : 0;
        let ref = null; for (const { t, p } of pl) if (aFleurs(t.plan)) { if (p.pollinisation == null) { p.pollinisation = +pi.toPrecision(4); ref ??= pi; } ref ??= p.pollinisation; }   // (la première fois : exactement 1)
        prod[bid] = ref == null ? 1 : (1 + REGLES.pollinisation.gain * pi) / (1 + REGLES.pollinisation.gain * ref); }
      // (docs/30) la dispersion : qui mange les fruits sème les graines ; les arbres, les buissons, les succulentes repoussent jusqu'à
      // 20 % de plus là où l'on en mange beaucoup, rapporté à leur première fois (le jour un ne change rien)
      let disp = null;
      if (ctx.dietes && DIE) { const F = {}; disp = {};
        for (const t of taxons) { if (t.eteint || !broute(t)) continue; const E = etat.get(t.id), fr = E?.plans[0]?.diete?.fruits || 0; if (!(fr > 0)) continue;
          for (const [bid, P] of Object.entries(E.pops)) F[bid] = (F[bid] || 0) + fr * somme(P.N.map((x, i) => x * (E.plans[i].masse_kg || 1))); }
        for (const [bid, pl] of Object.entries(L)) { const K = somme(pl.map(({ p }) => p.potentiel || 0)), pi = K > 0 ? (F[bid] || 0) / ((F[bid] || 0) + DIE.REGLES.dispersion.demi * K) : 0;
          let ref = null; for (const { t, p } of pl) if (aFruits(t.plan)) { if (p.dispersion == null) { p.dispersion = +pi.toPrecision(4); ref ??= pi; } ref ??= p.dispersion; }   // (la première fois : exactement 1)
          disp[bid] = ref == null ? 1 : (1 + DIE.REGLES.dispersion.gain * pi) / (1 + DIE.REGLES.dispersion.gain * ref); } }
      const SU = ctx.succession || null; if (SU) SU.frapper(ctx.sinistres);   // (docs/47) les catastrophes du cycle prennent des pieds
      pousser(inst, H, prod, disp, PH, SU);
      if (PH) for (const t of plantes) for (const p of t.populations) { Object.assign(p, PH.stade(p.biome, t.plan)); if (p.sinistre?.type === 'incendie' && ctx.n - p.sinistre.cycle <= 3) p.stade = 'brule'; }   // (docs/46) ce qu'un jeu montre ; (docs/47) une plante qui vient de brûler   // (la saison est déjà dans la place des brouteurs : la repousse n'en tient pas compte une seconde fois)
    },
    publier: (t, bid, p, pop) => { if (!broute(t)) return; const r = nourriture(t, bid); if (r && Math.abs(r.ratio - 1) >= .005) p.nourriture = +r.ratio.toFixed(3);
      if (pop?.recAvant > 0 && !(pop.rec0 > 0)) { p.recouvrement_avant = pop.recAvant; return; }   // (docs/30 : pas encore raccordée)
      const rc = pop?.rec0 ?? recouvrementDe(t, bid); if (rc > 0) p.recouvrement = +rc.toPrecision(4); },
    // les plantes, écrites : leurs fréquences (globales, par lieu) et leur statut
    ecrire: () => plantes.map(t => {
      if (t.eteint && !t.populations.length) { t.statut = 'eteint'; t.phenotypes = (t.phenotypes || []).map(q => { const { frequence_par_biome, ...r } = q; return { ...r, frequence: 0 }; }); return t; }   // (docs/48) une lignée de plantes éteinte reste listée, sans population
      const tot = somme(t.populations.map(p => p.effectif)) || 0, ref = somme(t.populations.map(p => p.reference?.effectif ?? p.effectif)) || 1;
      t.phenotypes = PHENOS.map(([pid, traits], k) => { const f = tot > 0 ? somme(t.populations.map(p => p.effectif * (p.frequences[k] || 0))) / tot : 0;
        const q = { id: pid, frequence: +f.toFixed(4), traits, cout_total: +traits.reduce((c, d) => c + REGLES.defenses[d].cout, 0).toFixed(3) };
        if (t.populations.length > 1) q.frequence_par_biome = Object.fromEntries(t.populations.map(p => [p.biome, +(p.frequences[k] || 0).toFixed(4)])); return q; });
      t.statut = tot < .2 * ref ? 'declin' : tot > 1.2 * ref ? 'croissance' : 'stable'; return t; })
  };
  return F;
}
// les brouteurs d'un instantané, par lieu (pour le rodage de l'éveil)
function brouteursDe(inst) {
  const H = {};
  for (const t of inst.taxons) { if (t.eteint || !(t.plan.regime === 'herbivore' || t.plan.regime === 'omnivore')) continue; const w = t.plan.regime === 'omnivore' ? .6 : 1;
    for (const p of t.populations) for (const ph of t.phenotypes) { const f = ph.frequence_par_biome?.[p.biome] ?? ph.frequence; if (!(f > 0)) continue;
      (H[p.biome] ??= []).push({ plan: t.plan, traits: ph.traits, bio: p.effectif * f * (t.plan.masse_kg || 1) * w, nectar: estButineur(t) }); } }
  return H;
}

const API = { REGLES, FORMES, TRAITS, PHENOS, portDe, rendDe, estButineur, eveiller, preparer, compositionDe, atteinte, resistances, offre, offreD, brouteursDe, estPlante };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneFlore = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
