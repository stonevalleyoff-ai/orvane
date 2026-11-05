// Orvane — LES TYPES DU CONTRAT (outils/types.js) — docs/39
// Écrit types/orvane.d.ts d'après les trois schémas du contrat (schemas/*.schema.json) : l'instantané, le lot de pressions, le
// profil. Un traducteur écrit en TypeScript (ou en JavaScript avec // @ts-check) y trouve chaque champ, son type et sa description.
// Les types suivent les schémas : on ne les écrit jamais à la main, on relance ce fichier quand un schéma change.
//   node outils/types.js            (écrit types/orvane.d.ts)
//   node outils/types.js --verifier (sort en erreur si types/orvane.d.ts n'est plus à jour)
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const SCHEMAS = [['Instantane', 'instantane'], ['Lot', 'pression'], ['Profil', 'profil']];
const ident = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
const nomType = s => s.replace(/(^|[_\-\s])(\w)/g, (_, a, b) => b.toUpperCase()).replace(/[^\w]/g, '');
const doc = (d, ind) => d ? `${ind}/** ${String(d).replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim()} */\n` : '';
function versTs(s, ind, defs, prefixe) {
  if (!s || typeof s !== 'object') return 'unknown';
  if (s.$ref) { const m = /^#\/\$defs\/(.+)$/.exec(s.$ref); return m ? prefixe + nomType(m[1]) : 'unknown'; }
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' | ');
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.anyOf || s.oneOf) return [...new Set((s.anyOf || s.oneOf).map(x => versTs(x, ind, defs, prefixe)))].join(' | ');
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : (s.properties ? ['object'] : s.items ? ['array'] : []);
  if (!types.length) return 'unknown';
  return types.map(t => {
    if (t === 'string') return 'string';
    if (t === 'number' || t === 'integer') return 'number';
    if (t === 'boolean') return 'boolean';
    if (t === 'null') return 'null';
    if (t === 'array') { const it = Array.isArray(s.items) ? `[${s.items.map(x => versTs(x, ind, defs, prefixe)).join(', ')}]` : null; if (it) return it;
      const e = versTs(s.items, ind, defs, prefixe); return /[|&{]/.test(e) && !e.startsWith('{') ? `Array<${e}>` : `${e}[]`; }
    if (t === 'object') {
      const P = s.properties || {}, req = new Set(s.required || []), dedans = ind + '  ';
      let out = '{\n';
      for (const [k, v] of Object.entries(P)) out += doc(v.description, dedans) + `${dedans}${ident(k)}${req.has(k) ? '' : '?'}: ${versTs(v, dedans, defs, prefixe)};\n`;
      if (s.additionalProperties && typeof s.additionalProperties === 'object') out += `${dedans}[cle: string]: ${versTs(s.additionalProperties, dedans, defs, prefixe)}${Object.keys(P).length ? ' | undefined' : ''};\n`;
      else if (s.additionalProperties !== false && !Object.keys(P).length) out += `${dedans}[cle: string]: unknown;\n`;
      return out + ind + '}';
    }
    return 'unknown';
  }).join(' | ');
}
let sortie = `// Orvane — les types du contrat. Fichier ÉCRIT par outils/types.js d'après schemas/*.schema.json : ne pas le modifier à la main.
// Un traducteur TypeScript : import type { Instantane, Lot, Profil } from './orvane';  — en JavaScript : /** @type {import('./orvane').Instantane} */
// Chaque champ porte la description de son schéma. Les noms restent ceux du contrat (en français) ; docs/glossary.md les traduit.

`;
for (const [nom, f] of SCHEMAS) {
  const s = JSON.parse(fs.readFileSync(racine(`schemas/${f}.schema.json`), 'utf8'));
  for (const [k, d] of Object.entries(s.$defs || {})) sortie += doc(d.description, '') + `export type ${nom}${nomType(k)} = ${versTs(d, '', s.$defs, nom)};\n\n`;
  sortie += doc(`${s.title || nom}${s.description ? ' — ' + s.description : ''}`, '') + `export interface ${nom} ${versTs(s, '', s.$defs, nom)}\n\n`;
}
sortie += `/** Une lignée de l'instantané. */\nexport type Lignee = Instantane['taxons'][number];\n/** Une population (une lignée dans un biome). */\nexport type Population = Lignee['populations'][number];\n/** Un phénotype : une combinaison de traits et sa fréquence. */\nexport type Phenotype = Lignee['phenotypes'][number];\n/** Un biome de l'instantané. */\nexport type Biome = Instantane['biomes'][number];\n/** Un événement d'un lot de pressions. */\nexport type Evenement = Lot['evenements'][number];\n`;
const cible = racine('types/orvane.d.ts');
if (process.argv.includes('--verifier')) { const a = fs.existsSync(cible) ? fs.readFileSync(cible, 'utf8') : ''; if (a !== sortie) { console.error('types/orvane.d.ts n\'est plus à jour : node outils/types.js'); process.exit(1); } console.log('types/orvane.d.ts est à jour'); }
else { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.writeFileSync(cible, sortie); console.log(`→ types/orvane.d.ts (${(sortie.length / 1024).toFixed(0)} Ko, ${sortie.split('\n').length} lignes)`); }
