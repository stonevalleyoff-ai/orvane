extends RefCounted
# Lisière — les outils du son (scripts/sons_outils.gd)
# De quoi fabriquer un son échantillon par échantillon : du bruit, des filtres, des résonances, des enveloppes, un réverbère, et
# le passage en AudioStreamWAV. Les recettes (sons_recettes.gd) s'en servent. Tout travaille en place, sur des
# PackedFloat32Array (passés par référence).

const GRAVE := 4000      # les très graves : le corps du vent, le souffle du feu, le bourdon, le cœur, les nappes, la corne
const SOURD := 8000      # les sons sombres : le vent dans les feuilles, les voix des bêtes, les notes
const LENT := 11025      # le chœur des grillons, au loin
const VIF := 22050       # les sons clairs : les braises, les grillons proches, les oiseaux, les pas, la pierre


static func vide(duree: float, taux: int) -> PackedFloat32Array:
	var s := PackedFloat32Array()
	s.resize(maxi(1, int(duree * taux)))
	return s


# du bruit blanc, ajouté (gain) entre deux instants
static func bruit(s: PackedFloat32Array, r: RandomNumberGenerator, gain: float = 1.0) -> PackedFloat32Array:
	for i in s.size():
		s[i] += r.randf_range(-gain, gain)
	return s


# un passe-bas à un pôle (6 dB par octave)
static func bas(s: PackedFloat32Array, fc: float, taux: int) -> PackedFloat32Array:
	var a := 1.0 - exp(-TAU * fc / taux)
	var y := 0.0
	for i in s.size():
		y += a * (s[i] - y)
		s[i] = y
	return s


# un passe-haut à un pôle
static func haut(s: PackedFloat32Array, fc: float, taux: int) -> PackedFloat32Array:
	var a := 1.0 - exp(-TAU * fc / taux)
	var y := 0.0
	for i in s.size():
		y += a * (s[i] - y)
		s[i] -= y
	return s


# un passe-bande résonant (biquad, gain 1 à la fréquence centrale)
static func bande(s: PackedFloat32Array, fc: float, q: float, taux: int) -> PackedFloat32Array:
	var w := TAU * minf(fc, taux * 0.45) / taux
	var al := sin(w) / (2.0 * q)
	var a0 := 1.0 + al
	var b0 := al / a0
	var a1 := -2.0 * cos(w) / a0
	var a2 := (1.0 - al) / a0
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	for i in s.size():
		var x := s[i]
		var y := b0 * (x - x2) - a1 * y1 - a2 * y2
		x2 = x1
		x1 = x
		y2 = y1
		y1 = y
		s[i] = y
	return s


# un passe-bande dont la fréquence glisse de f0 à f1 (recalculé par blocs de 64 échantillons)
static func bande_glissee(s: PackedFloat32Array, f0: float, f1: float, q: float, taux: int) -> PackedFloat32Array:
	var n := s.size()
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	var b0 := 0.0
	var a1 := 0.0
	var a2 := 0.0
	for i in n:
		if i % 64 == 0:
			var fc := f0 * pow(f1 / f0, float(i) / n)
			var w := TAU * minf(fc, taux * 0.45) / taux
			var al := sin(w) / (2.0 * q)
			var a0 := 1.0 + al
			b0 = al / a0
			a1 = -2.0 * cos(w) / a0
			a2 = (1.0 - al) / a0
		var x := s[i]
		var y := b0 * (x - x2) - a1 * y1 - a2 * y2
		x2 = x1
		x1 = x
		y2 = y1
		y1 = y
		s[i] = y
	return s


# une résonance amortie (un mode : une fréquence, un temps de décroissance), ajoutée à partir de « debut » (en secondes)
static func mode(s: PackedFloat32Array, debut: float, f: float, tau: float, amp: float, taux: int, glisse: float = 1.0) -> PackedFloat32Array:
	var i0 := int(debut * taux)
	var n := mini(s.size() - i0, int(tau * 7.0 * taux))
	var k := exp(-1.0 / (tau * taux))
	var env := amp
	var ph := 0.0
	var w := TAU * f / taux
	# (la fréquence glisse vers f × glisse, au rythme de la décroissance)
	var g := pow(glisse, 1.0 / maxf(1.0, tau * taux))
	for j in n:
		s[i0 + j] += sin(ph) * env
		ph += w
		w *= g
		env *= k
	return s


# un éclat de bruit qui décroît (un choc, un claquement), ajouté à partir de « debut »
static func eclat(s: PackedFloat32Array, debut: float, tau: float, amp: float, r: RandomNumberGenerator, taux: int) -> PackedFloat32Array:
	var i0 := int(debut * taux)
	var n := mini(s.size() - i0, int(tau * 7.0 * taux) + 1)
	var k := exp(-1.0 / maxf(1.0, tau * taux))
	var env := amp
	for j in n:
		s[i0 + j] += r.randf_range(-env, env)
		env *= k
	return s


# une table d'onde : un cycle fait de partiels harmoniques [rang, gain], avec un échantillon de garde au bout (lue par
# interpolation, elle coûte un sinus quel que soit le nombre de partiels)
const TABLE := 1024


static func table(partiels: Array) -> PackedFloat32Array:
	var t := PackedFloat32Array()
	t.resize(TABLE + 1)
	for p in partiels:
		var w: float = TAU * p[0] / TABLE
		for i in TABLE:
			t[i] += sin(w * i) * p[1]
	t[TABLE] = t[0]
	return t


# des sinus tenus [fréquence, gain], ajoutés, quatre par passe (une seule écriture par échantillon) ; phases au hasard
static func sinus(s: PackedFloat32Array, tons: Array, taux: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var n := s.size()
	var j := 0
	while j < tons.size():
		var w := PackedFloat32Array([0.0, 0.0, 0.0, 0.0])
		var a := PackedFloat32Array([0.0, 0.0, 0.0, 0.0])
		for q in 4:
			if j + q < tons.size():
				w[q] = TAU * tons[j + q][0] / taux
				a[q] = tons[j + q][1]
		var w0 := w[0]
		var w1 := w[1]
		var w2 := w[2]
		var w3 := w[3]
		var a0 := a[0]
		var a1 := a[1]
		var a2 := a[2]
		var a3 := a[3]
		var p0 := r.randf() * TAU
		var p1 := r.randf() * TAU
		var p2 := r.randf() * TAU
		var p3 := r.randf() * TAU
		for i in n:
			p0 += w0
			p1 += w1
			p2 += w2
			p3 += w3
			s[i] += sin(p0) * a0 + sin(p1) * a1 + sin(p2) * a2 + sin(p3) * a3
		j += 4
	return s


# du bruit passé dans un passe-bande résonant, ajouté (gain), en une seule boucle
static func bruit_bande(s: PackedFloat32Array, fc: float, q: float, g: float, taux: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var w := TAU * minf(fc, taux * 0.45) / taux
	var al := sin(w) / (2.0 * q)
	var a0 := 1.0 + al
	var b0 := al / a0
	var a1 := -2.0 * cos(w) / a0
	var a2 := (1.0 - al) / a0
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	for i in s.size():
		var x := r.randf_range(-1.0, 1.0)
		var y := b0 * (x - x2) - a1 * y1 - a2 * y2
		x2 = x1
		x1 = x
		y2 = y1
		y1 = y
		s[i] += y * g
	return s


# du bruit passé dans deux passe-bas à un pôle (un bruit brun, sourd), ajouté, en une seule boucle
static func bruit_bas(s: PackedFloat32Array, f1: float, f2: float, g: float, taux: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var k1 := 1.0 - exp(-TAU * f1 / taux)
	var k2 := 1.0 - exp(-TAU * f2 / taux)
	var y1 := 0.0
	var y2 := 0.0
	for i in s.size():
		y1 += k1 * (r.randf_range(-1.0, 1.0) - y1)
		y2 += k2 * (y1 - y2)
		s[i] += y2 * g
	return s


# un bruit lent, de -1 à 1 (des turbulences, des vacillements) : tiré sur une grille grossière, puis interpolé
static func lent(n: int, fc: float, taux: int, r: RandomNumberGenerator) -> PackedFloat32Array:
	var pas := 32
	var c := PackedFloat32Array()
	c.resize(n / pas + 2)
	bruit(c, r)
	var tc := maxi(2, taux / pas)
	bas(c, fc, tc)
	bas(c, fc, tc)
	normaliser(c, 1.0)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var k := i / pas
		s[i] = c[k] + (c[k + 1] - c[k]) * (float(i % pas) / pas)
	return s


# ajoute src dans dest à partir de l'échantillon i0 (en bouclant si « tour » : pour les boucles)
static func poser(dest: PackedFloat32Array, src: PackedFloat32Array, i0: int, gain: float, tour: bool = false) -> void:
	var n := dest.size()
	for j in src.size():
		var k := i0 + j
		if k >= n:
			if not tour:
				return
			k %= n
		if k >= 0:
			dest[k] += src[j] * gain


static func gain(s: PackedFloat32Array, g: float) -> PackedFloat32Array:
	for i in s.size():
		s[i] *= g
	return s


static func crete(s: PackedFloat32Array) -> float:
	var m := 0.0
	for i in s.size():
		m = maxf(m, absf(s[i]))
	return m


# ramène la crête à c
static func normaliser(s: PackedFloat32Array, c: float = 0.89) -> PackedFloat32Array:
	var m := crete(s)
	if m > 0.0:
		gain(s, c / m)
	return s


# ramène le niveau moyen (RMS) à v, sans dépasser la crête c
static func niveau(s: PackedFloat32Array, v: float, c: float = 0.95) -> PackedFloat32Array:
	var e := 0.0
	for i in s.size():
		e += s[i] * s[i]
	var rms := sqrt(e / maxf(1.0, s.size()))
	if rms > 0.0:
		gain(s, v / rms)
	var m := crete(s)
	if m > c:
		gain(s, c / m)
	return s


# une enveloppe en trois temps : montée, tenue, chute (en secondes) ; la forme des pentes est douce (un quart de sinus)
static func enveloppe(s: PackedFloat32Array, montee: float, chute: float, taux: int) -> PackedFloat32Array:
	var n := s.size()
	var m := maxi(1, int(montee * taux))
	var c := maxi(1, int(chute * taux))
	for i in mini(m, n):
		s[i] *= sin(PI * 0.5 * float(i) / m)
	for j in mini(c, n):
		s[n - 1 - j] *= sin(PI * 0.5 * float(j) / c)
	return s


# un fondu très bref au début, plus long à la fin (60 ms au plus) : pas de clic au départ, ni de queue coupée net
static func bords(s: PackedFloat32Array, taux: int) -> PackedFloat32Array:
	var n := s.size()
	var f := mini(int(0.0015 * taux), n / 8)
	for i in f:
		s[i] *= float(i) / f
	var g := mini(int(0.06 * taux), n / 4)
	for j in g:
		s[n - 1 - j] *= sin(PI * 0.5 * float(j) / g)
	return s


# une tuile : un fondu en puissance constante à chaque bout (f secondes) ; deux tuiles qui se chevauchent de f se fondent sans
# creux (sons.gd les enchaîne : les boucles du navigateur, elles, laissent un trou à chaque tour)
static func tuile(s: PackedFloat32Array, f: float, taux: int) -> PackedFloat32Array:
	var n := s.size()
	var m := mini(int(f * taux), n / 2)
	for i in m:
		var k := sin(PI * 0.5 * float(i) / m)
		s[i] *= k
		s[n - 1 - i] *= k
	return s


# moitié moins d'échantillons (moyenne de deux voisins) : pour les réverbères, qui n'ont pas besoin d'aigus
static func reduire(s: PackedFloat32Array) -> PackedFloat32Array:
	var o := PackedFloat32Array()
	o.resize(s.size() / 2)
	for i in o.size():
		o[i] = (s[2 * i] + s[2 * i + 1]) * 0.5
	return o


static func vers_wav(s: PackedFloat32Array, taux: int) -> AudioStreamWAV:
	var o := PackedByteArray()
	o.resize(s.size() * 2)
	for i in s.size():
		o.encode_s16(i * 2, int(clampf(s[i], -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = taux
	w.stereo = false
	w.data = o
	return w


# un réverbère (quatre peignes amortis en parallèle, deux passe-tout en série, des échos de lisière), fait par morceaux :
# avancer(n) traite n échantillons ; fini quand la queue s'est éteinte. La sortie ne contient que le son réverbéré.
class Reverbe:
	var source: PackedFloat32Array
	var sortie: PackedFloat32Array
	var taux := 11025
	var _i := 0
	var c0 := PackedFloat32Array()
	var c1 := PackedFloat32Array()
	var c2 := PackedFloat32Array()
	var c3 := PackedFloat32Array()
	var a0 := PackedFloat32Array()
	var a1 := PackedFloat32Array()
	var _p := PackedInt32Array([0, 0, 0, 0, 0, 0])
	var _f := PackedFloat32Array([0.0, 0.0, 0.0, 0.0])
	var _g := PackedFloat32Array([0.0, 0.0, 0.0, 0.0])
	var _e := PackedInt32Array()
	var _eg := PackedFloat32Array()

	func _init(s: PackedFloat32Array, t: int, duree: float = 1.6, echos: float = 0.3) -> void:
		source = s
		taux = t
		sortie = PackedFloat32Array()
		sortie.resize(s.size() + int((duree + 0.25) * t))
		var k := float(t) / 11025.0
		c0.resize(int(337 * k))
		c1.resize(int(389 * k))
		c2.resize(int(433 * k))
		c3.resize(int(487 * k))
		var tailles := [c0.size(), c1.size(), c2.size(), c3.size()]
		for c in 4:
			# (le gain qui fait perdre 60 dB en « duree » secondes)
			_g[c] = pow(10.0, -3.0 * tailles[c] / (duree * t))
		a0.resize(int(113 * k))
		a1.resize(int(37 * k))
		# les échos de la lisière : quelques retours nets, plus loin, plus sourds
		if echos > 0.0:
			_e = PackedInt32Array([int(0.071 * t), int(0.123 * t), int(0.197 * t)])
			_eg = PackedFloat32Array([echos, echos * 0.7, echos * 0.45])

	func fini() -> bool:
		return _i >= sortie.size()

	func avancer(n: int) -> bool:
		var fin := mini(sortie.size(), _i + n)
		var ns := source.size()
		var p0 := _p[0]
		var p1 := _p[1]
		var p2 := _p[2]
		var p3 := _p[3]
		var q0 := _p[4]
		var q1 := _p[5]
		var f0 := _f[0]
		var f1 := _f[1]
		var f2 := _f[2]
		var f3 := _f[3]
		var g0 := _g[0]
		var g1 := _g[1]
		var g2 := _g[2]
		var g3 := _g[3]
		var n0 := c0.size()
		var n1 := c1.size()
		var n2 := c2.size()
		var n3 := c3.size()
		var m0 := a0.size()
		var m1 := a1.size()
		var ne := _e.size()
		const AM := 0.35
		while _i < fin:
			var x := source[_i] if _i < ns else 0.0
			var v0 := c0[p0]
			var v1 := c1[p1]
			var v2 := c2[p2]
			var v3 := c3[p3]
			f0 = v0 * (1.0 - AM) + f0 * AM
			f1 = v1 * (1.0 - AM) + f1 * AM
			f2 = v2 * (1.0 - AM) + f2 * AM
			f3 = v3 * (1.0 - AM) + f3 * AM
			c0[p0] = x + f0 * g0
			c1[p1] = x + f1 * g1
			c2[p2] = x + f2 * g2
			c3[p3] = x + f3 * g3
			p0 = (p0 + 1) % n0
			p1 = (p1 + 1) % n1
			p2 = (p2 + 1) % n2
			p3 = (p3 + 1) % n3
			var y := (v0 + v1 + v2 + v3) * 0.25
			var b := a0[q0]
			var u := y + b * 0.5
			a0[q0] = u
			y = b - u * 0.5
			q0 = (q0 + 1) % m0
			b = a1[q1]
			u = y + b * 0.5
			a1[q1] = u
			y = b - u * 0.5
			q1 = (q1 + 1) % m1
			for e in ne:
				var j := _i - _e[e]
				if j >= 0 and j < ns:
					y += source[j] * _eg[e]
			sortie[_i] = y
			_i += 1
		_p = PackedInt32Array([p0, p1, p2, p3, q0, q1])
		_f = PackedFloat32Array([f0, f1, f2, f3])
		return fini()
