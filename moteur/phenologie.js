// Orvane — LES SAISONS DES PLANTES (moteur/phenologie.js) — docs/46
// Jusqu'ici, la flore (docs/17) ignorait l'année : un arbre poussait en plein hiver comme en été, et le nectar coulait en janvier.
// Dans un monde à la phénologie éveillée, les plantes ont leur calendrier :
//  - le feuillage (plan.feuillage) : un arbre ou un buisson est caduc (il perd ses feuilles l'hiver et ne pousse plus) ou persistant
//    (les conifères du froid, les arbres des tropiques) ; l'herbe sèche en hiver ;
//  - la pousse : la repousse d'une plante se concentre à la belle saison (nulle au cœur de l'hiver pour un caduc) ; sur l'année, elle
//    reste ce qu'elle était ; et elle suit le temps qu'il fait (docs/45) ; la dent des brouteurs suit la saison, elle aussi ;
//  - les fleurs, les fruits, les graines : le nectar vient au printemps, les fruits à la fin de l'été, les graines à l'automne ; chacun
//    de moyenne 1 sur l'année. Les feuilles ne bougent pas : la saison pèse déjà sur la place de qui les mange (la production). Les
//    butineurs et les mangeurs de fruits (docs/18, 30) connaissent l'abondance, puis la disette ;
//  - le stade (populations[].stade), pour qu'un jeu montre une forêt nue, en fleurs, en fruits, dont les feuilles tombent.
// Tout suit la force des saisons du lieu (la jungle n'en a presque pas, la grotte aucune). L'effet monte en un an à partir de l'éveil :
// le jour de l'éveil, rien ne bouge. Un monde qui ne l'a pas éveillée n'en voit rien. Sans hasard. Node (require) ou navigateur
// (globalThis.OrvanePhenologie).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const REGLES = {
  // les parts qui ont un calendrier : le centre (la phase de l'année, 0 : le cœur de l'hiver), la largeur, et ce qu'il en reste hors saison
  parts: { nectar: { centre: .33, largeur: .7, fond: .15 }, fruits: { centre: .68, largeur: .6, fond: .1 }, graines: { centre: .8, largeur: .7, fond: .3 } },
  // la pousse au fil de l'année : 1 + ampleur × (−cos) ; à 1, plus rien ne pousse au cœur de l'hiver
  pousse: { caduc: 1, persistant: .3, herbe: .8, roseau: .6, algue: .4, lichen: .3, succulente: .2, champignon: 0 },
  dent: .5,                  // la dent suit la saison : une plante est broutée moitié moins au cœur de l'hiver, moitié plus au cœur de l'été (1 en moyenne)
  saison_pleine: .15,        // l'amplitude de température d'un lieu aux saisons entières (celle par défaut) ; en dessous, tout s'adoucit
  rampe: 1,                  // en années : l'effet monte de 0 à 1 depuis l'éveil (0 : entier tout de suite)
  froid: .3, chaud: .7,      // un arbre dont la niche est sous 0,3 ou au-dessus de 0,7 de température garde ses feuilles
  neige: .3                  // sous ce manteau, une plante de moins de 50 cm est sous la neige
};
const LIGNEUX = new Set(['arbre', 'buisson']), FLEURS = new Set(['herbe', 'buisson', 'arbre', 'succulente']), FRUITS = new Set(['buisson', 'arbre', 'succulente']);
const STADES = { nu: 'nu', bourgeons: 'en bourgeons', fleurs: 'en fleurs', feuilles: 'en feuilles', fruits: 'en fruits', graines: 'en graines', feuilles_tombent: 'les feuilles tombent', seche: 'sèche', sous_la_neige: 'sous la neige', brule: 'brûlée' };
// le feuillage d'une plante : celui de son plan, sinon d'après sa forme et sa niche
const port = plan => plan.port || plan.forme;   // (docs/48) une forme de la flore riche dit son port
const feuillageDe = plan => plan.feuillage || (LIGNEUX.has(port(plan)) ? ((plan.niche?.temperature ?? .5) < REGLES.froid || (plan.niche?.temperature ?? .5) > REGLES.chaud ? 'persistant' : 'caduc') : 'persistant');
// une fenêtre de l'année : 0 hors d'elle, 1 à son centre ; sa moyenne sur l'année vaut largeur / 2
const fenetre = (phase, f) => { let d = Math.abs(phase - f.centre); d = Math.min(d, 1 - d); return d < f.largeur / 2 ? Math.pow(Math.cos(Math.PI * d / f.largeur), 2) : 0; };
// ce qu'une part donne à cette phase de l'année, dans un lieu aux saisons entières (de moyenne 1 sur l'année)
const calendrier = (part, phase) => { const f = REGLES.parts[part]; return f ? f.fond + (1 - f.fond) * fenetre(phase, f) / (f.largeur / 2) : 1; };
// la force des saisons d'un lieu : 0 (aucune), 1 (entières)
const forceDe = (b, saisons) => b.saisons === false || b.saisons === null ? 0 : clamp(({ ...saisons, ...(b.saisons || {}) }).temperature / REGLES.saison_pleine);

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.phenologie) return { inst: out, evenements: [] };
  const P = out.taxons.filter(t => t.plan?.regime === 'vegetal' && !t.eteint); let caducs = 0;
  for (const t of P) if (LIGNEUX.has(port(t.plan))) { t.plan.feuillage = feuillageDe(t.plan); if (t.plan.feuillage === 'caduc') caducs++; }
  out.monde = { ...out.monde, phenologie: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: P[0]?.id || out.taxons[0]?.id, detail: `les plantes prennent les saisons : ${caducs} lignées d'arbres et de buissons perdront leurs feuilles l'hiver, les fleurs viendront au printemps, les fruits à la fin de l'été, les graines à l'automne` }] };
}

// un cycle : ce que la flore appelle. ctx : { monde, n, phase, biomes, saisons : les amplitudes par défaut du moteur }
function preparer(ctx) {
  const { monde, n, phase, biomes } = ctx, A = monde.annee || 0; if (!monde.phenologie || phase == null || !A) return null;
  const k = REGLES.rampe > 0 ? clamp((n - monde.phenologie.depuis - 1) / (A * REGLES.rampe)) : 1, c = -Math.cos(2 * Math.PI * phase);
  const F = {}, force = bid => (F[bid] ??= biomes[bid] ? forceDe(biomes[bid], ctx.saisons || { temperature: REGLES.saison_pleine }) : 0);
  const CAL = Object.fromEntries(Object.keys(REGLES.parts).map(p => [p, calendrier(p, phase)])), parts = {};
  const meteo = bid => { const m = biomes[bid]?.meteo; return m && typeof m === 'object' ? m : null; };
  return {
    // ce que chaque part donne dans ce lieu ce cycle ({ nectar, fruits, graines } ; 1 : comme toujours) ; null si rien ne change
    parts: bid => { if (bid in parts) return parts[bid]; const s = force(bid) * k; return (parts[bid] = s > 0 ? Object.fromEntries(Object.entries(CAL).map(([p, v]) => [p, 1 + s * (v - 1)])) : null); },
    // la pousse d'une plante dans ce lieu ce cycle : son calendrier, et le temps qu'il fait
    pousse: (bid, plan) => { const a = REGLES.pousse[LIGNEUX.has(port(plan)) ? feuillageDe(plan) : port(plan)] ?? .3; return Math.max(0, 1 + k * force(bid) * a * c) * (1 + k * ((meteo(bid)?.production ?? 1) - 1)); },
    // ce que la dent prend aux plantes de ce lieu ce cycle, rapporté à ce qu'elle prendrait sans saisons
    dent: bid => Math.max(0, 1 + k * force(bid) * REGLES.dent * c),
    // ce qu'un jeu montre : le stade, et la part du feuillage qui est là (1 : tout)
    stade: (bid, plan) => {
      const s = force(bid), f = feuillageDe(plan), forme = port(plan), nectar = plan.rendement ? plan.rendement.nectar > 0 : FLEURS.has(forme), fruits = plan.rendement ? plan.rendement.fruits > 0 : FRUITS.has(forme), lig = LIGNEUX.has(forme), caduc = lig && f === 'caduc', hiver = clamp(-c), W = p => fenetre(phase, REGLES.parts[p]);
      const feuillage = +(caduc ? 1 - s * (1 - clamp((c + .7) / 1.2)) : forme === 'herbe' || forme === 'roseau' ? 1 - .6 * s * hiver : 1).toFixed(2);
      let st = 'feuilles';
      if ((meteo(bid)?.neige || 0) >= REGLES.neige && (plan.hauteur_m ?? 1) < .5) st = 'sous_la_neige';
      else if (s < .25) st = 'feuilles';   // (des saisons trop faibles pour se voir : la jungle)
      else if (caduc && c < -.6) st = 'nu';
      else if (nectar && W('nectar') > .7) st = 'fleurs';
      else if (fruits && W('fruits') > .5) st = 'fruits';
      else if (forme === 'herbe' && W('graines') > .6) st = 'graines';
      else if (caduc && phase >= .12 && phase < .25) st = 'bourgeons';
      else if (caduc && phase >= .75 && phase < .9) st = 'feuilles_tombent';
      else if ((forme === 'herbe' || forme === 'roseau') && c < -.6) st = 'seche';
      return { stade: st, feuillage };
    }
  };
}

const API = { REGLES, STADES, eveiller, preparer, feuillageDe, calendrier, fenetre, forceDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvanePhenologie = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
