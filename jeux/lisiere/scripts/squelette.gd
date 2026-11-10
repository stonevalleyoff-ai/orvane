extends RefCounted
# Lisière — le squelette d'une bête, tiré de sa planche (scripts/squelette.gd)
# La planche (un SVG de 170 × 90, monde/silhouette.js) dessine chaque patte à part : une chaîne de <line> qui se suivent, de la
# hanche au pied posé au sol (y = 0 dans le groupe du dessin), puis son pied (un sabot, des griffes, des doigts, un coussinet).
# Les pattes du côté lointain sont dessinées avant le corps, celles du côté proche après. On les retire du dessin : il reste le
# corps (bas : ce qui est sous les pattes proches ; dessus : ce qui est entre elles ; tête : ce qui vient après, le cou et la
# tête, qu'on peut faire bouger). Chaque patte garde ses points, ses épaisseurs, son côté et son pied, et ses morceaux vont dans
# une seule image (un atlas), dessinés droits : la bête les tourne à chaque image. Tout est en pixels montrés, autour du point
# où la bête touche le sol (le cadre 85, 86), et mis en cache par lignée et par taille.
#   var sq := Squelette.lire(cle, Orvane._silhouette(id, biome), largeur)

const MARGE := 3          # (pixels de l'image autour de chaque morceau : le filtrage ne mêle pas deux morceaux)
const ORIGINE := Vector2(85.0, 86.0)
const OMBRE := "#3b3423"

static var _cache := {}
static var _re := {}


static func _regex(nom: String, motif: String) -> RegEx:
	if not _re.has(nom):
		var r := RegEx.new()
		r.compile(motif)
		_re[nom] = r
	return _re[nom]


# le squelette d'une lignée à cette largeur (pixels montrés) ; {} si son dessin ne se lit pas
static func lire(cle: String, s: Dictionary, largeur: float) -> Dictionary:
	var k := "%s|%d" % [cle, int(round(largeur * 4.0))]
	if _cache.has(k):
		return _cache[k]
	var sq := _analyser(str(s.get("svg", "")), largeur)
	_cache[k] = sq
	return sq


static func _analyser(svg: String, largeur: float) -> Dictionary:
	if svg == "":
		return {}
	var e := largeur / 170.0          # pixels montrés par unité du cadre
	var ech := 2.0 * e                 # pixels de l'image par unité du cadre (l'image est deux fois plus grande qu'on ne la montre)
	var g := _regex("groupe", "<g transform=\"translate\\(([-\\d.]+)[ ,]+([-\\d.]+)\\) scale\\(([-\\d.]+)\\)\"[^>]*>").search(svg)
	if g == null:
		return _entier(svg, ech, e)
	var tx := g.get_string(1).to_float()
	var ty := g.get_string(2).to_float()
	var k := g.get_string(3).to_float()
	var entete := svg.substr(0, g.get_end())
	var els := _elements(svg, g.get_end())
	if els.is_empty():
		return _entier(svg, ech, e)
	var role := []
	role.resize(els.size())
	role.fill("")
	var ombre := {}
	if els[0]["nom"] == "ellipse" and str(els[0]["attr"].get("fill", "")) == OMBRE:
		role[0] = "ombre"
		ombre = els[0]["attr"]
	for i in els.size():
		if els[i]["nom"] == "clipPath":
			role[i] = "defs"
	var chaines := _chaines(els)
	for c in chaines:
		for i in c["lignes"] + c["pied"]:
			role[i] = "patte"
	# (le corps : la première découpe après la première patte ; sans découpe, le premier dessin qui n'est pas une patte)
	var corps_i := els.size()
	if not chaines.is_empty():
		var p0: int = chaines[0]["lignes"][0]
		for i in range(p0, els.size()):
			if els[i]["nom"] == "clipPath":
				corps_i = i
				break
		if corps_i == els.size():
			for i in range(p0, els.size()):
				if role[i] == "":
					corps_i = i
					break
	var debut_pres := els.size()
	var fin_pres := els.size()
	for c in chaines:
		c["loin"] = int(c["lignes"][0]) < corps_i
		if not c["loin"]:
			debut_pres = mini(debut_pres, int(c["lignes"][0]))
			fin_pres = int(c["lignes"].back()) if c["pied"].is_empty() else int(c["pied"].back())
	if debut_pres == els.size():
		fin_pres = els.size()
	var defs := ""
	var bas := ""
	var dessus := ""
	var haut := ""
	for i in els.size():
		var t := svg.substr(els[i]["debut"], els[i]["fin"] - els[i]["debut"])
		if role[i] == "defs":
			defs += t
		elif role[i] == "":
			if i < debut_pres:
				bas += t
			elif i < fin_pres:
				dessus += t
			else:
				haut += t
	var sans_pattes := chaines.is_empty()
	var corps := _calque(entete, defs + bas, ech, e, 0.16 if sans_pattes else 0.0)
	if corps.is_empty():
		return _entier(svg, ech, e)
	var sq := {"corps": corps, "dessus": _calque(entete, defs + dessus, ech, e, 0.0), "tete": _calque(entete, defs + haut, ech, e, 0.0),
		"pattes": [], "atlas": null, "sans_pattes": sans_pattes}
	var rc: Rect2 = corps["rect"]
	sq["centre"] = rc.get_center()
	sq["haut"] = rc.position.y
	if not sq["tete"].is_empty():
		var rt: Rect2 = sq["tete"]["rect"]
		sq["haut"] = minf(sq["haut"], rt.position.y)
		# (le cou part du bas, à l'arrière de ce qui vient après les pattes : c'est là que la tête pivote)
		sq["tete"]["pivot"] = Vector2(rt.position.x + rt.size.x * 0.2, rt.end.y - rt.size.y * 0.2)
	if not ombre.is_empty():
		sq["ombre"] = float(ombre.get("rx", "10")) * k * e
		sq["ombre_x"] = _local(Vector2(float(ombre.get("cx", "0")), 0.0), tx, ty, k, e).x
	else:
		sq["ombre"] = rc.size.x * 0.36
		sq["ombre_x"] = rc.get_center().x
	if not sans_pattes:
		_pattes(sq, svg, els, chaines, tx, ty, k, e, ech)
	var portee := 0.0
	var hanches := 0.0
	for p in sq["pattes"]:
		portee += p["portee"]
		hanches += p["pts"][0].y
	if sq["pattes"].is_empty():
		sq["jambe"] = maxf(2.0, rc.size.y * 0.45)
		sq["ventre"] = rc.end.y
	else:
		sq["jambe"] = maxf(1.0, portee / sq["pattes"].size())
		sq["ventre"] = hanches / sq["pattes"].size()
	return sq


# une planche dont on ne lit pas le groupe : son dessin entier, sans pattes à part
static func _entier(svg: String, ech: float, e: float) -> Dictionary:
	var img := Image.new()
	if img.load_svg_from_string(svg, ech) != OK:
		return {}
	var corps := _rogner(img, e, 0.0)
	if corps.is_empty():
		return {}
	var rc: Rect2 = corps["rect"]
	return {"corps": corps, "dessus": {}, "tete": {}, "pattes": [], "atlas": null, "sans_pattes": true, "centre": rc.get_center(),
		"haut": rc.position.y, "ombre": rc.size.x * 0.36, "ombre_x": rc.get_center().x, "jambe": maxf(2.0, rc.size.y * 0.45), "ventre": rc.end.y}


# les éléments au premier niveau du groupe : { nom, attr, debut, fin } (fin : après la balise fermante)
static func _elements(svg: String, depuis: int) -> Array:
	var out := []
	var prof := 0
	var cur := {}
	for m in _regex("balise", "<(/?)([a-zA-Z]+)([^>]*?)(/?)>").search_all(svg, depuis):
		var ferme := m.get_string(1) == "/"
		var seul := m.get_string(4) == "/"
		if prof == 0:
			if ferme:
				break
			var el := {"nom": m.get_string(2), "attr": _attributs(m.get_string(3)), "debut": m.get_start(), "fin": m.get_end()}
			if seul:
				out.append(el)
			else:
				cur = el
				prof = 1
		elif ferme:
			prof -= 1
			if prof == 0:
				cur["fin"] = m.get_end()
				out.append(cur)
		elif not seul:
			prof += 1
	return out


static func _attributs(t: String) -> Dictionary:
	var a := {}
	for m in _regex("attr", "([\\w:-]+)=\"([^\"]*)\"").search_all(t):
		a[m.get_string(1)] = m.get_string(2)
	return a


# les pattes : des <line> qui se suivent (la fin de l'une est le début de la suivante), la dernière finit au sol ; puis son pied
static func _chaines(els: Array) -> Array:
	var out := []
	var i := 0
	while i < els.size():
		if els[i]["nom"] != "line":
			i += 1
			continue
		var lignes := [i]
		var j := i
		while j + 1 < els.size() and els[j + 1]["nom"] == "line":
			var a: Dictionary = els[j]["attr"]
			var b: Dictionary = els[j + 1]["attr"]
			if absf(float(a.get("x2", "0")) - float(b.get("x1", "1e9"))) < 0.05 and absf(float(a.get("y2", "0")) - float(b.get("y1", "1e9"))) < 0.05:
				lignes.append(j + 1)
				j += 1
			else:
				break
		var fin: Dictionary = els[j]["attr"]
		if absf(float(fin.get("y2", "9"))) < 0.6:
			var pied := Vector2(float(fin.get("x2", "0")), float(fin.get("y2", "0")))
			var wl := float(fin.get("stroke-width", "1"))
			var joints := []
			for l in lignes:
				joints.append(Vector2(float(els[l]["attr"].get("x1", "0")), float(els[l]["attr"].get("y1", "0"))))
			var pieces := []
			var q := j + 1
			while q < els.size() and pieces.size() < 5 and _est_pied(els[q], pied, joints, wl):
				pieces.append(q)
				q += 1
			out.append({"lignes": lignes, "pied": pieces})
			i = q
		else:
			i = j + 1
	return out


# un élément qui tient au pied (un sabot, une griffe, un doigt, un coussinet) ou à une articulation (une rotule ronde)
static func _est_pied(el: Dictionary, f: Vector2, joints: Array, wl: float) -> bool:
	var a: Dictionary = el["attr"]
	match el["nom"]:
		"rect":
			var w := float(a.get("width", "0"))
			var h := float(a.get("height", "0"))
			var c := Vector2(float(a.get("x", "0")) + w * 0.5, float(a.get("y", "0")) + h * 0.5)
			return absf(c.x - f.x) <= 1.2 * wl + 1.5 and absf(c.y - f.y) <= wl + 1.5 and w <= 3.0 * wl + 3.0
		"ellipse", "circle":
			var c := Vector2(float(a.get("cx", "0")), float(a.get("cy", "0")))
			var r := maxf(float(a.get("rx", a.get("r", "0"))), float(a.get("ry", a.get("r", "0"))))
			if r > 2.5 * wl + 1.5:
				return false
			if c.distance_to(f) <= 1.5 * wl + 1.0:
				return true
			for p in joints:
				if c.distance_to(p) <= 0.35:
					return true
		"path":
			if not a.has("stroke"):
				return false
			var pts := _points(str(a.get("d", "")))
			return not pts.is_empty() and pts[0].distance_to(f) <= maxf(6.0, 2.5 * wl)
	return false


# les points d'un chemin (M, L, Q, C, et leurs formes relatives) : assez pour sa boîte
static func _points(d: String) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var cur := Vector2.ZERO
	var paires := {"M": 1, "L": 1, "Q": 2, "C": 3, "T": 1}
	for m in _regex("cmd", "([MLQCTZmlqctz])([^MLQCTZmlqctz]*)").search_all(d):
		var c := m.get_string(1)
		var n: int = paires.get(c.to_upper(), 0)
		if n == 0:
			continue
		var v := []
		for x in _regex("nombre", "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?").search_all(m.get_string(2)):
			v.append(x.get_string().to_float())
		var i := 0
		while i + 2 * n <= v.size():
			var base := cur if c == c.to_lower() else Vector2.ZERO
			for p in n:
				pts.append(base + Vector2(v[i + 2 * p], v[i + 2 * p + 1]))
			cur = pts[pts.size() - 1]
			i += 2 * n
	return pts


# la boîte d'un élément, dans le groupe du dessin
static func _boite(el: Dictionary) -> Rect2:
	var a: Dictionary = el["attr"]
	var sw := float(a.get("stroke-width", "0")) * 0.5 + 0.6
	match el["nom"]:
		"rect":
			return Rect2(float(a.get("x", "0")), float(a.get("y", "0")), float(a.get("width", "0")), float(a.get("height", "0"))).grow(sw)
		"ellipse", "circle":
			var r := maxf(float(a.get("rx", a.get("r", "0"))), float(a.get("ry", a.get("r", "0"))))
			return Rect2(float(a.get("cx", "0")) - r, float(a.get("cy", "0")) - r, 2.0 * r, 2.0 * r).grow(sw)
		"line":
			var p := Vector2(float(a.get("x1", "0")), float(a.get("y1", "0")))
			return Rect2(p, Vector2.ZERO).expand(Vector2(float(a.get("x2", "0")), float(a.get("y2", "0")))).grow(sw)
		"path":
			var pts := _points(str(a.get("d", "")))
			if pts.is_empty():
				return Rect2()
			var b := Rect2(pts[0], Vector2.ZERO)
			for p in pts:
				b = b.expand(p)
			return b.grow(sw)
	return Rect2()


static func _local(p: Vector2, tx: float, ty: float, k: float, e: float) -> Vector2:
	return (Vector2(tx, ty) + p * k - ORIGINE) * e


# un calque du dessin (ses éléments, dans le groupe de la planche), rendu à deux fois sa taille montrée, rogné
static func _calque(entete: String, contenu: String, ech: float, e: float, marge_onde: float) -> Dictionary:
	if contenu == "" or not ("<path" in contenu or "<ellipse" in contenu or "<rect" in contenu or "<line" in contenu or "<circle" in contenu):
		return {}
	var img := Image.new()
	if img.load_svg_from_string(entete + contenu + "</g></svg>", ech) != OK:
		return {}
	return _rogner(img, e, marge_onde)


# rogné à ce qu'il dessine, avec une marge (et, pour un corps qui ondule, de la place en haut et en bas)
static func _rogner(img: Image, e: float, marge_onde: float) -> Dictionary:
	var r := img.get_used_rect()
	if r.size.x <= 0 or r.size.y <= 0:
		return {}
	var m := Vector2i(MARGE, MARGE + int(ceil(r.size.y * marge_onde)))
	var out := Image.create(r.size.x + 2 * m.x, r.size.y + 2 * m.y, false, img.get_format())
	out.blit_rect(img, r, m)
	# (les pixels transparents du rendu sont blancs : filtrés, ils feraient un liseré clair autour du dessin)
	out.fix_alpha_edges()
	var pos := (Vector2(r.position - m)) * 0.5 - ORIGINE * e
	return {"tex": ImageTexture.create_from_image(out), "pos": pos, "taille": Vector2(out.get_size()) * 0.5,
		"rect": Rect2(pos + Vector2(m) * 0.5, Vector2(r.size) * 0.5)}


# chaque patte : ses points au repos (pixels montrés), ses longueurs, son pli, ses morceaux dans l'atlas
static func _pattes(sq: Dictionary, svg: String, els: Array, chaines: Array, tx: float, ty: float, k: float, e: float, ech: float) -> void:
	var pad := float(MARGE) / ech
	var cellules := []      # [taille (unités du cadre), contenu SVG, ancre]
	var pattes := []
	var centre: Vector2 = sq["centre"]
	for c in chaines:
		var g := PackedVector2Array()
		var larg := []
		var traits := []
		var a0: Dictionary = els[c["lignes"][0]]["attr"]
		g.append(Vector2(float(a0.get("x1", "0")), float(a0.get("y1", "0"))))
		for l in c["lignes"]:
			var a: Dictionary = els[l]["attr"]
			g.append(Vector2(float(a.get("x2", "0")), float(a.get("y2", "0"))))
			larg.append(float(a.get("stroke-width", "1")))
			traits.append(str(a.get("stroke", "#000")))
		# (une patte d'un seul trait, droite comme un pilier : coupée en deux, pour qu'elle plie au genou)
		if g.size() == 2:
			g = PackedVector2Array([g[0], (g[0] + g[1]) * 0.5, g[1]])
			larg.append(larg[0])
			traits.append(traits[0])
		var p := {"loin": c["loin"], "cellules": [], "pied": {}}
		for s in g.size() - 1:
			var lg := g[s].distance_to(g[s + 1]) * k
			var w: float = larg[s] * k
			var ancre := Vector2(pad + w * 0.5, pad + w * 0.5)
			var ligne := "<line x1=\"%.2f\" y1=\"%.2f\" x2=\"%.2f\" y2=\"%.2f\" stroke=\"%s\" stroke-width=\"%.2f\"/>" % [ancre.x, ancre.y, ancre.x + lg, ancre.y, traits[s], w]
			p["cellules"].append(cellules.size())
			cellules.append([Vector2(lg + w + 2.0 * pad, w + 2.0 * pad), ligne, ancre])
		if not c["pied"].is_empty():
			var f := g[g.size() - 1]
			var b := Rect2(f, Vector2.ZERO)
			var contenu := ""
			for q in c["pied"]:
				b = b.merge(_boite(els[q]))
				contenu += svg.substr(els[q]["debut"], els[q]["fin"] - els[q]["debut"])
			var ancre := Vector2(pad, pad) + (f - b.position) * k
			var corps := "<g transform=\"translate(%.2f %.2f) scale(%.4f) translate(%.2f %.2f)\">%s</g>" % [ancre.x, ancre.y, k, -f.x, -f.y, contenu]
			p["pied"] = {"cellule": cellules.size()}
			cellules.append([b.size * k + Vector2(2.0 * pad, 2.0 * pad), corps, ancre])
		var pts := PackedVector2Array()
		for q in g:
			pts.append(_local(q, tx, ty, k, e))
		var n := pts.size() - 1
		var bas := pts[n] - pts[1]
		var rel := PackedVector2Array()
		for q in range(2, n):
			rel.append((pts[q] - pts[1]).rotated(-bas.angle()))
		var croix := (pts[1] - pts[0]).cross(pts[n] - pts[0])
		var droit := absf(croix) < 0.03 * pts[1].distance_to(pts[0]) * pts[n].distance_to(pts[0])
		p["pts"] = pts
		p["l1"] = pts[0].distance_to(pts[1])
		p["l2"] = bas.length()
		p["rel"] = rel
		p["ang_bas"] = bas.angle()
		p["portee"] = pts[0].distance_to(pts[n])
		p["devant"] = pts[0].x > centre.x
		# (le genou plie du côté où la planche le montre ; une patte droite : vers l'avant devant, vers l'arrière derrière)
		p["plie"] = (1.0 if p["devant"] else -1.0) if droit else signf(croix)
		pattes.append(p)
	# l'atlas : des rangées de morceaux, chacun dans sa case
	var largeur_max := 420.0
	var x := 0.0
	var y := 0.0
	var rang := 0.0
	var large := 0.0
	var poses := []
	for c in cellules:
		var t: Vector2 = c[0]
		if x > 0.0 and x + t.x > largeur_max:
			x = 0.0
			y += rang
			rang = 0.0
		poses.append(Vector2(x, y))
		x += t.x
		rang = maxf(rang, t.y)
		large = maxf(large, x)
	var haut := y + rang
	var corps := ""
	for i in cellules.size():
		corps += "<g transform=\"translate(%.2f %.2f)\">%s</g>" % [poses[i].x, poses[i].y, cellules[i][1]]
	var atlas := "<svg viewBox=\"0 0 %.2f %.2f\" width=\"%.2f\" height=\"%.2f\"><g stroke-linecap=\"round\" stroke-linejoin=\"round\">%s</g></svg>" % [large, haut, large, haut, corps]
	var img := Image.new()
	if img.load_svg_from_string(atlas, ech) != OK:
		# (l'atlas ne se lit pas : la bête garde son corps, sans pattes à part)
		sq["sans_pattes"] = true
		return
	img.fix_alpha_edges()
	sq["atlas"] = ImageTexture.create_from_image(img)
	for p in pattes:
		var cel := []
		for i in p["cellules"]:
			cel.append({"region": Rect2(poses[i] * ech, cellules[i][0] * ech), "debut": cellules[i][2] * ech})
		p["cellules"] = cel
		if not p["pied"].is_empty():
			var i: int = p["pied"]["cellule"]
			p["pied"] = {"region": Rect2(poses[i] * ech, cellules[i][0] * ech), "ancre": cellules[i][2] * ech}
	# (le rang de chaque patte, de l'avant vers l'arrière, de son côté : il fait sa phase dans le pas)
	for loin in [true, false]:
		var cote := pattes.filter(func(q): return q["loin"] == loin)
		cote.sort_custom(func(a, b): return a["pts"][0].x > b["pts"][0].x)
		for i in cote.size():
			cote[i]["rang"] = i
			cote[i]["n_cote"] = cote.size()
	sq["pattes"] = pattes
