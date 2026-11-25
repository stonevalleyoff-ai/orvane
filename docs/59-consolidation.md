# 59. La consolidation

Le 24 novembre 2026, Orvane a été passé au crible d'un critique (« Orvane, vu par un critique »). Deux plans en sont nés : un plan de consolidation en six étapes, et un plan d'évolution ouverte, dont la phase 0 est un état de référence. La décision qu'ils recommandent l'un et l'autre : **consolider avant d'étendre**. Ce chapitre dit ce qui est fait (les étapes 01 et 02, la phase 0) et ce qui vient.

## Le principe

On ne change jamais une règle ou une constante du moteur pour retrouver une population cible. On cherche la cause du défaut, on éprouve le mécanisme seul, puis on vérifie ses conséquences sur plusieurs mondes.

Une extinction n'est pas un défaut en soi : un monde qui évolue en connaît. Le risque est de ne pas savoir à quoi l'attribuer : à la sélection, à un déséquilibre écologique ou à une régression du code. Tout ce qui suit sert à le savoir.

## 01. Sécuriser l'existant

### Le rejeu, au bit près

Le moteur est déterministe : tout son hasard vient de la graine du monde et du numéro du cycle. Le même état, les mêmes pressions et la même durée donnent le même monde, au bit près, dans un processus comme dans un autre. Un cycle d'Aube (5 Mo), joué deux fois dans deux processus, rend la même empreinte. `bancs/rejeu.js` le vérifie à chaque PR, et chaque nuit sur le monde d'Orvane.

**Le journal** (`mondes/<id>/journal.json`, `hebergement/journal.js`). Chaque cycle hébergé y laisse une ligne :
- le cycle, sa date, et la naissance du monde ;
- le commit du code qui l'a fait tourner, et s'il était modifié à la main ;
- la version du contrat et la graine ;
- l'empreinte des règles du monde ;
- l'empreinte de l'état que le moteur a reçu, et les pressions des jeux après le tampon (au-delà de 200 000 caractères, seulement leur empreinte) ;
- la durée du cycle, et l'empreinte de ce que le moteur a rendu, avant que l'hébergement n'y touche (la date, les arrivées d'une fusion).

Il garde les 400 derniers cycles. Un monde né à nouveau recommence le sien.

**Rejouer un cycle** :

```
node outils/rejouer.js <l'etat.json d'avant> <journal.json>
```

L'état d'avant vient d'une sauvegarde. L'outil trouve la ligne du journal qui part de cet état, redonne au moteur le même état et les mêmes pressions, et compare ce qu'il rend à ce que dit le journal : 0 s'il le rend au bit près, 1 s'il rend un autre monde, 2 s'il ne peut pas rejouer (un autre état, des pressions trop grosses). Il faut le même code : le journal dit son commit.

### Les sauvegardes et les archives

Chaque passe du cycle garde l'état des mondes qui ont tourné pendant 30 jours (l'artefact « etat-mondes », docs/19). Au-delà, rien ne restait : la branche `publication` n'a pas d'historique.

**Les archives** (`.github/workflows/archives.yml`). Le 1er de chaque mois, et à la demande, l'état publié de chaque monde devient une release du dépôt, « archive-AAAA-MM-JJ », marquée comme préversion et gardée sans limite de durée. Son étiquette pointe sur le commit de `main` qui faisait tourner les mondes : le code et l'état vont ensemble. Elle porte :
- `etat-mondes.tar.gz` : les dossiers des mondes, avec leur journal ;
- `reference.json` : la référence de ce jour-là (plus bas) ;
- le dernier rapport de l'étalon.

**Revenir à une archive** : Actions › cycle › Run workflow, et dans « restaurer », son nom. La passe repart de son état, comme d'une sauvegarde de 30 jours.

La première archive se fait à la main, une fois ces changements dans `main` : Actions › archives › Run workflow.

### Le moratoire

Le moteur garde ses 50 règles telles quelles jusqu'à ce que les ablations (03) disent ce que vaut chacune. Le protocole (plus bas) les gèle : `bancs/protocole.js` échoue si une règle s'ajoute ou disparaît sans une version du protocole qui le dit.

Une constante corrigée d'après une mesure indépendante reste permise : c'est ce qu'a été la ration (docs/58), venue du métabolisme de terrain et non d'une cible. Un défaut du code aussi.

### La version de référence

`version.yml` publie une version (l'étiquette vX.Y.Z et sa page) quand `package.json` en change. La dernière est v1.0.0, du 7 novembre ; tout ce qui est venu depuis est « à venir » dans `CHANGELOG.md`. Publier une version de référence (v1.1.0 : le contrat a gagné `monde.hommes` et d'autres ajouts) est une décision de l'auteur : une version est publique, et les jeux l'installent.

## 02. Reconstruire la validation : le protocole

`etalon/protocole.json` dit, **avant qu'on lance l'étalon**, ce que mesure chaque test, sa cible, sa tolérance, d'où viennent ses données, et ce qu'il prouve. L'étalon (`outils/etalon.js`) y lit ses seuils, et n'en a pas d'autres.

**Le verrou.** L'empreinte du protocole (le SHA-256 de tout ce qu'il dit) doit être celle de sa dernière version. Changer une cible, une tolérance, une nature ou une donnée, c'est écrire une version de plus, datée, avec sa raison :

```
node outils/protocole.js --nouvelle-version "pourquoi"
node outils/protocole.js            # ce que dit le protocole, et s'il tient
```

Un protocole changé sans nouvelle version fait échouer `bancs/protocole.js`, et l'étalon refuse de juger (code 3, avant de faire tourner quoi que ce soit). `--protocole-libre` le fait juger quand même, pour un essai : son rapport le dit. Chaque rapport porte la version et l'empreinte du protocole qu'il a suivi.

**La nature de chaque test**, d'après son histoire (docs/53, 56, 57) :

| nature | ce qu'elle veut dire | les tests (version 1) |
| --- | --- | --- |
| validation | ni ses données ni ses échecs n'ont servi à régler le moteur | les naissances du chevreuil et du cerf, le retour des cigognes, la vague du chacal |
| guide | ses échecs ont conduit à changer le moteur, ou sa mesure a été revue après un premier résultat | le départ des cigognes, la loi des prédateurs, les grands carnivores, les cinq tests d'Isle Royale |
| réglage | ses données ont servi à régler une constante ou un taux | la chasse, le rendement des chasseurs, les trois tests du loup |
| garde-fou | une propriété que le monde ne doit pas perdre | la stabilité, les espèces qui fondent ou s'emballent, la diversité, Damuth |
| calage | ce que l'assemblage n'a pas su caler, compté comme un échec du moteur | les chasseurs à la borne de leur adresse, les taux de chasse bornés |

Sur 23 tests, **quatre seulement sont des validations indépendantes**, et l'une d'elles, la vague du chacal, échoue. C'est ce que disait la critique : un « 10 ✓ » de l'étalon ne prouvait pas ce qu'il semblait prouver. Le protocole le dit désormais à chaque rapport.

**Les données** sont rangées de même. Les entrées font les espèces et les lieux (le climat, les traits, le métabolisme de terrain) ; les données de calage règlent l'assemblage (les effectifs comptés, les tableaux de chasse) ; les données de réglage ont réglé une constante (le rendement des chasseurs, le front du loup) ; les autres valident. Une validation ne peut citer aucune donnée de calage ou de réglage : `bancs/protocole.js` le refuse.

**Le calage, compté comme un échec.** Deux tests de plus disent ce que l'assemblage n'a pas su caler :
- les chasseurs à une borne de leur adresse : 46 sur 84 dans l'amorce de l'Europe, 45 à la borne haute et 1 à la basse (✗) ;
- les taux de chasse que l'assemblage a dû borner : 66 sur 126 (✗).

**Les tests réservés.** Quatre tests sont écrits d'avance, leur critère fixé avant toute simulation : Isle Royale de 1959 à 1979, l'expansion du chien viverrin en Europe, le cycle du lynx et du lièvre, l'expansion du coyote. Rien ne sera réglé sur eux.

**Le même étalon qu'avant.** Avec ses seuils lus au protocole, l'étalon rend les mêmes valeurs et les mêmes verdicts qu'avant, test par test, sur la même amorce : l'Europe (deux années, trois graines : les douze tests d'avant à l'identique, et les deux du calage, ✗), Isle Royale (trois graines), le retour du loup (série comprise) et la vague du chacal.

**Les bilans d'énergie et les relations trophiques** (ce que demande aussi l'étape 02) : le rendement des chasseurs (ce qu'ils font naître de ce qu'ils mangent) et la loi des prédateurs (combien de carnivores vivent de dix tonnes de proies) les mesurent déjà. Ce qui manque : ce que mange vraiment chaque grand chasseur, comparé à ce que disent les études de son régime. Ce sera une version suivante du protocole, avec ses données.

## La phase 0 : l'état de référence

`outils/reference.js` mesure chaque monde d'un dossier, toujours de la même façon :
- son identité : son cycle, sa naissance, sa graine, l'empreinte de son état et de ses règles ;
- sa taille : ses lignées animales vivantes, ses bêtes et leur biomasse, ses plantes, ses lieux ;
- sa diversité : l'entropie de Shannon des parts de biomasse dans chaque lieu, ses phénotypes, la part de ses lignées nées d'une autre ;
- sa stabilité : d'après son historique, la part des lignées à moins d'un facteur 2 de leur effectif d'il y a 30 cycles, et les extinctions ;
- sa performance et sa reproductibilité : le cycle suivant, deux fois, chacun dans son processus : sa durée, sa mémoire, et la même empreinte les deux fois.

```
node outils/reference.js <dossier qui contient mondes/> --sortie reference.json --notes notes.md
```

Chaque archive porte la sienne : d'un mois à l'autre, on compare deux époques d'un monde, ou deux versions du moteur.

**La première référence** (`etalon/reference/2026-11-24.json`) : l'état publié le 24 novembre 2026 à 8 h 27, mesuré avec le moteur du contexte explicite, sur une machine de quatre cœurs (les archives la mesureront chaque mois sur celle de l'action) :

| monde | cycle | lignées animales | bêtes | biomasse (t) | Shannon | stables à 30 cycles | éteintes | un cycle | rejeu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aube | 35 | 112 | 42 812 901 | 5 997 | 2,057 | 98,2 % (sur 4 cycles) | 0 | 50,6 s, 3 844 Mo | ✓ identique |
| europe | 5 | 201 | 3,2 × 10¹⁷ | 262 496 173 | 1,364 | 100 % (sur 4 cycles) | 0 | 5,7 s, 494 Mo | ✓ identique |
| genese-2026 | 3179 | 148 | 77 592 507 | 17 701 | 1,936 | 92,4 % (sur 29 cycles) | 2 | 4,7 s, 317 Mo | ✓ identique |
| genese-7 | 3004 | 99 | 24 763 567 | 3 756 | 2,944 | 100 % (sur 3 cycles) | 0 | 0,4 s, 109 Mo | ✓ identique |
| orvane | 64 | 305 | 127 424 071 | 19 358 | 2,184 | 80,2 % (sur 19 cycles) | 1 | 14,4 s, 1 045 Mo | ✓ identique |
| sv-1 | 3 | 30 | 78 201 | 900 | 1,654 | 100 % (sur 2 cycles) | 0 | 0,1 s, 61 Mo | ✓ identique |

Chaque monde rend le même cycle, deux fois, dans deux processus. La stabilité ne porte que sur l'historique que chaque monde garde (de 2 à 29 cycles ici). À surveiller : un cycle d'Aube prend 3,8 Go de mémoire, près des 4 Go de l'action (son cycle en a déjà manqué, docs/17).

## 04, la première étape : le contexte explicite

Le cœur du moteur gardait son état dans des variables globales : les règles du monde qui tournait (copiées dans `REGLES` au début de chaque cycle, remises à la fin), son pas de temps (`PAS`, `JOURS`) et ses axes (`AX`). Une fonction appelée hors d'un cycle lisait celles du moteur sans le dire, et deux mondes ne pouvaient pas tourner côte à côte.

**Le contexte d'un monde** (`Orvane.contexte(inst)`) : ses règles (celles du moteur, et les siennes par-dessus, une règle-objet complétée d'un niveau), son pas de temps et ses axes. Le cycle le construit une fois et le donne aux quatorze fonctions qui en dépendent (la croissance, l'appétence, la convenance d'un lieu, la route de l'hiver, la dérive, l'apprentissage…). Il ne change plus rien de global : les règles du moteur sortent d'un cycle telles qu'elles y sont entrées.

**Hors d'un cycle**, ces fonctions prennent le contexte qu'on leur donne en dernier argument (`Orvane.croissance(plan, Orvane.contexte(inst))`), et sinon celui du moteur : les règles par défaut, au pas de référence, comme avant.

**Au bit près.** Sept mondes et seize cycles (la mer, Orvane au cycle 44 et au cycle 64, l'Europe au jour et ses 22 règles, sv-1, la genèse 7, Aube), deux mondes entrelacés, et un monde qui ajoute un axe à lui rendent le même monde, empreinte pour empreinte, avant et après. `bancs/rejeu.js` vérifie que deux mondes que tout distingue rendent, entrelacés, chacun le même monde que seul.

**Ce qui reste global**, pour les étapes suivantes :
- trois modules gardent un réglage par monde le temps d'un cycle, et le rendent après : le corps (les organes et les formes du monde, `corps.js`), la mémoire (ses règles, `memoire.js`), la flore (son catalogue, `flore.js`) ;
- la genèse, quelques bancs et le simulateur de joueurs règlent encore le moteur en modifiant `Orvane.REGLES`, devenues les règles par défaut du processus : ils passeront par le monde, ou par une option du cycle.

**Un constat, que le contexte rend visible.** L'étalon mesure la loi des prédateurs avec l'appétence du moteur, et non avec celle de l'Europe : la meute y garde la limite de 1,5 fois sa masse au lieu de 2,5, et les petites proies n'y comptent pas. Le contexte permet de la mesurer avec les règles du monde. C'est un changement de mesure, donc une version du protocole ; il n'est pas fait ici.

## 04, la deuxième étape : le premier module du cœur

Le cycle du moteur (`cycleBrut`) tenait en un seul bloc de 600 lignes, en sept étapes. La troisième, **le partage des proies**, en sort : `moteur/noyau/predation.js`.
- **Ce qu'il reçoit** : le contexte du monde (ses règles, son pas, l'appétence, la part d'un cycle), l'état de chaque lignée, les lieux, et ce que les mécanismes éveillés y ajoutent (les régimes en spectre, la grammaire, l'esprit, le repos d'hiver, la concurrence, la domination, le recouvrement, les machines).
- **Ce qu'il rend** : dans chaque population, sa ration, sa satiété et ce que les prédateurs lui prennent. Il ne touche à rien d'autre.

Le code est déplacé, non réécrit : les mêmes opérations, dans le même ordre. Sept mondes et seize cycles, et le monde à l'axe propre, rendent le même monde au bit près. Dans un navigateur, le cœur se charge par sa balise `<script>`, avant `orvane.js` (l'Observatoire, son Web Worker, le simulateur de joueurs).

## 04, la troisième étape : la génétique

La dynamique de chaque lignée (l'étape 4 du cycle, 225 lignes) appelle 27 fonctions et constantes du moteur. Pour qu'elle puisse devenir un module, ce dont elle dépend doit d'abord en être un. Un analyseur de portées (acorn) l'a montré : la génétique en est la plus grande part.

**`moteur/noyau/genetique.js`** : les traits continus d'une population (sa moyenne génétique, sa variance additive, l'équation de Lande), la reproduction sexuée (les fréquences d'allèles, Mendel, Hardy-Weinberg, les portées), la parenté et l'écart génétique de deux lignées. Des fonctions pures : ni le contexte d'un monde, ni rien de global. Ce qui dépend des règles d'un monde reste dans `moteur/orvane.js` : l'écriture au pas du monde, l'attrait, la méfiance, l'isolement reproductif. Le moteur exporte toujours ces fonctions sous les mêmes noms (`Orvane.mendel`, `Orvane.parente`…).

Le code est déplacé, non réécrit : le même monde au bit près, sur les sept mondes et le monde à l'axe propre. `moteur/orvane.js` passe de 1 183 lignes (avant les modules) à 1 004.

## 04, la quatrième étape : les outils, le plan, le calendrier

Après la génétique, la dynamique de chaque lignée dépendait encore d'une quinzaine de fonctions et de constantes du moteur qui ne demandent rien au contexte d'un monde. Elles forment deux modules :
- **`moteur/noyau/outils.js`** : borner un nombre, copier un état, et le hasard : le générateur d'un cycle (semé par la graine du monde et le numéro du cycle) et le tirage qui ne dépend que d'un nom. Tout le hasard du cœur vient de là.
- **`moteur/noyau/plan.js`** : le plan corporel d'un phénotype et ce que coûtent ses traits, la mortalité, la place d'une lignée parmi celles de sa taille (la bande de masse), ce que chaque régime pèse sur la capacité d'un lieu, les milieux (l'eau douce ou salée, la terre, les rives), la fenêtre d'une saison dans l'année et la photopériode d'une latitude (par `moteur/calendrier.js`).

Ce qui dépend du contexte d'un monde reste dans `moteur/orvane.js` : la saison d'un lieu, la dérive d'une lignée, l'appétence, la croissance, la convenance d'un lieu, la route de l'hiver. Hors de ce contexte, la dynamique ne dépend plus que de modules : ceux du cœur, et ceux qui existaient déjà (le catalogue, le calendrier, le climat, les diètes). Elle peut devenir un module à son tour.

Le code est déplacé, non réécrit : le même monde au bit près, sur les sept mondes, entrelacés, et le monde à l'axe propre. `moteur/orvane.js` : 946 lignes.

**Le Web Worker de l'Observatoire chargeait un fichier de moins que la page.** Sans `moteur/calendrier.js`, un monde au jour (l'Europe) y tournait sans son calendrier : en hiver quand il est en automne, et autrement selon que le navigateur lançait le Worker ou non. Sa liste est maintenant celle des balises de la page, dans le même ordre, et `bancs/simulateur.js` le vérifie ; le Worker, imité dans Node, rend le même cycle de l'Europe que le moteur, au bit près.

## 04, la cinquième étape : la dynamique de chaque lignée

L'étape 4 du cycle, la plus longue (224 lignes), sort à son tour : **`moteur/noyau/dynamique.js`**. Lignée par lignée et lieu par lieu : les naissances et les morts (la place, la ration, la faim, la maladie, les catastrophes, la chasse des hommes), les petits et leurs allèles (Mendel, les croisements entre lignées apparentées, l'introgression), les traits continus qui évoluent, les retraits et les apports des joueurs, l'essaimage vers les voisins, l'hivernage et son retour ; puis, pour chaque lignée, les combinaisons nées sans phénotype et, parfois, un trait nouveau.
- **Ce qu'il reçoit** : 51 noms, ceux que l'analyseur de portées a trouvés. Le contexte du monde et les fonctions qui en dépendent ; le hasard du cycle (ses générateurs continuent leur suite : le module tire les mêmes nombres, dans le même ordre) ; l'état de chaque lignée, tel que le partage des proies vient de le laisser ; ce que demandent les joueurs ; les mécanismes éveillés ; et les modules que le moteur a chargés ou non (le calendrier, le climat, les diètes : un moteur chargé sans eux tourne comme avant).
- **Ce qu'il rend** : les migrations, que le cycle applique ensuite (5, les arrivées). Il écrit dans chaque population (ses effectifs, ses morts, ses gènes) et dans le journal du cycle.

Le reste lui vient des modules du cœur : la génétique, le plan, les outils. Le code est déplacé, non réécrit : le même monde au bit près, sur les sept mondes, entrelacés, et le monde à l'axe propre. `moteur/orvane.js` passe à 727 lignes (1 183 avant les modules) ; le cycle y garde l'habitat (1), l'état de départ (2), les arrivées (5), la naissance des lignées et les extinctions (6), le catalogue (7), et appelle le partage des proies (3) et la dynamique (4).

## 04, la sixième étape : les arrivées, les lignées qui naissent et celles qui s'éteignent

Les deux étapes qui suivent la dynamique deviennent deux modules :
- **`moteur/noyau/arrivees.js`** (l'étape 5) : les bêtes parties pendant la dynamique arrivent là où elles vont. Là où la lignée n'était pas, une population naît ; les arrivants apportent leurs gènes, leur part d'hivernants et leur mémoire des joueurs, mêlés à ceux du lieu par les effectifs. Il reçoit 9 noms et ne rend rien : il écrit dans les populations.
- **`moteur/noyau/lignees.js`** (l'étape 6), en deux temps. `separer` : une population assez isolée du reste de son espèce, et assez différente (par sa niche ou par ses gènes), devient parfois une lignée à part ; il reçoit 17 noms, et les modules des dérives, des diètes, des formes et de la ponte, que le moteur a chargés ou non. `ecrire` : chaque lignée telle que le monde la publie ; une population de moins de deux bêtes disparaît, une lignée qui n'en a plus s'éteint, un phénotype trop rare rejoint le plus proche ; il reçoit 18 noms et rend les lignées à publier.

Ce qui suit l'écriture reste dans le cycle : les crochets des mécanismes éveillés (les deux vies, les castes, les savoirs, l'invention, la grammaire, les dérives et la diversité des plantes, la flore), qui appartiennent chacun à son module.

Le code est déplacé mot pour mot (vérifié ligne à ligne), et l'analyseur de portées ne trouve dans aucun module du cœur un nom qu'il ne reçoive ou n'importe. Le même monde au bit près, sur les sept mondes, entrelacés, et le monde à l'axe propre ; et, les séparations étant rares en seize cycles, deux essais qui les sollicitent : des règles qui font naître des lignées à chaque cycle (837 séparations), puis un tiers des lignées réduites à une bête par lieu (170 extinctions) ; l'ancien moteur et le nouveau y rendent le même monde. `moteur/orvane.js` : 602 lignes (1 183 avant les modules).

## 04, la septième étape : l'habitat, l'état de départ, les traits portés

Ce qui restait d'écologie dans le cycle sort à son tour :
- **`moteur/noyau/habitat.js`** (l'étape 1) : `capacites`, la capacité de chaque lieu (ce que les joueurs lui ont fait, puis un lent retour vers sa capacité de base, que le milieu transformé rend plus ou moins fertile) ; `catastrophes`, l'incendie, la crue ou la sécheresse qui frappe un lieu selon ses axes du jour et le temps qu'il fait, et les lieux frappés qu'il rend.
- **`moteur/noyau/depart.js`** (l'étape 2) : `etatDeDepart`, ce que le cycle lit de chaque lignée (ses phénotypes, leurs plans et ce que coûtent leurs traits ; ses populations, leurs allèles, leurs traits continus, ce qu'elles ont appris), et la biomasse qui pèse sur chaque lieu ; `presences`, qui vit où au début du cycle, pour les croisements entre lignées.
- **`traitsPortes`**, dans `moteur/noyau/lignees.js` (l'étape 7) : le catalogue de l'instantané, les traits que portent les lignées publiées, dans l'ordre du catalogue.

Le cycle (`cycleBrut`) ne fait plus que trois choses : il lie le contexte du monde aux fonctions qui en dépendent ; il câble les mécanismes que le monde a éveillés (le climat, la succession, le milieu, les natures, la saison de chaque lieu, la météo, la ponte, les stades, les castes, l'esprit, la mémoire ; les machines, la grammaire, la flore, les souches), dans l'ordre où ils agissent ; et il appelle les modules du cœur, étape après étape, avant de publier l'instantané. `moteur/orvane.js` : 566 lignes, contre 1 183 avant les modules.

Le code est déplacé mot pour mot (vérifié ligne à ligne) ; le même monde au bit près sur les sept mondes, entrelacés, et le monde à l'axe propre ; et, l'ancien moteur contre le nouveau, des catastrophes et des pressions sur l'habitat à chaque cycle (54 catastrophes), les séparations forcées et les extinctions provoquées : le même monde.

## 04, la huitième étape : le corps et la mémoire d'un monde, sans état global

Deux modules gardaient encore, le temps d'un cycle, un réglage propre au monde qui tournait : le corps (`moteur/corps.js`), avec le catalogue propre du monde (ses organes, ses formes : `catalogue.monde`) ; la mémoire (`moteur/memoire.js`), avec les règles que le monde s'est choisies (`regles.memoire`). Le cycle les posait sur le module, puis les rendait.

Chacun vit maintenant dans des instances. Le code qui lit le réglage passe, mot pour mot, dans une fabrique : `OrvaneCorps.instance()` et `OrvaneCorps.pour(catalogue)`, `OrvaneMemoire.avec(regles)`. Le module garde la sienne, celle qu'étendent ou que règlent les pages, les traducteurs et les bancs (`etendre` et `regler` font ce qu'ils faisaient). Le moteur prend, dans le contexte de chaque monde (`Orvane.contexte(inst)` : `CORPS`, `MEM`), une instance du corps étendue de son catalogue, et une copie des règles de la mémoire réglée par les siennes : le cycle ne pose plus rien, et n'a rien à rendre. Le regroupement des parcelles (`moteur/parcelles.js`) lit de même l'attitude des bêtes avec les règles de son monde.

Le même monde au bit près, sur les sept mondes, entrelacés, le monde à l'axe propre et le Worker imité ; et, l'ancien moteur contre le nouveau, des mondes qui ont leurs organes, leurs formes et leurs règles de mémoire, avec des séparations forcées (des corps qui prennent, en dérivant, un organe du monde) et leurs parcelles regroupées : le même monde. Pendant ces cycles, l'ancien moteur appelait 30 fois `etendre` et 8 fois `regler` ; le nouveau, jamais. `bancs/rejeu.js` le vérifie désormais.

**La suite.** Quelques outils (la genèse, des bancs, le simulateur de joueurs) changent encore les règles par défaut du moteur (`Orvane.REGLES`) au lieu de lui donner les leurs : c'est la neuvième étape. Puis les ablations (03), règle par règle ; le découpage permet aussi d'essayer la variante d'un module du cœur sans toucher au reste.

## 04, la neuvième étape : la flore d'un monde, et les règles d'un cycle

**La flore d'un monde, dans une instance.** La flore (`moteur/flore.js`) gardait dans le module, d'un cycle à l'autre, le catalogue du dernier monde qui avait tourné (ce que ses traits font devant les plantes), son pas de temps et ce que ses brouteurs tiraient des plantes. Chaque cycle les reposait (`preparer`), chaque éveil aussi (`eveiller`), mais ils restaient après : `Flore.atteinte`, `resistances`, `offre` et `offreD`, appelées par une page ou un banc, lisaient les traits du dernier monde venu, sans le dire.

Le code qui les lit passe, mot pour mot, dans une fabrique (`OrvaneFlore.instance(catalogue)`), comme le corps à l'étape précédente. Chaque cycle prend la sienne (le catalogue et le pas que le moteur lui donne), chaque éveil aussi (le catalogue du monde qui s'éveille). Le module garde la sienne, aux traits du moteur ; `OrvaneFlore.pour(inst)` en donne une aux traits d'un monde (ceux du moteur, de son instantané, les siens). Un banc s'en servait sans le savoir : celui des catalogues lit maintenant les traits de Lumen dans la flore de Lumen (`Flore.pour(W)`).

**Les règles d'un cycle.** La genèse, six bancs et le simulateur de joueurs changeaient les règles par défaut du moteur (`Orvane.REGLES`) le temps de leurs cycles, puis les remettaient. Le cycle prend désormais les siennes en option : `Orvane.cycle(inst, pressions, { regles })`, et hors d'un cycle `Orvane.contexte(inst, regles)`. Elles complètent celles du moteur comme celles du monde (une règle-objet d'un niveau : `{ separation: { chance: 1 } }` garde le reste de la séparation), et celles du monde passent encore par-dessus. Hors du banc du rejeu, qui compare une fois les deux façons, plus aucun fichier du dépôt n'écrit dans `Orvane.REGLES` :
- la genèse donne à chacun de ses cycles les règles de l'évolution accélérée et celles que le monde gardera (`--regles`, `--ecologie`) ;
- les bancs des cadavres, du corps, des diètes, des formes et des dérives, et celui du traducteur de Stone Valley, donnent la règle qu'ils font varier au cycle qui l'essaie ;
- le simulateur de joueurs prend le contexte de son monde : sa méfiance, sa mémoire réglée par les siennes (`regles.memoire`) et son appétence, comme son cycle (il prenait l'appétence du moteur ; pour les mondes du dépôt, cela ne change rien) ;
- deux outils qui lisaient les règles du moteur prennent aussi celles de leur monde : la route de l'hiver que la vie en groupe dit aux jeux (`moteur/collectif.js` : les seuils, les saisons et les axes du monde, comme son cycle) et la production des saisons du rapport de santé (`outils/sante.js`).

L'ancienne façon cachait un piège : la genèse et le banc du corps remettaient les règles depuis une copie JSON, qui change `Infinity` en `null`. Après eux, `max_taxons` valait `null`, et un cycle qui aurait suivi dans le même processus n'aurait plus séparé aucune lignée.

**Au bit près.** L'ancien moteur contre le nouveau : les sept mondes, entrelacés, le monde à l'axe propre et, pour la flore, des mondes où elle s'éveille entre deux cycles d'un autre et des brouteurs aux traits de Lumen (57 empreintes, toutes les mêmes) ; six genèses courtes (des règles propres, l'écologie de la Terre, Lumen et son catalogue, les milieux de la mer, une reprise) ; le simulateur sur cinq mondes, dont deux qui règlent leur méfiance, leur mémoire et leur meute ; la vie en groupe et le rapport de santé des mondes publiés ; chaque banc converti, l'ancienne façon contre l'option (jusqu'à 1 175 séparations forcées). `bancs/rejeu.js` vérifie que la flore du module ne garde rien d'un monde (ce contrôle échoue avec l'ancien moteur : après les cycles d'un monde aux traits propres, elle les connaissait encore), et que les règles d'un cycle rendent le monde que rendait l'ancienne façon, sans toucher à `Orvane.REGLES`.

**Ce qui reste.** Le cœur du moteur n'a plus d'état global. Les mécanismes gardent leurs propres règles dans leur module (le climat, la météo, la phénologie, les diètes…) : un monde ne peut pas les régler, sauf celles de la mémoire (`regles.memoire`), et des bancs les changent encore le temps d'un essai. Ce serait la suite du découpage : les règles de chaque mécanisme dans le contexte du monde (la dixième étape). Pour les ablations (03), une règle du moteur s'essaie déjà sans toucher au moteur : dans les règles d'une copie du monde, ou par l'option du cycle pour celles que le monde ne règle pas.

## 04, la dixième étape : les règles de chaque mécanisme, dans le contexte du monde

**Les règles d'un mécanisme, liées.** Chaque mécanisme garde ses règles dans son module (`OrvaneClimat.REGLES`, `OrvaneMeteo.REGLES`…). Un monde ne pouvait pas les régler, sauf celles de sa mémoire (`regles.memoire`) ; pour en essayer d'autres, onze bancs les changeaient sur le module le temps d'un essai, puis les remettaient.

Dans chaque module, le code qui lit ses règles passe, mot pour mot, dans une fabrique (`lier(REGLES)`), comme la mémoire à la huitième étape : dix-huit modules (le climat, la météo, la phénologie, la succession, la flore riche, les souches, la grammaire, l'esprit, l'invention, les dérives, les diètes, le milieu, les natures, la ponte, les stades, les castes, la vie synthétique, le calendrier), et la flore, dont la fabrique prend aussi ses règles. Le module se lie aux siennes ; `X.avec(regles)` rend une instance du mécanisme à ses règles complétées d'un niveau (`{ iles: { chance: 1 } }` garde le reste des îles), avec tout ce que le module publie. L'analyseur de portées (acorn) a délimité chaque bloc : tout ce qui lit les règles, directement ou par une autre fonction du module ; rien d'autre du module n'y puise, et aucun état n'y vit.

**Les mécanismes d'un monde.** Un monde règle un mécanisme sous le nom de son module : `monde.regles.climat`, `regles.flore`, `regles.dietes`…, comme sa mémoire ; un cycle aussi (`opt.regles.climat`), et celles du monde passent par-dessus. Le contexte d'un monde (`Orvane.contexte(inst).M`) garde les modules tels quels quand rien n'en règle aucun ; sinon, il prend une instance de chacun, à ses règles, et chacune se sert des autres mécanismes de ce monde : la flore, de ses diètes et des saisons de ses plantes ; les dérives, des diètes ; les souches, des dérives. Le cycle prend ses mécanismes dans ce contexte et les donne aux modules du cœur : la prédation lit les règles du sang dans les diètes du monde, la dynamique la dérive vers les îles dans son climat.

**Les bancs.** Les onze bancs donnent leurs règles au cycle qui les essaie (`{ regles: { climat: … } }`), ou appellent le mécanisme à ces règles (`Ph.avec({ rampe: 0 }).preparer(…)`, `Me.avec({ force: … })`). Plus aucun ne change les règles d'un module ; le banc de la mémoire éprouve encore `regler`, qui les change et les rend : c'est ce qu'il vérifie.

**Au bit près.** Les 57 empreintes de la neuvième étape, toutes les mêmes (aucun de ces mondes ne règle un mécanisme : les modules, tels quels). Vingt essais, un par mécanisme et un qui en règle quatre à la fois, chacun un cycle d'un monde où le mécanisme est éveillé (le monde d'Orvane publié ; la genèse 2026 pour la ponte, qui a des mangeurs d'œufs ; l'Europe pour le calendrier) : l'ancienne façon (les règles posées sur le module, l'ancien moteur) et la nouvelle (données au cycle) rendent le même monde, chaque fois un autre que celui des règles du module ; et les règles des modules en sortent telles quelles. Parmi eux, les diètes réglées changent aussi la flore, la prédation et les dérives de ce monde, la phénologie réglée sa flore, les dérives réglées ses souches. Chaque banc converti dit, mot pour mot, ce qu'il disait (ses mesures et ses verdicts). `bancs/rejeu.js` vérifie qu'un monde qui règle son climat et sa flore rend le monde de l'ancienne façon, sans toucher aux modules, et qu'un monde qui n'en règle aucun garde les modules.

**Ce qui reste.** Un cycle ne lit plus rien qui ne vienne de son monde ou de ses options : les règles du moteur et celles de chaque mécanisme, complétées de celles du monde et du cycle. Les modules gardent leurs règles par défaut, que plus rien ne change pendant un cycle. La vie en groupe, que l'hébergement publie hors du cycle (`moteur/collectif.js`), lit aussi les règles de son monde (`regles.collectif` : ses seuils, la taille de ses groupes), quand on la décrit ou qu'on l'éveille ; les parcelles (`moteur/parcelles.js`) posent les leurs dans le monde (la dispersion, la fuite), qui les garde. Le découpage du moteur (04) est fait. Les ablations (03) peuvent retirer n'importe quelle règle, du moteur ou d'un mécanisme, sur une copie du monde ou par l'option du cycle, et plusieurs essais tourner côte à côte dans le même processus.

## 03, la première étape : le plan et l'outil des ablations

**Le plan** (`etalon/ablations.json`), écrit avant le premier essai, comme le protocole de l'étalon. Retirer une règle, c'est donner au monde la valeur qui éteint ce qu'elle fait, tout le reste égal : une seule règle à la fois, sur une copie du monde (dans ses règles, `monde.regles`, puisque celles du monde passent par-dessus celles d'un cycle), sur les mêmes graines que le témoin. Chacune des 50 règles gelées y a sa nature :
- **39 mécanismes** : la règle fait quelque chose, et une valeur l'éteint (la chance de séparation à zéro, les saisons sans amplitude, la reproduction sexuée éteinte, les catastrophes sans chance…) ;
- **5 constantes** : la ration d'un prédateur, la conversion de la viande en petits, la demi-satiété n'ont pas de valeur qui les éteigne (sans ration, plus de chasse) ; on les essaie à la moitié et au double de celle du monde ; le seuil de surpeuplement et le plafond des phénotypes, à deux valeurs dites ;
- **4 comptables** : la tendance d'un effondrement ou d'une explosion, l'effectif d'une lignée menacée, la mémoire des lignées éteintes ne font que publier ; les retirer ne doit rien changer aux bêtes, et l'essai le vérifie ;
- **1 des joueurs** : la méfiance ne vit que de ce que font les joueurs ; sans pressions, rien à mesurer ;
- **1 inactive** : le plafond des lignées ne sert qu'à la genèse.

Une règle qu'un monde a déjà retirée (sa valeur est celle qui l'éteint) ne s'y essaie pas : dans la mer, quinze le sont (les règles d'un monde réel, la vie par parcelles, l'hivernage, les cadavres). Le plan dit aussi quand chaque règle agit (chaque cycle, aux séparations, aux saisons, dans un monde au calendrier) : une règle qui n'agit qu'aux séparations ne se voit guère en trente cycles.

**L'outil** (`outils/ablations.js`). Le témoin et chaque essai tournent sur les mêmes graines, chacun dans son processus, plusieurs à la fois. À la fin : les lignées animales vivantes et les carnivores, la biomasse, la diversité (Shannon, comme la référence), la part des lignées stables, les extinctions, les lignées nées ; et la durée d'un cycle, ce que la règle coûte. Une mesure bouge quand l'écart au témoin (en moyenne sur les graines) passe le double de l'écart entre les graines du témoin, et un seuil que dit le plan : le hasard d'un cycle suit ce que fait le monde, et une ablation qui tire un nombre de moins change la suite. Le rapport (JSON, et des notes en tableau) dit pour chaque essai ce qui bouge et une lecture (« elle tient », « rien de mesurable », « investiguer ») : une indication, pas un verdict. La matrice (conserver, modifier, supprimer, investiguer) reste une décision de l'auteur.

```
node outils/ablations.js <etat.json> [--cycles 30] [--graines 3] [--regles a,b] [--jobs 4] [--part k/n] --sortie r.json --notes r.md
node outils/ablations.js --fusionner part1.json part2.json …  --sortie r.json --notes r.md
```

Une part (`--part k/n`) fait le témoin et un essai sur n : quatre machines se partagent un plan, puis la fusion rend le même rapport qu'en une fois (le coût de chaque essai, contre le témoin de sa machine).

**L'action** (`.github/workflows/ablations.yml`), à la demande : Actions › ablations › Run workflow, avec le monde publié (son dernier état, la branche publication), les cycles, les graines, les règles. Quatre machines, puis le rapport sur la branche `etalon` (`etalon/ablations/<monde>/AAAA-MM-JJ.json` et `.md`), jamais sur `main`. Les essais du plan : Orvane, 30 cycles et 3 graines (une heure et demie environ) ; l'Europe, 365 cycles et une graine (deux heures environ).

**Le banc** (`bancs/ablations.js`) : le plan couvre les 50 règles gelées et rien d'autre, chaque retrait ne touche que sa règle et des clés que le moteur connaît ; sur la mer, le témoin rend le monde du moteur, les saisons retirées font bouger le monde, une règle comptable ne change rien aux bêtes, une règle déjà retirée n'est pas essayée, une constante s'essaie à deux valeurs, deux passes rendent les mêmes mesures, et deux parts fusionnées le même rapport.

**Les premiers essais.** Sur la mer (cycle 1200, 30 cycles, 3 graines : `etalon/ablations/2026-11-24-marin.md`), quinze règles sont déjà retirées ; des 38 essais, un seul sort du bruit : le seuil de surpeuplement abaissé à 0,7 fait naître neuf lignées de plus (Shannon +0,1). Les quatre règles comptables ne changent rien aux bêtes. Ce que coûtent les règles, sur une machine au calme : sans la reproduction sexuée, un cycle de la mer va 91 % plus vite ; sans les hybrides, 25 %.

Sur le monde d'Orvane publié (cycle 64), un pilote court, 10 cycles et 2 graines (`etalon/ablations/2026-11-24-orvane-pilote.md`), en attendant le plan entier. Sans les saisons du moteur, la biomasse baisse de 7,5 % et la diversité monte (Shannon +0,05) ; la part de plantes des omnivores (`omnivore_vegetal`, `omnivore_vegetal_base`) et le report sur la proie abondante (`report_proies`) font bouger la diversité ou la biomasse ; sans la migration, deux lignées et demie de plus naissent, tout juste au-delà du bruit. La ration (à la moitié, au double) et le seuil de surpeuplement comptent. Rien d'autre ne se mesure en dix cycles, et les règles qui n'agissent qu'aux séparations ne se voient guère en si peu de temps. (Ses durées, prises pendant d'autres travaux sur la même machine, ne disent pas ce que coûtent les règles.)

**La lecture, version 2.** Le pilote a montré une faiblesse de la première lecture : le témoin n'y a vu naître aucune lignée sur ses deux graines, et presque chaque essai en faisait naître une ou deux. Un compte d'événements rares ne se lit pas à l'écart de deux graines : la lecture des comptes de lignées prend aussi le bruit de Poisson de leurs naissances et de leurs extinctions. C'est la version 2 du plan, datée, avec sa raison (son historique) ; ce qu'on retire ne change pas, et les deux rapports se sont relus (`--fusionner`) : ils disent le plan des essais et celui de la lecture.

**Ce qui reste.** Le plan entier, sur Orvane (30 cycles, 3 graines) puis sur l'Europe (une année), par l'action ; puis les paires de règles (plus bas) ; puis la matrice, règle par règle. Les règles des mécanismes (`regles.<mécanisme>`) pourront suivre le même chemin, avec un plan à elles.

## 03, la deuxième étape : les paires

**La règle des paires** (le plan, version 3, écrite avant le premier essai de paires). Deux règles retirées ensemble peuvent faire autre chose que la somme de ce que fait chacune : l'une tient ce que l'autre défait, ou elles ne pèsent qu'ensemble. Les paires se choisissent par une règle, pas après coup : les mécanismes dont l'essai seul tient (une mesure bouge) dans le rapport entier d'un monde, deux à deux, sur les mêmes cycles, les mêmes graines et le même témoin. L'interaction d'une mesure : l'écart de la paire au témoin, moins la somme des écarts de chacune seule. Elle compte au-delà de quatre fois l'écart entre les graines du témoin (quatre essais s'y ajoutent ou s'y retranchent), du seuil de la mesure et, pour les comptes de lignées, du bruit de Poisson des quatre essais. Du signe de la somme, elle les renforce ; du signe contraire, elle les tempère ; sans effet seules (aucune des deux, seule, ne bouge la mesure), elles n'agissent qu'ensemble.

```
node outils/ablations.js <etat.json> --paires <rapport des essais seuls> [--paires-de a,b,c] [--part k/n] --sortie p.json --notes p.md
```

L'outil lit le rapport des essais seuls (le même monde : son empreinte ; ses cycles, ses graines), refait le témoin et vérifie qu'il est le même, au bit près dans ses mesures (sinon, un autre moteur : les paires ne se liraient pas contre les essais seuls). Il refuse une part (les paires se choisissent dans le rapport entier) et un rapport de paires ; un rapport d'essais seuls fait sur quelques règles (`--regles`) le dit, et l'outil prévient que la règle du plan veut le rapport entier. Les notes disent, pour chaque paire et chaque mesure, l'écart de la paire et, entre parenthèses, la somme des deux essais seuls. `--paires-de` met en paires les essais qu'on dit, hors de la règle (un essai, un banc). En parts, puis fusionnées : les mêmes paires.

**L'action.** Dans « paires », le numéro de la passe des essais seuls (le nombre à la fin de l'adresse de sa page, que son résumé redit) : la passe garde trente jours le monde de ses essais et son rapport, puisque la branche publication est réécrite à chaque passe et qu'un monde avance chaque jour. Les paires tournent sur ce monde-là, ses cycles et ses graines ; « règles », s'il est rempli, dit les essais seuls à mettre en paires. Le rapport : `etalon/ablations/<monde>/AAAA-MM-JJ-paires.json` et `.md`. Au passage, une erreur de l'action d'hier : elle vérifiait ses entrées avec `grep`, qui ne lit rien d'une valeur vide, et aurait refusé « règles » laissé vide, sa valeur par défaut ; elle les vérifie maintenant entières (`[[ =~ ]]`). Un rejeu de ses deux jobs, tels qu'ils sont écrits, l'a éprouvée ici sur sv-1 : les essais seuls, leurs paires, une passe introuvable.

**Le banc** l'éprouve sur la mer : par la règle du plan, les mécanismes qui tiennent seuls ; une règle qui ne fait que compter, retirée avec les saisons, rend le monde des saisons seules (une interaction nulle) ; deux parts fusionnées, les mêmes paires ; une part, un rapport de paires refusés.

**Ce qui reste.** Le plan entier sur Orvane, en cours (quatre parts l'une après l'autre, sur une machine de quatre cœurs) ; l'Europe, une année, par l'action ; puis les paires de chaque monde, par la règle du plan ; puis la matrice, règle par règle, que décide l'auteur.

## 03, la troisième étape : chaque règle seule, sur Orvane et sur l'Europe

**Orvane** (son monde publié, au cycle 65 ; 30 cycles, 3 graines : `etalon/ablations/2026-11-25-orvane.md`). Quarante-six essais, en quatre parts l'une après l'autre sur une machine de quatre cœurs (six heures et demie), aucune erreur. Sept règles y sont déjà retirées : trois d'un monde réel (la colonisation, les charognes, ce qui naît d'une proie pendant un besoin), deux du calendrier (la saison des naissances, le repos d'hiver), les cadavres, la meute. Huit mécanismes tiennent :
- **ce que mangent les omnivores** : la part de plantes d'un carnivore devenu omnivore (`omnivore_vegetal` : sans elle, Shannon +0,064 et 9 points de lignées stables en moins), celle d'un omnivore de naissance (`omnivore_vegetal_base` : +4,8 % de biomasse), la part du besoin d'un carnivore qu'un omnivore cherche en proies (`viande_omnivore` : 2 points de lignées stables en plus) ;
- **la chasse** : le report sur la proie abondante (`report_proies` : Shannon −0,08 et 7 points de lignées stables en moins), la gêne entre chasseurs de même masse (`concurrence_masse` : 3 points en moins) ;
- **les lignées et l'année** : la séparation (sans elle, aucune lignée ne naît en trente cycles ; 2,7 au témoin), la migration (Shannon −0,04), les saisons du moteur (3 points de lignées stables en moins).

Le pilote (dix cycles, deux graines) voyait tenir les saisons, la part de plantes des omnivores, le report sur la proie abondante et la migration : le plan entier les retrouve, et y ajoute la séparation, la part de proies des omnivores et la gêne entre chasseurs de même masse. Mais sans les saisons, la biomasse baissait de 7,5 % au bout de ses dix cycles, et de 0,7 % seulement au bout de trente. Une année d'Orvane dure 120 cycles : le pilote finissait en été, le plan entier finit en automne. Un essai se mesure à sa fin, et dit la saison où il finit.

La ration, la conversion de la viande et la demi-satiété comptent, à la moitié comme au double : dans un sens comme dans l'autre, la part des lignées stables baisse (de 3 à 13 points). Le seuil de surpeuplement compte à 0,7 (Shannon +0,09), pas à 0,95 ; le plafond des phénotypes, à 10 comme à 40, non. Les quatre règles comptables ne changent rien aux bêtes. Cinq mécanismes n'y changent rien du tout, au chiffre près : la mutation (un monde clonal seulement) ; trois règles des séparations (la longévité d'un carnivore né de la dérive, le passage au régime carnivore, le plafond de masse du vol), que les quelques séparations de trente cycles n'ont pas appelées ; et le plafond de ce qu'un chasseur mange d'une population en un cycle (`predation_max`), qui tient pourtant sur l'Europe : la chasse d'Orvane ne l'atteint pas en trente cycles. Ce que coûtent les règles (à lire avec la place de chaque tâche, plus bas) : sans la reproduction sexuée, un cycle va 59 % plus vite ; sans les saisons, 18 % ; sans les petites proies, 15 %. Deux constantes pèsent aussi : avec 10 phénotypes au plus, un cycle va 14 % plus vite, avec 40, 23 % moins vite ; avec le seuil de surpeuplement à 0,7, 21 % moins vite.

Les essais ont tourné selon le plan 2 ; la fusion les lit selon le plan 3, qui n'y change rien (il ajoute les paires), et le rapport dit l'un et l'autre. La première part a tourné sous le commit 5e2b91b, les trois autres sous c0bcdfb : le même moteur (rien ne change entre les deux dans `moteur`, `tampon`, `hebergement`), et la fusion vérifie que le témoin de chaque part est le même, au bit près.

**L'Europe** (par l'action, 365 cycles et une graine, depuis son cycle 2 : `etalon/ablations/europe/2026-11-25.md`, sur la branche `etalon`). Quarante-quatre essais, deux heures et demie sur quatre machines, aucune erreur. Neuf règles y sont déjà retirées, dont la séparation et les nouveaux traits : en un an, aucune lignée n'y naît ni ne s'éteint, et seules la biomasse, la diversité et la part des lignées stables bougent. Neuf mécanismes tiennent :
- **la chasse** : le plafond de ce qu'un chasseur mange d'une population en un cycle (`predation_max` : sans lui, −4,6 % de biomasse et Shannon −0,024), le report sur la proie abondante (`report_proies` : Shannon −0,04), la gêne entre chasseurs de même masse (`concurrence_masse` : +4,7 % de biomasse), la part de chair d'un omnivore (`viande_part` : −4,8 %), la mort des carnivores affamés (`faim_carnivore` : Shannon +0,0165), et les mangeurs d'insectes, qui prennent les insectes si petits soient-ils (`petites_proies` : sans elle, +10,2 % de biomasse, Shannon −0,076 et 9 points de lignées stables en moins) ;
- **le calendrier** : le repos d'hiver des bêtes à sang froid (`diapause` : sans lui, −11,8 % de biomasse) et la saison des naissances (`naissances` : Shannon +0,032) ;
- **la colonisation** : sans sa chance, chaque lignée qui essaime fonde un lieu ; la diversité monte (Shannon +0,05), et un cycle prend 74 % de temps en plus.

Six mécanismes n'y changent rien du tout, au chiffre près : la mutation (un monde clonal seulement), la dérive, le plafond de masse du vol et le passage au régime carnivore (aux séparations, qu'il n'y a pas), la part de plantes d'un carnivore devenu omnivore, les saisons du moteur (un lieu qui a les siennes les garde). Les quatre règles comptables ne changent rien aux bêtes. La ration et la demi-satiété comptent (de −6,5 % à +5,5 % de biomasse) ; la conversion de la viande, le seuil de surpeuplement et le plafond des phénotypes, non. Ce que coûtent les règles (à lire avec la place de chaque tâche, plus bas) : la dispersion entre parcelles et la génétique continue, 15 % d'un cycle chacune ; la reproduction sexuée, rien qu'on mesure.

Une seule graine : l'écart entre les graines du témoin est nul, et seuls les seuils du plan départagent. Les quinze mécanismes qui agissent sans rien faire bouger en donnent une idée : leurs écarts vont jusqu'à 0,007 de Shannon et 0,9 % de biomasse, sous les seuils (0,01 et 2 %) ; ceux qui tiennent passent 0,016 et 2,4 %. Une deuxième graine le dirait mieux.

**Les deux mondes.** Deux mécanismes tiennent dans l'un et l'autre : le report sur la proie abondante et la gêne entre chasseurs de même masse. Les autres disent leur monde : l'Europe a un calendrier et des lieux réels (le repos d'hiver, la saison des naissances, la colonisation), qu'Orvane a déjà retirés ; Orvane a des séparations, des omnivores de toutes sortes et les saisons du moteur, quand l'Europe n'a pas les premières, a retiré une part des autres et garde les saisons de ses lieux. Ce que coûte une règle dépend aussi du monde : la reproduction sexuée, 59 % d'un cycle d'Orvane, ne se mesure pas sur l'Europe ; la dispersion et la génétique continue, 15 % d'un cycle de l'Europe, restent dans le bruit d'Orvane.

**Les paires**, par la règle du plan, en cours : sur l'Europe, les neuf mécanismes qui tiennent, deux à deux (36 paires), par l'action, sur le monde et le rapport que garde la passe des essais seuls ; sur Orvane, les huit (28 paires), ici, sur le monde de ses essais seuls (l'action lit les paires dans une passe d'essais seuls, et ceux d'Orvane ont tourné ici).

**Ce qui reste.** Les paires des deux mondes ; puis la matrice, règle par règle, que décide l'auteur. Deux essais diraient mieux ce que ceux-ci laissent ouvert : une deuxième graine de l'Europe, et une année entière d'Orvane (120 cycles) pour ses saisons.

## 03, la quatrième étape : les paires, sur l'Europe et sur Orvane

**L'Europe** (par l'action, sur le monde et le rapport que garde la passe des essais seuls : `etalon/ablations/europe/2026-11-25-paires.md`, sur la branche `etalon`). Les neuf mécanismes qui tiennent seuls, deux à deux : 36 paires, trois heures sur quatre machines, aucune erreur, et le témoin des essais seuls, au bit près. Vingt-cinq paires font la somme de ce que font leurs deux règles seules ; onze s'en écartent, par la règle du plan. Mais une seule graine : le plan n'y a que ses seuils, et une interaction additionne les écarts de trois essais. Plus prudemment (une lecture hors du plan), sept passent la somme des trois plus grands écarts qu'ont montrés les essais qui ne font rien bouger (0,022 de Shannon, 2,8 % de biomasse, 4,5 points de lignées stables) :
- **les petites proies**, dans cinq des sept. Sans elles, la biomasse monte de 10 % ; retirer avec elles le plafond de la chasse ou la part de chair des omnivores (seuls, −4,6 % et −4,8 %) ne la fait presque plus baisser (+9,8 % et +9,6 %), et la gêne entre chasseurs de même masse (seule, +4,7 %) ne la fait plus monter (+10,7 %) : sans les petites proies, la biomasse ne répond plus à ces trois règles de la chasse. Sans elles et sans la mort des carnivores affamés, la part des lignées stables ne perd qu'un point, quand la somme en attend six et demi ; sans elles et sans le report sur la proie abondante, la diversité baisse moins que la somme (Shannon −0,084, contre −0,115) ;
- **le plafond de la chasse et la saison des naissances** : ensemble, la biomasse baisse de 5,9 % ; la somme en attend 2,1 % ;
- **la gêne entre chasseurs de même masse et la part de chair des omnivores** : seules, elles s'annulent (+4,7 % et −4,8 %) ; ensemble, la biomasse monte de 3,8 %, presque comme sans la gêne seule.

Les quatre autres (des interactions de diversité de 0,013 à 0,018, et de biomasse de 2 %) restent à portée du bruit d'une graine. Quand les deux effets seuls s'annulent presque, « se renforce » ou « se tempère » ne dit que le signe d'une somme presque nulle : mieux vaut y lire l'écart de la paire.

**Orvane** (ici, sur le monde de ses essais seuls : `etalon/ablations/2026-11-25-orvane-paires.md`). Les huit mécanismes qui tiennent seuls, deux à deux : 28 paires, en quatre parts l'une après l'autre sur une machine de quatre cœurs (quatre heures), aucune erreur, et le témoin des essais seuls, au bit près (la première part sous le commit 47e1273, les trois autres sous b759e60 : le même moteur). Vingt-trois paires font la somme de ce que font leurs deux règles seules ; cinq s'en écartent, par la règle du plan, toutes par la part des lignées stables (une interaction y compte au-delà de 2,7 points, quatre fois l'écart entre les graines du témoin), et toutes avec la part de plantes que mangent les omnivores :
- **la part de plantes d'un omnivore de naissance**, dans quatre des cinq. Seule, elle fait perdre 2,2 points de lignées stables. Retirée avec les saisons (seules, 3,1 points en moins), elle n'en fait plus perdre aucun ; avec le report sur la proie abondante (seul, 6,7 points), 5, quand la somme en attend 8,9 ; avec la part de plantes d'un carnivore devenu omnivore (seule, 9,2 points), 8,6, quand la somme en attend 11,4 (à peine au-delà du seuil). Avec la part de proies des omnivores, qui seule en fait gagner 2,2, elles s'annulent seules et en font perdre 4 ensemble (le rapport dit « se tempère », comme plus haut : le signe d'une somme presque nulle) ;
- **la part de plantes d'un carnivore devenu omnivore et la gêne entre chasseurs de même masse** : seules, 9,2 et 3 points en moins ; ensemble, 6,3, quand la somme en attend 12,2 (l'interaction la plus forte, plus de deux fois le seuil).

Quatre fois sur cinq, les deux règles retirées ensemble font perdre moins de lignées stables que la somme ne l'attend. La biomasse et la diversité font partout la somme (leurs interactions restent sous le tiers de leur seuil), les comptes de lignées aussi. Trois paires approchent le seuil sans le passer, encore par la part des lignées stables : le report sur la proie abondante avec la gêne entre chasseurs de même masse ou avec la part de proies des omnivores, et cette part de proies avec les saisons (de 2,2 à 2,6 points). Sur l'Europe, ce qui pèse avec les autres règles, ce sont les petites proies ; sur Orvane, la part de plantes des omnivores : chaque fois, ce que mangent les bêtes.

**Ce que coûte une règle, et la place de sa tâche.** Une part fait tourner ses tâches quatre à la fois, le témoin en tête. Ses dernières tâches tournent à moins de quatre, et vont plus vite : sur les machines de l'action, les dernières paires de chaque part de l'Europe vont de 13 à 25 % plus vite que le témoin (six paires, la colonisation mise à part), quand leurs règles seules gagnaient de 1 à 6 % ; et la colonisation retirée avec une autre règle prend de 42 % à 137 % de temps en plus selon sa place dans la file (seule, vers la fin de sa part, 74 %). Rien de ce que font les bêtes n'en dépend (le moteur rend le même monde, au bit près), seulement les durées. Les essais seuls le montrent moins : sur l'Europe, des règles qui ne font rien de mesurable gagnent jusqu'à 6 % loin de la tête de la file ; ici, sur Orvane, la dernière tâche d'une part jusqu'à 10 %. Le plancher du plan (10 %) en couvre l'essentiel pour les essais seuls, pas pour les paires de l'Europe, dont les coûts ne se lisent pas. Les paires d'Orvane se lisent mieux : chaque part y fait vingt-quatre tâches, quatre à la fois, et ses quatre places restent pleines presque jusqu'au bout ; une dernière paire qui garde les saisons n'y va pas plus vite que le témoin (de 1 à 4 % moins vite). Les seuls coûts qu'on y lit sont ceux des sept paires sans les saisons, de 11 à 30 % d'un cycle (les saisons seules, 18 %) ; les vingt et une autres restent sous le plancher (de −7 à +8 %). Mais le témoin ne tourne qu'en tête de sa part : d'une part à l'autre, sur la même machine, il va de 20,7 à 23,0 s le cycle, et la part au témoin le plus lent lit les plus forts coûts (30 et 26 %). Des coûts dits plus haut, tiennent ceux de la reproduction sexuée (91 % sur la mer, 59 % sur Orvane), des saisons (18 %), du plafond des phénotypes et de la dispersion sur l'Europe (15 %), loin du plancher ou au milieu de leur file ; les petites proies (15 % sur Orvane), la génétique (15 % sur l'Europe) et les hybrides (25 % sur la mer), parmi les dernières tâches de leur part, en doivent une part à leur place. Pour lire les coûts, il faudrait garder chaque machine pleine jusqu'à sa dernière tâche (en relançant le témoin pour la combler), et faire tourner le témoin en fin de file comme en tête.

**Ce qui reste.** La matrice, règle par règle, que décide l'auteur. Pour la décider, trois mesures de plus diraient mieux ce que celles-ci laissent ouvert : une deuxième graine de l'Europe (ses interactions, et ce qui y tient près des seuils), une année entière d'Orvane pour ses saisons (et ce qu'elles font avec la part de plantes des omnivores), et des coûts mesurés sur des machines pleines jusqu'au bout, le témoin en tête et en fin de file.

## Ce qui vient

1. **Les ablations (03).** Le plan, l'outil et l'action sont faits (plus haut), et les paires, leur règle écrite avant leur premier essai. Chaque règle a été retirée seule sur la mer, sur Orvane (30 cycles, 3 graines) et sur l'Europe (une année) : huit mécanismes tiennent sur Orvane, neuf sur l'Europe, deux dans l'un et l'autre, et l'on sait à peu près ce que chacune coûte. Les paires sont faites : sur l'Europe, onze sur trente-six s'écartent de la somme, sept nettement, la plupart avec les petites proies ; sur Orvane, cinq sur vingt-huit, toutes par la part des lignées stables et avec la part de plantes des omnivores. Reste la matrice : conserver, modifier, supprimer, investiguer, que décide l'auteur.
2. **Modulariser le moteur (04)** : fait. Le cycle est découpé, et ni le cœur ni les mécanismes n'ont d'état global (plus haut : le contexte explicite ; le partage des proies, la génétique, les outils et le plan, la dynamique, les arrivées, les lignées, l'habitat, l'état de départ ; le corps, la mémoire et la flore d'un monde dans son contexte ; les règles d'un cycle en option, que la genèse, les bancs et le simulateur donnent au lieu de changer celles du moteur ; les règles de chaque mécanisme, qu'un monde ou un cycle règle). Le rejeu a gardé le moteur identique au bit près pendant le découpage ; l'étalon le juge ensuite.
3. **L'évolution ouverte (05)** : des populations sans évolution, puis avec la génétique seule. Les réseaux neuronaux sont la phase 3 du plan d'évolution ouverte : Orvane n'en a pas aujourd'hui (l'esprit, docs/34, fait vivre des savoirs et des traditions).
4. **L'intérêt pour les jeux (06)** : Stone Valley comme démonstrateur, avec les lots d'un jeu rejoués sur une copie du monde à côté d'un témoin sans lots (docs/5).
5. **La revue indépendante.** Le protocole verrouille les critères ; il ne remplace pas un regard extérieur. Il faudrait un écologue des populations pour relire les règles, et une relecture humaine obligatoire des PR (la protection de la branche `main`).

```
node bancs/rejeu.js [--court]     # le moteur au bit près, le journal, le rejeu, la référence
node bancs/protocole.js           # le protocole tient, le moratoire, le verrou mord
```
