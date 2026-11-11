extends Node
# Portefaix — l'essai sans écran (scripts/essai.gd)
# Trois façons de le lancer, chacune sort avec le code 0 si tout passe, 1 sinon :
#   outils/godot.sh --headless --path jeux/portefaix -- --essai          une partie seul, jouée par le programme : la maison, les meubles,
#       porter un carton jusqu'au camion, traîner puis soulever à deux un canapé, casser un vase, la chose qui entend, voit, chasse et prend,
#       le mort qui pousse, le chat (ses votes, les lignes de Twitch), chaque sabotage, le klaxon, l'aube
#   outils/godot.sh --headless --path jeux/portefaix -- --essai-reseau   un hôte, qui lance lui-même un invité (un second programme) sur
#       cette machine, et vérifie avec lui que les deux voient la même partie
#   (-- --essai-client : l'invité que lance l'essai du réseau)

const R = preload("res://scripts/regles.gd")

var mode := "--essai"
var jeu
var ok := true
var n := 0
var rapports := {}
var _fini := false


func _ready() -> void:
	jeu = get_parent()
	_lancer.call_deferred()


func _lancer() -> void:
	match mode:
		"--essai-reseau":
			await _hote()
		"--essai-client":
			await _invite()
		_:
			await _seul()
	if mode != "--essai-client":
		print("\n%s : %d vérifications" % ["Tout passe" if ok else "ÉCHEC", n])
	get_tree().quit(0 if ok else 1)


func verif(c: bool, m: String) -> void:
	n += 1
	if not c:
		ok = false
	print(("  ✓ " if c else "  ✗ ") + m)


func _attendre(s: float) -> void:
	await get_tree().create_timer(s).timeout


func _images(k: int) -> void:
	for i in k:
		await get_tree().physics_frame


func _trouver(type: String, rang: int = 0):
	for o in jeu.objets.values():
		if o.type == type:
			if rang == 0:
				return o
			rang -= 1
	return null


# poser un porteur devant un objet, à cette distance, les yeux dessus
func _devant(j, o, d: float, de: Vector3 = Vector3(0, 0, 1)) -> void:
	j.global_position = Vector3(o.global_position.x, 0.05, o.global_position.z) + de.normalized() * d
	_tourner(j, o.global_position)


func _tourner(j, vers: Vector3) -> void:
	var d: Vector3 = vers - (j.global_position + Vector3(0.0, R.YEUX, 0.0))
	j.yaw = atan2(-d.x, -d.z)
	j.pitch = atan2(d.y, Vector2(d.x, d.z).length())


# marcher jusqu'à un point, par le chemin de la maison, à pas d'homme
func _marcher(j, vers: Vector3, vitesse: float = 3.0) -> void:
	var route: PackedVector3Array = jeu.maison.chemin(j.global_position, vers)
	route.append(vers)
	for p in route:
		while true:
			var d := Vector3(p.x - j.global_position.x, 0.0, p.z - j.global_position.z)
			if d.length() < 0.1:
				break
			j.yaw = lerp_angle(j.yaw, atan2(-d.x, -d.z), 0.15)
			j.global_position += d.normalized() * minf(vitesse / 60.0, d.length())
			await get_tree().physics_frame


func _pilote(j) -> void:
	j.pilote = true
	j.collision_layer = 0


# --- seul ---

func _seul() -> void:
	jeu.graine = 7                 # toujours la même maison : l'essai ne dépend pas du hasard (-- --essai --graine=12 en essaie une autre)
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--graine="):
			jeu.graine = int(a.get_slice("=", 1))
	jeu.jouer_seul()
	await _attendre(0.3)
	jeu.repit = 1e9
	jeu.chat.reste = 1e9
	var m = jeu.maison
	var moi = jeu.moi

	print("1. La maison")
	var lignes_egales := true
	var sols := 0
	var atteints := 0
	var entree: Vector2i = m.case_de(m.depart(0))
	for l in m.PLAN.size():
		lignes_egales = lignes_egales and m.PLAN[l].length() == m.largeur
		for c in m.PLAN[l].length():
			if m.PLAN[l][c] != "#":
				sols += 1
				if m.grille.get_id_path(entree, Vector2i(c, l)).size() > 0:
					atteints += 1
	verif(lignes_egales and m.portes.size() == 5 and m.lampes.size() == m.LAMPES.size(), "un plan de %d sur %d cases, 5 portes à claquer, %d lampes" % [m.largeur, m.profondeur, m.lampes.size()])
	verif(sols > 200 and atteints == sols, "les %d cases de sol se rejoignent toutes depuis la cour" % sols)
	verif(m.chemin(m.TANIERE, Vector3(12, 0, 20)).size() > 10, "la chose a un chemin de sa tanière au camion")
	verif(m.dans_zone(Vector3(12, 0.5, 19.5)) and not m.dans_zone(Vector3(12, 0.5, 14)), "la zone de chargement est dans la cour, devant la porte")

	print("2. Les meubles")
	var dedans := true
	for o in jeu.objets.values():
		dedans = dedans and m.dedans(o.global_position)
	verif(jeu.objets.size() == R.MOBILIER.size() and dedans, "%d meubles, tous dans la maison, pour %d €" % [jeu.objets.size(), jeu.total])
	verif(jeu.quota == R.quota(jeu.total, 1) and jeu.quota > 0 and jeu.quota < jeu.total / 2, "le quota d'un porteur seul : %d €" % jeu.quota)
	verif(R.quota(jeu.total, 4) > jeu.quota and R.quota(jeu.total, 9) <= int(jeu.total * R.QUOTA_MAX) + 10, "il monte avec le nombre de porteurs, sans passer %d %%" % int(R.QUOTA_MAX * 100))
	await _attendre(2.4)
	var poses := true
	var intacts := true
	for o in jeu.objets.values():
		poses = poses and m.dedans(o.global_position) and o.global_position.y > 0.0 and o.global_position.y < 1.2
		intacts = intacts and o.valeur == o.valeur_neuve
	verif(poses and intacts, "posés, ils tiennent sur le plancher, sans rien casser")
	var chose = jeu.chose
	chose.entendre(m.TANIERE + Vector3(3, 0, 0), 10.0)
	verif(chose.mode == chose.DORT and not chose.visible, "la chose dort dans le bureau ; un bruit modeste ne la réveille pas")
	chose.entendre(m.TANIERE + Vector3(3, 0, 0), 20.0)
	verif(chose.mode == chose.ENQUETE, "un grand fracas, si, avant l'heure")
	chose.mode = chose.DORT       # qu'elle laisse l'essai porter en paix

	print("3. Porter")
	_pilote(moi)
	var carton = _trouver("carton")
	_devant(moi, carton, 1.3)
	await _images(3)
	verif(moi.regard() == carton, "le porteur a le carton sous les yeux")
	jeu.prendre(1, carton.id)
	verif(carton.porteurs == [1] and moi.porte == carton.id, "il le prend")
	moi.pitch = 0.0
	await _attendre(0.8)
	verif(carton.global_position.y > 0.9 and carton.global_position.distance_to(moi.point_de_prise(carton.taille)) < 0.4, "le carton monte à ses mains (%.2f m du sol)" % carton.global_position.y)
	verif(moi.frein() < 1.0 and moi.frein() > 0.8, "un carton le ralentit à peine (%d %%)" % int(moi.frein() * 100))
	await _marcher(moi, Vector3(12.0, 0.05, 18.3))
	verif(carton.porteurs == [1], "il le garde en main à travers la maison, jusque dans la cour")
	_tourner(moi, Vector3(12.0, 0.0, 30.0))
	await _attendre(0.5)
	jeu.lacher(1, carton.id, false)
	await _attendre(1.2)
	jeu.compter()
	verif(moi.porte == -1 and m.dans_zone(carton.global_position), "il le pose dans la zone")
	verif(jeu.charge == carton.valeur and jeu.charge > 0, "le chargement compte le carton : %d €" % jeu.charge)

	print("4. Les lourds")
	var canape = _trouver("canape")
	var piece := Vector3(canape.global_position.x, 0.0, canape.global_position.z)
	_devant(moi, canape, 2.0)
	moi.pitch = 0.0
	await _images(3)
	var sol: float = canape.global_position.y
	jeu.prendre(1, canape.id)
	await _attendre(1.2)
	verif(canape.porteurs == [1] and canape.lourd() and canape.global_position.y < sol + 0.25, "seul, le canapé (%d kg) ne décolle pas" % int(canape.mass))
	verif(moi.frein() < 0.5, "et il ralentit son porteur de plus de moitié")
	moi.global_position += Vector3(0, 0, 1.5)
	await _attendre(2.0)
	var traine := Vector2(canape.global_position.x - piece.x, canape.global_position.z - piece.z).length()
	verif(traine > 0.3, "mais il se traîne (%.1f m en deux secondes)" % traine)
	var second = jeu.ajouter_joueur(2, moi.global_position, 1)
	_pilote(second)
	second.yaw = moi.yaw
	await _images(2)
	jeu.prendre(2, canape.id)
	await _attendre(2.2)
	verif(canape.porteurs.size() == 2 and canape.global_position.y > sol + 0.3, "à deux, il se soulève (%.2f m)" % canape.global_position.y)
	jeu.lacher(1, canape.id, false)
	jeu.lacher(2, canape.id, false)
	verif(canape.porteurs.is_empty() and moi.porte == -1 and second.porte == -1, "ils le lâchent")
	var chaise = _trouver("chaise")
	_devant(moi, chaise, 1.3)
	await _images(3)
	jeu.prendre(1, chaise.id)
	moi.pitch = 0.0
	await _attendre(0.6)
	jeu.lacher(1, chaise.id, true)
	await _images(2)
	verif(chaise.porteurs.is_empty() and chaise.linear_velocity.length() > 5.0, "une chaise se lance (%.1f m/s)" % chaise.linear_velocity.length())
	var avant: Vector3 = chaise.global_position

	print("5. La casse et le bruit")
	moi.global_position = Vector3(12.0, 0.05, 20.0)      # dans la cour, hors de vue
	second.global_position = Vector3(13.5, 0.05, 20.0)
	chose.mode = chose.DORT
	chose.global_position = m.TANIERE
	chose.reveiller()
	await _images(2)
	verif(chose.mode == chose.RODE and chose.visible, "à son heure, la chose se réveille et rôde")
	var vase = _trouver("vase")
	chose.global_position = m.centre(m.case_de(vase.global_position + Vector3(0, 0, 2)))
	chose._roder(60.0)
	vase.global_position = Vector3(vase.global_position.x, 2.3, vase.global_position.z)
	vase.linear_velocity = Vector3.ZERO
	await _attendre(1.3)
	verif(vase.valeur < vase.valeur_neuve, "un vase tombé de deux mètres perd de sa valeur (%d € sur %d)" % [vase.valeur, vase.valeur_neuve])
	verif(chose.mode == chose.ENQUETE, "la chose l'a entendu : elle va voir")
	chose.global_position = m.TANIERE
	chose._roder(60.0)
	moi.bruit = R.BRUIT_PAS
	chose.entendre(moi.global_position, moi.bruit)
	verif(chose.mode == chose.RODE, "des pas dans la cour ne portent pas jusqu'au bureau")
	jeu.klaxonner(1)
	verif(chose.mode == chose.ENQUETE and jeu.etat == jeu.PARTIE, "un coup de klaxon sans le quota, si : elle vient, et le camion reste")
	moi.bruit = 0.0

	print("6. La chose")
	chose.global_position = Vector3(8.5, 0.0, 7.5)
	chose._roder(60.0)
	second.global_position = Vector3(21.5, 0.05, 7.5)
	await _attendre(0.5)
	verif(chose.mode == chose.RODE, "à treize mètres dans le couloir, elle ne voit pas le porteur")
	second.global_position = Vector3(16.5, 0.05, 7.5)
	await _attendre(0.5)
	verif(chose.mode == chose.CHASSE and chose.proie == 2, "à huit mètres, elle le voit et le chasse")
	var t0 := Time.get_ticks_msec()
	while second.vivant and Time.get_ticks_msec() - t0 < 6000:
		await get_tree().physics_frame
	verif(not second.vivant and chose.mode == chose.RODE, "elle le rejoint et le prend (en %.1f s)" % ((Time.get_ticks_msec() - t0) / 1000.0))
	verif(moi.vivant and jeu.etat == jeu.PARTIE, "la partie continue tant qu'un porteur vit")
	chose.global_position = Vector3(8.5, 0.0, 7.5)
	moi.global_position = Vector3(4.5, 0.05, 3.0)        # dans la chambre : un mur entre eux
	await _attendre(0.5)
	verif(chose.mode != chose.CHASSE, "derrière un mur, à six mètres, elle ne voit rien")
	moi.global_position = Vector3(12.0, 0.05, 20.0)
	chose.global_position = m.TANIERE
	chose._roder(60.0)

	print("7. Le mort")
	var petit = _trouver("carton", 1)
	_devant(second, petit, 1.5)
	second.pitch = -0.5
	await _images(3)
	avant = petit.global_position
	jeu.pousser(2, petit.id)
	await _attendre(0.5)
	verif(petit.global_position.distance_to(avant) > 0.4, "un mort pousse un carton (%.1f m)" % petit.global_position.distance_to(avant))
	avant = canape.global_position
	_devant(second, canape, 2.0)
	await _images(3)
	jeu.pousser(2, canape.id)
	jeu.prendre(2, petit.id)
	await _attendre(0.4)
	verif(canape.global_position.distance_to(avant) < 0.05 and petit.porteurs.is_empty(), "mais ni un canapé, ni rien qu'il puisse porter")

	print("8. Le chat")
	var chat = jeu.chat
	chat.ouvrir()
	var distincts := {}
	for o in chat.options:
		distincts[o] = R.SABOTAGES.has(o)
	verif(chat.ouvert and distincts.size() == 3 and not distincts.values().has(false), "un vote s'ouvre : trois sabotages différents")
	verif(chat.lire_ligne("PING :tmi.twitch.tv") == "PONG :tmi.twitch.tv", "Twitch demande si l'on est là : on répond")
	chat.lire_ligne(":alice!alice@alice.tmi.twitch.tv PRIVMSG #chaine :!2")
	chat.lire_ligne(":alice!alice@alice.tmi.twitch.tv PRIVMSG #chaine :1")
	chat.lire_ligne(":bob!bob@bob.tmi.twitch.tv PRIVMSG #chaine :2")
	chat.lire_ligne(":carol!carol@carol.tmi.twitch.tv PRIVMSG #chaine :salut 3 les amis")
	chat.lire_ligne(":dan!dan@dan.tmi.twitch.tv PRIVMSG #chaine :3")
	verif(chat.voix == [0, 2, 1], "le chat vote 1, 2 ou 3 (ou !2), une voix par personne, le bavardage ne compte pas")
	var elu: Array = []
	var note := func(g): elu.append(g)
	chat.vote_clos.connect(note)
	var voulu: String = chat.options[1]
	chat.clore()
	chat.vote_clos.disconnect(note)
	chat.reste = 1e9
	verif(elu == [voulu] and not chat.ouvert, "le plus voté l'emporte : « %s »" % R.SABOTAGES[voulu].nom)
	for nom in jeu.effets:
		jeu.effets[nom].reste = 0.0
	await _attendre(0.2)
	chose.global_position = m.TANIERE
	chose._roder(60.0)

	print("9. Les sabotages")
	jeu.sabotage("noir", 0.5, -1, Vector3.ZERO)
	verif(not m.eclairee and not m.lampes[0].lumiere.visible, "le courant coupé, la maison est noire")
	await _attendre(0.8)
	verif(m.eclairee and m.lampes[0].lumiere.visible, "puis il revient")
	var a := Vector3(4.0, 1.0, 5.0)
	var b := Vector3(4.0, 1.0, 8.0)
	verif(m.voit(a, b), "par la porte de la chambre, on voit le couloir")
	jeu.sabotage("porte", 0.6, 0, Vector3.ZERO)
	await _images(3)
	verif(m.portes[0].verrou and not m.voit(a, b), "la porte claquée, on ne voit plus, et l'on ne passe plus")
	verif(m.chemin(a, b).size() > 0, "la chose, elle, passe toujours")
	await _attendre(0.9)
	verif(not m.portes[0].verrou and m.voit(a, b), "puis elle se rouvre")
	jeu.sabotage("torches", 0.5, -1, Vector3.ZERO)
	await _images(2)
	verif(not moi.torche.visible, "les torches grillées s'éteignent")
	await _attendre(0.8)
	verif(moi.torche.visible, "puis se rallument")
	var piano = _trouver("piano")
	sol = piano.global_position.y
	jeu.sabotage("plume", 1.5, -1, Vector3.ZERO)
	await _attendre(1.0)
	verif(piano.gravity_scale < 0.1 and piano.global_position.y > sol + 0.3, "en apesanteur, le piano décolle (%.2f m)" % (piano.global_position.y - sol))
	await _attendre(1.6)
	verif(is_equal_approx(piano.gravity_scale, 1.0) and piano.global_position.y < sol + 0.2, "puis il retombe")
	chose.global_position = m.TANIERE
	chose._roder(60.0)
	jeu._sur_vote("vacarme")
	verif(chose.mode == chose.ENQUETE, "un vacarme sur un porteur : la chose y court")

	print("10. La fin")
	jeu.compter()
	verif(jeu.charge > 0 and jeu.charge < jeu.quota, "le carton de la zone ne fait pas le quota (%d € sur %d)" % [jeu.charge, jeu.quota])
	jeu.quota = jeu.charge
	jeu.klaxonner(1)
	verif(jeu.etat == jeu.FIN and jeu.gagne, "le quota atteint, un coup de klaxon : le camion part, c'est gagné")
	jeu.lancer()
	await _attendre(0.3)
	jeu.repit = 1e9
	verif(jeu.etat == jeu.PARTIE and jeu.objets.size() == R.MOBILIER.size() and jeu.joueurs.size() == 1 and jeu.charge == 0, "une autre maison : une nuit neuve, les mêmes règles")
	verif(get_tree().get_nodes_in_group("rien").is_empty() and jeu.get_node("Monde") == jeu.monde, "l'ancienne maison est partie")
	jeu.temps = 0.05
	await _attendre(0.3)
	verif(jeu.etat == jeu.FIN and not jeu.gagne, "l'aube sur un camion vide : c'est perdu")
	jeu.lancer()
	await _attendre(0.3)
	jeu.tuer(1)
	await _attendre(0.2)
	verif(jeu.etat == jeu.FIN and not jeu.gagne, "plus un porteur en vie : c'est perdu")
	jeu.retour_menu()
	verif(jeu.etat == jeu.MENU and jeu.monde == null and jeu.joueurs.is_empty(), "et l'on revient au menu")


# --- le réseau : l'hôte ---

@rpc("any_peer", "call_remote", "reliable")
func rapport(nom: String, bon: bool) -> void:
	rapports[nom] = bon


func _rapport(nom: String, quoi: String, args: Array, dit: String) -> void:
	etape.rpc(nom, quoi, args)
	var t0 := Time.get_ticks_msec()
	while not rapports.has(nom) and Time.get_ticks_msec() - t0 < 6000:
		await get_tree().process_frame
	verif(rapports.get(nom, false), dit + ("" if rapports.has(nom) else " (l'invité n'a pas répondu)"))


func _hote() -> void:
	print("Le réseau : un hôte et un invité sur cette machine")
	verif(jeu.heberger() and jeu.etat == jeu.SALON, "l'hôte ouvre le salon (port %d)" % R.PORT)
	var invite := OS.create_process(OS.get_executable_path(), ["--headless", "--path", ProjectSettings.globalize_path("res://"), "--", "--essai-client"])
	var t0 := Time.get_ticks_msec()
	while multiplayer.get_peers().is_empty() and Time.get_ticks_msec() - t0 < 25000:
		await get_tree().process_frame
	verif(multiplayer.get_peers().size() == 1, "l'invité entre au salon")
	if multiplayer.get_peers().is_empty():
		OS.kill(invite)
		return
	var lui: int = multiplayer.get_peers()[0]
	jeu.lancer()
	jeu.repit = 1e9
	jeu.chat.reste = 1e9
	await _attendre(2.6)
	var moi = jeu.moi
	verif(jeu.joueurs.size() == 2 and jeu.joueurs.has(lui) and jeu.quota == R.quota(jeu.total, 2), "la nuit commence à deux, le quota est celui de deux porteurs (%d €)" % jeu.quota)
	var ou: Array = []
	for i in jeu.objets.size():
		ou.append(jeu.objets[i].global_position)
	await _rapport("maison", "maison", [jeu.quota, ou], "l'invité a la même maison, les mêmes meubles aux mêmes endroits, le même quota")

	_pilote(moi)
	var carton = _trouver("carton")
	moi.global_position = Vector3(12.0, 0.05, 20.0)
	moi.yaw = 0.0
	carton.global_position = moi.point_de_prise(carton.taille)
	jeu.prendre(1, carton.id)
	await _attendre(1.0)
	await _rapport("porte", "objet", [carton.id, carton.global_position, [1]], "l'invité voit le carton dans les mains de l'hôte, au même endroit")

	var chaise = _trouver("chaise")
	chaise.global_position = Vector3(16.0, 0.5, 19.0)
	chaise.linear_velocity = Vector3.ZERO
	await _attendre(1.0)
	var sol: float = chaise.global_position.y
	await _rapport("prend", "prends", [chaise.id, Vector3(16.0, 0.05, 20.3)], "l'invité demande la chaise à l'hôte, et l'a en main")
	await _attendre(0.8)
	var j = jeu.joueurs[lui]
	verif(j.global_position.distance_to(Vector3(16.0, 0.05, 20.3)) < 0.5, "l'hôte voit l'invité là où il s'est mis")
	verif(chaise.porteurs == [lui] and j.porte == chaise.id and chaise.global_position.y > sol + 0.4, "chez l'hôte, la chaise monte aux mains de l'invité (%.2f m)" % chaise.global_position.y)

	jeu.chose.reveiller()
	jeu.chose.global_position = Vector3(5.5, 0.0, 7.5)
	jeu.chose._roder(60.0)
	await _attendre(0.5)
	await _rapport("chose", "chose", [jeu.chose.global_position], "l'invité voit la chose réveillée, là où elle est")
	jeu.sabotage.rpc("noir", 5.0, -1, Vector3.ZERO)
	await _rapport("noir", "noir", [], "le courant coupé l'est aussi chez l'invité")
	jeu.tuer(lui)
	await _rapport("mort", "mort", [], "pris par la chose, l'invité se sait mort")
	verif(chaise.porteurs.is_empty() and not j.vivant, "et la chaise lui tombe des mains")
	jeu.finir(false, "L'essai s'arrête là.")
	await _rapport("fin", "fin", [], "la fin de la partie arrive chez l'invité")
	etape.rpc("au revoir", "partir", [])
	await _attendre(0.5)
	if OS.is_process_running(invite):
		OS.kill(invite)


# --- le réseau : l'invité, qui fait ce que l'hôte lui dit et lui rend compte ---

func _invite() -> void:
	jeu.rejoindre("127.0.0.1")
	var t0 := Time.get_ticks_msec()
	while not _fini and Time.get_ticks_msec() - t0 < 60000:
		await get_tree().process_frame
	ok = _fini


@rpc("authority", "call_remote", "reliable")
func etape(nom: String, quoi: String, args: Array) -> void:
	var bon := false
	var moi = jeu.moi
	match quoi:
		"maison":
			bon = jeu.etat == jeu.PARTIE and jeu.quota == args[0] and jeu.objets.size() == args[1].size() and jeu.joueurs.size() == 2 and moi != null
			for i in jeu.objets.size():
				bon = bon and jeu.objets[i].global_position.distance_to(args[1][i]) < 0.4
		"objet":
			await _attendre(0.4)
			var o = jeu.objets[args[0]]
			bon = o.global_position.distance_to(args[1]) < 0.4 and o.porteurs == args[2]
		"prends":
			var o = jeu.objets[args[0]]
			moi.global_position = args[1]
			_tourner(moi, o.global_position)
			await _attendre(0.6)
			jeu.vouloir("prendre", [o.id])
			moi.pitch = 0.0
			await _attendre(0.8)
			bon = o.porteurs == [jeu.mon_id] and moi.porte == o.id
		"chose":
			bon = jeu.chose.mode != jeu.chose.DORT and jeu.chose.visible and jeu.chose.global_position.distance_to(args[0]) < 1.0
		"noir":
			bon = not jeu.maison.eclairee
		"mort":
			bon = not moi.vivant and moi.porte == -1
		"fin":
			bon = jeu.etat == jeu.FIN and not jeu.gagne
		"partir":
			_fini = true
			return
	rapport.rpc_id(1, nom, bon)
