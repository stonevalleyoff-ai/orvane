# 25. Pondre ou mettre bas

Jusqu'ici, aucune lignée ne pondait : chacune avait une portée (`plan.portee`), et le trait « ponte abondante » ne faisait qu'en augmenter le nombre. Maintenant, une lignée pond des œufs ou met bas des petits, et ce choix pèse sur sa vie. Les œufs sont nombreux, mais ils craignent le froid et les pillards. Les petits sont moins nombreux, mais à l'abri. Et des mangeurs d'œufs peuvent naître. C'est la deuxième étape de la phase 2 ter.

`moteur/ponte.js`. Le moteur l'appelle à chaque naissance et à chaque séparation. Un monde sans ponte n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Le mode d'une lignée

`plan.reproduction` : `ovipare` (elle pond) ou `vivipare` (elle met bas). À l'éveil, chaque lignée reçoit son mode d'après son corps et sa vie :
- **elles pondent** : les oiseaux, les serpents, les hexapodes, les poissons (ceux qui ne font que nager) et les filtreurs, les toutes petites bêtes (moins de 20 g), les bêtes à carapace ou à plaques ;
- **elles mettent bas** : les autres quadrupèdes et bipèdes.

Dans le monde d'Orvane, cela donne 42 lignées qui pondent et 70 qui mettent bas.

## Ce que le mode fait

| | pondre | mettre bas |
| --- | --- | --- |
| les petits | 40 % de plus | moins nombreux |
| le froid | sous 0,5 de température, des œufs que personne ne couve se perdent, jusqu'à 60 % | rien |
| les pillards | les mangeurs d'œufs pillent les nids, jusqu'à la moitié | rien |
| un nid gardé | les soins aux petits (le trait `soins-parentaux`), ou un oiseau qui couve, tiennent les œufs au chaud et perdent deux fois moins de nids | |

Tout se rapporte à ce qu'était chaque lignée à l'éveil (`plan.reproduction0`) : le jour de l'éveil, rien ne change. Ensuite, deux choses font bouger les naissances : une lignée qui change de mode, et les mangeurs d'œufs.

**Le froid favorise les vivipares.** Une lignée née d'une pondeuse, qui met bas, fait 1,68 fois les naissances de sa mère sur la banquise, et 1,31 fois dans la toundra. Dans la jungle, elle n'en fait que 0,71 fois : moins de petits, et aucun froid à fuir.

**Les mangeurs d'œufs.** `oophage` est un trait qui n'apparaît que dans un monde où l'on pond. Un omnivore ou un carnivore qui le porte fait jusqu'à 30 % de petits en plus là où l'on pond. Plus les mangeurs d'œufs sont nombreux, moins chacun y gagne : les œufs se partagent. Les nids, eux, se font piller : à moitié de leur effet le plus fort quand les mangeurs d'œufs pèsent 10 % de la biomasse des pondeurs du lieu.

**À la séparation.** Une lignée fille change parfois de mode. Une pondeuse devient vivipare 3 fois sur cent, 9 fois sur cent au froid (sous 0,3). Une vivipare se remet à pondre bien plus rarement (0,3 fois sur cent). Un oiseau pond toujours. Ces tirages ont leur propre hasard, tiré du nom de la lignée et du cycle : celui du cycle ne bouge pas.

## Ce qu'un jeu en fait

- **Le montrer.** `plan.reproduction` dit s'il montre des œufs et des nids, ou des petits. Un nid au sol, une couvée, un serpent qui garde ses œufs (`soins-parentaux`).
- **Prendre des œufs.** Un lot peut le dire : `"action": "prelevement", "age": "oeuf"`. Un œuf pris pèse 0,3, contre 1,2 pour un adulte et 0,8 pour un jeune (docs/4).
- **Les mangeurs d'œufs.** Leur conduite est `perception-proche`, avec un présage : « fouille le sol et les buissons, le nez au ras des nids ».

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "ponte": true }
```

Au cycle de nuit suivant, chaque lignée reçoit son mode, une fois pour toutes.

## Ce que le banc vérifie

`bancs/ponte.js`, en moins d'une minute, sur le monde d'Orvane :
- **Le jour un.** Un monde sans ponte tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Les modes.** 42 lignées pondent et 70 mettent bas ; les oiseaux, les serpents et les hexapodes pondent tous.
- **Le froid.**
  - Une lignée née d'une pondeuse, qui met bas : 1,68 fois ses naissances sur la banquise, 0,71 dans la jungle.
  - Une lignée qui pond est coupée en deux moitiés, dont l'une devient vivipare, pendant 30 cycles. Dans la toundra (0,12), la vivipare fait 65 % de la lignée ; au récif (0,85), 32 %.
- **Les mangeurs d'œufs.** Dans la forêt, la moitié d'un omnivore mange les œufs. Les pondeurs y perdent 41 % de leurs petits, ceux qui gardent leur nid 21 %. Les mangeurs d'œufs y sont nombreux, et chacun n'y gagne que 5 % de petits.
- **La séparation.** Une pondeuse devient vivipare 2,7 fois sur cent au chaud, 8,8 au froid. Une vivipare se remet à pondre 0,2 fois sur cent. Un oiseau, jamais.
- **Les joueurs.** Dix œufs pris pèsent 25 % de dix adultes.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil éveille la ponte une fois.

```
node bancs/ponte.js
```

## Ce qui reste ouvert

- **Les nids ont une place.** Une falaise, un terrier, un arbre creux pourraient abriter les nids des pillards.
- **Les œufs qu'on enterre, qu'on porte, qu'on pond dans l'eau.** Un crocodile, un hippocampe, une grenouille : des façons de garder ses œufs que seuls les soins aux petits résument aujourd'hui.
- **Les cycles de vie** : l'étape suivante. Ce qui sort d'un œuf n'est pas toujours ce qui l'a pondu.
