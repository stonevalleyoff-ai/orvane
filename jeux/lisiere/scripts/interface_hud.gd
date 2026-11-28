extends RefCounted
# Lisière — le HUD de la partie (scripts/interface_hud.gd)
# Les jauges (santé, faim, peur) en cercles d'encre, une icône au centre, qui battent quand ça presse ; l'heure en cadran (un arc
# où passent le soleil puis la lune, jusqu'au soir ou jusqu'au matin) ; le sac (chaque objet son icône, son nombre, qui sautille
# quand il change) ; les recettes en petites cartes, qui s'allument quand on peut les fabriquer. Tout est dessiné (_draw).
# « compact » : l'écran se joue du doigt, et n'a que 480 de haut.

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")
const R := preload("res://scripts/regles.gd")


# un ressort : il revient à zéro en oscillant (le sautillement d'un nombre, d'une carte)
class Ressort:
	var x := 0.0
	var v := 0.0

	func pousser(f: float) -> void:
		v += f

	func avancer(d: float) -> void:
		# (par petits pas : une image qui traîne ne doit pas l'affoler)
		var reste := minf(d, 0.25)
		while reste > 0.0:
			var h := minf(reste, 1.0 / 120.0)
			reste -= h
			v += (-190.0 * x - 13.0 * v) * h
			x += v * h
		if absf(x) < 0.0005 and absf(v) < 0.005:
			x = 0.0
			v = 0.0


# --- les jauges ---

class Jauges extends Control:
	const COULEURS := [Color("d0553a"), Color("e3a04f"), Color("9a80e6")]
	const NOMS := ["Santé", "Faim", "Peur"]
	const ICONES := ["coeur", "baies", "oeil"]
	var valeurs := [100.0, 100.0, 0.0]
	var compact := false
	var _vu := [100.0, 100.0, 0.0]
	var _trace := [100.0, 100.0, 0.0]
	var _attente := [0.0, 0.0, 0.0]
	var _cible := [100.0, 100.0, 0.0]
	var _secousse := 0.0
	var _eclair := 0.0
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		_taille()

	func _taille() -> void:
		custom_minimum_size = Vector2(3 * _ecart() + 8, _rayon() * 2.0 + (26 if not compact else 22))
		size = custom_minimum_size

	func mettre_compact(oui: bool) -> void:
		compact = oui
		_taille()

	func _rayon() -> float:
		return 21.0 if compact else 27.0

	func _ecart() -> float:
		return 60.0 if compact else 74.0

	# une morsure : la jauge de santé tremble et rougit
	func blesser() -> void:
		_secousse = 1.0
		_eclair = 1.0

	func remettre(v: Array) -> void:
		valeurs = v.duplicate()
		_vu = v.duplicate()
		_trace = v.duplicate()
		_cible = v.duplicate()

	func _process(d: float) -> void:
		if not is_visible_in_tree():
			return
		_t += d
		for i in 3:
			var cible := float(valeurs[i])
			_vu[i] = lerpf(float(_vu[i]), cible, 1.0 - exp(-d * 9.0))
			# (ce qu'on vient de perdre reste un instant, pâle, puis se retire : on voit le coup)
			if cible < float(_cible[i]) - 0.3:
				_attente[i] = 0.55
			_cible[i] = cible
			if float(_attente[i]) > 0.0:
				_attente[i] = float(_attente[i]) - d
			else:
				_trace[i] = move_toward(float(_trace[i]), float(_vu[i]), d * 40.0)
			if float(_trace[i]) < float(_vu[i]):
				_trace[i] = _vu[i]
		_secousse = maxf(0.0, _secousse - d * 2.2)
		_eclair = maxf(0.0, _eclair - d * 1.8)
		queue_redraw()

	# un battement de cœur (deux coups, puis rien), de période p
	static func battement(t: float, p: float) -> float:
		var u := fmod(t, p) / p
		return exp(-pow((u - 0.08) * 20.0, 2.0)) + 0.55 * exp(-pow((u - 0.25) * 20.0, 2.0))

	func _alerte(i: int) -> float:
		var v := float(_vu[i])
		match i:
			0:
				return clampf((32.0 - v) / 32.0, 0.0, 1.0)
			1:
				return clampf((25.0 - v) / 25.0, 0.0, 1.0)
			_:
				return clampf((v - 68.0) / 32.0, 0.0, 1.0)

	func _draw() -> void:
		var r := _rayon()
		var police := T.capitales()
		for i in 3:
			var c := Vector2(r + 4.0 + i * _ecart(), r + 3.0)
			var v := clampf(float(_vu[i]) / 100.0, 0.0, 1.0)
			var col: Color = COULEURS[i]
			var alerte := _alerte(i)
			var pouls := 0.0
			if alerte > 0.0:
				match i:
					0:
						pouls = battement(_t, lerpf(1.15, 0.62, alerte))
					1:
						pouls = 0.5 + 0.5 * sin(_t * 3.2)
					_:
						pouls = 0.5 + 0.5 * sin(_t * 9.0)
				pouls *= alerte
			if i == 0 and _secousse > 0.0:
				c += Vector2(sin(_t * 83.0), cos(_t * 71.0)) * 5.0 * _secousse * _secousse
			# (la lueur d'alarme, derrière le jeton)
			if pouls > 0.01:
				var h := r * (2.3 + 0.5 * pouls)
				draw_texture_rect(T.halo(), Rect2(c - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(col, 0.42 * pouls))
			if i == 0 and _eclair > 0.0:
				var h2 := r * 2.6
				draw_texture_rect(T.halo(), Rect2(c - Vector2(h2, h2), Vector2(h2, h2) * 2.0), false, Color(P.BRAISE_ROUGE, 0.6 * _eclair))
			I.jeton(self, c, r)
			var rr := r - 4.5
			draw_arc(c, rr, 0.0, TAU, 56, Color(P.IVOIRE, 0.09), 4.5, true)
			var a0 := -PI * 0.5
			var tr := clampf(float(_trace[i]) / 100.0, 0.0, 1.0)
			if tr > v + 0.004:
				I.arc_encre(self, c, rr, a0 + TAU * v, a0 + TAU * tr, 4.0, Color(col.lerp(P.PAPIER, 0.55), 0.6), false)
			var vive := col.lerp(Color.WHITE, 0.25 * pouls + (0.5 * _eclair if i == 0 else 0.0))
			if v > 0.004:
				I.arc_encre(self, c, rr, a0, a0 + TAU * v, 5.5, vive)
				if v < 0.995:
					I.disque(self, c + Vector2.from_angle(a0 + TAU * v) * rr, 2.6, col.lerp(Color.WHITE, 0.55))
			var k := 1.0 + 0.13 * pouls
			var oeil := clampf(float(_vu[2]) / 100.0, 0.0, 1.0)
			var trem := Vector2.ZERO
			if i == 2 and alerte > 0.0:
				trem = Vector2(sin(_t * 47.0), cos(_t * 39.0)) * 0.9 * alerte
			var clair := 0.55 + 0.45 * maxf(v, 0.35) if i < 2 else 1.0
			I.icone(self, ICONES[i], c + trem, r * 1.08 * k, Color(1, 1, 1, clair), oeil)
			var fs := 12 if compact else 14
			var nom: String = NOMS[i]
			var lw := police.get_string_size(nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			var p := Vector2(c.x - lw * 0.5, c.y + r + fs + 2.0)
			draw_string_outline(police, p, nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(P.ENCRE, 0.7))
			draw_string(police, p, nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(P.IVOIRE, 0.82).lerp(col.lerp(Color.WHITE, 0.3), alerte))


# --- l'heure : le cadran ---

class Cadran extends Control:
	var compact := false
	var nuit := false
	var u := 0.0               # le chemin fait, du lever au coucher (ou du soir au matin)
	var titre := "Jour 1"
	var dessous := ""          # la saison, et le temps qui reste
	var reste := 999.0         # en secondes, jusqu'au prochain soir (ou matin)
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		_taille()

	func mettre_compact(oui: bool) -> void:
		compact = oui
		_taille()

	func _taille() -> void:
		custom_minimum_size = Vector2(236, 46) if compact else Vector2(230, 104)
		size = custom_minimum_size

	func _process(d: float) -> void:
		if is_visible_in_tree():
			_t += d
			queue_redraw()

	# l'arc du ciel, l'horizon, l'astre qui passe (le soleil jusqu'au soir, la lune jusqu'au matin)
	func _arc(c: Vector2, r: float, isz: float) -> void:
		I.trait_encre(self, c + Vector2(-r - 16.0, 0), c + Vector2(r + 16.0, 0), 2.2, Color(P.IVOIRE, 0.45))
		draw_arc(c, r, PI, TAU, 40, Color(P.ENCRE, 0.55), 5.0, true)
		draw_arc(c, r, PI, TAU, 40, Color(P.IVOIRE, 0.2), 1.6, true)
		for k in 5:
			var a := PI + PI * k / 4.0
			var d := Vector2.from_angle(a)
			draw_line(c + d * (r - 3.0), c + d * (r + 3.0), Color(P.IVOIRE, 0.35), 1.2, true)
		var col := P.LUNE.lerp(P.IVOIRE, 0.25) if nuit else P.BRAISE_COEUR.lerp(P.SOIR, u)
		var a1 := PI + PI * clampf(u, 0.0, 1.0)
		I.arc_encre(self, c, r, PI, a1, 3.2, Color(col, 0.95))
		var astre := c + Vector2.from_angle(a1) * r
		var h := r * (0.8 if nuit else 1.0)
		draw_texture_rect(T.halo(), Rect2(astre - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(col, 0.32 + 0.05 * sin(_t * 2.0)))
		I.icone(self, "lune" if nuit else "soleil", astre, isz)

	func _ecrire(f: Font, p: Vector2, t: String, fs: int, c: Color) -> void:
		draw_string_outline(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 5, Color(P.ENCRE, 0.75))
		draw_string(f, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, c)

	func _draw() -> void:
		var f := T.titre()
		var g := T.texte_moyen()
		var presse := clampf((25.0 - reste) / 25.0, 0.0, 1.0) if not nuit else 0.0
		var cd := Color(P.IVOIRE, 0.85).lerp(P.BRAISE.lerp(Color.WHITE, 0.2 * (0.5 + 0.5 * sin(_t * 6.0))), presse)
		if compact:
			# (au doigt : l'arc à droite, les mots à sa gauche)
			var c := Vector2(size.x - 34.0, 34.0)
			_arc(c, 23.0, 17.0)
			var x := c.x - 44.0
			var lw := f.get_string_size(titre, HORIZONTAL_ALIGNMENT_LEFT, -1, 19).x
			_ecrire(f, Vector2(x - lw, 22.0), titre, 19, P.PAPIER)
			var lw2 := g.get_string_size(dessous, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
			_ecrire(g, Vector2(x - lw2, 39.0), dessous, 12, cd)
			return
		var c2 := Vector2(size.x * 0.5, 54.0)
		_arc(c2, 40.0, 25.0)
		var lw3 := f.get_string_size(titre, HORIZONTAL_ALIGNMENT_LEFT, -1, 24).x
		_ecrire(f, Vector2(c2.x - lw3 * 0.5, c2.y + 24.0), titre, 24, P.PAPIER)
		var lw4 := g.get_string_size(dessous, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		_ecrire(g, Vector2(c2.x - lw4 * 0.5, c2.y + 42.0), dessous, 14, cd)


# --- ce qu'on a compté : les bêtes croisées, chassées, les nuits ---

class Compteurs extends Control:
	var compact := false
	var valeurs := [0, 0, 0]
	const ICONES := ["patte", "croix", "lune"]
	const MOTS := [["bête croisée", "bêtes croisées"], ["chassée", "chassées"], ["nuit tenue", "nuits tenues"]]

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var g := T.texte_moyen()
		var gs := 12 if compact else 13
		if compact:
			# (au doigt : en colonne, une icône et son nombre)
			for i in 3:
				var y := 9.0 + i * 16.0
				I.icone(self, ICONES[i], Vector2(9, y), 14.0, Color(1, 1, 1, 0.85))
				var t0 := str(int(valeurs[i]))
				draw_string_outline(g, Vector2(19, y + 4.5), t0, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, 4, Color(P.ENCRE, 0.7))
				draw_string(g, Vector2(19, y + 4.5), t0, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.IVOIRE, 0.8))
			return
		# (de droite à gauche : chaque compte, son icône, son mot)
		var x := size.x
		for i in range(2, -1, -1):
			var n := int(valeurs[i])
			var t := "%d %s" % [n, MOTS[i][1] if n > 1 else MOTS[i][0]]
			var lw := g.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
			x -= lw
			var p := Vector2(x, size.y * 0.5 + gs * 0.35)
			draw_string_outline(g, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, 4, Color(P.ENCRE, 0.7))
			draw_string(g, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.IVOIRE, 0.78))
			x -= gs * 0.85
			I.icone(self, ICONES[i], Vector2(x, size.y * 0.5), gs * 1.25, Color(1, 1, 1, 0.85))
			x -= gs * 1.1 + (6.0 if compact else 10.0)


# --- le sac ---

class Sac extends Control:
	const CASES := ["bois", "pierre", "fibre", "baies", "viande", "viande_cuite", "torche", "lance"]
	var compact := false
	var quantites := {}
	var _attendus := {}       # ce qui vole encore vers sa case : compté à l'arrivée
	var _ressorts := {}
	var _eclats := {}
	var _t := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		for k in CASES:
			quantites[k] = 0
			_attendus[k] = 0
			_ressorts[k] = Ressort.new()
			_eclats[k] = 0.0
		_taille()

	func mettre_compact(oui: bool) -> void:
		compact = oui
		_taille()

	func _rayon() -> float:
		return 16.0 if compact else 21.0

	func _ecart() -> float:
		return 39.0 if compact else 50.0

	func _taille() -> void:
		custom_minimum_size = Vector2(CASES.size() * _ecart(), _rayon() * 2.0 + 8.0)
		size = custom_minimum_size

	func centre(k: String) -> Vector2:
		var i := CASES.find(k)
		return Vector2(_rayon() + 2.0 + maxi(i, 0) * _ecart(), _rayon() + 4.0)

	# ce que porte la veilleuse ; un nombre qui change fait sautiller sa case
	func maj(inv: Dictionary, torche: float, lance: int) -> void:
		for k in CASES:
			var n := 0
			match k:
				"torche":
					n = int(ceil(torche))
				"lance":
					n = lance
				_:
					n = int(inv.get(k, 0))
			var avant := int(quantites[k])
			quantites[k] = n
			if k == "torche":
				continue
			# (ce qui vole encore vers sa case sautillera à l'arrivée ; ce qui part fait plier la case)
			if n < avant:
				_ressorts[k].pousser(-4.0)
			elif n > avant and int(_attendus[k]) == 0:
				_sauter(k)

	# un objet vole vers sa case (scripts/interface_vol.gd) : son nombre attend qu'il arrive
	func attendre(k: String, n: int) -> void:
		if _attendus.has(k):
			_attendus[k] = int(_attendus[k]) + n

	func arrivee(k: String, n: int = 1) -> void:
		if _attendus.has(k):
			_attendus[k] = maxi(0, int(_attendus[k]) - n)
			_sauter(k)

	func oublier_les_vols() -> void:
		for k in CASES:
			_attendus[k] = 0

	func _sauter(k: String) -> void:
		_ressorts[k].pousser(9.0)
		_eclats[k] = 1.0

	func _process(d: float) -> void:
		if not is_visible_in_tree():
			return
		_t += d
		for k in CASES:
			_ressorts[k].avancer(d)
			_eclats[k] = maxf(0.0, float(_eclats[k]) - d * 2.4)
		queue_redraw()

	func _draw() -> void:
		var r := _rayon()
		var g := T.texte_gras()
		var gs := 12 if compact else 14
		for k in CASES:
			var c := centre(k)
			var n := int(quantites[k]) - int(_attendus[k])
			var a := 1.0 if n > 0 else 0.45
			var sx: float = 1.0 + clampf(_ressorts[k].x * 0.5, -0.3, 0.5)
			var e := float(_eclats[k])
			if e > 0.0:
				var h := r * (1.6 + 1.2 * (1.0 - e))
				draw_texture_rect(T.halo(), Rect2(c - Vector2(h, h), Vector2(h, h) * 2.0), false, Color(P.BRAISE_COEUR, 0.45 * e))
			I.jeton(self, c, r * (1.0 + (sx - 1.0) * 0.4), a)
			if k == "torche" and n > 0:
				var f := clampf(float(n) / R.DUREE_TORCHE, 0.0, 1.0)
				I.arc_encre(self, c, r + 1.5, -PI * 0.5, -PI * 0.5 + TAU * f, 3.0, Color(P.BRAISE, 0.8 + 0.2 * sin(_t * 13.0)))
				var lh := r * 2.2
				draw_texture_rect(T.halo(), Rect2(c + Vector2(0, -r * 0.4) - Vector2(lh, lh) * 0.5, Vector2(lh, lh)), false, Color(P.BRAISE, 0.22 + 0.06 * sin(_t * 9.0)))
			elif k == "lance" and n > 0:
				var f2 := clampf(float(n) / R.USURE_LANCE, 0.0, 1.0)
				I.arc_encre(self, c, r + 1.5, -PI * 0.5, -PI * 0.5 + TAU * f2, 2.6, Color(P.IVOIRE, 0.7) if f2 > 0.2 else Color(P.BRAISE_ROUGE, 0.9))
			I.icone(self, k, c, r * 1.45 * sx, Color(1, 1, 1, 1.0 if n > 0 else 0.2))
			if n > 0:
				var t := ("%ds" % n) if k == "torche" else str(n)
				var lw := g.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
				var p := c + Vector2(r * 0.85 - lw * 0.4, r * 0.95)
				draw_string_outline(g, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, 5, P.ENCRE)
				draw_string(g, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, P.PAPIER.lerp(P.BRAISE_COEUR, e * 0.8))


# --- une recette, en petite carte ---

class Recette extends Control:
	var cle := ""
	var compact := false
	var tactile := false
	var pret := false
	var manques := {}         # ce qui manque, par objet (rien : tout y est)
	var _allume := 0.0        # de 0 (éteinte) à 1 (on peut la faire)
	var _vague := -1.0        # la lumière qui passe quand elle s'allume
	var _ressort := Ressort.new()
	var _fond := StyleBoxFlat.new()

	func _init(k: String = "") -> void:
		cle = k
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		_fond.set_corner_radius_all(7)
		_fond.anti_aliasing = true
		_taille()

	func mettre_compact(oui: bool, doigt: bool) -> void:
		compact = oui
		tactile = doigt
		_taille()

	func _taille() -> void:
		custom_minimum_size = Vector2(186, 28) if compact else Vector2(196, 60)
		size = custom_minimum_size

	func maj(peut: bool, inv: Dictionary) -> void:
		var rec: Dictionary = R.RECETTES[cle]
		manques.clear()
		for k in rec["cout"]:
			var m := int(rec["cout"][k]) - int(inv.get(k, 0))
			if m > 0:
				manques[k] = m
		if peut and not pret:
			_vague = 0.0
			_ressort.pousser(7.0)
		pret = peut

	func _process(d: float) -> void:
		if not is_visible_in_tree():
			return
		_allume = move_toward(_allume, 1.0 if pret else 0.0, d * 3.0)
		if _vague >= 0.0:
			_vague += d * 1.6
			if _vague > 1.0:
				_vague = -1.0
		_ressort.avancer(d)
		queue_redraw()

	func _draw() -> void:
		var rec: Dictionary = R.RECETTES[cle]
		var k := 1.0 + clampf(_ressort.x * 0.25, -0.1, 0.15)
		draw_set_transform(size * 0.5 * (1.0 - k), 0.0, Vector2(k, k))
		var a := lerpf(0.62, 1.0, _allume)
		_fond.bg_color = Color(P.ENCRE, 0.66 + 0.1 * _allume)
		_fond.border_color = Color(P.IVOIRE, 0.14).lerp(Color(P.BRAISE, 0.9), _allume)
		_fond.set_border_width_all(1 if _allume < 0.5 else 2)
		_fond.shadow_color = Color(P.BRAISE, 0.28 * _allume)
		_fond.shadow_size = int(10.0 * _allume)
		draw_style_box(_fond, Rect2(Vector2.ZERO, size))
		if _vague >= 0.0:
			var x := lerpf(-30.0, size.x + 30.0, _vague)
			var lh := size.y * 1.4
			draw_texture_rect(T.halo(), Rect2(Vector2(x - lh * 0.5, size.y * 0.5 - lh * 0.5), Vector2(lh, lh)), false, Color(P.BRAISE_COEUR, 0.35 * sin(_vague * PI)))
		var f := T.titre()
		var g := T.texte_gras()
		var hauteur := size.y
		var x0 := 8.0
		# (la touche, au clavier ; au doigt, le bouton porte déjà le nom)
		if not tactile:
			var cc := Vector2(x0 + 9.0, hauteur * 0.5)
			I.disque(self, cc, 10.0, Color(P.IVOIRE, 0.14 + 0.5 * _allume))
			var tt: String = rec["touche"]
			var tw := g.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
			draw_string(g, cc + Vector2(-tw * 0.5, 4.5), tt, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, P.ENCRE if _allume > 0.5 else P.IVOIRE)
			x0 += 24.0
		var isz := 22.0 if compact else 38.0
		I.icone(self, cle, Vector2(x0 + isz * 0.5, hauteur * 0.5), isz, Color(1, 1, 1, a))
		x0 += isz + 6.0
		var fs := 15 if compact else 18
		var nom: String = rec["nom"]
		if compact:
			draw_string(f, Vector2(x0, hauteur * 0.5 + fs * 0.33), nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(P.PAPIER, a))
			# (le coût, collé à droite)
			_cout(rec, Vector2(size.x - 6.0, hauteur * 0.5), 13.0, 11, a, true)
		else:
			draw_string(f, Vector2(x0, 25.0), nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(P.PAPIER, a))
			_cout(rec, Vector2(x0, 43.0), 17.0, 13, a, false)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# le coût en icônes : chaque objet, son nombre ; ce qui manque, en rouge
	func _cout(rec: Dictionary, p: Vector2, isz: float, gs: int, a: float, a_droite: bool) -> void:
		var g := T.texte_gras()
		var morceaux := []
		var total := 0.0
		for k in rec["cout"]:
			var t := str(rec["cout"][k])
			var lw := g.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
			morceaux.append([k, t, lw])
			total += isz + lw + 7.0
		var x := p.x - total if a_droite else p.x
		for m in morceaux:
			I.icone(self, m[0], Vector2(x + isz * 0.5, p.y), isz, Color(1, 1, 1, a))
			x += isz + 1.0
			var manque: bool = manques.has(m[0])
			var c := Color("e8846a") if manque else Color(P.IVOIRE, 0.9)
			draw_string(g, Vector2(x, p.y + gs * 0.36), m[1], HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(c, a))
			x += float(m[2]) + 6.0
