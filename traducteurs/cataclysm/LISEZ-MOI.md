# Le traducteur Cataclysm: Dark Days Ahead

Comment Cataclysm: Dark Days Ahead (la version stable 0.I) se branche sur Orvane sans toucher au jeu : un **mod** que le jeu charge comme les autres, et une **passerelle** qui travaille autour de lui, avant et après la partie.

```
passerelle.py   preparer : le monde du jour devient le mod « orvane » (avant de jouer)
                compter, envoyer : les bêtes d'Orvane tuées partent vers Orvane (après avoir joué)
banc.py         le banc d'essai : un faux dossier de jeu, de fausses sauvegardes, sans réseau
```

```
Orvane (instantane.json) ──► passerelle preparer ──► mods/orvane/ ──► Cataclysm
                                                                         │
Orvane (orvane_deposer) ◄── passerelle envoyer ◄── passerelle compter ◄──┘  (les sauvegardes)
```

## En bref

Il faut Python 3.8 ou plus. La passerelle n'a pas d'autre dépendance, sauf pour les sauvegardes compressées (plus bas).

```sh
# avant de jouer : écrire le mod et l'activer dans un monde
python passerelle.py --cdda "C:\Jeux\Cataclysm" preparer --activer "Mon monde"

# après avoir joué : compter les bêtes tuées et les envoyer
python passerelle.py --cdda "C:\Jeux\Cataclysm" apres

# où en est la passerelle
python passerelle.py --cdda "C:\Jeux\Cataclysm" etat
```

`--cdda` est le dossier du jeu qui contient `save/`. Sous Windows, avec le lanceur, c'est le dossier du jeu lui-même ; sous Linux, `~/.cataclysm-dda` ; sous macOS, `~/Library/Application Support/Cataclysm`. La passerelle range ses fichiers dans `<cdda>/orvane-passerelle/` (`--etat` pour un autre endroit).

Pour un monde nouveau, il suffit de cocher « Orvane » dans la liste des mods à sa création. `--activer-tous` l'ajoute à tous les mondes existants.

## Orvane → le jeu : le mod

`preparer` lit `instantane.json` (et `generation-0.json`, la référence), en garde une copie pour jouer hors ligne, et écrit `<cdda>/mods/orvane/` : `modinfo.json`, `creatures.json` et `groupes.json`.

**Les biomes.** Le jeu se passe en Nouvelle-Angleterre : six biomes d'Orvane y ont une place. Chacun complète un groupe de faune sauvage du jeu, sans le remplacer.

| groupe du jeu (0.I) | où le jeu le place | biome d'Orvane | lignées |
| --- | --- | --- | --- |
| `GROUP_FOREST` | forêts (et, un peu, les champs) | `foret` | de terre |
| `GROUP_SWAMP` | forêts marécageuses | `marais` | toutes |
| `GROUP_RIVER`, `GROUP_STREAM` | rivières, ruisseaux | `riviere` | toutes |
| `GROUP_POND_ANIMAL`, `GROUP_POND_FISH` | étangs | `lac` | de terre, d'eau |
| `GROUP_CAVE` | grottes | `grotte` | de terre |
| `GROUP_OCEAN_SHORE` | bord de mer | `cote` | d'eau |

Les champs tirent aussi leur faune de `GROUP_FOREST`, bien moins que les forêts : tout ce groupe compte comme la forêt. Une lignée d'eau est une lignée qui nage et n'a ni mode de terre ni vol.

**Les créatures.** Une lignée devient une créature par biome, `mon_orvane_<biome>_<lignée>` (`mon_orvane_marais_dunvi_jungle` pour `dunvi.jungle`) : une bête tuée dit ainsi d'elle-même où elle vivait. Chaque créature copie un animal sauvage du jeu, son **modèle**, dont elle prend la conduite, les attaques, la découpe et le dessin :

| forme | herbivore | omnivore | carnivore |
| --- | --- | --- | --- |
| quadrupède, bipède | tamia, écureuil, marmotte, cerf | rat, opossum, raton laveur, sanglier | belette, vison, renard, lynx, coyote, puma |
| oiseau | moineau, corneille, canard, dindon | (les mêmes) | (les mêmes) |
| serpent | couleuvre | couleuvre | couleuvre, crotale |
| hexapode | criquet | poisson d'argent | araignée sauteuse |
| lignée d'eau | crapet, carpe, carpe herbivore | (les mêmes) | brochet, maskinongé |

Dans chaque case, le modèle suit la masse (le détail : `MODELES` dans `passerelle.py`). Un filtreur se traduit comme un herbivore. Le reste vient d'Orvane :
- la masse donne le poids, le volume (une densité de 1) et les points de vie (`10 × masse^0,4`, à la mesure de la faune du jeu : 60 pour 87 kg, quand le cerf du jeu en a 65) ;
- `vitesse_rel` donne la vitesse (`40 + 25 × vitesse_rel` ; 100 est un humain) ;
- `temperament` donne l'agressivité et le moral : un herbivore fuit toujours, un carnivore hardi (au-delà de 0,75) attaque ;
- `sociabilite` donne la taille des groupes ; la couleur de la robe, la couleur du terminal la plus proche ; le nom est `nom_commun`, sinon `nom`.

Une créature ne grandit jamais en monstre du jeu (`"upgrades": false`), et ses petits, si son modèle se reproduit, sont de sa lignée.

**Combien.** Dans un biome, une lignée paraît en proportion de son effectif ; une lignée sous un deux-millième de l'effectif du biome ne paraît pas. Les lignées d'Orvane font `--part` de la faune du groupe (0,35 par défaut) quand le biome a l'effectif de la genèse, davantage s'il a prospéré, moins s'il a décliné (de × 0 à × 3). Le jeu place la faune quand il crée une zone : une zone déjà visitée garde la sienne, et c'est en explorant qu'on voit le monde du jour.

**Une lignée éteinte.** Elle ne paraît plus, mais sa créature reste définie : une sauvegarde où elle se trouve se charge encore. Si le monde d'Orvane est refait de zéro (`monde.ne` change), ses anciennes créatures restent définies et ne sont plus renvoyées.

## Le jeu → Orvane : les pressions

**Ce qui compte.** Le jeu tient, dans la sauvegarde de chaque personnage, le compte des monstres tués par lui et par ses compagnons (`kill_tracker`). `compter` lit ce compte dans chaque monde où le mod est actif, garde les créatures d'Orvane, et renvoie ce qui a été tué depuis le dernier compte, en `prelevement`, dans le biome de la créature. Les zombies, les humains, les robots et la faune du jeu ne sont jamais renvoyés. Une sauvegarde plus ancienne rechargée ne renvoie rien (le compte a baissé) : on ne compte que ce qui s'ajoute.

**Le lot.** Un lot par monde et par compte, au contrat (`schemas/pression.schema.json`) : `instantane` est le cycle du mod, `source.compte` une empreinte (`h:…`) d'un identifiant tiré au hasard et gardé dans `etat.json`, `source.zone` une empreinte du nom du monde. Les lots attendent dans `orvane-passerelle/lots/`.

**L'envoi.** `envoyer` dépose chaque lot avec `orvane_deposer` et la clé du jeu. Un lot accepté va dans `envoyes/`. Un refus qui passe avec le temps (le quota du jour, un jeu suspendu, Orvane injoignable) laisse les lots attendre le prochain envoi ; un lot refusé comme faux va dans `refuses/`, avec la réponse. `apres` fait `compter` puis `envoyer`.

**Les essais.** `compter --essai` (ou `apres --essai`) écrit les lots dans `essais/`, ne retient rien et n'envoie jamais. Une partie d'essai ne doit pas peser sur le monde partagé : jouez vos essais avec `--essai`, ou dans un monde sans le mod.

**Les clés.** La clé du jeu (`CLE_JEU`) est dans `passerelle.py` : elle est publique, elle ne sert qu'à déposer. La clé d'administration n'est ni ici ni dans le jeu ; elle ne sert qu'à régler l'exposition, depuis la page d'inscription.

## Les sauvegardes compressées

En 0.I, un monde neuf est compressé par défaut (l'option « World data compression ») : la sauvegarde du personnage est alors `<nom>.sav.zzip`, des trames zstd à la suite (`src/zzip.h` du jeu). La passerelle la lit elle-même, mais il lui faut un décompresseur zstd, le premier trouvé parmi :
- Python 3.14 ou plus (`compression.zstd`) ;
- le paquet `zstandard` (`pip install zstandard`) ou `pyzstd` ;
- la bibliothèque `libzstd` (souvent déjà là sous Linux et macOS) ;
- la commande `zstd`.

Sans aucun, `compter` le dit et s'arrête. On peut aussi créer le monde avec l'option désactivée.

## Ce qui n'est pas renvoyé

- **Les rencontres.** Le jeu ne note pas les bêtes vues. Sans rencontres, la méfiance d'Orvane ne se nourrit que des prélèvements.
- **Les captures.** Apprivoiser une bête ne laisse pas de trace que la passerelle puisse lire.
- **Les bêtes tuées par un personnage mort depuis le dernier compte.** Le jeu efface sa sauvegarde. Comptez après chaque partie : le lanceur le fera seul (plus bas).
- **Les variantes et les traits continus.** Le mod ne montre pas les phénotypes ; les lots n'ont ni `phenotype` ni `q`.

## Le banc

```sh
python3 traducteurs/cataclysm/banc.py
python3 traducteurs/cataclysm/banc.py --cdda-source CHEMIN   # le code source du jeu 0.I
```

Il prépare le mod depuis `mondes/orvane/`, fabrique des sauvegardes (en clair, et compressées avec deux versions de la même fiche), compte, essaie, envoie à un Orvane imité (accepté, refusé, quota), refait le monde de zéro, et passe chaque lot à `outils/verifier.js`. Avec `--cdda-source`, il vérifie aussi le mod contre les données du jeu : les modèles existent et sont des animaux sauvages, ceux qui se reproduisent sont bien ceux que la passerelle croit, les groupes existent avec les poids que la passerelle retient, les couleurs sont connues.

Ce que le banc ne fait pas : charger le mod dans le jeu lui-même. Sur une machine où le jeu est installé, `cataclysm --check-mods orvane` (ou un nouveau monde avec le mod coché) le confirme.

## Ensuite : dans le lanceur

Le lanceur Kitten (`Fris0uman/CDDA-Game-Launcher`, licence MIT) lance le jeu et sait quand il se ferme. Il suffira qu'il appelle `preparer` avant de lancer le jeu et `apres` quand il se ferme, avec un onglet « Orvane » pour l'activer et voir les lots, et le paquet `zstandard` dans son exécutable. `passerelle.py` est fait pour être copié tel quel, avec la ligne `Required Notice` en tête.
