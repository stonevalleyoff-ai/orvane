# 47. Les plantes sous le feu, et ce qu'elles font du lieu

Jusqu'ici, un incendie retirait de la capacité au lieu et des bêtes, mais pas un pied aux plantes (docs/17). Et le couvert d'un lieu ne suivait que ses brouteurs et ses joueurs, jamais ses arbres (docs/22). Maintenant, dans un monde à la succession éveillée, les catastrophes et le sec prennent des pieds aux plantes, l'herbe puis les buissons reprennent la place des arbres disparus, et le couvert d'un lieu suit ses arbres. Une forêt brûlée devient une clairière, puis un taillis, puis de nouveau une forêt. C'est la quatrième étape du chantier « flore, météo et saisons ».

`moteur/succession.js`. Il faut une flore (docs/17) ; le couvert ne suit les arbres que dans un monde au milieu éveillé (docs/22). Un monde qui ne l'a pas éveillée n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Elle n'a pas de hasard : les catastrophes gardent le leur.

## Les catastrophes prennent des pieds

Le cycle d'une catastrophe (docs/45 dit quand elles viennent), chaque plante du lieu perd une part de ses pieds, selon sa forme :

| forme | incendie | crue | sécheresse |
| --- | --- | --- | --- |
| arbre | 60 % | | 10 % |
| buisson | 70 % | 15 % | 15 % |
| herbe | 40 % | 20 % | 30 % |
| roseau | 50 % | | 30 % |
| lichen | 50 % | 20 % | 10 % |
| champignon | 30 % | 20 % | 30 % |
| succulente | 20 % | 30 % | |
| algue | | | 20 % |

La plante le dit douze cycles : `populations[].sinistre` (`type`, `cycle`, `part`). Dans un monde où les plantes ont leurs saisons (docs/46), son stade est `brule` les trois premiers cycles après un incendie.

## Le sec qui dure tue

Dans un monde à la météo éveillée (docs/45), un lieu où la sécheresse est installée (`meteo.secheresse` à 0,5 au moins) perd des pieds à chaque cycle : jusqu'à 6 % quand elle est à 1. Les succulentes et les lichens sont épargnés.

## La succession

Chaque forme de plante a sa place dans un lieu (docs/17). Quand des arbres ou des buissons manquent, rapportés à leur poids de l'éveil, la place qu'ils laissent libre profite aux pionnières :
- **l'herbe** prend 30 % de la place libre des buissons et des arbres ;
- **les buissons** prennent 20 % de celle des arbres.

L'herbe repousse vite (50 % par cycle), les buissons moins (30 %), les arbres lentement (25 %). L'herbe culmine donc la première, puis les buissons ; les arbres reviennent, la place libre se referme, et les pionnières reculent.

## Le couvert suit les arbres

Dans un monde au milieu éveillé (docs/22), le couvert d'un lieu perd la moitié de ce que ses arbres ont perdu : une forêt qui n'a plus que 40 % de ses arbres perd 30 % de son couvert. Il suit avec retard, comme le milieu suit ses bêtes, et revient avec eux.

- **La niche des bêtes** le sent : celles des sous-bois reculent, celles des lieux ouverts gagnent.
- **La nature du lieu** peut changer (docs/28) : une forêt assez ouverte devient une prairie, puis redevient une forêt.
- **La place des plantes ne le suit pas.** Elle se lit sur le couvert que le lieu aurait avec ses arbres. Sans cela, des arbres disparus perdraient leur place, et ne reviendraient jamais.
- L'événement `transformation` le dit : « Forêt : le couvert baisse de 0,73 à 0,68 (ses arbres ont disparu) », puis « (ses arbres reviennent) ».

## Le retour n'est pas garanti

L'herbe neuve attire les brouteurs, et les brouteurs retiennent les arbres : ils mangent les repousses, et les grands brouteurs ouvrent le couvert (docs/22). Dans le banc, la forêt brûlée met une centaine de cycles à se refermer. Un lieu très brouté peut rester ouvert longtemps.

## L'éveil

Chaque population de plante garde son poids du jour (`reference.succession`). Le jour de l'éveil, rien ne bouge : aucune place n'est libre, et le couvert est celui de ses arbres.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "flore": true, "milieu": true, "succession": true }
```

Au cycle de nuit suivant, la succession s'éveille, une fois pour toutes.

## Ce que le banc vérifie

`bancs/succession.js`, sur le monde d'Orvane :
- **Le jour un.** Un monde sans succession tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge : les mêmes bêtes, les mêmes plantes, les mêmes lieux.
- **Le feu.** Un incendie imposé prend 9 lieux, dont la forêt.
  - Il y reste 44 % des arbres, 35 % des buissons, 75 % de l'herbe (elle repousse dans le cycle).
  - Sans la succession, le même feu ne prend pas un arbre.
  - Un lieu que le feu n'a pas pris garde toutes ses plantes.
- **La succession**, 60 cycles après le feu, comparée au même monde sans feu sur les plantes :
  - l'herbe de la forêt monte à 197 % de son poids au cycle 9 ;
  - les buissons, à 213 % au cycle 23 ;
  - les arbres, tombés à 52 %, sont à 97 % au cycle 60 ;
  - le couvert de la forêt tombe de 0,85 à 0,59 au cycle 32, puis remonte à 0,64 au cycle 60.

Mesuré à part, sur 90 cycles : le couvert est revenu à 0,71, les arbres à 77 % de leur poids de l'éveil, et l'herbe comme les buissons reculent depuis le cycle 50.
- **Le sec qui dure.** 20 cycles secs imposés : il reste 79 % de l'herbe de la prairie, 94 % des succulentes du désert (les brouteurs, privés d'herbe, se reportent sur elles).
- **Sur la durée.** 50 cycles avec et sans la succession : les bêtes pèsent 99 % de ce qu'elles pèsent sans elle, les plantes 104 %, 185 lignées de bêtes contre 183.
- **Les parcelles, le contrat et le cycle de nuit.** Le feu prend parcelle par parcelle ; l'instantané et ses plantes respectent le schéma ; le profil éveille la succession une fois.

```
node bancs/succession.js            # environ 7 minutes
node bancs/succession.js --court    # moins de cycles
```

## Ce qui reste ouvert

- **Le gel.** Un gel tardif ne tue pas encore les fleurs, ni un hiver rude les pieds.
- **La neige.** Elle ne cache pas l'herbe aux brouteurs, et ne casse pas de branches.
- **Les graines dans le sol.** Une forme tout à fait disparue d'un lieu n'y revient que d'un voisin (la recolonisation, docs/22), pas d'une réserve de graines.
- **Des plantes faites pour le feu.** Une écorce épaisse, des graines qui germent après l'incendie : des défenses de plus, que la sélection pourrait trier (docs/17).
- **La flore ne se sépare pas encore par ses propres traits.** Hauteur, repousse, tenue au froid et au sec : l'étape suivante.
