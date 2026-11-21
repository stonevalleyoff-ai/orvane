// Orvane — LES CYCLES DE VIE (moteur/stades.js) — docs/26
// Une lignée peut vivre deux vies : une larve, puis un adulte, chacun avec son régime et sa façon de se déplacer. Une chenille
// broute les feuilles, le papillon butine ; un têtard nage et broute les algues, la grenouille saute et chasse ; une larve fouit
// et mange les débris, l'adulte marche. C'est le trait « métamorphose », qui n'apparaît que dans un monde aux cycles de vie éveillés.
//  - ce qu'il rapporte : les larves ne disputent pas la nourriture des adultes ; une population qui se métamorphose se sent moins
//    à l'étroit, d'autant plus que les deux vies mangent autre chose ;
//  - ce qu'il coûte : des petits en moins (8 %) et une nymphe vulnérable ;
//  - à qui il sert : aux petits hexapodes (moins de 50 g) et aux bêtes qui vivent entre l'eau et la terre ; ailleurs, il coûte sans
//    rien rapporter, et la sélection l'efface.
// Une lignée dont une part des bêtes se métamorphose publie ses deux vies (plan.stades) : un jeu montre la chenille et le papillon
// comme une même lignée. Un monde sans cycles de vie n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneStades).
'use strict';
(function (racine) {
const REGLES = { soulagement: .35, larves: .6, publier: .01 };   // jusqu'à 35 % d'entassement en moins ; 60 % des bêtes sont des larves (ce que montre un jeu) ; publié dès 1 % de la lignée
// (des deux vies : la chenille et le papillon, la larve et l'imago, le têtard et la grenouille ; la naïade et l'imago, le polype et la méduse : docs/33)
const TRAITS = {
  metamorphose: { domaine: 'reproduction', organe: 'nymphe, deux corps successifs', cout: .08, vulnerabilite: 1.05,
    effet: 'deux vies : une larve qui ne mange pas ce que mange l\'adulte, puis une métamorphose ; les jeunes ne disputent plus la nourriture des adultes',
    conduite: { type: 'immobilite', presage: 'une nymphe accrochée, immobile' } }
};
const estAnimal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique';
// les deux vies d'une lignée, d'après son plan ; null : la métamorphose ne lui sert à rien
function stadesDe(plan) {
  const loco = plan.locomotion || [], forme = plan.corps?.forme, m = plan.masse_kg || 1, vole = loco.includes('vol'), nage = loco.includes('nage');
  const terre = loco.some(l => ['marche', 'course', 'saut', 'grimpe'].includes(l)), petit = m <= .05 && (forme === 'hexapode' || m <= .02);
  // (docs/33) une naïade : la larve d'un petit chasseur qui vole vit dans l'eau, et chasse autre chose que lui
  if (petit && vole && plan.regime === 'carnivore') return { larve: { nom: 'naïade', regime: 'carnivore', locomotion: ['nage', 'marche'], forme: 'hexapode', masse_rel: .6, eau: 'douce' },
    adulte: { nom: 'imago', regime: 'carnivore', locomotion: loco.slice() }, recouvrement: .15 };
  // (docs/33) un polype, puis une méduse : un corps rayonné de la mer vit d'abord fixé, à filtrer l'eau
  if (forme === 'radiaire' && nage && m <= 1) return { larve: { nom: 'polype', regime: 'filtreur', locomotion: [], forme: 'radiaire', masse_rel: .3 },
    adulte: { nom: 'méduse', regime: plan.regime, locomotion: loco.slice() }, recouvrement: .2 };
  if (petit && vole) return { larve: { nom: 'chenille', regime: 'herbivore', locomotion: ['reptation', 'grimpe'], forme: 'hexapode', masse_rel: .5 },
    adulte: { nom: plan.regime === 'herbivore' || plan.regime === 'omnivore' ? 'papillon' : 'imago', regime: plan.regime, locomotion: loco.slice() }, recouvrement: .2 };
  if (petit) return { larve: { nom: 'larve', regime: 'detritivore', locomotion: ['fouissage'], forme: 'serpent', masse_rel: .4 }, adulte: { nom: 'imago', regime: plan.regime, locomotion: loco.slice() },
    recouvrement: plan.regime === 'detritivore' ? .7 : .3 };
  if (nage && terre && m <= 5 && forme !== 'oiseau' && plan.eau !== 'salee') return { larve: { nom: 'têtard', regime: 'herbivore', locomotion: ['nage'], forme: 'serpent', masse_rel: .2, eau: 'douce' },
    adulte: { nom: 'adulte', regime: plan.regime, locomotion: loco.slice() }, recouvrement: plan.regime === 'herbivore' ? .6 : .25 };
  return null;
}
// la part de l'entassement qu'une vie double épargne : les larves ne disputent aux adultes que ce qu'elles mangent en commun
// (le recouvrement de leurs deux régimes) ; une chenille et un papillon (0,2) s'épargnent 28 %, un têtard et une grenouille herbivore (0,6), 14 %
const soulagement = S => S ? REGLES.soulagement * (1 - S.recouvrement) : 0;

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.stades) return { inst: out, evenements: [] };
  const peut = out.taxons.filter(t => estAnimal(t) && !t.eteint && stadesDe(t.plan)).length;
  out.monde = { ...out.monde, stades: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estAnimal)?.id, detail: `les cycles de vie s'éveillent : ${peut} lignées pourraient vivre deux vies, une larve puis un adulte, si la métamorphose leur vient` }] };
}

function preparer() {
  const cache = new Map(), S = t => { if (!cache.has(t.id)) cache.set(t.id, stadesDe(t.plan)); return cache.get(t.id); };
  return {
    // le facteur de l'entassement d'un phénotype : 1 sans métamorphose ; moins, avec, si elle sert à sa lignée
    facteur(t, bid, i) { const tr = t.phenotypes[i]?.traits; if (!tr?.includes('metamorphose')) return 1; const s = S(t); return s ? 1 - soulagement(s) : 1; },
    // ce que publie une lignée dont une part se métamorphose : ses deux vies, et cette part
    publier(t) {
      if (!estAnimal(t) || t.eteint) return; const part = t.phenotypes.reduce((a, p) => a + (p.traits?.includes('metamorphose') ? p.frequence || 0 : 0), 0), s = S(t);
      if (s && part >= REGLES.publier) t.plan.stades = { larve: s.larve, adulte: s.adulte, part: +part.toFixed(3), larves: REGLES.larves }; else delete t.plan.stades;
    }
  };
}

const API = { REGLES, TRAITS, stadesDe, soulagement, eveiller, preparer };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneStades = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
