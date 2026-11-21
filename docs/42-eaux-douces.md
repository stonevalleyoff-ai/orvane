# 42. Les eaux douces

Le monde d'Orvane avait peu de vie en eau douce. Avant ce chantier, son lac comptait 12 lignées, sa rivière 10, contre 121 pour la prairie. La mer d'Orvane (docs/14) y avait versé quelques poissons de rivière, mais la plupart n'avaient pas tenu.

Les eaux douces ont eu leur propre genèse, sur dix lieux d'eau, dont sept que le monde n'avait pas. Elles rejoignent le monde d'Orvane comme un continent, par trois ponts (docs/23).

## Dix lieux d'eau

`mondes/eaux-douces/biomes.json` :

| lieu | milieu | ce qu'il est | nouveau pour Orvane |
| --- | --- | --- | --- |
| Torrent | aquatique | froid, haut, clair, rapide ; des saisons fortes | oui |
| Rivière | aquatique | celle d'Orvane | |
| Lac | aquatique | celui d'Orvane | |
| Lac profond | aquatique | froid et sombre, presque sans saisons | oui |
| Étang | aquatique | tiède, peu profond, envahi d'herbiers | oui |
| Marais | amphibie | celui d'Orvane | |
| Roselière | amphibie | un couvert dense de roseaux | oui |
| Delta | amphibie | chaud, bas, où la rivière se divise | oui |
| Sources chaudes | aquatique | une eau chaude toute l'année | oui |
| Grotte inondée | aquatique | sans lumière, sans saisons | oui |

Ils se tiennent comme un réseau : le torrent descend vers la rivière, le lac profond et les sources chaudes. La rivière rejoint le lac, l'étang, le marais, le delta et la grotte inondée. Le lac donne sur la roselière.

## Dix-sept ancêtres

`mondes/eaux-douces/ancetres.json` :
- **dans l'eau** : des bancs de vairons, un brouteur des pierres, un fouilleur des vases (une carpe), un embusqué des herbiers (un brochet), le grand moustachu (un silure de 30 kg), une anguille, une écrevisse, un nageur à élytres (un insecte qui nage et vole), un triton, une tortue des étangs, un planorbe (un escargot), une hydre ;
- **sur les rives** : un guetteur des roseaux (un héron), un barboteur (un canard), une loutre, un bâtisseur des berges (un castor), une flèche bleue (un martin-pêcheur).

**Pas de filtreur.** Un premier essai partait aussi d'une moule. Elle a fait 52 des 70 lignées, présentes partout : les filtreurs ne pèsent que 30 % sur la place d'un lieu, et la règle de rareté ne garde que les lignées nombreuses. Sans la moule, la genèse garde ses chasseurs et ses brouteurs.

## La genèse

```
node moteur/genese.js mondes/eaux-douces/biomes.json --ancetres mondes/eaux-douces/ancetres.json \
  --cycles 1200 --graine 31 --lignees 90 --rarete 0.0001 \
  --regles '<les règles de la mer d'Orvane : mondes/marin/amorce.json, monde.regles>' \
  --nom "Les eaux douces" --sortie mondes/eaux-douces/amorce.json
```

Les règles sont celles de la mer d'Orvane, avec sa séparation facile (`flux` 0,25) : une eau reçoit toujours des migrants. L'amorce publiée est née de la genèse de la PR « la rareté jugée lieu par lieu » (docs/13, PR #7). La genèse de `main` donne, à la même graine, 54 lignées au lieu de 60, aussi variées.

**Ce qui en est sorti** : 60 lignées et 13,9 millions de bêtes.
- 29 omnivores, 20 carnivores, 10 herbivores, 1 charognard ;
- 51 poissons, 7 quadrupèdes (les filles du castor, de la loutre et de la tortue), un canard, une écrevisse. Le héron, le martin-pêcheur, le triton, l'hydre et l'insecte nageur n'ont pas tenu ;
- de 11 lignées (la grotte inondée) à 29 (la rivière) par lieu ;
- des bêtes de 10 g à 57 kg (un grand chasseur des roselières).

## Dans le monde d'Orvane

Le profil commande la fusion, une fois :

```json
{ "id": "eaux-douces", "nom": "les eaux douces", "source": "mondes/eaux-douces/amorce.json",
  "ponts": [["lac", "lac"], ["riviere", "riviere"], ["marais", "marais"]] }
```

Les trois ponts relient un lac à un lac, une rivière à une rivière, un marais à un marais. Un lieu que les deux mondes ont en commun prend les voisins des deux côtés : un jeu qui joue le lac y voit les deux faunes.

Un essai, sur l'état du monde d'Orvane au cycle 44, puis 40 cycles :

| | avant | 10 cycles après | 40 cycles après |
| --- | --- | --- | --- |
| lignées dans les parcelles du lac d'Orvane | 12 | 20 (8 des eaux douces) | 20 |
| … de la rivière | 10 | 22 (11 des eaux douces) | 22 |
| … du marais | 47 | 57 (9 des eaux douces) | 58 |
| bêtes du lac d'Orvane | 0,78 million | 1,08 million | 1,96 million |
| lignées du monde | 301 (avant la fusion : 241) | 303 | 305 |

Vu par biome (ce que lit un jeu), au bout de 40 cycles : 33 lignées au lac, 40 à la rivière, 68 au marais. Les sept lieux nouveaux comptent de 11 à 25 lignées chacun. Le lac d'Orvane, presque vide, se remplit : la place y était. Le nombre de lignées du monde ne baisse pas.

Les plantes des eaux douces (23 lignées) sont refaites à l'arrivée, à l'équilibre avec leurs bêtes (docs/17).

## Pour un jeu

Les sept lieux nouveaux (`torrent`, `lac-profond`, `etang`, `roseliere`, `delta`, `source-chaude`, `grotte-inondee`) sont des biomes de plus. Un jeu qui ne les connaît pas les ignore, comme tout lieu qu'il ne joue pas (docs/23). Pour les jouer, il les ajoute à sa correspondance des biomes (docs/2).

## Ce qui reste ouvert

- **Les oiseaux des rives.** Le héron et le martin-pêcheur n'ont pas tenu : ils ne vivaient que sur les trois lieux amphibies, et la genèse ne leur donnait pas de terre ferme. Une genèse avec une ripisylve (une forêt des berges) les garderait peut-être.
- **Les filtreurs.** Ils prennent trop de place dans une genèse, sur l'eau comme sur la mer (docs/13). Les faire compter plus sur la place d'un lieu est un chantier à mesurer.
- **Les poissons qui remontent les rivières.** Une migration pour pondre (le saumon) viendrait avec l'hivernage (docs/38).
