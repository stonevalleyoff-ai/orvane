# 12. La méfiance et l'habituation : ce qu'une population apprend des joueurs

Les bêtes chassées par les joueurs apprennent à les craindre ; celles qu'on croise sans leur faire de mal finissent par s'y habituer. Orvane tient cette mémoire par population. Elle se nourrit des rencontres et des prélèvements, et retombe avec le temps. Le jeu la rend en distance de fuite.

C'est un apprentissage, pas un gène : il ne passe pas aux petits par les allèles, et il s'efface quand les joueurs s'en vont. L'**audace** (docs/8), elle, est héritée : la chasse des plus audacieux la fait baisser lentement, génération après génération. Les deux se combinent.

## Ce que porte une population

```json
"populations": [ { "biome": "tourbiere", "effectif": 41210, …, "mefiance": 0.57, "habituation": 0.04 } ]
```

- **`mefiance`** (0 à 1) : nourrie par les contacts qui finissent mal. Elle retombe de moitié en 6 cycles sans joueurs.
- **`habituation`** (0 à 1) : nourrie par les rencontres sans suite et par l'aide (nourrir, relâcher). Elle retombe de moitié en 15 cycles, et ce qui finit mal la défait.

Absentes, elles valent 0. Le jour un, aucune population n'en porte.

## D'où elles viennent

Le tampon compte, pour chaque population, ce que ses bêtes ont vécu des joueurs (`contact` dans les pressions) :
- `rencontres` : les rencontres du lot, sans suite ;
- `danger` : les prélèvements, plus les captures à moitié (la bête est emmenée, pas tuée sous les yeux des autres) ;
- `aide` : les nourrissages et les libérations.

Ce décompte a la protection de la mémoire (docs/50) :

- **Par compte** : son activité auprès d'une population se mesure sur tous ses contacts : ses rencontres, ou la somme de `danger` et d'`aide` quand elle est plus grande. Elle est ramenée à une activité normale (`exposition_ref` contacts, 60 si le profil ne le dit pas), ses proportions gardées. Un joueur qui court partout ne pèse pas plus qu'un autre. Un compte qui déclare 9 000 prélèvements sans une rencontre non plus : la population en a vécu 60 contacts qui finissent mal.

C'est la seule. Il n'y a **ni part par compte, ni part par jeu** : la méfiance s'apprend d'une proportion, la part des contacts qui finissent mal, et rogner les uns y grossit d'autant les autres. Une part par compte, entre peu de joueurs, raboterait des comptes égaux et grossirait d'autant un compte léger. Une part par jeu ramènerait cent passants au poids de trois comptes inscrits sous un jeu à eux (plus bas). Un compte pèse donc le même poids sous n'importe quel jeu.

Les retraits gardent leurs propres plafonds, la part d'un jeu comprise (docs/4) : rien ici n'y touche.

### Ce qui a changé le 13 novembre 2026

Un correctif. Jusque-là, le contact n'était ramené à une activité normale que si les *rencontres* d'un compte dépassaient `exposition_ref`. Un compte qui déclarait 9 000 prélèvements sans une rencontre pesait 9 000 contacts qui finissent mal. Sur le monde d'Orvane, un seul compte portait ainsi en une nuit 1 522 populations à une méfiance de 0,9 ou plus, presque toutes celles du monde, quoi que fassent les autres joueurs. Aucune bête de trop n'était retirée : seule la méfiance était faussée.

Ce correctif **change la méfiance et l'habituation des mondes qui reçoivent des lots**, dans deux cas :

- un compte dont les prises et l'aide dépassent à la fois ses rencontres et l'activité normale : il est ramené à celle-ci (avant : compté entier) ;
- un profil sans `exposition_ref` : 60 contacts par compte (avant : aucune limite).

Hors de ces cas, le contact est le même, au caractère près. Un monde sans lots ne change pas.

**La part d'un jeu, mise puis retirée.** Le correctif avait d'abord donné au contact la part d'un jeu (`part_max_jeu`, avec un plancher de 200 contacts), comme à la mémoire. Mesurée dans les deux sens (plus bas), elle ouvrait plus qu'elle ne protégeait : elle est retirée, ici et pour la mémoire. Un monde qui a tourné avec elle change dans un cas : une population que plusieurs jeux montrent, quand l'un dépassait sa part. Ses contacts ne sont plus rognés.

### Ce que ce plafond tient, et ce qu'il ne tient pas

Par population, la méfiance apprise en une nuit, depuis zéro :

| qui joue | avant | maintenant |
| --- | --- | --- |
| dix passants (30 rencontres chacun) et un compte qui déclare 9 000 prélèvements | 1 | 0,63 |
| vingt passants (60 rencontres chacun) et le même compte, de leur jeu ou inscrit sous un jeu à lui | 0,99 | 0,25 |
| ce compte, seul avec la population | 1 | 0,95 |

- **Face aux autres, un compte pèse un joueur** : celui qui prendrait tout ce qu'il croise, pas davantage.
- **Le nom du jeu n'y change rien.** Parmi les joueurs d'un grand jeu ou inscrit sous un jeu à lui, le même contact, au caractère près.
- **Le nombre des vrais joueurs protège.** Face à cent passants (60 rencontres chacun), un compte hostile fait 0,06 de méfiance en une nuit ; il en faut quatorze pour passer 0,5, un pour sept passants. C'est la règle de la méfiance elle-même : un contact sur dix qui finit mal donne 0,45.
- **Seul avec une population, il reste tout ce qu'elle connaît des joueurs.** Soixante contacts qui finissent mal, sans une rencontre, la rendent méfiante en une nuit, comme le ferait un vrai chasseur. Et un compte nomme autant de populations qu'il veut : sur le monde d'Orvane sans autre joueur, le compte du défaut en porte encore 1 501 sur 1 522 à 0,9 ou plus. Face à dix passants du même jeu par population, plus aucune n'atteint 0,9 ; 1 242 passent encore 0,5.
- **Un grand jeu fait la méfiance d'une population qu'un petit jeu montre aussi**, à proportion de ses joueurs (plus bas).
- **Ce qui borne toujours** : la méfiance ne retire pas une bête ; elle retombe de moitié en 6 cycles quand le compte s'arrête ; chaque jeu borne ce qu'il rend (`exposition.mefiance`).

`bancs/tampon.js` (section 9) et `bancs/memoire.js` (sections 3 et 4) le vérifient.

### La part d'un jeu, mesurée dans les deux sens

Pour les retraits, rogner un grand jeu ne fait que retirer moins de bêtes. Pour la méfiance, rogner un grand jeu paisible grossit d'autant un petit jeu hostile. Et les jeux s'inscrivent librement, comme les comptes.

`node outils/parts.js` mesure les deux sens, sous chaque règle qu'on pouvait choisir : sur le monde `sv-1`, la population `traqueur` de la prairie, par le tampon puis le moteur. La part d'un jeu y vaut 0,5, comme sur le monde d'Orvane. La méfiance est celle d'une nuit ; après vingt, elle est la même à un centième près.

**Un petit jeu hostile face à un grand jeu paisible.** Des passants à 60 rencontres chacun. Des comptes hostiles qui déclarent chacun 60 prélèvements sans une rencontre : une activité normale, toute hostile.

| passants | comptes hostiles | du jeu des passants | sous un jeu à eux, avec une part par jeu | sous un jeu à eux, maintenant |
| --- | --- | --- | --- | --- |
| 100 | 1 | 0,056 | 0,736 | 0,056 |
| 100 | 4 | 0,199 | 0,944 | 0,199 |
| 10 | 1 | 0,408 | 0,736 | 0,408 |
| 10 | 4 | 0,808 | 0,944 | 0,808 |
| 100 | pour passer 0,5 | 14 comptes | 1 compte | 14 comptes |

Avec une part par jeu, les passants étaient ramenés à leur plancher, 200 rencontres, aussi nombreux qu'ils soient. Un seul compte inscrit sous un jeu à lui suffisait.

**Un grand jeu face à un petit jeu de vrais joueurs.** C'est ce qu'une part par jeu protégeait. Le petit jeu : cinq joueurs, 60 rencontres chacun.

| qui joue | avec une part par jeu | maintenant |
| --- | --- | --- |
| 100 chasseurs d'un jeu (60 rencontres, 6 prises chacun), cinq passants d'un autre | 0,240 | 0,395 |
| 1 000 chasseurs, les mêmes cinq passants | 0,240 | 0,407 |
| 100 comptes à 60 prélèvements, cinq passants | 0,944 | 0,996 |
| 100 passants d'un jeu, cinq chasseurs d'un autre (6 prises chacun) | 0,240 | 0,027 |
| 1 000 passants, les mêmes cinq chasseurs | 0,240 | 0,003 |

- **Elle protégeait peu.** La cible de la méfiance sature vite : `1 − e^(−6 × part des contacts qui finissent mal)` vaut 0,45 à un contact sur dix, 0,95 à un sur deux. Ramené à égalité avec cinq passants, un grand jeu tout hostile laissait la population à 0,944 au lieu de 0,996. Un grand jeu de vrais chasseurs, à 0,240 au lieu de 0,395.
- **Ce qu'elle protégeait et ce qu'elle ouvrait sont une seule opération.** Les deux dernières lignes sont la menace du premier tableau, vue de l'autre côté : cinq comptes d'un petit jeu y écrivaient la méfiance des bêtes de mille passants. Rien ne distingue cinq vrais joueurs d'un petit jeu de cinq comptes inscrits sous un jeu à eux. Une règle qui donne sa voix aux premiers la donne aux seconds.
- **Un plancher qui suit le nombre de comptes du jeu ne fait que choisir entre les deux.** Avec un plancher de 60 × √comptes, un compte hostile sous un jeu à lui fait encore 0,408 face à cent passants, et le petit jeu n'est presque plus protégé (0,303 au lieu de 0,395 face à cent chasseurs). Avec 30 × comptes, c'est la règle sans part, à un facteur deux près : le même compte hostile fait 0,107 au lieu de 0,056.

La règle retenue est la seule que le nom du jeu ne change pas : chaque compte pèse ce que la population a vécu de lui, au plus une activité normale. Ce qu'elle ne fait pas : protéger les passants d'un petit jeu de ce que font les joueurs, vrais ou faux, d'un grand. La traque, l'attrait et la néophobie suivent la même règle (docs/50, « L'abus »).

## Comment elles s'apprennent

À chaque cycle (`apprendre`, `REGLES.mefiance`) :
1. la méfiance et l'habituation retombent (demi-vies de 6 et 15 cycles) ;
2. la **méfiance** va vers `1 − e^(−6 × part des contacts qui finissent mal)` : 0,45 si un contact sur dix finit mal, 0,70 pour un sur cinq. Elle y va d'autant plus vite que les contacts sont nombreux (aux deux tiers pour 20 contacts). Des contacts paisibles la défont trois fois moins vite qu'elle ne s'apprend ;
3. l'**habituation** monte avec les rencontres sans suite (aux deux tiers pour 150 rencontres, l'aide comptant triple). Il suffit cependant qu'un contact sur dix finisse mal pour qu'elle ne monte presque plus, et ce qui finit mal la fait retomber ;
4. une population **audacieuse** (son audace moyenne z, docs/8) s'habitue plus vite et se méfie moins : à z = +1,5, la même chasse la rend plus de deux fois moins méfiante qu'à z = −1,5 (0,31 contre 0,73).

Quand la méfiance d'une population passe 0,5, le journal le note (événement `mefiance`).

Quelques équilibres, après vingt cycles au même régime :

| chaque cycle | méfiance | habituation | distance de fuite (Stone Valley) |
| --- | --- | --- | --- |
| 60 rencontres, aucune bête prise | 0 | 0,92 | × 0,53 |
| 60 rencontres, une ou deux bêtes prises (1,2 en moyenne) | 0,11 | 0,63 | × 0,71 |
| 60 rencontres, 6 bêtes prises | 0,42 | 0,07 | × 1,33 |
| 30 rencontres, 6 bêtes prises | 0,62 | 0 | × 1,62 |

Ces régimes sont sous l'activité normale d'un compte : le tampon les passe tels quels.

Le moteur ne fait que tenir cette mémoire ; il ne s'en sert pas. C'est le jeu qui la rend, et la boucle se ferme d'elle-même : une bête méfiante fuit de plus loin, se laisse moins approcher et moins prendre, et sa population se calme.

## Côté jeu

Le profil dit comment la rendre (`exposition.mefiance`) :

```json
"mefiance": { "rendue": true, "fuite": 2.2, "habitude": 0.5 }
```

La distance de fuite est multipliée par `fuite^méfiance × habitude^habituation` : × 2,2 pour une population tout à fait méfiante, × 0,5 pour une tout à fait habituée. `rendue: false` éteint l'effet dans le jeu ; Orvane continue de tenir la mémoire.

Stone Valley (§216) lit la population **du biome où naît la bête** et multiplie son facteur de fuite (`b.fq`, qui porte déjà l'audace). Le panneau de la bête désignée dit « se méfie des chasseurs », « fuit les chasseurs : on la chasse ici » ou « habituée aux passants ». Les compagnes n'en tiennent pas compte.

## Ce qui vient ensuite

- **La traque** : un prédateur qui apprend, lui aussi, et suit les joueurs au lieu de les fuir (le genre horreur). *Fait : c'est une disposition de la mémoire (docs/50), avec l'attrait et la néophobie ; dans un monde qui l'éveille, une bête blessée qui survit nourrit aussi la méfiance, deux fois plus qu'une bête prise.*
- **La méfiance qui voyage** : des migrants qui l'emportent vers une population voisine. *La mémoire voyage ainsi (docs/50) ; la méfiance pas encore.*
- **Les prédateurs de l'île** : une méfiance nourrie aussi de la prédation naturelle, pour que les proies d'un biome riche en chasseurs soient farouches d'emblée.
