# 39. Le kit du traducteur : des types et un vérificateur

La phase 4 veut qu'un nouveau jeu se branche en jours, pas en semaines. Deux outils y aident déjà : les types du contrat, pour écrire son traducteur sans relire les schémas, et un vérificateur, pour savoir avant le premier dépôt si ce qu'on envoie sera accepté. C'est le début de la deuxième étape de la phase 4.

## Les types (`types/orvane.d.ts`)

Le contrat tient en trois schémas (`schemas/`). `outils/types.js` en tire un fichier de types TypeScript, `types/orvane.d.ts`. Chaque champ y porte sa description, et les noms restent ceux du contrat (en français ; `docs/glossary.md` les traduit).

```ts
import type { Instantane, Lignee, Population, Lot, Evenement } from './orvane';

const inst: Instantane = await (await fetch('https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/instantane.json')).json();
const vivantes: Lignee[] = inst.taxons.filter(t => t.eteint == null);
const nom = vivantes[0].nom_commun ?? vivantes[0].nom;          // docs/37
const forme = vivantes[0].populations[0].groupe?.forme;          // 'meute' | 'troupeau' | … (docs/38)
const e: Evenement = { taxon: 'vidun', biome: 'prairie', action: 'prelevement', n: 3 };   // une action inconnue ne compile pas
```

En JavaScript, les mêmes types servent avec `// @ts-check` : `/** @type {import('./orvane').Instantane} */`.

Les types suivent les schémas : on ne les écrit jamais à la main. Quand un schéma change, on relance `node outils/types.js` ; `node outils/types.js --verifier` sort en erreur si le fichier n'est plus à jour.

Ils sont vérifiés par `tsc --strict` (sans erreur) sur un petit traducteur d'essai.

## Le vérificateur (`outils/verifier.js`)

```
node outils/verifier.js mon-lot.json
✓ mon-lot.json : un lot conforme au contrat, qu'orvane_deposer acceptera

node outils/verifier.js lot-faux.json
✗ lot-faux.json (lot) : 3 problèmes
  $.evenements[1].action : « voler » n'est pas dans ["rencontre","prelevement",…]
  $.evenements[1].n : -1 < 0
  evenements[1] : n doit être un nombre de 0 à 10 000
```

Il devine le genre du fichier (un instantané a des `taxons`, un lot des `evenements`, un profil une `influence` ou une `exposition`), ou on le lui dit (`--lot`, `--instantane`, `--profil`). Pour un lot, il dit aussi ce que le Supabase d'Orvane refusera : plus de 64 Ko, plus de 500 événements, une action inconnue, un `n` hors de 0 à 10 000, un nom réservé. Il s'utilise aussi comme module : `require('./outils/verifier.js').verifier(objet, 'lot')` rend la liste des erreurs, vide si tout va bien.

Les quatre mondes publiés et les trois exemples de `schemas/exemples/` passent.

## Le banc générique (`outils/banc-traducteur.js`, 6 novembre)

Un jeu écrit son traducteur comme un module qui dit cinq choses (le modèle, un safari imaginaire de quarante lignes : `traducteurs/exemple/traducteur.js`) :

```js
module.exports = {
  id: 'mon-jeu', nom: 'Mon jeu',
  biomes: ['prairie', 'foret'],     // les biomes d'Orvane qu'il joue, par type (« prairie » vaut pour « prairie~1 ») ; absent : tous
  familles: ['animale'],            // ce qu'il montre (animale, synthetique, vegetale) ; absent : les bêtes
  lire(instantane) { … },           // ce qu'il montre du monde : des créatures { taxon, biome, … }, chacune rattachée à une lignée
  jouer(instantane, hasard) { … },  // ce que font ses joueurs en une session : un lot (schemas/pression.schema.json)
};
```

```
node outils/banc-traducteur.js mon-traducteur.js [--lumen] [--sessions 20]
```

Le banc le fait lire des mondes variés et vérifie, pour chacun :
1. qu'il lit le monde sans lever d'erreur ;
2. que chaque créature est une lignée vivante, dans un lieu où elle vit et que le jeu dit jouer ;
3. **qu'il n'oublie aucune lignée** : chaque lignée de ses familles, dans chaque lieu qu'il joue, a sa créature ;
4. qu'il lit toujours de la même façon, sans toucher au monde qu'on lui donne ;
5. **que ses lots sont conformes** (le vérificateur, et ce que le Supabase refusera), qu'ils vont au bon monde, et que le tampon n'en écarte aucun événement.

Les mondes : le monde d'Orvane, la genèse 7, la genèse 2026, le monde de Stone Valley, l'exemple du contrat, et **un monde piège**, tiré du monde d'Orvane : une pieuvre à l'organe inconnu (une « lanterne »), une lignée sans corps, une lignée éteinte encore listée, une population de moins d'une bête, une lignée nommée par un joueur, un lieu que nul jeu ne connaît. Avec `--lumen`, un monde imaginaire né d'une genèse, avec ses axes, ses traits et ses organes à lui.

`bancs/traducteur.js` vérifie le banc lui-même : le traducteur d'exemple passe sur les sept mondes ; six traducteurs fautifs sont attrapés, chacun avec sa raison (il plante sur une forme qu'il ne connaît pas, montre les lignées éteintes, oublie celles qu'un joueur a nommées, touche au monde, envoie ses lots à un autre monde, ou des bêtes qui n'existent pas).

## Ce qui reste ouvert (phase 4.2)

- **Le banc, jusqu'au jeu.** Le banc lit ce que le traducteur dit montrer ; il ne voit pas le jeu lui-même. La suite : un mode qui rejoue des lots réels d'un jeu (ceux que garde le Supabase) et dit ce que le monde en a fait.
- **Les types en paquet.** Publier `types/orvane.d.ts` et le tampon comme un paquet npm, pour un `npm install` plutôt qu'une copie.
