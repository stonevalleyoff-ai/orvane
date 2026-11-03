# 14. La fusion de mondes : verser un monde dans un autre

Deux genèses font deux mondes, chacun avec ses lignées et son arbre. La fusion en verse un dans l'autre : les lignées du second arrivent dans les biomes du premier, et le moteur fait le reste, cycle après cycle. C'est l'étape 2.2 de la feuille de route, dans une première version qui fusionne **biome par biome**. La version par parcelles, où deux cartes se relient par quelques passages et chaque faune envahit l'autre de proche en proche, viendra avec les parcelles (étape 2.1).

## Pourquoi : la mer d'Orvane

Le monde d'Orvane est né d'une genèse sur ses 24 biomes. Les terres y ont pris presque toute la place : avant la fusion, les quatre biomes marins comptaient de 3 à 6 lignées chacun, contre 20 à 44 pour un biome de terre. Deux raisons :
- la mer est d'un seul tenant, et une lignée ne se sépare que là où sa population est isolée ;
- le plafond de lignées de la genèse était atteint par les terres.

Plutôt que de refaire tout le monde, la mer a eu sa propre genèse, puis a été versée dans le monde d'Orvane.

## Une genèse sur une partie des biomes

`moteur/genese.js` prend deux options de plus :
- `--milieux marin,aquatique,amphibie` : seuls les biomes de ces milieux, sans leurs voisins hors du monde ;
- `--ancetres fichier.json` : d'autres ancêtres, au format de ceux du moteur (`{ "terre": [...], "eau": [...], "mer": [...] }`).

La mer d'Orvane (`mondes/marin/`) est née de vingt ancêtres (`mondes/marin/ancetres.json`) :
- en mer : des poissons de bancs, des filtreurs, des brouteurs, des chasseurs à chaque étage de taille jusqu'au grand chasseur du large, un tentaculaire, un crabe, un fouille-vase, un phoque ;
- en eau douce : des fourrages, des brouteurs, des chasseurs jusqu'au grand reptile ;
- sur les rives : un oiseau pêcheur et un échassier.

```
node moteur/genese.js moteur/biomes-universels.json --milieux marin,aquatique,amphibie \
  --ancetres mondes/marin/ancetres.json --cycles 1200 --graine 23 --lignees 60 --rarete 0.0001 \
  --regles '<les règles du monde d'Orvane, avec "separation": { "cycles": 15, "effectif": 40, "distance": 0.8, "chance": 0.08, "flux": 0.25, "divergence": 0.3 }>' \
  --nom "La mer d'Orvane" --sortie mondes/marin/amorce.json
```

La séparation est plus facile que sur terre (`flux` 0,25 au lieu de 0,05) : en pleine mer, toute population reçoit des migrants, et sans cela presque rien ne se séparait. La rareté retenue est plus basse aussi, pour garder les grandes bêtes rares. Résultat : 29 lignées, dont 10 carnivores, 6 herbivores, 10 filtreurs et 3 omnivores, de 36 g à 60 kg.

**Le moteur, corrigé.** En pleine eau (lac, rivière, mer), une lignée qui se sépare ne gagne plus ni la course, ni le saut, ni la grimpe, et les perd presque toujours : un poisson ne court pas. Marcher ou ramper sur le fond, fouir la vase restent possibles. Avant cette règle, près de la moitié des lignées de la genèse marine savaient courir. Sur terre, rien ne change, pas même le hasard de chaque cycle.

## La fusion

`moteur/fusion.js`, `Fusion.fusionner(cible, source, { id, biomes, part })` :
- **qui arrive** : chaque lignée vivante de la source, avec ses populations des biomes choisis (par défaut, tous ceux que les deux mondes partagent) et une **part** de leurs effectifs (0,5 par défaut). Une population qui n'aurait pas un individu ne vient pas ;
- **les noms** : un identifiant, ou le premier mot d'un nom, déjà porté dans la cible (même par une lignée éteinte) est remplacé par un nom neuf, tiré des syllabes de la genèse ; les parents suivent ;
- **les arbres** : le parent d'une arrivée est une autre arrivée, ou aucun. Chaque monde garde ses racines ;
- **pas d'hybrides** : le moteur ne croise que des lignées apparentées (`Orvane.parente`, un ancêtre commun). Deux mondes n'en ont aucun : leur isolement est total ;
- **l'histoire** : une arrivée apparaît au cycle de la fusion (`apparu`) et garde son passé dans `origine` (son monde, son identifiant et son cycle d'apparition là-bas) ; le journal du cycle porte une `apparition` par lignée ;
- **la trace** : la cible note la fusion dans `monde.fusions`, et la même fusion n'est jamais faite deux fois ;
- **déterministe** : mêmes mondes, mêmes options, même résultat.

En ligne de commande : `node moteur/fusion.js <cible.json> <source.json> [--biomes recif,large] [--part 0.5] [--id mer-1] [--sortie fusion.json]`.

## La commande : le profil du monde

Le cycle de nuit applique les fusions que commande le profil du monde, une fois chacune, avant le cycle :

```json
"monde": { "id": "orvane", …, "fusions": [ { "id": "mer-1", "source": "mondes/marin/amorce.json", "part": 0.5 } ] }
```

La nuit suivante, l'état porte `monde.fusions` avec `mer-1` : l'ordre reste dans le profil, mais il est déjà fait. Une source introuvable fait attendre la fusion, sans arrêter le monde. `mondes/marin/` ne tourne pas la nuit (`nocturne` vaut `false`) : c'est une source.

## Ce que le monde en fait

`bancs/fusion.js` verse la mer d'Orvane dans le monde d'Orvane (cycle 41, la moitié des effectifs) et compare, sur 240 cycles, avec un témoin sans fusion :

| | sans fusion | avec la fusion |
| --- | --- | --- |
| lignées du récif | 3 | 18 |
| lignées du large | 6 | 25 |
| lignées de la mer froide | 5 | 21 |
| lignées des abysses | 6 | 18 |
| lignées de la cible éteintes | 0 | 0 |
| arrivées encore vivantes | | 29 sur 29 |
| populations qui varient de plus de moitié d'un cycle à l'autre | 0,14 % | 0,12 % |

Les zones hybrides (133 en 240 cycles) se forment toutes à l'intérieur d'un même monde, jamais entre les deux. Le banc vérifie aussi :
- les noms ;
- que la cible reste intacte ;
- que la fusion n'est faite qu'une fois, et qu'elle est déterministe ;
- le contrat (`schemas/instantane.schema.json`) ;
- le cycle de nuit : l'ordre est appliqué une fois, et le journal publié dit les 29 arrivées.

```
node bancs/fusion.js            # 240 cycles, environ huit minutes
node bancs/fusion.js --court    # 60 cycles
```

## Pour un traducteur

Une fusion ne change rien au contrat : les arrivées sont des lignées comme les autres, nées au cycle de la fusion, sans référence dans la génération 0 (comme une lignée née d'une séparation). Deux champs les distinguent :
- `taxon.origine` : d'où vient la lignée ;
- `monde.fusions` : les fusions reçues.

Le journal du cycle de la fusion porte une `apparition` par arrivée, avec `detail` « arrivée de La mer d'Orvane (fusion mer-1) ».

Stone Valley n'a de sols que pour la côte et le marais (`rivage`, `tourbière`). Les arrivées qui y vivent paraissent au bord de l'eau, et celles qui ne font que nager vivent dans l'eau (§221 du jeu).

## Ce qui vient ensuite

- **La fusion par parcelles**, avec l'étape 2.1 : deux cartes reliées par quelques ponts, une invasion de proche en proche, comme lors du grand échange entre les deux Amériques.
- **D'autres sources** : un monde souterrain, et les machines de la vie synthétique (phase 2 bis), qui arriveront elles aussi par une fusion.
