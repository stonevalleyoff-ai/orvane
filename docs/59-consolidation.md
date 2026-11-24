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

**La suite.** Quelques outils (la genèse, des bancs, le simulateur de joueurs) changent encore les règles par défaut du moteur (`Orvane.REGLES`) au lieu de lui donner les leurs. Puis les ablations (03), règle par règle ; le découpage permet aussi d'essayer la variante d'un module du cœur sans toucher au reste.

## Ce qui vient

1. **Les ablations (03).** Chaque règle retirée seule, sur Orvane (30 cycles, 3 graines) puis sur l'Europe (une année), puis par paires : ce qu'elle tient, ce qu'elle coûte. La matrice : conserver, modifier, supprimer, investiguer.
2. **Modulariser le moteur (04)** : le cycle est découpé et le cœur n'a plus d'état global (plus haut : le contexte explicite ; le partage des proies, la génétique, les outils et le plan, la dynamique, les arrivées, les lignées, l'habitat, l'état de départ ; le corps et la mémoire d'un monde dans son contexte). Il reste les outils qui changent les règles par défaut du moteur. Le rejeu garde le moteur identique au bit près pendant le découpage, l'étalon le juge ensuite.
3. **L'évolution ouverte (05)** : des populations sans évolution, puis avec la génétique seule. Les réseaux neuronaux sont la phase 3 du plan d'évolution ouverte : Orvane n'en a pas aujourd'hui (l'esprit, docs/34, fait vivre des savoirs et des traditions).
4. **L'intérêt pour les jeux (06)** : Stone Valley comme démonstrateur, avec les lots d'un jeu rejoués sur une copie du monde à côté d'un témoin sans lots (docs/5).
5. **La revue indépendante.** Le protocole verrouille les critères ; il ne remplace pas un regard extérieur. Il faudrait un écologue des populations pour relire les règles, et une relecture humaine obligatoire des PR (la protection de la branche `main`).

```
node bancs/rejeu.js [--court]     # le moteur au bit près, le journal, le rejeu, la référence
node bancs/protocole.js           # le protocole tient, le moratoire, le verrou mord
```
