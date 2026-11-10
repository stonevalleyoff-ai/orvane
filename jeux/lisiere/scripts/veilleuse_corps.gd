extends RefCounted
# Lisière — le corps de la veilleuse (scripts/veilleuse_corps.gd)
# Sa pose, et son dessin à l'encre. Chaque partie est un point du corps (devant, à sa droite, en hauteur, en pixels), tourné vers
# où elle regarde, puis vu de trois quarts : ce qui vient vers nous descend un peu. Ainsi elle tourne d'un seul tenant (de face,
# de trois quarts, de profil, de dos), sans images à part. Le joueur (scripts/joueur.gd) règle la pose à chaque image ; ici,
# on la dessine : la cape en plis, la capuche profonde et son visage pâle, l'écharpe rouille, le sac de cuir, les bottes.

const P := preload("res://scripts/palette.gd")
const INCL := 0.45            # la vue de trois quarts : ce qui avance vers nous d'un pixel descend d'autant
const TRAIT := 1.0            # l'encre du contour
const MAIN_D := Vector3(2.0, 7.0, 14.5)
const MAIN_G := Vector3(2.0, -7.0, 14.5)
const DIR_TORCHE := Vector3(0.18, -0.2, 1.0) / 1.036

# les couleurs, tirées de la palette
const CAPE := P.CAPE
const CAPE_OMBRE := Color("232733")
const CAPE_LISERE := Color("57607a")
const DOUBLURE := Color("0f121c")
const ECHARPE := P.ECHARPE
const ECHARPE_OMBRE := Color("6d2f18")
const ECHARPE_LISERE := Color("c0653a")
const VISAGE := P.VISAGE
const VISAGE_OMBRE := Color("a8977e")
const CUIR := Color("6e573c")
const CUIR_OMBRE := Color("4a3a28")
const CUIR_CLAIR := Color("9a7b55")
const ROULEAU := Color("7a6c54")
const MAIN := Color("c2b196")
const BOTTE := Color("2e241b")
const JAMBE := Color("1f1c19")
const BOIS := Color("8a6a45")
const PIERRE := Color("8f8a7f")

static var _doux: GradientTexture2D

var ci: CanvasItem
# --- la pose ---
var cap := 0.0                # les hanches : 0 vers nous, PI/2 vers la droite de l'écran, PI de dos, -PI/2 vers la gauche
var buste := 0.0              # le buste (les hanches et une torsion)
var tete := 0.0               # la tête
var bas := 0.0                # combien elle se baisse
var penche := 0.0             # combien le haut du corps passe devant
var elan := 0.0               # le corps qui part en avant (un coup), les pieds restant posés
var souffle := 0.0            # le buste qui monte et descend
var epaules := 0.0            # les épaules qui montent (la peur)
var hanche := 0.0             # le poids d'un pied sur l'autre
var tete_baisse := 0.0
var decal := Vector2.ZERO     # tout le corps, à l'écran (un recul, un tremblement)
var pied_d := Vector3(0, 2.5, 0)      # (devant, côté, levé)
var pied_g := Vector3(0, -2.5, 0)
var main_d := MAIN_D
var main_g := MAIN_G
var objet := ""               # ce que tient la main droite pendant un geste
var lance := false
var lance_main := -1.0        # la main qui tient la lance : -1 la gauche, 1 la droite (quand la gauche tient la torche)
var lance_dir := Vector3(0.2, 0.0, 1.0)
var torche := false           # la main gauche la tient
var cape := Vector2.ZERO      # le bas de la cape, en retard sur le corps
var plis := 0.0
var pan := 0.0                # les pans de l'écharpe, devant
var yeux := 1.0
var chute := Transform2D.IDENTITY
var allonge := 0.0            # 0 debout, 1 couchée
var sens_chute := 1.0
var echarpe := PackedVector2Array()   # la queue de l'écharpe (points, dans le nœud), simulée par le joueur
var mobile := false
# --- ce que le dessin donne au joueur ---
var bout_torche := Vector2.ZERO
var prof_torche := 0.0
var ancre_echarpe := Vector2.ZERO
var prof_echarpe := 0.0
var main_d_ecran := Vector2.ZERO
var main_g_ecran := Vector2.ZERO
var pointe_lance := Vector2.ZERO


static func doux() -> GradientTexture2D:
	if _doux == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		g.add_point(0.45, Color(1, 1, 1, 0.55))
		var t := GradientTexture2D.new()
		t.gradient = g
		t.width = 64
		t.height = 64
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		_doux = t
	return _doux


# --- la projection ---

# un point du corps, tourné vers th, vu de trois quarts (sans la pose)
static func proj(v: Vector3, th: float) -> Vector2:
	var s := sin(th)
	var c := cos(th)
	return Vector2(v.x * s - v.y * c, -v.z + (v.x * c + v.y * s) * INCL)


# combien un point du corps vient vers nous (pour l'ordre du dessin)
static func prof(v: Vector3, th: float) -> float:
	return v.x * cos(th) + v.y * sin(th)


# un point du corps, avec la pose : elle se baisse, se penche, respire, part en avant
func pt(v: Vector3, th: float) -> Vector2:
	var k := clampf((v.z - 1.0) / 8.0, 0.0, 1.0)
	var h := v.z - bas * k
	if v.z > 12.0:
		h += souffle * clampf((v.z - 12.0) / 16.0, 0.0, 1.0)
	var f := v.x + penche * clampf(v.z / 36.0, 0.0, 1.4) + elan * k
	var cote := v.y + hanche * k
	return proj(Vector3(f, cote, h), th) + decal


# les points qui servent au joueur (la torche, l'écharpe, les mains), avant le dessin
func preparer() -> void:
	ancre_echarpe = chute * pt(Vector3(-3.6, 1.6, 29.6 + epaules), buste)
	prof_echarpe = prof(Vector3(-3.6, 1.6, 0.0), buste)
	main_d_ecran = chute * pt(main_d, buste)
	main_g_ecran = chute * pt(main_g, buste)
	if torche:
		bout_torche = chute * pt(main_g + DIR_TORCHE * 10.5, buste)
		prof_torche = prof(main_g, buste)
	if lance:
		var main := main_d if lance_main > 0.0 else main_g
		pointe_lance = chute * pt(main + lance_dir.normalized() * 31.0, buste)


# --- le dessin ---

func dessiner() -> void:
	_ombres()
	ci.draw_set_transform_matrix(chute)
	# les jambes d'abord : la cape les couvre
	var jambes := [[prof(pied_d, cap), pied_d, 1.0], [prof(pied_g, cap), pied_g, -1.0]]
	jambes.sort_custom(func(a, b): return a[0] < b[0])
	for j in jambes:
		_jambe(j[1], j[2])
	var parts := []
	parts.append([-0.5, _manteau])
	parts.append([0.2, _capuche])
	parts.append([0.3, _col])
	parts.append([-6.0 * cos(buste), _sac])
	var pd := prof(Vector3(0, 6.2, 0), buste) + 0.15 * prof(main_d, buste) + 0.6
	var pg := prof(Vector3(0, -6.2, 0), buste) + 0.15 * prof(main_g, buste) + 0.6
	parts.append([pd, _bras.bind(1.0)])
	parts.append([pg, _bras.bind(-1.0)])
	if echarpe.size() > 1:
		parts.append([prof_echarpe - 0.4, _queue])
	parts.append([prof(Vector3(3.6, -1.0, 0), buste) + 0.4, _pans])
	parts.sort_custom(func(a, b): return a[0] < b[0])
	for p in parts:
		p[1].call()
	ci.draw_set_transform_matrix(Transform2D.IDENTITY)


# l'ombre de contact : douce sous le corps, plus nette sous chaque pied posé
func _ombres() -> void:
	var t := doux()
	var c := Vector2(decal.x, decal.y * 0.3 + 0.6)
	var w := 24.0 + 5.0 * clampf(bas / 6.0, 0.0, 1.0) + 34.0 * allonge
	var h := 8.0 + 2.5 * allonge
	c.x += sens_chute * allonge * 17.0
	ci.draw_texture_rect(t, Rect2(c - Vector2(w, h) * 0.5, Vector2(w, h)), false, Color(0, 0, 0, 0.42))
	ci.draw_texture_rect(t, Rect2(c - Vector2(w, h) * 0.3, Vector2(w, h) * 0.6), false, Color(0, 0, 0, 0.28))
	if allonge < 0.5:
		for f in [pied_d, pied_g]:
			var fp := pt(Vector3(f.x + 0.6, f.y, 0.0), cap)
			var a := 0.4 * clampf(1.0 - f.z / 2.6, 0.0, 1.0) * (1.0 - allonge * 2.0)
			ci.draw_texture_rect(t, Rect2(fp - Vector2(4.2, 1.6), Vector2(8.4, 3.2)), false, Color(0, 0, 0, a))


func _jambe(pied: Vector3, cote: float) -> void:
	var hanche_ := Vector3(0.0, cote * 2.6, 9.5)
	var genou := Vector3(pied.x * 0.5 + 0.7 + bas * 0.35, cote * 2.6, 5.2 + pied.z * 0.5)
	var cheville := Vector3(pied.x, pied.y, pied.z + 1.4)
	var pts := PackedVector2Array([pt(hanche_, cap), pt(genou, cap), pt(cheville, cap)])
	ci.draw_polyline(pts, P.ENCRE, 4.6, true)
	ci.draw_polyline(pts, JAMBE, 2.4, true)
	# la botte : la tige, puis le pied qui pointe où elle va
	var tige := PackedVector2Array([pt(Vector3(pied.x - 0.2, pied.y, pied.z + 3.6), cap), pt(Vector3(pied.x, pied.y, pied.z + 0.9), cap)])
	ci.draw_polyline(tige, P.ENCRE, 4.8, true)
	ci.draw_polyline(tige, BOTTE, 2.6, true)
	var talon := pt(Vector3(pied.x - 1.0, pied.y, pied.z + 0.8), cap)
	var orteil := pt(Vector3(pied.x + 2.3, pied.y, pied.z + 0.8), cap)
	var m := (talon + orteil) * 0.5
	var d := orteil - talon
	var rx := d.length() * 0.5 + 1.6
	var ang := d.angle() if d.length() > 0.3 else 0.0
	var sole := _ellipse(m, rx, 1.65, 10, ang)
	_forme(sole, BOTTE)
	ci.draw_line(tige[0] + Vector2(-1.2, 0.4), tige[0] + Vector2(1.2, 0.4), CUIR_OMBRE, 1.0, true)


# un anneau du manteau (h : sa hauteur ; a : sa largeur, de côté ; b : sa profondeur) ; genre 2 : l'ourlet, ses plis
func _anneau(h: float, a: float, b: float, th: float, n: int, genre: int) -> Array:
	var pts := PackedVector2Array()
	var profs := PackedFloat32Array()
	for i in n:
		var al := TAU * i / n
		var k := 1.0
		var hh := h
		var dec := Vector2.ZERO
		if genre == 2:
			k = 1.0 + 0.06 * sin(6.0 * al + plis)
			hh += 0.75 * cos(6.0 * al + plis)
			dec = cape * (0.8 + 0.35 * maxf(0.0, -cos(al)))
		elif genre == 1:
			dec = cape * 0.35
		var v := Vector3(b * cos(al) * k, a * sin(al) * k, hh)
		pts.append(pt(v, th) + dec)
		profs.append(prof(v, th))
	return [pts, profs]


func _extremes(pts: PackedVector2Array) -> Vector2i:
	var g := 0
	var d := 0
	for i in pts.size():
		if pts[i].x < pts[g].x:
			g = i
		if pts[i].x > pts[d].x:
			d = i
	return Vector2i(g, d)


# l'arc d'un anneau, d'un point à un autre, par le côté proche (vers nous) ou lointain
func _arc(pts: PackedVector2Array, profs: PackedFloat32Array, i0: int, i1: int, proche: bool) -> PackedVector2Array:
	var n := pts.size()
	var a := PackedVector2Array()
	var b := PackedVector2Array()
	var sa := 0.0
	var sb := 0.0
	var i := i0
	while true:
		a.append(pts[i])
		sa += profs[i]
		if i == i1:
			break
		i = (i + 1) % n
	i = i0
	while true:
		b.append(pts[i])
		sb += profs[i]
		if i == i1:
			break
		i = (i - 1 + n) % n
	var plus_proche := sa / a.size() > sb / b.size()
	return a if plus_proche == proche else b


# une courbe de a à c qui passe par b (sans a ni c)
static func _courbe(a: Vector2, b: Vector2, c: Vector2, n: int) -> PackedVector2Array:
	var q := b * 2.0 - (a + c) * 0.5
	var out := PackedVector2Array()
	for k in range(1, n):
		var t := float(k) / n
		out.append(a.lerp(q, t).lerp(q.lerp(c, t), t))
	return out


func _manteau() -> void:
	var n := 20 if mobile else 30
	var ep: Array = _anneau(27.2 + epaules, 7.0, 4.8, buste, n, 0)
	var ta: Array = _anneau(17.0, 7.5, 5.6, lerp_angle(cap, buste, 0.5), n, 1)
	var ou: Array = _anneau(8.0, 10.8, 8.4, cap, n, 2)
	var e := _extremes(ep[0])
	var t := _extremes(ta[0])
	var o := _extremes(ou[0])
	var contour := PackedVector2Array()
	contour.append_array(_arc(ep[0], ep[1], e.y, e.x, false))
	contour.append_array(_courbe(ep[0][e.x], ta[0][t.x], ou[0][o.x], 6))
	var ourlet := _arc(ou[0], ou[1], o.x, o.y, true)
	contour.append_array(ourlet)
	contour.append_array(_courbe(ou[0][o.y], ta[0][t.y], ep[0][e.y], 6))
	contour = _simple(contour)
	var cx: float = (ta[0][t.x].x + ta[0][t.y].x) * 0.5
	_remplir(contour, CAPE)
	# l'ombre, du côté loin de la lumière (elle vient d'en haut à gauche)
	_remplir(_vers_droite(contour, cx + 1.0), CAPE_OMBRE)
	# les plis : une ligne qui descend vers chaque creux de l'ourlet, du côté qu'on voit
	for k in 6:
		var al := (-PI * 0.5 - plis + TAU * k) / 6.0
		var vo := Vector3(8.4 * cos(al) * 0.94, 10.8 * sin(al) * 0.94, 8.0 - 0.75)
		if prof(vo, cap) < 1.5:
			continue
		var vt := Vector3(5.6 * cos(al), 7.5 * sin(al), 15.0)
		var bas_ := pt(vo, cap) + cape * 0.85
		var haut := pt(vt, lerp_angle(cap, buste, 0.5)) + cape * 0.35
		var mil := haut.lerp(bas_, 0.55) + Vector2(0.6 * sin(al * 3.0 + plis), 0)
		ci.draw_polyline(PackedVector2Array([haut.lerp(bas_, 0.25), mil, bas_]), CAPE_OMBRE.darkened(0.35), 0.9, true)
	# l'ouverture du manteau, sous la ceinture, quand elle est de face
	var devant := prof(Vector3(1, 0, 0), cap)
	if devant > 0.25:
		var a := pt(Vector3(5.6, 0.0, 16.0), lerp_angle(cap, buste, 0.5)) + cape * 0.35
		var b := pt(Vector3(8.4, 0.0, 7.6), cap) + cape * 0.8
		ci.draw_polyline(PackedVector2Array([a, a.lerp(b, 0.5) + Vector2(0.3, 0), b]), DOUBLURE, 1.2, true)
	# la ceinture, et la bourse à sa hanche droite
	var tl := _arc(ta[0], ta[1], t.x, t.y, true)
	ci.draw_polyline(tl, P.ENCRE, 2.8, true)
	ci.draw_polyline(tl, CUIR_OMBRE, 1.4, true)
	if devant > 0.2:
		var boucle := pt(Vector3(5.7, 0.0, 17.0), lerp_angle(cap, buste, 0.5)) + cape * 0.35
		ci.draw_rect(Rect2(boucle - Vector2(0.9, 0.9), Vector2(1.8, 1.8)), PIERRE.lightened(0.1))
	var vb := Vector3(5.6 * cos(1.75), 7.5 * sin(1.75) + 0.6, 15.2)
	if prof(vb, cap) > -2.5:
		var pb := pt(vb, cap) + cape * 0.35
		var bourse := PackedVector2Array([pb + Vector2(-1.7, -1.0), pb + Vector2(1.7, -1.0), pb + Vector2(1.9, 1.6), pb + Vector2(0.0, 3.0), pb + Vector2(-1.9, 1.6)])
		_forme(bourse, CUIR)
	# le liseré de lumière, en haut et à gauche, puis l'encre
	var lisere := PackedVector2Array()
	for p in contour:
		if p.x < cx - 2.0 and p.y < ourlet[0].y - 1.0:
			lisere.append(p + Vector2(0.9, 0.2))
	if lisere.size() > 1:
		ci.draw_polyline(lisere, CAPE_LISERE, 1.0, true)
	_encre(contour)
	# l'ombre de la capuche sur les épaules
	var col := pt(Vector3(-0.5, 0.0, 28.0 + epaules), buste)
	_remplir(_ellipse(col + Vector2(0.8, 0.6), 7.0, 2.4, 12), CAPE_OMBRE.darkened(0.3))


func _capuche() -> void:
	var th := tete
	var c := pt(Vector3(0.6 + tete_baisse * 0.5, 0.0, 37.4 + epaules * 0.4 - tete_baisse), buste)
	var pic := proj(Vector3(-1.0, 0.0, 0.85), th).normalized()
	var pointe := 3.0 * (0.35 + 0.65 * absf(sin(th)))
	var contour := PackedVector2Array()
	var n := 20 if mobile else 30
	for k in n:
		var be := TAU * k / n
		var dir := Vector2(cos(be), sin(be))
		var p := Vector2(cos(be) * 7.7, sin(be) * 7.0)
		if dir.y > 0.0:
			p.x *= 1.0 + 0.14 * dir.y
		p += dir * pow(maxf(0.0, dir.dot(pic)), 6.0) * pointe
		contour.append(c + p)
	_remplir(contour, CAPE)
	_remplir(_vers_droite(contour, c.x + 1.6), CAPE_OMBRE)
	# l'ouverture, et le visage dans son ombre
	var vis := smoothstep(-0.45, 0.05, cos(th))
	if vis > 0.02:
		var oc := c + proj(Vector3(3.6, 0.0, -1.3), th)
		var rx := 4.9 * (0.5 + 0.5 * absf(cos(th))) * (0.35 + 0.65 * vis)
		var ry := 5.3 * (0.55 + 0.45 * vis)
		var trou := _ellipse(oc, rx, ry, 18)
		for i in trou.size():
			var q := trou[i]
			if q.y < oc.y:
				q.y -= 0.9 * pow((oc.y - q.y) / ry, 4.0)
				trou[i] = q
		_remplir(trou, DOUBLURE)
		var fc := oc + Vector2(sin(th) * minf(0.9, rx * 0.25), 1.0)
		var rxf := rx * 0.62
		var ryf := ry * 0.74
		var face := _ellipse(fc, rxf, ryf, 16)
		_remplir(face, VISAGE)
		_remplir(_vers_droite(face, fc.x + rxf * 0.25), VISAGE_OMBRE)
		# l'ombre du bord de la capuche, sur le front
		var visiere := PackedVector2Array()
		for i in 9:
			var a := PI + PI * i / 8.0
			visiere.append(oc + Vector2(cos(a) * rx * 1.02, sin(a) * ry * 1.02))
		for i in 7:
			var u := 1.0 - float(i) / 6.0
			var x := lerpf(-rx, rx, u)
			visiere.append(oc + Vector2(x, -ry * 0.18 + 0.9 * (1.0 - pow(x / rx, 2.0)) - 0.6))
		_remplir(visiere, DOUBLURE)
		# les deux points des yeux
		var ey := fc.y - ryf * 0.12
		for s in [1.0, -1.0]:
			var oeil := Vector3(3.0, s * 1.45, 0.0)
			if prof(oeil, th) < -0.8:
				continue
			var ex := fc.x + proj(oeil, th).x - proj(Vector3(3.6, 0.0, 0.0), th).x
			if yeux > 0.5:
				ci.draw_rect(Rect2(ex - 0.6, ey - 0.65, 1.2, 1.3), P.ENCRE)
			else:
				ci.draw_line(Vector2(ex - 0.8, ey), Vector2(ex + 0.8, ey), P.ENCRE, 0.7, true)
		_encre(trou, 0.8)
		# le bord de la capuche, qui prend la lumière
		var bord := PackedVector2Array()
		for i in 7:
			var a := PI * 1.08 + PI * 0.7 * i / 6.0
			bord.append(oc + Vector2(cos(a) * (rx + 0.7), sin(a) * (ry + 0.7)))
		ci.draw_polyline(bord, CAPE_LISERE, 0.9, true)
	# de dos : la couture
	if cos(th) < -0.15:
		var haut := c + pic * 9.5
		var a := clampf(-cos(th) * 2.0, 0.0, 1.0)
		ci.draw_polyline(PackedVector2Array([haut, c + pic * 3.0, c + Vector2(0.0, 6.0)]), Color(CAPE_OMBRE.darkened(0.4), a), 0.9, true)
	# le liseré en haut à gauche, puis l'encre
	var lisere := PackedVector2Array()
	for p in contour:
		var d := (p - c).normalized()
		if d.x < 0.25 and d.y < -0.15:
			lisere.append(p - d * 0.9)
	if lisere.size() > 1:
		ci.draw_polyline(lisere, CAPE_LISERE, 1.0, true)
	_encre(contour)


# l'écharpe, nouée autour du cou : le côté qu'on voit
func _col() -> void:
	var n := 24
	var h := 29.6 + epaules
	var pts := PackedVector2Array()
	var profs := PackedFloat32Array()
	for i in n:
		var al := TAU * i / n
		var v := Vector3(4.7 * cos(al), 5.6 * sin(al), h)
		pts.append(pt(v, buste))
		profs.append(prof(v, buste))
	var e := _extremes(pts)
	var arc := _arc(pts, profs, e.x, e.y, true)
	var haut := PackedVector2Array()
	var bas_ := PackedVector2Array()
	for i in arc.size():
		var u := float(i) / maxf(1.0, arc.size() - 1.0)
		var gonfle := 0.45 * sin(u * PI * 3.0 + 0.6)
		haut.append(arc[i] + Vector2(0, -2.1 - gonfle))
		bas_.append(arc[i] + Vector2(0, 1.9 + gonfle * 0.5))
	bas_.reverse()
	var bande := PackedVector2Array()
	bande.append_array(haut)
	bande.append_array(bas_)
	bande = _simple(bande)
	var cx := (pts[e.x].x + pts[e.y].x) * 0.5
	_remplir(bande, ECHARPE)
	_remplir(_vers_droite(bande, cx + 1.2), ECHARPE_OMBRE)
	if haut.size() > 3:
		var clair := haut.slice(0, haut.size() / 2)
		for i in clair.size():
			clair[i] += Vector2(0.3, 0.8)
		ci.draw_polyline(clair, ECHARPE_LISERE, 0.9, true)
	for k in [0.3, 0.62]:
		var i := int(k * (arc.size() - 1))
		var p := arc[i]
		ci.draw_line(p + Vector2(-0.8, -1.1), p + Vector2(0.9, 1.0), ECHARPE_OMBRE.darkened(0.2), 0.8, true)
	_encre(bande, 0.9)


# les deux pans noués devant, qui pendent sur la poitrine
func _pans() -> void:
	var nd := Vector3(3.8, -1.2, 28.3 + epaules)
	if prof(nd, buste) < -0.6:
		return
	var k := pt(nd, buste)
	for i in 2:
		var l := 6.8 if i == 0 else 4.8
		var x0 := -0.7 + i * 1.6
		var bout := k + Vector2(x0 + pan * (1.0 + i * 0.5) + cape.x * 0.25, l)
		var pts := PackedVector2Array([k + Vector2(x0 - 1.6, 0), k + Vector2(x0 + 1.6, 0), bout + Vector2(1.4, 0), bout + Vector2(-0.1, 1.0), bout + Vector2(-1.5, 0)])
		_forme(pts, ECHARPE if i == 0 else ECHARPE_OMBRE, 0.8)
	_forme(_ellipse(k + Vector2(0, -0.3), 1.9, 1.5, 8), ECHARPE_LISERE, 0.8)


# la queue de l'écharpe, qui flotte (ses points viennent du joueur)
func _queue() -> void:
	var n := echarpe.size()
	var gauche := PackedVector2Array()
	var droite := PackedVector2Array()
	for i in n:
		var a := echarpe[maxi(0, i - 1)]
		var b := echarpe[mini(n - 1, i + 1)]
		var t := (b - a).normalized()
		var nrm := Vector2(-t.y, t.x)
		var l := lerpf(1.6, 1.0, float(i) / (n - 1))
		gauche.append(echarpe[i] + nrm * l)
		droite.append(echarpe[i] - nrm * l)
	for i in n - 1:
		var t0 := echarpe[i + 1] - echarpe[i]
		var t1 := echarpe[mini(n - 1, i + 2)] - echarpe[i + 1]
		var envers := t0.cross(t1) < -0.4
		var c := ECHARPE_OMBRE if envers else ECHARPE
		ci.draw_primitive(PackedVector2Array([gauche[i], gauche[i + 1], droite[i + 1], droite[i]]), PackedColorArray([c, c, c, c]), PackedVector2Array())
	var tour := PackedVector2Array()
	tour.append_array(gauche)
	var d2 := droite.duplicate()
	d2.reverse()
	tour.append_array(d2)
	tour.append(gauche[0])
	ci.draw_polyline(tour, P.ENCRE, 0.9, true)
	# la frange
	var fin := echarpe[n - 1]
	var dir := (echarpe[n - 1] - echarpe[n - 2]).normalized()
	for k in 3:
		var o := Vector2(-dir.y, dir.x) * (k - 1) * 0.8
		ci.draw_line(fin + o, fin + o + dir * 1.8, ECHARPE_OMBRE, 0.7, true)


func _sac() -> void:
	var th := buste
	var f0 := -9.8
	var f1 := -4.4
	var s := 4.6
	var h0 := 16.2
	var h1 := 26.4
	var coins := PackedVector2Array()
	for v in [Vector3(f0, -s, h0), Vector3(f0, s, h0), Vector3(f0, s, h1), Vector3(f0, -s, h1), Vector3(f1, -s, h0), Vector3(f1, s, h0), Vector3(f1, s, h1), Vector3(f1, -s, h1)]:
		coins.append(pt(v, th))
	var dos := -cos(th)
	var droite := sin(th)
	# une poche de cuir aux coins ronds, vue de là où l'on est ; le dessus plus clair
	var poche := _arrondi(_enveloppe(coins), 2)
	var cx := (coins[0].x + coins[1].x + coins[4].x + coins[5].x) * 0.25
	_remplir(poche, CUIR)
	_remplir(_vers_droite(poche, cx + 1.4), CUIR_OMBRE)
	_remplir(_arrondi(PackedVector2Array([coins[3], coins[2], coins[6], coins[7]]), 1), CUIR_CLAIR)
	if dos > 0.15:
		# le rabat, et sa boucle
		var milieu := (coins[0].lerp(coins[3], 0.55) + coins[1].lerp(coins[2], 0.55)) * 0.5
		var rabat := _arrondi(PackedVector2Array([coins[3], coins[2], coins[2].lerp(coins[1], 0.4), milieu + Vector2(0, 1.8), coins[3].lerp(coins[0], 0.4)]), 1)
		_forme(rabat, CUIR_OMBRE, 0.8)
		ci.draw_rect(Rect2(milieu + Vector2(-0.8, 0.6), Vector2(1.6, 1.6)), PIERRE.lightened(0.15))
	_encre(poche)
	# le rouleau de couverture, dessus
	var r1 := pt(Vector3(-7.2, -6.2, 28.8), th)
	var r2 := pt(Vector3(-7.2, 6.2, 28.8), th)
	ci.draw_line(r1, r2, P.ENCRE, 5.2, true)
	ci.draw_line(r1, r2, ROULEAU, 3.0, true)
	for u in [0.3, 0.7]:
		var p := r1.lerp(r2, u)
		ci.draw_line(p + Vector2(0, -2.0), p + Vector2(0, 2.0), CUIR_OMBRE, 1.1, true)
	var bout := r1 if droite < 0.0 else r2
	if absf(droite) > 0.25:
		_forme(_ellipse(bout, 1.2 * absf(droite) + 0.4, 2.2, 10), ROULEAU.darkened(0.15))
		ci.draw_arc(bout, 0.8, 0.0, TAU * 0.8, 8, CUIR_OMBRE, 0.6, true)
	# de face : les bretelles sur les épaules
	if dos < -0.25:
		for c in [1.0, -1.0]:
			var a := pt(Vector3(3.0, c * 4.4, 26.8 + epaules), th)
			var b := pt(Vector3(4.6, c * 4.1, 21.5), th)
			ci.draw_line(a, b, CUIR_OMBRE, 1.1, true)


# un bras (cote : 1 le droit, -1 le gauche), de l'épaule à la main
func _bras(cote: float) -> void:
	var main := main_d if cote > 0.0 else main_g
	var epaule := Vector3(0.2, cote * 6.2, 25.8 + epaules)
	var d := main - epaule
	var l := d.length()
	var demi := 7.0
	if l > demi * 2.0 - 0.05:
		main = epaule + d / l * (demi * 2.0 - 0.05)
		d = main - epaule
		l = d.length()
	var pli := Vector3(-0.5, cote * 1.0, -0.4)
	pli = (pli - d * (pli.dot(d) / maxf(0.001, l * l))).normalized()
	var coude := epaule + d * 0.5 + pli * sqrt(maxf(0.0, demi * demi - l * l * 0.25))
	var pts := PackedVector2Array([pt(epaule, buste), pt(coude, buste), pt(main, buste)])
	var loin := prof(Vector3(0, cote, 0), buste) < -0.3
	# (la manche s'arrête au poignet : la main en sort)
	# (deux segments et un coude rond : un trait épais plié fait une pointe)
	var poignet := pts[1].lerp(pts[2], 0.82)
	var tissu := CAPE_OMBRE if loin else CAPE.lightened(0.1)
	ci.draw_line(pts[0], pts[1], P.ENCRE, 4.8, true)
	ci.draw_line(pts[1], poignet, P.ENCRE, 4.6, true)
	ci.draw_circle(pts[1], 2.35, P.ENCRE)
	ci.draw_line(pts[0], pts[1], tissu, 3.0, true)
	ci.draw_line(pts[1], poignet, tissu, 2.8, true)
	ci.draw_circle(pts[1], 1.45, tissu)
	# le brassard de cuir
	var a := pts[1].lerp(pts[2], 0.55)
	var b := pts[1].lerp(pts[2], 0.8)
	ci.draw_line(a, b, CUIR_OMBRE if loin else CUIR, 3.0, true)
	# ce qu'elle tient
	if lance and cote == lance_main:
		_lance(main)
	if cote < 0.0 and torche:
		_torche(main)
	_forme(_ellipse(pts[2], 1.6, 1.5, 8), MAIN.darkened(0.3) if loin else MAIN, 0.9)
	if cote > 0.0 and objet != "":
		_objet(pts[2])


func _lance(main: Vector3) -> void:
	var dir := lance_dir.normalized()
	var pointe := pt(main + dir * 25.0, buste)
	var talon := pt(main - dir * 11.0, buste)
	ci.draw_line(talon, pointe, P.ENCRE, 3.1, true)
	ci.draw_line(talon, pointe, BOIS, 1.5, true)
	var u := (pointe - talon).normalized()
	var nrm := Vector2(-u.y, u.x)
	var k := clampf((pointe - talon).length() / 36.0, 0.5, 1.0)
	var fer := PackedVector2Array([pointe + u * 6.5 * k, pointe + u * 2.0 * k + nrm * 1.8, pointe - u * 0.6, pointe + u * 2.0 * k - nrm * 1.8])
	_forme(fer, PIERRE)
	ci.draw_line(pointe - u * 0.6 + nrm * 1.0, pointe - u * 0.6 - nrm * 1.0, ROULEAU, 1.2, true)
	ci.draw_line(pointe - u * 2.0 + nrm * 1.0, pointe - u * 2.0 - nrm * 1.0, ROULEAU, 1.2, true)


func _torche(main: Vector3) -> void:
	var d := DIR_TORCHE
	var bas_ := pt(main - d * 3.5, buste)
	var haut := pt(main + d * 9.0, buste)
	ci.draw_line(bas_, haut, P.ENCRE, 3.3, true)
	ci.draw_line(bas_, haut, BOIS.darkened(0.25), 1.8, true)
	var tete_ := pt(main + d * 9.8, buste)
	_forme(_ellipse(tete_, 1.9, 2.3, 10), P.CENDRE)
	ci.draw_line(tete_ + Vector2(-1.6, 0.6), tete_ + Vector2(1.6, -0.4), P.ENCRE_DOUCE, 0.8, true)


func _objet(p: Vector2) -> void:
	match objet:
		"caillou":
			_forme(PackedVector2Array([p + Vector2(-2.2, -0.6), p + Vector2(-0.6, -2.3), p + Vector2(1.9, -1.4), p + Vector2(2.2, 0.9), p + Vector2(-0.4, 1.8)]), PIERRE)
		"baie":
			for o in [Vector2(-0.9, -1.4), Vector2(1.0, -1.1), Vector2(0.1, -2.6)]:
				_forme(_ellipse(p + o, 1.05, 1.05, 6), P.SANG.lightened(0.25))
		"fibre":
			for k in 3:
				var a := -PI * 0.5 + (k - 1) * 0.35
				ci.draw_line(p, p + Vector2.from_angle(a) * 4.5, P.MOUSSE.lightened(0.25), 0.9, true)
		"brindille":
			ci.draw_line(p + Vector2(-4.0, 1.2), p + Vector2(4.0, -1.4), P.ENCRE, 2.6, true)
			ci.draw_line(p + Vector2(-4.0, 1.2), p + Vector2(4.0, -1.4), BOIS, 1.2, true)


# --- la silhouette seule (l'éclair d'une blessure, le liseré de lune la nuit) ---

func silhouette(couleur: Color) -> void:
	ci.draw_set_transform_matrix(chute)
	var ep: Array = _anneau(27.2 + epaules, 7.0, 4.8, buste, 24, 0)
	var ou: Array = _anneau(8.0, 10.8, 8.4, cap, 24, 2)
	var tout := PackedVector2Array()
	tout.append_array(ep[0])
	tout.append_array(ou[0])
	_remplir(_enveloppe(tout), couleur)
	var c := pt(Vector3(0.6 + tete_baisse * 0.5, 0.0, 37.4 + epaules * 0.4 - tete_baisse), buste)
	_remplir(_ellipse(c, 7.6, 7.2, 16), couleur)
	ci.draw_set_transform_matrix(Transform2D.IDENTITY)


# le contour du haut, côté lune (en haut à gauche) : la nuit, elle se détache du noir
func lisere_lune(couleur: Color) -> void:
	ci.draw_set_transform_matrix(chute)
	var c := pt(Vector3(0.6 + tete_baisse * 0.5, 0.0, 37.4 + epaules * 0.4 - tete_baisse), buste)
	var pic := proj(Vector3(-1.0, 0.0, 0.85), tete).normalized()
	var arc := PackedVector2Array()
	for k in 12:
		var be := PI * 0.95 + PI * 0.65 * k / 11.0
		var dir := Vector2(cos(be), sin(be))
		arc.append(c + Vector2(cos(be) * 7.5, sin(be) * 7.1) + dir * pow(maxf(0.0, dir.dot(pic)), 6.0) * 3.2)
	ci.draw_polyline(arc, couleur, 1.2, true)
	var ep: Array = _anneau(27.2 + epaules, 7.0, 4.8, buste, 24, 0)
	var ta: Array = _anneau(17.0, 7.5, 5.6, buste, 24, 1)
	var ou: Array = _anneau(8.0, 10.8, 8.4, cap, 24, 2)
	var g := _courbe(ep[0][_extremes(ep[0]).x], ta[0][_extremes(ta[0]).x], ou[0][_extremes(ou[0]).x], 6)
	ci.draw_polyline(g, Color(couleur, couleur.a * 0.7), 1.0, true)
	ci.draw_set_transform_matrix(Transform2D.IDENTITY)


# --- les outils du trait ---

static func _ellipse(c: Vector2, rx: float, ry: float, n: int, ang: float = 0.0) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var rot := Vector2.from_angle(ang)
	for i in n:
		var a := TAU * i / n
		var p := Vector2(cos(a) * rx, sin(a) * ry)
		pts.append(c + Vector2(p.x * rot.x - p.y * rot.y, p.x * rot.y + p.y * rot.x))
	return pts


# un polygone aux coins adoucis (Chaikin)
static func _arrondi(pts: PackedVector2Array, fois: int) -> PackedVector2Array:
	var p := pts
	for k in fois:
		var q := PackedVector2Array()
		for i in p.size():
			var a := p[i]
			var b := p[(i + 1) % p.size()]
			q.append(a.lerp(b, 0.25))
			q.append(a.lerp(b, 0.75))
		p = q
	return p


static func _enveloppe(pts: PackedVector2Array) -> PackedVector2Array:
	var h := Geometry2D.convex_hull(pts)
	if h.size() > 1 and h[0] == h[h.size() - 1]:
		h.remove_at(h.size() - 1)
	return h


# un polygone qui se dessine sans erreur : s'il se croise, son enveloppe
static func _simple(pts: PackedVector2Array) -> PackedVector2Array:
	if pts.size() < 3 or not Geometry2D.triangulate_polygon(pts).is_empty():
		return pts
	var h := Geometry2D.convex_hull(pts)
	if h.size() > 1 and h[0] == h[h.size() - 1]:
		h.remove_at(h.size() - 1)
	return h


# la part du polygone à droite d'une ligne (l'ombre) : ce qui est à gauche est ramené contre elle
static func _vers_droite(pts: PackedVector2Array, x0: float) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in pts:
		out.append(Vector2(maxf(p.x, x0 + (p.x - x0) * 0.16), p.y))
	return out


func _remplir(pts: PackedVector2Array, couleur: Color) -> void:
	if pts.size() < 3:
		return
	var idx := Geometry2D.triangulate_polygon(pts)
	if idx.is_empty():
		pts = _simple(pts)
		idx = Geometry2D.triangulate_polygon(pts)
		if idx.is_empty():
			return
	RenderingServer.canvas_item_add_triangle_array(ci.get_canvas_item(), idx, pts, PackedColorArray([couleur]))


func _encre(pts: PackedVector2Array, largeur: float = TRAIT) -> void:
	if pts.size() < 2:
		return
	var ferme := pts.duplicate()
	ferme.append(pts[0])
	ci.draw_polyline(ferme, P.ENCRE, largeur, true)


func _forme(pts: PackedVector2Array, couleur: Color, largeur: float = TRAIT) -> void:
	_remplir(pts, couleur)
	_encre(pts, largeur)
