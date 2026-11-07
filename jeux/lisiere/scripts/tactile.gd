extends CanvasLayer
# Lisière — jouer du doigt (scripts/tactile.gd)
# Sur un écran tactile : le pouce gauche marche (un joystick qui naît où le doigt se pose, dans la moitié gauche de l'écran, et
# qui le suit s'il va trop loin) ; le pouce droit agit (de gros boutons, autour de « Agir »). Les boutons pressent les actions
# du clavier (principal.gd, _actions) : le reste du jeu ne fait pas la différence. Sur un petit écran, l'image grossit ;
# tenu debout, le téléphone demande qu'on le tourne, et la partie attend.
# Il s'allume seul sur un écran tactile, ou au premier toucher.

const ENCRE := Color(0.93, 0.87, 0.74)
const BRAISE := Color(0.95, 0.62, 0.28)
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


func _ready() -> void:
	layer = 11
	_dessin = Control.new()
	_dessin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_dessin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dessin.draw.connect(_dessiner)
	add_child(_dessin)
	_tourner = ColorRect.new()
	_tourner.color = Color(0.02, 0.024, 0.035)
	_tourner.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_tourner.visible = false
	var l := Label.new()
	l.text = "Tourne ton téléphone\nà l'horizontale."
	l.add_theme_font_size_override("font_size", 30)
	l.add_theme_color_override("font_color", ENCRE)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_tourner.add_child(l)
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


func _process(_delta: float) -> void:
	if not actif:
		return
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
	var police := ThemeDB.fallback_font
	var tenus := _doigts.values()
	# la pause : deux traits, en haut au milieu
	var pp := position_bouton("pause")
	_dessin.draw_circle(pp, RAYON_PAUSE, Color(0, 0, 0, 0.5 if not tenus.has("pause") else 0.8))
	_dessin.draw_arc(pp, RAYON_PAUSE, 0.0, TAU, 32, Color(ENCRE, 0.35), 1.5, true)
	_dessin.draw_rect(Rect2(pp + Vector2(-7, -8), Vector2(4.5, 16)), Color(ENCRE, 0.85))
	_dessin.draw_rect(Rect2(pp + Vector2(2.5, -8), Vector2(4.5, 16)), Color(ENCRE, 0.85))
	if jeu.en_pause:
		return
	# le joystick : là où le pouce s'est posé ; au repos, une trace pâle, en bas à gauche
	var tenu := _doigt_stick >= 0
	var c := _centre if tenu else Vector2(130, t.y - 140)
	var a := 0.55 if tenu else 0.2
	_dessin.draw_circle(c, RAYON_STICK, Color(0, 0, 0, a * 0.6))
	_dessin.draw_arc(c, RAYON_STICK, 0.0, TAU, 48, Color(ENCRE, a), 2.0, true)
	_dessin.draw_circle(c + _vecteur * RAYON_STICK, 26.0, Color(ENCRE, a * 0.8))
	# les boutons
	for b in BOUTONS:
		var p: Vector2 = t + b[2]
		var r: float = b[3]
		var dispo := _disponible(b[0])
		var k := 1.0 if dispo else 0.4
		_dessin.draw_circle(p, r, Color(0.05, 0.05, 0.07, 0.85 if tenus.has(b[0]) else 0.55))
		_dessin.draw_arc(p, r, 0.0, TAU, 40, Color(BRAISE, (0.9 if tenus.has(b[0]) else 0.6) * k), 2.0, true)
		var taille := 17 if b[0] == "agir" else 12
		_dessin.draw_string(police, p + Vector2(-r, taille * 0.36), b[1], HORIZONTAL_ALIGNMENT_CENTER, r * 2.0, taille, Color(ENCRE, 0.95 * k))
