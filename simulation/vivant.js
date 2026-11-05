// Orvane — LA SIMULATION EN DIRECT, le vivant à l'écran (simulation/vivant.js)
// Le moteur fait vivre des populations ; cette page montre des bêtes. Chaque bête dessinée est un individu tiré de la population
// réelle (tampon/individus.js : son génotype, ses valeurs de taille, de vitesse, d'audace, de sociabilité, ses savoirs, son sexe),
// avec la silhouette de sa lignée (plan.corps, moteur/corps.js). Elle vit en temps réel : elle dort hors de ses heures (diurne,
// nocturne, crépusculaire), broute les plantes du lieu, chasse les proies que le moteur lui donne (Orvane.appetence), fuit ses
// prédateurs et le joueur (à la distance que lui donne sa méfiance, docs/12), suit son groupe (moteur/collectif.js, docs/38).
// Les naissances et les morts suivent le moteur : à chaque cycle, chaque population dessinée va vers son nouvel effectif, et ses
// morts se partagent comme celles du moteur (la prédation, que les chasseurs font sous nos yeux, la maladie, l'âge). Un petit
// naît d'une mère et d'un père dessinés (Mendel : Individus.croiser), d'un œuf chez les pondeurs (docs/25).
// Rien ici ne change le monde : seuls les gestes du joueur, notés, passent au moteur au cycle suivant (simulation.js).
'use strict';
(function (racine) {
const Corps = racine.OrvaneCorps, Individus = racine.OrvaneIndividus, Orvane = racine.Orvane, Dietes = racine.OrvaneDietes, Tampon = racine.OrvaneTampon;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const alea = graine => { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const R = Math.random;
const choisirPoids = (liste, poids) => { const s = poids.reduce((a, x) => a + x, 0); if (!(s > 0)) return null; let u = R() * s; for (let i = 0; i < liste.length; i++) { u -= poids[i]; if (u <= 0) return liste[i]; } return liste[liste.length - 1]; };
const TERRE = ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe'];
const NOCTURNES = new Set(['nocturne']);

// === la silhouette (celle de l'observatoire, monde/index.html : plan.corps, de profil) ===
function croquis(c, traits = []) {
  c = Corps.normaliser(c); const C = c.couleurs, rgbv = v => `rgb(${v.join(',')})`, k = 120, sol = 82, E2 = [];
  const Lt = (.26 + c.long * .34) * k, Th = (.2 - c.long * .05) * k, Hl = c.forme === 'serpent' ? 0 : (.07 + c.haut * .36) * k * (traits.includes('pattes-longues') ? 1.25 : 1);
  const bip = c.forme === 'bipede' || c.forme === 'oiseau', cx = 82, cy = sol - Hl - Th / 2, xa = cx + Lt / 2, xr = cx - Lt / 2;
  if (c.forme === 'serpent') { let d = ''; for (let i = 0; i <= 12; i++) { const x = 20 + i * 9, y = sol - 8 - Math.sin(i * .9) * 5; d += (i ? 'L' : 'M') + x + ' ' + y; }
    E2.push(`<path d="${d}" stroke="${rgbv(C.robe)}" stroke-width="${Th * .8}" fill="none" stroke-linecap="round"/>`, `<circle cx="132" cy="${sol - 12}" r="${Th * .55}" fill="${rgbv(C.robe)}"/>`, `<circle cx="136" cy="${sol - 14}" r="2" fill="${rgbv(C.oeil)}"/>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 90" width="170" height="90" aria-hidden="true">${E2.join('')}</svg>`; }
  const og = (ty, pl) => c.organes.find(o => o.type === ty && (!pl || o.place === pl)), tl = (ty, pl) => (og(ty, pl) || {}).taille || 0, acc = rgbv(Corps.tourner(C.robe, 150));
  let qx = xr + 2, qy = cy;
  if (c.queue > .08) { const L = (.06 + c.queue * .42) * k; qx = xr - L; qy = cy + (bip ? 4 : -L * .25); E2.push(`<path d="M${xr + 4} ${cy - Th * .1} Q${xr - L * .5} ${cy - Th * .2 - (traits.includes('queue-prehensile') ? L * .4 : 0)} ${qx} ${qy}" stroke="${rgbv(C.robe)}" stroke-width="${Th * .35}" fill="none" stroke-linecap="round"/>`); }
  if (og('massue')) E2.push(`<ellipse cx="${qx}" cy="${qy}" rx="${4 + tl('massue') * 6}" ry="${3.5 + tl('massue') * 5}" fill="${rgbv(C.sombre)}"/>`);
  if (og('aiguillon')) E2.push(`<path d="M${qx} ${qy} Q${qx - 4} ${qy - 8 - tl('aiguillon') * 10} ${qx + 6 + tl('aiguillon') * 6} ${qy - 10 - tl('aiguillon') * 12}" stroke="#3c2834" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  if (og('panache')) E2.push(`<path d="M${qx + 2} ${qy} L${qx - 8 - tl('panache') * 12} ${qy - 6 - tl('panache') * 8} L${qx - 6 - tl('panache') * 10} ${qy + 5}Z" fill="${acc}"/>`);
  if (og('epines', 'queue')) for (const d of [-3, 3]) E2.push(`<line x1="${qx}" y1="${qy}" x2="${qx + d}" y2="${qy - 6 - tl('epines', 'queue') * 6}" stroke="#e8dcc0" stroke-width="1.6"/>`);
  const paires = Math.max(1, c.pattes / 2);
  for (let i = 0; i < paires && c.pattes; i++) { const x = bip ? cx - 4 + i * 6 : xa - 6 - (Lt - 12) * i / Math.max(1, paires - 1);
    E2.push(`<line x1="${x}" y1="${cy + Th * .3}" x2="${x + (c.forme === 'hexapode' ? (i % 2 ? -6 : 6) : 0)}" y2="${sol}" stroke="${rgbv(C.sombre)}" stroke-width="${c.forme === 'hexapode' ? 2.5 : 4}"/>`); }
  if (c.ailes > .3) E2.push(`<path d="M${xa - Lt * .35} ${cy - Th * .3} L${xr - 6} ${cy - Th - c.ailes * 26} L${xr + 6} ${cy - Th * .2}Z" fill="${rgbv(C.sombre)}" opacity=".85"/>`);
  E2.push(`<ellipse cx="${cx}" cy="${cy}" rx="${Lt / 2 + 3}" ry="${Th / 2 + 1}" fill="${rgbv(C.robe)}"/>`, `<ellipse cx="${cx + 2}" cy="${cy + Th * .3}" rx="${Lt * .4}" ry="${Th * .18}" fill="${rgbv(C.ventre)}"/>`);
  if (c.carapace > .3) E2.push(`<path d="M${xr + 3} ${cy - 2} Q${cx} ${cy - Th * .9 - c.carapace * 6} ${xa - 3} ${cy - 2}Z" fill="${rgbv(C.sombre)}"/>`);
  const dos = cy - Th / 2 - (c.carapace > .3 ? 3 + c.carapace * 3 : 0);
  if (og('plaques')) { const n = 3 + Math.round(tl('plaques') * 3), h = 5 + tl('plaques') * 10; for (let i = 0; i < n; i++) { const x = xr + 6 + (Lt - 12) * (i + .5) / n, hh = h * (.7 + .3 * Math.sin(Math.PI * (i + .5) / n)); E2.push(`<path d="M${x - 4} ${dos + 1} L${x} ${dos - hh} L${x + 4} ${dos + 1}Z" fill="${acc}"/>`); } }
  if (og('crete', 'dos')) E2.push(`<path d="M${xr + 6} ${dos + 1} Q${cx} ${dos - 4 - tl('crete', 'dos') * 10} ${xa - 4} ${dos + 1}Z" fill="${acc}"/>`);
  if (og('nageoires')) E2.push(`<path d="M${cx - 8} ${dos + 1} L${cx - 2} ${dos - 6 - tl('nageoires') * 10} L${cx + 6} ${dos + 1}Z" fill="${rgbv(C.sombre)}"/>`, `<path d="M${xa - 8} ${cy + 2} L${xa - 18} ${cy + 8 + tl('nageoires') * 6} L${xa - 4} ${cy + 5}Z" fill="${rgbv(C.sombre)}"/>`);
  for (const pl of ['dos', 'flancs']) if (og('epines', pl)) { const n = 4 + Math.round(tl('epines', pl) * 3), l = 4 + tl('epines', pl) * 7, y0 = pl === 'dos' ? dos + 1 : cy;
    for (let i = 0; i < n; i++) { const x = xr + 6 + (Lt - 12) * (i + .5) / n; E2.push(`<line x1="${x}" y1="${y0}" x2="${x - 2}" y2="${y0 - l}" stroke="#e8dcc0" stroke-width="1.6"/>`); } }
  if (og('pinces')) { const l = 8 + tl('pinces') * 14, y = cy + Th * .25; E2.push(`<line x1="${xa - 4}" y1="${y}" x2="${xa + l}" y2="${y}" stroke="${rgbv(C.sombre)}" stroke-width="3"/>`, `<path d="M${xa + l} ${y} l5 -4 M${xa + l} ${y} l5 3" stroke="${rgbv(C.sombre)}" stroke-width="2.5" fill="none"/>`); }
  if (c.motif === 'rayures' || traits.includes('coloration-aposematique')) for (let i = 0; i < 4; i++) E2.push(`<line x1="${xr + 8 + i * Lt / 5}" y1="${cy - Th / 2}" x2="${xr + 6 + i * Lt / 5}" y2="${cy + Th / 4}" stroke="${traits.includes('coloration-aposematique') ? '#e8bc2a' : rgbv(C.sombre)}" stroke-width="3"/>`);
  if (c.motif === 'taches') for (let i = 0; i < 4; i++) E2.push(`<circle cx="${xr + 8 + i * Lt / 4.5}" cy="${cy - Th * .15 + (i % 2) * 4}" r="2.5" fill="${rgbv(C.sombre)}"/>`);
  if (c.motif === 'bandes') E2.push(`<line x1="${xr + 4}" y1="${cy - Th * .3}" x2="${xa - 4}" y2="${cy - Th * .3}" stroke="${rgbv(C.sombre)}" stroke-width="3"/>`);
  const hs = (.09 + c.tete * .09) * k, nl = c.cou * .3 * k, hx = xa + nl * .55 + hs * .3, hy = cy - Th * .15 - nl * .8 - (bip ? 8 : 0);
  if (nl > 3) E2.push(`<line x1="${xa - 4}" y1="${cy - Th * .1}" x2="${hx - hs * .3}" y2="${hy}" stroke="${rgbv(C.robe)}" stroke-width="${Th * .45}" stroke-linecap="round"/>`);
  if (c.museau > .12) E2.push(`<rect x="${hx + hs * .3}" y="${hy - hs * .1}" width="${(.03 + c.museau * .13) * k}" height="${hs * .45}" rx="2" fill="${c.forme === 'oiseau' ? '#d6ac5c' : rgbv(C.robe)}"/>`);
  if (og('collerette')) E2.push(`<ellipse cx="${hx - hs * .45}" cy="${hy}" rx="${hs * (.35 + tl('collerette') * .3)}" ry="${hs * (.8 + tl('collerette') * .8)}" fill="${acc}"/>`);
  E2.push(`<circle cx="${hx}" cy="${hy}" r="${hs / 2}" fill="${rgbv(C.robe)}"/>`);
  if (og('trompe')) E2.push(`<path d="M${hx + hs * .4} ${hy} Q${hx + hs * .9 + tl('trompe') * 8} ${hy + 4} ${hx + hs * .7} ${hy + hs * .5 + tl('trompe') * 22}" stroke="${rgbv(C.robe)}" stroke-width="${hs * .3}" fill="none" stroke-linecap="round"/>`);
  if (og('defenses')) E2.push(`<path d="M${hx + hs * .35} ${hy + hs * .25} Q${hx + hs * .8 + tl('defenses') * 10} ${hy + hs * .6} ${hx + hs * .9 + tl('defenses') * 14} ${hy - tl('defenses') * 6}" stroke="#f4f0e4" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  if (c.oreilles > .25) E2.push(`<path d="M${hx - hs * .3} ${hy - hs * .3} L${hx - hs * .55} ${hy - hs * .5 - c.oreilles * 14} L${hx - hs * .05} ${hy - hs * .4}Z" fill="${rgbv(C.robe)}"/>`);
  if (c.cornes > .25 && og('cornes')?.nombre === 1) E2.push(`<path d="M${hx + hs * .3} ${hy - hs * .3} L${hx + hs * .45} ${hy - hs * .5 - c.cornes * 16} L${hx + hs * .6} ${hy - hs * .25}Z" fill="#e8dcc0"/>`);
  else if (c.cornes > .25) E2.push(`<path d="M${hx - hs * .1} ${hy - hs * .4} Q${hx - hs * .2} ${hy - hs - c.cornes * 16} ${hx - hs * .9} ${hy - hs * .7 - c.cornes * 18}" stroke="#e8dcc0" stroke-width="3" fill="none"/>`);
  if (tl('crete', 'tete') > .25) E2.push(`<path d="M${hx - hs * .6} ${hy - hs * .35} Q${hx - hs * .1} ${hy - hs * .5 - tl('crete', 'tete') * 14} ${hx + hs * .3} ${hy - hs * .4}Z" fill="${acc}"/>`);
  if (c.antennes > .25) E2.push(`<path d="M${hx + hs * .1} ${hy - hs * .4} Q${hx + hs * .5} ${hy - hs - c.antennes * 14} ${hx + hs * 1.3} ${hy - hs * .9 - c.antennes * 12}" stroke="${rgbv(C.sombre)}" stroke-width="1.5" fill="none"/>`);
  if (traits.includes('crocs-allonges')) E2.push(`<line x1="${hx + hs * .5}" y1="${hy + hs * .3}" x2="${hx + hs * .5}" y2="${hy + hs * .3 + 6}" stroke="#f4f0e4" stroke-width="2"/>`);
  E2.push(`<circle cx="${hx + hs * .15}" cy="${hy - hs * .08}" r="${traits.includes('yeux-nocturnes') ? 3.4 : 2.2}" fill="${rgbv(C.oeil)}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 90" width="170" height="90" aria-hidden="true">${E2.join('')}</svg>`;
}
// une machine de la Mère (docs/16) : un corps de métal, ses modules (panneau, foreuse, pince, arme, blindage), un œil
function machine(plan) {
  const Mo = plan.modules || {}, E2 = [], metal = Mo.blindage > .3 ? '#5b6670' : '#8a949c', oeil = plan.role === 'regulateur' ? '#e05a3c' : '#5ad1e0';
  E2.push(`<rect x="52" y="40" width="64" height="30" rx="8" fill="${metal}" stroke="#2f363c" stroke-width="2"/>`, `<rect x="98" y="30" width="26" height="20" rx="5" fill="#6f7a83" stroke="#2f363c" stroke-width="2"/>`, `<circle cx="114" cy="40" r="4.5" fill="${oeil}"/>`);
  for (const x of [58, 78, 98]) E2.push(`<line x1="${x + 4}" y1="70" x2="${x}" y2="82" stroke="#2f363c" stroke-width="4" stroke-linecap="round"/>`);
  if (Mo.panneau > .2) E2.push(`<path d="M50 34 L104 28 L104 34 L50 40Z" fill="#2e4a7a" stroke="#9fb8e0" stroke-width="1"/>`);
  if (Mo.foreuse > .2) E2.push(`<path d="M52 58 L32 62 L52 66Z" fill="#c9a24a"/>`);
  if (Mo.pince > .2) E2.push(`<path d="M124 46 L140 52 M140 52 l6 -5 M140 52 l6 4" stroke="#2f363c" stroke-width="3" fill="none"/>`);
  if (Mo.arme > .1) E2.push(`<line x1="104" y1="30" x2="132" y2="22" stroke="#7a2f2a" stroke-width="3"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 90" width="170" height="90" aria-hidden="true">${E2.join('')}</svg>`;
}
// une larve (docs/26) : un corps en anneaux, de la teinte de sa lignée
function larve(c) {
  const C = (c && Corps.normaliser(c).couleurs) || { robe: [150, 140, 100], sombre: [90, 80, 60] }, E2 = [];
  for (let i = 0; i < 7; i++) E2.push(`<circle cx="${40 + i * 13}" cy="${74 - Math.sin(i * .8) * 3}" r="${8 - Math.abs(i - 3) * .6}" fill="rgb(${(i % 2 ? C.sombre : C.robe).join(',')})"/>`);
  E2.push(`<circle cx="124" cy="72" r="2" fill="#222"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 90" width="170" height="90" aria-hidden="true">${E2.join('')}</svg>`;
}
const IMAGES = new Map();
function image(cle, svg) {
  let im = IMAGES.get(cle); if (im) return im;
  im = new Image(); im.decoding = 'async'; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('width="170" height="90"', 'width="340" height="180"'));
  IMAGES.set(cle, im); return im;
}

// === le décor d'un biome : le ciel, le sol ou l'eau, ses plantes, à sa saison ===
function couleursDe(b) {
  const a = b.axes_saison || b.axes || {}, t = a.temperature ?? .5, h = a.humidite ?? .5, alt = a.altitude ?? .3, l = a.lumiere ?? .7, c = a.couvert ?? .3, id = b.id || '';
  let sol = [128, 152, 86];
  sol = mix(sol, [212, 184, 122], clamp((.38 - h) * 3, 0, 1) * clamp((t - .35) * 3, 0, 1));
  sol = mix(sol, [154, 144, 122], clamp((.38 - h) * 3, 0, 1) * clamp((.5 - t) * 3, 0, 1));
  sol = mix(sol, [76, 104, 62], clamp((h - .7) * 3, 0, 1));
  sol = mix(sol, [62, 86, 52], c * .45);
  sol = mix(sol, [142, 140, 134], clamp((alt - .6) * 2.5, 0, 1));
  sol = mix(sol, [236, 240, 243], clamp((.24 - t) * 5, 0, 1));
  if (/volcan|braises|caldeira/.test(id)) sol = mix(sol, [64, 50, 46], .8);
  if (/canyon/.test(id)) sol = mix(sol, [178, 102, 70], .7);
  if (/cristal/.test(id)) sol = mix(sol, [150, 160, 190], .5);
  if (/ossuaire/.test(id)) sol = mix(sol, [196, 186, 160], .6);
  if (/cerisaie/.test(id)) sol = mix(sol, [150, 160, 104], .4);
  const ciel = mix([126, 150, 178], [156, 200, 230], l), eau = b.milieu === 'marin' ? mix([34, 96, 132], [8, 22, 40], clamp((/abysses/.test(id) ? .95 : alt < .1 ? .3 : 0) + (1 - l) * .4, 0, 1)) : mix([58, 112, 120], [36, 70, 70], h * .4);
  if (/recif/.test(id)) eau.splice(0, 3, ...mix(eau, [40, 150, 170], .5));
  return { sol, ciel, eau, t, h, alt, l, c };
}
function zonesDe(b, W, H) {
  const m = b.milieu;
  if (m === 'marin' || m === 'aquatique') return { type: 'eau', horizon: 0, surface: Math.round(H * .07), fond: Math.round(H * .86) };
  if (m === 'amphibie') return { type: 'rive', horizon: Math.round(H * .17), rive: Math.round(H * .56) };
  if (m === 'souterrain') return { type: 'grotte', horizon: Math.round(H * .3) };
  return { type: 'terre', horizon: Math.round(H * .2) };
}
const FORMES_N = { herbe: 260, buisson: 34, arbre: 16, roseau: 70, algue: 46, lichen: 70, succulente: 18, champignon: 40 };
function dessinerDecor(sc) {
  const b = sc.biomeObj, W = sc.W, H = sc.H, dpr = sc.dpr, cv = sc.decor; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const K = couleursDe(b), Z = sc.zones, r = alea(hash(b.id + ':' + (sc.vue?.cycle?.saison?.nom || '')));
  const saison = sc.vue?.cycle?.saison?.nom, neige = K.t < .26 || (saison === 'hiver' && K.t < .36), automne = saison === 'automne' && K.t < .7;
  sc.plantes = [];
  if (Z.type === 'eau') {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(mix(K.eau, [200, 230, 240], .35))); g.addColorStop(.25, rgb(K.eau)); g.addColorStop(1, rgb(mix(K.eau, [5, 10, 20], .6)));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = rgb(mix(K.ciel, [255, 255, 255], .2)); x.fillRect(0, 0, W, Z.surface);
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= W; i += 8) x.lineTo(i, Z.surface + Math.sin(i * .05) * 2); x.stroke();
    for (let i = 0; i < 6; i++) { const x0 = r() * W; const gg = x.createLinearGradient(x0, Z.surface, x0 + 40, H * .7); gg.addColorStop(0, 'rgba(255,255,255,.10)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.beginPath(); x.moveTo(x0, Z.surface); x.lineTo(x0 + 30, Z.surface); x.lineTo(x0 + 110, H * .75); x.lineTo(x0 + 60, H * .75); x.fill(); }
    const fondC = /abysses/.test(b.id) ? [30, 30, 36] : /recif/.test(b.id) ? [214, 196, 150] : [150, 136, 104];
    x.fillStyle = rgb(mix(fondC, K.eau, .35)); x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 12) x.lineTo(i, Z.fond + Math.sin(i * .02 + 1) * 6 + r() * 3); x.lineTo(W, H); x.fill();
    if (/recif/.test(b.id)) for (let i = 0; i < 26; i++) { const cx = r() * W, cy = Z.fond + r() * (H - Z.fond); x.fillStyle = rgb([[230, 110, 100], [240, 170, 80], [180, 100, 190], [250, 220, 120]][i % 4], .85); for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(cx + (r() - .5) * 18, cy - j * 5, 5 + r() * 4, 0, 7); x.fill(); } }
  } else {
    const g = x.createLinearGradient(0, 0, 0, Z.horizon); const ciel = Z.type === 'grotte' ? [28, 26, 30] : K.ciel;
    g.addColorStop(0, rgb(mix(ciel, [70, 110, 160], Z.type === 'grotte' ? 0 : .3))); g.addColorStop(1, rgb(mix(ciel, [240, 236, 220], Z.type === 'grotte' ? 0 : .45))); x.fillStyle = g; x.fillRect(0, 0, W, Z.horizon + 2);
    if (Z.type !== 'grotte') { x.fillStyle = rgb(mix(K.sol, K.ciel, .55)); x.beginPath(); x.moveTo(0, Z.horizon); for (let i = 0; i <= W; i += 20) x.lineTo(i, Z.horizon - 6 - Math.abs(Math.sin(i * .013 + hash(b.id) % 7)) * (K.alt * 40 + 8)); x.lineTo(W, Z.horizon); x.fill(); }
    let sol = neige ? mix(K.sol, [238, 242, 246], .75) : automne ? mix(K.sol, [170, 130, 70], .25) : K.sol; if (Z.type === 'grotte') sol = mix(K.sol, [40, 36, 34], .7);
    const gs = x.createLinearGradient(0, Z.horizon, 0, H); gs.addColorStop(0, rgb(mix(sol, K.ciel, .25))); gs.addColorStop(1, rgb(mix(sol, [20, 20, 16], .25))); x.fillStyle = gs; x.fillRect(0, Z.horizon, W, H - Z.horizon);
    for (let i = 0; i < 260; i++) { const yy = Z.horizon + r() ** .7 * (H - Z.horizon), p = .4 + .6 * (yy - Z.horizon) / (H - Z.horizon); x.fillStyle = rgb(mix(sol, r() < .5 ? [0, 0, 0] : [255, 255, 255], .08 + r() * .06), .6); x.fillRect(r() * W, yy, 2 + 5 * p * r(), 1 + 2 * p); }
    if (Z.type === 'rive') { const ge = x.createLinearGradient(0, Z.rive, 0, H); ge.addColorStop(0, rgb(mix(K.eau, [210, 230, 230], .3))); ge.addColorStop(1, rgb(mix(K.eau, [10, 20, 26], .45))); x.fillStyle = ge; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 10) x.lineTo(i, Z.rive + Math.sin(i * .03) * 5); x.lineTo(W, H); x.fill(); }
    if (Z.type === 'terre' && sc.mare) { const m = sc.mare; x.fillStyle = rgb(mix(K.eau, [200, 220, 230], .2)); x.beginPath(); x.ellipse(m.x + m.w / 2, m.y + m.h / 2, m.w / 2, m.h / 2, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.3)'; x.stroke(); }
    if (Z.type === 'grotte') { x.fillStyle = '#1d1b1f'; for (let i = 0; i < 18; i++) { const cx = r() * W, l = 20 + r() * 60; x.beginPath(); x.moveTo(cx - 8, 0); x.lineTo(cx + 8, 0); x.lineTo(cx, l); x.fill(); } }
    if (/volcan|braises|caldeira/.test(b.id)) { x.strokeStyle = 'rgba(255,120,40,.7)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { let px = r() * W, py = Z.horizon + r() * (H - Z.horizon); x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - .5) * 40; py += r() * 14; x.lineTo(px, py); } x.stroke(); } }
    if (/cristal/.test(b.id)) for (let i = 0; i < 14; i++) { const cx = r() * W, cy = Z.horizon + r() * (H - Z.horizon), h = 10 + r() * 26; x.fillStyle = rgb([[140, 200, 230], [190, 150, 230], [150, 230, 200]][i % 3], .8); x.beginPath(); x.moveTo(cx - 5, cy); x.lineTo(cx, cy - h); x.lineTo(cx + 5, cy); x.fill(); }
    if (/ossuaire/.test(b.id)) { x.strokeStyle = 'rgba(240,232,214,.85)'; x.lineWidth = 3; x.lineCap = 'round'; for (let i = 0; i < 16; i++) { const cx = r() * W, cy = Z.horizon + 10 + r() * (H - Z.horizon - 10), a = r() * 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 4); x.stroke(); } }
  }
  // les plantes du lieu (la flore de la vue : sa forme, sa part de la capacité), plus ou moins défendues (toxiques, épineuses)
  const F = (sc.vue?.flore?.[b.id] || []).slice().sort((p, q) => (q.hauteur || 0) - (p.hauteur || 0)), pts = [];
  for (const p of F) { const n = Math.round(clamp(p.part, 0, 1.5) * (FORMES_N[p.forme] || 30) * clamp(W * H / 4e5, .5, 1.8)); const fr = p.frequences || [1, 0, 0, 0];
    for (let i = 0; i < n; i++) { const pos = placePlante(sc, p.forme, r); if (!pos) continue; const d = r(), def = d < fr[0] ? 0 : d < fr[0] + fr[1] ? 1 : d < fr[0] + fr[1] + fr[2] ? 2 : 3; pts.push({ ...pos, forme: p.forme, def, id: p.id, g: r() }); } }
  pts.sort((p, q) => p.y - q.y);
  for (const p of pts) plante(x, p, K, sc, neige, automne);
  sc.plantes = pts.filter(p => p.forme !== 'arbre' || r() < .6);
}
function placePlante(sc, forme, r) {
  const Z = sc.zones, W = sc.W, H = sc.H;
  if (Z.type === 'eau') { if (forme === 'algue' || forme === 'roseau' || forme === 'lichen') return { x: r() * W, y: Z.fond + r() * (H - Z.fond - 4) }; return { x: r() * W, y: Z.fond + r() * (H - Z.fond - 4) }; }
  if (Z.type === 'rive') { if (forme === 'algue') return { x: r() * W, y: Z.rive + 10 + r() * (H - Z.rive - 14) }; if (forme === 'roseau') return { x: r() * W, y: Z.rive - 18 + r() * 34 }; return { x: r() * W, y: Z.horizon + 6 + r() ** .8 * (Z.rive - Z.horizon - 8) }; }
  if (forme === 'algue') { if (!sc.mare) return null; const m = sc.mare; return { x: m.x + m.w * (.15 + r() * .7), y: m.y + m.h * (.3 + r() * .5) }; }
  return { x: r() * W, y: Z.horizon + 4 + r() ** .8 * (H - Z.horizon - 6) };
}
function plante(x, p, K, sc, neige, automne) {
  const Z = sc.zones, prof = Z.type === 'eau' ? 1 : .55 + .6 * (p.y - Z.horizon) / Math.max(1, sc.H - Z.horizon), s = sc.echelle * prof;
  const vert = mix(neige ? [120, 140, 120] : automne ? [176, 120, 50] : [74, 120, 58], K.sol, .2), tox = p.def === 1 || p.def === 3, epi = p.def >= 2;
  const feuille = tox ? mix(vert, [120, 80, 130], .22) : vert;
  x.save(); x.translate(p.x, p.y);
  switch (p.forme) {
    case 'herbe': x.strokeStyle = rgb(mix(feuille, [220, 220, 140], p.g * .3), .9); x.lineWidth = 1.2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo((i - 1.5) * 2 * s, 0); x.lineTo((i - 1.5) * 3 * s + (p.g - .5) * 4, -(6 + p.g * 6) * s); x.stroke(); } if (p.def === 0 && sc.vue?.cycle?.saison?.nom === 'printemps' && p.g > .8) { x.fillStyle = '#f2d36b'; x.beginPath(); x.arc(0, -10 * s, 1.6 * s, 0, 7); x.fill(); } break;
    case 'buisson': x.fillStyle = rgb(mix(feuille, [30, 60, 30], .2)); x.beginPath(); x.arc(0, -7 * s, 9 * s, 0, 7); x.arc(-7 * s, -4 * s, 6 * s, 0, 7); x.arc(7 * s, -4 * s, 6 * s, 0, 7); x.fill(); if (epi) { x.strokeStyle = '#efe6cf'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = i * 1.05; x.beginPath(); x.moveTo(Math.cos(a) * 9 * s, -7 * s + Math.sin(a) * 9 * s); x.lineTo(Math.cos(a) * 12 * s, -7 * s + Math.sin(a) * 12 * s); x.stroke(); } } break;
    case 'arbre': { const conif = K.t < .4 || /taiga|sommets|montagne|neige/.test(sc.biomeObj.id), rose = /cerisaie/.test(sc.biomeObj.id), h = (34 + p.g * 22) * s;
      x.fillStyle = '#5a4130'; x.fillRect(-2.2 * s, -h * .45, 4.4 * s, h * .45);
      if (conif) { x.fillStyle = rgb(neige ? mix(feuille, [235, 240, 245], .45) : mix(feuille, [20, 50, 30], .35)); x.beginPath(); x.moveTo(0, -h); x.lineTo(-11 * s, -h * .32); x.lineTo(11 * s, -h * .32); x.fill(); }
      else { x.fillStyle = rgb(rose ? mix([236, 170, 196], feuille, .1) : neige ? mix(feuille, [220, 226, 230], .5) : feuille); x.beginPath(); x.arc(0, -h * .72, 12 * s, 0, 7); x.arc(-8 * s, -h * .55, 9 * s, 0, 7); x.arc(8 * s, -h * .55, 9 * s, 0, 7); x.fill(); }
      if (epi) { x.strokeStyle = 'rgba(240,230,205,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-2 * s, -h * .2); x.lineTo(-6 * s, -h * .25); x.moveTo(2 * s, -h * .3); x.lineTo(6 * s, -h * .35); x.stroke(); } break; }
    case 'roseau': x.strokeStyle = rgb(mix(feuille, [150, 140, 80], .4)); x.lineWidth = 1.4; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo((i - 1) * 3 * s, 0); x.lineTo((i - 1) * 4 * s, -(18 + p.g * 10) * s); x.stroke(); } x.fillStyle = '#6b4a2e'; x.fillRect(-1.5 * s, -(20 + p.g * 10) * s, 3 * s, 6 * s); break;
    case 'algue': x.strokeStyle = rgb(mix(feuille, [40, 120, 90], .5), .85); x.lineWidth = 2.2 * s; x.beginPath(); x.moveTo(0, 0); for (let i = 1; i <= 6; i++) x.lineTo(Math.sin(i + p.g * 6) * 4 * s, -i * 5 * s); x.stroke(); break;
    case 'lichen': x.fillStyle = rgb(mix([170, 180, 120], [220, 140, 80], p.g), .8); x.beginPath(); x.ellipse(0, 0, 5 * s, 2 * s, 0, 0, 7); x.fill(); break;
    case 'succulente': x.fillStyle = rgb(mix(feuille, [90, 140, 90], .5)); x.fillRect(-3 * s, -16 * s, 6 * s, 16 * s); x.fillRect(-9 * s, -11 * s, 4 * s, 7 * s); x.fillRect(5 * s, -13 * s, 4 * s, 8 * s); if (epi) { x.fillStyle = '#efe6cf'; for (let i = 0; i < 5; i++) x.fillRect(-4 * s, -14 * s + i * 3 * s, 1, 1); } break;
    case 'champignon': x.fillStyle = '#e8dcc6'; x.fillRect(-1.2 * s, -5 * s, 2.4 * s, 5 * s); x.fillStyle = tox ? '#b8433a' : '#a8784c'; x.beginPath(); x.arc(0, -5 * s, 5 * s, Math.PI, 0); x.fill(); break;
  }
  x.restore();
}

// === une espèce à l'écran : ce que le moteur dit d'elle, ce que la page en tire ===
function especeDe(sc, t, pop) {
  const P = t.plan || {}, L = P.locomotion || [], m = P.masse_kg || 1, syn = P.regime === 'synthetique';
  const vol = L.includes('vol'), nage = L.includes('nage'), terre = L.some(l => TERRE.includes(l)) || syn;
  const largeur = clamp(46 + 13 * Math.log10(Math.max(1e-4, m)), 24, 112);   // (la boîte de la silhouette : le corps en occupe à peu près les deux cinquièmes)
  const vit = P.vitesse_rel || 4;
  return { id: t.id, nom: t.nom_commun || t.nom || t.id, t, pop, plan: P, regime: P.regime, masse: m, syn, vol, nage, terre, activite: P.activite || 'continue',
    largeur, sprint: clamp(7 * Math.sqrt(vit) * Math.sqrt(largeur / 24), 10, 150), perception: P.perception ?? .5,
    ovipare: P.reproduction === 'ovipare', stades: !!P.stades, longevite: Math.max(3, P.longevite || 30), maturite: Math.max(.5, P.maturite || 3),
    proies: new Map(), predateurs: new Set(), budget: 0, dessines: 0, groupe: pop.groupe || null, nocturne: NOCTURNES.has(P.activite) || (t.phenotypes || []).some(ph => (ph.traits || []).includes('yeux-nocturnes') && (ph.frequence || 0) > .3) };
}
function chaine(sc) {
  const E = [...sc.especes.values()], DT = !!(Dietes && sc.vue?.monde?.dietes);
  for (const a of E) { a.proies.clear(); a.predateurs.clear(); }
  for (const p of E) { if (!['carnivore', 'omnivore'].includes(p.regime) && !(p.syn && p.plan.role === 'regulateur')) continue;
    for (const q of E) { if (q === p || q.syn) continue; let f = p.syn ? (q.masse * 3 <= p.masse ? .5 : 0) : Orvane?.appetence ? Orvane.appetence(p.plan, q.plan) : 0;
      if (f > 0 && DT && Dietes.appetence && !p.syn) { try { f = Dietes.appetence(p.plan, q.plan, f); } catch (e) { } }
      if (f > .02) { p.proies.set(q.id, f); q.predateurs.add(p.id); } } }
}

// === la scène ===
function creer(canvas, opt = {}) {
  const sc = { cv: canvas, ctx: canvas.getContext('2d'), decor: document.createElement('canvas'), W: 1, H: 1, dpr: 1, echelle: 1, vue: null, biome: null, biomeObj: null, zones: null,
    especes: new Map(), agents: [], plantes: [], carcasses: [], oeufs: [], effets: [], plan: [], seq: 0, groupes: new Map(),
    horloge: { debut: performance.now(), duree: 30000 }, joueur: { x: 0, y: 0, actif: false, jusqua: 0 }, choisi: null, surligne: null, rencontres: {},
    options: { densite: 1, etiquettes: true, fuite: true, meteo: true, nuit: true, journee: 'cycle' }, jour: .3, profil: null, catastrophe: null, meteo: null, temps: 0, ...opt, run: false };
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); sc.joueur.x = e.clientX - r.left; sc.joueur.y = e.clientY - r.top; sc.joueur.actif = true; sc.joueur.jusqua = performance.now() + (e.pointerType === 'mouse' ? 1e9 : 2500); });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') sc.joueur.actif = false; });
  canvas.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); sc.joueur.x = e.clientX - r.left; sc.joueur.y = e.clientY - r.top; sc.joueur.actif = true; sc.joueur.jusqua = performance.now() + 2500; });
  canvas.addEventListener('click', e => { const r = canvas.getBoundingClientRect(), a = toucher(sc, e.clientX - r.left, e.clientY - r.top); sc.surToucher?.(a, e.clientX - r.left, e.clientY - r.top); });
  return sc;
}
function redimensionner(sc) {
  const r = sc.cv.getBoundingClientRect(), W = Math.max(200, Math.round(r.width)), H = Math.max(160, Math.round(r.height)), dpr = Math.min(2, racine.devicePixelRatio || 1);
  if (W === sc.W && H === sc.H && dpr === sc.dpr) return false;
  const fx = W / sc.W, fy = H / sc.H; for (const a of sc.agents) { a.x *= fx; a.y *= fy; a.cx *= fx; a.cy *= fy; }
  sc.W = W; sc.H = H; sc.dpr = dpr; sc.cv.width = Math.round(W * dpr); sc.cv.height = Math.round(H * dpr);
  sc.echelle = clamp(Math.sqrt(W * H) / 700, .55, 1.25);
  if (sc.biomeObj) { sc.zones = zonesDe(sc.biomeObj, W, H); dessinerDecor(sc); for (const a of sc.agents) { a.zone = zoneDe(sc, a.esp, a.zone?.eau); a.x = clamp(a.x, a.zone.x0, a.zone.x1); a.y = clamp(a.y, a.zone.y0, a.zone.y1); } }
  return true;
}
// là où une bête peut aller : le sol, l'eau, le fond, la mare ; un amphibien choisit l'un ou l'autre
function zoneDe(sc, esp, versEau) {
  const Z = sc.zones, W = sc.W, H = sc.H, m = 6;
  if (Z.type === 'eau') { if (esp.nage || esp.vol) return { x0: m, x1: W - m, y0: Z.surface + 10, y1: Z.fond + 4, eau: true }; return { x0: m, x1: W - m, y0: Z.fond + 6, y1: H - 4, eau: false }; }
  if (Z.type === 'rive') { const eau = esp.nage && (!esp.terre || (versEau ?? R() < .45));
    return eau ? { x0: m, x1: W - m, y0: Z.rive + 12, y1: H - 6, eau: true } : { x0: m, x1: W - m, y0: Z.horizon + 6, y1: Z.rive + 4, eau: false }; }
  if (Z.type === 'terre' && esp.nage && !esp.terre && sc.mare) { const M = sc.mare; return { x0: M.x + 8, x1: M.x + M.w - 8, y0: M.y + 6, y1: M.y + M.h - 4, eau: true }; }
  return { x0: m, x1: W - m, y0: Z.horizon + 6, y1: H - 4, eau: false };
}
const profondeur = (sc, y) => sc.zones.type === 'eau' ? .85 + .25 * (y / sc.H) : .58 + .55 * clamp((y - sc.zones.horizon) / Math.max(1, sc.H - sc.zones.horizon), 0, 1);
// combien de bêtes dessiner pour chaque population : selon la racine de son effectif, au moins une si le jeu la montrerait
function repartir(sc, pops) {
  const B = Math.round(clamp(sc.W * sc.H / 3800, 50, 280) * sc.options.densite), seuil = sc.profil?.exposition?.seuil_extinction_jeu ?? 0;
  const vis = pops.filter(([, p]) => p.effectif >= Math.max(1, seuil)), poids = vis.map(([, p]) => Math.sqrt(p.effectif)), S = poids.reduce((a, x) => a + x, 0) || 1, out = new Map();
  vis.forEach(([t, p], i) => out.set(t.id, Math.min(Math.round(p.effectif), Math.max(1, Math.round(B * poids[i] / S)))));
  return out;
}
// ce que le jeu montrerait d'une population : la compression du profil (Tampon.exposer, docs/5), puis une bête tirée sachant cela
function tirerBete(sc, esp) {
  const t = esp.t, cat = sc.vue.catalogue?.traits || {};
  let montre = null;
  try { if (Tampon?.exposer && sc.profil?.exposition && t.phenotypes?.length > 1) { const ex = Tampon.exposer(t, { exposition: { compression: { defaut: 1 }, ...sc.profil.exposition } }, cat, sc.biome);
      const ids = Object.keys(ex), ph = choisirPoids(ids, ids.map(k => ex[k])); montre = t.phenotypes.find(p => p.id === ph)?.traits || null; } } catch (e) { montre = null; }
  return Individus.tirer(sc.vue, t.id, sc.biome, { r: R, ...(montre ? { montre } : {}) });
}
function nouvelAgent(sc, esp, ind, x, y, age) {
  const cat = sc.vue.catalogue?.traits || {}, traits = Individus.montre(ind, cat), zone = zoneDe(sc, esp);
  const variation = sc.profil?.exposition?.quantitatifs?.variation ?? 1, Q = sc.vue.catalogue?.quantitatifs || {}, z = ind.z || {};
  const fT = Math.exp((Q.taille?.echelle ?? .05) * (z.taille || 0) * 3 * variation), fV = Math.exp((Q.vitesse?.echelle ?? .07) * (z.vitesse || 0) * 3 * variation);
  const cle = esp.syn ? 'syn:' + esp.id : esp.id + '|' + traits.join(',');
  const a = { id: ++sc.seq, esp, ind, traits, x: x ?? zone.x0 + R() * (zone.x1 - zone.x0), y: y ?? zone.y0 + R() * (zone.y1 - zone.y0), vx: 0, vy: 0, cx: 0, cy: 0, zone, dir: R() < .5 ? -1 : 1,
    fT, fV, age: age ?? R() * esp.longevite, etat: 'errer', t: 0, faim: R() * .6, cible: null, mort: 0, cause: null, groupe: null, decal: [(R() - .5) * 2, (R() - .5) * 2], chrono: (R() - .5) * .12,
    img: esp.syn ? image(cle, machine(esp.plan)) : esp.plan.corps ? image(cle, croquis(esp.plan.corps, traits)) : null, larve: esp.stades && esp.plan.corps ? image('larve:' + esp.id, larve(esp.plan.corps)) : null,
    vol: 0, pas: R() * 6, rencontre: false, malade: !!esp.pop.maladie && R() < clamp((esp.pop.maladie?.virulence || .05) * 4, .05, .6), ne: performance.now() };
  a.cx = a.x; a.cy = a.y; return a;
}
// installer un biome, ou faire suivre au nouvel état du monde les bêtes déjà là
function installer(sc, vue, biome, opt = {}) {
  const change = biome !== sc.biome || !sc.vue; sc.vue = vue; sc.profil = opt.profil || sc.profil; Object.assign(sc.options, opt.options || {});
  sc.biome = biome; sc.biomeObj = vue.biomes.find(b => b.id === biome) || vue.biomes[0]; if (!sc.biomeObj) return;
  sc.biome = sc.biomeObj.id; redimensionner(sc); sc.zones = zonesDe(sc.biomeObj, sc.W, sc.H);
  const pops = vue.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal').map(t => [t, t.populations.find(p => p.biome === sc.biome)]).filter(([, p]) => p && p.effectif >= 1);
  const aquatiquesSeuls = pops.some(([t]) => (t.plan.locomotion || []).includes('nage') && !(t.plan.locomotion || []).some(l => TERRE.includes(l)));
  if (change) { const rr = alea(hash(sc.biome)); sc.mare = sc.zones.type === 'terre' && (aquatiquesSeuls || (sc.biomeObj.axes?.humidite ?? 0) > .62) ? { x: sc.W * (.55 + rr() * .2), y: sc.zones.horizon + (sc.H - sc.zones.horizon) * .45, w: sc.W * .3, h: (sc.H - sc.zones.horizon) * .28 } : null; }
  const ancien = sc.especes; sc.especes = new Map(pops.map(([t, p]) => { const e = especeDe(sc, t, p), a = ancien.get(t.id); if (a) e.budget = a.budget; return [t.id, e]; }));
  chaine(sc);
  for (const a of sc.agents) { const e = sc.especes.get(a.esp.id); if (e) { a.esp = e; if (!a.malade && e.pop.maladie && R() < .3) a.malade = true; if (a.malade && !e.pop.maladie) a.malade = false; } }
  const cible = repartir(sc, pops);
  sc.catastrophe = (vue.evenements || []).find(e => e.type === 'catastrophe' && e.biome === sc.biome) || null;
  sc.meteo = { pluie: (sc.biomeObj.axes_saison?.humidite ?? .5) > .7 && (hash(sc.biome + vue.cycle.n) % 3 === 0), n: vue.cycle.n };
  if (change || opt.decor !== false) dessinerDecor(sc);
  if (change) {   // un biome neuf : sa population dessinée d'un coup, les groupes ensemble
    sc.agents = []; sc.carcasses = []; sc.oeufs = []; sc.effets = []; sc.plan = []; sc.groupes = new Map(); sc.choisi = null; sc.rencontres = {};
    for (const [id, n] of cible) { const e = sc.especes.get(id); const g = tailleGroupe(e); let chef = null, k = 0;
      for (let i = 0; i < n; i++) { if (k === 0) chef = null; const ind = tirerBete(sc, e); if (!ind) continue;
        const a = nouvelAgent(sc, e, ind, chef ? clamp(chef.x + (R() - .5) * 60 * sc.echelle, chef.zone.x0, chef.zone.x1) : undefined, chef ? clamp(chef.y + (R() - .5) * 30 * sc.echelle, chef.zone.y0, chef.zone.y1) : undefined);
        if (chef) { a.zone = chef.zone; a.groupe = chef.groupe; sc.groupes.get(chef.groupe).push(a); } else if (g > 1) { a.groupe = a.id; sc.groupes.set(a.id, [a]); chef = a; }
        sc.agents.push(a); k = (k + 1) % g; } }
  } else if (opt.plan !== false) planifier(sc, cible, opt.duree || sc.horloge.duree);   // (un réglage qui change la vue n'est pas un cycle : rien ne naît ni ne meurt pour lui)
  for (const e of sc.especes.values()) e.dessines = 0; for (const a of sc.agents) if (!a.mort) a.esp.dessines++;
  for (const a of sc.agents) a.rencontre = false;
}
const tailleGroupe = e => { const g = e.groupe; if (!g || g.forme === 'solitaire') return 1; return clamp(Math.round(g.taille?.typ || 2), 1, 12); };
// le plan du cycle qui commence : combien naissent, combien meurent, et de quoi (les parts de morts du moteur)
function planifier(sc, cible, duree) {
  const t0 = performance.now(); for (const p of sc.plan) p.t = Math.min(p.t, t0 + 400 + R() * 600);   // ce qui restait du cycle d'avant se fait vite
  for (const e of sc.especes.values()) {
    const vivants = sc.agents.filter(a => a.esp === e && !a.mort).length, but = cible.get(e.id) ?? 0, p = e.pop;
    const roul = vivants * clamp(1.5 / e.longevite, .01, .3), diff = but - vivants;
    const morts = alea0(roul + Math.max(0, -diff)), naissances = alea0(roul + Math.max(0, diff));
    const pPred = clamp(p.predation || 0, 0, 1) * (e.predateurs.size ? 1 : 0), pMal = clamp(p.maladie?.part || 0, 0, 1);
    e.budget = Math.max(0, e.budget * .3) + morts * pPred;
    const autres = Math.max(0, Math.round(morts * (1 - pPred)));
    for (let i = 0; i < autres; i++) sc.plan.push({ t: t0 + R() * duree * .95, type: 'mort', esp: e.id, cause: R() < pMal / Math.max(1e-9, 1 - pPred) ? 'maladie' : 'age' });
    for (let i = 0; i < naissances; i++) sc.plan.push({ t: t0 + R() * duree * .95, type: vivants ? 'naissance' : 'arrivee', esp: e.id });
    if (morts * pPred >= .5) sc.plan.push({ t: t0 + duree * .9, type: 'solde', esp: e.id });
  }
  for (const a of sc.agents) if (!a.mort && !sc.especes.has(a.esp.id)) sc.plan.push({ t: t0 + R() * duree * .9, type: 'depart', id: a.id });
  sc.plan.sort((a, b) => a.t - b.t);
}
const alea0 = x => Math.floor(x) + (R() < x - Math.floor(x) ? 1 : 0);
function executer(sc, ev) {
  const e = ev.esp ? sc.especes.get(ev.esp) : null;
  if (ev.type === 'depart') { const a = sc.agents.find(z => z.id === ev.id && !z.mort); if (a) { a.etat = 'partir'; a.cible = { x: a.x < sc.W / 2 ? -40 : sc.W + 40, y: a.y }; } return; }
  if (!e) return;
  const vivants = sc.agents.filter(a => a.esp === e && !a.mort);
  if (ev.type === 'mort') { if (!vivants.length) return; const a = ev.cause === 'maladie' ? (vivants.find(z => z.malade) || vivants[Math.floor(R() * vivants.length)]) : vivants.reduce((x, y) => (y.age / e.longevite + R() * .3 > x.age / e.longevite ? y : x)); tuer(sc, a, ev.cause); }
  else if (ev.type === 'solde') { while (e.budget >= 1 && vivants.length) { const a = vivants.splice(Math.floor(R() * vivants.length), 1)[0]; tuer(sc, a, 'predation-loin'); e.budget--; } }
  else if (ev.type === 'arrivee' || ev.type === 'naissance') naitre(sc, e, ev.type === 'arrivee' || !vivants.length);
}
function naitre(sc, e, arrivee) {
  const adultes = sc.agents.filter(a => a.esp === e && !a.mort && a.age >= e.maturite), meres = adultes.filter(a => a.ind.sexe === 'f'), peres = adultes.filter(a => a.ind.sexe === 'm');
  if (arrivee || !adultes.length || e.syn) {   // une arrivée : par un bord, depuis un voisin
    const ind = tirerBete(sc, e); if (!ind) return; const z = zoneDe(sc, e), gauche = R() < .5;
    const a = nouvelAgent(sc, e, ind, gauche ? z.x0 : z.x1, z.y0 + R() * (z.y1 - z.y0), e.maturite + R() * e.longevite * .5); a.zone = z; a.cible = { x: sc.W * (.2 + R() * .6), y: a.y }; a.etat = 'errer';
    sc.agents.push(a); e.dessines++; return; }
  const mere = meres.length ? meres[Math.floor(R() * meres.length)] : adultes[Math.floor(R() * adultes.length)];
  let ind = null; const pere = peres.length ? peres.reduce((x, y) => Math.hypot(y.x - mere.x, y.y - mere.y) < Math.hypot(x.x - mere.x, x.y - mere.y) ? y : x) : null;
  if (pere && mere.ind.sexe !== pere.ind.sexe) { try { const r = Individus.croiser(mere.ind.sexe === 'f' ? mere.ind : pere.ind, mere.ind.sexe === 'f' ? pere.ind : mere.ind, sc.vue, { r: R, biome: sc.biome }); if (r.ok) ind = r.petit; } catch (er) { ind = null; } }
  if (!ind) ind = tirerBete(sc, e); if (!ind) return;
  if (e.ovipare) { sc.oeufs.push({ x: mere.x + (R() - .5) * 10, y: mere.y + 2, esp: e, ind, mere, eclot: performance.now() + sc.horloge.duree * (.12 + R() * .2), t0: performance.now() }); return; }
  const a = nouvelAgent(sc, e, ind, mere.x + (R() - .5) * 12, mere.y + (R() - .5) * 6, 0); a.zone = mere.zone; a.groupe = mere.groupe; if (a.groupe) sc.groupes.get(a.groupe)?.push(a); a.mere = mere;
  sc.agents.push(a); e.dessines++; sc.effets.push({ type: 'eclat', x: a.x, y: a.y - 8, t: 0, d: 1, c: '#f3d98b' });
}
function tuer(sc, a, cause) {
  if (!a || a.mort) return; a.mort = 1; a.cause = cause; a.etat = 'mort'; a.esp.dessines = Math.max(0, a.esp.dessines - 1);
  if (cause !== 'capture' && cause !== 'depart') sc.carcasses.push({ x: a.x, y: a.y, w: (a.w || a.esp.largeur * sc.echelle) * .22, t: 0, d: clamp(sc.horloge.duree / 1000 * .2, 3, 8) });
  if (cause === 'maladie') sc.effets.push({ type: 'eclat', x: a.x, y: a.y - 6, t: 0, d: 1.2, c: '#9bc46a' });
  if (sc.choisi === a) sc.surChoix?.(a, 'mort');
  const g = a.groupe && sc.groupes.get(a.groupe); if (g) { const i = g.indexOf(a); if (i >= 0) g.splice(i, 1); if (!g.length) sc.groupes.delete(a.groupe); }
}

// === la vie, image après image ===
// l'heure du jour à l'écran : un cycle du moteur est une tranche de vie, pas une journée (moteur/orvane.js) ; la journée dure le temps
// d'un cycle (au moins douze secondes), une durée choisie, ou suit l'horloge de l'appareil
const dureeJour = sc => sc.options.journee === 'cycle' || !sc.options.journee ? Math.max(12, sc.horloge.duree / 1000) : +sc.options.journee || 60;
function lumiere(sc) {
  const p = clamp((performance.now() - sc.horloge.debut) / Math.max(1, sc.horloge.duree), 0, 1);
  let h = sc.jour; if (sc.options.journee === 'horloge') { const d = new Date(); h = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; }
  return { p, h, L: clamp(.5 + .62 * Math.sin(2 * Math.PI * (h - .25)), 0, 1) };
}
function actif(a, L, h) {
  const k = a.esp.activite, l = clamp(L + a.chrono, 0, 1);
  if (k === 'diurne') return l > .3; if (k === 'nocturne') return l < .38;
  if (k === 'crepusculaire') return l > .05 && l < .7 && (Math.abs(h - .25) < .14 || Math.abs(h - .75) < .14);
  return true;
}
function grille(sc) { const G = new Map(), c = 64; for (const a of sc.agents) { if (a.mort) continue; const k = (a.x / c | 0) + ',' + (a.y / c | 0); let l = G.get(k); if (!l) G.set(k, l = []); l.push(a); } return { G, c }; }
function voisins(g, x, y, r) { const o = [], c = g.c, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const l = g.G.get(i + ',' + j); if (l) for (const a of l) if ((a.x - x) ** 2 + (a.y - y) ** 2 <= r * r) o.push(a); } return o; }
function rayonFuite(sc, a) {
  const M = sc.profil?.exposition?.mefiance || {}, rendue = M.rendue !== false, au = a.ind.z?.audace || 0, p = a.esp.pop;
  const base = (40 + a.esp.largeur * .8) * sc.echelle * (1 - .25 * clamp(au, -2, 2));
  return rendue ? base * Math.pow(M.fuite ?? 2.2, p.mefiance || 0) * Math.pow(M.habitude ?? .5, p.habituation || 0) : base;
}
function pas(sc, dt) {
  const now = performance.now(); sc.temps += dt; sc.jour = ((sc.jour ?? .3) + dt / dureeJour(sc)) % 1;
  while (sc.plan.length && sc.plan[0].t <= now) executer(sc, sc.plan.shift());
  const { L, h } = lumiere(sc), g = grille(sc), D = Math.max(2, sc.horloge.duree / 1000), DJ = dureeJour(sc), J = sc.joueur, jActif = J.actif && now < J.jusqua;
  for (const o of sc.oeufs) if (!o.fini && now >= o.eclot) { o.fini = true; const froid = (sc.biomeObj.axes_saison?.temperature ?? .5) < (racine.OrvanePonte?.REGLES?.froid?.seuil ?? .5) && R() < .25;
    if (froid || !sc.especes.has(o.esp.id)) continue; const a = nouvelAgent(sc, sc.especes.get(o.esp.id), o.ind, o.x, o.y, 0); a.zone = o.mere.zone; a.groupe = o.mere.mort ? null : o.mere.groupe; if (a.groupe) sc.groupes.get(a.groupe)?.push(a); sc.agents.push(a); a.esp.dessines++; sc.effets.push({ type: 'eclat', x: o.x, y: o.y - 4, t: 0, d: 1, c: '#f6e7b0' }); }
  sc.oeufs = sc.oeufs.filter(o => !o.fini);
  for (const a of sc.agents) {
    if (a.mort) { a.mort += dt; continue; }
    const e = a.esp, z = a.zone, prof = profondeur(sc, a.y), jeune = clamp(a.age / e.maturite, 0, 1), w = e.largeur * a.fT * sc.echelle * prof * (.45 + .55 * jeune);
    a.w = w; a.age += dt / D; a.t += dt; a.pas += dt * (2 + Math.hypot(a.vx, a.vy) / 8);
    const vit = e.sprint * a.fV * sc.echelle * (a.malade ? .6 : 1) * (.6 + .4 * jeune), marche = vit * (e.syn ? .5 : .28);
    a.faim = clamp(a.faim + dt / (DJ * (e.regime === 'carnivore' ? .45 : .3)), 0, 1);
    const eveil = actif(a, L, h);
    // la fuite : un prédateur qui vient, le joueur trop près (la distance de fuite : sa méfiance, docs/12)
    if (a.etat !== 'fuir' && a.etat !== 'partir' && ((a.id + (sc.temps * 8 | 0)) % 3 === 0)) {
      let menace = null; const r = (70 + 170 * e.perception) * sc.echelle * (eveil ? 1 : .5);
      if (e.predateurs.size) for (const b of voisins(g, a.x, a.y, r)) if (b !== a && (b.cible === a || (b.etat === 'chasser' && e.predateurs.has(b.esp.id)))) { menace = b; break; }
      const rf = rayonFuite(sc, a); a.rf = rf;
      if (!menace && jActif && !e.syn && Math.hypot(J.x - a.x, J.y - a.y) < rf) menace = { x: J.x, y: J.y, joueur: true };
      else if (jActif && !a.rencontre && !e.syn && Math.hypot(J.x - a.x, J.y - a.y) < rf * 1.8) { a.rencontre = true; sc.rencontres[e.id] = (sc.rencontres[e.id] || 0) + 1; }
      if (menace) { a.etat = 'fuir'; a.menace = menace; a.t = 0; const G2 = a.groupe && sc.groupes.get(a.groupe); if (G2 && G2.length < 40) for (const b of G2) if (b !== a && !b.mort && b.etat !== 'fuir') { b.etat = 'fuir'; b.menace = menace; b.t = 0; } }
    }
    let tx = a.cx, ty = a.cy, v = marche;
    switch (a.etat) {
      case 'repos': v = 0; if (eveil && a.t > 1) { a.etat = 'errer'; a.t = 0; } break;
      case 'errer': {
        if (!eveil && a.t > 1.5 && !e.syn) { a.etat = 'repos'; a.t = 0; break; }
        const G2 = a.groupe && sc.groupes.get(a.groupe), chef = G2 && G2[0];
        if (chef && chef !== a && !chef.mort) { const s = Math.sqrt(G2.length) * w * .9; tx = clamp(chef.x + a.decal[0] * s, z.x0, z.x1); ty = clamp(chef.y + a.decal[1] * s * .5, z.y0, z.y1); v = Math.hypot(tx - a.x, ty - a.y) > w ? marche * 1.3 : marche * .4; }
        else if (!a.cible || Math.hypot(a.cible.x - a.x, a.cible.y - a.y) < 6 || a.t > 14) { if (e.nage && e.terre && sc.zones.type !== 'terre' && R() < .25) { a.zone = zoneDe(sc, e, !z.eau); } a.cible = { x: a.zone.x0 + R() * (a.zone.x1 - a.zone.x0), y: a.zone.y0 + R() * (a.zone.y1 - a.zone.y0) }; a.t = 0; if (R() < .35) { a.etat = 'pause'; a.t = 0; } }
        if (a.cible && !(chef && chef !== a)) { tx = a.cible.x; ty = a.cible.y; }
        // la faim : une décision toutes les demi-secondes environ — chasser (un carnivore, plus s'il est peu rassasié ; un omnivore
        // moins bien : REGLES.chasse_omnivore), brouter les plantes du lieu, ou chercher une carcasse (les détritivores)
        if (a.faim > .55 && eveil && (a.decide = (a.decide || 0) - dt) <= 0) { a.decide = .5 + R() * .7;
          const pChasse = !e.proies.size ? 0 : e.regime === 'carnivore' || e.syn ? .45 + .5 * (1 - (e.pop.satiete ?? .5)) : (racine.Orvane?.REGLES?.chasse_omnivore ?? .4) * .5;
          if (R() < pChasse) { const r = (90 + 180 * e.perception) * sc.echelle; let best = null, bs = 0;
            for (const b of voisins(g, a.x, a.y, r)) { const f = e.proies.get(b.esp.id); if (!f || b.mort) continue; const cache = b.traits.includes('camouflage') && b.etat === 'repos' ? .3 : 1, s = f * cache / (1 + Math.hypot(b.x - a.x, b.y - a.y) / 50); if (s > bs) { bs = s; best = b; } }
            if (best) { a.etat = 'chasser'; a.cible = best; a.t = 0; } }
          else if (['herbivore', 'omnivore', 'filtreur'].includes(e.regime) && sc.plantes.length && a.faim > .62) { let best = null, bd = 1e9; for (let i = 0; i < 6; i++) { const p = sc.plantes[Math.floor(R() * sc.plantes.length)]; if (p.y < z.y0 - 4 || p.y > z.y1 + 4) continue; const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd) { bd = d; best = p; } } if (best) { a.etat = 'brouter'; a.cible = { x: best.x + (R() - .5) * 6, y: clamp(best.y + 2, z.y0, z.y1) }; a.t = 0; } }
          else if (e.regime === 'detritivore' || e.regime === 'omnivore') { const c = sc.carcasses.find(c => Math.hypot(c.x - a.x, c.y - a.y) < 240 * sc.echelle); if (c) { a.etat = 'charogne'; a.cible = c; a.t = 0; } } }
        break; }
      case 'pause': v = 0; if (a.t > 1 + R() * 3) { a.etat = 'errer'; a.t = 0; } break;
      case 'brouter': tx = a.cible.x; ty = a.cible.y; if (Math.hypot(tx - a.x, ty - a.y) < 5) { v = 0; a.faim = Math.max(0, a.faim - dt * .25); if (a.faim < .1 || a.t > 9) { a.etat = 'errer'; a.cible = null; a.t = 0; } } else if (a.t > 12) { a.etat = 'errer'; a.t = 0; } break;
      case 'charogne': if (!sc.carcasses.includes(a.cible)) { a.etat = 'errer'; a.cible = null; break; } tx = a.cible.x; ty = a.cible.y; if (Math.hypot(tx - a.x, ty - a.y) < 6) { v = 0; a.faim = Math.max(0, a.faim - dt * .3); a.cible.d -= dt * .5; if (a.faim < .1) { a.etat = 'errer'; a.cible = null; } } break;
      case 'chasser': { const b = a.cible; if (!b || b.mort || a.t > 7 || !sc.agents.includes(b)) { a.etat = 'errer'; a.cible = null; a.t = 0; a.faim *= .85; break; }
        tx = b.x; ty = b.y; v = vit * 1.05; const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < (w + (b.w || 10)) * .35) { if (b.esp.budget >= 1 && R() < .85) { b.esp.budget--; tuer(sc, b, 'predation'); a.etat = 'manger'; a.t = 0; a.faim = 0; sc.effets.push({ type: 'poussiere', x: b.x, y: b.y, t: 0, d: .8 }); sc.surEvenement?.({ type: 'proie', chasseur: a, proie: b }); }
          else { a.etat = 'errer'; a.cible = null; a.t = 0; a.faim *= .7; a.decide = 2.5 + R() * 2; b.etat = 'fuir'; b.menace = a; b.t = 0; } } break; }
      case 'manger': v = 0; if (a.t > 3 + R() * 2) { a.etat = 'repos'; a.t = 0; } break;
      case 'fuir': { const m = a.menace; if (!m || a.t > 3.5 || (m.mort)) { a.etat = 'errer'; a.menace = null; a.t = 0; a.cible = null; break; }
        const dx = a.x - m.x, dy = a.y - m.y, d = Math.hypot(dx, dy) || 1; tx = a.x + dx / d * 80; ty = a.y + dy / d * 50; v = vit; if (d > (m.joueur ? (a.rf || 80) * 1.6 : 260 * sc.echelle)) { a.etat = 'errer'; a.t = 0; a.cible = null; } break; }
      case 'partir': tx = a.cible.x; ty = a.cible.y; v = marche * 1.2; if (a.x < -30 || a.x > sc.W + 30) { a.mort = 1; a.cause = 'depart'; a.esp.dessines = Math.max(0, a.esp.dessines - 1); } break;
      case 'nourri': v = 0; if (a.t > 2.5) { a.etat = 'errer'; a.t = 0; } break;
    }
    a.cx = tx; a.cy = ty;
    let dx = tx - a.x, dy = ty - a.y; const d = Math.hypot(dx, dy);
    const vxD = d > 1 ? dx / d * v : 0, vyD = d > 1 ? dy / d * v * .8 : 0, k = Math.min(1, dt * (a.etat === 'fuir' ? 8 : 4));
    a.vx += (vxD - a.vx) * k; a.vy += (vyD - a.vy) * k;
    if (a.etat !== 'partir') { a.x = clamp(a.x + a.vx * dt, a.zone.x0, a.zone.x1); a.y = clamp(a.y + a.vy * dt, a.zone.y0, a.zone.y1); } else { a.x += a.vx * dt; a.y += a.vy * dt; }
    if (Math.abs(a.vx) > 3) a.dir = a.vx > 0 ? 1 : -1;
    const voleCible = e.vol && (Math.hypot(a.vx, a.vy) > marche * .5 || a.etat === 'fuir' || a.etat === 'chasser') ? 1 : 0; a.vol += (voleCible - a.vol) * Math.min(1, dt * 2);
    if (a.age > e.longevite * 1.6 && R() < dt * .02) tuer(sc, a, 'age');
  }
  sc.agents = sc.agents.filter(a => !a.mort || a.mort < 2.2);
  for (const c of sc.carcasses) c.t += dt; sc.carcasses = sc.carcasses.filter(c => c.t < c.d);
  for (const f of sc.effets) f.t += dt; sc.effets = sc.effets.filter(f => f.t < f.d);
}

// === dessiner ===
function dessiner(sc) {
  const x = sc.ctx, W = sc.W, H = sc.H, now = performance.now(); x.setTransform(sc.dpr, 0, 0, sc.dpr, 0, 0);
  x.drawImage(sc.decor, 0, 0, W, H);
  const { L } = lumiere(sc), Z = sc.zones;
  if (Z.type === 'eau' || Z.type === 'rive') { const y0 = Z.type === 'eau' ? Z.surface : Z.rive; x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i <= W; i += 10) x.lineTo(i, y0 + Math.sin(i * .04 + sc.temps * 1.4) * 2.5); x.stroke(); }
  if (sc.options.meteo && sc.catastrophe && /crue/.test(sc.catastrophe.detail || '')) { const p = lumiere(sc).p, hh = Math.sin(Math.PI * clamp(p * 1.4, 0, 1)) * H * .22; x.fillStyle = 'rgba(70,110,130,.45)'; x.fillRect(0, H - hh, W, hh); }
  for (const c of sc.carcasses) { x.fillStyle = `rgba(74,56,40,${.32 * (1 - c.t / c.d)})`; x.beginPath(); x.ellipse(c.x, c.y, c.w, c.w * .3, 0, 0, 7); x.fill(); }
  for (const o of sc.oeufs) { x.fillStyle = '#8a6b46'; x.beginPath(); x.ellipse(o.x, o.y + 2, 7 * sc.echelle, 2.5 * sc.echelle, 0, 0, 7); x.fill(); x.fillStyle = '#efe4c8'; for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(o.x - 3 + i * 3, o.y - 1, 2 * sc.echelle, 2.6 * sc.echelle, 0, 0, 7); x.fill(); } }
  const tri = sc.agents.slice().sort((a, b) => (a.y - (a.vol || 0) * 0) - (b.y));
  const S = sc.surligne;
  for (const a of tri) dessinerAgent(sc, x, a, S, L);
  for (const f of sc.effets) { const p = f.t / f.d; if (f.type === 'eclat') { x.strokeStyle = f.c; x.globalAlpha = 1 - p; x.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const ag = i * 1.05; x.beginPath(); x.moveTo(f.x + Math.cos(ag) * 4, f.y + Math.sin(ag) * 4); x.lineTo(f.x + Math.cos(ag) * (6 + p * 12), f.y + Math.sin(ag) * (6 + p * 12)); x.stroke(); } x.globalAlpha = 1; }
    else if (f.type === 'poussiere') { x.fillStyle = `rgba(150,130,110,${.5 * (1 - p)})`; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(f.x + Math.cos(i * .9) * p * 20, f.y - 4 + Math.sin(i * .9) * p * 8, 3 + p * 4, 0, 7); x.fill(); } }
    else if (f.type === 'texte') { x.font = '600 13px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.fillStyle = `rgba(255,248,230,${1 - p})`; x.strokeStyle = `rgba(20,30,25,${.8 * (1 - p)})`; x.lineWidth = 3; x.strokeText(f.txt, f.x, f.y - p * 24); x.fillText(f.txt, f.x, f.y - p * 24); }
    else if (f.type === 'filet') { x.strokeStyle = `rgba(240,230,200,${1 - p})`; x.lineWidth = 1; x.beginPath(); x.arc(f.x, f.y, 6 + p * 22, 0, 7); x.stroke(); } }
  // la météo : le feu, la sécheresse, la pluie, la neige
  if (sc.options.meteo) {
    const cat = sc.catastrophe?.detail || '';
    if (/incendie|feu/.test(cat)) { x.fillStyle = 'rgba(255,110,30,.13)'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,170,60,.8)'; for (let i = 0; i < 40; i++) { const px = (i * 97.3 + sc.temps * 30 * (1 + i % 3)) % W, py = H - ((i * 53.1 + sc.temps * 40 * (1 + i % 4)) % (H * .8)); x.fillRect(px, py, 2, 2); } }
    if (/secheresse|tarissent/.test(cat)) { x.fillStyle = 'rgba(220,180,90,.14)'; x.fillRect(0, 0, W, H); }
    const t = sc.biomeObj.axes_saison?.temperature ?? .5;
    if (Z.type !== 'eau' && Z.type !== 'grotte' && (t < .2 || (sc.vue?.cycle?.saison?.nom === 'hiver' && t < .3))) { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 70; i++) { const px = (i * 61.7 + Math.sin(sc.temps + i) * 10 + sc.temps * 8) % W, py = (i * 37.3 + sc.temps * (18 + i % 5 * 4)) % H; x.beginPath(); x.arc(px, py, 1.2 + (i % 3) * .5, 0, 7); x.fill(); } }
    else if (sc.meteo?.pluie && Z.type !== 'grotte') { x.strokeStyle = Z.type === 'eau' ? 'rgba(255,255,255,.12)' : 'rgba(200,220,240,.35)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 90; i++) { const px = (i * 47.9 + sc.temps * 60) % W, py = (i * 29.3 + sc.temps * 420) % H; x.moveTo(px, py); x.lineTo(px - 3, py + 9); } x.stroke(); }
  }
  // la nuit
  if (sc.options.nuit) { const n = 1 - L, ombre = Z.type === 'grotte' ? .55 + n * .2 : Z.type === 'eau' ? n * .5 : n * .62; if (ombre > .01) { x.fillStyle = `rgba(10,18,40,${ombre})`; x.fillRect(0, 0, W, H); }
    if (L > .15 && L < .65 && Z.type !== 'grotte') { x.fillStyle = `rgba(255,140,60,${.1 * (1 - Math.abs(L - .4) / .25)})`; x.fillRect(0, 0, W, H); }
    if (ombre > .25) for (const a of sc.agents) { if (a.mort || (!a.esp.nocturne && !a.esp.syn)) continue; if (a.etat === 'repos' && !a.esp.syn) continue; const ox = a.x + a.dir * a.w * .32, oy = a.y - a.w * .32 - a.vol * 26; x.fillStyle = a.esp.syn ? 'rgba(90,210,224,.9)' : 'rgba(230,240,160,.9)'; x.beginPath(); x.arc(ox, oy, 1.6, 0, 7); x.fill(); } }
  // le joueur, la bête choisie
  const J = sc.joueur;
  if (sc.choisi && !sc.choisi.mort) { const a = sc.choisi, y = a.y - a.vol * 26; x.strokeStyle = '#e4bb78'; x.lineWidth = 2; x.beginPath(); x.ellipse(a.x, a.y + 2, a.w * .5 + 6, a.w * .18 + 4, 0, 0, 7); x.stroke();
    if (sc.options.fuite && a.rf) { x.setLineDash([4, 5]); x.strokeStyle = 'rgba(228,187,120,.5)'; x.beginPath(); x.arc(a.x, y - a.w * .2, a.rf, 0, 7); x.stroke(); x.setLineDash([]); } }
  if (J.actif && now < J.jusqua && sc.outil && sc.outil !== 'observer') { x.strokeStyle = 'rgba(255,248,230,.75)'; x.lineWidth = 1.5; x.beginPath(); x.arc(J.x, J.y, 14, 0, 7); x.moveTo(J.x - 20, J.y); x.lineTo(J.x - 8, J.y); x.moveTo(J.x + 8, J.y); x.lineTo(J.x + 20, J.y); x.moveTo(J.x, J.y - 20); x.lineTo(J.x, J.y - 8); x.moveTo(J.x, J.y + 8); x.lineTo(J.x, J.y + 20); x.stroke(); }
}
function dessinerAgent(sc, x, a, S, L) {
  const w = a.w || 20, h = w * 90 / 170, e = a.esp, jeune = a.age < e.maturite;
  let alpha = 1; if (a.mort) alpha = clamp(1 - a.mort / 2.2, 0, 1); if (S && e.id !== S) alpha *= .28; if (a.cause === 'capture') alpha *= clamp(1 - a.mort * 2, 0, 1);
  if (alpha <= .01) return;
  const vol = a.vol * (24 + w * .3), bob = Math.abs(a.vx) + Math.abs(a.vy) > 2 && !a.mort ? Math.abs(Math.sin(a.pas * 3)) * w * .035 : 0;
  const repos = a.etat === 'repos' || a.mort;
  if (!a.mort && (vol > 2 || !a.zone.eau)) { x.fillStyle = `rgba(0,0,0,${.16 * alpha * (vol > 2 ? .6 : 1)})`; x.beginPath(); x.ellipse(a.x, a.y + 1, w * .3, w * .07, 0, 0, 7); x.fill(); }
  if (a.malade && !a.mort) { x.fillStyle = `rgba(150,200,90,${.22 * alpha})`; x.beginPath(); x.arc(a.x, a.y - h * .3, w * .38, 0, 7); x.fill(); }
  if (e.terre && a.etat === 'repos' && (e.plan.locomotion || []).includes('fouissage') && !a.zone.eau) { x.fillStyle = `rgba(90,70,50,${.7 * alpha})`; x.beginPath(); x.ellipse(a.x, a.y, w * .25, w * .09, 0, Math.PI, 0); x.fill(); return; }
  const im = jeune && a.larve ? a.larve : a.img; x.globalAlpha = alpha;
  x.save(); x.translate(a.x, a.y - vol - bob);
  if (a.mort && a.cause !== 'capture' && a.cause !== 'depart') x.rotate(a.dir * Math.min(1, a.mort * 2) * 1.2);
  if (a.dir < 0) x.scale(-1, 1);
  if (repos && !a.mort) x.scale(1, .86);
  const serp = e.plan.corps?.forme === 'serpent' && !repos ? Math.sin(a.pas * 2) * w * .02 : 0;
  if (im && im.complete && im.naturalWidth) x.drawImage(im, -w * 82 / 170, -h * 82 / 90 + serp, w, h);
  else { const c = e.plan.corps?.couleurs?.robe || [140, 120, 90]; x.fillStyle = rgb(c); x.beginPath(); x.ellipse(0, -h * .3, w * .3, h * .2, 0, 0, 7); x.fill(); }
  x.restore(); x.globalAlpha = 1;
  if (a === sc.choisi || (S && e.id === S && sc.options.etiquettes)) { const nom = a === sc.choisi ? `${a.ind.nom}${jeune ? ' (jeune)' : ''}` : e.nom.split(' ')[0]; x.font = (a === sc.choisi ? '600 ' : '') + '11px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = 'rgba(17,35,29,.75)'; x.fillStyle = '#faf8f2'; const ty = a.y - vol - h * .95 - 4; x.strokeText(nom, a.x, ty); x.fillText(nom, a.x, ty); }
  if (a.etat === 'repos' && !a.mort && a === sc.choisi) { x.font = '11px Georgia, serif'; x.fillStyle = 'rgba(250,248,242,.8)'; x.fillText('z', a.x + w * .3, a.y - h - 2 + Math.sin(sc.temps * 2) * 2); }
}
function toucher(sc, px, py) {
  let best = null, bd = 1e9;
  for (const a of sc.agents) { if (a.mort) continue; const w = a.w || 20, cy = a.y - (a.vol || 0) * (24 + w * .3) - w * .2, d = Math.hypot(a.x - px, cy - py); if (d < Math.max(22, w * .55) && d < bd) { bd = d; best = a; } }
  return best;
}
function boucle(sc) {
  if (sc.run) return; sc.run = true; let t0 = performance.now();
  const f = t => { if (!sc.run) return; const dt = Math.min(.05, (t - t0) / 1000); t0 = t; if (!document.hidden && sc.vue) { pas(sc, dt); dessiner(sc); } requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
// les gestes du joueur, côté écran (la note qui part au moteur est faite par simulation.js)
function retirer(sc, a, cause) { tuer(sc, a, cause); sc.effets.push({ type: cause === 'capture' ? 'filet' : 'poussiere', x: a.x, y: a.y - (a.w || 20) * .3, t: 0, d: .9 }); }
function relacher(sc, ind) {
  // une lignée que ce lieu ne portait pas : elle y arrive par vos mains
  let e = sc.especes.get(ind.taxon);
  if (!e) { const t = sc.vue.taxons.find(z => z.id === ind.taxon); if (!t) return null; e = especeDe(sc, t, { biome: sc.biome, effectif: 1 }); sc.especes.set(t.id, e); chaine(sc); }
  const a = nouvelAgent(sc, e, ind, sc.joueur.x || sc.W / 2, sc.joueur.y || sc.H * .7, Math.max(e.maturite, 1)); a.zone = zoneDe(sc, e); a.x = clamp(a.x, a.zone.x0, a.zone.x1); a.y = clamp(a.y, a.zone.y0, a.zone.y1); a.etat = 'fuir'; a.menace = { x: a.x - 20, y: a.y, joueur: true }; sc.agents.push(a); e.dessines++; sc.effets.push({ type: 'eclat', x: a.x, y: a.y - 10, t: 0, d: 1, c: '#e4bb78' }); return a; }
function nourrir(sc, a) { a.faim = 0; a.etat = 'nourri'; a.t = 0; sc.effets.push({ type: 'eclat', x: a.x, y: a.y - 6, t: 0, d: .9, c: '#d6c37a' }); }
function texte(sc, x, y, txt) { sc.effets.push({ type: 'texte', x, y, txt, t: 0, d: 1.6 }); }
// le phénotype du moteur que montre une bête (ses traits visibles), pour la note : le tampon dénormalise par phénotype (docs/4)
function phenotypeDe(a) { const T = a.traits.slice().sort().join(','); return a.esp.t.phenotypes?.find(p => (p.traits || []).slice().sort().join(',') === T)?.id || null; }
function ageDe(a) { return a.age < a.esp.maturite ? 'jeune' : a.age > a.esp.longevite ? 'vieux' : 'adulte'; }

const API = { creer, installer, redimensionner, boucle, pas, dessiner, toucher, retirer, relacher, nourrir, texte, croquis, machine, phenotypeDe, ageDe, lumiere, rayonFuite, couleursDe, especeDe };
racine.OrvaneVivant = API;
})(globalThis);
