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
| **les prédateurs** | pour chaque mammifère carnivore d'au moins 500 g : son nombre par 10 000 kg de proies (les oiseaux et les mammifères que le moteur lui laisse manger, là où il vit), rapporté à la loi | l'écart médian à moins d'un facteur 3 | Carbone et Gittleman 2002 (Science 295) : 89,1 × masse^−1,05 carnivores par 10 000 kg de proies, mesuré sur 25 espèces |
| *garde-fou* : **la loi de Damuth** | la pente entre la densité et la masse des mammifères | −0,75 ± 0,15 | Damuth 1981. L'assemblage l'a posée : le moteur ne doit pas la défaire |

Chaque test passe (✓), est limite (≈, à moins de deux fois la tolérance) ou échoue (✗). **Un échec est un renseignement, pas une panne** : il dit ce que le moteur ne sait pas encore faire, et où chercher.

```
node outils/etalon.js [--monde europe] [--ans 3] [--sortie etalon/europe/AAAA-MM-JJ.json]
node outils/etalon.js --ans 1 --jours 30      # un essai court (les saisons ne diront rien)
```

Le point de départ est toujours l'amorce : deux lancements donnent le même rapport. Une année d'Europe prend environ 50 minutes sur un ordinateur.

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
