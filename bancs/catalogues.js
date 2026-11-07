// Orvane — LE BANC DES CATALOGUES OUVERTS (bancs/catalogues.js, docs/20)
// Lumen, un monde imaginaire (bancs/lumen/) : sept biomes de cristal, de cendres, de brume et de spores, un axe de plus (la magie),
// cinq traits, deux organes et deux formes de corps à lui.
//  1. les traits du moteur gardent leurs effets ; un catalogue propre vide ne change rien ;
//  2. l'axe du monde compte : une lignée née dans la magie vit mal là où il n'y en a pas ;
//  3. la genèse de Lumen : ses traits apparaissent par mutation, ses organes et ses formes sur les silhouettes ;
//  4. la flore de Lumen : des plantes dans ses biomes, et ses traits devant elles ;
//  5. le contrat, un traducteur qui lit la silhouette, le cycle de nuit qui relit le catalogue.
//   node bancs/catalogues.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Flore = require(racine('moteur/flore.js')), CORPS = require(racine('moteur/corps.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (s.pattern && ty === 'string' && !new RegExp(s.pattern).test(v)) e.push(p + ': motif ' + v);
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json'), LUMEN = lireJ('bancs/lumen/catalogue.json'), t0 = Date.now();
const propres = Object.keys(LUMEN.traits);

console.log('1. Les traits du moteur, un catalogue propre vide');
{ const R = Flore.resistances, A = Flore.atteinte, h = { masse_kg: 10, taille_m: 1, locomotion: ['marche'] };
  verif(R(h, ['metabolisme-lent']).toxique === .6 && R(h, ['estomac-large']).toxique === .5 && R(h, ['peau-epaisse']).epineux === .6 && R(h, ['carapace']).epineux === .4
    && A(h, ['pattes-longues', 'gigantisme'], 'arbre') === 1.6 / 4 && A(h, ['queue-prehensile'], 'arbre') === 1 && A(h, ['membrane-planante'], 'arbre') === 1,
    'devant les plantes, les traits du moteur font ce qu\'ils faisaient (leur champ flore : métabolisme lent 0,6, cuir épais 0,6, pattes longues +30 %…)');
  let A1 = I0, B1 = { ...clone(I0), catalogue: { ...I0.catalogue, monde: { nom: 'vide' } } };
  for (let k = 0; k < 3; k++) { A1 = Orvane.cycle(A1, {}); B1 = Orvane.cycle(B1, {}); }
  verif(empreinte(A1.taxons) === empreinte(B1.taxons) && B1.catalogue.monde?.nom === 'vide', 'un catalogue propre sans axe, trait, organe ni forme ne change rien, et le monde le garde de cycle en cycle');
}

console.log("2. L'axe du monde");
{ const modele = clone(I0.taxons.find(t => !t.eteint && t.plan.regime === 'herbivore' && t.plan.masse_kg > 1 && t.plan.masse_kg < 20 && (t.plan.locomotion || []).includes('marche')));
  const B = (id, magie) => ({ id, nom: id, milieu: 'terrestre', axes: { temperature: .5, humidite: .5, altitude: .5, lumiere: .5, couvert: .5, magie }, capacite: 200000, voisins: [] });
  const tx = { ...modele, id: 'essai', parent: null, plan: { ...modele.plan, niche: { temperature: .5, humidite: .5, altitude: .5, lumiere: .5, couvert: .5, magie: .9 }, tolerance: .35 },
    populations: ['magique', 'sans-magie'].map(b => ({ biome: b, effectif: 3000, tendance: 0, depuis: 0 })), phenotypes: [{ id: 'base', frequence: 1, traits: [] }] };
  const monde = axes => ({ orvane: '0.1', monde: { id: 'essai-axe', graine: 3, annee: 0 }, cycle: { n: 0, date: '2026-11-01T00:00:00Z', pressions_recues: 0 }, biomes: [B('magique', .9), B('sans-magie', .1)],
    catalogue: { version: '0.1', traits: {}, ...(axes ? { monde: { axes: { magie: { nom: 'magie' } } } } : {}) }, taxons: [clone(tx)], evenements: [] });
  const finir = I => { for (let k = 0; k < 20; k++) I = Orvane.cycle(I, {}); const P = I.taxons[0].populations, e = b => P.find(p => p.biome === b)?.effectif || 0; return e('sans-magie') / Math.max(1, e('magique')); };
  const avec = finir(monde(true)), sans = finir(monde(false));
  verif(avec < .5 && Math.abs(sans - 1) < .02, `une lignée née dans la magie (niche 0,9), dans deux biomes qui ne diffèrent que par elle : là où il n'y en a pas, il en reste ${fx(avec * 100)} % au bout de 20 cycles ; sans l'axe déclaré, ${fx(sans * 100)} %`);
}

console.log('3. La genèse de Lumen');
const sortie = racine('bancs/lumen/.genese-essai.json');
let L;
try { execFileSync('node', [racine('moteur/genese.js'), racine('bancs/lumen/biomes.json'), '--catalogue', racine('bancs/lumen/catalogue.json'), '--cycles', '600', '--graine', '11', '--lignees', '60', '--nom', 'Lumen', '--point', '0', '--sortie', sortie], { encoding: 'utf8' });
  L = JSON.parse(fs.readFileSync(sortie, 'utf8')); } finally { fs.rmSync(sortie, { force: true }); }
{ const vivants = L.taxons.filter(t => !t.eteint), porte = id => vivants.filter(t => t.phenotypes.some(p => p.traits.includes(id) && p.frequence >= .05));
  const parTrait = Object.fromEntries(propres.map(id => [id, porte(id).length])), apparus = propres.filter(id => vivants.some(t => t.phenotypes.some(p => p.traits.includes(id))));
  console.log(`     ${vivants.length} lignées ; lignées où un trait de Lumen pèse au moins 5 % : ${Object.entries(parTrait).map(([k, v]) => k + ' ' + v).join(', ')}`);
  verif(apparus.length >= 4 && L.catalogue.monde?.nom === 'Lumen' && apparus.every(id => L.catalogue.traits[id]?.effet === LUMEN.traits[id].effet), `${apparus.length} de ses 5 traits sont apparus par mutation, et l'instantané publie leur définition`);
  verif(porte('luminescence').length > vivants.length / 2, `la luminescence, qui attire les partenaires autant que les chasseurs, gagne ${porte('luminescence').length} lignées sur ${vivants.length}`);
  const org = vivants.filter(t => (t.plan.corps?.organes || []).some(o => LUMEN.organes[o.type])), fo = vivants.filter(t => LUMEN.formes[t.plan.corps?.forme]);
  verif(org.length >= 1 && fo.length >= 1, `ses organes et ses formes sur les silhouettes : ${org.length} lignées à ${[...new Set(org.flatMap(t => t.plan.corps.organes.map(o => o.type).filter(k => LUMEN.organes[k])))].join(', ')}, ${fo.length} de forme ${[...new Set(fo.map(t => t.plan.corps.forme))].join(', ')}`);
  const nm = vivants.filter(t => t.plan.niche?.magie != null).length; verif(nm === vivants.length, 'chaque lignée a sa niche sur l\'axe de la magie');
}

console.log('4. La flore de Lumen');
let W;
{ W = Flore.eveiller(L).inst; const P = W.taxons.filter(t => t.plan.regime === 'vegetal'), ou = b => P.filter(t => t.populations.some(p => p.biome === b)).map(t => t.plan.forme);
  verif(ou('cavernes-luisantes').includes('champignon') && ou('mer-de-brume').length && ou('foret-de-cristal').includes('arbre') && ou('lac-d-argent').includes('algue'),
    `${P.length} lignées de plantes : des arbres dans la forêt de cristal, des champignons dans les cavernes, des lichens et des herbes dans la mer de brume (${ou('mer-de-brume').join(', ')}), des algues dans le lac`);
  const h = { masse_kg: 10, taille_m: .5, locomotion: ['marche'] };
  verif(Flore.resistances(h, ['peau-de-cristal']).epineux === .7 && Flore.resistances(h, ['mangeur-de-spores']).toxique === .8 && Flore.atteinte(h, ['voile-de-brume'], 'arbre') === 1,
    'ses traits devant les plantes : la peau de cristal supporte 70 % des épines, le mangeur de spores 80 % des toxines, le voile de brume atteint les arbres');
  let X = W; for (let k = 0; k < 5; k++) X = Orvane.cycle(X, {}); W = X;
  verif(X.taxons.some(t => t.populations.some(p => p.nourriture != null)), 'les brouteurs de Lumen se nourrissent des plantes de Lumen, cycle après cycle');
}

console.log('5. Le contrat, un traducteur, le cycle de nuit');
{ const pub = Tampon.filtrer(W, { familles: ['animale', 'synthetique'] }), e = val(S, pub, '$');
  verif(!e.length, "l'instantané de Lumen respecte schemas/instantane.schema.json : l'axe de plus, les traits, les organes et les formes du monde" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const t = pub.taxons.find(x => LUMEN.formes[x.plan.corps?.forme] || (x.plan.corps?.organes || []).some(o => LUMEN.organes[o.type]));
  const sansExt = CORPS.decrire(t.plan.corps), avant = CORPS.etendre(pub.catalogue.monde), lu = CORPS.decrire(t.plan.corps); CORPS.etendre(avant);
  verif(lu !== sansExt && /radiaire|méduséen|cristau?x?|tentacules?/.test(lu), `un traducteur qui étend corps.js du catalogue du monde lit la silhouette : « ${lu} » (sans lui : « ${sansExt} »)`);
  const dossier = racine('mondes/essai-lumen'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const cat = clone(LUMEN); fs.writeFileSync(path.join(dossier, 'catalogue.json'), JSON.stringify(cat));
    const profil = { ...lireJ('mondes/orvane/profil.json'), monde: { id: 'essai-lumen', graine: 11, cycle: '24h', annee: 0, catalogue: 'mondes/essai-lumen/catalogue.json' } };
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify(profil)); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(L)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(L));
    const run = () => { execFileSync('node', [racine('hebergement/cycle.js'), 'essai-lumen', '--sans-reseau', '--cycles', '1'], { encoding: 'utf8' }); return JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')); };
    const A = run(); cat.traits['ecailles-d-argent'] = { domaine: 'defense', organe: 'écailles d\'argent', cout: .1, effet: 'reflète la lumière : se voit de loin, se mord mal', vulnerabilite: .9 }; fs.writeFileSync(path.join(dossier, 'catalogue.json'), JSON.stringify(cat));
    const B = run();
    verif(A.catalogue.monde?.nom === 'Lumen' && !A.catalogue.monde.traits['ecailles-d-argent'] && B.catalogue.monde.traits['ecailles-d-argent'], 'le cycle de nuit relit le catalogue du profil (monde.catalogue) : un trait ajouté au fichier est dans le monde au cycle suivant');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
