// Orvane — LE BANC DES LIEUX QUI CHANGENT DE NATURE (bancs/natures.js, docs/28)
//  1. le jour un : un monde qui ne l'a pas éveillé tourne exactement comme le moteur sans moteur/natures.js ; le jour de l'éveil, rien ne bouge ;
//  2. les natures : une forêt défrichée devient une prairie, une prairie desséchée une steppe, un lac asséché une côte, et ses poissons en pâtissent ;
//  3. l'inédit : un lieu loin de tous les types connus en invente un ; il est gardé ;
//  4. la marge et le retour : pas d'allers-retours à la frontière ; un lieu dont les axes reviennent reprend sa nature ;
//  5. les parcelles, le contrat, le cycle de nuit.
//   node bancs/natures.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Na = require(racine('moteur/natures.js')), Mi = require(racine('moteur/milieu.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = require('./monde.js').orvane({ continent: '', sans: ['milieu', 'natures'] }), M = Mi.eveiller(I0).inst, W = Na.eveiller(M).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const B = (X, id) => X.biomes.find(b => b.id === id), jouer = (X, J) => { X = clone(X); for (const [id, j] of Object.entries(J)) B(X, id).transforme.jeu = j; return X; };
const natures = X => X.evenements.filter(e => e.type === 'nature').map(e => e.detail);
const nageurs = (X, bid) => X.taxons.filter(t => t.plan.locomotion?.length === 1 && t.plan.locomotion[0] === 'nage').reduce((a, t) => a + (t.populations.find(p => p.biome === bid)?.effectif || 0), 0);

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './natures.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = M, C = M; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde qui ne l\'a pas éveillé tourne exactement comme le moteur sans moteur/natures.js');
  const a = Orvane.cycle(M, {}), b = Orvane.cycle(W, {});
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && !b.biomes.some(x => x.nature) && !natures(b).length, `le jour de l'éveil, rien ne bouge : ${Object.keys(W.monde.natures.types).length} types de lieux, chacun de sa nature`);
}

console.log('2. Les natures');
let X1;
{ const J = { foret: { couvert: -.65 }, prairie: { humidite: -.3 }, lac: { humidite: -.5 } };
  X1 = Orvane.cycle(jouer(W, J), {}); const d = natures(X1);
  verif(B(X1, 'foret').nature?.type === 'prairie' && B(X1, 'prairie').nature?.type === 'steppe' && B(X1, 'lac').nature?.type === 'cote' && B(X1, 'lac').milieu === 'amphibie' && B(X1, 'foret').milieu === 'terrestre',
    `des joueurs défrichent, assèchent : ${d.join(' ; ')}`);
  let Y = X1, Z = Orvane.cycle(jouer(M, J), {}); for (let k = 0; k < 5; k++) { Y = Orvane.cycle(Y, {}); Z = Orvane.cycle(Z, {}); }
  const y = nageurs(Y, 'lac'), z = nageurs(Z, 'lac');
  verif(y < z * .8, `le lac devenu côte ne porte plus ses poissons : ${fx(y)} bêtes qui ne font que nager, six cycles après, contre ${fx(z)} dans un lac asséché d'autant qui serait resté un lac`);
  verif(B(X1, 'foret').saisons === W.monde.natures.types.prairie.saisons, 'il prend les saisons de sa nouvelle nature');
  let L = Orvane.cycle(jouer(W, { lac: { humidite: -.8 } }), {}); const l1 = natures(L); L = Orvane.cycle(L, {}); const l2 = natures(L);
  verif(B(L, 'lac').milieu === 'terrestre' && l1.length === 1 && l2.length === 1, `un lac asséché tout à fait change de milieu un pas à la fois : ${l1[0]}, puis ${l2[0]}`);
}

console.log('3. L\'inédit');
{ let X = Orvane.cycle(jouer(W, { volcan: { couvert: .8, humidite: .7 } }), {}); const n = B(X, 'volcan').nature, T = X.monde.natures.types[n?.type];
  verif(n?.inedite && T?.inedit && T.de && T.apparu === X.cycle.n && T.axes, `un volcan reboisé et irrigué ne ressemble à rien de connu : ${natures(X)[0]} (d'après « ${T?.de} »)`);
  X = Orvane.cycle(X, {}); verif(X.monde.natures.types[n.type] && B(X, 'volcan').nature?.type === n.type, 'la nature inventée est gardée parmi les types du monde : d\'autres lieux pourront la rejoindre');
}

console.log('4. La marge et le retour');
{ const T = W.monde.natures.types, f = B(W, 'foret'); let c = -.4; for (; c > -.7; c -= .01) { const ax = { ...f.axes, couvert: f.axes.couvert + c }; if (Na.distance(ax, T.prairie.axes) < Na.distance(ax, T.foret.axes)) break; }
  const X = Orvane.cycle(jouer(W, { foret: { couvert: +(c - .01).toFixed(2) } }), {});
  verif(!B(X, 'foret').nature, `à la frontière (le couvert à ${fx(f.axes.couvert + c - .01, 2)}, un peu plus près d'une prairie que d'une forêt), la forêt reste une forêt : il faut s'en rapprocher de ${Na.REGLES.marge} de plus`);
  const Y = jouer(X1, { foret: {}, lac: {} }); for (const id of ['foret', 'lac']) B(Y, id).transforme.etat = { ...B(Y, id).transforme.base };
  const Z = Orvane.cycle(Y, {});
  verif(!B(Z, 'foret').nature && !B(Z, 'lac').nature && B(Z, 'lac').milieu === 'aquatique', `les joueurs partis, le milieu revient : ${natures(Z).join(' ; ')}`);
}

console.log('5. Les parcelles, le contrat, le cycle de nuit');
{ let P = Parcelles.decouper(I0, { par: 4 }); P = Na.eveiller(Mi.eveiller(P).inst).inst; const p = P.biomes.find(b => b.type === 'foret'); p.transforme.jeu = { couvert: -.7 };
  const P0 = clone(P); delete P0.biomes.find(b => b.id === p.id).transforme.jeu.couvert; const X0 = Orvane.cycle(P0, {});
  verif(!X0.biomes.some(b => b.nature), `un monde par parcelles (${P.biomes.length} parcelles, chacune un peu différente de son biome) : le jour de l'éveil, aucune ne change de nature`);
  const X = Orvane.cycle(P, {}), V = Parcelles.regrouper(X), f = B(V, 'foret');
  verif(f.natures?.[0]?.type === 'prairie' && f.natures[0].part > 0 && f.natures[0].part < 1, `un monde par parcelles : une parcelle de la forêt défrichée, la forêt publiée en dit la part devenue prairie (${fx(f.natures?.[0]?.part * 100)} %)`);
  const e = [...val(S, Tampon.filtrer(V, { familles: ['animale', 'synthetique'] }), '$'), ...val(S, Tampon.filtrer(X1, { familles: ['animale', 'synthetique'] }), '$')];
  verif(!e.length, 'l\'instantané d\'un monde dont les lieux changent de nature respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-natures'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-natures', milieu: true, natures: true, invention: false, stades: false, ponte: false, synthetique: false, flore: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-natures', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^natures : /gm) || []).length === 1 && Ip.monde.natures?.types, 'le profil demande des lieux qui changent de nature (monde.natures), ils s\'éveillent une fois, après le milieu');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
