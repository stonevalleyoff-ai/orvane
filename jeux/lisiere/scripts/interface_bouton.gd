extends Button
# Lisière — un bouton à l'encre (scripts/interface_bouton.gd)
# Un mot gravé (IM Fell), souligné d'un trait de braise qui s'étire au survol, deux petites braises aux bouts ; pressé, il
# s'enfonce un peu et s'éclaire. Sur le papier (l'écran de fin, la pause), l'encre et un trait de sang séché.
# Le texte n'est pas celui du Button (il le dessine lui-même) : on le lit dans « libelle ».

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")

var libelle := ""
var taille := 24
var papier := false
var principal := false
var _survol := 0.0
var _appui := 0.0
var _t := 0.0


func _init(t: String = "", taille_: int = 24, sur_papier: bool = false, est_principal: bool = false) -> void:
	libelle = t
	taille = taille_
	papier = sur_papier
	principal = est_principal
	text = ""
	flat = true
	focus_mode = Control.FOCUS_ALL
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	_t = randf() * 10.0
	_mesurer()


func mettre_taille(t: int) -> void:
	taille = t
	_mesurer()


func _mesurer() -> void:
	var w := T.titre().get_string_size(libelle, HORIZONTAL_ALIGNMENT_LEFT, -1, taille).x
	custom_minimum_size = Vector2(w + taille * 2.2, taille * 2.0)
	update_minimum_size()


func _process(d: float) -> void:
	if not is_visible_in_tree():
		return
	_t += d
	var mode := get_draw_mode()
	var vise := 1.0 if (mode == DRAW_HOVER or mode == DRAW_HOVER_PRESSED or has_focus()) else 0.0
	var presse := 1.0 if (mode == DRAW_PRESSED or mode == DRAW_HOVER_PRESSED) else 0.0
	_survol = move_toward(_survol, maxf(vise, presse), d * 5.0)
	_appui = move_toward(_appui, presse, d * 14.0)
	queue_redraw()


func _draw() -> void:
	var f := T.titre()
	var s := size
	var k := 1.0 - 0.045 * _appui
	draw_set_transform(s * 0.5 * (1.0 - k) + Vector2(0, 1.5 * _appui), 0.0, Vector2(k, k))
	var lw := f.get_string_size(libelle, HORIZONTAL_ALIGNMENT_LEFT, -1, taille).x
	var base := Vector2((s.x - lw) * 0.5, s.y * 0.5 + taille * 0.3)
	var respire := 0.5 + 0.5 * sin(_t * 1.7)
	var encre := P.ENCRE if papier else P.IVOIRE
	var vif := P.SANG if papier else P.BRAISE_COEUR
	var souligne := Color("8f2a1c") if papier else P.BRAISE
	# (une lueur sous le mot, au survol : la braise qui chauffe)
	if not papier:
		var lh := Vector2(lw * 0.8 + 40.0, taille * 1.6)
		var a := 0.08 * respire * (1.0 if principal else 0.0) + 0.22 * _survol + 0.15 * _appui
		draw_texture_rect(T.halo(), Rect2(Vector2(s.x * 0.5, base.y - taille * 0.3) - lh * 0.5, lh), false, Color(P.BRAISE, a))
	var c := encre.lerp(vif, _survol * (0.75 if papier else 0.9))
	if not papier:
		draw_string_outline(f, base + Vector2(0, 2), libelle, HORIZONTAL_ALIGNMENT_LEFT, -1, taille, 6, Color(P.ENCRE, 0.55))
	draw_string(f, base, libelle, HORIZONTAL_ALIGNMENT_LEFT, -1, taille, c)
	# (le trait : du milieu vers les bords)
	var l := lw * lerpf(0.34 if principal else 0.0, 1.06, _survol)
	var y := base.y + taille * 0.32
	var cx := s.x * 0.5
	if l > 2.0:
		I.trait_encre(self, Vector2(cx - l * 0.5, y), Vector2(cx + l * 0.5, y), 2.4 + 1.2 * _survol, Color(souligne, 0.55 + 0.45 * _survol))
	if not papier and _survol > 0.02:
		I.trait_encre(self, Vector2(cx - l * 0.3, y), Vector2(cx + l * 0.3, y), 1.1, Color(P.BRAISE_COEUR, _survol))
	# (deux petites braises, qui s'écartent avec le trait)
	if _survol > 0.02:
		for sgn in [-1.0, 1.0]:
			var p := Vector2(cx + sgn * (l * 0.5 + 10.0), y - 1.0)
			var r := 2.6 * _survol
			I.disque(self, p, r + 1.0, Color(P.ENCRE, 0.5 * _survol))
			I.disque(self, p, r, Color(vif, _survol))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
