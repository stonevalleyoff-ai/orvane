// Orvane — LA VIE SYNTHÉTIQUE (moteur/synthetique.js) — docs/16
// Une seconde vie, faite de machines. Elles ne mangent pas : elles captent la lumière et la chaleur de leur parcelle, tirent
// leur matière du minerai et de la ferraille, et sont assemblées au lieu de naître. Toutes descendent de la Mère, qui
// s'éveille dans une parcelle (le volcan, par défaut), ne meurt pas, assemble des machines et en conçoit de nouvelles d'après
// ce qui tue les siennes : l'usure, le manque d'énergie, les catastrophes, les joueurs. Loin d'elle, les machines évoluent
// aussi à l'aveugle (une erreur de copie) et s'échangent les modules qui leur réussissent (un transfert).
// Leur rôle : réguler. Une machine à pince prélève l'espèce qui déborde ce que son milieu peut porter, d'autant plus qu'elle
// y domine sa bande de taille ; sous ce seuil, ou rare, une espèce est épargnée. Leur nombre suit le soleil et le minerai,
// pas leurs proies : elles ne s'effondrent pas avec elles.
// Le moteur (moteur/orvane.js) appelle ce fichier à quelques points de son cycle ; un monde sans Mère ni machine n'en voit
// rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneSynthetique).
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clone = o => JSON.parse(JSON.stringify(o));
const somme = a => a.reduce((s, x) => s + x, 0);
const typeDe = b => b.type || b.id;
const estSyn = t => t?.plan?.regime === 'synthetique';
const mod = (p, k) => +(p?.modules?.[k] || 0);

const REGLES = {
  surface: 60000,            // ce qu'un biome offre à capter, en tout (ses parcelles se le partagent selon leur place)
  minerai: 200000,           // le minerai d'un biome de richesse 1 (kg)
  jour: .4,                  // la durée du jour : la lumière d'été vaut 1,4 fois la moyenne, celle d'hiver 0,6
  rendement: { lumiere: 1, chaleur: .8 },
  cout: .15, chaleur_masse: .004, cerveau: .15,   // le coût de fonctionnement : cout × masse^0,75 × (1,3 + les outils…) + chaleur_masse × masse + cerveau
  fabrication: .3,           // l'énergie d'une machine neuve, par kg
  extraction: 1.7, recyclage: 1.2,   // la matière qu'une foreuse, un recycleur tire par cycle (× module × masse^0,75)
  prise: .1, prise_ferraille: .2,    // la part d'un stock qu'un cycle peut entamer
  croissance_max: .25,       // une population ne s'assemble pas plus vite (machines neuves par machine et par cycle)
  deficit: 2,                // sans énergie, l'usure s'accélère (la batterie amortit)
  renouveau: .01, rouille: .03, ferraille: .7,   // le minerai revient, la ferraille rouille ; une machine morte en laisse 70 %
  exploration: .02,          // la part d'une population qui part chaque cycle vers les parcelles voisines, quelles qu'elles soient
  defense: { blindage: .5, arme: .3, discretion: .3, max: .8 },   // ce qui ne tient pas des destructions que rapporte un jeu : la machine blindée se répare, l'armée tient
                             // les joueurs à distance, la discrète leur échappe (au plus 80 %)
  regulation: { max: .2, presence: 5000, sat: .5, dom: .3, rare: 200, sigma: 1.5, proie: 3 },   // (proie : un régulateur vise des bêtes trois fois plus légères que lui)
  transfert: .1, erreur: .0003, max_lignees: 12, place_mere: 3,   // (les erreurs de copie laissent toujours à la Mère la place de trois plans)
  mere: { intervalle: 12, production: 30, memoire: .15, cout: 20, effectif: 30 }
};
const MODULES = ['panneau', 'thermique', 'batterie', 'foreuse', 'recycleur', 'pince', 'blindage', 'arme', 'discretion'], DEFENSE = ['blindage', 'arme', 'discretion'];
const GEO = { volcan: .9, abysses: .5, grotte: .25 };            // la chaleur de la terre
const RICHE = { volcan: 3, grotte: 2.5, sommets: 2, montagne: 2, abysses: 1.2 };
const SYL = ['ka', 'vor', 'ix', 'zan', 'tor', 'rex', 'ul', 'dra', 'sek', 'vin', 'oth', 'kel', 'mar', 'tek', 'yr', 'ax', 'pol', 'gen'];
const RAISON = { joueurs: 'contre les joueurs', energie: "pour l'énergie qui manque", catastrophe: 'contre les catastrophes', regulation: 'pour les espèces qui débordent', usure: "contre l'usure", exploration: 'un essai' };

// --- les plans fondateurs : ce que la Mère assemble à son éveil ---
const FONDATEURS = [
  { id: 'vigie', nom: 'Vigie', plan: { masse_kg: 40, taille_m: 1.1, longevite: 25, vitesse_rel: 4, perception: .6, sociabilite: .4, temperament: .5,
    modules: { panneau: .6, thermique: .1, batterie: .3, foreuse: .3, recycleur: .2, pince: .6, blindage: .1, arme: 0, discretion: 0 } } },
  { id: 'ferrailleur', nom: 'Ferrailleur', plan: { masse_kg: 10, taille_m: .6, longevite: 20, vitesse_rel: 5, perception: .5, sociabilite: .6, temperament: .3,
    modules: { panneau: .5, thermique: 0, batterie: .2, foreuse: .1, recycleur: .7, pince: 0, blindage: 0, arme: 0, discretion: .1 } } }
];
function planMachine(p) {
  const q = { regime: 'synthetique', locomotion: ['marche'], activite: 'continue', maturite: 1, portee: 1, ...clone(p) };
  for (const k of MODULES) q.modules[k] = +clamp(q.modules[k] || 0, 0, 1).toFixed(3);
  q.role = roleDe(q); return q;
}
function roleDe(p) {
  const r = [['regulateur', mod(p, 'pince')], ['foreuse', mod(p, 'foreuse') * .6], ['recycleur', mod(p, 'recycleur') * .8]].sort((a, b) => b[1] - a[1])[0];
  return r[1] >= .15 ? r[0] : 'capteur';
}

// --- les ressources d'une parcelle (ou d'un biome) ---
function ressourcesDe(b, tous) {
  const ty = typeDe(b), L = tous.filter(x => typeDe(x) === ty), W = somme(L.map(x => x.capacite_base ?? x.capacite ?? 1)) || 1, f = (b.capacite_base ?? b.capacite ?? 1) / W;
  const ax = b.axes || {}, riche = RICHE[ty] ?? (.3 + 1.2 * (ax.altitude ?? .3) * (1 - .5 * (ax.couvert ?? 0))), mx = Math.round(REGLES.minerai * riche * f);
  return { surface: Math.round(REGLES.surface * f), geothermie: GEO[ty] ?? 0, minerai: mx, minerai_max: mx, ferraille: 0 };
}
// la lumière (le biome en cette saison, moins ce que le couvert en cache, et la durée du jour) et la chaleur (la terre, l'air)
function milieuDe(b, ax, phase) {
  const jour = phase == null ? 1 : 1 + REGLES.jour * -Math.cos(2 * Math.PI * phase);
  return { L: clamp(ax.lumiere ?? .5, 0, 1) * (1 - .6 * clamp(ax.couvert ?? 0, 0, 1)) * jour, H: (b.ressources?.geothermie || 0) + .3 * clamp(ax.temperature ?? .5, 0, 1) };
}
// --- la physique d'un plan ---
const capteurs = p => { const A = Math.pow(p.masse_kg || 1, 2 / 3); return { cL: mod(p, 'panneau') * A * REGLES.rendement.lumiere, cH: mod(p, 'thermique') * A * REGLES.rendement.chaleur }; };
const coutDe = p => { const m = p.masse_kg || 1, outils = mod(p, 'pince') + mod(p, 'arme') + mod(p, 'foreuse') + mod(p, 'recycleur');
  return REGLES.cout * Math.pow(m, .75) * (1.3 + .25 * outils + .4 * mod(p, 'blindage') + .2 * mod(p, 'discretion')) + REGLES.chaleur_masse * m + REGLES.cerveau; };   // (un cerveau coûte, quelle que soit la taille : la chaleur borne les grandes, lui les petites)
const extraction = p => mod(p, 'foreuse') * Math.pow(p.masse_kg || 1, .75) * REGLES.extraction;
const recyclage = p => mod(p, 'recycleur') * Math.pow(p.masse_kg || 1, .75) * REGLES.recyclage;
function bilan(p, M) {
  const c = capteurs(p), capte = c.cL * M.L * (M.sL ?? 1) + c.cH * M.H * (M.sH ?? 1), cout = coutDe(p);
  return { capte, cout, rho: cout > 0 ? capte / cout : 0 };
}
const nomMachine = (R, k) => { const a = SYL[Math.floor(R() * SYL.length)], b = SYL[Math.floor(R() * SYL.length)]; return (a + b).replace(/^./, c => c.toUpperCase()) + '-' + k; };
function rngSyn(graine, n) { let g = (((graine >>> 0) ^ 0x6d2b79f5) ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; }

// --- l'éveil de la Mère (une fois ; le cycle de nuit l'applique quand le profil le demande : monde.synthetique) ---
function eveiller(inst, cfg = {}) {
  const out = clone(inst); if (out.monde?.mere) return { inst: out, evenements: [] };
  const n = out.cycle?.n ?? 0, tous = out.biomes;
  for (const b of tous) b.ressources ??= ressourcesDe(b, tous);
  const voulu = cfg.biome || 'volcan', terre = b => b.milieu !== 'aquatique' && b.milieu !== 'marin';
  const lieu = tous.filter(b => (typeDe(b) === voulu || b.id === voulu) && terre(b)).sort((a, b) => (b.ressources.minerai_max - a.ressources.minerai_max) || (a.id < b.id ? -1 : 1))[0]
    || tous.filter(terre).sort((a, b) => (b.axes?.altitude ?? 0) - (a.axes?.altitude ?? 0) || (a.id < b.id ? -1 : 1))[0];
  const ids = new Set(out.taxons.map(t => t.id)), courant = [], ev = [];
  for (const f of FONDATEURS) {
    let id = f.id, k = 2; while (ids.has(id)) id = `${f.id}-${k++}`; ids.add(id);
    out.taxons.push({ id, nom: f.nom, parent: null, apparu: n, eteint: null, statut: 'croissance', plan: planMachine(f.plan),
      populations: [{ biome: lieu.id, effectif: cfg.effectif ?? REGLES.mere.effectif, tendance: 0, depuis: n }], phenotypes: [{ id: 'base', frequence: 1, traits: [] }] });
    courant.push(id);
  }
  out.monde = { ...out.monde, mere: { nom: cfg.nom || 'La Mère', biome: lieu.id, depuis: n, conceptions: 0, courant, prochaine: n + REGLES.mere.intervalle, memoire: {} } };
  ev.push({ type: 'eveil', taxon: courant[0], biome: lieu.id, detail: `${out.monde.mere.nom} s'éveille (${lieu.nom || lieu.id}) : elle assemble ${courant.map(id => out.taxons.find(t => t.id === id).nom).join(' et ')}` });
  return { inst: out, evenements: ev };
}

// --- un cycle : ce que le moteur appelle ---
// preparer, au début du cycle (l'état de chaque population posé) : null s'il n'y a ni Mère ni machine (le monde n'en voit rien)
function preparer(ctx) {
  const { inst, n, biomes, taxons, etat, phase, axesSaison } = ctx;
  const syn = taxons.filter(t => !t.eteint && estSyn(t)), mere = inst.monde?.mere ? clone(inst.monde.mere) : null;
  if (!syn.length && !mere) return null;
  const tous = Object.values(biomes), M = {}, Rs = rngSyn(inst.monde.graine, n);
  for (const b of tous) { b.ressources ??= ressourcesDe(b, tous); M[b.id] = { ...milieuDe(b, axesSaison(b, phase), phase), DL: 0, DH: 0, DX: 0, DF: 0, P: 0, Pm: 0, debord: 0, debordW: 0, debordLm: 0, mortsKg: 0 }; }
  for (const t of syn) { const p = etat.get(t.id).plans[0], c = capteurs(p);
    for (const [bid, pop] of Object.entries(etat.get(t.id).pops)) { const m = M[bid]; if (!m) continue; const N = somme(pop.N);
      m.DL += N * c.cL * m.L; m.DH += N * c.cH * m.H; m.DX += N * extraction(p); m.DF += N * recyclage(p); } }
  for (const b of tous) { const m = M[b.id], r = b.ressources, FL = r.surface * m.L, FH = r.surface * m.H;
    m.sL = FL > 0 ? FL / (FL + m.DL) : 0; m.sH = FH > 0 ? FH / (FH + m.DH) : 0;
    m.sX = m.DX > 0 ? Math.min(1, r.minerai * REGLES.prise / m.DX) : 1; m.sF = m.DF > 0 ? Math.min(1, r.ferraille * REGLES.prise_ferraille / m.DF) : 1;
    m.sat = FL + FH > 0 ? (m.DL + m.DH) / (FL + FH) : 9; }
  // le bilan de chaque population, et la force des régulateurs de chaque lieu
  for (const t of syn) { const p = etat.get(t.id).plans[0];
    for (const [bid, pop] of Object.entries(etat.get(t.id).pops)) { const m = M[bid]; if (!m) continue;
      pop.syn = bilan(p, m); const N = somme(pop.N), f = N * mod(p, 'pince') * Math.pow(p.masse_kg || 1, .75) * Math.min(1, pop.syn.rho);
      m.P += f; m.Pm += f * Math.log10(p.masse_kg || 1); } }
  const S = { M, mere, Rs, nouveaux: [], ctx };

  // (étape 3 du moteur) les régulateurs : « tuer le gagnant »
  S.reguler = (bid, T, Bb, Keff) => {
    const m = M[bid]; if (!m) return; const RG = REGLES.regulation, pi = 1 - Math.exp(-m.P / RG.presence), mm = m.P > 0 ? Math.pow(10, m.Pm / m.P) : 1;   // (la masse moyenne, géométrique, des régulateurs du lieu)
    for (const q of T) { if (q.regime === 'carnivore' || q.Nt < RG.rare) continue;
      const mq = q.t.plan.masse_kg || 1, ch = ctx.charge(Bb, mq); if (!(ch > 0)) continue;
      const sat = Keff > 0 ? ch / (Keff * ctx.BANDE) : 9, dom = clamp(q.Nt * mq * (ctx.PART_K[q.regime] ?? 1) / ch, 0, 1);
      const lg = Math.log10(mq * RG.proie / mm), fit = Math.exp(-lg * lg / (2 * RG.sigma * RG.sigma));
      const d = Math.max(0, sat - .85) * dom * (1 - pi * fit);                                    // ce qui déborde sans régulateur à sa taille (la Mère le saura)
      if (d > 0) { m.debord = Math.max(m.debord, d); m.debordW += d; m.debordLm += d * Math.log10(mq); }
      if (pi <= 0) continue;
      const taux = RG.max * pi * clamp((sat - RG.sat) / (1 - RG.sat), 0, 2) * clamp((dom - RG.dom) / (1 - RG.dom), 0, 1) * fit;   // (d'autant plus que le lieu est plein et qu'elle y domine sa bande)
      if (!(taux > 1e-5)) continue;
      q.pop.N.forEach((N, i) => { q.pop.predation[i] += N * taux; }); q.pop.regule = (q.pop.regule || 0) + q.Nt * taux; }
  };
  S.sat = bid => M[bid]?.sat ?? 9;
  S.reparation = t => { const D = REGLES.defense; return 1 - Math.min(D.max, D.blindage * mod(t.plan, 'blindage') + D.arme * mod(t.plan, 'arme') + D.discretion * mod(t.plan, 'discretion')); };
  // (étape 4) la vie d'une population de machines : l'usure, le manque d'énergie, les crues ; l'assemblage
  S.vie = (t, bid, pop, plan, Np, sinistre, conv) => {
    const m = M[bid], b = biomes[bid], s = pop.syn || bilan(plan, m), us = 1 / Math.max(2, plan.longevite || 20), masse = plan.masse_kg || 1;
    const en = s.rho < 1 ? us * REGLES.deficit * (1 - s.rho) * (1 - .7 * mod(plan, 'batterie')) : 0, hors = conv < .3 ? .08 : 0;
    const ca = sinistre === 'crue' ? (ctx.REGLES.catastrophes.crue?.mortalite || 0) * .5 : 0;                  // le feu, la sécheresse ne font rien au métal
    const nE = Np * Math.max(0, s.capte - s.cout) / (REGLES.fabrication * masse);
    const x = Np * extraction(plan) * m.sX, y = Np * recyclage(plan) * m.sF, nais = Math.max(0, Math.min(nE, (x + y) / masse, Np * REGLES.croissance_max));
    if (nais > 0 && x + y > 0) { const f = nais * masse / (x + y); b.ressources.minerai = Math.max(0, b.ressources.minerai - x * f); b.ressources.ferraille = Math.max(0, b.ressources.ferraille - y * f); }
    pop.causes = { usure: Np * (us + hors), energie: Np * en, catastrophe: Np * ca };
    pop.nbSyn = nais;
    return { nais, morts: Np * (us + en + hors + ca) };
  };
  S.exploration = REGLES.exploration;

  // (après les arrivées) la ferraille, le minerai, la mémoire et l'ouvrage de la Mère, les erreurs de copie, les transferts
  S.apres = () => {
    const { ev } = ctx, vivants = taxons.filter(t => !t.eteint && estSyn(t));
    for (const t of vivants) { const p = etat.get(t.id).plans[0];
      for (const [bid, pop] of Object.entries(etat.get(t.id).pops)) if (M[bid]) M[bid].mortsKg += ((pop.mortsNat || 0) + (pop.mortsExt || 0)) * (p.masse_kg || 1); }
    for (const b of tous) { const r = b.ressources;
      r.ferraille = +(r.ferraille * (1 - REGLES.rouille) + M[b.id].mortsKg * REGLES.ferraille).toFixed(1);
      r.minerai = +(r.minerai + (r.minerai_max - r.minerai) * REGLES.renouveau).toFixed(1);
      r.lumiere = +M[b.id].L.toFixed(3); r.chaleur = +M[b.id].H.toFixed(3); }
    if (mere && biomes[mere.biome]) memoire(vivants);
    transferer(vivants);
    erreurs(vivants);
    if (mere && biomes[mere.biome]) { concevoir(vivants); assembler(); }
  };
  // la mémoire de la Mère : par cause, les morts par machine et par cycle, pesées par la distance (ce qui arrive loin d'elle lui
  // parvient moins) ; et ce qui déborde sans régulateur
  function memoire(vivants) {
    const d = { [mere.biome]: 0 }, file = [mere.biome];
    while (file.length) { const x = file.shift(); for (const v of biomes[x].voisins || []) if (biomes[v] && d[v] == null) { d[v] = d[x] + 1; file.push(v); } }
    const w = bid => d[bid] == null ? 0 : 1 / (1 + d[bid] / 3);
    let W = 0; const c = { usure: 0, energie: 0, catastrophe: 0, joueurs: 0 };
    for (const t of vivants) for (const [bid, pop] of Object.entries(etat.get(t.id).pops)) { const k = w(bid); if (!k) continue;
      W += k * (pop.avant || 0); const C = pop.causes || {}; c.usure += k * (C.usure || 0); c.energie += k * (C.energie || 0); c.catastrophe += k * (C.catastrophe || 0); c.joueurs += k * (pop.mortsExt || 0); }
    let Wd = 0, deb = 0, dw = 0, lm = 0; for (const b of tous) { const k = w(b.id); Wd += k; deb += k * M[b.id].debord; dw += k * M[b.id].debordW; lm += k * M[b.id].debordLm; }
    const a = REGLES.mere.memoire, mem = mere.memoire = { ...(mere.memoire || {}) };
    for (const k of Object.keys(c)) mem[k] = +((1 - a) * (mem[k] || 0) + a * (W > 0 ? c[k] / W : 0)).toFixed(5);
    mem.debord = +((1 - a) * (mem.debord || 0) + a * (Wd > 0 ? deb / Wd : 0)).toFixed(5);
    if (dw > 0) mem.masse_debord = +Math.pow(10, mem.masse_debord ? (1 - a) * Math.log10(mem.masse_debord) + a * lm / dw : lm / dw).toPrecision(3);   // la taille de ce qui déborde
  }
  // le transfert : deux populations de machines d'une même parcelle se copient un module, si celle qui l'a s'y tient mieux (ce
  // cycle, ses gains moins ses pertes, joueurs compris) et si celle qui le prend peut encore se le payer (la technique plafonne
  // sur la physique : sous l'équilibre de son bilan, elle ne prend rien)
  const vigueur = p => ((p.nbSyn || 0) - (p.mortsNat || 0) - (p.mortsExt || 0)) / Math.max(1, p.avant || 0);
  function transferer(vivants) {
    for (const b of tous) {
      const L = vivants.map(t => [t, etat.get(t.id).pops[b.id]]).filter(([, p]) => p && (p.avant || 0) >= 10 && p.syn);
      if (L.length < 2) continue;
      for (const [A, pa] of L) for (const [B, pb] of L) { if (A === B) continue;
        // sous la menace (les joueurs en détruisent plus d'une sur cent par cycle), on prend la défense de qui l'a, sans attendre
        const menace = (pb.mortsExt || 0) / Math.max(1, pb.avant), mieux = vigueur(pa) > vigueur(pb) + .01; if (!mieux && menace < .01) continue;
        const contact = 2 * Math.min(pa.avant, pb.avant) / (pa.avant + pb.avant);
        for (const k of mieux ? MODULES : DEFENSE) { const a = mod(A.plan, k), v = mod(B.plan, k); if (a - v <= .05) continue;
          const essai = { ...B.plan, modules: { ...B.plan.modules, [k]: v + .05 } };
          if (bilan(essai, M[b.id]).rho < Math.min(1, pb.syn.rho)) continue;
          const vite = DEFENSE.includes(k) && menace >= .01 ? Math.max(contact, Math.min(1, 5 * contact) * Math.min(1, menace / .02)) : contact;
          const nv = +Math.min(a, v + REGLES.transfert * vite * (a - v)).toFixed(4); B.plan.modules[k] = nv; B.plan.role = roleDe(B.plan);
          if (v < .05 && nv >= .05) ev().push({ type: 'transfert', taxon: B.id, biome: b.id, detail: `${B.nom} adopte ${k === 'arme' ? "l'arme" : k === 'pince' ? 'la pince' : 'le module ' + k} de ${A.nom}` }); } }
    }
  }
  // l'erreur de copie : une machine assemblée loin de la Mère sort parfois d'un plan un peu changé ; qui s'en trouve bien fait lignée
  function erreurs(vivants) {
    for (const t of vivants) for (const [bid, pop] of Object.entries(etat.get(t.id).pops)) {
      const nb = pop.nbSyn || 0;
      if (nb < 10 || (mere && bid === mere.biome) || Rs() >= Math.min(.5, REGLES.erreur * nb) || nbVivants() >= REGLES.max_lignees - REGLES.place_mere) continue;   // (loin de la Mère : chez elle, on copie juste)
      const plan = clone(t.plan), k = MODULES[Math.floor(Rs() * MODULES.length)], dv = (Rs() < .5 ? -1 : 1) * (.05 + .1 * Rs());
      plan.modules[k] = +clamp(mod(plan, k) + dv, 0, 1).toFixed(3); plan.masse_kg = +clamp(plan.masse_kg * (.85 + .35 * Rs()), .5, 5000).toPrecision(3); plan.taille_m = +(t.plan.taille_m * Math.cbrt(plan.masse_kg / t.plan.masse_kg)).toFixed(2);
      plan.role = roleDe(plan);
      const nt = naitre(t, plan, bid, Math.max(5, somme(pop.N) * .1), pop);
      ev().push({ type: 'separation', taxon: nt.id, biome: bid, detail: `lignée issue de ${t.id}, une erreur de copie : ${k} ${dv > 0 ? '+' : '−'}${Math.abs(dv).toFixed(2)}, ${plan.masse_kg < t.plan.masse_kg ? 'plus petite' : 'plus grande'}` });
    }
  }
  // la conception : tous les quelques cycles, la Mère tire un plan neuf du plus nombreux, contre ce qui tue le plus ses machines
  function concevoir(vivants) {
    if (n < (mere.prochaine ?? 0)) return;
    const r = biomes[mere.biome].ressources;
    const mem = mere.memoire || {}, U = { joueurs: 3 * (mem.joueurs || 0), energie: 2 * (mem.energie || 0), catastrophe: 2 * (mem.catastrophe || 0), regulation: mem.debord || 0, usure: .2 * (mem.usure || 0) };   // (l'usure est le lot de toute machine : elle ne presse guère)
    let cause = Object.keys(U).sort((a, b) => U[b] - U[a] || (a < b ? -1 : 1))[0]; if (U[cause] < .01) cause = 'exploration';
    // le plan de départ : celle qui souffre de la cause (les plus détruites par les joueurs, les plus à court d'énergie), le
    // régulateur le plus proche de la taille voulue, ou la plus lourde en tout
    const cibleR = clamp((mem.masse_debord || 13) * REGLES.regulation.proie, .5, 2000);
    const score = { joueurs: t => pertes(t, p => p.mortsExt || 0), energie: t => pertes(t, p => p.causes?.energie || 0), catastrophe: t => pertes(t, p => p.causes?.catastrophe || 0),
      regulation: t => mod(t.plan, 'pince') > .1 ? -Math.abs(Math.log10(t.plan.masse_kg / cibleR)) : -99 }[cause] || (t => masseTotale(t));
    const base = vivants.slice().sort((a, b) => score(b) - score(a) || masseTotale(b) - masseTotale(a) || (a.id < b.id ? -1 : 1))[0];
    if (!base || r.minerai < REGLES.mere.cout * base.plan.masse_kg) { mere.prochaine = n + 3; return; }
    // trop de plans : elle démonte le plus maigre de ceux qu'elle n'assemble plus (ses machines deviennent ferraille)
    let demonte = null;
    if (nbVivants() >= REGLES.max_lignees) { demonte = vivants.filter(t => t !== base && !(mere.courant || []).includes(t.id) && n - t.apparu >= 3 * REGLES.mere.intervalle).sort((a, b) => masseTotale(a) - masseTotale(b) || (a.id < b.id ? -1 : 1))[0];
      if (!demonte) { mere.prochaine = n + 3; return; }
      for (const [bid, P] of Object.entries(etat.get(demonte.id).pops)) { biomes[bid].ressources.ferraille += somme(P.N) * (demonte.plan.masse_kg || 1) * REGLES.ferraille; P.N = P.N.map(() => 0); } }
    const plan = clone(base.plan), ch = [];
    const up = (k, d) => { const v0 = mod(plan, k), v = +clamp(v0 + d, 0, 1).toFixed(3); if (v !== v0) { plan.modules[k] = v; ch.push(`${k} ${d > 0 ? '+' : '−'}${Math.abs(v - v0).toFixed(2)}`); } };
    const masse = f => { f = clamp(plan.masse_kg * f, .5, 5000) / plan.masse_kg; plan.masse_kg = +(plan.masse_kg * f).toPrecision(3); ch.push(`masse ×${f < .1 ? f.toPrecision(2) : f.toFixed(2)}`); };
    const hostile = moyenneMefiance(vivants) >= .3;
    if (cause === 'joueurs') { up('blindage', .2); if (hostile || mod(plan, 'blindage') >= .3) up('arme', .25); else up('discretion', .25); masse(1.1); }   // (d'abord se cacher ; puis riposter)
    else if (cause === 'energie') { up('batterie', .2); up(mod(plan, 'thermique') > mod(plan, 'panneau') ? 'thermique' : 'panneau', .1); masse(.85); }
    else if (cause === 'catastrophe') { up('blindage', .15); }
    else if (cause === 'regulation') { up('pince', .2); up('foreuse', .1);                        // un régulateur à la taille de ce qui déborde
      if (Math.abs(Math.log10(cibleR / plan.masse_kg)) > .3) masse(cibleR / plan.masse_kg); }
    else if (cause === 'usure') { plan.longevite = +(plan.longevite * 1.25).toFixed(1); ch.push('longévité ×1,25'); }
    else { up(MODULES[Math.floor(Rs() * MODULES.length)], Rs() < .5 ? -.1 : .1); masse(.8 + .45 * Rs()); }
    if (!ch.length) { up('batterie', .1); }
    // elle vérifie que le plan tient là où elle l'envoie (sinon : plus de panneaux, ou de capteurs de chaleur, et de batterie)
    const ou = { joueurs: bid => etat.get(base.id).pops[bid]?.mortsExt || 0, catastrophe: bid => etat.get(base.id).pops[bid]?.causes?.catastrophe || 0, regulation: bid => M[bid].debord }[cause];
    let lieu = mere.biome; if (ou) { const L = tous.map(b => [b.id, ou(b.id)]).filter(([bid, v]) => v > 0 && ctx.convenance(plan, biomes[bid]) > 0).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)); if (L.length) lieu = L[0][0]; }
    for (let k = 0; k < 6 && bilan(plan, M[lieu]).rho < 1.15; k++) { const chaud = M[lieu].H > M[lieu].L; up(chaud ? 'thermique' : 'panneau', .1); if (k % 2) up('batterie', .1); }
    plan.taille_m = +(base.plan.taille_m * Math.cbrt(plan.masse_kg / base.plan.masse_kg)).toFixed(2); plan.role = roleDe(plan);
    mere.conceptions = (mere.conceptions || 0) + 1;
    // (elle l'envoie là où le besoin est le plus grand : là où ses machines tombent, là où une espèce déborde ; sinon, chez elle)
    const nt = naitre(base, plan, lieu, REGLES.mere.effectif, null, `mere-${mere.conceptions}`);
    r.minerai -= REGLES.mere.cout * plan.masse_kg;
    mere.courant = [nt.id, ...(mere.courant || []).filter(id => id !== nt.id)].slice(0, 2); mere.prochaine = n + REGLES.mere.intervalle;
    mere.derniere = { taxon: nt.id, cause, cycle: n };
    ev().push({ type: 'conception', taxon: nt.id, biome: lieu, detail: `${mere.nom} conçoit ${nt.nom} d'après ${base.nom} : ${ch.join(', ')} (${RAISON[cause]})${lieu !== mere.biome ? `, et l'envoie ${biomes[lieu].nom || lieu}` : ''}${demonte ? ` ; elle démonte ${demonte.nom}` : ''}` });
  }
  // l'assemblage : chaque cycle, la Mère assemble ses deux derniers plans (deux tiers, un tiers), autant que son minerai le permet
  function assembler() {
    const r = biomes[mere.biome].ressources, ids = (mere.courant || []).filter(id => { const t = taxons.find(x => x.id === id); return t && !t.eteint; });
    if (!ids.length) { const v = taxons.filter(t => !t.eteint && estSyn(t)).sort((a, b) => total(b) - total(a))[0]; if (v) ids.push(v.id); else return; mere.courant = ids.slice(); }
    ids.forEach((id, k) => { const t = taxons.find(x => x.id === id), E = etat.get(t.id), masse = t.plan.masse_kg || 1;
      const voulu = REGLES.mere.production * (ids.length === 1 ? 1 : k === 0 ? 2 / 3 : 1 / 3), nb = Math.min(voulu, r.minerai * REGLES.prise / masse);
      if (!(nb > 0)) return; r.minerai -= nb * masse;
      const P = E.pops[mere.biome] ??= popNeuve(E.plans.length); P.N[0] += nb; P.immig = (P.immig || 0) + nb; });
  }
  const popNeuve = K => ({ N: new Array(K).fill(0), depuis: n, avant: 0, maladie: null, flux0: 0, immig: 0, predation: new Array(K).fill(0), ration: new Array(K).fill(0), satiete: null });
  const total = t => somme(Object.values(etat.get(t.id)?.pops || {}).map(p => somme(p.N)));
  const masseTotale = t => total(t) * (t.plan.masse_kg || 1);
  const pertes = (t, f) => somme(Object.values(etat.get(t.id)?.pops || {}).map(f));
  const nbVivants = () => taxons.filter(t => !t.eteint && estSyn(t)).length;
  const moyenneMefiance = vivants => { let s = 0, w = 0; for (const t of vivants) for (const p of Object.values(etat.get(t.id).pops)) { const N = somme(p.N); s += N * (p.mef0 || 0); w += N; } return w > 0 ? s / w : 0; };
  const ev = () => ctx.ev;
  // une lignée neuve (une conception, une erreur de copie) : elle vit dès ce cycle dans le lieu où elle est née
  function naitre(parent, plan, bid, effectif, depuisPop, idVoulu) {
    let id = idVoulu || `${parent.id}.${bid}`, k = 2; while (taxons.some(t => t.id === id)) id = `${idVoulu || parent.id + '.' + bid}-${k++}`;
    const nom = nomMachine(Rs, (mere?.conceptions || 0) + taxons.filter(estSyn).length);
    const t = { id, nom, parent: parent.id, apparu: n, eteint: null, statut: 'croissance', plan, populations: [], phenotypes: [{ id: 'base', frequence: 1, traits: [] }] };
    const P = popNeuve(1); let e = effectif;
    if (depuisPop) { e = Math.min(effectif, somme(depuisPop.N) * .5); const f = 1 - e / Math.max(1e-9, somme(depuisPop.N)); depuisPop.N = depuisPop.N.map(x => x * f); }
    P.N[0] = e; P.avant = e; P.syn = bilan(plan, M[bid]);
    taxons.push(t); etat.set(id, { plans: [plan], pops: { [bid]: P }, couts: [0], vuln: [1], chasse: [1], resist: [1] });
    return t;
  }

  // (l'écriture) ce qu'une population publie : l'énergie et la posture d'une machine ; la part des morts dues aux machines
  S.publier = (t, bid, pop, p, morts) => {
    if (estSyn(t)) { if (pop.syn) p.energie = +clamp(pop.syn.rho, 0, 9).toFixed(3); p.posture = postureDe(p.mefiance || 0, t.plan); }
    else if (pop.regule > 0 && morts > 0) p.regulation = +clamp(pop.regule / morts, 0, 1).toFixed(3);
  };
  S.texteMefiance = (t, m) => estSyn(t) ? (postureDe(m, t.plan) === 'hostile' ? 'les machines deviennent hostiles aux joueurs' : 'les machines fuient les joueurs') + ` (${Math.round(m * 100)} %)` : null;
  S.monde = monde => mere ? { ...monde, mere } : monde;
  return S;
}
// la posture d'une population de machines face aux joueurs : sa méfiance (docs/12), et l'arme qu'elle a ou non
function postureDe(m, plan) { const arme = mod(plan, 'arme') >= .15; return m >= .5 ? (arme ? 'hostile' : 'fuyante') : m >= .2 ? 'defensive' : 'neutre'; }

const API = { REGLES, MODULES, FONDATEURS, eveiller, preparer, ressourcesDe, milieuDe, bilan, coutDe, capteurs, roleDe, postureDe, estSyn };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneSynthetique = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
