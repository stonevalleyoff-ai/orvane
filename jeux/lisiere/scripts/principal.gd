extends Node
# Lisière — le jeu (scripts/principal.gd)
# Un lieu vrai du monde d'Orvane, une veilleuse, des jours de quatre minutes et des nuits qui durent selon la saison du monde.
# Le jour, on récolte et l'on chasse les bêtes du lieu ; la nuit, on tient près d'un feu : ses chasseurs viennent, tournent à la
# lisière de la lumière, mordent dans le noir. La peur monte dans l'obscurité ; au comble, ce qu'on a tué revient, en échos.
# Chaque bête croisée est comptée (« rencontre »), chaque bête tuée aussi (« prélèvement »), dans le lieu d'Orvane où c'est
# arrivé : à la fin de la partie, le kit en fait un lot (docs/4), déposé dans le bac à sable d'Orvane quand le jeu a sa clé.
#   outils/godot.sh --path jeux/lisiere                       jouer
#   outils/godot.sh --headless --path jeux/lisiere -- --essai l'essai sans écran (scripts/essai.gd)

const R := preload("res://scripts/regles.gd")
const Donnees := preload("res://scripts/donnees.gd")
const Monde := preload("res://scripts/monde.gd")
const Joueur := preload("res://scripts/joueur.gd")
const Bete := preload("res://scripts/bete.gd")
const Feu := preload("res://scripts/feu.gd")
const Interface := preload("res://scripts/interface.gd")
const Sons := preload("res://scripts/sons.gd")
const Yeux := preload("res://scripts/yeux.gd")
const Essai := preload("res://scripts/essai.gd")
const Tactile := preload("res://scripts/tactile.gd")
const SAUVEGARDE := "user://lisiere.json"

var donnees := Donnees.new()
var ui
var sons
var tactile
var scene: Node2D
var monde
var joueur
var camera: Camera2D
var obscurite: CanvasModulate
var couche_yeux: CanvasLayer
var yeux
var feux: Array = []
var en_partie := false
var en_pause := false
var biome := ""
var biome_info: Dictionary = {}
var faune: Dictionary = {}
var saison := "été"
var part_nuit := 0.33
var horloge := 0.0
var jour := 1
var nuits := 0
var croisees := 0
var chassees := 0
var tuees: Array = []
var vues: Dictionary = {}
var rencontres: Dictionary = {}
var prelevements: Dictionary = {}
var compte := ""
var record := 0
var essai = null
var _directeur := 0.0
var _vague := 0.0
var _coeur := 0.0
var _agir := 0.0
var _grogne := 0.0
var _etait_nuit := false
var _deja: Dictionary = {}


func _ready() -> void:
	randomize()
	_actions()
	sons = Sons.new()
	add_child(sons)
	ui = Interface.new()
	add_child(ui)
	ui.commencer.connect(_commencer)
	ui.recommencer.connect(func(): _commencer(biome))
	ui.vers_titre.connect(_titre)
	tactile = Tactile.new()
	tactile.jeu = self
	add_child(tactile)
	_charger()
	Orvane.jeu = "lisiere"
	Orvane.monde = R.MONDE_DES_LOTS
	Orvane.cle_jeu = R.CLE_JEU
	if "--essai" in OS.get_cmdline_user_args():
		essai = Essai.new()
		add_child(essai)
		return
	_titre()


# les touches, posées ici : par leur place sur le clavier (ZQSD sur un clavier français, WASD sur un anglais)
func _actions() -> void:
	var touches := {
		"haut": [KEY_W, KEY_UP], "bas": [KEY_S, KEY_DOWN], "gauche": [KEY_A, KEY_LEFT], "droite": [KEY_D, KEY_RIGHT],
		"agir": [KEY_SPACE], "feu": [KEY_1, KEY_KP_1], "torche": [KEY_2, KEY_KP_2], "lance": [KEY_3, KEY_KP_3],
		"manger": [KEY_E], "nourrir": [KEY_F], "cuire": [KEY_C], "pause": [KEY_ESCAPE, KEY_P], "valider": [KEY_ENTER, KEY_KP_ENTER],
	}
	for a in touches:
		if not InputMap.has_action(a):
			InputMap.add_action(a)
		for k in touches[a]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(a, e)
	var clic := InputEventMouseButton.new()
	clic.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("agir", clic)


# --- l'écran-titre, le début d'une partie ---

func _titre() -> void:
	_vider()
	ui.montrer_chargement("Le monde d'Orvane s'éveille…")
	await donnees.charger_index()
	ui.montrer_titre(donnees.lieux(), _infos_monde(), record)


func _infos_monde() -> String:
	var c: Dictionary = donnees.index.get("cycle", {})
	var s := str(c.get("saison", {}).get("nom", ""))
	var t := "Le monde d'Orvane, cycle %s%s" % [str(c.get("n", "?")), (", " + s) if s != "" else ""]
	if donnees.en_ligne:
		return t + ", tel qu'il est ce matin."
	return t + " : la copie gardée dans le jeu (hors ligne)."


func _commencer(b: String) -> void:
	if b == "":
		return
	biome = b
	ui.montrer_chargement("Le lieu s'éveille…")
	var inst: Dictionary = await donnees.charger_lieu(b)
	if inst.is_empty():
		ui.message_titre("Ce lieu ne se lit pas pour l'instant. Choisis-en un autre.")
		return
	var f: Dictionary = donnees.faune(inst, b)
	if (f["proies_jour"].is_empty() and f["proies_nuit"].is_empty()) or f["chasseurs_nuit"].is_empty():
		ui.message_titre("Aucune bête de ce lieu ne marche sur la terre ferme pour l'instant. Choisis-en un autre.")
		return
	faune = f
	biome_info = donnees.biome(b)
	saison = str(inst.get("cycle", {}).get("saison", {}).get("nom", "été"))
	part_nuit = float(R.NUIT.get(saison, 0.4))
	_nouvelle_partie()


func _nouvelle_partie() -> void:
	_vider()
	Orvane.oublier()
	var graine := randi()
	scene = Node2D.new()
	add_child(scene)
	obscurite = CanvasModulate.new()
	scene.add_child(obscurite)
	monde = Monde.new()
	monde.jeu = self
	monde.y_sort_enabled = true
	scene.add_child(monde.creer_sol(biome_info, graine))
	scene.add_child(monde)
	monde.generer(biome_info, graine)
	joueur = Joueur.new()
	monde.add_child(joueur)
	camera = Camera2D.new()
	camera.zoom = Vector2(R.ZOOM, R.ZOOM)
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 6.0
	joueur.add_child(camera)
	camera.make_current()
	couche_yeux = CanvasLayer.new()
	couche_yeux.layer = 1
	couche_yeux.follow_viewport_enabled = true
	add_child(couche_yeux)
	yeux = Yeux.new()
	yeux.jeu = self
	couche_yeux.add_child(yeux)
	horloge = R.TRANSITION + 2.0
	jour = 1
	nuits = 0
	croisees = 0
	chassees = 0
	tuees.clear()
	vues.clear()
	rencontres.clear()
	prelevements.clear()
	_deja.clear()
	_directeur = 0.5
	_vague = 0.0
	_etait_nuit = false
	en_pause = false
	en_partie = true
	ui.montrer_hud()
	ui.message("Tu t'éveilles à la lisière : %s, %s. Le jour baisse vite." % [str(biome_info.get("nom", biome)), saison])
	ui.message("Ramasse des brindilles et des pierres (Espace). Avec 4 bois et 2 pierres : un feu (1).", Color(0.95, 0.75, 0.45))


func _vider() -> void:
	en_partie = false
	en_pause = false
	ui.montrer_pause(false)
	if scene != null:
		scene.queue_free()
		scene = null
	if couche_yeux != null:
		couche_yeux.queue_free()
		couche_yeux = null
	feux.clear()
	joueur = null
	monde = null
	yeux = null
	sons.taire()


# --- le temps et la lumière ---

func lumiere_du_jour() -> float:
	var t := fmod(horloge, R.DUREE)
	var soir := R.DUREE * (1.0 - part_nuit)
	if t < R.TRANSITION:
		return t / R.TRANSITION
	if t < soir - R.TRANSITION:
		return 1.0
	if t < soir:
		return (soir - t) / R.TRANSITION
	return 0.0


func est_jour() -> bool:
	return lumiere_du_jour() > 0.5


func texte_horloge() -> String:
	var t := fmod(horloge, R.DUREE)
	var soir := R.DUREE * (1.0 - part_nuit)
	if t < soir:
		return "Jour %d · %s · la nuit dans %s" % [jour, saison, _duree(soir - t)]
	return "Nuit %d · %s · le jour dans %s" % [jour, saison, _duree(R.DUREE - t)]


func _duree(s: float) -> String:
	var n := int(ceil(s))
	return "%d s" % n if n < 60 else "%d min %02d" % [n / 60, n % 60]


# combien un point est éclairé, de 0 (le noir) à 1 : le jour, un feu, la torche
func eclairage(p: Vector2) -> float:
	var l := lumiere_du_jour()
	for f in feux:
		if is_instance_valid(f):
			l = maxf(l, f.eclaire(p))
	if joueur != null and joueur.torche > 0.0:
		var d: float = p.distance_to(joueur.position)
		l = maxf(l, clampf((R.RAYON_TORCHE - d) / (R.RAYON_TORCHE * 0.4), 0.0, 1.0))
	return l


# le feu allumé dans la lumière duquel est ce point (null : aucun)
func feu_qui_protege(p: Vector2):
	var meilleur = null
	var d0 := INF
	for f in feux:
		if is_instance_valid(f) and f.allume():
			var d: float = p.distance_to(f.position)
			if d < f.rayon() * 0.85 and d < d0:
				d0 = d
				meilleur = f
	return meilleur


func _feu_proche(p: Vector2, allume: bool):
	var meilleur = null
	var d0 := R.PORTEE_FEU
	for f in feux:
		if is_instance_valid(f) and (f.allume() or not allume):
			var d: float = p.distance_to(f.position)
			if d < d0:
				d0 = d
				meilleur = f
	return meilleur


func _lumieres() -> void:
	var l := lumiere_du_jour()
	var c := R.NUIT_COULEUR.lerp(Color(1, 1, 1), l)
	var tiede := sin(l * PI) if l < 1.0 else 0.0
	obscurite.color = c.lerp(Color(c.r, c.g * 0.78, c.b * 0.6), tiede * 0.7)


# --- chaque image ---

func _process(delta: float) -> void:
	if not en_partie:
		return
	if Input.is_action_just_pressed("pause"):
		en_pause = not en_pause
		ui.montrer_pause(en_pause)
	if en_pause:
		return
	horloge += delta
	var j := int(horloge / R.DUREE) + 1
	if j != jour:
		jour = j
		_aube()
	var nuit := lumiere_du_jour() <= 0.0
	if nuit and not _etait_nuit:
		_tombee_de_la_nuit()
	_etait_nuit = nuit
	_lumieres()
	if essai == null:
		_gestes(delta)
	_corps(delta)
	_directeur_passe(delta)
	_ambiance(delta)
	ui.maj_hud(self)
	if joueur.sante <= 0.0:
		_fin()


func _gestes(delta: float) -> void:
	joueur.deplacer(Input.get_vector("gauche", "droite", "haut", "bas"), delta, monde)
	_agir = maxf(0.0, _agir - delta)
	if Input.is_action_pressed("agir") and _agir <= 0.0:
		_agir = R.CADENCE
		agir()
	for k in R.ORDRE_RECETTES:
		if Input.is_action_just_pressed(k):
			fabriquer(k)
	if Input.is_action_just_pressed("manger"):
		manger()
	if Input.is_action_just_pressed("nourrir"):
		nourrir_feu()
	if Input.is_action_just_pressed("cuire"):
		cuire()


# frapper la bête la plus proche à portée ; sinon, prendre ce qui est à portée
func agir() -> void:
	var p: Vector2 = joueur.position
	var cible = null
	var d0 := R.PORTEE_COUP
	for b in get_tree().get_nodes_in_group("betes"):
		if b.role == "echo":
			continue
		var d: float = p.distance_to(b.position) - b.largeur * 0.3
		if d < d0:
			d0 = d
			cible = b
	if cible != null:
		joueur.frapper()
		var degats := R.DEGATS_LANCE if joueur.lance > 0 else R.DEGATS_POINGS
		if joueur.lance > 0:
			joueur.lance -= 1
			if joueur.lance == 0:
				ui.message("La lance s'est brisée.", Color(0.8, 0.7, 0.6))
		sons.jouer("coup", -2.0, randf_range(0.9, 1.1))
		cible.blesser(degats, p)
		return
	var o = monde.plus_proche(p, R.PORTEE_RECOLTE)
	if o == null:
		return
	joueur.frapper()
	var genre: String = o.genre
	var g: Dictionary = o.recolter()
	for k in g:
		joueur.inventaire[k] = int(joueur.inventaire.get(k, 0)) + int(g[k])
		ui.message("+%d %s" % [g[k], R.nom(k, int(g[k]))], Color(0.75, 0.78, 0.72))
	var son := "bois"
	if genre == "rocher":
		son = "pierre"
	elif genre == "buisson" or genre == "touffe":
		son = "herbe"
	sons.jouer(son, -4.0, randf_range(0.9, 1.15))
	if genre == "brindille" and o.epuise():
		monde.retirer(o)
	_conseil("feu", peut_fabriquer("feu") and feux.is_empty(), "Tu as de quoi faire un feu : touche 1.")


func peut_fabriquer(quoi: String) -> bool:
	if joueur == null:
		return false
	var cout: Dictionary = R.RECETTES[quoi]["cout"]
	for k in cout:
		if int(joueur.inventaire.get(k, 0)) < int(cout[k]):
			return false
	return true


func fabriquer(quoi: String) -> void:
	var rec: Dictionary = R.RECETTES[quoi]
	if not peut_fabriquer(quoi):
		var manque := []
		for k in rec["cout"]:
			var m := int(rec["cout"][k]) - int(joueur.inventaire.get(k, 0))
			if m > 0:
				manque.append("%d %s" % [m, R.nom(k, m)])
		ui.message("%s : il te manque %s." % [rec["nom"], ", ".join(PackedStringArray(manque))], Color(0.75, 0.7, 0.66))
		return
	for k in rec["cout"]:
		joueur.inventaire[k] = int(joueur.inventaire[k]) - int(rec["cout"][k])
	match quoi:
		"feu":
			var f = Feu.new()
			f.jeu = self
			f.position = monde.repousser(joueur.position + Vector2(joueur.regard * 34.0, 4.0), 12.0)
			monde.add_child(f)
			feux.append(f)
			sons.jouer("allume", -2.0)
			ui.message("Le feu prend. Nourris-le (F) : chaque bûche le fait durer.", Color(0.95, 0.75, 0.45))
		"torche":
			joueur.torche = R.DUREE_TORCHE
			sons.jouer("allume", -6.0, 1.3)
			ui.message("Une torche : un peu plus d'une minute de lumière.", Color(0.95, 0.75, 0.45))
		"lance":
			joueur.lance = R.USURE_LANCE
			ui.message("Une lance : elle frappe trois fois plus fort.", Color(0.95, 0.75, 0.45))


func manger() -> void:
	var inv: Dictionary = joueur.inventaire
	if int(inv["viande_cuite"]) > 0:
		inv["viande_cuite"] = int(inv["viande_cuite"]) - 1
		joueur.faim = minf(100.0, joueur.faim + 35.0)
		joueur.sante = minf(100.0, joueur.sante + 6.0)
		joueur.peur = maxf(0.0, joueur.peur - 8.0)
		ui.message("De la viande cuite. Ça réchauffe.")
	elif int(inv["baies"]) > 0:
		inv["baies"] = int(inv["baies"]) - 1
		joueur.faim = minf(100.0, joueur.faim + 12.0)
		ui.message("Une poignée de baies.")
	elif int(inv["viande"]) > 0:
		inv["viande"] = int(inv["viande"]) - 1
		joueur.faim = minf(100.0, joueur.faim + 18.0)
		joueur.sante = maxf(0.0, joueur.sante - 6.0)
		joueur.peur = minf(100.0, joueur.peur + 6.0)
		ui.message("La viande crue passe mal. Cuis-la (C), près d'un feu.", Color(0.85, 0.6, 0.55))
	else:
		ui.message("Rien à manger.", Color(0.75, 0.7, 0.66))
		return
	sons.jouer("manger", -5.0)


func nourrir_feu() -> void:
	var f = _feu_proche(joueur.position, false)
	if f == null:
		ui.message("Aucun feu à portée.", Color(0.75, 0.7, 0.66))
		return
	if int(joueur.inventaire["bois"]) <= 0:
		ui.message("Il te faut du bois.", Color(0.75, 0.7, 0.66))
		return
	joueur.inventaire["bois"] = int(joueur.inventaire["bois"]) - 1
	f.ajouter(1)
	sons.jouer("allume", -8.0, 1.2)


func cuire() -> void:
	var f = _feu_proche(joueur.position, true)
	if f == null:
		ui.message("Il faut un feu allumé, tout près.", Color(0.75, 0.7, 0.66))
		return
	if int(joueur.inventaire["viande"]) <= 0:
		ui.message("Rien à cuire.", Color(0.75, 0.7, 0.66))
		return
	joueur.inventaire["viande"] = int(joueur.inventaire["viande"]) - 1
	joueur.inventaire["viande_cuite"] = int(joueur.inventaire["viande_cuite"]) + 1
	sons.jouer("allume", -9.0, 0.7)
	ui.message("La viande grésille.", Color(0.95, 0.75, 0.45))


# --- le corps : la faim, la peur, la santé ---

func _corps(delta: float) -> void:
	var nuit := 1.0 - lumiere_du_jour()
	var lumiere := eclairage(joueur.position)
	joueur.faim = maxf(0.0, joueur.faim - R.FAIM * delta)
	if joueur.faim <= 0.0:
		joueur.sante -= R.FAMINE * delta
		_conseil("faim", true, "Tu as faim. Mange (E) : des baies, de la viande cuite.")
	var dp := -R.PEUR_JOUR
	if nuit > 0.5:
		dp = R.PEUR_NOIR if lumiere < 0.35 else -R.PEUR_LUMIERE
	if _chasseur_le_plus_proche() < 260.0:
		dp += R.PEUR_PRESENCE
	joueur.peur = clampf(joueur.peur + dp * delta, 0.0, 100.0)
	if joueur.peur >= 100.0:
		joueur.sante -= R.PANIQUE * delta
		_conseil("panique", true, "La peur te serre le cœur. Reviens à la lumière.")
	# (on ne guérit pas de la mort : à zéro, la partie s'arrête à la fin de cette image)
	if joueur.sante > 0.0 and joueur.faim > 60.0 and joueur.peur < 30.0:
		joueur.sante = minf(100.0, joueur.sante + R.SOIN * delta)


func _chasseur_le_plus_proche() -> float:
	var d0 := INF
	for b in get_tree().get_nodes_in_group("betes"):
		if b.role == "chasseur" or (b.role == "rodeur" and b.etat == "attaque"):
			d0 = minf(d0, joueur.position.distance_to(b.position))
	return d0


# --- ce qui arrive aux bêtes ---

func bete_tuee(b) -> void:
	chassees += 1
	Orvane.compter(b.id, biome, "prelevement")
	prelevements[b.id] = int(prelevements.get(b.id, 0)) + 1
	var viande := clampi(int(round(pow(b.masse, 0.4))), 1, 6)
	joueur.inventaire["viande"] = int(joueur.inventaire["viande"]) + viande
	ui.message("%s : +%d viande" % [b.nom, viande], Color(0.85, 0.72, 0.6))
	var deja := false
	for t in tuees:
		if t["id"] == b.id:
			deja = true
	if not deja:
		tuees.append({"lignee": b.lignee, "id": b.id, "nom": b.nom, "masse": b.masse, "effectif": 1.0, "poids": 1.0, "sociable": 0.0, "activite": "nocturne"})
	_conseil("echo", true, "Ce qu'on tue ici ne s'oublie pas tout à fait.")


func mordre(b) -> void:
	var d := 4.0 + 7.0 * log(float(b.masse) + 1.0) / log(10.0)
	joueur.blesser(d)
	sons.jouer("mord", -1.0, randf_range(0.85, 1.1))
	ui.blessure()
	_conseil("morsure-" + str(b.id), true, "%s te mord." % b.nom, Color(0.95, 0.5, 0.42))


func grognement(b) -> void:
	if _grogne > 0.0:
		return
	_grogne = 4.0
	var d: float = joueur.position.distance_to(b.position)
	sons.jouer("grogne", -2.0 - d / 60.0, randf_range(0.8, 1.15) * clampf(2.0 / sqrt(maxf(0.2, float(b.masse))), 0.6, 1.5))


func toucher_echo(e) -> void:
	joueur.peur = minf(100.0, joueur.peur + 14.0)
	sons.jouer("murmure", -3.0)
	ui.message("L'écho d'un %s te traverse." % e.nom, Color(0.75, 0.88, 1.0))
	e.queue_free()


# --- le directeur : qui vient, et quand ---

func _directeur_passe(delta: float) -> void:
	_grogne = maxf(0.0, _grogne - delta)
	_directeur -= delta
	if _directeur > 0.0:
		return
	_directeur = 0.5
	_voir()
	var l := lumiere_du_jour()
	var proies := 0
	var chasseurs := 0
	var echos := 0
	for b in get_tree().get_nodes_in_group("betes"):
		var loin: float = joueur.position.distance_to(b.position)
		if b.role != "echo" and loin > 1600.0:
			b.queue_free()
			continue
		match b.role:
			"proie", "rodeur":
				proies += 1
			"chasseur":
				chasseurs += 1
			"echo":
				echos += 1
	if randf() > 0.25:
		return
	if l > 0.5:
		if proies < R.PROIES_JOUR:
			var avec_rodeurs: Array = faune["proies_jour"] + faune["rodeurs"]
			var e = _choisir(avec_rodeurs)
			if e != null:
				_groupe(e, "rodeur" if faune["rodeurs"].has(e) else "proie", 520.0, 900.0)
		return
	# le soir et la nuit
	_vague -= 2.0
	var plafond := mini(R.CHASSEURS_MAX, 2 + nuits + (1 if part_nuit >= 0.45 else 0))
	if chasseurs < plafond and _vague <= 0.0 and l < 0.3:
		_vague = R.VAGUE
		var e = _choisir(faune["chasseurs_nuit"])
		if e != null:
			_groupe(e, "chasseur", 650.0, 950.0)
	if proies < 3:
		var e2 = _choisir(faune["proies_nuit"])
		if e2 != null:
			_groupe(e2, "proie", 520.0, 900.0)
	if joueur.peur > 55.0 and not tuees.is_empty() and echos < R.ECHOS_MAX and randf() < 0.5:
		var t = tuees[randi() % tuees.size()]
		_creer(t, "echo", joueur.position + Vector2.from_angle(randf() * TAU) * randf_range(280.0, 420.0))
		_conseil("echos", true, "Quelque chose de pâle approche. Tu le reconnais.", Color(0.75, 0.88, 1.0))


# une lignée, au hasard, d'autant plus souvent qu'elle est nombreuse ici
func _choisir(liste: Array):
	if liste.is_empty():
		return null
	var tot := 0.0
	for e in liste:
		tot += float(e["poids"])
	var x := randf() * tot
	for e in liste:
		x -= float(e["poids"])
		if x <= 0.0:
			return e
	return liste.back()


# une bête, ou une petite bande si la lignée vit en groupe, hors de vue
func _groupe(e: Dictionary, role: String, dmin: float, dmax: float) -> void:
	var p := Vector2.ZERO
	for essai_ in 8:
		p = joueur.position + Vector2.from_angle(randf() * TAU) * randf_range(dmin, dmax)
		p = Vector2(clampf(p.x, -R.DEMI, R.DEMI), clampf(p.y, -R.DEMI, R.DEMI))
		if eclairage(p) < 0.3 or role != "chasseur":
			break
	var n := 1
	if float(e["sociable"]) > 0.55:
		n = randi_range(2, 4 if role != "chasseur" else 3)
	for i in n:
		_creer(e, role, p + Vector2(randf_range(-40, 40), randf_range(-30, 30)))


func _creer(e: Dictionary, role: String, p: Vector2):
	var b = Bete.new()
	b.preparer(e, role, self, biome)
	b.position = p
	b.maison = p
	b.add_to_group("betes")
	if role == "echo":
		yeux.add_child(b)
	else:
		monde.add_child(b)
	return b


# une bête vue dans la lumière, la première fois : une rencontre, comptée dans le lieu d'Orvane où elle vit
func _voir() -> void:
	for b in get_tree().get_nodes_in_group("betes"):
		if b.vue or b.role == "echo":
			continue
		if joueur.position.distance_to(b.position) < 520.0 and eclairage(b.position) > 0.3:
			b.vue = true
			croisees += 1
			rencontres[b.id] = int(rencontres.get(b.id, 0)) + 1
			Orvane.compter(b.id, biome, "rencontre")
			if not vues.has(b.id):
				vues[b.id] = b.nom
				var quoi := "un chasseur" if b.role != "proie" else "une bête"
				ui.message("%s : %s de ce lieu." % [b.nom, quoi], Color(0.8, 0.84, 0.78))


func _tombee_de_la_nuit() -> void:
	_vague = 0.0
	if nuits == 0:
		ui.message("La nuit tombe. Reste dans la lumière.", Color(0.95, 0.75, 0.45))
	else:
		ui.message("La nuit tombe.", Color(0.95, 0.75, 0.45))


func _aube() -> void:
	nuits += 1
	ui.message("Le jour revient. Nuit %d tenue." % nuits, Color(0.98, 0.86, 0.6))
	if nuits > record:
		record = nuits
		_sauver()
	monde.semer_brindilles(30)


func _ambiance(delta: float) -> void:
	var nuit := 1.0 - lumiere_du_jour()
	sons.niveau("vent", 0.22 + 0.25 * nuit)
	sons.niveau("nuit", nuit * (0.3 + 0.55 * joueur.peur / 100.0))
	var df := INF
	for f in feux:
		if is_instance_valid(f) and f.allume():
			df = minf(df, joueur.position.distance_to(f.position))
	sons.niveau("feu", clampf(1.0 - df / 420.0, 0.0, 1.0) * 0.6)
	if joueur.peur > 60.0:
		_coeur -= delta
		if _coeur <= 0.0:
			_coeur = lerpf(1.1, 0.45, (joueur.peur - 60.0) / 40.0)
			sons.jouer("coeur", -3.0)


# un conseil, une seule fois par partie
func _conseil(cle: String, quand: bool, t: String, c: Color = Color(0.95, 0.75, 0.45)) -> void:
	if quand and not _deja.has(cle):
		_deja[cle] = true
		ui.message(t, c)


# --- la fin ---

func _fin() -> void:
	en_partie = false
	sons.taire()
	if nuits > record:
		record = nuits
	_sauver()
	var nr := 0
	var np := 0
	for k in rencontres:
		nr += int(rencontres[k])
	for k in prelevements:
		np += int(prelevements[k])
	var depot := "Le jeu n'a pas encore sa clé : le lot reste ici, rien n'est envoyé."
	if Orvane.cle_jeu != "":
		Orvane.clore(compte)
		Orvane.deposer(compte)
		depot = "Le lot part dans le bac à sable d'Orvane (monde « %s »)." % Orvane.monde
	else:
		Orvane.oublier()
	var noms := []
	for id in vues:
		var x := "%s ×%d" % [vues[id], int(rencontres.get(id, 0))]
		if prelevements.has(id):
			x += " (%d chassé%s)" % [prelevements[id], "s" if int(prelevements[id]) > 1 else ""]
		noms.append(x)
	var titre := "La nuit t'a prise." if lumiere_du_jour() < 0.5 else "Le lieu t'a prise."
	var resume := "Tu as tenu %d nuit%s dans ce lieu : %s. Ton record : %d.\nTu as croisé %d bête%s de %d lignée%s, et tu en as chassé %d." % [
		nuits, "s" if nuits > 1 else "", str(biome_info.get("nom", biome)), record, croisees, "s" if croisees > 1 else "",
		vues.size(), "s" if vues.size() > 1 else "", chassees]
	var lot := "Ce que ta partie renvoie au monde d'Orvane : %d rencontre%s, %d prélèvement%s, dans le lieu « %s ». %s\n%s" % [
		nr, "s" if nr > 1 else "", np, "s" if np > 1 else "", biome, depot, " · ".join(PackedStringArray(noms))]
	ui.montrer_fin(titre, resume, lot)


func _charger() -> void:
	if FileAccess.file_exists(SAUVEGARDE):
		var s = JSON.parse_string(FileAccess.get_file_as_string(SAUVEGARDE))
		if typeof(s) == TYPE_DICTIONARY:
			record = int(s.get("record", 0))
			compte = str(s.get("compte", ""))
	if compte == "":
		# un compte opaque : Orvane ne peut pas remonter au joueur
		compte = "h:" + ("lisiere-%d-%d" % [randi(), Time.get_unix_time_from_system()]).sha256_text().substr(0, 24)
		_sauver()


func _sauver() -> void:
	var f := FileAccess.open(SAUVEGARDE, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify({"record": record, "compte": compte}))
