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
	Orvane.clore(compte_opaque)
	Orvane.deposer(compte_opaque)
```

- L'instantané reste un `Dictionary`, tel que le contrat le publie : `inst.taxons`, `inst.biomes`, `inst.cycle.n`.
- Les lots pas encore déposés sont gardés dans `user://orvane.json`, et repris au lancement suivant.
- Les aides : `vivantes()`, `dans(biome)`, `effectif(lignee, biome)`, `majeur()`, `identite()`.
- **Seulement les lieux qu'on joue** (le monde par morceaux, docs/21) : `var inst = await Orvane.lire_lieux(["foret"])` lit l'index du monde et ces biomes, et rend l'instantané réduit à ces biomes, au même contrat : quelques centaines de Ko au lieu de plusieurs Mo. `Orvane.assembler(index, morceaux)` fait de même avec des morceaux gardés dans le jeu (pour jouer hors ligne).
- **Dessiner les bêtes sans moteur de dessin** : `await Orvane.lire_silhouettes("foret")` lit la planche du lieu (chaque bête dessinée de profil, et ses yeux) ; `Orvane.texture("dunvi", 96.0)` rend l'image d'une lignée à 96 pixels de large (`Image.load_svg_from_string`), `Orvane.yeux("dunvi")` où sont ses yeux dans le cadre de 170 × 90. Une planche gardée dans le jeu : `Orvane.ajouter_planche(biome, silhouettes)`.
- `Orvane.lire_json(url)` lit n'importe quel document du monde ; `Orvane.oublier()` efface ce qui a été compté et pas encore clos (une partie d'essai, un jeu qui n'envoie rien).

**Vérifié** : la syntaxe GDScript 4 (`gdtoolkit`, à chaque PR). **Pas encore vérifié** : le kit n'a pas tourné dans Godot lui-même. Le premier jeu Godot qui s'en sert, [Lisière](../jeux/lisiere/LISEZ-MOI.md), le dira : son essai sans écran (`outils/godot.sh --headless --path jeux/lisiere -- --essai`) fait tourner le kit dans Godot 4.3.

## Ce qui reste ouvert

- **Faire tourner le moteur dans le jeu** (un monde solo dans Unity ou Godot, docs/19) : aujourd'hui, seulement en JavaScript. Un jeu Unity ou Godot lit le monde partagé et lui écrit, mais ne fait pas encore vivre sa propre copie.
- **Le kit Godot dans Godot** : un banc qui le fasse tourner dans le moteur, sans fenêtre.
- **Les morceaux** (`morceaux/`, ne lire que ses biomes) : en JavaScript seulement (`tampon/morceaux.js`).
