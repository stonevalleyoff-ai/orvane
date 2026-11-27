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
//  - la mémoire (docs/50, moteur/memoire.js) : dans un monde qui l'éveille, trois dispositions de plus, apprises des joueurs
//    elles aussi (l'attrait, la traque, la néophobie), et un mot qui résume chaque population (son attitude).
//
// FORMAT DES PRESSIONS, en plus : taxons[t][b].q = { [trait continu]: z moyen des bêtes retirées par les joueurs } ;
// taxons[t][b].contact = { rencontres, danger, aide } : ce que les bêtes ont vécu des joueurs (tampon, docs/12).
// taxons[t][b].vecu = { rencontres, prises, blessures, dispositif, distance, effarouchements, nourrissages, pillages, attaques, tombes } :
// la même chose, plus fine et plafonnée par compte et par jeu, dans un monde à la mémoire éveillée (tampon, docs/50).
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
// (docs/59) le cœur du moteur, module par module (moteur/noyau/) : sans eux, pas de cycle (dans un navigateur, chacun se charge par sa
// balise <script>, avant orvane.js)
const HAB = typeof require === 'function' ? require('./noyau/habitat.js') : racine.OrvaneHabitat;   // l'habitat : la capacité des lieux, les catastrophes (moteur/noyau/habitat.js, docs/59)
const DEP = typeof require === 'function' ? require('./noyau/depart.js') : racine.OrvaneDepart;   // l'état de départ d'un cycle (moteur/noyau/depart.js, docs/59)
const PRED = typeof require === 'function' ? require('./noyau/predation.js') : racine.OrvanePredation;   // le partage des proies
const DYN = typeof require === 'function' ? require('./noyau/dynamique.js') : racine.OrvaneDynamique;   // la dynamique de chaque lignée (moteur/noyau/dynamique.js, docs/59)
const ARR = typeof require === 'function' ? require('./noyau/arrivees.js') : racine.OrvaneArrivees;   // les arrivées (moteur/noyau/arrivees.js, docs/59)
const LIG = typeof require === 'function' ? require('./noyau/lignees.js') : racine.OrvaneLignees;   // les lignées qui naissent et celles qui s'éteignent (moteur/noyau/lignees.js, docs/59)
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
const SUC = typeof require === 'function' ? require('./succession.js') : racine.OrvaneSuccession;   // les plantes sous le feu, la succession, le couvert qui suit les arbres (moteur/succession.js, docs/47)
const DIV = typeof require === 'function' ? require('./diversite.js') : racine.OrvaneDiversite;   // la flore riche : quarante formes, des caractères, la radiation (moteur/diversite.js, docs/48)
const GRA = typeof require === 'function' ? require('./grammaire.js') : racine.OrvaneGrammaire;   // la grammaire des effets et des conduites (moteur/grammaire.js, docs/32)
const CAS = typeof require === 'function' ? require('./castes.js') : racine.OrvaneCastes;   // les castes, les insectes sociaux (moteur/castes.js, docs/33)
const FOR = typeof require === 'function' ? require('./formes.js') : racine.OrvaneFormes;   // les formes nouvelles (moteur/formes.js, docs/33)
const ESP = typeof require === 'function' ? require('./esprit.js') : racine.OrvaneEsprit;   // l'esprit : apprendre, transmettre, des outils (moteur/esprit.js, docs/34)
const MEM = typeof require === 'function' ? require('./memoire.js') : racine.OrvaneMemoire;   // la mémoire : ce que les bêtes apprennent des joueurs (moteur/memoire.js, docs/50)
const CALEN = typeof require === 'function' ? require('./calendrier.js') : racine.OrvaneCalendrier;   // le calendrier : un monde au jour, la saison de chaque lieu (moteur/calendrier.js, docs/52)
const HOM = typeof require === 'function' ? require('./hommes.js') : racine.OrvaneHommes;   // les hommes : la chasse et la régulation d'un monde réel (moteur/hommes.js, docs/56)
// (docs/59) les mécanismes, sous le nom des règles qu'un monde peut leur donner (regles.<mécanisme>, celui de leur module) ; la mémoire a les
// siennes à part (regles.memoire, MEM : plus bas, dans le contexte)
const MECA = { synthetique: SYN, flore: FLO, pathogenes: PAT, milieu: MIL, ponte: PON, stades: STA, invention: INV, natures: NAT, derives: DER, dietes: DI, climat: CLI,
  meteo: MET, phenologie: PHE, succession: SUC, diversite: DIV, grammaire: GRA, castes: CAS, esprit: ESP, calendrier: CALEN };
// (docs/43) la version du contrat : MAJEUR.MINEUR, celle de package.json ; chaque instantané la porte (instantane.orvane)
const CONTRAT = '1.1';
const AXES = ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'];
// (docs/20) et ceux qu'un monde ajoute (catalogue.monde.axes) : dans le contexte de son cycle (contexte, plus bas)
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
  sexe: { actif: true, gain: 2e-4, perte: 2e-4, attrait: 1, nouveau: { dominant: .001, recessif: .03 } },   // gain, perte : mutation par allèle et par génération
  // (docs/52) dans un monde au calendrier, les naissances ont leur saison : une fenêtre de l'année (la phase du lieu, 0 : le cœur
  // de l'hiver) où naît l'essentiel des petits, de moyenne 1 sur l'année ; force 0 : toute l'année pareil (un plan peut dire la sienne,
  // plan.naissances = { centre, largeur })
  naissances: { force: 0, centre: .42, largeur: .4, fond: .1 },
  // (docs/52) un monde réel : la chance, par cycle de référence et par lieu voisin qui lui convient tout à fait, qu'une lignée fonde un lieu
  // où elle n'est pas ; null : partout où l'on essaime, on arrive (les mondes d'Orvane)
  colonisation: null,
  diapause: null,            // (docs/53) un monde réel : { plancher } — le repos d'hiver des bêtes à sang froid (plus bas, DIA)
  concurrence_masse: 0,      // (docs/53) un monde réel : l'écart-type (en décades de masse) de la concurrence entre deux chasseurs ; 0 : tous se gênent
  // (docs/53) un monde réel : ce qu'une proie offre à ses chasseurs, c'est ce qui est sur pied et ce qui en naît pendant autant de jours —
  // ceux sur lesquels se compte le besoin d'un prédateur (un cycle de référence, ~120). Un puceron se refait huit fois dans ce temps, un cerf
  // à peine. 0 : ce qui est sur pied (les mondes d'Orvane)
  renouvellement: 0,
  // (docs/53) un monde réel : un omnivore ne cherche en proies que sa part de chair (le sanglier, 20 % de viande et 10 % d'insectes : 30 % du
  // besoin d'un carnivore de sa masse). Sans cela, son besoin se comparait à son régime d'origine, qui est le même : il cherchait autant de
  // proies qu'un carnivore, et pesait sur le lynx comme sept lynx. false : comme avant (les mondes d'Orvane)
  viande_part: false,
  // (docs/53) un monde réel : entre deux chasseurs à sang chaud, le plus grand domine — il tue le plus petit qu'il croise, le chasse de son
  // territoire (Palomares et Caro 1999 ; Donadio et Buskirk 2006). Le poids d'un concurrent devant un chasseur est multiplié par le rapport de
  // leurs masses à cette puissance : le renard pèse moins devant le lynx, le lynx plus devant le renard. 0 : tous à égalité
  domination: 0,
  // (docs/53) un monde réel : deux chasseurs ne se disputent que ce qu'ils cherchent tous deux. Sur une proie qu'ils mangent l'un et l'autre, le
  // concurrent ne pèse que de la part de sa quête qu'il y met, au plus celle du chasseur (le recouvrement de Schoener, 1970). Sans cela, il
  // pesait de toute sa quête dès qu'il pouvait la manger : le renard et le sanglier, qui cherchent surtout des vers de terre et des limaces,
  // prenaient au lynx pardelle 89 % de ses lapins, qu'ils ne tuaient pas (leur prise suit leur quête). false : comme avant (les mondes d'Orvane)
  recouvrement: false,
  // (docs/52) un monde réel : la part des morts du lieu (les bêtes d'au moins 10 g, mortes de vieillesse ce jour) que trouvent les mangeurs de
  // charogne (plan.charogne : le vautour, le milan, le glouton, les corvidés). Une proie de plus, qu'on ne tue pas. 0 : les morts ne
  // nourrissent personne (les mondes d'Orvane)
  charognes: 0,
  // (docs/57) un monde réel : la plus grosse proie d'un chasseur en meute (plan.meute), rapportée à la masse de la meute. 1,5 : comme un
  // chasseur seul (les mondes d'Orvane). À 1,5, une meute de six loups n'abattait rien de plus de 263 kg, ni l'orignal (351 kg), sa proie
  // à Isle Royale comme en Scandinavie
  meute_proie: 1.5,
  petites_proies: false      // (docs/52) un monde réel : un mangeur d'insectes prend les insectes, si petits soient-ils (plus haut, appetence)
};
// (docs/52) le pas de temps : la part d'un cycle de référence (une « tranche de vie » d'environ 120 jours, celle sur laquelle le
// moteur a été réglé) que fait un cycle de ce monde. 1 partout, sauf dans un monde au jour (monde.temps = { jours: 1 } : 1/120).
// Les durées d'un plan (longevite, maturite) sont en cycles et n'ont pas à changer ; ce sont les constantes du moteur qui sont par
// cycle de référence : on les met à l'échelle (un taux × pas, une chance par cycle 1 − (1 − p)^pas). À 1, rien ne change, au bit près.
// (docs/59) le contexte d'un cycle : les règles de son monde (celles du moteur, et les siennes par-dessus), son pas de temps, ses axes
// (contexte, plus bas). Le cycle ne change rien de global : chaque fonction qui en dépend le reçoit en dernier argument (CTX) ; sans
// lui, elle prend le contexte par défaut, les règles du moteur au pas de référence, comme un appel hors d'un cycle
const DEFAUT = { R: REGLES, PAS: 1, JOURS: null, AX: AXES, CORPS, MEM, M: MECA };   // (hors d'un cycle : le corps, la mémoire et les mécanismes des modules)
const parPas = (p, CTX = DEFAUT) => CTX.PAS === 1 ? p : 1 - Math.pow(1 - p, CTX.PAS);
// --- la génétique (docs/8, 9, 10) : les traits continus, Mendel et les allèles, les portées, la parenté (moteur/noyau/genetique.js, docs/59) ---
const GENE = typeof require === 'function' ? require('./noyau/genetique.js') : racine.OrvaneGenetique;
const { QUANT, lireQ, optimumQ, penteQ, chargeQ, evoluerQ, melangerQ, domDe, mendel, allelesDe, portees, divergence, parente } = GENE;
// (ce qui dépend des règles du monde reste ici : l'écriture au pas du monde, l'attrait, la méfiance, l'isolement reproductif)
// (docs/52 : au pas d'un monde au jour, ce qui change d'un cycle est cent fois plus petit : on l'écrit avec quatre chiffres de plus,
//  sans quoi l'arrondi le perdrait chaque jour et rien ne bougerait plus)
const ecrireQ = (Q, CTX = DEFAUT) => { const d = CTX.PAS === 1 ? 5 : 9; return Object.fromEntries(Object.entries(Q).map(([k, x]) => [k, { m: +x.m.toFixed(d), v: +(x.G + 1 - QUANT[k].h2).toFixed(d), g: +x.G.toFixed(d) }])); };
const attraitDe = (traits, cat, CTX = DEFAUT) => Math.pow(traits.reduce((a, id) => a * (cat[id]?.attrait ?? CAT.TRAITS[id]?.attrait ?? 1), 1), CTX.R.sexe.attrait ?? 1);
// la méfiance et l'habituation d'une population, un cycle plus tard (docs/12). c = { rencontres, danger, aide } : les
// contacts sans suite, ceux qui ont fini mal (prélèvements, captures), l'aide (nourrissage, libération) ; za : son audace
function apprendre(m, h, c, za = 0, CTX = DEFAUT) {
  const M = CTX.R.mefiance, ka = Math.exp(-M.audace * clamp(za, -3, 3));   // < 1 chez une population audacieuse
  m *= 2 ** (-1 / M.demi_vie); h *= 2 ** (-1 / M.demi_vie_habitude);
  const Rn = Math.max(0, +c?.rencontres || 0), D = Math.max(0, +c?.danger || 0), A = Math.max(0, +c?.aide || 0), tot = Rn + D;
  if (tot > 0) { const e = 1 - Math.exp(-tot / M.preuve), cible = 1 - Math.exp(-M.sensibilite * ka * D / tot);
    m += e * (cible - m) * (cible > m ? 1 : M.oubli);
    h *= 1 - e * cible; }                                                  // ce qui finit mal défait l'habitude
  if (Rn + A > 0) h += (1 - h) * (1 - m) * Math.exp(-M.paix * D / Math.max(1, tot)) * (1 - Math.exp(-(Rn + 3 * A) / (M.habitude * ka)));
  return [clamp(m, 0, 1), clamp(h, 0, 1)];
}
// l'isolement reproductif de deux lignées (0 : une seule population ; 1 : aucun croisement) : il s'accumule avec le temps
// depuis leur séparation, l'écart de masse, de silhouette, de niche ; deux régimes ou deux formes de corps ne se croisent pas
function isolement(A, B, T, n, CTX = DEFAUT) {
  if (A === B) return 0;
  if (A.plan.regime !== B.plan.regime) return 1;
  const fa = A.plan.corps?.forme, fb = B.plan.corps?.forme; if (fa && fb && fa !== fb) return 1;
  const lien = parente(A, B, T); if (!lien || !Number.isFinite(lien.depuis)) return 1;
  const H = CTX.R.hybride, dm = Math.abs(Math.log((A.plan.masse_kg || 1) / (B.plan.masse_kg || 1))),
    dc = CTX.CORPS && A.plan.corps && B.plan.corps ? CTX.CORPS.distance(A.plan.corps, B.plan.corps) : 0, dn = A.plan.niche && B.plan.niche ? dist(A.plan.niche, B.plan.niche, CTX) : 0;
  return 1 - Math.exp(-(Math.max(0, n - lien.depuis) / H.tau + H.masse * dm + H.corps * dc + H.niche * dn));
}
// --- les outils du cœur (moteur/noyau/outils.js) ; le plan d'une lignée, ses lieux et son calendrier (moteur/noyau/plan.js) : des fonctions pures
// (docs/59) ; ce qui dépend du contexte d'un monde (les saisons d'un lieu, la dérive, l'appétence, la croissance, la convenance, la route de
// l'hiver) reste ici ---
const OUTILS = typeof require === 'function' ? require('./noyau/outils.js') : racine.OrvaneOutils;
const { clamp, clone, hasard, rng } = OUTILS;
const PLAN = typeof require === 'function' ? require('./noyau/plan.js') : racine.OrvanePlan;
const { SAISONS, PART_K, recouvrement, charge, BANDE, planDe, coutDe, mortalite, CHAROGNE, eauDouce, eauSalee, lieuType, memeMilieu, plafonner, fenetreDe, biomasse } = PLAN;
// la phase de l'année (0 = plein hiver, 0,5 = plein été) et son nom
const saisonDe = (n, annee, CTX = DEFAUT) => { if (!annee) return null; const phase = (n % annee) / annee; return { phase: +phase.toFixed(4), nom: SAISONS[Math.floor(((phase + .125) % 1) * 4)], production: +(1 + CTX.R.saisons.capacite * -Math.cos(2 * Math.PI * phase)).toFixed(3) }; };
// les axes d'un biome à une phase de l'année : froid et sombre en hiver, chaud et lumineux en été, un peu plus humide en hiver
function axesSaison(b, phase, CTX = DEFAUT) {
  if (phase == null || b.saisons === false || b.saisons === null) return b.axes;
  const A = { ...CTX.R.saisons, ...(b.saisons || {}) }, c = -Math.cos(2 * Math.PI * phase), a = { ...b.axes };
  a.temperature = clamp(a.temperature + A.temperature * c, 0, 1); a.lumiere = clamp(a.lumiere + A.lumiere * c, 0, 1); a.humidite = clamp(a.humidite - A.humidite * c, 0, 1);
  return a;
}
const productionSaison = (b, phase, CTX = DEFAUT) => phase == null || b.saisons === false || b.saisons === null ? 1 : 1 + ({ ...CTX.R.saisons, ...(b.saisons || {}) }).capacite * -Math.cos(2 * Math.PI * phase);
// Une lignée qui se sépare dérive : sa masse (et avec elle maturité et longévité, allométriquement), son tempérament, sa
// sociabilité, et sous REGLES.derive plus marqué (la genèse) son régime, sa locomotion, son heure — la niche devient le biome.
function deriver(plan, b, R, CTX = DEFAUT) {
  const D = CTX.R.derive, k = D.masse[0] * Math.pow(D.masse[1] / D.masse[0], R());   // tirage log-uniforme entre les deux bornes
  const p = { ...plan, masse_kg: +(plan.masse_kg * k).toFixed(3), taille_m: +(plan.taille_m * Math.cbrt(k)).toFixed(3),
    maturite: +(plan.maturite * Math.pow(k, .25)).toFixed(2), longevite: +(plan.longevite * Math.pow(k, .25)).toFixed(2),
    temperament: clamp(plan.temperament + (R() - .5) * .3, 0, 1), sociabilite: clamp(plan.sociabilite + (R() - .5) * .3, 0, 1),
    niche: { ...b.axes }, tolerance: plan.tolerance || .35, locomotion: [...(plan.locomotion || ['marche'])] };
  // (équilibrage, 5 novembre : REGLES.derive.tolerance > 0 laisse la largeur de la niche dériver, plutôt vers l'étroit — des spécialistes
  // naissent ; 0 par défaut, et son tirage ne se fait que s'il est demandé : le hasard des mondes qui ne le demandent pas ne bouge pas)
  if (D.tolerance > 0) p.tolerance = +clamp((plan.tolerance || .35) * Math.exp(D.tolerance * (R() - .6)), D.tolerance_min ?? .15, .9).toFixed(3);
  // le régime passe par l'omnivore ; un omnivore redevient plus souvent herbivore que carnivore (il y a plus à brouter qu'à chasser)
  // (un filtreur, un charognard gardent le leur : ce n'est pas un pas de plus ou de moins vers la viande)
  if (R() < D.regime && ['herbivore', 'omnivore', 'carnivore'].includes(plan.regime)) p.regime = plan.regime === 'herbivore' ? 'omnivore' : plan.regime === 'carnivore' ? 'omnivore' : R() < (CTX.R.vers_carnivore ?? .35) ? 'carnivore' : 'herbivore';
  // un mode de déplacement se gagne (ce que le biome favorise) ou se perd (un accessoire dont le biome n'a pas l'usage) : sans
  // cela, toutes les lignées finiraient par tout savoir faire
  const VOL = CTX.R.vol_masse_max ?? Infinity, eau = b.milieu === 'amphibie' || b.milieu === 'aquatique' || b.milieu === 'marin';
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
  if (p.regime === 'carnivore' && CTX.R.longevite_predateur) { const Lmin = CTX.R.longevite_predateur / (CTX.R.conversion * CTX.R.besoin * Math.pow(Math.max(.001, p.masse_kg), -.25));
    if (p.longevite < Lmin) { p.maturite = +(p.maturite * Math.min(2, Lmin / p.longevite) ** .5).toFixed(2); p.longevite = +Lmin.toFixed(2); } }
  // le corps suit : la silhouette dérive vers ce que le biome favorise, et garde la marque d'un mode de déplacement gagné
  if (plan.corps && CTX.CORPS) { const avant = new Set(plan.locomotion || ['marche']);
    p.corps = CTX.CORPS.deriver(plan.corps, p, b, R, D.corps ?? 1, p.locomotion.filter(l => !avant.has(l)), k, D.formes || 0, D.organes || 0);
    if (volait && p.corps) p.corps = { ...p.corps, ailes: 0, organes: (p.corps.organes || []).filter(o => o.type !== 'ailes'), forme: p.corps.forme === 'oiseau' ? 'bipede' : p.corps.forme }; }
  return p;
}
// l'appétence d'un prédateur pour une proie : la masse (une proie d'un tiers de sa masse est idéale ; rien au-delà de 1,5 fois,
// rien sous un cinquantième), la vitesse (une proie plus rapide échappe), le vol (hors de portée d'un marcheur), le groupe
// (l'alerte collective) et l'heure (un diurne croise peu un nocturne)
// (docs/52) un chasseur en meute (plan.meute : la taille du groupe qui chasse, le loup ~6) abat ce que la meute peut abattre : la masse
// qui compte est celle du groupe, pour la plus grosse proie et la proie idéale ; la plus petite reste à la mesure d'une bête
// (docs/52) dans un monde réel (REGLES.petites_proies), un mangeur d'insectes prend les insectes, si petits soient-ils : la truite les
// larves, la mésange les chenilles, la baleine le krill ; sans cela, rien de plus petit qu'un cinquantième de sa masse
function appetence(pred, proie, CTX = DEFAUT) {
  const rap = (proie.masse_kg || 1) / ((pred.masse_kg || 1) * (pred.meute > 1 ? pred.meute : 1)), r1 = (proie.masse_kg || 1) / (pred.masse_kg || 1);
  // (et dans l'eau, un chasseur qui nage avale des proies qui nagent, cent fois plus petites que lui : le thon le hareng, le phoque le cabillaud)
  const menu = CTX.R.petites_proies && r1 < .02 && (((pred.diete?.insectes || 0) > 0 && (proie.corps?.forme === 'hexapode' || (proie.masse_kg || 1) <= .02))
    || ((pred.locomotion || []).includes('nage') && (proie.locomotion || []).includes('nage') && r1 >= 2e-4));
  if (!menu && ((pred.meute > 1 ? (proie.masse_kg || 1) / (pred.masse_kg || 1) : rap) < .02 || rap > (pred.meute > 1 ? CTX.R.meute_proie ?? 1.5 : 1.5))) return 0;   // (docs/57 : la meute et sa plus grosse proie)
  const lg = Math.log10(rap) - Math.log10(.3); let f = menu ? .8 : Math.exp(-(lg * lg) / .5);
  const vp = (pred.vitesse_rel || 4) * (pred.taille_m || 1), vq = (proie.vitesse_rel || 4) * (proie.taille_m || 1);
  f *= clamp(Math.sqrt(vp / Math.max(.01, vq)), .6, 1.4);
  if ((proie.locomotion || []).includes('vol') && !(pred.locomotion || []).includes('vol')) f *= .3;
  f *= 1 - .2 * (proie.sociabilite || 0);
  const ap = pred.activite, aq = proie.activite; if (ap && aq && ap !== aq && ap !== 'continue' && aq !== 'continue' && ap !== 'crepusculaire' && aq !== 'crepusculaire') f *= .6;
  return f;
}
const dist = (a, b, CTX = DEFAUT) => Math.sqrt(CTX.AX.reduce((s, k) => s + ((a[k] ?? .5) - (b[k] ?? .5)) ** 2, 0));

// taux intrinsèques, par cycle
// (la masse ramène tout : une bête de 100 kg ne se multiplie pas comme une de 1 kg — loi de Fenchel, r ∝ masse^-1/4 ;
//  on garde la différence entre les stratégies, portée et maturité, à l'intérieur de ce que la masse permet)
// (docs/52) un plan réel peut dire sa natalité (plan.natalite : les petits qui survivent à leur première année, par tête et par an) :
// dans un monde au jour, elle fait la croissance telle quelle ; sinon, la formule d'Orvane, mise à l'échelle du pas
const croissance = (p, CTX = DEFAUT) => { if (CTX.JOURS && Number.isFinite(p.natalite)) return Math.max(0, p.natalite) * CTX.JOURS / 365.25;
  const rmax = .35 * Math.pow(Math.max(.1, p.masse_kg || 1), -.25), r = .6 * Math.log(1 + (p.portee || 2)) / Math.max(1, p.maturite || 1);
  return CTX.PAS === 1 ? clamp(r * Math.min(1, rmax / .35), .01, rmax) : clamp(r * Math.min(1, rmax / .35), .01 * CTX.PAS, rmax * CTX.PAS); };
// (docs/38) la route de l'hiver d'une population : null, ou { vers, ici, la, part } — P son plan, b son lieu, lieu(id) → un lieu,
// s sa sociabilité, routes la part des siens qui savent les routes (docs/34), H les seuils (ceux du moteur, ou d'un monde). Sans
// hasard : le moteur s'en sert pour faire partir les bêtes (REGLES.hivernage.actif), collectif.js pour le dire aux jeux. (Une mer ne
// se traverse qu'en volant, nageant, dérivant.)

// (docs/52) axesA(x, phase) : les axes d'un lieu à une phase de SON année (un monde au calendrier : son hiver vient de son climat) ;
// dans un monde réel (des lieux qui ont lieu.lat), une parcelle du même type peut avoir un autre hiver : elle compte
function routeHiver(P, b, lieu, s = 0, routes = 0, H, axesA, CTX = DEFAUT) {
  if (H == null) H = CTX.R.hivernage; if (axesA == null) axesA = (x, ph) => axesSaison(x, ph, CTX);
  const L = P?.locomotion || [], m = P?.masse_kg || 1;
  if (!b || b.saisons === false || b.saisons === null || !P?.niche) return null;
  const vole = L.includes('vol'), marche = L.includes('marche') || L.includes('course'), nage = L.includes('nage');
  if (!(vole && m >= H.masse_volant) && !(marche && m >= H.masse_marcheur) && !(nage && m >= H.masse_marcheur)) return null;
  const hiver = x => ({ ...x, axes: axesA(x, 0) }), ici = convenance(P, hiver(b), CTX);
  if (ici >= H.rude * convenance(P, { ...b, axes: axesA(b, .5) }, CTX)) return null;   // un hiver doux chez soi : on reste (le bœuf musqué ne quitte pas la toundra)
  let best = null;
  for (const vid of [...new Set(b.voisins || [])].sort()) { const v = lieu(vid); if (!v || (!b.lieu && lieuType(vid) === lieuType(b.id)) || (b.lieu && !memeMilieu(b)(v))) continue;   // (par parcelles : une parcelle d'un autre lieu)
    if (b.traversees?.includes(vid) && !(CLI && CLI.traverse(P))) continue;
    const la = convenance(P, hiver(v), CTX); if (la < H.min || la < ici * (1 + H.marge)) continue;
    if (!best || la > best.la) best = { v, la }; }
  if (!best) return null;
  return { vers: best.v, ici, la: best.la, part: clamp((best.la - ici) / best.la * (.5 + .5 * s) + .3 * routes, H.part_min, H.part_max) };
}
// convenance d'un biome (0..1) : 1 dans la niche, décroît avec la distance ; nulle si le milieu est impossible
function convenance(plan, biome, CTX = DEFAUT) {
  const loco = plan.locomotion || [], m = biome.milieu;
  const terre = loco.some(l => ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe'].includes(l));
  const vol = loco.includes('vol'), nage = loco.includes('nage');
  const ok = m === 'aquatique' ? nage && eauDouce(plan) : m === 'marin' ? nage && eauSalee(plan) : m === 'aerien' ? vol
    : m === 'souterrain' ? loco.includes('fouissage') || terre : m === 'amphibie' ? terre || vol || loco.includes('nage') : terre || vol;
  if (!ok || (plan.regime === 'filtreur' && m !== 'aquatique' && m !== 'marin' && m !== 'amphibie')) return 0;   // un filtreur filtre l'eau
  if (!plan.niche) return 1;
  const d = dist(plan.niche, biome.axes, CTX), tol = plan.tolerance || .35;
  return Math.exp(-(d * d) / (2 * tol * tol));
}

// --- un cycle ---
// un monde peut porter ses propres règles (monde.regles : celles que sa genèse a choisies) ; elles valent le temps de son cycle
// (docs/20) et son propre catalogue (catalogue.monde) : ses axes, et pour la silhouette ses organes et ses formes de corps
// (dans un navigateur, un module se charge par sa balise <script>, AVANT orvane.js ; un monde qui a éveillé un mécanisme dont le
// module manque tournerait sans lui, sans rien dire : on le dit, une fois — docs/19)
const MODULES = [['mere', SYN, 'synthetique'], ['flore', FLO, 'flore'], ['pathogenes', PAT, 'pathogenes'], ['milieu', MIL, 'milieu'], ['ponte', PON, 'ponte'], ['stades', STA, 'stades'], ['invention', INV, 'invention'],
  ['natures', NAT, 'natures'], ['derives', DER, 'derives'], ['dietes', DI, 'dietes'], ['climat', CLI, 'climat'], ['meteo', MET, 'meteo'], ['phenologie', PHE, 'phenologie'], ['succession', SUC, 'succession'], ['diversite', DIV, 'diversite'], ['grammaire', GRA, 'grammaire'], ['castes', CAS, 'castes'], ['formes', FOR, 'formes'], ['esprit', ESP, 'esprit'], ['memoire', MEM, 'memoire'], ['calendrier', CALEN, 'calendrier']], AVERTIS = new Set();
function cycle(inst, pressions = {}, opt = {}) {
  for (const [cle, M, f] of MODULES) if (inst?.monde?.[cle] && !M && !AVERTIS.has(cle)) { AVERTIS.add(cle); if (typeof console !== 'undefined') console.warn(`Orvane : ce monde a éveillé « ${cle} », mais moteur/${f}.js n'est pas chargé (avant orvane.js) : ce mécanisme est ignoré (docs/19).`); }
  // (docs/59) le contexte de ce monde : ses règles, son pas, ses axes, le catalogue propre de ses corps, les règles de sa mémoire ;
  // le cycle ne règle rien de global, et n'a rien à rendre. opt.regles : les règles du moteur pour ce cycle (celles d'une genèse, d'un banc)
  return cycleBrut(inst, pressions, opt, contexte(inst, opt.regles));
}
// (docs/59) le contexte d'un monde : les règles du moteur, et les siennes par-dessus (une règle qui est un objet se complète d'un niveau :
// { separation: { chance: 1 } } garde les autres clés de la séparation ; sans cela, une règle partielle effaçait ses voisines — un flux
// indéfini, une durée de maladie absente) ; son pas de temps (monde.temps, docs/52) ; ses axes (catalogue.monde.axes, docs/20). Rien n'y
// est global : deux mondes peuvent tourner l'un après l'autre, ou côte à côte, dans le même processus. Et le corps (moteur/corps.js) d'après
// le catalogue propre du monde (catalogue.monde : ses organes, ses formes), la mémoire (moteur/memoire.js) d'après ses règles
// (regles.memoire, docs/50), chacun dans une instance à ce monde : ni l'un ni l'autre ne garde rien d'un monde à l'autre
// (docs/59) regles : les règles du moteur le temps de ce contexte (une genèse accélère l'évolution, un banc force les séparations), sans
// toucher à REGLES : elles complètent celles du moteur de la même façon, et celles du monde passent encore par-dessus
function contexte(inst, regles) {
  const propres = inst?.monde?.regles, M = inst?.catalogue?.monde, T = inst?.monde?.temps, R = { ...REGLES };
  for (const C of [regles, propres]) if (C && typeof C === 'object') { for (const k in C) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const v = C[k], b = R[k]; R[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...v } : v; } }
  const auJour = !!(T && T.jours > 0);
  return { R, PAS: auJour ? T.jours / (T.reference || 120) : 1, JOURS: auJour ? T.jours : null, AX: M?.axes ? [...AXES, ...Object.keys(M.axes).filter(k => !AXES.includes(k))] : AXES,
    CORPS: CORPS ? CORPS.pour(M) : null, MEM: MEM && inst?.monde?.memoire ? MEM.avec(R.memoire) : MEM, M: mecanismes(R) };
}
// (docs/59) les mécanismes d'un monde : leurs modules tels quels, si ni le monde ni le cycle n'en règlent aucun ; sinon, une instance de chacun
// à ses règles (regles.<mécanisme> : celles du module, complétées d'un niveau), qui se sert des autres mécanismes de ce monde (la flore, de ses
// diètes et des saisons de ses plantes ; les dérives, des diètes ; les souches, des dérives)
function mecanismes(R) {
  const regle = k => R[k] && typeof R[k] === 'object' && !Array.isArray(R[k]) ? R[k] : null;
  if (!Object.keys(MECA).some(regle)) return MECA;
  const M = {}, une = (k, d) => MECA[k] && MECA[k].avec ? MECA[k].avec(regle(k), d) : MECA[k];
  M.dietes = une('dietes'); M.phenologie = une('phenologie'); M.derives = une('derives', { dietes: M.dietes }); M.pathogenes = une('pathogenes', { derives: M.derives });
  M.flore = une('flore', { dietes: M.dietes, phenologie: M.phenologie });
  for (const k in MECA) if (!(k in M)) M[k] = une(k);
  return M;
}
// les fonctions du moteur qui dépendent du contexte, telles qu'elles sont : le cycle les lie au sien (plus bas)
const FC = { parPas, ecrireQ, attraitDe, apprendre, isolement, saisonDe, axesSaison, productionSaison, deriver, appetence, dist, croissance, convenance, routeHiver };
function cycleBrut(inst, pressions = {}, opt = {}, CTX = contexte(inst)) {
  // (docs/59) le contexte de ce cycle : ses règles, son pas de temps, ses axes ; et les fonctions du moteur qui en dépendent, liées à lui
  const REGLES = CTX.R, PAS = CTX.PAS, JOURS = CTX.JOURS, AX = CTX.AX, CORPS = CTX.CORPS, MEM = CTX.MEM;   // (le corps et la mémoire de ce monde)
  // (docs/59) les mécanismes de ce monde : les modules, ou des instances à ses règles (regles.<mécanisme>)
  const { synthetique: SYN, flore: FLO, pathogenes: PAT, milieu: MIL, ponte: PON, stades: STA, invention: INV, natures: NAT, derives: DER, dietes: DI, climat: CLI,
    meteo: MET, phenologie: PHE, succession: SUC, diversite: DIV, grammaire: GRA, castes: CAS, esprit: ESP, calendrier: CALEN } = CTX.M;
  const parPas = p => FC.parPas(p, CTX), ecrireQ = Q => FC.ecrireQ(Q, CTX), attraitDe = (t, c) => FC.attraitDe(t, c, CTX), apprendre = (m, h, c, za = 0) => FC.apprendre(m, h, c, za, CTX),
    isolement = (A, B, T, k) => FC.isolement(A, B, T, k, CTX), saisonDe = (k, an) => FC.saisonDe(k, an, CTX), axesSaison = (b, ph) => FC.axesSaison(b, ph, CTX),
    productionSaison = (b, ph) => FC.productionSaison(b, ph, CTX), deriver = (p, b, Rg) => FC.deriver(p, b, Rg, CTX), appetence = (p, q) => FC.appetence(p, q, CTX), dist = (a, b) => FC.dist(a, b, CTX),
    croissance = p => FC.croissance(p, CTX), convenance = (p, b) => FC.convenance(p, b, CTX), routeHiver = (P, b, lieu, s = 0, routes = 0, H, axesA) => FC.routeHiver(P, b, lieu, s, routes, H, axesA ?? axesSaison, CTX);
  const n = inst.cycle.n + 1, R = rng(inst.monde.graine, n);
  const MT = inst.catalogue?.monde?.traits || {}, MILT = (MIL && inst.monde?.milieu) || (PON && inst.monde?.ponte) || (STA && inst.monde?.stades) || (CAS && inst.monde?.castes) || (ESP && inst.monde?.esprit) ? { ...(MIL && inst.monde?.milieu ? MIL.TRAITS : {}), ...(PON && inst.monde?.ponte ? PON.TRAITS : {}), ...(STA && inst.monde?.stades ? STA.TRAITS : {}), ...(CAS && inst.monde?.castes ? CAS.TRAITS : {}), ...(ESP && inst.monde?.esprit ? ESP.TRAITS : {}) } : null, cat = { ...(inst.catalogue?.traits || {}), ...MT, ...(MILT || {}), ...CAT.TRAITS };   // (docs/25 : le mangeur d'œufs, dans un monde où l'on pond)   // (docs/22 : le bâtisseur, dans un monde au milieu éveillé)
  const RM = MILT ? rng(((inst.monde.graine >>> 0) ^ 0x3c6ef372) >>> 0, n) : null;   // (son tirage à lui : un monde au milieu éveillé garde ceux du reste)   // la biologie d'un trait connu est celle du moteur ; un trait propre au monde (docs/20) garde la sienne
  const biomes = Object.fromEntries(inst.biomes.map(b => [b.id, clone(b)]));
  const ev = [], tousT = clone(inst.taxons), plantes = FLO ? tousT.filter(t => t.plan?.regime === 'vegetal') : [];   // (docs/17 : les plantes vivent à part)
  const DT = !!(DI && inst.monde?.dietes); if (DT) for (const t of tousT) DI.completer(t);   // (docs/30) chaque lignée a son spectre
  const taxons = plantes.length ? tousT.filter(t => t.plan?.regime !== 'vegetal') : tousT;
  const prT = pressions.taxons || {}, prB = pressions.biomes || {};
  // (docs/52) un monde au calendrier : le jour que vit ce cycle (la date du cycle qu'il publiera), et le nom de la saison du monde,
  // celle de son hémisphère ; chaque lieu aura la sienne, plus bas
  const d0c = Date.parse(inst.cycle.date), JOURC = CALEN && inst.monde?.calendrier ? (opt.jour != null ? +opt.jour : (Number.isFinite(d0c) ? d0c : 0) + (opt.duree_ms ?? 86400000)) : null;
  // (docs/56) dans un monde réel au calendrier qui le dit (monde.hommes), ce que les hommes prennent ce jour à chaque population
  const HOMJ = HOM && inst.monde?.hommes && JOURC != null ? HOM.jour(inst.monde.hommes, JOURC, JOURS || 1) : null;
  const saison = JOURC != null ? (ph => ({ phase: ph, nom: CALEN.nomSaison(ph), production: +(1 + REGLES.saisons.capacite * -Math.cos(2 * Math.PI * ph)).toFixed(3) }))(CALEN.phaseReference(JOURC, inst.monde.calendrier?.hemisphere === 'sud'))
    : saisonDe(n, inst.monde.annee), phase = saison ? saison.phase : null;
  const GEN = REGLES.genetique !== false && opt.genetique !== false && Object.keys(QUANT).length > 0;
  const Rq = rng(((inst.monde.graine >>> 0) ^ 0x5bd1e995) >>> 0, n);   // la génétique a son propre tirage : l'écologie garde le sien
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Rq())) * Math.cos(2 * Math.PI * Rq());
  const SEX = REGLES.sexe?.actif !== false && opt.sexe !== false;

  // 1. l'habitat : les pertes et gains du cycle, puis un lent retour vers la capacité de base ; (docs/22) le milieu transformé par ses
  //    bêtes et ses joueurs : ses axes d'aujourd'hui, et la capacité que les fouisseurs lui donnent
  const SC = CLI && inst.monde?.climat ? CLI.preparer({ monde: inst.monde, biomes, n, taxons: plantes }) : null; if (SC) SC.avant();   // (docs/31) le climat, la mer, les volcans
  const SSu = SUC && inst.monde?.succession && plantes.length ? SUC.preparer({ plantes, biomes, n }) : null;   // (docs/47) les plantes subissent et transforment
  const SM = MIL && inst.monde?.milieu ? MIL.preparer({ biomes, taxons: tousT, prB, n, climat: SC, couvert: SSu ? SSu.couvert : null }) : null; if (SM) ev.push(...SM.evenements);
  if (SC) { SC.appliquer(); ev.push(...SC.evenements); }
  const SN = NAT && inst.monde?.natures ? NAT.preparer(inst.monde, n) : null; if (SN) { for (const b of Object.values(biomes)) SN.changer(b); ev.push(...SN.evenements); }   // (docs/28) un lieu prend la nature dont ses axes sont le plus près
  // (docs/45) la météo : le temps qu'il fait dans chaque lieu ce cycle ; il déplace les axes et la production de la saison
  // (docs/52) un monde au calendrier : la saison de chaque lieu, ce jour — sa phase, et s'il a ses normales (lieu.normales) ses axes et
  // sa production du jour ; sans normales, ceux du moteur à la phase du lieu ; un lieu sans latitude garde la saison du monde
  const SL = JOURC != null ? new Map() : null;
  if (SL) for (const b of Object.values(biomes)) { const s = CALEN.saisonLieu(b, JOURC); if (!s) continue;
    if (!s.axes) { s.axes = axesSaison(b, s.phase); s.production = productionSaison(b, s.phase); } SL.set(b.id, s); }
  const axesS = SL ? b => SL.get(b.id)?.axes ?? axesSaison(b, phase) : b => axesSaison(b, phase), prodS = SL ? b => SL.get(b.id)?.production ?? productionSaison(b, phase) : b => productionSaison(b, phase);
  const phaseDe = SL ? b => SL.get(b.id)?.phase ?? phase : () => phase;
  // (docs/53) le repos d'hiver : un animal à sang froid (plan.metabolisme < 1 : un insecte, un poisson, un reptile) passe la mauvaise saison
  // en diapause — un œuf, une nymphe, une bête engourdie. Quand son lieu ne produit presque plus rien, il meurt moins, ne meurt pas de faim, mange
  // moins, et se cache. Son activité : de plancher (au cœur de l'hiver) à 1 (dès que le lieu produit autant qu'en moyenne). Un monde qui le dit
  // (REGLES.diapause) ; sans cela, les insectes mouraient chaque hiver de faim, sans naître, et leurs chasseurs avec eux
  const CMP = REGLES.concurrence_masse > 0 ? (m1, m2) => { const d = Math.log10((m1 || 1) / (m2 || 1)); return Math.exp(-(d * d) / (2 * REGLES.concurrence_masse ** 2)); } : null;
  // (docs/53) ce qu'une proie offre en un cycle de référence : ce qui est sur pied, et ce qui en naît dans ce temps (sa natalité de l'année)
  const DOM = REGLES.domination > 0 ? (a, b) => (a.metabolisme ?? 1) < 1 || (b.metabolisme ?? 1) < 1 ? 1 : Math.pow((b.masse_kg || 1) / (a.masse_kg || 1), REGLES.domination) : null;   // (le poids de b devant a ; entre bêtes à sang chaud)
  const REC = !!REGLES.recouvrement;   // (docs/53 : la concurrence suit la quête de chacun, plus bas dans commune)
  const REN = REGLES.renouvellement > 0 ? pl => 1 + Math.max(0, pl.natalite ?? 0) * REGLES.renouvellement / 365.25 : null;
  const DIA = REGLES.diapause && SL ? (pl, b) => (pl.metabolisme ?? 1) < 1 && b ? clamp((prodS(b) - .3) / .7, REGLES.diapause.plancher ?? .1, 1) : 1 : null;
  // l'hiver et l'été d'un lieu (les routes de l'hiver) : dans un monde au calendrier, ceux de son climat
  const axesAc = new Map(), axesA = SL ? (x, ph) => { const k = x.id + '|' + ph; let v = axesAc.get(k); if (!v) axesAc.set(k, v = (x.normales ? CALEN.saisonLieu(x, CALEN.dateDeLaPhase(x, ph, JOURC))?.axes : null) ?? axesSaison(x, ph)); return v; } : axesSaison;
  const SMe = MET && inst.monde?.meteo ? MET.preparer({ monde: inst.monde, biomes, n, axes: axesS }) : null; if (SMe) ev.push(...SMe.evenements);
  const axesCycle = SMe ? b => SMe.axes(b, axesS(b)) : axesS, prodCycle = SMe ? b => prodS(b) * SMe.production(b) : prodS;
  const SR = PON && inst.monde?.ponte ? PON.preparer({ taxons: tousT, biomes }) : null;   // (docs/25) les pondeurs, les mangeurs d'œufs, les nids pillés
  const SV = STA && inst.monde?.stades ? STA.preparer() : null;   // (docs/26) les cycles de vie
  const SCa = CAS && inst.monde?.castes ? CAS.preparer() : null;   // (docs/33) les colonies
  const ES = ESP && inst.monde?.esprit ? ESP.preparer({ taxons: inst.taxons, biomes }) : null;   // (docs/34) ce que savent les populations
  const ME = MEM && inst.monde?.memoire ? MEM.preparer({ appetence, mefiance: apprendre }) : null;   // (docs/50) ce que les populations ont appris des joueurs ; rien n'y touche aux effectifs
  // la capacité de chaque lieu (moteur/noyau/habitat.js, docs/59 : l'habitat est un module du cœur ; le câblage des mécanismes, ici)
  HAB.capacites({ REGLES, SM, biomes, opt, parPas, prB });

  // 1b. les catastrophes : un incendie, une crue, une sécheresse peut frapper un biome ; sa capacité tombe (elle regagnera
  //     lentement sa valeur de base) et une part des bêtes qui ne peuvent s'y soustraire meurt sur le coup
  // (moteur/noyau/habitat.js, docs/59)
  const sinistres = HAB.catastrophes({ PAS, R, REGLES, SMe, axesCycle, biomes, ev, phaseDe });

  // 2. l'état de départ : par taxon, les plans de chaque phénotype ; par biome, la biomasse qui pèse sur la capacité
  //    (les herbivores en entier, les omnivores et les charognards en partie, les carnivores pas du tout : eux vivent des proies)
  // (moteur/noyau/depart.js, docs/59 : l'état de départ est un module du cœur ; il reçoit ce qu'il lit, et rend l'état de chaque lignée
  //  et la biomasse de chaque lieu)
  const { etat, B } = DEP.etatDeDepart({ GEN, ME, REGLES, SEX, biomes, cat, taxons });

  // 2c. la vie synthétique (docs/16) : rien, s'il n'y a ni Mère ni machine
  const SY = SYN ? SYN.preparer({ inst, n, biomes, taxons, etat, phase, axesSaison, charge, BANDE, PART_K, REGLES, ev, convenance }) : null;

  // 2d. la flore (docs/17) : la nourriture de chaque brouteur ; rien, s'il n'y a pas de plantes
  const GR = GRA && inst.monde?.grammaire ? GRA.preparer({ cat, taxons }) : null;   // (docs/32) une lueur dans le noir, une décharge dans l'eau : lieu par lieu
  const SF = FLO && plantes.length ? FLO.preparer({ plantes, etat, taxons, biomes, phase, monde: inst.monde, n, saisons: REGLES.saisons, succession: SSu, sinistres, productionSaison, PART_K, recouvrement, cat, dietes: DT, ...(SL ? { saisons_lieux: SL } : {}), ...(PAS !== 1 ? { pas: PAS } : {}) }) : null;   // (docs/52 : la saison de chaque lieu, le pas de temps)

  // 2e. les souches (docs/18) : rien, si le monde n'en a pas
  const SP = PAT && inst.monde?.pathogenes ? PAT.preparer({ inst, n, biomes, taxons, etat, ev, parente }) : null;

  // 2b. qui vit où, et ce que chacun porte au début du cycle (les croisements entre lignées lisent cet état-là : l'ordre des
  //     taxons ne change rien)
  // (moteur/noyau/depart.js, docs/59)
  const { HYB, Tmap, presents, isoDe } = DEP.presences({ REGLES, SEX, etat, isolement, n, opt, taxons });

  // 3. la chaîne alimentaire, biome par biome : chaque prédateur prélève des proies selon ce qui est à sa portée ;
  //    sa satiété décide de ses naissances et de sa faim ; la vulnérabilité de chaque phénotype de proie décide qui est mangé.
  //    L'appétence se calcule entre taxons (plan de base) ; les phénotypes se partagent ensuite au prorata de ce qu'ils pèsent.
  // (moteur/noyau/predation.js, docs/59 : le partage des proies est un module du cœur ; il reçoit ce qu'il lit, et ne rend que les rations,
  //  les satiétés et la prédation de chaque population)
  // (vitesse) ce qu'un lieu voisin convient à une lignée qui essaime : une fois par cycle, non une fois par population et par jour
  const CVc = new WeakMap(), CONV = (pl, v) => { let m = CVc.get(pl); if (!m) CVc.set(pl, m = new Map()); let c = m.get(v); if (c === undefined) { c = convenance(pl, biomes[v]); m.set(v, c); } return c; };
  PRED.partager({ biomes, taxons, etat, REGLES, PAS, DT, DI, GR, SCa, ES, DIA, CMP, DOM, REC, REN, CHAROGNE, mortalite, appetence, SY, B, prodCycle, parPas });

  // 4. la dynamique, taxon par taxon
  // (moteur/noyau/dynamique.js, docs/59 : la dynamique de chaque lignée est un module du cœur ; il reçoit ce qu'il lit, et rend les
  //  migrations, à appliquer ici)
  const migrations = DYN.vivre({ B, CONV, DIA, DT, ES, GEN, HOMJ, HYB, JOURC, ME, MILT, MT, PAS, R, REGLES, RM, SCa, SEX, SF, SL, SMe, SP, SR, SV, SY, attraitDe, axesA, axesCycle, biomes, cat, convenance, croissance, etat, ev, gauss, inst, isoDe, n, opt, parPas, phase, prT, presents, prodCycle, routeHiver, saison, sinistres, taxons, CALEN, CLI, DI });

  // 5. les arrivées
  // (moteur/noyau/arrivees.js, docs/59 : les arrivées sont un module du cœur ; il reçoit ce qu'il lit, et écrit dans les populations)
  ARR.arriver({ GEN, ME, PAS, SEX, Tmap, etat, inst, migrations, n });

  if (SP) SP.apres();   // la contagion, la guérison, les souches qui naissent et s'éteignent (docs/18)
  if (SF) SF.apres();   // la pousse des plantes, sous la dent des brouteurs (docs/17)
  if (SY) SY.apres();   // la ferraille, le minerai, la Mère, les erreurs de copie, les transferts (docs/16)

  // 6. séparation de lignées, extinctions, écriture des taxons
  // (moteur/noyau/lignees.js, docs/59 : la séparation des lignées, puis leur écriture et les extinctions, sont un module du cœur ;
  //  il reçoit ce qu'il lit ; separer ajoute à taxons et à etat les lignées neuves, ecrire rend celles à publier)
  LIG.separer({ DT, GEN, PAS, R, REGLES, SR, biomes, cat, deriver, dist, etat, ev, inst, n, parPas, taxons, tousT, DER, DI, FOR, PON });

  const sortie = LIG.ecrire({ GEN, ME, PAS, REGLES, SEX, SF, SP, SY, apprendre, biomes, cat, ecrireQ, etat, ev, n, opt, prT, taxons });

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
  let SDi = null; if (SF && DIV && inst.monde?.diversite) { SDi = DIV.vivre(plantes, { n, biomes, monde: inst.monde, ids: new Set([...inst.taxons, ...sortie, ...plantes].map(t => t.id)) }); ev.push(...SDi.evenements); }   // (docs/48) la flore riche : la place, les séparations, les lieux gagnés, les extinctions
  if (SF) sortie.push(...SF.ecrire());   // les plantes (docs/17)

  // 7. le catalogue de l'instantané : les traits réellement portés
  // (dans l'ordre du catalogue : c'est lui qui dit qui masque qui, docs/9)
  // (moteur/noyau/lignees.js, docs/59)
  const traits = LIG.traitsPortes({ cat, sortie });
  const duree = opt.duree_ms ?? 86400000, d0 = Date.parse(inst.cycle.date);
  return {
    orvane: CONTRAT, monde: (m => m === inst.monde ? clone(m) : m)((m => SDi ? SDi.monde(m) : m)((m => SP ? SP.monde(m) : m)((m => SY ? SY.monde(m) : m)(SN ? SN.monde(SC ? SC.monde(inst.monde) : inst.monde) : SC ? SC.monde(inst.monde) : inst.monde)))),
    cycle: { n, date: new Date((Number.isFinite(d0) ? d0 : 0) + duree).toISOString(), pressions_recues: pressions.nombre ?? 0, ...(saison ? { saison } : {}), ...(JOURC != null ? { jour: CALEN.jourIso(JOURC), lune: CALEN.lune(JOURC) } : {}) },
    // (docs/52) dans un monde au calendrier, chaque lieu publie sa saison (sa phase, son nom, sa production du jour) et son soleil
    biomes: Object.values(biomes).map(b => { if (phase == null) return b; if (!SL) return { ...b, axes_saison: axesSaison(b, phase) }; const s = SL.get(b.id);
      return { ...b, axes_saison: axesS(b), ...(s ? { saison: { phase: s.phase, nom: s.nom, production: +s.production.toFixed(3) } } : {}), ...(b.lieu && Number.isFinite(b.lieu.lat) ? { soleil: CALEN.soleil(b.lieu.lat, b.lieu.lon || 0, JOURC) } : {}) }; }), catalogue: { version: inst.catalogue?.version || '0.1', traits, ...(GEN ? { quantitatifs: clone(QUANT) } : {}), organes: CORPS.catalogueOrganes(), ...(SF ? { flore: FLO.TRAITS } : {}), ...(SDi ? { flore_riche: DIV.catalogue() } : {}), ...(SAV ? { savoirs: SAV } : {}), ...(ME ? { memoire: MEM.catalogue() } : {}), ...(MC ? { monde: MC } : {}) },
    taxons: sortie, evenements: ev
  };
}

const API = { CONTRAT, cycle, contexte, REGLES, QUANT, routeHiver, fenetreDe, planDe, coutDe, croissance, mortalite, convenance, appetence, axesSaison, deriver, rng, lireQ, penteQ, chargeQ, optimumQ, evoluerQ, melangerQ, mendel, allelesDe, portees, domDe, divergence, parente, isolement, apprendre };
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
