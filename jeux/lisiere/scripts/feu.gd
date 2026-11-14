extends Node2D
# Lisière — un feu de camp (scripts/feu.gd)
# Il brûle son bois (compté en secondes de feu), éclaire d'autant plus qu'il en a, et tient les bêtes à distance : un chasseur
# n'entre pas dans sa lumière. Éteint, il reste un cercle de pierres et des cendres : une bûche le rallume.
# Ce qu'on en voit : des flammes en deux langues (shaders/feu_flamme.gdshader), des braises qui rougeoient dans le foyer, des
# étincelles qui montent, des cendres, une fumée qui dérive au vent, une lueur au sol, et l'ombre de ce qui l'entoure, poussée
# par sa lumière, et l'air qui tremble au-dessus des pointes. Le bord visible de sa lumière est le bord de la zone sûre : les
# chasseurs s'arrêtent aux 0,85 du rayon.
# Un feu qui meurt rapetisse, rougit et fume ; mort, ses braises s'éteignent une à une, puis la fumée.

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/effets_textures.gd")
const FLAMME := preload("res://shaders/feu_flamme.gdshader")
const RAYON_MIN := 90.0
const BRAISES_DUREE := 26.0     # secondes : les braises d'un feu mort
const FUMEE_DUREE := 16.0       # secondes : sa dernière fumée

static var _texture_lumiere: GradientTexture2D

var bois := R.FEU_DEPART
var jeu
var lumiere: PointLight2D
var etincelles: CPUParticles2D
var fumee: CPUParticles2D
var cendres: CPUParticles2D
var _flammes: Sprite2D
var _foyer: Node2D
var _devant: Node2D
var _sol: Node2D
var _lueur: Sprite2D
var _bruit := FastNoiseLite.new()
var _t := 0.0
var _graine := 0
var _eteint := 999.0
var _avive := 0.0
var _vif := 0.0
var _pierres: Array = []
var _braises: Array = []
var _cle := ""
var _ombres: Array = []
var _ombres_t := 0.0
var _mobile := false


# la lumière d'un feu (et celle de la torche) : vive au centre, qui baisse doucement, puis un bord qu'on lit, vers les 0,85
# du rayon (là où les chasseurs s'arrêtent)
static func texture_lumiere() -> GradientTexture2D:
	if _texture_lumiere == null:
		var g := Gradient.new()
		var pas := [[0.0, 1.0], [0.12, 0.9], [0.3, 0.7], [0.5, 0.54], [0.66, 0.44], [0.76, 0.36], [0.82, 0.25], [0.87, 0.12], [0.93, 0.04], [1.0, 0.0]]
		g.offsets = PackedFloat32Array(pas.map(func(x): return float(x[0])))
		g.colors = PackedColorArray(pas.map(func(x): return Color(1, 1, 1, float(x[1]))))
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
	_bruit.seed = _graine
	_bruit.frequency = 1.0
	_mobile = jeu != null and jeu.qualite == "mobile"
	_preparer_foyer()
	# la lueur au sol et les ombres : sous tout ce qui se tient dans le lieu (la couche du sol des effets)
	_sol = Sol.new()
	_sol.feu = self
	var couche = jeu.effets.sol if jeu != null and jeu.effets != null else null
	if couche != null and is_instance_valid(couche):
		_sol.position = position
		couche.add_child(_sol)
	else:
		_sol.show_behind_parent = true
		add_child(_sol)
	_lueur = Sprite2D.new()
	_lueur.texture = T.lueur()
	_lueur.material = T.materiau(true, false)
	_sol.add_child(_lueur)
	lumiere = PointLight2D.new()
	lumiere.texture = texture_lumiere()
	lumiere.color = P.BRAISE.lerp(P.BRAISE_COEUR, 0.3)
	lumiere.energy = 1.3
	lumiere.position = Vector2(0, -10)
	add_child(lumiere)
	_foyer = Calque.new()
	_foyer.feu = self
	_foyer.quoi = "braises"
	_foyer.material = T.materiau(true, false)
	add_child(_foyer)
	_flammes = Sprite2D.new()
	_flammes.texture = T.blanc()
	_flammes.centered = false
	_flammes.offset = Vector2(-2, -4)
	_flammes.position = Vector2(0, 1)
	var m := ShaderMaterial.new()
	m.shader = FLAMME
	m.set_shader_parameter("graine", float(_graine % 1000) * 0.13)
	m.set_shader_parameter("rouge", P.BRAISE_ROUGE)
	m.set_shader_parameter("braise", P.BRAISE)
	m.set_shader_parameter("coeur", P.BRAISE_COEUR)
	_flammes.material = m
	add_child(_flammes)
	_devant = Calque.new()
	_devant.feu = self
	_devant.quoi = "devant"
	add_child(_devant)
	_particules()
	_maj(0.0)


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
	var mort := bois <= 0.0
	bois = minf(R.FEU_MAX, bois + R.FEU_BUCHE * buches)
	# une bûche : le feu s'avive ; sur des cendres, il reprend dans une gerbe
	if mort:
		gerbe(1.0)
	else:
		_avive = maxf(_avive, 0.7)
		gerbe(0.45)


# le feu s'avive un instant (la nuit tombe, une bûche) : plus haut, plus clair
func aviver() -> void:
	if bois > 0.0:
		_avive = 1.0
		gerbe(0.6)


# une gerbe d'étincelles (force : de 0 à 1)
func gerbe(force: float) -> void:
	_avive = maxf(_avive, force)
	if not is_inside_tree():
		return
	var g := CPUParticles2D.new()
	g.amount = maxi(4, int((12 if _mobile else 30) * force))
	g.one_shot = true
	g.explosiveness = 0.9
	g.lifetime = 1.3
	g.lifetime_randomness = 0.5
	g.texture = T.etincelle()
	g.material = T.materiau(true, false)
	g.position = Vector2(0, -12)
	g.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	g.emission_sphere_radius = 7.0
	g.direction = Vector2(0, -1)
	g.spread = 38.0
	g.initial_velocity_min = 50.0
	g.initial_velocity_max = 140.0 * (0.6 + 0.4 * force)
	g.gravity = Vector2(0, 40)
	g.damping_min = 30.0
	g.damping_max = 60.0
	g.scale_amount_min = 0.18
	g.scale_amount_max = 0.42
	g.color_ramp = _rampe_etincelle()
	add_child(g)
	g.emitting = true
	get_tree().create_timer(2.2, false).timeout.connect(g.queue_free)


func _process(delta: float) -> void:
	if jeu != null and jeu.en_pause:
		return
	_t += delta
	if bois > 0.0:
		bois = maxf(0.0, bois - delta * (float(jeu.feu_temps) if jeu != null else 1.0))   # (le temps qu'il fait : scripts/regles.gd, FEU_TEMPS)
		_eteint = 0.0
	else:
		_eteint += delta
	_maj(delta)


func _exit_tree() -> void:
	if _sol != null and is_instance_valid(_sol) and _sol.get_parent() != self:
		_sol.queue_free()


# --- ce qu'on voit, chaque image ---

func _maj(delta: float) -> void:
	var vif := bois > 0.0
	var jour: float = jeu.lumiere_du_jour() if jeu != null else 0.0
	var vent: float = jeu.effets.vent() if jeu != null and jeu.effets != null else 0.3
	_avive = maxf(0.0, _avive - delta * 0.8)
	# la vie du feu : de 0 (des braises) à 1,6 (un grand feu) ; elle suit le bois, sans à-coups
	var cible := sqrt(clampf(bois / R.FEU_DEPART, 0.0, 2.5)) if vif else 0.0
	_vif = lerpf(_vif, cible, clampf(delta * 3.0, 0.0, 1.0)) if delta > 0.0 else cible
	var n1 := _bruit.get_noise_1d(_t * 9.0)
	var n2 := _bruit.get_noise_1d(_t * 2.3 + 40.0)
	# les braises d'un feu mort : elles s'éteignent en une trentaine de secondes
	var braises := 1.0 if vif else clampf(1.0 - _eteint / BRAISES_DUREE, 0.0, 1.0)
	# la flamme
	_flammes.visible = vif
	if vif:
		var f := _vif * (1.0 + 0.18 * _avive)
		# (le rectangle monte plus haut que la flamme : au-dessus, l'air chaud)
		_flammes.scale = Vector2((16.0 + 26.0 * minf(f, 1.0) + 10.0 * maxf(f - 1.0, 0.0)) / 4.0, (8.0 + 42.0 * f) / 4.0 / 0.69)
		var m: ShaderMaterial = _flammes.material
		m.set_shader_parameter("force", f)
		m.set_shader_parameter("vent", clampf(vent, -1.0, 1.0))
		m.set_shader_parameter("avive", _avive)
		m.set_shader_parameter("opacite", lerpf(0.3, 0.5, jour))
		m.set_shader_parameter("chaleur", 0.0 if _mobile else 1.0)
	# la lumière : elle vacille en force et en couleur ; un feu qui meurt rougit
	var rouge := clampf(1.0 - bois / 14.0, 0.0, 1.0) if vif else 1.0
	lumiere.enabled = vif or braises > 0.0
	if vif:
		var e := (1.18 + 0.12 * minf(_vif, 1.4)) * (1.0 + 0.09 * n1 + 0.05 * n2 + 0.22 * _avive) * lerpf(1.0, 0.3, jour)
		lumiere.energy = e * lerpf(1.0, 0.7, rouge)
		lumiere.texture_scale = rayon() / 128.0 * (1.0 + 0.01 * n1 + 0.03 * _avive)
		lumiere.color = P.BRAISE.lerp(P.BRAISE_COEUR, clampf(0.28 + 0.2 * n2 + 0.25 * _avive, 0.0, 1.0)).lerp(P.BRAISE_ROUGE, rouge * 0.6)
	else:
		# (des braises : une lueur rouge, petite, qui ne protège de rien)
		lumiere.energy = 0.55 * braises * (1.0 + 0.15 * n1) * lerpf(1.0, 0.2, jour)
		lumiere.texture_scale = 36.0 / 128.0 * (0.6 + 0.4 * braises)
		lumiere.color = P.BRAISE_ROUGE
	# la lueur au sol
	var lr := (26.0 + 34.0 * minf(_vif, 1.6)) if vif else 16.0
	_lueur.scale = Vector2(lr / 64.0, lr * 0.46 / 64.0)
	var lc := P.BRAISE.lerp(P.BRAISE_ROUGE, rouge * 0.7)
	var la := (0.36 + 0.05 * n1 + 0.15 * _avive) if vif else 0.3 * braises
	_lueur.self_modulate = Color(lc.r * la, lc.g * la, lc.b * la, 1.0)
	_lueur.position = Vector2(0, -1)
	_lueur.visible = la > 0.01
	# les particules
	var meurt := clampf(1.0 - bois / 12.0, 0.0, 1.0) if vif else 1.0
	etincelles.emitting = vif and bois > 3.0
	cendres.emitting = vif
	etincelles.gravity = Vector2(vent * 34.0, -26.0)
	cendres.gravity = Vector2(vent * 18.0, -7.0)
	var fume := vif or _eteint < FUMEE_DUREE
	fumee.emitting = fume
	fumee.gravity = Vector2(vent * 16.0, -6.0)
	fumee.position = Vector2(0, -(6.0 + 30.0 * _vif))
	var fa := lerpf(0.55, 1.0, meurt) if vif else clampf(1.0 - _eteint / FUMEE_DUREE, 0.0, 1.0)
	fumee.self_modulate = Color(1, 1, 1, fa)
	etincelles.position = Vector2(0, -(6.0 + 16.0 * _vif))
	# le foyer se redessine chaque image (ses braises battent) ; le reste, quand il change
	_foyer.queue_redraw()
	var cle := "%d-%s" % [_buches_n(), vif]
	if cle != _cle:
		_cle = cle
		queue_redraw()
		_devant.queue_redraw()
	# les ombres que pousse sa lumière (pas sur un téléphone)
	_ombres_t -= delta
	if _ombres_t <= 0.0:
		_ombres_t = 0.4
		_chercher_ombres()
	_sol.queue_redraw()


func _buches_n() -> int:
	return clampi(2 + int(bois / 38.0), 2, 5) if bois > 0.0 else 2


static func _rampe_etincelle() -> Gradient:
	return T.rampe([[0.0, Color(P.BRAISE_COEUR, 1.0)], [0.25, Color(P.BRAISE, 0.95)], [0.7, Color(P.BRAISE_ROUGE, 0.7)], [1.0, Color(P.BRAISE_ROUGE, 0.0)]])


func _particules() -> void:
	etincelles = CPUParticles2D.new()
	etincelles.amount = 10 if _mobile else 24
	etincelles.lifetime = 1.7
	etincelles.lifetime_randomness = 0.55
	etincelles.texture = T.etincelle()
	etincelles.material = T.materiau(true, false)
	etincelles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	etincelles.emission_sphere_radius = 6.0
	etincelles.direction = Vector2(0, -1)
	etincelles.spread = 20.0
	etincelles.initial_velocity_min = 24.0
	etincelles.initial_velocity_max = 64.0
	etincelles.damping_min = 6.0
	etincelles.damping_max = 16.0
	etincelles.tangential_accel_min = -40.0
	etincelles.tangential_accel_max = 40.0
	etincelles.scale_amount_min = 0.14
	etincelles.scale_amount_max = 0.3
	etincelles.color_ramp = _rampe_etincelle()
	etincelles.local_coords = false
	add_child(etincelles)
	cendres = CPUParticles2D.new()
	cendres.amount = 4 if _mobile else 9
	cendres.lifetime = 4.5
	cendres.lifetime_randomness = 0.4
	cendres.texture = T.eclat()
	cendres.material = T.materiau(false, true)
	cendres.position = Vector2(0, -18)
	cendres.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	cendres.emission_sphere_radius = 8.0
	cendres.direction = Vector2(0, -1)
	cendres.spread = 30.0
	cendres.initial_velocity_min = 10.0
	cendres.initial_velocity_max = 22.0
	cendres.damping_min = 2.0
	cendres.damping_max = 5.0
	cendres.angle_min = 0.0
	cendres.angle_max = 360.0
	cendres.angular_velocity_min = -140.0
	cendres.angular_velocity_max = 140.0
	cendres.scale_amount_min = 0.16
	cendres.scale_amount_max = 0.3
	var c := P.CENDRE.lerp(P.IVOIRE, 0.5)
	cendres.color_ramp = T.rampe([[0.0, Color(c, 0.0)], [0.15, Color(c, 0.8)], [0.7, Color(c, 0.5)], [1.0, Color(c, 0.0)]])
	cendres.local_coords = false
	add_child(cendres)
	fumee = CPUParticles2D.new()
	fumee.amount = 8 if _mobile else 16
	fumee.lifetime = 4.2
	fumee.lifetime_randomness = 0.3
	fumee.preprocess = 3.0
	fumee.texture = T.point_doux()
	fumee.material = T.materiau(false, true)
	fumee.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	fumee.emission_sphere_radius = 5.0
	fumee.direction = Vector2(0, -1)
	fumee.spread = 14.0
	fumee.initial_velocity_min = 12.0
	fumee.initial_velocity_max = 22.0
	fumee.damping_min = 1.5
	fumee.damping_max = 3.0
	fumee.angle_min = 0.0
	fumee.angle_max = 360.0
	fumee.angular_velocity_min = -20.0
	fumee.angular_velocity_max = 20.0
	fumee.scale_amount_min = 0.26
	fumee.scale_amount_max = 0.42
	fumee.scale_amount_curve = T.courbe([[0.0, 0.35], [0.4, 0.8], [1.0, 1.6]])
	var g := P.CENDRE.lerp(P.IVOIRE, 0.35)
	fumee.color_ramp = T.rampe([[0.0, Color(g, 0.0)], [0.12, Color(g, 0.3)], [0.55, Color(g, 0.16)], [1.0, Color(g, 0.0)]])
	fumee.local_coords = false
	add_child(fumee)


# --- le foyer : les pierres, les bûches, les braises ---

func _preparer_foyer() -> void:
	var r := RandomNumberGenerator.new()
	r.seed = _graine
	var pierre := Color(0.45, 0.44, 0.42)
	if jeu != null and jeu.monde != null:
		pierre = jeu.monde.palette.get("pierre", pierre)
	var n := 10
	for i in n:
		var a := TAU * i / n + r.randf_range(-0.12, 0.12)
		_pierres.append([Vector2(cos(a) * 19.0, sin(a) * 8.0 - 1.0), r.randf_range(4.2, 5.8), r.randf_range(3.0, 4.0),
			pierre.lerp(P.IVOIRE, r.randf_range(0.0, 0.2)).darkened(r.randf_range(0.0, 0.28))])
	_pierres.sort_custom(func(x, y): return x[0].y < y[0].y)
	for i in 16:
		_braises.append([Vector2(r.randf_range(-11, 11), r.randf_range(-4, 3)), r.randf_range(0.9, 2.0), r.randf_range(1.5, 4.0), r.randf() * TAU])


# derrière la flamme : l'ombre du foyer, les pierres du fond, le lit de cendres, les bûches
func _draw() -> void:
	_ellipse(self, Vector2(0, 1), 25.0, 10.0, Color(P.ENCRE, 0.3))
	for p in _pierres:
		if p[0].y < 0.0:
			_pierre(self, p)
	var vif := bois > 0.0
	_ellipse(self, Vector2(0, 0), 14.0, 5.6, P.CENDRE.darkened(0.25) if vif else P.CENDRE.lerp(P.IVOIRE, 0.18))
	_ellipse(self, Vector2(0, -0.5), 10.0, 3.8, P.CENDRE.lerp(P.IVOIRE, 0.25 if vif else 0.4))
	var r := RandomNumberGenerator.new()
	r.seed = _graine + 3
	var buches := []
	var n := _buches_n()
	for i in n:
		var a := PI * i / n + r.randf_range(-0.2, 0.2) + 0.35
		var l := r.randf_range(20.0, 26.0) if vif else r.randf_range(11.0, 15.0)
		var d := Vector2(cos(a), sin(a) * 0.42)
		var c := Vector2(r.randf_range(-2, 2), r.randf_range(-1.5, 0.5) - (1.5 if i >= 2 else 0.0))
		buches.append([c - d * l * 0.5, c + d * l * 0.5, r.randf_range(4.2, 5.4), r.randf_range(0.0, 0.25)])
	buches.sort_custom(func(x, y): return (x[0].y + x[1].y) < (y[0].y + y[1].y))
	for b in buches:
		var ecorce := P.TERRE.darkened(0.45 + b[3]) if vif else P.ENCRE_DOUCE
		draw_line(b[0], b[1], P.ENCRE, b[2] + 1.6)
		draw_line(b[0], b[1], ecorce, b[2])
		draw_line(b[0] + Vector2(0, -b[2] * 0.25), b[1] + Vector2(0, -b[2] * 0.25), ecorce.lightened(0.12), b[2] * 0.3)
		for bout in [b[0], b[1]]:
			draw_circle(bout, b[2] * 0.5 + 0.8, P.ENCRE)
			draw_circle(bout, b[2] * 0.5, P.TERRE.lerp(P.IVOIRE, 0.35) if vif else P.CENDRE)
	if not vif:
		for i in 9:
			draw_circle(Vector2(r.randf_range(-9, 9), r.randf_range(-3, 2)), r.randf_range(0.6, 1.3), P.IVOIRE.darkened(0.25))


func _pierre(c: CanvasItem, p: Array) -> void:
	var o: Vector2 = p[0]
	_ellipse(c, o + Vector2(0, 0.6), p[1] + 0.9, p[2] + 0.9, P.ENCRE)
	_ellipse(c, o, p[1], p[2], p[3])
	_ellipse(c, o + Vector2(-p[1] * 0.15, -p[2] * 0.35), p[1] * 0.62, p[2] * 0.45, p[3].lightened(0.18))


# les braises : le lit qui rougeoie, des points qui battent, plus vifs dans un feu qui meurt ; puis elles s'éteignent
func _dessiner_braises(c: CanvasItem) -> void:
	var vif := bois > 0.0
	var force := 1.0 if vif else clampf(1.0 - _eteint / BRAISES_DUREE, 0.0, 1.0)
	if force <= 0.0:
		return
	var lit := 0.5 + 0.12 * sin(_t * 1.7) + (0.25 if not vif else 0.0)
	_ellipse(c, Vector2(0, -0.5), 11.0, 4.2, Color(P.BRAISE_ROUGE * 0.55 * lit * force, 1.0))
	_ellipse(c, Vector2(0, -0.8), 6.5, 2.6, Color(P.BRAISE * 0.5 * lit * force, 1.0))
	for i in _braises.size():
		var b: Array = _braises[i]
		# (mort, le feu perd ses braises une à une)
		if not vif and float(i) / _braises.size() > force:
			continue
		var v := 0.5 + 0.5 * sin(_t * b[2] + b[3])
		var col := P.BRAISE_ROUGE.lerp(P.BRAISE_COEUR, v * v)
		c.draw_circle(b[0], b[1] * (0.7 + 0.3 * v), Color(col * (0.35 + 0.65 * v) * force, 1.0))


func _dessiner_devant(c: CanvasItem) -> void:
	for p in _pierres:
		if p[0].y >= 0.0:
			_pierre(c, p)


# --- la lueur au sol et les ombres que pousse le feu ---

# (toutes les 0,4 s : ce qui se tient dans sa lumière et y fait de l'ombre ; [nœud, largeur au pied, au bout, allonge, force])
func _chercher_ombres() -> void:
	_ombres.clear()
	if _mobile or bois <= 0.0 or jeu == null or jeu.monde == null:
		return
	var r := rayon()
	for o in jeu.monde.autour(position, r * 0.95):
		match o.genre:
			"arbre":
				_ombres.append([o, 8.0, 20.0, 0.75, 0.6])
			"sapin":
				_ombres.append([o, 7.0, 17.0, 0.7, 0.6])
			"rocher":
				_ombres.append([o, 24.0, 30.0, 0.3, 0.5] if o.reste > 0 else [o, 14.0, 18.0, 0.2, 0.4])
			"buisson":
				_ombres.append([o, 20.0, 26.0, 0.28, 0.45])
			"souche":
				_ombres.append([o, 9.0, 11.0, 0.14, 0.4])
	if jeu.joueur != null:
		_ombres.append([jeu.joueur, 9.0, 14.0, 0.42, 0.55])
	for b in jeu.get_tree().get_nodes_in_group("betes"):
		if b.role != "echo" and b.position.distance_to(position) < r:
			_ombres.append([b, b.largeur * 0.42, b.largeur * 0.6, 0.18 + b.largeur / 220.0, 0.5])


func _dessiner_sol(c: CanvasItem) -> void:
	if _ombres.is_empty() or bois <= 0.0:
		return
	var r := rayon()
	var nuit: float = 1.0 - jeu.lumiere_du_jour()
	if nuit <= 0.02:
		return
	var tremble := 1.0 + 0.05 * _bruit.get_noise_1d(_t * 7.0 + 90.0)
	var penche := 0.025 * _bruit.get_noise_1d(_t * 3.0 + 20.0)
	for o in _ombres:
		var n = o[0]
		if not is_instance_valid(n):
			continue
		var d: Vector2 = n.position - position
		var dist := d.length()
		if dist < 16.0 or dist > r:
			continue
		var dir := (d / dist).rotated(penche)
		var allonge: float = minf(o[3] * dist + 10.0, r * 1.05 - dist + 30.0) * tremble
		var a: float = o[4] * nuit * pow(clampf(1.0 - dist / r, 0.0, 1.0), 0.55)
		if a <= 0.01 or allonge <= 2.0:
			continue
		var cote := dir.orthogonal()
		var pied: Vector2 = d + dir * 1.5
		var bout := pied + dir * allonge
		var pts := PackedVector2Array([pied - cote * o[1] * 0.5, pied + cote * o[1] * 0.5, bout + cote * o[2] * 0.5, bout - cote * o[2] * 0.5])
		var ombre := Color(P.ENCRE, a)
		c.draw_polygon(pts, PackedColorArray([ombre, ombre, Color(P.ENCRE, 0.0), Color(P.ENCRE, 0.0)]))


static func _ellipse(c: CanvasItem, o: Vector2, rx: float, ry: float, couleur: Color) -> void:
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(o + Vector2(cos(a) * rx, sin(a) * ry))
	c.draw_colored_polygon(pts, couleur)


# un calque du feu, qui se dessine par lui (les braises, additives ; les pierres de devant, par-dessus la flamme)
class Calque extends Node2D:
	var feu
	var quoi := ""

	func _draw() -> void:
		if feu == null or not is_instance_valid(feu):
			return
		if quoi == "braises":
			feu._dessiner_braises(self)
		else:
			feu._dessiner_devant(self)


# sous le feu, au sol : sa lueur (un enfant) et les ombres qu'il pousse
class Sol extends Node2D:
	var feu

	func _draw() -> void:
		if feu != null and is_instance_valid(feu):
			feu._dessiner_sol(self)
