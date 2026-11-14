extends CanvasLayer
# Lisière — jouer du doigt (scripts/tactile.gd)
# Sur un écran tactile : le pouce gauche marche (un joystick qui naît où le doigt se pose, dans la moitié gauche de l'écran, et
# qui le suit s'il va trop loin) ; le pouce droit agit (de gros boutons, autour de « Agir »). Les boutons pressent les actions
# du clavier (principal.gd, _actions) : le reste du jeu ne fait pas la différence. Sur un petit écran, l'image grossit ;
# tenu debout, le téléphone demande qu'on le tourne, et la partie attend.
# Il s'allume seul sur un écran tactile, ou au premier toucher. Les boutons sont des jetons d'encre, chacun avec l'icône du HUD
# (scripts/interface_icones.gd) et son nom ; pressés, ils s'enfoncent et s'allument ; sans de quoi s'en servir, ils pâlissent.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")
const ENCRE := P.IVOIRE
const BRAISE := P.BRAISE
const RAYON_STICK := 62.0
const PAUSE := Vector2(0, 38)          # depuis le milieu du haut de l'écran
const RAYON_PAUSE := 23.0
# l'action, ce qui est écrit, la place (depuis le coin en bas à droite), le rayon
const BOUTONS := [
	["agir", "Agir", Vector2(-92, -100), 50.0],
	["feu", "Feu", Vector2(-205, -96), 31.0],
	["torche", "Torche", Vector2(-172, -182), 31.0],
	["lance", "Lance", Vector2(-90, -214), 31.0],
	["nourrir", "Nourrir", Vector2(-292, -150), 29.0],
	["cuire", "Cuire", Vector2(-230, -258), 29.0],
	["manger", "Manger", Vector2(-120, -306), 29.0],
]
const MARCHE := {"droite": Vector2.RIGHT, "gauche": Vector2.LEFT, "bas": Vector2.DOWN, "haut": Vector2.UP}
const ICONES := {"feu": "feu", "torche": "torche", "lance": "lance", "nourrir": "nourrir", "cuire": "cuire", "manger": "manger"}

var jeu
var actif := false
var portrait := false
var _doigt_stick := -1
var _centre := Vector2.ZERO
var _vecteur := Vector2.ZERO
var _doigts := {}        # le doigt → l'action qu'il tient
var _marche := {}        # les actions de marche que ce joystick tient
var _dessin: Control
var _tourner: ColorRect
var _appuis := {}        # l'action → combien le bouton est enfoncé (de 0 à 1)
var _t := 0.0


func _ready() -> void:
	layer = 11
	_dessin = Control.new()
	_dessin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_dessin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dessin.draw.connect(_dessiner)
	add_child(_dessin)
	_tourner = ColorRect.new()
	_tourner.color = P.NUIT
	_tourner.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_tourner.visible = false
	_tourner.theme = T.theme()
	var l := T.libelle("Tourne ton téléphone\nà l'horizontale.", T.titre(), 30, ENCRE)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	l.offset_top = 90
	_tourner.add_child(l)
	var tel := Control.new()
	tel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	tel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tel.draw.connect(_dessiner_telephone.bind(tel))
	_tourner.add_child(tel)
	add_child(_tourner)
	get_tree().root.size_changed.connect(_ajuster)
	if DisplayServer.is_touchscreen_available():
		activer.call_deferred()


func activer() -> void:
	if actif:
		return
	actif = true
	# (un toucher fait aussi un clic de souris, pour les boutons des écrans : il ne doit pas frapper à chaque fois)
	for e in InputMap.action_get_events("agir"):
		if e is InputEventMouseButton:
			InputMap.action_erase_event("agir", e)
	if jeu != null and jeu.ui != null:
		jeu.ui.passer_au_tactile()
	_ajuster()


# sur un petit écran, l'image grossit : la hauteur montrée suit celle de l'écran (en pixels CSS), entre 480 et 720
func _ajuster() -> void:
	var px := Vector2(DisplayServer.window_get_size())
	var css := px / maxf(1.0, DisplayServer.screen_get_scale())
	portrait = css.y > css.x * 1.05
	if actif and css.x > 0.0 and css.y > 0.0:
		var h := clampf(minf(css.x, css.y), 480.0, 720.0)
		get_tree().root.content_scale_size = Vector2i(int(h * 16.0 / 9.0), int(h))
	_tourner.visible = actif and portrait


func _en_jeu() -> bool:
	return jeu != null and jeu.en_partie and jeu.joueur != null


func _taille() -> Vector2:
	return _dessin.get_viewport_rect().size


func position_bouton(action: String) -> Vector2:
	if action == "pause":
		return Vector2(_taille().x * 0.5, 0) + PAUSE
	for b in BOUTONS:
		if b[0] == action:
			return _taille() + b[2]
	return Vector2(-1, -1)


func _bouton_sous(p: Vector2) -> String:
	if p.distance_to(position_bouton("pause")) < RAYON_PAUSE * 1.3:
		return "pause"
	if jeu.en_pause:
		return ""
	for b in BOUTONS:
		if p.distance_to(_taille() + b[2]) < float(b[3]) * 1.12:
			return b[0]
	return ""


func _input(e: InputEvent) -> void:
	if not (e is InputEventScreenTouch or e is InputEventScreenDrag):
		return
	if not actif:
		activer()
	# (un doigt qui se lève lâche ce qu'il tenait, quoi qu'il arrive à l'écran)
	if e is InputEventScreenTouch and not e.pressed:
		if _doigts.has(e.index):
			Input.action_release(_doigts[e.index])
			_doigts.erase(e.index)
		if e.index == _doigt_stick:
			_doigt_stick = -1
			_vecteur = Vector2.ZERO
		return
	if not _en_jeu() or portrait:
		return
	if e is InputEventScreenTouch:
		var b := _bouton_sous(e.position)
		if b != "":
			_doigts[e.index] = b
			Input.action_press(b)
		elif e.position.x < _taille().x * 0.5 and _doigt_stick < 0 and not jeu.en_pause:
			_doigt_stick = e.index
			_centre = e.position
			_vecteur = Vector2.ZERO
	elif e.index == _doigt_stick:
		var d: Vector2 = e.position - _centre
		if d.length() > RAYON_STICK:
			# (le joystick suit le doigt qui va trop loin : on ne le perd jamais)
			_centre = e.position - d.normalized() * RAYON_STICK
			d = e.position - _centre
		_vecteur = d / RAYON_STICK


func _process(delta: float) -> void:
	if not actif:
		return
	_t += delta
	var tenus := _doigts.values()
	for b in BOUTONS + [["pause"]]:
		var a: String = b[0]
		_appuis[a] = move_toward(float(_appuis.get(a, 0.0)), 1.0 if tenus.has(a) else 0.0, delta * (16.0 if tenus.has(a) else 6.0))
	if _tourner.visible:
		_tourner.get_child(1).queue_redraw()
	if portrait and _en_jeu() and not jeu.en_pause:
		jeu.en_pause = true
		jeu.ui.montrer_pause(true)
	if not _en_jeu() or jeu.en_pause or portrait:
		_lacher()
	for a in MARCHE:
		var f := clampf(_vecteur.dot(MARCHE[a]), 0.0, 1.0)
		if f > 0.08:
			Input.action_press(a, f)
			_marche[a] = true
		elif _marche.has(a):
			Input.action_release(a)
			_marche.erase(a)
	_dessin.queue_redraw()


# tout lâcher : la partie s'arrête, se met en pause, ou le téléphone se lève
func _lacher() -> void:
	for i in _doigts.keys():
		if _doigts[i] != "pause":
			Input.action_release(_doigts[i])
			_doigts.erase(i)
	_doigt_stick = -1
	_vecteur = Vector2.ZERO


func _disponible(action: String) -> bool:
	var inv: Dictionary = jeu.joueur.inventaire
	match action:
		"feu", "torche", "lance":
			return jeu.peut_fabriquer(action)
		"manger":
			return int(inv["baies"]) + int(inv["viande"]) + int(inv["viande_cuite"]) > 0
		"nourrir":
			return int(inv["bois"]) > 0 and not jeu.feux.is_empty()
		"cuire":
			return int(inv["viande"]) > 0 and not jeu.feux.is_empty()
	return true


func _dessiner() -> void:
	if not actif or not _en_jeu() or portrait:
		return
	var t := _taille()
	# la pause : un jeton, deux traits, en haut au milieu
	var pp := position_bouton("pause")
	_jeton(pp, RAYON_PAUSE, float(_appuis.get("pause", 0.0)), true)
	I.icone(_dessin, "pause", pp, RAYON_PAUSE * 0.95, Color(1, 1, 1, 0.9))
	if jeu.en_pause:
		return
	# le joystick : là où le pouce s'est posé ; au repos, une trace pâle, en bas à gauche
	var tenu := _doigt_stick >= 0
	var c := _centre if tenu else Vector2(130, t.y - 140)
	var a := 0.8 if tenu else 0.32
	I.disque(_dessin, c, RAYON_STICK, Color(P.ENCRE, 0.42 * a))
	_dessin.draw_arc(c, RAYON_STICK - 1.0, 0.0, TAU, 64, Color(ENCRE, 0.4 * a), 2.0, true)
	for k in 4:
		var d := Vector2.from_angle(k * PI * 0.5)
		var q := c + d * (RAYON_STICK - 12.0)
		var o := d.orthogonal() * 5.0
		_dessin.draw_polyline(PackedVector2Array([q - d * 4.0 + o, q, q - d * 4.0 - o]), Color(ENCRE, 0.5 * a), 1.6, true)
	var bout := c + _vecteur * RAYON_STICK
	I.disque(_dessin, bout + Vector2(0, 2), 27.0, Color(0, 0, 0, 0.3 * a))
	I.disque(_dessin, bout, 26.0, Color(P.ENCRE.lerp(P.CAPE, 0.5), 0.9 * a))
	_dessin.draw_arc(bout, 25.0, 0.0, TAU, 48, Color(BRAISE if tenu else ENCRE, 0.85 * a), 2.0, true)
	I.disque(_dessin, bout, 6.0, Color(ENCRE, 0.5 * a))
	if not tenu:
		var g := T.texte_gras()
		var lw := g.get_string_size("marcher", HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
		_dessin.draw_string(g, c + Vector2(-lw * 0.5, RAYON_STICK + 16.0), "marcher", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(ENCRE, 0.45))
	# les boutons
	for b in BOUTONS:
		var p: Vector2 = t + b[2]
		var r: float = b[3]
		var dispo := _disponible(b[0])
		var appui := float(_appuis.get(b[0], 0.0))
		var k := 1.0 - 0.07 * appui
		_dessin.draw_set_transform(p * (1.0 - k), 0.0, Vector2(k, k))
		_jeton(p, r, appui, dispo)
		var m := Color(1, 1, 1, 1.0 if dispo else 0.4)
		if b[0] == "agir":
			var f := T.titre()
			var lw2 := f.get_string_size(b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 26).x
			_dessin.draw_string_outline(f, p + Vector2(-lw2 * 0.5, 9), b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 26, 5, Color(P.ENCRE, 0.7))
			_dessin.draw_string(f, p + Vector2(-lw2 * 0.5, 9), b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 26, P.PAPIER.lerp(P.BRAISE_COEUR, appui))
		else:
			I.icone(_dessin, ICONES[b[0]], p + Vector2(0, -r * 0.18), r * 1.08, m, 1.0, Transform2D(0.0, Vector2(k, k), 0.0, p * (1.0 - k)))
			var g2 := T.texte_gras()
			var lw3 := g2.get_string_size(b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
			var q2 := p + Vector2(-lw3 * 0.5, r * 0.66)
			_dessin.draw_string_outline(g2, q2, b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, 4, Color(P.ENCRE, 0.8))
			_dessin.draw_string(g2, q2, b[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(ENCRE, 0.95 if dispo else 0.45))
		_dessin.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


# un jeton d'encre : une ombre, le disque, un liseré de braise (plus vif quand on presse ; éteint s'il ne sert à rien)
func _jeton(p: Vector2, r: float, appui: float, dispo: bool) -> void:
	if appui > 0.01:
		var h := r * 2.2
		_dessin.draw_texture_rect(T.halo(), Rect2(p - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(P.BRAISE, 0.35 * appui))
	I.disque(_dessin, p + Vector2(0, 2), r + 1.5, Color(0, 0, 0, 0.3))
	I.disque(_dessin, p, r, Color(P.ENCRE, 0.62 + 0.22 * appui))
	_dessin.draw_arc(p, r - 3.5, 0.0, TAU, 48, Color(ENCRE, 0.12), 1.0, true)
	var bord := Color(BRAISE, 0.7 if dispo else 0.0).lerp(P.BRAISE_COEUR, appui)
	if not dispo:
		bord = Color(ENCRE, 0.18)
	I.arc_encre(_dessin, p, r - 1.2, -PI * 0.5, PI * 1.5, 2.0 + 1.4 * appui, bord, false)


# « tourne ton téléphone » : un téléphone debout qui se couche, une flèche en arc
func _dessiner_telephone(c: Control) -> void:
	var centre := c.size * 0.5 + Vector2(0, -50)
	var u := smoothstep(0.2, 0.8, fmod(_t, 2.4) / 2.4)
	var rot := -PI * 0.5 * u
	c.draw_set_transform(centre, rot, Vector2.ONE)
	var corps := StyleBoxFlat.new()
	corps.bg_color = Color(P.ENCRE, 0.6)
	corps.border_color = ENCRE
	corps.set_border_width_all(3)
	corps.set_corner_radius_all(9)
	corps.anti_aliasing = true
	c.draw_style_box(corps, Rect2(Vector2(-24, -42), Vector2(48, 84)))
	c.draw_line(Vector2(-8, 33), Vector2(8, 33), Color(ENCRE, 0.7), 2.0, true)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	I.arc_encre(c, centre, 66.0, -PI * 0.15, -PI * 0.15 - PI * 0.5 * u, 3.0, Color(BRAISE, 0.9))
