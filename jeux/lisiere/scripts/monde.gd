extends Node2D
# Lisière — le lieu (scripts/monde.gd)
# Un carré de terre, tiré du biome d'Orvane qu'on joue : son couvert fait les arbres (des sapins s'il fait froid), son humidité
# les buissons et l'herbe, son altitude les rochers, sa température et son humidité la couleur du sol. Les objets sont rangés
# dans une grille, pour trouver vite ce qui est à portée. Ce nœud trie ses enfants par hauteur (y_sort_enabled) : le joueur, les
# bêtes et les feux y vivent aussi.

const R := preload("res://scripts/regles.gd")
const Objet := preload("res://scripts/objet.gd")
const CASE := 200.0

var jeu
var objets: Array = []
var palette := {}
var _grille := {}
# (docs/49) les plantes du lieu, d'après l'herbier d'Orvane : par genre d'objet, celles qu'on sème et leur poids
var lieu := ""
var flore := {}


# les couleurs du lieu, d'après ses axes (0 à 1)
static func couleurs(axes: Dictionary) -> Dictionary:
	var temp := float(axes.get("temperature", 0.5))
	var humid := float(axes.get("humidite", 0.5))
	var couvert := float(axes.get("couvert", 0.4))
	var sol := Color(0.42, 0.37, 0.24).lerp(Color(0.2, 0.27, 0.14), humid)
	sol = sol.lerp(Color(0.7, 0.73, 0.75), clampf((0.25 - temp) * 3.0, 0.0, 1.0))
	sol = sol.lerp(Color(0.14, 0.16, 0.11), couvert * 0.55)
	var feuilles := Color(0.38, 0.4, 0.18).lerp(Color(0.13, 0.28, 0.15), humid)
	feuilles = feuilles.lerp(Color(0.12, 0.22, 0.2), clampf((0.35 - temp) * 3.0, 0.0, 1.0))
	return {"sol": sol, "feuilles": feuilles, "herbe": sol.lerp(feuilles, 0.6).lightened(0.05), "pierre": Color(0.45, 0.44, 0.42).lerp(sol, 0.2),
		"froid": temp < 0.35}


# le sol (une texture douce, tirée d'un bruit), ses détails, et la lisière qui ferme le lieu : à poser sous ce nœud
func creer_sol(biome: Dictionary, graine: int) -> Node2D:
	palette = couleurs(biome.get("axes", {}))
	var racine := Node2D.new()
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	var bruit := FastNoiseLite.new()
	bruit.seed = graine
	bruit.frequency = 0.045
	var c: Color = palette["sol"]
	for y in 128:
		for x in 128:
			var v := bruit.get_noise_2d(x, y)
			img.set_pixel(x, y, c.darkened(0.12).lerp(c.lightened(0.08), (v + 1.0) * 0.5))
	var sol := Sprite2D.new()
	sol.texture = ImageTexture.create_from_image(img)
	sol.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	var k := R.DEMI * 2.6 / 128.0
	sol.scale = Vector2(k, k)
	racine.add_child(sol)
	var details := Details.new()
	details.palette = palette
	details.graine = graine
	racine.add_child(details)
	return racine


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
# buisson, une touffe une herbe, un roseau, une succulente ou un lichen. Chacune a son poids (sa part du lieu) et sa taille à l'écran,
# d'après sa hauteur vraie. Sans herbier, rien : les objets se dessinent eux-mêmes, comme avant.
const PORTS := {"arbre": ["arbre"], "buisson": ["buisson"], "touffe": ["herbe", "roseau", "succulente", "lichen", "champignon"]}

func _lire_flore(arbre: String) -> void:
	flore = {}
	for e in Orvane.plantes(lieu):
		var port := str(e.get("port", e.get("forme", "")))
		for genre in PORTS:
			if not PORTS[genre].has(port):
				continue
			var h := float(e.get("hauteur_m", 1.0))
			# (la hauteur à l'écran : un arbre de 6 m fait 80 pixels, un arbre de 60 m 150 ; un buisson de 26 à 60 ; une touffe de 16 à 44)
			var px := clampf(80.0 + 30.0 * log(h / 6.0) / log(2.2), 60.0, 150.0) if genre == "arbre" else clampf(26.0 + 16.0 * h, 26.0, 60.0) if genre == "buisson" else clampf(16.0 + 14.0 * h, 16.0, 44.0)
			var g := arbre if genre == "arbre" else str(genre)
			if not flore.has(g):
				flore[g] = []
			flore[g].append({"id": str(e["id"]), "poids": maxf(0.02, float(e.get("part", 0.0))), "largeur": px * 0.8})


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
		o.image = Orvane.texture_plante(str(pl["id"]), float(pl["largeur"]), lieu)
		o.plante = str(pl["id"])
	o.position = p
	add_child(o)
	objets.append(o)
	var k := _cle(p)
	if not _grille.has(k):
		_grille[k] = []
	_grille[k].append(o)


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


# --- les détails du sol (des brins, des cailloux) et la lisière : dessinés une fois ---

class Details extends Node2D:
	const RG := preload("res://scripts/regles.gd")
	var palette := {}
	var graine := 0

	func _draw() -> void:
		var r := RandomNumberGenerator.new()
		r.seed = graine + 7
		var herbe: Color = palette.get("herbe", Color(0.3, 0.35, 0.2))
		var sol: Color = palette.get("sol", Color(0.3, 0.3, 0.2))
		for i in 1600:
			var p := Vector2(r.randf_range(-RG.DEMI, RG.DEMI), r.randf_range(-RG.DEMI, RG.DEMI))
			if r.randf() < 0.75:
				var h := r.randf_range(3.0, 7.0)
				draw_line(p, p + Vector2(r.randf_range(-2, 2), -h), herbe.darkened(r.randf_range(0.0, 0.35)), 1.0)
				draw_line(p + Vector2(2, 0), p + Vector2(2.0 + r.randf_range(-2, 2), -h * 0.7), herbe.darkened(r.randf_range(0.1, 0.4)), 1.0)
			else:
				draw_circle(p, r.randf_range(1.0, 2.2), sol.lightened(r.randf_range(0.05, 0.2)))
		# la lisière : au-delà du lieu, une forêt noire et serrée, qu'on ne traverse pas
		var nuit := Color(0.05, 0.06, 0.07)
		var bord := RG.DEMI + 40.0
		var loin := RG.DEMI + 900.0
		draw_rect(Rect2(-loin, -loin, loin * 2.0, loin - bord), nuit)
		draw_rect(Rect2(-loin, bord, loin * 2.0, loin - bord), nuit)
		draw_rect(Rect2(-loin, -bord, loin - bord, bord * 2.0), nuit)
		draw_rect(Rect2(bord, -bord, loin - bord, bord * 2.0), nuit)
		var x := -bord
		while x < bord:
			for cote in [Vector2(x, -bord), Vector2(x, bord), Vector2(-bord, x), Vector2(bord, x)]:
				draw_circle(cote + Vector2(r.randf_range(-12, 12), r.randf_range(-12, 12)), r.randf_range(26.0, 44.0), nuit.lightened(r.randf_range(0.0, 0.06)))
			x += 46.0
