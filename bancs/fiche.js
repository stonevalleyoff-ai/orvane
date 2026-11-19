// Orvane — LE BANC DE LA FICHE DE CRÉATURE (bancs/fiche.js, docs/52)
//  1. le monde d'Orvane (cycle 44) : chaque lignée a sa fiche, sans erreur ni trou (undefined, NaN), en treize sections, et chaque
//     phrase dit sa source (une donnée, ou une règle de DA) ;
//  2. la même entrée donne la même fiche (empreinte), rien n'est modifié, l'ordre des lignées n'y fait rien, et un navigateur
//     (globalThis, sans require) écrit la même que Node ;
//  3. la table des familles : versionnée, chaque règle justifiée ; la répartition des lignées, ligne à ligne avec celle de l'issue 39 ;
//     chaque cas ambigu tranché comme le chef d'équipe l'a décidé ; les hexapodes géants ;
//  4. la famille ne dépend que du plan visuel ; une lignée et ses filles ont la même famille, sauf changement de plan ;
//  5. la fiche couvre tout : chaque champ du corps ; chaque organe présent, dans la fiche et dans le prompt ; chaque partie à 0 et
//     chaque organe absent, interdits dans la fiche et dans le négatif ; la parenté chiffrée ; les couleurs en hexadécimal et en mots ;
//  6. le Kaume : au moins aussi riche que l'exemple de l'issue, point par point, et juste là où l'essai s'était trompé ;
//  7. les cas limites : sans mère, mère absente ou éteinte, lignée éteinte, organe inconnu ou propre au monde, corps rayonné, à
//     tentacules, segmenté à 60 pattes, forme inconnue, machine sans corps, couleurs ou reproduction manquantes, une plante ;
//  8. le paquet : monde/fiche.js part dans npm (files, exports, index.js), et outils/fiches.js écrit les fiches d'un instantané.
//   node bancs/fiche.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), crypto = require('crypto'), { spawnSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Corps = require(racine('moteur/corps.js')), Ponte = require(racine('moteur/ponte.js')), Fiche = require(racine('monde/fiche.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now(), clone = o => JSON.parse(JSON.stringify(o));
const empreinte = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const brut = fs.readFileSync(racine('mondes/orvane/instantane.json'), 'utf8'), I = JSON.parse(brut), T = I.taxons, parId = new Map(T.map(t => [t.id, t]));
const TITRES = ['Identité', 'Famille visuelle et tégument', 'Silhouette', 'Tête', 'Organes', 'Couleurs', 'Posture et mouvement', 'Comportement', 'Milieu', 'Variations', 'Parenté', 'Interdits', 'Prompts'];
const SOURCE = /\([^()]*`[^`]+`|\*\((interprété|règle|lecture)/;   // une donnée entre parenthèses, ou une décision de la DA en italique
const trous = f => /undefined|NaN|Infinity|\[object /.test(JSON.stringify(f));
const section = (f, titre) => f.champs.sections.find(s => s.titre.startsWith(titre))?.phrases.join('\n') || '';
const bonne = f => f && Fiche.FAMILLES[f.famille] && typeof f.humain === 'string' && f.humain.length > 500 && f.ia.prompt_2d.startsWith(f.ia.style) && f.ia.prompt_3d && f.ia.negatif
  && f.ia.palette.length >= 4 && f.ia.palette.every(x => /^#[0-9A-F]{6}$/.test(x.hex) && x.en && x.fr) && f.champs.sections.length === 13 && f.champs.sections.every((s, i) => s.titre.startsWith(TITRES[i]))
  && TITRES.every(x => f.humain.includes('**' + x)) && !trous(f);
const sansSource = f => f.champs.sections.flatMap(s => s.phrases.filter(ph => !SOURCE.test(ph)).map(ph => s.titre + ' : ' + ph.slice(0, 90)));

console.log('1. Le monde d\'Orvane : une fiche par lignée');
const FI = new Map(), mal = [];
for (const t of T) { try { FI.set(t.id, Fiche.ecrire(t, I)); } catch (e) { mal.push(t.id + ' (' + e.message + ')'); } }
const L = [...FI.values()];
verif(T.length === 243 && FI.size === 243 && !mal.length, `${FI.size} fiches sur ${T.length} lignées, aucune erreur${mal.length ? ' ; en échec : ' + mal.slice(0, 5).join(', ') : ''}`);
{ const pas = [...FI].filter(([, f]) => !bonne(f)).map(([id]) => id);
  verif(!pas.length, `chacune a sa famille, ses treize sections dans l'ordre, ses prompts 2D et 3D, son négatif et sa palette en hexadécimal${pas.length ? ' ; pas : ' + pas.slice(0, 6).join(', ') : ''}`);
  const tr = L.filter(trous).length; verif(!tr, `aucune ne contient undefined, NaN, Infinity ni [object …]${tr ? ' (' + tr + ')' : ''}`);
  const S = L.flatMap(sansSource), n = L.reduce((s, f) => s + f.champs.sections.reduce((a, x) => a + x.phrases.length, 0), 0);
  verif(!S.length, `chaque phrase dit sa source, une donnée \`(champ: valeur)\` ou une règle de DA *(interprété : …)* : ${fx(n)} phrases${S.length ? ' ; sans source : ' + S.slice(0, 3).join(' | ') : ''}`);
  const tailles = L.map(f => f.humain.length); verif(Math.min(...tailles) > 3000, `des fiches riches : de ${fx(Math.min(...tailles))} à ${fx(Math.max(...tailles))} caractères en Markdown, ${fx(tailles.reduce((a, b) => a + b, 0) / tailles.length)} en moyenne`); }

console.log('2. La même entrée, la même fiche');
{ const A = T.map(t => empreinte(FI.get(t.id))), B = T.map(t => empreinte(Fiche.ecrire(t, I))), I2 = clone(I), C2 = T.map(t => empreinte(Fiche.ecrire(I2.taxons.find(x => x.id === t.id), I2)));
  verif(A.every((x, i) => x === B[i] && x === C2[i]), `deux fois, et sur une copie de l'instantané : les ${A.length} mêmes empreintes (le Kaume : ${empreinte(FI.get('kaume'))})`);
  verif(JSON.stringify(I) === brut.trim() || empreinte(JSON.parse(brut)) === empreinte(I), 'l\'instantané n\'a pas bougé d\'un caractère');
  const Inv = { ...clone(I), taxons: clone(I.taxons).reverse() }, D = T.filter(t => empreinte(Fiche.ecrire(Inv.taxons.find(x => x.id === t.id), Inv)) !== empreinte(FI.get(t.id))).map(t => t.id);
  verif(!D.length, `l'ordre des lignées n'y fait rien : la liste à l'envers donne les mêmes fiches${D.length ? ' ; sauf : ' + D.slice(0, 5).join(', ') : ''}`);
  const s0 = Corps.normaliser({ forme: 'segmente' }).forme; Fiche.ecrire(T.find(t => t.id === 'kaume'), I); const s1 = Corps.normaliser({ forme: 'segmente' }).forme;
  verif(s0 === s1, `moteur/corps.js retrouve son état après la fiche (les formes du monde ne restent pas posées : « segmente » se lit ${s1})`);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(racine('moteur/corps.js'), 'utf8'), ctx); vm.runInContext(fs.readFileSync(racine('monde/fiche.js'), 'utf8'), ctx);
  const nav = ctx.OrvaneFiche, egal = nav && T.every(t => empreinte(JSON.parse(JSON.stringify(nav.ecrire(t, I)))) === empreinte(FI.get(t.id)));
  verif(nav && typeof ctx.OrvaneCorps === 'object' && egal, 'dans un navigateur (globalThis.OrvaneFiche, après moteur/corps.js, sans require) : les 243 mêmes fiches que dans Node'); }

console.log('3. La table des familles');
{ const Tb = Fiche.table(), R = Fiche.REGLES, D = Fiche.DETAILS;
  verif(Fiche.VERSION === '1.0' && Tb.version === Fiche.VERSION && JSON.stringify(Tb) === JSON.stringify(Fiche.table()) && Object.keys(Tb.familles).length === 8,
    `versionnée (${Fiche.VERSION}), exportée en JSON : ${Object.keys(Tb.familles).join(', ')}`);
  verif(R.every(r => r.id && Fiche.FAMILLES[r.famille] && r.quand && /\.$/.test(r.pourquoi) && typeof r.si === 'function') && D.every(d => d.id && d.pourquoi && /\.$/.test(d.pourquoi)) && Object.keys(Fiche.FAMILLES).every(f => R.some(r => r.famille === f)),
    `${R.length} règles, dans l'ordre, et ${D.length} détails du tégument : chacun dit quand et pourquoi, en une phrase ; chaque famille a sa règle`);
  const cpt = {}; for (const f of L) cpt[f.famille] = (cpt[f.famille] || 0) + 1;
  verif(Object.values(cpt).reduce((a, b) => a + b, 0) === 243, `la répartition : ${Object.entries(cpt).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', ')}`);
  // la table de l'issue (une carapace au-delà de 0,3, comme elle les a comptées) : chaque ligne, et la famille qu'elle reçoit
  const lire = t => { const p = t.plan, c = p.corps && Corps.normaliser(p.corps), al = c && Corps.allure(c, p), ca = c && c.carapace > .3, ailes = c && c.organes.some(o => o.type === 'ailes');
    return !c ? 'sans corps (synthetique)' : al === 'poisson' ? 'poisson (allure)' : c.forme === 'oiseau' ? 'oiseau' : c.forme === 'bipede' ? 'bipède' : c.forme === 'serpent' ? 'serpent, ovipare, terrestre'
      : c.forme === 'hexapode' ? (ca ? 'hexapode, ovipare, carapace' : 'hexapode, ovipare, sans carapace') : p.reproduction === 'vivipare' ? (ailes ? 'quadrupède, vivipare, ailé' : 'quadrupède, vivipare') : ca ? 'quadrupède, ovipare, carapace' : 'quadrupède, ovipare, sans carapace'; };
  const ISSUE = [['quadrupède, vivipare', 87, { pelage: 87 }], ['hexapode, ovipare, carapace', 52, { chitine: 52 }], ['poisson (allure)', 31, { ecailles: 31 }], ['quadrupède, ovipare, carapace', 27, { cuirasse: 27 }],
    ['hexapode, ovipare, sans carapace', 22, { chitine: 22 }], ['serpent, ovipare, terrestre', 10, { ecailles: 10 }], ['oiseau', 4, { plumage: 4 }], ['quadrupède, ovipare, sans carapace', 4, { ecailles: 2, 'peau-nue': 1, cuirasse: 1 }],
    ['bipède', 3, { pelage: 1, cuirasse: 2 }], ['quadrupède, vivipare, ailé', 1, { pelage: 1 }], ['sans corps (synthetique)', 2, { machine: 2 }]];
  for (const [ligne, n, attendu] of ISSUE) { const X = T.filter(t => lire(t) === ligne), got = {}; for (const t of X) got[FI.get(t.id).famille] = (got[FI.get(t.id).famille] || 0) + 1;
    const qui = X.length <= 4 ? ' (' + X.map(t => t.id + ' → ' + FI.get(t.id).famille).join(', ') + ')' : '';
    verif(X.length === n && Object.keys(attendu).every(f => got[f] === attendu[f]) && Object.keys(got).every(f => attendu[f]), `${ligne} : ${X.length} lignées (l'issue : ${n}) → ${Object.entries(got).map(([f, k]) => f + ' ' + k).join(', ')}${qui}`); }
  const fam = id => FI.get(id).champs.famille, det = id => fam(id).details.map(d => d.id);
  const Q = T.filter(t => lire(t) === 'quadrupède, ovipare, carapace'), nage = Q.filter(t => t.plan.locomotion.includes('nage'));
  verif(nage.length === 14 && nage.every(t => det(t.id).includes('cuirasse-nageur') && /low-domed smooth streamlined|low smooth streamlined/.test(FI.get(t.id).ia.prompt_2d)) && Q.filter(t => !nage.includes(t)).every(t => det(t.id).includes('cuirasse-terre')),
    'quadrupède ovipare à carapace → cuirasse : basse, lisse et profilée chez les 14 nageuses (tortue d\'eau), haute et en plaques chez les 13 autres');
  verif([...FI.values()].filter(f => f.famille === 'cuirasse').every(f => /crab claws/.test(f.ia.negatif) && /pas de pinces de crabe/.test(section(f, 'Interdits'))), 'une cuirasse n\'a jamais de pinces : « pas de pinces de crabe », « crab claws » au négatif, pour les 30');
  verif(fam('talo').regle === 'ecailles-lezard' && fam('anloro').regle === 'ecailles-lezard' && fam('visiltor').regle === 'peau-nue' && fam('anrogra').regle === 'cuirasse',
    'quadrupède ovipare sans carapace : talo et anloro → écailles (lézards, ils ne nagent pas), visiltor → peau-nue (il nage) ; anrogra porte une carapace de 0,3, que l\'issue ne comptait pas : → cuirasse');
  const ser = T.filter(t => lire(t) === 'serpent, ovipare, terrestre');
  verif(ser.every(t => fam(t.id).regle === 'ecailles-serpent' && det(t.id).includes('ecailles-serpent')) && T.filter(t => lire(t) === 'poisson (allure)').every(t => fam(t.id).regle === 'ecailles-poisson'),
    `serpent terrestre → écailles de serpent (les ${ser.length}, dont ${ser.filter(t => t.plan.locomotion.includes('nage')).length} qui nagent aussi) ; un serpent qui ne fait que nager → écailles de poisson (les 31)`);
  verif(fam('phebel').id === 'pelage' && fam('umeouro').id === 'cuirasse' && fam('rososil').id === 'cuirasse' && det('rososil').includes('cuirasse-nageur') && det('umeouro').includes('cuirasse-terre'),
    'bipède vivipare (phebel) → pelage ; bipèdes ovipares à carapace → cuirasse (umeouro sur terre, rososil qui nage)');
  const re = FI.get('renel'), ail = re.champs.organes.find(o => o.type === 'ailes');
  verif(re.famille === 'pelage' && ail?.forme === 'plumes' && ail.nombre === 3 && /trois ailes de plumes/i.test(section(re, 'Organes')) && /membranous bat wings/.test(re.ia.negatif) && /feathered body/.test(re.ia.negatif),
    'renel, quadrupède vivipare ailé → pelage ; ses organes disent trois ailes de plumes, pas de peau : la chauve-souris est écartée (« membranous bat wings », « feathered body » au négatif)');
  const viv = T.filter(t => t.plan.corps && t.plan.reproduction === 'vivipare' && Corps.normaliser(t.plan.corps).organes.some(o => o.type === 'carapace'));
  verif(viv.length === 4 && viv.every(t => FI.get(t.id).famille === 'pelage' && det(t.id).includes('pelage-carapace')), `les ${viv.length} vivipares à carapace (${viv.map(t => t.id).join(', ')}) → pelage, une carapace de tatou sur le dos (un cas que l'issue comptait parmi les 87)`);
  const H = T.filter(t => t.plan.corps?.forme === 'hexapode'), G = H.filter(t => t.plan.masse_kg >= 1), max = H.reduce((a, t) => t.plan.masse_kg > a.plan.masse_kg ? t : a);
  verif(H.every(t => FI.get(t.id).famille === 'chitine') && G.length && G.every(t => det(t.id).includes('chitine-geant') && /not toy-like/.test(FI.get(t.id).ia.prompt_2d)) && H.filter(t => t.plan.masse_kg < 1).every(t => !det(t.id).includes('chitine-geant')) && det(max.id).includes('chitine-colosse'),
    `les ${H.length} hexapodes gardent la chitine ; les ${G.length} de 1 kg et plus ont une cuticule épaisse, mate, en plaques (« not toy-like »), et le plus lourd (${max.id}, ${fx(max.plan.masse_kg, 1)} kg) des pattes comme des piliers`);
  verif(['vigie', 'ferrailleur'].every(id => FI.get(id).famille === 'machine' && FI.get(id).champs.silhouette.machine && /modules\./.test(section(FI.get(id), 'Organes'))), 'synthétiques sans corps → machine, décrites d\'après leurs modules');
  const sans = T.filter(t => t.plan.corps).map(t => { const p = { ...t.plan }; delete p.reproduction; return [t, Fiche.modeDe(p), Ponte.modeDe(p)]; });
  verif(sans.every(([, a, b]) => a === b), `sans « reproduction », la fiche la déduit comme moteur/ponte.js (modeDe) : la même réponse pour les ${sans.length} corps`); }

console.log('4. La famille suit le plan visuel, de la mère aux filles');
{ const G = new Map(); for (const t of T) { const k = JSON.stringify(Fiche.famille(t, I).cle), f = FI.get(t.id).famille; (G.get(k) || G.set(k, new Set()).get(k)).add(f); }
  verif([...G.values()].every(s => s.size === 1), `la famille ne dépend que du plan visuel (forme et allure, reproduction, carapace, nage) : ${G.size} plans visuels, une famille chacun`);
  const P = T.filter(t => t.parent && parId.has(t.parent)), meme = P.filter(t => FI.get(t.id).famille === FI.get(t.parent).famille), ch = P.filter(t => !meme.includes(t));
  const raison = t => FI.get(t.id).champs.parente.famille_parent !== FI.get(t.id).famille && /parce que son plan a changé/.test(section(FI.get(t.id), 'Parenté'));
  const memeCle = P.filter(t => JSON.stringify(Fiche.famille(t, I).cle) === JSON.stringify(Fiche.famille(parId.get(t.parent), I).cle));
  verif(memeCle.every(t => FI.get(t.id).famille === FI.get(t.parent).famille) && ch.every(t => JSON.stringify(Fiche.famille(t, I).cle) !== JSON.stringify(Fiche.famille(parId.get(t.parent), I).cle)) && ch.every(raison),
    `${P.length} lignées et leur mère : ${meme.length} dans la même famille ; les ${ch.length} autres ont changé de plan, et leur fiche dit lequel`);
  const parType = {}; for (const t of ch) { const k = FI.get(t.parent).famille + ' → ' + FI.get(t.id).famille; parType[k] = (parType[k] || 0) + 1; }
  console.log('     ' + Object.entries(parType).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' ; '));
  const fil = T.filter(t => T.some(x => x.parent === t.id));
  verif(fil.every(t => FI.get(t.id).champs.parente.filles.length === T.filter(x => x.parent === t.id).length && FI.get(t.id).champs.parente.filles.every(f => f.famille === FI.get(f.id).famille)),
    `les ${fil.length} lignées mères citent toutes leurs filles, avec leur famille`); }

console.log('5. La fiche couvre tout');
{ const CHAMPS = ['forme', 'pattes', 'long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue', 'cornes', 'crete', 'ailes', 'carapace', 'antennes', 'motif', 'organes', 'couleurs', 'posture'];
  const corps = T.filter(t => t.plan.corps), CO = I.catalogue.organes;
  const manque = corps.flatMap(t => CHAMPS.filter(k => !new RegExp('`' + k + '[`:. \\[]').test(FI.get(t.id).humain)).map(k => t.id + ':' + k));
  verif(!manque.length, `chacun des ${CHAMPS.length} champs du corps est cité avec sa valeur, dans les ${corps.length} fiches à corps${manque.length ? ' ; manque : ' + manque.slice(0, 6).join(', ') : ''}`);
  const org = corps.flatMap(t => { const f = FI.get(t.id), S = section(f, 'Organes').toLowerCase();
    return f.champs.organes.filter(o => !S.includes((CO[o.type].mot[o.nombre > 1 ? 1 : 0]).toLowerCase()) || !f.ia.prompt_2d.toLowerCase().includes(o.en.toLowerCase())).map(o => t.id + ':' + o.type); });
  const nOrg = corps.reduce((s, t) => s + FI.get(t.id).champs.organes.length, 0);
  verif(!org.length, `chaque organe présent (${nOrg} en tout) est dans la fiche, avec son nombre, sa place, sa taille, sa forme et sa fonction, et dans le prompt 2D${org.length ? ' ; manque : ' + org.slice(0, 5).join(', ') : ''}`);
  const fonc = corps.flatMap(t => FI.get(t.id).champs.organes.filter(o => !section(FI.get(t.id), 'Organes').includes('catalogue.organes.' + o.type + '.fonction')).map(o => t.id + ':' + o.type));
  verif(!fonc.length, 'la fonction de chaque organe vient du catalogue de l\'instantané (`catalogue.organes.<type>.fonction`)');
  const zero = corps.flatMap(t => { const f = FI.get(t.id), S = section(f, 'Interdits'), P = f.champs.silhouette.proportions;
    return ['cou', 'museau', 'oreilles', 'queue'].filter(k => P[k].valeur === 0 && !(k === 'museau' && f.champs.silhouette.allure === 'oiseau') && !S.includes('`' + k + ': 0`')).map(k => t.id + ':' + k); });
  const nZero = corps.reduce((s, t) => s + ['cou', 'museau', 'oreilles', 'queue'].filter(k => FI.get(t.id).champs.silhouette.proportions[k].valeur === 0).length, 0);
  verif(!zero.length, `chaque partie à 0 est interdite, avec sa valeur (${nZero} parties à 0)${zero.length ? ' ; manque : ' + zero.slice(0, 5).join(', ') : ''}`);
  const abs = corps.flatMap(t => { const f = FI.get(t.id), S = section(f, 'Interdits'), la = new Set(f.champs.organes.map(o => o.type)), A = Object.keys(CO).filter(x => !la.has(x));
    const I2 = f.champs.interdits.filter(x => x.groupe === 'organes');
    return A.filter(x => !S.includes('aucun organe `' + x + '`') && !S.includes('`' + x + ': 0`')).map(x => t.id + ':' + x).concat(I2.length !== A.length || I2.some(x => !x.en && !(f.famille === 'plumage')) || I2.some(x => x.en && !x.en.split(', ').every(w => f.ia.negatif.includes(w))) ? [t.id + ':négatif'] : []); });
  verif(!abs.length, `chaque organe du catalogue absent du plan est interdit, dans la fiche et au négatif (${fx(corps.reduce((s, t) => s + 16 - FI.get(t.id).champs.organes.length, 0))} interdits d'organes)${abs.length ? ' ; manque : ' + abs.slice(0, 5).join(', ') : ''}`);
  const formes = corps.flatMap(t => FI.get(t.id).champs.organes.flatMap(o => CO[o.type].formes.filter(x => x !== o.forme).length && !FI.get(t.id).champs.interdits.some(x => x.groupe === 'formes' && x.fr.includes('`' + o.type + '`')) ? [t.id + ':' + o.type] : []));
  verif(!formes.length, 'et les formes qu\'un organe présent n\'a pas : des défenses droites interdisent les défenses recourbées');
  const neg = L.filter(f => f.champs.interdits.some(x => x.en && !x.en.split(', ').every(w => f.ia.negatif.includes(w))));
  verif(!neg.length && L.every(f => f.ia.negatif.split(', ').length >= 10), `le négatif reprend chaque interdit, en anglais (de ${Math.min(...L.map(f => f.ia.negatif.split(', ').length))} à ${Math.max(...L.map(f => f.ia.negatif.split(', ').length))} termes)`);
  const avecMere = T.filter(t => t.parent && parId.has(t.parent) && t.plan.corps && parId.get(t.parent).plan.corps);
  verif(avecMere.every(t => { const pa = FI.get(t.id).champs.parente; return pa.trouve && Number.isFinite(pa.distance) && Array.isArray(pa.nouveaux) && Array.isArray(pa.perdus) && /OrvaneCorps\.distance/.test(section(FI.get(t.id), 'Parenté')); }),
    `la parenté de ${avecMere.length} lignées est chiffrée : ce qui est nouveau, perdu, ce qui a bougé de 0,05 et plus, l'écart de silhouette, l'air de famille`);
  const hexOk = corps.every(t => { const f = FI.get(t.id), K = t.plan.corps.couleurs, h = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    return ['robe', 'sombre', 'ventre', 'oeil'].every(r => f.champs.couleurs[r].hex === h(K[r]) && section(f, 'Couleurs').includes(h(K[r])) && f.champs.couleurs[r].fr && f.champs.couleurs[r].en); });
  verif(hexOk, 'les quatre couleurs de chaque corps : en hexadécimal, avec leur rôle et un nom en mots, en français et en anglais');
  const noms = new Set(corps.flatMap(t => ['robe', 'sombre', 'ventre', 'oeil'].map(r => FI.get(t.id).champs.couleurs[r].fr)));
  verif(noms.size >= 25 && Fiche.nomCouleur([166, 96, 125]).fr === 'mauve poussiéreux' && Fiche.nomCouleur([91, 58, 71]).fr === 'prune' && Fiche.nomCouleur([188, 162, 166]).fr === 'gris rosé' && Fiche.nomCouleur([182, 87, 87]).fr === 'rouge',
    `la table des teintes : ${noms.size} noms différents sur le monde ; le Kaume a la robe mauve poussiéreux, le sombre prune, le ventre gris rosé, l'œil rouge, comme dans l'issue`);
  const unites = corps.every(t => { const f = FI.get(t.id), S = section(f, 'Silhouette'), M = section(f, 'Posture'); return /\d\s(cm|m|mm)\b/.test(S) && /\d\s(g|kg|t)\b/.test(S) && /longueurs par seconde/.test(M) && /(m|cm)\/s/.test(M); });
  verif(unites, 'les unités réelles : la longueur et la masse, la vitesse en longueurs par seconde et en m/s');
  const eff = L.every(f => { const B = f.champs.identite.biomes; return B.every((b, i) => i === 0 || b.effectif <= B[i - 1].effectif) && B.reduce((s, b) => s + b.effectif, 0) === f.champs.identite.effectif; });
  verif(eff, 'les effectifs par biome, du plus peuplé au moins peuplé, et leur somme'); }

console.log('6. Le Kaume, point par point avec l\'exemple de l\'issue');
{ const f = FI.get('kaume'), H = f.humain, P = f.ia.prompt_2d, N = f.ia.negatif;
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
  verif(!/\b(ears|curved|long legs|standing)\b/.test(P.replace('earless', '')) && /earless/.test(P) && /straight tusks/.test(P) && /very short legs/.test(P) && /crawling/.test(P) && /#A6607D/.test(P) && !/grey(?!.*belly)/.test(P.split('belly')[0].replace('pinkish-grey', '')),
    'juste là où l\'essai s\'était trompé : pas d\'oreilles, des défenses droites, des pattes très courtes et la reptation, la robe mauve #A6607D (et non gris rosé)');
  verif(f.ia.prompt_3d.includes('Real scale: 0.42 m long, 0.142 kg') && /crawling pose/.test(f.ia.prompt_3d) && /plain light grey background/.test(f.ia.prompt_3d), 'le prompt 3D : la même bête, en reptation, sur fond uni, à sa taille vraie (0,42 m, 142 g)');
  verif(f.ia.palette.map(x => x.hex).join(' ') === '#A6607D #5B3A47 #BCA2A6 #B65757 #60A666 #EFE7D2' && f.ia.decor.includes('snow patches') && f.ia.variantes.some(v => v.trait === 'albinisme'),
    'la palette (robe, sombre, ventre, œil, puis l\'accent du panache et l\'ivoire des défenses), le décor des sommets, les variantes (l\'albinos)');
  const longueur = H.length, exemple = 2850; verif(longueur > exemple * 3, `plus riche que l'exemple : ${fx(longueur)} caractères, contre ~${fx(exemple)} pour la fiche écrite à la main`); }

console.log('7. Les cas limites');
{ const k0 = clone(T.find(t => t.id === 'kaume')), v0 = clone(T.find(t => t.id === 'vigie')), corpsK = k0.plan.corps;
  const avec = (o, plan = {}, corps) => ({ ...clone(k0), ...o, plan: { ...clone(k0.plan), ...plan, ...(corps !== undefined ? { corps } : {}) } });
  const juste = (f, extra = true) => bonne(f) && !sansSource(f).length && extra;
  const essai = (nom, t, inst, test) => { let f = null, e = null; try { f = Fiche.ecrire(t, inst || I); } catch (x) { e = x; } verif(!e && juste(f, test(f)), nom + (e ? ' : ' + e.message : '')); return f; };
  essai('sans lignée mère : « lignée fondatrice », son dessin est la référence', avec({ id: 'essai-orpheline', parent: null }), I, f => /Lignée fondatrice/.test(section(f, 'Parenté')) && !f.champs.parente.trouve);
  essai('une mère absente de l\'instantané : dite, sans comparaison inventée', avec({ id: 'essai-x', parent: 'disparue' }), I, f => /n'est pas dans l'instantané/.test(section(f, 'Parenté')) && /`disparue`/.test(section(f, 'Identité')) && f.champs.parente.distance === undefined);
  { const I2 = clone(I), fi = I2.taxons.find(t => t.id === 'firtis'); fi.eteint = 40; fi.populations = []; fi.statut = 'eteint';
    essai('une mère éteinte : comparée quand même, et dite éteinte', I2.taxons.find(t => t.id === 'kaume'), I2, f => /éteinte au cycle 40/.test(section(f, 'Parenté')) && Number.isFinite(f.champs.parente.distance));
    essai('une lignée éteinte : aucune bête en vie, et sa date', fi, I2, f => /Aucune bête en vie/.test(section(f, 'Identité')) && /éteinte au cycle 40/.test(section(f, 'Identité')) && f.champs.identite.effectif === 0); }
  essai('un organe que le catalogue ne connaît pas : laissé de côté, et dit', avec({ id: 'essai-inconnu' }, {}, { ...clone(corpsK), organes: [...corpsK.organes, { type: 'lueur', taille: .5 }] }), I, f => /que le catalogue ne connaît pas/.test(section(f, 'Organes')) && /`lueur`/.test(section(f, 'Organes')));
  { const I2 = clone(I), O = { places: ['dos'], nombre: [1, 1], formes: ['douce', 'vive'], fonction: 'parade', mot: ['lueur', 'lueurs'], fem: 1 };
    I2.catalogue.monde = { ...I2.catalogue.monde, organes: { lueur: O } }; I2.catalogue.organes = { ...I2.catalogue.organes, lueur: { ...O, defaut: 1 } };
    const t = avec({ id: 'essai-lueur' }, {}, { ...clone(corpsK), organes: [...corpsK.organes, { type: 'lueur', taille: .6, forme: 'vive' }] });
    essai('un organe propre au monde (catalogue.monde) : décrit, sa forme interdite dans l\'autre, et interdit chez les autres', t, I2, f => /lueur/.test(section(f, 'Organes')) && /lueur organ/.test(f.ia.prompt_2d) && f.champs.interdits.some(x => x.groupe === 'formes' && /`lueur`/.test(x.fr)));
    const autre = Fiche.ecrire(I2.taxons.find(x => x.id === 'firtis'), I2); verif(/aucun organe `lueur`/.test(section(autre, 'Interdits')), '… et une lignée qui ne le porte pas l\'a dans ses interdits'); }
  const base = { long: .5, haut: .2, cou: .2, tete: .5, museau: .3, oreilles: 0, queue: 0, motif: 'uni', couleurs: clone(corpsK.couleurs), organes: [] };
  essai('un corps rayonné qui nage : gelée, une méduse, en pleine eau, ses bras comptés', avec({ id: 'essai-meduse' }, { locomotion: ['nage'] }, { ...base, forme: 'radiaire', pattes: 6 }), I,
    f => f.famille === 'gelee' && /méduse/.test(section(f, 'Famille')) && /6 bras/.test(section(f, 'Silhouette')) && /En pleine eau/.test(section(f, 'Silhouette')) && /with 6 arms/.test(f.ia.prompt_2d));
  essai('un corps rayonné du fond : gelée, une étoile', avec({ id: 'essai-etoile' }, { locomotion: ['reptation'] }, { ...base, forme: 'radiaire', pattes: 5 }), I, f => f.famille === 'gelee' && /étoile de mer/.test(section(f, 'Famille')));
  essai('un corps à tentacules : gelée, une pieuvre', avec({ id: 'essai-pieuvre' }, { locomotion: ['nage'] }, { ...base, forme: 'tentaculaire', pattes: 8 }), I, f => f.famille === 'gelee' && /pieuvre/.test(section(f, 'Famille')) && /8 bras/.test(section(f, 'Silhouette')));
  essai('un corps segmenté à 60 pattes : chitine, 30 anneaux, sans oreilles ni queue de mammifère', avec({ id: 'essai-mille-pattes' }, { locomotion: ['marche', 'fouissage'] }, { ...base, forme: 'segmente', pattes: 60, long: .9 }), I,
    f => f.famille === 'chitine' && f.champs.famille.regle === 'chitine-segmente' && /60 pattes/.test(section(f, 'Silhouette')) && /30 anneaux/.test(section(f, 'Silhouette')) && /with 60 legs/.test(f.ia.prompt_2d) && /mammal tail/.test(f.ia.negatif) && /\bears\b/.test(f.ia.negatif));
  { const I2 = clone(I); delete I2.catalogue.monde; const s = Fiche.ecrire(avec({ id: 'essai-sans-monde' }, { locomotion: ['marche'] }, { ...base, forme: 'segmente', pattes: 24 }), I2);
    verif(juste(s) && s.famille === 'ecailles' && s.champs.silhouette.forme === 'serpent', 'dans un monde qui ne déclare pas les corps segmentés, il se lit comme le lit moteur/corps.js : un serpent'); }
  essai('une forme que personne ne connaît, qui dit son repli : lue comme son repli, et dite', avec({ id: 'essai-cristal' }, {}, { ...clone(corpsK), forme: 'cristallin', repli: 'quadrupede' }), I,
    f => f.famille === "pelage" && /`forme: "cristallin"`, une forme que ce monde ne déclare pas : lue comme son repli, `repli: "quadrupede"`/.test(section(f, "Silhouette")));
  essai('une machine sans corps, à canon et à module inconnu : décrite d\'après ses modules', { ...clone(v0), id: 'essai-machine', plan: { ...clone(v0.plan), modules: { ...v0.plan.modules, arme: .5, blindage: .6, aimant: .7 } } }, I,
    f => f.famille === 'machine' && /canon/.test(section(f, 'Organes')) && /`aimant`/.test(section(f, 'Organes')) && /cannon/.test(f.ia.prompt_2d) && /armored/.test(f.ia.prompt_2d) && !/weapons/.test(f.ia.negatif));
  essai('des couleurs manquantes : celles de moteur/corps.js, dites « par défaut »', avec({ id: 'essai-terne' }, {}, (() => { const c = clone(corpsK); delete c.couleurs; return c; })()), I,
    f => /`couleurs\.robe` absente/.test(section(f, 'Couleurs')) && f.champs.couleurs.robe.hex === '#968264');
  essai('un corps vide : les valeurs par défaut, chacune dite', avec({ id: 'essai-vide' }, {}, {}), I, f => (section(f, 'Silhouette').match(/absent : /g) || []).length >= 3 && f.famille === 'pelage');
  essai('la reproduction absente : déduite comme le fait moteur/ponte.js, et dite', (() => { const t = avec({ id: 'essai-sans-ponte' }); delete t.plan.reproduction; return t; })(), I,
    f => /déduite comme le fait moteur\/ponte\.js/.test(section(f, 'Famille')) && f.famille === 'pelage');
  essai('une lignée en colonie, qui se métamorphose, à caractère et au nom commun : tout est dit', avec({ id: 'essai-colonie', nom_commun: 'Tondeuse mauve', caractere: { hardiesse: .7, combativite: .2, opportunisme: .5 } },
    { castes: { reine: { masse_rel: 20, ailes: true, part: .001 }, ouvrieres: { masse_rel: 1, part: .85 }, soldats: { masse_rel: 2.5, organe: 'mandibules', part: .149 }, essaim: false, part: .4 }, stades: { larve: { nom: 'chenille', regime: 'herbivore', locomotion: ['reptation'], forme: 'serpent' }, adulte: { nom: 'imago' }, part: .3 } }), I,
    f => /colonie/.test(section(f, 'Comportement')) && /hardie/.test(section(f, 'Comportement')) && /chenille/.test(section(f, 'Silhouette')) && f.humain.startsWith('### Tondeuse mauve'));
  { let e = null; try { Fiche.ecrire({ id: 'herbe', plan: { regime: 'vegetal', forme: 'herbe' } }, I); } catch (x) { e = x; }
    verif(e && /herbier/.test(e.message), 'une plante : refusée, avec où trouver son dessin (monde/herbier.js)'); }
  verif(Fiche.ecrire(k0, I, { style: '[ESSAI]' }).ia.prompt_2d.startsWith('[ESSAI], ') && Fiche.ecrire(k0, I).ia.prompt_2d.startsWith('[STYLE ORVANE], '), 'le style de la DA a sa place : [STYLE ORVANE], ou celui qu\'on lui donne'); }

console.log('8. Le paquet, l\'outil');
{ const P = JSON.parse(fs.readFileSync(racine('package.json'), 'utf8'));
  verif(P.files.includes('monde/fiche.js') && P.exports['./monde/fiche.js'] === './monde/fiche.js', 'package.json : monde/fiche.js dans « files » et dans « exports »');
  let soi = null; try { soi = require('orvane/monde/fiche.js'); } catch (e) { soi = e; }
  verif(soi === Fiche && require(racine('index.js')).Fiche === Fiche, 'require(\'orvane/monde/fiche.js\') et require(\'orvane\').Fiche donnent le module');
  const np = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: racine('.'), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (np.status === 0) { const J = JSON.parse(np.stdout), F = J[0].files.map(x => x.path); verif(F.includes('monde/fiche.js') && F.includes('moteur/corps.js') && !F.some(x => x.startsWith('monde/') && x !== 'monde/fiche.js'), `npm pack l'emporte, avec moteur/corps.js, et rien d'autre de monde/ (${F.length} fichiers)`); }
  else console.log('  ⚠ npm n\'est pas là : le contenu du paquet n\'est vérifié que par « files »');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-fiches-'));
  try { const r = spawnSync(process.execPath, [racine('outils/fiches.js'), racine('mondes/orvane/instantane.json'), '--dossier', dossier], { encoding: 'utf8' }), X = fs.readdirSync(dossier), Ix = JSON.parse(fs.readFileSync(path.join(dossier, 'index.json'), 'utf8'));
    const k = JSON.parse(fs.readFileSync(path.join(dossier, 'kaume.json'), 'utf8'));
    verif(r.status === 0 && X.filter(x => x.endsWith('.md')).length === 243 && X.filter(x => x.endsWith('.json')).length === 244 && Ix.lignees.length === 243 && Object.values(Ix.familles).reduce((a, b) => a + b, 0) === 243 && empreinte(k) === empreinte(FI.get('kaume')),
      `outils/fiches.js écrit les 243 fiches (Markdown et JSON) et leur index : ${r.stdout.trim().replace(/^243 fiches dans \S+ : /, '')}`); }
  finally { fs.rmSync(dossier, { recursive: true, force: true }); } }

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 1)} s)`);
process.exit(ok ? 0 : 1);
