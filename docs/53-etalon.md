# 53. L'étalon : l'Europe note le moteur

Le monde d'Orvane est inventé, et rien ne dit si ses lynx mangent trop ou si ses hivers usent assez. L'Europe (docs/52) tourne sur le même moteur, avec de vraies espèces et un vrai climat : là, la réalité connaît la réponse. L'étalon fait vivre l'Europe plusieurs années, sans joueurs, depuis son amorce. Il note ensuite le moteur sur ce que la réalité sait **et que l'assemblage n'a pas calé**.

Cette dernière condition est toute la difficulté. L'assemblage cale la place de chaque brouteur et le métabolisme de chaque prédateur pour que les effectifs comptés soient leur équilibre. « L'Europe a 31 000 loups » est donc vrai par construction et ne prouve rien du moteur. L'étalon ne regarde que ce qui doit émerger de lui-même.

## Les tests

`outils/etalon.js` :

| test | ce qui est mesuré | la cible | la source |
| --- | --- | --- | --- |
| **la stabilité** | la moyenne de la dernière année de chaque espèce, rapportée à celle de la première (deux moyennes sur toutes les saisons), et les extinctions | 90 % des espèces à moins d'un facteur 2, aucune extinction | un monde sans joueurs, au même climat, garde ses espèces |
| **les naissances** du chevreuil, du cerf | le jour médian des naissances de l'année | du 10 mai au 24 juin (chevreuil), du 20 mai au 4 juillet (cerf) | Andersen et al. 1998 ; Clutton-Brock et al. 1982 |
| **les cigognes** | le jour où la migration d'automne commence, celui où elles reviennent | du 3 août au 12 septembre ; du 14 février au 10 avril | les dates connues de la cigogne blanche |
| **les prédateurs** | pour chaque mammifère carnivore d'au moins 500 g : son nombre par 10 000 kg de proies (les vertébrés que le moteur lui laisse manger, poissons compris, là où il vit), rapporté à la loi. Le loup, l'ours, les lynx et le glouton sont dits à part : en Europe, ce sont les hommes qui les tiennent bas, et sans joueurs ils doivent remonter vers la loi | l'écart médian à moins d'un facteur 3 | Carbone et Gittleman 2002 (Science 295) : 89,1 × masse^−1,05 carnivores par 10 000 kg de proies, mesuré sur 25 espèces |
| **aucune espèce ne fond ni ne s'emballe** | les espèces qui finissent leur dernière année sous la moitié ou au-dessus du double de l'année d'avant | aucune (limite : au plus 5) | un monde sans joueurs, au même climat |
| **les grands carnivores remontent** | la croissance par an du loup, des lynx, de l'ours, du glouton (la moyenne de la dernière année, rapportée à celle de la première) | chacun croît d'au moins 2 % par an : sans joueurs, rien ne les tient bas | le loup remonte de 5 à 10 % par an en Europe, là où on le laisse (LCIE). (Leur écart à la loi des prédateurs bouge avec leurs proies : il est donné, pas noté) |
| *garde-fou* : **la loi de Damuth** | la pente entre la densité et la masse des mammifères | −0,75 ± 0,15 | Damuth 1981. L'assemblage l'a posée : le moteur ne doit pas la défaire |

Chaque test passe (✓), est limite (≈, à moins de deux fois la tolérance) ou échoue (✗). **Un échec est un renseignement, pas une panne** : il dit ce que le moteur ne sait pas encore faire, et où chercher.

```
node outils/etalon.js [--monde europe] [--ans 3] [--sortie etalon/europe/AAAA-MM-JJ.json]
node outils/etalon.js --ans 1 --jours 30      # un essai court (les saisons ne diront rien)
```

Le point de départ est toujours l'amorce : deux lancements donnent le même rapport. Une année d'Europe prend environ 50 minutes sur un ordinateur.

## Le premier rapport

Deux années d'Europe, du 17 novembre 2026 au 16 novembre 2028, avant la dispersion de chaque espèce (plus bas) :

| | test | ce qu'il a donné |
| --- | --- | --- |
| ≈ | la stabilité | 89 % des espèces à moins d'un facteur 2, aucune extinction. Les plus loin sont les insectes chasseurs (les coccinelles ×0,02, les araignées ×0,02, les libellules ×0,04), qui s'effondrent ; quelques pollinisateurs montent (les syrphes ×5, les papillons ×3,6) ; les rapaces baissent (l'épervier ×0,17, la buse ×0,31, le milan royal ×0,32) |
| ✓ | les naissances du chevreuil | le 24 juin (la cible : du 10 mai au 24 juin) ; l'essentiel en mai, juin et juillet |
| ✓ | les naissances du cerf | le 24 juin (la cible : du 20 mai au 4 juillet) |
| ✗ | le départ des cigognes | le 28 octobre, au lieu d'août. Le moteur fait partir les hivernants à la fin de l'automne thermique ; une cigogne part avant le froid, quand les jours raccourcissent et que la nourriture baisse |
| ✓ | le retour des cigognes | le 2 mars |
| ≈ | les prédateurs | ×5,8 en fin de course (×2,5 au départ). La mesure comptait alors les seuls oiseaux et mammifères pour proies : les phoques et les dauphins, qui vivent de poissons, sortaient des dizaines de fois au-dessus de la loi. Avec les poissons, au départ : ×1,9 |
| ✓ | garde-fou : Damuth | −0,645 (au départ −0,697) |

Ce que l'étalon dit de faire, dans l'ordre :
1. **les insectes chasseurs** : ils meurent de faim ;
2. **les rapaces** : le calage d'un seul jour, en novembre, ne voit pas l'année de leurs proies ;
3. **le départ des migrateurs** : une fenêtre par espèce, liée à la durée du jour ;
4. **un calage sur une année entière** (docs/52).

## Le deuxième rapport, après les corrections

Ce que l'étalon a demandé a été fait (docs/52) :
- le calage sur une année entière : une passe sur un jour, puis cinq passes sur une année ;
- le repos d'hiver des bêtes à sang froid ;
- la concurrence entre chasseurs selon leur masse ;
- les migrateurs qui partent quand les jours raccourcissent, et la niche d'été des oiseaux ;
- la survie des jeunes d'un amphibien ;
- les buveurs de sang ;
- la dispersion de chaque espèce.

Deux années, du 17 novembre 2026 au 16 novembre 2028, sur l'amorce calée :

| test | premier rapport | deuxième rapport |
| --- | --- | --- |
| la stabilité | ≈ 89 % | ✓ 97 % des espèces à moins d'un facteur 2 de leur année d'avant, aucune extinction |
| les naissances du chevreuil | ✓ 24 juin | ✓ 24 juin |
| les naissances du cerf | ✓ 24 juin | ✓ 24 juin |
| le départ des cigognes | ✗ 28 octobre | ✓ 25 août |
| le retour des cigognes | ✓ 2 mars | ✓ 8 mars |
| les prédateurs | ≈ ×5,8 | ✓ ×1,7 (au départ ×2,0) |
| *garde-fou* : Damuth | ✓ −0,645 | ✓ −0,699 |

**Ce qui compte dans ce 7 sur 7, et ce qui ne compte pas.**
- **La stabilité est en partie calée.** Le calage a vu la première année. Le test compare la deuxième à la première, et la deuxième, le calage ne l'a pas vue.
- **Le départ des cigognes vient d'un seuil commun à tous les migrateurs**, pas réglé sur elles. Le test reste donc un vrai test.
- **Ce que l'étalon ne note pas encore :**
  - quelques espèces fondent toujours, sous le facteur 2 qui fait échouer :
    - les coccinelles (×0,10 par an) et les araignées (×0,21) ;
    - les méduses (×0,32) ;
    - les rapaces : l'épervier ×0,34, le milan royal ×0,48, la buse ×0,50, l'autour ×0,55.

    Le calage les a menées à ses bornes, sans les rattraper : ce n'est plus un réglage, c'est un mécanisme qui manque. Pour les rapaces, il faut sans doute regarder leurs proies d'hiver ;
  - les grands carnivores s'éloignent de la loi au lieu de s'en approcher : le loup ×0,042 → ×0,032, le lynx boréal ×0,16 → ×0,12, le lynx pardelle ×0,83 → ×0,32. Sans joueurs, leurs proies croissent plus vite qu'eux. Un test devrait le dire.

## Une expérience : le retour du loup

`node outils/etalon.js --experience loup` prend un morceau de l'Europe (la France, l'Italie, la Suisse, Monaco : 96 lieux) en 1992. La France et la Suisse n'ont plus un loup, l'Italie en a environ 30 % d'aujourd'hui (≈ 350, ils étaient environ 400 vers 1990). Avec le loup, on garde ses grandes proies : les ongulés, les lièvres, le lapin, la marmotte, le castor. On laisse les autres carnivores et les plantes, pour aller vite : 31 ans en quatre minutes. On compare ensuite à ce qu'a vu l'Office français de la biodiversité :
- le premier loup dans le Mercantour en 1992 ;
- une centaine vers 2008 ;
- environ 1 100 en 2023.

**Ce que l'expérience a trouvé.** Avec une même chance de fonder un lieu voisin pour toutes les espèces (`regles.colonisation`, ~1,5 % par an), l'Italie a suivi la réalité : de 353 loups à 3 576 en 2023, quand on en compte environ 3 300. La France, en revanche :
- le loup y arrive en 1994 ;
- il reste trente ans dans un seul lieu, et compte 162 bêtes en 2023.

En vrai, il a gagné les Alpes, la Provence, le Jura, les Vosges, les Pyrénées. Le moteur ne savait pas qu'un jeune loup part à des centaines de kilomètres, un chevreuil à quelques dizaines.

**La dispersion** (`plan.dispersion`, docs/52), depuis :
- la plus longue dispersion d'un mammifère suit sa masse (Sutherland et al. 2000, *Conservation Ecology* 4) : 40,7 × M^0,81 km pour un carnivore, 3,31 × M^0,65 km pour un herbivore ou un omnivore. Un oiseau qui vole porte à 300 km ;
- le front d'une espèce qui gagne du terrain avance chaque année de cette distance / 25 ;
- la chance de fonder un lieu voisin, par an, est cette avance rapportée à la distance entre deux lieux (la maille : ~270 km).

Cela donne au loup 5,9 fois la règle du monde, au lynx 4,6, au cerf 0,85, au chevreuil 0,23, au lapin 0,05.

| | 1996 | 2005 | 2008 | 2014 | 2020 | 2023 |
| --- | --- | --- | --- | --- | --- | --- |
| loups de France, simulés | 18 | 82 | 127 | 294 | 639 | 916 |
| loups de France, réels (OFB) | ~20 | ~60 | ~150 | ~300 | ~580 | ~1 100 |

Les trois tests du loup passent : il arrive en 1994, la centaine est atteinte en 2007, il y en a 916 en 2023.

**Avec les règles du deuxième rapport**, le loup de France passe par 114 bêtes en 2008, 416 en 2018 et 682 en 2023 (~150, ~430, ~1 100 en vrai) : les trois tests passent toujours. L'Italie plafonne désormais vers 2 000 loups en 2023, quand on en compte environ 3 300.

**Ce que vaut ce résultat.** La seule constante libre, le « / 25 », a été posée d'avance d'après la vitesse connue du front du loup en France (20 à 30 km par an). Elle a marché du premier coup, sans qu'on la retouche. Le loup a donc servi à la régler, et ne la prouve pas. Il faut une autre expansion pour la vérifier.

## Chaque dimanche

`.github/workflows/etalon.yml` fait vivre l'Europe trois années chaque dimanche, puis refait le retour du loup. Le rapport va dans le résumé de l'action et sur la branche `etalon` (`etalon/europe/AAAA-MM-JJ.json`, et `index.json` qui les liste), jamais sur `main`. Le monde hébergé n'en voit rien.

Une modification du moteur peut aussi passer l'étalon à la main avant d'arriver dans Orvane. Il suffit de lancer l'action (« Run workflow », avec le nombre d'années) sur sa branche.

## Ce qui reste à faire pour qu'il étalonne vraiment Orvane

**Les mêmes constantes.** L'Europe tourne avec des règles à elle (docs/52) :

| | l'Europe | Orvane |
| --- | --- | --- |
| la ration d'un prédateur (`besoin`) | 6 | 0,35 |
| la viande qui fait des petits (`conversion`) | 0,06 | 0,25 |
| la demi-satiété (`demi_satiete`) | 5 fois le besoin | 30 fois |

S'y ajoutent les petites proies et le métabolisme. Tant que ces écarts existent, l'étalon valide les **mécanismes** du moteur, pas les **réglages** d'Orvane. Pour qu'il les valide, il y a deux voies :
- Orvane adopte les valeurs réelles, par une genèse nouvelle (son monde vivant ne change pas d'un coup) ;
- chaque écart reste dit, comme un choix de fiction.

**D'autres expériences.** La réalité connaît l'issue d'autres histoires :
- une chasse soutenue du chevreuil ;
- la morue, qui mûrit plus tôt sous la pêche : une évolution documentée, que la génétique continue du moteur devrait reproduire ;
- l'expansion du chacal doré, des Balkans jusqu'en France (2017). Elle vérifierait la dispersion que le loup a servi à régler (plus haut).

**Un découpage dans le temps.** Caler sur les effectifs d'une année (2010), puis voir si le moteur retrouve les tendances qui suivent (le loup et le sanglier en hausse).
