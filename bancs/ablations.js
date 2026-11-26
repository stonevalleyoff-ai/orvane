// Orvane — LE BANC DES ABLATIONS (bancs/ablations.js) — docs/59, 03
//  1. le plan (etalon/ablations.json) : chaque règle gelée par le protocole (le moratoire), et rien d'autre, avec sa nature et ce que veut
//     dire la retirer ; un retrait ne touche que sa règle, et des clés que le moteur connaît ; la matrice (etalon/matrice.json) ne parle
//     que des règles du plan, chacune avec l'une des quatre décisions, sa date et sa raison ;
//  2. l'outil (outils/ablations.js), sur la mer : le témoin rend le monde que rend le moteur ; une règle qui tient (les saisons) bouge,
//     une règle comptable ne change rien aux bêtes, une règle déjà retirée n'est pas essayée, une constante s'essaie à deux valeurs ;
//     deux fois, les mêmes mesures ; en parts (plusieurs machines), puis fusionnées : le même rapport ;
//  3. les paires (plan, version 3) : choisies par la règle du plan (les mécanismes qui tiennent seuls), ou dites ; une règle qui ne fait que
//     compter, retirée avec une autre, laisse celle-ci seule (une interaction nulle) ; en parts puis fusionnées, les mêmes paires ; une part
//     ou un rapport de paires, refusés ; la lecture, sur des nombres dits : elles se tempèrent, se renforcent, n'agissent qu'ensemble ;
//  4. les formes et les jalons (plan, version 4) : la variété des formes, celle du monde que rend le moteur ; un essai lu en chemin rend à
//     chaque jalon ce que rendrait un essai qui s'arrête là, et à sa fin ce que rend le même essai sans jalons ; en parts puis fusionnées,
//     la même lecture en chemin ; un rapport d'essais seuls d'avant (sans les formes) sert encore aux paires ; des jalons mal dits, refusés ;
//  5. la reprise : un rapport qui a perdu des tâches (une machine à court de mémoire), repris, rend le rapport entier, les tâches gardées
//     telles quelles ; une reprise d'une autre passe ou d'un autre moteur, refusée ; la mémoire d'une tâche, plafonnée, rend les mêmes mesures ;
//     un essai que la machine a arrêté se dit « à relancer », un témoin qui a perdu une graine aussi.
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
  // la matrice (docs/59, 03) : les décisions de l'auteur, règle par règle, et seulement sur les règles du plan
  const MAT = JSON.parse(fs.readFileSync(racine('etalon/matrice.json'), 'utf8')), D = Object.entries(MAT.regles || {});
  const malD = D.filter(([k, d]) => !P.includes(k) || !MAT.decisions.includes(d.decision) || !/^\d{4}-\d\d-\d\d$/.test(d.date || '') || !d.pourquoi).map(([k]) => k);
  verif(MAT.decisions?.join() === 'conserver,modifier,supprimer,investiguer' && D.length && !malD.length,
    `la matrice ne dit que des règles du plan, chacune avec l'une des quatre décisions, sa date et sa raison : ${(MAT.decisions || []).map(x => [x, D.filter(([, d]) => d.decision === x).length]).filter(([, n]) => n).map(([x, n]) => `${n} à ${x}`).join(', ')} (${D.length} règles sur ${P.length})${malD.length ? ` (pas : ${malD.join(', ')})` : ''}`);
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
    verif(JSON.stringify(A.regles_choisies) === JSON.stringify(['besoin', 'menace', 'recouvrement', 'saisons']) && /Seules les règles dites/.test(fs.readFileSync(f('a.md'), 'utf8')), 'un rapport fait sur quelques règles (--regles) le dit, et ses notes');
    // (en parts, sur plusieurs machines : le témoin et un essai sur deux chacune, puis la fusion)
    for (const k of [1, 2]) execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--cycles', '3', '--graines', '2', '--regles', 'saisons,menace,recouvrement,besoin', '--jobs', '2', '--part', `${k}/2`, '--sortie', f(`p${k}.json`), '--notes', f(`p${k}.md`)], { stdio: 'ignore' });
    execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('p1.json'), f('p2.json'), '--sortie', f('fu.json'), '--notes', f('fu.md')], { stdio: 'ignore' });
    const F = JSON.parse(fs.readFileSync(f('fu.json'), 'utf8')), P1 = JSON.parse(fs.readFileSync(f('p1.json'), 'utf8'));
    verif(sans(F) === sans(A) && F.parts === 2 && P1.essais.length < A.essais.length && F.laisses.length === A.laisses.length, `en deux parts (${P1.essais.length} essais dans la première), puis fusionnées : le même rapport qu'en une fois`);
    console.log('\n3. Les paires');
    const paires = (n, ...plus) => { execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--paires', f('a.json'), '--jobs', '4', '--sortie', f(n + '.json'), ...plus], { stdio: 'ignore' });
      return JSON.parse(fs.readFileSync(f(n + '.json'), 'utf8')); };
    const D = paires('defaut'), choix = A.essais.filter(x => x.nature === 'mecanisme' && x.bouge.length).map(x => x.essai);
    verif(D.type === 'paires' && D.essais.length === choix.length * (choix.length - 1) / 2 && D.cycles === A.cycles && JSON.stringify(D.graines) === JSON.stringify(A.graines),
      `par la règle du plan : les mécanismes qui tiennent seuls (${choix.join(', ') || 'aucun'}), deux à deux (${D.essais.length} paire${D.essais.length > 1 ? 's' : ''}), sur les cycles et les graines des essais seuls`);
    const X = paires('dites', '--paires-de', 'saisons,menace,besoin ×2'), ms = X.essais.find(x => x.paire.includes('saisons') && x.paire.includes('menace')), s1 = A.essais.find(x => x.essai === 'saisons');
    verif(X.essais.length === 3 && ms && Object.values(ms.interaction).every(v => v === 0) && Object.keys(ms.mesures).filter(k => k !== 'duree_s').every(k => ms.mesures[k] === s1.mesures[k]) && /chacune pour soi/.test(ms.lecture),
      'des paires dites : les saisons et une règle qui ne fait que compter (menace), ensemble, rendent le monde des saisons seules : une interaction nulle, « chacune pour soi »');
    for (const k of [1, 2]) paires(`pp${k}`, '--paires-de', 'saisons,menace,besoin ×2', '--part', `${k}/2`);
    execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('pp1.json'), f('pp2.json'), '--sortie', f('ppf.json')], { stdio: 'ignore' });
    const PF = JSON.parse(fs.readFileSync(f('ppf.json'), 'utf8')), cle = R => JSON.stringify(R.essais.map(x => ({ e: x.essai, i: x.interaction, l: x.lecture })).sort((x, y) => x.e < y.e ? -1 : 1));
    verif(PF.type === 'paires' && cle(PF) === cle(X), 'en deux parts, puis fusionnées : les mêmes paires, la même lecture');
    const refus = F => { try { execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--paires', F, '--sortie', f('refus.json')], { stdio: 'ignore' }); return 0; } catch (e) { return e.status; } };
    verif(refus(f('p1.json')) === 2 && refus(f('dites.json')) === 2 && !fs.existsSync(f('refus.json')), 'une part des essais seuls, un rapport de paires : refusés (les paires se choisissent dans le rapport entier des essais seuls)');
    // (la lecture, sur des nombres dits : les paires dites, relues par la fusion, leurs essais seuls et leurs mesures changés à la main)
    const Tg = X.temoin.par_graine, zero = Object.fromEntries(Object.keys(X.temoin.moyenne).map(k => [k, 0])), seul = (d, bouge) => ({ ecarts: { ...zero, ...d }, mesures: X.temoin.moyenne, bouge });
    const plus = d => Object.fromEntries(Object.entries(Tg).map(([g, m]) => [g, { ...m, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, m[k] + v])) }]));
    const de = (R, a, b) => R.essais.find(x => x.paire.includes(a) && x.paire.includes(b)), sm = de(X, 'saisons', 'menace'), sb = de(X, 'saisons', 'besoin ×2');
    fs.writeFileSync(f('dits.json'), JSON.stringify({ ...X, simples: { saisons: seul({ shannon: -0.5 }, ['shannon']), menace: seul({}, []), 'besoin ×2': seul({}, []) },
      essais: X.essais.map(e => ({ ...e, par_graine: plus(e === sm ? { shannon: 0.5 } : e === sb ? { shannon: -1.5 } : { lignees: 100 }) })) }));
    execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('dits.json'), '--sortie', f('lus.json')], { stdio: 'ignore' });
    const LU = JSON.parse(fs.readFileSync(f('lus.json'), 'utf8')), lu = (a, b) => de(LU, a, b).lecture;
    verif(lu('saisons', 'menace') === 'elles se répondent : shannon se tempère' && lu('saisons', 'besoin ×2') === 'elles se répondent : shannon se renforce' && lu('menace', 'besoin ×2') === 'elles se répondent : lignees n\'agit qu\'ensemble',
      'la lecture, sur des nombres dits : contre la somme des seules, elles se tempèrent, se renforcent ; sans effet seules, elles n\'agissent qu\'ensemble');
    console.log('\n4. Les formes et les jalons (plan, version 4)');
    // la variété des formes du témoin : celle des lignées du monde que rend le moteur (le nombre effectif de leurs phénotypes, 1 / Σ f²)
    const fo = V.map(t => { const s = t.phenotypes.reduce((a, p) => a + (p.frequence || 0) ** 2, 0); return s > 0 ? 1 / s : 1; }), formes = +(fo.reduce((a, x) => a + x, 0) / fo.length).toFixed(4);
    verif(T0.formes === formes && A.essais.every(x => x.mesures.formes != null) && E('menace').ecarts.formes === 0,
      `la variété des formes : celle du monde que rend le moteur (${formes.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} phénotypes effectifs par lignée), pour chaque essai ; une règle comptable n'y change rien`);
    const run = (n, ...plus) => { execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--graines', '2', '--regles', 'saisons,menace', '--jobs', '4', '--sortie', f(n + '.json'), '--notes', f(n + '.md'), ...plus], { stdio: 'ignore' });
      return JSON.parse(fs.readFileSync(f(n + '.json'), 'utf8')); };
    const sd = m => m && JSON.stringify({ ...m, duree_s: 0 }), memes = (X, Y) => Object.keys(Y).length > 0 && Object.keys(Y).every(g => sd(X?.[g]) === sd(Y[g]));
    const J1 = run('j1', '--cycles', '3', '--jalons', '1'), C2 = run('c2', '--cycles', '2'), fin = A.essais.filter(x => ['saisons', 'menace'].includes(x.essai));
    verif(JSON.stringify(J1.jalons?.cycles) === '[1,2]' && memes(J1.jalons.temoin[2], C2.temoin.par_graine) && C2.essais.every(x => memes(J1.jalons.essais[x.essai][2], x.par_graine))
      && memes(J1.temoin.par_graine, A.temoin.par_graine) && fin.length === 2 && fin.every(x => memes(J1.essais.find(y => y.essai === x.essai)?.par_graine, x.par_graine)),
      'un essai lu à chaque cycle : au cycle 2, ce que rend un essai de deux cycles, au bit près ; à sa fin, ce que rend le même essai sans jalons');
    const sJ = C2.essais.find(x => x.essai === 'saisons');
    verif(J1.jalons.lus[2].essais.saisons.ecarts.biomasse_t === sJ.ecarts.biomasse_t && JSON.stringify(J1.jalons.lus[2].essais.saisons.bouge) === JSON.stringify(sJ.bouge) && /### En chemin, à chaque cycle/.test(fs.readFileSync(f('j1.md'), 'utf8')),
      `sa lecture en chemin, celle de l'essai de deux cycles (sans les saisons, au cycle 2 : ${sJ.bouge.join(', ') || 'rien'}) ; ses notes, un tableau du témoin et des écarts au fil des cycles`);
    for (const k of [1, 2]) run(`jp${k}`, '--cycles', '3', '--jalons', '1', '--part', `${k}/2`);
    execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('jp1.json'), f('jp2.json'), '--sortie', f('jpf.json')], { stdio: 'ignore' });
    const JF = JSON.parse(fs.readFileSync(f('jpf.json'), 'utf8')), sl = R => JSON.stringify(R.jalons?.lus ?? null, (k, v) => k === 'duree_s' ? undefined : v);
    verif(JF.jalons && JF.parts === 2 && sl(JF) === sl(J1), 'en deux parts, puis fusionnées : la même lecture en chemin');
    // un rapport d'essais seuls d'avant le plan 4 (sans les formes) sert encore aux paires : le témoin s'y compare sur les mesures qu'il a
    const vieux = JSON.parse(fs.readFileSync(f('a.json'), 'utf8')), sansF = m => { if (!m) return m; const { formes: _, ...x } = m; return x; };
    for (const g in vieux.temoin.par_graine) vieux.temoin.par_graine[g] = sansF(vieux.temoin.par_graine[g]);
    for (const x of vieux.essais) { for (const g in x.par_graine) x.par_graine[g] = sansF(x.par_graine[g]); x.ecarts = sansF(x.ecarts); x.mesures = sansF(x.mesures); }
    vieux.temoin.moyenne = sansF(vieux.temoin.moyenne); vieux.temoin.ecart = sansF(vieux.temoin.ecart); fs.writeFileSync(f('vieux.json'), JSON.stringify(vieux));
    execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), '--paires', f('vieux.json'), '--paires-de', 'saisons,besoin ×2', '--jobs', '4', '--sortie', f('pv.json')], { stdio: 'ignore' });
    const PV = JSON.parse(fs.readFileSync(f('pv.json'), 'utf8'));
    verif(PV.type === 'paires' && PV.essais.length === 1 && !('formes' in PV.essais[0].interaction) && 'lignees' in PV.essais[0].interaction,
      'un rapport d\'essais seuls d\'avant le plan 4, sans les formes, sert encore aux paires (le témoin s\'y compare sur les mesures qu\'il a)');
    const code = (...x) => { try { execFileSync(process.execPath, [racine('outils/ablations.js'), racine('mondes/marin/amorce.json'), ...x], { stdio: 'ignore' }); return 0; } catch (e) { return e.status; } };
    verif(code('--paires', f('a.json'), '--jalons', '1', '--sortie', f('rj.json')) === 2 && code('--cycles', '3', '--jalons', '0', '--sortie', f('rj.json')) === 2 && !fs.existsSync(f('rj.json')),
      'des jalons pour des paires, ou tous les zéro cycles : refusés');
    console.log('\n5. La reprise : les tâches perdues d\'un rapport, relancées');
    // (le rapport lu à chaque cycle, qui aurait perdu deux tâches sur six : le témoin d'une graine, les saisons d'une autre)
    const [g1, g2] = J1.graines.map(String), perdu = JSON.parse(JSON.stringify(J1)), sp = perdu.essais.find(x => x.essai === 'saisons');
    perdu.temoin.par_graine[g2] = null; sp.par_graine[g1] = null; sp.erreurs = [{ graine: +g1, erreur: 'tuée' }];
    for (const c of perdu.jalons.cycles) { perdu.jalons.temoin[c][g2] = null; perdu.jalons.essais.saisons[c][g1] = null; }
    fs.writeFileSync(f('perdu.json'), JSON.stringify(perdu));
    const RP = run('repris', '--cycles', '3', '--jalons', '1', '--reprendre', f('perdu.json'), '--memoire-tache', '512');
    const pg = R => JSON.stringify([R.temoin.par_graine, ...R.essais.map(x => [x.essai, x.par_graine])], (k, v) => k === 'duree_s' ? undefined : v);
    verif(pg(RP) === pg(J1) && sl(RP) === sl(J1) && RP.essais.every(x => !x.erreurs) && RP.reprises?.length === 1 && RP.reprises[0].taches === 4 && RP.reprises[0].relancees === 2
      && RP.temoin.par_graine[g1].duree_s === J1.temoin.par_graine[g1].duree_s && RP.machine.memoire_tache_mo === 512 && /Repris du rapport/.test(fs.readFileSync(f('repris.md'), 'utf8')),
      'un rapport qui a perdu deux tâches sur six, repris (512 Mo par tâche) : les quatre autres gardées telles quelles, les deux relancées ; le rapport entier, au bit près, en chemin comme à la fin (les durées mises à part) ; ses notes le disent');
    const mo = (n, m) => { const X = JSON.parse(JSON.stringify(perdu)); X.moteur = m; fs.writeFileSync(f(n), JSON.stringify(X)); return f(n); };
    const rp = (...x) => code('--graines', '2', '--regles', 'saisons,menace', '--jalons', '1', '--sortie', f('rr.json'), ...x);
    verif(rp('--cycles', '2', '--reprendre', f('perdu.json')) === 2 && code('--graines', '2', '--regles', 'saisons', '--cycles', '3', '--jalons', '1', '--reprendre', f('perdu.json'), '--sortie', f('rr.json')) === 2
      && rp('--cycles', '3', '--reprendre', mo('autre.json', { ...perdu.moteur, code: 'un autre code' })) === 2
      && rp('--cycles', '3', '--reprendre', mo('main.json', { commit: perdu.moteur.commit, modifie: true })) === 2
      && code('--cycles', '3', '--memoire-tache', '100', '--sortie', f('rr.json')) === 2 && !fs.existsSync(f('rr.json')),
      'une reprise d\'une autre passe (d\'autres cycles, d\'autres essais), d\'un autre code, ou d\'un moteur changé à la main qui ne dit pas son code : refusée ; une tâche à 100 Mo aussi');
    // (la lecture d'un rapport qui a perdu des tâches : celle que la machine a arrêtée — un signal — n'est pas une règle qui casse le monde)
    const ar = JSON.parse(JSON.stringify(perdu)); ar.essais.find(x => x.essai === 'saisons').erreurs = [{ graine: +g1, erreur: 'arrêtée par la machine (SIGKILL)', arretee: true }];
    fs.writeFileSync(f('arretee.json'), JSON.stringify(ar)); let cAr = 0;
    try { execFileSync(process.execPath, [racine('outils/ablations.js'), '--fusionner', f('arretee.json'), '--sortie', f('lu-ar.json'), '--notes', f('lu-ar.md')], { stdio: 'ignore' }); } catch (e) { cAr = e.status; }
    const LA = JSON.parse(fs.readFileSync(f('lu-ar.json'), 'utf8')), LP = LA.essais.find(x => x.essai === 'saisons');
    verif(cAr === 1 && /^à relancer/.test(LP.lecture) && /Le témoin a perdu 1 graine sur 2 : le rapport ne se lit pas avant de la relancer/.test(fs.readFileSync(f('lu-ar.md'), 'utf8')),
      `un rapport qui a perdu des tâches le dit : un essai que la machine a arrêté, « ${LP.lecture} » ; un témoin qui a perdu une graine, à relancer avant de le lire`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

console.log(`\n${ok ? 'le banc des ablations tient' : 'LE BANC DES ABLATIONS NE TIENT PAS'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
