// Orvane — LA SANTÉ DU MOTEUR (outils/sante.js) — docs/51
// Les mesures du rapport de santé d'un monde publié : ce qu'il porte, ce que les joueurs lui envoient et ce qu'il en fait, ce que
// les bêtes en retiennent, ses souches, le rythme de ses cycles, ce que l'année et le climat lui réservent, et des alertes tirées de
// règles simples. Le récit du rapport (le titre, le résumé, les constats, ce qu'il faut faire) s'écrit à la main, ou par la tâche de
// chaque semaine, au-dessus de ces mesures ; l'observatoire les affiche (monde/sante.js, vue « Santé »).
//   node outils/sante.js <dossier d'un monde publié> [--precedent <rapport.json>] [--sortie <rapport.json>] [--date AAAA-MM-JJ]
//   le dossier : mondes/<id>/ de la branche publication (instantane.json, historique.json, tampon.json, jeux.json, profil.json,
//   chronique/index.json) ; --precedent : le rapport d'avant, pour les écarts ; --sortie : écrit le rapport (sans récit, ou en
//   gardant celui d'un rapport existant au même chemin), sinon l'écrit sur la sortie standard.
// Une lecture : rien ne change dans le monde. Déterministe. Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path');
const Climat = require('../moteur/climat.js'), Orvane = require('../moteur/orvane.js');

const SAISONS = ['hiver', 'printemps', 'été', 'automne'];
const saisonDe = (n, annee) => SAISONS[Math.floor((((n % annee) / annee) + .125) % 1 * 4)];
// (la production de la saison, comme le cycle la calcule : avec les saisons de son monde, Orvane.contexte(inst).R.saisons, docs/59)
const productionDe = (n, annee, saisons = Orvane.REGLES.saisons) => +(1 + saisons.capacite * -Math.cos(2 * Math.PI * ((n % annee) / annee))).toFixed(3);
const r = (x, d = 3) => +Number(x).toFixed(d);
const fr = (x, d = 3) => (x < 0 ? '−' : '') + Math.abs(+Number(x).toFixed(d)).toLocaleString('fr-FR', { maximumFractionDigits: d });   // (un nombre écrit à la française, avec un vrai signe moins)
const somme = a => a.reduce((s, x) => s + x, 0);
const effectif = t => somme((t.populations || []).map(p => p.effectif || 0));
const origineDe = t => t.origine?.nom || 'Orvane';
// la durée d'un cycle (profil.monde.cycle : « 24h », « 6h », « 30min », « 10m », « 7d »), en millisecondes
const dureeDe = c => { const m = /^(\d+(?:\.\d+)?)\s*(min|m|h|d)$/.exec(String(c || '24h').trim()); if (!m) return 864e5; return +m[1] * { min: 6e4, m: 6e4, h: 36e5, d: 864e5 }[m[2]]; };

// --- les règles des alertes : simples, et dites dans le rapport ---
const SEUILS = {
  groupe_min: 5,            // un groupe (régime × origine) compte à partir de cinq lignées
  recul: .2,                // une baisse de 20 % sur la fenêtre…
  recul_suite: 5,           // … et à chacun des cinq derniers cycles : une alerte
  essor: 2,                 // un groupe qui double sur la fenêtre : à surveiller
  machines: .1,             // des machines qui croissent de plus de 10 % par cycle : à surveiller
  retrait_min: .05,         // un retrait lissé de moins d'un vingtième de bête ne se juge pas
  silence: 7,               // sept cycles sans aucun événement de joueur : à dire
  ecart_h: 30,              // plus de 30 heures entre deux cycles d'un monde au jour : un trou dans le rythme
  virulence: .35            // une souche plus virulente : à surveiller
};

function lire(dossier, f, defaut) { try { return JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')); } catch (e) { if (defaut !== undefined) return defaut; throw e; } }

function mesurer({ I, H = [], T = {}, J = [], P = null, C = null, precedent = null, date = null }) {
  const n = I.cycle.n, annee = I.monde?.annee || P?.monde?.annee || null, duree = dureeDe(P?.monde?.cycle), t0 = Date.parse(I.cycle.date), saisons = Orvane.contexte(I).R.saisons;
  const dateDe = k => new Date(t0 + (k - n) * duree).toISOString();
  const info = new Map(I.taxons.map(t => [t.id, t]));
  const animaux = I.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique');
  const machines = I.taxons.filter(t => !t.eteint && t.plan?.regime === 'synthetique');
  const statuts = {}; for (const t of I.taxons) statuts[t.statut || 'stable'] = (statuts[t.statut || 'stable'] || 0) + 1;
  const hist = [...H.filter(h => h.cycle.n < n), { cycle: I.cycle, taxons: I.taxons, biomes: I.biomes, evenements: I.evenements }].sort((a, b) => a.cycle.n - b.cycle.n);

  // --- le monde ---
  const monde = { id: I.monde.id, nom: I.monde.nom, ne: I.monde.ne || null, cycle: n, date: I.cycle.date, annee,
    saison: I.cycle.saison || null, duree_cycle_h: r(duree / 36e5, 2), contrat: I.orvane };
  const effectifs = { lignees_animales: animaux.length, machines: machines.length, lignees_plantes: I.monde?.diversite?.lignees ?? I.monde?.flore?.lignees ?? null,
    betes: Math.round(somme([...animaux, ...machines].map(effectif))), lieux: I.biomes.length, parcelles: I.monde?.parcelles?.nombre ?? null,
    populations: somme([...animaux, ...machines].map(t => (t.populations || []).length)), statuts,
    menacees: I.taxons.filter(t => !t.eteint && t.statut === 'menace').map(t => ({ taxon: t.id, nom: t.nom, regime: t.plan?.regime, origine: origineDe(t), effectif: effectif(t) })).sort((a, b) => a.effectif - b.effectif) };
  // les extinctions de la fenêtre, avec leur cause (le muséum la donne ; sinon la chronique)
  const eteintes = []; const vus = new Set();
  for (const h of hist) for (const t of h.taxons) if (t.eteint && !vus.has(t.id) && t.eteint >= (hist[0]?.cycle.n ?? n)) { vus.add(t.id);
    const ent = (C?.derniers || []).find(e => e.type === 'extinction' && e.taxon === t.id); const cause = ent ? (ent.texte.split(' : ').slice(1).join(' : ') || null) : null;
    eteintes.push({ taxon: t.id, nom: t.nom, cycle: t.eteint, cause }); }
  effectifs.eteintes = eteintes;

  // --- la série de chaque cycle, et les groupes (régime × origine) ---
  const cle = t => `${t.plan?.regime || '?'}|${origineDe(t)}`, cleDe = id => { const t = info.get(id); return t ? cle(t) : null; };
  const serie = hist.map(h => { const g = {}; let betes = 0;
    for (const t of h.taxons) { if (t.eteint) continue; const e = effectif(t), k = cleDe(t.id); if (info.get(t.id)?.plan?.regime !== 'vegetal') betes += e; if (k) g[k] = (g[k] || 0) + e; }
    return { n: h.cycle.n, date: h.cycle.date, evenements_joueurs: h.cycle.pressions_recues ?? 0, saison: h.cycle.saison?.nom || null, production: h.cycle.saison?.production ?? null,
      betes: Math.round(betes), lignees: h.taxons.filter(t => !t.eteint && info.get(t.id)?.plan?.regime !== 'vegetal').length,
      evenements: (h.evenements || []).reduce((o, e) => (o[e.type] = (o[e.type] || 0) + 1, o), {}), groupes: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Math.round(v)])) }; });
  const groupes = [];
  for (const k of new Set([...I.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal').map(cle)])) {
    const [regime, origine] = k.split('|'), L = I.taxons.filter(t => !t.eteint && cle(t) === k);
    const pts = serie.map(s => s.groupes[k] ?? null), deb = pts.findIndex(v => v != null && v > 0);
    if (deb < 0) continue;
    const v = pts.slice(deb), pentes = v.slice(1).map((x, i) => v[i] > 0 ? r(x / v[i] - 1, 4) : null);
    let sat = 0, w = 0; for (const t of L) for (const p of t.populations || []) if (p.satiete != null) { sat += p.satiete * p.effectif; w += p.effectif; }
    groupes.push({ cle: k, regime, origine, lignees: L.length, depuis: serie[deb].n, debut: v[0], fin: v[v.length - 1], variation: v[0] > 0 ? r(v[v.length - 1] / v[0] - 1, 4) : null,
      pentes: pentes.slice(-8), satiete: w ? r(sat / w) : null });
  }
  groupes.sort((a, b) => Math.abs(b.variation ?? 0) * Math.log10(2 + b.fin) - Math.abs(a.variation ?? 0) * Math.log10(2 + a.fin));

  // --- les pressions des joueurs ---
  const lisse = T.lisse || {}, retraits = [];
  for (const [tid, Bs] of Object.entries(lisse)) for (const [bid, ph] of Object.entries(Bs || {})) {
    const t = info.get(tid), p = t?.populations?.find(q => q.biome === bid), tot = somme(Object.values(ph || {}));
    retraits.push({ taxon: tid, nom: t?.nom || tid, origine: t ? origineDe(t) : null, regime: t?.plan?.regime || null, biome: bid, phenotypes: Object.keys(ph || {}),
      retrait: r(tot), effectif: p?.effectif ?? 0, pression: p?.pression ?? null,
      // appliqué : le moteur a compté des morts dues aux joueurs dans cette population ce cycle (le champ pression est là)
      applique: !!p && 'pression' in p, juge: tot >= SEUILS.retrait_min });
  }
  retraits.sort((a, b) => b.retrait - a.retrait);
  const prises = []; for (const [tid, Bs] of Object.entries(T.lisseQ || {})) for (const [bid, Q] of Object.entries(Bs || {})) for (const [trait, x] of Object.entries(Q || {}))
    if (x?.w > 0) prises.push({ taxon: tid, nom: info.get(tid)?.nom || tid, biome: bid, trait, z: r(x.s / x.w, 2), poids: r(x.w, 4) });
  prises.sort((a, b) => b.poids - a.poids || Math.abs(b.z) - Math.abs(a.z));
  const fen = serie.slice(-SEUILS.silence);
  const pressions = { evenements: somme(serie.map(s => s.evenements_joueurs)), cycles: serie.length, cycles_avec_lots: serie.filter(s => s.evenements_joueurs > 0).length,
    dernier_lot: T.dernier_id ?? null, derniere_lecture: T.derniere_lecture || null,
    jeux: (Array.isArray(J) ? J : []).map(j => ({ id: j.id, nom: j.nom || j.id, actif: j.actif !== false, expose: !!(j.exposition && Object.keys(j.exposition).length) })),
    retrait_total: r(somme(retraits.map(x => x.retrait))), retrait_perdu: r(somme(retraits.filter(x => x.juge && !x.applique).map(x => x.retrait))),
    retraits, prises: prises.slice(0, 12),
    plafonds: P?.influence?.plafonds || null, memoire_cycles: P?.influence?.memoire_cycles ?? null };

  // --- ce que les bêtes retiennent des joueurs ---
  const traces = [], att = {}; let mef = 0, hab = 0, agr = 0;
  for (const t of animaux) for (const p of t.populations || []) {
    if (p.mefiance) mef++; if (p.habituation) hab++; if (p.memoire?.agressivite) agr++; if (p.attitude) att[p.attitude] = (att[p.attitude] || 0) + 1;
    if (p.mefiance || p.habituation || p.memoire || p.attitude) traces.push({ taxon: t.id, nom: t.nom, biome: p.biome, effectif: p.effectif, mefiance: p.mefiance || 0, habituation: p.habituation || 0,
      agressivite: p.memoire?.agressivite || 0, attrait: p.memoire?.attrait || 0, traque: p.memoire?.traque || 0, attitude: p.attitude || null, combativite: t.caractere?.combativite ?? null }); }
  const fort = x => Math.max(x.mefiance, x.agressivite, x.attrait, x.traque, x.habituation / 2);
  traces.sort((a, b) => fort(b) - fort(a));
  const car = animaux.filter(t => t.caractere).map(t => t.caractere), q = (a, k) => { const s = a.slice().sort((x, y) => x - y); return s.length ? r(s[Math.floor(k * (s.length - 1))], 2) : null; };
  const maxDe = k => traces.reduce((m, x) => x[k] > (m?.[k] ?? 0) ? x : m, null);
  const memoire = { eveillee: I.monde?.memoire?.depuis ?? null, avec_trace: traces.length, populations: effectifs.populations,
    mefiance: { n: mef, max: maxDe('mefiance') }, habituation: { n: hab, max: maxDe('habituation') }, agressivite: { n: agr, max: maxDe('agressivite') }, attitudes: att,
    seuils: { fuyante: .5, agressive: .4, familiere: .5 }, top: traces.slice(0, 14),
    caractere: car.length ? { lignees: car.length, combatives: car.filter(c => c.combativite >= .6).length, fuyardes: car.filter(c => c.combativite < .2).length,
      jamais_familieres: car.filter(c => c.hardiesse < .27).length, opportunistes: car.filter(c => c.opportunisme >= .6).length,
      combativite: [q(car.map(c => c.combativite), .1), q(car.map(c => c.combativite), .5), q(car.map(c => c.combativite), .9)] } : null };

  // --- les souches ---
  const S = I.monde?.pathogenes?.souches || {}, infectees = [];
  for (const t of animaux) for (const p of t.populations || []) if (p.infection) for (const [s, x] of Object.entries(p.infection)) if (x.i > 0)
    infectees.push({ taxon: t.id, nom: t.nom, biome: p.biome, souche: s, effectif: p.effectif, infectes: Math.round(x.i * p.effectif), part: r(x.i, 4), immunises: r(x.r || 0, 4) });
  infectees.sort((a, b) => b.infectes - a.infectes);
  const souches = { liste: Object.entries(S).map(([id, s]) => ({ id, nom: s.nom, virulence: s.virulence, transmission: s.transmission, origine: s.origine, apparu: s.apparu,
    hotes: s.hotes || [], infectes: s.infectes ?? 0, vecteur: s.vecteur || null, parent: s.parent || null })).sort((a, b) => b.infectes - a.infectes),
    infectes: somme(Object.values(S).map(s => s.infectes || 0)), lignees_infectees: [...new Set(infectees.map(x => x.taxon))].length, populations: infectees.slice(0, 12) };

  // --- le reste du vivant ---
  const savoirs = {}; let popSav = 0; for (const t of animaux) for (const p of t.populations || []) if (p.savoirs) { popSav++; for (const k of Object.keys(p.savoirs)) savoirs[k] = (savoirs[k] || 0) + 1; }
  const serieMachines = serie.map(s => somme(Object.entries(s.groupes).filter(([k]) => k.startsWith('synthetique|')).map(([, v]) => v)));
  const vivant = { savoirs: { populations: popSav, par_savoir: savoirs }, hybrides: Array.isArray(C?.hybrides) ? C.hybrides.length : null,
    groupes_de_vie: animaux.reduce((o, t) => { for (const p of t.populations || []) if (p.groupe?.forme) o[p.groupe.forme] = (o[p.groupe.forme] || 0) + 1; return o; }, {}),
    migratrices: somme(animaux.map(t => (t.populations || []).filter(p => p.migration).length)),
    machines: { lignees: machines.length, serie: serieMachines, pente: serieMachines.length > 1 && serieMachines[serieMachines.length - 2] > 0 ? r(serieMachines[serieMachines.length - 1] / serieMachines[serieMachines.length - 2] - 1, 4) : null },
    mere: I.monde?.mere ? { biome: I.monde.mere.biome, conceptions: I.monde.mere.conceptions, prochaine: I.monde.mere.prochaine } : null,
    chronique: C?.compte || null };

  // --- le rythme des cycles ---
  const cycles = serie.map(s => ({ n: s.n, date: s.date })), ecarts = [], memeJour = [];
  for (let i = 1; i < cycles.length; i++) { const h = (Date.parse(cycles[i].date) - Date.parse(cycles[i - 1].date)) / 36e5;
    if (duree >= 864e5 && h > SEUILS.ecart_h) ecarts.push({ de: cycles[i - 1].n, a: cycles[i].n, heures: r(h, 1) });
    if (duree >= 864e5 && cycles[i].date.slice(0, 10) === cycles[i - 1].date.slice(0, 10)) memeJour.push({ cycles: [cycles[i - 1].n, cycles[i].n], date: cycles[i].date.slice(0, 10), heures: [cycles[i - 1].date.slice(11, 16), cycles[i].date.slice(11, 16)] }); }
  const heures = {}; for (const c of cycles.slice(-7)) { const h = c.date.slice(11, 16); heures[h] = (heures[h] || 0) + 1; }
  const rythme = { cycles, ecarts, meme_jour: memeJour, heure_habituelle: Object.entries(heures).sort((a, b) => b[1] - a[1])[0]?.[0] || null };

  // --- l'année et le climat, si le monde garde son rythme ---
  const calendrier = [];
  if (annee) { const q4 = annee / 4;
    for (let k = n + 1; k <= n + annee && calendrier.length < 6; k++) { const ph = (k % annee) / annee, prev = ((k - 1) % annee) / annee;
      if (saisonDe(k, annee) !== saisonDe(k - 1, annee)) calendrier.push({ cycle: k, date: dateDe(k), quoi: `début de ${saisonDe(k, annee) === 'été' ? "l'été" : saisonDe(k, annee) === 'automne' ? "l'automne" : saisonDe(k, annee) === 'hiver' ? "l'hiver" : 'printemps'}`.replace('début de printemps', 'début du printemps'), production: productionDe(k, annee, saisons) });
      if (prev < .5 && ph >= .5) calendrier.push({ cycle: k, date: dateDe(k), quoi: 'production au plus haut', production: productionDe(k, annee, saisons) });
      if (ph === 0) calendrier.push({ cycle: k, date: dateDe(k), quoi: 'production au plus bas, une année nouvelle', production: productionDe(k, annee, saisons) }); }
    calendrier.sort((a, b) => a.cycle - b.cycle); void q4; }
  if (I.monde?.mere?.prochaine > n) calendrier.push({ cycle: I.monde.mere.prochaine, date: dateDe(I.monde.mere.prochaine), quoi: 'la Mère peut concevoir une machine' });
  calendrier.sort((a, b) => a.cycle - b.cycle);
  let climat = null;
  if (I.monde?.climat) { const Cl = I.monde.climat, d0 = Cl.depuis, R = Climat.REGLES, onde = k => somme(R.ondes.map(w => w.ampleur * (Math.sin(2 * Math.PI * (k - d0) / w.periode + w.phase) - Math.sin(w.phase))));
    const courbe = [], reperes = []; let sous = onde(n) <= R.ponts.emerger, mn = { v: Infinity }, mx = { v: -Infinity };
    for (let k = n; k <= n + 2400; k++) { const v = onde(k); if (k % 10 === 0 || k === n) courbe.push([k, r(v, 4)]); if (k > n + 1500) continue;   // (les repères : sur une grande onde)
      if (!sous && v <= R.ponts.emerger) { sous = true; reperes.push({ cycle: k, date: dateDe(k), quoi: `le monde passe sous ${fr(R.ponts.emerger, 2)} : des ponts de terre peuvent émerger` }); }
      if (sous && v > R.ponts.sombrer) { sous = false; reperes.push({ cycle: k, date: dateDe(k), quoi: `il remonte au-dessus de ${fr(R.ponts.sombrer, 2)} : les ponts sombrent` }); }
      if (v < mn.v) mn = { v, k }; if (v > mx.v) mx = { v, k }; }
    reperes.push({ cycle: mn.k, date: dateDe(mn.k), quoi: `le plus froid de la grande onde (${fr(mn.v, 3)})` }, { cycle: mx.k, date: dateDe(mx.k), quoi: `le plus chaud de la grande onde (+${fr(mx.v, 3)})` });
    reperes.sort((a, b) => a.cycle - b.cycle);
    climat = { depuis: d0, ecart: Cl.temperature, marche: Cl.marche, ponts: (Cl.ponts || []).length, iles: Cl.iles ?? 0, seuils: { emerger: R.ponts.emerger, sombrer: R.ponts.sombrer },
      ondes: R.ondes.map(w => ({ periode: w.periode, ampleur: w.ampleur })), reperes: reperes.slice(0, 6), courbe }; }

  // --- les alertes ---
  const alertes = [], pct = x => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)} %`;
  for (const g of groupes) { if (g.lignees < SEUILS.groupe_min || g.variation == null) continue;
    const dern = g.pentes.slice(-SEUILS.recul_suite), nom = `${g.regime}s (${g.origine})`;
    if (g.variation <= -SEUILS.recul && dern.length >= SEUILS.recul_suite && dern.every(p => p < 0))
      alertes.push({ niveau: 'alerte', sujet: 'groupe', cle: g.cle, titre: `Les ${nom} reculent à chaque cycle`, texte: `${g.lignees} lignées, ${pct(g.variation)} depuis le cycle ${g.depuis} (de ${g.debut.toLocaleString('fr-FR')} à ${g.fin.toLocaleString('fr-FR')} bêtes), ${pct(g.pentes[g.pentes.length - 1])} au dernier cycle${g.satiete != null ? ` ; satiété moyenne ${fr(g.satiete, 2)}` : ''}.` });
    else if (g.variation >= SEUILS.essor - 1) alertes.push({ niveau: 'surveiller', sujet: 'groupe', cle: g.cle, titre: `Les ${nom} ont plus que doublé`, texte: `${g.lignees} lignées, ${pct(g.variation)} depuis le cycle ${g.depuis}.` }); }
  const perdus = retraits.filter(x => x.juge && !x.applique);
  if (perdus.length) alertes.push({ niveau: 'alerte', sujet: 'retraits', titre: 'Des retraits de joueurs ne tuent personne', texte: `${pressions.retrait_perdu.toLocaleString('fr-FR')} des ${pressions.retrait_total.toLocaleString('fr-FR')} bêtes retirées par cycle (moyenne lissée du tampon) n'apparaissent dans aucune mortalité : ${perdus.map(x => `${x.nom} (${x.biome})`).join(', ')}.` });
  if (vivant.machines.pente != null && vivant.machines.pente > SEUILS.machines) alertes.push({ niveau: 'surveiller', sujet: 'machines', titre: 'Les machines croissent vite', texte: `${pct(vivant.machines.pente)} au dernier cycle, ${serieMachines[serieMachines.length - 1].toLocaleString('fr-FR')} machines.` });
  for (const e of eteintes) alertes.push({ niveau: 'info', sujet: 'extinction', titre: `${e.nom} s'est éteinte`, texte: `Au cycle ${e.cycle}${e.cause ? ` : ${e.cause}` : ''}.` });
  if (Object.keys(att).length) alertes.push({ niveau: 'info', sujet: 'memoire', titre: 'Des populations ont pris une attitude face aux joueurs', texte: Object.entries(att).map(([a, k]) => `${k} ${a}${k > 1 ? 's' : ''}`).join(', ') + '.' });
  if (fen.length >= SEUILS.silence && fen.every(s => !s.evenements_joueurs)) alertes.push({ niveau: 'info', sujet: 'silence', titre: 'Aucun joueur depuis une semaine', texte: `Aucun événement de joueur sur les ${fen.length} derniers cycles.` });
  if (ecarts.length || memeJour.length) alertes.push({ niveau: 'info', sujet: 'rythme', titre: 'Le rythme des cycles a eu des trous', texte: [ecarts.length ? `${ecarts.length} écart${ecarts.length > 1 ? 's' : ''} de plus de ${SEUILS.ecart_h} h (${ecarts.map(e => `${e.de}→${e.a}, ${fr(e.heures, 1)} h`).join(' ; ')})` : '', memeJour.length ? `${memeJour.length} jour${memeJour.length > 1 ? 's' : ''} à deux cycles (${memeJour.map(m => m.date).join(', ')})` : ''].filter(Boolean).join(' ; ') + '.' });
  for (const s of souches.liste) if (s.virulence >= SEUILS.virulence || s.vecteur) alertes.push({ niveau: 'surveiller', sujet: 'souche', titre: `${s.nom}${s.vecteur ? ', portée par un insecte' : ''}`, texte: `Virulence ${Math.round(s.virulence * 100)} % par cycle, ${s.infectes.toLocaleString('fr-FR')} bêtes infectées${s.vecteur ? `, vecteur ${info.get(s.vecteur)?.nom || s.vecteur}` : ''}.` });
  if (precedent?.mesures?.effectifs && effectifs.menacees.length > (precedent.mesures.effectifs.menacees?.length ?? Infinity)) alertes.push({ niveau: 'surveiller', sujet: 'menacees', titre: 'Plus de lignées menacées', texte: `${effectifs.menacees.length} lignées menacées, contre ${precedent.mesures.effectifs.menacees.length} au rapport précédent.` });
  const rang = { alerte: 0, surveiller: 1, info: 2 }; alertes.sort((a, b) => rang[a.niveau] - rang[b.niveau]);

  // --- l'écart au rapport précédent ---
  let comparaison = null;
  if (precedent?.mesures) { const M = precedent.mesures, d = (a, b) => a == null || b == null ? null : a - b;
    comparaison = { rapport: precedent.date || null, cycle: M.monde?.cycle ?? null, betes: d(effectifs.betes, M.effectifs?.betes), lignees_animales: d(effectifs.lignees_animales, M.effectifs?.lignees_animales),
      menacees: d(effectifs.menacees.length, M.effectifs?.menacees?.length), evenements_joueurs: somme(serie.filter(s => s.n > (M.monde?.cycle ?? -Infinity)).map(s => s.evenements_joueurs)),
      retrait_perdu: d(pressions.retrait_perdu, M.pressions?.retrait_perdu), avec_trace: d(memoire.avec_trace, M.memoire?.avec_trace), infectes: d(souches.infectes, M.souches?.infectes) }; }

  return { orvane_sante: 1, monde: monde.id, date: date || I.cycle.date.slice(0, 10), cycle: n,
    titre: null, resume: null, chiffres: null, constats: null, notes: null, actions: null, auteur: null,
    mesures: { monde, effectifs, serie, groupes, pressions, memoire, souches, vivant, rythme, calendrier, climat, alertes, comparaison, seuils: SEUILS } };
}

// --- l'index des rapports d'un monde (sante/<monde>/index.json) : le plus récent d'abord ---
function indexer(dossier) {
  const L = fs.readdirSync(dossier).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().map(f => {
    const R = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
    return { fichier: f, date: R.date, cycle: R.cycle, titre: R.titre || null, resume: R.resume || null,
      alertes: (R.mesures?.alertes || []).filter(a => a.niveau === 'alerte').length, a_surveiller: (R.mesures?.alertes || []).filter(a => a.niveau === 'surveiller').length };
  });
  const out = { orvane_sante: 1, monde: path.basename(dossier), rapports: L };
  fs.writeFileSync(path.join(dossier, 'index.json'), JSON.stringify(out, null, 1) + '\n');
  return out;
}

// le récit d'un rapport : ce qui s'écrit à la main au-dessus des mesures
const RECIT = ['titre', 'resume', 'chiffres', 'constats', 'notes', 'actions', 'auteur'];
const API = { mesurer, indexer, SEUILS, RECIT, dureeDe };
module.exports = API;

// --- ligne de commande ---
if (require.main === module) {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (a[0] === '--indexer') { const out = indexer(a[1]); console.log(`${a[1]} : ${out.rapports.length} rapport(s)`); process.exit(0); }
  const dossier = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  if (!dossier) { console.error('node outils/sante.js <dossier d\'un monde publié> [--precedent rapport.json] [--sortie rapport.json] [--date AAAA-MM-JJ]\nnode outils/sante.js --indexer sante/<monde>'); process.exit(2); }
  const I = lire(dossier, 'instantane.json');
  const R = mesurer({ I, H: lire(dossier, 'historique.json', []), T: lire(dossier, 'tampon.json', {}), J: lire(dossier, 'jeux.json', []), P: lire(dossier, 'profil.json', null),
    C: lire(dossier, 'chronique/index.json', null), precedent: arg('--precedent') ? JSON.parse(fs.readFileSync(arg('--precedent'), 'utf8')) : null, date: arg('--date') });
  const sortie = arg('--sortie');
  if (sortie) {   // un récit déjà écrit au même chemin est gardé : on peut refaire les mesures sans perdre le texte
    let avant = null; try { avant = JSON.parse(fs.readFileSync(sortie, 'utf8')); } catch (e) { }
    if (avant) for (const k of RECIT) if (avant[k] != null) R[k] = avant[k];
    fs.mkdirSync(path.dirname(path.resolve(sortie)), { recursive: true }); fs.writeFileSync(sortie, JSON.stringify(R, null, 1) + '\n');
    const al = R.mesures.alertes; console.log(`${sortie} : cycle ${R.cycle}, ${al.filter(x => x.niveau === 'alerte').length} alerte(s), ${al.filter(x => x.niveau === 'surveiller').length} à surveiller, ${al.filter(x => x.niveau === 'info').length} info`);
  } else process.stdout.write(JSON.stringify(R, null, 1) + '\n');
}
