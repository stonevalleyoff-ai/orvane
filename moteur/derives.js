// Orvane — LES DÉRIVES (moteur/derives.js) — docs/29
// Dans un monde aux dérives éveillées, ce qui était fixé une fois pour toutes à la genèse ou à l'éveil se remet à bouger :
//  - les régimes : une lignée qui se sépare change parfois de régime, un pas à la fois (herbivore ↔ omnivore ↔ carnivore) ;
//    devenue carnivore, elle gagne en audace et en sens ; devenue herbivore, elle en perd ;
//  - les plantes se séparent : là où une défense (des toxines, des épines) a gagné une partie d'une population, sans l'avoir
//    toute, la part défendue devient parfois une lignée de plantes à elle, qui partage la place de sa mère ;
//  - les souches mutent : une souche qui infecte beaucoup de bêtes donne parfois un mutant, plus ou moins virulent, adapté à
//    l'hôte où il est né ; il prend une part des infectés de sa mère ;
//  - les insectes les portent : un mutant né là où vit un petit insecte (une tique, un moustique) peut devenir porté par lui ; il
//    passe alors d'une lignée à l'autre sans parenté (l'insecte pique tout le monde), et d'un lieu voisin à l'autre si l'insecte
//    vole ; l'insecte, lui, n'en tombe pas malade.
// Chaque dérive a son propre hasard, tiré du nom de la lignée et du cycle : celui du cycle ne bouge pas. Un monde sans dérives
// n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneDerives).
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DIE = (typeof require === 'function' ? require('./dietes.js') : racine.OrvaneDietes) || null;
const REGLES = {
  regime: { 'herbivore>omnivore': .05, 'omnivore>herbivore': .05, 'omnivore>carnivore': .04, 'carnivore>omnivore': .04 },   // par séparation
  plantes: { bande: [.3, .7], chance: .002, min: 50, max: 3, monde: .5 },   // une défense entre 30 et 70 % d'une population ; 0,2 % par cycle ; 50 unités de biomasse au moins ; trois filles au plus par lignée, et la moitié des lignées de l'éveil de la flore dans tout le monde
  souches: { chance: .004, min: 100, ecart: .4, part: .1, max: 40, vecteur: .3, piqure: .3, demi: 1e4, adapt: .6 }
  // une souche qui infecte 100 bêtes d'une population : 0,4 % de chances par cycle d'y muter ; la virulence du mutant, × e^(0,4 × un tirage normal) ;
  // il prend 10 % des infectés ; 40 souches au plus ; 30 % des mutants nés là où vit un petit insecte sont portés par lui ; ce qu'il
  // transmet d'une lignée à l'autre (0,3, × sa présence : à moitié pour 10 000 insectes) ; il s'adapte à tout hôte au moins à 0,6
};
const GREC = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'];
const SYL = ['ra', 'mo', 'ké', 'li', 'vu', 'sar', 'te', 'go', 'phi', 'dal', 'nu', 'ver', 'zo', 'cal', 'ri', 'ba', 'lo', 'mi'];
const FEM = new Set(['herbe', 'algue', 'succulente']);
const DEF = { 1: ['toxique', 'toxique'], 2: ['épineux', 'épineuse'], 3: ['épineux et toxique', 'épineuse et toxique'] }, PIEDS = { 1: 'toxiques', 2: 'épineux', 3: 'épineux et toxiques' };
const hacher = (s, n, sel) => { let h = (2166136261 ^ sel) >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (Math.imul(h ^ (n + 1), 2654435761) >>> 0) || 1; };
const generateur = g => () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
const gauss = R => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R());
// un petit insecte (une tique, un moustique) : celui qui peut porter une souche ; un petit hexapode, ou une toute petite bête qui vole
const estVecteur = t => t && !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique' && (t.plan.masse_kg || 1) <= .05 && (t.plan.corps?.forme === 'hexapode' || ((t.plan.locomotion || []).includes('vol') && (t.plan.masse_kg || 1) <= .01));

function eveiller(inst) { const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.derives) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, derives: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => t.plan?.regime !== 'vegetal')?.id, detail: 'les dérives s\'éveillent : les régimes changent à la séparation, les plantes se séparent, les souches mutent, les insectes les portent' }] }; }

// --- les régimes : à la séparation (après moteur/orvane.js deriver) ; son hasard, tiré du nom de la lignée fille et du cycle ---
function regime(parent, plan, nid, n) {
  const R = generateur(hacher(nid, n, 0x2f1)), r = parent.regime, P = REGLES.regime; let vers = null, u = R();
  for (const [k, p] of Object.entries(P)) { const [de, a] = k.split('>'); if (de !== r) continue; if (u < p) { vers = a; break; } u -= p; }
  if (!vers) return null;
  plan.regime = vers;
  if (vers === 'carnivore') { plan.temperament = +clamp((plan.temperament ?? .5) + .15, 0, 1).toFixed(3); plan.perception = +clamp((plan.perception ?? .5) + .1, 0, 1).toFixed(3); plan.vitesse_rel = +((plan.vitesse_rel || 1) * 1.1).toFixed(2); }
  if (vers === 'herbivore') plan.temperament = +clamp((plan.temperament ?? .5) - .1, 0, 1).toFixed(3);
  return `son régime dérive : ${r} devenue ${vers}`;
}

// --- les plantes qui se séparent (moteur/flore.js, à l'écriture des plantes) ---
function diviser(plantes, ctx) {
  const { n, ids, noms = {}, flore = 0 } = ctx, P = REGLES.plantes, ev = [], neuves = [], plafond = Math.ceil(P.monde * (flore || plantes.length));
  for (const t of plantes) { if (t.eteint || plantes.filter(x => x.parent).length + neuves.length >= plafond) continue; const filles = plantes.filter(x => x.parent === t.id).length + neuves.filter(x => x.parent === t.id).length; if (filles >= P.max) continue;
    for (const p of t.populations.slice()) { const f = p.frequences || [], B = p.effectif * (t.plan.masse_kg || 1); if (!(B >= P.min)) continue;
      const k = [1, 2, 3].filter(i => f[i] >= P.bande[0] && f[i] <= P.bande[1]).sort((a, b) => f[b] - f[a])[0]; if (!k) continue;
      const R = generateur(hacher(t.id + '|' + p.biome, n, 0x51d)); if (R() >= P.chance) continue;
      // la part défendue part : elle emporte sa part de la place, de l'effectif, de la référence (la nourriture des brouteurs reste continue)
      const q = f[k], fq = [0, 0, 0, 0].map((_, i) => i === k ? .9 : .1 / 3), reste = f.map((x, i) => i === k ? 0 : x), sr = reste.reduce((a, x) => a + x, 0) || 1;
      let id = `${t.id}-${k === 1 ? 'tox' : k === 2 ? 'epi' : 'def'}`, j = 2; while (ids.has(id)) id = `${t.id}-${k === 1 ? 'tox' : k === 2 ? 'epi' : 'def'}-${j++}`; ids.add(id);
      const forme = t.plan.forme, nom = (SYL[Math.floor(R() * SYL.length)] + SYL[Math.floor(R() * SYL.length)]).replace(/^./, c => c.toUpperCase()), d = DEF[k][(t.plan.feminin ?? FEM.has(forme)) ? 1 : 0];
      // (tout ce qui mesure une place se partage : l'effectif, le potentiel, et ceux de la référence — le milieu recalcule chaque
      //  cycle le potentiel d'après reference.potentiel ; sans ce partage, la mère et la fille reprenaient chacune toute la place.
      //  Les fréquences de la référence restent celles de la mère : la nourriture de référence des brouteurs ne bouge pas)
      const part = (o, x) => { if (!o) return o; const r = { ...o }; for (const k of ['effectif', 'potentiel']) if (Number.isFinite(o[k])) r[k] = +(o[k] * x).toFixed(2); return r; };
      const ref0 = p.reference ? { effectif: p.effectif, ...p.reference } : null;
      const lieu = noms[p.biome] || p.biome, pf = { ...p, effectif: +(p.effectif * q).toFixed(2), tendance: 0, depuis: n, potentiel: +((p.potentiel || 0) * q).toFixed(2), frequences: fq.map(x => +x.toFixed(5)) };
      if (ref0) pf.reference = part(ref0, q);
      if (p.reference_diete) pf.reference_diete = part(p.reference_diete, q);   // (docs/30)
      p.effectif = +(p.effectif * (1 - q)).toFixed(2); p.potentiel = +((p.potentiel || 0) * (1 - q)).toFixed(2); p.frequences = reste.map(x => +(x / sr).toFixed(5));
      if (ref0) p.reference = part(ref0, 1 - q);
      if (p.reference_diete) p.reference_diete = part(p.reference_diete, 1 - q);
      const fille = { ...JSON.parse(JSON.stringify({ ...t, populations: [] })), id, nom: `${nom} ${forme} ${d} (${lieu})`, parent: t.id, apparu: n, eteint: null, statut: 'croissance', populations: [pf] };
      neuves.push(fille);
      ev.push({ type: 'separation', taxon: id, biome: p.biome, detail: `lignée de plantes issue de ${t.id} : ses pieds ${PIEDS[k]} (${Math.round(q * 100)} %) deviennent une lignée à elle, ${fille.nom}` });
      break; } }
  return { neuves, evenements: ev };
}

// --- les souches qui mutent, et celles que portent les insectes (moteur/pathogenes.js, après la contagion) ---
function souches(ctx) {
  const { S, P, n, lieux, Tmap } = ctx, Q = REGLES.souches, ev = [];
  const vecteurs = {}, w = h => h.N * (1 + 10 * (h.t.plan.diete?.sang || 0)); for (const [bid, L] of Object.entries(lieux)) { const v = L.filter(h => estVecteur(h.t)).sort((a, b) => w(b) - w(a))[0]; if (v) vecteurs[bid] = v; }   // (docs/30 : d'abord un buveur de sang)
  return {
    // ce qu'une souche portée par un insecte apporte à un hôte : les piqûres, d'une lignée à l'autre et des lieux voisins où l'insecte vole
    piqures(h, s, bid, voisins) { const so = S[s]; if (!so?.vecteur || h.t.id === so.vecteur) return 0;
      const pres = id => { const L = lieux[id] || [], v = L.find(x => x.t.id === so.vecteur); return v ? v.N / (v.N + Q.demi) : 0; }, imax = id => Math.max(0, ...(lieux[id] || []).filter(x => x.t.id !== so.vecteur).map(x => x.inf[s]?.i || 0));
      const sv = 1 + (DIE?.REGLES.sang.vecteur ?? 0) * (Tmap.get(so.vecteur)?.plan.diete?.sang || 0);   // (docs/30) un buveur de sang porte mieux
      let p = Q.piqure * sv * pres(bid) * imax(bid); if ((Tmap.get(so.vecteur)?.plan.locomotion || []).includes('vol')) for (const v of voisins) p += .05 * Math.min(pres(bid), pres(v)) * imax(v); return p; },   // (celui qui vole passe aux lieux voisins)
    adaptation: (so, a) => so?.vecteur ? Math.max(a, Q.adapt) : a,
    porteur: (so, t) => so?.vecteur === t.id,   // l'insecte porte la souche sans en tomber malade
    // après la contagion : les mutations, dans les populations où une souche infecte assez de bêtes
    muter(h, out, bid) {
      for (const [s, x] of Object.entries(out)) { const so = S[s]; if (!so || !(x.i * h.N >= Q.min) || Object.keys(S).length >= Q.max) continue;
        const R = generateur(hacher(h.t.id + '|' + bid + '|' + s, n, 0x6a7)); if (R() >= Q.chance) continue;
        const racineNom = so.nom.split(' ')[0], k = Object.values(S).filter(z => z.nom.split(' ')[0] === racineNom).length - 1, v = +clamp(so.virulence * Math.exp(Q.ecart * gauss(R)), .01, .6).toFixed(3);
        const id = 'souche-' + (P.prochain++), m = { nom: `${racineNom} ${GREC[k % GREC.length]}${k >= GREC.length ? Math.floor(k / GREC.length) + 1 : ''}`, virulence: v, transmission: +(.3 + 1.5 * Math.sqrt(v)).toFixed(3), origine: h.t.id, apparu: n, hotes: [h.t.id], parent: s };
        const vec = vecteurs[bid]; if (vec && vec.t.id !== h.t.id && R() < Q.vecteur) m.vecteur = vec.t.id;
        S[id] = m; const i = x.i * Q.part; out[id] = { i: +i.toPrecision(4), r: 0 }; x.i = +(x.i - i).toPrecision(4);
        ev.push({ type: 'epidemie', taxon: h.t.id, biome: bid, detail: `la souche ${so.nom} mute chez ${h.t.nom || h.t.id} : ${m.nom}, virulence ${Math.round(v * 100)} % par cycle (sa mère : ${Math.round(so.virulence * 100)} %)${m.vecteur ? `, portée par ${Tmap.get(m.vecteur)?.nom || m.vecteur}` : ''}` });
        break; }
    },
    evenements: ev
  };
}

const API = { REGLES, eveiller, regime, diviser, souches, estVecteur };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneDerives = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
