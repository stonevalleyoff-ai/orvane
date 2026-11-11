# 45. La météo : le temps qu'il fait

Jusqu'ici, il n'y avait rien entre la saison et la catastrophe. La saison est une courbe lisse : deux étés se ressemblent au caractère près. La catastrophe est rare. Maintenant, dans un monde à la météo éveillée, chaque lieu a son temps du cycle : il pleut, il neige, il gèle, un orage éclate, une canicule s'installe. Dans un monde par parcelles (docs/15), chaque parcelle a le sien. C'est la première étape du chantier « flore, météo et saisons ».

`moteur/meteo.js`. Un monde sans météo n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Le hasard de la météo est le sien.

## Le temps d'un lieu

Chaque cycle, chaque lieu a deux écarts autour de sa saison :
- **la chaleur** (`t`) : 0, la température de saison ; +1, un cycle nettement chaud ; −1, nettement froid ;
- **l'eau** (`e`) : 0, un temps de saison ; +1, un cycle nettement arrosé ; −1, nettement sec.

Ces écarts tournent autour de ±0,5 et ne passent jamais ±1,6. Ils viennent de trois choses :
- **le souvenir** : un lieu garde 70 % de son temps de la veille. Un temps sec dure ;
- **les voisins** : la moitié de ce souvenir vient de ses voisins. Le temps passe d'une parcelle à l'autre ;
- **le tirage du cycle**, mêlé à celui des voisins : le temps neuf arrive par fronts, non lieu par lieu.

De là viennent :
- **le vent** (`vent`, de 0 à 1) : l'écart d'eau avec les voisins. Il souffle là où un front passe ;
- **la neige au sol** (`neige`, de 0 à 1) : elle s'épaissit quand il neige, et fond dès que la température du cycle passe 0,22 ;
- **la sécheresse** (`secheresse`, de 0 à 1) : une moyenne glissante du manque d'eau. Au-dessus de 0,5, elle est installée. Douze cycles de pluie l'effacent ;
- **les eaux** (`eaux`, de 0 à 1) : une moyenne glissante de la pluie, plus la neige qui fond d'un coup.

**Qui n'a pas de temps.** Le sous-sol et la mer sans lumière (les abysses). Un lieu peut aussi le refuser : `"meteo": false`.

**Ce que chaque milieu en sent.** La terre et les rives, tout ; l'eau douce, 70 % ; la mer, la moitié ; un ciel, 120 %.

## Le temps nommé

| `temps` | quand |
| --- | --- |
| `clair` | un temps sec ou de saison, sans rien de plus |
| `couvert` | un peu plus d'eau que la saison, sans pluie |
| `pluie` | un écart d'eau de 0,35 au moins |
| `orage` | un écart d'eau de 0,9 au moins, dans un lieu assez chaud |
| `neige` | la même eau, quand la température du cycle est sous 0,22 |
| `gel` | un temps sec, sous 0,22 |
| `canicule` | un temps sec et chaud, au-dessus de 0,78 |
| `tempete` | de la pluie ou de la neige sous un vent de 0,55 au moins |
| `brouillard` | un lieu humide, un peu d'eau, plus frais que la saison |

D'autres temps pourront venir. Un jeu qui n'en connaît pas un le montre comme `couvert`.

## Ce que le temps fait au monde

- **Les axes du cycle.** Un écart de chaleur de 1 déplace la température du lieu de 0,06 ; un écart d'eau de 1, son humidité de 0,05. La niche de chaque lignée le sent, comme elle sent la saison.
- **La production du cycle** (`production`), qui multiplie celle de la saison :
  - la pluie nourrit une terre sèche (jusqu'à +12 % par écart) et noie un peu une terre gorgée d'eau ;
  - un coup de chaud nourrit une terre froide (jusqu'à +8 % par écart) et brûle une terre chaude ;
  - la mer n'en sent presque rien.
  - Elle est de moyenne 1 : sur l'année, la place de chacun ne se déplace pas. Elle reste entre 0,6 et 1,4.
- **Les catastrophes ont une cause.** Sans la météo, un incendie, une crue ou une sécheresse est un tirage, pesé par le sol et la saison. Avec elle, le temps des cycles passés pèse aussi :
  - la chance d'un **incendie** et d'une **sécheresse** suit le sec qui dure (`secheresse`). Sans manque d'eau, rien ne brûle ;
  - la chance d'une **crue** suit les eaux qui montent (`eaux`) : après les pluies, ou après le dégel ;
  - chacune est rapportée à sa moyenne : les catastrophes viennent aussi souvent qu'avant, mais au bon moment. Une chance ne dépasse jamais six fois ce qu'elle était ;
  - l'événement le dit : « incendie : le feu court dans le couvert, après un temps sec », « crue : les eaux montent, après le dégel ».
  - Un lieu sans temps (une grotte) garde ses tirages d'avant.

Les routes de l'hiver (docs/38) se décident sur la saison, pas sur le temps du cycle. Les plantes ne sentent pas encore le temps (plus bas).

## Ce qu'un jeu en fait

```json
"biomes": [{ "id": "foret", …, "meteo": { "temps": "pluie", "t": -0.49, "e": 0.41, "vent": 0.19, "production": 1.007,
                                           "temps_parts": { "couvert": 0.285, "pluie": 0.715 } } }],
"parcelles": [{ "id": "foret~2", "type": "foret", …, "meteo": { "temps": "pluie", "t": -1.17, "e": 0.37, "vent": 0.19, "secheresse": 0.16, "eaux": 0.21, "production": 0.996 } }]
```

- **Par biome** (`biomes[].meteo`) : dans un monde par parcelles, c'est le temps moyen de ses parcelles, pesé par leur capacité. `temps` est le plus répandu, et `temps_parts` dit la part de chacun quand elles diffèrent.
- **Par parcelle** (`parcelles[].meteo`) : le temps de chacune. Un jeu qui joue une parcelle y lit sa pluie à lui.
- **Les événements `meteo`**, quatre au plus par cycle, les plus forts d'abord : « une tempête passe », « une canicule s'installe », « les premières neiges tiennent au sol », « le sec dure : une sécheresse s'installe ». Plusieurs parcelles d'un même biome n'en font qu'un : « une tempête passe (3 parcelles) ».
- **Sans rien lire de plus** : les effectifs et la nourriture des bêtes suivent déjà le temps.

Un cycle est un pas du monde (docs/19). Dans un monde au jour, le temps publié est celui de la journée. Un jeu qui veut une pluie d'une heure la tire lui-même, autour de ce temps-là.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "annee": 120, "meteo": true }
```

Au cycle de nuit suivant, la météo s'éveille, une fois pour toutes. Le jour de l'éveil, rien ne bouge : tous les lieux ont le temps de leur saison. Elle marche aussi dans un monde sans année ; il n'a alors que le temps, sans saisons.

## Ce que le banc vérifie

`bancs/meteo.js`, sur le monde d'Orvane :

- **Le jour un.** Un monde sans météo tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge : 22 lieux ont un temps, partout celui de la saison. La grotte et les abysses n'en ont pas.
- **Le temps**, sur les 152 parcelles du monde qui en ont un, 480 cycles (quatre ans) :
  - l'eau et la chaleur s'écartent de la saison de ±0,52 ;
  - le temps dure : d'un cycle au suivant, l'écart d'eau d'une parcelle se retrouve à 53 % ;
  - il passe par fronts : deux parcelles voisines ont le même temps à 48 %, deux parcelles éloignées à 2 % ;
  - tous les temps viennent : clair 44 %, couvert 20 %, pluie 16 %, brouillard 4,6 %, gel 3,8 %, tempête 3,6 %, neige 3,1 %, canicule 3 %, orage 1,6 %. Jamais de neige dans un lieu chaud, ni de canicule dans un lieu froid ;
  - le même monde a le même temps, quel que soit l'ordre de ses lieux ; une autre graine, un autre temps.
- **La neige et le sec.**
  - La neige tient au froid : la banquise et les sommets en ont 91 % des cycles, la toundra 69 %. La jungle, le désert et la savane, jamais. Aucune ne passe le cœur de l'été d'un lieu tempéré.
  - Une sécheresse est installée 2,8 % du temps.
  - Douze cycles secs sur une prairie : la sécheresse monte de 0,13 à 0,86. Douze cycles de pluie, il n'en reste rien.
- **Les catastrophes.**
  - Sur 480 cycles, elles gardent leur fréquence : l'incendie à 99 % de ce qu'elle était, la crue à 100 %, la sécheresse à 102 %.
  - Les eaux montent après les pluies (97 % des fois) ou après le dégel (3 %).
  - 24 cycles secs imposés, les catastrophes vingt fois plus probables : 30 incendies, 86 sécheresses, aucune crue. 24 cycles de pluie : 23 crues, ni feu ni sécheresse.
- **La production.**
  - Sur 720 cycles, la production moyenne de chaque sorte de lieu reste à 1 (le plus loin : la savane, 0,994).
  - Elle bouge le plus dans les terres sèches et chaudes (de 0,75 à 1,28), à peine au large (de 0,99 à 1,01).
- **La vie suit.**
  - 25 cycles d'un temps sec et chaud imposé, ou arrosé : dans les terres sèches, les brouteurs pèsent 21 % de moins au sec.
  - 60 cycles avec et sans météo : les bêtes pèsent 105 % de ce qu'elles pèsent sans elle, 184 lignées contre 184.
- **Les parcelles, le contrat et le cycle de nuit.**
  - Dans un monde par parcelles, chaque parcelle a son temps, et le biome publié celui de ses parcelles.
  - L'instantané respecte le schéma, par biome et par parcelles, et le profil éveille la météo une fois.

```
node bancs/meteo.js            # environ 7 minutes
node bancs/meteo.js --court    # environ 2 minutes
```

## Ce qui reste ouvert

- **Les catastrophes et les plantes.** Fait (docs/47), dans un monde à la succession éveillée.
- **Une grotte qui brûle.** Les lieux sans temps gardent leurs tirages d'avant, et une grotte au couvert dense peut encore y tirer un incendie.
- **Les plantes et le temps.** Fait pour la saison et la pousse (docs/46) et pour le sec qui dure (docs/47). Reste le gel.
- **Le temps dans les kits et dans Lisière.** Les kits Unity et Godot ne le lisent pas encore ; dans Lisière, la pluie pourrait menacer le feu.
- **Le vent qui porte.** Les graines, les bêtes qui volent, les souches pourraient suivre les fronts.
- **Des climats par région.** Comme le climat (docs/31), la météo n'a ni pôles ni équateur autres que ceux des axes des lieux.
