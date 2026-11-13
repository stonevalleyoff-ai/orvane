// Orvane — LA MÉMOIRE : CE QUE LES BÊTES APPRENNENT DES JOUEURS (moteur/memoire.js) — docs/50
// La sélection fait évoluer les corps ; la mémoire fait évoluer les conduites. Par population (une lignée dans un lieu), le monde
// retient ce que ses bêtes ont vécu des joueurs, tous jeux confondus, et en tire quelques dispositions que chaque jeu rend à sa
// façon. La méfiance et l'habituation (docs/12) en étaient les deux premières ; la mémoire en ajoute trois :
//  - l'attrait : le joueur et son camp valent de la nourriture (on la nourrit, elle pille) ;
//  - la traque : le joueur lui-même est une proie (elle attaque, des joueurs tombent) ; seulement chez qui mange de la chair ;
//  - la néophobie : la peur des choses des joueurs, le feu, la lumière, les pièges. Neutre à 0,5 : au-dessus, le feu tient mieux
//    et les pièges ne prennent plus ; en dessous, la bête s'y est accoutumée.
// Les jeux racontent (des comptes bruts : schemas/pression.schema.json), le tampon plafonne (tampon/tampon.js : « vecu »), le
// moteur apprend (ici). Une disposition est apprise, pas héritée : elle retombe quand les joueurs s'en vont, voyage à moitié avec
// les migrants, et suit une lignée qui se sépare. L'audace, elle, reste dans les gènes (docs/8) et règle la vitesse de tout le reste.
// La mémoire ne change rien à la simulation : mêmes effectifs, au caractère près, qu'elle soit éveillée ou non. C'est le jeu
// qui la rend, et la boucle se ferme par lui. Un monde sans mémoire (monde.memoire) n'en voit rien. Aucun hasard.
// Déterministe. Node (require) ou navigateur (globalThis.OrvaneMemoire).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), r4 = v => +(+v).toFixed(4), fini = x => typeof x === 'number' && Number.isFinite(x);
const REGLES = {
  pas: .35,                    // le plus grand pas d'une disposition en un cycle : rien ne bascule en une nuit
  voyage: .5,                  // ce que des migrants emportent de la mémoire de leur population (la peur tient au lieu)
  seuil: .005,                 // sous cet écart à la valeur neutre, une disposition n'est plus publiée : l'oubli a une fin
  joueur_kg: 70,               // ce que pèse un joueur, pour qui pourrait en faire une proie
  audace: .5,                  // une population audacieuse (docs/8) apprend la peur moins vite, le reste plus vite
  blessure: 2,                 // ce qu'une bête blessée pèse de danger, contre 1 pour une bête prise : la survivante apprend, et montre
  // l'attrait : retombe de moitié en demi_vie cycles ; sensibilite : ce que pèse la part des contacts qui nourrissent ; preuve :
  // l'échelle des contacts (plus ils sont nombreux, plus il va vite, jamais plus que « pas ») ; pillage : un pillage contre un nourrissage ; mal : ce que pèse le mal subi ;
  // opportuniste : chez un omnivore ou un charognard ; faim : chez un mangeur de chair mal nourri ; extinction : la vitesse à
  // laquelle des visites sans gain le défont (contre 1 pour l'apprendre)
  attrait: { demi_vie: 10, sensibilite: 4, preuve: 60, pillage: 1.5, mal: 3, opportuniste: 1.3, faim: .5, extinction: .5 },
  // la traque : sensibilite : ce que pèse la part des assauts où un joueur tombe ; preuve : l'échelle des assauts (plus ils sont
  // nombreux, plus elle va vite) ; mal : ce que pèse le mal subi, effarouchement : un assaut arrêté sans mal, rencontre : une
  // rencontre sans assaut (elle dit aussi que le joueur n'est pas une proie : sans elle, deux joueurs tombés suffiraient face à
  // cent passants) ; petits : le plafond d'un mangeur de chair pour qui un joueur n'est pas à sa taille, meute : ce que pèse la vie
  // en groupe dans cette taille
  traque: { demi_vie: 10, sensibilite: 4, preuve: 6, mal: 3, effarouchement: .1, rencontre: .1, petits: .6, meute: 3, faim: .5 },
  // la néophobie : revient vers neutre de moitié en demi_vie cycles ; sensibilite : ce que pèse la part des contacts où un
  // dispositif fait mal — elle va vers cette part, comme la méfiance vers la part des contacts qui finissent mal (un seul joueur à
  // ses pièges ne rend pas craintive une population que cent autres croisent) ; preuve : le mal fait par un dispositif qui l'y
  // mène aux deux tiers ; habitude : l'échelle des effarouchements sans mal qui la défont, pesés par leur part dans ce que la
  // population vit des joueurs (un seul joueur à son feu ne l'accoutume pas vite non plus) ; pillage : un pillage contre un
  // effarouchement ; paix : combien le mal subi (de la main du joueur aussi) empêche de s'accoutumer à ce qui arrête : un feu
  // que des joueurs défendent reste un feu qu'on craint
  neophobie: { neutre: .5, demi_vie: 20, sensibilite: 60, preuve: 12, habitude: 120, pillage: 3, paix: 20 },
  // l'attitude, le mot qui résume : seuil (traque, attrait), mefiance (au-dessus, une traqueuse n'est que rôdeuse), craintive,
  // familiere, defensive (la masse, en joueurs, d'une bête qui fait front au lieu de fuir) ; alerte : les seuils de néophobie
  // d'un événement
  attitudes: { seuil: .4, mefiance: .4, craintive: .5, familiere: .5, defensive: 1.5, alerte: [.25, .75] }
};
// ce qu'un jeu lit : chaque disposition, sa valeur neutre (celle d'une population qui ne la publie pas), ce qu'un jeu en montre
const DISPOSITIONS = {
  attrait: { nom: 'l\'attrait', neutre: 0, effet: 'le joueur et son camp valent de la nourriture : elle approche, quémande, pille',
    presage: 'elle tourne autour des réserves, sans s\'enfuir' },
  traque: { nom: 'la traque', neutre: 0, effet: 'le joueur est une proie : elle le suit, revient après un coup, ose davantage',
    presage: 'la même bête, toujours au bord de la vue' },
  neophobie: { nom: 'la néophobie', neutre: .5, effet: 'au-dessus de 0,5, elle craint le feu, la lumière, les pièges ; en dessous, elle s\'y est accoutumée',
    presage: 'elle flaire longtemps ce que les joueurs ont posé, ou n\'y prend plus garde' }
};
const ATTITUDES = {
  traqueuse: { nom: 'traqueuse', quand: 'elle a appris que le joueur est une proie, et ne le craint pas' },
  rodeuse: { nom: 'rôdeuse', quand: 'attirée par le joueur ou par ce qu\'il porte, mais elle s\'en méfie : elle tourne, de loin' },
  quemandeuse: { nom: 'quémandeuse', quand: 'elle attend du joueur sa nourriture' },
  defensive: { nom: 'défensive', quand: 'elle se méfie, et elle est de taille à faire front' },
  fuyante: { nom: 'fuyante', quand: 'elle se méfie, et fuit de loin' },
  familiere: { nom: 'familière', quand: 'habituée aux joueurs, elle les laisse approcher' }
};
const CLES = Object.keys(DISPOSITIONS), neutre = k => k === 'neophobie' ? REGLES.neophobie.neutre : 0;
// la part de chair dans ce qu'elle mange (son spectre, docs/30 ; sinon son régime)
const chair = p => { const d = p.diete ? (p.diete.insectes || 0) + (p.diete.viande || 0) + (p.diete.sang || 0) : 0; return d > 0 ? d : p.regime === 'carnivore' ? 1 : p.regime === 'omnivore' || p.regime === 'detritivore' ? .3 : 0; };
const horsMemoire = p => !p || p.regime === 'vegetal' || p.regime === 'synthetique';   // (les machines ont leur Mère, docs/16)
// les règles qu'un monde se choisit (regles.memoire), le temps de son cycle : seulement celles que ce fichier connaît, et de la
// même forme (un nombre pour un nombre, une liste de nombres de même longueur) ; le reste est ignoré. Rend de quoi les remettre.
const propre = (o, k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && Object.prototype.hasOwnProperty.call(o, k);
const meme = (b, v) => typeof b === 'number' ? fini(v) : Array.isArray(b) ? Array.isArray(v) && v.length === b.length && v.every(fini) : false;
const regler = o => { if (!o || typeof o !== 'object' || Array.isArray(o)) return () => {}; const avant = {};
  for (const k of Object.keys(o)) { if (!propre(REGLES, k)) continue; const v = o[k], b = REGLES[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) { if (!v || typeof v !== 'object' || Array.isArray(v)) continue; const x = { ...b };
      for (const c of Object.keys(v)) if (propre(b, c) && meme(b[c], v[c])) x[c] = Array.isArray(v[c]) ? v[c].slice() : v[c];
      avant[k] = b; REGLES[k] = x; }
    else if (meme(b, v)) { avant[k] = b; REGLES[k] = v; } }
  return () => { for (const k of Object.keys(avant)) REGLES[k] = avant[k]; }; };

function eveiller(inst) { const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.memoire) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, memoire: { depuis: out.cycle?.n ?? 0 } };
  const L = out.taxons.filter(t => !t.eteint && !horsMemoire(t.plan));   // (un monde sans bête : elle s'éveille sans le dire, un événement veut une lignée)
  return { inst: out, evenements: L.length ? [{ type: 'eveil', taxon: L[0].id, detail: `la mémoire s'éveille : ${L.length} lignées retiennent désormais ce que les joueurs leur font` }] : [] }; }

// --- l'état d'une population : { a : l'attrait, t : la traque, o : la néophobie } ---
const lire = m => ({ a: clamp(+m?.attrait || 0), t: clamp(+m?.traque || 0), o: m?.neophobie != null && Number.isFinite(+m.neophobie) ? clamp(+m.neophobie) : neutre('neophobie') });
const ecrire = M => { const o = {}; if (!M) return null;
  if (M.a >= REGLES.seuil) o.attrait = r4(M.a); if (M.t >= REGLES.seuil) o.traque = r4(M.t);
  if (Math.abs(M.o - neutre('neophobie')) >= REGLES.seuil) o.neophobie = r4(M.o);
  return Object.keys(o).length ? o : null; };
// ce que des migrants apportent à la population qui les reçoit : ils emportent la moitié de l'écart de leur population à la
// valeur neutre (REGLES.voyage), et la population devient la moyenne, par les effectifs, de ce qu'elle savait et de ce qu'ils
// emportent. Les arrivées d'un cycle s'additionnent d'abord (recevoir), puis se mêlent une fois (installer) : le résultat ne
// dépend pas de l'ordre où elles arrivent. meler(Ma, na, Mb, nb) : la même chose pour une seule arrivée.
const porte = (B, nb) => { const v = REGLES.voyage, z = neutre('neophobie'), b = B || lire(null); return { nb, a: nb * v * b.a, t: nb * v * b.t, o: nb * (z + v * (b.o - z)) }; };
const moyenne = (Ma, na, X) => { const A = Ma || lire(null), N = na + X.nb; return N > 0 ? { a: (A.a * na + X.a) / N, t: (A.t * na + X.t) / N, o: (A.o * na + X.o) / N } : Ma; };
function meler(Ma, na, Mb, nb) { return nb > 0 ? moyenne(Ma, Math.max(0, na), porte(Mb, nb)) : Ma; }
// D : l'état de cycle de la population qui reçoit (n0 : ceux qui étaient là avant toute arrivée de ce cycle) ; Mb : la mémoire de
// celle d'où ils viennent. Les hivernants et les bêtes d'élevage n'y passent pas : ils ne portent ni ne diluent rien.
function recevoir(D, Mb, nb) { if (!(nb > 0)) return; const X = D.Mx ??= { n0: D.n0 ?? D.N.reduce((a, x) => a + x, 0), nb: 0, a: 0, t: 0, o: 0 }, p = porte(Mb, nb); X.nb += nb; X.a += p.a; X.t += p.t; X.o += p.o; }
function installer(D) { if (!D.Mx) return; D.M = moyenne(D.M, D.Mx.n0, D.Mx); delete D.Mx; }

// qui pourrait faire d'un joueur sa proie, de 0 à 1 : rien chez qui ne mange pas de chair ; « petits » chez un mangeur de chair
// pour qui un joueur n'est pas à sa taille (trop gros pour un renard, trop petit pour un géant) ; jusqu'à 1 chez celui dont il est
// la proie idéale, seul ou en meute (la masse d'une meute : la sienne × (1 + meute × sociabilité) ; le meilleur des deux)
function corpsDe(plan, appetence) {
  if (!(chair(plan) > 0)) return 0;
  const T = REGLES.traque, joueur = { masse_kg: REGLES.joueur_kg, taille_m: 1.7, vitesse_rel: 3, sociabilite: 0 }, m = plan.masse_kg || 1;
  const pj = appetence ? Math.max(appetence(plan, joueur) || 0, appetence({ ...plan, masse_kg: m * (1 + T.meute * (plan.sociabilite || 0)) }, joueur) || 0) : 0;
  return clamp(T.petits + (1 - T.petits) * Math.min(1, pj));
}

// --- apprendre : la mémoire d'une population, un cycle plus tard ---
// M : son état ; v : ce qu'elle a vécu des joueurs ce cycle, plafonné par le tampon (« vecu » : rencontres, prises, blessures,
// dispositif, effarouchements, nourrissages, pillages, attaques, tombes) ; x : { plan, za : son audace moyenne z, satiete, corps }
function apprendre(M, v, x = {}) {
  const A = REGLES.attrait, T = REGLES.traque, N = REGLES.neophobie, plan = x.plan || {}, de = k => { const n = +v?.[k]; return Number.isFinite(n) && n > 0 ? n : 0; };
  const R = de('rencontres'), D = de('prises'), B = de('blessures'), P = Math.min(de('dispositif'), D + B), E = de('effarouchements'), F = de('nourrissages'), G = de('pillages'), K = de('attaques'), V = de('tombes');
  const ka = Math.exp(-REGLES.audace * clamp(x.za || 0, -3, 3));   // < 1 chez une population audacieuse (comme la méfiance, docs/12)
  const kf = chair(plan) > 0 && x.satiete != null ? 1 + A.faim * (1 - clamp(x.satiete)) : 1, mal = D + REGLES.blessure * B;
  const s = { a: M.a, t: M.t, o: M.o };
  // l'attrait : la part des contacts qui nourrissent ; des visites sans gain l'éteignent, le mal subi plus vite encore
  s.a *= 2 ** (-1 / A.demi_vie);
  { const gain = F + A.pillage * G, tot = gain + R + E + A.mal * mal;
    if (tot > 0) { const opp = plan.regime === 'omnivore' || plan.regime === 'detritivore' ? A.opportuniste : 1, cible = 1 - Math.exp(-A.sensibilite * kf * opp * gain / tot),
      e = Math.min(REGLES.pas, 1 - Math.exp(-(gain + R + E + mal) / (A.preuve * ka)));
      s.a += e * (cible - s.a) * (cible > s.a ? 1 : A.extinction); } }
  // la traque : la part des assauts où un joueur tombe ; le mal subi et les assauts vains la défont ; l'attrait y mène plus vite
  s.t *= 2 ** (-1 / T.demi_vie);
  const corps = clamp(+x.corps || 0);
  { const essais = Math.max(K, V) + T.rencontre * R + T.effarouchement * E + T.mal * mal;
    if (corps > 0 && essais > 0) { const kt = chair(plan) > 0 && x.satiete != null ? 1 + T.faim * (1 - clamp(x.satiete)) : 1, cible = corps * (1 - Math.exp(-T.sensibilite * kt * V / essais)),
      e = Math.min(REGLES.pas, 1 - Math.exp(-(Math.max(K, V) + mal) * (1 + s.a) / (T.preuve * ka)));
      s.t += e * (cible - s.t); } }
  // la néophobie : le mal fait par un dispositif la monte, vers ce que dit sa part dans ce que la population vit des joueurs et
  // de leurs choses (d'autant plus vite qu'il est nombreux) ; ce qui l'arrête sans mal, et ce qu'elle pille, l'y accoutument,
  // tant que les joueurs ne lui font pas de mal par ailleurs. Rien ici ne dépend du seul nombre : comme le reste de la mémoire
  s.o = N.neutre + (s.o - N.neutre) * 2 ** (-1 / N.demi_vie);
  { const calme = E + N.pillage * G, part = calme > 0 ? calme / (calme + R) : 0;
    if (P > 0) { const cible = N.neutre + (1 - N.neutre) * (1 - Math.exp(-N.sensibilite * P / (P + R + calme))); if (cible > s.o) s.o += (cible - s.o) * (1 - Math.exp(-P * ka / N.preuve)); }
    if (calme > 0) s.o -= s.o * Math.exp(-N.paix * mal / (mal + calme)) * (1 - Math.exp(-calme * part / (N.habitude * ka))); }
  for (const k of ['a', 't', 'o']) s[k] = clamp(clamp(s[k], M[k] - REGLES.pas, M[k] + REGLES.pas));
  s.t = Math.min(s.t, corps);   // (un corps qui ne peut pas faire d'un joueur sa proie ne garde pas une traque héritée)
  return s;
}

// --- l'attitude : le mot qui résume une population (ses dispositions, sa méfiance, son habituation) ; null : rien de marqué ---
function attitude(p, plan) {
  if (horsMemoire(plan)) return null;
  const S = REGLES.attitudes, m = +p?.mefiance || 0, h = +p?.habituation || 0, a = +p?.memoire?.attrait || 0, t = +p?.memoire?.traque || 0;
  if (t >= S.seuil && m < S.mefiance) return 'traqueuse';
  if ((t >= S.seuil || a >= S.seuil) && m >= S.mefiance) return 'rodeuse';
  if (a >= S.seuil) return 'quemandeuse';
  if (m >= S.craintive) return (plan?.masse_kg || 1) >= S.defensive * REGLES.joueur_kg ? 'defensive' : 'fuyante';
  if (h >= S.familiere) return 'familiere';
  return null;
}
const TEXTES = { traqueuse: 'les bêtes ont appris que le joueur est une proie', rodeuse: 'les bêtes rôdent autour des joueurs, sans oser', quemandeuse: 'les bêtes attendent des joueurs leur nourriture' };

// --- le cycle : ce que le moteur demande à la mémoire (monde.memoire éveillée) ---
// preparer({ appetence }) → { lire, recevoir, installer, danger, publier } ; rien n'y touche aux effectifs
function preparer(ctx = {}) {
  const corps = new Map(), corpsLu = t => { if (!corps.has(t.id)) corps.set(t.id, corpsDe(t.plan, ctx.appetence)); return corps.get(t.id); };
  return {
    lire, recevoir, installer,
    // ce que les blessures ajoutent au danger que connaît la méfiance (docs/12) : c = { rencontres, danger, aide }
    danger: (c, v) => { const B = +v?.blessures; return Number.isFinite(B) && B > 0 ? { rencontres: +c?.rencontres || 0, danger: (+c?.danger || 0) + REGLES.blessure * B, aide: +c?.aide || 0 } : c; },
    // p : la population telle qu'elle va être publiée (sa méfiance du cycle y est déjà) ; pop : son état de cycle (M : sa
    // mémoire, mêlée de celle de ses migrants ; Mp : celle qu'elle publiait au cycle d'avant, absente d'une population née ce
    // cycle ; att0 : son attitude d'avant) ; v : ce qu'elle a vécu ; ev : le journal
    publier(t, bid, pop, p, v, za, ev, nomLieu) {
      if (horsMemoire(t.plan)) return;
      const M = apprendre(pop.M || lire(null), v, { plan: t.plan, za, satiete: pop.satiete, corps: corpsLu(t) }), Mp = pop.Mp;
      // rien ne bascule en une nuit, migrants compris : le pas se compte depuis ce que la population publiait
      if (Mp) for (const k of ['a', 't', 'o']) M[k] = clamp(M[k], Math.max(0, Mp[k] - REGLES.pas), Math.min(1, Mp[k] + REGLES.pas));
      const m = ecrire(M); if (m) p.memoire = m;
      const att = attitude(p, t.plan); if (att) p.attitude = att;
      if (!ev) return;
      const ou = nomLieu ? ` à ${nomLieu}` : '', pc = x => Math.round(x * 100);
      if (att && att !== pop.att0 && TEXTES[att]) ev.push({ type: 'memoire', taxon: t.id, biome: bid, detail: `${TEXTES[att]}${ou} (${att === 'quemandeuse' ? `attrait ${pc(M.a)}` : att === 'traqueuse' ? `traque ${pc(M.t)}` : `méfiance ${pc(p.mefiance || 0)}`} %)` });
      // (les seuils se lisent sur ce qui est publié, d'un cycle à l'autre : une valeur qui tombe pile dessus ne passe pas inaperçue)
      const [bas, haut] = REGLES.attitudes.alerte, o1 = lire(m).o, o0 = (Mp || lire(null)).o;
      if (o1 <= bas && o0 > bas) ev.push({ type: 'memoire', taxon: t.id, biome: bid, detail: `les bêtes ne craignent plus le feu ni la lumière des joueurs${ou} (néophobie ${pc(o1)} %)` });
      if (o1 >= haut && o0 < haut) ev.push({ type: 'memoire', taxon: t.id, biome: bid, detail: `les bêtes se défient de ce que posent les joueurs${ou} : le feu, les pièges (néophobie ${pc(o1)} %)` });
    }
  };
}

// --- la vue par biome d'une population faite de parcelles (moteur/parcelles.js) : la moyenne par les effectifs, une parcelle
// qui ne publie rien comptant pour sa valeur neutre (et non pour absente : une parcelle marquée ne fait pas tout le biome) ---
function regrouper(L, poids) {
  if (!L.some(p => p.memoire)) return null;
  const W = poids.reduce((s, x) => s + x, 0) || 1, M = { a: 0, t: 0, o: 0 };
  L.forEach((p, i) => { const x = lire(p.memoire); for (const k in M) M[k] += x[k] * poids[i] / W; });
  return ecrire(M);
}
// (la valeur neutre de la néophobie est celle des règles du monde, le temps de son cycle)
const catalogue = () => { const d = JSON.parse(JSON.stringify(DISPOSITIONS)); d.neophobie.neutre = neutre('neophobie'); return { dispositions: d, attitudes: JSON.parse(JSON.stringify(ATTITUDES)) }; };

const API = { REGLES, DISPOSITIONS, ATTITUDES, CLES, eveiller, preparer, lire, ecrire, meler, recevoir, installer, apprendre, attitude, corpsDe, regrouper, catalogue, regler };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneMemoire = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
