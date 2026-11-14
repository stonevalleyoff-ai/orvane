# 26. Les cycles de vie : une larve, puis un adulte

Jusqu'ici, une lignée avait un seul corps et une seule façon de vivre, de la naissance à la mort. Une chenille et son papillon auraient été deux espèces sans lien. Maintenant, une lignée peut vivre deux vies : une larve, puis un adulte, chacun avec son régime et sa façon de se déplacer. C'est la troisième étape de la phase 2 ter.

`moteur/stades.js`. Un monde sans cycles de vie n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier.

## La métamorphose

`metamorphose` est un trait qui n'apparaît que dans un monde aux cycles de vie éveillés. Comme tout trait, il naît par mutation chez quelques bêtes d'une lignée, et la sélection décide s'il s'y répand.

**Les deux vies** se déduisent du plan de la lignée :

| la lignée | sa larve | son adulte |
| --- | --- | --- |
| un petit hexapode (50 g au plus) qui vole | une chenille : elle rampe, grimpe et broute les feuilles | un papillon s'il broute ou mange de tout, sinon un imago |
| un petit hexapode qui ne vole pas | une larve : elle fouit et mange les débris | un imago |
| une bête de l'eau douce et de la terre (5 kg au plus) | un têtard : il nage et broute les algues | l'adulte, qui marche ou saute |
| les autres | la métamorphose ne leur sert à rien | |

**Ce qu'elle rapporte.** Les larves ne disputent aux adultes que ce qu'elles mangent en commun. Une population qui se métamorphose se sent donc moins à l'étroit :
- une chenille et un papillon s'épargnent 28 % de l'entassement ;
- un têtard et une grenouille qui chasse, 26 % ;
- un têtard et un adulte qui broute comme lui, 14 %.

L'avantage compte surtout là où la lignée est à l'étroit, près de la place que lui laisse son lieu.

**Ce qu'elle coûte.** 8 % de petits en moins, et une nymphe vulnérable (5 % de plus face aux prédateurs). Chez une lignée qu'elle ne sert pas, elle coûte sans rien rapporter, et la sélection l'efface.

## Ce qu'un jeu en fait

Une lignée dont 1 % au moins des bêtes se métamorphose publie ses deux vies dans `plan.stades` :

```json
"stades": { "larve": { "nom": "chenille", "regime": "herbivore", "locomotion": ["reptation", "grimpe"], "forme": "hexapode", "masse_rel": 0.5 },
            "adulte": { "nom": "papillon", "regime": "herbivore", "locomotion": ["vol", "marche"] }, "part": 0.63, "larves": 0.6 }
```

- **`part`** est la part de la lignée qui se métamorphose.
- **`larves`** est la part de ses bêtes qui sont des larves à un moment donné (60 %).
- Un jeu peut faire naître la larve, puis la changer en adulte. Une chenille tuée se renvoie comme un prélèvement sur sa lignée, avec `age: "jeune"`.
- La conduite de la métamorphose est `immobilite`, avec un présage : « une nymphe accrochée, immobile ».

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "stades": true }
```

Au cycle de nuit suivant, les cycles de vie s'éveillent, une fois pour toutes. Aucune lignée ne se métamorphose encore : la métamorphose viendra par mutation, là où elle sert. Dans le monde d'Orvane, 13 lignées pourraient vivre deux vies.

## Ce que le banc vérifie

`bancs/stades.js`, en moins d'une minute, sur le monde d'Orvane :
- **Le jour un.** Un monde sans cycles de vie tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Les deux vies.**
  - Un petit hexapode qui vole et broute devient une chenille, puis un papillon.
  - Un petit hexapode qui marche devient une larve qui fouit, puis un imago.
  - Une bête de l'eau et de la terre devient un têtard qui nage.
  - Un cerf de 90 kg ne vit qu'une vie.
- **La sélection.** La moitié d'une lignée se métamorphose, pendant 40 cycles. Chez le Soméne mangeur d'herbe de la prairie (20 g, des millions de bêtes à l'étroit), elle passe de 50 % à 63 %. Chez le Lotays tondeur de marais, à qui elle ne sert à rien, elle recule de 50 % à 41 %.
- **Ce qu'elle publie.** Ses deux vies et la part qui se métamorphose. L'instantané respecte le schéma.
- **Le cycle de nuit.** Le profil éveille les cycles de vie une fois.

```
node bancs/stades.js
```

## Ce qui reste ouvert

- **Des larves qui vivent ailleurs.** Un têtard vit dans l'eau, mais sa population compte dans le même lieu que les adultes. La suite : des larves qui ont leur propre lieu, une rivière au pied d'une forêt.
- **Plus de deux vies.** Une méduse, un parasite qui change d'hôte.
- **Les traits de chaque vie.** Aujourd'hui, la larve et l'adulte partagent leurs traits ; un papillon aux ailes voyantes et une chenille camouflée attendront.
