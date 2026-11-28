// Orvane — LES HOMMES (moteur/hommes.js) — docs/56
// Dans un monde réel, les hommes prennent leur part : ils chassent les ongulés, régulent les grands carnivores. Ce ne sont pas des
// joueurs, et ils ne vivent pas de leurs proies : le moteur ôte, jour après jour pendant la saison de chasse, la part de chaque espèce
// que la réalité dit qu'ils prélèvent chaque année, pays par pays.
//   monde.hommes = {
//     especes: { <taxon>: { saison: ['MM-JJ', 'MM-JJ'],          (une saison peut passer le 1er janvier : ['09-01', '02-28'])
//                           taux: { <pays>: part de l'effectif ôtée sur la saison } } },
//     sources: [...]                                              (d'où viennent les taux : outils/terre/hommes.js, docs/56)
//   }
// Le taux d'un pays vaut pour chaque population de l'espèce dans les lieux de ce pays (lieu.pays). Sur une saison de L jours, une
// population perd chaque jour 1 − (1 − taux)^(1/L) de ce qu'elle compte : à la fin de la saison, sans naissances ni autres morts, elle a
// perdu le taux. Ce sont des retraits, comme ceux d'un jeu (pressions.taxons[id][lieu].retrait['*']) : le moteur les borne à ce qui est
// disponible et les compte dans les morts extérieures. Il faut un monde au calendrier (monde.calendrier) : la chasse a ses mois.
'use strict';
(function (racine) {
  // le jour de l'année (1–365) d'une date 'MM-JJ', dans une année de 365 jours (le 29 février tombe avec le 1er mars)
  const jourDe = mmjj => { const [m, j] = String(mmjj).split('-').map(Number); return Math.round((Date.UTC(2027, (m || 1) - 1, j || 1) - Date.UTC(2027, 0, 1)) / 864e5) + 1; };
  const duree = (a, b) => b >= a ? b - a + 1 : 365 - a + 1 + b;
  const dans = (d, a, b) => b >= a ? d >= a && d <= b : d >= a || d <= b;
  const jourDeLAn = t => { const D = new Date(t), y = D.getUTCFullYear(); return Math.min(365, Math.round((Date.UTC(y, D.getUTCMonth(), D.getUTCDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1); };

  // la part de chaque population que les hommes prennent en un cycle de `jours` jours qui finit à la date t (ms) :
  // une fonction (taxon, lieu) → part, ou null s'ils ne prennent rien ce jour-là
  function jour(H, t, jours = 1) {
    if (!H || !H.especes || !Number.isFinite(t)) return null;
    const d = jourDeLAn(t), parTaxon = new Map();
    for (const [id, e] of Object.entries(H.especes)) {
      const a = jourDe(e.saison?.[0] ?? '01-01'), b = jourDe(e.saison?.[1] ?? '12-31');
      if (!dans(d, a, b) || !e.taux) continue;
      const L = duree(a, b), parPays = new Map();
      for (const [pays, taux] of Object.entries(e.taux)) if (taux > 0) parPays.set(pays, 1 - Math.pow(1 - Math.min(.99, taux), Math.max(1, jours) / L));
      if (parPays.size) parTaxon.set(id, parPays);
    }
    if (!parTaxon.size) return null;
    return (id, b) => { const P = parTaxon.get(id); return P ? P.get(b?.lieu?.pays) || 0 : 0; };
  }

  // la part annuelle (le taux) qu'une espèce perd dans un pays, quel que soit le jour : pour le calage d'un monde réel (outils/terre/assembler.js)
  const taux = (H, id, pays) => H?.especes?.[id]?.taux?.[pays] || 0;

  const API = { jour, taux, jourDe, duree, dans, jourDeLAn };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneHommes = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
