// Orvane — LES BILANS DE SAISON, dans l'Observatoire (monde/bilans.js) — docs/4
// La vue « Bilans » : ce que chaque jeu a ôté et rendu à chaque population, saison par saison, et la part de l'effectif que cela
// représente. Les bilans sont publiés par le cycle de nuit (hebergement/cycle.js, tampon/bilan.js) dans mondes/<id>/bilans/ :
// index.json, en-cours.json (la saison en cours) et un fichier par saison finie (an-0-ete.json…). Un tableau par jeu, ses lignées
// par part de l'effectif ôtée, la plus forte d'abord ; ce que les plafonds ont raboté est dit, plafond par plafond.
// Chargé par monde/index.html avant son script : il se sert, au moment de dessiner, de ce que celui-ci définit ($, ESC, E, json…).
// htmlBilan(B, index, noms) ne touche à rien d'autre qu'ESC : un banc le lit tel quel (bancs/bilan.js).
'use strict';
const BILANS = { monde: null, index: null, cache: {}, choisi: null, voulu: null, erreur: null };
const RABOT_B = { activite: "l'activité d'un compte", compte: 'le plafond par compte', part_compte: "la part d'un compte", part_jeu: "la part d'un jeu",
  plafond_jeu: 'le plafond du jeu', population: "la part d'une population" };
const nbB = (x, d = 1) => x == null ? '—' : (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const pcB = x => x == null ? '—' : (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: x > 0 && x < .001 ? 3 : x < .1 ? 2 : 1 }) + ' %';
const saisonB = s => !s ? '' : s.nom ? `${s.nom === 'été' ? "L'été" : s.nom === 'automne' ? "L'automne" : s.nom === 'hiver' ? "L'hiver" : 'Le printemps'} de l'an ${s.an}` : `La tranche ${String(s.id).replace('tranche-', '')}`;
const rabotsB = r => Object.entries(r || {}).filter(([, v]) => v > 0).map(([k, v]) => `${RABOT_B[k] || k} : ${nbB(v)}`);

function vueBilans() {
  const Z = $('#contenu'), id = E.source?.id;
  if (!id || !E.source.publie) { Z.innerHTML = `<p class="atlas-kicker">BILANS DE SAISON</p><h2>Ce que les jeux font au monde</h2><p class="vide">Les bilans de saison portent sur un monde publié. Choisissez-en un en haut de la page.</p>`; return; }
  if (BILANS.monde !== id) Object.assign(BILANS, { monde: id, index: null, cache: {}, choisi: BILANS.voulu, erreur: null });
  const decl = E.mondes?.find(m => m.id === id)?.fichiers;
  if (Array.isArray(decl) && !decl.includes('bilans')) BILANS.erreur ??= 'non publié';
  if (!BILANS.index && !BILANS.erreur) { Z.innerHTML = '<p class="vide">Chargement des bilans…</p>'; chargerBilans(id); return; }
  const L = BILANS.index ? [...(BILANS.index.en_cours ? [BILANS.index.en_cours] : []), ...(BILANS.index.saisons || [])] : [];
  if (BILANS.erreur || !L.length) {
    Z.innerHTML = `<p class="atlas-kicker">BILANS DE SAISON</p><h2>Ce que les jeux font au monde</h2><p class="vide">Pas encore de bilan pour ce monde. Le cycle de nuit en publie un pour chaque saison, jeu par jeu : ce que chaque jeu a ôté et rendu à chaque population, et la part de l'effectif que cela représente (docs/4).</p>`; return; }
  const f = BILANS.choisi && L.some(x => x.fichier === BILANS.choisi) ? BILANS.choisi : L[0].fichier;
  if (!BILANS.cache[f]) { Z.innerHTML = '<p class="vide">Chargement du bilan…</p>'; chargerBilan(id, f); return; }
  BILANS.choisi = f; adresse();
  const noms = { taxon: t => nomEsp(inst()?.taxons?.find(x => x.id === t)) || null, biome: b => inst()?.biomes?.find(x => x.id === b)?.nom || b };
  Z.innerHTML = htmlBilan(BILANS.cache[f], BILANS.index, noms, f);
  $$('[data-bilan]').forEach(b => b.onclick = () => { BILANS.choisi = b.dataset.bilan; vueBilans(); });
}
async function chargerBilans(id) {
  try { BILANS.index = await json(`../mondes/${encodeURIComponent(id)}/bilans/index.json`); } catch (e) { BILANS.erreur = e.message; }
  if (E.vue === 'bilans' && E.source?.id === id) vueBilans();
}
async function chargerBilan(id, f) {
  try { BILANS.cache[f] = await json(`../mondes/${encodeURIComponent(id)}/bilans/${encodeURIComponent(f)}`); BILANS.choisi = f; } catch (e) { BILANS.erreur = e.message; }
  if (E.vue === 'bilans' && E.source?.id === id) vueBilans();
}

// le bilan d'une saison, en HTML : chaque jeu, un tableau de ses lignées. noms : { taxon(id), biome(id) } (sinon, ceux du bilan)
function htmlBilan(B, index, noms = {}, choisi = null) {
  const J = B.jeux || [], nT = x => (noms.taxon && noms.taxon(x.taxon)) || x.nom || x.taxon, nB = b => (noms.biome && noms.biome(b)) || b;
  const somme = k => J.reduce((s, j) => s + (j.ote?.[k] || 0), 0), rab = somme('demande') - somme('applique');
  const L = index ? [...(index.en_cours ? [index.en_cours] : []), ...(index.saisons || [])] : [];
  const plafond = J.find(j => j.plafond != null)?.plafond ?? B.plafonds?.part_max_population_jeu ?? null;
  const titre = `${saisonB(B.saison)}${B.en_cours ? ', en cours' : ''}`;
  const tableau = j => `<div class="defile"><table><thead><tr><th>Lignée</th><th>Lieu</th><th class="n">Bêtes (moyenne)</th><th class="n">Ôtées</th><th class="n">Demandées</th><th class="n">Part de l'effectif</th><th class="n">Au plus en un cycle</th><th class="n">Rendues</th><th>Raboté par</th></tr></thead><tbody>
    ${j.lignees.map(x => { const R = [...rabotsB(x.ote.rabote), ...rabotsB(x.rendu.rabote).map(t => `${t} (rendu)`)];
      const o = x.ote.demande > 0;   // (une lignée à qui le jeu n'a fait que rendre : rien d'ôté)
      return `<tr${R.length ? ' class="rabote"' : ''}><td>${ESC(nT(x))}</td><td>${ESC(nB(x.biome))}</td><td class="n">${nbB(x.effectif_moyen, 0)}</td><td class="n">${o ? nbB(x.ote.applique) : '—'}</td><td class="n">${o ? nbB(x.ote.demande) : '—'}</td>
        <td class="n">${o ? pcB(x.ote.part) : '—'}</td><td class="n${plafond != null && x.ote.part_max_cycle >= plafond - 1e-6 ? ' ambre' : ''}">${o ? pcB(x.ote.part_max_cycle) : '—'}${o && x.ote.cycle_max != null ? ` <span class="sourd">c. ${x.ote.cycle_max}</span>` : ''}</td>
        <td class="n">${x.rendu.applique ? nbB(x.rendu.applique) : '—'}</td><td>${R.length ? `<span class="ambre">${ESC(R.join(' ; '))}</span>` : '<span class="sourd">rien</span>'}</td></tr>`; }).join('')}</tbody></table></div>`;
  const pire = j => j.part_max_cycle && (j.lignees.find(x => x.taxon === j.part_max_cycle.taxon && x.biome === j.part_max_cycle.biome) || j.part_max_cycle);   // (sa lignée, pour son nom)
  const jeu = (j, i) => `<section class="atlas-panel"><div class="panel-heading"><div><p class="atlas-kicker">${String(i + 1).padStart(2, '0')} / ${ESC(j.id ? 'JEU ' + j.id.toUpperCase() : 'LOTS SANS JEU')}</p><h2>${ESC(j.nom || j.id || 'Lots sans jeu')}</h2></div><span class="atlas-chart-label">${nbB(j.lots, 0)} lot${j.lots > 1 ? 's' : ''} · ${nbB(j.cycles, 0)} cycle${j.cycles > 1 ? 's' : ''}</span></div>
    <p class="note">Ôté : ${nbB(j.ote.applique)} bête${j.ote.applique > 1 ? 's' : ''} appliquées sur ${nbB(j.ote.demande)} demandées${rabotsB(j.ote.rabote).length ? ` (raboté par ${ESC(rabotsB(j.ote.rabote).join(', '))})` : ''} ; rendu : ${nbB(j.rendu.applique)}${j.rendu.demande > j.rendu.applique ? ` sur ${nbB(j.rendu.demande)}` : ''}.${j.plafond != null ? ` Son plafond : ${pcB(j.plafond)} d'une population par cycle${j.part_max_cycle ? ` ; au plus ${pcB(j.part_max_cycle.part)} en un cycle (${ESC(nT(pire(j)))}, ${ESC(nB(j.part_max_cycle.biome))}, cycle ${j.part_max_cycle.cycle})` : ''}.` : ''}</p>
    ${j.lignees.length ? tableau(j) : '<p class="vide">Ses lots n\'ont touché aucune population.</p>'}</section>`;
  return `<div class="overview-heading"><div><p class="atlas-kicker">BILAN DE SAISON / CE QUE LES JEUX FONT AU MONDE</p><h2>${ESC(titre)}</h2></div><span class="reading-state">Cycles ${B.compte.de} à ${B.compte.a}${B.en_cours ? ' · en cours' : ''}</span></div>
    ${L.length > 1 ? `<div class="filtres" role="group" aria-label="Les saisons">${L.slice(0, 16).map(x => `<button class="puce" data-bilan="${ESC(x.fichier)}" aria-pressed="${x.fichier === (choisi || L[0].fichier)}">${ESC(saisonB(x))}${x.fichier === 'en-cours.json' ? ' <span class="sourd">en cours</span>' : ''}</button>`).join('')}</div>` : ''}
    <p class="phrase">Ce que chaque jeu a ôté et rendu à chaque population${B.en_cours ? ' depuis le début de la saison' : ' pendant la saison'} (${B.compte.cycles} cycle${B.compte.cycles > 1 ? 's' : ''} comptés, sur les cycles ${B.saison.de} à ${B.saison.a}), et la part de l'effectif que cela représente. ${B.en_cours ? 'Il change à chaque cycle jusqu\'à la fin de la saison.' : 'La saison est finie : ce bilan ne change plus.'}</p>
    <dl class="chiffres"><div><dt>jeux</dt><dd>${J.filter(j => j.id).length}</dd></div><div><dt>bêtes ôtées, plafonds compris</dt><dd>${nbB(somme('applique'), 0)}</dd></div><div><dt>bêtes rabotées par les plafonds</dt><dd>${nbB(rab, 0)}</dd></div><div><dt>le plafond d'un jeu, par population et par cycle</dt><dd>${pcB(plafond)}</dd></div></dl>
    ${J.length ? J.map(jeu).join('') : '<p class="vide">Aucun jeu n\'a envoyé de lots cette saison.</p>'}
    <p class="note">En bêtes, celles que le moteur retire ou ajoute : un adulte prélevé en compte 1,2, un jeune 0,8, un œuf 0,3 ; un nourrissage rend 0,2 bête. « Demandées » : ce que disaient les lots, rapportés aux fréquences réelles ; « ôtées » : ce qu'il en reste après tous les plafonds (prélèvements, captures, déplacements). La part de l'effectif rapporte ce qui est ôté à l'effectif moyen de la population, au début de chaque cycle où le jeu l'a touchée ; « au plus en un cycle », à l'effectif de ce cycle-là, ne dépasse jamais le plafond du jeu. Chaque cycle est compté avant le lissage (${B.memoire_cycles ?? 5} cycles), qui étale ensuite le poids sans rien y ajouter. Le fichier : <code>mondes/${ESC(B.monde?.id || '')}/bilans/${ESC(choisi || (B.en_cours ? 'en-cours.json' : B.saison.id + '.json'))}</code> (docs/4).</p>`;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { htmlBilan };
