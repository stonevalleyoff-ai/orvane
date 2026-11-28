// Orvane — LA SANTÉ DU MOTEUR, dans l'Observatoire (monde/sante.js) — docs/51
// La vue « Santé » : le rapport de chaque semaine sur un monde publié. Les mesures viennent de outils/sante.js ; le récit (le titre,
// le résumé, les constats, ce qu'il faut faire) est écrit au-dessus, chaque semaine. Les rapports sont publiés dans
// sante/<monde>/ : index.json (la liste, le plus récent d'abord) et un fichier par rapport (AAAA-MM-JJ.json).
// Chargé par monde/index.html avant son script : il se sert, au moment de dessiner, de ce que celui-ci définit ($, ESC, E, json…).
'use strict';
const SANTE = { monde: null, index: null, cache: {}, choisi: null, voulu: null, erreur: null };

// un texte du récit : échappé, avec `code` et **gras**
const recit = s => ESC(s || '').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const frN = (x, d = 0) => x == null ? '—' : (x < 0 ? '−' : '') + Math.abs(x).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const pctS = (x, d = 0) => x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toLocaleString('fr-FR', { maximumFractionDigits: d }) + ' %';
const MOIS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jourS = (iso, an = false) => { const d = new Date(iso); return Number.isFinite(+d) ? `${d.getUTCDate()} ${MOIS_S[d.getUTCMonth()]}${an ? ' ' + d.getUTCFullYear() : ''}` : '—'; };
const NIVEAU = { alerte: ['alerte', 'declin'], surveiller: ['à surveiller', 'ambre'], info: ['à savoir', 'sourd'], bon: ['bonne nouvelle', 'vif'] };

function vueSante() {
  const Z = $('#contenu'), id = E.source?.id;
  if (!id || !E.source.publie) { Z.innerHTML = `<p class="atlas-kicker">SANTÉ DU MOTEUR</p><h2>Le rapport de santé</h2><p class="vide">Le rapport de santé porte sur un monde publié. Choisissez-en un en haut de la page.</p>`; return; }
  if (SANTE.monde !== id) Object.assign(SANTE, { monde: id, index: null, cache: {}, choisi: SANTE.voulu, erreur: null });
  if (!SANTE.index && !SANTE.erreur) { Z.innerHTML = '<p class="vide">Chargement du rapport de santé…</p>'; chargerSante(id); return; }
  if (SANTE.erreur || !SANTE.index?.rapports?.length) {
    Z.innerHTML = `<p class="atlas-kicker">SANTÉ DU MOTEUR</p><h2>Le rapport de santé</h2><p class="vide">Pas encore de rapport pour ce monde. Le monde d'Orvane a le sien chaque lundi, après le cycle de la nuit : ce qu'il porte, ce que les joueurs lui font, ce que les bêtes en retiennent, ses souches et ses cycles.</p>`; return; }
  const f = SANTE.choisi && SANTE.index.rapports.some(r => r.fichier === SANTE.choisi) ? SANTE.choisi : SANTE.index.rapports[0].fichier;
  if (!SANTE.cache[f]) { Z.innerHTML = '<p class="vide">Chargement du rapport…</p>'; chargerRapport(id, f); return; }
  SANTE.choisi = f; adresse(); rendreRapport(SANTE.cache[f]);
}
async function chargerSante(id) {
  try { SANTE.index = await json(`../sante/${encodeURIComponent(id)}/index.json`); } catch (e) { SANTE.erreur = e.message; }
  if (E.vue === 'sante' && E.source?.id === id) vueSante();
}
async function chargerRapport(id, f) {
  try { SANTE.cache[f] = await json(`../sante/${encodeURIComponent(id)}/${encodeURIComponent(f)}`); SANTE.choisi = f; } catch (e) { SANTE.erreur = e.message; }
  if (E.vue === 'sante' && E.source?.id === id) vueSante();
}

function rendreRapport(R) {
  const M = R.mesures || {}, Mo = M.monde || {}, ef = M.effectifs || {}, P = M.pressions || {}, Me = M.memoire || {}, So = M.souches || {}, Ry = M.rythme || {};
  const derniers = SANTE.index.rapports, n = M.serie?.length || 0;
  const tuiles = R.chiffres?.length ? R.chiffres : [
    { valeur: frN(ef.lignees_animales), libelle: 'lignées animales vivantes' }, { valeur: ef.betes >= 1e6 ? frN(ef.betes / 1e6, 1) + ' M' : frN(ef.betes), libelle: 'bêtes' },
    { valeur: frN(P.evenements), libelle: `événements de joueurs en ${n} cycles` }, { valeur: frN(Object.values(Me.attitudes || {}).reduce((a, x) => a + x, 0)), libelle: 'populations ayant pris une attitude' }];
  const constats = R.constats?.length ? R.constats : (M.alertes || []).map(a => ({ niveau: a.niveau, titre: a.titre, texte: a.texte }));
  const N = R.notes || {};
  const cmp = M.comparaison;
  const groupes = (M.groupes || []).filter(g => g.lignees >= 5 && g.variation != null).slice(0, 4);
  const lignes = (L, f) => L.map(f).join('');
  $('#contenu').innerHTML = `
    <div class="overview-heading"><div><p class="atlas-kicker">SANTÉ DU MOTEUR / RAPPORT DE LA SEMAINE</p><h2>${recit(R.titre || `Le monde au cycle ${R.cycle}`)}</h2></div><span class="reading-state">Cycle ${R.cycle} · ${jourS(Mo.date || R.date, true)}</span></div>
    ${derniers.length > 1 ? `<div class="filtres sante-archive" role="group" aria-label="Les rapports">${derniers.slice(0, 12).map(r => `<button class="puce" data-rapport="${ESC(r.fichier)}" aria-pressed="${r.fichier === SANTE.choisi}">${jourS(r.date, true)} <span class="sourd">c. ${r.cycle}</span></button>`).join('')}</div>` : ''}
    ${R.resume ? `<p class="phrase">${recit(R.resume)}</p>` : '<p class="phrase">Les mesures de la semaine, sans récit : les alertes viennent des règles de outils/sante.js.</p>'}
    <dl class="chiffres">${lignes(tuiles.slice(0, 4), t => `<div><dt>${recit(t.libelle)}</dt><dd>${recit(t.valeur)}</dd></div>`)}</dl>
    <p class="note">Rapport du ${jourS(R.date, true)}, sur le monde publié au cycle ${R.cycle}${Mo.saison ? ` (${ESC(Mo.saison.nom)})` : ''}. Il paraît chaque lundi.${cmp ? ` Depuis le rapport du ${jourS(cmp.rapport, true)} (cycle ${cmp.cycle}) : ${[cmp.betes != null ? `${frN(cmp.betes)} bêtes` : '', cmp.lignees_animales != null ? `${frN(cmp.lignees_animales)} lignées` : '', `${frN(cmp.evenements_joueurs)} événements de joueurs`, cmp.menacees != null ? `${frN(cmp.menacees)} lignées menacées` : ''].filter(Boolean).join(', ')}.` : ''}</p>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">CE QU'IL FAUT RETENIR</p><h2>Les constats</h2></div><span class="atlas-chart-label">${constats.filter(c => c.niveau === 'alerte').length} alerte${constats.filter(c => c.niveau === 'alerte').length > 1 ? 's' : ''}</span></div>
      <ul class="constats">${lignes(constats, c => { const [mot, cl] = NIVEAU[c.niveau] || NIVEAU.info; return `<li class="constat niveau-${ESC(c.niveau || 'info')}"><span class="pastille ${cl}">${mot}</span><b>${recit(c.titre)}</b><p>${recit(c.texte)}</p></li>`; })}</ul></section>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">01 / LE VIVANT</p><h2>Les groupes qui bougent</h2></div><span class="atlas-chart-label">base 100 au premier cycle</span></div>
      ${N.vivant ? `<p class="sante-texte">${recit(N.vivant)}</p>` : ''}
      <ul class="leg">${lignes(groupes, (g, i) => `<li><span><i style="background:${COUL[i]}"></i>${ESC(nomGroupe(g))}</span></li>`)}</ul>
      <div class="sante-graphe" id="sgGroupes" role="img" aria-label="Indice des effectifs des groupes qui bougent le plus"></div>
      <details class="lineage-index"><summary>Tous les groupes (régime × origine)</summary><div class="defile"><table><thead><tr><th>Groupe</th><th class="n">Lignées</th><th class="n">Depuis</th><th class="n">Bêtes</th><th class="n">Variation</th><th class="n">Dernier cycle</th><th class="n">Satiété</th></tr></thead><tbody>
        ${lignes(M.groupes || [], g => `<tr><td>${ESC(nomGroupe(g))}</td><td class="n">${g.lignees}</td><td class="n">c. ${g.depuis}</td><td class="n">${frN(g.fin)}</td><td class="n ${g.variation < -.1 ? 'declin' : g.variation > .1 ? 'vif' : ''}">${pctS(g.variation)}</td><td class="n">${pctS(g.pentes?.[g.pentes.length - 1], 1)}</td><td class="n">${g.satiete == null ? '—' : frN(g.satiete, 2)}</td></tr>`)}</tbody></table></div></details>
      ${ef.menacees?.length ? `<p class="note">${ef.menacees.length} lignées menacées, les plus petites : ${ef.menacees.slice(0, 6).map(t => `${ESC(t.nom)} (${frN(t.effectif)})`).join(', ')}.${ef.eteintes?.length ? ` Éteintes dans la fenêtre : ${ef.eteintes.map(t => `${ESC(t.nom)} au cycle ${t.cycle}${t.cause ? `, ${ESC(t.cause)}` : ''}`).join(' ; ')}.` : ''}</p>` : ''}</section>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">02 / LES JOUEURS</p><h2>Ce que les jeux envoient, et ce qu'il en reste</h2></div><span class="atlas-chart-label">${frN(P.evenements)} événements · ${P.cycles_avec_lots}/${P.cycles} cycles</span></div>
      ${N.joueurs ? `<p class="sante-texte">${recit(N.joueurs)}</p>` : ''}
      <div class="sante-graphe" id="sgPressions" role="img" aria-label="Événements de joueurs reçus à chaque cycle"></div>
      <h3 class="sante-h3">Les retraits lissés du tampon</h3>
      <p class="note">Ce que le tampon retire chaque cycle à chaque population (moyenne sur ${P.memoire_cycles ?? 5} cycles), et si le moteur en a fait des morts. En tout : ${frN(P.retrait_total, 2)} bête${P.retrait_total > 1 ? 's' : ''} par cycle${P.retrait_perdu > 0 ? `, dont <b class="declin">${frN(P.retrait_perdu, 2)} perdue${P.retrait_perdu > 1 ? 's' : ''}</b>` : ''}.</p>
      <div class="defile"><table><thead><tr><th>Lignée</th><th>Lieu</th><th class="n">Retrait / cycle</th><th class="n">Bêtes</th><th class="n">Morts dues aux joueurs</th><th>Appliqué</th></tr></thead><tbody>
        ${lignes(P.retraits || [], x => `<tr><td>${ESC(x.nom)}<br><span class="sourd">${ESC(x.origine || '')}</span></td><td>${ESC(nomBiomeS(x.biome))}${x.phenotypes?.some(p => p !== '*') ? `<br><span class="sourd">${ESC(x.phenotypes.join(', '))}</span>` : ''}</td><td class="n">${frN(x.retrait, 3)}</td><td class="n">${frN(x.effectif)}</td><td class="n">${x.pression == null ? '—' : frN(x.pression * 100, x.pression >= .01 ? 1 : 2) + ' %'}</td><td>${!x.juge ? '<span class="sourd">trop peu</span>' : x.applique ? 'oui' : '<b class="declin">perdu</b>'}</td></tr>`)}</tbody></table></div>
      <p class="note">${(P.jeux || []).length} jeux inscrits : ${(P.jeux || []).map(j => `${ESC(j.nom)}${j.expose ? ' (exposition réglée)' : ''}`).join(', ')}. ${frN(P.dernier_lot)} lots lus depuis l'ouverture du monde.${P.prises?.length ? ` Ce que les joueurs prennent (valeur z moyenne des bêtes prises) : ${P.prises.filter(p => p.trait === 'taille').slice(0, 4).map(p => `${ESC(p.nom)} en ${ESC(nomBiomeS(p.biome))}, taille ${p.z > 0 ? '+' : ''}${frN(p.z, 2)}`).join(' ; ')}.` : ''}</p></section>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">03 / LA MÉMOIRE</p><h2>Ce que les bêtes retiennent des joueurs</h2></div><span class="atlas-chart-label">${frN(Me.avec_trace)} populations sur ${frN(Me.populations)}</span></div>
      ${N.memoire ? `<p class="sante-texte">${recit(N.memoire)}</p>` : ''}
      <ul class="leg"><li><span><i class="rond" style="background:var(--eau)"></i>Méfiance (fuyante à 0,5)</span></li><li><span><i class="losange" style="background:var(--declin)"></i>Agressivité (agressive à 0,4)</span></li></ul>
      <div class="sante-graphe" id="sgMemoire" role="img" aria-label="Méfiance et agressivité des populations les plus marquées, face aux seuils d'attitude"></div>
      <p class="note">${frN(Me.mefiance?.n)} populations méfiantes, ${frN(Me.habituation?.n)} un peu habituées, ${frN(Me.agressivite?.n)} agressives${Object.keys(Me.attitudes || {}).length ? ` ; attitudes : ${Object.entries(Me.attitudes).map(([a, k]) => `${k} ${ESC(a)}`).join(', ')}` : ' ; aucune attitude'}.${Me.caractere ? ` Le caractère des ${frN(Me.caractere.lignees)} lignées : ${Me.caractere.combatives} combatives, ${Me.caractere.fuyardes} fuyardes, ${Me.caractere.jamais_familieres} jamais familières, ${Me.caractere.opportunistes} opportunistes.` : ''}</p></section>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">04 / LES SOUCHES</p><h2>Les maladies qui circulent</h2></div><span class="atlas-chart-label">${frN(So.infectes)} bêtes infectées · ${So.lignees_infectees} lignées</span></div>
      ${N.souches ? `<p class="sante-texte">${recit(N.souches)}</p>` : ''}
      <div class="defile"><table><thead><tr><th>Souche</th><th class="n">Virulence</th><th class="n">Contagion</th><th>Hôtes</th><th class="n">Infectées</th><th class="n">Née au cycle</th></tr></thead><tbody>
        ${lignes(So.liste || [], s => `<tr><td>${ESC(s.nom)}${s.vecteur ? '<br><span class="ambre">portée par un insecte</span>' : ''}</td><td class="n">${frN(s.virulence * 100)} %</td><td class="n">${frN(s.transmission, 2)}</td><td>${ESC((s.hotes || []).map(h => nomTaxonS(h)).join(', '))}</td><td class="n">${frN(s.infectes)}</td><td class="n">${s.apparu}</td></tr>`)}</tbody></table></div></section>

    <section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">05 / LES CYCLES</p><h2>Le pas du monde, l'année, le climat</h2></div><span class="atlas-chart-label">${Ry.heure_habituelle ? `cycle vers ${ESC(Ry.heure_habituelle)} UTC` : ''}</span></div>
      ${N.cycles ? `<p class="sante-texte">${recit(N.cycles)}</p>` : ''}
      ${Mo.annee ? `<h3 class="sante-h3">L'année : ${Mo.annee} cycles</h3><div class="sante-graphe" id="sgAnnee" role="img" aria-label="Production des lieux au fil de l'année, et le cycle du rapport"></div>` : ''}
      ${M.calendrier?.length ? `<div class="defile"><table><thead><tr><th class="n">Cycle</th><th>Date prévue</th><th>Ce qui change</th></tr></thead><tbody>${lignes(M.calendrier, c => `<tr><td class="n">${c.cycle}</td><td>${jourS(c.date, true)}</td><td>${ESC(c.quoi)}${c.production != null ? ` <span class="sourd">(×${frN(c.production, 2)})</span>` : ''}</td></tr>`)}</tbody></table></div>` : ''}
      ${M.climat ? `<h3 class="sante-h3">Le climat lent</h3><div class="sante-graphe" id="sgClimat" role="img" aria-label="Écart de température prévu par les ondes du climat"></div>
        <p class="note">Écart du monde aujourd'hui : ${M.climat.ecart >= 0 ? '+' : '−'}${frN(Math.abs(M.climat.ecart), 4)}. La part prévisible : ${M.climat.ondes.map(o => `une onde de ${frN(o.periode)} cycles`).join(' et ')}, à quoi s'ajoute une marche au hasard. ${M.climat.reperes.map(r => `Vers le cycle ${frN(r.cycle)} (${jourS(r.date, true)}), ${ESC(r.quoi)}.`).join(' ')}</p>` : ''}</section>

    ${R.actions?.length ? `<section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">06 / LA SUITE</p><h2>Ce qu'il faut faire</h2></div></div><ol class="sante-actions">${lignes(R.actions, a => `<li><b>${recit(a.titre)}</b> ${recit(a.texte)}</li>`)}</ol></section>` : ''}
    <p class="note">Mesures calculées par <code>outils/sante.js</code> sur les fichiers publiés du monde ; récit écrit chaque semaine au-dessus de ces mesures${R.auteur ? ` (${ESC(R.auteur)})` : ''}. Le détail des règles d'alerte : docs/51.</p>`;
  $$('[data-rapport]').forEach(b => b.onclick = () => { SANTE.choisi = b.dataset.rapport; vueSante(); });
  dessinerSante(R, groupes);
}
const nomGroupe = g => { const R = { herbivore: 'Herbivores', carnivore: 'Carnivores', omnivore: 'Omnivores', filtreur: 'Filtreurs', detritivore: 'Charognards', synthetique: 'Machines' };
  return `${R[g.regime] || g.regime}${g.origine === 'Orvane' ? ' d’Orvane' : ` · ${g.origine}`}`; };
const nomBiomeS = id => inst()?.biomes?.find(b => b.id === id)?.nom || id;
const nomTaxonS = id => nomEsp(inst()?.taxons?.find(t => t.id === id)) || id;

// --- les graphiques : SVG à la largeur du panneau, couleurs de l'Observatoire, une bulle au survol ---
const NS_S = 'http://www.w3.org/2000/svg';
function sv(tag, at, parent) { const e = document.createElementNS(NS_S, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
function st(txt, at, parent) { const e = sv('text', at, parent); e.textContent = txt; return e; }
function bulle(wrap) {
  let t = wrap.querySelector('.sante-tip'); if (!t) { t = document.createElement('div'); t.className = 'sante-tip'; t.hidden = true; wrap.appendChild(t); }
  return { voir(html, x, y) { t.innerHTML = html; t.hidden = false; const w = wrap.clientWidth, tw = t.offsetWidth; let l = x + 12; if (l + tw > w) l = Math.max(0, x - tw - 12); t.style.left = l + 'px'; t.style.top = Math.max(0, y - 8) + 'px'; }, cacher() { t.hidden = true; } };
}
function courbeS(id, o) {
  const wrap = document.getElementById(id); if (!wrap) return; wrap.querySelectorAll('svg').forEach(e => e.remove());
  const W = Math.max(260, wrap.clientWidth), H = o.h || 250, etroit = W < 520, M = { l: 46, r: o.droite ? (etroit ? 86 : o.droite) : 12, t: 14, b: 30 };
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }); wrap.prepend(svg);
  const X = v => M.l + (v - o.x0) / (o.x1 - o.x0) * (W - M.l - M.r), Y = v => M.t + (o.y1 - v) / (o.y1 - o.y0) * (H - M.t - M.b);
  for (const b of o.bandes || []) { const a = Math.max(o.x0, b.a), z = Math.min(o.x1, b.b); if (z <= a) continue;
    sv('rect', { x: X(a), y: M.t, width: X(z) - X(a), height: H - M.t - M.b, style: `fill:${b.fond}` }, svg);
    if (b.nom && X(z) - X(a) > 50) st(b.nom, { x: (X(a) + X(z)) / 2, y: M.t + 13, 'text-anchor': 'middle', class: 'sg-axe' }, svg); }
  for (const v of o.yt) { sv('line', { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), class: v === o.base ? 'sg-base' : 'sg-grille' }, svg); st(o.yf(v), { x: M.l - 7, y: Y(v) + 4, 'text-anchor': 'end', class: 'sg-axe' }, svg); }
  for (const [v, lab] of (etroit && o.xtE ? o.xtE : o.xt)) { sv('line', { x1: X(v), x2: X(v), y1: H - M.b, y2: H - M.b + 4, class: 'sg-base' }, svg); st(lab, { x: X(v), y: H - M.b + 17, 'text-anchor': 'middle', class: 'sg-axe' }, svg); }
  for (const r of o.refs || []) { sv('line', { x1: M.l, x2: W - M.r, y1: Y(r.y), y2: Y(r.y), style: 'stroke:var(--sourd);stroke-dasharray:4 4' }, svg); st(r.nom, { x: r.x != null ? X(r.x) + 5 : W - M.r - 4, y: Y(r.y) - 5, 'text-anchor': r.x != null ? 'start' : 'end', class: 'sg-axe' }, svg); }
  if (o.ici != null) { sv('line', { x1: X(o.ici), x2: X(o.ici), y1: M.t, y2: H - M.b, style: 'stroke:var(--ambre);stroke-width:1.5' }, svg); st(o.iciNom || 'le rapport', { x: X(o.ici) + 5, y: H - M.b - 7, class: 'sg-axe', style: 'fill:var(--ambre)' }, svg); }
  for (const s of o.series) { const p = s.xs.map((x, i) => [X(x), Y(s.ys[i])]);
    sv('path', { d: 'M' + p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L'), style: `fill:none;stroke:${s.coul};stroke-width:2;stroke-linejoin:round;stroke-linecap:round` }, svg);
    for (const i of s.points || []) if (p[i]) sv('circle', { cx: p[i][0], cy: p[i][1], r: 3.5, style: `fill:${s.coul};stroke:var(--surface);stroke-width:1.5` }, svg);
    if (s.nom) { const q = p[p.length - 1]; sv('circle', { cx: q[0], cy: q[1], r: 4, style: `fill:${s.coul};stroke:var(--surface);stroke-width:2` }, svg); } }
  const fins = o.series.filter(s => s.nom).map(s => ({ s, y: Y(s.ys[s.ys.length - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 14) fins[i].y = fins[i - 1].y + 14;
  for (const f of fins) st(etroit ? f.s.court : f.s.nom, { x: W - M.r + 8, y: f.y + 4, class: 'sg-etiq' }, svg);
  if (!o.bulle) return;
  const B = bulle(wrap), croix = sv('line', { y1: M.t, y2: H - M.b, style: 'stroke:var(--sourd)', visibility: 'hidden' }, svg), xs = o.series[0].xs;
  const zone = sv('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, style: 'fill:transparent;cursor:crosshair' }, svg);
  const bouger = ev => { const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width; let i = 0, m = 1e9; xs.forEach((x, j) => { const d = Math.abs(X(x) - px); if (d < m) { m = d; i = j; } });
    croix.setAttribute('x1', X(xs[i])); croix.setAttribute('x2', X(xs[i])); croix.setAttribute('visibility', 'visible'); B.voir(o.bulle(i), X(xs[i]) * r.width / W, ev.clientY - r.top); };
  zone.addEventListener('pointermove', bouger); zone.addEventListener('pointerdown', bouger);
  zone.addEventListener('pointerleave', () => { B.cacher(); croix.setAttribute('visibility', 'hidden'); });
}
function dessinerSante(R, groupes) {
  const M = R.mesures, S = M.serie || [];
  // 1. les groupes, en indice
  if (groupes.length && S.length > 1) {
    const d0 = Math.max(...groupes.map(g => g.depuis)), L = S.filter(s => s.n >= d0), base = Object.fromEntries(groupes.map(g => [g.cle, L[0].groupes[g.cle] || 1]));
    const ys = groupes.map(g => L.map(s => 100 * (s.groupes[g.cle] || 0) / base[g.cle])), max = Math.max(110, ...ys.flat()), pas = max > 250 ? 100 : 50, top = Math.ceil(max / pas) * pas;
    const xt = [], k = Math.max(1, Math.round((L.length - 1) / 5)); for (let i = 0; i < L.length; i += k) xt.push([L[i].n, 'c. ' + L[i].n]);
    courbeS('sgGroupes', { h: 270, droite: 150, x0: L[0].n, x1: L[L.length - 1].n, y0: 0, y1: top, base: 100, yt: Array.from({ length: top / pas + 1 }, (_, i) => i * pas), yf: v => String(v), xt, xtE: [xt[0], xt[xt.length - 1]],
      series: groupes.map((g, i) => ({ xs: L.map(s => s.n), ys: ys[i], coul: COUL[i], nom: nomGroupe(g), court: nomGroupe(g).replace('Carnivores', 'Carniv.').replace('Herbivores', 'Herbiv.').replace('Omnivores', 'Omniv.').replace('Filtreurs', 'Filtr.') })),
      bulle: i => `<b>Cycle ${L[i].n}</b> · ${jourS(L[i].date)}<br>` + groupes.map((g, j) => `<span class="k" style="background:${COUL[j]}"></span>${ESC(nomGroupe(g))} : ${frN(ys[j][i])} <span class="sourd">(${frN(L[i].groupes[g.cle])})</span>`).join('<br>') }); }
  // 2. les événements de joueurs, en barres
  (function () { const wrap = document.getElementById('sgPressions'); if (!wrap || !S.length) return; wrap.querySelectorAll('svg').forEach(e => e.remove());
    const W = Math.max(260, wrap.clientWidth), H = 200, etroit = W < 520, M2 = { l: 40, r: 6, t: 20, b: 34 }, svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }); wrap.prepend(svg);
    const max = Math.max(10, ...S.map(s => s.evenements_joueurs)), pas = max > 200 ? 100 : max > 80 ? 25 : max > 40 ? 10 : 5, top = Math.ceil(max / pas) * pas, Y = v => M2.t + (top - v) / top * (H - M2.t - M2.b);
    const slot = (W - M2.l - M2.r) / S.length, bw = Math.max(5, Math.min(26, slot - 4)), B = bulle(wrap);
    for (let v = 0; v <= top; v += pas) { sv('line', { x1: M2.l, x2: W - M2.r, y1: Y(v), y2: Y(v), class: v ? 'sg-grille' : 'sg-base' }, svg); st(String(v), { x: M2.l - 7, y: Y(v) + 4, 'text-anchor': 'end', class: 'sg-axe' }, svg); }
    const pic = Math.max(...S.map(s => s.evenements_joueurs));
    S.forEach((s, i) => { const cx = M2.l + slot * (i + .5), x = cx - bw / 2, y = Y(s.evenements_joueurs), h = Y(0) - y, rr = Math.min(3, h, bw / 2);
      if (s.evenements_joueurs > 0) sv('path', { d: `M${x},${Y(0)}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${Y(0)}Z`, style: 'fill:var(--ambre)' }, svg);
      if (s.evenements_joueurs >= pic * .6 && s.evenements_joueurs > 0) st(String(s.evenements_joueurs), { x: cx, y: y - 5, 'text-anchor': 'middle', class: 'sg-etiq' }, svg);
      if (!etroit || i % 2 === 0 || i === S.length - 1) st(String(s.n), { x: cx, y: H - M2.b + 15, 'text-anchor': 'middle', class: 'sg-axe' }, svg);
      if (!etroit && (i === 0 || i === S.length - 1 || i % 4 === 0)) st(jourS(s.date), { x: cx, y: H - M2.b + 28, 'text-anchor': 'middle', class: 'sg-axe' }, svg);
      const zone = sv('rect', { x: cx - slot / 2, y: M2.t, width: slot, height: H - M2.t - M2.b, style: 'fill:transparent' }, svg);
      const voir = ev => { const r = svg.getBoundingClientRect(); zone.style.fill = 'var(--surface2)'; zone.style.opacity = '.6'; B.voir(`<b>Cycle ${s.n}</b> · ${jourS(s.date)} ${s.date.slice(11, 16)}<br>${s.evenements_joueurs ? frN(s.evenements_joueurs) + ' événement' + (s.evenements_joueurs > 1 ? 's' : '') : 'aucun lot'}`, cx * r.width / W, ev.clientY - r.top); };
      zone.addEventListener('pointermove', voir); zone.addEventListener('pointerdown', voir); zone.addEventListener('pointerleave', () => { zone.style.fill = 'transparent'; B.cacher(); }); });
    st('cycle', { x: M2.l - 7, y: H - M2.b + 15, 'text-anchor': 'end', class: 'sg-axe' }, svg); })();
  // 3. la mémoire, en points face aux seuils
  (function () { const wrap = document.getElementById('sgMemoire'), L = (M.memoire?.top || []).filter(p => p.mefiance || p.agressivite).slice(0, 12); if (!wrap) return; wrap.querySelectorAll('svg').forEach(e => e.remove());
    if (!L.length) { wrap.innerHTML = '<p class="vide">Aucune population n\'a appris la méfiance ni l\'agressivité.</p>'; return; }
    const W = Math.max(260, wrap.clientWidth), etroit = W < 520, ligne = 25, M3 = { l: etroit ? 92 : 170, r: 12, t: 24, b: 26 }, H = M3.t + M3.b + ligne * L.length, xmax = Math.max(.6, Math.ceil(Math.max(...L.map(p => Math.max(p.mefiance, p.agressivite))) * 10 + 1) / 10);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }); wrap.prepend(svg); const X = v => M3.l + v / xmax * (W - M3.l - M3.r), B = bulle(wrap);
    for (let v = 0; v <= xmax + 1e-9; v += .1) { sv('line', { x1: X(v), x2: X(v), y1: M3.t, y2: H - M3.b, class: v ? 'sg-grille' : 'sg-base' }, svg); st(frN(v, 1), { x: X(v), y: H - M3.b + 15, 'text-anchor': 'middle', class: 'sg-axe' }, svg); }
    sv('line', { x1: X(.4), x2: X(.4), y1: M3.t - 6, y2: H - M3.b, style: 'stroke:var(--declin);stroke-dasharray:4 3;stroke-width:1.5' }, svg); st('agressive', { x: X(.4) - 4, y: M3.t - 9, 'text-anchor': 'end', class: 'sg-axe' }, svg);
    sv('line', { x1: X(.5), x2: X(.5), y1: M3.t - 6, y2: H - M3.b, style: 'stroke:var(--eau);stroke-dasharray:4 3;stroke-width:1.5' }, svg); st('fuyante', { x: X(.5) + 4, y: M3.t - 9, class: 'sg-axe' }, svg);
    L.forEach((p, i) => { const cy = M3.t + ligne * (i + .5), nom = (p.nom || p.taxon).split(' ')[0];
      st(etroit ? nom : `${nom} · ${nomBiomeS(p.biome)}`, { x: M3.l - 9, y: cy + 4, 'text-anchor': 'end', class: 'sg-etiq' }, svg);
      if (p.agressivite) sv('line', { x1: X(Math.min(p.mefiance, p.agressivite)), x2: X(Math.max(p.mefiance, p.agressivite)), y1: cy, y2: cy, style: 'stroke:var(--ligne);stroke-width:2' }, svg);
      if (p.mefiance) sv('circle', { cx: X(p.mefiance), cy, r: 5, style: 'fill:var(--eau);stroke:var(--surface);stroke-width:2' }, svg);
      if (p.agressivite) sv('rect', { x: X(p.agressivite) - 4.5, y: cy - 4.5, width: 9, height: 9, transform: `rotate(45 ${X(p.agressivite)} ${cy})`, style: 'fill:var(--declin);stroke:var(--surface);stroke-width:2' }, svg);
      const zone = sv('rect', { x: 0, y: cy - ligne / 2, width: W, height: ligne, style: 'fill:transparent' }, svg);
      const voir = ev => { const r = svg.getBoundingClientRect(); zone.style.fill = 'var(--surface2)'; zone.style.opacity = '.5';
        B.voir(`<b>${ESC(p.nom)}</b><br>${ESC(nomBiomeS(p.biome))}, ${frN(p.effectif)} bêtes<br>méfiance ${frN(p.mefiance, 3)} · agressivité ${p.agressivite ? frN(p.agressivite, 3) : '—'}${p.habituation ? ` · habituation ${frN(p.habituation, 3)}` : ''}${p.combativite != null ? `<br><span class="sourd">combativité de la lignée ${frN(p.combativite, 2)}</span>` : ''}`, ev.clientX - r.left, cy * r.height / H); };
      zone.addEventListener('pointermove', voir); zone.addEventListener('pointerdown', voir); zone.addEventListener('pointerleave', () => { zone.style.fill = 'transparent'; B.cacher(); }); }); })();
  // 4. l'année : la production, les saisons, les cycles observés
  const Mo = M.monde, A = Mo?.annee;
  if (A && S.length) { const cap = globalThis.Orvane?.REGLES?.saisons?.capacite ?? .25, prod = k => 1 + cap * -Math.cos(2 * Math.PI * ((k % A) / A)), sais = k => ['hiver', 'printemps', 'été', 'automne'][Math.floor((((k % A) / A) + .125) % 1 * 4)];
    const x0 = S[0].n, x1 = Mo.cycle + A, xs = []; for (let k = x0; k <= x1; k++) xs.push(k);
    const dur = (Mo.duree_cycle_h || 24) * 36e5, t0 = Date.parse(Mo.date), dateK = k => { const s = S.find(z => z.n === k); return s ? s.date : new Date(t0 + (k - Mo.cycle) * dur).toISOString(); };
    const bandes = [], fonds = ['#efe9d9', '#f6f3ea']; let a = x0; for (let k = x0 + 1; k <= x1 + 1; k++) if (k > x1 || sais(k) !== sais(a)) { bandes.push({ a, b: k, fond: fonds[bandes.length % 2], nom: sais(a) }); a = k; }
    const xt = bandes.slice(1).map(b => [b.a, jourS(dateK(b.a))]);
    courbeS('sgAnnee', { h: 230, x0, x1, y0: 1 - cap - .05, y1: 1 + cap + .05, yt: [1 - cap, 1, 1 + cap], yf: v => '×' + frN(v, 2), xt, xtE: xt.filter((_, i) => i % 2 === 0), bandes, ici: Mo.cycle, iciNom: 'le rapport',
      series: [{ xs, ys: xs.map(prod), coul: 'var(--texte)', points: S.map(s => s.n - x0) }],
      bulle: i => { const k = xs[i], s = S.find(z => z.n === k); return `<b>Cycle ${k}</b> · ${jourS(dateK(k), true)}${s ? '' : ' (prévu)'}<br>${sais(k)}, production ×${frN(s?.production ?? prod(k), 3)}`; } }); }
  // 5. le climat : la part prévisible de l'écart
  if (M.climat?.courbe?.length) { const C = M.climat, pts = C.courbe, dur = (Mo.duree_cycle_h || 24) * 36e5, t0 = Date.parse(Mo.date), dateK = k => new Date(t0 + (k - Mo.cycle) * dur);
    const y = new Date(dateK(pts[0][0])).getUTCFullYear(), xt = []; for (let a = y + 1; ; a++) { const k = Math.round(Mo.cycle + (Date.UTC(a, 0, 1) - t0) / dur); if (k > pts[pts.length - 1][0]) break; xt.push([k, String(a)]); }
    const bandes = []; let deb = null; for (const [k, v] of pts) { if (deb == null && v <= C.seuils.emerger) deb = k; if (deb != null && v > C.seuils.sombrer) { bandes.push({ a: deb, b: k, fond: '#e8ecdf', nom: 'ponts de terre' }); deb = null; } } if (deb != null) bandes.push({ a: deb, b: pts[pts.length - 1][0], fond: '#e8ecdf', nom: 'ponts' });
    courbeS('sgClimat', { h: 230, x0: pts[0][0], x1: pts[pts.length - 1][0], y0: -.12, y1: .12, base: 0, yt: [-.1, -.05, 0, .05, .1], yf: v => (v > 0 ? '+' : v < 0 ? '−' : '') + frN(Math.abs(v), 2), xt, xtE: xt.filter((_, i) => i % 2 === 0), bandes,
      // (l'étiquette du seuil, sous le sommet chaud de l'onde : là où la courbe est loin de lui)
      refs: [{ y: C.seuils.emerger, nom: `${frN(C.seuils.emerger, 2)} : la mer baisse`, x: Math.max(pts[0][0], pts.reduce((m, p) => p[1] > m[1] ? p : m, pts[0])[0] - 150) }], ici: Mo.cycle, iciNom: 'aujourd’hui',
      series: [{ xs: pts.map(p => p[0]), ys: pts.map(p => p[1]), coul: 'var(--eau)' }],
      bulle: i => `<b>Cycle ${frN(pts[i][0])}</b> · ${jourS(dateK(pts[i][0]).toISOString(), true)}<br>écart prévu ${pts[i][1] >= 0 ? '+' : '−'}${frN(Math.abs(pts[i][1]), 3)}` }); }
}
