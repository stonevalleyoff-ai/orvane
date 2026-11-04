# 23. La fusion par ponts : un continent de plus

La fusion biome par biome (docs/14) versait les bêtes d'un monde dans les biomes d'un autre, d'un coup : la mer d'Orvane a peuplé les mers du monde d'Orvane en une nuit. La fusion par ponts fait autre chose. Le second monde garde sa géographie : ses parcelles deviennent un continent du premier, relié à lui par quelques ponts. Chaque faune gagne ensuite l'autre de proche en proche, par les ponts, comme lors du grand échange entre les deux Amériques quand l'isthme de Panama s'est fermé. C'est la dernière étape de la phase 2.

`Fusion.relier(cible, source, opt)`, dans `moteur/fusion.js`.

## Le continent

- **Ses parcelles.** La source est découpée comme la cible (docs/15), et ses parcelles sont renommées : la deuxième parcelle de la prairie de la genèse 7 devient `prairie~genese-7-2`.
- **Ses biomes.** Une parcelle garde son biome. La prairie de la source est une part de la prairie du monde, et l'instantané publié les additionne : un jeu qui joue la prairie y voit les deux faunes. Un biome que la cible n'a pas (le bois, la lande, la falaise de la genèse 7) devient un biome de plus au monde. Un jeu qui ne le connaît pas l'ignore, comme tout biome qu'il ne fait correspondre à aucun de ses terrains.
- **Ses lignées.** Toutes ses lignées vivantes viennent, sur leurs parcelles, avec tous leurs effectifs (ou `part`).
  - Chaque arbre garde sa racine : aucune lignée de la source n'a d'ancêtre dans la cible, et deux lignées de mondes différents ne se croisent jamais.
  - Un nom déjà pris est remplacé. Une lignée arrivée garde son histoire dans `origine`, comme dans docs/14.
- **Ce qui ne vient pas.** Les machines restent chez elles, car la Mère est unique (docs/16). Les souches ne voyagent pas.
- **Ce qui est refait à l'arrivée.** Si la cible a une flore, celle du continent est refaite à l'arrivée, à l'équilibre avec ses bêtes (docs/17). Si la cible a un milieu transformé, chaque parcelle du continent prend sa base (docs/22).
- **Son catalogue.** Celui de la source s'ajoute à celui de la cible (docs/20).

## Les ponts

`ponts: 3` relie le continent par trois ponts. Chaque pont relie les deux parcelles les plus semblables : le même biome, les mêmes axes, le même milieu. Deux ponts ne partent jamais du même biome, ni n'arrivent au même biome. Pour choisir ses ponts, on les nomme : `ponts: [["prairie", "prairie"], ["bois", "foret"]]`.

Un pont est un passage comme ceux qui relient deux parcelles voisines. Les bêtes s'y dispersent et y fuient comme partout (docs/15), et rien d'autre ne relie le continent au reste du monde.

## La commande : le profil du monde

```json
"monde": { …, "fusions": [ { "id": "genese-7", "source": "mondes/genese-7/instantane.json", "ponts": 3 } ] }
```

Au cycle de nuit suivant, le continent rejoint le monde, une seule fois. Le journal porte une `apparition` par lignée arrivée, et `monde.fusions` garde la fusion, avec `mode: "ponts"` et ses ponts. Sans `ponts`, la fusion se fait biome par biome, comme avant (docs/14).

## Ce que le monde en fait

`bancs/ponts.js` : le monde de la genèse 7 (seize biomes, 99 lignées) devient un continent du monde d'Orvane, en 80 cycles :

- **Le continent.**
  - 64 parcelles et 15 biomes de plus au monde. Sa prairie est une part de la prairie, qui compte 114 lignées au lieu de 35.
  - 99 lignées et 24,8 millions de bêtes. Deux noms étaient déjà pris et ont été remplacés.
  - Trois ponts : prairie à prairie, bois à forêt, neige à sommets.
  - Le monde d'Orvane n'est pas touché : ses lignées et leurs populations restent ce qu'elles étaient.
- **Les ponts.** Sans pont, rien ne passe en 10 cycles. Avec trois ponts, 48 lignées du continent gagnent Orvane, et 14 lignées d'Orvane gagnent le continent.
- **De proche en proche.** Les lignées du continent gagnent d'abord les trois parcelles des ponts, dès le premier cycle. Elles gagnent les six parcelles à un pas vers le cycle 11, et les trois à deux pas vers le cycle 79. À un pas des ponts, on compte 27 présences (une lignée dans une parcelle) au cycle 20, et 51 au cycle 80.
- **Deux mondes ne se croisent pas.** Au bout de 80 cycles, le monde compte 2 961 zones hybrides, et aucune entre une lignée du continent et une lignée d'Orvane. Sur 11 583 paires, aucune n'a d'ancêtre commun.
- **La flore, le milieu.** Dans un monde à flore et à milieu transformé, le continent arrive avec ses plantes : 43 lignées, sur ses 64 parcelles. Chaque parcelle prend la base de son milieu, et ses brouteurs y trouvent 101 % de leur nourriture : rien ne manque à l'arrivée.

Le banc vérifie aussi le contrat, le déterminisme (les mêmes mondes donnent le même continent, une fusion faite ne se refait pas) et le cycle de nuit (la fusion par ponts se fait une fois).

```
node bancs/ponts.js            # 80 cycles, environ 4 minutes
node bancs/ponts.js --court    # 40 cycles
```

## Ce qui reste ouvert

- **Des ponts qui naissent et se rompent.** Un pont est posé une fois pour toutes. Un isthme qui se ferme, une mer qui monte, un pont de glace pendant l'hiver viendraient avec le milieu transformé (docs/22).
- **Les souches du continent.** Ses maladies ne voyagent pas encore avec ses bêtes.
- **Les machines du continent.** Une source qui aurait sa propre Mère : deux vies synthétiques face à face.
