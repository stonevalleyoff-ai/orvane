# 34. L'esprit : apprendre, transmettre, des outils

Jusqu'ici, tout ce qu'une bête savait faire lui venait de ses gènes : il fallait des générations pour qu'un trait se répande, et toutes les populations d'une lignée faisaient la même chose. Maintenant, dans un monde à l'esprit éveillé, les bêtes apprennent.

Un savoir naît chez quelques bêtes d'une population et se répand par imitation en quelques dizaines de cycles. Il se transmet aux petits, voyage avec les migrants, et se perd quand la population s'effondre. C'est la cinquième et dernière étape de l'ouverture des domaines fermés.

`moteur/esprit.js`. Un monde sans esprit n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Son hasard est le sien.

## Qui apprend

La capacité d'une lignée à apprendre vient de son corps :
- sa sociabilité (on apprend des siens) ;
- ses sens ;
- ses mains, ou un bec d'oiseau ;
- sa taille.

Un simien sociable qui a des mains apprend à 83 %, un loup grégaire à 63 %, une fourmi à 29 %.

**La curiosité** est un trait qui n'apparaît que dans un monde à l'esprit éveillé. Comme tout trait, il naît par mutation chez quelques bêtes. Une bête curieuse apprend plus vite et plus souvent ce que savent les siens : ses savoirs lui rapportent davantage. Il coûte 4 % de petits.

Là où savoir paie, la sélection fait les esprits ; là où il n'y a rien à apprendre, la curiosité coûte sans servir. Les gènes et la culture avancent ensemble.

## Les savoirs

| le savoir | qui peut l'apprendre | où il sert | ce qu'il rapporte | son geste, son outil |
| --- | --- | --- | --- | --- |
| casser des noix avec une pierre | qui mange des plantes, avec des mains ou un bec | les lieux boisés | 15 % de nourriture en plus | casser, une pierre |
| pêcher des insectes avec une brindille | qui mange de la chair, avec des mains | les lieux boisés | une chasse meilleure de 25 % | pêcher, une brindille |
| chasser ensemble | un carnivore grégaire | les lieux ouverts | une chasse meilleure de 30 % | encercler |
| un cri pour chaque prédateur | une bête grégaire aux sens fins | partout | 20 % de pertes en moins | alerter |
| cacher des réserves pour l'hiver | qui mange des plantes, de 5 kg au plus, qui fouit, grimpe ou vole | les lieux froids, aux saisons marquées | 12 % de nourriture en plus | cacher |
| laver sa nourriture | qui mange des plantes, avec des mains ou qui nage | les lieux humides | 6 % de nourriture en plus, 5 % de pertes en moins | laver |
| se souvenir des routes des saisons | une grande bête grégaire qui marche ou vole | les lieux aux saisons | 10 % de nourriture en plus | migrer |
| tisser des nids | une petite bête qui vole | les lieux boisés | 12 % de pertes en moins | tisser, des brindilles |

Ce qu'un savoir rapporte va à proportion de ceux qui le savent, et du lieu. Une chasse concertée met plus de proies à la portée de la population entière. Parmi ses bêtes, les curieuses en tirent davantage.

## Comment un savoir vit

- **Il naît** d'une bête qui peut l'apprendre, là où il sert : une fois sur cent cycles environ par population, plus souvent chez une lignée qui apprend bien. Il commence à 2 % des bêtes.
- **Il se répand** par imitation : à 40 cycles, de 5 % à plus de 60 % dans les lieux où il sert.
- **Il se transmet** aux petits : ce que sait une population, ses petits le savent aussi.
- **Il voyage** avec les migrants. Une population nouvelle sait la moitié de ce que sait sa lignée ; une lignée qui se sépare emporte ce que savait sa mère.
- **Il se perd.** Il s'oublie lentement là où il ne sert à rien, et vite dans une petite population. Une population de 12 bêtes ne sait presque plus rien en 15 cycles.

**Une tradition.** Un savoir est local : la population de la forêt casse des noix avec une pierre, celle de la steppe ne le fait pas. Deux populations d'une même lignée peuvent avoir des savoirs différents.

## Ce qu'un jeu en fait

- **`populations[].savoirs`** : pour chaque savoir, la part des bêtes de la population qui le savent.
- **`catalogue.savoirs`** : chaque savoir que le monde connaît, avec son nom, son geste (`casser`, `pecher`, `encercler`, `alerter`, `cacher`, `laver`, `migrer`, `tisser`), son outil (`pierre`, `brindille`, `brindilles`), son présage et ce qu'il fait.
- **L'événement `savoir`** : « chez Belantis, à Mangrove, une bête invente : casser des noix avec une pierre (un outil : pierre) », ou « … a perdu un savoir ».

Stone Valley (§230) fait savoir chaque bête à proportion de sa population, et un petit apprend de sa mère. Une bête qui sait le montre de temps en temps quand on la regarde de près : une pierre dans la gueule et des éclats de coque, une brindille, de la terre grattée, des gouttes d'eau. Le carnet dit : « sait casser des noix avec une pierre (Marais : 64 %) ».

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "esprit": true }
```

Au cycle de nuit suivant, l'esprit s'éveille, une fois pour toutes. Personne ne sait encore rien.

## Ce que le banc vérifie

`bancs/esprit.js`, en une minute, sur le monde d'Orvane :
- **Le jour un.** Un monde sans esprit tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Qui apprend.**
  - Un simien qui a des mains apprend à 83 % : casser des noix, pêcher des insectes, crier juste, laver, les routes.
  - Un loup apprend à 63 % : chasser ensemble, crier juste, les routes.
  - Une fourmi apprend à 29 %.
- **Une tradition.** Une lignée reçoit des mains, et une bête invente : casser des noix avec une pierre. 5 % de chaque population le savent ; 40 cycles après, 45 % dans les lieux boisés (64 % en forêt), 5 % dans les lieux ouverts.
- **La perte.** En 15 cycles, une population de 12 bêtes ne sait presque plus rien. Une de 5 000 sait mieux. Une troisième, qui ne savait rien, l'apprend de ses migrants.
- **Ce que ça rapporte.**
  - L'Orvi chasse ensemble (80 % le savent) : il se nourrit à 72 % contre 67 %, et compte 55 057 bêtes contre 50 653 après 15 cycles.
  - La curiosité tient 50 % là où l'on sait crier juste et laver sa nourriture, et recule à 46 % là où l'on ne sait rien.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil éveille l'esprit une fois.

```
node bancs/esprit.js
```

## Ce qui reste ouvert

- **Des savoirs que le monde invente lui-même**, en assemblant un geste, un outil et un but, comme la grammaire assemble ses phrases (docs/32).
- **Des chants et des dialectes**, qui séparent deux populations qui ne se comprennent plus.
- **Des savoirs appris des joueurs** : la méfiance (docs/4) en est le premier.
- **Les individus** (la phase 3) : une vieille qui mène le troupeau, une bête qui invente et qu'on peut suivre.
