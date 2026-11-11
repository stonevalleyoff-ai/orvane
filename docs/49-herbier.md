# 49. L'herbier : les plantes dessinées

Les bêtes ont leurs planches (docs/21) : à chaque cycle, chaque lignée de chaque biome est dessinée, et un jeu les montre sans refaire leur dessin. Les plantes n'en avaient pas. Maintenant, à chaque cycle, chaque plante de chaque biome est dessinée aussi : selon sa forme, et selon ce qu'elle est ce cycle. C'est la sixième étape du chantier « flore, météo et saisons » : ce qui rend les cinq premières visibles.

`monde/herbier.js`. Il ne change rien au monde : c'est une lecture de `flore.json`.

## Le dessin d'une plante

Il vient de son plan et de son état du cycle :
- **sa forme** : les huit formes d'origine et les quarante-sept de la flore riche (docs/48) ont chacune leur dessin. Un conifère a ses étages, un palmier ses palmes, un palétuvier ses racines échasses, un arbre-bouteille son tronc renflé, un cactus ses bras, un nénuphar ses feuilles sur l'eau ;
- **son nom** : deux lignées d'une même forme n'ont pas tout à fait le même dessin. La même lignée garde le sien d'un cycle à l'autre ;
- **sa niche** : son vert est sombre au froid, vif au chaud et à l'humide ;
- **son stade** (docs/46) : nue, en bourgeons, en fleurs, en feuilles, en fruits, en graines, ses feuilles tombent, sèche, sous la neige ;
- **son feuillage** : la part de ses feuilles qui sont là ;
- **un incendie récent** (docs/47) : un arbre noir et nu ;
- **sa défense la plus fréquente dans ce biome** (docs/17) : ses épines.

Une forme que l'herbier ne connaît pas se dessine comme son port. Chaque plante remplit son cadre de 120 × 150, le pied en bas ; sa taille vraie est dans son plan (`hauteur_m`).

## Ce qui est publié

`morceaux/herbier/<biome>.json`, à côté des planches des bêtes (`morceaux/silhouettes/`), à chaque cycle :

```json
{ "orvane": "1.0", "monde": { "id": "orvane" }, "cycle": { "n": 50, … }, "biome": "foret", "cadre": [120, 150],
  "meteo": { "temps": "pluie", "t": -0.49, "e": 0.41, … },
  "plantes": {
    "flore-foret-arbre": { "svg": "<svg …>…</svg>", "nom": "Lunesor arbre (Forêt)", "forme": "arbre", "port": "arbre", "hauteur_m": 12,
                           "part": 0.34, "stade": "fleurs", "feuillage": 1 } } }
```

- **`plantes`** : les plantes du biome, les plus lourdes d'abord. `part` est son poids parmi elles : de quoi en semer plus ou moins dans un décor.
- **`stade`, `feuillage`, `defense`, `caracteres`, `sinistre`** : ce que le dessin montre, pour un jeu qui veut le dire ou le jouer.
- **`meteo`** : le temps qu'il fait dans le biome (docs/45), s'il en a un. Un jeu qui lit l'herbier d'un lieu a son décor et son temps d'une seule lecture.

Un monde sans météo, sans saisons des plantes ni flore riche a son herbier quand même : ses huit formes, en feuilles. Un monde sans flore n'en a pas.

**Ce que ça pèse.** Un dessin fait de 0,5 à 8 Ko. Sur le monde de banc à la flore riche (24 biomes, 261 lignées), 724 Ko en tout, 30 Ko par biome en moyenne ; les planches des bêtes en font 2,8 Mo.

## L'observatoire

`monde/` montre l'herbier de chaque biome sous ses bêtes : ses dix plantes les plus lourdes, dessinées dans leur stade du cycle, avec leur nom au survol ; et le temps qu'il fait. Les mécanismes ont leur carte : « La météo », « La flore riche ».

## Dans un jeu

**Le kit Godot** (`kits/godot/`, docs/44) :

```gdscript
await Orvane.lire_herbier("foret")                     # les plantes du lieu, dessinées, et le temps qu'il y fait
for p in Orvane.plantes("foret"):                      # les plus lourdes d'abord : id, nom, forme, port, hauteur_m, part, stade…
	var image := Orvane.texture_plante(p["id"], 96.0, "foret")   # son dessin, à 96 pixels de large ; son pied à 144/150 de sa hauteur
var temps := Orvane.temps("foret")                     # "pluie", "neige"… ; "" dans un monde sans météo
var m := Orvane.meteo("foret")                         # { temps, t, e, vent, neige, secheresse, eaux, production }
```

Hors ligne, `Orvane.ajouter_herbier(biome, herbier)` donne au kit un herbier gardé dans le jeu.

**Le kit Unity** : `instantane.Biome("foret").Meteo` rend le temps du lieu (`Temps`, `Vent`, `Neige`, `Secheresse`…), ou `null`. Il ne lit pas encore l'herbier.

**[Lisière](https://github.com/stonevalleyoff-ai/Lisiere)** (son propre dépôt), le premier jeu à s'en servir :
- chaque arbre, chaque buisson, chaque touffe du lieu est une lignée de plantes d'Orvane, semée selon son poids, à sa taille (un arbre de 6 m fait 80 pixels, un arbre de 60 m 150), dans son stade du cycle ;
- la pluie, l'orage, la tempête, la neige et le brouillard se dessinent et se disent à l'horloge (« été, pluie ») ;
- sous l'eau et le vent, le feu mange son bois plus vite : × 1,4 sous la pluie, × 1,7 sous l'orage, × 2 sous la tempête ;
- la neige au sol ralentit la marche d'un cinquième.

Aujourd'hui, le monde d'Orvane n'a ni météo ni flore riche : la forêt de Lisière porte ses trois plantes (un arbre, un buisson, une herbe), et il y fait toujours beau. Sur un monde d'essai où tout est éveillé, la même forêt porte quinze lignées, en fleurs sous la pluie.

## Ce que le banc vérifie

`bancs/herbier.js`, en vingt secondes :
- **Le dessin.** 55 formes dessinées, toutes lisibles ; aucune ne se confond avec une autre ; la même lignée a toujours le même dessin, deux lignées de la même forme en ont deux.
- **Ce qu'elle est ce cycle.** Un arbre a sept dessins, une herbe cinq ; les épines et la part du feuillage se voient.
- **La planche d'un biome.** La forêt : 15 plantes, les plus lourdes d'abord, chacune avec sa forme, son port, sa hauteur et son stade ; le temps qu'il fait. Un monde sans les modules nouveaux a son herbier quand même.
- **Le cycle de nuit** écrit une planche de plantes par biome, à côté de celles des bêtes.

```
node bancs/herbier.js
```

Et dans Godot, l'essai sans écran de Lisière (dans son dépôt : `outils/godot.sh --headless --path . -- --essai`, 29 vérifications) : le décor est fait des plantes du lieu (655 objets dessinés d'après l'herbier) ; sous la tempête, le feu mange deux fois plus de bois ; la pluie et la neige se dessinent et se disent à l'horloge ; dans la neige, on marche moins vite. Son banc (`outils/banc.js`, dans son dépôt) vérifie que chaque lieu gardé dans le jeu a son herbier.

## Ce qui reste ouvert

- **Par parcelle.** L'herbier est par biome ; deux parcelles d'une même forêt ont le même. Le temps de chaque parcelle est dans `parcelles[].meteo`.
- **La taille dans le dessin.** Chaque plante remplit son cadre : c'est au jeu de la mettre à l'échelle d'après `hauteur_m`.
- **Les dessins sont simples.** Des silhouettes de planche, pas des textures de jeu.
