// Orvane — LE BANC DE PORTEFAIX (bancs/portefaix.js), le prototype Godot en 3D (jeux/portefaix/LISEZ-MOI.md) ; il n'est pas branché sur Orvane
// Ce qui se vérifie sans Godot, à chaque PR :
//  1. le projet : chaque fichier qu'il nomme (res://…) existe ; la scène de départ ; des scripts indentés aux tabulations ;
//  2. la maison (scripts/maison.gd) : un plan rectangulaire, clos de murs, où tout le sol se rejoint depuis la porte d'entrée ; des pièces, des lampes
//     et des portes posées sur du sol ;
//  3. les règles (scripts/regles.gd) : chaque meuble de la maison est au catalogue ; seul, on peut faire le quota sans soulever ce qui se porte à deux.
// Ce que seul Godot vérifie (que le jeu tourne, seul et en réseau) : outils/godot.sh --headless --path jeux/portefaix -- --essai (puis --essai-reseau)
//   node bancs/portefaix.js
'use strict';
const fs = require('fs'), path = require('path');
const JEU = path.join(__dirname, '..', 'jeux/portefaix');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const lire = f => fs.readFileSync(path.join(JEU, f), 'utf8');
const fichiers = d => fs.readdirSync(path.join(JEU, d)).filter(f => !f.startsWith('.')).map(f => path.join(d, f));

console.log('1. Le projet');
const projet = lire('project.godot'), sources = ['project.godot', ...fichiers('scenes'), ...fichiers('scripts')];
const noms = new Set(sources.flatMap(f => [...lire(f).matchAll(/res:\/\/([A-Za-zÀ-ÿ0-9_\-./]+)/g)].map(m => m[1])).filter(n => /\.[a-z]+$/.test(n)));
const manquent = [...noms].filter(n => !fs.existsSync(path.join(JEU, n)));
verif(noms.size >= 10 && !manquent.length, `les ${noms.size} fichiers que nomme le projet existent` + (manquent.length ? ` ; manquent : ${manquent.join(', ')}` : ''));
verif(/run\/main_scene="res:\/\/scenes\/principal\.tscn"/.test(projet) && /gl_compatibility/.test(projet) && /driver\/enable_input=true/.test(projet),
  'la scène de départ, le rendu Compatibility, le micro ouvert');
const gd = fichiers('scripts').filter(f => f.endsWith('.gd'));
const espaces = gd.filter(f => lire(f).split('\n').some(l => /^ +\S/.test(l)));
verif(!espaces.length, `${gd.length} scripts, indentés aux tabulations, comme Godot le veut` + (espaces.length ? ` ; avec des espaces : ${espaces.join(', ')}` : ''));

console.log('2. La maison');
const maison = lire('scripts/maison.gd');
const plan = [...maison.match(/const PLAN := \[([\s\S]*?)\n\]/)[1].matchAll(/"([#.DP]+)"/g)].map(m => m[1]);
const L = plan[0].length, H = plan.length, sol = (c, l) => l >= 0 && l < H && c >= 0 && c < L && plan[l][c] !== '#';
verif(H >= 8 && plan.every(l => l.length === L), `un plan de ${L} sur ${H} cases, rectangulaire`);
const bord = [];
for (let l = 0; l < H; l++) for (let c = 0; c < L; c++) if ((l === 0 || l === H - 1 || c === 0 || c === L - 1) && plan[l][c] !== '#') bord.push(plan[l][c]);
verif(bord.length > 0 && bord.every(x => x === 'P') && plan[H - 1].includes('P'), `clos de murs, avec une seule sortie : la porte d'entrée, côté cour (${bord.length} cases)`);
const vus = new Set(), pile = [[plan[H - 1].indexOf('P'), H - 1]];
while (pile.length) { const [c, l] = pile.pop(), k = c + ',' + l; if (!sol(c, l) || vus.has(k)) continue; vus.add(k); pile.push([c + 1, l], [c - 1, l], [c, l + 1], [c, l - 1]); }
const sols = plan.join('').replace(/#/g, '').length;
verif(vus.size === sols, `les ${sols} cases de sol se rejoignent toutes depuis l'entrée` + (vus.size === sols ? '' : ` ; ${sols - vus.size} sont enfermées`));
const pieces = [...maison.matchAll(/"rect": Rect2i\((\d+), (\d+), (\d+), (\d+)\)/g)].map(m => m.slice(1).map(Number));
const pleines = pieces.filter(([c, l, w, h]) => { for (let y = l; y < l + h; y++) for (let x = c; x < c + w; x++) if (plan[y]?.[x] !== '.') return false; return true; });
verif(pieces.length >= 4 && pleines.length === pieces.length, `${pieces.length} pièces à meubler, toutes sur du sol`);
const lampes = [...maison.match(/const LAMPES := \[([\s\S]*?)\]\n/)[1].matchAll(/Vector2\(([\d.]+), ([\d.]+)\)/g)].map(m => [+m[1], +m[2]]);
verif(lampes.length >= pieces.length && lampes.every(([x, z]) => sol(Math.floor(x), Math.floor(z))), `${lampes.length} lampes, toutes au-dessus du sol`);
verif(plan.join('').includes('DD') && plan.every(l => !/(^|[^D])D([^D]|$)/.test(l)), 'des portes de deux mètres, où passe un canapé');

console.log('3. Les règles');
const regles = lire('scripts/regles.gd');
const catalogue = {};
for (const m of regles.matchAll(/"(\w+)": \{"nom": "[^"]+", "taille": Vector3\(([\d.]+), ([\d.]+), ([\d.]+)\), "masse": ([\d.]+), "valeur": (\d+), "fragile": ([\d.]+)/g))
  catalogue[m[1]] = { taille: [+m[2], +m[3], +m[4]], masse: +m[5], valeur: +m[6], fragile: +m[7] };
const mobilier = [...regles.match(/const MOBILIER := \[([\s\S]*?)\]/)[1].matchAll(/"(\w+)"/g)].map(m => m[1]);
const nombre = n => +regles.match(new RegExp(`const ${n} := ([\\d.]+)`))[1];
const inconnus = mobilier.filter(t => !catalogue[t]);
verif(mobilier.length >= 15 && !inconnus.length, `${mobilier.length} meubles dans la maison, tous au catalogue (${Object.keys(catalogue).length} sortes)` + (inconnus.length ? ` ; inconnus : ${inconnus.join(', ')}` : ''));
const haut = nombre('HAUTEUR'), trop = Object.entries(catalogue).filter(([, o]) => o.taille[1] > 2.2 || o.taille[1] >= haut || o.fragile < 0 || o.fragile > 1);
verif(!trop.length, 'chacun passe sous une porte, debout, et sa fragilité est une part' + (trop.length ? ` ; pas : ${trop.map(x => x[0]).join(', ')}` : ''));
const force = nombre('FORCE_PORTEUR'), total = mobilier.reduce((s, t) => s + catalogue[t].valeur, 0);
const seul = mobilier.filter(t => catalogue[t].masse * 9.8 <= force).reduce((s, t) => s + catalogue[t].valeur, 0);
const quota = n => Math.round(total * Math.min(nombre('QUOTA') + nombre('QUOTA_PAR_JOUEUR') * (n - 1), nombre('QUOTA_MAX')) / 10) * 10;
verif(seul >= quota(1) * 1.3, `seul, on fait le quota (${quota(1)} € sur ${total}) avec ce qu'on soulève seul (${seul} €), de la casse comprise`);
verif(quota(6) > seul * 0.75, `à six, il faut aussi sortir les lourds (${quota(6)} €)`);
const sabotages = [...regles.match(/const SABOTAGES := \{([\s\S]*?)\n\}/)[1].matchAll(/"(\w+)": \{"nom"/g)].map(m => m[1]);
const principal = lire('scripts/principal.gd');
verif(sabotages.length >= 3 && sabotages.every(s => principal.includes(`"${s}"`)), `${sabotages.length} sabotages pour le chat, chacun joué par le jeu (${sabotages.join(', ')})`);
verif(nombre('CHOSE_CHASSE') > nombre('MARCHE') && nombre('CHOSE_CHASSE') < nombre('COURSE'), 'la chose va plus vite qu\'on ne marche, moins qu\'on ne court');

console.log(ok ? '\nTout passe.' : '\nÉCHEC.');
process.exit(ok ? 0 : 1);
