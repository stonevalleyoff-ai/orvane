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

- **Les kits Unity et Godot** (`kits/`, docs/44) : lire le monde, compter ce que font les joueurs, déposer les lots. Rien ne change dans le contrat.
- **Le cycle 17 % plus vite**, sans rien changer au monde : le même instantané, au caractère près (`outils/vitesse.js`, docs/44).
- **Les planches** (`morceaux/silhouettes/<biome>.json`, docs/21) : à chaque cycle, chaque bête de chaque biome dessinée (un SVG de 170 × 90, sous sa variante la plus fréquente là), avec la place de ses yeux. Un jeu, dans n'importe quel moteur, montre les bêtes d'Orvane sans refaire leur dessin. Un fichier de plus : rien ne change pour un jeu qui ne le lit pas.
- **Le kit Godot** lit seulement les lieux qu'on joue (`lire_lieux`), dessine les bêtes d'après les planches (`texture`, `yeux`), et peut oublier ce qu'il a compté (`oublier`).
- **Lisière** (`jeux/lisiere/`), un jeu de survie et d'horreur en Godot, branché sur le monde : le premier jeu qui se sert du kit Godot.

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
