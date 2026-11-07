// Orvane — LA CHRONIQUE, LE MUSÉUM, LES NOMS (moteur/chronique.js) — docs/37
// Le moteur oublie : un cycle n'a que ses événements, un taxon éteint ne reste listé que dix cycles. Ce fichier garde
// l'histoire du monde, sans jamais toucher à la simulation (rien de ce qu'il fait ne change un effectif) :
//  - la chronique : un journal durable de ce qui compte (les naissances et les extinctions de lignées, les catastrophes, les
//    souches nouvelles, les traits inventés, les lieux qui changent de nature, les âges du climat, les éveils, les fusions,
//    les records, les noms donnés par les joueurs), chaque entrée datée, rangée par année du monde, avec son importance (1 à 3) ;
//  - le muséum : un spécimen type par lignée, décrit le jour où le monde la voit pour la première fois (son plan, sa silhouette,
//    ses traits, une bête tirée de la population réelle), gardé après son extinction, avec sa cause : l'arbre de la vie entier ;
//  - les noms : le premier joueur qui décrit une lignée lui donne son nom commun (docs/37). Le nom du moteur reste.
// Rien de tout cela n'entre dans le cycle : hebergement/cycle.js l'appelle après, et publie chronique/ et museum.json.
//   noter(etat, avant, apres, opt)        → { etat, entrees }    les entrées de la chronique pour ce cycle (etat : ce qu'elle a déjà vu)
//   decrire(museum, inst, opt)            → { museum, nouveaux }   les spécimens des lignées que le muséum n'a pas encore
//   fossiliser(museum, avant, apres)      → { museum, eteints }    les lignées éteintes ce cycle : leur date, leur durée, leur cause
//   nommer(museum, propositions, opt)     → { museum, retenus, refuses, entrees }   le premier nom valable de chaque lignée
//   publier(inst, museum)                 → inst, avec nom_commun et decrit pour les lignées nommées (un nouvel objet)
//   annee(n, inst)                        → l'année du monde d'un cycle (chronique/<an>.json)
//   dedoublonner(inst, museum)            → { inst, renommees }   une lignée neuve ne reprend jamais l'identifiant d'une éteinte
// Node (require) ou navigateur (globalThis.OrvaneChronique). Zéro dépendance (tampon/individus.js s'il est là, pour le spécimen).
(function (racine) {
'use strict';
const Individus = typeof module !== 'undefined' && module.exports ? (() => { try { return require('../tampon/individus.js'); } catch (e) { return null; } })() : racine.OrvaneIndividus;

const REGLES = {
  derniers: 60,              // les dernières entrées gardées dans l'index (chronique/index.json), pour un jeu pressé
  annee: 120,                // la durée d'une année, si le monde n'en a pas (monde.annee)
  nom: { min: 2, max: 40 },  // un nom commun : de 2 à 40 lettres, espaces, apostrophes, traits d'union
  cause: { pression: .35, predation: .5, maladie: .35 }   // la part des morts qui fait la cause d'une extinction
};
// l'importance d'une entrée : 3, ce qu'un jeu devrait annoncer ; 2, ce qu'un carnet raconte ; 1, ce qu'un registre garde
const TITRES = {
  naissance: 'Une lignée naît', extinction: 'Une lignée s\'éteint', catastrophe: 'Catastrophe', souche: 'Une maladie nouvelle',
  epidemie: 'Épidémie', invention: 'Le monde invente', nature: 'Un lieu change de nature', climat: 'Le climat', eveil: 'Éveil',
  arrivee: 'Des lignées arrivent', conception: 'La Mère conçoit', record: 'Record', hybridation: 'Une zone hybride',
  savoir: 'Un savoir', mefiance: 'Méfiance', nom: 'Une lignée reçoit un nom'
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const effectif = t => (t?.populations || []).reduce((s, p) => s + (p.effectif || 0), 0);
const typeDe = id => String(id ?? '').split('~')[0];
const famille = t => t?.plan?.regime === 'synthetique' ? 'synthetique' : t?.plan?.regime === 'vegetal' ? 'vegetale' : t?.plan?.famille || 'animale';
const nomDe = (inst, id) => inst?.taxons?.find(t => t.id === id)?.nom || id;
const biomeNom = (inst, id) => { const b = inst?.biomes?.find(x => x.id === id) || inst?.biomes?.find(x => typeDe(x.id) === typeDe(id)); return b?.nom?.replace(/\s+\d+$/, '') || typeDe(id); };
// un hasard propre à une lignée : le spécimen type d'une lignée est toujours le même bête, quel que soit le jour où on le tire
const hachage = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hasard = s => { let g = hachage(s) || 1; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };
const annee = (n, inst) => Math.floor(Math.max(0, n || 0) / (inst?.monde?.annee || REGLES.annee));

// --- la chronique ---
// etat : ce que la chronique a déjà vu ({ souches, hybrides, records }) ; avant, apres : deux instantanés successifs (la vue par biome)
function vide(inst) { return { orvane: '0.1', monde: { id: inst?.monde?.id, ne: inst?.monde?.ne || null }, depuis: inst?.cycle?.n ?? 0, souches: [], hotes: {}, hybrides: [], records: {}, compte: {} }; }
function noter(etat0, avant, apres, opt = {}) {
  const etat = { hotes: {}, ...JSON.parse(JSON.stringify(etat0 || vide(apres))) }, n = apres.cycle?.n ?? 0, date = apres.cycle?.date || null, E = [];
  const ajouter = (type, imp, texte, plus = {}) => { E.push({ n, date, type, importance: imp, titre: TITRES[type] || type, texte, ...plus }); etat.compte[type] = (etat.compte[type] || 0) + 1; };
  const vivA = new Map((avant?.taxons || []).filter(t => !t.eteint).map(t => [t.id, t]));
  if (opt.premier) for (const t of apres.taxons || []) for (const p of t.populations || []) if (p.hybride?.avec) { const cle = [t.id, p.hybride.avec].sort().join('×'); if (!etat.hybrides.includes(cle)) etat.hybrides.push(cle); }
  const arrivees = {};
  for (const e of apres.evenements || []) {
    const t = e.taxon, b = e.biome, ici = b ? ` (${biomeNom(apres, b)})` : '';
    switch (e.type) {
      case 'separation': { const tx = apres.taxons.find(x => x.id === t), neuve = /forme|devenue|vivipare|pond|métamorph|segment|rayonn|tentacul/.test(e.detail || '');
        ajouter('naissance', neuve ? 3 : 2, `${tx?.nom || t} : ${e.detail}`, { taxon: t, biome: typeDe(b), famille: famille(tx) }); break; }
      case 'catastrophe': ajouter('catastrophe', 2, `${biomeNom(apres, b || t)} : ${e.detail}`, { biome: typeDe(b || t) }); break;
      // (les épidémies ordinaires reviennent sans cesse : la chronique ne garde que les souches nouvelles et leurs sauts, plus bas)
      case 'invention': ajouter('invention', 2, e.detail, { taxon: t, biome: typeDe(b) }); break;
      case 'nature': ajouter('nature', 2, e.detail, { biome: typeDe(b || t) }); break;
      case 'climat': ajouter('climat', /île|pont/.test(e.detail || '') ? 3 : 2, e.detail, { biome: b ? typeDe(b) : undefined }); break;
      case 'eveil': ajouter('eveil', 2, e.detail, { taxon: t }); break;
      case 'conception': ajouter('conception', 1, e.detail, { taxon: t, biome: typeDe(b) }); break;
      case 'mefiance': ajouter('mefiance', 1, `${nomDe(apres, t)}${ici} : ${e.detail}`, { taxon: t, biome: typeDe(b) }); break;
      case 'savoir': if (!/a perdu/.test(e.detail || '')) ajouter('savoir', 1, e.detail, { taxon: t, biome: typeDe(b) }); break;
      case 'hybridation': { const m = /avec ([^\s:]+)/.exec(e.detail || ''), cle = [t, m?.[1] || '?'].sort().join('×');   // la première zone d'une paire, pas ses allers-retours
        if (!etat.hybrides.includes(cle)) { etat.hybrides.push(cle); ajouter('hybridation', 1, `${nomDe(apres, t)} et ${nomDe(apres, m?.[1]) || '?'} se croisent${ici}`, { taxon: t, biome: typeDe(b) }); } break; }
      case 'apparition': { const m = /arrivée de (.+?) \(fusion ([^)]+)\)/.exec(e.detail || ''), k = m ? m[2] : 'fusion'; (arrivees[k] ||= { monde: m?.[1] || k, n: 0 }).n++; break; }
    }
  }
  for (const [k, x] of Object.entries(arrivees)) ajouter('arrivee', 3, `${x.monde} rejoint le monde : ${x.n} lignée${x.n > 1 ? 's' : ''} arrive${x.n > 1 ? 'nt' : ''} (fusion ${k})`, { fusion: k });
  // les extinctions : toute lignée vivante avant et éteinte (ou disparue) après, qu'un événement le dise ou non
  const apresId = new Map(apres.taxons.map(t => [t.id, t]));
  for (const [id, t] of vivA) { const x = apresId.get(id); if (x && !x.eteint) continue;
    const c = cause(t, apres); ajouter('extinction', famille(t) === 'animale' ? 3 : 2, `${t.nom || id} s'éteint après ${Math.max(0, n - (t.apparu || 0))} cycles${c ? ` : ${c}` : ''}`, { taxon: id, famille: famille(t) }); }
  // les souches nouvelles (docs/18)
  // (le jour où la chronique s'éveille, opt.premier : elle prend acte de ce qui existe sans le raconter)
  for (const [id, s] of Object.entries(apres.monde?.pathogenes?.souches || {})) if (!etat.souches.includes(id)) { etat.souches.push(id);
    if (!opt.premier) ajouter('souche', 2, `${s.nom} apparaît chez ${nomDe(apres, s.origine)} (virulence ${Math.round((s.virulence || 0) * 100)} %)`, { taxon: s.origine }); }
  // une souche qui gagne une lignée qu'elle n'avait jamais touchée (docs/18 : seulement des lignées apparentées)
  for (const [id, s] of Object.entries(apres.monde?.pathogenes?.souches || {})) { const vus = (etat.hotes[id] ||= [s.origine].filter(Boolean));
    for (const h of s.hotes || []) if (!vus.includes(h)) { vus.push(h); if (!opt.premier && h !== s.origine) ajouter('epidemie', 1, `${s.nom} gagne ${nomDe(apres, h)}`, { taxon: h }); } }
  for (const id of Object.keys(etat.hotes)) if (!apres.monde?.pathogenes?.souches?.[id]) delete etat.hotes[id];   // une souche disparue n'a plus d'hôtes à suivre
  // les records : la plus lourde et la plus légère des bêtes du monde (pas les plantes, pas les machines)
  const animaux = apres.taxons.filter(t => !t.eteint && famille(t) === 'animale' && effectif(t) > 0);
  if (animaux.length) {
    const lourd = animaux.reduce((a, t) => t.plan.masse_kg > a.plan.masse_kg ? t : a), leger = animaux.reduce((a, t) => t.plan.masse_kg < a.plan.masse_kg ? t : a);
    const R = etat.records;
    if (!R.lourd || lourd.plan.masse_kg > R.lourd.masse_kg * 1.001) { if (R.lourd && !opt.premier) ajouter('record', 2, `${lourd.nom || lourd.id} devient la plus lourde bête que le monde ait portée : ${fmt(lourd.plan.masse_kg)} kg (avant : ${R.lourd.nom}, ${fmt(R.lourd.masse_kg)} kg)`, { taxon: lourd.id }); R.lourd = { id: lourd.id, nom: lourd.nom || lourd.id, masse_kg: lourd.plan.masse_kg, n }; }
    if (!R.leger || leger.plan.masse_kg < R.leger.masse_kg * .999) { if (R.leger && !opt.premier) ajouter('record', 1, `${leger.nom || leger.id} devient la plus petite bête que le monde ait portée : ${fmt(leger.plan.masse_kg)} kg`, { taxon: leger.id }); R.leger = { id: leger.id, nom: leger.nom || leger.id, masse_kg: leger.plan.masse_kg, n }; }
  }
  return { etat, entrees: E };
}
const fmt = v => v >= 10 ? String(Math.round(v)) : String(+v.toPrecision(2)).replace('.', ',');
// la cause d'une extinction, lue dans sa dernière population : les joueurs, ses prédateurs, une maladie, ou le déclin
function cause(t, apres) {
  const P = (t.populations || []).filter(p => p.effectif > 0), W = P.reduce((s, p) => s + p.effectif, 0) || 1, moy = k => P.reduce((s, p) => s + (p[k] || 0) * p.effectif, 0) / W;
  const mal = P.reduce((s, p) => s + (p.maladie?.part || 0) * p.effectif, 0) / W, C = REGLES.cause;
  const cata = (apres?.evenements || []).find(e => e.type === 'catastrophe' && P.some(p => typeDe(p.biome) === typeDe(e.biome || e.taxon)));
  if (moy('pression') >= C.pression) return 'chassée par les joueurs';
  if (mal >= C.maladie) { const I = {}; for (const p of P) for (const [k, x] of Object.entries(p.infection || {})) I[k] = (I[k] || 0) + (+x || 0) * p.effectif;
    const k = Object.keys(I).sort((a, b) => I[b] - I[a] || (a < b ? -1 : 1))[0], nomS = k ? apres?.monde?.pathogenes?.souches?.[k]?.nom : null; return `emportée par une maladie${nomS ? ` (${nomS})` : ''}`; }
  if (moy('predation') >= C.predation) return 'mangée par ses prédateurs';
  if (cata) return `après ${cata.detail.split(':')[0].trim()}`;
  return W < 50 ? 'trop peu nombreuse pour tenir' : 'supplantée par d\'autres';
}

// --- le muséum ---
// un spécimen par lignée : ce qu'elle était le jour où le muséum l'a vue (son plan, sa silhouette, ses traits, une bête)
function specimen(t, inst, n) {
  const P = (t.populations || []).filter(p => p.effectif > 0).sort((a, b) => b.effectif - a.effectif), lieu = P[0]?.biome;
  const ph = (t.phenotypes || []).slice().sort((a, b) => (b.frequence || 0) - (a.frequence || 0))[0];
  const traits = {}; for (const p of t.phenotypes || []) for (const id of p.traits || []) traits[id] = +((traits[id] || 0) + (p.frequence || 0)).toFixed(3);
  const W = P.reduce((s, p) => s + p.effectif, 0), quant = {};
  for (const p of P) for (const [k, q] of Object.entries(p.quant || {})) quant[k] = (quant[k] || 0) + (q.m || 0) * p.effectif / (W || 1);
  for (const k in quant) quant[k] = +quant[k].toFixed(3);
  const { niche, tolerance, reproduction0, diete0, ...plan } = t.plan || {};
  const s = { id: t.id, nom: t.nom || t.id, famille: famille(t), parent: t.parent ?? null, apparu: t.apparu ?? null, decrit_au: n, eteint: null,
    lieu: lieu ? typeDe(lieu) : null, lieu_nom: lieu ? biomeNom(inst, lieu) : null, effectif: Math.round(W), plan, phenotype: ph?.traits || [], traits, ...(Object.keys(quant).length ? { quant } : {}),
    ...(t.origine ? { origine: t.origine } : {}) };
  // le spécimen type : une bête tirée de la population réelle, toujours la même pour une lignée (son hasard ne dépend que de son id)
  if (Individus && famille(t) === 'animale' && lieu) { try { const b = Individus.tirer(inst, t.id, lieu, { r: hasard(`${inst.monde?.id}:${t.id}`), id: `type-${t.id}` });
    if (b) { delete b.ascendance; delete b.parents; delete b.gen; delete b.F; delete b.vigueur; s.type = b; } } catch (e) { /* un spécimen sans bête vaut mieux que pas de spécimen */ } }
  return s;
}
function decrire(museum0, inst, opt = {}) {
  const M = museum0 ? { ...museum0, specimens: { ...museum0.specimens } } : { orvane: '0.1', monde: { id: inst.monde?.id, ne: inst.monde?.ne || null }, specimens: {} };
  const n = inst.cycle?.n ?? 0, nouveaux = [];
  for (const t of inst.taxons || []) if (!t.eteint && !M.specimens[t.id] && (opt.familles || ['animale', 'synthetique', 'vegetale']).includes(famille(t))) {
    M.specimens[t.id] = { ...specimen(t, inst, n), date: inst.cycle?.date || null }; nouveaux.push(t.id); }
  return { museum: M, nouveaux };
}
function fossiliser(museum0, avant, apres) {
  const M = { ...museum0, specimens: { ...museum0.specimens } }, n = apres.cycle?.n ?? 0, eteints = [], A = new Map(apres.taxons.map(t => [t.id, t]));
  for (const t of avant?.taxons || []) { if (t.eteint) continue; const x = A.get(t.id); if (x && !x.eteint) continue; const s = M.specimens[t.id]; if (!s || s.eteint != null) continue;
    M.specimens[t.id] = { ...s, eteint: x?.eteint ?? n, date_extinction: apres.cycle?.date || null, duree: (x?.eteint ?? n) - (s.apparu ?? s.decrit_au ?? 0), dernier_effectif: Math.round(effectif(t)), cause: cause(t, apres) };
    eteints.push(t.id); }
  return { museum: M, eteints };
}

// --- les noms ---
// propositions : [{ id, jeu, compte, auteur?, monde, taxon, nom, recu }] dans l'ordre où elles sont arrivées (l'id croissant).
// Une proposition est retenue si : la lignée existe au muséum, elle n'a pas encore de nom, la proposition est arrivée après que
// la lignée a été publiée (pas de nom réservé d'avance pour une lignée à naître), le nom est valable et n'est pas déjà pris
// dans ce monde, et elle n'est pas refusée (mondes/<id>/noms-refuses.json, la modération).
const NOM_OK = /^[\p{L}][\p{L}\p{M} '’-]*[\p{L}\p{M}]$/u;
function nettoyer(nom) { return String(nom ?? '').normalize('NFC').replace(/\s+/g, ' ').trim(); }
function valable(nom) { const s = nettoyer(nom); return s.length >= REGLES.nom.min && s.length <= REGLES.nom.max && NOM_OK.test(s) && !/(.)\1\1\1/.test(s) ? s : null; }
function nommer(museum0, propositions, opt = {}) {
  const M = { ...museum0, specimens: { ...museum0.specimens } }, retenus = [], refuses = [], entrees = [], refus = new Set((opt.refuses || []).map(String));
  const pris = new Set(Object.values(M.specimens).map(s => s.nom_commun?.toLowerCase()).filter(Boolean));
  for (const p of propositions || []) {
    const s = M.specimens[p.taxon], nom = valable(p.nom), refuser = pourquoi => refuses.push({ id: p.id, taxon: p.taxon, pourquoi });
    if (refus.has(String(p.id))) { refuser('refusé par la modération'); continue; }
    if (!s) { refuser('lignée inconnue'); continue; }
    if (s.nom_commun) { refuser('déjà nommée'); continue; }
    if (!nom) { refuser('nom non valable'); continue; }
    if (pris.has(nom.toLowerCase())) { refuser('nom déjà pris dans ce monde'); continue; }
    if (s.date && p.recu && Date.parse(p.recu) < Date.parse(s.date)) { refuser('proposé avant que la lignée soit publiée'); continue; }
    const auteur = p.auteur ? nettoyer(p.auteur).slice(0, 40) : null;
    M.specimens[p.taxon] = { ...s, nom_commun: nom, decrit: { ...(auteur ? { par: auteur } : {}), jeu: p.jeu || null, cycle: opt.n ?? null, date: p.recu || null } };
    pris.add(nom.toLowerCase()); retenus.push({ id: p.id, taxon: p.taxon, nom });
    entrees.push({ n: opt.n ?? null, date: opt.date ?? null, type: 'nom', importance: 2, titre: TITRES.nom, taxon: p.taxon,
      texte: `${auteur ? `${auteur}${p.jeu ? ` (${p.jeu})` : ''}` : (p.jeu ? `Un joueur de ${p.jeu}` : 'Un joueur')} décrit ${s.nom} et la nomme « ${nom} »` });
  }
  return { museum: M, retenus, refuses, entrees };
}
// ce qu'un jeu lit : le nom commun et qui l'a donné, sur chaque lignée nommée (l'instantané reçu n'est pas modifié)
function publier(inst, museum) {
  if (!museum?.specimens) return inst;
  const out = { ...inst, taxons: (inst.taxons || []).map(t => { const s = museum.specimens[t.id]; return s?.nom_commun ? { ...t, nom_commun: s.nom_commun, decrit: s.decrit } : t; }) };
  return out;
}

// une lignée née ce cycle qui reprend l'identifiant d'une autre, éteinte et oubliée du moteur (il ne garde les éteintes que dix
// cycles) mais gardée au muséum : elle en prend un à elle (id-cycle) ; l'instantané reçu, tout juste sorti du moteur, est corrigé
// sur place (son identifiant, les événements qui la disent). Sans cela, l'historique, le muséum et les jeux confondaient deux lignées.
function dedoublonner(inst, museum) {
  const S = museum?.specimens || {}, n = inst.cycle?.n, renommees = [], pris = new Set([...Object.keys(S), ...inst.taxons.map(t => t.id)]);
  for (const t of inst.taxons) { const s = S[t.id]; if (t.apparu !== n || !s || s.apparu === t.apparu) continue;
    let id = `${t.id}-${n}`; for (let k = 2; pris.has(id); k++) id = `${t.id}-${n}-${k}`;
    const de = t.id; t.id = id; pris.add(id); renommees.push({ de, vers: id });
    for (const e of inst.evenements || []) if (e.taxon === de) e.taxon = id; }
  return { inst, renommees };
}
// un fichier qui change un peu chaque nuit : une ligne par spécimen ou par entrée, pour que git n'en garde que la différence
function ecrire(o, cle) { const { [cle]: liste, ...reste } = o, L = Array.isArray(liste) ? liste.map(x => JSON.stringify(x)) : Object.entries(liste || {}).map(([k, x]) => `${JSON.stringify(k)}:${JSON.stringify(x)}`);
  const tete = JSON.stringify(reste).slice(0, -1); return `${tete}${tete.length > 1 ? ',' : ''}${JSON.stringify(cle)}:${Array.isArray(liste) ? '[' : '{'}\n${L.join(',\n')}\n${Array.isArray(liste) ? ']' : '}'}}\n`; }
const API = { REGLES, ecrire, dedoublonner, vide, noter, decrire, fossiliser, nommer, publier, valable, annee, cause, specimen };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneChronique = API;
})(globalThis);
