// Orvane — LA VEILLE (hebergement/veille.js) — docs/19
// Un monde hébergé peut s'arrêter sans bruit : une action GitHub qui ne part pas, un secret périmé, un monde en panne, un site qui
// montre encore un vieux cycle. La veille le dit. Pour chaque monde qui tourne (son profil ne dit pas monde.nocturne = false), elle
// regarde son dernier cycle publié, et le compare à son rythme (hebergement/rythme.js) : une heure de cycle passée depuis plus de
// --marge heures sans cycle, c'est un retard. Avec --site, elle regarde aussi ce que sert le site : un site qui montre un cycle plus
// vieux que la publication n'est pas servi depuis la bonne branche.
//   node hebergement/veille.js <dossier> [--site https://…/] [--marge 4] [--maintenant <date ISO>]
//     <dossier> : la branche publication extraite (il contient mondes/) ; les profils viennent de main (le dossier courant)
// Une ligne par monde : « OK », « RETARD » ou « SITE », une tabulation, le monde, une tabulation, ce qu'il en est. Sortie : 0.
// (.github/workflows/veille.yml en fait une alerte : une issue « veille » ouverte au premier retard, fermée quand le monde repart.)
'use strict';
const fs = require('fs'), path = require('path');
const { dus } = require('./rythme.js');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const pub = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
const site = arg('--site', null), marge = +arg('--marge', 4) * 36e5, maintenant = Date.parse(arg('--maintenant', '')) || Date.now();
const lire = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const date = t => new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC', heures = ms => `${Math.round(ms / 36e5)} h`;
// le dernier cycle d'un monde publié : dans son historique (léger), sinon dans son état
function dernier(d) {
  const H = lire(path.join(d, 'historique.json')), L = Array.isArray(H) ? H : H?.cycles || H?.historique || [];
  const x = L.length ? L[L.length - 1]?.cycle || L[L.length - 1] : null; if (x?.n != null && x?.date) return { n: x.n, date: Date.parse(x.date) };   // (une entrée de l'historique : un instantané, son cycle)
  const E = lire(path.join(d, 'etat.json')); return E?.cycle ? { n: E.cycle.n, date: Date.parse(E.cycle.date) } : null;
}
(async () => {
  if (!pub || !fs.existsSync(path.join(pub, 'mondes'))) { console.error('node hebergement/veille.js <dossier de la publication> [--site URL]'); process.exit(2); }
  for (const id of fs.readdirSync('mondes').sort()) {
    const profil = lire(path.join('mondes', id, 'profil.json')); if (!profil || profil.monde?.nocturne === false) continue;   // (un monde figé ne tourne plus)
    const D = dernier(path.join(pub, 'mondes', id));
    if (!D) { console.log(`RETARD\t${id}\tla publication n'a aucun cycle de ce monde`); continue; }
    const { du, heure } = dus(profil, D.date, maintenant);
    if (du >= 1 && maintenant - heure > marge) console.log(`RETARD\t${id}\tle cycle de ${date(heure)} n'a pas eu lieu : le dernier publié est le cycle ${D.n}, du ${date(D.date)} (il y a ${heures(maintenant - D.date)}) ; un cycle toutes les ${profil.monde?.cycle || '24h'}`);
    else console.log(`OK\t${id}\tcycle ${D.n}, du ${date(D.date)} ; un cycle toutes les ${profil.monde?.cycle || '24h'}`);
    if (site) {   // ce que sert le site
      try { const r = await fetch(new URL(`mondes/${id}/historique.json`, site), { cache: 'no-store' }); const H = r.ok ? await r.json() : null, L = Array.isArray(H) ? H : H?.cycles || [];
        const n = L.length ? (L[L.length - 1]?.cycle || L[L.length - 1]).n ?? null : null;
        if (n == null) console.log(`SITE\t${id}\tle site ne sert pas mondes/${id}/historique.json (${r.status})`);
        else if (n < D.n) console.log(`SITE\t${id}\tle site montre le cycle ${n}, la publication en est au ${D.n} : GitHub Pages n'est sans doute pas servi depuis la branche publication (Settings › Pages)`);
      } catch (e) { console.log(`SITE\t${id}\tle site ne répond pas (${e.message})`); }
    }
  }
})();
