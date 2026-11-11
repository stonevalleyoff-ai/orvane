extends Node2D
# Lisière — un feu de camp (scripts/feu.gd)
# Il brûle son bois (compté en secondes de feu), éclaire d'autant plus qu'il en a, et tient les bêtes à distance : un chasseur
# n'entre pas dans sa lumière. Éteint, il reste un cercle de pierres et des cendres : une bûche le rallume.

const R := preload("res://scripts/regles.gd")
const RAYON_MIN := 90.0

static var _texture_lumiere: GradientTexture2D

var bois := R.FEU_DEPART
var jeu
var lumiere: PointLight2D
var etincelles: CPUParticles2D
var _t := 0.0
var _graine := 0


static func texture_lumiere() -> GradientTexture2D:
	if _texture_lumiere == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		g.add_point(0.55, Color(1, 1, 1, 0.62))
		var t := GradientTexture2D.new()
		t.gradient = g
		t.width = 256
		t.height = 256
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		_texture_lumiere = t
	return _texture_lumiere


func _ready() -> void:
	_graine = randi()
	lumiere = PointLight2D.new()
	lumiere.texture = texture_lumiere()
	lumiere.color = Color(1.0, 0.72, 0.42)
	lumiere.energy = 1.25
	lumiere.position = Vector2(0, -10)
	add_child(lumiere)
	etincelles = CPUParticles2D.new()
	etincelles.amount = 16
	etincelles.lifetime = 1.3
	etincelles.position = Vector2(0, -14)
	etincelles.direction = Vector2(0, -1)
	etincelles.spread = 22.0
	etincelles.gravity = Vector2(0, -25)
	etincelles.initial_velocity_min = 18.0
	etincelles.initial_velocity_max = 46.0
	etincelles.scale_amount_min = 1.2
	etincelles.scale_amount_max = 2.6
	etincelles.color = Color(1.0, 0.62, 0.25)
	add_child(etincelles)


func allume() -> bool:
	return bois > 0.0


func rayon() -> float:
	return RAYON_MIN + bois * 1.8 if bois > 0.0 else 0.0


# combien un point est éclairé par ce feu, de 0 à 1 (pleine lumière jusqu'aux trois cinquièmes du rayon)
func eclaire(p: Vector2) -> float:
	if bois <= 0.0:
		return 0.0
	var r := rayon()
	return clampf((r - p.distance_to(position)) / (r * 0.4), 0.0, 1.0)


func ajouter(buches: int) -> void:
	bois = minf(R.FEU_MAX, bois + R.FEU_BUCHE * buches)


func _process(delta: float) -> void:
	if jeu != null and jeu.en_pause:
		return
	_t += delta
	if bois > 0.0:
		bois = maxf(0.0, bois - delta * (float(jeu.feu_temps) if jeu != null else 1.0))   # (le temps qu'il fait : scripts/regles.gd, FEU_TEMPS)
	var vif := bois > 0.0
	lumiere.enabled = vif
	etincelles.emitting = vif
	if vif:
		lumiere.energy = 1.2 + 0.1 * sin(_t * 13.0) + 0.07 * sin(_t * 7.3 + 1.0)
		lumiere.texture_scale = rayon() / 128.0 * (1.0 + 0.015 * sin(_t * 9.0))
	queue_redraw()


func _draw() -> void:
	var r := RandomNumberGenerator.new()
	r.seed = _graine
	# le cercle de pierres
	for i in 8:
		var a := TAU * i / 8.0 + r.randf_range(-0.15, 0.15)
		var p := Vector2(cos(a) * 17.0, sin(a) * 7.0)
		_ellipse(p, r.randf_range(4.0, 5.5), r.randf_range(3.0, 4.0), Color(0.36, 0.35, 0.34).darkened(r.randf_range(0.0, 0.3)))
	# les bûches, croisées
	draw_line(Vector2(-13, 2), Vector2(12, -5), Color(0.27, 0.19, 0.13), 5.0)
	draw_line(Vector2(-11, -5), Vector2(13, 2), Color(0.32, 0.23, 0.15), 5.0)
	if bois <= 0.0:
		_ellipse(Vector2(0, -1), 10.0, 4.0, Color(0.22, 0.21, 0.2))
		for i in 4:
			draw_circle(Vector2(r.randf_range(-7, 7), r.randf_range(-3, 1)), 1.2, Color(0.8, 0.25, 0.08, 0.5 + 0.4 * sin(_t * 3.0 + i)))
		return
	# la flamme : trois langues, de l'orange au presque blanc
	var h := 14.0 + minf(bois, 120.0) * 0.14
	for c in [[1.0, Color(0.92, 0.36, 0.1)], [0.68, Color(1.0, 0.66, 0.2)], [0.38, Color(1.0, 0.92, 0.65)]]:
		var k: float = c[0]
		var pts := PackedVector2Array()
		var n := 9
		for i in n + 1:
			var u := float(i) / n
			var a := PI * u
			var vague := sin(_t * 11.0 + u * 7.0) * 2.0 * k
			pts.append(Vector2(-cos(a) * 9.0 * k + vague * 0.4, sin(a) * 4.0 * k - 2.0))
		pts.append(Vector2(sin(_t * 8.0) * 3.0 * k, -h * k - 4.0))
		draw_colored_polygon(pts, c[1])


func _ellipse(c: Vector2, rx: float, ry: float, couleur: Color) -> void:
	var pts := PackedVector2Array()
	for i in 14:
		var a := TAU * i / 14.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, couleur)
