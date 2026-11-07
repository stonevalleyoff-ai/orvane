// Orvane — LA DÉMO (demo/demo.js) — un jeu minuscule branché sur le monde d'Orvane
// Il lit le monde par morceaux (tampon/morceaux.js : l'index, puis le seul lieu choisi), dessine ses bêtes (monde/silhouette.js),
// compte ce que fait le joueur et montre le lot qu'un jeu enverrait (docs/4). Rien n'est envoyé : c'est une démonstration.
// Seules les données publiées du monde sont montrées : rien n'est inventé.
(() => {
  'use strict';
  const MONDE = '../mondes/orvane/';
  const $ = id => document.getElementById(id);
  const REGIME = { herbivore: 'herbivore', omnivore: 'omnivore', carnivore: 'carnivore', filtreur: 'filtreur', detritivore: 'charognard', synthetique: 'machine' };
  const ACTIVITE = { diurne: 'de jour', nocturne: 'de nuit', crepusculaire: 'au crépuscule', continue: 'jour et nuit' };
  const nb = v => Math.round(v).toLocaleString('fr-FR');
  const masse = kg => kg >= 1 ? `${(+kg.toFixed(kg >= 10 ? 0 : 1)).toLocaleString('fr-FR')} kg` : `${Math.max(1, Math.round(kg * 1000)).toLocaleString('fr-FR')} g`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debut = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  let inst = null, lieu = null;
  const comptes = new Map();   // taxon|biome|action → n

  function lot() {
    const evenements = [...comptes].map(([k, n]) => { const [taxon, biome, action] = k.split('|'); return { taxon, biome, action, n }; });
    return { orvane: inst?.orvane || '1.0', monde: 'orvane', instantane: inst?.cycle?.n, familles: ['animale'],
      source: { jeu: 'demo', compte: 'h:joueur-de-la-demo' }, periode: { debut, fin: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, evenements };
  }
  function montrerLot() { $('lot').textContent = comptes.size ? JSON.stringify(lot(), null, 2) : 'Croisez ou chassez une bête.'; }
  function afficherCompte(taxon) {
    const c = document.querySelector(`[data-compte="${CSS.escape(taxon)}"]`); if (!c) return;
    const r = comptes.get(`${taxon}|${lieu}|rencontre`) || 0, p = comptes.get(`${taxon}|${lieu}|prelevement`) || 0;
    c.textContent = [r ? `${r} croisée${r > 1 ? 's' : ''}` : '', p ? `${p} chassée${p > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  }
  function compter(taxon, action) { const k = `${taxon}|${lieu}|${action}`; comptes.set(k, (comptes.get(k) || 0) + 1); montrerLot(); afficherCompte(taxon); }

  function carte(t, p) {
    const ph = (t.phenotypes || []).slice().sort((a, b) => (b.frequence_par_biome?.[lieu] ?? b.frequence ?? 0) - (a.frequence_par_biome?.[lieu] ?? a.frequence ?? 0))[0];
    const dessin = globalThis.OrvaneSilhouette ? OrvaneSilhouette.dessiner(t.plan.corps, t.plan, ph?.traits || []) : '';
    const g = p.groupe?.nom ? ` · vit ${p.groupe.nom}` : '', m = p.migration?.vers_nom ? ` · hiverne vers ${p.migration.vers_nom}` : '';
    const nom = t.nom_commun || t.nom || t.id;
    return `<article class="bete">${dessin}<h3>${esc(nom)}</h3>
      <p class="infos">${nb(p.effectif)} bêtes ici · ${esc(masse(t.plan.masse_kg || 0))} · ${esc(REGIME[t.plan.regime] || t.plan.regime)} · ${esc(ACTIVITE[t.plan.activite] || '')}${esc(g)}${esc(m)}</p>
      <p class="compte" data-compte="${esc(t.id)}"></p>
      <div class="gestes"><button type="button" data-geste="rencontre" data-taxon="${esc(t.id)}" aria-label="Croiser un ${esc(nom)}">Croiser</button>
      <button type="button" class="chasser" data-geste="prelevement" data-taxon="${esc(t.id)}" aria-label="Chasser un ${esc(nom)}">Chasser</button></div></article>`;
  }

  async function ouvrir(id) {
    lieu = id; $('betes').innerHTML = '<p class="vide">Lecture du lieu…</p>';
    try { inst = await OrvaneMorceaux.lire(MONDE, { biomes: [id] }); }
    catch (e) { $('betes').innerHTML = `<p class="vide">Le lieu ne se lit pas (${esc(e.message)}).</p>`; return; }
    const L = inst.taxons.filter(t => t.eteint == null && t.plan && t.plan.regime !== 'vegetal' && t.plan.regime !== 'synthetique')
      .map(t => [t, t.populations.find(p => p.biome === id)]).filter(([, p]) => p && p.effectif >= 1).sort((a, b) => b[1].effectif - a[1].effectif);
    const b = inst.biomes.find(x => x.id === id);
    $('etat-monde').textContent = `Le monde d’Orvane, cycle ${inst.cycle?.n ?? '?'}${inst.cycle?.saison?.nom ? ', ' + inst.cycle.saison.nom : ''} · ${b?.nom || id} : ${L.length} lignée${L.length > 1 ? 's' : ''} de bêtes, ${nb(L.reduce((s, [, p]) => s + p.effectif, 0))} bêtes`;
    $('betes').innerHTML = L.length ? L.slice(0, 12).map(([t, p]) => carte(t, p)).join('') : '<p class="vide">Aucune bête ici à ce cycle.</p>';
    for (const [t] of L.slice(0, 12)) afficherCompte(t.id);   // (ce qui a déjà été compté ici, si l'on y revient)
    montrerLot();
  }

  async function demarrer() {
    let index;
    try { const r = await fetch(MONDE + 'morceaux/index.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); index = await r.json(); }
    catch (e) { $('etat-monde').textContent = `Le monde ne se lit pas pour l’instant (${e.message}). L’Observatoire le montre aussi.`; return; }
    const vivants = new Map(); for (const t of index.taxons || []) if (t.famille === 'animale' && t.statut !== 'eteint') for (const bid of t.biomes || []) vivants.set(bid, (vivants.get(bid) || 0) + 1);
    const B = (index.biomes || []).filter(b => !vivants.size || vivants.get(b.id)).sort((a, b) => (a.nom || a.id).localeCompare(b.nom || b.id, 'fr'));
    $('lieu').innerHTML = B.map(b => `<option value="${esc(b.id)}">${esc(b.nom || b.id)}${vivants.get(b.id) ? ` — ${vivants.get(b.id)} lignées` : ''}</option>`).join('');
    const choix = new URLSearchParams(location.search).get('lieu'), premier = B.find(b => b.id === choix) || B.find(b => b.id === 'prairie') || B[0];
    if (!premier) { $('etat-monde').textContent = 'Le monde n’a pas de lieu publié.'; return; }
    $('lieu').value = premier.id; $('lieu').onchange = () => ouvrir($('lieu').value);
    await ouvrir(premier.id);
  }

  document.addEventListener('click', e => { const b = e.target.closest('[data-geste]'); if (b) compter(b.dataset.taxon, b.dataset.geste); });
  $('vider').onclick = () => { comptes.clear(); document.querySelectorAll('[data-compte]').forEach(c => { c.textContent = ''; }); montrerLot(); };
  $('copier').onclick = async () => { try { await navigator.clipboard.writeText($('lot').textContent); $('copier').textContent = 'Copié'; setTimeout(() => { $('copier').textContent = 'Copier le lot'; }, 1500); } catch (_) { } };
  demarrer();
})();
