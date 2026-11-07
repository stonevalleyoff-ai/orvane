extends CanvasLayer
# Lisière — ce qu'on lit à l'écran (scripts/interface.gd)
# L'écran-titre (le monde d'Orvane, aujourd'hui ; le choix du lieu), les jauges (santé, faim, peur), l'heure, ce qu'on porte,
# ce qu'on peut fabriquer, les messages, la peur qui ferme l'image, et l'écran de fin : les nuits tenues, et ce que la partie
# renvoie au monde. Tout est construit ici, dans le code.

signal commencer(biome: String)
signal recommencer
signal vers_titre

const R := preload("res://scripts/regles.gd")
const ENCRE := Color(0.93, 0.87, 0.74)
const PALE := Color(0.62, 0.6, 0.56)
const BRAISE := Color(0.95, 0.62, 0.28)

var _titre: Control
var _hud: Control
var _fin: Control
var _pause: Label
var _chargement: Label
var _lieux: OptionButton
var _infos: Label
var _etat_titre: Label
var _record: Label
var _jauges: Jauges
var _horloge: Label
var _compteurs: Label
var _inventaire: Label
var _aide: Label
var _recettes: Array = []
var _boite_messages: VBoxContainer
var _messages: Array = []
var _vignette: TextureRect
var _rouge: ColorRect
var _fin_titre: Label
var _fin_resume: Label
var _fin_lot: Label
var _peur := 0.0


func _ready() -> void:
	layer = 10
	_construire_titre()
	_construire_hud()
	_construire_fin()
	_pause = _label("Pause. Échap pour reprendre.", 26, ENCRE)
	_pause.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_pause.visible = false
	add_child(_pause)
	_chargement = _label("", 22, PALE)
	_chargement.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_chargement.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chargement.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chargement.visible = false
	add_child(_chargement)
	_montrer(null)


func _montrer(c) -> void:
	_titre.visible = c == _titre
	_hud.visible = c == _hud
	_fin.visible = c == _fin
	_chargement.visible = false


# --- l'écran-titre ---

func _construire_titre() -> void:
	_titre = _plein(Color(0.02, 0.024, 0.035))
	add_child(_titre)
	var braise := Braise.new()
	braise.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_titre.add_child(braise)
	var centre := CenterContainer.new()
	centre.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_titre.add_child(centre)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	centre.add_child(v)
	v.add_child(_centre(_label("LISIÈRE", 88, ENCRE)))
	v.add_child(_centre(_label("Tenir jusqu'au matin.", 22, PALE)))
	v.add_child(_espace(18))
	_infos = _centre(_label("Le monde d'Orvane s'éveille…", 15, Color(0.55, 0.62, 0.66)))
	v.add_child(_infos)
	var h := HBoxContainer.new()
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_theme_constant_override("separation", 12)
	h.add_child(_label("Le lieu", 16, PALE))
	_lieux = OptionButton.new()
	_lieux.custom_minimum_size = Vector2(340, 40)
	_lieux.add_theme_font_size_override("font_size", 16)
	h.add_child(_lieux)
	v.add_child(h)
	var b := _bouton("Entrer dans la nuit")
	b.pressed.connect(_lancer)
	var hb := HBoxContainer.new()
	hb.alignment = BoxContainer.ALIGNMENT_CENTER
	hb.add_child(b)
	v.add_child(hb)
	_etat_titre = _centre(_label("", 14, BRAISE))
	v.add_child(_etat_titre)
	_record = _centre(_label("", 14, PALE))
	v.add_child(_record)
	v.add_child(_espace(10))
	v.add_child(_centre(_label("ZQSD, WASD ou les flèches : marcher · Espace ou clic : récolter, frapper\n1 : un feu de camp · 2 : une torche · 3 : une lance · E : manger · F : nourrir le feu · C : cuire · Échap : pause", 14, PALE)))
	v.add_child(_espace(6))
	var pied := _centre(_label("Chaque bête est une lignée vraie du monde d'Orvane, au dernier cycle publié : son nombre, sa silhouette, son heure, son caractère.\nCe que tu croises et ce que tu chasses est compté, et renvoyé au monde.", 12, Color(0.45, 0.47, 0.5)))
	v.add_child(pied)


func montrer_chargement(texte: String) -> void:
	_montrer(null)
	_chargement.text = texte
	_chargement.visible = true


func montrer_titre(lieux: Array, infos: String, record: int) -> void:
	_montrer(_titre)
	_infos.text = infos
	_etat_titre.text = ""
	_record.text = "Ton record : %d nuit%s tenue%s." % [record, "s" if record > 1 else "", "s" if record > 1 else ""] if record > 0 else ""
	var avant := ""
	if _lieux.item_count > 0 and _lieux.selected >= 0:
		avant = str(_lieux.get_item_metadata(_lieux.selected))
	_lieux.clear()
	var choix := -1
	for i in lieux.size():
		var l: Dictionary = lieux[i]
		_lieux.add_item("%s — %d lignées" % [l["nom"], l["lignees"]])
		_lieux.set_item_metadata(i, l["id"])
		if l["id"] == avant or (avant == "" and l["id"] == "foret"):
			choix = i
	if choix < 0 and lieux.size() > 0:
		choix = 0
	if choix >= 0:
		_lieux.select(choix)
	if lieux.is_empty():
		_etat_titre.text = "Aucun lieu ne se lit pour l'instant."


func message_titre(t: String) -> void:
	_montrer(_titre)
	_etat_titre.text = t


func _lancer() -> void:
	if _lieux.item_count == 0 or _lieux.selected < 0:
		return
	commencer.emit(str(_lieux.get_item_metadata(_lieux.selected)))


# --- la partie ---

func _construire_hud() -> void:
	_hud = Control.new()
	_hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_hud)
	_vignette = TextureRect.new()
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0))
	g.set_color(1, Color(0, 0, 0, 0.94))
	g.add_point(0.5, Color(0, 0, 0, 0))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.width = 256
	t.height = 256
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	_vignette.texture = t
	_vignette.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_vignette.stretch_mode = TextureRect.STRETCH_SCALE
	_vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_vignette.modulate = Color(1, 1, 1, 0)
	_hud.add_child(_vignette)
	_rouge = ColorRect.new()
	_rouge.color = Color(0.6, 0.05, 0.03, 0.0)
	_rouge.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_hud.add_child(_rouge)
	var marge := MarginContainer.new()
	marge.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for cote in ["margin_left", "margin_right", "margin_top", "margin_bottom"]:
		marge.add_theme_constant_override(cote, 18)
	_hud.add_child(marge)
	var v := VBoxContainer.new()
	marge.add_child(v)
	var haut := HBoxContainer.new()
	v.add_child(haut)
	_jauges = Jauges.new()
	haut.add_child(_jauges)
	haut.add_child(_ressort())
	var droite := VBoxContainer.new()
	haut.add_child(droite)
	_horloge = _label("", 20, ENCRE)
	_horloge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	droite.add_child(_horloge)
	_compteurs = _label("", 14, PALE)
	_compteurs.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	droite.add_child(_compteurs)
	var milieu := Control.new()
	milieu.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(milieu)
	_boite_messages = VBoxContainer.new()
	_boite_messages.alignment = BoxContainer.ALIGNMENT_END
	v.add_child(_boite_messages)
	v.add_child(_espace(8))
	var recettes := HBoxContainer.new()
	recettes.alignment = BoxContainer.ALIGNMENT_CENTER
	recettes.add_theme_constant_override("separation", 28)
	v.add_child(recettes)
	for k in R.ORDRE_RECETTES:
		var l := _label("", 15, PALE)
		recettes.add_child(l)
		_recettes.append([k, l])
	v.add_child(_espace(6))
	var bas := HBoxContainer.new()
	v.add_child(bas)
	_inventaire = _label("", 16, ENCRE)
	bas.add_child(_inventaire)
	bas.add_child(_ressort())
	_aide = _label("Espace : récolter, frapper · E : manger · F : nourrir le feu · C : cuire · Échap : pause", 13, PALE)
	_aide.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	bas.add_child(_aide)
	_ignorer(_hud)


func montrer_hud() -> void:
	_montrer(_hud)
	for m in _messages:
		m[0].queue_free()
	_messages.clear()


func maj_hud(jeu) -> void:
	var j = jeu.joueur
	_jauges.valeurs = [j.sante, j.faim, j.peur]
	_jauges.queue_redraw()
	_ecrire(_horloge, jeu.texte_horloge())
	_ecrire(_compteurs, "%d bêtes croisées · %d chassées · %d nuit%s tenue%s" % [jeu.croisees, jeu.chassees, jeu.nuits, "s" if jeu.nuits > 1 else "", "s" if jeu.nuits > 1 else ""])
	var inv: Dictionary = j.inventaire
	var morceaux := []
	for k in R.ORDRE_INVENTAIRE:
		if int(inv.get(k, 0)) > 0:
			morceaux.append("%s %d" % [R.NOMS[k], inv[k]])
	if j.torche > 0.0:
		morceaux.append("torche %d s" % int(ceil(j.torche)))
	if j.lance > 0:
		morceaux.append("lance (%d coups)" % j.lance)
	_ecrire(_inventaire, " · ".join(PackedStringArray(morceaux)) if not morceaux.is_empty() else "Les mains vides.")
	for r in _recettes:
		var rec: Dictionary = R.RECETTES[r[0]]
		var cout := []
		for k in rec["cout"]:
			cout.append("%d %s" % [rec["cout"][k], R.NOMS[k]])
		_ecrire(r[1], "%s · %s : %s" % [rec["touche"], rec["nom"], ", ".join(PackedStringArray(cout))])
		r[1].modulate = Color(1, 1, 1, 1) if jeu.peut_fabriquer(r[0]) else Color(1, 1, 1, 0.38)
	_peur = j.peur


func message(t: String, c: Color = Color(0.9, 0.86, 0.78)) -> void:
	var l := _label(t, 17, c)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boite_messages.add_child(l)
	_messages.append([l, 5.5])
	while _messages.size() > 4:
		_messages[0][0].queue_free()
		_messages.pop_front()


func blessure() -> void:
	_rouge.color.a = 0.32


func montrer_pause(oui: bool) -> void:
	_pause.visible = oui


func _process(delta: float) -> void:
	var garder := []
	for m in _messages:
		m[1] -= delta
		if m[1] <= 0.0:
			m[0].queue_free()
		else:
			m[0].modulate = Color(1, 1, 1, clampf(m[1], 0.0, 1.0))
			garder.append(m)
	_messages = garder
	if _rouge != null:
		_rouge.color.a = maxf(0.0, _rouge.color.a - delta * 0.9)
	if _vignette != null:
		var cible := 0.3 + 0.7 * clampf(_peur / 100.0, 0.0, 1.0)
		if _peur > 70.0:
			cible += 0.08 * sin(Time.get_ticks_msec() / 160.0)
		_vignette.modulate.a = lerpf(_vignette.modulate.a, cible if _hud.visible else 0.0, 0.06)


# --- la fin ---

func _construire_fin() -> void:
	_fin = _plein(Color(0, 0, 0, 0.82))
	add_child(_fin)
	var centre := CenterContainer.new()
	centre.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fin.add_child(centre)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	v.custom_minimum_size = Vector2(760, 0)
	centre.add_child(v)
	_fin_titre = _centre(_label("", 50, ENCRE))
	v.add_child(_fin_titre)
	_fin_resume = _centre(_label("", 18, Color(0.85, 0.82, 0.76)))
	_fin_resume.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_fin_resume)
	_fin_lot = _centre(_label("", 14, PALE))
	_fin_lot.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(_fin_lot)
	v.add_child(_espace(8))
	var h := HBoxContainer.new()
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	h.add_theme_constant_override("separation", 16)
	var b1 := _bouton("Recommencer ici")
	b1.pressed.connect(func(): recommencer.emit())
	var b2 := _bouton("Changer de lieu")
	b2.pressed.connect(func(): vers_titre.emit())
	h.add_child(b1)
	h.add_child(b2)
	v.add_child(h)


func montrer_fin(titre: String, resume: String, lot: String) -> void:
	_montrer(_fin)
	_fin_titre.text = titre
	_fin_resume.text = resume
	_fin_lot.text = lot


func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("valider"):
		if _titre.visible:
			_lancer()
		elif _fin.visible:
			recommencer.emit()


# --- les briques ---

func _label(t: String, taille: int, c: Color) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", taille)
	l.add_theme_color_override("font_color", c)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _centre(l: Label) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func _espace(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


func _ressort() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


func _plein(c: Color) -> ColorRect:
	var r := ColorRect.new()
	r.color = c
	r.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return r


func _bouton(t: String) -> Button:
	var b := Button.new()
	b.text = t
	b.custom_minimum_size = Vector2(260, 46)
	b.add_theme_font_size_override("font_size", 18)
	b.add_theme_color_override("font_color", ENCRE)
	b.add_theme_color_override("font_hover_color", Color(1, 0.95, 0.85))
	b.add_theme_stylebox_override("normal", _boite(Color(0.07, 0.07, 0.09), BRAISE.darkened(0.35)))
	b.add_theme_stylebox_override("hover", _boite(Color(0.13, 0.1, 0.08), BRAISE))
	b.add_theme_stylebox_override("pressed", _boite(Color(0.2, 0.13, 0.08), BRAISE))
	b.add_theme_stylebox_override("focus", _boite(Color(0, 0, 0, 0), BRAISE.lightened(0.2)))
	return b


func _boite(fond: Color, bord: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = fond
	s.border_color = bord
	s.set_border_width_all(1)
	s.set_content_margin_all(10)
	return s


func _ecrire(l, t: String) -> void:
	if l.text != t:
		l.text = t


func _ignorer(n: Node) -> void:
	if n is Control and not (n is BaseButton):
		n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for c in n.get_children():
		_ignorer(c)


# les trois jauges : santé, faim, peur, en cercles qui se vident
class Jauges extends Control:
	const COULEURS := [Color(0.82, 0.26, 0.22), Color(0.9, 0.63, 0.24), Color(0.62, 0.47, 0.88)]
	const NOMS := ["Santé", "Faim", "Peur"]
	var valeurs := [100.0, 100.0, 0.0]

	func _init() -> void:
		custom_minimum_size = Vector2(250, 92)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var police := ThemeDB.fallback_font
		for i in 3:
			var c := Vector2(36 + i * 82, 34)
			var v: float = clampf(float(valeurs[i]) / 100.0, 0.0, 1.0)
			draw_circle(c, 29.0, Color(0, 0, 0, 0.55))
			draw_arc(c, 24.0, 0.0, TAU, 48, Color(1, 1, 1, 0.08), 6.0)
			if v > 0.001:
				draw_arc(c, 24.0, -PI / 2.0, -PI / 2.0 + TAU * v, 48, COULEURS[i], 6.0, true)
			draw_string(police, c + Vector2(-30, 6), str(int(round(float(valeurs[i])))), HORIZONTAL_ALIGNMENT_CENTER, 60.0, 16, Color(0.93, 0.9, 0.84))
			draw_string(police, c + Vector2(-40, 50), NOMS[i], HORIZONTAL_ALIGNMENT_CENTER, 80.0, 12, Color(0.72, 0.7, 0.66))


# derrière le titre : une braise qui respire, au bas de l'écran, et deux yeux qui s'ouvrent parfois dans le noir
class Braise extends Control:
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(delta: float) -> void:
		_t += delta
		queue_redraw()

	func _draw() -> void:
		var s := size
		var c := Vector2(s.x * 0.5, s.y * 1.02)
		for i in 7:
			var k := 1.0 - i / 7.0
			draw_circle(c, s.y * (0.15 + 0.5 * k) * (1.0 + 0.02 * sin(_t * 2.3 + i)), Color(0.9, 0.42, 0.12, 0.018 + 0.012 * (1.0 - k)))
		var cycle := fmod(_t, 9.0)
		if cycle > 6.0 and cycle < 7.6:
			var a := sin((cycle - 6.0) / 1.6 * PI)
			for x in [s.x * 0.16, s.x * 0.16 + 9.0]:
				draw_circle(Vector2(x, s.y * 0.62), 2.6, Color(1.0, 0.78, 0.35, a))
		if cycle > 2.0 and cycle < 3.1:
			var a2 := sin((cycle - 2.0) / 1.1 * PI) * 0.8
			for x in [s.x * 0.83, s.x * 0.83 + 7.0]:
				draw_circle(Vector2(x, s.y * 0.34), 2.0, Color(0.72, 0.9, 1.0, a2))
