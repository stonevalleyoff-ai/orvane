// Orvane — LE BANC DES SAISONS DES PLANTES (bancs/phenologie.js, docs/46)
//  1. le jour un : un monde sans phénologie tourne exactement comme le moteur sans moteur/phenologie.js ; le jour de l'éveil, rien ne bouge ;
//  2. le calendrier : le nectar au printemps, les fruits à la fin de l'été, les graines à l'automne, chacun de moyenne 1 ; la pousse à la
//     belle saison ; la force des saisons de chaque lieu ; qui est caduc, qui est persistant ;
//  3. une année : une forêt nue, en bourgeons, en fleurs, en feuilles, en fruits, dont les feuilles tombent ; la jungle toujours verte ;
//     les butineurs mangent mieux au printemps, les mangeurs de fruits à la fin de l'été ; le monde garde son poids ;
//  4. la neige : l'herbe sous la neige, l'arbre non ;
//  5. les parcelles, le contrat, le cycle de nuit.
//   node bancs/phenologie.js            (environ 8 minutes ; --court : une demi-année)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Ph = require(racine('moteur/phenologie.js')), Fl = require(racine('moteur/flore.js')), Me = require(racine('moteur/meteo.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js')), Monde = require('./monde.js');
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
// le monde d'Orvane vu par biome, sans le continent de la genèse 7, avec sa flore (bancs/monde.js)
const I0 = Monde.orvane({ continent: '', sans: ['phenologie', 'meteo'] }), W = Ph.eveiller(I0).inst;
const estPlante = t => t.plan?.regime === 'vegetal', animaux = I => I.taxons.filter(t => !estPlante(t)).map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const avec = (o, f) => { const g = clone(Ph.REGLES); Object.assign(Ph.REGLES, o); try { return f(); } finally { for (const k of Object.keys(g)) Ph.REGLES[k] = g[k]; } };
const plante = (I, lieu, forme) => I.taxons.find(t => estPlante(t) && !t.eteint && t.plan.forme === forme && t.populations.some(p => p.biome === lieu)), popDe = (t, lieu) => t?.populations.find(p => p.biome === lieu);
const bio = (I, f) => I.taxons.filter(t => !t.eteint && f(t)).reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0) * (t.plan.masse_kg || 1), 0);

console.log('1. Le jour un');
{ // le moteur et la flore, chargés sans moteur/phenologie.js
  const charger = (f, req) => { const mod = { exports: {} }; vm.runInNewContext(fs.readFileSync(racine('moteur/' + f), 'utf8'), { module: mod, require: req, console }); return mod.exports; };
  const floreSans = charger('flore.js', p => p === './phenologie.js' ? null : require(racine('moteur/' + p.replace('./', ''))));
  const sans = charger('orvane.js', p => p === './phenologie.js' ? null : p === './flore.js' ? floreSans : require(racine('moteur/' + p.replace('./', ''))));
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = sans.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans phénologie tourne exactement comme le moteur sans moteur/phenologie.js');
  const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}), nues = I => I.taxons.filter(estPlante).map(t => [t.id, t.populations.map(p => [p.biome, p.effectif, p.frequences])]);
  const st = b.taxons.filter(estPlante).flatMap(t => t.populations).filter(p => p.stade).length;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && empreinte(nues(a)) === empreinte(nues(b)) && st > 0, `le jour de l'éveil, rien ne bouge (l'effet monte en un an) ; ${st} populations de plantes disent déjà leur stade`);
}

console.log('2. Le calendrier');
{ const an = f => { let s = 0, mx = 0, ou = 0; for (let i = 0; i < 1200; i++) { const v = f(i / 1200); s += v; if (v > mx) { mx = v; ou = i / 1200; } } return [s / 1200, mx, ou]; };
  const N = an(p => Ph.calendrier('nectar', p)), F = an(p => Ph.calendrier('fruits', p)), G = an(p => Ph.calendrier('graines', p));
  verif([N, F, G].every(x => Math.abs(x[0] - 1) < 1e-3) && N[2] > .25 && N[2] < .4 && F[2] > .6 && F[2] < .75 && G[2] > .75 && G[2] < .9 && Ph.calendrier('feuilles', .1) === 1,
    `le nectar culmine au printemps (× ${fx(N[1], 1)}, phase ${fx(N[2], 2)}), les fruits à la fin de l'été (× ${fx(F[1], 1)}, phase ${fx(F[2], 2)}), les graines à l'automne (× ${fx(G[1], 1)}, phase ${fx(G[2], 2)}) ; chacun vaut 1 en moyenne sur l'année ; les feuilles ne bougent pas`);
  const B = Object.fromEntries(W.biomes.map(b => [b.id, b])), f = id => Ph.forceDe(B[id], Orvane.REGLES.saisons);
  verif(f('foret') === 1 && f('jungle') > 0 && f('jungle') < .3 && f('volcan') === 0, `la force des saisons : entière dans la forêt, ${fx(f('jungle'), 2)} dans la jungle, nulle au volcan`);
  const L = W.taxons.filter(t => estPlante(t) && (t.plan.forme === 'arbre' || t.plan.forme === 'buisson')), cad = L.filter(t => t.plan.feuillage === 'caduc'), fe = (lieu, forme) => plante(W, lieu, forme)?.plan.feuillage;
  verif(L.every(t => t.plan.feuillage) && fe('foret', 'arbre') === 'caduc' && fe('taiga', 'arbre') === 'persistant' && fe('jungle', 'arbre') === 'persistant', `${cad.length} lignées d'arbres et de buissons sur ${L.length} sont caduques : les arbres de la forêt le sont, ceux de la taïga et de la jungle gardent leurs feuilles`);
  // la pousse au fil de l'année, effet entier
  avec({ rampe: 0 }, () => { const X = { ...W, cycle: { ...W.cycle } }, pousse = (lieu, forme, ph) => Ph.preparer({ monde: { ...X.monde, annee: 1000 }, n: Math.round(ph * 1000), phase: ph, biomes: B, saisons: Orvane.REGLES.saisons }).pousse(lieu, plante(W, lieu, forme).plan);
    const moy = (lieu, forme) => { let s = 0; for (let i = 0; i < 100; i++) s += pousse(lieu, forme, i / 100); return s / 100; };
    verif(pousse('foret', 'arbre', 0) === 0 && pousse('foret', 'arbre', .5) === 2 && Math.abs(moy('foret', 'arbre') - 1) < 1e-6 && pousse('taiga', 'arbre', 0) > .6 && Math.abs(pousse('jungle', 'arbre', 0) - 1) < .1,
      `un arbre de la forêt ne pousse plus au cœur de l'hiver et pousse double au cœur de l'été (1 en moyenne) ; un arbre de la taïga garde ${fx(pousse('taiga', 'arbre', 0) * 100)} % de sa pousse l'hiver, un arbre de la jungle ${fx(pousse('jungle', 'arbre', 0) * 100)} %`); });
}

console.log('3. Une année');
{ const N = COURT ? 60 : 120, st = [], jungle = new Set(), taiga = new Set(), herbe = new Set(), nb = { p: [], h: [] }, nf = { e: [], h: [] };
  const butine = t => t.plan.diete ? (t.plan.diete.nectar || 0) >= .3 : Fl.estButineur(t), fruits = t => (t.plan.diete?.fruits || 0) >= .3;
  // la nourriture moyenne (pesée par l'effectif) des populations d'un genre de bêtes, dans les lieux aux saisons entières
  const pleins = new Set(W.biomes.filter(b => Ph.forceDe(b, Orvane.REGLES.saisons) === 1 && b.milieu === 'terrestre').map(b => b.id));
  const nour = (I, f) => { let s = 0, w = 0; for (const t of I.taxons) if (!t.eteint && !estPlante(t) && f(t)) for (const p of t.populations) if (pleins.has(p.biome)) { s += (p.nourriture ?? 1) * p.effectif; w += p.effectif; } return w ? s / w : 1; };
  let A = I0, X = W;
  avec({ rampe: 0 }, () => { for (let k = 0; k < N; k++) { A = Orvane.cycle(A, {}); X = Orvane.cycle(X, {}); const ph = X.cycle.saison.phase;
    const s = popDe(plante(X, 'foret', 'arbre'), 'foret')?.stade; if (s && st[st.length - 1] !== s) st.push(s);
    jungle.add(popDe(plante(X, 'jungle', 'arbre'), 'jungle')?.stade); taiga.add(popDe(plante(X, 'taiga', 'arbre'), 'taiga')?.stade); herbe.add(popDe(plante(X, 'prairie', 'herbe'), 'prairie')?.stade);
    const rb = nour(X, butine) / nour(A, butine), rf = nour(X, fruits) / nour(A, fruits);
    if (ph > .25 && ph < .42) nb.p.push(rb); if (ph > .85 || ph < .1) nb.h.push(rb); if (ph > .6 && ph < .76) nf.e.push(rf); if (ph > .9 || ph < .3) nf.h.push(rf); } });
  const moy = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, ordre = COURT ? ['fleurs', 'feuilles', 'fruits', 'feuilles_tombent'] : ['fleurs', 'feuilles', 'fruits', 'feuilles_tombent', 'nu', 'bourgeons', 'fleurs'];
  let i = 0; for (const s of st) if (s === ordre[i]) i++;
  verif(i === ordre.length, `${N} cycles (${COURT ? 'une demi-année' : 'une année'}), partis du printemps : les arbres de la forêt sont ${st.map(s => Ph.STADES[s]).join(', puis ')}`);
  verif(jungle.size === 1 && jungle.has('feuilles') && !taiga.has('nu') && !taiga.has('feuilles_tombent') && (COURT || herbe.has('seche')) && herbe.has('graines'),
    `la jungle reste en feuilles toute l'année ; les arbres de la taïga ne sont jamais nus (${[...taiga].map(s => Ph.STADES[s]).join(', ')}) ; l'herbe de la prairie est ${[...herbe].map(s => Ph.STADES[s]).join(', ')}`);
  // ce qu'une bête trouve dans la forêt, au fil de l'année, rapporté à ce qu'elle y trouverait sans saisons (les plantes d'aujourd'hui)
  const Bm = Object.fromEntries(W.biomes.map(b => [b.id, b])), pl = W.taxons.filter(t => estPlante(t) && !t.eteint).flatMap(t => t.populations.filter(p => p.biome === 'foret').map(p => ({ t, p })));
  const trouve = (t, ph) => { const PH = avec({ rampe: 0 }, () => Ph.preparer({ monde: { ...W.monde, annee: 1000 }, n: W.cycle.n + 5, phase: ph, biomes: Bm, saisons: Orvane.REGLES.saisons })), plan = t.plan, tr = t.phenotypes[0].traits;
    return plan.diete ? Fl.offreD(pl, plan, tr, false, PH.parts('foret')) / Fl.offreD(pl, plan, tr, false) : Fl.offre(pl, plan, tr, false, true, PH.parts('foret')) / Fl.offre(pl, plan, tr, false, true); };
  const dans = f => W.taxons.filter(t => !t.eteint && !estPlante(t) && f(t) && t.populations.some(p => p.biome === 'foret')).sort((a, b) => popDe(b, 'foret').effectif - popDe(a, 'foret').effectif)[0];
  const but = dans(butine), fru = dans(fruits), feu = dans(t => t.plan.regime === 'herbivore' && (t.plan.diete?.feuilles ?? 1) === 1);
  verif(but && trouve(but, .33) > 1.3 && trouve(but, 0) < .8, `un butineur de la forêt (${but?.nom}) y trouve ${fx(trouve(but, .33) * 100)} % de sa nourriture au printemps, ${fx(trouve(but, 0) * 100)} % au cœur de l'hiver`);
  verif(fru && trouve(fru, .68) > 1.2 && trouve(fru, .2) < .9 && feu && trouve(feu, 0) === 1 && trouve(feu, .5) === 1, `un mangeur de fruits (${fru?.nom}), ${fx(trouve(fru, .68) * 100)} % à la fin de l'été, ${fx(trouve(fru, .2) * 100)} % à la fin de l'hiver ; un mangeur de feuilles (${feu?.nom}), 100 % toute l'année`);
  // dans le monde : la nourriture publiée est bornée (au double de celle de l'éveil de la flore, que ces bêtes atteignent déjà) : seule la disette s'y lit
  if (!COURT) verif(moy(nb.h) < .99 && moy(nf.h) < .99 && moy(nb.p) <= 1.001 && moy(nf.e) <= 1.001, `dans le monde, où leur nourriture est déjà à son plafond, seule la disette se lit : les butineurs à ${fx(moy(nb.h) * 100, 1)} % au cœur de l'hiver, les mangeurs de fruits à ${fx(moy(nf.h) * 100, 1)} % en hiver et au début du printemps`);
  const rb = bio(X, t => !estPlante(t)) / bio(A, t => !estPlante(t)), rp = bio(X, estPlante) / bio(A, estPlante), vifs = I => I.taxons.filter(t => !t.eteint && !estPlante(t)).length;
  verif(rb > .85 && rb < 1.15 && rp > .75 && rp < 1.25 && Math.abs(vifs(X) - vifs(A)) <= 6, `au bout : les bêtes pèsent ${fx(rb * 100, 1)} % de ce qu'elles pèsent sans les saisons des plantes, les plantes ${fx(rp * 100, 1)} %, ${vifs(X)} lignées de bêtes contre ${vifs(A)}`);
  verif(empreinte(avec({ rampe: 0 }, () => Orvane.cycle(Orvane.cycle(W, {}), {}))) === empreinte(avec({ rampe: 0 }, () => Orvane.cycle(Orvane.cycle(W, {}), {}))), 'deux fois le même monde');
}

console.log('4. La neige');
{ const X = Me.eveiller(W).inst, B = Object.fromEntries(X.biomes.map(b => [b.id, b])); B.taiga.meteo = { temps: 'neige', t: -1, e: 1, neige: .8, production: 1 };
  const PH = Ph.preparer({ monde: X.monde, n: X.cycle.n + 200, phase: .05, biomes: B, saisons: Orvane.REGLES.saisons }), h = PH.stade('taiga', plante(X, 'taiga', 'herbe').plan), a = PH.stade('taiga', plante(X, 'taiga', 'arbre').plan);
  verif(h.stade === 'sous_la_neige' && a.stade !== 'sous_la_neige', `un manteau de neige sur la taïga (docs/45) : l'herbe est ${Ph.STADES[h.stade]}, l'arbre ${Ph.STADES[a.stade]}`);
  const Y = Orvane.cycle(Orvane.cycle(X, {}), {});
  verif(Y.monde.meteo && Y.monde.phenologie && Y.taxons.filter(estPlante).some(t => t.populations.some(p => p.stade)), 'la météo et les saisons des plantes tournent ensemble : la pousse suit aussi le temps qu\'il fait');
}

console.log('5. Les parcelles, le contrat, le cycle de nuit');
{ const X = Orvane.cycle(Orvane.cycle(W, {}), {}), P = Ph.eveiller(Parcelles.decouper(I0, { par: 2 })).inst, V = Parcelles.regrouper(Orvane.cycle(P, {})), ar = popDe(plante(V, 'foret', 'arbre'), 'foret');
  const e = [...val(S, Tampon.filtrer(X, { familles: ['animale', 'vegetale'] }), '$'), ...val(S, Tampon.filtrer(V, { familles: ['animale', 'vegetale'] }), '$')];
  verif(!e.length && ar?.stade && ar.feuillage >= 0, `l'instantané et ses plantes respectent le schéma, par biome et par parcelles (la forêt publiée : ses arbres ${Ph.STADES[ar?.stade]})` + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-phenologie'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-phenologie', phenologie: true, meteo: false, climat: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-phenologie', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')), Fp = JSON.parse(fs.readFileSync(path.join(dossier, 'flore.json'), 'utf8'));
    verif((sortie.match(/^phenologie : /gm) || []).length === 1 && Ip.monde.phenologie && Fp.taxons.some(t => t.populations.some(p => p.stade)), 'le profil demande les saisons des plantes (monde.phenologie), elles s\'éveillent une fois ; flore.json dit le stade de chaque plante');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
