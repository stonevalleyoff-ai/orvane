extends RefCounted
# Lisière — le squelette d'une bête, tiré de sa planche (scripts/squelette.gd)
# La planche (un SVG de 170 × 90, monde/silhouette.js) dessine chaque patte à part : une chaîne de <line> qui se suivent, de la
# hanche au pied posé au sol (y = 0 dans le groupe du dessin), puis son pied (un sabot, des griffes, des doigts, un coussinet).
# Les pattes du côté lointain sont dessinées avant le corps, celles du côté proche après. On les retire du dessin : il reste le
# corps (bas : ce qui est sous les pattes proches ; dessus : ce qui est entre elles ; tête : ce qui vient après, le cou et la
# tête, qu'on peut faire bouger). Chaque patte garde ses points, ses épaisseurs, son côté et son pied, et ses morceaux vont dans
# une seule image (un atlas), dessinés droits : la bête les tourne à chaque image. Tout est en pixels montrés, autour du point
# où la bête touche le sol (le cadre 85, 86), et mis en cache par lignée et par taille.
# Quand la planche a ses parties (docs/21), on y lit ce qu'est chaque élément du dessin : quelles <line> font chaque patte, quels
# morceaux son pied, où est le corps (donc le côté de chaque patte) ; on ne devine plus rien. Une vieille planche, sans parties,
# est lue comme avant, en cherchant les pattes dans le SVG. Les deux lectures donnent le même squelette : outils/squelettes.gd le
# vérifie sur des mondes entiers.
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
	var sq := analyser(s, largeur)
	_cache[k] = sq
	return sq


# le squelette d'une planche, sans cache : lu dans ses parties quand elle les a, cherché dans son SVG sinon (avec_parties = false :
# toujours dans le SVG, l'ancienne lecture). sq["lu"] dit d'où viennent ses pattes : "parties" ou "svg".
static func analyser(s: Dictionary, largeur: float, avec_parties := true) -> Dictionary:
	var svg := str(s.get("svg", ""))
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
	# (les pattes, et le corps : la planche le dit dans ses parties ; sinon, on les cherche dans son dessin)
	var corps_i := els.size()
	var lu := "svg"
	var lues = null
	if avec_parties and typeof(s.get("parties")) == TYPE_DICTIONARY:
		lues = _chaines_lues(s["parties"], els, tx, ty, k)
	var chaines: Array
	if lues != null:
		chaines = lues
		lu = "parties"
		var co = s["parties"].get("corps")
		var cs = co.get("svg", []) if typeof(co) == TYPE_DICTIONARY else []
		if typeof(cs) == TYPE_ARRAY and not cs.is_empty():
			corps_i = clampi(int(cs[0]), 0, els.size())
	else:
		chaines = _chaines(els)
	for c in chaines:
		for i in c["lignes"] + c["pied"]:
			role[i] = "patte"
	# (le corps, lu dans le SVG : la première découpe après la première patte ; sans découpe, le premier dessin qui n'est pas une patte)
	if lu == "svg" and not chaines.is_empty():
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
		# (des parties qui ne laissent pas de corps ne vont pas avec ce dessin : on le lit comme une vieille planche)
		return analyser(s, largeur, false) if lu == "parties" else _entier(svg, ech, e)
	var sq := {"corps": corps, "dessus": _calque(entete, defs + dessus, ech, e, 0.0), "tete": _calque(entete, defs + haut, ech, e, 0.0),
		"pattes": [], "atlas": null, "sans_pattes": sans_pattes, "lu": lu}
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


# ce qui distingue deux squelettes d'une même planche, lus à la même largeur ("" : le même) : les mêmes calques (le corps, le
# dessus, la tête), les mêmes pattes (leur nombre, leur côté, leur rang, leur sens, leurs points, leurs morceaux dans l'atlas)
static func ecart(a: Dictionary, b: Dictionary) -> String:
	if a.is_empty() or b.is_empty():
		return "" if a.is_empty() == b.is_empty() else "l'un se lit, l'autre non"
	if a["sans_pattes"] != b["sans_pattes"] or a["pattes"].size() != b["pattes"].size():
		return "pattes : %d contre %d" % [a["pattes"].size(), b["pattes"].size()]
	for c in ["corps", "dessus", "tete"]:
		if a[c].is_empty() != b[c].is_empty():
			return "calque %s : présent d'un côté seulement" % c
		if not a[c].is_empty() and (not a[c]["rect"].is_equal_approx(b[c]["rect"]) or a[c]["taille"] != b[c]["taille"]):
			return "calque %s : %s contre %s" % [c, a[c]["rect"], b[c]["rect"]]
	for c in ["haut", "ombre", "ombre_x", "jambe", "ventre"]:
		if not is_equal_approx(float(a[c]), float(b[c])):
			return "%s : %.3f contre %.3f" % [c, a[c], b[c]]
	if not a["centre"].is_equal_approx(b["centre"]):
		return "le centre du corps"
	for i in a["pattes"].size():
		var p: Dictionary = a["pattes"][i]
		var q: Dictionary = b["pattes"][i]
		for c in ["loin", "rang", "n_cote", "devant", "plie"]:
			if p[c] != q[c]:
				return "patte %d : %s (%s contre %s)" % [i, c, p[c], q[c]]
		for c in ["l1", "l2", "portee", "ang_bas"]:
			if not is_equal_approx(float(p[c]), float(q[c])):
				return "patte %d : %s, %.3f contre %.3f" % [i, c, p[c], q[c]]
		for c in ["pts", "rel"]:
			if p[c].size() != q[c].size():
				return "patte %d : %s" % [i, c]
			for j in p[c].size():
				if not p[c][j].is_equal_approx(q[c][j]):
					return "patte %d : %s %d, %s contre %s" % [i, c, j, p[c][j], q[c][j]]
		if p["cellules"].size() != q["cellules"].size() or p["pied"].is_empty() != q["pied"].is_empty():
			return "patte %d : ses morceaux" % i
		for j in p["cellules"].size():
			if not p["cellules"][j]["region"].is_equal_approx(q["cellules"][j]["region"]) or not p["cellules"][j]["debut"].is_equal_approx(q["cellules"][j]["debut"]):
				return "patte %d : son morceau %d" % [i, j]
		if not p["pied"].is_empty() and (not p["pied"]["region"].is_equal_approx(q["pied"]["region"]) or not p["pied"]["ancre"].is_equal_approx(q["pied"]["ancre"])):
			return "patte %d : son pied" % i
	if (a["atlas"] == null) != (b["atlas"] == null) or (a["atlas"] != null and a["atlas"].get_size() != b["atlas"].get_size()):
		return "l'atlas des pattes"
	return ""


# une planche dont on ne lit pas le groupe : son dessin entier, sans pattes à part
static func _entier(svg: String, ech: float, e: float) -> Dictionary:
	var img := Image.new()
	if img.load_svg_from_string(svg, ech) != OK:
		return {}
	var corps := _rogner(img, e, 0.0)
	if corps.is_empty():
		return {}
	var rc: Rect2 = corps["rect"]
	return {"corps": corps, "dessus": {}, "tete": {}, "pattes": [], "atlas": null, "sans_pattes": true, "lu": "svg", "centre": rc.get_center(),
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


# les pattes lues dans les parties de la planche (docs/21) : chacune dit ses éléments dans le groupe du SVG (svg : ses <line>,
# puis les morceaux de son pied), ses points et l'épaisseur de chaque segment dans le cadre de 170 × 90. Ses mesures sont ensuite
# prises sur ces <line>, qu'on découpe de toute façon : on vérifie seulement que les parties disent les mêmes, au dixième près.
# null : des parties qui ne vont pas avec ce dessin (on lit alors le SVG, comme pour une vieille planche)
static func _chaines_lues(P: Dictionary, els: Array, tx: float, ty: float, k: float) -> Variant:
	var out := []
	var pattes = P.get("pattes", [])
	if typeof(pattes) != TYPE_ARRAY:
		return null
	for p in pattes:
		if typeof(p) != TYPE_DICTIONARY:
			return null
		var r = p.get("svg")
		var pts = p.get("points")
		var ep = p.get("epaisseurs")
		if typeof(r) != TYPE_ARRAY or r.size() != 2 or typeof(pts) != TYPE_ARRAY or pts.size() < 2 or typeof(ep) != TYPE_ARRAY or ep.size() != pts.size() - 1:
			return null
		var n: int = pts.size() - 1
		var i0 := int(r[0])
		var i1 := int(r[1])
		if i0 < 0 or i1 >= els.size() or i1 < i0 + n - 1:
			return null
		var lignes := []
		for j in n:
			var el: Dictionary = els[i0 + j]
			var q0 = pts[j]
			var q1 = pts[j + 1]
			if el["nom"] != "line" or typeof(q0) != TYPE_ARRAY or q0.size() < 2 or typeof(q1) != TYPE_ARRAY or q1.size() < 2:
				return null
			var a: Dictionary = el["attr"]
			# (un point des parties : celui de la <line>, posé par le groupe, au dixième ; son épaisseur de même)
			var ecarts := [tx + k * float(a.get("x1", "0")) - float(q0[0]), ty + k * float(a.get("y1", "0")) - float(q0[1]),
				tx + k * float(a.get("x2", "0")) - float(q1[0]), ty + k * float(a.get("y2", "0")) - float(q1[1]), k * float(a.get("stroke-width", "1")) - float(ep[j])]
			for d in ecarts:
				if absf(d) > 0.06:
					return null
			lignes.append(i0 + j)
		for j in range(i0 + n, i1 + 1):
			if not els[j]["nom"] in ["rect", "ellipse", "circle", "path"]:
				return null
		out.append({"lignes": lignes, "pied": range(i0 + n, i1 + 1)})
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
