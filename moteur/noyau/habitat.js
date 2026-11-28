// Orvane — L'HABITAT (moteur/noyau/habitat.js) — docs/59, le cœur du moteur
// L'étape 1 du cycle, ce qui en est l'écologie :
//  - capacites : la capacité de chaque lieu, ce qu'il peut nourrir. Ce que les joueurs lui ont fait (pressions.biomes : l'habitat
//    détruit ou rendu), puis un lent retour vers sa capacité de base (REGLES.regain_habitat, au pas du monde), que le milieu
//    transformé par ses bêtes peut rendre plus ou moins fertile (docs/22).
//  - catastrophes : un incendie, une crue, une sécheresse peut frapper un lieu, d'autant plus que ses axes de ce jour s'y prêtent
//    (le couvert sec en été, l'eau basse au printemps…) et que le temps qu'il fait le pousse (la météo, docs/45) ; sa capacité tombe.
//    Il rend les lieux frappés (sinistres) : la dynamique y tue ensuite les bêtes qui ne peuvent s'y soustraire.
// Le reste de l'étape 1 est le câblage du cycle (les mécanismes éveillés : le climat, la succession, le milieu, les natures, la saison
// de chaque lieu, la météo, la ponte, les stades, les castes, l'esprit, la mémoire) : il reste dans moteur/orvane.js.
// Ce que le cycle leur donne (X) : les règles du monde (REGLES, PAS, parPas), son hasard (R, qui continue sa suite), les lieux (biomes),
// ce que demandent les joueurs (prB, opt), et les mécanismes éveillés qu'ils lisent (le milieu SM, la météo SMe, les axes et la phase
// de chaque lieu ce jour). Ils écrivent dans les lieux, et dans le journal du cycle (ev).
'use strict';
(function (racine) {
  function capacites(X) {
    const { REGLES, SM, biomes, opt, parPas, prB } = X;
    for (const b of Object.values(biomes)) {
      b.capacite_base ??= b.capacite;
      b.capacite = Math.max(0, b.capacite + (prB[b.id]?.habitat || 0) * (opt.unite_habitat ?? 1));
      b.capacite += (b.capacite_base * (SM ? SM.fertilite(b.id) : 1) - b.capacite) * parPas(REGLES.regain_habitat);
    }
  }
  function catastrophes(X) {
    const { PAS, R, REGLES, SMe, axesCycle, biomes, ev, phaseDe } = X;
    const sinistres = {};
    for (const b of Object.values(biomes)) {
      if (b.catastrophes === false) continue;
      const ax = axesCycle(b), cause = SMe ? SMe.causes(b) : null, C = REGLES.catastrophes, phb = phaseDe(b), ete = phb != null ? Math.max(0, -Math.cos(2 * Math.PI * phb)) : .5, printemps = phb != null ? Math.max(0, Math.sin(2 * Math.PI * phb)) : .5;
      const chances = {
        incendie: C.incendie.chance * Math.max(0, ax.couvert - .3) * Math.max(0, 1 - ax.humidite) * 4 * (.5 + ete) * (cause ? cause.incendie : 1),
        crue: C.crue.chance * Math.max(0, ax.humidite - .5) * Math.max(0, 1 - ax.altitude) * 4 * (.5 + printemps) * (cause ? cause.crue : 1),
        secheresse: C.secheresse.chance * Math.max(0, .6 - ax.humidite) * 4 * ete * (cause ? cause.secheresse : 1)
      };
      for (const [type, p0] of Object.entries(chances)) { const p = p0 * PAS; if (p > 0 && R() < p) {
        b.capacite = Math.max(0, b.capacite * (1 - C[type].capacite)); sinistres[b.id] = type;
        ev.push({ type: 'catastrophe', taxon: b.id, biome: b.id, detail: `${type} : ${C[type].detail}${cause ? ', ' + cause.dit[type] : ''} ; capacité −${Math.round(C[type].capacite * 100)} %` });
        break;
      } }
    }
    return sinistres;
  }
  const API = { capacites, catastrophes };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneHabitat = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
