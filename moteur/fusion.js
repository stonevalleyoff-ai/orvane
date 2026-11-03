// Orvane — LA FUSION DE MONDES (moteur/fusion.js) — docs/14
// Deux mondes nés de deux genèses n'en font plus qu'un. Cette première version fusionne biome par biome : les lignées
// du second monde (la source) arrivent dans les biomes choisis du premier (la cible), avec une part de leurs effectifs ;
// le moteur fait le reste, cycle après cycle (concurrence, prédation, migrations vers les voisins).
//   - chaque arbre garde sa racine : une lignée arrivée n'a aucun ancêtre dans la cible, et deux lignées de mondes
//     différents ne s'hybrident jamais (le moteur ne croise que des lignées apparentées : Orvane.parente) ;
//   - un nom déjà pris dans la cible (le même mot inventé par deux genèses) est remplacé par un nom neuf ;
//   - une lignée arrivée garde son histoire dans « origine » (son monde, son cycle d'apparition là-bas) ; dans la
//     cible, elle apparaît au cycle de la fusion, et le journal le dit (un événement « apparition » par lignée) ;
//   - la cible garde la trace de chaque fusion (monde.fusions) : la même fusion n'est jamais appliquée deux fois.
// Déterministe : mêmes mondes, mêmes options ⇒ même résultat. Node (require) ou navigateur (globalThis.OrvaneFusion).
//   node moteur/fusion.js <cible.json> <source.json> [--biomes recif,large] [--part 0.5] [--id mer-1] [--sortie fusion.json]
'use strict';
(function (racine) {
const clone = o => JSON.parse(JSON.stringify(o));
const sansAccent = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// les syllables de la genèse (moteur/genese.js) : un nom neuf ressemble aux autres
const SYL = ['va', 'ro', 'lin', 'ka', 'mé', 'tor', 'sil', 'ou', 'ne', 'gra', 'vi', 'lo', 'mu', 'ren', 'ta', 'ki', 'so', 'bel', 'dun', 'fir', 'or', 'ys', 'an', 'el', 'tis', 'cor', 'ume', 'ja', 'phé', 'nou'];
function generateur(graine) { let g = (graine ^ 0xf05e) >>> 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; }

// La fusion. cible, source : deux instantanés (ou états) complets. Rend { inst, bilan, evenements } (les arrivées) ; la cible
// n'est pas modifiée.
//   opt.biomes : les biomes où la source arrive (par défaut, tous ceux qu'elle a et que la cible a aussi) ;
//   opt.part   : la part des effectifs de la source qui arrive (0,5 par défaut) : sous un individu, la population ne vient pas ;
//   opt.id     : le nom de cette fusion (par défaut « <id de la source> ») ; une fusion déjà faite n'est pas refaite.
function fusionner(cible, source, opt = {}) {
  const part = Number.isFinite(opt.part) ? Math.max(0, Math.min(1, opt.part)) : .5;
  const id = opt.id || source.monde?.id || 'source';
  const deja = (cible.monde?.fusions || []).some(f => f.id === id);
  if (deja) return { inst: cible, bilan: { id, deja: true, lignees: 0 }, evenements: [] };
  const inst = clone(cible), n = inst.cycle?.n ?? 0;
  // (docs/15) une cible découpée en parcelles : on choisit ses biomes (ses types), et une population arrive répartie entre
  // les parcelles de son biome, selon leur capacité
  const parcelles = inst.monde?.parcelles?.types ? inst.biomes : null, parType = {};
  if (parcelles) for (const b of parcelles) (parType[b.type || b.id] ??= []).push(b);
  const biomesCible = new Set(parcelles ? inst.monde.parcelles.types.map(b => b.id) : inst.biomes.map(b => b.id));
  const etaler = q => { const L = parType[q.biome]; if (!L || L.length < 2) return [L ? { ...q, biome: L[0].id } : q];
    const W = L.reduce((x, b) => x + (b.capacite || 0), 0) || 1, best = L.reduce((m, b) => (b.capacite || 0) > (m.capacite || 0) ? b : m, L[0]);
    let reste = 0; const parts = L.map(b => { const e = q.effectif * (b.capacite || 0) / W; if (e < 1 && b !== best) { reste += e; return [b, 0]; } return [b, e]; });
    return parts.map(([b, e]) => [b, b === best ? e + reste : e]).filter(([, e]) => e >= 1).map(([b, e]) => ({ ...q, biome: b.id, effectif: Math.round(e) })); };
  const choisis = new Set((opt.biomes && opt.biomes.length ? opt.biomes : source.biomes.map(b => b.id)).filter(b => biomesCible.has(b)));
  if (!choisis.size) throw new Error('fusion : aucun biome commun aux deux mondes');

  // 1. ce qui arrive : les lignées vivantes de la source, leurs populations des biomes choisis, à la part dite
  const arrivent = [];
  for (const t of source.taxons) {
    if (t.eteint != null) continue;
    const pops = t.populations.filter(p => choisis.has(p.biome)).map(p => { const q = { ...clone(p), effectif: Math.round(p.effectif * part) }; delete q.hybride; return q; }).filter(p => p.effectif >= 1).flatMap(etaler).filter(p => p.effectif >= 1);   // (une zone hybride de la source n'a plus de sens ici)
    if (pops.length) arrivent.push({ t, pops });
  }
  // 2. les noms : un identifiant (ou le premier mot d'un nom) déjà porté dans la cible, même par une lignée éteinte, est remplacé
  const motsCible = new Set(), idsCible = new Set(inst.taxons.map(t => t.id));
  for (const t of inst.taxons) { motsCible.add(sansAccent(String(t.nom || '').split(' ')[0])); motsCible.add(t.id); }
  const pris = new Set([...motsCible, ...arrivent.map(a => a.t.id)]), R = generateur((source.monde?.graine ?? 1) * 31 + n);
  const nomNeuf = () => { for (;;) { const k = 2 + Math.floor(R() * 2); let s = ''; for (let i = 0; i < k; i++) s += SYL[Math.floor(R() * SYL.length)];
    const mot = s[0].toUpperCase() + s.slice(1), cle = sansAccent(mot); if (!pris.has(cle)) { pris.add(cle); return { mot, cle }; } } };
  const ids = new Map(), renommes = [];
  for (const { t } of arrivent) {
    const mot = String(t.nom || t.id).split(' ')[0];
    if (idsCible.has(t.id) || motsCible.has(sansAccent(mot)) || motsCible.has(t.id)) {
      const neuf = nomNeuf(); ids.set(t.id, neuf.cle); renommes.push({ avant: t.id, apres: neuf.cle, nom: neuf.mot + String(t.nom || '').slice(mot.length) });
    } else ids.set(t.id, t.id);
  }
  const nomDe = new Map(renommes.map(r => [r.avant, r.nom]));
  // 3. les parents : celui de la source s'il arrive aussi ; sinon le plus proche ancêtre qui arrive ; sinon aucun (une racine)
  const parSource = new Map(source.taxons.map(t => [t.id, t]));
  const parentArrive = pid => { const vus = new Set(); while (pid && !vus.has(pid)) { vus.add(pid); if (ids.has(pid)) return ids.get(pid); pid = parSource.get(pid)?.parent || null; } return null; };
  // 4. les lignées arrivées, ajoutées à la cible
  const monde = source.monde || {}, evenements = [];
  for (const { t, pops } of arrivent) {
    const nid = ids.get(t.id), garder = new Set(pops.map(p => p.biome));
    const ph = clone(t.phenotypes).map(p => { if (p.frequence_par_biome) p.frequence_par_biome = Object.fromEntries(Object.entries(p.frequence_par_biome).flatMap(([b, v]) => (parType[b] ? parType[b].map(x => [x.id, v]) : [[b, v]])).filter(([b]) => garder.has(b))); return p; });
    inst.taxons.push({ id: nid, nom: nomDe.get(t.id) || t.nom, parent: parentArrive(t.parent), apparu: n, eteint: null, statut: 'croissance', plan: clone(t.plan),
      populations: pops.map(p => ({ ...p, tendance: 0, depuis: n })), phenotypes: ph,
      origine: { monde: monde.id || id, nom: monde.nom || monde.id || id, id: t.id, apparu: t.apparu ?? 0, fusion: id } });
    evenements.push({ type: 'apparition', taxon: nid, biome: pops.slice().sort((a, b) => b.effectif - a.effectif)[0].biome, detail: `arrivée de ${monde.nom || monde.id || id} (fusion ${id})` });
  }
  // 5. le catalogue : les traits que portent les arrivées
  inst.catalogue = inst.catalogue || { version: '0.1', traits: {} }; inst.catalogue.traits = inst.catalogue.traits || {};
  for (const [k, v] of Object.entries(source.catalogue?.traits || {})) if (!(k in inst.catalogue.traits)) inst.catalogue.traits[k] = clone(v);
  // 6. la trace : dans le monde, et au journal du cycle
  const bilan = { id, monde: monde.id || id, cycle: n, part, biomes: [...choisis], lignees: arrivent.length, renommees: renommes.length,
    individus: arrivent.reduce((s, a) => s + a.pops.reduce((x, p) => x + p.effectif, 0), 0) };
  inst.monde.fusions = [...(inst.monde.fusions || []), { id, monde: bilan.monde, nom: monde.nom || bilan.monde, cycle: n, part, biomes: bilan.biomes, lignees: bilan.lignees }];
  inst.evenements = [...(inst.evenements || []), ...evenements];
  return { inst, bilan: { ...bilan, renommes }, evenements };
}

const API = { fusionner };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneFusion = API;

// --- en ligne de commande ---
if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs'), a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
  const [fc, fsrc] = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  if (!fc || !fsrc) { console.log('node moteur/fusion.js <cible.json> <source.json> [--biomes a,b] [--part 0.5] [--id nom] [--sortie fusion.json]'); process.exit(1); }
  const lireJ = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  const r = fusionner(lireJ(fc), lireJ(fsrc), { biomes: arg('--biomes', '') ? arg('--biomes').split(',') : null, part: arg('--part', null) != null ? +arg('--part') : undefined, id: arg('--id', undefined) });
  const sortie = arg('--sortie', 'fusion.json'); fs.writeFileSync(sortie, JSON.stringify(r.inst));
  console.log(`fusion ${r.bilan.id} : ${r.bilan.lignees} lignées arrivent (${r.bilan.individus} individus, part ${r.bilan.part}) dans ${(r.bilan.biomes || []).join(', ')} ; ${r.bilan.renommees || 0} renommée(s) → ${sortie}`);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
