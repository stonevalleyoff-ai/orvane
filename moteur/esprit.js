// Orvane — L'ESPRIT : APPRENDRE, TRANSMETTRE, DES OUTILS (moteur/esprit.js) — docs/34
// Jusqu'ici, tout ce qu'une bête savait faire lui venait de ses gènes : il fallait des générations pour qu'un trait se répande.
// Dans un monde à l'esprit éveillé, les bêtes apprennent. Un savoir naît chez quelques bêtes d'une population, se répand par
// imitation en quelques cycles, se transmet aux petits, voyage avec les migrants, et se perd quand la population s'effondre :
//  - un savoir est local : la population de la forêt sait casser des noix avec une pierre, celle de la savane non (une tradition) ;
//  - il naît d'une bête qui peut l'apprendre (des mains pour tenir une pierre, une meute pour chasser ensemble), là où il sert ;
//  - ce qu'il rapporte : plus de nourriture, une chasse meilleure, moins de pertes, à proportion de ceux qui le savent ;
//  - qui apprend : la capacité d'une lignée vient de sa sociabilité, de ses sens, de ses mains ; la curiosité (un trait, qui naît
//    par mutation) fait apprendre plus vite et mieux : là où savoir paie, la sélection fait les esprits (gènes et culture ensemble).
// Chaque population publie ce qu'elle sait (populations[].savoirs : la part de ses bêtes qui le savent) ; le catalogue dit chaque
// savoir (catalogue.savoirs : son nom, son geste, son outil) pour qu'un jeu montre la bête qui casse ses noix. Un monde sans esprit
// n'en voit rien ; son hasard est le sien. Déterministe. Node (require) ou navigateur (globalThis.OrvaneEsprit).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), r4 = v => +(+v).toFixed(4);
const REGLES = { invention: .01, depart: .02, imitation: .25, oubli: .01, petite: 30, perte_petite: .3, migrants: .5, seuil: .005, curiosite: 1.5, autres: .85 };
const TRAITS = {
  curiosite: { domaine: 'social', organe: 'un esprit curieux', cout: .04,
    effet: 'apprend plus vite, et plus souvent, ce que savent les siens : ses savoirs lui rapportent davantage',
    conduite: { type: 'perception-proche', presage: 'elle observe longuement ce que font les autres' } }
};
const loco = p => p.locomotion || [], mains = p => !!p.corps?.organes?.some(o => o.type === 'mains'), chair = p => p.diete ? (p.diete.insectes || 0) + (p.diete.viande || 0) + (p.diete.sang || 0) : p.regime === 'carnivore' ? 1 : p.regime === 'omnivore' ? .3 : 0;
const plante = p => p.regime === 'herbivore' || p.regime === 'omnivore';
// LES SAVOIRS : qui peut l'apprendre, où il sert, ce qu'il fait (k : à tous et en plein lieu) ; son geste, son outil (pour un jeu)
const SAVOIRS = {
  'casser-noix':  { nom: 'casser des noix avec une pierre', geste: 'casser', outil: 'pierre', peut: p => plante(p) && (mains(p) || p.corps?.forme === 'oiseau') && (p.masse_kg || 1) >= .1, ou: b => clamp((b.axes?.couvert ?? 0) * 1.5), place: .15,
                    presage: 'des coques brisées sur une pierre plate' },
  'pecher-insectes': { nom: 'pêcher des insectes avec une brindille', geste: 'pecher', outil: 'brindille', peut: p => mains(p) && chair(p) > 0, ou: b => clamp((b.axes?.couvert ?? 0) * 1.3), chasse: .25,
                    presage: 'une brindille plongée dans une termitière' },
  'chasse-concertee': { nom: 'chasser ensemble', geste: 'encercler', peut: p => p.regime === 'carnivore' && (p.sociabilite ?? 0) >= .5, ou: b => clamp(1.2 - (b.axes?.couvert ?? 0)), chasse: .3,
                    presage: 'ils s\'écartent en arc de cercle avant de charger' },
  'cris-precis':  { nom: 'un cri pour chaque prédateur', geste: 'alerter', peut: p => (p.sociabilite ?? 0) >= .5 && (p.perception ?? .5) >= .4, ou: () => 1, vuln: -.2,
                    presage: 'des cris différents selon ce qui approche' },
  'reserves':     { nom: 'cacher des réserves pour l\'hiver', geste: 'cacher', peut: p => plante(p) && (p.masse_kg || 1) <= 5 && loco(p).some(l => ['fouissage', 'grimpe', 'vol'].includes(l)), ou: b => b.saisons === false ? 0 : clamp((.6 - (b.axes?.temperature ?? .5)) * 2.5), place: .12,
                    presage: 'elle enterre des graines, une à une' },
  'laver':        { nom: 'laver sa nourriture', geste: 'laver', peut: p => plante(p) && (mains(p) || loco(p).includes('nage')), ou: b => clamp(((b.axes?.humidite ?? 0) - .4) * 2.5), place: .06, vuln: -.05,
                    presage: 'elle trempe ce qu\'elle mange avant d\'y goûter' },
  'routes':       { nom: 'se souvenir des routes des saisons', geste: 'migrer', peut: p => (p.masse_kg || 1) >= 5 && (p.sociabilite ?? 0) >= .4 && loco(p).some(l => ['marche', 'course', 'vol'].includes(l)), ou: b => b.saisons === false ? .2 : 1, place: .1,
                    presage: 'les vieilles mènent le troupeau, toujours par le même col' },
  'nids-tisses':  { nom: 'tisser des nids', geste: 'tisser', outil: 'brindilles', peut: p => loco(p).includes('vol') && (p.masse_kg || 1) <= 1, ou: b => clamp((b.axes?.couvert ?? 0) * 2), vuln: -.12,
                    presage: 'des nids suspendus, tissés de fibres' }
};
// la capacité d'une lignée à apprendre : sa sociabilité, ses sens, ses mains (ou un bec d'oiseau), sa taille
const capacite = p => clamp(.1 + .35 * (p.sociabilite ?? 0) + .25 * (p.perception ?? .5) + (mains(p) ? .25 : p.corps?.forme === 'oiseau' ? .1 : 0) + ((p.masse_kg || 1) >= 1 ? .08 : 0) - ((p.masse_kg || 1) < .01 ? .2 : 0));
const hacher = (s, n) => { let g = 2166136261 >>> 0; for (const c of String(s)) g = Math.imul(g ^ c.charCodeAt(0), 16777619) >>> 0; g = Math.imul(g ^ (n + 1), 2654435761) >>> 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };

function eveiller(inst) { const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.esprit) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, esprit: { depuis: out.cycle?.n ?? 0 } };
  const n = out.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique' && Object.values(SAVOIRS).some(S => S.peut(t.plan))).length;
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => t.plan?.regime !== 'vegetal')?.id, detail: `l'esprit s'éveille : ${n} lignées pourraient apprendre, transmettre, se servir d'outils` }] }; }

// --- le cycle : ce que pèsent les savoirs de chaque population, phénotype par phénotype (les curieux en profitent plus) ---
function preparer(ctx) {
  const { taxons, biomes } = ctx, P = new Map();
  for (const t of taxons) for (const p of t.populations || []) if (p.savoirs && Object.keys(p.savoirs).length) P.set(t.id + '|' + p.biome, p.savoirs);
  if (!P.size) return null;
  const cache = new Map();
  const facteur = (t, bid, i, k) => { const s = P.get(t.id + '|' + bid); if (!s) return 1; const c = t.id + '|' + bid + '|' + i + '|' + k; if (cache.has(c)) return cache.get(c);
    const w = t.phenotypes[i]?.traits?.includes('curiosite') ? REGLES.curiosite : REGLES.autres, b = biomes[bid]; let f = 1;
    for (const [id, q] of Object.entries(s)) { const S = SAVOIRS[id], v = S?.[k]; if (!v) continue; f *= 1 + v * Math.min(1, q * w) * S.ou(b || {}); }
    if (k === 'place') f = 1 / f;   // (plus de nourriture : moins d'entassement)
    cache.set(c, f); return f; };
  // ce que la population atteint : une chasse concertée, une brindille, mettent plus de proies à sa portée (à proportion de ceux qui savent)
  const acces = (t, bid) => { const s = P.get(t.id + '|' + bid); if (!s) return 1; const c = t.id + '|' + bid + '|acces'; if (cache.has(c)) return cache.get(c); const b = biomes[bid];
    let f = 1; for (const [id, q] of Object.entries(s)) { const S = SAVOIRS[id]; if (S?.chasse) f *= 1 + S.chasse * q * S.ou(b || {}); } cache.set(c, f); return f; };
  // (la chasse d'un phénotype : ce qu'il en tire de plus que les siens, les curieux surtout ; celle de la population : acces)
  return { chasse: (t, bid, i) => facteur(t, bid, i, 'chasse'), vuln: (t, bid, i) => facteur(t, bid, i, 'vuln'), place: (t, bid, i) => facteur(t, bid, i, 'place'), acces };
}

// --- après le cycle : les savoirs naissent, se répandent, voyagent avec les migrants, se perdent ---
function apres(ctx) {
  const { avant, sortie, biomes, n } = ctx, ev = [], A = new Map();
  for (const t of avant) for (const p of t.populations || []) if (p.savoirs) A.set(t.id + '|' + p.biome, p.savoirs);
  const parLignee = id => { const L = avant.find(t => t.id === id); if (!L) return {}; let N = 0; const m = {};
    for (const p of L.populations || []) { N += p.effectif; for (const [k, q] of Object.entries(p.savoirs || {})) m[k] = (m[k] || 0) + q * p.effectif; }
    for (const k in m) m[k] /= N || 1; return m; };
  for (const t of sortie) { if (t.eteint || ['vegetal', 'synthetique'].includes(t.plan?.regime)) continue;
    const a0 = capacite(t.plan), cur = t.phenotypes.reduce((x, p) => x + (p.traits.includes('curiosite') ? p.frequence || 0 : 0), 0), a = clamp(a0 * (1 + (REGLES.curiosite - 1) * cur)), moy = parLignee(t.id);
    for (const p of t.populations) {
      let s = A.get(t.id + '|' + p.biome); const N = p.effectif;
      // une population nouvelle : ce qu'apportent ses premiers migrants (la moitié de ce que sait la lignée), ou sa mère (une séparation)
      if (!s) { const mere = t.parent && t.apparu === n ? A.get(t.parent + '|' + p.biome) : null; s = mere ? { ...mere } : Object.fromEntries(Object.entries(moy).map(([k, q]) => [k, q * REGLES.migrants]).filter(([, q]) => q >= REGLES.seuil)); }
      else s = { ...s };
      // les migrants mêlent ce que savent les populations de la lignée
      const m = Math.min(.2, p.flux || 0); if (m > 0) for (const k of new Set([...Object.keys(s), ...Object.keys(moy)])) s[k] = (1 - m) * (s[k] || 0) + m * (moy[k] || 0);
      const b = biomes[p.biome] || {};
      for (const k of Object.keys(s)) { const S = SAVOIRS[k], q = s[k], c = S ? S.ou(b) : 0;
        // l'imitation (là où il sert, il se répand), l'oubli (d'autant plus vite que la population est petite, ou qu'il ne sert à rien)
        const oubli = REGLES.oubli + REGLES.perte_petite * Math.exp(-N / REGLES.petite) + (c < .1 ? .05 : 0);
        s[k] = q + REGLES.imitation * a * c * q * (1 - q) - oubli * q; if (!(s[k] >= REGLES.seuil)) delete s[k]; else s[k] = r4(s[k]); }
      // une invention : une bête qui peut l'apprendre, là où il sert
      if (N >= 10) { const R = hacher(t.id + '|' + p.biome, n); if (R() < REGLES.invention * a * a * Math.min(1, Math.sqrt(N / 100))) {
        const C = Object.entries(SAVOIRS).filter(([k, S]) => !s[k] && S.peut(t.plan) && S.ou(b) >= .3);
        if (C.length) { const [k, S] = C[Math.floor(R() * C.length)]; s[k] = REGLES.depart;
          ev.push({ type: 'savoir', taxon: t.id, biome: p.biome, detail: `chez ${t.nom || t.id}, à ${b.nom || p.biome}, une bête invente : ${S.nom}${S.outil ? ` (un outil : ${S.outil})` : ''}` }); } } }
      if (Object.keys(s).length) p.savoirs = s; else delete p.savoirs;
      // un savoir perdu : la population l'avait, elle ne l'a plus
      const avantS = A.get(t.id + '|' + p.biome) || {}; for (const k of Object.keys(avantS)) if (avantS[k] >= .2 && !s[k]) ev.push({ type: 'savoir', taxon: t.id, biome: p.biome, detail: `à ${b.nom || p.biome}, ${t.nom || t.id} a perdu un savoir : ${SAVOIRS[k]?.nom || k}` });
    } }
  // le catalogue : les savoirs que le monde connaît
  const connus = new Set(); for (const t of sortie) for (const p of t.populations || []) for (const k of Object.keys(p.savoirs || {})) connus.add(k);
  const catalogue = Object.fromEntries([...connus].sort().map(k => { const S = SAVOIRS[k]; return [k, { nom: S.nom, geste: S.geste, ...(S.outil ? { outil: S.outil } : {}), presage: S.presage,
    effet: [S.place ? `${Math.round(S.place * 100)} % de nourriture en plus` : '', S.chasse ? `une chasse meilleure de ${Math.round(S.chasse * 100)} %` : '', S.vuln ? `${Math.round(-S.vuln * 100)} % de pertes en moins` : ''].filter(Boolean).join(', ') + ', à ceux qui le savent' }]; }));
  return { evenements: ev, catalogue };
}

const API = { REGLES, TRAITS, SAVOIRS, capacite, eveiller, preparer, apres };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneEsprit = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
