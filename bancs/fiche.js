// Orvane — LE BANC DE LA FICHE DE CRÉATURE (bancs/fiche.js, docs/54)
// Sur trois mondes publiés (Orvane au cycle 44, la genèse 2026, la genèse 7) :
//  1. chaque lignée a sa fiche, sans erreur ni trou (undefined, NaN), en treize sections, et chaque phrase (chaque proposition qui
//     finit par un point) dit sa source : une donnée, ou une règle de DA ; les valeurs citées sont celles de l'instantané ;
//  2. la même entrée donne la même fiche (empreinte) : deux fois, sur une copie, les lignées à l'envers, les clés de chaque objet à
//     l'envers ; rien n'est modifié, même en modifiant la fiche rendue ; un navigateur (globalThis, sans require) écrit la même ;
//  3. la table des familles : versionnée, gelée, chaque règle justifiée ; la famille recomptée d'après les données brutes, par une
//     table écrite ici ; la répartition, ligne à ligne avec celle de l'issue 39 ; les cas ambigus tranchés ; les hexapodes géants ;
//  4. une lignée et ses filles ont la même famille, sauf changement de plan, et la fiche dit ce qui change de peau ;
//  5. la fiche couvre tout : chaque champ du corps, chaque organe présent, chaque partie à 0 et chaque organe absent interdits
//     (au négatif, avec les mots d'une table écrite ici), la parenté, les couleurs, les unités, les effectifs ;
//  6. le positif et le négatif ne se contredisent jamais : aucun terme du négatif n'est dans le prompt 2D ni dans le prompt 3D ;
//  7. le Kaume : au moins aussi riche que l'exemple de l'issue, point par point, et juste là où l'essai s'était trompé ;
//  8. les cas limites, un par un ;
//  9. le paquet : monde/fiche.js part dans npm (files, exports, index.js), et outils/fiches.js écrit les fiches d'un instantané.
//   node bancs/fiche.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), crypto = require('crypto'), { spawnSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Corps = require(racine('moteur/corps.js')), Ponte = require(racine('moteur/ponte.js')), Fiche = require(racine('monde/fiche.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now(), clone = o => JSON.parse(JSON.stringify(o));
const empreinte = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const quelques = (L, n = 4) => L.slice(0, n).join(' | ') + (L.length > n ? ` … (${L.length})` : '');
const MONDES = ['orvane', 'genese-2026', 'genese-7'].map(id => { const brut = fs.readFileSync(racine(`mondes/${id}/instantane.json`), 'utf8'), I = JSON.parse(brut);
  return { id, brut, I, T: I.taxons.filter(t => t.plan?.regime !== 'vegetal') }; });
const O = MONDES[0], I = O.I, T = O.T, parId = new Map(T.map(t => [t.id, t]));
const TITRES = ['Identité', 'Famille visuelle et tégument', 'Silhouette', 'Tête', 'Organes', 'Couleurs', 'Posture et mouvement', 'Comportement', 'Milieu', 'Variations', 'Parenté', 'Interdits', 'Prompts'];
const SOURCE = /\([^()]*`[^`]+`|\*\((interprété|règle|lecture)/;   // une donnée entre parenthèses, ou une décision de la DA en italique
const trous = f => /undefined|NaN|Infinity|\[object /.test(JSON.stringify(f));
const section = (f, titre) => f.champs.sections.find(s => s.titre.startsWith(titre))?.phrases.join('\n') || '';
const bonne = f => f && Fiche.FAMILLES[f.famille] && typeof f.humain === 'string' && f.humain.length > 500 && f.ia.prompt_2d.startsWith(f.ia.style) && f.ia.prompt_3d && f.ia.negatif
  && f.ia.palette.length >= 4 && f.ia.palette.every(x => /^#[0-9A-F]{6}$/.test(x.hex) && x.en && x.fr) && f.champs.sections.length === 13 && f.champs.sections.every((s, i) => s.titre.startsWith(TITRES[i]))
  && TITRES.every(x => f.humain.includes('**' + x)) && !trous(f);
// chaque proposition (ce qui finit par un point, hors des blocs de code des prompts) a sa source
const propositions = ph => ph.replace(/```[\s\S]*?```/g, '').replace(/« [^»]* »/g, '«»').split(/(?<=[.])\s+(?=[A-ZÀ-ÖØ-Ý*«-])/).map(x => x.trim()).filter(x => x.length > 2);
const sansSource = f => f.champs.sections.filter(s => s.titre !== 'Prompts').flatMap(s => s.phrases.flatMap(ph => propositions(ph).filter(x => !SOURCE.test(x)).map(x => s.titre + ' : ' + x.slice(0, 90))));
// des mots, pour comparer le positif et le négatif : en minuscules, sans les codes de couleur, au singulier (un « s » final ôté)
const mots = s => s.toLowerCase().replace(/#[0-9a-f]{6}/g, ' ').split(/[^a-zà-öø-ÿœ]+/).filter(Boolean).map(w => w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const dans = (P, terme) => { const X = mots(terme); for (let i = 0; i + X.length <= P.length; i++) if (X.every((w, j) => P[i + j] === w)) return true; return false; };
const contradictions = f => { const P2 = mots(f.ia.prompt_2d), P3 = mots(f.ia.prompt_3d); return f.ia.negatif.split(', ').filter(n => dans(P2, n) || dans(P3, n)); };
const FI = new Map(); for (const M of MONDES) for (const t of M.T) { try { FI.set(M.id + '/' + t.id, Fiche.ecrire(t, M.I)); } catch (e) { FI.set(M.id + '/' + t.id, e); } }
const fiche = (id, m = 'orvane') => FI.get(m + '/' + id), fiches = m => MONDES.find(x => x.id === m).T.map(t => [t, fiche(t.id, m)]);

console.log('1. Trois mondes : une fiche par lignée, chaque phrase avec sa source');
for (const M of MONDES) { const L = M.T.map(t => fiche(t.id, M.id)), mal = M.T.filter(t => fiche(t.id, M.id) instanceof Error).map(t => t.id + ' (' + fiche(t.id, M.id).message + ')');
  const pas = mal.length ? [] : M.T.filter(t => !bonne(fiche(t.id, M.id))).map(t => t.id), tr = mal.length ? [] : L.filter(trous), S = mal.length ? [] : L.flatMap(sansSource);
  const n = mal.length ? 0 : L.reduce((s, f) => s + f.champs.sections.reduce((a, x) => a + x.phrases.reduce((b, ph) => b + propositions(ph).length, 0), 0), 0);
  verif(!mal.length && !pas.length && !tr.length && !S.length, `${M.id} (cycle ${M.I.cycle.n}) : ${M.T.length} fiches, en treize sections, sans trou ; ${fx(n)} propositions, chacune avec sa source${mal.length ? ' ; en échec : ' + quelques(mal) : ''}${pas.length ? ' ; mal formées : ' + quelques(pas) : ''}${tr.length ? ' ; avec un trou : ' + tr.length : ''}${S.length ? ' ; sans source : ' + quelques(S, 3) : ''}`); }
{ const L = T.map(t => fiche(t.id)), tailles = L.map(f => f.humain.length); verif(Math.min(...tailles) > 3000, `des fiches riches : de ${fx(Math.min(...tailles))} à ${fx(Math.max(...tailles))} caractères pour Orvane, ${fx(tailles.reduce((a, b) => a + b, 0) / tailles.length)} en moyenne`);
  // les valeurs citées sont celles de l'instantané : chaque `champ: nombre` d'un champ du plan, du corps ou de la niche
  const PLAN = ['masse_kg', 'taille_m', 'vitesse_rel', 'temperament', 'sociabilite', 'maturite', 'longevite', 'portee', 'perception', 'tolerance'], CORPS = ['long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue', 'pattes'];
  const faux = []; let nCit = 0;
  for (const M of MONDES) for (const [t, f] of fiches(M.id)) for (const s of f.champs.sections.filter(x => !/Parenté|Prompts/.test(x.titre))) for (const ph of s.phrases) for (const [, k, v] of ph.matchAll(/`((?:niche\.)?[a-z_]+): (-?[\d.]+)`/g)) {
    const brut = k.startsWith('niche.') ? t.plan.niche?.[k.slice(6)] : PLAN.includes(k) ? t.plan[k] : CORPS.includes(k) ? t.plan.corps?.[k] : undefined;
    if (brut === undefined) continue; nCit++; if (String(Math.abs(brut) >= 1e-3 || +brut === 0 ? +(+brut).toFixed(4) : +(+brut).toPrecision(4)) !== v) faux.push(`${M.id}/${t.id} ${k}: ${v} (donnée : ${brut})`); }
  verif(!faux.length && nCit > 10000, `les valeurs citées sont celles de l'instantané : ${fx(nCit)} citations du plan, du corps et de la niche relues${faux.length ? ' ; fausses : ' + quelques(faux) : ''}`); }

console.log('2. La même entrée, la même fiche');
{ const renverse = o => Array.isArray(o) ? o.map(renverse) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).reverse().map(k => [k, renverse(o[k])])) : o;
  for (const M of MONDES) { const A = M.T.map(t => empreinte(fiche(t.id, M.id))), I2 = clone(M.I), Inv = { ...clone(M.I), taxons: clone(M.I.taxons).reverse() }, R = renverse(M.I);
    const diff = (inst, nom) => M.T.filter((t, i) => empreinte(Fiche.ecrire(inst.taxons.find(x => x.id === t.id), inst)) !== A[i]).map(t => nom + ':' + t.id);
    const D = [...diff(M.I, 'deux fois'), ...diff(I2, 'copie'), ...diff(Inv, 'lignées à l\'envers'), ...diff(R, 'clés à l\'envers')];
    verif(!D.length, `${M.id} : les ${A.length} mêmes empreintes, deux fois, sur une copie, les lignées à l'envers, les clés de chaque objet à l'envers${D.length ? ' ; différentes : ' + quelques(D) : ''}`);
    verif(JSON.stringify(M.I) === JSON.stringify(JSON.parse(M.brut)), `${M.id} : l'instantané n'a pas bougé d'un caractère`); }
  // muter tout ce que rend la fiche ne touche pas l'instantané
  const muter = o => { if (Array.isArray(o)) { for (const x of o) muter(x); o.push('mute'); } else if (o && typeof o === 'object') { for (const k of Object.keys(o)) muter(o[k]); o.mute = 1; } };
  const avant = JSON.stringify(I); for (const t of T) muter(Fiche.ecrire(t, I)); verif(JSON.stringify(I) === avant, 'modifier chaque objet de chaque fiche rendue ne change rien à l\'instantané : la fiche ne partage rien avec lui');
  const s0 = Corps.normaliser({ forme: 'segmente' }).forme; Fiche.ecrire(parId.get('kaume'), I); const s1 = Corps.normaliser({ forme: 'segmente' }).forme;
  verif(s0 === s1, `moteur/corps.js retrouve son état après la fiche (les formes du monde ne restent pas posées : « segmente » se lit ${s1})`);
  let gele = false; try { Fiche.FAMILLES.pelage.tegument[0] = 'x'; } catch (e) { gele = true; } verif((gele || Fiche.FAMILLES.pelage.tegument[0] === 'poil') && Object.isFrozen(Fiche.REGLES) && Object.isFrozen(Fiche.DETAILS[0]), 'la table des familles est gelée : un jeu ne la change pas pour les autres');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(racine('moteur/corps.js'), 'utf8'), ctx); vm.runInContext(fs.readFileSync(racine('monde/fiche.js'), 'utf8'), ctx);
  const nav = ctx.OrvaneFiche, egal = nav && MONDES.every(M => M.T.every(t => empreinte(JSON.parse(JSON.stringify(nav.ecrire(t, M.I)))) === empreinte(fiche(t.id, M.id))));
  verif(nav && typeof ctx.OrvaneCorps === 'object' && egal, `dans un navigateur (globalThis.OrvaneFiche, après moteur/corps.js, sans require) : les ${fx(FI.size)} mêmes fiches que dans Node`); }

console.log('3. La table des familles');
{ const Tb = Fiche.table(), R = Fiche.REGLES, D = Fiche.DETAILS;
  verif(Fiche.VERSION === '1.0' && Tb.version === Fiche.VERSION && JSON.stringify(Tb) === JSON.stringify(Fiche.table()) && Object.keys(Tb.familles).length === 8, `versionnée (${Fiche.VERSION}), exportée en JSON : ${Object.keys(Tb.familles).join(', ')}`);
  verif(R.every(r => r.id && Fiche.FAMILLES[r.famille] && r.quand && /\.$/.test(r.pourquoi) && typeof r.si === 'function') && D.every(d => d.id && d.pourquoi && /\.$/.test(d.pourquoi)) && Object.keys(Fiche.FAMILLES).every(f => R.some(r => r.famille === f)),
    `${R.length} règles et ${D.length} détails du tégument : chacun dit quand et pourquoi, en une phrase ; chaque famille a sa règle`);
  // la famille recomptée d'après les données brutes, par la table de l'issue et du chef d'équipe, écrite ici sans rien prendre au module
  const FORMES_BASE = ['quadrupede', 'hexapode', 'bipede', 'oiseau', 'serpent'], TERRE = ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe', 'vol'];
  const familleBrute = (t, M) => { const p = t.plan, c = p.corps; if (p.regime === 'synthetique') return 'machine';
    const W = M.I.catalogue?.monde?.formes || {}, f0 = c?.forme ?? 'quadrupede', forme = FORMES_BASE.includes(f0) || W[f0] ? f0 : FORMES_BASE.includes(c?.repli) ? c.repli : 'serpent';
    const loco = p.locomotion || [], nage = loco.includes('nage'), seulNage = nage && !loco.some(l => TERRE.includes(l));
    const carapace = Array.isArray(c?.organes) ? c.organes.some(o => o?.type === 'carapace') : (c?.carapace ?? 0) >= .2;
    if (forme === 'radiaire' || forme === 'tentaculaire') return 'gelee'; if (forme === 'segmente' || forme === 'hexapode') return 'chitine'; if (forme === 'oiseau') return 'plumage'; if (forme === 'serpent') return 'ecailles';
    const repro = p.reproduction ?? Ponte.modeDe(p); return repro === 'vivipare' ? 'pelage' : carapace ? 'cuirasse' : nage ? 'peau-nue' : 'ecailles'; };
  for (const M of MONDES) { const ecarts = fiches(M.id).filter(([t, f]) => familleBrute(t, M) !== f.famille).map(([t, f]) => `${t.id} : ${f.famille}, la table d'ici dit ${familleBrute(t, M)}`), cpt = {};
    for (const [, f] of fiches(M.id)) cpt[f.famille] = (cpt[f.famille] || 0) + 1;
    verif(!ecarts.length, `${M.id} : la famille de chaque lignée, recomptée d'après ses données brutes, est celle de la fiche — ${Object.entries(cpt).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([f, n]) => f + ' ' + n).join(', ')}${ecarts.length ? ' ; écarts : ' + quelques(ecarts) : ''}`); }
  // la table de l'issue (une carapace au-delà de 0,3, comme elle les a comptées) : chaque ligne, et la famille qu'elle reçoit
  const lire = t => { const p = t.plan, c = p.corps && Corps.normaliser(p.corps), al = c && Corps.allure(c, p), ca = c && c.carapace > .3, ailes = c && c.organes.some(o => o.type === 'ailes');
    return !c ? 'sans corps (synthetique)' : al === 'poisson' ? 'poisson (allure)' : c.forme === 'oiseau' ? 'oiseau' : c.forme === 'bipede' ? 'bipède' : c.forme === 'serpent' ? 'serpent, ovipare, terrestre'
      : c.forme === 'hexapode' ? (ca ? 'hexapode, ovipare, carapace' : 'hexapode, ovipare, sans carapace') : p.reproduction === 'vivipare' ? (ailes ? 'quadrupède, vivipare, ailé' : 'quadrupède, vivipare') : ca ? 'quadrupède, ovipare, carapace' : 'quadrupède, ovipare, sans carapace'; };
  const ISSUE = [['quadrupède, vivipare', 87, { pelage: 87 }], ['hexapode, ovipare, carapace', 52, { chitine: 52 }], ['poisson (allure)', 31, { ecailles: 31 }], ['quadrupède, ovipare, carapace', 27, { cuirasse: 27 }],
    ['hexapode, ovipare, sans carapace', 22, { chitine: 22 }], ['serpent, ovipare, terrestre', 10, { ecailles: 10 }], ['oiseau', 4, { plumage: 4 }], ['quadrupède, ovipare, sans carapace', 4, { ecailles: 2, 'peau-nue': 1, cuirasse: 1 }],
    ['bipède', 3, { pelage: 1, cuirasse: 2 }], ['quadrupède, vivipare, ailé', 1, { pelage: 1 }], ['sans corps (synthetique)', 2, { machine: 2 }]];
  for (const [ligne, n, attendu] of ISSUE) { const X = T.filter(t => lire(t) === ligne), got = {}; for (const t of X) got[fiche(t.id).famille] = (got[fiche(t.id).famille] || 0) + 1;
    const qui = X.length <= 4 ? ' (' + X.map(t => t.id + ' → ' + fiche(t.id).famille).join(', ') + ')' : '';
    verif(X.length === n && Object.keys(attendu).every(f => got[f] === attendu[f]) && Object.keys(got).every(f => attendu[f]), `la table de l'issue, ${ligne} : ${X.length} lignées (l'issue : ${n}) → ${Object.entries(got).map(([f, k]) => f + ' ' + k).join(', ')}${qui}`); }
  const fam = id => fiche(id).champs.famille, det = id => fam(id).details.map(d => d.id);
  const Q = T.filter(t => lire(t) === 'quadrupède, ovipare, carapace'), nage = Q.filter(t => t.plan.locomotion.includes('nage'));
  verif(nage.length === 14 && nage.every(t => det(t.id).includes('cuirasse-nageur') && /low-domed smooth streamlined|low smooth streamlined/.test(fiche(t.id).ia.prompt_2d)) && Q.filter(t => !nage.includes(t)).every(t => det(t.id).includes('cuirasse-terre')),
    'quadrupède ovipare à carapace → cuirasse : basse, lisse et profilée chez les 14 nageuses (tortue d\'eau), haute et en plaques chez les 13 autres');
  verif(T.filter(t => fiche(t.id).famille === 'cuirasse').every(t => /crab claws/.test(fiche(t.id).ia.negatif) && /pas de pinces de crabe/.test(section(fiche(t.id), 'Interdits'))), 'une cuirasse n\'a jamais de pinces : « pas de pinces de crabe », « crab claws » au négatif');
  verif(fam('talo').regle === 'ecailles-lezard' && fam('anloro').regle === 'ecailles-lezard' && fam('visiltor').regle === 'peau-nue' && fam('anrogra').regle === 'cuirasse',
    'quadrupède ovipare sans carapace : talo et anloro → écailles (lézards), visiltor → peau-nue (il nage) ; anrogra porte une carapace de 0,3, que l\'issue ne comptait pas : → cuirasse');
  const ser = T.filter(t => lire(t) === 'serpent, ovipare, terrestre');
  verif(ser.every(t => fam(t.id).regle === 'ecailles-serpent') && T.filter(t => lire(t) === 'poisson (allure)').every(t => fam(t.id).regle === 'ecailles-poisson'), `serpent terrestre → écailles de serpent (les ${ser.length}) ; un serpent qui ne fait que nager → écailles de poisson (les 31)`);
  verif(fam('phebel').id === 'pelage' && fam('umeouro').id === 'cuirasse' && fam('rososil').id === 'cuirasse' && det('rososil').includes('cuirasse-nageur') && det('umeouro').includes('cuirasse-terre'), 'bipède vivipare (phebel) → pelage ; bipèdes ovipares à carapace → cuirasse (umeouro sur terre, rososil qui nage)');
  const re = fiche('renel'), ail = re.champs.organes.find(o => o.type === 'ailes');
  verif(re.famille === 'pelage' && ail?.forme === 'plumes' && ail.nombre === 3 && /trois ailes de plumes/i.test(section(re, 'Organes')) && /membranous bat wings/.test(re.ia.negatif) && /feathered body/.test(re.ia.negatif),
    'renel, quadrupède vivipare ailé → pelage ; ses organes disent trois ailes de plumes, pas de peau : la chauve-souris est écartée');
  const viv = T.filter(t => t.plan.corps && t.plan.reproduction === 'vivipare' && Corps.normaliser(t.plan.corps).organes.some(o => o.type === 'carapace'));
  verif(viv.length === 4 && viv.every(t => fiche(t.id).famille === 'pelage' && det(t.id).includes('pelage-carapace')), `les ${viv.length} vivipares à carapace (${viv.map(t => t.id).join(', ')}) → pelage, une carapace de tatou sur le dos`);
  // les géants : les seuils se prennent sur la masse que montrent la plupart des bêtes (celle du prompt)
  const H = MONDES.flatMap(M => fiches(M.id).filter(([t]) => t.plan.corps?.forme === 'hexapode')), vue = f => f.champs.silhouette.masse_vue_kg;
  const G = H.filter(([, f]) => vue(f) >= 1), mauvais = H.filter(([, f]) => (vue(f) >= 1) !== f.champs.famille.details.some(d => d.id === 'chitine-geant') || (vue(f) >= 10) !== f.champs.famille.details.some(d => d.id === 'chitine-colosse')).map(([t]) => t.id);
  const kat = fiche('katorgra');
  verif(H.every(([, f]) => f.famille === 'chitine') && G.length && !mauvais.length && G.every(([, f]) => /not toy-like/.test(f.ia.prompt_2d) && !/\band (very )?light \(|slender quick|long slender/.test(f.ia.prompt_2d)) && !kat.champs.famille.details.some(d => d.id === 'chitine-colosse') && vue(kat) < 10,
    `les ${H.length} hexapodes des trois mondes gardent la chitine ; les ${G.length} qui montrent 1 kg et plus ont une cuticule épaisse, « not toy-like », sans rien de « léger » ; katorgra, nain à 93 %, montre ${fx(vue(kat), 1)} kg : pas de colosse${mauvais.length ? ' ; seuils faux : ' + quelques(mauvais) : ''}`);
  verif(['vigie', 'ferrailleur'].every(id => fiche(id).famille === 'machine' && fiche(id).champs.silhouette.machine && /modules\./.test(section(fiche(id), 'Organes'))), 'synthétiques sans corps → machine, décrites d\'après leurs modules');
  const sans = MONDES.flatMap(M => M.T.filter(t => t.plan.corps)).map(t => { const p = { ...t.plan }; delete p.reproduction; return [Fiche.modeDe(p), Ponte.modeDe(p)]; });
  verif(sans.every(([a, b]) => a === b), `sans « reproduction », la fiche la déduit comme moteur/ponte.js (modeDe) : la même réponse pour les ${sans.length} corps des trois mondes`); }

console.log('4. De la mère aux filles');
for (const M of MONDES) { const ids = new Map(M.T.map(t => [t.id, t])), P = M.T.filter(t => t.parent && ids.has(t.parent)), ch = P.filter(t => fiche(t.id, M.id).famille !== fiche(t.parent, M.id).famille);
  const memeCle = P.filter(t => JSON.stringify(Fiche.famille(t, M.I).cle) === JSON.stringify(Fiche.famille(ids.get(t.parent), M.I).cle)), mauvais = memeCle.filter(t => fiche(t.id, M.id).famille !== fiche(t.parent, M.id).famille);
  const dit = ch.filter(t => /famille changée/.test(section(fiche(t.id, M.id), 'Parenté')) && /La peau change/.test(section(fiche(t.id, M.id), 'Parenté')));
  const avant = Corps.etendre(M.I.catalogue?.monde || null), memeForme = ch.filter(t => Corps.normaliser(t.plan.corps).forme === Corps.normaliser(ids.get(t.parent).plan.corps).forme); Corps.etendre(avant); const garde = memeForme.filter(t => /ne changer que la peau/.test(section(fiche(t.id, M.id), 'Parenté')));
  verif(!mauvais.length && dit.length === ch.length && garde.length === memeForme.length, `${M.id} : ${P.length} lignées et leur mère ; ${P.length - ch.length} dans la même famille, ${ch.length} qui changent de plan, et leur fiche dit que la peau change${memeForme.length ? ` (${memeForme.length} sans changer de forme : garder silhouette, couleurs et motif)` : ''}${mauvais.length ? ' ; même plan, autre famille : ' + quelques(mauvais.map(t => t.id)) : ''}`); }
{ const fil = T.filter(t => T.some(x => x.parent === t.id));
  verif(fil.every(t => fiche(t.id).champs.parente.filles.length === T.filter(x => x.parent === t.id).length && fiche(t.id).champs.parente.filles.every(f => f.famille === fiche(f.id).famille)), `les ${fil.length} lignées mères d'Orvane citent toutes leurs filles, avec leur famille`);
  const anl = section(fiche('anloro'), 'Parenté'); verif(/La peau change : écailles fines et sèches, comme un lézard, au lieu de poil/.test(anl) && /ne changer que la peau/.test(anl), 'anloro, fille du Firtis devenue ovipare : « la peau change : écailles… au lieu de poil », et garder le reste'); }

console.log('5. La fiche couvre tout');
{ const CHAMPS = ['forme', 'pattes', 'long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue', 'cornes', 'crete', 'ailes', 'carapace', 'antennes', 'motif', 'organes', 'couleurs', 'posture'];
  const corps = MONDES.flatMap(M => fiches(M.id).filter(([t]) => t.plan.corps).map(([t, f]) => [t, f, M]));
  const manque = corps.flatMap(([t, f, M]) => CHAMPS.filter(k => !new RegExp('`' + k + '[`:. \\[]').test(f.humain)).map(k => M.id + '/' + t.id + ':' + k));
  verif(!manque.length, `chacun des ${CHAMPS.length} champs du corps est cité, dans les ${corps.length} fiches à corps des trois mondes${manque.length ? ' ; manque : ' + quelques(manque) : ''}`);
  const org = corps.flatMap(([t, f, M]) => { const S = section(f, 'Organes').toLowerCase(), CO = M.I.catalogue?.organes || Corps.catalogueOrganes(); return f.champs.organes.filter(o => !S.includes((CO[o.type].mot[o.nombre > 1 ? 1 : 0]).toLowerCase()) || !f.ia.prompt_2d.toLowerCase().includes(o.en.toLowerCase())).map(o => t.id + ':' + o.type); });
  verif(!org.length, `chaque organe présent (${corps.reduce((s, [, f]) => s + f.champs.organes.length, 0)}) est dans la fiche et dans le prompt 2D${org.length ? ' ; manque : ' + quelques(org) : ''}`);
  const ded = corps.filter(([t]) => !Array.isArray(t.plan.corps.organes)), dedOk = ded.every(([t, f]) => f.champs.organes.every(o => section(f, 'Organes').includes('`' + o.type + ': ') && /déduit de la proportion d'avant/.test(section(f, 'Organes')) && /par défaut \(moteur\/corps\.js\)/.test(section(f, 'Organes'))));
  verif(dedOk, `${ded.length} corps sans liste \`organes\` : leurs organes sont dits déduits des proportions, nombre, forme et place « par défaut », pas cités comme des données`);
  const zero = corps.flatMap(([t, f]) => { const S = section(f, 'Interdits'), Pp = f.champs.silhouette.proportions; return ['cou', 'museau', 'oreilles', 'queue'].filter(k => Pp[k].valeur === 0 && !(k === 'museau' && f.champs.silhouette.allure === 'oiseau') && !S.includes('`' + k + ': 0`')).map(k => t.id + ':' + k); });
  verif(!zero.length, `chaque partie à 0 est interdite, avec sa valeur (${corps.reduce((s, [, f]) => s + ['cou', 'museau', 'oreilles', 'queue'].filter(k => f.champs.silhouette.proportions[k].valeur === 0).length, 0)} parties à 0)${zero.length ? ' ; manque : ' + quelques(zero) : ''}`);
  // les organes absents, d'après les données brutes, et leur mot au négatif (une table écrite ici)
  const MOTS = { cornes: 'horns', defenses: 'tusks', crete: 'crest', collerette: 'frill', antennes: 'antennae', trompe: 'trunk', ailes: 'wings', nageoires: 'fins', carapace: 'shell', plaques: 'dorsal plates', epines: 'spines', massue: 'tail club', aiguillon: 'stinger', panache: 'tuft', pinces: 'pincers', mains: 'hands' };
  const abs = corps.flatMap(([t, f, M]) => { const c = t.plan.corps, presents = new Set(Array.isArray(c.organes) ? c.organes.map(o => o?.type) : ['cornes', 'crete', 'ailes', 'carapace', 'antennes'].filter(k => (c[k] ?? 0) >= .2));
    return Object.keys(M.I.catalogue?.organes || Corps.catalogueOrganes()).filter(x => !presents.has(x) && !(x === 'ailes' && f.famille === 'plumage')).filter(x => !section(f, 'Interdits').includes('`' + x) || (MOTS[x] && !f.ia.negatif.includes(MOTS[x]))).map(x => t.id + ':' + x); });
  verif(!abs.length, `chaque organe du catalogue absent des données brutes est interdit, dans la fiche et au négatif (${fx(corps.reduce((s, [, f]) => s + f.champs.interdits.filter(x => x.groupe === 'organes').length, 0))} interdits d'organes)${abs.length ? ' ; manque : ' + quelques(abs) : ''}`);
  const avecMere = T.filter(t => t.parent && parId.has(t.parent) && t.plan.corps && parId.get(t.parent).plan.corps);
  verif(avecMere.every(t => { const pa = fiche(t.id).champs.parente; return pa.trouve && Number.isFinite(pa.distance) && /OrvaneCorps\.distance/.test(section(fiche(t.id), 'Parenté')); }), `la parenté de ${avecMere.length} lignées d'Orvane est chiffrée, avec l'écart de silhouette`);
  const h = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  verif(corps.every(([t, f]) => ['robe', 'sombre', 'ventre', 'oeil'].every(r => f.champs.couleurs[r].hex === h(t.plan.corps.couleurs[r]) && section(f, 'Couleurs').includes(h(t.plan.corps.couleurs[r])))), 'les quatre couleurs de chaque corps, en hexadécimal, avec leur rôle et un nom en mots');
  const noms = new Set(corps.flatMap(([, f]) => ['robe', 'sombre', 'ventre', 'oeil'].map(r => f.champs.couleurs[r].fr)));
  const N = Fiche.nomCouleur, sombres = [[26, 58, 10], [40, 30, 60], [60, 20, 20]].map(c => N(c).fr);
  verif(noms.size >= 25 && N([166, 96, 125]).fr === 'mauve poussiéreux' && N([91, 58, 71]).fr === 'prune' && N([188, 162, 166]).fr === 'gris rosé' && N([182, 87, 87]).fr === 'rouge' && sombres.every(x => /très sombre/.test(x)) && N([3, 2, 42]).fr === 'presque noir',
    `la table des teintes : ${noms.size} noms sur les trois mondes ; le Kaume mauve poussiéreux, prune, gris rosé, rouge ; un vert, un indigo, un bordeaux très sombres (${sombres.join(', ')}), pas vifs`);
  verif(corps.every(([t, f]) => { const S = section(f, 'Silhouette'), Mv = section(f, 'Posture'); return /\d\s(cm|m|mm)\b/.test(S) && /\d\s(mg|g|kg|t)\b/.test(S) && /longueurs par seconde/.test(Mv) && /(m|cm|mm)\/s/.test(Mv) && /True size: [\d.]+ (mm|cm|m) long, [\d.]+ (mg|g|kg|t)\./.test(f.ia.prompt_3d); }),
    'les unités réelles, adaptées à la taille : la longueur, la masse, la vitesse ; et dans le « True size » du prompt 3D');
  const eff = MONDES.every(M => fiches(M.id).every(([t, f]) => { const B = (t.populations || []).filter(p => p.effectif > 0); return f.champs.identite.effectif === B.reduce((s, p) => s + p.effectif, 0) && B.every(p => f.champs.identite.biomes.find(b => b.id === p.biome)?.effectif === p.effectif)
    && f.champs.identite.biomes.every((b, i, L) => i === 0 || b.effectif <= L[i - 1].effectif); }));
  verif(eff, 'les effectifs, biome par biome, sont ceux des populations brutes, et triés du plus peuplé au moins peuplé'); }

console.log('6. Le positif et le négatif ne se contredisent pas');
for (const M of MONDES) { const C = fiches(M.id).map(([t, f]) => [t.id, contradictions(f)]).filter(([, x]) => x.length), n = fiches(M.id).reduce((s, [, f]) => s + f.ia.negatif.split(', ').length, 0);
  verif(!C.length, `${M.id} : aucun des ${fx(n)} termes du négatif n'est dans le prompt 2D ni dans le prompt 3D de sa lignée${C.length ? ' ; en conflit : ' + quelques(C.map(([id, x]) => id + ' (' + x.join(', ') + ')')) : ''}`); }
{ const court = MONDES.flatMap(M => fiches(M.id).filter(([t, f]) => f.champs.silhouette.pattes > 0 && f.champs.silhouette.proportions?.haut?.valeur < .35)), longues = court.filter(([, f]) => /\blong[a-z ,-]*legs\b|long stride/.test(f.ia.prompt_2d.replace(/longer hind legs/g, '')));
  verif(!longues.length, `les ${court.length} lignées aux pattes courtes n'ont nulle part de « long … legs » ni de « long stride » dans leur prompt${longues.length ? ' ; si : ' + quelques(longues.map(([t]) => t.id)) : ''}`);
  const bip = MONDES.flatMap(M => fiches(M.id).filter(([, f]) => f.champs.silhouette.allure === 'bipede'));
  verif(bip.length && bip.every(([, f]) => /two small (arms|forelimbs)/.test(f.ia.prompt_2d) && !/extra limbs/.test(f.ia.negatif) && /deux petits bras/.test(section(f, 'Silhouette'))) && /digging claws on its small arms/.test(fiche('rososil').ia.prompt_2d),
    `les ${bip.length} bipèdes ont deux petits bras, comme sur les planches, et pas « extra limbs » au négatif ; rososil fouit avec les griffes de ses bras`);
  const cont = MONDES.flatMap(M => fiches(M.id).filter(([t]) => t.plan.activite === 'continue')); verif(cont.length && cont.every(([, f]) => !/une bête de jour/.test(section(f, 'Tête')) && /de jour comme de nuit/.test(f.humain)), `les ${cont.length} lignées actives jour et nuit ne sont pas dites « de jour »`);
  const pan = MONDES.flatMap(M => fiches(M.id).filter(([, f]) => f.champs.organes.some(o => o.type === 'panache') && f.famille !== 'pelage'));
  verif(pan.every(([, f]) => !/\bfur\b/.test(f.ia.prompt_2d) && !/plume plume/.test(f.ia.prompt_2d)) && !MONDES.some(M => fiches(M.id).some(([, f]) => /plume plume/.test(f.ia.prompt_2d))), `un panache prend la matière de sa famille (${pan.length} hors du poil : soies, plumes, écailles, pas de « fur ») ; plus de « plume plume »`); }

console.log('7. Le Kaume, point par point avec l\'exemple de l\'issue');
{ const f = fiche('kaume'), H = f.humain, P = f.ia.prompt_2d, N = f.ia.negatif;
  const POINTS = [
    ['identité', 'Identité', ['née au cycle 883', '**Firtis tondeur de toundra**', '`parent: "firtis"`', 'Stable', /1\s903 bêtes/, /sommets 1\s612/, 'montagne 216', 'désert froid 30', 'volcan 27', 'toundra 18']],
    ['famille', 'Famille', ['Famille `pelage`', 'quadrupède ou bipède vivipare', 'Poil court et dense', '`niche.temperature: 0.08`']],
    ['silhouette', 'Silhouette', ['Quadrupède', /42\scm de long/, /142\sg seulement/, '**très fine et légère**', 'belette aplatie', '`long: 0.73`', 'pattes **très courtes**', '`haut: 0.13`', 'cou dégagé', '`cou: 0.5`', 'queue **courte** et fine', '`queue: 0.14`']],
    ['tête', 'Tête', ['**énorme pour le corps**', '`tete: 0.9`', 'museau court', '`museau: 0.28`', '**aucune oreille visible**', '`oreilles: 0`', 'yeux de taille moyenne', 'diurne', 'bouche de brouteur']],
    ['organes', 'Organes', ['**Deux défenses droites**', 'de taille moyenne', '`taille: 0.42`', 'combat', 'pointent droit vers l\'avant', '**Un panache en touffe**', 'au bout de la queue', '`taille: 0.38`', 'parade', 'boule de poils nette et contrastée']],
    ['couleurs', 'Couleurs', ['**mauve poussiéreux** `#A6607D`', '**rayures** prune `#5B3A47`', 'du dos et des flancs', '**gris rosé** `#BCA2A6`', '**rouge** `#B65757`']],
    ['mouvement', 'Posture', ['Elle **rampe**', 'reptation', 'pattes écartées', 'scinque', /4,1 longueurs par seconde/, /1,7\sm\/s/, '×0,85 sur la vitesse', '×1,35 sur la longévité', '99', 'lente et économe']],
    ['comportement', 'Comportement', ['Diurne', 'plutôt solitaire', '`sociabilite: 0.223`', '**riposte plus souvent qu\'elle ne fuit**', '`temperament: 0.659`', 'défenses en avant', /80\s% de feuilles/, /20\s% de graines/, '6 petits par portée', 'maturité à 1,7 cycle', 'vit environ 11 cycles']],
    ['milieu', 'Milieu', ['les plus hauts sommets', '`niche.altitude: 0.97`', 'très lumineuse', '`niche.lumiere: 0.85`', 'sans aucun couvert', '`niche.couvert: 0.03`', 'rocaille', 'plaques de neige', 'lichens ras', 'ciel clair']],
    ['variations', 'Variations', ['Crépuscularité', /8,8\s%/, 'Albinisme', /0,7\s%/, 'récessif']],
    ['parenté', 'Parenté', ['**Firtis tondeur de toundra**', 'Les **défenses sont nouvelles**', '0,46 → 0,14', '0,84 → 0,73', '0,08 → 0,13', 'Même tête énorme', 'même panache', 'même robe mauve poussiéreux', 'mêmes rayures', '**ressembler au Firtis tondeur de toundra**']],
    ['interdits', 'Interdits', ['pas d\'oreilles', 'pas de cornes', 'pas de crête', 'pas d\'ailes', 'pas de carapace', 'pas d\'antennes', 'pas de défenses recourbées', 'pas de longues pattes', 'pas de longue queue', 'pas debout']],
  ];
  for (const [nom, titre, attendus] of POINTS) { const S = section(f, titre), rate = attendus.filter(a => !(a instanceof RegExp ? a.test(S) : S.includes(a)));
    verif(!rate.length, `${nom} : ${attendus.length} points de l'exemple${rate.length ? ' ; manque : ' + rate.join(' | ') : ''}`); }
  const P2 = ['[STYLE ORVANE]', 'small low-slung quadruped creature', '42 cm long and very light', 'slender elongated body', 'very short legs splayed close to the ground', 'crawling belly-low like a skink', 'Oversized broad head', 'short snout', 'visible neck',
    'earless', 'Two straight tusks pointing forward', 'tail ending in a single fluffy tuft', 'Short dense fur', 'dusty mauve #A6607D', 'dark plum stripes #5B3A47 across back and flanks', 'pale pinkish-grey belly #BCA2A6', 'red eyes #B65757', 'Full body, side three-quarter view, neutral background.'];
  const r2 = P2.filter(a => !P.includes(a)); verif(!r2.length, `le prompt 2D reprend les ${P2.length} morceaux du prompt de l'issue${r2.length ? ' ; manque : ' + r2.join(' | ') : ''}`);
  const NEG = ['ears', 'ear flaps', 'horns', 'crest', 'wings', 'shell', 'antennae', 'curved tusks', 'long legs', 'standing tall', 'long tail', 'text', 'signature'], r3 = NEG.filter(a => !N.split(', ').includes(a));
  verif(!r3.length, `le négatif reprend les ${NEG.length} termes de l'issue, et ${N.split(', ').length - NEG.length} de plus${r3.length ? ' ; manque : ' + r3.join(', ') : ''}`);
  verif(!contradictions(f).length && /earless/.test(P) && /straight tusks/.test(P) && /very short legs/.test(P) && /crawling/.test(P) && /#A6607D/.test(P), 'juste là où l\'essai s\'était trompé : pas d\'oreilles, des défenses droites, des pattes très courtes et la reptation, la robe mauve #A6607D');
  verif(f.ia.prompt_3d.includes('True size: 42 cm long, 142 g.') && /crawling pose/.test(f.ia.prompt_3d) && /plain light grey background/.test(f.ia.prompt_3d), 'le prompt 3D : la même bête, en reptation, sur fond uni, à sa taille vraie (42 cm, 142 g)');
  verif(f.ia.palette.map(x => x.hex).join(' ') === '#A6607D #5B3A47 #BCA2A6 #B65757 #60A666 #EFE7D2' && f.ia.decor.includes('snow patches') && f.ia.variantes.some(v => v.trait === 'albinisme'), 'la palette, le décor des sommets, les variantes (l\'albinos)');
  verif(H.length > 3600 * 3, `plus riche que l'exemple : ${fx(H.length)} caractères, contre ~3 600 pour la fiche écrite à la main dans l'issue`); }

console.log('8. Les cas limites');
{ const k0 = clone(parId.get('kaume')), v0 = clone(parId.get('vigie')), corpsK = k0.plan.corps;
  const avec = (o, plan = {}, corps) => ({ ...clone(k0), ...o, plan: { ...clone(k0.plan), ...plan, ...(corps !== undefined ? { corps } : {}) } });
  const juste = (f, extra = true) => bonne(f) && !sansSource(f).length && !contradictions(f).length && extra;
  const essai = (nom, t, inst, test) => { let f = null, e = null; try { f = Fiche.ecrire(t, inst || I); } catch (x) { e = x; } verif(!e && juste(f, test(f)), nom + (e ? ' : ' + e.message : f && !bonne(f) ? ' (mal formée)' : f && sansSource(f).length ? ' (sans source : ' + sansSource(f)[0] + ')' : f && contradictions(f).length ? ' (conflit : ' + contradictions(f).join(', ') + ')' : '')); return f; };
  essai('sans lignée mère : « lignée fondatrice », son dessin est la référence', avec({ id: 'essai-orpheline', parent: null }), I, f => /Lignée fondatrice/.test(section(f, 'Parenté')) && !f.champs.parente.trouve);
  essai('une mère absente de l\'instantané : dite, sans comparaison inventée', avec({ id: 'essai-x', parent: 'disparue' }), I, f => /n'est pas dans l'instantané/.test(section(f, 'Parenté')) && /`disparue`/.test(section(f, 'Identité')) && f.champs.parente.distance === undefined);
  { const I2 = clone(I), fi = I2.taxons.find(t => t.id === 'firtis'); fi.eteint = 40; fi.populations = []; fi.statut = 'eteint';
    essai('une mère éteinte : comparée quand même, et dite éteinte', I2.taxons.find(t => t.id === 'kaume'), I2, f => /éteinte au cycle 40/.test(section(f, 'Parenté')) && Number.isFinite(f.champs.parente.distance));
    essai('une lignée éteinte : aucune bête en vie, et sa date', fi, I2, f => /Aucune bête en vie/.test(section(f, 'Identité')) && /éteinte au cycle 40/.test(section(f, 'Identité')) && f.champs.identite.effectif === 0); }
  { const I2 = clone(I), ka = I2.taxons.find(t => t.id === 'kaume'); delete ka.plan.regime; delete ka.plan.activite; delete ka.plan.diete;
    essai('une fille sans régime ni heure : « non dit », rien d\'inventé', ka, I2, f => /Son régime : herbivore → non dit/.test(section(f, 'Parenté')) && /Son heure : diurne → non dit/.test(section(f, 'Parenté')) && /une bouche ordinaire/.test(section(f, 'Tête'))); }
  essai('un organe que le catalogue ne connaît pas : laissé de côté, et dit', avec({ id: 'essai-inconnu' }, {}, { ...clone(corpsK), organes: [...corpsK.organes, { type: 'lueur', taille: .5 }] }), I, f => /que le catalogue ne connaît pas/.test(section(f, 'Organes')) && /`lueur`/.test(section(f, 'Organes')));
  { const I2 = clone(I), Or = { places: ['dos'], nombre: [1, 1], formes: ['douce', 'vive'], fonction: 'parade', mot: ['lueur', 'lueurs'], fem: 1 };
    I2.catalogue.monde = { ...I2.catalogue.monde, organes: { lueur: Or } }; I2.catalogue.organes = { ...I2.catalogue.organes, lueur: { ...Or, defaut: 1 } };
    essai('un organe propre au monde (catalogue.monde) : décrit, son autre forme interdite', avec({ id: 'essai-lueur' }, {}, { ...clone(corpsK), organes: [...corpsK.organes, { type: 'lueur', taille: .6, forme: 'vive' }] }), I2,
      f => /lueur/.test(section(f, 'Organes')) && /lueur organ/.test(f.ia.prompt_2d) && f.champs.interdits.some(x => x.groupe === 'formes' && /`lueur`/.test(x.fr)));
    verif(/aucun organe `lueur`/.test(section(Fiche.ecrire(I2.taxons.find(x => x.id === 'firtis'), I2), 'Interdits')), '… et une lignée qui ne le porte pas l\'a dans ses interdits'); }
  essai('un organe à qui il manque sa forme, son nombre et sa place : « absent : par défaut »', avec({ id: 'essai-nu' }, {}, { ...clone(corpsK), organes: [{ type: 'cornes', taille: .5 }] }), I, f => /`forme` absent : "recourbees" par défaut/.test(section(f, 'Organes')) && /`nombre` absent/.test(section(f, 'Organes')));
  essai('des organes déduits des proportions d\'avant : dits déduits, le reste par défaut', avec({ id: 'essai-avant' }, {}, (() => { const c = clone(corpsK); delete c.organes; c.cornes = .5; return c; })()), I,
    f => /un organe déduit de la proportion d'avant/.test(section(f, 'Organes')) && /forme par défaut \(moteur\/corps\.js\)/.test(section(f, 'Interdits')));
  const base = { long: .5, haut: .2, cou: .2, tete: .5, museau: .3, oreilles: 0, queue: 0, motif: 'uni', couleurs: clone(corpsK.couleurs), organes: [] };
  essai('un corps rayonné qui nage : gelée, une méduse, sa cloche, ses bras comptés', avec({ id: 'essai-meduse' }, { locomotion: ['nage'] }, { ...base, forme: 'radiaire', pattes: 6 }), I,
    f => f.famille === 'gelee' && /méduse/.test(section(f, 'Famille')) && /6 bras/.test(section(f, 'Silhouette')) && /bell/.test(f.ia.prompt_2d) && /with 6 arms/.test(f.ia.prompt_2d) && !/eel/.test(f.ia.prompt_2d));
  essai('un corps rayonné du fond : gelée, une étoile', avec({ id: 'essai-etoile' }, { locomotion: ['reptation'] }, { ...base, forme: 'radiaire', pattes: 5, long: .9 }), I, f => f.famille === 'gelee' && /étoile de mer/.test(section(f, 'Famille')) && /bras \*\*très allongés\*\*/i.test(section(f, 'Silhouette')));
  essai('un corps à tentacules : gelée, une pieuvre, sans moustaches', avec({ id: 'essai-pieuvre' }, { locomotion: ['nage'] }, { ...base, forme: 'tentaculaire', pattes: 8 }), I, f => f.famille === 'gelee' && /pieuvre/.test(section(f, 'Famille')) && /8 bras/.test(section(f, 'Silhouette')) && !/whiskers/.test(f.ia.prompt_2d));
  essai('un corps segmenté à 60 pattes : chitine, 30 anneaux, sans oreilles ni queue de mammifère', avec({ id: 'essai-mille-pattes' }, { locomotion: ['marche', 'fouissage'] }, { ...base, forme: 'segmente', pattes: 60, long: .9 }), I,
    f => f.famille === 'chitine' && f.champs.famille.regle === 'chitine-segmente' && /60 pattes/.test(section(f, 'Silhouette')) && /30 anneaux/.test(section(f, 'Silhouette')) && /with 60 legs/.test(f.ia.prompt_2d) && /mammal tail/.test(f.ia.negatif));
  { const I2 = clone(I); delete I2.catalogue.monde; const s = Fiche.ecrire(avec({ id: 'essai-sans-monde' }, { locomotion: ['marche'] }, { ...base, forme: 'segmente', pattes: 24 }), I2);
    verif(juste(s) && s.famille === 'ecailles' && s.champs.silhouette.forme === 'serpent', 'dans un monde qui ne déclare pas les corps segmentés, il se lit comme le lit moteur/corps.js : un serpent'); }
  essai('une forme que personne ne connaît, qui dit son repli : lue comme son repli, et dite', avec({ id: 'essai-cristal' }, {}, { ...clone(corpsK), forme: 'cristallin', repli: 'quadrupede' }), I,
    f => f.famille === 'pelage' && /`forme: "cristallin"`, une forme que ce monde ne déclare pas : lue comme son repli, `repli: "quadrupede"`/.test(section(f, 'Silhouette')));
  essai('une forme absente : « absent : par défaut », pas citée comme une donnée', avec({ id: 'essai-sans-forme' }, {}, (() => { const c = clone(corpsK); delete c.forme; return c; })()), I, f => /`forme` absent : "quadrupede" par défaut/.test(section(f, 'Silhouette')) && !/`forme: "quadrupede"`/.test(section(f, 'Silhouette')));
  essai('une machine sans corps, à canon et à module inconnu : d\'après ses modules', { ...clone(v0), id: 'essai-machine', plan: { ...clone(v0.plan), modules: { ...v0.plan.modules, arme: .5, blindage: .6, aimant: .7 } } }, I,
    f => f.famille === 'machine' && /canon/.test(section(f, 'Organes')) && /`aimant`/.test(section(f, 'Organes')) && /cannon/.test(f.ia.prompt_2d) && !/weapons/.test(f.ia.negatif));
  essai('une machine sans taille ni masse : « taille inconnue », rien d\'inventé', (() => { const t = clone(v0); t.id = 'essai-machine-sans-taille'; delete t.plan.taille_m; delete t.plan.masse_kg; delete t.plan.longevite; return t; })(), I,
    f => /n'est pas connue/.test(section(f, 'Silhouette')) && /of unknown size/.test(f.ia.prompt_2d) && /unknown length, unknown weight/.test(f.ia.prompt_3d) && !/\b1 m\b|\b1 kg\b/.test(f.ia.prompt_2d));
  essai('une machine qui a un corps : machine, au corps décrit', { ...clone(v0), id: 'essai-machine-corps', plan: { ...clone(v0.plan), corps: clone(corpsK) } }, I, f => f.famille === 'machine' && /robotic quadruped/.test(f.ia.prompt_2d) && !/quadrupede creature/.test(f.ia.prompt_2d));
  essai('une toute petite bête : des millimètres et des milligrammes, jusque dans le « True size »', avec({ id: 'essai-puce' }, { taille_m: .004, masse_kg: .000002 }), I, f => /True size: 4 mm long, 2 mg\./.test(f.ia.prompt_3d) && /4\smm de long/.test(section(f, 'Silhouette')) && /`masse_kg: 0.000002`/.test(section(f, 'Silhouette')) && !/\(0 g\)/.test(f.ia.prompt_2d));
  essai('une queue à 0 qui porte un organe : un moignon qui le porte, pas « tailless »', avec({ id: 'essai-moignon' }, {}, { ...clone(corpsK), queue: 0 }), I, f => /moignon/.test(section(f, 'Silhouette')) && /A stub tail carrying/.test(f.ia.prompt_2d) && !/Tailless/.test(f.ia.prompt_2d));
  { const lob = MONDES[1].T.find(t => t.id === 'lobel'); if (lob) verif(juste(fiche('lobel', 'genese-2026'), /nageoire de queue \*\*minuscule\*\*/.test(section(fiche('lobel', 'genese-2026'), 'Silhouette')) && !fiche('lobel', 'genese-2026').ia.negatif.split(', ').includes('tail')), 'un poisson à `queue: 0` (lobel, genèse 2026) garde sa nageoire de queue : pas de pédoncule allongé, rien qui la contredise'); }
  essai('des couleurs manquantes : celles de moteur/corps.js, dites « par défaut »', avec({ id: 'essai-terne' }, {}, (() => { const c = clone(corpsK); delete c.couleurs; return c; })()), I, f => /`couleurs\.robe` absente/.test(section(f, 'Couleurs')) && f.champs.couleurs.robe.hex === '#968264');
  essai('un corps vide : les valeurs par défaut, chacune dite', avec({ id: 'essai-vide' }, {}, {}), I, f => (section(f, 'Silhouette').match(/absent : /g) || []).length >= 3 && f.famille === 'pelage');
  essai('la reproduction absente : déduite comme le fait moteur/ponte.js, et dite', (() => { const t = avec({ id: 'essai-sans-ponte' }); delete t.plan.reproduction; return t; })(), I, f => /déduite comme le fait moteur\/ponte\.js/.test(section(f, 'Famille')) && f.famille === 'pelage');
  essai('une lignée en colonie, qui se métamorphose, à caractère et au nom commun : tout est dit', avec({ id: 'essai-colonie', nom_commun: 'Tondeuse mauve', caractere: { hardiesse: .7, combativite: .2, opportunisme: .5 } },
    { castes: { soldats: { masse_rel: 2.5, organe: 'mandibules', part: .149 }, reine: { masse_rel: 20, ailes: true, part: .001 }, ouvrieres: { masse_rel: 1, part: .85 }, essaim: false, part: .4 }, stades: { larve: { nom: 'chenille', regime: 'herbivore', locomotion: ['reptation'], forme: 'serpent' }, adulte: { nom: 'imago' }, part: .3 } }), I,
    f => /colonie \([^)]*\) : reine \(×20 en masse, ailée\), ouvrières/.test(section(f, 'Comportement')) && /hardie/.test(section(f, 'Comportement')) && /chenille/.test(section(f, 'Silhouette')) && f.humain.startsWith('### Tondeuse mauve'));
  for (const quoi of ['ecrire', 'famille']) { let e = null; try { Fiche[quoi]({ id: 'herbe', plan: { regime: 'vegetal', forme: 'herbe' } }, I); } catch (x) { e = x; } verif(e && /herbier/.test(e.message), `une plante : ${quoi}() la refuse, et dit où trouver son dessin`); }
  for (const [nom, req] of [['un « require » qui échoue', () => { throw new Error('pas ici'); }], ['un « require » qui rend autre chose', () => ({})]]) {
    const ctx = { require: req }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(racine('monde/fiche.js'), 'utf8'), ctx); let e = null; try { ctx.OrvaneFiche.ecrire(k0, I); } catch (x) { e = x; }
    verif(e && /moteur\/corps\.js manque/.test(e.message), `${nom}, sans globalThis.OrvaneCorps : « moteur/corps.js manque », au lieu de planter plus loin`); }
  verif(Fiche.ecrire(k0, I, { style: '[ESSAI]' }).ia.prompt_2d.startsWith('[ESSAI], ') && Fiche.ecrire(k0, I).ia.prompt_2d.startsWith('[STYLE ORVANE], '), 'le style de la DA a sa place : [STYLE ORVANE], ou celui qu\'on lui donne'); }

console.log('9. Le paquet, l\'outil');
{ const P = JSON.parse(fs.readFileSync(racine('package.json'), 'utf8'));
  verif(P.files.includes('monde/fiche.js') && P.exports['./monde/fiche.js'] === './monde/fiche.js', 'package.json : monde/fiche.js dans « files » et dans « exports »');
  let soi = null; try { soi = require('orvane/monde/fiche.js'); } catch (e) { soi = e; }
  verif(soi === Fiche && require(racine('index.js')).Fiche === Fiche, 'require(\'orvane/monde/fiche.js\') et require(\'orvane\').Fiche donnent le module');
  const np = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: racine('.'), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (np.status === 0) { const F = JSON.parse(np.stdout)[0].files.map(x => x.path); verif(F.includes('monde/fiche.js') && F.includes('moteur/corps.js') && !F.some(x => x.startsWith('monde/') && x !== 'monde/fiche.js'), `npm pack l'emporte, avec moteur/corps.js, et rien d'autre de monde/ (${F.length} fichiers)`); }
  else console.log('  ⚠ npm n\'est pas là : le contenu du paquet n\'est vérifié que par « files »');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-fiches-'));
  try { const r = spawnSync(process.execPath, [racine('outils/fiches.js'), racine('mondes/orvane/instantane.json'), '--sortie', dossier], { encoding: 'utf8' }), X = fs.readdirSync(dossier), Ix = JSON.parse(fs.readFileSync(path.join(dossier, 'index.json'), 'utf8'));
    verif(r.status === 0 && X.filter(x => x.endsWith('.md')).length === 243 && X.filter(x => x.endsWith('.json')).length === 244 && Ix.lignees.length === 243 && empreinte(JSON.parse(fs.readFileSync(path.join(dossier, 'kaume.json'), 'utf8'))) === empreinte(fiche('kaume')) && r.stdout.includes(dossier),
      `outils/fiches.js écrit les 243 fiches (Markdown et JSON) et leur index, là où on lui dit (--sortie), et le dit`);
    // deux identifiants que l'ancien nom de fichier confondait
    const mini = { ...clone(I), taxons: [{ ...clone(parId.get('kaume')), id: 'a~1' }, { ...clone(parId.get('kaume')), id: 'a_1' }] }, f2 = path.join(dossier, 'mini.json'), d2 = path.join(dossier, 'mini'); fs.writeFileSync(f2, JSON.stringify(mini));
    const r2 = spawnSync(process.execPath, [racine('outils/fiches.js'), f2, '--sortie', d2], { encoding: 'utf8' }), X2 = fs.readdirSync(d2).filter(x => x.endsWith('.md')), I2 = JSON.parse(fs.readFileSync(path.join(d2, 'index.json'), 'utf8'));
    verif(r2.status === 0 && X2.length === 2 && new Set(I2.lignees.map(x => x.fichier)).size === 2, `deux lignées « a~1 » et « a_1 » : deux fichiers (${I2.lignees.map(x => x.fichier).join(', ')}), aucune n'écrase l'autre`);
    const src = fs.readFileSync(racine('outils/fiches.js'), 'utf8'); verif(/os\.tmpdir\(\), 'orvane-fiches'/.test(src), 'sans --sortie, les fiches vont hors du dépôt, dans le dossier temporaire de la machine'); }
  finally { fs.rmSync(dossier, { recursive: true, force: true }); } }

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 1)} s)`);
process.exit(ok ? 0 : 1);
