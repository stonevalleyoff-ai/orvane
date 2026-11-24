// Orvane — LE BANC DES ABLATIONS (bancs/ablations.js) — docs/59, 03
//  1. le plan (etalon/ablations.json) : chaque règle gelée par le protocole (le moratoire), et rien d'autre, avec sa nature et ce que veut
//     dire la retirer ; un retrait ne touche que sa règle, et des clés que le moteur connaît ;
//  2. l'outil (outils/ablations.js), sur la mer : le témoin rend le monde que rend le moteur ; une règle qui tient (les saisons) bouge,
//     une règle comptable ne change rien aux bêtes, une règle déjà retirée n'est pas essayée, une constante s'essaie à deux valeurs ;
//     deux fois, les mêmes mesures ; en parts (plusieurs machines), puis fusionnées : le même rapport.
//   node bancs/ablations.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), PLAN = JSON.parse(fs.readFileSync(racine('etalon/ablations.json'), 'utf8')), PROTOCOLE = JSON.parse(fs.readFileSync(racine('etalon/protocole.json'), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const t0 = Date.now(), objet = v => v && typeof v === 'object' && !Array.isArray(v);

console.log('1. Le plan');
{ const G = PROTOCOLE.regles_gelees.regles, P = Object.keys(PLAN.regles), manque = G.filter(k => !P.includes(k)), plus = P.filter(k => !G.includes(k));
  verif(!manque.length && !plus.length && P.length === Object.keys(Orvane.REGLES).length, `il couvre les ${G.length} règles que gèle le protocole, et rien d'autre${manque.length ? ` (il manque ${manque.join(', ')})` : ''}${plus.length ? ` (en trop : ${plus.join(', ')})` : ''}`);
  const natures = Object.keys(PLAN.natures), compte = Object.fromEntries(natures.map(n => [n, P.filter(k => PLAN.regles[k].nature === n).length]));
  verif(P.every(k => natures.includes(PLAN.regles[k].nature)), `chaque règle a sa nature : ${natures.map(n => `${compte[n]} ${n}`).join(', ')}`);
  // un retrait (ou un essai) ne change que sa règle, et seulement des clés qu'elle a
  const connues = (k, v, b = Orvane.REGLES[k]) => !objet(v) || (objet(b) && Object.entries(v).every(([c, x]) => c in b && connues(null, x, b[c])));
  const mal = P.filter(k => { const R = PLAN.regles[k], L = [...(R.retirer ? [R.retirer] : []), ...(R.essais || [])];
    if (['mecanisme', 'comptable', 'joueurs'].includes(R.nature) && !R.retirer) return true;
    if (R.nature === 'constante' && !(R.facteurs?.length || R.essais?.length)) return true;
    return L.some(o => Object.keys(o).length !== 1 || !(k in o) || !connues(k, o[k])); });
  verif(!mal.length, `chaque retrait ne touche que sa règle, et des clés que le moteur lui connaît${mal.length ? ` (pas : ${mal.join(', ')})` : ''}`);
  verif(Object.keys(PLAN.mesures).every(k => k === 'duree_s' || k in PLAN.lecture.seuils), 'chaque mesure a son seuil de lecture');
}

console.log('\n2. L\'outil, sur la mer');
{ const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ablations-')), f = n => path.join(tmp, n);
  try {
    const lancer = n => { execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--cycles', '3', '--graines', '2', '--regles', 'saisons,menace,recouvrement,besoin', '--jobs', '4', '--sortie', f(n + '.json'), '--notes', f(n + '.md')], { stdio: 'ignore' });
      return JSON.parse(fs.readFileSync(f(n + '.json'), 'utf8')); };
    const A = lancer('a'), B = lancer('b'), E = id => A.essais.find(x => x.essai === id);
    // le témoin : ce que rend le moteur, ici, au bit près dans ses mesures
    let I = JSON.parse(fs.readFileSync(racine('mondes/marin/amorce.json'), 'utf8')); const I0 = JSON.parse(JSON.stringify(I));
    for (let k = 0; k < 3; k++) I = Orvane.cycle(I, {}, { duree_ms: 864e5 });
    const V = I.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique' && t.populations.some(p => p.effectif > 0));
    const T0 = A.temoin.par_graine[String(I0.monde.graine >>> 0)];
    verif(T0 && T0.lignees === V.length && A.graines.length === 2 && A.cycles === 3, `le témoin, à la graine du monde, rend le monde que rend le moteur (${V.length} lignées animales au bout de 3 cycles) ; et une autre graine`);
    verif(E('saisons')?.bouge.length > 0 && /tient/.test(E('saisons').lecture), `une règle qui tient : sans les saisons, ${E('saisons')?.bouge.join(', ')} bouge${E('saisons')?.bouge.length > 1 ? 'nt' : ''} (« ${E('saisons')?.lecture} »)`);
    verif(E('menace') && !E('menace').bouge.length && Object.values(E('menace').ecarts).filter((x, i, L) => Object.keys(E('menace').ecarts)[i] !== 'duree_s').every(x => x === 0), 'une règle comptable (menace) : rien ne change aux bêtes, aucune mesure ne bouge');
    verif(!E('recouvrement') && A.laisses.some(x => x.regle === 'recouvrement' && /déjà retirée/.test(x.pourquoi)), 'une règle déjà retirée dans ce monde (le recouvrement des quêtes) n\'est pas essayée, et le rapport le dit');
    verif(E('besoin ×0.5') && E('besoin ×2') && E('besoin ×2').regles.besoin === +(Orvane.contexte(I0).R.besoin * 2).toPrecision(6), 'une constante (la ration) s\'essaie à deux valeurs, la moitié et le double de celle du monde');
    const sans = R => JSON.stringify(R.essais.map(x => ({ e: x.essai, m: Object.fromEntries(Object.entries(x.par_graine).map(([g, m]) => [g, { ...m, duree_s: 0 }])) })));
    verif(sans(A) === sans(B) && A.plan.empreinte === B.plan.empreinte && /\| saisons \|/.test(fs.readFileSync(f('a.md'), 'utf8')), 'deux fois, les mêmes mesures (les durées mises à part) ; le rapport dit l\'empreinte du plan ; ses notes, en un tableau');
    // (en parts, sur plusieurs machines : le témoin et un essai sur deux chacune, puis la fusion)
    for (const k of [1, 2]) execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--cycles', '3', '--graines', '2', '--regles', 'saisons,menace,recouvrement,besoin', '--jobs', '2', '--part', `${k}/2`, '--sortie', f(`p${k}.json`), '--notes', f(`p${k}.md`)], { stdio: 'ignore' });
    execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('p1.json'), f('p2.json'), '--sortie', f('fu.json'), '--notes', f('fu.md')], { stdio: 'ignore' });
    const F = JSON.parse(fs.readFileSync(f('fu.json'), 'utf8')), P1 = JSON.parse(fs.readFileSync(f('p1.json'), 'utf8'));
    verif(sans(F) === sans(A) && F.parts === 2 && P1.essais.length < A.essais.length && F.laisses.length === A.laisses.length, `en deux parts (${P1.essais.length} essais dans la première), puis fusionnées : le même rapport qu'en une fois`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

console.log(`\n${ok ? 'le banc des ablations tient' : 'LE BANC DES ABLATIONS NE TIENT PAS'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
