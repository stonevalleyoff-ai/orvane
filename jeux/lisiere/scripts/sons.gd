extends Node
# Lisière — les sons (scripts/sons.gd)
# Tous faits ici, au lancement : du bruit, des sinusoïdes, des enveloppes. Aucun fichier, aucune musique empruntée.
# Trois boucles qui vivent avec la partie (le vent, le bourdon de la nuit, le feu qui crépite) et des sons brefs.

const TAUX := 16000

var _boucles := {}
var _brefs := {}
var _lecteurs: Array = []
var _i := 0
var _r := RandomNumberGenerator.new()


func _ready() -> void:
	_r.seed = 7
	_boucle("vent", _vent(4.0))
	_boucle("nuit", _bourdon(6.0))
	_boucle("feu", _crepitement(3.0))
	_brefs["coup"] = _wav(_frappe(0.2, 130.0, 0.6))
	_brefs["bois"] = _wav(_frappe(0.22, 220.0, 0.35))
	_brefs["pierre"] = _wav(_frappe(0.15, 560.0, 0.5))
	_brefs["herbe"] = _wav(_froissement(0.25))
	_brefs["coeur"] = _wav(_battement())
	_brefs["grogne"] = _wav(_grognement(1.0))
	_brefs["murmure"] = _wav(_murmure(1.5))
	_brefs["manger"] = _wav(_croc())
	_brefs["allume"] = _wav(_souffle(0.8))
	_brefs["mord"] = _wav(_frappe(0.3, 85.0, 0.9))
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_lecteurs.append(p)


func jouer(nom: String, volume_db: float = 0.0, hauteur: float = 1.0) -> void:
	if not _brefs.has(nom):
		return
	var p: AudioStreamPlayer = _lecteurs[_i % _lecteurs.size()]
	_i += 1
	p.stream = _brefs[nom]
	p.volume_db = volume_db
	p.pitch_scale = hauteur
	p.play()


# le volume d'une boucle, de 0 (silence) à 1 ; il y va doucement
func niveau(nom: String, v: float) -> void:
	if not _boucles.has(nom):
		return
	var p: AudioStreamPlayer = _boucles[nom]
	p.volume_db = lerpf(p.volume_db, linear_to_db(clampf(v, 0.0001, 1.0)), 0.06)


func taire() -> void:
	for nom in _boucles:
		_boucles[nom].volume_db = -80.0


# --- les boucles ---

func _boucle(nom: String, s: PackedFloat32Array) -> void:
	var p := AudioStreamPlayer.new()
	p.stream = _wav(s, true)
	p.volume_db = -80.0
	add_child(p)
	p.play()
	_boucles[nom] = p


# du bruit brun (grave et doux), qui enfle et retombe
func _vent(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var b := 0.0
	for i in n:
		b = b * 0.985 + _r.randf_range(-1.0, 1.0) * 0.015
		var t := float(i) / TAUX
		s[i] = b * 3.2 * (0.65 + 0.35 * sin(TAU * t * 2.0 / duree))
	return _fondu(s, int(0.3 * TAUX))


# des graves qui battent entre eux : la nuit qui pèse (chaque fréquence fait un nombre entier de tours : la boucle ne saute pas)
func _bourdon(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var b := 0.0
	for i in n:
		var t := float(i) / TAUX
		b = b * 0.995 + _r.randf_range(-1.0, 1.0) * 0.005
		s[i] = 0.16 * sin(TAU * 55.0 * t) + 0.13 * sin(TAU * 55.5 * t) + 0.08 * sin(TAU * 82.5 * t) + 0.1 * sin(TAU * 27.5 * t) + b * 1.5
	return _fondu(s, int(0.2 * TAUX))


# des braises qui éclatent sur un souffle
func _crepitement(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var b := 0.0
	var eclat := 0.0
	for i in n:
		b = b * 0.97 + _r.randf_range(-1.0, 1.0) * 0.03
		if _r.randf() < 0.0012:
			eclat = _r.randf_range(0.3, 0.9)
		eclat *= 0.93
		s[i] = b * 1.4 + eclat * _r.randf_range(-1.0, 1.0)
	return _fondu(s, int(0.2 * TAUX))


# la fin d'une boucle fondue dans son début : elle tourne sans claquer
func _fondu(s: PackedFloat32Array, f: int) -> PackedFloat32Array:
	var n := s.size() - f
	for i in f:
		var k := float(i) / f
		s[i] = s[i] * k + s[n + i] * (1.0 - k)
	s.resize(n)
	return s


# --- les sons brefs ---

func _frappe(duree: float, f: float, bruit: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t := float(i) / TAUX
		s[i] = (sin(TAU * f * t * (1.0 - t)) * 0.7 + _r.randf_range(-1.0, 1.0) * bruit * exp(-t * 45.0)) * exp(-t * 14.0) * 0.8
	return s


func _froissement(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var p := 0.0
	for i in n:
		var t := float(i) / TAUX
		var x := _r.randf_range(-1.0, 1.0)
		s[i] = (x - p) * 0.35 * sin(PI * t / duree)
		p = x
	return s


# deux coups sourds : le cœur
func _battement() -> PackedFloat32Array:
	var n := int(0.55 * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t := float(i) / TAUX
		var a := exp(-t * 30.0) * sin(TAU * 52.0 * t)
		var t2 := t - 0.17
		if t2 > 0.0:
			a += 0.75 * exp(-t2 * 30.0) * sin(TAU * 48.0 * t2)
		s[i] = a * 0.9
	return s


# un grognement : un bruit grave, roulé
func _grognement(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var b := 0.0
	for i in n:
		var t := float(i) / TAUX
		b = b * 0.9 + _r.randf_range(-1.0, 1.0) * 0.1
		var env := minf(1.0, t / 0.12) * minf(1.0, (duree - t) / 0.3)
		s[i] = (b * 2.2 + 0.25 * sin(TAU * 68.0 * t)) * (0.55 + 0.45 * sin(TAU * 26.0 * t)) * env * 0.8
	return s


# un murmure : un souffle aigu qui hésite
func _murmure(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var p := 0.0
	var f1 := _r.randf_range(3.0, 5.0)
	for i in n:
		var t := float(i) / TAUX
		var x := _r.randf_range(-1.0, 1.0)
		var env := sin(PI * t / duree) * (0.5 + 0.5 * sin(TAU * f1 * t))
		s[i] = (x - p) * 0.22 * env + 0.05 * sin(TAU * 310.0 * t + sin(TAU * 2.0 * t) * 3.0) * env
		p = x
	return s


func _croc() -> PackedFloat32Array:
	var n := int(0.3 * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t := float(i) / TAUX
		var c := fmod(t, 0.09)
		s[i] = _r.randf_range(-1.0, 1.0) * exp(-c * 70.0) * 0.5 * (1.0 - t / 0.3)
	return s


func _souffle(duree: float) -> PackedFloat32Array:
	var n := int(duree * TAUX)
	var s := PackedFloat32Array()
	s.resize(n)
	var b := 0.0
	for i in n:
		var t := float(i) / TAUX
		b = b * 0.9 + _r.randf_range(-1.0, 1.0) * 0.1
		s[i] = b * 2.5 * sin(PI * t / duree)
	return s


func _wav(s: PackedFloat32Array, boucle: bool = false) -> AudioStreamWAV:
	var o := PackedByteArray()
	o.resize(s.size() * 2)
	for i in s.size():
		o.encode_s16(i * 2, int(clampf(s[i], -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = TAUX
	w.stereo = false
	w.data = o
	if boucle:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = s.size()
	return w
