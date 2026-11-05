# 27. Les traits inventés par le monde

Jusqu'ici, un trait venait d'un catalogue : celui du moteur, ou celui qu'un monde se donne (docs/20). Rien de ce que personne n'avait décrit ne pouvait naître. Maintenant, un monde inventif invente ses propres traits, comme le vivant le fait avec ses gènes. C'est la quatrième étape de la phase 2 ter, la première de l'émergence ouverte.

`moteur/invention.js`. Un monde qui n'est pas inventif n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Deux façons d'inventer

**La duplication.** Un trait répandu dans une lignée se double d'un organe qui l'accentue. Le nouveau trait exige l'ancien, en garde le sens et le pousse plus loin, pour un coût de plus :
- « metabolisme-lent » (une thyroïde peu active) donne une « thyroïde lente » ;
- « camouflage » (des chromatophores) donne des « chromatophores dentelés », qui cachent encore mieux.

**La fusion.** Deux traits portés ensemble depuis longtemps donnent un organe neuf qui les exige tous deux. Chacun renforce l'autre : la « crepuscularite » et le « metabolisme-lent » donnent une « horloge sombre ».

## Comment le monde choisit

Une fois tous les vingt cycles environ (5 % de chances par cycle), une lignée invente un trait :
- elle doit porter un trait chez au moins 30 % de ses bêtes ;
- un trait rare dans le monde, et peu repris jusqu'ici, invente plus volontiers. Le monde n'invente pas cent fois la même chose ;
- une fois sur trois, c'est une fusion, si la lignée porte deux traits ensemble.

Le nom vient de l'organe, avec une épithète de son domaine (une défense : dentelé, épais, double ; un sens : fin, aigu, profond). Il s'accorde (des membranes souples, une thyroïde lente) et ne se répète jamais. Un monde invente 80 traits au plus.

## Ce que devient un trait inventé

- **Il a une définition au vocabulaire commun** : domaine, organe, effet, coût, écarts, vulnérabilité, chasse, résistance, conduite. Un jeu le montre d'après sa seule description, comme un trait du moteur.
- **Il a un nom** (`nom`), qu'un jeu peut dire tel quel.
- **Il a une naissance** (`origine`) : la lignée qui l'a inventé, le cycle, les traits dont il vient (`de`).
- **Il entre au catalogue propre du monde** (`catalogue.monde.traits`), et parmi les traits portés (`catalogue.traits`).
- **Il naît chez 2 % des bêtes de la lignée** qui l'invente, celles qui portent déjà ce qu'il exige. La sélection fait le reste : il se répand s'il sert, il s'efface sinon.
- Ensuite, il est un trait comme un autre. Il peut naître par mutation dans d'autres lignées, et on peut l'inventer à son tour.

Le hasard des inventions est le sien : celui du cycle ne bouge pas.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "invention": true }
```

Au cycle de nuit suivant, le monde devient inventif, une fois pour toutes. Il n'a encore rien inventé.

## Ce que le banc vérifie

`bancs/invention.js`, en moins de deux minutes, sur le monde d'Orvane :
- **Le jour un.** Un monde qui n'est pas inventif tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Une invention.**
  - Le trait neuf a une définition complète et une naissance. Il entre au catalogue du monde et parmi les traits portés.
  - Il naît dans la seule lignée qui l'invente, chez 2 % de ses bêtes, toutes porteuses de ce qu'il exige.
  - Une duplication garde le sens de son trait : des chromatophores dentelés cachent encore.
- **Il dure.** Au cycle suivant, il est toujours là. Greffé à la moitié d'une lignée, la sélection le pèse comme un autre trait.
- **La diversité.** 14 inventions de suite : 14 noms différents, tirés de 10 traits.
- **Le contrat et le cycle de nuit.** L'instantané respecte le schéma, et le profil rend le monde inventif une fois.

```
node bancs/invention.js
```

## Ce qui reste ouvert

- **Des traits vraiment neufs.** Une duplication ou une fusion accentue ce qui existe. Un trait sans ancêtre (un organe électrique, une lumière) attendra un vocabulaire d'effets plus large.
- **Des inventions qui se perdent.** Un trait inventé que plus personne ne porte reste au catalogue du monde, comme une archive.
