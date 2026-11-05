// Orvane — LE MONDE DES BANCS (bancs/monde.js)
// Le monde d'Orvane tourne par parcelles depuis le 3 novembre (docs/15) : etat.json n'a plus de « foret », mais « foret~1 »…
// Les bancs qui parlent des lieux par leur nom le lisent ici, vu par biome, comme un monde solo le fait d'un instantané publié
// (moteur/solo.js) : un monde complet (les plantes, la Mère, les souches), qui tourne tel quel sous le moteur.
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Parcelles = require(racine('moteur/parcelles.js'));
// opt.continent : seulement les lieux d'un continent ('' : celui du monde d'Orvane, sans ceux qu'une fusion par ponts a reliés,
// « lande~genese-7-1 ») — le monde tel que les bancs écrits avant la fusion le supposent
const continentDe = id => { const m = /~(.+)-\d+$/.exec(String(id)); return m ? m[1] : ''; };
function parBiome(E, opt = {}) {
  if (!Parcelles.estParcellaire(E)) return E;
  if (opt.continent != null) { E = JSON.parse(JSON.stringify(E)); const garde = new Set(E.biomes.filter(b => continentDe(b.id) === opt.continent).map(b => b.id));
    E.biomes = E.biomes.filter(b => garde.has(b.id)).map(b => ({ ...b, voisins: (b.voisins || []).filter(v => garde.has(v)) }));
    const types = new Set(E.biomes.map(b => String(b.id).split('~')[0])); E.monde.parcelles.types = E.monde.parcelles.types.filter(t => types.has(t.id)).map(t => ({ ...t, voisins: (t.voisins || []).filter(v => types.has(v)) }));
    for (const t of E.taxons) t.populations = t.populations.filter(p => garde.has(p.biome));
    E.taxons = E.taxons.filter(t => t.eteint || t.populations.length); if (E.monde.mere && !garde.has(E.monde.mere.biome)) delete E.monde.mere; }
  const V = JSON.parse(JSON.stringify(Parcelles.regrouper(E)));
  delete V.monde.parcelles; delete V.parcelles; if (V.monde.mere) delete V.monde.mere.parcelle;
  for (const t of V.taxons) for (const p of t.populations) delete p.parcelles;
  return V;
}
const orvane = (opt = {}) => parBiome(JSON.parse(fs.readFileSync(racine('mondes/orvane/etat.json'), 'utf8')), opt);
module.exports = { orvane, parBiome };
