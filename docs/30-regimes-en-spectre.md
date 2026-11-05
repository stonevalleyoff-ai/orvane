# 30. Les régimes en spectre

Jusqu'ici, une bête était herbivore, omnivore ou carnivore. Un mangeur de fruits et un brouteur d'herbe se disputaient les mêmes plantes, un mangeur d'insectes chassait comme un loup, et personne ne buvait de sang. Maintenant, chaque lignée a un spectre : la part de feuilles, de fruits, de graines, de nectar, d'insectes, de viande et de sang dans ce qu'elle mange. C'est la première étape de l'ouverture des domaines fermés.

`moteur/dietes.js`. Le moteur, la flore (docs/17) et les souches (docs/29) l'appellent. Un monde sans régimes en spectre n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Le spectre d'une lignée

`plan.diete` : sept parts, dont la somme fait 1. Par exemple `{ "feuilles": 0.5, "fruits": 0.5 }`. À l'éveil, chaque lignée reçoit le sien d'après son régime et son corps :

| la lignée | son spectre |
| --- | --- |
| un grand brouteur | des feuilles |
| un petit brouteur (moins d'un kilo) | 80 % de feuilles, 20 % de graines |
| un brouteur qui grimpe, vole ou a des mains | moitié feuilles, moitié fruits |
| un butineur | 50 % de nectar, 30 % de feuilles, 20 % de graines |
| un omnivore | 70 % de plantes (feuilles, fruits, graines), 30 % d'insectes, ou d'insectes et de viande s'il est grand |
| un petit carnivore (moins de 200 g) | des insectes |
| un carnivore moyen | 80 % de viande, 20 % d'insectes |
| un grand carnivore | de la viande |

Les filtreurs et les détritivores gardent leur régime.

**Le régime d'hier se lit dans le spectre** :
- 10 % de chair au plus (insectes, viande, sang) : herbivore ;
- 90 % au moins : carnivore ;
- entre les deux : omnivore.

## Ce que le spectre change

**Les plantes.** Chaque part vient de certaines plantes :
- les feuilles, de toutes ;
- les fruits, des arbres, des buissons et des succulentes ;
- les graines, des herbes, des roseaux, des buissons et des arbres ;
- le nectar, des plantes à fleurs.

Les défenses ne gardent pas tout pareil. Un fruit est fait pour être mangé : les toxines ne le gardent pas, les épines à moitié. Sur un arbre aux feuilles toxiques, un mangeur de fruits trouve 1,33 fois ce que trouve un mangeur de feuilles.

**Qui se gêne.** Deux bêtes qui ne mangent pas la même part d'une plante se gênent peu : un mangeur de fruits laisse les feuilles aux brouteurs.

**Ce qu'une bouchée prend à la plante** :
- une feuille, tout ;
- une graine, la moitié ;
- un fruit, un dixième ;
- le nectar, rien.

**Qui mange les fruits sème les graines.** Les arbres, les buissons et les succulentes repoussent jusqu'à 20 % de plus là où l'on mange beaucoup leurs fruits (à moitié de cet effet quand les mangeurs de fruits pèsent 5 % de la place des plantes).

**Les bêtes.**
- **Les insectes et la viande.** Un mangeur d'insectes chasse les petites bêtes (les hexapodes, et les bêtes de 20 g au plus), un mangeur de viande les autres. Un mangeur d'insectes de 100 g qui mange désormais moitié viande chasse une souris de 300 g six fois plus, un insecte deux fois moins.
- **Le sang.** Un buveur de sang pique des bêtes au moins vingt fois plus grandes que lui, qu'il n'aurait jamais chassées. Une piqûre ne tue qu'un dixième de ce qu'elle prend. Boire le sang d'une bête ne dispute pas sa chair aux chasseurs.
- **Les maladies.** Un insecte qui boit du sang porte mieux les souches (docs/29) : à 60 % de sang, il en transmet 2,8 fois plus. Parmi les insectes d'un lieu, c'est d'abord un buveur de sang qui devient le vecteur d'une souche.
- **L'omnivore.** Ce qu'il cherche en viande et ce qu'il tire des plantes suivent sa part de chacun.

## Les spectres glissent

À chaque séparation, une fois sur quatre, le spectre de la lignée fille glisse. 15 points d'une de ses parts passent à une part voisine :
- des feuilles aux fruits ou aux graines ;
- des fruits au nectar ou aux insectes ;
- des insectes à la viande ou au sang.

Le régime suit le spectre. Devenue carnivore, une lignée gagne en audace et en sens ; devenue herbivore, elle en perd. Dans un monde aux régimes en spectre, c'est ce glissement qui fait changer les régimes, à la place de celui des dérives (docs/29). Il a son propre hasard, tiré du nom de la lignée et du cycle.

## Le jour de l'éveil, aucune bête ne change

Tout se rapporte à ce qu'était chaque lignée à l'éveil (`plan.diete0`, gardé aussi par ses lignées filles) :
- **La nourriture.** Elle se mesure part par part, rapportée à ce que les plantes étaient à l'éveil (`reference_diete`), et se raccorde à l'ancienne mesure.
- **La concurrence.** Elle se raccorde au premier cycle (`recouvrement_avant`).
- **La chasse.** Elle se rapporte au spectre de l'éveil.

Seules les plantes changent tout de suite un peu : elles ne perdent plus ce que les mangeurs de fruits et de nectar ne leur prennent pas.

## Ce qu'un jeu en fait

- `plan.diete` dit ce qu'une bête mange. Un jeu peut la montrer cueillant des fruits, butinant, gobant des insectes, ou piquant une grande bête.
- `plan.regime` garde son sens : un jeu qui ne lit que lui n'a rien à changer.
- Les mots : `OrvaneDietes.mots(diete)` donne « 50 % de fruits, 50 % de feuilles ».

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "flore": true, "dietes": true }
```

Au cycle de nuit suivant, après la flore, les régimes deviennent des spectres, une fois pour toutes.

## Ce que le banc vérifie

`bancs/dietes.js`, en trois minutes, sur le monde d'Orvane avec sa flore :
- **Le jour un.** Un monde sans régimes en spectre tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, aucune bête ne change.
- **Les spectres de l'éveil.** 109 lignées reçoivent un spectre qui redit leur régime.
- **Les plantes.**
  - Sur un arbre toxique, un mangeur de fruits trouve 1,33 fois ce que trouve un mangeur de feuilles.
  - Le Lomuel tondeur de forêt, qui mangeait moitié feuilles, moitié fruits, ne mange plus que des fruits. 20 cycles après, il compte 20 % de bêtes de plus. Les mangeurs de feuilles de ses lieux, qu'il ne gêne plus, 13,5 % de plus. Les arbres, qu'il ne broute plus et qu'il sème, 0,8 % de plus.
- **Les bêtes.**
  - Un carnivore de 900 g ne mange plus que des insectes : en 15 cycles, les insectes de ses lieux perdent 23 %, les autres bêtes gagnent 3,6 %.
  - Le Vael, un petit omnivore de 43 g, se met à boire du sang. Il pique des brouteurs qu'il n'aurait jamais chassés, et sa part de chair le nourrit à 13 % contre 3,6 %. Ses hôtes n'y perdent que 1 % en 15 cycles. Mais le sang ne paie pas pour lui : il n'y en a pas assez pour 2 millions de buveurs, et il en perd un cinquième. La sélection fait le tri.
  - Un insecte qui boit 60 % de sang transmet 2,8 fois plus les souches.
- **Le glissement.**
  - Un quart des séparations glissent, vers une part voisine.
  - 316 séparations forcées : toutes les filles ont un spectre neuf, et leur régime le suit.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil éveille les régimes une fois.

```
node bancs/dietes.js
```

## Ce qui reste ouvert

- **La charogne.** Les détritivores gardent leur régime ; un nécrophage qui suit les chasseurs attendra.
- **Des spécialistes.** Un mangeur de fruits mange tous les fruits ; un oiseau qui ne mange que les figues d'un seul arbre, et l'arbre qui en dépend, attendront.
- **Le plancton.** Les filtreurs gardent le leur.
