// Orvane — LE BANC DES CORPS ET DES VIES NOUVELLES (bancs/formes.js, docs/33)
//  1. le jour un : un monde sans castes ni formes nouvelles tourne exactement comme le moteur sans moteur/castes.js ni moteur/formes.js ;
//  2. les castes : une colonie sert un petit hexapode grégaire, pas un grand brouteur ; la sélection le dit ; ce que publie une colonie ;
//  3. les formes : un corps segmenté naît d'une bête qui rampe ou fouit, un corps rayonné ou à tentacules d'une bête qui nage, jamais
//     ailleurs ; dans le monde, une forme que le monde n'avait jamais vue ;
//  4. les vies : la naïade et l'imago, le polype et la méduse ; le contrat ; le cycle de nuit.
//   node bancs/formes.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Ca = require(racine('moteur/castes.js')), Fo = require(racine('moteur/formes.js')), Corps = require(racine('moteur/corps.js')), St = require(racine('moteur/stades.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json'), W = Fo.eveiller(Ca.eveiller(I0).inst).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const Tx = (X, id) => X.taxons.find(t => t.id === id), tot = t => t.populations.reduce((a, p) => a + p.effectif, 0);
const part = (X, tid) => Tx(X, tid).phenotypes.reduce((a, p) => a + (p.traits.includes('eusocialite') ? p.frequence : 0), 0);
const greffer = (X, tid) => { X = clone(X); const t = Tx(X, tid); for (const p of t.populations) p.alleles = { ...(p.alleles || {}), eusocialite: .29 };
  for (const p of t.phenotypes.slice()) { const traits = [...p.traits, 'eusocialite'].sort(), fb = p.frequence_par_biome;
    t.phenotypes.push({ id: traits.join('+'), traits, frequence: p.frequence / 2, ...(fb ? { frequence_par_biome: Object.fromEntries(Object.entries(fb).map(([b, v]) => [b, v / 2])) } : {}) }); p.frequence /= 2; if (fb) for (const b in fb) fb[b] /= 2; }
  return X; };

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './castes.js' || p === './formes.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans castes ni formes nouvelles tourne exactement comme le moteur sans moteur/castes.js ni moteur/formes.js');
  const T = Ca.TRAITS.eusocialite; delete Ca.TRAITS.eusocialite; const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}); Ca.TRAITS.eusocialite = T;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)), 'le jour de l\'éveil, rien ne bouge (le tirage de la colonie mis à part) : aucune lignée ne vit encore en colonie, aucune forme nouvelle n\'est née');
}

console.log('2. Les castes');
{ const L = W.taxons.filter(t => Ca.sertA(t.plan)), non = W.taxons.filter(t => !t.eteint && t.plan.regime === 'herbivore' && t.plan.masse_kg > 1).sort((a, b) => tot(b) - tot(a))[0];
  const q = L.sort((a, b) => tot(b) - tot(a))[0], c = Ca.castesDe(q.plan);
  verif(L.length > 0 && c && !Ca.castesDe(non.plan), `${L.length} lignées pourraient vivre en colonie (${L.map(t => t.nom).join(', ')}) ; ${non.nom} (${non.plan.masse_kg} kg), jamais : une reine ${c.reine.masse_rel} fois plus lourde, ailée ; ${fx(c.ouvrieres.part * 100)} % d'ouvrières, ${fx(c.soldats.part * 100, 1)} % de soldats`);
  const essai = tid => { let X = greffer(W, tid); const a = part(X, tid); for (let k = 0; k < 40; k++) X = Orvane.cycle(X, {}); return [a, part(X, tid), X]; };
  const [a1, b1, X1] = essai(q.id), [a2, b2] = essai(non.id);
  verif(b1 > a1 + .03 && b2 < a2 - .03, `la moitié d'une lignée vit en colonie, 40 cycles : chez ${q.nom} (${fx(q.plan.masse_kg * 1000)} g, grégaire), de ${fx(a1 * 100)} % à ${fx(b1 * 100)} % ; chez ${non.nom}, à qui elle ne sert à rien, de ${fx(a2 * 100)} % à ${fx(b2 * 100)} %`);
  const pc = Tx(X1, q.id).plan.castes, e = val(S, Tampon.filtrer(X1, { familles: ['animale'] }), '$');
  verif(pc?.reine && pc.part > .5 && !e.length, `ce qu'elle publie : ses castes et la part qui vit en colonie (${fx(pc?.part * 100)} %) ; l'instantané respecte le schéma` + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
}

console.log('3. Les formes');
{ const av = Corps.etendre({ formes: Fo.FORMES }), R = (() => { let g = 7; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; })(), b = { axes: { temperature: .5, humidite: .7, couvert: .3, lumiere: .5 } };
  const tirer = (forme, plan, n = 3000) => { const c = {}; for (let i = 0; i < n; i++) { const k = Corps.deriver(Corps.normaliser({ forme, pattes: forme === 'hexapode' ? 6 : 0 }), plan, b, R, 7); c[k.forme] = (c[k.forme] || 0) + 1; if (k.forme === 'segmente') (c._p ??= []).push(k.pattes); } return c; };
  const ver = tirer('serpent', { masse_kg: .3, locomotion: ['reptation', 'fouissage'] }), mer = tirer('serpent', { masse_kg: .5, locomotion: ['nage'] }), lourd = tirer('serpent', { masse_kg: 20, locomotion: ['nage'] });
  Corps.etendre(av);
  verif(ver.segmente > 0 && !ver.radiaire && !ver.tentaculaire && mer.radiaire > 0 && mer.tentaculaire > 0 && !mer.segmente && !lourd.radiaire && lourd.tentaculaire > 0 && Math.min(...ver._p) >= 10 && Math.max(...ver._p) <= 40,
    `sur 3 000 dérives de corps, d'un ver qui fouit : ${ver.segmente} corps segmentés (de ${Math.min(...ver._p)} à ${Math.max(...ver._p)} pattes), aucun rayonné ; d'un poisson de 500 g : ${mer.radiaire} rayonnés, ${mer.tentaculaire} à tentacules, aucun segmenté ; d'un poisson de 20 kg : aucun rayonné`);
  // dans le monde : des séparations forcées, des corps qui dérivent fort
  const sep = clone(Orvane.REGLES.separation), co = Orvane.REGLES.derive.corps; Object.assign(Orvane.REGLES.separation, { cycles: 0, distance: 0, chance: 1 }); Orvane.REGLES.derive.corps = 6;
  let X; try { X = Orvane.cycle(W, {}); } finally { Object.assign(Orvane.REGLES.separation, sep); Orvane.REGLES.derive.corps = co; }
  const ev = X.evenements.filter(e => /forme que le monde n'avait jamais vue/.test(e.detail || '')), neufs = X.taxons.filter(t => Fo.FORMES[t.plan.corps?.forme]);
  verif(ev.length > 0 && neufs.length > 0 && neufs.every(t => { const F = Fo.FORMES[t.plan.corps.forme]; return F.loco.some(l => t.plan.locomotion.includes(l)); }),
    `des séparations forcées, des corps qui dérivent fort : ${neufs.length} lignées naissent d'une forme nouvelle (« ${ev[0]?.detail.split(', ').slice(-2).join(', ')} »), toutes là où elle peut naître ; ${(Corps.etendre({ formes: Fo.FORMES }), Corps.decrire(neufs[0].plan.corps).split(',')[0])}`); Corps.etendre(null);
  const e = val(S, Tampon.filtrer(X, { familles: ['animale'] }), '$'); verif(!e.length, 'l\'instantané respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
}

console.log('4. Les vies, le cycle de nuit');
{ const lib = St.stadesDe({ regime: 'carnivore', masse_kg: .02, locomotion: ['vol', 'marche'], corps: { forme: 'hexapode' } }), med = St.stadesDe({ regime: 'carnivore', masse_kg: .3, locomotion: ['nage'], corps: { forme: 'radiaire' } }), pap = St.stadesDe({ regime: 'herbivore', masse_kg: .01, locomotion: ['vol'], corps: { forme: 'hexapode' } });
  verif(lib.larve.nom === 'naïade' && lib.larve.locomotion.includes('nage') && med.larve.nom === 'polype' && med.adulte.nom === 'méduse' && pap.larve.nom === 'chenille' && St.soulagement(lib) > St.soulagement(pap),
    `un petit chasseur qui vole : une ${lib.larve.nom} qui chasse dans l'eau, puis un ${lib.adulte.nom} (${fx(St.soulagement(lib) * 100)} % d'entassement épargné) ; un corps rayonné de la mer : un ${med.larve.nom} qui filtre, puis une ${med.adulte.nom} ; un butineur : toujours une ${pap.larve.nom}`);
  const dossier = racine('mondes/essai-formes'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-formes', castes: true, formes: true, grammaire: false, climat: false, dietes: false, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-formes', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^castes : /gm) || []).length === 1 && (sortie.match(/^formes : /gm) || []).length === 1 && Ip.monde.castes && Ip.monde.formes && Ip.catalogue.monde?.formes?.segmente, 'le profil demande les castes et les formes nouvelles, elles s\'éveillent une fois ; les formes entrent au catalogue du monde');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
