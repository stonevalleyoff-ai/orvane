// Orvane — L'ÉTAT DE DÉPART D'UN CYCLE (moteur/noyau/depart.js) — docs/59, le cœur du moteur
// L'étape 2 du cycle, ce qui en est l'écologie :
//  - etatDeDepart : ce que le cycle lit de chaque lignée vivante. Par phénotype, son plan, ce que coûtent ses traits, sa vulnérabilité,
//    sa chasse, sa résistance ; par lieu, sa population telle que l'instantané la publiait (son effectif réparti entre ses
//    phénotypes par leurs fréquences, rapportées à leur somme pour ne perdre aucune bête dans les arrondis), ses allèles, ses traits
//    continus et ce qu'ils pèsent, ce qu'elle a appris des joueurs. Et par lieu, la biomasse qui pèse sur sa capacité (B) : les
//    herbivores en entier, les omnivores et les charognards en partie, les carnivores pas du tout (eux vivent des proies).
//  - presences : qui vit où, et ce que chacun porte au début du cycle, pour les croisements entre lignées apparentées (ils lisent
//    cet état-là : l'ordre des lignées ne change rien) ; chaque lignée par son nom (Tmap) ; l'isolement de deux lignées, calculé
//    une fois par paire (isoDe).
// La préparation des mécanismes éveillés qui lisent cet état (les machines, la grammaire, la flore, les souches) reste dans
// moteur/orvane.js, entre les deux.
// Ce que le cycle leur donne (X) : les règles du monde, les lignées (taxons) et les lieux, le catalogue des traits du monde (cat), le
// cycle (n), et les mécanismes éveillés (les traits continus GEN, les allèles SEX, la mémoire ME, l'isolement de deux lignées). Ce
// qu'ils rendent : { etat, B } ; { HYB, Tmap, presents, isoDe }.
'use strict';
(function (racine) {
  const { PART_K, coutDe, facteur, planDe } = typeof require === 'function' ? require('./plan.js') : racine.OrvanePlan;
  const { allelesDe, chargeQ, copieQ, lireQ, penteQ } = typeof require === 'function' ? require('./genetique.js') : racine.OrvaneGenetique;
  function etatDeDepart(X) {
    const { GEN, ME, REGLES, SEX, biomes, cat, taxons } = X;
    const etat = new Map(), B = {};
    for (const t of taxons) {
      if (t.eteint) continue;
      const plans = t.phenotypes.map(p => planDe(t.plan, p.traits, cat));
      const pops = {}, syn = t.plan.regime === 'synthetique';   // (une machine n'a ni allèles ni traits continus : docs/16)
      for (const pop of t.populations) {
        // (les fréquences publiées sont arrondies : rapportées à leur somme, elles redonnent tout l'effectif — sans cela, des milliers
        // de bêtes se perdaient chaque cycle dans les arrondis, sans mourir)
        const F = t.phenotypes.map(p => Math.max(0, +(p.frequence_par_biome?.[pop.biome] ?? p.frequence) || 0)), SF = F.reduce((a, x) => a + x, 0);
        const N = F.map(f => SF > 0 ? pop.effectif * f / SF : 0); if (SF <= 0 && N.length) N[0] = pop.effectif;
        pops[pop.biome] = { N, depuis: pop.depuis ?? t.apparu, avant: pop.effectif, predation: new Array(N.length).fill(0), ration: new Array(N.length).fill(0), satiete: null, maladie: pop.maladie ? { ...pop.maladie } : null, malade0: !!pop.maladie };
        if (SEX && !syn) pops[pop.biome].A = allelesDe(t.phenotypes, N, cat, pop.alleles);   // les fréquences d'allèles (un monde d'avant : déduites des phénotypes)
        // (docs/50, dans un monde à la mémoire éveillée : Mp, ce que la population publiait ; M, ce que ses migrants y mêleront ; att0, son attitude)
        Object.assign(pops[pop.biome], { flux0: pop.flux ?? 0, hyb0: pop.hybride?.part ?? 0, immig: 0, mef0: pop.mefiance ?? 0, hab0: pop.habituation ?? 0 }); if (ME) { const P = pops[pop.biome]; P.Mp = ME.lire(pop.memoire); if (pop.memoire) P.M = { ...P.Mp }; P.att0 = pop.attitude; } if (pop.hivernants) pops[pop.biome].hiv = { ...pop.hivernants }; if (pop.savoirs?.routes) pops[pop.biome].routes = pop.savoirs.routes; if (pop.recouvrement != null) pops[pop.biome].rec0 = pop.recouvrement; if (pop.recouvrement_avant != null) pops[pop.biome].recAvant = pop.recouvrement_avant; if (pop.infection) pops[pop.biome].inf0 = pop.infection;
        if (GEN && !syn) { const P = pops[pop.biome], Q = P.Q = lireQ(pop.quant);   // ce que ses traits continus pèsent : risque d'être mangé, naissances, maladie
          P.fp = penteQ(Q, 'predation'); P.ff = penteQ(Q, 'fecondite') * chargeQ(Q, t.plan, biomes[pop.biome]); P.fm = penteQ(Q, 'maladie'); }
        const s0 = pop.satiete ?? 0;   // (la satiété du cycle précédent : un omnivore qui trouve des proies pèse moins sur la place)
        (B[pop.biome] ??= []).push({ masse: t.plan.masse_kg || 1, biomasse: N.reduce((s, n, i) => s + n * (plans[i].masse_kg || 1) * (plans[i].regime === 'omnivore' ? 1 - .3 * s0 : plans[i].regime === 'detritivore' && REGLES.cadavres > 0 ? 0 : PART_K[plans[i].regime] ?? 1), 0) });   // (un charognard qui vit des morts ne pèse pas sur les plantes)
      }
      etat.set(t.id, { plans, pops, couts: t.phenotypes.map(p => coutDe(p.traits, cat)),
        vuln: t.phenotypes.map(p => facteur(p.traits, cat, 'vulnerabilite')), chasse: t.phenotypes.map(p => facteur(p.traits, cat, 'chasse')),
        resist: t.phenotypes.map(p => facteur(p.traits, cat, 'resistance')) });
    }
    return { etat, B };
  }
  function presences(X) {
    const { REGLES, SEX, etat, isolement, n, opt, taxons } = X;
    const HYB = SEX && REGLES.hybride?.actif !== false && opt.hybride !== false, Tmap = new Map(taxons.map(t => [t.id, t])), presents = {}, isoCache = new Map();
    const isoDe = (a, b) => { const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id; if (!isoCache.has(k)) isoCache.set(k, isolement(a, b, Tmap, n)); return isoCache.get(k); };
    if (HYB) for (const t of taxons) { if (t.eteint || t.plan.regime === 'synthetique') continue; for (const [bid, P] of Object.entries(etat.get(t.id).pops)) { const Nt = P.N.reduce((a, x) => a + x, 0); if (Nt < 1) continue;
      (presents[bid] ??= []).push({ t, N: Nt, A0: P.A ? { ...P.A } : null, Q0: P.Q ? copieQ(P.Q) : null }); } }
    return { HYB, Tmap, presents, isoDe };
  }
  const API = { etatDeDepart, presences };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneDepart = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
