// Orvane — LA SIMULATION EN DIRECT, les paramètres (simulation/parametres.js)
// Tous les réglages d'Orvane, groupe par groupe : leur nom, ce qu'ils font, le fichier et le chapitre qui les décrivent. Les valeurs
// et les défauts viennent du moteur lui-même (simulation/noyau.js) : un réglage que ce fichier ne nomme pas apparaît quand même,
// sous sa clé. Rien n'est caché : chaque nombre, chaque interrupteur des REGLES de chaque module, des catalogues et du profil.
'use strict';
(function (racine) {
// les groupes, dans l'ordre de la page ; « page » : le réglage vit dans la page (les individus), pas dans le moteur
const GROUPES = [
  { id: 'orvane', titre: 'Le moteur', sous: 'la vie des populations, la chaîne alimentaire, la génétique', doc: 'moteur/orvane.js', mecanisme: null },
  { id: 'quant', titre: 'Les traits continus', sous: 'taille, vitesse, audace, sociabilité : héritabilité, sélection, optimum', doc: 'docs/8' },
  { id: 'traits', titre: 'Le catalogue des traits', sous: 'le coût, la vulnérabilité, la chasse, l\'attrait et les écarts de chaque trait', doc: 'moteur/catalogue.js, docs/3' },
  { id: 'climat', titre: 'Le climat et la géologie', sous: 'les âges glaciaires, la mer, les ponts de terre, les îles', doc: 'docs/31', mecanisme: 'climat' },
  { id: 'flore', titre: 'La flore', sous: 'le broutage, la repousse, les défenses, la pollinisation', doc: 'docs/17', mecanisme: 'flore' },
  { id: 'flore-formes', titre: 'La flore : les formes', sous: 'hauteur, masse et pousse de chaque forme de plante', doc: 'docs/17', mecanisme: 'flore' },
  { id: 'flore-traits', titre: 'La flore : les défenses', sous: 'toxique, épineux', doc: 'docs/17', mecanisme: 'flore' },
  { id: 'pathogenes', titre: 'Les souches', sous: 'émergence, guérison, contagion entre lignées', doc: 'docs/18', mecanisme: 'pathogenes' },
  { id: 'milieu', titre: 'Le milieu transformé', sous: 'pâturage, terriers, barrages, ce que font les joueurs aux lieux', doc: 'docs/22', mecanisme: 'milieu' },
  { id: 'milieu-traits', titre: 'Le milieu : les bâtisseurs', sous: 'les traits qui transforment', doc: 'docs/22', mecanisme: 'milieu' },
  { id: 'synthetique', titre: 'La vie synthétique', sous: 'la Mère, l\'énergie, l\'usure, la régulation, la défense', doc: 'docs/16', mecanisme: 'synthetique' },
  { id: 'ponte', titre: 'Pondre ou mettre bas', sous: 'les œufs, le froid, les nids pillés', doc: 'docs/25', mecanisme: 'ponte' },
  { id: 'ponte-traits', titre: 'La ponte : les traits', sous: 'le mangeur d\'œufs…', doc: 'docs/25', mecanisme: 'ponte' },
  { id: 'stades', titre: 'Les cycles de vie', sous: 'la larve et l\'adulte, la métamorphose', doc: 'docs/26', mecanisme: 'stades' },
  { id: 'stades-traits', titre: 'Les cycles de vie : les traits', sous: 'la métamorphose', doc: 'docs/26', mecanisme: 'stades' },
  { id: 'invention', titre: 'Les traits inventés', sous: 'la duplication, la fusion de traits', doc: 'docs/27', mecanisme: 'invention' },
  { id: 'natures', titre: 'Les lieux qui changent de nature', sous: 'une forêt défrichée devient une prairie', doc: 'docs/28', mecanisme: 'natures' },
  { id: 'derives', titre: 'Les dérives', sous: 'les régimes, les plantes, les souches qui mutent, les insectes vecteurs', doc: 'docs/29', mecanisme: 'derives' },
  { id: 'dietes', titre: 'Les régimes en spectre', sous: 'feuilles, fruits, graines, nectar, insectes, viande, sang', doc: 'docs/30', mecanisme: 'dietes' },
  { id: 'dietes-rendement', titre: 'Les régimes : le rendement', sous: 'ce que rend chaque part d\'une plante', doc: 'docs/30', mecanisme: 'dietes' },
  { id: 'dietes-defense', titre: 'Les régimes : les défenses', sous: 'ce que chaque défense retire à chaque part', doc: 'docs/30', mecanisme: 'dietes' },
  { id: 'dietes-perte', titre: 'Les régimes : la perte', sous: 'ce qu\'une bouchée prend à la plante', doc: 'docs/30', mecanisme: 'dietes' },
  { id: 'grammaire', titre: 'La grammaire des effets', sous: 'une lueur qui attire, une décharge qui foudroie', doc: 'docs/32', mecanisme: 'grammaire' },
  { id: 'castes', titre: 'Les castes', sous: 'une reine, des ouvrières, des soldats', doc: 'docs/33', mecanisme: 'castes' },
  { id: 'castes-traits', titre: 'Les castes : les traits', sous: '', doc: 'docs/33', mecanisme: 'castes' },
  { id: 'esprit', titre: 'L\'esprit', sous: 'apprendre, transmettre, oublier, la curiosité', doc: 'docs/34', mecanisme: 'esprit' },
  { id: 'esprit-traits', titre: 'L\'esprit : les traits', sous: '', doc: 'docs/34', mecanisme: 'esprit' },
  { id: 'esprit-savoirs', titre: 'L\'esprit : les savoirs', sous: 'ce que vaut chaque savoir', doc: 'docs/34', mecanisme: 'esprit' },
  { id: 'collectif', titre: 'La vie en groupe', sous: 'troupeaux, meutes, bancs, migrations des saisons', doc: 'docs/38', mecanisme: 'collectif' },
  { id: 'chronique', titre: 'La chronique', sous: 'ce que le journal garde, la cause d\'une extinction', doc: 'docs/37' },
  { id: 'individus', titre: 'Les individus', sous: 'la consanguinité, ce qu\'un petit apprend, les hybrides (les bêtes dessinées)', doc: 'docs/35, 36', page: true },
  { id: 'compagnon', titre: 'Le compagnon', sous: 'la bête que vous élevez : son temps, sa faim, son sommeil, sa confiance, ses maladies', doc: 'simulation/compagnon.js', page: true },
  { id: 'parcelles', titre: 'Les parcelles', sous: 'pour un monde par parcelles (le monde solo tourne par biome)', doc: 'docs/15' },
  { id: 'profil', titre: 'Le tampon : le profil', sous: 'ce que pèsent les gestes du joueur, ses plafonds ; ce que voit le jeu', doc: 'docs/4, 5, 12' }
];
// les sections du moteur : chaque règle de moteur/orvane.js à sa place
const SECTIONS_ORVANE = {
  'Évolution': ['mutation', 'nouveau_trait', 'max_phenotypes', 'max_taxons', 'separation', 'derive', 'vol_masse_max'],
  'Démographie et migrations': ['migration', 'seuil_surpeuple', 'regain_habitat', 'memoire_eteint', 'effondrement', 'explosion', 'menace', 'dispersion', 'fuite'],
  'La chaîne alimentaire': ['besoin', 'conversion', 'demi_satiete', 'predation_max', 'chasse_omnivore', 'omnivore_vegetal', 'omnivore_vegetal_base', 'longevite_predateur', 'viande_omnivore', 'faim_carnivore', 'detritivore_vegetal', 'vers_carnivore', 'faim_migration', 'report_proies'],
  'Saisons, maladies, catastrophes': ['saisons', 'maladie', 'catastrophes'],
  'Génétique et reproduction': ['genetique', 'sexe', 'hybride'],
  'Méfiance et habituation': ['mefiance']
};
// les noms : par chemin complet (groupe.chemin), puis par clé seule ; [libellé, explication]
const NOMS = {
  'orvane.mutation': ['Mutation', 'part des naissances qui changent de phénotype'],
  'orvane.nouveau_trait': ['Trait nouveau', 'chance, par lignée et par cycle, qu\'un trait admissible apparaisse'],
  'orvane.migration': ['Migration', 'part qui part vers les voisins quand le lieu est saturé'],
  'orvane.seuil_surpeuple': ['Seuil de surpeuplement', 'saturation (biomasse / capacité) au-delà de laquelle on migre'],
  'orvane.separation.cycles': ['Séparation : ancienneté', 'cycles d\'installation avant qu\'une population puisse se séparer'],
  'orvane.separation.effectif': ['Séparation : effectif', 'effectif minimal d\'une population qui se sépare'],
  'orvane.separation.distance': ['Séparation : distance', 'hors de sa niche, en tolérances'],
  'orvane.separation.chance': ['Séparation : chance', 'par cycle, quand les conditions sont réunies'],
  'orvane.separation.flux': ['Séparation : flux qui empêche', 'un flux de gènes reçu au-dessus empêche la séparation'],
  'orvane.separation.divergence': ['Séparation : divergence', 'assez divergente du reste de l\'espèce, elle se sépare où qu\'elle soit'],
  'orvane.memoire_eteint': ['Mémoire d\'une lignée éteinte', 'cycles pendant lesquels elle reste listée'],
  'orvane.regain_habitat': ['Regain de l\'habitat', 'part de l\'écart à la capacité de base regagnée par cycle'],
  'orvane.effondrement': ['Seuil d\'effondrement', 'tendance qui fait un événement « effondrement »'],
  'orvane.explosion': ['Seuil d\'explosion', 'tendance qui fait un événement « explosion »'],
  'orvane.menace': ['Seuil de menace', 'effectif total sous lequel une lignée est menacée'],
  'orvane.max_phenotypes': ['Phénotypes au plus', 'au-delà, les plus rares sont fondus dans le plan de base'],
  'orvane.max_taxons': ['Lignées au plus', 'au-delà, plus de séparation (vide : sans limite)'],
  'orvane.besoin': ['Besoin d\'un prédateur', 'kg de proies par cycle et par kg^0,75 de prédateur'],
  'orvane.conversion': ['Conversion', 'part de la viande mangée qui devient des petits'],
  'orvane.demi_satiete': ['Demi-satiété', 'à autant de fois son besoin disponible, un prédateur est rassasié à moitié'],
  'orvane.predation_max': ['Prédation au plus', 'part d\'une population de proies qu\'un cycle peut retirer'],
  'orvane.chasse_omnivore': ['Chasse d\'un omnivore', 'un omnivore chasse moins bien qu\'un carnivore'],
  'orvane.omnivore_vegetal': ['Plantes d\'un carnivore devenu omnivore', 'ce qu\'il tire des plantes, rapporté à un herbivore'],
  'orvane.omnivore_vegetal_base': ['Plantes d\'un omnivore de naissance', 'rapporté à un herbivore'],
  'orvane.longevite_predateur': ['Longévité d\'un prédateur', 'un carnivore né de la dérive vit au moins autant de fois ce que sa viande remplace'],
  'orvane.viande_omnivore': ['Viande d\'un omnivore', 'la part de viande dans ce qu\'il mange'],
  'orvane.faim_carnivore': ['Faim d\'un carnivore', 'un carnivore affamé meurt plus'],
  'orvane.detritivore_vegetal': ['Place d\'un détritivore', 'rapportée à un herbivore'],
  'orvane.vers_carnivore': ['Vers le carnivore', 'à la dérive du régime, chance qu\'un omnivore devienne carnivore'],
  'orvane.faim_migration': ['Faim qui fait partir', 'satiété sous laquelle un prédateur va chercher ailleurs'],
  'orvane.dispersion': ['Dispersion', 'part qui part chaque cycle vers les parcelles voisines (mondes par parcelles)'],
  'orvane.fuite': ['Fuite', 'au-delà de la capacité, part de l\'excès qui fuit vers les voisins'],
  'orvane.report_proies': ['Report sur la proie abondante', '1 : au prorata ; 2 : fort'],
  'orvane.saisons.temperature': ['Saisons : température', 'amplitude sur l\'axe'], 'orvane.saisons.lumiere': ['Saisons : lumière', 'amplitude sur l\'axe'],
  'orvane.saisons.humidite': ['Saisons : humidité', 'amplitude sur l\'axe'], 'orvane.saisons.capacite': ['Saisons : production', 'amplitude sur la capacité'],
  'orvane.maladie.chance': ['Maladie : éclosion', 'par population et par cycle, × le surpeuplement'], 'orvane.maladie.duree': ['Maladie : durée', 'en cycles, tirée entre les deux'],
  'orvane.maladie.virulence': ['Maladie : virulence', 'tirée entre les deux'], 'orvane.maladie.contagion': ['Maladie : contagion', 'chance de gagner les voisins'],
  'orvane.catastrophes.incendie': ['Incendie', 'le couvert dense et sec, surtout l\'été'], 'orvane.catastrophes.crue': ['Crue', 'les sols humides et bas, surtout au printemps'], 'orvane.catastrophes.secheresse': ['Sécheresse', 'les sols secs, en été'],
  'orvane.derive.masse': ['Dérive : masse', 'bornes du facteur de masse à la séparation'], 'orvane.derive.regime': ['Dérive : régime', 'chance de changer de régime'],
  'orvane.derive.locomotion': ['Dérive : locomotion', 'chance de changer de locomotion'], 'orvane.derive.activite': ['Dérive : heure', 'chance de changer d\'heure d\'activité'],
  'orvane.derive.corps': ['Dérive : silhouette', 'ampleur de la dérive du corps'], 'orvane.derive.tolerance': ['Dérive : largeur de niche', '0 : figée'],
  'orvane.vol_masse_max': ['Masse de vol au plus', 'au-delà (kg), une lignée perd le vol'],
  'orvane.genetique': ['Génétique continue', 'les traits continus (docs/8)'],
  'orvane.hybride.actif': ['Hybrides', 'deux lignées apparentées se croisent (docs/10)'], 'orvane.hybride.rencontre': ['Hybrides : rencontre', 'part des accouplements possibles'],
  'orvane.hybride.tau': ['Hybrides : temps', 'en cycles, l\'isolement par le temps'], 'orvane.hybride.masse': ['Hybrides : masse', 'poids de l\'écart de masse'],
  'orvane.hybride.corps': ['Hybrides : corps', 'poids de l\'écart de silhouette'], 'orvane.hybride.niche': ['Hybrides : niche', 'poids de l\'écart de niche'], 'orvane.hybride.zone': ['Hybrides : zone', 'part des naissances qui fait une zone hybride'],
  'orvane.mefiance.actif': ['Méfiance', 'les populations apprennent des joueurs (docs/12)'], 'orvane.mefiance.demi_vie': ['Méfiance : demi-vie', 'cycles pour qu\'elle retombe de moitié'],
  'orvane.mefiance.demi_vie_habitude': ['Habituation : demi-vie', 'en cycles'], 'orvane.mefiance.preuve': ['Méfiance : preuve', 'contacts qui la fixent aux deux tiers'],
  'orvane.mefiance.sensibilite': ['Méfiance : sensibilité', 'ce que pèse la part des contacts qui finissent mal'], 'orvane.mefiance.habitude': ['Habituation', 'contacts sans suite qui habituent aux deux tiers'],
  'orvane.mefiance.oubli': ['Méfiance : oubli', 'vitesse à laquelle des contacts paisibles la défont'], 'orvane.mefiance.paix': ['Méfiance : paix', 'combien les contacts qui finissent mal empêchent de s\'habituer'],
  'orvane.mefiance.audace': ['Méfiance : audace', 'ce que l\'audace moyenne change'], 'orvane.mefiance.alerte': ['Méfiance : alerte', 'seuil d\'un événement'],
  'orvane.sexe.actif': ['Reproduction sexuée', 'Mendel, les allèles (docs/9) ; sinon clonal'], 'orvane.sexe.gain': ['Allèles : gain', 'mutation par allèle et par génération'],
  'orvane.sexe.perte': ['Allèles : perte', 'mutation par allèle et par génération'], 'orvane.sexe.attrait': ['Attrait', 'exposant du choix des pères'],
  'orvane.sexe.nouveau.dominant': ['Allèle neuf dominant', 'fréquence de départ'], 'orvane.sexe.nouveau.recessif': ['Allèle neuf récessif', 'fréquence de départ'],
  'climat.ondes': ['Ondes', 'les grands cycles du climat : période (cycles), ampleur, phase'], 'climat.marche.pas': ['Marche au hasard : pas', 'par cycle'], 'climat.marche.retour': ['Marche au hasard : rappel', 'vers zéro'],
  'climat.humidite': ['Humidité', 'ce que l\'humidité suit de la température (le froid est sec)'], 'climat.sentis.marin': ['Senti en mer', 'ce qu\'un lieu marin sent de l\'écart'], 'climat.sentis.souterrain': ['Senti sous terre', ''],
  'climat.vitesse': ['Vitesse du climat', 'accélère le temps du climat'], 'climat.force': ['Écart imposé', 'à la place des ondes et de la marche (vide : aucun)'],
  'climat.ponts.emerger': ['Ponts : émergent', 'la mer baisse sous cet écart'], 'climat.ponts.sombrer': ['Ponts : sombrent', 'au-dessus de cet écart'], 'climat.ponts.max': ['Ponts au plus', ''],
  'climat.iles.chance': ['Îles : chance', 'par cycle'], 'climat.iles.max': ['Îles au plus', ''], 'climat.iles.surface': ['Îles : surface', 'part de la place d\'un rivage'], 'climat.iles.depart': ['Îles : départ', 'part de la surface au début'],
  'climat.iles.maturite': ['Îles : maturité', 'cycles pour atteindre leur surface'], 'climat.iles.plantes': ['Îles : plantes', 'part des plantes du rivage'], 'climat.iles.derive': ['Îles : arrivées', 'par cycle, de qui passe'], 'climat.signal': ['Signal', 'un événement quand l\'écart a bougé de tant'],
  'flore.broutage': ['Broutage', 'ce qu\'un kg de brouteur prélève par cycle'], 'flore.prise_max': ['Prise au plus', 'part d\'une plante qui disparaît en un cycle'], 'flore.mutation': ['Mutation', 'part des pousses qui changent de défense'],
  'flore.pollinisation.gain': ['Pollinisation : gain', 'repousse en plus'], 'flore.pollinisation.demi': ['Pollinisation : demi', 'part de la place des butineurs à mi-effet'], 'flore.renouveau': ['Renouveau', 'part des pieds qui meurent et repoussent'],
  'flore.declin': ['Déclin', 'la place la plus négative'], 'flore.rodage': ['Rodage', 'cycles d\'équilibre à l\'éveil'], 'flore.ratio': ['Ratio', 'la nourriture d\'un brouteur, bornée'], 'flore.concurrence': ['Concurrence', 'bornée'],
  'pathogenes.emergence': ['Émergence', 'chance qu\'une souche naisse'], 'pathogenes.guerison': ['Guérison', 'part des infectés qui guérissent'], 'pathogenes.oubli': ['Oubli', 'part des immunisés qui redeviennent sensibles'],
  'pathogenes.voisinage': ['Voisinage', 'ce que transmettent les parcelles voisines'], 'pathogenes.adaptation': ['Adaptation', 'contagion chez une autre lignée'], 'pathogenes.croisement': ['Croisement', 'ce qu\'une autre lignée du lieu transmet'],
  'pathogenes.parente': ['Parenté', 'en cycles'], 'pathogenes.masse': ['Masse', 'écart de taille'], 'pathogenes.depart': ['Départ', 'part infectée à la naissance d\'une souche'], 'pathogenes.seuil': ['Seuil', 'une souche sans infecté s\'éteint'],
  'milieu.vitesse': ['Vitesse', 'part de l\'écart à sa cible par cycle'], 'milieu.retour': ['Retour', 'ce que le jeu a fait s\'efface'], 'milieu.jeu.unite': ['Une unité de geste', 'unités de capacité transformées'], 'milieu.jeu.max': ['Geste au plus', 'part du lieu par cycle et par axe'],
  'synthetique.surface': ['Surface', 'ce qu\'un biome offre à capter'], 'synthetique.minerai': ['Minerai', 'd\'un biome de richesse 1 (kg)'], 'synthetique.jour': ['Jour', 'la durée du jour'],
  'ponte.oeufs': ['Œufs', 'un pondeur a autant de fois plus de petits'], 'ponte.froid.seuil': ['Froid : seuil', 'sous cette température, des œufs se perdent'], 'ponte.froid.perte': ['Froid : perte', 'au plus'],
  'ponte.pillage.max': ['Pillage au plus', 'part des nids pillés'], 'ponte.pillage.demi': ['Pillage : demi', ''], 'ponte.pillage.garde': ['Nid gardé', 'pillé d\'autant moins'], 'ponte.festin': ['Festin', 'un mangeur d\'œufs a plus de petits'],
  'stades.soulagement': ['Soulagement', 'entassement en moins entre larve et adulte'], 'stades.larves': ['Larves', 'part des bêtes qui sont des larves'], 'stades.publier': ['Publier', 'dès cette part de la lignée'],
  'invention.chance': ['Chance', 'qu\'un trait soit inventé'], 'invention.max': ['Au plus', 'traits inventés'], 'invention.fusion': ['Fusion', 'chance qu\'une invention fusionne deux traits'],
  'natures.marge': ['Marge', 'écart qui fait changer de nature'], 'natures.inedit': ['Inédit', 'distance qui fait une nature inédite'], 'natures.max': ['Au plus', 'natures inédites'],
  'esprit.invention': ['Invention', 'chance d\'inventer un savoir'], 'esprit.imitation': ['Imitation', ''], 'esprit.oubli': ['Oubli', ''], 'esprit.curiosite': ['Curiosité', ''],
  'collectif.seuils.famille': ['Seuil de la famille', 'sociabilité sous laquelle on vit seul'], 'collectif.seuils.groupe': ['Seuil du groupe', 'au-delà, on vit en groupe'],
  'chronique.derniers': ['Entrées gardées', ''], 'chronique.annee': ['Année', 'si le monde n\'en a pas'],
  'individus.profondeur': ['Ascendance gardée', 'générations'], 'individus.depression': ['Dépression de consanguinité', 'vigueur perdue à consanguinité 1'], 'individus.apprendre_mere': ['Apprendre de sa mère', 'chance qu\'un petit sache ce que sait sa mère'],
  'compagnon.vitesse': ['Le temps du compagnon', '1 : le temps réel ; 60 : une heure par minute'], 'compagnon.heures_par_cycle': ['Un cycle de vie', 'en heures : sa longévité et sa maturité s\'y comptent'],
  'compagnon.doux': ['Mode doux', 'pendant votre absence, quelqu\'un veille : ses besoins ne tombent pas sous le plancher'], 'compagnon.plancher': ['Plancher du mode doux', ''],
  'compagnon.faim': ['Faim', 'satiété perdue par heure, à 1 kg (× masse^-0,12)'], 'compagnon.repas': ['Un repas', 'satiété rendue par un repas qu\'il aime'], 'compagnon.fatigue': ['Fatigue', 'énergie perdue par heure éveillé'],
  'compagnon.repos': ['Repos', 'énergie regagnée par heure de sommeil'], 'compagnon.ennui': ['Ennui', 'humeur perdue par heure, × (1 + sa sociabilité)'], 'compagnon.jeu': ['Un jeu', 'humeur rendue'], 'compagnon.caresse': ['Une caresse', 'humeur rendue'],
  'compagnon.digestion': ['Digestion', 'heures pour qu\'un repas fasse une crotte'], 'compagnon.crottes_max': ['Crottes au plus', ''], 'compagnon.salete': ['Saleté', 'propreté ôtée par crotte'],
  'compagnon.guerison': ['Guérison', 'santé regagnée par heure quand tout va bien'], 'compagnon.famine': ['Famine', 'santé perdue par heure, affamé'], 'compagnon.malpropre': ['Malpropreté', 'santé perdue par heure, enclos sale'], 'compagnon.inconfort': ['Inconfort', 'santé perdue par heure, habitat qui ne lui va pas'],
  'compagnon.maladie': ['Maladie', 'par heure : tomber malade, l\'épidémie de sa lignée, guérir seul, un soin qui réussit'], 'compagnon.confiance': ['Confiance', 'au départ, l\'audace, ce que chaque geste rapporte, l\'abandon'],
  'compagnon.dressage': ['Dressage', 'une leçon, la confiance qu\'il faut'], 'compagnon.incubation': ['Incubation', 'cycles de vie pour qu\'un œuf éclose'], 'compagnon.vieillesse': ['Vieillesse', 'chance de mourir par heure au-delà de sa longévité'], 'compagnon.pas_max': ['Pas de calcul', 'secondes de son temps calculées d\'un coup'],
  'profil.influence.denormaliser': ['Dénormaliser', 'rapporter les comptes à la fréquence exposée (docs/4)'], 'profil.influence.exposition_ref': ['Activité normale', 'rencontres par compte et par cycle'],
  'profil.influence.memoire_cycles': ['Mémoire', 'cycles sur lesquels les pressions sont lissées'], 'profil.influence.pseudo_comptes': ['Pseudo-comptes', 'lissage de la dénormalisation'],
  'profil.influence.plafonds.par_compte_cycle': ['Plafond par compte', 'pression d\'un compte sur une lignée par cycle (vide : aucun)'], 'profil.influence.plafonds.part_max_compte': ['Part d\'un compte au plus', '(vide : aucune)'],
  'profil.influence.plafonds.part_max_population': ['Part d\'une population au plus', 'qu\'un cycle de pressions peut retirer'], 'profil.influence.plafonds.part_max_jeu': ['Part d\'un jeu au plus', ''],
  'profil.exposition.compression.defaut': ['Compression', 'k appliqué à la cote d\'un phénotype montré (1 : tel quel)'], 'profil.exposition.propagation_cycles': ['Propagation', 'cycles pour étaler un changement côté jeu'],
  'profil.exposition.seuil_extinction_jeu': ['Seuil d\'apparition', 'effectif sous lequel la page ne dessine plus une population'], 'profil.exposition.inertie_max': ['Inertie', 'variation d\'une fréquence montrée par cycle'],
  'profil.exposition.mefiance.rendue': ['Méfiance rendue', 'les bêtes fuient le joueur selon ce qu\'elles ont appris'], 'profil.exposition.mefiance.fuite': ['Fuite à méfiance 1', 'facteur de la distance de fuite'],
  'profil.exposition.mefiance.habitude': ['Fuite à habituation 1', 'facteur de la distance de fuite'], 'profil.exposition.quantitatifs.variation': ['Variation montrée', 'part de la variation individuelle (taille, vitesse) que montrent les bêtes']
};
const CLES = {
  cout: 'coût', vulnerabilite: 'vulnérabilité', chasse: 'chasse', attrait: 'attrait', ecarts: 'écarts', masse_kg: 'masse', taille_m: 'taille', vitesse_rel: 'vitesse', maturite: 'maturité', longevite: 'longévité',
  portee: 'portée', temperament: 'tempérament', perception: 'perception', sociabilite: 'sociabilité', resistance: 'résistance', maladie: 'maladie', fecondite: 'fécondité', predation: 'prédation', h2: 'héritabilité (h²)',
  omega2: 'sélection stabilisante (ω²)', echelle: 'échelle', optimum: 'optimum', pente: 'pente', chance: 'chance', duree: 'durée', virulence: 'virulence', contagion: 'contagion', capacite: 'capacité', mortalite: 'mortalité',
  temperature: 'température', humidite: 'humidité', altitude: 'altitude', lumiere: 'lumière', couvert: 'couvert', effet: 'effet', gain: 'gain', demi: 'demi', max: 'au plus', min: 'au moins', part: 'part', seuil: 'seuil',
  periode: 'période', ampleur: 'ampleur', regime: 'régime', defenses: 'défenses', epineux: 'épineux', ecart: 'écart', piqure: 'piqûre', vecteur: 'vecteur', souches: 'souches', plantes: 'plantes', reproduction: 'reproduction', phase: 'phase', h: 'hauteur (m)', m: 'masse (kg)', r: 'pousse', actif: 'actif', cycles: 'cycles', effectif: 'effectif', poids: 'poids', taille: 'taille', fertilite: 'fertilité'
};
// les mécanismes : leur nom et ce qu'ils font, pour les interrupteurs
const MECANISMES = {
  synthetique: ['La vie synthétique', 'la Mère et ses machines, au volcan (docs/16)'], flore: ['La flore', 'les plantes, broutées, défendues, pollinisées (docs/17) — une fois éveillée, elle tourne'],
  invention: ['Les traits inventés', 'le monde invente des traits (docs/27)'], stades: ['Les cycles de vie', 'larves et adultes, la métamorphose (docs/26)'], ponte: ['Pondre ou mettre bas', 'les œufs, les nids (docs/25)'],
  milieu: ['Le milieu transformé', 'pâturage, terriers, barrages, gestes du joueur sur les lieux (docs/22)'], natures: ['Les natures', 'les lieux changent de nature (docs/28, avec le milieu)'],
  derives: ['Les dérives', 'régimes, plantes et souches qui dérivent (docs/29)'], dietes: ['Les régimes en spectre', 'feuilles, fruits, graines, nectar, insectes, viande, sang (docs/30)'],
  climat: ['Le climat', 'âges glaciaires, mer, ponts de terre, îles (docs/31)'], grammaire: ['La grammaire', 'des traits d\'un genre neuf (docs/32)'], castes: ['Les castes', 'colonies, reines, ouvrières (docs/33)'],
  formes: ['Les formes nouvelles', 'corps segmentés, rayonnés, à tentacules (docs/33)'], esprit: ['L\'esprit', 'savoirs, outils, curiosité (docs/34)'], collectif: ['La vie en groupe', 'troupeaux, meutes, bancs, migrations (docs/38)'],
  pathogenes: ['Les souches', 'des maladies qui circulent et immunisent (docs/18)']
};
const humain = k => (CLES[k] || String(k).replace(/_/g, ' ').replace(/>/g, ' → '));
// le nom d'un réglage : le sien, sinon celui du plus proche parent nommé suivi du reste du chemin (« Ondes 1 · période »), sinon
// ses clés en clair ; un indice de tableau compte à partir de 1 (la durée d'une maladie : « Maladie : durée 1 », son minimum)
function nom(groupe, chemin) {
  const n = NOMS[groupe + '.' + chemin]; if (n) return n;
  const S = String(chemin).split('.'), mot = k => /^\d+$/.test(k) ? String(+k + 1) : humain(k);
  for (let i = S.length - 1; i >= 1; i--) { const base = NOMS[groupe + '.' + S.slice(0, i).join('.')]; if (!base) continue;
    const reste = S.slice(i), num = reste.length && /^\d+$/.test(reste[0]) ? ' ' + mot(reste.shift()) : '';
    return [`${base[0]}${num}${reste.length ? ' · ' + reste.map(mot).join(' · ') : ''}`, base[1]]; }
  return [S.map(mot).join(' · '), ''];
}
// les feuilles d'un objet de réglages : les nombres, les interrupteurs et les valeurs vides (null, Infinity) ; les textes sont des mots
function feuilles(o, base = '') {
  const L = [];
  if (o == null || typeof o !== 'object') return L;
  for (const [k, v] of Object.entries(o)) { const c = base ? base + '.' + k : k;
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) L.push([c, v]);
    else if (v && typeof v === 'object') L.push(...feuilles(v, c)); }
  return L;
}
const sectionOrvane = chemin => { const k = String(chemin).split('.')[0]; for (const [s, cles] of Object.entries(SECTIONS_ORVANE)) if (cles.includes(k)) return s; return 'Autres règles'; };

racine.OrvaneParametres = { GROUPES, SECTIONS_ORVANE, NOMS, CLES, MECANISMES, nom, feuilles, sectionOrvane, humain };
})(globalThis);
