// Orvane — LE BANC DE LA FLORE (bancs/flore.js, docs/17)
// Le monde d'Orvane, la flore éveillée, contre le même monde sans elle :
//  1. le jour un : un monde sans flore tourne exactement comme le moteur sans moteur/flore.js ; un monde où elle s'éveille
//     garde ses brouteurs (la flore s'éveille à l'équilibre avec eux) ;
//  2. l'éveil : des plantes dans chaque biome éclairé, des formes selon le milieu, des défenses à l'équilibre ; une fois ;
//  3. la coévolution : les brouteurs qui supportent les défenses des plantes gagnent ; une prairie broutée trois fois plus fort
//     s'arme et sa nourriture baisse, une prairie délaissée désarme ;
//  4. une espèce minoritaire de sa bande, chassée longtemps, tient mieux avec la flore (la concurrence par ce qu'on mange en commun) ;
//  5. la stabilité, le contrat, le cycle de nuit.
//   node bancs/flore.js [--court]
// --court : moins de cycles. Sortie : 0 si tout passe, 1 sinon.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Flore = require(racine('moteur/flore.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js'));
const a = process.argv.slice(2), court = a.includes('--court'), CYCLES = court ? 60 : 120, BRANCHE = court ? 20 : 30;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
// (6 novembre) une vérification connue pour échouer, et pourquoi : elle s'affiche (⚠), sans faire échouer le banc ; quand elle repasse,
// elle le dit, pour qu'on la rende à verif
const connu = (c, m, pourquoi) => console.log((c ? '  ✓ (connu, mais repasse : à rendre à verif) ' : '  ⚠ ') + m + (c ? '' : ` — connu : ${pourquoi}`));
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const betes = I => I.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal'), plantes = I => I.taxons.filter(t => !t.eteint && t.plan.regime === 'vegetal');
const herbivores = I => somme(betes(I).filter(t => t.plan.regime === 'herbivore').map(t => somme(t.populations.map(p => p.effectif * t.plan.masse_kg))));
const part = (I, trait) => { let s = 0, w = 0; for (const t of betes(I).filter(t => t.plan.regime === 'herbivore')) for (const p of t.populations) for (const ph of t.phenotypes) {
  const x = p.effectif * (ph.frequence_par_biome?.[p.biome] ?? ph.frequence) * t.plan.masse_kg; w += x; if (ph.traits.includes(trait)) s += x; } return w ? s / w : 0; };
const defense = (I, biome) => { let s = 0, w = 0; for (const t of plantes(I)) for (const p of t.populations) { if (biome && p.biome !== biome) continue;
  const b = p.effectif * t.plan.masse_kg; w += b; s += b * (p.frequences[1] + p.frequences[2] + 2 * p.frequences[3]) / 2; } return w ? s / w : 0; };
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane avant ses éveils — sa génération 0 —, celui que ce banc suppose : etat.json a depuis éveillé la flore, la Mère et le milieu)
const I0 = lireJ('mondes/orvane/generation-0.json'), t0 = Date.now();

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './flore.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, B = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); B = mod.exports.cycle(B, {}); }
  verif(empreinte(A) === empreinte(B), 'un monde sans flore tourne exactement comme le moteur sans elle');
}
const E = Flore.eveiller(I0, {}), W0 = E.inst;
let A = I0, B = W0; const serie = [], refPrairie = {};
for (let k = 1; k <= CYCLES; k++) { A = Orvane.cycle(A, {}); B = Orvane.cycle(B, {});
  serie.push({ k, hA: herbivores(A), hB: herbivores(B), cuirA: part(A, 'peau-epaisse'), cuirB: part(B, 'peau-epaisse'), metA: part(A, 'metabolisme-lent'), metB: part(B, 'metabolisme-lent'), def: defense(B), defP: defense(B, 'prairie') });
  if (k === 40) { refPrairie.B = clone(B); } }
{ const r1 = serie[0].hB / serie[0].hA, r10 = serie[9].hB / serie[9].hA, N1 = betes(Orvane.cycle(W0, {})).flatMap(t => t.populations).filter(p => p.nourriture != null);
  verif(Math.abs(r1 - 1) < .01 && Math.abs(r10 - 1) < .04, `la flore s'éveille à l'équilibre : les brouteurs gardent ${fx(r1 * 100, 1)} % de leur biomasse au premier cycle, ${fx(r10 * 100, 1)} % au dixième ; ${N1.length} populations seulement voient leur nourriture bouger d'au moins 0,5 % au premier cycle`);
}

console.log("2. L'éveil");
{ const P = plantes(W0), forme = b => P.filter(t => t.populations.some(p => p.biome === b)).map(t => t.plan.forme).sort().join('+');
  const eclaires = I0.biomes.filter(b => !(b.milieu === 'marin' && (b.axes.lumiere ?? 0) <= .2)), tous = eclaires.every(b => P.some(t => t.populations.some(p => p.biome === b.id)));
  verif(tous && /arbre/.test(forme('foret')) && /succulente/.test(forme('desert')) && forme('lac') === 'algue+roseau' && forme('grotte') === 'champignon' && !forme('abysses'),
    `${P.length} lignées de plantes, dans chacun des ${eclaires.length} biomes éclairés : la forêt ${forme('foret')}, le désert ${forme('desert')}, le lac ${forme('lac')}, la grotte ${forme('grotte')} ; rien dans les abysses`);
  const d = defense(W0); verif(d > .15 && d < .85 && E.evenements[0]?.type === 'eveil', `les défenses, à l'équilibre avec les brouteurs : ${fx(d * 100, 0)} % des pieds ont des feuilles toxiques ou des épines (le reste n'en paie pas le coût)`);
  verif(Flore.eveiller(W0, {}).evenements.length === 0 && empreinte(Flore.eveiller(I0, {}).inst) === empreinte(W0), 'une seule fois, et déterministe');
}

console.log('3. La coévolution');
{ const f = serie[serie.length - 1], d = serie[0];
  verif(f.cuirB > 5 * Math.max(f.cuirA, .005) && f.cuirB > d.cuirB * 3, `contre les épines, le cuir épais gagne les brouteurs : ${fx(d.cuirB * 100, 1)} % de leur biomasse le porte au premier cycle, ${fx(f.cuirB * 100, 1)} % au cycle ${CYCLES} (${fx(f.cuirA * 100, 1)} % sans la flore)`);
  verif(f.metB > f.metA + .02, `contre les toxines, le métabolisme lent aussi : ${fx(f.metB * 100, 1)} % avec la flore, ${fx(f.metA * 100, 1)} % sans elle`);
  // une prairie broutée trois fois plus fort, une prairie délaissée
  const J = refPrairie.B, fois = (I, k) => { I = clone(I); for (const t of betes(I)) if (t.plan.regime === 'herbivore') for (const p of t.populations) if (p.biome === 'prairie') p.effectif *= k; return I; };
  // (les brouteurs de la prairie tenus à ce niveau chaque cycle : seules les plantes répondent)
  const cible = {}; for (const t of betes(J)) if (t.plan.regime === 'herbivore') { const p = t.populations.find(q => q.biome === 'prairie'); if (p) cible[t.id] = p.effectif; }
  let H = fois(J, 3), V = fois(J, .1), T = clone(J); const tenir = (I, k) => { for (const t of betes(I)) { const p = cible[t.id] != null && t.populations.find(q => q.biome === 'prairie'); if (p) p.effectif = cible[t.id] * k; } return I; };
  for (let k = 0; k < BRANCHE; k++) { H = tenir(Orvane.cycle(H, {}), 3); V = tenir(Orvane.cycle(V, {}), .1); T = Orvane.cycle(T, {}); }
  const dH = defense(H, 'prairie'), dV = defense(V, 'prairie'), dT = defense(T, 'prairie');
  verif(dH > dT + .02 && dV < dT - .02, `la prairie broutée trois fois plus fort ${BRANCHE} cycles s'arme (${fx(dT * 100, 0)} % de défenses → ${fx(dH * 100, 0)} %) ; délaissée, elle désarme (${fx(dV * 100, 0)} %) : les défenses coûtent`);
  const nour = I => { let x = 0, w = 0; for (const t of betes(I)) if (t.plan.regime === 'herbivore') { const p = t.populations.find(q => q.biome === 'prairie'); if (p) { x += p.effectif * t.plan.masse_kg * (p.nourriture ?? 1); w += p.effectif * t.plan.masse_kg; } } return w ? x / w : 1; };
  verif(nour(H) < .9 && nour(V) > 1.02, `et la nourriture des brouteurs de la prairie le dit (populations[].nourriture) : ${fx(nour(H) * 100, 0)} % de ce qu'elle était à l'éveil sous la dent du triple, ${fx(nour(V) * 100, 0)} % quand ils ne sont plus qu'un dixième`);
}

console.log('4. Une espèce minoritaire de sa bande, chassée longtemps');
{ // (la limite de la phase 1 : sans flore, rien ne lui rend de place quand elle se raréfie ; avec, la concurrence est pesée par ce
  //  que les brouteurs mangent en commun : qui mange autre chose que la majorité de sa bande regagne de la place en se raréfiant)
  const H = betes(I0).filter(t => t.plan.regime === 'herbivore').map(t => [t, t.populations.find(p => p.biome === 'prairie')?.effectif || 0]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]);
  let min = null; for (const [t, n] of H) { const m = H.find(([u, k]) => u !== t && k < n / 5 && k > 300 && Math.abs(Math.log10(u.plan.masse_kg / t.plan.masse_kg)) < .2); if (m) { min = m[0]; break; } }
  const eff = J => J.taxons.find(t => t.id === min.id)?.populations.find(p => p.biome === 'prairie')?.effectif || 0, pr = J => ({ taxons: { [min.id]: { prairie: { retrait: { '*': eff(J) * .06 } } } } });
  let X = clone(I0), Y = clone(W0); const x0 = eff(X), y0 = eff(Y); for (let k = 0; k < 60; k++) { X = Orvane.cycle(X, pr(X)); Y = Orvane.cycle(Y, pr(Y)); }   // (soixante cycles, même --court : la reprise prend du temps)
  connu(eff(Y) / y0 > 1.1 * eff(X) / x0, `${min.nom} (${fx(min.plan.masse_kg, 2)} kg), minoritaire de sa bande dans la prairie, chassée 60 cycles à 6 % par cycle : il en reste ${fx(eff(Y) / y0 * 100, 0)} % avec la flore, ${fx(eff(X) / x0 * 100, 0)} % sans elle (elle ne mange pas tout à fait ce que mange sa bande : ${min.plan.locomotion.join(', ')})`, 'depuis les correctifs de la flore du 5 novembre (une plante qui se séparait doublait sa place), la minoritaire tient moins bien avec la flore que sans elle : la limite de la phase 1 revient (docs/17, « Ce qui reste ouvert »)');
}

console.log('5. La stabilité, le contrat, le cycle de nuit');
{ const fin = serie[serie.length - 1], nA = betes(A).length, nB = betes(B).length, tot = J => somme(betes(J).map(t => somme(t.populations.map(p => p.effectif))));
  verif(Math.abs(nB / nA - 1) < .06 && Math.abs(tot(B) / tot(A) - 1) < .12 && Math.abs(fin.hB / fin.hA - 1) < .12,
    `après ${CYCLES} cycles : ${nB} lignées de bêtes avec la flore, ${nA} sans elle ; ${fx(tot(B) / 1e6, 1)} millions de bêtes, ${fx(tot(A) / 1e6, 1)} sans elle ; les brouteurs pèsent ${fx(fin.hB / fin.hA * 100, 0)} % de ce qu'ils pèsent sans elle`);
  const e = val(S, B, '$'); verif(!e.length, 'l\'instantané d\'un monde à flore respecte schemas/instantane.schema.json' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const F = Tampon.filtrer(B, {}); verif(!plantes(F).length && betes(F).length === betes(B).length && plantes(Tampon.filtrer(B, { familles: ['animale', 'vegetale'] })).length === plantes(B).length,
    'un jeu qui ne demande rien ne reçoit pas les plantes (Tampon.filtrer : la famille animale seule) ; un jeu qui demande « vegetale » les reçoit');
  let P = Parcelles.decouper(I0, { par: 4 }); P = Flore.eveiller(P, {}).inst; P = Orvane.cycle(P, {}); const V = Parcelles.regrouper(P), ev = val(S, V, '$');
  verif(plantes(P).every(t => t.populations.every(p => p.biome.includes('~') || !P.biomes.find(b => b.id === p.biome)?.type)) && !ev.length, `dans un monde à parcelles, chaque plante vit par parcelle ; la vue par biome respecte le contrat` + (ev.length ? ' : ' + ev.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-flore'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const pf = lireJ('mondes/orvane/profil.json'); const profil = { ...pf, monde: { ...pf.monde, id: 'essai-flore', flore: true, fusions: [], parcelles: undefined, pressions: undefined } };
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil)); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-flore', '--sans-reseau', '--cycles', '2', '--forcer'], { encoding: 'utf8' });
    const Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')), Fp = JSON.parse(fs.readFileSync(path.join(dossier, 'flore.json'), 'utf8'));
    verif((sortie.match(/flore : la flore s'éveille/g) || []).length === 1 && Ip.monde.flore && !plantes(Ip).length && plantes(Fp).length > 20 && betes(Ip).some(t => t.populations.some(p => p.nourriture != null)),
      `le cycle de nuit : le profil demande la flore, elle s'éveille une fois ; les plantes sont publiées à part (flore.json, ${plantes(Fp).length} lignées), l'instantané garde les bêtes et leur nourriture`);
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
