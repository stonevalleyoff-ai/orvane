// Orvane — LE BANC DE LA VIE SYNTHÉTIQUE (bancs/synthetique.js, docs/16)
// Le monde d'Orvane, la Mère éveillée au volcan, vérifié contre le même monde sans elle :
//  1. le jour un : un monde sans Mère tourne exactement comme le moteur sans moteur/synthetique.js ;
//  2. l'éveil : la Mère, ses deux plans fondateurs, les ressources de chaque lieu ; une seule fois ; déterministe ;
//  3. la physique : un plan qui ne capte rien, un plan trop lourd ne tiennent pas ; le nombre des machines suit les saisons ;
//     le minerai s'entame là où l'on fore ;
//  4. le critère de sortie de la phase 2 bis : une espèce qui explose (trois fois plus nombreuse dans la prairie) revient à ce
//     que son milieu porte avec les machines, et reste au-dessus sans elles, sans qu'aucune lignée de plus ne s'éteigne ;
//  5. la Mère conçoit : à la taille de ce qui déborde, contre ce qui tue ses machines ; les erreurs de copie, les transferts ;
//  6. les joueurs : une région harcelée devient méfiante, la Mère y envoie des machines blindées ou armées, la défense se
//     répand ; la paix revenue, la posture retombe ;
//  7. le contrat : l'instantané respecte le schéma ; dans un monde à parcelles, la vue par biome ; le cycle de nuit éveille
//     la Mère une fois.
//   node bancs/synthetique.js [--court]
// --court : moins de cycles (les critères sont lus sur moins de temps). Sortie : 0 si tout passe, 1 sinon.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Parcelles = require(racine('moteur/parcelles.js')), Syn = require(racine('moteur/synthetique.js')), Tampon = require(racine('tampon/tampon.js'));
const a = process.argv.slice(2), court = a.includes('--court');
const AVANT = court ? 60 : 80, APRES = court ? 30 : 40, GUERRE = court ? 30 : 40, PAIX = court ? 30 : 40;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0);
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const syn = I => I.taxons.filter(t => !t.eteint && t.plan.regime === 'synthetique');
const betes = I => I.taxons.filter(t => !t.eteint && t.plan.regime !== 'synthetique');
const eff = t => somme(t.populations.map(p => p.effectif));
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json');
const tourner = (I, n, pr) => { for (let k = 0; k < n; k++) I = Orvane.cycle(I, typeof pr === 'function' ? pr(I, k) : pr || {}); return I; };
const t0 = Date.now();

console.log(`1. Le jour un`);
{ // le moteur, chargé sans moteur/synthetique.js : un monde sans Mère doit y tourner à l'identique
  const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  const req = p => p === './synthetique.js' ? null : require(racine('moteur/' + p.replace('./', '')));
  vm.runInNewContext(src, { module: mod, require: req, console });
  const Sans = mod.exports; let A = I0, B = I0;
  for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); B = Sans.cycle(B, {}); }
  verif(empreinte(A) === empreinte(B) && !A.monde.mere && !A.biomes.some(b => b.ressources), 'un monde sans Mère tourne exactement comme le moteur sans la vie synthétique : rien ne s\'y ajoute');
}

console.log(`2. L'éveil`);
const E = Syn.eveiller(I0, {}), W0 = E.inst;
{ const m = W0.monde.mere, f = syn(W0);
  verif(m && m.biome === 'volcan' && f.length === 2 && f.every(t => t.populations.length === 1 && t.populations[0].biome === 'volcan') && E.evenements[0]?.type === 'eveil',
    `${m.nom} s'éveille au volcan et assemble ${f.map(t => t.nom).join(' et ')} : « ${E.evenements[0].detail} »`);
  const R = W0.biomes.map(b => b.ressources), riche = W0.biomes.find(b => b.id === 'volcan').ressources, pauvre = W0.biomes.find(b => b.id === 'prairie').ressources;
  verif(R.every(r => r && r.surface > 0 && r.minerai === r.minerai_max) && riche.minerai > 4 * pauvre.minerai && riche.geothermie > .5 && W0.biomes.find(b => b.id === 'abysses').ressources.geothermie > 0,
    `chaque lieu a ses ressources : le volcan ${fx(riche.minerai / 1e3, 0)} t de minerai et la chaleur de la terre, la prairie ${fx(pauvre.minerai / 1e3, 0)} t ; les abysses, leurs sources chaudes`);
  verif(Syn.eveiller(W0, {}).evenements.length === 0 && empreinte(Syn.eveiller(I0, {}).inst) === empreinte(W0), 'une seule fois, et déterministe');
}

console.log(`3. La physique`);
// le monde avec la Mère : AVANT cycles, un an au moins si --court ne le raccourcit pas (le monde a une année de 120 cycles)
const trace = []; let W = W0, WA = null, conceptions = [], transferts = [], erreurs = [];
for (let k = 0; k < AVANT + 40; k++) { W = Orvane.cycle(W, {}); if (k === AVANT - 1) WA = clone(W);   // (les branches partent du cycle AVANT)
  for (const e of W.evenements) { const t = W.taxons.find(x => x.id === e.taxon); if (t?.plan.regime !== 'synthetique') continue;
    if (e.type === 'conception') conceptions.push({ ...e, masse: t.plan.masse_kg, md: W.monde.mere.memoire.masse_debord }); else if (e.type === 'transfert') transferts.push(e); else if (e.type === 'separation') erreurs.push(e); }
  const rho = (() => { let s = 0, w = 0; for (const t of syn(W)) for (const p of t.populations) { s += p.effectif * (p.energie || 0); w += p.effectif; } return w ? s / w : 0; })();
  trace.push({ n: W.cycle.n, saison: W.cycle.saison?.nom, N: somme(syn(W).map(eff)), rho, lieux: new Set(syn(W).flatMap(t => t.populations.map(p => p.biome))).size, minerai: W.biomes.find(b => b.id === 'volcan').ressources.minerai }); }
{ // les saisons : l'énergie de chaque machine (ce qu'elle capte sur ce qu'elle dépense) et ce que devient leur nombre au fil de chacune
  const seg = s => { const L = trace.filter(x => x.saison === s); return L.length ? { rho: somme(L.map(x => x.rho)) / L.length, k: L[L.length - 1].N / Math.max(1, L[0].N) } : null; };
  const H = seg('hiver'), E = seg('été') || seg('printemps'), P = seg('printemps');
  verif(H && E && E.rho > 1.3 * H.rho && H.k < .85 && P.k > 1.2, `leur nombre suit les saisons : l'hiver, une machine capte en moyenne ${fx(H.rho * 100, 0)} % de ce qu'elle dépense (${fx(E.rho * 100, 0)} % l'été) ; beaucoup sont en veille, et leur nombre fond (×${fx(H.k, 2)}) ; au printemps, il repart`);
  const fin = trace[trace.length - 1];
  verif(fin.lieux >= 10, `parties du volcan, elles gagnent ${fin.lieux} des ${W.biomes.length} biomes en ${trace.length} cycles`);
  verif(Math.min(...trace.map(x => x.minerai)) < .8 * W0.biomes.find(b => b.id === 'volcan').ressources.minerai_max, `le minerai du volcan s'entame (au plus bas ${fx(Math.min(...trace.map(x => x.minerai)) / 1e3, 0)} t sur ${fx(W0.biomes.find(b => b.id === 'volcan').ressources.minerai_max / 1e3, 0)})`);
  // deux plans impossibles, posés dans la prairie : l'un ne capte rien, l'autre est trop lourd pour sa chaleur
  // (dans un monde où elles sont seules, sans la Mère : qu'aucune autre machine ne leur passe ses panneaux)
  const J = clone(WA), base = syn(J)[0]; delete J.monde.mere; for (const t of syn(J)) { t.eteint = J.cycle.n; t.statut = 'eteint'; t.populations = []; }
  J.taxons.push({ ...clone(base), id: 'aveugle', nom: 'Aveugle', parent: base.id, eteint: null, plan: { ...clone(base.plan), modules: { ...base.plan.modules, panneau: 0, thermique: 0 } }, populations: [{ biome: 'prairie', effectif: 500, tendance: 0, depuis: J.cycle.n }] },
    { ...clone(base), id: 'colosse', nom: 'Colosse', parent: base.id, eteint: null, plan: { ...clone(base.plan), masse_kg: 100000, taille_m: 14 }, populations: [{ biome: 'prairie', effectif: 500, tendance: 0, depuis: J.cycle.n }] });
  const bC = Syn.bilan(J.taxons.find(t => t.id === 'colosse').plan, { L: .8, H: .3 }), J2 = tourner(J, 40);
  const reste = id => { const t = J2.taxons.find(x => x.id === id); return t && !t.eteint ? eff(t) : 0; };
  verif(reste('aveugle') < 50 && reste('colosse') < 50 && bC.rho < 1, `un plan sans capteur et un plan de 100 t (sa chaleur à dissiper : il ne capte que ${fx(bC.rho * 100, 0)} % de ce qu'il dépense) ne tiennent pas : de 500 machines chacun, il en reste ${fx(reste('aveugle'), 0)} et ${fx(reste('colosse'), 0)} après 40 cycles`);
}

console.log(`4. Le critère de sortie : une espèce explose`);
{ const ty = b => b; // (un monde par biomes)
  const cible = betes(WA).filter(t => t.plan.regime === 'herbivore' && t.plan.masse_kg >= 3 && t.plan.masse_kg <= 60).map(t => [t, somme(t.populations.filter(p => p.biome === 'prairie').map(p => p.effectif))]).sort((x, y) => y[1] - x[1])[0][0];
  const dans = (J, id) => somme((J.taxons.find(t => t.id === id)?.populations || []).filter(p => p.biome === 'prairie').map(p => p.effectif));
  const injecter = J => { J = clone(J); for (const p of J.taxons.find(t => t.id === cible.id).populations) if (p.biome === 'prairie') p.effectif *= 3; return J; };
  const sans = J => { J = clone(J); for (const t of J.taxons) if (t.plan.regime === 'synthetique') { t.eteint = J.cycle.n; t.statut = 'eteint'; t.populations = []; } delete J.monde.mere; return J; };
  const B = { avec: injecter(WA), sans: injecter(sans(WA)), temoin: sans(WA) }, ext = { avec: 0, sans: 0, temoin: 0 }, serie = { avec: [], sans: [], temoin: [] }, reg = [];
  const eteintes = J => J.evenements.filter(e => e.type === 'extinction' && !e.biome && J.taxons.find(t => t.id === e.taxon)?.plan.regime !== 'synthetique').length;
  for (let k = 0; k < APRES; k++) for (const b in B) { B[b] = Orvane.cycle(B[b], {}); ext[b] += eteintes(B[b]); serie[b].push(dans(B[b], cible.id));
    if (b === 'avec') reg.push(B[b].taxons.find(t => t.id === cible.id).populations.find(p => p.biome === 'prairie')?.regulation || 0); }
  const r = b => serie[b][APRES - 1] / serie.temoin[APRES - 1], tot = J => somme(betes(J).map(eff));
  const exces = b => somme(serie[b].map((x, k) => Math.max(0, x / serie.temoin[k] - 1)));   // l'excès cumulé sur la période
  verif(Math.abs(r('avec') - 1) < .1 && r('sans') > r('avec') + .04 && exces('avec') < .7 * exces('sans'),
    `${cible.nom} (${fx(cible.plan.masse_kg, 1)} kg), trois fois plus nombreuse dans la prairie : ${APRES} cycles plus tard, elle est à ${fx(r('avec'), 2)} fois ce qu'elle serait sans l'explosion avec les machines, à ${fx(r('sans'), 2)} fois sans elles ; son excès cumulé est de ${fx(exces('avec') / exces('sans') * 100, 0)} % de ce qu'il est sans elles`);
  verif(Math.max(...reg) > .05, `les machines y font jusqu'à ${fx(Math.max(...reg) * 100, 0)} % de ses morts, puis s'effacent (${fx(reg[reg.length - 1] * 100, 0)} % à la fin)`);
  verif(ext.avec <= ext.sans, `aucune lignée de bêtes de plus ne s'éteint : ${ext.avec} avec les machines, ${ext.sans} sans elles, ${ext.temoin} sans l'explosion`);
  verif(Math.abs(tot(B.avec) / tot(B.sans) - 1) < .1, `le reste du monde n'en souffre pas : ${fx(tot(B.avec) / 1e6, 1)} millions de bêtes avec les machines, ${fx(tot(B.sans) / 1e6, 1)} sans elles`);
}

console.log(`5. La Mère conçoit`);
{ const causes = conceptions.map(e => (e.detail.match(/\(([^)]*)\)/) || [])[1]);
  verif(conceptions.length >= Math.floor((AVANT + 40) / Syn.REGLES.mere.intervalle) - 3, `${conceptions.length} plans conçus en ${AVANT + 40} cycles (un tous les ${Syn.REGLES.mere.intervalle} cycles au plus) : ` + [...new Set(causes)].join(', '));
  const R = conceptions.filter(e => /espèces qui débordent/.test(e.detail) && e.md), bon = R.filter(e => Math.abs(Math.log10(e.masse / (3 * e.md))) < .5);
  verif(bon.length > 0, `contre ce qui déborde sans régulateur à sa taille, la Mère conçoit à cette taille : ` + R.slice(0, 3).map(e => `ce qui déborde pèse ${fx(e.md, 2)} kg, son régulateur ${fx(e.masse, 2)} kg`).join(' ; '));
  verif(erreurs.length > 0 && transferts.length > 0, `loin d'elle, ${erreurs.length} erreurs de copie font lignée ; ${transferts.length} modules passent d'une lignée à l'autre (${transferts.slice(0, 2).map(e => '« ' + e.detail + ' »').join(', ')})`);
}

console.log(`6. Les joueurs`);
{ const zone = ['desert', 'sommets', 'steppe', 'desert-froid'], taux = .04;
  let J = clone(WA); const avantD = { ...J.monde.mere }, evs = [];
  const mesure = J => { let N = 0, bl = 0, ar = 0, di = 0, mf = 0; const post = {}; for (const t of syn(J)) for (const p of t.populations) { if (!zone.includes(p.biome)) continue; N += p.effectif;
    bl += p.effectif * (t.plan.modules.blindage || 0); ar += p.effectif * (t.plan.modules.arme || 0); di += p.effectif * (t.plan.modules.discretion || 0); mf += p.effectif * (p.mefiance || 0); post[p.posture] = (post[p.posture] || 0) + p.effectif; }
    return { N, bl: bl / N, ar: ar / N, di: di / N, mf: mf / N, neutre: (post.neutre || 0) / N, hostile: ((post.hostile || 0) + (post.fuyante || 0) + (post.defensive || 0)) / N }; };
  const m0 = mesure(J);
  for (let k = 0; k < GUERRE; k++) { const pr = { taxons: {} };
    for (const t of syn(J)) for (const p of t.populations) if (zone.includes(p.biome) && p.effectif > 5) { const n = p.effectif * taux; (pr.taxons[t.id] ??= {})[p.biome] = { retrait: { '*': n }, contact: { rencontres: 2 * n, danger: n } }; }
    J = Orvane.cycle(J, pr); evs.push(...J.evenements); }
  const m1 = mesure(J), contre = evs.filter(e => e.type === 'conception' && /contre les joueurs/.test(e.detail));
  verif(m1.mf > .5 && m1.hostile > .9, `harcelées ${GUERRE} cycles (${taux * 100} % détruites par cycle), les machines de la zone se méfient (${fx(m1.mf * 100, 0)} %) : ${fx(m1.hostile * 100, 0)} % ne sont plus neutres`);
  verif(contre.length >= 1 && contre.some(e => zone.some(z => e.biome === z)), `la Mère conçoit contre les joueurs et envoie ses plans sur place : ${contre.slice(0, 2).map(e => '« ' + e.detail + ' »').join(' ; ')}`);
  verif(m1.bl + m1.ar + m1.di > m0.bl + m0.ar + m0.di + .05, `la défense se répand dans la zone : blindage ${fx(m0.bl, 2)} → ${fx(m1.bl, 2)}, arme ${fx(m0.ar, 2)} → ${fx(m1.ar, 2)}, discrétion ${fx(m0.di, 2)} → ${fx(m1.di, 2)}`);
  J = tourner(J, PAIX); const m2 = mesure(J);
  verif(m2.mf < .2 && m2.neutre > .9, `${PAIX} cycles de paix : la méfiance retombe (${fx(m2.mf * 100, 0)} %), ${fx(m2.neutre * 100, 0)} % des machines sont de nouveau neutres`);
}

console.log(`7. Le contrat`);
{ const e = val(S, W, '$');
  verif(!e.length, 'l\'instantané d\'un monde à machines respecte schemas/instantane.schema.json' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  let P = Parcelles.decouper(I0, { par: 4 }); P = Syn.eveiller(P, {}).inst; const m = P.monde.mere;
  P = tourner(P, court ? 8 : 15); const V = Parcelles.regrouper(P), ev = val(S, V, '$');
  verif(m.biome.startsWith('volcan~') && V.monde.mere.biome === 'volcan' && V.monde.mere.parcelle === m.biome && V.biomes.every(b => b.ressources && b.ressources.surface > 0) && !ev.length,
    `dans un monde à parcelles, la Mère s'éveille dans une parcelle du volcan (${m.biome}) ; la vue par biome dit son biome et additionne les ressources` + (ev.length ? ' : ' + ev.slice(0, 3).join(' ; ') : ''));
  // les familles : un jeu qui ne joue que les bêtes ne reçoit pas les machines, et ce qu'il en renverrait ne compte pas
  const F = Tampon.filtrer(W, { familles: ['animale'] }), M = syn(W)[0], B0 = betes(W)[0], prof = lireJ('mondes/orvane/profil.json');
  const lot = fam => ({ monde: W.monde.id, source: { jeu: 'essai', compte: 'c1' }, ...(fam ? { familles: fam } : {}), evenements: [
    { taxon: M.id, biome: M.populations[0].biome, action: 'prelevement', n: 5 }, { taxon: B0.id, biome: B0.populations[0].biome, action: 'prelevement', n: 5 }] });
  const vus = L => Object.keys(Tampon.agreger([L], W, prof).pressions.taxons || {});
  verif(!syn(F).length && betes(F).length === betes(W).length && !vus(lot(null)).includes(M.id) && vus(lot(null)).includes(B0.id) && vus(lot(['animale', 'synthetique'])).includes(M.id),
    `les familles : un jeu qui ne joue que les bêtes ne reçoit aucune des ${syn(W).length} lignées de machines (Tampon.filtrer), et ses prélèvements sur elles ne comptent pas ; un lot qui dit « synthetique » les fait compter`);
  // le cycle de nuit : un monde d'essai dont le profil demande la vie synthétique
  const dossier = racine('mondes/essai-synthetique'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try {
    const profil = { ...lireJ('mondes/orvane/profil.json'), monde: { ...lireJ('mondes/orvane/profil.json').monde, id: 'essai-synthetique', synthetique: true, fusions: [], parcelles: undefined, pressions: undefined } };
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil)); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-synthetique', '--sans-reseau', '--cycles', '2', '--forcer'], { encoding: 'utf8' });
    const Ipub = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif(/vie synthétique : La Mère s'éveille/.test(sortie) && (sortie.match(/vie synthétique :/g) || []).length === 1 && Ipub.monde.mere && syn(Ipub).length >= 2, 'le cycle de nuit : le profil demande la vie synthétique, la Mère s\'éveille une fois, l\'instantané publié la porte');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
