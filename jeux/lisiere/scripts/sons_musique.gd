extends RefCounted
# Lisière — la musique (scripts/sons_musique.gd)
# Une nappe qui s'invente : des phrases de trois ou quatre accords lents, joués par des notes douces (un triangle adouci le
# jour, en ré majeur ; un sinus creux la nuit, en ré mineur), parfois une note de verre au-dessus, puis un long silence. Elle
# reste sous l'ambiance, et se retire quand la peur monte (sons.gd baisse son bus). Et des moments : une corne au loin quand la
# nuit tombe, un accord clair à l'aube, un thème bref à l'écran-titre (une flûte sur deux accords).
# Les hauteurs sont en demi-tons : par rapport au la 220 Hz pour les nappes, au la 440 Hz pour la cloche et la flûte.

# ré majeur 9, sol majeur 7, si mineur 7, la sus 2, mi mineur 9
const JOUR := [[-7, 0, 7, 9], [-2, 2, 5, 9], [-10, -3, 0, 5], [-12, -5, 2, 7], [-5, 2, 5, 9]]
# ré mineur 9, si bémol majeur 7, sol mineur 9, la sus 4, fa majeur 7 sur do
const NUIT := [[-7, 0, 7, 8], [-11, -4, 0, 5], [-14, 1, 5, 12], [-12, -5, 5, 7], [-9, -4, 0, 7]]
# le thème : [demi-tons, durée] ; deux phrases, la seconde monte et redescend vers ré
const THEME := [[0, 0.6], [5, 0.6], [7, 0.45], [8, 1.2], [7, 0.6], [5, 0.6], [3, 0.6], [5, 1.9], [-99, 0.6],
	[8, 0.6], [10, 0.6], [12, 1.3], [10, 0.55], [8, 0.55], [7, 0.6], [5, 2.6]]

var s
var _r := RandomNumberGenerator.new()
var _mode := ""
var _attente := 25.0
var _evts: Array = []      # [attente, nom, vol, hauteur]


func _init(sons) -> void:
	s = sons
	_r.randomize()


func vider() -> void:
	_mode = ""
	_evts.clear()
	_attente = 25.0


func occupee() -> bool:
	return not _evts.is_empty()


# chaque image : les notes prévues partent ; quand tout s'est tu, et après un silence, une nouvelle phrase
# mode : « jour », « nuit », « titre » ; calme : faux quand la peur est là (aucune phrase ne commence)
func maj(dt: float, mode: String, calme: bool) -> void:
	_mode = mode
	for i in range(_evts.size() - 1, -1, -1):
		var e: Array = _evts[i]
		e[0] -= dt
		if e[0] <= 0.0:
			s.note(e[1], e[2], e[3])
			_evts.remove_at(i)
	if _mode == "" or not _evts.is_empty():
		return
	_attente -= dt
	if _attente > 0.0 or not calme:
		return
	_phrase()


func _phrase() -> void:
	var nuit := _mode != "jour"
	var palette: Array = NUIT if nuit else JOUR
	var n := _r.randi_range(3, 4)
	var t := 0.5
	var i := 0 if _r.randf() < 0.6 else _r.randi() % palette.size()
	for k in n:
		var duree := _r.randf_range(8.0, 11.0)
		_accord(palette[i], t, nuit, -17.0 if _mode != "titre" else -19.0)
		# (parfois une note de verre au-dessus, très douce)
		if _r.randf() < (0.25 if nuit else 0.4):
			var note: int = palette[i][_r.randi() % palette[i].size()]
			_evts.append([t + _r.randf_range(2.0, 5.0), "cloche", -27.0 if not nuit else -30.0, pow(2.0, (note + (12 if nuit else 0)) / 12.0)])
		t += duree
		var j := i
		while j == i:
			j = _r.randi() % palette.size()
		i = j if k < n - 2 else (0 if _r.randf() < 0.6 else 3)
	_attente = _r.randf_range(25.0, 60.0) if nuit else _r.randf_range(18.0, 45.0)


# un accord : la basse d'abord, les autres notes après, une à une
func _accord(notes: Array, t: float, nuit: bool, vol: float) -> void:
	var nom := "nappe_nuit" if nuit else "nappe_jour"
	for q in notes.size():
		var d := 0.0 if q == 0 else _r.randf_range(0.3, 2.0)
		_evts.append([t + d, nom, vol + (1.5 if q == 0 else -0.8 * q), pow(2.0, notes[q] / 12.0)])


# la nuit tombe : une corne au loin, puis un accord grave de ré mineur
func tombee() -> void:
	_evts.append([0.3, "corne", -9.0, 1.0])
	_accord(NUIT[0], 3.5, true, -21.0)
	_attente = 45.0


# l'aube : un accord clair, égrené en notes de verre, sur une nappe de ré majeur
func aube() -> void:
	var arpege := [-7, -3, 0, 5, 9]
	for k in arpege.size():
		_evts.append([0.2 + k * 0.22, "cloche", -16.0 - k * 1.2, pow(2.0, arpege[k] / 12.0)])
	_accord(JOUR[0], 0.0, false, -20.0)
	_attente = 35.0


# l'écran-titre : le thème, une fois, sur deux accords de la nuit
func titre() -> void:
	_evts.clear()
	_accord(NUIT[0], 0.0, true, -23.0)
	_accord(NUIT[1], 7.4, true, -24.0)
	_accord(NUIT[0], 13.8, true, -25.0)
	var t := 1.8
	for p in THEME:
		if p[0] > -99:
			_evts.append([t, "flute_longue" if p[1] > 1.0 else "flute", -16.0, pow(2.0, p[0] / 12.0)])
		t += p[1]
	_attente = 30.0
