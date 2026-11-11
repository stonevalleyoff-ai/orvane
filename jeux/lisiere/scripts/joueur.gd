extends Node2D
# Lisière — la veilleuse (scripts/joueur.gd)
# Celle qu'on joue : une silhouette encapuchonnée, une écharpe rouille. Sa santé, sa faim, sa peur ; ce qu'elle porte ; sa
# torche, qui éclaire autour d'elle tant qu'elle brûle ; sa lance, qui s'use. Le jeu (scripts/principal.gd) décide de ce qui
# lui arrive ; elle, elle se tourne vers où elle va (de face, de profil, de dos), marche d'un pas qui suit son allure, respire,
# a peur, récolte, frappe, se fait mordre, tombe. Son corps et son dessin : veilleuse_corps.gd ; la queue de son écharpe :
# veilleuse_echarpe.gd ; la flamme de sa torche : veilleuse_flamme.gd.

signal pas(position: Vector2)                    # un pied se pose (dans le monde) : le son des pas, la poussière
signal impact(position: Vector2, genre: String)  # un geste touche ce qu'il visait (son genre : arbre…, lance, poing)
signal chute(position: Vector2)                  # elle touche le sol, à la fin

const R := preload("res://scripts/regles.gd")
const Feu := preload("res://scripts/feu.gd")
const P := preload("res://scripts/palette.gd")
const Corps := preload("res://scripts/veilleuse_corps.gd")
const Echarpe := preload("res://scripts/veilleuse_echarpe.gd")
const Flamme := preload("res://scripts/veilleuse_flamme.gd")
const CAPE := P.CAPE
const ECHARPE := P.ECHARPE
const VISAGE := P.VISAGE
const PAS_LONGUEUR := 34.0          # les pixels d'un pas, à pleine allure : la cadence suit la vitesse
const MAIN_LANCE := Vector3(3.4, -7.4, 18.0)     # la lance, dans la main gauche (la droite, si la gauche tient la torche)
const MAIN_TORCHE := Vector3(4.2, -8.2, 34.5)
const LANCE_REPOS := Vector3(0.22, -0.04, 1.0)
const LANCE_ESTOC := Vector3(1.0, 0.0, 0.06)
const BLESSURE := 0.36
const SOL := 300.0                  # la pesanteur de la torche lâchée

# les gestes : leur durée, le moment où ils touchent, de combien elle se met de biais (pour frapper de la main droite), ce que
# tient sa main ; et leurs clés : [moment, poids (la main suit la clé), la main (devant, à droite, en hauteur, vers ce qu'elle
# vise), se baisse, se penche, torsion du buste, élan, (vif : la clé arrive d'un coup)]
const GESTES := {
	"arbre": {"duree": 0.34, "touche": 0.38, "biais": 0.55, "deux_mains": true, "objet": ["caillou", 0.04, 0.96], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.24, 1.0, Vector3(-3.0, 9.0, 29.0), 0.8, -1.6, -0.6, -0.8],
		[0.38, 1.0, Vector3(11.0, 2.5, 19.0), 1.6, 2.6, 0.35, 1.8, true],
		[0.56, 1.0, Vector3(10.0, 3.0, 18.0), 1.4, 2.0, 0.28, 1.4],
		[1.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0]]},
	"rocher": {"duree": 0.36, "touche": 0.42, "biais": 0.35, "deux_mains": true, "objet": ["caillou", 0.04, 0.96], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.28, 1.0, Vector3(2.5, 4.0, 46.0), -0.6, -2.2, -0.15, -0.6],
		[0.42, 1.0, Vector3(11.5, 2.0, 6.5), 3.4, 4.2, 0.12, 1.8, true],
		[0.6, 1.0, Vector3(11.0, 2.0, 7.5), 3.0, 3.6, 0.1, 1.4],
		[1.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0]]},
	"buisson": {"duree": 0.38, "touche": 0.44, "biais": 0.25, "deux_mains": false, "objet": ["baie", 0.5, 0.97], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.32, 1.0, Vector3(12.0, 2.5, 10.5), 2.0, 4.6, 0.15, 1.2],
		[0.44, 1.0, Vector3(12.6, 0.8, 11.5), 2.2, 4.9, 0.1, 1.2],
		[0.56, 1.0, Vector3(11.4, 3.2, 9.8), 2.1, 4.4, 0.15, 1.0],
		[1.0, 0.0, Vector3(3.0, 6.0, 17.0), 0.0, 0.0, 0.0, 0.0]]},
	"touffe": {"duree": 0.36, "touche": 0.6, "biais": 0.25, "deux_mains": false, "objet": ["fibre", 0.45, 0.97], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.3, 1.0, Vector3(9.5, 2.5, 1.5), 4.0, 3.6, 0.1, 0.8],
		[0.42, 1.0, Vector3(9.0, 2.5, 2.2), 4.2, 3.2, 0.1, 0.8],
		[0.6, 1.0, Vector3(4.5, 6.0, 22.0), 0.8, -2.2, -0.25, -1.2, true],
		[1.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0]]},
	"brindille": {"duree": 0.4, "touche": 0.42, "biais": 0.2, "deux_mains": false, "objet": ["brindille", 0.44, 0.97], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.36, 1.0, Vector3(8.5, 3.0, 0.8), 6.5, 3.2, 0.1, 0.6],
		[0.5, 1.0, Vector3(8.0, 3.0, 1.4), 6.4, 3.0, 0.1, 0.6],
		[1.0, 0.0, Vector3(3.0, 6.0, 16.0), 0.0, 0.0, 0.0, 0.0]]},
	"poing": {"duree": 0.26, "touche": 0.4, "biais": 0.3, "deux_mains": false, "objet": ["", 0.0, 0.0], "cles": [
		[0.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0],
		[0.2, 1.0, Vector3(-2.5, 6.5, 21.0), 0.5, -1.0, -0.45, -0.8],
		[0.4, 1.0, Vector3(14.0, 1.5, 22.5), 0.8, 2.2, 0.35, 2.6, true],
		[0.58, 1.0, Vector3(13.0, 1.8, 22.0), 0.8, 1.9, 0.3, 2.1],
		[1.0, 0.0, Vector3(2.0, 7.0, 14.5), 0.0, 0.0, 0.0, 0.0]]},
	"lance": {"duree": 0.34, "touche": 0.34, "biais": 0.35, "deux_mains": true, "objet": ["", 0.0, 0.0], "cles": [
		[0.0, 0.0, Vector3(3.4, 7.4, 18.0), 0.0, 0.0, 0.0, 0.0],
		[0.18, 1.0, Vector3(-5.0, 5.5, 21.0), 0.8, -1.6, -0.4, -1.4],
		[0.34, 1.0, Vector3(12.0, 2.0, 22.0), 1.2, 2.6, 0.28, 3.2, true],
		[0.5, 1.0, Vector3(11.0, 2.0, 22.0), 1.0, 2.3, 0.22, 2.8],
		[1.0, 0.0, Vector3(3.4, 7.4, 18.0), 0.0, 0.0, 0.0, 0.0]]},
}

var sante := 100.0
var faim := 100.0
var peur := 0.0
var inventaire := {"bois": 0, "pierre": 0, "fibre": 0, "baies": 0, "viande": 0, "viande_cuite": 0}
var lance := 0
var torche := 0.0
var regard := 1.0
var en_mouvement := false
var lumiere: PointLight2D
var morte := false

var _corps := Corps.new()
var _echarpe := Echarpe.new()
var _flamme: Flamme
var _lueur: Lueur
var _t := 0.0
var _cap := 0.0                     # où elle regarde : 0 vers nous, PI/2 vers la droite, PI de dos
var _cap_cible := 0.0
var _vitesse_tour := 14.0
var _tete := 0.0                    # la tête, par rapport au buste
var _tete_cible := 0.0
var _tete_minuterie := 3.0
var _phase := 0.0                   # le cycle de la marche : un pied se pose à chaque demi-tour
var _marche := 0.0                  # de l'arrêt (0) à la marche (1), sans à-coup
var _vit := Vector2.ZERO
var _v_mesure := Vector2.ZERO
var _deplace := false
var _derniere := Vector2.ZERO
var _cape := Vector2.ZERO           # le bas de la cape, en retard : un ressort
var _cape_v := Vector2.ZERO
var _pan := 0.0
var _pan_v := 0.0
var _peur_k := 0.0
var _faim_k := 0.0
var _cligne := 3.0
var _geste := ""
var _geste_t := 0.0
var _geste_cap := 0.0
var _touche_fait := false
var _blesse := -1.0                 # depuis la dernière morsure (-1 : aucune)
var _recul := Vector2.ZERO
var _mort := -1.0                   # depuis qu'elle tombe
var _chute_faite := false
var _torche_sol := {}               # la torche lâchée en tombant
var _fumee := -1.0


func _ready() -> void:
	_corps.ci = self
	lumiere = PointLight2D.new()
	lumiere.texture = Feu.texture_lumiere()
	lumiere.color = Color(1.0, 0.7, 0.4)
	lumiere.energy = 1.05
	lumiere.position = Vector2(0, -26)
	lumiere.enabled = false
	add_child(lumiere)
	# (un halo très faible, couleur de lune : on voit ses pieds dans le noir, rien de plus ; il ne compte pas comme une lumière)
	var halo := PointLight2D.new()
	halo.texture = Feu.texture_lumiere()
	halo.color = Color(0.55, 0.62, 0.85)
	halo.energy = 0.32
	halo.texture_scale = 60.0 / 128.0
	halo.position = Vector2(0, -16)
	add_child(halo)
	# (l'éclair d'une morsure, le liseré de lune : dessinés par-dessus, sans l'ombre de la nuit)
	_lueur = Lueur.new()
	_lueur.joueur = self
	add_child(_lueur)
	_flamme = Flamme.new()
	_flamme.visible = false
	add_child(_flamme)
	_derniere = position


func deplacer(dir: Vector2, delta: float, monde) -> void:
	if morte:
		en_mouvement = false
		return
	en_mouvement = dir.length() > 0.1
	_deplace = true
	_v_mesure = Vector2.ZERO
	if en_mouvement:
		if absf(dir.x) > 0.1:
			regard = signf(dir.x)
		var allure := 0.7 if faim <= 0.0 else 1.0
		var avant := position
		position = monde.repousser(position + dir.limit_length(1.0) * R.VITESSE * allure * delta, 8.0)
		_v_mesure = (position - avant) / maxf(delta, 0.0001)
		if _geste == "":
			_cap_cible = atan2(dir.x, dir.y)
			_vitesse_tour = 14.0


func blesser(n: float) -> void:
	sante = maxf(0.0, sante - n)
	peur = minf(100.0, peur + 6.0)
	_blesse = 0.0
	var b = _bete_proche(160.0)
	_recul = (position - b.position).normalized() if b != null else -_devant()
	_cape_v += _recul * 60.0
	if b != null and not en_mouvement and _geste == "":
		_cap_cible = atan2(-_recul.x, -_recul.y)
		_vitesse_tour = 18.0


func frapper() -> void:
	var b = _bete_proche(R.PORTEE_COUP + 24.0)
	_commencer("lance" if lance > 0 else "poing", (b.position - position) if b != null else _devant())


# un geste de récolte : couper (arbre, sapin), casser (rocher), cueillir (buisson), arracher (touffe), ramasser (brindille)
func geste(genre: String, vers: Vector2) -> void:
	if genre == "sapin":
		genre = "arbre"
	_commencer(genre if GESTES.has(genre) else "brindille", vers - position)


# la santé à zéro : elle tombe (le jeu montre l'écran de fin un peu après)
func mourir() -> void:
	if morte:
		return
	morte = true
	_mort = 0.0
	_blesse = 0.0
	_geste = ""
	en_mouvement = false


func _commencer(g: String, d: Vector2) -> void:
	if morte:
		return
	_geste = g
	_geste_t = 0.0
	_touche_fait = false
	if d.length() < 0.5:
		d = _devant()
	_geste_cap = atan2(d.x, d.y)
	if absf(d.x) > 4.0:
		regard = signf(d.x)
	# (de biais : elle frappe de la main droite, et l'on voit le geste plutôt que son dos)
	var b: float = GESTES[g]["biais"]
	_cap_cible = _geste_cap + (b if sin(_geste_cap + b) >= sin(_geste_cap - b) else -b)
	_vitesse_tour = 26.0


func _devant() -> Vector2:
	return Vector2(sin(_cap), cos(_cap))


func _jeu():
	var m = get_parent()
	return m.get("jeu") if m != null else null


func _bete_proche(portee: float):
	if not is_inside_tree():
		return null
	var meilleur = null
	var d0 := portee
	for b in get_tree().get_nodes_in_group("betes"):
		if b.get("role") == "echo" or not (b is Node2D):
			continue
		var d: float = position.distance_to(b.position)
		if d < d0:
			d0 = d
			meilleur = b
	return meilleur


# le vent, qui passe en rafales (l'écharpe, la flamme)
func _vent() -> Vector2:
	var rafale := clampf(0.5 + 0.5 * sin(_t * 0.37) * sin(_t * 0.13 + 1.0) + 0.3 * sin(_t * 1.7) * sin(_t * 0.29), 0.0, 1.0)
	# (en partie, le vent du lieu : celui de l'herbe, des feuillages, des flammes et du son)
	var jeu = _jeu()
	if jeu != null and jeu.get("monde") != null and jeu.has_method("vent"):
		rafale = float(jeu.vent())
	return Vector2(6.0 + 20.0 * rafale * rafale, -1.0 + 2.0 * sin(_t * 0.6))


func _process(delta: float) -> void:
	var jeu = _jeu()
	if jeu != null and jeu.get("en_pause") == true:
		return
	var dt := minf(delta, 0.05)
	_t += dt
	var mobile: bool = jeu != null and str(jeu.get("qualite")) == "mobile"
	# la vitesse vraie (après les troncs) ; un saut (l'essai la pose ailleurs) n'est pas une marche
	var v := _v_mesure if _deplace else Vector2.ZERO
	_deplace = false
	if position.distance_to(_derniere) > 60.0:
		v = Vector2.ZERO
		_vit = Vector2.ZERO
	_derniere = position
	_vit = _vit.lerp(v, 1.0 - exp(-14.0 * dt))
	var vitesse := _vit.length()
	var va := vitesse > 14.0 and not morte
	_marche = move_toward(_marche, 1.0 if va else 0.0, dt * (9.0 if va else 6.0))
	_avancer_pas(dt, vitesse, va)
	_tourner(dt)
	_humeurs(dt)
	# la cape et les pans de l'écharpe : des ressorts, en retard sur le corps
	var cible_cape := Vector2(-_vit.x * 0.028, -_vit.y * 0.012).limit_length(5.5)
	_cape_v += ((cible_cape - _cape) * 110.0 - _cape_v * 11.0) * dt
	_cape += _cape_v * dt
	_pan_v += ((-_vit.x * 0.012 + _vent().x * 0.05 - _pan) * 80.0 - _pan_v * 6.0) * dt
	_pan = clampf(_pan + _pan_v * dt, -3.0, 3.0)
	# le geste en cours, la blessure, la chute
	if _geste != "":
		var g: Dictionary = GESTES[_geste]
		_geste_t += dt
		var u: float = _geste_t / float(g["duree"])
		if not _touche_fait and u >= float(g["touche"]):
			_touche_fait = true
			_cape_v -= Vector2(sin(_cap), cos(_cap) * Corps.INCL) * 45.0
			impact.emit(to_global(_corps.pointe_lance if _geste == "lance" else _corps.main_d_ecran), _geste)
		if u >= 1.0:
			_geste = ""
			_vitesse_tour = 14.0
	if _blesse >= 0.0:
		_blesse += dt
		if _blesse > BLESSURE:
			_blesse = -1.0
	if morte:
		_mort += dt
	_poser()
	_corps.mobile = mobile
	_corps.preparer()
	_torche_tombee(dt)
	# l'écharpe, simulée dans le monde
	var ancre := to_global(_corps.ancre_echarpe)
	var couchee := _mort > 1.3
	_echarpe.avancer(ancre, dt, _vent() * (0.35 if couchee else 1.0), 10.0 if couchee else 130.0, 9.0 if couchee else 3.0, 2 if mobile else 4)
	var e := PackedVector2Array()
	for p in _echarpe.points:
		e.append(to_local(p))
	_corps.echarpe = e
	_torche(dt, mobile)
	# l'éclair d'une morsure ; la nuit, le liseré de lune (là où rien ne l'éclaire)
	_lueur.eclair = clampf(1.0 - _blesse / 0.16, 0.0, 1.0) if _blesse >= 0.0 else 0.0
	var noir := 0.0
	if jeu != null and jeu.has_method("eclairage"):
		noir = 1.0 - clampf(jeu.eclairage(position), 0.0, 1.0)
	_lueur.lune = noir
	_lueur.queue_redraw()
	queue_redraw()


# la cadence : un pas tous les PAS_LONGUEUR pixels ; à l'arrêt, les pieds se rejoignent ; chaque pied posé, un signal
func _avancer_pas(dt: float, vitesse: float, va: bool) -> void:
	var avant := _phase
	if va:
		_phase += vitesse * dt / PAS_LONGUEUR * PI
	elif _marche > 0.0:
		_phase = move_toward(_phase, ceil(_phase / PI - 0.001) * PI, dt * PI * 3.0)
	var k0 := floori((avant - PI * 0.5) / PI)
	var k1 := floori((_phase - PI * 0.5) / PI)
	if k1 > k0 and _marche > 0.35:
		var cote := 2.5 if k1 % 2 == 0 else -2.5
		var amp := clampf(vitesse / R.VITESSE, 0.5, 1.1)
		pas.emit(to_global(Corps.proj(Vector3(4.6 * amp * _marche, cote, 0.0), _cap)))
	if _phase > TAU * 64.0:
		_phase -= TAU * 64.0


# où elle regarde : vers où elle va ; pendant un geste, vers ce qu'elle vise ; un demi-tour passe par la face
func _tourner(dt: float) -> void:
	if morte:
		return
	var d := wrapf(_cap_cible - _cap, -PI, PI)
	if absf(d) > PI * 0.88 and absf(sin(_cap)) > 0.05:
		d = -signf(sin(_cap)) * absf(d)
	_cap = wrapf(_cap + d * (1.0 - exp(-_vitesse_tour * dt)), -PI, PI)
	# la tête : parfois ailleurs, à l'arrêt ; au comble de la peur, partout, vite
	_tete_minuterie -= dt
	if _peur_k > 0.85:
		if _tete_minuterie <= 0.0:
			_tete_minuterie = randf_range(0.22, 0.55)
			_tete_cible = randf_range(-1.3, 1.3)
			if _marche < 0.1 and _geste == "" and randf() < 0.35:
				_cap_cible = wrapf(_cap + randf_range(-1.4, 1.4), -PI, PI)
				_vitesse_tour = 10.0
		_tete = lerpf(_tete, _tete_cible, 1.0 - exp(-16.0 * dt))
		return
	if _tete_minuterie <= 0.0:
		if _tete_cible == 0.0 and _marche < 0.1 and _geste == "":
			_tete_cible = randf_range(0.55, 0.95) * (1.0 if randf() < 0.5 else -1.0)
			_tete_minuterie = randf_range(1.0, 2.2)
		else:
			_tete_cible = 0.0
			_tete_minuterie = randf_range(2.5, 6.0)
	if _marche > 0.3 or _geste != "":
		_tete_cible = 0.0
	_tete = lerpf(_tete, _tete_cible, 1.0 - exp(-5.0 * dt))


# la peur (au-delà de 60, elle se recroqueville), la faim (le ventre vide, elle se voûte), les paupières
func _humeurs(dt: float) -> void:
	var k := 0.0 if morte else smoothstep(60.0, 100.0, peur)
	_peur_k = move_toward(_peur_k, k, dt * 1.6)
	_faim_k = move_toward(_faim_k, 1.0 if faim <= 0.0 and not morte else 0.0, dt)
	_cligne -= dt * (1.0 + 1.5 * _peur_k)
	if _cligne < -0.12:
		_cligne = randf_range(2.5, 5.5)


# la pose de l'image : la marche ou l'attente, la peur et la faim, puis le geste, la morsure, la chute
func _poser() -> void:
	var c := _corps
	var m := _marche
	var amp := clampf(_vit.length() / R.VITESSE, 0.5, 1.1)
	var ph := _phase
	var k := _peur_k
	var tenue := torche > 0.0 and _torche_sol.is_empty()
	c.cap = _cap
	c.buste = _cap
	c.tete = _cap + _tete
	c.bas = 1.3 * k
	c.penche = 1.6 * m * amp + 1.4 * _faim_k + 0.6 * k
	c.elan = 0.0
	c.souffle = sin(_t * (1.75 + 2.6 * k)) * (0.45 + 0.35 * k) * (1.0 - m) + cos(2.0 * ph) * 0.9 * amp * m
	c.epaules = 1.9 * k
	c.hanche = -sin(ph) * 0.6 * m
	c.tete_baisse = 1.1 * _faim_k + 1.3 * k
	var tremble := Vector2(sin(_t * 41.0) + sin(_t * 23.0 + 1.0) * 0.6, sin(_t * 37.0 + 2.0) + sin(_t * 29.0) * 0.5) * 0.3 * k
	c.decal = tremble + Vector2(sin(_t * 0.8) * 0.3 * (1.0 - m), 0.0)
	c.pied_d = Vector3(sin(ph) * 4.6 * amp * m, 2.5, maxf(0.0, cos(ph)) * 2.6 * amp * m)
	c.pied_g = Vector3(sin(ph + PI) * 4.6 * amp * m, -2.5, maxf(0.0, cos(ph + PI)) * 2.6 * amp * m)
	# les bras balancent à l'envers des jambes ; la peur les ramène contre elle
	var bal := sin(ph) * 4.2 * amp * m
	var serre := k * 0.7 * (1.0 - m * 0.6)
	c.main_d = (Corps.MAIN_D + Vector3(-bal, 0.0, absf(bal) * 0.2)).lerp(Vector3(5.0, 3.2, 21.5), serre)
	c.main_g = (Corps.MAIN_G + Vector3(bal, 0.0, absf(bal) * 0.2)).lerp(Vector3(5.0, -3.0, 20.5), serre)
	c.torche = tenue
	c.lance = lance > 0 or _geste == "lance"
	c.lance_main = 1.0 if tenue else -1.0
	c.lance_dir = LANCE_REPOS
	if c.lance:
		var repos := MAIN_LANCE + Vector3(-bal * 0.35 * c.lance_main, 0.0, 0.0)
		if c.lance_main > 0.0:
			repos.y = -repos.y
			c.lance_dir = Vector3(LANCE_REPOS.x, -LANCE_REPOS.y, LANCE_REPOS.z)
			c.main_d = repos.lerp(c.main_d, serre)
		else:
			c.main_g = repos.lerp(c.main_g, serre)
	if tenue:
		# la torche, tenue haut ; la peur la tend vers le noir
		c.main_g = MAIN_TORCHE + Vector3(bal * 0.15 + k * 2.4, 0.0, cos(2.0 * ph) * 0.3 * m + k * 1.2)
	c.objet = ""
	c.cape = _cape
	c.plis = 0.5 * sin(_t * 1.1) + 0.9 * sin(ph - 0.6) * m
	c.pan = _pan
	c.yeux = 0.0 if _cligne < 0.0 else 1.0
	c.chute = Transform2D.IDENTITY
	c.allonge = 0.0
	if _geste != "":
		_poser_geste(c, tenue)
	if _blesse >= 0.0:
		_poser_blessure(c)
	if morte:
		_poser_mort(c)


# où en est un geste entre ses clés : [poids, main, se baisse, se penche, torsion, élan]
static func _cles(u: float, cles: Array) -> Array:
	var i := 1
	while i < cles.size() - 1 and u > float(cles[i][0]):
		i += 1
	var a: Array = cles[i - 1]
	var b: Array = cles[i]
	var x := clampf((u - float(a[0])) / maxf(0.0001, float(b[0]) - float(a[0])), 0.0, 1.0)
	x = 1.0 - pow(1.0 - x, 3.0) if b.size() > 7 else x * x * (3.0 - 2.0 * x)
	var ma: Vector3 = a[2]
	var mb: Vector3 = b[2]
	return [lerpf(a[1], b[1], x), ma.lerp(mb, x), lerpf(a[3], b[3], x), lerpf(a[4], b[4], x), lerpf(a[5], b[5], x), lerpf(a[6], b[6], x)]


# une main donnée vers ce qu'elle vise, ramenée au corps (qui regarde ailleurs de delta)
static func _vers_corps(v: Vector3, delta: float) -> Vector3:
	return Vector3(v.x * cos(delta) + v.y * sin(delta), v.y * cos(delta) - v.x * sin(delta), v.z)


func _poser_geste(c, tenue: bool) -> void:
	var g: Dictionary = GESTES[_geste]
	var u := clampf(_geste_t / float(g["duree"]), 0.0, 1.0)
	var k: Array = _cles(u, g["cles"])
	var w: float = k[0]
	var delta := wrapf(_geste_cap - _cap, -PI, PI)
	var main := _vers_corps(k[1], delta)
	c.bas += float(k[2]) * (1.0 - 0.55 * _marche)
	c.penche += float(k[3])
	c.buste = _cap + float(k[4])
	c.tete = c.buste + _tete * (1.0 - w)
	c.elan = float(k[5])
	var o: Array = g["objet"]
	if o[0] != "" and u >= float(o[1]) and u <= float(o[2]):
		c.objet = o[0]
	if _geste == "lance":
		# l'estoc : la main qui tient la lance pousse, l'autre (si elle est libre) l'accompagne
		var dir := _vers_corps(LANCE_REPOS.lerp(LANCE_ESTOC, w).normalized(), delta)
		if c.lance_main < 0.0:
			main.y = -main.y
			dir.y = -dir.y
			c.main_g = c.main_g.lerp(main, w)
			c.main_d = c.main_d.lerp(main - dir * 8.0 + Vector3(0.0, 2.6, -0.6), w * 0.9)
		else:
			c.main_d = c.main_d.lerp(main, w)
		c.lance_dir = dir
		return
	c.main_d = c.main_d.lerp(main, w)
	if g["deux_mains"] and not tenue and not (c.lance and c.lance_main < 0.0):
		c.main_g = c.main_g.lerp(c.main_d + _vers_corps(Vector3(-0.8, -3.2, -1.2), delta), w * 0.85)


func _poser_blessure(c) -> void:
	var u := _blesse / BLESSURE
	var r := 1.0 - pow(1.0 - minf(1.0, u / 0.16), 3.0) if u < 0.16 else 1.0 - smoothstep(0.16, 1.0, u)
	c.decal += _recul * 3.6 * r + Vector2(sin(_t * 61.0), cos(_t * 53.0)) * 0.5 * (1.0 - u)
	c.bas += 2.0 * r
	c.penche += 2.4 * r
	c.tete_baisse += 1.6 * r
	c.epaules += 1.0 * r
	if _geste == "":
		c.main_d = c.main_d.lerp(Vector3(5.0, 2.8, 20.0), 0.6 * r)


# elle tombe à genoux, puis s'effondre de côté, vers où elle regardait ; ensuite, plus rien ne bouge d'elle-même
func _poser_mort(c) -> void:
	var m := _mort
	var g := smoothstep(0.22, 0.85, m)
	c.souffle *= 1.0 - g
	c.decal *= 1.0 - g
	c.bas = lerpf(c.bas, 8.2, g)
	c.penche = lerpf(c.penche, 3.2, g)
	c.tete_baisse = lerpf(c.tete_baisse, 2.8, g)
	c.epaules = lerpf(c.epaules, -0.5, g)
	c.pied_d = Vector3(lerpf(c.pied_d.x, -3.0, g), 2.6, c.pied_d.z * (1.0 - g))
	c.pied_g = Vector3(lerpf(c.pied_g.x, -3.6, g), -2.6, c.pied_g.z * (1.0 - g))
	c.main_d = c.main_d.lerp(Vector3(5.5, 6.0, 9.0), g)
	if c.torche:
		c.main_g = c.main_g.lerp(Vector3(5.5, -8.0, 21.0), g)
	else:
		c.main_g = c.main_g.lerp(Vector3(5.5, -6.0, 9.0), g)
	var f := clampf((m - 0.85) / 0.4, 0.0, 1.0)
	var a := f * f
	if m > 1.25:
		a = 1.0 + 0.05 * exp(-(m - 1.25) * 8.0) * sin((m - 1.25) * 24.0)
		if not _chute_faite:
			_chute_faite = true
			_cape_v += Vector2(regard * 50.0, 0.0)
			chute.emit(to_global(Vector2(regard * 20.0, 0.0)))
	var ang := a * (PI * 0.5 - 0.12) * regard
	var sy := lerpf(1.0, 0.6, minf(a, 1.0))
	var pivot := Vector2(0.0, -2.0)
	c.chute = Transform2D(0.0, pivot) * Transform2D(Vector2(1, 0), Vector2(0, sy), Vector2.ZERO) * Transform2D(ang, Vector2.ZERO) * Transform2D(0.0, -pivot)
	c.allonge = minf(a, 1.0)
	c.sens_chute = regard
	if m > 1.2:
		c.yeux = 0.0


# la torche lâchée : elle tombe, rebondit, roule un peu, et s'éteint
func _torche_tombee(dt: float) -> void:
	if morte and _torche_sol.is_empty() and torche > 0.0 and _mort >= 0.7:
		var main := _corps.main_g_ecran
		var h := 18.0
		_torche_sol = {"p": main + Vector2(0.0, h), "h": h, "vh": 30.0, "vx": regard * 26.0 + randf_range(-8.0, 8.0), "a": 0.0, "va": regard * 7.0, "vie": 1.0, "sol": false}
	if _torche_sol.is_empty():
		return
	var t := _torche_sol
	t["vh"] -= SOL * dt
	t["h"] += t["vh"] * dt
	t["p"] += Vector2(t["vx"] * dt, 0.0)
	t["a"] += t["va"] * dt
	if t["h"] <= 0.0:
		t["h"] = 0.0
		t["sol"] = true
		if t["vh"] < -45.0:
			t["vh"] = -t["vh"] * 0.3
			t["va"] *= 0.5
		else:
			t["vh"] = 0.0
	if t["sol"]:
		t["vx"] = move_toward(t["vx"], 0.0, 40.0 * dt)
		t["va"] = t["vx"] / 2.4
		if t["h"] <= 0.0:
			t["a"] = lerp_angle(t["a"], signf(regard) * (PI * 0.5 - 0.2), 1.0 - exp(-8.0 * dt))
		t["vie"] = maxf(0.0, t["vie"] - dt / 1.3)
		if t["vie"] <= 0.0 and torche > 0.0:
			torche = 0.0
			_fumee = 0.0
	if _fumee >= 0.0:
		_fumee += dt


func _bout_torche_sol() -> Vector2:
	var t := _torche_sol
	var dir := Vector2(sin(t["a"]), -cos(t["a"]))
	return t["p"] + Vector2(0.0, -t["h"]) + dir * 9.0


# la flamme, et la lumière qui vacille avec elle
func _torche(dt: float, mobile: bool) -> void:
	_flamme.mobile = mobile
	var force := 0.0
	if _corps.torche:
		_flamme.position = _corps.bout_torche
		force = clampf(torche / 8.0, 0.3, 1.0) * (1.0 - 0.15 * _peur_k * absf(sin(_t * 17.0)))
	elif not _torche_sol.is_empty() and torche > 0.0:
		_flamme.position = _bout_torche_sol() + Vector2(0.0, -1.0)
		var vie: float = _torche_sol["vie"]
		force = vie * (0.75 + 0.25 * sin(_t * 31.0)) if _torche_sol["sol"] else 1.0
	_flamme.visible = force > 0.0 or not _flamme._braises.is_empty()
	# (la torche derrière sa tête : la flamme passe derrière elle)
	_flamme.show_behind_parent = _corps.torche and _corps.prof_torche < -1.5
	_flamme.force = force
	_flamme.couche = Vector2(clampf(-_vit.x * 0.03 + _vent().x * 0.06, -4.0, 4.0), 0.0)
	_flamme.avancer(dt)
	lumiere.enabled = torche > 0.0
	if torche > 0.0:
		var f: float = _flamme.vie
		var p := _flamme.position
		lumiere.position = Vector2(p.x * 0.7, lerpf(p.y, -10.0, 0.55)) + Vector2(f, f * 0.5) * 0.6
		lumiere.texture_scale = R.RAYON_TORCHE / 128.0 * (1.0 + 0.035 * f)
		lumiere.energy = (1.0 + 0.1 * f) * (0.35 + 0.65 * minf(1.0, force * 1.4))
		# (en plein jour, la torche éclaire à peine : elle ne fait pas un disque jaune à midi)
		var jeu = _jeu()
		if jeu != null and jeu.has_method("lumiere_du_jour"):
			lumiere.energy *= lerpf(1.0, 0.3, jeu.lumiere_du_jour())


func _draw() -> void:
	_corps.ci = self
	_corps.dessiner()
	if not _torche_sol.is_empty():
		var t := _torche_sol
		var dir := Vector2(sin(t["a"]), -cos(t["a"]))
		var c: Vector2 = t["p"] + Vector2(0.0, -t["h"])
		var ombre: Vector2 = t["p"] + dir * Vector2(3.0, 0.0)
		draw_texture_rect(Corps.doux(), Rect2(ombre - Vector2(7.0, 2.0), Vector2(14.0, 4.0)), false, Color(0, 0, 0, 0.35))
		draw_line(c - dir * 3.5, c + dir * 9.0, P.ENCRE, 3.3, true)
		draw_line(c - dir * 3.5, c + dir * 9.0, Corps.BOIS.darkened(0.25), 1.8, true)
		var bout := c + dir * 9.8
		draw_circle(bout, 2.6, P.ENCRE)
		draw_circle(bout, 1.9, P.CENDRE if torche > 0.0 else P.ENCRE_DOUCE)
		if torche <= 0.0 and _fumee >= 0.0 and _fumee < 2.0:
			# la fumée d'une torche qui vient de s'éteindre
			for i in 4:
				var age := _fumee - i * 0.3
				if age < 0.0 or age > 1.2:
					continue
				var p := bout + Vector2(sin(age * 3.0 + i) * 2.0, -age * 16.0)
				draw_circle(p, 1.2 + age * 2.2, Color(P.CENDRE.lightened(0.3), 0.32 * (1.0 - age / 1.2)))


# l'éclair d'une morsure, et la nuit le liseré de lune sur la capuche et l'épaule : dessinés sans l'ombre de la nuit
class Lueur extends Node2D:
	const ROUGE := Color(1.0, 0.27, 0.18)
	const LUNE := Color("6f86b8")
	var joueur
	var eclair := 0.0
	var lune := 0.0

	func _ready() -> void:
		var m := CanvasItemMaterial.new()
		m.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
		material = m

	func _draw() -> void:
		if joueur == null:
			return
		var c = joueur._corps
		c.ci = self
		if lune > 0.02:
			c.lisere_lune(Color(LUNE, 0.32 * lune))
		if eclair > 0.0:
			c.silhouette(Color(ROUGE, 0.72 * eclair))
		c.ci = joueur
