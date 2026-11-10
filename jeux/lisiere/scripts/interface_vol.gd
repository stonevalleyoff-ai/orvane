extends Control
# Lisière — ce qu'on ramasse vole jusqu'au sac (scripts/interface_vol.gd)
# L'icône de ce qu'on vient de prendre part de l'endroit du lieu (passé à l'écran), monte en arc, tourne un peu, et se pose dans
# sa case du sac (scripts/interface_hud.gd, Sac), qui sautille à l'arrivée ; « +2 » s'élève et se fond là où l'on a pris.
# Plusieurs à la fois partent l'une après l'autre (quatre au plus) ; le nombre de la case attend qu'elles arrivent.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")

var sac
var compact := false
var _vols: Array = []
var _textes: Array = []


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func lancer(objet: String, n: int, depuis: Vector2) -> void:
	if sac == null or n <= 0 or not _dans_le_sac(objet):
		return
	var k := mini(n, 4)
	var reste := n
	sac.attendre(objet, n)
	for i in k:
		var part := int(ceil(float(reste) / float(k - i)))
		reste -= part
		_vols.append({"objet": objet, "part": part, "de": depuis + Vector2(randf_range(-7.0, 7.0), randf_range(-5.0, 4.0)),
			"t": -0.09 * i, "duree": randf_range(0.62, 0.78), "tour": randf_range(-0.7, 0.7)})
	_textes.append({"texte": "+%d" % n, "p": depuis + Vector2(0, -14), "t": 0.0})


func _dans_le_sac(objet: String) -> bool:
	return sac.CASES.has(objet)


func vider() -> void:
	_vols.clear()
	_textes.clear()
	if sac != null:
		sac.oublier_les_vols()
	queue_redraw()


func _cible(objet: String) -> Vector2:
	return get_global_transform().affine_inverse() * (sac.get_global_transform() * sac.centre(objet))


func _process(d: float) -> void:
	if _vols.is_empty() and _textes.is_empty():
		return
	var garder := []
	for v in _vols:
		v["t"] = float(v["t"]) + d
		if float(v["t"]) >= float(v["duree"]):
			sac.arrivee(v["objet"], int(v["part"]))
		else:
			garder.append(v)
	_vols = garder
	var g2 := []
	for t in _textes:
		t["t"] = float(t["t"]) + d
		if float(t["t"]) < 1.1:
			g2.append(t)
	_textes = g2
	queue_redraw()


func _draw() -> void:
	var taille := 30.0 if compact else 38.0
	for v in _vols:
		var t: float = v["t"]
		if t < 0.0:
			continue
		var u := clampf(t / float(v["duree"]), 0.0, 1.0)
		var e := u * u * (3.0 - 2.0 * u)
		var de: Vector2 = v["de"]
		var vers := _cible(v["objet"])
		var ctrl := (de + vers) * 0.5 + Vector2(0, -minf(220.0, de.distance_to(vers) * 0.42))
		var p := de.lerp(ctrl, e).lerp(ctrl.lerp(vers, e), e)
		var pop := 1.0 + 0.45 * sin(minf(u * 4.0, 1.0) * PI)
		var s := lerpf(taille, taille * 0.72, e) * pop
		var h := s * 1.4
		draw_texture_rect(T.halo(), Rect2(p - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(P.BRAISE_COEUR, 0.5 * (1.0 - e * 0.5)))
		# (une traîne : deux échos pâles, un peu en arrière sur le chemin)
		for k in [0.08, 0.16]:
			var e2 := maxf(0.0, e - k)
			var q := de.lerp(ctrl, e2).lerp(ctrl.lerp(vers, e2), e2)
			I.icone(self, v["objet"], q, s * 0.8, Color(1, 1, 1, 0.18 * (1.0 - k * 4.0)))
		I.icone(self, v["objet"], Vector2.ZERO, s, Color.WHITE, 0.6, Transform2D(float(v["tour"]) * sin(e * PI), p))
	var g := T.texte_gras()
	var gs := 17 if compact else 20
	for t in _textes:
		var u2: float = float(t["t"]) / 1.1
		var a := smoothstep(0.0, 0.12, u2) * (1.0 - smoothstep(0.55, 1.0, u2))
		var p2: Vector2 = t["p"] + Vector2(0, -30.0 * u2)
		var lw := g.get_string_size(t["texte"], HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
		draw_string_outline(g, p2 - Vector2(lw * 0.5, 0), t["texte"], HORIZONTAL_ALIGNMENT_LEFT, -1, gs, 6, Color(P.ENCRE, 0.85 * a))
		draw_string(g, p2 - Vector2(lw * 0.5, 0), t["texte"], HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.BRAISE_COEUR, a))
