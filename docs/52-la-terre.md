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

**Trois champs du plan, pour une espèce réelle :**
- `natalite` : les petits qui passent leur première année, par tête et par an. Avec elle, la croissance ne se déduit plus de la portée et de la masse : elle est celle de l'espèce (le cerf 0,25 ; le loup 0,4). L'assemblage la calcule d'après la portée, la maturité, la longévité et la survie des jeunes ;
- `meute` : un chasseur en meute (le loup, 6) abat ce que la meute peut abattre. Seul, un prédateur ne prend pas plus de 1,5 fois sa masse ; la meute de loups vit de cerfs de 150 kg ;
- `naissances` : `{ centre, largeur }`, la fenêtre de l'année où naissent les petits, à la phase du lieu. Sans elle, c'est celle du monde (`regles.naissances` : vers la mi-mai, pour la force que le monde lui donne).

**Ce qu'il a fallu pour qu'un jour compte.** Ce qui change en un jour est cent fois plus petit que ce qui change en une tranche de vie :
- **l'arrondi** : un monde au jour écrit l'effectif exact (4 décimales), les allèles et les traits continus avec quatre chiffres de plus. Sans cela, trois cents loups restaient trois cents loups : chaque jour, l'arrondi effaçait ce qui avait changé ;
- **la fondation** : ce qui part chaque jour vers un lieu où la lignée n'est pas est une fraction de bête. Elle y fonde un groupe de quatre, une fois sur autant que la fraction le dit : le même nombre en moyenne, par un tirage qui ne prend rien au hasard du cycle ;
- **la dispersion** : dans un monde réel, une lignée gagne aussi les lieux voisins d'un autre type où elle peut vivre (de la forêt à la prairie), pas seulement les parcelles de son biome ;
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
| `plan.natalite`, `plan.meute`, `plan.naissances` | plus haut |
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
   - la niche d'une espèce est la moyenne des lieux où elle vit, sa tolérance leur dispersion ;
   - les effectifs viennent de sa densité et de la surface des lieux ;
   - la place de chaque port de plante se partage entre les plantes de ce port.

**Les licences.** Les jeux branchés peuvent être commerciaux. Un monde réel ne prend donc que des données qu'un usage commercial permet (domaine public, CC0, CC-BY, OGL) et les crédite (`attributions`, `mondes/<monde>/sources.json`). Restent dehors :
- WorldClim, l'API gratuite d'Open-Meteo, FishBase, iNaturalist ;
- les aires et les statuts de l'UICN ;
- les observations GBIF sous licence non commerciale.

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

```
node bancs/terre.js
```

## Ce qui reste ouvert

- **Les maladies réelles** : des souches au catalogue (la chytride, le syndrome du museau blanc, la grippe aviaire, la peste porcine africaine, la maladie débilitante chronique, le blanchissement des coraux), liées au climat, portées par les migrants. Aujourd'hui, les souches (docs/18) ne sont pas mises à l'échelle du pas : un monde réel ne les éveille pas.
- **La météo réelle** : guider la météo d'Orvane par les écarts réels du jour, tirés chaque nuit des prévisions publiques. Aujourd'hui, elle tourne autour des normales.
- **Les routes lointaines** : un oiseau migrateur traverse un continent. Les routes de l'hiver ne regardent encore que les lieux voisins.
- **Les événements sur des mois** : un effondrement, une explosion, lus sur une saison.
- **Les morceaux par région** : qu'un jeu en Provence ne lise que la Provence.
