# 55. L'atlas : chaque lignée en planche de naturaliste

L'Observatoire montre chaque lignée par un dessin calculé : sa silhouette (`monde/silhouette.js`, docs/21), d'après son corps et sa façon de vivre. Ce dessin est aussi celui que lisent les jeux : un SVG de 170 × 90, en aplats, dont chaque patte est une chaîne de `<line>` que Lisière et le kit Godot savent animer. Il doit rester simple et stable. Dans la fiche naturaliste, en revanche, il paraissait pauvre : des formes plates, des dauphins dessinés comme des truites, des serpents fins comme un fil, et rien de ce que portent la plupart des bêtes (un albinos y gardait sa robe brune).

L'atlas (`monde/atlas.js`) fait de ce dessin une **planche d'atlas**, pour l'Observatoire seulement. Il ne touche ni au monde ni au dessin des jeux : il le reprend, avec ce que ce dessin sait de lui-même (ses parties : le corps, la tête, chaque patte et ses articulations, les organes, les yeux) et ce que la fiche de créature (docs/54) dit de la lignée (sa famille visuelle, son tégument, sa taille vue). Comme le dessin, il ne remplace la bête par aucune image : tout est calculé, et les mêmes données donnent toujours la même planche.

## La patte d'Orvane

La planche reprend la direction artistique de l'Atlas du vivant (papier ivoire, vert forêt, accents ocre) et celle des planches de naturaliste du XIXᵉ siècle : un trait d'encre, un lavis, des hachures de graveur.

- **L'encre.** Un trait sépia (l'encre se teinte un peu de la robe) cerne chaque masse. Il est plus appuyé du côté de l'ombre, en bas et en arrière, comme le ferait une plume. Le corps, le cou, la tête et la queue n'ont qu'un contour, sans couture entre eux. Chaque patte, chaque organe a le sien.
- **Les volumes.** La lumière vient d'en haut : le dos s'éclaire, le ventre et le dessous des pattes passent dans l'ombre. Dans l'ombre, des hachures fines, inclinées, s'épaississent vers le bas. Les pattes du côté lointain sont plus sombres et hachurées.
- **Le papier et le lavis**, pour la grande planche : un grain de papier, et un trait qui tremble à peine, comme tracé à la main (un filtre SVG, que seul un navigateur lit).
- **Le cadre.** Un papier ivoire sous un double filet. L'entête dit « Atlas du vivant · planche » et le numéro du cycle, puis le tégument de la lignée (« poil — poil court et dense »). Sous le dessin, l'échelle et la légende.

## Ce que la planche lit des données

Chaque détail vient d'une donnée de la lignée.

**Son tégument : celui de sa famille visuelle** (`monde/fiche.js`, la règle et les détails de la table versionnée). Une même lignée a la même peau dans la fiche, dans l'atlas et dans les jeux qui suivent la fiche.

| famille | dans la planche |
| --- | --- |
| pelage | des poils couchés vers l'arrière, plus denses sur le dos ; des mèches sur la ligne du dos ; une queue fournie. Le poil est long dans le froid (`pelage-froid`), ras et clairsemé dans le chaud, ras et lustré chez une nageuse (`pelage-nageur`, presque sans mèches). |
| plumage | des plumes en écailles sur le corps. Sur l'aile repliée, les couvertures à l'avant, et les rémiges en éventail vers la pointe. Sur la queue, les pennes, de la base au bout. |
| écailles | des écailles imbriquées, couchées vers la queue : grandes chez un poisson, fines chez un serpent. Chez un poisson, la ligne latérale et des nageoires rayonnées, un peu translucides. |
| chitine | la cuticule luisante (un reflet sur chaque segment), les sutures de l'abdomen, l'œil à facettes. Les ailes membraneuses sont translucides et nervurées. Celles d'un papillon gardent leur couleur et prennent une bordure sombre. |
| cuirasse | les plaques de la carapace, la peau écailleuse. |
| peau nue | la peau humide, son reflet, ses pores (une grenouille, un escargot). |
| gelée | la cloche translucide et ses canaux. |
| machine | les tôles, leurs rivets, l'œil-lentille. |

**Son œil.** Il a un iris, des reflets, et une paupière chez une bête à poil ou à écailles de terre. Sa pupille suit la bête :

| bête | pupille |
| --- | --- |
| chasseuse de nuit ou du crépuscule (sauf un oiseau) | une fente verticale |
| brouteuse à sabots | une barre horizontale |
| amphibien | une barre |
| insecte | des facettes |
| machine | un objectif |
| les autres | une pupille ronde, plus grande la nuit |

**Ses pattes**, redessinées sur leurs articulations (les points et les épaisseurs que publient les parties) :
- la cuisse et le bras en muscle, les articulations marquées, le pli du muscle le long du membre ;
- du côté proche, l'épaule et la hanche se fondent dans le corps, sous un trait qui dessine le muscle ;
- les pieds : le sabot fendu d'une brouteuse, la patte à griffes de corne, le coussinet et ses doigts, les doigts écaillés d'un oiseau, les serres.

Le dessin des jeux donne un sabot à tout omnivore un peu lourd. L'atlas ne le garde qu'à une bête qui mange surtout des plantes : le sanglier a ses sabots, le renard et le blaireau des griffes.

**Le corps d'un quadrupède**, modelé sur son contour : le garrot et la croupe un peu hauts, le dos qui fléchit entre eux, le poitrail plus profond, le ventre qui remonte devant la cuisse. Les attaches des pattes ne bougent pas. Une bête à poil a l'intérieur des oreilles plus clair et rosé.

**Ce que porte la plupart de ses bêtes** (les traits que montrent au moins la moitié d'entre elles, comme le fait la fiche de l'Observatoire). Le dessin des jeux ne les montre pas :
- l'albinisme : une robe blanche, des yeux rosés ;
- le mélanisme : une robe noire ;
- la robe dorée ;
- les palmes, sous les doigts ;
- la membrane d'une planeuse, entre les pattes ;
- les vibrisses, autour du museau.

Les robes passent au dessin lui-même : tout ce qu'il colore change avec elles.

**Les vraies proportions, là où le dessin des jeux simplifie.**
- **Un serpent** est redessiné à l'épaisseur que donnent sa masse et sa longueur, comme un cylindre de la densité de l'eau : son diamètre vaut √(4 m / (1 000 π L)). Son corps est un ruban qui s'effile vers la queue et se resserre au cou. On y voit le ventre clair et ses plaques en travers, le motif du dos (les bandes, une raie, des taches, la livrée d'avertissement) et une tête à la mesure du corps. La planche se recadre à sa nouvelle taille.
- **Un cétacé.** Les données d'un dauphin ou d'un marsouin disent « serpent qui ne fait que nager », c'est-à-dire un poisson. Mais un « poisson » qui met bas (`reproduction` vivipare) et pèse 10 kg ou plus est un cétacé. Il perd ce que le dessin des poissons lui donne et qu'il n'a pas : les écailles, l'opercule, les dents d'un poisson chasseur, la nageoire du ventre. Il prend ce qu'il a : la peau lisse et lustrée, les nageoires de la queue à plat, l'évent, une bouche en sourire, et le masque blanc d'une orque quand son motif le dit.
- **La tête d'une bête à pattes.** Le dessin des jeux la rétrécit quand la bête s'alourdit (de 30 % au plus) pendant que son corps s'épaissit : une bête de 60 kg y a une tête haute du quart de son corps. Chez un mammifère, la tête en fait à peu près la moitié (un loup, un cerf, un renard). La planche la ramène à cette mesure en la faisant grandir depuis la nuque, de 1,8 fois au plus. Elle ne la rapetisse jamais, et le dessin se recadre pour garder les oreilles et les cornes. Le ventre d'une bête lourde est un peu allégé.
- **Un mollusque** (un escargot, une moule) a la peau nue et humide, pas les écailles d'un serpent.

## La planche entière : l'échelle, les renvois

Chaque bête remplit son cadre, comme dans un guide naturaliste. Deux planches ne se comparent donc pas à l'œil : c'est l'échelle qui dit la taille.

- **L'échelle.** Une barre de deux à quatre pas, d'une longueur ronde (de 1 mm à 20 m), mesurée sur la longueur que montrent la plupart des bêtes (la taille vue de la fiche, quand le nanisme ou le gigantisme la change). On la lit sous le dessin : « la barre vaut 10 cm ».
- **Les renvois.** Un point sur la bête, un trait pointillé et un numéro, posé hors du corps. La légende, sous la planche, les explique :
  - chaque organe, dans les mots du catalogue (`mot`, `fem`) : « deux cornes recourbées », « une massue ronde au bout de la queue », « ailes de plumes » ;
  - chaque trait majoritaire qui se voit, posé là où il se voit : les palmes au pied, les vibrisses au museau, les yeux de nuit à l'œil ;
  - le motif de la robe.

  Il y en a sept au plus, numérotés de l'arrière vers l'avant.

## Ce que la fiche apporte encore à la planche

La fiche de créature (docs/54) décrit la lignée en entier. Trois de ses sections passent sur la planche.

- **Son milieu.** Le décor de son lieu principal (`milieu.decor`) devient un sol gravé, sous la bête et derrière elle :
  - herbes hautes ou rases ;
  - roseaux et vase ;
  - litière et fougère d'un sous-bois, feuilles géantes d'une jungle ;
  - neige, sable et buissons épars, rocaille, galets, lichens.

  En pleine eau, la planche montre la surface, des bulles et des herbiers, ou la nuit piquée de particules des abysses. Sa lumière (`milieu.lumiere`) devient un lavis derrière elle :
  - dorée pour une lumière rasante d'aube ou de crépuscule ;
  - bleutée sous l'eau ;
  - bleue sous la lune ;
  - verdâtre dans la pénombre.
- **Ses variantes.** Ce sont les traits que montre une partie des bêtes (`variations`, avec leur part). La planche en dessine trois au plus, d'au moins 1 % des bêtes, parmi les traits qui se voient : « robe dorée · 3,1 % des bêtes ». Le camouflage y prend la teinte que la fiche lui donne, celle du sol.
- **Ses couleurs.** Quatre notes de couleur, celles du dessin (la robe que montrent ses bêtes), chacune avec sa pastille et son nom (`OrvaneFiche.nomCouleur`) : « robe : gris-brun », « œil : jaune ».

Il suffit de donner la fiche à la planche : `OrvaneAtlas.planche(corps, plan, traits, { fiche: OrvaneFiche.ecrire(t, I).champs, graine: t.id })`. Elle y lit aussi la famille, le tégument et la taille vue.

## La vignette du registre

Le registre des espèces montre chaque lignée en vignette. Il prend la planche en léger (`leger: true`) : le trait, les volumes et les yeux, sans tégument ni hachures. Une vignette pèse environ 20 Ko et se dessine en moins d'une milliseconde. Elle est gardée par lignée, monde et cycle.

## S'en servir

```js
// dans un navigateur, après moteur/corps.js, monde/silhouette.js (et monde/fiche.js pour la famille)
const P = OrvaneAtlas.planche(t.plan.corps, t.plan, traitsMajoritaires, {
  famille: fiche.champs.famille.id, details: fiche.champs.famille.details.map(d => d.id),
  graine: t.id, taille: fiche.champs.silhouette.taille_vue_m });
// P.svg : la planche (170 × 102 : le dessin, l'échelle, les renvois) ; P.renvois : [{ n, texte }] ; P.echelle : { m, texte }
const D = OrvaneAtlas.dessiner(corps, plan, traits, { leger: true, encre: 1.5 });   // le dessin seul, une vignette
```

Dans Node : `globalThis.OrvaneCorps = require('./moteur/corps.js')`, puis `require('./monde/atlas.js')`.

Pour juger un changement, l'atlas a son banc visuel. `node outils/galerie.js --atlas [--grain] [--mondes europe,orvane] [--par 2] --png galerie.png` montre chaque bête dans le dessin des jeux et en planche, côte à côte.

## Ce que le banc vérifie

`bancs/atlas.js` (`--court` : trois mondes) passe sur chaque lignée animale des mondes du dépôt.

1. **Chaque lignée se dessine**, en planche et en vignette.
   - Son SVG est bien formé : chaque balise est refermée, et aucun identifiant n'apparaît deux fois, même entre deux planches d'une page.
   - Ni son corps, ni son plan, ni ses traits ne changent.
2. **Le même dessin à chaque fois.** Le dessin des jeux est le même avant et après une planche.
3. **Ce qu'elle lit des données se voit :**
   - la robe d'un albinos et celle d'un mélanique ;
   - la fente, la barre et les facettes, chez qui les doit ;
   - chaque serpent en ruban à son épaisseur ;
   - chaque cétacé sans écailles, sans opercule ni dents de poisson ;
   - la tête des quadrupèdes de plus de 20 kg, entre 0,3 et 0,65 de la hauteur de leur corps ;
   - des renvois numérotés de 1 à 7 au plus, posés dans le cadre ;
   - une échelle de longueur ronde.
4. **Ce que la fiche lui apporte :**
   - le sol de son milieu, pour chaque bête au sol ;
   - ses variantes (trois au plus, d'au moins 1 % des bêtes, des traits qui se voient) ;
   - ses quatre notes de couleur, nommées.
5. **Ce qu'elle pèse et ce qu'elle coûte.** Une vignette pèse moins de la moitié d'une planche.

## Les limites

- **Le dessin.** La planche garde la géométrie du dessin des jeux : la forme du corps, la tête, la place des organes. Elle n'invente pas d'anatomie que les données ne disent pas. Un dauphin n'a pas de bec, puisque son museau ne se distingue pas de celui d'un marsouin.
- **Les sabots.** La règle des sabots se lit sur le régime. Un ours brun, omnivore qui mange surtout des plantes et ne grimpe pas, garde les sabots du dessin des jeux.
- **Le dessin des jeux.** L'atlas ne le change pas : un jeu voit toujours la même bête qu'avant. Les règles de fidélité de l'atlas (le serpent épais, le cétacé, les griffes du renard) pourront passer au dessin des jeux plus tard. Elles changeraient alors les textures des jeux, et ce serait à décider à part.
