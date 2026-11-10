// Orvane — LE MOTEUR (moteur/orvane.js) — v0
// Un cycle : instantané + pressions (déjà passées au tampon) → instantané suivant. Déterministe : même graine,
// même état, mêmes pressions ⇒ même résultat. Node (require) ou navigateur (globalThis.Orvane). Zéro dépendance.
//
// CE QUE V0 SIMULE, par taxon × biome :
//  - une croissance logistique : les naissances baissent à mesure que la biomasse du biome approche sa capacité ;
//    les espèces se gênent d'autant plus qu'elles ont la même taille (partage des ressources) ; les carnivores ne
//    pèsent pas sur la capacité : ils vivent des proies ;
//  - la chaîne alimentaire : un prédateur mange ce qui est à sa portée (masse, vitesse, vol, groupe, heure), partage les
//    proies avec ses concurrents, et sa satiété décide de ses naissances, de sa faim et de ses départs ; chez la proie,
//    la vulnérabilité de chaque phénotype (carapace, camouflage, pattes longues…) décide qui est mangé : c'est la sélection ;
//  - une mortalité naturelle tirée de la longévité ; une pénalité hors de la niche (axes du biome éloignés) ;
//  - des phénotypes : chaque combinaison de traits a son propre plan corporel (écarts) et son propre coût de
//    reproduction. Un trait ne « sert » à rien par lui-même : il pèse par son coût et ses écarts (une portée
//    plus grande, une maturité plus tardive…). Ce sont les pressions extérieures qui lui donnent sa valeur ;
//  - la mutation (un peu de chaque naissance change de phénotype), l'apparition de nouveaux traits admissibles ;
//  - la migration vers les biomes voisins en cas de surpeuplement, les déplacements imposés ;
//  - la séparation d'une lignée installée depuis longtemps dans un biome éloigné de sa niche ;
//    sa silhouette (plan.corps, voir moteur/corps.js) dérive avec elle : c'est ce qui la distingue à l'œil ;
//  - l'habitat : la capacité d'un biome encaisse les pertes et regagne lentement sa valeur de base.
//  - les saisons, si le monde a une année (monde.annee, en cycles) : les axes des biomes et leur production oscillent
//    (hiver froid, sombre, pauvre ; été chaud, lumineux, riche), ce qui déplace la convenance et la place ;
//  - les maladies : une population entassée peut voir éclore une épidémie (durée et virulence tirées), qui frappe selon la
//    résistance de chaque phénotype et peut gagner les voisins ; elle s'éteint d'elle-même ;
//  - le report : la demande de chasse qu'un phénotype épuisé ne peut servir se reporte sur les autres de la population.
//  - la génétique continue (docs/8) : par population, une moyenne et une variance de la taille, de la vitesse, de l'audace
//    et de la sociabilité ; la prédation, les joueurs, les naissances et l'optimum du biome les déplacent (Lande), la
//    mutation et la dérive les entretiennent, les migrations les mêlent ; une lignée qui se sépare garde ce qu'elle a acquis.
//  - la reproduction sexuée (docs/9) : par population, la fréquence de chaque allèle de trait ; chaque petit reçoit un
//    allèle de sa mère et un de son père (dominant : une copie montre le trait ; récessif : il en faut deux) ; les pères
//    sont choisis (attrait : une robe voyante, une grande taille) ; ce qui se voit suit l'ordre du catalogue (épistasie).
//  - l'isolement et les hybrides (docs/10) : chaque population mesure le flux de gènes qu'elle reçoit et son écart génétique
//    au reste de l'espèce ; une population isolée qui a divergé se sépare plus volontiers ; deux lignées apparentées qui
//    partagent un biome se croisent d'autant plus qu'elles sont peu isolées (le temps, la masse, le corps, la niche) :
//    leurs hybrides, moins viables, mêlent les gènes des deux (une zone hybride).
//  - la méfiance et l'habituation (docs/12) : ce qu'une population apprend des joueurs. Des rencontres qui finissent mal
//    la rendent méfiante, des rencontres sans suite l'habituent ; l'une et l'autre retombent avec le temps (demi-vies), et
//    une population audacieuse s'habitue plus vite, se méfie moins. Le moteur ne fait que tenir cette mémoire : c'est le
//    jeu qui la rend, en distance de fuite.
//
// FORMAT DES PRESSIONS, en plus : taxons[t][b].q = { [trait continu]: z moyen des bêtes retirées par les joueurs } ;
// taxons[t][b].contact = { rencontres, danger, aide } : ce que les bêtes ont vécu des joueurs (tampon, docs/12).
// taxons[t][b].apport = { n, N: { [phenotype]: n }, alleles, a } : des bêtes nées en élevage, relâchées avec leurs gènes (docs/36).
//
// FORMAT DES PRESSIONS reçues (sortie du tampon) :
//  { taxons: { [taxon]: { [biome]: { retrait: { [phenotype|'*']: n }, deplacement: [{ vers, n }] } } },
//    biomes: { [biome]: { habitat: ±n } } }
//  retrait > 0 : individus retirés (chasse, capture) ; < 0 : individus rendus ou aidés (libération, nourrissage).
(function (racine) {
'use strict';
const CAT = typeof require === 'function' ? require('./catalogue.js') : racine.OrvaneCatalogue;
const CORPS = typeof require === 'function' ? require('./corps.js') : racine.OrvaneCorps;   // la silhouette (moteur/corps.js)
const SYN = typeof require === 'function' ? require('./synthetique.js') : racine.OrvaneSynthetique;   // la vie synthétique (moteur/synthetique.js, docs/16)
const FLO = typeof require === 'function' ? require('./flore.js') : racine.OrvaneFlore;   // la flore (moteur/flore.js, docs/17)
const PAT = typeof require === 'function' ? require('./pathogenes.js') : racine.OrvanePathogenes;   // les souches (moteur/pathogenes.js, docs/18)
const MIL = typeof require === 'function' ? require('./milieu.js') : racine.OrvaneMilieu;   // le milieu transformé (moteur/milieu.js, docs/22)
const PON = typeof require === 'function' ? require('./ponte.js') : racine.OrvanePonte;   // pondre ou mettre bas (moteur/ponte.js, docs/25)
const STA = typeof require === 'function' ? require('./stades.js') : racine.OrvaneStades;   // les cycles de vie (moteur/stades.js, docs/26)
const INV = typeof require === 'function' ? require('./invention.js') : racine.OrvaneInvention;   // les traits inventés (moteur/invention.js, docs/27)
const NAT = typeof require === 'function' ? require('./natures.js') : racine.OrvaneNatures;   // les lieux qui changent de nature (moteur/natures.js, docs/28)
const DER = typeof require === 'function' ? require('./derives.js') : racine.OrvaneDerives;   // les dérives (moteur/derives.js, docs/29)
const DI = typeof require === 'function' ? require('./dietes.js') : racine.OrvaneDietes;   // les régimes en spectre (moteur/dietes.js, docs/30)
const CLI = typeof require === 'function' ? require('./climat.js') : racine.OrvaneClimat;   // le climat et la géologie lente (moteur/climat.js, docs/31)
const MET = typeof require === 'function' ? require('./meteo.js') : racine.OrvaneMeteo;   // la météo (moteur/meteo.js, docs/45)
const PHE = typeof require === 'function' ? require('./phenologie.js') : racine.OrvanePhenologie;   // les saisons des plantes (moteur/phenologie.js, docs/46 ; la flore l'appelle)
const GRA = typeof require === 'function' ? require('./grammaire.js') : racine.OrvaneGrammaire;   // la grammaire des effets et des conduites (moteur/grammaire.js, docs/32)
const CAS = typeof require === 'function' ? require('./castes.js') : racine.OrvaneCastes;   // les castes, les insectes sociaux (moteur/castes.js, docs/33)
const FOR = typeof require === 'function' ? require('./formes.js') : racine.OrvaneFormes;   // les formes nouvelles (moteur/formes.js, docs/33)
const ESP = typeof require === 'function' ? require('./esprit.js') : racine.OrvaneEsprit;   // l'esprit : apprendre, transmettre, des outils (moteur/esprit.js, docs/34)
// (docs/43) la version du contrat : MAJEUR.MINEUR, celle de package.json ; chaque instantané la porte (instantane.orvane)
const CONTRAT = '1.0';
const AXES = ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'];
let AX = AXES;   // (docs/20) et ceux qu'un monde ajoute (catalogue.monde.axes), le temps de son cycle
const REGLES = {
  mutation: .004,            // part des naissances qui changent de phénotype (vers un phénotype existant)
  nouveau_trait: .03,        // chance, par taxon et par cycle, qu'un trait admissible apparaisse
  migration: .02,            // part de la population qui part vers ses voisins (à proportion de ce qu'ils lui conviennent) quand le biome est saturé
  seuil_surpeuple: .85,      // saturation (biomasse / capacité) au-delà de laquelle on migre
  separation: { cycles: 30, effectif: 60, distance: 1.2, chance: .004, flux: .05, divergence: .3 },   // installée depuis 30 cycles, hors de sa niche (distance ≥ 1,2 × tolérance) : ~4 chances sur 1000 par cycle ;
                             // ou, où qu'elle soit, assez divergente du reste de l'espèce (divergence) ; un flux de gènes reçu de flux par cycle l'en empêche
  memoire_eteint: 10,        // un taxon éteint reste listé autant de cycles
  regain_habitat: .02,       // part de l'écart à la capacité de base regagné par cycle
  effondrement: -.25, explosion: .4,   // tendances qui font un événement
  menace: 50,                // effectif total sous lequel un taxon est « menacé »
  max_phenotypes: 20,        // au-delà, les phénotypes les plus rares sont fondus dans le plan de base (leurs allèles restent : docs/9)
  max_taxons: Infinity,      // au-delà, plus de séparation de lignées (la genèse s'en sert pour borner le monde)
  // la chaîne alimentaire
  besoin: .35,               // kg de proies par cycle et par kg^0.75 de prédateur (un prédateur de 25 kg : ~3,4 kg par cycle ; le cycle
                             // est une tranche de vie, pas une journée : une bête vit 30 à 60 cycles)
  conversion: .25,           // part de la viande mangée qui devient des petits : l'énergie vient des plantes, chaque maillon en perd 85 %
  demi_satiete: 30,          // à autant de fois son besoin disponible par tête, un prédateur est rassasié à moitié
  predation_max: .3,         // part d'une population de proies qu'un cycle de prédation peut retirer
  chasse_omnivore: .4,       // un omnivore chasse moins bien qu'un carnivore
  omnivore_vegetal: .4,      // un carnivore devenu omnivore (estomac-large) tire des plantes moins qu'un herbivore : 40 %
  omnivore_vegetal_base: 1,  // un omnivore de naissance (essais : moins d'un herbivore)
  longevite_predateur: 0,    // (essais) un carnivore né de la dérive vit au moins autant de fois ce que sa viande lui permet de remplacer
  viande_omnivore: 1,        // la part de viande dans ce que mange un omnivore : son besoin de proies (essais)
  faim_carnivore: 3,         // un carnivore affamé meurt plus : × (1 + faim × (1 − satiété)²)
  detritivore_vegetal: 1,    // ce qu'un charognard tire de la place, rapporté à un herbivore (essais)
  cadavres: 0,               // (6 novembre) la part de ce que la mort naturelle laisse dans un lieu dont vivent ses charognards ; 0 : ils broutent, comme avant
  vers_carnivore: .35,       // à la dérive du régime, la chance qu'un omnivore devienne carnivore (sinon herbivore)
  faim_migration: .4,        // satiété sous laquelle un prédateur s'en va chercher ailleurs
  // (docs/38) l'hivernage : une population d'un lieu à saisons, mobile, dont l'hiver est rude (sa place y vaut moins de rude × celle
  // de l'été) part à la fin de l'automne vers le voisin d'un autre lieu le plus doux en hiver (au moins marge de mieux, et min), et
  // en revient au printemps ; la part qui part grandit avec le gain, la sociabilité et le savoir des routes (part_min…part_max).
  // actif : 0, le monde le calcule (collectif.js le publie) mais personne ne bouge ; 1, cette part s'en va vraiment (et .5, la moitié)
  hivernage: { actif: 0, rude: .75, marge: .2, min: .2, part_min: .05, part_max: .85, masse_marcheur: .3, masse_volant: .005,
    fenetres: { depart: [.78, .88], partie: [.88, .12], retour: [.12, .22] } },   // la phase de l'année (0 : le cœur de l'hiver)
  // (docs/15) deux règles des mondes à parcelles, nulles ailleurs (moteur/parcelles.js les pose dans monde.regles) :
  dispersion: 0,             // part de chaque population qui s'en va chaque cycle vers les parcelles voisines du même biome, quoi qu'il arrive
  fuite: 0,                  // au-delà de la capacité (un défrichage, une catastrophe), part de l'excès qui fuit vers les voisins : fuite × (1 − 1/saturation)
  report_proies: 1.5,        // exposant du report sur la proie abondante (1 : au prorata ; 2 : fort)
  // les saisons (si le monde a une année) : amplitudes par défaut d'un biome, sur les axes et sur la production
  saisons: { temperature: .15, lumiere: .1, humidite: .08, capacite: .25 },
  // les maladies : chance d'éclosion par population et par cycle, multipliée par le surpeuplement ; durée et virulence tirées
  maladie: { chance: .003, duree: [8, 25], virulence: [.03, .12], contagion: .15 },
  // les catastrophes : chance par biome et par cycle (modulée par le sol et la saison), part de capacité perdue, mortalité
  catastrophes: {
    incendie:   { chance: .003, capacite: .4, mortalite: .2,  detail: 'le feu court dans le couvert' },      // couvert dense et sec, surtout l'été
    crue:       { chance: .0015, capacite: .2, mortalite: .1,  detail: 'les eaux montent' },                   // sols humides et bas, surtout au printemps
    secheresse: { chance: .002, capacite: .3, mortalite: .05, detail: 'les points d\'eau tarissent' }        // sols secs, en été
  },
  // la dérive d'une lignée qui se sépare : bornes de masse (×), chances de changer de régime, de locomotion, d'heure
  derive: { masse: [.7, 1.3], regime: 0, locomotion: .1, activite: .05, corps: 1, tolerance: 0, formes: 0, organes: 0 },   // corps : l'ampleur de la dérive de la silhouette ; tolerance : celle de la largeur de la niche (0 : figée) ; formes : la naissance des formes du monde à la séparation, hors des grands changements de plan (0 : seulement par eux, docs/33) ; organes : une chance de plus qu'un organe neuf naisse à la séparation (0 : 6 % seulement, docs/11)
  vol_masse_max: 12,         // au-delà (kg), une lignée ne vole plus : elle perd le vol (et ses ailes) en grandissant
  genetique: true,           // la génétique continue (docs/8) ; false : les populations n'ont pas de traits continus
  // la reproduction sexuée (docs/9) ; actif false : les petits naissent du phénotype de leur parent (clonal, avec REGLES.mutation)
  // l'isolement reproductif entre deux lignées apparentées : 1 − e^−(temps/tau + masse·|ln m1/m2| + corps·écart + niche·écart) ;
  // rencontre : la part des accouplements possibles entre deux lignées qui se mêlent à parts égales et ne sont pas isolées
  hybride: { actif: true, rencontre: .3, tau: 200, masse: 2, corps: 3, niche: 1, zone: .01 },
  // la méfiance (docs/12) : elle retombe de moitié en demi_vie cycles, l'habituation en demi_vie_habitude ; preuve : le
  // nombre de contacts qui la fixent aux deux tiers ; sensibilite : ce que pèse la part des contacts qui finissent mal ;
  // habitude : les contacts sans suite qui habituent aux deux tiers ; oubli : la vitesse à laquelle des contacts paisibles
  // défont une méfiance (contre 1 pour l'apprendre) ; paix : combien la part des contacts qui finissent mal empêche de
  // s'habituer (à 20, un sur dix suffit presque) ; audace : ce que l'audace moyenne (z) change à tout cela ; alerte : le
  // seuil d'un événement « mefiance »
  mefiance: { actif: true, demi_vie: 6, demi_vie_habitude: 15, preuve: 20, sensibilite: 6, habitude: 150, oubli: .3, paix: 20, audace: .5, alerte: .5 },
  sexe: { actif: true, gain: 2e-4, perte: 2e-4, attrait: 1, nouveau: { dominant: .001, recessif: .03 } }   // gain, perte : mutation par allèle et par génération
};
// --- les traits continus (docs/8) : par population, Q[trait] = { m : moyenne génétique, G : variance additive }, en
// écarts-types naturels de la génération 0 ; la variance phénotypique est P = G + (1 − h2), l'environnement ne change pas ---
const QUANT = CAT.QUANT || {};
const lireQ = q => { const o = {}; for (const [k, d] of Object.entries(QUANT)) { const x = q?.[k];
  o[k] = x && Number.isFinite(x.m) ? { m: x.m, G: Number.isFinite(x.g) ? x.g : d.h2 } : { m: 0, G: d.h2 }; } return o; };
const copieQ = Q => Object.fromEntries(Object.entries(Q).map(([k, x]) => [k, { m: x.m, G: x.G }]));
const ecrireQ = Q => Object.fromEntries(Object.entries(Q).map(([k, x]) => [k, { m: +x.m.toFixed(5), v: +(x.G + 1 - QUANT[k].h2).toFixed(5), g: +x.G.toFixed(5) }]));
// l'optimum d'une population : la niche du taxon, déplacée par l'écart du biome sur l'axe du trait (plus froid : plus grand)
const optimumQ = (d, plan, b) => d.optimum && plan.niche && b?.axes ? d.optimum.pente * ((b.axes[d.optimum.axe] ?? .5) - (plan.niche[d.optimum.axe] ?? .5)) : 0;
// ce que pèse une pente exponentielle (risque ∝ e^(pente·z)) dans une population N(m, P), rapporté à la génération 0
// (m = 0, P = 1) : 1 le jour un, plus de 1 quand la moyenne monte du côté de la pente
const penteQ = (Q, cle) => { let s = 0; for (const [k, d] of Object.entries(QUANT)) { const b = d[cle]; if (!b || !Q[k]) continue;
  s += b * Q[k].m + b * b * (Q[k].G - d.h2) / 2; } return Math.exp(s); };
// la charge de la sélection stabilisante, rapportée à la génération 0 : au-dessus de 1 quand la population s'est
// rapprochée de son optimum — l'adaptation rachète une part de ce que coûte un biome loin de la niche
const chargeQ = (Q, plan, b) => { let s = 0; for (const [k, d] of Object.entries(QUANT)) { if (!Q[k]) continue; const w = d.omega2 || 20, P = Q[k].G + 1 - d.h2, th = optimumQ(d, plan, b);
  s += .5 * Math.log((w + 1) / (w + P)) - (Q[k].m - th) ** 2 / (2 * (w + P)) + th * th / (2 * (w + 1)); } return Math.exp(s); };
// un cycle de génétique pour une population (équation de Lande : la moyenne génétique bouge de G/P × la différentielle de
// sélection). Les morts sélectives (prédation, maladie : un risque ∝ e^(pente·z) tue une part décalée de pente·P ; les
// joueurs : le z moyen rapporté) déplacent les survivants ; les naissances (fécondité) et la sélection stabilisante des
// jeunes vers l'optimum, les nouveau-nés ; la mutation remet de la variance, la dérive en ôte et agite la moyenne
// d'autant plus que la population est petite. La part de nouveau-nés fait l'échelle de temps : une génération par cycle
// pour une bête qui se renouvelle entièrement, presque rien pour une bête longévive.
function evoluerQ(Q, o) {
  const surv = Math.max(1e-9, o.N - o.Dmorts - o.Dpred - o.Dext), B = Math.max(0, o.B), Nap = surv + B; if (o.N <= 0 || Nap <= 1e-9) return;
  const g = B / Nap, Ne = Math.max(2, Nap);
  for (const [k, d] of Object.entries(QUANT)) {
    const x = Q[k]; if (!x) continue;
    const P = x.G + 1 - d.h2, w = d.omega2 || 20, th = optimumQ(d, o.plan, o.b);
    let ms = x.m;
    if (d.predation && o.Dpred > 0) ms -= x.G * d.predation * o.Dpred / surv;
    if (d.maladie && o.Dmal > 0) ms -= x.G * d.maladie * o.Dmal / surv;
    if (o.qExt && Number.isFinite(o.qExt[k]) && o.Dext > 0) ms -= (x.G / P) * (o.qExt[k] - x.m) * o.Dext / surv;
    const mn = x.m + x.G * ((d.fecondite || 0) + (o.sexe ? (d.attrait || 0) / 2 : 0) - (x.m - th) / (w + P));   // l'attrait : la moitié des gènes vient des pères choisis
    let m = (surv * ms + B * mn) / Nap;
    if (g > 0) m += Math.sqrt(g * x.G / Ne) * o.gauss();
    const Vm = d.h2 * d.h2 / (w + 1);                                  // la mutation qui tient la variance de la génération 0 à l'équilibre
    x.m = clamp(m, -8, 8); x.G = clamp(x.G + g * (Vm - x.G * x.G / (w + P) - x.G / (2 * Ne)), 1e-4, 4);
  }
}
// deux groupes qui se rejoignent : les moyennes se pondèrent, l'écart entre elles devient de la variance
function melangerQ(A, na, B, nb) {
  const n = na + nb; if (n <= 0) return copieQ(A);
  const o = {}; for (const k of Object.keys(A)) { const a = A[k], b = B[k] || a;
    o[k] = { m: (na * a.m + nb * b.m) / n, G: clamp((na * a.G + nb * b.G) / n + na * nb * (a.m - b.m) ** 2 / (n * n), 1e-4, 4) }; }
  return o;
}
// --- la reproduction sexuée (docs/9) : par population, A[trait] = p, la fréquence de l'allèle qui porte le trait. Une bête
// en a deux copies (Hardy-Weinberg) ; dominant : une suffit à montrer le trait, récessif : il en faut deux ---
const domDe = (cat, id) => (cat[id]?.heredite ?? CAT.TRAITS[id]?.heredite) !== 'recessif';
const cleDe = traits => traits.slice().sort().join('+');            // la clé d'un phénotype : ses traits ('' : le plan de base)
// une mère d'allèle a, un père d'allèle b : la part de petits qui montrent le trait (E), et la part de l'allèle chez ceux
// qui le montrent (exp) et chez les autres (non : les porteurs cachés d'un récessif)
function mendel(a, b, dom) {
  const TT = a * b, Tt = a * (1 - b) + b * (1 - a), tt = (1 - a) * (1 - b);
  if (dom) { const E = TT + Tt; return { E, exp: E > 0 ? (TT + Tt / 2) / E : 0, non: 0 }; }
  const Nn = Tt + tt; return { E: TT, exp: 1, non: Nn > 0 ? Tt / 2 / Nn : 0 };
}
// une population sans mémoire génétique (un monde d'avant, un phénotype nouveau) : Hardy-Weinberg à rebours
function allelesDe(phenotypes, N, cat, A0) {
  const tot = N.reduce((a, x) => a + x, 0) || 1, e = {};
  phenotypes.forEach((p, i) => { for (const id of p.traits) e[id] = (e[id] || 0) + N[i] / tot; });
  const A = {}; for (const id in e) { const x = clamp(e[id], 0, .999999); A[id] = domDe(cat, id) ? 1 - Math.sqrt(1 - x) : Math.sqrt(x); }
  for (const id in A0 || {}) if (Number.isFinite(A0[id])) A[id] = A0[id];
  return A;
}
// Les phénotypes ne disent que des TAUX : survie, fécondité, attrait de ceux qui montrent le trait et des autres. Les
// fréquences d'allèles sont l'état (un phénotype rare fondu dans le plan de base ne perd pas ses allèles).
// tauxDe : le taux par tête (num / den) de ceux qui montrent le trait id, et des autres (null : personne dans le groupe)
function tauxDe(id, phenotypes, num, den) {
  let ne = 0, de = 0, nn = 0, dn = 0;
  phenotypes.forEach((ph, i) => { if (!(den[i] > 0)) return; if (ph.traits.includes(id)) { ne += num[i]; de += den[i]; } else { nn += num[i]; dn += den[i]; } });
  return [de > 0 ? ne / de : null, dn > 0 ? nn / dn : null];
}
// ce que deviennent des bêtes en Hardy-Weinberg (M = mendel) quand ceux qui montrent le trait ont le taux rE, les autres rN :
// [copies de l'allèle, bêtes] par tête
function ponderer(M, rE, rN) {
  if (rE == null) rE = rN ?? 1; if (rN == null) rN = rE;
  return [M.E * rE * M.exp + (1 - M.E) * rN * M.non, M.E * rE + (1 - M.E) * rN];
}
const alleleParmi = (p, dom, r) => { const [n, d] = ponderer(mendel(p, p, dom), r[0], r[1]); return d > 0 ? n / d : p; };
// les naissances : chaque petit tire un allèle de sa mère (pm) et un de son père (pf) à chaque locus, les loci sont
// indépendants ; ce qui se voit passe par CAT.exprimer. → Map(clé de phénotype → part des petits)
// (ce qui se voit d'un jeu d'allèles : le même pour tous les mondes qui ont le même catalogue ; un cache par catalogue, quatre au
// plus, borné — un cache unique servait à un monde ce qu'il avait appris d'un autre, et grossissait sans fin sur une longue genèse)
const EXPRIME = new Map(), PAR_CAT = new WeakMap();
function exprimeDe(cat) { let m = PAR_CAT.get(cat); if (m) return m.size > 2e5 ? (m.clear(), m) : m;
  const sig = Object.keys(cat || {}).join(','); m = EXPRIME.get(sig);
  if (!m) { if (EXPRIME.size >= 4) EXPRIME.delete(EXPRIME.keys().next().value); m = new Map(); EXPRIME.set(sig, m); }
  if (cat && typeof cat === 'object') PAR_CAT.set(cat, m); return m; }
function portees(pm, pf, cat, epsilon = 1e-6) {
  const L = Object.keys(pm).map(id => [id, mendel(pm[id], pf[id] ?? pm[id], domDe(cat, id)).E]).filter(([, e]) => e > epsilon).sort((x, y) => y[1] - x[1]);
  const out = new Map(), vus = exprimeDe(cat);
  const rec = (k, pr, porte) => {
    if (pr < epsilon) return;
    if (k === L.length) { const c = porte.join('|'); let cle = vus.get(c);
      if (cle === undefined) { cle = (CAT.exprimer ? CAT.exprimer(porte, cat) : porte.slice().sort()).join('+'); vus.set(c, cle); }
      out.set(cle, (out.get(cle) || 0) + pr); return; }
    const [id, e] = L[k];
    if (e < 1) rec(k + 1, pr * (1 - e), porte);
    porte.push(id); rec(k + 1, pr * e, porte); porte.pop();
  };
  rec(0, 1, []);
  let z = 0; for (const v of out.values()) z += v; if (z > 0) for (const [k, v] of out) out.set(k, v / z);
  return out;
}
const attraitDe = (traits, cat) => Math.pow(traits.reduce((a, id) => a * (cat[id]?.attrait ?? CAT.TRAITS[id]?.attrait ?? 1), 1), REGLES.sexe.attrait ?? 1);
// le phénotype existant le plus proche d'une combinaison absente : celui dont les traits en sont le plus grand sous-ensemble
function plusProche(cle, phenotypes) {
  const T = new Set(cle ? cle.split('+') : []); let best = 0, n = -1;
  phenotypes.forEach((p, i) => { if (p.traits.every(x => T.has(x)) && p.traits.length > n) { best = i; n = p.traits.length; } });
  return best;
}
// --- l'isolement et les hybrides (docs/10) ---
// l'écart génétique entre deux groupes : la différence de fréquences d'allèles rapportée à leur diversité (le F_ST : 0, une
// seule population ; 0,25, des populations très différenciées),
// plus le quart de l'écart moyen des traits continus (en variances naturelles)
// la méfiance et l'habituation d'une population, un cycle plus tard (docs/12). c = { rencontres, danger, aide } : les
// contacts sans suite, ceux qui ont fini mal (prélèvements, captures), l'aide (nourrissage, libération) ; za : son audace
function apprendre(m, h, c, za = 0) {
  const M = REGLES.mefiance, ka = Math.exp(-M.audace * clamp(za, -3, 3));   // < 1 chez une population audacieuse
  m *= 2 ** (-1 / M.demi_vie); h *= 2 ** (-1 / M.demi_vie_habitude);
  const Rn = Math.max(0, +c?.rencontres || 0), D = Math.max(0, +c?.danger || 0), A = Math.max(0, +c?.aide || 0), tot = Rn + D;
  if (tot > 0) { const e = 1 - Math.exp(-tot / M.preuve), cible = 1 - Math.exp(-M.sensibilite * ka * D / tot);
    m += e * (cible - m) * (cible > m ? 1 : M.oubli);
    h *= 1 - e * cible; }                                                  // ce qui finit mal défait l'habitude
  if (Rn + A > 0) h += (1 - h) * (1 - m) * Math.exp(-M.paix * D / Math.max(1, tot)) * (1 - Math.exp(-(Rn + 3 * A) / (M.habitude * ka)));
  return [clamp(m, 0, 1), clamp(h, 0, 1)];
}
function divergence(A1, Q1, A2, Q2) {
  let num = 0, den = 0;
  for (const id of new Set([...Object.keys(A1 || {}), ...Object.keys(A2 || {})])) { const p = A1?.[id] || 0, q = A2?.[id] || 0, m = (p + q) / 2; num += (p - q) ** 2; den += m * (1 - m); }
  let qd = 0, k = 0; for (const c in Q1 || {}) if (Q2?.[c]) { qd += (Q1[c].m - Q2[c].m) ** 2; k++; }
  return (num > 0 ? num / (4 * Math.max(den, .02)) : 0) + (k ? qd / k : 0) / 4;   // (le premier terme est le F_ST de deux populations)
}
// la parenté de deux lignées : depuis quand elles ne partagent plus leurs gènes (null : rien ne les relie)
const parentDe = (id, T) => T.get(id)?.parent || (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null);
function parente(A, B, T) {
  const chaine = t => { const L = [t.id]; let id = parentDe(t.id, T); while (id && !L.includes(id) && L.length < 60) { L.push(id); id = parentDe(id, T); } return L; };
  const cA = chaine(A), cB = chaine(B), c = cA.find(id => cB.includes(id)); if (!c) return null;
  const app = id => id === A.id ? A.apparu : id === B.id ? B.apparu : (T.get(id)?.apparu ?? 0), iA = cA.indexOf(c), iB = cB.indexOf(c);
  return { depuis: Math.min(iA > 0 ? app(cA[iA - 1]) : Infinity, iB > 0 ? app(cB[iB - 1]) : Infinity) };
}
// l'isolement reproductif de deux lignées (0 : une seule population ; 1 : aucun croisement) : il s'accumule avec le temps
// depuis leur séparation, l'écart de masse, de silhouette, de niche ; deux régimes ou deux formes de corps ne se croisent pas
function isolement(A, B, T, n) {
  if (A === B) return 0;
  if (A.plan.regime !== B.plan.regime) return 1;
  const fa = A.plan.corps?.forme, fb = B.plan.corps?.forme; if (fa && fb && fa !== fb) return 1;
  const lien = parente(A, B, T); if (!lien || !Number.isFinite(lien.depuis)) return 1;
  const H = REGLES.hybride, dm = Math.abs(Math.log((A.plan.masse_kg || 1) / (B.plan.masse_kg || 1))),
    dc = CORPS && A.plan.corps && B.plan.corps ? CORPS.distance(A.plan.corps, B.plan.corps) : 0, dn = A.plan.niche && B.plan.niche ? dist(A.plan.niche, B.plan.niche) : 0;
  return 1 - Math.exp(-(Math.max(0, n - lien.depuis) / H.tau + H.masse * dm + H.corps * dc + H.niche * dn));
}
// une moyenne continue de la lignée B, lue sur l'échelle de la lignée A (leurs plans diffèrent)
function surEchelle(d, planA, planB) {
  const a = planA[d.champ], b = planB[d.champ]; if (typeof a !== 'number' || typeof b !== 'number') return 0;
  return d.mode === 'log' ? (a > 0 && b > 0 ? Math.log(b / a) / d.echelle : 0) : (b - a) / d.echelle;
}
// une lignée qui se sépare : ce que sa population a acquis devient son plan, et sa moyenne repart de zéro
function replierQ(plan, Q) {
  for (const [k, d] of Object.entries(QUANT)) { const x = Q[k]; if (!x || !x.m || typeof plan[d.champ] !== 'number') continue;
    if (d.mode === 'log') { plan[d.champ] = +(plan[d.champ] * Math.exp(d.echelle * x.m)).toFixed(3);
      if (d.champ === 'taille_m' && typeof plan.masse_kg === 'number') plan.masse_kg = +(plan.masse_kg * Math.exp(3 * d.echelle * x.m)).toFixed(3); }
    else plan[d.champ] = +clamp(plan[d.champ] + d.echelle * x.m, 0, 1).toFixed(3);
    x.m = 0; }
}
// la phase de l'année (0 = plein hiver, 0,5 = plein été) et son nom
const SAISONS = ['hiver', 'printemps', 'été', 'automne'];
const saisonDe = (n, annee) => { if (!annee) return null; const phase = (n % annee) / annee; return { phase: +phase.toFixed(4), nom: SAISONS[Math.floor(((phase + .125) % 1) * 4)], production: +(1 + REGLES.saisons.capacite * -Math.cos(2 * Math.PI * phase)).toFixed(3) }; };
// les axes d'un biome à une phase de l'année : froid et sombre en hiver, chaud et lumineux en été, un peu plus humide en hiver
function axesSaison(b, phase) {
  if (phase == null || b.saisons === false || b.saisons === null) return b.axes;
  const A = { ...REGLES.saisons, ...(b.saisons || {}) }, c = -Math.cos(2 * Math.PI * phase), a = { ...b.axes };
  a.temperature = clamp(a.temperature + A.temperature * c, 0, 1); a.lumiere = clamp(a.lumiere + A.lumiere * c, 0, 1); a.humidite = clamp(a.humidite - A.humidite * c, 0, 1);
  return a;
}
const productionSaison = (b, phase) => phase == null || b.saisons === false || b.saisons === null ? 1 : 1 + ({ ...REGLES.saisons, ...(b.saisons || {}) }).capacite * -Math.cos(2 * Math.PI * phase);
const PART_K = { herbivore: 1, omnivore: 1, detritivore: .3, filtreur: .3, carnivore: 0, synthetique: 0 };   // ce que chaque régime pèse sur la capacité du biome (l'omnivore : moins s'il trouve des proies)
const facteur = (traits, cat, k) => traits.reduce((f, id) => f * (cat[id]?.[k] ?? 1), 1);
// Une lignée qui se sépare dérive : sa masse (et avec elle maturité et longévité, allométriquement), son tempérament, sa
// sociabilité, et sous REGLES.derive plus marqué (la genèse) son régime, sa locomotion, son heure — la niche devient le biome.
function deriver(plan, b, R) {
  const D = REGLES.derive, k = D.masse[0] * Math.pow(D.masse[1] / D.masse[0], R());   // tirage log-uniforme entre les deux bornes
  const p = { ...plan, masse_kg: +(plan.masse_kg * k).toFixed(3), taille_m: +(plan.taille_m * Math.cbrt(k)).toFixed(3),
    maturite: +(plan.maturite * Math.pow(k, .25)).toFixed(2), longevite: +(plan.longevite * Math.pow(k, .25)).toFixed(2),
    temperament: clamp(plan.temperament + (R() - .5) * .3, 0, 1), sociabilite: clamp(plan.sociabilite + (R() - .5) * .3, 0, 1),
    niche: { ...b.axes }, tolerance: plan.tolerance || .35, locomotion: [...(plan.locomotion || ['marche'])] };
  // (équilibrage, 5 novembre : REGLES.derive.tolerance > 0 laisse la largeur de la niche dériver, plutôt vers l'étroit — des spécialistes
  // naissent ; 0 par défaut, et son tirage ne se fait que s'il est demandé : le hasard des mondes qui ne le demandent pas ne bouge pas)
  if (D.tolerance > 0) p.tolerance = +clamp((plan.tolerance || .35) * Math.exp(D.tolerance * (R() - .6)), D.tolerance_min ?? .15, .9).toFixed(3);
  // le régime passe par l'omnivore ; un omnivore redevient plus souvent herbivore que carnivore (il y a plus à brouter qu'à chasser)
  // (un filtreur, un charognard gardent le leur : ce n'est pas un pas de plus ou de moins vers la viande)
  if (R() < D.regime && ['herbivore', 'omnivore', 'carnivore'].includes(plan.regime)) p.regime = plan.regime === 'herbivore' ? 'omnivore' : plan.regime === 'carnivore' ? 'omnivore' : R() < (REGLES.vers_carnivore ?? .35) ? 'carnivore' : 'herbivore';
  // un mode de déplacement se gagne (ce que le biome favorise) ou se perd (un accessoire dont le biome n'a pas l'usage) : sans
  // cela, toutes les lignées finiraient par tout savoir faire
  const VOL = REGLES.vol_masse_max ?? Infinity, eau = b.milieu === 'amphibie' || b.milieu === 'aquatique' || b.milieu === 'marin';
  // (en pleine eau, lac, rivière ou mer, on ne gagne ni course, ni saut, ni grimpe, et on les perd : un poisson ne court pas ;
  // marcher ou ramper sur le fond, fouir la vase restent possibles)
  const pleineEau = b.milieu === 'aquatique' || b.milieu === 'marin';
  if (R() < D.locomotion) {
    const inutiles = p.locomotion.filter(l => (l === 'grimpe' && (b.axes.couvert < .4 || pleineEau)) || (l === 'nage' && !eau && p.regime !== 'filtreur') || (l === 'course' && (b.axes.couvert > .8 || pleineEau)) || (l === 'saut' && (pleineEau || R() < .5)) || (l === 'fouissage' && R() < .3));
    if (inutiles.length && p.locomotion.length > 1 && R() < (pleineEau ? .9 : .45)) { const x = inutiles[Math.floor(R() * inutiles.length)]; p.locomotion = p.locomotion.filter(l => l !== x); }
    else { const c = []; if (eau && !p.locomotion.includes('nage')) c.push('nage');
      if (!pleineEau) { if (b.axes.couvert > .6 && !p.locomotion.includes('grimpe')) c.push('grimpe'); if (!p.locomotion.includes('course')) c.push('course'); if (!p.locomotion.includes('saut')) c.push('saut');
        if (b.axes.altitude > .5 && !p.locomotion.includes('vol') && p.masse_kg <= VOL && R() < .25) c.push('vol'); }
      if (c.length) p.locomotion.push(c[Math.floor(R() * c.length)]); }
  }
  const volait = p.locomotion.includes('vol') && p.masse_kg > VOL;
  if (volait) { p.locomotion = p.locomotion.filter(l => l !== 'vol'); if (!p.locomotion.some(l => l !== 'nage') || !p.locomotion.length) p.locomotion.unshift('marche'); }
  if (R() < D.activite) p.activite = ['diurne', 'nocturne', 'crepusculaire'][Math.floor(R() * 3)];
  // l'eau d'un nageur suit celle où la lignée se sépare : la mer la sale, la rivière l'adoucit, la côte la rend souple
  if (p.locomotion.includes('nage')) { const e = plan.locomotion?.includes('nage') ? plan.eau || 'douce' : b.milieu === 'marin' ? 'salee' : 'douce';
    p.eau = b.milieu === 'marin' ? (e === 'douce' ? 'mixte' : R() < .3 ? 'salee' : e) : b.milieu === 'aquatique' ? (e === 'salee' ? 'mixte' : R() < .3 ? 'douce' : e)
      : b.milieu === 'amphibie' && R() < .25 ? 'mixte' : e; }
  if (p.regime === 'carnivore' && R() < .5) { p.vitesse_rel = +(p.vitesse_rel * 1.15).toFixed(2); p.perception = clamp((p.perception || .5) + .1, 0, 1); }
  // un prédateur vit assez pour se nourrir : ses petits naissent de la viande mangée (REGLES.conversion), au plus
  // conversion × besoin × masse^-0,25 par tête et par cycle ; il lui faut une mort plus lente que cela, avec de la marge
  // (un carnivore né d'un petit omnivore à vie brève, sinon, n'a aucune chance)
  if (p.regime === 'carnivore' && REGLES.longevite_predateur) { const Lmin = REGLES.longevite_predateur / (REGLES.conversion * REGLES.besoin * Math.pow(Math.max(.001, p.masse_kg), -.25));
    if (p.longevite < Lmin) { p.maturite = +(p.maturite * Math.min(2, Lmin / p.longevite) ** .5).toFixed(2); p.longevite = +Lmin.toFixed(2); } }
  // le corps suit : la silhouette dérive vers ce que le biome favorise, et garde la marque d'un mode de déplacement gagné
  if (plan.corps && CORPS) { const avant = new Set(plan.locomotion || ['marche']);
    p.corps = CORPS.deriver(plan.corps, p, b, R, D.corps ?? 1, p.locomotion.filter(l => !avant.has(l)), k, D.formes || 0, D.organes || 0);
    if (volait && p.corps) p.corps = { ...p.corps, ailes: 0, organes: (p.corps.organes || []).filter(o => o.type !== 'ailes'), forme: p.corps.forme === 'oiseau' ? 'bipede' : p.corps.forme }; }
  return p;
}
// la place qu'un taxon trouve dans un biome : les autres l'encombrent d'autant plus qu'ils ont sa taille (une bête de
// 5 kg et une de 60 kg ne broutent pas la même chose) — recouvrement gaussien sur le logarithme des masses
// Les ressources d'un biome s'étalent sur quatre décades de masse (0,1 kg à 1 t) ; une espèce n'en exploite qu'une bande
// (écart-type 0,35 décade : une bête de 5 kg et une de 15 kg ne se gênent qu'à moitié, 5 kg et 60 kg presque pas) :
// sa capacité propre est cette part de la capacité du biome, et la somme de toutes reste bornée par K.
const SIGMA_BANDE = .35;
const recouvrement = (m1, m2) => { const d = Math.log10(m1 / m2); return Math.exp(-(d * d) / (2 * SIGMA_BANDE * SIGMA_BANDE)); };
const charge = (liste, masse) => liste.reduce((s, e) => s + e.biomasse * recouvrement(masse, e.masse), 0);
const BANDE = Math.sqrt(2 * Math.PI) * SIGMA_BANDE / 4;   // ≈ 0,22 : la largeur d'une bande rapportée au spectre entier
// l'appétence d'un prédateur pour une proie : la masse (une proie d'un tiers de sa masse est idéale ; rien au-delà de 1,5 fois,
// rien sous un cinquantième), la vitesse (une proie plus rapide échappe), le vol (hors de portée d'un marcheur), le groupe
// (l'alerte collective) et l'heure (un diurne croise peu un nocturne)
function appetence(pred, proie) {
  const rap = (proie.masse_kg || 1) / (pred.masse_kg || 1); if (rap < .02 || rap > 1.5) return 0;
  const lg = Math.log10(rap) - Math.log10(.3); let f = Math.exp(-(lg * lg) / .5);
  const vp = (pred.vitesse_rel || 4) * (pred.taille_m || 1), vq = (proie.vitesse_rel || 4) * (proie.taille_m || 1);
  f *= clamp(Math.sqrt(vp / Math.max(.01, vq)), .6, 1.4);
  if ((proie.locomotion || []).includes('vol') && !(pred.locomotion || []).includes('vol')) f *= .3;
  f *= 1 - .2 * (proie.sociabilite || 0);
  const ap = pred.activite, aq = proie.activite; if (ap && aq && ap !== aq && ap !== 'continue' && aq !== 'continue' && ap !== 'crepusculaire' && aq !== 'crepusculaire') f *= .6;
  return f;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clone = o => JSON.parse(JSON.stringify(o));
const dist = (a, b) => Math.sqrt(AX.reduce((s, k) => s + ((a[k] ?? .5) - (b[k] ?? .5)) ** 2, 0));
function rng(graine, n) {           // un générateur par cycle, semé par la graine du monde et le numéro de cycle
  let g = ((graine >>> 0) ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0;
  return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
}

// --- le plan corporel d'un phénotype : plan de base × écarts de ses traits ---
function planDe(plan, traits, cat) {
  const p = { ...plan };
  for (const id of traits) { const t = cat[id]; if (!t) continue;
    for (const k in t.ecarts || {}) if (typeof p[k] === 'number') p[k] *= t.ecarts[k];
    Object.assign(p, t.fixe || {}); }
  for (const k of ['sociabilite', 'temperament', 'perception']) if (typeof p[k] === 'number') p[k] = clamp(p[k], 0, 1);
  return p;
}
const coutDe = (traits, cat) => clamp(traits.reduce((s, id) => s + (cat[id]?.cout || 0), 0), 0, .95);
const ecartsDe = (traits, cat) => { const e = {}; for (const id of traits) for (const k in cat[id]?.ecarts || {}) e[k] = (e[k] ?? 1) * cat[id].ecarts[k]; return e; };
// taux intrinsèques, par cycle
// (la masse ramène tout : une bête de 100 kg ne se multiplie pas comme une de 1 kg — loi de Fenchel, r ∝ masse^-1/4 ;
//  on garde la différence entre les stratégies, portée et maturité, à l'intérieur de ce que la masse permet)
const croissance = p => { const rmax = .35 * Math.pow(Math.max(.1, p.masse_kg || 1), -.25), r = .6 * Math.log(1 + (p.portee || 2)) / Math.max(1, p.maturite || 1);
  return clamp(r * Math.min(1, rmax / .35), .01, rmax); };
const mortalite = p => 1 / Math.max(2, p.longevite || 20);
// convenance d'un biome (0..1) : 1 dans la niche, décroît avec la distance ; nulle si le milieu est impossible
// L'eau : un nageur vit en eau douce (plan.eau absent, ou 'douce'), en mer ('salee'), ou dans les deux ('mixte', comme
// les poissons qui remontent les fleuves) ; une côte, une mangrove, un estuaire (amphibie) accueillent tous les nageurs.
const eauDouce = plan => plan.eau !== 'salee', eauSalee = plan => plan.eau === 'salee' || plan.eau === 'mixte';
// (docs/38) la route de l'hiver d'une population : null, ou { vers, ici, la, part } — P son plan, b son lieu, lieu(id) → un lieu,
// s sa sociabilité, routes la part des siens qui savent les routes (docs/34), H les seuils (ceux du moteur, ou d'un monde). Sans
// hasard : le moteur s'en sert pour faire partir les bêtes (REGLES.hivernage.actif), collectif.js pour le dire aux jeux. (Une mer ne
// se traverse qu'en volant, nageant, dérivant.)
const lieuType = id => String(id ?? '').split('~')[0];
// trop de variantes : le plan de base et les plus fréquentes restent ; chacune des autres rejoint la gardée la plus proche (le moins
// de traits en plus ou en moins ; à égalité, la première gardée), avec sa fréquence, partout où elle vit
function plafonner(t, max) {
  const P = t.phenotypes; if (P.length <= max) return;
  const tri = P.map((p, i) => i).slice(1).sort((x, y) => (P[y].frequence || 0) - (P[x].frequence || 0) || x - y), gardes = [0, ...tri.slice(0, max - 1)];
  const TS = P.map(p => new Set(p.traits)), ecart = (a, b) => { let d = 0; for (const x of TS[a]) if (!TS[b].has(x)) d++; for (const x of TS[b]) if (!TS[a].has(x)) d++; return d; };
  for (const i of tri.slice(max - 1)) { let j = 0, dj = Infinity; for (const g of gardes) { const d = ecart(i, g); if (d < dj) { dj = d; j = g; } }
    const a = P[i], b = P[j]; b.frequence = +((b.frequence || 0) + (a.frequence || 0)).toFixed(6);
    if (a.frequence_par_biome) { b.frequence_par_biome ??= {}; for (const k in a.frequence_par_biome) b.frequence_par_biome[k] = +((b.frequence_par_biome[k] || 0) + a.frequence_par_biome[k]).toFixed(6); } }
  const g = new Set(gardes); t.phenotypes = P.filter((p, i) => g.has(i));
}

function routeHiver(P, b, lieu, s = 0, routes = 0, H = REGLES.hivernage) {
  const L = P?.locomotion || [], m = P?.masse_kg || 1;
  if (!b || b.saisons === false || b.saisons === null || !P?.niche) return null;
  const vole = L.includes('vol'), marche = L.includes('marche') || L.includes('course'), nage = L.includes('nage');
  if (!(vole && m >= H.masse_volant) && !(marche && m >= H.masse_marcheur) && !(nage && m >= H.masse_marcheur)) return null;
  const hiver = x => ({ ...x, axes: axesSaison(x, 0) }), ici = convenance(P, hiver(b));
  if (ici >= H.rude * convenance(P, { ...b, axes: axesSaison(b, .5) })) return null;   // un hiver doux chez soi : on reste (le bœuf musqué ne quitte pas la toundra)
  let best = null;
  for (const vid of [...new Set(b.voisins || [])].sort()) { const v = lieu(vid); if (!v || lieuType(vid) === lieuType(b.id)) continue;   // (par parcelles : une parcelle d'un autre lieu)
    if (b.traversees?.includes(vid) && !(CLI && CLI.traverse(P))) continue;
    const la = convenance(P, hiver(v)); if (la < H.min || la < ici * (1 + H.marge)) continue;
    if (!best || la > best.la) best = { v, la }; }
  if (!best) return null;
  return { vers: best.v, ici, la: best.la, part: clamp((best.la - ici) / best.la * (.5 + .5 * s) + .3 * routes, H.part_min, H.part_max) };
}
// une fenêtre de l'année, en cycles : null hors d'elle ; sinon { long, rang, reste } (reste : les cycles qu'il y reste, celui-ci compris)
function fenetreDe(k, A, [a, b]) {
  const d0 = Math.ceil(a * A - 1e-9), d1 = Math.ceil(b * A - 1e-9), long = ((d1 - d0) % A + A) % A, rang = ((k - d0) % A + A) % A;
  return rang < long ? { long, rang, reste: long - rang } : null;
}
function convenance(plan, biome) {
  const loco = plan.locomotion || [], m = biome.milieu;
  const terre = loco.some(l => ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe'].includes(l));
  const vol = loco.includes('vol'), nage = loco.includes('nage');
  const ok = m === 'aquatique' ? nage && eauDouce(plan) : m === 'marin' ? nage && eauSalee(plan) : m === 'aerien' ? vol
    : m === 'souterrain' ? loco.includes('fouissage') || terre : m === 'amphibie' ? terre || vol || loco.includes('nage') : terre || vol;
  if (!ok || (plan.regime === 'filtreur' && m !== 'aquatique' && m !== 'marin' && m !== 'amphibie')) return 0;   // un filtreur filtre l'eau
  if (!plan.niche) return 1;
  const d = dist(plan.niche, biome.axes), tol = plan.tolerance || .35;
  return Math.exp(-(d * d) / (2 * tol * tol));
}
const biomasse = (plans, N) => N.reduce((s, n, i) => s + n * (plans[i].masse_kg || 1), 0);

// --- un cycle ---
// un monde peut porter ses propres règles (monde.regles : celles que sa genèse a choisies) ; elles valent le temps de son cycle
// (docs/20) et son propre catalogue (catalogue.monde) : ses axes, et pour la silhouette ses organes et ses formes de corps
// (dans un navigateur, un module se charge par sa balise <script>, AVANT orvane.js ; un monde qui a éveillé un mécanisme dont le
// module manque tournerait sans lui, sans rien dire : on le dit, une fois — docs/19)
const MODULES = [['mere', SYN, 'synthetique'], ['flore', FLO, 'flore'], ['pathogenes', PAT, 'pathogenes'], ['milieu', MIL, 'milieu'], ['ponte', PON, 'ponte'], ['stades', STA, 'stades'], ['invention', INV, 'invention'],
  ['natures', NAT, 'natures'], ['derives', DER, 'derives'], ['dietes', DI, 'dietes'], ['climat', CLI, 'climat'], ['meteo', MET, 'meteo'], ['phenologie', PHE, 'phenologie'], ['grammaire', GRA, 'grammaire'], ['castes', CAS, 'castes'], ['formes', FOR, 'formes'], ['esprit', ESP, 'esprit']], AVERTIS = new Set();
function cycle(inst, pressions = {}, opt = {}) {
  for (const [cle, M, f] of MODULES) if (inst?.monde?.[cle] && !M && !AVERTIS.has(cle)) { AVERTIS.add(cle); if (typeof console !== 'undefined') console.warn(`Orvane : ce monde a éveillé « ${cle} », mais moteur/${f}.js n'est pas chargé (avant orvane.js) : ce mécanisme est ignoré (docs/19).`); }
  const propres = inst?.monde?.regles, M = inst?.catalogue?.monde, avant = {}, ax = AX, ext = CORPS?.etendre ? CORPS.etendre(M) : null;
  // (une règle qui est un objet se complète d'un niveau : { separation: { chance: 1 } } garde les autres clés de la séparation ; sans
  // cela, une règle partielle effaçait ses voisines — un flux indéfini, une durée de maladie absente)
  if (propres && typeof propres === 'object') { for (const k in propres) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; avant[k] = REGLES[k];
    const v = propres[k], b = REGLES[k]; REGLES[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...v } : v; } }
  if (M?.axes) AX = [...AXES, ...Object.keys(M.axes).filter(k => !AXES.includes(k))];
  try { return cycleBrut(inst, pressions, opt); } finally { Object.assign(REGLES, avant); AX = ax; if (CORPS?.etendre) CORPS.etendre(ext); }
}
function cycleBrut(inst, pressions = {}, opt = {}) {
  const n = inst.cycle.n + 1, R = rng(inst.monde.graine, n);
  const MT = inst.catalogue?.monde?.traits || {}, MILT = (MIL && inst.monde?.milieu) || (PON && inst.monde?.ponte) || (STA && inst.monde?.stades) || (CAS && inst.monde?.castes) || (ESP && inst.monde?.esprit) ? { ...(MIL && inst.monde?.milieu ? MIL.TRAITS : {}), ...(PON && inst.monde?.ponte ? PON.TRAITS : {}), ...(STA && inst.monde?.stades ? STA.TRAITS : {}), ...(CAS && inst.monde?.castes ? CAS.TRAITS : {}), ...(ESP && inst.monde?.esprit ? ESP.TRAITS : {}) } : null, cat = { ...(inst.catalogue?.traits || {}), ...MT, ...(MILT || {}), ...CAT.TRAITS };   // (docs/25 : le mangeur d'œufs, dans un monde où l'on pond)   // (docs/22 : le bâtisseur, dans un monde au milieu éveillé)
  const RM = MILT ? rng(((inst.monde.graine >>> 0) ^ 0x3c6ef372) >>> 0, n) : null;   // (son tirage à lui : un monde au milieu éveillé garde ceux du reste)   // la biologie d'un trait connu est celle du moteur ; un trait propre au monde (docs/20) garde la sienne
  const biomes = Object.fromEntries(inst.biomes.map(b => [b.id, clone(b)]));
  const ev = [], tousT = clone(inst.taxons), plantes = FLO ? tousT.filter(t => t.plan?.regime === 'vegetal') : [];   // (docs/17 : les plantes vivent à part)
  const DT = !!(DI && inst.monde?.dietes); if (DT) for (const t of tousT) DI.completer(t);   // (docs/30) chaque lignée a son spectre
  const taxons = plantes.length ? tousT.filter(t => t.plan?.regime !== 'vegetal') : tousT;
  const prT = pressions.taxons || {}, prB = pressions.biomes || {};
  const saison = saisonDe(n, inst.monde.annee), phase = saison ? saison.phase : null;
  const GEN = REGLES.genetique !== false && opt.genetique !== false && Object.keys(QUANT).length > 0;
  const Rq = rng(((inst.monde.graine >>> 0) ^ 0x5bd1e995) >>> 0, n);   // la génétique a son propre tirage : l'écologie garde le sien
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Rq())) * Math.cos(2 * Math.PI * Rq());
  const SEX = REGLES.sexe?.actif !== false && opt.sexe !== false;

  // 1. l'habitat : les pertes et gains du cycle, puis un lent retour vers la capacité de base ; (docs/22) le milieu transformé par ses
  //    bêtes et ses joueurs : ses axes d'aujourd'hui, et la capacité que les fouisseurs lui donnent
  const SC = CLI && inst.monde?.climat ? CLI.preparer({ monde: inst.monde, biomes, n, taxons: plantes }) : null; if (SC) SC.avant();   // (docs/31) le climat, la mer, les volcans
  const SM = MIL && inst.monde?.milieu ? MIL.preparer({ biomes, taxons: tousT, prB, n, climat: SC }) : null; if (SM) ev.push(...SM.evenements);
  if (SC) { SC.appliquer(); ev.push(...SC.evenements); }
  const SN = NAT && inst.monde?.natures ? NAT.preparer(inst.monde, n) : null; if (SN) { for (const b of Object.values(biomes)) SN.changer(b); ev.push(...SN.evenements); }   // (docs/28) un lieu prend la nature dont ses axes sont le plus près
  // (docs/45) la météo : le temps qu'il fait dans chaque lieu ce cycle ; il déplace les axes et la production de la saison
  const SMe = MET && inst.monde?.meteo ? MET.preparer({ monde: inst.monde, biomes, n, axes: b => axesSaison(b, phase) }) : null; if (SMe) ev.push(...SMe.evenements);
  const axesCycle = SMe ? b => SMe.axes(b, axesSaison(b, phase)) : b => axesSaison(b, phase), prodCycle = SMe ? b => productionSaison(b, phase) * SMe.production(b) : b => productionSaison(b, phase);
  const SR = PON && inst.monde?.ponte ? PON.preparer({ taxons: tousT, biomes }) : null;   // (docs/25) les pondeurs, les mangeurs d'œufs, les nids pillés
  const SV = STA && inst.monde?.stades ? STA.preparer() : null;   // (docs/26) les cycles de vie
  const SCa = CAS && inst.monde?.castes ? CAS.preparer() : null;   // (docs/33) les colonies
  const ES = ESP && inst.monde?.esprit ? ESP.preparer({ taxons: inst.taxons, biomes }) : null;   // (docs/34) ce que savent les populations
  for (const b of Object.values(biomes)) {
    b.capacite_base ??= b.capacite;
    b.capacite = Math.max(0, b.capacite + (prB[b.id]?.habitat || 0) * (opt.unite_habitat ?? 1));
    b.capacite += (b.capacite_base * (SM ? SM.fertilite(b.id) : 1) - b.capacite) * REGLES.regain_habitat;
  }

  // 1b. les catastrophes : un incendie, une crue, une sécheresse peut frapper un biome ; sa capacité tombe (elle regagnera
  //     lentement sa valeur de base) et une part des bêtes qui ne peuvent s'y soustraire meurt sur le coup
  const sinistres = {};
  for (const b of Object.values(biomes)) {
    if (b.catastrophes === false) continue;
    const ax = axesCycle(b), cause = SMe ? SMe.causes(b) : null, C = REGLES.catastrophes, ete = phase != null ? Math.max(0, -Math.cos(2 * Math.PI * phase)) : .5, printemps = phase != null ? Math.max(0, Math.sin(2 * Math.PI * phase)) : .5;
    const chances = {
      incendie: C.incendie.chance * Math.max(0, ax.couvert - .3) * Math.max(0, 1 - ax.humidite) * 4 * (.5 + ete) * (cause ? cause.incendie : 1),
      crue: C.crue.chance * Math.max(0, ax.humidite - .5) * Math.max(0, 1 - ax.altitude) * 4 * (.5 + printemps) * (cause ? cause.crue : 1),
      secheresse: C.secheresse.chance * Math.max(0, .6 - ax.humidite) * 4 * ete * (cause ? cause.secheresse : 1)
    };
    for (const [type, p] of Object.entries(chances)) if (p > 0 && R() < p) {
      b.capacite = Math.max(0, b.capacite * (1 - C[type].capacite)); sinistres[b.id] = type;
      ev.push({ type: 'catastrophe', taxon: b.id, biome: b.id, detail: `${type} : ${C[type].detail}${cause ? ', ' + cause.dit[type] : ''} ; capacité −${Math.round(C[type].capacite * 100)} %` });
      break;
    }
  }

  // 2. l'état de départ : par taxon, les plans de chaque phénotype ; par biome, la biomasse qui pèse sur la capacité
  //    (les herbivores en entier, les omnivores et les charognards en partie, les carnivores pas du tout : eux vivent des proies)
  const etat = new Map(), B = {};
  for (const t of taxons) {
    if (t.eteint) continue;
    const plans = t.phenotypes.map(p => planDe(t.plan, p.traits, cat));
    const pops = {}, syn = t.plan.regime === 'synthetique';   // (une machine n'a ni allèles ni traits continus : docs/16)
    for (const pop of t.populations) {
      // (les fréquences publiées sont arrondies : rapportées à leur somme, elles redonnent tout l'effectif — sans cela, des milliers
      // de bêtes se perdaient chaque cycle dans les arrondis, sans mourir)
      const F = t.phenotypes.map(p => Math.max(0, +(p.frequence_par_biome?.[pop.biome] ?? p.frequence) || 0)), SF = F.reduce((a, x) => a + x, 0);
      const N = F.map(f => SF > 0 ? pop.effectif * f / SF : 0); if (SF <= 0 && N.length) N[0] = pop.effectif;
      pops[pop.biome] = { N, depuis: pop.depuis ?? t.apparu, avant: pop.effectif, predation: new Array(N.length).fill(0), ration: new Array(N.length).fill(0), satiete: null, maladie: pop.maladie ? { ...pop.maladie } : null, malade0: !!pop.maladie };
      if (SEX && !syn) pops[pop.biome].A = allelesDe(t.phenotypes, N, cat, pop.alleles);   // les fréquences d'allèles (un monde d'avant : déduites des phénotypes)
      Object.assign(pops[pop.biome], { flux0: pop.flux ?? 0, hyb0: pop.hybride?.part ?? 0, immig: 0, mef0: pop.mefiance ?? 0, hab0: pop.habituation ?? 0 }); if (pop.hivernants) pops[pop.biome].hiv = { ...pop.hivernants }; if (pop.savoirs?.routes) pops[pop.biome].routes = pop.savoirs.routes; if (pop.recouvrement != null) pops[pop.biome].rec0 = pop.recouvrement; if (pop.recouvrement_avant != null) pops[pop.biome].recAvant = pop.recouvrement_avant; if (pop.infection) pops[pop.biome].inf0 = pop.infection;
      if (GEN && !syn) { const P = pops[pop.biome], Q = P.Q = lireQ(pop.quant);   // ce que ses traits continus pèsent : risque d'être mangé, naissances, maladie
        P.fp = penteQ(Q, 'predation'); P.ff = penteQ(Q, 'fecondite') * chargeQ(Q, t.plan, biomes[pop.biome]); P.fm = penteQ(Q, 'maladie'); }
      const s0 = pop.satiete ?? 0;   // (la satiété du cycle précédent : un omnivore qui trouve des proies pèse moins sur la place)
      (B[pop.biome] ??= []).push({ masse: t.plan.masse_kg || 1, biomasse: N.reduce((s, n, i) => s + n * (plans[i].masse_kg || 1) * (plans[i].regime === 'omnivore' ? 1 - .3 * s0 : plans[i].regime === 'detritivore' && REGLES.cadavres > 0 ? 0 : PART_K[plans[i].regime] ?? 1), 0) });   // (un charognard qui vit des morts ne pèse pas sur les plantes)
    }
    etat.set(t.id, { plans, pops, couts: t.phenotypes.map(p => coutDe(p.traits, cat)),
      vuln: t.phenotypes.map(p => facteur(p.traits, cat, 'vulnerabilite')), chasse: t.phenotypes.map(p => facteur(p.traits, cat, 'chasse')),
      resist: t.phenotypes.map(p => facteur(p.traits, cat, 'resistance')) });
  }

  // 2c. la vie synthétique (docs/16) : rien, s'il n'y a ni Mère ni machine
  const SY = SYN ? SYN.preparer({ inst, n, biomes, taxons, etat, phase, axesSaison, charge, BANDE, PART_K, REGLES, ev, convenance }) : null;

  // 2d. la flore (docs/17) : la nourriture de chaque brouteur ; rien, s'il n'y a pas de plantes
  const GR = GRA && inst.monde?.grammaire ? GRA.preparer({ cat, taxons }) : null;   // (docs/32) une lueur dans le noir, une décharge dans l'eau : lieu par lieu
  const SF = FLO && plantes.length ? FLO.preparer({ plantes, etat, taxons, biomes, phase, monde: inst.monde, n, saisons: REGLES.saisons, productionSaison, PART_K, recouvrement, cat, dietes: DT }) : null;

  // 2e. les souches (docs/18) : rien, si le monde n'en a pas
  const SP = PAT && inst.monde?.pathogenes ? PAT.preparer({ inst, n, biomes, taxons, etat, ev, parente }) : null;

  // 2b. qui vit où, et ce que chacun porte au début du cycle (les croisements entre lignées lisent cet état-là : l'ordre des
  //     taxons ne change rien)
  const HYB = SEX && REGLES.hybride?.actif !== false && opt.hybride !== false, Tmap = new Map(taxons.map(t => [t.id, t])), presents = {}, isoCache = new Map();
  const isoDe = (a, b) => { const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id; if (!isoCache.has(k)) isoCache.set(k, isolement(a, b, Tmap, n)); return isoCache.get(k); };
  if (HYB) for (const t of taxons) { if (t.eteint || t.plan.regime === 'synthetique') continue; for (const [bid, P] of Object.entries(etat.get(t.id).pops)) { const Nt = P.N.reduce((a, x) => a + x, 0); if (Nt < 1) continue;
    (presents[bid] ??= []).push({ t, N: Nt, A0: P.A ? { ...P.A } : null, Q0: P.Q ? copieQ(P.Q) : null }); } }

  // 3. la chaîne alimentaire, biome par biome : chaque prédateur prélève des proies selon ce qui est à sa portée ;
  //    sa satiété décide de ses naissances et de sa faim ; la vulnérabilité de chaque phénotype de proie décide qui est mangé.
  //    L'appétence se calcule entre taxons (plan de base) ; les phénotypes se partagent ensuite au prorata de ce qu'ils pèsent.
  for (const bid of Object.keys(biomes)) {
    const T = [];   // un taxon présent : ses phénotypes, leur poids de proie (N × masse × vulnérabilité), son appétit
    for (const t of taxons) { if (t.eteint || t.plan.regime === 'synthetique') continue; const E = etat.get(t.id), pop = E.pops[bid]; if (!pop) continue;   // (une machine ne se mange pas)
      const Nt = pop.N.reduce((a, x) => a + x, 0); if (Nt <= 0) continue;
      const poids = pop.N.map((N, i) => N * (E.plans[i].masse_kg || 1) * E.vuln[i] * (pop.fp ?? 1) * (GR ? GR.vuln(t, biomes[bid], i) : 1) * (SCa ? SCa.vuln(t, i) : 1) * (ES ? ES.vuln(t, bid, i) : 1));
      T.push({ t, E, pop, Nt, poids, Bv: poids.reduce((a, x) => a + x, 0), regime: t.plan.regime }); }
    const preds = T.filter(q => q.regime === 'carnivore' || q.regime === 'omnivore');
    for (const p of preds) {
      let A = 0; const x = new Array(T.length).fill(0);   // (docs/30 : un spectre choisit entre insectes, viande et sang)
      T.forEach((q, k) => { if (q === p) return; const f = DT ? DI.appetence(p.t.plan, q.t.plan, appetence(p.t.plan, q.t.plan)) : appetence(p.t.plan, q.t.plan); if (!f) return; x[k] = q.Bv * f * (ES ? ES.acces(p.t, bid) : 1) * (GR ? GR.acces(p.t, biomes[bid]) : 1); A += x[k]; });
      const puiss = x.map(v => v > 0 ? Math.pow(v, REGLES.report_proies) : 0), z = puiss.reduce((a, v) => a + v, 0);
      p.part = puiss.map(v => z ? v / z : 0); p.x = x; p.A = A;                       // la part de chaque proie dans ce que ce prédateur prélève
      p.eff = p.E.chasse.map((c, i) => c * (.7 + .6 * (p.E.plans[i].perception ?? .5)) * (p.regime === 'omnivore' ? REGLES.chasse_omnivore : 1) * (GR ? GR.chasse(p.t, biomes[bid], i) : 1) * (ES ? ES.chasse(p.t, bid, i) : 1));
      // (un omnivore ne cherche en viande qu'une part de ce qu'il mange : il ne dispute aux carnivores que cette part)
      p.besoin = p.E.plans.map(pl => REGLES.besoin * Math.pow(pl.masse_kg || 1, .75) * (p.regime === 'omnivore' ? (REGLES.viande_omnivore ?? 1) * (DT ? DI.viande(pl) : 1) : 1));
      p.effMoy = p.pop.N.reduce((a, N, i) => a + N * p.eff[i], 0) / p.Nt; p.besoinMoy = p.pop.N.reduce((a, N, i) => a + N * p.besoin[i], 0) / p.Nt;
    }
    // les prédateurs se partagent les proies : chacun compte, en concurrents, ceux qui mangent les mêmes, au prorata de leur besoin
    // (docs/30 : boire le sang d'une bête ne dispute pas sa chair aux chasseurs)
    for (const p of preds) {
      let C = 0;
      if (p.A > 0) for (const q of preds) { if (q === p || q.A <= 0) continue; let commun = 0; p.part.forEach((v, k) => { if (v && q.x[k] && (!DT || DI.mortel(p.t.plan, T[k].t.plan) === DI.mortel(q.t.plan, T[k].t.plan))) commun += v; }); C += q.Nt * (p.besoinMoy > 0 ? q.besoinMoy / p.besoinMoy : 0) * q.effMoy * commun; }
      let R = 0, sN = 0;   // (une bête qui ne chasse pas, ou ne mange pas de viande : rien, jamais 0/0)
      p.pop.N.forEach((N, i) => { if (N <= 0) return; const den = p.Nt * p.effMoy + C, a = den > 0 ? p.A * p.eff[i] / den : 0, s = a > 0 ? a / (a + REGLES.demi_satiete * p.besoin[i]) : 0; const r = N * p.besoin[i] * s; R += r; sN += s * N; p.pop.ration[i] = r; });
      p.pop.satiete = sN / p.Nt;
      T.forEach((q, k) => { if (!p.part[k]) return; const Rq = R * p.part[k] * (DT ? DI.mortel(p.t.plan, q.t.plan) : 1); q.pop.N.forEach((N, i) => { if (q.poids[i]) q.pop.predation[i] += Rq * (q.poids[i] / q.Bv) / (q.E.plans[i].masse_kg || 1); }); });   // (docs/30 : une piqûre ne tue pas)
    }
    // (équilibrage du 6 novembre) les charognards vivent des morts du lieu : ce que la mort naturelle y laisse ce cycle (les bêtes, pas
    // les plantes ; × REGLES.cadavres), partagé selon le besoin de chacun. C'est un flux, pas un stock de proies : un charognard est
    // rassasié à moitié quand sa part égale son besoin (un prédateur, quand il a trente fois son besoin sur pied). Sans la règle, ils
    // broutent comme avant
    if (REGLES.cadavres > 0) { const D = T.filter(q => q.regime === 'detritivore');
      if (D.length) { let offre = 0; for (const q of T) if (q.regime !== 'detritivore' && q.regime !== 'vegetal') q.pop.N.forEach((N, i) => { offre += N * (q.E.plans[i].masse_kg || 1) * mortalite(q.E.plans[i]); });
        offre *= REGLES.cadavres; const besoinDe = pl => REGLES.besoin * Math.pow(pl.masse_kg || 1, .75);
        const demande = D.reduce((a, q) => a + q.pop.N.reduce((x, N, i) => x + N * besoinDe(q.E.plans[i]), 0), 0);
        for (const q of D) { let sN = 0; q.pop.N.forEach((N, i) => { if (N <= 0) return; const be = besoinDe(q.E.plans[i]), a = demande > 0 ? offre * be / demande : 0, sa = a / (a + be); q.pop.ration[i] = N * be * sa; sN += sa * N; });
          q.pop.satiete = q.Nt ? sN / q.Nt : 0; } } }
    if (SY) SY.reguler(bid, T, B[bid] || [], biomes[bid].capacite * prodCycle(biomes[bid]));   // les machines régulent (docs/16)
    for (const q of T) q.pop.N.forEach((N, i) => { q.pop.predation[i] = Math.min(q.pop.predation[i], N * REGLES.predation_max); });   // nul ne mange plus qu'une part d'une population en un cycle
  }

  // 4. la dynamique, taxon par taxon
  const migrations = [];      // { taxon, vers, N[] } à appliquer après la boucle
  // (docs/38) l'hivernage : seulement si le monde le veut (REGLES.hivernage.actif) et s'il a une année
  const HIV = REGLES.hivernage?.actif > 0 && phase != null ? { A: inst.monde.annee, k: n % inst.monde.annee } : null, hivEv = {};
  if (HIV) { const F = REGLES.hivernage.fenetres; HIV.depart = fenetreDe(HIV.k, HIV.A, F.depart); HIV.retour = fenetreDe(HIV.k, HIV.A, F.retour);
    HIV.loin = HIV.depart || HIV.retour || fenetreDe(HIV.k, HIV.A, F.partie); }   // (hors de ces trois fenêtres, un hivernant attardé rentre)
  for (const t of taxons) {
    if (t.eteint) continue;
    const E = etat.get(t.id), K = t.phenotypes.length;
    for (const [bid, pop] of Object.entries(E.pops)) {
      const b = biomes[bid]; if (!b) { delete E.pops[bid]; continue; }
      const bS = phase == null && !SMe ? b : { ...b, axes: axesCycle(b) };                    // le biome tel qu'il est en cette saison
      const conv = convenance(t.plan, bS), Keff = b.capacite * prodCycle(b) * (SF ? SF.ratio(t, bid) : 1);   // (docs/17 : ce qui reste à brouter)
      const syn = SY && t.plan.regime === 'synthetique';                                        // (une machine : sa presse est celle de l'énergie, docs/16)
      const sat = syn ? SY.sat(bid) : Keff > 0 ? charge(B[bid], t.plan.masse_kg || 1) / (Keff * BANDE) * (SF ? SF.concurrence(t, bid) : 1) : 9;   // (docs/17 : pesée par ce qu'on mange en commun)
      pop.satC = sat;
      const pr = prT[t.id]?.[bid] || {}, ret = pr.retrait || {};
      const tot = pop.N.reduce((a, x) => a + x, 0) || 1;
      // la maladie : une épidémie en cours tue selon la virulence et la résistance de chaque phénotype ; sinon, le surpeuplement
      // (et une épidémie chez les voisins) peut en faire éclore une
      let mal = pop.maladie;
      if (mal) { if (--mal.reste <= 0) { ev.push({ type: 'remission', taxon: t.id, biome: bid, detail: 'l\'épidémie s\'éteint' }); mal = pop.maladie = null; } }
      else if (tot >= 20 && !syn) {   // (un monde à souches : les épidémies sont les leurs, docs/18 — mais les tirages se font quand même, ce qui
        // garde le hasard du reste du monde le jour où l'on éveille les souches ; les voisins comptent tels qu'ils étaient au début du cycle)
        const M = REGLES.maladie, voisinsMalades = (b.voisins || []).some(v => E.pops[v]?.malade0);
        if (R() < M.chance * Math.max(0, sat - .5) * 2 + (voisinsMalades ? M.contagion * M.chance * 10 : 0)) {
          const reste = Math.round(M.duree[0] + R() * (M.duree[1] - M.duree[0])), virulence = +(M.virulence[0] + R() * (M.virulence[1] - M.virulence[0])).toFixed(3);
          if (!SP) { mal = pop.maladie = { reste, virulence }; ev.push({ type: 'epidemie', taxon: t.id, biome: bid, detail: `virulence ${Math.round(mal.virulence * 100)} % par cycle, ${mal.reste} cycles` }); }
        }
      }
      const nais = new Array(K).fill(0), morts = new Array(K).fill(0), dispo = new Array(K).fill(0), suiv = new Array(K).fill(0);
      let faim = 0, mortsNat = 0, mortsExt = 0, mortsMal = 0;
      for (let i = 0; i < K; i++) {
        const Np = pop.N[i]; if (Np <= 0) continue;
        const reg = E.plans[i].regime, s = pop.satiete ?? 0;
        if (syn) { const d = SY.vie(t, bid, pop, E.plans[i], Np, sinistres[bid], conv); nais[i] = d.nais; morts[i] = d.morts; mortsNat += d.morts; continue; }
        // (un phénotype dont la tolérance diffère de celle de la lignée — la graisse brune, docs/32 — a sa propre convenance ; les autres gardent celle de la lignée)
        const convI = E.plans[i].tolerance != null && E.plans[i].tolerance !== t.plan.tolerance ? convenance(E.plans[i], bS) : conv;
        const r = croissance(E.plans[i]) * (1 - E.couts[i]) * convI * (pop.ff ?? 1); let m = mortalite(E.plans[i]) + (convI < .3 ? .08 : 0);
        const place = Math.max(0, 1 - sat * (SF ? SF.facteur(t, bid, i) : 1) * (SV ? SV.facteur(t, bid, i) : 1) * (SCa ? SCa.facteur(t, bid, i) : 1) * (ES ? ES.place(t, bid, i) : 1));   // (docs/26 : larve et adulte ne se disputent pas tout)   // (docs/17 : qui supporte les défenses des plantes y trouve plus)
        // ce qui nourrit les naissances : la place pour l'herbivore ; la viande mangée pour le carnivore, convertie en petits à
        // REGLES.conversion (l'énergie vient des plantes : un prédateur ne vit pas de prédateurs qui vivent de lui) ; les deux pour l'omnivore
        const viande = REGLES.conversion * pop.ration[i] / (E.plans[i].masse_kg || 1);
        if (reg === 'carnivore') { nais[i] = Math.min(Np * r * s, viande); m *= 1 + (REGLES.faim_carnivore ?? 3) * (1 - s) * (1 - s); faim = Math.max(faim, 1 - s); }   // un carnivore affamé meurt plus
        else if (reg === 'omnivore') nais[i] = Np * r * place * (1 - .3 * s) * (t.plan.regime === 'carnivore' ? REGLES.omnivore_vegetal ?? 1 : REGLES.omnivore_vegetal_base ?? 1) * (DT ? DI.vegetal(E.plans[i]) : 1) + Math.min(Np * r * .3 * s * (DT ? DI.viande(E.plans[i]) : 1), viande);
        else if (reg === 'detritivore' && REGLES.cadavres > 0) { nais[i] = Np * r * s; m *= 1 + (REGLES.faim_carnivore ?? 3) * (1 - s) * (1 - s); faim = Math.max(faim, 1 - s); }   // (les morts du lieu sont sa place : il naît d'autant plus qu'il est rassasié ; affamé, il meurt plus et s'en va)
        else nais[i] = Np * r * place * (reg === 'detritivore' ? REGLES.detritivore_vegetal ?? 1 : 1);
        morts[i] = Np * m; mortsNat += morts[i];
        if (SR) nais[i] *= SR.naissances(t, bid, i);   // (docs/25) pondre ou mettre bas
        if (mal) { const mm = Np * mal.virulence * E.resist[i] * (pop.fm ?? 1) * (.5 + Math.min(1.5, sat)); morts[i] += mm; mortsMal += mm; }   // la maladie frappe les faibles et les entassés
        if (SP) { const mp = SP.mortalite(t, bid); if (mp > 0) { const mm = Np * mp * E.resist[i] * (pop.fm ?? 1); morts[i] += mm; mortsMal += mm; } }   // les souches (docs/18)
        if (sinistres[bid]) { const loco = E.plans[i].locomotion || [], type = sinistres[bid];                                      // la catastrophe épargne qui peut s'y soustraire
          const echappe = type === 'incendie' ? loco.includes('vol') || loco.includes('fouissage') : type === 'crue' ? loco.includes('vol') || loco.includes('nage') : loco.includes('vol');
          if (!echappe) { const mc = Np * REGLES.catastrophes[type].mortalite; morts[i] += mc; mortsNat += mc; } }
      }
      // les petits : clonaux (chacun du phénotype de son parent), ou mendéliens — la mère pèse par sa fécondité, le père
      // aussi par son attrait ; leurs phénotypes suivent les allèles, pas ceux de leurs parents
      // les croisements avec une lignée apparentée du même biome : une part h des mères a un père de l'autre lignée ; une part
      // I (l'isolement) de ces petits hybrides ne vit pas ; les autres apportent la moitié des gènes de l'autre lignée
      let hyb = null;
      if (HYB && presents[bid] && !syn) { const H = REGLES.hybride; let perte = 0, part = 0, best = null;
        for (const o of presents[bid]) { if (o.t === t) continue; const I = isoDe(t, o.t); if (I >= .995) continue;
          const h = H.rencontre * (1 - I) * o.N / (tot + o.N); if (h < 1e-5) continue;
          perte += h * I; part += h * (1 - I); const c = { o, I, h: h * (1 - I) }; (hyb ??= []).push(c); if (!best || c.h > best.h) best = c; }
        if (hyb) { perte = Math.min(.9, perte); for (let i = 0; i < K; i++) nais[i] *= 1 - perte; pop.hyb = { avec: best.o.t.id, part, isolement: best.I }; } }
      let nb = nais, pm = null, pf = null;
      const Btot = nais.reduce((a, x) => a + x, 0);
      if (SEX && pop.A && Btot > 0) {
        const wm = nais, wf = nais.map((x, i) => x * attraitDe(t.phenotypes[i].traits, cat)); pm = {}; pf = {};
        for (const id in pop.A) { const dom = domDe(cat, id); pm[id] = alleleParmi(pop.A[id], dom, tauxDe(id, t.phenotypes, wm, pop.N)); pf[id] = alleleParmi(pop.A[id], dom, tauxDe(id, t.phenotypes, wf, pop.N)); }
        const idx = E.idx ??= new Map(t.phenotypes.map((p, i) => [cleDe(p.traits), i])); nb = new Array(K).fill(0);
        for (const [cle, part] of portees(pm, pf, cat, clamp(.02 / Btot, 1e-6, .01))) { const n = Btot * part, i = idx.get(cle);   // (sous un cinquantième de petit, une combinaison ne compte pas)
          if (i !== undefined) { nb[i] += n; continue; }
          let fb = (E.proche ??= new Map()).get(cle); if (fb === undefined) E.proche.set(cle, fb = plusProche(cle, t.phenotypes)); nb[fb] += n;                                       // une combinaison qui n'existe pas encore : chez le plus proche,
          if (n >= .05) { const M = (E.manque ??= {})[cle] ??= { n: 0, parts: [] }; M.n += n; M.parts.push([bid, fb, n]); } }   // et notée pour la faire naître
      }
      for (let i = 0; i < K; i++) dispo[i] = Math.max(0, pop.N[i] + nb[i] - morts[i] - pop.predation[i]);
      // les retraits (ou apports) extérieurs ; la demande qu'un phénotype épuisé ne peut servir se reporte sur les autres
      const ext = new Array(K).fill(0); let reste = 0;
      for (let i = 0; i < K; i++) { const d = ((ret[t.phenotypes[i].id] || 0) + (ret['*'] || 0) * pop.N[i] / tot) * (syn ? SY.reparation(t) : 1); ext[i] = clamp(d, -pop.N[i], dispo[i]); if (d > dispo[i]) reste += d - dispo[i]; }
      if (reste > 0) { const marge = dispo.map((x, i) => Math.max(0, x - ext[i])), tm = marge.reduce((a, x) => a + x, 0); if (tm > 0) for (let i = 0; i < K; i++) ext[i] += Math.min(marge[i], reste * marge[i] / tm); }
      for (let i = 0; i < K; i++) { mortsExt += Math.max(0, ext[i]); suiv[i] = Math.max(0, dispo[i] - ext[i]); }
      // les allèles après le cycle : les adultes survivants gardent les leurs (Hardy-Weinberg à p), les petits survivants
      // ceux de leurs parents ; puis la mutation (gain, perte) et la dérive, d'autant plus forte que la population est petite
      if (SEX && pop.A) {
        const tot2 = suiv.reduce((a, x) => a + x, 0), S = REGLES.sexe, Nad = pop.N.reduce((a, x) => a + x, 0);
        if (tot2 > 0) { const phi = clamp(Btot / tot2, 0, 1), Ne = Math.max(2, tot2);
          const k = suiv.map((x, i) => { const v = pop.N[i] + nb[i]; return v > 0 ? x / v : 0; }), adS = pop.N.map((x, i) => x * k[i]), nbS = nb.map((x, i) => x * k[i]);
          for (const id of Object.keys(pop.A)) { const dom = domDe(cat, id), p = pop.A[id], Mo = mendel(p, p, dom), Mn = pm ? mendel(pm[id], pf[id], dom) : Mo;
            const [na, da] = ponderer(Mo, ...tauxDe(id, t.phenotypes, adS, pop.N)), [nn, dn] = ponderer(Mn, ...tauxDe(id, t.phenotypes, nbS, nb));
            const den = Nad * da + Btot * dn; let q = den > 0 ? (Nad * na + Btot * nn) / den : p;
            q += phi * (S.gain * (1 - q) - S.perte * q); if (phi > 0 && S.derive !== false) q += Math.sqrt(phi * q * (1 - q) / (2 * Ne)) * gauss();
            q = clamp(q, 0, 1); if (q < 1e-6) delete pop.A[id]; else pop.A[id] = q; } }
      }
      // l'introgression : les petits hybrides survivants portent la moitié des gènes de l'autre lignée
      if (hyb) { const tot3 = suiv.reduce((a, x) => a + x, 0), phi = tot3 > 0 ? clamp(nais.reduce((a, x) => a + x, 0) / tot3, 0, 1) : 0;
        for (const c of hyb) { const w = phi * c.h / 2; if (!(w > 0)) continue;
          if (pop.A && c.o.A0) for (const id of new Set([...Object.keys(pop.A), ...Object.keys(c.o.A0)])) { const q = (pop.A[id] || 0) + w * ((c.o.A0[id] || 0) - (pop.A[id] || 0)); if (q >= 1e-6) pop.A[id] = clamp(q, 0, 1); else delete pop.A[id]; }
          if (pop.Q && c.o.Q0) for (const [k, d] of Object.entries(QUANT)) { const x = pop.Q[k], y = c.o.Q0[k]; if (!x || !y) continue; const z = y.m + surEchelle(d, t.plan, c.o.t.plan), dz = z - x.m;
            x.m += w * dz; x.G = clamp(x.G + w * (1 - w) * dz * dz, 1e-4, 4); } } }
      pop.mortsNat = mortsNat; pop.mortsExt = mortsExt; pop.mortsPred = pop.predation.reduce((a, x) => a + x, 0); pop.mortsMal = mortsMal;
      if (GEN && pop.Q) evoluerQ(pop.Q, { N: pop.N.reduce((a, x) => a + x, 0), Dmorts: morts.reduce((a, x) => a + x, 0), Dmal: mortsMal, Dpred: pop.mortsPred,
        Dext: mortsExt, qExt: pr.q, B: nais.reduce((a, x) => a + x, 0), plan: t.plan, b, gauss, sexe: SEX });
      if (opt.trace) opt.trace({ taxon: t.id, biome: bid, N: tot, sat, conv, satiete: pop.satiete, nais: nais.reduce((a, x) => a + x, 0), mortsNat, mortsPred: pop.mortsPred, mortsExt, mortsMal, saison: saison?.nom });
      // essaimer vers les voisins où l'on peut vivre, chacun à proportion de ce qu'il convient : un flux continu, pas une
      // vague vers un voisin tiré au sort (qui faisait d'une petite population voisine une suite d'explosions et d'effondrements)
      const essaimer = (part, filtre) => { const cibles = (b.voisins || []).filter(v => biomes[v] && (!filtre || filtre(biomes[v])) && (!b.traversees?.includes(v) || CLI.traverse(t.plan))).map(v => [v, convenance(t.plan, biomes[v])]).filter(([, c]) => c > 0), W = cibles.reduce((a, [, c]) => a + c, 0);
        if (!(W > 0) || !(part > 0)) return;
        for (const [vers, c] of cibles) { const f = part * c / W; migrations.push({ taxon: t.id, vers, N: suiv.map(x => x * f), Q: pop.Q && copieQ(pop.Q), A: pop.A && { ...pop.A } }); }
        for (let i = 0; i < K; i++) suiv[i] *= 1 - part; };
      // la faim pousse un prédateur vers ses voisins
      if (faim > 1 - REGLES.faim_migration) essaimer(.05 * (faim - (1 - REGLES.faim_migration)) / REGLES.faim_migration);
      // (docs/31) par-delà la mer : qui vole, nage ou dérive gagne peu à peu les terres qu'on ne rejoint qu'en la traversant
      if (b.traversees?.length && CLI && CLI.traverse(t.plan)) { const Ns = suiv.reduce((a, x) => a + x, 0), f = CLI.REGLES.iles.derive * Ns;   // (un flux, ou de temps en temps un petit groupe de deux : de quoi fonder)
        if (Ns >= 4 && (f >= 2 || CLI.hasard(t.id + '|' + bid, n) < f / 2)) essaimer(Math.min(.5, Math.max(f, 2) / Ns), x => b.traversees.includes(x.id)); }
      // mutation : un peu de chaque naissance va vers un autre phénotype du taxon
      if (K > 1 && !SEX) for (let i = 0; i < K; i++) { const q = Math.min(nais[i] * REGLES.mutation, Math.max(0, suiv[i])); if (q > 0) { const j = (i + 1 + Math.floor(R() * (K - 1))) % K; suiv[i] -= q; suiv[j] += q; } }
      // déplacements imposés (le joueur emporte des bêtes ailleurs)
      for (const d of pr.deplacement || []) if (biomes[d.vers] && d.n > 0) {
        const part = Math.min(1, d.n / Math.max(1, suiv.reduce((a, x) => a + x, 0)));
        migrations.push({ taxon: t.id, vers: d.vers, N: suiv.map(x => x * part), Q: pop.Q && copieQ(pop.Q), A: pop.A && { ...pop.A } }); for (let i = 0; i < K; i++) suiv[i] *= 1 - part;
      }
      // (docs/36) des bêtes nées en élevage et relâchées : elles arrivent avec leurs gènes, comme des migrants
      const AP = pr.apport; if (AP && AP.n > 0) { const Na = new Array(K).fill(0);
        for (const [ph, x] of Object.entries(AP.N || { base: AP.n })) { let i = t.phenotypes.findIndex(p => p.id === ph); if (i < 0) i = plusProche(ph === 'base' ? '' : ph, t.phenotypes); Na[i] += Math.max(0, x); }
        migrations.push({ taxon: t.id, vers: bid, N: Na, Q: pop.Q && Object.fromEntries(Object.entries(pop.Q).map(([k, x]) => [k, { m: Number.isFinite(AP.a?.[k]) ? AP.a[k] : x.m, G: x.G }])),
          A: pop.A && { ...Object.fromEntries(Object.keys(pop.A).map(id => [id, 0])), ...(AP.alleles || {}) } }); }
      // migration naturelle : sans place, on essaime (un carnivore, lui, part quand il a faim : plus haut)
      if (t.plan.regime !== 'carnivore' && sat > REGLES.seuil_surpeuple) essaimer(REGLES.migration * clamp((sat - REGLES.seuil_surpeuple) / (1 - REGLES.seuil_surpeuple), 0, 2));
      // (docs/15) dans un monde à parcelles : une petite part s'en va toujours vers les parcelles voisines du même biome (c'est
      // ainsi qu'une espèce gagne de proche en proche), et une parcelle qui a perdu sa place chasse ses bêtes vers ses voisines
      if (REGLES.dispersion > 0 && b.type) essaimer(REGLES.dispersion, v => v.type === b.type);
      if (REGLES.fuite > 0 && sat > 1) essaimer(Math.min(.5, REGLES.fuite * (1 - 1 / sat)));
      if (syn) essaimer(SY.exploration);                                                         // les machines explorent (docs/16)
      // (docs/38) l'hivernage : à la fin de l'automne, une part s'en va, cycle après cycle, vers le voisin le plus doux en hiver ;
      // au printemps, les hivernants (la part de la population venue d'ailleurs, avec les petits qu'ils y ont eus) rentrent chez eux
      if (HIV && !syn && t.plan.regime !== 'vegetal') {
        const somme = () => suiv.reduce((a, x) => a + x, 0), noter = (sens, chez, autre, x) => ((hivEv[t.id] ??= {})[sens] ??= []).push([chez, autre, x]);
        const emporte = (vers, f, hiv) => { migrations.push({ taxon: t.id, vers, N: suiv.map(x => x * f), Q: pop.Q && copieQ(pop.Q), A: pop.A && { ...pop.A }, saison: true, ...(hiv ? { hiv } : {}) });
          for (let i = 0; i < K; i++) suiv[i] *= 1 - f; pop.saisonnier = true; };
        if (pop.hiv) for (const de of Object.keys(pop.hiv).sort()) { const h = pop.hiv[de], Ns = somme();   // ceux qui rentrent
          if (!biomes[de] || !(Ns > 0)) { delete pop.hiv[de]; continue; }   // (leur pays n'est plus : ils restent)
          const f = HIV.retour ? h / HIV.retour.reste : HIV.loin ? 0 : h; if (!(f > 0)) continue;
          if (HIV.retour?.rang === 0) noter('retour', de, bid, h * Ns);
          emporte(de, f);
          if (f >= 1 - 1e-9) { pop.hiv = {}; break; }
          for (const k of Object.keys(pop.hiv)) pop.hiv[k] = k === de ? (h - f) / (1 - f) : pop.hiv[k] / (1 - f);
          if (!(pop.hiv[de] > 1e-6)) delete pop.hiv[de]; }
        if (HIV.depart && somme() >= 2) {                                                                  // ceux qui partent
          const greg = t.phenotypes.reduce((a, ph) => a + (ph.traits.includes('gregarisme') ? ph.frequence || 0 : 0), 0);
          const soc = clamp((t.plan.sociabilite ?? 0) + .08 * (pop.Q?.sociabilite?.m || 0), 0, 1) * (1 + .6 * greg);   // (celle de collectif.sociabiliteDe)
          const r = routeHiver(t.plan, b, id => biomes[id], soc, pop.routes || 0);
          if (r) { const q = Math.min(1, r.part * REGLES.hivernage.actif), f = 1 - Math.pow(1 - q, 1 / HIV.depart.long);   // (au bout de la fenêtre, q est parti)
            if (HIV.depart.rang === 0) noter('depart', bid, r.vers.id, q * somme());
            emporte(r.vers.id, f, bid); } }
      }
      pop.N = suiv;
    }
    // les combinaisons nées cette fois sans phénotype qui les porte (deux parents de phénotypes différents) : au-delà d'un
    // demi-individu, elles deviennent un phénotype ; leurs petits quittent le plus proche pour le rejoindre
    const connues = E.manque ? new Set(t.phenotypes.map(p => cleDe(p.traits))) : null;
    for (const [cle, M] of Object.entries(E.manque || {})) { if (M.n < .5) continue;
      const traits = cle ? cle.split('+') : []; if (connues.has(cle)) continue; connues.add(cle);
      t.phenotypes.push({ id: cle || 'base', frequence: 0, traits }); E.plans.push(planDe(t.plan, traits, cat)); E.couts.push(coutDe(traits, cat)); E.resist.push(facteur(traits, cat, 'resistance'));
      const j = t.phenotypes.length - 1; for (const p of Object.values(E.pops)) p.N.push(0);
      for (const [bid, fb, n] of M.parts) { const P = E.pops[bid]; if (!P) continue; const m = Math.min(n, P.N[fb]); P.N[fb] -= m; P.N[j] += m; } }
    delete E.manque; delete E.idx; delete E.proche;
    // un nouveau trait, parfois : sur le phénotype le plus nombreux du biome le plus peuplé
    if (t.plan.regime !== 'synthetique' && R() < REGLES.nouveau_trait) {
      const [bid, pop] = Object.entries(E.pops).sort((a, b) => b[1].N.reduce((x, y) => x + y, 0) - a[1].N.reduce((x, y) => x + y, 0))[0] || [];
      if (pop) {
        const i = pop.N.indexOf(Math.max(...pop.N)), base = t.phenotypes[i].traits;
        const cands = [...Object.keys(CAT.TRAITS), ...Object.keys(MT).filter(id => !CAT.TRAITS[id])].filter(id => CAT.admissible(id, base, cat));   // (docs/20) ceux du monde aussi
        const candM = MILT ? Object.keys(MILT).filter(id => !CAT.TRAITS[id] && !MT[id] && CAT.admissible(id, base, cat)) : [];
        if (cands.length) {
          let id = cands[Math.floor(R() * cands.length)]; if (candM.length && RM() < candM.length / (cands.length + candM.length)) id = candM[Math.floor(RM() * candM.length)];
          const traits = [...base, id].sort(), pid = traits.join('+');
          if (!t.phenotypes.some(p => p.id === pid)) {
            t.phenotypes.push({ id: pid, frequence: 0, traits });
            E.plans.push(planDe(t.plan, traits, cat)); E.couts.push(coutDe(traits, cat));
            for (const p of Object.values(E.pops)) p.N.push(0);
            const q = Math.max(1, .002 * pop.N.reduce((a, x) => a + x, 0)); pop.N[i] -= Math.min(q, pop.N[i]); pop.N[pop.N.length - 1] += q;
            if (SEX && pop.A) { const nv = REGLES.sexe.nouveau; pop.A[id] = Math.max(pop.A[id] || 0, domDe(cat, id) ? nv.dominant : nv.recessif); }   // l'allèle neuf
            ev.push({ type: 'nouveau_trait', taxon: t.id, biome: bid, detail: `${id} apparaît chez « ${t.phenotypes[i].id} »` });
          }
        }
      }
    }
  }
  for (const tid of Object.keys(hivEv)) for (const [sens, L] of Object.entries(hivEv[tid])) {   // (docs/38)
    const tot = L.reduce((a, x) => a + x[2], 0); if (tot < 20) continue; const [chez, autre] = L.slice().sort((a, b) => b[2] - a[2])[0], nom = id => biomes[id]?.nom || id;
    ev.push({ type: 'migration', taxon: tid, biome: chez, detail: sens === 'depart' ? `la migration d'automne commence : ≈ ${Math.round(tot)} bêtes partent hiverner vers ${nom(autre)}` : `la migration de printemps commence : ≈ ${Math.round(tot)} hivernants rentrent de ${nom(autre)}` }); }
  // 5. les arrivées
  for (const mg of migrations) {
    const E = etat.get(mg.taxon), t = taxons.find(x => x.id === mg.taxon);
    if (!E.pops[mg.vers]) E.pops[mg.vers] = { N: new Array(t.phenotypes.length).fill(0), depuis: n, avant: 0, maladie: null, flux0: 1, immig: 0 };
    const D = E.pops[mg.vers]; D.immig = (D.immig || 0) + mg.N.reduce((a, x) => a + x, 0);   // le flux de gènes reçu
    if (D.hiv || mg.hiv) { const na = D.N.reduce((a, x) => a + x, 0), nb = mg.N.reduce((a, x) => a + x, 0), tot = na + nb;   // (docs/38) la part d'hivernants
      if (tot > 0) { const H = {}; for (const k in D.hiv || {}) H[k] = D.hiv[k] * na / tot; if (mg.hiv) H[mg.hiv] = (H[mg.hiv] || 0) + nb / tot; D.hiv = H; } }
    if (mg.saison) D.saisonnier = true;
    if (GEN && mg.Q) { const na = D.N.reduce((a, x) => a + x, 0), nb = mg.N.reduce((a, x) => a + x, 0); D.Q = D.Q && na > 0 ? melangerQ(D.Q, na, mg.Q, nb) : copieQ(mg.Q); }   // les migrants apportent leurs gènes
    if (SEX && mg.A) { const na = D.N.reduce((a, x) => a + x, 0), nb = mg.N.reduce((a, x) => a + x, 0), n = na + nb;
      if (!D.A || na <= 0) D.A = { ...mg.A }; else if (n > 0) { const o = {}; for (const id of new Set([...Object.keys(D.A), ...Object.keys(mg.A)])) o[id] = ((D.A[id] || 0) * na + (mg.A[id] || 0) * nb) / n; D.A = o; } }
    mg.N.forEach((x, i) => { D.N[i] += x; });
  }

  if (SP) SP.apres();   // la contagion, la guérison, les souches qui naissent et s'éteignent (docs/18)
  if (SF) SF.apres();   // la pousse des plantes, sous la dent des brouteurs (docs/17)
  if (SY) SY.apres();   // la ferraille, le minerai, la Mère, les erreurs de copie, les transferts (docs/16)

  // 6. séparation de lignées, extinctions, écriture des taxons
  const nouveaux = []; let vivantsN = taxons.filter(t => !t.eteint).length, formesVues = null;
  for (const t of taxons) {
    if (t.eteint || vivantsN + nouveaux.length >= REGLES.max_taxons) continue;
    const E = etat.get(t.id), effP = new Map();   // (vitesse : l'effectif de chaque population, compté une fois et non une fois par paire)
    for (const [k, q] of Object.entries(E.pops)) effP.set(k, q.N.reduce((a, x) => a + x, 0));
    for (const [bid, pop] of Object.entries(E.pops)) {
      if (vivantsN + nouveaux.length >= REGLES.max_taxons) break;   // (la limite vaut pour chaque séparation, pas seulement pour chaque lignée)
      const eff = effP.get(bid), b = biomes[bid];
      const s = REGLES.separation, nid = `${t.id}.${bid}`;
      // le flux de gènes reçu (une moyenne glissante de la part d'immigrants) et l'écart au reste de l'espèce
      pop.flux = .85 * (pop.flux0 ?? 0) + .15 * Math.min(1, (pop.immig || 0) / Math.max(1, eff));
      const autres = Object.entries(E.pops).filter(([k]) => k !== bid && effP.get(k) >= 1);
      if (autres.length && (pop.A || pop.Q)) { const W = autres.reduce((a, [k]) => a + effP.get(k), 0), Ar = {}, Qr = {};
        for (const [k2, q] of autres) { const w = effP.get(k2) / W; for (const id in q.A || {}) Ar[id] = (Ar[id] || 0) + w * q.A[id]; for (const k in q.Q || {}) (Qr[k] ??= { m: 0 }).m += w * q.Q[k].m; }
        pop.div = divergence(pop.A, pop.Q, Ar, Qr); } else pop.div = 0;
      const pret = n - pop.depuis >= s.cycles && eff >= s.effectif && !taxons.some(x => x.id === nid), isole = clamp(1 - Math.max(pop.flux, Object.values(pop.hiv || {}).reduce((a, x) => a + x, 0)) / s.flux, 0, 1);   // (des hivernants ne font pas une lignée : ils repartent, docs/38)
      const ecolo = pret && t.plan.niche && dist(t.plan.niche, b.axes) >= s.distance * (t.plan.tolerance || .35), geno = pret && pop.div >= s.divergence;
      if ((ecolo || geno) && isole > 0 && R() < s.chance * isole * ((ecolo ? 1 : 0) + (geno ? Math.min(4, pop.div / s.divergence) : 0))) {
        const plan = deriver(t.plan, b, R), mode = SR ? PON.separer(t.plan, plan, b, nid, n) : null;   // (docs/25)
        const glisse = DT ? DI.deriver(t.plan, plan, nid, n) : null;   // (docs/30) le spectre glisse
        const neuve = FOR && inst.monde?.formes ? FOR.noter(t.plan, plan, formesVues ??= new Set(tousT.map(x => x.plan?.corps?.forme))) : null;   // (docs/33) une forme nouvelle
        if (!DT && DER && inst.monde?.derives) DER.regime(t.plan, plan, nid, n);   // (docs/29) le régime dérive, un pas à la fois
        if (GEN && pop.Q) replierQ(plan, pop.Q);   // ce que la population a acquis devient le plan de la lignée
        nouveaux.push({ id: nid, nom: `${(t.nom || t.id).replace(/\s*\(.*\)$/, '')} (${b.nom || bid})`, parent: t.id, apparu: n, eteint: null, statut: 'croissance', plan,
          _E: { plans: t.phenotypes.map(p => planDe(plan, p.traits, cat)), couts: E.couts.slice(), resist: E.resist.slice(), pops: { [bid]: { ...pop, N: pop.N.slice(), depuis: n, flux: 0 } } },   // (la même population, avec tout ce qu'elle porte : ses souches, sa nourriture, sa mémoire)
          phenotypes: clone(t.phenotypes) });
        ev.push({ type: 'separation', taxon: nid, biome: bid, detail: `lignée issue de ${t.id}, ${plan.masse_kg < t.plan.masse_kg ? 'plus petite' : 'plus grande'}${plan.regime !== t.plan.regime ? ', devenue ' + plan.regime : ''}${mode ? ', ' + mode : ''}${glisse ? ', ' + glisse : ''}${neuve ? ', ' + neuve : ''}${geno && !ecolo ? `, née de l'isolement (écart génétique ${pop.div.toFixed(2)})` : ''}` });
        delete E.pops[bid];
      }
    }
  }
  for (const nt of nouveaux) { etat.set(nt.id, nt._E); delete nt._E; taxons.push(nt); }

  const sortie = [];
  for (const t of taxons) {
    if (t.eteint) { if (n - t.eteint <= REGLES.memoire_eteint) sortie.push(t); continue; }
    const E = etat.get(t.id), K = t.phenotypes.length, totP = new Array(K).fill(0);
    t.populations = [];
    for (const [bid, pop] of Object.entries(E.pops)) {
      let eff = pop.N.reduce((a, x) => a + x, 0);
      if (eff < 2) { if (pop.avant >= 20 && !pop.saisonnier) ev.push({ type: 'extinction', taxon: t.id, biome: bid, detail: 'la population disparaît' }); continue; }   // (un groupe de migrants qui n'a pas pris ne fait pas un événement)
      const tend = pop.avant > 0 ? (eff - pop.avant) / pop.avant : 1;
      if (pop.avant < 2 && !pop.saisonnier) ev.push({ type: 'migration', taxon: t.id, biome: bid, detail: 'une population s\'installe' });   // (les arrivées trop maigres pour durer ne comptent pas)
      if (pop.avant >= 20 && !pop.saisonnier && tend <= REGLES.effondrement) ev.push({ type: 'effondrement', taxon: t.id, biome: bid, detail: `${Math.round(tend * 100)} % sur le cycle` });
      if (pop.avant >= 20 && !pop.saisonnier && tend >= REGLES.explosion) ev.push({ type: 'explosion', taxon: t.id, biome: bid, detail: `+${Math.round(tend * 100)} % sur le cycle` });
      const morts = (pop.mortsNat || 0) + (pop.mortsExt || 0) + (pop.mortsPred || 0) + (pop.mortsMal || 0);
      const p = { biome: bid, effectif: Math.round(eff), tendance: +tend.toFixed(3), depuis: pop.depuis };
      if (pop.maladie) p.maladie = { reste: pop.maladie.reste, virulence: pop.maladie.virulence, part: +clamp((pop.mortsMal || 0) / Math.max(1e-9, morts), 0, 1).toFixed(3) };
      if (pop.mortsExt > 0) p.pression = +clamp(pop.mortsExt / morts, 0, 1).toFixed(3);
      if (pop.mortsPred > 0) p.predation = +clamp(pop.mortsPred / morts, 0, 1).toFixed(3);
      if (pop.satiete != null) p.satiete = +pop.satiete.toFixed(3);
      if (GEN && pop.Q) p.quant = ecrireQ(pop.Q);
      if (SEX && pop.A) { const a = {}; for (const id of Object.keys(pop.A).sort()) if (pop.A[id] >= 1e-5) a[id] = +pop.A[id].toFixed(5); if (Object.keys(a).length) p.alleles = a; }
      if (pop.flux != null) p.flux = +clamp(pop.flux, 0, 1).toFixed(4);
      if (pop.hiv) { const h = {}; for (const k of Object.keys(pop.hiv).sort()) if (pop.hiv[k] >= 1e-4) h[k] = +Math.min(1, pop.hiv[k]).toFixed(4); if (Object.keys(h).length) p.hivernants = h; }   // (docs/38)
      if (REGLES.mefiance.actif && opt.mefiance !== false) {                 // ce que la population a appris des joueurs (docs/12)
        const [m, h] = apprendre(pop.mef0 || 0, pop.hab0 || 0, prT[t.id]?.[bid]?.contact, GEN ? pop.Q?.audace?.m || 0 : 0);
        if (m >= 1e-3) p.mefiance = +m.toFixed(3); if (h >= 1e-3) p.habituation = +h.toFixed(3);
        if (m >= REGLES.mefiance.alerte && (pop.mef0 || 0) < REGLES.mefiance.alerte) ev.push({ type: 'mefiance', taxon: t.id, biome: bid, detail: (SY && SY.texteMefiance(t, m)) || `les bêtes se méfient des joueurs (${Math.round(m * 100)} %)` }); }
      if (SY) SY.publier(t, bid, pop, p, morts);
      if (SF) SF.publier(t, bid, p, pop);
      if (SP) SP.publier(t, bid, pop, p);
      if (pop.div) p.divergence = +pop.div.toFixed(4);
      if (pop.hyb && pop.hyb.part >= 1e-4) { p.hybride = { avec: pop.hyb.avec, part: +pop.hyb.part.toFixed(4), isolement: +pop.hyb.isolement.toFixed(3) };
        if (pop.hyb.part >= REGLES.hybride.zone && (pop.hyb0 ?? 0) < REGLES.hybride.zone / 2) ev.push({ type: 'hybridation', taxon: t.id, biome: bid, detail: `zone hybride avec ${pop.hyb.avec} : ${(pop.hyb.part * 100).toFixed(1)} % des naissances` }); }
      t.populations.push(p); pop.N.forEach((x, i) => { totP[i] += x; });
    }
    const total = totP.reduce((a, x) => a + x, 0);
    if (!t.populations.length) { t.eteint = n; t.statut = 'eteint'; t.phenotypes.forEach(p => { p.frequence = 0; delete p.frequence_par_biome; }); ev.push({ type: 'extinction', taxon: t.id, detail: 'le taxon s\'éteint' }); sortie.push(t); continue; }
    // les phénotypes : fréquences globales et par biome ; on oublie ceux qui ont disparu (jamais le premier, le plan de base)
    // un phénotype qui n'a plus un demi-individu disparaît de la liste ; ses bêtes rejoignent le plan de base (elles ne
    // disparaissent pas avec lui ; leurs allèles, eux, restent dans la population)
    for (let i = 1; i < K; i++) if (totP[i] < .5 && totP[i] > 0) { for (const pop of Object.values(E.pops)) { pop.N[0] += pop.N[i] || 0; pop.N[i] = 0; } totP[0] += totP[i]; totP[i] = 0; }
    // trop de variantes : les plus rares rejoignent la variante gardée la plus proche (le moins de traits en plus ou en moins), sur les
    // comptes exacts, avant tout arrondi — ni bête perdue, ni bête renvoyée au plan de base sans raison
    { const vifs = []; for (let i = 0; i < K; i++) if (i === 0 || totP[i] >= .5) vifs.push(i);
      if (vifs.length > REGLES.max_phenotypes) {
        const tri = vifs.slice(1).sort((x, y) => totP[y] - totP[x] || x - y), gardes = [0, ...tri.slice(0, REGLES.max_phenotypes - 1)];
        const TS = t.phenotypes.map(p => new Set(p.traits));   // (vitesse : les traits de chaque phénotype, mis en ensemble une fois)
        const ecart = (a, b) => { const A = TS[a], B = TS[b]; let d = 0; for (const x of A) if (!B.has(x)) d++; for (const x of B) if (!A.has(x)) d++; return d; };
        for (const i of tri.slice(REGLES.max_phenotypes - 1)) { let j = 0, dj = Infinity; for (const g of gardes) { const d = ecart(i, g); if (d < dj) { dj = d; j = g; } }
          for (const pop of Object.values(E.pops)) { pop.N[j] += pop.N[i] || 0; pop.N[i] = 0; } totP[j] += totP[i]; totP[i] = 0; } } }
    const garde = [];
    t.phenotypes.forEach((p, i) => {
      if (i > 0 && totP[i] < .5) return;
      const f = total ? totP[i] / total : 0;
      const q = { id: p.id, frequence: +f.toFixed(4), traits: p.traits, cout_total: +E.couts[i].toFixed(3) };
      if (t.populations.length > 1) { q.frequence_par_biome = {}; for (const pop of t.populations) { const N = E.pops[pop.biome].N, s = N.reduce((a, x) => a + x, 0); q.frequence_par_biome[pop.biome] = +(s ? N[i] / s : 0).toFixed(4); } }
      const ec = ecartsDe(p.traits, cat); if (Object.keys(ec).length) q.ecarts = ec;
      q.selection = +(f - (p.frequence || 0)).toFixed(4);
      garde.push(q);
    });
    t.phenotypes = garde;
    const avant = Object.values(E.pops).reduce((a, p) => a + p.avant, 0), tend = avant > 0 ? (total - avant) / avant : 1;
    t.statut = total < REGLES.menace ? 'menace' : tend > .05 ? 'croissance' : tend < -.05 ? 'declin' : 'stable';
    sortie.push(t);
  }

  if (SV) for (const t of sortie) SV.publier(t);   // (docs/26) les deux vies d'une lignée qui se métamorphose
  if (SCa) for (const t of sortie) SCa.publier(t);   // (docs/33) les castes d'une lignée qui vit en colonie
  let SAV = null; if (ESP && inst.monde?.esprit) { const r = ESP.apres({ avant: inst.taxons, sortie, biomes, n }); ev.push(...r.evenements); if (Object.keys(r.catalogue).length) SAV = r.catalogue; }   // (docs/34) les savoirs naissent, se répandent, se perdent
  // (docs/27) un monde inventif invente parfois un trait : il entre au catalogue propre du monde
  let MC = inst.catalogue?.monde;
  if (INV && inst.monde?.invention) { const r = INV.inventer({ sortie, cat, n, graine: inst.monde.graine, inventes: MC?.traits || {} });
    if (Object.keys(r.traits).length) { MC = { ...(MC || {}), traits: { ...(MC?.traits || {}), ...r.traits } }; Object.assign(cat, r.traits); ev.push(...r.evenements); } }
  // (docs/32) un monde à la grammaire compose parfois une phrase : une lueur, une décharge, un cri, une odeur
  if (GRA && inst.monde?.grammaire) { const r = GRA.inventer({ sortie, biomes, n, graine: inst.monde.graine, inventes: MC?.traits || {}, cat });
    if (Object.keys(r.traits).length) { MC = { ...(MC || {}), traits: { ...(MC?.traits || {}), ...r.traits } }; Object.assign(cat, r.traits); ev.push(...r.evenements); } }
  // un trait inventé naît dans chaque phénotype qui porte ce qu'il exige (docs/27, docs/32) : la lignée peut passer le plafond.
  // Elle y revient dès ce cycle, par la règle du plafond plus haut (sur les fréquences : les comptes n'y sont plus)
  if ((INV && inst.monde?.invention) || (GRA && inst.monde?.grammaire)) for (const t of sortie) if (!t.eteint && t.phenotypes.length > REGLES.max_phenotypes) plafonner(t, REGLES.max_phenotypes);
  if (SF && DER && inst.monde?.derives) { const r = DER.diviser(plantes, { n, ids: new Set([...inst.taxons, ...sortie, ...plantes].map(t => t.id)), noms: Object.fromEntries(Object.values(biomes).map(b => [b.id, b.nom || b.id])), flore: inst.monde.flore?.lignees });   // (docs/29) des plantes qui se séparent
    plantes.push(...r.neuves); ev.push(...r.evenements); }
  if (SF) sortie.push(...SF.ecrire());   // les plantes (docs/17)

  // 7. le catalogue de l'instantané : les traits réellement portés
  // (dans l'ordre du catalogue : c'est lui qui dit qui masque qui, docs/9)
  const portes = new Set(); for (const t of sortie) for (const p of t.phenotypes) for (const id of p.traits) if (cat[id]) portes.add(id);
  const ORD = Object.keys(CAT.TRAITS), traits = {}; for (const id of [...portes].sort((x, y) => ((ORD.indexOf(x) + 1) || 999) - ((ORD.indexOf(y) + 1) || 999) || (x < y ? -1 : 1))) traits[id] = clone(cat[id]);   // (une copie : un jeu qui modifie l'instantané reçu ne touche pas au catalogue du moteur)
  const duree = opt.duree_ms ?? 86400000, d0 = Date.parse(inst.cycle.date);
  return {
    orvane: CONTRAT, monde: (m => m === inst.monde ? clone(m) : m)((m => SP ? SP.monde(m) : m)((m => SY ? SY.monde(m) : m)(SN ? SN.monde(SC ? SC.monde(inst.monde) : inst.monde) : SC ? SC.monde(inst.monde) : inst.monde))),
    cycle: { n, date: new Date((Number.isFinite(d0) ? d0 : 0) + duree).toISOString(), pressions_recues: pressions.nombre ?? 0, ...(saison ? { saison } : {}) },
    biomes: Object.values(biomes).map(b => phase == null ? b : { ...b, axes_saison: axesSaison(b, phase) }), catalogue: { version: inst.catalogue?.version || '0.1', traits, ...(GEN ? { quantitatifs: clone(QUANT) } : {}), organes: CORPS.catalogueOrganes(), ...(SF ? { flore: FLO.TRAITS } : {}), ...(SAV ? { savoirs: SAV } : {}), ...(MC ? { monde: MC } : {}) },
    taxons: sortie, evenements: ev
  };
}

const API = { CONTRAT, cycle, REGLES, QUANT, routeHiver, fenetreDe, planDe, coutDe, croissance, mortalite, convenance, appetence, axesSaison, deriver, rng, lireQ, penteQ, chargeQ, optimumQ, evoluerQ, melangerQ, mendel, allelesDe, portees, domDe, divergence, parente, isolement, apprendre };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.Orvane = API;

// --- ligne de commande : node moteur/orvane.js <instantane.json> [--cycles N] [--lot pression.json --profil profil.json --comptes K] [--sortie fichier.json] ---
if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs'), path = require('path'), a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  let inst = JSON.parse(fs.readFileSync(a[0], 'utf8'));
  const cycles = +(arg('--cycles') || 30), comptes = +(arg('--comptes') || 1);
  const lot = arg('--lot') && JSON.parse(fs.readFileSync(arg('--lot'), 'utf8')), profil = arg('--profil') && JSON.parse(fs.readFileSync(arg('--profil'), 'utf8'));
  const tampon = lot && require(path.join(__dirname, '..', 'tampon', 'tampon.js'));
  let etatTampon = {};
  const ligne = s => { const cols = [`c${String(s.cycle.n).padStart(3)}`]; for (const t of s.taxons) { if (t.eteint) { cols.push(`${t.id}: éteint`); continue; }
    cols.push(`${t.id} ${t.populations.map(p => `${p.biome.slice(0, 7)}=${p.effectif}`).join(' ')} | ${t.phenotypes.filter(p => p.frequence >= .005).map(p => `${p.id}:${(p.frequence * 100).toFixed(1)}%`).join(' ')}`); }
    return cols.join('  ·  '); };
  console.log(ligne(inst));
  for (let k = 0; k < cycles; k++) {
    let pressions = {};
    if (lot) { const lots = Array.from({ length: comptes }, (_, i) => ({ ...lot, instantane: inst.cycle.n, source: { ...lot.source, compte: `${lot.source.compte}#${i}` } }));
      const r = tampon.agreger(lots, inst, profil, etatTampon); pressions = r.pressions; etatTampon = r.etat; }
    inst = cycle(inst, pressions);
    console.log(ligne(inst)); for (const e of inst.evenements) console.log(`      ★ ${e.type} — ${e.taxon}${e.biome ? ' @' + e.biome : ''} : ${e.detail || ''}`);
  }
  if (arg('--sortie')) { fs.writeFileSync(arg('--sortie'), JSON.stringify(inst, null, 1)); console.log('→', arg('--sortie')); }
}
})(globalThis);
