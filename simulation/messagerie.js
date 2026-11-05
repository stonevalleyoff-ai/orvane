// Orvane — LA SIMULATION EN DIRECT, la messagerie (simulation/messagerie.js)
// Ce que le moteur répond à la page. Dans un Web Worker (travailleur.js) le plus souvent ; dans la page même si le Worker ne se
// charge pas (la page ouverte sans serveur) : la même messagerie, sans fil entre les deux.
//   const recevoir = OrvaneMessagerie(envoyer)   // envoyer(message) : vers la page ; recevoir(message) : de la page
'use strict';
(function (racine) {
function OrvaneMessagerie(envoyer) {
  const N = racine.OrvaneNoyau;
  let S = null;
  async function json(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${url} : ${r.status === 404 ? 'introuvable' : 'HTTP ' + r.status}`); return r.json(); }
  // le premier qui répond : l'adresse relative (le site publié, un serveur local), sinon le monde publié sur GitHub Pages
  async function premier(urls) { let err; for (const u of urls) { try { return await json(u); } catch (e) { err = e; } } throw err; }
  const pret = (id, extra = {}) => envoyer({ type: 'pret', id, vue: N.vue(S), valeurs: N.valeurs(S), defauts: N.defauts(), mecanismes: N.mecanismes(S), cycle: S.etat.cycle, ...extra });
  return async function recevoir(m = {}) {
    try {
      if (m.type === 'creer') {
        envoyer({ type: 'progres', id: m.id, texte: 'Le monde d’Orvane arrive…' });
        const [source, flore] = await Promise.all([premier(m.sources), m.flores?.length ? premier(m.flores).catch(() => null) : null]);
        envoyer({ type: 'progres', id: m.id, texte: 'Le monde s’éveille…' });
        S = N.creer(source, { flore, reglages: m.reglages || {}, maintenant: m.maintenant });
        pret(m.id, { source: { id: source.monde?.id, nom: source.monde?.nom, cycle: source.cycle?.n, date: source.cycle?.date } });
      } else if (m.type === 'charger') { S = N.charger(m.sauvegarde, m.reglages || {}); pret(m.id); }
      else if (!S) throw new Error('aucun monde');
      else if (m.type === 'regler') {
        const evenements = N.regler(S, m.reglages || {});
        envoyer({ type: 'regle', id: m.id, evenements, valeurs: N.valeurs(S), mecanismes: N.mecanismes(S), vue: m.vue ? N.vue(S) : null });
      } else if (m.type === 'cycles') {
        for (const e of m.notes || []) N.noter(S, e);
        const n = Math.max(1, Math.min(500, m.n | 0)), res = [];
        for (let k = 0; k < n; k++) { const r = N.cycle(S); res.push({ n: r.n, duree: r.duree, evenements: r.evenements, entrees: r.entrees, notes: r.notes, saison: S.etat.cycle.saison || null });
          if (k < n - 1) { envoyer({ type: 'progres', id: m.id, fait: k + 1, sur: n, n: r.n }); if (!racine.importScripts) await new Promise(ok => setTimeout(ok, 0)); } }
        envoyer({ type: 'cycle', id: m.id, res, vue: N.vue(S) });
      } else if (m.type === 'sauver') envoyer({ type: 'sauvegarde', id: m.id, json: N.sauver(S), n: S.etat.cycle.n });
    } catch (err) { envoyer({ type: 'erreur', id: m.id, erreur: String((err && err.message) || err) }); }
  };
}
racine.OrvaneMessagerie = OrvaneMessagerie;
})(globalThis);
