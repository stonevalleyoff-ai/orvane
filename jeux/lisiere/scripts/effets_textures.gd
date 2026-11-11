extends RefCounted
# Lisière — les textures des effets (scripts/effets_textures.gd)
# Toutes faites par le code, une seule fois, et gardées : un point doux (fumée, halos, neige), une étincelle, une feuille, un
# éclat (pierre, encre), un brin (herbe, brindille), une lueur au sol, un bruit sans couture (la brume), un carré blanc (les
# shaders qui dessinent tout eux-mêmes). Rien ne vient d'ailleurs.

const P := preload("res://scripts/palette.gd")

static var _cache := {}


# un disque blanc, plein au centre, qui s'efface vers le bord (doux, sans bord)
static func point_doux() -> Texture2D:
	if not _cache.has("point_doux"):
		_cache["point_doux"] = _radial(64, [[0.0, 1.0], [0.25, 0.82], [0.55, 0.36], [0.8, 0.1], [1.0, 0.0]])
	return _cache["point_doux"]


# une étincelle : un cœur net, un halo court
static func etincelle() -> Texture2D:
	if not _cache.has("etincelle"):
		_cache["etincelle"] = _radial(16, [[0.0, 1.0], [0.3, 0.95], [0.5, 0.45], [0.75, 0.1], [1.0, 0.0]])
	return _cache["etincelle"]


# la lueur au sol, sous le feu : un dégradé blanc (la couleur vient de qui la pose)
static func lueur() -> Texture2D:
	if not _cache.has("lueur"):
		_cache["lueur"] = _radial(128, [[0.0, 1.0], [0.2, 0.7], [0.45, 0.32], [0.7, 0.1], [1.0, 0.0]])
	return _cache["lueur"]


static func _radial(n: int, pas: Array) -> Texture2D:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array(pas.map(func(x): return float(x[0])))
	g.colors = PackedColorArray(pas.map(func(x): return Color(1, 1, 1, float(x[1]))))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.width = n
	t.height = n
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	return t


# une feuille, pointue aux deux bouts, une nervure plus claire (blanche : la couleur vient des particules)
static func feuille() -> Texture2D:
	if not _cache.has("feuille"):
		var img := Image.create(16, 16, false, Image.FORMAT_RGBA8)
		for y in 16:
			for x in 16:
				var u := (y + 0.5) / 16.0
				var w := 0.36 * pow(sin(PI * u), 0.8)
				var d := absf((x + 0.5) / 16.0 - 0.5)
				var a := clampf((w - d) * 16.0, 0.0, 1.0)
				var v := 0.78 if d < 0.04 and u > 0.12 else 1.0 - 0.25 * d / maxf(w, 0.01)
				img.set_pixel(x, y, Color(v, v, v, a))
		_cache["feuille"] = ImageTexture.create_from_image(img)
	return _cache["feuille"]


# un éclat : un petit polygone anguleux, une face plus claire
static func eclat() -> Texture2D:
	if not _cache.has("eclat"):
		var img := Image.create(12, 12, false, Image.FORMAT_RGBA8)
		var pts := [Vector2(2, 3), Vector2(7, 1), Vector2(11, 5), Vector2(9, 10), Vector2(3, 11), Vector2(1, 7)]
		for y in 12:
			for x in 12:
				var p := Vector2(x + 0.5, y + 0.5)
				if Geometry2D.is_point_in_polygon(p, PackedVector2Array(pts)):
					var v := 1.0 if p.x + p.y < 11.0 else 0.72
					img.set_pixel(x, y, Color(v, v, v, 1.0))
		_cache["eclat"] = ImageTexture.create_from_image(img)
	return _cache["eclat"]


# un brin : un trait fin, plus épais à la base
static func brin() -> Texture2D:
	if not _cache.has("brin"):
		var img := Image.create(4, 16, false, Image.FORMAT_RGBA8)
		for y in 16:
			for x in 4:
				var w := 0.6 + 1.2 * y / 15.0
				var a := clampf(w - absf(x + 0.5 - 2.0) + 0.5, 0.0, 1.0)
				img.set_pixel(x, y, Color(1, 1, 1, a))
		_cache["brin"] = ImageTexture.create_from_image(img)
	return _cache["brin"]


# un bruit doux, sans couture (il se répète sans qu'on voie la jointure) : la brume, l'encre
static func bruit() -> Texture2D:
	if not _cache.has("bruit"):
		var n := FastNoiseLite.new()
		n.seed = 11
		n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
		n.frequency = 0.012
		n.fractal_octaves = 4
		n.fractal_gain = 0.55
		var img := n.get_seamless_image(256, 256, false, false, 0.1, true)
		img.convert(Image.FORMAT_L8)
		img.generate_mipmaps()
		_cache["bruit"] = ImageTexture.create_from_image(img)
	return _cache["bruit"]


# un carré blanc : un support pour les shaders qui dessinent tout eux-mêmes (UV de 0 à 1)
static func blanc() -> Texture2D:
	if not _cache.has("blanc"):
		var img := Image.create(4, 4, false, Image.FORMAT_RGBA8)
		img.fill(Color.WHITE)
		_cache["blanc"] = ImageTexture.create_from_image(img)
	return _cache["blanc"]


# une rampe de couleurs (des paires [position, couleur])
static func rampe(pas: Array) -> Gradient:
	var g := Gradient.new()
	g.offsets = PackedFloat32Array(pas.map(func(x): return float(x[0])))
	g.colors = PackedColorArray(pas.map(func(x): return x[1]))
	return g


# une courbe de 0 à 1 (des paires [position, valeur])
static func courbe(pas: Array) -> Curve:
	var c := Curve.new()
	for x in pas:
		c.add_point(Vector2(float(x[0]), float(x[1])))
	return c


# un matériau : additif (ce qui brille) ou mélangé, éclairé par les lumières ou non
static func materiau(additif: bool, eclaire: bool) -> CanvasItemMaterial:
	var cle := "mat_%s_%s" % [additif, eclaire]
	if not _cache.has(cle):
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD if additif else CanvasItemMaterial.BLEND_MODE_MIX
		m.light_mode = CanvasItemMaterial.LIGHT_MODE_NORMAL if eclaire else CanvasItemMaterial.LIGHT_MODE_UNSHADED
		_cache[cle] = m
	return _cache[cle]
