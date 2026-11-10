# 46. Les saisons des plantes

Jusqu'ici, la flore (docs/17) ignorait l'année. La saison pesait sur la place des bêtes, mais un arbre poussait en plein hiver comme en été, et le nectar coulait en janvier. Maintenant, dans un monde où les plantes ont pris les saisons, elles ont leur calendrier : des arbres qui perdent leurs feuilles, des fleurs au printemps, des fruits à la fin de l'été, des graines à l'automne. C'est la troisième étape du chantier « flore, météo et saisons ».

`moteur/phenologie.js`, que la flore appelle. Il faut une flore (docs/17) et une année (`monde.annee`). Un monde qui ne l'a pas éveillé n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Il n'a pas de hasard.

## Caduc ou persistant

Chaque lignée d'arbres ou de buissons a son feuillage (`plan.feuillage`), d'après la température de sa niche :

| niche | feuillage | exemples |
| --- | --- | --- |
| froide (sous 0,3) | `persistant` | les arbres de la taïga |
| tempérée | `caduc` | ceux de la forêt, des bois |
| chaude (au-dessus de 0,7) | `persistant` | ceux de la jungle |

Les autres formes n'ont pas de feuillage à perdre ; l'herbe et le roseau sèchent en hiver.

## La pousse suit la belle saison

La repousse d'une plante (docs/17) se concentre à la belle saison. Sur l'année, elle reste ce qu'elle était.

| plante | au cœur de l'hiver | au cœur de l'été |
| --- | --- | --- |
| arbre ou buisson caduc | rien | le double |
| herbe | 20 % | 180 % |
| roseau | 40 % | 160 % |
| algue | 60 % | 140 % |
| arbre persistant, lichen | 70 % | 130 % |
| succulente | 80 % | 120 % |
| champignon | toute l'année | |

Dans un monde à la météo éveillée (docs/45), la pousse suit aussi le temps qu'il fait : la production du cycle du lieu.

**La dent suit la saison, elle aussi.** Une plante est broutée moitié moins au cœur de l'hiver et moitié plus au cœur de l'été (1 en moyenne). Sans cela, un arbre nu qui ne repousse plus serait mangé tout l'hiver comme en été.

## Le nectar, les fruits, les graines

Chaque part qu'une plante donne (docs/30) a sa saison. La phase 0 est le cœur de l'hiver, 0,5 celui de l'été.

| part | sa saison | au plus fort | hors saison |
| --- | --- | --- | --- |
| le nectar | le printemps (phase 0,33) | × 2,6 | × 0,15 |
| les fruits | la fin de l'été (phase 0,68) | × 3,1 | × 0,1 |
| les graines | l'automne (phase 0,8) | × 2,3 | × 0,3 |
| les feuilles | toute l'année | × 1 | × 1 |

- **Chacune vaut 1 en moyenne sur l'année** : rien ne se déplace d'une année sur l'autre.
- **Les feuilles ne bougent pas.** La saison pèse déjà sur la place de qui les mange (la production du lieu, ±25 %). La compter ici une seconde fois affamerait les brouteurs deux fois.
- **Les butineurs** (docs/18) et les bêtes dont le spectre porte du nectar, des fruits ou des graines connaissent l'abondance, puis la disette : leur nourriture (`populations[].nourriture`) monte et retombe avec le calendrier.
- **Une bête qui ne trouve plus de fruits** reporte sa dent sur ce qui reste : les feuilles des mêmes plantes en souffrent plus.

## La force des saisons d'un lieu

Tout suit la force des saisons du lieu : l'amplitude de sa température au fil de l'année, rapportée à 0,15 (celle d'un lieu ordinaire).
- la forêt, la prairie, la taïga : entière ;
- la jungle, la mangrove, le récif : un cinquième. Leurs plantes fleurissent et fructifient presque toute l'année ;
- le volcan, la grotte : nulle.

## L'éveil

L'effet monte de 0 à 1 en une année à partir de l'éveil. Le jour de l'éveil, rien ne bouge, et les bêtes ont un an pour s'y faire. Les stades, eux, se disent dès le premier cycle.

## Ce qu'un jeu en fait

Dans `flore.json` (docs/17), chaque population de plante dit où elle en est :

```json
{ "biome": "foret", "effectif": 1203.4, …, "stade": "fruits", "feuillage": 1 }
```

| `stade` | ce qu'on voit |
| --- | --- |
| `nu` | un arbre caduc en hiver |
| `bourgeons` | la fin de l'hiver, avant les fleurs |
| `fleurs` | le printemps |
| `feuilles` | en feuilles, sans rien de plus ; aussi toute plante d'un lieu sans saisons |
| `fruits` | la fin de l'été (arbres, buissons, succulentes) |
| `graines` | l'herbe à l'automne |
| `feuilles_tombent` | un arbre caduc à l'automne |
| `seche` | l'herbe et le roseau en hiver |
| `sous_la_neige` | une plante de moins de 50 cm sous un manteau de neige (docs/45) |

- `feuillage` (de 0 à 1) dit la part des feuilles qui sont là : 0 pour un arbre nu, 0,4 pour une herbe sèche.
- D'autres stades pourront venir. Un jeu qui n'en connaît pas un montre la plante en feuilles.
- Un jeu qui ne lit pas les plantes voit quand même la nourriture des butineurs et des mangeurs de fruits suivre l'année.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "annee": 120, "flore": true, "phenologie": true }
```

Au cycle de nuit suivant, les plantes prennent les saisons, une fois pour toutes.

## Ce que le banc vérifie

`bancs/phenologie.js`, sur le monde d'Orvane :

- **Le jour un.** Un monde sans phénologie tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge, et 55 populations de plantes disent déjà leur stade.
- **Le calendrier.**
  - Le nectar culmine au printemps, les fruits à la fin de l'été, les graines à l'automne ; chacun vaut 1 en moyenne sur l'année.
  - 11 lignées d'arbres et de buissons sur 20 sont caduques : celles de la forêt le sont, celles de la taïga et de la jungle gardent leurs feuilles.
  - Un arbre de la forêt ne pousse plus au cœur de l'hiver et pousse double au cœur de l'été. Un arbre de la taïga garde 70 % de sa pousse l'hiver, un arbre de la jungle 94 %.
- **Une année** (120 cycles, effet entier, partis du printemps).
  - Les arbres de la forêt sont en fleurs, puis en feuilles, en fruits, leurs feuilles tombent, ils sont nus, en bourgeons, puis de nouveau en fleurs.
  - La jungle reste en feuilles toute l'année. Les arbres de la taïga ne sont jamais nus. L'herbe de la prairie est en fleurs, en feuilles, en graines, puis sèche.
  - Un butineur de la forêt y trouve 135 % de sa nourriture au printemps, 78 % au cœur de l'hiver.
  - Un mangeur de fruits, 178 % à la fin de l'été, 67 % à la fin de l'hiver. Un mangeur de feuilles, 100 % toute l'année.
  - Au bout de l'année, les bêtes pèsent 98,5 % de ce qu'elles pèsent sans les saisons des plantes, les plantes 101 %, avec 191 lignées de bêtes des deux côtés.
- **La neige.** Sous un manteau de neige (docs/45), l'herbe de la taïga est sous la neige, l'arbre non. La météo et les saisons des plantes tournent ensemble.
- **Les parcelles, le contrat et le cycle de nuit.** L'instantané et ses plantes respectent le schéma, par biome et par parcelles ; le profil éveille les saisons des plantes une fois, et `flore.json` dit le stade de chaque plante.

**Au creux de l'hiver.** Les plantes pèsent jusqu'à 13 % de moins que sans leurs saisons, et les bêtes 3 % de moins ; tout revient au printemps.

**Dans le monde d'Orvane, l'abondance ne se lit pas encore.** La nourriture d'un brouteur est bornée au double de ce qu'elle était à l'éveil de la flore (docs/17), et les butineurs comme les mangeurs de fruits du monde d'Orvane sont déjà à ce plafond : ses plantes pèsent plusieurs fois leur poids de l'éveil. Le printemps ne peut donc pas les nourrir davantage ; seule la disette se voit (les butineurs à 97 % au cœur de l'hiver, les mangeurs de fruits à 80 %).

```
node bancs/phenologie.js            # environ 8 minutes
node bancs/phenologie.js --court    # une demi-année
```

## Ce qui reste ouvert

- **Le plafond de la nourriture.** Tant que les brouteurs du monde d'Orvane sont au plafond (le double de l'éveil), l'abondance d'une saison ne leur donne rien. Relever la borne, ou rapporter la nourriture à une référence plus récente, changerait l'équilibre du monde : à décider à part.
- **Les plantes ne meurent pas du temps qu'il fait.** Un gel tardif ne tue pas les fleurs, une sécheresse ne tue pas de pieds, un incendie ne brûle pas d'arbres. C'est l'étape suivante.
- **La neige ne cache pas la nourriture.** Une herbe sous la neige se broute encore comme avant ; le stade ne sert qu'à la montrer.
- **Une saison sèche.** Les savanes ont une saison des pluies plutôt qu'un hiver ; ici, toutes les plantes suivent la même année.
- **Le feuillage n'évolue pas.** Une lignée caduque le reste, même si le climat (docs/31) réchauffe son lieu.
