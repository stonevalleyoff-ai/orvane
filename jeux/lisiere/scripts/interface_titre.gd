extends Control
# Lisière — l'écran-titre, une scène vivante (scripts/interface_titre.gd)
# La lisière, la nuit : un ciel d'encre bleue et sa lune ; trois plans de forêt en silhouettes qui glissent lentement avec le vent
# (et un peu avec la souris : la parallaxe) ; la brume qui passe entre eux ; des yeux qui s'ouvrent dans le noir ; au premier
# plan, de grands troncs, un petit feu qui crépite et jette ses étincelles, et la veilleuse assise à côté, tournée vers lui.
# Tout est dessiné (des maillages faits une fois, des polygones à chaque image) ; la brume est un shader. « vif » dit l'éclat
# du feu à cet instant : le titre gravé le suit.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const BRUME := preload("res://shaders/interface_brume.gdshader")

var vif := 1.0
var titre := Rect2()          # où est le titre gravé (interface.gd le dit) : la braise le chauffe d'une lueur
var titre_a := 0.0
var _t := 0.0
var _souris := Vector2.ZERO
var _crepite := 0.0
var _plans: Array = []
var _brumes: Array = []
var _yeux: Yeux
var _avant: Avant
var _feu: Feu
var _lueur: Lueur
var _faite := Vector2.ZERO


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _ready() -> void:
	_ajouter(Ciel.new(self))
	_plans.append(_ajouter(Plan.new(self, 3)))
	_brumes.append(_ajouter(_brume(P.LUNE.lerp(P.IVOIRE, 0.2), 0.4, 0.008, 1.0)))
	_plans.append(_ajouter(Plan.new(self, 2)))
	_brumes.append(_ajouter(_brume(P.NUIT_BLEUE.lerp(P.LUNE, 0.6), 0.42, 0.014, 2.0)))
	_plans.append(_ajouter(Plan.new(self, 1)))
	_yeux = _ajouter(Yeux.new(self))
	_avant = _ajouter(Avant.new(self))
	# (la lumière du feu sous les flammes : elles gardent leurs couleurs)
	_lueur = _ajouter(Lueur.new(self))
	_feu = _ajouter(Feu.new(self))
	_brumes.append(_ajouter(_brume(P.NUIT_BLEUE.lerp(P.LUNE, 0.4), 0.24, 0.024, 3.0)))
	_ajouter(Voile.new(self))
	resized.connect(_refaire)
	_refaire()


func _ajouter(c: Control) -> Control:
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(c)
	return c


func _brume(c: Color, densite: float, vitesse: float, graine: float) -> ColorRect:
	var r := ColorRect.new()
	var m := ShaderMaterial.new()
	m.shader = BRUME
	m.set_shader_parameter("couleur", c)
	m.set_shader_parameter("densite", densite)
	m.set_shader_parameter("vitesse", vitesse)
	m.set_shader_parameter("graine", graine * 13.7)
	r.material = m
	return r


# la taille a changé : les plans se refont, la brume se pose entre eux
func _refaire() -> void:
	if size.x < 2.0 or size.y < 2.0 or size == _faite:
		return
	_faite = size
	for p in _plans:
		p.construire()
	_avant.construire()
	var bandes := [[0.46, 0.7], [0.6, 0.86], [0.8, 1.02]]
	for i in _brumes.size():
		var b: ColorRect = _brumes[i]
		b.set_anchors_preset(Control.PRESET_TOP_LEFT)
		b.position = Vector2(0, size.y * bandes[i][0])
		b.size = Vector2(size.x, size.y * (bandes[i][1] - bandes[i][0]))
		(b.material as ShaderMaterial).set_shader_parameter("echelle", Vector2(size.x / b.size.y * 0.9, 1.4))


# l'échelle de la scène : tout est pensé pour 720 de haut
func e() -> float:
	return size.y / 720.0


func lieu_du_feu() -> Vector2:
	return Vector2(size.x * 0.2, size.y * 0.89)


# la souris, de -1 à 1 depuis le milieu (sur un écran tactile : rien)
func souris() -> Vector2:
	return _souris


# un bruit lisse, fait de sinus : le souffle du feu, du vent
static func souffle(t: float) -> float:
	return sin(t * 1.7) * 0.5 + sin(t * 3.9 + 1.3) * 0.3 + sin(t * 8.3 + 2.1) * 0.2


func _process(d: float) -> void:
	if not is_visible_in_tree():
		return
	_t += d
	# (le feu crépite : de temps en temps, il éclate, et jette une gerbe d'étincelles)
	_crepite = maxf(0.0, _crepite - d * 3.0)
	if randf() < d * 0.55:
		_crepite = randf_range(0.5, 1.0)
		_feu.gerbe(int(6 + 10 * _crepite))
	vif = 1.0 + 0.11 * souffle(_t * 1.4) + 0.22 * _crepite
	var m := Vector2.ZERO
	if not DisplayServer.is_touchscreen_available() and size.x > 0.0:
		m = (get_local_mouse_position() / size - Vector2(0.5, 0.5)) * 2.0
		m = m.clamp(Vector2(-1, -1), Vector2(1, 1))
	_souris = _souris.lerp(m, 1.0 - exp(-d * 2.0))
	for p in _plans:
		p.avancer(d)
	_yeux.avancer(d)
	_feu.avancer(d)
	for c in get_children():
		if c is Control and not (c is ColorRect):
			c.queue_redraw()


# --- un maillage fait une fois : des polygones triangulés, bordés d'une frange transparente (le bord lissé) ---

class Maillage:
	var sommets := PackedVector2Array()
	var couleurs := PackedColorArray()
	var indices := PackedInt32Array()

	func polygone(pts: PackedVector2Array, c: Color, frange: float = 1.1) -> void:
		var tri := Geometry2D.triangulate_polygon(pts)
		if tri.is_empty():
			return
		var base := sommets.size()
		for p in pts:
			sommets.append(p)
			couleurs.append(c)
		for i in tri:
			indices.append(base + i)
		if frange <= 0.0:
			return
		var n := pts.size()
		# (le sens du tracé dit où est le dehors)
		var sens := -1.0 if Geometry2D.is_polygon_clockwise(pts) else 1.0
		var b2 := sommets.size()
		for i in n:
			var a: Vector2 = pts[(i - 1 + n) % n]
			var b: Vector2 = pts[i]
			var c2: Vector2 = pts[(i + 1) % n]
			var n1 := (b - a).orthogonal().normalized()
			var n2 := (c2 - b).orthogonal().normalized()
			var nn := n1 + n2
			nn = nn.normalized() if nn.length() > 0.01 else n1
			sommets.append(b + nn * frange * sens)
			couleurs.append(Color(c, 0.0))
		for i in n:
			var j := (i + 1) % n
			indices.append_array(PackedInt32Array([base + i, base + j, b2 + j, base + i, b2 + j, b2 + i]))

	func maillage() -> ArrayMesh:
		var m := ArrayMesh.new()
		if indices.is_empty():
			return m
		var a := []
		a.resize(Mesh.ARRAY_MAX)
		a[Mesh.ARRAY_VERTEX] = sommets
		a[Mesh.ARRAY_COLOR] = couleurs
		a[Mesh.ARRAY_INDEX] = indices
		m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
		return m


# un sapin en silhouette : des étages de branches qui retombent, un pied de tronc
static func sapin(pied: Vector2, ht: float, larg: float, rng: RandomNumberGenerator) -> PackedVector2Array:
	var etages := rng.randi_range(6, 9)
	var sommet := pied + Vector2(rng.randf_range(-0.02, 0.02) * ht, -ht)
	var droite := PackedVector2Array()
	var gauche := PackedVector2Array()
	for j in etages:
		var u := float(j + 1) / etages
		var y := lerpf(sommet.y, pied.y - ht * 0.07, u)
		var x := lerpf(sommet.x, pied.x, u)
		var demi := larg * 0.5 * pow(u, 0.8)
		var dd := demi * rng.randf_range(0.82, 1.15)
		var dg := demi * rng.randf_range(0.82, 1.15)
		droite.append(Vector2(x + dd, y + ht * 0.02))
		gauche.append(Vector2(x - dg, y + ht * 0.02))
		if j < etages - 1:
			droite.append(Vector2(x + demi * 0.38, y - ht * 0.01))
			gauche.append(Vector2(x - demi * 0.38, y - ht * 0.01))
	var tronc := larg * 0.06 + 1.0
	var pts := PackedVector2Array([sommet])
	pts.append_array(droite)
	pts.append_array(PackedVector2Array([Vector2(pied.x + tronc, pied.y - ht * 0.07), Vector2(pied.x + tronc, pied.y + 2.0),
		Vector2(pied.x - tronc, pied.y + 2.0), Vector2(pied.x - tronc, pied.y - ht * 0.07)]))
	gauche.reverse()
	pts.append_array(gauche)
	return pts


# --- le ciel : un dégradé d'encre bleue, des étoiles, la lune ---

class Ciel extends Control:
	var scene
	var _etoiles: Array = []

	func _init(s) -> void:
		scene = s
		var rng := RandomNumberGenerator.new()
		rng.seed = 41
		for i in 90:
			_etoiles.append([Vector2(rng.randf(), pow(rng.randf(), 1.6) * 0.55), rng.randf_range(0.5, 1.4), rng.randf() * TAU, rng.randf_range(0.6, 2.2)])

	func _draw() -> void:
		var s := size
		var haut := P.NUIT.darkened(0.35)
		var milieu := P.NUIT.lerp(P.NUIT_BLEUE, 0.55)
		var bas := P.NUIT_BLEUE.lerp(P.LUNE, 0.16)
		draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(s.x, 0), Vector2(s.x, s.y * 0.34), Vector2(0, s.y * 0.34)]),
			PackedColorArray([haut, haut, milieu, milieu]))
		draw_polygon(PackedVector2Array([Vector2(0, s.y * 0.34), Vector2(s.x, s.y * 0.34), Vector2(s.x, s.y * 0.62), Vector2(0, s.y * 0.62)]),
			PackedColorArray([milieu, milieu, bas, bas]))
		draw_rect(Rect2(0, s.y * 0.62, s.x, s.y * 0.38), bas)
		var t: float = scene._t
		for et in _etoiles:
			var a: float = 0.22 + 0.3 * (0.5 + 0.5 * sin(t * et[3] + et[2]))
			draw_circle(et[0] * s, et[1] * scene.e(), Color(P.PAPIER, a * (1.0 - et[0].y)))
		# (la lune, son halo, ses mers)
		var c: Vector2 = Vector2(s.x * 0.8, s.y * 0.17) + scene.souris() * Vector2(-3, -2) * scene.e()
		var r := s.y * 0.036
		draw_texture_rect(T.halo(), Rect2(c - Vector2(r, r) * 9.0, Vector2(r, r) * 18.0), false, Color(P.LUNE, 0.2))
		draw_texture_rect(T.halo(), Rect2(c - Vector2(r, r) * 3.0, Vector2(r, r) * 6.0), false, Color(P.LUNE.lerp(P.PAPIER, 0.4), 0.3))
		draw_circle(c, r, P.LUNE.lerp(P.PAPIER, 0.62))
		draw_arc(c, r, 0.0, TAU, 40, P.LUNE.lerp(P.PAPIER, 0.62), 1.0, true)
		for m in [[Vector2(-0.3, -0.2), 0.32], [Vector2(0.28, 0.18), 0.22], [Vector2(-0.05, 0.42), 0.18]]:
			draw_circle(c + m[0] * r, r * m[1], Color(P.LUNE.lerp(P.PAPIER, 0.35), 0.4))


# --- un plan de forêt : 3 au loin, pâle de brume ; 1 tout près, presque noir ---

class Plan extends Control:
	var scene
	var prof := 1
	var _maillage: ArrayMesh
	var _periode := 1.0
	var _decalage := 0.0

	func _init(s, p: int) -> void:
		scene = s
		prof = p

	func couleur() -> Color:
		match prof:
			3:
				return P.NUIT_BLEUE.lerp(P.LUNE, 0.24)
			2:
				return P.NUIT.lerp(P.NUIT_BLEUE, 0.78)
		return P.NUIT.lerp(P.NUIT_BLEUE, 0.3)

	func construire() -> void:
		var s: Vector2 = scene.size
		var e: float = scene.e()
		var rng := RandomNumberGenerator.new()
		rng.seed = 11 + prof * 31
		_periode = maxf(s.x * 1.5, 400.0)
		var w := _periode
		var base: float = s.y * [0.0, 0.75, 0.665, 0.585][prof]
		var hauteurs: Array = [[0, 0], [0.24, 0.42], [0.15, 0.26], [0.085, 0.15]][prof]
		var ecarts: Array = [[0, 0], [30.0, 70.0], [17.0, 38.0], [11.0, 22.0]][prof]
		var col := couleur()
		var m := Maillage.new()
		var sol := PackedVector2Array()
		for i in 49:
			var x := w * i / 48.0
			sol.append(Vector2(x, _sol(x, base, e)))
		sol.append(Vector2(w, s.y + 4.0))
		sol.append(Vector2(0, s.y + 4.0))
		m.polygone(sol, col, 0.0)
		var x := rng.randf_range(0.0, 20.0)
		while x < w:
			var ht := rng.randf_range(hauteurs[0], hauteurs[1]) * s.y
			m.polygone(scene.sapin(Vector2(x, _sol(x, base, e) + 3.0 * e), ht, ht * rng.randf_range(0.3, 0.4), rng), col)
			x += rng.randf_range(ecarts[0], ecarts[1]) * e
			if rng.randf() < 0.07:
				x += rng.randf_range(40.0, 110.0) * e
		_maillage = m.maillage()

	func _sol(x: float, base: float, e: float) -> float:
		return base + (sin(x / _periode * TAU * 2.0 + prof) * 7.0 + sin(x / _periode * TAU * 5.0 + prof * 2.0) * 3.0) * e

	func avancer(d: float) -> void:
		_decalage = fmod(_decalage + d * [0.0, 9.0, 5.0, 2.4][prof] * scene.e(), _periode)

	func decalage() -> Vector2:
		var m: Vector2 = scene.souris()
		var k: float = [0.0, 16.0, 9.0, 4.0][prof] * scene.e()
		return Vector2(-_decalage - m.x * k, -m.y * k * 0.35)

	func _draw() -> void:
		if _maillage == null:
			return
		var o := decalage()
		draw_mesh(_maillage, null, Transform2D(0.0, o))
		draw_mesh(_maillage, null, Transform2D(0.0, o + Vector2(_periode, 0)))


# --- des yeux qui s'ouvrent dans le noir, entre les arbres ---

class Yeux extends Control:
	var scene
	var _paires: Array = []
	var _attente := 1.2

	func _init(s) -> void:
		scene = s
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		material = m

	func avancer(d: float) -> void:
		_attente -= d
		if _attente <= 0.0 and _paires.size() < 3:
			_attente = randf_range(1.4, 3.8)
			_naitre()
		var garder := []
		for p in _paires:
			p["t"] = float(p["t"]) + d
			if float(p["t"]) < float(p["duree"]):
				garder.append(p)
		_paires = garder

	func _naitre() -> void:
		# (à gauche du feu, ou à droite, loin du titre ; jamais deux au même endroit)
		var x := randf_range(0.6, 0.95) if randf() < 0.75 else randf_range(0.03, 0.13)
		var y := randf_range(0.7, 0.83)
		for p in _paires:
			if Vector2(x, y).distance_to(p["p"]) < 0.08:
				return
		var chasseur := randf() < 0.65
		var r := randf_range(3.0, 4.6) * (1.0 if y > 0.76 else 0.8)
		_paires.append({"p": Vector2(x, y), "r": r, "ecart": r * randf_range(3.0, 4.4), "chasseur": chasseur, "t": 0.0,
			"duree": randf_range(3.0, 6.5), "cligne": randf_range(1.0, 2.4)})

	func _draw() -> void:
		var s := size
		var e: float = scene.e()
		var o: Vector2 = scene._plans[1].decalage() if scene._plans.size() > 1 else Vector2.ZERO
		for p in _paires:
			var t: float = p["t"]
			var duree: float = p["duree"]
			var ouvert := smoothstep(0.0, 0.5, t) * (1.0 - smoothstep(duree - 0.6, duree, t))
			var cl := fmod(t, float(p["cligne"]) + 1.3)
			if cl > float(p["cligne"]) and cl < float(p["cligne"]) + 0.16:
				ouvert *= 0.08
			if ouvert < 0.02:
				continue
			var c: Vector2 = p["p"] * s + Vector2(fmod(o.x * 0.15, s.x), 0)
			var col: Color = P.OEIL_CHASSEUR if p["chasseur"] else P.OEIL_PROIE
			var r: float = float(p["r"]) * e
			var ecart: float = float(p["ecart"]) * e
			for sgn in [-1.0, 1.0]:
				var q := c + Vector2(sgn * ecart * 0.5, 0)
				var h := r * 7.0
				draw_texture_rect(T.halo(), Rect2(q - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(col, 0.28 * ouvert))
				var pts := PackedVector2Array()
				var incl: float = sgn * (0.35 if p["chasseur"] else -0.1)
				for i in 16:
					var a := TAU * i / 16.0
					pts.append(q + Vector2(cos(a) * r, sin(a) * r * 0.62 * ouvert).rotated(incl))
				draw_colored_polygon(pts, Color(col, 0.95))
				draw_circle(q, r * 0.35 * ouvert, Color(P.PAPIER, 0.7))


# --- le premier plan : les grands troncs, le sol, la veilleuse assise au feu ---

class Avant extends Control:
	var scene
	var _maillage: ArrayMesh
	var _troncs: Array = []      # [x, largeur] : pour la lumière du feu sur leur flanc

	func _init(s) -> void:
		scene = s

	func construire() -> void:
		var s: Vector2 = scene.size
		var e: float = scene.e()
		var m := Maillage.new()
		var col := P.ENCRE.lerp(P.NUIT, 0.4)
		var sol := PackedVector2Array()
		for i in 41:
			var x := s.x * i / 40.0
			sol.append(Vector2(x, s.y * 0.865 + (sin(x * 0.011) * 6.0 + sin(x * 0.037 + 1.0) * 2.5) * e))
		sol.append(Vector2(s.x, s.y + 4.0))
		sol.append(Vector2(0, s.y + 4.0))
		m.polygone(sol, col, 0.0)
		# (des herbes hautes au bord du sol)
		var rng := RandomNumberGenerator.new()
		rng.seed = 5
		var x := 0.0
		while x < s.x:
			var y := s.y * 0.865 + (sin(x * 0.011) * 6.0 + sin(x * 0.037 + 1.0) * 2.5) * e + 2.0
			var h := rng.randf_range(8.0, 22.0) * e
			var pen := rng.randf_range(-6.0, 6.0) * e
			m.polygone(PackedVector2Array([Vector2(x - 2.2 * e, y), Vector2(x + pen, y - h), Vector2(x + 2.2 * e, y)]), col, 0.8)
			x += rng.randf_range(3.0, 11.0) * e
		# (les troncs du premier plan, qui encadrent l'image)
		_troncs = [[s.x * 0.035, s.x * 0.05], [s.x * 0.94, s.x * 0.075], [s.x * 0.995, s.x * 0.03]]
		for t in _troncs:
			var cx: float = t[0]
			var lw: float = t[1]
			var pts := PackedVector2Array()
			for i in 13:
				var u := i / 12.0
				pts.append(Vector2(cx + lw * 0.5 * (1.0 + 0.25 * u * u) + sin(u * 7.0 + cx) * 2.0 * e, lerpf(-10.0, s.y * 0.9, u)))
			for i in range(12, -1, -1):
				var u := i / 12.0
				pts.append(Vector2(cx - lw * 0.5 * (1.0 + 0.3 * u * u) + sin(u * 5.0 + cx * 0.3) * 2.0 * e, lerpf(-10.0, s.y * 0.9, u)))
			m.polygone(pts, P.ENCRE.lerp(P.NUIT, 0.3))
		_maillage = m.maillage()

	func _draw() -> void:
		if _maillage == null:
			return
		var s: Vector2 = scene.size
		var e: float = scene.e()
		var o: Vector2 = scene.souris() * Vector2(-24.0, -6.0) * e
		draw_mesh(_maillage, null, Transform2D(0.0, o))
		var f: Vector2 = scene.lieu_du_feu()
		var vif: float = scene.vif
		# (le flanc des troncs tourné vers le feu prend sa lumière)
		for t in _troncs:
			var cx: float = float(t[0]) + o.x
			var lw: float = t[1]
			var cote := 1.0 if cx < f.x else -1.0
			var loin := absf(cx - f.x) / s.x
			var a := clampf(0.42 - loin * 0.7, 0.03, 0.4) * vif
			var pts := PackedVector2Array()
			for i in 13:
				var u := lerpf(0.55, 1.0, i / 12.0)
				var y := lerpf(-10.0, s.y * 0.9, u)
				pts.append(Vector2(cx + cote * lw * 0.5 * (1.0 + 0.27 * u * u) - cote * 3.0 * e, y))
			var cols := PackedColorArray()
			var fins := PackedColorArray()
			for i in 13:
				var k := smoothstep(0.0, 1.0, i / 12.0)
				cols.append(Color(P.BRAISE, a * 0.22 * k))
				fins.append(Color(P.BRAISE, a * 0.3 * k))
			draw_polyline_colors(pts, cols, 9.0 * e, true)
			draw_polyline_colors(pts, fins, 2.4 * e, true)
		_veilleuse(f + Vector2(74.0, 3.0) * e, e, vif)

	# la veilleuse, assise sur une bûche, tournée vers le feu (à sa gauche) : la capuche, la cape, l'écharpe rouille. Chaque forme
	# est d'abord posée en braise, un peu décalée vers le feu, puis en encre : le feu lui fait un liseré sur le flanc gauche.
	func _veilleuse(p: Vector2, e: float, vif: float) -> void:
		var t: float = scene._t
		var k := e * 1.8
		var dos := 1.0 + 0.015 * sin(t * 1.5)
		var pan := sin(t * 1.2) * 1.4
		var nuit := P.CAPE.darkened(0.62)
		var formes := [
			[[-15, 0], [-17, -11], [-14, -22], [-7, -30], [3, -33], [12, -28], [17, -17], [19, -5], [18, 1]],
			[[-11, -24], [-20, -20], [-24, -17], [-23, -13], [-11, -14]],
			[[-16, -33], [-16, -40], [-11, -46], [-3, -49], [5, -47], [11, -42], [8, -34], [-3, -30]],
		]
		var ecr := PackedVector2Array([Vector2(-14, -31), Vector2(2, -34), Vector2(4, -28), Vector2(-12, -26)])
		var queue := PackedVector2Array([Vector2(0, -31), Vector2(6, -30), Vector2(11 + pan, -15), Vector2(7 + pan, -14)])
		# (la bûche où elle s'assoit, son ombre sur le sol)
		draw_texture_rect(T.halo(), Rect2(p + Vector2(-20, -4) * k, Vector2(60, 14) * k), false, Color(0, 0, 0, 0.55))
		draw_colored_polygon(_place(PackedVector2Array([Vector2(-18, -1), Vector2(22, -2), Vector2(23, 5), Vector2(-17, 6)]), p, k, 1.0), Color("24190f"))
		draw_line(p + Vector2(-17, 0) * k, p + Vector2(-4, -1) * k, Color(P.BRAISE, 0.35 * vif), 1.2 * e, true)
		for f in formes:
			var pts := PackedVector2Array()
			for q in f:
				pts.append(Vector2(q[0], q[1]))
			var w := _place(pts, p, k, dos)
			draw_colored_polygon(_place(pts, p + Vector2(-2.4, -0.8) * e, k, dos), Color(P.BRAISE, 0.8 * vif))
			draw_colored_polygon(w, nuit)
			draw_polyline(w + PackedVector2Array([w[0]]), nuit, 1.0, true)
		draw_colored_polygon(_place(ecr, p + Vector2(-1.4, 0) * e, k, dos), Color(P.BRAISE, 0.6 * vif))
		draw_colored_polygon(_place(ecr, p, k, dos), P.ECHARPE.darkened(0.2))
		draw_colored_polygon(_place(queue, p, k, dos), P.ECHARPE.darkened(0.35))
		# (dans l'ouverture de la capuche, le bord du visage que le feu éclaire ; les mains tendues)
		var visage := p + Vector2(-13.5, -39 * dos) * k
		draw_colored_polygon(_ovale(visage, 1.9 * k, 3.4 * k), Color(P.VISAGE.lerp(P.BRAISE, 0.55), 0.9 * vif))
		var mains := p + Vector2(-24.5, -15.0 * dos) * k
		draw_colored_polygon(_ovale(mains, 2.0 * k, 1.7 * k), Color(P.VISAGE.lerp(P.BRAISE, 0.5), 0.95 * vif))

	static func _place(pts: PackedVector2Array, o: Vector2, k: float, dos: float) -> PackedVector2Array:
		var r := PackedVector2Array()
		for q in pts:
			r.append(o + Vector2(q.x, q.y * dos) * k)
		return r

	static func _ovale(c: Vector2, rx: float, ry: float) -> PackedVector2Array:
		var pts := PackedVector2Array()
		for i in 18:
			var a := TAU * i / 18.0
			pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
		return pts


# --- le feu : des pierres, deux bûches, des flammes qui se tordent, la fumée ---

class Feu extends Control:
	var scene
	var etincelles: Array = []
	var _fumees: Array = []
	var _flammeches: Array = []
	var _pluie := 0.0

	func _init(s) -> void:
		scene = s

	func gerbe(n: int) -> void:
		for i in n:
			_etincelle(true)

	func _etincelle(gerbe_: bool) -> void:
		var e: float = scene.e()
		var f: Vector2 = scene.lieu_du_feu() + scene.souris() * Vector2(-24.0, -6.0) * e
		var v := Vector2(randf_range(-22.0, 22.0), randf_range(-150.0, -70.0)) * e
		if gerbe_:
			v *= randf_range(1.1, 1.7)
		etincelles.append({"p": f + Vector2(randf_range(-10.0, 10.0), -10.0) * e, "v": v, "age": 0.0, "vie": randf_range(1.0, 2.8),
			"r": randf_range(0.7, 1.5) * e, "ph": randf() * TAU})

	func avancer(d: float) -> void:
		var e: float = scene.e()
		_pluie += d * 6.5 * scene.vif
		while _pluie > 1.0:
			_pluie -= 1.0
			_etincelle(false)
		var t: float = scene._t
		var garder := []
		for s in etincelles:
			s["age"] = float(s["age"]) + d
			if float(s["age"]) > float(s["vie"]):
				continue
			var v: Vector2 = s["v"]
			v.x += (sin(t * 3.1 + float(s["ph"])) * 46.0 - 10.0) * e * d
			v.y *= 1.0 - 0.35 * d
			s["v"] = v
			s["p"] = s["p"] + v * d
			garder.append(s)
		etincelles = garder
		if randf() < d * 4.0:
			_flammeches.append({"p": scene.lieu_du_feu() + Vector2(randf_range(-7.0, 7.0), -randf_range(48.0, 66.0)) * e, "age": 0.0})
		var g3 := []
		for fl in _flammeches:
			fl["age"] = float(fl["age"]) + d
			fl["p"] = fl["p"] + Vector2(-6.0, -70.0) * e * d
			if float(fl["age"]) < 0.45:
				g3.append(fl)
		_flammeches = g3
		if randf() < d * 2.0:
			var f: Vector2 = scene.lieu_du_feu()
			_fumees.append({"p": f + Vector2(0, -34) * e, "age": 0.0, "vie": randf_range(3.5, 5.0)})
		var g2 := []
		for fm in _fumees:
			fm["age"] = float(fm["age"]) + d
			fm["p"] = fm["p"] + Vector2(-9.0 + sin(t + float(fm["vie"])) * 6.0, -26.0) * e * d
			if float(fm["age"]) < float(fm["vie"]):
				g2.append(fm)
		_fumees = g2

	func _draw() -> void:
		var e: float = scene.e() * 1.2
		var t: float = scene._t
		var vif: float = scene.vif
		var f: Vector2 = scene.lieu_du_feu() + scene.souris() * Vector2(-24.0, -6.0) * e
		# (la fumée, pâle, qui monte et se perd)
		for fm in _fumees:
			var u: float = float(fm["age"]) / float(fm["vie"])
			var r := (14.0 + 50.0 * u) * e
			draw_texture_rect(T.halo(), Rect2(fm["p"] - Vector2(r, r), Vector2(r, r) * 2.0), false, Color(P.IVOIRE, 0.05 * sin(u * PI)))
		# (le cercle de pierres, les bûches croisées, la braise au pied)
		for i in 7:
			var a := PI * (0.05 + 0.9 * i / 6.0)
			var q := f + Vector2(cos(a) * 26.0, sin(a) * 6.0 + 2.0) * e
			draw_colored_polygon(Avant._ovale(q, 6.0 * e, 3.8 * e), P.CENDRE.lerp(P.BRAISE, 0.12 * vif))
		for sgn in [-1.0, 1.0]:
			var a2 := f + Vector2(-20.0 * sgn, 2.0) * e
			var b2 := f + Vector2(16.0 * sgn, -7.0) * e
			draw_line(a2, b2, Color("2a1e14"), 6.0 * e, true)
			draw_line(a2.lerp(b2, 0.45), b2, Color(P.BRAISE_ROUGE, 0.7 * vif), 2.0 * e, true)
		draw_colored_polygon(Avant._ovale(f + Vector2(0, -2) * e, 15.0 * e, 4.0 * e), Color(P.BRAISE_ROUGE, 0.9))
		draw_colored_polygon(Avant._ovale(f + Vector2(0, -3) * e, 9.0 * e, 2.4 * e), Color(P.BRAISE_COEUR, 0.8 * vif))
		# (les flammes : sept langues, de la plus rouge à la plus claire, chacune avec son souffle)
		var langues := [[-11.0, 8.0, 0.5, 0.0], [10.0, 8.0, 0.58, 1.7], [-4.0, 12.0, 0.92, 3.1], [4.0, 11.0, 1.0, 4.4],
			[0.0, 8.0, 0.78, 5.9], [-15.0, 5.0, 0.34, 2.2], [15.0, 5.0, 0.38, 0.9]]
		var hauteur := 74.0 * e * vif
		for couche in 3:
			var col: Color = [Color(P.BRAISE_ROUGE, 0.92), P.BRAISE, P.BRAISE_COEUR][couche]
			var kh: float = [1.0, 0.7, 0.36][couche]
			var kl: float = [1.0, 0.7, 0.42][couche]
			for l in langues:
				var ph: float = l[3]
				var souffle_: float = 0.78 + 0.3 * scene.souffle(t * 2.6 + ph)
				var ht: float = hauteur * float(l[2]) * kh * souffle_
				var larg: float = float(l[1]) * kl * e
				var base: Vector2 = f + Vector2(float(l[0]) * e * (0.55 + 0.45 * kl), -1.0 * e)
				var penche := (sin(t * 3.3 + ph) * 6.0 + sin(t * 7.9 + ph * 1.7) * 2.5 - 2.0) * e * (ht / maxf(1.0, hauteur))
				draw_colored_polygon(_langue(base, larg, ht, penche), col)
		for fl in _flammeches:
			var u: float = float(fl["age"]) / 0.45
			var r := (5.0 - 3.5 * u) * e
			draw_colored_polygon(_langue(fl["p"], r * 0.7, r * 3.0, sin(float(fl["age"]) * 9.0) * 2.0 * e), Color(P.BRAISE, 0.9 * (1.0 - u)))

	static func _langue(base: Vector2, larg: float, ht: float, penche: float) -> PackedVector2Array:
		# (une goutte : ronde en bas, la plus large au quart, pointue en haut, qui se plie au vent)
		var droite := PackedVector2Array()
		var gauche := PackedVector2Array()
		for i in 11:
			var u := i / 10.0
			var w := larg * pow(sin(PI * (u * 0.8 + 0.2)), 0.6) * pow(1.0 - u, 0.6)
			var cx := base.x + penche * u * u
			var y := base.y - ht * u
			droite.append(Vector2(cx + w, y))
			gauche.append(Vector2(cx - w, y))
		gauche.reverse()
		return droite + gauche.slice(1)


# --- la lumière du feu (additive) : sur le sol, autour des flammes, et les étincelles ---

class Lueur extends Control:
	var scene

	func _init(s) -> void:
		scene = s
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		material = m

	func _draw() -> void:
		var e: float = scene.e() * 1.15
		var vif: float = scene.vif
		var f: Vector2 = scene.lieu_du_feu() + scene.souris() * Vector2(-24.0, -6.0) * e
		var h := T.halo()
		draw_texture_rect(h, Rect2(f - Vector2(330, 120) * e, Vector2(660, 240) * e), false, Color(P.BRAISE, 0.2 * vif))
		draw_texture_rect(h, Rect2(f - Vector2(150, 40) * e, Vector2(300, 80) * e), false, Color(P.BRAISE, 0.3 * vif))
		draw_texture_rect(h, Rect2(f - Vector2(80, 120) * e, Vector2(160, 160) * e), false, Color(P.BRAISE, 0.16 * vif))
		draw_texture_rect(h, Rect2(f - Vector2(520, 330) * e, Vector2(1040, 520) * e), false, Color(P.BRAISE_ROUGE, 0.08 * vif))
		var tr: Rect2 = scene.titre
		if tr.size.x > 0.0:
			var c := tr.get_center() + Vector2(0, tr.size.y * 0.2)
			var ts := Vector2(tr.size.x * 1.25, tr.size.y * 1.5)
			draw_texture_rect(h, Rect2(c - ts * 0.5, ts), false, Color(P.BRAISE_ROUGE, 0.1 * vif * float(scene.titre_a)))
		for s in scene._feu.etincelles:
			var u: float = float(s["age"]) / float(s["vie"])
			var col := P.BRAISE_COEUR.lerp(P.BRAISE, u * 1.4).lerp(P.BRAISE_ROUGE, maxf(0.0, u * 2.0 - 1.0))
			var a := (1.0 - u) * (0.6 + 0.4 * sin(float(s["age"]) * 23.0 + float(s["ph"])))
			var p: Vector2 = s["p"]
			var v: Vector2 = s["v"]
			draw_line(p, p - v * 0.035, Color(col, a), float(s["r"]) * 1.4, true)
			draw_texture_rect(h, Rect2(p - Vector2(6, 6) * e, Vector2(12, 12) * e), false, Color(col, a * 0.35))


# --- le bord de l'image s'assombrit : l'œil va au milieu, au feu ---

class Voile extends Control:
	var scene
	var _texture: GradientTexture2D

	func _init(s) -> void:
		scene = s
		var g := Gradient.new()
		g.set_color(0, Color(P.NUIT, 0.0))
		g.set_color(1, Color(P.NUIT, 0.85))
		g.add_point(0.55, Color(P.NUIT, 0.0))
		_texture = GradientTexture2D.new()
		_texture.gradient = g
		_texture.width = 256
		_texture.height = 256
		_texture.fill = GradientTexture2D.FILL_RADIAL
		_texture.fill_from = Vector2(0.5, 0.45)
		_texture.fill_to = Vector2(1.05, 0.95)

	func _draw() -> void:
		draw_texture_rect(_texture, Rect2(Vector2.ZERO, size), false)
