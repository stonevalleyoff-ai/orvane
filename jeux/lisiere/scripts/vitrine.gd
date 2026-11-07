extends Node
# Lisière — la vitrine (scripts/vitrine.gd)
# Une scène jouée toute seule, pour regarder le jeu et le filmer : un lieu, une heure, un feu, des bêtes de chaque sorte, et la
# veilleuse qui fait ce qu'on fait en jouant (attendre au feu, marcher, couper un arbre, cueillir, chasser, se faire mordre).
# Rien n'est vérifié ici (c'est le travail de l'essai) : on regarde.
#   outils/godot.sh --path jeux/lisiere -- --vitrine [--heure jour|soir|nuit] [--duree 12] [--lieu foret]
#   jeux/lisiere/outils/film.sh <dossier> -- --vitrine --heure nuit      (filmée image par image, et sa planche-contact)

const R := preload("res://scripts/regles.gd")

var jeu
var heure := "nuit"
var duree := 12.0
var lieu := "foret"
var _t := 0.0
var _pret := false
var _plan: Array = []          # [debut, fin, geste]
var _fait := {}
var _coup := 0.0


func _ready() -> void:
	jeu = get_parent()
	var a := OS.get_cmdline_user_args()
	for i in a.size() - 1:
		match a[i]:
			"--heure":
				heure = a[i + 1]
			"--duree":
				duree = float(a[i + 1])
			"--lieu":
				lieu = a[i + 1]
	_lancer.call_deferred()


func _lancer() -> void:
	jeu.donnees.hors_ligne_force = true
	await jeu.donnees.charger_index()
	await jeu._commencer(lieu)
	var soir: float = R.DUREE * (1.0 - jeu.part_nuit)
	match heure:
		"jour":
			jeu.horloge = R.TRANSITION + 30.0
		"soir":
			jeu.horloge = soir - R.TRANSITION * 0.6
		_:
			jeu.horloge = soir + 12.0
	var j = jeu.joueur
	j.inventaire["bois"] = 40
	j.inventaire["pierre"] = 12
	j.inventaire["fibre"] = 12
	j.inventaire["baies"] = 3
	if heure != "jour":
		jeu.fabriquer("feu")
		jeu.feux[0].ajouter(3)
	jeu.fabriquer("lance")
	var F: Dictionary = jeu.faune
	for i in 3:
		if not F["proies_jour"].is_empty():
			jeu._creer(F["proies_jour"][i % F["proies_jour"].size()], "proie", j.position + Vector2.from_angle(i * 2.1 + 0.4) * randf_range(170.0, 260.0))
	if not F["rodeurs"].is_empty() and heure != "nuit":
		jeu._creer(F["rodeurs"][0], "rodeur", j.position + Vector2(-300, 120))
	if heure != "jour":
		for i in 2:
			jeu._creer(F["chasseurs_nuit"][i % F["chasseurs_nuit"].size()], "chasseur", j.position + Vector2.from_angle(i * PI + 1.0) * 300.0)
	# le plan de la veilleuse, en fractions de la durée
	_plan = [
		[0.0, 0.18, "attendre"],
		[0.18, 0.4, "tourner"],
		[0.4, 0.52, "couper"],
		[0.52, 0.62, "chasser"],
		[0.62, 0.7, "cueillir"],
		[0.7, 0.82, "torche"],
		[0.82, 1.0, "peur"],
	]
	_pret = true


func _process(delta: float) -> void:
	if not _pret or not jeu.en_partie:
		return
	_t += delta
	var j = jeu.joueur
	j.sante = maxf(j.sante, 60.0)
	var u := _t / duree
	if u >= 1.0:
		get_tree().quit(0)
		return
	var geste := "attendre"
	for p in _plan:
		if u >= p[0] and u < p[1]:
			geste = p[2]
	var centre: Vector2 = jeu.feux[0].position if not jeu.feux.is_empty() else Vector2.ZERO
	match geste:
		"attendre":
			j.deplacer(Vector2.ZERO, delta, jeu.monde)
		"tourner":
			var d: Vector2 = j.position - centre
			if d.length() < 1.0:
				d = Vector2.RIGHT
			var vers := d.normalized().orthogonal() + d.normalized() * (110.0 - d.length()) / 60.0
			j.deplacer(vers.limit_length(1.0), delta, jeu.monde)
		"couper", "cueillir":
			var genres := ["arbre", "sapin"] if geste == "couper" else ["buisson", "touffe"]
			var o = _plus_proche(genres)
			if o != null:
				var d2: Vector2 = o.position + Vector2(0, 16) - j.position
				if d2.length() > 24.0:
					j.deplacer(d2.normalized(), delta, jeu.monde)
				else:
					j.deplacer(Vector2.ZERO, delta, jeu.monde)
					_cadence(geste, delta)
		"chasser":
			if not _fait.has("proie"):
				_fait["proie"] = jeu._creer(jeu.faune["proies_jour"][0], "proie", j.position + Vector2(26, 0))
				_fait["proie"].flair = 0.0
			var b = _fait["proie"]
			if is_instance_valid(b) and b.is_in_group("betes"):
				b.position = j.position + Vector2(26.0 * j.regard, 0)
				_cadence("chasser", delta)
			j.deplacer(Vector2.ZERO, delta, jeu.monde)
		"torche":
			if not _fait.has("torche"):
				_fait["torche"] = true
				jeu.fabriquer("torche")
			j.deplacer(Vector2(-1, 0.3), delta, jeu.monde)
		"peur":
			j.peur = minf(100.0, j.peur + 40.0 * delta)
			if not _fait.has("morsure"):
				var c = _un_chasseur()
				if c != null:
					_fait["morsure"] = true
					jeu.mordre(c)
			j.deplacer(Vector2(0.6, -0.4), delta, jeu.monde)


func _cadence(_quoi: String, delta: float) -> void:
	_coup -= delta
	if _coup <= 0.0:
		_coup = R.CADENCE
		jeu.agir()


func _plus_proche(genres: Array):
	var j = jeu.joueur
	var meilleur = null
	var d0 := INF
	for o in jeu.monde.autour(j.position, 700.0):
		if genres.has(o.genre) and not o.epuise():
			var d: float = j.position.distance_to(o.position)
			if d < d0:
				d0 = d
				meilleur = o
	return meilleur


func _un_chasseur():
	for b in get_tree().get_nodes_in_group("betes"):
		if b.role == "chasseur":
			return b
	for b in get_tree().get_nodes_in_group("betes"):
		if b.role != "echo":
			return b
	return null
