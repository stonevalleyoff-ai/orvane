# 18. Les souches et les symbioses

Jusqu'ici, une épidémie naissait dans une population entassée, la frappait quelques cycles et s'éteignait. Elle pouvait gagner la même lignée dans un biome voisin, et c'était tout : pas de germe, pas d'immunité, pas de saut d'une espèce à l'autre. Avec les souches, les maladies ont une identité. Chacune a sa virulence et sa contagion, elle circule, saute aux lignées apparentées, et laisse derrière elle des bêtes immunisées. Et la flore a ses butineurs : de petites bêtes qui se nourrissent de nectar et font repousser les plantes à fleurs. C'est l'étape 2.4 de la feuille de route.

`moteur/pathogenes.js` pour les souches ; la pollinisation est dans `moteur/flore.js`. Un monde sans souches n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Une souche

`monde.pathogenes.souches`. Une souche a :
- **une virulence** : la part des infectés qui meurent chaque cycle (de 4 % à 34 % à sa naissance), avant la résistance de chaque phénotype (un cuir épais, un grand estomac) ;
- **une contagion** : `0,3 + 1,5 × √virulence`. Plus une souche tue, plus elle se transmet, mais un hôte mort ne transmet plus. Les souches qui durent sont entre les deux ;
- **une origine** : la lignée où elle est née, et **ses hôtes**, les lignées où elle a pris (au moins 1 % de la population et 20 bêtes infectées).

Par population, pour chaque souche qui y circule, `populations[].infection` donne la part des bêtes infectées (`i`) et celle des immunisées (`r`). Dans un monde à parcelles, `populations[].infection_par_parcelle` donne la même chose parcelle par parcelle (plus bas).

## Ce qu'elle fait

- **Elle naît** dans une population d'au moins 200 bêtes, d'autant plus souvent qu'elle est entassée (au-delà de la moitié de sa place). Au départ, 1 % de la population est infectée.
- **Elle circule** : chaque cycle, les bêtes sensibles s'infectent selon la contagion de la souche, la part infectée et l'entassement de la population.
- **Elle passe d'une parcelle à l'autre** : les populations de la même lignée dans les parcelles voisines lui apportent 5 % de leur part infectée.
- **Elle saute aux lignées apparentées** du même lieu, selon leur parenté (`exp(−âge de leur séparation / 100 cycles)`), leurs tailles et leur nombre : une petite population infectée n'expose guère une grande. Chez une lignée lointaine, elle se transmet mal (sa contagion × la parenté à sa lignée d'origine, puissance 0,3) et finit par s'y éteindre. Elle ne passe jamais à une lignée sans ancêtre commun, ni aux machines, ni aux plantes.
- **On en guérit** : 25 % des infectés par cycle guérissent et sont immunisés. L'immunité s'use (5 % par cycle).
- **Elle s'éteint dans une population** où il lui reste moins de dix malades (l'immunité, elle, reste) : une épidémie y passe et s'éteint. Sous 200 bêtes environ, une souche ne s'installe donc pas pour de bon ; une population plus nombreuse la garde.
- **Elle s'éteint** quand il ne reste plus une bête infectée dans le monde.

Dans un monde à souches, les épidémies d'avant ne naissent plus : ce sont celles des souches.

## La pollinisation

Les **butineurs** sont les petits herbivores et omnivores qui volent ou grimpent (moins de 100 g), et tous ceux de moins de 20 g (les insectes). Dans un monde à flore (docs/17) :
- la moitié de ce qu'ils mangent est du nectar, que les défenses des plantes ne gardent pas : ils ne broutent que l'autre moitié ;
- ils font repousser les plantes à fleurs (herbe, buisson, arbre, succulente) de leur lieu, jusqu'à 30 % de plus. L'effet est à moitié atteint quand ils pèsent 5 % de la place, et il est rapporté à ce qu'ils faisaient à l'arrivée de chaque plante (`populations[].pollinisation`) : rien ne change le premier jour.

C'est une symbiose : les butineurs vivent des fleurs, et les fleurs repoussent grâce à eux. Sans butineurs, les fleurs repoussent moins ; sans fleurs, les butineurs manquent de nectar.

## Le contrat

En plus, dans l'instantané (`schemas/instantane.schema.json`) :
- `monde.pathogenes` : les souches, avec leur nom, leur virulence, leur contagion, leur origine, leurs hôtes et le nombre de bêtes qu'elles infectent ;
- `populations[].infection`, et dans un monde à parcelles `populations[].infection_par_parcelle` ; chez les plantes à fleurs, `populations[].pollinisation` ;
- des événements : `epidemie` (une souche naît, une souche passe à une autre lignée, une souche mute), `remission` (une souche s'éteint), qui disent laquelle (`souche`) et ce qui lui arrive (`nature`) ; `eveil` (le monde reçoit ses souches).

Un jeu peut montrer une bête malade d'après la part infectée de sa population, et la souche d'après son nom et sa virulence. Last Embers pourrait faire monter ses hordes là où une souche circule.

## Ce qui arrive à une souche : les événements

Chaque événement d'une souche dit laquelle (`souche`, sa clé dans `monde.pathogenes.souches`) et ce qui lui arrive (`nature`). Son type reste `epidemie` ou `remission` : un jeu qui ne lit que le type ne voit rien changer (docs/43). Avant, seul le texte (`detail`) disait la différence entre une souche qui naît, qui saute d'une lignée à l'autre ou qui mute.

| `nature` | type | quand | `taxon`, `biome` | `souche` |
| --- | --- | --- | --- | --- |
| `naissance` | `epidemie` | une souche naît dans une population entassée | la lignée et le lieu où elle naît | la souche nouvelle |
| `saut_hote` | `epidemie` | elle prend chez une lignée de plus (1 % de la population et 20 bêtes infectées) | la lignée gagnée, et le lieu | la souche |
| `mutation` | `epidemie` | un mutant naît (les dérives, docs/29) | la lignée et le lieu où il naît | le mutant ; sa mère est son `parent` |
| `vecteur` | `epidemie` | un mutant naît, porté par un insecte (docs/29) | la lignée et le lieu où il naît | le mutant ; l'insecte est son `vecteur` |
| `extinction` | `remission` | il ne reste plus une bête infectée dans le monde | sa lignée d'origine ; pas de lieu | la souche, qui n'est plus dans `monde.pathogenes.souches` |

```json
{ "type": "epidemie", "taxon": "grane", "biome": "foret", "souche": "souche-13", "nature": "vecteur",
  "detail": "la souche Vergoose mute chez Grane broutard de forêt : Vergoose α, virulence 13 % par cycle (sa mère : 13 %), portée par Kivine broutard de forêt · parcelle Forêt 2" }
```

- Une épidémie d'avant les souches (dans un monde qui ne les a pas, ou une population qui en garde une d'avant leur éveil) reste un `epidemie` ou un `remission` sans `souche` ni `nature`.
- D'autres natures pourront venir : un jeu ignore celles qu'il ne connaît pas.
- La chronique (docs/37) les lit. Pour un instantané d'avant ces champs, la chronique relit le texte, et retrouve la souche par son nom.

## L'infection par parcelle

Les missions se jouent à l'échelle de la parcelle (docs/15), et le moteur tient déjà l'infection de chaque parcelle. La vue par biome, celle que lisent les jeux, en publiait la moyenne, pesée par l'effectif (`infection`). Elle publie désormais aussi, à côté de l'effectif de chaque parcelle (`parcelles`), l'infection de chacune (`infection_par_parcelle`), au même format. Ainsi la Phéva filtreur de lac dans la mangrove, au cycle 59 :

```json
{ "biome": "mangrove", "effectif": 162155,
  "infection": { "souche-3": { "i": 0.1391413, "r": 0.1043975 }, "souche-6": { "i": 0.0025498, "r": 0.0007723 } },
  "parcelles": { "mangrove~1": 35833, "mangrove~2": 32041, "mangrove~3": 55122, "mangrove~4": 39159 },
  "infection_par_parcelle": {
    "mangrove~1": { "souche-3": { "i": 0.2061, "r": 0.2263 } },
    "mangrove~2": { "souche-3": { "i": 0.1571, "r": 0.09962 }, "souche-6": { "i": 0, "r": 0 } },
    "mangrove~3": { "souche-3": { "i": 0.07469, "r": 0.03224 }, "souche-6": { "i": 0.007501, "r": 0.002272 } },
    "mangrove~4": { "souche-3": { "i": 0.1539, "r": 0.09833 }, "souche-6": { "i": 0, "r": 0 } } } }
```

Goteose (`souche-3`) touche 14 % de la mangrove, mais de 7,5 % à 20,6 % selon la parcelle ; sa mutante Goteose α (`souche-6`, que porte un insecte) n'a de malades que dans la troisième.
- **La valeur par biome ne change pas** : c'est toujours la moyenne des parcelles, pesée par leur effectif ; une parcelle où la souche n'est pas y compte pour zéro.
- **Une parcelle absente** de `infection_par_parcelle` n'a ni malade ni immunisé. Le champ n'est là que si une souche circule dans au moins une parcelle.
- **Le nombre de bêtes infectées** dans une parcelle : `i × parcelles[parcelle]`. C'est la borne « infectés × effectif » qu'un jeu qui joue à la parcelle respecte.
- Les morceaux (docs/21) la portent avec le reste : `biomes/mangrove.json` la donne. Un monde sans parcelles n'en a pas.

## Côté jeu : lire les souches

Un jeu n'a pas à lire le JSON lui-même. Les mêmes aides, avec les mêmes réponses, en JavaScript, dans le kit Godot et dans le kit Unity (docs/44) :

| | JavaScript (`moteur/pathogenes.js`, `require('orvane').Pathogenes`) | Godot (`Orvane.`) | Unity (`instantane.`) |
| --- | --- | --- | --- |
| les souches vivantes, les plus répandues d'abord | `souches(inst)` | `souches()` | `Souches()` |
| une souche (nom, virulence, transmission, origine, hôtes, vecteur, parent) | `souche(inst, id)` | `souche(id)` | `Souche(id)` |
| l'infection d'une lignée dans un biome ou une parcelle, par souche : `{ i, r }` | `infection(inst, lignee, lieu)` | `infection(lignee, lieu)` | `Infection(lignee, lieu)` |
| combien de bêtes infectées là (par une souche, ou toutes) | `infectes(inst, lignee, lieu, souche)` | `infectes(lignee, lieu, souche)` | `Infectes(lignee, lieu, souche)` |
| où une souche frappe, parcelle par parcelle | `foyers(inst, souche)` | `foyers(souche)` | `Foyers(souche)` |
| ce qui leur est arrivé au dernier cycle | `evenements(inst, souche)` | `evenements_souches(souche)` | `EvenementsDeSouches(souche)` |

- `lieu` est un biome (`"mangrove"`) ou une parcelle (`"mangrove~3"`). Pour une parcelle, dans un instantané d'avant l'infection par parcelle, c'est celle de son biome.
- Un foyer : `{ taxon, biome, parcelle, effectif, i, r, infectes }`, une parcelle (ou un biome entier, dans un monde sans parcelles) où des bêtes vivantes sont infectées. Une parcelle d'immunisés seulement n'en est pas un.
- Ce qui manque (une lignée, un lieu, une souche inconnus, un monde sans souches) donne une réponse vide, jamais une erreur.

```js
const { Pathogenes } = require('orvane');
for (const f of Pathogenes.foyers(inst, 'souche-3').slice(0, 3)) console.log(f.taxon, f.parcelle, Math.round(f.infectes));
// pheva mangrove~1 7385 · pheva mangrove~4 6027 · pheva mangrove~2 5034 …
```

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "pathogenes": true }
```

Au cycle de nuit suivant, le monde reçoit ses souches, une fois pour toutes. Il n'en a encore aucune : elles naissent ensuite.

## Ce que le monde en fait

`bancs/pathogenes.js`, sur le monde d'Orvane par biomes :

| | |
| --- | --- |
| en 120 cycles | 6 souches naissent ; à la fin, elles ont pris chez 1, 1, 1, 3, 21 et 55 lignées |
| le monde | 115 lignées et 54,6 millions de bêtes, contre 119 et 55 millions avec les épidémies d'avant |

- **D'une parcelle à l'autre.** Le Musilnou tondeur de prairie, infecté dans une parcelle : la souche gagne les deux parcelles voisines au cycle 4, la plus éloignée (à deux pas) au cycle 8.
- **Les hôtes.** Née chez le Musilnou, elle prend chez 10 de ses 11 proches parentes de sa taille, et chez 44 autres lignées de son grand clade. Elle ne prend chez aucune des 15 lignées sans ancêtre commun, ni chez une machine, ni chez une plante.
- **L'immunité.** La première vague infecte jusqu'à 19,8 % de la prairie ; après elle, 56 % des bêtes sont immunisées, et la même souche revenue n'en infecte plus que 10,5 %.
- **Le compromis.** La même souche à trois virulences, chez le Soméne mangeur d'herbe de prairie :

| virulence par cycle | bêtes infectées, cumulées sur 40 cycles |
| --- | --- |
| 2 % | 1,2 million |
| 15 % | 2,3 millions |
| 45 % | 0,6 million |

  Trop douce, elle se transmet mal ; trop virulente, elle tue ses hôtes avant qu'ils ne la transmettent.
- **La pollinisation.** Les cinq lignées de butineurs de la prairie tenues à 5 % de leur nombre pendant 30 cycles : les plantes à fleurs de la prairie y pèsent 97,6 % de ce qu'elles pèsent avec eux.

Le banc vérifie aussi :
- **les événements** : en 120 cycles, chaque naissance, chaque saut d'hôte et chaque extinction dit sa souche et sa nature, cohérentes avec le monde (une souche née ce cycle chez cette lignée, une lignée qui est bien son hôte, une souche qui n'est plus) ; leur texte seul, relu par la chronique, dit la même chose. Les mutations sont vérifiées dans `bancs/derives.js` ;
- **l'infection par parcelle** : dans la prairie à quatre parcelles, chaque parcelle publie l'infection que tient le moteur, et celle du biome en est la moyenne pesée par l'effectif ; les aides de lecture la rendent ;
- le contrat et le cycle de nuit (le monde reçoit ses souches une fois).

```
node bancs/pathogenes.js            # environ 5 minutes
node bancs/pathogenes.js --court    # 60 cycles
```

## Combien de souches, à la longue (6 novembre)

On craignait que les souches s'accumulent sans fin. Dans la genèse 2026 (tous mécanismes éveillés), 68 sont nées en 175 cycles et 59 vivaient encore ; 89 % des populations étaient touchées, 5,8 % des bêtes malades, et les souches en tuaient 1,3 % par cycle. Chacune a un taux de reproduction d'environ 2, quelle que soit sa virulence, et l'immunité s'use : une fois installée, une souche reste. Et elle restait tant qu'il demeurait 0,05 bête infectée dans une population : dans une population de 150 bêtes, jamais une épidémie ne s'éteignait.

Ce n'est pourtant pas un emballement : leur nombre plafonne. Actives au fil de la genèse 2026 : 7, 24, 41, 43, 50, 57, 59 (une tous les 25 cycles). Elles se partagent leurs hôtes : chacune vit chez trois lignées environ, et une population en porte rarement plus de trois à la fois (au cycle 3179, sur 1 987 populations : 224 n'en portent aucune, 745 une, 540 deux, 334 trois, 144 quatre ou plus), car un hôte guéri ou malade de l'une est moins exposé aux autres.

Le seuil (`REGLES.locale`, dix malades) rend ses creux aux épidémies. Cent cycles de la genèse 2026, du cycle 3179, côte à côte :

| | souches à la fin | en route | malades | mortalité due aux souches |
| --- | --- | --- | --- | --- |
| sans seuil (avant) | 66 | de 59 à 66, en lente hausse | 5,4 % | 1,12 % par cycle |
| seuil de 3 malades | 61 | de 59 à 61 | 5,4 % | 1,08 % |
| **seuil de 10 malades** | **53** | **de 59 à 51, puis entre 50 et 54** | **5,0 %** | **1,00 %** |

Le banc (`bancs/pathogenes.js`, point 5 bis) : dans une population de 150 bêtes, sans le seuil, la souche ne s'éteint jamais ; avec lui, elle s'éteint en une vingtaine de cycles ; dans une population de 600 bêtes, elle reste.

## Ce qui reste ouvert

- **Les souches n'évoluent pas encore.** Leur virulence est fixée à la naissance ; c'est entre souches que la sélection joue. La suite : une souche qui mute et s'adapte à ses nouveaux hôtes.
- **Les parasites et les autres symbioses** (le nettoyeur et son hôte, la fourmi et le puceron) : des interactions par paires de lignées, sur le modèle de la pollinisation.
- **Les migrants ne portent pas leurs souches.** Une souche ne passe d'une parcelle à l'autre que par le voisinage, pas avec les bêtes qui migrent.
