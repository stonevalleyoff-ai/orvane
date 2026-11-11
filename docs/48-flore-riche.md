# 48. La flore riche

Jusqu'ici, la flore (docs/17) avait huit formes, et une lignée par forme et par lieu : toutes les forêts du monde portaient le même arbre. Maintenant, dans un monde à la diversité éveillée, il y a quarante-sept formes de plus, douze caractères qu'une lignée porte et transmet, et une flore qui vit : ses lignées se disputent la place, se séparent, gagnent les lieux voisins et s'éteignent. C'est la cinquième étape du chantier « flore, météo et saisons ».

`moteur/diversite.js`. Il faut une flore (docs/17). Un monde qui ne l'a pas éveillée n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Son hasard est le sien, tiré du nom de chaque lignée et du cycle.

## Le port et la forme

Chaque plante a désormais deux noms :
- **son port** (`plan.port`) : ce qu'elle est pour la mécanique. Ce sont les huit formes d'origine : herbe, buisson, arbre, roseau, algue, lichen, succulente, champignon. Le port dit où elle a sa place (docs/17), sa pousse au fil de l'année (docs/46), ce que le feu lui prend (docs/47) ;
- **sa forme** (`plan.forme`) : ce qu'elle est vraiment. Elle a sa hauteur, sa repousse, ce qu'elle donne, et les lieux où elle se plaît.

Un jeu qui ne connaît pas une forme montre son port : un palmier est un arbre, une fougère une herbe.

| port | formes nouvelles |
| --- | --- |
| arbre | conifère (20 m), palmier (10 m), palétuvier (6 m), arbre-bouteille (15 m), arbre géant (45 m), arbre fruitier (6 m), arbre pionnier (9 m), fougère arborescente (5 m), arbre émergent (60 m), figuier étrangleur (25 m), arbre du sous-bois (4 m) |
| buisson | bruyère (0,5 m), roncier (1,5 m), liane (8 m), arbuste à baies (1,2 m), buisson d'épines (2 m), buisson aromatique (0,8 m) |
| herbe | fougère (0,8 m), fleur des prés (0,4 m), graminée à grains (1 m), légumineuse (0,2 m), plante à bulbe (0,3 m), haute herbe (2,5 m), plante en coussin (5 cm), mousse (5 cm), sphaigne (10 cm), orchidée (0,3 m), broméliacée (0,5 m), grande herbe du sous-bois (3 m) |
| roseau | bambou (8 m), papyrus (3 m), jonc (0,8 m), riz sauvage (1,2 m) |
| algue | varech (15 m), herbier marin (0,6 m), plancton, nénuphar (0,3 m), lentille d'eau, algue des glaces (5 cm) |
| lichen | lichen des rennes (8 cm), lichen en croûte |
| succulente | cactus géant (6 m), agave (1,5 m), plante-caillou (3 cm) |
| champignon | champignon géant (2 m), champignon lumineux (10 cm), moisissure |

**Où elle se plaît.** Chaque forme a ses fenêtres sur les axes d'un lieu : le palmier au chaud et à l'humide, le conifère au froid, le palétuvier sur les rives chaudes, la liane sous un couvert dense, le varech en mer froide et éclairée. Le catalogue complet est dans `catalogue.flore_riche.formes`.

**Ce qu'elle donne** (`plan.rendement`). Un figuier donne trois fois plus de fruits qu'un arbre ordinaire, un conifère des graines et pas de nectar, une orchidée surtout du nectar, une graminée à grains surtout des graines. Les bêtes dont le régime est un spectre (docs/30) ne trouvent donc pas la même chose d'une plante à l'autre.

**Sa hauteur dit qui l'atteint.** Un arbre se broute jusqu'au tiers de sa hauteur : une bête d'un mètre et demi prend tout d'un arbre du sous-bois, les trois quarts d'un arbre fruitier, un dixième d'un arbre géant. Qui grimpe ou vole atteint tout.

## Les caractères

Une lignée porte des caractères (`plan.caracteres`), qu'elle transmet à ses filles. Chacun a son prix. Ils sont cuits dans son plan à sa naissance : sa repousse, sa hauteur, ce qu'elle donne, ce que les catastrophes lui prennent (`plan.sinistres`), ce que les brouteurs en mangent (`plan.appetence`).

| caractère | nom | ce qu'il fait | ce qu'il coûte | ports |
| --- | --- | --- | --- | --- |
| `pyrophyte` | aime le feu | un incendie lui prend trois fois moins de pieds | repousse −5 % | arbre, buisson, herbe, roseau, succulente |
| `racines_profondes` | racines profondes | la sécheresse lui prend trois fois moins de pieds | repousse −10 % | arbre, buisson, herbe, succulente |
| `bulbe` | à bulbe | le feu et la sécheresse lui prennent moitié moins de pieds | repousse −10 % | herbe |
| `echasses` | racines échasses | une crue ne lui prend presque rien | repousse −5 % | arbre, buisson, roseau |
| `mellifere` | mellifère | deux fois plus de nectar | repousse −8 % | arbre, buisson, herbe, succulente |
| `fruits_charnus` | fruits charnus | presque deux fois plus de fruits | repousse −8 % | arbre, buisson, succulente |
| `graines_abondantes` | graines abondantes | presque deux fois plus de graines | repousse −6 % | herbe, roseau, arbre, buisson |
| `coriace` | feuilles coriaces | tous les brouteurs en mangent un quart de moins | repousse −10 % | tous |
| `rapide` | pousse vite | repousse +35 % | les catastrophes lui prennent 20 % de pieds en plus | tous |
| `geante` | géante | hauteur × 1,6 : moins de brouteurs l'atteignent | repousse −20 % | arbre, buisson, roseau, succulente, champignon |
| `naine` | naine | repousse +15 % | hauteur × 0,5 : tous l'atteignent | arbre, buisson, roseau, succulente |
| `vent` | fécondée par le vent | sa repousse ne dépend pas des butineurs (docs/18) | pas de nectar | arbre, buisson, herbe, roseau |

Les effets sur le feu, la crue et la sécheresse ne jouent que dans un monde à la succession éveillée (docs/47). Les deux défenses d'origine, les toxines et les épines (docs/17), restent ce qu'elles étaient : des variantes au sein d'une lignée.

## L'éveil : une radiation

Le jour de l'éveil, dans chaque lieu, chaque port donne des lignées nouvelles :
- **de deux à sept par port**, selon le lieu : plus il est chaud et humide (ou, pour une eau, chaud et éclairé), plus il en porte ; un lieu qui n'a qu'un ou deux ports en porte plus de chacun ;
- **des formes qui s'y plaisent** (à 0,35 au moins), les mieux placées d'abord ; quand elles manquent, des variantes des meilleures, d'un caractère de plus (deux figuiers qui ne se ressemblent pas) ;
- **une fois sur deux, un ou deux caractères de plus** que ceux de sa forme ;
- **chacune prend jusqu'à 15 % de sa mère** : de ses pieds, au poids, et de sa place. La mère en garde au moins 30 %.

Chaque lieu porte donc le même poids de plantes de chaque port et la même place qu'avant : le jour de l'éveil, les brouteurs ne voient presque rien changer. Ensuite, ce que chaque lignée donne et qui l'atteint commence à compter.

## Puis la flore vit

Chaque cycle, après la pousse :

1. **La concurrence pour la place.** Les lignées d'un même port dans un même lieu se partagent la place de ce port. Celle qui remplit mieux la sienne que ses sœurs en gagne, jusqu'à 2 % par cycle ; l'autre en perd. La place totale ne bouge pas. Une plante trop broutée, brûlée ou desséchée recule ; une plante hors d'atteinte ou qui pousse vite avance.
2. **La disparition.** Une population dont la place tombe sous 0,4 % de celle de son port disparaît du lieu, et sa place va à la plus grande de ses sœurs. Une lignée sans population s'éteint (l'événement `extinction`) ; elle reste listée.
3. **La séparation** (0,3 % par population et par cycle). Une lignée donne une fille, qui prend un quart de ses pieds et de sa place dans ce lieu :
   - une fois sur deux, c'est une autre forme de son port qui se plaît là ;
   - sa hauteur va de 0,7 à 1,4 fois celle de sa mère, sa repousse de 0,8 à 1,25 ;
   - six fois sur dix, elle porte un caractère de plus.
4. **La colonisation** (0,4 % par population et par cycle). Une lignée gagne un lieu voisin qui lui convient et où son port a sa place : elle y prend 8 % de la place de la plus grande lignée de son port, et y arrive en graines.

**Les plafonds.** Huit lignées d'un même port dans un lieu, vingt lignées dans un lieu, 1 500 lignées vivantes dans le monde.

Dans un monde par parcelles (docs/15), une lignée naît dans une parcelle et gagne les autres de proche en proche : deux parcelles d'une même forêt n'ont plus tout à fait les mêmes plantes.

## Ce qu'un jeu en fait

Dans `flore.json` (docs/17), une lignée de la flore riche :

```json
{ "id": "flore-jungle-figuier", "nom": "Sorli figuier étrangleur (Jungle)", "parent": "flore-jungle-arbre",
  "plan": { "regime": "vegetal", "forme": "figuier", "port": "arbre", "hauteur_m": 25, "croissance": 0.184, "feuillage": "persistant",
            "rendement": { "feuilles": 1, "fruits": 1.2, "nectar": 0.1 }, "caracteres": ["fruits_charnus"], … } }
```

- **Montrer une forêt qui n'est pas celle d'à côté** : les formes de chaque lieu, leur hauteur, leur poids.
- **Raconter** : les événements `separation`, `migration` (une plante gagne un lieu) et `extinction`.
- **Le catalogue** (`catalogue.flore_riche`) dit le nom, le port et ce que donne chaque forme, et ce que fait chaque caractère.
- `monde.diversite` compte les lignées vivantes, celles qui sont nées et celles qui se sont éteintes depuis l'éveil.
- Un jeu qui ne demande pas les plantes n'en reçoit toujours aucune.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "flore": true, "diversite": true }
```

Au cycle de nuit suivant, la flore se diversifie, une fois pour toutes. Dans un profil qui demande aussi la succession (docs/47), la diversité s'éveille d'abord : la succession garde ensuite le poids de chaque lignée, les nouvelles comprises.

## Ce qu'elle coûte

Un cycle prend environ deux fois plus de temps : chaque brouteur se mesure à trois ou quatre fois plus de plantes. Sur le monde d'Orvane entier, par parcelles (160 parcelles), la radiation fait passer la flore de 94 à 432 lignées et de 388 à 1 776 populations ; un cycle passe de 5,6 à 12,5 secondes (mesuré une fois, sur une machine occupée), et les plantes pèsent 1,4 Mo au lieu de 0,3 dans l'état du monde. Pour un monde solo sur un téléphone (docs/19), mieux vaut ne pas l'éveiller, ou tourner peu de cycles à la fois.

## Ce que le banc vérifie

`bancs/diversite.js`, sur le monde d'Orvane vu par biome :

- **Le jour un.**
  - Un monde sans diversité tourne exactement comme le moteur sans ce fichier.
  - Le jour de l'éveil, chaque lieu porte le même poids de plantes de chaque port et la même place (à 0,002 % près).
  - Un cycle après, les bêtes pèsent 100,1 % de ce qu'elles pèsent sans la flore riche, 191 lignées des deux côtés.
- **Le catalogue.** 47 formes de plus, de tous les ports, toutes au contrat ; 12 caractères, cuits dans le plan d'une lignée.
- **La radiation.**
  - De 54 à 257 lignées de plantes, de 54 formes.
  - Plus un lieu est chaud et humide, plus il en porte : la jungle 16, la forêt 15, la mangrove 18 ; la toundra 8, la banquise 8, la mer froide 7.
  - Chaque forme naît où elle se plaît : des palmiers dans la jungle et pas dans la toundra, des conifères dans la taïga et pas dans la jungle, des cactus au désert, du varech en mer froide, des nénuphars sur le lac.
  - 185 lignées nouvelles sur 203 portent un caractère.
- **Les brouteurs ne mangent pas tout pareil.**
  - Une bête d'un mètre et demi atteint tout un arbre du sous-bois, 75 % d'un arbre fruitier, 10 % d'un arbre géant.
  - À poids égal, un mangeur de fruits trouve 9,7 fois plus dans un figuier que dans un conifère ; un mangeur de graines trouve les siennes dans le conifère, et rien dans le figuier.
- **Le feu trie les caractères** (docs/47). Après un incendie, il reste 88 % d'une herbe qui aime le feu, 80 % d'une plante à bulbe, 60 % d'une herbe ordinaire, 52 % d'une herbe qui pousse vite.
- **La flore vit.**
  - En 60 cycles : 35 séparations, 18 lieux gagnés ; de 257 à 292 lignées.
  - La vie de la flore, forcée trente fois de suite (69 séparations, 35 lieux gagnés, 2 extinctions) : la place de chaque port dans chaque lieu ne bouge pas, et aucun lieu ne passe 20 lignées.
  - Les bêtes pèsent 98,9 % de ce qu'elles pèsent sans la flore riche, les plantes 97 %, 186 lignées de bêtes contre 184.
- **Les parcelles, le contrat et le cycle de nuit.** L'instantané et ses plantes respectent le schéma, par biome et par parcelles ; un jeu qui ne demande pas les plantes n'en reçoit aucune ; le profil éveille la flore riche une fois, avant la succession.

```
node bancs/diversite.js            # environ 7 minutes
node bancs/diversite.js --court    # moins de cycles
```

## Ce qui reste ouvert

- **Des formes sans port à elles.** Une liane ne s'appuie pas sur les arbres, une orchidée ne pousse pas sur leurs branches, une plante carnivore ne mange rien : ce sont des buissons et des herbes. Des plantes qui vivent sur d'autres, ou d'autres choses, demanderaient des liens entre lignées.
- **La place d'un port ne bouge pas.** Les lignées se disputent la place de leur port, mais un lieu ne devient pas plus boisé parce que ses arbres réussissent. Seul le milieu (docs/22) la déplace.
- **Les défenses restent deux.** Les toxines et les épines sont des variantes au sein d'une lignée ; les caractères, eux, ne varient qu'entre lignées.
- **Le feuillage n'évolue pas** (docs/46), ni la niche : une lignée qui gagne un lieu plus froid n'y devient pas plus résistante au froid.
- **Dessiner les plantes.** Il n'y a pas de planches pour elles (docs/21), comme il y en a pour les bêtes.
- **Le coût.** La nourriture d'un brouteur se calcule plante par plante ; regrouper les lignées de même clé dans un lieu rendrait le cycle à sa vitesse.
