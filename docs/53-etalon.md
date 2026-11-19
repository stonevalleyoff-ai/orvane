# 53. L'étalon : l'Europe note le moteur

Le monde d'Orvane est inventé, et rien ne dit si ses lynx mangent trop ou si ses hivers usent assez. L'Europe (docs/52) tourne sur le même moteur, avec de vraies espèces et un vrai climat : là, la réalité connaît la réponse. L'étalon fait vivre l'Europe plusieurs années, sans joueurs, depuis son amorce. Il note ensuite le moteur sur ce que la réalité sait **et que l'assemblage n'a pas calé**.

Cette dernière condition est toute la difficulté. L'assemblage cale la place de chaque brouteur et l'efficacité de chasse de chaque prédateur pour que les effectifs comptés soient leur équilibre. « L'Europe a 31 000 loups » est donc vrai par construction et ne prouve rien du moteur. L'étalon ne regarde que ce qui doit émerger de lui-même.

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

Le point de départ est toujours l'amorce : deux lancements donnent le même rapport. Une année d'Europe prend environ 25 minutes sur un ordinateur (un jour : 4 s).

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

## Le troisième rapport : les insectes chasseurs

Le deuxième rapport laissait fondre les coccinelles (×0,10 par an), les araignées (×0,21) et les méduses, quoi que fasse le calage. Le diagnostic a mesuré la satiété qu'aurait chaque chasseur seul, sans un concurrent. Seule, l'araignée n'aurait eu que 1,5 % de sa satiété, quand il lui en faut 67 %. Aucune adresse de chasse ne pouvait donc la sauver : l'adresse ne compte que devant les concurrents. Trois causes :
- **les proies n'étaient pas là** : GBIF voit mal les invertébrés, et l'assemblage ne posait une guilde que là où quelqu'un l'avait signalée. Les pucerons étaient sur 128 lieux, les coccinelles qui les mangent sur 231. Une guilde d'invertébrés vit désormais partout où est son milieu (docs/52) ;
- **les densités étaient des nombres ronds**, de dix à cent fois trop bas : le monde avait autant d'araignées que d'insectes à manger (0,15 g/m² contre 0,36). Elles viennent désormais de la littérature (les fourmis, Schultheiss et al. 2022 ; les collemboles, les acariens et les cloportes, Petersen et Luxton 1982 ; les carabes, Lövei et Sunderland 1996…). La première proie des araignées manquait, et a été ajoutée : les collemboles et les acariens du sol, des dizaines de milliers par m² ;
- **le moteur ne regardait que ce qui est sur pied.** Le besoin d'un chasseur se compte sur ~120 jours, et un puceron se refait huit fois dans ce temps. `regles.renouvellement` (docs/52) : une proie offre ce qui est sur pied et ce qui en naît pendant ces jours-là.

L'araignée seule passe de 1,5 % à 32 % de sa satiété. Il lui manque encore la moitié : elle doit trouver son équilibre plus bas que ses effectifs comptés. La truite, la perche, le maquereau ne sont plus à la borne du calage.

Le calage sur l'année avance désormais par moitiés pour une espèce qui passe d'un côté à l'autre (docs/52) : les papillons passaient de ×10 à ×0,11. Trois passes : un écart médian de ×1,08 d'une année à l'autre, 90 % des espèces sous ×1,48.

Deux années, du 17 novembre 2026 au 16 novembre 2028 :

| | test | ce qu'il a donné |
| --- | --- | --- |
| ✓ | la stabilité | 98 % des espèces à moins d'un facteur 2, aucune extinction |
| ≈ | aucune espèce ne fond ni ne s'emballe | 4 : les papillons ×2,2, les coccinelles ×0,46, les araignées ×0,47, les carabes ×0,50 (les méduses ×0,503, juste au-dessus). Les insectes chasseurs perdaient 80 à 90 % par an : ils perdent la moitié la deuxième année, et ralentissent |
| ✓ | les naissances du chevreuil, du cerf | le 24 juin, le 24 juin |
| ✓ | les cigognes | parties le 25 août, revenues le 8 mars |
| ✓ | les prédateurs | ×1,6 de la loi en fin de course (au départ ×2,0) |
| ✗ | les grands carnivores remontent | le loup −0,8 % par an, le lynx boréal +0,4 %, le lynx pardelle −3,0 %, l'ours +5,4 %, le glouton −6,2 %. Il leur fallait au moins +2 % |
| ✓ | garde-fou : Damuth | −0,700 |

**Ce que dit l'échec des grands carnivores.** Il est d'abord celui de l'assemblage : le calage sur l'année laisse de côté le loup, l'ours, les lynx et le glouton pour ne pas les figer, mais le calage d'un jour les mettait, comme les autres, à l'équilibre de leurs effectifs comptés. Le loup y recevait une adresse de 0,38 : à l'équilibre là où les hommes le tiennent, il ne pouvait pas remonter. Le calage d'un jour doit les laisser à l'adresse du moteur (1). Ce qu'ils feront alors dira ce que le moteur sait d'eux.

**Avec l'adresse du moteur** (une quatrième passe d'un an, depuis la troisième ; 90 % des espèces sous ×1,41 d'une année à l'autre). Deux années encore :

| | test | ce qu'il a donné |
| --- | --- | --- |
| ✓ | la stabilité | 98 % des espèces à moins d'un facteur 2, aucune extinction |
| ≈ | aucune espèce ne fond ni ne s'emballe | 4, toutes au bord : les coccinelles ×0,46, les araignées ×0,46, les carabes ×0,50, les méduses ×0,50. Les papillons ne s'emballent plus |
| ✓ | les naissances, les cigognes | le 24 juin, le 24 juin ; le 25 août, le 8 mars |
| ✓ | les prédateurs | ×1,7 de la loi en fin de course (au départ ×2,0) |
| ✗ | les grands carnivores remontent | **le loup +5,5 % par an**, **l'ours +5,4 %** ; le lynx boréal −6,8 %, le lynx pardelle −15,2 %, le glouton −6,0 % |
| ✓ | garde-fou : Damuth | −0,701 |

Le loup remonte désormais comme il remonte en vrai (de 5 à 10 % par an, là où on le laisse), et l'expérience du loup passe toujours (plus bas). L'échec qui reste est celui du moteur :
- **les lynx** : à l'adresse du moteur, ils ne trouvent pas de quoi vivre aux effectifs comptés. Le calage d'un jour leur donnait une adresse de 2,1 (le boréal) et de 6,7 (le pardelle) pour qu'ils tiennent : ils perdent leurs proies devant les renards et les rapaces, qui mangent les mêmes lièvres et les mêmes lapins. En vrai, un lynx tue le renard qu'il croise, et le chasse de son territoire. Le moteur ne connaît pas cette domination d'un grand chasseur sur les petits qui mangent comme lui ;
- **le glouton** : en vrai, il vit l'hiver des carcasses que laissent les loups et les lynx. L'Europe ne fait pas encore vivre ses charognards des morts (`regles.cadavres = 0`).

**La part de chair et la domination** (docs/52). Le premier concurrent du lynx boréal était… le sanglier (87 % du poids qui pesait sur lui) : un omnivore cherchait autant de proies qu'un carnivore de sa masse. Il ne cherche plus que sa part de chair (`regles.viande_part`). Le lynx pardelle perdait ses lapins devant la genette et le renard : entre chasseurs à sang chaud, le plus grand domine désormais (`regles.domination = 0,5`). Recalé (un jour, trois années), deux années encore : 7 ✓, 1 ≈, 1 ✗, mais les lynx ne s'effondrent plus.

| | sans les deux règles | avec |
| --- | --- | --- |
| le loup | +5,5 % par an | **+7,5 %** |
| le lynx boréal | −6,8 % | −1,2 % |
| le lynx pardelle | −15,2 % | −1,6 % |
| l'ours | +5,4 % | +5,4 % |
| le glouton | −6,0 % | −6,0 % |

Les autres tests ne bougent pas (la stabilité 98 %, les naissances, les cigognes, les prédateurs ×1,7, Damuth −0,698) ; au bord du test des espèces qui fondent ou s'emballent : les papillons ×2,1, les coccinelles, les araignées et les carabes ×0,47 à ×0,50. Le retour du loup passe toujours : 106 loups en France en 2008, 315 en 2018, 460 en 2023 ; **l'Italie arrive à 3 030 loups en 2023, quand on en compte ~3 300**.

Ce que l'étalon dit de faire maintenant :
1. ~~**la domination entre chasseurs**~~ (fait : les lynx tiennent presque ; il leur manque encore de remonter) ;
2. **les charognards** : le glouton, les vautours, les corvidés vivent en partie des morts ;
3. **le reste des insectes chasseurs** : seule, l'araignée n'a que 32 % de sa satiété. Elle doit trouver son équilibre plus bas que ses effectifs comptés, et le trouve lentement (la moitié par an).

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

**Les proies à leur équilibre** (depuis le troisième rapport). Le morceau d'Europe de l'expérience n'a ni plantes ni autres bêtes, mais gardait la place que l'assemblage avait calée aux proies dans l'Europe entière. Chaque recalage de l'Europe changeait donc le loup de France du simple au quadruple, sans que le loup y soit pour rien : 682 loups en 2023 au deuxième rapport, puis 166 avec l'amorce du troisième, quand les nouvelles densités d'insectes avaient fait baisser de moitié la place calée des ongulés. L'expérience met désormais les brouteurs à leur équilibre dans son morceau d'Europe, comme le fait l'assemblage (un jour de moteur, quatre fois : leurs naissances égalent leurs morts et les leurs mangés). Le loup n'est pas touché.

| | 1996 | 2005 | 2008 | 2014 | 2018 | 2020 | 2023 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| loups de France, simulés (troisième rapport) | 18 | 56 | 86 | 181 | 274 | 328 | 425 |
| … le loup à l'adresse du moteur (quatrième passe) | 18 | 75 | 113 | 230 | 339 | 398 | 497 |
| loups de France, réels (OFB) | ~20 | ~60 | ~150 | ~300 | ~430 | ~580 | ~1 100 |

Les trois tests passent : il arrive en 1994, la centaine est atteinte en 2008, il y en a 497 en 2023, sous le réel mais à moins d'un facteur 3. Le front ralentit après 2010, quand le vrai loup gagne les Alpes du Nord, le Jura et les Vosges. L'Italie atteint 2 400 loups en 2023 (~3 300 en vrai).

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
