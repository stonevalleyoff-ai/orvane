// Orvane — LA SIMULATION EN DIRECT, le travailleur (simulation/travailleur.js)
// Le moteur d'Orvane tourne ici, dans un Web Worker : un cycle du monde d'Orvane prend une à quelques secondes, et la page, qui
// fait vivre les bêtes à l'écran, ne doit pas figer pendant ce temps. Les modules dans l'ordre de docs/19, puis le noyau.
'use strict';
importScripts('../moteur/catalogue.js', '../moteur/corps.js', '../moteur/dietes.js', '../moteur/flore.js', '../moteur/derives.js', '../moteur/pathogenes.js',
  '../moteur/milieu.js', '../moteur/synthetique.js', '../moteur/ponte.js', '../moteur/stades.js', '../moteur/invention.js', '../moteur/natures.js',
  '../moteur/climat.js', '../moteur/grammaire.js', '../moteur/castes.js', '../moteur/formes.js', '../moteur/esprit.js', '../moteur/orvane.js',
  '../tampon/tampon.js', '../moteur/parcelles.js', '../moteur/collectif.js', '../moteur/solo.js', '../tampon/individus.js', '../moteur/chronique.js',
  'noyau.js', 'messagerie.js');
const recevoir = OrvaneMessagerie(m => postMessage(m));
onmessage = e => recevoir(e.data);
