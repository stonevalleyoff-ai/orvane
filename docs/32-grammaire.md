# 32. La grammaire des effets et des conduites

Jusqu'ici, un trait faisait ce que disait sa liste : un multiplicateur, et une conduite parmi une quinzaine. Même les traits inventés (docs/27) ne faisaient qu'accentuer ou fusionner ceux qui existaient. Aucune bête ne pouvait luire, foudroyer, empester ni entendre dans le noir.

Maintenant, dans un monde à la grammaire éveillée, le monde compose des traits d'un genre neuf, comme des phrases. C'est la troisième étape de l'ouverture des domaines fermés.

`moteur/grammaire.js`. Un monde sans grammaire n'en voit rien : le banc vérifie qu'il tourne exactement comme le moteur sans ce fichier. Son hasard est le sien.

## Une phrase

> un **moyen** (la lumière, le son, l'électricité, l'odeur, la chaleur, la couleur) + une **action** (attirer, repousser, paralyser, appeler, percevoir, tromper, réchauffer) + une **cible** (la proie, le prédateur, les siens, le partenaire, soi) + un **moment** (dans le noir, dans l'eau, au danger, la nuit, au froid)

Le monde en connaît quinze :

| la phrase | ce qu'elle dit | qui peut la dire | où elle porte | ce qu'elle fait |
| --- | --- | --- | --- | --- |
| le leurre | la lumière qui attire ses proies, dans le noir | un chasseur nocturne ou nageur | le noir | chasse +40 % |
| les lanternes | la lumière qui appelle son partenaire, la nuit | une petite bête nocturne | le noir | attrait +30 %, un peu plus visible |
| l'éclair | la lumière qui repousse ses prédateurs | une bête nocturne ou nageuse | le noir | vulnérabilité −25 % |
| la torpille | l'électricité qui paralyse ses proies | un chasseur nageur | l'eau | chasse +50 % |
| la cuirasse électrique | l'électricité qui repousse ses prédateurs | un nageur | l'eau | vulnérabilité −35 % |
| le sens électrique | l'électricité qui lui fait percevoir ses proies | un chasseur nageur | l'eau trouble | chasse +20 % |
| l'alarme | le son qui appelle les siens, au danger | une bête grégaire | à sa sociabilité | vulnérabilité −20 % |
| l'écholocation | le son qui lui fait percevoir ses proies | un chasseur qui vole ou vit la nuit | le noir | chasse +35 % |
| le grondement | le son qui repousse ses prédateurs | une bête de terre d'un kilo et plus | partout | vulnérabilité −12 % |
| le musc | l'odeur qui repousse ses prédateurs | une bête de terre | hors de l'eau | vulnérabilité −30 % |
| la phéromone | l'odeur qui appelle son partenaire | une bête de terre ou qui vole | hors de l'eau | attrait +35 % |
| l'odeur trompeuse | l'odeur qui trompe ses proies, à l'affût | un chasseur de terre | hors de l'eau | chasse +25 % |
| les fossettes | la chaleur qui lui fait percevoir ses proies | un chasseur qui rampe ou vit la nuit | le noir | chasse +30 % |
| la graisse brune | la chaleur qui réchauffe son corps | une bête des lieux frais | partout | tolérance +25 % |
| le bluff | la couleur qui trompe ses prédateurs | une bête de terre ou qui vole | là où vit une bête qui pique ou qui brûle | vulnérabilité −25 % |

Une phrase coûte (de 4 à 12 % de petits en moins, à pleine force) et porte lieu par lieu. Une lueur, une décharge mettent plus de proies à la portée de la lignée qui les porte, en moyenne de ses bêtes ; parmi elles, celles qui les portent en tirent davantage. Une lueur porte pleinement aux abysses, pas en prairie à midi. Une décharge porte en pleine mer, pas en forêt.

## Le monde compose

Environ une fois tous les vingt-cinq cycles, une lignée dit une phrase :
- **une phrase qu'elle peut dire, et qui porte là où elle vit le plus** (au moins à 30 %) ;
- **une phrase peu dite jusqu'ici dit plus volontiers.** Le monde ne compose pas cent fois la même chose, mais deux lignées éloignées peuvent dire la même : c'est la convergence ;
- **sa force** va de 0,6 à 1,4 ;
- **son nom** vient de l'organe qui la dit : « photophore bleuté », « organe électrique sourd », « glandes à musc âcres », « sac vocal strident ». Si tous les noms d'un organe sont pris, il prend celui de la lignée.

Elle naît chez 2 % des bêtes de la lignée, et la sélection fait le reste ; la lignée garde son plafond de variantes dès ce cycle (docs/27). Un monde compose 60 phrases au plus.

## Le repli : ce qu'un jeu en fait

Chaque phrase porte, dans sa conduite :
- **un repli**, une conduite que tous les jeux connaissent déjà :
  - le leurre et le sens électrique perçoivent de près ;
  - la torpille mord plus fort ;
  - l'éclair et le musc ripostent à distance ;
  - l'écholocation et les fossettes voient la nuit ;
  - la cuirasse électrique défend au contact ;
  - l'alarme alerte le groupe ;
  - l'odeur trompeuse se fige.

  Seul le bluff n'en a pas.
- **un signe** (`grammaire.signe`) : `lueur`, `eclair`, `decharge`, `cri`, `echo`, `sens`, `musc`, `parfum`, `thermo`, `vapeur`, `couleurs`, avec sa couleur.
- **un présage** : « une lueur qui danse devant sa gueule », « l'eau grésille autour d'elle », « une odeur âcre monte quand on approche ».

Un jeu qui ne connaît pas la grammaire joue le repli. Celui qui la connaît joue le signe. Stone Valley (§228), par exemple :
- fait luire le leurre devant la gueule et cligner les lanternes, la nuit ;
- aveugle d'un éclair, électrise qui frappe, empeste qui approche ;
- fait gronder, et peint le bluff aux couleurs d'alerte.

## La commande : le profil du monde

```json
"monde": { "id": "orvane", …, "grammaire": true }
```

Au cycle de nuit suivant, le monde a une grammaire, une fois pour toutes. Il n'a encore rien dit.

## Ce que le banc vérifie

`bancs/grammaire.js`, en moins de deux minutes, sur le monde d'Orvane :
- **Le jour un.** Un monde sans grammaire tourne exactement comme le moteur sans ce fichier. Le jour de l'éveil, rien ne bouge.
- **Les phrases.**
  - Qui peut dire quoi : une anguille, la torpille ou l'éclair ; un cerf grégaire, l'alarme ou le musc ; une chauve-souris, l'écholocation ou les lanternes.
  - Où elles portent : une lueur, pleinement aux abysses, pas en prairie ; une décharge, en pleine mer, pas en forêt.
  - Chaque phrase a un signe et un présage, et toutes sauf le bluff un repli.
- **L'invention.** 15 phrases de suite : 10 sortes, 15 noms différents, toutes chez une lignée qui peut les dire. L'instantané respecte le schéma.
- **La sélection.**
  - Un organe électrique, à la moitié d'une lignée, 30 cycles. Chez le Corfirne, qui chasse dans l'eau, il paie ce qu'il coûte (de 50 % à 51 %). Chez le Linbellin, qui chasse sur la terre, il coûte sans servir (de 50 % à 45 %).
  - Des glandes à musc chez une proie : la sélection pèse ce qu'elle gagne et ce qu'elle paie.
- **Le cycle de nuit.** Le profil éveille la grammaire une fois.

Le banc du traducteur de Stone Valley (section 15) vérifie que les quinze phrases se jouent d'après leur signe, et, sans la grammaire, d'après leur repli.

```
node bancs/grammaire.js
```

## Ce qui reste ouvert

- **Des phrases à plusieurs propositions.** Une lueur qui attire un partenaire et trompe un prédateur, une décharge qui chasse et qui défend.
- **Les phrases que le monde n'a pas encore écrites.** Les quinze sont dans une table. Un monde qui assemble lui-même un moyen, une action et une cible, et découvre ce qui porte, viendra ensuite.
- **Des signes que les jeux n'ont pas encore.** Le venin craché à distance, la voix qui imite une autre bête.
