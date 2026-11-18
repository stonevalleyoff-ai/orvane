# outils/terre : fabriquer un monde réel

Ces outils font un monde Orvane à partir de la vraie Terre, en commençant par l'Europe. Ils se lancent une fois, hors ligne. Ce ne sont pas des pièces du moteur : le moteur ne lit que ce qu'ils écrivent dans `mondes/europe/`.

| étape | outils | ce qu'ils écrivent |
| --- | --- | --- |
| la carte | `telecharger.py`, `fabriquer.py`, `commun.py` | `mondes/europe/lieux.json`, `mondes/europe/sources.json` |
| les espèces | `especes-*.py` | `mondes/europe/especes.json` |
| l'assemblage | `assembler.js` | `mondes/europe/amorce.json` |

## La carte

`mondes/europe/lieux.json` découpe l'Europe en cellules hexagonales H3. Chaque cellule donne plusieurs **lieux**, un par milieu qui y pèse assez :
- jusqu'à trois types terrestres ;
- un lac, une rivière, un marais, une côte ;
- une mer (haute mer ou mer froide) ;
- des abysses.

Les types sont ceux de `moteur/biomes-universels.json`, que les jeux connaissent déjà. Chaque lieu porte des valeurs **physiques** : sa position, son altitude, sa surface, sa part couverte d'arbres, ses normales climatiques 1991–2020 mois par mois. `assembler.js` les traduit en axes Orvane et en capacité.

### La refaire

Il faut Python 3 (essayé avec Python 3.13). Les versions essayées sont h3 4.5.0, numpy 2.5.5, rasterio 1.5.2 (GDAL 3.12), shapely 2.2.0, scipy 1.18.1, pyshp 3.1.9 et netCDF4 1.7.5.

```
python3 -m venv /tmp/terre-venv && /tmp/terre-venv/bin/pip install h3 numpy rasterio shapely scipy pyshp netCDF4
/tmp/terre-venv/bin/python -B outils/terre/telecharger.py --donnees <dossier des données brutes>   # une seule fois, environ 8 minutes
/tmp/terre-venv/bin/python -B outils/terre/fabriquer.py --donnees <dossier des données brutes>     # environ 50 secondes
```

- **Les données brutes** vont dans le dossier de `--donnees`, jamais dans le dépôt. La carte y laisse environ 170 Mo, et 600 Mo au plus fort. `telecharger.py` ne refait pas ce qui est déjà là, et il efface ses gros fichiers intermédiaires (CRU, OISST) dès qu'ils sont réduits à l'Europe.
- **Derrière un mandataire HTTPS** qui a son propre certificat, exportez `SSL_CERT_FILE` et `CURL_CA_BUNDLE`. `telecharger.py` le passe aussi à netCDF (un fichier `.ncrc` dans le dossier des données).
- **La résolution** se règle par `--resolution 3`. Les cellules font alors environ 12 400 km², au lieu de 87 000 en résolution 2.
- **Les règles** sont toutes dans le dictionnaire `R` en tête de `fabriquer.py`, et elles sont recopiées dans `lieux.json` (`regles`). Une règle se change sans toucher au fichier : `--regle part_type=0.25`.
- **Le fichier est reproductible** : mêmes données, même `lieux.json`, à l'octet près.
- **`sources.json`** est réécrit pour les sources de la carte. Celles qu'un autre outil y a mises, comme les espèces, sont gardées.

### Les données

Toutes ont une licence qui permet un usage commercial. Le détail est dans `mondes/europe/sources.json`, à créditer dans les jeux.

| donnée | licence | ce qu'on en tire |
| --- | --- | --- |
| Natural Earth 1:10m v5.1.1 | domaine public | le trait de côte, les lacs, les fleuves, les pays, les régions (admin-1), le nom des mers |
| ETOPO 2022, 1′ (NOAA) | domaine public | l'altitude, le relief, la profondeur |
| ESA WorldCover 2021, 10 m | CC BY 4.0 | la couverture du sol d'aujourd'hui : le type de chaque lieu, les lacs, les marais, les arbres |
| CRU TS 4.09, 0,5° | Open Government Licence v3 | les normales 1991–2020 des terres : température, pluie, ETP, nébulosité |
| NOAA OISST v2.1, 0,25° | domaine public | la température de surface de la mer, 1991–2020 |
| GPCP v2.3, 2,5° | domaine public | la pluie sur la mer, 1991–2020 |
| base tz de l'IANA (`zone.tab`) | domaine public | le fuseau de chaque lieu |

Sources écartées :
- **WorldClim** : non commercial.
- **L'API gratuite d'Open-Meteo** : non commerciale.
- **MEOW et FEOW** : les copies trouvées étaient non commerciales.
- **CHELSA** : il est en CC0, mais ses normales portent sur 1981–2010. CRU donne 1991–2020.

WorldCover n'est pas téléchargé en entier : ce seraient des dizaines de Go. On lit seulement l'aperçu au 1/32 (~300 m) des 339 tuiles qui ont de la terre, à distance (`/vsicurl/`). Chaque pixel de la grille de travail prend la classe sous son centre. Sur des milliers de pixels par cellule, ce tirage donne sans biais la part de chaque classe.

### Comment c'est fait

**La grille de travail** est celle d'ETOPO : 1 minute d'arc (~1,9 km), de 40° O à 62° E et de 30° N à 84° N. Chaque pixel y reçoit sa cellule H3 exacte (`latlng_to_cell`).

**L'Europe** couvre :
- les pays que Natural Earth range en Europe, jusqu'à 60° E (l'Oural) ;
- l'Islande, le Svalbard, la Nouvelle-Zemble et la Terre François-Joseph ;
- Chypre et la Thrace turque.

Le Kazakhstan, le Caucase du Sud, les Açores, Madère et les Canaries n'y sont pas. Les mers sont celles dont le centre de la cellule est à 400 km au plus des côtes d'Europe, et à 60° E au plus. La Caspienne en fait partie : elle borde la Russie d'Europe, et c'est une mer pour Natural Earth.

**Le type de chaque pixel de terre** vient d'abord de la couverture du sol d'aujourd'hui. Le climat et l'altitude tranchent ensuite :

| WorldCover | devient |
| --- | --- |
| cultures, prés, bâti | `prairie` (des prés au sec, sous l'indice d'aridité P/ETP 0,5 : `steppe` ; les cultures restent `prairie`) |
| arbres | `foret` ; `taiga` sous 4 °C de moyenne annuelle ou avec trois mois au plus au-dessus de 10 °C |
| arbustes | `steppe` au sec, `prairie` (une lande) sinon, `taiga` au froid |
| arbres, arbustes, herbe sous un été sec et une moyenne de 12 °C au moins | `maquis` (été sec : le mois d'été le plus sec sous 40 mm et sous le tiers du mois d'hiver le plus arrosé, Köppen Cs) |
| sol nu | `desert-froid` sous P/ETP 0,2 et 12 °C, `steppe` sinon |
| mousses ; tout pixel sous 10 °C au mois le plus chaud | `toundra` |
| neige et glace | `banquise` |
| au-dessus de 1 000 m, ou de 500 m avec un relief local de 150 m (écart-type) | `montagne` |
| au-dessus de 2 200 m, ou de 1 500 m sur roche, glace ou mousses | `sommets` |

**Le reste** :
- **les lacs** : l'eau de WorldCover dans les terres, plus les lacs de Natural Earth. L'eau collée à la mer (estuaires, fjords, lagunes ouvertes) est de la mer ;
- **les marais** : les zones humides de WorldCover ;
- **la côte** : la bande de terre à moins de deux pixels (~3 km) de la mer ;
- **les rivières** : les fleuves de Natural Earth de rang 5 au plus, avec 100 km au moins dans la cellule. Leur surface vaut la longueur × 0,5 km ;
- **la mer** : `mer-froide` sous 10 °C de température annuelle de surface, `large` sinon ;
- **les abysses** : là où plus de 1 000 m de fond couvrent 15 % de cette mer (et 2 000 km²).

**Les lieux d'une cellule.** On sépare d'abord ses terres et ses mers d'un seul tenant. Une cellule à cheval sur la Manche a ainsi deux jeux de lieux, l'anglais et le français, qui ne partagent pas leur prairie. Pour chaque terre d'un seul tenant :
- les types terrestres qui couvrent 15 % de cette terre font un lieu chacun (trois au plus) ;
- un lac fait un lieu s'il couvre 1,5 % de cette terre et 150 km² ; un marais, 3 % et 150 km² ;
- une côte fait un lieu avec 100 km² de bande côtière.

Puis **un lieu qui couvre moins de 2 % de sa cellule est fondu** dans le type terrestre dominant de sa terre : ses pixels le rejoignent. Une rivière, linéaire, échappe à cette règle. Une terre de moins de 2 % de la cellule (un îlot) va à la côte de la cellule. Les pixels qu'un type non gardé laisse prennent le lieu terrestre le plus proche de la même terre.

**L'identifiant** est `type~h3`, où h3 est la cellule sans ses `f` de fin (`foret~821f87`). La deuxième terre ou mer d'une même cellule porte `-2` à la fin (`prairie~821f07-2`). Les jeux lisent la cellule dans `lieu.h3`.

**Les voisins** se touchent pixel contre pixel (huit voisins), dans les limites que voici :
- la terre touche la terre, les eaux douces et la côte ;
- la côte touche la mer ;
- la mer touche la mer ;
- deux lieux terrestres de cellules voisines dont l'altitude diffère de plus de 1 000 m ne se touchent pas : une crête et une plaine.

S'y ajoutent des liens dans chaque terre d'une cellule :
- ses lieux terrestres touchent ses lacs, ses rivières, ses marais et sa côte ;
- ses eaux douces communiquent, et la rivière gagne la côte ;
- les abysses sont sous leur mer.

Les autres liens, et les replis :
- **les rivières** se suivent d'une cellule à l'autre le long du fleuve (vers sa rivière, sinon son lac) ;
- **une côte qui ne touche aucune mer** prend la mer de sa cellule, sinon celle des cellules voisines dont l'eau touche la sienne ;
- **une île dont la côte a été fondue** fait toucher son plus grand lieu à la mer de sa cellule.

Les îles restent des îles pour les bêtes de terre : la Grande-Bretagne, l'Irlande, l'Islande, la Sicile, la Corse, la Crète, Chypre et le Svalbard sont des terres à part. Tout le reste du monde est relié.

**Le climat d'un lieu** est la moyenne de ses pixels, pesée par leur surface :
- **la température** est celle de la case CRU (0,5°), corrigée de l'écart entre l'altitude du pixel et celle de la case (−6,5 °C par km) : une montagne est plus froide que sa plaine ;
- **la pluie et l'ETP** viennent de CRU (l'ETP est un Penman-Monteith) ;
- **la mer** prend la température de surface d'OISST et la pluie de GPCP ;
- **le rayonnement** est celui du haut de l'atmosphère (FAO-56) à la latitude du lieu, réduit par la nébulosité selon Ångström : Rs = (0,25 + 0,5 n/N) Ra, avec n/N ≈ 1 − nébulosité ;
- **`npp`** est vide : `assembler.js` la calcule (modèle de Miami).

**Le reste du lieu** :
- **le pays** est le plus répandu parmi ses pixels (la mer : celui de la terre d'Europe la plus proche). Il suit la norme ISO 3166 : la Crimée est `UA` ;
- **la région** est la plus répandue parmi ses pixels de ce pays, comptée par nom. Pour la France, l'Espagne, l'Italie, le Royaume-Uni et le Portugal, c'est la région ; ailleurs, le premier niveau administratif, en français quand Natural Earth le donne ;
- **le fuseau** est le fuseau principal du pays dans `zone.tab`. La Russie a le sien par oblast (Kaliningrad, Samara, Saratov, Oulianovsk, Astrakhan, Volgograd, Kirov, l'Oural : Iekaterinbourg). La Crimée prend `Europe/Simferopol`, le Svalbard `Arctic/Longyearbyen`.

### Le format

```json
{ "resolution": 2, "grille": "H3", "normales": "1991–2020", "unites": {…}, "regles": {…}, "lieux": [
  { "id": "prairie~821f87", "nom": "Prairie — Grand Est (FR)", "type": "prairie", "milieu": "terrestre",
    "voisins": ["foret~821f87", "prairie~821f8", …],
    "lieu": { "lat": 47.923, "lon": 6.889, "h3": "821f87fffffffff", "pays": "FR", "region": "Grand Est", "fuseau": "Europe/Paris",
              "altitude_m": 439, "relief_m": 266, "surface_km2": 41584.9, "couvert_arbre": 0.053 },
    "climat": { "t": [1.4, 2.5, …], "p": [68.1, 57.6, …], "etp": [13.2, 21.0, …], "rad": [3.4, 5.9, …], "npp": null } } ] }
```

Les unités :
- `t` : °C (pour la mer et les abysses, la température de surface) ;
- `p` et `etp` : mm par mois ;
- `rad` : MJ/m² par jour ;
- `relief_m` : l'écart-type de l'altitude ;
- `profondeur_m` : la profondeur moyenne (la mer seulement).

Les lieux marins n'ont ni `etp` ni `relief_m`. Deux lieux de même nom sont numérotés du nord au sud (« Taïga — Laponie (FI) 2 »).

### Ce que donne la résolution 2

**860 lieux** dans 271 cellules, 0,70 Mo :

| type | lieux | type | lieux |
| --- | --- | --- | --- |
| prairie | 137 | cote | 89 |
| foret | 85 | lac | 46 |
| taiga | 46 | riviere | 54 |
| montagne | 44 | marais | 23 |
| maquis | 25 | large | 93 |
| toundra | 14 | mer-froide | 95 |
| steppe | 9 | abysses | 89 |
| banquise | 8 | | |
| sommets | 3 | | |

- 9,8 millions de km² de terres (99,9 % de l'Europe placée : les îlots isolés de moins de 2 % de leur cellule sont laissés de côté), 10,5 millions de km² de mer.
- 144 lieux de moins de 2 % de leur cellule ont été fondus : 68 côtes, 38 lacs, 38 autres.
- Aucun lieu sans voisin, et les voisinages sont symétriques.

**Moins de lieux.** Pour en avoir moins, voici ce qu'on gagne (essayé) :

| règle | lieux |
| --- | --- |
| `--regle part_type=0.25` | ~780 |
| `--regle types_max=2` | ~825 |
| `--regle mer_km=250` | ~800 |
| `--regle abysses_part=0.5` | ~835 |

**Contrôle à la main**, une case CRU ramenée à l'altitude de la station, face aux normales 1991–2020 de la station (Météo-France, FMI, AEMET) :

| station | janvier | juillet | année | pluie |
| --- | --- | --- | --- | --- |
| Dijon | 3,0 °C (station 2,7) | 20,9 (20,8) | 11,8 (11,4) | 856 mm (743) |
| Rovaniemi | −11,9 (−10,3) | 15,2 (15,6) | 0,7 (1,5) | 575 (633) |
| Séville | 10,9 (11,2) | 27,3 (28,5) | 18,7 (19,6) | 578 (502) |

Les températures tiennent à 1,6 °C près, les pluies à 15 % près : c'est ce que vaut une case de 50 km.

### Ce qui reste approximatif

- **La résolution 2 est grossière.** Une cellule fait 300 km de large. Dijon est dans une cellule que le Grand Est domine, et aucun lieu ne s'appelle Bourgogne. Il n'y a que trois lieux `sommets` (le Valais et deux dans le Caucase) : les Alpes sont surtout `montagne`. La résolution 3 corrigerait beaucoup de cela, avec environ sept fois plus de lieux.
- **Les règles de type sont des seuils simples** (aridité, été sec, altitude), sans carte des biomes potentiels. Les oliveraies comptent comme des arbres : le maquis d'Andalousie a 55 % d'arbres.
- **Les abysses portent la température de surface.** Pour la température du fond, il faudrait le World Ocean Atlas (domaine public), qui n'est pas branché.
- **Le rayonnement est approché** (Ångström, nébulosité CRU) ; sur la mer, la nébulosité est celle de la terre la plus proche.
- **L'altitude d'un lac** est celle de sa case CRU : ETOPO donne parfois le fond des grands lacs.
- **La surface d'une rivière** (longueur × 0,5 km) est une convention. Elle n'est pas retirée des terres qu'elle traverse.
- **La glace de mer** n'est pas un lieu : la Botnie et la mer Blanche gèlent, mais restent des mers froides.
- **Les noms de régions** mêlent le français (quand Natural Earth le donne) et la langue du pays (Andalucía, Sicily).
- **Le pays des eaux** est celui de la terre la plus proche, sans frontière maritime.
- **La Caspienne** compte comme une mer, pour sept lieux à part, reliés à rien d'autre de marin.

## Les espèces

`mondes/europe/especes.json` est le vivant du monde « Europe ». On y trouve :

- **168 espèces jouées une à une** :
  - 69 mammifères, dont 9 marins ;
  - 61 oiseaux ;
  - 9 reptiles ;
  - 6 amphibiens ;
  - 23 poissons d'eau douce et de mer.
- **32 guildes**, chacune avec ses espèces réelles :
  - des insectes (pollinisateurs, phytophages, décomposeurs, prédateurs, piqueurs) et des vers ;
  - le plancton ;
  - les coquillages ;
  - les petits passereaux ;
  - les musaraignes ;
  - les petits poissons.
- **68 unités de flore**, au format des plantes d'Orvane :
  - des espèces dominantes, ou des groupes (graminées des prés, phytoplancton…) ;
  - des cultures ;
  - quatre champignons.

L'assembleur (`assembler.js`) en fait des lignées.

### La fabrication

```
pip install h3
python3 outils/terre/especes-gbif.py --donnees <dossier des données brutes>
python3 outils/terre/especes-construire.py --donnees <dossier des données brutes>
python3 outils/terre/especes-controle.py [--amorce mondes/europe/amorce.json]
```

Les scripts :

- **`especes-catalogue.py`** : la liste tenue à la main. On y trouve :
  - les espèces ;
  - les guildes et leurs espèces ;
  - la flore ;
  - un gabarit de silhouette par famille ;
  - ce que nulle base ouverte ne mesure : la sociabilité, le tempérament, la vitesse de pointe, la perception, la couleur, les habitats et la densité dans un habitat favorable. Tout cela est **estimé**.
- **`especes-gbif.py`** : pour chaque nom, trois choses.
  - Sa clé et sa classification dans l'épine dorsale de GBIF.
  - Son élément Wikidata (par P846), son nom français, la comestibilité d'un champignon (P789).
  - Sa présence par cellule H3 de résolution 2, sur les 275 cellules de `lieux.json`. Une requête compte, par cellule et par paquet de cent espèces, les observations GBIF depuis 2000 (une facette par espèce). Elle ne garde que les licences CC0 et CC-BY, sans problème géographique, ni fossiles ni bêtes captives. Il faut environ 900 requêtes, et chaque réponse est gardée : relancé, le script reprend où il s'était arrêté. Le service SPARQL de Wikidata limite parfois à une requête par minute ; le script attend.
- **`especes-construire.py`** : les traits, tirés des bases. Le catalogue l'emporte sur les bases pour un champ qu'il force, et pour les poissons.
- **`especes-controle.py`** : l'ordre de grandeur des effectifs (voir plus bas).

Les données brutes restent hors du dépôt :

| fichier | ce qu'il contient |
| --- | --- |
| `elton/` | EltonTraits |
| `amniote/` | la base Amniote |
| `pantheria/` | PanTHERIA |
| `amphibio/` | AmphiBIO |
| `anage/` | AnAge |
| `gbif-correspondances.json` | la clé et la classification de chaque nom |
| `wikidata.json` | les éléments Wikidata |
| `gbif-cellules/` | les réponses de GBIF, une par requête |
| `gbif-presence.json` | la présence par cellule |

Les bases se téléchargent depuis figshare (EltonTraits 3559887, Amniote 3563457, PanTHERIA 3531875, AmphiBIO 4644424) et depuis `genomics.senescence.info/species/dataset.zip` (AnAge). En tout, environ 15 Mo.

### Les unités et les règles

**Les unités** (docs/52) :

- `longevite` est en jours. C'est **la moitié de la longévité record** : une durée de vie typique. Le cerf vit 31,5 ans au plus d'après Amniote ; ici, 5 753 jours (15,8 ans).
- `maturite` est en jours : la première reproduction de la femelle.
- `portee` est en petits (ou œufs) par femelle et par an : la taille d'une portée × leur nombre par an, ou 1 / l'intervalle entre deux portées.

**La diète** reprend les parts d'EltonTraits, ramenées aux sept de docs/30 :

| EltonTraits | Orvane |
| --- | --- |
| PlantO | feuilles |
| Fruit | fruits |
| Seed | graines |
| Nect | nectar |
| Inv | insectes |
| vertébrés et charogne | viande |

Le régime s'en déduit. EltonTraits ne connaît pas le sang : seuls les moustiques et les tiques en boivent.

**L'activité** vient d'EltonTraits et d'AmphiBIO : de jour et de nuit, c'est `continue`.

**La masse et la taille** :

- d'abord Amniote, puis EltonTraits, PanTHERIA (la longueur tête-corps), AmphiBIO et AnAge ;
- un oiseau, qui n'a pas de longueur mesurée : `0,55 × masse^(1/3)`.

**La natalité** (`plan.natalite`) est posée pour les grandes pontes (plus de 50 œufs par an) : les poissons, les amphibiens, les invertébrés. Elle vaut 2 / la durée de vie, en ans. Sinon, la formule de l'assembleur en ferait des milliers par tête.

**Les poissons** : sans FishBase, dont la licence est non commerciale, leurs traits sont saisis. Ils sont marqués `"estime": true`. AnAge ne donne que des records (le plus gros brochet, la plus longue vie) : il n'y sert pas.

**Les habitats** sont les types de `lieux.json`. Le catalogue pense en types universels, et deux conversions s'appliquent :

- Un type que la carte n'a pas, ou presque pas (moins de 10 lieux), est complété par ses voisins, et la présence garde l'espèce dans son aire. Aujourd'hui, seuls les sommets (3 lieux) le sont : ils prennent la montagne. Le maquis prendrait la prairie et la forêt, mais la carte en a 25 lieux, et la grotte, absente de la carte, la montagne et la forêt.
- Un habitat que le moteur refuserait est ôté (`convenance`, moteur/orvane.js). Un lac ou une rivière demande de nager en eau douce ; la mer, de nager en eau salée ; un filtreur, de l'eau.

**La densité posée** : `densite_km2 = densite_favorable_km2 × occupation`.

- Une cellule H3 fait environ 80 000 km², et une espèce n'en tient pas toute la forêt. Sans cette part, les effectifs sortaient 2 à 7 fois trop hauts.
- L'occupation par défaut est 0,4 : la médiane de celles que donnent les espèces dont on connaît l'effectif européen.
- Pour ces espèces-là, c'est la leur, calée sur ce chiffre.
- Trois aires très morcelées ont la leur, estimée : le bison d'Europe, le bouquetin des Alpes et le daim.

**Les guildes** :

- `especes` donne leurs espèces réelles, avec leur `part` : moitié la part estimée, moitié la racine carrée des observations GBIF (pour tempérer le biais des observateurs).
- Une guilde de vertébrés prend la moyenne de ses espèces, pesée par leur part. Une guilde d'invertébrés est estimée.

**Les plantes** :

| champ | ce qu'il vaut |
| --- | --- |
| `forme` | une forme de moteur/diversite.js ; `port` s'en déduit |
| `caracteres` | ceux de docs/48, cuits comme le fait diversite.js : la croissance, l'appétence, les sinistres, le vent |
| `croissance` | à l'échelle d'Orvane, que le pas de temps du moteur ramène au jour |
| `masse_kg` | la masse de la forme × (hauteur / sa hauteur)^2,5 |
| `part` | la part de la place de son port dans chaque habitat |
| `phenotypes` | les quatre défenses de docs/17, quand la plante est épineuse ou toxique (la ronce, l'ortie, la fougère aigle) |

### Les contrôles

`especes-controle.py` compare deux effectifs, hors Russie, Biélorussie et Ukraine, à ce qu'on en sait :

- « brut » : la densité × la surface des lieux ;
- « monde » : ce que l'assembleur pose.

| espèce | monde (ouest) | avec l'occupation par défaut (0,4) | référence |
| --- | --- | --- | --- |
| chevreuil | 15,1 M | 15,9 M | ~15 M (ordre de grandeur, non relu à la source) |
| sanglier | 7,0 M | 5,2 M | plusieurs millions (non vérifié) |
| cerf élaphe | 2,6 M | 5,4 M | 2 à 3 M (non vérifié) |
| loup | 19 700 | 31 600 | 19 400 UE, ~21 500 hors Russie (Boitani et al. 2022, LCIE) |
| ours brun | 18 000 | 16 000 | ~20 500 (LCIE 2023) |
| lynx boréal | 8 400 | 8 200 | ~9 000 (LCIE 2023) |
| glouton | 1 100 | 900 | ~1 000 UE (LCIE) |

Avec la seule occupation par défaut, cinq espèces sur sept tombent dans la fourchette. Le cerf (× 2) et le loup (× 1,6) sortent au-dessus : leur aire est plus morcelée que leurs cellules.

Le monde assemblé tourne : 3 jours sur le moteur, 262 lignées. Toutes les silhouettes se dessinent (`moteur/corps.js`, `monde/silhouette.js`).

### Ce qui reste ouvert

- **Six unités n'ont pas de lieu dans le monde assemblé.**
  - Les deux lichens : la flore ne leur donne une place que là où l'axe de température est sous 0,1.
  - Les quatre champignons : leur port n'a de place que sous terre.
- **Les densités et les vitesses sont des ordres de grandeur**, à remplacer espèce par espèce par des mesures.
- **La présence par cellule est grossière.** Une cellule compte dès 3 observations, et un loup de passage suffit. Le biais des observateurs est fort : les oiseaux font 58 % des observations de GBIF.
- **Les licences.** Aucune donnée non commerciale (FishBase, iNaturalist sous CC-BY-NC, UICN, Map of Life, BIEN) n'est utilisée. Pour une publication, il faudra refaire les comptes GBIF par un téléchargement, qui donne un DOI à citer. Les sources sont dans `mondes/europe/sources.json`.
