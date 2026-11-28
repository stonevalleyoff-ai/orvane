## Les ablations : orvane, cycle 65 (240 cycles, 3 graines)

Le témoin : 381 lignées animales (écart entre graines 14), 103,7 carnivores, 21 624 t, Shannon 2,383, 47 % de lignées stables, 2,7 éteintes, 83,7 nées, 2,84 formes par lignée ; un cycle en 40,96 s. Lu selon le plan 5 (938658c0ef3c…). Seules les règles dites (max_phenotypes = 10), pas tout le plan.

| essai | nature | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | formes | coût | lecture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| max_phenotypes = 10 | constante | +0,3 | -1 | +2,8 % | +0,009 | +0,008 | +0,3 | +0,7 | -15,6 % | +12 % | elle compte : à cette valeur, formes bouge |

Les écarts sont ceux de l'essai au témoin, en moyenne sur les graines (la biomasse et les formes, en part de celles du témoin). Les formes : le nombre effectif de phénotypes d'une lignée, en moyenne (– : un rapport fait sans elles). Le coût : la part d'un cycle qu'on gagne sans la règle, au-delà du bruit des durées (≈ : dans ce bruit).

### En chemin, tous les 30 cycles

Le témoin au fil des cycles (entre parenthèses, le cycle du monde ; et sa saison) :

| cycle | saison | lignées | carnivores | biomasse | Shannon | stables | formes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 (95) | automne | 302,3 | 86,7 | 16 818 t | 2,263 | 92 % | 2,51 |
| 60 (125) | hiver | 308,7 | 87,7 | 12 794 t | 2,306 | 64 % | 2,67 |
| 90 (155) | printemps | 319,3 | 88,7 | 16 838 t | 2,238 | 63 % | 2,76 |
| 120 (185) | été | 328 | 89,7 | 19 668 t | 2,267 | 57 % | 2,77 |
| 150 (215) | automne | 336,3 | 93 | 17 545 t | 2,366 | 53 % | 2,79 |
| 180 (245) | hiver | 348 | 95,3 | 12 755 t | 2,409 | 45 % | 2,82 |
| 210 (275) | printemps | 363 | 98,7 | 17 945 t | 2,353 | 47 % | 2,85 |
| 240 (305) | été | 381 | 103,7 | 21 624 t | 2,383 | 47 % | 2,84 |

Les écarts de chaque essai au témoin, au même cycle (la biomasse et les formes, en part de celles du témoin), et ce qui bouge, par la même lecture :

| cycle | essai | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | formes | ce qui bouge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | max_phenotypes = 10 | 0 | +1 | +0,2 % | +0,001 | -0,002 | 0 | 0 | -8,3 % | formes |
| 60 | max_phenotypes = 10 | -2 | +0,7 | +0,6 % | -0,004 | -0,015 | 0 | -2 | -11,5 % | formes |
| 90 | max_phenotypes = 10 | 0 | +0,3 | +1,3 % | -0,009 | -0,01 | +0,7 | +0,7 | -15,1 % | formes |
| 120 | max_phenotypes = 10 | +3 | +1 | +1,3 % | -0,007 | +0,01 | +0,3 | +3,3 | -16 % | formes |
| 150 | max_phenotypes = 10 | +3,3 | 0 | +1,5 % | -0,003 | +0,011 | 0 | +3,3 | -16 % | formes |
| 180 | max_phenotypes = 10 | +1,3 | +0,3 | +1,1 % | +0,005 | +0,006 | +0,3 | +1,7 | -15,9 % | formes |
| 210 | max_phenotypes = 10 | +1,7 | -1 | +2 % | +0 | +0,011 | 0 | +1,7 | -16,4 % | formes |
| 240 | max_phenotypes = 10 | +0,3 | -1 | +2,8 % | +0,009 | +0,008 | +0,3 | +0,7 | -15,6 % | formes |
