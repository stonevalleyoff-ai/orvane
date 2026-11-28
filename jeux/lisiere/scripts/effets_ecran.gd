extends CanvasLayer
# Lisière — ce qui couvre l'écran (scripts/effets_ecran.gd)
# Une couche au-dessus du lieu et des yeux, sous l'interface (layer 5 ; l'interface est à 10, les boutons tactiles à 11) : un
# voile de tout l'écran, qui ne lit pas l'image (shaders/ecran_voile.gdshader : la vignette, la nuit, la morsure, le grain…),
# et, en qualité haute seulement, dessous, une passe qui la lit pour en retirer la couleur (shaders/ecran_post.gdshader) ;
# elle ne s'allume que quand elle sert (la peur, un écho, la fin, un choc) : une copie de l'écran coûte cher.
# Les effets (scripts/effets.gd) les règlent chaque image.
# Ses particules (le souffle de la tombée, le frisson d'un écho) vivent ici, en coordonnées de l'écran.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/effets_textures.gd")
const POST := preload("res://shaders/ecran_post.gdshader")
const VOILE := preload("res://shaders/ecran_voile.gdshader")

var haute := true
var voile: ShaderMaterial
var post: ShaderMaterial
var _voile: ColorRect
var _post: ColorRect
var _air: Node2D


func preparer(qualite: String) -> void:
	haute = qualite == "haute"
	layer = 5
	if haute:
		post = ShaderMaterial.new()
		post.shader = POST
		_post = _plein(post)
		_post.visible = false
	voile = ShaderMaterial.new()
	voile.shader = VOILE
	voile.set_shader_parameter("seul", 0.0 if haute else 1.0)
	_voile = _plein(voile)
	for m in [voile, post]:
		if m == null:
			continue
		m.set_shader_parameter("bruit", T.bruit())
		m.set_shader_parameter("encre", P.NUIT)
		m.set_shader_parameter("ombre", P.NUIT_BLEUE)
		m.set_shader_parameter("sang", P.SANG)
		m.set_shader_parameter("c_peur", P.PEUR)
		m.set_shader_parameter("c_froid", P.LUNE)
		m.set_shader_parameter("c_aube", P.AUBE)
		m.set_shader_parameter("c_echo", P.ECHO)
	_air = Node2D.new()
	add_child(_air)
	visible = false


func _plein(m: ShaderMaterial) -> ColorRect:
	var r := ColorRect.new()
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	r.material = m
	add_child(r)
	return r


func regler(valeurs: Dictionary) -> void:
	for k in valeurs:
		voile.set_shader_parameter(k, valeurs[k])
		if post != null:
			post.set_shader_parameter(k, valeurs[k])


# la passe qui lit l'écran : seulement quand elle a quelque chose à faire
func lire(oui: bool) -> void:
	if _post != null:
		_post.visible = oui


func taille() -> Vector2:
	return get_viewport().get_visible_rect().size if is_inside_tree() else Vector2(1280, 720)


# un souffle qui traverse l'écran (la tombée de la nuit : une brume froide, poussée par le vent)
func souffle(couleur: Color, n: int) -> void:
	var s := taille()
	var g := CPUParticles2D.new()
	g.amount = maxi(2, n)
	g.one_shot = true
	g.explosiveness = 0.55
	g.lifetime = 2.6
	g.lifetime_randomness = 0.3
	g.texture = T.point_doux()
	g.position = Vector2(-60, s.y * 0.5)
	g.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	g.emission_rect_extents = Vector2(40, s.y * 0.55)
	g.direction = Vector2(1, -0.05)
	g.spread = 8.0
	g.initial_velocity_min = s.x * 0.45
	g.initial_velocity_max = s.x * 0.7
	g.damping_min = 40.0
	g.damping_max = 90.0
	g.scale_amount_min = 2.2
	g.scale_amount_max = 4.5
	g.color_ramp = T.rampe([[0.0, Color(couleur, 0.0)], [0.25, Color(couleur, 0.09)], [1.0, Color(couleur, 0.0)]])
	_air.add_child(g)
	g.emitting = true
	get_tree().create_timer(3.4, false).timeout.connect(g.queue_free)


# un frisson : des brins pâles qui filent vers les bords de l'écran
func frisson(couleur: Color, n: int) -> void:
	var s := taille()
	var g := CPUParticles2D.new()
	g.amount = maxi(2, n)
	g.one_shot = true
	g.explosiveness = 0.85
	g.lifetime = 0.9
	g.texture = T.point_doux()
	g.material = T.materiau(true, false)
	g.position = s * 0.5
	g.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	g.emission_sphere_radius = 60.0
	g.spread = 180.0
	g.initial_velocity_min = s.x * 0.35
	g.initial_velocity_max = s.x * 0.6
	g.damping_min = 200.0
	g.damping_max = 400.0
	g.scale_amount_min = 0.3
	g.scale_amount_max = 0.8
	g.particle_flag_align_y = true
	g.color_ramp = T.rampe([[0.0, Color(couleur, 0.0)], [0.2, Color(couleur, 0.22)], [1.0, Color(couleur, 0.0)]])
	_air.add_child(g)
	g.emitting = true
	get_tree().create_timer(1.6, false).timeout.connect(g.queue_free)


func vider() -> void:
	visible = false
	# (la partie suivante commence sur un écran propre : rien de la fin d'avant)
	regler({"peur": 0.0, "coeur": 0.0, "blessure": 0.0, "froid": 0.0, "aube": 0.0, "echo": 0.0, "fin": 0.0, "noir": 0.0})
	for g in _air.get_children():
		g.queue_free()
