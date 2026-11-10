extends Node
# Lisière — les effets (scripts/effets.gd)
# Ce qui donne du poids à ce qui arrive : la caméra qui tremble, l'image qui s'arrête un instant sur un coup, les éclats, la
# poussière, la braise, la couleur du monde à chaque heure, et tout ce qui couvre l'écran (la peur, la blessure, le grain).
# Le jeu (principal.gd) appelle ces fonctions ; elles ne changent rien aux règles. Département : lumière et effets
# (DIRECTION-ARTISTIQUE.md). L'air du lieu (brume, lucioles, feuilles, neige) : scripts/effets_lieu.gd ; l'écran :
# scripts/effets_ecran.gd ; les textures : scripts/effets_textures.gd.

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")
const T := preload("res://scripts/effets_textures.gd")
const Lieu := preload("res://scripts/effets_lieu.gd")
const Ecran := preload("res://scripts/effets_ecran.gd")
const ARRET_LENT := 0.04         # le temps, pendant un arrêt d'image
const FIN_LENT := 0.55           # le temps, quand la veilleuse tombe

var jeu
var scene: Node2D
var camera: Camera2D
var obscurite: CanvasModulate
# la couche du sol (sous ce qui se tient debout) : les feux y posent leur lueur et leurs ombres
var sol: Node2D
# la couleur du monde la nuit (l'obscurité y multiplie tout) : un bleu d'encre, assez clair pour qu'on devine les formes
var nuit_monde := P.NUIT_BLEUE.lerp(P.LUNE, 0.06)
var _lieu
var _ecran
var _bruit := FastNoiseLite.new()
var _horloge := 0.0
var _q := 1.0
var _jour := 1.0
# la caméra
var _trauma := 0.0
var _zoom := 1.0
# le temps : ce qu'on rend à Engine.time_scale, ce qu'on y a mis (-1 : rien), l'arrêt en cours (secondes réelles), le ralenti
var _base_temps := 1.0
var _pose := -1.0
var _arret := 0.0
var _lent := 1.0
# l'écran
var _peur := 0.0
var _coeur := 0.0
var _battu := 9.0
var _prochain := 0.0
var _dehors := 0.0
var _blessure := 0.0
var _choc := 0.0
var _froid := 0.0
var _aube := 0.0
var _echo := 0.0
var _fin := -1.0


func _ready() -> void:
	_bruit.seed = 17
	_bruit.frequency = 1.0
	_ecran = Ecran.new()
	add_child(_ecran)
	_ecran.preparer(jeu.qualite if jeu != null else "haute")


# une partie commence : la scène du lieu, sa caméra, son obscurité
func nouvelle_partie(s: Node2D, c: Camera2D, o: CanvasModulate) -> void:
	scene = s
	camera = c
	obscurite = o
	_q = 1.0 if jeu == null or jeu.qualite == "haute" else 0.45
	_trauma = 0.0
	_zoom = 1.0
	_peur = 0.0
	_blessure = 0.0
	_choc = 0.0
	_froid = 0.0
	_aube = 0.0
	_echo = 0.0
	_fin = -1.0
	_lent = 1.0
	_temps()
	camera.ignore_rotation = false
	_lieu = Lieu.new()
	var axes: Dictionary = jeu.biome_info.get("axes", {}) if jeu != null else {}
	var palette: Dictionary = jeu.monde.palette if jeu != null and jeu.monde != null else {}
	if jeu != null and jeu.monde != null:
		_lieu.poser(s, jeu.monde, jeu.qualite, axes, palette)
		sol = _lieu.sol
	_ecran.visible = true


# la partie s'efface (retour au titre, nouvelle partie)
func vider() -> void:
	scene = null
	camera = null
	obscurite = null
	sol = null
	if _lieu != null:
		_lieu.vider()
	_lieu = null
	_arret = 0.0
	_lent = 1.0
	_fin = -1.0
	_temps()
	_ecran.vider()


# chaque image de la partie
func maj(delta: float) -> void:
	if jeu == null or jeu.joueur == null:
		return
	_horloge += delta
	var j = jeu.joueur
	var nuit := 1.0 - _jour
	_peur = lerpf(_peur, clampf(j.peur / 100.0, 0.0, 1.0), clampf(delta * 3.0, 0.0, 1.0))
	_blessure = maxf(0.0, _blessure - delta * 1.25)
	_choc = maxf(0.0, _choc - delta * 2.5)
	_froid = maxf(0.0, _froid - delta * 0.4)
	_aube = maxf(0.0, _aube - delta * 0.3)
	_echo = maxf(0.0, _echo - delta * 0.9)
	_battre(delta, j.peur)
	# la fin : le monde ralentit et se décolore, puis s'assombrit avant l'écran de fin
	var fin := 0.0
	var noir := 0.0
	if _fin >= 0.0:
		_fin += delta
		var u := clampf(_fin / jeu.DUREE_MORT, 0.0, 1.0)
		fin = smoothstep(0.0, 0.5, u)
		noir = smoothstep(0.5, 0.97, u)
		_lent = lerpf(1.0, FIN_LENT, smoothstep(0.0, 0.2, u))
	_camera(delta, nuit, fin)
	var vue := _vue()
	if _lieu != null and camera != null:
		_lieu.maj(delta, {"nuit": nuit, "peur": _peur, "vent": vent(), "centre": camera.get_screen_center_position(), "vue": vue,
			"lucioles": _crepuscule(), "brume_matin": _brume_matin(), "obscur": obscurite.color if obscurite != null else Color.WHITE,
			"lumieres": _lumieres()})
	var e := {
		"ratio": vue.x / maxf(vue.y, 1.0), "nuit": nuit * 0.32, "peur": _peur, "coeur": _coeur * smoothstep(0.62, 0.75, _peur),
		"blessure": _blessure, "froid": _froid, "aube": _aube, "echo": _echo, "fin": fin, "noir": noir,
	}
	e["grain"] = (0.035 + 0.02 * nuit) * (1.0 if _ecran.haute else 0.6)
	if _ecran.haute:
		e["aberration"] = smoothstep(0.82, 1.0, _peur) * 0.8 + _choc
		# (la passe qui lit l'écran ne s'allume que pour retirer la couleur, ou dédoubler l'image)
		_ecran.lire(_peur > 0.3 or _echo > 0.01 or fin > 0.0 or e["aberration"] > 0.01)
	_ecran.regler(e)


# --- la couleur de l'heure ---

# la couleur du monde à ce moment (l : la lumière du jour, de 0 la nuit à 1 en plein jour)
# aube (rose pâle) → jour (doré doux) → soir (orange, puis mauve) → nuit (bleu d'encre) ; le matin et le soir se lisent à l'horloge
func teinter(o: CanvasModulate, l: float) -> void:
	_jour = l
	var c := _couleur_heure(l)
	o.color = c


func _couleur_heure(l: float) -> Color:
	var dore := P.JOUR.lerp(P.BRAISE_COEUR, 0.07)
	var dore_soir := P.JOUR.lerp(P.SOIR, 0.2)
	var aube_fin := P.AUBE.lerp(P.JOUR, 0.55)
	if jeu == null:
		return nuit_monde.lerp(dore, l)
	var t: float = fmod(jeu.horloge, R.DUREE)
	var soir: float = R.DUREE * (1.0 - jeu.part_nuit)
	if l >= 1.0:
		# le plein jour : il sort de l'aube, doré ; il se réchauffe avant le soir
		if t < R.TRANSITION + 25.0:
			return aube_fin.lerp(dore, smoothstep(R.TRANSITION, R.TRANSITION + 25.0, t))
		return dore.lerp(dore_soir, smoothstep(soir - R.TRANSITION - 30.0, soir - R.TRANSITION, t))
	if l <= 0.0:
		return nuit_monde
	if t < soir * 0.5:
		return _etapes(l, [[0.0, nuit_monde], [0.3, P.NUIT_BLEUE.lerp(P.AUBE, 0.4)], [0.6, P.AUBE], [1.0, aube_fin]])
	return _etapes(l, [[0.0, nuit_monde], [0.12, P.CREPUSCULE.lerp(nuit_monde, 0.55)], [0.3, P.CREPUSCULE], [0.5, P.SOIR.lerp(P.CREPUSCULE, 0.5)],
		[0.74, P.SOIR], [1.0, dore_soir]])


static func _etapes(l: float, pas: Array) -> Color:
	for i in pas.size() - 1:
		var a: Array = pas[i]
		var b: Array = pas[i + 1]
		if l <= b[0]:
			return (a[1] as Color).lerp(b[1], smoothstep(a[0], b[0], l))
	return pas.back()[1]


# les lumières que reçoit la brume : les deux feux allumés les plus proches et la torche (Vector4 : où, rayon, force)
func _lumieres() -> Array:
	var l := [Vector4.ZERO, Vector4.ZERO, Vector4.ZERO]
	if jeu == null:
		return l
	var i := 0
	for f in jeu.feux:
		if i < 2 and is_instance_valid(f) and f.allume():
			l[i] = Vector4(f.position.x, f.position.y - 10.0, f.rayon(), f.lumiere.energy)
			i += 1
	var j = jeu.joueur
	if j != null and j.torche > 0.0 and j.lumiere != null:
		var p: Vector2 = j.lumiere.global_position
		l[2] = Vector4(p.x, p.y, R.RAYON_TORCHE, j.lumiere.energy)
	return l


# les lucioles : du soir jusqu'au premier tiers de la nuit
func _crepuscule() -> float:
	if jeu == null:
		return 0.0
	var t: float = fmod(jeu.horloge, R.DUREE)
	var soir: float = R.DUREE * (1.0 - jeu.part_nuit)
	if t < soir * 0.5:
		return 0.0
	if t < soir:
		return smoothstep(0.9, 0.45, _jour)
	return clampf(1.0 - (t - soir - 25.0) / 30.0, 0.0, 1.0)


# la brume du matin : elle traîne au sol les premières secondes du jour
func _brume_matin() -> float:
	if jeu == null:
		return 0.0
	var t: float = fmod(jeu.horloge, R.DUREE)
	return clampf(1.0 - (t - R.TRANSITION) / 35.0, 0.0, 1.0) if t < R.TRANSITION + 35.0 else 0.0


# le vent : une seule respiration pour tout le lieu (de -1 à 1 ; positif, il pousse vers la droite), lente, avec des rafales.
# (le même pour tous ceux qui le lisent : il suit l'horloge du jeu)
func vent() -> float:
	var t: float = jeu.horloge if jeu != null else 0.0
	var fond := 0.3 + 0.25 * _bruit.get_noise_1d(t * 0.05)
	var rafale := smoothstep(0.15, 0.7, _bruit.get_noise_1d(t * 0.35 + 300.0)) * 0.55
	return clampf(fond + rafale, -1.0, 1.0)


# --- la caméra ---

# la caméra tremble (force : 0 à 1) ; le tremblement suit un bruit, et s'éteint vite
func secousse(force: float) -> void:
	_trauma = clampf(_trauma + force, 0.0, 1.0)


func _camera(delta: float, nuit: float, fin: float) -> void:
	if camera == null or not is_instance_valid(camera):
		return
	_trauma = maxf(0.0, _trauma - delta * 1.5)
	var s := _trauma * _trauma
	var t := _horloge * 22.0
	camera.offset = Vector2(_bruit.get_noise_2d(t, 3.0), _bruit.get_noise_2d(7.0, t)) * 15.0 * s
	camera.rotation = _bruit.get_noise_2d(t, 40.0) * 0.03 * s
	# la nuit, elle se rapproche un peu (le monde se resserre autour du feu) ; la peur la fait reculer ; la fin, s'approcher
	var cible := 1.0 + 0.045 * nuit - 0.035 * smoothstep(0.6, 1.0, _peur) + 0.14 * fin
	_zoom = lerpf(_zoom, cible, clampf(delta * 0.8, 0.0, 1.0))
	camera.zoom = Vector2(R.ZOOM, R.ZOOM) * _zoom


func _vue() -> Vector2:
	var s: Vector2 = _ecran.taille()
	if camera == null:
		return s
	return s / camera.zoom


# --- le temps ---

# l'image s'arrête un instant (en secondes réelles) : le poids d'un coup. Puis le temps reprend, à l'allure où il était.
func arret(duree: float) -> void:
	if duree <= 0.0:
		return
	_arret = maxf(_arret, duree)
	_temps()


func _process(delta: float) -> void:
	# (le temps réel de cette image : delta est ralenti avec le jeu)
	if _arret > 0.0:
		_arret -= delta / Engine.time_scale if Engine.time_scale > 0.0 else 0.0
	if _fin >= 0.0 and jeu != null and not jeu.en_partie:
		# l'écran de fin est là : le temps reprend son allure
		_lent = 1.0
	_temps()


# Engine.time_scale : la base (ce qu'il était, ou ce qu'un autre y a mis entre-temps), ralentie par l'arrêt ou la fin
func _temps() -> void:
	var f := minf(ARRET_LENT if _arret > 0.0 else 1.0, _lent)
	if _pose < 0.0:
		if f >= 1.0:
			return
		_base_temps = Engine.time_scale
	elif not is_equal_approx(Engine.time_scale, _pose):
		_base_temps = Engine.time_scale
	if f >= 1.0:
		Engine.time_scale = _base_temps
		_pose = -1.0
	else:
		_pose = _base_temps * f
		Engine.time_scale = _pose


# --- les éclats ---

# un coup porté à une bête, à ce point (la couleur de sa robe)
func impact(p: Vector2, couleur: Color) -> void:
	if _air() == null:
		return
	_gerbe(p, 9, T.eclat(), T.rampe([[0.0, couleur.lightened(0.15)], [1.0, couleur.darkened(0.35)]]), true,
		{"vitesse": [60.0, 150.0], "gravite": Vector2(0, 340), "duree": 0.5, "taille": [0.3, 0.65], "tourne": true})
	_gerbe(p, 4, T.point_doux(), T.rampe([[0.0, Color(P.ENCRE, 0.85)], [1.0, Color(P.ENCRE, 0.0)]]), true,
		{"vitesse": [30.0, 90.0], "gravite": Vector2(0, 260), "duree": 0.55, "taille": [0.05, 0.11]})
	_eclair(p, P.BRAISE_COEUR.lerp(P.PAPIER, 0.5), 22.0, 0.14)


# une bête meurt ici (sa robe, sa largeur en pixels) : une bouffée d'encre qui monte un peu, et retombe
func mort(p: Vector2, couleur: Color, largeur: float) -> void:
	if _air() == null:
		return
	var k := clampf(largeur / 60.0, 0.4, 2.5)
	var h := p + Vector2(0, -largeur * 0.3)
	_gerbe(h, int(14 + 6 * k), T.point_doux(), T.rampe([[0.0, Color(P.ENCRE, 0.9)], [0.6, Color(P.ENCRE_DOUCE, 0.55)], [1.0, Color(P.ENCRE_DOUCE, 0.0)]]), true,
		{"vitesse": [20.0, 50.0 + 25.0 * k], "dir": Vector2(0, -1), "spread": 80.0, "gravite": Vector2(vent() * 10.0, 70), "amortir": 30.0,
		"duree": 1.3, "taille": [0.18 * k, 0.36 * k], "grandit": true, "rayon": largeur * 0.25})
	_gerbe(h, int(6 + 3 * k), T.point_doux(), T.rampe([[0.0, Color(P.ENCRE, 1.0)], [0.8, Color(P.ENCRE, 0.8)], [1.0, Color(P.ENCRE, 0.0)]]), true,
		{"vitesse": [60.0, 120.0], "dir": Vector2(0, -1), "spread": 70.0, "gravite": Vector2(0, 320), "duree": 0.9, "taille": [0.05, 0.1]})
	_gerbe(h, 6, T.eclat(), T.rampe([[0.0, couleur], [1.0, couleur.darkened(0.4)]]), true,
		{"vitesse": [50.0, 120.0], "gravite": Vector2(0, 300), "duree": 0.7, "taille": [0.3, 0.6], "tourne": true})


# un geste de récolte sur un objet du lieu (son genre : arbre, sapin, rocher, buisson, touffe, brindille)
func recolte(p: Vector2, genre: String) -> void:
	if _air() == null:
		return
	var pal: Dictionary = jeu.monde.palette if jeu != null and jeu.monde != null else {}
	var feuilles: Color = pal.get("feuilles", P.MOUSSE)
	var v := vent()
	match genre:
		"arbre", "sapin", "souche":
			if genre != "souche":
				var tex := T.feuille() if genre == "arbre" else T.brin()
				_gerbe(p + Vector2(0, -42), 8, tex, T.rampe([[0.0, feuilles.lightened(0.15)], [0.5, feuilles], [1.0, feuilles.darkened(0.3)]]), false,
					{"vitesse": [30.0, 80.0], "spread": 150.0, "gravite": Vector2(v * 30.0, 70), "amortir": 45.0, "duree": 1.4, "taille": [0.4, 0.7], "tourne": true, "rayon": 14.0})
			_gerbe(p + Vector2(0, -12), 6, T.eclat(), T.rampe([[0.0, P.TERRE.lerp(P.IVOIRE, 0.45)], [1.0, P.TERRE]]), false,
				{"vitesse": [80.0, 160.0], "gravite": Vector2(0, 420), "duree": 0.5, "taille": [0.25, 0.45], "tourne": true})
		"rocher":
			var pierre: Color = pal.get("pierre", Color(0.45, 0.44, 0.42))
			_gerbe(p + Vector2(0, -8), 9, T.eclat(), T.rampe([[0.0, pierre.lightened(0.25)], [1.0, pierre.darkened(0.2)]]), false,
				{"vitesse": [90.0, 180.0], "gravite": Vector2(0, 460), "duree": 0.55, "taille": [0.25, 0.5], "tourne": true})
			_gerbe(p + Vector2(0, -4), 5, T.point_doux(), T.rampe([[0.0, Color(pierre.lightened(0.35), 0.4)], [1.0, Color(pierre.lightened(0.35), 0.0)]]), false,
				{"vitesse": [10.0, 30.0], "gravite": Vector2(v * 12.0, -6), "duree": 1.0, "taille": [0.25, 0.4], "grandit": true, "rayon": 10.0})
			_eclair(p + Vector2(0, -8), P.PAPIER, 12.0, 0.08)
		"buisson":
			_gerbe(p + Vector2(0, -10), 7, T.feuille(), T.rampe([[0.0, feuilles.lightened(0.1)], [1.0, feuilles.darkened(0.3)]]), false,
				{"vitesse": [30.0, 70.0], "spread": 160.0, "gravite": Vector2(v * 25.0, 90), "amortir": 40.0, "duree": 1.0, "taille": [0.3, 0.5], "tourne": true, "rayon": 8.0})
			_gerbe(p + Vector2(0, -8), 3, T.point_doux(), T.rampe([[0.0, P.SANG.lightened(0.3)], [1.0, P.SANG]]), false,
				{"vitesse": [40.0, 80.0], "gravite": Vector2(0, 300), "duree": 0.6, "taille": [0.05, 0.07]})
		"touffe":
			var herbe: Color = pal.get("herbe", P.MOUSSE)
			_gerbe(p + Vector2(0, -6), 8, T.brin(), T.rampe([[0.0, herbe.lightened(0.25)], [1.0, herbe.darkened(0.2)]]), false,
				{"vitesse": [40.0, 90.0], "spread": 120.0, "gravite": Vector2(v * 20.0, 200), "amortir": 30.0, "duree": 0.8, "taille": [0.5, 0.8], "tourne": true})
		_:
			_gerbe(p + Vector2(0, -3), 5, T.brin(), T.rampe([[0.0, P.TERRE.lightened(0.2)], [1.0, P.TERRE.darkened(0.2)]]), false,
				{"vitesse": [40.0, 90.0], "gravite": Vector2(0, 300), "duree": 0.6, "taille": [0.4, 0.6], "tourne": true})


# un pas sur le sol (la veilleuse, une bête qui bondit) : un peu de poussière de la couleur du sol, qui retombe
# (pas encore appelé par le jeu : une accroche pour le signal « pas » de la veilleuse)
func pas(p: Vector2, fort: float = 0.5) -> void:
	if _air() == null:
		return
	var pal: Dictionary = jeu.monde.palette if jeu != null and jeu.monde != null else {}
	var c: Color = pal.get("sol", P.TERRE).lightened(0.25)
	_gerbe(p + Vector2(0, -1), int(3 + 4 * fort), T.point_doux(), T.rampe([[0.0, Color(c, 0.35 * fort + 0.1)], [1.0, Color(c, 0.0)]]), true,
		{"vitesse": [8.0, 26.0], "dir": Vector2(0, -1), "spread": 70.0, "gravite": Vector2(vent() * 8.0, 10), "amortir": 20.0,
		"duree": 0.7, "taille": [0.08, 0.16], "grandit": true, "rayon": 3.0})


# un feu de camp prend : une gerbe, un éclat
func allumage(p: Vector2) -> void:
	if jeu != null:
		for f in jeu.feux:
			if is_instance_valid(f) and f.position.distance_to(p) < 4.0:
				f.gerbe(1.0)
	if _air() != null:
		_eclair(p + Vector2(0, -14), P.BRAISE_COEUR, 70.0, 0.45)
	secousse(0.08)


# la veilleuse est mordue
func blessure() -> void:
	_blessure = 1.0
	_choc = maxf(_choc, 0.7)


# un écho la traverse : un frisson froid
func echo(p: Vector2) -> void:
	_echo = 1.0
	_choc = maxf(_choc, 0.5)
	secousse(0.15)
	_ecran.frisson(P.ECHO, int(16 * _q))
	if _air() != null:
		var g := _gerbe(p + Vector2(0, -12), int(14 * _q) + 4, T.point_doux(), T.rampe([[0.0, Color(P.ECHO, 0.7)], [1.0, Color(P.ECHO, 0.0)]]), true,
			{"vitesse": [20.0, 60.0], "spread": 180.0, "gravite": Vector2(0, -20), "amortir": 20.0, "duree": 1.2, "taille": [0.15, 0.3], "grandit": true, "rayon": 10.0})
		g.material = T.materiau(true, false)


# la nuit tombe : un souffle froid, et le feu qui s'avive
func tombee() -> void:
	_froid = 1.0
	_ecran.souffle(P.LUNE.lerp(P.ECHO, 0.3), int(26 * _q))
	if jeu != null:
		for f in jeu.feux:
			if is_instance_valid(f) and f.has_method("aviver"):
				f.aviver()


# le jour revient : une lumière qui monte
func aube() -> void:
	_aube = 1.0
	_froid = 0.0


# la veilleuse tombe : la partie va finir (l'écran de fin vient après jeu.DUREE_MORT secondes)
func fin() -> void:
	_fin = 0.0
	secousse(0.3)


# --- le cœur ---

# un battement de cœur : la vignette se resserre. Le son peut l'appeler quand il joue le cœur, pour qu'ils battent ensemble ;
# sinon, les effets battent seuls, au même rythme que lui (scripts/sons.gd)
func battement() -> void:
	_battu = 0.0
	_dehors = 1.5


func _battre(delta: float, peur: float) -> void:
	_battu += delta
	_dehors = maxf(0.0, _dehors - delta)
	if peur > 60.0 and _dehors <= 0.0:
		_prochain -= delta
		if _prochain <= 0.0:
			_prochain = lerpf(1.1, 0.45, (peur - 60.0) / 40.0)
			_battu = 0.0
	# deux coups (« pou-poum ») qui retombent
	var b := _battu
	_coeur = exp(-b * 10.0) + (0.65 * exp(-(b - 0.17) * 10.0) if b > 0.17 else 0.0)


# --- les gerbes ---

func _air() -> Node2D:
	if _lieu == null or _lieu.air == null or not is_instance_valid(_lieu.air):
		return null
	return _lieu.air


# une gerbe de particules, une seule fois, puis elle s'efface ; r : vitesse, dir, spread, gravite, amortir, duree, taille,
# tourne, grandit, rayon
func _gerbe(p: Vector2, n: int, tex: Texture2D, rampe: Gradient, eclaire: bool, r: Dictionary) -> CPUParticles2D:
	var g := CPUParticles2D.new()
	g.amount = maxi(2, int(n * _q))
	g.one_shot = true
	g.explosiveness = 0.92
	g.lifetime = r.get("duree", 0.6)
	g.lifetime_randomness = 0.35
	g.local_coords = false
	g.texture = tex
	g.material = T.materiau(false, eclaire)
	g.position = p
	if r.has("rayon"):
		g.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
		g.emission_sphere_radius = r["rayon"]
	g.direction = r.get("dir", Vector2(0, -1))
	g.spread = r.get("spread", 180.0)
	var v: Array = r.get("vitesse", [40.0, 90.0])
	g.initial_velocity_min = v[0]
	g.initial_velocity_max = v[1]
	g.gravity = r.get("gravite", Vector2(0, 200))
	g.damping_min = r.get("amortir", 0.0) * 0.6
	g.damping_max = r.get("amortir", 0.0)
	var t: Array = r.get("taille", [0.3, 0.6])
	g.scale_amount_min = t[0]
	g.scale_amount_max = t[1]
	if r.get("grandit", false):
		g.scale_amount_curve = T.courbe([[0.0, 0.5], [1.0, 1.4]])
	if r.get("tourne", false):
		g.angle_min = 0.0
		g.angle_max = 360.0
		g.angular_velocity_min = -360.0
		g.angular_velocity_max = 360.0
	g.color_ramp = rampe
	_air().add_child(g)
	g.emitting = true
	get_tree().create_timer(g.lifetime + 0.4, false).timeout.connect(g.queue_free)
	return g


# un éclat de lumière bref (additif, sans lumière reçue : l'obscurité ne le touche pas, il brille même dans le noir)
func _eclair(p: Vector2, couleur: Color, taille: float, duree: float) -> void:
	var s := Sprite2D.new()
	s.texture = T.point_doux()
	s.material = T.materiau(true, false)
	s.position = p
	var k := taille / 32.0
	s.scale = Vector2(k, k) * 0.6
	s.self_modulate = Color(couleur, 0.9)
	_air().add_child(s)
	var tw := s.create_tween()
	tw.set_parallel(true)
	tw.tween_property(s, "scale", Vector2(k, k), duree).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(s, "self_modulate:a", 0.0, duree).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(s.queue_free)
