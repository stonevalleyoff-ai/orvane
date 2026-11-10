extends RefCounted
# Lisière — le décor (scripts/decor.gd)
# Ce qu'on ne ramasse pas et qui fait un lieu vivant, selon son biome : l'herbe (des milliers de touffes), les fougères, les
# roseaux, les fleurs (en MultiMesh, qui plient au vent du lieu : shaders/vegetation_herbe.gdshader) ; et ce qui est posé, dessiné
# une fois par grandes cases : cailloux, champignons, bois mort, flaques, bruyère, congères. Puis la lisière du monde : au-delà du
# carré jouable, une forêt noire en plusieurs rangs de silhouettes, qui ferme le lieu sans faire un mur.
# Le sol (shaders/sol_peint.gdshader) et le décor lisent les mêmes grandes plaques (terrain) : l'herbe pousse où le sol est
# herbeux, la neige n'a pas de fleurs, les roseaux bordent les flaques. monde.gd appelle tout ceci (creer_sol, generer).

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const Pinceau := preload("res://scripts/decor_pinceau.gd")
const Objet := preload("res://scripts/objet.gd")
const SHADER_HERBE := preload("res://shaders/vegetation_herbe.gdshader")
const CASE := 300.0
const ETENDUE := 5400.0
const TEX := 256
const ENCRE := Color(0.086, 0.075, 0.059, 0.9)


# --- le terrain : trois bruits lents, cuits une fois (le sol et le décor les lisent), et deux motifs fins sans couture ---

static func terrain(graine: int) -> Dictionary:
	var t := {}
	var reglages := [["plaques", 0.023, 4], ["taches", 0.07, 3], ["voiles", 0.042, 3]]
	for k in reglages.size():
		var b := FastNoiseLite.new()
		b.seed = graine + 101 * (k + 1)
		b.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
		b.frequency = reglages[k][1]
		b.fractal_octaves = reglages[k][2]
		t[reglages[k][0]] = b.get_image(TEX, TEX, false, false, true)
	for k in 2:
		var b := FastNoiseLite.new()
		b.seed = graine + 7 + k * 13
		b.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
		b.frequency = 0.045 if k == 0 else 0.06
		b.fractal_octaves = 2
		t["motif_a" if k == 0 else "motif_b"] = b.get_seamless_image(128, 128, false, false, 0.1, true)
	return t


static func lire(img: Image, p: Vector2) -> float:
	var u := clampi(int((p.x / ETENDUE + 0.5) * TEX), 0, TEX - 1)
	var v := clampi(int((p.y / ETENDUE + 0.5) * TEX), 0, TEX - 1)
	return img.get_pixel(u, v).r


# la part de chaque matière dans le sol du lieu (de 0 à 1), d'après ses axes ; le shader du sol reçoit les mêmes
static func parts(axes: Dictionary) -> Dictionary:
	var temp := float(axes.get("temperature", 0.5))
	var humid := float(axes.get("humidite", 0.5))
	var couvert := float(axes.get("couvert", 0.4))
	var alt := float(axes.get("altitude", 0.3))
	var froid := clampf((0.35 - temp) * 4.0, 0.0, 1.0)
	var sec := clampf((0.42 - humid) * 3.0, 0.0, 1.0)
	var chaud := clampf((temp - 0.72) * 3.0, 0.0, 1.0)
	return {
		"mousse": clampf(humid * 0.8 + couvert * 0.3 - 0.35 - sec * 0.4 - froid * 0.2, 0.03, 0.75),
		"herbe": clampf((1.0 - couvert) * 0.7 + humid * 0.3 - 0.15 - froid * 0.45 - chaud * sec * 0.6, 0.0, 0.85),
		"litiere": clampf(couvert * 0.75 - froid * 0.2 - sec * 0.2, 0.0, 0.8),
		"cailloux": clampf(0.06 + alt * 0.35 + sec * 0.15, 0.04, 0.5),
		"neige": clampf(froid * 1.15 + maxf(0.0, alt - 0.75) * 1.2, 0.0, 0.9),
		"boue": clampf((humid - 0.72) * 3.2, 0.0, 0.75),
		"fentes": sec * clampf((temp - 0.3) * 2.0, 0.0, 1.0),
		"froid": froid, "sec": sec, "humide": humid, "couvert": couvert, "chaud": chaud,
		"lande": clampf(1.0 - absf(humid - 0.3) * 5.0, 0.0, 1.0) * clampf(1.0 - absf(couvert - 0.3) * 4.0, 0.0, 1.0) * (1.0 - froid) * (1.0 - chaud),
	}


# ce qu'il y a au sol en p, comme le shader du sol le peint (sans ses détails fins) : de 0 à 1
static func sol_ici(t: Dictionary, s: Dictionary, p: Vector2) -> Dictionary:
	var a := lire(t["plaques"], p)
	var b := lire(t["taches"], p)
	var c := lire(t["voiles"], p)
	var r0 := (p * Vector2(1.0, 1.25)).length()
	var use := 1.0 - smoothstep(250.0 * 0.8 - 30.0, 250.0 * 0.8 + 30.0, r0)
	return {
		"herbe": smoothstep(-0.06, 0.06, b * 0.5 + a * 0.25 + 0.125 - (1.0 - float(s["herbe"]) * 0.95 - 0.05)) * (1.0 - use * 0.85),
		"mousse": smoothstep(-0.04, 0.04, b * 0.45 + 0.225 - (1.0 - float(s["mousse"]) * 0.9 - 0.1)) * (1.0 - use),
		"neige": smoothstep(-0.03, 0.03, c * 0.55 + a * 0.25 + 0.1 - (1.0 - float(s["neige"]) * 0.9)),
		"boue": smoothstep(-0.04, 0.04, 1.0 - a * 0.7 - 0.15 - (1.0 - float(s["boue"]) * 0.7)),
		"litiere": clampf((c * 0.55 + a * 0.2 + 0.125 - (1.0 - float(s["litiere"]) * 0.9 - 0.1)) * 3.0, 0.0, 1.0) * (1.0 - use),
		"use": use, "a": a,
	}


# --- les maillages : une touffe d'herbe, une fougère, des roseaux, des fleurs (le pied à l'origine) ---

# ce que le pinceau a peint devient un maillage : UV.y la hauteur (ou la distance au pied, pour une fougère), UV.x 1 pour un pétale
static func _maillage(p, a_plat := false, assombrir := 0.0) -> ArrayMesh:
	var uvs := PackedVector2Array()
	var cols: PackedColorArray = p.cols.duplicate()
	var hmax := 1.0
	for q in p.pts:
		hmax = maxf(hmax, q.length() if a_plat else -q.y)
	for i in p.pts.size():
		var q: Vector2 = p.pts[i]
		var h := maxf(0.0, q.length() * 0.75 if a_plat else -q.y)
		var c: Color = cols[i]
		var petale := c.r == 1.0 and c.g == 1.0 and c.b == 1.0
		uvs.append(Vector2(1.0 if petale else 0.0, h / 10.0))
		if assombrir > 0.0 and not petale:
			var k := lerpf(1.0 - assombrir, 1.0, clampf(h / hmax, 0.0, 1.0))
			cols[i] = Color(c.r * k, c.g * k, c.b * k, c.a)
	var a := []
	a.resize(Mesh.ARRAY_MAX)
	a[Mesh.ARRAY_VERTEX] = p.pts.duplicate()
	a[Mesh.ARRAY_COLOR] = cols
	a[Mesh.ARRAY_TEX_UV] = uvs
	a[Mesh.ARRAY_INDEX] = p.idx.duplicate()
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
	p.vider()
	return m


static func maillage_herbe(r: RandomNumberGenerator, c: Color, n: int, hauteur: float, ecart: float):
	var p := Pinceau.new()
	var lames := []
	for i in n:
		var x0 := (i - (n - 1) * 0.5) * ecart + r.randf_range(-0.5, 0.5)
		var h := hauteur * r.randf_range(0.6, 1.0) * (1.0 - absf(i - (n - 1) * 0.5) / n * 0.5)
		var penche := x0 * 0.2 + r.randf_range(-0.18, 0.18)
		lames.append([x0, h, penche, r.randf()])
	lames.sort_custom(func(a, b): return a[3] < b[3])
	for i in lames.size():
		var l: Array = lames[i]
		var x0: float = l[0]
		var h: float = l[1]
		var pe: float = l[2]
		var ton := lerpf(0.72, 1.06, float(i) / maxf(1.0, lames.size() - 1))
		var cl := Color(c.r * ton, c.g * ton, c.b * ton)
		# (une lame : trois triangles, du pied large à la pointe)
		var m := Vector2(x0 + pe * h * 0.3, -h * 0.55)
		p.aplat(PackedVector2Array([Vector2(x0 - 0.85, 0.5), Vector2(x0 + 0.85, 0.5), m + Vector2(0.55, 0), Vector2(x0 + pe * h, -h), m - Vector2(0.55, 0)]), cl)
	return _maillage(p, false, 0.45)


static func maillage_fougere(r: RandomNumberGenerator, c: Color):
	var p := Pinceau.new()
	var frondes := []
	var n := r.randi_range(6, 8)
	for i in n:
		var a := lerpf(-PI + 0.35, -0.35, float(i) / (n - 1)) + r.randf_range(-0.12, 0.12)
		frondes.append([a, r.randf_range(15.0, 21.0)])
	frondes.append([r.randf_range(0.25, 0.5), r.randf_range(10.0, 13.0)])
	frondes.append([PI - r.randf_range(0.25, 0.5), r.randf_range(10.0, 13.0)])
	# (celles du fond d'abord, puis celles qui viennent vers nous)
	frondes.sort_custom(func(a, b): return sin(a[0]) < sin(b[0]))
	var m := 9
	for f in frondes:
		var a: float = f[0]
		var l: float = f[1]
		var d := Vector2(cos(a), sin(a) * 0.62)
		var axe := PackedVector2Array()
		for k in m + 1:
			var t := float(k) / m
			axe.append(Vector2(0, -2.5) + d * l * t + Vector2(0, -3.5 * sin(t * PI * 0.85)) + Vector2(0, t * t * 2.0))
		# (la fronde, large au milieu, dentée de folioles, pointue au bout ; d'abord son ombre d'encre, un peu plus large)
		for passe in 2:
			var e := 0.55 if passe == 0 else 0.0
			var gauche := PackedVector2Array()
			var droite := PackedVector2Array()
			for k in m + 1:
				var t := float(k) / m
				var tan_ := (axe[mini(k + 1, m)] - axe[maxi(k - 1, 0)]).normalized()
				var nrm := tan_.orthogonal()
				var w := 4.4 * sin(PI * minf(1.0, t * 1.2 + 0.08)) * (1.0 - t * 0.7) * (1.0 if k % 2 == 0 else 0.6) + e
				var avance := tan_ * (1.1 if k % 2 == 0 else 0.0)
				gauche.append(axe[k] + nrm * w + avance)
				droite.append(axe[k] - nrm * w + avance)
			if passe == 0:
				p.bande(gauche, droite, Color(ENCRE, 0.7))
			else:
				var face := c.lerp(c.lightened(0.2), clampf(-sin(a), 0.0, 1.0) * 0.6 + 0.2)
				p.bande(gauche, axe, face)
				p.bande(axe, droite, face.darkened(0.2))
				p.tracer(axe, 0.6, face.darkened(0.4), false, PackedFloat32Array(), false)
	return _maillage(p, true, 0.38)


static func maillage_roseaux(r: RandomNumberGenerator, tige: Color, epi: Color):
	var p := Pinceau.new()
	var penche := r.randf_range(0.03, 0.12) * (1.0 if r.randf() < 0.5 else -1.0)
	var tiges := []
	for i in r.randi_range(5, 7):
		tiges.append([r.randf_range(-4.5, 4.5), r.randf_range(18.0, 31.0), penche + r.randf_range(-0.06, 0.06)])
	# des feuilles longues, qui retombent
	for i in 3:
		var x0 := r.randf_range(-3.0, 3.0)
		var cote := -1.0 if i % 2 == 0 else 1.0
		var h := r.randf_range(12.0, 18.0)
		var ligne := PackedVector2Array([Vector2(x0, 0.5), Vector2(x0 + cote * 3.0, -h * 0.7), Vector2(x0 + cote * 8.0, -h * 0.75)])
		p.tracer(ligne, 2.4, ENCRE, false, PackedFloat32Array([2.4, 2.0, 0.6]), false)
		p.tracer(ligne, 1.6, tige.darkened(0.1), false, PackedFloat32Array([1.7, 1.3, 0.2]), false)
	for t in tiges:
		var x0: float = t[0]
		var h: float = t[1]
		var pe: float = t[2]
		var ligne := PackedVector2Array([Vector2(x0, 0.5), Vector2(x0 + pe * h * 0.4, -h * 0.5), Vector2(x0 + pe * h, -h)])
		p.tracer(ligne, 1.9, ENCRE, false, PackedFloat32Array(), false)
		p.tracer(ligne, 1.1, tige, false, PackedFloat32Array(), false)
	for i in 2:
		var t: Array = tiges[i]
		var h: float = t[1]
		var pe: float = t[2]
		var q := Vector2(t[0] + pe * h * 0.75, -h * 0.75)
		var d := Vector2(pe, -1.0).normalized()
		var forme := PackedVector2Array()
		for k in 10:
			var a := TAU * k / 10.0
			forme.append(q + d * sin(a) * 3.6 + d.orthogonal() * cos(a) * 1.7)
		p.aplat(forme, ENCRE)
		var coeur := PackedVector2Array()
		for k in 10:
			var a := TAU * k / 10.0
			coeur.append(q + d * sin(a) * 3.0 + d.orthogonal() * cos(a) * 1.15 + Vector2(-0.2, -0.2))
		p.aplat(coeur, epi)
	return _maillage(p, false, 0.35)


static func maillage_fleurs(r: RandomNumberGenerator, tige: Color, coeur: Color):
	var p := Pinceau.new()
	var n := r.randi_range(2, 4)
	var tetes := []
	for i in n:
		var x0 := r.randf_range(-5.0, 5.0)
		var h := r.randf_range(4.0, 9.0)
		var bout := Vector2(x0 + r.randf_range(-1.5, 1.5), -h)
		p.tracer(PackedVector2Array([Vector2(x0, 0.5), Vector2(x0, -h * 0.5), bout]), 0.9, tige.darkened(0.15), false, PackedFloat32Array(), false)
		p.aplat(PackedVector2Array([Vector2(x0, -1), Vector2(x0 + 2.6, -2.6), Vector2(x0 + 0.4, -0.6)]), tige)
		tetes.append(bout)
	for t in tetes:
		p.aplat(Pinceau.ellipse(t, 2.5, 2.1, 12), ENCRE)
		for k in 5:
			var a := TAU * k / 5.0 + 0.3
			p.aplat(Pinceau.ellipse(t + Vector2(cos(a) * 1.15, sin(a) * 0.95), 1.15, 1.0, 8), Color(1, 1, 1))
		p.aplat(Pinceau.ellipse(t, 0.75, 0.65, 8), coeur)
	return _maillage(p, false, 0.0)


# --- semer : l'herbe et les plantes (MultiMesh, par case), puis ce qui est posé (un nœud par case) ---

static func semer(monde, racine: Node2D, t: Dictionary, s: Dictionary, pal: Dictionary, graine: int, mobile: bool) -> ShaderMaterial:
	var r := RandomNumberGenerator.new()
	r.seed = graine + 909
	var mat := ShaderMaterial.new()
	mat.shader = SHADER_HERBE
	var fleurs: Array = pal["fleurs"]
	mat.set_shader_parameter("petale_a", Vector3(fleurs[0].r, fleurs[0].g, fleurs[0].b))
	mat.set_shader_parameter("petale_b", Vector3(fleurs[1].r, fleurs[1].g, fleurs[1].b))
	mat.set_shader_parameter("petale_c", Vector3(fleurs[2].r, fleurs[2].g, fleurs[2].b))
	var k := 0.4 if mobile else 1.0
	var herbe: Color = pal["herbe"]
	var sec := float(s["sec"])
	var paille := herbe.lerp(P.IVOIRE.darkened(0.15), 0.35 + sec * 0.4)
	var modeles := {
		"herbe_courte": maillage_herbe(r, herbe, 5, 7.5, 1.4),
		"herbe_haute": maillage_herbe(r, herbe.lerp(paille, 0.3), 7, 12.5, 1.6),
		"herbe_seche": maillage_herbe(r, paille, 6, 10.0, 1.8),
		"fougere": maillage_fougere(r, pal["fougere"]),
		"roseaux": maillage_roseaux(r, pal["herbe"].lerp(P.MOUSSE, 0.3).darkened(0.1), P.TERRE.darkened(0.25)),
		"fleurs": maillage_fleurs(r, herbe.darkened(0.1), P.BRAISE_COEUR.darkened(0.08)),
	}
	# chaque case : ses instances, par modèle (position, échelle, retournement, teinte, couleur des pétales)
	var cases := {}
	var froid := float(s["froid"])
	var n_herbe := int((3000.0 + 26000.0 * float(s["herbe"]) + 4000.0 * float(s["mousse"])) * (1.0 - froid * 0.6) * (1.0 - float(s["chaud"]) * sec * 0.7) * k)
	var essais := n_herbe * 3
	var poses := 0
	while poses < n_herbe and essais > 0:
		essais -= 1
		var q := Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
		var ici := sol_ici(t, s, q)
		var envie := 0.08 + 0.92 * float(ici["herbe"]) + 0.25 * float(ici["mousse"])
		envie *= (1.0 - float(ici["neige"]) * 0.9) * (1.0 - float(ici["boue"]) * 0.6) * (1.0 - float(ici["use"]) * 0.8)
		if r.randf() > envie:
			continue
		# (une touffe en appelle d'autres : l'herbe pousse par plaques)
		for j in r.randi_range(1, 4):
			var qq := q + Vector2(r.randf_range(-11.0, 11.0), r.randf_range(-7.0, 7.0))
			var genre := "herbe_courte"
			var x := r.randf()
			if sec > 0.3 and x < sec * 0.7:
				genre = "herbe_seche"
			elif x < 0.25 + 0.4 * float(ici["herbe"]):
				genre = "herbe_haute"
			var teinte := Color.WHITE.darkened(r.randf_range(0.0, 0.22)).lerp(Color(1.08, 1.05, 0.8), float(ici["a"]) * 0.3 * r.randf())
			_instance(cases, genre, qq, r.randf_range(0.75, 1.25), teinte, r)
			poses += 1
	# les fougères : au pied des arbres, et dans la mousse, sous le couvert
	var n_f := int(1100.0 * float(s["couvert"]) * clampf(float(s["humide"]) * 1.4 - 0.3, 0.0, 1.0) * (1.0 - froid * 0.5) * k)
	var arbres: Array = monde.objets.filter(func(o): return o.genre == "arbre" or o.genre == "sapin")
	for i in n_f:
		var q: Vector2
		if not arbres.is_empty() and r.randf() < 0.55:
			var o = arbres[r.randi() % arbres.size()]
			q = o.position + Vector2.from_angle(r.randf() * TAU) * r.randf_range(18.0, 46.0) * Vector2(1.0, 0.7)
		else:
			q = Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
			var ici := sol_ici(t, s, q)
			if r.randf() > 0.25 + float(ici["mousse"]) * 0.75 or float(ici["neige"]) > 0.5:
				continue
		if q.length() < 190.0 or _gene(monde, q, 6.0):
			continue
		_instance(cases, "fougere", q, r.randf_range(0.8, 1.25), Color.WHITE.darkened(r.randf_range(0.0, 0.2)), r)
	# les roseaux, dans la boue ; les fleurs, dans l'herbe
	var n_ro := int(1400.0 * float(s["boue"]) * k)
	for i in n_ro * 3:
		if n_ro <= 0:
			break
		var q := Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
		if (float(sol_ici(t, s, q)["boue"]) < 0.5 and r.randf() > 0.2) or q.length() < 200.0:
			continue
		for j in r.randi_range(1, 3):
			_instance(cases, "roseaux", q + Vector2(r.randf_range(-10, 10), r.randf_range(-6, 6)), r.randf_range(0.8, 1.2), Color.WHITE.darkened(r.randf_range(0.0, 0.15)), r)
		n_ro -= 1
	var n_fl := int(1600.0 * float(s["herbe"]) * (1.0 - froid * 0.8) * (1.0 - sec * 0.5) * k + 120.0 * k)
	for i in n_fl * 2:
		if n_fl <= 0:
			break
		var q := Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
		var ici := sol_ici(t, s, q)
		if r.randf() > 0.15 + float(ici["herbe"]) * 0.85 or float(ici["neige"]) > 0.3 or q.length() < 150.0:
			continue
		# (des fleurs d'une même couleur, en colonie)
		var couleur := r.randf()
		for j in r.randi_range(2, 6):
			_instance(cases, "fleurs", q + Vector2(r.randf_range(-22, 22), r.randf_range(-14, 14)), r.randf_range(0.85, 1.15), Color.WHITE, r, couleur)
		n_fl -= 1
	# ce qui est posé à plat d'abord (flaques, cailloux, congères), puis l'herbe et les plantes, puis ce qui dépasse
	var poses_ := _poser(monde, t, s, graine, mobile)
	_calques(racine, poses_, ["flaque", "cailloux", "congere"], pal)
	# les MultiMesh, case par case (le moteur ne dessine que les cases à l'écran)
	for cle in cases:
		for genre in cases[cle]:
			var liste: Array = cases[cle][genre]
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_2D
			mm.use_colors = true
			mm.use_custom_data = true
			mm.mesh = modeles[genre]
			mm.instance_count = liste.size()
			for i in liste.size():
				var e: Array = liste[i]
				mm.set_instance_transform_2d(i, Transform2D(0.0, Vector2(e[1] * e[2], e[1]), 0.0, e[0]))
				mm.set_instance_color(i, e[3])
				mm.set_instance_custom_data(i, Color(e[0].x, e[0].y, e[4], e[5]))
			var mmi := MultiMeshInstance2D.new()
			mmi.multimesh = mm
			mmi.material = mat
			racine.add_child(mmi)
	_calques(racine, poses_, ["bois_mort", "bruyere", "champignons"], pal)
	return mat


static func _instance(cases: Dictionary, genre: String, q: Vector2, echelle: float, teinte: Color, r: RandomNumberGenerator, petale := 0.0) -> void:
	if absf(q.x) > R.DEMI + 10.0 or absf(q.y) > R.DEMI + 10.0:
		return
	var cle := Vector2i(int(floor((q.x + R.DEMI) / CASE)), int(floor((q.y + R.DEMI) / CASE)))
	if not cases.has(cle):
		cases[cle] = {}
	if not cases[cle].has(genre):
		cases[cle][genre] = []
	var retourne := r.randf() < 0.5
	cases[cle][genre].append([q, echelle, -1.0 if retourne else 1.0, teinte, petale, r.randf() + (2.0 if retourne else 0.0)])


# un objet du lieu est-il là (un tronc, un rocher) ?
static func _gene(monde, q: Vector2, marge: float) -> bool:
	for o in monde.autour(q, 30.0):
		if o.rayon > 0.0 and q.distance_to(o.position) < o.rayon + marge:
			return true
	return false


# ce qui est posé au sol, rangé par case : [genre, place, graine]
static func _poser(monde, t: Dictionary, s: Dictionary, graine: int, mobile: bool) -> Dictionary:
	var r := RandomNumberGenerator.new()
	r.seed = graine + 4242
	var k := 0.6 if mobile else 1.0
	var cases := {}
	var froid := float(s["froid"])
	var humid := float(s["humide"])
	var couvert := float(s["couvert"])
	var objets: Array = monde.objets
	var plan := [
		["cailloux", int((200.0 + 900.0 * float(s["cailloux"])) * k)],
		["champignons", int(260.0 * couvert * clampf(humid * 1.5 - 0.35, 0.0, 1.0) * (1.0 - froid * 0.7) * k)],
		["bois_mort", int((20.0 + 110.0 * couvert) * k)],
		["flaque", int((260.0 * float(s["boue"]) + 25.0 * clampf(humid - 0.6, 0.0, 1.0)) * k)],
		["bruyere", int(900.0 * float(s["lande"]) * k)],
		["congere", int(260.0 * froid * k)],
	]
	for e in plan:
		var genre: String = e[0]
		var n: int = e[1]
		var essais := n * 4
		while n > 0 and essais > 0:
			essais -= 1
			var q := Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
			if (genre == "champignons" or genre == "congere") and not objets.is_empty() and r.randf() < 0.6:
				var o = objets[r.randi() % objets.size()]
				if o.genre == "brindille" or o.genre == "touffe":
					continue
				q = o.position + Vector2(r.randf_range(-1.0, 1.0) * (o.rayon + 12.0), r.randf_range(2.0, 12.0))
			var ici := sol_ici(t, s, q)
			var ok := true
			match genre:
				"flaque":
					ok = float(ici["boue"]) > 0.6 or (float(s["boue"]) > 0.3 and r.randf() < 0.25)
				"bruyere":
					ok = float(ici["herbe"]) < 0.6 and float(ici["neige"]) < 0.3
				"congere":
					ok = float(ici["neige"]) > 0.3 or r.randf() < 0.3
				"champignons":
					ok = float(ici["neige"]) < 0.3
			if not ok or q.length() < (130.0 if genre == "cailloux" else 210.0) or _gene(monde, q, 10.0 if genre != "flaque" else 20.0):
				continue
			var cle := Vector2i(int(floor((q.x + R.DEMI) / CASE)), int(floor((q.y + R.DEMI) / CASE)))
			if not cases.has(cle):
				cases[cle] = []
			cases[cle].append([genre, q, r.randi()])
			n -= 1
	return cases


# un nœud par case, qui dessine une fois ce qui y est posé (de ces genres-là), de l'arrière vers l'avant
static func _calques(racine: Node2D, cases: Dictionary, genres: Array, pal: Dictionary) -> void:
	for cle in cases:
		var liste: Array = cases[cle].filter(func(e): return genres.has(e[0]))
		if liste.is_empty():
			continue
		liste.sort_custom(func(a, b): return (a[0] == "flaque") if (a[0] == "flaque") != (b[0] == "flaque") else a[1].y < b[1].y)
		var c := Calque.new()
		c.material = Objet.fixe
		c.dessin = func(n: CanvasItem): _dessiner_case(n, liste, pal)
		racine.add_child(c)


static func _dessiner_case(n: CanvasItem, liste: Array, pal: Dictionary) -> void:
	var p := Pinceau.new()
	p.commencer(n.get_canvas_item())
	var r := RandomNumberGenerator.new()
	for e in liste:
		r.seed = e[2]
		var q: Vector2 = e[1]
		match e[0]:
			"cailloux":
				_cailloux(p, r, q, pal)
			"champignons":
				_champignons(p, r, q, pal)
			"bois_mort":
				_bois_mort(p, r, q, pal)
			"flaque":
				_flaque(p, r, q, pal)
			"bruyere":
				_bruyere(p, r, q, pal)
			"congere":
				_congere(p, r, q, pal)
	p.finir()


static func _ombre(p, q: Vector2, rx: float, ry: float, a: float) -> void:
	p.eventail(q, rx, ry, Color(P.NUIT, a), Color(P.NUIT, 0.0), 14)


static func _cailloux(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var c: Color = pal["pierre"]
	for i in r.randi_range(1, 4):
		var o := q + Vector2(r.randf_range(-8.0, 8.0), r.randf_range(-4.0, 4.0))
		var s := r.randf_range(1.8, 4.2)
		_ombre(p, o + Vector2(0.8, 0.8), s * 1.3, s * 0.6, 0.35)
		var poly := PackedVector2Array()
		for k in 6:
			var a := TAU * k / 6.0 + r.randf_range(-0.3, 0.3)
			poly.append(o + Vector2(cos(a) * s, sin(a) * s * 0.66 - s * 0.25) * r.randf_range(0.82, 1.12))
		p.aplat(poly, c.lerp(P.IVOIRE, r.randf_range(0.0, 0.2)).darkened(r.randf_range(0.0, 0.2)), Pinceau.PIERRE, o + Vector2(0, -s * 0.3), Vector2(s, s * 0.75))
		p.contour(poly, 0.85, ENCRE, r, 2)


static func _champignons(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var rouge := r.randf() < 0.35
	var chapeau := P.BRAISE_ROUGE.lerp(P.SANG, 0.25) if rouge else P.TERRE.lerp(P.BRAISE, 0.35).lightened(0.05)
	var pied := P.IVOIRE.lerp(P.PAPIER, 0.4)
	var n := r.randi_range(2, 4)
	var liste := []
	for i in n:
		liste.append(q + Vector2(r.randf_range(-6.0, 6.0), r.randf_range(-2.5, 2.5)))
	liste.sort_custom(func(a, b): return a.y < b.y)
	for o in liste:
		var s := r.randf_range(3.0, 4.8)
		var h := s * r.randf_range(1.0, 1.5)
		_ombre(p, o + Vector2(0.8, 0.6), s * 1.3, s * 0.5, 0.4)
		var tige := PackedVector2Array([o + Vector2(-s * 0.32, 0.4), o + Vector2(-s * 0.24, -h), o + Vector2(s * 0.24, -h), o + Vector2(s * 0.32, 0.4)])
		p.aplat(tige, pied, Pinceau.ECORCE, o + Vector2(0, -h * 0.5), Vector2(s * 0.3, h))
		p.contour(tige, 0.7, ENCRE, r, 2)
		var cap := PackedVector2Array()
		for k in 12:
			var a := PI + PI * k / 11.0
			cap.append(o + Vector2(cos(a) * s, -h + sin(a) * s * 0.75))
		cap.append(o + Vector2(s * 0.7, -h + 0.7))
		cap.append(o + Vector2(-s * 0.7, -h + 0.7))
		p.aplat(cap, chapeau, Pinceau.DOME, o + Vector2(0, -h - s * 0.25), Vector2(s, s * 0.7))
		if rouge:
			for k in 3:
				p.disque(o + Vector2(r.randf_range(-0.6, 0.5) * s, -h - r.randf_range(0.25, 0.6) * s), 0.45, 0.35, pied)
		p.contour(cap, 0.85, ENCRE, r, 2)


static func _bois_mort(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var l := r.randf_range(16.0, 34.0)
	var rr := r.randf_range(2.6, 4.6)
	var a := r.randf_range(-0.45, 0.45)
	var d := Vector2(cos(a), sin(a) * 0.55)
	var n := d.orthogonal()
	if n.y > 0.0:
		n = -n
	var ecorce := P.TERRE.lerp(P.ENCRE_DOUCE, 0.25).lerp(P.CENDRE, 0.12)
	_ombre(p, q + Vector2(1.5, rr * 0.7), l * 0.6, rr * 1.1, 0.4)
	var a0 := q - d * l * 0.5
	var a1 := q + d * l * 0.5
	# le dessus éclairé, le flanc, le dessous dans l'ombre
	var corps := PackedVector2Array([a0 + n * rr, a1 + n * rr * 0.9, a1 - n * rr * 0.9, a0 - n * rr])
	p.aplat(corps, ecorce, Pinceau.UNI)
	p.aplat(PackedVector2Array([a0 + n * rr, a1 + n * rr * 0.9, a1 + n * rr * 0.25, a0 + n * rr * 0.3]), ecorce.lightened(0.18), Pinceau.UNI)
	p.aplat(PackedVector2Array([a0 - n * rr * 0.35, a1 - n * rr * 0.3, a1 - n * rr * 0.9, a0 - n * rr]), ecorce.darkened(0.35), Pinceau.UNI)
	# les sillons de l'écorce, en long, et quelques fentes
	for k in 3:
		var v := lerpf(0.55, -0.45, k / 2.0)
		var t0 := r.randf_range(0.02, 0.2)
		var t1 := r.randf_range(0.6, 0.95)
		p.tracer(PackedVector2Array([a0.lerp(a1, t0) + n * rr * v, a0.lerp(a1, (t0 + t1) * 0.5) + n * rr * (v + r.randf_range(-0.1, 0.1)), a0.lerp(a1, t1) + n * rr * v]), 0.6, Color(ENCRE, 0.5))
	for k in r.randi_range(1, 3):
		var o := a0.lerp(a1, r.randf_range(0.15, 0.85))
		p.tracer(PackedVector2Array([o + n * rr * 0.8, o + n * rr * 0.2 + d * 1.5]), 0.6, Color(ENCRE, 0.6))
	# un moignon de branche
	if r.randf() < 0.6:
		var o := a0.lerp(a1, r.randf_range(0.3, 0.7)) + n * rr * 0.6
		var b := o + (n * 0.8 + d * r.randf_range(-0.6, 0.6)).normalized() * r.randf_range(3.0, 6.0)
		p.tracer(PackedVector2Array([o, b]), 2.6, ENCRE)
		p.tracer(PackedVector2Array([o, b]), 1.6, ecorce.lightened(0.1))
	p.tracer(PackedVector2Array([a0 + n * rr, a1 + n * rr * 0.9]), 1.0, ENCRE)
	p.tracer(PackedVector2Array([a0 - n * rr, a1 - n * rr * 0.9]), 1.4, ENCRE)
	# le bout coupé : le bois clair, ses cernes
	var bout := a1 + d * 0.5
	var bois := P.IVOIRE.lerp(P.BRAISE, 0.2).darkened(0.15)
	p.aplat(Pinceau.ellipse(bout, rr * 0.55, rr * 0.92, 12), bois, Pinceau.DOME, bout, Vector2(rr * 0.55, rr * 0.92))
	var cerne := Pinceau.ellipse(bout, rr * 0.3, rr * 0.5, 10)
	cerne.append(cerne[0])
	p.tracer(cerne, 0.45, bois.darkened(0.35), false)
	var bord := Pinceau.ellipse(bout, rr * 0.55, rr * 0.92, 12)
	bord.append(bord[0])
	p.tracer(bord, 0.9, ENCRE, false)
	# de la mousse dessus
	if float(pal.get("humide", 0.5)) > 0.5:
		for k in r.randi_range(1, 3):
			var o := a0.lerp(a1, r.randf_range(0.1, 0.8)) + n * rr * 0.75
			p.disque(o, r.randf_range(2.0, 4.0), r.randf_range(1.2, 1.8), P.MOUSSE, Pinceau.FEUILLAGE)


static func _flaque(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var rx := r.randf_range(12.0, 30.0)
	var ry := rx * r.randf_range(0.38, 0.5)
	var forme := Objet.festons(q, rx, ry, r.randi_range(5, 7), 0.12, r, 30)
	var rive := Objet.festons(q + Vector2(0.5, 0.8), rx + 3.0, ry + 2.0, 6, 0.15, r, 30)
	p.aplat(rive, pal["boue"].darkened(0.2))
	var eau: Color = pal["eau"]
	var ciel := eau.lerp(P.LUNE, 0.4).lerp(P.PAPIER, 0.12)
	var cols := PackedColorArray()
	var uvs := PackedVector2Array()
	for o in forme:
		# (le bord du fond reflète le ciel, le bord du devant est sombre)
		var v := clampf((o.y - (q.y - ry)) / (2.0 * ry), 0.0, 1.0)
		cols.append(ciel.lerp(eau, smoothstep(0.1, 0.7, v)))
		uvs.append(Vector2.ZERO)
	p.aplat_libre(forme, cols, uvs)
	for k in r.randi_range(1, 3):
		var y := q.y - ry * r.randf_range(0.1, 0.5)
		var x := q.x + r.randf_range(-0.4, 0.3) * rx
		p.tracer(PackedVector2Array([Vector2(x, y), Vector2(x + rx * r.randf_range(0.2, 0.45), y)]), 0.8, Color(P.PAPIER, 0.55))
	p.contour(forme, 1.0, Color(ENCRE, 0.7), r, 3)


static func _bruyere(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var rx := r.randf_range(7.0, 13.0)
	var ry := rx * r.randf_range(0.55, 0.75)
	var centre := q + Vector2(0, -ry * 0.55)
	_ombre(p, q + Vector2(1.5, 0.5), rx * 1.15, rx * 0.4, 0.38)
	var forme := Objet.festons(centre, rx, ry, r.randi_range(5, 7), 0.22, r, 30, 0.2)
	var feuille: Color = pal["bruyere_feuille"]
	p.aplat(forme, feuille, Pinceau.FEUILLAGE, centre, Vector2(rx, ry) * 1.08)
	p.contour(forme, 1.0, ENCRE, r, 3)
	var fleur: Color = pal["bruyere"]
	for k in r.randi_range(18, 30):
		var o := centre + Vector2(r.randf_range(-0.85, 0.7) * rx, r.randf_range(-0.9, 0.4) * ry)
		p.disque(o, r.randf_range(0.8, 1.4), r.randf_range(0.6, 1.0), fleur.lightened(r.randf_range(0.05, 0.3)) if o.x < centre.x else fleur.darkened(0.1))


static func _congere(p, r: RandomNumberGenerator, q: Vector2, pal: Dictionary) -> void:
	var neige: Color = pal["neige"]
	for k in r.randi_range(2, 4):
		var o := q + Vector2(r.randf_range(-10.0, 10.0), r.randf_range(-3.0, 3.0))
		var rx := r.randf_range(5.0, 12.0)
		var ry := rx * r.randf_range(0.35, 0.5)
		p.disque(o, rx, ry, neige, Pinceau.DOME)


# --- la lisière : au-delà du carré jouable, des rangs d'arbres de plus en plus noirs ---

static func lisiere(monde, pal: Dictionary, graine: int, mobile: bool) -> void:
	var r := RandomNumberGenerator.new()
	r.seed = graine + 77
	var bord := R.DEMI
	var loin := bord + 620.0
	var rangs := 3 if mobile else 4
	var sapins: bool = pal.get("froid", false)
	var bruit := FastNoiseLite.new()
	bruit.seed = graine + 5
	bruit.frequency = 0.004
	# (en haut et en bas, de longs morceaux ; à gauche et à droite, des morceaux courts, pour que le tri par hauteur tienne)
	for cote in ["haut", "bas", "gauche", "droite"]:
		var long := 350.0 if cote == "haut" or cote == "bas" else 175.0
		var de := -loin if cote == "haut" or cote == "bas" else -bord - 40.0
		var a := de
		while a < -de:
			var arbres := []
			for rang in rangs:
				var x := a + r.randf_range(0.0, 20.0)
				while x < a + long:
					var avance := bruit.get_noise_1d(x + rang * 300.0 + (0.0 if cote == "haut" or cote == "bas" else 9000.0) + (5000.0 if cote == "bas" or cote == "droite" else 0.0))
					var profond := 28.0 + rang * 62.0 + avance * 55.0 + r.randf_range(-12.0, 12.0)
					if cote == "bas":
						profond += 18.0
					var pied := Vector2.ZERO
					match cote:
						"haut":
							pied = Vector2(x, -bord - profond)
						"bas":
							pied = Vector2(x, bord + profond)
						"gauche":
							pied = Vector2(-bord - profond, x)
						"droite":
							pied = Vector2(bord + profond, x)
					var sombre := clampf(0.42 + rang * 0.2 + r.randf_range(-0.05, 0.05), 0.0, 0.92)
					var sapin: bool = sapins if r.randf() < 0.85 else not sapins
					arbres.append([pied, r.randf_range(0.95, 1.4) + rang * 0.12, sapin, sombre, rang, r.randi()])
					x += r.randf_range(22.0, 38.0) * (1.0 if rang == 0 else 0.85)
			arbres.sort_custom(func(u, v): return u[0].y < v[0].y)
			var c := Calque.new()
			c.material = Objet.fixe
			var y0 := 0.0
			match cote:
				"haut":
					y0 = -bord - 20.0
				"bas":
					y0 = bord + 30.0
				_:
					y0 = a + long
			c.position = Vector2(0, y0)
			var liste := arbres
			c.dessin = func(n: CanvasItem): _dessiner_lisiere(n, liste, pal, y0)
			monde.add_child(c)
			a += long


static func _dessiner_lisiere(n: CanvasItem, arbres: Array, pal: Dictionary, y0: float) -> void:
	var p := Pinceau.new()
	p.commencer(n.get_canvas_item())
	var r := RandomNumberGenerator.new()
	var fond: Color = pal["sous_bois"]
	var feuilles: Color = pal["feuilles"]
	var ecorce := P.TERRE.lerp(P.ENCRE_DOUCE, 0.5)
	for e in arbres:
		r.seed = e[5]
		var pied: Vector2 = e[0] - Vector2(0, y0)
		var k: float = e[1]
		var sombre: float = e[3]
		var rang: int = e[4]
		var t := feuilles.lerp(fond, sombre)
		var tr := ecorce.lerp(fond, sombre)
		var detail := rang == 0
		if detail:
			_ombre(p, pied + Vector2(4, 2), 26.0 * k, 9.0 * k, 0.5)
		# le tronc
		var h := r.randf_range(26.0, 36.0) * k
		var w := 4.2 * k
		var tronc := PackedVector2Array([pied + Vector2(-w - 2.0, 1), pied + Vector2(-w * 0.6, -h), pied + Vector2(w * 0.6, -h), pied + Vector2(w + 2.0, 1)])
		if detail:
			p.aplat(tronc, tr, Pinceau.ECORCE, pied + Vector2(0, -h * 0.5), Vector2(w + 2.0, h))
			p.contour(tronc, 1.2, ENCRE, r, 2)
		else:
			p.aplat(tronc, tr)
		if e[2]:
			# un sapin : trois étages en silhouette
			var haut := r.randf_range(70.0, 96.0) * k
			for i in 3:
				var u := i / 3.0
				var bas := pied.y - h * 0.3 - u * haut * 0.62
				var ww := 24.0 * k * (1.0 - u * 0.62)
				var sommet := bas - haut * 0.42
				var poly := PackedVector2Array([Vector2(pied.x, sommet), Vector2(pied.x + ww, bas), Vector2(pied.x + ww * 0.3, bas - 2.5), Vector2(pied.x, bas + 1.5), Vector2(pied.x - ww * 0.35, bas - 2.0), Vector2(pied.x - ww, bas)])
				if detail:
					var cols := PackedColorArray()
					var uvs := PackedVector2Array()
					for q in poly:
						cols.append(t)
						uvs.append(Vector2(19.0 + clampf((q.x - pied.x) / ww, -1.0, 1.0), 19.0 + clampf((q.y - sommet) / (bas - sommet), 0.0, 1.0)))
					p.aplat_libre(poly, cols, uvs)
					p.contour(poly, 1.3, ENCRE, r, 2)
				else:
					p.aplat(poly, t)
		else:
			var rx := r.randf_range(26.0, 36.0) * k
			var ry := rx * r.randf_range(0.8, 0.95)
			var centre := pied + Vector2(r.randf_range(-3.0, 3.0), -h - ry * 0.6)
			var poly := Objet.festons(centre, rx, ry, r.randi_range(6, 9), 0.18, r, 40 if detail else 24, 0.1)
			if detail:
				p.aplat(poly, t, Pinceau.FEUILLAGE, centre, Vector2(rx, ry) * 1.08)
				p.contour(poly, 1.4, ENCRE, r, 3)
			else:
				p.aplat(poly, t)
				# (un liseré plus clair, en haut à gauche : la silhouette garde du volume)
				p.tracer(Objet.festons(centre + Vector2(-1.5, -1.5), rx * 0.92, ry * 0.92, 5, 0.1, r, 10).slice(5, 9), 1.6, t.lightened(0.08))
	p.finir()


# un nœud qui se dessine par une fonction (une case de décor, un morceau de lisière, une case d'ombres)
class Calque extends Node2D:
	var dessin: Callable

	func _draw() -> void:
		if dessin.is_valid():
			dessin.call(self)
