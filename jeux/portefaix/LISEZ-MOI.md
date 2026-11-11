# Portefaix

*Videz la maison avant l'aube. Ne réveillez pas ce qui y dort.*

Un prototype en Godot 4.3, en 3D, à la première personne, pour 1 à 6 joueurs. Des déménageurs de nuit vident une maison hantée : il faut charger pour un quota d'euros dans la zone du camion avant 6 h. Les meubles sont lourds et fragiles, la chose qui dort au fond de la maison entend tout, et le public du stream vote les sabotages.

C'est un prototype : il sert à savoir si la boucle de jeu est drôle, pas à être beau. Tout y est fait de boîtes et de sons fabriqués par le code ; il n'y a aucun fichier d'image ni de son.

**Ce jeu n'est pas branché sur Orvane.** Il est rangé ici, à côté de Lisière, parce que c'est le dépôt où il a été demandé ; il ne lit pas le monde et ne lui renvoie rien.

## Jouer

Il faut [Godot 4.3](https://godotengine.org/download/archive/4.3-stable/) (la version standard). Ouvrir `jeux/portefaix/project.godot`, puis F5. Ou, depuis la racine du dépôt, sous Linux :

```
outils/godot.sh --path jeux/portefaix
```

- **Jouer seul** : on est son propre hôte. Le piano et l'armoire ne se soulèvent pas seul ; le quota en tient compte.
- **À plusieurs** : l'un clique « Héberger », puis « Commencer la nuit » quand tout le monde est au salon. Les autres tapent son adresse et « Rejoindre ». Sur le même réseau local, c'est l'adresse que le salon affiche. Par Internet, l'hôte doit ouvrir le port **24680 en UDP** sur sa box, ou tout le monde passe par un réseau privé (Tailscale, ZeroTier, Hamachi). On n'entre pas dans une nuit commencée.
- **Avec son chat Twitch** : l'hôte tape le nom de sa chaîne dans le menu. Le jeu lit le chat en lecture seule, sans compte ni mot de passe. Sans chaîne, des spectateurs de paille votent au hasard.

| | |
| --- | --- |
| marcher | ZQSD (ou WASD : ce sont les touches physiques), ou les flèches |
| courir (bruyant) | Maj |
| s'accroupir (discret, et moins visible) | Ctrl |
| sauter | Espace |
| prendre, poser, klaxonner | E, ou le clic gauche |
| lancer ce qu'on tient | le clic droit |
| la torche | F |
| crier (pour qui n'a pas de micro) | V |
| libérer la souris | Échap |

## Les règles

- **Le quota** : 30 % de la valeur de la maison pour un porteur seul, 6 % de plus par porteur, 60 % au plus. Ce qui compte est ce qui est **posé** dans la zone jaune, à sa valeur du moment.
- **Porter** : chaque porteur donne une force limitée. Seul, on soulève jusqu'à 45 kg ; à deux, 90 ; à trois, 135. Ce qui pèse plus se traîne. Ce qu'on porte ralentit, et échappe des mains si l'on s'en éloigne de 4 m (un canapé coincé dans une porte, par exemple).
- **La casse** : un choc coûte à un meuble une part de sa valeur, selon sa fragilité. Un vase perd presque tout, un canapé presque rien.
- **Le bruit** : les pas, la course, les cris, les chocs et le **vrai micro** du joueur ont une portée en mètres. La jauge en bas à gauche la montre.
- **La chose** : elle dort 35 secondes, puis rôde. Elle va voir tout bruit qui porte jusqu'à elle, et chasse le porteur qu'elle voit (à 11 m, moins s'il est accroupi), plus vite qu'on ne marche et moins vite qu'on ne court. Elle traverse les meubles et les portes claquées, pas les murs. Sans voir sa proie pendant 4 secondes, elle renonce.
- **Les morts** hantent la maison : ils volent, et poussent les objets de moins de 12 kg. Pour aider, ou non.
- **Le chat** : toutes les 40 secondes, trois sabotages sont proposés. Le public vote `1`, `2` ou `3` pendant 15 secondes, une voix par personne. Les cinq sabotages : couper le courant, claquer une porte, faire du vacarme sur un porteur, griller les torches, mettre les meubles en apesanteur.
- **La fin** : gagné si le quota est dans la zone à 6 h, ou si l'on klaxonne le camion une fois le quota atteint. Perdu si l'aube se lève sur un camion trop vide, ou si plus personne n'est en vie. Klaxonner sans le quota ne fait que prévenir la chose.

Tous les réglages sont dans `scripts/regles.gd`.

## Comment c'est fait

| fichier | ce qu'il fait |
| --- | --- |
| `scripts/regles.gd` | tous les nombres du jeu, et le catalogue des meubles |
| `scripts/principal.gd` | le menu, le réseau, la partie : ce que l'hôte décide et redit aux autres |
| `scripts/maison.gd` | le plan en lettres d'où sortent les murs, les portes, les lampes, la cour, le camion, et la grille où marche la chose |
| `scripts/objet.gd` | un meuble : son dessin, le portage, la casse |
| `scripts/joueur.gd` | un porteur, vivant ou mort |
| `scripts/creature.gd` | la chose : entendre, voir, chasser |
| `scripts/chat.gd` | les votes, les spectateurs de paille, la lecture du chat de Twitch |
| `scripts/micro.gd` | le niveau du micro (rien n'est enregistré ni envoyé) |
| `scripts/sons.gd` | les sons, fabriqués au lancement |
| `scripts/interface.gd` | ce qui s'écrit à l'écran |
| `scripts/essai.gd` | les essais sans écran |

**Le réseau** : l'hôte fait foi. Il fait seul tomber les meubles, penser la chose, compter le chargement et dépouiller les votes, et le redit aux autres vingt fois par seconde. Chaque joueur ne mène que son porteur, et demande le reste à l'hôte (prendre, lâcher, pousser, klaxonner). Tout le monde bâtit la même maison d'après une graine donnée au départ.

## Les essais

```
outils/godot.sh --headless --path jeux/portefaix --import            # la première fois
outils/godot.sh --headless --path jeux/portefaix -- --essai          # une partie seul, jouée par le programme
outils/godot.sh --headless --path jeux/portefaix -- --essai-reseau   # un hôte et un invité sur la même machine
```

Chacun sort avec le code 0 si tout passe. Sans écran, Godot écrit des lignes `Parameter "m" is null` : c'est son rendu factice qui ne connaît pas les maillages, sans effet sur le jeu.

`--essai` joue toujours la même maison (la graine 7) ; `--essai --graine=12` en essaie une autre.
