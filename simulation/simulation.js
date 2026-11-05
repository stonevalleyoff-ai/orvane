// Orvane — LA SIMULATION EN DIRECT (simulation/simulation.js)
// La page : le monde d'Orvane en temps réel. Le moteur tourne dans un Web Worker (travailleur.js, un monde solo parti de
// l'instantané publié : docs/19), au rythme qu'on choisit, d'un cycle par jour comme le monde partagé à un cycle toutes les
// dix secondes, ou au plus vite. Pendant ce temps, les bêtes vivent à l'écran (vivant.js). Le joueur peut observer, nourrir,
// chasser, capturer, déplacer, relâcher, transformer les lieux : ses gestes passent au moteur par le tampon, au cycle suivant.
// Tous les paramètres d'Orvane se règlent (parametres.js, noyau.js). La partie se garde dans le navigateur et reprend là où elle
// s'était arrêtée, en rattrapant le temps passé (au plus le rattrapage). Rien n'est envoyé au monde partagé.
'use strict';
(function () {
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const ESC = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nb = v => Math.round(v || 0).toLocaleString('fr-FR');
const fx = (v, d = 3) => typeof v === 'number' ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : (v ?? '—');
const pct = v => v == null ? '—' : (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: v > 0 && v < .1 ? 1 : 0 }) + ' %';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const P = globalThis.OrvaneParametres, V = globalThis.OrvaneVivant, Individus = globalThis.OrvaneIndividus;
const estObj = v => v && typeof v === 'object' && !Array.isArray(v);
const copie = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const fusion = (a, b) => { if (!estObj(a) || !estObj(b)) return b === undefined ? copie(a) : copie(b); const o = copie(a); for (const k of Object.keys(b)) o[k] = estObj(o[k]) && estObj(b[k]) ? fusion(o[k], b[k]) : copie(b[k]); return o; };
const lire = (o, c) => { for (const s of String(c).split('.')) { if (o == null) return undefined; o = o[s]; } return o; };

const RYTHMES = [['max', 'Au plus vite'], ['10s', '1 cycle / 10 s'], ['30s', '1 cycle / 30 s'], ['1min', '1 cycle / minute'], ['10min', '1 cycle / 10 min'], ['1h', '1 cycle / heure'], ['24h', '1 cycle / jour (le rythme d’Orvane)']];
const periodeMs = c => { if (c === 'max') return 0; c = String(c || '30s'); const n = parseFloat(c) || 30; return c.endsWith('d') ? n * 864e5 : c.endsWith('min') || c.endsWith('m') ? n * 6e4 : c.endsWith('s') ? n * 1e3 : n * 36e5; };
const REGIME = { herbivore: 'herbivore', omnivore: 'omnivore', carnivore: 'carnivore', filtreur: 'filtreur', detritivore: 'détritivore', synthetique: 'machine' };
const COUL_REGIME = { herbivore: '#6f9a4d', omnivore: '#c49a45', carnivore: '#b45b48', filtreur: '#4f8fa0', detritivore: '#8a7562', synthetique: '#6b7d8c' };
const MILIEU = { terrestre: 'terre', amphibie: 'rive', aquatique: 'eau douce', marin: 'mer', souterrain: 'sous terre' };
const AXES = [['temperature', 'Température'], ['humidite', 'Humidité'], ['altitude', 'Altitude'], ['lumiere', 'Lumière'], ['couvert', 'Couvert']];
const ACTIONS_LIEU = [['habitat_perdu', 'Abîmer l’habitat'], ['habitat_gagne', 'Restaurer l’habitat'], ['defrichage', 'Défricher'], ['reboisement', 'Reboiser'], ['assechement', 'Assécher'], ['irrigation', 'Irriguer'], ['construction', 'Construire']];
const GESTES = { prelevement: 'Chassé', capture: 'Capturé', nourrissage: 'Nourri', rencontre: 'Observé', deplacement: 'Déplacé', liberation: 'Relâché' };
const EVT = { apparition: 'apparitions', extinction: 'extinctions', separation: 'lignées nouvelles', migration: 'migrations', effondrement: 'effondrements', explosion: 'explosions', nouveau_trait: 'traits nouveaux',
  epidemie: 'épidémies', remission: 'rémissions', catastrophe: 'catastrophes', hybridation: 'zones hybrides', mefiance: 'méfiances', transformation: 'lieux transformés', eveil: 'éveils', conception: 'plans de la Mère' };
// le profil d'un monde solo (moteur/solo.js), complété de ce que la page lit pour dessiner (docs/5, 8, 12)
const PROFIL_PLUS = { influence: { pseudo_comptes: 20, plafonds: { part_max_jeu: null } }, exposition: { seuil_extinction_jeu: 0, mefiance: { rendue: true, fuite: 2.2, habitude: .5 }, quantitatifs: { variation: 1 } } };
const AFFICHAGE0 = { densite: 1, etiquettes: true, fuite: true, meteo: true, nuit: true, journee: 'cycle', poids: 'part' };
const TEMPS0 = { rythme: '30s', acceleration: 1, rattrapage: 24, enMarche: true };
const INDIVIDUS0 = copie(Individus?.REGLES || {});
const ORIGINE = 'https://stonevalleyoff-ai.github.io/orvane/';

const lireLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const ecrireLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const E = {
  vue: null, valeurs: null, defauts: null, mecanismes: null, source: null, monde: 'orvane', biome: null,
  reglages: lireLS('orvane-sim-reglages', {}), temps: { ...TEMPS0, ...lireLS('orvane-sim-temps', {}) }, affichage: { ...AFFICHAGE0, ...lireLS('orvane-sim-affichage', {}) },
  dernier: Date.now(), occupe: false, notes: [], historique: [], totaux: [], journal: [], menagerie: [], onglet: 'biome', outil: 'observer', espece: null,
  filtreJournal: 'important', ouverts: new Set(['temps', 'mecanismes']), recherche: '', biomeReglage: null, cyclesDepuis: 0, derniereSauvegarde: Date.now(), mesure: 2500
};
let scene = null;

// === le moteur, dans son Worker (ou dans la page, si le Worker ne se charge pas) ===
let W = null, seq = 0; const attentes = new Map();
const MODULES_PAGE = ['../moteur/flore.js', '../moteur/derives.js', '../moteur/pathogenes.js', '../moteur/milieu.js', '../moteur/synthetique.js', '../moteur/ponte.js', '../moteur/stades.js',
  '../moteur/invention.js', '../moteur/natures.js', '../moteur/climat.js', '../moteur/grammaire.js', '../moteur/castes.js', '../moteur/formes.js', '../moteur/esprit.js', '../moteur/orvane.js',
  '../moteur/parcelles.js', '../moteur/collectif.js', '../moteur/solo.js', '../moteur/chronique.js', 'noyau.js', 'messagerie.js'];
function travailleur() {
  try { W = new Worker('travailleur.js'); W.onmessage = e => recevoir(e.data); W.onerror = e => { e.preventDefault?.(); dansLaPage(); }; }
  catch (e) { dansLaPage(); }
}
const script = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error(src)); document.head.appendChild(s); });
async function dansLaPage() {
  if (E.dansLaPage) return; E.dansLaPage = true; try { W?.terminate?.(); } catch (e) { }
  chargement('Le moteur tourne dans la page (sans Web Worker)…');
  for (const m of MODULES_PAGE) await script(m);   // (orvane.js recharge le moteur une fois tous ses modules là)
  const r = OrvaneMessagerie(m => setTimeout(() => recevoir(m), 0));
  W = { postMessage: m => r(m) };
  for (const a of attentes.values()) W.postMessage(a.msg);
}
// (une demande faite pendant que le moteur se charge dans la page attend : dansLaPage la renvoie)
function demander(msg) { return new Promise((ok, ko) => { const id = ++seq, m = { ...msg, id }; attentes.set(id, { ok, ko, msg: m }); if (W) W.postMessage(m); }); }
function recevoir(m) {
  if (m.type === 'progres') { if (m.texte) chargement(m.texte); else if (m.sur) { chargement(null); $('#etatCycle').textContent = `cycle ${m.n} (${m.fait} sur ${m.sur})…`; } return; }
  const a = attentes.get(m.id); if (!a) return; attentes.delete(m.id);
  if (m.type === 'erreur') a.ko(new Error(m.erreur)); else a.ok(m);
}
function chargement(t) { const el = $('#chargement'); if (!el) return; if (t) { el.hidden = false; el.querySelector('p').textContent = t; } else el.hidden = true; }

// === les réglages : ce qui part au moteur, ce qui reste dans la page ===
const PAGE = new Set(['individus']);
function reglagesMoteur() { const o = {}; for (const [g, v] of Object.entries(E.reglages)) if (!PAGE.has(g)) o[g] = v; return o; }
function profilPage() { let p = fusion(E.defauts?.profil || {}, PROFIL_PLUS); for (const [c, v] of Object.entries(E.reglages.profil || {})) { const S = c.split('.'); let o = p; for (let i = 0; i < S.length - 1; i++) o = o[S[i]] ||= {}; o[S[S.length - 1]] = v; } return p; }
function appliquerPage() {
  if (Individus?.REGLES) { Object.assign(Individus.REGLES, copie(INDIVIDUS0)); for (const [c, v] of Object.entries(E.reglages.individus || {})) { const S = c.split('.'); let o = Individus.REGLES; for (let i = 0; i < S.length - 1; i++) o = o[S[i]] ||= {}; o[S[S.length - 1]] = v; } }
  if (scene) { scene.profil = profilPage(); Object.assign(scene.options, E.affichage); }
}
// l'arbre des défauts d'un groupe : ce que vaut chaque réglage avant qu'on y touche (pour le moteur : les règles du monde par-dessus)
function arbre(g) {
  if (g === 'orvane') return fusion(E.defauts.orvane, E.valeurs?.regles0 || {});
  if (g === 'profil') return fusion(E.defauts.profil, PROFIL_PLUS);
  if (g === 'individus') return INDIVIDUS0;
  if (g === 'monde') return E.valeurs?.monde0 || { graine: 1, annee: 0 };
  return E.defauts?.[g];
}
function defautDe(g, c) {
  if (g === 'biomes') { const [id, ...r] = c.split('.'), b0 = E.valeurs?.biomes0?.[id]; if (!b0) return undefined; if (r[0] === 'capacite_base') return b0.capacite_base; if (r[0] === 'axes') return b0.axes?.[r[1]];
    if (r[0] === 'saisons') return b0.saisons?.[r[1]] ?? arbre('orvane').saisons?.[r[1]]; return undefined; }
  return lire(arbre(g), c);
}
const valeurDe = (g, c) => { const o = E.reglages[g]; return o && c in o ? o[c] : defautDe(g, c); };
let minuterie = null, vueVoulue = false;
function regler(g, c, v) {
  const d = defautDe(g, c); E.reglages[g] ||= {};
  if (v === d || (v == null && d == null) || (typeof v === 'number' && typeof d === 'number' && Math.abs(v - d) < 1e-12)) delete E.reglages[g][c]; else E.reglages[g][c] = v;
  if (!Object.keys(E.reglages[g]).length) delete E.reglages[g];
  ecrireLS('orvane-sim-reglages', E.reglages); appliquerPage();
  if (!PAGE.has(g)) envoyerReglages(g === 'biomes' || g === 'mecanismes' || g === 'monde');
  marquerModifies();
}
function envoyerReglages(vue) {
  vueVoulue = vueVoulue || vue; clearTimeout(minuterie);
  minuterie = setTimeout(async () => { const v = vueVoulue; vueVoulue = false;
    try { const r = await demander({ type: 'regler', reglages: reglagesMoteur(), vue: v }); E.valeurs = r.valeurs; E.mecanismes = r.mecanismes;
      for (const e of r.evenements || []) journal({ n: E.vue?.cycle?.n, type: e.type, importance: 2, titre: 'Éveil', texte: e.detail || e.type, source: 'moteur' });
      if (r.vue) { E.vue = r.vue; V.installer(scene, r.vue, E.biome, { plan: false, profil: profilPage() }); }
      if (E.onglet === 'reglages') { rendreMecanismes(); } else rendre();
    } catch (e) { toast(`Réglage refusé : ${e.message}`, 'erreur'); } }, 300);
}

// === le temps réel : les cycles dus, au rythme choisi ===
const attendu = () => { const p = periodeMs(E.temps.rythme); return p ? p / Math.max(1e-6, E.temps.acceleration || 1) : Math.max(2500, E.mesure * 1.15); };
function horlogeMoteur() {
  if (!E.vue || E.occupe || !E.temps.enMarche) return;
  const p = periodeMs(E.temps.rythme), acc = Math.max(1e-6, E.temps.acceleration || 1);
  if (!p) { lancer(1); return; }
  const du = Math.floor((Date.now() - E.dernier) * acc / p); if (du < 1) return;
  const n = Math.min(du, Math.max(1, E.temps.rattrapage | 0)); E.dernier += du * p / acc; lancer(n);
}
async function lancer(n, force) {
  if (E.occupe || !E.vue) return; E.occupe = true;
  const notes = E.notes.splice(0); for (const [tid, k] of Object.entries(scene?.rencontres || {})) if (k > 0) notes.push({ taxon: tid, biome: E.biome, action: 'rencontre', n: k }); if (scene) scene.rencontres = {}; majNotes();
  const t0 = performance.now();
  try {
    const r = await demander({ type: 'cycles', n, notes }); E.toasts = 0;
    E.mesure = (performance.now() - t0) / r.res.length; E.vue = r.vue; E.cyclesDepuis += r.res.length;
    for (const c of r.res) apresCycle(c);
    if (notes.length) journal({ n: r.vue.cycle.n, type: 'gestes', importance: 2, titre: 'Vos gestes ont pesé', texte: resumeNotes(notes), source: 'joueur' });
    statistiques();
    scene.horloge = { debut: performance.now(), duree: attendu() };
    V.installer(scene, E.vue, E.biome, { duree: attendu(), profil: profilPage() });
    entete(); if (E.onglet !== 'reglages') rendre(); else rendreTemps();
    if (Date.now() - E.derniereSauvegarde > 90000) sauverPartie(false);
  } catch (e) { toast(`Le cycle s’est arrêté : ${e.message}`, 'erreur'); E.notes.unshift(...notes.filter(x => x.action !== 'rencontre')); majNotes(); }
  E.occupe = false;
}
function resumeNotes(notes) { const c = {}; for (const x of notes) c[x.action] = (c[x.action] || 0) + x.n; return Object.entries(c).map(([a, k]) => `${(GESTES[a] || a).toLowerCase()} : ${nb(k)}`).join(', '); }
function apresCycle(c) {
  const ev = c.evenements || [], compte = {}; for (const e of ev) compte[e.type] = (compte[e.type] || 0) + 1;
  for (const en of c.entrees || []) journal({ ...en, source: 'chronique' });
  const resume = Object.entries(compte).sort((a, b) => b[1] - a[1]).map(([t, k]) => `${k} ${k > 1 ? EVT[t] || t : (EVT[t] || t).replace(/s$/, '').replace(/s /, ' ')}`).join(', ');
  if (resume) journal({ n: c.n, type: 'cycle', importance: 1, titre: `Cycle ${c.n}${c.saison ? ' · ' + c.saison.nom : ''}`, texte: resume, source: 'moteur' });
  for (const e of ev) if (e.biome === E.biome && ['catastrophe', 'epidemie', 'separation'].includes(e.type)) toast(`${nomBiome(e.biome)} : ${e.detail || e.type}`);
}
function journal(e) {
  E.journal.unshift(e); if (E.journal.length > 500) E.journal.length = 500;
  if (e.importance >= 3 && e.source === 'chronique') toast(`${e.titre} — ${e.texte}`);
}
function statistiques() {
  const I = E.vue, A = I.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal'), par = {};
  let animaux = 0; for (const t of A) { const n = t.populations.reduce((a, p) => a + p.effectif, 0); if (t.plan.regime !== 'synthetique') animaux += n; par[t.plan.regime] = (par[t.plan.regime] || 0) + n * (t.plan.masse_kg || 1); }
  E.historique.push({ n: I.cycle.n, lignees: A.filter(t => t.plan.regime !== 'synthetique').length, animaux, par, temperature: I.monde?.climat?.temperature ?? 0, souches: Object.keys(I.monde?.pathogenes?.souches || {}).length });
  if (E.historique.length > 3000) E.historique.splice(0, E.historique.length - 3000);
  E.totaux.push({ n: I.cycle.n, e: Object.fromEntries(A.map(t => [t.id, t.populations.reduce((a, p) => a + p.effectif, 0)])) });
  if (E.totaux.length > 300) E.totaux.splice(0, E.totaux.length - 300);
}

// === démarrer : une partie gardée, ou le monde publié ===
async function demarrer() {
  const q = new URLSearchParams(location.search); E.monde = q.get('monde') || 'orvane';
  scene = V.creer($('#toile'), { surToucher, surChoix: (a, quoi) => { if (quoi === 'mort') carte(a); }, surEvenement: () => { } });
  appliquerPage(); V.boucle(scene);
  new ResizeObserver(() => { if (scene.vue && V.redimensionner(scene)) { } }).observe($('#toile'));
  if (q.get('moteur') === 'page') dansLaPage(); else travailleur();   // (?moteur=page : sans Web Worker, pour essayer)
  remplirRythme(); brancherInterface();
  chargement('Le monde d’Orvane arrive…');
  const partie = q.has('neuf') ? null : await lirePartie().catch(() => null);
  try {
    if (partie && partie.page?.monde === E.monde) await reprendre(partie, q.get('biome'));
    else await nouvelle(q.get('biome'));
  } catch (e) { chargement(null); $('#chargement').hidden = false; $('#chargement p').innerHTML = `Le monde ne se charge pas : ${ESC(e.message)}. <a href="?neuf">Réessayer depuis le monde publié</a>`; return; }
  setInterval(horlogeMoteur, 250); setInterval(entete, 1000);
}
async function nouvelle(biome) {
  const m = encodeURIComponent(E.monde);
  const r = await demander({ type: 'creer', sources: [`../mondes/${m}/instantane.json`, `${ORIGINE}mondes/${m}/instantane.json`], flores: [`../mondes/${m}/flore.json`, `${ORIGINE}mondes/${m}/flore.json`], reglages: reglagesMoteur(), maintenant: Date.now() });
  E.source = r.source; E.historique = []; E.totaux = []; E.journal = []; E.menagerie = []; E.cyclesDepuis = 0; E.dernier = Date.now();
  installer(r, biome);
  journal({ n: r.vue.cycle.n, type: 'depart', importance: 3, titre: 'Branché sur Orvane', texte: `${r.source?.nom || 'le monde'} tel qu’il était au cycle ${r.source?.cycle ?? '?'} : désormais, il vit ici, à votre rythme.`, source: 'page' });
  sauverPartie(false);
}
async function reprendre(partie, biome) {
  chargement('Votre monde reprend…');
  const r = await demander({ type: 'charger', sauvegarde: partie.sauvegarde, reglages: reglagesMoteur() });
  const pg = partie.page || {}; E.source = pg.source; E.historique = pg.historique || []; E.totaux = pg.totaux || []; E.journal = pg.journal || []; E.menagerie = pg.menagerie || []; E.cyclesDepuis = pg.cyclesDepuis || 0;
  E.dernier = pg.dernier || Date.now(); installer(r, biome || pg.biome);
  // le temps passé : les cycles dus depuis la dernière fois, au plus le rattrapage (le reste est perdu, comme dans moteur/solo.js)
  const p = periodeMs(E.temps.rythme), acc = Math.max(1e-6, E.temps.acceleration || 1);
  if (p && E.temps.enMarche) { const du = Math.floor((Date.now() - E.dernier) * acc / p);
    if (du >= 1) { const n = Math.min(du, Math.max(1, E.temps.rattrapage | 0)); E.dernier += du * p / acc; toast(`Pendant votre absence, ${du} cycle${du > 1 ? 's' : ''} ${du > 1 ? 'étaient dus' : 'était dû'} : ${n} rattrapé${n > 1 ? 's' : ''}.`); await lancer(n); } }
}
function installer(r, biome) {
  E.vue = r.vue; E.valeurs = r.valeurs; E.defauts = r.defauts; E.mecanismes = r.mecanismes; appliquerPage();
  const B = E.vue.biomes, nbEsp = b => E.vue.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.populations.some(p => p.biome === b.id && p.effectif >= 1)).length;
  E.biome = B.some(b => b.id === biome) ? biome : B.some(b => b.id === E.biome) ? E.biome : (B.find(b => b.id === 'prairie') || B.slice().sort((a, b) => nbEsp(b) - nbEsp(a))[0])?.id;
  if (!E.historique.length) statistiques();
  scene.horloge = { debut: performance.now(), duree: attendu() };
  V.installer(scene, E.vue, E.biome, { duree: attendu(), profil: profilPage() });
  chargement(null); entete(); rendre(); adresse();
}
function adresse() { const q = new URLSearchParams(location.search); q.set('monde', E.monde); q.set('biome', E.biome); q.delete('neuf'); history.replaceState(null, '', '?' + q.toString()); }
function changerBiome(id) { if (!E.vue.biomes.some(b => b.id === id)) return; E.biome = id; E.espece = null; scene.surligne = null; carte(null); V.installer(scene, E.vue, id, { duree: attendu(), profil: profilPage() }); adresse(); entete(); rendre(); }

// === la sauvegarde : IndexedDB (un monde pèse quelques Mo) ===
function base() { return new Promise((ok, ko) => { const r = indexedDB.open('orvane-simulation', 1); r.onupgradeneeded = () => r.result.createObjectStore('parties'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
async function lirePartie() { const db = await base(); return new Promise((ok, ko) => { const r = db.transaction('parties').objectStore('parties').get('courante'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ko(r.error); }); }
async function ecrirePartie(v) { const db = await base(); return new Promise((ok, ko) => { const t = db.transaction('parties', 'readwrite'); v === null ? t.objectStore('parties').delete('courante') : t.objectStore('parties').put(v, 'courante'); t.oncomplete = ok; t.onerror = () => ko(t.error); }); }
function etatPage() { return { monde: E.monde, biome: E.biome, source: E.source, historique: E.historique, totaux: E.totaux, journal: E.journal.slice(0, 300), menagerie: E.menagerie, dernier: E.dernier, cyclesDepuis: E.cyclesDepuis }; }
async function sauverPartie(dire) {
  if (!E.vue) return; E.derniereSauvegarde = Date.now();
  try { const r = await demander({ type: 'sauver' }); await ecrirePartie({ sauvegarde: r.json, page: etatPage(), date: new Date().toISOString(), n: r.n }); if (dire) toast(`Partie gardée dans ce navigateur (cycle ${r.n}).`); }
  catch (e) { if (dire) toast(`La partie n’a pas pu être gardée : ${e.message}`, 'erreur'); }
}
async function exporterPartie() { const r = await demander({ type: 'sauver' }); telecharger(`orvane-simulation-cycle-${r.n}.json`, JSON.stringify({ orvane_simulation: 1, sauvegarde: r.json, page: etatPage(), reglages: E.reglages, temps: E.temps, affichage: E.affichage })); }
async function importerPartie(f) {
  const j = JSON.parse(await f.text()); if (j?.orvane_simulation !== 1) throw new Error('ce n’est pas une partie de la simulation');
  if (j.reglages) { E.reglages = j.reglages; ecrireLS('orvane-sim-reglages', E.reglages); } if (j.temps) { E.temps = { ...TEMPS0, ...j.temps }; ecrireLS('orvane-sim-temps', E.temps); } if (j.affichage) { E.affichage = { ...AFFICHAGE0, ...j.affichage }; ecrireLS('orvane-sim-affichage', E.affichage); }
  E.monde = j.page?.monde || E.monde; await reprendre({ sauvegarde: j.sauvegarde, page: { ...j.page, dernier: Date.now() } }); sauverPartie(false);
}
function telecharger(nom, texte) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' })); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

// === les gestes du joueur ===
function poids(a) { if (E.affichage.poids !== 'part' || !a) return 1; const e = a.esp; return clamp(Math.round((e.pop.effectif || 1) / Math.max(1, e.dessines || 1)), 1, 2e6); }
// un événement compte au plus 10 000 bêtes (N_MAX, tampon/tampon.js) : un geste plus lourd part en plusieurs ; le tampon les additionne,
// puis les plafonne (influence.plafonds.part_max_population : au plus 30 % d'une population en un cycle, dans un monde solo)
function noter(ev, a, x, y) {
  const MAX = globalThis.OrvaneTampon?.N_MAX || 1e4; for (let reste = ev.n, k = 0; reste > 0 && k < 200; k++) { const n = Math.min(MAX, reste); E.notes.push({ ...ev, n }); reste -= n; }
  const k = ev.n > 1 ? ` (${nb(ev.n)} bêtes du monde)` : '';
  if (a) V.texte(scene, a.x, a.y - (a.w || 20), (GESTES[ev.action] || ev.action) + k); else if (x != null) V.texte(scene, x, y, (GESTES[ev.action] || ACTIONS_LIEU.find(z => z[0] === ev.action)?.[1] || ev.action) + k);
  majNotes();
}
function geste(action, a, vers) {
  if (!a || a.mort) return; const e = a.esp, n = action === 'rencontre' ? 1 : poids(a), base = { taxon: e.id, biome: E.biome, n };
  if (action === 'prelevement' || action === 'capture') { const ph = V.phenotypeDe(a); noter({ ...base, action, ...(ph ? { phenotype: ph } : {}), q: a.ind.z, age: V.ageDe(a) }, a);
    if (action === 'capture') { E.menagerie.unshift({ ind: a.ind, nom: e.nom, biome: E.biome, cycle: E.vue.cycle.n, traits: a.traits }); if (E.menagerie.length > 40) E.menagerie.length = 40; }
    V.retirer(scene, a, action === 'capture' ? 'capture' : 'chasse'); if (scene.choisi === a) carte(null); }
  else if (action === 'nourrissage') { noter({ ...base, action }, a); V.nourrir(scene, a); }
  else if (action === 'rencontre') noter({ ...base, action }, a);
  else if (action === 'deplacement' && vers) { noter({ ...base, action, vers }, a); a.etat = 'partir'; a.cible = { x: a.x < scene.W / 2 ? -40 : scene.W + 40, y: a.y }; carte(null); }
  if (E.onglet === 'biome') rendreMenagerie();
}
function relacher(i) {
  const m = E.menagerie[i]; if (!m) return;
  const a = V.relacher(scene, { ...m.ind, biome: E.biome });
  if (!a) { toast('Cette lignée n’existe plus dans ce monde.', 'erreur'); return; }
  const genome = { alleles: Object.fromEntries(Object.entries(m.ind.alleles || {}).map(([k, c]) => [k, c / 2])), a: m.ind.a || {} };
  noter({ taxon: m.ind.taxon, biome: E.biome, action: 'liberation', n: 1, genome }, a); E.menagerie.splice(i, 1); rendreMenagerie();
}
function gesteLieu(action, n) { noter({ biome: E.biome, action, n }, null, scene.W / 2, scene.H * .5); }
function surToucher(a, x, y) {
  const o = E.outil;
  if (o === 'observer' || !a) { carte(a); if (a) { scene.surligne = null; } return; }
  if (o === 'chasser') geste('prelevement', a); else if (o === 'capturer') geste('capture', a); else if (o === 'nourrir') geste('nourrissage', a);
}
function majNotes() { const n = new Set(E.notes.map(x => `${x.action}|${x.taxon}|${x.q ? JSON.stringify(x.q) : ''}|${x.genome ? 1 : ''}`)).size, el = $('#notes'); if (el) { el.hidden = !n; el.textContent = `${n} geste${n > 1 ? 's' : ''} en attente du prochain cycle`; } }

// === la fiche d'une bête ===
function carte(a) {
  scene.choisi = a && !a.mort ? a : null; const el = $('#carte'); if (!scene.choisi) { el.hidden = true; return; }
  const e = a.esp, ind = a.ind, cat = E.vue.catalogue?.traits || {}, caches = Individus.caches(ind, cat), jeune = a.age < e.maturite, p = e.pop, g = p.groupe;
  const barre = (k, nom) => { const z = clamp(ind.z?.[k] ?? 0, -3, 3); return `<div class="z"><span>${nom}</span><span class="zb"><i style="left:${50 + Math.min(0, z) / 3 * 50}%;width:${Math.abs(z) / 3 * 50}%" class="${z >= 0 ? 'plus' : 'moins'}"></i></span><b>${z >= 0 ? '+' : '−'}${fx(Math.abs(z), 2)}</b></div>`; };
  const voisins = (E.vue.biomes.find(b => b.id === E.biome)?.voisins || []).filter(id => E.vue.biomes.some(b => b.id === id));
  el.innerHTML = `<button class="fermer" aria-label="Fermer la fiche">×</button>
    <div class="carte-tete">${e.plan.corps ? V.croquis(e.plan.corps, a.traits) : e.syn ? V.machine(e.plan) : ''}<div><h3>${ESC(ind.nom)} <span class="sexe">${ind.sexe === 'f' ? '♀' : '♂'}</span></h3>
    <p class="sous">${ESC(e.nom)} · ${REGIME[e.regime] || e.regime} · ${fx(e.masse * Math.pow(a.fT, 3), 2)} kg</p>
    <p class="sous">${jeune ? 'jeune' : a.age > e.longevite ? 'vieux' : 'adulte'} · ${fx(a.age, 1)} cycle${a.age >= 2 ? 's' : ''}${ind.gen ? ` · génération ${ind.gen}` : ''}${ind.F ? ` · consanguinité ${fx(ind.F, 3)}` : ''}${ind.hybride ? ` · hybride (${pct(ind.part_hybride)})` : ''}</p></div></div>
    <div class="zs">${barre('taille', 'Taille')}${barre('vitesse', 'Vitesse')}${barre('audace', 'Audace')}${barre('sociabilite', 'Sociabilité')}</div>
    <p class="puces">${a.traits.map(t => `<span class="puce" title="${ESC(cat[t]?.effet || '')}">${ESC(t)}</span>`).join('') || '<span class="sourd">aucun trait visible</span>'}${caches.length ? ` <span class="sourd">porte sans montrer :</span> ${caches.map(t => `<span class="puce cache">${ESC(t)}</span>`).join('')}` : ''}</p>
    <p class="sous">${a.malade ? '<b class="declin">malade</b> · ' : ''}${g ? `${ESC(g.nom || g.forme)}${g.taille?.typ > 1 ? ` (${g.taille.typ} d’habitude)` : ''}${g.meneur ? `, mené par ${ESC(g.meneur)}` : ''} · ` : ''}${ind.savoirs?.length ? `sait : ${ind.savoirs.map(ESC).join(', ')} · ` : ''}méfiance ${pct(p.mefiance || 0)}, habituation ${pct(p.habituation || 0)} · ${ESC(etatLisible(a))}</p>
    <div class="actions">${e.syn ? '' : `<button data-g="rencontre">Observer</button><button data-g="nourrissage">Nourrir</button><button data-g="prelevement" class="danger">Chasser</button><button data-g="capture">Capturer</button>`}
      ${voisins.length && !e.syn ? `<select data-g="deplacement" aria-label="Déplacer vers un biome voisin"><option value="">Déplacer vers…</option>${voisins.map(id => `<option value="${ESC(id)}">${ESC(nomBiome(id))}</option>`).join('')}</select>` : ''}
      <button data-espece="${ESC(e.id)}" class="lien">L’espèce</button></div>
    <p class="note">Un geste compte pour ${nb(poids(a))} bête${poids(a) > 1 ? 's' : ''} du monde${E.affichage.poids === 'part' ? ' (la part que dessine cette bête)' : ''} ; il passe au moteur au prochain cycle, par le tampon.</p>`;
  el.hidden = false;
  el.querySelector('.fermer').onclick = () => carte(null);
  el.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => { geste(b.dataset.g, a); if (b.dataset.g === 'rencontre' || b.dataset.g === 'nourrissage') carte(a); });
  const s = el.querySelector('select[data-g]'); if (s) s.onchange = () => { if (s.value) geste('deplacement', a, s.value); };
  const be = el.querySelector('[data-espece]'); if (be) be.onclick = () => { E.espece = e.id; E.onglet = 'biome'; scene.surligne = e.id; rendre(); setTimeout(() => $(`[data-esp="${CSS.escape(e.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); };
}
const etatLisible = a => ({ repos: 'se repose', errer: 'erre', pause: 's’arrête', brouter: 'broute', charogne: 'mange une carcasse', chasser: 'chasse', manger: 'mange sa proie', fuir: 'fuit', partir: 's’en va', nourri: 'mange ce que vous lui donnez' })[a.etat] || a.etat;

// === l'en-tête et les messages ===
const nomBiome = id => E.vue?.biomes.find(b => b.id === id)?.nom || id;
function entete() {
  if (!E.vue) return; const c = E.vue.cycle, L = V.lumiere(scene), h = Math.floor(L.h * 24), mn = Math.floor((L.h * 24 - h) * 60);
  $('#etatCycle').textContent = `cycle ${c.n}${c.saison ? ' · ' + c.saison.nom : ''}`;
  $('#etatSource').textContent = E.source?.cycle != null ? `parti du cycle ${E.source.cycle} d’Orvane · ${E.cyclesDepuis} vécu${E.cyclesDepuis > 1 ? 's' : ''} ici` : '';
  $('#hudBiome').textContent = nomBiome(E.biome);
  $('#hudHeure').textContent = `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')} ${L.L > .55 ? '☀' : L.L > .2 ? '◐' : '☾'}`;
  const p = periodeMs(E.temps.rythme), reste = p && E.temps.enMarche ? Math.max(0, E.dernier + p / Math.max(1e-6, E.temps.acceleration) - Date.now()) : 0;
  $('#hudProchain').textContent = !E.temps.enMarche ? 'en pause' : E.occupe ? 'le monde avance…' : p ? `prochain cycle dans ${duree(reste)}` : 'au plus vite';
  $('#bJouer').textContent = E.temps.enMarche ? '❚❚' : '▶'; $('#bJouer').setAttribute('aria-label', E.temps.enMarche ? 'Mettre en pause' : 'Reprendre');
}
const duree = ms => ms < 60e3 ? `${Math.ceil(ms / 1000)} s` : ms < 36e5 ? `${Math.floor(ms / 6e4)} min ${String(Math.floor(ms % 6e4 / 1000)).padStart(2, '0')} s` : `${Math.floor(ms / 36e5)} h ${String(Math.floor(ms % 36e5 / 6e4)).padStart(2, '0')}`;
function toast(t, cls = '') { if (cls !== 'erreur' && (E.toasts = (E.toasts || 0) + 1) > 3) return; const z = $('#toasts'), el = document.createElement('p'); el.className = 'toast ' + cls; el.textContent = t; z.prepend(el); while (z.children.length > 3) z.lastChild.remove(); setTimeout(() => el.classList.add('part'), 6000); setTimeout(() => el.remove(), 6800); }
function remplirRythme() {
  const s = $('#rythme'), v = E.temps.rythme, perso = !RYTHMES.some(r => r[0] === v);
  s.innerHTML = RYTHMES.map(([k, n]) => `<option value="${k}">${ESC(n)}</option>`).join('') + (perso ? `<option value="${ESC(v)}">1 cycle / ${ESC(v)}</option>` : '') + '<option value=":perso">Autre durée…</option>';
  s.value = v;
}
function changerRythme(v) {
  if (v === ':perso') { const x = prompt('La durée réelle d’un cycle (par exemple 45s, 5min, 2h, 3d) :', '5min'); if (!x || !periodeMs(x)) { remplirRythme(); return; } v = x.trim(); }
  E.temps.rythme = v; E.dernier = Date.now(); ecrireLS('orvane-sim-temps', E.temps); remplirRythme(); scene.horloge = { debut: performance.now(), duree: attendu() }; entete(); if (E.onglet === 'reglages') rendreTemps();
}

// === le panneau ===
function rendre() {
  $$('#onglets button').forEach(b => b.setAttribute('aria-selected', b.dataset.o === E.onglet));
  const el = $('#panneau'), haut = el.scrollTop;
  ({ biome: rendreBiome, monde: rendreMonde, journal: rendreJournal, reglages: rendreReglages })[E.onglet]?.();
  if (E._dernierOnglet === E.onglet) el.scrollTop = haut; E._dernierOnglet = E.onglet;
}
function barreAxe(v, coul = '#b9c6ab') { return `<span class="axe"><i style="width:${clamp(v, 0, 1) * 100}%;background:${coul}"></i></span>`; }
function rendreBiome() {
  const I = E.vue, b = I.biomes.find(x => x.id === E.biome), ax = b.axes_saison || b.axes, esp = [...scene.especes.values()].sort((x, y) => y.pop.effectif - x.pop.effectif), F = I.flore?.[b.id] || [];
  const opts = I.biomes.map(x => `<option value="${ESC(x.id)}"${x.id === b.id ? ' selected' : ''}>${ESC(x.nom || x.id)}</option>`).join('');
  const ligne = e => { const p = e.pop, t = e.t, ouvert = E.espece === e.id, st = p.tendance || 0;
    return `<li class="esp${ouvert ? ' ouvert' : ''}" data-esp="${ESC(e.id)}"><button class="esp-tete" data-choix="${ESC(e.id)}">${e.plan.corps ? V.croquis(e.plan.corps) : e.syn ? V.machine(e.plan) : ''}<span class="esp-nom"><b>${ESC(e.nom)}</b><small><i class="pastille" style="background:${COUL_REGIME[e.regime] || '#888'}"></i>${REGIME[e.regime] || e.regime} · ${fx(e.masse, 3)} kg · ${ESC(e.activite)}${p.groupe && p.groupe.forme !== 'solitaire' ? ' · ' + ESC(p.groupe.nom) : ''}</small></span>
      <span class="esp-n">${nb(p.effectif)}<small class="${st > .005 ? 'vif' : st < -.005 ? 'declin' : ''}">${st > .005 ? '+' : st < -.005 ? '−' : ''}${Math.abs(st) >= .005 ? Math.round(Math.abs(st) * 100) + ' %' : 'stable'}</small><small>${e.dessines} à l’écran</small></span></button>
      ${ouvert ? detailEspece(e) : ''}</li>`; };
  $('#panneau').innerHTML = `<section class="bloc"><div class="rang"><label class="petit" for="choixBiome">Biome</label><select id="choixBiome">${opts}</select></div>
    <h2>${ESC(b.nom || b.id)} <small>${MILIEU[b.milieu] || b.milieu}${I.cycle.saison ? ' · ' + I.cycle.saison.nom : ''}</small></h2>
    <div class="axes">${AXES.map(([k, n]) => `<div><span>${n}</span>${barreAxe(ax[k] ?? 0)}<b>${fx(ax[k], 2)}</b></div>`).join('')}</div>
    <p class="note">Capacité ${nb(b.capacite)} (base ${nb(b.capacite_base ?? b.capacite)}) · ${esp.length} espèce${esp.length > 1 ? 's' : ''} · ${F.length ? 'plantes : ' + F.map(p => `${ESC(p.forme)} ${pct(Math.min(p.part, 9))}`).join(', ') : 'pas de plantes'}${b.visiteurs?.length ? ` · visiteurs de l’hiver : ${b.visiteurs.length}` : ''}</p>
    <details class="gestes"${E.gestesOuverts ? ' open' : ''}><summary>Vos gestes sur ce lieu</summary><p class="note">Ils passent au moteur au prochain cycle (le milieu transformé, docs/22 ; l’habitat). Une unité transforme ${fx(valeurDe('milieu', 'jeu.unite'))} unités de capacité, au plus ${pct(valeurDe('milieu', 'jeu.max'))} du lieu par cycle.</p>
      <div class="rang"><label class="petit" for="nLieu">Intensité</label><select id="nLieu"><option value="1">1 unité</option><option value="100">100</option><option value="1000" selected>1 000</option><option value="10000">10 000</option></select></div>
      <div class="actions">${ACTIONS_LIEU.map(([k, n]) => `<button data-lieu="${k}">${n}</button>`).join('')}</div></details></section>
    <section class="bloc"><h3>Qui vit ici</h3><p class="note">Une bête dessinée en vaut beaucoup : les nombres sont ceux du monde. Touchez une espèce pour la voir et la suivre ; touchez une bête, sur la scène, pour sa fiche.</p><ul class="especes">${esp.map(ligne).join('') || '<li class="vide">Personne ne vit ici en ce moment.</li>'}</ul></section>
    <section class="bloc" id="menagerie"></section>`;
  $('#choixBiome').onchange = e => changerBiome(e.target.value);
  $('details.gestes').addEventListener('toggle', e => { E.gestesOuverts = e.target.open; });
  $$('[data-lieu]').forEach(x => x.onclick = () => gesteLieu(x.dataset.lieu, +$('#nLieu').value));
  $$('[data-choix]').forEach(x => x.onclick = () => { const id = x.dataset.choix; E.espece = E.espece === id ? null : id; scene.surligne = E.espece; rendreBiome(); });
  $$('[data-voir]').forEach(x => x.onclick = () => changerBiome(x.dataset.voir));
  rendreMenagerie(); dessinerCourbeEspece();
}
function detailEspece(e) {
  const t = e.t, p = e.pop, cat = E.vue.catalogue?.traits || {}, nomT = id => ESC(E.vue.taxons.find(z => z.id === id)?.nom || id);
  const ph = (t.phenotypes || []).map(x => ({ x, f: x.frequence_par_biome?.[E.biome] ?? x.frequence })).filter(o => o.f > .001).sort((a, b) => b.f - a.f).slice(0, 8);
  const Q = p.quant || {}, ailleurs = t.populations.filter(q => q.biome !== E.biome).sort((a, b) => b.effectif - a.effectif).slice(0, 6);
  return `<div class="esp-detail"><p class="note">${ESC(t.id)}${t.parent ? ` · née de ${nomT(t.parent)}` : ''}${t.apparu != null ? ` · apparue au cycle ${t.apparu}` : ''} · vit ${e.longevite} cycles, mûre à ${e.maturite} · ${e.ovipare ? 'pond' : 'met bas'}${p.satiete != null ? ` · rassasiée à ${pct(p.satiete)}` : ''}${p.maladie ? ` · <b class="declin">épidémie (virulence ${pct(p.maladie.virulence)})</b>` : ''}${p.predation ? ` · ${pct(p.predation)} de ses morts par prédation` : ''}${p.pression ? ` · ${pct(p.pression)} par les joueurs` : ''}</p>
    ${ph.length > 1 ? `<h4>Phénotypes ici</h4><ul class="barres">${ph.map(o => `<li><span>${ESC(o.x.id)}${o.x.traits?.length ? ` <small>${o.x.traits.map(ESC).join(', ')}</small>` : ''}</span>${barreAxe(o.f, '#e4bb78')}<b>${pct(o.f)}</b></li>`).join('')}</ul>` : ''}
    <h4>Traits continus (moyenne génétique ici, en écarts-types depuis la génération 0)</h4><ul class="barres">${Object.entries(Q).map(([k, q]) => `<li><span>${ESC(P.humain(k))}</span>${barreAxe(.5 + clamp(q.m, -2, 2) / 4, q.m >= 0 ? '#9fb889' : '#c98c6b')}<b>${q.m >= 0 ? '+' : '−'}${fx(Math.abs(q.m), 2)}</b></li>`).join('')}</ul>
    ${e.proies.size ? `<p class="note"><b>Mange</b> : ${[...e.proies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => nomT(id)).join(', ')}</p>` : ''}${e.predateurs.size ? `<p class="note"><b>Mangée par</b> : ${[...e.predateurs].slice(0, 8).map(nomT).join(', ')}</p>` : ''}
    ${ailleurs.length ? `<p class="note"><b>Vit aussi</b> : ${ailleurs.map(q => `<button class="lien" data-voir="${ESC(q.biome)}">${ESC(nomBiome(q.biome))}</button> (${nb(q.effectif)})`).join(', ')}</p>` : ''}
    <canvas class="courbe" id="courbeEspece" height="110" role="img" aria-label="Effectif total de l’espèce au fil des cycles"></canvas></div>`;
}
function dessinerCourbeEspece() { const c = $('#courbeEspece'); if (!c || !E.espece) return; courbe(c, [{ nom: 'effectif total', coul: '#e4bb78', pts: E.totaux.map(x => [x.n, x.e[E.espece] ?? 0]) }]); }
function rendreMenagerie() {
  const el = $('#menagerie'); if (!el) return;
  el.innerHTML = `<h3>Votre ménagerie <small>(${E.menagerie.length})</small></h3>${E.menagerie.length ? `<ul class="menagerie">${E.menagerie.map((m, i) => { const t = E.vue.taxons.find(z => z.id === m.ind.taxon);
    return `<li>${t?.plan?.corps ? V.croquis(t.plan.corps, m.traits || []) : ''}<span><b>${ESC(m.ind.nom)}</b> ${m.ind.sexe === 'f' ? '♀' : '♂'}<small>${ESC(m.nom)} · prise en ${ESC(nomBiome(m.biome))}, cycle ${m.cycle}</small></span><button data-relacher="${i}">Relâcher ici</button></li>`; }).join('')}</ul>
    <p class="note">Relâchée, une bête rend au monde ses gènes (docs/36), même loin de chez elle.</p>` : '<p class="note">Choisissez l’outil « Capturer » sur la scène, puis touchez une bête : elle attendra ici que vous la relâchiez, où vous voudrez.</p>'}`;
  el.querySelectorAll('[data-relacher]').forEach(b => b.onclick = () => relacher(+b.dataset.relacher));
}
function rendreMonde() {
  const I = E.vue, H = E.historique, h = H[H.length - 1] || {}, M = I.monde || {}, souches = Object.values(M.pathogenes?.souches || {}).filter(s => (s.infectes || 0) > 0).sort((a, b) => (b.infectes || 0) - (a.infectes || 0));
  const nbEsp = b => scene.especes && b.id === E.biome ? scene.especes.size : I.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.populations.some(p => p.biome === b.id && p.effectif >= 1)).length;
  const cyc = H.slice(-200), evs = E.journal.filter(j => j.source === 'chronique'), nees = evs.filter(j => j.type === 'naissance').length, mortes = evs.filter(j => j.type === 'extinction').length;
  $('#panneau').innerHTML = `<section class="bloc"><h2>${ESC(M.nom || 'Le monde')}</h2><p class="note">Un monde solo (moteur/solo.js) parti du monde d’Orvane publié au cycle ${E.source?.cycle ?? '?'}. Il vit ici et nulle part ailleurs : le monde partagé continue de son côté.</p>
    <div class="chiffres"><div><b>${I.cycle.n}</b><span>cycle</span></div><div><b>${nb(h.lignees)}</b><span>lignées vivantes</span></div><div><b>${nb(h.animaux)}</b><span>bêtes</span></div><div><b>${nees}</b><span>lignées nées ici</span></div><div><b>${mortes}</b><span>lignées éteintes ici</span></div><div><b>${M.climat ? (M.climat.temperature >= 0 ? '+' : '−') + fx(Math.abs(M.climat.temperature || 0), 3) : '—'}</b><span>écart du climat</span></div></div>
    <canvas class="courbe" id="courbeMonde" height="140" role="img" aria-label="Lignées vivantes et bêtes au fil des cycles"></canvas>
    <canvas class="courbe" id="courbeRegimes" height="120" role="img" aria-label="Biomasse par régime au fil des cycles"></canvas><p class="note">La biomasse de chaque régime, rapportée au premier cycle tracé.</p></section>
    <section class="bloc"><h3>Les biomes</h3><p class="note">Touchez un biome pour y aller.</p><div class="tuiles">${I.biomes.map(b => { const K = V.couleursDe(b); return `<button class="tuile${b.id === E.biome ? ' ici' : ''}" data-biome="${ESC(b.id)}" style="--c:rgb(${K.sol.join(',')});--e:rgb(${K.eau.join(',')})"><span class="tuile-fond ${b.milieu}"></span><b>${ESC(b.nom || b.id)}</b><small>${nbEsp(b)} espèces</small></button>`; }).join('')}</div></section>
    <section class="bloc"><h3>Ce qui est éveillé</h3><ul class="meca">${Object.entries(E.mecanismes || {}).map(([k, s]) => `<li class="${s}"><b>${ESC(P.MECANISMES[k]?.[0] || k)}</b><span>${s === 'eveille' ? 'éveillé' : s === 'endormi' ? 'endormi' : 'absent'}</span></li>`).join('')}</ul>
    ${M.mere ? `<p class="note"><b>${ESC(M.mere.nom || 'La Mère')}</b>, au ${ESC(nomBiome(M.mere.biome))} : ${M.mere.conceptions || 0} plan${M.mere.conceptions > 1 ? 's' : ''} conçu${M.mere.conceptions > 1 ? 's' : ''}${M.mere.courant?.length ? `, en cours : ${M.mere.courant.map(ESC).join(', ')}` : ''}.</p>` : ''}
    ${souches.length ? `<p class="note"><b>Souches qui circulent</b> : ${souches.slice(0, 8).map(s => `${ESC(s.nom)} (virulence ${pct(s.virulence)}, ${nb(s.infectes)} infectés)`).join(', ')}.</p>` : ''}
    ${M.climat ? `<p class="note"><b>Le climat</b> : écart ${fx(M.climat.temperature, 3)}, humidité ${fx(M.climat.humidite, 3)}${M.climat.ponts?.length ? `, ${M.climat.ponts.length} pont${M.climat.ponts.length > 1 ? 's' : ''} de terre` : ''}${M.climat.iles ? `, ${M.climat.iles} île${M.climat.iles > 1 ? 's' : ''}` : ''}.</p>` : ''}
    <button class="lien" data-aller="reglages">Éveiller, endormir, régler…</button></section>`;
  $$('[data-biome]').forEach(x => x.onclick = () => { changerBiome(x.dataset.biome); E.onglet = 'biome'; rendre(); });
  $$('[data-aller]').forEach(x => x.onclick = () => { E.onglet = x.dataset.aller; rendre(); });
  courbe($('#courbeMonde'), [{ nom: 'lignées vivantes', coul: '#e4bb78', pts: cyc.map(x => [x.n, x.lignees]) }, { nom: 'bêtes (échelle à droite)', coul: '#9fb889', pts: cyc.map(x => [x.n, x.animaux]), droite: true }]);
  // la biomasse de chaque régime, rapportée à ce qu'elle était au premier cycle tracé (1 : autant qu'alors)
  courbe($('#courbeRegimes'), Object.keys(COUL_REGIME).filter(k => cyc.some(x => x.par?.[k])).map(k => { const b0 = cyc.find(x => x.par?.[k])?.par[k] || 1; return { nom: REGIME[k], coul: COUL_REGIME[k], pts: cyc.map(x => [x.n, (x.par?.[k] || 0) / b0]) }; }));
}
function rendreJournal() {
  const F = E.filtreJournal, L = E.journal.filter(j => F === 'tout' || (F === 'important' ? j.importance >= 2 : F === 'joueur' ? j.source === 'joueur' : F === 'ici' ? j.biome === E.biome : true)).slice(0, 200);
  $('#panneau').innerHTML = `<section class="bloc"><h2>Le journal</h2><div class="filtres">${[['important', 'L’important'], ['tout', 'Tout'], ['ici', 'Ce biome'], ['joueur', 'Vos gestes']].map(([k, n]) => `<button data-f="${k}" aria-pressed="${F === k}">${n}</button>`).join('')}</div>
    <p class="note">La chronique du monde (moteur/chronique.js, docs/37), cycle après cycle, et ce que vos gestes ont pesé.</p>
    <ol class="journal">${L.map(j => `<li class="imp${j.importance || 1} ${j.source || ''}"><span class="jn">${j.n != null ? 'c' + j.n : ''}</span><div><b>${ESC(j.titre || j.type)}</b><p>${ESC(j.texte || '')}</p></div></li>`).join('') || '<li class="vide">Rien encore : le monde s’installe.</li>'}</ol></section>`;
  $$('[data-f]').forEach(b => b.onclick = () => { E.filtreJournal = b.dataset.f; rendreJournal(); });
}

// --- les réglages ---
function rendreReglages() {
  const n = compteModifies();
  $('#panneau').innerHTML = `<section class="bloc" id="blocTemps"></section>
    <section class="bloc"><h3>La partie</h3><div class="actions"><button id="bSauver">Garder la partie</button><button id="bExporter">Exporter (fichier)</button><button id="bImporter">Importer…</button><button id="bNeuf" class="danger">Repartir du monde publié</button></div>
      <div class="rang"><label class="petit" for="choixMonde">Monde de départ</label><select id="choixMonde"></select></div>
      <p class="note">La partie se garde dans ce navigateur (toutes les 90 secondes, et quand vous quittez la page) et reprend où elle en était, en rattrapant les cycles dus.</p></section>
    <section class="bloc"><h3>Les mécanismes</h3><p class="note">Éveiller un mécanisme absent le fait naître dans ce monde (comme un monde publié, hebergement/cycle.js) ; endormir le met de côté, tel quel, jusqu’à ce qu’on le réveille.</p><ul class="mecas" id="mecas"></ul></section>
    <section class="bloc"><h3>Le monde</h3><div id="pMonde"></div></section>
    <section class="bloc"><h3>Les biomes</h3><div class="rang"><label class="petit" for="choixBiomeR">Biome</label><select id="choixBiomeR">${E.vue.biomes.map(b => `<option value="${ESC(b.id)}">${ESC(b.nom || b.id)}</option>`).join('')}</select></div><div id="pBiome"></div></section>
    <section class="bloc"><h3>Tous les paramètres d’Orvane</h3>
      <div class="rang"><input type="search" id="recherche" placeholder="Chercher un paramètre (mutation, prédation, méfiance…)" value="${ESC(E.recherche)}" aria-label="Chercher un paramètre"></div>
      <p class="note" id="compte">${n ? `${n} paramètre${n > 1 ? 's' : ''} changé${n > 1 ? 's' : ''}` : 'Aucun paramètre changé : le monde tourne avec les règles d’Orvane.'}</p>
      <div class="actions"><button id="bRaz"${n ? '' : ' disabled'}>Tout remettre</button><button id="bExpR">Exporter les réglages</button><button id="bImpR">Importer…</button></div>
      <div id="groupes"></div></section>
    <section class="bloc"><h3>L’affichage</h3><div id="pAffichage"></div></section>`;
  rendreTemps(); rendreMecanismes(); rendreGroupes();
  const sm = $('#choixMonde'); fetch('../mondes/liste.json').then(r => r.ok ? r.json() : []).catch(() => []).then(L => { L = L?.length ? L : [{ id: 'orvane', nom: 'Le monde d’Orvane' }]; sm.innerHTML = L.map(m => `<option value="${ESC(m.id)}">${ESC(m.nom || m.id)}</option>`).join(''); sm.value = E.monde; });
  sm.onchange = () => { if (confirm(`Partir de « ${sm.options[sm.selectedIndex].text} » ? La partie en cours sera remplacée.`)) { location.href = `?monde=${encodeURIComponent(sm.value)}&neuf`; ecrirePartie(null).catch(() => { }); } else sm.value = E.monde; };
  $('#bSauver').onclick = () => sauverPartie(true); $('#bExporter').onclick = () => exporterPartie(); $('#bImporter').onclick = () => { $('#fichier').dataset.quoi = 'partie'; $('#fichier').click(); };
  $('#bNeuf').onclick = async () => { if (!confirm('Repartir du monde d’Orvane tel qu’il est publié ? La partie en cours sera effacée.')) return; await ecrirePartie(null).catch(() => { }); chargement('Le monde d’Orvane arrive…'); await nouvelle(E.biome); };
  $('#choixBiomeR').value = E.biomeReglage || E.biome; $('#choixBiomeR').onchange = e => { E.biomeReglage = e.target.value; rendreBiomeReglages(); };
  $('#recherche').oninput = e => { E.recherche = e.target.value; rendreGroupes(); };
  $('#bRaz').onclick = () => { if (!confirm('Remettre tous les paramètres d’Orvane à leurs valeurs d’origine ?')) return; const m = E.reglages.mecanismes; E.reglages = m ? { mecanismes: m } : {}; ecrireLS('orvane-sim-reglages', E.reglages); appliquerPage(); envoyerReglages(true); rendreReglages(); };
  $('#bExpR').onclick = () => telecharger('orvane-reglages.json', JSON.stringify({ orvane_simulation_reglages: 1, reglages: E.reglages, temps: E.temps, affichage: E.affichage }, null, 1));
  $('#bImpR').onclick = () => { $('#fichier').dataset.quoi = 'reglages'; $('#fichier').click(); };
  ligneMonde(); rendreBiomeReglages(); rendreAffichage();
}
function rendreTemps() {
  const el = $('#blocTemps'); if (!el) return;
  el.innerHTML = `<h3>Le temps</h3><p class="note">Un cycle est un pas du monde (docs/19) : les bêtes naissent, meurent, migrent, mutent une fois. Le monde partagé en fait un par jour ; ici, vous choisissez.</p>
    <div class="rang"><label class="petit" for="rythme2">Rythme</label><select id="rythme2">${$('#rythme').innerHTML}</select></div>
    ${ligneNum('temps', 'acceleration', 'Accéléré', 'à 60, une minute réelle compte pour une heure', E.temps.acceleration, 1, 1, 1000, 1)}
    ${ligneNum('temps', 'rattrapage', 'Rattrapage', 'cycles dus rattrapés d’un coup, au plus, après une absence', E.temps.rattrapage, 24, 1, 500, 1)}
    <div class="actions"><button data-n="1">Faire 1 cycle</button><button data-n="10">10 cycles</button><button data-n="50">50 cycles</button></div>
    <p class="note">Mesuré : un cycle prend ${fx(E.mesure / 1000, 1)} s de calcul sur cet appareil.</p>`;
  const r = $('#rythme2'); r.value = E.temps.rythme; r.onchange = () => changerRythme(r.value);
  el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => lancer(+b.dataset.n, true));
}
function rendreMecanismes() {
  const el = $('#mecas'); if (!el) return;
  el.innerHTML = Object.entries(E.mecanismes || {}).map(([k, s]) => { const [nom, aide] = P.MECANISMES[k] || [k, ''], fige = k === 'flore' && s === 'eveille';
    return `<li class="${s}"><label><span><b>${ESC(nom)}</b><small>${ESC(aide)}</small></span><span class="interrupteur"><input type="checkbox" data-meca="${k}"${s === 'eveille' ? ' checked' : ''}${fige ? ' disabled' : ''}><span></span></span></label><em>${s === 'eveille' ? 'éveillé' : s === 'endormi' ? 'endormi' : 'absent'}</em></li>`; }).join('');
  el.querySelectorAll('[data-meca]').forEach(c => c.onchange = () => { E.reglages.mecanismes ||= {}; E.reglages.mecanismes[c.dataset.meca] = c.checked; ecrireLS('orvane-sim-reglages', E.reglages); envoyerReglages(true); c.closest('li').querySelector('em').textContent = c.checked ? 'éveil…' : 'endormi'; });
}
// une ligne de réglage : un nombre (curseur et champ), un interrupteur, ou une valeur vide (∞, aucun plafond)
function bornes(d) { const a = Math.abs(d); if (!Number.isFinite(a) || a === 0) return [0, 1, .001]; const mx = Number.isInteger(d) && a >= 1 ? Math.max(a * 4, a + 10) : a * 4; return d < 0 ? [-mx, 0, mx / 400] : [0, mx, mx / 400]; }
function ligneNum(g, c, nom, aide, v, d, mn, mx, pasV) {
  const id = ('p_' + g + '_' + c).replace(/[^\w]/g, '_'), mod = g === 'temps' ? v !== d : c in (E.reglages[g] || {}), vide = v == null || !Number.isFinite(v);
  if (mn == null) [mn, mx, pasV] = bornes(typeof d === 'number' ? d : (typeof v === 'number' ? v : 0));
  return `<div class="p-ligne${mod ? ' modifie' : ''}" data-g="${ESC(g)}" data-c="${ESC(c)}"><label class="p-nom" for="${id}">${ESC(nom)}${aide ? `<small>${ESC(aide)}</small>` : ''}</label>
    <div class="p-ctl">${vide && (d == null || !Number.isFinite(d)) ? '' : `<input type="range" min="${mn}" max="${mx}" step="${pasV}" value="${vide ? d : v}" aria-label="${ESC(nom)}">`}<input type="number" id="${id}" step="any" value="${vide ? '' : v}" placeholder="${d == null ? 'aucun' : !Number.isFinite(d) ? '∞' : ''}">
    <button class="p-raz" title="Revenir à ${ESC(d == null ? 'aucun' : !Number.isFinite(d) ? '∞' : fx(d, 6))}" aria-label="Revenir à la valeur d’origine">↺</button></div></div>`;
}
function ligneBool(g, c, nom, aide, v, d) {
  const id = ('p_' + g + '_' + c).replace(/[^\w]/g, '_');
  return `<div class="p-ligne${c in (E.reglages[g] || {}) ? ' modifie' : ''}" data-g="${ESC(g)}" data-c="${ESC(c)}"><label class="p-nom" for="${id}">${ESC(nom)}${aide ? `<small>${ESC(aide)}</small>` : ''}</label>
    <div class="p-ctl"><span class="interrupteur"><input type="checkbox" id="${id}"${v ? ' checked' : ''}><span></span></span><button class="p-raz" title="Revenir à ${d ? 'oui' : 'non'}" aria-label="Revenir à la valeur d’origine">↺</button></div></div>`;
}
function ligne(g, c) { const d = defautDe(g, c), v = valeurDe(g, c), [nom, aide] = P.nom(g, c); return typeof d === 'boolean' ? ligneBool(g, c, nom, aide, v, d) : ligneNum(g, c, nom, aide, v, d); }
function lignesDe(g) { return P.feuilles(arbre(g)).map(([c]) => c); }
function rendreGroupes() {
  const el = $('#groupes'); if (!el) return; const q = sansAccent(E.recherche.trim());
  if (q) { const res = []; for (const G of P.GROUPES) { if (!arbre(G.id)) continue; for (const c of lignesDe(G.id)) { const [nom, aide] = P.nom(G.id, c); if (sansAccent(`${nom} ${aide} ${c} ${G.titre}`).includes(q)) res.push([G, c]); } }
    el.innerHTML = res.length ? `<p class="note">${res.length} paramètre${res.length > 1 ? 's' : ''}${res.length > 150 ? ' (les 150 premiers)' : ''}</p>` + res.slice(0, 150).map(([G, c]) => `<div class="p-trouve"><small>${ESC(G.titre)}</small>${ligne(G.id, c)}</div>`).join('') : '<p class="vide">Aucun paramètre ne s’appelle ainsi.</p>'; return; }
  el.innerHTML = P.GROUPES.filter(G => arbre(G.id)).map(G => { const n = lignesDe(G.id).length, m = Object.keys(E.reglages[G.id] || {}).length, s = G.mecanisme ? E.mecanismes?.[G.mecanisme] : null;
    return `<details class="groupe" data-groupe="${G.id}"${E.ouverts.has(G.id) ? ' open' : ''}><summary><span><b>${ESC(G.titre)}</b><small>${ESC(G.sous)}${G.doc ? ` · ${ESC(G.doc)}` : ''}</small></span><em>${n}${m ? ` · <b>${m} changé${m > 1 ? 's' : ''}</b>` : ''}${s && s !== 'eveille' ? ` · ${s === 'endormi' ? 'endormi' : 'absent'}` : ''}</em></summary><div class="groupe-corps"></div></details>`; }).join('');
  el.querySelectorAll('details.groupe').forEach(d => { if (d.open) remplirGroupe(d); d.addEventListener('toggle', () => { if (d.open) { E.ouverts.add(d.dataset.groupe); remplirGroupe(d); } else E.ouverts.delete(d.dataset.groupe); }); });
}
function remplirGroupe(d) {
  const g = d.dataset.groupe, corps = d.querySelector('.groupe-corps'); if (corps.dataset.plein) return; corps.dataset.plein = 1;
  const L = lignesDe(g);
  if (g === 'orvane') { const S = {}; for (const c of L) (S[P.sectionOrvane(c)] ||= []).push(c); corps.innerHTML = Object.entries(S).map(([s, cs]) => `<h4>${ESC(s)}</h4>${cs.map(c => ligne(g, c)).join('')}`).join(''); }
  else if (/traits|modules|savoirs|formes|rendement|defense|perte|quant/.test(g)) { const S = {}; for (const c of L) (S[c.split('.')[0]] ||= []).push(c); corps.innerHTML = Object.entries(S).map(([s, cs]) => `<h4>${ESC(P.humain(s))}</h4>${cs.map(c => ligne(g, c)).join('')}`).join(''); }
  else corps.innerHTML = L.map(c => ligne(g, c)).join('');
}
function ligneMonde() {
  const el = $('#pMonde'); if (!el) return;
  el.innerHTML = ligneNum('monde', 'graine', 'Graine', 'le hasard du monde : une autre graine, et la suite diverge autrement', valeurDe('monde', 'graine'), defautDe('monde', 'graine'), 0, 99999, 1)
    + ligneNum('monde', 'annee', 'Année', 'durée de l’année en cycles (0 : pas de saisons)', valeurDe('monde', 'annee'), defautDe('monde', 'annee'), 0, 480, 1);
}
function rendreBiomeReglages() {
  const el = $('#pBiome'); if (!el) return; const id = E.biomeReglage || E.biome, b0 = E.valeurs?.biomes0?.[id]; if (!b0) { el.innerHTML = ''; return; }
  const c = k => `${id}.${k}`, b = E.vue.biomes.find(x => x.id === id);
  el.innerHTML = ligneNum('biomes', c('capacite_base'), 'Capacité de base', `la biomasse que le lieu nourrit (aujourd’hui ${nb(b?.capacite)})`, valeurDe('biomes', c('capacite_base')), b0.capacite_base)
    + AXES.map(([k, n]) => ligneNum('biomes', c('axes.' + k), n, `axe du lieu, de 0 à 1 (aujourd’hui ${fx(b?.axes?.[k], 3)})`, valeurDe('biomes', c('axes.' + k)), b0.axes?.[k], 0, 1, .005)).join('')
    + (b?.saisons === false || b?.saisons === null ? '<p class="note">Ce lieu n’a pas de saisons.</p>' : ['temperature', 'lumiere', 'humidite', 'capacite'].map(k => ligneNum('biomes', c('saisons.' + k), `Saisons : ${P.humain(k)}`, 'amplitude de la saison sur ce lieu', valeurDe('biomes', c('saisons.' + k)), defautDe('biomes', c('saisons.' + k)), 0, 1, .005)).join(''));
}
function rendreAffichage() {
  const el = $('#pAffichage'); if (!el) return; const A = E.affichage;
  el.innerHTML = ligneNum('affichage', 'densite', 'Densité', 'combien de bêtes dessiner (plus : plus lent sur un téléphone)', A.densite, 1, .2, 3, .1)
    + [['etiquettes', 'Noms sur la scène', 'le nom des bêtes de l’espèce suivie'], ['fuite', 'Distance de fuite', 'le cercle autour de la bête choisie (docs/12)'], ['meteo', 'Météo', 'neige, pluie, feu, crue, sécheresse'], ['nuit', 'La nuit', 'la scène s’assombrit la nuit']].map(([k, n, a]) => ligneBool('affichage', k, n, a, A[k], AFFICHAGE0[k])).join('')
    + `<div class="p-ligne" data-g="affichage" data-c="journee"><label class="p-nom" for="journee">Une journée à l’écran<small>un cycle est une tranche de vie, pas une journée</small></label><div class="p-ctl"><select id="journee">${[['cycle', 'le temps d’un cycle'], ['60', '1 minute'], ['300', '5 minutes'], ['horloge', 'l’horloge de l’appareil']].map(([k, n]) => `<option value="${k}"${A.journee === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div>`
    + `<div class="p-ligne" data-g="affichage" data-c="poids"><label class="p-nom" for="poidsG">Ce que pèse un geste<small>une bête du monde, ou toutes celles que la bête dessinée représente</small></label><div class="p-ctl"><select id="poidsG"><option value="part"${A.poids === 'part' ? ' selected' : ''}>la part dessinée</option><option value="une"${A.poids !== 'part' ? ' selected' : ''}>une bête</option></select></div></div>`;
}
function compteModifies() { let n = 0; for (const [g, o] of Object.entries(E.reglages)) if (g !== 'mecanismes') n += Object.keys(o || {}).length; return n; }
function marquerModifies() { const n = compteModifies(), el = $('#compte'); if (el) el.textContent = n ? `${n} paramètre${n > 1 ? 's' : ''} changé${n > 1 ? 's' : ''}` : 'Aucun paramètre changé : le monde tourne avec les règles d’Orvane.'; const b = $('#bRaz'); if (b) b.disabled = !n; }
// un changement dans une ligne de réglage (délégué au panneau)
function surReglage(ev) {
  const L = ev.target.closest('.p-ligne'); if (!L) return; const g = L.dataset.g, c = L.dataset.c, t = ev.target;
  if (t.matches('.p-raz')) { const d = g === 'temps' ? TEMPS0[c] : g === 'affichage' ? AFFICHAGE0[c] : defautDe(g, c); poser(g, c, d, L); majLigne(L, d); return; }
  if (ev.type === 'click') return;
  let v;
  if (t.type === 'checkbox') v = t.checked; else if (t.tagName === 'SELECT') v = t.value;
  else if (t.type === 'range') { v = +t.value; const n = L.querySelector('input[type=number]'); if (n) n.value = v; }
  else if (t.type === 'number') { if (t.value === '') v = g === 'temps' || g === 'affichage' ? undefined : defautDe(g, c); else { v = +t.value; if (!Number.isFinite(v)) return; } const r = L.querySelector('input[type=range]'); if (r && v != null && Number.isFinite(v)) r.value = v; }
  if (v === undefined) return;
  poser(g, c, v, L);
}
function poser(g, c, v, L) {
  if (g === 'temps') { E.temps[c] = c === 'rattrapage' ? Math.max(1, Math.round(v)) : Math.max(1e-3, v); ecrireLS('orvane-sim-temps', E.temps); L?.classList.toggle('modifie', E.temps[c] !== TEMPS0[c]); entete(); return; }
  if (g === 'affichage') { E.affichage[c] = v; ecrireLS('orvane-sim-affichage', E.affichage); appliquerPage(); L?.classList.toggle('modifie', v !== AFFICHAGE0[c]); if (c === 'densite') V.installer(scene, E.vue, E.biome, { duree: attendu(), profil: profilPage() }); return; }
  if (g === 'monde' || g === 'biomes') { if (typeof v === 'number' && g === 'monde') v = Math.round(v); }
  regler(g, c, v); L?.classList.toggle('modifie', c in (E.reglages[g] || {}));
}
function majLigne(L, d) { const n = L.querySelector('input[type=number]'), r = L.querySelector('input[type=range]'), b = L.querySelector('input[type=checkbox]'), s = L.querySelector('select');
  if (n) n.value = d == null || !Number.isFinite(d) ? '' : d; if (r && d != null && Number.isFinite(d)) r.value = d; if (b) b.checked = !!d; if (s && d != null) s.value = d; }

// === les courbes (un petit traceur, sans bibliothèque) ===
function courbe(c, series) {
  if (!c) return; const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth || 300, h = +c.getAttribute('height'); c.width = w * dpr; c.height = h * dpr; c.style.height = h + 'px';
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const S = series.filter(s => s.pts.length); x.font = '11px Inter, system-ui, sans-serif';
  if (!S.length || S.every(s => s.pts.length < 2)) { x.fillStyle = '#8a958c'; x.fillText('La courbe se dessine au fil des cycles.', 8, h / 2); return; }
  const n0 = Math.min(...S.map(s => s.pts[0][0])), n1 = Math.max(...S.map(s => s.pts[s.pts.length - 1][0])), m = { g: 6, d: 6, h: 18, b: 16 };
  const X = n => m.g + (w - m.g - m.d) * (n - n0) / Math.max(1, n1 - n0);
  const bornesY = L => { let a = Math.min(...L), b = Math.max(...L); if (a === b) { a -= 1; b += 1; } return [a, b]; };
  const gauche = bornesY(S.filter(s => !s.droite).flatMap(s => s.pts.map(p => p[1])).concat(S.some(s => !s.droite) ? [] : [0, 1])), droite = bornesY(S.filter(s => s.droite).flatMap(s => s.pts.map(p => p[1])).concat(S.some(s => s.droite) ? [] : [0, 1]));
  x.strokeStyle = 'rgba(185,198,171,.25)'; x.lineWidth = 1; for (let k = 0; k <= 3; k++) { const y = m.h + (h - m.h - m.b) * k / 3; x.beginPath(); x.moveTo(m.g, y); x.lineTo(w - m.d, y); x.stroke(); }
  for (const s of S) { const [a, b] = s.droite ? droite : gauche, Y = v => h - m.b - (h - m.h - m.b) * (v - a) / (b - a); x.strokeStyle = s.coul; x.lineWidth = 2; x.beginPath(); s.pts.forEach(([n, v], i) => i ? x.lineTo(X(n), Y(v)) : x.moveTo(X(n), Y(v))); x.stroke(); }
  x.fillStyle = '#8a958c'; x.textAlign = 'left'; x.fillText('c' + n0, m.g, h - 3); x.textAlign = 'right'; x.fillText('c' + n1, w - m.d, h - 3);
  let lx = m.g; x.textAlign = 'left'; for (const s of S) { x.fillStyle = s.coul; x.fillRect(lx, 5, 9, 3); x.fillStyle = '#c9d2c5'; x.fillText(s.nom, lx + 12, 11); lx += x.measureText(s.nom).width + 26; }
}

// === brancher l'interface ===
function brancherInterface() {
  $('#bJouer').onclick = () => { E.temps.enMarche = !E.temps.enMarche; if (E.temps.enMarche) E.dernier = Date.now(); ecrireLS('orvane-sim-temps', E.temps); entete(); };
  $('#rythme').onchange = e => changerRythme(e.target.value);
  $$('#onglets button').forEach(b => b.onclick = () => { E.onglet = b.dataset.o; rendre(); if (innerWidth < 900) $('#panneau').scrollIntoView?.({ block: 'start' }); });
  $$('#outils button').forEach(b => b.onclick = () => { E.outil = b.dataset.outil; scene.outil = E.outil; $$('#outils button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#toile').dataset.outil = E.outil; });
  $('#hudBiome').onclick = () => { E.onglet = 'monde'; rendre(); if (innerWidth < 900) $('#panneau').scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };
  const p = $('#panneau'); p.addEventListener('input', surReglage); p.addEventListener('change', e => { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') surReglage(e); }); p.addEventListener('click', e => { if (e.target.matches('.p-raz')) surReglage(e); });
  $('#fichier').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { if (e.target.dataset.quoi === 'partie') { await importerPartie(f); toast('Partie importée.'); }
      else { const j = JSON.parse(await f.text()); if (!j?.orvane_simulation_reglages) throw new Error('ce ne sont pas des réglages de la simulation'); E.reglages = j.reglages || {}; if (j.temps) E.temps = { ...TEMPS0, ...j.temps }; if (j.affichage) E.affichage = { ...AFFICHAGE0, ...j.affichage };
        ecrireLS('orvane-sim-reglages', E.reglages); ecrireLS('orvane-sim-temps', E.temps); ecrireLS('orvane-sim-affichage', E.affichage); appliquerPage(); envoyerReglages(true); remplirRythme(); rendreReglages(); toast('Réglages importés.'); } }
    catch (er) { toast(`Import impossible : ${er.message}`, 'erreur'); } };
  addEventListener('visibilitychange', () => { if (document.hidden) sauverPartie(false); });
  addEventListener('pagehide', () => sauverPartie(false));
  addEventListener('keydown', e => { if (e.target.closest('input,select,textarea')) return; if (e.key === ' ') { e.preventDefault(); $('#bJouer').click(); } if (e.key === 'Escape') carte(null); });
}

if (!V || !Individus || !P) { document.addEventListener('DOMContentLoaded', () => { $('#chargement p').textContent = 'La page ne trouve pas le moteur : ouvrez-la depuis le dépôt Orvane (elle a besoin de ../moteur et ../tampon).'; }); return; }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
