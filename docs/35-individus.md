# 35. Les individus : une bête, son génotype, ses parents

Le moteur fait vivre des populations : des effectifs, des fréquences d'allèles, des moyennes. Un jeu, lui, montre des bêtes. Jusqu'ici, il les tirait trait par trait (docs/8, docs/9) : une robe, une taille, une mère connue au mieux. Il ne savait pas ce qu'une bête portait sans le montrer, ni qui étaient ses grands-parents.

`tampon/individus.js` tire de la population réelle des individus complets, et les croise. C'est la première étape de la phase 3 : des individus qui ont une histoire.

Le fichier est côté jeu, comme le tampon : sans dépendance, pour Node ou le navigateur (`OrvaneIndividus`). Le moteur n'en a pas besoin, et un monde ne change en rien.

## Une bête

```json
{ "id": "k3f9a0qz", "nom": "Titeu", "sexe": "f", "taxon": "brouteur", "biome": "prairie", "ne": 412,
  "gen": 0, "parents": null, "F": 0, "vigueur": 1,
  "alleles": { "albinisme": 1, "robe-doree": 2 },
  "a": { "taille": 0.61, "vitesse": 0.1 }, "z": { "taille": 1.32, "vitesse": -0.4 },
  "savoirs": ["chasse-concertee"], "ascendance": {} }
```

- **`alleles`** : pour chaque trait, le nombre de copies que porte la bête (une ou deux). Ce qu'elle montre s'en déduit : un dominant dès une copie, un récessif avec deux, puis l'épistasie du catalogue (`montre(bete, catalogue)`). Celle-ci porte l'albinisme sans le montrer. `caches(bete, catalogue)` donne ce qu'elle porte sans le montrer.
- **`a` et `z`** : pour chaque trait continu (docs/8), sa valeur génétique (ce qu'elle transmet) et sa valeur propre (ce qu'elle est). Leur écart est le hasard de sa vie.
- **`savoirs`** : ce qu'elle sait (docs/34).
- **`gen`, `parents`, `ascendance`** : 0 pour une bête sauvage ; sinon, ses parents et ses ancêtres sur six générations. Au-delà, ce sont des fondateurs.
- **`F` et `vigueur`** : sa consanguinité, et ce qu'elle lui coûte (85 % de vigueur pour un petit de frère et sœur).
- **`hybride`** : la lignée de son père, si ce n'est pas celle de sa mère.

C'est un objet JSON simple, que le jeu sauvegarde tel quel : un kilo-octet environ, même après des dizaines de générations.

## Tirer une bête de la population réelle

```js
const bete = OrvaneIndividus.tirer(inst, 'brouteur', 'prairie');
```

Deux copies par locus, tirées à la fréquence de chaque allèle dans la population : c'est Hardy-Weinberg. Une valeur génétique dans N(m, g), une valeur propre dans N(m, v), des savoirs à la part de ceux qui les savent. Un sexe, un nom tiré de celui de la lignée.

`echantillon(inst, taxon, biome, n)` en tire n d'un coup. C'est ainsi qu'Orvane fournit, sur demande, des individus tirés de la population réelle.

**Sachant ce que le jeu montre déjà.** Souvent, le jeu a déjà tiré la bête à sa façon : une robe à ses propres taux (docs/2), une taille. `opt.montre` (ses traits) et `opt.z` (ses valeurs) disent ce qu'on voit d'elle, et le génotype se tire sachant cela :

| ce qu'on voit | ce qu'elle porte |
| --- | --- |
| un dominant | une ou deux copies |
| un récessif | deux copies |
| pas de dominant | aucune |
| pas de récessif | une copie cachée, avec la chance 2p / (1 + p) |
| un trait masqué par un autre (l'albinisme efface les robes) | tiré sans condition |
| un trait que la population n'a pas | la bête le porte |

Sur toutes les bêtes, les fréquences d'allèles restent celles de la population. Sa valeur génétique se tire aussi sachant sa valeur propre : a ~ N(m + h²(z − m), g(1 − h²)).

## Croiser deux bêtes

```js
const R = OrvaneIndividus.croiser(mere, pere, inst);   // { ok: true, petit } ou { ok: false, raison }
```

- **Mendel.** À chaque locus, un allèle de chaque parent. Deux porteurs cachés de l'albinisme font un quart d'albinos.
- **Les traits continus.** La moyenne des valeurs génétiques des parents, plus l'aléa de Mendel. Sa variance vaut g/2, moins ce que la consanguinité des parents a déjà fixé (le modèle infinitésimal). Puis le hasard de sa vie. Un petit tient de ses parents à proportion de l'héritabilité.
- **La consanguinité.** F est le coefficient de parenté des parents, calculé sur leur ascendance. Il vaut 25 % pour un frère et une sœur ou une mère et son fils, 12,5 % pour des demi-frères, 6,25 % pour des cousins. Elle coûte de la vigueur (`REGLES.depression` : 0,6 × F). Surtout, elle fait sortir les récessifs cachés.
- **Les savoirs.** Le petit sait ce que sait sa mère, neuf fois sur dix.
- **Deux lignées proches.** À une séparation (une lignée et sa fille), un petit une fois sur deux. À deux séparations (deux sœurs), une fois sur quatre. Au-delà, jamais. Le petit est un hybride : de la lignée de sa mère, moitié moins fertile.
- **Ce qui ne se croise pas.** Deux bêtes du même sexe. Une ouvrière ou un soldat (docs/33). Une machine, une plante.

`parente(x, y)` donne le coefficient de parenté de deux bêtes. `pedigree(bete, n)` donne leur arbre sur n générations, avec les noms. `distanceLignees(inst, a, b)` donne la distance entre deux lignées.

## Le hasard

`opt.r`, une fonction qui rend un nombre dans [0, 1), Math.random par défaut. Le même hasard donne la même bête.

## Ce que le banc vérifie

`bancs/individus.js`, en trois secondes :
- **Une bête de la population réelle.** 20 000 Tismusil du marais. Chaque allèle est à sa fréquence (à 0,002 près). L'albinisme, allèle à 6,7 %, se voit chez 0,4 % d'entre eux (p²) et se cache chez 12,6 %. La taille a sa moyenne, sa variance et sa part héritable.
- **Tirée sachant ce qu'on voit.** Une albinos a deux copies. Une bête qui ne l'est pas porte l'allèle caché une fois sur trois (p = 0,2). L'allèle reste à 20 %.
- **Mendel.**
  - Deux porteurs cachés : 25 % d'albinos.
  - Une géante et un mâle ordinaire : 50 % de géants.
  - Deux albinos : que des albinos.
- **Les traits continus.**
  - La taille d'un petit suit celle de ses parents avec la pente 0,5, l'héritabilité.
  - Un éleveur qui garde à chaque portée la plus grande et le plus grand mène ses bêtes de 0,3 à 2,9 écarts-types en huit générations.
- **La parenté.**
  - Les valeurs exactes : frère et sœur, demi-frères, cousins, mère et fils.
  - Une lignée fermée : 25 ; 37,5 ; 50 ; 59,4 %, comme la théorie.
  - Une porteuse cachée et un mâle sain n'ont aucun albinos ; leurs enfants croisés entre eux en ont 1 sur 16.
- **Les lignées proches.**
  - Une lignée et sa fille : un petit une fois sur deux. Deux sœurs : une fois sur quatre. Trois séparations : jamais.
  - L'hybride est moitié moins fertile.
- **Le pedigree.** Treize générations : un kilo-octet. Le même hasard donne la même bête.

```
node bancs/individus.js
```

## Stone Valley (§231)

Une compagne liée devient un individu, tiré sachant ce qu'elle montre, et sauvegardé avec elle. Au campement, une femelle et un mâle de sa lignée ont un petit (docs/36).

## Ce qui reste ouvert

- **Les loci liés** : des traits qui voyagent ensemble.
- **La préférence qui évolue** (docs/9) : une femelle qui choisit.
- **La parenté des bêtes sauvages** : deux bêtes d'une petite population sont un peu parentes. Ici, deux bêtes tirées sont toujours des fondateurs.
