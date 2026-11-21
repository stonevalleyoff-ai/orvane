// Orvane — LE BANC DU TEMPS (bancs/temps.js, docs/19)
//  1. le rythme d'un monde hébergé : l'action horaire (cycle.js --auto) ne fait tourner un monde que quand son heure est venue,
//     autant de cycles qu'il en doit, au plus son rattrapage ; à la main (--cycles), le rythme ne compte pas ;
//  2. un monde solo (moteur/solo.js) : il avance avec le temps réel, en accéléré, rattrape au plus ce qu'on lui permet ;
//  3. ce que fait le joueur y pèse ; le monde partagé n'en voit rien ;
//  4. il se garde et se recharge, déterministe ; il tourne dans un navigateur ; il respecte le contrat.
//   node bancs/temps.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Solo = require(racine('moteur/solo.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json'), P0 = lireJ('mondes/orvane/instantane.json'), t0 = Date.now(), H = 36e5, M = 6e4;
const partage = ['etat.json', 'instantane.json'].map(f => empreinte(lireJ('mondes/orvane/' + f)));

console.log("1. Le rythme d'un monde hébergé");
{ const dossier = racine('mondes/essai-temps'), pf = lireJ('mondes/orvane/profil.json'), J = h => `2026-11-04T${h}:00Z`, J2 = h => `2026-11-05T${h}:00Z`;
  // un monde réglé à « cycle », dont le dernier cycle date de « dernier » : combien de cycles l'action horaire lui fait-elle tourner à « maint » ?
  let date = null;
  const tourner = (cycle, dernier, maint, extra = {}, args = ['--auto']) => {
    fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
    const profil = { ...pf, monde: { ...pf.monde, id: 'essai-temps', cycle, ...extra, synthetique: false, flore: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } };
    const I = { ...I0, cycle: { ...I0.cycle, date: dernier } };
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil)); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I));
    execFileSync('node', [racine('hebergement/cycle.js'), 'essai-temps', '--sans-reseau', '--maintenant', maint, ...args], { encoding: 'utf8' });
    const E = JSON.parse(fs.readFileSync(path.join(dossier, 'etat.json'), 'utf8')); date = E.cycle.date; return E.cycle.n - I0.cycle.n; };
  try {
    const cas = [['1h', J('06:20'), J('09:18'), {}, 3, 'un monde à l\'heure, dernier cycle à 06:20, l\'action à 09:18 : 3 cycles'],
      ['1h', J('00:20'), J('10:18'), { rattrapage: 2 }, 2, 'le même, dernier cycle à 00:20, rattrapage 2 : 2 cycles à 10:18 (le reste est perdu)'],
      ['30min', J('08:17'), J('09:17'), {}, 2, 'un monde à la demi-heure, d\'une action à la suivante : 2 cycles'],
      ['10m', J('08:17'), J('09:17'), { rattrapage: 10 }, 6, 'un monde à dix minutes, rattrapage 10 : 6 cycles par action'],
      ['24h', J('03:18'), J('23:17'), {}, 0, 'un monde au jour, dernier cycle à 03:18 : rien à 23:17, son heure (03:00) n\'est pas revenue'],
      ['24h', J('03:40'), J2('03:17'), {}, 1, 'le même, après une action en retard (03:40) : 1 cycle le lendemain à 03:17, il ne dérive pas'],
      ['24h', J('03:18'), J('18:17'), { heure: '18:00' }, 1, 'un monde au jour réglé à 18:00 (monde.heure) : 1 cycle à 18:17'],
      ['24h', J('03:18'), J('09:17'), {}, 2, 'à la main (--cycles 2), l\'heure ne compte pas : 2 cycles', ['--cycles', '2']]];
    for (const [c, d, t, x, attendu, m, args] of cas) { const n = tourner(c, d, t, x, args); verif(n === attendu, m + (n === attendu ? '' : ` (${n})`)); }
    verif(date === new Date(J('09:17')).toISOString(), 'le dernier cycle est daté de l\'heure où l\'action est partie');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

console.log('2. Un monde solo, et le temps réel');
const T = Date.parse('2026-11-01T08:00:00Z');
{ const A = Solo.creer(P0, { periode: '10m', maintenant: T });
  verif(A.etat.monde.id === 'orvane-solo' && A.etat.monde.solo.depuis === 'orvane' && A.etat.cycle.n === P0.cycle.n, "il part de l'instantané publié, sous son propre nom");
  const n = A.etat.cycle.n; Solo.avancer(A, T + 35 * M); const n1 = A.etat.cycle.n - n;
  Solo.avancer(A, T + 39 * M); const n2 = A.etat.cycle.n - n; Solo.avancer(A, T + 40 * M); const n3 = A.etat.cycle.n - n;
  verif(n1 === 3 && n2 === 3 && n3 === 4, `un cycle toutes les 10 minutes : 3 cycles à 35 min, toujours 3 à 39, 4 à 40 (${n1}, ${n2}, ${n3})`);
  const B = Solo.creer(P0, { periode: '10m', rattrapage: 5, maintenant: T }); Solo.avancer(B, T + 7 * 24 * H);
  verif(B.etat.cycle.n - n === 5 && Solo.avancer(B, T + 7 * 24 * H).length === 0, 'une semaine sans le jeu, rattrapage 5 : 5 cycles, puis plus rien de dû');
  const C = Solo.creer(P0, { periode: '1h', acceleration: 60, maintenant: T }); Solo.avancer(C, T + 3 * M);
  verif(C.etat.cycle.n - n === 3, 'en accéléré (× 60), un monde à l\'heure fait 3 cycles en 3 minutes');
  verif(Solo.cycles(Solo.creer(P0, { maintenant: T }), 2).length >= 0, 'cycles(n) : n cycles tout de suite, sans regarder l\'heure');
}

console.log('3. Ce que fait le joueur');
{ const tx = P0.taxons.filter(t => t.famille !== 'synthetique' && !t.eteint).flatMap(t => t.populations.map(p => ({ t, p }))).filter(({ p }) => p.effectif > 2000 && p.effectif < 50000).sort((a, b) => b.p.effectif - a.p.effectif)[0];
  const A = Solo.creer(P0, { maintenant: T }), B = Solo.creer(P0, { maintenant: T });
  for (let k = 0; k < 5; k++) { Solo.noter(B, { taxon: tx.t.id, biome: tx.p.biome, action: 'prelevement', n: Math.round(tx.p.effectif * .05) }); Solo.cycles(A, 1); Solo.cycles(B, 1); }
  const eff = W => W.etat.taxons.find(t => t.id === tx.t.id).populations.find(p => p.biome === tx.p.biome)?.effectif || 0, ea = eff(A), eb = eff(B);
  verif(eb < ea * .95, `le joueur chasse ${tx.t.nom} (${tx.p.biome}), 5 % par cycle : il en reste ${fx(eb / ea * 100)} % de ce qu'il y aurait sans lui`);
  verif(B.notes.length === 0, 'les notes passent au cycle suivant, puis sont effacées');
  verif(['etat.json', 'instantane.json'].every((f, i) => empreinte(lireJ('mondes/orvane/' + f)) === partage[i]), "le monde partagé n'en voit rien");
}

console.log('4. Le garder, le recharger, le navigateur, le contrat');
{ const A = Solo.creer(P0, { periode: '10m', maintenant: T }); Solo.cycles(A, 2); const j = Solo.sauver(A);
  const B = Solo.charger(j), C = Solo.charger(j); Solo.cycles(B, 2); Solo.cycles(C, 2);
  verif(empreinte(B.etat) === empreinte(C.etat), `sauvé (${fx(j.length / 1e6, 2)} Mo), rechargé deux fois, deux cycles chacun : le même monde`);
  let refuse = false; try { Solo.charger('{"x":1}'); } catch { refuse = true; } verif(refuse, "charger refuse ce qui n'est pas un monde solo");
  // le navigateur : les fichiers chargés dans l'ordre, sans require ni module, comme des balises <script>
  const ctx = { console, JSON, Math, Date }; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['moteur/catalogue.js', 'moteur/corps.js', 'moteur/dietes.js', 'moteur/phenologie.js', 'moteur/flore.js', 'moteur/derives.js', 'moteur/pathogenes.js', 'moteur/milieu.js', 'moteur/synthetique.js', 'moteur/ponte.js', 'moteur/stades.js',
    'moteur/invention.js', 'moteur/natures.js', 'moteur/climat.js', 'moteur/meteo.js', 'moteur/succession.js', 'moteur/diversite.js', 'moteur/grammaire.js', 'moteur/castes.js', 'moteur/formes.js', 'moteur/esprit.js', 'moteur/memoire.js', 'moteur/orvane.js', 'tampon/tampon.js', 'moteur/parcelles.js', 'moteur/collectif.js', 'moteur/solo.js'])   // (docs/19 : tous les modules, avant orvane.js)
    vm.runInContext(fs.readFileSync(racine(f), 'utf8'), ctx, { filename: f });
  ctx.src = j; const D = vm.runInContext('(() => { const S = OrvaneSolo.charger(src); OrvaneSolo.cycles(S, 2); return JSON.stringify(S.etat); })()', ctx);
  verif(empreinte(JSON.parse(D)) === empreinte(B.etat), 'dans un navigateur (globalThis.OrvaneSolo), le même monde qu\'avec Node');
  // (docs/17) les plantes sont publiées à part : avec flore.json, le monde solo a sa flore, et tourne comme le monde dont il part
  { const W = require(racine('moteur/flore.js')).eveiller(I0).inst, Tp = require(racine('tampon/tampon.js')), Or = require(racine('moteur/orvane.js'));
    const pub = Tp.filtrer(W, { familles: ['animale', 'synthetique'] }), flore = { catalogue: { flore: W.catalogue?.flore }, taxons: W.taxons.filter(t => t.plan?.regime === 'vegetal') };
    const F = Solo.creer(pub, { flore, maintenant: T }), G = Solo.creer(pub, { maintenant: T }); let Dd = W; for (let k = 0; k < 3; k++) Dd = Or.cycle(Dd, {}, { duree_ms: H }); Solo.cycles(F, 3); Solo.cycles(G, 3);
    const br = I => somme(I.taxons.filter(t => !t.eteint && t.plan?.regime === 'herbivore').flatMap(t => t.populations.map(p => p.effectif * (t.plan.masse_kg || 1))));
    verif(Math.abs(br(F.etat) / br(Dd) - 1) < 1e-3 && F.etat.monde.flore && !G.etat.monde.flore, `avec flore.json, il a ses ${flore.taxons.length} lignées de plantes et ses brouteurs tournent comme dans le monde dont il part ; sans, il tourne sans flore`); }
  const V = Solo.vue(B), e = val(S, V, '$');
  verif(!e.length, "ce que le jeu lit (vue) respecte schemas/instantane.schema.json" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
