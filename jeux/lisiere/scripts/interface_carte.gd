extends Control
# Lisière — la carte de titre (scripts/interface_carte.gd)
# « Nuit 2 » — « Tiens jusqu'au matin. » : au milieu de l'écran, comme au cinéma, un grand titre gravé dont les lettres montent
# une à une, chauffées par la braise ; un trait de braise qui s'étire du milieu vers les bords et jette quelques étincelles ;
# le sous-titre en italique ; puis tout se fond. Un peu plus de trois secondes.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")
const BRAISE := preload("res://shaders/interface_braise.gdshader")
const DUREE := 3.4

var compact := false
var titre := ""
var sous_titre := ""
var _t := -1.0
var _lettres: Control
var _etincelles: Array = []


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_lettres = Lettres.new(self)
	_lettres.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lettres.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var m := ShaderMaterial.new()
	m.shader = BRAISE
	_lettres.material = m
	add_child(_lettres)


func jouer(t: String, s: String) -> void:
	titre = t
	sous_titre = s
	_t = 0.0
	_etincelles.clear()


func arreter() -> void:
	_t = -1.0
	queue_redraw()
	_lettres.queue_redraw()


func en_cours() -> bool:
	return _t >= 0.0


# combien la carte couvre l'écran en ce moment (les notes s'effacent devant elle)
func presence() -> float:
	return opacite() if _t >= 0.0 else 0.0


func _taille_titre() -> int:
	return 54 if compact else 78


func centre() -> Vector2:
	return Vector2(size.x * 0.5, size.y * (0.5 if compact else 0.38))


# l'opacité de l'ensemble : un fondu d'entrée, un fondu de sortie
func opacite() -> float:
	return smoothstep(0.0, 0.5, _t) * (1.0 - smoothstep(DUREE - 0.9, DUREE, _t))


func _demi_trait() -> float:
	return (150.0 if compact else 230.0) * smoothstep(0.35, 1.25, _t)


func _process(d: float) -> void:
	if _t < 0.0:
		return
	_t += d
	if _t > DUREE:
		arreter()
		return
	# (le trait jette des étincelles tant qu'il s'étire et qu'il brûle)
	var l := _demi_trait()
	if _t > 0.4 and _t < DUREE - 0.6 and randf() < d * 26.0:
		var y := centre().y + _taille_titre() * 0.36
		_etincelles.append({"p": Vector2(centre().x + randf_range(-l, l), y), "v": Vector2(randf_range(-12, 12), randf_range(-55, -18)), "age": 0.0, "vie": randf_range(0.6, 1.4)})
	var garder := []
	for s in _etincelles:
		s["age"] = float(s["age"]) + d
		s["p"] = s["p"] + s["v"] * d
		if float(s["age"]) < float(s["vie"]):
			garder.append(s)
	_etincelles = garder
	queue_redraw()
	_lettres.queue_redraw()


func _draw() -> void:
	if _t < 0.0:
		return
	var a := opacite()
	var c := centre()
	var fs := _taille_titre()
	# (un voile sombre derrière, pour qu'on lise sur le jour comme sur la nuit)
	var vh := Vector2(size.x * 0.75, fs * 3.6)
	draw_texture_rect(T.halo(), Rect2(c + Vector2(0, fs * 0.35) - vh * 0.5, vh), false, Color(P.ENCRE, 0.55 * a))
	# (le trait de braise, du milieu vers les bords : une lueur, puis le trait, puis son cœur)
	var l := _demi_trait()
	var y := c.y + fs * 0.36
	if l > 1.0:
		var braise := 0.85 + 0.15 * sin(_t * 11.0)
		draw_texture_rect(T.halo(), Rect2(Vector2(c.x - l * 1.1, y - 14.0), Vector2(l * 2.2, 28.0)), false, Color(P.BRAISE, 0.4 * a))
		I.trait_encre(self, Vector2(c.x - l, y), Vector2(c.x + l, y), 3.6, Color(P.BRAISE_ROUGE, a))
		I.trait_encre(self, Vector2(c.x - l * 0.8, y), Vector2(c.x + l * 0.8, y), 1.8, Color(P.BRAISE, a * braise))
		I.trait_encre(self, Vector2(c.x - l * 0.4, y), Vector2(c.x + l * 0.4, y), 0.9, Color(P.BRAISE_COEUR, a * braise))
	for s in _etincelles:
		var u: float = float(s["age"]) / float(s["vie"])
		I.disque(self, s["p"], 1.3 * (1.0 - u * 0.5), Color(P.BRAISE_COEUR.lerp(P.BRAISE_ROUGE, u), a * (1.0 - u)))
	# (le sous-titre, qui vient après le trait)
	if sous_titre != "":
		var g := T.titre_italique()
		var gs := 20 if compact else 27
		var b := smoothstep(0.9, 1.5, _t) * a
		var lw := g.get_string_size(sous_titre, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
		var p := Vector2(c.x - lw * 0.5, y + gs + 14.0 - 6.0 * (1.0 - smoothstep(0.9, 1.6, _t)))
		draw_string_outline(g, p, sous_titre, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, 6, Color(P.ENCRE, 0.6 * b))
		draw_string(g, p, sous_titre, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.IVOIRE, b))


# les lettres du titre, chacune à son tour (elles passent par le shader de la braise)
class Lettres extends Control:
	var carte

	func _init(c) -> void:
		carte = c

	func _draw() -> void:
		if not carte.en_cours():
			return
		var titre: String = carte.titre
		var f := T.espacee(T.titre(), 4) if titre.length() < 12 else T.titre()
		var fs: int = carte._taille_titre()
		var c: Vector2 = carte.centre()
		var t: float = carte._t
		var a: float = carte.opacite()
		var lw := f.get_string_size(titre, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var x0 := c.x - lw * 0.5
		var asc := f.get_ascent(fs)
		var m := material as ShaderMaterial
		if m != null:
			m.set_shader_parameter("haut", c.y - asc * 0.8)
			m.set_shader_parameter("hauteur", asc * 0.95)
			m.set_shader_parameter("vif", 0.9 + 0.12 * sin(t * 7.0))
		for i in titre.length():
			var ch := titre[i]
			var x := x0 + f.get_string_size(titre.substr(0, i), HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			var u := smoothstep(0.08 + 0.07 * i, 0.6 + 0.07 * i, t)
			var p := Vector2(x, c.y + 10.0 * (1.0 - u))
			var al := u * a
			if al <= 0.0:
				continue
			draw_char(f, p + Vector2(0, 3), ch, fs, Color(0.05, 0.04, 0.03, 0.75 * al))
			draw_char(f, p, ch, fs, Color(1, 1, 1, al))
