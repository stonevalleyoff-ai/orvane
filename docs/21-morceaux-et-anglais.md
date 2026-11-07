# 21. Le monde par morceaux, et en anglais

`instantane.json` fait plus d'un mégaoctet. Un jeu qui ne joue que la prairie et la forêt le lisait pourtant en entier. Et un développeur qui ne lit pas le français devait deviner ce que veulent dire `effectif`, `lignee` ou `prelevement`. Le monde se lit désormais par morceaux, et le guide existe en anglais, avec un glossaire de tous les champs. C'est le quatrième des quatre points qui rendent Orvane universel.

## Les morceaux

À chaque cycle, à côté de `instantane.json`, le monde est publié dans `mondes/<id>/morceaux/` :

| fichier | ce qu'il porte | taille (le monde d'Orvane) |
| --- | --- | --- |
| `index.json` | le monde, le cycle, les biomes, le catalogue, le journal, et une ligne par lignée (`id`, `nom`, `famille`, `regime`, `masse_kg`, `statut`, `effectif`, `biomes`, `fichier`) | 62 Ko |
| `biomes/<biome>.json` | les lignées qui y vivent, avec leurs seules populations de ce biome, et le cycle d'avant | de 19 à 296 Ko |
| `lignees/<id>.json` | une lignée entière, avec toutes ses populations et son cycle d'avant | 29 Ko au plus |

Les morceaux sont refaits à chaque cycle : ceux d'une lignée éteinte disparaissent.

**Le lire.** `tampon/morceaux.js`, à copier dans le jeu (Node ou navigateur) :

```js
const inst = await OrvaneMorceaux.lire('https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/', { biomes: ['prairie', 'foret'] });
```

`lire` lit l'index, puis les biomes demandés, et rend un instantané au même contrat que `instantane.json`, réduit à ces biomes. Le reste du code du jeu, et son traducteur, le lisent sans rien changer. Pour la prairie et la forêt, cela fait 50 lignées et 400 Ko, au lieu de 112 lignées et 1,2 Mo.
- **Sans `biomes`**, `lire` réunit tous les biomes et redonne `instantane.json`. Seule différence : les populations de chaque lignée y sont rangées dans l'ordre des biomes du monde.
- **Pour lire autrement** que par `fetch` (un cache, des fichiers locaux), passez `lecteur` : une fonction qui reçoit le chemin d'un morceau et rend son contenu.
- **Pour une fiche**, un bestiaire ou une recherche, l'index suffit souvent : le nom, la famille, le régime, la masse, l'effectif et les biomes de chaque lignée, en 62 Ko. Le fichier d'une lignée la donne ensuite entière.

## En anglais

- [`CONNECT-A-GAME.md`](../CONNECT-A-GAME.md) : le guide pas à pas, en entier, en anglais. C'est la traduction de `BRANCHER-UN-JEU.md` : les adresses, les appels, les exemples, les erreurs (dont le texte reste en français, traduit à côté) et la liste de vérification.
- [`docs/glossary.md`](glossary.md) : chaque champ de l'instantané, du lot et de l'exposition, avec sa traduction et ce qu'il veut dire, ainsi que les valeurs (les régimes, les déplacements, les actions, les types d'événements) et les mots du monde.
- `llms.txt` pointe vers les deux.

Les noms des champs restent en français. Le contrat ne change pas, et aucun jeu branché n'a rien à refaire.

## Les planches : les bêtes, dessinées

À chaque cycle, à côté des morceaux, une planche par biome : `morceaux/silhouettes/<biome>.json`. Chaque bête du biome y est dessinée de profil, la tête à droite, comme sur une planche de naturaliste, par le même dessin que l'observatoire (`monde/silhouette.js`), sous sa variante la plus fréquente dans ce biome :

```json
{ "orvane": "1.0", "monde": { "id": "orvane" }, "cycle": { "n": 46 }, "biome": "foret", "cadre": [170, 90],
  "silhouettes": { "dunvi": { "svg": "<svg viewBox=\"0 0 170 90\" …>…</svg>", "yeux": [[140.8, 28.8, 2.1]], "sol": true, "phenotype": "base" } } }
```

- **`svg`** : le dessin, un SVG de 170 × 90. Chaque bête remplit son cadre : sa taille vraie est dans son plan (`masse_kg`, `taille_m`). Les identifiants de ses découpes lui sont propres : deux dessins d'une même page ne se mêlent pas.
- **`yeux`** : où sont ses yeux dans ce cadre (`[x, y, rayon]`), pour les faire briller la nuit.
- **`sol`** : elle tient debout sur le bas du cadre (ses pieds sur la ligne y = 86) ; sinon, elle nage ou flotte, au milieu.
- Le même texte d'un cycle à l'autre, tant que la bête ne change pas. Environ 110 Ko par biome ; les plantes n'y sont pas (`flore.json`).

Un navigateur affiche le SVG tel quel ; Godot le lit avec `Image.load_svg_from_string` (le kit le fait : `Orvane.texture("dunvi", 96.0)`) ; Unity, avec le paquet Vector Graphics. C'est un fichier de plus : un jeu qui ne le lit pas n'a rien à faire. `monde/planches.js` les fait (`Planches.planches(morceaux)`), le cycle les publie ; un dessin qui échoue n'arrête pas le cycle.

## Ce que le banc vérifie

`bancs/morceaux.js`, en quelques secondes, sur le monde d'Orvane :
- **Le découpage.** 137 fichiers : l'index (62 Ko, contre 1 186 Ko pour `instantane.json`), 24 biomes de 19 à 296 Ko, 112 lignées. Chaque lignée a sa ligne dans l'index et son fichier.
- **Tous les biomes réunis** redonnent `instantane.json`, le cycle d'avant compris.
- **La prairie et la forêt seules** donnent exactement l'instantané réduit à ces deux biomes : 50 lignées, 400 Ko. Le résultat respecte `schemas/instantane.schema.json`.
- **Le fichier d'une lignée** la donne entière.
- **Dans un navigateur**, le résultat est le même.
- **Le cycle de nuit** publie les morceaux à côté de `instantane.json`, et retire ceux d'une lignée qui n'est plus. Il publie aussi une planche par biome.
- **Les planches** : chaque bête de chaque biome a son dessin (1 528 dessins pour le monde d'Orvane), un SVG de 170 × 90 qui dit où sont ses yeux ; deux dessins d'une même planche ne partagent aucune découpe ; dessinées deux fois, les planches sont les mêmes, au caractère près.

```
node bancs/morceaux.js
```

## Ce qui reste ouvert

- **Les autres documents en anglais.** Les vingt chapitres de `docs/` restent en français. Le guide et le glossaire suffisent pour brancher un jeu ; la traduction des chapitres viendra à la demande.
- **Les plantes par morceaux.** `flore.json` reste d'un seul tenant.
- **Un index du cycle d'avant.** Pour interpoler, un jeu qui lit par morceaux a le cycle d'avant de ses biomes, mais pas l'historique (`historique.json` reste entier).
