// Orvane — LE MONDE PAR MORCEAUX (tampon/morceaux.js) — docs/21
// instantane.json fait plus d'un mégaoctet. À chaque cycle, le monde est aussi publié par morceaux, dans mondes/<id>/morceaux/ :
//   index.json            le monde, le cycle, les biomes, le catalogue, le journal, et une ligne par lignée (son nom, sa famille,
//                         son régime, sa masse, son effectif, ses biomes) : quelques dizaines de kilo-octets
//   biomes/<biome>.json   les lignées qui y vivent, avec leurs seules populations de ce biome (et le cycle d'avant, pour interpoler)
//   lignees/<id>.json     une lignée entière, avec toutes ses populations
// Un jeu lit l'index, puis les biomes qu'il joue :
//   const inst = await OrvaneMorceaux.lire('https://…/mondes/orvane/', { biomes: ['foret', 'prairie'] });
// rend un instantané au même contrat (schemas/instantane.schema.json), réduit à ces biomes : tout le reste du code du jeu le lit
// comme instantane.json. Node (require) ou navigateur (globalThis.OrvaneMorceaux). Zéro dépendance.
'use strict';
(function (racine) {
const FAMILLES = { synthetique: 'synthetique', vegetal: 'vegetale' };
const familleDe = t => t.plan?.famille || FAMILLES[t.plan?.regime] || 'animale';
const fichier = id => encodeURIComponent(id) + '.json';
// une lignée réduite à quelques biomes : ses populations là, et les fréquences de ses variantes là
function dans(t, B) {
  const populations = t.populations.filter(p => B.has(p.biome)); if (!populations.length) return null;
  return { ...t, populations, phenotypes: t.phenotypes.map(p => p.frequence_par_biome ? { ...p, frequence_par_biome: Object.fromEntries(Object.entries(p.frequence_par_biome).filter(([b]) => B.has(b))) } : p) };
}
// le monde publié → { chemin: contenu } : index.json, biomes/<id>.json, lignees/<id>.json
function decouper(inst) {
  const out = {}, prec = new Map((inst.precedent?.taxons || []).map(t => [t.id, t])), tete = { orvane: inst.orvane, monde: { id: inst.monde?.id }, cycle: inst.cycle };
  out['index.json'] = { orvane: inst.orvane, morceaux: 1, monde: inst.monde, cycle: inst.cycle, biomes: inst.biomes, ...(inst.parcelles ? { parcelles: inst.parcelles } : {}), catalogue: inst.catalogue,
    evenements: inst.evenements || [], ...(inst.precedent ? { precedent: { cycle: inst.precedent.cycle, ids: [...prec.keys()] } } : {}),
    taxons: inst.taxons.map(t => ({ id: t.id, nom: t.nom, famille: familleDe(t), regime: t.plan?.regime, masse_kg: t.plan?.masse_kg, statut: t.statut,
      effectif: Math.round(t.populations.reduce((s, p) => s + p.effectif, 0)), biomes: t.populations.map(p => p.biome), fichier: 'lignees/' + fichier(t.id) })) };
  for (const b of inst.biomes) { const B = new Set([b.id]), taxons = inst.taxons.map(t => dans(t, B)).filter(Boolean);
    out['biomes/' + fichier(b.id)] = { ...tete, biome: b, taxons,
      precedent: [...prec.values()].filter(t => t.populations.some(p => p.biome === b.id)).map(t => ({ id: t.id, populations: t.populations.filter(p => p.biome === b.id), phenotypes: t.phenotypes })) }; }
  for (const t of inst.taxons) out['lignees/' + fichier(t.id)] = { ...tete, taxon: t, ...(prec.has(t.id) ? { precedent: prec.get(t.id) } : {}) };
  return out;
}
// l'index et des morceaux de biomes → un instantané réduit à ces biomes (populations dans l'ordre des biomes du monde)
function assembler(index, parBiome) {
  const rang = new Map(index.biomes.map((b, i) => [b.id, i])), ordre = (a, b) => (rang.get(a.biome) ?? 1e9) - (rang.get(b.biome) ?? 1e9);
  const vus = new Map(), prec = new Map();
  for (const M of Object.values(parBiome).sort((a, b) => (rang.get(a.biome.id) ?? 0) - (rang.get(b.biome.id) ?? 0))) {
    for (const t of M.taxons) { const T = vus.get(t.id); if (!T) { vus.set(t.id, { ...t, populations: [...t.populations], phenotypes: t.phenotypes.map(p => ({ ...p, ...(p.frequence_par_biome ? { frequence_par_biome: { ...p.frequence_par_biome } } : {}) })) }); continue; }
      T.populations.push(...t.populations); T.phenotypes.forEach((p, i) => { if (p.frequence_par_biome) Object.assign(p.frequence_par_biome, t.phenotypes[i]?.frequence_par_biome); }); }
    for (const t of M.precedent || []) { const P = prec.get(t.id); if (P) P.populations.push(...t.populations); else prec.set(t.id, { id: t.id, populations: [...t.populations], phenotypes: t.phenotypes }); }
  }
  const taxons = index.taxons.map(x => vus.get(x.id)).filter(Boolean);
  for (const t of taxons) { t.populations.sort(ordre); for (const p of t.phenotypes) if (p.frequence_par_biome) p.frequence_par_biome = Object.fromEntries(Object.entries(p.frequence_par_biome).sort(([a], [b]) => (rang.get(a) ?? 1e9) - (rang.get(b) ?? 1e9))); }
  const ids = new Set(taxons.map(t => t.id)), bids = new Set(index.biomes.map(b => b.id));
  const out = { orvane: index.orvane, monde: index.monde, cycle: index.cycle, biomes: index.biomes, ...(index.parcelles ? { parcelles: index.parcelles } : {}), catalogue: index.catalogue, taxons,
    evenements: (index.evenements || []).filter(e => e.type === 'eveil' || !e.taxon || ids.has(e.taxon) || bids.has(e.taxon)) };
  if (index.precedent) out.precedent = { cycle: index.precedent.cycle, taxons: (index.precedent.ids || []).map(id => prec.get(id)).filter(Boolean).map(t => ({ ...t, populations: t.populations.sort(ordre) })) };
  return out;
}
// lire en ligne : l'index, puis les biomes demandés (tous, sans opt.biomes). opt.lecteur : une fonction (chemin) → objet, pour lire autrement que par fetch
async function lire(base, opt = {}) {
  const b = base.endsWith('/') ? base : base + '/', L = opt.lecteur || (async c => { const r = await fetch(b + 'morceaux/' + c, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${c} : HTTP ${r.status}`); return r.json(); });
  const index = await L('index.json'), voulus = opt.biomes?.length ? opt.biomes.filter(id => index.biomes.some(x => x.id === id)) : index.biomes.map(x => x.id);
  const parBiome = {}; await Promise.all(voulus.map(async id => { parBiome[id] = await L('biomes/' + fichier(id)); }));
  return assembler(index, parBiome);
}
const API = { decouper, assembler, lire, dans, familleDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneMorceaux = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
