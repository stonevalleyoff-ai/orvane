extends SceneTree
# Lisière — les deux lectures du squelette (outils/squelettes.gd)
# Chaque bête de chaque planche donnée (morceaux/silhouettes/<biome>.json, docs/21) est lue deux fois, à deux largeurs : dans ses
# parties, puis dans son SVG (l'ancienne lecture, celle d'une vieille planche). Les deux doivent donner le même squelette : les
# mêmes calques, les mêmes pattes (leur côté, leur rang, leur sens, leurs points, leurs morceaux) : scripts/squelette.gd, ecart.
# Par défaut, les planches gardées dans le jeu (donnees/silhouettes/).
#   outils/godot.sh --headless --path jeux/lisiere --script res://outils/squelettes.gd [-- <dossier ou planche.json>…]
# Il sort avec le code 0 si tout s'accorde.

const Squelette := preload("res://scripts/squelette.gd")
const LARGEURS := [48.0, 150.0]       # (une petite bête, et la plus grande que montre le jeu : bete.gd, largeur)


func _init() -> void:
	var chemins: Array = OS.get_cmdline_user_args()
	if chemins.is_empty():
		chemins = [ProjectSettings.globalize_path("res://donnees/silhouettes")]
	var fichiers := []
	for c in chemins:
		if DirAccess.dir_exists_absolute(c):
			for f in DirAccess.get_files_at(c):
				if f.ends_with(".json"):
					fichiers.append(c.path_join(f))
		else:
			fichiers.append(c)
	var betes := 0
	var pattes := 0
	var anciennes := 0
	var dessins := {}
	var ecarts := []
	for f in fichiers:
		var P = JSON.parse_string(FileAccess.get_file_as_string(f))
		if typeof(P) != TYPE_DICTIONARY or typeof(P.get("silhouettes")) != TYPE_DICTIONARY:
			ecarts.append("%s : planche illisible" % f)
			continue
		for id in P["silhouettes"]:
			var s: Dictionary = P["silhouettes"][id]
			if typeof(s.get("parties")) != TYPE_DICTIONARY:
				anciennes += 1
				continue
			betes += 1
			var d := str(s["parties"].get("dessin", "?"))
			dessins[d] = int(dessins.get(d, 0)) + 1
			for L in LARGEURS:
				var a := Squelette.analyser(s, L)
				var b := Squelette.analyser(s, L, false)
				var m := Squelette.ecart(a, b)
				if a.get("lu", "") != "parties":
					m = "lu dans le SVG malgré ses parties"
				if m != "":
					ecarts.append("%s/%s (%s, %d px) : %s" % [f.get_file().get_basename(), id, d, int(L), m])
					continue
				if L == LARGEURS[0]:
					pattes += a.get("pattes", []).size()
	var formes := PackedStringArray()
	for d in dessins:
		formes.append("%s %d" % [d, dessins[d]])
	print("Lisière — les deux lectures du squelette : %d planches, %d bêtes avec leurs parties (%s), %d pattes, à %s pixels" % [fichiers.size(), betes, ", ".join(formes), pattes, " et ".join(PackedStringArray(LARGEURS.map(func(x): return str(int(x)))))])
	if anciennes > 0:
		print("  (%d bêtes sans parties : de vieilles planches, lues dans leur SVG)" % anciennes)
	for m in ecarts.slice(0, 20):
		print("  ✗ " + m)
	var ok := ecarts.is_empty() and betes > 0
	print(("  ✓ " if ok else "  ✗ ") + "lues dans leurs parties ou dans leur SVG, les bêtes ont le même squelette (%d écarts) : les mêmes pattes, les mêmes points, les mêmes pieds, les mêmes calques" % ecarts.size())
	quit(0 if ok else 1)
