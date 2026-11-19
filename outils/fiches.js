// Orvane — LES FICHES DE CRÉATURES (outils/fiches.js) — docs/52
// Écrit la fiche de chaque lignée d'un instantané dans un dossier (monde/fiche.js) : <id>.md, la fiche pour un dessinateur, en
// français ; <id>.json, la fiche entière (famille, humain, ia, champs) ; index.json, pour chaque lignée son nom, sa famille, sa règle,
// sa mère et son prompt 2D, et les comptes par famille. De quoi préparer la génération des modèles 2D et 3D, ou relire les fiches d'un
// coup. Les plantes n'ont pas de fiche de créature (monde/herbier.js les dessine).
//   node outils/fiches.js                                          le monde d'Orvane (mondes/orvane/instantane.json), dans fiches/orvane/
//   node outils/fiches.js mondes/genese-7/instantane.json --dossier /tmp/fiches
//   [--style "…"]               le style de la DA, à la place de [STYLE ORVANE]
//   [--lignees kaume,firtis]    seulement celles-là
// Ne touche ni au monde ni au moteur. Sortie : 0 ; 1 si une fiche n'a pas pu s'écrire.
'use strict';
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const src = path.resolve(a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--'))) || path.join(racine, 'mondes/orvane/instantane.json'));
const Fiche = require('../monde/fiche.js');
const I = JSON.parse(fs.readFileSync(src, 'utf8'));
const dossier = path.resolve(arg('--dossier', path.join('fiches', I.monde?.id || 'monde'))), seules = arg('--lignees', null)?.split(','), style = arg('--style', undefined);
fs.mkdirSync(dossier, { recursive: true });
const index = { orvane: I.orvane ?? null, monde: I.monde?.id ?? null, cycle: I.cycle?.n ?? null, table: Fiche.VERSION, familles: {}, lignees: [] };
let mal = 0;
for (const t of I.taxons || []) {
  if (t.plan?.regime === 'vegetal' || (seules && !seules.includes(t.id))) continue;
  try {
    const f = Fiche.ecrire(t, I, { style }), nom = String(t.id).replace(/[^a-z0-9._-]/gi, '_');
    fs.writeFileSync(path.join(dossier, nom + '.md'), f.humain);
    fs.writeFileSync(path.join(dossier, nom + '.json'), JSON.stringify(f, null, 1) + '\n');
    index.familles[f.famille] = (index.familles[f.famille] || 0) + 1;
    index.lignees.push({ id: t.id, nom: t.nom, famille: f.famille, regle: f.champs.famille.regle, parent: t.parent ?? null, prompt_2d: f.ia.prompt_2d });
  } catch (e) { mal++; console.error(`✗ ${t.id} : ${e.message}`); }
}
fs.writeFileSync(path.join(dossier, 'index.json'), JSON.stringify(index, null, 1) + '\n');
const ou = path.relative(process.cwd(), dossier);
console.log(`${index.lignees.length} fiches dans ${!ou ? '.' : ou.startsWith('..') ? dossier : ou} : ${Object.entries(index.familles).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).map(([f, n]) => f + ' ' + n).join(', ')}${mal ? ` ; ${mal} en échec` : ''}`);
process.exit(mal ? 1 : 0);
