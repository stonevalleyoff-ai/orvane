// Orvane — LE BANC DES HOMMES (bancs/hommes.js, docs/56)
//  1. la saison : un jour dans la saison, un jour hors d'elle, une saison qui passe le 1er janvier ; sur sa saison, une population perd
//     exactement le taux (sans naissances ni autres morts) ;
//  2. le moteur : une forêt de cerfs sans naissances, chassée à 20 % de septembre à janvier, finit l'année à ce que la mort naturelle et la
//     chasse laissent ; un pays sans chasse, ou un monde qui ne dit pas monde.hommes, ne perd que ce que la mort naturelle prend ;
//  3. l'assemblage (outils/terre/hommes.js) : un prélèvement rapporté à ce qui est posé ; borné à la moitié de la marge de l'espèce ; un
//     prélèvement qui compte deux espèces (le chamois et l'isard) partagé selon leurs effectifs ; un pays où l'espèce n'est pas posée, dit.
//   node bancs/hommes.js
'use strict';
const path = require('path');
const racine = p => path.join(__dirname, '..', p);
const C = require(racine('moteur/calendrier.js')), Orvane = require(racine('moteur/orvane.js')), H = require(racine('moteur/hommes.js')), A = require(racine('outils/terre/hommes.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const somme = L => L.reduce((s, x) => s + x, 0), ans = x => Math.round(x * 365.25);

console.log('1. La saison');
{ const M = { especes: { cerf: { saison: ['09-01', '01-31'], taux: { FR: .2 } } } };
  const b = { lieu: { pays: 'FR' } }, de = s => Date.parse(s + 'T03:17:00Z');
  const en = H.jour(M, de('2026-10-15')), hors = H.jour(M, de('2026-06-15')), janv = H.jour(M, de('2027-01-20'));
  verif(en && en('cerf', b) > 0 && hors === null && janv && janv('cerf', b) > 0, 'la chasse a sa saison : le 15 octobre et le 20 janvier, oui ; le 15 juin, non');
  verif(en('cerf', { lieu: { pays: 'DE' } }) === 0 && en('loup', b) === 0, 'un pays sans taux, une espèce sans chasse : rien');
  const L = H.duree(H.jourDe('09-01'), H.jourDe('01-31')), f = en('cerf', b), reste = Math.pow(1 - f, L);
  verif(L === 153 && Math.abs(1 - reste - .2) < 1e-9, `sur sa saison de ${L} jours, une population perd exactement le taux : ${(100 * (1 - reste)).toFixed(3)} %`);
}

console.log('2. Le moteur');
const lieu = (id, pays) => { const t = [2.3, 3.6, 7.3, 10.2, 14.3, 17.9, 20.3, 19.9, 15.9, 11.6, 6.3, 3.1], p = [55, 47, 52, 60, 85, 70, 63, 63, 63, 70, 70, 63], lat = 47.3;
  const etp = C.etpThornthwaite(t, lat), K = Math.round(5 * C.npp(somme(t) / 12, somme(p)) * 40000);
  return { id, nom: id, type: 'foret', milieu: 'terrestre', axes: { temperature: C.axeTemperature(somme(t) / 12), humidite: C.axeHumidite(somme(p), somme(etp)), altitude: C.axeAltitude(300), lumiere: C.axeLumiere(lat, .55), couvert: .55 },
    capacite: K, capacite_base: K, voisins: [], lieu: { lat, lon: 4.9, altitude_m: 300, surface_km2: 40000, pays }, normales: { t, p, etp } }; };
const monde = (hommes) => { const F = lieu('foret~fr', 'FR'), G = lieu('foret~de', 'DE');
  const cerf = { regime: 'herbivore', masse_kg: 150, taille_m: 2, longevite: ans(15), maturite: ans(2), portee: 1, natalite: 0, niche: { ...F.axes }, locomotion: ['marche'], sociabilite: .5, temperament: .3,
    activite: 'crepusculaire', vitesse_rel: 5, perception: .6, tolerance: .35, corps: { forme: 'quadrupede', pattes: 4 } };
  return { orvane: '1.0', monde: { id: 'hommes-essai', graine: 3, nom: 'Essai', annee: 365, calendrier: {}, temps: { jours: 1 }, regles: { naissances: { force: 1 }, besoin: 6, conversion: .06, colonisation: 0, dispersion: 0 }, ...(hommes ? { hommes } : {}) },
    cycle: { n: 0, date: '2026-01-01T03:17:00.000Z' }, biomes: [F, G], catalogue: { version: '0.1', traits: {} }, evenements: [],
    taxons: [{ id: 'cerf', nom: 'cerf', parent: null, apparu: 0, eteint: null, statut: 'stable', plan: cerf, phenotypes: [{ id: 'base', frequence: 1, traits: [] }],
      populations: [{ biome: 'foret~fr', effectif: 100000, tendance: 0, depuis: 0 }, { biome: 'foret~de', effectif: 100000, tendance: 0, depuis: 0 }] }] }; };
const eff = (I, b) => I.taxons[0].populations.find(p => p.biome === b)?.effectif ?? 0;
{ const M = { especes: { cerf: { saison: ['09-01', '01-31'], taux: { FR: .2 } } } };
  let I = monde(M), J = monde(null); for (let k = 0; k < 365; k++) { I = Orvane.cycle(I, {}, { duree_ms: 864e5 }); J = Orvane.cycle(J, {}, { duree_ms: 864e5 }); }
  const nat = Math.exp(-365 / ans(15)), fr = eff(I, 'foret~fr') / 1e5, de = eff(I, 'foret~de') / 1e5, sans = eff(J, 'foret~fr') / 1e5;
  verif(Math.abs(fr - nat * .8) < .01, `la forêt de France, chassée à 20 % : il reste ${(100 * fr).toFixed(1)} % des cerfs au bout d'un an (la mort naturelle et la chasse : ${(100 * nat * .8).toFixed(1)} %)`);
  verif(Math.abs(de - nat) < .005 && Math.abs(sans - nat) < .005, `la forêt d'Allemagne, sans chasse, et un monde qui ne dit pas monde.hommes : ${(100 * de).toFixed(1)} % et ${(100 * sans).toFixed(1)} % (la mort naturelle : ${(100 * nat).toFixed(1)} %)`);
  const J2 = monde(null); let K1 = J2, K2 = monde(null); for (let k = 0; k < 30; k++) { K1 = Orvane.cycle(K1, {}, { duree_ms: 864e5 }); K2 = Orvane.cycle(K2, {}, { duree_ms: 864e5 }); }
  verif(JSON.stringify(K1) === JSON.stringify(K2), 'sans monde.hommes, le moteur reste déterministe (deux mondes, trente jours, au caractère près)');
}

console.log('3. L\'assemblage');
{ const inst = { biomes: [{ id: 'a', lieu: { pays: 'FR' } }, { id: 'b', lieu: { pays: 'ES' } }],
    taxons: [{ id: 'cerf', plan: { natalite: .4, longevite: ans(10) }, populations: [{ biome: 'a', effectif: 1000 }, { biome: 'b', effectif: 1000 }] },
      { id: 'chamois', plan: { natalite: .3, longevite: ans(10) }, populations: [{ biome: 'a', effectif: 300 }] },
      { id: 'isard', plan: { natalite: .3, longevite: ans(10) }, populations: [{ biome: 'a', effectif: 100 }, { biome: 'b', effectif: 500 }] }] };
  const R = A.taux({ especes: { cerf: { saison: ['09-01', '01-31'], prelevements: { FR: { n: 100 }, ES: { n: 900 }, IT: { n: 50 } } },
    chamois: { saison: ['08-01', '12-15'], taxons: ['chamois', 'isard'], prelevements: { FR: { n: 40 }, ES: { n: 20 } } } } }, inst);
  const marge = .4 - 365.25 / ans(10);
  verif(Math.abs(R.especes.cerf.taux.FR - .1) < 1e-9, `100 cerfs pris sur 1 000 posés : 10 %`);
  verif(Math.abs(R.especes.cerf.taux.ES - A.BORNE * marge) < 1e-4 && R.bornes.some(b => b.espece === 'cerf' && b.pays === 'ES'), `900 sur 1 000 : borné à la moitié de la marge de l'espèce (${(100 * A.BORNE * marge).toFixed(1)} %), et dit`);
  verif(R.absents.includes('cerf@IT'), 'un pays où l\'espèce n\'est pas posée : dit, sans chasse');
  verif(Math.abs(R.especes.chamois.taux.FR - .1) < 1e-9 && Math.abs(R.especes.isard.taux.FR - .1) < 1e-9 && Math.abs(R.especes.isard.taux.ES - 20 / 500) < 1e-9,
    'le chamois et l\'isard, comptés ensemble : partagés selon leurs effectifs (40 sur 400 en France : 10 % chacun ; 20 sur 500 en Espagne)');
}
console.log(ok ? '\nles hommes tiennent' : '\nles hommes ne tiennent pas'); process.exit(ok ? 0 : 1);
