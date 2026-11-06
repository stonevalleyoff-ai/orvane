# 41. Les profils de genre

Le même moteur sert tous les genres. Un jeu d'horreur, un jeu cozy et un jeu de collection ne veulent pourtant pas le même monde : l'un veut des bêtes qui changent vite et dérangent, l'autre un monde qui se répare, le troisième beaucoup de lignées à découvrir. Jusqu'ici, chacun devait trouver seul quelles règles du moteur toucher.

Un **profil de genre** est ce réglage, tout prêt. `moteur/genres.js` en donne huit. Chaque promesse est mesurée par un banc, sur un monde réel, contre le réglage neutre.

## Ce qu'un genre règle

| partie | ce qu'elle change | où |
| --- | --- | --- |
| `regles` | les règles du moteur : la vitesse de l'évolution, la marque des corps, les catastrophes, les maladies | `monde.regles` (docs/13) |
| `influence` | ce que pèsent les joueurs | le profil du tampon (docs/4) |
| `solo` | le rythme d'un monde solo : un cycle par heure, par dix minutes, par session, en accéléré | `OrvaneSolo.creer` (docs/19) |
| `directeur` | ce qu'un jeu de ce genre montre | `tampon/directeur.js` (docs/40) |
| `mecanismes` | ceux qu'il gagne à éveiller : la flore, le milieu, les parcelles… | `profil.monde` |

## Les huit genres

| genre | sa promesse | ce qu'il règle |
| --- | --- | --- |
| `neutre` | le moteur tel qu'il est | rien |
| `horreur` | une évolution rapide, peu de variantes mais très marquées, des corps qui dérangent, des maladies | traits neufs × 2,7 ; 8 phénotypes au plus par lignée ; une silhouette qui dérive 1,8 fois plus, des formes nouvelles et des organes plus fréquents ; maladies × 2 ; séparations moitié moins ; un cycle toutes les 10 minutes |
| `cozy` | des extinctions rares et lentes, des catastrophes douces, des maladies bénignes, un monde qui se répare | catastrophes 4 fois plus rares et deux fois moins meurtrières ; maladies 3 fois plus rares et moins virulentes ; l'habitat se refait 3 fois plus vite ; nourrir et relâcher aident davantage |
| `collection` | beaucoup de lignées, une spéciation rapide, des formes rares | séparations × 3, dès 20 cycles d'installation ; traits neufs × 1,7 ; formes nouvelles et organes plus fréquents |
| `voxel` | un monde en parcelles que les constructions transforment | un cycle par session de jeu ; les parcelles, le milieu et la flore à éveiller |
| `survie` | une chasse qui raréfie et rend méfiant ; le joueur, un prédateur parmi d'autres | une chasse pèse deux fois plus, jusqu'à la moitié d'une population par cycle ; la méfiance dure et monte plus vite ; maladies × 1,3 |
| `strategie` | le temps accéléré : le joueur règle le milieu et voit la sélection répondre | douze cycles par heure |
| `mmo` | un monde pour tous, des événements de serveur | catastrophes × 2 ; maladies × 1,7 ; un compte ne pèse pas plus de 5 % de la pression |

## S'en servir

**Un monde solo** (le jeu fait vivre sa copie, docs/19) :

```js
const S = OrvaneSolo.creer(instantane, { genre: 'horreur' });
```

Les règles du genre passent dans le monde, ses poids dans le profil du joueur, son rythme dans le monde solo. Ce que le jeu donne lui-même l'emporte : `{ genre: 'horreur', periode: '1h' }` garde le rythme d'une heure. Dans un navigateur, charger `moteur/genres.js` avant `moteur/solo.js`.

Le voxel vit **par session** : le jeu appelle `OrvaneSolo.cycles(S, 1)` à chaque ouverture (`S.session` vaut 1).

**Un monde hébergé** (un monde à soi, avec son Supabase, docs/19) : une ligne dans son profil.

```json
"monde": { "id": "mon-monde", "genre": "cozy", "regles": { … } }
```

À chaque cycle, `hebergement/cycle.js` pose les règles du genre sur celles de la genèse, puis celles de `monde.regles` par-dessus. Un réglage à la main l'emporte toujours sur le genre. Les poids des joueurs du genre passent dans l'influence du profil. Le monde publie son genre (`monde.genre`).

Le monde d'Orvane, lui, n'a pas de genre : il sert tous les jeux à la fois.

**À la main** :

```js
OrvaneGenres.appliquer(instantane, 'collection')   // un nouvel instantané, réglé pour le genre
OrvaneGenres.regles('horreur', monde.regles)       // les règles d'un monde, le genre posé dessus
OrvaneGenres.profil('survie', profil)              // un profil du tampon réglé pour le genre
OrvaneGenres.solo('strategie')                     // les options d'un monde solo : { periode, acceleration, genre }
```

Une règle qui est un objet se complète d'un niveau : `collection` change la chance et la durée de la séparation, et garde l'effectif qu'un monde aurait réglé. Un genre inconnu se refuse, en disant ceux qu'on connaît.

## Ce que le banc mesure

`bancs/genres.js`, environ trois minutes. La genèse 7 (99 lignées, 16 lieux), 80 cycles sous chaque genre, même graine :

| | neutre | horreur | cozy | collection | mmo |
| --- | --- | --- | --- | --- | --- |
| traits apparus | 126 | **333** | — | **236** | — |
| phénotypes par lignée | 18,7 | **7,9** | — | — | — |
| épidémies | 106 | 172 | **44** | — | **161** |
| catastrophes | 2 | — | **0** | — | **5** |
| effondrements | 22 | — | **0** | — | — |
| séparations | 1 | — | — | **5** | — |
| lignées au bout | 100 | — | 100 | **104** | — |

Et :
- **Neutre** : le même cycle, au caractère près.
- **Survie** : 300 bêtes chassées sur une même population. Elle en perd 288 de plus qu'en paix dans un monde neutre, 575 dans un jeu de survie.
- **Stratégie** : en une heure, un monde de stratégie vit 12 cycles, un monde neutre 1.
- **Voxel** : un cycle par session ; les parcelles à éveiller.
- **Un monde hébergé** : `profil.monde.genre` se vérifie (« western » se refuse) ; le genre passe sur les règles de la genèse sans effacer leurs voisines.
- **Déterministe** : même monde, même genre, mêmes cycles.

## Ce qui reste ouvert

- **Les corps qui dérangent.** L'horreur fait dériver la silhouette plus fort, mais seulement aux séparations, et elle en fait moins. Sur 80 cycles, ses bêtes ne changent pas encore d'allure. Il faudrait le mesurer sur une genèse entière.
- **Des extinctions plus lentes.** Le cozy n'a encore rien qui retienne une lignée au bord de l'extinction : il en retire seulement les causes (les catastrophes, les maladies).
- **D'autres genres.** Un jeu de pêche, un jeu d'élevage. Un genre se compose en quelques lignes : le banc dit s'il tient sa promesse.
