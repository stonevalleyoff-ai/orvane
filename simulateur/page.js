// Orvane — LE SIMULATEUR DE JOUEURS, SA PAGE (simulateur/page.js) — docs/50
// On choisit un lieu du monde et quelques-unes de ses bêtes, on compose des joueurs fictifs, on fait passer les nuits, et on
// regarde ce que chaque population apprend. Le calcul est dans simulateur/coeur.js (le vrai tampon, la vraie mémoire) ; ce
// fichier ne fait que lire le monde publié (tampon/morceaux.js), dessiner les bêtes (monde/silhouette.js) et montrer.
// Rien n'est envoyé à Orvane. Les noms viennent du monde : ils sont posés en texte, jamais en HTML.
(() => {
  'use strict';
  const MONDE = '../mondes/orvane/', MAX_BETES = 4, S = globalThis.OrvaneSimulateur;
  const $ = id => document.getElementById(id);
  const REGIME = { herbivore: 'herbivore', omnivore: 'omnivore', carnivore: 'carnivore', filtreur: 'filtreur', detritivore: 'charognard' };
  const ATTITUDES = { traqueuse: 'traqueuse', agressive: 'agressive', defensive: 'défensive', exigeante: 'exigeante', rodeuse: 'rôdeuse', quemandeuse: 'quémandeuse', fuyante: 'fuyante', familiere: 'familière' };
  // sur cent bêtes : ce que fait chacune (le pluriel de son attitude)
  const FONT = { traqueuse: ['traque le joueur', 'traquent le joueur'], agressive: ['fait front et charge', 'font front et chargent'], defensive: ['se méfie et fait front', 'se méfient et font front'], exigeante: ['exige sa nourriture', 'exigent leur nourriture'],
    rodeuse: ['rôde sans oser', 'rôdent sans oser'], quemandeuse: ['quémande', 'quémandent'], fuyante: ['fuit', 'fuient'], familiere: ['se laisse approcher', 'se laissent approcher'], '': ['n’a rien de marqué', 'n’ont rien de marqué'] };
  const font = (k, n) => (FONT[k] || [k, k])[n > 1 ? 1 : 0];
  const TRAITS = [['hardiesse', 'Hardiesse'], ['combativite', 'Combativité'], ['opportunisme', 'Opportunisme']];
  const nb = v => Math.round(v).toLocaleString('fr-FR'), dec = v => (+v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const masse = kg => kg >= 1 ? `${(+kg.toFixed(kg >= 10 ? 0 : 1)).toLocaleString('fr-FR')} kg` : `${Math.max(1, Math.round(kg * 1000)).toLocaleString('fr-FR')} g`;
  const nomDe = t => t.nom_commun || t.nom || t.id, pluriel = (n, un, des) => `${nb(n)} ${n > 1 ? des : un}`;
  // un élément : h('p', { class: 'x' }, 'texte', enfant…) ; les chaînes deviennent du texte
  const h = (tag, attrs, ...enfants) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f); else e.setAttribute(k, v === true ? '' : v); }
    for (const c of enfants.flat()) if (c != null && c !== false) e.append(c); return e; };
  const svg = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; };

  let inst = null, profil = null, sim = null, lieu = null;
  const groupes = Object.fromEntries(Object.keys(S.STYLES).map(k => [k, 0])); groupes.chasseur = 5;

  // --- lire le monde, un lieu ---
  async function ouvrir(id) {
    lieu = id; $('etat-monde').textContent = 'Lecture du lieu…';
    try {
      inst = await OrvaneMorceaux.lire(MONDE, { biomes: [id] });
      if (!profil) profil = await (await fetch(MONDE + 'profil.json', { cache: 'no-cache' })).json();
    } catch (e) { $('etat-monde').textContent = 'Le monde ne se lit pas (' + (e.message || e) + '). Rechargez la page dans un moment.'; return; }
    sim = S.creer(inst, profil);
    const L = lignees(), b = inst.biomes.find(x => x.id === id);
    $('etat-monde').textContent = `${inst.monde?.nom || 'Le monde d’Orvane'}, cycle ${inst.cycle?.n ?? '?'} · ${b?.nom || id} : ${pluriel(L.length, 'lignée', 'lignées')}. ` +
      (sim.eveille ? `La mémoire y est éveillée depuis le cycle ${inst.monde.memoire.depuis} : la simulation part de ce que les bêtes ont déjà appris.` : 'Le monde publié n’a pas encore éveillé la mémoire : le simulateur l’éveille sur sa copie, et chaque bête part de rien.');
    // par défaut, trois caractères qui ne se ressemblent pas : la plus combative du lieu, la plus craintive, et une entre les deux
    const C = L.filter(x => x.p.effectif >= 5).map(x => ({ ...x, car: OrvaneMemoire.caractereDe(x.t.plan) })), tri = (k, sens) => C.slice().sort((a, b2) => sens * (a.car[k] - b2.car[k]) || b2.p.effectif - a.p.effectif);
    const combative = tri('combativite', -1)[0], craintive = tri('hardiesse', 1).find(x => x !== combative), milieu = combative && craintive ? C.filter(x => x !== combative && x !== craintive).sort((a, b2) => Math.abs(a.car.combativite - (combative.car.combativite + craintive.car.combativite) / 2) - Math.abs(b2.car.combativite - (combative.car.combativite + craintive.car.combativite) / 2))[0] : null;
    for (const x of [combative, milieu, craintive]) if (x) S.suivre(sim, x.t.id, lieu);
    if (!sim.betes.size && L[0]) S.suivre(sim, L[0].t.id, lieu);
    choixBetes(); tout();
  }
  // les lignées du lieu : { t, p, corps }, les plus nombreuses d'abord
  function lignees() {
    return inst.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique').map(t => ({ t, p: t.populations.find(p => p.biome === lieu) })).filter(x => x.p && x.p.effectif >= 1)
      .map(x => ({ ...x, corps: OrvaneMemoire.corpsDe(x.t.plan, Orvane.appetence) })).sort((a, b) => b.p.effectif - a.p.effectif);
  }
  function choixBetes() {
    const sel = $('bete'), L = lignees(); sel.replaceChildren(h('option', { value: '' }, 'Ajouter une bête à suivre…'));
    for (const [titre, filtre] of [['Les mangeurs de chair (ils peuvent s’en prendre aux joueurs)', x => x.corps > 0], ['Les autres', x => !(x.corps > 0)]]) {
      const g = h('optgroup', { label: titre }); for (const x of L.filter(filtre)) if (!sim.betes.has(S.cle(x.t.id, lieu))) { const car = OrvaneMemoire.caractereDe(x.t.plan);
        g.append(h('option', { value: x.t.id }, `${nomDe(x.t)} — ${S.motDe('hardiesse', car.hardiesse)}, ${S.motDe('combativite', car.combativite)} · ${pluriel(x.p.effectif, 'bête', 'bêtes')}, ${masse(x.t.plan.masse_kg || 0)}`)); }
      if (g.children.length) sel.append(g); }
    sel.disabled = sim.betes.size >= MAX_BETES; $('note-betes').textContent = sim.betes.size >= MAX_BETES ? `Quatre bêtes au plus : retirez-en une pour en suivre une autre.` : '';
  }

  // --- les joueurs fictifs ---
  const decrire = L => L.map(([a, n, m]) => `${nb(n)} ${S.ACTIONS[a] || a}${m ? ' ' + S.MOYENS[m] : ''}`).join(', ');
  function joueurs() {
    const corps = $('joueurs'); corps.replaceChildren();
    for (const [id, st] of Object.entries(S.STYLES)) {
      const val = h('output', { id: 'n-' + id, 'aria-live': 'polite' }, String(groupes[id]));
      const pas = d => () => { groupes[id] = Math.max(0, Math.min(50, groupes[id] + d)); val.textContent = String(groupes[id]); ligne.classList.toggle('actif', groupes[id] > 0); resume(); };
      const ligne = h('div', { class: 'style' + (groupes[id] > 0 ? ' actif' : '') },
        h('div', { class: 'compteur', role: 'group', 'aria-label': `Combien de ${st.nom.toLowerCase()}` },
          h('button', { type: 'button', 'aria-label': `Un de moins : ${st.nom}`, on: { click: pas(-1) } }, '−'), val, h('button', { type: 'button', 'aria-label': `Un de plus : ${st.nom}`, on: { click: pas(1) } }, '+')),
        h('div', { class: 'style-texte' }, h('h3', null, st.nom), h('p', null, st.dit),
          h('details', null, h('summary', null, 'Ce qu’un tel joueur déclare chaque nuit'),
            h('p', null, h('b', null, 'Pour un mangeur de chair : '), decrire(st.predateur) + '.'), h('p', null, h('b', null, 'Pour une autre bête : '), decrire(st.proie) + '.'),
            st.riposte ? h('p', null, h('b', null, 'Si la bête fait front : '), 'jusqu’à ' + decrire(st.riposte) + ', à proportion de son agressivité.') : null)));
      corps.append(ligne);
    }
    resume();
  }
  const actifs = () => Object.entries(groupes).filter(([, n]) => n > 0).map(([style, n]) => ({ style, n }));
  function resume() { const A = actifs(), n = A.reduce((s, g) => s + g.n, 0);
    $('resume-joueurs').textContent = n ? `Cette nuit : ${A.map(g => `${g.n} ${S.STYLES[g.style].nom.toLowerCase()}`).join(', ')}.` : 'Cette nuit : personne. Les bêtes oublient.'; }

  // --- le graphique d'une disposition : une courbe sur les nuits, de 0 à 1, son seuil, le point d'aujourd'hui ---
  const W = 240, H = 72, G = { g: 9, d: 9, h: 10, b: 10 }, RAYON = 7;   // (un repère de 240 × 72, étiré à la largeur de la tuile ; les traits gardent leur épaisseur)
  function courbe(b, D) {
    const pts = b.histoire, N = Math.max(10, pts.at(-1).nuit), x = n => G.g + (W - G.g - G.d) * n / N, y = v => G.h + (H - G.h - G.b) * (1 - v), seuil = D.seuil();
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${D.nom} de la nuit 0 à la nuit ${pts.at(-1).nuit} : ${dec(pts.at(-1)[D.id])}`, tabindex: '0', class: 'courbe' });
    s.append(svg('line', { x1: G.g, x2: W - G.d, y1: y(0), y2: y(0), class: 'axe' }), svg('line', { x1: G.g, x2: W - G.d, y1: y(1), y2: y(1), class: 'axe' }), svg('line', { x1: G.g, x2: W - G.d, y1: y(seuil), y2: y(seuil), class: 'seuil' }));
    if (pts.length > 1) s.append(svg('polyline', { points: pts.map(p => `${x(p.nuit).toFixed(1)},${y(p[D.id]).toFixed(1)}`).join(' '), class: 'trait' }));
    const fin = pts.at(-1); s.append(svg('circle', { cx: x(fin.nuit), cy: y(fin[D.id]), r: RAYON, class: 'point' }));
    const repere = svg('line', { y1: G.h, y2: H - G.b, class: 'repere', visibility: 'hidden' }), survol = svg('circle', { r: RAYON, class: 'point survol', visibility: 'hidden' }); s.append(repere, survol);
    // le survol : la nuit la plus proche du pointeur (ou les flèches du clavier) ; la bulle dit la nuit, la valeur, l'attitude
    let k = pts.length - 1;
    const montrer = (i, ev) => { k = Math.max(0, Math.min(pts.length - 1, i)); const p = pts[k], r = s.getBoundingClientRect(), px = r.left + r.width * x(p.nuit) / W, py = r.top + r.height * y(p[D.id]) / H;
      repere.setAttribute('x1', x(p.nuit)); repere.setAttribute('x2', x(p.nuit)); repere.setAttribute('visibility', 'visible'); survol.setAttribute('cx', x(p.nuit)); survol.setAttribute('cy', y(p[D.id])); survol.setAttribute('visibility', 'visible');
      bulle(px, py, dec(p[D.id]), `${D.nom} · nuit ${p.nuit}${p.attitude ? ' · ' + ATTITUDES[p.attitude] : ''}`); };
    const cacher = () => { repere.setAttribute('visibility', 'hidden'); survol.setAttribute('visibility', 'hidden'); $('bulle').hidden = true; };
    s.addEventListener('pointermove', ev => { const r = s.getBoundingClientRect(), n = ((ev.clientX - r.left) / r.width * W - G.g) / (W - G.g - G.d) * N; let i = 0; for (let j = 1; j < pts.length; j++) if (Math.abs(pts[j].nuit - n) < Math.abs(pts[i].nuit - n)) i = j; montrer(i); });
    s.addEventListener('pointerleave', cacher); s.addEventListener('blur', cacher); s.addEventListener('focus', () => montrer(pts.length - 1));
    s.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') { montrer(k - 1); ev.preventDefault(); } else if (ev.key === 'ArrowRight') { montrer(k + 1); ev.preventDefault(); } else if (ev.key === 'Escape') cacher(); });
    return s;
  }
  function bulle(x, y, valeur, quoi) { const B = $('bulle'); B.replaceChildren(h('strong', null, valeur), h('span', null, quoi)); B.hidden = false;
    const r = B.getBoundingClientRect(), gx = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)), gy = y - r.height - 12 < 8 ? y + 14 : y - r.height - 12; B.style.left = gx + scrollX + 'px'; B.style.top = gy + scrollY + 'px'; }

  // --- une jauge de 0 à 1 (le caractère), et les parts d'une population (sur cent bêtes) : une seule teinte, les nombres écrits ---
  const jauge = (v, dit) => h('span', { class: 'jauge', role: 'img', 'aria-label': dit }, h('i', { style: `width:${Math.round(v * 100)}%` }));
  function caractere(b) {
    return h('div', { class: 'caractere' }, h('h4', null, 'Son caractère'),
      TRAITS.map(([k, nom]) => h('div', { class: 'trait-car' }, h('span', { class: 'trait-nom' }, nom), jauge(b.caractere[k], `${nom} : ${dec(b.caractere[k])} sur 1`), h('span', { class: 'trait-mot' }, `${S.motDe(k, b.caractere[k])} · ${dec(b.caractere[k])}`))),
      h('p', { class: 'note' }, 'Lu sur son corps et son tempérament : ce qu’elle est avant d’avoir rien appris.'));
  }
  function parts(b) {
    const L = Object.entries(b.parts).filter(([, v]) => v >= .005).sort((a, c) => c[1] - a[1]);
    return h('div', { class: 'parts' }, h('h4', null, 'Sur cent bêtes de cette population'),
      L.length === 1 ? h('p', { class: 'note' }, `Toutes pareilles pour l’instant : elles ${font(L[0][0], 100)}.`)
        : h('ul', null, L.map(([k, v]) => h('li', null, h('span', { class: 'part-n' }, String(Math.round(v * 100))), h('span', { class: 'part-nom' }, font(k, Math.round(v * 100))), h('span', { class: 'part-barre' + (k ? '' : ' neutre'), 'aria-hidden': 'true' }, h('i', { style: `width:${(v * 100).toFixed(1)}%` }))))),
      L.length > 1 ? h('p', { class: 'note' }, 'Une bête n’est pas sa population : les plus hardies osent ce que les autres n’osent pas.') : null);
  }

  // --- une bête suivie : son dessin, son attitude, son caractère, ses six dispositions, ce qu'un jeu en ferait, les tableaux ---
  function carte(b) {
    const t = b.taxon, d = b.histoire.at(-1), d0 = b.histoire[0], ph = (t.phenotypes || []).slice().sort((a, c) => (c.frequence_par_biome?.[b.biome] ?? c.frequence ?? 0) - (a.frequence_par_biome?.[b.biome] ?? a.frequence ?? 0))[0];
    const dessin = h('div', { class: 'dessin', 'aria-hidden': 'true' }); if (globalThis.OrvaneSilhouette) dessin.innerHTML = OrvaneSilhouette.dessiner(t.plan.corps, t.plan, ph?.traits || []);   // (un dessin calculé par monde/silhouette.js, pas un texte du monde)
    const petits = OrvaneMemoire.REGLES.traque.petits, peut = b.corps >= .95 ? 'un joueur est une proie à sa taille' : b.corps > petits + .01 ? `un joueur est presque une proie à sa taille : sa traque plafonne à ${dec(b.corps)}`
      : b.corps > 0 ? `mange de la chair, mais un joueur n’est pas à sa taille : sa traque plafonne à ${dec(b.corps)}` : 'ne mange pas de chair : elle ne traquera jamais';
    const tuiles = h('div', { class: 'tuiles' }, S.DISPOSITIONS.map(D => h('div', { class: 'tuile' },
      h('p', { class: 'tuile-nom' }, D.nom), h('p', { class: 'tuile-valeur' }, dec(d[D.id])), h('p', { class: 'tuile-dit' }, `${D.dit} · seuil ${dec(D.seuil())}`), courbe(b, D))));
    const L = S.lisiere(t.plan, d, false), L0 = S.lisiere(t.plan, d0, false), phrases = [];
    const front = Math.round(((b.parts.agressive || 0) + (b.parts.defensive || 0) + (b.parts.exigeante || 0)) * 100);
    if (b.role === 'proie') { phrases.push(L.front ? `Elle ne s’enfuit plus : à ${L.fuite} pixels elle s’arrête, fait face et gronde ; à ${L.portee}, elle charge, ${dec(L.chargeFront).replace(/,?0+$/, '')} secondes.` : `Elle s’enfuit quand la veilleuse approche à moins de ${L.fuite} pixels${L.fuite !== L0.fuite ? ` (${L0.fuite} au départ)` : ''}.`);
      if (!L.front && front >= 1) phrases.push(`Mais sur cent bêtes, ${front} font front quand même.`); if (L.tient) phrases.push('Trop petite pour charger, elle tient sa place et menace.'); }
    else { phrases.push(`La torche la tient à ${L.torche} pixels${L.torche !== L0.torche ? ` (${L0.torche} au départ)` : ''}${L.passeTorche ? ', et elle est assez hardie pour la franchir, en s’annonçant' : ''}.`);
      phrases.push(L.suit > 0 ? `De jour, elle suit la veilleuse de loin ${Math.round(L.suit * 100)} % du temps, et charge ${dec(L.charge).replace(/,?0+$/, '')} secondes.` : 'De jour, elle ne suit pas la veilleuse.');
      phrases.push(`Aucun feu vivant ne la laisse entrer : elle se tient à ${Math.round(L.feu * 100)} % de son rayon.`);
      if (L.agressivite >= .05) phrases.push(`Frappée, elle lâche prise ${Math.round(L.lache * 100)} fois sur cent (${Math.round(L0.lache * 100)} au départ)${front >= 1 ? ` ; sur cent bêtes, ${front} font front` : ''}.`); }
    const retenu = b.retenu, declare = b.declare || {}, noms = { rencontres: 'rencontre', prises: 'prelevement', blessures: 'blessure', effarouchements: 'effarouchement', nourrissages: 'nourrissage', pillages: 'pillage', attaques: 'attaque', tombes: 'joueur_tombe' };
    const lignesT = Object.entries(noms).filter(([k, a]) => (declare[a] || 0) > 0 || (retenu?.[k] || 0) > 0).map(([k, a]) => h('tr', null, h('th', { scope: 'row' }, S.ACTIONS[a]), h('td', null, nb(declare[a] || 0)), h('td', null, (+(retenu?.[k] || 0)).toLocaleString('fr-FR', { maximumFractionDigits: 1 }))));
    return h('article', { class: 'bete' },
      h('header', { class: 'bete-tete' }, dessin,
        h('div', null, h('h3', null, nomDe(t)), h('p', { class: 'infos' }, `${pluriel(b.effectif, 'bête', 'bêtes')} ici · ${masse(t.plan.masse_kg || 0)} · ${REGIME[t.plan.regime] || t.plan.regime} · ${peut}`)),
        h('div', { class: 'cote' }, h('p', { class: 'attitude' + (d.attitude ? ' ' + d.attitude : ' neutre') }, d.attitude ? ATTITUDES[d.attitude] : 'rien de marqué'),
          h('button', { type: 'button', class: 'retirer', 'aria-label': `Ne plus suivre ${nomDe(t)}`, on: { click: () => { S.lacher(sim, t.id, b.biome); choixBetes(); tout(); } } }, 'Retirer'))),
      h('div', { class: 'portrait' }, caractere(b), parts(b)),
      tuiles,
      h('p', { class: 'jeu' }, h('b', null, 'Dans Lisière, aujourd’hui : '), phrases.join(' ')),
      h('details', null, h('summary', null, 'Ce que les joueurs ont déclaré cette nuit, et ce que le tampon en a retenu'),
        lignesT.length ? h('table', null, h('thead', null, h('tr', null, h('th', { scope: 'col' }, ''), h('th', { scope: 'col' }, 'déclaré'), h('th', { scope: 'col' }, 'retenu'))), h('tbody', null, lignesT)) : h('p', { class: 'vide' }, sim.nuit ? 'Personne n’a rien déclaré pour cette bête.' : 'Aucune nuit n’est encore passée.')),
      h('details', null, h('summary', null, 'Les valeurs, nuit par nuit'),
        h('div', { class: 'defile' }, h('table', null, h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'nuit'), S.DISPOSITIONS.map(D => h('th', { scope: 'col' }, D.nom.toLowerCase())), h('th', { scope: 'col' }, 'attitude'))),
          h('tbody', null, b.histoire.map(p => h('tr', null, h('th', { scope: 'row' }, String(p.nuit)), S.DISPOSITIONS.map(D => h('td', null, dec(p[D.id]))), h('td', null, p.attitude ? ATTITUDES[p.attitude] : '—'))))))));
  }

  function tout() {
    $('nuit').textContent = sim.nuit ? `Nuit ${sim.nuit}` : 'Avant la première nuit';
    const B = [...sim.betes.values()]; $('betes').replaceChildren(...(B.length ? B.map(carte) : [h('p', { class: 'vide' }, 'Aucune bête suivie. Ajoutez-en une ci-dessus.')]));
    const J = sim.journal.slice().reverse(); $('journal').replaceChildren(...(J.length ? J.map(j => h('li', null, h('b', null, `Nuit ${j.nuit} · ${j.nom} : `), j.detail)) : [h('li', { class: 'vide' }, 'Rien encore. Le journal note chaque bascule : une population qui devient traqueuse, agressive, quémandeuse, méfiante, ou qui ne craint plus le feu.')]));
    for (const id of ['une', 'dix', 'recommencer']) $(id).disabled = !sim.betes.size && id !== 'recommencer';
  }
  function passer(n) { for (let k = 0; k < n; k++) S.nuit(sim, actifs()); tout(); $('nuit').focus({ preventScroll: true }); }

  $('lieu').addEventListener('change', e => ouvrir(e.target.value));
  $('bete').addEventListener('change', e => { if (!e.target.value) return; S.suivre(sim, e.target.value, lieu); choixBetes(); tout(); });
  $('une').addEventListener('click', () => passer(1)); $('dix').addEventListener('click', () => passer(10));
  $('recommencer').addEventListener('click', () => { S.recommencer(sim); tout(); });

  (async () => {
    joueurs();
    try {
      const idx = await (await fetch(MONDE + 'morceaux/index.json', { cache: 'no-cache' })).json(), prefere = ['foret', 'prairie', 'lande', 'marais', 'taiga'];
      const L = idx.biomes.filter(b => idx.taxons.some(t => (t.biomes || []).includes(b.id))).sort((a, b) => (prefere.indexOf(a.id) + 1 || 99) - (prefere.indexOf(b.id) + 1 || 99) || String(a.nom || a.id).localeCompare(String(b.nom || b.id), 'fr'));
      $('lieu').replaceChildren(...L.map(b => h('option', { value: b.id }, b.nom || b.id)));
      await ouvrir(L[0].id);
    } catch (e) { $('etat-monde').textContent = 'Le monde ne se lit pas (' + (e.message || e) + '). Rechargez la page dans un moment.'; }
  })();
})();
