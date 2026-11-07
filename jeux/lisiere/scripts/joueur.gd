extends Node2D
# Lisière — la veilleuse (scripts/joueur.gd)
# Celle qu'on joue : une silhouette encapuchonnée, une écharpe rouille. Sa santé, sa faim, sa peur ; ce qu'elle porte ; sa
# torche, qui éclaire autour d'elle tant qu'elle brûle ; sa lance, qui s'use. Le jeu (scripts/principal.gd) décide de ce qui
# lui arrive ; elle, elle marche et se dessine.

const R := preload("res://scripts/regles.gd")
const Feu := preload("res://scripts/feu.gd")
const CAPE := Color(0.19, 0.21, 0.27)
const ECHARPE := Color(0.62, 0.27, 0.14)
const VISAGE := Color(0.86, 0.8, 0.7)

var sante := 100.0
var faim := 100.0
var peur := 0.0
var inventaire := {"bois": 0, "pierre": 0, "fibre": 0, "baies": 0, "viande": 0, "viande_cuite": 0}
var lance := 0
var torche := 0.0
var regard := 1.0
var en_mouvement := false
var lumiere: PointLight2D
var _pas := 0.0
var _blesse := 0.0
var _geste := 0.0
var _t := 0.0
var morte := false


func _ready() -> void:
	lumiere = PointLight2D.new()
	lumiere.texture = Feu.texture_lumiere()
	lumiere.color = Color(1.0, 0.7, 0.4)
	lumiere.energy = 1.05
	lumiere.position = Vector2(0, -26)
	lumiere.enabled = false
	add_child(lumiere)
	# (un halo très faible, couleur de lune : on voit ses pieds dans le noir, rien de plus ; il ne compte pas comme une lumière)
	var halo := PointLight2D.new()
	halo.texture = Feu.texture_lumiere()
	halo.color = Color(0.55, 0.62, 0.85)
	halo.energy = 0.32
	halo.texture_scale = 60.0 / 128.0
	halo.position = Vector2(0, -16)
	add_child(halo)


func deplacer(dir: Vector2, delta: float, monde) -> void:
	en_mouvement = dir.length() > 0.1
	if en_mouvement:
		if absf(dir.x) > 0.1:
			regard = signf(dir.x)
		var allure := 0.7 if faim <= 0.0 else 1.0
		position = monde.repousser(position + dir.limit_length(1.0) * R.VITESSE * allure * delta, 8.0)
		_pas += delta * 10.0


func blesser(n: float) -> void:
	sante = maxf(0.0, sante - n)
	peur = minf(100.0, peur + 6.0)
	_blesse = 0.2


func frapper() -> void:
	_geste = 0.22


# un geste de récolte : couper (arbre, sapin), casser (rocher), cueillir (buisson), arracher (touffe), ramasser (brindille)
func geste(_genre: String, _vers: Vector2) -> void:
	frapper()


# la santé à zéro : elle tombe (le jeu montre l'écran de fin un peu après)
func mourir() -> void:
	morte = true


func _process(delta: float) -> void:
	_t += delta
	_blesse = maxf(0.0, _blesse - delta)
	_geste = maxf(0.0, _geste - delta)
	lumiere.enabled = torche > 0.0
	if torche > 0.0:
		lumiere.texture_scale = R.RAYON_TORCHE / 128.0 * (1.0 + 0.03 * sin(_t * 11.0) + 0.02 * sin(_t * 5.3))
		lumiere.energy = 1.0 + 0.08 * sin(_t * 9.0)
	modulate = Color(1.0, 0.55, 0.5) if _blesse > 0.0 else Color.WHITE
	queue_redraw()


func _draw() -> void:
	var bob := sin(_pas) * 1.4 if en_mouvement else sin(_t * 2.0) * 0.4
	var j := sin(_pas) * 4.0 if en_mouvement else 0.0
	_ellipse(Vector2(0, 1), 11.0, 4.0, Color(0, 0, 0, 0.3))
	# les jambes
	draw_line(Vector2(-3, -10), Vector2(-3 + j, 0), CAPE.darkened(0.45), 3.0)
	draw_line(Vector2(3, -10), Vector2(3 - j, 0), CAPE.darkened(0.45), 3.0)
	# l'écharpe, qui flotte derrière
	var e := -regard
	var vent := sin(_t * 3.0 + _pas * 0.3) * 2.0
	draw_polyline(PackedVector2Array([Vector2(e * 2.0, -25 + bob), Vector2(e * 8.0, -23 + bob + vent * 0.5), Vector2(e * 14.0, -20 + bob + vent)]), ECHARPE, 3.5)
	# la cape
	draw_colored_polygon(PackedVector2Array([Vector2(-9, -8 + bob), Vector2(9, -8 + bob), Vector2(6, -27 + bob), Vector2(-6, -27 + bob)]), CAPE)
	draw_line(Vector2(-5, -26 + bob), Vector2(5, -26 + bob), ECHARPE, 3.0)
	# la capuche, le visage, les yeux
	draw_circle(Vector2(0, -32 + bob), 8.0, CAPE.darkened(0.25))
	draw_circle(Vector2(regard * 2.6, -31.5 + bob), 5.0, VISAGE)
	draw_circle(Vector2(regard * 4.4, -32.0 + bob), 1.0, Color(0.1, 0.1, 0.12))
	draw_circle(Vector2(regard * 1.4, -32.0 + bob), 1.0, Color(0.1, 0.1, 0.12))
	# ce qu'elle tient
	var main := Vector2(regard * 9.0, -17 + bob)
	var a := -0.9 + (_geste / 0.22) * 1.3
	if torche > 0.0:
		var bout := main + Vector2(regard * 5.0, -14.0)
		draw_line(main, bout, Color(0.35, 0.25, 0.16), 2.5)
		draw_circle(bout + Vector2(0, -3), 4.0 + 0.6 * sin(_t * 17.0), Color(1.0, 0.6, 0.2))
		draw_circle(bout + Vector2(0, -4), 2.2, Color(1.0, 0.92, 0.6))
	elif lance > 0:
		var dir := Vector2(regard * cos(a), sin(a))
		draw_line(main - dir * 10.0, main + dir * 24.0, Color(0.42, 0.31, 0.2), 2.2)
		var p := main + dir * 24.0
		draw_colored_polygon(PackedVector2Array([p + dir * 7.0, p + dir.orthogonal() * 2.5, p - dir.orthogonal() * 2.5]), Color(0.6, 0.6, 0.62))
	elif _geste > 0.0:
		draw_circle(main + Vector2(regard * 6.0, 0), 2.5, VISAGE)


func _ellipse(c: Vector2, rx: float, ry: float, couleur: Color) -> void:
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, couleur)
