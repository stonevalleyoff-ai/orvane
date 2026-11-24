// Orvane — LE PLAN D'UNE LIGNÉE, SES LIEUX, SON CALENDRIER (moteur/noyau/plan.js) — docs/59
// Des fonctions pures, sans le contexte d'un monde : le plan corporel d'un phénotype et ce que ses traits coûtent, la mortalité,
// la place qu'un taxon trouve parmi ceux de sa taille (la bande de masse), les milieux d'un lieu (l'eau douce ou salée, la
// terre, les rives), la fenêtre d'une saison dans l'année et la photopériode d'une latitude ; un cache des photopériodes, par
// latitude, est tout ce qu'il garde.
'use strict';
(function (racine) {
  const { clamp } = typeof require === 'function' ? require('./outils.js') : racine.OrvaneOutils;
  const CALEN = typeof require === 'function' ? require('../calendrier.js') : racine.OrvaneCalendrier;   // le calendrier d'un monde réel (moteur/calendrier.js), pour la photopériode
  // les noms des saisons (la phase de l'année : 0, plein hiver ; 0,5, plein été)
  const SAISONS = ['hiver', 'printemps', 'été', 'automne'];
  const PART_K = { herbivore: 1, omnivore: 1, detritivore: .3, filtreur: .3, carnivore: 0, synthetique: 0 };   // ce que chaque régime pèse sur la capacité du biome (l'omnivore : moins s'il trouve des proies)
  const facteur = (traits, cat, k) => traits.reduce((f, id) => f * (cat[id]?.[k] ?? 1), 1);
  // la place qu'un taxon trouve dans un biome : les autres l'encombrent d'autant plus qu'ils ont sa taille (une bête de
  // 5 kg et une de 60 kg ne broutent pas la même chose) — recouvrement gaussien sur le logarithme des masses
  // Les ressources d'un biome s'étalent sur quatre décades de masse (0,1 kg à 1 t) ; une espèce n'en exploite qu'une bande
  // (écart-type 0,35 décade : une bête de 5 kg et une de 15 kg ne se gênent qu'à moitié, 5 kg et 60 kg presque pas) :
  // sa capacité propre est cette part de la capacité du biome, et la somme de toutes reste bornée par K.
  const SIGMA_BANDE = .35;
  const recouvrement = (m1, m2) => { const d = Math.log10(m1 / m2); return Math.exp(-(d * d) / (2 * SIGMA_BANDE * SIGMA_BANDE)); };
  const charge = (liste, masse) => liste.reduce((s, e) => s + e.biomasse * recouvrement(masse, e.masse), 0);
  const BANDE = Math.sqrt(2 * Math.PI) * SIGMA_BANDE / 4;   // ≈ 0,22 : la largeur d'une bande rapportée au spectre entier

  // --- le plan corporel d'un phénotype : plan de base × écarts de ses traits ---
  function planDe(plan, traits, cat) {
    const p = { ...plan };
    for (const id of traits) { const t = cat[id]; if (!t) continue;
      for (const k in t.ecarts || {}) if (typeof p[k] === 'number') p[k] *= t.ecarts[k];
      Object.assign(p, t.fixe || {}); }
    for (const k of ['sociabilite', 'temperament', 'perception']) if (typeof p[k] === 'number') p[k] = clamp(p[k], 0, 1);
    return p;
  }
  const coutDe = (traits, cat) => clamp(traits.reduce((s, id) => s + (cat[id]?.cout || 0), 0), 0, .95);
  const ecartsDe = (traits, cat) => { const e = {}; for (const id of traits) for (const k in cat[id]?.ecarts || {}) e[k] = (e[k] ?? 1) * cat[id].ecarts[k]; return e; };
  const mortalite = p => 1 / Math.max(2, p.longevite || 20);
  const CHAROGNE = { id: '(les morts du lieu)', plan: { regime: 'vegetal', masse_kg: 1 } };   // (docs/52 : une proie de plus, qu'on ne tue pas)
  // L'eau : un nageur vit en eau douce (plan.eau absent, ou 'douce'), en mer ('salee'), ou dans les deux ('mixte', comme
  // les poissons qui remontent les fleuves) ; une côte, une mangrove, un estuaire (amphibie) accueillent tous les nageurs.
  const eauDouce = plan => plan.eau !== 'salee', eauSalee = plan => plan.eau === 'salee' || plan.eau === 'mixte';
  const lieuType = id => String(id ?? '').split('~')[0];
  // (docs/52) deux lieux d'un même milieu, pour qui essaime : la terre et la terre, l'eau et l'eau ; les rives (amphibie) touchent les deux
  const memeMilieu = b => v => v.milieu === b.milieu || v.milieu === 'amphibie' || b.milieu === 'amphibie';
  // trop de variantes : le plan de base et les plus fréquentes restent ; chacune des autres rejoint la gardée la plus proche (le moins
  // de traits en plus ou en moins ; à égalité, la première gardée), avec sa fréquence, partout où elle vit
  function plafonner(t, max) {
    const P = t.phenotypes; if (P.length <= max) return;
    const tri = P.map((p, i) => i).slice(1).sort((x, y) => (P[y].frequence || 0) - (P[x].frequence || 0) || x - y), gardes = [0, ...tri.slice(0, max - 1)];
    const TS = P.map(p => new Set(p.traits)), ecart = (a, b) => { let d = 0; for (const x of TS[a]) if (!TS[b].has(x)) d++; for (const x of TS[b]) if (!TS[a].has(x)) d++; return d; };
    for (const i of tri.slice(max - 1)) { let j = 0, dj = Infinity; for (const g of gardes) { const d = ecart(i, g); if (d < dj) { dj = d; j = g; } }
      const a = P[i], b = P[j]; b.frequence = +((b.frequence || 0) + (a.frequence || 0)).toFixed(6);
      if (a.frequence_par_biome) { b.frequence_par_biome ??= {}; for (const k in a.frequence_par_biome) b.frequence_par_biome[k] = +((b.frequence_par_biome[k] || 0) + a.frequence_par_biome[k]).toFixed(6); } }
    const g = new Set(gardes); t.phenotypes = P.filter((p, i) => g.has(i));
  }
  // (docs/53) le jour de l'année (0 : le 1er janvier) où, à une latitude, les jours passent sous P.depart heures après l'été, et celui où ils
  // repassent au-dessus de P.retour heures après l'hiver ; gardés une fois pour toutes (au demi-degré)
  const PHOTO = new Map();
  function photoperiode(lat, P) { const cle = `${Math.round(lat * 2) / 2}|${P.depart}|${P.retour}`; if (PHOTO.has(cle)) return PHOTO.get(cle);
    const L = d => CALEN.dureeJour(Math.round(lat * 2) / 2, Date.UTC(2027, 0, 1 + d, 12)); let dep = null, ret = null;
    for (let d = 172; d < 365 && dep == null; d++) if (L(d) < P.depart) dep = d;
    for (let d = 0; d < 172 && ret == null; d++) if (L(d) >= P.retour) ret = d;
    const v = dep != null && ret != null && ret < dep ? { dep, ret } : null; PHOTO.set(cle, v); return v; }
  // une fenêtre de l'année, en cycles : null hors d'elle ; sinon { long, rang, reste } (reste : les cycles qu'il y reste, celui-ci compris)
  function fenetreDe(k, A, [a, b]) {
    const d0 = Math.ceil(a * A - 1e-9), d1 = Math.ceil(b * A - 1e-9), long = ((d1 - d0) % A + A) % A, rang = ((k - d0) % A + A) % A;
    return rang < long ? { long, rang, reste: long - rang } : null;
  }
  const biomasse = (plans, N) => N.reduce((s, n, i) => s + n * (plans[i].masse_kg || 1), 0);
  const API = { SAISONS, PART_K, facteur, SIGMA_BANDE, recouvrement, charge, BANDE, planDe, coutDe, ecartsDe, mortalite, CHAROGNE, eauDouce, eauSalee, lieuType, memeMilieu, plafonner, photoperiode, fenetreDe, biomasse };
  if (typeof module === 'object' && module.exports) module.exports = API; else racine.OrvanePlan = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
