extends Node2D
# Lisière — le sol, cuit par tuiles (scripts/decor_sol.gd)
# Le shader du sol (shaders/sol_peint.gdshader) est riche, donc cher à peindre au pixel à chaque image, surtout sur un téléphone.
# On le peint donc une fois par tuile de 512 pixels du monde, quand la caméra en approche : un « peintre » (une SubViewport, qu'on
# n'ajoute à l'arbre que le temps de peindre) la rend, on la copie dans une image, et à l'écran la tuile n'est plus qu'un sprite,
# net (un texel par pixel de l'écran, au zoom du jeu). Quelques tuiles servent tour à tour : celle qui a servi le moins récemment
# est repeinte ailleurs. monde.gd appelle suivre() à chaque image.

const TUILE := 512.0
const BORD := 2                # des texels de plus autour de chaque tuile : pas de couture entre deux tuiles
const LIMITE := 6              # au-delà de ces tuiles (6 × 512 = 3 072 pixels du centre), il n'y a que le noir
const GARDEES := 20            # les tuiles gardées en mémoire

var materiau: ShaderMaterial
var densite := 1.35
var _tuiles := {}              # tuile → [Sprite2D, ImageTexture, quand elle a servi]
var _peintres: Array = []      # les SubViewports, hors de l'arbre quand elles ne peignent pas
var _en_cours: Array = []      # [peintre, tuile], peints à l'image d'avant : à copier
var _tour := 0


func preparer(m: ShaderMaterial, d: float) -> void:
	materiau = m
	densite = d


func _taille() -> int:
	return int(ceil(TUILE * densite)) + BORD * 2


func _peintre() -> SubViewport:
	if not _peintres.is_empty():
		return _peintres.pop_back()
	var vp := SubViewport.new()
	var t := _taille()
	vp.size = Vector2i(t, t)
	vp.disable_3d = true
	vp.transparent_bg = false
	vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
	var quad := Peinture.new()
	quad.material = materiau
	vp.add_child(quad)
	return vp


# la caméra regarde ce rectangle du monde : chaque tuile qu'il touche doit être peinte (les plus proches du centre d'abord)
func suivre(vue: Rect2) -> void:
	_tour += 1
	# ce qui a été peint à l'image d'avant devient une image, et le peintre sort de l'arbre
	for e in _en_cours:
		var vp: SubViewport = e[0]
		var k: Vector2i = e[1]
		var img := vp.get_texture().get_image()
		remove_child(vp)
		_peintres.append(vp)
		if _tuiles.has(k) and img != null and not img.is_empty():
			var t: Array = _tuiles[k]
			if t[1] == null:
				t[1] = ImageTexture.create_from_image(img)
			else:
				t[1].update(img)
			t[0].texture = t[1]
	_en_cours.clear()
	var a := (vue.position / TUILE).floor()
	var b := (vue.end / TUILE).floor()
	var centre := vue.get_center() / TUILE - Vector2(0.5, 0.5)
	var manque := []
	for x in range(maxi(int(a.x), -LIMITE), mini(int(b.x), LIMITE - 1) + 1):
		for y in range(maxi(int(a.y), -LIMITE), mini(int(b.y), LIMITE - 1) + 1):
			var k := Vector2i(x, y)
			if _tuiles.has(k):
				_tuiles[k][2] = _tour
			else:
				manque.append(k)
	if manque.is_empty():
		return
	manque.sort_custom(func(u, v): return Vector2(u).distance_squared_to(centre) < Vector2(v).distance_squared_to(centre))
	# (au début, tout l'écran d'un coup ; ensuite, deux tuiles par image au plus)
	var n := manque.size() if _tuiles.is_empty() else mini(2, manque.size())
	for i in n:
		var k: Vector2i = manque[i]
		var vp := _peintre()
		var t := float(_taille() - BORD * 2)
		var e := t / TUILE
		var origine := Vector2(k) * TUILE
		add_child(vp)
		vp.canvas_transform = Transform2D(0.0, Vector2(e, e), 0.0, -origine * e + Vector2(BORD, BORD))
		vp.render_target_update_mode = SubViewport.UPDATE_ONCE
		_en_cours.append([vp, k])
		# (le temps de la copie, la tuile montre ce que peint son peintre)
		var place := _place()
		place[0].texture = vp.get_texture()
		place[0].position = origine
		place[2] = _tour
		_tuiles[k] = place


# une place pour une tuile : neuve, ou reprise à celle qui a servi le moins récemment (et ne se peint pas)
func _place() -> Array:
	if _tuiles.size() < GARDEES:
		var s := Sprite2D.new()
		s.centered = false
		s.region_enabled = true
		var t := float(_taille())
		s.region_rect = Rect2(BORD, BORD, t - BORD * 2, t - BORD * 2)
		s.scale = Vector2.ONE * TUILE / (t - BORD * 2)
		add_child(s)
		move_child(s, 0)
		return [s, null, _tour]
	var vieille = null
	var age := _tour
	for c in _tuiles:
		if _tuiles[c][2] < age:
			age = _tuiles[c][2]
			vieille = c
	var e: Array = _tuiles[vieille]
	_tuiles.erase(vieille)
	return e


func _exit_tree() -> void:
	for vp in _peintres:
		vp.free()
	_peintres.clear()


# ce que peint chaque peintre : un grand rectangle, en coordonnées du monde, que sa transformation cadre sur la tuile
class Peinture extends Node2D:
	func _draw() -> void:
		var l := TUILE * (LIMITE + 1)
		draw_rect(Rect2(-l, -l, l * 2.0, l * 2.0), Color.WHITE)
