extends RefCounted
# Lisière — le pinceau de l'environnement (scripts/decor_pinceau.gd)
# Tout ce que l'environnement dessine passe par ici (objet.gd, decor.gd, monde.gd) : des aplats, des volumes, des traits
# d'encre effilés, accumulés en un seul tableau de triangles par nœud (un seul appel de dessin), puis posés d'un coup (finir).
# Les UV de chaque aplat disent au shader de végétation comment le peindre (shaders/vegetation_feuillage.gdshader) : la couleur
# telle quelle (UNI), un feuillage, une pierre, une écorce, un dôme lisse, des aiguilles ; le shader en fait trois tons.

const UNI := 0.0
const FEUILLAGE := 3.0
const PIERRE := 7.0
const ECORCE := 11.0
const DOME := 15.0
const AIGUILLES := 19.0
const FONDU := 0.55          # la largeur du bord adouci d'un trait (en pixels du monde)
const MAX_POINTS := 60000    # au-delà, on pose un premier tableau et l'on continue

var pts := PackedVector2Array()
var cols := PackedColorArray()
var uvs := PackedVector2Array()
var idx := PackedInt32Array()
var _item := RID()


func commencer(item: RID) -> void:
	_item = item
	vider()


func vider() -> void:
	pts.clear()
	cols.clear()
	uvs.clear()
	idx.clear()


# pose ce qui a été peint sur le nœud
func finir() -> void:
	if not idx.is_empty() and _item.is_valid():
		RenderingServer.canvas_item_add_triangle_array(_item, idx, pts, cols, uvs)
	vider()


func _plein() -> void:
	if pts.size() > MAX_POINTS:
		finir()


# un aplat : un polygone simple ; mode dit comment le peindre, centre et rayon le placent dans son volume (-1 à 1)
func aplat(poly: PackedVector2Array, c: Color, mode := UNI, centre := Vector2.ZERO, rayon := Vector2.ONE) -> void:
	var tri := Geometry2D.triangulate_polygon(poly)
	if tri.is_empty():
		return
	_plein()
	var base := pts.size()
	for p in poly:
		pts.append(p)
		cols.append(c)
		if mode == UNI:
			uvs.append(Vector2.ZERO)
		else:
			uvs.append(Vector2(mode, mode) + (p - centre) / rayon)
	for i in tri:
		idx.append(base + i)


# un aplat aux couleurs et aux UV donnés point par point
func aplat_libre(poly: PackedVector2Array, c: PackedColorArray, uv: PackedVector2Array) -> void:
	var tri := Geometry2D.triangulate_polygon(poly)
	if tri.is_empty():
		return
	_plein()
	var base := pts.size()
	pts.append_array(poly)
	cols.append_array(c)
	uvs.append_array(uv)
	for i in tri:
		idx.append(base + i)


# une bande entre deux lignes de même longueur (une fronde, un ruban) : des triangles, sans triangulation qui puisse échouer
func bande(a: PackedVector2Array, b: PackedVector2Array, c: Color) -> void:
	var n := mini(a.size(), b.size())
	if n < 2:
		return
	_plein()
	var base := pts.size()
	for i in n:
		pts.append(a[i])
		pts.append(b[i])
		cols.append(c)
		cols.append(c)
		uvs.append(Vector2.ZERO)
		uvs.append(Vector2.ZERO)
	for i in n - 1:
		var k := base + i * 2
		idx.append_array([k, k + 1, k + 2, k + 1, k + 3, k + 2])


# un éventail depuis un centre : un disque, une tache, une ombre douce (couleur du centre, couleur du bord)
func eventail(centre: Vector2, rx: float, ry: float, c_centre: Color, c_bord: Color, n := 18, mode := UNI, uv_bord := Vector2.ZERO) -> void:
	_plein()
	var base := pts.size()
	pts.append(centre)
	cols.append(c_centre)
	uvs.append(Vector2(mode, mode) if mode != UNI else Vector2.ZERO)
	for i in n:
		var a := TAU * i / n
		var d := Vector2(cos(a), sin(a))
		pts.append(centre + Vector2(d.x * rx, d.y * ry))
		cols.append(c_bord)
		uvs.append(Vector2(mode, mode) + d * 0.98 if mode != UNI else uv_bord)
	for i in n:
		idx.append_array([base, base + 1 + i, base + 1 + (i + 1) % n])


# un disque (ou une ellipse), peint selon son mode
func disque(centre: Vector2, rx: float, ry: float, c: Color, mode := UNI) -> void:
	var n := clampi(int(maxf(rx, ry) * 1.1) + 8, 10, 28)
	aplat(ellipse(centre, rx, ry, n), c, mode, centre, Vector2(rx, ry))


static func ellipse(centre: Vector2, rx: float, ry: float, n := 16) -> PackedVector2Array:
	var out := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		out.append(centre + Vector2(cos(a) * rx, sin(a) * ry))
	return out


# un trait d'encre : une ligne qui s'effile à ses bouts, au bord adouci ; largeurs : une par point (ou vide : largeur partout)
func tracer(ligne: PackedVector2Array, largeur: float, c: Color, effile := true, largeurs := PackedFloat32Array(), fondu := true) -> void:
	var n := ligne.size()
	if n < 2:
		return
	if not fondu:
		_ruban(ligne, largeur, c, effile, largeurs)
		return
	_plein()
	var base := pts.size()
	var transparent := Color(c.r, c.g, c.b, 0.0)
	for i in n:
		var dir: Vector2
		if i == 0:
			dir = ligne[1] - ligne[0]
		elif i == n - 1:
			dir = ligne[n - 1] - ligne[n - 2]
		else:
			dir = ligne[i + 1] - ligne[i - 1]
		var nrm := dir.normalized().orthogonal()
		var t := float(i) / (n - 1)
		var w := largeurs[i] if largeurs.size() == n else largeur
		if effile:
			w *= 0.3 + 0.7 * sin(t * PI)
		w *= 0.5
		var f := FONDU * 0.5
		pts.append(ligne[i] + nrm * (w + f))
		pts.append(ligne[i] + nrm * maxf(w - f, 0.0))
		pts.append(ligne[i] - nrm * maxf(w - f, 0.0))
		pts.append(ligne[i] - nrm * (w + f))
		# (un trait plus fin que le fondu s'éclaircit, au lieu de s'épaissir)
		var cc := c
		cc.a = c.a * clampf(w * 2.0 / FONDU, 0.25, 1.0)
		cols.append(transparent)
		cols.append(cc)
		cols.append(cc)
		cols.append(transparent)
		for k in 4:
			uvs.append(Vector2.ZERO)
	for i in n - 1:
		var a := base + i * 4
		var b := a + 4
		idx.append_array([a, a + 1, b, a + 1, b + 1, b])
		idx.append_array([a + 1, a + 2, b + 1, a + 2, b + 2, b + 1])
		idx.append_array([a + 2, a + 3, b + 2, a + 3, b + 3, b + 2])


# un trait sans bord adouci (deux points par point de la ligne) : pour les maillages d'herbe, dessinés par milliers
func _ruban(ligne: PackedVector2Array, largeur: float, c: Color, effile: bool, largeurs: PackedFloat32Array) -> void:
	var n := ligne.size()
	var a := PackedVector2Array()
	var b := PackedVector2Array()
	for i in n:
		var dir := ligne[mini(i + 1, n - 1)] - ligne[maxi(i - 1, 0)]
		var nrm := dir.normalized().orthogonal()
		var w := largeurs[i] if largeurs.size() == n else largeur
		if effile:
			w *= 0.3 + 0.7 * sin(float(i) / (n - 1) * PI)
		a.append(ligne[i] + nrm * w * 0.5)
		b.append(ligne[i] - nrm * w * 0.5)
	bande(a, b, c)


# le contour d'un polygone fermé, à l'encre, en quelques traits qui ne se rejoignent pas tout à fait ; plus épais du côté de
# l'ombre (en bas à droite)
func contour(poly: PackedVector2Array, largeur: float, c: Color, r: RandomNumberGenerator, morceaux := 3) -> void:
	var n := poly.size()
	if n < 3:
		return
	var depart := r.randi_range(0, n - 1)
	var par := float(n) / morceaux
	var centre := Vector2.ZERO
	for p in poly:
		centre += p
	centre /= n
	for m in morceaux:
		var a := int(round(m * par))
		var b := int(round((m + 1) * par)) + 1
		var ligne := PackedVector2Array()
		var larg := PackedFloat32Array()
		for i in range(a, b + 1):
			var p := poly[(depart + i) % n]
			ligne.append(p)
			var cote := (p - centre).normalized().dot(Vector2(0.6, 0.8))
			larg.append(largeur * (0.75 + 0.55 * maxf(cote, 0.0)) * r.randf_range(0.85, 1.15))
		tracer(ligne, largeur, c, true, larg)


# un quadrilatère aux UV de 0 à 1 (une ombre, une tache)
func quad(rect: Rect2, c: Color) -> void:
	_plein()
	var base := pts.size()
	pts.append_array([rect.position, rect.position + Vector2(rect.size.x, 0), rect.end, rect.position + Vector2(0, rect.size.y)])
	for i in 4:
		cols.append(c)
	uvs.append_array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	idx.append_array([base, base + 1, base + 2, base, base + 2, base + 3])
