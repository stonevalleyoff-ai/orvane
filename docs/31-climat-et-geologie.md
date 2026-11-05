# 31. Le climat et la géologie lente

Jusqu'ici, seuls les bêtes et les joueurs faisaient bouger les lieux (docs/22). Le monde, lui, ne changeait pas de lui-même : ni âge glaciaire, ni sécheresse longue, ni île nouvelle. Maintenant, dans un monde au climat éveillé, le monde entier se réchauffe et se refroidit, la mer baisse et remonte, et des volcans font des îles. C'est la deuxième étape de l'ouverture des domaines fermés.

`moteur/climat.js`. Un monde sans climat n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Le hasard du climat est le sien.

## Le climat

L'écart de température de tout le monde, depuis l'éveil du climat (`monde.climat.temperature`), suit trois choses :
- **un grand cycle glaciaire** de 1 500 cycles, à 0,08 près ;
- **un petit cycle** de 400 cycles, à 0,03 près ;
- **une marche au hasard**, qui revient lentement vers zéro.

À un cycle par heure, le premier âge glaciaire vient en trois semaines environ. Sur 125 jours, l'écart va de −0,23 à +0,06.

Chaque lieu le sent à sa façon :
- un lieu de terre le sent tout entier ;
- la mer, à moitié ;
- le sous-sol, au tiers.

**Le froid est sec.** L'humidité bouge de −0,5 fois la température.

Un lieu que le milieu transforme (docs/22) suit le climat avec retard, comme il suit ses bêtes. Les autres le suivent tout de suite. Tout le reste suit les axes : la niche de chaque lignée, la place des plantes (docs/17), la nature des lieux (docs/28). Une forêt refroidie peut devenir une taïga.

## La mer

**Quand le monde se refroidit sous −0,06**, la mer baisse. Jusqu'à trois ponts de terre émergent, chacun entre deux rivages d'une même mer qui n'étaient pas voisins. Des lignées les passent.

**Quand il se réchauffe au-dessus de −0,04**, la mer remonte et les ponts sombrent. Les rivages se séparent à nouveau, et les lignées qui ont passé le pont vivent désormais isolées de l'autre côté. C'est ainsi que naissent les espèces.

## Les volcans

Très rarement, une fois par millier de cycles environ et trois fois au plus, une île naît sous la mer, au large d'un rivage :
- **sa terre est d'abord pauvre** (5 % de la moitié de la place de son rivage), puis s'enrichit en 300 cycles ;
- **ses plantes viennent du rivage** : 5 % de chaque lignée de plantes du rivage dont la forme y pousse ;
- **seules les bêtes qui volent, nagent ou dérivent y passent** (les toutes petites, de 10 g au plus, sur des radeaux de branches). Elles la gagnent peu à peu : chaque cycle, 0,2 % de celles du rivage, ou de temps en temps un petit groupe de deux.

Une île est un lieu nouveau, qui dit son rivage dans `traversees`. Dans un monde par parcelles, c'est un type de lieu à elle, que le monde publié montre comme un biome.

## Ce qu'un jeu en fait

- **Les événements `climat`** : « le monde se refroidit : −0,06 de température depuis l'éveil du climat, un âge glaciaire », « la mer baisse : un pont de terre émerge entre Banquise et Côte », « un volcan sous la mer : une île naît au large de Côte, Île de cendre 1 ».
- **Les axes des lieux** : un jeu qui les lit (la neige, la sécheresse) voit le climat sans rien faire de plus.
- **Une île nouvelle** est un biome que le jeu ne connaît pas : il la montre comme le biome le plus proche, ou l'ignore.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "milieu": true, "climat": true }
```

Au cycle de nuit suivant, le climat s'éveille, une fois pour toutes. Le jour de l'éveil, rien ne bouge : le climat part de zéro.

## Ce que le banc vérifie

`bancs/climat.js`, en trois minutes, sur le monde d'Orvane :
- **Le jour un.** Un monde sans climat tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Le climat.**
  - Sur 3 000 cycles, un premier âge glaciaire au cycle 475.
  - Avec une onde de banc, la forêt passe de 0,5 à 0,35 de température et de 0,65 à 0,73 d'humidité. La mer n'en sent que la moitié.
  - Dans un monde au milieu transformé, le milieu suit avec retard.
- **La vie suit.** 40 cycles d'un âge glaciaire imposé (−0,12) : les populations dont le lieu convient mieux à leur niche pèsent 3,5 % de plus qu'au climat stable, celles dont il convient moins 6,5 % de moins.
- **La mer.** Elle baisse : un pont de terre émerge entre la banquise et la côte, et une lignée le passe. Elle remonte : le pont sombre.
- **Les îles.**
  - Une île naît au large de la côte, sa terre d'abord pauvre, une lignée de plantes du rivage y pousse.
  - 25 cycles après, sa terre est mûre, et deux lignées l'ont gagnée, toutes deux à la nage.
- **Les parcelles, le contrat et le cycle de nuit.**
  - Dans un monde par parcelles, l'île est un type de lieu publié.
  - L'instantané respecte le schéma, et le profil éveille le climat une fois.

```
node bancs/climat.js
```

## Ce qui reste ouvert

- **Des climats par région.** Aujourd'hui, tout le monde se refroidit ensemble. Un pôle qui gèle plus vite que l'équateur attendra une géographie.
- **La mer qui monte.** Au chaud, la mer pourrait noyer des côtes et couper des ponts naturels.
- **Les catastrophes du climat.** Des sécheresses qui font brûler, des crues au dégel.
