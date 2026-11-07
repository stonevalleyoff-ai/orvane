# 38. La vie en groupe : troupeaux, meutes, migrations

Le moteur sait déjà ce que vaut la vie en groupe. La sociabilité, un trait continu (docs/8), dilue la prédation et propage les maladies. Le grégarisme donne l'alerte. La chasse concertée et les routes des saisons s'apprennent (docs/34). Mais un jeu ne voyait qu'un chiffre. Ce chapitre le lui traduit en ce qu'il peut montrer. C'est la quatrième étape de la phase 3.

Comme la silhouette (docs/11), c'est une **lecture de l'état**. Elle est faite à la publication (`moteur/collectif.js`, appelé par `hebergement/cycle.js` et `moteur/solo.js`) et ne change rien à la simulation, le jour où elle s'éveille comme les autres. Un monde qui ne la demande pas (`profil.monde.collectif`) n'en voit rien.

## Le groupe

Chaque population publie `groupe` :

```json
"groupe": { "forme": "meute", "nom": "en meute", "sociabilite": 0.51,
            "taille": { "min": 2, "typ": 4, "max": 9 },
            "hierarchie": { "niveau": 0.66, "type": "dominance" }, "meneur": "un couple dominant", "chasse": "ensemble" }
```

**La forme** vient de la sociabilité de la population : celle de son plan, déplacée par sa moyenne génétique, renforcée par le grégarisme.

| sociabilité | qui | forme |
| --- | --- | --- |
| sous 0,2 | tous | `solitaire` |
| 0,2 à 0,45 | tous | `famille` (une mère et ses petits) |
| au-delà | un nageur qui ne marche pas | `banc` |
| | un volant | `volee`, ou `essaim` sous 50 g |
| | un mangeur de chair | `meute` |
| | les autres | `troupeau` dès 20 kg, sinon `bande` |
| | une lignée en colonie (docs/33) | `colonie` |

**La taille** d'un groupe habituel part d'un groupe moyen (une meute de 6, un troupeau de 30, une bande de 14, un banc de 200, une volée de 40, un essaim de 900). Elle grandit avec la sociabilité, à découvert (le couvert du lieu) et sous la prédation (la dilution). Elle ne dépasse jamais la population. `min` et `max` disent l'écart d'un groupe à l'autre.

**La hiérarchie** est plus marquée chez les tempéraments vifs et quand la nourriture manque : `egalitaire`, `dominance`, `despotique`, ou `castes` pour une colonie. Les bancs et les essaims n'en ont presque pas.

**Le meneur** : un couple dominant (une meute), une vieille femelle (un troupeau qui vit longtemps, ou qui sait les routes), un mâle dominant (des ornements, des cornes), une reine (une colonie), la mère (une famille), personne (un banc, une volée).

**Le reste** : `sentinelles` (le grégarisme, ou le savoir des cris), `chasse` (`ensemble`, ou `encercle` si la meute sait chasser ensemble, docs/34), `avec` (les troupeaux mêlés : des brouteurs en groupe, de même heure et de même taille à un facteur 3 près, qui paissent ensemble).

## Les migrations visibles

Une population migre avec les saisons si :
- son lieu a des saisons ;
- elle est mobile : elle marche ou court dès 300 g, nage dès 300 g, ou vole dès 5 g ;
- son hiver y est rude : elle y vaut moins des trois quarts de son été ;
- un lieu voisin lui convient en hiver, au moins un cinquième mieux.

Elle publie `migration` :

```json
"migration": { "vers": "taiga", "vers_nom": "Taïga", "saison": "hiver", "part": 0.54, "depart": 0.78, "retour": 0.22,
               "etat": "partie", "guide": "les plus vieilles mènent, toujours par le même chemin" }
```

`part` est la part qui part : elle grandit avec l'écart entre les deux hivers, avec la sociabilité et avec le savoir des routes. `depart` et `retour` sont des phases de l'année (0 : le cœur de l'hiver). `etat` dit le moment :

| `etat` | phase | ce que le jeu montre |
| --- | --- | --- |
| `au depart` | 0,78 à 0,88 | des colonnes de bêtes vers le lieu d'hiver |
| `partie` | 0,88 à 0,12 | moins de bêtes ici ; des visiteurs là-bas |
| `au retour` | 0,12 à 0,22 | les colonnes reviennent |
| `au pays` | le reste de l'année | tout le monde est là |

Pendant l'hiver, le lieu d'arrivée publie ses visiteurs : `biomes[].visiteurs`, chacun avec sa lignée, son lieu d'origine, son effectif et sa forme de groupe.

**Sans hivernage actif, les bêtes restent comptées chez elles.** Le moteur ne les déplace pas : la place de l'hiver est déjà dans ses comptes (la saison, la niche, les routes apprises). Une bête prise là-bas se renvoie donc avec son lieu d'origine (`migration` de sa population, ou `visiteurs[].de`). Les visiteurs sont alors une estimation : l'effectif de la population d'origine multiplié par sa `part`.

## Les migrations qui comptent : l'hivernage

Un monde peut faire partir ses bêtes pour de bon. C'est une règle du moteur, `hivernage`, éteinte par défaut :

```json
"regles": { "hivernage": { "actif": 1 } }
```

- `actif: 0` (le défaut) : le monde calcule les routes, `collectif.js` les publie, personne ne bouge. Un monde tourne alors au caractère près comme avant cette règle.
- `actif: 1` : la part calculée part vraiment. `actif: 0.5` en fait partir la moitié.

La route est la même que celle qu'on publie : le moteur la calcule (`Orvane.routeHiver`) et `collectif.js` la lit. Ses seuils sont dans `REGLES.hivernage` : `rude`, `marge`, `min`, `part_min`, `part_max`, les masses minimales, et les trois fenêtres de l'année. Une mer ne se traverse qu'en volant, en nageant ou en dérivant (docs/31).

**Le départ.** Pendant la fenêtre du départ (de 0,78 à 0,88 de l'année : 12 cycles dans une année de 120), une petite part s'en va à chaque cycle. Au bout de la fenêtre, la part prévue est partie. Les bêtes emportent leurs gènes, comme tout migrant.

**L'hiver au loin.** Là-bas, les bêtes mangent la place du lieu d'hiver, y font des petits, y sont chassées et y tombent malades. Leur population d'accueil publie la part d'entre elles venue d'ailleurs :

```json
{ "biome": "taiga", "effectif": 1138, "hivernants": { "toundra": 0.59 } }
```

Les petits nés là-bas comptent comme hivernants : ils partiront avec leurs parents. Toute autre arrivée dilue cette part.

**Le retour.** Pendant la fenêtre du retour (de 0,12 à 0,22), les hivernants rentrent chez eux, une part égale à chaque cycle. Au dernier cycle de la fenêtre, tous sont partis. Un hivernant attardé hors des trois fenêtres rentre tout de suite. Si son pays a disparu, il reste.

**Ce que cela change ailleurs.**
- Les événements : une `migration` au premier cycle du départ (« la migration d'automne commence : ≈ 1 981 bêtes partent hiverner vers Taïga »), une au premier cycle du retour. Les allers et retours ne font ni installation, ni extinction, ni explosion, ni effondrement.
- La séparation des lignées : les hivernants comptent comme un flux de gènes. Une population d'hiver ne devient pas une lignée à part : elle repart.
- Les visiteurs (`biomes[].visiteurs`) : quand le monde a des hivernants, ce sont eux qu'on compte, et non plus une estimation.
- Par parcelles (docs/15) : chaque parcelle a sa route, vers une parcelle d'un autre lieu. La vue par biome additionne les hivernants de ses parcelles, par biome d'origine.

L'hivernage ne tire rien au hasard. Il n'use pas les tirages du cycle : un même monde fait les mêmes allers et retours.

Les seuils d'un monde (`monde.regles.hivernage`) valent aussi pour ce que publie `collectif.js` : la route qu'un jeu lit est celle que les bêtes prennent.

### Dans le monde d'Orvane (6 novembre)

Le monde d'Orvane a l'hivernage actif depuis le 6 novembre, avec un seuil plus haut : `"hivernage": { "actif": 1, "rude": 0.85 }`.

Pourquoi un seuil plus haut ? Les saisons d'Orvane sont douces (± 0,15 de température) et 92 % de ses bêtes sont trop petites pour partir. Avec le seuil par défaut (l'hiver vaut moins des trois quarts de l'été), seules 20 lignées migraient, 2 600 bêtes, 0,03 % de la biomasse animale : le mécanisme ne se voyait pas. À 0,85, un hiver qui retire 15 % de la place suffit.

Un essai, du cycle 44 au cycle 204 (une année entière et un peu plus), le même monde avec et sans hivernage :

| | sans | avec (`rude` 0,85) |
| --- | --- | --- |
| lignées qui migrent | 0 | 22 |
| hivernants au plus fort de l'automne | 0 | ≈ 44 000 |
| événements de saison | 0 | 22 départs, 16 retours |
| bêtes vivantes, un an plus tard | 96,7 millions | 98,0 millions (+ 1,4 %) |
| lignées, un an plus tard | 256 | 256 |
| extinctions de population dues aux allers et retours | — | 0 |

Les plus grands voyageurs sont des bêtes de la mer froide qui hivernent en haute mer : 18 000 ouorren, 17 000 firvi, 13 000 rencorki. Sur terre, d'autres gagnent la forêt, la montagne, la prairie ou la lande. Au printemps, environ la moitié rentre : l'hiver a pris les autres. Sans le voyage, il en aurait pris davantage : un an plus tard, le monde compte 1,4 % de bêtes en plus.

Une ligne du profil suffit à revenir en arrière : `"actif": 0`.

## Ce que voit le monde d'Orvane

Sur l'instantané du 4 novembre : 1 529 populations. 731 vivent en famille, 610 seules, 86 en bancs, 48 en bandes, 34 en meutes, 15 en troupeaux, 5 en volées. 42 migrent avec les saisons, de la taïga vers la montagne, de la montagne vers le maquis, de la mer froide vers la côte. Cela ajoute 183 Ko à l'instantané (5,6 %).

## Ce que le banc vérifie

`bancs/collectif.js`, en quelques secondes :
- **Rien ne change.** Décrire rend un nouvel instantané ; le monde éveillé tourne comme l'autre, au caractère près.
- **Qui vit comment.** Le loup en meute menée par un couple dominant ; le renne en troupeau, le hareng en banc, la fourmi en colonie autour d'une reine ; l'ours seul, la taupe en famille.
- **La taille et la hiérarchie.** Des rennes plus sociables font de plus grands troupeaux ; la gazelle chassée se serre ; la meute affamée est plus hiérarchisée que la repue ; le renne paît avec le caribou et le bœuf musqué, pas la gazelle avec le cerf qui vit la nuit.
- **Les migrations.** Le renne de la toundra hiverne en taïga ; il part, passe l'hiver, revient ; la taïga voit ses visiteurs ; ni la taupe, ni le bœuf musqué (son hiver n'est pas rude), ni le hareng ne migrent.
- **Le monde d'Orvane.** Ce qu'il publie, et ce que cela pèse.
- **L'hivernage qui compte.** Éteint, le monde tourne au caractère près comme sans la règle. Allumé, les rennes partent à la fin de l'automne : la taïga en compte 1 138, dont 59 % venus de la toundra (598 sans la règle). Au printemps, ils rentrent : plus un hivernant à la fin du retour. Les événements sont des migrations d'automne et de printemps, pas des extinctions. Passer l'hiver au doux sauve des bêtes : 179 rennes à la sortie de l'hiver, contre 115 sans la règle. La taupe, le bœuf musqué, le loup et le hareng ne partent pas. Le tout est déterministe.
- **Par parcelles.** La taïga de deux parcelles compte 72,5 % d'hivernants venus de la toundra : par biome, non par parcelle. Un jeu lit 290 rennes de la toundra, comptés.

## Ce qui reste ouvert

- **Des routes plus longues.** Un hivernant ne va qu'au voisin. Une route à plusieurs étapes (la grue qui traverse un continent) demanderait de chercher plus loin.
- **Des migrations pour d'autres raisons.** La saison sèche plutôt que l'hiver ; la ponte (le saumon qui remonte la rivière).
- **Des groupes que les joueurs défont.** Une meute dont on tue le couple dominant se disperse ; un troupeau harcelé se fractionne (la méfiance, docs/12, en est le début).
- **Les routes sur la carte.** Un monde par parcelles pourrait dire le chemin, parcelle par parcelle.
