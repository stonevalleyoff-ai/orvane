// Orvane — LES PLANCHES (monde/planches.js) — docs/21
// À chaque cycle, chaque lignée d'un biome dessinée, comme sur une planche de naturaliste : pour qu'un jeu, dans n'importe quel
// moteur, montre les bêtes d'Orvane sans refaire leur dessin. Godot lit un SVG (Image.load_svg_from_string), un navigateur aussi.
//   morceaux/silhouettes/<biome>.json : { orvane, monde, cycle, biome, cadre: [170, 90],
//     silhouettes: { <lignée>: { svg, yeux: [[x, y, r], …], sol, phenotype } } }
// Chaque bête est dessinée de profil, la tête à droite, sous sa variante la plus fréquente dans ce biome (monde/silhouette.js),
// et remplit son cadre : sa taille vraie est dans son plan (masse_kg, taille_m). Ses yeux sont dans le même cadre, pour les faire
// briller la nuit ; sol : elle tient debout sur le bas du cadre (sinon, elle nage ou flotte au milieu).
// Les plantes n'y sont pas (elles sont dans flore.json) ; une lignée sans corps ni modules non plus.
//   Planches.planches(morceaux) → { 'silhouettes/<biome>.json': … }, morceaux : ce que rend tampon/morceaux.js (decouper)
//   Planches.planche(M) → la planche d'un morceau de biome (biomes/<biome>.json)
(function (racine) {
'use strict';
if (typeof module !== 'undefined' && module.exports && !racine.OrvaneCorps) racine.OrvaneCorps = require('../moteur/corps.js');
const Sil = () => racine.OrvaneSilhouette || require('./silhouette.js');

// la variante la plus fréquente d'une lignée dans ce biome (ses traits font son dessin)
function dominant(t, biome) {
  let best = null, f = -1;
  for (const p of t.phenotypes || []) { const v = p.frequence_par_biome?.[biome] ?? p.frequence ?? 0; if (v > f) { f = v; best = p; } }
  return best;
}
// les identifiants des découpes d'un dessin, propres à la lignée (deux dessins d'une même page ne se mêlent pas, et le même
// dessin garde le même texte d'un cycle à l'autre)
const nommer = (svg, id) => { let j = 0; const vus = new Map();
  return svg.replace(/sil\d+/g, s => { if (!vus.has(s)) vus.set(s, `o-${id}-${++j}`); return vus.get(s); }); };

function planche(M, catalogue) {
  const S = Sil(), Co = racine.OrvaneCorps, b = M.biome?.id, avant = catalogue && Co?.etendre ? Co.etendre(catalogue) : undefined, silhouettes = {};
  try {
    for (const t of M.taxons || []) {
      const p = t.plan; if (!p || p.regime === 'vegetal' || p.famille === 'vegetale') continue;
      if (!p.corps && p.regime !== 'synthetique') continue;
      const ph = dominant(t, b), o = {};
      try {
        const svg = nommer(S.dessiner(p.corps, p, ph?.traits || [], o), t.id);
        silhouettes[t.id] = { svg, yeux: o.yeux || [], sol: !!o.sol, ...(ph?.id ? { phenotype: ph.id } : {}) };
      } catch (e) { /* une forme que le dessin ne connaît pas encore : la lignée n'a pas de planche, le jeu fait sans */ }
    }
  } finally { if (avant !== undefined) Co.etendre(avant); }
  return { orvane: M.orvane, monde: { id: M.monde?.id }, cycle: M.cycle, biome: b, cadre: [170, 90], silhouettes };
}

function planches(morceaux) {
  const out = {}, cat = morceaux['index.json']?.catalogue?.monde || null;
  for (const [c, M] of Object.entries(morceaux)) { const m = /^biomes\/(.+)$/.exec(c); if (m) out['silhouettes/' + m[1]] = planche(M, cat); }
  return out;
}

const API = { planche, planches, dominant };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvanePlanches = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
