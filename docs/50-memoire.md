# 50. La mémoire : ce que les bêtes apprennent des joueurs

La sélection fait évoluer les corps. La mémoire fait évoluer les conduites : par population, le monde retient ce que ses bêtes ont vécu des joueurs, tous jeux confondus, et en tire quelques dispositions que chaque jeu rend à sa façon. Une meute dont les joueurs se laissent prendre devient traqueuse dans tous les jeux ; un troupeau qu'on nourrit vient quémander.

La méfiance et l'habituation (docs/12) en étaient les deux premières dispositions. La mémoire en ajoute trois, et un mot qui résume chaque population. C'est le moteur de comportement d'Orvane, dans sa première version.

`moteur/memoire.js`. Elle ne change rien à la simulation : avec les mêmes lots, éveillée ou non, les effectifs sont les mêmes, au caractère près. C'est le jeu qui la rend, et la boucle se ferme par lui. Un monde qui ne l'éveille pas (`profil.monde.memoire`) n'en voit rien.

## Ce que porte une population

```json
"populations": [ { "biome": "lande", "effectif": 412, "mefiance": 0.12, "habituation": 0.61,
                   "memoire": { "attrait": 0.43, "traque": 0.62, "neophobie": 0.18 }, "attitude": "traqueuse" } ]
```

| disposition | ce qu'elle dit | la nourrit | la défait | neutre |
| --- | --- | --- | --- | --- |
| `mefiance` (docs/12) | le joueur est un danger : elle fuit de loin | les bêtes prises, et maintenant les bêtes blessées (deux fois plus) | des contacts paisibles | 0 |
| `habituation` (docs/12) | le joueur ne fait rien : elle le laisse approcher | les rencontres sans suite, l'aide | ce qui finit mal | 0 |
| `attrait` | le joueur et son camp valent de la nourriture | les nourrissages, les pillages | des visites sans gain ; le mal subi, trois fois plus vite | 0 |
| `traque` | le joueur lui-même est une proie | les joueurs tombés, rapportés aux assauts | le mal subi, les assauts vains, les rencontres sans assaut | 0 |
| `neophobie` | la peur des choses des joueurs : le feu, la lumière, les pièges | le mal fait par un dispositif | ce qui l'arrête sans jamais faire mal ; ce qu'elle pille | 0,5 |

Une disposition absente vaut sa valeur neutre (`catalogue.memoire.dispositions.<id>.neutre`). Une disposition revenue à moins de 0,005 de sa valeur neutre n'est plus publiée : l'oubli a une fin. La néophobie a deux versants : au-dessus de 0,5, le feu tient mieux et les pièges ne prennent plus ; en dessous, la bête s'y est accoutumée.

Nourrir un loup ne fait jamais un traqueur : seuls des joueurs réellement tombés le font. L'attrait y mène seulement plus vite.

### L'attitude

Un mot par population, pour un jeu qui ne veut pas lire cinq nombres. Le premier cas vrai l'emporte :

| condition | `attitude` |
| --- | --- |
| traque ≥ 0,4 et méfiance < 0,4 | `traqueuse` |
| traque ou attrait ≥ 0,4, et méfiance ≥ 0,4 | `rodeuse` |
| attrait ≥ 0,4 | `quemandeuse` |
| méfiance ≥ 0,5 | `defensive` si elle pèse une fois et demie un joueur, sinon `fuyante` |
| habituation ≥ 0,5 | `familiere` |
| sinon | absente |

Quand une population devient traqueuse, rôdeuse ou quémandeuse, le journal le note (événement `memoire`) ; de même quand sa néophobie passe sous 0,25 ou au-dessus de 0,75. Les machines n'ont pas de mémoire : elles ont leur Mère (docs/16).

## Ce que les jeux racontent

Comme toujours, des comptes bruts, jamais des conclusions (docs/4). Cinq actions s'ajoutent aux quinze du lot. Aucune ne retire une bête du monde.

| action | quand | compter |
| --- | --- | --- |
| `blessure` | une bête est frappée par un joueur et survit | une fois par bête |
| `effarouchement` | une bête est arrêtée sans mal par un dissuasif : un feu, une lumière, un bruit | une fois par bête et par nuit |
| `pillage` | une bête s'est servie chez le joueur : des vivres, des cultures, un appât, une carcasse | à chaque fois |
| `attaque` | une bête a porté un assaut sur un joueur, qu'il touche ou non | une fois par assaut, pas par morsure |
| `joueur_tombe` | un joueur est mort, ou hors de combat, de son fait | à chaque fois |

Les quinze actions d'avant comptent aussi : une rencontre sans suite éteint l'attrait, un nourrissage le nourrit, un prélèvement défait la traque.

**Le moyen.** Un événement qui porte une lignée peut dire comment (`moyen`, facultatif) : de la main du joueur (`melee`, `distance`) ou par un dispositif (`piege`, `feu`, `lumiere`, `bruit`). Sur un prélèvement, une capture ou une blessure, un dispositif nourrit la néophobie. Sur un effarouchement, il dit ce qui a arrêté la bête. Le tampon ignore un moyen qu'il ne connaît pas et garde l'événement ; le vérificateur, lui, le signale.

```json
{ "taxon": "tiskata", "biome": "foret", "action": "effarouchement", "moyen": "feu", "n": 6 }
```

### N'envoyer qu'à un monde qui l'annonce

Le serveur refuse un lot entier dès qu'il contient une action qu'il ne connaît pas, et un kit redépose le même lot tant qu'il n'est pas accepté. Un jeu ne compte donc les cinq actions nouvelles que si l'instantané qu'il a lu porte `monde.memoire`. Le kit Godot le fait de lui-même (`memoire_eveillee()`) ; le champ `moyen`, lui, passe toujours.

Ce qui se rapporte : les bêtes tirées d'une lignée, comme en docs/4. Une créature propre au jeu (un boss, un monstre) ne compte pas.

## Ce que le tampon retient

Dans un monde éveillé, le tampon joint aux pressions de chaque population `vecu` : ce qu'elle a vécu des joueurs ce cycle. Il le tient à part de tout le reste : les retraits, le contact de la méfiance et la part de chacun sont ceux d'un monde sans mémoire qui recevrait les mêmes lots.

Rien n'y est retiré du monde ; ses protections portent donc sur les contacts.

- **Par compte** : au plus 2 joueurs tombés et 5 pillages par population et par cycle. Puis toute son activité est ramenée à une activité normale (`exposition_ref` contacts, 60 si le profil ne le dit pas), ses proportions gardées. Un compte qui ne déclare que 9 000 assauts, sans une rencontre, ne pèse pas plus qu'un autre.
- **La part d'un jeu** (`part_max_jeu`), avec un plancher de 3 000 contacts, soit cinquante comptes actifs : au-delà, un jeu ne pèse pas plus que la moitié de ce qu'une population a vécu. En deçà, rien n'est raboté : un petit jeu, ou un jeu fantôme de deux faux comptes, ne fait pas baisser la voix des autres.

Il n'y a pas de part par compte, comme pour les retraits : entre peu de joueurs, elle rabotait des comptes égaux et grossissait d'autant un compte léger.

Dans un monde sans mémoire, le tampon laisse les cinq actions nouvelles : les mêmes pressions que si les jeux ne les envoyaient pas.

## Comment une population apprend

À chaque cycle, chaque disposition retombe un peu, puis va vers ce que le cycle lui montre, d'autant plus vite que les contacts sont nombreux. Rien ne bascule en une nuit : une population ne bouge pas de plus de 0,35 par cycle, ses migrants compris.

- **L'attrait** retombe de moitié en 10 cycles. Il va vers la part des contacts qui nourrissent. Un omnivore ou un charognard l'apprend plus haut ; un mangeur de chair affamé aussi.
- **La traque** retombe de moitié en 10 cycles. Elle va vers la part des assauts où un joueur tombe. Ce que la population subit pèse trois assauts vains, et dix rencontres sans assaut en pèsent un : deux joueurs tombés ne font pas une traqueuse parmi cent passants.
- **Le corps borne la traque**, de 0 à 1 : 0 pour qui ne mange pas de chair ; 0,6 pour un mangeur de chair dont un joueur n'est pas la proie (trop gros pour un renard, trop petit pour un géant) ; jusqu'à 1 pour celui, seul ou en meute, dont il est la proie idéale. Il borne aussi ce qu'une lignée hérite à sa séparation.
- **La néophobie** revient vers 0,5 de moitié en 20 cycles. Le mal fait par un dispositif la monte. Ce qui arrête sans mal l'use, à proportion de sa part dans ce que la population vit des joueurs, **sauf si les joueurs font du mal par ailleurs** : un feu que des joueurs défendent reste un feu qu'on craint.
- **L'audace** (docs/8) reste le seul étage hérité. Une population audacieuse apprend la peur moins vite, et le reste plus vite.

Vingt cycles au même régime, par cycle :

| population | ce que font les joueurs | méfiance | attrait | traque | néophobie | attitude |
| --- | --- | --- | --- | --- | --- | --- |
| cerf | 60 rencontres | 0 | 0 | 0 | 0,50 | `familiere` |
| cerf | 30 rencontres, 6 prises | 0,62 | 0 | 0 | 0,50 | `fuyante` |
| cerf | 60 rencontres, 20 nourrissages | 0 | 0,56 | 0 | 0,50 | `quemandeuse` |
| cerf | 30 rencontres, 3 prises, 6 blessures | 0,85 | 0 | 0 | 0,50 | `fuyante` |
| cerf | 40 rencontres, 3 prises au piège | 0,34 | 0 | 0 | 0,94 | — |
| cerf | 60 rencontres, 10 pillages, 20 effarouchements | 0 | 0,42 | 0 | 0,08 | `quemandeuse` |
| loup | 40 rencontres, 30 fois tenu par le feu | 0 | 0 | 0 | 0,14 | `familiere` |
| loup | le même feu, 2 prises et 2 blessures | 0,54 | 0 | 0 | 0,47 | `fuyante` |
| loup | 30 rencontres, 8 assauts, 6 joueurs tombés, 4 pillages | 0 | 0,43 | 0,79 | 0,34 | `traqueuse` |
| loup | 40 rencontres, 5 prises, 4 blessures, 5 assauts, 1 joueur tombé | 0,76 | 0 | 0,07 | 0,50 | `fuyante` |
| loup | 30 rencontres, 8 pillages, 3 blessures | 0,62 | 0,49 | 0 | 0,49 | `rodeuse` |
| loup | 40 rencontres, 15 nourrissages | 0 | 0,59 | **0** | 0,50 | `quemandeuse` |
| renard | comme le loup traqueur | 0 | 0,43 | 0,47 | 0,34 | `traqueuse` |
| bison | 30 rencontres, 6 blessures, 2 joueurs tombés | 0,81 | 0 | **0** | 0,50 | `defensive` |

Les deux premières lignes sont celles de docs/12 : sans action nouvelle, la méfiance et l'habituation ne changent pas.

**La vitesse.** La meute traqueuse du tableau vaut 0,31 après une nuit, 0,50 après deux, 0,61 après trois.

**L'oubli.** Les joueurs partis, elle vaut 0,56 après 5 cycles, 0,28 après 15, 0,10 après 30, puis plus rien.

**La riposte.** Des traqueuses qu'on se met à chasser sont rôdeuses au premier cycle, fuyantes au deuxième.

## Ce qui voyage

- **Avec les migrants** : ils emportent la moitié de ce qu'a appris leur population, et le mêlent à la mémoire du lieu, à proportion de leur nombre. Cent traqueuses (0,8) parmi trois cents naïves font 0,1. Des naïves diluent la mémoire du lieu. L'ordre des arrivées d'une nuit ne compte pas.
- **Avec les bêtes que les joueurs déplacent**, de la même façon.
- **Une lignée qui se sépare** emporte la mémoire de sa population.
- **Ne voyage pas** : d'une lignée à l'autre, avec les hivernants (ils rentrent), avec les bêtes d'élevage (elles n'ont rien vécu).

**La mémoire se tient par biome.** Dans un monde par parcelles (docs/15), ce que les joueurs font dans un biome, toutes ses parcelles le vivent, comme la méfiance. La parcelle que dit un lot n'y change encore rien. Sur le monde d'Orvane, quatre nuits de joueurs tombés dans la prairie donnent 0,28 à 0,33 de traque dans ses cinq parcelles, et au plus 0,013 dans les autres biomes de la même lignée.

Vue par biome, la population vaut la moyenne de ses parcelles, une parcelle qui n'a rien appris comptant pour neutre. Dans un monde éveillé, la méfiance et l'habituation du biome sont pesées de la même façon, pour que le mot publié et les nombres disent la même chose.

## Côté jeu

Le catalogue dit ce que le monde publie (`catalogue.memoire` : les dispositions, leur valeur neutre, les attitudes). Chaque jeu choisit ce qu'il rend, et le borne : la mémoire est écrite par les joueurs de tous les jeux, et un jeu reste jouable quand une population est très hostile ou très craintive.

Le kit Godot donne tout d'un appel :

```gdscript
var d := Orvane.dispositions("tiskata", "foret")
# { "mefiance": 0.12, "habituation": 0.61, "attrait": 0.0, "traque": 0.62, "neophobie": 0.18, "attitude": "traqueuse" }
Orvane.compter("tiskata", "foret", "effarouchement", 1.0, "", "", "", "feu")
```

Lisière (`jeux/lisiere/`, et son dépôt) est le premier jeu à s'en servir, dans les deux sens. Il raconte les bêtes blessées, celles que le feu ou la torche ont tenues, les assauts et les veilleuses tombées. Et ses bêtes se conduisent d'après la mémoire : une population méfiante fuit de plus loin, une traqueuse suit la veilleuse et revient après un coup, une population accoutumée au feu se laisse moins tenir par la torche. Le feu vivant reste une loi, quelle que soit la mémoire.

## L'abus

Un groupe pourrait vouloir rendre une espèce hostile partout. Les comptes et les jeux s'inscrivent librement : rien ne remplace une identité. Un faux compte vaut donc, au plus, un vrai joueur malchanceux au possible. Ce qui tient, et ce qui ne tient pas :

- **Un compte seul ne gagne pas.** Dix joueurs qui ne font que passer, et un compte qui déclare 500 joueurs tombés par nuit : après vingt cycles, la traque est à 0,18. Un seul compte à son feu soixante fois par nuit laisse la néophobie à 0,34 après cinq nuits ; elle continue de baisser s'il ne s'arrête pas.
- **Une minorité décidée gagne une population paisible.** Face à ces dix passants, il faut quatre comptes qui déclarent chaque nuit le plus de joueurs tombés possible pour faire une traqueuse.
- **Elle ne gagne pas des joueurs qui se défendent.** Dix comptes qui blessent et prennent des bêtes, plus cinq faux comptes : la traque reste à 0,17, la population reste fuyante.
- **Ce qui borne toujours** : la mémoire ne retire pas une bête, et ne change pas la chasse des autres ; elle ne bouge pas de plus de 0,35 par nuit ; elle reste dans son biome ; elle retombe quand les joueurs s'en vont ; chaque jeu borne ce qu'il rend.

À savoir : le `contact` de docs/12 (la méfiance d'avant) n'a pas ces plafonds. Il n'est ramené à une activité normale que par les rencontres, et il n'a pas de part par jeu.

## L'éveiller

```json
"monde": { "memoire": true, "regles": { "memoire": { "traque": { "demi_vie": 20 } } } }
```

Le cycle de nuit l'éveille une fois (`monde.memoire: { depuis }`). Ses règles sont celles de `moteur/memoire.js` (`REGLES`) ; un monde règle les siennes dans `regles.memoire`. Seules les règles que la mémoire connaît, et de la bonne forme, sont prises : le reste est ignoré.

**L'ordre compte.** D'abord le serveur (`hebergement/supabase.sql` : la liste des actions de `orvane_deposer`), puis le profil. Un monde qui annoncerait la mémoire avant que son serveur accepte les actions nouvelles ferait refuser les lots des jeux.

## Le simulateur

[Le simulateur de joueurs](https://stonevalleyoff-ai.github.io/orvane/simulateur/) (`simulateur/`) fait jouer des joueurs fictifs face aux bêtes du monde publié. On choisit un lieu, jusqu'à quatre bêtes, et combien de joueurs de chaque sorte jouent chaque nuit : passants, terrés derrière leur feu, chasseurs, nourrisseurs, piégeurs, campeurs pillés, faux comptes. On fait passer les nuits, et on lit ce que chaque population apprend, son attitude, le journal, et ce que Lisière en ferait.

Le calcul est celui du monde : les lots passent par `Tampon.agreger`, la méfiance par `Orvane.apprendre`, la mémoire par `moteur/memoire.js`, dans l'ordre de la nuit (`simulateur/coeur.js`). Rien n'est envoyé.

Ce qu'il ne fait pas : l'écosystème ne tourne pas. Les effectifs ne bougent pas et aucun migrant n'apporte sa mémoire. Sur le monde d'essai, dix nuits de cinq compositions de joueurs donnent les mêmes attitudes que la vraie nuit, à 0,005 près sur chaque disposition (`bancs/simulateur.js`).

Son premier essai a montré qu'un faux compte inscrit sous un jeu à lui faisait raboter le jeu des autres : le plancher de la part d'un jeu est passé de 200 à 3 000 contacts.

## Ce que le banc vérifie

`bancs/memoire.js`, en une minute :
1. un monde sans mémoire tourne exactement comme le moteur sans ce fichier ; le jour de l'éveil, rien ne bouge ; éveillée, elle ne change ni un effectif ni la chasse des autres ;
2. les équilibres du tableau, le corps, l'oubli et sa fin, la riposte, le pas, l'audace, les règles d'un monde, une bascule pile sur un seuil ;
3. le tampon : ce qu'il compte, ses plafonds par compte et par jeu, ce qu'il laisse dans un monde sans mémoire ;
4. l'abus : un compte seul, combien il en faut, des joueurs qui se défendent, deux cents faux comptes en une nuit ;
5. les migrants et l'ordre de leurs arrivées, les bêtes déplacées, la séparation ; la nuit d'un monde par parcelles par le chemin du cycle hébergé, et la vue par biome ;
6. deux styles de jeu, deux faunes : chez ceux qui se terrent derrière leur feu, des traqueuses qui ne craignent plus le feu ; chez ceux qui chassent, des fuyantes qui le craignent encore ;
7. le schéma, les listes d'actions (le schéma, le tampon, le serveur, le vérificateur, les kits), le cycle de nuit.

```
node bancs/memoire.js
node outils/vitesse.js --contre origin/main --cycles 3
```

La seconde commande compare le moteur à celui de `main` sur le monde d'Orvane : le banc, lui, ne compare le moteur qu'à lui-même. À lancer après tout changement du moteur.

## Ce qui vient ensuite

- **La tradition** : une part de la mémoire transmise par imitation, qui survit au départ des joueurs sur des dizaines de cycles (comme les savoirs, docs/34).
- **La mémoire par parcelle** : poser ce que les joueurs font là où le lot le dit, pour un jeu au monde ouvert.
- **Les machines** : la Mère conçoit déjà d'après ce qui tue les siennes ; avec le `moyen`, elle saura contre quoi.
- **Ce que chaque jeu rend** : une exposition de la mémoire dans le profil (`exposition.memoire`), comme pour la méfiance.
- **Le moment** : des populations chassées le jour qui deviennent nocturnes.
- **Le plafond du contact** de la méfiance, un correctif à part : il change la méfiance des mondes qui reçoivent des lots.
- **La chronique et le directeur** (docs/37, 40) : faire d'une bascule un moment à mettre en scène.
