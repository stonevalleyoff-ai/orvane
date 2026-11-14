# 37. La chronique, le muséum, les noms : l'histoire du monde

Le moteur vit au présent. Un cycle n'a que ses événements, et une lignée éteinte ne reste listée que dix cycles. Ce chapitre garde le reste : ce qui s'est passé, ce qui a vécu, et le nom que les joueurs lui ont donné. C'est la troisième étape de la phase 3.

Rien de tout cela ne touche à la simulation. La chronique, le muséum et les noms lisent le monde après chaque cycle ; ils ne changent pas un effectif. Le code est dans `moteur/chronique.js`, appelé par `hebergement/cycle.js`.

## La chronique

Un journal durable de ce qui compte, rangé par année du monde :

| entrée | quand | importance |
| --- | --- | --- |
| `naissance` | une lignée se sépare (une forme nouvelle, un régime qui change : 3) | 2 ou 3 |
| `extinction` | une lignée s'éteint, avec sa cause | 3 (une machine ou une plante : 2) |
| `catastrophe` | un incendie, une crue, une sécheresse | 2 |
| `souche`, `epidemie` | une maladie nouvelle ; une souche qui gagne une lignée qu'elle n'avait jamais touchée | 2, 1 |
| `invention` | un trait inventé, une phrase de la grammaire | 2 |
| `nature`, `climat` | un lieu qui change de nature ; un âge du climat, un pont de terre, une île | 2 ou 3 |
| `eveil`, `arrivee` | un mécanisme qui s'éveille ; les lignées d'un autre monde qui arrivent par une fusion | 2, 3 |
| `record` | la bête la plus lourde ou la plus petite que le monde ait portée | 2, 1 |
| `hybridation`, `savoir`, `conception`, `mefiance` | une paire qui se croise pour la première fois ; une bête qui invente un geste ; la Mère qui conçoit ; une population qui se méfie | 1 |
| `nom` | un joueur décrit une lignée et la nomme | 2 |

L'importance dit ce qu'un jeu devrait annoncer (3), ce qu'un carnet raconte (2), ce qu'un registre garde (1). Ce sera le matériau du directeur de mise en scène (phase 4).

La chronique laisse le bruit : les épidémies ordinaires, les migrations, les explosions et les effondrements d'un cycle, les allers-retours d'une zone hybride. Sur la genèse 7, elle garde 2 entrées en 40 cycles quand le moteur en émet plus de 60.

Chaque entrée dit son cycle, sa date, son titre et sa phrase :

```json
{ "n": 3191, "date": "2026-11-05T03:00:00Z", "type": "naissance", "importance": 2, "titre": "Une lignée naît",
  "texte": "Rososil fureteur de tourbière (Tourbière) : lignée issue de rososil, plus petite, née de l'isolement (écart génétique 0.54)",
  "taxon": "rososil.tourbiere", "biome": "tourbiere", "famille": "animale" }
```

**Ce qui est publié** (`mondes/<id>/chronique/`) :
- `index.json` : le compte de chaque sorte d'entrée, les années (leur premier et leur dernier cycle, leur nombre d'entrées), les records, et les 60 dernières entrées, pour un jeu pressé ;
- `<an>.json` : toutes les entrées d'une année du monde (`monde.annee` cycles ; 120 pour le monde d'Orvane). Seul le fichier de l'année en cours change chaque nuit, une ligne par entrée.

Le jour où elle s'éveille, la chronique prend acte de ce qui existe (les souches, les zones hybrides, les records) sans le raconter.

## Le muséum

Un spécimen par lignée, décrit le jour où le monde la voit pour la première fois : son plan, sa silhouette (de quoi la dessiner), ses traits, son lieu, son effectif, et un **spécimen type** : une bête tirée de la population réelle avec `tampon/individus.js` (docs/35). Le spécimen type d'une lignée est toujours la même bête : son hasard ne dépend que de l'identifiant de la lignée.

Quand la lignée s'éteint, le muséum la garde. Il note le cycle et la date, sa durée de vie, son dernier effectif et sa cause, lue dans sa dernière population :

| cause | ce qui la dit |
| --- | --- |
| « chassée par les joueurs » | au moins 35 % de ses morts venaient des joueurs |
| « emportée par une maladie (Kéraose) » | au moins 35 % de ses morts venaient d'une maladie |
| « mangée par ses prédateurs » | au moins la moitié de ses morts |
| « après un incendie » | une catastrophe dans son lieu ce cycle-là |
| « trop peu nombreuse pour tenir », « supplantée par d'autres » | sinon |

C'est l'arbre de la vie entier, que le moteur oubliait : `mondes/<id>/museum.json`, une ligne par spécimen (environ 1,5 Ko chacun). L'observatoire l'ouvre depuis le Journal.

Le muséum empêche aussi une confusion. Le moteur nomme une lignée née de la séparation d'après sa mère et son lieu (`vavator.savane`). Si la même mère se sépare de nouveau au même lieu, longtemps après que la première fille s'est éteinte et a été oubliée, les deux auraient le même identifiant. La nouvelle prend alors le sien (`vavator.savane-212`).

## Les noms

Le premier joueur qui décrit une lignée lui donne son **nom commun**. Le nom du moteur reste (`nom`) ; un jeu montre celui qu'il préfère.

**Proposer un nom**, depuis le jeu :

```
POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_nommer
apikey: <la clé publique du projet>
{ "p_cle": "<la clé du jeu>", "p_compte": "<le joueur>", "p_monde": "orvane", "p_taxon": "vidun", "p_nom": "Grand cerf des brumes", "p_auteur": "Lila" }
→ { "ok": true, "deja": false, "note": "le nom sera retenu au prochain cycle s'il est valable" }
```

`deja` dit si un autre joueur a proposé un nom avant : le jeu peut le dire tout de suite. `p_auteur` est le nom public du joueur, s'il veut le voir écrit (facultatif). Un nom : 2 à 40 lettres, espaces, apostrophes ou traits d'union. Dix noms par jour et par joueur.

**Ce que retient le cycle de nuit.** Les propositions sont lues dans l'ordre d'arrivée (`orvane_lire_noms`, avec le secret de lecture). La première valable de chaque lignée l'emporte :
- la lignée existe, et n'a pas encore de nom ;
- la proposition est arrivée **après** que la lignée a été publiée : on ne réserve pas le nom d'une lignée à naître ;
- le nom n'est pas déjà pris dans ce monde (la casse et les espaces ne comptent pas) ;
- la modération ne l'a pas refusée : `mondes/<id>/noms-refuses.json`, une liste d'identifiants de propositions, tenue à la main.

Une lignée nommée porte, dans l'instantané, ses morceaux et le muséum :

```json
"nom_commun": "Grand cerf des brumes",
"decrit": { "par": "Lila", "jeu": "stone-valley", "cycle": 45, "date": "2026-11-05T08:13:00Z" }
```

La chronique l'annonce : « Lila (stone-valley) décrit Vidun fureteur de mangrove et la nomme « Grand cerf des brumes » ».

Hors ligne, des noms peuvent aussi être déposés à la main dans `mondes/<id>/noms/` (un fichier JSON : une proposition ou une liste), comme les lots.

**La migration Supabase.** La table `orvane_noms` et les deux fonctions sont dans `hebergement/supabase.sql` (la partie « les noms »). Elle se colle comme le reste, une fois. Tant qu'elle ne l'est pas, le cycle de nuit le signale par un avertissement et continue ; les noms attendent.

## Ce que le banc vérifie

`bancs/chronique.js`, en moins de deux minutes :
- **Rien ne change.** La chronique, le muséum et les noms ne touchent ni au monde d'avant ni à celui d'après ; le même monde donne la même chronique, au caractère près.
- **La chronique d'un monde qui vit.** 40 cycles de la genèse 7 : chaque séparation est une naissance, le bruit reste dehors, et une année pèse quelques kilo-octets.
- **Le muséum.** Un spécimen par lignée ; le même spécimen type ; une lignée chassée jusqu'à la dernière reste au muséum, « chassée par les joueurs », quand le moteur l'a oubliée.
- **Les noms.** Le premier valable l'emporte ; un second nom, un doublon, une adresse, un nom réservé d'avance, un nom modéré, une lignée inconnue sont refusés ; le contrat et le Supabase les connaissent.
- **Le cycle de nuit.** Un nom déposé dans `noms/` est retenu et publié ; la chronique par année et le muséum sont écrits.

## Ce qui reste ouvert

- **Le nom dans le jeu.** Stone Valley pourrait proposer un nom depuis le carnet, quand le joueur a vu assez de bêtes d'une lignée, et dire celui des autres.
- **Une chronique racontée.** Les entrées d'importance 3 sont faites pour être dites : un crieur, une gazette, un écran de chargement.
- **Le muséum des jeux.** Un jeu peut montrer une lignée éteinte d'après son seul spécimen : un fossile, un squelette dans une grotte.
