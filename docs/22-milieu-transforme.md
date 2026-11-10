# 22. Le milieu transformé

Jusqu'ici, le milieu était un décor. Chaque biome avait ses axes (la température, l'humidité, l'altitude, la lumière, le couvert), qui ne bougeaient qu'avec les saisons, et une capacité que l'habitat perdu entamait. Maintenant, les bêtes et les joueurs le transforment, et ce qu'il devient change qui y vit. Les brouteurs tiennent la savane ouverte, les fouisseurs ameublissent le sol, les bâtisseurs rendent les rives humides. Les joueurs défrichent, reboisent, assèchent, irriguent, construisent. C'est l'étape 2.5 de la feuille de route.

`moteur/milieu.js`. Le moteur l'appelle au début de chaque cycle. Un monde sans milieu éveillé n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Ce qui transforme le milieu

**Le pâturage.** Les brouteurs d'un kilo et plus tiennent le couvert bas. Leur biomasse se compte en part de la capacité du lieu. Quand elle gagne 10 % de cette capacité, le couvert baisse de 0,05 ; quand elle en perd 10 %, il monte d'autant. Une savane sans ses brouteurs se referme, une savane surpâturée s'ouvre. Cela ne touche ni la mer ni l'eau douce.

**Les terriers.** Les fouisseurs (`locomotion` : `fouissage`) ameublissent le sol. Quand leur biomasse double, la capacité du lieu vise 10 % de plus, et elle s'en approche du même pas qu'elle regagne un habitat perdu (2 % de l'écart par cycle).

**Les barrages.** `batisseur` est un trait qui n'apparaît que dans un monde au milieu éveillé : il bâtit barrages et huttes.
- Dans un lieu d'eau douce ou de rive, ou sur une terre qui borde l'eau, ses porteurs font monter l'humidité de 0,25 au plus. L'effet est à moitié atteint quand ils pèsent 2 % de la capacité du lieu.
- Sa hutte protège des prédateurs (vulnérabilité 0,75) : c'est ce qui lui fait gagner sa place, puisque l'humidité profite à tous.
- Il coûte 10 % de petits, et ailleurs qu'au bord de l'eau il ne rapporte rien d'autre que sa hutte.

**Le jeu.** Un lot peut transformer un lieu, en `n` unités de surface. Ces actions n'ont pas de `taxon` (docs/4) :

| action | ce qu'elle fait |
| --- | --- |
| `defrichage` | le couvert baisse |
| `reboisement` | le couvert monte |
| `assechement` | l'humidité baisse |
| `irrigation` | l'humidité monte |
| `construction` | le couvert baisse, et l'habitat se perd comme avec `habitat_perdu` |
| `transformation`, avec `axe` et `sens` (1 ou −1) | n'importe quel axe : la température, la lumière, ou un axe du monde comme la magie (docs/20) |

- **L'unité.** Une unité transforme 5 unités de capacité du lieu (comme `habitat_perdu`), vers le bout de l'axe : un défrichage de 1 % du lieu retire 1 % de son couvert. Un cycle ne transforme pas plus de 5 % d'un lieu par axe.
- **L'effacement.** Ce que le jeu a fait s'efface de 2 % par cycle : une clairière qu'on laisse se referme. Un jeu qui veut une ville durable la renvoie de temps en temps, comme on entretient un champ.
- **Les parcelles.** Dans un monde à parcelles, l'action reste dans la parcelle où elle a eu lieu, si le lot la dit (`parcelle`, docs/15).

## Ce que le milieu transformé change

- **Les axes d'aujourd'hui.** `biomes[].axes` donne les axes d'aujourd'hui, et tout le moteur les lit : la niche de chaque lignée, la séparation, les saisons, les silhouettes. Une lignée de forêt vit moins bien dans une forêt défrichée.
- **La base.** `biomes[].transforme.base` garde les axes du lieu à l'éveil du milieu, et `transforme.jeu` ce que les joueurs y ont changé, qui s'efface.
- **La flore** (docs/17). La place de chaque plante suit le milieu : la capacité du lieu, et la part que son couvert, son humidité et sa température font à sa forme. Une forêt défrichée fait plus de place à l'herbe et moins aux arbres, et ses brouteurs y gagnent.
  - La part de référence d'une forme est celle du lieu à l'éveil du milieu, lue avec son milieu d'alors : un lac asséché devenu terre (docs/28) ne garde pas ses algues.
  - Une forme qui n'a plus sa place décline : au pire, elle perd sa repousse à chaque cycle, sans disparaître d'un coup. Une place qui fond (une catastrophe, un défrichage) ne tue pas une plante en un cycle.
  - **La recolonisation.** Une forme que le lieu porte aujourd'hui, mais dont il n'a presque plus de pieds (moins de 1 % de sa place), revient d'un lieu voisin : chaque cycle, 0,2 % de sa place en graines, de la lignée de cette forme la plus abondante chez ses voisins. Une prairie qui se referme accueille les arbres de la forêt voisine, un lac asséché les herbes de la prairie. Le journal le dit : « Lac : Bellune herbe (Prairie) y revient, d'un lieu voisin ».
- **Le journal.** Quand un axe d'un lieu a bougé de 0,05, un événement `transformation` le dit, avec sa cause : « Forêt : le couvert baisse de 0,85 à 0,8 (ce qu'y font les joueurs) ».

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "milieu": true }
```

Au cycle de nuit suivant, le milieu s'éveille, une fois pour toutes. Les axes de chaque lieu deviennent sa base, et ce que ses bêtes y pèsent devient sa référence. Le jour de l'éveil, rien ne bouge. Ensuite, le milieu suit ses bêtes avec retard : 10 % de l'écart par cycle.

## Ce que le monde en fait

`bancs/milieu.js`, sur le monde d'Orvane par biomes, avec la flore :

- **Le jour un.** Un monde sans milieu éveillé tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, les bêtes et les axes sont ceux qu'ils auraient été sans lui (seul le bâtisseur peut apparaître par mutation dès ce jour-là).
- **Le pâturage**, dans la savane (couvert 0,25) :
  - ses brouteurs d'un kilo et plus tenus au tiers pendant 40 cycles : elle se referme à 0,31. Les arbres y ont 128 % de leur place, et l'herbe 93 % ;
  - ses brouteurs multipliés par 1,5 à chaque cycle : elle s'ouvre à 0,01, et les arbres y perdent toute leur place.
- **Les terriers.** Les fouisseurs de la forêt rendus plus nombreux à chaque cycle pendant 30 cycles : la capacité de la forêt passe à 104,7 % de sa base.
- **Les barrages.** La moitié d'une grande lignée de la forêt porte le trait. La forêt borde le lac et la rivière, et son humidité passe de 0,65 à 0,84 en 30 cycles.
- **Le défrichage.** La forêt (couvert 0,85) est défrichée pendant 20 cycles, à 2 000 unités par cycle : son couvert tombe à 0,75. L'herbe y a alors 170 % de sa place, les arbres 88 %. Laissée 40 cycles, elle se referme à 0,81, et le journal dit que ce sont les joueurs.
- **Un axe quelconque.** `transformation` sur la température de la forêt la fait monter (de 0,5 à 0,504 en un cycle). Construire retire de l'habitat et du couvert.
- **Les parcelles.** Dans le monde à parcelles, le défrichage d'une parcelle de la forêt reste là : son couvert tombe à 0,80 contre 0,84 à 0,87 pour les autres, et la forêt publiée en fait la moyenne (0,84).

Le banc vérifie aussi le contrat (l'instantané, et un lot qui transforme le milieu sans taxon) et le cycle de nuit (le milieu s'éveille une fois).

```
node bancs/milieu.js            # environ 2 minutes
```

## Ce qui reste ouvert

- **Un lieu qui change de nature.** Fait (docs/28). Les formes de plantes qu'un lieu n'avait pas (des arbres dans une prairie reboisée) y reviennent désormais de ses voisins (la recolonisation, plus haut) ; un lieu sans voisin qui les porte les attend.
- **Les machines qui transforment.** Les foreuses de la Mère pourraient creuser, et les recycleurs nettoyer (docs/16).
- **Les plantes qui transforment.** Fait (docs/47) : le couvert d'un lieu suit ses arbres, dans un monde à la succession éveillée.
