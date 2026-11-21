extends Control
# Lisière — le choix du lieu, à l'écran-titre (scripts/interface_choix.gd)
# Le nom du lieu, gravé, entre deux chevrons d'encre ; dessous, ce qu'il porte (combien de lignées) et où l'on est dans la liste.
# Un clic (ou un doigt) sur un chevron, ou les flèches du clavier, passe au lieu voisin ; le nom glisse et se fond.

signal change(index: int)

const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/interface_theme.gd")
const I := preload("res://scripts/interface_icones.gd")

var options: Array = []      # [{nom, detail}]
var index := -1
var compact := false
var _survol := 0            # -1 : le chevron gauche ; 1 : le droit
var _glisse := 0.0          # le nom qui arrive, de ±1 à 0
var _appui := [0.0, 0.0]
var _t := 0.0


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_NONE
	_taille()


func mettre_compact(oui: bool) -> void:
	compact = oui
	_taille()


func _taille() -> void:
	custom_minimum_size = Vector2(360, 54) if compact else Vector2(440, 72)
	update_minimum_size()


func remplir(o: Array, choix: int) -> void:
	options = o
	index = choix
	_glisse = 0.0
	queue_redraw()


func passer(sens: int) -> void:
	if options.size() < 2:
		return
	index = (index + sens + options.size()) % options.size()
	_glisse = float(sens)
	_appui[0 if sens < 0 else 1] = 1.0
	change.emit(index)


func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion:
		var x: float = e.position.x
		_survol = -1 if x < size.x * 0.22 else (1 if x > size.x * 0.78 else 0)
	elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		var x2: float = e.position.x
		passer(-1 if x2 < size.x * 0.4 else 1)
		accept_event()


func _notification(what: int) -> void:
	if what == NOTIFICATION_MOUSE_EXIT:
		_survol = 0


func _process(d: float) -> void:
	if not is_visible_in_tree():
		return
	_t += d
	_glisse = move_toward(_glisse, 0.0, d * 4.0)
	for i in 2:
		_appui[i] = move_toward(float(_appui[i]), 0.0, d * 5.0)
	queue_redraw()


func _draw() -> void:
	var s := size
	var cy := s.y * (0.4 if compact else 0.38)
	# (les chevrons)
	for sens in [-1, 1]:
		var j := 0 if sens < 0 else 1
		var vise := 1.0 if _survol == sens else 0.0
		var cx: float = (18.0 if sens < 0 else s.x - 18.0) + sens * -3.0 * float(_appui[j])
		var h := 9.0 if compact else 11.0
		var col := Color(P.IVOIRE, 0.55).lerp(P.BRAISE_COEUR, maxf(vise, float(_appui[j])))
		if options.size() < 2:
			col.a = 0.15
		var pointe := Vector2(cx + sens * h * 0.7, cy)
		I.trait_encre(self, Vector2(cx - sens * h * 0.5, cy - h), pointe, 3.4, col)
		I.trait_encre(self, Vector2(cx - sens * h * 0.5, cy + h), pointe, 3.4, col)
	if index < 0 or index >= options.size():
		return
	var o: Dictionary = options[index]
	var f := T.titre()
	var fs := 24 if compact else 31
	var nom := str(o.get("nom", ""))
	var lw := f.get_string_size(nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var dx := _glisse * 26.0
	var a := 1.0 - absf(_glisse)
	var p := Vector2((s.x - lw) * 0.5 + dx, cy + fs * 0.32)
	draw_string_outline(f, p + Vector2(0, 2), nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 6, Color(P.ENCRE, 0.5 * a))
	draw_string(f, p, nom, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(P.PAPIER, a))
	# (dessous : ce que porte le lieu, et les points de la liste)
	var g := T.texte_moyen()
	var gs := 13 if compact else 14
	var detail := str(o.get("detail", ""))
	var lw2 := g.get_string_size(detail, HORIZONTAL_ALIGNMENT_LEFT, -1, gs).x
	var y2 := cy + fs * 0.32 + gs + (6.0 if compact else 9.0)
	draw_string(g, Vector2((s.x - lw2) * 0.5, y2), detail, HORIZONTAL_ALIGNMENT_LEFT, -1, gs, Color(P.IVOIRE, 0.7 * a))
	var n := options.size()
	if n > 12:
		var rang := "%d / %d" % [index + 1, n]
		var lw3 := g.get_string_size(rang, HORIZONTAL_ALIGNMENT_LEFT, -1, gs - 2).x
		draw_string(g, Vector2((s.x - lw3) * 0.5, y2 + 14.0), rang, HORIZONTAL_ALIGNMENT_LEFT, -1, gs - 2, Color(P.BRAISE, 0.75))
	elif n > 1:
		var ecart := 10.0
		var x0 := s.x * 0.5 - (n - 1) * ecart * 0.5
		for i in n:
			var pc := Vector2(x0 + i * ecart, y2 + 9.0)
			if i == index:
				I.disque(self, pc, 2.6, P.BRAISE)
			else:
				I.disque(self, pc, 1.6, Color(P.IVOIRE, 0.35))
