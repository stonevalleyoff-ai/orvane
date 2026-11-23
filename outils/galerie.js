// Orvane — LE BANC VISUEL (outils/galerie.js) : les silhouettes de l'observatoire (monde/silhouette.js) pour les bêtes de chaque monde,
// sur une page, pour juger un dessin et voir ce qu'une modification change.
//   node outils/galerie.js [--mondes europe,aube,orvane] [--ids truite,meduses] [--par 4] [--sortie galerie.html] [--png galerie.png]
//                          [--atlas] [--grain] [--taille 340]
// --par N : au plus N bêtes par forme de corps et par monde. --png : une capture (Playwright, s'il est là)
// --atlas : les planches de l'atlas (monde/atlas.js, docs/55), à côté du dessin des jeux ; --grain : avec le papier et le lavis de la
// grande planche ; --taille : la largeur d'une planche, en pixels
'use strict';
const fs = require('fs'), path = require('path');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const R = p => path.join(__dirname, '..', p);
globalThis.OrvaneCorps = require(R('moteur/corps.js')); const Sil = require(R('monde/silhouette.js'));
globalThis.OrvaneSilhouette = Sil; const atlas = a.includes('--atlas'), At = atlas ? require(R('monde/atlas.js')) : null, Fi = atlas ? require(R('monde/fiche.js')) : null, larg = +arg('--taille', 340);
const mondes = arg('--mondes', 'europe,aube,orvane,genese-2026').split(','), ids = arg('--ids') ? new Set(arg('--ids').split(',')) : null, par = +arg('--par', 4);
const ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let h = '<!doctype html><meta charset="utf-8"><title>Banc visuel</title><body style="font:12px sans-serif;background:#f4f1ea;margin:8px">';
for (const m of mondes) {
  const f = ['etat.json', 'amorce.json', 'instantane.json'].map(x => R(`mondes/${m}/${x}`)).find(fs.existsSync); if (!f) continue;
  const I = JSON.parse(fs.readFileSync(f, 'utf8')); if (OrvaneCorps.etendre) OrvaneCorps.etendre(I.catalogue?.monde || null);
  const vus = {}, cases = [];
  for (const t of I.taxons) { if (t.plan.regime === 'vegetal' || t.eteint) continue; if (ids && !ids.has(t.id)) continue;
    const fo = OrvaneCorps.allure ? OrvaneCorps.allure(OrvaneCorps.normaliser(t.plan.corps), t.plan) : t.plan.corps?.forme; vus[fo] = (vus[fo] || 0) + 1; if (!ids && vus[fo] > par) continue;
    let svg; try { svg = Sil.dessiner(t.plan.corps, t.plan, t.phenotypes?.[0]?.traits || []); } catch (e) { svg = `<b>erreur : ${ESC(e.message)}</b>`; }
    if (atlas) { let F = null; try { F = Fi.ecrire(t, I).champs.famille; } catch (e) { F = null; }   // (la planche : la famille visuelle de la fiche, les traits de la plupart des bêtes)
      const n = {}; for (const q of t.phenotypes || []) for (const x of q.traits) n[x] = (n[x] || 0) + q.frequence; const dom = Object.keys(n).filter(k => n[k] >= .5);
      let p2; try { p2 = At.dessiner(t.plan.corps, t.plan, dom, { famille: F?.id, details: (F?.details || []).map(d => d.id), graine: t.id, grain: a.includes('--grain') }).svg.replace(/width="170" height="90"/, `width="${larg}" height="${Math.round(larg * 90 / 170)}"`); } catch (e) { p2 = `<b>erreur : ${ESC(e.message)}</b>`; }
      cases.push(`<div style="background:#f6f0e2;padding:6px;width:${larg + 190}px;display:flex;gap:8px;align-items:flex-end"><div>${svg}<br><b>${ESC(t.nom_commun || t.nom || t.id)}</b><br>${ESC(fo)} · ${t.plan.masse_kg} kg · ${ESC(F?.id || '?')}<br>${ESC(dom.join(', '))}</div>${p2}</div>`); continue; }
    cases.push(`<div style="background:#fff;padding:4px;width:180px">${svg}<br><b>${ESC(t.nom || t.id)}</b><br>${ESC(fo)} · ${t.plan.masse_kg} kg · ${ESC((t.plan.locomotion || []).join('/'))}</div>`); }
  if (OrvaneCorps.etendre) OrvaneCorps.etendre(null);
  h += `<h3>${ESC(m)}</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${cases.join('')}</div>`;
}
const so = arg('--sortie', 'galerie.html'); fs.writeFileSync(so, h + '</body>'); console.log('→', so);
const png = arg('--png'); if (png) { const { chromium } = require('playwright'); (async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 600 } });
  await p.goto('file://' + path.resolve(so)); await p.screenshot({ path: png, fullPage: true }); await b.close(); console.log('→', png); })(); }
