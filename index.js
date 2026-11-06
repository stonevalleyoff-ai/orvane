// Orvane — LE PAQUET (index.js) — docs/43
// Ce qu'un jeu écrit en JavaScript (Node, ou un empaqueteur pour le navigateur) prend d'un seul require :
//   const { Orvane, Tampon, Solo, CONTRAT } = require('orvane');
//   npm install github:stonevalleyoff-ai/orvane#v1.0.0
// Chaque module se prend aussi seul : require('orvane/moteur/solo.js'), require('orvane/tampon/individus.js')… Dans un navigateur
// sans empaqueteur, on charge les fichiers par leurs balises <script> (docs/19) : chacun se pose sur globalThis (OrvaneSolo…).
// Les types du contrat (TypeScript) : import type { Instantane, Lot, Profil } from 'orvane'.
'use strict';
const Orvane = require('./moteur/orvane.js');
module.exports = {
  CONTRAT: Orvane.CONTRAT,                                   // la version du contrat (MAJEUR.MINEUR) : instantane.orvane
  version: require('./package.json').version,                // la version du paquet
  Orvane,                                                    // le moteur : Orvane.cycle(instantane, pressions)
  Tampon: require('./tampon/tampon.js'),                     // les lots des joueurs → les pressions du cycle (docs/4)
  Solo: require('./moteur/solo.js'),                         // un monde solo, dans le jeu (docs/19)
  Genres: require('./moteur/genres.js'),                     // les profils de genre (docs/41)
  Parcelles: require('./moteur/parcelles.js'),               // un monde à parcelles, vu par biome (docs/15)
  Collectif: require('./moteur/collectif.js'),               // la vie en groupe, les migrations (docs/38)
  Corps: require('./moteur/corps.js'),                       // la silhouette d'une lignée (docs/11, 33)
  Individus: require('./tampon/individus.js'),               // une bête tirée de sa population (docs/35)
  Morceaux: require('./tampon/morceaux.js'),                 // un instantané en morceaux, pour le lire en partie (docs/19)
  Directeur: require('./tampon/directeur.js'),               // ce qu'un jeu de ce genre devrait montrer (docs/40)
  verifier: require('./outils/verifier.js').verifier         // vérifier un lot, un instantané, un profil contre le contrat (docs/39)
};
