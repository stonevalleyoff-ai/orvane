# 20. Les catalogues ouverts : un monde qui n'est pas la Terre

Jusqu'ici, tous les mondes d'Orvane étaient faits de la même étoffe : cinq axes de biome (la température, l'humidité, l'altitude, la lumière, le couvert), les traits du moteur (un cuir épais, des pattes longues, une glande irritante), ses organes et ses cinq formes de corps. Un monde pouvait avoir ses biomes, pas sa nature. Maintenant, un monde porte son propre catalogue : des axes, des traits, des organes et des formes de corps à lui. Ils s'ajoutent à ceux du moteur et vivent par les mêmes règles. Une forêt de cristal, une mer de brume, une bête qui crache des braises sont possibles. C'est le troisième des quatre points qui rendent Orvane universel.

## Le catalogue propre d'un monde

`catalogue.monde`, dans l'instantané. Lumen, le monde imaginaire du banc (`bancs/lumen/catalogue.json`), en donne un exemple :

```json
"monde": {
  "nom": "Lumen",
  "axes": { "magie": { "nom": "magie", "effet": "la sève de cristal qui imprègne l'air, le sol et l'eau" } },
  "traits": {
    "souffle-de-braise": { "domaine": "offense", "organe": "glande à braise", "cout": 0.2, "effet": "crache une gerbe de braises à trois longueurs de corps", "chasse": 1.3,
                           "conduite": { "type": "riposte-distance", "effet": "brulure", "portee": 3, "recharge": 8, "presage": "la gorge rougeoie" } },
    "luminescence":      { "domaine": "social", "organe": "photophores", "cout": 0.05, "effet": "brille dans le noir : attire les partenaires, et les chasseurs", "attrait": 1.6, "vulnerabilite": 1.25 }
  },
  "organes": { "tentacules": { "places": ["tete", "avant"], "nombre": [2, 8], "formes": ["lisses", "a-ventouses"], "fonction": "saisie", "mot": ["tentacule", "tentacules"], "fem": 0, "poids": 1 } },
  "formes": { "radiaire": { "nom": "radiaire", "pattes": 5, "depuis": ["hexapode", "quadrupede"], "chance": 0.5 } }
}
```

**Les axes.** Un axe de biome de plus, de 0 à 1. Chaque biome du monde lui donne une valeur (`biomes[].axes.magie`), et il compte dans la niche comme les cinq du moteur. Une lignée qui se sépare dans un biome prend sa valeur sur l'axe. Elle vit ensuite d'autant moins bien ailleurs que l'écart est grand.

**Les traits.** Un trait du monde a le même vocabulaire que ceux du moteur (`moteur/catalogue.js`) :
- `domaine`, `organe`, `effet` et `cout` (ce que le trait coûte en petits) ;
- `ecarts` et `fixe` (ce qu'il change au plan) ;
- `vulnerabilite` et `chasse` (dans la chaîne alimentaire), `resistance` (aux maladies) ;
- `conduite`, avec le vocabulaire de docs/7 ;
- `exige` et `exclut`, `heredite`, `attrait` ;
- `fournit` ;
- `flore`, ce que le trait fait devant les plantes (docs/17) : `portee` (la hauteur atteinte, en part de la taille), `haut` (atteindre les arbres), `toxique` et `epineux` (la part des défenses qu'il supporte).

Les traits du monde apparaissent par mutation, comme ceux du moteur, et la sélection fait le reste. Un trait du monde ne remplace jamais un trait du moteur : le même nom a la même biologie dans tous les mondes. C'est ce qui permet à un traducteur de reconnaître un trait d'un monde à l'autre, et à deux mondes de fusionner.

**Les organes.** Un type d'organe du monde se décrit comme ceux de `catalogue.organes` (docs/11) :
- `places` : la tête, le dos, les flancs, la queue ou l'avant ;
- `nombre` : le nombre d'organes, au moins et au plus ;
- `formes`, `fonction` ;
- `mot` et `fem` : comment le dire ;
- `conduite`, en option ;
- `poids` : sa chance d'apparaître sur une silhouette, 0,8 par défaut (les cornes en ont 1).

**Les formes de corps.** Une forme du monde a :
- `nom` ;
- `pattes` : de 0 à 12 ;
- `depuis` : les formes dont elle peut naître ;
- `chance`.

Une silhouette change très rarement de forme. Quand cela arrive, elle peut prendre une forme du monde qui naît de la sienne.

## Comment un monde reçoit le sien

- **Par sa genèse.** `node moteur/genese.js biomes.json --catalogue catalogue.json` : les ancêtres partent avec une niche sur les axes du monde, et ses traits, ses organes et ses formes peuvent apparaître dès les premiers cycles.
- **Par son profil.** `"monde": { …, "catalogue": "mondes/<id>/catalogue.json" }` : le cycle de nuit relit le fichier à chaque cycle. L'auteur du monde peut y ajouter un trait, un organe, une forme ou un axe quand il veut, et ce qui est déjà né reste.
- Un monde qui n'en a pas tourne exactement comme avant. Le monde d'Orvane n'en a pas.

## Ce qu'un jeu en fait

- **Il lit le catalogue du monde** dans l'instantané : `catalogue.monde`, et dans `catalogue.traits` la définition de chaque trait porté, ceux du monde compris. Un trait qu'il ne sait pas montrer, il peut le rendre d'après son `domaine`, son `effet` et sa `conduite`, ou l'ignorer.
- **Pour dessiner les silhouettes**, il étend `corps.js` du catalogue du monde, une fois, à la lecture de l'instantané :

```js
OrvaneCorps.etendre(inst.catalogue.monde);
OrvaneCorps.decrire(t.plan.corps);   // « radiaire à 5 pattes, oreilles, museau, deux antennes, une carapace sur le dos »
```

- **Il renvoie ses pressions comme avant** (docs/4). Les traits du monde sont des traits comme les autres pour le tampon.

## Ce que le banc vérifie

`bancs/catalogues.js`, en moins d'une minute, sur Lumen (`bancs/lumen/`). Lumen a sept biomes : la forêt de cristal, la plaine de cendres, les cavernes luisantes, les pics venteux, la mer de brume (un ciel, où ne vivent que les bêtes qui volent), le lac d'argent et le marais de spores. Il a aussi un axe de plus (la magie), cinq traits, deux organes et deux formes de corps.

- **Rien ne change pour les autres mondes.** Devant les plantes, les traits du moteur font ce qu'ils faisaient : leur effet est désormais écrit dans le catalogue (`flore`), et non plus dans le code de la flore. Un catalogue propre vide ne change rien.
- **L'axe compte.** Une lignée née dans la magie (niche 0,9) est posée dans deux biomes qui ne diffèrent que par elle. Au bout de 20 cycles, il en reste 1,3 % là où il n'y a pas de magie. Si l'axe n'est pas déclaré, il en reste 100 %.
- **La genèse de Lumen**, 600 cycles depuis les ancêtres du moteur, donne 42 lignées :
  - les 5 traits du monde sont apparus par mutation, et l'instantané publie leur définition ;
  - la luminescence, qui attire les partenaires autant que les chasseurs, pèse au moins 5 % chez 26 lignées sur 42. La sélection sexuelle l'emporte sur les prédateurs ;
  - 6 lignées ont des tentacules, une est devenue radiaire, une méduséenne ;
  - chaque lignée a sa niche sur l'axe de la magie.
- **La flore de Lumen** : 16 lignées de plantes, avec des arbres dans la forêt de cristal, des champignons dans les cavernes, des lichens et des herbes dans la mer de brume, des algues dans le lac.
  - Les traits du monde comptent devant elles : la peau de cristal supporte 70 % des épines, le mangeur de spores 80 % des toxines, et le voile de brume atteint les arbres.
  - Les brouteurs de Lumen se nourrissent des plantes de Lumen.
- **Le contrat.** L'instantané de Lumen respecte `schemas/instantane.schema.json`.
  - Un traducteur qui étend `corps.js` lit « radiaire à 5 pattes » là où, sans le catalogue, il lirait « quadrupède ».
  - Le cycle de nuit relit le catalogue du profil : un trait ajouté au fichier est dans le monde au cycle suivant.

```
node bancs/catalogues.js
```

## Ce qui reste ouvert

- **Un trait qui change la niche.** Aujourd'hui, un trait ne déplace pas l'optimum d'une lignée sur un axe : rien ne laisse une bête de la magie vivre sans elle. La suite : un champ `niche` (« sur l'axe de la magie, la niche glisse de −0,3 »).
- **D'autres milieux.** Un biome reste terrestre, aquatique, amphibie, marin, souterrain ou aérien. Un milieu nouveau (le vide, la lave) demanderait au monde de dire qui peut y vivre.
- **Les plantes et les machines du monde.** Ses formes de plantes, ses défenses, les modules de ses machines (docs/16, docs/17) sont encore ceux du moteur.
- **La fusion de deux mondes qui n'ont pas le même catalogue.** Les lignées qui arrivent devraient apporter leurs traits, leurs organes et leurs axes avec elles.
