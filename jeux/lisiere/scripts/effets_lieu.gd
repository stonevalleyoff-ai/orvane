extends RefCounted
# Lisière — l'air du lieu (scripts/effets_lieu.gd)
# Ce que les effets posent dans la scène du lieu : la couche du sol (sous tout ce qui se tient debout : la lueur des feux, les
# ombres qu'ils poussent), la brume au ras du sol, et l'air autour
# de la veilleuse : des lucioles au crépuscule dans les lieux humides, des feuilles qui tombent au vent en forêt, de la neige
# s'il fait froid. Les éclats et les bouffées (scripts/effets.gd) vont dans « air ».

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/effets_textures.gd")
const R := preload("res://scripts/regles.gd")
const BRUME := preload("res://shaders/brume_sol.gdshader")

var sol: Node2D
var air: Node2D
var _brume_sol: Node2D
var _lucioles: CPUParticles2D
var _feuilles: CPUParticles2D
var _neige: CPUParticles2D
var _derive := Vector2.ZERO
var _q := 1.0


func poser(scene: Node2D, monde: Node2D, qualite: String, axes: Dictionary, palette: Dictionary) -> void:
	_q = 1.0 if qualite == "haute" else 0.45
	var froid: bool = palette.get("froid", false)
	sol = Node2D.new()
	sol.name = "EffetsSol"
	scene.add_child(sol)
	scene.move_child(sol, monde.get_index())
	_brume_sol = _nappe(0.0024, 0.45)
	scene.add_child(_brume_sol)
	scene.move_child(_brume_sol, monde.get_index())
	air = Node2D.new()
	air.name = "EffetsAir"
	scene.add_child(air)
	if float(axes.get("humidite", 0.5)) > 0.6 and not froid:
		_lucioles = _lucioles_()
		air.add_child(_lucioles)
	if float(axes.get("couvert", 0.4)) > 0.45 and not froid:
		var f: Color = palette.get("feuilles", P.MOUSSE)
		_feuilles = _feuilles_(f)
		air.add_child(_feuilles)
	if froid:
		_neige = _neige_()
		air.add_child(_neige)


func vider() -> void:
	sol = null
	air = null
	_brume_sol = null
	_lucioles = null
	_feuilles = null
	_neige = null


# chaque image : e = {nuit, peur, vent, centre, vue, lucioles, brume_matin, obscur, lumieres}
func maj(delta: float, e: Dictionary) -> void:
	if sol == null or not is_instance_valid(sol):
		return
	var nuit: float = e["nuit"]
	var peur: float = e["peur"]
	var vent: float = e["vent"]
	_derive += Vector2(8.0 + vent * 30.0, 2.5) * delta
	# (une brume presque blanche : elle prend la couleur de ce qui l'éclaire, bleue dans le noir, chaude près d'un feu)
	var c := P.PAPIER.lerp(P.IVOIRE.lerp(P.LUNE, 0.3).darkened(0.2), clampf(nuit * 1.3, 0.0, 1.0))
	_regler(_brume_sol, lerpf(0.025, 0.2, nuit) + 0.2 * peur * nuit + float(e["brume_matin"]) * 0.06, c, 1.0)
	var m: ShaderMaterial = _brume_sol.material
	var lu: Array = e["lumieres"]
	m.set_shader_parameter("obscur", e["obscur"])
	m.set_shader_parameter("feu0", lu[0])
	m.set_shader_parameter("feu1", lu[1])
	m.set_shader_parameter("torche", lu[2])
	# l'air suit la vue : les particules naissent autour de ce qu'on voit, et restent où elles sont nées
	var centre: Vector2 = e["centre"]
	var vue: Vector2 = e["vue"]
	for p in [_lucioles, _feuilles, _neige]:
		if p != null:
			p.position = centre + Vector2(0, -vue.y * (0.1 if p == _feuilles or p == _neige else 0.0))
			p.emission_rect_extents = vue * 0.5 + Vector2(60, 60)
	if _lucioles != null:
		var l: float = e["lucioles"]
		_lucioles.emitting = l > 0.02
		_lucioles.self_modulate = Color(1, 1, 1, l)
	if _feuilles != null:
		_feuilles.gravity = Vector2(vent * 40.0, 26.0)
	if _neige != null:
		_neige.gravity = Vector2(vent * 34.0, 20.0)


func _regler(n: Node2D, densite: float, couleur: Color, decale: float) -> void:
	# (une nappe trop mince pour se voir ne se dessine pas)
	n.visible = densite > 0.008
	var m: ShaderMaterial = n.material
	m.set_shader_parameter("densite", clampf(densite, 0.0, 0.7))
	m.set_shader_parameter("couleur", couleur)
	m.set_shader_parameter("derive", -_derive * decale)


func _nappe(echelle: float, seuil: float) -> Node2D:
	var n := Nappe.new()
	var m := ShaderMaterial.new()
	m.shader = BRUME
	m.set_shader_parameter("bruit", T.bruit())
	m.set_shader_parameter("echelle", echelle)
	m.set_shader_parameter("seuil", seuil)
	m.set_shader_parameter("c_feu", P.BRAISE.lerp(P.BRAISE_COEUR, 0.3))
	n.material = m
	return n


func _lucioles_() -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.amount = maxi(6, int(22 * _q))
	p.lifetime = 5.0
	p.lifetime_randomness = 0.4
	p.preprocess = 4.0
	p.local_coords = false
	p.texture = T.point_doux()
	p.material = T.materiau(true, false)
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.spread = 180.0
	p.gravity = Vector2(0, -2)
	p.initial_velocity_min = 4.0
	p.initial_velocity_max = 14.0
	p.tangential_accel_min = -6.0
	p.tangential_accel_max = 6.0
	p.scale_amount_min = 0.1
	p.scale_amount_max = 0.16
	# (elles s'allument et s'éteignent deux fois dans leur vie)
	var c := P.BRAISE_COEUR.lerp(P.MOUSSE, 0.35)
	p.color_ramp = T.rampe([[0.0, Color(c, 0.0)], [0.15, Color(c, 0.9)], [0.3, Color(c, 0.05)], [0.55, Color(c, 0.0)], [0.7, Color(c, 0.85)], [0.88, Color(c, 0.0)], [1.0, Color(c, 0.0)]])
	return p


func _feuilles_(f: Color) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.amount = maxi(4, int(12 * _q))
	p.lifetime = 5.5
	p.lifetime_randomness = 0.3
	p.preprocess = 5.0
	p.local_coords = false
	p.texture = T.feuille()
	p.material = T.materiau(false, true)
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.direction = Vector2(0.3, 1)
	p.spread = 30.0
	p.initial_velocity_min = 6.0
	p.initial_velocity_max = 16.0
	p.angle_min = 0.0
	p.angle_max = 360.0
	p.angular_velocity_min = -90.0
	p.angular_velocity_max = 90.0
	p.tangential_accel_min = -8.0
	p.tangential_accel_max = 8.0
	p.scale_amount_min = 0.45
	p.scale_amount_max = 0.75
	p.color_initial_ramp = T.rampe([[0.0, f.lightened(0.15)], [0.5, f.lerp(P.TERRE, 0.35).lightened(0.2)], [0.8, P.BRAISE.lerp(P.TERRE, 0.55)], [1.0, f.darkened(0.2)]])
	p.color_ramp = T.rampe([[0.0, Color(1, 1, 1, 0)], [0.1, Color(1, 1, 1, 1)], [0.85, Color(1, 1, 1, 1)], [1.0, Color(1, 1, 1, 0)]])
	return p


func _neige_() -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.amount = maxi(14, int(70 * _q))
	p.lifetime = 7.0
	p.lifetime_randomness = 0.3
	p.preprocess = 7.0
	p.local_coords = false
	p.texture = T.point_doux()
	p.material = T.materiau(false, true)
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.direction = Vector2(0.2, 1)
	p.spread = 25.0
	p.initial_velocity_min = 4.0
	p.initial_velocity_max = 12.0
	p.tangential_accel_min = -5.0
	p.tangential_accel_max = 5.0
	p.scale_amount_min = 0.06
	p.scale_amount_max = 0.13
	p.color_ramp = T.rampe([[0.0, Color(P.PAPIER, 0.0)], [0.12, Color(P.PAPIER.lightened(0.4), 0.9)], [0.85, Color(P.PAPIER.lightened(0.4), 0.8)], [1.0, Color(P.PAPIER, 0.0)]])
	return p


# une nappe de brume : un grand rectangle qui couvre le lieu et ses abords ; le shader fait le reste
class Nappe extends Node2D:
	const RG := preload("res://scripts/regles.gd")

	func _draw() -> void:
		var d := RG.DEMI + 1400.0
		draw_rect(Rect2(-d, -d, d * 2.0, d * 2.0), Color.WHITE)
