// Orvane — LE CYCLE NOCTURNE (hebergement/cycle.js)
// Fait tourner un monde d'un cycle : lit les lots de pressions déposés depuis le cycle précédent, les passe au
// tampon, fait tourner le moteur, publie l'instantané. Lancé par l'action GitHub (.github/workflows/cycle.yml)
// ou à la main. Un monde = un dossier mondes/<id>/ :
//   profil.json        le profil du jeu (réglage du tampon)
//   etat.json          l'instantané courant, complet (le moteur repart de là)
//   instantane.json    le même, publié : c'est ce que les traducteurs lisent (GitHub Pages sert avec CORS *)
//   historique.json    les derniers cycles (365, ou profil.monde.historique), allégés (effectifs, fréquences, événements) : pour l'observatoire
//   tampon.json        la mémoire du tampon (lissage) et la dernière ligne lue (dernier_id)
//   jeux.json          les jeux branchés sur le monde et leur exposition (publié : chaque traducteur y lit la sienne)
//   morceaux/          le même monde par morceaux : index.json, biomes/<id>.json, lignees/<id>.json, et les planches,
//                      silhouettes/<id>.json : chaque lignée de chaque biome dessinée (docs/21) ; herbier/<id>.json : chaque plante (docs/49)
//   lots/              (facultatif) des lots déposés à la main ; lus en plus de Supabase, puis déplacés dans lots/traites/
//   node hebergement/cycle.js sv-1 [--sans-reseau] [--cycles N | --auto] [--rodage N] [--forcer]   (rodage : au premier cycle seulement ;
//   --auto : autant de cycles que le rythme du monde en doit, profil.monde.cycle et monde.heure, docs/19 ; --maintenant <date ISO> ;
//   les fusions que commande le profil, profil.monde.fusions, sont appliquées une fois chacune, avant le cycle : docs/14 ;
//   un profil qui demande des parcelles (profil.monde.parcelles) découpe le monde une fois ; il tourne ensuite par parcelle,
//   et l'instantané publié reste par biome (docs/15) ; un profil qui demande la vie synthétique (profil.monde.synthetique)
//   éveille la Mère une fois : docs/16 ; la flore (profil.monde.flore) : docs/17 ; les souches (profil.monde.pathogenes) : docs/18 ; le milieu (profil.monde.milieu) : docs/22 ; la ponte (profil.monde.ponte) : docs/25 ; les cycles de vie (profil.monde.stades) : docs/26 ; l'invention (profil.monde.invention) : docs/27 ; les natures des lieux (profil.monde.natures) : docs/28 ; les dérives (profil.monde.derives) : docs/29 ; les régimes en spectre (profil.monde.dietes) : docs/30 ; le climat (profil.monde.climat) : docs/31 ; la grammaire (profil.monde.grammaire) : docs/32 ; les castes et les formes nouvelles (profil.monde.castes, profil.monde.formes) : docs/33 ; l'esprit (profil.monde.esprit) : docs/34 ; la vie en groupe (profil.monde.collectif) : docs/38 ;
//   --forcer : faire tourner un monde dont le profil dit monde.nocturne = false, comme une genèse à observer)
// L'histoire du monde (docs/37) : après chaque cycle, la chronique (chronique/index.json et chronique/<année>.json) note ce qui
// compte, le muséum (museum.json) décrit chaque lignée nouvelle et garde les éteintes ; les noms proposés par les joueurs (lus par
// orvane_lire_noms, profil.monde.pressions.noms, et dans le dossier noms/) sont retenus dans l'ordre d'arrivée, sauf ceux de
// noms-refuses.json (la modération). Rien de cela ne touche à la simulation.
// Les lots en ligne viennent du Supabase d'Orvane (hebergement/supabase.sql, hebergement/LISEZ-MOI.md), où tous les jeux déposent : lus par
// la fonction orvane_lire_lots avec le secret de lecture d'Orvane (profil.monde.pressions, voir lotsEnLigne), avec les
// jeux et leur exposition (orvane_lire_jeux). Sans le secret, ou avec --sans-reseau, seuls les lots du dossier comptent,
// lus avec les expositions du dernier jeux.json.
'use strict';
const fs = require('fs'), path = require('path');
const Genres = require('../moteur/genres.js');
const Orvane = require('../moteur/orvane.js'), Tampon = require('../tampon/tampon.js'), Morceaux = require('../tampon/morceaux.js'), Milieu = require('../moteur/milieu.js'), Ponte = require('../moteur/ponte.js'), Stades = require('../moteur/stades.js'), Invention = require('../moteur/invention.js'), Natures = require('../moteur/natures.js'), Derives = require('../moteur/derives.js'), Dietes = require('../moteur/dietes.js'), Climat = require('../moteur/climat.js'), Meteo = require('../moteur/meteo.js'), Phenologie = require('../moteur/phenologie.js'), Succession = require('../moteur/succession.js'), Diversite = require('../moteur/diversite.js'), Grammaire = require('../moteur/grammaire.js'), Castes = require('../moteur/castes.js'), Formes = require('../moteur/formes.js'), Esprit = require('../moteur/esprit.js'), Fusion = require('../moteur/fusion.js'), Parcelles = require('../moteur/parcelles.js'), Synthetique = require('../moteur/synthetique.js'), Flore = require('../moteur/flore.js'), Pathogenes = require('../moteur/pathogenes.js'), Chronique = require('../moteur/chronique.js'), Collectif = require('../moteur/collectif.js');
const a = process.argv.slice(2), monde = a.find(x => !x.startsWith('--')) || 'sv-1', sansReseau = a.includes('--sans-reseau');
const arg = (k, defaut) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? +a[i + 1] : defaut; };
let nCycles = arg('--cycles', 1) || 1;
const auto = a.includes('--auto'), iM = a.indexOf('--maintenant'), maintenant = iM >= 0 ? Date.parse(a[iM + 1]) : Date.now();   // --maintenant <date ISO> : rejouer ou essayer une heure donnée
const { periodeDe, dus } = require('./rythme.js');   // (le rythme d'un monde : la veille le lit de la même façon)
const D = path.join(__dirname, '..', 'mondes', monde), f = n => path.join(D, n);
const secretDe = Pp => Pp && (process.env[Pp.secret || 'ORVANE_LECTURE_SECRET'] || '').trim().replace(/^["']+|["']+$/g, '');
const rpc = async (Pp, fn, corps) => { const r = await fetch(`${Pp.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST',
  headers: { apikey: Pp.cle, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${await r.text()}`); return r.json(); };
const lire = (n, defaut) => fs.existsSync(f(n)) ? JSON.parse(fs.readFileSync(f(n), 'utf8')) : defaut;
// (chaque fichier s'écrit à côté, puis prend sa place d'un coup : un cycle interrompu ne laisse pas de fichier à moitié écrit ; et
// l'action rend le dossier d'un monde interrompu tel qu'il était, .github/workflows/cycle.yml)
const ecrireTexte = (n, t) => { const c = f(n), tmp = c + '.tmp'; fs.writeFileSync(tmp, t); fs.renameSync(tmp, c); };
const ecrire = (n, o, compact) => ecrireTexte(n, compact ? JSON.stringify(o) : JSON.stringify(o, null, 1));

// Les lots en ligne. Deux chemins :
//  - le monde dit où lire (profil.monde.pressions : { url, cle, secret }) : la fonction orvane_lire_lots du projet
//    Supabase d'Orvane (ou, pour sv-1, celui du jeu), appelée avec sa clé publique et le secret de lecture d'Orvane
//    (variable d'environnement nommée par « secret », ORVANE_LECTURE_SECRET par défaut). L'action n'a jamais de clé de
//    service. Lu par pages de 1000, d'après l'identifiant de la dernière ligne lue (tampon.dernier_id) ; chaque ligne dit
//    son jeu, le compte arrive pseudonymisé. Avec « jeux » (orvane_lire_jeux), la liste des jeux est lue aussi.
//  - à l'ancienne : SUPABASE_URL et SUPABASE_SERVICE_KEY dans l'environnement, lecture directe de la table.
const PAGES = 50;
async function lotsEnLigne(tampon, profil) {
  if (sansReseau) return [];
  // (le secret tel qu'on l'a collé : sans les espaces, retours à la ligne ou guillemets qui s'y glissent souvent)
  const Pp = profil.monde?.pressions, secret = secretDe(Pp), id = profil.monde?.id || monde;
  if (Pp && Pp.url && Pp.cle && secret) {
    const out = []; let apres = tampon.dernier_id || 0;
    // (au plus PAGES pages de 1000 lots par cycle : le reste attend le cycle suivant, dans l'ordre ; un afflux ne fait pas sauter la mémoire)
    for (let page = 0; page < PAGES; page++) {
      if (page === PAGES - 1) console.log(`::warning title=${id} · lots::plus de ${PAGES * 1000} lots en attente : le reste sera lu au prochain cycle.`);
      const rows = await rpc(Pp, Pp.fonction || 'orvane_lire_lots', { p_secret: secret, p_monde: id, p_apres: apres, p_limite: 1000 });
      for (const x of rows) { const lot = x.lot || {}; lot.monde ??= id; if (x.jeu) lot.jeu = x.jeu; lot.source = { ...(lot.source || {}), compte: x.compte };
        lot._id = x.id; lot._recu = x.recu; out.push(lot); }
      if (rows.length < 1000) break; apres = rows[rows.length - 1].id;
    }
    return out;
  }
  const url = process.env.SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) return [];
  const q = `${url.replace(/\/$/, '')}/rest/v1/orvane_pressions?select=id,lot,compte,recu&monde=eq.${encodeURIComponent(monde)}&id=gt.${tampon.dernier_id || 0}&order=id.asc&limit=1000`;
  // une clé de service à l'ancienne (un JWT) va aussi dans Authorization ; une clé « sb_secret_… » n'y va pas (ce n'est pas un JWT)
  const r = await fetch(q, { headers: cle.startsWith('sb_') ? { apikey: cle } : { apikey: cle, Authorization: 'Bearer ' + cle } });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${await r.text()}`);
  const rows = await r.json();
  return rows.map(x => { const lot = x.lot || {}; lot.source = { ...(lot.source || {}), compte: 'u:' + String(x.compte).slice(0, 8) }; lot._id = x.id; lot._recu = x.recu; return lot; });
}
// les jeux branchés sur le monde : lus dans Supabase (profil.monde.pressions.jeux), sinon ceux du dernier jeux.json
async function jeuxEnLigne(profil) {
  const Pp = profil.monde?.pressions, secret = secretDe(Pp);
  if (sansReseau || !Pp?.jeux || !Pp.url || !Pp.cle || !secret) return null;
  return (await rpc(Pp, Pp.jeux, { p_secret: secret })).map(j => ({ id: j.id, nom: j.nom, actif: j.actif, exposition: j.exposition || {} }));
}
// (docs/37) les noms proposés par les joueurs depuis la dernière lecture (orvane_lire_noms) ; une lecture qui échoue (la migration des
// noms pas encore appliquée, par exemple) n'arrête rien : un avertissement, et les noms attendront
async function nomsEnLigne(tampon, profil) {
  const Pp = profil.monde?.pressions, secret = secretDe(Pp), id = profil.monde?.id || monde;
  if (sansReseau || !Pp?.noms || !Pp.url || !Pp.cle || !secret) return [];
  const out = []; let apres = tampon.dernier_nom || 0;
  for (let page = 0; page < 50; page++) {
    const rows = await rpc(Pp, Pp.noms, { p_secret: secret, p_monde: id, p_apres: apres, p_limite: 1000 });
    for (const x of rows) out.push({ id: x.id, jeu: x.jeu, compte: x.compte, auteur: x.auteur, taxon: x.taxon, nom: x.nom, recu: x.recu });
    if (rows.length < 1000) break; apres = rows[rows.length - 1].id;
  }
  return out;
}
function nomsLocaux() {
  const d = f('noms'); if (!fs.existsSync(d)) return [];
  const out = []; for (const n of fs.readdirSync(d).sort()) if (n.endsWith('.json')) { try { const x = JSON.parse(fs.readFileSync(path.join(d, n), 'utf8'));
    for (const [i, p] of (Array.isArray(x) ? x : [x]).entries()) out.push({ id: `${n}#${i}`, recu: new Date(maintenant).toISOString(), ...p, _fichier: n }); } catch (e) { console.warn('nom illisible :', n); } }
  return out;
}
function lotsLocaux() {
  const d = f('lots'); if (!fs.existsSync(d)) return [];
  const out = []; for (const n of fs.readdirSync(d).sort()) if (n.endsWith('.json')) { try { out.push({ ...JSON.parse(fs.readFileSync(path.join(d, n), 'utf8')), _fichier: n }); } catch (e) { console.warn('lot illisible :', n); } }   // (triés : le même dossier rejoue le même monde)
  return out;
}
function ranger(lots) {
  const t = f('lots/traites'); for (const l of lots) if (l._fichier) { fs.mkdirSync(t, { recursive: true }); fs.renameSync(path.join(f('lots'), l._fichier), path.join(t, l._fichier)); }
}
// l'instantané allégé, pour l'historique
// les traits continus d'un taxon, en une moyenne pondérée par les effectifs (l'observatoire en trace l'évolution)
const quantMoyen = t => { const P = t.populations.filter(p => p.quant), W = P.reduce((a, p) => a + p.effectif, 0); if (!P.length || !W) return null;
  return Object.fromEntries(Object.keys(P[0].quant).map(k => [k, +(P.reduce((a, p) => a + p.effectif * (p.quant[k]?.m || 0), 0) / W).toFixed(3)])); };
const alleger = I => ({ cycle: I.cycle, taxons: I.taxons.map(t => ({ id: t.id, nom: t.nom, parent: t.parent, apparu: t.apparu, eteint: t.eteint, statut: t.statut,
  populations: t.populations.map(p => ({ biome: p.biome, effectif: p.effectif })), phenotypes: t.phenotypes.map(p => ({ id: p.id, frequence: p.frequence, traits: p.traits })),
  ...(quantMoyen(t) ? { quant: quantMoyen(t) } : {}) })),
  biomes: I.biomes.map(b => ({ id: b.id, capacite: Math.round(b.capacite) })), evenements: I.evenements || [] });

(async () => {
  let profil = lire('profil.json'); if (!profil) throw new Error(`pas de profil : ${f('profil.json')}`);
  if (profil.monde?.genre && profil.monde.genre !== 'neutre') profil = Genres.profil(profil.monde.genre, profil);   // (docs/41) ce que pèsent les joueurs dans ce genre
  if (profil.monde?.nocturne === false && !a.includes('--forcer')) { console.log(`${monde} : pas de cycle nocturne (profil.monde.nocturne = false ; --forcer pour le faire tourner)`); return; }
  let etat = lire('etat.json');
  // (docs/19) le temps : avec --auto, un monde tourne à chaque heure de cycle franchie depuis son dernier cycle. Les heures de cycle
  // partent de monde.heure (03:00 UTC par défaut, un lundi) et reviennent toutes les monde.cycle : à 03:00 chaque jour pour un monde
  // au jour, à chaque heure pleine pour un monde à l'heure. Au plus monde.rattrapage cycles d'un coup (3 par défaut) ; pas encore
  // l'heure : rien ne bouge, rien n'est lu
  if (auto && etat) { const dernier = Date.parse(etat.cycle?.date || 0), { du } = dus(profil, dernier, maintenant);
    if (du < 1) { console.log(`${monde} : pas encore l'heure (un cycle toutes les ${profil.monde?.cycle || '24h'} ; le dernier il y a ${Math.round((maintenant - dernier) / 6e4)} min)`); return; }
    nCycles = Math.min(du, profil.monde?.rattrapage ?? 3); if (du > nCycles) console.log(`${monde} : ${du} cycles dus, ${nCycles} rattrapés`); }
  if (!etat) {   // premier cycle : on part de l'amorce, et on la publie telle quelle (generation-0.json) : les traducteurs s'y comparent
    const am = profil.monde?.amorce && path.join(__dirname, '..', profil.monde.amorce);
    if (!am || !fs.existsSync(am)) throw new Error('pas d\'état ni d\'amorce');
    etat = JSON.parse(fs.readFileSync(am, 'utf8')); console.log('amorce :', profil.monde.amorce);
    const rodage = arg('--rodage', profil.monde?.rodage || 0) || 0;   // le monde tourne seul jusqu'à son équilibre avant d'être publié
    for (let k = 0; k < rodage; k++) etat = Orvane.cycle(etat, {}, { duree_ms: 0 });
    // (la génération 0 garde la saison où le rodage s'est arrêté : un monde qui a une année repart au même point de l'année, pas
    // en plein hiver d'un coup — le cycle est ramené dans sa première année)
    const an = profil.monde?.annee ?? etat.monde.annee;
    // (les lignées nées pendant la genèse et le rodage gardent leur rang : leur cycle d'apparition est recalé du même écart, et
    // devient négatif — nées avant la génération 0 ; sans cela, une lignée paraîtrait née dans l'avenir du monde publié)
    if (rodage) { const n1 = an ? etat.cycle.n % an : 0, d = etat.cycle.n - n1; etat.cycle.n = n1; etat.evenements = [];
      for (const t of etat.taxons) { if (t.apparu != null) t.apparu -= d; if (t.eteint != null) t.eteint -= d; for (const p of t.populations) p.depuis = Math.min(p.depuis ?? 0, 0); }
      if (etat.monde.genese) etat.monde.genese = { ...etat.monde.genese, recale: d };
      console.log(`rodage : ${rodage} cycles ; la génération 0 est l'équilibre atteint`); }
    etat.monde.ne = new Date().toISOString();   // la naissance du monde : avec son id, c'est son identité (un monde refait de zéro change de date)
    etat.monde.id = profil.monde?.id || monde;   // une amorce née de la genèse s'appelle « genese » : le monde prend le nom de son dossier (les lots du jeu le portent)
    if (profil.monde?.graine != null) etat.monde.graine = profil.monde.graine;
    ecrire('generation-0.json', etat, true);
  }
  if (profil.monde?.annee != null) etat.monde.annee = profil.monde.annee;   // la durée de l'année suit le profil
  // (équilibrage) des règles du moteur réglées pour un monde vivant (profil.monde.regles) : elles complètent celles de sa genèse
  // (monde.regles), d'un niveau ; elles ne valent que pour ce qui arrive ensuite — le jour où on les pose, rien ne bouge
  // (docs/41) un monde d'un genre (profil.monde.genre) : les règles du genre sur celles de sa genèse ; celles du profil, plus bas, par-dessus
  if (profil.monde?.genre && profil.monde.genre !== 'neutre') { etat.monde.regles = Genres.regles(profil.monde.genre, etat.monde.regles); etat.monde.genre = profil.monde.genre; }
  if (profil.monde?.regles && typeof profil.monde.regles === 'object') { const R = { ...(etat.monde.regles || {}) };
    for (const [k, v] of Object.entries(profil.monde.regles)) R[k] = v && typeof v === 'object' && !Array.isArray(v) && R[k] && typeof R[k] === 'object' ? { ...R[k], ...v } : v;
    etat.monde.regles = R; }
  // (docs/14) les fusions que commande le profil (monde.fusions : [{ id, source, biomes?, part?, ponts? }], docs/23 pour les ponts) : chacune est appliquée une
  // seule fois, avant le cycle, et l'état en garde la trace (monde.fusions) ; les arrivées vont au journal de ce cycle
  let arrivees = [];
  for (const ordre of profil.monde?.fusions || []) {
    if (!ordre?.id || !ordre.source || (etat.monde.fusions || []).some(x => x.id === ordre.id)) continue;
    const src = path.join(__dirname, '..', ordre.source);
    if (!fs.existsSync(src)) { console.log(`::warning title=${monde} · fusion ${ordre.id}::la source ${ordre.source} est introuvable : la fusion attend.`); continue; }
    const S = JSON.parse(fs.readFileSync(src, 'utf8'));
    if (ordre.ponts != null) {   // (docs/23) la fusion par ponts : la source devient un continent, relié par quelques ponts
      const r = Fusion.relier(etat, S, { id: ordre.id, nom: ordre.nom, ponts: ordre.ponts, part: ordre.part, par: profil.monde?.parcelles?.par });
      etat = r.inst; arrivees = [...arrivees, ...r.evenements];
      console.log(`fusion ${r.bilan.id} : le continent de ${r.bilan.monde} (${r.bilan.parcelles} parcelles, ${r.bilan.lignees} lignées) relié par ${r.bilan.ponts.length} ponts : ${r.bilan.ponts.map(x => x.join(' ↔ ')).join(', ')}`);
      continue;
    }
    const r = Fusion.fusionner(etat, S, { id: ordre.id, biomes: ordre.biomes, part: ordre.part });
    etat = r.inst; arrivees = [...arrivees, ...r.evenements];
    console.log(`fusion ${r.bilan.id} : ${r.bilan.lignees} lignées de ${r.bilan.monde} arrivent (${r.bilan.individus} individus, part ${r.bilan.part}) dans ${r.bilan.biomes.join(', ')}${r.bilan.renommees ? ` ; ${r.bilan.renommees} renommée(s)` : ''}`);
  }
  const tampon = lire('tampon.json', { lisse: {}, dernier_id: 0 });
  let lectureEchouee = false, jeux = lire('jeux.json', []);
  try { const j = await jeuxEnLigne(profil); if (j) { jeux = j.filter(x => x.actif !== false); ecrire('jeux.json', jeux); } }   // (seuls les jeux actifs sont publiés)
  catch (e) { lectureEchouee = true; console.log(`::error title=${monde} · lecture des jeux::${e.message || e}. Le cycle lit les lots avec les expositions de la dernière fois.`); }
  const expositions = Object.fromEntries(jeux.map(j => [j.id, j]));
  const gen0 = lire('generation-0.json', null);   // la référence du mode relatif (profil.exposition.mode)
  // (un monde publié avant ce recalage, comme le monde d'Orvane : une fois, ses lignées de la genèse retrouvent leur rang)
  if (etat.monde?.genese && etat.monde.genese.recale == null && gen0 && profil.monde?.amorce && fs.existsSync(path.join(__dirname, '..', profil.monde.amorce))) {
    const n0 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', profil.monde.amorce), 'utf8')).cycle?.n ?? 0, d = n0 + (profil.monde.rodage || 0) - (gen0.cycle?.n ?? 0), ids = new Set(gen0.taxons.map(t => t.id));
    let k = 0; if (d > 0) for (const t of etat.taxons) if (ids.has(t.id) && !t.origine && t.apparu != null) { t.apparu -= d; k++; }
    etat.monde.genese = { ...etat.monde.genese, recale: d }; console.log(`recalage : ${k} lignées de la genèse retrouvent leur rang (−${d} cycles)`);
  }
  // (docs/15) les parcelles : un profil qui en demande découpe le monde, une fois ; le moteur tourne par parcelle, mais le
  // tampon, l'historique et l'instantané publié voient le monde par biome (Parcelles.regrouper) : le contrat ne change pas
  if (profil.monde?.parcelles && !Parcelles.estParcellaire(etat)) {
    etat = Parcelles.decouper(etat, profil.monde.parcelles);
    console.log(`parcelles : ${etat.monde.parcelles.types.length} biomes découpés en ${etat.biomes.length} parcelles`);
  }
  // (docs/16) la vie synthétique : un profil qui la demande (monde.synthetique : { biome? }) éveille la Mère, une fois ; ses
  // premières machines et l'événement de son éveil vont au journal de ce cycle
  if (profil.monde?.synthetique && !etat.monde.mere) {
    const r = Synthetique.eveiller(etat, profil.monde.synthetique === true ? {} : profil.monde.synthetique);
    etat = r.inst; arrivees = [...arrivees, ...r.evenements];
    console.log(`vie synthétique : ${r.evenements.map(e => e.detail).join(' ; ')}`);
  }
  // (docs/17) la flore : un profil qui la demande (monde.flore : true) l'éveille, une fois, à l'équilibre avec les brouteurs
  if (profil.monde?.flore && !etat.monde.flore) {
    const r = Flore.eveiller(etat, profil.monde.flore === true ? {} : profil.monde.flore);
    etat = r.inst; arrivees = [...arrivees, ...r.evenements];
    console.log(`flore : ${r.evenements.map(e => e.detail).join(' ; ')}`);
  }
  // (docs/18) les souches : un profil qui les demande (monde.pathogenes : true) les donne au monde, une fois
  // (docs/27) un monde inventif : un profil qui le demande (monde.invention : true) le rend inventif, une fois
  if (profil.monde?.invention && !etat.monde.invention) { const r = Invention.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('invention : le monde peut inventer des traits'); }
  // (docs/26) les cycles de vie : un profil qui les demande (monde.stades : true) les éveille, une fois
  if (profil.monde?.stades && !etat.monde.stades) { const r = Stades.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`stades : ${r.evenements[0].detail}`); }
  // (docs/25) pondre ou mettre bas : un profil qui le demande (monde.ponte : true) donne son mode à chaque lignée, une fois
  if (profil.monde?.ponte && !etat.monde.ponte) { const r = Ponte.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`ponte : ${r.evenements[0].detail}`); }
  // (docs/22) le milieu transformé : un profil qui le demande (monde.milieu : true) l'éveille, une fois
  if (profil.monde?.milieu && !etat.monde.milieu) { const r = Milieu.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('milieu : les bêtes et les joueurs transforment désormais le milieu'); }
  // (docs/28) les lieux qui changent de nature : un profil qui le demande (monde.natures : true) l'éveille, une fois, après le milieu
  if (profil.monde?.natures && !etat.monde.natures) { const r = Natures.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`natures : ${r.evenements[0].detail}`); }
  // (docs/29) les dérives : un profil qui les demande (monde.derives : true) les éveille, une fois
  if (profil.monde?.derives && !etat.monde.derives) { const r = Derives.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('derives : les régimes, les plantes et les souches dérivent'); }
  // (docs/30) les régimes en spectre : un profil qui les demande (monde.dietes : true) les éveille, une fois, après la flore
  if (profil.monde?.dietes && !etat.monde.dietes) { const r = Dietes.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`dietes : ${r.evenements[0].detail}`); }
  // (docs/31) le climat et la géologie lente : un profil qui le demande (monde.climat : true) l'éveille, une fois, après le milieu
  if (profil.monde?.climat && !etat.monde.climat) { const r = Climat.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('climat : le monde se réchauffera et se refroidira de lui-même'); }
  // (docs/45) la météo : un profil qui la demande (monde.meteo : true) l'éveille, une fois
  if (profil.monde?.meteo && !etat.monde.meteo) { const r = Meteo.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`meteo : ${r.evenements[0].detail}`); }
  // (docs/46) les saisons des plantes : un profil qui les demande (monde.phenologie : true) les éveille, une fois, après la flore
  if (profil.monde?.phenologie && !etat.monde.phenologie && etat.monde.flore) { const r = Phenologie.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`phenologie : ${r.evenements[0].detail}`); }
  // (docs/47) les plantes subissent et transforment : un profil qui le demande (monde.succession : true) l'éveille, une fois, après la flore
  // (docs/48) la flore riche : un profil qui la demande (monde.diversite : true) l'éveille, une fois, après la flore et avant la succession (qui garde le poids des plantes du jour)
  if (profil.monde?.diversite && !etat.monde.diversite && etat.monde.flore) { const r = Diversite.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`diversite : ${r.evenements[0].detail}`); }
  if (profil.monde?.succession && !etat.monde.succession && etat.monde.flore) { const r = Succession.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`succession : ${r.evenements[0].detail}`); }
  // (docs/32) la grammaire des effets et des conduites : un profil qui la demande (monde.grammaire : true) l'éveille, une fois
  if (profil.monde?.grammaire && !etat.monde.grammaire) { const r = Grammaire.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('grammaire : le monde compose des traits d\'un genre neuf'); }
  // (docs/33) les castes, les formes nouvelles : un profil qui les demande les éveille, une fois
  if (profil.monde?.castes && !etat.monde.castes) { const r = Castes.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`castes : ${r.evenements[0].detail}`); }
  if (profil.monde?.formes && !etat.monde.formes) { const r = Formes.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('formes : des formes nouvelles peuvent naître'); }
  // (docs/34) l'esprit : un profil qui le demande (monde.esprit : true) l'éveille, une fois
  if (profil.monde?.esprit && !etat.monde.esprit) { const r = Esprit.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`esprit : ${r.evenements[0].detail}`); }
  // (docs/38) la vie en groupe : un profil qui la demande (monde.collectif : true) la fait publier ; elle ne change rien au monde
  if (profil.monde?.collectif && !etat.monde.collectif) { const r = Collectif.eveiller(etat, { vue: Parcelles.regrouper }); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log(`collectif : ${r.evenements[0].detail}`); }
  if (profil.monde?.pathogenes && !etat.monde.pathogenes) { const r = Pathogenes.eveiller(etat); etat = r.inst; arrivees = [...arrivees, ...r.evenements]; console.log('souches : les maladies ont désormais leurs souches'); }
  // (docs/20) le catalogue propre du monde (profil.monde.catalogue) : relu à chaque cycle, un auteur de monde peut y ajouter un trait,
  // un organe, une forme de corps, un axe ; ce qui est déjà né reste
  if (profil.monde?.catalogue) { const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', profil.monde.catalogue), 'utf8')), A = etat.catalogue?.monde || {};
    // (docs/27, 32, 33) ce que le monde a inventé ou composé lui-même, et ses formes nouvelles, restent : le fichier de l'auteur s'y ajoute
    const inv = Object.fromEntries(Object.entries(A.traits || {}).filter(([, t]) => t?.origine)), T = { ...(F.traits || {}), ...inv };
    etat.catalogue = { ...etat.catalogue, monde: { ...F, ...(Object.keys(T).length ? { traits: T } : {}), ...(etat.monde.formes ? { formes: { ...Formes.FORMES, ...(F.formes || {}) } } : {}) } }; }
  const vue = I => Parcelles.regrouper(I);
  // (docs/17) ce qui est publié : les bêtes et les machines dans instantane.json, les plantes à part dans flore.json (des millions
  // de pieds : un jeu qui ne les attend pas n'en voit rien) ; le moteur et le tampon, eux, voient tout
  const filtre = V => Collectif.decrire(Tampon.filtrer(V, { familles: ['animale', 'synthetique'] })), publie = I => filtre(vue(I));   // (docs/38) le groupe de chaque population, s'il est éveillé
  const flore = I => { const V = vue(I), P = V.taxons.filter(t => t.plan?.regime === 'vegetal'); return P.length ? { orvane: V.orvane, monde: { id: V.monde.id, ne: V.monde.ne, flore: V.monde.flore, ...(V.monde.diversite ? { diversite: V.monde.diversite } : {}), ...(V.monde.phenologie ? { phenologie: V.monde.phenologie } : {}), ...(V.monde.succession ? { succession: V.monde.succession } : {}) }, cycle: V.cycle, catalogue: { flore: V.catalogue?.flore || Flore.TRAITS, ...(V.catalogue?.flore_riche ? { flore_riche: V.catalogue.flore_riche } : {}) }, taxons: P } : null; };
  let avant = etat;
  let historique = lire('historique.json', []);
  // (docs/37) l'histoire du monde : la chronique et le muséum s'éveillent au premier cycle qui ne les trouve pas ; ce jour-là, la
  // chronique prend acte de ce qui existe (les souches, les records) sans le raconter, et le muséum décrit chaque lignée vivante
  let Vavant = vue(etat); const entrees = [];
  const { annees: annees0 = [], derniers: derniers0 = [], ...chron0 } = lire('chronique/index.json', null) || Chronique.noter(Chronique.vide(Vavant), Vavant, { ...Vavant, evenements: [] }, { premier: true }).etat;
  let chron = chron0, museum = lire('museum.json', null) || Chronique.decrire(null, Vavant).museum;
  const ms = periodeDe(profil.monde?.cycle);
  for (let k = 0; k < nCycles; k++) {
    // une lecture qui échoue n'arrête pas le monde : il tourne sans les lots en ligne (ils restent dans Supabase et seront lus
    // la fois suivante, dernier_id n'avance pas), et l'action le signale en clair
    let enLigne = [];
    try { enLigne = await lotsEnLigne(tampon, profil); }
    catch (e) { lectureEchouee = true; const m = String(e.message || e);
      const pourquoi = /secret invalide/.test(m) ? 'le secret ORVANE_LECTURE_SECRET du dépôt ne correspond pas à celui enregistré dans Supabase : recopiez-le exactement, sans espace ni guillemets (Settings › Secrets and variables › Actions)'
        : /\b40[13]\b/.test(m) ? 'Supabase refuse la lecture : vérifiez la clé publique et l\'URL dans profil.monde.pressions' : m;
      console.log(`::error title=${monde} · lecture des pressions::${pourquoi}. Le cycle tourne sans les lots en ligne ; ils seront lus la prochaine fois.`); }
    const locaux = lotsLocaux().map(l => ({ monde: profil.monde?.id || monde, ...l })), lots = [...enLigne, ...locaux];
    const r = Tampon.agreger(lots, vue(etat), profil, tampon, gen0, expositions);
    if (r.rejetes && (r.rejetes.lots || r.rejetes.evenements)) console.log(`::warning title=${monde} · lots::${r.rejetes.lots || 0} lot(s) et ${r.rejetes.evenements || 0} événement(s) écartés (hors du contrat : schemas/pression.schema.json) ; le reste compte.`);
    const suivant = Orvane.cycle(etat, Parcelles.repartir(r.pressions, etat, Parcelles.localiser(lots, etat)), { duree_ms: ms });   // (docs/15) là où les jeux l'ont dit
    if (k === nCycles - 1) suivant.cycle.date = new Date(maintenant).toISOString();   // le dernier cycle est daté de son départ : les traducteurs s'y réfèrent
    if (k === 0 && arrivees.length) suivant.evenements = [...arrivees, ...(suivant.evenements || [])];   // les arrivées d'une fusion, au journal
    tampon.lisse = r.etat.lisse; tampon.lisseQ = r.etat.lisseQ; if (enLigne.length) { tampon.dernier_id = enLigne[enLigne.length - 1]._id; tampon.derniere_lecture = enLigne[enLigne.length - 1]._recu; }
    // (docs/37) une lignée neuve qui reprend l'identifiant d'une lignée éteinte (oubliée du moteur, gardée au muséum) en prend un à elle
    const ren = Chronique.dedoublonner(suivant, museum); if (ren.renommees.length) console.log(`identifiants : ${ren.renommees.map(x => `${x.de} → ${x.vers}`).join(', ')}`);
    const Vsuivant = vue(suivant);
    historique = [...historique.filter(h => h.cycle.n < suivant.cycle.n), alleger(filtre(Vsuivant))].slice(-(profil.monde?.historique || 365));   // profil.monde.historique : combien de cycles garder (365 par défaut)
    // (docs/37) la chronique note ce qui compte ; le muséum garde les éteintes et décrit les nouvelles
    const rc = Chronique.noter(chron, Vavant, Vsuivant); chron = rc.etat; entrees.push(...rc.entrees);
    museum = Chronique.decrire(Chronique.fossiliser(museum, Vavant, Vsuivant).museum, Vsuivant).museum; Vavant = Vsuivant;
    avant = etat; etat = suivant; ranger(locaux);
    const vivants = etat.taxons.filter(t => !t.eteint).length, ind = Math.round(etat.taxons.reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0), 0));
    console.log(`${monde} · cycle ${etat.cycle.n} · ${lots.length} lot(s) (${enLigne.length} en ligne, ${locaux.length} du dossier), ${r.pressions.nombre} événement(s) · ${vivants} taxons vivants, ${ind} individus · ${etat.evenements.length} événement(s) du vivant`);
    for (const e of etat.evenements) console.log(`   ★ ${e.type} — ${e.taxon}${e.biome ? ' @' + e.biome : ''}${e.detail ? ' : ' + e.detail : ''}`);
  }
  // (docs/37) les noms proposés par les joueurs : le premier nom valable de chaque lignée est retenu
  let nomsL = [], nomsN = [];
  try { nomsN = await nomsEnLigne(tampon, profil); }
  catch (e) { console.log(`::warning title=${monde} · noms::${e.message || e}. Les noms proposés attendront (la partie « les noms » de hebergement/supabase.sql est-elle appliquée ?).`); }
  nomsL = nomsLocaux();
  if (nomsN.length || nomsL.length) {
    const rn = Chronique.nommer(museum, [...nomsN, ...nomsL], { n: etat.cycle.n, date: etat.cycle.date, refuses: lire('noms-refuses.json', []) });
    museum = rn.museum; entrees.push(...rn.entrees); if (nomsN.length) tampon.dernier_nom = nomsN[nomsN.length - 1].id;
    for (const x of rn.retenus) console.log(`   ✎ ${x.taxon} : « ${x.nom} »`); for (const x of rn.refuses) console.log(`   ✗ nom ${x.id} (${x.taxon}) : ${x.pourquoi}`);
    const t = f('noms/traites'); for (const n of new Set(nomsL.map(x => x._fichier))) { fs.mkdirSync(t, { recursive: true }); fs.renameSync(path.join(f('noms'), n), path.join(t, n)); }
  }
  // (docs/37) la chronique, rangée par année du monde (seul le fichier de l'année en cours change), et le muséum
  fs.mkdirSync(f('chronique'), { recursive: true });
  const annees = annees0.slice();
  for (const an of [...new Set(entrees.map(e => Chronique.annee(e.n, etat)))]) {
    const E = entrees.filter(e => Chronique.annee(e.n, etat) === an), A = lire(`chronique/${an}.json`, { an, entrees: [] }); A.entrees.push(...E); ecrireTexte(`chronique/${an}.json`, Chronique.ecrire(A, 'entrees'));
    const i = annees.findIndex(x => x.an === an), x = { an, de: A.entrees[0]?.n ?? null, a: A.entrees[A.entrees.length - 1]?.n ?? null, entrees: A.entrees.length };
    if (i >= 0) annees[i] = x; else annees.push(x); }
  annees.sort((x, y) => x.an - y.an);
  ecrire('chronique/index.json', { ...chron, annees, derniers: [...derniers0, ...entrees].slice(-Chronique.REGLES.derniers) });   // (l'index porte aussi ce que la chronique a déjà vu)
  ecrireTexte('museum.json', Chronique.ecrire(museum, 'specimens'));
  if (entrees.length) console.log(`chronique : ${entrees.length} entrée(s) ; muséum : ${Object.keys(museum.specimens).length} spécimens`);
  // l'instantané publié porte le cycle d'avant, allégé : tous les traducteurs interpolent entre les deux de la même façon
  const pr = alleger(publie(avant)), F = flore(etat);
  ecrire('etat.json', etat, true); if (F) ecrire('flore.json', F, true);
  const P = Chronique.publier({ ...publie(etat), precedent: { cycle: pr.cycle.n, taxons: pr.taxons.map(t => ({ id: t.id, populations: t.populations, phenotypes: t.phenotypes.map(p => ({ id: p.id, frequence: p.frequence })) })) } }, museum);
  ecrire('instantane.json', P, true);
  // (docs/21) le même monde par morceaux : l'index, chaque biome, chaque lignée (mondes/<id>/morceaux/) ; refaits à chaque cycle
  fs.rmSync(f('morceaux'), { recursive: true, force: true });
  const D = Morceaux.decouper(P);
  for (const [c, o] of Object.entries(D)) { fs.mkdirSync(path.dirname(f('morceaux/' + c)), { recursive: true }); ecrire('morceaux/' + c, o, true); }
  // (docs/21) les planches : chaque lignée de chaque biome dessinée (morceaux/silhouettes/<biome>.json) ; un dessin qui échoue
  // n'arrête pas le cycle, le monde est publié sans ses planches
  try { const Planches = require('../monde/planches.js'); fs.mkdirSync(f('morceaux/silhouettes'), { recursive: true }); for (const [c, o] of Object.entries(Planches.planches(D))) ecrire('morceaux/' + c, o, true); }
  catch (e) { console.error('planches non dessinées :', e.message); }
  // (docs/49) l'herbier : chaque plante de chaque biome dessinée (morceaux/herbier/<biome>.json), avec le temps qu'il y fait
  try { if (F) { const Herbier = require('../monde/herbier.js'); fs.mkdirSync(f('morceaux/herbier'), { recursive: true }); for (const [c, o] of Object.entries(Herbier.planches(F, P.biomes, { orvane: P.orvane, monde: P.monde, cycle: P.cycle }))) ecrire('morceaux/' + c, o, true); } }
  catch (e) { console.error('herbier non dessiné :', e.message); }
  ecrire('historique.json', historique, true); ecrire('tampon.json', tampon);
  console.log(`→ ${path.relative(process.cwd(), f('instantane.json'))}`);
  if (lectureEchouee) process.exitCode = 2;          // le monde est publié, mais l'action se marque en échec pour qu'on le voie
})().catch(e => { console.error('cycle interrompu :', e.message); process.exit(1); });
