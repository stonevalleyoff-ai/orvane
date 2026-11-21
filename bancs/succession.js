// Orvane — LE BANC DE LA SUCCESSION (bancs/succession.js, docs/47)
//  1. le jour un : un monde sans succession tourne exactement comme le moteur sans moteur/succession.js ; le jour de l'éveil, rien ne bouge ;
//  2. le feu : un incendie prend les arbres, les buissons, l'herbe de la forêt ; sans la succession, pas un pied ;
//  3. la succession : l'herbe revient la première et passe son poids d'avant, puis les buissons, puis les arbres ; le couvert de la
//     forêt baisse, puis revient ;
//  4. le sec qui dure : sous une sécheresse installée (docs/45), l'herbe meurt, pas les succulentes ;
//  5. sur la durée, le monde garde son poids ;
//  6. les parcelles, le contrat, le cycle de nuit.
//   node bancs/succession.js            (environ 6 minutes ; --court : moins de cycles)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Su = require(racine('moteur/succession.js')), Me = require(racine('moteur/meteo.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js')), Monde = require('./monde.js');
const COURT = process.argv.includes('--court');
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// le monde d'Orvane vu par biome, sans le continent de la genèse 7, avec sa flore et son milieu (bancs/monde.js)
const I0 = Monde.orvane({ continent: '', sans: ['succession', 'phenologie', 'meteo'] });
const estPlante = t => t.plan?.regime === 'vegetal', C0 = Orvane.REGLES.catastrophes;
// les catastrophes d'un monde, réglées : aucune (0), ou un incendie certain partout où le couvert s'y prête
const regler = (I, f) => ({ ...I, monde: { ...I.monde, regles: { ...(I.monde.regles || {}), catastrophes: Object.fromEntries(Object.entries(C0).map(([k, v]) => [k, { ...v, chance: f(k, v) }])) } } });
const calme = I => regler(I, () => 0), feu = I => regler(I, k => k === 'incendie' ? 1000 : 0);
const Wc = Su.eveiller(calme(I0)).inst, Ac = calme(I0);
const poids = (I, lieu, forme) => I.taxons.filter(t => estPlante(t) && !t.eteint && t.plan.forme === forme).reduce((s, t) => s + (t.populations.find(p => p.biome === lieu)?.effectif || 0) * (t.plan.masse_kg || 1), 0);
const lieu = (I, id) => I.biomes.find(b => b.id === id), bio = (I, f) => I.taxons.filter(t => !t.eteint && f(t)).reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0) * (t.plan.masse_kg || 1), 0);
const tout = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif, p.frequences])]);

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './succession.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans succession tourne exactement comme le moteur sans moteur/succession.js');
  const a = Orvane.cycle(Ac, {}), b = Orvane.cycle(Wc, {});
  verif(empreinte(tout(a)) === empreinte(tout(b)) && empreinte(a.biomes.map(x => x.axes)) === empreinte(b.biomes.map(x => x.axes)), 'le jour de l\'éveil, rien ne bouge : les mêmes bêtes, les mêmes plantes, les mêmes lieux');
}

console.log('2. Le feu');
let XF, AF;
{ // un cycle où le feu prend partout où le couvert s'y prête, avec et sans la succession ; puis plus aucune catastrophe
  XF = Orvane.cycle(feu(Wc), {}); AF = Orvane.cycle(feu(Ac), {});
  const brule = XF.evenements.filter(e => e.type === 'catastrophe' && /^incendie/.test(e.detail)).map(e => e.biome), f = brule.includes('foret');
  const r = k => poids(XF, 'foret', k) / poids(AF, 'foret', k), marque = XF.taxons.filter(estPlante).flatMap(t => t.populations).filter(p => p.biome === 'foret' && p.sinistre?.type === 'incendie').length;
  verif(f && r('arbre') < .5 && r('buisson') < .45 && r('herbe') < .9 && marque >= 3, `le feu prend ${brule.length} lieux, dont la forêt : il y reste ${fx(r('arbre') * 100)} % des arbres, ${fx(r('buisson') * 100)} % des buissons, ${fx(r('herbe') * 100)} % de l'herbe ; ${marque} populations de plantes le disent (sinistre)`);
  verif(Math.abs(poids(AF, 'foret', 'arbre') / poids(Orvane.cycle(Ac, {}), 'foret', 'arbre') - 1) < .02, 'sans la succession, le même feu ne prend pas un arbre');
  const sans = brule.length ? XF.biomes.filter(b => !brule.includes(b.id) && b.milieu === 'terrestre').map(b => b.id) : [], epargne = sans.find(id => poids(AF, id, 'herbe') > 0);
  verif(epargne && Math.abs(poids(XF, epargne, 'herbe') / poids(AF, epargne, 'herbe') - 1) < 1e-9, `un lieu que le feu n'a pas pris (${lieu(XF, epargne)?.nom}) garde toutes ses plantes`);
}

console.log('3. La succession');
{ const N = COURT ? 24 : 60, av = { herbe: poids(Wc, 'foret', 'herbe'), buisson: poids(Wc, 'foret', 'buisson'), arbre: poids(Wc, 'foret', 'arbre') }, c0 = lieu(Wc, 'foret').axes.couvert;
  let X = calme(XF), A = calme(AF); const suite = [], couv = [], nat = [];
  for (let k = 0; k < N; k++) { X = Orvane.cycle(X, {}); A = Orvane.cycle(A, {}); suite.push({ herbe: poids(X, 'foret', 'herbe') / poids(A, 'foret', 'herbe'), buisson: poids(X, 'foret', 'buisson') / poids(A, 'foret', 'buisson'), arbre: poids(X, 'foret', 'arbre') / poids(A, 'foret', 'arbre') });
    couv.push(lieu(X, 'foret').axes.couvert); for (const e of X.evenements) if ((e.type === 'nature' || e.type === 'transformation') && e.biome === 'foret') nat.push(e.detail); }
  const sommet = k => { let m = 0, ou = 0; suite.forEach((s, i) => { if (s[k] > m) { m = s[k]; ou = i + 1; } }); return [m, ou]; }, retour = (k, seuil) => suite.findIndex(s => s[k] >= seuil) + 1;
  const H = sommet('herbe'), Bu = sommet('buisson'), ra = retour('arbre', .9), fin = suite[N - 1];
  verif(H[0] > 1.05 && H[1] < (ra || N + 1) && Bu[0] > 1 && fin.arbre > suite[0].arbre + (COURT ? .05 : .15),
    `après le feu : l'herbe de la forêt monte à ${fx(H[0] * 100)} % de son poids sans feu au cycle ${H[1]}, les buissons à ${fx(Bu[0] * 100)} % au cycle ${Bu[1]} ; les arbres, de ${fx(suite[0].arbre * 100)} %, sont à ${fx(fin.arbre * 100)} % au cycle ${N}${ra ? ` (à 90 % au cycle ${ra})` : ''}`);
  const bas = Math.min(...couv), ou = couv.indexOf(bas) + 1;
  verif(bas < c0 - .1 && (COURT || couv[N - 1] > bas + .02), `le couvert de la forêt suit ses arbres : de ${fx(c0, 2)} il tombe à ${fx(bas, 2)} au cycle ${ou}, ${COURT ? 'et il est' : 'puis remonte'} à ${fx(couv[N - 1], 2)} au cycle ${N}`);
  console.log(`    (ce que le lieu en dit : ${nat.length ? nat.slice(0, 3).map(d => `« ${d} »`).join(' ; ') : 'rien'})`);
}

console.log('4. Le sec qui dure');
{ const N = COURT ? 14 : 20, g = clone(Me.REGLES), Wm = Me.eveiller(Wc).inst, Am = Me.eveiller(Ac).inst; let X = Wm, A = Am;
  Object.assign(Me.REGLES, { force: { e: -1.3, t: 0 } }); try { for (let k = 0; k < N; k++) { X = Orvane.cycle(X, {}); A = Orvane.cycle(A, {}); } } finally { for (const k of Object.keys(g)) Me.REGLES[k] = g[k]; }
  const sec = lieu(X, 'prairie').meteo?.secheresse || 0, rh = poids(X, 'prairie', 'herbe') / poids(A, 'prairie', 'herbe'), rs = poids(X, 'desert', 'succulente') / poids(A, 'desert', 'succulente');
  verif(sec >= .5 && rh < .95 && rs > rh + .03, `${N} cycles secs (la sécheresse de la prairie à ${fx(sec, 2)}) : il reste ${fx(rh * 100)} % de l'herbe de la prairie qu'il y aurait sans la succession, ${fx(rs * 100)} % des succulentes du désert`);
}

console.log('5. Sur la durée');
{ const N = COURT ? 20 : 50, W = Su.eveiller(I0).inst; let X = W, A = I0, feux = 0; for (let k = 0; k < N; k++) { X = Orvane.cycle(X, {}); A = Orvane.cycle(A, {}); feux += X.evenements.filter(e => e.type === 'catastrophe').length; }
  const rb = bio(X, t => !estPlante(t)) / bio(A, t => !estPlante(t)), rp = bio(X, estPlante) / bio(A, estPlante), vifs = I => I.taxons.filter(t => !t.eteint && !estPlante(t)).length;
  verif(rb > .9 && rb < 1.1 && rp > .85 && rp < 1.15 && Math.abs(vifs(X) - vifs(A)) <= 5, `${N} cycles avec et sans la succession (${feux} catastrophes) : les bêtes pèsent ${fx(rb * 100, 1)} % de ce qu'elles pèsent sans elle, les plantes ${fx(rp * 100, 1)} %, ${vifs(X)} lignées de bêtes contre ${vifs(A)}`);
  verif(empreinte(Orvane.cycle(Orvane.cycle(W, {}), {})) === empreinte(Orvane.cycle(Orvane.cycle(W, {}), {})), 'deux fois le même monde');
}

console.log('6. Les parcelles, le contrat, le cycle de nuit');
{ const P = Su.eveiller(feu(Parcelles.decouper(I0, { par: 2 }))).inst, Y = Orvane.cycle(P, {}), V = Parcelles.regrouper(Y), X = Orvane.cycle(XF, {});
  const e = [...val(S, Tampon.filtrer(X, { familles: ['animale', 'vegetale'] }), '$'), ...val(S, Tampon.filtrer(V, { familles: ['animale', 'vegetale'] }), '$')];
  const touchees = Y.taxons.filter(estPlante).flatMap(t => t.populations).filter(p => p.sinistre).length;
  verif(!e.length && touchees > 0, `l'instantané et ses plantes respectent le schéma, par biome et par parcelles (${touchees} populations de plantes touchées, parcelle par parcelle)` + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-succession'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-succession', succession: true, meteo: false, climat: false, natures: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-succession', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^succession : /gm) || []).length === 1 && Ip.monde.succession, 'le profil demande la succession (monde.succession), elle s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
