// Lisière — LE MONDE GARDÉ DANS LE JEU (jeux/lisiere/outils/secours.js)
// Le jeu lit le monde d'Orvane en ligne. Sans réseau, il joue avec une copie de quelques lieux, gardée dans donnees/ : ce script
// la refait, depuis le monde publié (par défaut) ou un dossier de monde, au même format que les morceaux (docs/21), allégée de
// ce que le jeu ne lit pas. Les planches (les bêtes dessinées) sont refaites ici, par monde/planches.js ; l'herbier (les plantes
// dessinées, et le temps qu'il fait, docs/49) est pris tel qu'il est publié, ou refait d'après flore.json par monde/herbier.js.
//   node jeux/lisiere/outils/secours.js [--depuis <url ou dossier mondes/<id>/>] [--lieux foret,prairie,…]
'use strict';
const fs = require('fs'), path = require('path');
const ICI = path.join(__dirname, '..'), RACINE = path.join(ICI, '..', '..');
const Planches = require(path.join(RACINE, 'monde/planches.js')), Herbier = require(path.join(RACINE, 'monde/herbier.js'));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DEPUIS = arg('--depuis', 'https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/');
const LIEUX = arg('--lieux', 'foret,prairie,lande,taiga,marais').split(',').filter(Boolean);
const lire = async c => {
  if (/^https?:/.test(DEPUIS)) { const r = await fetch(DEPUIS.replace(/\/?$/, '/') + 'morceaux/' + c, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${c} : HTTP ${r.status}`); return r.json(); }
  return JSON.parse(fs.readFileSync(path.join(DEPUIS, 'morceaux', c), 'utf8'));
};
// ce que le monde publie à côté de ses morceaux (flore.json) ; null s'il ne l'a pas
const lireACote = async c => { try { if (/^https?:/.test(DEPUIS)) { const r = await fetch(DEPUIS.replace(/\/?$/, '/') + c, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } return JSON.parse(fs.readFileSync(path.join(DEPUIS, c), 'utf8')); } catch (e) { return null; } };
const ecrire = (c, o) => { const f = path.join(ICI, 'donnees', c); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); return fs.statSync(f).size; };

(async () => {
  const index = await lire('index.json'), garder = new Set();
  fs.rmSync(path.join(ICI, 'donnees'), { recursive: true, force: true });
  let total = 0, flore;
  for (const b of LIEUX) {
    const M = await lire('biomes/' + encodeURIComponent(b) + '.json');
    // de chaque lignée, ce que le jeu lit : son plan, sa population ici, sa variante la plus fréquente ici
    const taxons = M.taxons.filter(t => t.plan && t.plan.regime !== 'vegetal').map(t => { garder.add(t.id); const ph = Planches.dominant(t, b);
      return { id: t.id, nom: t.nom, ...(t.nom_commun ? { nom_commun: t.nom_commun } : {}), eteint: t.eteint ?? null, statut: t.statut, plan: t.plan,
        populations: t.populations.map(p => ({ biome: p.biome, effectif: p.effectif, ...(p.groupe ? { groupe: p.groupe } : {}) })),
        phenotypes: ph ? [{ id: ph.id, traits: ph.traits || [], frequence_par_biome: { [b]: ph.frequence_par_biome?.[b] ?? ph.frequence ?? 1 } }] : [] }; });
    const morceau = { orvane: M.orvane, monde: M.monde, cycle: M.cycle, biome: M.biome, taxons };
    const t1 = ecrire('biomes/' + b + '.json', morceau), t2 = ecrire('silhouettes/' + b + '.json', Planches.planche(M, index.catalogue?.monde || null));
    // l'herbier du lieu : celui que le monde publie, sinon refait d'après ses plantes ; un monde sans flore n'en a pas
    let H = null; try { H = await lire('herbier/' + encodeURIComponent(b) + '.json'); } catch (e) { if (flore === undefined) flore = await lireACote('flore.json'); if (flore) H = Herbier.planche(flore, M.biome, { orvane: M.orvane, monde: M.monde, cycle: M.cycle }); }
    const t3 = H && Object.keys(H.plantes || {}).length ? ecrire('herbier/' + b + '.json', H) : 0;
    total += t1 + t2 + t3; console.log(`${b} : ${taxons.length} lignées (${Math.round(t1 / 1024)} Ko), planche ${Math.round(t2 / 1024)} Ko${t3 ? `, herbier ${Math.round(t3 / 1024)} Ko (${Object.keys(H.plantes).length} plantes)` : ''}`);
  }
  total += ecrire('index.json', { orvane: index.orvane, morceaux: index.morceaux, secours: { lieux: LIEUX, depuis: DEPUIS, le: new Date().toISOString().slice(0, 10) },
    monde: { id: index.monde?.id, nom: index.monde?.nom, ne: index.monde?.ne, genre: index.monde?.genre }, cycle: index.cycle,
    biomes: index.biomes.map(b => ({ id: b.id, nom: b.nom, milieu: b.milieu, axes: b.axes, voisins: b.voisins, ...(b.meteo && typeof b.meteo === 'object' ? { meteo: b.meteo } : {}) })), catalogue: {}, evenements: [],
    taxons: index.taxons.filter(t => garder.has(t.id)) });
  console.log(`le monde gardé dans le jeu : cycle ${index.cycle?.n}, ${LIEUX.length} lieux, ${Math.round(total / 1024)} Ko → jeux/lisiere/donnees/`);
})().catch(e => { console.error('secours :', e.message); process.exit(1); });
