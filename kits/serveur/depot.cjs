// Orvane — DÉPOSER DEPUIS UN SERVEUR, en CommonJS (kits/serveur/depot.cjs) — docs/4
// La même chose que depot.mjs, pour un serveur Node qui se sert de require :
//   const { deposer } = require('orvane/serveur');            (ou require('./depot.cjs'), copié à côté de depot.mjs)
//   const r = await deposer({ cle: process.env.ORVANE_CLE_JEU, cleDepot: process.env.ORVANE_CLE_DEPOT }, compteOpaque, lot);
// Le code est celui de depot.mjs, chargé au premier appel : rien n'est écrit deux fois.
'use strict';
let charge = null;
const charger = () => (charge ??= import('./depot.mjs'));
const ORVANE = Object.freeze({ url: 'https://rospodujiyltmxitykwc.supabase.co', apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8' });
async function nouvelId() { return (await charger()).nouvelId(); }
async function deposer(options, compte, lot) { return (await charger()).deposer(options, compte, lot); }
function depot(options) { return { deposer: (compte, lot) => deposer(options, compte, lot) }; }
module.exports = { ORVANE, nouvelId, deposer, depot };
