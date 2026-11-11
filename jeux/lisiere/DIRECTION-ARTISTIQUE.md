# Lisière — la direction artistique

*L'encre et la braise.* Ce document tient l'équipe ensemble : ce que le jeu doit faire ressentir, ce qu'on voit, comment ça bouge, qui fait quoi, et comment on vérifie. Les règles du jeu ne bougent pas : on retravaille la façon dont il se montre, s'anime et sonne.

## L'intention

Lisière doit tenir dans une image : **une veilleuse au bord d'un feu, et autour, le noir qui regarde.** Le jour est un carnet de naturaliste : des bêtes vraies, dessinées à l'encre, dans une lumière douce. La nuit est une veillée : tout ce qui compte tient dans un cercle de braise, et le reste n'existe que par des yeux.

Trois sensations, par ordre d'importance :
1. **La chaleur précieuse.** Le feu est la chose la plus belle de l'écran. Il vit, il crépite, il pousse l'ombre des troncs, il réchauffe les couleurs. Le quitter doit coûter.
2. **Le noir qui a des yeux.** La nuit n'est pas noire : bleu d'encre, brume, silhouettes. On devine plus qu'on ne voit. Les yeux disent qui est là.
3. **Des bêtes vraies.** Chaque bête marche, respire, sursaute, fuit, tombe. Elles viennent du monde d'Orvane : on ne redessine pas leurs planches, on les anime.

## Ce qu'on voit

- **La vue** : de dessus, un peu de biais (trois quarts). Les objets ont un pied, une ombre au sol, une hauteur. On passe derrière les troncs ; un feuillage qui cache la veilleuse s'efface.
- **La matière** : l'encre (des contours sombres, fins, un peu irréguliers), le papier (des grains, des nuances douces dans les aplats), la braise (des lueurs additives, chaudes). Rien de plastique, rien de flou : net, dessiné.
- **La lumière** :
  - le jour, douce et un peu dorée ;
  - le soir, orange puis mauve ;
  - la nuit, bleu d'encre (`NUIT`, `NUIT_BLEUE`, `LUNE`) ;
  - l'aube, rose et pâle.

  Le feu et la torche sont les seules lumières chaudes. Dans leur cercle, les couleurs reviennent ; dehors, elles se retirent.
- **La valeur** : la nuit, la plus grande part de l'écran est très sombre ; l'œil va au feu, puis aux yeux. Le jour, des valeurs moyennes, des ombres nettes au sol.
- **La palette** : `scripts/palette.gd`. Une couleur qui n'y est pas se tire de celles-là.
- **La typographie** : un titre à l'empattement de gravure (une fonte libre, licence OFL, gardée avec sa licence dans `polices/`), un texte courant lisible et sobre. Jamais la fonte par défaut à l'écran-titre.

## Comment ça bouge

- **Tout réagit.** L'herbe s'écarte au passage, un buisson cueilli frémit, un arbre frappé lâche des feuilles, un rocher des éclats, une bête frappée recule et sursaute.
- **Le poids** : une anticipation avant le geste, un suivi après (l'écharpe continue, la cape retombe) ; un léger écrasement à l'impact ; un arrêt d'image de quelques centièmes sur un coup, plus long sur une mise à mort ; la caméra tremble à la morsure.
- **Le vent** : une seule respiration pour tout le lieu (herbe, feuillages, flammes, brume, son du vent), lente, avec des rafales.
- **Les bêtes** : leurs pattes (les segments de leurs planches) marchent pour de vrai, le corps oscille au pas, la tête suit ; au repos, elles respirent et regardent ; la fuite est un bond. Sans pattes (serpents, poissons), le corps entier ondule.
- **La mesure** : rien ne gigote sans raison. Des mouvements lents au repos, vifs dans l'action.

## L'équipe

| département | fichiers dont il a la charge | ce qu'il livre |
| --- | --- | --- |
| Environnement | `scripts/monde.gd`, `scripts/objet.gd`, `shaders/sol*`, `shaders/vegetation*` | le sol peint, l'herbe qui ondule, les arbres, buissons, rochers et touffes redessinés, le vent dans les feuillages, les feuillages qui s'effacent devant la veilleuse, des détails (fougères, champignons, bois mort, fleurs selon le lieu), la lisière du monde |
| Créatures | `scripts/bete.gd` | les bêtes animées d'après leurs planches (pattes, pas, respiration, regard), les réactions (sursaut, recul, fuite), la mort (chute, puis l'encre qui s'efface), les échos (fumée d'encre pâle) |
| La veilleuse | `scripts/joueur.gd` | la veilleuse redessinée et animée : marche, course, attente, respiration, gestes de récolte (couper, casser, cueillir, ramasser), coup de lance, torche, blessure, peur (elle se recroqueville), chute |
| Lumière et effets | `scripts/feu.gd`, `scripts/yeux.gd`, `scripts/effets.gd`, `shaders/feu*`, `shaders/ecran*` | le feu (flammes, braises, fumée, chaleur), la torche, la couleur du monde à chaque heure, la brume de nuit, les yeux, la caméra (secousse, arrêt d'image), les particules (éclats, poussière, feuilles, braises, lucioles), les effets d'écran (peur, blessure, grain, vignette) |
| Interface | `scripts/interface.gd`, `scripts/tactile.gd`, `polices/` | l'écran-titre (une scène vivante), le HUD (jauges, objets dessinés en icônes, recettes en cartes), les cartes de titre (« Nuit 2 », « L'aube »), les objets récoltés qui volent vers le sac, l'écran de fin en page de carnet (les bêtes croisées, dessinées), la pause, les boutons tactiles |
| Son | `scripts/sons.gd` | l'ambiance (vent à rafales, grillons, chouettes, hurlements au loin), le feu qui crépite et éclate, les pas selon le sol, des sons de gestes plus riches, le cœur, un réverbère la nuit, une nappe musicale sobre, des notes à la tombée de la nuit et à l'aube ; tout fait par le code |
| Direction (intégration) | `scripts/principal.gd`, `scripts/essai.gd`, `scripts/vitrine.gd`, `scripts/regles.gd`, `scripts/donnees.gd`, `project.godot`, ce document | les accroches entre départements, l'intégration, la passe finale de cohérence, les essais |

Un département ne modifie que ses fichiers. S'il lui faut une accroche ailleurs, il la demande à la direction (son rapport le dit), et il peut l'ajouter, pour essayer, dans sa copie seulement.

## Les accroches (déjà posées dans `principal.gd`)

- `effets` (`scripts/effets.gd`) : `nouvelle_partie(scene, camera, obscurite)`, `vider()`, `maj(delta)`, `teinter(obscurite, l)`, `secousse(force)`, `arret(duree)`, `impact(p, couleur)`, `mort(p, couleur, largeur)`, `recolte(p, genre)`, `allumage(p)`, `blessure()`, `echo(p)`, `tombee()`, `aube()`, `fin()`.
- `joueur` : `geste(genre, vers)` (une récolte), `frapper()` (un coup), `blesser(n)`, `mourir()` (la santé à zéro ; l'écran de fin vient `DUREE_MORT` secondes après).
- `ui` : `carte(titre, sous_titre)`, `ramasse(objet, n, p)` (p : où, dans le lieu), `blessure()`, `message(t, couleur)`.
- `sons` : `maj(jeu, delta)` (chaque image), `jouer(nom, volume_db, hauteur)`, `niveau(boucle, v)`, `taire()`.
- `jeu.qualite` : `"haute"` (un ordinateur) ou `"mobile"` (un écran tactile ; pour l'essayer : `-- --vitrine --mobile`). En `"mobile"` : moins de particules, pas d'ombres portées, pas d'effet qui lit l'écran.

## Les contraintes

- **Godot 4.3, rendu Compatibility** (il tourne dans un navigateur, en WebGL 2). Pas de compute, pas de 3D. Les shaders `canvas_item` sont permis. Un effet qui lit l'écran (`hint_screen_texture`) seulement en qualité haute.
- **Aucune image, aucun son venus d'ailleurs** : tout est dessiné par le code (`_draw`, des images générées, des shaders), et tout son est fait par le code. Seule exception : des fontes libres (OFL), avec leur licence.
- **La performance** : 60 images par seconde sur un ordinateur, 30 et plus sur un téléphone moyen. Le lieu a près de 900 objets : on ne les redessine pas à chaque image (le vent passe par un shader), l'herbe en masse passe par un `MultiMeshInstance2D`.
- **Les règles ne bougent pas** : `regles.gd`, les dégâts, les durées, ce qui est compté pour Orvane. L'essai (`-- --essai`) doit passer, sans écran comme avec.
- **Sans écran** (`--headless`), rien ne doit planter : pas de rendu, mais le code tourne.
- **Le code** : GDScript 4, indenté aux tabulations, commenté en français dans le style des fichiers existants (court, juste, sans jargon).

## Vérifier

```
outils/godot.sh --headless --path jeux/lisiere --import                 # une fois, dans une copie neuve
outils/godot.sh --headless --path jeux/lisiere -- --essai               # l'essai : il doit passer
gdparse jeux/lisiere/scripts/*.gd                                       # la syntaxe, comme la CI
node bancs/lisiere.js                                                   # le projet et le monde gardé
jeux/lisiere/outils/film.sh /tmp/film -- --vitrine --heure nuit         # filmer la vitrine : regarder /tmp/film/planche.png
jeux/lisiere/outils/film.sh /tmp/film -- --vitrine --heure jour --duree 10
```

La vitrine (`scripts/vitrine.gd`) met en scène une partie : le feu, des bêtes de chaque sorte, la veilleuse qui attend, marche, coupe, chasse, cueille, prend une torche, a peur et se fait mordre. On la filme avant et après chaque changement, et on compare.
