// Orvane — UN TRADUCTEUR D'EXEMPLE (traducteurs/exemple/traducteur.js) — docs/39
// Le plus petit traducteur qui se branche correctement sur un monde Orvane : un jeu de safari imaginaire. Il sert de modèle à un
// nouveau jeu, et d'essai au banc générique (outils/banc-traducteur.js), qui le fait lire des mondes variés.
// Un traducteur, pour le banc, c'est un module qui dit :
//   id, nom                      le jeu (source.jeu de ses lots)
//   biomes                       les biomes d'Orvane qu'il joue, par type (« prairie » vaut pour « prairie~1 ») ; absent : tous
//   familles                     ce qu'il montre (animale, synthetique, vegetale : tampon/tampon.js) ; absent : les bêtes
//   lire(instantane)             ce qu'il montre du monde : des créatures, chacune rattachée à une lignée (taxon) et à un biome
//   jouer(instantane, hasard)    ce que font ses joueurs en une session : un lot (schemas/pression.schema.json)
// Ici, le jeu montre chaque lignée vivante de ses biomes, une créature par biome où elle vit (au moins une bête), sous son nom
// commun s'il en a un ; ses joueurs rencontrent quelques bêtes et en chassent une parfois.
'use strict';
const BIOMES = ['prairie', 'savane', 'foret', 'jungle', 'marais', 'lac', 'riviere', 'cote', 'steppe', 'toundra'];
const typeDe = id => String(id).split('~')[0];
const animale = t => !t.eteint && t.plan && t.plan.regime !== 'vegetal' && t.plan.regime !== 'synthetique';

function lire(inst) {
  const C = [];
  for (const t of inst.taxons || []) {
    if (!animale(t)) continue;
    for (const p of t.populations || []) {
      if (!(p.effectif >= 1) || !BIOMES.includes(typeDe(p.biome))) continue;
      C.push({ taxon: t.id, biome: p.biome, nom: t.nom_commun || t.nom || t.id, nombre: Math.max(1, Math.round(Math.log10(p.effectif + 1))),
        regime: t.plan.regime, masse_kg: t.plan.masse_kg, forme: t.plan.corps?.forme || 'inconnue' });   // (une forme inconnue : le jeu dessine un repli)
    }
  }
  return C;
}

function jouer(inst, hasard) {
  const C = lire(inst), lot = { orvane: inst.orvane || '1.0', monde: inst.monde?.id, instantane: inst.cycle?.n, source: { jeu: 'safari-exemple', compte: 'h:' + Math.floor(hasard() * 1e9).toString(16) },
    periode: { debut: inst.cycle?.date || '2026-01-01T00:00:00Z', fin: inst.cycle?.date || '2026-01-01T00:00:00Z' }, evenements: [] };
  if (!C.length) return lot;
  for (let k = 0; k < 3; k++) { const c = C[Math.floor(hasard() * C.length)];
    lot.evenements.push({ taxon: c.taxon, biome: c.biome, action: 'rencontre', n: 1 + Math.floor(hasard() * 5) });
    if (hasard() < .3) lot.evenements.push({ taxon: c.taxon, biome: c.biome, action: 'prelevement', n: 1 }); }
  return lot;
}

module.exports = { id: 'safari-exemple', nom: 'Safari (exemple)', biomes: BIOMES, familles: ['animale'], lire, jouer };
