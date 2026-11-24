# 58. Vers l'étalon Monde

L'Europe note le moteur sur ce que la réalité sait (docs/53). Le but est d'en faire autant pour le monde entier : un étalon qui juge le moteur sur tous les continents à la fois. Ce chapitre dit comment, et dans quel ordre.

## D'abord, ce qui est faux partout

Un défaut du moteur qui touche toutes les espèces se paie autant de fois qu'il y a de continents à recaler. Et l'étalon d'un continent ne vaut rien si le moteur se trompe partout de la même façon. Les défauts globaux se corrigent donc d'abord, tant qu'il n'y a que l'Europe. L'Europe et Isle Royale (docs/57) en ont trouvé quatre :

1. **La ration des prédateurs** (corrigée, ci-dessous). Un loup du moteur mangeait 0,63 kg par jour, rassasié.
2. **La démographie des proies.** La natalité que pose l'assemblage ne supporte pas les prélèvements réels : 66 taux de chasse sur 126 sont bornés (docs/56). Chez une bête chassée, la chasse remplace une partie de la mort naturelle ; dans le moteur, elle s'y ajoute.
3. **Les effectifs posés.** Les tableaux de chasse les montrent trop bas : il y a 7,9 fois plus d'élans tués en Estonie que l'assemblage n'en pose. Sur Isle Royale, l'orignal calé en Europe tient deux fois moins de place que sur l'île vraie.
4. **Ce qu'un chasseur tue et ce qu'il mange.** Le moteur fait manger au chasseur les quatre cinquièmes de ce qu'il tue, d'un campagnol comme d'un orignal, et ce qu'il laisse ne nourrit personne. Un loup d'Isle Royale tue de deux à quatre fois ce qu'il brûle : il ne mange ni les os ni la panse, et les corbeaux emportent de 17 à 37 % de chaque carcasse (docs/57).

## La ration, d'après ce que brûlent les bêtes

La ration d'un monde réel (`regles.besoin`) était réglée à la main : « un loup mange ~1 kg par jour ». Elle vient désormais d'une mesure indépendante de l'étalon : le métabolisme de terrain, ce que dépense une bête en liberté, mesuré à l'eau doublement marquée (Nagy 2005, *J. Exp. Biol.* 208) :
- un mammifère : 4,82 × M^0,734 kJ par jour, M en grammes (79 espèces) ;
- un oiseau : 10,5 × M^0,681 (95 espèces).

Une proie rend 5,6 kJ par gramme mangé : 18 % de protéines et 7 % de graisse, aux facteurs d'Atwater. Le chasseur en mange les quatre cinquièmes. La ration est donc de 20,6 kg de proies par cycle de référence et par kg^0,75, au lieu de 6. Un loup de 29 kg tue ainsi 2,2 kg de proies par jour.

Un oiseau brûle plus qu'un mammifère de sa masse : son `plan.metabolisme` est le rapport des deux métabolismes de terrain. Il vaut 1,9 à 10 g, 1,5 à un kilo, 1,4 à cinq kilos. La conversion (`0,06`) ne change pas : ce qui fait les petits d'un prédateur, c'est sa natalité, une fois nourri.

**Ce que la ration a montré** (docs/53, le septième rapport) :
- **sur Isle Royale**, la moyenne de 1980 à 2018 passe de 69 loups à 25,5 (18 en vrai), mais deux erreurs s'y compensent : trop peu d'orignaux, et un loup qui en tue trop peu (docs/57) ;
- **en Europe**, recalée avec elle, le calage ne tient plus les chasseurs qu'en mettant l'adresse de 45 sur 84 à sa borne (contre 32), et l'étalon passe à 9 ✓, 2 ≈, 1 ✗ : les chasseurs d'insectes et les poissons chasseurs fondent, et le rendement des chasseurs tombe sous celui des vraies bêtes ;
- **le loup de France** compte 314 bêtes en 2023, contre 497 avec l'ancienne ration (~1 100 en vrai).

La ration est juste ; ce qu'elle montre, c'est que les proies du moteur ne suffisent pas aux chasseurs comptés. La démographie des proies et les effectifs posés (2 et 3) passent devant. Mais la consolidation (docs/59) vient d'abord : le protocole verrouillé, puis les ablations des règles, avant toute correction nouvelle.

## L'étalon Monde : une fédération de continents

Un seul monde planétaire, à la résolution de l'Europe, demanderait des heures par année simulée ; l'Europe en prend déjà 25 minutes. L'étalon Monde sera donc :
- **un monde par continent**, chacun avec son amorce et son étalon, tous lancés en parallèle chaque dimanche (une tâche de l'action par continent, sous la limite de six heures) ;
- **un rapport Monde** qui les réunit, avec deux sortes de tests :
  - **des lois globales**, vérifiées sur tous les continents à la fois : la loi des prédateurs (Carbone et Gittleman), Damuth, le rendement des chasseurs ;
  - **les expériences de chaque continent** : le retour du loup en France, Isle Royale, le cycle du lynx et du lièvre, l'expansion du coyote, le front du crapaud buffle ;
- **un pipeline `outils/terre` générique** : une région au choix, au lieu de la fenêtre de l'Europe. Ses sources sont déjà mondiales : ETOPO, CRU, WorldCover, GBIF, EltonTraits, Amniote, PanTHERIA, AnAge.

## L'ordre des continents

1. **L'Amérique du Nord.** Isle Royale d'abord (docs/57), puis le continent. C'est elle qui a le plus de tests indépendants.
2. **L'Australie**, pour ses fronts d'invasion (le crapaud buffle, le lapin) et l'Atlas of Living Australia.
3. **L'Afrique**, pour ses grands mammifères (le Serengeti, les gnous après la peste bovine).
4. **L'Amérique du Sud et l'Asie**, là où les données le permettent.

## Les hommes, sur chaque continent

Sans eux, l'Amérique du Nord serait faussée, elle qui est plus chassée encore que l'Europe. La chasse est faite (docs/56). Il reste la régulation des grands carnivores, le braconnage, les lâchers et la route, puis les mêmes données pour chaque continent.

## Les pièges

- **Les licences.** Le dépôt n'accepte que des données utilisables commercialement. Cela exclut l'UICN, WorldClim et FishBase, qui couvrent pourtant le monde entier.
- **Les effectifs comptés.** Ce sera le travail le plus long, pays par pays, continent par continent, et ils sont souvent sous les vrais.
- **Le temps de calcul.** Chaque recalage prend environ une heure et demie par continent, et chaque étalon une heure. Un défaut global corrigé tard se paie sur chaque continent.
