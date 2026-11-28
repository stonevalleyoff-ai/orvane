// Orvane — LES ARRIVÉES (moteur/noyau/arrivees.js) — docs/59, le cœur du moteur
// L'étape 5 du cycle : les bêtes qui ont quitté un lieu pendant la dynamique (l'essaimage, la faim, l'hivernage et son retour, les
// déplacements des joueurs, les lâchers) arrivent là où elles vont. Là où la lignée n'était pas, une population naît ; les arrivants
// apportent leurs gènes (les traits continus, les allèles), leur part d'hivernants et leur mémoire des joueurs, mêlés à ceux du lieu
// par les effectifs. Au pas d'un monde au jour, un lieu neuf ne se fonde que par un groupe de quatre (docs/52).
// Ce que le cycle lui donne (X) : les migrations que la dynamique a rendues, l'état de chaque lignée (etat) et chaque lignée par son nom
// (Tmap), le cycle (n), le pas (PAS), le monde (inst : sa graine), et les mécanismes éveillés (les traits continus GEN, les allèles SEX,
// la mémoire ME). Ce qu'il rend : rien ; il écrit dans les populations de chaque lignée.
'use strict';
(function (racine) {
  const { hasard } = typeof require === 'function' ? require('./outils.js') : racine.OrvaneOutils;
  const { copieQ, melangerQ } = typeof require === 'function' ? require('./genetique.js') : racine.OrvaneGenetique;
  function arriver(X) {
    const { GEN, ME, PAS, SEX, Tmap, etat, inst, migrations, n } = X;
    let fondees = null;   // (docs/52) les lieux qu'une lignée gagne ce cycle, au pas d'un monde au jour
    for (const mg of migrations) {
      const E = etat.get(mg.taxon), t = Tmap.get(mg.taxon);   // (vitesse : les lignées par leur nom, et non une recherche par arrivée)
      if (!E.pops[mg.vers]) { E.pops[mg.vers] = { N: new Array(t.phenotypes.length).fill(0), depuis: n, avant: 0, maladie: null, flux0: 1, immig: 0 }; if (PAS !== 1) (fondees ??= []).push([mg.taxon, mg.vers]); }
      const D = E.pops[mg.vers], na0 = D.N.reduce((a, x) => a + x, 0), nb0 = mg.N.reduce((a, x) => a + x, 0);   // (vitesse : les deux effectifs, une fois)
      if (ME && D.n0 == null) D.n0 = na0;   // (docs/50) ceux qui étaient là avant toute arrivée
      D.immig = (D.immig || 0) + nb0;   // le flux de gènes reçu
      if (D.hiv || mg.hiv) { const na = na0, nb = nb0, tot = na + nb;   // (docs/38) la part d'hivernants
        if (tot > 0) { const H = {}; for (const k in D.hiv || {}) H[k] = D.hiv[k] * na / tot; if (mg.hiv) H[mg.hiv] = (H[mg.hiv] || 0) + nb / tot; D.hiv = H; } }
      if (mg.saison) D.saisonnier = true;
      if (GEN && mg.Q) { const na = na0, nb = nb0; D.Q = D.Q && na > 0 ? melangerQ(D.Q, na, mg.Q, nb) : copieQ(mg.Q); }   // les migrants apportent leurs gènes
      if (SEX && mg.A) { const na = na0, nb = nb0, n = na + nb;
        if (!D.A || na <= 0) D.A = { ...mg.A }; else if (n > 0) { const o = {}; for (const id in D.A) o[id] = ((D.A[id] || 0) * na + (mg.A[id] || 0) * nb) / n; for (const id in mg.A) if (!Object.prototype.hasOwnProperty.call(o, id)) o[id] = ((D.A[id] || 0) * na + (mg.A[id] || 0) * nb) / n; D.A = o; } }
      if (ME && 'M' in mg) ME.recevoir(D, mg.M, nb0);   // (docs/50) ce que les migrants apportent de mémoire : additionné, puis mêlé une fois (plus bas)
      mg.N.forEach((x, i) => { D.N[i] += x; });
    }
    // (docs/52) au pas d'un monde au jour, ceux qui partent chaque cycle vers un lieu où la lignée n'est pas sont une fraction de bête :
    // ils fondent un groupe de quatre, une fois sur autant que la fraction le dit (le même nombre en moyenne), sinon personne n'arrive.
    // Sans cela, une lignée ne gagnerait jamais de lieu neuf : une population de moins de deux bêtes ne tient pas
    if (fondees) for (const [tid, vers] of fondees) { const D = etat.get(tid).pops[vers], s = D.N.reduce((a, x) => a + x, 0); if (!(s < 4)) continue;
      const u = hasard(`${tid}|${vers}`, inst.monde.graine, n); D.N = u < s / 4 && s > 0 ? D.N.map(x => x * 4 / s) : D.N.map(() => 0); }
    if (ME) for (const E of etat.values()) for (const D of Object.values(E.pops)) ME.installer(D);   // (docs/50) la mémoire du lieu et celle de ses arrivants, mêlées par les effectifs, quel que soit l'ordre des arrivées
  }
  const API = { arriver };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneArrivees = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
