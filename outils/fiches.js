// Orvane — LES FICHES DE CRÉATURES (outils/fiches.js) — docs/52
// Écrit la fiche de chaque lignée d'un instantané dans un dossier (monde/fiche.js) : <id>.md, la fiche pour un dessinateur, en
// français ; <id>.json, la fiche entière (famille, humain, ia, champs) ; index.json, pour chaque lignée son nom, sa famille, sa règle,
// sa mère, son prompt 2D et ses fichiers, et les comptes par famille. De quoi préparer la génération des modèles 2D et 3D, ou relire
// les fiches d'un coup. Les plantes n'ont pas de fiche de créature (monde/herbier.js les dessine).
// Par défaut, les fiches vont hors du dépôt, dans le dossier temporaire de la machine (elles pèsent environ 14 Mo pour le monde
// d'Orvane) ; l'outil dit où.
//   node outils/fiches.js                                          le monde d'Orvane, dans <tmp>/orvane-fiches/orvane/
//   node outils/fiches.js mondes/genese-7/instantane.json --sortie /chemin/des/fiches
//   [--style "…"]               le style de la DA, à la place de [STYLE ORVANE]
//   [--lignees kaume,firtis]    seulement celles-là
// Ne touche ni au monde ni au moteur. Sortie : 0 ; 1 si une fiche n'a pas pu s'écrire.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const racine = path.join(__dirname, '..');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const src = path.resolve(a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--'))) || path.join(racine, 'mondes/orvane/instantane.json'));
const Fiche = require('../monde/fiche.js');
const I = JSON.parse(fs.readFileSync(src, 'utf8'));
const sortie = path.resolve(arg('--sortie', arg('--dossier', path.join(os.tmpdir(), 'orvane-fiches', String(I.monde?.id || 'monde'))))), seules = arg('--lignees', null)?.split(','), style = arg('--style', undefined);
fs.mkdirSync(sortie, { recursive: true });
// un nom de fichier par lignée, sans collision : les caractères hors de [a-z0-9._-] s'écrivent par leur code (« a~1 » → « a%7e1 »,
// qui ne se confond pas avec « a_1 ») ; deux noms qui ne diffèrent que par la casse prennent un suffixe (un disque qui ignore la casse)
const pris = new Set(), nomDe = id => { const base = String(id).replace(/[^a-z0-9._-]/g, ch => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'));
  let n = base, k = 2; while (pris.has(n.toLowerCase())) n = base + '-' + k++; pris.add(n.toLowerCase()); return n; };
const index = { orvane: I.orvane ?? null, monde: I.monde?.id ?? null, cycle: I.cycle?.n ?? null, table: Fiche.VERSION, familles: {}, lignees: [] };
let mal = 0;
for (const t of I.taxons || []) {
  if (t.plan?.regime === 'vegetal' || (seules && !seules.includes(t.id))) continue;
  try {
    const f = Fiche.ecrire(t, I, { style }), nom = nomDe(t.id);
    fs.writeFileSync(path.join(sortie, nom + '.md'), f.humain);
    fs.writeFileSync(path.join(sortie, nom + '.json'), JSON.stringify(f, null, 1) + '\n');
    index.familles[f.famille] = (index.familles[f.famille] || 0) + 1;
    index.lignees.push({ id: t.id, fichier: nom, nom: t.nom, famille: f.famille, regle: f.champs.famille.regle, parent: t.parent ?? null, prompt_2d: f.ia.prompt_2d });
  } catch (e) { mal++; console.error(`✗ ${t.id} : ${e.message}`); }
}
fs.writeFileSync(path.join(sortie, 'index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`${index.lignees.length} fiches dans ${sortie} : ${Object.entries(index.familles).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).map(([f, n]) => f + ' ' + n).join(', ')}${mal ? ` ; ${mal} en échec` : ''}`);
process.exit(mal ? 1 : 0);
