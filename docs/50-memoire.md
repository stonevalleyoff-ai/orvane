# 50. La mémoire : ce que les bêtes apprennent des joueurs

La sélection fait évoluer les corps. La mémoire fait évoluer les conduites : par population, le monde retient ce que ses bêtes ont vécu des joueurs, tous jeux confondus, et en tire quelques dispositions que chaque jeu rend à sa façon. Une meute dont les joueurs se laissent prendre devient traqueuse dans tous les jeux ; un troupeau qu'on nourrit vient quémander.

Deux lignées ne tirent pas la même leçon des mêmes joueurs. Chacune a un **caractère**, lu sur son corps et son tempérament : chassée de près, une craintive fuit de plus loin, une combative fait front ; nourrie, une opportuniste quémande, une craintive garde ses distances. Et une bête n'est pas sa population : dans un troupeau qui fuit, les plus hardies font front quand même.

La méfiance et l'habituation (docs/12) en étaient les deux premières dispositions. La mémoire en ajoute quatre, et un mot qui résume chaque population. C'est le moteur de comportement d'Orvane.

`moteur/memoire.js`. Elle ne change rien à la simulation : avec les mêmes lots, éveillée ou non, les effectifs sont les mêmes, au caractère près. C'est le jeu qui la rend, et la boucle se ferme par lui. Un monde qui ne l'éveille pas (`profil.monde.memoire`) n'en voit rien.

## Ce que porte une population

```json
"taxons": [ { "id": "tiskata", "caractere": { "hardiesse": 0.7, "combativite": 0.86, "opportunisme": 0.57 },
  "populations": [ { "biome": "lande", "effectif": 412, "mefiance": 0.46, "habituation": 0.03,
                     "memoire": { "agressivite": 0.47, "neophobie": 0.18 }, "attitude": "agressive" } ] } ]
```

| disposition | ce qu'elle dit | la nourrit | la défait | neutre |
| --- | --- | --- | --- | --- |
| `mefiance` (docs/12) | le joueur est un danger : elle fuit de loin | les bêtes prises, et les bêtes blessées (deux fois plus) | des contacts paisibles | 0 |
| `habituation` (docs/12) | le joueur ne fait rien : elle le laisse approcher | les rencontres sans suite, l'aide | ce qui finit mal | 0 |
| `attrait` | le joueur et son camp valent de la nourriture | les nourrissages, les pillages | des visites sans gain ; le mal subi, trois fois plus vite | 0 |
| `traque` | le joueur lui-même est une proie | les joueurs tombés, rapportés aux assauts | le mal subi, les assauts vains, les rencontres sans assaut | 0 |
| `neophobie` | la peur des choses des joueurs : le feu, la lumière, les pièges | le mal fait par un dispositif | ce qui l'arrête sans jamais faire mal ; ce qu'elle pille | 0,5 |
| `agressivite` | face au joueur, elle fait front au lieu de fuir | le mal qu'on lui fait de près ; les joueurs qu'elle fait tomber ; la nourriture qu'on ne lui donne plus | les rencontres sans suite ; le mal venu de loin ou d'un piège (et des bêtes prises au combat rabaissent ce qu'elle peut atteindre) | 0 |

Une disposition absente vaut sa valeur neutre (`catalogue.memoire.dispositions.<id>.neutre`). Une disposition revenue à moins de 0,005 de sa valeur neutre n'est plus publiée : l'oubli a une fin. La néophobie a deux versants : au-dessus de 0,5, le feu tient mieux et les pièges ne prennent plus ; en dessous, la bête s'y est accoutumée.

Nourrir un loup ne fait jamais un traqueur : seuls des joueurs réellement tombés le font. L'attrait y mène seulement plus vite.

### L'attitude

Un mot par population, pour un jeu qui ne veut pas lire six nombres. Le premier cas vrai l'emporte :

| condition | `attitude` | ce qu'elle fait |
| --- | --- | --- |
| traque ≥ 0,4 et méfiance < 0,4 | `traqueuse` | elle chasse le joueur |
| agressivité ≥ 0,4 et méfiance ≥ 0,5 | `defensive` | elle se méfie, et fait front quand même : elle tient sa place, charge si on insiste |
| agressivité ≥ 0,4 et attrait ≥ 0,4 | `exigeante` | elle attend sa nourriture, et s'en prend à qui ne donne rien |
| agressivité ≥ 0,4 | `agressive` | elle ne craint pas le joueur : elle charge qui l'approche |
| traque ou attrait ≥ 0,4, et méfiance ≥ 0,4 | `rodeuse` | attirée, mais méfiante : elle tourne, de loin |
| attrait ≥ 0,4 | `quemandeuse` | elle attend du joueur sa nourriture |
| méfiance ≥ 0,5 | `fuyante` | elle fuit de loin |
| habituation ≥ 0,5 | `familiere` | elle le laisse approcher |
| sinon | absente | |

Quand une population devient traqueuse, agressive, défensive, exigeante, rôdeuse ou quémandeuse, le journal le note (événement `memoire`) ; de même quand sa néophobie passe sous 0,25 ou au-dessus de 0,75. Une bête ne fait plus front par sa seule masse : c'est son agressivité qui le dit, et sa masse y entre par la combativité de sa lignée. Les machines n'ont pas de mémoire : elles ont leur Mère (docs/16).

## Le caractère

Ce qu'une lignée est avant d'avoir rien appris. Le monde le lit sur son plan et le publie (`taxons[].caractere`) : trois traits, de 0 à 1.

| trait | de… à… | ce qui le fait | ce qu'il change |
| --- | --- | --- | --- |
| `hardiesse` | craintive … hardie | son tempérament ; dans une population, déplacé par son audace (docs/8) | craintive, elle apprend la peur vite et fort, s'habitue peu, et ne devient jamais familière ni quémandeuse ; hardie, l'inverse |
| `combativite` | fuyarde … combative | sa hardiesse, son gabarit face à un joueur (meute comprise), ses armes et son armure, la chair qu'elle mange ; moins si elle vole | ce qu'elle fait du mal qu'on lui fait : apprendre à fuir, ou à faire front |
| `opportunisme` | difficile … opportuniste | sa hardiesse et son régime : qui mange de tout prend ce qu'on lui tend | ce que la nourriture des joueurs l'attache |

Les armes et l'armure sont les organes du corps (docs/14) : cornes, défenses, massue, aiguillon, pinces, épines, carapace, plaques. Le gabarit se mesure en échelle de masses, de cent grammes à un joueur.

Dans le monde d'Orvane (241 lignées animales), la combativité va de 0,09 au premier dixième à 0,62 au dernier : 45 lignées sont franchement combatives, 61 ne savent que fuir, et 56 sont trop craintives pour devenir un jour familières.

Le caractère entre partout où la population apprend :

- **La vitesse de la peur.** La méfiance et l'habituation (docs/12) se prennent, dans un monde éveillé, à l'audace de la population *plus* ce que le tempérament de sa lignée s'écarte du tempérament médian. Le même danger fait 0,70 de méfiance en une nuit chez un lièvre, 0,41 chez un loup.
- **Le plafond.** L'habituation et l'attrait d'une population ne dépassent pas 0,15 + 1,3 × sa hardiesse. Sous 0,27 de hardiesse, une lignée ne sera jamais familière : elle prend ce qu'on lui laisse, sans venir le demander. Une habituation qui dépasse ce plafond (le jour de l'éveil, une lignée fille plus craintive que sa mère) le rejoint sans saut, d'un pas par cycle au plus.
- **L'attrait** va plus haut chez une opportuniste (jusqu'à 1,3 fois ce que pèse un nourrissage) que chez une difficile (0,4 fois).
- **L'agressivité** ne monte qu'à la mesure de la combativité.

## L'agressivité

La mémoire d'avant n'avait qu'une réponse au danger : la fuite. Celle-ci en a deux, et c'est le caractère qui choisit.

À chaque cycle, l'agressivité va vers *la combativité de la lignée × ce que pèse la part de ses contacts qui tournent à l'affrontement*. Cette part pèse peu tant qu'elle est petite, puis vite : à 0,3, la moitié ; à 1, tout. Une poignée d'affrontements parmi des centaines de rencontres paisibles ne fait pas une agressive. Comptent pour un affrontement :

- **le mal qu'on lui fait de près** (`moyen` : `melee`, ou rien de dit) : une bête prise, une bête blessée deux fois plus. **Le mal venu de loin ou d'un piège ne compte pas**, il la défait : il n'offre rien à charger, il apprend à fuir. Chassé à l'épieu, un loup fait front ; chassé à l'arc, il fuit.
- **les joueurs qu'elle fait tomber** ; un assaut sans suite pèse dix fois moins.
- **la frustration** : chez une bête qui attend sa nourriture des joueurs, chaque rencontre où on ne lui donne rien, à la mesure du carré de son attrait. Un nourrissage, ou un pillage, contente quatre rencontres ; au-delà, un nourrissage en laisse au plus deux sur leur faim : on n'attend pas plus qu'on n'a reçu de la main, et ce qu'elle a pris seule, elle ne l'attend de personne. Nourrie par les uns, croisée par d'autres qui ne donnent rien, une combative devient exigeante. Le mal subi la fait taire : une bête qu'on frappe ne réclame plus.

Ce qui ne tourne pas à l'affrontement l'éteint : une rencontre sans suite surtout (elle pèse trois dixièmes d'un mal subi), un assaut qu'un feu arrête, un peu.

**Ce qui marche se renforce, ce qui coûte se défait.** Des combats qui finissent (un joueur tombé, une bête prise de près), la part où c'est le joueur qui tombe relève ce que la lignée a de combatif, jusqu'aux quatre cinquièmes du chemin vers 1 ; la part où c'est la bête qui est prise le rabaisse d'un quart. Un cerf qui charge et perd ses bêtes reste fuyard ; s'il fait tomber des joueurs, il devient défensif. Même un lièvre l'apprend.

**Qui rend les coups a moins peur.** Une population agressive ne change plus en méfiance qu'une part du danger qu'elle vit (jusqu'à la moitié en moins).

Elle retombe de moitié en 10 cycles sans joueurs ; des joueurs qui passent sans rien faire l'éteignent bien plus vite (0,55 → 0,04 en dix cycles, contre 0,28).

## L'individu

Les dispositions publiées sont celles d'une population. Une bête s'en écarte selon sa propre audace : plus hardie que les siennes, elle craint moins et ose plus. La règle tient en une ligne, et le monde en publie le pas (`catalogue.memoire.individu.ecart`, 0,7) :

> pour une bête dont l'audace s'écarte de *e* écarts-types de celle de sa population, chaque disposition est déplacée de 0,7 × *e*, en logit : vers le haut pour l'habituation, l'attrait, la traque et l'agressivité, vers le bas pour la méfiance et la néophobie.

Une disposition nulle le reste : rien d'appris, rien à déplacer. Le jeu tire *e* une fois par bête, d'une loi normale.

Dans un troupeau de cerfs qui fuit (méfiance 0,7, agressivité 0,3), une bête à +1,5 a 0,45 de méfiance et 0,55 d'agressivité : elle fait front. Une bête à −1,5 fuit de plus loin encore (0,87). Sur cent bêtes, 74 fuient et 26 font front.

```js
Memoire.individu(population, e, plan)   // → { mefiance, habituation, memoire, attitude } de cette bête
Memoire.partage(population, plan, v)    // → la part de chaque attitude parmi ses bêtes (v : la variance de son audace)
```

## Ce que les jeux racontent

Comme toujours, des comptes bruts, jamais des conclusions (docs/4). Cinq actions s'ajoutent aux quinze du lot. Aucune ne retire une bête du monde.

| action | quand | compter |
| --- | --- | --- |
| `blessure` | une bête est frappée par un joueur et survit | une fois par bête |
| `effarouchement` | une bête est arrêtée sans mal par un dissuasif : un feu, une lumière, un bruit | une fois par bête et par nuit |
| `pillage` | une bête s'est servie chez le joueur : des vivres, des cultures, un appât, une carcasse | à chaque fois |
| `attaque` | une bête a porté un assaut sur un joueur, qu'il touche ou non | une fois par assaut, pas par morsure |
| `joueur_tombe` | un joueur est mort, ou hors de combat, de son fait | à chaque fois |

Les quinze actions d'avant comptent aussi : une rencontre sans suite éteint l'attrait et l'agressivité, un nourrissage nourrit l'attrait, un prélèvement défait la traque.

**Le moyen.** Un événement qui porte une lignée peut dire comment (`moyen`, facultatif) : de la main du joueur (`melee`, `distance`) ou par un dispositif (`piege`, `feu`, `lumiere`, `bruit`). Sur un prélèvement, une capture ou une blessure, un dispositif nourrit la néophobie ; un dispositif ou `distance` disent aussi que la bête n'avait personne à charger. Sans moyen, le mal est compté de près. (Le tampon ne dit pas lesquelles des bêtes prises ou blessées l'ont été de loin : la même part vaut pour les unes et les autres.) Sur un effarouchement, il dit ce qui a arrêté la bête. Le tampon ignore un moyen qu'il ne connaît pas et garde l'événement ; le vérificateur, lui, le signale.

```json
{ "taxon": "tiskata", "biome": "foret", "action": "effarouchement", "moyen": "feu", "n": 6 }
```

### N'envoyer qu'à un monde qui l'annonce

Le serveur refuse un lot entier dès qu'il contient une action qu'il ne connaît pas, et un kit redépose le même lot tant qu'il n'est pas accepté. Un jeu ne compte donc les cinq actions nouvelles que si l'instantané qu'il a lu porte `monde.memoire`. Le kit Godot le fait de lui-même (`memoire_eveillee()`) ; le champ `moyen`, lui, passe toujours.

Ce qui se rapporte : les bêtes tirées d'une lignée, comme en docs/4. Une créature propre au jeu (un boss, un monstre) ne compte pas.

## Ce que le tampon retient

Dans un monde éveillé, le tampon joint aux pressions de chaque population `vecu` : ce qu'elle a vécu des joueurs ce cycle (rencontres, prises, blessures, dont celles d'un dispositif et celles faites à distance, effarouchements, nourrissages, pillages, assauts, joueurs tombés). Il le tient à part de tout le reste : les retraits, le contact de la méfiance et la part de chacun sont ceux d'un monde sans mémoire qui recevrait les mêmes lots.

Rien n'y est retiré du monde ; ses protections portent donc sur les contacts.

- **Par compte** : au plus 2 joueurs tombés, 5 pillages, 4 bêtes prises, 3 bêtes blessées et 12 nourrissages par population et par cycle (le mal plafonné garde la part qui venait d'un dispositif, ou de loin). Ces plafonds ne valent que pour la mémoire : les retraits gardent leurs règles. Puis toute son activité est ramenée à une activité normale (`exposition_ref` contacts, 60 si le profil ne le dit pas), ses proportions gardées. Un compte qui ne déclare que 9 000 assauts, sans une rencontre, ne pèse pas plus qu'un autre.
- **La part d'un jeu** (`part_max_jeu`), avec un plancher de 3 000 contacts, soit cinquante comptes actifs : au-delà, un jeu ne pèse pas plus que la moitié de ce qu'une population a vécu. En deçà, rien n'est raboté : un petit jeu, ou un jeu fantôme de deux faux comptes, ne fait pas baisser la voix des autres.

Il n'y a pas de part par compte, comme pour les retraits : entre peu de joueurs, elle rabotait des comptes égaux et grossissait d'autant un compte léger.

Dans un monde sans mémoire, le tampon laisse les cinq actions nouvelles : les mêmes pressions que si les jeux ne les envoyaient pas.

## Comment une population apprend

À chaque cycle, chaque disposition retombe un peu, puis va vers ce que le cycle lui montre, d'autant plus vite que les contacts sont nombreux. Rien ne bascule en une nuit : une population ne bouge pas de plus de 0,35 par cycle, ses migrants compris.

- **L'attrait** retombe de moitié en 10 cycles. Il va vers la part des contacts qui nourrissent, à la mesure de l'opportunisme de la lignée et sous le plafond de sa hardiesse. Un mangeur de chair affamé l'apprend plus haut.
- **La traque** retombe de moitié en 10 cycles. Elle va vers la part des assauts où un joueur tombe. Ce que la population subit pèse trois assauts vains, et dix rencontres sans assaut en pèsent un : deux joueurs tombés ne font pas une traqueuse parmi cent passants.
- **Le corps borne la traque**, de 0 à 1 : 0 pour qui ne mange pas de chair ; 0,6 pour un mangeur de chair dont un joueur n'est pas la proie (trop gros pour un renard, trop petit pour un géant) ; jusqu'à 1 pour celui, seul ou en meute, dont il est la proie idéale. Il borne aussi ce qu'une lignée hérite à sa séparation.
- **La néophobie** revient vers 0,5 de moitié en 20 cycles. Le mal fait par un dispositif la monte. Ce qui arrête sans mal l'use, à proportion de sa part dans ce que la population vit des joueurs, **sauf si les joueurs font du mal par ailleurs** : un feu que des joueurs défendent reste un feu qu'on craint.
- **L'agressivité** : plus haut.
- **L'audace** (docs/8) reste le seul étage hérité. Une population audacieuse apprend la peur moins vite, et le reste plus vite ; le tempérament de sa lignée s'y ajoute.

Six lignées pour le voir : un loup et un ours hardis et combatifs, un renard entre les deux, un bison posé et cornu, un cerf craintif, un lièvre qui ne sait que fuir.

| lignée | hardiesse | combativité | opportunisme |
| --- | --- | --- | --- |
| loup (40 kg, en meute) | 0,65 | 0,81 | 0,54 |
| ours (250 kg, omnivore) | 0,60 | 0,71 | 0,71 |
| renard (8 kg) | 0,55 | 0,63 | 0,48 |
| bison (600 kg, des cornes) | 0,50 | 0,87 | 0,40 |
| cerf (90 kg, en harde) | 0,25 | 0,37 | 0,25 |
| lièvre (3 kg) | 0,15 | 0,13 | 0,19 |

Vingt cycles au même régime, par cycle. Les mêmes joueurs, d'une ligne à l'autre :

| population | ce que font les joueurs | méfiance | habituation | attrait | traque | néophobie | agressivité | attitude |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| loup | 60 rencontres | 0 | 0,95 | 0 | 0 | 0,50 | 0 | `familiere` |
| cerf | 60 rencontres | 0 | 0,48 | 0 | 0 | 0,50 | 0 | — |
| lièvre | 60 rencontres | 0 | 0,35 | 0 | 0 | 0,50 | 0 | — |
| lièvre | 30 rencontres, 3 prises et 6 blessures, de près | 0,96 | 0 | 0 | 0 | 0,50 | 0,09 | `fuyante` |
| cerf | les mêmes | 0,92 | 0 | 0 | 0 | 0,50 | 0,25 | `fuyante` |
| bison | les mêmes | 0,74 | 0 | 0 | 0 | 0,50 | 0,59 | `defensive` |
| loup | les mêmes | 0,65 | 0 | 0 | 0 | 0,50 | 0,55 | `defensive` |
| cerf | 30 rencontres, 6 prises de près | 0,73 | 0 | 0 | 0 | 0,50 | 0,18 | `fuyante` |
| bison | les mêmes | 0,51 | 0,01 | 0 | 0 | 0,50 | 0,43 | `defensive` |
| loup | les mêmes | 0,42 | 0,02 | 0 | 0 | 0,50 | 0,40 | `agressive` |
| cerf | 3 prises et 6 blessures, de loin | 0,94 | 0 | 0 | 0 | 0,50 | **0** | `fuyante` |
| loup | les mêmes, de loin | 0,73 | 0 | 0 | 0 | 0,50 | **0** | `fuyante` |
| cerf | 40 rencontres, 3 prises au piège | 0,46 | 0,05 | 0 | 0 | 0,96 | 0 | — |
| loup | les mêmes | 0,24 | 0,21 | 0 | 0 | 0,91 | 0 | — |
| lièvre | 40 rencontres, 15 nourrissages | 0 | 0,35 | 0,14 | 0 | 0,50 | 0 | — |
| cerf | les mêmes | 0 | 0,48 | 0,21 | 0 | 0,50 | 0 | — |
| ours | les mêmes | 0 | 0,93 | 0,56 | 0 | 0,50 | 0 | `quemandeuse` |
| loup | les mêmes | 0 | 0,97 | 0,55 | **0** | 0,50 | 0 | `quemandeuse` |
| cerf | 90 rencontres, 15 nourrissages | 0 | 0,47 | 0,13 | 0 | 0,50 | 0,02 | — |
| loup | les mêmes | 0 | 0,98 | 0,35 | 0 | 0,50 | 0,46 | `agressive` |
| ours | 60 rencontres, 10 pillages, 20 effarouchements | 0 | 0,93 | 0,40 | 0 | 0,05 | 0 | `familiere` |
| ours | 30 rencontres, 8 pillages, 3 blessures de près | 0,44 | 0,02 | 0,47 | 0 | 0,49 | 0,44 | `exigeante` |
| ours | les mêmes blessures, de loin | 0,51 | 0,01 | 0,47 | 0 | 0,49 | 0 | `rodeuse` |
| loup | 40 rencontres, 30 fois tenu par le feu | 0 | 0,92 | 0 | 0 | 0,09 | 0 | `familiere` |
| loup | le même feu, 2 prises et 2 blessures | 0,36 | 0,06 | 0 | 0 | 0,46 | 0,34 | — |
| loup | 30 rencontres, 8 assauts, 6 joueurs tombés, 4 pillages | 0 | 0,88 | 0,39 | 0,79 | 0,28 | 0,58 | `traqueuse` |
| renard | les mêmes | 0 | 0,86 | 0,33 | 0,47 | 0,31 | 0,54 | `traqueuse` |
| loup | 40 rencontres, 5 prises, 4 blessures, 5 assauts, 1 joueur tombé | 0,54 | 0,01 | 0 | 0,07 | 0,50 | 0,52 | `defensive` |
| cerf | 3 prises, 6 blessures, 6 assauts, 3 joueurs tombés | 0,91 | 0 | 0 | **0** | 0,50 | 0,43 | `defensive` |
| bison | les mêmes | 0,73 | 0 | 0 | **0** | 0,50 | 0,66 | `defensive` |

**La vitesse.** La meute traqueuse du tableau vaut 0,31 après une nuit, 0,50 après deux, 0,61 après trois. Le bison chassé de près vaut 0,23 d'agressivité après une nuit, 0,37 après deux, 0,54 après cinq.

**L'oubli.** Les joueurs partis, la traque vaut 0,56 après 5 cycles, 0,28 après 15, 0,10 après 30, puis plus rien.

**La riposte.** Des traqueuses qu'on se met à chasser de près perdent la traque (0,79 → 0,51 en une nuit) et font front : défensives au deuxième cycle. Chassées de loin, elles n'ont personne à charger : fuyantes au deuxième.

## Ce qui voyage

- **Avec les migrants** : ils emportent la moitié de ce qu'a appris leur population, et le mêlent à la mémoire du lieu, à proportion de leur nombre. Cent traqueuses (0,8) parmi trois cents naïves font 0,1. Des naïves diluent la mémoire du lieu. L'ordre des arrivées d'une nuit ne compte pas.
- **Avec les bêtes que les joueurs déplacent**, de la même façon.
- **Une lignée qui se sépare** emporte la mémoire de sa population. Son caractère, lui, est relu sur son propre plan.
- **Ne voyage pas** : d'une lignée à l'autre, avec les hivernants (ils rentrent), avec les bêtes d'élevage (elles n'ont rien vécu).

**La mémoire se tient par biome.** Dans un monde par parcelles (docs/15), ce que les joueurs font dans un biome, toutes ses parcelles le vivent, comme la méfiance. La parcelle que dit un lot n'y change encore rien. Sur le monde d'Orvane, quatre nuits de joueurs tombés dans la prairie donnent 0,28 à 0,33 de traque dans ses cinq parcelles, et au plus 0,013 dans les autres biomes de la même lignée.

Vue par biome, la population vaut la moyenne de ses parcelles, une parcelle qui n'a rien appris comptant pour neutre. Dans un monde éveillé, la méfiance et l'habituation du biome sont pesées de la même façon, pour que le mot publié et les nombres disent la même chose.

## Côté jeu

Le catalogue dit ce que le monde publie (`catalogue.memoire` : les dispositions, leur valeur neutre, les attitudes, les trois traits du caractère, le pas de l'individu). Chaque jeu choisit ce qu'il rend, et le borne : la mémoire est écrite par les joueurs de tous les jeux, et un jeu reste jouable quand une population est très hostile ou très craintive.

Le kit Godot donne tout en trois appels :

```gdscript
var d := Orvane.dispositions("tiskata", "foret")
# { "mefiance": 0.46, "habituation": 0.03, "attrait": 0.0, "traque": 0.0, "neophobie": 0.5, "agressivite": 0.47, "attitude": "agressive" }
var moi := Orvane.individu(d, randfn(0.0, 1.0))     # cette bête-ci : plus hardie que les siennes, elle ose plus
var c := Orvane.caractere("tiskata")                # { "hardiesse": 0.7, "combativite": 0.86, "opportunisme": 0.57 }
Orvane.compter("tiskata", "foret", "effarouchement", 1.0, "", "", "", "feu")
```

Dire le `moyen` d'un prélèvement ou d'une blessure compte désormais : c'est lui qui dit si la bête avait quelqu'un à charger.

Lisière (`jeux/lisiere/`, et son dépôt) est le premier jeu à s'en servir, dans les deux sens. Il raconte les bêtes blessées, celles que le feu ou la torche ont tenues, les assauts et les veilleuses tombées. Et ses bêtes se conduisent d'après la mémoire : une population méfiante fuit de plus loin, une traqueuse suit la veilleuse et revient après un coup, une population accoutumée au feu se laisse moins tenir par la torche. Une proie d'une population agressive ne fuit plus : là où elle se serait enfuie, elle s'arrête, fait face et gronde, puis charge si la veilleuse insiste ; frappée, elle se retourne. Chaque bête tire son audace une fois (`Orvane.individu`) : dans un troupeau qui fuit, la plus hardie fait front. Le feu vivant reste une loi, quelle que soit la mémoire.

## L'abus

Un groupe pourrait vouloir rendre une espèce hostile partout. Les comptes et les jeux s'inscrivent librement : rien ne remplace une identité. Un faux compte vaut donc, au plus, un vrai joueur malchanceux au possible. Ce qui tient, et ce qui ne tient pas :

- **Un compte seul ne gagne pas.** Dix joueurs qui ne font que passer (trente rencontres chacun), et un compte qui déclare 500 joueurs tombés et 500 pillages par nuit : après vingt cycles, la traque est à 0,18. Le même qui déclare tout ce qu'il peut, soixante de chaque (des bêtes prises et blessées de près, des joueurs tombés, des pillages, des nourrissages, des assauts) : agressivité 0,11 ; sur la lignée la plus combative du monde d'essai, 0,14 au pire. Un seul compte à son feu soixante fois par nuit laisse la néophobie à 0,28 après cinq nuits ; elle continue de baisser s'il ne s'arrête pas.
- **À deux non plus**, pour l'agressivité : 0,29 par la voie de la nourriture, 0,36 au pire sur la lignée la plus combative, sous le seuil de 0,4.
- **Une minorité décidée gagne une population paisible.** Face à ces dix passants, il faut quatre comptes qui déclarent chaque nuit le plus de joueurs tombés possible pour faire une traqueuse, et trois qui déclarent tout pour faire une agressive des lignées les plus combatives : autant de vrais joueurs qui s'y prendraient ainsi y arriveraient aussi.
- **Elle ne fait pas une traqueuse de bêtes dont les joueurs se défendent.** Dix comptes qui blessent et prennent des bêtes, plus cinq faux comptes : la traque reste à 0,17.
- **Ce qui borne toujours** : la mémoire ne retire pas une bête, et ne change pas la chasse des autres ; elle ne bouge pas de plus de 0,35 par nuit ; elle reste dans son biome ; elle retombe quand les joueurs s'en vont ; chaque jeu borne ce qu'il rend.

Pourquoi un compte seul n'y arrive pas : ce qu'il peut déclarer de mal, de nourriture et de chutes est plafonné par compte ; un assaut que personne ne confirme par une chute pèse un dixième ; une petite part d'affrontements parmi beaucoup de rencontres paisibles ne pèse presque rien ; la frustration se mesure au carré de l'attrait, et pas au-delà de ce qu'on a donné de la main. Une relecture indépendante avait trouvé qu'un seul compte, avec dix blessures ou soixante nourrissages par nuit, rendait une population agressive : c'est ce qui a fait poser ces plafonds et cette forme.

À savoir : le `contact` de docs/12 (la méfiance d'avant) n'a pas ces plafonds. Il n'est ramené à une activité normale que par les rencontres, et il n'a pas de part par jeu.

## L'éveiller

```json
"monde": { "memoire": true, "regles": { "memoire": { "traque": { "demi_vie": 20 }, "agressivite": { "cout": 0.4 } } } }
```

Le cycle de nuit l'éveille une fois (`monde.memoire: { depuis }`). Ses règles sont celles de `moteur/memoire.js` (`REGLES`) ; un monde règle les siennes dans `regles.memoire`. Seules les règles que la mémoire connaît, et de la bonne forme, sont prises : le reste est ignoré.

**L'ordre compte.** D'abord le serveur (`hebergement/supabase.sql` : la liste des actions de `orvane_deposer`), puis le profil. Un monde qui annoncerait la mémoire avant que son serveur accepte les actions nouvelles ferait refuser les lots des jeux.

**Dans un monde éveillé, la méfiance change.** Elle se prend au caractère de chaque lignée, et l'habituation a un plafond : une lignée hardie paraît moins méfiante qu'avant aux mêmes lots, une craintive davantage ; dès le jour de l'éveil, l'habituation d'une lignée craintive commence à redescendre vers son plafond, d'un pas par cycle au plus. Les effectifs, eux, ne bougent pas.

## Le simulateur

[Le simulateur de joueurs](https://stonevalleyoff-ai.github.io/orvane/simulateur/) (`simulateur/`) fait jouer des joueurs fictifs face aux bêtes du monde publié. On choisit un lieu, jusqu'à quatre bêtes, et combien de joueurs de chaque sorte jouent chaque nuit : passants, terrés derrière leur feu, chasseurs à l'épieu, chasseurs à l'arc, nourrisseurs, piégeurs, campeurs pillés, faux comptes. On fait passer les nuits, et on lit pour chaque bête son caractère, ce que sa population apprend, son attitude, ce que font ses bêtes une à une (« sur cent bêtes »), le journal, et ce que Lisière en ferait.

Par défaut, il suit trois caractères qui ne se ressemblent pas : la lignée la plus combative du lieu, la plus craintive, et une entre les deux. Les mêmes chasseurs en font trois bêtes différentes.

Le calcul est celui du monde : les lots passent par `Tampon.agreger`, la méfiance par `Orvane.apprendre` au caractère de la lignée, la mémoire par `moteur/memoire.js`, dans l'ordre de la nuit (`simulateur/coeur.js`). Rien n'est envoyé.

Ce qu'il ne fait pas : l'écosystème ne tourne pas. Les effectifs ne bougent pas et aucun migrant n'apporte sa mémoire. Et il suppose une chose : quand une bête devient agressive, les joueurs fictifs déclarent des assauts, et quelques chutes, à proportion de son agressivité (c'est la boucle qu'un vrai jeu ferme par sa partie). Sur le monde d'essai, dix nuits de six compositions de joueurs donnent les mêmes attitudes que la vraie nuit, à 0,006 près sur chaque disposition (`bancs/simulateur.js`).

Son premier essai a montré qu'un faux compte inscrit sous un jeu à lui faisait raboter le jeu des autres : le plancher de la part d'un jeu est passé de 200 à 3 000 contacts. Le second, qu'un faux compte rendait agressive une lignée combative par la seule frustration : elle se mesure depuis au carré de l'attrait.

## Ce que le banc vérifie

`bancs/memoire.js`, en un peu plus d'une minute :
1. un monde sans mémoire tourne exactement comme le moteur sans ce fichier ; le jour de l'éveil, rien ne bouge que le caractère publié (et la méfiance et l'habituation, prises désormais au caractère) ; éveillée, elle ne change ni un effectif ni la chasse des autres ;
2. les équilibres du tableau, le corps, l'oubli et sa fin, la riposte, le pas, l'audace, les règles d'un monde, une bascule pile sur un seuil ; puis le caractère : ce qui le fait, son étalement dans le monde d'Orvane, les mêmes joueurs sur six lignées, de près et de loin, ce qui marche et ce qui coûte, la frustration, la méfiance au caractère, ce qui ne doit rien casser (un plan mal formé, des règles de travers, des comptes démesurés), l'individu et les parts ;
3. le tampon : ce qu'il compte, ses plafonds par compte et par jeu, ce qu'il laisse dans un monde sans mémoire ;
4. l'abus : un compte seul (pour la traque ; pour l'agressivité, en déclarant tout ce qu'il peut), à deux, combien il en faut, des joueurs qui se défendent, deux cents faux comptes en une nuit ;
5. les migrants et l'ordre de leurs arrivées, les bêtes déplacées, la séparation ; la nuit d'un monde par parcelles par le chemin du cycle hébergé, et la vue par biome ;
6. deux styles de jeu, deux faunes : chez ceux qui se terrent derrière leur feu, des traqueuses qui ne craignent plus le feu ; chez ceux qui chassent, un prédateur qui fait front et une proie qui fuit ;
7. le schéma, les listes d'actions (le schéma, le tampon, le serveur, le vérificateur, les kits), le cycle de nuit.

```
node bancs/memoire.js
node bancs/simulateur.js
node outils/vitesse.js --contre origin/main --cycles 3
```

La dernière commande compare le moteur à celui de `main` sur le monde d'Orvane : le banc, lui, ne compare le moteur qu'à lui-même. À lancer après tout changement du moteur.

## Ce qui vient ensuite

- **La tradition** : une part de la mémoire transmise par imitation, qui survit au départ des joueurs sur des dizaines de cycles (comme les savoirs, docs/34).
- **La mémoire par parcelle** : poser ce que les joueurs font là où le lot le dit, pour un jeu au monde ouvert.
- **Le caractère qui évolue** : il se lit déjà sur un plan que la sélection change ; reste à faire peser sur l'audace ce que les joueurs font aux plus hardies.
- **Les machines** : la Mère conçoit déjà d'après ce qui tue les siennes ; avec le `moyen`, elle saura contre quoi.
- **Ce que chaque jeu rend** : une exposition de la mémoire dans le profil (`exposition.memoire`), comme pour la méfiance.
- **Le moment** : des populations chassées le jour qui deviennent nocturnes.
- **Le plafond du contact** de la méfiance, un correctif à part : il change la méfiance des mondes qui reçoivent des lots.
- **La chronique et le directeur** (docs/37, 40) : faire d'une bascule un moment à mettre en scène.
