extends CanvasLayer
# Portefaix — ce qui s'écrit à l'écran (scripts/interface.gd)
# Le menu, le salon d'attente, la partie (l'heure, le quota, le bruit qu'on fait, le vote du chat, ce qu'on regarde) et la fin.

const R = preload("res://scripts/regles.gd")

signal seul
signal heberger
signal rejoindre(adresse: String)
signal commencer
signal rejouer
signal quitter

var _menu: Control
var _salon: Control
var _partie: Control
var _fin: Control
var _avis: Label
var _adresse: LineEdit
var _chaine: LineEdit
var _micro: CheckBox
var _salon_texte: Label
var _salon_bouton: Button
var _heure: Label
var _quota: Label
var _bruit: ProgressBar
var _indice: Label
var _annonce: Label
var _annonce_reste := 0.0
var _vote: PanelContainer
var _vote_texte: Label
var _mort: Label
var _fin_texte: Label
var _fin_rejouer: Button
var _aide: Label
var _reseau: Array = []           # ce qui sert à jouer à plusieurs, caché dans un navigateur


func _ready() -> void:
	var racine := Control.new()
	racine.set_anchors_preset(Control.PRESET_FULL_RECT)
	racine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(racine)
	_menu = _page(racine)
	_salon = _page(racine)
	_fin = _page(racine)
	_partie = Control.new()
	_partie.set_anchors_preset(Control.PRESET_FULL_RECT)
	_partie.mouse_filter = Control.MOUSE_FILTER_IGNORE
	racine.add_child(_partie)
	_faire_menu()
	_faire_salon()
	_faire_partie()
	_faire_fin()
	menu("")


func _page(racine: Control) -> Control:
	var voile := ColorRect.new()          # la partie, derrière, s'assombrit
	voile.color = Color(0.01, 0.012, 0.02, 0.72)
	voile.set_anchors_preset(Control.PRESET_FULL_RECT)
	racine.add_child(voile)
	var centre := CenterContainer.new()
	centre.set_anchors_preset(Control.PRESET_FULL_RECT)
	voile.add_child(centre)
	var boite := VBoxContainer.new()
	boite.custom_minimum_size = Vector2(520, 0)
	boite.add_theme_constant_override("separation", 10)
	centre.add_child(boite)
	return boite


func _texte(parent: Control, t: String, corps: int = 18, couleur: Color = Color(0.86, 0.86, 0.82)) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", corps)
	l.add_theme_color_override("font_color", couleur)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	parent.add_child(l)
	return l


func _bouton(parent: Control, t: String, quoi: Callable) -> Button:
	var b := Button.new()
	b.text = t
	b.add_theme_font_size_override("font_size", 20)
	b.custom_minimum_size = Vector2(0, 44)
	b.pressed.connect(quoi)
	parent.add_child(b)
	return b


func _faire_menu() -> void:
	_texte(_menu, "PORTEFAIX", 64, Color(1.0, 0.86, 0.5))
	_texte(_menu, "Videz la maison avant l'aube. Ne réveillez pas ce qui y dort.", 20)
	_avis = _texte(_menu, "", 18, Color(1.0, 0.5, 0.4))
	_bouton(_menu, "Jouer seul", func(): seul.emit())
	_reseau.append(_bouton(_menu, "Héberger une partie (2 à 6 joueurs)", func(): heberger.emit()))
	var ligne := HBoxContainer.new()
	_menu.add_child(ligne)
	_reseau.append(ligne)
	_adresse = LineEdit.new()
	_adresse.text = "127.0.0.1"
	_adresse.placeholder_text = "l'adresse de l'hôte"
	_adresse.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_adresse.add_theme_font_size_override("font_size", 20)
	ligne.add_child(_adresse)
	_bouton(ligne, "Rejoindre", func(): rejoindre.emit(_adresse.text.strip_edges()))
	_chaine = LineEdit.new()
	_chaine.placeholder_text = "ta chaîne Twitch, pour que ton chat vote (facultatif)"
	_chaine.add_theme_font_size_override("font_size", 18)
	_menu.add_child(_chaine)
	_micro = CheckBox.new()
	_micro.text = "La chose entend mon micro"
	_micro.button_pressed = true
	_micro.add_theme_font_size_override("font_size", 18)
	_menu.add_child(_micro)
	_aide = _texte(_menu, "ZQSD : marcher · Maj : courir (bruyant) · Ctrl : s'accroupir · Espace : sauter\n"
		+ "E ou clic : prendre, poser · clic droit : lancer · F : torche · V : crier · Échap : libérer la souris", 15, Color(0.6, 0.62, 0.66))


func _faire_salon() -> void:
	_texte(_salon, "Le salon", 40, Color(1.0, 0.86, 0.5))
	_salon_texte = _texte(_salon, "", 20)
	_salon_bouton = _bouton(_salon, "Commencer la nuit", func(): commencer.emit())
	_bouton(_salon, "Retour", func(): quitter.emit())


func _faire_fin() -> void:
	_fin_texte = _texte(_fin, "", 26)
	_fin_rejouer = _bouton(_fin, "Une autre maison", func(): rejouer.emit())
	_bouton(_fin, "Retour au menu", func(): quitter.emit())


func _faire_partie() -> void:
	_heure = _coin(Control.PRESET_CENTER_TOP, Vector2(-100, 12), Vector2(200, 40), 30)
	_quota = _coin(Control.PRESET_TOP_LEFT, Vector2(18, 12), Vector2(420, 60), 22)
	_quota.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_annonce = _coin(Control.PRESET_CENTER_TOP, Vector2(-400, 70), Vector2(800, 70), 24)
	_annonce.add_theme_color_override("font_color", Color(1.0, 0.8, 0.45))
	var viseur := _coin(Control.PRESET_CENTER, Vector2(-10, -14), Vector2(20, 28), 20)
	viseur.text = "+"
	_indice = _coin(Control.PRESET_CENTER, Vector2(-400, 30), Vector2(800, 60), 18)
	_mort = _coin(Control.PRESET_CENTER_BOTTOM, Vector2(-400, -120), Vector2(800, 60), 20)
	_mort.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
	var etiquette := _coin(Control.PRESET_BOTTOM_LEFT, Vector2(18, -64), Vector2(260, 24), 16)
	etiquette.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	etiquette.text = "le bruit que tu fais"
	_bruit = ProgressBar.new()
	_bruit.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_bruit.position += Vector2(18, -38)
	_bruit.custom_minimum_size = Vector2(260, 18)
	_bruit.size = Vector2(260, 18)
	_bruit.max_value = R.BRUIT_MICRO
	_bruit.show_percentage = false
	_partie.add_child(_bruit)
	_vote = PanelContainer.new()
	_vote.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_vote.position += Vector2(-378, 150)
	_vote.custom_minimum_size = Vector2(360, 0)
	_partie.add_child(_vote)
	_vote_texte = Label.new()
	_vote_texte.add_theme_font_size_override("font_size", 18)
	_vote.add_child(_vote_texte)


func _coin(ancre: int, ou: Vector2, t: Vector2, corps: int) -> Label:
	var l := Label.new()
	l.set_anchors_preset(ancre)
	l.position += ou
	l.custom_minimum_size = t
	l.size = t
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", corps)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	l.add_theme_constant_override("outline_size", 6)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_partie.add_child(l)
	return l


func _montrer(page: Control) -> void:
	for p in [_menu, _salon, _fin]:
		p.get_parent().get_parent().visible = p == page
	_partie.visible = page == _partie


# dans un navigateur, on joue seul : pas de port à ouvrir, et le micro attend qu'on le demande
func passer_au_navigateur() -> void:
	for c in _reseau:
		c.visible = false
	_micro.button_pressed = false
	_aide.text += "\nDans un navigateur, on joue seul. À plusieurs : la version de bureau (Godot 4.3)."


func passer_au_tactile() -> void:
	_micro.button_pressed = false
	_aide.text = "Le pouce gauche marche, le droit regarde en glissant.\nAgir : prendre, poser, klaxonner · Courir (bruyant) et Bas restent enfoncés."


# --- les écrans ---

func menu(avis: String) -> void:
	_avis.text = avis
	_avis.visible = avis != ""
	_montrer(_menu)


func salon(t: String, hote: bool) -> void:
	_salon_texte.text = t
	_salon_bouton.visible = hote
	_montrer(_salon)


func partie() -> void:
	_annonce.text = ""
	_mort.text = ""
	_vote.visible = false
	_montrer(_partie)


func fin(t: String, hote: bool) -> void:
	_fin_texte.text = t
	_fin_rejouer.visible = hote
	_montrer(_fin)


func chaine() -> String:
	return _chaine.text


func micro() -> bool:
	return _micro.button_pressed


# --- pendant la partie ---

func annoncer(t: String, duree: float = 4.0) -> void:
	_annonce.text = t
	_annonce_reste = duree


func mort(t: String) -> void:
	_mort.text = t


func dire(temps: float, charge: int, quota: int, bruit: float, indice: String) -> void:
	# la nuit va de 22 h à 6 h
	var minutes := int((1.0 - clampf(temps / R.DUREE_NUIT, 0.0, 1.0)) * 480.0)
	_heure.text = "%02d:%02d" % [(22 + minutes / 60) % 24, minutes % 60]
	_heure.add_theme_color_override("font_color", Color(1.0, 0.45, 0.35) if temps < 60.0 else Color(0.9, 0.9, 0.86))
	_quota.text = "Chargé : %d € / %d €" % [charge, quota]
	_quota.add_theme_color_override("font_color", Color(0.55, 1.0, 0.55) if charge >= quota else Color(0.9, 0.9, 0.86))
	_bruit.value = bruit
	_indice.text = indice


func vote(ouvert: bool, options: Array, voix: Array, reste: float) -> void:
	_vote.visible = ouvert
	if not ouvert:
		return
	var t := "LE CHAT VOTE — %d s\n" % int(ceil(maxf(reste, 0.0)))
	for i in options.size():
		t += "%d. %s  (%d)\n" % [i + 1, R.SABOTAGES[options[i]].nom, voix[i]]
	_vote_texte.text = t.strip_edges()


func _process(dt: float) -> void:
	if _annonce_reste > 0.0:
		_annonce_reste -= dt
		if _annonce_reste <= 0.0:
			_annonce.text = ""
