// Orvane — LE BANC DU MONDE PAR MORCEAUX (bancs/morceaux.js, docs/21)
//  1. le découpage : un index léger, un fichier par biome, un fichier par lignée ;
//  2. tous les biomes réunis redonnent instantane.json ; quelques biomes, l'instantané réduit à ces biomes, au même contrat ;
//  3. dans un navigateur, le même résultat ; le cycle de nuit publie les morceaux et retire ceux d'une lignée éteinte ;
//  4. les planches (monde/planches.js) : chaque bête de chaque biome dessinée, avec ses yeux, le même texte à chaque fois.
//   node bancs/morceaux.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const M = require(racine('tampon/morceaux.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const clone = o => JSON.parse(JSON.stringify(o)), ko = o => fmt(JSON.stringify(o).length / 1024), fmt = x => (+x).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I = lireJ('mondes/orvane/instantane.json'), rang = new Map(I.biomes.map((b, i) => [b.id, i]));
// ce que les morceaux doivent redonner : l'instantané réduit aux biomes B, ses populations dans l'ordre des biomes du monde
const attendu = B => { const R = B ? Tampon.filtrer(clone(I), { biomes: B }) : clone(I), o = (a, b) => rang.get(a.biome) - rang.get(b.biome), ids = new Set();
  R.taxons = R.taxons.filter(t => t.populations.length).map(t => { ids.add(t.id); t.populations.sort(o);
    for (const p of t.phenotypes) if (p.frequence_par_biome) p.frequence_par_biome = Object.fromEntries(Object.entries(p.frequence_par_biome).filter(([b]) => !B || B.includes(b)).sort(([a], [b]) => rang.get(a) - rang.get(b)));
    return t; });
  R.evenements = (I.evenements || []).filter(e => e.type === 'eveil' || !e.taxon || ids.has(e.taxon) || rang.has(e.taxon));
  R.precedent = { cycle: I.precedent.cycle, taxons: I.precedent.taxons.map(t => ({ ...t, populations: t.populations.filter(p => !B || B.includes(p.biome)).sort(o) })).filter(t => t.populations.length) };
  return R; };
const pareil = (a, b) => ['orvane', 'monde', 'cycle', 'biomes', 'catalogue', 'taxons', 'evenements', 'precedent'].every(k => JSON.stringify(a[k]) === JSON.stringify(b[k]));

(async () => {
  console.log('1. Le découpage');
  const D = M.decouper(I), cles = Object.keys(D), B = cles.filter(c => c.startsWith('biomes/')), L = cles.filter(c => c.startsWith('lignees/'));
  const tailles = B.map(c => JSON.stringify(D[c]).length / 1024);
  verif(D['index.json'] && B.length === I.biomes.length && L.length === I.taxons.length,
    `${cles.length} fichiers : l'index (${ko(D['index.json'])} Ko, contre ${ko(I)} Ko pour instantane.json), ${B.length} biomes (de ${fmt(Math.min(...tailles))} à ${fmt(Math.max(...tailles))} Ko), ${L.length} lignées`);
  const ix = D['index.json'].taxons[0]; verif(ix.nom && ix.famille && ix.regime && ix.effectif >= 0 && ix.biomes.length && D[ix.fichier], "chaque lignée a sa ligne dans l'index (nom, famille, régime, masse, effectif, biomes) et son fichier");

  console.log('2. Réunir les morceaux');
  const lecteur = async c => clone(D[c]);
  const tout = await M.lire('x', { lecteur }); verif(pareil(tout, attendu(null)), 'tous les biomes réunis redonnent instantane.json, le cycle d\'avant compris (populations dans l\'ordre des biomes)');
  const choix = ['prairie', 'foret'], deux = await M.lire('x', { lecteur, biomes: choix });
  verif(pareil(deux, attendu(choix)), `la prairie et la forêt seules : ${deux.taxons.length} lignées, ${ko(deux)} Ko, exactement l'instantané réduit à ces deux biomes`);
  const e = val(S, deux, '$'); verif(!e.length, "il respecte schemas/instantane.schema.json : le reste du code d'un jeu le lit comme instantane.json" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const L1 = D[ix.fichier]; verif(JSON.stringify(L1.taxon) === JSON.stringify(I.taxons[0]) && L1.precedent?.id === I.taxons[0].id, 'le fichier d\'une lignée la donne entière, avec son cycle d\'avant');

  console.log('3. Le navigateur, le cycle de nuit');
  const ctx = { console, JSON, Math, Promise, Object, Set, Map }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(racine('tampon/morceaux.js'), 'utf8'), ctx);
  ctx.D = D; const nav = await vm.runInContext("OrvaneMorceaux.lire('x', { biomes: ['prairie', 'foret'], lecteur: async c => JSON.parse(JSON.stringify(D[c])) })", ctx);
  verif(JSON.stringify(nav) === JSON.stringify(deux), 'dans un navigateur (globalThis.OrvaneMorceaux), le même instantané');
  const dossier = racine('mondes/essai-morceaux'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(path.join(dossier, 'morceaux', 'lignees'), { recursive: true });
  try { const E = lireJ('mondes/orvane/etat.json'), pf = lireJ('mondes/orvane/profil.json');
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...pf, monde: { ...pf.monde, id: 'essai-morceaux', synthetique: false, flore: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(E)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(E));
    fs.writeFileSync(path.join(dossier, 'morceaux', 'lignees', 'eteinte.json'), '{}');
    execFileSync('node', [racine('hebergement/cycle.js'), 'essai-morceaux', '--sans-reseau', '--cycles', '1'], { encoding: 'utf8' });
    const P = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')), mo = path.join(dossier, 'morceaux');
    const lu = await M.lire('x', { lecteur: async c => JSON.parse(fs.readFileSync(path.join(mo, c), 'utf8')) }), n = fs.readdirSync(path.join(mo, 'lignees')).length;
    verif(lu.cycle.n === P.cycle.n && lu.taxons.length === P.taxons.length && n === P.taxons.length && !fs.existsSync(path.join(mo, 'lignees', 'eteinte.json')),
      `le cycle de nuit publie les morceaux à côté de instantane.json (${n} lignées, celles du cycle), et retire ceux d'une lignée qui n'est plus`);
    const ns = fs.existsSync(path.join(mo, 'silhouettes')) ? fs.readdirSync(path.join(mo, 'silhouettes')).length : 0;
    verif(ns === P.biomes.length, `il publie aussi une planche par biome (morceaux/silhouettes/, ${ns} fichiers pour ${P.biomes.length} biomes)`);
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }

  console.log('4. Les planches');
  const Pl = require(racine('monde/planches.js')), Q = Pl.planches(D), QB = Object.keys(Q);
  const betes = c => D[c].taxons.filter(t => t.plan && t.plan.regime !== 'vegetal' && t.plan.famille !== 'vegetale' && (t.plan.corps || t.plan.regime === 'synthetique'));
  const manque = B.flatMap(c => betes(c).filter(t => !Q['silhouettes/' + c.slice(7)]?.silhouettes[t.id]).map(t => t.id));
  const nb = QB.reduce((s, c) => s + Object.keys(Q[c].silhouettes).length, 0), to = QB.map(c => JSON.stringify(Q[c]).length / 1024);
  verif(QB.length === B.length && !manque.length, `une planche par biome, chaque bête dessinée : ${nb} dessins, de ${fmt(Math.min(...to))} à ${fmt(Math.max(...to))} Ko par biome` + (manque.length ? ` ; sans dessin : ${manque.slice(0, 5).join(', ')}` : ''));
  const tous = QB.flatMap(c => Object.values(Q[c].silhouettes));
  verif(tous.every(x => x.svg.startsWith('<svg') && x.svg.endsWith('</svg>') && x.svg.includes('viewBox="0 0 170 90"')), 'chaque dessin est un SVG de 170 × 90');
  const dedans = tous.filter(x => x.yeux.length && x.yeux.every(([x0, y0, r]) => x0 >= 0 && x0 <= 170 && y0 >= 0 && y0 <= 90 && r > 0)).length;
  verif(dedans === tous.length, `chaque dessin dit où sont ses yeux, dans son cadre (${dedans} sur ${tous.length}) : un jeu les fait briller la nuit`);
  const doublons = QB.filter(c => { const ids = Object.values(Q[c].silhouettes).flatMap(x => [...x.svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1])); return new Set(ids).size !== ids.length; });
  verif(!doublons.length, 'deux dessins d\'une même planche ne partagent aucune découpe (les identifiants sont propres à chaque lignée)');
  verif(JSON.stringify(Pl.planches(D)) === JSON.stringify(Q), 'dessinées deux fois, les planches sont les mêmes, au caractère près (rien ne change d\'un cycle à l\'autre si les bêtes ne changent pas)');
  const pr = Q['silhouettes/prairie.json'], t0 = Object.keys(pr.silhouettes)[0], ph = Pl.dominant(D['biomes/prairie.json'].taxons.find(t => t.id === t0), 'prairie');
  verif(!ph || pr.silhouettes[t0].phenotype === ph.id, `chaque bête est dessinée sous sa variante la plus fréquente dans ce biome (${t0} : ${ph?.id ?? 'sans variante'})`);
  console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'}`); process.exit(ok ? 0 : 1);
})();
