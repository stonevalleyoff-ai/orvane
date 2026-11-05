// Orvane — LES FORMES NOUVELLES (moteur/formes.js) — docs/33
// Jusqu'ici, un corps était quadrupède, hexapode, bipède, oiseau ou serpent, ou une forme qu'un auteur de monde avait écrite
// (docs/20). Dans un monde aux formes éveillées, trois plans de corps neufs peuvent naître, chacun d'un plan d'avant et là où il sert :
//  - le corps segmenté (un mille-pattes) : d'un serpent ou d'un hexapode qui marche, rampe ou fouit, de 2 kg au plus ; ses anneaux
//    portent chacun leur paire de pattes ;
//  - le corps rayonné (une étoile de mer, une méduse) : d'un serpent qui nage (un poisson), de 5 kg au plus ; ses bras partent
//    d'un même centre ;
//  - le corps à tentacules (une pieuvre) : d'un serpent ou d'un hexapode qui nage, de 50 g au moins ; une tête, et ses bras.
// Comme les autres changements de plan, ils sont rares : à la séparation d'une lignée, et seulement là où ils peuvent naître. Chaque
// forme dit son repli (le serpent), pour un jeu qui ne sait pas encore la dessiner. Un monde sans formes nouvelles n'en voit rien.
'use strict';
(function (racine) {
const FORMES = {
  segmente: { nom: 'segmenté', pattes: 24, depuis: ['serpent', 'hexapode'], chance: .5, loco: ['marche', 'reptation', 'fouissage'], masse_max: 2, repli: 'serpent' },
  radiaire: { nom: 'rayonné', pattes: 5, depuis: ['serpent'], chance: .4, loco: ['nage'], masse_max: 5, repli: 'serpent' },
  tentaculaire: { nom: 'tentaculaire', pattes: 8, depuis: ['serpent', 'hexapode'], chance: .4, loco: ['nage'], masse_min: .05, repli: 'serpent' }
};
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.formes) return { inst: out, evenements: [] };
  const M = out.catalogue.monde || {}; out.catalogue = { ...out.catalogue, monde: { ...M, formes: { ...FORMES, ...(M.formes || {}) } } };
  out.monde = { ...out.monde, formes: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => t.plan?.regime !== 'vegetal')?.id, detail: 'des formes nouvelles peuvent naître : un corps segmenté, un corps rayonné, un corps à tentacules' }] };
}
// à la séparation : une lignée fille d'une forme que sa mère n'avait pas, et que le monde n'avait pas encore vue
function noter(parent, plan, vues) { const f = plan.corps?.forme; if (!f || f === parent.corps?.forme || !FORMES[f]) return null;
  const premiere = !vues.has(f); vues.add(f); return `son corps devient ${FORMES[f].nom}${f === 'segmente' ? ` à ${plan.corps.pattes} pattes` : f === 'radiaire' ? ` à ${plan.corps.pattes} bras` : ''}${premiere ? ', une forme que le monde n\'avait jamais vue' : ''}`; }
const API = { FORMES, eveiller, noter };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneFormes = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
