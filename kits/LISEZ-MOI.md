# Les kits : brancher un jeu Unity ou Godot

Un jeu qui se branche sur Orvane fait trois choses : il **lit le monde** (l'instantané, une fois au lancement), il **compte** ce que font ses joueurs (une rencontre, une bête tuée, un bois défriché), et il **dépose** ces comptes par lots. Les kits font ces trois choses ; le jeu garde ce qui lui appartient : traduire ses terrains en biomes d'Orvane, et les lignées en créatures (`BRANCHER-UN-JEU.md`, chapitre 3).

Ils suivent le contrat 1.0 (docs/43) et ignorent ce qu'ils ne connaissent pas : un champ ajouté demain ne casse pas un jeu d'aujourd'hui.

## Unity (`kits/unity/`)

**Installer** : Window › Package Manager › « + » › **Add package from git URL** :

```
https://github.com/stonevalleyoff-ai/orvane.git?path=/kits/unity#main
```

Le paquet demande `com.unity.nuget.newtonsoft-json` (Unity l'installe avec lui). Unity 2021.3 ou plus récent ; marche en WebGL.

**Lire le monde** :

```csharp
using Orvane;

var b = new Branchement { CleJeu = "orv_…" };              // la clé du jeu, reçue à l'inscription
StartCoroutine(OrvaneUnity.Lire(b, inst => {
    if (inst.Majeur != 1) Debug.LogWarning("Orvane a changé de version majeure : lire CHANGELOG.md");
    foreach (var (lignee, pop) in inst.Dans("prairie"))
        Debug.Log($"{lignee.Nom} : {pop.Effectif:0} bêtes, {lignee.Plan.MasseKg} kg, {lignee.Plan.Regime}");
}, erreur => Debug.LogWarning(erreur)));
```

**Compter et déposer** :

```csharp
var compteur = new Compteur("mon-jeu") { Instantane = inst.Cycle.N };
compteur.Charger(PlayerPrefs.GetString("orvane"));       // ce qui n'avait pas été déposé la dernière fois

compteur.Compter("dunvi", "savane", Actions.Rencontre);  // au moment où ça arrive, dans un biome d'Orvane
compteur.Compter("dunvi", "savane", Actions.Prelevement, phenotype: "base", age: "adulte");

compteur.Clore(compteOpaque);                            // à un moment naturel : une sauvegarde, une fin de partie
StartCoroutine(OrvaneUnity.Deposer(b, compteur, compteOpaque, rep => {
    PlayerPrefs.SetString("orvane", compteur.Sauver());  // refusé ou sans réseau, le lot reste pour la prochaine fois
}));
```

- `compteOpaque` : un identifiant du joueur qu'Orvane ne peut pas relire, par exemple un hachage de son identifiant.
- Un lot fait 500 événements au plus : `Clore` en fait autant qu'il faut, et `Deposer` les envoie un par un.
- Les classes : `Instantane`, `Lignee`, `Plan`, `Population`, `Phenotype`, `Biome`, `Evenement`, `Lot`. Les détails (le corps, la vie en groupe, la migration) restent en `JObject`, à lire au besoin : `lignee.Plan.Corps["forme"]`.
- **Les souches** (docs/18) : `inst.Souches()` les rend, les plus répandues d'abord (des `Souche` : `Nom`, `Virulence`, `Transmission`, `Origine`, `Hotes`, `Infectes`, `Parent`, `Vecteur`), `inst.Souche("souche-3")` une seule. `inst.Infection("pheva", "mangrove~3")` rend l'infection d'une lignée dans un biome ou une parcelle, par souche (`I` infectés, `R` immunisés, de 0 à 1), `inst.Infectes("pheva", "mangrove~3", "souche-3")` le nombre de bêtes infectées là, `inst.Foyers("souche-3")` où elle frappe, parcelle par parcelle (des `Foyer`), `inst.EvenementsDeSouches()` ce qui leur est arrivé au dernier cycle (`Evenement.Souche`, `Evenement.Nature` : `Natures.Naissance`, `SautHote`, `Mutation`, `Vecteur`, `Extinction` ; `Evenement.Parcelle`, et pour une extinction `Nom`, `Lieux`, `Hotes` ; `inst.NomDe(evenement)` le nom de sa souche). Une souche mal formée est laissée de côté, sans erreur ; les souches sont lues une fois par instantané. Sur une population : `Infections`, `InfectionsParParcelle`, `Parcelles`.

```csharp
foreach (var f in inst.Foyers("souche-3").Take(3))
    Debug.Log($"{f.Taxon} à {f.Parcelle} : {f.Infectes:0} bêtes infectées ({f.I:P1})");
```

**Hors de Unity** (un serveur de jeu, un outil), le même code avec `HttpClient` : `await new OrvaneHttp(b).LireAsync()`, `await new OrvaneHttp(b).DeposerAsync(compteur, compte)`.

**Les essais** : `dotnet run --project kits/unity/Tests~`. Ils lisent les vrais instantanés du dépôt, vérifient qu'un champ inconnu ne casse rien, comptent, font des lots, les sauvent et les reprennent. Les lots sont ensuite vérifiés contre le contrat (`outils/verifier.js`). Les vérifications de chaque PR les font tourner.

## Godot 4 (`kits/godot/`)

**Installer** : copier `kits/godot/addons/orvane/` dans le dossier `addons/` du projet, puis Projet › Paramètres du projet › Extensions : activer **Orvane**. Le singleton `Orvane` est alors partout.

```gdscript
func _ready() -> void:
	Orvane.cle_jeu = "orv_…"
	Orvane.jeu = "mon-jeu"
	Orvane.instantane_lu.connect(_monde_lu)
	Orvane.lot_depose.connect(func(ok, rep): print("dépôt : ", ok, " ", rep))
	Orvane.lire()

func _monde_lu(inst: Dictionary) -> void:
	for x in Orvane.dans("prairie"):
		print(x.lignee.nom, " : ", x.population.effectif, " bêtes")

func _on_bete_tuee(taxon: String, biome: String) -> void:
	Orvane.compter(taxon, biome, "prelevement")

func _on_sauvegarde() -> void:
	Orvane.garder()                  # ce qui est compté se garde sur l'appareil, sans faire de lot

func _on_fin_de_partie() -> void:   # (ou un moment naturel : un retour au menu, un quart d'heure de jeu)
	Orvane.clore(compte_opaque)
	Orvane.deposer(compte_opaque)
```

- L'instantané reste un `Dictionary`, tel que le contrat le publie : `inst.taxons`, `inst.biomes`, `inst.cycle.n`.
- Les lots pas encore déposés sont gardés dans `user://orvane.json`, et repris au lancement suivant. Ce qui est compté et pas encore clos aussi, dès que le jeu appelle `Orvane.garder()` : à chaque sauvegarde, il ne perd rien s'il est fermé d'un coup, sans faire un lot de plus (Orvane en accepte 48 par joueur et par jour).
- `Orvane.deposer(compte)` dépose un lot à la fois (le plus ancien) : pour vider la file, rappelez-le à chaque `lot_depose` accepté, tant que `Orvane.lots_en_attente()` n'est pas nul.
- Les aides : `vivantes()`, `dans(biome)`, `effectif(lignee, biome)`, `majeur()`, `identite()`.
- **Seulement les lieux qu'on joue** (le monde par morceaux, docs/21) : `var inst = await Orvane.lire_lieux(["foret"])` lit l'index du monde et ces biomes, et rend l'instantané réduit à ces biomes, au même contrat : quelques centaines de Ko au lieu de plusieurs Mo. `Orvane.assembler(index, morceaux)` fait de même avec des morceaux gardés dans le jeu (pour jouer hors ligne).
- **Dessiner les bêtes sans moteur de dessin** : `await Orvane.lire_silhouettes("foret")` lit la planche du lieu (chaque bête dessinée de profil, et ses yeux) ; `Orvane.texture("dunvi", 96.0)` rend l'image d'une lignée à 96 pixels de large (`Image.load_svg_from_string`), `Orvane.yeux("dunvi")` où sont ses yeux dans le cadre de 170 × 90. Une planche gardée dans le jeu : `Orvane.ajouter_planche(biome, silhouettes)`.
- **Les animer** : `Orvane.parties("dunvi", "foret", 96.0)` rend les parties du corps de la lignée (docs/21), dans l'image de 96 pixels : son `corps`, sa `tete` (son `centre`, son `museau`, son `pivot`), son `cou`, sa `queue`, ses `pattes` (chacune de la hanche au pied : ses `points` en `PackedVector2Array`, ses `epaisseurs`, son `cote`, `loin` ou `pres`, son `pied`), ses `bras`, ses `organes` (leur `attache`), ses `yeux`, son `contact` au sol (la ligne de ses pieds), le `bas` de son dessin (son ombre) et sa `boite` (un `Rect2`). Sans largeur, dans le cadre de 170 × 90. Chaque partie dit aussi ses éléments dans le SVG (`svg`), pour qui découpe le dessin, comme Lisière (`jeux/lisiere/scripts/squelette.gd`). Une planche d'avant les parties : `{}`.

```gdscript
var p := Orvane.parties("dunvi", "foret", 96.0)
for patte in p.get("pattes", []):
	var hanche: Vector2 = patte.points[0]
	var pied: Vector2 = patte.points[-1]          # posé au sol
	print(patte.cote, " ", patte.pied, " : ", hanche, " → ", pied)
```
- **Dessiner les plantes, lire le temps qu'il fait** (l'herbier, docs/49) : `await Orvane.lire_herbier("foret")` lit les plantes du lieu, dessinées dans leur stade du cycle ; `Orvane.plantes("foret")` les rend, les plus lourdes d'abord (leur forme, leur port, leur hauteur, leur part) ; `Orvane.texture_plante(id, 96.0, "foret")` rend l'image d'une plante à 96 pixels de large, le pied à 144/150 de sa hauteur ; `Orvane.meteo("foret")` rend le temps du lieu (`temps`, `vent`, `neige`, `secheresse`…), `Orvane.temps("foret")` son nom. Hors ligne : `Orvane.ajouter_herbier(biome, herbier)`.
- `Orvane.lire_json(url)` lit n'importe quel document du monde ; `Orvane.oublier()` efface ce qui a été compté et pas encore clos (une partie d'essai, un jeu qui n'envoie rien).
- **Les souches** (docs/18) : quelles souches vivent, où elles frappent, parcelle par parcelle, et ce qui leur est arrivé au dernier cycle, sans lire le JSON soi-même :

```gdscript
for s in Orvane.souches():                          # les plus répandues d'abord
	print(s.nom, " : ", s.infectes, " bêtes infectées, virulence ", s.virulence)
var g := Orvane.souche("souche-3")                  # { id, nom, virulence, transmission, origine, apparu, hotes, infectes, parent, vecteur }
var I := Orvane.infection("pheva", "mangrove~3")    # au cycle 59 : { "souche-3": { "i": 0.07469, "r": 0.03224 }, "souche-6": { "i": 0.007501, "r": 0.002272 } }
var n := Orvane.infectes("pheva", "mangrove~3", "souche-3")   # le nombre de bêtes infectées là
for f in Orvane.foyers("souche-3"):                 # où elle frappe : { taxon, biome, parcelle, effectif, i, r, infectes }
	print(f.taxon, " à ", f.parcelle, " : ", f.infectes)
for e in Orvane.evenements_souches():               # naissance, saut_hote, mutation, vecteur, extinction
	print(e.nature, " de ", e.nom, " chez ", e.taxon, " ", e.lieux)   # { type, nature, souche, nom, taxon, biome, parcelle, lieux, hotes, detail }
```

  `souches_eveillees()` dit si le monde a ses souches. Une parcelle, dans un instantané d'avant l'infection par parcelle, a l'infection de son biome ; un instantané d'avant les événements de souche n'en dit rien. Une lignée, un lieu ou une souche inconnus donnent une réponse vide. `lire_lieux` (et `assembler`) gardent aussi les parcelles du monde (`inst.parcelles`).

**Vérifié** : la syntaxe GDScript 4 (`gdtoolkit`, à chaque PR). Le kit tourne dans Godot 4.3 avec le premier jeu qui s'en sert, [Lisière](../jeux/lisiere/LISEZ-MOI.md) : son essai sans écran (`outils/godot.sh --headless --path jeux/lisiere -- --essai`). Les aides des souches ont tourné une fois dans Godot 4.3, sans écran, sur le monde publié du cycle 59 et sur ce monde quelques cycles plus loin, au format d'aujourd'hui : sur 960 questions, les mêmes réponses que `moteur/pathogenes.js` et que le kit Unity. **Pas encore vérifié** : un banc du kit lui-même dans Godot, à chaque PR.

## Un serveur (`kits/serveur/`)

Un jeu qui a un serveur (une fonction Supabase en Deno, un serveur Node) peut y déposer ses lots, avec une **clé de dépôt** que le client ne voit jamais, et demander à Orvane de l'exiger (`BRANCHER-UN-JEU.md`, chapitre 6). `kits/serveur/depot.mjs` le fait, sans dépendance, avec `fetch` seulement :

```js
import { deposer } from './depot.mjs';             // Node : import … from 'orvane/serveur', ou require('orvane/serveur') (depot.cjs)
const r = await deposer({ cle: 'orv_…', cleDepot: 'orvdep_…' }, compteOpaque, lot);
// { ok: true, id } · { ok: true, deja: true, id } · { ok: false, erreur, id, plusTard }
```

Il donne un `id` au lot s'il n'en a pas, et le renvoie quand le réseau flanche : un renvoi n'est jamais compté deux fois. Les types sont dans `depot.d.ts`.

**Chaque lot a son id**, dans les deux kits : tiré au hasard quand le lot est clos, gardé avec lui dans la file (et sur l'appareil), il revient tel quel à chaque essai. Un lot renvoyé après une réponse perdue répond `{ ok: true, deja: true }`, et le kit l'oublie. Un lot gardé par une version d'avant en reçoit un au lancement. Un jeu qui dépose depuis son serveur envoie à ce serveur, au lieu de déposer : en Godot, `Orvane.prochain_lot()` (le JSON du prochain lot, avec son `id`) puis `Orvane.oublier_lot(id)` quand le serveur a répondu ; en Unity, `compteur.Prochain()` puis `compteur.Depose()`. **Un lot refusé pour de bon** (hors du contrat, un `id` déjà pris : le renvoyer n'y changerait rien) ne bloque jamais la file : le kit le met de côté et passe au suivant (Godot : `lots_refuses()`, `oublier_lot(id, true)` pour un lot que le serveur du jeu a vu refuser, et `rep.mis_de_cote` dans `lot_depose` ; Unity : `Reponse.Definitif`, `compteur.Refuse()`, `compteur.LotsRefuses`). Les autres refus (le réseau, un quota du jour, une clé) le laissent en tête, pour plus tard. Sur un serveur en C#, `OrvaneHttp` dépose avec la clé de dépôt (`Branchement.CleDepot`) ; elle ne va **jamais** dans un jeu publié.

## Ce qui reste ouvert

- **Faire tourner le moteur dans le jeu** (un monde solo dans Unity ou Godot, docs/19) : aujourd'hui, seulement en JavaScript. Un jeu Unity ou Godot lit le monde partagé et lui écrit, mais ne fait pas encore vivre sa propre copie.
- **Le kit Godot dans Godot** : un banc qui le fasse tourner dans le moteur, sans fenêtre.
- **Les morceaux dans le kit Unity** (`morceaux/`, ne lire que ses biomes) : le kit Godot les lit (`lire_lieux`, `assembler`, plus haut) comme le JavaScript (`tampon/morceaux.js`) ; le kit Unity lit encore l'instantané entier.
