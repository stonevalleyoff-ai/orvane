# 28. Les lieux qui changent de nature

Depuis le milieu transformé (docs/22), les axes d'un lieu bougent : des brouteurs ou des joueurs ouvrent une forêt, des barrages noient une rive, un lac qu'on assèche baisse. Mais une forêt rasée restait une forêt, de nom et de milieu. Maintenant, un lieu dont les axes ressemblent plus à un autre type de lieu qu'à ce qu'il était en prend la nature. Et un lieu qui ne ressemble à rien de connu en invente une. C'est la cinquième étape de la phase 2 ter.

`moteur/natures.js`. Un monde qui ne l'a pas éveillé n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Ce qui change de nature

Chaque cycle, après le milieu, chaque lieu se compare à tous les types de lieux du monde :
- **sa nature d'origine** se mesure à ce qu'il était (une parcelle n'est jamais tout à fait son biome) ;
- **les autres** se mesurent à leur type ;
- **la distance** porte sur les axes : la température, l'humidité et le couvert comptent pleinement, l'altitude à moitié, la lumière pour un tiers (elle suit le couvert).

Un lieu prend la nature d'un autre type quand il en est plus près que de la sienne, d'un écart de 0,04 au moins. Cet écart évite les allers-retours à la frontière.

| ce que font les bêtes ou les joueurs | ce que devient le lieu |
| --- | --- |
| une forêt défrichée (le couvert à 0,2) | une prairie |
| une prairie desséchée | une steppe |
| un lac asséché à moitié | une côte : l'eau baisse |
| un lac asséché tout à fait | une côte, puis une steppe : l'eau s'est retirée |
| les joueurs partis, le milieu revenu | la forêt redevient une forêt, le lac un lac |

**Le milieu change un pas à la fois** : de l'eau à la rive, de la rive à la terre, et retour. La mer, le sous-sol et le ciel gardent le leur. Un lieu qui change de milieu change de vie : un lac devenu côte ne porte plus ses poissons, qui y tombent de moitié en six cycles.

**Il prend aussi les saisons de sa nouvelle nature.** Le reste suit déjà ses axes : la niche de chaque lignée, la place des plantes (docs/17).

## Une nature que le monde ne connaissait pas

Un lieu loin de tous les types connus (à plus de 0,2 du plus proche et de ce qu'il était) en invente un. S'il peut s'approcher d'un type connu en changeant de milieu pas à pas, il fait d'abord ce pas. Le nom vient du type le plus proche, et de l'axe qui s'en écarte le plus :
- un volcan reboisé et irrigué devient une « jungle haute » ;
- un désert irrigué devient une « savane humide ».

La nature inventée est gardée parmi les types du monde, avec ses axes, son milieu et ses saisons. D'autres lieux pourront la rejoindre. Un monde invente 30 natures au plus.

## Ce qu'un jeu en fait

Un lieu qui a changé de nature le dit :

```json
"nature": { "type": "prairie", "nom": "Prairie", "depuis": 412 }
"nature": { "type": "jungle-haute", "nom": "Jungle haute", "depuis": 430, "inedite": true }
```

- Son `milieu` et ses `saisons` sont ceux de sa nouvelle nature.
- Absent, le lieu est de sa nature d'origine.
- **Un monde par parcelles** (docs/15) : le biome publié dit la part de ses parcelles qui ont changé de nature. Par exemple `"natures": [{ "type": "prairie", "nom": "Prairie", "part": 0.29 }]`. Un jeu peut montrer une forêt trouée de clairières.
- L'événement est `nature` : « Forêt devient une prairie », « Lac redevient un lac : l'eau le recouvre ».
- Les types de lieux du monde, ceux d'origine et ceux qu'il a inventés, sont dans `monde.natures.types`.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "milieu": true, "natures": true }
```

Au cycle de nuit suivant, après le milieu, les lieux peuvent changer de nature, une fois pour toutes. Le jour de l'éveil, chacun est de sa nature.

## Ce que le banc vérifie

`bancs/natures.js`, en moins de deux minutes, sur le monde d'Orvane :
- **Le jour un.** Un monde qui ne l'a pas éveillé tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Les natures.**
  - Des joueurs défrichent et assèchent : la forêt devient une prairie, la prairie une steppe, le lac une côte.
  - Six cycles après, le lac devenu côte a moitié moins de bêtes qui ne font que nager qu'un lac asséché d'autant qui serait resté un lac.
  - Il prend les saisons de sa nouvelle nature.
  - Un lac asséché tout à fait change de milieu un pas à la fois : une côte, puis une steppe.
- **L'inédit.** Un volcan reboisé et irrigué devient une jungle haute, et la nature inventée est gardée.
- **La marge et le retour.**
  - À la frontière, un peu plus près d'une prairie que d'une forêt, la forêt reste une forêt.
  - Les joueurs partis, la forêt redevient une forêt et le lac un lac.
- **Les parcelles.**
  - Le jour de l'éveil, aucune parcelle ne change de nature.
  - Une parcelle de la forêt défrichée : la forêt publiée en dit la part devenue prairie.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil éveille les natures une fois.

```
node bancs/natures.js
```

## Ce qui reste ouvert

- **Le climat.** Aujourd'hui, seuls les bêtes et les joueurs font bouger les axes. Un climat qui dérive (un âge glaciaire, une sécheresse longue) changerait des continents entiers de nature.
- **Les catastrophes de chaque nature.** Une forêt devenue savane devrait brûler comme une savane.
- **Le sous-sol et la mer.** Une grotte qui s'effondre, un récif qui meurt, attendront.
