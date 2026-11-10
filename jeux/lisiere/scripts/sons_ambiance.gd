extends RefCounted
# Lisière — l'ambiance du lieu (scripts/sons_ambiance.gd)
# Ce qui vit autour de la veilleuse, tiré au hasard d'une image à l'autre : le jour, des oiseaux (plus en forêt, un chœur à
# l'aube) ; au soir et la nuit, des grillons qui chantent par phrases, chacun à son pas (plus vite s'il fait chaud), des
# grenouilles si le lieu est humide, une chouette de temps en temps (une autre lui répond), une branche qui casse au loin ;
# quand des chasseurs sont là, leurs hurlements ou leurs grondements, d'où ils sont, et ce qui bouge dans les fourrés tout près.
# sons.gd lui donne, à chaque image, ce qu'il faut savoir du moment (c) ; elle joue par sons.evenement().

var s                        # le nœud des sons
var _r := RandomNumberGenerator.new()
var _grillons: Array = []    # chacun : {hauteur, periode, pan, vol, variante, actif, reste, attente}
var _grenouilles: Array = []
var _oiseau := 3.0
var _reprises: Array = []    # ce qui répond, à venir : [attente, nom, vol, hauteur, pan, suit les oiseaux]
var _choeur_aube := 0.0
var _chouette := 30.0
var _craquement := 18.0
var _hurlement := 8.0
var _fourre := 2.0
var _temp := 0.5


func _init(sons) -> void:
	s = sons
	_r.randomize()


# une partie commence : le lieu dit qui chante (sa température règle le pas des grillons)
func nouvelle_partie(c: Dictionary) -> void:
	_temp = c["temp"]
	_grillons.clear()
	var periode := lerpf(0.78, 0.38, clampf((_temp - 0.3) / 0.4, 0.0, 1.0))
	for i in 4:
		_grillons.append({"hauteur": _r.randf_range(0.93, 1.07), "periode": periode * _r.randf_range(0.85, 1.2),
			"pan": _r.randf_range(-0.85, 0.85), "vol": _r.randf_range(-31.0, -24.0), "variante": i % 2,
			"actif": _r.randf() < 0.5, "reste": _r.randf_range(1.0, 8.0), "attente": _r.randf()})
	_grenouilles.clear()
	for i in 3:
		_grenouilles.append({"hauteur": _r.randf_range(0.85, 1.15), "pan": _r.randf_range(-0.8, 0.8), "vol": _r.randf_range(-28.0, -21.0),
			"variante": i % 2, "attente": _r.randf_range(1.0, 10.0), "serie": 0})
	_reprises.clear()
	_oiseau = 2.0
	_chouette = _r.randf_range(20.0, 50.0)
	_craquement = _r.randf_range(12.0, 30.0)
	_hurlement = _r.randf_range(4.0, 12.0)
	_choeur_aube = 0.0


# l'aube : les oiseaux reviennent tous ensemble, un moment
func aube() -> void:
	_choeur_aube = 28.0
	_oiseau = 0.5


func maj(dt: float, c: Dictionary) -> void:
	if c["morte"]:
		return
	_grillons_maj(dt, c)
	_grenouilles_maj(dt, c)
	_oiseaux_maj(dt, c)
	_nuit_maj(dt, c)
	_chasseurs_maj(dt, c)


# --- les grillons : des phrases, puis des silences ; chacun garde sa place, sa hauteur et son pas ---

func _grillons_maj(dt: float, c: Dictionary) -> void:
	var g: float = c["grillons"]
	for x in _grillons:
		x["reste"] -= dt
		if x["reste"] <= 0.0:
			x["actif"] = not x["actif"]
			x["reste"] = _r.randf_range(4.0, 16.0) if x["actif"] else _r.randf_range(2.0, 9.0)
			if x["actif"]:
				x["pan"] = clampf(x["pan"] + _r.randf_range(-0.25, 0.25), -0.85, 0.85)
		if not x["actif"] or g < 0.03:
			continue
		x["attente"] -= dt
		if x["attente"] <= 0.0:
			x["attente"] += x["periode"] * _r.randf_range(0.97, 1.03)
			if x["attente"] < 0.0:
				x["attente"] = x["periode"]
			s.evenement("grillon%d" % x["variante"], x["vol"] + linear_to_db(g), x["hauteur"] * _r.randf_range(0.997, 1.003), x["pan"])


# --- les grenouilles : des séries de deux à cinq appels, puis rien ---

func _grenouilles_maj(dt: float, c: Dictionary) -> void:
	var g: float = c["grenouilles"]
	if g < 0.03:
		return
	for x in _grenouilles:
		x["attente"] -= dt
		if x["attente"] > 0.0:
			continue
		if x["serie"] <= 0:
			x["serie"] = _r.randi_range(2, 5)
		s.evenement("grenouille%d" % x["variante"], x["vol"] + linear_to_db(g), x["hauteur"] * _r.randf_range(0.98, 1.02), x["pan"])
		x["serie"] -= 1
		x["attente"] = _r.randf_range(0.45, 0.75) if x["serie"] > 0 else _r.randf_range(3.0, 12.0)


# --- les oiseaux : une espèce, une place, une phrase répétée deux ou trois fois ---

func _oiseaux_maj(dt: float, c: Dictionary) -> void:
	var b: float = c["oiseaux"]
	_choeur_aube = maxf(0.0, _choeur_aube - dt)
	for i in range(_reprises.size() - 1, -1, -1):
		var p: Array = _reprises[i]
		p[0] -= dt
		if p[0] <= 0.0:
			s.evenement(p[1], p[2] + (linear_to_db(maxf(b, 0.001)) if p[5] else 0.0), p[3], p[4])
			_reprises.remove_at(i)
	if b < 0.03:
		return
	_oiseau -= dt * (3.0 if _choeur_aube > 0.0 else 1.0)
	if _oiseau > 0.0:
		return
	_oiseau = _r.randf_range(2.5, 9.0) / (0.4 + b)
	# (en forêt, des merles et des mésanges ; dans l'ouvert, des alouettes qui trillent)
	var couvert: float = c["couvert"]
	var k := 0
	var x := _r.randf()
	if couvert > 0.5:
		k = 3 if x < 0.4 else (2 if x < 0.75 else (0 if x < 0.9 else 1))
	else:
		k = 1 if x < 0.4 else (0 if x < 0.75 else (2 if x < 0.9 else 3))
	var nom := "oiseau%d" % k
	var vol := _r.randf_range(-29.0, -21.0)
	var h := _r.randf_range(0.93, 1.1)
	var pan := _r.randf_range(-0.85, 0.85)
	s.evenement(nom, vol + linear_to_db(b), h, pan)
	var t := 0.0
	for i in _r.randi_range(0, 2):
		t += _r.randf_range(1.3, 2.8)
		_reprises.append([t, nom, vol - 1.0 * (i + 1), h, pan, true])


# --- la nuit : la chouette, la branche qui casse ---

func _nuit_maj(dt: float, c: Dictionary) -> void:
	var n: float = c["profonde"]
	if n < 0.5 or c["comble"] > 0.5:
		return
	_chouette -= dt
	if _chouette <= 0.0:
		_chouette = _r.randf_range(40.0, 95.0)
		var pan := _r.randf_range(-0.8, 0.8)
		s.evenement("chouette", _r.randf_range(-19.0, -14.0), _r.randf_range(0.97, 1.03), pan)
		if _r.randf() < 0.45:
			# (une autre lui répond, plus loin, de l'autre côté)
			_reprises.append([_r.randf_range(3.5, 6.0), "chouette", -24.0, 1.06, -pan * 0.8, false])
	_craquement -= dt * (1.0 + c["peur"])
	if _craquement <= 0.0:
		_craquement = _r.randf_range(22.0, 60.0)
		var pan2 := _r.randf_range(-0.85, 0.85)
		var proche = _chasseur_proche(c, 600.0)
		if proche != null:
			pan2 = s.pan_de(proche.position)
		s.evenement("craquement", _r.randf_range(-22.0, -16.0), _r.randf_range(0.85, 1.15), pan2)


# --- les chasseurs : leurs voix au loin, et ce qui bouge tout près ---

func _chasseurs_maj(dt: float, c: Dictionary) -> void:
	var chasseurs: Array = []
	for b in c["betes"]:
		if is_instance_valid(b) and b.role == "chasseur" and b.etat != "part":
			chasseurs.append(b)
	if chasseurs.is_empty():
		return
	var p: Vector2 = c["ici"]
	_hurlement -= dt
	if _hurlement <= 0.0 and c["comble"] < 0.5:
		_hurlement = _r.randf_range(14.0, 38.0)
		chasseurs.sort_custom(func(a, b): return a.position.distance_to(p) < b.position.distance_to(p))
		var qui = chasseurs[0] if _r.randf() < 0.55 else chasseurs[_r.randi() % chasseurs.size()]
		_voix_de(qui, p)
		# (la bande répond)
		if chasseurs.size() > 1 and _r.randf() < 0.5:
			var autre = chasseurs[(chasseurs.find(qui) + 1) % chasseurs.size()]
			var d: float = autre.position.distance_to(p)
			_reprises.append([_r.randf_range(1.5, 4.0), _nom_voix(autre), clampf(-8.0 - d / 45.0, -32.0, -10.0), _hauteur_voix(autre), s.pan_de(autre.position), false])
	# tout près, dans le noir : un froissement de feuilles, là où il marche
	_fourre -= dt
	if _fourre <= 0.0:
		_fourre = _r.randf_range(1.6, 4.2)
		var proche = _chasseur_proche(c, 380.0)
		if proche != null:
			var d2: float = proche.position.distance_to(p)
			s.evenement("froissement%d" % (_r.randi() % 2), -13.0 - d2 / 35.0, clampf(1.2 - 0.08 * log(maxf(1.0, proche.masse)) / log(2.0), 0.7, 1.2), s.pan_de(proche.position))


func _voix_de(b, p: Vector2) -> void:
	var d: float = b.position.distance_to(p)
	s.evenement(_nom_voix(b), clampf(-8.0 - d / 45.0, -32.0, -10.0), _hauteur_voix(b), s.pan_de(b.position))


func _nom_voix(b) -> String:
	if b.masse > 60.0:
		return "grondement"
	return "hurlement%d" % (1 if b.masse < 15.0 else 0)


func _hauteur_voix(b) -> float:
	return clampf(1.25 - 0.1 * log(maxf(1.0, b.masse)) / log(2.0), 0.75, 1.3) * _r.randf_range(0.96, 1.04)


func _chasseur_proche(c: Dictionary, rayon: float):
	var p: Vector2 = c["ici"]
	var meilleur = null
	var d0 := rayon
	for b in c["betes"]:
		if is_instance_valid(b) and (b.role == "chasseur" or (b.role == "rodeur" and b.etat == "attaque")):
			var d: float = b.position.distance_to(p)
			if d < d0:
				d0 = d
				meilleur = b
	return meilleur
