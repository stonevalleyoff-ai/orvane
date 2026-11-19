# 52. La Terre : un monde réel, au jour

Jusqu'ici, tous les mondes d'Orvane étaient inventés : leurs biomes n'avaient pas de place sur une carte, leur année durait 120 cycles et leurs lignées naissaient de l'évolution. Désormais, un monde peut être la Terre, ou une région de la Terre :
- **un cycle est un jour**, et l'année a ses 365 jours (366 les années bissextiles) ;
- **chaque lieu a sa saison**, celle de son climat. L'hiver de Laponie n'est pas celui de l'Andalousie, l'été andalou est sec, l'été austral tombe en janvier ;
- **le soleil se lève et se couche** à son heure, et la nuit polaire comme le soleil de minuit ont lieu ;
- **la lune passe** ;
- **les bêtes sont de vraies espèces**, qui vivent leur vraie vie : un cerf vit une quinzaine d'années, donc quelque 5 500 cycles.

Le premier de ces mondes est l'Europe (`mondes/europe/`, fabriqué par `outils/terre/`). Le monde d'Orvane, lui, ne change pas, au bit près.

## Le calendrier

`moteur/calendrier.js`, sans état ni hasard. Un monde au calendrier le dit dans son instantané :

```json
"monde": { "id": "europe", "annee": 365, "calendrier": { "hemisphere": "nord" }, "temps": { "jours": 1 }, … }
```

**La date.** Le jour que vit un cycle est la date qu'il publie (`cycle.date`), et le cycle la donne en clair (`cycle.jour` : `"2026-11-17"`). Un monde hébergé tourne une fois par jour (docs/19). Un jour manqué n'est pas rejoué : la date du dernier cycle est celle où l'action est partie, donc le calendrier reste celui du monde réel. Pour le monde solo (`moteur/solo.js`), chaque cycle avance la date d'un jour, quelle que soit sa période réelle. L'accéléré fait passer plus de jours par minute.

**La saison d'un lieu.** Un lieu réel porte sa position (`lieu`) et ses normales mensuelles (`normales` : 12 températures, 12 pluies, 12 évapotranspirations). Chaque jour, le calendrier en tire :
- **sa phase** : la phase de son année. 0 est le cœur de son hiver, le creux de sa courbe de températures ; 0,5 le cœur de son été. Le nom de sa saison en vient ;
- **ses axes du jour** :
  - la température suit la vraie courbe de l'année, lissée en deux harmoniques entre les milieux de mois ;
  - l'humidité suit les pluies du mois écoulé ;
  - la lumière suit l'ensoleillement du jour ;
- **sa production du jour** : ce qui pousse ce jour-là, rapporté à ce qui pousse en moyenne dans l'année. Le gel et le sec la retiennent : Séville pousse au printemps et à l'automne, Paris l'été, la Laponie trois mois. Elle vaut 1 en moyenne et reste entre 0,3 et 1,7.

Un lieu qui n'a que sa latitude prend la saison du moteur, à la phase de son hémisphère. Un lieu sans position garde la saison du monde. Les plantes (docs/46) suivent la phase de leur lieu : le chêne de Bourgogne bourgeonne en avril, il est nu en décembre. La saison des naissances et les routes de l'hiver (docs/38) suivent aussi la phase du lieu, et l'hiver d'un lieu voisin est celui de son climat.

**Le soleil et la lune.** Chaque lieu publie son soleil : la durée du jour, le midi, le lever et le coucher en heure UTC, `nuit_polaire` ou `soleil_de_minuit`. Le cycle publie la lune : sa phase, la part éclairée, son nom. Les formules sont celles de Spencer et de la FAO, à quelques minutes près (le 21 juin, Paris a 16 h 11 de jour).

**Le décalage horaire.** Le moteur n'a pas d'heure : un cycle est un jour UTC, le même pour toute la planète. L'heure est l'affaire du jeu. Chaque lieu dit son fuseau (`lieu.fuseau`, au format IANA : `Europe/Paris`), son lever et son coucher. Un jeu calcule l'heure locale du lieu que joue son joueur, et en tire le jour, la nuit, les bêtes de l'aube et celles du soir (`plan.activite`).

## Le pas de temps

Le moteur a été réglé sur une « tranche de vie » d'environ 120 jours : une bête de 60 kg y vit 30 cycles et mûrit en 5. Ses constantes valent par tranche : la viande qu'il faut à un prédateur, la part qui essaime, la repousse d'une plante, la chance d'un incendie…

Un monde au jour dit `monde.temps = { jours: 1 }`. Le pas vaut alors jours / 120 (1/120), et le moteur met ses constantes à l'échelle :
- un taux est multiplié par le pas ;
- une chance par cycle devient 1 − (1 − p)^pas.

**Les durées d'un plan ne changent pas : elles restent en cycles, donc en jours.** Un cerf a `longevite: 5479` et `maturite: 730` ; sans naissances, il en meurt 1/15 par an.

À un pas de 1, rien ne change, au bit près. Le banc le vérifie : un monde à `temps: { jours: 120 }` tourne comme sans temps.

Ce que le pas ne change pas, parce que cela vit au rythme du joueur et non à celui de la vie :
- la méfiance et la mémoire (docs/12, docs/50) ;
- la météo (docs/45), qui était déjà le temps d'une journée.

**Sept champs du plan, pour une espèce réelle :**
- `natalite` : les petits qui passent leur première année, par tête et par an. Avec elle, la croissance ne se déduit plus de la portée et de la masse : elle est celle de l'espèce (le cerf 0,25 ; le loup 0,4). L'assemblage la calcule d'après la portée, la maturité, la longévité et la survie des jeunes ;
- `meute` : un chasseur en meute (le loup, 6) abat ce que la meute peut abattre. Seul, un prédateur ne prend pas plus de 1,5 fois sa masse ; la meute de loups vit de cerfs de 150 kg ;
- `naissances` : `{ centre, largeur }`, la fenêtre de l'année où naissent les petits, à la phase du lieu. Sans elle, c'est celle du monde (`regles.naissances` : vers la mi-mai, pour la force que le monde lui donne) ;
- `place` : la part de la capacité d'un lieu que l'espèce trouve vraiment, rapportée à ce que sa bande de masse lui donnerait. L'assemblage la cale pour que ses effectifs comptés soient son équilibre (plus bas, « L'équilibre observé ») ;
- `dispersion` : ce que l'espèce porte loin ses jeunes, rapporté à la règle du monde (`regles.colonisation`). Elle fonde d'autant plus vite un lieu voisin où elle n'est pas : le loup 5,9, le chevreuil 0,23. L'assemblage la tire de la masse (Sutherland et al. 2000), et l'étalon l'a réglée sur le retour du loup en France (docs/53) ;
- `efficacite` : l'adresse d'un chasseur, sa part des proies devant ses concurrents, calée à l'assemblage ;
- `metabolisme` : ce que la bête brûle, rapporté à un mammifère de sa masse. Il vaut 1 par défaut, et l'assemblage met 0,15 aux poissons, aux reptiles, aux amphibiens et aux invertébrés. La bête mange d'autant moins, et fait d'autant plus de petits de ce qu'elle mange.

**Ce qu'un prédateur mange, dans un monde réel.**
- **La ration** : un prédateur mange chaque jour ce que mange une vraie bête (`regles.besoin = 6` : un loup ~1 kg par jour, une buse ~50 g), et peu de cette viande fait des petits (`conversion = 0,06`).
- **La satiété** : il est rassasié à moitié quand il a cinq fois ce besoin à sa portée (`demi_satiete = 5`). Avec les trente fois d'Orvane et une ration réelle, presque tous les prédateurs d'Europe crevaient de faim : la satiété médiane était de 0,01. Elle est de 0,4 désormais.
- **Les petites proies** (`regles.petites_proies`) : un mangeur d'insectes prend les insectes, si petits soient-ils (la mésange les chenilles, la truite les larves). Dans l'eau, un chasseur qui nage avale des proies qui nagent jusqu'à cinq mille fois plus petites que lui (le thon le hareng, le phoque le cabillaud). Ailleurs, rien de plus petit qu'un cinquantième de sa masse, comme dans Orvane.

**Ce qu'il a fallu pour qu'un jour compte.** Ce qui change en un jour est cent fois plus petit que ce qui change en une tranche de vie :
- **l'arrondi** : un monde au jour écrit l'effectif exact (4 décimales), les allèles et les traits continus avec quatre chiffres de plus. Sans cela, trois cents loups restaient trois cents loups : chaque jour, l'arrondi effaçait ce qui avait changé ;
- **la fondation** : ce qui part chaque jour vers un lieu où la lignée n'est pas est une fraction de bête. Elle y fonde un groupe de quatre, une fois sur autant que la fraction le dit : le même nombre en moyenne, par un tirage qui ne prend rien au hasard du cycle ;
- **la dispersion** : dans un monde réel, une lignée essaime aussi vers les lieux voisins d'un autre type (de la forêt à la prairie), pas seulement vers les parcelles de son biome. Elle reste dans son milieu : la terre vers la terre, l'eau vers l'eau, les rives vers les deux. Un cerf sait nager, il ne s'installe pas pour autant dans le lac ;
- **l'aire d'une espèce** : un monde réel dit `regles.colonisation` (0,005 par cycle de référence, soit environ 1,5 % par an). C'est la chance qu'une lignée fonde, par un petit groupe, un lieu voisin où elle n'est pas, à proportion de ce que ce lieu lui convient. Ailleurs, elle n'essaime que chez les siens. Une espèce garde donc son aire réelle et l'étend lentement, comme le chacal doré gagne l'Europe. Sans cette règle, une population de cent millions de mulots envoyait chaque jour des milliers de bêtes dans chaque lieu voisin : en cinq jours, l'Europe passait de 29 000 à 46 000 populations, et chaque espèce gagnait tous les lieux qui lui allaient ;
- **les événements** : un jour ne fait ni effondrement ni explosion. Ils se liront sur des mois, et ce n'est pas encore fait. Les extinctions et les installations restent.

## Une Terre, sans l'évolution qui invente

Une espèce réelle ne se sépare pas en deux à l'échelle d'une vie humaine, et ne se donne pas d'organe nouveau. Un monde réel coupe donc :
- la séparation des lignées (`regles.separation.chance = 0`) ;
- les traits nouveaux (`nouveau_trait = 0`) ;
- les hybrides ;
- les épidémies tirées au hasard. Les maladies seront des souches réelles, plus tard.

Il garde tout ce qui est réel :
- la génétique continue : une population chassée sur ses plus grandes bêtes rapetisse, lentement, comme dans la réalité ;
- la méfiance ;
- les extinctions locales et les lieux gagnés ;
- les chaînes alimentaires, les saisons, la météo.

Une Terre qui laisserait l'évolution inventer serait un autre monde, copié à part.

## Ce que publie un monde au jour

| champ | ce qu'il dit |
| --- | --- |
| `monde.temps`, `monde.calendrier` | le pas de temps, le calendrier |
| `cycle.jour`, `cycle.lune` | le jour vécu, la lune |
| `biomes[].lieu`, `biomes[].normales` (dans l'état complet) | où est le lieu, ses normales |
| `biomes[].saison`, `biomes[].soleil` | la saison du lieu ce jour, son soleil |
| `parcelles[].lieu`, `parcelles[].saison`, `parcelles[].soleil` | la même chose dans la vue publiée, parcelle par parcelle |
| `taxons[].reel` | l'espèce réelle : nom scientifique, identifiant GBIF, classe, ordre, famille |
| `taxons[].guilde`, `taxons[].especes` | une guilde : les espèces réelles qu'elle rassemble, et leur part |
| `plan.natalite`, `plan.meute`, `plan.naissances`, `plan.place`, `plan.dispersion`, `plan.efficacite`, `plan.metabolisme` | plus haut |
| `attributions` | d'où viennent les données, sous quelle licence : un jeu qui montre ce monde les crédite |

Tout est ajouté, rien n'est retiré (`node outils/contrat.js` : le contrat tient). Un jeu qui ne connaît pas ces champs lit un monde réel comme un autre. Les biomes publiés sont les biomes universels (`foret`, `prairie`, `taiga`, `lac`…), et chaque lieu réel est une de leurs parcelles. Un jeu qui joue la Bourgogne lit la parcelle de sa forêt : `populations[].parcelles` donne l'effectif de chaque lignée, parcelle par parcelle.

## Fabriquer un monde réel

`outils/terre/` (son `LISEZ-MOI.md` dit comment refaire chaque fichier) :
1. **la carte** (`lieux.json`) : une grille d'hexagones H3, et dans chaque cellule un lieu par milieu qui y pèse, avec ses valeurs physiques :
   - position, pays, région, fuseau ;
   - altitude, surface, couvert d'arbres ;
   - normales mensuelles, production primaire ;
2. **le vivant** (`especes.json`) : des espèces réelles, avec leurs traits, leur densité, leurs habitats, leur présence par cellule ; des guildes pour le reste ; les plantes ;
3. **l'assemblage** (`outils/terre/assembler.js`) :
   - les axes viennent des passages du calendrier (`axeTemperature`, `axeHumidite`, `axeAltitude`, `axeLumiere`) ;
   - la capacité d'un lieu vient de sa production primaire (le modèle de Miami, à défaut d'une mesure) et de sa surface ;
   - une espèce vit dans les cellules où GBIF l'a vue. Une guilde d'invertébrés, de petits poissons ou de plantes vit partout où est son milieu : GBIF voit mal les invertébrés (les pucerons n'y étaient que sur 128 lieux, quand les coccinelles qui les mangent étaient sur 231) ;
   - la densité d'une guilde d'invertébrés vient de la littérature quand on la connaît (`especes-catalogue.py`, `SOURCES_DENSITE`) : les fourmis (Schultheiss et al. 2022), les collemboles et les acariens du sol, les cloportes (Petersen et Luxton 1982), les carabes (Lövei et Sunderland 1996), les larves des rivières, le zooplancton. Avec les premiers nombres ronds, il y avait autant d'araignées que d'insectes à manger ;
   - la niche d'une espèce est la moyenne des lieux où elle vit, sa tolérance leur dispersion ;
   - les effectifs viennent de sa densité et de la surface des lieux ;
   - la place de chaque port de plante se partage entre les plantes de ce port.

**L'équilibre observé.** Dans la nature, les effectifs que l'on compte sont ceux d'un équilibre. L'assemblage cale donc le monde pour que les brouteurs comptés ne croissent ni ne décroissent, en moyenne sur l'année :
- **la capacité d'un lieu** : la médiane de ce qu'il faudrait à chacun de ses brouteurs pour être à l'équilibre. C'est la charge de sa bande de masse, rapportée à la saturation où ses naissances égalent ses morts. La médiane est pesée par la racine des biomasses, et la capacité reste entre 0,1 et 10 fois ce que donne la production primaire ;
- **la place de chaque espèce** (`plan.place`), parce qu'une seule capacité par lieu ne peut convenir à tous.

Puis **le calage par le moteur** : l'assemblage fait tourner un jour du vrai moteur, sans rien en garder. Il y mesure les naissances, les morts et ce que mangent les prédateurs, et il ajuste deux réglages :
- **pour un brouteur, sa place** : sa saturation de l'année doit être celle où ses naissances égalent ses morts naturelles **et** les siens mangés ;
- **pour un carnivore, son efficacité de chasse** (`plan.efficacite` : sa part des proies devant ses concurrents) : sa satiété doit être celle où ses naissances, qui suivent la satiété, égalent ses morts (que la faim multiplie) et les siens mangés. Ce fut d'abord son métabolisme. Mais le métabolisme d'un chasseur fait aussi son poids devant les autres : relevé chez le renard, il affamait l'épervier, qui finissait au plus bas sans rien y gagner. Le métabolisme est désormais celui de la physiologie (1 pour un oiseau ou un mammifère, 0,15 pour une bête à sang froid).

Quatre passes, la concurrence se répondant (`--caler 4`).

Sans ce calage, les lapins partaient bien sous la place que leur donnait la production, et au premier printemps ils triplaient en un mois. Les truites et les cabillauds, affamés, fondaient de 5 % par mois, et le hareng, mangé plus vite qu'il ne naissait, aussi.

**Le calage sur une année entière** (`--caler-annee 3`). Le calage d'un jour ne voit que novembre. L'étalon (docs/53) a montré qu'au bout de deux ans, les insectes chasseurs s'effondraient, les rapaces perdaient les deux tiers, et les lapins et les lièvres doublaient. Chaque passe fait vivre une année entière, puis compare chaque espèce à elle-même un an plus tôt, à la même saison (λ). Elle corrige d'une part de l'écart (λ^0,8) :
- un brouteur qui a crû a trop de place ;
- un carnivore qui a crû chasse trop bien.

Puis elle recommence. Les grands carnivores (le loup, l'ours, les lynx, le glouton) n'y sont pas : les hommes les tiennent bas en Europe, et sans joueurs ils remontent, comme ils remontent en vrai. Une passe prend environ 50 minutes.

Une espèce qui passe d'un côté à l'autre d'une passe à la suivante (les papillons, ×10 puis ×0,11) a reçu un pas trop grand : le suivant est deux fois plus petit, comme une recherche par moitiés. Ce que chaque passe a vu est gardé à côté de son amorce (`<sortie>.lambda.json`) et relu par la suivante (`--depuis`). Une passe par lancement :

```
node outils/terre/assembler.js --monde europe --date 2026-11-18 --sortie f0.json                                   # le calage d'un jour
node outils/terre/assembler.js --monde europe --date 2026-11-18 --depuis f0.json --caler-annee 1 --sortie f1.json  # une année ; puis f1 → f2…
```

**Le repos d'hiver** (`regles.diapause`). Un animal à sang froid (`plan.metabolisme` < 1 : un insecte, un poisson, un reptile, un amphibien) passe la mauvaise saison en diapause : un œuf, une nymphe, une bête engourdie. Quand son lieu ne produit presque plus rien, il fait tout dix fois moins au cœur de l'hiver :
- il meurt moins ;
- il ne meurt pas de faim ;
- il mange moins ;
- il se cache mieux.

Son activité va de 0,1 au cœur de l'hiver à 1, dès que le lieu produit autant qu'en moyenne. Sans cela, les insectes proies mouraient chaque hiver sans naître, et leurs chasseurs avec eux : les coccinelles, les araignées et les libellules perdaient 90 % chaque année, quoi que fasse le calage.

**La concurrence entre chasseurs** (`regles.concurrence_masse = 0,7`). Deux chasseurs de tailles très différentes ne se disputent pas les mêmes proies au même endroit : l'araignée et la mésange, l'hermine et le loup. Leur concurrence décroît avec leur écart de masse, comme celle des brouteurs, d'un écart-type de 0,7 décade.

Sans cela, une araignée pesait d'autant moins devant les mésanges que ses besoins étaient petits, et n'avait jamais sa part, quel que soit son métabolisme. Avec cette règle, en novembre, la satiété des carabes passe de 0,08 à 0,68, celle des libellules de 0,09 à 0,82, celle du renard de 0,55 à 0,85.

**Ce que produit une proie** (`regles.renouvellement = 120`). Le besoin d'un prédateur se compte sur un cycle de référence, environ 120 jours. Ce qu'une proie lui offre est donc ce qui est sur pied **et** ce qui en naît pendant ces 120 jours, à la natalité de la proie : ×9 pour un puceron (25 petits par an), ×2,6 pour un criquet, ×1,9 pour un campagnol, ×1,1 pour un cerf. Le moteur ne regardait que ce qui était sur pied. Or un chasseur d'insectes mange, en une année, des dizaines de fois sa masse (l'araignée de 16 à 32 fois, Nyffeler et Birkhofer 2017), et des proies qui se refont vite ne sont jamais nombreuses sur pied. Seule, sans un concurrent, l'araignée n'aurait trouvé que 1,5 % de sa satiété, et aucune adresse de chasse ne pouvait l'en sortir. Dans Orvane, 0 : ce qui est sur pied.

**Les migrateurs** (`regles.hivernage.photoperiode`). Ils partent quand les jours raccourcissent sous 13 h 30 après l'été, à la latitude de leur lieu (fin août à 50° N), et reviennent quand ils repassent au-dessus de 11 h 30 (début mars). C'est un seuil pour tous, tiré de ce que font la plupart des migrateurs d'Europe, pas réglé sur une espèce. Avant, ils partaient avec le froid, fin octobre.

Un oiseau qui vole a aussi la niche de l'été, quand il niche : à la moyenne de l'année, son hiver lui paraissait aussi doux que l'été, et il ne partait jamais.

**Une vie sauvage, une croissance à sa mesure.** Pour un oiseau ou un mammifère, l'assemblage borne deux valeurs :
- la longévité du moteur, à une vie sauvage : au plus 3 × masse^0,3 années (un cerf ~14 ans, un chevreuil 7,5, un lapin 3,6, un mulot 1). La moitié du record faisait vivre un lapin neuf ans ;
- la croissance la plus forte, à deux fois la loi de Fenchel (0,025 × g^−0,26 par jour).

Une espèce qui pond par milliers (le hareng, la truite, le cabillaud) se renouvelle vite : ~5 / sa longévité en années, au plus 2 / sa maturité (une tortue reste lente).

**Les licences.** Les jeux branchés peuvent être commerciaux. Un monde réel ne prend donc que des données qu'un usage commercial permet (domaine public, CC0, CC-BY, OGL) et les crédite (`attributions`, `mondes/<monde>/sources.json`). Restent dehors :
- WorldClim, l'API gratuite d'Open-Meteo, FishBase, iNaturalist ;
- les aires et les statuts de l'UICN ;
- les observations GBIF sous licence non commerciale.

## L'Europe

Le premier monde réel (`mondes/europe/`) :
- **la carte** : 860 lieux dans 271 cellules H3 de résolution 2 (300 km de large), de l'Islande à l'Oural, avec les mers qui la bordent. Sur 9,8 millions de km² de terres et 10,5 millions de km² de mer :
  - prairie 137, forêt 85, taïga 46, montagne 44, maquis 25, toundra 14, steppe 9, banquise 8, sommets 3 ;
  - côte 89, rivière 54, lac 46, marais 23 ;
  - haute mer 93, mer froide 95, abysses 89.

  Les îles le sont pour les bêtes de terre (la Grande-Bretagne, l'Irlande, l'Islande, la Corse, la Sicile, la Crète, Chypre, le Svalbard). Les normales 1991–2020 collent aux stations de Dijon, Rovaniemi et Séville à 1,6 °C près ;
- **le vivant** : 168 espèces jouées une à une (69 mammifères, 61 oiseaux, 9 reptiles, 6 amphibiens, 23 poissons), 33 guildes qui montrent 218 espèces réelles (les insectes, les tiques, le plancton, les petits passereaux…), 68 plantes. Cela fait 31 500 populations ;
- **les effectifs posés**, hors Russie, Biélorussie et Ukraine : chevreuil 15 millions, sanglier 7 millions, cerf 2,6 millions, loup 19 700, ours brun 18 000, lynx boréal 8 400, glouton 1 100. Ce sont les ordres de grandeur connus. La densité de chaque espèce est une densité dans un habitat favorable × la part qu'elle en occupe à l'échelle d'une cellule (`densite_favorable_km2`, `occupation`), calée sur ces sept espèces ;
- **le coût** : environ 8 secondes par cycle sur un ordinateur, et une trentaine de secondes pour deux nuits complètes hébergées (le tampon, la publication, les morceaux). L'état pèse 19 Mo, l'instantané 3 Mo. L'essentiel du temps passe dans la concurrence entre brouteurs (`moteur/flore.js`).

**Une première année** (l'amorce calée, du 18 novembre 2026 au 12 novembre 2027, sans joueurs) :

| espèce | au départ | un an plus tard | |
| --- | --- | --- | --- |
| chevreuil | 23,1 M | 25,7 M | +11 % |
| cerf élaphe | 3,24 M | 3,38 M | +4 % |
| sanglier | 10,7 M | 15,7 M | +46 % |
| loup | 31 053 | 31 045 | 0 % |
| ours brun | 32 900 | 34 200 | +4 % |
| lynx boréal | 11 900 | 10 500 | −12 % |
| renard roux | 4,25 M | 4,91 M | +15 % |
| lièvre d'Europe | 24,0 M | 47,0 M | +96 % |
| lapin | 33,0 M | 69,7 M | +111 % |
| mulot sylvestre | 2,11 G | 2,12 G | 0 % |
| merle noir | 175 M | 164 M | −7 % |
| cigogne blanche | 578 000 | 513 000 | −11 % |
| hareng | 49,2 G | 46,5 G | −6 % |
| cabillaud | 450 M | 447 M | −1 % |
| truite | 715 M | 464 M | −35 % |

Ces chiffres couvrent toute l'Europe, Russie d'Europe comprise ; les espèces gardent leur nombre de lieux (29 000 à 30 000 populations). Sur l'année, aucune lignée ne s'éteint. L'hiver use, les naissances viennent de la mi-mai à août, et le pic de l'été redescend à l'automne. Trois écarts restent à reprendre :
- **le lapin et le lièvre doublent**. Le calage d'un jour ne voit pas leur pic d'été, qui ne se défait qu'à moitié l'hiver suivant. Les maladies qui les tiennent dans la réalité (la myxomatose, la RHDV2) ne sont pas encore là ;
- **le sanglier gagne près de moitié** ;
- **la truite perd un tiers**.

Le prochain pas est un calage sur une année entière : faire tourner un an, ajuster la place et le métabolisme d'après la croissance de l'année, recommencer.

Le monde ne tourne pas encore la nuit (`profil.monde.nocturne = false`) : il tournera quand on l'aura décidé. Ce qui est approché est dit dans `outils/terre/LISEZ-MOI.md`.

## Ce que le banc vérifie

`bancs/terre.js`, en quelques secondes :

| | |
| --- | --- |
| le 21 juin à Paris | 16,2 h de jour ; Sydney 9,9 h ; Tromsø, le soleil de minuit, puis la nuit polaire en décembre |
| le 24 novembre 2026 | la pleine lune |
| les années bissextiles | 2028 : 366 jours ; 2100 : 365 |
| la saison de Paris, de Buenos Aires, de Séville | l'hiver en janvier, l'été austral en janvier, l'été andalou sec |
| un pas de 1 | au bit près comme sans temps (trois cycles de la genèse 7) |
| un cerf de 15 ans, sans naissances | 93,6 % au bout d'un an |
| un monde réel, deux ans | les faons au printemps ; trois cents loups qui ne restent pas figés ; la meute vit de cerfs ; la forêt voisine gagnée ; l'hiver en Bourgogne quand c'est l'été en Patagonie ; le contrat respecté |
| avec la colonisation d'un monde réel | la forêt voisine n'est pas envahie en deux ans ; un cerf qui nage ne s'installe pas dans le lac |

```
node bancs/terre.js
```

## Ce qui reste ouvert

- **Les maladies réelles** : des souches au catalogue (la chytride, le syndrome du museau blanc, la grippe aviaire, la peste porcine africaine, la maladie débilitante chronique, le blanchissement des coraux), liées au climat, portées par les migrants. Aujourd'hui, les souches (docs/18) ne sont pas mises à l'échelle du pas : un monde réel ne les éveille pas.
- **La météo réelle** : guider la météo d'Orvane par les écarts réels du jour, tirés chaque nuit des prévisions publiques. Aujourd'hui, elle tourne autour des normales.
- **Les routes lointaines** : un oiseau migrateur traverse un continent. Les routes de l'hiver ne regardent encore que les lieux voisins.
- **Les événements sur des mois** : un effondrement, une explosion, lus sur une saison.
- **Les morceaux par région** : qu'un jeu en Provence ne lise que la Provence.
- **Une maille plus fine** : la résolution 3 (40 km), quand la concurrence entre brouteurs coûtera moins.
- **Le calage sur une année** : le lapin, le lièvre, le sanglier, la truite (plus haut, « L'Europe »).
