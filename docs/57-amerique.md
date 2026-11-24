# 57. L'Amérique, en commençant par Isle Royale

L'Europe note le moteur sur ce que la réalité sait (docs/53). L'Amérique du Nord est le continent le mieux connu après elle, et elle sait des choses que l'Europe ne sait pas :
- un cycle proie-prédateur, celui du lynx du Canada et du lièvre d'Amérique (près d'un siècle de fourrures de la Compagnie de la baie d'Hudson) ;
- des expansions qui n'ont servi à rien régler : le coyote, qui a gagné tout le continent au XXᵉ siècle (Hody et Kays 2018), la tourterelle turque ;
- des tendances pour des centaines d'espèces : le Breeding Bird Survey compte les oiseaux depuis 1966.

Le pipeline de l'Europe (`outils/terre/`) ne lit que des sources mondiales : le relief ETOPO, les normales CRU, les traits EltonTraits, Amniote, PanTHERIA et AnAge, la présence GBIF. Il servira tel quel.

Le premier pas est une île.

## Isle Royale

Isle Royale est une île de 544 km² au milieu du lac Supérieur (Michigan). Les orignaux y sont arrivés au début du XXᵉ siècle, les loups vers 1948, sur la glace. Ils sont comptés chaque hiver depuis 1958 : c'est la plus longue étude d'un prédateur et de sa proie. Le loup est le seul prédateur de l'orignal, et l'orignal presque la seule proie du loup en hiver.

`node outils/etalon.js --experience isle-royale` fait vivre l'île de 1980 à aujourd'hui (`mondes/amerique/isle-royale.json`) :
- **l'île** : sa forêt boréale (un lieu de taïga, couvert à 80 %), son climat (la moyenne des quatre cases de CRU 1991–2020 qui la couvrent : −12 °C en janvier, 18 °C en juillet, 793 mm de pluie), sa capacité tirée de sa production (893 g/m²/an), comme celle d'un lieu de l'Europe ;
- **ses bêtes, celles de l'Europe** : l'orignal (l'élan), le loup et le renard sont les mêmes espèces ; le castor d'Europe et le lièvre variable tiennent la place du castor du Canada et du lièvre d'Amérique. Chacune garde ce que l'assemblage de l'Europe lui a donné : **rien n'est calé sur l'île**. Seuls le castor, le lièvre et le renard sont mis à leur équilibre, comme les proies du retour du loup ;
- **son histoire** : elle part de l'hiver 1980 (664 orignaux, 50 loups, d'après le Parc national). Les dix-neuf loups lâchés de l'automne 2018 à l'automne 2019 y sont lâchés aux mêmes dates : 4 du Minnesota, 4 puis 7 de l'Ontario, 4 du Michigan.

Le moteur ne connaît pas ce qui a fait l'histoire de l'île : le parvovirus qui a fait tomber les loups de 50 à 14 (1981-1982), la consanguinité qui les a menés à deux (2016-2018), l'hiver de 1996 et ses tiques. On compare donc des ordres de grandeur, et non une histoire :

| test | ce qui est mesuré | la cible |
| --- | --- | --- |
| les orignaux | leur nombre moyen, 1980–2018 (en vrai 1 026, 1,9 par km²) | à moins d'un facteur 1,5 |
| les loups | leur nombre moyen, 1980–2018 (en vrai 18) | à moins d'un facteur 2 |
| la prédation | la part des orignaux que les loups tuent chaque année | de 6 à 13 % (« un orignal sur dix, la plupart des années », le projet loups-orignaux) |
| ce qu'un loup tue | les orignaux tués par loup et par mois, en hiver (du 15 janvier au 1er mars, 1980–2011) | à moins d'un facteur 2 de 0,7 (± 0,04, la moyenne de 1971 à 2011 : le rapport annuel 2018-19) |
| les fluctuations | le coefficient de variation des orignaux (en vrai 0,44) | au moins la moitié |

## Ce que l'île a d'abord montré : le loup ne chassait pas l'orignal

Dans le moteur, une meute n'abattait rien de plus de 1,5 fois sa masse. Six loups de 29 kg, c'est 175 kg : aucune proie de plus de 263 kg, et l'orignal en pèse 351. Sur l'île, les loups mouraient donc de faim en dix ans, et les orignaux restaient figés à 660 bêtes.

La même limite touchait l'Europe : le loup de Scandinavie, de Finlande et de Russie, qui vit surtout de l'élan, ne pouvait pas en manger.

**La meute et sa plus grosse proie** (`regles.meute_proie = 2,5`, un monde réel). Une meute abat jusqu'à deux fois et demie sa masse. La meute de loups prend ainsi l'orignal, deux fois la sienne. Le bison d'Europe, trois fois et demie plus lourd que la meute, reste hors de portée. Un chasseur seul garde la limite de 1,5 fois sa masse. Dans les mondes d'Orvane, rien ne change.

## Ce que l'île a montré ensuite : le loup mangeait trop peu

Avec la ration réglée à la main (trois graines, qui s'accordent) :

| | le moteur | la réalité |
| --- | --- | --- |
| les orignaux (1980–2018) | 435 (0,8 par km²) ≈ | 1 026 (1,9 par km²) |
| les loups | 69 ≈ | 18 |
| la part des orignaux tuée chaque année | 6,7 % ✓ | 6 à 13 % |
| ce qu'un loup tue en hiver | 0,03 orignal par mois ✗ | 0,7 |
| les fluctuations des orignaux | 0,20 ≈ | 0,44 |

**Le loup du moteur mange trop peu.** Un loup de l'île tue en hiver 0,7 orignal par mois ; celui du moteur, 0,03. Sur l'année, d'après les comptages et la part des orignaux tuée, un loup de l'île tue environ 5,7 orignaux (10 % de 1 026 orignaux, pour 18 loups). Un loup du moteur, rassasié, mange 0,63 kg par jour, 229 kg par an : deux tiers d'un orignal, quand celui de l'île en tue près de six. Il en faut donc quatre fois plus pour tuer la même part des orignaux, et l'île en porte 69 au lieu de 18. Le castor y ajoute : le loup du moteur en mange aussi l'hiver, quand le vrai castor est sous la glace.

C'est la ration de l'Europe (`regles.besoin = 6`, docs/52), réglée avec la conversion (`0,06`) pour que les chasseurs fassent naître de 1 à 3 % de ce qu'ils mangent. L'étalon de l'Europe le montrait déjà d'une autre façon : ses carnivores sont près de deux fois plus nombreux que la loi de Carbone et Gittleman ne le dit pour leurs proies. La ration vient désormais de ce que brûlent les bêtes en liberté (docs/58), et l'Europe est recalée avec elle.

**L'orignal tient moins de place que sur l'île vraie.** Sans loups, il s'arrête à 660 bêtes (1,2 par km²). L'île en a porté 2 400 en 1995 (4,4 par km²). Sa place est celle que l'Europe lui a calée, où il partage la forêt avec le cerf et le chevreuil, et où l'on compte souvent moins de bêtes qu'il n'y en a.

## Avec la ration de ce que brûlent les bêtes

Sur l'Europe recalée avec la nouvelle ration (trois graines, qui s'accordent) : **2 ✓, 2 ≈, 1 ✗**.

| | le moteur | la réalité |
| --- | --- | --- |
| les orignaux (1980–2018) | 409 (0,75 par km²) ≈ | 1 026 (1,9 par km²) |
| les loups | 25,5 ✓ | 18 |
| la part des orignaux tuée chaque année | 7,7 % ✓ | 6 à 13 % |
| ce qu'un loup tue en hiver | 0,10 orignal par mois ✗ | 0,7 |
| les fluctuations des orignaux | 0,17 ≈ | 0,44 |

**Les loups tombent juste, mais en partie pour de mauvaises raisons.** Deux erreurs se compensent :
- l'île porte 2,5 fois trop peu d'orignaux : 409 pour 1 026 ;
- un loup du moteur en tue 4,6 fois trop peu : 1,2 orignal par an, quand celui de l'île en tue 5,7 (10 % de 1 026 orignaux, pour 18 loups).

Avec les vrais orignaux et ce que tue un vrai loup, l'île porterait bien 18 loups. Avec les vrais orignaux et le loup du moteur, elle en porterait plus de quatre-vingts.

**Ce qu'un loup tue n'est pas ce qu'il mange.** La ration du moteur est ce que le loup brûle : 2,2 kg de proies par jour, dont il mange les quatre cinquièmes. Sur l'île, au début des années 1970, les loups disposaient de 4,4 à 10 kg d'orignal par loup et par jour (Peterson 1977). Un loup ne mange ni les os, ni la panse, ni la peau d'un orignal. Les corbeaux, présents à presque chaque carcasse, en emportent une grande part : 17 % de ce que tue une meute de six loups, 37 % de ce que tue un couple (Vucetich, Peterson et Waite 2004). Le moteur, lui, fait manger au chasseur les quatre cinquièmes de ce qu'il tue, que ce soit un campagnol ou un orignal. Et rien de ce qu'il laisse ne nourrit les charognards : ceux-ci ne vivent que des morts naturelles (`regles.charognes`).

**Les orignaux fluctuent moins qu'en vrai** (0,17 pour 0,44). Le moteur ne connaît ni les hivers rudes, ni les tiques, ni les épidémies qui ont fait l'histoire de l'île.

## Ce qui reste à faire

- **Ce qu'un chasseur tue et ce qu'il mange** : la part d'une proie que mange son chasseur, selon sa taille (le campagnol entier, une part de l'orignal), et ce qui en reste aux charognards (docs/58).
- **La place de l'orignal** sur l'île : elle vient de l'Europe, où les effectifs comptés sont souvent sous les vrais (docs/58).
- **Les comptages de 1959 à 1979**, quand les loups montaient de 20 à 50 : ils sont dans les rapports annuels du projet loups-orignaux.
- **L'Amérique du Nord entière** : la carte et les espèces, par le pipeline de l'Europe ; puis le cycle du lynx et du lièvre, l'expansion du coyote, les tendances du Breeding Bird Survey.

```
node outils/etalon.js --experience isle-royale --graines 3     # une quinzaine de secondes par graine
```
