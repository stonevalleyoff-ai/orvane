// Orvane — LES PLANTES SOUS LE FEU, ET CE QU'ELLES FONT DU LIEU (moteur/succession.js) — docs/47
// Jusqu'ici, un incendie retirait de la capacité au lieu et des bêtes, pas un pied aux plantes ; et le couvert d'un lieu ne suivait
// que ses brouteurs et ses joueurs, jamais ses arbres. Dans un monde à la succession éveillée :
//  - les catastrophes touchent les plantes : le feu prend les arbres et les buissons, la crue l'herbe, la sécheresse l'herbe et les
//    roseaux ; chaque plante touchée le dit quelques cycles (populations[].sinistre) ;
//  - le sec qui dure tue (docs/45) : dans un lieu où la sécheresse est installée, des pieds meurent chaque cycle, sauf les
//    succulentes et les lichens ;
//  - la succession : la place que des arbres ou des buissons disparus laissent libre, l'herbe en prend 30 %, les buissons 20 %
//    de celle des arbres ; puis les arbres reviennent, et les pionnières reculent. Une forêt brûlée est une prairie, puis un
//    taillis, puis une forêt ;
//  - le couvert suit les arbres : un lieu qui a perdu ses arbres perd la moitié d'autant de son couvert (par le milieu, docs/22), et
//    le retrouve avec eux. La niche des bêtes, la place des plantes et la nature du lieu (docs/28) le suivent.
// Tout se rapporte aux plantes de l'éveil (reference.succession) : le jour de l'éveil, rien ne bouge. Un monde qui ne l'a pas éveillée
// n'en voit rien. Sans hasard. Node (require) ou navigateur (globalThis.OrvaneSuccession).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const REGLES = {
  // la part des pieds qu'une catastrophe prend, par forme de plante
  sinistres: {
    incendie: { arbre: .6, buisson: .7, herbe: .4, roseau: .5, lichen: .5, champignon: .3, succulente: .2 },
    crue: { herbe: .2, buisson: .15, succulente: .3, lichen: .2, champignon: .2 },
    secheresse: { herbe: .3, roseau: .3, champignon: .3, algue: .2, buisson: .15, arbre: .1, lichen: .1 }
  },
  trace: 12,                 // les cycles pendant lesquels une plante touchée le dit
  sec: { seuil: .5, mort: .06, epargne: ['succulente', 'lichen'] },   // la sécheresse installée (docs/45) : jusqu'à 6 % des pieds par cycle, quand elle est à 1
  // les pionnières : la part de la place laissée libre par d'autres formes (leur place, pour la part qui leur manque de leur poids de l'éveil) qu'elles prennent
  pionniers: { herbe: { de: ['buisson', 'arbre'], part: .3 }, buisson: { de: ['arbre'], part: .2 } },
  couvert: .5                // le couvert perd la moitié de ce que les arbres ont perdu (et gagne la moitié de ce qu'ils ont gagné, jusqu'à +25 %)
};
const estPlante = t => t?.plan?.regime === 'vegetal', port = plan => plan.port || plan.forme;   // (docs/48) une forme de la flore riche dit son port
const NOMS = { incendie: 'brûlée', crue: 'noyée', secheresse: 'desséchée' };

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.succession) return { inst: out, evenements: [] };
  let nb = 0; for (const t of out.taxons) if (estPlante(t) && !t.eteint) for (const p of t.populations) { p.reference = { ...(p.reference || {}), succession: p.effectif }; nb++; }
  out.monde = { ...out.monde, succession: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estPlante)?.id || out.taxons[0]?.id, detail: `les plantes subissent et transforment : le feu, la crue et le sec leur prennent des pieds, l'herbe puis les buissons reprennent la place des arbres disparus, et le couvert d'un lieu suit ses arbres (${nb} populations de plantes)` }] };
}

// un cycle. ctx : { plantes, biomes, n }
function preparer(ctx) {
  const { plantes, biomes, n } = ctx, L = {};
  for (const t of plantes) if (!t.eteint) for (const p of t.populations) (L[p.biome] ??= []).push({ t, p });
  const poids = ({ t, p }) => p.effectif * (t.plan.masse_kg || 1), ref = ({ t, p }) => (p.reference?.succession ?? 0) * (t.plan.masse_kg || 1);
  // ce que les arbres d'un lieu pèsent, rapporté à l'éveil (null : pas d'arbres de l'éveil ici)
  const arbres = bid => { let a = 0, r = 0; for (const x of L[bid] || []) if (port(x.t.plan) === 'arbre' && ref(x) > 0) { a += poids(x); r += ref(x); } return r > 0 ? a / r : null; };
  const libres = {};
  return {
    arbres,
    // ce que les arbres font au couvert que vise le lieu (1 : rien)
    couvert: bid => { const r = arbres(bid); return r == null ? 1 : 1 - REGLES.couvert * (1 - clamp(r, 0, 1.5)); },
    // les catastrophes du cycle prennent des pieds ; les marques anciennes s'effacent
    frapper: sinistres => {
      for (const t of plantes) for (const p of t.populations) if (p.sinistre && n - p.sinistre.cycle > REGLES.trace) delete p.sinistre;
      for (const [bid, type] of Object.entries(sinistres || {})) for (const { t, p } of L[bid] || []) { const f = Math.min(.95, (REGLES.sinistres[type]?.[port(t.plan)] || 0) * (t.plan.sinistres?.[type] ?? 1)); if (!(f > 0) || !(p.effectif > 0)) continue;
        p.effectif = +(p.effectif * (1 - f)).toFixed((t.plan.masse_kg || 1) >= 1 ? 4 : 2); p.sinistre = { type, cycle: n, part: f }; }
    },
    // la part des pieds que le sec qui dure tue ce cycle (docs/45)
    sec: (bid, plan) => { const m = biomes[bid]?.meteo, s = m && typeof m === 'object' ? m.secheresse || 0 : 0, S = REGLES.sec; return s >= S.seuil && !S.epargne.includes(port(plan)) ? S.mort * (s - S.seuil) / (1 - S.seuil) * (plan.sinistres?.secheresse ?? 1) : 0; },
    // la place de plus qu'une pionnière trouve ici : une part de ce qui manque aux formes plus lentes, partagée entre les lignées de sa forme
    place: (bid, t, p) => { const P = REGLES.pionniers[port(t.plan)]; if (!P || !(p.potentiel > 0)) return 0;
      const X = (libres[bid] ??= {}), k = port(t.plan);
      if (!X[k]) { let libre = 0, tot = 0; for (const x of L[bid] || []) { if (P.de.includes(port(x.t.plan)) && ref(x) > 0) libre += (x.p.potentiel || 0) * Math.max(0, 1 - poids(x) / ref(x)); if (port(x.t.plan) === k) tot += x.p.potentiel || 0; } X[k] = { libre: libre * P.part, tot }; }
      return X[k].tot > 0 ? X[k].libre * p.potentiel / X[k].tot : 0; }
  };
}

const API = { REGLES, NOMS, eveiller, preparer };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneSuccession = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
