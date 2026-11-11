# Le journal des versions d'Orvane

Ce qui change, version après version, pour un jeu qui lit Orvane ou lui écrit. La règle des versions est dans `docs/43-versions.md` :
- **MAJEUR** : un changement qui peut casser un jeu (un champ retiré, une valeur qu'Orvane n'accepte plus). Il est annoncé ici avant d'arriver.
- **MINEUR** : un ajout (un champ, une valeur, un mécanisme). Un jeu qui ignore ce qu'il ne connaît pas n'a rien à faire.
- **CORRECTIF** : le moteur se trompait, il ne se trompe plus. Le contrat ne bouge pas.

Chaque instantané porte la version de son contrat (`"orvane": "1.0"`). Installer une version précise :

```
npm install github:stonevalleyoff-ai/orvane#v1.0.0
```

## [À venir]

- **Le kit Godot** lit l'herbier et le temps qu'il fait (`lire_herbier`, `plantes`, `texture_plante`, `meteo`, `temps`) ; **le kit Unity** rend le temps d'un biome (`Biome.Meteo`). **Lisière** sème les plantes du lieu, dessinées d'après l'herbier, et joue le temps qu'il fait : la pluie, la neige et le brouillard se voient, le feu mange son bois plus vite sous l'eau et le vent, la neige ralentit la marche (docs/49).
- **L'herbier** (`monde/herbier.js`, docs/49) : à chaque cycle, chaque plante de chaque biome dessinée (`morceaux/herbier/<biome>.json` : un SVG de 120 × 150, sa forme, son port, sa hauteur, sa part, son stade, et le temps qu'il fait), à côté des planches des bêtes. Un fichier de plus : rien ne change pour un jeu qui ne le lit pas. L'observatoire le montre sous chaque biome.
- **La flore riche** (`moteur/diversite.js`, docs/48) : dans un monde qui l'éveille (`profil.monde.diversite`, avec une flore), quarante-sept formes de plantes de plus (conifère, palmier, palétuvier, figuier, liane, fougère, orchidée, bambou, cactus, varech, plancton, nénuphar…), douze caractères qu'une lignée transmet (aime le feu, racines profondes, fruits charnus, feuilles coriaces, géante…), et une flore qui vit : ses lignées se disputent la place, se séparent, gagnent les lieux voisins, s'éteignent. Le monde de banc passe de 54 à 257 lignées de plantes. Ajouts au contrat, rien de retiré : des valeurs nouvelles de `plan.forme`, `plan.port` (ce qu'un jeu montre s'il ne connaît pas la forme), `plan.caracteres`, `plan.rendement`, `plan.sinistres`, `plan.appetence`, `plan.vent`, `catalogue.flore_riche`, `monde.diversite`. Un monde qui ne l'éveille pas tourne au caractère près comme avant. Un cycle y coûte environ le double.
- **CORRECTIF : une île née d'un volcan** (docs/31) partage la place d'un port entre les lignées de plantes du rivage qui le portent. Rien ne change tant qu'un rivage n'a qu'une lignée par port.
- **Les plantes subissent et transforment** (`moteur/succession.js`, docs/47) : dans un monde qui l'éveille (`profil.monde.succession`, avec une flore), le feu, la crue et la sécheresse prennent des pieds aux plantes, le sec qui dure en tue, l'herbe puis les buissons reprennent la place des arbres disparus, et le couvert d'un lieu suit ses arbres (avec le milieu) : une forêt brûlée s'ouvre, puis se referme. Ajouts au contrat, rien de retiré : dans `flore.json`, `populations[].sinistre` et le stade `brule` ; `monde.succession`. Un monde qui ne l'éveille pas tourne au caractère près comme avant.
- **Les saisons des plantes** (`moteur/phenologie.js`, docs/46) : dans un monde qui les éveille (`profil.monde.phenologie`, avec une flore et une année), les arbres et les buissons sont caducs ou persistants, la pousse suit la belle saison et le temps qu'il fait, et le nectar, les fruits et les graines ont chacun leur saison : les butineurs et les mangeurs de fruits connaissent l'abondance, puis la disette. Ajouts au contrat, rien de retiré : `plan.feuillage`, et dans `flore.json` `populations[].stade` (nu, bourgeons, fleurs, feuilles, fruits, graines, feuilles_tombent, seche, sous_la_neige) et `populations[].feuillage` ; `monde.phenologie`. Un monde qui ne les éveille pas tourne au caractère près comme avant.
- **La météo** (`moteur/meteo.js`, docs/45) : dans un monde qui l'éveille (`profil.monde.meteo`), chaque lieu a son temps du cycle, parcelle par parcelle : la pluie, la neige, le gel, les orages, les canicules, les tempêtes, le brouillard. Il déplace la température, l'humidité et la production de la saison, et donne une cause aux catastrophes : le feu et la sécheresse viennent après le sec, la crue après les pluies ou le dégel, aussi souvent qu'avant. Ajouts au contrat, rien de retiré : `biomes[].meteo` (le temps, les écarts de chaleur et d'eau, le vent, la neige au sol, la sécheresse, les eaux, la production), `parcelles[].meteo`, `monde.meteo`, l'événement `meteo`. Un monde qui ne l'éveille pas tourne au caractère près comme avant.
- **Les kits Unity et Godot** (`kits/`, docs/44) : lire le monde, compter ce que font les joueurs, déposer les lots. Rien ne change dans le contrat.
- **Le cycle 17 % plus vite**, sans rien changer au monde : le même instantané, au caractère près (`outils/vitesse.js`, docs/44).
- **Les planches** (`morceaux/silhouettes/<biome>.json`, docs/21) : à chaque cycle, chaque bête de chaque biome dessinée (un SVG de 170 × 90, sous sa variante la plus fréquente là), avec la place de ses yeux. Un jeu, dans n'importe quel moteur, montre les bêtes d'Orvane sans refaire leur dessin. Un fichier de plus : rien ne change pour un jeu qui ne le lit pas.
- **Le kit Godot** lit seulement les lieux qu'on joue (`lire_lieux`), dessine les bêtes d'après les planches (`texture`, `yeux`), et peut oublier ce qu'il a compté (`oublier`).
- **Lisière** (`jeux/lisiere/`), un jeu de survie et d'horreur en Godot, branché sur le monde : le premier jeu qui se sert du kit Godot. Il se joue au doigt, et dans un navigateur (`lisiere/` sur le site). Son visuel, ses animations et son son ont été retravaillés (`jeux/lisiere/DIRECTION-ARTISTIQUE.md`) : les bêtes y marchent sur les pattes de leurs planches.
- **CORRECTIF : le plafond des variantes tient aussi le cycle d'une invention** (docs/27, docs/32). Un trait inventé naissait dans chaque variante qui le porte : une lignée déjà à 20 variantes en publiait jusqu'à 40, le temps d'un cycle. Les plus rares rejoignent désormais la plus proche dès ce cycle, comme elles le faisaient au suivant. Seuls les mondes qui inventent changent, et seulement le jour d'une invention ; le monde d'Orvane n'a encore rien inventé.

## [1.0.0] — 2026-11-07

**La première version stable du contrat.** Son format ne change plus sans prévenir : un changement qui casserait un jeu fera une version 2, annoncée ici. Une vérification refuse désormais tout changement cassant qui n'a pas sa version majeure (`outils/contrat.js`).

### Ce que garantit le contrat 1.0

- **L'instantané** (`schemas/instantane.schema.json`), qu'Orvane écrit et que les jeux lisent : le monde et son cycle ; les biomes, publiés par biome même quand le monde tourne par parcelles ; le catalogue des traits ; les lignées, leur plan, leurs populations et leurs phénotypes ; les événements. Les plantes sont publiées à part (`flore.json`).
- **Le lot** (`schemas/pression.schema.json`), que les jeux écrivent : ce que font leurs joueurs, compté (prélèvements, captures, rencontres, déplacements, habitat perdu ou gagné…).
- **Le profil** (`schemas/profil.schema.json`) : comment un monde lit ses jeux, et les règles de son moteur.
- **Les types TypeScript** (`types/orvane.d.ts`) et le vérificateur (`outils/verifier.js`), tirés des mêmes schémas.

Un jeu doit ignorer ce qu'il ne connaît pas : un champ, une valeur, un biome, une forme de corps. C'est ce qui permet à Orvane de grandir sans casser personne.

### Ajouté depuis la version 0.1 (29 octobre – 6 novembre 2026)

Rien n'a été retiré. Tout ceci s'ajoute :
- **La vie en groupe** : `populations[].groupe` (la forme, la taille, la hiérarchie, le meneur), `populations[].migration` (la route de l'hiver), `biomes[].visiteurs` (docs/38).
- **L'hivernage** : `populations[].hivernants`, la part d'une population venue d'ailleurs passer l'hiver (docs/38).
- **Des corps nouveaux** : les formes `segmente`, `radiaire`, `tentaculaire`, jusqu'à 60 pattes ; une lignée éteinte reste listée sans population (docs/33).
- **Les régimes** : `detritivore` se dit désormais « charognard » ; l'identifiant ne change pas (docs/30).
- **Des lieux nouveaux** : le torrent, le lac profond, l'étang, la roselière, le delta, les sources chaudes, la grotte inondée ; et ceux de la genèse 7 (docs/23, 42).
- **Le genre d'un monde** : `monde.genre` dans l'instantané, `monde.genre` dans le profil (docs/41).
- **Les règles d'un monde** : `profil.monde.regles` règle le moteur d'un monde vivant (docs/13).
- Le champ `orvane` de chaque instantané vaut désormais « 1.0 » (il valait « 0.1 »). Orvane accepte toujours les lots et les profils marqués « 0.1 ».

### Le paquet

- `npm install github:stonevalleyoff-ai/orvane#v1.0.0` donne le moteur, le tampon, les schémas, les types et le traducteur d'exemple, sans les mondes.
- `const { Orvane, Tampon, Solo, CONTRAT } = require('orvane')`.
