// Orvane — LE CLIMAT ET LA GÉOLOGIE LENTE (moteur/climat.js) — docs/31
// Jusqu'ici, seuls les bêtes et les joueurs faisaient bouger les axes d'un lieu. Dans un monde au climat éveillé, le monde entier
// se réchauffe et se refroidit, lentement, de lui-même :
//  - le climat : la température de tous les lieux suit deux lentes oscillations (un grand cycle glaciaire, un petit) et une marche
//    au hasard qui revient vers zéro ; le froid est sec, le chaud humide ; la mer en sent la moitié, le sous-sol un tiers ;
//  - la mer : quand le monde se refroidit assez, la mer baisse et des ponts de terre émergent entre deux rivages d'une même mer ;
//    ils disparaissent quand elle remonte. Des lignées se rejoignent, puis se séparent à nouveau ;
//  - les volcans : très rarement, une île naît sous la mer, au large d'un rivage. Seules les bêtes qui volent ou nagent, et les
//    toutes petites qui dérivent, y passent ; sa terre est d'abord pauvre, puis s'enrichit ; ses plantes viennent du rivage.
// Ce que le climat fait aux axes, la niche de chaque lignée, la flore et les natures des lieux (docs/28) le suivent. Tout part de zéro à
// l'éveil : le jour de l'éveil, rien ne bouge. Le hasard du climat est le sien. Un monde qui ne l'a pas éveillé n'en voit rien.
// Déterministe. Node (require) ou navigateur (globalThis.OrvaneClimat).
'use strict';
(function (racine) {
const FLO = (typeof require === 'function' ? require('./flore.js') : racine.OrvaneFlore) || null;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), r4 = v => +(+v).toFixed(4);
const REGLES = {
  ondes: [{ periode: 1500, ampleur: .08, phase: .7 }, { periode: 400, ampleur: .03, phase: 2.1 }],   // en cycles ; l'écart de température (de 0 à 1)
  marche: { pas: .003, retour: .01 },          // la marche au hasard : un pas par cycle, et un rappel vers zéro
  humidite: -.5,                               // le froid est sec : l'humidité bouge de −0,5 fois la température
  sentis: { marin: .5, souterrain: .3 },       // ce qu'un lieu sent de l'écart (1 par défaut)
  vitesse: 1,                                  // (un banc peut accélérer le temps du climat)
  force: null,                                 // (un écart imposé, à la place des ondes et de la marche)
  ponts: { emerger: -.06, sombrer: -.04, max: 3 },   // la mer baisse sous −0,06 : des ponts émergent ; ils sombrent au-dessus de −0,04
  iles: { chance: .001, max: 3, surface: .5, depart: .05, maturite: 300, plantes: .05, derive: .002 },   // 0,1 % par cycle ; au plus 3 ; la moitié de la place d'un rivage, d'abord 5 %, toute en 300 cycles ; 5 % des plantes du rivage ; 0,2 % par cycle de qui peut traverser
  signal: .03                                  // un événement quand l'écart a bougé de 0,03 depuis le dernier
};
const TERRE = new Set(['terrestre', 'amphibie']), typeDe = b => b.type || b.id;
const generateur = g => () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
const hacher = (a, b) => (Math.imul(((a >>> 0) ^ 0x51ed27) >>> 0, 2654435761) ^ Math.imul(b + 1, 0x85ebca6b)) >>> 0;
// peut traverser la mer : voler, nager, ou dériver (les toutes petites bêtes, sur des radeaux de branches)
const traverse = plan => { const L = plan?.locomotion || []; return L.includes('vol') || L.includes('nage') || (plan?.masse_kg || 1) <= .01; };

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.climat) return { inst: out, evenements: [] };
  for (const b of out.biomes) if (!b.transforme) b.climat = { base: { ...b.axes } };   // (un lieu que le milieu ne transforme pas garde ses axes de l'éveil)
  out.monde = { ...out.monde, climat: { depuis: out.cycle?.n ?? 0, temperature: 0, humidite: 0, marche: 0, signale: 0, ponts: [], iles: 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.biomes[0]?.id, detail: 'le climat s\'éveille : le monde se réchauffera et se refroidira de lui-même, la mer montera et baissera, des volcans feront des îles' }] };
}

// l'écart de température d'un cycle : les ondes (nulles à l'éveil) et la marche
function ecart(C, n, graine) {
  if (n - C.depuis <= 1) return { marche: 0, temperature: 0 };   // (le premier cycle après l'éveil : rien ne bouge encore)
  if (typeof REGLES.force === 'number') return { marche: 0, temperature: REGLES.force };   // (un écart imposé : un banc, un auteur de monde qui veut son âge glaciaire)
  const t = (n - C.depuis) * REGLES.vitesse; let o = 0;
  for (const w of REGLES.ondes) o += w.ampleur * (Math.sin(2 * Math.PI * t / w.periode + w.phase) - Math.sin(w.phase));
  const R = generateur(hacher(graine, n)), g = Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R());
  const m = C.marche * (1 - REGLES.marche.retour * REGLES.vitesse) + REGLES.marche.pas * Math.sqrt(REGLES.vitesse) * g;
  return { marche: m, temperature: clamp(o + m, -.3, .3) };
}

function preparer(ctx) {
  const { monde, biomes, n, taxons = [] } = ctx, C = JSON.parse(JSON.stringify(monde.climat)), ev = [], B = biomes;
  const e = ecart(C, n, monde.graine); C.marche = r4(e.marche); C.temperature = r4(e.temperature); C.humidite = r4(REGLES.humidite * e.temperature);
  if (Math.abs(C.temperature - C.signale) >= REGLES.signal) { const chaud = C.temperature > C.signale;
    ev.push({ type: 'climat', taxon: Object.keys(B)[0], detail: `le monde se ${chaud ? 'réchauffe' : 'refroidit'} : ${C.temperature >= 0 ? '+' : '−'}${String(Math.abs(Math.round(C.temperature * 100) / 100)).replace('.', ',')} de température depuis l'éveil du climat${C.temperature <= REGLES.ponts.emerger ? ', un âge glaciaire' : C.temperature >= -REGLES.ponts.emerger ? ', un âge chaud' : ''}` });
    C.signale = C.temperature; }
  const decalage = b => { const s = REGLES.sentis[b.milieu] ?? 1; return { temperature: C.temperature * s, humidite: b.milieu === 'marin' || b.milieu === 'aquatique' ? 0 : C.humidite * s }; };
  let types = null;   // (un monde par parcelles : les types de lieux, si une île en ajoute un)
  // (lieux que le milieu ne transforme pas : le climat fait leurs axes ; les autres, le milieu les fait, avec lui : moteur/milieu.js)
  const appliquer = () => { for (const b of Object.values(B)) { if (b.transforme || !b.climat?.base) continue; const d = decalage(b);
    b.axes = { ...b.axes, temperature: r4(clamp((b.climat.base.temperature ?? .5) + d.temperature)), ...(b.climat.base.humidite != null ? { humidite: r4(clamp(b.climat.base.humidite + d.humidite)) } : {}) }; } };
  // la mer baisse : des ponts de terre entre deux rivages d'une même mer ; elle remonte : ils sombrent
  const ponts = () => {
    if (C.temperature >= REGLES.ponts.sombrer && C.ponts.length) { for (const [a, b] of C.ponts) { const A = B[a], Bb = B[b]; if (A) A.voisins = (A.voisins || []).filter(v => v !== b); if (Bb) Bb.voisins = (Bb.voisins || []).filter(v => v !== a);
        ev.push({ type: 'climat', taxon: a, biome: a, detail: `la mer remonte : le pont de terre entre ${A?.nom || a} et ${Bb?.nom || b} sombre` }); } C.ponts = []; }
    if (C.temperature <= REGLES.ponts.emerger && !C.ponts.length) {
      const cands = [];
      for (const m of Object.values(B)) { if (m.milieu !== 'marin') continue; const R = (m.voisins || []).map(v => B[v]).filter(x => x && TERRE.has(x.milieu));
        for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (typeDe(a) === typeDe(b) || (a.voisins || []).includes(b.id)) continue;
          const k = [a.id, b.id].sort(); if (!cands.some(c => c[0] === k[0] && c[1] === k[1])) cands.push([...k, Math.abs((a.axes.temperature ?? .5) - (b.axes.temperature ?? .5))]); } }
      for (const [a, b] of cands.sort((x, y) => x[2] - y[2] || (x[0] + x[1] < y[0] + y[1] ? -1 : 1)).slice(0, REGLES.ponts.max)) {
        B[a].voisins = [...(B[a].voisins || []), b]; B[b].voisins = [...(B[b].voisins || []), a]; C.ponts.push([a, b]);
        ev.push({ type: 'climat', taxon: a, biome: a, detail: `la mer baisse : un pont de terre émerge entre ${B[a].nom || a} et ${B[b].nom || b}` }); } }
  };
  // un volcan sous la mer : une île naît au large d'un rivage
  const ile = () => {
    if (C.iles >= REGLES.iles.max) return; const R = generateur(hacher((monde.graine >>> 0) ^ 0x1e7, n)); if (R() >= REGLES.iles.chance * REGLES.vitesse) return;
    const mers = Object.values(B).filter(m => m.milieu === 'marin' && (m.axes.lumiere ?? 0) > .3 && (m.voisins || []).some(v => B[v] && TERRE.has(B[v].milieu))).sort((a, b) => a.id < b.id ? -1 : 1); if (!mers.length) return;
    const m = mers[Math.floor(R() * mers.length)], rives = m.voisins.map(v => B[v]).filter(x => x && TERRE.has(x.milieu)).sort((a, b) => a.id < b.id ? -1 : 1), c = rives[Math.floor(R() * rives.length)];
    const k = ++C.iles; let id = `ile-${k}`; while (B[id]) id += '-b';
    const cible = (c.capacite_base ?? c.capacite ?? 0) * REGLES.iles.surface, axes = { temperature: r4(clamp((m.axes.temperature ?? .5) + .05)), humidite: .65, altitude: .35, lumiere: .85, couvert: .05 };
    const b = { id, nom: `Île de cendre ${k}`, milieu: 'terrestre', axes, capacite: r4(cible * REGLES.iles.depart), capacite_base: r4(cible * REGLES.iles.depart), voisins: [m.id, c.id], traversees: [c.id],
      jeune: { nee: n, cible: r4(cible) }, ...(c.type ? { type: id } : {}) };
    if (monde.milieu) b.transforme = { base: { ...axes }, etat: { ...axes }, jeu: {}, ref: { pat: 0, fou: 0 }, signale: { ...axes } }; else b.climat = { base: { ...axes } };
    B[id] = b; m.voisins = [...(m.voisins || []), id]; c.voisins = [...(c.voisins || []), id]; c.traversees = [...(c.traversees || []), id];
    if (c.type && monde.parcelles?.types) types = [...(types || monde.parcelles.types), { id, nom: b.nom, milieu: 'terrestre', axes: { ...axes }, capacite: b.capacite, capacite_base: b.capacite_base, voisins: [typeDe(m), typeDe(c)] }];
    // ses plantes viennent du rivage : 5 % de chaque lignée de plantes du rivage dont la forme pousse sur l'île
    if (FLO) { const parts = Object.fromEntries(FLO.compositionDe(b));
      for (const t of taxons) { if (t.plan?.regime !== 'vegetal' || t.eteint) continue; const p = t.populations.find(x => x.biome === c.id), w = parts[t.plan.forme]; if (!p || !w) continue;
        const ef = +(p.effectif * REGLES.iles.plantes).toFixed(2), pot = +(cible * w).toFixed(2);
        t.populations.push({ biome: id, effectif: ef, tendance: 0, depuis: n, potentiel: pot, frequences: (p.frequences || []).slice(), reference: { effectif: ef, frequences: (p.frequences || []).slice() },
          ...(p.reference_diete ? { reference_diete: { effectif: ef, frequences: (p.frequences || []).slice() } } : {}) }); } }
    ev.push({ type: 'climat', taxon: id, biome: id, detail: `un volcan sous la mer : une île naît au large de ${c.nom || c.id}, ${b.nom} ; seules les bêtes qui volent, nagent ou dérivent y passeront` });
  };
  // une île jeune : sa terre s'enrichit
  const murir = () => { for (const b of Object.values(B)) if (b.jeune) { const k = Math.min(1, REGLES.iles.depart + (1 - REGLES.iles.depart) * (n - b.jeune.nee) * REGLES.vitesse / REGLES.iles.maturite);
    b.capacite_base = r4(b.jeune.cible * k); if (k >= 1) delete b.jeune; } };
  return {
    decalage, appliquer, avant: () => { ile(); ponts(); murir(); }, evenements: ev, traverse,
    monde: m => ({ ...m, climat: C, ...(types ? { parcelles: { ...m.parcelles, types } } : {}) })
  };
}

// un tirage à part, d'après un nom et un cycle (le hasard du cycle ne bouge pas)
const hasard = (s, n) => { let g = 2166136261 >>> 0; for (const c of String(s)) g = Math.imul(g ^ c.charCodeAt(0), 16777619) >>> 0; return generateur(hacher(g, n))(); };
const API = { REGLES, eveiller, preparer, ecart, traverse, hasard };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneClimat = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
