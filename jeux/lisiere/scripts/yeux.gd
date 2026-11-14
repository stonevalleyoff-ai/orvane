extends Node2D
# Lisière — ce qui brille dans le noir (scripts/yeux.gd)
# Une couche au-dessus de l'obscurité (une CanvasLayer qui suit la caméra) : la nuit, les yeux des bêtes restées hors de la
# lumière brillent, là où leur planche dit qu'ils sont. Ambre pour un chasseur, pâles pour une proie : on apprend à les lire.
# Chaque œil : un halo doux, un éclat en amande, un cœur plus clair. Ils clignent (la paupière se ferme, chacun à son rythme),
# dérivent un peu (la bête respire, regarde) ; quand la torche les approche, ils la renvoient : plus vifs, avec un reflet.
# Ils s'allument et s'éteignent en douceur, mais la règle tient : seulement la nuit, seulement hors de la lumière.
# Les échos vivent aussi dans cette couche : la nuit ne les cache pas.

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/effets_textures.gd")

var jeu
var _t := 0.0
var _vus := {}
var _bruit := FastNoiseLite.new()


func _ready() -> void:
	material = T.materiau(true, false)
	_bruit.seed = 5
	_bruit.frequency = 1.0


func _process(delta: float) -> void:
	_t += delta
	# (chaque œil vu s'allume ou s'éteint doucement : ce qui n'est plus là, on l'oublie)
	if jeu != null and jeu.en_partie:
		var garder := {}
		var nuit: float = 1.0 - jeu.lumiere_du_jour()
		for b in jeu.get_tree().get_nodes_in_group("betes"):
			if not is_instance_valid(b) or b.role == "echo":
				continue
			var id: int = b.get_instance_id()
			var a := 0.0
			if nuit >= 0.2:
				var l: float = jeu.eclairage(b.point_oeil())
				a = clampf((0.45 - l) / 0.45, 0.0, 1.0) * nuit
			var avant: float = _vus.get(id, 0.0)
			garder[id] = move_toward(avant, a, delta * (5.0 if a < avant else 2.5))
		_vus = garder
	queue_redraw()


func _draw() -> void:
	if jeu == null or not jeu.en_partie:
		return
	var j = jeu.joueur
	for b in jeu.get_tree().get_nodes_in_group("betes"):
		if not is_instance_valid(b) or b.role == "echo":
			continue
		var id: int = b.get_instance_id()
		var a: float = _vus.get(id, 0.0)
		if a <= 0.02:
			continue
		# un clignement, de temps en temps, jamais tous ensemble : la paupière descend et remonte
		var periode := 4.0 + float(id % 53) * 0.07
		var phase := fmod(_t + float(id % 97) * 0.37, periode)
		var paupiere := 1.0
		if phase < 0.18:
			paupiere = absf(phase / 0.18 * 2.0 - 1.0)
		var c := P.OEIL_CHASSEUR if b.role == "chasseur" or b.role == "rodeur" else P.OEIL_PROIE
		var r: float = b.rayon_oeil()
		var p: Vector2 = b.point_oeil()
		# (une dérive légère : la bête respire, la tête bouge un peu)
		var s := float(id % 1000)
		p += Vector2(_bruit.get_noise_2d(_t * 0.6, s), _bruit.get_noise_2d(s, _t * 0.5)) * Vector2(0.9, 0.6) * maxf(1.0, r)
		# la torche, le bord d'un feu : les yeux renvoient la lumière
		var reflet := 0.0
		if j != null and j.torche > 0.0:
			var dt: float = p.distance_to(j.position)
			reflet = clampf(1.0 - (dt - R.RAYON_TORCHE * 0.8) / (R.RAYON_TORCHE * 0.7), 0.0, 1.0)
		for f in jeu.feux:
			if is_instance_valid(f) and f.allume():
				var rf: float = f.rayon()
				reflet = maxf(reflet, 0.55 * clampf(1.0 - (p.distance_to(f.position) - rf * 0.82) / (rf * 0.5), 0.0, 1.0))
		var ecart := maxf(2.4, r * 2.4) * 0.5
		for cote in [-1.0, 1.0]:
			_oeil(p + Vector2(ecart * cote, 0), r, c, a, paupiere, reflet)


func _oeil(o: Vector2, r: float, c: Color, a: float, paupiere: float, reflet: float) -> void:
	# le halo : doux, plus large quand il renvoie la torche
	var h := maxf(r * 6.5, 5.0) * (1.0 + 0.8 * reflet)
	draw_texture_rect(T.point_doux(), Rect2(o - Vector2(h, h * 0.8), Vector2(h * 2.0, h * 1.6)), false, Color(c, a * (0.26 + 0.3 * reflet)))
	if paupiere <= 0.05:
		return
	# l'œil, en amande ; un cœur plus clair ; la paupière l'écrase quand il cligne
	draw_set_transform(o, 0.0, Vector2(1.18, 0.78 * paupiere))
	draw_circle(Vector2.ZERO, r * (1.0 + 0.15 * reflet), Color(c * 0.85, a))
	draw_circle(Vector2(0, -r * 0.1), r * 0.55, Color(c.lightened(0.55), a * (0.85 + 0.15 * reflet)))
	draw_set_transform(Vector2.ZERO)
	# le reflet de la torche : un point blanc, net
	if reflet > 0.05:
		draw_circle(o + Vector2(-r * 0.35, -r * 0.3 * paupiere), maxf(0.6, r * 0.32), Color(1, 1, 1, a * reflet * 0.9))
