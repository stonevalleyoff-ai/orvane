// Orvane — LE BANC DE LA SIMULATION EN DIRECT (bancs/simulation.js, simulation/)
// La simulation en direct fait vivre le monde d'Orvane dans un navigateur, avec chacun de ses paramètres à régler. Ce banc
// vérifie son noyau (simulation/noyau.js), celui qui tourne dans le Web Worker :
//  1. le départ : le monde publié, ses règles, ses mécanismes, la vie en groupe éveillée pour la montrer ;
//  2. tous les paramètres : chaque réglage de chaque groupe est relié au moteur ; posés à leur valeur d'origine, rien ne change ;
//  3. un réglage pèse : une règle profonde du moteur (le feu), une règle d'un module (le climat), le profil du tampon (la chasse),
//     un biome (sa capacité, ses axes) ; on revient en arrière sans rien perdre de ce que le monde a fait ;
//  4. les mécanismes : endormir, réveiller tel quel, éveiller ce qui manquait ;
//  5. deux mondes dans la même page ne se mêlent pas ; la partie se garde et reprend, déterministe ; dans un navigateur aussi.
//   node bancs/simulation.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const racine = p => path.join(__dirname, '..', p);
const N = require(racine('simulation/noyau.js')), Orvane = require(racine('moteur/orvane.js')), Climat = require(racine('moteur/climat.js'));
require(racine('simulation/parametres.js')); const P = globalThis.OrvaneParametres;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I, (k, v) => v === Infinity ? '∞' : v)).digest('hex').slice(0, 16);
const effectifs = S => JSON.stringify(S.etat.taxons.map(t => [t.id, t.populations.map(p => p.effectif)]));
const I = lireJ('mondes/orvane/instantane.json'), F = lireJ('mondes/orvane/flore.json'), t0 = Date.now();
const monde = (reglages = {}) => N.creer(I, { flore: F, reglages, maintenant: Date.parse(I.cycle.date) });
const fx = (x, d = 3) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });

console.log('1. Le départ');
const T = monde(); const M0 = N.mecanismes(T);
verif(Object.entries(I.monde).filter(([k]) => N.MECANISMES.includes(k === 'mere' ? 'synthetique' : k)).every(([k]) => M0[k === 'mere' ? 'synthetique' : k] === 'eveille'), `les mécanismes du monde publié sont éveillés (${Object.values(M0).filter(v => v === 'eveille').length} sur ${N.MECANISMES.length})`);
verif(M0.collectif === 'eveille', 'la vie en groupe est éveillée d\'office (une lecture de l\'état, docs/38) : la page montre les troupeaux');
verif(JSON.stringify(T.etat.monde.regles) === JSON.stringify(I.monde.regles), 'les règles du monde (monde.regles) sont gardées telles quelles');
verif(T.etat.taxons.some(t => t.plan?.regime === 'vegetal'), 'la flore publiée à côté (flore.json) fait partie du monde');
const V0 = N.vue(T); verif(V0.flore?.prairie?.length > 0 && V0.taxons.every(t => t.plan?.regime !== 'vegetal'), 'la vue : les bêtes et les machines, et la flore de chaque biome à part');
const Tt = monde(); N.cycle(Tt); const temoin = effectifs(Tt);

console.log('2. Tous les paramètres');
const D = N.defauts(), groupes = P.GROUPES.map(g => g.id).filter(g => g !== 'individus');
const manque = groupes.filter(g => !D[g]); verif(!manque.length, `chaque groupe de la page a ses valeurs dans le moteur${manque.length ? ' (manque : ' + manque.join(', ') + ')' : ''}`);
// (les règles du moteur valent, pour ce monde, celles du module sous les siennes : monde.regles — ce que la page montre comme défaut)
const base = g => g === 'orvane' ? Object.assign(JSON.parse(JSON.stringify(D.orvane, (k, v) => v === Infinity ? '∞' : v), (k, v) => v === '∞' ? Infinity : v), ...Object.entries(N.valeurs(T).regles0).map(([k, v]) => ({ [k]: v && typeof v === 'object' ? { ...D.orvane[k], ...v } : v }))) : D[g];
const tous = {}; let n = 0; for (const g of groupes) { const L = P.feuilles(base(g)); tous[g] = Object.fromEntries(L); n += L.length; }
const parG = groupes.map(g => `${g} ${Object.keys(tous[g]).length}`).join(', ');
console.log(`     ${n} réglages : ${parG}`);
const sansNom = Object.entries(tous.orvane).filter(([c]) => !P.NOMS['orvane.' + c] && !P.NOMS['orvane.' + c.split('.').slice(0, -1).join('.')]).map(([c]) => c);
verif(!sansNom.length, `chaque règle du moteur a son nom${sansNom.length ? ' (sans nom : ' + sansNom.join(', ') + ')' : ''}`);
const Sd = monde(tous); verif(empreinte(N.valeurs(Sd).climat) === empreinte(D.climat) && N.valeurs(Sd).orvane.mutation === Orvane.REGLES.mutation, 'tous posés à leur valeur d\'origine, les modules gardent leurs valeurs');
N.cycle(Sd); verif(effectifs(Sd) === temoin, `et le cycle est celui du témoin, au bit près (${n} réglages reliés au moteur)`);

console.log('3. Un réglage pèse, et se retire');
{ const S = monde({ orvane: { 'catastrophes.incendie.chance': 1 } }), R = S.etat.monde.regles.catastrophes;
  verif(R.incendie.capacite === Orvane.REGLES.catastrophes.incendie.capacite && R.crue.chance === Orvane.REGLES.catastrophes.crue.chance, 'une règle profonde (catastrophes.incendie.chance) garde ses voisines (la capacité perdue, la crue)');
  const feux = r => r.evenements.filter(e => e.type === 'catastrophe' && /incendie/.test(e.detail || '')).length;
  const a = feux(N.cycle(S)), T2 = monde(), b = feux(N.cycle(T2));
  verif(a > b, `le feu à chaque cycle possible : ${a} incendies, contre ${b} au témoin`);
  N.regler(S, {}); verif(JSON.stringify(S.etat.monde.regles) === JSON.stringify(I.monde.regles) && Orvane.REGLES.catastrophes.incendie.chance === .003, 'retiré, les règles redeviennent celles du monde'); }
{ const S = monde({ climat: { force: .3 } }); N.cycle(S);
  verif(Math.abs((S.etat.monde.climat?.temperature ?? 0) - .3) < 1e-9, `une règle d'un module (climat.force) : l'écart du climat est imposé (${fx(S.etat.monde.climat?.temperature)})`);
  N.regler(S, {}); verif(Climat.REGLES.force === null && Climat.REGLES.ondes[0].ampleur === .08, 'retirée, le climat retrouve ses ondes'); }
// (un événement compte au plus N_MAX = 10 000 bêtes : tampon/tampon.js ; la page découpe un geste plus lourd)
{ const t = I.taxons.filter(z => !z.eteint && z.plan.regime === 'herbivore').map(z => [z, z.populations.find(p => p.biome === 'prairie')]).filter(([, p]) => p && p.effectif > 5000 && p.effectif < 50000)[0];
  const chasse = reglages => { const S = monde(reglages); N.noter(S, { taxon: t[0].id, biome: 'prairie', action: 'prelevement', n: Math.round(t[1].effectif * .2) }); N.cycle(S); return S.etat.taxons.find(z => z.id === t[0].id).populations.find(p => p.biome === 'prairie')?.effectif || 0; };
  const sans = JSON.parse(temoin).find(([id]) => id === t[0].id)[1][t[0].populations.findIndex(p => p.biome === 'prairie')] ?? 0, avec = chasse({}), nul = chasse({ profil: { 'influence.poids.prelevement': 0 } });
  verif(avec < sans * .9, `le joueur chasse ${t[0].nom} (20 % en un cycle) : ${Math.round(100 * avec / sans)} % de ce qu'il y aurait sans lui`);
  verif(Math.abs(nul - sans) / sans < .01, `le profil du tampon (influence.poids.prelevement à 0) : la même chasse ne pèse plus rien (${Math.round(100 * nul / sans)} %)`); }
{ const S = monde(), b = () => S.etat.biomes.find(x => x.id === 'prairie'), c0 = b().capacite, t0b = b().axes.temperature;
  N.regler(S, { biomes: { 'prairie.capacite_base': b().capacite_base * 2, 'prairie.axes.temperature': t0b + .2 } });
  verif(Math.abs(b().capacite / c0 - 2) < 1e-9 && Math.abs(b().axes.temperature - t0b - .2) < 1e-9, 'un biome : sa capacité doublée, sa température montée de 0,2');
  N.cycle(S); const deriv = b().axes.temperature - (t0b + .2); N.regler(S, {});
  verif(Math.abs(b().axes.temperature - (t0b + deriv)) < 1e-6, 'retirés, l\'écart s\'en va et ce que le monde a fait de ses axes reste'); }

console.log('4. Les mécanismes');
{ const S = monde(), avant = JSON.stringify(S.etat.monde.climat); N.regler(S, { mecanismes: { climat: false } }); N.cycle(S);
  verif(N.mecanismes(S).climat === 'endormi' && !S.etat.monde.climat && !N.vue(S).monde.climat, 'endormi, le climat ne tourne plus (le monde n\'en voit rien)');
  N.regler(S, {}); verif(N.mecanismes(S).climat === 'eveille' && JSON.stringify(S.etat.monde.climat) === avant, 'réveillé, il reprend tel qu\'on l\'avait laissé');
  N.regler(S, { mecanismes: { flore: false } }); verif(N.mecanismes(S).flore === 'eveille', 'la flore ne s\'endort pas : elle tourne tant qu\'il y a des plantes'); }
{ const sans = JSON.parse(JSON.stringify(I)); delete sans.monde.esprit; const S = N.creer(sans, { flore: F });
  const e0 = N.mecanismes(S).esprit, ev = N.regler(S, { mecanismes: { esprit: true } });
  verif(e0 === 'absent' && N.mecanismes(S).esprit === 'eveille' && ev.some(e => e.type === 'eveil'), 'un monde sans l\'esprit : on l\'éveille, comme le cycle de nuit (hebergement/cycle.js)'); }

console.log('5. Deux mondes, la partie gardée, le navigateur');
{ const A = monde({ orvane: { mutation: .05 } }), B = monde(); N.cycle(A); N.cycle(B);
  verif(effectifs(B) === temoin && Orvane.REGLES.mutation === .004, 'deux mondes dans la même page : chacun tourne avec ses réglages'); }
{ const S = monde({ orvane: { migration: .05 } }); N.cycle(S); const j = N.sauver(S);
  const S2 = N.charger(j); verif(S2.etat.monde.regles.migration === .05, 'rechargée sans réglages, la partie reprend les siens');
  N.cycle(S); N.cycle(S2); verif(effectifs(S) === effectifs(S2), 'gardée puis reprise, elle continue comme si de rien n\'était'); }
{ const ctx = { console, JSON, Math, Date }; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['moteur/catalogue.js', 'moteur/corps.js', 'moteur/dietes.js', 'moteur/flore.js', 'moteur/derives.js', 'moteur/pathogenes.js', 'moteur/milieu.js', 'moteur/synthetique.js', 'moteur/ponte.js', 'moteur/stades.js',
    'moteur/invention.js', 'moteur/natures.js', 'moteur/climat.js', 'moteur/grammaire.js', 'moteur/castes.js', 'moteur/formes.js', 'moteur/esprit.js', 'moteur/orvane.js', 'tampon/tampon.js', 'moteur/parcelles.js',
    'moteur/collectif.js', 'moteur/solo.js', 'tampon/individus.js', 'moteur/chronique.js', 'simulation/noyau.js', 'simulation/messagerie.js'])
    vm.runInContext(fs.readFileSync(racine(f), 'utf8'), ctx, { filename: f });
  ctx.I = I; ctx.F = F; const nav = vm.runInContext('(() => { const S = OrvaneNoyau.creer(I, { flore: F, maintenant: Date.parse(I.cycle.date) }); OrvaneNoyau.cycle(S); return JSON.stringify(S.etat.taxons.map(t => [t.id, t.populations.map(p => p.effectif)])); })()', ctx);
  verif(nav === temoin, 'dans un navigateur (les fichiers chargés comme des balises, comme travailleur.js), le même monde qu\'avec Node');
  verif(typeof ctx.OrvaneMessagerie === 'function', 'la messagerie du Worker se charge aussi dans la page (sans Worker)'); }

console.log(`\n${ok ? 'Tout est bon' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 1)} s)`);
process.exit(ok ? 0 : 1);
