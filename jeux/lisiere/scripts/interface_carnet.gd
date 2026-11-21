extends RefCounted
# Lisière — le carnet (scripts/interface_carnet.gd)
# Les pages de papier de l'interface : la fin (« La nuit t'a prise. », les nuits tenues et le record, les bêtes croisées dessinées
# d'après leurs planches, celles qu'on a chassées marquées d'une croix de sang, ce que la partie renvoie au monde) et la pause
# (les commandes, au clavier ou au doigt). Le papier est un shader (shaders/interface_papier.gdshader) : un grain, des fibres,
# un bord déchiré et roussi.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")
const Bouton := preload("res://scripts/interface_bouton.gd")
const PAPIER := preload("res://shaders/interface_papier.gdshader")


# --- une feuille ---

class Page extends Control:
	var contenu: MarginContainer
	var _papier: ColorRect
	var _ombre := StyleBoxFlat.new()

	func _init(graine: float = 3.0) -> void:
		mouse_filter = Control.MOUSE_FILTER_STOP
		_ombre.bg_color = Color(0, 0, 0, 0)
		_ombre.shadow_color = Color(0, 0, 0, 0.6)
		_ombre.shadow_size = 28
		_ombre.shadow_offset = Vector2(0, 10)
		_papier = ColorRect.new()
		_papier.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_papier.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		var m := ShaderMaterial.new()
		m.shader = PAPIER
		m.set_shader_parameter("graine", graine)
		_papier.material = m
		add_child(_papier)
		contenu = MarginContainer.new()
		contenu.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		contenu.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(contenu)
		marges(40, 26)
		resized.connect(func(): (_papier.material as ShaderMaterial).set_shader_parameter("taille", size))

	func marges(h: int, v: int) -> void:
		for c in ["margin_left", "margin_right"]:
			contenu.add_theme_constant_override(c, h)
		for c in ["margin_top", "margin_bottom"]:
			contenu.add_theme_constant_override(c, v)

	func _draw() -> void:
		draw_style_box(_ombre, Rect2(Vector2(6, 6), size - Vector2(12, 12)))


# un filet d'encre, et au milieu une petite marque (un losange)
class Filet extends Control:
	var largeur := 0.6
	var couleur := P.ENCRE

	func _init(l: float = 0.6) -> void:
		largeur = l
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		custom_minimum_size = Vector2(0, 12)

	func _draw() -> void:
		var c := Vector2(size.x * 0.5, size.y * 0.5)
		var l := size.x * largeur * 0.5
		I.trait_encre(self, c - Vector2(l, 0), c - Vector2(9, 0), 1.8, Color(couleur, 0.7))
		I.trait_encre(self, c + Vector2(9, 0), c + Vector2(l, 0), 1.8, Color(couleur, 0.7))
		draw_colored_polygon(PackedVector2Array([c + Vector2(-5, 0), c + Vector2(0, -3.5), c + Vector2(5, 0), c + Vector2(0, 3.5)]), Color(P.SANG, 0.85))


# un libellé sur le papier : sans ombre sous les lettres
class Encre:
	static func libelle(t: String, f: Font, taille: int, c: Color, centre: bool = true) -> Label:
		var l := T.libelle(t, f, taille, c)
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0))
		l.add_theme_constant_override("shadow_outline_size", 0)
		if centre:
			l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		return l


# --- la fin ---

class Fin extends Control:
	signal recommencer
	signal changer

	var compact := false
	var page: Page
	var _voile: ColorRect
	var _titre: Label
	var _lieu: Label
	var _stats: HBoxContainer
	var _chiffres: Array = []
	var _planches: Planches
	var _lot: Label
	var _resume: Label
	var _boutons: Array = []
	var _t := 0.0

	func _init() -> void:
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		mouse_filter = Control.MOUSE_FILTER_STOP
		_voile = ColorRect.new()
		_voile.color = Color(P.NUIT, 0.0)
		_voile.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_voile.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_voile)
		page = Page.new(7.0)
		add_child(page)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 4)
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		page.contenu.add_child(v)
		_titre = Encre.libelle("", T.titre(), 52, P.ENCRE)
		v.add_child(_titre)
		_lieu = Encre.libelle("", T.titre_italique(), 19, P.ENCRE_DOUCE)
		v.add_child(_lieu)
		v.add_child(Filet.new(0.5))
		_stats = HBoxContainer.new()
		_stats.alignment = BoxContainer.ALIGNMENT_CENTER
		_stats.add_theme_constant_override("separation", 46)
		_stats.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(_stats)
		for mot in ["nuit tenue", "record", "bêtes croisées", "chassées"]:
			var b := VBoxContainer.new()
			b.add_theme_constant_override("separation", -6)
			b.mouse_filter = Control.MOUSE_FILTER_IGNORE
			var n := Encre.libelle("0", T.titre(), 40, P.ENCRE)
			var m := Encre.libelle(mot, T.capitales(), 15, P.ENCRE_DOUCE)
			b.add_child(n)
			b.add_child(m)
			_stats.add_child(b)
			_chiffres.append([n, m])
		_resume = Encre.libelle("", T.texte(), 16, P.ENCRE_DOUCE)
		_resume.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_resume.visible = false
		v.add_child(_resume)
		var tete := Encre.libelle("Les bêtes croisées", T.capitales(), 19, P.ENCRE)
		v.add_child(tete)
		_planches = Planches.new()
		_planches.size_flags_vertical = Control.SIZE_EXPAND_FILL
		v.add_child(_planches)
		_lot = Encre.libelle("", T.texte(), 14, P.ENCRE_DOUCE)
		_lot.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		v.add_child(_lot)
		var h := HBoxContainer.new()
		h.alignment = BoxContainer.ALIGNMENT_CENTER
		h.add_theme_constant_override("separation", 30)
		v.add_child(h)
		var b1 := Bouton.new("Recommencer ici", 24, true, true)
		b1.pressed.connect(func(): recommencer.emit())
		var b2 := Bouton.new("Changer de lieu", 24, true)
		b2.pressed.connect(func(): changer.emit())
		h.add_child(b1)
		h.add_child(b2)
		_boutons = [b1, b2]
		resized.connect(_disposer)

	func mettre_compact(oui: bool) -> void:
		compact = oui
		_titre.add_theme_font_size_override("font_size", 38 if oui else 52)
		_lieu.add_theme_font_size_override("font_size", 16 if oui else 19)
		_stats.add_theme_constant_override("separation", 26 if oui else 46)
		for c in _chiffres:
			c[0].add_theme_font_size_override("font_size", 28 if oui else 40)
			c[1].add_theme_font_size_override("font_size", 13 if oui else 15)
		_lot.add_theme_font_size_override("font_size", 13 if oui else 14)
		for b in _boutons:
			b.mettre_taille(20 if oui else 24)
		page.marges(28 if oui else 40, 12 if oui else 24)
		_planches.compact = oui
		_disposer()

	func _disposer() -> void:
		var s := size
		var ps := Vector2(minf(1000.0, s.x - (24.0 if compact else 60.0)), minf(660.0, s.y - (16.0 if compact else 40.0)))
		page.size = ps
		page.position = (s - ps) * 0.5

	# la page : ce que la partie a été. jeu : le jeu (principal.gd), d'où l'on lit les bêtes vues, rencontrées, chassées
	func remplir(titre: String, resume: String, lot: String, jeu) -> void:
		_titre.text = titre
		var a_des_donnees: bool = jeu != null and "vues" in jeu and "rencontres" in jeu
		_resume.text = resume
		_resume.visible = not a_des_donnees
		_stats.visible = a_des_donnees
		# (le lot dit le nom de chaque bête en fin de ligne : ici, elles sont dessinées ; on n'en garde que la première ligne)
		var lignes := lot.split("\n")
		_lot.text = lignes[0] if a_des_donnees and lignes.size() > 0 else lot
		var liste := []
		if a_des_donnees:
			var nuits := int(jeu.nuits)
			var nombres := [nuits, int(jeu.record), int(jeu.croisees), int(jeu.chassees)]
			var mots := ["nuit tenue" if nuits <= 1 else "nuits tenues", "record", "bête croisée" if int(jeu.croisees) <= 1 else "bêtes croisées",
				"chassée" if int(jeu.chassees) <= 1 else "chassées"]
			for i in 4:
				_chiffres[i][0].text = str(nombres[i])
				_chiffres[i][1].text = mots[i]
			var info: Dictionary = jeu.biome_info if "biome_info" in jeu else {}
			_lieu.text = "%s, en %s — à la lisière d'un lieu vrai du monde d'Orvane" % [str(info.get("nom", jeu.biome)), str(jeu.saison)]
			for id in jeu.vues:
				liste.append({"id": id, "nom": str(jeu.vues[id]), "n": int(jeu.rencontres.get(id, 0)), "chasse": int(jeu.prelevements.get(id, 0))})
			_planches.remplir(liste, str(jeu.biome))
		else:
			_lieu.text = ""
			_planches.remplir([], "")
		_t = 0.0

	func _process(d: float) -> void:
		if not visible:
			return
		_t += d
		var u := smoothstep(0.0, 0.9, _t)
		_voile.color.a = 0.78 * u
		page.modulate.a = smoothstep(0.15, 0.85, _t)
		page.position.y = (size.y - page.size.y) * 0.5 + 26.0 * (1.0 - smoothstep(0.1, 1.0, _t))
		page.rotation = deg_to_rad(-0.6) * (1.0 - u)


# les bêtes croisées, chacune dessinée d'après sa planche (Orvane.texture), son nom, ses rencontres ; une croix de sang si on l'a chassée
class Planches extends Control:
	var compact := false
	var _betes: Array = []
	var _textures := {}
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		custom_minimum_size = Vector2(0, 120)

	func remplir(liste: Array, biome: String) -> void:
		_betes = liste.slice(0, 12)
		_textures.clear()
		var arbre := Engine.get_main_loop() as SceneTree
		var orvane: Node = arbre.root.get_node_or_null("Orvane") if arbre != null else null
		for b in _betes:
			var tex = null
			if orvane != null and orvane.has_method("texture"):
				tex = orvane.texture(str(b["id"]), 300.0, biome)
			_textures[b["id"]] = tex
		_t = 0.0

	func _process(d: float) -> void:
		if is_visible_in_tree():
			_t += d
			queue_redraw()

	func _draw() -> void:
		var n := _betes.size()
		var f := T.titre_italique()
		var g := T.texte()
		if n == 0:
			var t := "Aucune bête ne s'est montrée dans la lumière."
			var lw := f.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
			draw_string(f, Vector2((size.x - lw) * 0.5, size.y * 0.5), t, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, P.ENCRE_DOUCE)
			return
		# (autant de colonnes qu'il en tient ; les cartes rapetissent s'il le faut)
		var cw := 150.0 if compact else 170.0
		var cols := clampi(int(size.x / cw), 1, n)
		var rangs := int(ceil(float(n) / cols))
		cols = int(ceil(float(n) / rangs))
		var ch := size.y / rangs
		cw = minf(cw * 1.15, size.x / cols)
		var fs := 15 if compact else 18
		var gs := 12 if compact else 13
		var x0 := (size.x - cw * cols) * 0.5
		for i in n:
			var b: Dictionary = _betes[i]
			var col := i % cols
			var rang := i / cols
			var dans := n - rang * cols
			var decal := (cols - mini(dans, cols)) * cw * 0.5
			var o := Vector2(x0 + decal + col * cw, rang * ch)
			var u := smoothstep(0.5 + 0.12 * i, 1.0 + 0.12 * i, _t)
			if u <= 0.0:
				continue
			var a := u
			var haut_dessin := maxf(20.0, ch - fs - gs - 16.0)
			var lw := minf(cw - 18.0, haut_dessin * 170.0 / 90.0)
			var lh := lw * 90.0 / 170.0
			var c := o + Vector2(cw * 0.5, 4.0 + lh * 0.5 + 6.0 * (1.0 - u))
			# (le sol de la planche, un trait d'encre ; puis le dessin)
			I.trait_encre(self, c + Vector2(-lw * 0.42, lh * 0.45), c + Vector2(lw * 0.42, lh * 0.45), 1.4, Color(P.ENCRE, 0.35 * a))
			var tex = _textures.get(b["id"])
			if tex != null:
				draw_texture_rect(tex, Rect2(c - Vector2(lw, lh) * 0.5, Vector2(lw, lh)), false, Color(1, 1, 1, a))
			else:
				I.icone(self, "patte", c, lh * 0.7, Color(1, 1, 1, 0.5 * a))
			var nom: String = b["nom"]
			var nw := f.get_string_size(nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			var y := c.y + lh * 0.5 + fs + 2.0
			draw_string(f, Vector2(c.x - nw * 0.5, y), nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(P.ENCRE, a))
			var k := int(b["n"])
			var t2 := "%d rencontre%s" % [k, "s" if k > 1 else ""]
			var chasse := int(b["chasse"])
			if chasse > 0:
				t2 += " · %d chassée%s" % [chasse, "s" if chasse > 1 else ""]
			var tw := g.get_string_size(t2, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
			draw_string(g, Vector2(c.x - tw * 0.5, y + gs + 3.0), t2, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.SANG if chasse > 0 else P.ENCRE_DOUCE, a))
			# (chassée : une croix de sang en travers du coin de la planche)
			if chasse > 0:
				var u2 := smoothstep(1.0 + 0.12 * i, 1.35 + 0.12 * i, _t)
				I.icone(self, "croix", c + Vector2(lw * 0.36, -lh * 0.22), lh * 0.42 * (1.6 - 0.6 * u2), Color(1, 1, 1, 0.85 * u2))


# --- la pause ---

class Pause extends Control:
	signal reprendre
	signal quitter

	var compact := false
	var tactile := false
	var page: Page
	var _voile: ColorRect
	var _sous: Label
	var _commandes: Commandes
	var _boutons: Array = []
	var _titre: Label
	var _t := 0.0
	var _vise := 0.0

	func _init() -> void:
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		mouse_filter = Control.MOUSE_FILTER_STOP
		_voile = ColorRect.new()
		_voile.color = Color(P.NUIT, 0.66)
		_voile.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_voile.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_voile)
		page = Page.new(11.0)
		add_child(page)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 2)
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		page.contenu.add_child(v)
		_titre = Encre.libelle("Pause", T.titre(), 48, P.ENCRE)
		v.add_child(_titre)
		_sous = Encre.libelle("La nuit attend. Échap pour reprendre.", T.titre_italique(), 18, P.ENCRE_DOUCE)
		v.add_child(_sous)
		v.add_child(Filet.new(0.45))
		_commandes = Commandes.new()
		_commandes.size_flags_vertical = Control.SIZE_EXPAND_FILL
		v.add_child(_commandes)
		var h := HBoxContainer.new()
		h.alignment = BoxContainer.ALIGNMENT_CENTER
		h.add_theme_constant_override("separation", 30)
		v.add_child(h)
		var b1 := Bouton.new("Reprendre", 24, true, true)
		b1.pressed.connect(func(): reprendre.emit())
		var b2 := Bouton.new("Quitter vers le titre", 24, true)
		b2.pressed.connect(func(): quitter.emit())
		h.add_child(b1)
		h.add_child(b2)
		_boutons = [b1, b2]
		resized.connect(_disposer)

	func mettre_tactile(oui: bool) -> void:
		tactile = oui
		compact = oui
		_commandes.tactile = oui
		_sous.text = "Touche le bouton du haut pour reprendre." if oui else "La nuit attend. Échap pour reprendre."
		_titre.add_theme_font_size_override("font_size", 38 if oui else 48)
		_sous.add_theme_font_size_override("font_size", 16 if oui else 18)
		for b in _boutons:
			b.mettre_taille(20 if oui else 24)
		page.marges(30, 10 if oui else 22)
		_disposer()

	func _disposer() -> void:
		var s := size
		var ps := Vector2(minf(720.0, s.x - 40.0), minf(450.0, s.y - (92.0 if compact else 80.0)))
		page.size = ps
		# (au doigt, la page descend un peu : le bouton de pause est en haut, au milieu)
		page.position = (s - ps) * 0.5 + Vector2(0, 26.0 if compact else 0.0)

	func ouvrir() -> void:
		_t = 0.0
		visible = true
		if not tactile and _boutons.size() > 0:
			_boutons[0].grab_focus.call_deferred()

	func _process(d: float) -> void:
		if not visible:
			return
		_t += d
		var u := smoothstep(0.0, 0.25, _t)
		_voile.color.a = 0.66 * u
		page.modulate.a = u
		page.position.y = (size.y - page.size.y) * 0.5 + (26.0 if compact else 0.0) + 14.0 * (1.0 - u)


# les commandes, en deux colonnes : une icône, la touche (ou le bouton), ce qu'elle fait
class Commandes extends Control:
	var tactile := false
	const CLAVIER := [["patte", "ZQSD · WASD · flèches", "marcher"], ["lance", "Espace · clic", "récolter, frapper"],
		["manger", "E", "manger"], ["nourrir", "F", "nourrir le feu"], ["cuire", "C", "cuire la viande"],
		["feu", "1", "un feu de camp"], ["torche", "2", "une torche"], ["lance", "3", "une lance"], ["pause", "Échap", "reprendre"]]
	const DOIGT := [["patte", "pouce gauche", "marcher"], ["lance", "Agir", "récolter, frapper"],
		["manger", "Manger", "manger"], ["nourrir", "Nourrir", "nourrir le feu"], ["cuire", "Cuire", "cuire la viande"],
		["feu", "Feu", "un feu de camp"], ["torche", "Torche", "une torche"], ["lance", "Lance", "une lance"], ["pause", "en haut", "reprendre"]]

	var _cadre := StyleBoxFlat.new()

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		custom_minimum_size = Vector2(0, 150)
		_cadre.bg_color = Color(P.ENCRE, 0.07)
		_cadre.border_color = Color(P.ENCRE, 0.45)
		_cadre.set_border_width_all(1)
		_cadre.set_corner_radius_all(4)
		_cadre.anti_aliasing = true

	func _draw() -> void:
		var lignes: Array = DOIGT if tactile else CLAVIER
		var demi := int(ceil(lignes.size() / 2.0))
		var cw := size.x / 2.0
		var lh := minf(34.0, size.y / demi)
		var y0 := (size.y - lh * demi) * 0.5
		var g := T.texte_gras()
		var t := T.texte()
		var gs := 14 if tactile else 15
		for i in lignes.size():
			var l: Array = lignes[i]
			var col := i / demi
			var rang := i % demi
			var x := col * cw + 14.0
			var y := y0 + rang * lh + lh * 0.5
			I.icone(self, l[0], Vector2(x + 12.0, y), 24.0)
			var touche: String = l[1]
			var tw := g.get_string_size(touche, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
			var rk := Rect2(Vector2(x + 32.0, y - gs * 0.85), Vector2(tw + 14.0, gs * 1.7))
			draw_style_box(_cadre, rk)
			draw_string(g, Vector2(rk.position.x + 7.0, y + gs * 0.36), touche, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, P.ENCRE)
			draw_string(t, Vector2(rk.end.x + 10.0, y + gs * 0.36), l[2], HORIZONTAL_ALIGNMENT_LEFT, cw - (rk.end.x - col * cw) - 16.0, gs, P.ENCRE_DOUCE)
