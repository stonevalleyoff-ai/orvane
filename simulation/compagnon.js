// Orvane — LE COMPAGNON (simulation/compagnon.js)
// Une bête à soi, à élever et à soigner, en temps réel : un tamagotchi, mais une vraie bête d'Orvane. Elle est tirée de la
// population réelle (tampon/individus.js : son génotype, sa taille, sa vitesse, son audace, sa sociabilité), ou née d'un œuf, ou
// d'un croisement (Individus.croiser). Ce qu'elle est décide de ce dont elle a besoin :
//  - sa faim suit son métabolisme : une petite bête a faim plus vite (masse^-0,12), le métabolisme lent la ralentit ; elle mange
//    ce que mange sa lignée (le spectre du régime, moteur/dietes.js : feuilles, fruits, graines, nectar, insectes, viande, sang) ;
//  - elle dort à ses heures (diurne, nocturne, crépusculaire), à l'horloge de l'appareil ;
//  - elle s'ennuie d'autant plus qu'elle est sociable ; elle se fie à vous d'autant plus vite qu'elle est audacieuse (docs/12) ;
//  - son habitat lui convient plus ou moins (Orvane.convenance : sa niche contre les axes du lieu) ;
//  - elle tombe malade, plus si son enclos est sale, plus encore si sa lignée a une épidémie dans le monde ; la consanguinité
//    (sa vigueur) l'use plus vite ; elle vieillit, cycle de vie après cycle de vie, jusqu'à sa longévité ;
//  - elle apprend (moteur/esprit.js : des savoirs, plus vite si sa lignée apprend bien) ; adulte, elle a des petits.
// Le temps passe aussi quand la page est fermée : à la réouverture, avancer() rattrape ce qui s'est passé (le mode doux : quelqu'un
// veillait, ses besoins ne sont pas tombés trop bas). Déterministe : une graine par compagnon, comptée à chaque tirage.
//   const C = Compagnon.adopter(ind, taxon, { biome, oeuf, maintenant })
//   const ev = Compagnon.avancer(C, Date.now(), { confort, epidemie })   // ce qui s'est passé depuis la dernière fois
//   const r = Compagnon.agir(C, 'nourrir', 'fruits', Date.now())         // { ok, texte }
//   Compagnon.lire(C, Date.now())                                       // son humeur, son stade, ce qu'elle réclame
// Node (require) ou navigateur (globalThis.OrvaneCompagnon). Les REGLES se règlent dans la page (le groupe « Le compagnon »).
'use strict';
(function (racine) {
const R = n => { if (typeof require !== 'function') return null; try { return require(n); } catch (e) { return null; } };
const Dietes = R('../moteur/dietes.js') || racine.OrvaneDietes || null, Esprit = R('../moteur/esprit.js') || racine.OrvaneEsprit || null;
const REGLES = {
  vitesse: 1,                 // le temps du compagnon : 1, le temps réel ; 60, une heure par minute
  heures_par_cycle: 4,        // un cycle de vie (la longévité, la maturité d'une lignée s'y comptent) dure autant d'heures
  doux: true,                 // pendant votre absence, quelqu'un veille : ses besoins ne tombent pas sous le plancher, il ne meurt pas de faim
  plancher: 25,               // le plancher du mode doux
  faim: 9,                    // la satiété perdue par heure, à 1 kg (× masse^-0,12)
  repas: 34,                  // ce qu'un repas qu'il aime rend de satiété
  fatigue: 6, repos: 16,      // l'énergie perdue par heure éveillé, regagnée en dormant
  ennui: 5,                   // l'humeur perdue par heure, × (1 + sa sociabilité)
  jeu: 22, caresse: 9,        // ce qu'un jeu, une caresse rendent d'humeur
  digestion: 3,               // les heures qu'il faut pour qu'un repas fasse une crotte (× le métabolisme)
  crottes_max: 6, salete: 17, // au plus autant de crottes ; ce que chacune ôte à la propreté
  guerison: 3,                // la santé regagnée par heure quand tout va bien
  famine: 9, malpropre: 3, inconfort: 5,   // la santé perdue par heure : affamé, dans un enclos sale, dans un habitat qui ne lui va pas (× (1 − confort)²)
  maladie: { chance: .006, epidemie: 8, sante: 6, seule: .015, soin: .85 },   // par heure : tomber malade, × (1 + crottes/3) ; × (1 + 8 × virulence) quand sa lignée a une épidémie ici ; guérir seul ; un soin qui réussit
  confiance: { depart: 18, audace: .35, repas: 2, jeu: 3, caresse: 2, soin: -4, abandon: 2, seuil_caresse: 30 },   // la confiance : au départ (une bête sauvage), ce que l'audace y change, ce que chaque geste rapporte, ce que coûte l'abandon par heure
  dressage: { pas: 12, seuil: 40 },   // un tour appris : 100 points ; une leçon en rapporte autant (× la capacité d'apprendre de sa lignée), dès autant de confiance
  incubation: 1,              // un œuf éclot en autant de cycles de vie
  vieillesse: .04,            // au-delà de sa longévité (× sa vigueur), la chance de mourir par heure, × l'âge en trop (en longévités)
  pas_max: 300                // les secondes de son temps qu'avancer() fait d'un coup
};
const ALIMENTS = { feuilles: ['des feuilles', '🌿'], fruits: ['des fruits', '🍎'], graines: ['des graines', '🌾'], nectar: ['du nectar', '🌸'], insectes: ['des insectes', '🐛'], viande: ['de la viande', '🍖'], sang: ['du sang', '🩸'], plancton: ['du plancton', '🫧'], debris: ['des débris', '🍂'], energie: ['de l’énergie', '⚡'] };
const TOURS = [['venir', 'venir quand on l’appelle'], ['suivre', 'vous suivre pas à pas'], ['rapporter', 'rapporter ce qu’on lance'], ['saluer', 'saluer'], ['cacher', 'se cacher sur un signe']];
const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const HEURE = 36e5;
const alea = C => { let a = (C.graine + Math.imul(C.tirages++, 0x9E3779B1)) >>> 0; a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ce que mange une lignée : son spectre (docs/30), sinon celui que lui donnerait l'éveil des régimes, sinon son régime
function menu(plan) {
  if (plan.regime === 'synthetique') return { energie: 1 };
  if (plan.regime === 'filtreur') return { plancton: 1 };
  if (plan.regime === 'detritivore') return { debris: .7, feuilles: .3 };
  const d = plan.diete || (Dietes?.dieteDe ? Dietes.dieteDe(plan) : null);
  if (d && Object.keys(d).length) return { ...d };
  return plan.regime === 'carnivore' ? { viande: 1 } : plan.regime === 'omnivore' ? { feuilles: .4, fruits: .2, insectes: .2, viande: .2 } : { feuilles: 1 };
}
// les heures où elle dort, à l'horloge (0 à 24)
function dortA(activite, h) {
  if (activite === 'nocturne') return h >= 8 && h < 18;
  if (activite === 'crepusculaire') return (h >= 11 && h < 16) || h < 3 || h >= 23.5;
  if (activite === 'continue') return h >= 2 && h < 5;
  return h >= 21.5 || h < 7;
}
const heureDe = t => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
const metabolisme = C => clamp(Math.pow(Math.max(1e-4, C.plan.masse_kg || 1), -.12), .5, 2) * (C.traits.includes('metabolisme-lent') ? .6 : 1);
const fem = C => C.ind?.sexe === 'f', acc = (C, m, f) => fem(C) ? f : m;   // l'accord : il ou elle
const stadeDe = C => C.mort ? 'mort' : C.oeuf ? 'oeuf' : C.age < C.plan.maturite ? 'jeune' : C.age > C.plan.longevite ? 'vieux' : 'adulte';

// --- adopter : une bête sauvage, un œuf, un petit ---
function adopter(ind, taxon, opt = {}) {
  const P = taxon.plan || {}, t = opt.maintenant ?? Date.now(), cat = opt.cat || {};
  const traits = opt.traits || Object.entries(ind.alleles || {}).filter(([id, c]) => c >= (cat[id]?.heredite === 'recessif' ? 2 : 1)).map(([id]) => id);
  const C = { orvane_compagnon: 1, ind: JSON.parse(JSON.stringify(ind)), nom: ind.nom, taxon: taxon.id, espece: taxon.nom_commun || taxon.nom || taxon.id, traits,
    plan: { regime: P.regime, masse_kg: P.masse_kg, taille_m: P.taille_m, longevite: Math.max(2, P.longevite || 30), maturite: Math.max(.5, P.maturite || 3), activite: P.activite || 'diurne', sociabilite: P.sociabilite ?? .3,
      temperament: P.temperament, perception: P.perception, locomotion: P.locomotion || [], reproduction: P.reproduction || null, niche: P.niche, tolerance: P.tolerance, corps: P.corps || null, diete: P.diete || null, modules: P.modules, role: P.role },
    biome: opt.biome || ind.biome || null, ne: t, dernier: t, temps: t, graine: hash((ind.id || '') + ':' + t), tirages: 0,
    age: opt.oeuf || opt.petit ? 0 : opt.age ?? Math.max(0, (P.maturite || 3) * (.4 + .4 * ((hash(ind.id || 'x') % 1000) / 1000))), oeuf: !!opt.oeuf, incube: 0,
    faim: 75, energie: 80, humeur: 65, sante: 100, crottes: 0, digestion: 0, malade: null, dort: false,
    confiance: clamp(opt.confiance ?? REGLES.confiance.depart * (1 + REGLES.confiance.audace * (ind.z?.audace || 0)) + (opt.oeuf || opt.petit ? 30 : 0)), dressage: 0, tours: [],
    savoirs: [...(ind.savoirs || [])], journal: [], alertes: {}, enfants: 0, generation: ind.gen || 0, mort: null, origine: opt.origine || (opt.oeuf ? 'oeuf' : 'sauvage') };
  noter(C, t, opt.oeuf ? `Un œuf de ${C.espece}, à couver.` : opt.petit ? `${C.nom} est né${ind.sexe === 'f' ? 'e' : ''} chez vous.` : `${C.nom} vous suit, encore ${ind.sexe === 'f' ? 'méfiante' : 'méfiant'}.`);
  return C;
}
function noter(C, t, texte, type = 'vie') { C.journal.unshift({ t, texte, type }); if (C.journal.length > 60) C.journal.length = 60; return { t, texte, type }; }

// --- le temps qui passe : de C.dernier à maintenant, par pas, comme le monde solo rattrape ses cycles ---
function avancer(C, maintenant = Date.now(), ctx = {}) {
  const ev = []; if (C.mort) { C.dernier = maintenant; return ev; }
  const absent = !!ctx.absent, total = Math.max(0, maintenant - C.dernier) * REGLES.vitesse, pasMs = REGLES.pas_max * 1000;
  let fait = 0;
  while (fait < total - 1e-6 && !C.mort) { const d = Math.min(pasMs, total - fait); un(C, d / HEURE, ctx, ev, absent); fait += d; C.temps += d; }
  C.dernier = maintenant;
  return ev;
}
function un(C, h, ctx, ev, absent) {
  const P = C.plan, t = C.temps, dire = (texte, type) => ev.push(noter(C, t, texte, type));
  if (C.oeuf) { C.incube += h / (REGLES.heures_par_cycle * REGLES.incubation); if (C.incube >= 1) { C.oeuf = false; C.age = 0; dire(`L’œuf éclot : voici ${C.nom} !`, 'naissance'); } return; }
  const st = stadeDe(C), meta = metabolisme(C) * (st === 'jeune' ? 1.25 : st === 'vieux' ? .9 : 1), soc = clamp(P.sociabilite ?? .3, 0, 1);
  const confort = clamp(ctx.confort ?? 1, 0, 1), heure = heureDe(t), sommeil = dortA(P.activite, heure);
  // dormir et se réveiller à ses heures
  // (elle dort tout son temps de sommeil ; réveillée, elle reste debout une heure ; hors de ses heures, elle fait la sieste quand elle n'en peut plus)
  if (!C.dort && ((sommeil && C.energie < 95 && !(C.debout > t)) || C.energie < 8)) { C.dort = true; dire(`${C.nom} s’endort.`, 'sommeil'); }
  else if (C.dort && !sommeil && C.energie > 55) { C.dort = false; dire(`${C.nom} se réveille${C.faim < 40 ? ', le ventre vide' : ''}.`, 'sommeil'); }
  C.faim = clamp(C.faim - REGLES.faim * meta * (C.dort ? .45 : 1) * h);
  C.energie = clamp(C.energie + (C.dort ? REGLES.repos : -REGLES.fatigue * (st === 'jeune' ? 1.2 : 1)) * h);
  C.humeur = clamp(C.humeur - (REGLES.ennui * (1 + soc) * (C.dort ? .3 : 1) + 4 * (1 - confort) + (C.faim < 25 ? 4 : 0) + (C.malade ? 3 : 0)) * h);
  C.digestion += meta * (C.dort ? .4 : 1) * h;
  const dig = REGLES.digestion; if (C.digestion >= dig && C.faim > 10) { C.digestion -= dig; if (C.crottes < REGLES.crottes_max) C.crottes++; } else if (C.digestion >= dig) C.digestion = dig;
  const proprete = propreteDe(C), vigueur = clamp(C.ind.vigueur ?? 1, .2, 1);
  // la maladie : plus dans la saleté, plus quand sa lignée a une épidémie là où il vit
  const M = REGLES.maladie;
  if (!C.malade && alea(C) < M.chance * h * (1 + C.crottes / 3) * (1 + M.epidemie * (ctx.epidemie || 0)) / vigueur) { C.malade = { depuis: t, virulence: +(.3 + .7 * alea(C)).toFixed(2), epidemie: !!ctx.epidemie }; dire(`${C.nom} tombe malade${ctx.epidemie ? ' : l’épidémie qui frappe sa lignée l’a gagné' : ''}.`, 'maladie'); }
  else if (C.malade && alea(C) < M.seule * h) { C.malade = null; dire(`${C.nom} guérit ${acc(C, 'tout seul', 'toute seule')}.`, 'sante'); }
  // la santé
  let ds = 0; const bien = C.faim > 45 && C.energie > 25 && proprete > 50 && !C.malade && confort > .5;
  if (bien) ds += REGLES.guerison * vigueur;
  if (C.faim < 15) ds -= REGLES.famine * (1 - C.faim / 15);
  if (proprete < 40) ds -= REGLES.malpropre * (1 - proprete / 40);
  ds -= REGLES.inconfort * (1 - confort) ** 2;
  if (C.malade) ds -= M.sante * C.malade.virulence;
  if (st === 'vieux') ds -= 1;
  C.sante = clamp(C.sante + ds * h / Math.max(.5, vigueur));
  // la confiance : l'abandon la défait
  if (C.faim < 20 || C.humeur < 20) C.confiance = clamp(C.confiance - REGLES.confiance.abandon * h);
  // le mode doux : pendant votre absence, quelqu'un veille
  if (absent && REGLES.doux) { const pl = REGLES.plancher; C.faim = Math.max(C.faim, pl); C.humeur = Math.max(C.humeur, pl); C.sante = Math.max(C.sante, pl); C.energie = Math.max(C.energie, pl); if (C.crottes > 2) C.crottes = 2; }
  // grandir, vieillir
  const avant = st; C.age += h / REGLES.heures_par_cycle; const apres = stadeDe(C);
  if (avant === 'jeune' && apres === 'adulte') dire(`${C.nom} est adulte.`, 'age'); if (avant === 'adulte' && apres === 'vieux') dire(`${C.nom} prend de l’âge.`, 'age');
  // les alertes : une fois par épisode
  for (const [k, seuil, texte] of [['faim', 25, 'a faim'], ['energie', 15, acc(C, 'est épuisé', 'est épuisée')], ['humeur', 25, 's’ennuie'], ['sante', 30, 'va mal']]) {
    if (C[k] < seuil && !C.alertes[k]) { C.alertes[k] = true; ev.push({ t, texte: `${C.nom} ${texte} !`, type: 'alerte', besoin: k }); } else if (C[k] > seuil + 15) C.alertes[k] = false; }
  if (C.crottes >= 3 && !C.alertes.crottes) { C.alertes.crottes = true; ev.push({ t, texte: `L’enclos de ${C.nom} est sale.`, type: 'alerte', besoin: 'proprete' }); } else if (C.crottes < 2) C.alertes.crottes = false;
  // la fin
  const L = P.longevite * vigueur;
  if (C.sante <= 0) mourir(C, t, C.malade ? 'la maladie' : C.faim < 5 ? 'la faim' : proprete < 30 ? 'un enclos trop sale' : confort < .3 ? 'un habitat qui ne lui allait pas' : 'l’épuisement', ev);
  else if (C.age > L && alea(C) < REGLES.vieillesse * h * (C.age / L - 1 + .1)) mourir(C, t, 'la vieillesse', ev);
}
const propreteDe = C => clamp(100 - REGLES.salete * C.crottes);
function mourir(C, t, cause, ev) { C.mort = { t, cause, age: +C.age.toFixed(2) }; C.dort = false; ev.push(noter(C, t, `${C.nom} s’est éteint${C.ind.sexe === 'f' ? 'e' : ''} : ${cause}, à ${C.age.toFixed(1).replace('.', ',')} cycles de vie.`, 'mort')); }

// --- ce qu'on fait pour lui ---
function agir(C, action, arg, maintenant = Date.now()) {
  const t = C.temps, Cf = REGLES.confiance, au = C.ind.z?.audace || 0, gagne = k => { C.confiance = clamp(C.confiance + k * (k > 0 ? 1 + .3 * au : 1)); };
  const fin = (ok, texte, effet) => { if (texte) noter(C, t, texte, ok ? 'soin' : 'refus'); return { ok, texte, effet }; };
  if (C.mort) return fin(false, null);
  if (action === 'renommer') { const n = String(arg || '').trim().slice(0, 30); if (!n) return fin(false, null); const a = C.nom; C.nom = n; return fin(true, `${a} s’appelle désormais ${n}.`); }
  if (C.oeuf) { if (action === 'couver') { C.incube = Math.min(.999, C.incube + .04); return fin(true, null, 'chaleur'); } return fin(false, 'C’est encore un œuf : il faut attendre qu’il éclose.'); }
  const st = stadeDe(C), nom = C.nom;
  switch (action) {
    case 'nourrir': {
      if (C.dort) return fin(false, `${nom} dort.`);
      const M = menu(C.plan), part = M[arg] || 0, top = Math.max(...Object.values(M));
      if (!part) { C.humeur = clamp(C.humeur - 3); const pref = Object.entries(M).sort((a, b) => b[1] - a[1])[0]?.[0]; return fin(false, `${nom} n’en veut pas : sa lignée mange plutôt ${ALIMENTS[pref]?.[0] || pref}.`, 'refus'); }
      if (C.faim > 92) return fin(false, `${nom} n’a plus faim.`, 'refus');
      C.faim = clamp(C.faim + REGLES.repas * (.35 + .65 * part / top) * (st === 'jeune' ? 1.15 : 1)); C.humeur = clamp(C.humeur + 3 + 4 * part / top); gagne(Cf.repas); C.digestion += .3;
      return fin(true, `${nom} mange ${ALIMENTS[arg]?.[0] || arg}${part / top > .8 ? ' avec appétit' : ''}.`, 'miam'); }
    case 'jouer': {
      if (C.dort) { C.dort = false; C.debout = t + HEURE; C.humeur = clamp(C.humeur - 10); return fin(false, `${nom} se réveille en sursaut, de mauvaise humeur.`, 'refus'); }
      if (C.energie < 15) return fin(false, `${nom} est ${acc(C, 'trop fatigué', 'trop fatiguée')} pour jouer.`, 'refus');
      if (C.confiance < 25 && alea(C) < .5) { C.humeur = clamp(C.humeur + 4); gagne(1); return fin(true, `${nom} se méfie encore, et vous observe de loin.`, 'mefiance'); }
      C.humeur = clamp(C.humeur + REGLES.jeu * (1 + .25 * au)); C.energie = clamp(C.energie - 12); C.faim = clamp(C.faim - 6); gagne(Cf.jeu);
      return fin(true, `${nom} joue avec vous.`, 'joie'); }
    case 'caresser': {
      if (C.confiance < Cf.seuil_caresse) { C.humeur = clamp(C.humeur - 2); return fin(false, `${nom} s’écarte : pas encore assez confiance (${Math.round(C.confiance)} sur ${Cf.seuil_caresse}).`, 'mefiance'); }
      C.humeur = clamp(C.humeur + REGLES.caresse); gagne(Cf.caresse); return fin(true, C.dort ? `${nom} soupire dans son sommeil.` : `${nom} se laisse caresser.`, 'coeur'); }
    case 'nettoyer': { if (!C.crottes) return fin(false, 'L’enclos est déjà propre.'); const sale = C.crottes >= 3; C.crottes = Math.max(0, C.crottes - (arg === 'une' ? 1 : C.crottes)); if (sale) C.humeur = clamp(C.humeur + 4); gagne(1); return fin(true, C.crottes ? null : 'L’enclos est propre.', 'propre'); }
    case 'soigner': {
      gagne(Cf.soin); if (!C.malade) return fin(false, `${nom} n’est pas ${acc(C, 'malade', 'malade')}, et n’a pas aimé ça.`, 'refus');
      if (alea(C) < REGLES.maladie.soin) { C.malade = null; C.sante = clamp(C.sante + 10); return fin(true, `${nom} est ${acc(C, 'soigné', 'soignée')}.`, 'soin'); }
      return fin(false, `Le soin n’a pas pris : ${nom} est toujours malade.`, 'refus'); }
    case 'dormir': { if (C.dort) return fin(false, `${nom} dort déjà.`); if (C.energie > 88) return fin(false, `${nom} n’a pas sommeil.`, 'refus'); C.dort = true; return fin(true, `${nom} s’endort.`, 'sommeil'); }
    case 'reveiller': { if (!C.dort) return fin(false, `${nom} est ${acc(C, 'réveillé', 'réveillée')}.`); C.dort = false; C.debout = t + HEURE; if (C.energie < 60) C.humeur = clamp(C.humeur - 8); return fin(true, `${nom} ouvre un œil.`); }
    case 'dresser': {
      const D = REGLES.dressage; if (C.dort) return fin(false, `${nom} dort.`); if (C.confiance < D.seuil) return fin(false, `${nom} ne vous fait pas encore assez confiance pour apprendre (${Math.round(C.confiance)} sur ${D.seuil}).`, 'mefiance');
      if (C.energie < 20) return fin(false, `${nom} est ${acc(C, 'trop fatigué', 'trop fatiguée')}.`, 'refus');
      const cap = Esprit?.capacite ? Esprit.capacite(C.plan) : .4; C.dressage += D.pas * (.4 + 1.2 * cap) * (st === 'jeune' ? 1.3 : st === 'vieux' ? .6 : 1); C.energie = clamp(C.energie - 6); C.humeur = clamp(C.humeur + 4); gagne(1);
      if (C.dressage < 100) return fin(true, `${nom} apprend (${Math.round(C.dressage)} %).`, 'etude');
      C.dressage = 0; const S = Esprit?.SAVOIRS ? Object.entries(Esprit.SAVOIRS).filter(([k]) => !C.savoirs.includes(k)).map(([k, v]) => [k, v.nom, 'savoir']) : [];
      const T = TOURS.filter(([k]) => !C.tours.includes(k)).map(([k, n]) => [k, n, 'tour']), choix = [...S, ...T]; if (!choix.length) return fin(true, `${nom} sait déjà tout ce qu’on peut lui apprendre.`, 'joie');
      const [k, n, genre] = choix[Math.floor(alea(C) * choix.length)]; (genre === 'savoir' ? C.savoirs : C.tours).push(k);
      return fin(true, `${nom} a appris : ${n} !`, 'joie'); }
  }
  return fin(false, null);
}

// --- ce qu'on lit de lui ---
function lire(C) {
  const st = stadeDe(C), proprete = propreteDe(C);
  const besoins = { faim: C.faim, energie: C.energie, humeur: C.humeur, proprete, sante: C.sante, confiance: C.confiance };
  const pire = Object.entries(besoins).filter(([k]) => k !== 'confiance').sort((a, b) => a[1] - b[1])[0];
  const a = (m, f) => acc(C, m, f), humeur = C.mort ? a('parti', 'partie') : C.oeuf ? 'dans son œuf' : C.dort ? a('endormi', 'endormie') : C.malade ? 'malade' : C.faim < 20 ? a('affamé', 'affamée') : C.energie < 15 ? a('épuisé', 'épuisée') : proprete < 40 ? a('incommodé', 'incommodée') : C.humeur < 25 ? 'triste' : C.humeur < 50 ? a('grognon', 'grognonne') : C.humeur > 80 && C.sante > 70 ? a('heureux', 'heureuse') : a('content', 'contente');
  const reclame = C.mort || C.oeuf ? null : C.malade ? 'soigner' : C.faim < 35 ? 'nourrir' : proprete < 50 ? 'nettoyer' : C.energie < 20 && !C.dort ? 'dormir' : C.humeur < 40 && !C.dort ? 'jouer' : null;
  return { stade: st, besoins, pire, humeur, reclame, taille: C.oeuf ? .35 : .45 + .55 * clamp(C.age / C.plan.maturite, 0, 1), menu: menu(C.plan), metabolisme: metabolisme(C), dortA: h => dortA(C.plan.activite, h),
    adulteDans: st === 'jeune' ? (C.plan.maturite - C.age) * REGLES.heures_par_cycle / REGLES.vitesse : 0, peutAvoirDesPetits: st === 'adulte' && C.confiance >= 50 && C.sante > 50 && !C.malade };
}
// un petit : la page le croise avec un partenaire (Individus.croiser) ; le parent en garde le compte
function naissance(C, petit, taxon, opt = {}) { C.enfants++; const oeuf = (taxon?.plan?.reproduction || C.plan.reproduction) === 'ovipare'; noter(C, C.temps, `${C.nom} a ${oeuf ? 'pondu un œuf' : 'eu un petit'} : ${petit.nom}.`, 'naissance');
  return adopter(petit, taxon || { id: C.taxon, nom: C.espece, plan: C.plan }, { ...opt, oeuf, petit: !oeuf, maintenant: opt.maintenant ?? C.dernier, origine: 'eleve' }); }
const sauver = C => JSON.stringify(C);
const charger = j => { const C = typeof j === 'string' ? JSON.parse(j) : JSON.parse(JSON.stringify(j)); if (C?.orvane_compagnon !== 1) throw new Error('pas un compagnon'); return C; };

const API = { REGLES, ALIMENTS, TOURS, adopter, avancer, agir, lire, menu, dortA, naissance, sauver, charger, stadeDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneCompagnon = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
