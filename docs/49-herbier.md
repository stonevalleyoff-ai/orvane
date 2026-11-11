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

## Ce que le banc vérifie

`bancs/herbier.js`, en vingt secondes :
- **Le dessin.** 55 formes dessinées, toutes lisibles ; aucune ne se confond avec une autre ; la même lignée a toujours le même dessin, deux lignées de la même forme en ont deux.
- **Ce qu'elle est ce cycle.** Un arbre a sept dessins, une herbe cinq ; les épines et la part du feuillage se voient.
- **La planche d'un biome.** La forêt : 15 plantes, les plus lourdes d'abord, chacune avec sa forme, son port, sa hauteur et son stade ; le temps qu'il fait. Un monde sans les modules nouveaux a son herbier quand même.
- **Le cycle de nuit** écrit une planche de plantes par biome, à côté de celles des bêtes.

```
node bancs/herbier.js
```

## Ce qui reste ouvert

- **Par parcelle.** L'herbier est par biome ; deux parcelles d'une même forêt ont le même. Le temps de chaque parcelle est dans `parcelles[].meteo`.
- **La taille dans le dessin.** Chaque plante remplit son cadre : c'est au jeu de la mettre à l'échelle d'après `hauteur_m`.
- **Les dessins sont simples.** Des silhouettes de planche, pas des textures de jeu.
