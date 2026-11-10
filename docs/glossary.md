# Glossary of fields (English)

Orvane's files use French field names. This page translates them all, object by object, with what each one means. The schemas (`schemas/instantane.schema.json`, `schemas/pression.schema.json`, `schemas/profil.schema.json`) have the full detail, in French. The guide in English is [CONNECT-A-GAME.md](../CONNECT-A-GAME.md).

## The instantané (`instantane.json`)

| field | English | meaning |
| --- | --- | --- |
| `instantane` | snapshot | the world as published after a cycle |
| `monde` | world | the world's identity and state (below) |
| `cycle` | cycle | `n` its number, `date`, `pressions_recues` (batches received), `saison` (season) |
| `biomes` | biomes | the places of the world (below) |
| `catalogue` | catalogue | the knowledge the world has (`savoirs`: name, `geste` gesture, `outil` tool), the definitions of the traits carried (`traits`), continuous traits (`quantitatifs`), organs (`organes`), plant defences (`flore`), the world's own catalogue (`monde`) |
| `taxons` | lineages | the living lineages (below) |
| `evenements` | events | the cycle's journal: `type`, `taxon`, `biome`, `detail` |
| `precedent` | previous | the previous cycle in light form, to spread a change over time |

### `monde` (world)

| field | English | meaning |
| --- | --- | --- |
| `id`, `nom` | id, name | |
| `graine` | seed | same seed and same pressures give the same history |
| `annee` | year | the length of a year, in cycles (0: no seasons) |
| `ne` | born | the world's birth; with `id`, its identity. A world rebuilt from scratch gets a new `ne` |
| `genese` | genesis | how the world was born (cycles, seed, ancestors) |
| `regles` | rules | engine rules specific to this world |
| `fusions` | mergers | the worlds merged into this one |
| `parcelles` | plots | the world runs by plots inside each biome |
| `mere` | Mother | the origin of synthetic life; she never dies |
| `flore` | flora | since when plants are lineages |
| `pathogenes` | pathogens | the disease strains of the world; a mutant strain gives its `parent`, a strain carried by an insect its `vecteur` (vector) |
| `solo` | solo | a solo copy of a shared world, and where it started from |
| `milieu`, `ponte`, `stades`, `invention` | medium, laying, life stages, invention | since when the land is transformed, lineages lay eggs, life cycles exist, the world invents traits |
| `derives` | drifts | since when diets, plants and strains drift |
| `esprit` | mind | since when animals learn: knowledge born, spread by imitation, carried by migrants, lost |
| `castes`, `formes` | castes, forms | since when lineages can live in colonies, and new body plans can be born |
| `grammaire` | grammar | since when the world composes traits like sentences (a means, an action, a target, a moment) |
| `climat` | climate | since when the world warms and cools by itself; the temperature and humidity shift since then, the land bridges, the islands born |
| `meteo` | weather | since when each place has its weather of the cycle (docs/45) |
| `dietes` | diet spectra | since when each lineage eats leaves, fruits, seeds, nectar, insects, meat or blood in its own shares |
| `natures` | natures | since when places can change nature, and the world's place types (`types`: those of origin, and those it invented: `inedit`) |

### `biomes[]`

| field | English | meaning |
| --- | --- | --- |
| `milieu` | medium | `terrestre` land, `aquatique` fresh water, `marin` sea, `amphibie` shore (both), `souterrain` underground, `aerien` sky |
| `axes` | axes | from 0 to 1: `temperature`, `humidite` (humidity), `altitude`, `lumiere` (light), `couvert` (cover: 0 bare, 1 dense); a world may add its own (`catalogue.monde.axes`) |
| `axes_saison` | seasonal axes | the axes as they are this season |
| `capacite`, `capacite_base` | capacity, base capacity | how much life the biome holds (abstract biomass units), and what it regains after a loss |
| `voisins` | neighbours | the biomes a population can migrate to |
| `saisons` | seasons | the seasonal swing of each axis (`false`: none) |
| `catastrophes` | disasters | `false`: sheltered from fires, floods, droughts |
| `ressources` | resources | what the place offers to machines |
| `transforme` | transformed | the land as animals and players change it: `base` (its axes when the transformation awoke), `jeu` (what players changed, fading slowly) |
| `traversees` | crossings | the neighbours reached only across the sea (a volcanic island): only flying, swimming or drifting animals pass |
| `climat`, `jeune` | climate, young | a place's axes when the climate awoke; a young island and the capacity it will reach |
| `meteo` | weather | the weather here this cycle: `temps` (`clair` clear, `couvert` overcast, `pluie` rain, `orage` thunderstorm, `neige` snow, `gel` frost, `canicule` heatwave, `tempete` storm, `brouillard` fog), `t` and `e` (heat and water departures from the season), `vent` wind, `neige` snow on the ground, `secheresse` lasting drought, `production` (what the weather does to the place's production). Also on each entry of `parcelles` |
| `nature`, `natures` | nature | the place has changed nature: the type it became (`type`, `nom`, `depuis`, `inedite`: a nature the world invented); in a world by plots, the share of its plots that changed (`natures`) |

### `taxons[]` (lineages)

| field | English | meaning |
| --- | --- | --- |
| `id` | id | stable: the key of a game's mapping table |
| `nom` | name | invented by the world |
| `parent` | parent | the lineage it split from |
| `apparu`, `eteint` | appeared, extinct | the cycle of its birth, of its extinction (`null` while alive) |
| `statut` | status | `croissance` growing, `stable`, `declin` declining, `menace` threatened, `eteint` extinct |
| `origine` | origin | it arrived from another world through a merger |
| `nom_commun`, `decrit` | common name, described | the common name the first player who described the lineage gave it, and who (`par` by, `jeu` game, `cycle`, `date`) (docs/37); the engine's `nom` stays |
| `plan` | body plan | below |
| `populations` | populations | one per biome where it lives, below |
| `phenotypes` | variants | below |

### `plan` (body plan)

| field | English | meaning |
| --- | --- | --- |
| `regime` | diet | `herbivore`, `carnivore`, `omnivore`, `detritivore` (scavenger), `filtreur` (filter feeder), `synthetique` (a machine), `vegetal` (a plant) |
| `diete`, `diete0` | diet spectrum | the shares of `feuilles` leaves, `fruits`, `graines` seeds, `nectar`, `insectes` insects, `viande` meat, `sang` blood (summing to 1); and the spectrum at its awakening |
| `famille` | family | `animale` (when absent), `synthetique`, `vegetale` |
| `masse_kg`, `taille_m` | mass (kg), length (m) | |
| `locomotion` | movement | `marche` walk, `course` run, `saut` jump, `nage` swim, `vol` fly, `fouissage` burrow, `reptation` crawl, `grimpe` climb |
| `eau` | water | for a swimmer: `douce` fresh, `salee` salt, `mixte` both |
| `longevite`, `maturite` | lifespan, maturity | in cycles |
| `portee` | litter | offspring per breeding |
| `sociabilite` | sociability | 0 solitary, 1 gregarious |
| `temperament` | temperament | 0 always flees, 1 always fights back |
| `activite` | activity | `diurne` diurnal, `nocturne` nocturnal, `crepusculaire` crepuscular, `continue` around the clock |
| `vitesse_rel` | relative speed | top speed, in body lengths per second |
| `perception` | perception | relative reach of the senses |
| `niche`, `tolerance` | niche, tolerance | the ideal biome axes, and how wide the niche is |
| `corps` | body | the silhouette (`moteur/corps.js`): `forme` (`quadrupede` quadruped, `hexapode` hexapod, `bipede` biped, `oiseau` bird, `serpent` snake, `segmente` segmented, `radiaire` radial, `tentaculaire` tentacled, or a form of the world), `pattes` (legs), proportions from 0 to 1 (`long` body length, `haut` leg height, `cou` neck, `tete` head, `museau` snout, `oreilles` ears, `queue` tail), `organes` (organs: `type`, `place`, `taille` size, `nombre` count, `forme` shape; `mains` are hands), `posture` (0 on all fours, 0.5 rearing up, 1 upright), `motif` (pattern), `couleurs` (colours: `robe` coat, `sombre` dark, `ventre` belly, `oeil` eye) |
| `reproduction`, `reproduction0` | reproduction | `ovipare` lays eggs, `vivipare` gives birth; and the mode at the awakening of laying, which births relate to |
| `castes` | castes | a lineage living in colonies: `reine` queen, `ouvrieres` workers, `soldats` soldiers (relative mass, share), `part` the share of the lineage in colonies |
| `stades` | life stages | the larva (`chenille` caterpillar, `larve` grub, `têtard` tadpole) and the adult, each with its diet and movement; `part`: the share of the lineage that metamorphoses |
| `modules`, `role` | modules, role | a machine: the level of each module, and what it mainly does |
| `forme`, `hauteur_m`, `croissance` | form, height, growth | a plant |

### `populations[]`

| field | English | meaning |
| --- | --- | --- |
| `biome` | biome | where it lives |
| `effectif` | head count | how many animals |
| `tendance` | trend | change over the cycle (−0.12 = −12 %) |
| `depuis` | since | the cycle it settled here |
| `pression`, `predation`, `maladie` | pressure, predation, disease | the share of the cycle's deaths caused by players, by predators; an ongoing epidemic |
| `satiete` | satiety | predators: how well prey suffices (0 famine, 1 well fed) |
| `quant` | continuous traits | for each (`taille` size, `vitesse` speed, `audace` boldness, `sociabilite`): mean `m`, variances |
| `alleles` | alleles | the frequency of the allele behind each trait |
| `flux`, `divergence` | gene flow, divergence | immigrants per cycle; genetic distance to the rest of the species |
| `hybride` | hybrid zone | a related lineage lives here and interbreeds |
| `mefiance`, `habituation` | wariness, habituation | what the population has learnt from players |
| `parcelles` | plots | the head count in each plot of the biome |
| `nourriture`, `recouvrement` | food, overlap | a grazer: what it finds to eat, relative to the awakening of the flora; what it shares with its size band |
| `savoirs` | knowledge | for each piece of knowledge (`catalogue.savoirs`), the share of the population that knows it: a local tradition |
| `groupe` | group (docs/38) | how its animals live: `forme` (`solitaire` alone, `famille` family, `troupeau` herd, `bande` band, `meute` pack, `banc` school, `volee` flock, `essaim` swarm, `colonie` colony), `taille` (`min`, `typ` usual, `max`), `hierarchie` (`egalitaire`, `dominance`, `despotique`, `castes`), `meneur` leader, `sentinelles` sentinels, `chasse` (`ensemble` together, `encercle` encircling), `avec` (mixed herds) |
| `migration` | migration (docs/38) | a seasonal migration: `vers` the wintering place, `part` the share that leaves, `depart`/`retour` phases of the year, `etat` (`au depart` leaving, `partie` away, `au retour` coming back, `au pays` at home); the animals stay counted here |
| `infection` | infection | per strain: `i` infected share, `r` immune share |
| `energie`, `posture`, `regulation` | energy, posture, regulation | a machine: what it captures over what it spends; `neutre` neutral, `defensive`, `fuyante` fleeing, `hostile`; among animals, the share of deaths caused by machines |
| `potentiel`, `frequences`, `reference`, `pollinisation` | potential, frequencies, reference, pollination | a plant |

### `phenotypes[]` (variants)

| field | English | meaning |
| --- | --- | --- |
| `frequence`, `frequence_par_biome` | frequency, per biome | its share of the lineage |
| `traits` | traits | catalogue ids (empty for the base variant) |
| `cout_total` | total cost | what the variant pays in offspring |
| `ecarts` | deviations | what it changes to the plan (multipliers) |
| `selection` | selection | its net advantage over the cycle |

### `catalogue.traits` (a trait)

| field | English | meaning |
| --- | --- | --- |
| `domaine` | domain | `morphologie`, `locomotion`, `sens` (senses), `offense`, `defense`, `metabolisme`, `reproduction`, `social`, `activite` |
| `organe`, `effet` | organ, effect | what the body carries, what it allows |
| `cout` | cost | fewer offspring (0.15 = 15 % fewer) |
| `exige`, `exclut` | requires, excludes | other traits |
| `fournit` | provides | what the body leaves behind (harvest, items) |
| `ecarts`, `fixe` | deviations, fixed | multipliers on the plan, values imposed on it |
| `vulnerabilite`, `chasse`, `resistance` | vulnerability, hunting, resistance | multipliers: being eaten, eating, dying of disease (1 = neutral) |
| `conduite` | behaviour | what it makes the animal do, in an abstract vocabulary (`type`, `effet`, `portee` range, `recharge` cooldown, `force`, `presage` the warning sign a player can see) |
| `heredite` | heredity | `dominant` or `recessif` |
| `attrait` | appeal | weight in mate choice |
| `flore` | flora | facing plants: `portee` reach, `haut` reaches trees, `toxique` and `epineux` (the share of toxins and thorns it tolerates) |
| `grammaire` | grammar | a trait composed by the grammar: its `phrase`, `moyen` (means: `lumiere` light, `son` sound, `electricite`, `odeur` smell, `chaleur` heat, `couleur` colour), `action`, `cible` (target), `moment`, `signe` (what a game shows: `lueur` glow, `eclair` flash, `decharge` shock, `cri` call, `echo`, `musc`, `parfum` scent, `thermo`, `vapeur` steam, `couleurs`), `force`, `couleur` |
| `origine` | origin | a trait invented by the world: the lineage that invented it, the cycle, the traits it comes from (`de`) |

### `evenements[].type` (event types)

`apparition` appearance · `extinction` · `separation` split · `migration` · `effondrement` collapse · `explosion` outbreak · `nouveau_trait` new trait · `epidemie` epidemic · `remission` · `catastrophe` disaster · `hybridation` · `mefiance` wariness · `eveil` awakening · `transformation` (an axis of a place has moved) · `conception` (the Mother designs a machine) · `transfert` (machines pass a module on) · `invention` (the world invents a trait) · `nature` (a place changes nature) · `climat` (the climate shifts, a land bridge, a new island) · `meteo` (a storm, a heatwave, the first snow, a drought setting in) · `savoir` (an animal invents, or a population loses, a piece of knowledge)

## The batch (`schemas/pression.schema.json`)

| field | English | meaning |
| --- | --- | --- |
| `lot` | batch | what a game sends |
| `monde`, `instantane` | world, snapshot | the world, and the `cycle.n` the game was using |
| `familles` | families | the families the game plays |
| `source` | source | `jeu` game, `compte` opaque player id, `zone` area |
| `periode` | period | `debut` start, `fin` end |
| `evenements[]` | events | `taxon`, `biome`, `action`, `n` (count), `phenotype`, `age` (`oeuf` egg, `jeune`, `adulte`, `vieux`), `q` (mean continuous traits), `genome` (with `liberation`: the alleles and breeding values of animals bred by players, docs/36), `vers` (to), `parcelle` (plot) |
| `action` | action | `rencontre` encounter, `prelevement` kill, `capture`, `liberation` release, `nourrissage` feeding, `reproduction` breeding, `deplacement` relocation, `habitat_perdu` habitat lost, `habitat_gagne` habitat gained, `defrichage` clearing, `reboisement` reforesting, `assechement` draining, `irrigation`, `construction` building, `transformation` (with `axe` axis and `sens` direction) |

## The exposure (`exposition`, in `schemas/profil.schema.json`)

| field | English | meaning |
| --- | --- | --- |
| `familles` | families | what the game can play |
| `compression` | compression | factor on a variant's odds: rarities stay rare in the game |
| `propagation_cycles`, `inertie_max` | spreading, max inertia | a change is spread over this many cycles, at most this much per cycle |
| `traits_rendus` | rendered traits | what the game can draw; the others are merged into the base variant |
| `seuil_extinction_jeu`, `retour_apres_extinction` | game extinction threshold, return after extinction | |
| `mode`, `taux_jeu`, `reference_min`, `non_rendus` | mode, game rates, min reference, not rendered | the relative mode: the game keeps its own rates and follows Orvane's changes |
| `quantitatifs`, `mefiance`, `bestiaire` | continuous traits, wariness, bestiary | what the game shows of them |

## Words of the world

| French | English |
| --- | --- |
| lignée | lineage |
| effectif | head count |
| cycle | one step of the world (a day, an hour…) |
| tampon | buffer (`tampon/tampon.js`): between the world and a game |
| individu | individual (`tampon/individus.js`, docs/35): one animal drawn from a real population — `alleles` (copies carried), `a` (breeding value) and `z` (own value), `sexe`, `parents`, `ascendance` (ancestry), `F` (inbreeding), `vigueur` (vigour), `hybride` |
| élevage | breeding (docs/36): animals crossed by players; released with their `genome`, they join the population as an `apport` (input) |
| traducteur | translator: a game's code that turns the world into its creatures |
| morceaux | pieces (`morceaux/`): the world split by biome and by lineage |
| la Mère, les machines | the Mother, the machines (synthetic life) |
| souche | strain (a disease) |
| butineur | pollinator |
| parcelle | plot |
| genèse | genesis |
| fusion | merger |
| chronique | chronicle (docs/37): `chronique/index.json` and `chronique/<year>.json`, what mattered, with an `importance` from 1 to 3 |
| muséum | museum (docs/37): `museum.json`, one type specimen per lineage, kept after it dies out, with its `cause` |
| visiteurs | visitors (docs/38): `biomes[].visiteurs`, the neighbouring populations wintering here |
