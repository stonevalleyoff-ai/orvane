// Orvane — LE BANC DES PLANCHES STRUCTURÉES (bancs/planches.js, docs/21)
// Les parties du corps publiées à côté du SVG de chaque bête (monde/silhouette.js, monde/planches.js) :
//  1. elles s'ajoutent à la planche, après ce qu'elle avait déjà ; avec --contre <version git>, la preuve qu'un changement ne touche
//     pas le dessin : sans leurs parties, les planches sont celles de cette version, au caractère près (le SVG, les yeux, sol, la
//     variante, l'ordre des lignées). Ce n'est pas un invariant : un changement qui retouche le dessin exprès la ferait échouer ;
//  2. elles disent ce que dessine le SVG, sur chaque lignée de trois mondes réels : chaque patte est la chaîne de ses <line> (ses
//     points, ses épaisseurs, au dixième près), puis son pied, posé sur la ligne du sol (contact) ; chaque partie montre ses
//     éléments ; aucun nombre manquant ; autant de pattes que la règle du dessin (le plan, borné par la forme) ;
//  3. la lecture de Lisière (jeux/lisiere/scripts/squelette.gd, refaite ici en JavaScript) trouve dans le SVG les mêmes pattes, les
//     mêmes pieds, le même corps : un jeu qui lit les parties ne devine plus rien, et voit la même bête ;
//  4. chaque forme a les siennes (quadrupède, bipède, oiseau, insecte, serpent, poisson, pieuvre, méduse, étoile, mille-pattes,
//     machine), même celles qu'aucun de ces mondes n'a encore ;
//  5. le même résultat à chaque fois, dans Node et dans un navigateur ; ce qu'elles pèsent.
// Ce que seul Godot vérifie (Lisière lit les deux, et voit la même bête) : jeux/lisiere/outils/squelettes.gd
//   node bancs/planches.js
//   node bancs/planches.js --contre origin/main           (pour prouver qu'un changement ne touche pas le dessin)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Mo = require(racine('tampon/morceaux.js')), Pl = require(racine('monde/planches.js')), Sil = require(racine('monde/silhouette.js')), Co = globalThis.OrvaneCorps;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8')), t0 = Date.now();
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), ko = n => fx(n / 1024);
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const MONDES = ['orvane', 'genese-2026', 'genese-7'];

// --- le SVG d'une planche, lu comme Lisière le lit (jeux/lisiere/scripts/squelette.gd) ---
const attributs = t => Object.fromEntries([...t.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
// le groupe du dessin (translate, scale) et ses éléments au premier niveau (_elements)
function lireSvg(svg) {
  const g = /<g transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\) scale\(([-\d.]+)\)"[^>]*>/.exec(svg); if (!g) return null;
  const els = [], re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g; let prof = 0, cur = null; re.lastIndex = g.index + g[0].length;
  for (let m; (m = re.exec(svg));) { const ferme = m[1] === '/', seul = m[4] === '/';
    if (prof === 0) { if (ferme) break; const el = { nom: m[2], attr: attributs(m[3]) }; if (seul) els.push(el); else { cur = el; prof = 1; } }
    else if (ferme) { if (--prof === 0) els.push(cur); }
    else if (!seul) prof++; }
  return { tx: +g[1], ty: +g[2], k: +g[3], els };
}
const nb = (a, c, d) => +(a[c] ?? d), dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// le premier point d'un chemin (_points, dont Lisière ne garde ici que le premier)
const debutDe = d => { const m = /([MLQCTmlqct])([^MLQCTZmlqctz]*)/.exec(d); if (!m) return null; const v = [...m[2].matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)].map(x => +x[0]); return v.length >= 2 ? [v[0], v[1]] : null; };
// un élément qui tient au pied ou à une articulation (_est_pied)
function estPied(el, f, joints, wl) {
  const A = el.attr;
  if (el.nom === 'rect') { const w = nb(A, 'width', 0), h = nb(A, 'height', 0), c = [nb(A, 'x', 0) + w * .5, nb(A, 'y', 0) + h * .5]; return Math.abs(c[0] - f[0]) <= 1.2 * wl + 1.5 && Math.abs(c[1] - f[1]) <= wl + 1.5 && w <= 3 * wl + 3; }
  if (el.nom === 'ellipse' || el.nom === 'circle') { const c = [nb(A, 'cx', 0), nb(A, 'cy', 0)], r = Math.max(+(A.rx ?? A.r ?? 0), +(A.ry ?? A.r ?? 0));
    if (r > 2.5 * wl + 1.5) return false; return dist(c, f) <= 1.5 * wl + 1 || joints.some(p => dist(c, p) <= .35); }
  if (el.nom === 'path') { if (!('stroke' in A)) return false; const p = debutDe(A.d || ''); return !!p && dist(p, f) <= Math.max(6, 2.5 * wl); }
  return false;
}
// les pattes cherchées dans le SVG (_chaines), puis le corps et le côté de chaque patte, comme Lisière les devine
function lisiere(els) {
  const out = []; let i = 0;
  while (i < els.length) {
    if (els[i].nom !== 'line') { i++; continue; }
    const lignes = [i]; let j = i;
    while (j + 1 < els.length && els[j + 1].nom === 'line') { const A = els[j].attr, B = els[j + 1].attr;
      if (Math.abs(nb(A, 'x2', 0) - nb(B, 'x1', 1e9)) < .05 && Math.abs(nb(A, 'y2', 0) - nb(B, 'y1', 1e9)) < .05) lignes.push(++j); else break; }
    const fin = els[j].attr;
    if (Math.abs(nb(fin, 'y2', 9)) < .6) { const f = [nb(fin, 'x2', 0), nb(fin, 'y2', 0)], wl = nb(fin, 'stroke-width', 1), joints = lignes.map(l => [nb(els[l].attr, 'x1', 0), nb(els[l].attr, 'y1', 0)]);
      const pied = []; let q = j + 1; while (q < els.length && pied.length < 5 && estPied(els[q], f, joints, wl)) pied.push(q++);
      out.push({ lignes, pied }); i = q; }
    else i = j + 1;
  }
  const role = els.map((e, i) => (i === 0 && e.nom === 'ellipse' && e.attr.fill === '#3b3423') ? 'ombre' : e.nom === 'clipPath' ? 'defs' : '');
  for (const c of out) for (const x of [...c.lignes, ...c.pied]) role[x] = 'patte';
  let corps = els.length;
  if (out.length) { const p0 = out[0].lignes[0]; for (let i = p0; i < els.length; i++) if (els[i].nom === 'clipPath') { corps = i; break; }
    if (corps === els.length) for (let i = p0; i < els.length; i++) if (role[i] === '') { corps = i; break; } }
  for (const c of out) c.loin = c.lignes[0] < corps;
  return out;
}
// les mêmes, lues dans les parties : les <line> de chaque patte, son pied, son côté (dessinée avant le corps : derrière lui)
const luesDans = P => P.pattes.map(p => { const n = p.points.length - 1, l = []; for (let j = 0; j < n; j++) l.push(p.svg[0] + j);
  const pied = []; for (let j = p.svg[0] + n; j <= p.svg[1]; j++) pied.push(j); return { lignes: l, pied, loin: p.svg[0] < (P.corps?.svg[0] ?? Infinity) }; });

// --- ce que les parties doivent dire du SVG (2) : rend la liste de ce qui ne va pas ---
const PIEDS = { sabot: ['rect'], coussinet: ['ellipse'], griffes: ['path', 'path', 'path'], mains: ['path', 'path', 'path'], doigts: ['path', 'path', 'path'],
  serres: ['path', 'path', 'path', 'path'], patin: ['ellipse', 'ellipse', 'rect'], aucun: [] };
const RANGS = ['corps', 'thorax', 'tete', 'cou', 'queue'];
function nombres(o, f) { if (typeof o === 'number') f(o); else if (o === null) f(NaN); else if (Array.isArray(o)) o.forEach(x => nombres(x, f)); else if (o && typeof o === 'object') Object.values(o).forEach(x => nombres(x, f)); }
function controler(s, plan, cat = null) {
  const P = s.parties, E = [], L = lireSvg(s.svg); if (!P || !L) return ['pas de parties, ou un SVG sans groupe'];
  const { tx, ty, k, els } = L, pt = (x, y) => [tx + k * x, ty + k * y], pres = (u, v) => Math.abs(u - v) <= .05 + 1e-9;
  if (P.groupe[0] !== tx || P.groupe[1] !== ty || P.groupe[2] !== k) E.push('le groupe');
  let mal = 0; nombres(P, v => { if (!Number.isFinite(v)) mal++; }); if (mal) E.push(`${mal} nombres manquants`);
  const rangs = [...RANGS.filter(c => P[c]).map(c => [c, P[c]]), ...P.pattes.map((p, i) => ['patte ' + i, p]), ...(P.bras || []).map((p, i) => ['bras ' + i, p]), ...(P.organes || []).map(o => [o.type, o])];
  for (const [c, x] of rangs) if (!(Array.isArray(x.svg) && x.svg[0] >= 0 && x.svg[0] <= x.svg[1] && x.svg[1] < els.length)) E.push(c + ' : ses éléments');
  if (E.length) return E;
  // chaque patte (et chaque bras articulé) : ses <line>, l'une au bout de l'autre, aux points et aux épaisseurs des parties
  const chaine = (p, c, sol) => { const n = p.points.length - 1, faute = m => { E.push(c + ' : ' + m); return -1; };
    for (let j = 0; j < n; j++) { const el = els[p.svg[0] + j]; if (el?.nom !== 'line') return faute('pas une <line>');
      const A = el.attr, q0 = pt(+A.x1, +A.y1), q1 = pt(+A.x2, +A.y2);
      if (![q0[0] - p.points[j][0], q0[1] - p.points[j][1], q1[0] - p.points[j + 1][0], q1[1] - p.points[j + 1][1]].every(d => pres(d, 0)) || !pres(k * +A['stroke-width'], p.epaisseurs[j])) return faute('ses points ou ses épaisseurs'); }
    if (sol && Math.abs(+els[p.svg[0] + n - 1].attr.y2) > 1e-9) E.push(c + ' : pas au sol');
    if (p.points.some(([x, y]) => x < -.5 || x > 170.5 || y < -.5 || y > 90.5)) E.push(c + ' : hors du cadre');
    return n; };
  P.pattes.forEach((p, i) => { const n = chaine(p, 'patte ' + i, true), f = PIEDS[p.pied]; if (n < 0) return;
    if (!f) E.push(`patte ${i} : pied inconnu (${p.pied})`); else if (els.slice(p.svg[0] + n, p.svg[1] + 1).map(e => e.nom).join() !== f.join()) E.push(`patte ${i} : son pied (${p.pied})`);
    if (!['loin', 'pres'].includes(p.cote)) E.push(`patte ${i} : son côté`); });
  (P.bras || []).forEach((p, i) => { if (p.points && p.epaisseurs) chaine(p, 'bras ' + i, false); });
  // le corps : sa découpe, quand le dessin en a une ; les yeux, ceux de la planche, dessinés dans la tête quand elle en a une
  if (['quadrupede', 'bipede-tendu', 'oiseau', 'insecte', 'poisson', 'pieuvre'].includes(P.dessin) && els[P.corps.svg[0]].nom !== 'clipPath') E.push('le corps : pas sa découpe');
  if (JSON.stringify(P.yeux) !== JSON.stringify(s.yeux)) E.push('les yeux ne sont pas ceux de la planche');
  if (P.tete && !s.yeux.every(([x, y]) => els.slice(P.tete.svg[0], P.tete.svg[1] + 1).some(e => e.nom === 'ellipse' && dist(pt(+e.attr.cx, +e.attr.cy), [x, y]) <= .3))) E.push('un œil hors de la tête');
  // au sol : bas, le milieu du bas du dessin (son ombre) ; contact, la ligne des pieds (y = 0 du groupe), chaque pied dessus, ou
  // le bas du dessin pour une bête sans pattes
  if (!!P.contact !== !!s.sol || !!P.bas !== !!s.sol) E.push('le contact au sol, le bas du dessin');
  else if (s.sol) { if (P.contact[0] !== 85 || P.contact[1] !== (P.pattes.length ? ty : 86) || P.bas[0] !== 85 || P.bas[1] !== 86) E.push('le contact au sol, le bas du dessin');
    if (P.pattes.some(p => !pres(p.points[p.points.length - 1][1], P.contact[1]))) E.push('un pied hors de la ligne du sol');
    if (P.contact[1] > P.bas[1] + .05) E.push('la ligne du sol sous le dessin'); }
  // autant de pattes que la règle du dessin (un bipède à la queue tendue est dessiné sans les siennes : à part)
  if (plan && P.dessin !== 'bipede-tendu') { const r = regle(P.dessin, plan, cat);
    if (P.pattes.length !== r.pattes) E.push(`${P.pattes.length} pattes pour ${r.pattes}`);
    if (r.bras != null && (P.bras || []).length !== r.bras) E.push(`${(P.bras || []).length} bras pour ${r.bras}`); }
  return E;
}
// combien le dessin fait de pattes et de bras (monde/silhouette.js) : le plan (moteur/corps.js, normaliser), borné par la forme ;
// et combien le plan en compte (plan : des pattes, ou les bras d'une pieuvre, d'une méduse, d'une étoile)
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
function regle(dessin, plan, cat) {
  const avant = Co.etendre(cat), c = Co.normaliser(plan.corps); Co.etendre(avant); const p = c.pattes;
  const R = { quadrupede: { pattes: 4 }, bipede: { pattes: 2, bras: 2 }, oiseau: { pattes: 2 }, insecte: { pattes: 2 * borne(Math.round((p || 6) / 2), 2, 5) },
    'mille-pattes': { pattes: 2 * borne(Math.round((p || 24) / 2), 6, 16) }, serpent: { pattes: 0 }, poisson: { pattes: 0 }, pieuvre: { pattes: 0, bras: borne(p || 8, 4, 10) },
    meduse: { pattes: 0, bras: borne(p || 5, 4, 8) }, etoile: { pattes: 0, bras: borne(p || 5, 4, 8) }, machine: { pattes: 4 },
    // (docs/21) les variantes : leurs pattes, leurs nageoires, leurs ailes sont dessinées, mais pas encore publiées en parties articulées
    ...Object.fromEntries(['gasteropode', 'bivalve', 'araignee', 'ecrevisse', 'gammare', 'papillon', 'abeille', 'plancton', 'chauve-souris', 'grenouille', 'phoque', 'tortue-marine'].map(d => [d, { pattes: 0 }])) }[dessin] || { pattes: p };
  const rayonne = ['pieuvre', 'meduse', 'etoile'].includes(dessin);
  return { ...R, plan: dessin === 'machine' ? 4 : p, dessinees: rayonne ? R.bras : R.pattes };
}
const memes = (A, B) => JSON.stringify(A.map(c => [c.lignes, c.pied, c.loin])) === JSON.stringify(B.map(c => [c.lignes, c.pied, c.loin]));

// --- les mondes : leurs planches, dessinées par le code d'ici ---
// (chaque monde a son catalogue : ses formes de corps, que le dessin connaît le temps de dessiner ses planches)
const mondes = MONDES.map(id => { const I = lireJ(`mondes/${id}/instantane.json`), D = Mo.decouper(I); return { id, I, D, Q: Pl.planches(D), cat: D['index.json'].catalogue?.monde || null }; });
const tous = mondes.flatMap(W => Object.entries(W.Q).flatMap(([c, P]) => { const M = W.D['biomes/' + c.slice(12)];
  return Object.entries(P.silhouettes).map(([id, s]) => ({ monde: W.id, biome: P.biome, id, s, plan: M.taxons.find(t => t.id === id)?.plan, cat: W.cat })); }));

console.log('1. Les parties s\'ajoutent à la planche');
{ verif(tous.every(x => x.s.parties) && tous.every(x => Object.keys(x.s).join() === ['svg', 'yeux', 'sol', ...(x.s.phenotype ? ['phenotype'] : []), 'parties'].join()),
    'chaque dessin a ses parties, après ce qu\'il avait déjà (svg, yeux, sol, phenotype) : un jeu qui ne les lit pas ne voit rien changer');
  // (--contre : le dessin de cette version et celui d'ici, sans les parties ni d'un côté ni de l'autre)
  const ref = arg('--contre', null);
  if (ref) { const lire = f => { try { return execFileSync('git', ['show', `${ref}:${f}`], { cwd: racine('.'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }); } catch (e) { return null; } };
    const code = ['moteur/corps.js', 'monde/silhouette.js', 'monde/planches.js'].map(lire);
    if (code.some(x => x == null)) verif(false, `la version ${ref} ne se lit pas ici (son monde/silhouette.js, son monde/planches.js) : rien à comparer`);
    else { const ctx = vm.createContext({}); for (const c of code) vm.runInContext(c, ctx);
      const dessins = Q => Object.keys(Q).map(c => [c, Object.entries(Q[c].silhouettes).map(([id, x]) => [id, x.svg, x.yeux, x.sol, x.phenotype ?? null])]);
      let n = 0, diff = 0, ex = '';
      for (const W of mondes) { const A = dessins(ctx.OrvanePlanches.planches(W.D)), B = dessins(W.Q);
        if (JSON.stringify(A.map(x => x[0])) !== JSON.stringify(B.map(x => x[0]))) { diff++; ex ||= `${W.id} : pas les mêmes planches`; }
        for (const [c, L] of B) { const L0 = A.find(x => x[0] === c)?.[1]; n += L.length; if (JSON.stringify(L) !== JSON.stringify(L0)) { diff++; ex ||= `${W.id}/${c}`; } } }
      verif(!diff, `contre ${ref} : les planches de ${MONDES.length} mondes (${fx(n)} dessins) ont le même SVG, les mêmes yeux, le même sol, la même variante, dans le même ordre, au caractère près` + (diff ? ` ; ${diff} diffèrent (${ex})` : '')); } }
}

console.log('2. Les parties disent ce que dessine le SVG');
{ const fautes = tous.map(x => [x, controler(x.s, x.plan, x.cat)]).filter(([, E]) => E.length), dessins = {};
  for (const x of tous) dessins[x.s.parties.dessin] = (dessins[x.s.parties.dessin] || 0) + 1;
  const np = tous.reduce((s, x) => s + x.s.parties.pattes.length, 0);
  verif(!fautes.length, `${fx(tous.length)} dessins de ${MONDES.length} mondes (${Object.entries(dessins).map(([d, n]) => `${d} ${fx(n)}`).join(', ')}) : chacune de leurs ${fx(np)} pattes est la chaîne de ses <line> dans le SVG, aux mêmes points et aux mêmes épaisseurs au dixième près, posée au sol, puis son pied ; aucun nombre manquant`
    + (fautes.length ? ` ; ${fautes.length} fautes : ` + fautes.slice(0, 4).map(([x, E]) => `${x.monde}/${x.biome}/${x.id} (${E.slice(0, 2).join(', ')})`).join(' ; ') : ''));
  const sansJambes = tous.filter(x => x.s.parties.dessin === 'bipede-tendu'), ditMal = sansJambes.filter(x => x.s.parties.pattes.length || x.s.parties.bras?.length !== 2);
  if (ditMal.length) verif(false, `les bipèdes à la queue tendue : ${ditMal.map(x => x.id).join(', ')} n'ont pas leurs deux bras, ou ont des pattes`);
  const bornes = tous.filter(x => x.plan && x.s.parties.dessin !== 'bipede-tendu').filter(x => { const r = regle(x.s.parties.dessin, x.plan, x.cat); return r.plan !== r.dessinees; });
  console.log(`  (les pattes : ${fx(tous.length - sansJambes.length - bornes.length)} dessins en ont autant que leur plan ; ${bornes.length} autrement, la forme bornant le plan${bornes.length ? ' : ' + [...new Set(bornes.map(x => x.id))].slice(0, 5).join(', ') : ''})`);
  if (sansJambes.length) console.log(`  (${sansJambes.length} dessins de bipèdes à la queue tendue, ${[...new Set(sansJambes.map(x => x.id))].join(', ')}, n'ont pas de pattes au sol : le dessin ne fait que leurs bras, monde/silhouette.js, quadrupede. Leurs parties le disent, pattes [] et deux bras ; dessiner leurs jambes changerait le SVG)`);
  const debout = tous.filter(x => x.s.sol && x.s.parties.pattes.length), hautes = debout.filter(x => x.s.parties.contact[1] < 85.95);
  verif(debout.length && debout.every(x => x.s.parties.pattes.every(p => Math.abs(p.points[p.points.length - 1][1] - x.s.parties.contact[1]) <= .05 + 1e-9)), `au sol, les pieds de chaque bête sont sur sa ligne de contact (${fx(debout.length)} dessins à pattes) ; elle est au bas du dessin, sauf quand une queue lourde ou une trompe descend plus bas : ${fx(hautes.length)} dessins, jusqu'à ${fx(Math.max(...hautes.map(x => 86 - x.s.parties.contact[1])), 1)} unités plus haut`);
  const P0 = tous.find(x => x.s.parties.dessin === 'quadrupede').s.parties;
  verif(P0.corps && P0.tete && P0.tete.museau && P0.tete.pivot && P0.cou && P0.queue && P0.pattes.length === 4 && P0.pattes.filter(p => p.cote === 'loin').length === 2,
    `un quadrupède : son corps, sa tête (son museau, son pivot), son cou, sa queue, quatre pattes dont deux du côté lointain (${tous.find(x => x.s.parties === P0).id})`);
}

console.log('3. La lecture de Lisière');
{ const loin = [], autre = [];
  for (const x of tous) { const L = lireSvg(x.s.svg), A = lisiere(L.els), B = luesDans(x.s.parties); if (!memes(A, B)) autre.push(x);
    if (x.s.parties.dessin !== 'mille-pattes' && !x.s.parties.pattes.every((p, i) => (p.cote === 'loin') === B[i].loin)) loin.push(x); }
  verif(!autre.length, `la lecture de Lisière (squelette.gd, refaite ici) trouve dans le SVG de chacun des ${fx(tous.length)} dessins les mêmes pattes que leurs parties : les mêmes <line>, les mêmes morceaux de pied, le même côté du corps`
    + (autre.length ? ` ; diffèrent : ${autre.slice(0, 5).map(x => `${x.monde}/${x.biome}/${x.id}`).join(', ')}` : ''));
  verif(!loin.length, 'le côté de chaque patte est celui du dessin : celles du côté lointain sont dessinées derrière le corps, les autres devant (un mille-pattes a ses deux pattes en V sous chaque anneau, l\'une dite lointaine)'
    + (loin.length ? ` ; diffèrent : ${loin.slice(0, 5).map(x => x.id).join(', ')}` : ''));
}

console.log('4. Chaque forme a ses parties');
{ const cat = lireJ('mondes/orvane/instantane.json').catalogue.monde, avant = Co.etendre(cat);
  const couleurs = { robe: [150, 120, 90], sombre: [90, 70, 50], ventre: [200, 180, 150], oeil: [30, 30, 30] };
  const og = (type, place, forme, nombre = 2) => ({ type, place, forme, taille: .7, nombre });
  const corps = (forme, plus = {}) => ({ forme, long: .5, haut: .5, cou: .5, tete: .5, museau: .5, oreilles: .4, queue: .5, motif: 'uni', couleurs, organes: [], ...plus });
  const bete = (dessin, c, plan) => ({ dessin, plan: { regime: 'herbivore', masse_kg: 20, locomotion: ['marche'], activite: 'diurne', ...plan, corps: c } });
  const CAS = [
    bete('quadrupede', corps('quadrupede', { organes: [og('cornes', 'tete', 'ramifiees'), og('defenses', 'tete', 'droites'), og('trompe', 'tete', 'longue', 1), og('antennes', 'tete', 'plumeuses'), og('crete', 'tete', 'dentelee', 1),
      og('collerette', 'tete', 'frangee', 1), og('carapace', 'dos', 'segmentee', 1), og('plaques', 'dos', 'rondes', 5), og('epines', 'queue', 'massives', 7), og('ailes', 'flancs', 'membranes'), og('massue', 'queue', 'cloutee', 1)] }), { masse_kg: 300 }),
    bete('quadrupede', corps('quadrupede', { organes: [og('crete', 'dos', 'lisse', 1), og('epines', 'dos', 'fines', 7), og('nageoires', 'dos', 'voiles', 1), og('aiguillon', 'queue', 'courbe', 1), og('panache', 'queue', 'eventail', 1), og('pinces', 'avant', 'massives'), og('cornes', 'tete', 'droites', 1)] }),
      { regime: 'carnivore', locomotion: ['course'] }),
    bete('quadrupede', corps('quadrupede', { organes: [og('mains', 'avant', 'agiles')], queue: .7 }), { regime: 'omnivore', locomotion: ['grimpe'], masse_kg: 5 }),
    bete('quadrupede', corps('quadrupede'), { locomotion: ['saut'], masse_kg: 2 }), bete('quadrupede', corps('quadrupede'), { regime: 'filtreur', locomotion: ['fouissage'], masse_kg: .3 }),
    bete('bipede', corps('bipede', { organes: [og('mains', 'avant', 'agiles')], queue: .2 }), { regime: 'omnivore', locomotion: ['marche', 'course'], masse_kg: 60 }),
    bete('bipede-tendu', corps('bipede', { queue: .7, posture: .5 }), { regime: 'carnivore', locomotion: ['course'], masse_kg: 80 }),
    bete('oiseau', corps('oiseau', { organes: [og('panache', 'queue', 'eventail', 1), og('crete', 'tete', 'lisse', 1)] }), { regime: 'carnivore', locomotion: ['vol', 'marche'], masse_kg: 3 }),
    bete('oiseau', corps('oiseau'), { regime: 'omnivore', diete: { fruits: .6 }, locomotion: ['vol', 'marche'], masse_kg: .4 }), bete('oiseau', corps('oiseau', { haut: .8 }), { regime: 'carnivore', locomotion: ['nage', 'marche'], masse_kg: 2 }),
    bete('insecte', corps('hexapode', { pattes: 8, organes: [og('ailes', 'flancs', 'membranes'), og('carapace', 'dos', 'bombee', 1), og('aiguillon', 'queue', 'courbe', 1), og('pinces', 'avant', 'fines'), og('antennes', 'tete', 'plumeuses')] }), { regime: 'carnivore', masse_kg: .01 }),
    bete('insecte', corps('hexapode', { pattes: 6 }), { regime: 'carnivore', masse_kg: .002 }),
    bete('serpent', corps('serpent', { motif: 'taches' }), { regime: 'carnivore', locomotion: ['reptation'], masse_kg: 4 }),
    bete('poisson', corps('serpent', { organes: [og('nageoires', 'dos', 'voiles', 1), og('epines', 'dos', 'fines', 5), og('antennes', 'tete', 'fines')] }), { regime: 'carnivore', locomotion: ['nage'], masse_kg: 6 }),
    bete('poisson', corps('serpent', { long: .95 }), { regime: 'filtreur', locomotion: ['nage'], masse_kg: 1 }),
    bete('pieuvre', corps('tentaculaire', { pattes: 8 }), { regime: 'carnivore', locomotion: ['nage'], masse_kg: 4 }),
    bete('meduse', corps('radiaire', { pattes: 6 }), { regime: 'filtreur', locomotion: ['nage'], masse_kg: .5 }),
    bete('etoile', corps('radiaire', { pattes: 5 }), { regime: 'detritivore', locomotion: ['reptation'], masse_kg: .3 }),
    bete('mille-pattes', corps('segmente', { pattes: 24 }), { regime: 'detritivore', locomotion: ['marche'], masse_kg: .05 }),
    { ...bete('mille-pattes', corps('segmente', { pattes: 10 }), { regime: 'detritivore', locomotion: ['marche'], masse_kg: .02 }), pattes: 12 },
    { ...bete('mille-pattes', corps('segmente', { pattes: 36 }), { regime: 'detritivore', locomotion: ['marche'], masse_kg: .2 }), pattes: 32 },
    { dessin: 'machine', plan: { regime: 'synthetique', masse_kg: 40, locomotion: ['marche'], modules: { panneau: .6, thermique: .5, batterie: .5, foreuse: .6, recycleur: .5, pince: .6, blindage: .5, arme: .5 } } }];
  const R = CAS.map(C => { const o = {}, svg = Sil.dessiner(C.plan.corps, C.plan, [], o); return { ...C, s: { svg, yeux: o.yeux, sol: o.sol, parties: o.parties } }; });
  const formes = ['quadrupede', 'bipede', 'bipede-tendu', 'oiseau', 'insecte', 'serpent', 'poisson', 'pieuvre', 'meduse', 'etoile', 'mille-pattes', 'machine'];
  const mal = R.filter(x => x.s.parties?.dessin !== x.dessin || controler(x.s, x.plan.regime === 'synthetique' ? null : x.plan, cat).length || !memes(lisiere(lireSvg(x.s.svg).els), luesDans(x.s.parties)));
  verif(formes.every(f => R.some(x => x.dessin === f)) && !mal.length, `${R.length} bêtes faites pour l'essai, ${formes.length} dessins (${formes.join(', ')}) : chacune a ses parties, qui disent son SVG, et Lisière y trouve les mêmes pattes`
    + (mal.length ? ` ; mal : ${mal.map(x => `${x.dessin} (${x.s.parties?.dessin} ; ${controler(x.s, x.plan.regime === 'synthetique' ? null : x.plan, cat).slice(0, 2).join(', ')})`).join(' ; ')}` : ''));
  const de = f => R.find(x => x.dessin === f).s.parties, n = (f, c) => (de(f)[c] || []).length;
  const types = new Set(R.flatMap(x => (x.s.parties.organes || []).map(o => o.type)));
  const ORG = ['cornes', 'defenses', 'trompe', 'antennes', 'crete', 'collerette', 'carapace', 'plaques', 'epines', 'nageoires', 'ailes', 'massue', 'aiguillon', 'panache', 'pinces', 'panneau', 'foreuse', 'pince', 'arme', 'recycleur'];
  verif(n('quadrupede', 'pattes') === 4 && n('bipede', 'pattes') === 2 && n('bipede', 'bras') === 2 && de('bipede').bras.every(b => b.main) && n('bipede-tendu', 'bras') === 2 && n('oiseau', 'pattes') === 2
    && n('insecte', 'pattes') === 8 && de('insecte').thorax && n('mille-pattes', 'pattes') === 24 && de('mille-pattes').corps.anneaux.length === 12 && n('machine', 'pattes') === 4 && n('pieuvre', 'bras') === 8 && n('meduse', 'bras') === 6 && n('etoile', 'bras') === 5
    && !n('serpent', 'pattes') && de('serpent').corps.points.length === 25 && de('poisson').queue && de('pieuvre').corps && !de('pieuvre').tete && R.filter(x => x.dessin !== 'machine').every(x => x.s.parties.tete || ['pieuvre', 'meduse', 'etoile'].includes(x.dessin)),
    'les pattes, les bras, la tête de chacune : quatre pattes et une machine aussi, deux jambes et deux bras (à mains) debout, huit pattes à un insecte qui en a huit et son thorax, vingt-quatre à un mille-pattes sous ses douze anneaux, huit bras à une pieuvre, six filaments à une méduse, cinq bras à une étoile, l\'échine d\'un serpent');
  const bornes = R.filter(x => x.pattes != null);
  verif(bornes.length === 2 && bornes.every(x => x.s.parties.pattes.length === x.pattes && x.s.parties.corps.anneaux.length === x.pattes / 2),
    `un mille-pattes a deux pattes par anneau, de 12 à 32 : ${bornes.map(x => `${Co.normaliser(x.plan.corps).pattes} au plan, ${x.s.parties.pattes.length} dessinées`).join(' ; ')}`);
  verif(ORG.every(t => types.has(t)), `chaque organe que le dessin connaît dit son point d'attache et ses éléments : ${ORG.join(', ')}` + (ORG.some(t => !types.has(t)) ? ` ; manquent : ${ORG.filter(t => !types.has(t)).join(', ')}` : ''));
  const pieds = new Set(R.flatMap(x => x.s.parties.pattes.map(p => p.pied)));
  verif(Object.keys(PIEDS).every(p => pieds.has(p)), `chaque pied a son nom : ${Object.keys(PIEDS).join(', ')}`);
  Co.etendre(avant);
}

console.log('5. Le même résultat, et ce qu\'il pèse');
{ const W = mondes[0];
  verif(JSON.stringify(Pl.planches(W.D)) === JSON.stringify(W.Q), 'dessinées deux fois, les planches et leurs parties sont les mêmes, au caractère près');
  const ctx = vm.createContext({}); for (const f of ['moteur/corps.js', 'monde/silhouette.js', 'monde/planches.js']) vm.runInContext(fs.readFileSync(racine(f), 'utf8'), ctx);
  ctx.M = W.D['biomes/foret.json']; ctx.cat = W.D['index.json'].catalogue?.monde || null;
  verif(vm.runInContext('JSON.stringify(OrvanePlanches.planche(M, cat))', ctx) === JSON.stringify(W.Q['silhouettes/foret.json']), 'dans un navigateur (globalThis.OrvanePlanches), la même planche de la forêt, parties comprises');
  let avec = 0, sans = 0, gz = 0, gz0 = 0, n = 0;
  for (const P of Object.values(W.Q)) { const t = JSON.stringify(P), P0 = JSON.parse(t); for (const s of Object.values(P0.silhouettes)) { delete s.parties; n++; }
    const t0 = JSON.stringify(P0); avec += t.length; sans += t0.length; gz += zlib.gzipSync(t).length; gz0 += zlib.gzipSync(t0).length; }
  const B = Object.keys(W.Q).length;
  verif(avec - sans < .5 * sans, `ce qu'elles pèsent, pour le monde d'Orvane (${B} planches, ${fx(n)} dessins) : ${ko(sans)} → ${ko(avec)} Ko (+${ko(avec - sans)} Ko, ${fx((avec - sans) / n)} octets par dessin, +${fx(100 * (avec - sans) / sans)} %) ; servies compressées, ${ko(gz0)} → ${ko(gz)} Ko (+${fx((gz - gz0) / B / 1024, 1)} Ko par planche)`);
}

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 1)} s)`);
process.exit(ok ? 0 : 1);
