# 43. Les versions : un contrat qui ne casse pas sans prévenir

Un jeu qui se branche sur Orvane lit son instantané et lui écrit des lots. Pour qu'un studio s'y fie, il doit savoir deux choses : ce qui peut changer sans danger, et comment il sera prévenu de ce qui changerait le reste. C'est ce que règle la version du contrat.

## Le numéro

Orvane suit la règle des versions sémantiques : **MAJEUR.MINEUR.CORRECTIF**, dans `package.json`. La première version stable est la **1.0.0**, du 7 novembre 2026.

| ce qui change | la version | ce qu'un jeu fait |
| --- | --- | --- |
| le moteur se trompait, il ne se trompe plus ; le format ne bouge pas | CORRECTIF (1.0.0 → 1.0.1) | rien |
| un ajout : un champ, une valeur, un mécanisme, un lieu | MINEUR (1.0 → 1.1) | rien ; il s'en servira s'il veut |
| un changement qui peut casser un jeu | MAJEUR (1 → 2) | il lit le journal, et s'adapte avant la date annoncée |

Chaque instantané porte la version de son contrat, MAJEUR.MINEUR : `"orvane": "1.0"`. Le moteur la dit aussi (`Orvane.CONTRAT`).

## Ce qui casse, et ce qui ne casse pas

Tout dépend du sens.

**Ce qu'Orvane écrit et que les jeux lisent** (l'instantané) :
- **ne casse pas** : un champ nouveau, une valeur nouvelle (une forme de corps, un régime, un type d'événement, un lieu), une borne plus large ;
- **casse** : un champ retiré, un champ qui n'est plus toujours là, un type nouveau pour un champ connu (un nombre qui pourrait devenir un texte).

Il faut donc qu'**un jeu ignore ce qu'il ne connaît pas** : un champ, une valeur, un biome. C'est la seule règle qu'on lui demande, et c'est elle qui permet à Orvane de grandir sans casser personne.

**Ce que les jeux écrivent et qu'Orvane lit** (les lots, les profils) :
- **ne casse pas** : accepter davantage (un champ facultatif nouveau, une action nouvelle, une borne plus large) ;
- **casse** : un champ exigé de plus, une action ou un champ qu'Orvane n'accepte plus, un type, une borne ou un motif plus étroits.

Orvane accepte les lots et les profils de toutes les versions de son majeur, et du majeur d'avant. Les lots marqués « 0.1 » restent acceptés.

## Le garde-fou

`outils/contrat.js` compare les schémas d'une PR à ceux de `main`, champ par champ, et dit ce qui casse et ce qui s'ajoute.

```
node outils/contrat.js                    # contre origin/main
node outils/contrat.js --base v1.0.0      # contre une version publiée
```

Il tourne à chaque PR, dans les vérifications (`.github/workflows/verifications.yml`, la vérification `contrat`). Une PR qui casse le contrat sans passer à la version majeure suivante est refusée. Il vérifie aussi que la version est la même partout : `package.json`, `Orvane.CONTRAT` et une entrée du journal.

Essayé le 6 novembre : un champ retiré de l'instantané, une action que les lots n'auraient plus le droit d'envoyer, un champ exigé de plus dans les lots. Les trois sont attrapés. Sans la version 2, la vérification échoue.

## Le journal

`CHANGELOG.md` dit, version par version, ce qui change pour un jeu. Ce qui est fait mais pas encore publié va sous « À venir ». Un changement qui casse y est annoncé **avant** d'arriver, avec sa date.

## Le paquet

```
npm install github:stonevalleyoff-ai/orvane#v1.0.0
```

Il contient le moteur, le tampon, les schémas, les types, le vérificateur, le traducteur d'exemple et la documentation, sans les mondes : 354 Ko compressés.

```js
const { Orvane, Tampon, Solo, Genres, CONTRAT, verifier } = require('orvane');
```

En TypeScript : `import type { Instantane, Lot, Profil } from 'orvane'`. Chaque module se prend aussi seul (`require('orvane/moteur/solo.js')`). Dans un navigateur sans empaqueteur, on charge les fichiers par leurs balises `<script>`, comme avant (docs/19).

Le paquet n'est pas encore sur le registre npm : il s'installe depuis GitHub, à une version précise. Le jour où il y sera, `npm install orvane` suffira.

## Publier une version

1. Changer `version` dans `package.json`. Pour un MINEUR ou un MAJEUR, changer aussi `CONTRAT` dans `moteur/orvane.js`.
2. Écrire son entrée `## [X.Y.Z] — date` dans `CHANGELOG.md`, avec ce qui était sous « À venir ».
3. Fusionner la PR.

L'action `.github/workflows/version.yml` publie alors la version : l'étiquette `vX.Y.Z` et sa page « Release » sur GitHub, avec l'entrée du journal.

## Ce qui reste ouvert

- **Le registre npm.** Publier le paquet sous le nom `orvane` demande un compte npm.
- **Des types pour le moteur lui-même.** `types/orvane.d.ts` décrit le contrat (ce qu'on lit et écrit), pas encore les fonctions du moteur (`Orvane.cycle`, `Solo.creer`…).
- **Les autres documents publiés.** La chronique, le muséum et les morceaux (`chronique/`, `museum.json`, `morceaux/`) n'ont pas encore de schéma : le garde-fou ne les voit pas.
