// Orvane — LE PARTAGE DES PROIES (moteur/noyau/predation.js) — docs/59, le cœur du moteur
// La chaîne alimentaire d'un cycle, lieu par lieu : chaque prédateur prélève des proies selon ce qui est à sa portée ; sa satiété décide
// de ses naissances et de sa faim ; la vulnérabilité de chaque phénotype de proie décide qui est mangé. L'appétence se calcule entre
// taxons (plan de base) ; les phénotypes se partagent ensuite au prorata de ce qu'ils pèsent. Les charognards vivent des morts du lieu.
// Ce que le cycle lui donne (S) : le contexte du monde (REGLES, PAS, et les fonctions qui en dépendent : appetence, parPas), l'état de
// chaque lignée (etat : ses plans, ses populations), les lieux (biomes) et ce que les mécanismes éveillés y ajoutent (les régimes en
// spectre DT/DI, la grammaire GR, les castes SCa, l'esprit ES, le repos d'hiver DIA, la concurrence CMP, la domination DOM, le
// recouvrement REC, le renouvellement REN, les machines SY). Ce qu'il rend : dans chaque population, sa ration, sa satiété, et ce que
// les prédateurs lui prennent (pop.ration, pop.satiete, pop.predation). Il ne touche à rien d'autre, et rien de global.
'use strict';
(function (racine) {
  function partager(S) {
    const { biomes, taxons, etat, REGLES, PAS, DT, DI, GR, SCa, ES, DIA, CMP, DOM, REC, REN, CHAROGNE, mortalite, appetence, SY, B, prodCycle, parPas } = S;
    // (vitesse) l'appétence d'un chasseur pour une proie ne dépend que de leurs deux plans : une fois par cycle, non une fois par lieu
    // (et ce que pèse un chasseur devant un autre, par leurs masses : la concurrence (CMP), la domination (DOM) — une fois par paire et par cycle)
    const PAc = new WeakMap(), PAIRE = (pp, qp, i) => { let m = PAc.get(pp); if (!m) PAc.set(pp, m = new Map()); let v = m.get(qp);
      if (!v) { v = [CMP ? CMP(pp.masse_kg, qp.masse_kg) : 1, DOM ? DOM(pp, qp) : 1]; m.set(qp, v); } return v[i]; };
    const APc = new WeakMap(), APP = (pp, qp) => { let m = APc.get(pp); if (!m) APc.set(pp, m = new Map()); let f = m.get(qp);
      if (f === undefined) { f = DT ? DI.appetence(pp, qp, appetence(pp, qp)) : appetence(pp, qp); m.set(qp, f); } return f; };
    for (const bid of Object.keys(biomes)) {
      const T = [];   // un taxon présent : ses phénotypes, leur poids de proie (N × masse × vulnérabilité), son appétit
      for (const t of taxons) { if (t.eteint || t.plan.regime === 'synthetique') continue; const E = etat.get(t.id), pop = E.pops[bid]; if (!pop) continue;   // (une machine ne se mange pas)
        const Nt = pop.N.reduce((a, x) => a + x, 0); if (Nt <= 0) continue;
        const poids = pop.N.map((N, i) => N * (E.plans[i].masse_kg || 1) * E.vuln[i] * (pop.fp ?? 1) * (GR ? GR.vuln(t, biomes[bid], i) : 1) * (SCa ? SCa.vuln(t, i) : 1) * (ES ? ES.vuln(t, bid, i) : 1) * (DIA ? .3 + .7 * DIA(E.plans[i], biomes[bid]) : 1));
        T.push({ t, E, pop, Nt, poids, Bv: poids.reduce((a, x) => a + x, 0), regime: t.plan.regime }); }
      const preds = T.filter(q => q.regime === 'carnivore' || q.regime === 'omnivore');
      // (docs/52) les morts du lieu, une proie de plus pour ceux qui mangent la charogne : ce que la mort naturelle laisse en un cycle de référence
      if (REGLES.charognes > 0 && preds.some(p => p.t.plan.charogne > 0)) { let O = 0;
        for (const q of T) if (q.regime !== 'vegetal') q.pop.N.forEach((N, i) => { const m = q.E.plans[i].masse_kg || 1; if (m >= .01) O += N * m * mortalite(q.E.plans[i]); });
        O *= REGLES.charognes / PAS; if (O > 0) T.push({ t: CHAROGNE, E: null, pop: { N: [] }, Nt: 0, poids: [], Bv: O, regime: 'charogne' }); }
      for (const p of preds) {
        let A = 0; const x = new Array(T.length).fill(0);   // (docs/30 : un spectre choisit entre insectes, viande et sang)
        // (docs/52 : un mangeur de charogne partage sa quête entre les morts et les vivants, selon sa part de charogne — le vautour ne tue pas)
        T.forEach((q, k) => { if (q === p) return; let f = q.t === CHAROGNE ? p.t.plan.charogne || 0 : APP(p.t.plan, q.t.plan) * (REGLES.charognes > 0 && p.t.plan.charogne > 0 ? 1 - p.t.plan.charogne : 1);
          // (docs/53 : dans un monde réel, un buveur de sang de naissance — la tique, le moustique — boit aux bêtes vingt fois plus grandes que lui ;
          //  le moteur ne le laissait qu'à une lignée venue au sang par l'évolution, et la tique n'avait aucun hôte)
          if (REGLES.petites_proies && DT && !f && (p.t.plan.diete?.sang || 0) > 0 && (q.t.plan.masse_kg || 1) >= DI.REGLES.sang.rapport * (p.t.plan.masse_kg || 1) && q.t.plan.regime !== 'vegetal') f = DI.REGLES.sang.appetence * p.t.plan.diete.sang / Math.max(.05, DI.chair(p.t.plan.diete));
          if (!f) return; x[k] = q.Bv * (REN ? REN(q.t.plan) : 1) * f * (ES ? ES.acces(p.t, bid) : 1) * (GR ? GR.acces(p.t, biomes[bid]) : 1); A += x[k]; });
        const puiss = x.map(v => v > 0 ? Math.pow(v, REGLES.report_proies) : 0), z = puiss.reduce((a, v) => a + v, 0);
        p.part = puiss.map(v => z ? v / z : 0); p.x = x; p.A = A;                       // la part de chaque proie dans ce que ce prédateur prélève
        p.eff = p.E.chasse.map((c, i) => c * (.7 + .6 * (p.E.plans[i].perception ?? .5)) * (p.regime === 'omnivore' ? REGLES.chasse_omnivore : 1) * (GR ? GR.chasse(p.t, biomes[bid], i) : 1) * (ES ? ES.chasse(p.t, bid, i) : 1) * (p.t.plan.efficacite ?? 1));   // (docs/53 : plan.efficacite, l'adresse d'un chasseur réel, calée à l'assemblage)
        // (un omnivore ne cherche en viande qu'une part de ce qu'il mange : il ne dispute aux carnivores que cette part)
        // (docs/52 : un plan peut dire son métabolisme, ce qu'il brûle rapporté à un mammifère de sa masse : un poisson, un insecte mangent
        //  bien moins ; sans lui, 1)
        p.besoin = p.E.plans.map(pl => REGLES.besoin * Math.pow(pl.masse_kg || 1, .75) * (p.regime === 'omnivore' ? (REGLES.viande_omnivore ?? 1) * (DT ? (REGLES.viande_part ? DI.chair(pl.diete) : DI.viande(pl)) : 1) : 1) * (pl.metabolisme ?? 1) * (DIA ? DIA(pl, biomes[bid]) : 1));
        p.effMoy = p.pop.N.reduce((a, N, i) => a + N * p.eff[i], 0) / p.Nt; p.besoinMoy = p.pop.N.reduce((a, N, i) => a + N * p.besoin[i], 0) / p.Nt;
      }
      // les prédateurs se partagent les proies : chacun compte, en concurrents, ceux qui mangent les mêmes, au prorata de leur besoin
      // (docs/53 : dans un monde qui le dit, REGLES.concurrence_masse, deux chasseurs de tailles très différentes ne se disputent pas les mêmes
      //  proies au même endroit — l'araignée et la mésange, l'hermine et le loup : leur concurrence décroît avec leur écart de masse, comme
      //  celle des brouteurs, d'un écart-type de concurrence_masse décades. Sans cela, une araignée pesait d'autant moins devant les mésanges
      //  que ses besoins étaient petits, et n'avait jamais sa part)
      // (docs/30 : boire le sang d'une bête ne dispute pas sa chair aux chasseurs)
      // (les proies de chacun, et si sa prise les tue, une fois par lieu : la même somme, dans le même ordre, sans tout reparcourir)
      // (et un masque de bits de ce que chacun mange : deux chasseurs sans une proie commune ne parcourent rien — leur part commune est 0)
      const NW = (T.length + 31) >> 5;
      for (const p of preds) { p.mor = DT ? new Array(T.length) : null; p.bits = new Uint32Array(NW); p.pbits = new Uint32Array(NW); for (let k = 0; k < T.length; k++) { if (p.part[k]) p.pbits[k >> 5] |= 1 << (k & 31); if (p.x[k]) { p.bits[k >> 5] |= 1 << (k & 31); if (DT) p.mor[k] = DI.mortel(p.t.plan, T[k].t.plan); } } }
      // la part commune : les proies de p (sa part) que q mange aussi, dans l'ordre croissant, bit après bit
      // (docs/53 : dans un monde qui le dit, REGLES.recouvrement, sur chacune la part que q y met de sa quête, au plus celle de p — le renard,
      //  qui peut prendre un lapin mais cherche surtout des vers de terre, ne pèse plus sur le lynx pardelle de toute sa quête)
      const commune = (p, q) => { let c = 0; for (let w = 0; w < NW; w++) { let m = p.pbits[w] & q.bits[w]; while (m) { const b = m & -m, k = (w << 5) + 31 - Math.clz32(b); m ^= b; if (!DT || p.mor[k] === q.mor[k]) c += REC ? Math.min(p.part[k], q.part[k]) : p.part[k]; } } return c; };
      for (const p of preds) {
        let C = 0;
        if (p.A > 0) for (const q of preds) { if (q === p || q.A <= 0) continue; const commun = commune(p, q); C += q.Nt * (p.besoinMoy > 0 ? q.besoinMoy / p.besoinMoy : 0) * q.effMoy * commun * PAIRE(p.t.plan, q.t.plan, 0) * PAIRE(p.t.plan, q.t.plan, 1); }
        let R = 0, sN = 0;   // (une bête qui ne chasse pas, ou ne mange pas de viande : rien, jamais 0/0)
        p.pop.N.forEach((N, i) => { if (N <= 0) return; const den = p.Nt * p.effMoy + C, a = den > 0 ? p.A * p.eff[i] / den : 0, s = a > 0 ? a / (a + REGLES.demi_satiete * p.besoin[i]) : 0; const r = N * p.besoin[i] * s * PAS; R += r; sN += s * N; p.pop.ration[i] = r; });
        p.pop.satiete = sN / p.Nt;
        T.forEach((q, k) => { if (!p.part[k]) return; const Rq = R * p.part[k] * (DT ? DI.mortel(p.t.plan, q.t.plan) : 1); q.pop.N.forEach((N, i) => { if (q.poids[i]) q.pop.predation[i] += Rq * (q.poids[i] / q.Bv) / (q.E.plans[i].masse_kg || 1); }); });   // (docs/30 : une piqûre ne tue pas)
      }
      // (équilibrage du 6 novembre) les charognards vivent des morts du lieu : ce que la mort naturelle y laisse ce cycle (les bêtes, pas
      // les plantes ; × REGLES.cadavres), partagé selon le besoin de chacun. C'est un flux, pas un stock de proies : un charognard est
      // rassasié à moitié quand sa part égale son besoin (un prédateur, quand il a trente fois son besoin sur pied). Sans la règle, ils
      // broutent comme avant
      if (REGLES.cadavres > 0) { const D = T.filter(q => q.regime === 'detritivore');
        if (D.length) { let offre = 0; for (const q of T) if (q.regime !== 'detritivore' && q.regime !== 'vegetal') q.pop.N.forEach((N, i) => { offre += N * (q.E.plans[i].masse_kg || 1) * mortalite(q.E.plans[i]); });
          offre *= REGLES.cadavres; const besoinDe = pl => REGLES.besoin * Math.pow(pl.masse_kg || 1, .75) * PAS * (pl.metabolisme ?? 1);
          const demande = D.reduce((a, q) => a + q.pop.N.reduce((x, N, i) => x + N * besoinDe(q.E.plans[i]), 0), 0);
          for (const q of D) { let sN = 0; q.pop.N.forEach((N, i) => { if (N <= 0) return; const be = besoinDe(q.E.plans[i]), a = demande > 0 ? offre * be / demande : 0, sa = a / (a + be); q.pop.ration[i] = N * be * sa; sN += sa * N; });
            q.pop.satiete = q.Nt ? sN / q.Nt : 0; } } }
      if (SY) SY.reguler(bid, T, B[bid] || [], biomes[bid].capacite * prodCycle(biomes[bid]));   // les machines régulent (docs/16)
      for (const q of T) q.pop.N.forEach((N, i) => { q.pop.predation[i] = Math.min(q.pop.predation[i], N * parPas(REGLES.predation_max)); });   // nul ne mange plus qu'une part d'une population en un cycle
    }
  }
  const API = { partager };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvanePredation = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
