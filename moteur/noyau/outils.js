// Orvane — LES OUTILS DU CŒUR (moteur/noyau/outils.js) — docs/59
// Ce dont tout le cœur du moteur se sert : borner un nombre, copier un état, et le hasard. Tout le hasard d'un cycle vient d'ici,
// semé par la graine du monde et le numéro du cycle (rng), ou par un nom (hasard) : même graine, même cycle, mêmes tirages.
'use strict';
(function (racine) {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clone = o => JSON.parse(JSON.stringify(o));
  // (docs/52) un tirage qui ne dépend que d'un nom, de la graine et du cycle : il ne prend rien au hasard du cycle
  const hasard = (s, g, n) => { let h = (2166136261 ^ (g >>> 0)) >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    h = (Math.imul(h ^ 0x6d2b79f5, 2654435761) ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
  function rng(graine, n) {           // un générateur par cycle, semé par la graine du monde et le numéro de cycle
    let g = ((graine >>> 0) ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0;
    return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
  }
  const API = { clamp, clone, hasard, rng };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneOutils = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
