// Orvane — L'ENCLOS (simulation/enclos.js)
// La page du compagnon (simulation/compagnon.js) : la bête qu'on élève, dans son enclos, avec ses jauges et ce qu'on fait pour
// elle ; l'adopter (une bête de la scène, un œuf ou un petit du biome, une bête de la ménagerie) ; lui trouver un partenaire parmi
// les bêtes sauvages de sa lignée et élever ses petits ; la rendre au monde, avec ses gènes (docs/36) ; se souvenir de ceux qui
// sont partis. Il vit à part du monde : il se garde dans le navigateur (localStorage) et survit à un monde qu'on recommence.
//   const enclos = OrvaneEnclos.creer(hote)   // hote : ce que la simulation lui prête (la vue, la scène, noter un geste…)
//   enclos.tick()                            // chaque seconde : le temps qui passe, les alertes, la petite fenêtre sur la scène
//   enclos.rendre(element)                   // l'onglet Compagnon
'use strict';
(function (racine) {
const Cp = racine.OrvaneCompagnon, V = racine.OrvaneVivant, Individus = racine.OrvaneIndividus, Orvane = racine.Orvane;
const ESC = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fx = (v, d = 1) => (+v).toLocaleString('fr-FR', { maximumFractionDigits: d });
const CLE = 'orvane-compagnon', HEURE = 36e5;
const JAUGES = [['faim', 'Satiété', '🍽'], ['energie', 'Énergie', '⚡'], ['humeur', 'Humeur', '☺'], ['proprete', 'Propreté', '✧'], ['sante', 'Santé', '✚'], ['confiance', 'Confiance', '♥']];
const ACTIONS = [['nourrir', 'Nourrir'], ['jouer', 'Jouer'], ['caresser', 'Caresser'], ['nettoyer', 'Nettoyer'], ['soigner', 'Soigner'], ['dormir', 'Coucher'], ['dresser', 'Dresser']];
const AUTRES = ['feuilles', 'fruits', 'graines', 'insectes', 'viande'];
const duree = h => { const m = Math.max(0, Math.round(h * 60)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${fx(m / 1440, 1)} j`; };
const dateCourte = t => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function creer(hote) {
  let D = (() => { try { const j = JSON.parse(localStorage.getItem(CLE) || 'null'); if (j?.C) j.C = Cp.charger(j.C); return j || { C: null, souvenirs: [] }; } catch (e) { return { C: null, souvenirs: [] }; } })();
  let el = null, ouvertRepas = false, sig = '', derniereGarde = 0, choixPetit = null, couve = 0;
  const garder = () => { try { localStorage.setItem(CLE, JSON.stringify(D)); } catch (e) { } derniereGarde = Date.now(); };
  const C = () => D.C;
  // ce que le monde lui fait : le confort de son habitat (Orvane.convenance, à la saison), l'épidémie de sa lignée là où il vit
  function contexte(c, absent) {
    const vue = hote.vue(); if (!vue) return { confort: 1, absent };
    const b = vue.biomes.find(x => x.id === c.biome), t = vue.taxons.find(x => x.id === c.taxon), p = t?.populations.find(q => q.biome === c.biome);
    let confort = 1; try { if (b && Orvane?.convenance && c.plan.niche) confort = Orvane.convenance(c.plan, b.axes_saison ? { ...b, axes: b.axes_saison } : b); } catch (e) { }
    return { confort, epidemie: p?.maladie?.virulence || 0, absent };
  }
  // à la réouverture : le temps passé pendant l'absence
  function rattraper() {
    const c = C(); if (!c || c.mort) return; const h = (Date.now() - c.dernier) / HEURE; if (h < .02) return;
    const ev = Cp.avancer(c, Date.now(), contexte(c, true)); garder();
    if (h > .2) hote.toast(`Pendant votre absence (${duree(h)}), ${c.nom} ${c.mort ? 's’est éteint' : c.oeuf ? 'a été couvé' : `a vécu : ${Cp.lire(c).humeur}`}${Cp.REGLES.doux && !c.mort ? ' (quelqu’un veillait)' : ''}.`);
    for (const e of ev) if (['mort', 'naissance'].includes(e.type)) hote.journal({ type: 'compagnon', importance: 2, titre: 'Votre compagnon', texte: e.texte, source: 'joueur' });
  }
  function tick() {
    const c = C(); if (c && !c.mort) {
      const ev = Cp.avancer(c, Date.now(), contexte(c, document.hidden));
      for (const e of ev) { if (e.type === 'alerte' || e.type === 'mort' || e.type === 'naissance' || e.type === 'maladie' || e.type === 'age') hote.toast(e.texte, e.type === 'mort' ? 'erreur' : '');
        if (['mort', 'naissance', 'age', 'maladie'].includes(e.type)) hote.journal({ type: 'compagnon', importance: e.type === 'mort' ? 3 : 2, titre: 'Votre compagnon', texte: e.texte, source: 'joueur' }); }
      if (c.mort) enterrer(c.mort.cause);
      if (Date.now() - derniereGarde > 15000) garder();
    }
    mini(); if (el && hote.ongletActif()) { const s = signature(); if (s !== sig) rendre(el); else maj(); }
  }
  const signature = () => { const c = C(); return c ? [c.mort ? 'm' : '', c.oeuf ? 'o' : '', Cp.stadeDe(c), c.biome, c.dort ? 'd' : '', c.malade ? 'x' : '', c.crottes, c.tours.length + c.savoirs.length, c.nom, ouvertRepas, !!choixPetit].join('|') : 'vide|' + D.souvenirs.length + (choixPetit ? 'p' : ''); };
  // la fin d'un compagnon : il rejoint les souvenirs
  function enterrer(cause, vivant) {
    const c = C(); if (!c) return;
    D.souvenirs.unshift({ nom: c.nom, espece: c.espece, taxon: c.taxon, sexe: c.ind.sexe, ne: c.ne, fin: c.mort?.t ?? c.temps, cause, age: c.mort?.age ?? c.age, enfants: c.enfants, generation: c.generation, corps: c.plan.corps, traits: c.traits, vivant: !!vivant, tours: c.tours.length + c.savoirs.length });
    if (D.souvenirs.length > 40) D.souvenirs.length = 40;
    D.C = vivant ? null : c; garder();
  }
  // adopter
  function adopter(ind, taxon, opt = {}) {
    if (C() && !C().mort) { hote.toast(`Vous élevez déjà ${C().nom}. Rendez-${C().ind.sexe === 'f' ? 'la' : 'le'} au monde, ou attendez, avant d’en adopter un autre.`, 'erreur'); return false; }
    if (C()?.mort) D.C = null;
    D.C = Cp.adopter(ind, taxon, { biome: opt.biome || hote.biome(), cat: hote.vue()?.catalogue?.traits, maintenant: Date.now(), ...opt }); garder();
    hote.journal({ type: 'compagnon', importance: 2, titre: 'Un compagnon', texte: `Vous adoptez ${D.C.oeuf ? 'un œuf de ' + D.C.espece : D.C.nom + ', ' + D.C.espece}.`, source: 'joueur' });
    hote.ouvrir(); return true;
  }
  function adopterBete(a) {
    const age = clamp(a.age, 0, a.esp.longevite * .7);
    if (!adopter(a.ind, a.esp.t, { age, biome: hote.biome(), traits: a.traits })) return;
    hote.noter({ taxon: a.esp.id, biome: hote.biome(), action: 'capture', n: 1, q: a.ind.z, age: V.ageDe(a), ...(V.phenotypeDe(a) ? { phenotype: V.phenotypeDe(a) } : {}) }, a);
    V.retirer(hote.scene(), a, 'capture');
  }
  function adopterDuBiome(tid) {
    const vue = hote.vue(), t = vue.taxons.find(x => x.id === tid), b = hote.biome(); if (!t) return;
    const ind = Individus.tirer(vue, tid, b, { r: Math.random }), oeuf = t.plan.reproduction === 'ovipare';
    if (!adopter(ind, t, { oeuf, petit: !oeuf, biome: b })) return;
    hote.noter({ taxon: tid, biome: b, action: 'capture', n: 1, age: oeuf ? 'oeuf' : 'jeune' }, null, hote.scene().W / 2, hote.scene().H * .6);
  }
  // les petits : un partenaire sauvage de sa lignée, sur la scène
  function partenaires() {
    const c = C(), sc = hote.scene(); if (!c || !sc || hote.biome() === undefined) return [];
    return sc.agents.filter(a => !a.mort && a.esp.id === c.taxon && a.age >= a.esp.maturite && a.ind.sexe && a.ind.sexe !== c.ind.sexe).slice(0, 6);
  }
  function accoupler(a) {
    const c = C(), L = Cp.lire(c); if (!L.peutAvoirDesPetits || c.dort) { hote.toast(`${c.nom} n’est pas prêt${c.ind.sexe === 'f' ? 'e' : ''} : il faut un adulte en bonne santé, éveillé, qui vous fasse confiance.`, 'erreur'); return; }
    const attente = Cp.REGLES.heures_par_cycle * HEURE - (c.temps - (c.repro || -1e15)); if (attente > 0) { hote.toast(`${c.nom} a déjà eu des petits : encore ${duree(attente / HEURE / Cp.REGLES.vitesse)}.`, 'erreur'); return; }
    const vue = hote.vue(), mere = c.ind.sexe === 'f' ? c.ind : a.ind, pere = c.ind.sexe === 'f' ? a.ind : c.ind;
    const r = Individus.croiser(mere, pere, vue, { r: Math.random, biome: c.biome });
    if (!r.ok) { hote.toast(r.raison === 'pas-de-petit' ? 'Pas de petit cette fois : les deux lignées sont un peu éloignées.' : `Pas de petit (${r.raison}).`); return; }
    c.repro = c.temps; c.humeur = clamp(c.humeur + 15, 0, 100);
    const t = vue.taxons.find(x => x.id === c.taxon) || { id: c.taxon, nom: c.espece, plan: c.plan };
    choixPetit = Cp.naissance(c, r.petit, t, { biome: c.biome }); choixPetit.ind.biome = c.biome; garder(); if (el) rendre(el);
  }
  function garderPetit(elever) {
    const p = choixPetit, c = C(); if (!p) return; choixPetit = null;
    if (elever) { hote.menagerie(c.ind, c.espece, c.traits); enterrer('confié à votre ménagerie', true); D.C = p; hote.toast(`Vous élevez ${p.oeuf ? 'l’œuf de ' + c.nom : p.nom}. ${c.nom} attend dans votre ménagerie.`); }
    else { hote.relacher(p.ind); hote.toast(`${p.nom} rejoint le monde, avec les gènes de ${c.nom}.`); }
    garder(); if (el) rendre(el);
  }
  function rendreAuMonde() {
    const c = C(); if (!c || c.mort || c.oeuf) return;
    if (!confirm(`Rendre ${c.nom} au monde ? Elle rejoindra sa lignée dans ce biome, avec ses gènes.`.replace('Elle', c.ind.sexe === 'f' ? 'Elle' : 'Il'))) return;
    hote.relacher(c.ind); c.mort = null; enterrer('rendu au monde', true); hote.toast(`${c.nom} retourne au monde.`); if (el) rendre(el);
  }
  function geste(action, arg) {
    const c = C(); if (!c) return; Cp.avancer(c, Date.now(), contexte(c));
    const r = Cp.agir(c, action, arg, Date.now()); garder();
    if (r.texte) hote.toast(r.texte, r.ok ? '' : 'refus');
    if (action === 'nourrir' && r.ok) ouvertRepas = false;
    effet(r.effet, arg); if (el) { const s = signature(); if (s !== sig) rendre(el); else maj(); }
  }
  function effet(type, arg) {
    const z = el?.querySelector('.cp-effets'); if (!z || !type) return;
    const s = { miam: Cp.ALIMENTS[arg]?.[1] || '🍽', joie: '✦ ✦', coeur: '♥', propre: '✧', soin: '✚', refus: '…', mefiance: '?', etude: '✎', sommeil: 'z', chaleur: '♨' }[type] || '';
    const b = document.createElement('span'); b.className = 'cp-bulle ' + type; b.textContent = s; z.appendChild(b); setTimeout(() => b.remove(), 1800);
    const bete = el.querySelector('.cp-corps'); if (bete && (type === 'joie' || type === 'coeur' || type === 'miam')) { bete.classList.remove('saute'); void bete.offsetWidth; bete.classList.add('saute'); }
  }

  // === dessiner ===
  function decor(c) {
    const vue = hote.vue(), b = vue?.biomes.find(x => x.id === c.biome); const K = b && V.couleursDe ? V.couleursDe(b) : { sol: [128, 152, 86], ciel: [150, 190, 220], eau: [40, 100, 120] };
    const eau = b && (b.milieu === 'marin' || b.milieu === 'aquatique'), grotte = b?.milieu === 'souterrain';
    return `--sol:rgb(${K.sol.join(',')});--ciel:rgb(${K.ciel.join(',')});--eau:rgb(${K.eau.join(',')})" data-milieu="${eau ? 'eau' : grotte ? 'grotte' : b?.milieu === 'amphibie' ? 'rive' : 'terre'}`;
  }
  const portrait = (c, cls = '') => c.plan.corps ? V.croquis(c.plan.corps, c.traits) : c.plan.regime === 'synthetique' ? V.machine(c.plan) : '';
  function rendre(e) {
    el = e; const c = C(); sig = signature();
    if (!c || (c.mort && !choixPetit)) { e.innerHTML = vide(c) + souvenirs(); brancherVide(); return; }
    const L = Cp.lire(c), st = L.stade, f = c.ind.sexe === 'f', il = f ? 'Elle' : 'Il', ae = f ? 'e' : '', w = Math.round(clamp(250 + 22 * Math.log10(Math.max(1e-4, c.plan.masse_kg || 1)), 200, 300) * L.taille)   /* (c'est votre bête : grande à l'écran, même un insecte) */, vit = clamp(14 / Math.sqrt(Math.max(.5, (hote.vue()?.taxons.find(t => t.id === c.taxon)?.plan.vitesse_rel) || 4)), 5, 18);
    const vue = hote.vue(), tx = vue?.taxons.find(t => t.id === c.taxon), eff = tx ? tx.populations.reduce((s, p) => s + p.effectif, 0) : 0, cat = vue?.catalogue?.traits || {};
    const caches = Individus.caches(c.ind, cat), z = c.ind.z || {}, conf = contexte(c).confort, menu = Object.entries(L.menu).sort((a, b) => b[1] - a[1]);
    const autres = c.plan.regime === 'synthetique' ? [] : AUTRES.filter(k => !L.menu[k]).slice(0, 3), P = partenaires();
    const crottes = Array.from({ length: c.crottes }, (_, i) => `<button class="crotte" data-crotte style="left:${8 + (i * 37 + 13) % 80}%;bottom:${6 + (i * 17) % 14}%" aria-label="Ramasser"></button>`).join('');
    e.innerHTML = `${choixPetit ? `<section class="bloc cp-naissance"><h3>${choixPetit.oeuf ? 'Un œuf !' : 'Un petit !'}</h3><div class="cp-petit">${portrait(choixPetit)}<p><b>${ESC(choixPetit.nom)}</b> ${choixPetit.ind.sexe === 'f' ? '♀' : '♂'}, génération ${choixPetit.generation}${choixPetit.ind.F ? ` · consanguinité ${fx(choixPetit.ind.F, 3)}` : ''}${choixPetit.ind.hybride ? ' · hybride' : ''}<br><small>${ESC(Individus.montre(choixPetit.ind, cat).join(', ') || 'aucun trait visible')}${Individus.caches(choixPetit.ind, cat).length ? ' · porte : ' + ESC(Individus.caches(choixPetit.ind, cat).join(', ')) : ''}</small></p></div>
      <div class="actions"><button data-petit="1" class="principal">L’élever (${ESC(c.nom)} ira dans la ménagerie)</button><button data-petit="0">Le rendre au monde</button></div></section>` : ''}
    <section class="bloc cp">
      <div class="enclos${c.dort ? ' nuit-dort' : ''}${c.malade ? ' malade' : ''}${c.oeuf ? ' oeuf' : ''}" style="${decor(c)}">
        <div class="cp-ciel"></div><div class="cp-sol"></div><div class="cp-ombre-nuit"></div>
        <div class="cp-crottes">${crottes}</div>
        <div class="cp-marche${c.dort || c.oeuf ? ' arret' : ''}" style="--duree:${fx(vit, 1).replace(',', '.')}s;--w:${c.oeuf ? 60 : w}px">
          <div class="cp-tourne"><div class="cp-corps${st === 'vieux' ? ' vieux' : ''}" style="width:${w}px">${c.oeuf ? `<button class="cp-oeuf" data-couver aria-label="Couver l’œuf" style="--p:${c.incube}"></button>` : portrait(c)}</div></div>
          <div class="cp-effets">${c.dort ? '<span class="cp-zzz">z z z</span>' : ''}</div>
        </div>
      </div>
      <div class="cp-tete"><label class="cache-visuel" for="cpNom">Son nom</label><input id="cpNom" class="cp-nom" value="${ESC(c.nom)}" maxlength="30"><span class="sexe">${c.ind.sexe === 'f' ? '♀' : '♂'}</span><b class="cp-humeur" id="cpHumeur">${ESC(L.humeur)}</b></div>
      <p class="note" id="cpAge"></p>
      <div class="cp-jauges">${JAUGES.map(([k, n, i]) => `<div class="cp-jauge" data-j="${k}"><span>${i} ${n}</span><span class="cp-barre"><i></i></span><b></b></div>`).join('')}</div>
      ${c.oeuf ? `<p class="note">Touchez l’œuf pour le couver : il éclot plus vite au chaud.</p>` : `<div class="cp-actions">${ACTIONS.map(([k, n]) => `<button data-cp="${k}"${k === 'nourrir' && ouvertRepas ? ' aria-pressed="true"' : ''}>${k === 'dormir' && c.dort ? 'Réveiller' : n}</button>`).join('')}</div>
      <div class="cp-repas"${ouvertRepas ? '' : ' hidden'}>${menu.map(([k, v]) => `<button data-repas="${k}">${Cp.ALIMENTS[k]?.[1] || ''} ${ESC(Cp.ALIMENTS[k]?.[0] || k)}<small>${'★'.repeat(Math.max(1, Math.round(v / menu[0][1] * 3)))}</small></button>`).join('')}${autres.map(k => `<button data-repas="${k}" class="sourd">${Cp.ALIMENTS[k][1]} ${ESC(Cp.ALIMENTS[k][0])}</button>`).join('')}</div>`}
    </section>
    <section class="bloc"><h3>Sa fiche</h3><div class="carte-tete">${portrait(c)}<div><p class="sous"><b>${ESC(c.espece)}</b> · ${ESC(c.plan.regime)} · ${fx(c.plan.masse_kg, 3)} kg adulte</p>
      <p class="sous">${c.origine === 'eleve' ? `né${ae} chez vous` : c.origine === 'oeuf' ? `pris${ae} dans son œuf` : `adopté${ae} dans la nature`} le ${dateCourte(c.ne)} · génération ${c.generation}${c.ind.F ? ` · consanguinité ${fx(c.ind.F, 3)} (vigueur ${fx(c.ind.vigueur, 2)})` : ''}${c.enfants ? ` · ${c.enfants} petit${c.enfants > 1 ? 's' : ''}` : ''}</p></div></div>
      <div class="zs">${[['taille', 'Taille'], ['vitesse', 'Vitesse'], ['audace', 'Audace'], ['sociabilite', 'Sociabilité']].map(([k, n]) => { const v = clamp(z[k] ?? 0, -3, 3); return `<div class="z"><span>${n}</span><span class="zb"><i style="left:${50 + Math.min(0, v) / 3 * 50}%;width:${Math.abs(v) / 3 * 50}%" class="${v >= 0 ? 'plus' : 'moins'}"></i></span><b>${v >= 0 ? '+' : '−'}${fx(Math.abs(v), 2)}</b></div>`; }).join('')}</div>
      <p class="puces">${c.traits.map(t => `<span class="puce" title="${ESC(cat[t]?.effet || '')}">${ESC(t)}</span>`).join('') || '<span class="sourd">aucun trait visible</span>'}${caches.length ? ` <span class="sourd">porte sans montrer :</span> ${caches.map(t => `<span class="puce cache">${ESC(t)}</span>`).join('')}` : ''}</p>
      <p class="note">${il} mange ${menu.map(([k]) => Cp.ALIMENTS[k]?.[0] || k).join(', ')} · ${ESC(c.plan.activite)}, ${il.toLowerCase()} dort ${heuresSommeil(c)} · une petite bête a faim plus vite (métabolisme ×${fx(L.metabolisme, 2)})${c.tours.length || c.savoirs.length ? ` · sait : ${[...c.savoirs.map(k => racine.OrvaneEsprit?.SAVOIRS?.[k]?.nom || k), ...c.tours.map(k => Cp.TOURS.find(x => x[0] === k)?.[1] || k)].map(ESC).join(', ')}` : ''}${c.dressage ? ` · leçon en cours : ${Math.round(c.dressage)} %` : ''}</p>
      <div class="rang"><label class="petit" for="cpHabitat">Son habitat</label><select id="cpHabitat">${(vue?.biomes || []).map(b => `<option value="${ESC(b.id)}"${b.id === c.biome ? ' selected' : ''}>${ESC(b.nom || b.id)}</option>`).join('')}</select><b class="${conf > .6 ? 'vif' : conf < .3 ? 'declin' : ''}">confort ${Math.round(conf * 100)} %</b></div>
      <p class="note">Le confort, c’est sa niche contre les axes du lieu, à la saison (Orvane.convenance). ${conf < .3 ? '<b class="declin">Ce lieu ne lui va pas : sa santé en souffre.</b>' : ''}${tx ? ` Sa lignée dans le monde : ${eff.toLocaleString('fr-FR')} bêtes${tx.populations.find(p => p.biome === c.biome)?.maladie ? ', <b class="declin">une épidémie frappe sa lignée ici</b>' : ''}.` : ' <b class="declin">Sa lignée s’est éteinte dans le monde : vous élevez l’un des derniers.</b>'}</p></section>
    ${c.oeuf ? '' : `<section class="bloc"><h3>Avoir des petits</h3>${L.peutAvoirDesPetits ? (P.length ? `<p class="note">Des bêtes sauvages de sa lignée, sur la scène (${ESC(hote.nomBiome(hote.biome()))}). Le petit tient de ses deux parents, par Mendel (docs/35, 36).</p><ul class="menagerie">${P.map((a, i) => `<li>${a.img ? portraitAgent(a) : ''}<span><b>${ESC(a.ind.nom)}</b> ${a.ind.sexe === 'f' ? '♀' : '♂'}<small>taille ${sgn(a.ind.z?.taille)} · vitesse ${sgn(a.ind.z?.vitesse)} · audace ${sgn(a.ind.z?.audace)}${a.traits.length ? ' · ' + ESC(a.traits.join(', ')) : ''}</small></span><button data-partenaire="${i}">Les réunir</button></li>`).join('')}</ul>`
      : `<p class="note">Aucune bête de sa lignée, du bon sexe et adulte, sur la scène. Allez dans un biome où vit sa lignée${tx ? ` (${tx.populations.slice().sort((a, b) => b.effectif - a.effectif).slice(0, 3).map(p => `<button class="lien" data-aller="${ESC(p.biome)}">${ESC(hote.nomBiome(p.biome))}</button>`).join(', ')})` : ''}.</p>`)
      : `<p class="note">Il faut un adulte en bonne santé, qui vous fasse confiance (50 au moins)${st === 'jeune' ? ` : ${c.nom} sera adulte dans ${duree(L.adulteDans)}` : ''}.</p>`}</section>`}
    <section class="bloc"><details class="gestes"><summary>Son journal</summary><ol class="journal">${c.journal.slice(0, 30).map(j => `<li class="${j.type === 'refus' ? 'imp1' : j.type === 'mort' || j.type === 'naissance' ? 'imp3' : ''}"><span class="jn">${new Date(j.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span><div><p>${ESC(j.texte)}</p></div></li>`).join('')}</ol></details>
      <div class="actions">${c.oeuf || c.mort ? '' : `<button data-cp-monde class="danger">${f ? 'La' : 'Le'} rendre au monde</button>`}</div>
      <p class="note">Le temps du compagnon : ${Cp.REGLES.vitesse === 1 ? 'le temps réel' : `×${fx(Cp.REGLES.vitesse)}`}, un cycle de vie dure ${fx(Cp.REGLES.heures_par_cycle)} h${Cp.REGLES.doux ? ', et quelqu’un veille pendant votre absence' : ', et personne ne veille pendant votre absence'}. <button class="lien" data-reglages>Régler</button></p></section>
    ${souvenirs()}`;
    brancher(); maj();
  }
  const sgn = v => (v >= 0 ? '+' : '−') + fx(Math.abs(v || 0), 1);
  const portraitAgent = a => a.esp.plan.corps ? V.croquis(a.esp.plan.corps, a.traits) : '';
  function heuresSommeil(c) { const plages = []; let debut = null; for (let q = 0; q <= 96; q++) { const h = (q % 96) / 4, d = q < 96 && Cp.dortA(c.plan.activite, h); if (d && debut == null) debut = h; if (!d && debut != null) { plages.push([debut, h]); debut = null; } }
    const f = h => `${Math.floor(h)}h${h % 1 ? String(Math.round(h % 1 * 60)).padStart(2, '0') : ''}`; return plages.length ? plages.map(([a, b]) => `de ${f(a)} à ${f(b)}`).join(' et ') : 'peu'; }
  function maj() {
    const c = C(); if (!c || !el) return; const L = Cp.lire(c);
    for (const [k] of JAUGES) { const j = el.querySelector(`[data-j="${k}"]`); if (!j) continue; const v = clamp(L.besoins[k], 0, 100); j.querySelector('i').style.width = v + '%'; j.querySelector('i').className = v < 25 ? 'bas' : v < 50 ? 'moyen' : 'haut'; j.querySelector('b').textContent = Math.round(v); j.classList.toggle('reclame', L.reclame && ({ nourrir: 'faim', nettoyer: 'proprete', soigner: 'sante', dormir: 'energie', jouer: 'humeur' })[L.reclame] === k); }
    const h = el.querySelector('#cpHumeur'); if (h) h.textContent = L.humeur;
    const a = el.querySelector('#cpAge'); if (a) a.textContent = c.oeuf ? `Un œuf, couvé à ${Math.round(c.incube * 100)} % : il éclot dans ${duree((1 - c.incube) * Cp.REGLES.heures_par_cycle * Cp.REGLES.incubation / Cp.REGLES.vitesse)}.` : `${ESC(c.espece)} · ${L.stade} · ${fx(c.age, 2)} cycle${c.age >= 2 ? 's' : ''} de vie${L.stade === 'jeune' ? `, adulte dans ${duree(L.adulteDans)}` : ''}${L.reclame ? ` · réclame : ${({ nourrir: 'à manger', nettoyer: 'un enclos propre', soigner: 'des soins', dormir: 'du repos', jouer: 'de l’attention' })[L.reclame]}` : ''}`;
    const nuit = el.querySelector('.cp-ombre-nuit'); if (nuit) { const hh = new Date(c.temps).getHours() + new Date(c.temps).getMinutes() / 60, Lm = clamp(.5 + .62 * Math.sin(2 * Math.PI * (hh / 24 - .25)), 0, 1); nuit.style.opacity = ((1 - Lm) * .6).toFixed(2); }
    const o = el.querySelector('.cp-oeuf'); if (o) o.style.setProperty('--p', c.incube);
  }
  function brancher() {
    el.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const k = b.dataset.cp; if (k === 'nourrir') { ouvertRepas = !ouvertRepas; rendre(el); return; } geste(k === 'dormir' && C().dort ? 'reveiller' : k); });
    el.querySelectorAll('[data-repas]').forEach(b => b.onclick = () => geste('nourrir', b.dataset.repas));
    el.querySelectorAll('[data-crotte]').forEach(b => b.onclick = () => geste('nettoyer', 'une'));
    const ov = el.querySelector('[data-couver]'); if (ov) ov.onclick = () => { if (Date.now() - couve < 4000) { effet('chaleur'); return; } couve = Date.now(); geste('couver'); };
    const n = el.querySelector('#cpNom'); if (n) n.onchange = () => geste('renommer', n.value);
    const hb = el.querySelector('#cpHabitat'); if (hb) hb.onchange = () => { const c = C(); c.biome = hb.value; Cp.avancer(c, Date.now(), contexte(c)); garder(); rendre(el); };
    el.querySelectorAll('[data-partenaire]').forEach(b => b.onclick = () => { const a = partenaires()[+b.dataset.partenaire]; if (a) accoupler(a); });
    el.querySelectorAll('[data-petit]').forEach(b => b.onclick = () => garderPetit(b.dataset.petit === '1'));
    el.querySelectorAll('[data-aller]').forEach(b => b.onclick = () => hote.allerBiome(b.dataset.aller));
    const m = el.querySelector('[data-cp-monde]'); if (m) m.onclick = rendreAuMonde;
    const rg = el.querySelector('[data-reglages]'); if (rg) rg.onclick = () => hote.ouvrirReglages('compagnon');
    brancherSouvenirs();
  }
  function vide(c) {
    const sc = hote.scene(), E2 = sc ? [...sc.especes.values()].filter(e => !e.syn).sort((a, b) => b.pop.effectif - a.pop.effectif) : [];
    return `<section class="bloc">${c?.mort ? `<div class="cp-adieu">${portrait(c)}<p><b>${ESC(c.nom)}</b> s’est éteint${c.ind.sexe === 'f' ? 'e' : ''} : ${ESC(c.mort.cause)}, à ${fx(c.mort.age, 1)} cycles de vie.</p></div>` : ''}
      <h2>Un compagnon</h2><p class="note">Une bête d’Orvane à élever, en temps réel : nourrissez-la de ce que mange sa lignée, laissez-la dormir à ses heures, jouez avec elle, gardez son enclos propre, soignez-la. Elle vous fera confiance peu à peu, d’autant plus vite qu’elle est audacieuse ; elle apprendra ; adulte, elle aura des petits avec une bête sauvage de sa lignée.</p>
      <h3>Trois façons de l’adopter</h3>
      <p class="note"><b>Sur la scène</b> : touchez une bête (l’outil Observer), puis « Adopter » dans sa fiche.</p>
      <div class="rang"><label class="petit" for="cpEspece">Ou un œuf, un petit de ${ESC(hote.nomBiome(hote.biome()))}</label></div>
      <div class="rang"><select id="cpEspece">${E2.map(e => `<option value="${ESC(e.id)}">${ESC(e.nom)} (${e.ovipare ? 'un œuf' : 'un petit'})</option>`).join('')}</select><button id="cpPrendre" class="bouton-or">Le prendre</button></div>
      <p class="note"><b>Ou de votre ménagerie</b> : une bête capturée, onglet Biome, « Élever ».</p></section>`;
  }
  function brancherVide() { const b = el.querySelector('#cpPrendre'); if (b) b.onclick = () => adopterDuBiome(el.querySelector('#cpEspece').value); brancherSouvenirs(); }
  function souvenirs() { return D.souvenirs.length ? `<section class="bloc"><h3>Souvenirs <small>(${D.souvenirs.length})</small></h3><ul class="menagerie">${D.souvenirs.map(s => `<li>${s.corps ? V.croquis(s.corps, s.traits || []) : ''}<span><b>${ESC(s.nom)}</b> ${s.sexe === 'f' ? '♀' : '♂'}<small>${ESC(s.espece)} · ${fx(s.age, 1)} cycles de vie · ${ESC(s.cause)}${s.enfants ? ` · ${s.enfants} petit${s.enfants > 1 ? 's' : ''}` : ''}${s.generation ? ` · génération ${s.generation}` : ''}</small></span><small class="sourd">${dateCourte(s.fin)}</small></li>`).join('')}</ul></section>` : ''; }
  function brancherSouvenirs() { }
  // la petite fenêtre, sur la scène
  function mini() {
    const m = document.getElementById('mini'); if (!m) return; const c = C();
    if (!c || c.mort) { m.hidden = true; return; } const L = Cp.lire(c), pire = L.pire;
    const cle = [c.taxon, c.traits.join(','), c.oeuf, L.humeur, Math.round(pire[1] / 10), L.reclame, c.nom].join('|');
    m.hidden = false; if (m.dataset.cle === cle) return; m.dataset.cle = cle;
    m.innerHTML = `${c.oeuf ? '<span class="mini-oeuf"></span>' : portrait(c)}<span><b>${ESC(c.nom)}</b><small>${ESC(L.humeur)}</small></span>${L.reclame ? '<i class="mini-appel" aria-hidden="true">!</i>' : ''}`;
    m.title = `${c.nom} : ${L.humeur}${L.reclame ? ' — réclame votre attention' : ''}`; m.classList.toggle('appel', !!L.reclame);
  }
  rattraper();
  return { tick, rendre, adopterBete, adopter, etat: C, garder, rattraper };
}
racine.OrvaneEnclos = { creer };
})(globalThis);
