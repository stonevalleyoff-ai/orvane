# 13. La stabilité : ce que le moteur tient sur mille cycles

Un monde Orvane avance d'un cycle par nuit. Mille cycles, c'est près de trois ans de nuits. Avant d'aller plus loin (phase 2 : l'espace, la flore), il faut savoir ce que le moteur tient sur cette durée. Il ne doit ni s'emballer ni s'effondrer, avec ou sans joueurs. Les ajouts de la phase 1 doivent démarrer neutres. La sélection doit répondre comme le dit la génétique, et tout doit rester déterministe.

```
node bancs/stabilite.js                      # mille cycles de sv-1, trois cents du monde d'Orvane : quelques minutes
node bancs/stabilite.js --court              # deux cents cycles : deux minutes
node bancs/stabilite.js --monde mon-monde --genese '' --sortie rapport.json
```

Le banc du jeu (`traducteurs/stone-valley/banc.js`, 67 vérifications) vérifie le reste : le jour un dans Stone Valley, la boucle jeu → tampon → moteur, et ce que le jeu montre.

## Les six bancs

1. **Mille cycles sans joueurs** (sv-1). À chaque relevé, les nombres doivent être sains : effectifs, fréquences qui somment à 1, allèles, traits continus, méfiance, organes. Aucune espèce du départ ne doit s'éteindre. Chacune doit rester entre le dixième et dix fois son effectif de départ, et le monde ne doit pas dériver sur la seconde moitié. Les sursauts brusques (une population qui gagne 40 % ou perd 25 % en un cycle) sont comptés.
2. **Mille cycles de chasse**. Dix joueurs passent chaque soir. Ils chassent quatre espèces, les plus grandes bêtes d'abord, et en croisent trois autres sans rien faire. Comme dans un jeu, ils croisent moins de bêtes quand il y en a moins, et en prennent moins quand elles fuient de loin (la méfiance, docs/12). Ils prennent chaque soir 0,6 % de la population de départ, et 0,3 % pour le bosseu, qui se reproduit à peine plus qu'il ne meurt. Puis les joueurs partent pour soixante cycles.
3. **Un monde de genèse** pendant 300 cycles : sa diversité, ses lignées à organes, ses sursauts. C'était genese-7 ; c'est désormais le monde d'Orvane (`--genese orvane`, avec ses propres règles, `monde.regles`).
4. **Le jour un**. Un cycle avec ou sans les ajouts de la phase 1 (génétique continue, allèles, hybrides, méfiance) doit donner presque le même monde. Cent cycles plus tard aussi.
5. **La réponse à la sélection**. On fait tourner deux mondes jumeaux. Dans l'un, les joueurs prennent 3 % des brouteurs de prairie parmi les plus grands, le dixième du haut. Dans l'autre, ils en prennent autant au hasard : même nombre de morts, même densité. L'écart de taille moyenne entre les deux est comparé à l'équation du sélectionneur, R = h² × S, cumulée cycle après cycle sur la part de la population qui a survécu.
6. **Le déterminisme**. Deux fois quarante cycles de chasse depuis le même état doivent donner le même monde, au caractère près (empreinte SHA-256).

## Ce qu'ils donnent

| banc | résultat |
| --- | --- |
| sans joueurs, 1 000 cycles | les 22 espèces tiennent ; le monde reste entre 0,57 et 1,22 fois son effectif (le creux : une épidémie de vingt cycles chez les glaneurs de la prairie, les quatre cinquièmes des bêtes du monde, du cycle 700 au cycle 720, puis la remontée) ; 4,7 % de variation sur la seconde moitié ; aucun sursaut brusque ; 73 ms par cycle |
| chasse, 300 cycles | brouteur de prairie à 43 %, glaneur 92 %, crapaud 68 %, bosseu 29 % de ce qu'ils seraient sans joueurs |
| chasse, 1 000 cycles | aucune espèce éteinte ; jamais plus de 39 % perdus en 50 cycles ; les crapauds de la tourbière, chassés grands, sont devenus une lignée à part, plus petite et plus nombreuse ; les brouteurs ont perdu 2,2 écarts-types de taille |
| les joueurs partis | méfiance de 62 % à 0,4 % en soixante cycles ; les populations chassées remontent (de 64 % à 72 % de leur niveau sans joueurs, en moyenne) |
| genèse, 300 cycles | 99 → 101 lignées, 6 zones hybrides ; 47 sursauts pour 861 populations ; 0,8 s par cycle |
| genèse, 1 000 cycles (hors banc) | 99 → 106 lignées, aucune perdue ; 238 sursauts (28 449 avant correction, plus bas) ; le monde oscille lentement entre 1 et 1,7 fois son effectif, sur quelque six cents cycles ; de 0,87 à 1,16 s par cycle, 1,8 Mo |
| jour un | 0,1 % d'écart au plus sur une population ; 1,03 fois le monde sans les ajouts cent cycles plus tard |
| R = h² S | S cumulé −1,63 σ, h² 0,5 : attendu −0,81 σ, observé −0,80 σ (1,5 % d'écart) ; 3,9 % de longueur en moins en 30 cycles |
| déterminisme | même empreinte |

Le critère de sortie de la phase 1 est rempli. Une population chassée sur ses grands individus rapetisse de façon mesurable : dans Orvane (ici, et banc du jeu section 7 : −1,7 % de longueur en trente cycles), et dans le jeu, qui le montre (même section). Le jour un ne casse pas (banc du jeu, section 1).

## Ce que les bancs ont corrigé

**Les vagues de migrants.** Une population à l'étroit (un herbivore sans place, un carnivore affamé) envoyait chaque cycle ses migrants vers **un** voisin tiré au sort. Une petite population voisine recevait donc, un cycle sur trois ou quatre, une vague cinq à vingt fois plus grande qu'elle, puis déclinait jusqu'à la vague suivante. Dans le monde de genèse, plein de carnivores affamés, cela donnait 28 000 « explosions » et « effondrements » en mille cycles, vingt-huit par cycle. Désormais, les migrants partent vers **tous** les voisins où l'espèce peut vivre, chacun à proportion de ce qu'il lui convient : un flux continu. Sur mille cycles du monde de genèse, les sursauts tombent de 28 449 à 238, moins d'un pour quatre cycles. Sur sv-1, qui n'en avait pas, il n'y en a toujours pas.

Un carnivore ne migre plus non plus parce que sa bande de masse est pleine d'herbivores. C'était l'abondance de ses proies, pas un manque de place. Il part quand il a faim, comme avant.

**La genèse ne séparait plus rien.** `moteur/genese.js` remplaçait les règles de séparation du moteur par les siennes, plus rapides. Depuis l'isolement (docs/10), ces règles comptent aussi le flux de gènes et l'écart génétique, que la genèse ne donnait pas : aucune population n'était plus jamais isolée, et une genèse de 1 500 cycles finissait avec ses cinq ancêtres. Elle complète désormais les règles au lieu de les remplacer : trente lignées en 300 cycles, comme avant. Le monde genese-7 avait été fait avant ; le monde d'Orvane est le premier né de la genèse corrigée.

**La genèse inventait des géants volants.** La première genèse du monde d'Orvane (3 000 cycles, 24 biomes, 200 lignées) a fini avec 30 lignées volantes de plus de 15 kg, dont un omnivore de 325 kg. Presque toutes les lignées savaient marcher, courir, sauter, grimper, creuser et voler à la fois, et il ne restait que 11 herbivores pour 103 omnivores et 49 carnivores. Trois règles de la dérive (`deriver`) en étaient la cause :
- rien n'empêchait une lignée volante de grossir. Désormais, au-delà de `REGLES.vol_masse_max` (12 kg), elle perd le vol et ses ailes ;
- un mode de déplacement se gagnait sans jamais se perdre. Désormais, un mode dont le biome n'a pas l'usage peut se perdre à la séparation : grimper en terrain découvert, nager loin de l'eau, courir sous un couvert épais ;
- le régime passait par l'omnivore et en repartait à pile ou face, si bien que la moitié des lignées finissaient omnivores. Désormais, un omnivore redevient herbivore deux fois sur trois.

Le plus lourd des volants pèse alors 1,7 kg, et seules 13 lignées sur 105 ont plus de trois modes de déplacement (genèse d'essai de 900 cycles).

**Il n'y avait plus de vrais carnivores.** Une deuxième genèse a montré un défaut plus profond, déjà présent dans genese-7. Un trait, `estomac-large`, fait digérer les plantes à un carnivore pour 5 % de fécondité : il devient omnivore et tire de la place autant qu'un herbivore. Chez des carnivores qui ont faim, le trait gagne tout. Dans genese-7 comme dans la deuxième genèse, **tous** les carnivores le portaient : ils étaient omnivores de fait. Les « rapaces » d'un gramme se comptaient par centaines de millions, à satiété nulle. Sv-1, aux carnivores bien nourris, ne l'a jamais vu.
- Un carnivore devenu omnivore ne tire plus des plantes que 40 % de ce qu'en tire un herbivore (`REGLES.omnivore_vegetal`). Le trait reste un recours contre la faim, plus une aubaine.
- Le régime que montrent les noms et les jeux est le régime **de fait** : un carnivore dont la moitié porte `estomac-large` est un omnivore (`Tampon.regimeDe`).

Sur 900 cycles, il reste alors quelques vrais carnivores, bien nourris (satiété 0,67), de 0,7 à 10 kg. Les herbivores sont 45 millions, les omnivores 34 millions. Les carnivores sont rares, comme il se doit au sommet d'une chaîne.

**Des filtreurs dans la prairie.** Le régime d'un filtreur pouvait dériver comme les autres, vers l'herbivore ou le carnivore. La nage pouvait aussi se perdre : un filtreur marin de 71 kg finissait par courir dans la prairie. Un filtreur garde désormais son régime (le détritivore aussi), ne perd pas la nage, et ne vit que dans l'eau : rivière, lac, mer, ou les rives (`convenance`).

**Deux prédateurs sur 123 lignées.** Même après ces corrections, la genèse ne gardait presque pas de carnivores. Les essais (des genèses de 900 cycles, `ORVANE_TRACE=1` pour compter qui naît et qui meurt par régime) ont trouvé quatre causes :
- les omnivores chassaient comme s'ils ne mangeaient que de la viande : ils prenaient cent fois plus de proies que les carnivores. Un omnivore ne cherche plus en viande que 30 % de ce qu'il mange (`viande_omnivore`), et tire des plantes 60 % de ce qu'en tire un herbivore (`omnivore_vegetal_base`) ;
- un carnivore né d'un petit omnivore à vie brève ne vivait pas assez pour se nourrir. Ses petits naissent de la viande mangée, au plus `conversion × besoin × masse^-0,25` par tête et par cycle ; il reçoit désormais au moins 1,6 fois la vie que cela demande (`longevite_predateur`). Les ancêtres prédateurs ont une longévité qui suit leur masse ;
- `estomac-large` restait une aubaine : il coûte 20 % de fécondité (au lieu de 5 %), et un carnivore qui digère les plantes n'en tire que 20 % (`omnivore_vegetal`) ;
- la genèse rayait les lignées rares sans tenir compte de leur étage : un prédateur pèse naturellement bien moins que ses proies. Sa biomasse compte désormais trente fois (`--etage 30`).

Sauf le coût d'`estomac-large` (le catalogue, pour tous), ces règles sont celles du monde d'Orvane, pas du moteur : la genèse les écrit dans le monde (`monde.regles`) et chaque cycle les applique, où qu'il tourne ; sv-1 garde les siennes. Le monde d'Orvane (900 cycles) a 112 lignées après son rodage, dont 13 vrais carnivores de 0,2 à 16 kg, bien nourris (satiété 0,7), sur 18 biomes. Au-delà de 900 cycles, les herbivores remplissent la place laissée aux lignées et la part des carnivores retombe (10 sur 190 à 1 400 cycles).

Sur 100 cycles, le monde fait 128 sursauts pour 668 populations, 0,2 % des populations par cycle : de petits herbivores de moins d'un kilo qui suivent les saisons. Le banc les mesure désormais à la taille du monde (moins de 0,5 % des populations par cycle).

## Ce qu'ils montrent, et qui reste à faire

**Une espèce minoritaire dans sa bande ne se défend pas d'une chasse longue.** Sur 1 000 cycles, la même chasse modérée fait tomber les brouteurs de prairie à 4 % et les bosseus à 7 % de leur niveau sans joueurs. La chute est lente et régulière, sans effondrement, et aucune espèce ne s'éteint : elles tiennent ailleurs. La cause est structurelle. Les herbivores de même masse se partagent la même place (la bande, docs/1). Quand l'un recule, d'autres prennent sa place, et rien ne lui fait regagner du terrain : sa propre rareté ne lui laisse presque pas plus de place, car il ne pèse qu'une petite part de sa bande. S'y ajoute le prix d'avoir trop rapetissé : une taille loin de l'optimum coûte en fécondité.

Un essai a compté les autres espèces de la bande pour moins que les siens (de 0,8 à 0,4). Il n'a pas suffi : à 0,4, les brouteurs tombaient encore au tiers, et le monde entier gagnait un tiers de bêtes. Le vrai remède est dans la phase 2 : **la flore évolutive**. Chaque herbivore y aura ses plantes, donc des ressources à lui, qui le protègent quand il devient rare.

**Le monde de genèse ne perd pas de lignées.** En 1 000 cycles, il en gagne sept et n'en perd aucune : les espèces nombreuses ne s'éteignent jamais tout à fait. Le cycle s'allonge avec elles (de 0,87 à 1,16 s), ce qui reste raisonnable pour un cycle par nuit. Un plafond de lignées par monde (`REGLES.max_taxons`, déjà utilisé par la genèse) ou des extinctions de fond seront à décider avec les profils de genre (phase 4).

**Les carnivores de genese-7 ont faim.** Leur satiété est souvent sous 0,2, et les épidémies y sont fréquentes, sans faire de sursauts. Ce sont en fait des omnivores (`estomac-large`, plus haut). Le monde d'Orvane, né après la correction, a de vrais carnivores, rares et nourris. La chasse en meute reste pour la phase 3.

## La genèse 2026 : 3 000 cycles (5 novembre)

Une genèse neuve, sur les 24 biomes universels, avec les 19 ancêtres et les règles du monde d'Orvane (graine 2026, `--lignees 200 --etage 30`), a tourné 3 000 cycles au lieu de 900. Elle a été mesurée tous les dix cycles : 931 séparations, 824 extinctions, 126 lignées vivantes à la fin (jusqu'à 187 en route).

Le monde qui en est né est publié, figé, dans `mondes/genese-2026/` ; ses mesures sont dans `mondes/genese-2026/genese.json` (un point tous les dix cycles : lignées par régime, biomasses, rapport carnivores/herbivores, diversité, masses, séparations et extinctions cumulées), et l'observatoire en trace les courbes (`monde/?monde=genese-2026`). Après la genèse, il a tourné 175 cycles (jusqu'au cycle 3179) avec tous les mécanismes du monde d'Orvane éveillés (parcelles, la Mère, la flore, les souches, le milieu, les natures, le climat, la ponte, les deux vies, les castes, les formes nouvelles réglées à 1 — docs/33 —, l'invention, la grammaire, l'esprit, la vie en groupe) : la Mère a conçu 14 plans de machines (12 en service), 81 lignées de plantes, 15 traits inventés, 59 souches ; une méduse (cycle 3037), quatre mille-pattes, une pieuvre (cycle 3162). Aucune île ni aucun lieu n'a changé de nature en 175 cycles : une île naît une fois tous les mille cycles environ (docs/31), et un lieu change de nature quand ses axes ont beaucoup bougé (docs/28).

| mesure | cycle 250 | cycle 1 500 | cycle 3 000 |
| --- | --- | --- | --- |
| lignées vivantes | 56 | 79 | 126 |
| carnivores (de fait) | 21 | 7 | 7, tous de 2,8 à 8 kg |
| biomasse des carnivores / celle des herbivores | 10,7 % | 4,9 % | 3,3 % |
| biomes sans aucun carnivore | 0 | 4 | 5 (banquise, forêt, volcan, grotte, abysses) |
| filtreurs | 3 | 5 | 31, autant de biomasse que tous les herbivores |
| détritivores | 0 | 0 | 0 |
| masse : médiane, maximum | 1,4 kg, 150 kg | 1,8 kg, 150 kg | 2,4 kg, 72 kg |
| diversité (Shannon), part de la première lignée | 2,65, 28 % | 3,36, 18 % | 4,03, 6 % |

Ce qu'elle montre :
- **Les étages se vident par le haut.** Les carnivores se resserrent sur quelques généralistes de taille moyenne, présents partout : ni petits mangeurs d'insectes, ni grands chasseurs.
- **Toutes les lignées ont la même tolérance**, 0,7, celle des ancêtres : rien ne la faisait varier. Une lignée vit presque partout, et quelques généralistes occupent tout.
- **Les détritivores disparaissent** avant le cycle 250 et ne reviennent pas : `detritivore_vegetal` à 0,5, et la règle de rareté de la genèse ne les protège pas comme les prédateurs (`--etage`).
- **Les filtreurs prolifèrent** : ils ne comptent que pour 30 % sur la capacité d'un lieu.
- **La règle de rareté fauche les jeunes lignées** : l'âge médian à l'extinction est de 115 à 124 cycles, juste après le sursis de 100 cycles.

**La dérive de la tolérance.** `REGLES.derive.tolerance` (0 par défaut : rien ne change) laisse la largeur de la niche dériver à la séparation, plutôt vers l'étroit (entre 0,15 et 0,9) ; son tirage ne se fait que s'il est demandé. Deux genèses de 1 200 cycles, même graine, sans et avec (`"derive": { "tolerance": 0.35 }`) :

| à 1 200 cycles | sans | avec |
| --- | --- | --- |
| lignées vivantes | 74 | 119 |
| lignées par biome (médiane) | 13 | 21 |
| carnivores | 8 | 10 |
| biomes sans carnivore | 5 | 3 |
| diversité (Shannon) | 3,26 | 3,66 |
| tolérances | 0,7 | de 0,43 à 0,83 (médiane 0,63) |

Des spécialistes régionaux naissent, et les carnivores gagnent des lieux. Le monde d'Orvane la reçoit par son profil (`profil.monde.regles`, que le cycle de nuit ajoute aux règles de sa genèse) : le jour où elle arrive, rien ne bouge ; seules les lignées qui naîtront ensuite en héritent. Pour revenir en arrière, il suffit de retirer la ligne du profil.

## La règle de rareté de la genèse (6 novembre)

Une genèse raye, tous les 25 cycles, une lignée installée depuis plus de 100 cycles qui pèse moins de 0,05 % de la biomasse du monde (un carnivore compte trente fois, un omnivore deux) : sans cela, les lignées qui n'ont pas pris occuperaient les 200 places. **C'est elle qui fauchait, pas l'écologie** : sur les 53 extinctions des 600 premiers cycles (graine 2026), 51 étaient des lignées rayées, dont 13 des 15 carnivores.

Elle jugeait chaque lignée sur le monde entier : une lignée qui tient sa place dans un lieu pauvre (la banquise, le volcan, les abysses) pesait peu dans le monde, et était rayée ; ces lieux perdaient leurs carnivores. Désormais, la rareté se juge aussi lieu par lieu (`--rarete-lieu`, 1,2 % de la biomasse d'un lieu, la part qu'aurait un lieu moyen) : **une lignée n'est rayée que si elle ne compte ni dans le monde, ni dans aucun lieu**.

Cinq genèses de 3 000 cycles, même graine (2026), mêmes règles que la genèse 2026 ; en moyenne du cycle 1 000 au cycle 3 000 :

| | lignées | carnivores | biomasse des carnivores / herbivores | biomes sans carnivore | la plus lourde | à la fin |
| --- | --- | --- | --- | --- | --- | --- |
| la règle d'avant | 122 | 8,7 | 6,2 % | 2,8 | 72 kg | 138 lignées, 6 carnivores, 5 biomes sans carnivore |
| les détritivores comptés trente fois | 108 | 10,2 | 7,7 % | 2,4 | 70 kg | aucun détritivore ne tient |
| la rareté jugée lieu par lieu seulement | 165 | 10,1 | 7,8 % | 0 | 67 kg | elle raye la plus grande lignée, répandue partout et légère dans chaque lieu |
| **ni dans le monde, ni dans aucun lieu** | **139** | **10,5** | **6,7 %** | **0** | **76 kg** | **185 lignées, 10 carnivores, aucun biome sans carnivore ; la plus lourde : 99 kg** |
| un sursis de 200 cycles | (arrêtée au cycle 600 : elle ne fait que retarder) | | | | | |

C'est la règle par défaut de la genèse (`--rarete-lieu .012` ; `--rarete-lieu 0` rend la règle d'avant). Elle ne touche pas le monde vivant : seules les genèses à venir la suivent.

**Les détritivores** disparaissaient dans toutes : même comptés trente fois, ils ne prenaient pas. Ce n'était pas la règle : dans le moteur, un détritivore se nourrissait comme un brouteur, de la place des plantes, avec la moitié de ses petits dans la genèse (`detritivore_vegetal` à 0,5) — un herbivore moins bon, qui perd toujours.

**Les cadavres (6 novembre).** `REGLES.cadavres` : les détritivores vivent des morts du lieu. Ce que la mort naturelle y laisse chaque cycle (les bêtes, pas les plantes ; × la règle) se partage entre eux selon leur besoin. C'est un flux, pas un stock de proies : un détritivore est rassasié à moitié quand sa part égale son besoin, il naît selon sa satiété (comme un brouteur selon sa place) ; affamé, il meurt plus et s'en va, comme un carnivore. Il ne pèse plus sur les plantes. À 0, par défaut dans le moteur, rien ne change : le monde d'Orvane donne la même empreinte (`bancs/cadavres.js`).

Même graine, 3 000 cycles, la règle de rareté nouvelle :

| | détritivores (lignées) | leur part de la biomasse des bêtes |
| --- | --- | --- |
| sans cadavres | 1 ou 2 jusqu'au cycle 1 250 (comptés trente fois), plus aucun ensuite | — |
| 30 % des morts du lieu | 8 au cycle 250, 11 au cycle 500, 2 au cycle 1 500 | |
| **toutes les morts du lieu** | **9 au cycle 250, 18 au cycle 750, 7 au cycle 1 500 et au cycle 1 650** | **16 à 20 % au début, 3 % au cycle 1 650** |
| toutes, et comptés trente fois | 18 au cycle 500, 9 au cycle 1 000 : rien de plus | |

Ils tiennent désormais, une guilde de quelques lignées qui pèse quelques pour cent des bêtes. Une genèse leur donne toutes les morts du lieu par défaut (`cadavres: 1`), et le monde qui en naît garde la règle (`monde.regles`) : ses détritivores continuent d'en vivre. `--regles '{"cadavres": 0}'` rend la règle d'avant. Le monde d'Orvane n'a plus de détritivores (ils ont disparu dans sa genèse) : la règle ne lui changerait rien.

Les autres pistes, à mesurer de la même façon : faire peser les filtreurs pour 60 % sur la capacité ; une genèse d'eau douce versée dans le monde, comme la mer en octobre.
