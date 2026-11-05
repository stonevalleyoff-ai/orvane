# 24. Les corps assemblés : des mains, une posture

Jusqu'ici, une silhouette avait une forme d'ensemble parmi cinq (quadrupède, hexapode, bipède, oiseau, serpent), et cette forme ne changeait que par quelques passages prévus. Il y avait des grimpeurs, et une queue préhensile, mais pas de mains, pas de corps qui se redresse : un singe ne pouvait pas naître. Maintenant, la vie dans les arbres donne des mains, un porteur de mains se redresse, et debout, il devient bipède. C'est la première étape de la phase 2 ter (des corps nouveaux, une émergence ouverte).

`moteur/corps.js`. La silhouette dérive à chaque séparation d'une lignée (docs/11) ; ce chapitre y ajoute deux pièces.

## Les mains

`mains`, un organe de plus (`catalogue.organes.mains`) :
- **Il ne naît pas au hasard**, comme les cornes ou les épines. Il naît de la vie dans les arbres : une lignée qui grimpe, qui se sépare dans un lieu au couvert dense (0,5 et plus), qui broute ou mange de tout, de 100 g à 150 kg, à quatre pattes ou debout. Une fois sur quatre, la lignée fille a des mains.
- **Elles servent.** Des mains atteignent ce que portent les arbres, comme un grimpeur (docs/17) : un brouteur à mains se nourrit aussi dans les arbres.
- **Ce qu'elles font faire au jeu** : `escalade` (docs/7), avec un présage : « saisit une branche des deux mains ».

## La posture

`plan.corps.posture`, de 0 à 1 :
- 0, à quatre pattes ou au ras du sol ;
- 0,5, se dresse ;
- 1, debout.

Un bipède et un oiseau sont debout ; un serpent et un hexapode sont au ras du sol. Un porteur de mains qui grimpe se redresse un peu à chaque séparation (assis, suspendu). Descendu des arbres, en terrain ouvert, il se redresse plus vite. À 0,8, un quadrupède à mains devient bipède : un simien debout.

**La description.** `OrvaneCorps.decrire` dit « simien », « simien qui se dresse » ou « simien debout », suivi du reste de la silhouette : « simien debout, queue, museau, deux mains agiles ».

## Rien ne bouge ailleurs

Les mains et la posture ont leur propre hasard. Sa graine est tirée du corps lui-même, et non du tirage du cycle. Une lignée qui ne vit pas dans les arbres dérive donc exactement comme avant. Le monde ne change que là où naissent des mains. Les mains comptent ensuite comme un organe : deux lignées, l'une avec, l'autre sans, se distinguent davantage.

## Pour un traducteur

- `plan.corps.posture` : la posture, pour dessiner un corps qui se dresse.
- Un organe `mains` dans `plan.corps.organes`, décrit dans `catalogue.organes`, comme les autres (place, nombre, formes, conduite). Un traducteur qui ne le connaît pas l'ignore, comme tout organe inconnu (docs/11).
- Les cinq formes d'ensemble restent les mêmes : un simien est un quadrupède ou un bipède à mains.

## Ce que le banc vérifie

`bancs/corps.js`, en moins d'une minute :
- **Le tirage du cycle.** Une lignée des arbres et une lignée du sol tirent autant de fois dans le hasard du cycle.
- **Des mains, et seulement dans les arbres.** Un omnivore grimpeur de 8 kg qui se sépare dans la jungle donne des mains à 24 % de ses lignées filles. Un marcheur, au désert, jamais.
- **Une posture qui se redresse.**
  - Après douze séparations dans les arbres, 168 lignées sur 200 ont des mains, et leur posture est à 0,55 en moyenne.
  - Après huit séparations de plus dans la savane, 72 % sont debout.
- **Les mains servent.** Devant un arbre, un marcheur de 60 cm atteint 15 % de ce qu'il porte ; avec des mains, tout.
- **D'elles-mêmes.** Le monde d'Orvane tourne 100 cycles avec les règles de séparation de la genèse. Une lignée à mains y naît d'elle-même, chez les grimpeurs de la forêt : le Ouysbel, un brouteur de 516 g. Aucune ne naît dans les terres sèches.
- **Le contrat.** Une silhouette à mains et à posture respecte `schemas/instantane.schema.json`.

```
node bancs/corps.js
```

## Ce qui reste ouvert

- **D'autres membres.** Des ailes de peau pour les quadrupèdes qui volent la nuit (une chauve-souris), des membres arrière de sauteur (un kangourou), des membres qui se perdent (une baleine).
- **Pondre ou mettre bas, et les cycles de vie** : les étapes suivantes de la phase 2 ter.
