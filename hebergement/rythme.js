// Orvane — LE RYTHME D'UN MONDE HÉBERGÉ (hebergement/rythme.js) — docs/19
// Un monde tourne à chaque heure de cycle franchie depuis son dernier cycle. Les heures de cycle partent de monde.heure (03:00 UTC
// par défaut, un lundi) et reviennent toutes les monde.cycle : à 03:00 chaque jour pour un monde au jour, à chaque heure pleine pour
// un monde à l'heure. Le cycle (hebergement/cycle.js --auto) et la veille (hebergement/veille.js) le lisent ici, de la même façon.
//   periodeDe('24h') → 86 400 000 ms ;  dus(profil, dernier, maintenant) → { du, heure } : les cycles dus, et la dernière heure de cycle passée
'use strict';
const periodeDe = c => { c = String(c || '24h'); const n = parseFloat(c) || 24; return c.endsWith('d') ? n * 864e5 : c.endsWith('min') || c.endsWith('m') ? n * 6e4 : n * 36e5; };
function dus(profil, dernier, maintenant) {
  const per = periodeDe(profil?.monde?.cycle), [hh, mm] = String(profil?.monde?.heure || '03:00').split(':').map(Number), A = Date.UTC(1970, 0, 5) + ((hh || 0) * 60 + (mm || 0)) * 6e4;
  const k = Math.floor((maintenant - A) / per);
  return { du: k - Math.floor((dernier - A) / per), heure: A + k * per, periode: per };
}
module.exports = { periodeDe, dus };
