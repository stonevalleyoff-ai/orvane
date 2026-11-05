# La simulation en direct

Le monde d'Orvane en temps réel, dans le navigateur : https://stonevalleyoff-ai.github.io/orvane/simulation/ (ou `python3 -m http.server` à la racine du dépôt, puis http://localhost:8000/simulation/).

La page se branche sur le monde d'Orvane publié (`mondes/orvane/instantane.json` et `flore.json`) et en fait un **monde solo** (`moteur/solo.js`, docs/19) qui vit ici, et nulle part ailleurs : le monde partagé continue de son côté, et rien n'y est envoyé.

## Ce qu'on y voit

- **La scène.** Les bêtes d'un biome, en temps réel. Chacune est un individu tiré de la population réelle (`tampon/individus.js`, docs/35) : son génotype (un récessif peut s'y cacher), sa taille, sa vitesse, son audace, sa sociabilité, ses savoirs, son sexe, un nom. Elle a la silhouette de sa lignée (`plan.corps`). Elle dort hors de ses heures (diurne, nocturne, crépusculaire), broute les plantes du lieu, chasse les proies que lui donne le moteur (`Orvane.appetence`, et les régimes en spectre), fuit ses prédateurs, suit son groupe (troupeau, meute, banc : docs/38), et fuit le joueur à la distance que lui donnent la méfiance et l'habituation de sa population (docs/12). Les pondeurs pondent (docs/25), les petits naissent d'une mère et d'un père dessinés, par Mendel (`Individus.croiser`), et grandissent. La nuit tombe, il neige l'hiver au froid, le feu court quand le moteur a fait un incendie.
- **Le moteur suit son cours.** À chaque cycle, chaque population dessinée va vers son nouvel effectif ; ses morts se partagent comme celles du moteur (la prédation, que les chasseurs font sous nos yeux, la maladie, l'âge). Une bête dessinée en vaut beaucoup : les nombres affichés sont ceux du monde.
- **Les onglets.** *Biome* : ses axes, ses plantes, qui y vit (phénotypes, traits continus, qui mange qui, où elle vit aussi), vos gestes sur le lieu, votre ménagerie. *Monde* : les lignées, les bêtes, la biomasse par régime au fil des cycles, les 39 biomes, ce qui est éveillé (la Mère, les souches, le climat). *Journal* : la chronique du monde (`moteur/chronique.js`, docs/37) et ce que vos gestes ont pesé. *Réglages* : tout le reste.

## Le temps

Un cycle est un pas du monde. Le rythme se choisit : un cycle par jour (celui du monde partagé), par heure, par dix minutes, par minute, toutes les trente ou dix secondes, au plus vite, ou une durée à soi ; plus l'accéléré et le rattrapage de `moteur/solo.js`. Le moteur tourne dans un Web Worker (`travailleur.js`), la page ne fige jamais. La partie se garde dans le navigateur (IndexedDB) toutes les 90 secondes et quand on quitte la page ; rouverte, elle rattrape les cycles dus pendant l'absence, au plus le rattrapage. Elle s'exporte et s'importe en fichier.

## Les gestes du joueur

Les outils de la scène : **observer** (la fiche d'une bête), **nourrir**, **capturer**, **chasser**. La fiche permet aussi de **déplacer** une bête vers un biome voisin ; la ménagerie, de **relâcher** une bête capturée, où l'on veut, avec ses gènes (docs/36). Le volet *Vos gestes sur ce lieu* : abîmer ou restaurer l'habitat, défricher, reboiser, assécher, irriguer, construire (docs/22). S'approcher des bêtes sans leur nuire compte comme des rencontres : elles s'habituent. Tout cela part au moteur au cycle suivant, au format des lots (docs/4), par le même tampon que le monde partagé. Un geste compte pour une bête, ou pour toutes celles que la bête dessinée représente (le réglage *Ce que pèse un geste*) ; au-delà de 10 000 bêtes, il part en plusieurs événements, que le tampon plafonne.

## Le compagnon

L'onglet *Compagnon* : une bête à soi, à élever et à soigner, en temps réel, comme un tamagotchi, mais une vraie bête d'Orvane (`compagnon.js`, `enclos.js`). On l'adopte sur la scène (« Adopter » dans la fiche d'une bête), on prend un œuf ou un petit d'une lignée du biome, ou on élève une bête de la ménagerie ; le moteur voit une capture. Ce qu'elle est décide de ce dont elle a besoin :

- **Manger** : ce que mange sa lignée (son spectre de régime, docs/30). Un herbivore refuse la viande. Une petite bête a faim plus vite (le métabolisme suit la masse), le métabolisme lent la ralentit.
- **Dormir** : à ses heures, à l'horloge de l'appareil. Une diurne dort la nuit, une nocturne le jour ; la réveiller la rend grognonne.
- **Jouer, être caressée** : elle s'ennuie d'autant plus qu'elle est sociable. Elle se fie à vous peu à peu, plus vite si elle est audacieuse ; tant qu'elle se méfie, elle refuse les caresses.
- **Un enclos propre** : ses repas font des crottes, qu'on ramasse. La saleté la rend malade.
- **Un habitat qui lui va** : le confort, c'est sa niche contre les axes du lieu (`Orvane.convenance`). Hors de chez elle, elle dépérit.
- **Les soins** : elle tombe malade, plus souvent quand sa lignée a une épidémie là où elle vit ; un soin la guérit. Sa consanguinité (sa vigueur) l'use plus vite.
- **Apprendre** : avec assez de confiance, des leçons lui apprennent un savoir d'Orvane (docs/34) ou un tour, plus vite si sa lignée apprend bien.
- **Grandir, vieillir** : jeune jusqu'à la maturité de sa lignée, vieille au-delà de sa longévité, comptées en cycles de vie (4 heures par défaut).
- **Des petits** : adulte, en bonne santé et confiante, elle a des petits avec une bête sauvage de sa lignée présente sur la scène (Mendel, `Individus.croiser`). On élève le petit (le parent attend dans la ménagerie) ou on le rend au monde, avec ses gènes (docs/36). On peut aussi rendre le compagnon lui-même au monde.

Le temps passe quand la page est fermée : à la réouverture, il rattrape ce qui s'est passé. En mode doux (par défaut), quelqu'un veille pendant l'absence : ses besoins ne tombent pas sous un plancher. Le compagnon se garde dans le navigateur, à part du monde, et survit à un monde qu'on recommence ; ceux qui sont partis restent dans les souvenirs. Ses réglages (le temps du compagnon, accéléré jusqu'à ×600 et plus, la durée d'un cycle de vie, le mode doux, la faim, le sommeil, la confiance, la maladie…) sont dans le groupe *Le compagnon* des réglages.

## Les paramètres

Tous ceux d'Orvane, plus de cinq cents, chacun avec son nom, ce qu'il fait, sa valeur d'origine et de quoi y revenir :

| groupe | où il vit |
| --- | --- |
| le moteur : évolution, démographie, chaîne alimentaire, saisons, maladies, catastrophes, génétique, hybrides, méfiance | `REGLES` de `moteur/orvane.js`, posées par `monde.regles` par-dessus celles du monde |
| les traits continus, le catalogue des traits | `QUANT` et `TRAITS` de `moteur/catalogue.js` |
| le climat, la flore (ses formes, ses défenses), les souches, le milieu, la vie synthétique, la ponte, les cycles de vie, les traits inventés, les natures, les dérives, les régimes (rendement, défenses, perte), la grammaire, les castes, l'esprit (traits, savoirs), la vie en groupe, la chronique, les parcelles | les `REGLES` (et catalogues) de chaque module de `moteur/` |
| les individus | `REGLES` de `tampon/individus.js` (les bêtes dessinées) |
| le profil du tampon : l'influence (poids des gestes, plafonds, mémoire) et l'exposition (compression, seuil d'apparition, méfiance rendue, variation montrée) | `moteur/solo.js` (`PROFIL`), docs/4, 5, 12 |
| le monde : sa graine, son année | `monde.graine`, `monde.annee` |
| chaque biome : sa capacité de base, ses cinq axes, l'amplitude de ses saisons | `biomes[]` |
| les mécanismes : les éveiller (comme le cycle de nuit), les endormir, les réveiller tels quels | `monde.<mécanisme>` |

Une recherche les trouve par leur nom. Les réglages s'exportent et s'importent en fichier. Un réglage qu'on retire rend la valeur d'origine ; sur un biome, il retire son écart sans défaire ce que le monde a fait depuis (le climat, le milieu).

## Les fichiers

```
index.html, simulation.css   la page
simulation.js                l'interface : le temps réel, les onglets, la fiche, les gestes, la sauvegarde
vivant.js                    les bêtes à l'écran : le décor de chaque biome, les individus, leur conduite, leurs naissances et leurs morts
parametres.js                le nom et l'explication de chaque paramètre, leurs groupes
compagnon.js                 le compagnon : ses besoins, son sommeil, ses maladies, son âge, ce qu'on fait pour lui (Node ou navigateur)
enclos.js                    l'onglet Compagnon : l'enclos, l'adoption, les petits, les souvenirs
noyau.js                     le monde solo réglable : créer, régler, noter, un cycle, la vue, sauver, charger (Node ou navigateur)
messagerie.js, travailleur.js le moteur dans un Web Worker ; la même messagerie dans la page si le Worker ne se charge pas
```

Les bancs : `node bancs/simulation.js` et `node bancs/compagnon.js` (le compagnon : son régime, son métabolisme, ses heures, son habitat, soigné ou laissé, le mode doux, la maladie, l'apprentissage, l'âge, les petits, l'œuf, la sauvegarde). Le premier vérifie que chaque réglage est relié au moteur (tous posés à leur valeur d'origine, le cycle est celui du témoin, au bit près), qu'un réglage pèse et se retire, qu'on endort et éveille un mécanisme, que deux mondes ne se mêlent pas, que la partie se garde, et que le noyau donne le même monde dans un navigateur qu'avec Node.
