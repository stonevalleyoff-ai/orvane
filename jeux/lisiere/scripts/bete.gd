extends Node2D
# Lisière — une bête (scripts/bete.gd)
# Une lignée vraie du monde d'Orvane, dessinée d'après sa planche (le kit : Orvane.texture), à la taille que lui donne sa masse.
# Sa vitesse, son flair, son audace viennent de son plan (vitesse_rel, perception, temperament). Quatre conduites :
#  - proie : elle broute, s'éloigne, fuit quand on approche (plus tôt si l'on court vers elle) ;
#  - rodeur : un chasseur qui vit le jour ; il laisse passer, mais se retourne si l'on s'approche trop ou si on le frappe ;
#  - chasseur : la nuit, il vient vers la veilleuse ; il n'entre pas dans la lumière d'un feu, tourne à sa lisière, et garde
#    ses distances avec une torche (sauf les plus audacieux) ; dans le noir, il mord. À l'aube, il repart ;
#  - echo : une bête qu'on a tuée, revenue la nuit quand la peur est haute ; pâle, lente, elle ne mord pas : elle traverse.

const R := preload("res://scripts/regles.gd")
const Donnees := preload("res://scripts/donnees.gd")

var lignee: Dictionary = {}
var id := ""
var nom := ""
var role := "proie"
var masse := 1.0
var pv := 10.0
var pv_max := 10.0
var vitesse := 80.0
var flair := 160.0
var audace := 0.3
var largeur := 30.0
var vue := false
var regard := 1.0
var etat := "repos"
var maison := Vector2.ZERO
var oeil := Vector3(150.0, 40.0, 2.0)
var jeu
var sprite: Sprite2D
var robe := Color(0.4, 0.33, 0.25)
var _cible := Vector2.ZERO
var _t := 0.0
var _duree := 2.0
var _morsure := 0.0
var _flash := 0.0
var _sens := 1.0
var _apparition := 0.0
var _fuite_de := Vector2.ZERO


func preparer(e: Dictionary, r: String, j, biome: String) -> void:
	jeu = j
	lignee = e["lignee"]
	id = str(e["id"])
	nom = Donnees.nom_court(lignee)
	role = r
	masse = float(e["masse"])
	var plan: Dictionary = lignee.get("plan", {})
	largeur = clampf(26.0 * pow(masse, 0.28), 16.0, 150.0)
	pv_max = 8.0 + 22.0 * log(masse + 1.0) / log(10.0)
	pv = pv_max
	vitesse = 45.0 + 15.0 * float(plan.get("vitesse_rel", 4.0))
	flair = 90.0 + 230.0 * float(plan.get("perception", 0.5))
	audace = float(plan.get("temperament", 0.3))
	_sens = 1.0 if randf() < 0.5 else -1.0
	var k = plan.get("corps", {}).get("couleurs", {}).get("robe", [])
	if typeof(k) == TYPE_ARRAY and k.size() >= 3:
		robe = Color8(int(k[0]), int(k[1]), int(k[2]))
	# l'image est faite deux fois plus large qu'on ne la montre : elle reste nette sous le zoom
	var tex: ImageTexture = Orvane.texture(id, largeur * 2.0, biome)
	if tex != null:
		sprite = Sprite2D.new()
		sprite.texture = tex
		sprite.centered = false
		sprite.scale = Vector2(0.5, 0.5)
		sprite.position = Vector2(-largeur * 0.5, -largeur * 86.0 / 170.0)
		add_child(sprite)
	var y: Array = Orvane.yeux(id, biome)
	if not y.is_empty():
		oeil = y[0]
	if role == "echo":
		modulate = Color(0.75, 0.88, 1.0, 0.0)


# où brille son œil, dans le monde (le dessin regarde à droite ; retourné, l'œil passe de l'autre côté)
func point_oeil() -> Vector2:
	var k := largeur / 170.0
	return position + Vector2((oeil.x - 85.0) * k * regard, (oeil.y - 86.0) * k)


func rayon_oeil() -> float:
	return maxf(1.3, oeil.z * largeur / 170.0 * 1.25)


func blesser(n: float, depuis: Vector2) -> void:
	if pv <= 0.0:
		return
	pv -= n
	_flash = 0.14
	position += (position - depuis).normalized() * 10.0
	if pv <= 0.0:
		# (queue_free attend la fin de l'image : hors du groupe tout de suite, pour qu'un second coup ne la tue pas deux fois)
		remove_from_group("betes")
		jeu.bete_tuee(self)
		queue_free()
		return
	match role:
		"proie":
			_fuir(depuis, 4.0)
		"rodeur":
			if masse >= 4.0 and pv > pv_max * 0.4:
				_changer("attaque", 6.0)
			else:
				_fuir(depuis, 4.0)
		"chasseur":
			if pv < pv_max * 0.4 or randf() < 0.25:
				_fuir(depuis, 2.5)


func _changer(e: String, duree: float) -> void:
	etat = e
	_t = 0.0
	_duree = duree


func _fuir(depuis: Vector2, duree: float) -> void:
	_fuite_de = depuis
	_changer("fuit", duree)


func _process(delta: float) -> void:
	if jeu == null or jeu.joueur == null or jeu.en_pause:
		return
	_t += delta
	_morsure = maxf(0.0, _morsure - delta)
	if _flash > 0.0:
		_flash -= delta
	match role:
		"proie":
			_proie(delta)
		"rodeur":
			_rodeur(delta)
		"chasseur":
			_chasseur(delta)
		"echo":
			_echo(delta)
	if role != "echo":
		modulate = Color(1.0, 0.6, 0.55) if _flash > 0.0 else Color.WHITE
	if sprite != null:
		sprite.flip_h = regard < 0.0
	queue_redraw()


func _aller(vers: Vector2, v: float, delta: float) -> void:
	var d := vers - position
	var l := d.length()
	if l < 1.5:
		return
	var pas := d / l * minf(l, v * delta)
	position += pas
	if absf(pas.x) > 0.02:
		regard = signf(pas.x)
	position = Vector2(clampf(position.x, -R.DEMI, R.DEMI), clampf(position.y, -R.DEMI, R.DEMI))


func _errer(delta: float) -> void:
	if etat == "repos":
		if _t > _duree:
			_cible = maison + Vector2.from_angle(randf() * TAU) * randf_range(30.0, 190.0)
			_changer("marche", randf_range(2.0, 6.0))
	else:
		_aller(_cible, vitesse * 0.3, delta)
		if _t > _duree or position.distance_to(_cible) < 4.0:
			_changer("repos", randf_range(1.0, 4.0))


func _loin_de(p: Vector2) -> Vector2:
	var d := position - p
	return position + (d.normalized() if d.length() > 0.01 else Vector2.RIGHT) * 240.0


func _proie(delta: float) -> void:
	var j = jeu.joueur
	var dj := position.distance_to(j.position)
	if etat != "fuit" and dj < flair * (1.0 if j.en_mouvement else 0.55):
		_fuir(j.position, randf_range(3.0, 5.0))
	if etat == "fuit":
		_aller(_loin_de(j.position if dj < 400.0 else _fuite_de), vitesse, delta)
		if _t > _duree:
			maison = position
			_changer("repos", 1.0)
	else:
		_errer(delta)


func _rodeur(delta: float) -> void:
	var j = jeu.joueur
	var dj := position.distance_to(j.position)
	if etat == "fuit":
		_aller(_loin_de(j.position), vitesse, delta)
		if _t > _duree:
			maison = position
			_changer("repos", 1.0)
		return
	if etat != "attaque" and dj < 70.0 + largeur * 0.3 and masse >= 4.0 and randf() < audace * delta * 3.0:
		_changer("attaque", 6.0)
	if etat == "attaque":
		_aller(j.position, vitesse * 0.85, delta)
		_mordre_si_pres(dj)
		if _t > _duree:
			_changer("repos", 2.0)
		return
	_errer(delta)


func _chasseur(delta: float) -> void:
	var j = jeu.joueur
	var dj := position.distance_to(j.position)
	if jeu.est_jour() and etat != "part":
		_changer("part", 30.0)
	if etat == "part":
		_aller(_loin_de(j.position), vitesse, delta)
		if dj > 1100.0 or _t > _duree:
			queue_free()
		return
	if etat == "fuit":
		_aller(_loin_de(j.position), vitesse * 1.1, delta)
		if _t > _duree:
			_changer("chasse", 999.0)
		return
	# la cible : la veilleuse ; mais pas dans la lumière d'un feu, ni trop près d'une torche
	var but: Vector2 = j.position
	var retenu := false
	var feu = jeu.feu_qui_protege(j.position)
	if feu != null:
		var c: Vector2 = feu.position
		var bord: float = feu.rayon() * 0.85
		var ici := position - c
		var a := ici.angle() + _sens * 0.55
		but = c + Vector2.from_angle(a) * (bord + 16.0)
		retenu = true
	elif j.torche > 0.0 and dj < 140.0 and audace < 0.75:
		but = j.position + (position - j.position).normalized() * 145.0
		retenu = true
	_aller(but, vitesse * (0.5 if retenu else 0.9), delta)
	# (le feu a grandi sous elle : la bête recule hors de sa lumière)
	for f in jeu.feux:
		if is_instance_valid(f) and f.allume():
			var ici2: Vector2 = position - f.position
			var bord2: float = f.rayon() * 0.8
			if ici2.length() < bord2:
				position = f.position + ici2.normalized() * bord2
	if not retenu:
		_mordre_si_pres(dj)
	if randf() < delta * 0.08 and dj < 420.0:
		jeu.grognement(self)


func _mordre_si_pres(dj: float) -> void:
	if dj < 24.0 + largeur * 0.3 and _morsure <= 0.0:
		_morsure = 1.15
		jeu.mordre(self)


func _echo(delta: float) -> void:
	var j = jeu.joueur
	_apparition = minf(1.0, _apparition + delta * 0.4)
	var fin: bool = jeu.est_jour() or j.peur < 30.0
	if fin:
		_apparition = maxf(0.0, _apparition - delta * 0.9)
		if _apparition <= 0.0:
			queue_free()
	var but: Vector2 = j.position + Vector2(sin(_t * 0.7) * 50.0, cos(_t * 0.5) * 30.0)
	_aller(but, 32.0, delta)
	modulate = Color(0.75, 0.88, 1.0, (0.32 + 0.18 * sin(_t * 3.1)) * _apparition)
	if not fin and position.distance_to(j.position) < 22.0:
		jeu.toucher_echo(self)


func _draw() -> void:
	if role != "echo":
		_ellipse(Vector2(0, 1), largeur * 0.36, largeur * 0.09, Color(0, 0, 0, 0.25))
	if sprite == null:
		# (pas de planche pour cette lignée : une silhouette simple, à sa taille et dans sa robe)
		var k := largeur
		var s := regard
		_ellipse(Vector2(0, -k * 0.3), k * 0.4, k * 0.19, robe)
		draw_circle(Vector2(s * k * 0.42, -k * 0.42), k * 0.13, robe.darkened(0.15))
		for x in [-0.25, -0.12, 0.15, 0.27]:
			draw_line(Vector2(x * k, -k * 0.18), Vector2(x * k, 0), robe.darkened(0.35), maxf(1.5, k * 0.05))
	if role == "echo":
		var police := ThemeDB.fallback_font
		draw_string(police, Vector2(-80, 14), nom, HORIZONTAL_ALIGNMENT_CENTER, 160.0, 11, Color(0.8, 0.9, 1.0, 0.8))
	elif pv < pv_max and pv > 0.0:
		var w := maxf(18.0, largeur * 0.5)
		var y := -largeur * 0.62 - 6.0
		draw_rect(Rect2(-w * 0.5, y, w, 3.0), Color(0, 0, 0, 0.5))
		draw_rect(Rect2(-w * 0.5, y, w * pv / pv_max, 3.0), Color(0.8, 0.25, 0.2))


func _ellipse(c: Vector2, rx: float, ry: float, couleur: Color) -> void:
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, couleur)
