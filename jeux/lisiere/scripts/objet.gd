extends Node2D
# Lisière — ce qui pousse et ce qui gît (scripts/objet.gd)
# Un arbre (du bois, puis une souche), un rocher (des pierres), un buisson (des baies, qui repoussent), une touffe (des fibres,
# qui repoussent), une brindille (un bois, ramassé d'un geste). Chacun dessiné une fois, d'après sa graine : deux arbres ne se
# ressemblent pas. L'origine du nœud est son pied : le monde les trie par hauteur, le joueur passe derrière les troncs.

const BUTIN := {"arbre": "bois", "sapin": "bois", "souche": "", "rocher": "pierre", "buisson": "baies", "touffe": "fibre", "brindille": "bois"}
const REPOUSSE := 240.0

var genre := "arbre"
var reste := 4
var plein := 4
var rayon := 0.0
var teinte := Color(0.2, 0.3, 0.18)
var graine := 0
var _repousse := 0.0
var _secoue := 0.0
# (docs/49) une plante du monde d'Orvane : son dessin de l'herbier, à sa taille ; sans lui, l'objet se dessine lui-même
var image: Texture2D = null
var plante := ""


func preparer(g: String, couleur: Color, s: int) -> void:
	genre = g
	teinte = couleur
	graine = s
	match g:
		"arbre", "sapin":
			plein = 4
			rayon = 11.0
		"rocher":
			plein = 3
			rayon = 15.0
		"buisson":
			plein = 3
		"touffe":
			plein = 2
		_:
			plein = 1
	reste = plein
	set_process(false)


# un geste : ce qu'il donne ({ "bois": 1 }), ou rien
func recolter() -> Dictionary:
	if reste <= 0:
		return {}
	reste -= 1
	var item: String = BUTIN.get(genre, "")
	if (genre == "arbre" or genre == "sapin") and reste <= 0:
		genre = "souche"
		rayon = 6.0
	elif (genre == "buisson" or genre == "touffe") and reste <= 0:
		_repousse = REPOUSSE
	_secoue = 0.3
	set_process(true)
	queue_redraw()
	return {item: 1} if item != "" else {}


func epuise() -> bool:
	return reste <= 0


func _process(delta: float) -> void:
	_secoue = maxf(0.0, _secoue - delta)
	if _repousse > 0.0:
		_repousse -= delta
		if _repousse <= 0.0:
			reste = plein
			queue_redraw()
	if _secoue > 0.0:
		queue_redraw()
	elif _repousse <= 0.0:
		set_process(false)
		queue_redraw()


func _draw() -> void:
	var r := RandomNumberGenerator.new()
	r.seed = graine
	var bouge := sin(_secoue * 40.0) * _secoue * 6.0
	if image != null and ["arbre", "sapin", "buisson", "touffe"].has(genre):
		_plante(r, bouge)
		return
	match genre:
		"arbre":
			_arbre(r, bouge)
		"sapin":
			_sapin(r, bouge)
		"souche":
			_ellipse(Vector2(0, 1), 12.0, 4.0, Color(0, 0, 0, 0.25))
			_ellipse(Vector2(0, -2), 6.0, 3.0, Color(0.3, 0.22, 0.15))
			_ellipse(Vector2(0, -3), 4.5, 2.0, Color(0.55, 0.45, 0.3))
		"rocher":
			_rocher(r)
		"buisson":
			_buisson(r, bouge)
		"touffe":
			_touffe(r, bouge)
		"brindille":
			for i in 3:
				var a := r.randf_range(-0.5, 0.5) + (PI if i == 1 else 0.0)
				var l := r.randf_range(7.0, 11.0)
				draw_line(Vector2.ZERO - Vector2.from_angle(a) * l, Vector2.from_angle(a) * l, Color(0.36, 0.26, 0.17), 2.0)


# une plante de l'herbier : son ombre, son dessin posé sur son pied (à 144/150 de sa hauteur) ; un buisson montre ses baies, une
# touffe coupée reste rase
func _plante(r: RandomNumberGenerator, bouge: float) -> void:
	var t := image.get_size()
	if genre == "touffe" and reste <= 0:
		t *= 0.4
	_ellipse(Vector2(0, 2), t.x * 0.3, t.x * 0.09, Color(0, 0, 0, 0.26))
	draw_texture_rect(image, Rect2(Vector2(-t.x * 0.5 + bouge, -t.y * 0.96), t), false)
	if genre == "buisson":
		for i in reste * 2:
			draw_circle(Vector2(r.randf_range(-t.x * 0.3, t.x * 0.3), -t.y * r.randf_range(0.25, 0.6)), 2.2, Color(0.66, 0.12, 0.2))


func _arbre(r: RandomNumberGenerator, bouge: float) -> void:
	_ellipse(Vector2(0, 2), 26.0, 8.0, Color(0, 0, 0, 0.28))
	var tronc := Color(0.23, 0.17, 0.12)
	draw_colored_polygon(PackedVector2Array([Vector2(-5, 0), Vector2(-3.5, -28), Vector2(3.5, -28), Vector2(5, 0)]), tronc)
	draw_line(Vector2(-1, -14), Vector2(-9, -24), tronc, 2.5)
	var feuillage: Array = []
	for i in 5:
		feuillage.append([Vector2(r.randf_range(-15, 15) + bouge, -40.0 + r.randf_range(-12, 8)), r.randf_range(14.0, 21.0), r.randf_range(-0.12, 0.1)])
	for f in feuillage:
		draw_circle(f[0], f[1] + 2.5, teinte.darkened(0.55))
	for f in feuillage:
		draw_circle(f[0], f[1], teinte.lightened(f[2]) if f[2] > 0.0 else teinte.darkened(-f[2]))
	for f in feuillage:
		draw_circle(f[0] + Vector2(-f[1] * 0.3, -f[1] * 0.35), f[1] * 0.35, teinte.lightened(0.12))


func _sapin(r: RandomNumberGenerator, bouge: float) -> void:
	_ellipse(Vector2(0, 2), 18.0, 6.0, Color(0, 0, 0, 0.28))
	draw_colored_polygon(PackedVector2Array([Vector2(-3, 0), Vector2(-2, -12), Vector2(2, -12), Vector2(3, 0)]), Color(0.22, 0.16, 0.11))
	var h := r.randf_range(52.0, 70.0)
	for i in 3:
		var bas := -10.0 - i * h * 0.24
		var w := 20.0 - i * 4.5
		var pts := PackedVector2Array([Vector2(-w, bas), Vector2(w, bas), Vector2(bouge * (i + 1) * 0.4, bas - h * 0.42)])
		draw_colored_polygon(pts, teinte.darkened(0.12 * (2 - i)))
		draw_line(Vector2(-w, bas), Vector2(bouge * (i + 1) * 0.4, bas - h * 0.42), teinte.darkened(0.5), 1.5)


func _rocher(r: RandomNumberGenerator) -> void:
	var t := 1.0 if reste > 0 else 0.6
	_ellipse(Vector2(0, 2), 20.0 * t, 6.0 * t, Color(0, 0, 0, 0.25))
	var pts := PackedVector2Array()
	for i in 8:
		var a := PI + PI * i / 7.0
		pts.append(Vector2(cos(a) * r.randf_range(14.0, 19.0) * t, sin(a) * r.randf_range(10.0, 15.0) * t))
	draw_colored_polygon(pts, teinte)
	draw_polyline(pts, teinte.darkened(0.45), 1.5)
	draw_colored_polygon(PackedVector2Array([pts[2], pts[3], pts[4], Vector2(pts[4].x, pts[4].y * 0.5)]), teinte.lightened(0.15))


func _buisson(r: RandomNumberGenerator, bouge: float) -> void:
	_ellipse(Vector2(0, 2), 16.0, 5.0, Color(0, 0, 0, 0.25))
	var feuilles := teinte.darkened(0.15)
	var bulles: Array = []
	for i in 4:
		bulles.append([Vector2(r.randf_range(-9, 9) + bouge, -8.0 + r.randf_range(-5, 2)), r.randf_range(7.0, 10.0)])
	for b in bulles:
		draw_circle(b[0], b[1] + 1.5, feuilles.darkened(0.5))
	for b in bulles:
		draw_circle(b[0], b[1], feuilles)
	for i in reste * 2:
		draw_circle(Vector2(r.randf_range(-10, 10), -8.0 + r.randf_range(-6, 3)), 2.2, Color(0.66, 0.12, 0.2))


func _touffe(r: RandomNumberGenerator, bouge: float) -> void:
	var h := 15.0 if reste > 0 else 5.0
	var c := teinte.lightened(0.18)
	for i in 8:
		var x := r.randf_range(-7, 7)
		var pointe := Vector2(x * 1.6 + bouge + r.randf_range(-3, 3), -h * r.randf_range(0.7, 1.1))
		draw_polyline(PackedVector2Array([Vector2(x, 0), Vector2(x * 1.2, pointe.y * 0.5), pointe]), c.darkened(r.randf_range(0.0, 0.3)), 1.6)


func _ellipse(c: Vector2, rx: float, ry: float, couleur: Color) -> void:
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, couleur)
