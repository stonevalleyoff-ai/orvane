extends Node2D
# Lisière — une bête (scripts/bete.gd)
# Une lignée vraie du monde d'Orvane, dessinée d'après sa planche, à la taille que lui donne sa masse.
# Sa vitesse, son flair, son audace viennent de son plan (vitesse_rel, perception, temperament). Quatre conduites :
#  - proie : elle broute, s'éloigne, fuit quand on approche (plus tôt si l'on court vers elle) ;
#  - rodeur : un chasseur qui vit le jour ; il laisse passer, mais se retourne si l'on s'approche trop ou si on le frappe ;
#  - chasseur : la nuit, il vient vers la veilleuse ; il n'entre pas dans la lumière d'un feu, tourne à sa lisière, et garde
#    ses distances avec une torche (sauf les plus audacieux) ; dans le noir, il mord. À l'aube, il repart ;
#  - echo : une bête qu'on a tuée, revenue la nuit quand la peur est haute ; pâle, lente, elle ne mord pas : elle traverse.
# Elle bouge d'après sa planche (scripts/squelette.gd) : ses pattes marchent pour de vrai, à la cadence de sa vitesse ; son corps
# oscille au pas, respire au repos, bondit dans la fuite, se fait bas à la lisière du feu ; frappée, elle sursaute ; tuée, elle
# tombe sur le flanc et son encre s'efface ; sans pattes, tout son corps ondule ; revenue en écho, c'est une fumée d'encre pâle.

const R := preload("res://scripts/regles.gd")
const Donnees := preload("res://scripts/donnees.gd")
const P := preload("res://scripts/palette.gd")
const Squelette := preload("res://scripts/squelette.gd")
const SHADER_ENCRE := preload("res://shaders/bete_encre.gdshader")
const CHUTE := 0.55              # elle tombe (secondes)
const GISANT := 0.7              # elle reste couchée
const EFFACEMENT := 1.6          # son encre s'efface
const BARRE := 2.6               # la barre de vie reste visible, après un coup

# (une couche dessinée par la bête : les pattes de derrière, celles de devant, la barre, la traîne d'un écho)
class Calque extends Node2D:
	var peindre: Callable

	func _draw() -> void:
		if peindre.is_valid():
			peindre.call(self)


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
var _apparition := 0.0
var _fuite_de := Vector2.ZERO
var _retenu := false
var _sens := 1.0

# l'animation
var _sq: Dictionary = {}
var _pivot: Node2D
var _loin: Calque
var _pres: Calque
var _dessus: Sprite2D
var _tete: Sprite2D
var _haut: Calque
var _traine: Calque
var _mat: ShaderMaterial
var _fin := true                 # qualité haute (un ordinateur)
var _premiere := true
var _avant := Vector2.ZERO
var _vit := Vector2.ZERO
var _v_lisse := 0.0
var _accel := 0.0
var _phase := 0.0
var _foulee_eff := 1.0
var _face := 1.0
var _marche := 0.0
var _affut := 0.0
var _course := 0.0
var _bond := 0.0
var _foulee := 0.9
var _appui := 0.62
var _levee := 0.3
var _bas := 0.0
var _tangage := 0.0
var _souffle := 0.0
var _anim := 0.0
var _recul := Vector2.ZERO
var _ressort := 0.0
var _ressort_v := 0.0
var _derobe := 0.0
var _eclat := 0.0
var _depuis_coup := 99.0
var _geste := ""
var _geste_t := 1.0
var _tete_rot := 0.0
var _tete_d := Vector2.ZERO
var _leve := 0.0                 # de combien le corps est levé (un bond, un écho qui flotte), pour l'ombre
var _onde_phase := 0.0
var _mort := -1.0
var _cote_chute := 1.0
var _impact := false
var _dissipe := -1.0
var _t_corps := Transform2D.IDENTITY
var _t_tete := Transform2D.IDENTITY
var _pieds: Array = []
var _rot_pieds := PackedFloat32Array()
var _dec_pas := PackedFloat32Array()
var _dec_affut := PackedFloat32Array()
var _dec_bond := PackedFloat32Array()
var _sillage := PackedVector2Array()
var _sillage_t := 0.0
var _miettes: Array = []
var _params := {}
var _a_l_ecran := true
# (lu à chaque image : sorti du squelette une fois pour toutes)
var _H := 10.0
var _c := Vector2.ZERO
var _ventre := 0.0
var _n_cote := 0
var _sans := true
var _p_pts: Array[PackedVector2Array] = []
var _p_rel: Array[PackedVector2Array] = []
var _p_l1 := PackedFloat32Array()
var _p_l2 := PackedFloat32Array()
var _p_plie := PackedFloat32Array()
var _p_ang := PackedFloat32Array()
var _p_portee := PackedFloat32Array()
var _p_devant: Array[bool] = []
static var _ombre_tex: ImageTexture
static var _vue_image := -1
static var _vue := Rect2()
static var _cercle := PackedVector2Array()


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
	_fin = j == null or str(j.qualite) != "mobile"
	var y: Array = Orvane.yeux(id, biome)
	if not y.is_empty():
		oeil = y[0]
	# (le squelette tiré de la planche : le corps, la tête à part, chaque patte ; l'image est faite deux fois plus large qu'on
	# ne la montre, elle reste nette sous le zoom)
	_sq = Squelette.lire(id + "|" + biome, Orvane._silhouette(id, biome), largeur)
	if not _sq.is_empty():
		_monter()
	regard = 1.0 if randf() < 0.5 else -1.0
	_face = regard
	_souffle = randf() * TAU
	_phase = randf()
	if role == "echo":
		modulate = Color(1.0, 1.0, 1.0, 0.0)


func _monter() -> void:
	_mat = ShaderMaterial.new()
	_mat.shader = SHADER_ENCRE
	_mat.set_shader_parameter("hauteur", maxf(4.0, -float(_sq["haut"])))
	_mat.set_shader_parameter("fin", _fin)
	_mat.set_shader_parameter("couleur_encre", P.ENCRE)
	_mat.set_shader_parameter("couleur_eclat", P.PAPIER.lightened(0.55))
	_mat.set_shader_parameter("couleur_echo", P.ECHO)
	if role == "echo":
		_mat.set_shader_parameter("echo", 1.0)
		_traine = Calque.new()
		_traine.peindre = _peindre_traine
		_traine.material = _mat
		add_child(_traine)
	_pivot = Node2D.new()
	add_child(_pivot)
	var avec_pattes: bool = not _sq["sans_pattes"]
	_H = _sq["jambe"]
	_c = _sq["centre"]
	_ventre = _sq["ventre"]
	_sans = _sq["sans_pattes"]
	_n_cote = 0 if _sq["pattes"].is_empty() else int(_sq["pattes"][0]["n_cote"])
	for p in _sq["pattes"]:
		_p_pts.append(p["pts"])
		_p_rel.append(p["rel"])
		_p_l1.append(p["l1"])
		_p_l2.append(p["l2"])
		_p_plie.append(p["plie"])
		_p_ang.append(p["ang_bas"])
		_p_portee.append(p["portee"])
		_p_devant.append(p["devant"])
	if avec_pattes:
		_loin = Calque.new()
		_loin.peindre = _peindre_loin
		_loin.material = _mat
		_pivot.add_child(_loin)
	sprite = _calque_sprite(_sq["corps"])
	if avec_pattes:
		_pres = Calque.new()
		_pres.peindre = _peindre_pres
		_pres.material = _mat
		_pivot.add_child(_pres)
	if not _sq["dessus"].is_empty():
		_dessus = _calque_sprite(_sq["dessus"])
	if not _sq["tete"].is_empty():
		_tete = _calque_sprite(_sq["tete"])
	_haut = Calque.new()
	_haut.peindre = _peindre_haut
	add_child(_haut)
	if avec_pattes:
		_decalages()
		for p in _sq["pattes"]:
			_pieds.append(p["pts"])
			_rot_pieds.append(0.0)
	else:
		_mat.set_shader_parameter("onde_vagues", 1.2 if largeur < 60.0 else 1.6)


func _calque_sprite(c: Dictionary) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = c["tex"]
	s.centered = false
	s.offset = c["pos"] * 2.0
	s.scale = Vector2(0.5, 0.5)
	s.material = _mat
	_pivot.add_child(s)
	return s


# la phase de chaque patte dans le cycle (0 à 1), pour chaque allure : le pas (en diagonale à quatre pattes, en trépied à six,
# en alternance à deux), l'affût (une patte après l'autre), le bond (les deux avant, puis les deux arrière)
func _decalages() -> void:
	for p in _sq["pattes"]:
		var rg: int = p["rang"]
		var n: int = p["n_cote"]
		var loin: bool = p["loin"]
		var a := 0.0
		var b := 0.0
		var c := 0.0
		if n == 1:
			a = 0.5 if loin else 0.0
			b = a
			c = a
		elif n == 2:
			if rg == 0:
				a = 0.08 if loin else 0.58
				b = 0.25 if loin else 0.75
				c = 0.07 if loin else 0.0
			else:
				a = 0.5 if loin else 0.0
				b = 0.0 if loin else 0.5
				c = 0.3 if loin else 0.24
		else:
			a = 0.5 * float((rg + (1 if loin else 0)) % 2)
			b = fposmod(float(rg) * 0.2 + (0.5 if loin else 0.0), 1.0)
			c = a
		_dec_pas.append(a)
		_dec_affut.append(b)
		_dec_bond.append(c)


# où brille son œil, dans le monde : il suit la tête, le pas, le souffle, le retournement
func point_oeil() -> Vector2:
	var k := largeur / 170.0
	var e := Vector2((oeil.x - 85.0) * k, (oeil.y - 86.0) * k)
	if _pivot == null:
		return position + Vector2(e.x * regard, e.y)
	return position + _pivot.transform * (_t_corps * (_t_tete * e))


func rayon_oeil() -> float:
	var r := maxf(1.3, oeil.z * largeur / 170.0 * 1.25)
	if _pivot != null:
		r *= 0.55 + 0.45 * absf(_pivot.scale.x)
	return r


func blesser(n: float, depuis: Vector2) -> void:
	if pv <= 0.0:
		return
	pv -= n
	var recul := (position - depuis).normalized() * 10.0
	position += recul
	# (le recul se voit : le corps glisse en arrière, au lieu de sauter ; et ce n'est pas une vitesse)
	_avant += recul
	_recul -= recul
	_eclat = 1.0
	_ressort_v -= 3.4
	_derobe = 1.0
	_depuis_coup = 0.0
	if pv <= 0.0:
		# (hors du groupe tout de suite, pour qu'un second coup ne la tue pas deux fois ; elle tombe, puis s'efface)
		remove_from_group("betes")
		jeu.bete_tuee(self)
		_mourir(depuis)
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


func _mourir(depuis: Vector2) -> void:
	etat = "mort"
	_mort = 0.0
	_retenu = false
	_cote_chute = 1.0 if position.x >= depuis.x else -1.0
	if _pivot == null:
		queue_free()
		return
	for i in 12:
		_miettes.append(Vector3(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0), randf()))


# un écho qui se défait (il a traversé la veilleuse) : il se dissipe, puis s'en va
func dissiper() -> void:
	remove_from_group("betes")
	if _dissipe < 0.0:
		_dissipe = 0.0


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
	if _mort >= 0.0 or _dissipe >= 0.0:
		# (morte, ou un écho qui se défait : plus rien qu'elle-même)
		_finir(delta)
		return
	_t += delta
	_morsure = maxf(0.0, _morsure - delta)
	match role:
		"proie":
			_proie(delta)
		"rodeur":
			_rodeur(delta)
		"chasseur":
			_chasseur(delta)
		"echo":
			_echo(delta)
			_process_sillage(delta)
	_animer(delta)
	_redessiner()


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
	_retenu = false
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
	_retenu = retenu
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
	# (une transparence qui respire, lentement)
	modulate = Color(1.0, 1.0, 1.0, (0.6 + 0.18 * sin(_t * 1.9)) * _apparition)
	if not fin and position.distance_to(j.position) < 22.0:
		jeu.toucher_echo(self)


# --- l'animation ---

func _animer(delta: float) -> void:
	_anim += delta
	_depuis_coup += delta
	if _premiere:
		_premiere = false
		_avant = position
	# la vitesse vraie, lissée (un saut de position, une bête qu'on déplace, n'en est pas une)
	var vi := (position - _avant) / maxf(delta, 0.0001)
	_avant = position
	if vi.length() > vitesse * 3.0 + 80.0:
		vi = _vit
	var v0 := _vit.length()
	_vit = _vit.lerp(vi, 1.0 - exp(-delta * 9.0))
	var v := _vit.length()
	_accel = lerpf(_accel, (v - v0) / maxf(delta, 0.0001), 1.0 - exp(-delta * 4.0))
	if _pivot == null:
		_face = move_toward(_face, regard, delta / 0.16)
		return
	_allure(v, delta)
	var lisse := 1.0 - exp(-delta * 9.0)
	_eclat = maxf(0.0, _eclat - delta / 0.09)
	_derobe = maxf(0.0, _derobe - delta / 0.32)
	_recul = _recul.lerp(Vector2.ZERO, 1.0 - exp(-delta * 15.0))
	_ressort_v += (-330.0 * _ressort - 15.0 * _ressort_v) * delta
	_ressort += _ressort_v * delta
	# le retournement : un demi-tour de papier, sans saut
	_face = move_toward(_face, regard, delta / 0.17)
	var fx := sin(_face * PI * 0.5)
	if absf(fx) < 0.05:
		fx = 0.05 if _face >= 0.0 else -0.05
	_pivot.scale = Vector2(fx, 1.0)
	_pivot.position = _recul
	# (hors de l'écran, elle marche toujours, mais on ne la dessine pas)
	_a_l_ecran = role == "echo" or _mort >= 0.0 or _sur_l_ecran()
	if not _a_l_ecran:
		return
	_corps(v, delta, lisse, fx)
	_pas_des_pattes(v)
	_parametres()


# ce que montre la caméra, dans le lieu (calculé une fois par image, pour toutes les bêtes)
func _sur_l_ecran() -> bool:
	var f := Engine.get_process_frames()
	if f != _vue_image:
		_vue_image = f
		var vp := get_viewport()
		_vue = vp.get_canvas_transform().affine_inverse() * vp.get_visible_rect()
	return _vue.grow(largeur * 1.5 + 40.0).has_point(global_position)


# l'allure, d'après ce qu'elle fait et sa vitesse : le pas, l'affût (bas, lent), la course, le bond (une proie qui fuit)
func _allure(v: float, delta: float) -> void:
	var lisse := 1.0 - exp(-delta * 6.0)
	var nuit: bool = role == "chasseur" and not jeu.est_jour()
	var vite := clampf((v / maxf(vitesse, 1.0) - 0.42) / 0.3, 0.0, 1.0)
	var quatre := _n_cote == 2
	var bond := vite if role == "proie" and etat == "fuit" and quatre else 0.0
	var affut := 1.0 if nuit and _retenu else 0.0
	_marche = lerpf(_marche, smoothstep(2.5, 12.0, v), 1.0 - exp(-delta * 10.0))
	_affut = lerpf(_affut, affut, lisse)
	_bond = lerpf(_bond, bond, lisse)
	_course = lerpf(_course, vite - bond, lisse)
	var w_pas := maxf(0.0, 1.0 - _affut - _course - _bond)
	_foulee = 0.85 * w_pas + 0.5 * _affut + 1.15 * _course + 1.0 * _bond
	_appui = 0.62 * w_pas + 0.8 * _affut + 0.42 * _course + 0.3 * _bond
	_levee = 0.34 * w_pas + 0.2 * _affut + 0.42 * _course + 0.34 * _bond
	_bas = lerpf(_bas, (0.08 if nuit else 0.0) + 0.16 * affut + 0.04 * vite, lisse)
	if role == "echo":
		_appui = 0.7
		_levee = 0.2
	# (la cadence : un pied posé ne glisse pas ; trop vite pour l'œil, le pas s'allonge plutôt)
	var jambe := _H
	var s := maxf(0.5, _foulee * jambe)
	var f := _appui * v / s
	var fmax := 4.2 if _fin else 3.6
	if f > fmax:
		f = fmax
	_foulee_eff = (_appui * v / f) if f > 0.01 else s
	_phase = fposmod(_phase + f * delta, 1.0)
	if _sans:
		# (sans pattes : la vague court à la vitesse de la bête, et ne s'arrête jamais tout à fait)
		_onde_phase += delta * (1.1 + v / maxf(6.0, jambe * 1.2))


# le corps : le pas, la pente, le bond, l'affût, le souffle, le sursaut ; la tête qui suit
func _corps(v: float, delta: float, lisse: float, fx: float) -> void:
	var H := _H
	var marche := _marche
	var y := 0.0
	var x := 0.0
	var tang := 0.0
	var sx := 1.0
	var sy := 1.0
	var six := _n_cote >= 3
	var amp := 0.35 if six else 1.0
	var u := _phase
	# le pas : le corps monte et descend à chaque appui, et bascule un peu d'avant en arrière
	var pas := marche * (1.0 - _bond)
	y -= H * 0.055 * amp * (0.5 - 0.5 * cos(u * TAU * 2.0)) * pas
	tang += 0.035 * amp * sin(u * TAU) * pas
	if _sans:
		y -= H * 0.04 * sin(_onde_phase * 0.5)
	# la pente de sa course, et son élan
	var pente := clampf(_vit.y / maxf(v, 25.0), -1.0, 1.0) * marche
	var cible_t := pente * 0.11 + clampf(_accel / maxf(vitesse * 4.0, 1.0), -1.0, 1.0) * 0.07
	_tangage = lerpf(_tangage, cible_t, lisse * 0.5)
	tang += _tangage
	# le bond : étirée en l'air, écrasée à l'atterrissage
	if _bond > 0.01:
		var air := sin(PI * clampf((u - 0.58) / 0.42, 0.0, 1.0))
		var choc := sin(PI * clampf(u / 0.32, 0.0, 1.0))
		y -= H * 0.62 * air * _bond
		y += H * 0.14 * choc * _bond
		sx *= 1.0 + (0.1 * air - 0.05 * choc) * _bond
		sy *= 1.0 + (-0.05 * air - 0.06 * choc) * _bond
		tang += 0.11 * cos(u * TAU) * _bond
	# à l'affût, et la nuit pour un chasseur : plus bas
	y += H * _bas
	# le souffle, au repos : lent chez une grande bête
	var repos := 1.0 - marche
	_souffle += delta * TAU / (1.3 + 1.1 * log(masse + 1.0) / log(10.0))
	sy *= 1.0 + 0.026 * sin(_souffle) * repos
	sx *= 1.0 + 0.008 * sin(_souffle) * repos
	# frappée : elle s'écrase, ses pattes se dérobent
	sy *= 1.0 + _ressort
	sx *= 1.0 - _ressort * 0.55
	y += H * 0.32 * (1.0 - pow(1.0 - _derobe, 2.0)) * (1.0 if _mort < 0.0 else 0.0)
	# le demi-tour : un petit saut, le temps de se retourner
	y -= H * 0.1 * (1.0 - absf(fx))
	# un écho flotte, ses pieds ne touchent plus le sol
	if role == "echo":
		y -= H * (0.32 + 0.12 * sin(_anim * 1.4))
	var c := _c
	var ventre := _ventre
	if _mort >= 0.0:
		# morte : un insecte se retourne sur le dos, d'un sursaut ; les autres s'affaissent sur le flanc, le ventre au sol
		tang = 0.0
		if six:
			var roule := smoothstep(0.04, CHUTE, _mort)
			sy *= cos(PI * 0.96 * roule)
			y -= H * 0.8 * sin(PI * roule)
		else:
			var t := smoothstep(0.0, CHUTE, _mort)
			var t2 := t * t
			y += -ventre * 0.9 * t2
			# (poussée par le coup : elle glisse un peu à l'opposé)
			x += _cote_chute * signf(fx) * H * 0.3 * t
			sy *= 1.0 - 0.14 * t2
			tang = 0.1 * t2
	_leve = -y
	# (le corps se plie autour de son centre, et s'écrase vers ses hanches : le dos bouge, le ventre tient)
	y += (ventre - c.y) * (1.0 - sy)
	_t_corps = Transform2D(tang, Vector2(sx, sy), 0.0, c + Vector2(x, y)) * Transform2D(0.0, -c)
	# la tête suit le pas, un peu en retard ; au repos, elle broute, guette
	_gestes_repos(delta)
	var rot := 0.0
	var d := Vector2.ZERO
	var souple := 0.4 if six else 1.0
	match _geste:
		"broute":
			rot = 0.3 + 0.05 * sin(_anim * 9.0)
			d = Vector2(0.05, 0.16) * H
		"guette":
			rot = -0.13
			d = Vector2(-0.02, -0.07) * H
	rot += 0.12 * _affut + 0.06 * _course + 0.05 * _bond
	d += Vector2(0.06, 0.12) * H * _affut
	_tete_rot = lerpf(_tete_rot, rot * souple, 1.0 - exp(-delta * 5.0))
	_tete_d = _tete_d.lerp(d * souple, 1.0 - exp(-delta * 5.0))
	var td := _tete_d
	td.y -= H * 0.05 * amp * (0.5 - 0.5 * cos((u - 0.07) * TAU * 2.0)) * pas
	if _n_cote == 1:
		# (un oiseau, un bipède : la tête va de l'avant à chaque pas, puis attend)
		var w := fposmod(u * 2.0, 1.0)
		td.x += H * 0.09 * (smoothstep(0.0, 0.3, w) - w) * pas
	var tr := _tete_rot
	if _mort >= 0.0 and not six:
		# (la tête retombe au sol)
		tr += 0.42 * smoothstep(0.1, CHUTE + 0.1, _mort)
		td.y += H * 0.3 * smoothstep(0.1, CHUTE + 0.1, _mort)
	if _tete == null:
		_t_tete = Transform2D.IDENTITY
	else:
		var pv_t: Vector2 = _sq["tete"]["pivot"]
		_t_tete = Transform2D(tr, Vector2.ONE, 0.0, pv_t + td) * Transform2D(0.0, -pv_t)
	var demi := Transform2D(0.0, Vector2(0.5, 0.5), 0.0, Vector2.ZERO)
	sprite.transform = _t_corps * demi
	if _dessus != null:
		_dessus.transform = _t_corps * demi
	if _tete != null:
		_tete.transform = _t_corps * _t_tete * demi


func _gestes_repos(delta: float) -> void:
	_geste_t -= delta
	if _marche > 0.3 or role == "echo" or _mort >= 0.0:
		_geste = ""
		_geste_t = maxf(_geste_t, 0.6)
		return
	if _geste_t > 0.0:
		return
	var x := randf()
	if role == "proie":
		if x < 0.45:
			_geste = "broute"
			_geste_t = randf_range(1.6, 3.6)
		elif x < 0.75:
			_geste = "guette"
			_geste_t = randf_range(0.8, 1.8)
		elif x < 0.88:
			# (un regard qui se détourne)
			_geste = ""
			regard = -regard
			_geste_t = randf_range(1.0, 2.0)
		else:
			_geste = ""
			_geste_t = randf_range(0.8, 2.0)
	else:
		if x < 0.4:
			_geste = "guette"
			_geste_t = randf_range(1.0, 2.2)
		elif x < 0.55:
			_geste = ""
			regard = -regard
			_geste_t = randf_range(1.5, 3.0)
		else:
			_geste = ""
			_geste_t = randf_range(1.0, 2.5)


# un pied dans son cycle : posé, il recule sous le corps à la vitesse du sol ; levé, il revient en avant
static func _pas(u: float, appui: float) -> Vector2:
	if u < appui:
		return Vector2(0.5 - u / appui, 0.0)
	var t := (u - appui) / (1.0 - appui)
	return Vector2(-0.5 + t * t * (3.0 - 2.0 * t), sin(PI * pow(t, 0.75)))


# chaque patte : où va son pied, puis ses articulations (la hanche suit le corps, le genou plie du côté de la planche)
func _pas_des_pattes(_v: float) -> void:
	var n_p := _p_pts.size()
	if n_p == 0:
		return
	var H := _H
	var c := _c
	var plie := smoothstep(0.08, 0.45, _mort) if _mort >= 0.0 else 0.0
	var air := 0.0
	if _bond > 0.01:
		air = sin(PI * clampf((_phase - 0.58) / 0.42, 0.0, 1.0)) * _bond
	for i in n_p:
		var pts := _p_pts[i]
		var n := pts.size() - 1
		var devant := _p_devant[i]
		var hanche := _t_corps * pts[0]
		var dec := _dec_pas[i]
		if _bond > 0.001:
			dec = lerp_angle(dec * TAU, _dec_bond[i] * TAU, _bond) / TAU
		if _affut > 0.001:
			dec = lerp_angle(dec * TAU, _dec_affut[i] * TAU, _affut) / TAU
		var pas := _pas(fposmod(_phase + dec, 1.0), _appui)
		var m := _marche
		var pied := pts[n] + Vector2(pas.x * _foulee_eff, -pas.y * _levee * H) * m
		# (frappée : les pieds s'écartent, les pattes plient)
		pied.x += (pts[n].x - c.x) * 0.18 * _derobe
		if air > 0.0:
			# en l'air, les pattes suivent le corps et s'étirent : l'avant devant, l'arrière derrière
			pied.y -= H * 0.55 * air
			pied.x += H * 0.42 * air * (1.0 if devant else -1.0)
		var lev := pas.y * m
		if plie > 0.0:
			# morte : les pattes ne portent plus. Sur le dos, elles se replient et frémissent ; sur le flanc, celles de devant
			# s'étalent au sol (vers nous), celles de derrière se perdent sous le corps
			var v := pts[n] - pts[0]
			var portee := _p_portee[i]
			var replie := pts[0]
			if _n_cote >= 3:
				var fremit := 0.35 * sin(_mort * 23.0 + float(i) * 1.7) * (1.0 - smoothstep(CHUTE, CHUTE + GISANT + 0.6, _mort))
				replie += v.rotated(0.6 * (1.0 if devant else -1.0) + fremit) * 0.5
			elif _sq["pattes"][i]["loin"]:
				replie += Vector2(v.x * 0.5, v.y * 0.2)
			else:
				replie += Vector2(v.x * 0.4 + portee * (0.4 if devant else -0.3), portee * 0.62)
			pied = pied.lerp(_t_corps * replie, plie)
			lev = plie
		var j := _ik(i, hanche, pied)
		_pieds[i] = j
		var bas: Vector2 = j[n] - j[1]
		_rot_pieds[i] = wrapf(bas.angle() - _p_ang[i], -PI, PI) * clampf(lev * 1.4, 0.0, 1.0)


# deux os : la cuisse, et le reste de la patte d'un seul tenant ; le genou du côté où la planche le plie
func _ik(i: int, h: Vector2, f: Vector2) -> PackedVector2Array:
	var l1 := _p_l1[i]
	var l2 := _p_l2[i]
	var d := f - h
	var l := d.length()
	var dist := clampf(l, absf(l1 - l2) + 0.01, l1 + l2 - 0.001)
	var dir := d / l if l > 0.0001 else Vector2.DOWN
	var pied := h + dir * dist
	var a := acos(clampf((l1 * l1 + dist * dist - l2 * l2) / (2.0 * l1 * dist), -1.0, 1.0))
	var genou := h + dir.rotated(-a * _p_plie[i]) * l1
	var out := PackedVector2Array([h, genou])
	var rel := _p_rel[i]
	if not rel.is_empty():
		var ang := (pied - genou).angle()
		for r in rel:
			out.append(genou + r.rotated(ang))
	out.append(pied)
	return out


# ce que lit le shader de son encre
func _parametres() -> void:
	_param("eclat", _eclat * 0.85)
	if role == "echo" or _mort >= 0.0 or _dissipe >= 0.0:
		_param("origine", global_position)
		_param("temps", fmod(_anim, 600.0))
	if _sans:
		var H := _H
		var hauteur := maxf(4.0, float(_sq["corps"]["taille"].y))
		_param("onde", clampf(H * (0.1 + 0.16 * _marche) / hauteur, 0.0, 0.09))
		_param("onde_phase", fmod(_onde_phase, TAU * 100.0))


func _param(n: String, v) -> void:
	if _params.get(n) != v:
		_params[n] = v
		_mat.set_shader_parameter(n, v)


# --- la mort, la dissipation d'un écho ---

func _finir(delta: float) -> void:
	if _dissipe >= 0.0:
		_dissipe += delta
		modulate.a = maxf(0.0, modulate.a - delta * 2.2)
		if _pivot != null:
			_pivot.scale *= 1.0 + delta * 0.8
			_param("temps", fmod(_anim + _dissipe * 3.0, 600.0))
		_anim += delta
		if _dissipe > 0.5:
			queue_free()
		_redessiner()
		return
	_mort += delta
	# elle tombe (_corps, _pas_des_pattes) : lentement d'abord, puis vite ; un rebond quand elle touche le sol
	var t := clampf(_mort / CHUTE, 0.0, 1.0)
	if t >= 1.0 and not _impact:
		_impact = true
		_ressort_v -= 2.2
	_vit = Vector2.ZERO
	_marche = 0.0
	_bond = 0.0
	_course = 0.0
	_affut = 0.0
	_animer(delta)
	# puis son encre s'efface (sur un téléphone : un fondu)
	var ef := clampf((_mort - CHUTE - GISANT) / EFFACEMENT, 0.0, 1.0)
	if _fin:
		_param("dissolution", ef)
	else:
		modulate.a = 1.0 - ef
	if _mort > CHUTE + GISANT + EFFACEMENT:
		queue_free()
	_redessiner()


func _redessiner() -> void:
	if not _a_l_ecran:
		return
	queue_redraw()
	if _loin != null:
		_loin.queue_redraw()
		_pres.queue_redraw()
	if _traine != null:
		_traine.queue_redraw()
	# (la barre, les miettes : seulement quand elles se voient, et une image de plus pour les effacer)
	if _haut != null and (_depuis_coup < BARRE + 0.1 or _mort >= 0.0):
		_haut.queue_redraw()


# --- ce qui se dessine ---

func _peindre_loin(c: CanvasItem) -> void:
	_peindre_pattes(c, true)


func _peindre_pres(c: CanvasItem) -> void:
	_peindre_pattes(c, false)


func _peindre_pattes(c: CanvasItem, loin: bool) -> void:
	var atlas: Texture2D = _sq["atlas"]
	var pattes: Array = _sq["pattes"]
	var demi := Vector2(0.5, 0.5)
	for i in pattes.size():
		var p: Dictionary = pattes[i]
		if p["loin"] != loin:
			continue
		var j: PackedVector2Array = _pieds[i]
		var cel: Array = p["cellules"]
		for s in cel.size():
			var a := j[s]
			c.draw_set_transform(a, (j[s + 1] - a).angle(), demi)
			c.draw_texture_rect_region(atlas, Rect2(-cel[s]["debut"], cel[s]["region"].size), cel[s]["region"])
		var pied: Dictionary = p["pied"]
		if not pied.is_empty():
			c.draw_set_transform(j[j.size() - 1], _rot_pieds[i], demi)
			c.draw_texture_rect_region(atlas, Rect2(-pied["ancre"], pied["region"].size), pied["region"])
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


# la traîne d'un écho : son corps, là où il était, qui se défait
func _peindre_traine(c: CanvasItem) -> void:
	if _pivot == null:
		return
	var corps: Dictionary = _sq["corps"]
	var n := _sillage.size()
	for i in n:
		var k := float(i + 1) / float(n + 1)
		var off := _sillage[n - 1 - i] - position
		var s := 1.0 + 0.1 * k
		# (la traîne monte, comme une fumée)
		c.draw_set_transform(off + Vector2(0.0, -_leve - k * float(_sq["jambe"]) * 0.5), 0.0, Vector2(_pivot.scale.x * s, s))
		c.draw_texture_rect(corps["tex"], Rect2(corps["pos"], corps["taille"]), false, Color(1.0, 1.0, 1.0, 0.34 * (1.0 - k)))
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


# au-dessus de tout : la barre de vie, un moment après un coup ; les miettes d'encre d'une bête qui s'efface
func _peindre_haut(c: CanvasItem) -> void:
	var a := 1.0 - smoothstep(BARRE - 0.7, BARRE, _depuis_coup)
	if a > 0.0 and pv > 0.0 and pv < pv_max and _mort < 0.0:
		var w := clampf(largeur * 0.5, 14.0, 44.0)
		var y: float = float(_sq.get("haut", -largeur * 0.6)) - 5.0
		var g := Vector2(-w * 0.5, y)
		c.draw_line(g, g + Vector2(w, 0.0), Color(P.PAPIER, 0.42 * a), 2.6, true)
		c.draw_line(g, g + Vector2(w * pv / pv_max, 0.0), Color(P.ENCRE, 0.92 * a), 1.3, true)
	if _mort > CHUTE + GISANT and _fin and not _miettes.is_empty():
		var ef := (_mort - CHUTE - GISANT) / EFFACEMENT
		var ctr: Vector2 = _pivot.transform * (_t_corps * Vector2(_sq["centre"]))
		var r := Vector2(largeur * 0.32, largeur * 0.12)
		var encre := robe.darkened(0.6)
		for m in _miettes:
			var age: float = (ef - m.z * 0.6) / 0.4
			if age <= 0.0 or age >= 1.0:
				continue
			var q: Vector2 = ctr + Vector2(m.x * r.x, m.y * r.y) + Vector2(m.x * 3.0, -largeur * 0.25) * age
			c.draw_circle(q, 0.55 + 0.5 * (1.0 - age), Color(encre, 0.8 * sin(PI * age)))


func _draw() -> void:
	if _pivot != null:
		if role == "echo":
			return
		# l'ombre de contact : sous le corps, plus petite quand il se lève, couchée avec lui quand il tombe
		var rx: float = _sq["ombre"]
		var cx: float = float(_sq["ombre_x"]) * _pivot.scale.x + _recul.x
		var H := _H
		var leve := clampf(_leve / maxf(H, 1.0), 0.0, 1.5)
		var a := 1.0 - 0.45 * leve
		var w := rx * (1.0 - 0.3 * leve)
		if _mort >= 0.0:
			var t := clampf(_mort / CHUTE, 0.0, 1.0)
			var ctr: Vector2 = _pivot.transform * (_t_corps * Vector2(_sq["centre"]))
			cx = lerpf(cx, ctr.x, t)
			w = lerpf(w, rx * 0.8, t)
			a *= 1.0 - clampf((_mort - CHUTE - GISANT) / EFFACEMENT, 0.0, 1.0)
		var h := w * 0.24 + 0.6
		draw_texture_rect(_penombre(), Rect2(cx - w, 0.8 - h, 2.0 * w, 2.0 * h), false, Color(1.0, 1.0, 1.0, 0.34 * a))
		return
	_ellipse(Vector2(0, 1), largeur * 0.36, largeur * 0.09, Color(0, 0, 0, 0.25))
	# (pas de planche pour cette lignée : une silhouette simple, à sa taille et dans sa robe)
	var k := largeur
	var s := regard
	var b := -absf(sin(_t * 9.0)) * 1.5 if etat != "repos" else 0.0
	_ellipse(Vector2(0, -k * 0.3 + b), k * 0.4, k * 0.19, robe)
	draw_circle(Vector2(s * k * 0.42, -k * 0.42 + b), k * 0.13, robe.darkened(0.15))
	for x in [-0.25, -0.12, 0.15, 0.27]:
		draw_line(Vector2(x * k, -k * 0.18 + b), Vector2(x * k, 0), robe.darkened(0.35), maxf(1.5, k * 0.05))


func _process_sillage(delta: float) -> void:
	_sillage_t -= delta
	if _sillage_t <= 0.0:
		_sillage_t = 0.08
		_sillage.append(position)
		var n := 5 if _fin else 3
		while _sillage.size() > n:
			_sillage.remove_at(0)


# une pénombre ronde, d'encre, plus dense au milieu (une seule pour toutes les bêtes)
static func _penombre() -> ImageTexture:
	if _ombre_tex == null:
		var n := 48
		var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
		for y in n:
			for x in n:
				var r := Vector2((x + 0.5) / n * 2.0 - 1.0, (y + 0.5) / n * 2.0 - 1.0).length()
				var a := pow(clampf(1.0 - r, 0.0, 1.0), 1.4)
				img.set_pixel(x, y, Color(P.ENCRE, a))
		_ombre_tex = ImageTexture.create_from_image(img)
	return _ombre_tex


func _ellipse(c: Vector2, rx: float, ry: float, couleur: Color) -> void:
	if _cercle.is_empty():
		for i in 20:
			_cercle.append(Vector2.from_angle(TAU * i / 20.0))
	draw_set_transform(c, 0.0, Vector2(rx, ry))
	draw_colored_polygon(_cercle, couleur)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
