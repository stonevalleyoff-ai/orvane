# 17. La flore : des plantes qui se défendent

Jusqu'ici, la nourriture d'un brouteur était la capacité de son biome : la même pour tous, quelle que soit sa taille ou sa façon de manger. Avec la flore, les plantes deviennent des lignées. Chaque brouteur ne mange que ce qu'il atteint et ce qu'il supporte, et cette nourriture s'épuise sous la dent. Les plantes broutées se défendent (des feuilles toxiques, des épines), et ces défenses coûtent en repousse. Les brouteurs qui les supportent en tirent plus. Plantes et brouteurs coévoluent. C'est l'étape 2.3 de la feuille de route.

`moteur/flore.js`. Le moteur l'appelle à quelques points de son cycle. Un monde sans flore n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## Les plantes

Une plante est une lignée de la famille `vegetale` (`plan.regime` : `vegetal`). Elle a :
- **une forme** (`plan.forme`), qui dit sa hauteur et sa repousse :

| forme | hauteur | repousse par cycle | où |
| --- | --- | --- | --- |
| herbe | 0,3 m | 50 % | presque partout sur terre |
| buisson | 1,5 m | 30 % | sous un couvert léger, dans les terres sèches |
| arbre | 12 m | 25 % | là où le biome a du couvert |
| roseau | 1,8 m | 40 % | les rives, les marais |
| algue | 0,5 m | 60 % | l'eau douce, la mer éclairée |
| lichen | 2 cm | 6 % | le grand froid |
| succulente | 0,8 m | 10 % | les déserts |
| champignon | 10 cm | 40 % | la grotte |

- **sa place** dans chaque lieu (`populations[].potentiel`) : la capacité du biome, partagée entre les formes. L'arbre prend la part du couvert, l'herbe et le buisson le reste ;
- **quatre phénotypes** : sans défense, toxique, épineux, les deux (`populations[].frequences`, dans cet ordre).

| défense | ce qu'elle fait | ce qu'elle coûte |
| --- | --- | --- |
| toxique | un brouteur qui ne la supporte pas en mange 70 % de moins | 20 % de repousse |
| épineux | un brouteur sans cuir épais en mange 50 % de moins | 15 % de repousse |

Chaque cycle, une plante repousse selon la place qui lui reste, perd ce que les brouteurs en mangent (la moitié au plus), et 3 % de ses pieds meurent et repoussent. Ce renouveau fait payer leurs défenses aux plantes, même quand personne ne les broute. Une petite part des pousses (0,2 %) change de défense.

## Ce qu'un brouteur mange

Un herbivore, ou un omnivore pour la part végétale de ce qu'il mange (60 %), trouve dans son lieu la somme de ce qu'il atteint et de ce qu'il supporte, plante par plante.

**Ce qu'il atteint :**
- l'herbe, le lichen, la succulente et le champignon, tout le monde ;
- un buisson, selon sa taille (à partir de 0,8 m), ou s'il grimpe, vole ou plane ;
- un arbre, s'il grimpe, vole ou plane, sinon selon sa taille (de 4 m pour tout atteindre) ;
- une algue, s'il nage ; un roseau, à partir de 0,5 m.

Des pattes longues ou le gigantisme rehaussent sa portée, et une queue préhensile ou une membrane planante lui ouvrent les arbres.

**Les butineurs** (les petits brouteurs qui volent ou grimpent, et les insectes) mangent pour moitié du nectar : docs/18.

**Ce qu'il supporte :**
- contre les toxines, le métabolisme lent (60 %) ou un grand estomac (50 %) ;
- contre les épines, le cuir épais (60 %) ou une carapace (40 %). Les toutes petites bêtes (sous 100 g) passent entre (50 %).

Sa nourriture, rapportée à ce qu'elle était à l'éveil de la flore, règle la place qu'il trouve : un brouteur dont la nourriture baisse de moitié trouve deux fois moins de place. Elle est publiée (`populations[].nourriture`) quand elle a bougé d'au moins 0,5 %. Entre les phénotypes d'un brouteur, celui qui supporte mieux les défenses trouve plus de place, sans que le total des naissances change : c'est la sélection.

**Ce qu'il mange en commun.** Sans la flore, deux brouteurs de même taille se disputent la même place, quoi qu'ils mangent. Avec elle, la charge de sa bande de taille est pesée par ce qu'il mange en commun avec chacun : son régime (ce qu'il atteint et supporte de chaque plante) comparé au leur. Ce recouvrement est rapporté à ce qu'il était à son arrivée (`populations[].recouvrement`), si bien que rien ne change le jour de l'éveil. Ensuite, une espèce qui se raréfie et ne mange pas tout à fait comme la majorité de sa bande regagne de la place : c'est ce qui manquait depuis la phase 1.

## L'éveil

`monde.flore`. La flore s'éveille une fois. Chaque biome reçoit une lignée par forme qui lui convient, et les abysses, sans lumière, n'en ont pas. Pendant 400 cycles d'essai, les plantes se mettent en équilibre sous les brouteurs du moment, qui eux ne bougent pas. Ce qu'elles sont alors devient la référence. Le jour de son éveil, chaque brouteur a donc la nourriture qu'avait son biome : rien ne change, puis la coévolution commence.

## Le contrat

En plus, dans l'instantané (`schemas/instantane.schema.json`) :
- les plantes, de la famille `vegetale` : `plan.forme`, `plan.hauteur_m`, `plan.croissance` ; par lieu, `potentiel`, `frequences` et `reference`. Elles sont publiées à part, dans `flore.json`, à côté de l'instantané : des millions de pieds n'ont rien à faire chez un jeu qui ne les attend pas ;
- chez les brouteurs, `populations[].nourriture` et `populations[].recouvrement` ;
- `catalogue.flore` : les deux défenses ;
- `monde.flore` : depuis quand, combien de lignées.

Un jeu ne reçoit pas les plantes s'il ne les demande pas : elles ne sont pas dans `instantane.json`, et `Tampon.filtrer` les retire d'un monde qui les porte (la famille `vegetale`). Il peut montrer la nourriture des brouteurs sans jouer les plantes : une prairie surbroutée, des bêtes maigres.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "flore": true }
```

Au cycle de nuit suivant, la flore s'éveille, une fois pour toutes. L'éveil prend quelques secondes (les 400 cycles d'essai des plantes) ; un cycle, à peine plus qu'avant.

## Ce que le monde en fait

`bancs/flore.js`, sur le monde d'Orvane par biomes, 120 cycles :

| | sans la flore | avec la flore |
| --- | --- | --- |
| lignées de bêtes à la fin | 119 | 118 |
| bêtes à la fin | 55 millions | 52,6 millions |
| biomasse des brouteurs | | 103 % de celle sans la flore |
| brouteurs au cuir épais (en biomasse) | 1,1 % | de 1,1 % à 18,6 % |
| brouteurs au métabolisme lent | 81 % | 86,5 % |

**L'éveil.**
- 54 lignées de plantes, dans chacun des 23 biomes éclairés : la forêt a ses arbres, ses buissons et son herbe, le désert ses succulentes, le lac ses algues et ses roseaux, la grotte ses champignons.
- À l'équilibre, 34 % des pieds ont une défense ; les autres n'en paient pas le coût.
- Au premier cycle, les brouteurs gardent 100 % de leur biomasse ; au dixième, 99 %.

**La coévolution.**
- Contre les épines, le cuir épais gagne les brouteurs : de 1,1 % de leur biomasse à 18,6 % en 120 cycles ; sans la flore, il reste à 1,1 %.
- Contre les toxines, le métabolisme lent monte aussi, à 86,5 % contre 81 %.

**Une espèce minoritaire, chassée.** Le Vavator broutard de mangrove (90 g, il grimpe), minoritaire de sa bande dans la prairie, est chassé 60 cycles à 6 % par cycle. Avec la flore, il en reste 184 % : il ne mange pas tout à fait comme sa bande, et regagne de la place en se raréfiant. Sans elle, 85 %.

**Une prairie surbroutée, une prairie délaissée** (les brouteurs de la prairie tenus 30 cycles au triple, ou au dixième, de leur nombre) :
- broutée au triple, elle s'arme : ses défenses passent de 52 % à 60 %, et la nourriture de ses brouteurs tombe à 67 % de ce qu'elle était ;
- délaissée, elle désarme (49 %), et la nourriture remonte à 108 %.

Le banc vérifie aussi le contrat (avec et sans parcelles), le filtre des familles et le cycle de nuit (la flore s'éveille une fois).

```
node bancs/flore.js            # environ 5 minutes
node bancs/flore.js --court    # 60 cycles
```

## Ce qui reste ouvert

- **La flore ne se sépare pas encore en lignées nouvelles.** Une plante change ses défenses, mais pas sa forme ni sa hauteur.
- **Les catastrophes ne touchent pas encore les plantes.** Un incendie retire de la capacité au biome, pas de pieds aux plantes.
- **Les machines et la flore** : des machines qui sèment ou qui défrichent (docs/16).
