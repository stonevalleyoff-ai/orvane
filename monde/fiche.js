// Orvane — LA FICHE DE CRÉATURE (monde/fiche.js) — docs/52
// Une lignée décrite en entier, pour qu'un dessinateur, un modeleur 3D ou une IA d'image la rendent fidèlement : ce qu'elle a, et
// surtout ce qu'elle n'a pas ; ses couleurs, sa taille vraie, sa façon de bouger, son milieu, ses variantes, ce qui la distingue de
// sa mère. Tout vient de l'instantané, et chaque phrase dit d'où elle vient : une donnée (le champ et sa valeur, entre parenthèses)
// ou une décision de la direction artistique (« interprété : … », « règle … »). Comme la silhouette (monde/silhouette.js), c'est
// un dessin, pas le monde : rien ici ne touche au moteur.
//   OrvaneFiche.ecrire(taxon, instantane, { style }) → { famille, humain, ia, champs }
//     famille : la famille visuelle (pelage, plumage, chitine, ecailles, cuirasse, peau-nue, gelee, machine) ;
//     humain  : la fiche en Markdown, en français, en treize sections (pour un dessinateur, un modeleur) ;
//     ia      : { prompt_2d, prompt_3d, negatif, palette, decor, variantes, style }, en anglais ; le style de la DA a sa place
//               réservée ([STYLE ORVANE], ou options.style) ;
//     champs  : la même chose en JSON, pour un outil (dont sections : chaque phrase, section par section).
//   OrvaneFiche.famille(taxon, instantane) → { id, regle, cle } : la famille seule, la règle qui l'a choisie et ce qu'elle a lu
//   OrvaneFiche.table() → la table des familles (VERSION, FAMILLES, REGLES, DETAILS), en JSON
// La table des familles est versionnée (VERSION) : une même lignée a toujours la même peau, dans tous les jeux, tant que la table
// ne change pas. Pure : la même lignée dans le même instantané donne toujours la même fiche, et rien n'est modifié. Sans dépendance,
// hors moteur/corps.js (la normalisation du corps). Node (require) ou navigateur (globalThis.OrvaneFiche, après moteur/corps.js).
(function (racine) {
'use strict';
const VERSION = '1.0', STYLE = '[STYLE ORVANE]';
const lireCorps = () => racine.OrvaneCorps || (typeof require === 'function' ? require('../moteur/corps.js') : null);
const NUM7 = ['long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue'];
const RESUMES = ['cornes', 'crete', 'ailes', 'carapace', 'antennes'];   // les proportions d'avant, résumé de la liste des organes
const BASES = ['quadrupede', 'hexapode', 'bipede', 'oiseau', 'serpent', 'segmente', 'radiaire', 'tentaculaire'];

// ——— les nombres, à la française, sans dépendre de la langue de la machine (la même fiche partout) ———
const ESP = ' ';
const fr = (v, d = 0) => { const a = Math.abs(+v || 0), [e, f = ''] = a.toFixed(d).split('.'), q = f.replace(/0+$/, ''), g = e.replace(/\B(?=(\d{3})+(?!\d))/g, ESP);
  return (v < 0 && +a.toFixed(d) ? '−' : '') + g + (q ? ',' + q : ''); };
const en = (v, d = 0) => String(+(+v || 0).toFixed(d));
const pc = x => { const v = x * 100; return v > 0 && v < .1 ? 'moins de 0,1' + ESP + '%' : fr(v, v < 10 ? 1 : 0) + ESP + '%'; };
const longueur = m => m >= 1 ? fr(m, 1) + ESP + 'm' : m >= .1 ? fr(m * 100) + ESP + 'cm' : m >= .01 ? fr(m * 100, 1) + ESP + 'cm' : fr(m * 1000, 1) + ESP + 'mm';
const length = m => m >= 1 ? en(m, 1) + ' m' : m >= .1 ? en(m * 100) + ' cm' : m >= .01 ? en(m * 100, 1) + ' cm' : en(m * 1000, 1) + ' mm';
const masse = kg => kg >= 1000 ? fr(kg / 1000, 1) + ESP + 't' : kg >= 10 ? fr(kg) + ESP + 'kg' : kg >= 1 ? fr(kg, 1) + ESP + 'kg' : kg >= .01 ? fr(kg * 1000) + ESP + 'g' : fr(kg * 1000, 1) + ESP + 'g';
const weight = kg => kg >= 1000 ? en(kg / 1000, 1) + ' t' : kg >= 10 ? en(kg) + ' kg' : kg >= 1 ? en(kg, 1) + ' kg' : kg >= .01 ? en(kg * 1000) + ' g' : en(kg * 1000, 1) + ' g';
const Maj = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const min1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;

// ——— les sources : une donnée (`champ: valeur`) ou une décision de la DA ———
const val = v => Array.isArray(v) ? '[' + v.map(val).join(', ') + ']' : typeof v === 'string' ? JSON.stringify(v) : typeof v === 'number' ? String(+v.toFixed(4))
  : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + val(x)).join(', ') + ' }' : String(v);
const ci = (champ, v) => '`' + champ + (v === undefined ? '' : ': ' + val(v)) + '`';
const par = (...L) => '(' + L.filter(Boolean).join(', ') + ')';
const interp = t => '*(interprété : ' + t + ')*';
const regle = (id, t) => '*(règle `' + id + '`' + (t ? ' : ' + t : '') + ')*';
const voyelle = s => /^[aeiouyéèêàâîôûœh]/i.test(s || '');
const pasDe = mot => (voyelle(mot) ? 'pas d\'' : 'pas de ') + mot;
// l'article devant le nom d'une lignée : « du Firtis », « de l'Ouvaan »
const art = { du: n => voyelle(n) ? 'de l\'' : 'du ', au: n => voyelle(n) ? 'à l\'' : 'au ', le: n => voyelle(n) ? 'l\'' : 'le ' };
const liste = L => L.length < 2 ? L.join('') : L.slice(0, -1).join(', ') + ' et ' + L[L.length - 1];
const list = L => L.length < 2 ? L.join('') : L.slice(0, -1).join(', ') + ' and ' + L[L.length - 1];
const palier = (v, P) => { for (const p of P) if (v < p[0]) return p; return P[P.length - 1]; };

// ——— les couleurs : l'hexadécimal, et un nom en mots tiré d'une petite table de teintes (déterministe) ———
const hex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function hsl(c) { const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-9) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l]; }
// par teinte (jusqu'à h degrés) : la clarté sous laquelle elle est sombre ; puis sombre, moyen, clair (pastel), terne (peu saturé),
// moyen vif et clair vif (saturés), chacun [français, anglais]
const TEINTES = [
  [15,  .3,  ['bordeaux', 'burgundy'], ['rouge', 'red'], ['rose', 'pink'], ['vieux rose', 'dusty rose'], ['rouge vif', 'bright red'], ['rose saumon', 'salmon pink']],
  [40,  .42, ['brun', 'brown'], ['roux', 'russet'], ['chamois', 'buff'], ['fauve', 'tan'], ['orange', 'orange'], ['orange clair', 'light orange']],
  [70,  .38, ['brun olive', 'olive brown'], ['ocre', 'ochre'], ['crème', 'cream'], ['sable', 'sand'], ['jaune', 'yellow'], ['jaune clair', 'light yellow']],
  [100, .3,  ['olive sombre', 'dark olive'], ['olive', 'olive'], ['vert pâle', 'pale yellow-green'], ['kaki', 'khaki'], ['vert-jaune', 'chartreuse'], ['vert-jaune clair', 'light chartreuse']],
  [165, .25, ['vert sombre', 'dark green'], ['vert', 'green'], ['vert tendre', 'pale green'], ['vert grisé', 'sage green'], ['vert vif', 'vivid green'], ['vert clair', 'light green']],
  [200, .3,  ['bleu-vert sombre', 'dark teal'], ['bleu-vert', 'teal'], ['vert d\'eau', 'pale aqua'], ['bleu-vert terne', 'muted teal'], ['turquoise', 'turquoise'], ['turquoise clair', 'light turquoise']],
  [250, .3,  ['bleu nuit', 'navy blue'], ['bleu', 'blue'], ['bleu ciel', 'sky blue'], ['bleu ardoise', 'slate blue'], ['bleu vif', 'bright blue'], ['bleu clair', 'light blue']],
  [290, .3,  ['indigo', 'indigo'], ['violet', 'violet'], ['lavande', 'lavender'], ['violet poussiéreux', 'dusty violet'], ['violet vif', 'bright violet'], ['lilas', 'lilac']],
  [345, .3,  ['prune', 'dark plum'], ['mauve', 'mauve'], ['rose', 'pink'], ['mauve poussiéreux', 'dusty mauve'], ['magenta', 'magenta'], ['rose vif', 'bright pink']],
  [361, .3,  ['bordeaux', 'burgundy'], ['rouge', 'red'], ['rose', 'pink'], ['vieux rose', 'dusty rose'], ['rouge vif', 'bright red'], ['rose saumon', 'salmon pink']],
];
// les gris à peine teintés : la nuance par teinte (de 15 à 70 degrés, un gris chaud : le gris-brun)
const NUANCES = [[15, 'rosé', 'pinkish'], [70, null, null], [165, 'verdâtre', 'greenish'], [250, 'bleuté', 'bluish'], [290, 'violacé', 'purplish'], [361, 'rosé', 'pinkish']];
function nomCouleur(c) {
  const [h, s, l] = hsl(c);
  if (l < .12 && s >= .1) return { fr: 'presque noir', en: 'near-black' };
  if (s < .1 || l < .07 || l > .95) { const G = palier(l, [[.12, 'noir', 'black'], [.3, 'gris anthracite', 'charcoal grey'], [.5, 'gris sombre', 'dark grey'], [.7, 'gris', 'grey'], [.88, 'gris clair', 'light grey'], [Infinity, 'blanc', 'white']]); return { fr: G[1], en: G[2] }; }
  if (s < .2) { const N = palier(h, NUANCES);
    if (!N[1]) { const G = palier(l, [[.3, 'brun-gris sombre', 'dark taupe'], [.55, 'gris-brun', 'taupe'], [.75, 'gris-brun clair', 'light taupe'], [Infinity, 'beige', 'beige']]); return { fr: G[1], en: G[2] }; }
    return { fr: 'gris ' + N[1] + (l < .3 ? ' sombre' : l > .8 ? ' pâle' : ''), en: (l < .3 ? 'dark ' : l > .6 ? 'pale ' : '') + N[2] + '-grey' }; }
  const T = palier(h, TEINTES), sature = s >= .6, [nf, ne] = l < T[1] - (sature ? .12 : 0) ? T[2] : l > .72 ? (sature ? T[7] : T[4]) : s < .35 ? T[5] : sature ? T[6] : T[3];
  return { fr: nf, en: ne };
}
const OS = [239, 231, 210];   // l'ivoire des cornes, des défenses et des griffes, celui des planches (monde/silhouette.js)

// ——— la table des familles visuelles (versionnée) ———
// Les familles restent proches de la Terre : un humain comme une IA d'image les lit sans ambiguïté. Leurs identifiants sont à Orvane.
const FAMILLES = {
  pelage:     { tegument: ['poil', 'fur'], lecture: 'un mammifère', autres: [['d\'écailles', 'scales'], ['de plumes', 'feathers']] },
  plumage:    { tegument: ['plumes', 'feathers'], lecture: 'un oiseau', autres: [['de poil', 'fur'], ['d\'écailles sur le corps', 'scaly body']] },
  chitine:    { tegument: ['cuticule de chitine', 'chitin exoskeleton'], lecture: 'un insecte, un arthropode', autres: [['de poil', 'fur'], ['de plumes', 'feathers'], ['de peau de mammifère', 'mammal skin']] },
  ecailles:   { tegument: ['écailles', 'scales'], lecture: 'un poisson, un serpent, un lézard', autres: [['de poil', 'fur'], ['de plumes', 'feathers']] },
  cuirasse:   { tegument: ['carapace et peau écailleuse', 'shell and scaly skin'], lecture: 'une tortue, un pangolin', autres: [['de poil', 'fur'], ['de plumes', 'feathers'], ['de pinces de crabe', 'crab claws']] },
  'peau-nue': { tegument: ['peau nue, lisse et humide', 'smooth moist naked skin'], lecture: 'un amphibien', autres: [['de poil', 'fur'], ['de plumes', 'feathers'], ['d\'écailles', 'scales']] },
  gelee:      { tegument: ['corps mou, translucide par endroits', 'soft gelatinous body'], lecture: 'une méduse, une étoile, une pieuvre', autres: [['de poil', 'fur'], ['d\'écailles', 'scales'], ['d\'os ni de pattes articulées', 'bones, jointed legs']] },
  machine:    { tegument: ['panneaux et métal', 'metal panels'], lecture: 'une machine de la Mère', autres: [['de chair', 'flesh'], ['de poil', 'fur'], ['d\'yeux vivants', 'organic eyes']] },
};
const QB = k => k.plan === 'quadrupede' || k.plan === 'bipede';
// Les règles, dans l'ordre : la première qui convient choisit. Chacune dit pourquoi, en une phrase (docs/52 : les cas ambigus de l'issue 39).
const REGLES = [
  { id: 'machine', famille: 'machine', quand: 'régime synthétique : une machine de la Mère, avec ou sans corps', cas: 'clair',
    pourquoi: 'Une machine n\'a pas de peau : son aspect vient de ses modules (docs/16), comme sur les planches.', si: k => k.machine },
  { id: 'gelee', famille: 'gelee', quand: 'corps rayonné ou à tentacules (radiaire, tentaculaire)', cas: 'clair',
    pourquoi: 'Sans squelette ni pattes articulées, un corps qui nage ou rampe au fond se lit comme une méduse, une étoile ou une pieuvre : mou.', si: k => k.plan === 'radiaire' || k.plan === 'tentaculaire' },
  { id: 'chitine-segmente', famille: 'chitine', quand: 'corps segmenté (un mille-pattes)', cas: 'clair',
    pourquoi: 'Des anneaux qui portent chacun une paire de pattes : un arthropode, donc une cuticule.', si: k => k.plan === 'segmente' },
  { id: 'plumage', famille: 'plumage', quand: 'forme oiseau', cas: 'clair',
    pourquoi: 'Un bipède ailé de la forme oiseau : l\'œil n\'attend rien d\'autre que des plumes.', si: k => k.plan === 'oiseau' },
  { id: 'ecailles-poisson', famille: 'ecailles', quand: 'un poisson : un corps sans pattes qui ne fait que nager (allure de moteur/corps.js)', cas: 'clair',
    pourquoi: 'C\'est la lecture que fait déjà le moteur (allure) : un poisson, des écailles et des nageoires ordinaires.', si: k => k.allure === 'poisson' },
  { id: 'chitine', famille: 'chitine', quand: 'hexapode (six pattes, ou huit), quelle que soit sa taille', cas: 'tranché pour les géants',
    pourquoi: 'Des pattes articulées sous un corps en trois parties : un insecte ; un géant le reste, mais sa cuticule s\'épaissit au-delà de 1 kg (chitine-geant).', si: k => k.plan === 'hexapode' },
  { id: 'ecailles-serpent', famille: 'ecailles', quand: 'serpent qui ne fait pas que nager (il rampe, fouit, grimpe…)', cas: 'tranché',
    pourquoi: 'Un corps sans pattes qui vit au sol se lit comme un serpent : des écailles, et non la peau nue d\'un ver.', si: k => k.plan === 'serpent' },
  { id: 'pelage', famille: 'pelage', quand: 'quadrupède ou bipède vivipare, avec ou sans carapace, avec ou sans ailes', cas: 'tranché (bipède, ailé, à carapace)',
    pourquoi: 'Mettre bas est ce qui ressemble le plus à un mammifère : du poil ; une carapace s\'y pose comme sur un tatou, des ailes s\'y ajoutent, et la famille ne change pas quand l\'une ou l\'autre vient ou se perd.', si: k => QB(k) && k.reproduction === 'vivipare' },
  { id: 'cuirasse', famille: 'cuirasse', quand: 'quadrupède ou bipède ovipare à carapace', cas: 'tranché',
    pourquoi: 'Pondre et porter une carapace, c\'est une tortue ou un pangolin plutôt qu\'un crabe : aucune de ces lignées n\'a de pinces.', si: k => QB(k) && k.carapace },
  { id: 'peau-nue', famille: 'peau-nue', quand: 'quadrupède ou bipède ovipare sans carapace, qui nage', cas: 'tranché',
    pourquoi: 'Pondre et nager sans carapace : un amphibien, à la peau lisse et humide.', si: k => QB(k) && k.nage },
  { id: 'ecailles-lezard', famille: 'ecailles', quand: 'quadrupède ou bipède ovipare sans carapace, qui ne nage pas', cas: 'tranché',
    pourquoi: 'Pondre sur la terre sèche, sans carapace : un lézard, à écailles.', si: () => true },
];
// Les détails du tégument, dans une famille : ce que la DA décide, une fois pour toutes, et pourquoi
const DETAILS = [
  { id: 'pelage-nageur', famille: 'pelage', quand: 'elle nage', fr: 'poil ras, serré et lustré, comme une loutre', en: 'short sleek dense waterproof fur', pourquoi: 'L\'eau plaque le poil : un nageur l\'a court et serré.' },
  { id: 'pelage-froid', famille: 'pelage', quand: 'niche froide (temperature < 0,3), et elle ne rampe ni ne fouit', fr: 'poil long et épais', en: 'long thick shaggy fur', pourquoi: 'Le froid épaissit la fourrure.' },
  { id: 'pelage-froid-ras', famille: 'pelage', quand: 'niche froide (temperature < 0,3), et elle rampe ou fouit', fr: 'poil court et dense', en: 'short dense fur', pourquoi: 'Le froid la rend dense ; une bête qui rampe ou fouit la garde courte.' },
  { id: 'pelage-chaud', famille: 'pelage', quand: 'niche chaude (temperature ≥ 0,7)', fr: 'poil ras et clairsemé', en: 'very short sparse fur', pourquoi: 'La chaleur l\'éclaircit.' },
  { id: 'pelage-tempere', famille: 'pelage', quand: 'le reste', fr: 'poil court', en: 'short fur', pourquoi: 'Une niche tempérée ne pousse ni au long ni au ras.' },
  { id: 'pelage-carapace', famille: 'pelage', quand: 'une vivipare à carapace', fr: 'sur le dos, une carapace de plaques cornées, comme un tatou ; le poil reste au ventre, aux pattes et à la tête', en: 'armadillo-like dorsal shield of horny plates, fur on belly, legs and head', pourquoi: 'La carapace se pose sur un mammifère sans lui ôter son poil.' },
  { id: 'chitine-elytres', famille: 'chitine', quand: 'une carapace de plus de 0,3', fr: 'deux élytres, des étuis durs qui couvrent l\'abdomen, comme un scarabée', en: 'hard wing-cases (elytra) covering the abdomen, beetle-like', pourquoi: 'Chez un insecte, une carapace est une paire d\'élytres.' },
  { id: 'chitine-bouclier', famille: 'chitine', quand: 'une carapace de 0,3 ou moins', fr: 'une plaque dorsale courte et durcie, qui ne couvre pas tout l\'abdomen', en: 'short hardened dorsal plate that leaves the abdomen visible', pourquoi: 'Trop petite pour des élytres, elle reste un bouclier.' },
  { id: 'chitine-geant', famille: 'chitine', quand: 'une masse de 1 kg ou plus', fr: 'géant : une cuticule épaisse et mate, en plaques jointives, des articulations larges et des pattes épaisses, pour qu\'on sente son poids', en: 'giant arthropod with thick matte armored cuticle in overlapping plates, sturdy thick jointed legs, heavy realistic weight, not toy-like', pourquoi: 'Le plus lourd des insectes de la Terre pèse 100 g : à 1 kg, une cuticule fine et luisante ferait un jouet.' },
  { id: 'chitine-colosse', famille: 'chitine', quand: 'une masse de 10 kg ou plus', fr: 'des pattes comme des piliers', en: 'pillar-like legs', pourquoi: 'À la masse d\'un chien, il faut des appuis de chien.' },
  { id: 'chitine-nageur', famille: 'chitine', quand: 'elle nage', fr: 'pattes arrière aplaties en rames', en: 'flattened oar-like hind legs for swimming', pourquoi: 'Un insecte nageur rame avec ses pattes arrière.' },
  { id: 'cuirasse-nageur', famille: 'cuirasse', quand: 'elle nage', fr: 'carapace basse, lisse et profilée, comme une tortue d\'eau ; peau écailleuse sur la tête et les pattes', en: 'low smooth streamlined shell like a freshwater turtle, scaly skin on head and legs', pourquoi: 'L\'eau use et profile : un nageur porte sa carapace basse.' },
  { id: 'cuirasse-terre', famille: 'cuirasse', quand: 'elle ne nage pas', fr: 'carapace haute, en plaques jointives, comme une tortue terrestre ou un pangolin ; peau écailleuse sur la tête et les pattes', en: 'high shell of interlocking plates like a tortoise or a pangolin, scaly skin on head and legs', pourquoi: 'Sur terre, la carapace protège d\'en haut : bombée, en plaques.' },
  { id: 'ecailles-poisson', famille: 'ecailles', quand: 'un poisson', fr: 'écailles fines et brillantes ; les nageoires ordinaires d\'un poisson (dorsale, pectorales, caudale)', en: 'fine glossy fish scales, ordinary small fish fins (dorsal, pectoral, tail fin)', pourquoi: 'Un poisson a ses nageoires ; l\'organe nageoires dit seulement des nageoires plus grandes.' },
  { id: 'ecailles-serpent', famille: 'ecailles', quand: 'un serpent', fr: 'écailles lisses et imbriquées, de larges plaques sous le ventre', en: 'smooth overlapping snake scales, broad belly scutes', pourquoi: 'Un serpent glisse sur ses plaques ventrales.' },
  { id: 'ecailles-lezard', famille: 'ecailles', quand: 'un quadrupède ou un bipède', fr: 'écailles fines et sèches, comme un lézard', en: 'dry fine lizard scales', pourquoi: 'La terre sèche, pas l\'eau : des écailles de lézard.' },
  { id: 'plumage-froid', famille: 'plumage', quand: 'niche froide (temperature < 0,3)', fr: 'plumage épais et duveteux', en: 'thick fluffy plumage', pourquoi: 'Le froid gonfle le plumage.' },
  { id: 'plumage-nageur', famille: 'plumage', quand: 'il nage', fr: 'plumage serré, lustré, imperméable', en: 'tight sleek waterproof plumage', pourquoi: 'Un oiseau d\'eau a les plumes huilées.' },
  { id: 'plumage-lisse', famille: 'plumage', quand: 'le reste', fr: 'plumage lisse', en: 'smooth plumage', pourquoi: 'Rien ne pousse au duvet.' },
  { id: 'peau-nue', famille: 'peau-nue', quand: 'toujours', fr: 'peau nue, lisse et humide, comme une salamandre ou un axolotl', en: 'smooth moist naked skin like a salamander or an axolotl', pourquoi: 'Un amphibien respire aussi par la peau.' },
  { id: 'gelee-meduse', famille: 'gelee', quand: 'un corps rayonné qui nage', fr: 'une cloche molle, translucide par endroits, comme une méduse', en: 'soft translucent jellyfish-like bell', pourquoi: 'Il pulse en pleine eau.' },
  { id: 'gelee-etoile', famille: 'gelee', quand: 'un corps rayonné qui ne nage pas', fr: 'un corps mou et rayonné, la peau grenue, comme une étoile de mer', en: 'soft radial starfish-like body with grainy skin', pourquoi: 'Il rampe au fond.' },
  { id: 'gelee-pieuvre', famille: 'gelee', quand: 'un corps à tentacules', fr: 'un manteau mou et des bras souples, comme une pieuvre', en: 'soft octopus-like mantle and flexible arms', pourquoi: 'Il n\'a que des bras.' },
  { id: 'machine', famille: 'machine', quand: 'toujours', fr: 'un châssis arrondi sur quatre pattes articulées, un œil-lentille qui luit, ce que portent ses modules', en: 'rounded metal chassis on four articulated legs, a glowing lens eye', pourquoi: 'Le dessin des machines des planches (monde/silhouette.js).' },
  { id: 'robe-du-plan', famille: '*', quand: 'plus de la moitié des bêtes portent une robe d\'allèle (mélanisme, albinisme, robe dorée, camouflage)', fr: 'le modèle garde la robe du plan ; la robe d\'allèle est une variante, faite en le recolorant', en: '', pourquoi: 'La robe du plan est celle des planches et celle que compare la parenté : une seule image de référence par lignée, et ses variantes en recolorant.' },
  { id: 'parade-accent', famille: '*', quand: 'un organe de parade ou d\'avertissement (crête, collerette, panache, plaques)', fr: 'la teinte d\'accent des planches : la robe tournée de 150°', en: 'contrasting accent color', pourquoi: 'Un organe de parade sert à être vu ; les planches de l\'Observatoire lui donnent la teinte opposée à la robe, et le modèle doit s\'accorder à la planche.' },
];
const DET = Object.fromEntries(DETAILS.map(d => [d.famille + ':' + d.id, d]));
const det = (fam, id) => DET[fam + ':' + id] || DET['*:' + id];
const table = () => JSON.parse(JSON.stringify({ version: VERSION, familles: FAMILLES, regles: REGLES.map(({ si, ...r }) => r), details: DETAILS }));

// le mode d'une lignée qui ne le dit pas (un monde sans ponte éveillée) : la règle de moteur/ponte.js (modeDe), recopiée telle quelle
function modeDe(p) { const c = p.corps || {}, loco = p.locomotion || [];
  if (c.forme === 'oiseau' || c.forme === 'serpent' || c.forme === 'hexapode') return 'ovipare';
  if (p.regime === 'filtreur' || (loco.includes('nage') && !loco.some(l => ['marche', 'course', 'grimpe', 'saut'].includes(l)))) return 'ovipare';
  if ((p.masse_kg || 1) < .02) return 'ovipare';
  return (c.carapace || 0) >= .3 || (c.organes || []).some(o => o.type === 'plaques' || o.type === 'carapace') ? 'ovipare' : 'vivipare'; }

// ce que la famille lit d'une lignée : son plan visuel. Deux lignées au même plan visuel ont la même famille.
function cleDe(t, I, C) {
  const p = t.plan || {};
  if (p.regime === 'synthetique') return { machine: true };
  const c = C.normaliser(p.corps), loco = p.locomotion || [], F = I?.catalogue?.monde?.formes || {};
  let plan = c.forme;
  if (!BASES.includes(plan)) plan = BASES.includes(F[plan]?.repli) ? F[plan].repli : c.pattes === 0 ? 'serpent' : c.pattes === 2 ? 'bipede' : c.pattes === 4 ? 'quadrupede' : 'hexapode';   // une forme du monde : son repli
  return { plan, allure: C.allure(c, p), reproduction: p.reproduction || modeDe(p), carapace: c.organes.some(o => o.type === 'carapace'), nage: loco.includes('nage') };
}
function familleAvec(t, I, C) { const k = cleDe(t, I, C), R = REGLES.find(r => r.si(k)); return { id: R.famille, regle: R.id, cle: k }; }
function avecCorps(I, f) { const C = lireCorps(); if (!C) throw new Error('OrvaneFiche : moteur/corps.js manque (dans un navigateur, chargez-le avant monde/fiche.js)');
  const avant = C.etendre(I?.catalogue?.monde || null); try { return f(C); } finally { C.etendre(avant); } }
function famille(t, I) { if (!t?.plan) throw new Error('OrvaneFiche.famille : une lignée de l\'instantané (taxon.plan) est attendue'); return avecCorps(I, C => familleAvec(t, I, C)); }

// ——— le vocabulaire ———
// les proportions : [seuil, en français, en anglais] ; la valeur 0 a sa phrase (ZERO)
const PALIERS = {
  long:     [[.2, 'très trapu', 'very short compact body'], [.4, 'trapu', 'compact body'], [.6, 'de longueur moyenne', 'medium-length body'], [.8, 'allongé', 'elongated body'], [Infinity, 'très allongé', 'very elongated body']],
  haut:     [[.2, 'très courtes', 'very short legs'], [.35, 'courtes', 'short legs'], [.55, 'de hauteur moyenne', 'medium-length legs'], [.75, 'hautes', 'long legs'], [Infinity, 'très hautes, d\'échassier', 'very long stilt-like legs']],
  cou:      [[.2, 'très court', 'very short neck'], [.4, 'court', 'short neck'], [.6, 'dégagé', 'visible neck'], [.8, 'long', 'long neck'], [Infinity, 'très long', 'very long neck']],
  tete:     [[.2, 'très petite', 'very small head'], [.4, 'petite', 'small head'], [.6, 'moyenne', 'medium-sized head'], [.8, 'grosse', 'large head'], [Infinity, 'énorme pour le corps', 'oversized broad head']],
  museau:   [[.2, 'très court', 'very short snout'], [.4, 'court', 'short snout'], [.6, 'moyen', 'medium snout'], [.8, 'long', 'long snout'], [Infinity, 'très long, effilé', 'very long tapering snout']],
  oreilles: [[.12, 'minuscules, à peine visibles', 'tiny barely visible ears'], [.35, 'petites', 'small ears'], [.7, 'moyennes', 'medium ears'], [Infinity, 'grandes', 'large ears']],
  queue:    [[.1, 'réduite à un moignon', 'stub tail'], [.3, 'courte', 'short tail'], [.55, 'de longueur moyenne', 'medium-length tail'], [.8, 'longue', 'long tail'], [Infinity, 'très longue', 'very long tail']],
  bec:      [[.2, 'très court', 'very short beak'], [.4, 'court', 'short beak'], [.6, 'moyen', 'medium beak'], [.8, 'long', 'long beak'], [Infinity, 'très long', 'very long beak']],
  caudale:  [[.1, 'minuscule', 'tiny tail fin'], [.3, 'petite', 'small tail fin'], [.55, 'moyenne', 'medium tail fin'], [.8, 'haute', 'large tail fin'], [Infinity, 'très haute', 'very large tail fin']],
};
const ZERO = { cou: ['pas de cou : la tête posée sur les épaules', 'no neck, head set directly on the shoulders', 'neck'], museau: ['aucun museau : la face plate', 'flat face without snout', 'snout, muzzle'],
  oreilles: ['aucune oreille visible', 'earless head', 'ears, ear flaps'], queue: ['pas de queue', 'tailless', 'tail'] };
const MOT = { long: 'corps', haut: 'pattes', cou: 'cou', tete: 'tête', museau: 'museau', oreilles: 'oreilles', queue: 'queue', bec: 'bec' };
// ce qui compte, forme par forme (les planches ne dessinent pas le reste : un insecte n'a ni oreilles ni museau)
const UTILES = { quadrupede: NUM7, bipede: NUM7, oiseau: ['long', 'haut', 'cou', 'tete', 'museau', 'queue'], hexapode: ['long', 'haut', 'tete'], serpent: ['long', 'tete'],
  poisson: ['long', 'tete', 'queue'], segmente: ['long', 'tete'], radiaire: ['long', 'tete'], tentaculaire: ['tete'] };
const NOMS_ALLURE = { quadrupede: ['quadrupède', 'quadruped'], bipede: ['bipède', 'bipedal creature'], oiseau: ['oiseau', 'bird-like creature'], hexapode: ['hexapode', 'arthropod'],
  serpent: ['serpent', 'legless snake-like creature'], poisson: ['poisson', 'fish-like creature'], segmente: ['corps segmenté', 'segmented many-legged creature'],
  radiaire: ['corps rayonné', 'radial creature'], tentaculaire: ['corps à tentacules', 'octopus-like creature'] };
// la carrure : la masse pour la longueur au cube, rapportée à ce qu'est une bête ordinaire de cette allure sur la Terre
const CARRURES = {
  quadrupede: [15, 45, [[5, 'très fine et légère', 'very slender', 'very light'], [15, 'fine et légère', 'slender', 'light'], [45, 'de carrure ordinaire', '', ''], [75, 'massive', 'heavy-set', 'heavy'], [Infinity, 'très massive, trapue', 'massive stocky', 'very heavy']]],
  hexapode: [60, 130, [[20, 'très fine, comme un phasme', 'stick-thin', 'very light'], [60, 'fine', 'slender', 'light'], [130, 'de carrure ordinaire pour un insecte', '', ''], [Infinity, 'massive', 'heavy-set', 'heavy']]],
  serpent: [1, 3, [[1, 'très fine', 'very thin', 'very light'], [3, 'fine, d\'épaisseur ordinaire pour un serpent', 'slender', ''], [15, 'épaisse', 'thick-bodied', 'heavy'], [Infinity, 'très épaisse, trapue', 'very thick stocky', 'very heavy']]],
  poisson: [6, 45, [[6, 'fine et allongée, comme une anguille', 'slender eel-like', 'light'], [20, 'fuselée', 'streamlined', ''], [45, 'pleine', 'full-bodied', ''], [Infinity, 'massive et haute', 'deep-bodied massive', 'heavy']]],
  oiseau: [4, 12, [[4, 'légère et élancée', 'slender', 'light'], [12, 'de carrure ordinaire', '', ''], [Infinity, 'lourde', 'heavy-bodied', 'heavy']]],
};
CARRURES.bipede = CARRURES.quadrupede; CARRURES.segmente = CARRURES.hexapode; CARRURES.radiaire = CARRURES.tentaculaire = CARRURES.poisson;
const TAILLES_EN = [[.05, 'tiny'], [.2, 'very small'], [.6, 'small'], [1.5, 'medium-sized'], [3, 'large'], [Infinity, 'huge']];
const CHIFFRES = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'];
const NUMBERS = ['no', 'a single', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const nombreFr = (n, fem) => n === 1 ? (fem ? 'une' : 'un') : n < CHIFFRES.length ? CHIFFRES[n] : fr(n);
const nombreEn = n => n < NUMBERS.length ? NUMBERS[n] : String(n);
// la forme dite d'un organe : [féminin, masculin] au singulier (comme moteur/corps.js), accordée en nombre
const FORME_FR = { recourbees: ['recourbée', 'recourbé'], droites: ['droite', 'droit'], ramifiees: ['ramifiée', 'ramifié'], lisse: ['lisse', 'lisse'], dentelee: ['dentelée', 'dentelé'],
  frangee: ['frangée', 'frangé'], fines: ['fine', 'fin'], plumeuses: ['plumeuse', 'plumeux'], courte: ['courte', 'court'], longue: ['longue', 'long'], plumes: ['de plumes'], membranes: ['de peau', 'de peau'],
  courtes: ['courte', 'court'], voiles: ['en voile'], bombee: ['bombée', 'bombé'], segmentee: ['segmentée', 'segmenté'], triangles: ['triangulaire', 'triangulaire'], rondes: ['ronde', 'rond'],
  massives: ['massive', 'massif'], ronde: ['ronde', 'rond'], cloutee: ['cloutée', 'clouté'], droit: ['droite', 'droit'], courbe: ['courbe', 'courbe'], touffe: ['en touffe'], eventail: ['en éventail'],
  agiles: ['agile', 'agile'], puissantes: ['puissante', 'puissant'] };
const formeFr = (f, fem, plur) => { const m = FORME_FR[f]; if (!m) return f ? '« ' + f + ' »' : ''; const s = m[fem || m.length < 2 ? 0 : 1]; return !plur || /^(en|de) /.test(s) || /[sx]$/.test(s) ? s : s + 's'; };
// un organe en anglais : le nom (singulier, pluriel), et pour chaque forme [avant le nom, après le nom] ; ce qu'on interdit
const ORG_EN = {
  cornes:     { n: ['horn', 'horns'], f: { recourbees: ['', 'curving back in a crescent'], droites: ['straight', 'pointing up and forward'], ramifiees: ['branched antler-like', ''] }, neg: 'horns, antlers', autre: { recourbees: 'curved horns', droites: 'straight horns', ramifiees: 'antlers' } },
  defenses:   { n: ['tusk', 'tusks'], f: { recourbees: ['upward-curving', ''], droites: ['straight', 'pointing forward'] }, neg: 'tusks', autre: { recourbees: 'curved tusks', droites: 'straight tusks' } },
  crete:      { n: ['crest', 'crests'], f: { lisse: ['smooth rounded', ''], dentelee: ['serrated', ''] }, neg: 'crest', autre: { lisse: 'smooth crest', dentelee: 'serrated crest' } },
  collerette: { n: ['neck frill', 'neck frills'], f: { lisse: ['smooth', 'behind the head'], frangee: ['fringed', 'behind the head'] }, neg: 'neck frill', autre: { lisse: 'smooth frill', frangee: 'fringed frill' } },
  antennes:   { n: ['antenna', 'antennae'], f: { fines: ['thin', ''], plumeuses: ['feathery', ''] }, neg: 'antennae', autre: { fines: 'thin antennae', plumeuses: 'feathery antennae' } },
  trompe:     { n: ['trunk', 'trunks'], f: { courte: ['short', ''], longue: ['long', ''] }, neg: 'trunk, proboscis', autre: { courte: 'short trunk', longue: 'long trunk' } },
  ailes:      { n: ['wing', 'wings'], f: { plumes: ['feathered', ''], membranes: ['membranous skin', ''] }, neg: 'wings', autre: { plumes: 'feathered wings', membranes: 'membranous bat wings' } },
  nageoires:  { n: ['fin', 'fins'], f: { courtes: ['short', ''], voiles: ['tall sail-like', ''] }, neg: 'fins', autre: { courtes: 'short fins', voiles: 'sail fins' } },
  carapace:   { n: ['shell', 'shells'], f: { bombee: ['domed', ''], segmentee: ['banded segmented', ''] }, neg: 'shell, carapace', autre: { bombee: 'domed shell', segmentee: 'banded shell' } },
  plaques:    { n: ['dorsal plate', 'dorsal plates'], f: { triangles: ['triangular', ''], rondes: ['rounded', ''] }, neg: 'dorsal plates', autre: { triangles: 'triangular plates', rondes: 'rounded plates' } },
  epines:     { n: ['spine', 'spines'], f: { fines: ['thin', ''], massives: ['massive', ''] }, neg: 'spines, quills', autre: { fines: 'thin spines', massives: 'massive spikes' } },
  massue:     { n: ['tail club', 'tail clubs'], f: { ronde: ['round', ''], cloutee: ['spiked', ''] }, neg: 'tail club', autre: { ronde: 'round club', cloutee: 'spiked club' } },
  aiguillon:  { n: ['stinger', 'stingers'], f: { droit: ['straight', ''], courbe: ['curved', 'arched over the back like a scorpion'] }, neg: 'stinger', autre: { droit: 'straight stinger', courbe: 'curved scorpion stinger' } },
  panache:    { n: ['tuft', 'tufts'], f: { touffe: ['fluffy', ''], eventail: ['fan-shaped', 'plume'] }, neg: 'tail tuft, plume', autre: { touffe: 'fluffy tuft', eventail: 'fan-shaped plume' } },
  pinces:     { n: ['pincer', 'pincers'], f: { fines: ['slender', ''], massives: ['massive', ''] }, neg: 'pincers, crab claws', autre: { fines: 'slender pincers', massives: 'massive claws' } },
  mains:      { n: ['grasping hand', 'grasping hands'], f: { agiles: ['dexterous', ''], puissantes: ['powerful', ''] }, neg: 'hands, fingers', autre: { agiles: 'dexterous hands', puissantes: 'powerful hands' } },
};
const PLACE_FR = { tete: 'à la tête', dos: 'sur le dos', queue: 'au bout de la queue', flancs: 'sur les flancs', avant: 'à l\'avant' };
const PLACE_EN = { tete: 'on the head', dos: 'along the back', queue: 'at the tail tip', flancs: 'on the flanks', avant: 'at the front' };
const TAILLE_ORG = [[.3, 'de petite taille', 'small '], [.55, 'de taille moyenne', ''], [.75, 'de grande taille', 'large '], [Infinity, 'de très grande taille', 'huge ']];
// la fonction d'un organe (catalogue.organes) : comment elle se montre
const FONCTIONS = { combat: 'une arme : dure, nette, usée aux pointes', parade: 'un ornement : net et contrasté, il se voit de loin', avertissement: 'un signal : il se déploie, vif et contrasté',
  perception: 'un sens : fin et mobile', recolte: 'un outil : souple, qui va chercher la nourriture', vol: 'il porte la bête en l\'air : grand et déployable', nage: 'il la propulse dans l\'eau : souple et fin',
  protection: 'une défense passive : épaisse, dure, mate', defense: 'une défense : des pointes dures et acérées', venin: 'une arme à venin : pointue, sombre', saisie: 'il saisit : articulé et fort' };
// ce que l'organe prend comme teinte (les planches) : l'ivoire, la robe, le sombre, l'accent
const TEINTE_ORG = { cornes: 'os', defenses: 'os', epines: 'os', crete: 'accent', collerette: 'accent', panache: 'accent', plaques: 'accent', carapace: 'sombre', nageoires: 'sombre',
  antennes: 'sombre', ailes: 'sombre', pinces: 'sombre', massue: 'sombre', aiguillon: 'sombre', mains: 'robe', trompe: 'robe' };
const MOTIFS = { rayures: ['rayures', 'en travers du dos et des flancs', 'stripes', 'across back and flanks', 'spots'], taches: ['taches', 'sur le dos et les flancs', 'spots', 'on back and flanks', 'stripes'],
  bandes: ['une bande', 'le long des flancs', 'band', 'along the flanks', 'spots'], masque: ['un masque', 'sur les yeux', 'mask', 'across the eyes', ''], uni: ['', '', '', '', 'stripes, spots'] };
// ce qu'un trait du catalogue change à l'aspect, en anglais (pour les variantes ; un trait que la table ne connaît pas garde son présage)
const VUE_EN = { albinisme: 'albino variant: white coat, pale pinkish eyes', melanisme: 'melanistic variant: all-black coat', 'robe-doree': 'golden coat variant', camouflage: 'cryptic coloring that matches the ground',
  gigantisme: 'giant variant, 1.3 times longer and 1.8 times heavier', nanisme: 'dwarf variant, smaller and lighter', 'pattes-longues': 'long hind legs', palmes: 'webbed feet',
  'membrane-planante': 'gliding skin membrane between the legs', 'queue-prehensile': 'prehensile curling tail', 'crocs-allonges': 'long protruding fangs', vibrisses: 'long whiskers',
  'peau-epaisse': 'thick tough hide', carapace: 'bony plates on the back', 'glande-irritante': 'glistening warty skin', 'jet-glandulaire': 'swollen throat gland',
  'coloration-aposematique': 'bright yellow warning stripes', 'yeux-nocturnes': 'large reflective night eyes' };
// ce que montre un trait, selon le corps : des moustaches sont des soies chez un insecte, des barbillons chez un poisson ; des pattes
// longues ne sont rien sans pattes
function vueEn(x, fam, al) {
  const sansPattes = al === 'serpent' || al === 'poisson' || al === 'radiaire' || al === 'tentaculaire';
  if (x === 'vibrisses') return fam === 'chitine' ? 'long sensory bristles on the head' : al === 'poisson' ? 'barbels around the mouth' : fam === 'plumage' ? 'bristles around the beak' : al === 'serpent' ? 'sensory bristles on the snout' : VUE_EN[x];
  if (sansPattes && ['pattes-longues', 'palmes', 'membrane-planante'].includes(x)) return '';
  if (x === 'queue-prehensile' && (fam === 'chitine' || al === 'poisson' || al === 'radiaire' || al === 'tentaculaire')) return '';
  if (x === 'crocs-allonges' && fam === 'chitine') return 'oversized mandibles';
  return VUE_EN[x] || '';
}
const ROBES = ['albinisme', 'melanisme', 'robe-doree', 'camouflage'];
// le nom d'un trait du catalogue, en mots (un trait inventé par le monde garde son nom, ou son identifiant)
const NOMS_TRAITS = { gigantisme: 'gigantisme', nanisme: 'nanisme', 'queue-prehensile': 'queue préhensile', albinisme: 'albinisme', melanisme: 'mélanisme', 'robe-doree': 'robe dorée',
  'pattes-longues': 'pattes longues', palmes: 'palmes', 'membrane-planante': 'membrane planante', 'yeux-nocturnes': 'yeux nocturnes', vibrisses: 'vibrisses', 'glande-irritante': 'glande irritante',
  'jet-glandulaire': 'jet glandulaire', 'crocs-allonges': 'crocs allongés', dard: 'dard', 'peau-epaisse': 'peau épaisse', carapace: 'carapace', camouflage: 'camouflage', 'coloration-aposematique': 'coloration aposématique',
  'metabolisme-lent': 'métabolisme lent', 'estomac-large': 'estomac large', 'ponte-abondante': 'ponte abondante', 'soins-parentaux': 'soins parentaux', gregarisme: 'grégarisme',
  crepuscularite: 'crépuscularité', batisseur: 'bâtisseur', eusocialite: 'eusocialité', metamorphose: 'métamorphose', oophage: 'oophagie' };
const nomTrait = (x, CT) => NOMS_TRAITS[x] || CT?.[x]?.nom || x.replace(/-/g, ' ');
// les façons de se déplacer : le verbe, ce qu'elle donne au corps (interprété), en anglais ; puis ce qui change pour un corps sans
// pattes et pour un insecte
const LOCO = {
  reptation: ['**rampe**', 'le ventre près du sol, les pattes écartées sur les côtés, comme un scinque', 'crawling belly-low like a skink'],
  marche: ['marche', '', ''], course: ['court', 'une coureuse : la foulée longue', 'built for running, long stride'],
  saut: ['saute', 'une sauteuse : les pattes arrière puissantes', 'powerful jumping hind legs'], fouissage: ['fouit', 'une fouisseuse : des griffes fortes aux pattes avant', 'strong digging claws on the forelimbs'],
  grimpe: ['grimpe', 'une grimpeuse : des doigts qui agrippent', 'gripping climbing toes'], nage: ['nage', '', 'a strong swimmer'], vol: ['vole', '', 'able to fly'] };
const LOCO_SERPENT = { reptation: ['ondule au sol', 'elle glisse en S, sans pattes', 'slithering in S-curves'], fouissage: ['fouit', 'elle s\'enfonce la tête la première', 'burrowing head first'],
  grimpe: ['grimpe', 'elle s\'enroule aux branches', 'climbing coiled around branches'], nage: ['nage', 'elle nage en ondulant', 'swimming with sinuous undulations'],
  saut: ['bondit', 'elle se détend comme un ressort', 'launching itself like a spring'], course: ['file', 'elle ondule très vite', 'fast slithering'], marche: ['avance', '', ''], vol: ['plane', 'elle plane, le corps aplati', 'gliding with a flattened body'] };
const LOCO_DEBOUT = { reptation: ['rampe', 'pour ramper, elle se couche, le ventre au sol ; debout le reste du temps', ''], saut: ['saute', 'une sauteuse : de longues pattes arrière, comme une gerboise', 'long powerful hind legs for hopping'] };
const LOCO_INSECTE = { reptation: ['**rampe**', 'le corps plaqué au sol', 'crawling low to the ground'], course: ['court', 'des pattes longues et fines', 'long slender running legs'],
  saut: ['saute', 'des pattes arrière longues et épaisses, comme un criquet', 'long thick jumping hind legs like a grasshopper'], fouissage: ['fouit', 'des pattes avant larges, en pelle', 'broad shovel-like forelegs'],
  grimpe: ['grimpe', 'des pattes crochues', 'hooked climbing legs'] };

// les traits d'une lignée : la part des bêtes qui les montrent (phenotypes) et la fréquence de l'allèle (populations, pondérée par l'effectif)
function traitsDe(t) {
  const P = t.phenotypes || [], pops = t.populations || [], N = pops.reduce((s, p) => s + (p.effectif || 0), 0), R = {};
  for (const ph of P) for (const x of ph.traits || []) (R[x] ??= { part: 0, allele: 0 }).part += ph.frequence || 0;
  if (N > 0) for (const p of pops) for (const [x, q] of Object.entries(p.alleles || {})) (R[x] ??= { part: 0, allele: 0 }).allele += (p.effectif || 0) * q / N;
  return R;
}

// ——— la fiche ———
function ecrire(t, I, options = {}) {
  if (!t || !t.plan) throw new Error('OrvaneFiche.ecrire : une lignée de l\'instantané (taxon.plan) est attendue');
  if (t.plan.regime === 'vegetal') throw new Error('OrvaneFiche.ecrire : « ' + t.id + ' » est une plante ; les plantes ont leur dessin dans monde/herbier.js');
  I = I || {};
  return avecCorps(I, C => rediger(t, I, options, C));
}

function rediger(t, I, opt, C) {
  const p = t.plan, F = familleAvec(t, I, C), fam = F.id, R = REGLES.find(r => r.id === F.regle), k = F.cle, machine = fam === 'machine' && !p.corps;
  const c = machine ? null : C.normaliser(p.corps), brut = p.corps || {}, loco = p.locomotion || [], niche = p.niche || null;
  const T = traitsDe(t), CAT = I.catalogue || {}, CT = CAT.traits || {}, CO = CAT.organes || C.catalogueOrganes();
  const TX = I.taxons || [], parent = t.parent ? TX.find(x => x.id === t.parent) || null : null, filles = TX.filter(x => x.parent === t.id).sort((a, b) => a.id < b.id ? -1 : 1);
  const biomes = Object.fromEntries((I.biomes || []).map(b => [b.id, b]));
  const pops = (t.populations || []).filter(x => (x.effectif || 0) > 0).slice().sort((a, b) => b.effectif - a.effectif || (a.biome < b.biome ? -1 : 1));
  const N = pops.reduce((s, x) => s + x.effectif, 0), nomBiome = id => min1(biomes[id]?.nom || id), nomT = x => x?.nom_commun || x?.nom || x?.id;
  const al = machine ? 'machine' : k.allure === 'poisson' ? 'poisson' : k.plan, utiles = UTILES[al] || NUM7;
  const majeurs = Object.entries(T).filter(([, v]) => v.part >= .5).map(([id]) => id).sort();   // les traits que montrent plus de la moitié des bêtes
  // l'heure que vit la plupart des bêtes : celle du plan, sauf si plus de la moitié portent un trait qui la fixe (yeux nocturnes, crépuscularité)
  const heureT = majeurs.filter(x => CT[x]?.fixe?.activite && CT[x].fixe.activite !== p.activite).sort((a, b) => T[b].part - T[a].part || (a < b ? -1 : 1))[0], heure = heureT ? CT[heureT].fixe.activite : p.activite;
  const heureSrc = heureT ? `${ci('activite', p.activite ?? null)}, mais ${pc(T[heureT].part)} des bêtes portent le trait ${nomTrait(heureT, CT)}, ${ci('catalogue.traits.' + heureT + '.fixe.activite', heure)}` : ci('activite', p.activite ?? null);
  const S = [];   // les sections : { n, titre, phrases }
  const section = (titre, phrases) => S.push({ n: S.length + 1, titre, phrases: phrases.filter(Boolean) });
  const I_ = [];  // les interdits : { fr, en, groupe }
  const interdit = (groupe, frx, enx) => { if (!I_.some(x => x.fr === frx)) I_.push({ groupe, fr: frx, en: enx || '' }); };
  const pro = { avant: [], corps: [], tete: [], organes: [], queueOrg: [], peau: [], couleurs: [], plus: [] };   // les morceaux du prompt
  // une valeur du corps telle que l'instantané la donne ; absente, celle que lui donne moteur/corps.js ; hors bornes, la valeur bornée
  const champ = k2 => brut[k2] === undefined ? '`' + k2 + '` absent : ' + val(c[k2]) + ' par défaut' : Number.isFinite(brut[k2]) && Math.abs(brut[k2] - c[k2]) > .006 ? ci(k2, brut[k2]) + ', borné à ' + val(c[k2]) : ci(k2, brut[k2]);
  const mOrg = c ? c.organes : [], has = ty => mOrg.find(o => o.type === ty);
  let machinePal = [];

  // couleurs (les données, et les teintes de la DA)
  const K = c ? c.couleurs : null, couleur = (rgb, role, src) => ({ role, rgb, hex: hex(rgb), ...nomCouleur(rgb), source: src });
  const pal = K ? { robe: couleur(K.robe, 'robe', 'couleurs.robe'), sombre: couleur(K.sombre, 'sombre', 'couleurs.sombre'), ventre: couleur(K.ventre, 'ventre', 'couleurs.ventre'), oeil: couleur(K.oeil, 'oeil', 'couleurs.oeil'),
    accent: couleur(C.tourner(K.robe, 150), 'accent', 'interprété : la robe tournée de 150° (règle parade-accent)'), os: { ...couleur(OS, 'ivoire', 'interprété : l\'ivoire des planches'), fr: 'ivoire', en: 'ivory' } } : null;

  // —— 1. Identité ——
  { const L = [], n0 = I.cycle?.n, gen = I.monde?.genese?.cycles;
    const nom = t.nom_commun ? `Nom commun « ${t.nom_commun} » ${par(ci('nom_commun', t.nom_commun))}, nom d'Orvane ${t.nom} ${par(ci('nom', t.nom))}.` : null;
    let quand;
    if (t.origine) quand = `Arrivée de ${t.origine.nom || t.origine.monde} par une fusion ${par(ci('origine.monde', t.origine.monde), t.origine.fusion && ci('origine.fusion', t.origine.fusion))}, au cycle ${fr(t.apparu)} ${par(ci('apparu', t.apparu))} ; là-bas \`${t.origine.id || t.id}\`, apparue au cycle ${t.origine.apparu ?? '?'} ${par(ci('origine.apparu', t.origine.apparu ?? null))}`;
    else if (Number.isFinite(t.apparu) && (t.apparu < 0 || (Number.isFinite(n0) && t.apparu > n0))) quand = `Lignée née au cycle ${fr(t.apparu)} ${par(ci('apparu', t.apparu))}, pendant la genèse du monde ${par(Number.isFinite(n0) && ci('cycle.n', n0), gen && ci('monde.genese.cycles', gen))} *(lecture de l'Observatoire : une date avant 0 ou après le cycle de l'instantané est une date de la genèse)*`;
    else quand = `Lignée apparue au cycle ${fr(t.apparu ?? 0)} ${par(ci('apparu', t.apparu ?? null))}`;
    if (t.parent) quand += `, issue ${parent ? art.du(nomT(parent)) + '**' + nomT(parent) + '**' : 'de `' + t.parent + '`'} ${par(ci('parent', t.parent))}${parent ? '' : ', une lignée qui n\'est plus dans l\'instantané'}`;
    else quand += p.regime === 'synthetique' ? `, assemblée par ${I.monde?.mere?.nom || 'la Mère'} ${par(ci('parent', null))}` : `, sans lignée mère ${par(ci('parent', null))}`;
    L.push(nom, quand + '.');
    L.push(`${Maj(t.statut || 'statut inconnu')} ${par(ci('statut', t.statut ?? null))}${t.eteint != null ? `, éteinte au cycle ${fr(t.eteint)} ${par(ci('eteint', t.eteint))}` : ''}.`);
    L.push(N ? `${fr(N)} ${machine ? 'machines' : 'bêtes'} ${par('la somme de `populations[].effectif`')} : ${pops.map(x => nomBiome(x.biome) + ' ' + fr(x.effectif)).join(', ')}.`
      : `Aucune bête en vie ${par(ci('populations', []))}.`);
    section('Identité', L); }

  // —— 2. Famille visuelle et tégument ——
  const teg = [];   // [{ id, fr, en }]
  if (!machine) { const T0 = niche?.temperature ?? .5, rampe = loco.includes('reptation') || loco.includes('fouissage'), ca = has('carapace');
    const ajoute = (id, frx, enx) => { const d = det(fam, id); teg.push({ id, fr: frx || d.fr, en: enx || d.en, pourquoi: d.pourquoi }); };
    if (fam === 'pelage') { ajoute(k.nage ? 'pelage-nageur' : T0 < .3 ? (rampe ? 'pelage-froid-ras' : 'pelage-froid') : T0 >= .7 ? 'pelage-chaud' : 'pelage-tempere'); if (ca) ajoute('pelage-carapace'); }
    if (fam === 'chitine') { if (ca) ajoute(ca.taille > .3 ? 'chitine-elytres' : 'chitine-bouclier'); if ((p.masse_kg || 0) >= 1) ajoute('chitine-geant'); if ((p.masse_kg || 0) >= 10) ajoute('chitine-colosse'); if (k.nage) ajoute('chitine-nageur'); }
    if (fam === 'cuirasse') ajoute(k.nage ? 'cuirasse-nageur' : 'cuirasse-terre');
    if (fam === 'ecailles') ajoute(al === 'poisson' ? 'ecailles-poisson' : al === 'serpent' ? 'ecailles-serpent' : 'ecailles-lezard');
    if (fam === 'plumage') ajoute(k.nage ? 'plumage-nageur' : T0 < .3 ? 'plumage-froid' : 'plumage-lisse');
    if (fam === 'peau-nue') ajoute('peau-nue');
    if (fam === 'gelee') ajoute(k.plan === 'tentaculaire' ? 'gelee-pieuvre' : loco.includes('nage') ? 'gelee-meduse' : 'gelee-etoile');
    if (fam === 'machine') ajoute('machine'); }
  { const L = [], cles = [k.machine ? ci('regime', 'synthetique') : ci('forme', c.forme), !k.machine && k.allure !== c.forme && ci('allure', k.allure),
      !k.machine && ['pelage', 'cuirasse', 'peau-nue', 'ecailles-lezard'].includes(R.id) && (p.reproduction ? ci('reproduction', p.reproduction) : '`reproduction` absente : ' + k.reproduction + ', déduite comme le fait moteur/ponte.js'),
      !k.machine && ['cuirasse', 'peau-nue', 'ecailles-lezard', 'pelage'].includes(R.id) && (k.carapace ? 'un organe `carapace`' : 'aucun organe `carapace`'),
      !k.machine && ['peau-nue', 'ecailles-lezard', 'cuirasse', 'ecailles-poisson'].includes(R.id) && ci('locomotion', loco)].filter(Boolean);
    L.push(`Famille \`${fam}\` (${FAMILLES[fam].tegument[0]} : elle se lit comme ${FAMILLES[fam].lecture}) ${regle(R.id, R.quand + ' — ' + cles.join(', '))}.`);
    L.push(`Pourquoi : ${min1(R.pourquoi.replace(/\.$/, ''))} ${regle(R.id)}.`);
    for (const d of teg) { const why = { 'pelage-froid-ras': `${ci('niche.temperature', niche?.temperature ?? null)}, ${ci('locomotion', loco)}`,
        'pelage-froid': ci('niche.temperature', niche?.temperature ?? null), 'pelage-chaud': ci('niche.temperature', niche?.temperature ?? null),
        'pelage-tempere': niche ? ci('niche.temperature', niche.temperature) : '`niche` absente', 'pelage-nageur': ci('locomotion', loco), 'pelage-carapace': ci('reproduction', k.reproduction) + ', un organe `carapace`',
        'plumage-froid': ci('niche.temperature', niche?.temperature ?? null), 'plumage-nageur': ci('locomotion', loco), 'plumage-lisse': niche ? ci('niche.temperature', niche.temperature) : '`niche` absente',
        'chitine-geant': ci('masse_kg', p.masse_kg), 'chitine-colosse': ci('masse_kg', p.masse_kg), 'chitine-elytres': ci('carapace', c.carapace), 'chitine-bouclier': ci('carapace', c.carapace),
        'cuirasse-nageur': ci('locomotion', loco), 'cuirasse-terre': ci('locomotion', loco), 'chitine-nageur': ci('locomotion', loco), 'peau-nue': ci('locomotion', loco),
        'ecailles-poisson': ci('locomotion', loco), 'ecailles-serpent': ci('forme', c.forme), 'ecailles-lezard': ci('forme', c.forme), 'gelee-meduse': ci('locomotion', loco), 'gelee-etoile': ci('locomotion', loco), 'gelee-pieuvre': ci('forme', c.forme) }[d.id];
      L.push(`${Maj(d.fr)} ${regle(d.id, min1(d.pourquoi.replace(/\.$/, '')) + (why ? ' — ' + why : ''))}.`); }
    if (machine) L.push(`${Maj(det('machine', 'machine').fr)} ${regle('machine', 'le dessin des machines des planches, dans monde/silhouette.js')}.`);
    for (const x of majeurs.filter(x => ['peau-epaisse', 'carapace', 'glande-irritante'].includes(x))) L.push(`${Maj({ 'peau-epaisse': 'un cuir épais', carapace: 'des plaques osseuses sur le dos', 'glande-irritante': 'une peau luisante, grumeleuse' }[x])} : ${pc(T[x].part)} des bêtes le montrent ${par('`phenotypes`', ci('catalogue.traits.' + x + '.organe', CT[x]?.organe ?? x))}.`);
    L.push(`Table des familles, version ${VERSION} ${par(ci('OrvaneFiche.VERSION', VERSION))}.`);
    section('Famille visuelle et tégument', L);
    pro.peau.push(...teg.map(d => d.en), ...majeurs.filter(x => ['peau-epaisse', 'carapace', 'glande-irritante'].includes(x)).map(x => VUE_EN[x])); }

  // —— 3. Silhouette ——
  const m = p.masse_kg, L_ = p.taille_m, kc = Number.isFinite(m) && Number.isFinite(L_) && L_ > 0 ? m / L_ ** 3 : null, CR = CARRURES[al] || CARRURES.quadrupede, car = kc != null ? palier(kc, CR[2]) : null;
  // la taille que montrent la plupart des bêtes : le plan, sous les écarts des traits que portent plus de la moitié d'entre elles
  const ecT = majeurs.reduce((a, x) => a * (CT[x]?.ecarts?.taille_m ?? 1), 1), ecM = majeurs.reduce((a, x) => a * (CT[x]?.ecarts?.masse_kg ?? 1), 1);
  const Lv = Number.isFinite(L_) ? L_ * ecT : L_, mv = Number.isFinite(m) ? m * ecM : m;
  if (machine) {
    const M = p.modules || {};
    section('Silhouette', [`Une machine de ${I.monde?.mere?.nom || 'la Mère'} ${par(ci('regime', 'synthetique'), '`corps` absent')} : un châssis arrondi, posé sur quatre pattes articulées, deux de chaque côté ${regle('machine', 'le dessin des machines des planches')}.`,
      Number.isFinite(L_) && Number.isFinite(m) ? `${longueur(L_)} de long ${par(ci('taille_m', L_))} pour ${masse(m)} ${par(ci('masse_kg', m))}.` : null,
      `Le châssis est ${(M.blindage || 0) > .2 ? 'haut et blindé' : 'bas et léger'} ${par(ci('modules.blindage', M.blindage ?? 0))} *(interprété : un blindage de plus de 0,2 hausse et assombrit le châssis, comme sur les planches)*.`]);
    pro.avant.push(`a ${palier(L_ || 1, TAILLES_EN)[1]} four-legged robotic machine, ${length(L_ || 1)} long, ${weight(m || 1)}`, `${(M.blindage || 0) > .2 ? 'tall armored' : 'low, light'} rounded metal chassis on four articulated legs`);
  } else {
    const L = [], dec = C.decrire(c, p), nomA = NOMS_ALLURE[al] || [c.forme, c.forme];
    const pattesFr = al === 'radiaire' || al === 'tentaculaire' ? `${fr(c.pattes)} bras` : al === 'segmente' ? `${fr(c.pattes)} pattes, une paire par anneau (${fr(Math.round(c.pattes / 2))} anneaux)` : c.pattes ? `${nombreFr(c.pattes, 1)} pattes` : 'sans pattes';
    L.push(`**${Maj(nomA[0])}**, ${pattesFr} ${par(ci('forme', brut.forme ?? c.forme) + (brut.forme && brut.forme !== c.forme ? ', une forme que ce monde ne déclare pas : lue comme ' + (brut.repli === c.forme ? 'son repli, ' + ci('repli', brut.repli) : 'un ' + val(c.forme) + ', comme le fait moteur/corps.js') : ''), champ('pattes'), al === 'poisson' && 'lu comme un poisson par `OrvaneCorps.allure` : il ne fait que nager')}.`
      + (al === 'quadrupede' || al === 'bipede' ? ` En un mot : « ${dec} » ${par('`OrvaneCorps.decrire`')}.` : ''));
    const ordinaire = car && car[1].includes('ordinaire'), leger = car && /fine|légère/.test(car[1]);
    if (kc != null) L.push(`${longueur(L_)} de long ${par(ci('taille_m', L_))} pour ${masse(m)}${leger ? ' seulement' : ''} ${par(ci('masse_kg', m))} : une bête ${ordinaire ? car[1] : '**' + car[1] + '**'} ${interp(`d'après la masse pour la longueur : ${fr(kc, kc < 10 ? 2 : 0)}${ESP}kg/m³, quand ${nomA[0] === 'oiseau' ? 'un oiseau' : 'un ' + nomA[0]} de proportions ordinaires est entre ${fr(CR[0])} et ${fr(CR[1])}`)}${repere(fam, al, c, p, car) ? ', ' + repere(fam, al, c, p, car) + ' ' + interp('un repère terrestre, pour l\'œil') : ''}.`);
    // les proportions
    const props = [];
    for (const k2 of NUM7) { if (k2 === 'tete' || k2 === 'museau' || k2 === 'oreilles') continue; if (!utiles.includes(k2)) continue; const v = c[k2];
      if (k2 === 'haut' && !c.pattes) continue;
      if (v === 0 && ZERO[k2]) { props.push(`**${ZERO[k2][0]}** ${par(champ(k2))}`); continue; }
      const P = palier(v, PALIERS[k2]), gras = v <= .2 || v >= .8, w = gras ? '**' + P[1] + '**' : P[1];
      props.push(k2 === 'long' ? `corps ${w} ${par(champ(k2))}` : k2 === 'haut' ? `pattes ${w}${loco.includes('reptation') && v < .35 ? ', écartées' : ''} ${par(champ(k2))}` : k2 === 'cou' ? `cou ${w} ${par(champ(k2))}`
        : al === 'poisson' ? `nageoire de queue ${gras ? '**' + palier(v, PALIERS.caudale)[1] + '**' : palier(v, PALIERS.caudale)[1]} ${par(champ(k2))}`
        : `queue ${w}${leger && v < .55 ? ' et fine' : ''} ${par(champ(k2))}${leger && v < .55 ? ' ' + interp('une bête légère') : ''}`); }
    if (props.length) L.push(Maj(props.join(', ')) + '.');
    const sansObjet = ['long', 'haut', 'cou', 'queue'].filter(k2 => !utiles.includes(k2) || (k2 === 'haut' && !c.pattes));   // (le museau et les oreilles : à la tête)
    if (sansObjet.length) L.push(`Sans objet pour ${al === 'hexapode' ? 'un insecte' : al === 'poisson' ? 'un poisson' : al === 'serpent' ? 'un serpent' : al === 'oiseau' ? 'un oiseau' : 'ce corps'} : ${sansObjet.map(champ).join(', ')} ${interp('les planches ne le dessinent pas, et la fiche non plus')}.`);
    const pos = c.posture;
    const posSrc = brut.posture === undefined ? '`posture` absente : ' + val(pos) + ', la valeur d\'un ' + nomA[0] + ' dans moteur/corps.js' : champ('posture');
    const eauLibre = al === 'poisson' || ((al === 'radiaire' || al === 'tentaculaire') && loco.includes('nage'));
    L.push(pos >= .9 ? `Debout ${par(posSrc)}.` : pos >= .4 ? `Se dresse sur ses pattes arrière ${par(posSrc)}.`
      : `${eauLibre ? 'En pleine eau, le corps à l\'horizontale' : al === 'quadrupede' ? 'À quatre pattes' : al === 'radiaire' || al === 'tentaculaire' ? 'Posé au fond' : 'Au ras du sol'} ${par(posSrc)}.`);
    for (const x of majeurs.filter(x => CT[x]?.ecarts && (CT[x].ecarts.taille_m || CT[x].ecarts.masse_kg))) L.push(`${pc(T[x].part)} des bêtes portent le trait ${nomTrait(x, CT)} ${par('`phenotypes`', ci('catalogue.traits.' + x + '.ecarts', { taille_m: CT[x].ecarts.taille_m ?? 1, masse_kg: CT[x].ecarts.masse_kg ?? 1 }))} : la plupart sont ${(CT[x].ecarts.taille_m ?? 1) * (CT[x].ecarts.masse_kg ?? 1) > 1 ? 'plus grandes' : 'plus petites'} que le plan${Number.isFinite(Lv) && Number.isFinite(mv) ? `, environ ${longueur(Lv)} pour ${masse(mv)} ${interp('le plan sous les écarts de ses traits majoritaires : la taille du prompt')}` : ''}.`);
    if (p.stades) L.push(`Une part de la lignée se métamorphose ${par(ci('stades.part', p.stades.part ?? null))} : cette fiche montre ${p.stades.adulte?.nom ? 'l\'adulte (' + p.stades.adulte.nom + ')' : 'l\'adulte'} ; la larve${p.stades.larve?.nom ? ' (' + p.stades.larve.nom + ')' : ''} est une autre bête à dessiner ${par(ci('stades.larve.forme', p.stades.larve?.forme ?? null), ci('stades.larve.locomotion', p.stades.larve?.locomotion ?? []))}.`);
    section('Silhouette', L);
    // le prompt : la taille, la carrure, le corps, les pattes
    const nomEn = al === 'hexapode' ? (c.pattes === 6 ? 'six-legged arthropod' : `${nombreEn(c.pattes)}-legged arthropod`) : al === 'segmente' ? `segmented creature with ${c.pattes} legs` : al === 'radiaire' || al === 'tentaculaire' ? `${nomA[1]} with ${c.pattes} arms` : nomA[1];
    const bas = (al === 'quadrupede' || al === 'bipede') && c.haut < .2 ? 'low-slung ' : (al === 'quadrupede' || al === 'bipede' || al === 'oiseau') && c.haut >= .75 ? 'long-legged ' : '';
    pro.avant.push(`a ${palier(Lv || .5, TAILLES_EN)[1]} ${bas}${nomEn}${/creature/.test(nomEn) ? '' : ' creature'}` + (kc != null ? `, ${length(Lv)} long${car[3] ? ' and ' + car[3] : ''} (${weight(mv)})` : ''));
    if (utiles.includes('long')) pro.corps.push([car?.[2], al === 'poisson' && c.long > .85 ? 'eel-like elongated body' : palier(c.long, PALIERS.long)[2]].filter(Boolean).join(' '));
    if (c.pattes && utiles.includes('haut')) pro.corps.push(palier(c.haut, PALIERS.haut)[2] + (loco.includes('reptation') && c.haut < .35 && al !== 'hexapode' ? ' splayed close to the ground' : ''));
    if (al === 'serpent' || al === 'poisson') pro.corps.push('no legs');
  }

  // —— 4. Tête ——
  { const L = [], reg = p.regime, D = p.diete || {}, nuit = heure === 'nocturne' || (T['yeux-nocturnes']?.part || 0) >= .5, crep = !nuit && heure === 'crepusculaire';
    if (machine) { const per = p.perception ?? .5;
      L.push(`Pas de tête : un capteur, une lentille ronde qui luit, ${nomCouleur([127, 224, 255]).fr} \`#7FE0FF\`, à l'avant du châssis, ${per > .55 ? 'large' : 'petite'} ${par(ci('perception', per))} ${regle('machine', 'l\'œil des machines des planches')}.`);
      pro.tete.push(`a single round glowing pale-cyan lens eye #7FE0FF at the front`); }
    else {
      const parts = [];
      const te = palier(c.tete, PALIERS.tete); parts.push(`tête **${te[1]}** ${par(champ('tete'))}`.replace(/\*\*(moyenne|petite|grosse)\*\*/, '$1'));
      const bouche = boucheDe(al, reg, D, loco), regimeSrc = ci('regime', reg ?? null) + (Object.keys(D).length ? ', ' + liste(Object.entries(D).sort((a, b) => b[1] - a[1]).map(([x, v]) => pc(v) + ' ' + (voyelle(x) ? 'd\'' : 'de ') + x)) : '');
      if (al === 'oiseau') { const b = palier(c.museau, PALIERS.bec); parts.push(`bec ${b[1]} ${par(champ('museau'))}, ${bouche[0]} ${interp(regimeSrc + (loco.includes('nage') ? ', ' + ci('locomotion', loco) : ''))}`); }
      else if (utiles.includes('museau')) parts.push(c.museau === 0 ? `**${ZERO.museau[0]}** ${par(champ('museau'))}` : `museau ${palier(c.museau, PALIERS.museau)[1]} ${par(champ('museau'))}`);
      if (utiles.includes('oreilles')) { const e = c.oreilles, forme = reg === 'herbivore' || reg === 'filtreur' ? ['en feuille, couchées en arrière', 'leaf-shaped ears laid back'] : ['dressées et pointues', 'pointed upright ears'];
        parts.push(e === 0 ? `**${ZERO.oreilles[0]}** ${par(champ('oreilles'))}` : `oreilles ${palier(e, PALIERS.oreilles)[1]}${e >= .12 ? ', ' + forme[0] : ''} ${par(champ('oreilles'))}${e >= .12 ? ' ' + interp('la forme des planches : ' + (reg === 'herbivore' || reg === 'filtreur' ? 'un brouteur' : 'un chasseur')) : ''}`);
        if (e > 0) pro.tete.push(palier(e, PALIERS.oreilles)[2].replace(/ears$/, '') + (e >= .12 ? forme[1] : 'ears')); }
      const yeux = nuit ? ['grands, qui accrochent la lumière', 'large reflective eyes'] : crep ? ['assez grands', 'fairly large eyes'] : ['de taille moyenne', 'medium-sized eyes'];
      parts.push(`yeux ${yeux[0]} ${interp((nuit ? 'une bête de nuit' : crep ? 'une bête du crépuscule' : 'une bête de jour') + ', ' + heureSrc + ((T['yeux-nocturnes']?.part || 0) >= .5 && heureT !== 'yeux-nocturnes' ? `, ${pc(T['yeux-nocturnes'].part)} des bêtes portent le trait yeux nocturnes` : ''))}`);
      if (al !== 'oiseau') parts.push(`${bouche[0]} ${interp(regimeSrc)}`);
      L.push(Maj(parts.join(', ')) + '.');
      if (c.motif === 'masque') L.push(`Un masque sombre sur les yeux ${par(ci('motif', 'masque'))}.`);
      const sansT = ['museau', 'oreilles'].filter(k2 => !utiles.includes(k2) && !(k2 === 'museau' && al === 'oiseau'));
      if (sansT.length) L.push(`${al === 'hexapode' || al === 'segmente' ? 'Ni museau ni oreilles : une tête d\'insecte' : al === 'oiseau' ? 'Pas d\'oreilles visibles : une tête d\'oiseau' : 'Ni oreilles ni museau'} ${par(sansT.map(champ).join(', '))} ${interp('les planches n\'en dessinent pas pour ce corps')}.`);
      pro.tete.unshift(palier(c.tete, PALIERS.tete)[2]);
      if (al === 'oiseau') pro.tete.push(palier(c.museau, PALIERS.bec)[2].replace(/ beak$/, ' ' + bouche[1])); else if (utiles.includes('museau')) pro.tete.push(c.museau === 0 ? ZERO.museau[1] : palier(c.museau, PALIERS.museau)[2]);
      if (utiles.includes('cou')) pro.tete.push(c.cou === 0 ? ZERO.cou[1] : palier(c.cou, PALIERS.cou)[2]);
      if (utiles.includes('oreilles') && c.oreilles === 0) pro.tete.push('earless');
      if (nuit || crep) pro.tete.push(yeux[1]);
      if (bouche[1] && al !== 'oiseau') pro.tete.push(bouche[1]);
    }
    section('Tête', L); }

  // —— 5. Organes (ou modules) ——
  const accentUtile = mOrg.some(o => TEINTE_ORG[o.type] === 'accent'), osUtile = mOrg.some(o => TEINTE_ORG[o.type] === 'os');
  if (machine) {
    const M = p.modules || {}, L = [], MOD = { panneau: [.2, 'un panneau solaire incliné sur le dos, bleu sombre `#2C4A6B`, cerclé de clair', 'a tilted dark blue solar panel on its back'],
      thermique: [.3, 'des ailettes de refroidissement sur le flanc', 'cooling fins on the flank'], batterie: [.3, 'un bloc de batterie, de la couleur d\'accent', 'a battery block in the accent color'],
      foreuse: [.3, 'une foreuse conique rayée, à l\'avant', 'a ridged conical drill at the front'], recycleur: [.3, 'une trémie à l\'arrière', 'a scrap hopper at the rear'],
      pince: [.3, 'un bras articulé terminé par une pince, à l\'avant', 'an articulated pincer arm at the front'], blindage: [.2, 'des plaques de blindage, en bandes verticales', 'vertical armor plating'],
      arme: [.2, 'un canon court sur le dessus', 'a short cannon on top'], discretion: [.3, 'une teinte sombre et mate, pour passer inaperçue', 'dark matte stealth finish'] };
    for (const [id, [s, frx, enx]] of Object.entries(MOD)) { const v = M[id] ?? 0;
      if (v > s) { L.push(`- **${Maj(frx)}** ${par(ci('modules.' + id, v))} ${interp('au-delà de ' + fr(s, 1) + ', le module se voit, comme sur les planches')}.`); pro.organes.push(enx); }
      else interdit('modules', `${pasDe({ panneau: 'panneau solaire', thermique: 'ailettes', batterie: 'bloc de batterie visible', foreuse: 'foreuse', recycleur: 'trémie', pince: 'bras à pince', blindage: 'blindage en plaques', arme: 'arme ni de canon', discretion: 'teinte furtive' }[id])} ${par(ci('modules.' + id, v))}`,
        { panneau: 'solar panel', thermique: 'cooling fins', batterie: '', foreuse: 'drill', recycleur: 'hopper', pince: 'pincer arm', blindage: 'heavy armor plates', arme: 'weapons, cannon, gun', discretion: '' }[id]); }
    for (const id of Object.keys(M).filter(x => !MOD[x]).sort()) L.push(`- Un module que les planches ne dessinent pas : \`${id}\` ${par(ci('modules.' + id, M[id]))} ${interp('à dessiner selon ce que dit docs/16')}.`);
    L.unshift(L.length ? `Ses modules, ceux qui se voient ${par('`modules`')} :` : `Aucun module ne se voit ${par(ci('modules', M))}.`);
    section('Organes', L);
  } else {
    const L = [], inconnus = (Array.isArray(brut.organes) ? brut.organes : []).filter(o => !CO[o?.type] && !C.organe(o)).map(o => o?.type);
    L.push(mOrg.length ? `${Maj(nombreFr(mOrg.length, 0))} organe${mOrg.length > 1 ? 's' : ''} ${par(Array.isArray(brut.organes) ? '`organes`' : '`organes` absente : déduite des proportions de 0,2 et plus, comme le fait moteur/corps.js')} :`
      : `Aucun organe ${par(Array.isArray(brut.organes) ? ci('organes', []) : '`organes` absente, et aucune proportion d\'organe à 0,2 ou plus')}.`);
    for (const o of mOrg) {
      const Tc = CO[o.type] || {}, fem = Tc.fem ?? 1, plur = o.nombre > 1, mot = (Tc.mot || [o.type, o.type + 's'])[plur ? 1 : 0], fs = formeFr(o.forme, fem, plur), tl = palier(o.taille, TAILLE_ORG);
      const place = o.type === 'epines' && o.place === 'queue' ? 'sur la queue' : PLACE_FR[o.place] || o.place, teinte = TEINTE_ORG[o.type], col = teinte && pal[teinte === 'os' ? 'os' : teinte];
      const fx = Tc.fonction ? FONCTIONS[Tc.fonction] : null, cond = Tc.conduite;
      let comment = '';
      if (o.type === 'defenses') comment = o.forme === 'droites' ? 'Elles pointent droit vers l\'avant depuis le museau' : 'Elles se recourbent vers le haut depuis le museau';
      else if (o.type === 'cornes') comment = { recourbees: 'Elles se recourbent vers l\'arrière, en croissant', droites: 'Elles montent droit, vers le haut et l\'avant', ramifiees: 'Elles se ramifient comme des bois' }[o.forme] || '';
      else if (o.type === 'panache') comment = o.forme === 'touffe' ? `Une boule ${matiere(fam)} nette et contrastée` : `Un éventail ${matiere(fam)} raides, déployé`;
      else if (o.type === 'carapace' && fam === 'chitine') comment = o.taille > .3 ? 'Ce sont des élytres, deux étuis durs qui couvrent l\'abdomen' : 'Un bouclier court sur le thorax, sans élytres couvrantes';
      else if (o.type === 'carapace' && fam === 'cuirasse') comment = k.nage ? `${o.forme === 'bombee' ? 'Bombée, mais basse' : 'Basse'}, lisse et profilée, comme une tortue d'eau (règle \`cuirasse-nageur\`)` : `${o.forme === 'segmentee' ? 'En anneaux articulés' : 'Haute, en plaques jointives'}, comme une tortue terrestre ou un pangolin (règle \`cuirasse-terre\`)`;
      else if (o.type === 'carapace' && fam === 'pelage') comment = 'Un bouclier de plaques cornées, comme un tatou : le poil reste au ventre, aux pattes et à la tête (règle `pelage-carapace`)';
      else if (o.type === 'aiguillon') comment = o.forme === 'courbe' ? 'Il se relève au-dessus du dos, comme chez un scorpion' : 'Il prolonge l\'abdomen, droit, comme chez une guêpe';
      else if (o.type === 'ailes') comment = o.forme === 'plumes' ? (fam === 'plumage' ? 'Des ailes d\'oiseau' : 'Des ailes de plumes sur un corps ' + (fam === 'pelage' ? 'à poil' : 'sans plumes') + ' : les plumes ne couvrent que les ailes') : 'Des ailes de peau tendue sur de longs doigts, comme une chauve-souris';
      else if (o.type === 'nageoires') comment = o.forme === 'voiles' ? 'Des voiles hautes, bien plus grandes que des nageoires ordinaires' : 'Plus grandes que des nageoires ordinaires';
      else if (o.type === 'mains') comment = 'Des doigts qui saisissent, au bout des pattes avant';
      L.push(`- **${Maj(nombreFr(o.nombre, fem))} ${mot}${fs ? ' ' + fs : ''}**, ${place}, ${tl[1]} ${par('`' + o.type + '`', ci('nombre', o.nombre), ci('forme', o.forme), ci('place', o.place), ci('taille', o.taille), RESUMES.includes(o.type) && 'en résumé ' + ci(o.type, c[o.type]))}.`
        + (Tc.fonction ? ` Fonction : ${Tc.fonction} ${par(ci('catalogue.organes.' + o.type + '.fonction', Tc.fonction))}${cond?.presage ? `, conduite \`${cond.type}\` : « ${cond.presage} » ${par('`conduite.presage`')}` : ''}.` : '')
        + (comment || col ? ` ${comment}${col ? `${comment ? ' ; teinte ' : 'Teinte '}${col.fr} \`${col.hex}\`` : ''} ${teinte === 'accent' ? regle('parade-accent', 'la teinte d\'accent des planches, la robe tournée de 150°') : interp('comme sur les planches')}.` : '')
        + (fx && o.type !== 'panache' ? ` ${Maj(fx)} ${interp('ce que sa fonction lui donne à voir')}.` : ''));
      (o.place === 'queue' ? pro.queueOrg : pro.organes).push(organeEn(o, fam, teinte === 'accent' ? col : null, k.nage));
    }
    if (inconnus.length) L.push(`Organe${inconnus.length > 1 ? 's' : ''} que le catalogue ne connaît pas, laissé${inconnus.length > 1 ? 's' : ''} de côté comme le fait moteur/corps.js : ${inconnus.map(x => '`' + x + '`').join(', ')} ${par('`organes`')}.`);
    section('Organes', L);
  }

  // —— 6. Couleurs ——
  if (machine) { const M = p.modules || {}, acier = (M.discretion || 0) > .3 ? [70, 74, 72] : [128, 134, 138].map((v, i) => Math.round(v + ([96, 102, 108][i] - v) * (M.blindage || 0))), ROLE = { regulateur: [214, 154, 52], foreuse: [196, 92, 52], recycleur: [96, 160, 88], capteur: [70, 150, 200] }, acc = ROLE[p.role] || ROLE.regulateur;
    const A = couleur(acier, 'coque', 'interprété : l\'acier des planches'), B = couleur(acc, 'accent', 'interprété : la teinte du rôle ' + (p.role || 'regulateur')), Ln = couleur([127, 224, 255], 'lentille', 'interprété : la lentille des planches'), Pn = couleur([44, 74, 107], 'panneau', 'interprété : le panneau des planches');
    machinePal = [A, B, Ln, Pn];
    section('Couleurs', [`Aucune couleur dans les données ${par('`corps` absent')} : celles des planches ${regle('machine', 'les teintes des machines de monde/silhouette.js')}.`,
      `- Coque : ${A.fr} \`${A.hex}\` ${interp((M.discretion || 0) > .3 ? 'un acier sombre et mat, ' + ci('modules.discretion', M.discretion) : 'un acier gris, plus sombre s\'il est blindé, ' + ci('modules.blindage', M.blindage ?? 0))}.`,
      `- Accent (la bande du châssis, la batterie) : ${B.fr} \`${B.hex}\` ${interp('la teinte du rôle, ' + ci('role', p.role ?? null))}.`,
      `- Lentille : ${Ln.fr} \`${Ln.hex}\` ; panneau : ${Pn.fr} \`${Pn.hex}\` ${interp('les teintes des planches')}.`]);
    pro.couleurs.push(`${A.en} steel ${A.hex} chassis, ${B.en} ${B.hex} accent stripe`);
  } else {
    const L = [], src = role => K && (brut.couleurs?.[role] ? ci('couleurs.' + role, K[role]) : '`couleurs.' + role + '` absente : ' + val(K[role]) + ' par défaut (moteur/corps.js)');
    L.push(`- Robe (le fond du corps) : **${pal.robe.fr}** \`${pal.robe.hex}\` ${par(src('robe'))}.`);
    L.push(`- Sombre (le dos et le motif) : **${pal.sombre.fr}** \`${pal.sombre.hex}\` ${par(src('sombre'))}.`);
    L.push(`- Ventre (le dessous, plus clair) : **${pal.ventre.fr}** \`${pal.ventre.hex}\` ${par(src('ventre'))}.`);
    L.push(`- Œil : **${pal.oeil.fr}** \`${pal.oeil.hex}\` ${par(src('oeil'))}.`);
    const Mo = MOTIFS[c.motif] || MOTIFS.uni;
    L.push(c.motif === 'uni' ? `- Motif : **aucun**, une robe unie ${par(brut.motif === undefined ? '`motif` absent : "uni" par défaut' : ci('motif', 'uni'))} ; le dos un peu plus sombre, le ventre plus clair ${interp('comme sur les planches')}.`
      : `- Motif : **${Mo[0]}** ${pal.sombre.fr} \`${pal.sombre.hex}\` ${Mo[1]} ${par(ci('motif', c.motif))} ; le dos un peu plus sombre que les flancs, le ventre clair ${interp('comme sur les planches')}.`);
    for (const x of ROBES.filter(x => (T[x]?.part || 0) >= .5)) L.push(`- La plupart des bêtes n'ont pas la robe du plan : ${pc(T[x].part)} portent le trait ${nomTrait(x, CT)} ${par('`phenotypes`')}, « ${CT[x]?.effet || x} » ${par('`catalogue.traits.' + x + '.effet`')} ; le modèle garde la robe du plan, et cette variante se fait en le recolorant ${regle('robe-du-plan')}.`);
    if ((T['coloration-aposematique']?.part || 0) >= .5) L.push(`- Couleurs d'avertissement : des rayures jaune ocre \`#D8A23A\` chez ${pc(T['coloration-aposematique'].part)} des bêtes ${par('`phenotypes`')} ${interp('la teinte des planches')}.`);
    if (accentUtile || osUtile) L.push(`- Teintes de la DA, hors données : ${[accentUtile && `accent ${pal.accent.fr} \`${pal.accent.hex}\` (${mOrg.filter(o => TEINTE_ORG[o.type] === 'accent').map(o => (CO[o.type]?.mot || [o.type])[0]).join(', ')}) ${regle('parade-accent')}`, osUtile && `ivoire \`${pal.os.hex}\` (${mOrg.filter(o => TEINTE_ORG[o.type] === 'os').map(o => (CO[o.type]?.mot || [o.type])[0]).join(', ')}) ${interp('l\'ivoire des planches')}`].filter(Boolean).join(' ; ')}.`);
    section('Couleurs', L);
    const motEn = c.motif === 'uni' ? `with a slightly darker ${pal.sombre.en} ${pal.sombre.hex} back` : c.motif === 'masque' ? `with a ${pal.sombre.en} ${pal.sombre.hex} mask across the eyes` : c.motif === 'bandes' ? `with a ${pal.sombre.en} ${pal.sombre.hex} band along the flanks` : `with ${pal.sombre.en} ${Mo[2]} ${pal.sombre.hex} ${Mo[3]}`;
    pro.couleurs.push(`${pal.robe.en} ${pal.robe.hex} ${motEn}`, `${pal.ventre.en} belly ${pal.ventre.hex}`, `${pal.oeil.en} eyes ${pal.oeil.hex}`);
    if ((T['coloration-aposematique']?.part || 0) >= .5) pro.couleurs.push('bright ochre-yellow warning stripes #D8A23A');
  }

  // —— 7. Posture et mouvement ——
  { const L = [], v = p.vitesse_rel, ms = Number.isFinite(v) && Number.isFinite(L_) ? v * L_ : null, ser = al === 'serpent' || al === 'poisson';
    const lo = l => (ser && LOCO_SERPENT[l]) || ((al === 'hexapode' || al === 'segmente') && LOCO_INSECTE[l]) || ((al === 'bipede' || al === 'oiseau') && LOCO_DEBOUT[l]) || LOCO[l] || [l, '', ''];
    const verbes = loco.map(l => lo(l)[0]), details = machine ? [] : loco.map(l => lo(l)[1]).filter(Boolean);
    if (!loco.length) L.push(`Elle ne se déplace pas ${par(ci('locomotion', []))}.`);
    else if (loco.length === 1 && details.length === 1) L.push(`Elle ${verbes[0]} ${par(ci('locomotion', loco))} : ${details[0]} ${interp('ce que cette façon de se déplacer donne au corps')}.`);
    else { L.push(`Elle ${liste(verbes)} ${par(ci('locomotion', loco))}.`); if (details.length) L.push(`${Maj(details.join(' ; '))} ${interp('ce que chaque façon de se déplacer donne au corps')}.`); }
    const vitesse = x => x >= 1 ? fr(x, 1) + ESP + 'm/s' : fr(x * 100, x >= .1 ? 0 : 1) + ESP + 'cm/s';
    if (ms != null) L.push(`Vitesse de pointe : environ ${fr(v, 1)} longueurs par seconde ${par(ci('vitesse_rel', v))}, soit environ ${vitesse(ms)} ${par('× ' + ci('taille_m', L_))}.`);
    const lents = majeurs.filter(x => CT[x]?.ecarts?.vitesse_rel || CT[x]?.ecarts?.longevite);
    for (const x of lents) { const e = CT[x].ecarts;
      L.push(`${Maj(nomTrait(x, CT))}, que montrent ${pc(T[x].part)} des bêtes ${par('`phenotypes`')} : ${[e.vitesse_rel && '×' + fr(e.vitesse_rel, 2) + ' sur la vitesse', e.longevite && '×' + fr(e.longevite, 2) + ' sur la longévité', e.maturite && '×' + fr(e.maturite, 2) + ' sur la maturité'].filter(Boolean).join(', ')} ${par(ci('catalogue.traits.' + x + '.ecarts', e))}${CT[x].conduite?.presage ? ` ; « ${CT[x].conduite.presage} » ${par('`conduite.presage`')}` : ''}${x === 'metabolisme-lent' ? ' ' + interp('une bête lente et économe') : ''}.`); }
    const kv = lents.reduce((a, x) => a * (CT[x].ecarts.vitesse_rel ?? 1), 1);
    if (ms != null && kv !== 1) L.push(`Pour la plupart des bêtes, la vitesse de pointe est donc d'environ ${vitesse(ms * kv)} ${par(ci('vitesse_rel', v) + ' × ' + fr(kv, 3) + ', le produit de ces écarts')}.`);
    section('Posture et mouvement', L);
    const lp = loco.map(l => lo(l)[2]).filter(Boolean);
    if (!machine && lp.length) pro.corps.push(...lp);
  }

  // —— 8. Comportement ——
  { const L = [], so = p.sociabilite, te = p.temperament, D = p.diete || {}, arme = mOrg.find(o => CO[o.type]?.fonction === 'combat' || CO[o.type]?.fonction === 'venin');
    const act = { diurne: 'Diurne', nocturne: 'Nocturne', crepusculaire: 'Crépusculaire', continue: 'Active jour et nuit' }[p.activite] || 'Activité inconnue';
    const soc = so == null ? '' : palier(so, [[.15, 'solitaire'], [.35, 'plutôt solitaire'], [.6, 'en petits groupes lâches'], [.8, 'grégaire'], [Infinity, 'très grégaire']])[1];
    const actVue = { diurne: 'diurnes', nocturne: 'nocturnes', crepusculaire: 'crépusculaires' }[heure];
    L.push(`${act} ${par(ci('activite', p.activite ?? null))}${heureT && heure !== p.activite ? `, mais la plupart des bêtes sont ${actVue || heure} : ${pc(T[heureT].part)} portent le trait ${nomTrait(heureT, CT)} ${par('`phenotypes`', ci('catalogue.traits.' + heureT + '.fixe.activite', heure))}` : ''}${soc ? `, ${soc} ${par(ci('sociabilite', so))}` : ''}.`);
    if (te != null) { const tp = palier(te, [[.2, 'Elle fuit presque toujours'], [.4, 'Elle fuit plus souvent qu\'elle ne riposte'], [.6, 'Elle fuit ou fait front, selon'], [.8, 'Elle **riposte plus souvent qu\'elle ne fuit**'], [Infinity, 'Elle **riposte presque toujours**']])[1];
      L.push(`${tp} ${par(ci('temperament', te))}${te >= .6 && arme ? `, ${(CO[arme.type]?.mot || [arme.type, arme.type])[arme.nombre > 1 ? 1 : 0]} en avant ${interp('son organe de ' + CO[arme.type].fonction + (CO[arme.type].conduite ? ', conduite `' + CO[arme.type].conduite.type + '`' : ''))}` : ''}.`); }
    if (Object.keys(D).length) { const dom = Object.entries(D).sort((a, b) => b[1] - a[1]), v0 = dom[0][0];
      const verbe = { feuilles: 'une brouteuse de feuilles', graines: 'une mangeuse de graines', fruits: 'une mangeuse de fruits', nectar: 'une butineuse', insectes: 'une mangeuse d\'insectes', viande: 'une chasseuse', sang: 'une buveuse de sang' }[v0] || 'une mangeuse de ' + v0;
      L.push(`Elle se nourrit de ${liste(dom.map(([x, q]) => pc(q) + ' ' + (voyelle(x) ? 'd\'' : 'de ') + x))} ${par(ci('diete', D))} : ${v0 === 'feuilles' && niche && niche.couvert < .2 ? 'une brouteuse de végétation basse' : verbe} ${interp(v0 === 'feuilles' && niche && niche.couvert < .2 ? 'sans couvert, ' + ci('niche.couvert', niche.couvert) + ', l\'herbe est rase' : 'sa part la plus grande')}.`); }
    else if (p.regime && !machine) L.push(`Régime ${p.regime} ${par(ci('regime', p.regime))}.`);
    if (!machine) L.push(`${Maj(k.reproduction)} ${par(p.reproduction ? ci('reproduction', p.reproduction) : '`reproduction` absente : déduite comme le fait moteur/ponte.js')}${p.portee != null ? `, ${fr(p.portee)} ${k.reproduction === 'ovipare' ? 'œufs' : 'petits'} par portée ${par(ci('portee', p.portee))}` : ''}${p.maturite != null ? `, maturité à ${fr(p.maturite, 1)} cycle${p.maturite >= 2 ? 's' : ''} ${par(ci('maturite', p.maturite))}` : ''}${p.longevite != null ? `, vit environ ${fr(p.longevite)} cycles ${par(ci('longevite', p.longevite))}` : ''} *(les durées sont en cycles du monde ; ${I.monde?.annee ? 'une année en compte ' + fr(I.monde.annee) + ', `monde.annee`' : 'docs/19'})*.`);
    else L.push(`Elle ${p.role === 'regulateur' ? 'régule les espèces qui débordent' : p.role === 'foreuse' ? 'fore le minerai' : p.role === 'recycleur' ? 'recycle la ferraille' : p.role === 'capteur' ? 'capte la lumière et la chaleur' : 'sert la Mère'} ${par(ci('role', p.role ?? null))} ; elle dure ${fr(p.longevite ?? 0)} cycles ${par(ci('longevite', p.longevite ?? null))}.`);
    if (p.perception != null && Math.abs(p.perception - .5) > .1) L.push(`Des sens ${p.perception > .5 ? 'aiguisés' : 'émoussés'} ${par(ci('perception', p.perception))}.`);
    // (les robes majoritaires vont aux couleurs, les tailles à la silhouette, les vitesses au mouvement, les peaux au tégument, l'heure en tête)
    const visibles = majeurs.filter(x => !(CT[x]?.ecarts?.vitesse_rel || CT[x]?.ecarts?.longevite) && !['peau-epaisse', 'carapace', 'glande-irritante', ...ROBES].includes(x) && !(CT[x]?.ecarts?.taille_m || CT[x]?.ecarts?.masse_kg) && x !== heureT);
    for (const x of visibles) L.push(`${Maj(nomTrait(x, CT))} : ${pc(T[x].part)} des bêtes ${par('`phenotypes`')}${CT[x]?.conduite?.presage ? ` — « ${CT[x].conduite.presage} » ${par('`catalogue.traits.' + x + '.conduite.presage`')}` : CT[x]?.effet ? ` — ${CT[x].effet} ${par('`catalogue.traits.' + x + '.effet`')}` : ''}.`);
    if (p.castes) L.push(`Elle vit en colonie ${par(ci('castes.part', p.castes.part ?? null))} : ${Object.entries(p.castes).filter(([x, v]) => v && typeof v === 'object').map(([x, v]) => x + (v.masse_rel ? ` (×${fr(v.masse_rel, 1)} en masse${v.ailes ? ', ailée' : ''}${v.organe ? ', ' + v.organe : ''})` : '')).join(', ')} ; la reine et les soldats sont d'autres silhouettes ${interp('docs/33')}.`);
    if (t.caractere) L.push(`Caractère : ${[['hardiesse', 'hardie', 'craintive'], ['combativite', 'combative', 'fuyarde'], ['opportunisme', 'opportuniste', 'difficile']].filter(([x]) => t.caractere[x] != null).map(([x, a, b]) => (t.caractere[x] >= .5 ? a : b) + ' ' + par(ci('caractere.' + x, t.caractere[x]))).join(', ')}.`);
    section('Comportement', L);
    for (const x of visibles) if (vueEn(x, fam, al)) pro.plus.push(vueEn(x, fam, al)); }

  // —— 9. Milieu ——
  const decor = [], lumiere = [];
  { const L = [], ax = niche || biomes[pops[0]?.biome]?.axes || null, princ = pops[0], bp = princ ? biomes[princ.biome] : null, eau = al === 'poisson' || (bp && (bp.milieu === 'aquatique' || bp.milieu === 'marin') && loco.includes('nage'));
    if (ax) { const a = x => ax[x] ?? .5, s = niche ? 'niche.' : 'biomes[' + (princ?.biome || '') + '].axes.';
      const alt = palier(a('altitude'), [[.15, 'des basses terres'], [.35, 'des plaines'], [.6, 'des collines'], [.85, 'des montagnes'], [Infinity, 'les plus hauts sommets']])[1];
      const tem = palier(a('temperature'), [[.15, 'glaciale'], [.3, 'froide'], [.55, 'tempérée'], [.75, 'chaude'], [Infinity, 'brûlante']])[1];
      const hum = palier(a('humidite'), [[.25, 'aride'], [.5, 'plutôt sèche'], [.75, 'humide'], [Infinity, 'détrempée']])[1];
      const lum = palier(a('lumiere'), [[.2, 'presque sans lumière'], [.4, 'sombre'], [.6, 'à demi éclairée'], [.8, 'lumineuse'], [Infinity, 'très lumineuse']])[1];
      const cou = palier(a('couvert'), [[.1, 'sans aucun couvert'], [.35, 'au couvert clairsemé'], [.65, 'mi-ouverte'], [Infinity, 'sous un couvert dense']])[1];
      L.push(`${niche ? 'Sa niche' : 'Sans niche dans les données, le lieu où elle vit le plus'} : ${alt} ${par(ci(s + 'altitude', a('altitude')))}, ${tem} ${par(ci(s + 'temperature', a('temperature')))}, ${hum} ${par(ci(s + 'humidite', a('humidite')))}, ${lum} ${par(ci(s + 'lumiere', a('lumiere')))}, ${cou} ${par(ci(s + 'couvert', a('couvert')))}${p.tolerance != null ? ` ; elle supporte ${p.tolerance >= .6 ? 'des milieux assez variés' : p.tolerance >= .35 ? 'des écarts moyens' : 'peu d\'écarts'} ${par(ci('tolerance', p.tolerance))}` : ''}.`);
      if (princ) L.push(`Son lieu principal : ${nomBiome(princ.biome)}, ${pc(princ.effectif / N)} des bêtes ${par('`populations`', bp && ci('biomes[' + princ.biome + '].milieu', bp.milieu))}${p.eau ? `, en eau ${p.eau === 'salee' ? 'salée' : p.eau === 'mixte' ? 'douce et salée' : 'douce'} ${par(ci('eau', p.eau))}` : ''}.`);
      if (eau) { decor.push(...(a('lumiere') < .2 ? [['noir profond, particules en suspension', 'deep dark water with floating particles']] : p.eau === 'salee' || bp?.milieu === 'marin' ? [['eau de mer claire', 'clear sea water'], a('couvert') > .4 ? ['coraux, herbiers', 'corals and seagrass'] : ['pleine eau bleue', 'open blue water']] : [['eau douce', 'fresh water'], ['galets et herbiers', 'pebbles and water weeds']]));
        lumiere.push(['sous l\'eau, une lumière bleutée filtrée', 'underwater, filtered bluish light']); }
      else {
        if (a('altitude') >= .8) decor.push(['rocaille', 'rocky scree']); else if (a('altitude') >= .55) decor.push(['pentes rocheuses, herbe rase', 'rocky slopes with short grass']);
        if (a('temperature') < .3) decor.push(['plaques de neige', 'snow patches']);
        if (a('temperature') < .3 && a('couvert') < .35) decor.push(['lichens ras', 'short lichens']);
        if (a('temperature') >= .75 && a('humidite') < .3) decor.push(['sable et roches ocre, buissons épars', 'sand, ochre rocks, sparse shrubs']);
        if (a('humidite') >= .75 && a('altitude') < .25 && a('couvert') < .65) decor.push(['eau stagnante, roseaux, vase', 'still water, reeds, mud']);
        if (a('couvert') >= .65) decor.push(a('temperature') >= .7 && a('humidite') >= .7 ? ['sous-bois de jungle, feuilles géantes, lianes', 'jungle undergrowth, giant leaves, vines'] : ['sous-bois, troncs, fougères, litière de feuilles', 'forest undergrowth, tree trunks, ferns, leaf litter']);
        else if (a('couvert') >= .35) decor.push(['bosquets, herbes hautes', 'thickets and tall grass']);
        else if (a('temperature') >= .3 && a('altitude') < .55 && !(a('temperature') >= .75 && a('humidite') < .3)) decor.push(['herbe rase, horizon ouvert', 'short grass, open horizon']);
        if (a('lumiere') < .2) decor.push(['pénombre, roche humide', 'dim damp rock']);
        else if (a('couvert') < .1 && a('lumiere') >= .7) decor.push(['ciel clair', 'clear sky']);
        lumiere.push(heure === 'nocturne' ? ['clair de lune', 'moonlight'] : heure === 'crepusculaire' ? ['lumière rasante d\'aube ou de crépuscule', 'low golden dawn or dusk light']
          : a('lumiere') >= .8 ? [a('temperature') < .3 ? 'soleil franc et froid, ombres nettes, air limpide' : 'soleil franc, ombres nettes', a('temperature') < .3 ? 'bright cold sunlight, crisp shadows, clear air' : 'bright sunlight, crisp shadows'] : a('lumiere') >= .5 ? ['lumière douce', 'soft daylight'] : a('lumiere') >= .3 ? ['lumière tamisée', 'dappled filtered light'] : ['pénombre', 'dim light']); }
      if (decor.length) L.push(`Pour un décor : ${decor.map(d => d[0]).join(' ; ')} ${interp('d\'après ' + (niche ? 'la niche' : 'le lieu') + (eau ? ', sous l\'eau' : ''))}.`);
      if (lumiere.length) L.push(`Pour la lumière : ${lumiere.map(d => d[0]).join(', ')} ${interp(ci(s + 'lumiere', a('lumiere')) + ', ' + heureSrc)}.`);
    } else L.push(`Ni niche ni lieu connu ${par('`niche` absente', ci('populations', []))} : un fond neutre.`);
    section('Milieu', L); }

  // —— 10. Variations ——
  const variantes = [];
  // les traits que montrent moins de la moitié des bêtes (et les robes, même majoritaires) : à partir de 0,5 % des bêtes, ou d'un allèle
  // visible porté à 0,5 % (0,1 % pour une robe) ; les plus fréquents d'abord, douze au plus
  { const L = [], C2 = Object.entries(T).filter(([x, v]) => (v.part < .5 || ROBES.includes(x)) && (v.part >= .005 || (ROBES.includes(x) && v.allele >= .001) || (VUE_EN[x] && v.allele >= .005)))
      .sort((a, b) => b[1].part - a[1].part || b[1].allele - a[1].allele || (a[0] < b[0] ? -1 : 1)).slice(0, 12);
    const sol = pops[0] && biomes[pops[0].biome]?.axes ? C.teinteBiome(biomes[pops[0].biome].axes) : null, solN = sol && nomCouleur(sol);
    for (const [x, v] of C2) { const Tc = CT[x] || {}, rec = Tc.heredite === 'recessif', parEffet = !!Tc.effet && (ROBES.includes(x) || !Tc.conduite?.presage), vu = (parEffet ? Tc.effet : Tc.conduite?.presage) || x;
      const quoi = v.part > 0 ? `${pc(v.part)} des bêtes${v.part >= .5 ? ', la plupart' : ''} ${par('`phenotypes`')}` : `aucune bête ne le montre dans les phénotypes publiés ; l'allèle${rec ? ' (récessif, `heredite`)' : ''} est porté à ${pc(v.allele)} ${par('`populations[].alleles.' + x + '`, pondéré par l\'effectif')} : une variante rare, possible`;
      const cam = x === 'camouflage' && sol ? ` ; sa robe prend la teinte du sol de ${nomBiome(pops[0].biome)}, ${solN.fr} \`${hex(sol)}\` ${par('`OrvaneCorps.teinteBiome`', ci('biomes[' + pops[0].biome + '].axes'))}` : '';
      L.push(`- **${Maj(nomTrait(x, CT))}** : ${quoi} — « ${vu} » ${par('`catalogue.traits.' + x + '.' + (parEffet ? 'effet' : 'conduite.presage') + '`')}${cam}.`);
      const e = vueEn(x, fam, al); variantes.push({ trait: x, part: +v.part.toFixed(4), allele: +v.allele.toFixed(4), en: e && x === 'camouflage' && sol ? `${e}: ${solN.en} ${hex(sol)}` : e }); }
    if (!L.length) L.push(`Aucune variante visible : ${(t.phenotypes || []).length <= 1 ? 'une seule variante' : 'aucun trait au-delà de 0,5 %'} ${par('`phenotypes`')}.`);
    else L.push(`Les variantes qu'un jeu peut montrer, des plus fréquentes aux plus rares : partir de l'image de la lignée et n'y changer que ce que dit le trait ${interp('les variantes visibles sont dans `ia.variantes`, en anglais')}.`);
    section('Variations', L); }

  // —— 11. Parenté ——
  const parente = { parent: t.parent ?? null, trouve: !!parent, filles: [] };
  { const L = [], nomP = parent ? nomT(parent) : null;
    if (!t.parent) L.push(p.regime === 'synthetique' ? `Assemblée par ${I.monde?.mere?.nom || 'la Mère'}, sans lignée mère ${par(ci('parent', null))} : son dessin est la référence.` : `Lignée fondatrice, sans mère dans le monde ${par(ci('parent', null))}${t.origine ? ', venue d\'un autre monde' : ''} : son dessin est la référence de ses filles.`);
    else if (!parent) L.push(`Sa lignée mère \`${t.parent}\` ${par(ci('parent', t.parent))} n'est pas dans l'instantané (éteinte depuis plus de dix cycles, ou restée dans son monde) : pas de comparaison chiffrée possible ; son dessin est la référence de ses filles.`);
    else {
      const Fp = familleAvec(parent, I, C), cp = parent.plan.corps && parent.plan.regime !== 'synthetique' ? C.normaliser(parent.plan.corps) : null;
      parente.famille_parent = Fp.id; parente.meme_famille = Fp.id === fam;
      L.push(`Lignée mère : ${art.le(nomP)}**${nomP}** ${par(ci('parent', t.parent))}${parent.eteint != null ? `, éteinte au cycle ${fr(parent.eteint)} ${par(ci('eteint', parent.eteint))}` : ''} : ${Fp.id === fam ? `même famille visuelle, \`${fam}\`` : `**famille changée**, \`${Fp.id}\` → \`${fam}\`, parce que son plan a changé (${planChange(Fp.cle, k).join(', ')})`} ${regle(R.id)}.`);
      if (cp && c) {
        const cle = o => o.type + '@' + o.place, A = new Map(cp.organes.map(o => [cle(o), o])), B = new Map(c.organes.map(o => [cle(o), o])), nv = [], pr = [], ch = [], gd = [];
        const nomO = o => (CO[o.type]?.mot || [o.type, o.type])[o.nombre > 1 ? 1 : 0];
        for (const [kk, o] of B) { const a = A.get(kk); if (!a) nv.push(o); else { const d = [];
          if (a.forme !== o.forme) d.push(`${formeFr(a.forme, 1, 1)} → ${formeFr(o.forme, 1, 1)}`); if (a.nombre !== o.nombre) d.push(`${a.nombre} → ${o.nombre}`); if (Math.abs(a.taille - o.taille) >= .05) d.push(`${o.taille > a.taille ? 'plus grand' : 'plus petit'}${o.taille > a.taille && CO[o.type]?.fem ? 'e' : ''}${o.taille < a.taille && CO[o.type]?.fem ? 'e' : ''}${o.nombre > 1 ? 's' : ''} (${fr(a.taille, 2)} → ${fr(o.taille, 2)})`);
          (d.length ? ch : gd).push([o, d]); } }
        for (const [kk, o] of A) if (!B.has(kk)) pr.push(o);
        parente.nouveaux = nv.map(o => o.type); parente.perdus = pr.map(o => o.type); parente.changes = ch.map(([o]) => o.type); parente.gardes = gd.map(([o]) => o.type);
        if (nv.length) L.push(`${nv.map(o => `Les **${(CO[o.type]?.mot || [o.type, o.type])[1]} sont nouvelles**`.replace(/nouvelles\*\*/, CO[o.type]?.fem ?? 1 ? 'nouvelles**' : 'nouveaux**') + ` : ${nombreFr(o.nombre, CO[o.type]?.fem ?? 1)} ${nomO(o)} ${formeFr(o.forme, CO[o.type]?.fem ?? 1, o.nombre > 1)} ${par('`' + o.type + '`', ci('taille', o.taille))}`).join(' ; ')}.`);
        if (pr.length) L.push(`${pr.map(o => `${Maj(pasDe((CO[o.type]?.mot || [o.type, o.type])[o.nombre > 1 ? 1 : 0]).replace(/^Pas/, 'Plus'))} : ${(CO[o.type]?.fem ?? 1) ? 'perdue' : 'perdu'}${o.nombre > 1 ? 's' : ''} depuis sa mère ${par('`' + o.type + '` : ' + fr(o.taille, 2) + ' → absent')}`).join(' ; ')}.`);
        const mv = [], gardeP = [];
        for (const k2 of NUM7.filter(x => utiles.includes(x))) { const a = cp[k2], b = c[k2], d = b - a;
          if (Math.abs(d) >= .05) { const ad = Math.abs(d) < .15 ? 'un peu ' : Math.abs(d) >= .3 ? 'nettement ' : '';
            const mot = { long: d > 0 ? 'corps ' + ad + 'plus long' : 'corps ' + ad + 'moins long', haut: d > 0 ? 'pattes ' + ad + 'plus hautes' : 'pattes ' + ad + 'plus courtes', cou: d > 0 ? 'cou ' + ad + 'plus long' : 'cou ' + ad + 'plus court',
              tete: d > 0 ? 'tête ' + ad + 'plus grosse' : 'tête ' + ad + 'plus petite', museau: d > 0 ? 'museau ' + ad + 'plus long' : 'museau ' + ad + 'plus court', oreilles: d > 0 ? 'oreilles ' + ad + 'plus grandes' : 'oreilles ' + ad + 'plus petites',
              queue: d > 0 ? 'queue ' + ad + 'allongée' : 'queue ' + ad + 'raccourcie' }[k2];
            mv.push([Math.abs(d), `${mot} (\`${k2}\` : ${fr(a, 2)} → ${fr(b, 2)})`]); }
          else if (b <= .2 || b >= .7) gardeP.push(b === 0 && a === 0 && ZERO[k2] ? `toujours sans ${k2} (\`${k2}: 0\`)` : `même ${MOT[k2]} ${palier(b, PALIERS[k2])[1].split(',')[0]} (\`${k2}\` : ${fr(a, 2)} → ${fr(b, 2)})`); }
        mv.sort((x, y) => y[0] - x[0]);
        parente.proportions = mv.map(x => x[1]);
        if (mv.length) L.push(`${Maj(mv.map(x => x[1]).join(', '))}.`);
        if (c.forme !== cp.forme || c.pattes !== cp.pattes) L.push(`Le plan a changé : ${val(cp.forme)} à ${cp.pattes} pattes → ${val(c.forme)} à ${c.pattes} pattes ${par(ci('forme', c.forme), ci('pattes', c.pattes))}.`);
        const rm = Number.isFinite(parent.plan.masse_kg) && Number.isFinite(m) ? m / parent.plan.masse_kg : 1, rl = Number.isFinite(parent.plan.taille_m) && Number.isFinite(L_) ? L_ / parent.plan.taille_m : 1;
        if (rl >= 1.1 || rl <= .9 || rm >= 1.25 || rm <= .8) L.push(`${rl >= 1.1 || rm >= 1.25 ? 'Plus grande' : 'Plus petite'}${(rl >= 1.1) !== (rm >= 1.25) && (rl <= .9) !== (rm <= .8) ? '' : ''} : ${longueur(parent.plan.taille_m)} → ${longueur(L_)}, ${masse(parent.plan.masse_kg)} → ${masse(m)} ${par('`taille_m`', '`masse_kg`')}.`);
        const dRobe = Math.hypot(...c.couleurs.robe.map((v, i) => v - cp.couleurs.robe[i])) / 441, pr0 = nomCouleur(cp.couleurs.robe);
        const garde = [...gardeP, ...gd.map(([o]) => `même${o.nombre > 1 ? 's' : ''} ${nomO(o)}${formeFr(o.forme, CO[o.type]?.fem ?? 1, o.nombre > 1) ? ' ' + formeFr(o.forme, CO[o.type]?.fem ?? 1, o.nombre > 1) : ''}`), ...ch.map(([o, d]) => `même${o.nombre > 1 ? 's' : ''} ${nomO(o)}, ${d.join(', ')}`)];
        if (dRobe < .08) garde.push(`${pr0.fr === pal.robe.fr ? 'même robe ' + pal.robe.fr : 'presque la même robe, ' + pr0.fr + ' devenu ' + pal.robe.fr} (\`${hex(cp.couleurs.robe)}\` → \`${pal.robe.hex}\`)`);
        else L.push(`Robe changée : ${pr0.fr} \`${hex(cp.couleurs.robe)}\` → ${pal.robe.fr} \`${pal.robe.hex}\` ${par('`couleurs.robe`')}.`);
        if (cp.motif === c.motif) garde.push(c.motif === 'uni' ? 'même robe unie' : `${c.motif === 'rayures' || c.motif === 'taches' || c.motif === 'bandes' ? 'mêmes' : 'même'} ${MOTIFS[c.motif][0].replace(/^une? /, '')}`.replace('mêmes une bande', 'même bande'));
        else L.push(`Motif changé : ${cp.motif} → ${c.motif} ${par(ci('motif', c.motif))}.`);
        if (garde.length) L.push(`${Maj(garde.join(', '))} ${par('`corps`')}.`);
        parente.gardes_proportions = gardeP;
        const lg = loco.filter(l => !(parent.plan.locomotion || []).includes(l)), lp = (parent.plan.locomotion || []).filter(l => !loco.includes(l));
        if (lg.length || lp.length) L.push(`Ses déplacements : ${[lg.length && 'gagné ' + liste(lg), lp.length && 'perdu ' + liste(lp)].filter(Boolean).join(', ')} ${par(ci('locomotion', loco))}.`);
        if (parent.plan.regime !== p.regime) L.push(`Son régime : ${parent.plan.regime} → ${p.regime} ${par(ci('regime', p.regime))}.`);
        if (parent.plan.activite !== p.activite) L.push(`Son heure : ${parent.plan.activite} → ${p.activite} ${par(ci('activite', p.activite))}.`);
        if (niche && parent.plan.niche) { const Dn = ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'].map(x => [x, (niche[x] ?? .5) - (parent.plan.niche[x] ?? .5)]).filter(([, d]) => Math.abs(d) >= .2).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
          const lp0 = [...(parent.populations || [])].filter(x => x.effectif > 0).sort((a, b) => b.effectif - a.effectif || (a.biome < b.biome ? -1 : 1))[0]?.biome;
          if (Dn.length) L.push(`Son milieu a bougé ${par(...Dn.map(([x]) => `\`niche.${x}\` : ${fr(parent.plan.niche[x], 2)} → ${fr(niche[x], 2)}`))}${lp0 && pops[0] && lp0 !== pops[0].biome ? ` : son lieu principal passe de ${nomBiome(lp0)} à ${nomBiome(pops[0].biome)} ${par('`populations`')}` : ''}.`); }
        const dist = C.distance(cp, c); parente.distance = dist;
        L.push(`Écart de silhouette : ${fr(dist, 2)} ${par('`OrvaneCorps.distance`')} ; au-delà de 0,35 environ, l'œil voit une autre bête. ${dist <= .35 ? `Elle doit **ressembler ${art.au(nomP)}${nomP}** au premier coup d'œil ${interp('partir de son image et ne changer que ce qui précède : c\'est l\'air de famille')}` : `Elle s'en distingue au premier coup d'œil ; garder l'air de famille par ce qui n'a pas changé ${interp('partir de son image, puis appliquer ce qui précède')}`}.`);
      } else L.push(`Pas de corps à comparer ${par(cp ? '`corps` absent' : '`parent.plan.corps` absent')}.`);
    }
    parente.filles = filles.map(f => { const Ff = familleAvec(f, I, C); return { id: f.id, nom: nomT(f), famille: Ff.id, meme_famille: Ff.id === fam, plan: Ff.id === fam ? [] : planChange(k, Ff.cle) }; });
    L.push(filles.length ? `Ses filles dans l'instantané : ${parente.filles.map(f => `${f.nom} (\`${f.id}\`, ${f.meme_famille ? 'même famille' : 'famille `' + f.famille + '` : ' + f.plan.join(', ')})`).join(' ; ')} ${par('`parent: ' + JSON.stringify(t.id) + '`')}.` : `Aucune lignée fille dans l'instantané ${par('aucune n\'a `parent: ' + JSON.stringify(t.id) + '`')}.`);
    section(parent ? `Parenté (par rapport ${art.au(nomT(parent))}${nomT(parent)})` : 'Parenté', L); }

  // —— 12. Interdits ——
  if (!machine) {
    for (const k2 of ['oreilles', 'queue', 'cou', 'museau']) if (utiles.includes(k2) && c[k2] === 0) interdit('zero', `${pasDe(k2 === 'oreilles' ? 'oreilles' : k2)} ${par(champ(k2))}`, ZERO[k2][2]);
    // ce qu'un corps de cette forme n'a pas, quoi que disent ses proportions (un insecte n'a pas d'oreilles ; un serpent est tout en queue)
    const SANS = { oreilles: ['oreilles', 'ears', ['oiseau', 'hexapode', 'serpent', 'poisson', 'segmente', 'radiaire', 'tentaculaire']], queue: ['queue de mammifère', 'mammal tail', ['hexapode', 'segmente', 'radiaire', 'tentaculaire']],
      cou: ['cou de mammifère', 'mammal neck', ['hexapode', 'segmente', 'poisson', 'radiaire', 'tentaculaire']], museau: ['museau', 'snout', ['hexapode', 'segmente']] };
    for (const [k2, [frx, enx, A]] of Object.entries(SANS)) if (A.includes(al)) interdit('sans-objet', `${pasDe(frx)} ${par(champ(k2))} ${interp('sans objet pour ce corps')}`, enx);
    // une partie à 0 qui ne compte ni dans le dessin ni dans les « sans objet » (le cou d'un serpent, la queue d'un poisson) : interdite quand même
    const ZERO_AUTRE = { cou: ['cou marqué', 'distinct neck'], queue: ['grande nageoire de queue', 'large tail fin'], museau: ['museau', 'snout'], oreilles: ['oreilles', 'ears'] };
    for (const k2 of ['oreilles', 'queue', 'cou', 'museau']) if (c[k2] === 0 && !utiles.includes(k2) && !SANS[k2][2].includes(al) && !(k2 === 'museau' && al === 'oiseau')) interdit('zero', `${pasDe(ZERO_AUTRE[k2][0])} ${par(champ(k2))}`, ZERO_AUTRE[k2][1]);
    if (!c.pattes) interdit('zero', `pas de pattes ${par(champ('pattes'))}`, 'legs, feet, limbs');
    const ordre = ['cornes', 'crete', 'ailes', 'carapace', 'antennes', 'collerette', 'trompe', 'plaques', 'epines', 'pinces', 'mains', 'massue', 'aiguillon', 'panache', 'nageoires', 'defenses'];
    const types = [...ordre.filter(x => CO[x]), ...Object.keys(CO).filter(x => !ordre.includes(x)).sort()];
    for (const ty of types) if (!has(ty)) { const Tc = CO[ty] || {}, mot = (Tc.mot || [ty, ty + 's'])[(Tc.nombre?.[1] ?? 2) > 1 ? 1 : 0];
      const enx = al === 'poisson' && ty === 'nageoires' ? 'oversized fins, sail fins' : fam === 'plumage' && ty === 'ailes' ? '' : ORG_EN[ty]?.neg ?? ty;
      interdit('organes', `${pasDe(al === 'poisson' && ty === 'nageoires' ? 'grandes nageoires ni de voiles (seulement les nageoires ordinaires d\'un poisson)' : mot)} ${par(RESUMES.includes(ty) ? ci(ty, c[ty]) : 'aucun organe `' + ty + '`')}`, enx); }
    for (const o of mOrg) { const Tc = CO[o.type] || {}, fem = Tc.fem ?? 1, pl = o.nombre > 1; for (const f of Tc.formes || []) if (f !== o.forme) interdit('formes', `${pasDe((Tc.mot || [o.type, o.type])[pl ? 1 : 0] + ' ' + formeFr(f, fem, pl))} ${par('`' + o.type + '`', ci('forme', o.forme))}`, ORG_EN[o.type]?.autre?.[f] || ''); }
    const P = (k2, cond, frx, enx) => { if (utiles.includes(k2) && cond(c[k2])) interdit('proportions', `${frx} ${par(champ(k2))}`, enx); };
    if (c.pattes) { P('haut', v => v < .35, 'pas de longues pattes', 'long legs'); P('haut', v => v > .65, 'pas de pattes courtes', 'short stubby legs'); }
    P('queue', v => v > 0 && v < .3, 'pas de longue queue', 'long tail'); P('queue', v => v >= .7, 'pas de queue courte', 'short tail');
    P('cou', v => v > 0 && v < .3, 'pas de long cou', 'long neck'); P('cou', v => v >= .7, 'pas de cou court', 'short neck');
    P('tete', v => v >= .7, 'pas de petite tête', 'small head'); P('tete', v => v <= .3, 'pas de grosse tête', 'large head');
    if (al !== 'oiseau') { P('museau', v => v > 0 && v <= .3, 'pas de long museau', 'long snout'); P('museau', v => v >= .7, 'pas de face plate', 'flat face'); }
    P('oreilles', v => v > 0 && v <= .3, 'pas de grandes oreilles', 'large ears'); P('oreilles', v => v >= .7, 'pas de petites oreilles', 'small ears');
    P('long', v => v >= .7, 'pas de corps court et ramassé', 'short compact body'); P('long', v => v <= .3, 'pas de corps allongé', 'elongated body');
    if (c.posture < .3 && (al === 'quadrupede' || al === 'hexapode' || al === 'segmente')) interdit('posture', `pas debout, pas dressée sur ses pattes arrière ${par(brut.posture === undefined ? '`posture` absente : 0' : ci('posture', c.posture), loco.includes('reptation') && ci('locomotion', loco))}`, 'standing tall, upright, bipedal');
    if (c.posture >= .9 && al === 'bipede') interdit('posture', `pas à quatre pattes ${par(champ('posture'))}`, 'on all fours');
    if (al === 'quadrupede' || al === 'hexapode' || al === 'bipede') interdit('posture', `exactement ${nombreFr(c.pattes, 1)} pattes, pas une de plus ${par(champ('pattes'))}`, al === 'hexapode' ? 'four legs, extra legs' : 'extra legs, extra limbs');
    for (const [frx, enx] of FAMILLES[fam].autres) { const plumesAiles = frx === 'de plumes' && has('ailes')?.forme === 'plumes';
      interdit('tegument', `${plumesAiles ? 'pas de plumes sur le corps, seulement aux ailes' : 'pas ' + frx} ${regle(R.id)}`, plumesAiles ? 'feathered body' : enx); }
    const Mo = MOTIFS[c.motif] || MOTIFS.uni; if (Mo[4]) interdit('motif', `${c.motif === 'uni' ? 'pas de rayures ni de taches' : Mo[4] === 'spots' ? 'pas de taches' : 'pas de rayures'} ${par(ci('motif', c.motif))}`, Mo[4]);
  } else {
    for (const [frx, enx] of FAMILLES.machine.autres) interdit('tegument', `pas ${frx} ${regle('machine')}`, enx);
    interdit('tegument', `pas de visage ni de bouche ${regle('machine', 'un capteur, pas une tête')}`, 'face, mouth, teeth');
  }
  interdit('image', `pas de texte, de signature ni de filigrane dans l'image ${interp('une planche propre')}`, 'text, signature, watermark');
  { const G = { zero: 'Ce que les données mettent à zéro', 'sans-objet': 'Ce que ce corps n\'a pas', organes: 'Les organes absents du plan', formes: 'Les formes que ses organes n\'ont pas', proportions: 'Ce que ses proportions excluent',
      posture: 'Sa posture', tegument: 'Le tégument d\'une autre famille', motif: 'Son motif', modules: 'Les modules qui ne se voient pas', image: 'L\'image' }, L = [];
    for (const g of Object.keys(G)) { const X = I_.filter(x => x.groupe === g); if (X.length) L.push(`${G[g]} : ${X.map(x => x.fr).join(' ; ')}.`); }
    section('Interdits', L); }

  // —— 13. Prompts ——
  const style = opt.style || STYLE;
  const fin2d = 'Full body, side three-quarter view, neutral background.';
  let corpsEn, peauEn;
  if (machine) { corpsEn = [pro.avant.join(', '), pro.corps.join(', ')].filter(Boolean).join(', ') + '.'; peauEn = ''; }
  else {
    const queueOrg = pro.queueOrg, q = al === 'poisson' ? Maj(palier(c.queue, PALIERS.caudale)[2]) + (queueOrg.length ? ' with ' + list(queueOrg) : '') : utiles.includes('queue') ? (c.queue === 0 ? 'Tailless' : Maj(palier(c.queue, PALIERS.queue)[2].replace(/ tail$/, '') + (car && /slender|thin/.test(car[2]) && c.queue < .55 ? ' thin' : '') + ' tail') + (queueOrg.length ? ' ending in ' + list(queueOrg) : '')) : queueOrg.length ? Maj(list(queueOrg)) : '';
    corpsEn = [pro.avant.join(', ') + (pro.corps.length ? ', ' + pro.corps.join(', ') : '') + '.', pro.tete.length ? Maj(pro.tete.join(', ')) + '.' : '', pro.organes.length ? Maj(list(pro.organes)) + '.' : '', q ? q + '.' : '', pro.plus.length ? Maj(pro.plus.join(', ')) + '.' : ''].filter(Boolean).join(' ');
    peauEn = Maj([pro.peau.join(', '), pro.couleurs.join(', ')].filter(Boolean).join(', ')) + '.';
  }
  if (machine) { peauEn = Maj([pro.organes.join(', '), pro.tete.join(', '), pro.couleurs.join(', ')].filter(Boolean).join(', ')) + '.'; }
  const prompt_2d = `${style}, ${min1(corpsEn)} ${peauEn} ${fin2d}`.replace(/\s+/g, ' ').trim();
  const pose = machine ? 'neutral standing pose, all four legs visible' : al === 'poisson' ? 'neutral swimming pose, fins spread, mouth closed' : al === 'serpent' ? 'loose S-shaped pose, body not coiled over itself, mouth closed'
    : al === 'gelee' || al === 'radiaire' || al === 'tentaculaire' ? 'neutral pose, arms spread apart' : al === 'oiseau' ? 'neutral standing pose, wings folded, legs visible' : loco.includes('reptation') && c.haut < .35 ? `neutral crawling pose, belly low, ${c.pattes === 2 ? 'both' : 'all ' + nombreEn(c.pattes)} legs visible and clearly separated from the body, mouth closed` : `neutral standing pose, ${c.pattes === 2 ? 'both' : 'all ' + nombreEn(c.pattes)} legs visible and clearly separated from the body, mouth closed`;
  const prompt_3d = `${style}, 3D model of a single creature for a game, ${min1(corpsEn)} ${peauEn} ${Maj(pose)}, symmetrical, whole body in frame, centered, plain light grey background, soft even studio lighting, no cast shadows, no ground plane, clean silhouette for image-to-3D. Real scale: ${Number.isFinite(Lv) ? en(Lv, 2) + ' m long' : 'unknown length'}, ${Number.isFinite(mv) ? en(mv, mv < 1 ? 3 : 1) + ' kg' : 'unknown weight'}.`.replace(/\s+/g, ' ').replace(/\. \./g, '.').trim();
  const negatif = [...new Set(I_.map(x => x.en).filter(Boolean).flatMap(x => x.split(/,\s*/)))].join(', ');
  const palette = machine ? machinePal.map(x => ({ role: x.role, hex: x.hex, fr: x.fr, en: x.en, source: x.source }))
    : [pal.robe, pal.sombre, pal.ventre, pal.oeil, ...(accentUtile ? [pal.accent] : []), ...(osUtile ? [pal.os] : [])].map(x => ({ role: x.role, hex: x.hex, fr: x.fr, en: x.en, source: x.source }));
  const decorEn = [...decor.map(d => d[1]), ...lumiere.map(d => d[1])].join(', ');
  section('Prompts', [`Prompt 2D (IA, en anglais) ${interp('la fiche ci-dessus, en anglais ; ' + style + ' : la place du style de la DA')} :\n\`\`\`\n${prompt_2d}\n\`\`\``,
    `Prompt 3D (IA, pour un modèle 3D ou une image à convertir en 3D) ${interp('la même bête, en pose neutre, sur fond uni')} :\n\`\`\`\n${prompt_3d}\n\`\`\``,
    `Négatif ${interp('les interdits, en anglais')} :\n\`\`\`\n${negatif}\n\`\`\``,
    decorEn ? `Décor, pour une image en situation ${interp('le milieu, en anglais ; à ajouter au prompt 2D à la place de « neutral background »')} :\n\`\`\`\n${decorEn}\n\`\`\`` : null,
    `Palette ${par('`couleurs`', interp('et les teintes de la DA'))} : ${palette.map(x => `${x.role} \`${x.hex}\` (${x.en})`).join(', ')}.`]);

  // —— la fiche en Markdown ——
  const tete = `### ${t.nom_commun ? t.nom_commun + ' — ' : ''}${t.nom || t.id} (\`${t.id}\`)`;
  const chapeau = `*Fiche de créature d'Orvane (monde/fiche.js, docs/52), tirée de l'instantané${I.cycle?.n != null ? ' du cycle ' + fr(I.cycle.n) : ''}${I.monde?.id ? ' du monde `' + I.monde.id + '`' : ''} ; table des familles ${VERSION}. Entre parenthèses, en \`code\` : la donnée et sa valeur. En italique, « interprété » ou « règle » : une décision de la direction artistique.*`;
  const md = [tete, '', chapeau, ''];
  for (const s0 of S) { const puces = s0.phrases.filter(x => x.startsWith('- ')), autres = s0.phrases.filter(x => !x.startsWith('- '));
    if (s0.titre === 'Prompts') { md.push(`**${s0.titre}.**`, '', ...s0.phrases.flatMap(x => [x, ''])); continue; }
    md.push(`**${s0.titre}.** ${autres.join(' ')}`.trimEnd()); if (puces.length) md.push(...puces); md.push(''); }
  const humain = md.join('\n').trim() + '\n';

  const champs = {
    table: VERSION, id: t.id, nom: t.nom, nom_commun: t.nom_commun ?? null, monde: I.monde?.id ?? null, cycle: I.cycle?.n ?? null,
    famille: { id: fam, regle: R.id, quand: R.quand, pourquoi: R.pourquoi, tegument: { fr: FAMILLES[fam].tegument[0], en: FAMILLES[fam].tegument[1] }, details: teg.map(d => ({ id: d.id, fr: d.fr, en: d.en })), cle: k },
    identite: { parent: t.parent ?? null, parent_nom: parent ? nomT(parent) : null, parent_present: !!parent, apparu: t.apparu ?? null, genese: Number.isFinite(t.apparu) && !t.origine && (t.apparu < 0 || (Number.isFinite(I.cycle?.n) && t.apparu > I.cycle.n)),
      origine: t.origine ?? null, statut: t.statut ?? null, eteint: t.eteint ?? null, effectif: N, biomes: pops.map(x => ({ id: x.biome, nom: biomes[x.biome]?.nom || x.biome, effectif: x.effectif })) },
    silhouette: machine ? { machine: true, taille_m: L_ ?? null, masse_kg: m ?? null, modules: p.modules || {} } : { forme: c.forme, allure: al, pattes: c.pattes, posture: c.posture, taille_m: L_ ?? null, masse_kg: m ?? null,
      carrure: kc != null ? { indice: +kc.toFixed(3), fr: car[1], en: car[2] || 'ordinary build' } : null, decrire: C.decrire(c, p),
      proportions: Object.fromEntries(NUM7.map(k2 => [k2, { valeur: c[k2], utile: utiles.includes(k2) && !(k2 === 'haut' && !c.pattes), absente: brut[k2] === undefined, fr: c[k2] === 0 && ZERO[k2] ? ZERO[k2][0] : palier(c[k2], PALIERS[k2])[1], en: c[k2] === 0 && ZERO[k2] ? ZERO[k2][1] : palier(c[k2], PALIERS[k2])[2] }])),
      resumes: Object.fromEntries(RESUMES.map(r => [r, c[r]])) },
    organes: machine ? [] : mOrg.map(o => ({ ...o, fonction: CO[o.type]?.fonction ?? null, conduite: CO[o.type]?.conduite ?? null, en: organeEn(o, fam, TEINTE_ORG[o.type] === 'accent' ? pal.accent : null, k.nage), teinte: TEINTE_ORG[o.type] ? (pal[TEINTE_ORG[o.type]] || pal.os).hex : null })),
    couleurs: machine ? Object.fromEntries(machinePal.map(x => [x.role, { hex: x.hex, rgb: x.rgb, fr: x.fr, en: x.en, source: x.source }])) : { ...Object.fromEntries(['robe', 'sombre', 'ventre', 'oeil'].map(r => [r, { hex: pal[r].hex, rgb: pal[r].rgb, fr: pal[r].fr, en: pal[r].en, absente: !brut.couleurs?.[r] }])),
      accent: { hex: pal.accent.hex, rgb: pal.accent.rgb, fr: pal.accent.fr, en: pal.accent.en, interprete: true }, motif: c.motif },
    mouvement: { locomotion: loco, vitesse_rel: p.vitesse_rel ?? null, vitesse_ms: Number.isFinite(p.vitesse_rel) && Number.isFinite(L_) ? +(p.vitesse_rel * L_).toFixed(3) : null },
    comportement: { activite: p.activite ?? null, sociabilite: p.sociabilite ?? null, temperament: p.temperament ?? null, perception: p.perception ?? null, regime: p.regime ?? null, diete: p.diete ?? null,
      reproduction: machine ? null : k.reproduction, portee: p.portee ?? null, maturite: p.maturite ?? null, longevite: p.longevite ?? null, traits_majoritaires: majeurs.map(x => ({ trait: x, part: +T[x].part.toFixed(4) })), caractere: t.caractere ?? null },
    milieu: { niche: niche, tolerance: p.tolerance ?? null, eau: p.eau ?? null, principal: pops[0] ? { biome: pops[0].biome, part: +(pops[0].effectif / N).toFixed(4) } : null, decor: { fr: decor.map(d => d[0]), en: decor.map(d => d[1]) }, lumiere: { fr: lumiere.map(d => d[0]), en: lumiere.map(d => d[1]) } },
    variations: variantes, parente, interdits: I_.map(x => ({ groupe: x.groupe, fr: x.fr, en: x.en })), sections: S.map(s0 => ({ n: s0.n, titre: s0.titre, phrases: s0.phrases })),
  };
  return { famille: fam, humain, ia: { prompt_2d, prompt_3d, negatif, palette, decor: decorEn, variantes: variantes.filter(v => v.en).map(v => ({ trait: v.trait, part: v.part, allele: v.allele, en: v.en })), style }, champs };
}
// ce qui a changé du plan visuel, d'une clé à l'autre
function planChange(a, b) { const L = [];
  if (!!a.machine !== !!b.machine) return ['machine ' + (b.machine ? 'oui' : 'non')];
  if (a.plan !== b.plan) L.push(`\`forme\` : ${val(a.plan)} → ${val(b.plan)}`); if (a.allure !== b.allure && a.plan === b.plan) L.push(`allure : ${val(a.allure)} → ${val(b.allure)}`);
  if (a.reproduction !== b.reproduction) L.push(`\`reproduction\` : ${val(a.reproduction)} → ${val(b.reproduction)}`);
  if (a.carapace !== b.carapace) L.push(b.carapace ? 'une carapace est venue' : 'la carapace s\'est perdue');
  if (a.nage !== b.nage) L.push(b.nage ? 'elle s\'est mise à nager' : 'elle ne nage plus');
  return L.length ? L : ['rien'];
}
// la matière d'un panache, selon la famille
function matiere(fam) { return { pelage: 'de poils', plumage: 'de plumes', chitine: 'de soies', ecailles: 'd\'écailles effilées', cuirasse: 'd\'écailles effilées', 'peau-nue': 'de filaments de peau', gelee: 'de filaments' }[fam] || 'de filaments'; }
// la bouche, d'après le régime et la forme
function boucheDe(al, reg, D, loco = []) {
  const top = Object.entries(D || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  // (un oiseau : le bec des planches ; le mot anglais remplace « beak » dans « long beak »)
  if (al === 'oiseau') return reg === 'carnivore' ? ['crochu, un bec de rapace', 'hooked raptor beak'] : (D.fruits || 0) >= .4 ? ['épais, un bec de mangeur de fruits', 'thick fruit-eater\'s beak']
    : loco.includes('nage') ? ['en poignard, un bec de pêcheur', 'dagger-like fishing beak'] : ['conique, un bec de mangeur de graines', 'conical seed-eater\'s beak'];
  if (al === 'hexapode' || al === 'segmente') return reg === 'carnivore' ? ['mandibules de chasseur, fortes et croisées', 'strong crossed predatory mandibles'] : (D.nectar || 0) >= .3 ? ['pièces buccales de butineur', 'sucking mouthparts'] : ['pièces buccales broyeuses', 'chewing mouthparts'];
  if (al === 'serpent') return reg === 'carnivore' ? ['tête en triangle, langue fourchue', 'triangular head, forked tongue'] : ['tête ovale, bouche petite', 'rounded head, small mouth'];
  if (al === 'poisson') return reg === 'carnivore' ? ['grande bouche dentée', 'large toothed mouth'] : reg === 'filtreur' ? ['bouche béante de filtreur', 'wide gaping filter-feeding mouth'] : ['petite bouche de brouteur', 'small grazing mouth'];
  if (al === 'radiaire' || al === 'tentaculaire') return ['bouche cachée sous le corps', ''];
  if (reg === 'carnivore') return top === 'insectes' ? ['museau fin de mangeur d\'insectes, petites dents', 'fine insect-eater\'s muzzle'] : ['gueule de chasseur, crocs', 'predator\'s jaws with fangs'];
  if (reg === 'filtreur') return ['bec plat et large de filtreur', 'flat wide filter-feeding bill'];
  if (reg === 'omnivore') return ['bouche d\'omnivore, dents mixtes', 'omnivore\'s mouth'];
  return top === 'graines' ? ['bouche de mangeur de graines', 'seed-eater\'s mouth'] : top === 'fruits' ? ['bouche de mangeur de fruits', 'fruit-eater\'s mouth'] : ['bouche de brouteur', 'grazer\'s mouth'];
}
// un organe en anglais
function organeEn(o, fam, accent, nage) {
  const E = ORG_EN[o.type];
  if (!E) return `${nombreEn(o.nombre)} ${o.type} organ${o.nombre > 1 ? 's' : ''} (${o.forme}) ${PLACE_EN[o.place] || ''}`.trim();
  const [av, ap] = E.f[o.forme] || ['', ''], s = palier(o.taille, TAILLE_ORG)[2];
  let nom = E.n[o.nombre > 1 ? 1 : 0];
  if (o.type === 'carapace' && fam === 'chitine') nom = o.taille > .3 ? (o.nombre > 1 ? 'hard elytra' : 'pair of hard elytra') : 'short dorsal plate';
  if (o.type === 'panache' && o.forme === 'eventail') nom = 'fan-shaped plume';
  const avant = o.type === 'panache' && o.forme === 'eventail' ? '' : o.type === 'carapace' && fam === 'cuirasse' && nage && o.forme === 'bombee' ? 'low-domed smooth streamlined' : av;   // (règle cuirasse-nageur)
  const place = o.place === 'tete' && ['cornes', 'defenses', 'antennes', 'trompe', 'collerette'].includes(o.type) || o.place === 'queue' || o.place === 'flancs' && o.type === 'ailes' ? '' : PLACE_EN[o.place];
  return [nombreEn(o.nombre), s.trim(), avant, nom, ap, place, accent ? `in contrasting ${accent.en} ${accent.hex}` : ''].filter(Boolean).join(' ');
}
// un repère terrestre, pour l'œil (une comparaison, jamais un modèle)
function repere(fam, al, c, p, car) {
  const loco = p.locomotion || [], m = p.masse_kg || 1;
  if (c.organes.some(o => o.type === 'ailes') && fam !== 'plumage') return null;   // (une bête à poil et à ailes de plumes n'a pas d'équivalent sur la Terre)
  if (fam === 'pelage' && al === 'bipede') return c.organes.some(o => o.type === 'mains') ? 'de loin, un singe debout' : loco.includes('saut') ? (m < 2 ? 'de loin, une gerboise' : 'de loin, un kangourou') : null;
  if (fam === 'pelage') { if (loco.includes('reptation') && c.haut < .2 && c.long > .6) return 'presque une belette aplatie'; if (loco.includes('nage')) return 'de loin, une loutre'; if (c.organes.some(o => o.type === 'mains')) return 'de loin, un singe';
    if (loco.includes('fouissage')) return m > 2 ? 'de loin, un blaireau' : 'de loin, une taupe'; if (loco.includes('saut') && !loco.includes('course')) return 'de loin, un lièvre'; if (loco.includes('course') && c.haut > .55) return 'de loin, une antilope'; return null; }
  if (fam === 'cuirasse') return loco.includes('nage') ? 'de loin, une tortue d\'eau' : c.long > .6 ? 'de loin, un pangolin' : 'de loin, une tortue terrestre';
  if (fam === 'ecailles') return al === 'poisson' ? (c.long > .85 ? 'de loin, une anguille' : null) : al === 'serpent' ? (m > 10 ? 'de loin, un python' : car && !/fine/.test(car[1]) ? 'de loin, une vipère trapue' : 'de loin, une couleuvre') : loco.includes('reptation') ? 'de loin, un scinque' : m > 5 ? 'de loin, un varan' : 'de loin, un lézard';
  if (fam === 'peau-nue') return 'de loin, une salamandre';
  if (fam === 'chitine') { if (al === 'segmente') return 'de loin, un mille-pattes'; const ai = c.organes.find(o => o.type === 'aiguillon'), pi = c.organes.some(o => o.type === 'pinces');
    if (pi || ai?.forme === 'courbe') return 'de loin, un scorpion'; if (c.pattes === 8) return 'de loin, une araignée'; if (c.carapace > .3) return 'de loin, un scarabée'; if (loco.includes('nage')) return 'de loin, un dytique'; return null; }
  if (fam === 'gelee') return al === 'tentaculaire' ? 'de loin, une pieuvre' : loco.includes('nage') ? 'de loin, une méduse' : 'de loin, une étoile de mer';
  return null;
}

const API = { VERSION, STYLE, FAMILLES, REGLES, DETAILS, ecrire, famille, table, nomCouleur, hex, modeDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneFiche = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
