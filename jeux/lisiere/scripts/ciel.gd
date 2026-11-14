extends Node2D
# Lisière — le temps qu'il fait (scripts/ciel.gd)
# Le temps du lieu dans le monde d'Orvane, ce cycle (docs/45) : la pluie, l'orage, la tempête, la neige, le brouillard, dessinés
# par-dessus le lieu, devant la caméra. Un temps clair ou couvert ne dessine rien. Le vent couche la pluie.

var temps := ""
var vent := 0.0
var _t := 0.0
var _grains: Array = []


func regler(t: String, v: float) -> void:
	temps = t
	vent = v
	_grains.clear()
	var r := RandomNumberGenerator.new()
	r.seed = 7
	var n := 0
	match t:
		"pluie":
			n = 130
		"orage", "tempete":
			n = 220
		"neige":
			n = 150
	for i in n:
		_grains.append([r.randf(), r.randf(), r.randf_range(0.6, 1.4)])
	set_process(n > 0 or t == "brouillard")
	queue_redraw()


func visible_du_ciel() -> bool:
	return _grains.size() > 0 or temps == "brouillard"


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	var s := get_viewport_rect().size
	if temps == "brouillard":
		draw_rect(Rect2(Vector2.ZERO, s), Color(0.78, 0.8, 0.82, 0.3))
		for i in 5:
			var y := s.y * (0.15 + 0.17 * i) + sin(_t * 0.3 + i) * 14.0
			draw_rect(Rect2(Vector2(0, y), Vector2(s.x, 46.0)), Color(0.85, 0.87, 0.88, 0.1))
		return
	if temps == "neige":
		for g in _grains:
			var x := fposmod(float(g[0]) * s.x + sin(_t * 1.2 + float(g[1]) * 30.0) * 18.0 + _t * 40.0 * vent, s.x)
			var y := fposmod(float(g[1]) * s.y + _t * 52.0 * float(g[2]), s.y)
			draw_circle(Vector2(x, y), 1.6 * float(g[2]), Color(0.95, 0.97, 1.0, 0.8))
		return
	# la pluie : des traits qui tombent, couchés par le vent ; plus serrés et plus sombres sous l'orage et la tempête
	var fort := temps == "orage" or temps == "tempete"
	var pente := 0.18 + 0.7 * vent + (0.35 if temps == "tempete" else 0.0)
	var vitesse := 620.0 if fort else 480.0
	if fort:
		draw_rect(Rect2(Vector2.ZERO, s), Color(0.05, 0.07, 0.12, 0.16))
	for g in _grains:
		var y := fposmod(float(g[1]) * s.y + _t * vitesse * float(g[2]), s.y + 40.0) - 20.0
		var x := fposmod(float(g[0]) * (s.x + 200.0) + y * pente, s.x + 200.0) - 100.0
		draw_line(Vector2(x, y), Vector2(x + 14.0 * pente, y + 14.0), Color(0.72, 0.8, 0.9, 0.45), 1.2)
