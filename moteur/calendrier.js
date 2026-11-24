// Orvane — LE CALENDRIER (moteur/calendrier.js) — docs/52
// Un monde réel (la Terre, une région de la Terre) vit au jour : un cycle est un jour, l'année a ses 365 jours (366 les années
// bissextiles), et chaque lieu a SA saison, celle de son climat : l'hiver de Laponie n'est pas celui de l'Andalousie, l'été
// austral tombe en janvier. Ce fichier ne fait que des calculs, sans état ni hasard :
//  - le soleil : la déclinaison, l'équation du temps, la durée du jour, le lever et le coucher (en UTC), l'heure solaire,
//    l'ensoleillement au sommet de l'atmosphère (MJ/m²/jour) ; la nuit polaire et le soleil de minuit ;
//  - la lune : sa phase (0 nouvelle, 0,5 pleine), la part éclairée, son nom ;
//  - la saison d'un lieu : la phase de son année (0 : le cœur de son hiver, 0,5 : le cœur de son été), tirée de ses normales
//    mensuelles (lieu.normales : 12 températures, 12 pluies, 12 évapotranspirations) ou, à défaut, de sa latitude ; ses axes du
//    jour (la température suit la vraie courbe de l'année, l'humidité les pluies des derniers mois, la lumière l'ensoleillement)
//    et sa production du jour (ce qui pousse : le froid et le sec la retiennent ; de moyenne 1 sur l'année) ;
//  - les passages du climat aux axes d'Orvane (température, humidité, altitude, lumière : de 0 à 1), et la production primaire
//    (le modèle de Miami), dont un import (outils/terre/) se sert pour fabriquer les lieux ;
//  - le pas de temps : un monde au jour dit monde.temps = { jours: 1 } ; le moteur avait été réglé sur une « tranche de vie »
//    d'environ 120 jours (une bête de 60 kg y vit 30 cycles, mûrit en 5) ; pas = jours / 120 met ses constantes à l'échelle.
// Les durées d'un plan (longevite, maturite) restent en cycles, donc en jours dans un monde au jour : un cerf y vit ~5 500 cycles.
// Tout est arrondi au millionième : deux moteurs JavaScript qui ne calculent pas un cosinus au dernier bit près donnent le même
// monde. Node (require) ou navigateur (globalThis.OrvaneCalendrier). Zéro dépendance.
'use strict';
(function (racine) {
const RAD = Math.PI / 180, JOUR = 864e5;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), r6 = v => Math.round(v * 1e6) / 1e6, r4 = v => Math.round(v * 1e4) / 1e4;
const frac = v => ((v % 1) + 1) % 1;
const REGLES = {
  reference: 120,            // les jours d'un cycle de référence, celui sur lequel le moteur a été réglé
  hiver: .055,               // sans normales : le cœur de l'hiver thermique, en fraction de l'année (vers le 20 janvier ; +0,5 au sud)
  // la température (°C) → l'axe : une courbe monotone, par points (étalonnée sur les biomes universels : la taïga ~ −7 °C → 0,25,
  // la forêt tempérée 9 °C → 0,5, le maquis 17 °C → 0,7)
  temperature: [[-40, 0], [-25, .02], [9, .5], [28, .95], [34, 1]],
  humidite: .6,              // l'humidité : IA / (IA + 0,6), IA = pluie / évapotranspiration (le désert 0,05, la steppe 0,25, la forêt 0,65)
  altitude: 6000,            // l'altitude : √(m / 6000)
  lumiere: { base: .45, soleil: .55, couvert: .55, saison: .2 },   // la lumière : (base + soleil × ensoleillement relatif) × (1 − couvert × part) ; ± saison × l'écart du jour
  saison_humidite: .5,       // la part de l'écart d'humidité des derniers mois que sentent les axes du jour
  production: { ampleur: .45, bornes: [.3, 1.7], gel: 0, plein: 18, eau: 1.6 },   // ce qui pousse : rien sous 0 °C, tout au-dessus de 18 °C, et selon l'eau
  saison_pleine: .15         // l'amplitude de l'axe de température d'un lieu aux saisons entières (celle des biomes d'Orvane)
};
const SAISONS = ['hiver', 'printemps', 'été', 'automne'];
const nomSaison = phase => SAISONS[Math.floor(((phase + .125) % 1) * 4)];

// (docs/59) les règles d'un monde, sans toucher à celles du module : tout ce qui les lit est lié à des règles (lier). Le module se lie aux
// siennes ; un monde qui règle ce mécanisme (regles.calendrier), ou un cycle (opt.regles), en prend une instance (avec : les règles du module
// complétées des siennes d'un niveau)
const unNiveau = (R, o) => { const X = { ...R }; if (o && typeof o === 'object') for (const k in o) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
  const v = o[k], b = R[k]; X[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...v } : v; } return X; };
function lier(REGLES) {
  // --- le pas de temps ---
  const pasDe = monde => { const T = monde?.temps; return T && T.jours > 0 ? T.jours / (T.reference || REGLES.reference) : 1; };

  // --- la date ---
  const bissextile = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const longueurAn = y => bissextile(y) ? 366 : 365;
  const jourIso = t => new Date(t).toISOString().slice(0, 10);
  const jourAn = t => { const d = new Date(t); return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / JOUR) + 1; };
  // la fraction de l'année au midi (UTC) de ce jour : 0 le 1er janvier à minuit
  const fractionAn = t => (jourAn(t) - .5) / longueurAn(new Date(t).getUTCFullYear());

  // --- le soleil (Spencer 1971, au midi UTC du jour ; à quelques minutes près) ---
  const gamma = t => 2 * Math.PI * (jourAn(t) - 1) / longueurAn(new Date(t).getUTCFullYear());
  function declinaison(t) { const g = gamma(t);
    return .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g); }   // (radians)
  function equationTemps(t) { const g = gamma(t);
    return 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g)); }   // (minutes)
  // l'angle horaire du coucher (radians) pour une hauteur h0 : 0, nuit polaire ; π, soleil de minuit
  const angleCoucher = (lat, de, h0) => { const p = lat * RAD, c = (Math.sin(h0) - Math.sin(p) * Math.sin(de)) / (Math.cos(p) * Math.cos(de)); return c >= 1 ? 0 : c <= -1 ? Math.PI : Math.acos(c); };
  // la durée du jour (heures), avec la réfraction et le demi-disque (−0,833°)
  const dureeJour = (lat, t) => r4(2 * angleCoucher(lat, declinaison(t), -.833 * RAD) / RAD / 15);
  // l'ensoleillement au sommet de l'atmosphère (MJ/m²/jour, FAO-56)
  function insolation(lat, t) {
    const p = lat * RAD, de = declinaison(t), ws = angleCoucher(lat, de, 0), dr = 1 + .033 * Math.cos(gamma(t));
    return r6(Math.max(0, 24 * 60 / Math.PI * .082 * dr * (ws * Math.sin(p) * Math.sin(de) + Math.cos(p) * Math.cos(de) * Math.sin(ws))));
  }
  // sa moyenne sur l'année, à une latitude (douze milieux de mois)
  const MOIS = Array.from({ length: 12 }, (_, m) => Date.UTC(2001, m, 15, 12));
  const insolationAn = lat => MOIS.reduce((s, t) => s + insolation(lat, t), 0) / 12;
  const hm = h => { const m = Math.round(frac(h / 24) * 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // le soleil d'un lieu, ce jour : la durée du jour, le midi, le lever et le coucher en UTC (« HH:MM ») ; null quand il ne se lève
  // pas (nuit polaire) ou ne se couche pas (soleil de minuit)
  function soleil(lat, lon, t) {
    const d = dureeJour(lat, t), midi = 12 - lon / 15 - equationTemps(t) / 60, o = { jour_h: +d.toFixed(2), midi_utc: hm(midi) };
    if (d <= 0) return { ...o, nuit_polaire: true };
    if (d >= 24) return { ...o, soleil_de_minuit: true };
    return { ...o, lever_utc: hm(midi - d / 2), coucher_utc: hm(midi + d / 2) };
  }
  // l'heure solaire vraie (heures) à l'instant t (UTC), à une longitude (degrés est)
  const heureSolaire = (lon, t) => { const d = new Date(t); return r4(frac((d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + 4 * lon + equationTemps(t)) / 1440) * 24); };

  // --- la lune (lunaison moyenne, à une demi-journée près) ---
  const NOMS_LUNE = ['nouvelle lune', 'premier croissant', 'premier quartier', 'lune gibbeuse croissante', 'pleine lune', 'lune gibbeuse décroissante', 'dernier quartier', 'dernier croissant'];
  function lune(t) {
    const phase = frac((t - Date.UTC(2000, 0, 6, 18, 14)) / JOUR / 29.530588853);
    return { phase: +phase.toFixed(4), eclairee: +((1 - Math.cos(2 * Math.PI * phase)) / 2).toFixed(3), nom: NOMS_LUNE[Math.floor(frac(phase + 1 / 16) * 8)] };
  }

  // --- les normales mensuelles : deux harmoniques (une courbe lisse qui passe près des douze valeurs, au milieu de chaque mois) ---
  function harmoniques(v) {
    if (!Array.isArray(v) || v.length !== 12 || v.some(x => !Number.isFinite(+x))) return null;
    const H = [0, 0, 0, 0, 0];
    v.forEach((x, m) => { const a = 2 * Math.PI * (m + .5) / 12; H[0] += x / 12; H[1] += x * Math.cos(a) / 6; H[2] += x * Math.sin(a) / 6; H[3] += x * Math.cos(2 * a) / 6; H[4] += x * Math.sin(2 * a) / 6; });
    return H;
  }
  const valeur = (H, f) => { const a = 2 * Math.PI * f; return H[0] + H[1] * Math.cos(a) + H[2] * Math.sin(a) + H[3] * Math.cos(2 * a) + H[4] * Math.sin(2 * a); };

  // --- du climat aux axes ---
  function axeTemperature(T) { const P = REGLES.temperature; if (!Number.isFinite(T)) return .5; if (T <= P[0][0]) return P[0][1];
    for (let k = 1; k < P.length; k++) if (T <= P[k][0]) { const [x0, y0] = P[k - 1], [x1, y1] = P[k]; return r6(y0 + (y1 - y0) * (T - x0) / (x1 - x0)); }
    return P[P.length - 1][1]; }
  const axeHumidite = (P, E) => { const ia = E > 0 ? Math.max(0, P) / E : P > 0 ? 9 : 0; return r6(ia / (ia + REGLES.humidite)); };
  const axeAltitude = m => r6(clamp(Math.sqrt(Math.max(0, +m || 0) / REGLES.altitude)));
  // la lumière moyenne d'un lieu : l'ensoleillement de sa latitude, rapporté à celui de 35°, et l'ombre de son couvert
  const axeLumiere = (lat, couvert) => { const L = REGLES.lumiere; return r6(clamp((L.base + L.soleil * insolationAn(lat) / insolationAn(35)) * (1 - L.couvert * clamp(+couvert || 0)))); };
  // l'évapotranspiration potentielle de Thornthwaite (mm/mois), quand les normales ne la donnent pas
  function etpThornthwaite(t, lat) {
    const I = t.reduce((s, x) => s + (x > 0 ? Math.pow(x / 5, 1.514) : 0), 0); if (!(I > 0)) return t.map(() => 0);
    const a = 6.75e-7 * I ** 3 - 7.71e-5 * I ** 2 + 1.792e-2 * I + .49239, J = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return t.map((x, m) => x > 0 ? r6(16 * (dureeJour(lat, MOIS[m]) / 12) * (J[m] / 30) * Math.pow(10 * x / I, a)) : 0);
  }
  // la production primaire nette (g de matière sèche / m² / an) : le modèle de Miami (Lieth 1975), la chaleur ou l'eau, la plus rare
  const npp = (T, P) => r6(Math.min(3000 / (1 + Math.exp(1.315 - .119 * T)), 3000 * (1 - Math.exp(-.000664 * Math.max(0, P)))));

  // --- la saison d'un lieu, un jour ---
  // la phase de son année (0 : le cœur de son hiver) : le creux de la première harmonique de ses températures ; sans normales, sa latitude
  function phaseLieu(b, t, H) {
    const f = fractionAn(t), Ht = H || harmoniques(b?.normales?.t);
    if (Ht && Math.hypot(Ht[1], Ht[2]) >= .3) return r6(frac(f - (Math.atan2(Ht[2], Ht[1]) / (2 * Math.PI) + .5)));
    const lat = b?.lieu?.lat; if (!Number.isFinite(lat)) return null;
    return r6(frac(f - REGLES.hiver - (lat < 0 ? .5 : 0)));
  }
  // la phase de l'année d'un hémisphère tempéré, sans lieu (le nom de la saison du monde : celle du nord, ou du sud)
  const phaseReference = (t, sud) => r6(frac(fractionAn(t) - REGLES.hiver - (sud ? .5 : 0)));
  // ce qui pousse un mois : la chaleur (0 sous gel, 1 au-dessus de plein) × l'eau (la pluie rapportée à ce que l'air prend)
  // (le sol garde de l'eau : une pluie de 60 % de ce que l'air prend suffit à tout faire pousser)
  const pousseDe = (T, P, E) => { const R = REGLES.production, c = clamp((T - R.gel) / (R.plein - R.gel)), w = E > 0 ? clamp(R.eau * Math.max(0, P) / E) : P > 0 ? 1 : .5; return c * (.25 + .75 * w); };
  // La saison d'un lieu ce jour : { phase, nom, force } ; et, s'il a ses normales (lieu.normales), ses axes du jour et sa production du
  // jour (sans normales, le moteur prend les siens, à la phase du lieu). ax : les axes de l'année du lieu (b.axes)
  function saisonLieu(b, t) {
    const C = b?.normales, Ht = harmoniques(C?.t), phase = phaseLieu(b, t, Ht); if (phase == null) return null;
    const o = { phase, nom: nomSaison(phase) }; if (!Ht) return o;
    const f = fractionAn(t), ax = { ...(b.axes || {}) }, eau = b.milieu === 'aquatique' || b.milieu === 'marin';
    const Td = valeur(Ht, f), T0 = Ht[0], amp = (axeTemperature(T0 + Math.hypot(Ht[1], Ht[2])) - axeTemperature(T0 - Math.hypot(Ht[1], Ht[2]))) / 2;
    if (Number.isFinite(ax.temperature)) ax.temperature = r6(clamp(ax.temperature + axeTemperature(Td) - axeTemperature(T0)));
    const lat = b.lieu?.lat, Hp = harmoniques(C.p), E = C.etp && C.etp.length === 12 ? C.etp : Number.isFinite(lat) ? etpThornthwaite(C.t, lat) : null, He = harmoniques(E);
    // l'humidité suit les pluies du mois écoulé (un demi-mois de retard : le sol garde l'eau)
    if (!eau && Hp && He && Number.isFinite(ax.humidite)) { const g = f - 1 / 24;
      ax.humidite = r6(clamp(ax.humidite + REGLES.saison_humidite * (axeHumidite(valeur(Hp, g), valeur(He, g)) - axeHumidite(Hp[0], He[0])))); }
    // la lumière suit l'ensoleillement du jour (rien sous la mer sans lumière)
    if (Number.isFinite(lat) && Number.isFinite(ax.lumiere) && ax.lumiere >= .05) { const m = insolationAn(lat);
      if (m > 0) ax.lumiere = r6(clamp(ax.lumiere + REGLES.lumiere.saison * (insolation(lat, t) / m - 1))); }
    // la production du jour : ce qui pousse ce jour, rapporté à ce qui pousse en moyenne dans l'année ; en mer, la lumière et la chaleur
    const R = REGLES.production; let g = 1;
    if (eau) { if (Number.isFinite(lat)) { const m = insolationAn(lat); g = m > 0 ? insolation(lat, t) / m : 1; } }
    else if (Hp && He) { const moy = C.t.reduce((s, x, k) => s + pousseDe(+x, +C.p[k], +E[k]), 0) / 12;
      g = moy > 1e-6 ? pousseDe(Td, valeur(Hp, f), valeur(He, f)) / moy : 1; }
    o.axes = ax; o.production = r6(clamp(1 + R.ampleur * (g - 1), R.bornes[0], R.bornes[1])); o.force = r4(clamp(amp / REGLES.saison_pleine));
    return o;
  }
  // la date (ms, à midi UTC) où la phase d'un lieu vaut ph, dans l'année de t : ce que le moteur lit pour l'hiver et l'été d'un lieu
  function dateDeLaPhase(b, ph, t) {
    const Ht = harmoniques(b?.normales?.t), y = new Date(t).getUTCFullYear(), L = longueurAn(y);
    const f0 = Ht && Math.hypot(Ht[1], Ht[2]) >= .3 ? Math.atan2(Ht[2], Ht[1]) / (2 * Math.PI) + .5 : REGLES.hiver + ((b?.lieu?.lat ?? 0) < 0 ? .5 : 0);
    return Date.UTC(y, 0, 1, 12) + Math.floor(frac(f0 + ph) * L) * JOUR;
  }
  return { REGLES, pasDe, bissextile, longueurAn, jourIso, jourAn, fractionAn, declinaison, equationTemps, dureeJour, insolation, insolationAn, soleil, heureSolaire, lune, harmoniques, valeur, axeTemperature, axeHumidite, axeAltitude, axeLumiere, etpThornthwaite, npp, phaseLieu, phaseReference, saisonLieu, dateDeLaPhase };
}
const { pasDe, bissextile, longueurAn, jourIso, jourAn, fractionAn, declinaison, equationTemps, dureeJour, insolation, insolationAn, soleil, heureSolaire, lune, harmoniques, valeur, axeTemperature, axeHumidite, axeAltitude, axeLumiere, etpThornthwaite, npp, phaseLieu, phaseReference, saisonLieu, dateDeLaPhase } = lier(REGLES);   // (le module, lié à ses règles)
const avec = (o, d = {}) => ({ ...API, ...lier(unNiveau(REGLES, o)) });   // (docs/59) une instance aux règles d'un monde

const API = { REGLES, pasDe, bissextile, longueurAn, jourIso, jourAn, fractionAn, declinaison, equationTemps, dureeJour, insolation, insolationAn, soleil, heureSolaire, lune,
  harmoniques, valeur, axeTemperature, axeHumidite, axeAltitude, axeLumiere, etpThornthwaite, npp, phaseLieu, phaseReference, saisonLieu, dateDeLaPhase, nomSaison, avec };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneCalendrier = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
