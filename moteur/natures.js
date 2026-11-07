// Orvane — LES LIEUX QUI CHANGENT DE NATURE (moteur/natures.js) — docs/28
// Dans un monde au milieu transformé (docs/22), les axes d'un lieu bougent : une forêt que ses brouteurs ou ses joueurs défrichent
// s'ouvre, un lac qu'on assèche baisse, des barrages noient une rive. Ici, un lieu dont les axes ressemblent désormais plus à un autre
// type de lieu qu'au sien en prend la nature :
//  - une forêt défrichée devient une prairie, une prairie desséchée une steppe, un lac asséché une côte, puis une prairie ;
//  - il prend le milieu de sa nouvelle nature (de l'eau à la rive, de la rive à la terre, un pas à la fois) : un lac asséché ne
//    porte plus ses poissons ; et ses saisons ;
//  - un lieu loin de tous les types connus en invente un : une « forêt sèche », un « désert humide » ; d'autres lieux pourront le
//    rejoindre ;
//  - un lieu dont les axes reviennent reprend sa nature d'origine.
// Sa nature d'origine se mesure à ce qu'il était, les autres à leur type ; un écart (marge) protège des allers-retours. Les types de lieux du monde, et ceux qu'il invente, sont gardés dans monde.natures.
// Un monde qui ne l'a pas éveillé n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneNatures).
'use strict';
(function (racine) {
const REGLES = { marge: .04, inedit: .2, max: 30, poids: { temperature: 1, humidite: 1, altitude: .5, lumiere: .3, couvert: 1 } };
// les milieux voisins : un lieu passe de l'un à l'autre un pas à la fois ; la mer, le sous-sol et le ciel gardent le leur
const VOISINS = { aquatique: ['aquatique', 'amphibie'], amphibie: ['aquatique', 'amphibie', 'terrestre'], terrestre: ['amphibie', 'terrestre'] };
const QUALIF = { couvert: [['boisé', 'boisée'], ['ouvert', 'ouverte']], humidite: [['humide', 'humide'], ['sec', 'sèche']], temperature: [['chaud', 'chaude'], ['froid', 'froide']],
  lumiere: [['clair', 'claire'], ['sombre', 'sombre']], altitude: [['haut', 'haute'], ['bas', 'basse']] };
const MASC = new Set(['désert', 'lac', 'marais', 'récif', 'large', 'volcan', 'sommets', 'maquis', 'abysses', 'plateau', 'fjord', 'delta', 'bois', 'glacier', 'littoral', 'fond']);
const FEM_PL = new Set(['abysses']);
const sansAccent = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const typeDe = b => b.type || b.id;
const r3 = v => +(+v).toFixed(3), min = s => String(s).charAt(0).toLowerCase() + String(s).slice(1);
function accorder(nom, [m, f]) { const w = String(nom).split(' ')[0].toLowerCase(), plur = /[sx]$/.test(w) && !['marais', 'maquis', 'bois', 'fond'].includes(w);
  const e = FEM_PL.has(w) || (!MASC.has(w) && /e$|a$|ière$|forêt|toundra/.test(w)) ? f : m; return plur && !/[sx]$/.test(e) ? e + 's' : e; }
const article = nom => { const w = String(nom).split(' ')[0].toLowerCase(), e = accorder(nom, ['m', 'f']); return /[sx]$/.test(w) && !['marais', 'maquis', 'bois'].includes(w) ? 'des' : e.startsWith('f') ? 'une' : 'un'; };

// la distance de deux lieux, sur les axes du type (pondérés : la lumière suit le couvert, l'altitude ne bouge guère)
function distance(a, ref) { let s = 0, w = 0; for (const k in ref) { if (typeof ref[k] !== 'number' || typeof a[k] !== 'number') continue; const p = REGLES.poids[k] ?? .5; s += p * (a[k] - ref[k]) ** 2; w += p; } return w ? Math.sqrt(s / w) : 0; }

const continentDe = id => { const m = /~(.+)-\d+$/.exec(String(id)); return m ? m[1] : ''; };
// l'éveil : les types de lieux du monde, tels qu'ils sont (les biomes d'avant les parcelles, leurs axes d'avant le milieu transformé)
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.natures) return { inst: out, evenements: [] };
  const src = out.monde?.parcelles?.types || out.biomes, types = {};
  // (le continent d'un type : celui de ses parcelles, quand une fusion par ponts en a fait un continent à part, docs/23 —
  // « lande~genese-7-1 » est de la genèse 7 ; un monde par biomes, ou d'un seul tenant, n'en a qu'un)
  const conts = {}; for (const p of out.biomes) { const t = String(p.id).split('~')[0], c = continentDe(p.id); (conts[t] ||= new Set()).add(c); }
  for (const b of src) { const ici = out.biomes.find(x => x.id === b.id) || b, C = [...(conts[b.id] || [])];
    types[b.id] = { nom: b.nom || b.id, milieu: b.milieu, axes: { ...(ici.transforme?.base || b.axes) }, ...(b.saisons !== undefined ? { saisons: b.saisons } : {}), ...(C.length === 1 && C[0] ? { continent: C[0] } : {}) }; }
  out.monde = { ...out.monde, natures: { depuis: out.cycle?.n ?? 0, types } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.biomes[0]?.id, detail: `les lieux peuvent changer de nature : ${Object.keys(types).length} types de lieux, et ceux que le monde inventera` }] };
}

// un cycle (après le milieu) : chaque lieu prend la nature dont ses axes sont le plus près, s'il s'en est assez rapproché
function preparer(monde, n) {
  const N = JSON.parse(JSON.stringify(monde.natures)), T = N.types, ev = [];
  function changer(b) {
    const own = typeDe(b), cur = b.nature?.type || own, C = T[cur] || T[own]; if (!C || !T[own]) return;
    // sa nature d'origine se mesure à ce qu'il était (une parcelle n'est pas tout à fait son biome) ; les autres, à leur type
    const ref = id => id === own && b.transforme?.base ? b.transforme.base : T[id].axes;
    // (un lieu prend d'abord les natures de son continent : une forêt défrichée du continent d'Orvane devient une prairie, pas les
    // « terres creuses » du continent de la genèse 7 ; les natures inventées sont à tous)
    const ok = VOISINS[C.milieu] || [C.milieu], co = continentDe(b.id), duMien = id => T[id].inedit || (T[id].continent || '') === co;
    let cands = Object.keys(T).filter(id => ok.includes(T[id].milieu)); if (cands.some(duMien)) cands = cands.filter(duMien);
    let best = cur, db = distance(b.axes, ref(cur)), dc = db; for (const id of cands) { const d = distance(b.axes, ref(id)); if (d < db - 1e-9) { best = id; db = d; } }
    let vers = null;
    // (loin de tout : de ce qu'il peut devenir d'un pas, et de ce qu'il pourrait devenir en plusieurs ; sinon, il fait un pas)
    const chaine = VOISINS[C.milieu] ? Object.keys(VOISINS) : [C.milieu], loin = Object.keys(T).filter(id => chaine.includes(T[id].milieu)).every(id => distance(b.axes, ref(id)) > REGLES.inedit);
    if (db > REGLES.inedit && dc > REGLES.inedit && loin && Object.values(T).filter(t => t.inedit).length < REGLES.max) {
      // loin de tout ce qu'on connaît : une nature neuve, d'après la plus proche et l'axe qui s'en écarte le plus
      const P = T[best], ks = Object.keys(QUALIF).filter(k => typeof b.axes[k] === 'number' && typeof P.axes[k] === 'number');
      const k = ks.sort((x, y) => (REGLES.poids[y] ?? .5) * Math.abs(b.axes[y] - P.axes[y]) - (REGLES.poids[x] ?? .5) * Math.abs(b.axes[x] - P.axes[x]))[0];
      if (k) { const q = accorder(P.nom, QUALIF[k][b.axes[k] > P.axes[k] ? 0 : 1]), id = `${best}-${sansAccent(q)}`;
        if (!T[id]) T[id] = { nom: `${P.nom} ${q}`, milieu: P.milieu, axes: Object.fromEntries(Object.entries(b.axes).map(([x, v]) => [x, r3(v)])), ...(b.saisons !== undefined ? { saisons: b.saisons } : {}), inedit: true, de: best, apparu: n };
        if (id !== cur) vers = id; }
    } else if (best !== cur && db < dc - REGLES.marge) vers = best;
    if (!vers) return;
    const V = T[vers], avant = b.milieu, nom = b.nom || b.id;
    b.milieu = V.milieu; if (V.saisons !== undefined) b.saisons = V.saisons; else delete b.saisons;
    if (vers === own) delete b.nature; else b.nature = { type: vers, nom: V.nom, depuis: n, ...(V.inedit ? { inedite: true } : {}) };
    const pas = avant === V.milieu ? '' : V.milieu === 'terrestre' ? ' : l\'eau s\'est retirée' : avant === 'terrestre' ? ' : l\'eau l\'a gagné' : V.milieu === 'aquatique' ? ' : l\'eau le recouvre' : ' : l\'eau baisse';
    ev.push({ type: 'nature', taxon: b.id, biome: b.id, detail: vers === own ? `${nom} redevient ${article(V.nom)} ${min(V.nom)}${pas}` : `${nom} devient ${article(V.nom)} ${min(V.nom)}${V.inedit && V.apparu === n ? ', une nature que le monde ne connaissait pas' : ''}${pas}` });
  }
  return { changer, evenements: ev, monde: m => ({ ...m, natures: N }) };
}

// ce qu'un biome publié montre de ses parcelles d'une autre nature (Parcelles.regrouper) : la part de chacune
function parts(L) { const W = L.reduce((a, p) => a + (p.capacite || 1), 0) || 1, P = {};
  for (const p of L) if (p.nature) { const x = P[p.nature.type] ??= { type: p.nature.type, nom: p.nature.nom, part: 0 }; x.part += (p.capacite || 1) / W; }
  return Object.values(P).map(x => ({ ...x, part: +x.part.toFixed(3) })); }

const API = { REGLES, VOISINS, distance, eveiller, preparer, parts, accorder };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneNatures = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
