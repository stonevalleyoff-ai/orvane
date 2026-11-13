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
| `neophobie` | la peur des choses des joueurs : le feu, la lumière, les pièges | le mal fait par un dispositif, selon sa part dans ce qu'elle vit des joueurs | ce qui l'arrête sans jamais faire mal ; ce qu'elle pille | 0,5 |

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

Rien n'y est retiré du monde ; sa protection porte donc sur les contacts, compte par compte.

- **Par compte** : au plus 2 joueurs tombés, 5 pillages et 3 bêtes blessées ou prises par un dispositif, par population et par cycle. Au-delà de trois, ces bêtes restent des prises et des blessures : le dispositif n'en marque pas davantage. Puis toute son activité est ramenée à une activité normale (`exposition_ref` contacts, 60 si le profil ne le dit pas), ses proportions gardées. Un compte qui ne déclare que 9 000 assauts, sans une rencontre, ne pèse pas plus qu'un autre.

C'est la seule. Il n'y a **ni part par compte, ni part par jeu**. Pour les retraits, rogner un grand jeu ne fait que retirer moins de bêtes. Ici, ce qu'une population apprend dépend de proportions : la part des contacts qui nourrissent, la part des assauts où un joueur tombe. Rogner les uns y grossit d'autant les autres.

- Une part par compte, entre peu de joueurs, rabotait des comptes égaux et grossissait d'autant un compte léger.
- Une part par jeu ramenait cent passants au poids de trois comptes, dès que ceux-ci s'inscrivaient sous un jeu à eux (« L'abus », plus bas).

Un compte pèse donc le même poids sous n'importe quel jeu, et une population apprend de tous ses joueurs, à proportion de leur nombre. La part d'un jeu (`part_max_jeu`) reste aux retraits.

Le `contact` de la méfiance (docs/12) a la même protection, dans tous les mondes : l'activité d'un compte mesurée sur tous ses contacts, et rien d'autre.

Dans un monde sans mémoire, le tampon laisse les cinq actions nouvelles : les mêmes pressions que si les jeux ne les envoyaient pas.

## Comment une population apprend

À chaque cycle, chaque disposition retombe un peu, puis va vers ce que le cycle lui montre, d'autant plus vite que les contacts sont nombreux. Rien ne bascule en une nuit : une population ne bouge pas de plus de 0,35 par cycle, ses migrants compris.

- **L'attrait** retombe de moitié en 10 cycles. Il va vers la part des contacts qui nourrissent. Un omnivore ou un charognard l'apprend plus haut ; un mangeur de chair affamé aussi.
- **La traque** retombe de moitié en 10 cycles. Elle va vers la part des assauts où un joueur tombe. Ce que la population subit pèse trois assauts vains, et dix rencontres sans assaut en pèsent un : deux joueurs tombés ne font pas une traqueuse parmi cent passants.
- **Le corps borne la traque**, de 0 à 1 : 0 pour qui ne mange pas de chair ; 0,6 pour un mangeur de chair dont un joueur n'est pas la proie (trop gros pour un renard, trop petit pour un géant) ; jusqu'à 1 pour celui, seul ou en meute, dont il est la proie idéale. Il borne aussi ce qu'une lignée hérite à sa séparation.
- **La néophobie** revient vers 0,5 de moitié en 20 cycles. Le mal fait par un dispositif la monte, vers ce que dit sa part dans ce que la population vit des joueurs : un contact sur cent la mène vers 0,73, un sur vingt vers 0,98. Trois prises au piège par nuit font 0,94 parmi 30 rencontres, 0,69 parmi 330, 0,53 parmi 3 030. Ce qui arrête sans mal l'use, à proportion de sa part aussi, **sauf si les joueurs font du mal par ailleurs** : un feu que des joueurs défendent reste un feu qu'on craint.
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

Un groupe pourrait vouloir rendre une espèce hostile partout. Les comptes et les jeux s'inscrivent librement : rien ne remplace une identité. Un faux compte vaut donc, au plus, un vrai joueur malchanceux au possible, sous quelque jeu qu'il s'inscrive. Ce qui tient, et ce qui ne tient pas :

- **Un compte seul ne gagne pas.** Dix joueurs qui ne font que passer, et un compte qui déclare 500 joueurs tombés par nuit : après vingt cycles, la traque est à 0,18. Un seul compte à son feu soixante fois par nuit laisse la néophobie à 0,34 après cinq nuits ; elle continue de baisser s'il ne s'arrête pas. Un compte qui déclare 60 bêtes blessées au piège par nuit la monte à 0,55 après une nuit et 0,70 après vingt, sous le seuil de 0,75 ; face à cent passants, 0,53.
- **Une minorité décidée gagne une population paisible, à proportion de ceux qui passent.** Face à dix passants, il faut quatre comptes qui déclarent chaque nuit le plus de joueurs tombés possible pour faire une traqueuse. Face à cent, trente-deux : un faux compte pour trois passants. Pour une population qui craint les pièges (néophobie 0,75), deux comptes face à dix passants, douze face à cent.
- **S'inscrire sous un jeu à soi n'y change rien.** Le monde est le même, au caractère près, que si ces comptes étaient du jeu des passants.
- **Elle ne fait pas une traqueuse de bêtes dont les joueurs se défendent.** Dix comptes qui blessent et prennent des bêtes, plus cinq faux comptes : la traque reste à 0,17, la population reste fuyante. À huit faux comptes, elle est rôdeuse : ce qu'ils déclarent piller l'attire. La traque passe 0,4 à seize, et vaut 0,69 à cent. La population se méfie toujours (0,64) : elle ne devient pas traqueuse.
- **Un grand jeu fait la mémoire d'une population qu'un petit jeu montre aussi.** Mille joueurs d'un jeu qui se laissent prendre font une traqueuse (traque 0,41) de la population que cinq joueurs d'un autre jeu défendent. C'est ce que veut dire un monde partagé, et chaque jeu borne ce qu'il rend. Mille faux comptes pèsent autant. Un jeu entier de faux comptes se suspend (`orvane_jeux.actif`, `hebergement/supabase.sql` : ses dépôts sont refusés, ses lots en attente écartés) ; des faux comptes glissés parmi les joueurs d'un vrai jeu, non.
- **Ce qui borne toujours** : la mémoire ne retire pas une bête, et ne change pas la chasse des autres ; elle ne bouge pas de plus de 0,35 par nuit ; elle reste dans son biome ; elle retombe quand les joueurs s'en vont ; chaque jeu borne ce qu'il rend.

### La part d'un jeu : mesurée dans les deux sens, puis retirée

À sa sortie, la mémoire avait une part par jeu (`part_max_jeu`, 0,5 sur le monde d'Orvane), comme les retraits : aucun jeu ne pesait plus que les autres réunis, et un jeu gardait toujours 200 contacts. Elle protégeait un petit jeu d'un grand. Elle faisait aussi d'un petit jeu hostile l'égal d'un grand jeu paisible, et un jeu s'inscrit aussi librement qu'un compte.

`node outils/parts.js` mesure les deux sens, sous quatre règles : sur le monde `sv-1`, la population `traqueur` de la prairie, vingt nuits, par le tampon puis le moteur. Toutes gardent l'activité normale par compte.

| règle | ce qu'un jeu garde toujours |
| --- | --- |
| plancher 200 | 200 contacts : la règle d'avant |
| 60 × √comptes | l'activité normale d'autant de comptes que la racine de leur nombre |
| 30 × comptes | la moitié de l'activité normale de ses comptes |
| sans part | tout : il n'y a pas de part par jeu |

**Le sens qu'elle ouvrait : un petit jeu hostile face à un grand jeu paisible.** Des passants à 30 rencontres chacun ; des faux comptes qui déclarent chacun le plus de joueurs tombés possible. Combien il en faut pour faire une traqueuse :

| passants | du jeu des passants | sous un jeu à eux : plancher 200 | 60 × √comptes | 30 × comptes | sans part |
| --- | --- | --- | --- | --- | --- |
| 10 | 4 | 3 | 3 | 4 | 4 |
| 100 | 32 | 3 | 7 | 32 | 32 |

Avec la règle d'avant, trois faux comptes inscrits sous un jeu à eux faisaient une traqueuse (traque 0,48) de la population de cent passants, comme de celle de dix : le nombre des vrais joueurs ne protégeait plus rien. Du jeu des passants, les mêmes trois comptes laissent la traque à 0,06. La méfiance s'ouvrait de la même façon (docs/12) : un seul compte hostile la portait à 0,74, face à dix passants comme face à cent.

**Le sens qu'elle protégeait : un grand jeu face à un petit jeu de vrais joueurs.** La traque après vingt nuits, et l'attitude :

| qui joue | plancher 200 | 60 × √comptes | 30 × comptes | sans part |
| --- | --- | --- | --- | --- |
| 100 faux comptes d'un jeu, dix joueurs d'un autre qui se défendent | 0,53 rôdeuse | 0,68 rôdeuse | 0,69 rôdeuse | 0,69 rôdeuse |
| 1 000 faux comptes, les mêmes dix | 0,53 rôdeuse | 0,73 rôdeuse | 0,74 rôdeuse | 0,74 rôdeuse |
| 100 vrais joueurs d'un jeu qui se laissent prendre, cinq d'un autre qui se défendent | 0,23 | 0,33 | 0,39 | 0,39 |
| 1 000 joueurs qui se laissent prendre, les mêmes cinq | 0,23 | 0,38 | 0,41 traqueuse | 0,41 traqueuse |
| 100 passants d'un jeu, cinq joueurs d'un autre qui se laissent prendre | 0,33 | 0,24 | 0,09 | 0,09 |
| 1 000 passants, les mêmes cinq | 0,33 | 0,12 | 0 | 0 |

Un joueur qui se défend : 20 rencontres, 2 bêtes blessées, 2 assauts par nuit. Un joueur qui se laisse prendre : 30 rencontres, 8 assauts, 2 fois tombé.

Ce que ces mesures disent :

- **Ce qu'elle protégeait.** Les joueurs d'un petit jeu, de ce que font les vrais joueurs d'un grand : face à mille joueurs qui se laissent prendre, elle tenait la traque à 0,23 pour cinq joueurs qui se défendent ; sans elle, 0,41, tout juste traqueuse. Contre des faux comptes, elle protégeait peu : 0,53 au lieu de 0,74, rôdeuse dans les deux cas. Ce qui empêche alors la traqueuse, c'est la méfiance que font ceux qui se défendent, pas la part. Pour la méfiance, dont la cible sature dès la moitié des contacts, presque rien (docs/12).
- **Ce qu'elle protégeait et ce qu'elle ouvrait sont une seule opération.** Protéger un petit jeu d'un grand, c'est ramener le grand à la taille du petit. Les deux dernières lignes sont la menace du premier tableau, vue de l'autre côté : cinq comptes d'un petit jeu y pèsent autant que mille passants. Rien ne distingue cinq vrais joueurs d'un petit jeu de cinq faux comptes inscrits sous un jeu à eux.
- **Un plancher qui suit le nombre de comptes ne fait que choisir entre les deux.** Avec 60 × √comptes, sept faux comptes suffisent encore face à cent passants, et le petit jeu n'est presque plus protégé. Avec 30 × comptes, c'est la règle sans part, à un facteur deux près pour la méfiance.
- **La règle retenue est la seule que le nom du jeu ne change pas** : chaque compte pèse ce que la population a vécu de lui, au plus une activité normale. Tricher coûte alors des comptes à proportion des vrais joueurs à contredire : un pour trois passants pour la traque, un pour sept pour la méfiance.

Entre trois comptes qui écrivent la mémoire de cent joueurs et mille joueurs qui écrivent celle de cinq, la règle choisit les mille : eux, au moins, la population les a vécus.

Ce changement **modifie la mémoire et la méfiance des mondes qui reçoivent des lots**, dans un cas : une population que plusieurs jeux montrent, quand l'un d'eux dépassait sa part et ses 200 contacts. Il n'est plus rogné. Ailleurs, le vécu et le contact sont les mêmes, au caractère près ; les retraits ne changent nulle part.

### La néophobie : au nombre, puis à proportion

À sa sortie, la néophobie montait avec le *nombre* de bêtes blessées ou prises par un dispositif, quoi que la population vive d'autre. C'était la seule disposition qui ne dépendait pas d'une proportion : le nombre des vrais joueurs n'y protégeait rien. Un compte qui déclare 60 bêtes blessées au piège par nuit, sans une rencontre, face à des passants à 30 rencontres chacun :

| règle | dix passants : 1, 2, 20 nuits | cent passants, 20 nuits | mille | comptes pour passer 0,75, face à dix et à cent |
| --- | --- | --- | --- | --- |
| au nombre : la règle d'avant | 0,85 · 1 · 1 | 1 | 1 | 1 et 1 |
| au nombre, 3 par compte | 0,61 · 0,69 · 0,94 | 0,94 | 0,94 | 1 et 1 |
| à proportion, sans plafond par compte | 0,85 · 1 · 1 | 0,85 | 0,56 | 1 et 1 |
| à proportion, 3 par compte : la règle retenue | 0,55 · 0,58 · 0,70 | 0,53 | 0,50 | 2 et 12 |

- **Un plafond par compte ne suffit pas** : il ralentit, et le compte finit seul à 0,94, face à dix passants comme face à mille.
- **La proportion ne suffit pas** : un compte tout entier à ses pièges vaut à lui seul 2 % des contacts de cent passants, et la néophobie est très sensible au mal (trois prises au piège parmi 30 rencontres font 0,94).
- **Il faut les deux**, comme pour la traque, qui a son plafond par compte (2 joueurs tombés) et sa proportion.

`bancs/memoire.js` (section 4) vérifie la règle retenue, celle d'avant et les deux demi-mesures.

Ce changement **modifie la néophobie des mondes qui reçoivent des lots**, dans deux cas :

- le mal fait par un dispositif est une petite part de ce que la population vit des joueurs : elle monte moins. Un piégeur seul (3 prises au piège, 30 rencontres) parmi dix passants : 0,68 au lieu de 0,94 ; parmi cent, 0,53 ;
- un compte déclare plus de 3 bêtes d'une population blessées ou prises par un dispositif en une nuit : le dispositif n'en marque que 3.

Les équilibres du tableau plus haut ne bougent pas (le cerf pris au piège reste à 0,94). Sans mal fait par un dispositif, le monde est le même, au caractère près ; avec, seule la néophobie change. Un monde peut régler la sensibilité (`regles.memoire.neophobie.sensibilite`, 60).

## L'éveiller

```json
"monde": { "memoire": true, "regles": { "memoire": { "traque": { "demi_vie": 20 } } } }
```

Le cycle de nuit l'éveille une fois (`monde.memoire: { depuis }`). Ses règles sont celles de `moteur/memoire.js` (`REGLES`) ; un monde règle les siennes dans `regles.memoire`. Seules les règles que la mémoire connaît, et de la bonne forme, sont prises : le reste est ignoré.

**L'ordre compte.** D'abord le serveur (`hebergement/supabase.sql` : la liste des actions de `orvane_deposer`), puis le profil. Un monde qui annoncerait la mémoire avant que son serveur accepte les actions nouvelles ferait refuser les lots des jeux.

## Ce que le banc vérifie

`bancs/memoire.js`, en une minute et demie :
1. un monde sans mémoire tourne exactement comme le moteur sans ce fichier ; le jour de l'éveil, rien ne bouge ; éveillée, elle ne change ni un effectif ni la chasse des autres ;
2. les équilibres du tableau, la néophobie qui suit une part, le corps, l'oubli et sa fin, la riposte, le pas, l'audace, les règles d'un monde, une bascule pile sur un seuil ;
3. le tampon : ce qu'il compte, ses plafonds par compte (les joueurs tombés, les pillages, le mal fait par un dispositif, l'activité), le nom du jeu qui n'y change rien, ce qu'il laisse dans un monde sans mémoire ; le contact de la méfiance, plafonné de même ;
4. l'abus : un compte seul (la traque, le feu, les pièges), combien il en faut face à dix passants et face à cent, sous le jeu des passants ou sous un jeu à eux ; la néophobie d'avant et les deux demi-mesures qui ne suffisaient pas ; des joueurs qui se défendent, face à cinq faux comptes et face à cent ; deux cents faux comptes en une nuit ; un compte qui déclare 9 000 prélèvements, des comptes hostiles face à cent passants ;
5. les migrants et l'ordre de leurs arrivées, les bêtes déplacées, la séparation ; la nuit d'un monde par parcelles par le chemin du cycle hébergé, et la vue par biome ;
6. deux styles de jeu, deux faunes : chez ceux qui se terrent derrière leur feu, des traqueuses qui ne craignent plus le feu ; chez ceux qui chassent, des fuyantes qui le craignent encore ;
7. le schéma, les listes d'actions (le schéma, le tampon, le serveur, le vérificateur, les kits), le cycle de nuit.

```
node bancs/memoire.js
node outils/vitesse.js --contre origin/main --cycles 3
node outils/parts.js
```

La deuxième commande compare le moteur à celui de `main` sur le monde d'Orvane : le banc, lui, ne compare le moteur qu'à lui-même. À lancer après tout changement du moteur. La troisième refait les mesures de « L'abus » sous chaque règle, et dit laquelle le tampon applique : à lancer avant de toucher à ce que le tampon retient des joueurs.

## Ce qui vient ensuite

- **La tradition** : une part de la mémoire transmise par imitation, qui survit au départ des joueurs sur des dizaines de cycles (comme les savoirs, docs/34).
- **La mémoire par parcelle** : poser ce que les joueurs font là où le lot le dit, pour un jeu au monde ouvert.
- **Les machines** : la Mère conçoit déjà d'après ce qui tue les siennes ; avec le `moyen`, elle saura contre quoi.
- **Ce que chaque jeu rend** : une exposition de la mémoire dans le profil (`exposition.memoire`), comme pour la méfiance.
- **Le moment** : des populations chassées le jour qui deviennent nocturnes.
- **La chronique et le directeur** (docs/37, 40) : faire d'une bascule un moment à mettre en scène.
