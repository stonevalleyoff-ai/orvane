// Orvane — LA GÉNÉTIQUE (moteur/noyau/genetique.js) — docs/8, 9, 10 ; docs/59, le cœur du moteur
// Les traits continus d'une population (sa moyenne génétique et sa variance additive, l'équation de Lande), la reproduction sexuée
// (les fréquences d'allèles, Mendel, Hardy-Weinberg, les portées), la parenté et l'écart génétique de deux lignées. Des fonctions
// pures : ni le contexte d'un monde, ni rien de global (seulement un cache de ce que montre un jeu d'allèles, par catalogue). Ce qui
// dépend des règles d'un monde (l'écriture au pas du monde, l'attrait, l'isolement reproductif, la méfiance) reste dans moteur/orvane.js.
'use strict';
(function (racine) {
  const CAT = typeof require === 'function' ? require('../catalogue.js') : racine.OrvaneCatalogue;   // le catalogue des traits (moteur/catalogue.js)
  const { clamp } = typeof require === 'function' ? require('./outils.js') : racine.OrvaneOutils;   // (moteur/noyau/outils.js)
  // --- les traits continus (docs/8) : par population, Q[trait] = { m : moyenne génétique, G : variance additive }, en
  // écarts-types naturels de la génération 0 ; la variance phénotypique est P = G + (1 − h2), l'environnement ne change pas ---
  const QUANT = CAT.QUANT || {};
  const lireQ = q => { const o = {}; for (const [k, d] of Object.entries(QUANT)) { const x = q?.[k];
    o[k] = x && Number.isFinite(x.m) ? { m: x.m, G: Number.isFinite(x.g) ? x.g : d.h2 } : { m: 0, G: d.h2 }; } return o; };
  const copieQ = Q => Object.fromEntries(Object.entries(Q).map(([k, x]) => [k, { m: x.m, G: x.G }]));
  // l'optimum d'une population : la niche du taxon, déplacée par l'écart du biome sur l'axe du trait (plus froid : plus grand)
  const optimumQ = (d, plan, b) => d.optimum && plan.niche && b?.axes ? d.optimum.pente * ((b.axes[d.optimum.axe] ?? .5) - (plan.niche[d.optimum.axe] ?? .5)) : 0;
  // ce que pèse une pente exponentielle (risque ∝ e^(pente·z)) dans une population N(m, P), rapporté à la génération 0
  // (m = 0, P = 1) : 1 le jour un, plus de 1 quand la moyenne monte du côté de la pente
  const penteQ = (Q, cle) => { let s = 0; for (const [k, d] of Object.entries(QUANT)) { const b = d[cle]; if (!b || !Q[k]) continue;
    s += b * Q[k].m + b * b * (Q[k].G - d.h2) / 2; } return Math.exp(s); };
  // la charge de la sélection stabilisante, rapportée à la génération 0 : au-dessus de 1 quand la population s'est
  // rapprochée de son optimum — l'adaptation rachète une part de ce que coûte un biome loin de la niche
  const chargeQ = (Q, plan, b) => { let s = 0; for (const [k, d] of Object.entries(QUANT)) { if (!Q[k]) continue; const w = d.omega2 || 20, P = Q[k].G + 1 - d.h2, th = optimumQ(d, plan, b);
    s += .5 * Math.log((w + 1) / (w + P)) - (Q[k].m - th) ** 2 / (2 * (w + P)) + th * th / (2 * (w + 1)); } return Math.exp(s); };
  // un cycle de génétique pour une population (équation de Lande : la moyenne génétique bouge de G/P × la différentielle de
  // sélection). Les morts sélectives (prédation, maladie : un risque ∝ e^(pente·z) tue une part décalée de pente·P ; les
  // joueurs : le z moyen rapporté) déplacent les survivants ; les naissances (fécondité) et la sélection stabilisante des
  // jeunes vers l'optimum, les nouveau-nés ; la mutation remet de la variance, la dérive en ôte et agite la moyenne
  // d'autant plus que la population est petite. La part de nouveau-nés fait l'échelle de temps : une génération par cycle
  // pour une bête qui se renouvelle entièrement, presque rien pour une bête longévive.
  function evoluerQ(Q, o) {
    const surv = Math.max(1e-9, o.N - o.Dmorts - o.Dpred - o.Dext), B = Math.max(0, o.B), Nap = surv + B; if (o.N <= 0 || Nap <= 1e-9) return;
    const g = B / Nap, Ne = Math.max(2, Nap);
    for (const [k, d] of Object.entries(QUANT)) {
      const x = Q[k]; if (!x) continue;
      const P = x.G + 1 - d.h2, w = d.omega2 || 20, th = optimumQ(d, o.plan, o.b);
      let ms = x.m;
      if (d.predation && o.Dpred > 0) ms -= x.G * d.predation * o.Dpred / surv;
      if (d.maladie && o.Dmal > 0) ms -= x.G * d.maladie * o.Dmal / surv;
      if (o.qExt && Number.isFinite(o.qExt[k]) && o.Dext > 0) ms -= (x.G / P) * (o.qExt[k] - x.m) * o.Dext / surv;
      const mn = x.m + x.G * ((d.fecondite || 0) + (o.sexe ? (d.attrait || 0) / 2 : 0) - (x.m - th) / (w + P));   // l'attrait : la moitié des gènes vient des pères choisis
      let m = (surv * ms + B * mn) / Nap;
      if (g > 0) m += Math.sqrt(g * x.G / Ne) * o.gauss();
      const Vm = d.h2 * d.h2 / (w + 1);                                  // la mutation qui tient la variance de la génération 0 à l'équilibre
      x.m = clamp(m, -8, 8); x.G = clamp(x.G + g * (Vm - x.G * x.G / (w + P) - x.G / (2 * Ne)), 1e-4, 4);
    }
  }
  // deux groupes qui se rejoignent : les moyennes se pondèrent, l'écart entre elles devient de la variance
  function melangerQ(A, na, B, nb) {
    const n = na + nb; if (n <= 0) return copieQ(A);
    const o = {}; for (const k of Object.keys(A)) { const a = A[k], b = B[k] || a;
      o[k] = { m: (na * a.m + nb * b.m) / n, G: clamp((na * a.G + nb * b.G) / n + na * nb * (a.m - b.m) ** 2 / (n * n), 1e-4, 4) }; }
    return o;
  }
  // --- la reproduction sexuée (docs/9) : par population, A[trait] = p, la fréquence de l'allèle qui porte le trait. Une bête
  // en a deux copies (Hardy-Weinberg) ; dominant : une suffit à montrer le trait, récessif : il en faut deux ---
  const domDe = (cat, id) => (cat[id]?.heredite ?? CAT.TRAITS[id]?.heredite) !== 'recessif';
  const cleDe = traits => traits.slice().sort().join('+');            // la clé d'un phénotype : ses traits ('' : le plan de base)
  // une mère d'allèle a, un père d'allèle b : la part de petits qui montrent le trait (E), et la part de l'allèle chez ceux
  // qui le montrent (exp) et chez les autres (non : les porteurs cachés d'un récessif)
  function mendel(a, b, dom) {
    const TT = a * b, Tt = a * (1 - b) + b * (1 - a), tt = (1 - a) * (1 - b);
    if (dom) { const E = TT + Tt; return { E, exp: E > 0 ? (TT + Tt / 2) / E : 0, non: 0 }; }
    const Nn = Tt + tt; return { E: TT, exp: 1, non: Nn > 0 ? Tt / 2 / Nn : 0 };
  }
  // une population sans mémoire génétique (un monde d'avant, un phénotype nouveau) : Hardy-Weinberg à rebours
  function allelesDe(phenotypes, N, cat, A0) {
    const tot = N.reduce((a, x) => a + x, 0) || 1, e = {};
    phenotypes.forEach((p, i) => { for (const id of p.traits) e[id] = (e[id] || 0) + N[i] / tot; });
    const A = {}; for (const id in e) { const x = clamp(e[id], 0, .999999); A[id] = domDe(cat, id) ? 1 - Math.sqrt(1 - x) : Math.sqrt(x); }
    for (const id in A0 || {}) if (Number.isFinite(A0[id])) A[id] = A0[id];
    return A;
  }
  // Les phénotypes ne disent que des TAUX : survie, fécondité, attrait de ceux qui montrent le trait et des autres. Les
  // fréquences d'allèles sont l'état (un phénotype rare fondu dans le plan de base ne perd pas ses allèles).
  // tauxDe : le taux par tête (num / den) de ceux qui montrent le trait id, et des autres (null : personne dans le groupe)
  function tauxDe(id, phenotypes, num, den) {
    let ne = 0, de = 0, nn = 0, dn = 0;
    phenotypes.forEach((ph, i) => { if (!(den[i] > 0)) return; if (ph.traits.includes(id)) { ne += num[i]; de += den[i]; } else { nn += num[i]; dn += den[i]; } });
    return [de > 0 ? ne / de : null, dn > 0 ? nn / dn : null];
  }
  // ce que deviennent des bêtes en Hardy-Weinberg (M = mendel) quand ceux qui montrent le trait ont le taux rE, les autres rN :
  // [copies de l'allèle, bêtes] par tête
  function ponderer(M, rE, rN) {
    if (rE == null) rE = rN ?? 1; if (rN == null) rN = rE;
    return [M.E * rE * M.exp + (1 - M.E) * rN * M.non, M.E * rE + (1 - M.E) * rN];
  }
  const alleleParmi = (p, dom, r) => { const [n, d] = ponderer(mendel(p, p, dom), r[0], r[1]); return d > 0 ? n / d : p; };
  // les naissances : chaque petit tire un allèle de sa mère (pm) et un de son père (pf) à chaque locus, les loci sont
  // indépendants ; ce qui se voit passe par CAT.exprimer. → Map(clé de phénotype → part des petits)
  // (ce qui se voit d'un jeu d'allèles : le même pour tous les mondes qui ont le même catalogue ; un cache par catalogue, quatre au
  // plus, borné — un cache unique servait à un monde ce qu'il avait appris d'un autre, et grossissait sans fin sur une longue genèse)
  const EXPRIME = new Map(), PAR_CAT = new WeakMap();
  function exprimeDe(cat) { let m = PAR_CAT.get(cat); if (m) return m.size > 2e5 ? (m.clear(), m) : m;
    const sig = Object.keys(cat || {}).join(','); m = EXPRIME.get(sig);
    if (!m) { if (EXPRIME.size >= 4) EXPRIME.delete(EXPRIME.keys().next().value); m = new Map(); EXPRIME.set(sig, m); }
    if (cat && typeof cat === 'object') PAR_CAT.set(cat, m); return m; }
  function portees(pm, pf, cat, epsilon = 1e-6) {
    const L = Object.keys(pm).map(id => [id, mendel(pm[id], pf[id] ?? pm[id], domDe(cat, id)).E]).filter(([, e]) => e > epsilon).sort((x, y) => y[1] - x[1]);
    const out = new Map(), vus = exprimeDe(cat);
    const rec = (k, pr, porte) => {
      if (pr < epsilon) return;
      if (k === L.length) { const c = porte.join('|'); let cle = vus.get(c);
        if (cle === undefined) { cle = (CAT.exprimer ? CAT.exprimer(porte, cat) : porte.slice().sort()).join('+'); vus.set(c, cle); }
        out.set(cle, (out.get(cle) || 0) + pr); return; }
      const [id, e] = L[k];
      if (e < 1) rec(k + 1, pr * (1 - e), porte);
      porte.push(id); rec(k + 1, pr * e, porte); porte.pop();
    };
    rec(0, 1, []);
    let z = 0; for (const v of out.values()) z += v; if (z > 0) for (const [k, v] of out) out.set(k, v / z);
    return out;
  }
  // le phénotype existant le plus proche d'une combinaison absente : celui dont les traits en sont le plus grand sous-ensemble
  function plusProche(cle, phenotypes) {
    const T = new Set(cle ? cle.split('+') : []); let best = 0, n = -1;
    phenotypes.forEach((p, i) => { if (p.traits.every(x => T.has(x)) && p.traits.length > n) { best = i; n = p.traits.length; } });
    return best;
  }
  // --- l'isolement et les hybrides (docs/10) ---
  // l'écart génétique entre deux groupes : la différence de fréquences d'allèles rapportée à leur diversité (le F_ST : 0, une
  // seule population ; 0,25, des populations très différenciées),
  // plus le quart de l'écart moyen des traits continus (en variances naturelles)
  function divergence(A1, Q1, A2, Q2) {
    let num = 0, den = 0;
    for (const id of new Set([...Object.keys(A1 || {}), ...Object.keys(A2 || {})])) { const p = A1?.[id] || 0, q = A2?.[id] || 0, m = (p + q) / 2; num += (p - q) ** 2; den += m * (1 - m); }
    let qd = 0, k = 0; for (const c in Q1 || {}) if (Q2?.[c]) { qd += (Q1[c].m - Q2[c].m) ** 2; k++; }
    return (num > 0 ? num / (4 * Math.max(den, .02)) : 0) + (k ? qd / k : 0) / 4;   // (le premier terme est le F_ST de deux populations)
  }
  // la parenté de deux lignées : depuis quand elles ne partagent plus leurs gènes (null : rien ne les relie)
  const parentDe = (id, T) => T.get(id)?.parent || (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null);
  function parente(A, B, T) {
    const chaine = t => { const L = [t.id]; let id = parentDe(t.id, T); while (id && !L.includes(id) && L.length < 60) { L.push(id); id = parentDe(id, T); } return L; };
    const cA = chaine(A), cB = chaine(B), c = cA.find(id => cB.includes(id)); if (!c) return null;
    const app = id => id === A.id ? A.apparu : id === B.id ? B.apparu : (T.get(id)?.apparu ?? 0), iA = cA.indexOf(c), iB = cB.indexOf(c);
    return { depuis: Math.min(iA > 0 ? app(cA[iA - 1]) : Infinity, iB > 0 ? app(cB[iB - 1]) : Infinity) };
  }
  // une moyenne continue de la lignée B, lue sur l'échelle de la lignée A (leurs plans diffèrent)
  function surEchelle(d, planA, planB) {
    const a = planA[d.champ], b = planB[d.champ]; if (typeof a !== 'number' || typeof b !== 'number') return 0;
    return d.mode === 'log' ? (a > 0 && b > 0 ? Math.log(b / a) / d.echelle : 0) : (b - a) / d.echelle;
  }
  // une lignée qui se sépare : ce que sa population a acquis devient son plan, et sa moyenne repart de zéro
  function replierQ(plan, Q) {
    for (const [k, d] of Object.entries(QUANT)) { const x = Q[k]; if (!x || !x.m || typeof plan[d.champ] !== 'number') continue;
      if (d.mode === 'log') { plan[d.champ] = +(plan[d.champ] * Math.exp(d.echelle * x.m)).toFixed(3);
        if (d.champ === 'taille_m' && typeof plan.masse_kg === 'number') plan.masse_kg = +(plan.masse_kg * Math.exp(3 * d.echelle * x.m)).toFixed(3); }
      else plan[d.champ] = +clamp(plan[d.champ] + d.echelle * x.m, 0, 1).toFixed(3);
      x.m = 0; }
  }
  const API = { QUANT, lireQ, copieQ, optimumQ, penteQ, chargeQ, evoluerQ, melangerQ, domDe, cleDe, mendel, allelesDe, tauxDe, ponderer, alleleParmi, exprimeDe, portees, plusProche, divergence, parentDe, parente, surEchelle, replierQ };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneGenetique = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
