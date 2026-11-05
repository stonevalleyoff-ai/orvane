// Orvane — LE BANC DES INDIVIDUS (bancs/individus.js, docs/35)
//  1. une bête de la population réelle : ses allèles, ce qu'elle montre, ses traits continus, aux fréquences de sa population ;
//     tirée sachant ce que le jeu montre d'elle, sans rien changer aux fréquences ;
//  2. Mendel : deux porteurs cachés font un quart de petits albinos ; un géant, la moitié de géants ;
//  3. les traits continus : un petit tient de ses parents à proportion de l'héritabilité ;
//  4. la parenté : frère et sœur, demi-frères, cousins, une lignée fermée ; la vigueur ;
//  5. les lignées proches : un hybride, moins souvent ; deux lignées éloignées, jamais ;
//  6. le pedigree, ce que pèse une bête, le génome qu'un jeu renvoie, le même hasard.
//   node bancs/individus.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Ind = require(racine('tampon/individus.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), pc = x => fx(100 * x) + ' %', t0 = Date.now();
const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r = rng(7), moy = L => L.reduce((a, x) => a + x, 0) / L.length, vari = L => { const m = moy(L); return moy(L.map(x => (x - m) ** 2)); };
const I = lireJ('mondes/orvane/etat.json'), cat = I.catalogue.traits;
// un petit monde réglé à la main, pour les croisements : l'Orvi, deux lignées filles et une petite-fille, et une lignée sans parenté
const pop = { biome: 'foret', effectif: 5000, alleles: { albinisme: .2, gigantisme: .1 }, quant: { taille: { m: .3, v: 1, g: .5 } }, savoirs: { 'chasse-concertee': .6 } };
const lign = (id, parent) => ({ id, nom: 'Orvi', parent, plan: { regime: 'carnivore' }, populations: [pop], phenotypes: [{ id: 'base', frequence: 1, traits: [] }] });
const W = { cycle: { n: 40 }, catalogue: I.catalogue, taxons: [lign('orvi', null), lign('orvi.1', 'orvi'), lign('orvi.2', 'orvi'), lign('orvi.1.1', 'orvi.1'), { ...lign('lojafir', null), nom: 'Lojafir' }] };
const bete = (o = {}) => Ind.tirer(W, o.taxon || 'orvi', 'foret', { r, ...o });
const petit = (m, p) => Ind.croiser(m, p, W, { r }).petit;

console.log('1. Une bête de la population réelle');
{ const T = I.taxons.find(t => t.id === 'tismusil'), P = T.populations.find(p => p.biome === 'marais'), N = 20000, L = Ind.echantillon(I, 'tismusil', 'marais', N, { r });
  const ecart = Math.max(...Object.entries(P.alleles).map(([id, p]) => Math.abs(L.reduce((a, x) => a + (x.alleles[id] || 0), 0) / (2 * N) - p)));
  const alb = L.filter(x => Ind.montre(x, cat).includes('albinisme')).length / N, pa = P.alleles.albinisme, cach = L.filter(x => x.alleles.albinisme === 1).length / N;
  const tz = L.map(x => x.z.taille), ta = L.map(x => x.a.taille);
  verif(ecart < .006 && Math.abs(alb - pa * pa) < .002 && Math.abs(cach - 2 * pa * (1 - pa)) < .008,
    `${fx(N, 0)} Tismusil du marais : chaque allèle à sa fréquence (écart ${fx(ecart, 4)} au plus) ; l'albinisme (récessif, allèle à ${pc(pa)}) se voit chez ${pc(alb)} (p² = ${pc(pa * pa)}), et se cache chez ${pc(cach)} de porteuses`);
  verif(Math.abs(moy(tz) - P.quant.taille.m) < .03 && Math.abs(vari(tz) - P.quant.taille.v) < .04 && Math.abs(vari(ta) - P.quant.taille.g) < .03,
    `leur taille : moyenne ${fx(moy(tz), 2)} (population ${fx(P.quant.taille.m, 2)}), variance ${fx(vari(tz), 2)} (${fx(P.quant.taille.v, 2)}), dont héritable ${fx(vari(ta), 2)} (${fx(P.quant.taille.g, 2)})`);
  // le jeu a déjà tiré ce qu'elle montre (aux fréquences de la population) : son génotype se tire sachant cela, et les fréquences ne bougent pas
  const S = Array.from({ length: N }, () => bete({ montre: r() < .04 ? ['albinisme'] : [], z: { taille: .3 + Math.sqrt(1) * (Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())) } }));
  const pS = S.reduce((a, x) => a + (x.alleles.albinisme || 0), 0) / (2 * N), nonAlb = S.filter(x => !Ind.montre(x, cat).includes('albinisme')), cachS = nonAlb.filter(x => x.alleles.albinisme === 1).length / nonAlb.length;
  const ok2 = S.every(x => !Ind.montre(x, cat).includes('albinisme') || x.alleles.albinisme === 2);
  verif(ok2 && Math.abs(pS - .2) < .006 && Math.abs(cachS - 2 * .2 / 1.2) < .012,
    `tirée sachant ce qu'on voit d'elle : une albinos a deux copies ; une bête qui ne l'est pas porte l'allèle caché une fois sur ${fx(1 / cachS, 1)} (2p/(1+p) = ${pc(2 * .2 / 1.2)}) ; l'allèle reste à ${pc(pS)} (20 %)`);
  const sv = S.filter(x => x.savoirs?.includes('chasse-concertee')).length / N;
  verif(Math.abs(sv - .6) < .015 && S.every(x => x.nom && x.id && /^[fm]$/.test(x.sexe)), `elle sait chasser ensemble comme 60 % des siens (${pc(sv)}) ; elle a un nom (${S.slice(0, 4).map(x => x.nom).join(', ')}…), un sexe, un identifiant`);
}

console.log('2. Mendel');
{ const N = 20000, porteuse = s => bete({ sexe: s, montre: [] });
  let alb = 0, n = 0; for (let k = 0; k < N; k++) { const m = porteuse('f'), p = porteuse('m'); m.alleles.albinisme = 1; p.alleles.albinisme = 1; delete m.alleles.gigantisme; delete p.alleles.gigantisme;
    const x = petit(m, p); n++; if (Ind.montre(x, cat).includes('albinisme')) alb++; }
  verif(Math.abs(alb / n - .25) < .012, `deux porteurs cachés de l'albinisme (aucun des deux n'est albinos) : ${pc(alb / n)} de leurs petits sont albinos (Mendel : 25 %)`);
  let g = 0; for (let k = 0; k < N; k++) { const m = porteuse('f'), p = porteuse('m'); m.alleles = { gigantisme: 1 }; p.alleles = {}; if (Ind.montre(petit(m, p), cat).includes('gigantisme')) g++; }
  verif(Math.abs(g / N - .5) < .012, `une géante (dominant, une copie) et un mâle ordinaire : ${pc(g / N)} de géants (50 %)`);
  const m = porteuse('f'), p = porteuse('m'); m.alleles = { albinisme: 2 }; p.alleles = { albinisme: 2 };
  verif(Array.from({ length: 200 }, () => petit(m, p)).every(x => Ind.montre(x, cat).includes('albinisme')), 'deux albinos n\'ont que des petits albinos');
}

console.log('3. Les traits continus');
{ const N = 6000, mp = [], ze = []; for (let k = 0; k < N; k++) { const m = bete({ sexe: 'f' }), p = bete({ sexe: 'm' }), x = petit(m, p); mp.push((m.z.taille + p.z.taille) / 2); ze.push(x.z.taille); }
  const mx = moy(mp), my = moy(ze), pente = mp.reduce((a, x, i) => a + (x - mx) * (ze[i] - my), 0) / mp.reduce((a, x) => a + (x - mx) ** 2, 0);
  verif(Math.abs(pente - .5) < .05 && Math.abs(vari(ze) - 1) < .06, `la taille d'un petit suit celle de ses parents avec la pente ${fx(pente, 2)} (l'héritabilité : 0,5) ; la variance des petits reste ${fx(vari(ze), 2)} (1)`);
  let L = [bete({ sexe: 'f' }), bete({ sexe: 'm' })]; for (let g = 0; g < 8; g++) { const enf = Array.from({ length: 40 }, () => petit(L[0], L[1])).sort((a, b) => b.z.taille - a.z.taille), f = enf.find(x => x.sexe === 'f'), h = enf.find(x => x.sexe === 'm'); L = [f, h]; }
  const z8 = (L[0].z.taille + L[1].z.taille) / 2;
  verif(z8 > 1.5, `un éleveur qui garde à chaque portée la plus grande et le plus grand : huit générations plus tard, ses bêtes sont à ${fx(z8, 1)} écarts-types (la population sauvage : 0,3) — la sélection artificielle`);
}

console.log('4. La parenté');
{ const m = bete({ sexe: 'f' }), p = bete({ sexe: 'm' }), A = petit(m, p), B = petit(m, p), soeur = A.sexe === 'f' ? A : B; soeur.sexe = 'f'; const frere = soeur === A ? B : A; frere.sexe = 'm';
  const x = petit(soeur, frere), autre = bete({ sexe: 'm' }), demi = petit(m, autre); demi.sexe = 'm';
  const c1 = petit(soeur, bete({ sexe: 'm' })), c2 = petit(bete({ sexe: 'f' }), frere); c1.sexe = 'f'; c2.sexe = 'm';
  verif(Ind.parente(m, p) === 0 && x.F === .25 && Math.abs(x.vigueur - .85) < 1e-9 && petit(soeur, demi).F === .125 && petit(c1, c2).F === .0625 && petit(m, frere).F === .25,
    `deux bêtes sauvages : 0 ; frère et sœur : leur petit est consanguin à 25 % (vigueur 85 %) ; demi-frère et demi-sœur : 12,5 % ; cousins : 6,25 % ; mère et fils : 25 %`);
  let L = [soeur, frere], F = []; for (let g = 0; g < 4; g++) { const a = petit(L[0], L[1]), b = petit(L[0], L[1]); a.sexe = 'f'; b.sexe = 'm'; F.push(a.F); L = [a, b]; }
  verif(F.map(x => x.toFixed(3)).join(' ') === '0.250 0.375 0.500 0.594', `une lignée fermée, frère et sœur à chaque génération : ${F.map(pc).join(', ')} (la théorie : 25, 37,5, 50, 59,4 %)`);
  // la consanguinité révèle le récessif : dans une lignée qui le porte caché, des albinos naissent
  let n = 0, alb = 0; for (let k = 0; k < 8000; k++) { const a = bete({ sexe: 'f', montre: [] }), b = bete({ sexe: 'm', montre: [] }); a.alleles = { albinisme: 1 }; b.alleles = {};
    const e1 = petit(a, b), e2 = petit(a, b); e1.sexe = 'f'; e2.sexe = 'm'; const y = petit(e1, e2); n++; if (Ind.montre(y, cat).includes('albinisme')) alb++; }
  verif(Math.abs(alb / n - 1 / 16) < .008, `une porteuse cachée et un mâle sain : aucun petit albinos ; leurs enfants croisés entre eux en ont ${pc(alb / n)} (1/16)`);
}

console.log('5. Les lignées proches');
{ const essai = (ta, tb, N = 4000) => { let o = 0, raison = null; for (let k = 0; k < N; k++) { const R = Ind.croiser(bete({ taxon: ta, sexe: 'f' }), bete({ taxon: tb, sexe: 'm' }), W, { r }); if (R.ok) o++; else raison = R.raison; } return [o / N, raison]; };
  const [a] = essai('orvi', 'orvi'), [b] = essai('orvi', 'orvi.1'), [c] = essai('orvi.1', 'orvi.2'), [d, rd] = essai('orvi', 'lojafir', 200), [e, re] = essai('orvi.1.1', 'orvi.2', 200);
  verif(a === 1 && Math.abs(b - .5) < .03 && Math.abs(c - .25) < .03 && d === 0 && rd === 'trop-eloignees' && e === 0,
    `même lignée : un petit à chaque fois ; une lignée et sa fille : ${pc(b)} ; deux sœurs : ${pc(c)} ; à trois séparations, ou sans parenté : jamais (${rd})`);
  let h = null; while (!h) { const R = Ind.croiser(bete({ taxon: 'orvi.1', sexe: 'f' }), bete({ taxon: 'orvi', sexe: 'm' }), W, { r }); if (R.ok) h = R.petit; } h.sexe = 'f';
  const [f] = (() => { let o = 0; for (let k = 0; k < 4000; k++) if (Ind.croiser(h, bete({ taxon: 'orvi.1', sexe: 'm' }), W, { r }).ok) o++; return [o / 4000]; })();
  const ms = Ind.croiser(bete({ sexe: 'f' }), bete({ sexe: 'f' }), W, { r }), ouv = Ind.croiser({ ...bete({ sexe: 'f' }), caste: 'ouvriere' }, bete({ sexe: 'm' }), W, { r });
  verif(h.hybride === 'orvi' && h.taxon === 'orvi.1' && Math.abs(f - .5) < .03 && ms.raison === 'meme-sexe' && ouv.raison === 'sterile',
    `l'hybride est de la lignée de sa mère, père Orvi ; croisé avec un Orvi de sa lignée, un petit ${pc(f)} des fois ; deux femelles, une ouvrière : non`);
}

console.log('6. Le pedigree, le poids, le génome, le hasard');
{ let L = [bete({ sexe: 'f', nom: 'Aube' }), bete({ sexe: 'm', nom: 'Brun' })]; for (let g = 0; g < 12; g++) { const a = petit(L[0], bete({ sexe: 'm' })), b = petit(L[1], bete({ sexe: 'f' })); a.sexe = 'f'; b.sexe = 'm'; L = [a, b]; }
  const x = petit(L[0], L[1]), poids = JSON.stringify(x).length, T = Ind.pedigree(x, 2);
  verif(x.gen === 13 && Object.keys(x.ascendance).length <= 126 && poids < 9000 && T.mere?.nom && T.mere?.mere?.nom && T.pere?.pere?.nom && !T.mere.mere.mere,
    `treize générations : ${Object.keys(x.ascendance).length} ancêtres gardés (six générations), ${fx(poids / 1024, 1)} Ko en JSON ; l'arbre de ${x.nom} : mère ${T.mere.nom} (fille de ${T.mere.mere.nom}), père ${T.pere.nom}`);
  const G = Ind.genome([{ alleles: { albinisme: 2 }, a: { taille: 1 } }, { alleles: { albinisme: 1, gigantisme: 1 }, a: { taille: 0 } }]);
  verif(G.n === 2 && G.alleles.albinisme === .75 && G.alleles.gigantisme === .25 && G.a.taille === .5, `le génome que le jeu joint quand il relâche deux bêtes : l'allèle de l'albinisme à 75 %, du gigantisme à 25 %, la taille génétique moyenne 0,5`);
  const u = Ind.tirer(W, 'orvi', 'foret', { r: rng(3) }), v = Ind.tirer(W, 'orvi', 'foret', { r: rng(3) });
  verif(JSON.stringify(u) === JSON.stringify(v) && Ind.tirer(W, 'inconnue', 'foret') === null, 'le même hasard donne la même bête ; une lignée inconnue, aucune');
}

console.log('7. L\'élevage remonte au monde (docs/36)');
{ const Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), profil = lireJ('mondes/orvane/profil.json');
  const Y = () => I.taxons.find(t => t.id === 'ysdun'), P0 = Y().populations.find(p => p.biome === 'grotte'), nes = Array.from({ length: 30 }, () => ({ alleles: { albinisme: 2 }, a: { taille: 3 } }));
  const lot = (compte, n, genome, phenotype = 'albinisme') => ({ orvane: '0.1', monde: I.monde.id, instantane: I.cycle.n, source: { jeu: 'banc', compte }, periode: { debut: '2026-11-05T08:00:00Z', fin: '2026-11-05T09:00:00Z' },
    evenements: [{ taxon: 'ysdun', biome: 'grotte', phenotype, action: 'liberation', n, ...(genome ? { genome } : {}) }] });
  const apres = lots => { const X = Orvane.cycle(I, Tampon.agreger(lots, I, profil, {}).pressions); return X.taxons.find(t => t.id === 'ysdun').populations.find(p => p.biome === 'grotte'); };
  const G = Ind.genome(nes), sans = apres([]), avec = apres(['h:a', 'h:b', 'h:c'].map(c => lot(c, 30, G))), ag = Tampon.agreger(['h:a', 'h:b', 'h:c'].map(c => lot(c, 30, G)), I, profil, {}).pressions.taxons.ysdun.grotte;
  const dp = avec.alleles.albinisme - sans.alleles.albinisme, dm = avec.quant.taille.m - sans.quant.taille.m, att = 90 / (P0.effectif + 90);
  verif(ag.apport.n === 90 && !Object.keys(ag.retrait).length && Math.abs(dp - att * (1 - sans.alleles.albinisme)) < .012 && Math.abs(dm - att * (3 - sans.quant.taille.m)) < .03,
    `trois joueurs relâchent chacun 30 Ysdun albinos nés en élevage, grands (taille génétique 3) dans la grotte (${fx(P0.effectif, 0)} bêtes) : l'allèle de l'albinisme passe de ${pc(sans.alleles.albinisme)} à ${pc(avec.alleles.albinisme)}, la taille moyenne de ${fx(sans.quant.taille.m, 2)} à ${fx(avec.quant.taille.m, 2)}`);
  const un = Tampon.agreger([lot('h:a', 1000, G)], I, profil, {}).pressions.taxons.ysdun.grotte, vieux = Tampon.agreger([lot('h:a', 30, null, 'base')], I, profil, {}).pressions.taxons.ysdun.grotte;
  verif(un.apport.n === 30 && !vieux.apport && vieux.retrait.base < 0, `un seul joueur qui en relâche mille : il en compte ${un.apport.n} (son plafond par cycle) ; une libération sans génome reste un apport de bêtes au phénotype dit, comme avant`);
  const S = lireJ('schemas/pression.schema.json'), E = S.properties.evenements.items.properties.genome;
  verif(E && Object.keys(G).every(k => E.properties[k]), 'le contrat du lot connaît le génome (schemas/pression.schema.json)');
}

console.log(ok ? `\nTOUT PASSE (${fx((Date.now() - t0) / 1000, 1)} s)` : '\nÉCHEC');
process.exit(ok ? 0 : 1);
