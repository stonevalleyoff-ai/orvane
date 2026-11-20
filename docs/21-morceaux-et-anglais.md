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
{ "orvane": "1.0", "monde": { "id": "orvane" }, "cycle": { "n": 44 }, "biome": "foret", "cadre": [170, 90],
  "silhouettes": { "dunvi": { "svg": "<svg viewBox=\"0 0 170 90\" …>…</svg>", "yeux": [[129.9, 21.3, 1.9]], "sol": true, "phenotype": "base",
                              "parties": { … } } } }
```

- **`svg`** : le dessin, un SVG de 170 × 90. Chaque bête remplit son cadre : sa taille vraie est dans son plan (`masse_kg`, `taille_m`). Les identifiants de ses découpes lui sont propres : deux dessins d'une même page ne se mêlent pas.
- **`yeux`** : où sont ses yeux dans ce cadre (`[x, y, rayon]`), pour les faire briller la nuit.
- **`sol`** : elle tient debout sur le bas du cadre (le bas de son dessin sur la ligne y = 86 ; ses pieds y sont, sauf quand une queue lourde ou une trompe descend plus bas : `parties.contact`) ; sinon, elle nage ou flotte, au milieu.
- **`parties`** : son corps, sa tête, chaque patte, sa queue, ses organes, dans le même cadre, pour l'animer sans lire le SVG (plus bas).
- Le même texte d'un cycle à l'autre, tant que la bête ne change pas. Environ 160 Ko par biome, parties comprises (28 Ko servis compressés) ; les plantes n'y sont pas (`flore.json`).

Un navigateur affiche le SVG tel quel ; Godot le lit avec `Image.load_svg_from_string` (le kit le fait : `Orvane.texture("dunvi", 96.0)`) ; Unity, avec le paquet Vector Graphics. C'est un fichier de plus : un jeu qui ne le lit pas n'a rien à faire. `monde/planches.js` les fait (`Planches.planches(morceaux)`), le cycle les publie ; un dessin qui échoue n'arrête pas le cycle.

### Les parties : la bête, pour l'animer

Un jeu qui veut faire marcher une bête doit savoir où sont ses pattes. Lisière les cherchait dans le SVG, ligne par ligne : c'est fragile, et chaque jeu aurait dû le refaire. Le dessin (`monde/silhouette.js`) sait ce qu'il dessine : il le publie à côté du SVG, sous `parties`. Voici dunvi, un brouteur de la forêt (le monde d'Orvane, cycle 44) :

```json
"parties": {
  "dessin": "quadrupede",
  "groupe": [82.8, 86, 1.618],
  "boite": [22.9, 8, 147, 86],
  "contact": [85, 86],
  "bas": [85, 86],
  "corps": { "centre": [82.8, 43], "boite": [45.7, 22.6, 119.9, 62.5], "svg": [8, 10] },
  "tete": { "centre": [127.6, 23.2], "rayon": 10.7, "museau": [142.5, 25.2], "pivot": [112.4, 33.3], "svg": [18, 24] },
  "cou": { "courbe": [[112.4, 33.3], [120, 28.2], [123.7, 23.2]], "epaisseurs": [18.1, 11.6], "svg": [17, 17] },
  "queue": { "courbe": [[49, 37.1], [34.4, 38.6], [23.3, 44.9]], "epaisseurs": [8.4, 1.5], "svg": [7, 7] },
  "pattes": [
    { "cote": "loin", "points": [[112.4, 47], [116.3, 65.9], [112.4, 86]], "epaisseurs": [5.5, 3.9], "pied": "sabot", "svg": [1, 3] },
    { "cote": "loin", "points": [[65.8, 47], [61.9, 65.9], [65.8, 86]], "epaisseurs": [5.5, 3.9], "pied": "sabot", "svg": [4, 6] },
    { "cote": "pres", "points": [[107.2, 47], [111.1, 65.9], [107.2, 86]], "epaisseurs": [5.5, 3.9], "pied": "sabot", "svg": [11, 13] },
    { "cote": "pres", "points": [[60.6, 47], [56.8, 65.9], [60.6, 86]], "epaisseurs": [5.5, 3.9], "pied": "sabot", "svg": [14, 16] }
  ],
  "yeux": [[129.9, 21.3, 1.9]]
}
```

**Le repère.** Tout est dans le cadre de 170 × 90 du SVG, au dixième, la tête à droite, y vers le bas. Les points sont ceux du SVG : un point `(x, y)` écrit dans le groupe du dessin (`<g transform="translate(tx ty) scale(k)">`) est en `(tx + k·x, ty + k·y)`, arrondi au dixième ; `groupe` donne `[tx, ty, k]`. Les points d'une patte sont ainsi ceux de ses `<line>`, à 0,05 près sur chaque coordonnée.

**Les formes.**
- `points` : une chaîne articulée, d'un bout à l'autre ; une patte va de la hanche au pied, qui touche le sol. `epaisseurs` : celle de chaque segment.
- `courbe` : un ruban effilé (un cou, une queue, un bras de pieuvre), une courbe du second degré : son début, son point de contrôle, son bout. `epaisseurs` : au début et au bout.
- `epaisseur` : un trait d'une seule épaisseur (l'échine d'un serpent, le filament d'une méduse).
- `centre`, `rayon`, `boite` (`[x0, y0, x1, y1]`) ; `museau` : le bout du museau, la pointe du bec, la bouche ; `pivot` : là où la tête tient au corps, et tourne ; `attache` : là où tient un organe.

**Les parties.**
- **`dessin`** : `quadrupede`, `bipede` (debout), `bipede-tendu` (le corps tendu sur la queue), `oiseau`, `insecte`, `serpent`, `poisson`, `pieuvre`, `meduse`, `etoile`, `mille-pattes`, `machine`.
- **`contact`**, pour une bête qui tient debout : là où elle touche le sol. Quand elle a des pattes, c'est la ligne de ses pieds (`y = 0` du groupe : chaque pied y est posé), au milieu du cadre en x ; sans pattes (un serpent, une étoile, un bipède à la queue tendue), c'est le bas de son dessin. **`bas`** : le milieu du bas du dessin, `[85, 86]`, là où est son ombre. Les deux se confondent le plus souvent ; une queue lourde ou une trompe qui descend sous les pieds les sépare (303 dessins sur 2 799 à pattes, dans les trois mondes du banc ; jusqu'à 17,5 unités : les pieds de nesil sont à y = 68,5). Une bête qui nage ou flotte n'a ni l'un ni l'autre : elle ne touche pas le sol, et le milieu de son dessin est au milieu du cadre, `(85, 45)`. **`boite`** : son dessin entier.
- **`corps`** : le tronc ; le torse d'un bipède debout, avec sa `courbe` de la hanche à l'épaule ; l'abdomen d'un insecte (son `thorax` à part) ; l'échine d'un serpent (`points`, `epaisseur`) ; les `anneaux` d'un mille-pattes (`[x, y, rayon]`), du premier au dernier : le dessin met les pattes de chaque anneau juste avant lui, et la plage `svg` du corps contient donc les pattes des anneaux suivants (chacune a aussi la sienne) ; le manteau d'une pieuvre, la cloche d'une méduse, le disque d'une étoile, le châssis d'une machine.
- **`tete`** (et **`cou`** quand le dessin en a un) ; la tête d'un poisson est l'avant de son corps, de l'opercule à la bouche. Une pieuvre, une méduse, une étoile et une machine n'en ont pas.
- **`pattes`** : chacune avec son **`cote`** (`loin` : du côté lointain, dessinée derrière le corps, d'une encre plus sombre ; `pres` : devant lui) et son **`pied`** (`sabot`, `griffes`, `mains`, `coussinet`, `doigts`, `serres`, `patin`, `aucun`). Dans l'ordre du dessin : le côté lointain d'abord. Autant que la règle du dessin en fait, d'après le plan : quatre chez un quadrupède et une machine, deux chez un oiseau et un bipède debout ; chez un insecte, deux fois la moitié du plan, de 4 à 10 ; chez un mille-pattes, deux par anneau, de 12 à 32 (2 × la moitié du plan, de 6 à 16 anneaux : un plan à 10 pattes en donne 12, un à 36 en donne 32) ; aucune chez un serpent, un poisson, ni chez un bipède à la queue tendue, que le dessin fait sans jambes (plus bas, « Ce qui reste ouvert »). Le mille-pattes est à part : à chaque anneau, le dessin trace deux pattes en V, l'une vers l'arrière puis l'autre vers l'avant, juste avant l'anneau, donc toutes deux derrière lui ; la première est dite `loin`, la seconde `pres`, et les côtés alternent ainsi de patte en patte, de la queue à la tête.
- **`bras`** : les bras d'un bipède (`main` quand il en a), les bras d'une pieuvre et d'une étoile, les filaments d'une méduse.
- **`queue`** : sa courbe ; chez un oiseau et un poisson, de sa base à sa pointe.
- **`organes`** : ceux que le dessin connaît (cornes, défenses, trompe, antennes, crête, collerette, carapace, plaques, épines, nageoires, ailes, massue, aiguillon, panache, pinces ; les modules d'une machine : panneau, recycleur, foreuse, pince, arme), chacun avec son `type`, sa `place` (celle de l'organe, docs/11) et son `attache` ; une pince articulée a ses `points`.
- **`yeux`** : les mêmes qu'à côté.
- **`svg`**, dans chaque partie : `[premier, dernier]`, ses éléments dans le groupe du SVG, comptés de 0 (l'ombre au sol est le 0 d'une bête qui tient debout). Une patte : ses `<line>`, une par segment, puis les morceaux de son pied. Un organe de la tête est aussi dans la tête. Un jeu qui anime le dessin lui-même le découpe ainsi sans rien deviner : c'est ce que fait Lisière.

Une partie absente : le dessin ne l'a pas (pas de cou, pas de queue). Les parties s'ajoutent à la planche : un jeu qui ne les lit pas ne voit rien changer, et le SVG est le même qu'avant, au caractère près. Dans Godot, le kit les rend dans l'image qu'il dessine : `Orvane.parties("dunvi", "foret", 96.0)` (`kits/LISEZ-MOI.md`). Lisière, lui, pose chaque bête sur le bas de son dessin (`bas`, là où est son ombre), comme avant les parties : ses squelettes n'ont pas bougé.

**Ce qu'elles pèsent.** Le monde d'Orvane (39 planches, 1 528 dessins) : 4 869 Ko sans elles, 6 416 Ko avec (+1 546 Ko, un kilo-octet par dessin, +32 %) ; servies compressées, 809 Ko et 1 106 Ko, soit 7,6 Ko de plus par planche. `node bancs/planches.js` le mesure.

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

`bancs/planches.js`, en quelques secondes, sur les planches de trois mondes (Orvane, la genèse 2026, la genèse 7 : 3 201 dessins, 13 978 pattes) :
- **Les parties s'ajoutent** à chaque dessin, après ce qu'il avait déjà.
- **Les parties disent ce que dessine le SVG.** Chaque patte est la chaîne de ses `<line>` (ses points, ses épaisseurs, au dixième), puis son pied, posé sur la ligne de `contact` ; chaque partie montre ses éléments ; aucun nombre ne manque ; autant de pattes que la règle du dessin en fait (le plan, borné par la forme).
- **La lecture de Lisière**, refaite en JavaScript, trouve dans le SVG les mêmes pattes, les mêmes pieds, le même corps. Dans Godot, Lisière lit les deux et voit la même bête : `outils/godot.sh --headless --path jeux/lisiere --script res://outils/squelettes.gd -- <dossier de planches>`.
- **Chaque forme** a ses parties, même celles qu'aucun de ces mondes n'a (l'étoile) ; chaque organe son attache, chaque pied son nom.
- **Le même résultat** à chaque fois, dans Node et dans un navigateur ; et ce qu'elles pèsent.

```
node bancs/planches.js
```

Pour prouver qu'un changement ne touche pas le dessin : `node bancs/planches.js --contre origin/main`. Le banc dessine alors aussi les trois mondes avec le code de cette version, et vérifie que leurs planches ont le même SVG, les mêmes yeux, le même sol, la même variante, dans le même ordre, au caractère près (les parties ne comptent ni d'un côté ni de l'autre). Une version qui ne se lit pas est un échec. Ce n'est pas une vérification de chaque PR : un changement qui retouche le dessin exprès la ferait échouer.

## Ce qui reste ouvert

- **Les autres documents en anglais.** Les vingt chapitres de `docs/` restent en français. Le guide et le glossaire suffisent pour brancher un jeu ; la traduction des chapitres viendra à la demande.
- **Les plantes par morceaux.** `flore.json` reste d'un seul tenant.
- **Un index du cycle d'avant.** Pour interpoler, un jeu qui lit par morceaux a le cycle d'avant de ses biomes, mais pas l'historique (`historique.json` reste entier).
- **Les jambes du bipède à la queue tendue.** Son dessin ne fait que ses bras : ses pattes de derrière ne sont pas dessinées (`monde/silhouette.js`, `quadrupede`). Ses parties le disent (`pattes` vide, deux `bras`, `contact` au bas du dessin) ; les dessiner changerait le SVG de ces bêtes (24 dessins dans les trois mondes du banc).
- **Les parties dans Unity.** Le kit Unity lit le JSON des planches tel quel, sans aide pour les parties.
