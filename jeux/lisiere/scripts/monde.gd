extends Node2D
# Lisière — le lieu (scripts/monde.gd)
# Un carré de terre, tiré du biome d'Orvane qu'on joue : son couvert fait les arbres (des sapins s'il fait froid), son humidité
# les buissons et l'herbe, son altitude les rochers, sa température et son humidité la couleur du sol. Les objets sont rangés
# dans une grille, pour trouver vite ce qui est à portée. Ce nœud trie ses enfants par hauteur (y_sort_enabled) : le joueur, les
# bêtes et les feux y vivent aussi.
# Le sol est peint par un shader (shaders/sol_peint.gdshader), cuit par tuiles autour de la caméra (scripts/decor_sol.gd) ;
# l'herbe, les fougères, les fleurs, le décor et la lisière du
# monde viennent de scripts/decor.gd ; les ombres au sol sont dessinées ici, par cases, une fois (et redessinées quand un objet
# change). À chaque image, le monde donne le temps au vent, la place de la veilleuse à l'herbe, l'heure aux ombres, et efface
# les couronnes qui la cachent.

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const Objet := preload("res://scripts/objet.gd")
const Decor := preload("res://scripts/decor.gd")
const Pinceau := preload("res://scripts/decor_pinceau.gd")
const SolCuit := preload("res://scripts/decor_sol.gd")
const SHADER_SOL := preload("res://shaders/sol_peint.gdshader")
const SHADER_OMBRE := preload("res://shaders/sol_ombre.gdshader")
const CASE := 200.0
const CASE_OMBRE := 420.0
const EFFACE := 0.35           # l'opacité d'une couronne qui cache la veilleuse

var jeu
var objets: Array = []
var palette := {}
var _grille := {}
var _racine: Node2D
var _sol
var _terrain := {}
var _parts := {}
var _mobile := false
var _ombres := {}              # case → [le nœud qui dessine ses ombres, ses objets]
var _effaces := {}             # les objets dont la couronne s'efface, ou revient
var _temps := 0.0
var _mat_sol: ShaderMaterial
var _mat_herbe: ShaderMaterial
var _mat_ombre: ShaderMaterial
# (docs/49) les plantes du lieu, d'après l'herbier d'Orvane : par genre d'objet, celles qu'on sème et leur poids
var lieu := ""
var flore := {}


# les couleurs du lieu, d'après ses axes (0 à 1), toutes tirées de la palette (scripts/palette.gd)
static func couleurs(axes: Dictionary) -> Dictionary:
	var temp := float(axes.get("temperature", 0.5))
	var humid := float(axes.get("humidite", 0.5))
	var couvert := float(axes.get("couvert", 0.4))
	var froid := clampf((0.35 - temp) * 4.0, 0.0, 1.0)
	var sec := clampf((0.42 - humid) * 3.0, 0.0, 1.0)
	var chaud := clampf((temp - 0.72) * 3.0, 0.0, 1.0)
	var mouille := clampf((humid - 0.6) * 2.0, 0.0, 1.0)
	# la terre : un humus brun ; plus pâle au sec, ocre rouge au chaud et sec, sombre à l'humide, grise au froid
	var terre := P.TERRE.lerp(P.IVOIRE.darkened(0.28), sec * 0.5 + 0.06)
	terre = terre.lerp(P.BRAISE.darkened(0.42), chaud * sec * 0.45)
	terre = terre.lerp(P.ENCRE_DOUCE, mouille * 0.35)
	terre = terre.lerp(P.LUNE.lerp(P.IVOIRE, 0.5).darkened(0.38), froid * 0.7)
	var mousse := P.MOUSSE.lerp(P.FEUILLE_SOMBRE, couvert * 0.25).lerp(P.IVOIRE.darkened(0.3), sec * 0.4).lerp(P.LUNE.darkened(0.35), froid * 0.3)
	var herbe := P.MOUSSE.lightened(0.08).lerp(P.IVOIRE.darkened(0.22), sec * 0.55 + chaud * 0.2).lerp(P.LUNE.darkened(0.2), froid * 0.25)
	var feuilles := P.MOUSSE.lerp(P.FEUILLE_SOMBRE, 0.15 + humid * 0.3)
	feuilles = feuilles.lerp(P.IVOIRE.darkened(0.35), sec * 0.3).lerp(P.NUIT_BLEUE.lerp(P.MOUSSE, 0.5), froid * 0.45)
	var pierre := P.CENDRE.lerp(P.IVOIRE, 0.3).lerp(terre, 0.18)
	var fleurs := [P.PAPIER, P.BRAISE_COEUR.darkened(0.1) if froid < 0.3 else P.LUNE.lightened(0.35), P.PEUR.lerp(P.CREPUSCULE, 0.5).lightened(0.15)]
	return {"sol": terre.lerp(mousse, 0.4), "feuilles": feuilles, "herbe": herbe, "pierre": pierre, "froid": temp < 0.35,
		"terre": terre, "terre_claire": terre.lerp(P.IVOIRE, 0.22), "terre_sombre": terre.lerp(P.ENCRE, 0.32),
		"mousse": mousse, "mousse_claire": mousse.lerp(P.IVOIRE, 0.2).lightened(0.05),
		"litiere_a": P.ECHARPE.lerp(P.TERRE, 0.35), "litiere_b": P.IVOIRE.lerp(P.BRAISE, 0.35).darkened(0.3), "litiere_c": P.TERRE.darkened(0.12),
		"neige": P.PAPIER.lightened(0.35), "neige_ombre": P.LUNE.lerp(P.PAPIER, 0.45), "boue": P.ENCRE_DOUCE.lerp(P.TERRE, 0.45),
		"eau": P.NUIT_BLEUE.lerp(P.FEUILLE_SOMBRE, 0.45).lerp(P.CENDRE, 0.2), "usure": terre.lerp(P.IVOIRE, 0.24), "sous_bois": P.NUIT.lerp(P.FEUILLE_SOMBRE, 0.3),
		"fougere": feuilles.lerp(P.MOUSSE, 0.6).lightened(0.1), "fleurs": fleurs,
		"bruyere": P.CREPUSCULE.lerp(P.PEUR, 0.3).lightened(0.08), "bruyere_feuille": P.MOUSSE.lerp(P.TERRE, 0.4).darkened(0.12),
		"humide": humid, "caillou": pierre}


# le sol (un shader, peint en coordonnées du monde), sous le décor et les ombres : à poser sous ce nœud
func creer_sol(biome: Dictionary, graine: int) -> Node2D:
	var axes: Dictionary = biome.get("axes", {})
	palette = couleurs(axes)
	_parts = Decor.parts(axes)
	_mobile = jeu != null and str(jeu.get("qualite")) == "mobile"
	_terrain = Decor.terrain(graine)
	Objet.matieres()
	Objet.climat = {"froid": float(_parts["froid"]), "humide": float(_parts["humide"])}
	_racine = Node2D.new()
	_mat_sol = ShaderMaterial.new()
	_mat_sol.shader = SHADER_SOL
	for k in ["plaques", "taches", "voiles", "motif_a", "motif_b"]:
		_mat_sol.set_shader_parameter(k, ImageTexture.create_from_image(_terrain[k]))
	_mat_sol.set_shader_parameter("etendue", Decor.ETENDUE)
	for k in ["terre", "terre_claire", "terre_sombre", "mousse", "mousse_claire", "herbe", "litiere_a", "litiere_b", "litiere_c",
			"caillou", "neige", "neige_ombre", "boue", "usure", "sous_bois"]:
		var c: Color = palette[k]
		_mat_sol.set_shader_parameter(k, Vector3(c.r, c.g, c.b))
	_mat_sol.set_shader_parameter("encre", Vector3(P.ENCRE.r, P.ENCRE.g, P.ENCRE.b))
	for k in ["mousse", "herbe", "litiere", "cailloux", "neige", "boue", "fentes"]:
		_mat_sol.set_shader_parameter("part_" + k, float(_parts[k]))
	_mat_sol.set_shader_parameter("demi", R.DEMI)
	# (le sol est cuit par tuiles, autour de la caméra : scripts/decor_sol.gd ; peint une fois, il garde ses détails sur un
	# téléphone, à un texel par pixel du monde au lieu de 1,35 ; sans écran, rien ne se peint)
	if DisplayServer.get_name() != "headless":
		_sol = SolCuit.new()
		_sol.preparer(_mat_sol, 1.0 if _mobile else R.ZOOM)
		_racine.add_child(_sol)
	_mat_ombre = ShaderMaterial.new()
	_mat_ombre.shader = SHADER_OMBRE
	_mat_ombre.set_shader_parameter("teinte", Vector3(P.NUIT.r, P.NUIT.g, P.NUIT.b).lerp(Vector3(P.NUIT_BLEUE.r, P.NUIT_BLEUE.g, P.NUIT_BLEUE.b), 0.4))
	return _racine


func generer(biome: Dictionary, graine: int) -> void:
	var axes: Dictionary = biome.get("axes", {})
	var r := RandomNumberGenerator.new()
	r.seed = graine
	var bosquets := FastNoiseLite.new()
	bosquets.seed = graine + 1
	bosquets.frequency = 0.0018
	var couvert := float(axes.get("couvert", 0.4))
	var humid := float(axes.get("humidite", 0.5))
	var alt := float(axes.get("altitude", 0.3))
	var arbre := "sapin" if palette.get("froid", false) else "arbre"
	lieu = str(biome.get("id", ""))
	_lire_flore(arbre)
	_semer(r, arbre, int(70 + 430 * couvert), palette["feuilles"], bosquets, 0.25 + couvert)
	_semer(r, "rocher", int(40 + 140 * alt), palette["pierre"], null, 1.0)
	_semer(r, "buisson", int(40 + 110 * humid), palette["feuilles"], bosquets, 0.6)
	_semer(r, "touffe", int(90 + 130 * (1.0 - couvert)), palette["herbe"], null, 1.0)
	_semer(r, "brindille", 160, Color.WHITE, bosquets, 0.6)
	# au réveil, de quoi faire un premier feu à portée
	for i in 6:
		_poser("brindille", Vector2(r.randf_range(-120, 120), r.randf_range(-90, 90)), Color.WHITE, r.randi())
	for i in 2:
		_poser("rocher", Vector2(r.randf_range(-160, 160), r.randf_range(-130, 130)), palette["pierre"], r.randi())
	# le décor, l'herbe, les ombres, la lisière : une fois les objets posés (le décor se glisse autour d'eux)
	if _racine != null:
		_mat_herbe = Decor.semer(self, _racine, _terrain, _parts, palette, graine, _mobile)
		for k in _ombres:
			_case_ombre(k)
		Decor.lisiere(self, palette, graine, _mobile)


# des objets d'un genre, au hasard, plus serrés là où le bruit des bosquets est haut ; rien sur le lieu du réveil
func _semer(r: RandomNumberGenerator, genre: String, n: int, couleur: Color, bruit, densite: float) -> void:
	var poses := 0
	var essais := 0
	while poses < n and essais < n * 12:
		essais += 1
		var p := Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI))
		if p.length() < 150.0:
			continue
		if bruit != null:
			var v: float = bruit.get_noise_2d(p.x, p.y)
			if r.randf() > clampf(densite * 0.5 + v * 0.9, 0.04, 1.0):
				continue
		_poser(genre, p, couleur, r.randi())
		poses += 1


# les plantes du lieu, rangées par genre d'objet : un arbre du jeu est une plante au port d'arbre, un buisson une plante au port de
# buisson, une touffe une herbe, un roseau, une succulente ou un lichen. Chacune a son poids (sa part du lieu), et ce que le dessin
# à l'encre de l'objet prend d'elle (objet.porter_plante) : sa couleur (lue une fois sur son dessin de l'herbier), sa taille
# (d'après sa hauteur vraie), son port, ses défenses. Sans herbier, rien : les objets gardent les couleurs du lieu.
const PORTS := {"arbre": ["arbre"], "buisson": ["buisson"], "touffe": ["herbe", "roseau", "succulente", "lichen", "champignon"]}

func _lire_flore(arbre: String) -> void:
	flore = {}
	for e in Orvane.plantes(lieu):
		var port := str(e.get("port", e.get("forme", "")))
		for genre in PORTS:
			if not PORTS[genre].has(port):
				continue
			var h := float(e.get("hauteur_m", 1.0))
			# (la taille : un arbre de 12 m, un buisson d'1,5 m sont à la mesure du dessin ; plus haut, un peu plus grand, sans excès)
			var k := 1.0
			if genre == "arbre":
				k = clampf(pow(h / 12.0, 0.35), 0.8, 1.3)
			elif genre == "buisson":
				k = clampf(pow(h / 1.5, 0.35), 0.8, 1.3)
			var g := arbre if genre == "arbre" else str(genre)
			if not flore.has(g):
				flore[g] = []
			flore[g].append({"id": str(e["id"]), "poids": maxf(0.02, float(e.get("part", 0.0))), "taille": k, "port": port,
				"defense": e.get("defense", []), "couleur": _couleur_plante(str(e["id"]))})


# la couleur d'une plante : la moyenne des verts de son dessin de l'herbier, rendu petit une fois (null : pas de dessin)
func _couleur_plante(id: String):
	var tex: ImageTexture = Orvane.texture_plante(id, 40.0, lieu)
	if tex == null:
		return null
	var img := tex.get_image()
	var somme := Color(0, 0, 0, 0)
	var n := 0
	for y in range(0, img.get_height(), 2):
		for x in range(0, img.get_width(), 2):
			var c := img.get_pixel(x, y)
			if c.a > 0.5 and c.g > maxf(c.r, c.b) + 0.03:
				somme += c
				n += 1
	return Color(somme.r / n, somme.g / n, somme.b / n) if n > 0 else null


# une plante du lieu pour ce genre d'objet, tirée selon son poids ({} : aucune)
func _plante(genre: String, graine: int) -> Dictionary:
	var L: Array = flore.get(genre, [])
	if L.is_empty():
		return {}
	var tot := 0.0
	for e in L:
		tot += float(e["poids"])
	var x := float(graine % 10007) / 10007.0 * tot
	for e in L:
		x -= float(e["poids"])
		if x <= 0.0:
			return e
	return L[0]


func _poser(genre: String, p: Vector2, couleur: Color, graine: int) -> void:
	var o = Objet.new()
	o.preparer(genre, couleur, graine)
	var pl := _plante(genre, graine)
	if not pl.is_empty():
		o.porter_plante(pl)
	o.position = p
	add_child(o)
	objets.append(o)
	var k := _cle(p)
	if not _grille.has(k):
		_grille[k] = []
	_grille[k].append(o)
	var ko := _cle_ombre(p)
	if not _ombres.has(ko):
		_ombres[ko] = [null, []]
	_ombres[ko][1].append(o)
	if _ombres[ko][0] != null:
		_ombres[ko][0].queue_redraw()
	elif _mat_herbe != null:
		_case_ombre(ko)


# chaque aube, des brindilles tombées dans la nuit
func semer_brindilles(n: int) -> void:
	var r := RandomNumberGenerator.new()
	r.randomize()
	for i in n:
		_poser("brindille", Vector2(r.randf_range(-R.DEMI, R.DEMI), r.randf_range(-R.DEMI, R.DEMI)), Color.WHITE, r.randi())


func retirer(o) -> void:
	var k := _cle(o.position)
	if _grille.has(k):
		_grille[k].erase(o)
	var ko := _cle_ombre(o.position)
	if _ombres.has(ko):
		_ombres[ko][1].erase(o)
		if _ombres[ko][0] != null:
			_ombres[ko][0].queue_redraw()
	_effaces.erase(o)
	objets.erase(o)
	o.queue_free()


func _cle(p: Vector2) -> Vector2i:
	return Vector2i(int(floor(p.x / CASE)), int(floor(p.y / CASE)))


func autour(p: Vector2, rayon: float) -> Array:
	var out := []
	var a := _cle(p - Vector2(rayon, rayon))
	var b := _cle(p + Vector2(rayon, rayon))
	for x in range(a.x, b.x + 1):
		for y in range(a.y, b.y + 1):
			for o in _grille.get(Vector2i(x, y), []):
				if is_instance_valid(o) and p.distance_to(o.position) <= rayon:
					out.append(o)
	return out


# ce qui est à prendre le plus près (null : rien à portée)
func plus_proche(p: Vector2, rayon: float):
	var meilleur = null
	var d0 := rayon
	for o in autour(p, rayon):
		if o.epuise():
			continue
		var d: float = p.distance_to(o.position)
		if d < d0:
			d0 = d
			meilleur = o
	return meilleur


# un pas qui bute sur les troncs et les rochers, et reste dans le lieu
func repousser(p: Vector2, r: float) -> Vector2:
	for o in autour(p, r + 22.0):
		var ro: float = o.rayon
		if ro <= 0.0:
			continue
		var d: Vector2 = p - o.position
		var m := r + ro
		var l := d.length()
		if l < m:
			p = (o.position + d / l * m) if l > 0.001 else p + Vector2(m, 0)
	return Vector2(clampf(p.x, -R.DEMI, R.DEMI), clampf(p.y, -R.DEMI, R.DEMI))


# le vent ici, maintenant (environ 0,2 à 1,3) : le même calcul que le shader (shaders/vegetation_vent.gdshaderinc) ; pour le son
func vent(p: Vector2) -> float:
	var t := _temps
	var houle := 0.5 + 0.5 * sin(t * 0.29) * sin(t * 0.11 + 1.3)
	var q := Vector2((p.x + p.y * 0.35) / 520.0 - t * 0.31, (p.y - p.x * 0.35) / 900.0)
	var rafale := smoothstep(0.52, 0.92, _bruit(q) * (0.7 + 0.5 * houle))
	return 0.2 + 0.4 * houle + 0.75 * rafale


static func _hash(p: Vector2) -> float:
	var p3 := Vector3(p.x, p.y, p.x) * 0.1031
	p3 = p3 - p3.floor()
	p3 += Vector3.ONE * p3.dot(Vector3(p3.y, p3.z, p3.x) + Vector3.ONE * 33.33)
	var v := (p3.x + p3.y) * p3.z
	return v - floor(v)


static func _bruit(p: Vector2) -> float:
	var i := p.floor()
	var f := p - i
	var u := f * f * (Vector2(3, 3) - 2.0 * f)
	var a := _hash(i)
	var b := _hash(i + Vector2(1, 0))
	var c := _hash(i + Vector2(0, 1))
	var d := _hash(i + Vector2(1, 1))
	return lerpf(lerpf(a, b, u.x), lerpf(c, d, u.x), u.y)


# --- chaque image : le vent, l'herbe autour de la veilleuse, le soleil des ombres, les couronnes qui s'effacent ---

func _process(delta: float) -> void:
	_temps = fmod(_temps + delta, 3600.0)
	if Objet.vegetation != null:
		Objet.vegetation.set_shader_parameter("temps", _temps)
	if _mat_herbe != null:
		_mat_herbe.set_shader_parameter("temps", _temps)
	if jeu == null:
		return
	var cam = jeu.get("camera")
	if _sol != null and cam != null and is_instance_valid(cam):
		var centre: Vector2 = cam.get_screen_center_position()
		var taille: Vector2 = get_viewport_rect().size / cam.zoom
		_sol.suivre(Rect2(centre - taille * 0.5 - Vector2(160, 160), taille + Vector2(320, 320)))
	if _mat_ombre != null and jeu.has_method("lumiere_du_jour"):
		var t := fmod(float(jeu.horloge), R.DUREE)
		var soir := R.DUREE * (1.0 - float(jeu.part_nuit))
		var u := clampf(t / soir, 0.0, 1.0)
		# (le matin, les ombres filent vers la droite, longues ; à midi, courtes, en bas à droite ; le soir, longues, vers le bas)
		var a := lerpf(0.12, 1.15, u)
		_mat_ombre.set_shader_parameter("soleil", Vector2(cos(a), sin(a) * 0.6) * (0.3 + 0.32 * (1.0 - sin(u * PI))))
		_mat_ombre.set_shader_parameter("jour", jeu.lumiere_du_jour())
	var j = jeu.get("joueur")
	if j == null or not is_instance_valid(j):
		return
	var p: Vector2 = j.position
	if _mat_herbe != null:
		_mat_herbe.set_shader_parameter("veilleuse", p)
	for o in autour(p, 120.0):
		if o.couronne != null and not _effaces.has(o) and o.cache(p):
			_effaces[o] = true
	for o in _effaces.keys():
		if not is_instance_valid(o) or o.couronne == null:
			_effaces.erase(o)
			continue
		var cible := EFFACE if o.cache(p) else 1.0
		var c: Node2D = o.couronne
		c.self_modulate.a = move_toward(c.self_modulate.a, cible, delta * 2.6)
		if c.self_modulate.a >= 1.0 and cible >= 1.0:
			_effaces.erase(o)


# --- les ombres au sol : une case de 420 pixels les dessine toutes, une fois (et de nouveau quand un objet change) ---

func _cle_ombre(p: Vector2) -> Vector2i:
	return Vector2i(int(floor(p.x / CASE_OMBRE)), int(floor(p.y / CASE_OMBRE)))


func _case_ombre(k: Vector2i) -> void:
	if _ombres[k][0] != null or _racine == null:
		return
	var c := Decor.Calque.new()
	c.material = _mat_ombre
	var liste: Array = _ombres[k][1]
	var mobile := _mobile
	c.dessin = func(n: CanvasItem): _dessiner_ombres(n, liste, mobile)
	_racine.add_child(c)
	_ombres[k][0] = c


# un objet a changé (un arbre abattu, un rocher entamé) : son ombre aussi
func ombre_changee(o) -> void:
	var k := _cle_ombre(o.position)
	if _ombres.has(k) and _ombres[k][0] != null:
		_ombres[k][0].queue_redraw()


static func _dessiner_ombres(n: CanvasItem, liste: Array, mobile: bool) -> void:
	var p := Pinceau.new()
	p.commencer(n.get_canvas_item())
	for o in liste:
		if not is_instance_valid(o):
			continue
		for e in o.ombres():
			var portee: float = e[3]
			if portee > 0.0 and mobile:
				continue
			var h: float = e[4]
			var q: Vector2 = o.position + e[0]
			var rr: Vector2 = e[1]
			p.eventail(q, rr.x, rr.y, Color(portee, h / 100.0, 1.0, e[2]), Color(portee, h / 100.0, 0.0, e[2]), 18)
	p.finir()
