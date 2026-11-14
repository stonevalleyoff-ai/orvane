# 40. Le directeur de mise en scène

Le monde fait mille choses par nuit : des lignées naissent et s'éteignent, des populations explosent ou s'effondrent, des maladies courent, des troupeaux partent pour l'hiver, des joueurs donnent des noms. Un jeu ne peut pas tout montrer, et ne veut pas montrer la même chose selon son genre. Un jeu d'horreur veut ses chasseurs qui se multiplient et ses corps qui dérangent ; un jeu cozy, ses naissances, ses noms et ses migrations ; un jeu de collection, ses lignées neuves et ses raretés.

`tampon/directeur.js` lit l'instantané du jour (et le cycle d'avant qu'il porte, `precedent` ; la chronique, si on la lui donne), trouve les moments, les pèse selon le genre et les rend classés, chacun avec sa raison. C'est une lecture : rien ne change dans le monde. C'est la dernière étape de la phase 4 de la feuille de route, avec les profils de genre.

## L'appel

```js
const D = require('./tampon/directeur.js');   // dans un navigateur : globalThis.OrvaneDirecteur
const M = D.moments(instantane, {
  genre: 'horreur',            // un des genres ci-dessous ; « cozy » par défaut
  biomes: ['foret', 'marais'], // les biomes que le jeu joue, par type ; absent : tous
  familles: ['animale'],       // ce qu'il montre (animale, synthetique, vegetale) ; absent : les bêtes
  chronique,                   // chronique/index.json, s'il veut les noms et les annonces (docs/37)
  deja: ['predateurs:vidun:foret'],   // les moments déjà montrés (le jeu garde leurs clés) : ils ne reviennent pas
  max: 3                       // combien en rendre ; absent : la dose du genre
});
// → [{ cle: 'predateurs:vidun:foret', type: 'predateurs', taxon: 'vidun', biome: 'foret', poids: 2.4,
//      titre: 'Les chasseurs se multiplient', texte: 'Vidun rôdeur de forêt : +38 % sur le cycle, à Forêt — 24 kg.' }, …]
```

## Les moments

| sorte | quand | sa force |
| --- | --- | --- |
| `extinction_proche` | une lignée menacée (ou en déclin sous 200 bêtes) | d'autant plus qu'elle est petite et qu'elle baisse |
| `lignee_neuve` | une lignée née d'une séparation, il y a trois cycles au plus | plus elle est récente |
| `rarete` | une lignée de moins de 500 bêtes dans le monde | plus elle est rare |
| `predateurs` | un carnivore qui gagne plus de 5 % sur le cycle | sa croissance, et sa taille |
| `epidemie` | une population dont 5 % au moins sont malades | la part des malades, et la virulence de la souche |
| `migration` | une population qui part, ou revient, avec la saison (docs/38) | la part qui part |
| `forme_nouvelle` | un corps segmenté, rayonné ou à tentacules, né il y a moins de 30 cycles (docs/33) | plus il est récent |
| `explosion`, `effondrement` | ce que le cycle a vu | |
| `catastrophe`, `savoir`, `invention` | ce que le cycle a vu | |
| `nom` | un nom donné par un joueur ce cycle (la chronique) | |
| `annonce` | une entrée de la chronique d'importance 3, ce cycle | |

## Les genres

Les genres de la feuille de route (« Ce que chaque genre en tire »). Chacun donne un poids à chaque sorte de moment, et une dose : combien de moments par session.

| genre | dose | ce qu'il met en avant |
| --- | --- | --- |
| `horreur` | 2 | les chasseurs qui se multiplient, les corps nouveaux, les maladies, les lignées qui s'éteignent, les catastrophes |
| `cozy` | 4 | les noms, les migrations, les savoirs, les lignées neuves, les raretés ; presque jamais un chasseur ni une maladie |
| `collection` | 5 | les lignées neuves, les raretés, les corps nouveaux, les dernières chances de voir une lignée |
| `voxel` | 3 | les migrations, les explosions et les effondrements, les lignées neuves, les savoirs |
| `survie` | 3 | les chasseurs, les maladies, les catastrophes, le gibier qui s'effondre ou qui part |
| `strategie` | 4 | les explosions et les effondrements, les lignées menacées, les maladies |
| `mmo` | 3 | ce que tout le serveur vit : les catastrophes, les épidémies, les migrations, les annonces |

Dans la dose, une lignée ne revient pas deux fois, et une sorte de moment pas plus de deux fois — une session n'est pas une liste de raretés —, sauf s'il n'y a rien d'autre à montrer.

## Dans l'observatoire

La vue d'ensemble a un panneau « Ce que montrerait un jeu », un bouton par genre : le même monde, sept mises en scène.

## Ce que le banc vérifie

`bancs/directeur.js`, sur une scène tirée de la genèse 2026 (où l'on pose une lignée neuve, un chasseur qui gagne 60 %, une migration qui part, un nom donné, une annonce de la chronique, une catastrophe, un savoir) :
- chaque genre met en avant ce qu'il doit : l'horreur ouvre sur les chasseurs, le cozy montre le nom, la migration et le savoir et aucun chasseur, la collection ouvre sur la lignée neuve ; les sept genres font sept choix différents ;
- chaque moment est une lignée vivante que le jeu montre, dans un lieu qu'il joue, avec son titre, son texte et son poids ; la dose ; deux moments d'une sorte au plus ; une lignée une fois ; classés ;
- les moments déjà montrés ne reviennent pas ; un jeu qui ne joue que la prairie n'a que des moments de la prairie ; la même scène, le même choix ; le monde n'est pas touché ;
- le monde piège (docs/39) ne le fait pas tomber.

## Ce qui reste ouvert

- **Les profils de genre, côté monde.** Un genre règle aussi le monde qu'un jeu fait vivre pour lui seul : la vitesse d'évolution (la chance de séparation), la fréquence des catastrophes, la tolérance aux extinctions. Le directeur n'en est que la part qui se joue chez le jeu.
- **Un rythme.** Le directeur choisit ce qui compte au dernier cycle ; un jeu voudra parfois étaler une histoire sur plusieurs sessions (une lignée menacée, suivie jusqu'à sa fin). La chronique a déjà la mémoire pour cela.
