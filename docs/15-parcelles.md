# 15. Les parcelles : un monde qui a une géographie

Jusqu'ici, une lignée n'avait qu'une population par biome : toute la prairie d'un seul tenant. Une espèce arrivée dans un biome l'occupait d'un coup, une catastrophe le frappait tout entier, et une population ne pouvait s'isoler qu'en changeant de biome. Avec les parcelles, chaque biome est découpé en parcelles voisines, et les populations vivent par parcelle : une espèce gagne la prairie de proche en proche, un incendie ne brûle qu'une parcelle, et une population au bout d'une chaîne de parcelles reçoit moins de migrants et peut diverger. C'est l'étape 2.1 de la feuille de route.

## Le découpage

`moteur/parcelles.js`, `Parcelles.decouper(inst, { par, graine })` :
- **les parcelles** : chaque biome devient `par` parcelles (4 par défaut ; ou par biome, `{ "prairie": 6 }`), nommées `prairie~1`, `prairie~2`… Leurs capacités sont un peu inégales (de 0,7 à 1,3 fois la moyenne, pour la même somme), leurs axes un peu variés (à 0,05 près du biome) : deux parcelles ne conviennent pas tout à fait aux mêmes bêtes ;
- **les voisines** : les parcelles d'un biome se suivent en chaîne, refermée en boucle à partir de quatre. Deux biomes voisins sont reliés par quelques passages, au plus la moitié de leurs parcelles : les autres parcelles en sont loin ;
- **les populations** : chacune est répartie entre les parcelles de son biome, selon leur place et ce qu'elles lui conviennent. Une petite population n'est pas émiettée : elle garde au moins 30 bêtes par parcelle, si bien qu'une lignée de huit bêtes reste entière dans une seule ;
- **déterministe** : même monde, même graine, mêmes parcelles.

Pour le moteur, une parcelle est un biome comme un autre (des axes, une capacité, des voisins), qui porte en plus son `type`, le biome dont elle est une part. Deux règles s'ajoutent, que le découpage pose dans les règles du monde (`monde.regles`) et qui restent nulles dans un monde par biomes :
- **la dispersion** (0,005) : chaque cycle, une petite part de chaque population s'en va vers les parcelles voisines du même biome, quoi qu'il arrive. C'est ainsi qu'une espèce gagne de proche en proche. Sans elle, une population ne bougeait que surpeuplée, ce qui n'arrive presque jamais ;
- **la fuite** (0,5) : une parcelle qui a perdu sa place (un défrichage, une catastrophe) chasse ses bêtes vers ses voisines, à proportion de l'excès : `fuite × (1 − 1/saturation)`, la moitié au plus.

## Le contrat ne change pas

Les jeux et le tampon voient le monde par biome, comme avant (`Parcelles.regrouper`) :
- une population de biome additionne celles de ses parcelles. Le reste est une moyenne pondérée par l'effectif : les traits continus, les allèles, la méfiance, la satiété ;
- chaque population dit en plus sa répartition (`populations[].parcelles`, l'effectif par parcelle) ;
- l'instantané donne la liste des parcelles (`parcelles` : leur biome, leur capacité, leurs voisines) ;
- les événements sont rapportés à leur biome, avec la parcelle dans `detail`.

Les pressions des jeux arrivent par biome. `Parcelles.repartir` les partage :
- un retrait, des rencontres, selon l'effectif de la lignée dans chaque parcelle ;
- un déplacement, vers la plus grande parcelle du biome d'arrivée ;
- une perte d'habitat, selon la capacité des parcelles.

**Un jeu peut dire la parcelle.** Un événement de lot peut porter `parcelle`, une parcelle de son biome (`schemas/pression.schema.json`). Le cycle de nuit compte alors, par lignée et par biome, ce qui a été vu dans chaque parcelle (`Parcelles.localiser`), et la chasse comme le défrichage y sont posés tout entiers. Une parcelle qui n'est pas de ce biome est ignorée.

Stone Valley le fait (§222 du jeu). Chaque île tire de sa graine, pour chacun de ses biomes, l'une de ses parcelles :
- **sa faune** suit ce qui vit dans cette parcelle ; une espèce qui n'y est pas encore arrivée n'y paraît pas. Sur le monde d'Orvane découpé en quatre, 19 des 41 lignées de la prairie ne paraissent que sur une partie des îles ;
- **ses lots** disent la parcelle : les joueurs d'une île ne chassent et ne défrichent que la leur.

Une fusion (docs/14) dans un monde à parcelles répartit les arrivées entre les parcelles de leurs biomes.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "parcelles": { "par": 4 } }
```

Au cycle de nuit suivant, le monde est découpé une fois pour toutes, puis il tourne par parcelle. L'état (`etat.json`) est par parcelle. L'instantané publié et l'historique restent par biome. Un cycle prend environ deux fois et demie plus de temps (1,9 s au lieu de 0,8 s pour le monde d'Orvane en quatre parcelles par biome).

## Ce que le monde en fait

`bancs/parcelles.js` découpe le monde d'Orvane (24 biomes, 4 parcelles chacun) et le compare au même monde par biomes :

| sur 200 cycles | par biomes | par parcelles |
| --- | --- | --- |
| lignées vivantes à la fin | 121 | 125 |
| séparations | 9 | 13 |
| bêtes à la fin | 39,3 millions | 40,2 millions |
| populations qui varient de plus de moitié d'un cycle à l'autre | 0,17 % | 0,16 % |
| temps d'un cycle | 0,8 s | 1,9 s |

Les deux critères de la feuille de route :
- **une espèce introduite gagne ses voisines de proche en proche.** Un brouteur posé sur une parcelle d'une prairie de huit parcelles gagne ses deux voisines vers le cycle 10, les suivantes vers le cycle 31, puis 49, et la dernière, à quatre pas, vers le cycle 63 ;
- **un défrichage local déplace les populations.** Les quatre cinquièmes d'une parcelle de prairie défrichés d'un coup : trois cycles plus tard, elle n'a plus que 34 % de sa biomasse, et ses huit voisines en ont 5,9 % de plus. Trente cycles plus tard, les voisines ont absorbé les fuyards, et la parcelle s'est refaite à 55 %.

Le banc vérifie aussi :
- que le découpage ne perd ni bête ni capacité et n'émiette pas les petites populations ;
- que l'aller-retour vers la vue par biome est exact, et que le découpage est déterministe ;
- le contrat ;
- que les pressions des jeux sont réparties sans perte ;
- le cycle de nuit : un découpage une seule fois, un instantané et un historique par biome, le lot d'un jeu bien lu ;
- une fusion dans un monde à parcelles.

```
node bancs/parcelles.js            # 200 cycles, environ un quart d'heure
node bancs/parcelles.js --court    # 40 cycles
```

## Pour un traducteur

Rien ne change. Un jeu qui le veut peut lire la répartition d'une lignée (`populations[].parcelles`) et la liste des parcelles (`parcelles`), relier ses lieux à des parcelles, comme Stone Valley ses îles, et dire la parcelle de ses événements.

## Ce qui vient ensuite

- **La fusion par ponts** : deux mondes à parcelles reliés par quelques passages, chaque faune envahissant l'autre de proche en proche.
- **La flore évolutive** (2.3) et **la vie synthétique** (phase 2 bis) auront leurs ressources par parcelle : la lumière, le minerai.
