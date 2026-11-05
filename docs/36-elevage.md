# 36. L'élevage : ce que les joueurs croisent revient au monde

Les joueurs choisissent déjà, sans le vouloir : ils prennent les plus grandes, les plus belles, et la sélection est la leur (docs/8). L'élevage est une sélection voulue. On garde deux bêtes, on choisit lesquelles croiser, on relâche les petits. C'est la deuxième étape de la phase 3.

Les croisements se font chez le jeu, avec `tampon/individus.js` (docs/35). Ce qui revient au monde, ce sont les bêtes qu'on relâche, avec leurs gènes.

## Relâcher une bête née en élevage

Un événement `liberation` (docs/4) peut porter le **génome** des bêtes relâchées :

```json
{ "taxon": "brouteur", "biome": "prairie", "phenotype": "albinisme", "action": "liberation", "n": 3,
  "genome": { "n": 3, "alleles": { "albinisme": 1, "robe-doree": 0.17 }, "a": { "taille": 1.4 } } }
```

`OrvaneIndividus.genome(betes)` le calcule : la fréquence de chaque allèle parmi elles, et leur valeur génétique moyenne.

Sans génome, une libération reste ce qu'elle était : des bêtes au phénotype dit, tirées aux fréquences de la population.

## Ce qu'en fait Orvane

Le tampon en fait un **apport** : `pressions.taxons[t][b].apport = { n, N, alleles, a }`. Le moteur le reçoit comme des migrants venus de l'élevage. Les effectifs s'ajoutent par phénotype. Les fréquences d'allèles et les moyennes des traits continus se pondèrent. L'écart entre les arrivants et la population devient de la variance.

Les plafonds :
- **un joueur** ne compte pas plus de `par_compte_cycle` bêtes par cycle (30) ;
- **une population** ne reçoit pas plus de `part_max_population` d'elle-même (20 %).

Un apport n'est pas lissé. Ce sont des bêtes, pas une pression : elles arrivent une fois.

Un monde où personne ne relâche rien ne change en rien.

## Ce que le banc vérifie

`bancs/individus.js`, section 7, sur le monde d'Orvane :
- **Ce qui revient.** Trois joueurs relâchent chacun 30 Ysdun albinos nés en élevage, grands (taille génétique 3), dans la grotte (1 774 bêtes). L'allèle de l'albinisme y passe de 1,9 % à 6,7 %, la taille moyenne de 0,96 à 1,05. C'est ce que donne le mélange.
- **Les plafonds.** Un seul joueur qui en relâche mille n'en compte que 30. Une libération sans génome reste un apport de bêtes au phénotype dit, comme avant.
- **Le contrat.** Le lot connaît le génome (`schemas/pression.schema.json`).

## Stone Valley (§231)

Chaque compagne est un individu : un sexe, un génotype, des parents. Le volet des compagnes le dit : « ♀ femelle · née au campement, fille de Bruyère et Pollen · 2ᵉ génération · consanguine à 25 %, un peu moins vive ».

**Croiser.** Au campement, une femelle et un mâle de la même lignée, sortis tous les deux, peuvent être croisés (« Croiser avec Pollen »). Deux lignées sœurs le peuvent aussi, moins souvent. Le petit naît trois minutes plus tard, au campement.

**Le petit tient de ses parents** :
- sa robe et sa forme ;
- sa taille, entre les leurs (une compagne montre toute sa taille propre : on connaît ses bêtes) ;
- ce qu'ils portaient sans le montrer. Le jeu le dit : « Rarou est né au campement · fils de Bruyère et Pollen · surprise : l'albinisme, que ses parents portaient sans le montrer ».

Si ses parents sont parents, il est consanguin, et un peu moins vif.

**Ce qui revient à l'île.** Un lien libre : le petit devient compagne. Sinon, il rejoint l'île, et ses gènes rejoignent les siens : un événement `liberation` avec son génome. Une compagne libérée part de même, avec ses gènes. Si on la reprend, c'est la même bête, avec son pedigree.

C'est le critère de sortie de la phase 3 : deux compagnes croisées au campement donnent un petit dont les traits se lisent dans ceux des parents.

## Ce qui reste ouvert

- **Les races domestiques.** Une lignée que les joueurs élèvent assez longtemps pourrait devenir une lignée à part : elle se séparerait de la sauvage, comme une lignée isolée (docs/10).
- **Les bêtes en captivité**, qui ne comptent pas dans le monde tant qu'on ne les relâche pas : un monde pourrait tenir le compte de ses élevages.
- **Un marché** : des bêtes d'élevage échangées entre joueurs, avec leur pedigree.
