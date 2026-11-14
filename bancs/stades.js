// Orvane — LE BANC DES CYCLES DE VIE (bancs/stades.js, docs/26)
//  1. le jour un : un monde sans cycles de vie tourne exactement comme le moteur sans moteur/stades.js ; le jour de l'éveil, rien ne bouge ;
//  2. les deux vies : une chenille et un papillon, une larve et un imago, un têtard et une grenouille ; rien pour un grand mammifère ;
//  3. la sélection : la métamorphose gagne une lignée entassée qu'elle sert, recule chez une lignée qu'elle ne sert pas ;
//  4. ce que publie une lignée qui se métamorphose ; le contrat ; le cycle de nuit.
//   node bancs/stades.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), St = require(racine('moteur/stades.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane, d'avant ce mécanisme : bancs/monde.js)
const I0 = require('./monde.js').etat(['stades']), W = St.eveiller(I0).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
// une part q des allèles porte la métamorphose, dans toutes les populations de la lignée
const greffer = (X, tid, q) => { const t = X.taxons.find(x => x.id === tid), f = 1 - (1 - q) ** 2; for (const p of t.populations) p.alleles = { ...(p.alleles || {}), metamorphose: q };
  for (const p of t.phenotypes.slice()) { const traits = [...p.traits, 'metamorphose'].sort(), fb = p.frequence_par_biome;
    t.phenotypes.push({ id: traits.join('+'), traits, frequence: p.frequence * f, ...(fb ? { frequence_par_biome: Object.fromEntries(Object.entries(fb).map(([b, v]) => [b, v * f])) } : {}) });
    p.frequence *= 1 - f; if (fb) for (const b in fb) fb[b] *= 1 - f; } };
const part = (X, tid) => X.taxons.find(x => x.id === tid).phenotypes.reduce((a, p) => a + (p.traits.includes('metamorphose') ? p.frequence : 0), 0);

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './stades.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans cycles de vie tourne exactement comme le moteur sans moteur/stades.js');
  const T = St.TRAITS.metamorphose; delete St.TRAITS.metamorphose; const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}); St.TRAITS.metamorphose = T;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)), 'le jour de l\'éveil, rien ne bouge : aucune lignée ne se métamorphose encore (le tirage de la métamorphose mis à part)');
}

console.log('2. Les deux vies');
{ const pap = St.stadesDe({ regime: 'herbivore', masse_kg: .01, locomotion: ['vol', 'marche'], corps: { forme: 'hexapode' } }), lar = St.stadesDe({ regime: 'omnivore', masse_kg: .02, locomotion: ['marche'], corps: { forme: 'hexapode' } });
  const gre = St.stadesDe({ regime: 'carnivore', masse_kg: .05, locomotion: ['nage', 'saut'], corps: { forme: 'quadrupede' } }), cerf = St.stadesDe({ regime: 'herbivore', masse_kg: 90, locomotion: ['marche', 'course'], corps: { forme: 'quadrupede' } });
  verif(pap.larve.nom === 'chenille' && pap.adulte.nom === 'papillon' && lar.larve.nom === 'larve' && gre.larve.nom === 'têtard' && !cerf,
    `un petit hexapode qui vole et broute : une ${pap.larve.nom} (${pap.larve.locomotion.join(', ')}, ${pap.larve.regime}), puis un ${pap.adulte.nom} ; un petit hexapode qui marche : une ${lar.larve.nom} qui fouit, puis un imago ; une bête de l'eau et de la terre : un ${gre.larve.nom} qui nage ; un cerf de 90 kg : rien`);
  verif(Math.abs(St.soulagement(pap) - .28) < .001 && St.soulagement(gre) > St.soulagement({ recouvrement: .6 }), `une chenille et un papillon, qui ne mangent pas la même chose, s'épargnent ${fx(St.soulagement(pap) * 100)} % de l'entassement ; un têtard et une grenouille qui chasse, ${fx(St.soulagement(gre) * 100)} %`);
  const n = W.taxons.filter(t => St.stadesDe(t.plan)).length; verif(n > 0, `dans le monde d'Orvane, ${n} lignées pourraient vivre deux vies, si la métamorphose leur vient`);
}

console.log('3. La sélection');
{ const qui = W.taxons.filter(t => St.stadesDe(t.plan)).sort((a, b) => b.populations.reduce((x, p) => x + p.effectif, 0) - a.populations.reduce((x, p) => x + p.effectif, 0))[0];
  const non = W.taxons.filter(t => !St.stadesDe(t.plan) && t.plan.regime === 'herbivore').sort((a, b) => b.populations.reduce((x, p) => x + p.effectif, 0) - a.populations.reduce((x, p) => x + p.effectif, 0))[0];
  const essai = tid => { let X = clone(W); greffer(X, tid, .29); const a = part(X, tid); for (let k = 0; k < 40; k++) X = Orvane.cycle(X, {}); return [a, part(X, tid), X]; };
  const [a1, b1, X1] = essai(qui.id), [a2, b2] = essai(non.id);
  verif(b1 > a1 + .05 && b2 < a2 - .03, `la moitié d'une lignée se métamorphose, 40 cycles : chez ${qui.nom} (${qui.plan.masse_kg} kg, des millions de bêtes à l'étroit), de ${fx(a1 * 100)} % à ${fx(b1 * 100)} % ; chez ${non.nom} (${non.plan.masse_kg} kg), à qui elle ne sert à rien, de ${fx(a2 * 100)} % à ${fx(b2 * 100)} %`);
  const t = X1.taxons.find(x => x.id === qui.id), e = val(S, Tampon.filtrer(X1, { familles: ['animale', 'synthetique'] }), '$');
  verif(t.plan.stades?.larve?.nom && t.plan.stades.part > .5 && !X1.taxons.find(x => x.id === non.id).plan.stades && !e.length,
    `ce qu'elle publie : ses deux vies (une ${t.plan.stades?.larve?.nom}, puis un ${t.plan.stades?.adulte?.nom}) et la part qui se métamorphose (${fx(t.plan.stades?.part * 100)} %) ; l'instantané respecte le schéma` + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
}

console.log('4. Le cycle de nuit');
{ const dossier = racine('mondes/essai-stades'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const P = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...P, monde: { ...P.monde, id: 'essai-stades', stades: true, ponte: false, synthetique: false, flore: false, milieu: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-stades', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^stades : /gm) || []).length === 1 && Ip.monde.stades, 'le profil demande les cycles de vie (monde.stades), ils s\'éveillent une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
