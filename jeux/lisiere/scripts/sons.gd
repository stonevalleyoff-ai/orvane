extends Node
# Lisière — les sons (scripts/sons.gd)
# Tous faits par le code (sons_recettes.gd) : du bruit filtré, des résonances amorties, des voix de bêtes, des notes. Aucun
# fichier, aucune musique empruntée. Rien n'est calculé d'un bloc au lancement : une file prépare les sons d'image en image
# (quelques millisecondes à chaque fois), et un geste demandé avant d'être prêt est fait sur-le-champ.
# Ce qui vit : le vent (une respiration commune au lieu, des rafales), l'ambiance (sons_ambiance.gd : oiseaux, grillons,
# grenouilles, chouette, branches, chasseurs), le feu (un souffle, des braises, des crépitements tirés au hasard), les pas selon
# le sol, les gestes, la peur (un bourdon, le cœur, le monde qui se resserre puis se tait), la musique (sons_musique.gd),
# l'espace (un réverbère la nuit, un panoramique selon où est ce qui sonne), et la fin.
# Le jeu appelle : jouer(nom, volume_db, hauteur), niveau(boucle, v), taire(), maj(jeu, delta) à chaque image, pas(position)
# à chaque pied posé (sinon, une cadence tirée de joueur.en_mouvement), et titre() quand l'écran-titre se montre.
# Dans un navigateur (Godot 4.3, sans fils d'exécution), les sons passent par l'API Web Audio : les bus n'y ont pas d'effets,
# et une boucle laisse un trou à chaque tour. D'où les couches faites de tuiles qui se chevauchent, et un réverbère tout fait.

const O := preload("res://scripts/sons_outils.gd")
const F := preload("res://scripts/sons_recettes.gd")
const Ambiance := preload("res://scripts/sons_ambiance.gd")
const Musique := preload("res://scripts/sons_musique.gd")

const B_LISIERE := "Lisiere"
const B_MONDE := "Lisiere-monde"          # tout le lieu : la peur l'assourdit (hors navigateur, par un passe-bas), la fin le tait
const B_AMBIANCE := "Lisiere-ambiance"    # le vent, les bêtes au loin
const B_MUSIQUE := "Lisiere-musique"
const B_ESPACE := "Lisiere-espace"        # le réverbère de la nuit
const B_PEUR := "Lisiere-peur"            # le bourdon, le cœur, les morsures, l'écho : au-dessus de tout

# le niveau propre de chaque geste (en dB, ajouté à celui que donne le jeu), et sa part de réverbère la nuit
const GAINS := {"bois": -5.0, "pierre": -5.0, "herbe": -3.0, "coup": -3.0, "mord": -2.0, "grogne": -3.0, "murmure": -2.0,
	"manger": -3.0, "allume": -4.0, "coeur": -1.0, "gresille": -5.0, "eteint": -5.0, "chute": -3.0}
const MOUILLE := {"bois": 0.35, "pierre": 0.3, "herbe": 0.15, "coup": 0.3, "mord": 0.3, "grogne": 0.4, "allume": 0.25,
	"manger": 0.0, "pas": 0.12}
# dans un navigateur, la queue de réverbère toute faite qui va à chaque son
const QUEUES := {"pierre": "queue_claire", "herbe": "queue_claire", "grogne": "queue_voix", "allume": "queue_voix", "mord": "queue_voix"}
# les couches continues : [bus, niveau à 1 (dB), variantes, vitesse de lissage]
const COUCHES := {
	"vent_grave": [B_AMBIANCE, -9.0, 2, 0.8], "vent_clair": [B_AMBIANCE, -13.0, 2, 1.2], "choeur": [B_AMBIANCE, -7.0, 1, 0.5],
	"feu_souffle": [B_MONDE, -12.0, 2, 2.0], "feu_braise": [B_MONDE, -14.0, 1, 2.0],
	"bourdon": [B_PEUR, -5.0, 1, 0.6], "tension": [B_PEUR, -12.0, 1, 0.5],
}
# les anciens noms de boucles, pour niveau()
const ALIAS := {"vent": ["vent_grave", "vent_clair"], "nuit": ["bourdon"], "feu": ["feu_souffle", "feu_braise"]}
# ce qu'on prépare d'abord : les gestes, puis le vent et le feu, puis le reste du jour, de la nuit, la musique
const FILE := ["bois", "pierre", "herbe", "coup", "manger", "allume", "coeur", "mord", "grogne", "vent_grave0", "vent_clair0",
	"feu_souffle0", "feu_braise0", "braise0", "braise1", "braise2", "braise3", "braise4", "braise5", "braise6", "braise7",
	"pop0", "pop1", "pop2", "oiseau0", "oiseau1", "oiseau2", "oiseau3", "nappe_jour", "cloche", "bourdon0", "grillon0",
	"grillon1", "choeur0", "eteint", "gresille", "froissement0", "froissement1", "nappe_nuit", "tension0", "chute", "flute",
	"flute_longue", "vent_clair1", "feu_souffle1", "vent_grave1", "murmure", "corne", "hurlement0", "hurlement1", "grondement",
	"chouette", "craquement"]
const VOIX := 14
const VOIX_2D := 18

var duree_lancement_ms := 0.0     # le temps pris au lancement (_ready)
var duree_preparation_ms := 0.0   # le temps pris, image après image, à préparer les sons
var preparation_finie_ms := -1.0  # quand la file s'est vidée (depuis le lancement)

var _r := RandomNumberGenerator.new()
var _web := false
var _prets := {}
var _file: Array = []
var _travail = null               # un réverbère en cours : [nom, Reverbe, sec, part, taux]
var _repos := 0.0                 # en partie, le temps avant la prochaine recette (on espace les à-coups)
var _voix: Array = []
var _voix2d: Array = []
var _depart: PackedFloat64Array = PackedFloat64Array()
var _depart2d: PackedFloat64Array = PackedFloat64Array()
var _i := 0
var _i2d := 0
var _couches := {}
var _bus_cible := {}
var _bus_v := {}
var _filtre: AudioEffectLowPassFilter
var _coupure := 20000.0
var _ambiance
var _musique
var _horloge := 0.0
var _plus_tard: Array = []        # [attente, nom, vol, hauteur, bus]

# ce qu'on sait de la partie
var _joueur
var _sol := "herbe"
var _sol2 := "herbe"
var _dernier_pas := ""
var _pas_signal := false
var _pas_t := 0.0
var _coeur_t := 0.0
var _betes: Array = []
var _betes_t := 0.0
var _feux := {}
var _grain := 0.0
var _pop := 2.0
var _flamme := 0.0
var _nuit_entiere := false
var _nuits := 0
var _mort := -1.0
var _espace := 0.0
var _traits := {}
var _titre := false
var _theme := false
var _titre_dit := false


func _ready() -> void:
	var t0 := Time.get_ticks_usec()
	_r.randomize()
	_web = OS.has_feature("web")
	_bus(B_LISIERE, "Master")
	_bus(B_MONDE, B_LISIERE)
	_bus(B_AMBIANCE, B_MONDE)
	_bus(B_MUSIQUE, B_MONDE)
	_bus(B_ESPACE, B_MONDE)
	_bus(B_PEUR, B_LISIERE)
	if not _web:
		# (hors navigateur, les bus ont leurs effets : le monde se resserre par un passe-bas, la nuit a son réverbère, et rien ne sature)
		_filtre = AudioEffectLowPassFilter.new()
		_filtre.cutoff_hz = 20000.0
		AudioServer.add_bus_effect(AudioServer.get_bus_index(B_MONDE), _filtre)
		var rv := AudioEffectReverb.new()
		rv.predelay_msec = 45.0
		rv.predelay_feedback = 0.3
		rv.room_size = 0.78
		rv.damping = 0.55
		rv.spread = 0.9
		rv.hipass = 0.15
		rv.dry = 0.0
		rv.wet = 1.0
		AudioServer.add_bus_effect(AudioServer.get_bus_index(B_ESPACE), rv)
		var lim := AudioEffectHardLimiter.new()
		lim.ceiling_db = -1.0
		AudioServer.add_bus_effect(AudioServer.get_bus_index(B_LISIERE), lim)
	for k in [B_LISIERE, B_MONDE, B_AMBIANCE, B_MUSIQUE, B_ESPACE, B_PEUR]:
		_bus_cible[k] = 0.0
		_bus_v[k] = 0.0
	_bus_cible[B_MUSIQUE] = -4.0
	_bus_v[B_MUSIQUE] = -4.0
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index(B_MUSIQUE), -4.0)
	for i in VOIX:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_voix.append(p)
	_depart.resize(VOIX)
	var force := 1.0 / maxf(0.05, float(ProjectSettings.get_setting("audio/general/2d_panning_strength", 0.5)))
	for i in VOIX_2D:
		var q := AudioStreamPlayer2D.new()
		# (aucune atténuation par la distance : sons.gd la calcule ; le panoramique seul vient de la place du lecteur)
		q.attenuation = 0.0
		q.max_distance = 1.0e6
		q.panning_strength = force
		add_child(q)
		_voix2d.append(q)
	_depart2d.resize(VOIX_2D)
	for nom in COUCHES:
		var c := Couche.new()
		c.nom = nom
		c.bus = COUCHES[nom][0]
		c.gain_db = COUCHES[nom][1]
		c.variantes = COUCHES[nom][2]
		c.vitesse = COUCHES[nom][3]
		c.periode = F.TUILES[nom][0] - F.TUILES[nom][1]
		for k in 2:
			var p2 := AudioStreamPlayer.new()
			p2.bus = c.bus
			p2.volume_db = -80.0
			add_child(p2)
			c.lecteurs.append(p2)
		_couches[nom] = c
	_file = FILE.duplicate()
	if _web:
		_file.append_array(["queue_sourde", "queue_claire", "queue_voix"])
	_ambiance = Ambiance.new(self)
	_musique = Musique.new(self)
	duree_lancement_ms = (Time.get_ticks_usec() - t0) / 1000.0


# --- ce que le jeu appelle ---

func jouer(nom: String, volume_db: float = 0.0, hauteur: float = 1.0) -> void:
	if not F.TAUX.has(nom.rstrip("0123456789")):
		return
	var pan := 0.0
	var bus := B_MONDE
	match nom:
		"coup":
			pan = _pan_bete(["proie", "rodeur", "chasseur"], 140.0) * 0.4
		"mord":
			pan = _pan_bete(["chasseur", "rodeur"], 200.0) * 0.4
			bus = B_PEUR
		"grogne":
			pan = _pan_bete(["chasseur", "rodeur"], 700.0) * 0.8
		"murmure", "coeur":
			pan = _pan_bete(["echo"], 700.0) * 0.6 if nom == "murmure" else 0.0
			bus = B_PEUR
	_son(nom, volume_db + float(GAINS.get(nom, 0.0)), hauteur, pan, float(MOUILLE.get(nom, 0.0)) * _espace, bus, true)
	# (la viande qui cuit : le jeu joue « allume », grave ; on y ajoute le grésillement)
	if nom == "allume" and hauteur < 0.8:
		_son("gresille", volume_db + float(GAINS["gresille"]) + 3.0, 1.0, 0.0, 0.0, B_MONDE, true)


# un pied posé (le signal « pas » de la veilleuse, ou la cadence de maj)
func pas(_p = null) -> void:
	var sol := _sol if _r.randf() < 0.78 else _sol2
	var nom := "pas_%s%d" % [sol, _r.randi() % 4]
	if nom == _dernier_pas:
		nom = "pas_%s%d" % [sol, (int(nom.right(1)) + 1) % 4]
	_dernier_pas = nom
	var vol: float = {"feuilles": -15.0, "herbe": -17.0, "neige": -14.0, "terre": -16.0}.get(sol, -16.0) + _r.randf_range(-1.5, 1.5)
	_son(nom, vol, _r.randf_range(0.92, 1.08), 0.0, MOUILLE["pas"] * _espace, B_MONDE, false)


# le volume d'une boucle, de 0 (silence) à 1 (« vent », « nuit », « feu », ou le nom d'une couche) ; il y va doucement
func niveau(nom: String, v: float) -> void:
	for k in ALIAS.get(nom, [nom]):
		if _couches.has(k):
			_couches[k].cible = clampf(v, 0.0, 1.0)


# l'écran-titre est montré : le vent, et le thème (sans cet appel, sons.gd regarde si l'interface montre son _titre)
func titre() -> void:
	_titre_dit = true


# tout se tait (retour au titre, nouvelle partie, écran de fin)
func taire() -> void:
	for nom in _couches:
		var c = _couches[nom]
		c.cible = 0.0
		c.v = 0.0
		c.attente = 0.0
		for p in c.lecteurs:
			p.volume_db = -80.0
			p.stop()
	arreter_brefs()
	_plus_tard.clear()
	_musique.vider()
	_joueur = null
	_mort = -1.0
	_espace = 0.0
	_titre = false
	_titre_dit = false
	for k in _bus_cible:
		_bus_cible[k] = -4.0 if k == B_MUSIQUE else 0.0
	_coupure = 20000.0


# arrête tous les sons brefs (l'essai arrête les AudioStreamPlayer ; les voix placées, des AudioStreamPlayer2D, s'arrêtent ici)
func arreter_brefs() -> void:
	for p in _voix:
		p.stop()
	for q in _voix2d:
		q.stop()


# --- ce que l'ambiance et la musique appellent ---

# un son du lieu, placé (pan : -1 à gauche, 1 à droite) ; s'il n'est pas prêt, il est demandé et ne sonne pas cette fois
func evenement(nom: String, vol: float, hauteur: float = 1.0, pan: float = 0.0, bus: String = B_AMBIANCE) -> void:
	_son(nom, vol, hauteur, pan, 0.0, bus, false)


func note(nom: String, vol: float, hauteur: float) -> void:
	_son(nom, vol, hauteur, 0.0, 0.0, B_MUSIQUE, false)


# où est ce point, de gauche à droite, pour l'oreille de la veilleuse (-0,85 à 0,85)
func pan_de(p: Vector2) -> float:
	if _joueur == null or not is_instance_valid(_joueur):
		return 0.0
	return clampf((p.x - _joueur.position.x) / 520.0, -1.0, 1.0) * 0.85


# --- chaque image ---

func _process(delta: float) -> void:
	var dt := delta / maxf(Engine.time_scale, 0.001)
	_horloge += dt
	var jeu = get_parent()
	var en_partie: bool = jeu != null and "en_partie" in jeu and jeu.en_partie
	# la file : plus large hors partie (titre, chargement), étroite en partie (un son par image au plus)
	_repos = maxf(0.0, _repos - dt)
	_preparer(8000 if not en_partie else 2500, en_partie)
	# l'écran-titre : le vent, et le thème
	var titre: bool = not en_partie and jeu != null and "essai" in jeu and jeu.essai == null and (_titre_dit or _ecran_titre(jeu))
	if titre and not _titre:
		_titre = true
		_theme = false
		for nom in ["vent_clair0", "vent_grave0", "flute_longue", "flute", "nappe_nuit"]:
			_demander(nom, true)
	elif not titre and _titre:
		_titre = false
		_musique.vider()
	# (le thème attend que ses notes soient prêtes : une note qui ne l'est pas serait sautée)
	if _titre and not _theme and _prets.has("flute") and _prets.has("flute_longue") and _prets.has("nappe_nuit"):
		_theme = true
		_musique.titre()
	if _titre:
		var g := rafale(_horloge)
		niveau("vent_grave", 0.28 + 0.2 * g)
		niveau("vent_clair", 0.08 + 0.22 * g)
		_couches["vent_clair"].hauteur = 0.85 + 0.25 * g
		_musique.maj(dt, "titre", true)
	# la pause : tout recule
	if en_partie:
		_bus_cible[B_LISIERE] = -14.0 if jeu.en_pause else 0.0
	for i in range(_plus_tard.size() - 1, -1, -1):
		var e: Array = _plus_tard[i]
		e[0] -= dt
		if e[0] <= 0.0:
			_son(e[1], e[2], e[3], 0.0, 0.0, e[4], true)
			_plus_tard.remove_at(i)
	for nom in _couches:
		_couche_maj(_couches[nom], dt)
	_bus_maj(dt)


func maj(jeu, delta: float) -> void:
	var j = jeu.joueur
	if j == null:
		return
	var dt := delta / maxf(Engine.time_scale, 0.001)
	if j != _joueur:
		_nouvelle_partie(jeu, j)
	_betes_t -= dt
	if _betes_t <= 0.0:
		_betes_t = 0.25
		_betes = jeu.get_tree().get_nodes_in_group("betes")
	var l: float = jeu.lumiere_du_jour()
	var peur: float = clampf(j.peur / 100.0, 0.0, 1.0)
	var comble := smoothstep(0.93, 1.0, peur)
	if j.morte and _mort < 0.0:
		_tomber()
	var morte := _mort >= 0.0
	if morte:
		_mort += dt
		# (le grave s'éteint avant l'écran de fin : rien n'y est coupé net)
		if _mort > 1.8:
			_bus_cible[B_PEUR] = -40.0
	# la nuit, l'espace s'ouvre : un réverbère (plus en forêt, où les troncs renvoient le son)
	_espace = (1.0 - l) * (0.6 + 0.4 * float(_traits["couvert"]))
	# ce qui est clair (les aigus du lieu) se retire quand la peur monte : un passe-bas fait à la main, partout
	var clair := 1.0 - 0.85 * smoothstep(0.2, 0.75, peur)
	var c := {
		"l": l, "peur": peur, "comble": comble, "morte": morte, "clair": clair, "ici": j.position, "betes": _betes,
		"couvert": _traits["couvert"], "profonde": 1.0 - smoothstep(0.0, 0.15, l),
		"grillons": smoothstep(0.75, 0.15, l) * (0.0 if _traits["froid"] else 1.0) * (1.0 - 0.35 * float(_traits["couvert"])) * clair,
		"grenouilles": smoothstep(0.55, 0.95, _traits["humide"]) * smoothstep(0.65, 0.15, l) * (0.0 if _traits["froid"] else 1.0) * clair,
		"oiseaux": smoothstep(0.4, 0.85, l) * (0.45 if _traits["froid"] else 1.0) * (0.55 + 0.45 * float(_traits["couvert"])) * clair,
	}
	_vent(jeu, l, clair, morte)
	_feu(jeu, j, dt, morte, comble)
	_pas_maj(j, dt, morte)
	_peur(j, dt, peur, comble, morte)
	_couches["choeur"].cible = 0.0 if morte else c["grillons"] * 0.9
	_ambiance.maj(dt, c)
	# la nuit qui tombe, l'aube
	var nuit_entiere := l <= 0.0
	if nuit_entiere and not _nuit_entiere and not morte:
		_musique.tombee()
	_nuit_entiere = nuit_entiere
	if jeu.nuits > _nuits:
		_nuits = jeu.nuits
		_musique.aube()
		_ambiance.aube()
	_musique.maj(dt, "" if morte else ("jour" if l > 0.5 else "nuit"), peur < 0.45)
	# les bus : la peur assourdit le lieu, le comble le tait presque ; la musique s'efface la première
	if not morte:
		var monde := 1.0 - 0.45 * smoothstep(0.35, 0.9, peur) - 0.5 * comble
		_bus_cible[B_MONDE] = linear_to_db(maxf(monde, 0.001))
		_bus_cible[B_AMBIANCE] = linear_to_db(maxf(1.0 - 0.55 * smoothstep(0.3, 0.85, peur), 0.001))
		_bus_cible[B_MUSIQUE] = -4.0 + linear_to_db(maxf(1.0 - smoothstep(0.25, 0.55, peur), 0.001))
		_coupure = lerpf(20000.0, 650.0, pow(smoothstep(0.3, 0.95, peur), 0.7))
		if comble > 0.0:
			_coupure = lerpf(_coupure, 380.0, comble)


# --- la partie ---

func _nouvelle_partie(jeu, j) -> void:
	_joueur = j
	var axes: Dictionary = jeu.biome_info.get("axes", {}) if "biome_info" in jeu else {}
	var froid := false
	if jeu.monde != null and "palette" in jeu.monde:
		froid = bool(jeu.monde.palette.get("froid", false))
	else:
		froid = float(axes.get("temperature", 0.5)) < 0.35
	_traits = {"couvert": float(axes.get("couvert", 0.4)), "humide": float(axes.get("humidite", 0.5)),
		"temp": float(axes.get("temperature", 0.5)), "froid": froid}
	# le sol sous les pieds : la neige s'il fait froid, des feuilles sous le couvert, de la terre sèche dans l'ouvert
	if froid:
		_sol = "neige"
		_sol2 = "feuilles"
	elif _traits["couvert"] >= 0.45:
		_sol = "feuilles"
		_sol2 = "herbe"
	elif _traits["humide"] < 0.38:
		_sol = "terre"
		_sol2 = "herbe"
	else:
		_sol = "herbe"
		_sol2 = "terre" if _traits["humide"] < 0.6 else "feuilles"
	var devant := []
	for s in [_sol, _sol2]:
		for k in 4:
			devant.append("pas_%s%d" % [s, k])
	if _traits["humide"] > 0.55 and not froid:
		devant.append_array(["grenouille0", "grenouille1"])
	for nom in devant:
		_demander(nom, false)
	_pas_signal = false
	if j.has_signal("pas") and not j.is_connected("pas", pas):
		j.connect("pas", pas)
		_pas_signal = true
	_feux.clear()
	_nuit_entiere = false
	_nuits = jeu.nuits
	_mort = -1.0
	_ambiance.nouvelle_partie(_traits)
	_musique.vider()
	_musique._attente = 30.0


# le vent : une respiration lente pour tout le lieu, et des rafales ; plus de feuilles sous le couvert, plus froid s'il gèle
func _vent(jeu, l: float, clair: float, morte: bool) -> void:
	var g := rafale(float(jeu.horloge))
	if jeu.has_method("vent"):
		g = clampf(float(jeu.vent()), 0.0, 1.0)
	var couvert: float = _traits["couvert"]
	var froid: bool = _traits["froid"]
	var base := (1.0 - 0.3 * couvert) * (1.15 if froid else 1.0) * (0.9 + 0.1 * l)
	var k := 0.0 if morte else 1.0
	_couches["vent_grave"].cible = (0.5 + 0.5 * g) * base * k
	_couches["vent_grave"].hauteur = 0.9 + 0.2 * g
	_couches["vent_clair"].cible = (0.12 + 0.88 * pow(g, 1.6)) * (0.55 + 0.45 * couvert) * clair * k * (0.75 + 0.25 * l)
	_couches["vent_clair"].hauteur = (0.85 + 0.3 * g) * (1.1 if froid else 1.0)


# la respiration du lieu, de 0 (calme) à 1 (une rafale) : un souffle de trente secondes, et des rafales qui passent ;
# à partager avec l'herbe, les feuillages, les flammes (preload("res://scripts/sons.gd").rafale(jeu.horloge))
static func rafale(t: float) -> float:
	var souffle := 0.5 + 0.28 * sin(t * 0.21) + 0.14 * sin(t * 0.53 + 1.3)
	var rafale := pow(maxf(0.0, sin(t * 0.13 + 0.7)), 6.0) * 0.5 + pow(maxf(0.0, sin(t * 0.31 + 2.1)), 10.0) * 0.3
	return clampf(souffle * 0.75 + rafale, 0.0, 1.0)


# le feu le plus proche : son souffle, ses braises, ses crépitements tirés au hasard (plus vifs quand il a du bois)
func _feu(jeu, j, dt: float, morte: bool, comble: float) -> void:
	var proche = null
	var d0 := INF
	for f in jeu.feux:
		if not is_instance_valid(f):
			continue
		var id: int = f.get_instance_id()
		var allume: bool = f.allume()
		var d: float = j.position.distance_to(f.position)
		# (un feu qui s'éteint : un dernier souffle)
		if _feux.get(id, false) and not allume and d < 600.0 and not morte:
			_son("eteint", float(GAINS["eteint"]) + linear_to_db(maxf(0.05, 1.0 - d / 600.0)), 1.0, pan_de(f.position), 0.0, B_MONDE, false)
		_feux[id] = allume
		if allume and d < d0:
			d0 = d
			proche = f
	var prox := 0.0
	var vif := 0.0
	if proche != null:
		prox = pow(clampf(1.0 - d0 / 560.0, 0.0, 1.0), 1.6)
		vif = clampf(float(proche.bois) / 100.0, 0.15, 1.0)
	var k := (0.0 if morte else 1.0) * (1.0 - 0.6 * comble)
	_flamme = clampf(_flamme + _r.randf_range(-1.0, 1.0) * dt * 0.6, -0.05, 0.05)
	_couches["feu_souffle"].cible = prox * (0.45 + 0.55 * vif) * k
	_couches["feu_souffle"].hauteur = 0.92 + 0.12 * vif + _flamme
	_couches["feu_braise"].cible = prox * (0.3 + 0.7 * vif) * k
	if prox < 0.01 or k <= 0.0:
		return
	var pan := pan_de(proche.position) * 0.6
	# des crépitements : un processus de Poisson, de trois à seize par seconde
	_grain -= dt
	while _grain <= 0.0:
		_grain += -log(maxf(_r.randf(), 0.0001)) / (3.0 + 13.0 * vif)
		_son("braise%d" % (_r.randi() % 8), linear_to_db(prox * k) + _r.randf_range(-24.0, -10.0), _r.randf_range(0.75, 1.5), clampf(pan + _r.randf_range(-0.15, 0.15), -1.0, 1.0), 0.0, B_MONDE, false)
	_pop -= dt
	if _pop <= 0.0:
		_pop = -log(maxf(_r.randf(), 0.0001)) / (0.12 + 0.35 * vif)
		_son("pop%d" % (_r.randi() % 3), linear_to_db(prox * k) + _r.randf_range(-12.0, -5.0), _r.randf_range(0.85, 1.15), pan, 0.0, B_MONDE, false)


# les pas : au signal de la veilleuse s'il existe ; sinon, à la cadence de sa marche
func _pas_maj(j, dt: float, morte: bool) -> void:
	if _pas_signal or morte:
		return
	if not j.en_mouvement:
		_pas_t = minf(_pas_t, 0.08)
		return
	_pas_t -= dt
	if _pas_t <= 0.0:
		_pas_t += 0.32 / (0.7 if j.faim <= 0.0 else 1.0)
		pas(j.position)


# la peur : le bourdon monte, la tension par-dessus, le cœur accélère ; au comble, tout se tait sauf lui
func _peur(j, dt: float, peur: float, comble: float, morte: bool) -> void:
	if morte:
		_couches["bourdon"].cible = 0.0
		_couches["tension"].cible = 0.0
		return
	_couches["bourdon"].cible = smoothstep(0.22, 0.8, peur) * (1.0 - 0.85 * comble)
	_couches["bourdon"].hauteur = 1.0 + 0.006 * sin(_horloge * 0.37)
	_couches["tension"].cible = smoothstep(0.5, 0.9, peur) * (1.0 - comble)
	var faible: bool = j.sante < 25.0
	if peur < 0.42 and not faible:
		_coeur_t = minf(_coeur_t, 0.3)
		return
	_coeur_t -= dt
	if _coeur_t <= 0.0:
		var bpm := lerpf(66.0, 148.0, smoothstep(0.42, 1.0, peur)) if peur >= 0.42 else 72.0
		_coeur_t += 60.0 / bpm
		var vol := lerpf(-20.0, -6.0, smoothstep(0.42, 0.9, peur)) + 3.0 * comble
		if faible and peur < 0.42:
			vol = -16.0
		_son("coeur", vol, 1.0 + 0.12 * smoothstep(0.6, 1.0, peur), 0.0, 0.0, B_PEUR, true)


# la veilleuse tombe : un grave immense, le monde qui s'assourdit et se tait, deux derniers battements, puis rien
func _tomber() -> void:
	_mort = 0.0
	_son("chute", float(GAINS["chute"]), 1.0, 0.0, 0.0, B_PEUR, true)
	_plus_tard.append([0.45, "coeur", -7.0, 0.92, B_PEUR])
	_plus_tard.append([1.4, "coeur", -14.0, 0.85, B_PEUR])
	_bus_cible[B_MONDE] = -60.0
	_bus_cible[B_MUSIQUE] = -60.0
	_coupure = 160.0


# --- les voix ---

func _son(nom: String, vol: float, hauteur: float, pan: float, mouille: float, bus: String, maintenant: bool) -> void:
	var w := _flux(nom, maintenant)
	if w == null or vol < -70.0:
		return
	if absf(pan) < 0.03:
		_jouer_1d(w, vol, hauteur, bus)
	else:
		_jouer_2d(w, vol, hauteur, pan, bus)
	if mouille > 0.01:
		# le réverbère : hors navigateur, le même son passe par le bus de l'espace (son effet ne rend que la queue) ;
		# dans un navigateur, une queue toute faite, de la couleur du son
		var m := vol + linear_to_db(mouille)
		if _web:
			var q := _flux(QUEUES.get(nom.rstrip("0123456789"), "queue_sourde"), false)
			if q != null:
				_jouer_1d(q, m - 6.0, hauteur, B_ESPACE)
		else:
			_jouer_1d(w, m, hauteur, B_ESPACE)


func _jouer_1d(w: AudioStreamWAV, vol: float, hauteur: float, bus: String) -> void:
	var k := _libre(_voix, _depart, _i)
	_i = k + 1
	var p: AudioStreamPlayer = _voix[k]
	p.stop()
	p.stream = w
	p.bus = bus
	p.volume_db = vol
	_hauteur(p, hauteur)
	_depart[k] = _horloge


func _jouer_2d(w: AudioStreamWAV, vol: float, hauteur: float, pan: float, bus: String) -> void:
	var k := _libre(_voix2d, _depart2d, _i2d)
	_i2d = k + 1
	var q: AudioStreamPlayer2D = _voix2d[k]
	q.stop()
	pan = clampf(pan, -1.0, 1.0)
	# (le lecteur est posé à l'écran, de côté : le moteur en tire le panoramique ; au centre, un lecteur 2D rend 6 dB de moins
	# qu'un lecteur simple, et l'on garde la même puissance d'un bord à l'autre)
	var vp := get_viewport()
	var ct := vp.get_global_canvas_transform() * vp.get_canvas_transform()
	var sz := vp.get_visible_rect().size
	q.global_position = ct.affine_inverse() * (sz * 0.5 + Vector2(pan * sz.x, 0.0))
	q.stream = w
	q.bus = bus
	q.volume_db = vol + 6.02 - 10.0 * log(1.0 + pan * pan) / log(10.0)
	_hauteur(q, hauteur)
	_depart2d[k] = _horloge


# lance un lecteur à cette hauteur (dans un navigateur, Godot 4.3 ne transmet pas la hauteur posée avant play() : seule une
# hauteur changée pendant la lecture passe ; on la pose donc après, en partant de 1)
func _hauteur(p, hauteur: float) -> void:
	p.pitch_scale = 1.0
	p.play()
	p.pitch_scale = clampf(hauteur, 0.05, 16.0)


# une voix libre, à partir de i ; sinon, la plus ancienne
func _libre(voix: Array, depart: PackedFloat64Array, i: int) -> int:
	var n := voix.size()
	var vieille := 0
	for j in n:
		var k := (i + j) % n
		if not voix[k].playing:
			return k
		if depart[k] < depart[vieille]:
			vieille = k
	return vieille


# la bête la plus proche de ces rôles, à moins de « rayon » : sa place à l'oreille
func _pan_bete(roles: Array, rayon: float) -> float:
	if _joueur == null or not is_instance_valid(_joueur):
		return 0.0
	var d0 := rayon
	var p := 0.0
	for b in _betes:
		if is_instance_valid(b) and b.is_inside_tree() and roles.has(b.role):
			var d: float = b.position.distance_to(_joueur.position)
			if d < d0:
				d0 = d
				p = pan_de(b.position)
	return p


# --- les couches continues : des tuiles qui se chevauchent ---

class Couche:
	var nom := ""
	var bus := ""
	var lecteurs: Array = []
	var tour := 0
	var v := 0.0
	var cible := 0.0
	var hauteur := 1.0
	var attente := 0.0
	var periode := 4.0
	var gain_db := 0.0
	var variantes := 1
	var vitesse := 1.0
	var derniere := -1


func _couche_maj(c: Couche, dt: float) -> void:
	c.v += (c.cible - c.v) * (1.0 - exp(-dt * c.vitesse * 2.0))
	if c.v < 0.0008 and c.cible < 0.0008:
		c.attente = 0.0
		for p in c.lecteurs:
			if p.playing:
				p.volume_db = -80.0
		return
	var db := c.gain_db + linear_to_db(maxf(c.v, 0.00001))
	for p in c.lecteurs:
		p.volume_db = db
		p.pitch_scale = c.hauteur
	c.attente -= dt * c.hauteur
	if c.attente > 0.0:
		return
	# la tuile suivante, sur l'autre lecteur ; une variante au hasard parmi celles qui sont prêtes
	var choix := []
	for k in c.variantes:
		if k != c.derniere and _prets.has("%s%d" % [c.nom, k]):
			choix.append(k)
	if choix.is_empty() and _prets.has("%s%d" % [c.nom, maxi(c.derniere, 0)]):
		choix.append(maxi(c.derniere, 0))
	for k in c.variantes:
		_demander("%s%d" % [c.nom, k], true)
	if choix.is_empty():
		return
	var var_k: int = choix[_r.randi() % choix.size()]
	c.derniere = var_k
	var p2: AudioStreamPlayer = c.lecteurs[c.tour]
	c.tour = 1 - c.tour
	p2.stop()
	p2.stream = _prets["%s%d" % [c.nom, var_k]]
	p2.volume_db = db
	_hauteur(p2, c.hauteur)
	c.attente = c.periode if c.attente < -1.0 else c.attente + c.periode


func _bus(nom: String, vers: String) -> void:
	if AudioServer.get_bus_index(nom) >= 0:
		return
	# (dans un navigateur, AudioServer.add_bus() glisse le nouveau bus devant le Master, et tout se tait : on agrandit la liste)
	AudioServer.bus_count = AudioServer.bus_count + 1
	var i := AudioServer.bus_count - 1
	AudioServer.set_bus_name(i, nom)
	AudioServer.set_bus_send(i, vers)


func _bus_maj(dt: float) -> void:
	for nom in _bus_cible:
		var v: float = _bus_v[nom]
		var c: float = _bus_cible[nom]
		if absf(v - c) < 0.05:
			continue
		# (en dB, à vitesse réglée : vite vers le silence quand la veilleuse tombe, doucement sinon)
		var vit := 40.0 if c < v else 25.0
		v = move_toward(v, c, vit * dt) if absf(v - c) > 12.0 else lerpf(v, c, 1.0 - exp(-dt * 3.0))
		_bus_v[nom] = v
		AudioServer.set_bus_volume_db(AudioServer.get_bus_index(nom), v)
	if _filtre != null and absf(_filtre.cutoff_hz - _coupure) > 1.0:
		_filtre.cutoff_hz = exp(lerpf(log(_filtre.cutoff_hz), log(_coupure), 1.0 - exp(-dt * 4.0)))


# --- la file : chaque son est fait une fois, quand il le faut ---

func _flux(nom: String, maintenant: bool) -> AudioStreamWAV:
	var w = _prets.get(nom)
	if w != null:
		return w
	if maintenant:
		_fabriquer(nom, true)
		return _prets.get(nom)
	_demander(nom, true)
	return null


func _demander(nom: String, devant: bool) -> void:
	if _prets.has(nom) or (_travail != null and _travail[0] == nom):
		return
	var k := _file.find(nom)
	if k >= 0:
		if not devant or k == 0:
			return
		_file.remove_at(k)
	if devant:
		_file.push_front(nom)
	else:
		_file.push_back(nom)


func _preparer(budget_us: int, en_partie: bool) -> void:
	if _file.is_empty() and _travail == null:
		return
	var t0 := Time.get_ticks_usec()
	var fin := t0 + budget_us
	var fait := 0
	while Time.get_ticks_usec() < fin or fait == 0:
		# d'abord un son de la file (un réverbère en cours n'arrête pas les autres), puis le réverbère, avec le temps qui reste
		var nom := _prochain()
		if nom != "" and (not en_partie or (fait == 0 and _repos <= 0.0)):
			_file.erase(nom)
			fait += 1
			if not _prets.has(nom):
				_fabriquer(nom, false)
				if en_partie:
					_repos = 0.2
			continue
		fait += 1
		if _travail == null:
			break
		if _travail[1].avancer(1024):
			_finir_travail()
	duree_preparation_ms += (Time.get_ticks_usec() - t0) / 1000.0
	if _file.is_empty() and _travail == null and preparation_finie_ms < 0.0:
		preparation_finie_ms = Time.get_ticks_msec()
		print_verbose("Lisière, les sons : %d prêts, %.0f ms au lancement, %.0f ms de préparation, finie à %.1f s" % [_prets.size(), duree_lancement_ms, duree_preparation_ms, preparation_finie_ms / 1000.0])


# le premier son de la file qu'on peut faire tout de suite (un son lointain attend que le réverbère en cours ait fini)
func _prochain() -> String:
	for nom in _file:
		if _travail == null or not F.LOINTAINS.has(String(nom).rstrip("0123456789")):
			return nom
	return ""


func _fabriquer(nom: String, d_un_coup: bool) -> void:
	var a: Array = F.fabriquer(nom, _r)
	if a.is_empty():
		return
	var base := nom.rstrip("0123456789")
	if not F.LOINTAINS.has(base):
		_prets[nom] = O.vers_wav(a[0], a[1])
		return
	# un son lointain : son réverbère, fait par morceaux (au-dessus de 11 kHz, à moitié moins d'échantillons)
	var s: PackedFloat32Array = a[0]
	var taux: int = a[1]
	if taux > O.LENT:
		s = O.reduire(s)
		taux /= 2
	var p: Array = F.LOINTAINS[base]
	var t = [nom, O.Reverbe.new(s, taux, p[0], p[1]), s, p[2], taux]
	if _travail != null and not d_un_coup:
		_file.push_back(nom)
		return
	if d_un_coup:
		var avant = _travail
		_travail = t
		while not _travail[1].avancer(8192):
			pass
		_finir_travail()
		_travail = avant
	else:
		_travail = t


func _finir_travail() -> void:
	var nom: String = _travail[0]
	var w: PackedFloat32Array = _travail[1].sortie
	var sec: PackedFloat32Array = _travail[2]
	var part: float = _travail[3]
	for i in sec.size():
		w[i] = w[i] * 0.55 + sec[i] * part
	for i in range(sec.size(), w.size()):
		w[i] *= 0.55
	O.normaliser(w, 0.9)
	O.bords(w, _travail[4])
	_prets[nom] = O.vers_wav(w, _travail[4])
	_travail = null


# l'écran-titre est-il montré ? (l'interface garde son écran-titre dans _titre ; sans lui, pas de thème)
func _ecran_titre(jeu) -> bool:
	if not "ui" in jeu or jeu.ui == null:
		return false
	var t = jeu.ui.get("_titre")
	return t is CanvasItem and t.visible


# (Godot qui s'arrête avec des sons en lecture dit qu'ils fuient : on arrête tout en sortant de l'arbre)
func _exit_tree() -> void:
	arreter_brefs()
	for nom in _couches:
		for p in _couches[nom].lecteurs:
			p.stop()
