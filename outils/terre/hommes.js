// Orvane — LES HOMMES D'UN MONDE RÉEL, À L'ASSEMBLAGE (outils/terre/hommes.js) — docs/56
// Fait des prélèvements réels (mondes/<monde>/hommes.json : ce que la chasse prend chaque année, par espèce et par pays, et la saison
// de chaque espèce) les taux que le moteur applique (monde.hommes, moteur/hommes.js) :
//  - le taux d'un pays est son prélèvement rapporté à ce que l'assemblage y a posé de l'espèce (la somme de ses populations dans les lieux
//    du pays) : c'est la part que la chasse prend à la population du monde, à la mesure des effectifs comptés ;
//  - il est borné à la moitié de ce que l'espèce peut perdre sans décliner, à sa natalité et à sa vie sauvage (natalité − 1 / longévité) :
//    au-delà, aucun calage ne la tiendrait. Un taux borné dit que l'assemblage y pose trop peu de bêtes pour ce que la chasse y prend
//    (les effectifs comptés sont souvent sous les vrais : Burbaitė et Csányi 2009) ; la liste en est gardée (monde.hommes.bornes) ;
//  - un prélèvement qui vaut pour deux espèces du monde (le chamois et l'isard, que les tableaux de chasse comptent ensemble) se partage
//    entre elles au prorata de ce qu'elles comptent dans le pays ;
//  - un pays que les tableaux de chasse ne disent pas (la Russie, la Biélorussie, la Turquie…) n'a pas de chasse : c'est dit, non deviné.
'use strict';
const BORNE = .5;   // la part de la marge de l'espèce (natalité − 1/longévité, par an) que la chasse peut prendre au plus
function taux(H, inst) {
  const pays = new Map(inst.biomes.map(b => [b.id, b.lieu?.pays]));
  const N = new Map();   // l'effectif posé de chaque espèce, par pays
  for (const t of inst.taxons) { const m = new Map(); for (const p of t.populations) { const c = pays.get(p.biome); if (c) m.set(c, (m.get(c) || 0) + p.effectif); } N.set(t.id, m); }
  const parId = new Map(inst.taxons.map(t => [t.id, t]));
  const especes = {}, bornes = [], absents = [];
  for (const [cle, e] of Object.entries(H.especes || {})) {
    const ids = (e.taxons || [cle]).filter(id => parId.has(id));   // (les espèces du monde que ce prélèvement compte)
    if (!ids.length) { absents.push(cle); continue; }
    for (const [c, P] of Object.entries(e.prelevements || {})) {
      const n = typeof P === 'number' ? P : P.n; if (!(n > 0)) continue;
      const tot = ids.reduce((s, id) => s + (N.get(id).get(c) || 0), 0); if (!(tot > 0)) { absents.push(`${cle}@${c}`); continue; }
      for (const id of ids) { const Nc = N.get(id).get(c) || 0; if (!(Nc > 0)) continue;
        const pl = parId.get(id).plan, marge = Math.max(0, (pl.natalite || 0) - 365.25 / Math.max(2, pl.longevite || 730)), max = BORNE * marge;
        const brut = n * (Nc / tot) / Nc, h = Math.min(brut, max);
        if (brut > max) bornes.push({ espece: id, pays: c, prelevement: Math.round(n * Nc / tot), effectif: Math.round(Nc), taux: +brut.toFixed(3), borne: +max.toFixed(3) });
        if (h > 0) { const x = especes[id] ??= { saison: e.saison, taux: {} }; x.taux[c] = +h.toFixed(4); } }
    }
  }
  // (docs/56) des taux donnés tels quels : la part d'une population que la régulation prend (un grand carnivore, d'après sa population vraie)
  for (const [cle, e] of Object.entries(H.especes || {})) if (e.taux && parId.has(cle)) { const x = especes[cle] ??= { saison: e.saison, taux: {} }; for (const [c, v] of Object.entries(e.taux)) x.taux[c] = +(typeof v === 'number' ? v : v.taux).toFixed(4); }
  return { especes, sources: (H.sources || []).map(s => s.nom || s), bornes, absents };
}
module.exports = { taux, BORNE };
