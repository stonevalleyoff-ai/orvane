extends RefCounted
# Lisière — les icônes, dessinées à l'encre (scripts/interface_icones.gd)
# Tout ce que le HUD, les cartes de recettes, les objets qui volent vers le sac et les boutons tactiles montrent : un cœur, des
# baies, un œil, une bûche, une pierre, des fibres, de la viande crue ou cuite, la torche, la lance, le feu… Chacune est dessinée
# dans une boîte de 100 unités, centrée, puis mise à la taille voulue : des aplats de la palette cernés d'encre, une touche de lumière.
# Et les gestes de l'encre : un arc au pinceau (épais au milieu, effilé aux bouts), un trait, un disque net.

const P := preload("res://scripts/palette.gd")
const NOMS := ["coeur", "baies", "oeil", "bois", "pierre", "fibre", "viande", "viande_cuite", "torche", "lance", "feu",
	"soleil", "lune", "patte", "croix", "manger", "nourrir", "cuire", "pause"]

const ROUGE := Color("a8321f")          # (les baies, la viande : entre le sang et la braise)
const PIERRE := Color("9d968a")
const PAILLE := Color("b3ad72")
const ECORCE := Color("6b5238")
const CUIT := Color("8a5530")


# une icône : son nom, son centre, sa taille (le côté de sa boîte), sa couleur multipliée (l'alpha, une ombre), un réglage (k :
# l'ouverture de l'œil, de 0 à 1), et la transformation de celui qui dessine (s'il en a une)
static func icone(ci: CanvasItem, nom: String, c: Vector2, s: float, m: Color = Color.WHITE, k: float = 1.0, base: Transform2D = Transform2D.IDENTITY) -> void:
	if s < 1.0:
		return
	ci.draw_set_transform_matrix(base * Transform2D(0.0, Vector2(s, s) / 100.0, 0.0, c))
	# (l'encre ne descend pas sous un pixel et demi : les petites icônes restent nettes)
	var w := maxf(5.0, 150.0 / s)
	match nom:
		"coeur":
			_coeur(ci, w, m)
		"baies":
			_baies(ci, w, m)
		"oeil":
			_oeil(ci, w, m, k)
		"bois":
			_buche(ci, w, m, Vector2.ZERO, -0.32, 1.0)
		"pierre":
			_pierre(ci, w, m)
		"fibre":
			_fibre(ci, w, m)
		"viande":
			_viande(ci, w, m, false)
		"viande_cuite":
			_viande(ci, w, m, true)
		"torche":
			_torche(ci, w, m)
		"lance":
			_lance(ci, w, m)
		"feu":
			_feu(ci, w, m)
		"soleil":
			_soleil(ci, w, m)
		"lune":
			_lune(ci, w, m)
		"patte":
			_patte(ci, w, m)
		"croix":
			_croix(ci, w, m)
		"manger":
			_manger(ci, w, m)
		"nourrir":
			_buche(ci, w, m, Vector2(0, 24), -0.12, 0.8)
			_flamme(ci, w, m, Vector2(0, 12), 30.0, 50.0, 0.0)
		"cuire":
			_cuire(ci, w, m)
		"pause":
			for x in [-13.0, 13.0]:
				_forme(ci, _capsule(Vector2(x, -26), Vector2(x, 26), 8.0), P.IVOIRE * m, w, m)
	ci.draw_set_transform_matrix(base)


# --- les gestes de l'encre ---

# un arc au pinceau, de l'angle a0 à a1 : plus épais au milieu, effilé aux bouts, un peu irrégulier (le grain du pinceau)
static func arc_encre(ci: CanvasItem, c: Vector2, r: float, a0: float, a1: float, largeur: float, couleur: Color, effile: bool = true) -> void:
	var etendue := absf(a1 - a0)
	if etendue < 0.01 or couleur.a <= 0.0:
		return
	# (en morceaux d'un quart de tour au plus : chaque morceau reste un polygone simple)
	var morceaux := int(ceil(etendue / (PI * 0.5)))
	var long := etendue * r
	for m in morceaux:
		var u0 := float(m) / morceaux
		var u1 := float(m + 1) / morceaux
		var n := maxi(4, int((u1 - u0) * long / 3.0))
		var dehors := PackedVector2Array()
		var dedans := PackedVector2Array()
		for i in n + 1:
			var u := lerpf(u0, u1, float(i) / n)
			var a := lerpf(a0, a1, u)
			var e := largeur * (0.9 + 0.1 * sin(a * 5.0 + r * 0.7))
			if effile:
				e *= clampf(minf(u, 1.0 - u) * long / (largeur * 2.2), 0.18, 1.0)
			var d := Vector2.from_angle(a)
			dehors.append(c + d * (r + e * 0.5))
			dedans.append(c + d * (r - e * 0.5))
		dedans.reverse()
		var pts := dehors + dedans
		ci.draw_colored_polygon(pts, couleur)
		# (le bord, d'un trait lissé : le polygone seul serait crénelé)
		ci.draw_polyline(dehors, couleur, 1.0, true)
		dedans.reverse()
		ci.draw_polyline(dedans, couleur, 1.0, true)


# un trait au pinceau, effilé aux deux bouts
static func trait_encre(ci: CanvasItem, a: Vector2, b: Vector2, largeur: float, couleur: Color) -> void:
	var d := b - a
	if d.length() < 0.5:
		return
	var n := d.orthogonal().normalized()
	var pts := PackedVector2Array()
	var k := 10
	for i in k + 1:
		var u := float(i) / k
		pts.append(a + d * u + n * largeur * 0.5 * sin(u * PI) * (0.35 + 0.65 * sin(u * PI)))
	for i in range(k, -1, -1):
		var u := float(i) / k
		pts.append(a + d * u - n * largeur * 0.5 * sin(u * PI) * (0.35 + 0.65 * sin(u * PI)))
	ci.draw_colored_polygon(pts, couleur)
	ci.draw_polyline(pts, couleur, 0.8, true)


# un disque net (draw_circle n'est pas lissé : on le borde d'un trait qui l'est)
static func disque(ci: CanvasItem, c: Vector2, r: float, couleur: Color) -> void:
	if couleur.a <= 0.0 or r <= 0.0:
		return
	ci.draw_circle(c, r, couleur)
	ci.draw_arc(c, r, 0.0, TAU, maxi(16, int(r * 1.5)), couleur, 1.0, true)


# un jeton : le disque d'encre où se pose une icône (une ombre portée, un liseré pâle)
static func jeton(ci: CanvasItem, c: Vector2, r: float, a: float = 1.0, lisere: Color = Color(1, 1, 1, 0)) -> void:
	disque(ci, c + Vector2(0, 2), r + 2.0, Color(0, 0, 0, 0.28 * a))
	disque(ci, c, r, Color(P.ENCRE, 0.7 * a))
	ci.draw_arc(c, r - 1.0, 0.0, TAU, maxi(24, int(r * 2.0)), Color(P.IVOIRE, 0.16 * a), 1.2, true)
	if lisere.a > 0.0:
		ci.draw_arc(c, r - 1.0, 0.0, TAU, maxi(24, int(r * 2.0)), lisere, 1.6, true)


# --- les briques des icônes ---

static func _forme(ci: CanvasItem, pts: PackedVector2Array, fond: Color, w: float, m: Color) -> void:
	if pts.size() < 3:
		return
	ci.draw_colored_polygon(pts, fond)
	var ferme := pts.duplicate()
	ferme.append(pts[0])
	ci.draw_polyline(ferme, P.ENCRE * m, w, true)


static func _ellipse(c: Vector2, rx: float, ry: float, rot: float = 0.0, n: int = 28) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * i / n
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry).rotated(rot))
	return pts


static func _bezier(a: Vector2, b: Vector2, c: Vector2, n: int = 12) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n + 1:
		var u := float(i) / n
		pts.append(a.lerp(b, u).lerp(b.lerp(c, u), u))
	return pts


# un bâton aux bouts ronds, de a à b
static func _capsule(a: Vector2, b: Vector2, r: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var ang := (b - a).angle()
	for i in 9:
		pts.append(b + Vector2.from_angle(ang - PI * 0.5 + PI * i / 8.0) * r)
	for i in 9:
		pts.append(a + Vector2.from_angle(ang + PI * 0.5 + PI * i / 8.0) * r)
	return pts


static func _reflet(ci: CanvasItem, c: Vector2, r: float, a0: float, a1: float, w: float, m: Color, alpha: float = 0.6) -> void:
	ci.draw_arc(c, r, a0, a1, 10, Color(P.PAPIER, alpha) * m, w, true)


# --- les icônes ---

static func _coeur(ci: CanvasItem, w: float, m: Color) -> void:
	var pts := PackedVector2Array()
	for i in 56:
		var t := TAU * i / 56.0
		var x := 16.0 * pow(sin(t), 3)
		var y := -(13.0 * cos(t) - 5.0 * cos(2.0 * t) - 2.0 * cos(3.0 * t) - cos(4.0 * t))
		pts.append(Vector2(x, y - 2.5) * 2.5)
	_forme(ci, pts, ROUGE * m, w, m)
	# (l'ombre du bas, puis la lumière du lobe gauche)
	var bas := Geometry2D.intersect_polygons(pts, PackedVector2Array([Vector2(-60, 8), Vector2(60, -6), Vector2(60, 60), Vector2(-60, 60)]))
	for b in bas:
		ci.draw_colored_polygon(b, Color(P.SANG, 0.55) * m)
	ci.draw_polyline(pts + PackedVector2Array([pts[0]]), P.ENCRE * m, w, true)
	_reflet(ci, Vector2(-17, -13), 9.0, PI * 1.05, PI * 1.6, w * 0.9, m, 0.75)


static func _baies(ci: CanvasItem, w: float, m: Color) -> void:
	ci.draw_polyline(_bezier(Vector2(0, -16), Vector2(-2, -34), Vector2(8, -44)), P.ENCRE * m, w * 1.9, true)
	ci.draw_polyline(_bezier(Vector2(0, -16), Vector2(-2, -34), Vector2(8, -44)), P.MOUSSE * m, w * 0.8, true)
	var feuille := _bezier(Vector2(6, -40), Vector2(22, -56), Vector2(40, -40)) + _bezier(Vector2(40, -40), Vector2(22, -30), Vector2(6, -40))
	_forme(ci, feuille, P.MOUSSE * m, w * 0.8, m)
	for b in [[Vector2(-17, 12), 18.0], [Vector2(17, 14), 17.0], [Vector2(0, -10), 16.0]]:
		_forme(ci, _ellipse(b[0], b[1], b[1]), ROUGE * m, w, m)
		ci.draw_circle(b[0] + Vector2(b[1] * 0.25, b[1] * 0.3), b[1] * 0.55, Color(P.SANG, 0.45) * m)
		ci.draw_circle(b[0] + Vector2(-b[1] * 0.35, -b[1] * 0.35), b[1] * 0.2, Color(P.PAPIER, 0.85) * m)


# l'œil : k, son ouverture (la peur l'ouvre, et la pupille se resserre)
static func _oeil(ci: CanvasItem, w: float, m: Color, k: float) -> void:
	var o := lerpf(0.32, 1.0, clampf(k, 0.0, 1.0))
	var haut := _bezier(Vector2(-46, 2), Vector2(0, -40.0 * o), Vector2(46, 2), 16)
	var bas := _bezier(Vector2(46, 2), Vector2(0, 32.0 * o), Vector2(-46, 2), 16)
	var forme := haut + bas.slice(1, bas.size() - 1)
	ci.draw_colored_polygon(forme, Color("ddd6c4") * m)
	var iris := Geometry2D.intersect_polygons(forme, _ellipse(Vector2(0, 2), 19, 19))
	for p in iris:
		ci.draw_colored_polygon(p, P.PEUR * m)
	var pupille := Geometry2D.intersect_polygons(forme, _ellipse(Vector2(0, 2), lerpf(10.0, 4.0, k), lerpf(10.0, 4.0, k)))
	for p in pupille:
		ci.draw_colored_polygon(p, P.ENCRE * m)
	ci.draw_circle(Vector2(-6, -4), 3.5, Color(P.PAPIER, 0.9 if o > 0.45 else 0.0) * m)
	ci.draw_polyline(bas, P.ENCRE * m, w, true)
	ci.draw_polyline(haut, P.ENCRE * m, w * 1.7, true)
	# (les cils, plus longs quand l'œil s'écarquille)
	for i in 5:
		var u := 0.18 + 0.16 * i
		var p0: Vector2 = haut[int(u * (haut.size() - 1))]
		var dir := (p0 - Vector2(0, 30)).normalized()
		ci.draw_line(p0, p0 + dir * (7.0 + 7.0 * o), P.ENCRE * m, w * 0.8, true)


static func _buche(ci: CanvasItem, w: float, m: Color, c: Vector2, rot: float, e: float) -> void:
	var tr := Transform2D(rot, c)
	var corps := PackedVector2Array([Vector2(-36, -15), Vector2(30, -15), Vector2(30, 15), Vector2(-36, 15)])
	var gauche := _ellipse(Vector2(-36, 0), 7, 15)
	var pts := Geometry2D.merge_polygons(corps, gauche)[0]
	for i in pts.size():
		pts[i] = tr * (pts[i] * e)
	_forme(ci, pts, ECORCE * m, w, m)
	# (l'écorce : trois traits sombres le long du bois)
	for y in [-7.0, 1.0, 8.0]:
		ci.draw_line(tr * (Vector2(-30, y) * e), tr * (Vector2(18 - absf(y), y + 1.0) * e), Color(P.ENCRE, 0.55) * m, w * 0.7, true)
	# (le bout coupé : les cernes)
	var bout := _ellipse(Vector2(30, 0), 9, 15)
	for i in bout.size():
		bout[i] = tr * (bout[i] * e)
	_forme(ci, bout, Color("c9a978") * m, w, m)
	for r in [[5.5, 9.5], [2.2, 4.0]]:
		var cerne := _ellipse(Vector2(30, 0), r[0], r[1], 0.0, 18)
		for i in cerne.size():
			cerne[i] = tr * (cerne[i] * e)
		cerne.append(cerne[0])
		ci.draw_polyline(cerne, Color(ECORCE, 0.9) * m, w * 0.55, true)
	# (un nœud, un bout de branche)
	ci.draw_line(tr * (Vector2(-10, -15) * e), tr * (Vector2(-4, -27) * e), P.ENCRE * m, w * 2.2, true)
	ci.draw_line(tr * (Vector2(-10, -15) * e), tr * (Vector2(-4, -27) * e), ECORCE * m, w * 0.9, true)


static func _pierre(ci: CanvasItem, w: float, m: Color) -> void:
	var pts := PackedVector2Array([Vector2(-40, 20), Vector2(-34, -6), Vector2(-16, -26), Vector2(10, -30), Vector2(32, -15),
		Vector2(40, 10), Vector2(27, 27), Vector2(-12, 31)])
	ci.draw_colored_polygon(pts, PIERRE * m)
	ci.draw_colored_polygon(PackedVector2Array([Vector2(-40, 20), Vector2(-14, 8), Vector2(12, 12), Vector2(40, 10), Vector2(27, 27), Vector2(-12, 31)]), Color(P.CENDRE, 0.55) * m)
	ci.draw_polyline(PackedVector2Array([Vector2(-34, -6), Vector2(-14, 8), Vector2(12, 12), Vector2(32, -15)]), Color(P.ENCRE, 0.6) * m, w * 0.6, true)
	ci.draw_line(Vector2(12, 12), Vector2(10, -30), Color(P.ENCRE, 0.35) * m, w * 0.5, true)
	ci.draw_polyline(PackedVector2Array([Vector2(-28, -6), Vector2(-14, -21), Vector2(4, -24)]), Color(P.PAPIER, 0.7) * m, w * 0.8, true)
	ci.draw_polyline(pts + PackedVector2Array([pts[0]]), P.ENCRE * m, w, true)


static func _fibre(ci: CanvasItem, w: float, m: Color) -> void:
	# (une gerbe d'herbes sèches, liée d'un brin rouille : les brins s'écartent et retombent un peu)
	var bouts := [Vector2(-40, -26), Vector2(-24, -42), Vector2(-4, -48), Vector2(16, -45), Vector2(34, -34), Vector2(44, -18)]
	var brins := []
	for i in bouts.size():
		var b: Vector2 = bouts[i]
		var pied := Vector2(-9.0 + i * 3.6, 44)
		brins.append(_bezier(pied, Vector2(pied.x * 0.4, 10) + Vector2(b.x * 0.1, 0), b, 14))
	for brin in brins:
		ci.draw_polyline(brin, P.ENCRE * m, w * 2.6, true)
	for i in brins.size():
		ci.draw_polyline(brins[i], PAILLE.lerp(P.MOUSSE, 0.35 * (i % 2)) * m, w * 1.2, true)
	_forme(ci, PackedVector2Array([Vector2(-14, 10), Vector2(14, 10), Vector2(15, 22), Vector2(-15, 22)]), P.ECHARPE * m, w * 0.9, m)
	ci.draw_line(Vector2(-13, 16), Vector2(13, 17), Color(P.ENCRE, 0.5) * m, w * 0.5, true)


static func _viande(ci: CanvasItem, w: float, m: Color, cuite: bool) -> void:
	# (l'os, d'un seul tenant : le fût et ses deux têtes, qui dépassent en haut à droite)
	var os := _capsule(Vector2(4, -4), Vector2(30, -30), 8.5)
	for d in [Vector2(-8, 5), Vector2(5, -8)]:
		os = Geometry2D.merge_polygons(os, _ellipse(Vector2(32, -32) + d, 10.5, 10.5, 0.0, 20))[0]
	_forme(ci, os, Color("e8e0cc") * m, w, m)
	ci.draw_line(Vector2(10, -14), Vector2(24, -28), Color(P.PAPIER, 0.8) * m, w * 0.8, true)
	var chair := PackedVector2Array()
	for i in 30:
		var a := TAU * i / 30.0
		var r := 1.0 + 0.07 * sin(a * 3.0 + 1.0)
		chair.append(Vector2(-8, 10) + Vector2(cos(a) * 34.0 * r, sin(a) * 28.0 * r).rotated(-0.75))
	var fond := CUIT if cuite else ROUGE.lerp(P.BRAISE_ROUGE, 0.25)
	_forme(ci, chair, fond * m, w, m)
	if cuite:
		for o in [-9.0, 7.0]:
			ci.draw_line(Vector2(-26 + o, 8 + o), Vector2(-2 + o, -16 + o), Color(P.ENCRE, 0.65) * m, w * 1.1, true)
		ci.draw_arc(Vector2(-6, 8), 18.0, PI * 1.1, PI * 1.45, 8, Color(P.BRAISE_COEUR, 0.45) * m, w * 0.9, true)
		for x in [-30.0, -16.0]:
			ci.draw_polyline(_bezier(Vector2(x, -22), Vector2(x - 8, -34), Vector2(x + 2, -46), 10), Color(P.IVOIRE, 0.6) * m, w * 0.8, true)
	else:
		ci.draw_polyline(_bezier(Vector2(-28, 16), Vector2(-14, -2), Vector2(4, -6)), Color(P.PAPIER, 0.55) * m, w * 0.9, true)
		ci.draw_polyline(_bezier(Vector2(-18, 26), Vector2(-4, 14), Vector2(14, 12)), Color(P.PAPIER, 0.35) * m, w * 0.7, true)
		_reflet(ci, Vector2(-8, 6), 20.0, PI * 1.05, PI * 1.35, w * 0.8, m, 0.5)


static func _flamme(ci: CanvasItem, w: float, m: Color, base: Vector2, larg: float, haut: float, penche: float) -> void:
	var tip := base + Vector2(penche, -haut)
	var g := _bezier(base + Vector2(0, 2), base + Vector2(-larg * 1.05, -haut * 0.25), tip, 14)
	var d := _bezier(tip, base + Vector2(larg * 1.05, -haut * 0.3), base + Vector2(0, 2), 14)
	var dehors := g + d.slice(1, d.size() - 1)
	_forme(ci, dehors, P.BRAISE_ROUGE * m, w, m)
	var g2 := _bezier(base, base + Vector2(-larg * 0.7, -haut * 0.2), base + Vector2(penche * 0.6, -haut * 0.72), 10)
	var d2 := _bezier(base + Vector2(penche * 0.6, -haut * 0.72), base + Vector2(larg * 0.7, -haut * 0.22), base, 10)
	ci.draw_colored_polygon(g2 + d2.slice(1, d2.size() - 1), P.BRAISE * m)
	var g3 := _bezier(base, base + Vector2(-larg * 0.38, -haut * 0.12), base + Vector2(penche * 0.3, -haut * 0.42), 8)
	var d3 := _bezier(base + Vector2(penche * 0.3, -haut * 0.42), base + Vector2(larg * 0.38, -haut * 0.12), base, 8)
	ci.draw_colored_polygon(g3 + d3.slice(1, d3.size() - 1), P.BRAISE_COEUR * m)


static func _torche(ci: CanvasItem, w: float, m: Color) -> void:
	_forme(ci, _capsule(Vector2(-30, 46), Vector2(-2, 2), 8.0), ECORCE * m, w, m)
	ci.draw_line(Vector2(-24, 34), Vector2(-6, 6), Color(P.PAPIER, 0.35) * m, w * 0.7, true)
	# (la tête, de chiffons serrés de fibres)
	var tete := _ellipse(Vector2(2, -6), 17, 12, -1.0)
	_forme(ci, tete, Color("5e4a36") * m, w, m)
	for o in [-7.0, 1.0, 9.0]:
		ci.draw_line(Vector2(-10 + o, 0 + o * 0.2), Vector2(6 + o, -14 + o * 0.2), Color(P.ENCRE, 0.6) * m, w * 0.7, true)
	_flamme(ci, w, m, Vector2(6, -12), 22.0, 42.0, 7.0)


static func _lance(ci: CanvasItem, w: float, m: Color) -> void:
	_forme(ci, _capsule(Vector2(-42, 42), Vector2(10, -10), 6.5), Color("8a6a48") * m, w, m)
	ci.draw_line(Vector2(-34, 30), Vector2(2, -6), Color(P.PAPIER, 0.3) * m, w * 0.6, true)
	# (la pointe : un éclat de pierre en feuille de saule)
	var lame := PackedVector2Array([Vector2(2, -2), Vector2(14, -30), Vector2(46, -46), Vector2(30, -14)])
	_forme(ci, lame, Color("aaa395") * m, w, m)
	ci.draw_line(Vector2(8, -8), Vector2(42, -42), Color(P.ENCRE, 0.45) * m, w * 0.6, true)
	ci.draw_line(Vector2(14, -24), Vector2(32, -38), Color(P.PAPIER, 0.7) * m, w * 0.7, true)
	# (la ligature, de fibres)
	for i in 3:
		var p := Vector2(-2, 2) + Vector2(-1, 1) * (i * 6.0)
		ci.draw_line(p + Vector2(-8, -8), p + Vector2(8, 8), P.ENCRE * m, w * 1.9, true)
		ci.draw_line(p + Vector2(-7, -7), p + Vector2(7, 7), Color("d9cfb4") * m, w * 0.9, true)


static func _feu(ci: CanvasItem, w: float, m: Color) -> void:
	for r in [0.42, -0.42]:
		var tr := Transform2D(r, Vector2(0, 30))
		var b := _capsule(Vector2(-34, 0), Vector2(34, 0), 8.0)
		for i in b.size():
			b[i] = tr * b[i]
		_forme(ci, b, ECORCE * m, w, m)
	_flamme(ci, w, m, Vector2(0, 26), 26.0, 70.0, -4.0)
	for p in [Vector2(-40, 40), Vector2(40, 40), Vector2(0, 44)]:
		_forme(ci, _ellipse(p, 10, 7), PIERRE * m, w * 0.9, m)


static func _soleil(ci: CanvasItem, w: float, m: Color) -> void:
	for i in 8:
		var d := Vector2.from_angle(TAU * i / 8.0)
		ci.draw_line(d * 28.0, d * 42.0, P.BRAISE_COEUR * m, w * 1.3, true)
	_forme(ci, _ellipse(Vector2.ZERO, 21, 21, 0.0, 32), P.BRAISE_COEUR * m, w * 0.8, m)
	ci.draw_circle(Vector2(5, 5), 11.0, Color(P.BRAISE, 0.5) * m)


static func _lune(ci: CanvasItem, w: float, m: Color) -> void:
	var dehors := _ellipse(Vector2.ZERO, 34, 34, 0.0, 40)
	var dedans := _ellipse(Vector2(15, -9), 29, 29, 0.0, 40)
	for p in Geometry2D.clip_polygons(dehors, dedans):
		_forme(ci, p, Color("d8dcd6").lerp(P.LUNE, 0.25) * m, w * 0.8, m)


static func _patte(ci: CanvasItem, w: float, m: Color) -> void:
	_forme(ci, _ellipse(Vector2(0, 16), 21, 17), P.IVOIRE * m, w * 0.8, m)
	for d in [Vector2(-26, -8), Vector2(-10, -24), Vector2(10, -24), Vector2(26, -8)]:
		_forme(ci, _ellipse(d, 9, 11, d.x * 0.012), P.IVOIRE * m, w * 0.8, m)


static func _croix(ci: CanvasItem, w: float, m: Color) -> void:
	trait_encre(ci, Vector2(-34, -30), Vector2(34, 32), 15.0, P.SANG * m)
	trait_encre(ci, Vector2(32, -34), Vector2(-30, 30), 13.0, P.SANG * m)


static func _manger(ci: CanvasItem, w: float, m: Color) -> void:
	for b in [[Vector2(-14, -6), 12.0], [Vector2(12, -6), 12.0], [Vector2(-1, -20), 11.0]]:
		_forme(ci, _ellipse(b[0], b[1], b[1]), ROUGE * m, w * 0.9, m)
		ci.draw_circle(b[0] + Vector2(-b[1] * 0.35, -b[1] * 0.35), b[1] * 0.22, Color(P.PAPIER, 0.85) * m)
	var bol := PackedVector2Array()
	for i in 17:
		var a := PI * i / 16.0
		bol.append(Vector2(cos(a) * 42.0, 2.0 + sin(a) * 34.0))
	_forme(ci, bol, ECORCE * m, w, m)
	ci.draw_line(Vector2(-42, 2), Vector2(42, 2), Color("8a6a48") * m, w * 1.3, true)
	ci.draw_arc(Vector2(0, 2), 30.0, PI * 0.15, PI * 0.45, 8, Color(P.PAPIER, 0.4) * m, w * 0.8, true)


static func _cuire(ci: CanvasItem, w: float, m: Color) -> void:
	_flamme(ci, w, m, Vector2(0, 46), 20.0, 40.0, 0.0)
	_forme(ci, _capsule(Vector2(-46, -6), Vector2(46, -6), 3.5), Color("8a6a48") * m, w * 0.8, m)
	var chair := _ellipse(Vector2(0, -8), 24, 17, 0.1)
	_forme(ci, chair, CUIT * m, w, m)
	ci.draw_line(Vector2(-12, -2), Vector2(2, -18), Color(P.ENCRE, 0.6) * m, w, true)
	ci.draw_line(Vector2(2, 2), Vector2(14, -14), Color(P.ENCRE, 0.6) * m, w, true)
