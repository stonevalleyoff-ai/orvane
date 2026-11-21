// Orvane — LES RÉGIMES EN SPECTRE (moteur/dietes.js) — docs/30
// Jusqu'ici, une bête était herbivore, omnivore ou carnivore. Dans un monde aux régimes éveillés, chaque lignée a un spectre :
// la part de feuilles, de fruits, de graines, de nectar, d'insectes, de viande et de sang dans ce qu'elle mange (plan.diete).
//  - les plantes : une feuille, un fruit, une graine, du nectar ne viennent pas des mêmes plantes (un arbre donne des fruits, une
//    herbe des graines, une fleur du nectar) ni ne se défendent pareil (un fruit est fait pour être mangé : les toxines des feuilles
//    ne le gardent pas) ; deux bêtes qui ne mangent pas la même part d'une plante se gênent peu ; un mangeur de fruits ne tue pas
//    l'arbre, il sème ses graines (les arbres, les buissons et les succulentes repoussent mieux là où l'on mange leurs fruits) ;
//  - les bêtes : un mangeur d'insectes chasse les petites bêtes (les hexapodes, les bêtes de 20 g au plus), un mangeur de viande
//    les autres ; un buveur de sang pique des bêtes bien plus grandes que lui sans les tuer, et porte mieux leurs souches (docs/29) ;
//  - le régime d'hier (herbivore, omnivore, carnivore) se lit dans le spectre : 10 % de chair au plus, herbivore ; 90 % au moins,
//    carnivore ; entre les deux, omnivore ;
//  - à chaque séparation, le spectre d'une lignée fille glisse parfois d'une part vers une voisine (des feuilles aux fruits, des
//    fruits aux insectes, des insectes au sang) : de nouveaux régimes naissent, et la sélection en fait le tri.
// Tout se rapporte au spectre de l'éveil (plan.diete0) : le jour de l'éveil, aucune bête ne change. Un monde sans régimes en spectre
// n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneDietes).
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const VEG = ['feuilles', 'fruits', 'graines', 'nectar'], ANI = ['insectes', 'viande', 'sang'], PARTS = [...VEG, ...ANI];
// ce que chaque forme de plante donne de chaque part (rapporté à sa biomasse), et ce que chaque défense en garde (1 : tout son effet)
const RENDEMENT = {
  herbe: { feuilles: 1, graines: .5, nectar: .2 }, buisson: { feuilles: 1, fruits: .5, graines: .2, nectar: .3 }, arbre: { feuilles: 1, fruits: .4, graines: .2, nectar: .2 },
  roseau: { feuilles: 1, graines: .3 }, algue: { feuilles: 1 }, lichen: { feuilles: 1 }, succulente: { feuilles: 1, fruits: .3, nectar: .3 }, champignon: { feuilles: 1 }
};
const DEFENSE = { feuilles: { toxique: 1, epineux: 1 }, fruits: { toxique: 0, epineux: .5 }, graines: { toxique: .5, epineux: .3 }, nectar: { toxique: 0, epineux: 0 } };
const PERTE = { feuilles: 1, graines: .5, fruits: .1, nectar: 0 };          // ce qu'une bouchée prend à la plante elle-même
const FRUITS = new Set(Object.keys(RENDEMENT).filter(f => RENDEMENT[f].fruits));
// les parts voisines : un spectre glisse de l'une à l'autre
const VOISINES = { feuilles: ['fruits', 'graines'], fruits: ['feuilles', 'graines', 'nectar', 'insectes'], graines: ['feuilles', 'fruits', 'insectes'], nectar: ['fruits', 'insectes'],
  insectes: ['fruits', 'graines', 'nectar', 'viande', 'sang'], viande: ['insectes', 'sang'], sang: ['insectes', 'viande'] };
const REGLES = { glissement: { chance: .25, part: .15 }, dispersion: { gain: .2, demi: .05 }, sang: { rapport: 20, appetence: .5, mortel: .1, vecteur: 3 }, seuils: [.1, .9],
  chair_reference: .3, affinite_reference: .5 };   // une lignée qui ne mangeait pas de chair à l'éveil se compare à un omnivore type (30 % de chair, partagée à moitié)

const animal = p => p && !['vegetal', 'synthetique', 'filtreur', 'detritivore'].includes(p.regime);
const chair = d => (d?.insectes || 0) + (d?.viande || 0) + (d?.sang || 0);
const estInsecte = p => p?.corps?.forme === 'hexapode' || (p?.masse_kg || 1) <= .02;
const arrondir = d => { const s = PARTS.reduce((a, k) => a + (d[k] || 0), 0) || 1, o = {}; for (const k of PARTS) { const v = +((d[k] || 0) / s).toFixed(3); if (v > 0) o[k] = v; } return o; };
// le spectre d'une lignée, à l'éveil, d'après son régime et son corps
function dieteDe(p) {
  const m = p.masse_kg || 1, L = p.locomotion || [], haut = L.includes('vol') || L.includes('grimpe') || !!p.corps?.organes?.some(o => o.type === 'mains');
  if (p.regime === 'herbivore') {
    if (m < .02 || (m < .1 && (L.includes('vol') || L.includes('grimpe')))) return arrondir({ nectar: .5, feuilles: .3, graines: .2 });   // un butineur (docs/18)
    if (haut) return arrondir({ fruits: .5, feuilles: .5 });
    return m < 1 ? arrondir({ feuilles: .8, graines: .2 }) : { feuilles: 1 };
  }
  if (p.regime === 'omnivore') { const a = m < .2 ? { insectes: .3 } : { insectes: .15, viande: .15 }; return arrondir({ ...a, ...(haut ? { fruits: .4, feuilles: .3 } : { feuilles: .4, fruits: .2, graines: .1 }) }); }
  if (p.regime === 'carnivore') return m < .2 || (L.includes('vol') && m < .5) ? { insectes: 1 } : m < 5 ? arrondir({ viande: .8, insectes: .2 }) : { viande: 1 };
  return null;
}
const regimeDe = d => { const a = chair(d); return a <= REGLES.seuils[0] ? 'herbivore' : a >= REGLES.seuils[1] ? 'carnivore' : 'omnivore'; };

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.dietes) return { inst: out, evenements: [] };
  let n = 0; for (const t of out.taxons) { if (!animal(t.plan) || t.eteint) continue; const d = dieteDe(t.plan); if (!d) continue; t.plan.diete = d; t.plan.diete0 = { ...d }; n++;
    for (const p of t.populations) if (p.recouvrement != null) { p.recouvrement_avant = p.recouvrement; delete p.recouvrement; } }   // (la concurrence se raccorde à l'éveil : moteur/flore.js)
  for (const t of out.taxons) if (t.plan?.regime === 'vegetal') for (const p of t.populations) p.reference_diete = { effectif: p.effectif, frequences: (p.frequences || []).slice() };
  out.monde = { ...out.monde, dietes: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => animal(t.plan))?.id, detail: `les régimes deviennent des spectres : ${n} lignées mangent désormais des feuilles, des fruits, des graines, du nectar, des insectes, de la viande ou du sang, en parts qui leur sont propres` }] };
}

// --- le cycle (moteur/orvane.js) ---
// une lignée arrivée sans spectre (une fusion, une machine devenue autre chose) en reçoit un, qui devient sa référence
function completer(t) { if (!animal(t.plan) || t.plan.diete) return; const d = dieteDe(t.plan); if (d) { t.plan.diete = d; t.plan.diete0 = { ...d }; } }
// ce qu'un prédateur cherche chez une proie : les insectes ou la viande, à sa part de chacun (rapportée à celle de l'éveil) ; et le
// sang, chez les bêtes au moins 20 fois plus grandes que lui
function affinite(d, q) { const a = chair(d); if (!(a > 0)) return 0; return ((estInsecte(q) ? d.insectes || 0 : d.viande || 0)) / a; }
function appetence(pp, qp, f0) {
  const d = pp.diete, d0 = pp.diete0; if (!d || !d0) return f0;
  // (rapporté à l'éveil, adouci : une part qui naît compte, une part qui manquait ne coupe rien ; une lignée sans chair à l'éveil se
  // rapporte à un omnivore type, sans quoi la moindre part d'insectes multipliait son appétence par onze)
  const sans = !(chair(d0) > 0); let f = f0;
  if (f0 > 0 && !(sans && !(chair(d) > 0))) f = f0 * (affinite(d, qp) + .1) / ((sans ? REGLES.affinite_reference : affinite(d0, qp)) + .1);
  const s = (d.sang || 0) - (d0.sang || 0); if (s > 0 && (qp.masse_kg || 1) >= REGLES.sang.rapport * (pp.masse_kg || 1)) f += REGLES.sang.appetence * s / Math.max(.05, chair(d));
  return f;
}
// une piqûre ne tue pas : ce qu'un buveur de sang prend à une bête bien plus grande que lui n'en tue qu'un dixième
const mortel = (pp, qp) => pp.diete?.sang > 0 && (qp.masse_kg || 1) >= REGLES.sang.rapport * (pp.masse_kg || 1) ? REGLES.sang.mortel : 1;
// la part de chair et de plantes d'un omnivore, rapportée à l'éveil : ce qu'il cherche en viande, ce qu'il tire des plantes
const viande = p => { const a0 = chair(p.diete0); return !p.diete ? 1 : a0 > 0 ? chair(p.diete) / a0 : chair(p.diete) / REGLES.chair_reference; };
const vegetal = p => { const v0 = 1 - chair(p.diete0); return p.diete && v0 > 0 ? (1 - chair(p.diete)) / v0 : 1; };

// à la séparation : le spectre glisse parfois d'une part vers une voisine ; le régime d'hier suit (son hasard : le nom et le cycle)
function deriver(parent, plan, nid, n) {
  if (!plan.diete) return null; let g = 2166136261 >>> 0; for (const c of 'diete|' + nid + '|' + n) g = Math.imul(g ^ c.charCodeAt(0), 16777619) >>> 0;   // (salé : la ponte tire le sien du même nom et du même cycle)
  const R = () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
  if (R() >= REGLES.glissement.chance) return null;
  const d = { ...plan.diete }, ks = Object.keys(d).filter(k => d[k] > 0); if (!ks.length) return null;
  const de = ks[Math.floor(R() * ks.length)], V = VOISINES[de], vers = V[Math.floor(R() * V.length)], q = Math.min(d[de], REGLES.glissement.part);
  d[de] -= q; d[vers] = (d[vers] || 0) + q; plan.diete = arrondir(d);
  const avant = parent.regime, apres = regimeDe(plan.diete);
  if (apres !== avant) { plan.regime = apres;
    if (apres === 'carnivore') { plan.temperament = +clamp((plan.temperament ?? .5) + .15, 0, 1).toFixed(3); plan.perception = +clamp((plan.perception ?? .5) + .1, 0, 1).toFixed(3); }
    if (apres === 'herbivore') plan.temperament = +clamp((plan.temperament ?? .5) - .1, 0, 1).toFixed(3); }
  return `son régime glisse : un peu de ${de} devient ${vers}${apres !== avant ? `, la voilà ${apres}` : ''}`;
}
// ce qu'il dit, en mots : ses deux ou trois parts principales
function mots(d) { return Object.entries(d || {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= .1).slice(0, 3).map(([k, v]) => `${Math.round(v * 100)} % de ${k}`).join(', '); }

const API = { REGLES, VEG, ANI, PARTS, RENDEMENT, DEFENSE, PERTE, FRUITS, VOISINES, dieteDe, regimeDe, chair, estInsecte, eveiller, completer, affinite, appetence, mortel, viande, vegetal, deriver, mots };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneDietes = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
