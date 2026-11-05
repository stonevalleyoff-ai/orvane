// Orvane — LA GRAMMAIRE DES EFFETS ET DES CONDUITES (moteur/grammaire.js) — docs/32
// Jusqu'ici, un trait faisait ce que disait sa liste : un multiplicateur, une conduite parmi une quinzaine. Dans un monde à la
// grammaire éveillée, le monde compose des traits d'un genre neuf, comme des phrases :
//      un MOYEN (lumière, son, électricité, odeur, chaleur, couleur) + une ACTION (attirer, repousser, paralyser, appeler,
//      percevoir, tromper, réchauffer) + une CIBLE (la proie, le prédateur, les congénères, le partenaire, soi) + un MOMENT
//      (dans le noir, dans l'eau, au danger, la nuit, au froid)
// Un poisson des abysses qui luit pour attirer ses proies, une anguille qui les foudroie, une chauve-souris qui les entend dans
// le noir, une bête qui empeste qui l'approche, une luciole qui appelle son partenaire, une bête inoffensive aux couleurs d'une
// bête qui pique. Chaque phrase a :
//  - qui peut la dire : une anguille nage, une chauve-souris chasse ;
//  - où elle porte : une lueur dans le noir, une décharge dans l'eau ; le moteur la pèse lieu par lieu ;
//  - ce qu'elle fait : la chasse, la vulnérabilité, l'attrait (le choix du partenaire), la tolérance ; et ce qu'elle coûte ;
//  - un repli : une conduite que tous les jeux connaissent déjà (une lueur qui attire : percevoir de près ; une décharge : mordre
//    plus fort), et un signe (lueur, éclair, décharge, cri, écho, musc, parfum, chaleur, vapeur, couleurs) pour le jeu qui sait
//    le montrer. Un jeu qui ne connaît pas la grammaire joue le repli ; celui qui la connaît fait luire la bête.
// Le monde en invente, une phrase de temps en temps, chez une lignée qui peut la dire ; elle naît chez quelques-unes de ses
// bêtes, et la sélection fait le reste. Un monde sans grammaire n'en voit rien ; son hasard est le sien. Déterministe.
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const REGLES = { chance: .04, max: 60, part: .02, allele: .01, force: [.6, 1.4] };
const sansAccent = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const loco = p => p.locomotion || [], chair = p => p.diete ? (p.diete.insectes || 0) + (p.diete.viande || 0) + (p.diete.sang || 0) : p.regime === 'carnivore' ? 1 : p.regime === 'omnivore' ? .3 : 0;
const nage = p => loco(p).includes('nage'), terre = p => loco(p).some(l => ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe'].includes(l));
const nuit = p => p.activite === 'nocturne' ? 1 : p.activite === 'crepusculaire' ? .5 : 0;
// où une phrase porte : le noir (la lumière du lieu, l'heure de la bête), l'eau, la terre
const noir = (p, b) => Math.max(clamp((.55 - (b?.axes?.lumiere ?? .6)) / .45), nuit(p) * .8);
const eau = b => b?.milieu === 'marin' || b?.milieu === 'aquatique' ? 1 : b?.milieu === 'amphibie' ? .5 : 0;
const MODELES = new Set(['coloration-aposematique', 'glande-irritante', 'jet-glandulaire', 'dard']);   // ce qu'imite une bête qui bluffe
// LES PHRASES : moyen, action, cible, moment ; qui peut la dire ; où elle porte ; ce qu'elle fait (k : à pleine force et en plein
// lieu) ; ce qu'elle coûte ; son repli, son signe ; l'organe qui la dit, son présage
const PHRASES = {
  leurre:      { moyen: 'lumiere', action: 'attirer', cible: 'proie', moment: 'dans le noir', peut: p => chair(p) > 0 && (nuit(p) > 0 || nage(p)), ou: noir, chasse: .4, cout: .08,
                 repli: 'perception-proche', signe: 'lueur', organe: 'photophore', fem: 0, epi: ['pâle', 'bleuté', 'vert', 'ardent'], presage: 'une lueur qui danse devant sa gueule', couleur: [150, 255, 210] },
  lanterne:    { moyen: 'lumiere', action: 'appeler', cible: 'partenaire', moment: 'la nuit', peut: p => nuit(p) > 0 && (p.masse_kg || 1) < 1, ou: noir, attrait: .3, vuln: .1, cout: .05,
                 repli: 'alerte-groupe', signe: 'lueur', organe: 'lanternes', fem: 1, epi: ['pâles', 'dorées', 'vertes'], presage: 'des éclats de lumière, la nuit, comme des signaux', couleur: [255, 230, 120] },
  eclair:      { moyen: 'lumiere', action: 'repousser', cible: 'predateur', moment: 'au danger, dans le noir', peut: p => nuit(p) > 0 || nage(p), ou: noir, vuln: -.25, cout: .07,
                 repli: 'riposte-distance', signe: 'eclair', organe: 'photophores', fem: 0, epi: ['froids', 'aveuglants', 'blancs'], presage: 'un éclair froid jaillit de ses flancs', couleur: [230, 245, 255] },
  torpille:    { moyen: 'electricite', action: 'paralyser', cible: 'proie', moment: 'dans l\'eau', peut: p => nage(p) && chair(p) > 0, ou: (p, b) => eau(b), chasse: .5, cout: .12,
                 repli: 'morsure', signe: 'decharge', organe: 'organe électrique', fem: 0, epi: ['vif', 'puissant', 'sourd'], presage: 'l\'eau grésille autour d\'elle' },
  electrocuirasse: { moyen: 'electricite', action: 'repousser', cible: 'predateur', moment: 'dans l\'eau', peut: p => nage(p), ou: (p, b) => eau(b), vuln: -.35, cout: .1,
                 repli: 'defense-contact', signe: 'decharge', organe: 'plaques électriques', fem: 1, epi: ['vives', 'crépitantes'], presage: 'une décharge à qui la touche' },
  electrosens: { moyen: 'electricite', action: 'percevoir', cible: 'proie', moment: 'dans l\'eau trouble', peut: p => nage(p) && chair(p) > 0, ou: (p, b) => eau(b) * (1 - (b?.axes?.lumiere ?? .5) / 2), chasse: .2, cout: .05,
                 repli: 'perception-proche', signe: 'sens', organe: 'ampoules', fem: 1, epi: ['fines', 'profondes'], presage: 'elle fouille la vase sans la voir' },
  alarme:      { moyen: 'son', action: 'appeler', cible: 'congeneres', moment: 'au danger', peut: p => (p.sociabilite ?? 0) >= .4, ou: p => clamp(p.sociabilite ?? 0), vuln: -.2, cout: .04,
                 repli: 'alerte-groupe', signe: 'cri', organe: 'sac vocal', fem: 0, epi: ['strident', 'aigu', 'perçant'], presage: 'un cri strident, et tout le groupe détale' },
  echolocation: { moyen: 'son', action: 'percevoir', cible: 'proie', moment: 'dans le noir', peut: p => chair(p) > 0 && (loco(p).includes('vol') || nuit(p) > 0), ou: noir, chasse: .35, cout: .07,
                 repli: 'vision-nocturne', signe: 'echo', organe: 'larynx', fem: 0, epi: ['claquant', 'aigu', 'fin'], presage: 'de petits cris aigus, presque inaudibles' },
  grondement:  { moyen: 'son', action: 'repousser', cible: 'predateur', moment: 'au danger', peut: p => (p.masse_kg || 1) >= 1 && terre(p), ou: () => 1, vuln: -.12, cout: .04,
                 repli: 'charge', signe: 'cri', organe: 'gorge', fem: 1, epi: ['sourde', 'profonde', 'rauque'], presage: 'un grondement sourd qui fait reculer' },
  musc:        { moyen: 'odeur', action: 'repousser', cible: 'predateur', moment: 'au danger', peut: p => terre(p), ou: (p, b) => 1 - eau(b), vuln: -.3, cout: .09,
                 repli: 'riposte-distance', signe: 'musc', organe: 'glandes à musc', fem: 1, epi: ['âcres', 'fétides', 'lourdes'], presage: 'une odeur âcre monte quand on approche', couleur: [190, 196, 96] },
  pheromone:   { moyen: 'odeur', action: 'appeler', cible: 'partenaire', moment: 'à la saison des amours', peut: p => terre(p) || loco(p).includes('vol'), ou: (p, b) => 1 - eau(b) * .5, attrait: .35, cout: .04,
                 repli: 'alerte-groupe', signe: 'parfum', organe: 'glandes odorantes', fem: 1, epi: ['lourdes', 'sucrées', 'fauves'], presage: 'un parfum lourd flotte sur son chemin', couleur: [240, 170, 210] },
  mimetisme:   { moyen: 'odeur', action: 'tromper', cible: 'proie', moment: 'à l\'affût', peut: p => chair(p) > 0 && terre(p), ou: (p, b) => 1 - eau(b), chasse: .25, cout: .06,
                 repli: 'immobilite', signe: 'musc', organe: 'glandes odorantes', fem: 1, epi: ['trompeuses', 'douces'], presage: 'elle sent comme ce qu\'elle chasse', couleur: [170, 190, 140] },
  thermosens:  { moyen: 'chaleur', action: 'percevoir', cible: 'proie', moment: 'dans le noir', peut: p => chair(p) > 0 && (loco(p).includes('reptation') || nuit(p) > 0), ou: noir, chasse: .3, cout: .06,
                 repli: 'vision-nocturne', signe: 'thermo', organe: 'fossettes', fem: 1, epi: ['fines', 'profondes'], presage: 'elle tourne la tête vers ce qui est chaud, même dans le noir' },
  chaleur:     { moyen: 'chaleur', action: 'rechauffer', cible: 'soi', moment: 'au froid', peut: p => (p.niche?.temperature ?? .5) < .45, ou: () => 1, tolerance: .25, cout: .06,
                 repli: 'protection', signe: 'vapeur', organe: 'graisse brune', fem: 1, epi: ['épaisse', 'tiède'], presage: 'son souffle fume, même au gel' },
  bluff:       { moyen: 'couleur', action: 'tromper', cible: 'predateur', moment: 'au danger', peut: p => terre(p) || loco(p).includes('vol'), ou: (p, b, M) => M?.has(b?.id) ? 1 : .2, vuln: -.25, cout: .05,
                 repli: null, signe: 'couleurs', organe: 'robe', fem: 1, epi: ['criarde', 'vive', 'trompeuse'], presage: 'des couleurs d\'alerte, sans le venin qui va avec', couleur: [240, 200, 40] }
};
const MOYENS = { lumiere: 'la lumière', son: 'le son', electricite: 'l\'électricité', odeur: 'l\'odeur', chaleur: 'la chaleur', couleur: 'la couleur' };
const ACTIONS = { attirer: 'attire', repousser: 'repousse', paralyser: 'paralyse', appeler: 'appelle', percevoir: 'perçoit', tromper: 'trompe', rechauffer: 'réchauffe' };
const CIBLES = { proie: 'ses proies', predateur: 'ses prédateurs', congeneres: 'les siens', partenaire: 'son partenaire', soi: 'son corps' };

function generateur(g) { g = (g >>> 0) || 1; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; }
// le trait d'une phrase, à une force donnée
function definir(cle, f, R, pris = new Set()) {
  const P = PHRASES[cle], k0 = Math.floor(R() * P.epi.length), L = [...P.epi.slice(k0), ...P.epi.slice(0, k0)], epi = L.find(e => !pris.has(sansAccent(`${P.organe} ${e}`))) || L[0];   // (les épithètes sont déjà au genre et au nombre de l'organe)
  const nom = `${P.organe} ${epi}`, k = +f.toFixed(2);
  const t = { domaine: P.action === 'percevoir' ? 'sens' : P.cible === 'proie' ? 'offense' : P.cible === 'predateur' ? 'defense' : P.cible === 'soi' ? 'metabolisme' : 'social', nom,
    organe: nom, cout: +(P.cout * f).toFixed(3),
    effet: `${MOYENS[P.moyen]} ${ACTIONS[P.action] === 'perçoit' ? 'lui fait percevoir' : 'qui ' + ACTIONS[P.action]} ${CIBLES[P.cible]}, ${P.moment}`.replace(/^./, c => c.toUpperCase()),
    grammaire: { phrase: cle, moyen: P.moyen, action: P.action, cible: P.cible, moment: P.moment, signe: P.signe, force: k, ...(P.couleur ? { couleur: P.couleur.slice() } : {}) } };
  if (P.attrait) t.attrait = +(1 + P.attrait * f).toFixed(3);
  if (P.tolerance) t.ecarts = { tolerance: +(1 + P.tolerance * f).toFixed(3) };
  if (P.repli) t.conduite = { type: P.repli, effet: P.moyen, force: +(1 + .25 * f).toFixed(2), presage: P.presage, grammaire: { ...t.grammaire } };
  else t.conduite = { type: 'aucun', presage: P.presage, grammaire: { ...t.grammaire } };
  return t;
}

// --- le cycle : ce que pèse une phrase, lieu par lieu (la chasse, la vulnérabilité) ---
function preparer(ctx) {
  const { cat, taxons = [] } = ctx, G = {}; for (const [id, T] of Object.entries(cat)) if (T?.grammaire && PHRASES[T.grammaire.phrase]) G[id] = T;
  if (!Object.keys(G).length) return null;
  // les lieux où vit un modèle qu'imite le bluff : une bête qui pique, qui brûle, qui l'affiche
  const M = new Set(); for (const t of taxons) { if (t.eteint) continue; const f = t.phenotypes.reduce((a, p) => a + (p.traits.some(x => MODELES.has(x)) ? p.frequence || 0 : 0), 0); if (f >= .1) for (const p of t.populations) if (p.effectif > 0) M.add(p.biome); }
  const cache = new Map();
  const facteur = (t, b, i, k) => { const tr = t.phenotypes[i]?.traits; if (!tr || !tr.some(x => G[x])) return 1; const c = t.id + '|' + i + '|' + b?.id + '|' + k; if (cache.has(c)) return cache.get(c);
    let f = 1; for (const x of tr) { const T = G[x]; if (!T) continue; const P = PHRASES[T.grammaire.phrase], v = P[k]; if (!v) continue; f *= 1 + v * T.grammaire.force * clamp(P.ou(t.plan, b, M)); }
    cache.set(c, f); return f; };
  // ce que la lignée atteint, en moyenne de ses phénotypes : une lueur, une décharge mettent plus de proies à sa portée
  const acces = (t, b) => { const c = t.id + '|' + b?.id + '|acces'; if (cache.has(c)) return cache.get(c); let s = 0, w = 0;
    t.phenotypes.forEach((p, i) => { const f = p.frequence || 0; s += f * facteur(t, b, i, 'chasse'); w += f; }); const r = w > 0 ? s / w : 1; cache.set(c, r); return r; };
  return { chasse: (t, b, i) => facteur(t, b, i, 'chasse'), vuln: (t, b, i) => facteur(t, b, i, 'vuln'), acces };
}

// --- l'invention d'une phrase : parfois, une lignée qui peut la dire la dit ---
function inventer(ctx) {
  const { sortie, biomes, n, graine, inventes = {} } = ctx, ev = [], neufs = {};
  const R = generateur(((graine >>> 0) ^ 0x6c8e9cf5) ^ Math.imul(n + 11, 0x2545f491));
  const dits = Object.values(inventes).filter(x => x.grammaire); if (dits.length >= REGLES.max || R() >= REGLES.chance) return { traits: neufs, evenements: ev };
  const usage = k => dits.filter(x => x.grammaire.phrase === k).length, cand = [];
  for (const t of sortie) { if (t.eteint || ['vegetal', 'synthetique'].includes(t.plan?.regime)) continue; const N = t.populations.reduce((a, p) => a + p.effectif, 0); if (!(N > 0)) continue;
    const b = biomes[t.populations.slice().sort((x, y) => y.effectif - x.effectif)[0]?.biome];
    for (const [k, P] of Object.entries(PHRASES)) if (P.peut(t.plan) && P.ou(t.plan, b, null) >= .3 && !t.phenotypes.some(p => p.traits.some(x => inventes[x]?.grammaire?.phrase === k))) cand.push({ t, k, w: Math.sqrt(N) / (1 + 3 * usage(k)) }); }
  if (!cand.length) return { traits: neufs, evenements: ev };
  let u = R() * cand.reduce((a, c) => a + c.w, 0), c = cand[0]; for (const x of cand) { u -= x.w; if (u <= 0) { c = x; break; } }
  const f = REGLES.force[0] + (REGLES.force[1] - REGLES.force[0]) * R(), def = definir(c.k, f, R, new Set([...Object.keys(inventes), ...Object.keys(ctx.cat || {})]));   // (un nom libre, si l'organe en a)
  if (inventes[sansAccent(def.nom)] || ctx.cat?.[sansAccent(def.nom)]) { def.nom = `${def.nom} de ${(c.t.nom || c.t.id).split(' ')[0]}`; def.organe = def.nom; }   // (tous les noms de l'organe sont pris : celui de la lignée)
  let id = sansAccent(def.nom); for (let j = 2; inventes[id] || ctx.cat?.[id]; j++) id = `${sansAccent(def.nom)}-${j}`;
  def.origine = { lignee: c.t.id, cycle: n, de: [] }; neufs[id] = def;
  const L = c.t, k = REGLES.part;
  for (const p of L.phenotypes.slice()) { if (!(p.frequence > 0)) continue; const traits = [...p.traits, id].sort(), q = { id: traits.join('+'), traits, frequence: +(p.frequence * k).toFixed(6), cout_total: +((p.cout_total || 0) + def.cout).toFixed(3) };
    if (p.frequence_par_biome) q.frequence_par_biome = Object.fromEntries(Object.entries(p.frequence_par_biome).map(([b, v]) => [b, +(v * k).toFixed(6)]));
    if (!L.phenotypes.some(x => x.id === q.id)) { L.phenotypes.push(q); p.frequence = +(p.frequence * (1 - k)).toFixed(6); if (p.frequence_par_biome) for (const b in p.frequence_par_biome) p.frequence_par_biome[b] = +(p.frequence_par_biome[b] * (1 - k)).toFixed(6); } }
  for (const p of L.populations) if (p.alleles) p.alleles[id] = REGLES.allele;
  ev.push({ type: 'invention', taxon: L.id, biome: L.populations.slice().sort((a, b) => b.effectif - a.effectif)[0]?.biome, detail: `le monde invente « ${def.nom} » chez ${L.nom || L.id} : ${def.effet.toLowerCase()}` });
  return { traits: neufs, evenements: ev };
}

function eveiller(inst) { const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.grammaire) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, grammaire: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => t.plan?.regime !== 'vegetal')?.id, detail: 'le monde a désormais une grammaire : ses lignées peuvent luire, foudroyer, empester, appeler, entendre dans le noir' }] }; }

const API = { REGLES, PHRASES, MOYENS, eveiller, preparer, inventer, definir, noir, eau };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneGrammaire = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
