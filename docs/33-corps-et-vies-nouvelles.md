# 33. Les corps et les vies nouvelles

Jusqu'ici, un corps n'avait que cinq plans possibles : quadrupède, hexapode, bipède, oiseau ou serpent. Une lignée vivait seule ou en troupeau, jamais en colonie. Et seuls trois cycles de vie existaient : la chenille et le papillon, la larve et l'imago, le têtard et la grenouille (docs/26).

Maintenant, le monde peut faire naître des mille-pattes, des étoiles, des pieuvres, des colonies d'insectes, des naïades et des méduses. C'est la quatrième étape de l'ouverture des domaines fermés.

`moteur/castes.js`, `moteur/formes.js`, et deux vies de plus dans `moteur/stades.js`. Un monde sans castes ni formes nouvelles n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ces fichiers.

## Les colonies

`eusocialite` est un trait qui n'apparaît que dans un monde aux castes éveillées. Comme tout trait, il naît par mutation chez quelques bêtes.

**À qui il sert** : un hexapode (ou un corps segmenté) de 50 g au plus, grégaire (une sociabilité d'au moins 0,5).

**Ce qu'il rapporte** :
- les soldats gardent la colonie : 30 % de vulnérabilité en moins ;
- les ouvrières se partagent le travail : un quart d'entassement en moins.

**Ce qu'il coûte** : 10 % de petits en moins, puisque seule la reine pond. Chez une lignée qu'il ne sert pas, il coûte sans rien rapporter, et la sélection l'efface.

**Ce qu'une lignée publie.** Dès qu'1 % de ses bêtes vit en colonie, elle publie ses castes (`plan.castes`) :

```json
"castes": { "reine": { "masse_rel": 20, "ailes": true, "part": 0.001 }, "ouvrieres": { "masse_rel": 1, "part": 0.85 },
            "soldats": { "masse_rel": 2.5, "organe": "mandibules", "part": 0.149 }, "essaim": false, "part": 0.59 }
```

Un jeu montre la reine, les ouvrières et les soldats comme une même lignée. La conduite de la colonie est `defense-petits`, avec un présage : « des soldats aux mandibles énormes gardent l'entrée ».

## Les formes nouvelles

Trois plans de corps neufs entrent au catalogue du monde (`catalogue.monde.formes`). Chacun naît d'un plan d'avant, et seulement là où il peut naître :

| la forme | elle naît | de qui | son corps |
| --- | --- | --- | --- |
| segmenté | d'un serpent ou d'un hexapode | qui marche, rampe ou fouit, de 2 kg au plus | des anneaux, et sur chacun une paire de pattes (de 10 à 40) |
| rayonné | d'un serpent | qui nage, de 5 kg au plus | un disque et ses bras (de 4 à 8) |
| tentaculaire | d'un serpent ou d'un hexapode | qui nage, de 50 g au moins | une tête, et ses bras (de 6 à 10) |

Comme les autres changements de plan, ils sont rares : ils arrivent à la séparation d'une lignée. Ensuite, un corps segmenté gagne ou perd des anneaux, et un corps rayonné ou à tentacules un bras.

La séparation le dit : « son corps devient segmenté à 26 pattes, une forme que le monde n'avait jamais vue ».

Chaque forme dit son **repli**, le serpent, pour un jeu qui ne sait pas encore la dessiner. Un jeu qui veut les reconnaître étend sa copie de `moteur/corps.js` avec le catalogue du monde (`OrvaneCorps.etendre(instantane.catalogue.monde)`).

### Plus souvent : `regles.derive.formes` (5 novembre)

Mesuré le 5 novembre : 120 cycles du monde d'Orvane, formes éveillées, n'en font naître aucune. Une forme ne naissait qu'à travers un grand changement de plan (2 % des séparations), puis à sa chance : de l'ordre d'une séparation sur 250 pour un poisson. Personne ne l'aurait jamais vue.

Un réglage du monde les fait naître aussi à la séparation, sans grand changement de plan : à chaque séparation d'une lignée qui vit là où une forme peut naître, une chance de `formes × la chance de la forme` (0,4 pour le rayonné et le tentaculaire, 0,5 pour le segmenté).

```json
"monde": { …, "formes": true, "regles": { "derive": { "formes": 1 } } }
```

- **0, par défaut : rien ne change.** Les mêmes corps, les mêmes tirages qu'avant ; le monde d'Orvane donne exactement le même état.
- **La dérive ne tire rien de plus du hasard du cycle.** Ce tirage vient tout à la fin, avec son propre hasard, tiré du corps de la lignée (comme les mains, docs/24) : sur 3 000 dérives, autant de tirages avec le réglage que sans lui. Seule la lignée qui change de forme vit ensuite autrement (un mille-pattes peut vivre en colonie, une pieuvre ne s'hybride pas avec un poisson).
- **À 1** (le banc, 3 000 séparations) : d'un poisson de 500 g, 40 % de corps nouveaux, rayonnés ou à tentacules ; de 20 kg, seulement des tentacules ; d'un ver, la moitié de corps segmentés ; d'un brouteur à pattes, jamais.

## Les poissons

Les données n'ont pas de « poisson » : un poisson est un corps sans pattes (le plan `serpent`) d'une lignée qui ne vit que dans l'eau — elle nage, et ne marche, ne court, ne saute, ne rampe, ne fouit, ne grimpe ni ne vole. C'est la définition de docs/25 et de Stone Valley (§221). Jusqu'ici, l'observatoire les dessinait et les décrivait en serpents.

`OrvaneCorps.allure(corps, plan)` dit désormais « poisson » pour eux (et la forme du corps pour tous les autres) ; `OrvaneCorps.decrire(corps, plan)` commence par « poisson » (« poisson allongé » pour une anguille). Rien ne change dans les données ni dans la simulation. L'observatoire dessine un poisson (sa nageoire de queue, celle du dos, son ouïe ; une anguille quand le corps est très long), et les trois formes nouvelles : une pieuvre, une méduse (ou une étoile de mer, si elle ne nage pas), un mille-pattes. Un jeu peut faire de même avec `allure`.

## Deux vies de plus

| la lignée | sa larve | son adulte | ce qu'elles s'épargnent |
| --- | --- | --- | --- |
| un petit chasseur qui vole (une libellule) | une naïade, qui nage et chasse dans l'eau | un imago, qui chasse en vol | 30 % d'entassement |
| un corps rayonné de la mer, d'un kilo au plus | un polype, fixé, qui filtre l'eau | une méduse, qui nage | 28 % |

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "stades": true, "castes": true, "formes": true }
```

Au cycle de nuit suivant, les castes et les formes nouvelles s'éveillent, une fois pour toutes.

Une correction en passant : un monde qui a son propre catalogue (`monde.catalogue`, docs/20) gardait mal ce que le monde avait inventé (docs/27, 32). Le fichier de l'auteur s'y ajoute désormais, sans rien effacer.

## Ce que le banc vérifie

`bancs/formes.js`, en une minute, sur le monde d'Orvane :
- **Le jour un.** Un monde sans castes ni formes nouvelles tourne exactement comme le moteur sans ces fichiers. Le jour de l'éveil, rien ne bouge.
- **Les castes.**
  - Trois lignées pourraient vivre en colonie ; un brouteur de 1,5 kg, jamais.
  - La moitié d'une lignée vit en colonie, 40 cycles. Chez le Soméne, 20 g et grégaire, elle passe de 50 % à 59 %. Chez le Dunvi, à qui elle ne sert à rien, de 50 % à 43 %.
  - Ce qu'elle publie respecte le schéma.
- **Les formes.**
  - Sur 3 000 dérives de corps : d'un ver qui fouit naissent 969 corps segmentés et aucun rayonné ; d'un poisson de 500 g, 389 rayonnés, 355 à tentacules, aucun segmenté ; d'un poisson de 20 kg, aucun rayonné.
  - Dans le monde, des séparations forcées : 66 lignées naissent d'une forme nouvelle, toutes là où elle peut naître.
- **Les vies.**
  - Un petit chasseur qui vole : une naïade, puis un imago.
  - Un corps rayonné de la mer : un polype, puis une méduse.
  - Un butineur : toujours une chenille.
- **Le cycle de nuit.** Le profil éveille les castes et les formes une fois, et les formes entrent au catalogue du monde.

Stone Valley (§229) dessine les trois corps et joue les castes : des soldats plus grands qui mordent plus fort, une reine très rare.

```
node bancs/formes.js
```

## Ce qui reste ouvert

- **La reine et l'essaim.** Une colonie qui essaime, une reine qui fonde une colonie nouvelle ailleurs : une migration d'un genre à part.
- **Des formes que le monde invente lui-même**, en assemblant des parties (des segments, des bras, des carapaces), et non trois plans écrits d'avance.
- **Des larves qui vivent ailleurs.** La naïade vit dans l'eau, mais compte dans le même lieu que sa libellule.
