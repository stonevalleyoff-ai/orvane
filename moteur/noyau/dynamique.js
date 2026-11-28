// Orvane — LA DYNAMIQUE DE CHAQUE LIGNÉE (moteur/noyau/dynamique.js) — docs/59, le cœur du moteur
// L'étape 4 du cycle, lignée par lignée et lieu par lieu : les naissances et les morts (la place, la ration, la faim, la maladie, les
// catastrophes, la chasse des hommes), les petits et leurs allèles (Mendel, les croisements entre lignées apparentées, l'introgression),
// les traits continus qui évoluent, les retraits et les apports des joueurs, l'essaimage vers les voisins, l'hivernage et son retour ;
// puis, pour chaque lignée, les combinaisons nées sans phénotype et, parfois, un trait nouveau.
// Ce que le cycle lui donne (X) : le contexte du monde (REGLES, PAS, et les fonctions qui en dépendent : convenance, croissance,
// prodCycle, parPas, routeHiver, attraitDe, les axes d'un lieu à sa saison), son hasard (R, RM, gauss : les générateurs du cycle, qui
// continuent leur suite), l'état de chaque lignée (etat : ses plans, ses populations, que le partage des proies vient de nourrir), les
// lieux, ce que les joueurs demandent (prT), ce que les mécanismes éveillés y ajoutent, et les modules que le moteur a chargés ou non
// (le calendrier CALEN, le climat CLI, les diètes DI). Ce qu'il rend : les migrations, à appliquer ensuite (l'étape 5, les arrivées) ;
// il écrit dans chaque population ses effectifs, ses morts, ses gènes, et dans le journal du cycle (ev) ce qui s'y passe.
'use strict';
(function (racine) {
  const { clamp, hasard } = typeof require === 'function' ? require('./outils.js') : racine.OrvaneOutils;
  const { BANDE, charge, coutDe, facteur, fenetreDe, memeMilieu, mortalite, photoperiode, planDe } = typeof require === 'function' ? require('./plan.js') : racine.OrvanePlan;
  const { QUANT, alleleParmi, cleDe, copieQ, domDe, evoluerQ, mendel, plusProche, ponderer, portees, surEchelle, tauxDe } = typeof require === 'function' ? require('./genetique.js') : racine.OrvaneGenetique;
  const CAT = typeof require === 'function' ? require('../catalogue.js') : racine.OrvaneCatalogue;   // les traits (moteur/catalogue.js)
  function vivre(X) {
    const { B, CONV, DIA, DT, ES, GEN, HOMJ, HYB, JOURC, ME, MILT, MT, PAS, R, REGLES, RM, SCa, SEX, SF, SL, SMe, SP, SR, SV, SY, attraitDe, axesA, axesCycle, biomes, cat, convenance, croissance, etat, ev, gauss, inst, isoDe, n, opt, parPas, phase, prT, presents, prodCycle, routeHiver, saison, sinistres, taxons, CALEN, CLI, DI } = X;
    const migrations = [];      // { taxon, vers, N[] } à appliquer après la boucle
    // (docs/38) l'hivernage : seulement si le monde le veut (REGLES.hivernage.actif) et s'il a une année
    const HIV = REGLES.hivernage?.actif > 0 && phase != null ? { A: inst.monde.annee, k: n % inst.monde.annee } : null, hivEv = {};
    const fenetres = H => { const F = REGLES.hivernage.fenetres; H.depart = fenetreDe(H.k, H.A, F.depart); H.retour = fenetreDe(H.k, H.A, F.retour);
      H.loin = H.depart || H.retour || fenetreDe(H.k, H.A, F.partie); return H; };   // (hors de ces trois fenêtres, un hivernant attardé rentre)
    if (HIV) fenetres(HIV);
    // (docs/52) dans un monde au calendrier, chaque lieu a ses fenêtres : celles de SON année
    // (docs/53) et dans un monde qui le dit (REGLES.hivernage.photoperiode), les migrateurs partent quand les jours raccourcissent sous un
    // seuil, et reviennent quand ils rallongent au-dessus d'un autre, à la latitude du lieu : une cigogne part en août, avant le froid
    const HIVc = new Map(), PP = REGLES.hivernage?.photoperiode, HIVde = HIV && SL ? b => { let H = HIVc.get(b.id); if (!H) { const ph = SL.get(b.id)?.phase, pp = PP && Number.isFinite(b.lieu?.lat) ? photoperiode(b.lieu.lat, PP) : null;
      if (pp) { const A = 365, k = Math.min(A - 1, CALEN.jourAn(JOURC) - 1), L = PP.largeur || 30; H = { A, k, depart: fenetreDe(k, A, [pp.dep / A, (pp.dep + L) / A]), retour: fenetreDe(k, A, [pp.ret / A, (pp.ret + L) / A]) };
        H.loin = H.depart || H.retour || fenetreDe(k, A, [(pp.dep + L) / A, pp.ret / A]); }
      else H = ph == null ? HIV : fenetres({ A: HIV.A, k: Math.floor(ph * HIV.A) % HIV.A }); HIVc.set(b.id, H); } return H; } : () => HIV;
    // (docs/52) les naissances ont leur saison, dans un monde au calendrier : la fenêtre de la lignée, à la phase du lieu
    const NSR = REGLES.naissances, NS = SL && NSR?.force > 0 ? (t, b) => { const s = SL.get(b.id); if (!s) return 1; const W = t.plan.naissances || {}, c = W.centre ?? NSR.centre, L = W.largeur ?? NSR.largeur;
      let d = Math.abs(s.phase - c); d = Math.min(d, 1 - d); const w = NSR.fond + (1 - NSR.fond) * (d < L / 2 ? Math.cos(Math.PI * d / L) ** 2 : 0) / (L / 2);
      return 1 + NSR.force * (s.force ?? 1) * (w - 1); } : null;
    const bSc = new Map();
    for (const t of taxons) {
      if (t.eteint) continue;
      const E = etat.get(t.id), K = t.phenotypes.length;
      for (const [bid, pop] of Object.entries(E.pops)) {
        const b = biomes[bid]; if (!b) { delete E.pops[bid]; continue; }
        let bS = phase == null && !SMe ? b : bSc.get(bid); if (!bS) bSc.set(bid, bS = { ...b, axes: axesCycle(b) });   // le biome tel qu'il est en cette saison (vitesse : une fois par lieu, il n'est que lu)
        const conv = convenance(t.plan, bS), Keff = b.capacite * prodCycle(b) * (SF ? SF.ratio(t, bid) : 1) * (t.plan.place ?? 1);   // (docs/52 : la place qu'une espèce réelle trouve, plan.place)   // (docs/17 : ce qui reste à brouter)
        const syn = SY && t.plan.regime === 'synthetique';                                        // (une machine : sa presse est celle de l'énergie, docs/16)
        const sat = syn ? SY.sat(bid) : Keff > 0 ? charge(B[bid], t.plan.masse_kg || 1) / (Keff * BANDE) * (SF ? SF.concurrence(t, bid) : 1) : 9;   // (docs/17 : pesée par ce qu'on mange en commun)
        pop.satC = sat;
        const pr = prT[t.id]?.[bid] || {}, tot = pop.N.reduce((a, x) => a + x, 0) || 1;
        let ret = pr.retrait || {};
        // (docs/56) la chasse, la régulation : ce que les hommes prennent ce jour à la population, un retrait de plus
        const hom = HOMJ && !syn ? HOMJ(t.id, b) : 0; if (hom > 0) ret = { ...ret, '*': (ret['*'] || 0) + hom * tot };
        // la maladie : une épidémie en cours tue selon la virulence et la résistance de chaque phénotype ; sinon, le surpeuplement
        // (et une épidémie chez les voisins) peut en faire éclore une
        let mal = pop.maladie;
        if (mal) { if (--mal.reste <= 0) { ev.push({ type: 'remission', taxon: t.id, biome: bid, detail: 'l\'épidémie s\'éteint' }); mal = pop.maladie = null; } }
        else if (tot >= 20 && !syn) {   // (un monde à souches : les épidémies sont les leurs, docs/18 — mais les tirages se font quand même, ce qui
          // garde le hasard du reste du monde le jour où l'on éveille les souches ; les voisins comptent tels qu'ils étaient au début du cycle)
          const M = REGLES.maladie, voisinsMalades = (b.voisins || []).some(v => E.pops[v]?.malade0);
          if (R() < (M.chance * Math.max(0, sat - .5) * 2 + (voisinsMalades ? M.contagion * M.chance * 10 : 0)) * PAS) {
            const reste = Math.round((M.duree[0] + R() * (M.duree[1] - M.duree[0])) / PAS), virulence = +(M.virulence[0] + R() * (M.virulence[1] - M.virulence[0])).toFixed(3);
            if (!SP) { mal = pop.maladie = { reste, virulence }; ev.push({ type: 'epidemie', taxon: t.id, biome: bid, detail: `virulence ${Math.round(mal.virulence * 100)} % par cycle, ${mal.reste} cycles` }); }
          }
        }
        const nais = new Array(K).fill(0), morts = new Array(K).fill(0), dispo = new Array(K).fill(0), suiv = new Array(K).fill(0);
        let faim = 0, mortsNat = 0, mortsExt = 0, mortsMal = 0;
        for (let i = 0; i < K; i++) {
          const Np = pop.N[i]; if (Np <= 0) continue;
          const reg = E.plans[i].regime, s = pop.satiete ?? 0;
          if (syn) { const d = SY.vie(t, bid, pop, E.plans[i], Np, sinistres[bid], conv); nais[i] = d.nais; morts[i] = d.morts; mortsNat += d.morts; continue; }
          // (un phénotype dont la tolérance diffère de celle de la lignée — la graisse brune, docs/32 — a sa propre convenance ; les autres gardent celle de la lignée)
          const convI = E.plans[i].tolerance != null && E.plans[i].tolerance !== t.plan.tolerance ? convenance(E.plans[i], bS) : conv;
          const r = croissance(E.plans[i]) * (1 - E.couts[i]) * convI * (pop.ff ?? 1), act = DIA ? DIA(E.plans[i], b) : 1; let m = mortalite(E.plans[i]) + (convI < .3 ? .08 * PAS : 0);
          if (DIA) m *= act;   // (docs/53 : le repos d'hiver)
          const place = Math.max(0, 1 - sat * (SF ? SF.facteur(t, bid, i) : 1) * (SV ? SV.facteur(t, bid, i) : 1) * (SCa ? SCa.facteur(t, bid, i) : 1) * (ES ? ES.place(t, bid, i) : 1));   // (docs/26 : larve et adulte ne se disputent pas tout)   // (docs/17 : qui supporte les défenses des plantes y trouve plus)
          // ce qui nourrit les naissances : la place pour l'herbivore ; la viande mangée pour le carnivore, convertie en petits à
          // REGLES.conversion (l'énergie vient des plantes : un prédateur ne vit pas de prédateurs qui vivent de lui) ; les deux pour l'omnivore
          const viande = REGLES.conversion * pop.ration[i] / (E.plans[i].masse_kg || 1) / (E.plans[i].metabolisme ?? 1);   // (docs/52 : qui brûle peu fait plus de petits de ce qu'il mange)
          // (docs/53 : dans un monde réel, regles.viande_part, un omnivore naît de ce qu'il mange dans la part où il le mange — le glouton, 80 % de chair,
          //  de sa chasse et des morts ; ailleurs, un omnivore type : 30 %)
          const cm = reg === 'omnivore' && REGLES.viande_part && DT ? DI.chair(E.plans[i].diete) : .3;
          if (reg === 'carnivore') { nais[i] = Math.min(Np * r * s, viande); m *= DIA ? 1 + (REGLES.faim_carnivore ?? 3) * (1 - s) * (1 - s) * act : 1 + (REGLES.faim_carnivore ?? 3) * (1 - s) * (1 - s); faim = Math.max(faim, (1 - s) * act); }   // un carnivore affamé meurt plus
          else if (reg === 'omnivore') nais[i] = Np * r * place * (1 - cm * s) * (t.plan.regime === 'carnivore' ? REGLES.omnivore_vegetal ?? 1 : REGLES.omnivore_vegetal_base ?? 1) * (DT ? DI.vegetal(E.plans[i]) : 1) + Math.min(Np * r * cm * s * (DT && !REGLES.viande_part ? DI.viande(E.plans[i]) : 1), viande);
          else if (reg === 'detritivore' && REGLES.cadavres > 0) { nais[i] = Np * r * s; m *= 1 + (REGLES.faim_carnivore ?? 3) * (1 - s) * (1 - s); faim = Math.max(faim, 1 - s); }   // (les morts du lieu sont sa place : il naît d'autant plus qu'il est rassasié ; affamé, il meurt plus et s'en va)
          else nais[i] = Np * r * place * (reg === 'detritivore' ? REGLES.detritivore_vegetal ?? 1 : 1);
          morts[i] = Np * m; mortsNat += morts[i];
          if (SR) nais[i] *= SR.naissances(t, bid, i);   // (docs/25) pondre ou mettre bas
          if (NS) nais[i] *= NS(t, b);   // (docs/52) la saison des naissances
          if (mal) { const mm = Np * mal.virulence * PAS * E.resist[i] * (pop.fm ?? 1) * (.5 + Math.min(1.5, sat)); morts[i] += mm; mortsMal += mm; }   // la maladie frappe les faibles et les entassés
          if (SP) { const mp = SP.mortalite(t, bid); if (mp > 0) { const mm = Np * mp * E.resist[i] * (pop.fm ?? 1); morts[i] += mm; mortsMal += mm; } }   // les souches (docs/18)
          if (sinistres[bid]) { const loco = E.plans[i].locomotion || [], type = sinistres[bid];                                      // la catastrophe épargne qui peut s'y soustraire
            const echappe = type === 'incendie' ? loco.includes('vol') || loco.includes('fouissage') : type === 'crue' ? loco.includes('vol') || loco.includes('nage') : loco.includes('vol');
            if (!echappe) { const mc = Np * REGLES.catastrophes[type].mortalite; morts[i] += mc; mortsNat += mc; } }
        }
        // les petits : clonaux (chacun du phénotype de son parent), ou mendéliens — la mère pèse par sa fécondité, le père
        // aussi par son attrait ; leurs phénotypes suivent les allèles, pas ceux de leurs parents
        // les croisements avec une lignée apparentée du même biome : une part h des mères a un père de l'autre lignée ; une part
        // I (l'isolement) de ces petits hybrides ne vit pas ; les autres apportent la moitié des gènes de l'autre lignée
        let hyb = null;
        if (HYB && presents[bid] && !syn) { const H = REGLES.hybride; let perte = 0, part = 0, best = null;
          for (const o of presents[bid]) { if (o.t === t) continue; const I = isoDe(t, o.t); if (I >= .995) continue;
            const h = H.rencontre * (1 - I) * o.N / (tot + o.N); if (h < 1e-5) continue;
            perte += h * I; part += h * (1 - I); const c = { o, I, h: h * (1 - I) }; (hyb ??= []).push(c); if (!best || c.h > best.h) best = c; }
          if (hyb) { perte = Math.min(.9, perte); for (let i = 0; i < K; i++) nais[i] *= 1 - perte; pop.hyb = { avec: best.o.t.id, part, isolement: best.I }; } }
        let nb = nais, pm = null, pf = null;
        const Btot = nais.reduce((a, x) => a + x, 0);
        if (SEX && pop.A && Btot > 0) {
          const wm = nais, wf = nais.map((x, i) => x * attraitDe(t.phenotypes[i].traits, cat)); pm = {}; pf = {};
          for (const id in pop.A) { const dom = domDe(cat, id); pm[id] = alleleParmi(pop.A[id], dom, tauxDe(id, t.phenotypes, wm, pop.N)); pf[id] = alleleParmi(pop.A[id], dom, tauxDe(id, t.phenotypes, wf, pop.N)); }
          const idx = E.idx ??= new Map(t.phenotypes.map((p, i) => [cleDe(p.traits), i])); nb = new Array(K).fill(0);
          for (const [cle, part] of portees(pm, pf, cat, clamp(.02 / Btot, 1e-6, .01))) { const n = Btot * part, i = idx.get(cle);   // (sous un cinquantième de petit, une combinaison ne compte pas)
            if (i !== undefined) { nb[i] += n; continue; }
            let fb = (E.proche ??= new Map()).get(cle); if (fb === undefined) E.proche.set(cle, fb = plusProche(cle, t.phenotypes)); nb[fb] += n;                                       // une combinaison qui n'existe pas encore : chez le plus proche,
            if (n >= .05) { const M = (E.manque ??= {})[cle] ??= { n: 0, parts: [] }; M.n += n; M.parts.push([bid, fb, n]); } }   // et notée pour la faire naître
        }
        for (let i = 0; i < K; i++) dispo[i] = Math.max(0, pop.N[i] + nb[i] - morts[i] - pop.predation[i]);
        // les retraits (ou apports) extérieurs ; la demande qu'un phénotype épuisé ne peut servir se reporte sur les autres
        const ext = new Array(K).fill(0); let reste = 0;
        for (let i = 0; i < K; i++) { const d = ((ret[t.phenotypes[i].id] || 0) + (ret['*'] || 0) * pop.N[i] / tot) * (syn ? SY.reparation(t) : 1); ext[i] = clamp(d, -pop.N[i], dispo[i]); if (d > dispo[i]) reste += d - dispo[i]; }
        if (reste > 0) { const marge = dispo.map((x, i) => Math.max(0, x - ext[i])), tm = marge.reduce((a, x) => a + x, 0); if (tm > 0) for (let i = 0; i < K; i++) ext[i] += Math.min(marge[i], reste * marge[i] / tm); }
        for (let i = 0; i < K; i++) { mortsExt += Math.max(0, ext[i]); suiv[i] = Math.max(0, dispo[i] - ext[i]); }
        // les allèles après le cycle : les adultes survivants gardent les leurs (Hardy-Weinberg à p), les petits survivants
        // ceux de leurs parents ; puis la mutation (gain, perte) et la dérive, d'autant plus forte que la population est petite
        if (SEX && pop.A) {
          const tot2 = suiv.reduce((a, x) => a + x, 0), S = REGLES.sexe, Nad = pop.N.reduce((a, x) => a + x, 0);
          if (tot2 > 0) { const phi = clamp(Btot / tot2, 0, 1), Ne = Math.max(2, tot2);
            const k = suiv.map((x, i) => { const v = pop.N[i] + nb[i]; return v > 0 ? x / v : 0; }), adS = pop.N.map((x, i) => x * k[i]), nbS = nb.map((x, i) => x * k[i]);
            for (const id of Object.keys(pop.A)) { const dom = domDe(cat, id), p = pop.A[id], Mo = mendel(p, p, dom), Mn = pm ? mendel(pm[id], pf[id], dom) : Mo;
              const [na, da] = ponderer(Mo, ...tauxDe(id, t.phenotypes, adS, pop.N)), [nn, dn] = ponderer(Mn, ...tauxDe(id, t.phenotypes, nbS, nb));
              const den = Nad * da + Btot * dn; let q = den > 0 ? (Nad * na + Btot * nn) / den : p;
              q += phi * (S.gain * (1 - q) - S.perte * q); if (phi > 0 && S.derive !== false) q += Math.sqrt(phi * q * (1 - q) / (2 * Ne)) * gauss();
              q = clamp(q, 0, 1); if (q < 1e-6) delete pop.A[id]; else pop.A[id] = q; } }
        }
        // l'introgression : les petits hybrides survivants portent la moitié des gènes de l'autre lignée
        if (hyb) { const tot3 = suiv.reduce((a, x) => a + x, 0), phi = tot3 > 0 ? clamp(nais.reduce((a, x) => a + x, 0) / tot3, 0, 1) : 0;
          for (const c of hyb) { const w = phi * c.h / 2; if (!(w > 0)) continue;
            if (pop.A && c.o.A0) for (const id of new Set([...Object.keys(pop.A), ...Object.keys(c.o.A0)])) { const q = (pop.A[id] || 0) + w * ((c.o.A0[id] || 0) - (pop.A[id] || 0)); if (q >= 1e-6) pop.A[id] = clamp(q, 0, 1); else delete pop.A[id]; }
            if (pop.Q && c.o.Q0) for (const [k, d] of Object.entries(QUANT)) { const x = pop.Q[k], y = c.o.Q0[k]; if (!x || !y) continue; const z = y.m + surEchelle(d, t.plan, c.o.t.plan), dz = z - x.m;
              x.m += w * dz; x.G = clamp(x.G + w * (1 - w) * dz * dz, 1e-4, 4); } } }
        pop.mortsNat = mortsNat; pop.mortsExt = mortsExt; pop.mortsPred = pop.predation.reduce((a, x) => a + x, 0); pop.mortsMal = mortsMal;
        if (GEN && pop.Q) evoluerQ(pop.Q, { N: pop.N.reduce((a, x) => a + x, 0), Dmorts: morts.reduce((a, x) => a + x, 0), Dmal: mortsMal, Dpred: pop.mortsPred,
          Dext: mortsExt, qExt: pr.q, B: nais.reduce((a, x) => a + x, 0), plan: t.plan, b, gauss, sexe: SEX });
        if (opt.trace) opt.trace({ taxon: t.id, biome: bid, N: tot, sat, conv, satiete: pop.satiete, ration: pop.ration ? pop.ration.reduce((a, x) => a + x, 0) : 0, nais: nais.reduce((a, x) => a + x, 0), mortsNat, mortsPred: pop.mortsPred, mortsExt, mortsMal, saison: saison?.nom });
        // essaimer vers les voisins où l'on peut vivre, chacun à proportion de ce qu'il convient : un flux continu, pas une
        // vague vers un voisin tiré au sort (qui faisait d'une petite population voisine une suite d'explosions et d'effondrements)
        // (docs/52 : dans un monde réel, on essaime dans son milieu — la terre vers la terre, l'eau vers l'eau, les rives vers les deux :
        //  un cerf sait nager, il ne vit pas pour autant dans le lac)
        const essaimer = (part, filtre0) => { const filtre = filtre0 || (b.lieu ? memeMilieu(b) : null), cibles = (b.voisins || []).filter(v => biomes[v] && (!filtre || filtre(biomes[v])) && (!b.traversees?.includes(v) || CLI.traverse(t.plan))).map(v => [v, CONV(t.plan, v)]).filter(([, c]) => c > 0), W = cibles.reduce((a, [, c]) => a + c, 0);
          if (!(W > 0) || !(part > 0)) return;
          if (REGLES.colonisation == null) { for (const [vers, c] of cibles) { const f = part * c / W; migrations.push({ taxon: t.id, vers, N: suiv.map(x => x * f), Q: pop.Q, A: pop.A && { ...pop.A }, ...(ME ? { M: pop.M || null } : {}) }); }   // (docs/50) ils emportent ce qu'ils ont appris des joueurs
            for (let i = 0; i < K; i++) suiv[i] *= 1 - part; return; }
          // (vitesse) un essaim garde les gènes de sa population, sans les copier : rien ne les change avant les arrivées, qui les mêlent dans un
        // objet neuf ou les copient. (Ses allèles, si : un trait nouveau peut y entrer avant — ils sont copiés)
        // (docs/52) un monde réel : on essaime chez les siens ; un lieu où la lignée n'est pas, un petit groupe ne le fonde que de loin en
          // loin (REGLES.colonisation par cycle de référence, × ce que le lieu lui convient) — une espèce réelle garde son aire, et l'étend
          // lentement, comme le chacal doré gagne l'Europe ; sans cela, en quelques jours, chacune aurait gagné tous les lieux qui lui vont
          const Ns = suiv.reduce((x, y) => x + y, 0); let parti = 0;
          for (const [vers, c] of cibles) { let f = part * c / W;
            if (!E.pops[vers]) { if (!(Ns >= 40) || hasard(`${t.id}|${bid}|${vers}|${part}`, inst.monde.graine, n) >= parPas(Math.min(.9, REGLES.colonisation * (t.plan.dispersion ?? 1))) * c) continue; f = 4 / Ns; }   // (docs/52 : plan.dispersion, ce qu'une espèce porte loin — le loup bien plus que le chevreuil)
            migrations.push({ taxon: t.id, vers, N: suiv.map(x => x * f), Q: pop.Q, A: pop.A && { ...pop.A }, ...(ME ? { M: pop.M || null } : {}) }); parti += f; }
          for (let i = 0; i < K; i++) suiv[i] *= 1 - parti; };
        // la faim pousse un prédateur vers ses voisins
        if (faim > 1 - REGLES.faim_migration) essaimer(.05 * (faim - (1 - REGLES.faim_migration)) / REGLES.faim_migration * PAS);
        // (docs/31) par-delà la mer : qui vole, nage ou dérive gagne peu à peu les terres qu'on ne rejoint qu'en la traversant
        if (b.traversees?.length && CLI && CLI.traverse(t.plan)) { const Ns = suiv.reduce((a, x) => a + x, 0), f = CLI.REGLES.iles.derive * Ns;   // (un flux, ou de temps en temps un petit groupe de deux : de quoi fonder)
          if (Ns >= 4 && (f >= 2 || CLI.hasard(t.id + '|' + bid, n) < f / 2)) essaimer(Math.min(.5, Math.max(f, 2) / Ns), x => b.traversees.includes(x.id)); }
        // mutation : un peu de chaque naissance va vers un autre phénotype du taxon
        if (K > 1 && !SEX) for (let i = 0; i < K; i++) { const q = Math.min(nais[i] * REGLES.mutation, Math.max(0, suiv[i])); if (q > 0) { const j = (i + 1 + Math.floor(R() * (K - 1))) % K; suiv[i] -= q; suiv[j] += q; } }
        // déplacements imposés (le joueur emporte des bêtes ailleurs)
        for (const d of pr.deplacement || []) if (biomes[d.vers] && d.n > 0) {
          const part = Math.min(1, d.n / Math.max(1, suiv.reduce((a, x) => a + x, 0)));
          migrations.push({ taxon: t.id, vers: d.vers, N: suiv.map(x => x * part), Q: pop.Q && copieQ(pop.Q), A: pop.A && { ...pop.A }, ...(ME ? { M: pop.M || null } : {}) }); for (let i = 0; i < K; i++) suiv[i] *= 1 - part;
        }
        // (docs/36) des bêtes nées en élevage et relâchées : elles arrivent avec leurs gènes, comme des migrants
        const AP = pr.apport; if (AP && AP.n > 0) { const Na = new Array(K).fill(0);
          for (const [ph, x] of Object.entries(AP.N || { base: AP.n })) { let i = t.phenotypes.findIndex(p => p.id === ph); if (i < 0) i = plusProche(ph === 'base' ? '' : ph, t.phenotypes); Na[i] += Math.max(0, x); }
          migrations.push({ taxon: t.id, vers: bid, N: Na, Q: pop.Q && Object.fromEntries(Object.entries(pop.Q).map(([k, x]) => [k, { m: Number.isFinite(AP.a?.[k]) ? AP.a[k] : x.m, G: x.G }])),
            A: pop.A && { ...Object.fromEntries(Object.keys(pop.A).map(id => [id, 0])), ...(AP.alleles || {}) } }); }
        // migration naturelle : sans place, on essaime (un carnivore, lui, part quand il a faim : plus haut)
        if (t.plan.regime !== 'carnivore' && sat > REGLES.seuil_surpeuple) essaimer(REGLES.migration * clamp((sat - REGLES.seuil_surpeuple) / (1 - REGLES.seuil_surpeuple), 0, 2) * PAS);
        // (docs/15) dans un monde à parcelles : une petite part s'en va toujours vers les parcelles voisines du même biome (c'est
        // ainsi qu'une espèce gagne de proche en proche), et une parcelle qui a perdu sa place chasse ses bêtes vers ses voisines
        // (docs/52 : dans un monde réel, des lieux qui ont lieu.lat, on gagne aussi les lieux voisins d'un autre type où l'on peut vivre)
        if (REGLES.dispersion > 0 && b.type) essaimer(parPas(REGLES.dispersion), b.lieu ? memeMilieu(b) : v => v.type === b.type);
        if (REGLES.fuite > 0 && sat > 1) essaimer(parPas(Math.min(.5, REGLES.fuite * (1 - 1 / sat))));
        if (syn) essaimer(SY.exploration);                                                         // les machines explorent (docs/16)
        // (docs/38) l'hivernage : à la fin de l'automne, une part s'en va, cycle après cycle, vers le voisin le plus doux en hiver ;
        // au printemps, les hivernants (la part de la population venue d'ailleurs, avec les petits qu'ils y ont eus) rentrent chez eux
        const HV = HIVde(b); if (HV && !syn && t.plan.regime !== 'vegetal') {
          const somme = () => suiv.reduce((a, x) => a + x, 0), noter = (sens, chez, autre, x) => ((hivEv[t.id] ??= {})[sens] ??= []).push([chez, autre, x]);
          const emporte = (vers, f, hiv) => { migrations.push({ taxon: t.id, vers, N: suiv.map(x => x * f), Q: pop.Q && copieQ(pop.Q), A: pop.A && { ...pop.A }, saison: true, ...(hiv ? { hiv } : {}) });
            for (let i = 0; i < K; i++) suiv[i] *= 1 - f; pop.saisonnier = true; };
          if (pop.hiv) for (const de of Object.keys(pop.hiv).sort()) { const h = pop.hiv[de], Ns = somme();   // ceux qui rentrent
            if (!biomes[de] || !(Ns > 0)) { delete pop.hiv[de]; continue; }   // (leur pays n'est plus : ils restent)
            const f = HV.retour ? h / HV.retour.reste : HV.loin ? 0 : h; if (!(f > 0)) continue;
            if (HV.retour?.rang === 0) noter('retour', de, bid, h * Ns);
            emporte(de, f);
            if (f >= 1 - 1e-9) { pop.hiv = {}; break; }
            for (const k of Object.keys(pop.hiv)) pop.hiv[k] = k === de ? (h - f) / (1 - f) : pop.hiv[k] / (1 - f);
            if (!(pop.hiv[de] > 1e-6)) delete pop.hiv[de]; }
          if (HV.depart && somme() >= 2) {                                                                  // ceux qui partent
            const greg = t.phenotypes.reduce((a, ph) => a + (ph.traits.includes('gregarisme') ? ph.frequence || 0 : 0), 0);
            const soc = clamp((t.plan.sociabilite ?? 0) + .08 * (pop.Q?.sociabilite?.m || 0), 0, 1) * (1 + .6 * greg);   // (celle de collectif.sociabiliteDe)
            const r = routeHiver(t.plan, b, id => biomes[id], soc, pop.routes || 0, REGLES.hivernage, axesA);
            if (r) { const q = Math.min(1, r.part * REGLES.hivernage.actif), f = 1 - Math.pow(1 - q, 1 / HV.depart.long);   // (au bout de la fenêtre, q est parti)
              if (HV.depart.rang === 0) noter('depart', bid, r.vers.id, q * somme());
              emporte(r.vers.id, f, bid); } }
        }
        pop.N = suiv;
      }
      // les combinaisons nées cette fois sans phénotype qui les porte (deux parents de phénotypes différents) : au-delà d'un
      // demi-individu, elles deviennent un phénotype ; leurs petits quittent le plus proche pour le rejoindre
      const connues = E.manque ? new Set(t.phenotypes.map(p => cleDe(p.traits))) : null;
      for (const [cle, M] of Object.entries(E.manque || {})) { if (M.n < .5) continue;
        const traits = cle ? cle.split('+') : []; if (connues.has(cle)) continue; connues.add(cle);
        t.phenotypes.push({ id: cle || 'base', frequence: 0, traits }); E.plans.push(planDe(t.plan, traits, cat)); E.couts.push(coutDe(traits, cat)); E.resist.push(facteur(traits, cat, 'resistance'));
        const j = t.phenotypes.length - 1; for (const p of Object.values(E.pops)) p.N.push(0);
        for (const [bid, fb, n] of M.parts) { const P = E.pops[bid]; if (!P) continue; const m = Math.min(n, P.N[fb]); P.N[fb] -= m; P.N[j] += m; } }
      delete E.manque; delete E.idx; delete E.proche;
      // un nouveau trait, parfois : sur le phénotype le plus nombreux du biome le plus peuplé
      if (t.plan.regime !== 'synthetique' && R() < REGLES.nouveau_trait * PAS) {
        const [bid, pop] = Object.entries(E.pops).sort((a, b) => b[1].N.reduce((x, y) => x + y, 0) - a[1].N.reduce((x, y) => x + y, 0))[0] || [];
        if (pop) {
          const i = pop.N.indexOf(Math.max(...pop.N)), base = t.phenotypes[i].traits;
          const cands = [...Object.keys(CAT.TRAITS), ...Object.keys(MT).filter(id => !CAT.TRAITS[id])].filter(id => CAT.admissible(id, base, cat));   // (docs/20) ceux du monde aussi
          const candM = MILT ? Object.keys(MILT).filter(id => !CAT.TRAITS[id] && !MT[id] && CAT.admissible(id, base, cat)) : [];
          if (cands.length) {
            let id = cands[Math.floor(R() * cands.length)]; if (candM.length && RM() < candM.length / (cands.length + candM.length)) id = candM[Math.floor(RM() * candM.length)];
            const traits = [...base, id].sort(), pid = traits.join('+');
            if (!t.phenotypes.some(p => p.id === pid)) {
              t.phenotypes.push({ id: pid, frequence: 0, traits });
              E.plans.push(planDe(t.plan, traits, cat)); E.couts.push(coutDe(traits, cat));
              for (const p of Object.values(E.pops)) p.N.push(0);
              const q = Math.max(1, .002 * pop.N.reduce((a, x) => a + x, 0)); pop.N[i] -= Math.min(q, pop.N[i]); pop.N[pop.N.length - 1] += q;
              if (SEX && pop.A) { const nv = REGLES.sexe.nouveau; pop.A[id] = Math.max(pop.A[id] || 0, domDe(cat, id) ? nv.dominant : nv.recessif); }   // l'allèle neuf
              ev.push({ type: 'nouveau_trait', taxon: t.id, biome: bid, detail: `${id} apparaît chez « ${t.phenotypes[i].id} »` });
            }
          }
        }
      }
    }
    for (const tid of Object.keys(hivEv)) for (const [sens, L] of Object.entries(hivEv[tid])) {   // (docs/38)
      const tot = L.reduce((a, x) => a + x[2], 0); if (tot < 20) continue; const [chez, autre] = L.slice().sort((a, b) => b[2] - a[2])[0], nom = id => biomes[id]?.nom || id;
      ev.push({ type: 'migration', taxon: tid, biome: chez, detail: sens === 'depart' ? `la migration d'automne commence : ≈ ${Math.round(tot)} bêtes partent hiverner vers ${nom(autre)}` : `la migration de printemps commence : ≈ ${Math.round(tot)} hivernants rentrent de ${nom(autre)}` }); }
    return migrations;
  }
  const API = { vivre };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneDynamique = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
