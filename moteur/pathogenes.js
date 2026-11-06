// Orvane — LES PATHOGÈNES (moteur/pathogenes.js) — docs/18
// Les maladies ont désormais des souches : chacune a sa virulence et sa contagion (plus une souche tue, plus elle se transmet,
// mais un hôte mort ne la transmet plus : les souches qui durent sont entre les deux). Une souche naît dans une population
// entassée, circule dans sa population, passe aux populations voisines de la même lignée (d'une parcelle à l'autre), et saute
// aux lignées apparentées et de taille voisine qui partagent son lieu ; jamais d'une lignée à une autre sans ancêtre commun,
// ni aux machines, ni aux plantes. Un hôte guéri est immunisé, et son immunité s'use. Par population, pour chaque souche : la
// part des bêtes infectées et celle des immunisées (populations[].infection).
// Le moteur (moteur/orvane.js) appelle ce fichier à quelques points de son cycle, dans un monde qui a ses souches
// (monde.pathogenes) ; sans elles, rien ne change. Déterministe. Node (require) ou navigateur (globalThis.OrvanePathogenes).
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const somme = a => a.reduce((s, x) => s + x, 0);
const typeDe = b => b.type || b.id;
const DER = (typeof require === 'function' ? require('./derives.js') : racine.OrvaneDerives) || null;   // (docs/29) les souches qui mutent, celles que portent les insectes

const REGLES = {
  emergence: .0005,          // la chance qu'une souche naisse, par cycle, dans une population de 200 bêtes au moins, × 2 × (sa saturation − 0,5)
  guerison: .25,             // la part des infectés qui guérissent chaque cycle (immunisés)
  oubli: .05,                // la part des immunisés qui redeviennent sensibles chaque cycle
  voisinage: .05,            // ce que les parcelles voisines (la même lignée) transmettent, rapporté à la population elle-même
  adaptation: .3,            // la contagion chez une autre lignée : × (sa compatibilité avec la lignée d'origine)^0,3
  croisement: .2,            // ce qu'une autre lignée du lieu transmet, rapporté à sa propre population (× parenté × taille)
  parente: 100,              // en cycles : deux lignées séparées depuis plus longtemps se transmettent peu (exp(-âge/100))
  masse: .5,                 // et deux lignées de tailles éloignées aussi (une décade d'écart : ×0,37)
  depart: .01,               // la part de la population infectée à la naissance d'une souche
  seuil: 1,                  // une souche qui n'a plus une bête infectée dans le monde s'éteint
  locale: 0                  // une souche s'éteint dans une population où il lui reste moins de malades que cela (l'immunité reste) ; 0 : jamais
};
const SYL = ['ra', 'mo', 'ké', 'li', 'vu', 'sar', 'te', 'go', 'phi', 'dal', 'nu', 'ver', 'zo', 'cal', 'ri'];
const transmission = v => +(.3 + 1.5 * Math.sqrt(v)).toFixed(3);   // le compromis : plus virulente, plus contagieuse
const estHote = t => t && !t.eteint && t.plan.regime !== 'synthetique' && t.plan.regime !== 'vegetal';

// --- l'éveil : le monde a désormais ses souches (une fois ; le cycle de nuit l'applique : profil.monde.pathogenes) ---
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.pathogenes) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, pathogenes: { depuis: out.cycle?.n ?? 0, prochain: 1, souches: {} } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estHote)?.id, detail: 'les maladies ont désormais leurs souches : chacune sa virulence, sa contagion, ses hôtes' }] };
}

// --- un cycle ---
function preparer(ctx) {
  const { inst, n, biomes, taxons, etat, ev } = ctx; if (!inst.monde?.pathogenes) return null;
  const P = JSON.parse(JSON.stringify(inst.monde.pathogenes)), S = P.souches;
  let g = (((inst.monde.graine >>> 0) ^ 0x7e3a1d) ^ Math.imul(n + 1, 0x27d4eb2d)) >>> 0; const R = () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
  const Tmap = new Map(taxons.map(t => [t.id, t])), kin = new Map();
  // la compatibilité de deux lignées pour une souche : 1 pour la lignée elle-même ; sinon, selon leur parenté et leurs tailles
  const compat = (a, b) => { if (a === b) return 1; const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id; if (kin.has(k)) return kin.get(k);
    const p = ctx.parente(a, b, Tmap), d = Math.log10((a.plan.masse_kg || 1) / (b.plan.masse_kg || 1));
    const c = p ? Math.exp(-Math.max(0, n - p.depuis) / REGLES.parente) * Math.exp(-d * d / (2 * REGLES.masse * REGLES.masse)) : 0; kin.set(k, c); return c; };
  // l'état du début du cycle : par lieu, les populations hôtes (lignée, effectif, infection)
  const lieux = {};
  for (const t of taxons) { if (!estHote(t)) continue; const E = etat.get(t.id); if (!E) continue;
    for (const [bid, pop] of Object.entries(E.pops)) { const N = somme(pop.N); if (!(N > 0)) continue; (lieux[bid] ??= []).push({ t, bid, pop, N, inf: pop.inf0 || {} }); } }
  const DV = DER && inst.monde?.derives ? DER.souches({ S, P, n, lieux, Tmap }) : null;
  const F = {
    // la mortalité du cycle, due aux souches (avant la résistance de chaque phénotype)
    mortalite: (t, bid) => { const pop = etat.get(t.id)?.pops[bid], I = pop?.inf0; if (!I) return 0; let m = 0; for (const [s, x] of Object.entries(I)) if (S[s]) m += S[s].virulence * (x.i || 0); return Math.min(.6, m); },
    // après la dynamique : la contagion, la guérison, l'oubli ; les naissances de souches, les sauts d'hôte, les extinctions
    apres: () => {
      const nouv = new Map();                     // pop → { souche: { i, r } } du cycle suivant
      for (const [bid, L] of Object.entries(lieux)) {
        const b = biomes[bid], voisins = (b?.voisins || []).filter(v => biomes[v]);
        const presentes = new Set(L.flatMap(h => Object.keys(h.inf).filter(s => S[s] && h.inf[s].i > 0)));
        for (const h of L) {
          const I0 = h.inf, out = {}, R0 = somme(Object.values(I0).map(x => (x.i || 0) + (x.r || 0)));
          let sens = clamp(1 - R0, 0, 1);
          // les souches d'ici, et celles des parcelles voisines (la même lignée)
          const cand = new Set([...presentes, ...Object.keys(I0)]);
          for (const v of voisins) { const q = etat.get(h.t.id)?.pops[v]?.inf0; if (q) for (const s of Object.keys(q)) if (S[s] && q[s].i > 0) cand.add(s); }
          if (DV) for (const v of voisins) for (const j of lieux[v] || []) for (const s of Object.keys(j.inf)) if (S[s]?.vecteur && j.inf[s].i > 0) cand.add(s);   // (docs/29) l'insecte vole d'un lieu à l'autre
          for (const s of cand) { const so = S[s]; if (!so || DV?.porteur(so, h.t)) continue;
            // la part infectée de sa propre population, et ce que lui apportent les autres lignées du lieu : selon leur parenté, leur
            // part infectée, et leur nombre (une petite population infectée n'expose guère une grande)
            let prev = I0[s]?.i || 0;
            for (const j of L) { if (j === h) continue; const ij = j.inf[s]?.i || 0; if (!(ij > 0)) continue; const c = compat(h.t, j.t); if (c > 0) prev += REGLES.croisement * c * ij * Math.min(1, j.N / h.N); }
            for (const v of voisins) { const q = etat.get(h.t.id)?.pops[v]?.inf0?.[s]; if (q?.i) prev += REGLES.voisinage * q.i; }
            if (DV) prev += DV.piqures(h, s, bid, voisins);
            // une souche se transmet d'autant moins dans une lignée qu'elle est loin de celle où elle est née : chez une lignée
            // lointaine, elle s'éteint (un hôte sans issue) ; chez une proche parente, elle prend
            const o = Tmap.get(so.origine), a0 = o ? Math.pow(compat(o, h.t), REGLES.adaptation) : (so.hotes || []).includes(h.t.id) ? 1 : .5, adapt = DV ? DV.adaptation(so, a0) : a0;
            const foule = clamp(h.pop.satC ?? 1, .3, 1.5), lam = so.transmission * adapt * foule * prev, nouveaux = Math.min(sens, lam * sens);
            const i0 = I0[s]?.i || 0, r0 = I0[s]?.r || 0;
            const i1 = clamp(i0 + nouveaux - (REGLES.guerison + so.virulence) * i0, 0, 1), r1 = clamp(r0 + REGLES.guerison * i0 - REGLES.oubli * r0, 0, 1);
            sens = Math.max(0, sens - nouveaux);
            if (i1 * h.N >= .05 || r1 >= .01) out[s] = { i: i1 * h.N < REGLES.locale ? 0 : +i1.toPrecision(4), r: +r1.toPrecision(4) };
            if (i1 >= .01 && i1 * h.N >= 20 && !(so.hotes || []).includes(h.t.id)) { (so.hotes ??= []).push(h.t.id);   // (un hôte : une épidémie qui prend, pas quelques bêtes touchées)
              if (so.hotes.length > 1) ev.push({ type: 'epidemie', taxon: h.t.id, biome: bid, detail: `la souche ${so.nom} passe à ${h.t.nom || h.t.id} (virulence ${Math.round(so.virulence * 100)} % par cycle)` }); }
          }
          if (DV) DV.muter(h, out, bid);   // (docs/29) une souche qui infecte beaucoup de bêtes mute parfois
          // une souche naît dans une population nombreuse et entassée
          const sat = h.pop.satC ?? 0;
          if (h.N >= 200 && sat > .5 && R() < REGLES.emergence * clamp(2 * (sat - .5), 0, 3)) {
            const id = 'souche-' + (P.prochain++), v = +(.04 + .3 * R()).toFixed(3), nom = (SYL[Math.floor(R() * SYL.length)] + SYL[Math.floor(R() * SYL.length)]).replace(/^./, c => c.toUpperCase()) + 'ose';
            S[id] = { nom, virulence: v, transmission: transmission(v), origine: h.t.id, apparu: n, hotes: [h.t.id] };
            out[id] = { i: REGLES.depart, r: 0 };
            ev.push({ type: 'epidemie', taxon: h.t.id, biome: bid, detail: `une souche nouvelle, ${nom}, apparaît chez ${h.t.nom || h.t.id} : virulence ${Math.round(v * 100)} % par cycle, contagion ${S[id].transmission}` });
          }
          nouv.set(h.pop, out);
        }
      }
      for (const [pop, out] of nouv) pop.inf1 = out;
      if (DV) ev.push(...DV.evenements);
      // les souches qui n'ont plus d'hôte s'éteignent ; celles qui vivent disent combien elles infectent
      const tot = {}; for (const L of Object.values(lieux)) for (const h of L) for (const [s, x] of Object.entries(h.pop.inf1 || {})) tot[s] = (tot[s] || 0) + x.i * h.N;
      for (const [s, so] of Object.entries(S)) { so.infectes = Math.round(tot[s] || 0);
        if (!(tot[s] >= REGLES.seuil) && so.apparu < n) { ev.push({ type: 'remission', taxon: so.origine, detail: `la souche ${so.nom} s'éteint, après ${n - so.apparu} cycles et ${(so.hotes || []).length} lignée${(so.hotes || []).length > 1 ? 's' : ''} touchée${(so.hotes || []).length > 1 ? 's' : ''}` }); delete S[s]; } }
      for (const L of Object.values(lieux)) for (const h of L) if (h.pop.inf1) for (const s of Object.keys(h.pop.inf1)) if (!S[s]) delete h.pop.inf1[s];
    },
    publier: (t, bid, pop, p) => { const I = pop.inf1 ?? pop.inf0; if (I && Object.keys(I).length) p.infection = I; },
    monde: monde => ({ ...monde, pathogenes: P })
  };
  return F;
}

const API = { REGLES, eveiller, preparer, transmission, estHote };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvanePathogenes = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
