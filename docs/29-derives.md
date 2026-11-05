# 29. Les dérives : des régimes, des plantes et des souches qui changent

Certaines choses étaient fixées une fois pour toutes, à la genèse ou à l'éveil. Le régime d'une lignée ne changeait qu'à la genèse. Une lignée de plantes restait une. Une souche gardait sa virulence et ne passait qu'aux lignées apparentées. Dans un monde aux dérives éveillées, tout cela se remet à bouger. C'est la sixième étape de la phase 2 ter, la dernière de l'émergence ouverte.

`moteur/derives.js`. Le moteur, la flore (docs/17) et les souches (docs/18) l'appellent. Un monde sans dérives n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Chaque dérive a son propre hasard, tiré du nom de la lignée et du cycle : celui du cycle ne bouge pas.

## Les régimes

Une lignée qui se sépare change parfois de régime, un pas à la fois :

| de | vers | à chaque séparation |
| --- | --- | --- |
| herbivore | omnivore | 5 % |
| omnivore | herbivore | 5 % |
| omnivore | carnivore | 4 % |
| carnivore | omnivore | 4 % |

Jamais d'herbivore à carnivore d'un coup. Un filtreur et un détritivore gardent le leur. Dans un monde aux régimes en spectre (docs/30), c'est le glissement du spectre qui fait changer les régimes, à la place de ces pas. Devenue carnivore, une lignée gagne en audace (+0,15), en sens (+0,1) et en vitesse (+10 %). Devenue herbivore, elle perd en audace (−0,1).

La sélection fait le reste : un omnivore né là où les proies abondent prospère, un autre né là où il n'y a rien à chasser s'efface.

## Les plantes qui se séparent

Les plantes broutées gagnent des défenses, des toxines ou des épines (docs/17). Là où une défense a gagné une partie d'une population sans l'avoir toute (entre 30 et 70 % des pieds), la part défendue devient parfois une lignée à elle (0,2 % de chances par cycle) :
- « Bate herbe épineuse (Prairie) », issue de l'herbe de la prairie : épineuse à 90 % ;
- sa mère garde le reste de ses pieds, et n'est presque plus épineuse ;
- elles se partagent la place de la mère : ensemble, elles font les pieds qu'aurait faits la mère seule, et la nourriture des brouteurs du lieu ne change pas.

Une lignée de plantes a trois filles au plus, et tout le monde en a au plus la moitié du nombre de lignées qu'avait la flore à son éveil. Une population doit peser 50 unités de biomasse au moins.

## Les souches qui mutent

Une souche qui infecte au moins 100 bêtes d'une population y mute parfois (0,4 % de chances par cycle) :
- le mutant porte le nom de sa mère et une lettre grecque : Banc α, Banc β ;
- sa virulence est celle de sa mère, multipliée par un tirage autour de 1 : plus ou moins virulent ;
- il est adapté à l'hôte où il est né, qui devient son origine (docs/18) : il passe aux parents de cet hôte, plus à ceux de sa mère ;
- il prend 10 % des infectés de sa mère.

Un monde garde 40 souches au plus.

## Les souches que portent les insectes

Un mutant né là où vit un petit insecte (un petit hexapode, ou une toute petite bête qui vole : une tique, un moustique) peut être porté par lui, trois fois sur dix. La souche dit alors son `vecteur` :
- **l'insecte pique tout le monde** : la souche passe d'une lignée à l'autre sans parenté, d'autant plus que l'insecte est nombreux (à moitié de son effet pour 10 000 insectes) ;
- **elle prend partout** : elle s'adapte à tout hôte, au moins à 60 % ;
- **un insecte qui vole** la porte aussi aux lieux voisins ;
- **l'insecte, lui, n'en tombe pas malade.**

Dans le banc, une souche portée par le Soméne, un petit hexapode, a pris en 15 cycles chez 10 lignées sans parenté avec son hôte. Sa mère, chez aucune.

## Ce qu'un jeu en fait

- **Un régime qui change** : l'événement `separation` le dit (« devenue carnivore »). Un jeu montre la lignée fille avec son nouveau régime.
- **Une plante qui se sépare** : une lignée de plantes nouvelle, avec son `parent`, et l'événement `separation`.
- **Une souche qui mute** : l'événement `epidemie` (« la souche Banc mute chez … : Banc β, portée par … »). Dans `monde.pathogenes.souches`, un mutant dit son `parent`, et une souche portée par un insecte son `vecteur`. Un jeu peut montrer des insectes qui piquent, des malades loin de toute parenté.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "derives": true }
```

Au cycle de nuit suivant, les dérives s'éveillent, une fois pour toutes.

## Ce que le banc vérifie

`bancs/derives.js`, en une minute, sur le monde d'Orvane avec sa flore et ses souches :
- **Le jour un.** Un monde sans dérives tourne exactement comme le moteur sans ce fichier. Éveillées, elles ne bougent rien tant qu'aucune ne tire.
- **Les régimes.**
  - Un pas à la fois, aux taux dits, sur 4 000 séparations de chaque régime. Jamais d'herbivore à carnivore ; un filtreur garde le sien.
  - Devenu carnivore, il gagne en audace, en sens et en vitesse.
  - 333 séparations forcées : avec des dérives fortes, 163 filles changent de régime ; les mêmes, sans dérives, aucune.
- **Les plantes.** La part épineuse d'une herbe devient une lignée à elle. Ensemble, elles font les pieds qu'aurait faits la mère seule. La nourriture des 27 brouteurs du lieu ne bouge pas. La fille vit.
- **Les souches.**
  - Une souche mute chez son hôte.
  - Née là où vit le Soméne, elle est portée par lui.
  - En 15 cycles, elle prend chez 10 lignées sans parenté, sa mère chez aucune. Le Soméne n'en tombe pas malade.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil éveille les dérives une fois.

```
node bancs/derives.js
```

## Ce qui reste ouvert

- **Des plantes qui se séparent par le lieu.** Aujourd'hui, une plante se sépare par sa défense. Une herbe de montagne et une herbe de plaine, séparées par la distance, attendront.
- **Des insectes qui préfèrent un hôte.** Un moustique pique tout le monde ; une tique qui ne pique que les grands brouteurs attendra.
- **Des régimes plus fins.** Un mangeur de fruits, un mangeur de graines, un mangeur d'insectes : des régimes dans le régime.
