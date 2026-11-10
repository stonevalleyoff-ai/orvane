extends Node2D
# Lisière — ce qui pousse et ce qui gît (scripts/objet.gd)
# Un arbre (du bois, puis une souche), un rocher (des pierres), un buisson (des baies, qui repoussent), une touffe (des fibres,
# qui repoussent), une brindille (un bois, ramassé d'un geste). Chacun dessiné une fois, d'après sa graine, comme sur une planche
# de naturaliste : un contour d'encre, trois tons (l'ombre, le ton propre, la lumière venue d'en haut à gauche), l'écorce, la
# mousse, les baies (scripts/decor_pinceau.gd, shaders/vegetation_feuillage.gdshader). Deux arbres ne se ressemblent pas.
# L'origine du nœud est son pied : le monde les trie par hauteur, le joueur passe derrière les troncs. La couronne d'un arbre est
# un nœud à part, qui a son propre dessin : le vent la plie (le shader), elle tremble quand on frappe, tombe quand l'arbre tombe,
# et s'efface quand la veilleuse passe dessous (monde.gd). Les ombres au sol, le monde les dessine (ombres()).

const Pinceau := preload("res://scripts/decor_pinceau.gd")
const P := preload("res://scripts/palette.gd")
const SHADER := preload("res://shaders/vegetation_feuillage.gdshader")
const BUTIN := {"arbre": "bois", "sapin": "bois", "souche": "", "rocher": "pierre", "buisson": "baies", "touffe": "fibre", "brindille": "bois"}
const REPOUSSE := 240.0
const CHUTE := 1.15            # secondes : un arbre abattu tombe
const ENCRE := Color(0.086, 0.075, 0.059, 0.92)

# les deux matières, partagées par tous : la végétation (le vent la plie), et ce qui ne bouge pas (la même peinture)
static var vegetation: ShaderMaterial
static var fixe: ShaderMaterial
# le climat du lieu, posé par le monde avant de semer (de 0 à 1) : la neige, la mousse
static var climat := {"froid": 0.0, "humide": 0.5}
static var _pinceau

var genre := "arbre"
var reste := 4
var plein := 4
var rayon := 0.0
var teinte := Color(0.2, 0.3, 0.18)
var graine := 0
var hauteur := 10.0            # en pixels, au-dessus du pied : pour son ombre portée
var couronne: Node2D = null    # le feuillage d'un arbre, sur son propre nœud
var couronne_rect := Rect2()   # où est ce feuillage, autour du pied
var _espece := "arbre"
var _repousse := 0.0
var _secoue := 0.0
var _chute := -1.0
var _sens := 1.0
# les mesures, tirées de la graine
var _ht := 28.0                # le tronc, jusqu'à la couronne (un sapin : ce qu'on en voit)
var _rx := 28.0
var _ry := 25.0
var _cc := Vector2(0, -50)     # le centre de la couronne
var _penche := 0.0


static func matieres() -> void:
	if vegetation == null:
		vegetation = ShaderMaterial.new()
		vegetation.shader = SHADER
		fixe = ShaderMaterial.new()
		fixe.shader = SHADER
		fixe.set_shader_parameter("souplesse", 0.0)


static func pinceau():
	if _pinceau == null:
		_pinceau = Pinceau.new()
	return _pinceau


func preparer(g: String, couleur: Color, s: int) -> void:
	genre = g
	_espece = g
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
	matieres()
	_mesurer()
	material = vegetation if g in ["arbre", "sapin", "buisson", "touffe"] else fixe
	if g == "arbre" or g == "sapin":
		couronne = Couronne.new()
		couronne.objet = self
		couronne.material = vegetation
		add_child(couronne)
	set_process(false)


func _mesurer() -> void:
	var r := RandomNumberGenerator.new()
	r.seed = graine
	match genre:
		"arbre":
			_ht = r.randf_range(22.0, 31.0)
			_rx = r.randf_range(24.0, 32.0)
			_ry = _rx * r.randf_range(0.84, 0.95)
			_penche = r.randf_range(-0.07, 0.07)
			_cc = Vector2(_penche * (_ht + _ry * 0.8) + r.randf_range(-2.0, 2.0), -(_ht + _ry * 0.8))
			hauteur = -_cc.y + _ry
			couronne_rect = Rect2(_cc - Vector2(_rx, _ry), Vector2(_rx, _ry) * 2.0)
		"sapin":
			_ht = r.randf_range(7.0, 10.0)
			_ry = r.randf_range(58.0, 74.0)
			_rx = r.randf_range(17.0, 22.0)
			_penche = r.randf_range(-0.04, 0.04)
			hauteur = _ht + _ry
			couronne_rect = Rect2(-_rx, -hauteur, _rx * 2.0, _ry)
		"rocher":
			_rx = r.randf_range(14.0, 18.5)
			_ry = r.randf_range(11.0, 16.0)
			hauteur = _ry
		"buisson":
			_rx = r.randf_range(12.0, 15.5)
			_ry = r.randf_range(16.0, 21.0)
			hauteur = _ry
		"touffe":
			hauteur = 16.0
		_:
			hauteur = 2.0


# un geste : ce qu'il donne ({ "bois": 1 }), ou rien
func recolter() -> Dictionary:
	if reste <= 0:
		return {}
	reste -= 1
	var item: String = BUTIN.get(genre, "")
	if (genre == "arbre" or genre == "sapin") and reste <= 0:
		genre = "souche"
		rayon = 6.0
		_chute = 0.0
		_sens = 1.0 if graine % 2 == 0 else -1.0
		material = fixe
	elif (genre == "buisson" or genre == "touffe") and reste <= 0:
		_repousse = REPOUSSE
	_secoue = 0.35
	set_process(true)
	queue_redraw()
	_ombre_changee()
	return {item: 1} if item != "" else {}


func epuise() -> bool:
	return reste <= 0


# la veilleuse, debout en p, est-elle cachée par ce feuillage ? (derrière le tronc, sous la couronne)
func cache(p: Vector2) -> bool:
	if couronne == null or _chute >= 0.0 or p.y >= position.y - 2.0:
		return false
	var corps := Rect2(p.x - 9.0, p.y - 40.0, 18.0, 40.0)
	return corps.intersects(Rect2(couronne_rect.position + position, couronne_rect.size).grow(-5.0))


func _ombre_changee() -> void:
	var m := get_parent()
	if m != null and m.has_method("ombre_changee"):
		m.ombre_changee(self)


func _process(delta: float) -> void:
	var anime := false
	if _secoue > 0.0:
		_secoue = maxf(0.0, _secoue - delta)
		anime = true
		if couronne != null and _chute < 0.0:
			# (l'arbre frappé : sa couronne tremble, autour de son pied, sans se redessiner)
			couronne.rotation = sin(_secoue * 55.0) * _secoue * 0.11
		else:
			queue_redraw()
	if _chute >= 0.0 and couronne != null:
		_chute += delta
		var u := clampf(_chute / CHUTE, 0.0, 1.0)
		couronne.rotation = _sens * u * u * 1.45
		# (le tronc pivote sur sa coupe, pas sur le pied)
		var coupe := Vector2(_axe(-8.5), -8.5)
		couronne.position = coupe - coupe.rotated(couronne.rotation)
		couronne.modulate.a = 1.0 - smoothstep(0.6, 1.0, u)
		anime = true
		if u >= 1.0:
			couronne.queue_free()
			couronne = null
			_chute = -1.0
	if _repousse > 0.0:
		_repousse -= delta
		anime = true
		if _repousse <= 0.0:
			reste = plein
			queue_redraw()
			_ombre_changee()
	if not anime:
		set_process(false)


# ses ombres au sol : [centre, rayons, opacité, portée (0 : de contact ; 1 : elle suit le soleil), hauteur]
func ombres() -> Array:
	match genre:
		"arbre":
			return [[Vector2(1, 1), Vector2(14, 5.5), 0.45, 0.0, 0.0], [Vector2(_cc.x + 3.0, 3.0), Vector2(_rx * 1.02, _ry * 0.46), 0.3, 1.0, hauteur * 0.75]]
		"sapin":
			return [[Vector2(1, 1), Vector2(12, 5.0), 0.45, 0.0, 0.0], [Vector2(3, 3), Vector2(_rx * 0.95, _rx * 0.44), 0.3, 1.0, hauteur * 0.7]]
		"souche":
			return [[Vector2(1, 1), Vector2(10, 4.0), 0.4, 0.0, 0.0]]
		"rocher":
			var t := _usure()
			return [[Vector2(1.5, 1.5), Vector2(_rx * 1.2 * t, _rx * 0.45 * t), 0.45, 0.0, 0.0], [Vector2(3, 2), Vector2(_rx * t, _rx * 0.4 * t), 0.22, 1.0, _ry * t * 0.7]]
		"buisson":
			return [[Vector2(0, 1.5), Vector2(_rx * 1.15, _rx * 0.45), 0.42, 0.0, 0.0], [Vector2(2, 2), Vector2(_rx, _rx * 0.4), 0.22, 1.0, _ry * 0.55]]
		"touffe":
			return [[Vector2(0, 1), Vector2(8, 3.0), 0.3 if reste > 0 else 0.15, 0.0, 0.0]]
		_:
			return [[Vector2(0, 1), Vector2(11, 3.5), 0.22, 0.0, 0.0]]


func _usure() -> float:
	return 0.62 + 0.38 * float(reste) / float(plein)


func _draw() -> void:
	var p = pinceau()
	p.commencer(get_canvas_item())
	var r := RandomNumberGenerator.new()
	r.seed = graine + 11
	if _secoue > 0.0 and genre != "souche":
		var k := sin(_secoue * 46.0) * _secoue
		if genre == "rocher":
			draw_set_transform(Vector2(k * 3.0, 0.0))
		elif genre != "arbre" and genre != "sapin":
			# (un buisson, une touffe : la tête frémit, le pied reste)
			draw_set_transform_matrix(Transform2D(Vector2(1, 0), Vector2(-k * 0.35, 1), Vector2.ZERO))
	match genre:
		"arbre", "sapin":
			_pied(p, r, false)
		"souche":
			_pied(p, r, true)
		"rocher":
			_rocher(p, r)
		"buisson":
			_buisson(p, r)
		"touffe":
			_touffe(p, r)
		"brindille":
			_brindille(p, r)
	p.finir()


func _dessiner_couronne(c: CanvasItem) -> void:
	var p = pinceau()
	p.commencer(c.get_canvas_item())
	var r := RandomNumberGenerator.new()
	r.seed = graine + 23
	if _espece == "sapin":
		_sapin(p, r)
	else:
		_feuillu(p, r)
	p.finir()


# --- les arbres ---

func _ecorce() -> Color:
	if _espece == "sapin":
		return P.TERRE.lerp(P.BRAISE_ROUGE, 0.12).darkened(0.32)
	return P.TERRE.lerp(P.ENCRE_DOUCE, 0.42).lerp(P.CENDRE, 0.15)


# l'axe du tronc, à la hauteur y (négative), et sa demi-largeur
func _axe(y: float) -> float:
	return _penche * -y + sin(-y * 0.07 + graine % 7) * 0.7


func _demi_largeur(y: float) -> float:
	var haut := -_cc.y if _espece == "arbre" else _ht + 6.0
	var u := clampf(-y / haut, 0.0, 1.0)
	var w := lerpf(5.0, 2.8, u) if _espece == "arbre" else lerpf(3.6, 2.6, u)
	return w + 2.6 * (1.0 - smoothstep(0.0, 6.0, -y))


# un morceau de tronc, de y0 à y1 (négatifs), en écorce, bordé d'encre
func _tronc(p, y0: float, y1: float, c: Color) -> void:
	var n := maxi(3, int((y0 - y1) / 5.0))
	var gauche := PackedVector2Array()
	var droite := PackedVector2Array()
	for i in n + 1:
		var y := lerpf(y0, y1, float(i) / n)
		var x := _axe(y)
		var w := _demi_largeur(y)
		gauche.append(Vector2(x - w, y))
		droite.append(Vector2(x + w, y))
	var poly := PackedVector2Array()
	var cols := PackedColorArray()
	var uvs := PackedVector2Array()
	for i in gauche.size():
		poly.append(gauche[i])
		cols.append(c)
		uvs.append(Vector2(10.0, 11.0))
	for i in range(droite.size() - 1, -1, -1):
		poly.append(droite[i])
		cols.append(c)
		uvs.append(Vector2(12.0, 11.0))
	p.aplat_libre(poly, cols, uvs)
	p.tracer(gauche, 1.1, ENCRE, false)
	p.tracer(droite, 1.7, ENCRE, false)


func _racines(p, r: RandomNumberGenerator, c: Color) -> void:
	var n := r.randi_range(2, 4)
	for i in n:
		var cote := -1.0 if i % 2 == 0 else 1.0
		var a := cote * r.randf_range(0.15, 1.2)
		var l := r.randf_range(6.0, 11.0)
		var dir := Vector2(sin(a), cos(a) * 0.35)
		var depart := Vector2(_axe(0.0) + cote * 3.5, -1.5)
		var bout := depart + dir * l + Vector2(0, 2.0)
		var nrm := dir.orthogonal()
		var poly := PackedVector2Array([depart + nrm * 2.4 + Vector2(0, -2.5), depart + dir * l * 0.5 + nrm * 1.3, bout, depart + dir * l * 0.5 - nrm * 1.5, depart - nrm * 2.4])
		p.aplat(poly, c.darkened(0.08), Pinceau.ECORCE, depart + dir * l * 0.4, Vector2(5.0, 5.0))
		p.tracer(PackedVector2Array([depart - nrm * 2.4, depart + dir * l * 0.5 - nrm * 1.5, bout]), 1.2, ENCRE)


# le pied d'un arbre : les racines, le bas du tronc, les entailles des coups ; ou la souche qu'il laisse
func _pied(p, r: RandomNumberGenerator, souche: bool) -> void:
	var c := _ecorce()
	_racines(p, r, c)
	var haut := -9.0
	_tronc(p, 0.5, haut, c)
	if climat.get("humide", 0.5) > 0.5:
		# (de la mousse au pied, du côté de l'ombre)
		for i in r.randi_range(1, 3):
			var m := Vector2(_axe(0.0) + r.randf_range(-5.5, -1.5), r.randf_range(-5.0, 0.5))
			p.disque(m, r.randf_range(1.2, 2.2), r.randf_range(0.9, 1.5), P.MOUSSE.lerp(P.FEUILLE_SOMBRE, 0.35), Pinceau.FEUILLAGE)
	if souche:
		# la coupe : le bois clair, ses cernes, une fente
		var x := _axe(haut)
		var w := _demi_largeur(haut)
		var bois := P.IVOIRE.lerp(P.BRAISE, 0.22).darkened(0.12)
		var coupe := Vector2(x, haut)
		p.disque(coupe, w + 0.4, 2.6, bois, Pinceau.DOME)
		for k in 2:
			p.tracer(Pinceau.ellipse(coupe, (w - 1.2) * (0.66 - k * 0.3), 2.6 * (0.66 - k * 0.3), 12), 0.5, bois.darkened(0.35), false)
		p.tracer(PackedVector2Array([coupe, coupe + Vector2(w * 0.8, 0.9)]), 0.7, ENCRE.darkened(0.2))
		var bord := Pinceau.ellipse(coupe, w + 0.4, 2.6, 18)
		bord.append(bord[0])
		p.tracer(bord, 1.1, ENCRE, false)
		# des copeaux, tombés autour
		for i in 3:
			var q := Vector2(r.randf_range(-14.0, 14.0), r.randf_range(1.0, 6.0))
			var a := r.randf() * TAU
			var d := Vector2.from_angle(a)
			p.aplat(PackedVector2Array([q - d * 2.2, q + d.orthogonal() * 0.9, q + d * 2.2, q - d.orthogonal() * 0.7]), bois, Pinceau.UNI)
		return
	# les entailles : chaque coup creuse le tronc
	var coups := plein - reste
	if coups > 0:
		var y := -4.5
		var x := _axe(y) + _demi_largeur(y) * 0.1
		var w := 1.6 + coups * 1.3
		var bois := P.IVOIRE.lerp(P.BRAISE, 0.25)
		var entaille := PackedVector2Array([Vector2(x - w, y - 1.6), Vector2(x + w * 0.9, y - 2.3), Vector2(x + w * 0.6, y + 0.4 + coups * 0.4), Vector2(x - w * 0.8, y + 1.0)])
		p.aplat(entaille, bois, Pinceau.UNI)
		p.contour(entaille, 0.8, ENCRE, r, 2)


# le haut d'un feuillu : le tronc, deux branches, la couronne en touffes, son contour d'encre
func _feuillu(p, r: RandomNumberGenerator) -> void:
	var c := _ecorce()
	var haut := _cc.y + _ry * 0.35
	_tronc(p, -8.5, haut, c)
	# l'écorce : des fibres, un nœud
	for i in r.randi_range(2, 4):
		var y := r.randf_range(-12.0, haut + 6.0)
		var x := _axe(y) + r.randf_range(-1.5, 2.2)
		p.tracer(PackedVector2Array([Vector2(x, y), Vector2(x + 0.3, y - r.randf_range(4.0, 8.0))]), 0.7, Color(ENCRE, 0.5))
	if r.randf() < 0.7:
		var y := r.randf_range(-16.0, -11.0)
		var nd := Vector2(_axe(y) + r.randf_range(-1.0, 1.5), y)
		p.disque(nd, 1.5, 1.1, c.darkened(0.5))
		p.tracer(PackedVector2Array([nd + Vector2(-1.6, -0.6), nd + Vector2(0, -1.6), nd + Vector2(1.6, -0.4)]), 0.6, c.lightened(0.25), false)
	# les branches, qui partent dans la couronne
	for cote in [-1.0, 1.0]:
		var y0 := _cc.y + _ry * r.randf_range(0.35, 0.55)
		var a := Vector2(_axe(y0), y0)
		var b := a + Vector2(cote * _rx * r.randf_range(0.35, 0.6), -_ry * r.randf_range(0.3, 0.55))
		var m := (a + b) * 0.5 + Vector2(-cote * 1.5, 2.0)
		p.tracer(PackedVector2Array([a, m, b]), 3.6, ENCRE)
		p.tracer(PackedVector2Array([a, m, b]), 2.4, c)
	# l'ombre de la couronne sur le tronc
	p.eventail(Vector2(_axe(_cc.y + _ry), _cc.y + _ry * 0.92), 6.5, 5.0, Color(P.ENCRE, 0.55), Color(P.ENCRE, 0.0), 12)
	# la couronne : des festons, peints en touffes
	var poly := festons(_cc, _rx, _ry, r.randi_range(7, 9), 0.16, r, 60, 0.12)
	var t := teinte.lerp(P.FEUILLE_SOMBRE, r.randf_range(0.0, 0.18)).lightened(r.randf_range(0.0, 0.08))
	p.aplat(poly, t, Pinceau.FEUILLAGE, _cc, Vector2(_rx, _ry) * 1.08)
	# l'encre : le contour, en quelques traits, et des arcs de touffes du côté de l'ombre
	p.contour(poly, 1.5, ENCRE, r, 4)
	for i in r.randi_range(3, 5):
		var q := _cc + Vector2(r.randf_range(-0.1, 0.75) * _rx, r.randf_range(-0.05, 0.7) * _ry)
		var rr := r.randf_range(5.0, 8.5)
		var arc := PackedVector2Array()
		var a0 := r.randf_range(-0.2, 0.4)
		for k in 6:
			var a := a0 + k * 0.32
			arc.append(q + Vector2(cos(a), sin(a) * 0.9) * rr)
		p.tracer(arc, 0.9, Color(ENCRE, 0.6))


# un sapin : des étages d'aiguilles, du bas vers le haut, chacun bordé de dents d'encre ; la neige s'il fait froid
func _sapin(p, r: RandomNumberGenerator) -> void:
	var c := _ecorce()
	_tronc(p, -8.5, -_ht - 4.0, c)
	var etages := r.randi_range(4, 5)
	var froid := float(climat.get("froid", 0.0))
	var t0 := teinte.lerp(P.FEUILLE_SOMBRE, 0.25)
	for i in etages:
		var u := float(i) / etages
		var bas := -_ht + 1.0 - u * _ry * 0.78
		var h := _ry * (0.4 if i < etages - 1 else 0.36)
		var sommet := bas - h
		var w := _rx * (1.0 - u * 0.72) * r.randf_range(0.94, 1.06)
		var ax := _penche * -sommet
		var x0 := _penche * -bas
		var poly := PackedVector2Array()
		var cols := PackedColorArray()
		var uvs := PackedVector2Array()
		var t := t0.lightened(u * 0.06)
		var bord_d := PackedVector2Array()
		var bord_g := PackedVector2Array()
		var dents := PackedVector2Array()
		# le flanc droit, de la pointe vers le bas, un peu creusé
		for k in 5:
			var v := float(k) / 4.0
			var q := Vector2(lerpf(ax, x0 + w, v) - sin(v * PI) * w * 0.08, lerpf(sommet, bas, pow(v, 0.9)))
			poly.append(q)
			bord_d.append(q)
		# le bas, en dents d'aiguilles
		var nd := maxi(3, int(w * 2.0 / 4.2))
		for k in range(1, nd):
			var v := float(k) / nd
			var x := lerpf(x0 + w, x0 - w, v)
			var creux := k % 2 == 1
			var q := Vector2(x + r.randf_range(-0.8, 0.8), bas + (-2.2 if creux else 1.2) + r.randf_range(-0.6, 0.6) - sin(v * PI) * 1.5)
			poly.append(q)
			dents.append(q)
		# le flanc gauche, du bas vers la pointe
		for k in 5:
			var v := 1.0 - float(k) / 4.0
			var q := Vector2(lerpf(ax, x0 - w, v) + sin(v * PI) * w * 0.08, lerpf(sommet, bas, pow(v, 0.9)))
			poly.append(q)
			bord_g.append(q)
		for q in poly:
			cols.append(t)
			uvs.append(Vector2(19.0 + clampf((q.x - lerpf(ax, x0, clampf((q.y - sommet) / h, 0.0, 1.0))) / w, -1.0, 1.0), 19.0 + clampf((q.y - sommet) / h, 0.0, 1.0)))
		p.aplat_libre(poly, cols, uvs)
		if froid > 0.25:
			_neige_sur(p, poly, Vector2(ax, sommet + h * 0.25), w * 0.8, h * 0.3, sommet + h * lerpf(0.3, 0.55, froid), r)
		var dents_t := PackedVector2Array([bord_d[bord_d.size() - 1]])
		dents_t.append_array(dents)
		dents_t.append(bord_g[0])
		p.tracer(dents_t, 1.3, ENCRE, false)
		p.tracer(bord_d, 1.6, ENCRE)
		p.tracer(bord_g, 0.9, ENCRE)


# de la neige posée sur un aplat : la part du polygone au-dessus d'une ligne tremblée
func _neige_sur(p, poly: PackedVector2Array, centre: Vector2, rx: float, ry: float, ligne: float, r: RandomNumberGenerator) -> void:
	var masque := PackedVector2Array([Vector2(-200, -400), Vector2(200, -400)])
	for k in 9:
		var x := lerpf(200.0, -200.0, k / 8.0)
		masque.append(Vector2(x, ligne + r.randf_range(-1.6, 1.6) + (x - centre.x) * 0.04))
	var bouts := Geometry2D.intersect_polygons(poly, masque)
	var neige := P.PAPIER.lightened(0.3)
	for b in bouts:
		p.aplat(b, neige, Pinceau.DOME, centre, Vector2(rx, ry) * 1.3)


# des festons : le contour d'un feuillage, d'un buisson (un rayon qui ondule de lobe en lobe)
static func festons(centre: Vector2, rx: float, ry: float, lobes: int, creux: float, r: RandomNumberGenerator, n := 56, aplatir := 0.0) -> PackedVector2Array:
	var phase := r.randf() * TAU
	var amp := PackedFloat32Array()
	for k in lobes:
		amp.append(r.randf_range(0.55, 1.15))
	var out := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		var u := (a + phase) * lobes / TAU
		var k := int(floor(u)) % lobes
		var bosse := sin((u - floor(u)) * PI)
		var rr := 1.0 - creux + creux * pow(bosse, 0.55) * amp[k]
		var q := Vector2(cos(a) * rx * rr, sin(a) * ry * rr)
		if q.y > 0.0:
			q.y *= 1.0 - aplatir
		out.append(centre + q)
	return out


# --- les rochers, les buissons, les touffes, les brindilles ---

func _rocher(p, r: RandomNumberGenerator) -> void:
	var t := _usure()
	if reste <= 0:
		# il n'en reste qu'un tas d'éclats
		for i in 5:
			var q := Vector2(r.randf_range(-9.0, 9.0), r.randf_range(-2.0, 3.0))
			_caillou(p, q, r.randf_range(2.5, 4.5), r)
		return
	var w := _rx * t
	var h := _ry * t
	var poly := PackedVector2Array()
	for i in 7:
		var a := PI + PI * i / 6.0
		var rr := r.randf_range(0.84, 1.06)
		poly.append(Vector2(cos(a) * w * rr, -h * 0.12 + sin(a) * h * rr * 0.92))
	poly.append(Vector2(w * r.randf_range(0.75, 0.9), r.randf_range(1.8, 3.0)))
	poly.append(Vector2(w * r.randf_range(-0.1, 0.2), r.randf_range(3.0, 4.0)))
	poly.append(Vector2(-w * r.randf_range(0.75, 0.9), r.randf_range(1.8, 2.8)))
	var centre := Vector2(0, -h * 0.42)
	var pierre := teinte.lerp(P.IVOIRE, r.randf_range(0.0, 0.12))
	p.aplat(poly, pierre, Pinceau.PIERRE, centre, Vector2(w, h * 0.78))
	# les éclats arrachés : des faces claires, toutes fraîches
	var coups := plein - reste
	for i in coups:
		var k := 2 + i * 2
		var a := poly[k]
		var b := poly[k + 1]
		var m := (a + b) * 0.5 + (centre - (a + b) * 0.5) * 0.35
		var face := PackedVector2Array([a, b, m])
		p.aplat(face, pierre.lightened(0.28), Pinceau.UNI)
		p.tracer(PackedVector2Array([a, m, b]), 0.8, ENCRE)
	var humide := float(climat.get("humide", 0.5))
	if humide > 0.55 and r.randf() < 0.75:
		var mousse := festons(Vector2(-w * 0.25, -h * 0.78), w * 0.55, h * 0.24, 5, 0.3, r, 24)
		var bouts := Geometry2D.intersect_polygons(mousse, poly)
		for b in bouts:
			p.aplat(b, P.MOUSSE.lerp(teinte, 0.15), Pinceau.FEUILLAGE, Vector2(-w * 0.25, -h * 0.78), Vector2(w * 0.55, h * 0.3))
	if float(climat.get("froid", 0.0)) > 0.25:
		_neige_sur(p, poly, Vector2(-w * 0.1, -h * 0.85), w, h * 0.35, -h * lerpf(0.7, 0.5, float(climat["froid"])), r)
	# les lichens, en haut à gauche
	for i in r.randi_range(2, 5):
		var q := Vector2(r.randf_range(-0.75, 0.2) * w, r.randf_range(-0.85, -0.35) * h)
		p.disque(q, r.randf_range(0.7, 1.4), r.randf_range(0.5, 1.0), P.IVOIRE.lerp(P.MOUSSE, r.randf_range(0.1, 0.5)).darkened(0.1))
	# l'encre : le contour, une fêlure
	p.contour(poly, 1.6, ENCRE, r, 3)
	var f0 := poly[r.randi_range(1, 5)]
	var f1 := f0 + (centre - f0) * r.randf_range(0.35, 0.6) + Vector2(r.randf_range(-2, 2), r.randf_range(-1, 1))
	p.tracer(PackedVector2Array([f0, (f0 + f1) * 0.5 + Vector2(1.0, 0.6), f1]), 0.8, Color(ENCRE, 0.75))


func _caillou(p, q: Vector2, s: float, r: RandomNumberGenerator) -> void:
	var poly := PackedVector2Array()
	for i in 6:
		var a := TAU * i / 6.0 + r.randf_range(-0.3, 0.3)
		poly.append(q + Vector2(cos(a) * s, sin(a) * s * 0.7) * r.randf_range(0.8, 1.15))
	p.aplat(poly, teinte, Pinceau.PIERRE, q, Vector2(s, s * 0.8))
	p.contour(poly, 0.9, ENCRE, r, 2)


func _buisson(p, r: RandomNumberGenerator) -> void:
	var c := _ecorce()
	# des tiges qui dépassent, au pied
	for i in 3:
		var x := r.randf_range(-_rx * 0.5, _rx * 0.5)
		p.tracer(PackedVector2Array([Vector2(x, 1.5), Vector2(x * 1.3 + r.randf_range(-2, 2), -5.0)]), 1.3, c)
	var centre := Vector2(0, -_ry * 0.5)
	var poly := festons(centre, _rx, _ry * 0.55, r.randi_range(6, 8), 0.2, r, 44, 0.25)
	var t := teinte.lerp(P.FEUILLE_SOMBRE, 0.2)
	if reste <= 0:
		t = t.lerp(P.TERRE, 0.12)
	p.aplat(poly, t, Pinceau.FEUILLAGE, centre, Vector2(_rx, _ry * 0.55) * 1.08)
	p.contour(poly, 1.35, ENCRE, r, 3)
	for i in 2:
		var q := centre + Vector2(r.randf_range(0.0, 0.6) * _rx, r.randf_range(0.0, 0.4) * _ry * 0.5)
		var arc := PackedVector2Array()
		for k in 5:
			var a := 0.1 + k * 0.33
			arc.append(q + Vector2(cos(a), sin(a) * 0.8) * 4.5)
		p.tracer(arc, 0.8, Color(ENCRE, 0.55))
	# les baies : des grappes luisantes, d'autant moins qu'on en a cueilli
	var baie := P.SANG.lerp(P.BRAISE_ROUGE, 0.55).lightened(0.06)
	var rb := RandomNumberGenerator.new()
	rb.seed = graine + 5
	for g in 3:
		var q := centre + Vector2(rb.randf_range(-0.6, 0.6) * _rx, rb.randf_range(-0.5, 0.45) * _ry * 0.55)
		for k in 3:
			if g * 3 + k >= reste * 3:
				continue
			var b := q + Vector2.from_angle(k * 2.1 + g) * 2.4
			p.disque(b, 2.45, 2.35, ENCRE)
			p.disque(b, 1.85, 1.8, baie, Pinceau.DOME)
			p.disque(b + Vector2(-0.6, -0.7), 0.6, 0.55, Color(1.0, 0.96, 0.9, 0.95))


func _touffe(p, r: RandomNumberGenerator) -> void:
	var paille := teinte.lerp(P.IVOIRE, 0.35)
	var vert := teinte.lightened(0.08)
	if reste <= 0:
		# arrachée : la terre nue, des chaumes, une tige couchée
		p.eventail(Vector2(0, 1), 7.0, 2.8, Color(P.TERRE.darkened(0.3), 0.7), Color(P.TERRE.darkened(0.3), 0.0), 12)
		for i in 6:
			var x := r.randf_range(-4.0, 4.0)
			p.tracer(PackedVector2Array([Vector2(x, 1), Vector2(x + r.randf_range(-1, 1), -r.randf_range(2.5, 4.5))]), 1.2, paille.darkened(0.2), false)
		var a := r.randf_range(-0.3, 0.3)
		var d := Vector2.from_angle(a)
		p.tracer(PackedVector2Array([Vector2(-3, 2) - d * 6.0, Vector2(-3, 2.5), Vector2(-3, 2) + d * 7.0]), 1.1, paille)
		return
	var n := 10 + reste * 4
	var lames: Array = []
	for i in n:
		var x0 := r.randf_range(-3.5, 3.5)
		var cote := signf(x0 + r.randf_range(-0.5, 0.5))
		var h := r.randf_range(12.0, 21.0) * (1.0 if reste >= plein else 0.85)
		var bout := Vector2(x0 * 2.0 + cote * r.randf_range(2.0, 11.0), -h)
		var milieu := Vector2(x0 * 1.3 + bout.x * 0.35, -h * 0.62)
		lames.append([Vector2(x0, 1.0), milieu, bout, r.randf()])
	# de l'arrière vers l'avant : les lames du fond, plus sombres, puis celles du devant, cernées d'encre
	lames.sort_custom(func(a, b): return a[3] < b[3])
	for i in lames.size():
		var l: Array = lames[i]
		var ligne := PackedVector2Array()
		for k in 6:
			var v := k / 5.0
			ligne.append(l[0].lerp(l[1], v).lerp(l[1].lerp(l[2], v), v))
		var avant := float(i) / lames.size()
		var larg := PackedFloat32Array()
		for k in 6:
			larg.append(lerpf(2.5, 0.4, k / 5.0))
		if avant > 0.35:
			var larg_e := PackedFloat32Array()
			for k in 6:
				larg_e.append(larg[k] + 0.9)
			p.tracer(ligne, 2.6, ENCRE, false, larg_e)
		p.tracer(ligne, 2.0, vert.lerp(paille, avant * 0.55).darkened((1.0 - avant) * 0.22), false, larg)
	# des épis, au bout de quelques lames
	for i in mini(3, lames.size()):
		var l: Array = lames[lames.size() - 1 - i * 2]
		var bout: Vector2 = l[2]
		var dir: Vector2 = (bout - l[1]).normalized()
		p.disque(bout - dir * 1.5, 1.1, 2.2, ENCRE)
		p.disque(bout - dir * 1.5, 0.75, 1.7, P.IVOIRE.lerp(P.BRAISE, 0.3))


func _brindille(p, r: RandomNumberGenerator) -> void:
	var bois := P.TERRE.lerp(P.BRAISE, 0.12)
	for i in 3:
		var a := r.randf_range(-0.5, 0.5) + (PI * 0.5 if i == 1 else 0.0) + r.randf_range(-0.3, 0.3)
		var l := r.randf_range(7.0, 11.0)
		var d := Vector2(cos(a), sin(a) * 0.6)
		var m := Vector2(r.randf_range(-2, 2), r.randf_range(-1.5, 1.5))
		var ligne := PackedVector2Array([m - d * l, m + d.orthogonal() * r.randf_range(-1.0, 1.0), m + d * l])
		p.tracer(ligne, 3.1, ENCRE)
		p.tracer(ligne, 2.1, bois)
		p.tracer(PackedVector2Array([ligne[0] + Vector2(0, -0.5), ligne[1] + Vector2(0, -0.6), ligne[2] + Vector2(0, -0.5)]), 0.6, bois.lightened(0.3))
		if r.randf() < 0.6:
			var b := m + d * r.randf_range(-3.0, 4.0)
			var e := b + Vector2.from_angle(a + r.randf_range(0.6, 1.0)) * r.randf_range(3.0, 5.0)
			p.tracer(PackedVector2Array([b, e]), 2.2, ENCRE)
			p.tracer(PackedVector2Array([b, e]), 1.3, bois)
		p.disque(ligne[2], 0.75, 0.7, P.IVOIRE.lerp(P.BRAISE, 0.2).darkened(0.25))


# la couronne d'un arbre : un nœud à part, qui se dessine par son arbre
class Couronne extends Node2D:
	var objet

	func _draw() -> void:
		objet._dessiner_couronne(self)
