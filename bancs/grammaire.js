// Orvane — LE BANC DE LA GRAMMAIRE (bancs/grammaire.js, docs/32)
//  1. le jour un : un monde sans grammaire tourne exactement comme le moteur sans moteur/grammaire.js ; le jour de l'éveil, rien ne bouge ;
//  2. les phrases : qui peut les dire, où elles portent (une lueur dans le noir, une décharge dans l'eau) ;
//  3. l'invention : le monde compose des phrases variées, chez des lignées qui peuvent les dire ; chacune a son repli et son signe ;
//  4. la sélection : une phrase qui sert gagne sa lignée, une phrase qui ne porte pas recule ;
//  5. le contrat, le cycle de nuit.
//   node bancs/grammaire.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), G = require(racine('moteur/grammaire.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = require('./monde.js').orvane({ continent: '' }), W = G.eveiller(I0).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif]), t.phenotypes.map(p => p.id)]);
const avec = (o, f) => { const g = clone(G.REGLES); Object.assign(G.REGLES, o); try { return f(); } finally { Object.assign(G.REGLES, g); } };
const B = (X, id) => X.biomes.find(b => b.id === id), Tx = (X, id) => X.taxons.find(t => t.id === id), tot = t => t.populations.reduce((a, p) => a + p.effectif, 0);
const part = (X, tid, id) => Tx(X, tid).phenotypes.reduce((a, p) => a + (p.traits.includes(id) ? p.frequence : 0), 0);
// greffer une phrase (force 1) à la moitié d'une lignée
const greffer = (X, tid, cle) => { X = clone(X); const def = G.definir(cle, 1, () => .1), id = 'essai-' + cle; def.origine = { lignee: tid, cycle: X.cycle.n, de: [] };
  X.catalogue.monde = { ...(X.catalogue.monde || {}), traits: { ...(X.catalogue.monde?.traits || {}), [id]: def } }; X.catalogue.traits = { ...X.catalogue.traits, [id]: def };
  const t = Tx(X, tid); for (const p of t.populations) p.alleles = { ...(p.alleles || {}), [id]: .29 };
  for (const p of t.phenotypes.slice()) { const traits = [...p.traits, id].sort(), fb = p.frequence_par_biome;
    t.phenotypes.push({ id: traits.join('+'), traits, frequence: p.frequence / 2, ...(fb ? { frequence_par_biome: Object.fromEntries(Object.entries(fb).map(([b, v]) => [b, v / 2])) } : {}) });
    p.frequence /= 2; if (fb) for (const b in fb) fb[b] /= 2; }
  return [X, id]; };

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './grammaire.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans grammaire tourne exactement comme le moteur sans moteur/grammaire.js');
  const a = Orvane.cycle(I0, {}), b = avec({ chance: 0 }, () => Orvane.cycle(W, {}));
  verif(empreinte(animaux(a)) === empreinte(animaux(b)), 'le jour de l\'éveil, rien ne bouge : le monde n\'a encore rien dit, et son hasard est le sien');
}

console.log('2. Les phrases');
{ const P = G.PHRASES, anguille = { regime: 'carnivore', locomotion: ['nage'], masse_kg: 2 }, cerf = { regime: 'herbivore', locomotion: ['marche', 'course'], masse_kg: 90, sociabilite: .7 }, chauve = { regime: 'carnivore', locomotion: ['vol'], masse_kg: .02, activite: 'nocturne' };
  const qui = p => Object.keys(P).filter(k => P[k].peut(p));
  verif(qui(anguille).includes('torpille') && !qui(cerf).includes('torpille') && qui(chauve).includes('echolocation') && !qui(cerf).includes('echolocation') && qui(cerf).includes('alarme'),
    `qui peut dire quoi : une anguille, ${qui(anguille).join(', ')} ; un cerf grégaire, ${qui(cerf).join(', ')} ; une chauve-souris, ${qui(chauve).join(', ')}`);
  const ab = B(W, 'abysses'), pr = B(W, 'prairie'), la = B(W, 'large'), fo = B(W, 'foret');
  verif(P.leurre.ou(anguille, ab) > .9 && P.leurre.ou(anguille, pr) < .1 && P.torpille.ou(anguille, la) === 1 && P.torpille.ou(anguille, fo) === 0,
    `où elles portent : une lueur porte ${fx(P.leurre.ou(anguille, ab) * 100)} % aux abysses, ${fx(P.leurre.ou(anguille, pr) * 100)} % en prairie ; une décharge, en pleine mer, pas en forêt`);
  const types = new Set(['riposte-distance', 'riposte-contact', 'defense-contact', 'repli', 'protection', 'immobilite', 'alerte-groupe', 'defense-petits', 'vision-nocturne', 'perception-proche', 'vue-diurne-faible', 'morsure', 'sprint', 'lenteur', 'charge']);
  const sans = Object.keys(P).filter(k => !P[k].repli);
  verif(Object.values(P).every(x => !x.repli || types.has(x.repli)) && Object.values(P).every(x => x.signe && x.presage) && sans.length === 1,
    `${Object.keys(P).length} phrases ; chacune a un signe et un présage, et toutes sauf le bluff (${sans.join(', ')}) un repli que les jeux connaissent déjà`);
}

console.log('3. L\'invention');
let XI;
{ let X = W; const ev = []; avec({ chance: 1 }, () => { for (let k = 0; k < 15; k++) { X = Orvane.cycle(X, {}); ev.push(...X.evenements.filter(e => e.type === 'invention')); } });
  const M = Object.entries(X.catalogue.monde?.traits || {}), ph = new Set(M.map(([, t]) => t.grammaire.phrase)), noms = M.map(([, t]) => t.nom);
  const bien = M.every(([, t]) => { const L = Tx(X, t.origine.lignee); return G.PHRASES[t.grammaire.phrase].peut(L.plan) && t.conduite?.presage && t.cout > 0; });
  verif(ev.length === 15 && ph.size >= 8 && new Set(noms).size === noms.length && bien, `15 phrases de suite, ${ph.size} sortes, ${new Set(noms).size} noms différents, toutes chez une lignée qui peut les dire : ${ev.slice(0, 4).map(e => e.detail.replace('le monde invente ', '')).join(' ; ')}…`);
  const e = val(S, Tampon.filtrer(X, { familles: ['animale'] }), '$'); verif(!e.length, 'l\'instantané d\'un monde qui compose respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : '')); XI = X;
}

console.log('4. La sélection');
{ const nageur = W.taxons.filter(t => !t.eteint && t.plan.regime === 'carnivore' && (t.plan.locomotion || []).includes('nage') && t.populations.some(p => ['large', 'recif', 'lac', 'riviere'].includes(p.biome))).sort((a, b) => tot(b) - tot(a))[0];
  const marcheur = W.taxons.filter(t => !t.eteint && t.plan.regime === 'carnivore' && !(t.plan.locomotion || []).includes('nage') && t.populations.every(p => B(W, p.biome)?.milieu === 'terrestre')).sort((a, b) => tot(b) - tot(a))[0];
  const essai = (tid, cle, n) => { let [X, id] = greffer(W, tid, cle); const a = part(X, tid, id); for (let k = 0; k < n; k++) X = avec({ chance: 0 }, () => Orvane.cycle(X, {})); return [a, part(X, tid, id)]; };
  const [a1, b1] = essai(nageur.id, 'torpille', 30), [a2, b2] = essai(marcheur.id, 'torpille', 30);
  verif(b1 >= a1 && b2 < a2 - .01 && (b1 - a1) - (b2 - a2) > .04, `un organe électrique, à la moitié d'une lignée, 30 cycles : chez ${nageur.nom}, qui chasse dans l'eau, il paie ce qu'il coûte (de ${fx(a1 * 100)} % à ${fx(b1 * 100, 1)} %) ; chez ${marcheur.nom}, qui chasse sur la terre, il coûte sans servir (de ${fx(a2 * 100)} % à ${fx(b2 * 100, 1)} %)`);
  const proie = W.taxons.filter(t => !t.eteint && t.plan.regime === 'herbivore' && (t.plan.locomotion || []).some(l => ['marche', 'course'].includes(l)) && tot(t) > 1000).sort((a, b) => tot(b) - tot(a))[0];
  const [a3, b3] = essai(proie.id, 'musc', 30);
  verif(b3 !== a3, `des glandes à musc chez ${proie.nom}, une proie : de ${fx(a3 * 100)} % à ${fx(b3 * 100)} % en 30 cycles (moins mangée, elle paie ses glandes ; la sélection dit ce qui l'emporte)`);
}

console.log('5. Le cycle de nuit');
{ const dossier = racine('mondes/essai-grammaire'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-grammaire', grammaire: true, climat: false, dietes: false, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-grammaire', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^grammaire : /gm) || []).length === 1 && Ip.monde.grammaire, 'le profil demande la grammaire (monde.grammaire), elle s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
// (pour le banc du traducteur de Stone Valley : un monde qui a composé quinze phrases)
try { fs.writeFileSync(path.join(require('os').tmpdir(), 'orvane-grammaire.json'), JSON.stringify(XI)); } catch (e) { }
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
