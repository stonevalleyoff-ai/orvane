// Orvane — LE BANC VISUEL (outils/galerie.js) : les silhouettes de l'observatoire (monde/silhouette.js) pour les bêtes de chaque monde,
// sur une page, pour juger un dessin et voir ce qu'une modification change.
//   node outils/galerie.js [--mondes europe,aube,orvane] [--ids truite,meduses] [--par 4] [--sortie galerie.html] [--png galerie.png]
// --par N : au plus N bêtes par forme de corps et par monde. --png : une capture (Playwright, s'il est là)
'use strict';
const fs = require('fs'), path = require('path');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const R = p => path.join(__dirname, '..', p);
globalThis.OrvaneCorps = require(R('moteur/corps.js')); const Sil = require(R('monde/silhouette.js'));
const mondes = arg('--mondes', 'europe,aube,orvane,genese-2026').split(','), ids = arg('--ids') ? new Set(arg('--ids').split(',')) : null, par = +arg('--par', 4);
const ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let h = '<!doctype html><meta charset="utf-8"><title>Banc visuel</title><body style="font:12px sans-serif;background:#f4f1ea;margin:8px">';
for (const m of mondes) {
  const f = ['etat.json', 'amorce.json'].map(x => R(`mondes/${m}/${x}`)).find(fs.existsSync); if (!f) continue;
  const I = JSON.parse(fs.readFileSync(f, 'utf8')); if (OrvaneCorps.etendre) OrvaneCorps.etendre(I.catalogue?.monde || null);
  const vus = {}, cases = [];
  for (const t of I.taxons) { if (t.plan.regime === 'vegetal' || t.eteint) continue; if (ids && !ids.has(t.id)) continue;
    const fo = OrvaneCorps.allure ? OrvaneCorps.allure(OrvaneCorps.normaliser(t.plan.corps), t.plan) : t.plan.corps?.forme; vus[fo] = (vus[fo] || 0) + 1; if (!ids && vus[fo] > par) continue;
    let svg; try { svg = Sil.dessiner(t.plan.corps, t.plan, t.phenotypes?.[0]?.traits || []); } catch (e) { svg = `<b>erreur : ${ESC(e.message)}</b>`; }
    cases.push(`<div style="background:#fff;padding:4px;width:180px">${svg}<br><b>${ESC(t.nom || t.id)}</b><br>${ESC(fo)} · ${t.plan.masse_kg} kg · ${ESC((t.plan.locomotion || []).join('/'))}</div>`); }
  if (OrvaneCorps.etendre) OrvaneCorps.etendre(null);
  h += `<h3>${ESC(m)}</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${cases.join('')}</div>`;
}
const so = arg('--sortie', 'galerie.html'); fs.writeFileSync(so, h + '</body>'); console.log('→', so);
const png = arg('--png'); if (png) { const { chromium } = require('playwright'); (async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 600 } });
  await p.goto('file://' + path.resolve(so)); await p.screenshot({ path: png, fullPage: true }); await b.close(); console.log('→', png); })(); }
