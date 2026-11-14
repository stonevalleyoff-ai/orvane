// Orvane — LE BANC DES DÉRIVES (bancs/derives.js, docs/29)
//  1. le jour un : un monde sans dérives tourne exactement comme le moteur sans moteur/derives.js ; éveillées, rien ne bouge tant qu'aucune ne tire ;
//  2. les régimes : un pas à la fois, aux taux dits ; un carnivore neuf gagne en audace ; dans le monde, des lignées filles changent de régime ;
//  3. les plantes : la part défendue d'une population devient une lignée à elle ; la nourriture des brouteurs reste continue ;
//  4. les souches : un mutant, adapté à l'hôte où il naît ; un mutant porté par un insecte passe à une lignée sans parenté, l'insecte n'en tombe pas malade ;
//  5. le contrat, le cycle de nuit.
//   node bancs/derives.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), D = require(racine('moteur/derives.js')), Fl = require(racine('moteur/flore.js')), Pa = require(racine('moteur/pathogenes.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane, d'avant ce mécanisme : bancs/monde.js ; et sans les régimes en spectre, qui font dériver le régime à sa place)
const I0 = require('./monde.js').etat(['derives', 'dietes']), V = Pa.eveiller(Fl.eveiller(I0).inst).inst, W = D.eveiller(V).inst;
const animaux = I => I.taxons.map(t => [t.id, t.plan.regime, t.populations.map(p => [p.biome, p.effectif, p.infection])]);
const muet = f => { const g = clone(D.REGLES); for (const k in D.REGLES.regime) D.REGLES.regime[k] = 0; D.REGLES.plantes.chance = 0; D.REGLES.souches.chance = 0;
  try { return f(); } finally { Object.assign(D.REGLES.regime, g.regime); Object.assign(D.REGLES.plantes, g.plantes); Object.assign(D.REGLES.souches, g.souches); } };
const avec = (o, f) => { const g = clone(D.REGLES); for (const [k, v] of Object.entries(o)) Object.assign(D.REGLES[k], v); try { return f(); } finally { for (const k of Object.keys(o)) Object.assign(D.REGLES[k], g[k]); } };
const tot = (t, bid) => t.populations.filter(p => !bid || p.biome === bid).reduce((a, p) => a + p.effectif, 0);

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './derives.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = V, C = V; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans dérives (avec sa flore et ses souches) tourne exactement comme le moteur sans moteur/derives.js');
  const a = Orvane.cycle(V, {}), b = muet(() => Orvane.cycle(W, {}));
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && a.taxons.length === b.taxons.length, 'éveillées, les dérives ne bougent rien tant qu\'aucune ne tire : leur hasard est le leur');
}

console.log('2. Les régimes');
{ const c = {}; let carn = null; const base = { regime: 'omnivore', temperament: .4, perception: .5, vitesse_rel: 2 };
  for (const r of ['herbivore', 'omnivore', 'carnivore', 'filtreur']) for (let i = 0; i < 4000; i++) { const p = { ...base, regime: r }; D.regime({ regime: r }, p, `essai-${r}-${i}`, 7); const k = r + '>' + p.regime; c[k] = (c[k] || 0) + 1; if (p.regime === 'carnivore' && r === 'omnivore') carn = p; }
  const q = k => (c[k] || 0) / 4000;
  verif(Math.abs(q('herbivore>omnivore') - .05) < .015 && !c['herbivore>carnivore'] && Math.abs(q('omnivore>carnivore') - .04) < .015 && Math.abs(q('carnivore>omnivore') - .04) < .015 && !c['carnivore>herbivore'] && q('filtreur>filtreur') === 1,
    `un pas à la fois : herbivore → omnivore ${fx(q('herbivore>omnivore') * 100, 1)} % des séparations, omnivore → carnivore ${fx(q('omnivore>carnivore') * 100, 1)} %, → herbivore ${fx(q('omnivore>herbivore') * 100, 1)} %, carnivore → omnivore ${fx(q('carnivore>omnivore') * 100, 1)} % ; jamais d'herbivore à carnivore ; un filtreur garde le sien`);
  verif(carn && carn.temperament > .5 && carn.perception > .5 && carn.vitesse_rel > 2, `devenu carnivore, il gagne en audace (${carn?.temperament}), en sens (${carn?.perception}) et en vitesse (${carn?.vitesse_rel})`);
  // les séparations forcées (le monde en fait peu), les taux de dérive forcés : des filles changent de régime ; les mêmes, sans dérives, aucune
  const sep = clone(Orvane.REGLES.separation), forcer = f => { Object.assign(Orvane.REGLES.separation, { cycles: 0, distance: 0, chance: 1 }); try { return f(); } finally { Object.assign(Orvane.REGLES.separation, sep); } };
  const filles = X => X.taxons.filter(t => t.apparu === X.cycle.n && t.parent && t.plan.regime !== 'vegetal').map(t => [t, X.taxons.find(x => x.id === t.parent)]);
  const X = forcer(() => avec({ regime: { 'herbivore>omnivore': .5, 'omnivore>herbivore': .25, 'omnivore>carnivore': .25, 'carnivore>omnivore': .5 } }, () => Orvane.cycle(W, {}))), Y = forcer(() => Orvane.cycle(V, {}));
  const fx1 = filles(X), ch = fx1.filter(([f, p]) => f.plan.regime !== p.plan.regime), ex = ch[0], fy = filles(Y);
  verif(ch.length > 0 && fy.length && fy.every(([f, p]) => f.plan.regime === p.plan.regime), `${fx1.length} séparations d'un coup (forcées), les taux de dérive forcés : ${ch.length} filles changent de régime (${ex?.[0].nom}, ${ex?.[0].plan.regime}, fille d'une lignée ${ex?.[1].plan.regime}) ; les mêmes séparations sans dérives : aucune`);
}

console.log('3. Les plantes');
{ const X0 = clone(W), t = X0.taxons.filter(x => x.plan.regime === 'vegetal' && x.plan.forme === 'herbe').sort((a, b) => tot(b) - tot(a))[0], p = t.populations[0];
  p.frequences = [.45, 0, .55, 0]; if (p.reference) p.reference.frequences = p.frequences.slice();
  const brout = X => X.taxons.filter(h => (h.plan.regime === 'herbivore') && h.populations.some(q => q.biome === p.biome)).map(h => [h.id, h.populations.find(q => q.biome === p.biome)?.nourriture ?? 1]);
  const A = muet(() => Orvane.cycle(X0, {})), B = avec({ plantes: { chance: 1 } }, () => Orvane.cycle(X0, {}));
  const f = B.taxons.find(x => x.parent === t.id && x.plan.regime === 'vegetal'), m = B.taxons.find(x => x.id === t.id), a = A.taxons.find(x => x.id === t.id);
  // (dans le lieu où elles se séparent : le monde d'Orvane est en parcelles, et la mère vit aussi dans les autres, où rien ne change)
  const ici = x => x?.populations.find(q => q.biome === p.biome)?.frequences?.[2], e = B.evenements.find(x => x.taxon === f?.id), fp = ici(f), mp = ici(m);
  verif(f && fp > .8 && mp < .2 && Math.abs(tot(f, p.biome) + tot(m, p.biome) - tot(a, p.biome)) / tot(a, p.biome) < .02 && e,
    `« ${e?.detail} » : la fille est épineuse à ${fx(fp * 100)} %, sa mère ne l'est plus qu'à ${fx(mp * 100)} % ; ensemble, elles font les pieds qu'aurait faits la mère seule`);
  const na = brout(A), nb = brout(B), ecart = Math.max(0, ...na.map(([id, r]) => Math.abs(r - (nb.find(x => x[0] === id)?.[1] ?? 1))));
  verif(na.length && ecart < .03, `la nourriture des ${na.length} brouteurs du lieu reste continue (au plus ${fx(ecart * 100, 1)} % d'écart)`);
  const g = avec({ plantes: { chance: 1 } }, () => { let Y = B; for (let k = 0; k < 3; k++) Y = Orvane.cycle(Y, {}); return Y; });
  verif(g.taxons.filter(x => x.parent === t.id).length <= D.REGLES.plantes.max && g.taxons.find(x => x.id === f.id)?.populations[0]?.effectif > 0, 'la lignée fille vit ; une lignée n\'a que trois filles au plus');
}

console.log('4. Les souches');
let XS;
{ // une souche installée chez la proie la plus nombreuse d'un lieu où vole un petit insecte, et une autre lignée sans parenté à côté
  const X0 = clone(W), vecs = X0.taxons.filter(D.estVecteur), ani = X0.taxons.filter(t => Pa.estHote(t) && !D.estVecteur(t));
  let lieu, hote, autre, vec;
  for (const v of vecs) for (const pv of v.populations.filter(p => p.effectif >= 1000)) { const L = ani.filter(t => t.populations.some(p => p.biome === pv.biome && p.effectif >= 500) && (t.plan.masse_kg || 1) >= .05);
    if (L.length >= 2) { const s = L.sort((a, b) => tot(b, pv.biome) - tot(a, pv.biome)); const o = s.find(t => t.id !== s[0].id && Orvane.parente(t, s[0], new Map(X0.taxons.map(x => [x.id, x]))) == null) || s[1];
      if (!lieu) { lieu = pv.biome; hote = s[0]; autre = o; vec = v; } } }
  X0.monde.pathogenes.souches['souche-900'] = { nom: 'Banc', virulence: .1, transmission: Pa.transmission(.1), origine: hote.id, apparu: X0.cycle.n, hotes: [hote.id] }; X0.monde.pathogenes.prochain = 901;
  for (const p of hote.populations) if (p.biome === lieu) p.infection = { 'souche-900': { i: .2, r: 0 } };
  const M1 = avec({ souches: { chance: 1, vecteur: 0 } }, () => Orvane.cycle(X0, {})), Ss = M1.monde.pathogenes.souches, mut = Object.entries(Ss).find(([, s]) => s.parent === 'souche-900');
  verif(mut && mut[1].origine === hote.id && mut[1].virulence !== .1 && !mut[1].vecteur, `la souche Banc (10 % de virulence), chez ${hote.nom} : ${M1.evenements.find(e => /mute/.test(e.detail))?.detail}`);
  const M2 = avec({ souches: { chance: 1, vecteur: 1 } }, () => Orvane.cycle(X0, {})), mv = Object.entries(M2.monde.pathogenes.souches).find(([, s]) => s.parent === 'souche-900' && s.vecteur);
  verif(mv?.[1].vecteur === vec.id, `née là où vit ${vec.nom}, elle peut être portée par lui : ${M2.evenements.find(e => /portée par/.test(e.detail))?.detail}`);
  // 15 cycles : la souche portée par l'insecte passe à des lignées sans parenté ; sa mère, non ; l'insecte n'en tombe pas malade
  let Y = M2; muet(() => { for (let k = 0; k < 15; k++) Y = Orvane.cycle(Y, {}); }); XS = Y;
  const Sy = Y.monde.pathogenes.souches, sv = Sy[mv[0]], sm = Sy['souche-900'], T = new Map(Y.taxons.map(x => [x.id, x]));
  const sansParente = s => (s?.hotes || []).filter(id => id !== hote.id && Orvane.parente(T.get(id), T.get(hote.id), T) == null);
  const malade = Y.taxons.find(x => x.id === vec.id).populations.some(p => p.infection?.[mv[0]]);
  verif(sv && sansParente(sv).length > sansParente(sm).length && !malade,
    `15 cycles : la souche portée par l'insecte a pris chez ${sansParente(sv).length} lignées sans parenté avec ${hote.nom} (${sansParente(sv).map(id => T.get(id)?.nom).slice(0, 3).join(', ')}), sa mère chez ${sansParente(sm).length} ; ${vec.nom} la porte sans en tomber malade`);
}

console.log('5. Le contrat, le cycle de nuit');
{ const e = val(S, Tampon.filtrer(XS, { familles: ['animale', 'synthetique', 'vegetale'] }), '$');
  verif(!e.length, 'l\'instantané d\'un monde qui dérive respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-derives'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const P = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...P, monde: { ...P.monde, id: 'essai-derives', derives: true, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, flore: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-derives', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^derives : /gm) || []).length === 1 && Ip.monde.derives, 'le profil demande les dérives (monde.derives), elles s\'éveillent une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
