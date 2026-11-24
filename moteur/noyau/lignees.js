// Orvane — LES LIGNÉES QUI NAISSENT, CELLES QUI S'ÉTEIGNENT (moteur/noyau/lignees.js) — docs/59, le cœur du moteur
// L'étape 6 du cycle, en deux temps :
//  - separer : une population assez isolée du reste de son espèce (peu d'immigrants, peu d'hivernants venus d'ailleurs), et assez
//    différente (par sa niche, loin de celle de la lignée, ou par ses gènes), devient parfois une lignée à part : son plan dérive, et
//    elle emporte sa population avec tout ce qu'elle porte. Au plus REGLES.max_taxons lignées vivantes (celles du cycle : les
//    plantes, quand le moteur a sa flore, vivent à part, docs/17).
//  - ecrire : chaque lignée telle que le monde la publie. Une population de moins de deux bêtes disparaît ; une lignée qui n'en a
//    plus s'éteint ; les autres disent leur effectif, leur tendance, leurs gènes, leur méfiance des joueurs, leurs phénotypes (un
//    phénotype de moins d'une demi-bête rejoint le plan de base ; au-delà de REGLES.max_phenotypes, les plus rares rejoignent le
//    plus proche) et leur statut. Les événements du cycle (ev) racontent les installations, les effondrements, les explosions, les
//    disparitions et les extinctions.
// Ce que le cycle leur donne (X) : le contexte du monde (REGLES, PAS, et les fonctions qui en dépendent : la dérive d'un plan, la
// distance de deux niches, parPas, l'écriture des traits continus, l'apprentissage), son hasard (R, qui continue sa suite), les lignées
// (taxons) et leur état (etat), les lieux, ce que les joueurs ont fait (prT), les mécanismes éveillés, et les modules que le moteur a
// chargés ou non (les dérives DER, les diètes DI, les formes FOR, la ponte PON). Ce qu'elles rendent : separer, rien (les lignées
// neuves rejoignent taxons et etat) ; ecrire, les lignées à publier (sans les plantes, que la flore écrit ensuite).
'use strict';
(function (racine) {
  const { clamp, clone } = typeof require === 'function' ? require('./outils.js') : racine.OrvaneOutils;
  const { ecartsDe, planDe } = typeof require === 'function' ? require('./plan.js') : racine.OrvanePlan;
  const { divergence, replierQ } = typeof require === 'function' ? require('./genetique.js') : racine.OrvaneGenetique;
  function separer(X) {
    const { DT, GEN, PAS, R, REGLES, SR, biomes, cat, deriver, dist, etat, ev, inst, n, parPas, taxons, tousT, DER, DI, FOR, PON } = X;
    const nouveaux = []; let vivantsN = taxons.filter(t => !t.eteint).length, formesVues = null;
    for (const t of taxons) {
      if (t.eteint || vivantsN + nouveaux.length >= REGLES.max_taxons) continue;
      const E = etat.get(t.id), effP = new Map();   // (vitesse : l'effectif de chaque population, compté une fois et non une fois par paire)
      for (const [k, q] of Object.entries(E.pops)) effP.set(k, q.N.reduce((a, x) => a + x, 0));
      for (const [bid, pop] of Object.entries(E.pops)) {
        if (vivantsN + nouveaux.length >= REGLES.max_taxons) break;   // (la limite vaut pour chaque séparation, pas seulement pour chaque lignée)
        const eff = effP.get(bid), b = biomes[bid];
        const s = REGLES.separation, nid = `${t.id}.${bid}`;
        // le flux de gènes reçu (une moyenne glissante de la part d'immigrants) et l'écart au reste de l'espèce
        // (docs/52 : au pas d'un monde au jour, une moyenne sur le même temps, de la part d'immigrants par cycle de référence)
        if (PAS === 1) pop.flux = .85 * (pop.flux0 ?? 0) + .15 * Math.min(1, (pop.immig || 0) / Math.max(1, eff));
        else { const k = parPas(.15); pop.flux = (1 - k) * (pop.flux0 ?? 0) + k * Math.min(1, (pop.immig || 0) / Math.max(1, eff) / PAS); }
        // (docs/52 : une lignée réelle vit dans des centaines de lieux ; au pas d'un monde au jour, le reste de l'espèce se compte une
        //  fois pour toutes, moins le lieu lui-même — les mêmes moyennes, à l'arrondi près — au lieu d'une fois par lieu)
        if (PAS !== 1) { const T = E.tot ??= (() => { const o = { W: 0, A: {}, Q: {} }; for (const [k, q] of Object.entries(E.pops)) { const w = effP.get(k); if (!(w >= 1)) continue; o.W += w;
            for (const id in q.A || {}) o.A[id] = (o.A[id] || 0) + w * q.A[id]; for (const c in q.Q || {}) o.Q[c] = (o.Q[c] || 0) + w * q.Q[c].m; } return o; })();
          const ici = eff >= 1 ? eff : 0, W = T.W - ici;
          if (W >= 1 && (pop.A || pop.Q)) { const Ar = {}, Qr = {};
            for (const id in T.A) Ar[id] = Math.max(0, (T.A[id] - ici * (pop.A?.[id] || 0)) / W); for (const c in T.Q) Qr[c] = { m: (T.Q[c] - ici * (pop.Q?.[c]?.m || 0)) / W };
            pop.div = divergence(pop.A, pop.Q, Ar, Qr); } else pop.div = 0; }
        else { const autres = Object.entries(E.pops).filter(([k]) => k !== bid && effP.get(k) >= 1);
        if (autres.length && (pop.A || pop.Q)) { const W = autres.reduce((a, [k]) => a + effP.get(k), 0), Ar = {}, Qr = {};
          for (const [k2, q] of autres) { const w = effP.get(k2) / W; for (const id in q.A || {}) Ar[id] = (Ar[id] || 0) + w * q.A[id]; for (const k in q.Q || {}) (Qr[k] ??= { m: 0 }).m += w * q.Q[k].m; }
          pop.div = divergence(pop.A, pop.Q, Ar, Qr); } else pop.div = 0; }
        const pret = n - pop.depuis >= s.cycles / PAS && eff >= s.effectif && !taxons.some(x => x.id === nid), isole = clamp(1 - Math.max(pop.flux, Object.values(pop.hiv || {}).reduce((a, x) => a + x, 0)) / s.flux, 0, 1);   // (des hivernants ne font pas une lignée : ils repartent, docs/38)
        const ecolo = pret && t.plan.niche && dist(t.plan.niche, b.axes) >= s.distance * (t.plan.tolerance || .35), geno = pret && pop.div >= s.divergence;
        if ((ecolo || geno) && isole > 0 && R() < s.chance * PAS * isole * ((ecolo ? 1 : 0) + (geno ? Math.min(4, pop.div / s.divergence) : 0))) {
          const plan = deriver(t.plan, b, R), mode = SR ? PON.separer(t.plan, plan, b, nid, n) : null;   // (docs/25)
          const glisse = DT ? DI.deriver(t.plan, plan, nid, n) : null;   // (docs/30) le spectre glisse
          const neuve = FOR && inst.monde?.formes ? FOR.noter(t.plan, plan, formesVues ??= new Set(tousT.map(x => x.plan?.corps?.forme))) : null;   // (docs/33) une forme nouvelle
          if (!DT && DER && inst.monde?.derives) DER.regime(t.plan, plan, nid, n);   // (docs/29) le régime dérive, un pas à la fois
          if (GEN && pop.Q) replierQ(plan, pop.Q);   // ce que la population a acquis devient le plan de la lignée
          nouveaux.push({ id: nid, nom: `${(t.nom || t.id).replace(/\s*\(.*\)$/, '')} (${b.nom || bid})`, parent: t.id, apparu: n, eteint: null, statut: 'croissance', plan,
            _E: { plans: t.phenotypes.map(p => planDe(plan, p.traits, cat)), couts: E.couts.slice(), resist: E.resist.slice(), pops: { [bid]: { ...pop, N: pop.N.slice(), depuis: n, flux: 0 } } },   // (la même population, avec tout ce qu'elle porte : ses souches, sa nourriture, sa mémoire)
            phenotypes: clone(t.phenotypes) });
          ev.push({ type: 'separation', taxon: nid, biome: bid, detail: `lignée issue de ${t.id}, ${plan.masse_kg < t.plan.masse_kg ? 'plus petite' : 'plus grande'}${plan.regime !== t.plan.regime ? ', devenue ' + plan.regime : ''}${mode ? ', ' + mode : ''}${glisse ? ', ' + glisse : ''}${neuve ? ', ' + neuve : ''}${geno && !ecolo ? `, née de l'isolement (écart génétique ${pop.div.toFixed(2)})` : ''}` });
          delete E.pops[bid];
        }
      }
    }
    for (const nt of nouveaux) { etat.set(nt.id, nt._E); delete nt._E; taxons.push(nt); }
  }
  function ecrire(X) {
    const { GEN, ME, PAS, REGLES, SEX, SF, SP, SY, apprendre, biomes, cat, ecrireQ, etat, ev, n, opt, prT, taxons } = X;
    const sortie = [];
    for (const t of taxons) {
      if (t.eteint) { if (n - t.eteint <= REGLES.memoire_eteint) sortie.push(t); continue; }
      const E = etat.get(t.id), K = t.phenotypes.length, totP = new Array(K).fill(0);
      t.populations = [];
      for (const [bid, pop] of Object.entries(E.pops)) {
        let eff = pop.N.reduce((a, x) => a + x, 0);
        if (eff < 2) { if (pop.avant >= 20 && !pop.saisonnier) ev.push({ type: 'extinction', taxon: t.id, biome: bid, detail: 'la population disparaît' }); continue; }   // (un groupe de migrants qui n'a pas pris ne fait pas un événement)
        const tend = pop.avant > 0 ? (eff - pop.avant) / pop.avant : 1;
        if (pop.avant < 2 && !pop.saisonnier && (PAS === 1 || eff >= 20)) ev.push({ type: 'migration', taxon: t.id, biome: bid, detail: 'une population s\'installe' });   // (docs/52 : au jour, le petit groupe qui fonde ne fait pas un événement)   // (les arrivées trop maigres pour durer ne comptent pas)
        // (docs/52 : au pas d'un monde au jour, un cycle ne fait ni effondrement ni explosion : ils se lisent sur des mois, pas encore ici)
        if (PAS === 1 && pop.avant >= 20 && !pop.saisonnier && tend <= REGLES.effondrement) ev.push({ type: 'effondrement', taxon: t.id, biome: bid, detail: `${Math.round(tend * 100)} % sur le cycle` });
        if (PAS === 1 && pop.avant >= 20 && !pop.saisonnier && tend >= REGLES.explosion) ev.push({ type: 'explosion', taxon: t.id, biome: bid, detail: `+${Math.round(tend * 100)} % sur le cycle` });
        const morts = (pop.mortsNat || 0) + (pop.mortsExt || 0) + (pop.mortsPred || 0) + (pop.mortsMal || 0);
        const p = { biome: bid, effectif: PAS === 1 ? Math.round(eff) : +eff.toFixed(4), tendance: +tend.toFixed(PAS === 1 ? 3 : 6), depuis: pop.depuis };   // (docs/52 : l'effectif exact, au pas d'un monde au jour)
        if (pop.maladie) p.maladie = { reste: pop.maladie.reste, virulence: pop.maladie.virulence, part: +clamp((pop.mortsMal || 0) / Math.max(1e-9, morts), 0, 1).toFixed(3) };
        if (pop.mortsExt > 0) p.pression = +clamp(pop.mortsExt / morts, 0, 1).toFixed(3);
        if (pop.mortsPred > 0) p.predation = +clamp(pop.mortsPred / morts, 0, 1).toFixed(3);
        if (pop.satiete != null) p.satiete = +pop.satiete.toFixed(3);
        if (GEN && pop.Q) p.quant = ecrireQ(pop.Q);
        if (SEX && pop.A) { const a = {}, d = PAS === 1 ? 5 : 9; for (const id of Object.keys(pop.A).sort()) if (pop.A[id] >= 1e-5) a[id] = +pop.A[id].toFixed(d); if (Object.keys(a).length) p.alleles = a; }
        if (pop.flux != null) p.flux = +clamp(pop.flux, 0, 1).toFixed(PAS === 1 ? 4 : 8);
        if (pop.hiv) { const h = {}; for (const k of Object.keys(pop.hiv).sort()) if (pop.hiv[k] >= 1e-4) h[k] = +Math.min(1, pop.hiv[k]).toFixed(4); if (Object.keys(h).length) p.hivernants = h; }   // (docs/38)
        if (REGLES.mefiance.actif && opt.mefiance !== false) {                 // ce que la population a appris des joueurs (docs/12)
          // (docs/50, dans un monde à la mémoire éveillée : une bête blessée qui survit apprend aussi, et chaque lignée à son caractère)
          const za = GEN ? pop.Q?.audace?.m || 0 : 0, [m, h] = ME ? ME.mefiance(t.plan, pop.mef0 || 0, pop.hab0 || 0, prT[t.id]?.[bid]?.contact, prT[t.id]?.[bid]?.vecu, za, pop.Mp?.g || 0) : apprendre(pop.mef0 || 0, pop.hab0 || 0, prT[t.id]?.[bid]?.contact, za);
          if (m >= 1e-3) p.mefiance = +m.toFixed(3); if (h >= 1e-3) p.habituation = +h.toFixed(3);
          if (m >= REGLES.mefiance.alerte && (pop.mef0 || 0) < REGLES.mefiance.alerte) ev.push({ type: 'mefiance', taxon: t.id, biome: bid, detail: (SY && SY.texteMefiance(t, m)) || `les bêtes se méfient des joueurs (${Math.round(m * 100)} %)` }); }
        if (ME) ME.publier(t, bid, pop, p, prT[t.id]?.[bid]?.vecu, GEN ? pop.Q?.audace?.m || 0 : 0, ev, biomes[bid]?.nom);   // (docs/50) ce qu'elle a appris des joueurs : l'attrait, la traque, la néophobie, et le mot qui la résume
        if (SY) SY.publier(t, bid, pop, p, morts);
        if (SF) SF.publier(t, bid, p, pop);
        if (SP) SP.publier(t, bid, pop, p);
        if (pop.div) p.divergence = +pop.div.toFixed(4);
        if (pop.hyb && pop.hyb.part >= 1e-4) { p.hybride = { avec: pop.hyb.avec, part: +pop.hyb.part.toFixed(4), isolement: +pop.hyb.isolement.toFixed(3) };
          if (pop.hyb.part >= REGLES.hybride.zone && (pop.hyb0 ?? 0) < REGLES.hybride.zone / 2) ev.push({ type: 'hybridation', taxon: t.id, biome: bid, detail: `zone hybride avec ${pop.hyb.avec} : ${(pop.hyb.part * 100).toFixed(1)} % des naissances` }); }
        t.populations.push(p); pop.N.forEach((x, i) => { totP[i] += x; });
      }
      const total = totP.reduce((a, x) => a + x, 0);
      if (!t.populations.length) { t.eteint = n; t.statut = 'eteint'; t.phenotypes.forEach(p => { p.frequence = 0; delete p.frequence_par_biome; }); ev.push({ type: 'extinction', taxon: t.id, detail: 'le taxon s\'éteint' }); sortie.push(t); continue; }
      // les phénotypes : fréquences globales et par biome ; on oublie ceux qui ont disparu (jamais le premier, le plan de base)
      // un phénotype qui n'a plus un demi-individu disparaît de la liste ; ses bêtes rejoignent le plan de base (elles ne
      // disparaissent pas avec lui ; leurs allèles, eux, restent dans la population)
      for (let i = 1; i < K; i++) if (totP[i] < .5 && totP[i] > 0) { for (const pop of Object.values(E.pops)) { pop.N[0] += pop.N[i] || 0; pop.N[i] = 0; } totP[0] += totP[i]; totP[i] = 0; }
      // trop de variantes : les plus rares rejoignent la variante gardée la plus proche (le moins de traits en plus ou en moins), sur les
      // comptes exacts, avant tout arrondi — ni bête perdue, ni bête renvoyée au plan de base sans raison
      { const vifs = []; for (let i = 0; i < K; i++) if (i === 0 || totP[i] >= .5) vifs.push(i);
        if (vifs.length > REGLES.max_phenotypes) {
          const tri = vifs.slice(1).sort((x, y) => totP[y] - totP[x] || x - y), gardes = [0, ...tri.slice(0, REGLES.max_phenotypes - 1)];
          const TS = t.phenotypes.map(p => new Set(p.traits));   // (vitesse : les traits de chaque phénotype, mis en ensemble une fois)
          const ecart = (a, b) => { const A = TS[a], B = TS[b]; let d = 0; for (const x of A) if (!B.has(x)) d++; for (const x of B) if (!A.has(x)) d++; return d; };
          for (const i of tri.slice(REGLES.max_phenotypes - 1)) { let j = 0, dj = Infinity; for (const g of gardes) { const d = ecart(i, g); if (d < dj) { dj = d; j = g; } }
            for (const pop of Object.values(E.pops)) { pop.N[j] += pop.N[i] || 0; pop.N[i] = 0; } totP[j] += totP[i]; totP[i] = 0; } } }
      const garde = [];
      t.phenotypes.forEach((p, i) => {
        if (i > 0 && totP[i] < .5) return;
        const f = total ? totP[i] / total : 0;
        const dF = PAS === 1 ? 4 : 8, q = { id: p.id, frequence: +f.toFixed(dF), traits: p.traits, cout_total: +E.couts[i].toFixed(3) };
        if (t.populations.length > 1) { q.frequence_par_biome = {}; for (const pop of t.populations) { const N = E.pops[pop.biome].N, s = N.reduce((a, x) => a + x, 0); q.frequence_par_biome[pop.biome] = +(s ? N[i] / s : 0).toFixed(dF); } }
        const ec = ecartsDe(p.traits, cat); if (Object.keys(ec).length) q.ecarts = ec;
        q.selection = +(f - (p.frequence || 0)).toFixed(4);
        garde.push(q);
      });
      t.phenotypes = garde;
      const avant = Object.values(E.pops).reduce((a, p) => a + p.avant, 0), tend = avant > 0 ? (total - avant) / avant : 1;
      t.statut = total < REGLES.menace ? 'menace' : tend > .05 * PAS ? 'croissance' : tend < -.05 * PAS ? 'declin' : 'stable';
      // (docs/50) le caractère de la lignée : ce qu'elle est avant d'avoir rien appris des joueurs, lu sur son corps et son tempérament
      if (ME) { const car = ME.caractere(t); if (car) t.caractere = car; else delete t.caractere; }
      sortie.push(t);
    }
    return sortie;
  }
  const API = { separer, ecrire };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvaneLignees = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
