# 44. La vitesse du moteur, et les kits Unity et Godot

L'étape 3 du chemin vers un Orvane « pro » : un moteur plus rapide, sans rien changer au monde, et des kits pour que les jeux Unity et Godot se branchent sans tout réécrire.

## La vitesse

Un cycle du monde d'Orvane (201 parcelles, 421 lignées, toutes les mécaniques éveillées) prenait **5,6 s**. Il en prend **4,6 s** depuis le 7 novembre (−17 %), et il donne **exactement le même monde** : six cycles de suite, chaque instantané est identique au précédent moteur, au caractère près.

Aucune formule n'a changé. Le moteur refaisait des milliers de fois les mêmes calculs :
- **ce qu'un brouteur tire des plantes** ne dépend que de son plan, de ses traits et de la forme de la plante. C'était recalculé pour chaque plante de chaque lieu ; c'est désormais fait une fois par cycle et par phénotype (`moteur/flore.js`, `devantDe`) ;
- **l'effectif de chaque population** était recompté pour chaque paire de populations quand le moteur mesure l'écart génétique d'une population au reste de son espèce ; il est compté une fois (`moteur/orvane.js`, à la séparation) ;
- **les traits de chaque phénotype** sont mis en ensemble une fois, et non à chaque comparaison.

Où passe le temps qui reste : la dynamique de chaque population (44 %), la pousse des plantes et les maladies (20 %), la mise en route du cycle (13 %), la séparation des lignées et l'écriture (18 %). Aller plus loin demanderait de toucher à l'ordre des calculs : le monde changerait, au dernier chiffre près, et divergerait à la longue. Ce n'est pas fait.

### Mesurer

```
node outils/vitesse.js                                   # le monde d'Orvane, 5 cycles
node outils/vitesse.js --monde mondes/genese-7/instantane.json --cycles 10
node outils/vitesse.js --contre origin/main              # plus vite que main ? et le même monde ?
```

Contre une autre version du moteur, l'outil fait tourner les deux sur le même monde, et compare les temps et les empreintes de chaque instantané. Si le monde n'est plus le même, il le dit, et sort en erreur. C'est le garde-fou de toute optimisation à venir.

## Les kits

`kits/LISEZ-MOI.md` dit comment les installer et s'en servir. En bref :

| | Unity | Godot 4 |
| --- | --- | --- |
| où | `kits/unity/` (un paquet Unity) | `kits/godot/addons/orvane/` (une extension) |
| installer | Package Manager › Add package from git URL | copier le dossier, activer l'extension |
| lire le monde | `OrvaneUnity.Lire(…)` → des classes C# (`Instantane`, `Lignee`, `Population`…) | `Orvane.lire()` → un `Dictionary` |
| compter | `Compteur.Compter(taxon, biome, action)` | `Orvane.compter(taxon, biome, action)` |
| déposer | `OrvaneUnity.Deposer(…)` | `Orvane.deposer(compte)` |
| garder ce qui n'est pas déposé | `Compteur.Sauver()` / `Charger()` | `user://orvane.json`, tout seul |

Les deux ignorent ce qu'ils ne connaissent pas (docs/43) : un champ, une valeur ou un biome ajoutés par Orvane ne cassent pas la lecture. Un lot fait 500 événements au plus, ce qu'Orvane accepte d'un coup ; au-delà, le kit en fait plusieurs.

### Ce qui est vérifié

- **Unity.** Le cœur C# est compilé et essayé hors de Unity, avec .NET 8, à chaque PR (`dotnet run --project kits/unity/Tests~`, le job `kits`) :
  - il lit les trois instantanés du dépôt (le monde d'Orvane, la genèse 7, la genèse 2026) ;
  - un champ, une valeur inconnus ne cassent rien, et restent dans `Autres` ;
  - 700 rencontres comptées deux fois s'additionnent ; sauvé et repris, rien n'est perdu ; clos, cela fait deux lots, de 500 et de 203 événements ;
  - ces lots passent `outils/verifier.js` : orvane_deposer les acceptera.
  La couche propre à Unity (`UnityWebRequest`) est mince, mais n'a pas été essayée dans Unity.
- **Godot.** La syntaxe GDScript 4 est vérifiée à chaque PR (`gdtoolkit`). Le kit n'a pas encore tourné dans Godot lui-même.

## Ce qui reste ouvert

- **Le moteur dans un jeu Unity ou Godot.** Un monde solo (docs/19) ne tourne encore qu'en JavaScript. Un port (WebAssembly, ou C#) le ferait vivre dans le jeu.
- **Un banc dans Godot et dans Unity**, sans fenêtre, pour vérifier les kits dans leur moteur.
- **Le second jeu** (l'étape 4) : c'est lui qui dira ce qui manque aux kits.
