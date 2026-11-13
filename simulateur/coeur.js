// Orvane — LE SIMULATEUR DE JOUEURS, SON CŒUR (simulateur/coeur.js) — docs/50
// Des joueurs fictifs, nuit après nuit, face à quelques bêtes du monde : ce qu'ils déclarent, ce que le tampon en retient, ce
// que chaque population en apprend. Rien n'est inventé ici : les lots passent par le vrai tampon (tampon/tampon.js, agreger),
// la méfiance par la fonction du moteur (moteur/orvane.js, apprendre), la mémoire par son module (moteur/memoire.js, publier),
// dans l'ordre où le cycle de nuit les appelle. Rien n'est envoyé à Orvane.
// Ce que le simulateur ne fait pas : il ne fait pas tourner l'écosystème. Les effectifs ne bougent pas, aucun migrant n'apporte
// sa mémoire, la satiété et l'audace restent celles du monde lu. Pour la nuit entière : hebergement/cycle.js (docs/50).
// Node (require) ou navigateur (globalThis.OrvaneSimulateur ; charger avant : moteur/orvane.js et ses modules, tampon/tampon.js).
'use strict';
(function (racine) {
const besoin = (nom, chemin) => typeof require === 'function' ? require(chemin) : racine[nom];
const Orvane = besoin('Orvane', '../moteur/orvane.js'), Tampon = besoin('OrvaneTampon', '../tampon/tampon.js'), Memoire = besoin('OrvaneMemoire', '../moteur/memoire.js');

// --- les styles de joueurs : ce qu'un joueur de ce style déclare chaque nuit, pour chaque bête suivie, selon qu'elle mange de la
// chair (elle peut s'en prendre à lui) ou non. [action, combien, moyen]. Ce sont les régimes du banc de la mémoire (docs/50).
// riposte : ce qu'il déclare en plus quand la bête fait front, à proportion de son agressivité du moment (arrondi : une bête
// à 0,5 lui donne la moitié de ces assauts). C'est la boucle que ferme un jeu : une bête devenue agressive charge, le jeu le raconte.
const STYLES = {
  passant: { nom: 'Passants', dit: 'Ils croisent les bêtes et ne leur font rien. Chargés, ils tombent parfois.',
    predateur: [['rencontre', 30]], proie: [['rencontre', 30]], riposte: [['attaque', 4], ['joueur_tombe', 1]] },
  terre: { nom: 'Terrés derrière leur feu', dit: 'Ils tiennent les bêtes à distance avec leur feu, ne ripostent jamais, et se font prendre.',
    predateur: [['rencontre', 30], ['effarouchement', 20, 'feu'], ['attaque', 5], ['joueur_tombe', 2]], proie: [['rencontre', 30]], riposte: [['attaque', 4], ['joueur_tombe', 1]] },
  chasseur: { nom: 'Chasseurs à l\'épieu', dit: 'Ils chassent de près, au corps à corps : des bêtes prises, des bêtes blessées. Chargés, ils tiennent, et tombent parfois.',
    predateur: [['rencontre', 30], ['effarouchement', 20, 'feu'], ['attaque', 3], ['blessure', 3, 'melee'], ['prelevement', 2, 'melee']],
    proie: [['rencontre', 30], ['prelevement', 3, 'melee'], ['blessure', 3, 'melee']], riposte: [['attaque', 6], ['joueur_tombe', 1]] },
  archer: { nom: 'Chasseurs à l\'arc', dit: 'Ils tirent de loin : la bête ne voit pas qui la frappe, et n\'a personne à charger.',
    predateur: [['rencontre', 30], ['prelevement', 4, 'distance'], ['blessure', 2, 'distance']],
    proie: [['rencontre', 30], ['prelevement', 4, 'distance'], ['blessure', 2, 'distance']], riposte: [['attaque', 2]] },
  nourrisseur: { nom: 'Nourrisseurs', dit: 'Ils donnent à manger, et ne font jamais de mal.',
    predateur: [['rencontre', 40], ['nourrissage', 12]], proie: [['rencontre', 40], ['nourrissage', 12]], riposte: [['attaque', 3]] },
  piegeur: { nom: 'Piégeurs', dit: 'Ils prennent les bêtes au piège, sans se montrer.',
    predateur: [['rencontre', 30], ['prelevement', 3, 'piege']], proie: [['rencontre', 30], ['prelevement', 3, 'piege']] },
  pille: { nom: 'Campeurs pillés', dit: 'Leurs vivres sont pillés ; ils font du bruit pour chasser les bêtes, sans les blesser.',
    predateur: [['rencontre', 30], ['pillage', 4], ['effarouchement', 10, 'bruit']], proie: [['rencontre', 30], ['pillage', 4], ['effarouchement', 10, 'bruit']], riposte: [['attaque', 3]] },
  tricheur: { nom: 'Faux comptes', dit: 'Ils ne jouent pas : ils déclarent 500 joueurs tombés et 500 pillages par nuit, pour fausser la mémoire.',
    predateur: [['joueur_tombe', 500], ['pillage', 500]], proie: [['joueur_tombe', 500], ['pillage', 500]] }
};
const ACTIONS = { rencontre: 'rencontres', prelevement: 'bêtes prises', capture: 'captures', nourrissage: 'nourrissages', blessure: 'bêtes blessées',
  effarouchement: 'fois tenue à distance', pillage: 'pillages', attaque: 'assauts', joueur_tombe: 'joueurs tombés' };
const MOYENS = { melee: 'au corps à corps', distance: 'à distance', piege: 'au piège', feu: 'par le feu', lumiere: 'par la lumière', bruit: 'par le bruit' };
const DISPOSITIONS = [
  { id: 'mefiance', nom: 'Méfiance', dit: 'le joueur est un danger', neutre: 0, seuil: () => Memoire.REGLES.attitudes.craintive },
  { id: 'habituation', nom: 'Habituation', dit: 'le joueur ne fait rien', neutre: 0, seuil: () => Memoire.REGLES.attitudes.familiere },
  { id: 'attrait', nom: 'Attrait', dit: 'le joueur vaut de la nourriture', neutre: 0, seuil: () => Memoire.REGLES.attitudes.seuil },
  { id: 'traque', nom: 'Traque', dit: 'le joueur est une proie', neutre: 0, seuil: () => Memoire.REGLES.attitudes.seuil },
  { id: 'neophobie', nom: 'Néophobie', dit: 'la peur du feu, des lumières, des pièges', neutre: .5, seuil: () => Memoire.REGLES.attitudes.alerte[0] },
  { id: 'agressivite', nom: 'Agressivité', dit: 'elle fait front au lieu de fuir', neutre: 0, seuil: () => Memoire.REGLES.attitudes.seuil }
];
// le caractère d'une lignée, dit en mots : pour chaque trait, le mot de chaque tiers (bas, entre les deux, haut)
const MOTS = { hardiesse: ['craintive', 'posée', 'hardie'], combativite: ['fuyarde', 'ni l\'un ni l\'autre', 'combative'], opportunisme: ['difficile', 'curieuse', 'opportuniste'] };
const motDe = (trait, v) => MOTS[trait][v < .34 ? 0 : v < .56 ? 1 : 2];
// ce que la population publie : ce qu'il faut pour lire son attitude, et celle de chacune de ses bêtes
const publie = b => ({ mefiance: b.m, habituation: b.h, memoire: Memoire.ecrire(b.M) || undefined });
const photo = (sim, b) => ({ nuit: sim.nuit, mefiance: b.m, habituation: b.h, attrait: b.M.a, traque: b.M.t, neophobie: b.M.o, agressivite: b.M.g, attitude: b.attitude });

const cle = (tid, bid) => tid + '|' + bid;
const clone = o => JSON.parse(JSON.stringify(o));
// le temps d'un calcul, les règles que le monde s'est choisies (monde.regles), comme dans son cycle : la méfiance et la mémoire
function avecRegles(inst, f) {
  const R = inst?.monde?.regles || {}, rendre = Memoire.regler(R.memoire), avant = Orvane.REGLES.mefiance;
  if (R.mefiance && typeof R.mefiance === 'object') Orvane.REGLES.mefiance = { ...avant, ...R.mefiance };
  try { return f(); } finally { Orvane.REGLES.mefiance = avant; rendre(); }
}

// --- une simulation : le monde lu (un instantané, entier ou réduit à quelques lieux : tampon/morceaux.js) et le profil de son tampon.
// Si le monde n'a pas encore éveillé la mémoire, elle l'est sur cette copie (le monde publié n'est pas touché).
function creer(inst, profil) {
  const eveille = !!inst?.monde?.memoire, I = eveille ? clone(inst) : Memoire.eveiller(inst).inst;
  return { inst: I, profil: profil || {}, eveille, nuit: 0, betes: new Map(), tampon: {}, journal: [] };
}
function etatDepart(sim, tid, bid) {
  const t = sim.inst.taxons.find(x => x.id === tid), p = t?.populations?.find(x => x.biome === bid); if (!t || !p) return null;
  const corps = avecRegles(sim.inst, () => Memoire.corpsDe(t.plan, Orvane.appetence)), M = Memoire.lire(p.memoire);
  const b = { cle: cle(tid, bid), taxon: t, biome: bid, lieu: sim.inst.biomes.find(x => x.id === bid)?.nom || bid, effectif: p.effectif, corps, role: corps > 0 ? 'predateur' : 'proie',
    za: Orvane.lireQ(p.quant)?.audace?.m || 0, variance: p.quant?.audace?.v > 0 ? p.quant.audace.v : 1, satiete: p.satiete ?? null,
    m: +p.mefiance || 0, h: +p.habituation || 0, M, attitude: p.attitude || null, histoire: [], declare: null, retenu: null };
  // son caractère (celui de sa lignée, déplacé par l'audace de cette population), et la part de ses bêtes dans chaque attitude
  b.caractere = avecRegles(sim.inst, () => Memoire.caractereDe(t.plan, b.za)); b.parts = avecRegles(sim.inst, () => Memoire.partage(publie(b), t.plan, b.variance));
  b.histoire.push(photo(sim, b));
  return b;
}
function suivre(sim, tid, bid) { const k = cle(tid, bid); if (sim.betes.has(k)) return sim.betes.get(k); const b = etatDepart(sim, tid, bid); if (b) sim.betes.set(k, b); return b; }
function lacher(sim, tid, bid) { sim.betes.delete(cle(tid, bid)); }
function recommencer(sim) { const L = [...sim.betes.values()].map(b => [b.taxon.id, b.biome]); sim.nuit = 0; sim.tampon = {}; sim.journal = []; sim.betes = new Map(); for (const [t, b] of L) suivre(sim, t, b); }

// les lots d'une nuit : un par joueur fictif. groupes : [{ style, n, jeu }] ; chaque joueur est un compte, chaque style un jeu
// (« simulateur-<style> », ou groupe.jeu) : ainsi la part d'un jeu (profil.influence.plafonds.part_max_jeu) joue comme dans le monde.
function lotsDe(sim, groupes) {
  const lots = [];
  for (const g of groupes || []) { const S = STYLES[g.style], n = Math.max(0, Math.min(200, Math.floor(g.n || 0))); if (!S || !n) continue;
    const ev = []; for (const b of sim.betes.values()) { const dit = (action, combien, moyen) => { if (combien >= 1) ev.push({ taxon: b.taxon.id, biome: b.biome, action, n: combien, ...(moyen ? { moyen } : {}) }); };
      for (const [action, combien, moyen] of S[b.role]) dit(action, combien, moyen);
      for (const [action, combien, moyen] of S.riposte || []) dit(action, Math.round(combien * (b.M.g || 0)), moyen); }   // (elle fait front : le jeu le raconte)
    if (!ev.length) continue;
    for (let i = 0; i < n; i++) lots.push({ orvane: sim.inst.orvane || '1.0', monde: sim.inst.monde.id, instantane: sim.inst.cycle?.n ?? 0, source: { jeu: g.jeu || 'simulateur-' + g.style, compte: g.style + '-' + (i + 1) }, evenements: ev }); }
  return lots;
}
// ce que des lots déclarent pour une bête, action par action (avant tout plafond)
function declare(lots, b) { const d = {}; for (const l of lots) for (const e of l.evenements) if (e.taxon === b.taxon.id && e.biome === b.biome) d[e.action] = (d[e.action] || 0) + e.n; return d; }

// --- une nuit : les lots, le tampon, puis pour chaque bête suivie ce que le moteur fait à la publication (moteur/orvane.js) :
// la méfiance et l'habituation (apprendre), la mémoire et l'attitude (memoire.js, publier), le journal ---
function nuit(sim, groupes) {
  const lots = lotsDe(sim, groupes), r = Tampon.agreger(lots, sim.inst, sim.profil, sim.tampon); sim.tampon = r.etat; sim.nuit++;
  avecRegles(sim.inst, () => {
    const ME = Memoire.preparer({ appetence: Orvane.appetence, mefiance: Orvane.apprendre }), alerte = Orvane.REGLES.mefiance.alerte;
    for (const b of sim.betes.values()) {
      const pr = r.pressions.taxons?.[b.taxon.id]?.[b.biome] || {}, ev = [], p = {};
      const [m, h] = ME.mefiance(b.taxon.plan, b.m, b.h, pr.contact, pr.vecu, b.za, b.M.g);
      if (m >= 1e-3) p.mefiance = +m.toFixed(3); if (h >= 1e-3) p.habituation = +h.toFixed(3);
      if (m >= alerte && b.m < alerte) ev.push({ type: 'mefiance', taxon: b.taxon.id, biome: b.biome, detail: `les bêtes se méfient des joueurs (${Math.round(m * 100)} %)` });
      ME.publier(b.taxon, b.biome, { M: { ...b.M }, Mp: { ...b.M }, att0: b.attitude || undefined, satiete: b.satiete }, p, pr.vecu, b.za, ev, b.lieu);
      // (d'une nuit à l'autre, le moteur relit ce qu'il a publié : arrondi compris)
      b.m = p.mefiance || 0; b.h = p.habituation || 0; b.M = Memoire.lire(p.memoire); b.attitude = p.attitude || null;
      b.declare = declare(lots, b); b.retenu = pr.vecu || null; b.parts = Memoire.partage(publie(b), b.taxon.plan, b.variance);
      b.histoire.push(photo(sim, b));
      for (const e of ev) sim.journal.push({ nuit: sim.nuit, bete: b.cle, nom: b.taxon.nom_commun || b.taxon.nom || b.taxon.id, type: e.type, detail: e.detail });
    }
  });
  return { lots: lots.length, recus: r.pressions.nombre || 0, rejetes: r.rejetes };
}

// --- ce qu'un jeu en ferait : Lisière, d'après ses règles du 13 novembre 2026 (son dépôt, scripts/bete.gd : _apprendre,
// _distance_fuite, _lisiere, _torche, _suivre, _front, blesser). Une lecture pour se figurer la conduite, pas la source : si
// Lisière change ses règles, c'est ce bloc qu'il faut reprendre. Les distances sont en pixels du jeu. d : les dispositions d'une
// population ou d'une de ses bêtes (Memoire.individu). ---
function lisiere(plan, d, premiereNuit = false) {
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));
  const crainte = borne(d.mefiance || 0, 0, 1), confiance = borne(d.habituation || 0, 0, 1), attrait = borne(d.attrait || 0, 0, 1) * (1 - crainte);
  let traque = borne(d.traque || 0, 0, 1), peurFeu = borne(((d.neophobie ?? .5) - .5) * 2, -1, 1);
  let agress = borne(d.agressivite || 0, 0, 1);
  if (premiereNuit) { traque *= .5; agress *= .5; peurFeu = Math.max(peurFeu, peurFeu * .5); }
  const flair = 90 + 230 * (plan.perception ?? .5), k = borne(Math.pow(1.8, crainte) * Math.pow(.55, confiance), .5, 1.8);
  const fuite = crainte <= 0 && confiance <= 0 ? flair : borne(flair * k, Math.min(flair, 60), Math.max(flair, 420));
  const audace0 = plan.temperament ?? .3, audace = traque > 0 || crainte > 0 ? borne(audace0 + .35 * traque - .35 * crainte, 0, Math.max(audace0, .95)) : audace0;
  return { flair: Math.round(flair), fuite: Math.round(fuite),                               // une proie s'enfuit quand la veilleuse approche à moins de…
    torche: Math.round(borne(145 - 35 * confiance + 60 * peurFeu, 100, 205)),                 // la torche tient un chasseur à…
    feu: +(.8 + Math.max(.25 * Math.max(peurFeu, 0), .15 * crainte)).toFixed(2),              // il se tient à cette part du rayon d'un feu (jamais moins de 0,8)
    passeTorche: audace >= .75 + .2 * Math.max(peurFeu, 0), passeTorche0: audace0 >= .75,     // assez hardi pour franchir la torche
    suit: +Math.max(.5 * attrait, .6 * traque).toFixed(2),                                    // la part du temps où un rôdeur suit la veilleuse
    charge: +(6 + 4 * traque).toFixed(1),                                                     // la durée d'une charge, en secondes
    // l'agressivité : une proie qui fait front ne fuit plus ; elle s'arrête à sa distance de fuite, et charge de plus près
    agressivite: agress, front: agress >= .4 && (plan.masse_kg || 1) >= 1, tient: agress >= .4 && (plan.masse_kg || 1) < 1,
    portee: Math.round(borne(fuite * (.3 + .5 * agress), 50, 200)), chargeFront: +(3 + 4 * agress).toFixed(1),
    lache: +(borne(.25 + .35 * crainte, 0, 1) * (1 - traque) * (1 - agress)).toFixed(2) };     // frappé, un chasseur lâche prise cette part des fois
}

const API = { STYLES, ACTIONS, MOYENS, DISPOSITIONS, MOTS, motDe, creer, suivre, lacher, recommencer, lotsDe, nuit, lisiere, cle };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneSimulateur = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
