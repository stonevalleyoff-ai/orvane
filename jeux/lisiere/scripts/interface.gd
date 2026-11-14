extends CanvasLayer
# Lisière — ce qu'on lit à l'écran (scripts/interface.gd)
# L'écran-titre (une scène vivante : la lisière la nuit, le feu, les yeux ; le monde d'Orvane, aujourd'hui ; le choix du lieu),
# le HUD (les jauges d'encre, l'heure en cadran, le sac en icônes, les recettes en cartes), les notes qui glissent et
# s'effacent, les cartes de titre (« Nuit 2 »), ce qu'on ramasse qui vole jusqu'au sac, la pause et l'écran de fin, en pages de
# carnet. Tout est construit ici, dans le code ; les morceaux vivent dans scripts/interface_*.gd. Les lettres : IM Fell English
# et Alegreya Sans (polices/, licence OFL), posées par un thème (scripts/interface_theme.gd).

signal commencer(biome: String)
signal recommencer
signal vers_titre

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const Hud := preload("res://scripts/interface_hud.gd")
const Scene := preload("res://scripts/interface_titre.gd")
const Choix := preload("res://scripts/interface_choix.gd")
const Bouton := preload("res://scripts/interface_bouton.gd")
const Carte := preload("res://scripts/interface_carte.gd")
const Vol := preload("res://scripts/interface_vol.gd")
const Carnet := preload("res://scripts/interface_carnet.gd")
const BRAISE := preload("res://shaders/interface_braise.gdshader")
# sur un écran tactile, les messages nomment les boutons (scripts/tactile.gd) plutôt que les touches
const TOUCHES_TACTILES := {"(Espace)": "(Agir)", "un feu (1)": "un feu (bouton Feu)", "touche 1": "bouton Feu", "(F)": "(Nourrir)", "(E)": "(Manger)", "(C)": "(Cuire)"}
const DUREE_NOTE := 5.5

var tactile := false
# l'écran-titre
var _titre: Control
var _scene
var _colonne: VBoxContainer
var _nom_du_jeu: Label
var _devise: Label
var _infos: Label
var _choix
var _lieux: Array = []
var _entrer
var _etat_titre: Label
var _record: Label
var _bas_titre: VBoxContainer
var _aide_titre: Label
var _pied: Label
var _centre_titre: CenterContainer
var _ecart_titre: Control
var _fondu: ColorRect
var _depart := false
var _apparition: Tween
# le chargement
var _chargement: Control
var _chargement_texte: Label
# la partie
var _hud: Control
var _cadre: Control
var _voile_hud: ColorRect
var _jauges
var _cadran
var _compteurs
var _sac
var _recettes: Array = []
var _aide: Label
var _notes: Control
var _messages: Array = []        # [la note (un Label), sa vie qui reste] : l'essai lit la dernière
var _carte
var _vols
var _t_hud := 9.0
# les pages
var _pause
var _fin
static var _fond_note: StyleBoxTexture = null


func _ready() -> void:
	layer = 10
	_construire_titre()
	_construire_hud()
	_fin = Carnet.Fin.new()
	_fin.theme = T.theme()
	_fin.recommencer.connect(func(): recommencer.emit())
	_fin.changer.connect(func(): vers_titre.emit())
	add_child(_fin)
	_pause = Carnet.Pause.new()
	_pause.theme = T.theme()
	_pause.visible = false
	_pause.reprendre.connect(_reprendre)
	_pause.quitter.connect(func(): vers_titre.emit())
	add_child(_pause)
	_construire_chargement()
	_montrer(null)


func _montrer(c) -> void:
	_titre.visible = c == _titre
	_hud.visible = c == _hud
	_fin.visible = c == _fin
	_chargement.visible = false
	if c != _hud:
		_vider_hud()


# --- l'écran-titre ---

func _construire_titre() -> void:
	_titre = _plein()
	_titre.theme = T.theme()
	add_child(_titre)
	_scene = Scene.new()
	_titre.add_child(_scene)
	var centre := CenterContainer.new()
	centre.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	centre.offset_bottom = -60
	centre.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_titre.add_child(centre)
	_centre_titre = centre
	_colonne = VBoxContainer.new()
	_colonne.add_theme_constant_override("separation", 6)
	_colonne.mouse_filter = Control.MOUSE_FILTER_IGNORE
	centre.add_child(_colonne)
	# (le titre gravé, chauffé par le feu : un shader, scripts/interface_titre.gd en donne l'éclat)
	_nom_du_jeu = _centre(T.libelle("LISIÈRE", T.espacee(T.titre(), 12), 118, Color.WHITE))
	_nom_du_jeu.add_theme_color_override("font_shadow_color", Color(P.ENCRE, 0.9))
	_nom_du_jeu.add_theme_constant_override("shadow_offset_y", -3)
	_nom_du_jeu.add_theme_constant_override("shadow_outline_size", 8)
	var m := ShaderMaterial.new()
	m.shader = BRAISE
	_nom_du_jeu.material = m
	_colonne.add_child(_nom_du_jeu)
	_devise = _centre(T.libelle("Tenir jusqu'au matin.", T.titre_italique(), 28, Color(P.IVOIRE, 0.9)))
	_colonne.add_child(_devise)
	_ecart_titre = _espace(30)
	_colonne.add_child(_ecart_titre)
	_infos = _centre(T.libelle("Le monde d'Orvane s'éveille…", T.texte_moyen(), 15, P.LUNE.lerp(P.IVOIRE, 0.55)))
	_colonne.add_child(_infos)
	_choix = Choix.new()
	_choix.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_colonne.add_child(_choix)
	_colonne.add_child(_espace(4))
	_entrer = Bouton.new("Entrer dans la nuit", 31, false, true)
	_entrer.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_entrer.pressed.connect(_lancer)
	_colonne.add_child(_entrer)
	_etat_titre = _centre(T.libelle("", T.texte_moyen(), 15, P.BRAISE))
	_colonne.add_child(_etat_titre)
	_record = _centre(T.libelle("", T.titre_italique(), 17, Color(P.IVOIRE, 0.72)))
	_colonne.add_child(_record)
	# (en bas : les touches, et ce que sont les bêtes)
	_bas_titre = VBoxContainer.new()
	_bas_titre.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_bas_titre.grow_vertical = Control.GROW_DIRECTION_BEGIN
	_bas_titre.offset_bottom = -14
	_bas_titre.add_theme_constant_override("separation", 6)
	_bas_titre.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_titre.add_child(_bas_titre)
	_aide_titre = _centre(T.libelle("ZQSD, WASD ou les flèches : marcher · Espace ou clic : récolter, frapper\n1 : un feu de camp · 2 : une torche · 3 : une lance · E : manger · F : nourrir le feu · C : cuire · Échap : pause", T.texte_moyen(), 14, Color(P.IVOIRE, 0.66)))
	_bas_titre.add_child(_aide_titre)
	_pied = _centre(T.libelle("Chaque bête est une lignée vraie du monde d'Orvane, au dernier cycle publié : son nombre, sa silhouette, son heure, son caractère.\nCe que tu croises et ce que tu chasses est compté, et renvoyé au monde.", T.texte(), 12, Color(P.IVOIRE, 0.42)))
	_bas_titre.add_child(_pied)
	_fondu = _plein(P.NUIT) as ColorRect
	_titre.add_child(_fondu)


func _construire_chargement() -> void:
	_chargement = _plein(P.NUIT)
	_chargement.theme = T.theme()
	add_child(_chargement)
	_chargement_texte = _centre(T.libelle("", T.titre_italique(), 26, Color(P.IVOIRE, 0.85)))
	_chargement_texte.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_chargement_texte.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chargement.add_child(_chargement_texte)
	var braise := Braise.new()
	braise.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_chargement.add_child(braise)


func montrer_chargement(texte: String) -> void:
	_montrer(null)
	_chargement_texte.text = texte
	_chargement.visible = true


func montrer_titre(lieux: Array, infos: String, record: int) -> void:
	_montrer(_titre)
	_infos.text = infos
	_etat_titre.text = ""
	_record.text = "Ton record : %d nuit%s tenue%s." % [record, "s" if record > 1 else "", "s" if record > 1 else ""] if record > 0 else ""
	var avant := ""
	if _choix.index >= 0 and _choix.index < _lieux.size():
		avant = str(_lieux[_choix.index]["id"])
	_lieux = lieux
	var options := []
	var choix := -1
	for i in lieux.size():
		var l: Dictionary = lieux[i]
		options.append({"nom": str(l["nom"]), "detail": "%d lignées vivent ici" % int(l["lignees"])})
		if l["id"] == avant or (avant == "" and l["id"] == "foret"):
			choix = i
	if choix < 0 and lieux.size() > 0:
		choix = 0
	_choix.remplir(options, choix)
	if lieux.is_empty():
		_etat_titre.text = "Aucun lieu ne se lit pour l'instant."
	_apparaitre()


func message_titre(t: String) -> void:
	_montrer(_titre)
	_etat_titre.text = t
	_depart = false
	if _fondu.color.a > 0.0:
		var tw := create_tween()
		tw.tween_property(_fondu, "color:a", 0.0, 0.5)


# le titre sort du noir : la scène d'abord, puis le nom gravé, la devise, le choix
func _apparaitre() -> void:
	_depart = false
	if _apparition != null and _apparition.is_valid():
		_apparition.kill()
	_fondu.color.a = 1.0
	for c in [_nom_du_jeu, _devise, _infos, _choix, _entrer, _bas_titre]:
		c.modulate.a = 0.0
	_apparition = create_tween().set_parallel()
	_apparition.tween_property(_fondu, "color:a", 0.0, 1.6).set_trans(Tween.TRANS_SINE)
	_apparition.tween_property(_nom_du_jeu, "modulate:a", 1.0, 1.4).set_delay(0.5)
	_apparition.tween_property(_devise, "modulate:a", 1.0, 1.0).set_delay(1.2)
	for c in [_infos, _choix, _entrer]:
		_apparition.tween_property(c, "modulate:a", 1.0, 0.8).set_delay(1.6)
	_apparition.tween_property(_bas_titre, "modulate:a", 1.0, 1.0).set_delay(2.0)


# on entre dans la nuit : le titre se fond au noir, puis la partie commence
func _lancer() -> void:
	if _depart or _lieux.is_empty() or _choix.index < 0 or _choix.index >= _lieux.size():
		return
	_depart = true
	var id := str(_lieux[_choix.index]["id"])
	var tw := create_tween()
	tw.tween_property(_fondu, "color:a", 1.0, 0.6).set_trans(Tween.TRANS_SINE)
	tw.tween_callback(func(): commencer.emit(id))


# --- la partie ---

func _construire_hud() -> void:
	_hud = _plein()
	_hud.theme = T.theme()
	add_child(_hud)
	_cadre = _plein()
	_hud.add_child(_cadre)
	_jauges = Hud.Jauges.new()
	_cadre.add_child(_jauges)
	_cadran = Hud.Cadran.new()
	_cadre.add_child(_cadran)
	_compteurs = Hud.Compteurs.new()
	_cadre.add_child(_compteurs)
	for k in R.ORDRE_RECETTES:
		var r = Hud.Recette.new(k)
		_cadre.add_child(r)
		_recettes.append([k, r])
	_sac = Hud.Sac.new()
	_cadre.add_child(_sac)
	_aide = T.libelle("Espace : récolter, frapper · E : manger · F : nourrir le feu · C : cuire · Échap : pause", T.texte_moyen(), 13, Color(P.IVOIRE, 0.6))
	_aide.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_cadre.add_child(_aide)
	_notes = _plein()
	_hud.add_child(_notes)
	_carte = Carte.new()
	_hud.add_child(_carte)
	_vols = Vol.new()
	_vols.sac = _sac
	_hud.add_child(_vols)
	_voile_hud = _plein(Color(P.NUIT, 0.0)) as ColorRect
	_hud.add_child(_voile_hud)
	_hud.resized.connect(_disposer)
	_disposer()


# la place de chaque chose, selon la taille de l'écran (au doigt : 480 de haut, les boutons en bas à droite)
func _disposer() -> void:
	var s := _hud.size
	if s.x < 10.0:
		return
	var m := 10.0 if tactile else 16.0
	_jauges.position = Vector2(m - 4.0, m - 2.0)
	_cadran.position = Vector2(s.x - m - _cadran.size.x + (14.0 if tactile else 12.0), m - (8.0 if tactile else 6.0))
	_sac.position = Vector2(m, s.y - m - _sac.size.y)
	if tactile:
		# (les comptes en colonne, à gauche du cadran ; les recettes dessous, au-dessus des boutons)
		_compteurs.compact = true
		_compteurs.size = Vector2(40, 50)
		_compteurs.position = Vector2(_cadran.position.x - 34.0, m - 4.0)
		var y: float = _cadran.position.y + _cadran.size.y - 2.0
		for r in _recettes:
			r[1].position = Vector2(s.x - m - r[1].size.x, y)
			y += r[1].size.y + 2.0
	else:
		_compteurs.compact = false
		_compteurs.size = Vector2(420, 18)
		_compteurs.position = Vector2(s.x - m - 420.0, _cadran.position.y + _cadran.size.y + 2.0)
		var lw: float = _recettes[0][1].size.x
		var x := s.x - m - lw * 3.0 - 24.0
		for r in _recettes:
			r[1].position = Vector2(x, s.y - m - r[1].size.y)
			x += lw + 12.0
		_aide.position = Vector2(s.x - m - 700.0, s.y - m - _recettes[0][1].size.y - 22.0)
		_aide.size = Vector2(700, 18)


func montrer_hud() -> void:
	_montrer(_hud)
	_vider_hud()
	_jauges.remettre([100.0, 100.0, 0.0])
	_t_hud = 0.0
	_voile_hud.color.a = 1.0
	_cadre.modulate.a = 0.0
	_disposer()


func _vider_hud() -> void:
	for m in _messages:
		m[0].queue_free()
	_messages.clear()
	if _vols != null:
		_vols.vider()
	if _carte != null:
		_carte.arreter()


func maj_hud(jeu) -> void:
	var j = jeu.joueur
	_jauges.valeurs = [j.sante, j.faim, j.peur]
	# (l'heure : où en est le soleil jusqu'au soir, ou la lune jusqu'au matin)
	var t := fmod(jeu.horloge, R.DUREE)
	var soir: float = R.DUREE * (1.0 - jeu.part_nuit)
	var morceaux: PackedStringArray = jeu.texte_horloge().split(" · ")
	_cadran.nuit = t >= soir
	_cadran.u = t / soir if t < soir else (t - soir) / maxf(1.0, R.DUREE - soir)
	_cadran.reste = soir - t if t < soir else R.DUREE - t
	_cadran.titre = morceaux[0] if morceaux.size() > 0 else ""
	_cadran.dessous = " · ".join(morceaux.slice(1)) if morceaux.size() > 1 else ""
	_compteurs.valeurs = [jeu.croisees, jeu.chassees, jeu.nuits]
	_compteurs.queue_redraw()
	_sac.maj(j.inventaire, j.torche, j.lance)
	for r in _recettes:
		r[1].maj(jeu.peut_fabriquer(r[0]), j.inventaire)


# une note : elle glisse en place, reste un moment, et s'efface
func message(t: String, c: Color = Color(0.9, 0.86, 0.78)) -> void:
	if tactile:
		for k in TOUCHES_TACTILES:
			t = t.replace(k, TOUCHES_TACTILES[k])
	var l := T.libelle(t, T.texte_moyen(), 15 if tactile else 17, c)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_stylebox_override("normal", _fond_de_note())
	l.add_theme_color_override("font_shadow_color", Color(P.ENCRE, 0.5))
	l.add_theme_constant_override("shadow_outline_size", 2)
	var s := _hud.size
	var maxw := minf(520.0, s.x - 430.0) if tactile else minf(720.0, s.x - 120.0)
	var lw := T.texte_moyen().get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 15 if tactile else 17).x + 48.0
	l.custom_minimum_size = Vector2(minf(lw, maxf(240.0, maxw)), 0)
	l.modulate.a = 0.0
	_notes.add_child(l)
	l.reset_size()
	l.position = Vector2((s.x - l.size.x) * 0.5, _base_des_notes() + (-12.0 if tactile else 16.0))
	_messages.append([l, DUREE_NOTE])
	while _messages.size() > 4:
		_messages[0][0].queue_free()
		_messages.pop_front()


func _base_des_notes() -> float:
	if tactile:
		return 70.0
	return _hud.size.y - 16.0 - 60.0 - 34.0


# le fond d'une note : un lavis d'encre, plein au milieu, fondu sur les bords
static func _fond_de_note() -> StyleBoxTexture:
	if _fond_note != null:
		return _fond_note
	var img := Image.create(96, 32, false, Image.FORMAT_RGBA8)
	for y in 32:
		for x in 96:
			var a := smoothstep(0.0, 26.0, float(x)) * smoothstep(0.0, 26.0, 95.0 - x) * smoothstep(0.0, 11.0, float(y)) * smoothstep(0.0, 11.0, 31.0 - y)
			img.set_pixel(x, y, Color(P.ENCRE, a * 0.7))
	var s := StyleBoxTexture.new()
	s.texture = ImageTexture.create_from_image(img)
	s.texture_margin_left = 30
	s.texture_margin_right = 30
	s.texture_margin_top = 12
	s.texture_margin_bottom = 12
	s.content_margin_left = 24
	s.content_margin_right = 24
	s.content_margin_top = 5
	s.content_margin_bottom = 6
	_fond_note = s
	return s


# une carte de titre, au milieu de l'écran : « Nuit 2 », « L'aube »
func carte(titre: String, sous_titre: String = "") -> void:
	_carte.jouer(titre, sous_titre)


# ce qu'un geste rapporte (l'objet : bois, pierre, fibre, baies ; p : où, dans le lieu) : son icône vole jusqu'au sac
func ramasse(objet: String, n: int, p: Vector2) -> void:
	if not _hud.visible:
		return
	var ecran := get_viewport().get_canvas_transform() * (p + Vector2(0, -16))
	ecran = ecran.clamp(Vector2(24, 24), _hud.size - Vector2(24, 24))
	if objet in _sac.CASES:
		_vols.lancer(objet, n, ecran)
	else:
		message("+%d %s" % [n, R.nom(objet, n) if R.NOMS.has(objet) else objet], Color(0.75, 0.78, 0.72))


# une morsure : la jauge de santé tremble et rougit (les effets d'écran sont à scripts/effets.gd)
func blessure() -> void:
	_jauges.blesser()


# l'écran se joue du doigt (scripts/tactile.gd) : les aides parlent des boutons, tout se resserre (un téléphone tenu à
# l'horizontale ne montre que 480 de haut), les recettes montent en haut à droite pour laisser la place aux boutons, en bas
func passer_au_tactile() -> void:
	tactile = true
	_aide_titre.text = "Le pouce gauche, posé n'importe où à gauche : marcher\nLes boutons à droite : récolter et frapper (Agir), un feu, une torche, une lance, manger, nourrir le feu, cuire"
	_colonne.add_theme_constant_override("separation", 1)
	_nom_du_jeu.add_theme_font_size_override("font_size", 74)
	_nom_du_jeu.add_theme_font_override("font", T.espacee(T.titre(), 8))
	_devise.add_theme_font_size_override("font_size", 21)
	_ecart_titre.custom_minimum_size.y = 10
	_infos.add_theme_font_size_override("font_size", 13)
	_choix.mettre_compact(true)
	_entrer.mettre_taille(25)
	_etat_titre.add_theme_font_size_override("font_size", 13)
	_record.add_theme_font_size_override("font_size", 14)
	_aide_titre.add_theme_font_size_override("font_size", 13)
	_pied.add_theme_font_size_override("font_size", 12)
	_bas_titre.offset_bottom = -8
	_bas_titre.add_theme_constant_override("separation", 3)
	_centre_titre.offset_bottom = -54
	_aide.visible = false
	_jauges.mettre_compact(true)
	_cadran.mettre_compact(true)
	_sac.mettre_compact(true)
	_vols.compact = true
	_carte.compact = true
	for r in _recettes:
		r[1].mettre_compact(true, true)
	_pause.mettre_tactile(true)
	_fin.mettre_compact(true)
	_disposer()


func montrer_pause(oui: bool) -> void:
	if oui:
		_pause.ouvrir()
	else:
		_pause.visible = false


# « Reprendre » : comme la touche de pause (principal.gd)
func _reprendre() -> void:
	var jeu = get_parent()
	if jeu != null and "en_pause" in jeu:
		jeu.en_pause = false
	montrer_pause(false)


func _process(delta: float) -> void:
	# (un voile transparent ne se dessine pas : sur un téléphone, chaque calque plein écran coûte)
	_fondu.visible = _fondu.color.a > 0.004
	_voile_hud.visible = _voile_hud.color.a > 0.004
	if _titre.visible and _scene != null:
		var m := _nom_du_jeu.material as ShaderMaterial
		if m != null:
			m.set_shader_parameter("vif", _scene.vif)
			m.set_shader_parameter("haut", _nom_du_jeu.size.y * 0.22)
			m.set_shader_parameter("hauteur", _nom_du_jeu.size.y * 0.6)
		_scene.titre = Rect2(_nom_du_jeu.global_position - _scene.global_position, _nom_du_jeu.size)
		_scene.titre_a = _nom_du_jeu.modulate.a
	if not _hud.visible:
		return
	# (l'entrée dans la partie : le noir s'ouvre, puis le HUD vient)
	if _t_hud < 3.0:
		_t_hud += delta
		_voile_hud.color.a = 1.0 - smoothstep(0.0, 1.4, _t_hud)
		_cadre.modulate.a = smoothstep(0.6, 1.5, _t_hud)
	_placer_les_notes(delta)


func _placer_les_notes(delta: float) -> void:
	var garder := []
	for m in _messages:
		m[1] -= delta
		if m[1] <= 0.0:
			m[0].queue_free()
		else:
			garder.append(m)
	_messages = garder
	var s := _hud.size
	var y := _base_des_notes()
	var k := 1.0 - exp(-delta * 11.0)
	var n := _messages.size()
	for i in n:
		# (en partie : les plus récentes en bas, au-dessus des recettes ; au doigt : en haut, sous le bouton de pause)
		var m: Array = _messages[n - 1 - i] if not tactile else _messages[i]
		var l: Label = m[0]
		var cible := y - l.size.y if not tactile else y
		y = cible - 2.0 if not tactile else y + l.size.y + 2.0
		var vie: float = m[1]
		var entree := smoothstep(0.0, 0.35, DUREE_NOTE - vie)
		var sortie := smoothstep(0.0, 1.1, vie)
		l.modulate.a = entree * sortie * (1.0 - 0.85 * float(_carte.presence()))
		l.position.x = (s.x - l.size.x) * 0.5
		l.position.y = lerpf(l.position.y, cible - (1.0 - sortie) * 10.0, k)


# --- la fin ---

func montrer_fin(titre: String, resume: String, lot: String) -> void:
	_montrer(_fin)
	_fin.remplir(titre, resume, lot, get_parent())


func _unhandled_input(e: InputEvent) -> void:
	if _titre.visible:
		if e.is_action_pressed("valider"):
			_lancer()
		elif e.is_action_pressed("ui_left"):
			_choix.passer(-1)
		elif e.is_action_pressed("ui_right"):
			_choix.passer(1)
	elif _fin.visible and e.is_action_pressed("valider"):
		recommencer.emit()


# --- les briques ---

func _centre(l: Label) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func _espace(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


# un calque plein écran, qui laisse passer la souris (et une couleur, s'il en faut une)
func _plein(c = null) -> Control:
	var r: Control
	if c != null:
		var cr := ColorRect.new()
		cr.color = c
		r = cr
	else:
		r = Control.new()
	r.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r


# pendant qu'un lieu se charge : une braise qui respire sous le texte
class Braise extends Control:
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _process(delta: float) -> void:
		if is_visible_in_tree():
			_t += delta
			queue_redraw()

	func _draw() -> void:
		var c := size * 0.5 + Vector2(0, 40)
		for i in 3:
			var a := 0.25 + 0.75 * pow(0.5 + 0.5 * sin(_t * 3.0 - i * 0.9), 2.0)
			var p := c + Vector2((i - 1) * 16.0, 0)
			draw_texture_rect(T.halo(), Rect2(p - Vector2(10, 10), Vector2(20, 20)), false, Color(P.BRAISE, 0.5 * a))
			draw_circle(p, 2.2, Color(P.BRAISE_COEUR, a))
