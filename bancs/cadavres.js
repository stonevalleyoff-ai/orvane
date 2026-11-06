// Orvane — LE BANC DES CADAVRES (bancs/cadavres.js, docs/13)
// Les charognards vivent des morts du lieu (REGLES.cadavres) :
//  1. le jour un : sans la règle (0, par défaut), le moteur tourne exactement comme avant ;
//  2. sur une genèse naissante (ses ancêtres, dont le crabe primitif), quinze cycles : sans la règle, ils broutent et déclinent ;
//     avec elle, ils vivent des morts, croissent, et sont rassasiés à peu près à moitié ;
//  3. ils ne pèsent plus sur les plantes, et leur offre ne vient que des bêtes.
//   node bancs/cadavres.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16), t0 = Date.now();
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const avec = (k, f) => { const av = Orvane.REGLES.cadavres; Orvane.REGLES.cadavres = k; try { return f(); } finally { Orvane.REGLES.cadavres = av; } };

console.log('1. Le jour un');
{ const I0 = require('./monde.js').orvane({ continent: '' }); let A = I0, B = I0;
  for (let k = 0; k < 2; k++) { A = Orvane.cycle(A, {}); B = avec(0, () => Orvane.cycle(B, {})); }
  verif(Orvane.REGLES.cadavres === 0 && empreinte(A) === empreinte(B), 'la règle vaut 0 par défaut, et le monde d\'Orvane tourne deux cycles à l\'identique');
}

console.log('2. Une genèse naissante');
{ const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-cadavres-')), sortie = path.join(dir, 'amorce.json');
  try { execFileSync('node', [racine('moteur/genese.js'), racine('moteur/biomes-universels.json'), '--cycles', '1', '--graine', '2026', '--point', '0', '--sortie', sortie], { stdio: 'ignore' });
    const I0 = (X => { if (X.monde?.regles) delete X.monde.regles.cadavres; return X; })(JSON.parse(fs.readFileSync(sortie, 'utf8'))), det =   // (si la genèse a posé la règle dans le monde : le banc la fait varier lui-même)
      I => I.taxons.filter(t => !t.eteint && t.plan.regime === 'detritivore');
    const N = I => det(I).reduce((a, t) => a + t.populations.reduce((x, p) => x + p.effectif, 0), 0);
    const tourner = k => avec(k, () => { const av = Orvane.REGLES.detritivore_vegetal; Orvane.REGLES.detritivore_vegetal = .5; let I = I0, debut = null;   // (la règle de la genèse 2026)
      try { for (let c = 1; c <= 25; c++) { I = Orvane.cycle(I, {}); if (c === 10) debut = N(I); } } finally { Orvane.REGLES.detritivore_vegetal = av; }
      const s = det(I).flatMap(t => t.populations.map(p => p.satiete)).filter(x => x != null); return { debut, fin: N(I), s: s.length ? s.reduce((a, x) => a + x, 0) / s.length : null, lignees: det(I).length }; });
    const a = tourner(0), b = tourner(.3);
    verif(det(I0).length >= 1 && a.fin < a.debut && b.fin > b.debut && b.s > .3 && b.s < .8,
      `${det(I0).length > 1 ? det(I0).length + ' lignées' : 'une lignée'} de charognards (${det(I0).map(t => t.nom).join(', ')}) ; du cycle 10 au cycle 25, sans la règle, ils broutent et passent de ${fx(a.debut)} à ${fx(a.fin)} bêtes ; avec 30 % des morts du lieu, de ${fx(b.debut)} à ${fx(b.fin)}, rassasiés à ${fx(b.s * 100)} %`);
    verif(a.s == null, 'sans la règle, un charognard n\'a pas de satiété : il broute comme avant');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

console.log('3. Ce qu\'ils mangent');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8');
  verif(/q\.regime !== 'detritivore' && q\.regime !== 'vegetal'/.test(src) && /'detritivore' && REGLES\.cadavres > 0 \? 0/.test(src),
    'leur offre ne vient que des bêtes (ni des plantes, ni d\'eux-mêmes), et un charognard qui vit des morts ne pèse pas sur les plantes');
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
