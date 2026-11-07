# Lisière

*Tenir jusqu'au matin.*

Un jeu de survie et d'horreur en Godot 4, branché sur le monde vivant d'Orvane. On s'éveille à la lisière d'un lieu vrai du monde : une forêt, une prairie, une lande. Le jour, on récolte, on fabrique, on chasse. La nuit, on tient près d'un feu, et les chasseurs du lieu viennent tourner au bord de la lumière.

Chaque bête du jeu est une lignée vraie d'Orvane, au dernier cycle publié : son nombre, son dessin, son heure, sa vitesse et son caractère viennent du monde. Ce que le joueur croise et ce qu'il tue est compté, et renvoyé au monde.

## Ce qu'on y fait

- **Le jour** (quatre minutes, dont une part de nuit) : ramasser des brindilles, couper du bois, casser des pierres, cueillir des baies et des fibres. Chasser les proies du lieu, qui fuient quand on approche (plus tôt si l'on court vers elles). Laisser passer les rôdeurs, des chasseurs qui vivent le jour : ils se retournent si l'on s'approche trop.
- **Fabriquer** : un feu de camp (4 bois, 2 pierres), une torche (2 bois, 1 fibre), une lance (2 bois, 1 pierre, 2 fibres), qui frappe trois fois plus fort et s'use.
- **La nuit** : le feu brûle son bois (une bûche, 25 secondes de plus) et éclaire d'autant plus qu'il en a. Les chasseurs du lieu viennent. Ils n'entrent pas dans la lumière d'un feu : ils tournent à sa lisière. Ils gardent leurs distances avec une torche, sauf les plus audacieux. Dans le noir, ils mordent.
- **Le corps** : la faim baisse sans cesse (des baies, de la viande, cuite de préférence). La peur monte dans le noir et quand un chasseur est près ; elle baisse à la lumière. Au comble, elle coûte de la santé.
- **Les échos** : quand la peur est haute, les bêtes qu'on a tuées reviennent, pâles et lentes. Elles ne mordent pas : elles traversent, et la peur monte encore.
- **La fin** : la santé à zéro. L'écran dit combien de nuits on a tenues, quelles bêtes on a croisées, et ce que la partie renvoie au monde.

## Ce qui vient d'Orvane

| dans le jeu | dans le monde d'Orvane |
| --- | --- |
| le lieu : ses arbres (des sapins s'il fait froid), ses rochers, ses buissons, son herbe, la couleur de son sol | les axes du biome : `couvert`, `altitude`, `humidite`, `temperature` |
| la longueur des nuits | la saison du monde ce jour-là (`cycle.saison`) : un tiers du jour en été, la moitié en hiver |
| les bêtes qui viennent, et combien souvent | les lignées vivantes du biome et leur `effectif` (les plus nombreuses viennent plus souvent) ; celles qui vivent en groupe (`sociabilite`) viennent en bande |
| qui chasse, qui fuit, et quand | `regime` (un carnivore, ou un omnivore de plus de 15 kg, chasse) et `activite` (de jour, de nuit, au crépuscule) |
| leur taille, leur force, leur vitesse, leur flair, leur audace | `masse_kg`, `vitesse_rel`, `perception`, `temperament` |
| leur dessin, et leurs yeux qui brillent dans le noir | les planches publiées à chaque cycle (`morceaux/silhouettes/<biome>.json`, docs/21) |
| ce que la partie renvoie | une rencontre par bête vue dans la lumière, un prélèvement par bête tuée, dans le biome d'Orvane où c'est arrivé (le kit : `Orvane.compter`, `clore`, `deposer`) |

Le jeu lit le monde en ligne, par morceaux (`Orvane.lire_lieux`, `Orvane.lire_silhouettes`) : l'index, puis le seul lieu choisi. Sans réseau, il joue avec une copie de cinq lieux gardée dans `donnees/` (`node jeux/lisiere/outils/secours.js` la refait, depuis le monde publié).

**Les lots vont dans le bac à sable** (`monde: "essai"`, `scripts/regles.gd`) : Orvane les garde quatorze jours et aucun monde ne les lit. Tant que le jeu n'a pas sa clé (`CLE_JEU`, vide), rien n'est envoyé : l'écran de fin montre seulement ce qui le serait. Pour qu'il envoie : inscrire Lisière sur la [page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/), mettre la **clé du jeu** (publique, `orv_…`) dans `CLE_JEU`. La clé d'administration ne va jamais dans le jeu.

## Les touches

| | au clavier | au doigt (un téléphone tenu à l'horizontale, une tablette) |
| --- | --- | --- |
| marcher | ZQSD (clavier français), WASD, ou les flèches | le pouce gauche, posé n'importe où dans la moitié gauche de l'écran |
| récolter, frapper | Espace, ou le clic | Agir (on peut le tenir en marchant) |
| un feu, une torche, une lance | 1, 2, 3 | Feu, Torche, Lance |
| manger, nourrir le feu, cuire | E, F, C | Manger, Nourrir, Cuire |
| pause | Échap | le bouton en haut, au milieu |

Les commandes tactiles (`scripts/tactile.gd`) s'allument seules sur un écran tactile. Elles pressent les mêmes actions que les touches. Un bouton pâlit quand on n'a pas de quoi s'en servir. Sur un petit écran l'image grossit ; tenu debout, le téléphone demande qu'on le tourne, et la partie attend.

**Dans un navigateur** : https://stonevalleyoff-ai.github.io/orvane/lisiere/. La publication du site (`.github/workflows/cycle.yml`) exporte le jeu à chaque passe où il a changé.

## Lancer, essayer, exporter

Godot 4.3 (`outils/godot.sh` le télécharge la première fois, vérifie son empreinte, puis le lance) :

```
outils/godot.sh --path jeux/lisiere                                   # jouer
outils/godot.sh --headless --path jeux/lisiere --import               # la première fois : importer le projet
outils/godot.sh --headless --path jeux/lisiere -- --essai             # l'essai sans écran, sur la copie gardée
outils/godot.sh --headless --path jeux/lisiere -- --essai --en-ligne  # l'essai sur le monde publié
outils/godot.sh --modeles-web                                         # une fois : les modèles d'export web
outils/godot.sh --headless --path jeux/lisiere --export-release Web ../../lisiere/index.html   # le jeu dans un navigateur
```

L'essai (`scripts/essai.gd`) joue une partie tout seul, en accéléré, et vérifie : le lieu et ses bêtes dessinées, la récolte, les fabrications, la nuit, les chasseurs qui n'entrent pas dans la lumière du feu, la peur dans le noir, les échos, l'aube, la fin, et ce qui est compté pour Orvane. Il sort avec le code 0 si tout passe.

Sans Godot, `node bancs/lisiere.js` vérifie le projet à chaque PR : chaque fichier qu'il nomme existe, il porte le kit Godot tel quel, et chaque lieu gardé se joue (des proies le jour, des chasseurs la nuit, un dessin pour chaque bête).

## Où en est le jeu

- **Écrit** : le jeu entier (`scripts/`, une douzaine de fichiers), ses sons (faits par le code, au lancement), son essai sans écran, sa configuration d'export web.
- **Vérifié à chaque PR** : la syntaxe GDScript 4 de chaque script (`gdtoolkit`) ; le projet et le monde gardé (`bancs/lisiere.js`) ; les planches (`bancs/morceaux.js`).
- **Vérifié dans Godot 4.3** (le 7 novembre 2026, au cycle 46) :
  - l'essai sans écran passe, sur la copie gardée (5 lieux) comme sur le monde publié (32 lieux, chacun chargé) ;
  - le même essai, filmé avec un vrai rendu (`--write-movie`, sous un écran virtuel) : le feu et son halo, les chasseurs qui tournent à la lisière, les yeux dans le noir, les morsures, les échos, l'aube, l'écran de fin ;
  - l'export web, joué au clavier dans Chromium (WebGL 2) : l'écran-titre lit le monde en ligne, une partie va de l'éveil jusqu'à la mort dans la première nuit, sans erreur.
- **Corrigé ce jour-là** : la santé remontait de zéro (rassasiée et calme), et la partie ne s'arrêtait pas ; une bête frappée deux fois dans la même image mourait deux fois (deux prélèvements) ; le marais, gardé dans la copie, n'était jamais proposé (les lieux à demi dans l'eau sont jouables : le jeu n'y garde que les bêtes qui marchent) ; un lieu sans proie ni chasseur (l'ossuaire, les terres creuses) était proposé. L'essai ne dépend plus du hasard du directeur, joue son noir en pleine nuit, et vérifie chaque lieu proposé.
- **Pas encore vérifié** : une partie jouée par une personne, jusqu'au bout ; le jeu sur un vrai téléphone (au doigt, il n'a été joué que sur un téléphone émulé, dans Chromium, avec de vrais touchers multipoints).

Filmer l'essai (des images PNG, puis les regarder) : `xvfb-run -a outils/godot.sh --path jeux/lisiere --write-movie /tmp/film/f.png --fixed-fps 30 -- --essai`. Pas moins de 30 images par seconde : l'essai joue en accéléré, et à 10 images par seconde la caméra (lissée) s'envole hors du monde.

## Les choix

Lisière est un jeu du genre survie-horreur (récolter, fabriquer, tenir la nuit, la faim et la peur), avec son propre nom, son propre personnage (une veilleuse encapuchonnée, une écharpe rouille), son propre dessin (celui des planches de naturaliste d'Orvane, l'encre et la braise) et ses propres idées :
- **un écosystème vrai** à la place d'un bestiaire écrit à la main : les bêtes changent quand le monde change, d'un jour à l'autre ;
- **des yeux placés par leur dessin** : dans le noir, on reconnaît une bête à la hauteur de ses yeux, et l'on apprend leur couleur (ambre pour un chasseur, pâle pour une proie) ;
- **les échos** : la peur ne fabrique pas de monstres, elle ramène ce qu'on a tué ;
- **des nuits qui suivent la saison du monde** ;
- **un jeu qui pèse sur le monde** : ce qu'on chasse ici est compté là-bas.

## Ce qui reste

- L'équilibrer, partie après partie (les règles sont toutes dans `scripts/regles.gd`).
- Sa clé de jeu, pour que ses lots partent dans le bac à sable, puis dans le monde.
- Une partie qui se garde d'une session à l'autre ; une manette.
- Le jeu au doigt sur un vrai téléphone (il n'a été joué que sur un téléphone émulé, dans Chromium) : la lisibilité des petits textes, et la vitesse de rendu.
