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

**Les bêtes restent comptées chez elles.** Le moteur ne les déplace pas : la place de l'hiver est déjà dans ses comptes (la saison, la niche, les routes apprises). Une bête prise là-bas se renvoie donc avec son lieu d'origine (`migration` de sa population, ou `visiteurs[].de`).

## Ce que voit le monde d'Orvane

Sur l'instantané du 4 novembre : 1 529 populations. 731 vivent en famille, 610 seules, 86 en bancs, 48 en bandes, 34 en meutes, 15 en troupeaux, 5 en volées. 42 migrent avec les saisons, de la taïga vers la montagne, de la montagne vers le maquis, de la mer froide vers la côte. Cela ajoute 183 Ko à l'instantané (5,6 %).

## Ce que le banc vérifie

`bancs/collectif.js`, en quelques secondes :
- **Rien ne change.** Décrire rend un nouvel instantané ; le monde éveillé tourne comme l'autre, au caractère près.
- **Qui vit comment.** Le loup en meute menée par un couple dominant ; le renne en troupeau, le hareng en banc, la fourmi en colonie autour d'une reine ; l'ours seul, la taupe en famille.
- **La taille et la hiérarchie.** Des rennes plus sociables font de plus grands troupeaux ; la gazelle chassée se serre ; la meute affamée est plus hiérarchisée que la repue ; le renne paît avec le caribou et le bœuf musqué, pas la gazelle avec le cerf qui vit la nuit.
- **Les migrations.** Le renne de la toundra hiverne en taïga ; il part, passe l'hiver, revient ; la taïga voit ses visiteurs ; ni la taupe, ni le bœuf musqué (son hiver n'est pas rude), ni le hareng ne migrent.
- **Le monde d'Orvane.** Ce qu'il publie, et ce que cela pèse.

## Ce qui reste ouvert

- **Des migrations qui comptent.** Les bêtes pourraient vraiment partir : la part qui migre irait au lieu d'hiver, y mangerait et y serait chassée. Cela changerait l'équilibre du monde ; il faudra un banc de stabilité.
- **Des groupes que les joueurs défont.** Une meute dont on tue le couple dominant se disperse ; un troupeau harcelé se fractionne (la méfiance, docs/12, en est le début).
- **Les routes sur la carte.** Un monde par parcelles pourrait dire le chemin, parcelle par parcelle.
