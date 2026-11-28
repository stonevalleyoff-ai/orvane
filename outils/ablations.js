// Orvane — LES ABLATIONS (outils/ablations.js) — docs/59, 03
// Ce que vaut chaque règle du moteur, dans un monde : on la retire seule (la valeur qui éteint ce qu'elle fait, etalon/ablations.json), sur
// une copie du monde, et l'on fait tourner autant de cycles, sur les mêmes graines, que le témoin (le monde tel qu'il est). Une constante de
// structure, sans valeur qui l'éteigne, s'essaie à deux autres valeurs. Chaque essai tourne dans son processus.
// Ce qu'on mesure à la fin : les lignées animales vivantes et les carnivores, la biomasse, la diversité (Shannon), la part des lignées
// stables, les extinctions, les lignées nées, la variété des formes de chaque lignée, l'écart de ses traits continus à son plan, son aire (le
// nombre de lieux où elle vit) ; et la durée d'un cycle. Une mesure bouge quand
// l'écart au témoin passe le double de l'écart entre les graines du témoin, et un seuil (la lecture du plan) : une indication, pas un
// verdict — la matrice est une décision de l'auteur. Un essai long se lit aussi en chemin (--jalons n : tous les n cycles). Les tâches
// qu'un rapport a perdues (une machine à court de mémoire…) se relancent seules (--reprendre), sur le même moteur. --regles dit des
// règles, ou un seul des essais d'une constante (« max_phenotypes = 10 » : à cette valeur seulement).
//   node outils/ablations.js <etat.json> [--cycles 30] [--graines 3] [--regles a,b,c] [--natures mecanisme,constante,comptable]
//     [--jobs 4] [--jalons n] [--memoire-tache 6000] [--reprendre rapport.json] [--plan etalon/ablations.json] [--sortie rapport.json] [--notes rapport.md]
// Sortie : 0 si chaque essai a tourné, 1 sinon. Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { spawn, execFileSync } = require('child_process');
const racine = path.join(__dirname, '..'), Orvane = require(path.join(racine, 'moteur/orvane.js')), Journal = require(path.join(racine, 'hebergement/journal.js'));
const { SAISONS } = require(path.join(racine, 'moteur/noyau/plan.js'));
const saisonDu = (n, annee) => annee ? SAISONS[Math.floor((((n % annee) / annee + .125) % 1) * 4)] : null;   // (la saison du cycle n, comme le moteur la nomme)
const lireJ = f => JSON.parse(fs.readFileSync(f, 'utf8')), somme = L => L.reduce((s, x) => s + x, 0), r = (x, d = 4) => x == null || !Number.isFinite(x) ? null : +x.toFixed(d);
const objet = v => v && typeof v === 'object' && !Array.isArray(v);
// (une valeur de règle complétée en profondeur : celle du monde, et ce qu'on y change)
const fusion = (a, b) => objet(a) && objet(b) ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, k in b ? fusion(a[k], b[k]) : a[k]])) : b;
const pareil = (a, b) => JSON.stringify(Journal.stable(a ?? null)) === JSON.stringify(Journal.stable(b ?? null));
// (le code de ce que le cycle exécute — le moteur, le tampon, l'hébergement : chaque fichier et son contenu —, en une empreinte)
const codeMoteur = () => { const h = crypto.createHash('sha256');
  for (const d of ['moteur', 'tampon', 'hebergement']) for (const f of fs.readdirSync(path.join(racine, d), { recursive: true }).map(String).sort()) {
    const p = path.join(racine, d, f); if (fs.statSync(p).isFile()) h.update(`${d}/${f.split(path.sep).join('/')}\0`).update(fs.readFileSync(p)).update('\0'); }
  return h.digest('hex'); };

// --- ce qu'est un monde, à un moment : ses lignées animales vivantes, et ce qu'on en mesure ---
const animal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique';
const effectif = t => somme((t.populations || []).map(p => p.effectif || 0));
const vivantes = I => I.taxons.filter(t => !t.eteint && animal(t) && effectif(t) > 0);
function mesurer(I0, I, secondes) {
  const V = vivantes(I), m = t => t.plan?.masse_kg || 1, depart = new Map(vivantes(I0).map(t => [t.id, effectif(t)])), fin = new Map(V.map(t => [t.id, effectif(t)]));
  const L = new Map(); for (const t of V) for (const p of t.populations) if (p.effectif > 0) (L.get(p.biome) || L.set(p.biome, []).get(p.biome)).push(p.effectif * m(t));
  let H = 0; for (const B of L.values()) { const S = somme(B); for (const b of B) { const q = b / S; if (q > 0) H -= q * Math.log(q); } }
  let stables = 0, eteintes = 0; for (const [id, x] of depart) { const y = fin.get(id) || 0; if (y <= 0) eteintes++; else if (Math.max(x / y, y / x) <= 2) stables++; }
  // (plan, version 4 : la variété des formes d'une lignée, le nombre effectif de ses phénotypes, 1 / Σ f²)
  const formes = V.map(t => { const s = somme((t.phenotypes || []).map(p => (p.frequence || 0) ** 2)); return s > 0 ? 1 / s : 1; });
  // (plan, version 8 : ce que la génétique continue fait aux traits — l'écart de chaque population au plan de sa lignée, |m| en écarts-types
  //  naturels, une population sans traits continus étant à son plan ; pondéré par l'effectif dans chaque lignée, trait par trait, puis en
  //  moyenne sur les lignées et sur les traits. Et l'aire de chaque lignée : le nombre de lieux où elle vit)
  const QK = Object.keys(Orvane.QUANT || {}), vit = t => t.populations.filter(p => p.effectif > 0);
  const parTrait = Object.fromEntries(QK.map(k => [k, V.length ? somme(V.map(t => somme(vit(t).map(p => p.effectif * Math.abs(p.quant?.[k]?.m ?? 0))) / effectif(t))) / V.length : null]));
  return { lignees: V.length, predateurs: V.filter(t => t.plan?.regime === 'carnivore').length, biomasse_t: r(somme(V.map(t => effectif(t) * m(t))) / 1000, 3),
    shannon: L.size ? r(H / L.size) : null, stables: depart.size ? r(stables / depart.size) : null, eteintes, nees: V.filter(t => t.apparu > I0.cycle.n).length,
    formes: V.length ? r(somme(formes) / V.length) : null, traits: V.length && QK.length ? r(somme(QK.map(k => parTrait[k])) / QK.length, 5) : null,
    traits_par: Object.fromEntries(QK.map(k => [k, parTrait[k] == null ? null : r(parTrait[k], 5)])), aires: V.length ? r(somme(V.map(t => vit(t).length)) / V.length, 3) : null,
    duree_s: r(secondes, 2) };
}

// --- un essai, dans son processus : le monde, ses règles changées, une graine, des cycles ---
if (process.argv[2] === '--essai') {
  const E = JSON.parse(process.argv[3]), I0 = lireJ(E.monde); let I = JSON.parse(JSON.stringify(I0));
  I.monde = { ...I.monde, graine: E.graine, regles: { ...(I.monde.regles || {}), ...(E.regles || {}) } };
  const t0 = process.hrtime.bigint(), s = k => Number(process.hrtime.bigint() - t0) / 1e9 / k, J = E.jalons > 0 ? {} : null;   // (les jalons : en chemin, tous les n cycles)
  for (let k = 0; k < E.cycles; k++) { I = Orvane.cycle(I, {}, { duree_ms: 864e5 }); if (J && (k + 1) % E.jalons === 0 && k + 1 < E.cycles) J[k + 1] = mesurer(I0, I, s(k + 1)); }
  process.stdout.write(JSON.stringify({ ...mesurer(I0, I, s(E.cycles)), ...(J ? { jalons: J } : {}) }));
  process.exit(0);
}

const a = process.argv.slice(2), OPTS = ['--cycles', '--graines', '--regles', '--natures', '--jobs', '--plan', '--sortie', '--notes', '--part', '--paires', '--paires-de', '--jalons', '--reprendre', '--memoire-tache'];
const arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const fPlan = arg('--plan', path.join(racine, 'etalon/ablations.json')), PLAN = lireJ(fPlan), empreintePlan = crypto.createHash('sha256').update(Journal.stable(PLAN)).digest('hex');
const moy = L => L.length ? somme(L) / L.length : null;

// --- la lecture : par essai, la moyenne de chaque mesure sur les graines, contre le témoin et l'écart entre ses graines ---
// bruts : [{ essai, regle, nature, fait, quand, regles, par_graine: { graine: mesures | null }, erreurs, temoin_duree_s }] ; T : le témoin, par graine
function lire(bruts, T, cycles) {
  const CLES = Object.keys(PLAN.mesures).filter(k => k !== 'duree_s'), S = PLAN.lecture.seuils, REL = new Set(PLAN.lecture.relatives || []);
  const Tm = Object.values(T).filter(Boolean), temoin = { par_graine: T, moyenne: {}, ecart: {} };
  for (const k of [...CLES, 'duree_s']) { const v = Tm.map(m => m[k]).filter(x => x != null); temoin.moyenne[k] = r(moy(v)); temoin.ecart[k] = v.length ? r(Math.max(...v) - Math.min(...v)) : null; }
  const BRUIT_DUREE = temoin.moyenne.duree_s > 0 ? (temoin.ecart.duree_s || 0) / temoin.moyenne.duree_s : 0;
  const essais = bruts.map(e => {
    const base = { essai: e.essai, regle: e.regle, nature: e.nature, ...(e.paire ? { paire: e.paire } : {}), fait: e.fait, quand: e.quand, regles: e.regles, temoin_duree_s: e.temoin_duree_s }, M = Object.values(e.par_graine).filter(Boolean);
    // (une tâche que la machine a arrêtée — à court de mémoire… — n'est pas une règle qui casse le monde : elle se relance, --reprendre)
    if (e.erreurs?.length) return { ...base, par_graine: e.par_graine, erreurs: e.erreurs, lecture: e.erreurs.every(x => x.arretee) ? 'à relancer : la machine a arrêté sa tâche (--reprendre)' : 'investiguer : le monde ne tourne plus sans elle' };
    const mesures = {}, ecarts = {}, bouge = [];
    for (const k of [...CLES, 'duree_s']) { const v = M.map(m => m[k]).filter(x => x != null); mesures[k] = r(moy(v)); ecarts[k] = mesures[k] != null && temoin.moyenne[k] != null ? r(mesures[k] - temoin.moyenne[k]) : null; }
    // (un compte de lignées : aussi le bruit de Poisson des événements dont il dépend, les naissances et les extinctions — plan, version 2)
    const lambda = (X, ev) => Math.max(.5, somme(ev.map(c => X[c] ?? 0))), ng = Math.max(1, M.length);
    for (const k of CLES) { const d = ecarts[k], t = temoin.moyenne[k]; if (d == null) continue;
      const ev = PLAN.lecture.comptes?.[k], poisson = ev ? 2 * Math.sqrt((lambda(temoin.moyenne, ev) + lambda(mesures, ev)) / ng) : 0;
      const bruit = Math.max(2 * (temoin.ecart[k] || 0), poisson), seuil = REL.has(k) ? S[k] * Math.abs(t || 0) : S[k]; if (Math.abs(d) > Math.max(bruit, seuil ?? 0)) bouge.push(k); }
    // (ce que la règle coûte : la part du cycle qu'on gagne sans elle, contre le témoin de la même machine ; lue seulement au-delà du bruit
    //  des durées, que dit l'écart entre les graines du témoin, et de 10 % : plusieurs essais à la fois se disputent la machine)
    const td = e.temoin_duree_s ?? temoin.moyenne.duree_s, cout = td > 0 && mesures.duree_s != null ? r((td - mesures.duree_s) / td, 3) : null;
    const cout_lu = cout != null && Math.abs(cout) > Math.max(.1, 2 * BRUIT_DUREE) ? cout : null;
    const v = bouge.join(', '), pl = bouge.length > 1 ? 'nt' : '';
    const lecture = e.nature === 'comptable' ? (bouge.length ? `investiguer : une règle qui ne fait que compter change le monde (${v})` : 'rien ne change aux bêtes, comme attendu')
      : e.nature === 'constante' ? (bouge.length ? `elle compte : à cette valeur, ${v} bouge${pl}` : `rien de mesurable à cette valeur en ${cycles} cycles`)
      : bouge.length ? `elle tient : sans elle, ${v} bouge${pl}` : `rien de mesurable en ${cycles} cycles (${e.quand})`;
    return { ...base, mesures, ecarts, bouge, cout, cout_lu, par_graine: e.par_graine, lecture };
  });
  return { temoin, essais };
}
// --- les paires (plan, version 3) : l'interaction de deux règles, l'écart de la paire au témoin moins la somme des écarts de chacune seule ---
// simples : { essai: { ecarts, mesures, bouge } }, les essais seuls (du rapport du même monde, sur le même témoin)
function interactions(L, simples) {
  const CLES = Object.keys(PLAN.mesures).filter(k => k !== 'duree_s'), S = PLAN.lecture.seuils, REL = new Set(PLAN.lecture.relatives || []), Q = PLAN.paires?.seuil_interaction ?? 4;
  const T = L.temoin, ng = Math.max(1, Object.values(T.par_graine).filter(Boolean).length);
  const lambda = (X, ev) => Math.max(.5, somme(ev.map(c => X?.[c] ?? 0)));
  L.essais = L.essais.map(e => { if (!e.paire || e.erreurs) return e; const [A, B] = e.paire.map(x => simples[x]); const inter = {}, joue = [];
    for (const k of CLES) { if (e.ecarts[k] == null || A?.ecarts?.[k] == null || B?.ecarts?.[k] == null) continue;
      inter[k] = r(e.ecarts[k] - A.ecarts[k] - B.ecarts[k]);
      const ev = PLAN.lecture.comptes?.[k], poisson = ev ? 2 * Math.sqrt((lambda(T.moyenne, ev) + lambda(e.mesures, ev) + lambda(A.mesures, ev) + lambda(B.mesures, ev)) / ng) : 0;
      const seuil = REL.has(k) ? S[k] * Math.abs(T.moyenne[k] || 0) : S[k];
      if (Math.abs(inter[k]) > Math.max(Q * (T.ecart[k] || 0), poisson, seuil ?? 0)) joue.push(k); }
    // (le sens : une interaction du signe de la somme les renforce, du signe contraire les tempère ; sans effet seules — ni l'une ni l'autre
    //  ne bouge la mesure, à la lecture des essais seuls —, elles n'agissent qu'ensemble)
    const sens = joue.map(k => { const sum = (A.ecarts[k] || 0) + (B.ecarts[k] || 0), x = inter[k], seules = A.bouge?.includes(k) || B.bouge?.includes(k);
      return `${k} ${!seules || Math.abs(sum) < 1e-9 ? 'n\'agit qu\'ensemble' : Math.sign(x) === Math.sign(sum) ? 'se renforce' : 'se tempère'}`; });
    return { ...e, interaction: inter, joue, lecture: joue.length ? `elles se répondent : ${sens.join(', ')}` : 'chacune pour soi : ensemble, elles font la somme de ce qu\'elles font seules' }; });
  return L;
}
// --- les jalons (plan, version 4) : un essai long lu en chemin, à chaque jalon contre le témoin au même cycle, par la même lecture ---
// J : { pas, cycles, annee, temoin: { cycle: { graine: mesures } }, essais: { essai: { cycle: { graine: mesures } } } } ; bruts : les essais
function lireJalons(J, bruts) {
  return Object.fromEntries(J.cycles.map(c => { const L = lire(bruts.map(e => ({ ...e, temoin_duree_s: null, par_graine: J.essais[e.essai]?.[c] || {} })), J.temoin[c], c);
    return [c, { temoin: { moyenne: L.temoin.moyenne, ecart: L.temoin.ecart }, essais: Object.fromEntries(L.essais.filter(x => !x.erreurs).map(x => [x.essai, { mesures: x.mesures, ecarts: x.ecarts, bouge: x.bouge }])) }]; }));
}
const ecrire = R0 => {
  const { temoin, essais: rapport, laisses } = R0, NG = R0.graines.length;
  const fx = (x, d = 2) => x == null ? '–' : (x > 0 ? '+' : '') + (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), nb = (x, d) => x == null ? '–' : (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
  const PAI = R0.type === 'paires', S1 = R0.simples || {}, seules = (x, k) => { if (!x.paire) return null; const u = S1[x.paire[0]]?.ecarts?.[k], v = S1[x.paire[1]]?.ecarts?.[k]; return u == null && v == null ? null : (u ?? 0) + (v ?? 0); };
  // (une mesure relative — la biomasse, les formes — se dit en part de celle du témoin ; une mesure qu'un rapport n'a pas : –)
  const REL = new Set(PLAN.lecture.relatives || []), pc = (k, T) => REL.has(k) && T.moyenne[k] ? 100 / T.moyenne[k] : 1, u = k => REL.has(k) ? ' %' : '';
  const cel = (x, k, d) => { if (x.ecarts?.[k] == null) return '–'; const v = pc(k, temoin), s = PAI ? seules(x, k) : null;
    return `${fx(x.ecarts[k] * v, d)}${u(k)}${PAI ? ` (${s == null ? '–' : fx(s * v, d) + u(k)})` : ''}`; };
  const J = R0.jalons, pts = J ? [...J.cycles, R0.cycles] : [], lu = c => c === R0.cycles ? { temoin, essais: Object.fromEntries(rapport.map(x => [x.essai, x])) } : J.lus[c];
  const CJ = [['lignees', 1], ['predateurs', 1], ['biomasse_t', 1], ['shannon', 3], ['stables', 3], ['eteintes', 1], ['nees', 1], ['formes', 1], ['traits', 4], ['aires', 1]];
  const enChemin = !J ? [] : ['', `### En chemin, ${J.pas > 1 ? `tous les ${J.pas} cycles` : 'à chaque cycle'}`, '', `Le témoin au fil des cycles (entre parenthèses, le cycle du monde${J.annee ? ' ; et sa saison' : ''}) :`, '',
    '| cycle | saison | lignées | carnivores | biomasse | Shannon | stables | formes | traits | aires |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...pts.map(c => { const T = lu(c).temoin.moyenne;
      return `| ${c} (${R0.monde.cycle + c}) | ${saisonDu(R0.monde.cycle + c, J.annee) ?? '–'} | ${nb(T.lignees, 1)} | ${nb(T.predateurs, 1)} | ${nb(T.biomasse_t, 0)} t | ${nb(T.shannon, 3)} | ${T.stables == null ? '–' : nb(100 * T.stables, 0) + ' %'} | ${nb(T.formes, 2)} | ${nb(T.traits, 4)} | ${nb(T.aires, 1)} |`; }),
    '', 'Les écarts de chaque essai au témoin, au même cycle (la biomasse, les formes et les aires, en part de celles du témoin), et ce qui bouge, par la même lecture :', '',
    '| cycle | essai | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | formes | traits | aires | ce qui bouge |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...pts.flatMap(c => { const L = lu(c); return rapport.filter(x => !x.erreurs).map(x => { const y = L.essais[x.essai], T = L.temoin;
      return `| ${c} | ${x.essai} | ${CJ.map(([k, d]) => y?.ecarts?.[k] == null ? '–' : fx(y.ecarts[k] * pc(k, T), d) + u(k)).join(' | ')} | ${y?.bouge?.length ? y.bouge.join(', ') : '–'} |`; }); })];
  const notes = [`## Les ${PAI ? 'paires de règles' : 'ablations'} : ${R0.monde.id}, cycle ${R0.monde.cycle} (${R0.cycles} cycles, ${NG} graine${NG > 1 ? 's' : ''})`, '',
    `Le témoin : ${nb(temoin.moyenne.lignees, 1)} lignées animales (écart entre graines ${nb(temoin.ecart.lignees, 1)}), ${nb(temoin.moyenne.predateurs, 1)} carnivores, ${nb(temoin.moyenne.biomasse_t, 0)} t, Shannon ${nb(temoin.moyenne.shannon, 3)}, ${nb(100 * (temoin.moyenne.stables ?? 0), 0)} % de lignées stables, ${nb(temoin.moyenne.eteintes, 1)} éteintes, ${nb(temoin.moyenne.nees, 1)} nées${temoin.moyenne.formes != null ? `, ${nb(temoin.moyenne.formes, 2)} formes par lignée` : ''}${temoin.moyenne.traits != null ? `, des traits à ${nb(temoin.moyenne.traits, 4)} écart-type de leur plan` : ''}${temoin.moyenne.aires != null ? `, ${nb(temoin.moyenne.aires, 1)} lieux par lignée` : ''} ; un cycle en ${nb(temoin.moyenne.duree_s, 2)} s.${Object.values(temoin.par_graine).some(m => !m) ? ` Le témoin a perdu ${Object.values(temoin.par_graine).filter(m => !m).length} graine${Object.values(temoin.par_graine).filter(m => !m).length > 1 ? 's' : ''} sur ${NG} : le rapport ne se lit pas avant de la${Object.values(temoin.par_graine).filter(m => !m).length > 1 ? 's' : ''} relancer (--reprendre).` : ''} Lu selon le plan ${R0.plan.version} (${R0.plan.empreinte.slice(0, 12)}…)${R0.plan_des_essais ? `, les essais faits selon le plan ${R0.plan_des_essais.version} (${R0.plan_des_essais.empreinte.slice(0, 12)}…)` : ''}.${R0.regles_choisies ? ` Seules les règles dites (${R0.regles_choisies.join(', ')}), pas tout le plan.` : ''}${R0.reprises?.length ? ` ${R0.reprises.map(p => `Repris du rapport du ${p.date?.slice(0, 10) ?? '?'} (moteur ${p.moteur?.commit?.slice(0, 7) ?? '?'}) : ${p.taches} tâche${p.taches > 1 ? 's' : ''} gardée${p.taches > 1 ? 's' : ''}, ${p.relancees} relancée${p.relancees > 1 ? 's' : ''}`).join(' ; ')} ; les durées de deux passes ne se comparent pas, ni donc les coûts.` : ''}`, '',
    `| ${PAI ? 'paire' : 'essai'} | nature | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | formes | traits | aires | coût | lecture |`, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rapport.map(x => x.erreurs ? `| ${x.essai} | ${x.nature} | | | | | | | | | | | | ${x.lecture} |`
      : `| ${x.essai} | ${x.nature} | ${cel(x, 'lignees', 1)} | ${cel(x, 'predateurs', 1)} | ${temoin.moyenne.biomasse_t ? cel(x, 'biomasse_t', 1) : '–'} | ${cel(x, 'shannon', 3)} | ${cel(x, 'stables', 3)} | ${cel(x, 'eteintes', 1)} | ${cel(x, 'nees', 1)} | ${cel(x, 'formes', 1)} | ${cel(x, 'traits', 4)} | ${cel(x, 'aires', 1)} | ${x.cout_lu == null ? '≈' : fx(100 * x.cout_lu, 0) + ' %'} | ${x.lecture} |`),
    '', `Les écarts sont ceux de l'essai au témoin, en moyenne sur les graines (la biomasse, les formes et les aires, en part de celles du témoin)${PAI ? ` ; entre parenthèses, la somme des écarts des deux règles retirées chacune seule (le rapport des essais seuls${R0.simples_de?.date ? ` du ${R0.simples_de.date.slice(0, 10)}` : ''}, ${R0.simples_de?.empreinte?.slice(0, 12) ?? '?'}…)` : ''}. Les formes : le nombre effectif de phénotypes d'une lignée, en moyenne (– : un rapport fait sans elles). Les traits : l'écart des traits continus de chaque population au plan de sa lignée, en écarts-types naturels, en moyenne ; les aires : le nombre de lieux où vit une lignée, en moyenne (– : un rapport fait sans eux). Le coût : la part d'un cycle qu'on gagne sans la règle, au-delà du bruit des durées (≈ : dans ce bruit).`,
    ...enChemin,
    ...(laisses.length ? ['', `Non essayées : ${laisses.map(x => `${x.essai || x.regle} (${x.pourquoi})`).join(' ; ')}.`] : [])].join('\n');
  const so = arg('--sortie'), sn = arg('--notes');
  if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(R0, null, 1) + '\n'); }
  if (sn) { fs.mkdirSync(path.dirname(path.resolve(sn)), { recursive: true }); fs.writeFileSync(sn, notes + '\n'); } else console.log(notes);
};

// --- la fusion : les parts d'un même plan, sur le même monde, en un rapport (le témoin de la première ; chaque essai, le coût de sa part) ---
if (a[0] === '--fusionner') {
  const P = a.slice(1).filter((x, i, L) => !x.startsWith('--') && !OPTS.includes(L[i - 1])).map(lireJ), A = P[0];
  const sansDuree = T => JSON.stringify(Object.fromEntries(Object.entries(T).map(([g, m]) => [g, m && { ...m, duree_s: 0 }])));
  const sansDureeJ = J => J ? JSON.stringify([J.pas, J.cycles, Object.fromEntries(Object.entries(J.temoin).map(([c, T]) => [c, sansDuree(T)]))]) : null;   // (les jalons : le même témoin en chemin)
  const pb = P.filter(x => x.plan.empreinte !== A.plan.empreinte || x.monde.empreinte !== A.monde.empreinte || x.cycles !== A.cycles || JSON.stringify(x.graines) !== JSON.stringify(A.graines) || sansDuree(x.temoin.par_graine) !== sansDuree(A.temoin.par_graine)
    || x.type !== A.type || x.simples_de?.empreinte !== A.simples_de?.empreinte || JSON.stringify(x.regles_choisies) !== JSON.stringify(A.regles_choisies) || sansDureeJ(x.jalons) !== sansDureeJ(A.jalons));
  if (pb.length) { console.error(`les parts ne vont pas ensemble (plan, monde, cycles, graines, témoin, essais seuls ou paires, règles dites, jalons) : ${pb.length} sur ${P.length}`); process.exit(2); }
  const vus = new Set(), bruts = P.flatMap(x => x.essais).filter(e => !vus.has(e.essai) && vus.add(e.essai)), cles = new Set();
  const laisses = P.flatMap(x => x.laisses).filter(l => { const k = l.regle + '|' + (l.essai || ''); return !cles.has(k) && cles.add(k); });
  const ordre = Object.keys(PLAN.regles);
  let L = lire(bruts.sort((x, y) => ordre.indexOf(x.regle?.split('+')[0]) - ordre.indexOf(y.regle?.split('+')[0]) || (x.essai < y.essai ? -1 : 1)), A.temoin.par_graine, A.cycles);
  if (A.type === 'paires') L = interactions(L, A.simples || {});
  // (la lecture est celle du plan d'aujourd'hui ; s'il a changé depuis les essais, le rapport le dit : plan_des_essais)
  const plan = { fichier: path.relative(racine, path.resolve(fPlan)), version: PLAN.version, empreinte: empreintePlan };
  const JR = A.jalons ? { pas: A.jalons.pas, cycles: A.jalons.cycles, annee: A.jalons.annee, temoin: A.jalons.temoin, essais: Object.assign({}, ...P.map(x => x.jalons.essais)) } : null;
  ecrire({ ...A, part: undefined, parts: P.length, plan, ...(A.plan.empreinte !== empreintePlan ? { plan_des_essais: A.plan } : {}), date: new Date().toISOString(), temoin: L.temoin, essais: L.essais, laisses,
    jalons: JR ? { ...JR, lus: lireJalons(JR, bruts) } : undefined, reprises: P.some(x => x.reprises) ? P.flatMap(x => x.reprises || []) : undefined, duree_min: r(somme(P.map(x => x.duree_min || 0)), 1) });
  process.exit(L.essais.some(x => x.erreurs) ? 1 : 0);
}

const fMonde = a.find((x, i) => !x.startsWith('--') && !OPTS.includes(a[i - 1]));
if (!fMonde) { console.error('node outils/ablations.js <etat.json> [--cycles 30] [--graines 3] [--regles a,b] [--natures mecanisme,constante,comptable] [--jobs 4] [--jalons n] [--memoire-tache Mo] [--reprendre rapport.json] [--part k/n] [--sortie f.json] [--notes f.md]\n'
  + 'node outils/ablations.js <etat.json> --paires <rapport des essais seuls> [--paires-de a,b,c] [--jobs 4] [--part k/n] [--sortie f.json] [--notes f.md]\n'
  + 'node outils/ablations.js --fusionner part1.json part2.json … [--sortie f.json] [--notes f.md]'); process.exit(2); }
// (les paires : les cycles et les graines du rapport des essais seuls, le même monde)
const PAIRES = arg('--paires') ? lireJ(arg('--paires')) : null;
const CYCLES = PAIRES ? PAIRES.cycles : +arg('--cycles', 30), NG = PAIRES ? PAIRES.graines.length : +arg('--graines', 3), JOBS = +arg('--jobs', Math.max(1, os.cpus().length));
const NATURES = new Set(arg('--natures', 'mecanisme,constante,comptable').split(',')), CHOIX = arg('--regles') ? new Set(arg('--regles').split(',')) : null;
const PART = arg('--part') ? arg('--part').split('/').map(Number) : null;
if (PART && !(PART[0] >= 1 && PART[0] <= PART[1])) { console.error('--part k/n : 1 ≤ k ≤ n'); process.exit(2); }
// (les jalons, plan version 4 : tous les n cycles, en chemin ; pas pour les paires, qui se lisent contre des essais seuls mesurés à leur fin)
const JAL = arg('--jalons') != null ? Math.floor(+arg('--jalons')) : 0;
if (arg('--jalons') != null && (PAIRES || !(JAL >= 1))) { console.error(PAIRES ? '--jalons : pas avec --paires' : '--jalons n : un nombre de cycles, au moins 1'); process.exit(2); }
const CJ = JAL ? Array.from({ length: Math.ceil(CYCLES / JAL) - 1 }, (_, i) => (i + 1) * JAL).filter(c => c < CYCLES) : [];
// (la mémoire de chaque tâche, en Mo : le plafond du tas de son processus ; un essai long, plusieurs à la fois, en demande moins —
//  le tas d'un essai d'Orvane grossit jusqu'à son plafond, quand ce qu'il garde vraiment tient en quelques centaines de Mo)
const MEMOIRE = Math.floor(+arg('--memoire-tache', 6000));
if (!(MEMOIRE >= 256)) { console.error('--memoire-tache Mo : la mémoire de chaque tâche, en Mo (au moins 256)'); process.exit(2); }
const I0 = lireJ(fMonde), R = Orvane.contexte(I0).R, graines = PAIRES ? PAIRES.graines.slice() : Array.from({ length: NG }, (_, k) => ((I0.monde.graine >>> 0) + k) >>> 0);
if (PAIRES && (PAIRES.type === 'paires' || PAIRES.part)) { console.error(`--paires : ${PAIRES.part ? `une part (${PAIRES.part}) ; les paires se choisissent dans le rapport entier (--fusionner les parts d'abord)` : 'un rapport de paires, pas d\'essais seuls'}`); process.exit(2); }
if (PAIRES && PAIRES.monde?.empreinte !== Journal.empreinte(I0)) { console.error('--paires : le rapport des essais seuls n\'est pas celui de ce monde (son empreinte)'); process.exit(2); }
if (PAIRES && PAIRES.regles_choisies && !arg('--paires-de')) console.error(`--paires : les essais seuls n'ont pas tout le plan (--regles ${PAIRES.regles_choisies.join(',')}) ; la règle du plan veut le rapport entier`);

// --- les essais : le témoin, puis chaque règle retirée (ou chaque valeur d'une constante) ; une part : le témoin et un essai sur n ---
let essais = [{ id: 'temoin', regle: null, nature: 'temoin', regles: {} }], laisses = [];
const connus = new Set(Object.keys(PLAN.regles));
for (const [k, P] of Object.entries(PLAN.regles)) {
  const variantes = P.retirer ? [{ id: k, change: P.retirer }]
    : P.facteurs ? P.facteurs.map(f => ({ id: `${k} ×${f}`, change: { [k]: typeof R[k] === 'number' ? +(R[k] * f).toPrecision(6) : R[k] } }))
    : (P.essais || []).map(e => ({ id: `${k} = ${JSON.stringify(Object.values(e)[0])}`, change: e }));
  for (const v of variantes) connus.add(v.id);
  // (--regles dit une règle, toute entière, ou un seul de ses essais : « max_phenotypes = 10 », une constante à une seule de ses valeurs)
  const dits = !CHOIX || CHOIX.has(k) ? variantes : variantes.filter(v => CHOIX.has(v.id));
  if (CHOIX && !CHOIX.has(k) && !dits.length) continue;
  if (!NATURES.has(P.nature)) { laisses.push({ regle: k, nature: P.nature, pourquoi: PLAN.natures[P.nature] }); continue; }
  for (const v of dits) {
    const regles = Object.fromEntries(Object.entries(v.change).map(([c, x]) => [c, fusion(R[c], x)]));   // (la valeur entière de chaque règle changée)
    if (Object.entries(regles).every(([c, x]) => pareil(x, R[c]))) { laisses.push({ regle: k, nature: P.nature, essai: v.id, pourquoi: 'déjà retirée dans ce monde : sa valeur est celle qui l\'éteint' }); continue; }
    essais.push({ id: v.id, regle: k, nature: P.nature, regles, fait: P.fait, quand: P.quand });
  }
}
if (CHOIX && [...CHOIX].some(x => !connus.has(x))) { console.error(`--regles : « ${[...CHOIX].find(x => !connus.has(x))} » n'est ni une règle du plan ni l'un de ses essais`); process.exit(2); }
// (les paires, plan version 3 : les mécanismes qui tiennent seuls dans le rapport du même monde, deux à deux ; --paires-de : ceux qu'on dit)
let simples = null;
if (PAIRES) { const de = arg('--paires-de') ? arg('--paires-de').split(',') : null, N = PLAN.paires?.natures || ['mecanisme'];
  if (de && de.some(x => !PAIRES.essais.some(e => e.essai === x))) { console.error(`--paires-de : pas d'essai seul « ${de.find(x => !PAIRES.essais.some(e => e.essai === x))} » dans ce rapport`); process.exit(2); }
  const choisis = PAIRES.essais.filter(e => !e.erreurs && (de ? de.includes(e.essai) : N.includes(e.nature) && e.bouge?.length));
  simples = Object.fromEntries(choisis.map(e => [e.essai, { ecarts: e.ecarts, mesures: e.mesures, bouge: e.bouge }]));
  essais = [essais[0]]; laisses = [];
  for (let i = 0; i < choisis.length; i++) for (let j = i + 1; j < choisis.length; j++) { const A = choisis[i], B = choisis[j];
    essais.push({ id: `${A.essai} + ${B.essai}`, regle: `${A.regle}+${B.regle}`, nature: 'paire', paire: [A.essai, B.essai], regles: { ...A.regles, ...B.regles }, fait: `${A.fait} ; ${B.fait}`, quand: `${A.quand} ; ${B.quand}` }); }
  if (choisis.length < 2) console.error(`--paires : ${choisis.length} règle${choisis.length > 1 ? 's' : ''} seulement à mettre en paires (${choisis.map(e => e.essai).join(', ') || 'aucune'})`); }
if (PART) essais = [essais[0], ...essais.slice(1).filter((_, i) => i % PART[1] === PART[0] - 1)];
// (une reprise : les tâches qu'un rapport a faites, gardées ; celles qu'il a perdues, relancées. Il faut la même passe — le plan, le monde,
//  les essais, les cycles, les graines, les jalons — et le même moteur : le même code (son empreinte), ou, pour un rapport qui ne la dit
//  pas, rien de changé dans moteur, tampon, hebergement entre son commit et celui-ci, ni à la main d'un côté ou de l'autre)
const REPRISE = arg('--reprendre') ? lireJ(arg('--reprendre')) : null, MOTEUR = { ...Journal.moteur(racine), code: codeMoteur() }, repris = [];
if (REPRISE) {
  const ids = L => L.map(e => `${e.id ?? e.essai}|${Journal.stable(e.regles ?? {})}`).sort().join('\n');
  const pb = [[REPRISE.plan?.empreinte !== empreintePlan, 'le plan'], [REPRISE.monde?.empreinte !== Journal.empreinte(I0), 'le monde'], [REPRISE.cycles !== CYCLES, 'les cycles'],
    [JSON.stringify(REPRISE.graines) !== JSON.stringify(graines), 'les graines'],
    [(REPRISE.type ?? null) !== (PAIRES ? 'paires' : null) || (REPRISE.simples_de?.empreinte ?? null) !== (PAIRES ? Journal.empreinte(PAIRES) : null), 'les paires'],
    [(REPRISE.part ?? null) !== (PART ? PART.join('/') : null), 'la part'], [JSON.stringify(REPRISE.regles_choisies ?? null) !== JSON.stringify(CHOIX && !PAIRES ? [...CHOIX].sort() : null), 'les règles dites'],
    [JSON.stringify(REPRISE.jalons?.cycles ?? []) !== JSON.stringify(CJ), 'les jalons'], [ids(REPRISE.essais || []) !== ids(essais.slice(1)), 'les essais']].filter(x => x[0]).map(x => x[1]);
  if (pb.length) { console.error(`--reprendre : ce rapport n'est pas celui de cette passe (${pb.join(', ')})`); process.exit(2); }
  const M = REPRISE.moteur || {}; let meme = !!M.code && M.code === MOTEUR.code;
  if (!M.code && M.modifie === false && MOTEUR.modifie === false && M.commit && MOTEUR.commit)
    try { if (M.commit !== MOTEUR.commit) execFileSync('git', ['-C', racine, 'diff', '--quiet', M.commit, MOTEUR.commit, '--', 'moteur', 'tampon', 'hebergement'], { stdio: 'ignore' }); meme = true; } catch (e) { meme = false; }
  if (!meme) { console.error(`--reprendre : le moteur du rapport (${M.commit?.slice(0, 7) ?? '?'}${M.modifie ? ', modifié' : ''}) n'est pas sûrement celui-ci (${MOTEUR.commit?.slice(0, 7) ?? '?'}${MOTEUR.modifie ? ', modifié' : ''}) : rien ne doit changer entre les deux dans moteur, tampon, hebergement`); process.exit(2); }
  const par = id => id === 'temoin' ? REPRISE.temoin?.par_graine : REPRISE.essais.find(x => x.essai === id)?.par_graine;
  const jal = id => id === 'temoin' ? REPRISE.jalons?.temoin : REPRISE.jalons?.essais?.[id];
  for (const e of essais) for (const g of graines) { const m = par(e.id)?.[g], J = JAL ? Object.fromEntries(CJ.map(c => [c, jal(e.id)?.[c]?.[g] ?? null])) : null;
    if (m && !(J && Object.values(J).some(x => !x))) repris.push({ id: e.id, g, m, jalons: J, erreur: null }); }
}
const travaux = essais.flatMap(e => graines.map(g => ({ e, g }))).filter(({ e, g }) => !repris.some(x => x.id === e.id && x.g === g));
console.error(`${path.basename(path.dirname(path.resolve(fMonde)))} (cycle ${I0.cycle.n})${PART ? `, part ${PART.join('/')}` : ''} : ${essais.length - 1} essais et le témoin, ${NG} graine${NG > 1 ? 's' : ''}, ${CYCLES} cycles chacun${JAL ? ` (mesurés aussi tous les ${JAL})` : ''} : ${travaux.length} tâches${REPRISE ? ` (${repris.length} autres reprises du rapport du ${REPRISE.date?.slice(0, 16).replace('T', ' ') ?? '?'})` : ''}, ${JOBS} à la fois${MEMOIRE !== 6000 ? `, ${MEMOIRE} Mo chacune` : ''}`);

const lancer = ({ e, g }) => new Promise(fin => {
  const p = spawn(process.execPath, [`--max-old-space-size=${MEMOIRE}`, __filename, '--essai', JSON.stringify({ monde: path.resolve(fMonde), graine: g, cycles: CYCLES, regles: e.regles, ...(JAL ? { jalons: JAL } : {}) })], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', (code, signal) => { let m = null, jalons = null; try { m = code === 0 ? JSON.parse(out) : null; } catch (x) { m = null; } if (m?.jalons) { jalons = m.jalons; delete m.jalons; }
    fin({ id: e.id, g, m, jalons, erreur: m ? null : signal ? `arrêtée par la machine (${signal})` : (err.trim().split('\n').slice(-3).join(' ') || `code ${code}`).slice(0, 300), ...(!m && signal ? { arretee: true } : {}) }); });
});
(async () => {
  const t0 = Date.now(), file = travaux.slice(), res = [...repris]; let faits = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, file.length) }, async () => { while (file.length) { const x = await lancer(file.shift()); res.push(x); faits++;
    if (faits % Math.max(1, Math.round(travaux.length / 20)) === 0 || faits === travaux.length) console.error(`  ${faits}/${travaux.length} (${((Date.now() - t0) / 60000).toFixed(1)} min)`); } }));
  const de = id => graines.map(g => res.find(x => x.id === id && x.g === g)), T = Object.fromEntries(de('temoin').map(x => [x.g, x.m]));
  const td = moy(Object.values(T).filter(Boolean).map(m => m.duree_s));
  const bruts = essais.slice(1).map(e => { const L = de(e.id);
    return { essai: e.id, regle: e.regle, nature: e.nature, ...(e.paire ? { paire: e.paire } : {}), fait: e.fait, quand: e.quand, regles: e.regles, temoin_duree_s: r(td, 3), par_graine: Object.fromEntries(L.map(x => [x.g, x.m])),
      erreurs: L.filter(x => !x.m).map(x => ({ graine: x.g, erreur: x.erreur, ...(x.arretee ? { arretee: true } : {}) })) }; });
  // (les paires se lisent contre les essais seuls : il faut le même témoin, au bit près dans ses mesures — celles qu'ont les essais seuls :
  //  un rapport d'avant le plan 4 n'a pas les formes)
  const cles = new Set(Object.keys(Object.values(PAIRES?.temoin?.par_graine || {}).find(Boolean) || {}));
  const sansDuree = X => JSON.stringify(Object.fromEntries(Object.entries(X).map(([g, m]) => [g, m && Object.fromEntries(Object.entries({ ...m, duree_s: 0 }).filter(([k]) => cles.has(k)))])));
  if (PAIRES && sansDuree(T) !== sansDuree(PAIRES.temoin.par_graine)) { console.error('--paires : le témoin n\'est pas celui des essais seuls (un autre moteur ?) : les paires ne se liraient pas contre eux'); process.exit(2); }
  let L = lire(bruts, T, CYCLES); if (PAIRES) L = interactions(L, simples);
  // (les jalons : les mesures de chaque tâche en chemin, puis la même lecture à chaque jalon)
  const parJalon = id => Object.fromEntries(CJ.map(c => [c, Object.fromEntries(de(id).map(x => [x.g, x.jalons?.[c] ?? null]))]));
  const JR = JAL ? { pas: JAL, cycles: CJ, annee: I0.monde.annee ?? null, temoin: parJalon('temoin'), essais: Object.fromEntries(essais.slice(1).map(e => [e.id, parJalon(e.id)])) } : null;
  const R0 = { ...(PAIRES ? { type: 'paires', simples_de: { fichier: path.relative(racine, path.resolve(arg('--paires'))), date: PAIRES.date ?? null, empreinte: Journal.empreinte(PAIRES) }, simples } : {}), plan: { fichier: path.relative(racine, path.resolve(fPlan)), version: PLAN.version, empreinte: empreintePlan }, date: new Date().toISOString(), moteur: MOTEUR,
    machine: { processeur: os.cpus()[0]?.model ?? null, coeurs: os.cpus().length, node: process.version, memoire_tache_mo: MEMOIRE }, ...(PART ? { part: PART.join('/') } : {}),
    // (une reprise : d'où viennent les tâches gardées — le rapport, son moteur, sa machine —, combien, et combien sont relancées ici)
    ...(REPRISE ? { reprises: [...(REPRISE.reprises || []), { date: REPRISE.date ?? null, empreinte: Journal.empreinte(REPRISE), moteur: REPRISE.moteur ?? null, machine: REPRISE.machine ?? null, duree_min: REPRISE.duree_min ?? null, taches: repris.length, relancees: travaux.length }] } : {}), ...(CHOIX && !PAIRES ? { regles_choisies: [...CHOIX].sort() } : {}),
    monde: { id: I0.monde.id, cycle: I0.cycle.n, empreinte: Journal.empreinte(I0), regles: Journal.empreinte(Journal.stable(I0.monde.regles ?? {})) },
    cycles: CYCLES, graines, temoin: L.temoin, essais: L.essais, laisses, ...(JR ? { jalons: { ...JR, lus: lireJalons(JR, bruts) } } : {}), duree_min: r((Date.now() - t0) / 60000 + (REPRISE?.duree_min || 0), 1) };
  ecrire(R0);
  process.exit(L.essais.some(x => x.erreurs) || Object.values(T).some(m => !m) ? 1 : 0);
})();
