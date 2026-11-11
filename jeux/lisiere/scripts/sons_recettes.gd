extends RefCounted
# Lisière — les recettes des sons (scripts/sons_recettes.gd)
# Chaque son du jeu, fait ici : du bruit filtré, des résonances amorties, des voix de bêtes, des tuiles d'ambiance, des notes.
# fabriquer(nom, r) rend [échantillons, taux]. Un chiffre au bout du nom tire une variante (« braise3 », « pas_neige1 »).
# Les sons lointains reçoivent ensuite leur réverbère (LOINTAINS, fait par morceaux dans sons.gd).

const O := preload("res://scripts/sons_outils.gd")
const GRAVE := O.GRAVE
const SOURD := O.SOURD
const LENT := O.LENT
const VIF := O.VIF

# les couches continues, faites de tuiles qui se chevauchent : [longueur, fondu] (en secondes)
const TUILES := {
	"vent_grave": [6.0, 1.6], "vent_clair": [4.5, 1.2], "feu_souffle": [4.0, 1.0], "feu_braise": [2.5, 0.7],
	"bourdon": [6.0, 1.8], "tension": [5.0, 1.4], "choeur": [6.0, 1.2],
}
# les sons qui viennent de loin, avec leur réverbère : [durée de la queue, échos de la lisière, part du son direct]
const LOINTAINS := {
	"chouette": [2.2, 0.35, 0.65], "craquement": [1.8, 0.4, 0.7], "hurlement": [2.6, 0.4, 0.6], "grondement": [1.8, 0.3, 0.7],
	"corne": [3.2, 0.45, 0.55], "murmure": [2.4, 0.25, 0.6],
}


# le taux de chaque son : assez pour ses aigus, pas plus (le calcul en dépend)
const TAUX := {
	"vent_grave": GRAVE, "vent_clair": LENT, "feu_souffle": GRAVE, "feu_braise": VIF, "braise": VIF, "pop": VIF,
	"bourdon": GRAVE, "tension": SOURD, "choeur": LENT, "grillon": VIF, "oiseau": VIF, "grenouille": LENT,
	"chouette": SOURD, "craquement": VIF, "hurlement": SOURD, "grondement": SOURD, "froissement": VIF,
	"pas_feuilles": VIF, "pas_herbe": VIF, "pas_neige": VIF, "pas_terre": VIF, "bois": VIF, "pierre": VIF, "herbe": VIF,
	"coup": VIF, "mord": SOURD, "grogne": SOURD, "murmure": SOURD, "manger": VIF, "allume": SOURD, "coeur": GRAVE,
	"gresille": VIF, "eteint": SOURD, "chute": GRAVE, "nappe_jour": GRAVE, "nappe_nuit": GRAVE, "cloche": SOURD,
	"flute": SOURD, "flute_longue": SOURD, "corne": GRAVE, "queue_sourde": SOURD, "queue_claire": SOURD, "queue_voix": SOURD,
}


# [échantillons, taux] ; [] si le nom n'est pas connu
static func fabriquer(nom: String, r: RandomNumberGenerator) -> Array:
	var base := nom.rstrip("0123456789")
	var k := int(nom.substr(base.length())) if base.length() < nom.length() else 0
	match base:
		"vent_grave":
			return [_vent_grave(r), TAUX[base]]
		"vent_clair":
			return [_vent_clair(r), TAUX[base]]
		"feu_souffle":
			return [_feu_souffle(r), TAUX[base]]
		"feu_braise":
			return [_feu_braise(r), TAUX[base]]
		"braise":
			return [_braise(r), TAUX[base]]
		"pop":
			return [_pop(r), TAUX[base]]
		"bourdon":
			return [_bourdon(r), TAUX[base]]
		"tension":
			return [_tension(r), TAUX[base]]
		"choeur":
			return [_choeur(r), TAUX[base]]
		"grillon":
			return [_grillon(k), TAUX[base]]
		"oiseau":
			return [_oiseau(k, r), TAUX[base]]
		"grenouille":
			return [_grenouille(k, r), TAUX[base]]
		"chouette":
			return [_chouette(r), TAUX[base]]
		"craquement":
			return [_craquement(r), TAUX[base]]
		"hurlement":
			return [_hurlement(k, r), TAUX[base]]
		"grondement":
			return [_grondement(r), TAUX[base]]
		"froissement":
			return [_froissement(r), TAUX[base]]
		"pas_feuilles", "pas_herbe", "pas_neige", "pas_terre":
			return [_pas(base.substr(4), r), TAUX[base]]
		"bois":
			return [_bois(r), TAUX[base]]
		"pierre":
			return [_pierre(r), TAUX[base]]
		"herbe":
			return [_herbe(r), TAUX[base]]
		"coup":
			return [_coup(r), TAUX[base]]
		"mord":
			return [_mord(r), TAUX[base]]
		"grogne":
			return [_grogne(r), TAUX[base]]
		"murmure":
			return [_murmure(r), TAUX[base]]
		"manger":
			return [_manger(r), TAUX[base]]
		"allume":
			return [_allume(r), TAUX[base]]
		"coeur":
			return [_coeur(), TAUX[base]]
		"gresille":
			return [_gresille(r), TAUX[base]]
		"eteint":
			return [_eteint(r), TAUX[base]]
		"chute":
			return [_chute(r), TAUX[base]]
		"nappe_jour":
			return [_nappe(false), TAUX[base]]
		"nappe_nuit":
			return [_nappe(true), TAUX[base]]
		"cloche":
			return [_cloche(), TAUX[base]]
		"flute":
			return [_flute(r, 0.85), TAUX[base]]
		"flute_longue":
			return [_flute(r, 2.6), TAUX[base]]
		"corne":
			return [_corne(r), TAUX[base]]
		"queue_sourde", "queue_claire", "queue_voix":
			return [_queue(base.substr(6), r), TAUX[base]]
	return []


# --- des briques ---

# du bruit filtré dans une bande, posé avec une enveloppe en cloche (montée, chute), à partir de « debut »
static func _souffle_bande(s: PackedFloat32Array, debut: float, duree: float, fc: float, q: float, amp: float, taux: int, r: RandomNumberGenerator) -> void:
	var b := O.vide(duree, taux)
	O.bruit(b, r)
	O.bande(b, fc, q, taux)
	var n := b.size()
	for i in n:
		var u := float(i) / n
		b[i] *= pow(sin(PI * u), 0.7) * (1.0 - u * 0.4)
	O.normaliser(b, amp)
	O.poser(s, b, int(debut * taux), 1.0)


# une volée de petits éclats (des feuilles qui craquent, de la neige, des miettes), filtrée dans une bande
static func _grains(s: PackedFloat32Array, debut: float, duree: float, nombre: int, fc: float, q: float, amp: float, taux: int, r: RandomNumberGenerator, tau := Vector2(0.0003, 0.0012)) -> void:
	var b := O.vide(duree + 0.02, taux)
	for i in nombre:
		# (plus serrés au début : le pied se pose, puis tout se tasse)
		var t := duree * pow(r.randf(), 1.6)
		O.eclat(b, t, r.randf_range(tau.x, tau.y), r.randf_range(0.25, 1.0), r, taux)
	O.bande(b, fc, q, taux)
	O.normaliser(b, amp)
	O.poser(s, b, int(debut * taux), 1.0)


# une voix de bête : un train d'impulsions (la gorge) à travers des formants (la gueule), et un râle de bruit
# f0, f1 : la cadence des impulsions au début et à la fin ; formants : [[fréquence, q, gain], ...]
static func _voix(duree: float, f0: float, f1: float, formants: Array, rale: float, taux: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var n := int(duree * taux)
	var e := PackedFloat32Array()
	e.resize(n)
	var ph := 0.0
	var imp := 0.0
	var k := exp(-1.0 / (0.0025 * taux))
	for i in n:
		var u := float(i) / n
		var f := lerpf(f0, f1, u) * (1.0 + r.randf_range(-0.08, 0.08))
		ph += f / taux
		if ph >= 1.0:
			ph -= 1.0
			imp = r.randf_range(0.7, 1.0)
		e[i] = imp + r.randf_range(-rale, rale) * (0.3 + imp)
		imp *= k
	var s := PackedFloat32Array()
	s.resize(n)
	for fo in formants:
		var c := e.duplicate()
		O.bande(c, fo[0], fo[1], taux)
		O.poser(s, c, 0, fo[2])
	return s


# une note : des harmoniques [rang, gain] (lus dans une table), un partiel désaccordé à part [rapport, gain] (il bat
# lentement contre le fondamental), une montée et une chute (en secondes), un vibrato qui vient doucement
static func _note(duree: float, f: float, harmoniques: Array, desaccord: Array, montee: float, chute: float, vib: float, taux: int) -> PackedFloat32Array:
	var s := O.vide(duree, taux)
	var n := s.size()
	var tab := O.table(harmoniques)
	var ph := 0.0
	var ph2 := 0.0
	var d: float = desaccord[0] if desaccord.size() > 1 else 0.0
	var dg: float = desaccord[1] if desaccord.size() > 1 else 0.0
	var pas := f / taux
	var wv := TAU * 4.8 / taux
	for i in n:
		var v := 1.0 + vib * sin(wv * i) * minf(1.0, float(i) / (1.2 * taux))
		ph += pas * v
		if ph >= 1.0:
			ph -= 1.0
		var x := ph * O.TABLE
		var k := int(x)
		var e := tab[k] + (tab[k + 1] - tab[k]) * (x - k)
		if dg > 0.0:
			ph2 += TAU * pas * d * v
			e += sin(ph2) * dg
		s[i] = e
	return O.enveloppe(s, montee, chute, taux)


# --- les couches continues (des tuiles : leurs bouts fondent l'un dans l'autre) ---

# le corps du vent : un bruit brun, grave, qui tourne lentement sur lui-même
static func _vent_grave(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["vent_grave"]
	var s := O.vide(d[0], GRAVE)
	O.bruit_bas(s, 160.0, 420.0, 1.0, GRAVE, r)
	var m := O.lent(s.size(), 0.7, GRAVE, r)
	for i in s.size():
		s[i] *= 0.72 + 0.28 * m[i]
	O.niveau(s, 0.22)
	return O.tuile(s, d[1], GRAVE)


# le vent dans les feuilles et les herbes : deux bandes de bruit, qui frémissent
static func _vent_clair(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["vent_clair"]
	var s := O.vide(d[0], LENT)
	O.bruit_bande(s, 820.0, 0.7, 1.0, LENT, r)
	O.bruit_bande(s, 2400.0, 1.3, 0.45, LENT, r)
	var m := O.lent(s.size(), 3.5, LENT, r)
	var m2 := O.lent(s.size(), 0.5, LENT, r)
	for i in s.size():
		s[i] *= 0.62 + 0.25 * m[i] + 0.13 * m2[i]
	# (rien près du Nyquist : le rééchantillonnage le replierait en un sifflement)
	O.bas(s, 3200.0, LENT)
	O.niveau(s, 0.2)
	return O.tuile(s, d[1], LENT)


# le souffle du feu : un grondement sourd, qui vacille comme les flammes
static func _feu_souffle(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["feu_souffle"]
	var s := O.vide(d[0], GRAVE)
	O.bruit_bas(s, 220.0, 520.0, 1.0, GRAVE, r)
	O.bruit_bande(s, 950.0, 0.9, 0.12, GRAVE, r)
	var m := O.lent(s.size(), 6.0, GRAVE, r)
	for i in s.size():
		s[i] *= 0.68 + 0.32 * m[i]
	O.niveau(s, 0.22)
	return O.tuile(s, d[1], GRAVE)


# les braises qui sifflent : une poussière de minuscules éclats, serrés (une texture, pas des crépitements qu'on compte)
static func _feu_braise(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["feu_braise"]
	var s := O.vide(d[0], VIF)
	var t := 0.0
	while t < d[0] - 0.01:
		O.eclat(s, t, r.randf_range(0.00008, 0.00025), r.randf_range(0.05, 0.6), r, VIF)
		t += -log(maxf(r.randf(), 0.0001)) / 140.0
	O.bande(s, 5200.0, 0.6, VIF)
	O.bruit_bande(s, 6000.0, 0.7, 0.05, VIF, r)
	O.niveau(s, 0.09)
	return O.tuile(s, d[1], VIF)


# un crépitement : un à trois éclats serrés, qui sonnent dans une petite bande (chaque variante a la sienne)
static func _braise(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.07, VIF)
	var t := 0.002
	for c in 1 + r.randi() % 3:
		O.eclat(s, t, r.randf_range(0.0002, 0.0007), r.randf_range(0.5, 1.0), r, VIF)
		t += r.randf_range(0.002, 0.012)
	O.bande(s, r.randf_range(1700.0, 5600.0), r.randf_range(1.4, 3.5), VIF)
	if r.randf() < 0.5:
		O.mode(s, 0.002, r.randf_range(500.0, 950.0), 0.004, 0.12, VIF)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# un pop : une poche de sève qui claque, un « toc » de bois, et quelques étincelles derrière
static func _pop(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.25, VIF)
	var c := O.vide(0.25, VIF)
	O.eclat(c, 0.001, 0.0012, 1.0, r, VIF)
	O.bande(c, r.randf_range(1000.0, 1600.0), 0.9, VIF)
	O.poser(s, c, 0, 1.0)
	O.mode(s, 0.001, r.randf_range(220.0, 380.0), 0.022, 0.45, VIF, 0.8)
	var e := O.vide(0.25, VIF)
	for i in 3 + r.randi() % 4:
		O.eclat(e, r.randf_range(0.02, 0.2), 0.0003, r.randf_range(0.1, 0.35), r, VIF)
	O.haut(e, 3000.0, VIF)
	O.poser(s, e, 0, 1.0)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# la peur : des graves qui frottent (un la, sa seconde mineure, une quinte et sa quarte augmentée), et un souffle sous eux
static func _bourdon(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["bourdon"]
	var s := O.vide(d[0], GRAVE)
	O.bruit_bas(s, 90.0, 160.0, 1.0, GRAVE, r)
	O.niveau(s, 0.05)
	O.sinus(s, [[55.0, 0.3], [58.27, 0.22], [82.4, 0.12], [87.3, 0.1], [110.0, 0.09], [116.5, 0.07], [220.0, 0.03], [233.1, 0.025]], GRAVE, r)
	var m := O.lent(s.size(), 0.4, GRAVE, r)
	for i in s.size():
		s[i] *= 0.8 + 0.2 * m[i]
	O.normaliser(s, 0.8)
	return O.tuile(s, d[1], GRAVE)


# la peur qui monte : un agrégat aigu, serré (fa dièse, sol, sol dièse : ils battent), et un air froid au-dessus
static func _tension(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["tension"]
	var s := O.vide(d[0], SOURD)
	O.bruit_bande(s, 2400.0, 2.0, 0.05, SOURD, r)
	O.sinus(s, [[740.0, 0.12], [784.0, 0.1], [830.6, 0.08], [1480.0, 0.03]], SOURD, r)
	var m := O.lent(s.size(), 0.35, SOURD, r)
	for i in s.size():
		s[i] *= 0.7 + 0.3 * m[i]
	O.normaliser(s, 0.7)
	return O.tuile(s, d[1], SOURD)


# le chœur des grillons au loin : des grillons réguliers, chacun à sa hauteur et à son pas, un peu sourds
static func _choeur(r: RandomNumberGenerator) -> PackedFloat32Array:
	var d: Array = TUILES["choeur"]
	var s := O.vide(d[0], LENT)
	var n := s.size()
	for c in 5:
		var f := r.randf_range(3900.0, 4900.0)
		var chant := _stridulation(f, 3 + r.randi() % 2, LENT, false)
		var periode := r.randf_range(0.38, 0.8)
		var g := r.randf_range(0.25, 1.0)
		var t := r.randf() * periode
		while t < d[0]:
			O.poser(s, chant, int(t * LENT), g * r.randf_range(0.8, 1.0), true)
			t += periode * r.randf_range(0.98, 1.02)
	O.bas(s, 4200.0, LENT)
	O.niveau(s, 0.08)
	return O.tuile(s, d[1], LENT)


# --- les bêtes et le lieu ---

# une stridulation : quelques impulsions d'une porteuse aiguë, chacune glissant un peu vers le bas
static func _stridulation(f: float, impulsions: int, taux: int, harmonique: bool) -> PackedFloat32Array:
	var dp := 0.013
	var ecart := 0.009
	var s := O.vide(0.006 + impulsions * (dp + ecart), taux)
	var m := int(dp * taux)
	for p in impulsions:
		var i0 := int((0.004 + p * (dp + ecart)) * taux)
		var ph := 0.0
		var a := 0.75 + 0.25 * float(p) / maxi(1, impulsions - 1)
		for j in m:
			var u := float(j) / m
			ph += TAU * f * (1.0 - 0.035 * u) / taux
			var env := pow(sin(PI * u), 1.2) * a
			var v := sin(ph)
			if harmonique:
				v += 0.12 * sin(2.0 * ph)
			if i0 + j < s.size():
				s[i0 + j] += v * env
	return s


static func _grillon(k: int) -> PackedFloat32Array:
	var s := _stridulation(4350.0 if k == 0 else 4850.0, 3 if k == 0 else 4, VIF, true)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# des oiseaux : des syllabes de sinus qui glissent
static func _syllabe(s: PackedFloat32Array, debut: float, duree: float, f0: float, f1: float, amp: float, taux: int, h2: float = 0.1, trille: float = 0.0) -> void:
	var i0 := int(debut * taux)
	var n := int(duree * taux)
	var ph := 0.0
	for j in n:
		if i0 + j >= s.size():
			return
		var u := float(j) / n
		var f := f0 * pow(f1 / f0, u)
		ph += TAU * f / taux
		var env := pow(sin(PI * u), 0.8) * amp
		if trille > 0.0:
			env *= 0.55 + 0.45 * sin(TAU * trille * j / taux)
		s[i0 + j] += (sin(ph) + h2 * sin(2.0 * ph)) * env


static func _oiseau(k: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var s: PackedFloat32Array
	match k % 4:
		0:
			# « tsip-tsip-tsip »
			s = O.vide(0.42, VIF)
			for i in 3:
				_syllabe(s, 0.01 + i * 0.13, 0.04, 6300.0, 4700.0, 1.0 - i * 0.1, VIF, 0.05)
		1:
			# une trille qui descend
			s = O.vide(0.8, VIF)
			for i in 15:
				var u := i / 14.0
				_syllabe(s, 0.01 + i * 0.048, 0.032, 3700.0 - 600.0 * u, 3200.0 - 550.0 * u, sin(PI * (0.15 + 0.85 * u)), VIF, 0.08)
		2:
			# « ti-tu, ti-tu, ti-tu »
			s = O.vide(0.95, VIF)
			for i in 3:
				_syllabe(s, 0.01 + i * 0.29, 0.085, 4150.0, 4000.0, 1.0, VIF, 0.06)
				_syllabe(s, 0.12 + i * 0.29, 0.09, 2950.0, 2850.0, 0.85, VIF, 0.06)
		3:
			# une phrase flûtée, comme un merle
			s = O.vide(1.25, VIF)
			var f := r.randf_range(0.95, 1.05)
			_syllabe(s, 0.01, 0.14, 1900.0 * f, 2350.0 * f, 0.8, VIF, 0.15)
			_syllabe(s, 0.17, 0.1, 2350.0 * f, 2050.0 * f, 0.7, VIF, 0.15)
			_syllabe(s, 0.3, 0.24, 2050.0 * f, 2650.0 * f, 1.0, VIF, 0.15)
			_syllabe(s, 0.57, 0.12, 2650.0 * f, 2200.0 * f, 0.8, VIF, 0.15)
			_syllabe(s, 0.73, 0.38, 2250.0 * f, 1800.0 * f, 0.7, VIF, 0.12, 28.0)
	O.normaliser(s, 0.85)
	return O.bords(s, VIF)


# une grenouille : des impulsions qui font sonner une gorge (deux résonances)
static func _grenouille(k: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var s: PackedFloat32Array
	if k % 2 == 0:
		# un « croâ » grave, roulé
		s = O.vide(0.5, LENT)
		var t := 0.005
		var i := 0
		while t < 0.42:
			var u := t / 0.42
			var a := sin(PI * minf(1.0, u * 1.4)) * (1.0 - 0.3 * u)
			O.mode(s, t, 430.0 * (1.0 + 0.12 * u), 0.008, a, LENT)
			O.mode(s, t, 1150.0 * (1.0 + 0.08 * u), 0.005, a * 0.5, LENT)
			O.mode(s, t, 2100.0, 0.003, a * 0.18, LENT)
			t += 1.0 / lerpf(23.0, 31.0, u) * r.randf_range(0.95, 1.05)
			i += 1
	else:
		# « krek-krek » : une rainette
		s = O.vide(0.36, LENT)
		for b in 2:
			for p in 5:
				var t2 := 0.005 + b * 0.16 + p * 0.0135
				O.mode(s, t2, 1650.0, 0.0035, 1.0 - p * 0.1, LENT)
				O.mode(s, t2, 2700.0, 0.0025, 0.45, LENT)
	O.normaliser(s, 0.9)
	return O.bords(s, LENT)


# une chouette au loin : « hou… hou, hou-hou-houuu »
static func _chouette(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(3.4, SOURD)
	var f := r.randf_range(0.97, 1.03)
	_hou(s, 0.02, 0.44, 440.0 * f, 405.0 * f, 0.0, r)
	_hou(s, 1.55, 0.12, 432.0 * f, 420.0 * f, 0.0, r)
	_hou(s, 1.8, 0.1, 430.0 * f, 418.0 * f, 0.0, r)
	_hou(s, 1.98, 1.15, 448.0 * f, 398.0 * f, 9.0, r)
	O.bas(s, 2000.0, SOURD)
	O.normaliser(s, 0.85)
	return O.bords(s, SOURD)


static func _hou(s: PackedFloat32Array, debut: float, duree: float, f0: float, f1: float, trem: float, r: RandomNumberGenerator) -> void:
	var i0 := int(debut * SOURD)
	var n := int(duree * SOURD)
	var ph := 0.0
	var b := O.vide(duree, SOURD)
	O.bruit(b, r)
	O.bande(b, (f0 + f1) * 0.5, 5.0, SOURD)
	for j in n:
		var u := float(j) / n
		var f := lerpf(f0, f1, u * u)
		ph += TAU * f / SOURD
		var env := minf(1.0, u * duree / 0.05) * minf(1.0, (1.0 - u) * duree / 0.14)
		if trem > 0.0 and u < 0.45:
			env *= 1.0 - 0.6 * (0.5 + 0.5 * cos(TAU * trem * j / SOURD)) * (1.0 - u / 0.45)
		s[i0 + j] += (sin(ph) + 0.07 * sin(2.0 * ph) + b[j] * 0.35) * env


# une branche qui casse au loin
static func _craquement(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.8, VIF)
	var c := O.vide(0.8, VIF)
	var t := 0.003
	for i in 3 + r.randi() % 3:
		O.eclat(c, t, r.randf_range(0.0003, 0.0007), r.randf_range(0.4, 1.0), r, VIF)
		t += r.randf_range(0.003, 0.012)
	O.bande(c, r.randf_range(2200.0, 3200.0), 1.2, VIF)
	O.poser(s, c, 0, 1.0)
	O.mode(s, 0.003, r.randf_range(560.0, 760.0), 0.018, 0.45, VIF, 0.9)
	O.mode(s, 0.004, r.randf_range(1200.0, 1500.0), 0.009, 0.25, VIF)
	O.mode(s, 0.03, 85.0, 0.07, 0.5, VIF, 0.8)
	_souffle_bande(s, 0.05, 0.42, 3400.0, 1.0, 0.12, VIF, r)
	O.bas(s, 3600.0, VIF)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# un hurlement : une voix qui monte, tient en vibrant, et retombe (k = 1 : une bête plus petite, plus aiguë, plus brève)
static func _hurlement(k: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var court := k % 2 == 1
	var duree := 2.4 if court else 3.4
	var s := O.vide(duree, SOURD)
	var n := s.size()
	var f_bas := 420.0 if court else 300.0
	var f_haut := 700.0 if court else 545.0
	var f_tenu := 625.0 if court else 505.0
	var f_fin := 470.0 if court else 395.0
	var vib := 6.4 if court else 5.4
	var tab := O.table([[1.0, 1.0], [2.0, 0.28], [3.0, 0.11], [4.0, 0.045]])
	var ph := 0.0
	var b := O.vide(duree, SOURD)
	O.bruit(b, r)
	O.bande(b, 900.0, 1.6, SOURD)
	var a1 := 0.5 if court else 0.6
	var a2 := 0.72
	for i in n:
		var u := float(i) / n
		var f: float
		if u < a1 * 0.3:
			var v := u / (a1 * 0.3)
			f = lerpf(f_bas, f_haut, 1.0 - (1.0 - v) * (1.0 - v))
		elif u < a2:
			f = lerpf(f_haut, f_tenu, (u - a1 * 0.3) / (a2 - a1 * 0.3))
		else:
			var v2 := (u - a2) / (1.0 - a2)
			f = lerpf(f_tenu, f_fin, v2 * v2)
		f *= 1.0 + 0.012 * sin(TAU * vib * i / SOURD) * clampf((u - 0.15) * 4.0, 0.0, 1.0)
		ph += f / SOURD
		if ph >= 1.0:
			ph -= 1.0
		var x := ph * O.TABLE
		var k2 := int(x)
		var v := tab[k2] + (tab[k2 + 1] - tab[k2]) * (x - k2)
		var env := sin(PI * 0.5 * minf(1.0, u / 0.1)) * minf(1.0, (1.0 - u) / 0.22) * (0.85 + 0.15 * sin(PI * u))
		s[i] = (v + b[i] * 0.09) * env
	O.bas(s, 2200.0, SOURD)
	O.normaliser(s, 0.85)
	return O.bords(s, SOURD)


# un grondement au loin : une grosse bête
static func _grondement(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := _voix(2.0, 26.0, 33.0, [[240.0, 3.0, 1.0], [560.0, 4.0, 0.5], [1300.0, 5.0, 0.15]], 0.5, SOURD, r)
	var n := s.size()
	for i in n:
		var u := float(i) / n
		s[i] *= sin(PI * pow(u, 0.6)) * (0.7 + 0.3 * sin(TAU * 2.6 * i / SOURD))
	O.bas(s, 1300.0, SOURD)
	O.normaliser(s, 0.9)
	return O.bords(s, SOURD)


# quelque chose bouge dans les fourrés
static func _froissement(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.55, VIF)
	_grains(s, 0.0, 0.18, 14, 2300.0, 0.9, 0.7, VIF, r)
	_grains(s, 0.22, 0.2, 12, 2000.0, 0.9, 0.55, VIF, r)
	_souffle_bande(s, 0.0, 0.5, 3000.0, 1.0, 0.25, VIF, r)
	O.bas(s, 4500.0, VIF)
	O.normaliser(s, 0.85)
	return O.bords(s, VIF)


# --- les pas : un talon, puis la matière du sol ---

static func _pas(sol: String, r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.24, VIF)
	match sol:
		"feuilles":
			O.mode(s, 0.0, r.randf_range(85.0, 105.0), 0.018, 0.35, VIF, 0.8)
			_grains(s, 0.004, 0.11, r.randi_range(16, 28), r.randf_range(1900.0, 3200.0), 0.9, 1.0, VIF, r)
			_souffle_bande(s, 0.02, 0.17, 3600.0, 1.2, 0.18, VIF, r)
		"herbe":
			O.mode(s, 0.0, r.randf_range(100.0, 120.0), 0.012, 0.22, VIF, 0.8)
			_souffle_bande(s, 0.0, r.randf_range(0.13, 0.17), r.randf_range(2100.0, 2900.0), 0.8, 0.8, VIF, r)
			_grains(s, 0.01, 0.08, 8, 3500.0, 1.0, 0.3, VIF, r)
			O.haut(s, 300.0, VIF)
		"neige":
			O.mode(s, 0.0, 80.0, 0.02, 0.3, VIF, 0.8)
			_grains(s, 0.002, 0.05, r.randi_range(26, 36), r.randf_range(1100.0, 1500.0), 0.7, 0.9, VIF, r, Vector2(0.0006, 0.002))
			_grains(s, 0.07, 0.08, r.randi_range(30, 44), r.randf_range(1300.0, 1800.0), 0.7, 1.0, VIF, r, Vector2(0.0006, 0.002))
			O.bas(s, 3200.0, VIF)
		_:
			O.mode(s, 0.0, r.randf_range(78.0, 92.0), 0.025, 0.6, VIF, 0.85)
			var c := O.vide(0.24, VIF)
			O.eclat(c, 0.001, 0.003, 0.5, r, VIF)
			O.bas(c, 1500.0, VIF)
			O.poser(s, c, 0, 1.0)
			_grains(s, 0.01, 0.07, r.randi_range(5, 10), 3000.0, 1.2, 0.2, VIF, r)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# --- les gestes ---

# un coup de hache dans un tronc : le choc, les modes du bois, la résonance du tronc, des feuilles qui tremblent
static func _bois(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.8, VIF)
	var c := O.vide(0.8, VIF)
	O.eclat(c, 0.0, 0.0025, 1.0, r, VIF)
	O.bas(c, 2500.0, VIF)
	O.poser(s, c, 0, 0.8)
	var f := r.randf_range(180.0, 210.0)
	O.mode(s, 0.0005, f, 0.09, 0.8, VIF, 0.97)
	O.mode(s, 0.0005, f * 2.21, 0.06, 0.45, VIF)
	O.mode(s, 0.0005, f * 4.1, 0.035, 0.3, VIF)
	O.mode(s, 0.0005, f * 7.3, 0.018, 0.18, VIF)
	O.mode(s, 0.0, 104.0, 0.13, 0.35, VIF)
	_souffle_bande(s, 0.06, 0.45, 3200.0, 1.2, 0.07, VIF, r)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# deux pierres : un claquement sec, des modes aigus et serrés, du gravier qui retombe
static func _pierre(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.36, VIF)
	var c := O.vide(0.36, VIF)
	O.eclat(c, 0.0, 0.0006, 1.0, r, VIF)
	O.haut(c, 800.0, VIF)
	O.poser(s, c, 0, 0.9)
	var k := r.randf_range(0.94, 1.06)
	O.mode(s, 0.0003, 2350.0 * k, 0.022, 0.6, VIF)
	O.mode(s, 0.0003, 3720.0 * k, 0.014, 0.45, VIF)
	O.mode(s, 0.0003, 5300.0 * k, 0.009, 0.35, VIF)
	O.mode(s, 0.0003, 1180.0 * k, 0.03, 0.25, VIF)
	O.mode(s, 0.0, 165.0, 0.02, 0.3, VIF)
	var g := O.vide(0.36, VIF)
	for i in r.randi_range(6, 12):
		O.eclat(g, r.randf_range(0.03, 0.22), 0.0003, r.randf_range(0.05, 0.2), r, VIF)
	O.bande(g, 4000.0, 2.0, VIF)
	O.poser(s, g, 0, 1.0)
	O.normaliser(s, 0.9)
	return O.bords(s, VIF)


# un froissement de feuilles et d'herbes, et une tige qui casse
static func _herbe(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.5, VIF)
	var t := 0.0
	for i in 3:
		_souffle_bande(s, t, r.randf_range(0.15, 0.24), r.randf_range(2600.0, 4000.0), 1.0, 1.0 - i * 0.2, VIF, r)
		_grains(s, t, 0.12, 10, 3000.0, 1.0, 0.35, VIF, r)
		t += r.randf_range(0.07, 0.11)
	var c := O.vide(0.5, VIF)
	O.eclat(c, 0.24, 0.0004, 0.6, r, VIF)
	O.bande(c, 1800.0, 3.0, VIF)
	O.poser(s, c, 0, 1.0)
	O.haut(s, 700.0, VIF)
	O.haut(s, 400.0, VIF)
	O.normaliser(s, 0.85)
	return O.bords(s, VIF)


# un coup sur une bête : un choc mat (un grave qui tombe), une claque étouffée par la fourrure
static func _coup(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.42, VIF)
	O.mode(s, 0.0, 112.0, 0.07, 1.0, VIF, 0.55)
	O.mode(s, 0.0, 215.0, 0.025, 0.5, VIF, 0.7)
	var c := O.vide(0.42, VIF)
	O.eclat(c, 0.0, 0.006, 0.7, r, VIF)
	O.bas(c, 2200.0, VIF)
	O.poser(s, c, 0, 1.0)
	_grains(s, 0.008, 0.05, 6, 1500.0, 1.0, 0.18, VIF, r)
	O.normaliser(s, 0.92)
	return O.bords(s, VIF)


# une morsure : un grondement bref, puis les crocs qui claquent et le choc, et la chair qui se déchire
static func _mord(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.75, SOURD)
	var g := _voix(0.3, 44.0, 56.0, [[480.0, 3.0, 1.0], [1150.0, 4.0, 0.55], [2100.0, 5.0, 0.2]], 0.6, SOURD, r)
	O.enveloppe(g, 0.05, 0.14, SOURD)
	O.normaliser(g, 0.55)
	O.poser(s, g, 0, 1.0)
	O.mode(s, 0.16, 86.0, 0.08, 1.0, SOURD, 0.6)
	O.mode(s, 0.16, 165.0, 0.04, 0.5, SOURD, 0.8)
	var c := O.vide(0.75, SOURD)
	O.eclat(c, 0.158, 0.0008, 0.9, r, SOURD)
	O.bande(c, 2200.0, 2.0, SOURD)
	O.poser(s, c, 0, 1.0)
	_grains(s, 0.18, 0.3, 26, 1600.0, 0.7, 0.4, SOURD, r, Vector2(0.001, 0.004))
	O.normaliser(s, 0.95)
	return O.bords(s, SOURD)


# un grognement : une gorge qui roule
static func _grogne(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := _voix(1.2, 34.0, 30.0, [[330.0, 3.0, 1.0], [850.0, 4.0, 0.55], [1800.0, 5.0, 0.18]], 0.45, SOURD, r)
	var n := s.size()
	var ph := r.randf() * TAU
	for i in n:
		var u := float(i) / n
		ph += TAU * lerpf(3.4, 2.6, u) / SOURD
		s[i] *= minf(1.0, u / 0.14) * minf(1.0, (1.0 - u) / 0.3) * (0.68 + 0.32 * sin(ph))
	O.normaliser(s, 0.9)
	return O.bords(s, SOURD)


# l'écho : une voix sans mots, un chuchotement qui change de voyelle, et un éclat froid qui chatoie au-dessus
static func _murmure(r: RandomNumberGenerator) -> PackedFloat32Array:
	var duree := 2.2
	var s := O.vide(duree, SOURD)
	var n := s.size()
	var e := O.vide(duree, SOURD)
	O.bruit(e, r)
	# trois formants qui glissent, par morceaux : « ou », « a », « é »
	var morceaux := 8
	var m := n / morceaux
	for p in morceaux:
		var u := float(p) / morceaux
		var f1 := lerpf(320.0, 760.0, sin(PI * u)) if u < 0.6 else lerpf(760.0, 430.0, (u - 0.6) / 0.4)
		var f2 := lerpf(850.0, 1350.0, u / 0.6) if u < 0.6 else lerpf(1350.0, 2100.0, (u - 0.6) / 0.4)
		var bout := e.slice(p * m, (p + 1) * m + 200)
		var a := bout.duplicate()
		var b := bout.duplicate()
		var c := bout.duplicate()
		O.bande(a, f1, 7.0, SOURD)
		O.bande(b, f2, 8.0, SOURD)
		O.bande(c, 2250.0, 8.0, SOURD)
		for j in bout.size():
			var k := p * m + j
			if k < n:
				var w := 1.0
				if j < 200:
					w = float(j) / 200.0
				elif j >= m:
					w = 1.0 - float(j - m) / 200.0
				s[k] += (a[j] + b[j] * 0.6 + c[j] * 0.25) * w
	# des syllabes qui hésitent
	var t := 0.0
	var syl := O.vide(duree, SOURD)
	while t < duree - 0.2:
		var l := r.randf_range(0.16, 0.34)
		var i0 := int(t * SOURD)
		var ln := int(l * SOURD)
		for j in ln:
			if i0 + j < n:
				syl[i0 + j] = pow(sin(PI * float(j) / ln), 1.5) * r.randf_range(0.97, 1.0)
		t += l + r.randf_range(0.02, 0.12)
	for i in n:
		s[i] *= syl[i] * sin(PI * float(i) / n)
	O.normaliser(s, 0.7)
	# l'éclat froid : deux aigus presque à l'unisson (ils battent lentement), et leur quinte, très bas
	var froid := O.vide(duree, SOURD)
	O.sinus(froid, [[1760.0, 0.06], [1766.5, 0.05]], SOURD, r)
	for i in n:
		var v := sin(PI * float(i) / n)
		s[i] += froid[i] * v * v
	O.normaliser(s, 0.85)
	return O.bords(s, SOURD)


# manger : trois bouchées qui craquent
static func _manger(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(0.6, VIF)
	var amp := [1.0, 0.8, 0.55]
	var t := [0.0, 0.18, 0.37]
	for i in 3:
		_grains(s, t[i] + 0.003, 0.045, r.randi_range(12, 20), r.randf_range(2200.0, 3400.0), 0.8, amp[i], VIF, r, Vector2(0.0004, 0.0015))
		O.mode(s, t[i], 120.0, 0.02, 0.35 * amp[i], VIF, 0.8)
	O.bas(s, 5000.0, VIF)
	O.normaliser(s, 0.85)
	return O.bords(s, VIF)


# un feu qui prend : un souffle qui s'ouvre, un « whoump » grave, les premiers crépitements
static func _allume(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(1.6, SOURD)
	var w := O.vide(1.6, SOURD)
	O.bruit(w, r)
	O.bande_glissee(w, 220.0, 1400.0, 1.2, SOURD)
	var n := w.size()
	for i in n:
		var t := float(i) / SOURD
		w[i] *= minf(1.0, t / 0.25) * exp(-maxf(0.0, t - 0.25) * 3.0)
	O.normaliser(w, 0.8)
	O.poser(s, w, 0, 1.0)
	O.mode(s, 0.03, 70.0, 0.12, 0.6, SOURD, 0.8)
	var c := O.vide(1.6, SOURD)
	for i in 6:
		O.eclat(c, r.randf_range(0.3, 1.3), 0.0005, r.randf_range(0.3, 0.8), r, SOURD)
	O.bande(c, 2300.0, 1.5, SOURD)
	O.poser(s, c, 0, 1.0)
	O.normaliser(s, 0.9)
	return O.bords(s, SOURD)


# le cœur : deux temps, « toum-tak » ; le premier plus grave et plus long (des harmoniques pour qu'on l'entende sur un téléphone)
static func _coeur() -> PackedFloat32Array:
	var s := O.vide(0.75, GRAVE)
	O.mode(s, 0.0, 60.0, 0.06, 1.0, GRAVE, 0.75)
	O.mode(s, 0.0, 122.0, 0.035, 0.45, GRAVE, 0.8)
	O.mode(s, 0.0, 245.0, 0.015, 0.16, GRAVE)
	O.mode(s, 0.28, 76.0, 0.04, 0.7, GRAVE, 0.8)
	O.mode(s, 0.28, 165.0, 0.025, 0.35, GRAVE)
	O.mode(s, 0.28, 330.0, 0.01, 0.1, GRAVE)
	O.bas(s, 900.0, GRAVE)
	O.normaliser(s, 0.92)
	return O.bords(s, GRAVE)


# la viande qui grésille
static func _gresille(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(1.6, VIF)
	var t := 0.0
	while t < 1.55:
		O.eclat(s, t, r.randf_range(0.0001, 0.0004), r.randf_range(0.1, 1.0), r, VIF)
		t += -log(maxf(r.randf(), 0.0001)) / 160.0
	O.bande(s, 4500.0, 0.8, VIF)
	var h := O.vide(1.6, VIF)
	O.bruit(h, r, 0.12)
	O.haut(h, 3000.0, VIF)
	O.poser(s, h, 0, 1.0)
	O.enveloppe(s, 0.1, 0.6, VIF)
	O.normaliser(s, 0.7)
	return O.bords(s, VIF)


# un feu qui s'éteint : un « pschh », deux derniers crépitements, un souffle qui tombe
static func _eteint(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(1.4, SOURD)
	var h := O.vide(1.4, SOURD)
	O.bruit(h, r)
	O.bande(h, 2200.0, 0.8, SOURD)
	for i in h.size():
		var t := float(i) / SOURD
		h[i] *= minf(1.0, t / 0.05) * exp(-t * 2.0)
	O.normaliser(h, 0.7)
	O.poser(s, h, 0, 1.0)
	var c := O.vide(1.4, SOURD)
	O.eclat(c, 0.35, 0.0005, 0.6, r, SOURD)
	O.eclat(c, 0.8, 0.0005, 0.4, r, SOURD)
	O.bande(c, 2300.0, 1.5, SOURD)
	O.poser(s, c, 0, 1.0)
	var b := O.vide(1.4, SOURD)
	O.bruit(b, r)
	O.bas(b, 300.0, SOURD)
	O.enveloppe(b, 0.1, 1.0, SOURD)
	O.normaliser(b, 0.3)
	O.poser(s, b, 0, 1.0)
	O.normaliser(s, 0.6)
	return O.bords(s, SOURD)


# la veilleuse tombe : le corps qui heurte le sol, et un grave immense qui s'éteint (un tam-tam très bas)
static func _chute(r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(2.6, GRAVE)
	O.mode(s, 0.0, 70.0, 0.1, 1.0, GRAVE, 0.6)
	var c := O.vide(2.6, GRAVE)
	O.eclat(c, 0.0, 0.01, 0.4, r, GRAVE)
	O.bas(c, 400.0, GRAVE)
	O.poser(s, c, 0, 1.0)
	var f := 49.0
	O.mode(s, 0.02, f, 1.1, 0.7, GRAVE, 0.85)
	O.mode(s, 0.02, f * 2.32, 0.7, 0.35, GRAVE, 0.9)
	O.mode(s, 0.02, f * 3.87, 0.4, 0.2, GRAVE)
	O.mode(s, 0.02, f * 5.1, 0.25, 0.1, GRAVE)
	var b := O.vide(2.2, GRAVE)
	O.bruit(b, r)
	O.bas(b, 300.0, GRAVE)
	O.enveloppe(b, 0.4, 1.6, GRAVE)
	O.normaliser(b, 0.12)
	O.poser(s, b, int(0.1 * GRAVE), 1.0)
	O.normaliser(s, 0.92)
	return O.bords(s, GRAVE)


# --- la musique ---

# une note de nappe, sur un la grave (220 Hz) : le jour, un triangle adouci, un peu chorusé ; la nuit, un sinus creux, avec son octave basse
static func _nappe(nuit: bool) -> PackedFloat32Array:
	var s: PackedFloat32Array
	if nuit:
		s = _note(8.0, 110.0, [[2.0, 1.0], [1.0, 0.22], [6.0, 0.05]], [2.0054, 0.5], 3.0, 3.5, 0.002, GRAVE)
		var n := s.size()
		for i in n:
			s[i] *= 0.78 + 0.22 * sin(TAU * 0.23 * i / GRAVE)
		O.bas(s, 1100.0, GRAVE)
	else:
		s = _note(7.0, 220.0, [[1.0, 1.0], [2.0, 0.18], [3.0, 0.11], [5.0, 0.04]], [1.0032, 0.6], 2.2, 3.0, 0.002, GRAVE)
		O.bas(s, 1800.0, GRAVE)
	O.normaliser(s, 0.8)
	return O.bords(s, GRAVE)


# une cloche de verre, sur un la (440 Hz) : pour l'aube, et quelques notes claires
static func _cloche() -> PackedFloat32Array:
	var s := O.vide(3.5, SOURD)
	O.mode(s, 0.0, 440.0, 1.4, 1.0, SOURD)
	O.mode(s, 0.0, 440.0 * 2.01, 0.8, 0.25, SOURD)
	O.mode(s, 0.0, 440.0 * 3.0, 0.5, 0.1, SOURD)
	O.mode(s, 0.0, 440.0 * 4.2, 0.25, 0.06, SOURD)
	O.enveloppe(s, 0.006, 0.3, SOURD)
	O.bas(s, 4000.0, SOURD)
	O.normaliser(s, 0.8)
	return O.bords(s, SOURD)


# une flûte douce, sur un la (440 Hz) : le thème de l'écran-titre (une note brève, une note tenue)
static func _flute(r: RandomNumberGenerator, duree: float) -> PackedFloat32Array:
	var chute := minf(0.6, duree * 0.45)
	var s := _note(duree, 440.0, [[1.0, 1.0], [2.0, 0.12], [3.0, 0.05]], [], 0.08, chute, 0.005, SOURD)
	var b := O.vide(duree, SOURD)
	O.bruit(b, r)
	O.bande(b, 880.0, 3.0, SOURD)
	O.enveloppe(b, 0.05, chute, SOURD)
	O.normaliser(b, 0.06)
	O.poser(s, b, 0, 1.0)
	O.normaliser(s, 0.8)
	return O.bords(s, SOURD)


# la tombée de la nuit : une corne lointaine, sur un sol grave, et un souffle grave sous elle
static func _corne(r: RandomNumberGenerator) -> PackedFloat32Array:
	var duree := 5.0
	var s := O.vide(duree, GRAVE)
	var n := s.size()
	# (des harmoniques en 1/k, relevées autour de 480 Hz : la bouche de la corne)
	var harm := []
	for k in range(1, 13):
		if 98.0 * k < GRAVE * 0.45:
			harm.append([float(k), (1.0 / k) * (0.25 + exp(-pow((98.0 * k - 480.0) / 330.0, 2.0)))])
	var tab := O.table(harm)
	var ph := 0.0
	for i in n:
		var t := float(i) / GRAVE
		var f := 98.0 * (0.94 + 0.06 * minf(1.0, t / 0.35)) * (1.0 + 0.003 * sin(TAU * 4.6 * t) * clampf(t - 1.0, 0.0, 1.0))
		ph += f / GRAVE
		if ph >= 1.0:
			ph -= 1.0
		var x := ph * O.TABLE
		var k2 := int(x)
		s[i] = tab[k2] + (tab[k2 + 1] - tab[k2]) * (x - k2)
	O.enveloppe(s, 0.6, 1.6, GRAVE)
	O.normaliser(s, 0.7)
	var b := O.vide(duree, GRAVE)
	O.bruit(b, r)
	O.bas(b, 200.0, GRAVE)
	O.bas(b, 260.0, GRAVE)
	O.enveloppe(b, 2.0, 2.5, GRAVE)
	O.normaliser(b, 0.4)
	O.poser(s, b, 0, 1.0)
	O.bas(s, 1600.0, GRAVE)
	O.normaliser(s, 0.85)
	return O.bords(s, GRAVE)


# une queue de réverbère toute faite (dans un navigateur, les bus n'ont pas d'effets) : un bruit qui s'éteint, coloré
static func _queue(genre: String, r: RandomNumberGenerator) -> PackedFloat32Array:
	var s := O.vide(1.9, SOURD)
	O.bruit(s, r)
	match genre:
		"sourde":
			O.bas(s, 700.0, SOURD)
			O.bas(s, 1400.0, SOURD)
		"claire":
			O.bande(s, 2100.0, 0.8, SOURD)
		_:
			var b := s.duplicate()
			O.bande(s, 650.0, 1.2, SOURD)
			O.bande(b, 1500.0, 1.5, SOURD)
			O.poser(s, b, 0, 0.5)
	var n := s.size()
	for i in n:
		var t := float(i) / SOURD - 0.03
		s[i] *= 0.0 if t < 0.0 else minf(1.0, t / 0.03) * exp(-t / 0.42)
	O.normaliser(s, 0.8)
	return O.bords(s, SOURD)
