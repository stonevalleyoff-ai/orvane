// Orvane — LA MÉTÉO (moteur/meteo.js) — docs/45
// Entre la saison, lisse et prévisible, et la catastrophe, rare, il ne se passait rien : deux étés se ressemblaient au caractère
// près. Dans un monde à la météo éveillée, chaque lieu (chaque parcelle d'un monde par parcelles, docs/15) a son temps du cycle :
//  - deux écarts autour de la saison : la chaleur (t) et l'eau (e), en écarts-types (0 : le temps de saison) ;
//  - une mémoire : le temps d'hier dure (un temps sec s'installe) ;
//  - des voisins : un lieu prend une part du temps de ses voisins de la veille (un front passe de parcelle en parcelle) ;
//  - un vent : la différence d'eau avec les voisins (là où un front passe, il souffle) ;
//  - un manteau de neige, qui s'épaissit quand il neige et fond au redoux ; une sécheresse, qui monte quand le sec dure ;
//    des eaux, qui montent quand la pluie dure ou que la neige fond ;
//  - un temps nommé : clair, couvert, pluie, orage, neige, gel, canicule, tempête, brouillard.
// Ce que la météo fait au monde : la température et l'humidité du cycle (la niche de chaque lignée les sent), la production du
// cycle (la pluie nourrit les terres sèches, un coup de chaud les terres froides ; de moyenne 1 : sur l'année, rien ne se déplace),
// et les catastrophes, qui ont désormais une cause : le feu et la sécheresse suivent le sec qui dure, la crue les eaux qui montent. Tout part de zéro à l'éveil : le jour de l'éveil, rien ne bouge. Le hasard de
// la météo est le sien. Un monde qui ne l'a pas éveillée n'en voit rien. Déterministe. Node (require) ou navigateur
// (globalThis.OrvaneMeteo).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), r3 = v => +(+v).toFixed(3), r4 = v => +(+v).toFixed(4);
const REGLES = {
  memoire: .7,               // ce qu'un lieu garde de son temps de la veille
  voisins: .5,               // la part de ce souvenir qui vient de ses voisins (un front passe)
  bruit: .43,                // l'écart-type du tirage du cycle (de quoi tenir les écarts autour de ±0,5)
  borne: 1.6,                // les écarts sont bornés
  axes: { temperature: .06, humidite: .05 },      // ce qu'un écart de 1 déplace sur les axes du cycle
  sentis: { marin: .5, aquatique: .7, amphibie: 1, terrestre: 1, aerien: 1.2 },   // ce qu'un lieu sent du temps (le sous-sol : rien)
  production: { eau: .12, chaleur: .08, bornes: [.6, 1.4] },   // la production du cycle : ±12 % par écart d'eau dans une terre sèche, ±8 % par écart de chaleur dans une terre froide
  froid: .22,                // sous cette température du cycle, l'eau tombe en neige et le sec gèle
  chaud: .78,                // au-dessus, le sec est une canicule
  seuils: { pluie: .35, orage: .9, sec: -.35, vent: .55, brouillard: .6 },
  neige: { chute: .3, fonte: 3 },                 // le manteau : +0,3 par écart d'eau un jour de neige ; il fond de 3 × (la température − froid)
  secheresse: { memoire: .88, force: 1.1, seuil: .5 },        // la sécheresse : une moyenne glissante du manque d'eau ; au-dessus de 0,5, elle est installée
  eaux: { memoire: .8, force: 1.1, fonte: 1.5 },   // les eaux qui montent : une moyenne glissante de la pluie, et la neige qui fond d'un coup
  // (docs/45) les catastrophes ont une cause : la chance d'un incendie et d'une sécheresse suit le sec qui dure, celle d'une crue
  // les eaux qui montent ; rapportées à leur moyenne (mesurée sur le monde d'Orvane, quatre ans), pour que les catastrophes
  // gardent leur fréquence ; plafond : au plus tant de fois la chance d'avant
  causes: { sec: .157, eaux: .121, plafond: 6 },
  force: null,               // (des écarts imposés, { t, e }, à la place du souvenir et du tirage : un banc, un auteur de monde qui veut son été sec)
  evenements: 4              // au plus, par cycle (les plus forts)
};
const typeDe = b => b.type || b.id;
const NOMS = { clair: 'temps clair', couvert: 'ciel couvert', pluie: 'pluie', orage: 'orage', neige: 'neige', gel: 'gel', canicule: 'canicule', tempete: 'tempête', brouillard: 'brouillard' };
// le hasard d'un lieu, un cycle : deux tirages de Gauss, qui ne dépendent ni de l'ordre des lieux ni du hasard du cycle
const hacher = (s, g, n) => { let h = (2166136261 ^ (g >>> 0)) >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (Math.imul(h ^ 0x6d2b79f5, 2654435761) ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0; };
const tirage = (id, graine, n) => { let g = hacher(id, graine, n); const R = () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
  R(); const a = Math.sqrt(-2 * Math.log(1 - R())), b = 2 * Math.PI * R(); return [a * Math.cos(b), a * Math.sin(b)]; };
// un lieu a-t-il un temps ? pas le sous-sol, pas la mer sans lumière ; ni un lieu qui le refuse (meteo: false)
const aUnTemps = b => b.meteo !== false && b.milieu !== 'souterrain' && !(b.milieu === 'marin' && (b.axes?.lumiere ?? 1) < .2);
const senti = b => REGLES.sentis[b.milieu] ?? 1;

function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.meteo) return { inst: out, evenements: [] };
  let nb = 0; for (const b of out.biomes) if (aUnTemps(b)) { b.meteo = { temps: 'clair', t: 0, e: 0 }; nb++; }
  out.monde = { ...out.monde, meteo: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.biomes[0]?.id, detail: `la météo s'éveille : ${nb} lieux ont désormais leur temps, la pluie, la neige, le gel, les orages, les canicules` }] };
}

// le temps nommé d'un lieu : T, sa température du cycle ; hum, son humidité de saison
function nommer(T, hum, e, t, vent) {
  const S = REGLES.seuils;
  if (vent >= S.vent && e >= S.pluie) return 'tempete';
  if (e >= S.pluie) return T < REGLES.froid ? 'neige' : e >= S.orage && T > .45 ? 'orage' : 'pluie';
  if (e <= S.sec) return T < REGLES.froid ? 'gel' : T > REGLES.chaud && t > 0 ? 'canicule' : 'clair';
  if (hum >= S.brouillard && t < 0 && e > 0) return 'brouillard';
  return e > 0 ? 'couvert' : 'clair';
}
// ce que le temps fait à la production d'un lieu : la pluie nourrit une terre sèche (et noie un peu une terre gorgée), la chaleur
// une terre froide (et brûle une terre chaude). Linéaire en e et en t, qui sont de moyenne nulle : sur l'année, la moyenne est 1
function productionDe(b, e, t) {
  const P = REGLES.production, ax = b.axes || {}, s = senti(b) * (b.milieu === 'marin' ? .3 : 1);
  const eau = clamp(1.2 - 1.6 * (ax.humidite ?? .5), -.3, 1), chaleur = clamp(1 - 2 * (ax.temperature ?? .5), -1, 1);
  return clamp(1 + s * (P.eau * eau * e + P.chaleur * chaleur * t), P.bornes[0], P.bornes[1]);
}

// un cycle : ce que le moteur appelle, après le climat, le milieu et les natures. ctx : { monde, biomes, n, axes: b → ses axes de saison }
function preparer(ctx) {
  const { monde, biomes, n } = ctx, M = monde.meteo, B = Object.values(biomes), ev = [], graine = ((monde.graine >>> 0) ^ 0x4d6574) >>> 0;
  const calme = n - M.depuis <= 1;   // (le premier cycle après l'éveil : rien ne bouge encore)
  const hier = Object.fromEntries(B.filter(b => b.meteo && typeof b.meteo === 'object').map(b => [b.id, { t: b.meteo.t || 0, e: b.meteo.e || 0 }]));
  const notables = [], tir = {}, degel = {};
  // 1. les écarts du cycle : le souvenir (le sien, celui des voisins) et le tirage
  for (const b of B) {
    if (!aUnTemps(b)) { if (b.meteo && typeof b.meteo === 'object') delete b.meteo; continue; }
    const m = hier[b.id] || { t: 0, e: 0 }, V = (b.voisins || []).map(v => hier[v]).filter(Boolean), k = V.length ? REGLES.voisins : 0;
    const moy = c => (1 - k) * m[c] + (k ? k * V.reduce((s, x) => s + x[c], 0) / V.length : 0);
    // (le tirage d'un lieu est le sien mêlé à ceux de ses voisins : le temps neuf arrive par fronts, non lieu par lieu)
    const ids = [b.id, ...(b.voisins || []).filter(v => biomes[v] && aUnTemps(biomes[v]))], G = calme ? null : ids.map(id => (tir[id] ??= tirage(id, graine, n)));
    const g1 = G ? G.reduce((s, x) => s + x[0], 0) / Math.sqrt(G.length) : 0, g2 = G ? G.reduce((s, x) => s + x[1], 0) / Math.sqrt(G.length) : 0;
    if (REGLES.force && !calme) { b.meteoNv = { t: r4(REGLES.force.t || 0), e: r4(REGLES.force.e || 0) }; continue; }
    b.meteoNv = { t: r4(clamp(REGLES.memoire * moy('t') + REGLES.bruit * g1, -REGLES.borne, REGLES.borne)), e: r4(clamp(REGLES.memoire * moy('e') + REGLES.bruit * g2, -REGLES.borne, REGLES.borne)) };
  }
  // 2. le vent (l'écart d'eau moyen avec les voisins), le temps nommé, la neige, la sécheresse, la production
  for (const b of B) {
    const N = b.meteoNv; if (!N) continue; const avant = b.meteo && typeof b.meteo === 'object' ? b.meteo : {}, s = senti(b);
    const V = (b.voisins || []).map(v => biomes[v]?.meteoNv).filter(Boolean), vent = r3(V.length ? clamp(V.reduce((x, v) => x + Math.abs(v.e - N.e), 0) / V.length / 1.2) : 0);
    const axS = ctx.axes ? ctx.axes(b) : b.axes, T = clamp((axS.temperature ?? .5) + REGLES.axes.temperature * s * N.t), terre = b.milieu !== 'marin' && b.milieu !== 'aquatique';
    const temps = nommer(T, axS.humidite ?? .5, N.e, N.t, vent);
    let neige = avant.neige || 0;
    if (terre) { if (temps === 'neige' || (temps === 'tempete' && T < REGLES.froid)) neige += REGLES.neige.chute * N.e; if (T > REGLES.froid) neige -= REGLES.neige.fonte * (T - REGLES.froid); neige = r3(clamp(neige)); } else neige = 0;
    const sec = terre ? r3(clamp(REGLES.secheresse.memoire * (avant.secheresse || 0) + (1 - REGLES.secheresse.memoire) * -N.e * REGLES.secheresse.force)) : 0;
    const fonte = terre ? Math.max(0, (avant.neige || 0) - neige) : 0, Ex = REGLES.eaux; if (fonte > .05) degel[b.id] = true;
    const eaux = b.milieu !== 'marin' ? r3(clamp(Ex.memoire * (avant.eaux || 0) + (1 - Ex.memoire) * N.e * Ex.force + Ex.fonte * fonte)) : 0;
    const m = { temps, t: N.t, e: N.e, ...(vent >= .05 ? { vent } : {}), ...(neige > 0 ? { neige } : {}), ...(sec > 0 ? { secheresse: sec } : {}), ...(eaux > 0 ? { eaux } : {}), production: r3(productionDe(b, N.e, N.t)) };
    // ce qui se raconte : le temps qui change vers un temps fort, les premières neiges, la sécheresse qui s'installe
    if (!calme) {
      if (['tempete', 'canicule'].includes(temps) && avant.temps !== temps) notables.push([temps === 'tempete' ? 3 + vent : 2 + N.t, b, temps === 'tempete' ? 'une tempête passe' : 'une canicule s\'installe']);
      if (neige > 0 && !(avant.neige > 0)) notables.push([2.5, b, 'les premières neiges tiennent au sol']);
      if (sec >= REGLES.secheresse.seuil && !((avant.secheresse || 0) >= REGLES.secheresse.seuil)) notables.push([3, b, 'le sec dure : une sécheresse s\'installe']);
    }
    b.meteo = m;
  }
  for (const b of B) delete b.meteoNv;
  // (par type de lieu : « une tempête passe sur la Forêt (3 parcelles) », non trois événements)
  const G = new Map();
  for (const [f, b, d] of notables) { const k = typeDe(b) + '|' + d, g = G.get(k); if (g) { g.f = Math.max(g.f, f); g.nb++; } else G.set(k, { f, b, d, nb: 1 }); }
  for (const g of [...G.values()].sort((x, y) => y.f - x.f || (x.b.id < y.b.id ? -1 : 1)).slice(0, REGLES.evenements))
    ev.push({ type: 'meteo', taxon: g.b.id, biome: g.b.id, detail: g.d + (g.nb > 1 ? ` (${g.nb} parcelles)` : '') });
  const de = b => (b.meteo && typeof b.meteo === 'object' ? b.meteo : null);
  return {
    evenements: ev,
    // les axes du cycle : ceux de la saison, déplacés par le temps qu'il fait
    axes: (b, axS) => { const m = de(b); if (!m) return axS; const s = senti(b);
      return { ...axS, temperature: clamp((axS.temperature ?? .5) + REGLES.axes.temperature * s * m.t), ...(axS.humidite != null ? { humidite: clamp(axS.humidite + REGLES.axes.humidite * s * m.e) } : {}) }; },
    production: b => de(b)?.production ?? 1,
    // ce que le temps des cycles passés fait à la chance de chaque catastrophe (1 : un lieu sans temps), et comment le dire
    causes: b => { const m = de(b), K = REGLES.causes; if (!m) return null; const s = Math.min(K.plafond, (m.secheresse || 0) / K.sec), x = Math.min(K.plafond, (m.eaux || 0) / K.eaux);
      return { incendie: s, secheresse: s, crue: x, dit: { incendie: 'après un temps sec', secheresse: 'le sec a trop duré', crue: degel[b.id] ? 'après le dégel' : 'après les pluies' } }; }
  };
}

// --- la vue par biome d'un monde par parcelles : le temps moyen du biome, et son temps le plus répandu ---
function regrouper(L, poids) {
  const M = L.map((p, i) => [p.meteo && typeof p.meteo === 'object' ? p.meteo : null, poids[i] || 1]).filter(([m]) => m); if (!M.length) return null;
  const W = M.reduce((s, [, w]) => s + w, 0) || 1, moy = k => M.reduce((s, [m, w]) => s + (m[k] || 0) * w, 0) / W, T = {};
  for (const [m, w] of M) T[m.temps] = (T[m.temps] || 0) + w;
  const temps = Object.keys(T).sort((a, b) => T[b] - T[a] || (a < b ? -1 : 1))[0], x = { temps, t: r4(moy('t')), e: r4(moy('e')), production: r3(moy('production') || 1) };
  for (const k of ['vent', 'neige', 'secheresse', 'eaux']) { const v = r3(moy(k)); if (v > 0) x[k] = v; }
  if (Object.keys(T).length > 1) x.temps_parts = Object.fromEntries(Object.keys(T).sort().map(k => [k, r3(T[k] / W)]));
  return x;
}

const API = { REGLES, NOMS, eveiller, preparer, regrouper, nommer, productionDe, aUnTemps, tirage };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneMeteo = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
