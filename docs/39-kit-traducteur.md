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

## Ce qui reste ouvert (phase 4.2)

- **Un banc générique.** Un jeu donne sa correspondance (ses biomes, ses espèces) et son traducteur ; le banc le fait lire des mondes variés (le monde d'Orvane, la genèse 7, Lumen) et vérifie qu'il n'oublie aucune lignée et n'envoie que des lots conformes.
- **Les types en paquet.** Publier `types/orvane.d.ts` et le tampon comme un paquet npm, pour un `npm install` plutôt qu'une copie.
