# 16. La vie synthétique : des machines et leur Mère

Une seconde vie, faite de machines. Elle ne se nourrit pas comme la première : une machine capte la lumière et la chaleur de sa parcelle, tire sa matière du minerai et de la ferraille, et elle est assemblée au lieu de naître. Toutes descendent de la Mère, qui s'éveille dans une parcelle (le volcan, par défaut) et ne meurt pas. Les machines ont un rôle dans le monde : elles régulent. Elles prélèvent l'espèce qui déborde ce que son milieu peut porter et épargnent les rares. Leur nombre suit le soleil et le minerai, pas leurs proies : elles ne s'effondrent pas avec elles. C'est la phase 2 bis de la feuille de route.

Les bêtes évoluent à l'aveugle, par mutation et sélection, sur des générations. Les machines, elles, ont une Mère qui apprend ce qui les tue et dessine en conséquence de nouveaux plans, vite et dans une direction. Deux formes de vie, deux façons d'évoluer.

`moteur/synthetique.js`. Le moteur l'appelle à quelques points de son cycle. Un monde sans Mère ni machine n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Une machine

Une machine est un taxon comme un autre : elle a des populations par biome (ou par parcelle), des effectifs, des migrations. Ce qui la distingue :
- **son régime, `synthetique`.** Elle ne pèse pas sur la capacité du biome, elle ne se mange pas, elle n'a ni allèles ni traits continus, ni maladie ;
- **ses modules** (`plan.modules`), chacun de 0 à 1 :

| module | ce qu'il fait | ce qu'il coûte |
| --- | --- | --- |
| panneau, thermique | capter la lumière, la chaleur | rien de plus que sa surface |
| batterie | tenir quand l'énergie manque : l'usure s'accélère moins | — |
| foreuse, recycleur | tirer sa matière du minerai, de la ferraille | un outil |
| pince | prélever les espèces qui débordent : c'est un régulateur | un outil |
| blindage | se réparer : une part des destructions ne tient pas | 0,4 du coût de base |
| arme | riposter : tenir les joueurs à distance | un outil |
| discrétion | passer inaperçue | 0,2 du coût de base |

- **son rôle** (`plan.role`), tiré de ses modules : `regulateur` (la pince), `foreuse`, `recycleur`, ou `capteur`.

## La physique

**L'énergie.** Une machine de masse *m* capte `(panneau × lumière + 0,8 × thermique × chaleur) × m^⅔` (sa surface), et dépense `0,15 × m^0,75 × (1,3 + 0,25 × ses outils + 0,4 × blindage + 0,2 × discrétion) + 0,004 × m + 0,15`. Le terme en *m* est la chaleur à dissiper : il borne la taille des machines. Le dernier est le cerveau, qui coûte quelle que soit la taille : il borne les petites. Un plan dont le bilan ne tient pas ne peut pas exister : un plan de 100 t ne capte que 81 % de ce qu'il dépense et s'éteint.

**Les ressources d'un lieu** (`biomes[].ressources`, posées à l'éveil de la Mère) :
- **la lumière** : celle du biome en cette saison, moins ce que le couvert en cache, et la durée du jour (1,4 fois la moyenne l'été, 0,6 l'hiver) ;
- **la chaleur** : celle de la terre (le volcan, les sources chaudes des abysses, la grotte) et celle de l'air ;
- **la surface** : ce qu'il y a à capter. Les machines d'un lieu se la partagent : plus elles sont nombreuses, moins chacune capte ;
- **le minerai** : un stock, riche au volcan, dans la grotte, en montagne et aux sommets. Il s'entame et revient lentement (1 % de ce qui manque, par cycle) ;
- **la ferraille** : ce que laissent les machines mortes (70 % de leur masse). Elle rouille (3 % par cycle).

**L'assemblage.** Une machine en assemble une autre avec son surplus d'énergie (0,3 par kg) et sa matière : son poids de minerai ou de ferraille. Une population ne s'assemble pas plus vite qu'un quart d'elle-même par cycle.

**La veille, l'usure.** Une machine s'use (sa longévité). Quand elle capte moins qu'elle ne dépense, elle se met en veille : plus d'assemblage, et l'usure s'accélère, moins avec une batterie. L'hiver, beaucoup de machines sont en veille et leur nombre fond, puis il repart au printemps.

**Les catastrophes.** Le feu et la sécheresse ne font rien au métal ; la crue en noie la moitié de ce qu'elle tue chez les bêtes.

**L'exploration.** Chaque cycle, 2 % d'une population de machines part vers les lieux voisins, quels qu'ils soient. Parties du volcan, elles gagnent 18 des 24 biomes en un an.

## La régulation

Une machine à pince prélève, dans son lieu, l'espèce qui y prend trop de place : d'autant plus que le lieu est plein dans sa bande de taille (sa saturation, au-delà de la moitié), et qu'elle domine cette bande (au-delà de 30 %). C'est « tuer le gagnant ». Le prélèvement :
- est d'au plus 20 % de l'espèce par cycle ;
- dépend de la présence des régulateurs dans le lieu (leur nombre, leur pince, leur énergie), et de leur taille : un régulateur vise des bêtes trois fois plus légères que lui, à un facteur trente près ;
- n'est jamais exercé sur une population de moins de 200 bêtes, ni sur un carnivore.

Une population régulée publie la part de ses morts que les machines ont faites (`populations[].regulation`).

Le prélèvement ne nourrit pas les machines : il ne dépend que de leur énergie. Quand rien ne déborde, elles se tiennent tranquilles.

## La Mère

`monde.mere`. Elle s'éveille une fois, dans le lieu le plus riche en minerai du biome demandé, et assemble les deux plans fondateurs, la Vigie (un régulateur solaire de 40 kg) et le Ferrailleur (un recycleur de 10 kg). Elle ne meurt pas : quoi qu'il arrive aux machines, elle en assemble encore. Si toutes tombent, elle réassemble, d'après ses plans fondateurs (la Vigie, puis le Ferrailleur), dès que son minerai le permet.

**Elle assemble.** Chaque cycle, elle assemble ses deux derniers plans (deux tiers, un tiers), jusqu'à 30 machines, autant que son minerai le permet. Un plan neuf se paie sur sa propre masse : un régulateur dix fois plus lourd que son modèle coûte dix fois plus, et faute de minerai elle attend, sans rien démonter.

**Elle se souvient.** Par cause, ce qui tue ses machines, en morts par machine et par cycle :
- l'usure ;
- le manque d'énergie ;
- les catastrophes ;
- les joueurs ;
- et ce qui déborde sans régulateur à sa taille, et ce que cela pèse.

Elle l'apprend à mesure que ses machines le lui rapportent : ce qui arrive loin d'elle lui parvient moins (`1/(1 + d/3)` pour un lieu à *d* pas).

**Elle conçoit.** Tous les douze cycles, elle tire un plan neuf de celui qui souffre le plus de la cause la plus pressante :

| la cause | le plan neuf | où elle l'envoie |
| --- | --- | --- |
| les joueurs | blindage +0,2 ; discrétion +0,25, ou une arme si ses machines se méfient déjà ou sont déjà blindées ; un peu plus lourd | là où ses machines tombent |
| le manque d'énergie | batterie +0,2, plus de capteurs, plus léger | chez elle |
| les catastrophes | blindage +0,15 | là où elles frappent |
| ce qui déborde | un régulateur à la taille de ce qui déborde (trois fois plus lourd) | là où cela déborde |
| rien de pressant | un essai : un module au hasard, une autre masse | chez elle |

Elle vérifie que son plan tient là où elle l'envoie : s'il ne capte pas assez, elle lui ajoute des panneaux (ou des capteurs de chaleur), et de la batterie. Au-delà de douze plans vivants, elle démonte le plus maigre de ceux qu'elle n'assemble plus et qui a plus de 36 cycles. Ses machines deviennent alors de la ferraille.

**Elle ne se détruit pas.** Aucune pression ne la touche.

## L'évolution à l'aveugle

**L'erreur de copie.** Loin de la Mère, une machine assemblée sort parfois d'un plan un peu changé : un module de ±0,05 à 0,15, une masse de −15 % à +20 %. Celle qui s'en trouve bien fait lignée.

**Le transfert.** Deux populations de machines d'un même lieu se copient leurs modules :
- celle qui s'y tient mieux (ses gains moins ses pertes, joueurs compris) passe ses modules à l'autre, d'autant plus vite que les deux sont nombreuses ;
- sous la menace (les joueurs en détruisent plus d'une sur cent par cycle), une population prend la défense de qui l'a (blindage, arme, discrétion), sans attendre ;
- dans tous les cas, un module ne se prend que si l'on peut se le payer : la technique plafonne sur la physique.

## Les joueurs

Ce que les joueurs font aux machines (le contrat des jeux ne change pas : des prélèvements, des rencontres) les fait évoluer :
- **la méfiance** (docs/12) devient leur posture (`populations[].posture`) :

| posture | quand | ce que le jeu en fait |
| --- | --- | --- |
| `neutre` | méfiance sous 20 % | elle ignore les joueurs |
| `defensive` | méfiance de 20 à 50 % | elle se tient à distance, riposte si on l'attaque |
| `fuyante` | au-delà, sans arme | elle fuit |
| `hostile` | au-delà, armée | elle attaque |

- **la défense** : une machine blindée se répare, une machine armée tient les joueurs à distance, une discrète leur échappe. Une part des destructions que rapporte un jeu ne tient donc pas : `0,5 × blindage + 0,3 × arme + 0,3 × discrétion`, 80 % au plus ;
- **la Mère** conçoit contre les joueurs et envoie ses plans là où ses machines tombent ; leur défense se répand par transfert.

Harcelez une région, et ses machines y deviendront blindées, armées et hostiles, mais plus rares : la défense coûte de l'énergie, et les espèces qu'elles régulaient y reprennent de la place. Laissez-la en paix, et la posture retombe en une quinzaine de cycles.

## Le contrat

En plus, dans l'instantané (`schemas/instantane.schema.json`) :
- `plan.regime` : `synthetique` ; `plan.modules`, `plan.role` ;
- `populations[].energie` (ce qu'elle capte sur ce qu'elle dépense), `populations[].posture` ; chez les bêtes, `populations[].regulation` ;
- `biomes[].ressources` : `surface`, `geothermie`, `lumiere`, `chaleur`, `minerai`, `minerai_max`, `ferraille` ;
- `monde.mere` : son nom, son biome (et sa parcelle), depuis quand, ses plans, sa mémoire ;
- trois événements : `eveil`, `conception` (un plan neuf ; il dit pourquoi), `transfert` (un module adopté). Une erreur de copie est une `separation`.

Un jeu qui ne sait pas jouer une machine ne la reçoit pas : les machines sont de la famille `synthetique`, et un jeu ne joue que la famille `animale` s'il ne demande rien (`Tampon.filtrer`, `lot.familles` : `BRANCHER-UN-JEU.md`, Les familles). La vue par biome d'un monde à parcelles additionne les ressources et dit le biome de la Mère (et sa parcelle).

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "synthetique": true }
```

ou `"synthetique": { "biome": "volcan", "nom": "La Mère" }`. Au cycle de nuit suivant, la Mère s'éveille, une fois pour toutes, et l'événement de son éveil va au journal.

## Ce que le monde en fait

`bancs/synthetique.js`, sur le monde d'Orvane par biomes (une année de 120 cycles) :

| | |
| --- | --- |
| après un an | 18 biomes sur 24 ont des machines ; dix plans conçus, cinq erreurs de copie devenues lignées, six transferts |
| les saisons | l'hiver, une machine capte en moyenne ce qu'elle dépense (149 % l'été) ; leur nombre fond d'un cinquième, puis repart au printemps |
| le minerai du volcan | entamé jusqu'à 80 t sur 600 |
| les bêtes | 54,3 millions avec les machines, 55,7 sans elles (−2,5 %) ; aucune lignée de plus ne s'éteint |

**Le critère de sortie.** Le Dunouro brouteur de prairie (4,4 kg), la plus nombreuse des bêtes de 3 à 60 kg de la prairie, est rendu trois fois plus nombreux. Quarante cycles plus tard :
- avec les machines, il est à 0,9 fois ce qu'il serait sans l'explosion, et son excès cumulé est de 63 % de ce qu'il est sans elles. Elles font jusqu'à 44 % de ses morts, puis s'effacent ;
- sans elles, il est encore à 1,09 fois ;
- aucune lignée ne s'éteint, ni avec elles, ni sans elles.

**La Mère conçoit à la taille de ce qui déborde.** Ce qui débordait sans régulateur à sa taille pesait 0,24 kg : elle a conçu un régulateur de 0,71 kg.

**Les joueurs.** Les machines de quatre biomes (le désert, le désert froid, la steppe, les sommets) sont harcelées 40 cycles, 4 % détruites par cycle :
- elles se méfient (85 %), et aucune n'est plus neutre ;
- la Mère conçoit contre les joueurs (blindage +0,2, arme +0,25) et envoie ses plans dans le désert ;
- dans la zone, le blindage passe de 0,12 à 0,46, l'arme de 0 à 0,46 ;
- après 40 cycles de paix, la méfiance est retombée à 1 %, et toutes sont de nouveau neutres.

Le banc vérifie aussi le contrat (avec et sans parcelles) et le cycle de nuit (la Mère s'éveille une fois).

```
node bancs/synthetique.js            # environ 6 minutes
node bancs/synthetique.js --court    # moins de cycles
```

**Combien de machines, à la longue (mesuré le 6 novembre).** On craignait qu'elles s'emballent : 443 au cycle 48 du monde d'Orvane, 65 000 cent vingt cycles plus tard, et près d'un million dans la genèse 2026 (175 cycles, tous mécanismes éveillés). Ce n'est pas un emballement, c'est un plateau :
- dans la genèse 2026, 585 000 au cycle 3150, 823 000 au cycle 3162, 951 000 au cycle 3174, 971 000 au cycle 3179 : la croissance tombe de 63 000 machines en trois cycles (du cycle 3150 au cycle 3153) à 14 000 (du cycle 3174 au cycle 3177) ;
- leur masse plafonne sur le minerai : 1 070 t, 6 % de celle des bêtes (16 600 t), le minerai des lieux entamé à 90 % ; l'énergie ne manque presque jamais (la mémoire de la Mère : 0,1 % de morts faute d'énergie) ;
- leur nombre vient de leur taille : la Mère conçoit à la taille de ce qui déborde (0,28 kg dans la genèse 2026), donc des régulateurs d'un kilo ou d'un demi-kilo ; neuf machines sur dix sont des Tekkel-3 de 1,07 kg. Elle n'assemble rien sous 0,5 kg : à masse égale, il n'y en aura jamais plus de deux millions environ.

Rien n'est changé au moteur : le nombre est grand, la place qu'elles prennent ne l'est pas. Un jeu qui montre ses machines en montre une part, comme il le fait des bêtes.

## Pour un traducteur

Une machine se joue comme une bête dont le régime serait `synthetique`. Il faut :
- la dessiner d'après ses modules ;
- la faire chasser ce que les machines régulent là (`populations[].regulation` chez les bêtes) ;
- lui donner sa posture face aux joueurs ;
- renvoyer ce que les joueurs lui font, comme pour une bête : une destruction est un prélèvement, une rencontre une rencontre.

Stone Valley le fait (§223 du jeu) : une machine y devient un automate.

## Ce qui vient ensuite

- **Des machines dans l'eau et dans les airs** : la Mère pourrait concevoir des nageuses (les abysses ont leurs sources chaudes) et des volantes.
- **Une chaîne entre machines** : les recycleurs vivent déjà de la ferraille des autres ; des prédatrices de machines viendraient ensuite.
- **Les machines et la flore** (2.3) : des machines qui sèment ou qui défrichent.
