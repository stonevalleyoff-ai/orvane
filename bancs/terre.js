// Orvane — LE BANC DE LA TERRE (bancs/terre.js, docs/52)
//  1. le calendrier : le soleil (la durée du jour à Paris, à Sydney, le soleil de minuit, la nuit polaire), la lune, les années
//     bissextiles ; la saison d'un lieu tirée de ses normales (l'hiver de Paris en janvier, l'été austral en janvier, la sécheresse
//     de l'été andalou) ;
//  2. le pas de temps : un monde qui dit monde.temps = { jours: 120 } (un pas de 1) tourne au bit près comme sans temps ; un monde
//     au jour fait vivre un cerf quinze ans : sans naissances, il en meurt 1/15 par an ;
//  3. un monde réel au jour : les naissances viennent au printemps, l'hiver use ; un petit nombre ne reste pas figé par l'arrondi ;
//     une espèce gagne un lieu voisin vide ; un loup en meute vit de cerfs ; deux lieux d'hémisphères opposés ont des saisons
//     opposées ; ce que publie le cycle respecte le contrat.
//   node bancs/terre.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const racine = p => path.join(__dirname, '..', p);
const C = require(racine('moteur/calendrier.js')), Orvane = require(racine('moteur/orvane.js'));
const { verifier } = require(racine('outils/verifier.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const d = s => Date.parse(s), somme = L => L.reduce((s, x) => s + x, 0), ans = x => Math.round(x * 365.25);
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);

console.log('1. Le calendrier');
{ const paris = C.soleil(48.85, 2.35, d('2026-06-21T12:00Z')), sydney = C.soleil(-33.87, 151.2, d('2026-06-21T12:00Z'));
  verif(Math.abs(paris.jour_h - 16.18) < .1, `le 21 juin, Paris a ${paris.jour_h} h de jour (16 h 11 aux éphémérides), lever ${paris.lever_utc} UTC`);
  verif(Math.abs(sydney.jour_h - 9.9) < .1, `le même jour, Sydney en a ${sydney.jour_h} h : c'est l'hiver austral`);
  verif(C.soleil(69.65, 18.96, d('2026-06-21T12:00Z')).soleil_de_minuit && C.soleil(69.65, 18.96, d('2026-12-21T12:00Z')).nuit_polaire, 'Tromsø : le soleil de minuit en juin, la nuit polaire en décembre');
  const l = C.lune(d('2026-11-24T12:00Z'));
  verif(l.nom === 'pleine lune' && l.eclairee > .99, `le 24 novembre 2026 : ${l.nom} (éclairée à ${Math.round(l.eclairee * 100)} %)`);
  verif(C.longueurAn(2028) === 366 && C.longueurAn(2100) === 365 && C.jourAn(d('2028-12-31T00:00Z')) === 366, 'les années bissextiles (2028 : 366 jours ; 2100 : 365)');
  const P = { milieu: 'terrestre', axes: { temperature: .55, humidite: .6, altitude: .2, lumiere: .6, couvert: .3 }, lieu: { lat: 48.85, lon: 2.35 },
    normales: { t: [5, 5.6, 8.8, 11.5, 15.2, 18.3, 20.5, 20.3, 16.9, 13, 8.3, 5.5], p: [51, 41, 48, 52, 63, 50, 62, 52, 48, 62, 52, 59] } };
  const BA = { ...P, lieu: { lat: -34.6, lon: -58.4 }, normales: { t: [24.9, 23.8, 22, 18.4, 15.1, 12.2, 11.6, 13, 14.9, 18, 21, 23.6], p: [122, 123, 154, 107, 92, 50, 53, 63, 78, 139, 131, 103] } };
  const SV = { ...P, lieu: { lat: 37.4, lon: -6 }, normales: { t: [10.9, 12.3, 15.2, 17, 20.6, 24.9, 28.2, 28, 24.9, 20.3, 14.9, 11.9], p: [57, 43, 41, 48, 26, 9, 1, 5, 23, 63, 79, 80] } };
  const j = C.saisonLieu(P, d('2026-01-20T03:00Z')), jt = C.saisonLieu(P, d('2026-07-20T03:00Z')), b = C.saisonLieu(BA, d('2026-01-20T03:00Z'));
  verif(j.nom === 'hiver' && jt.nom === 'été' && jt.axes.temperature - j.axes.temperature > .25, `Paris : l'hiver le 20 janvier (axe de température ${j.axes.temperature.toFixed(2)}), l'été le 20 juillet (${jt.axes.temperature.toFixed(2)})`);
  verif(b.nom === 'été', `Buenos Aires : le 20 janvier, c'est l'été (phase ${b.phase.toFixed(2)})`);
  const sp = C.saisonLieu(SV, d('2026-04-15T03:00Z')).production, se = C.saisonLieu(SV, d('2026-07-25T03:00Z')).production, pe = C.saisonLieu(P, d('2026-06-25T03:00Z')).production;
  verif(sp > 1.1 && se < .8 && pe > 1.1, `Séville pousse au printemps (${sp.toFixed(2)}) et sèche l'été (${se.toFixed(2)}) ; Paris pousse l'été (${pe.toFixed(2)})`);
}

console.log('2. Le pas de temps');
{ const I0 = JSON.parse(fs.readFileSync(racine('mondes/genese-7/etat.json'), 'utf8'));
  let A = I0, B = { ...I0, monde: { ...I0.monde, temps: { jours: 120 } } };
  for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}, { duree_ms: 864e5 }); B = Orvane.cycle(B, {}, { duree_ms: 864e5 }); }
  verif(empreinte(A.taxons) === empreinte(B.taxons) && empreinte(A.biomes) === empreinte(B.biomes), 'un monde au pas de 1 (temps : 120 jours par cycle) tourne au bit près comme sans temps : trois cycles de la genèse 7');
}
// un monde réel au jour, à deux lieux (une forêt de Bourgogne, une taïga de Laponie), et un lieu austral
const lieu = (id, type, lat, lon, alt, couvert, t, p, surf) => { const etp = C.etpThornthwaite(t, lat), T0 = somme(t) / 12, P0 = somme(p), E0 = somme(etp), K = Math.round(5 * C.npp(T0, P0) * surf);
  return { id, nom: id, type, milieu: 'terrestre', axes: { temperature: C.axeTemperature(T0), humidite: C.axeHumidite(P0, E0), altitude: C.axeAltitude(alt), lumiere: C.axeLumiere(lat, couvert), couvert },
    capacite: K, capacite_base: K, voisins: [], lieu: { lat, lon, altitude_m: alt, surface_km2: surf }, normales: { t, p, etp } }; };
const espece = (id, plan, pops) => ({ id, nom: id, parent: null, apparu: 0, eteint: null, statut: 'stable',
  plan: { locomotion: ['marche', 'course'], sociabilite: .5, temperament: .3, activite: 'crepusculaire', vitesse_rel: 5, perception: .6, tolerance: .35, corps: { forme: 'quadrupede', pattes: 4 }, ...plan },
  phenotypes: [{ id: 'base', frequence: 1, traits: [] }], populations: Object.entries(pops).map(([biome, effectif]) => ({ biome, effectif, tendance: 0, depuis: 0 })) });
const monde = (B, T, regles = {}) => ({ orvane: '1.0', monde: { id: 'terre-essai', graine: 3, nom: 'Essai', annee: 365, calendrier: {}, temps: { jours: 1 }, regles: { naissances: { force: 1 }, besoin: 6, conversion: .06, dispersion: .005, ...regles } },
  cycle: { n: 0, date: '2026-01-01T03:17:00.000Z' }, biomes: B, catalogue: { version: '0.1', traits: {} }, taxons: T, evenements: [] });
const tB = [2.3, 3.6, 7.3, 10.2, 14.3, 17.9, 20.3, 19.9, 15.9, 11.6, 6.3, 3.1], pB = [55, 47, 52, 60, 85, 70, 63, 63, 63, 70, 70, 63];
const tL = [-13, -12, -7, -1, 6, 12, 15, 12, 6, -1, -7, -11], pL = [35, 30, 30, 30, 40, 60, 75, 70, 55, 50, 40, 35];
const eff = (I, id, b) => I.taxons.find(t => t.id === id)?.populations.find(p => !b || p.biome === b)?.effectif ?? 0;
{ const F = lieu('foret~bourgogne', 'foret', 47.3, 4.9, 300, .55, tB, pB, 40000), cerf = { regime: 'herbivore', masse_kg: 150, taille_m: 2, longevite: ans(15), maturite: ans(2), portee: 1, natalite: 0, niche: { ...F.axes } };
  let I = monde([F], [espece('cerf', cerf, { 'foret~bourgogne': 100000 })]); for (let k = 0; k < 365; k++) I = Orvane.cycle(I, {}, { duree_ms: 864e5 });
  const reste = eff(I, 'cerf') / 100000;
  verif(Math.abs(reste - Math.exp(-365 / ans(15))) < .005, `un cerf vit 15 ans (${ans(15)} cycles) : sans naissance, il en reste ${(reste * 100).toFixed(1)} % au bout d'un an (${(Math.exp(-365 / ans(15)) * 100).toFixed(1)} % attendus)`);
}

console.log('3. Un monde réel au jour');
{ const F = lieu('foret~bourgogne', 'foret', 47.3, 4.9, 300, .55, tB, pB, 40000), L = lieu('taiga~laponie', 'taiga', 67.5, 26.5, 250, .45, tL, pL, 60000), V = lieu('foret~vide', 'foret', 47.8, 6.5, 400, .6, tB, pB, 20000);
  const S = lieu('foret~patagonie', 'foret', -41.1, -71.3, 800, .6, [14, 14, 11.5, 8, 5, 2.5, 2, 3, 5, 8, 10.5, 12.5], [30, 25, 40, 70, 140, 160, 150, 120, 70, 50, 35, 30], 30000);
  F.voisins = ['taiga~laponie', 'foret~vide']; L.voisins = ['foret~bourgogne']; V.voisins = ['foret~bourgogne'];
  const cerf = { regime: 'herbivore', masse_kg: 150, taille_m: 2, longevite: ans(15), maturite: ans(2), portee: 1, natalite: .25, niche: { ...F.axes } };
  const loup = { regime: 'carnivore', masse_kg: 40, taille_m: 1.4, longevite: ans(9), maturite: ans(2), portee: 5, natalite: .45, sociabilite: .9, meute: 6, niche: { ...F.axes }, tolerance: .5 };
  const huemul = { regime: 'herbivore', masse_kg: 70, taille_m: 1.5, longevite: ans(12), maturite: ans(2), portee: 1, natalite: .25, niche: { ...S.axes } };
  let I = monde([F, L, V, S], [espece('cerf', cerf, { 'foret~bourgogne': 120000 }), espece('loup', loup, { 'foret~bourgogne': 300 }), espece('huemul', huemul, { 'foret~patagonie': 2000 })]);
  const nais = {}, jours = []; let schema = [];
  for (let k = 1; k <= 730; k++) { const avant = eff(I, 'cerf', 'foret~bourgogne');
    I = Orvane.cycle(I, {}, { duree_ms: 864e5, trace: x => { if (x.taxon === 'cerf' && x.biome === 'foret~bourgogne') { const m = new Date(Date.parse(I.cycle.date) + 864e5).getUTCMonth(); nais[m] = (nais[m] || 0) + x.nais; } } });
    if (k === 200) schema = verifier(I, 'instantane'); if (k % 30 === 0) jours.push([I.cycle.jour, avant, eff(I, 'cerf', 'foret~bourgogne')]); }
  const printemps = (nais[4] || 0) + (nais[5] || 0) + (nais[6] || 0), hiver = (nais[11] || 0) + (nais[0] || 0) + (nais[1] || 0);
  verif(printemps > 5 * hiver, `les faons naissent au printemps : ${Math.round(printemps)} de mai à juillet, ${Math.round(hiver)} de décembre à février`);
  const l0 = 300, l1 = eff(I, 'loup', 'foret~bourgogne');
  verif(Math.abs(l1 - l0) > 1, `trois cents loups ne restent pas figés par l'arrondi : ${l1.toFixed(1)} au bout de deux ans`);
  verif(I.taxons.find(t => t.id === 'loup').populations.some(p => p.satiete > .5), 'un loup en meute (six) vit de cerfs, cent cinquante kilos, presque quatre fois sa masse');
  verif(eff(I, 'cerf', 'foret~vide') >= 4, `le cerf gagne la forêt voisine où il n'était pas : ${Math.round(eff(I, 'cerf', 'foret~vide'))} au bout de deux ans`);
  verif(I.biomes.find(b => b.id === 'foret~bourgogne').saison.nom === 'hiver' && I.biomes.find(b => b.id === 'foret~patagonie').saison.nom === 'été', `le ${I.cycle.jour}, l'hiver en Bourgogne, l'été en Patagonie`);
  verif(I.biomes.find(b => b.id === 'taiga~laponie').soleil?.jour_h < 4, `le même jour, la Laponie a ${I.biomes.find(b => b.id === 'taiga~laponie').soleil?.jour_h} h de jour`);
  verif(!schema.length, `ce que publie un monde au jour respecte le contrat${schema.length ? ' : ' + schema.slice(0, 3).join(' ; ') : ''}`);
}
{ // une espèce réelle garde son aire : avec la colonisation des mondes réels, la forêt voisine n'est pas envahie en deux ans ; et l'on
  // essaime dans son milieu : un cerf sait nager, il ne s'installe pas dans le lac voisin
  const F = lieu('foret~bourgogne', 'foret', 47.3, 4.9, 300, .55, tB, pB, 40000), V = lieu('foret~vide', 'foret', 47.8, 6.5, 400, .6, tB, pB, 20000);
  const Lac = { ...lieu('lac~bourgogne', 'lac', 47.3, 4.9, 250, .1, tB, pB, 2000), milieu: 'aquatique' }; Lac.axes = { ...Lac.axes, humidite: 1 };
  F.voisins = ['foret~vide', 'lac~bourgogne']; V.voisins = ['foret~bourgogne']; Lac.voisins = ['foret~bourgogne'];
  const cerf = { regime: 'herbivore', masse_kg: 150, taille_m: 2, longevite: ans(15), maturite: ans(2), portee: 1, natalite: .25, locomotion: ['marche', 'course', 'nage'], niche: { ...F.axes }, tolerance: .6 };
  let I = monde([F, V, Lac], [espece('cerf', cerf, { 'foret~bourgogne': 120000 })], { colonisation: .005 });
  for (let k = 0; k < 730; k++) I = Orvane.cycle(I, {}, { duree_ms: 864e5 });
  verif(eff(I, 'cerf', 'foret~vide') < 100, `avec la colonisation d'un monde réel, la forêt voisine n'est pas envahie : ${Math.round(eff(I, 'cerf', 'foret~vide'))} cerfs au bout de deux ans (2 358 sans elle)`);
  verif(eff(I, 'cerf', 'lac~bourgogne') === 0, 'un cerf sait nager, mais ne s\'installe pas dans le lac voisin');
}
{ // (docs/53) les migrateurs partent quand les jours raccourcissent, non quand il gèle : un oiseau de Laponie s'en va en septembre, revient en mars
  const L = lieu('taiga~laponie', 'taiga', 67.5, 26.5, 250, .45, tL, pL, 60000), F = lieu('foret~bourgogne', 'foret', 47.3, 4.9, 300, .55, tB, pB, 40000);
  L.voisins = ['foret~bourgogne']; F.voisins = ['taiga~laponie'];
  // (sa niche : celle de l'été où il niche, comme l'assemblage la donne aux oiseaux qui volent)
  const ete = C.saisonLieu(L, C.dateDeLaPhase(L, .5, Date.parse('2026-06-01'))).axes;
  const oiseau = { regime: 'herbivore', masse_kg: 3, taille_m: .9, longevite: ans(8), maturite: ans(2), portee: 3, natalite: .6, locomotion: ['vol', 'marche'], sociabilite: .8, niche: { ...ete }, tolerance: .35, corps: { forme: 'oiseau', pattes: 2 } };
  const dates = { depart: [], retour: [] }, mois = j => new Date(j + 'T12:00:00Z').getUTCMonth() + 1;
  for (const [cle, photoperiode] of [['avec', { depart: 13.5, retour: 11.5, largeur: 30 }], ['sans', null]]) {
    let I = monde([L, F], [espece('migrateur', oiseau, { 'taiga~laponie': 50000 })], { hivernage: { actif: 1, ...(photoperiode ? { photoperiode } : {}) } }); const d = { depart: null, retour: null };
    for (let k = 0; k < 500; k++) { I = Orvane.cycle(I, {}, { duree_ms: 864e5 });
      for (const e of I.evenements) if (e.type === 'migration' && e.taxon === 'migrateur') { if (/automne/.test(e.detail) && !d.depart) d.depart = I.cycle.jour; if (/printemps/.test(e.detail) && !d.retour) d.retour = I.cycle.jour; } }
    dates[cle] = d; }
  verif(dates.avec.depart && mois(dates.avec.depart) === 9 && dates.avec.retour && mois(dates.avec.retour) === 3, `les jours raccourcissent : le migrateur de Laponie part le ${dates.avec.depart}, revient le ${dates.avec.retour} (au froid seul, il partait le ${dates.sans.depart})`);
}
console.log(ok ? '\nla Terre tient' : '\nla Terre ne tient pas'); process.exit(ok ? 0 : 1);
