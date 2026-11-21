// Orvane — LE BANC DES TRAITS INVENTÉS (bancs/invention.js, docs/27)
//  1. le jour un : un monde qui n'est pas inventif tourne exactement comme le moteur sans moteur/invention.js ; le jour de l'éveil, rien ne bouge ;
//  2. une invention : un trait neuf, défini au vocabulaire commun, entre au catalogue du monde et naît dans la lignée qui l'invente, chez les porteurs de ce qu'il exige ;
//  3. il dure : au cycle suivant, il est toujours là ; la sélection le pèse comme un autre trait ;
//  4. la diversité : le monde n'invente pas cent fois la même chose ; les noms ne se répètent pas ; le contrat ; le cycle de nuit.
//   node bancs/invention.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Iv = require(racine('moteur/invention.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane, d'avant ce mécanisme : bancs/monde.js ; et sans la grammaire, qui invente aussi, autrement)
const I0 = require('./monde.js').etat(['invention', 'grammaire']), W = Iv.eveiller(I0).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif]), t.phenotypes.map(p => p.id)]);
const avec = (chance, f) => { const c = Iv.REGLES.chance; Iv.REGLES.chance = chance; try { return f(); } finally { Iv.REGLES.chance = c; } };
const part = (X, tid, id) => X.taxons.find(x => x.id === tid).phenotypes.reduce((a, p) => a + (p.traits.includes(id) ? p.frequence : 0), 0);

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './invention.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde qui n\'est pas inventif tourne exactement comme le moteur sans moteur/invention.js');
  const a = Orvane.cycle(I0, {}), b = avec(0, () => Orvane.cycle(W, {}));
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && empreinte(b.catalogue.monde || null) === empreinte(a.catalogue.monde || null), 'le jour de l\'éveil, rien ne bouge : le monde n\'a encore rien inventé (son catalogue est celui d\'avant), et son hasard est le sien');
}

console.log('2. Une invention');
let X1, id1, T1;
{ X1 = avec(1, () => Orvane.cycle(W, {})); const e = X1.evenements.find(x => x.type === 'invention'); [id1, T1] = Object.entries(X1.catalogue.monde?.traits || {})[0] || [];
  const D = ['morphologie', 'locomotion', 'sens', 'offense', 'defense', 'metabolisme', 'reproduction', 'social', 'activite'];
  verif(e && T1 && T1.nom && D.includes(T1.domaine) && T1.organe && T1.effet && T1.cout > 0 && T1.exige?.length && T1.origine?.lignee && T1.origine.cycle === X1.cycle.n && X1.catalogue.traits[id1],
    `« ${e?.detail} » : ${id1} (${T1?.domaine}, ${T1?.organe}, coût ${T1?.cout}, exige ${T1?.exige?.join(' + ')}), au catalogue du monde et parmi les traits portés`);
  const L = T1.origine.lignee, ou = X1.taxons.filter(t => t.phenotypes.some(p => p.traits.includes(id1))).map(t => t.id), porteurs = X1.taxons.find(t => t.id === L).phenotypes.filter(p => p.traits.includes(id1));
  verif(ou.length === 1 && ou[0] === L && porteurs.every(p => T1.exige.every(x => p.traits.includes(x))) && X1.taxons.find(t => t.id === L).populations.every(p => p.alleles?.[id1] === Iv.REGLES.allele),
    `il naît dans la seule lignée qui l'invente (${X1.taxons.find(t => t.id === L).nom}), chez ${fx(part(X1, L, id1) * 100, 1)} % de ses bêtes, toutes porteuses de ce qu'il exige`);
  const d = Iv.dupliquer('camouflage', X1.catalogue.traits.camouflage || require(racine('moteur/catalogue.js')).TRAITS.camouflage, () => .1), c0 = (X1.catalogue.traits.camouflage || require(racine('moteur/catalogue.js')).TRAITS.camouflage).vulnerabilite;
  verif(d.t.exige[0] === 'camouflage' && Math.abs(d.t.vulnerabilite - 1) > Math.abs(c0 - 1) * .2 && d.t.vulnerabilite < 1 && Iv.accorder('membranes', ['souple', 'souple']) === 'souples' && Iv.accorder('thyroïde', ['lent', 'lente']) === 'lente',
    `une duplication garde le sens de son trait et l'accentue : « ${d.nom} » exige le camouflage et cache encore (vulnérabilité ${d.t.vulnerabilite}) ; les noms s'accordent (des membranes souples, une thyroïde lente)`);
}

console.log('3. Il dure');
{ let X = avec(0, () => Orvane.cycle(X1, {})); const L = T1.origine.lignee;
  verif(X.catalogue.monde?.traits?.[id1] && X.catalogue.traits[id1] && part(X, L, id1) > 0, `au cycle suivant, « ${id1} » est toujours au catalogue du monde, et porté (${fx(part(X, L, id1) * 100, 1)} %)`);
  // la moitié des porteurs de ce qu'il exige le reçoit, 30 cycles
  const t = X.taxons.find(x => x.id === L); for (const p of t.populations) p.alleles = { ...(p.alleles || {}), [id1]: .3 };
  for (const p of t.phenotypes.slice()) { if (!T1.exige.every(x => p.traits.includes(x)) || p.traits.includes(id1)) continue; const traits = [...p.traits, id1].sort(), q = traits.join('+'), fb = p.frequence_par_biome;
    const y = t.phenotypes.find(z => z.id === q) || (t.phenotypes.push({ id: q, traits, frequence: 0, ...(fb ? { frequence_par_biome: Object.fromEntries(Object.keys(fb).map(b => [b, 0])) } : {}) }), t.phenotypes.at(-1));
    y.frequence += p.frequence / 2; if (fb) for (const b in fb) { y.frequence_par_biome[b] += fb[b] / 2; fb[b] /= 2; } p.frequence /= 2; }
  const a = part(X, L, id1); for (let k = 0; k < 30; k++) X = avec(0, () => Orvane.cycle(X, {})); const b = part(X, L, id1);
  verif(Math.abs(b - a) > .02, `la sélection le pèse comme un autre trait : greffé à ${fx(a * 100)} % de ${t.nom}, il ${b > a ? 'gagne' : 'recule'} à ${fx(b * 100)} % en 30 cycles`);
}

console.log('4. La diversité, le contrat');
{ let X = W; const ev = []; for (let k = 0; k < 14; k++) { X = avec(1, () => Orvane.cycle(X, {})); ev.push(...X.evenements.filter(e => e.type === 'invention')); }
  // (les traits que ce monde a inventés en ces 14 cycles : son catalogue en porte d'autres, venus d'avant, d'une fusion, de la grammaire)
  const avant = new Set(Object.keys(W.catalogue?.monde?.traits || {})), M = Object.fromEntries(Object.entries(X.catalogue.monde.traits).filter(([k, t]) => !avant.has(k) && Array.isArray(t.exige) && t.origine?.de)), noms = ev.map(e => e.detail.match(/« (.+?) »/)[1]), sources = new Set(Object.values(M).flatMap(t => t.origine.de)), fus = Object.values(M).filter(t => t.exige.length > 1).length;
  verif(ev.length === 14 && new Set(noms).size === noms.length && sources.size >= 5 && Object.keys(M).every(k => !/-\d+$/.test(k)),
    `14 inventions, 14 noms différents, tirés de ${sources.size} traits (${[...sources].join(', ')}), dont ${fus} fusions : ${noms.slice(0, 6).join(', ')}…`);
  const e = val(S, Tampon.filtrer(X, { familles: ['animale', 'synthetique'] }), '$');
  verif(!e.length, 'l\'instantané d\'un monde qui invente respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
}

console.log('5. Le cycle de nuit');
{ const dossier = racine('mondes/essai-invention'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const P = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...P, monde: { ...P.monde, id: 'essai-invention', invention: true, stades: false, ponte: false, synthetique: false, flore: false, milieu: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-invention', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^invention : /gm) || []).length === 1 && Ip.monde.invention, 'le profil demande un monde inventif (monde.invention), il s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
