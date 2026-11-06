// Orvane — LE BANC GÉNÉRIQUE D'UN TRADUCTEUR (outils/banc-traducteur.js) — docs/39
// Un jeu donne son traducteur (le modèle : traducteurs/exemple/traducteur.js) ; le banc le fait lire des mondes variés et vérifie,
// pour chacun :
//  1. qu'il lit le monde sans lever d'erreur ;
//  2. que chaque créature qu'il montre est rattachée à une lignée vivante, dans un lieu où elle vit (et que le jeu joue) ;
//  3. qu'il n'oublie aucune lignée de ce qu'il montre : chaque lignée de ses familles, dans chaque lieu qu'il joue, a sa créature ;
//  4. qu'il lit toujours de la même façon, sans toucher au monde ;
//  5. que ses lots sont conformes (le vérificateur, et ce que le Supabase refusera) et que le tampon n'en écarte rien.
// Les mondes : le monde d'Orvane, les genèses publiées, Stone Valley, l'exemple du contrat, un monde piège (une forme et un organe
// inconnus, une lignée sans corps, une lignée éteinte, une population de moins d'une bête, un lieu que nul jeu ne connaît) ; avec
// --lumen, un monde imaginaire né d'une genèse (ses axes, ses traits, ses organes à lui).
//   node outils/banc-traducteur.js <traducteur.js> [--lumen] [--sessions 20]
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Tampon = require(racine('tampon/tampon.js')), { verifier } = require(racine('outils/verifier.js'));
const lireJ = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const empreinte = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const typeDe = id => String(id).split('~')[0];
const hasardDe = s => { let g = (s * 2654435761) >>> 0 || 1; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };
const quelques = (L, n = 3) => L.slice(0, n).join(', ') + (L.length > n ? ` et ${L.length - n} autres` : '');

// --- les mondes d'essai ---
function piege(I) {
  const X = JSON.parse(JSON.stringify(I)), V = X.taxons.filter(t => !t.eteint && Tampon.familleDe(t) === 'animale');
  const [a, b, c, d] = V;
  if (a?.plan?.corps) { a.plan.corps.forme = 'tentaculaire'; a.plan.corps.pattes = 8; (a.plan.corps.organes ||= []).push({ type: 'lanterne', taille: .6, nombre: 1, place: 'tete', forme: 'bleue' }); }   // une forme, un organe que le jeu ne connaît pas
  if (b) delete b.plan.corps;                                                          // une lignée sans corps
  if (c) { c.eteint = X.cycle?.n ?? 0; c.statut = 'eteint'; c.populations = []; }      // une lignée éteinte, encore listée
  if (d?.populations?.[0]) d.populations[0].effectif = .4;                              // moins d'une bête
  if (V[4]) V[4].nom_commun = 'la Bête du Gévaudan';                                    // un nom donné par un joueur
  const lieu = { ...(X.biomes[0] || {}), id: 'cristal-profond', nom: 'Cristal profond', voisins: [] }; X.biomes.push(lieu);   // un lieu que nul jeu ne connaît
  if (V[5]) V[5].populations.push({ ...V[5].populations[0], biome: 'cristal-profond', effectif: 120 });
  return X;
}
function mondes(opt) {
  const L = [], ajouter = (nom, f, profil) => { if (fs.existsSync(f)) L.push({ nom, inst: lireJ(f), profil: profil && fs.existsSync(profil) ? lireJ(profil) : {} }); };
  ajouter('le monde d\'Orvane', racine('mondes/orvane/instantane.json'), racine('mondes/orvane/profil.json'));
  ajouter('la genèse 7', racine('mondes/genese-7/instantane.json'), racine('mondes/genese-7/profil.json'));
  ajouter('la genèse 2026', racine('mondes/genese-2026/instantane.json'), racine('mondes/genese-2026/profil.json'));
  ajouter('le monde de Stone Valley', racine('mondes/sv-1/instantane.json'), racine('mondes/sv-1/profil.json'));
  ajouter('l\'exemple du contrat', racine('schemas/exemples/instantane.json'));
  if (L[0]) L.push({ nom: 'le monde piège', inst: piege(L[0].inst), profil: {} });
  if (opt.lumen) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-lumen-')), f = path.join(dir, 'lumen.json');
    try { execFileSync('node', [racine('moteur/genese.js'), racine('bancs/lumen/biomes.json'), '--catalogue', racine('bancs/lumen/catalogue.json'), '--cycles', '200', '--graine', '11', '--lignees', '60', '--nom', 'Lumen', '--point', '0', '--sortie', f], { stdio: 'ignore' });
      L.push({ nom: 'Lumen, un monde imaginaire', inst: lireJ(f), profil: {} }); } finally { fs.rmSync(dir, { recursive: true, force: true }); } }
  return L;
}

// --- le banc ---
function banc(T, opt = {}) {
  const S = opt.sessions || 20, sortie = [];
  let ok = true; const verif = (c, m) => { ok = ok && !!c; sortie.push((c ? '  ✓ ' : '  ✗ ') + m); };
  const joue = b => !Array.isArray(T.biomes) || !T.biomes.length || T.biomes.includes(typeDe(b)) || T.biomes.includes(b);
  const familles = new Set(Array.isArray(T.familles) && T.familles.length ? T.familles : ['animale']);
  if (typeof T.lire !== 'function') { verif(false, 'le traducteur n\'a pas de fonction lire(instantane)'); return { ok, sortie }; }
  for (const { nom, inst, profil } of mondes(opt)) {
    sortie.push(`${nom} (${inst.monde?.id || '?'}, cycle ${inst.cycle?.n ?? '?'})`);
    // 1. lire
    const avant = empreinte(inst); let C;
    try { C = T.lire(inst); } catch (e) { verif(false, `lire() lève une erreur : ${e.message}`); continue; }
    if (!Array.isArray(C)) { verif(false, 'lire() ne rend pas une liste de créatures'); continue; }
    verif(true, `il le lit : ${C.length} créature${C.length > 1 ? 's' : ''}`);
    // 2. des créatures rattachées à une lignée vivante, dans un lieu où elle vit
    const T0 = new Map(inst.taxons.map(t => [t.id, t])), B0 = new Set(inst.biomes.map(b => b.id)), fautes = [];
    for (const c of C) { const t = T0.get(c?.taxon);
      if (!t) fautes.push(`${c?.taxon} : aucune lignée de ce nom`); else if (t.eteint) fautes.push(`${c.taxon} : éteinte`);
      else if (!B0.has(c.biome)) fautes.push(`${c.taxon} @ ${c.biome} : aucun lieu de ce nom`);
      else if (!(t.populations || []).some(p => p.biome === c.biome && p.effectif > 0)) fautes.push(`${c.taxon} @ ${c.biome} : elle n'y vit pas`);
      else if (!joue(c.biome)) fautes.push(`${c.taxon} @ ${c.biome} : un lieu que le jeu ne dit pas jouer`); }
    verif(!fautes.length, fautes.length ? `${fautes.length} créature${fautes.length > 1 ? 's' : ''} mal rattachée${fautes.length > 1 ? 's' : ''} : ${quelques(fautes)}` : 'chaque créature est une lignée vivante, dans un lieu où elle vit et que le jeu joue');
    // 3. aucune lignée oubliée
    const vues = new Set(C.map(c => c.taxon + '@' + c.biome)), oubli = [];
    for (const t of inst.taxons) { if (t.eteint || !familles.has(Tampon.familleDe(t))) continue;
      for (const p of t.populations || []) if (p.effectif >= 1 && joue(p.biome) && !vues.has(t.id + '@' + p.biome)) oubli.push(`${t.nom || t.id} @ ${p.biome}`); }
    verif(!oubli.length, oubli.length ? `${new Set(oubli.map(x => x.split(' @ ')[0])).size} lignée(s) oubliée(s), dans ${oubli.length} lieu(x) : ${quelques(oubli)}` : 'aucune lignée oubliée dans les lieux qu\'il joue');
    // 4. la même lecture, le monde intact
    let C2 = null; try { C2 = T.lire(inst); } catch (e) { }
    verif(empreinte(C2) === empreinte(C) && empreinte(inst) === avant, empreinte(inst) !== avant ? 'lire() modifie le monde qu\'on lui donne' : empreinte(C2) !== empreinte(C) ? 'deux lectures du même monde diffèrent' : 'deux lectures du même monde sont identiques, et le monde est intact');
    // 5. des lots conformes, que le tampon lit en entier
    if (typeof T.jouer !== 'function') { sortie.push('  · pas de fonction jouer() : les lots ne sont pas essayés'); continue; }
    const lots = [], pb = [];
    for (let s = 1; s <= S; s++) { let lot; try { lot = T.jouer(inst, hasardDe(s)); } catch (e) { pb.push(`session ${s} : jouer() lève une erreur : ${e.message}`); continue; }
      const E = verifier(lot, 'lot'); if (E.length) pb.push(`session ${s} : ${E[0]}${E.length > 1 ? ` (et ${E.length - 1} autres)` : ''}`);
      if (lot?.monde !== inst.monde?.id) pb.push(`session ${s} : le lot est pour le monde « ${lot?.monde} », pas pour « ${inst.monde?.id} » (le tampon l'ignorerait)`);
      lots.push(lot); }
    verif(!pb.length, pb.length ? `${pb.length} lots fautifs : ${quelques(pb, 2)}` : `${S} sessions : des lots conformes, que le Supabase acceptera`);
    let R = null; try { R = Tampon.agreger(lots, inst, profil || {}); } catch (e) { verif(false, `le tampon ne lit pas ces lots : ${e.message}`); continue; }
    const n = lots.reduce((a, l) => a + (l?.evenements?.length || 0), 0);
    verif(R.rejetes.lots === 0 && R.rejetes.evenements === 0, R.rejetes.lots || R.rejetes.evenements ? `le tampon écarte ${R.rejetes.lots} lots et ${R.rejetes.evenements} événements sur ${n}` : `le tampon les lit en entier (${n} événements, aucun écarté)`);
  }
  return { ok, sortie };
}

if (require.main === module) {
  const a = process.argv.slice(2), f = a.find(x => !x.startsWith('--') && /\.js$/.test(x));
  if (!f) { console.log('node outils/banc-traducteur.js <traducteur.js> [--lumen] [--sessions 20]'); process.exit(2); }
  const iS = a.indexOf('--sessions'), T = require(path.resolve(f)), t0 = Date.now();
  console.log(`Le banc générique : ${T.nom || T.id || f}`);
  const { ok, sortie } = banc(T, { lumen: a.includes('--lumen'), sessions: iS >= 0 ? +a[iS + 1] : 20 });
  console.log(sortie.join('\n')); console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(ok ? 0 : 1);
}
module.exports = { banc, mondes, piege };
