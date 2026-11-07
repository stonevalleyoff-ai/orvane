// Orvane — LES CASTES : LES INSECTES SOCIAUX (moteur/castes.js) — docs/33
// Une lignée de petits hexapodes grégaires peut devenir une colonie : une reine qui pond, des ouvrières qui butinent et bâtissent,
// des soldats aux mandibles énormes qui gardent l'entrée. C'est le trait « eusocialité », qui n'apparaît que dans un monde aux
// castes éveillées ; comme tout trait, il naît par mutation chez quelques bêtes, et la sélection décide.
//  - ce qu'il rapporte, à qui il sert (un hexapode de 50 g au plus, grégaire : sa sociabilité d'au moins 0,5) : les soldats
//    gardent la colonie (vulnérabilité −30 %), les ouvrières se partagent le travail (un quart d'entassement en moins) ;
//  - ce qu'il coûte : 10 % de petits en moins (seule la reine pond) ; chez une lignée qu'il ne sert pas, il coûte sans rien rapporter.
// Une lignée dont une part des bêtes vit en colonie publie ses castes (plan.castes) : un jeu montre la reine, les ouvrières et les
// soldats comme une même lignée. Un monde sans castes n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneCastes).
'use strict';
(function (racine) {
const REGLES = { defense: .3, travail: .25, publier: .01, sociabilite: .5, masse: .05 };
const TRAITS = {
  eusocialite: { domaine: 'social', organe: 'colonie : une reine, des ouvrières, des soldats', cout: .1,
    effet: 'une colonie : la reine pond, les ouvrières se partagent le travail, les soldats gardent l\'entrée',
    conduite: { type: 'defense-petits', presage: 'des soldats aux mandibles énormes gardent l\'entrée' } }
};
const estAnimal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique';
// à qui la colonie sert : un petit hexapode grégaire
const sertA = plan => (plan.corps?.forme === 'hexapode' || plan.corps?.forme === 'segmente') && (plan.masse_kg || 1) <= REGLES.masse && (plan.sociabilite ?? 0) >= REGLES.sociabilite;
// les castes d'une lignée, d'après son plan
function castesDe(plan) {
  if (!sertA(plan)) return null; const vole = (plan.locomotion || []).includes('vol');
  return { reine: { masse_rel: 20, ailes: true, part: .001 }, ouvrieres: { masse_rel: 1, part: .85 }, soldats: { masse_rel: 2.5, organe: 'mandibules', part: .149 }, essaim: vole };
}

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.castes) return { inst: out, evenements: [] };
  const peut = out.taxons.filter(t => estAnimal(t) && !t.eteint && sertA(t.plan)).length;
  out.monde = { ...out.monde, castes: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estAnimal)?.id, detail: `les castes s'éveillent : ${peut} lignées de petits hexapodes grégaires pourraient vivre en colonie, si l'eusocialité leur vient` }] };
}

function preparer() {
  const vit = (t, i) => !!t.phenotypes[i]?.traits?.includes('eusocialite') && sertA(t.plan);
  return {
    // l'entassement d'un phénotype : les ouvrières se partagent le travail
    facteur: (t, bid, i) => vit(t, i) ? 1 - REGLES.travail : 1,
    // la vulnérabilité d'un phénotype : les soldats gardent la colonie
    vuln: (t, i) => vit(t, i) ? 1 - REGLES.defense : 1,
    publier(t) {
      if (!estAnimal(t) || t.eteint) return; const part = t.phenotypes.reduce((a, p) => a + (p.traits?.includes('eusocialite') ? p.frequence || 0 : 0), 0), c = castesDe(t.plan);
      if (c && part >= REGLES.publier) t.plan.castes = { ...c, part: +part.toFixed(3) }; else delete t.plan.castes;
    }
  };
}

const API = { REGLES, TRAITS, sertA, castesDe, eveiller, preparer };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneCastes = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
