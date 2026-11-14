// Orvane — LE BANC DE LISIÈRE (bancs/lisiere.js), le jeu Godot branché sur Orvane (jeux/lisiere/LISEZ-MOI.md)
// Ce qui se vérifie sans Godot, à chaque PR :
//  1. le projet : chaque fichier qu'il nomme (res://…) existe ; la scène de départ, l'autoload du kit ;
//  2. le kit : la copie du jeu (jeux/lisiere/addons/orvane/) est celle du kit (kits/godot/addons/orvane/), au caractère près ;
//  3. le monde gardé dans le jeu (donnees/) : chaque lieu a son morceau et sa planche, le jeu le propose, chaque bête du jeu son dessin, et chaque
//     lieu son herbier (ses plantes dessinées) et de quoi jouer (des proies le jour, des chasseurs la nuit), selon les règles de scripts/donnees.gd.
// Ce que seul Godot vérifie (que le jeu tourne) : outils/godot.sh --headless --path jeux/lisiere -- --essai
//   node bancs/lisiere.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p), JEU = racine('jeux/lisiere');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const lire = f => fs.readFileSync(path.join(JEU, f), 'utf8'), lireJ = f => JSON.parse(lire(f));
const fichiers = d => fs.readdirSync(path.join(JEU, d)).filter(f => !f.startsWith('.')).map(f => path.join(d, f));

console.log('1. Le projet');
const projet = lire('project.godot'), sources = ['project.godot', 'export_presets.cfg', ...fichiers('scenes'), ...fichiers('scripts'), ...fichiers('addons/orvane')];
const noms = new Set(sources.flatMap(f => [...lire(f).matchAll(/res:\/\/([A-Za-zÀ-ÿ0-9_\-./]+)/g)].map(m => m[1])));
const manquent = [...noms].filter(n => !fs.existsSync(path.join(JEU, n)));
verif(!manquent.length, `les ${noms.size} fichiers que nomme le projet existent` + (manquent.length ? ` ; manquent : ${manquent.join(', ')}` : ''));
verif(/run\/main_scene="res:\/\/scenes\/principal\.tscn"/.test(projet) && /Orvane="\*res:\/\/addons\/orvane\/orvane\.gd"/.test(projet) && /gl_compatibility/.test(projet),
  'la scène de départ, le kit en autoload, le rendu qui marche aussi dans un navigateur (Compatibility)');
const gd = fichiers('scripts').filter(f => f.endsWith('.gd'));
const espaces = gd.filter(f => lire(f).split('\n').some(l => /^ +\S/.test(l)));
verif(!espaces.length, `${gd.length} scripts, indentés aux tabulations, comme Godot le veut` + (espaces.length ? ` ; avec des espaces : ${espaces.join(', ')}` : ''));

console.log('2. Le kit');
const kit = racine('kits/godot/addons/orvane'), diff = fs.readdirSync(kit).filter(f => fs.readFileSync(path.join(kit, f), 'utf8') !== (fs.existsSync(path.join(JEU, 'addons/orvane', f)) ? lire('addons/orvane/' + f) : null));
verif(!diff.length, 'le jeu porte le kit Godot tel quel (addons/orvane/)' + (diff.length ? ` ; diffère : ${diff.join(', ')} (cp kits/godot/addons/orvane/* jeux/lisiere/addons/orvane/)` : ''));

console.log('3. Le monde gardé dans le jeu');
const index = lireJ('donnees/index.json'), lieux = index.secours?.lieux || [];
verif(lieux.length >= 3 && lieux.every(b => fs.existsSync(path.join(JEU, 'donnees/biomes', b + '.json')) && fs.existsSync(path.join(JEU, 'donnees/silhouettes', b + '.json'))),
  `${lieux.length} lieux gardés (${lieux.join(', ')}), au cycle ${index.cycle?.n}, chacun avec son morceau et sa planche`);
// les lieux que le jeu propose (scripts/donnees.gd, lieux), en JavaScript : sur la terre ferme ou à demi dans l'eau, une proie et un chasseur
const chasse = t => t.regime === 'carnivore' || (t.regime === 'omnivore' && t.masse_kg >= 15);
const proposes = new Set(index.biomes.filter(b => ['terrestre', 'amphibie'].includes(b.milieu || 'terrestre')).map(b => b.id).filter(id => {
  const ici = index.taxons.filter(t => (t.famille || 'animale') === 'animale' && t.statut !== 'eteint' && (t.biomes || []).includes(id) && t.masse_kg >= 0.2 && !['vegetal', 'synthetique'].includes(t.regime));
  return ici.some(t => !chasse(t)) && ici.some(t => chasse(t) && t.masse_kg >= 1); }));
const oublies = lieux.filter(b => !proposes.has(b));
verif(!oublies.length, 'le jeu propose chaque lieu gardé à son écran-titre' + (oublies.length ? ` ; jamais proposés : ${oublies.join(', ')}` : ''));
// les règles de scripts/donnees.gd (faune), en JavaScript
const TERRE = new Set(['marche', 'course', 'saut', 'fouissage', 'grimpe', 'reptation']);
const faune = (M, b) => { const F = { proies_jour: [], chasseurs_nuit: [], chasseurs: [] };
  for (const t of M.taxons) { const p = t.plan; if (t.eteint != null || !p || ['vegetal', 'synthetique'].includes(p.regime) || p.famille === 'vegetale' || p.masse_kg < 0.2) continue;
    if (!(p.locomotion || []).some(l => TERRE.has(l))) continue;
    const e = t.populations.filter(x => x.biome === b).reduce((s, x) => s + x.effectif, 0); if (e < 1) continue;
    const ch = p.regime === 'carnivore' || (p.regime === 'omnivore' && p.masse_kg >= 15), act = p.activite || 'diurne';
    if (ch) { F.chasseurs.push(t); if (act !== 'diurne') F.chasseurs_nuit.push(t); } else if (act !== 'nocturne') F.proies_jour.push(t); }
  if (!F.chasseurs_nuit.length) F.chasseurs_nuit = F.chasseurs.filter(t => t.plan.masse_kg >= 1);
  return F; };
const bilan = [], sansDessin = [];
for (const b of lieux) {
  const M = lireJ(`donnees/biomes/${b}.json`), P = lireJ(`donnees/silhouettes/${b}.json`), F = faune(M, b);
  for (const t of [...F.proies_jour, ...F.chasseurs]) { const s = P.silhouettes[t.id]; if (!s || !s.svg.startsWith('<svg') || !s.yeux.length) sansDessin.push(`${b}/${t.id}`); }
  bilan.push({ b, proies: F.proies_jour.length, nuit: F.chasseurs_nuit.length });
}
verif(!sansDessin.length, 'chaque bête que le jeu fait venir a son dessin et ses yeux' + (sansDessin.length ? ` ; sans : ${sansDessin.slice(0, 6).join(', ')}` : ''));
verif(bilan.every(x => x.proies >= 3 && x.nuit >= 1), 'chaque lieu se joue : ' + bilan.map(x => `${x.b} ${x.proies} proies, ${x.nuit} chasseurs de nuit`).join(' ; '));
// (docs/49) l'herbier de chaque lieu : ses plantes dessinées, de quoi faire ses arbres, ses buissons et ses touffes
const PORTS = { arbre: ['arbre'], buisson: ['buisson'], touffe: ['herbe', 'roseau', 'succulente', 'lichen', 'champignon'] }, herbiers = lieux.map(b => { const f = path.join(JEU, 'donnees/herbier', b + '.json'); return [b, fs.existsSync(f) ? lireJ(`donnees/herbier/${b}.json`) : null]; });
const malDessinees = herbiers.flatMap(([b, H]) => H ? Object.entries(H.plantes).filter(([, p]) => !p.svg.startsWith('<svg') || !(p.hauteur_m > 0) || !p.port).map(([id]) => `${b}/${id}`) : [`${b} (pas d'herbier)`]);
verif(!malDessinees.length && herbiers.every(([, H]) => Object.values(H.plantes).some(p => PORTS.touffe.includes(p.port))), 'chaque lieu a son herbier : ' + herbiers.map(([b, H]) => `${b} ${H ? Object.keys(H.plantes).length : 0} plantes (${H ? [...new Set(Object.values(H.plantes).map(p => p.port))].join(', ') : ''})`).join(' ; ') + (malDessinees.length ? ` ; mal : ${malDessinees.slice(0, 5).join(', ')}` : ''));
const taille = ['index.json', ...lieux.flatMap(b => [`biomes/${b}.json`, `silhouettes/${b}.json`, `herbier/${b}.json`])].reduce((s, f) => s + fs.statSync(path.join(JEU, 'donnees', f)).size, 0);
verif(taille < 4e6, `le tout pèse ${Math.round(taille / 1024)} Ko (moins de 4 Mo)`);

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'}`); process.exit(ok ? 0 : 1);
