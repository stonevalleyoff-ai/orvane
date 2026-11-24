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
- les chasseurs à la borne de leur adresse : 45 sur 84 dans l'amorce de l'Europe (✗) ;
- les taux de chasse que l'assemblage a dû borner : 66 sur 126 (✗).

**Les tests réservés.** Quatre tests sont écrits d'avance, leur critère fixé avant toute simulation : Isle Royale de 1959 à 1979, l'expansion du chien viverrin en Europe, le cycle du lynx et du lièvre, l'expansion du coyote. Rien ne sera réglé sur eux.

**Le même étalon qu'avant.** Avec ses seuils lus au protocole, l'étalon rend les mêmes valeurs et les mêmes verdicts qu'avant, test par test, sur la même amorce : Isle Royale (trois graines) et le retour du loup (série comprise).

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

## Ce qui vient

1. **Les ablations (03).** Chaque règle retirée seule, sur Orvane (30 cycles, 3 graines) puis sur l'Europe (une année), puis par paires : ce qu'elle tient, ce qu'elle coûte. La matrice : conserver, modifier, supprimer, investiguer.
2. **Modulariser le moteur (04)** : la prédation, le métabolisme, la reproduction, la génétique, les déplacements, le climat, chacun dans son module, sans état global. Le rejeu garde le moteur identique au bit près pendant le découpage, l'étalon le juge ensuite.
3. **L'évolution ouverte (05)** : des populations sans évolution, puis avec la génétique seule. Les réseaux neuronaux sont la phase 3 du plan d'évolution ouverte : Orvane n'en a pas aujourd'hui (l'esprit, docs/34, fait vivre des savoirs et des traditions).
4. **L'intérêt pour les jeux (06)** : Stone Valley comme démonstrateur, avec les lots d'un jeu rejoués sur une copie du monde à côté d'un témoin sans lots (docs/5).
5. **La revue indépendante.** Le protocole verrouille les critères ; il ne remplace pas un regard extérieur. Il faudrait un écologue des populations pour relire les règles, et une relecture humaine obligatoire des PR (la protection de la branche `main`).

```
node bancs/rejeu.js [--court]     # le moteur au bit près, le journal, le rejeu, la référence
node bancs/protocole.js           # le protocole tient, le moratoire, le verrou mord
```
