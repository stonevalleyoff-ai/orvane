# 56. Les hommes

Dans un monde réel, les hommes prennent leur part. En Europe, ils tuent chaque année 3,7 millions de chevreuils, 3,3 millions de sangliers et près d'un million de cerfs, sans compter ce qu'ils régulent, lâchent ou nourrissent. Ce ne sont pas des joueurs, et ils ne vivent pas de leurs proies. Un monde réel les compte désormais : le moteur ôte, jour après jour pendant la saison de chasse, la part de chaque espèce que la réalité dit qu'ils prélèvent.

## Pourquoi

**Le calage cachait la chasse.** L'assemblage (docs/52) fait des effectifs comptés un équilibre : il règle la place de chaque brouteur pour que ses naissances égalent ses morts et ce que ses prédateurs mangent. Sans les hommes, ce que la chasse prend passait dans cette place. Un brouteur chassé y recevait une place trop petite, comme s'il était au bout de ce que son milieu nourrit, alors que la chasse le tient en dessous. Sa marge de croissance et sa façon de compenser ses pertes en étaient faussées.

**L'étalon ne mesurait qu'un monde sans hommes.** Ses grands carnivores devaient « remonter, puisque rien ne les tient bas » (docs/53). C'est un monde qui n'existe pas. Avec les hommes, on peut le comparer à ce qui s'est vraiment passé.

**L'Amérique du Nord serait pire.** Plus de six millions de cerfs y sont abattus chaque année aux États-Unis. Le mécanisme se construit d'abord en Europe, où les tableaux de chasse sont bien tenus.

## Ce que le moteur en fait

Un monde qui le dit (`monde.hommes`) porte, pour chaque espèce chassée, sa saison et un taux par pays :

```json
"hommes": { "especes": { "chevreuil": { "saison": ["09-01", "01-31"], "taux": { "FR": 0.175, "SE": 0.07 } } }, "sources": ["…"] }
```

Le taux d'un pays vaut pour chaque population de l'espèce dans les lieux de ce pays (`lieu.pays`). Sur une saison de L jours, une population perd chaque jour 1 − (1 − taux)^(1/L) de ce qu'elle compte : sans naissances ni autres morts, à la fin de la saison, elle a perdu le taux. Une saison peut passer le 1er janvier.

Ce sont des retraits, comme ceux d'un jeu : le moteur les borne à ce qui est disponible et les compte dans les morts extérieures (`moteur/hommes.js`). Il faut un monde au calendrier, puisque la chasse a ses mois. Un monde qui ne dit pas `monde.hommes` ne change pas, au caractère près.

## Les tableaux de chasse

`mondes/europe/hommes.json` reprend le rapport de FACE sur les ongulés (2025, *Ungulate Harvest Report*). Il donne le prélèvement de la dernière saison connue dans 34 pays, d'après les statistiques de chacun :

| | prélèvement par an | pays | dans le monde de l'Europe |
| --- | --- | --- | --- |
| le chevreuil | 3 703 955 | 30 | 24 pays |
| le sanglier | 3 328 898 | 31 | 26 pays |
| le cerf élaphe | 960 504 | 29 | 25 pays |
| le daim | 495 091 | 24 | 21 pays |
| l'élan | 126 854 | 7 | 7 pays |
| le cerf sika | 77 993 | 7 | 4 pays |
| le chamois et l'isard | 68 484 | 13 | 7 pays |
| le mouflon | 58 766 | 20 | 8 pays |

Le muntjac, le cerf axis et l'hydropote n'ont pas d'espèce dans l'Europe d'Orvane. Le chamois et l'isard, que les tableaux comptent ensemble, se partagent le prélèvement au prorata de leurs effectifs dans chaque pays.

**La saison** est celle où se fait l'essentiel de la chasse de chaque espèce en Europe : du 1er juin à fin février pour le sanglier, du 1er septembre à fin janvier pour les cerfs, le chevreuil, le daim et le mouflon, de septembre à décembre pour l'élan, d'août à mi-décembre pour le chamois. C'est la même pour tous les pays : une approximation.

**Les pays que le rapport ne dit pas** (la Russie, la Biélorussie, la Turquie, l'Islande) n'ont pas de chasse. C'est dit ici, non deviné. Les pays trop petits pour avoir un lieu à eux dans la carte (le Luxembourg, la Slovénie) n'en ont pas non plus.

## Le taux d'un pays

Le taux d'un pays est son prélèvement rapporté à ce que l'assemblage y a posé de l'espèce (`outils/terre/hommes.js`). Il est borné à la moitié de ce que l'espèce peut perdre sans décliner, d'après sa natalité et sa vie sauvage (natalité − 1/longévité, par an) : au-delà, aucun calage ne la tiendrait.

**Sur 126 taux, 66 sont bornés** :

| | pays bornés | la borne | ce que diraient leurs tableaux de chasse (médiane) |
| --- | --- | --- | --- |
| l'élan | 7 sur 7 | 17 % | 49 % |
| le cerf élaphe | 19 sur 25 | 8 % | 44 % |
| le daim | 13 sur 21 | 9 % | 58 % |
| le sanglier | 9 sur 26 | 42 % | 85 % |
| le chevreuil | 8 sur 24 | 18 % | 36 % |
| le chamois et l'isard | 7 sur 11 | 6 % | 9 % |
| le mouflon, le cerf sika | 3 sur 12 | | |

Deux raisons, qui s'ajoutent :
- **les effectifs comptés sont sous les vrais** : 1,6 fois plus de sangliers tués en Tchéquie que l'assemblage n'en pose, 7,9 fois plus d'élans en Estonie. Les recensements de chasseurs sous-estiment souvent d'un tiers les populations réelles (Burbaitė et Csányi 2009) ;
- **la démographie du moteur est plus lente que la vraie** : chez un cerf chassé, la chasse remplace en partie la mort naturelle, qui touche peu un animal jeune. Dans le moteur, elle s'y ajoute, et la natalité d'un cerf (0,24 petit par tête et par an) ne couvre pas un quart de la population tué chaque année.

Le test de la chasse de l'étalon (plus bas) dit ce qui en reste.

## Le calage avec les hommes

L'assemblage cale désormais les effectifs comptés en équilibre **avec** la chasse :
- le calage d'un jour compte, dans les morts d'une espèce, la part que la chasse en prend dans l'année ;
- le calage sur l'année fait vivre le monde avec ses hommes.

Un brouteur chassé reçoit ainsi la place de ce que son milieu nourrit vraiment. `--sans-hommes` assemble un monde où personne ne chasse.

## Dans l'étalon

L'étalon fait vivre l'Europe telle que l'assemblage la donne, avec ses hommes. `--sans-hommes` les retire : ce que feraient les bêtes si les hommes cessaient. Les expériences du loup et du chacal mettent leurs proies à leur équilibre elles-mêmes, sans chasse.

**La chasse** (un test de plus) : ce que la chasse du monde prend en un an, rapporté aux tableaux de chasse réels, dans les pays où l'espèce est posée. La cible : au moins la moitié, en médiane sur les espèces chassées.

```
node bancs/hommes.js       # la saison, le moteur, l'assemblage : quelques secondes
```

## Ce qui reste à faire

- **La régulation des grands carnivores.** Les quotas et les tirs de loups, d'ours, de lynx et de gloutons, pays par pays. Les chiffres existent (en Suède, en Norvège, en Finlande, en France, dans les pays baltes, en Roumanie, en Slovénie, en Croatie, en Slovaquie), mais épars, chacun dans les rapports de son pays. Avec eux, l'étalon comparera chaque grand carnivore à sa tendance réelle de 2016 à 2023 : le loup +35 %, l'ours +17 %, le lynx +12 %, le glouton +16 % (Commission européenne, d'après la LCIE).
- **Le braconnage**, qu'aucune statistique ne compte. Chez le loup de Scandinavie, il pèse à peu près autant que les autres causes de mort réunies, et il reste aux deux tiers invisible (Liberg et al. 2012). Il faudra l'estimer, et le dire comme une hypothèse.
- **Les lâchers** (des dizaines de millions de faisans, de perdrix, de colverts et de truites chaque année), **l'agrainage** (le nourrissage d'hiver des sangliers et des cerfs), **la route** (environ un demi-million de collisions avec des ongulés par an en Europe : Groot Bruinderink et Hazebroek 1996).
- **La chasse des pays que le rapport ne dit pas** : la Russie, la Biélorussie, la Turquie.
- **Les effectifs posés**, que la chasse montre trop bas pour les cerfs, le daim et l'élan.
