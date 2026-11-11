extends Node
# Lisière — l'essai sans écran (scripts/essai.gd)
# Une partie jouée toute seule, en accéléré, sur la copie du monde gardée dans le jeu (sans réseau), qui vérifie que tout tient :
# le lieu, ses bêtes dessinées d'après leurs planches, la récolte, les fabrications, le jeu du doigt, la nuit, les chasseurs qui n'entrent pas
# dans la lumière du feu, la peur dans le noir, les échos, l'aube, la fin, et ce qui est compté pour Orvane.
#   outils/godot.sh --headless --path jeux/lisiere -- --essai              (sur la copie gardée dans le jeu)
#   outils/godot.sh --headless --path jeux/lisiere -- --essai --en-ligne   (sur le monde publié)
# Il sort avec le code 0 si tout passe, 1 sinon.

var jeu
var ok := true
var n := 0


func _ready() -> void:
	jeu = get_parent()
	_lancer.call_deferred()


func verif(c: bool, m: String) -> void:
	n += 1
	if not c:
		ok = false
	print(("  ✓ " if c else "  ✗ ") + m)


func _attendre(s: float) -> void:
	await get_tree().create_timer(s).timeout


# un doigt qui se pose ou se lève, qui glisse : donné tout droit à la couche tactile (scripts/tactile.gd)
func _toucher(tac, doigt: int, p: Vector2, pose: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = doigt
	e.position = p
	e.pressed = pose
	tac._input(e)


func _glisser(tac, doigt: int, p: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = doigt
	e.position = p
	tac._input(e)


func _lancer() -> void:
	print("Lisière — l'essai")
	jeu.donnees.hors_ligne_force = not ("--en-ligne" in OS.get_cmdline_user_args())
	await jeu.donnees.charger_index()
	var L: Array = jeu.donnees.lieux()
	verif(L.size() >= 3, "%d lieux jouables (%s)" % [L.size(), ", ".join(PackedStringArray(L.map(func(x): return str(x["nom"]))))])
	# (chaque lieu proposé à l'écran-titre se charge, et a de quoi chasser et de quoi faire peur, comme _commencer le demande)
	var maigres := []
	for l in L:
		var inst: Dictionary = await jeu.donnees.charger_lieu(str(l["id"]))
		var fl: Dictionary = jeu.donnees.faune(inst, str(l["id"])) if not inst.is_empty() else {}
		if fl.is_empty() or (fl["proies_jour"].is_empty() and fl["proies_nuit"].is_empty()) or fl["chasseurs_nuit"].is_empty():
			maigres.append(str(l["nom"]))
	# (en ligne, le monde change chaque jour : un lieu maigre est dit, et le jeu le refuse au lancement ; la copie, elle, doit tout jouer)
	verif(maigres.is_empty() or jeu.donnees.en_ligne, "chaque lieu proposé se charge, avec des proies et des chasseurs" + (" ; sauf, refusés au lancement : %s" % ", ".join(PackedStringArray(maigres)) if maigres.size() > 0 else ""))

	print("1. Le lieu")
	await jeu._commencer("foret")
	verif(jeu.en_partie, "une partie commence en forêt")
	var F: Dictionary = jeu.faune
	verif(F["proies_jour"].size() > 0 and F["chasseurs_nuit"].size() > 0, "la faune du lieu : %d proies le jour, %d chasseurs la nuit, %d rôdeurs" % [F["proies_jour"].size(), F["chasseurs_nuit"].size(), F["rodeurs"].size()])
	var genres := {}
	for o in jeu.monde.objets:
		genres[o.genre] = int(genres.get(o.genre, 0)) + 1
	verif(int(genres.get("arbre", 0)) + int(genres.get("sapin", 0)) > 100 and int(genres.get("rocher", 0)) > 20, "le lieu est semé : %s" % str(genres))
	# (docs/49) les arbres, les buissons et les touffes du lieu sont ses plantes dans le monde d'Orvane, dessinées d'après l'herbier
	var plantes_lieu: Array = Orvane.plantes("foret")
	var dessines := 0
	var especes := {}
	for o in jeu.monde.objets:
		if o.image != null:
			dessines += 1
			especes[o.plante] = true
	verif(plantes_lieu.size() > 0 and dessines > 100 and especes.size() >= 2, "le décor est fait des plantes du lieu : %d objets dessinés d'après l'herbier, de %d lignées sur %d (%s)" % [dessines, especes.size(), plantes_lieu.size(), ", ".join(PackedStringArray(plantes_lieu.slice(0, 3).map(func(x): return str(x.get("forme", "?")))))])
	Engine.time_scale = 4.0
	# (le directeur tire au sort toutes les demi-secondes : on attend qu'une bête vienne, trente secondes au plus)
	var betes: Array = []
	for i in 30:
		await _attendre(1.0)
		betes = jeu.get_tree().get_nodes_in_group("betes")
		if betes.size() > 0 and i >= 5:
			break
	var dessinees := betes.filter(func(b): return b.sprite != null).size()
	verif(betes.size() > 0, "des bêtes viennent, le jour : %d" % betes.size())
	verif(dessinees > 0 and dessinees == betes.size(), "chacune est dessinée d'après sa planche (%d sur %d)" % [dessinees, betes.size()])

	print("2. Les gestes")
	var j = jeu.joueur
	var o = null
	for x in jeu.monde.objets:
		if x.genre == "arbre" or x.genre == "sapin":
			o = x
			break
	j.position = o.position + Vector2(0, 20)
	var b0 := int(j.inventaire["bois"])
	for i in 3:
		jeu.agir()
	verif(int(j.inventaire["bois"]) == b0 + 3, "trois coups sur un arbre : trois bois")
	j.inventaire["bois"] = 30
	j.inventaire["pierre"] = 10
	j.inventaire["fibre"] = 10
	j.position = Vector2(0, 0)
	jeu.fabriquer("feu")
	jeu.fabriquer("lance")
	verif(jeu.feux.size() == 1 and j.lance == 30 and int(j.inventaire["bois"]) == 24, "un feu de camp et une lance, payés en bois, pierres et fibres")
	var f = jeu.feux[0]
	var avant: float = f.bois
	jeu.nourrir_feu()
	verif(f.bois > avant + 20.0, "une bûche nourrit le feu (%d → %d secondes)" % [int(avant), int(f.bois)])

	# (docs/45) le temps qu'il fait : sous la tempête, le feu mange son bois deux fois plus vite ; la neige au sol ralentit ; le ciel se dessine
	var temps_du_lieu: float = jeu.feu_temps
	jeu.feu_temps = 1.0
	var bois0: float = f.bois
	await _attendre(2.0)
	var calme: float = bois0 - f.bois
	jeu.feu_temps = float(jeu.R.FEU_TEMPS["tempete"])
	bois0 = f.bois
	await _attendre(2.0)
	var tempete: float = bois0 - f.bois
	jeu.feu_temps = temps_du_lieu
	verif(calme > 0.0 and tempete > calme * 1.6, "sous la tempête, le feu mange son bois plus vite (%.1f s de bois en deux secondes, contre %.1f)" % [tempete, calme])
	jeu.meteo = {"temps": "pluie", "vent": 0.3}
	jeu.ciel.regler("pluie", 0.3)
	var pluie: bool = jeu.ciel.visible_du_ciel() and jeu.texte_horloge().contains("pluie")
	jeu.ciel.regler("neige", 0.1)
	var neige: bool = jeu.ciel.visible_du_ciel()
	jeu.ciel.regler("clair", 0.0)
	var clair: bool = not jeu.ciel.visible_du_ciel()
	jeu.meteo = Orvane.meteo("foret")
	jeu.ciel.regler(str(jeu.meteo.get("temps", "")), float(jeu.meteo.get("vent", 0.0)))
	verif(pluie and neige and clair, "la pluie et la neige se dessinent et se disent à l'horloge ; un temps clair ne dessine rien")
	var allure_du_lieu: float = jeu.allure_temps
	j.position = Vector2(0, 0)
	jeu.allure_temps = jeu.R.ALLURE_NEIGE
	j.deplacer(Vector2(1, 0), 1.0, jeu.monde)
	var dans_la_neige: float = j.position.x
	j.position = Vector2(0, 0)
	jeu.allure_temps = 1.0
	j.deplacer(Vector2(1, 0), 1.0, jeu.monde)
	jeu.allure_temps = allure_du_lieu
	verif(dans_la_neige > 0.0 and dans_la_neige < j.position.x * 0.9, "dans la neige, on marche moins vite (%d pixels en une seconde, contre %d)" % [int(dans_la_neige), int(j.position.x)])
	j.position = Vector2(0, 0)

	print("3. Du doigt")
	var tac = jeu.tactile
	tac.activer()
	var clic := InputMap.action_get_events("agir").any(func(e): return e is InputEventMouseButton)
	verif(tac.actif and jeu.ui.tactile and not clic, "l'écran tactile s'allume : les boutons remplacent les touches, et un toucher ne frappe plus")
	var depart := Vector2(200, tac._taille().y - 150)
	_toucher(tac, 0, depart, true)
	_glisser(tac, 0, depart + Vector2(70, 20))
	# (deux images : la couche tactile presse les actions de marche dans son _process)
	await get_tree().process_frame
	await get_tree().process_frame
	var dir := Input.get_vector("gauche", "droite", "haut", "bas")
	_toucher(tac, 0, depart + Vector2(70, 20), false)
	await get_tree().process_frame
	await get_tree().process_frame
	var arret := Input.get_vector("gauche", "droite", "haut", "bas")
	verif(dir.x > 0.6 and dir.y > 0.0 and arret == Vector2.ZERO, "le pouce gauche la fait marcher (%.2f, %.2f), et levé, l'arrête" % [dir.x, dir.y])
	_toucher(tac, 1, tac.position_bouton("feu"), true)
	var feu := Input.is_action_pressed("feu")
	_toucher(tac, 1, tac.position_bouton("feu"), false)
	_toucher(tac, 2, tac.position_bouton("agir"), true)
	var frappe := Input.is_action_pressed("agir")
	_toucher(tac, 2, tac.position_bouton("agir"), false)
	verif(feu and frappe and not Input.is_action_pressed("agir") and not Input.is_action_pressed("feu"), "les boutons pressent les actions du clavier (Feu, Agir), et les lâchent")
	jeu.ui.message("Ramasse des brindilles (Espace). Avec 4 bois et 2 pierres : un feu (1).")
	var dit: String = jeu.ui._messages.back()[0].text
	verif(dit.contains("(Agir)") and dit.contains("bouton Feu"), "les messages nomment les boutons : « %s »" % dit)

	print("4. La nuit")
	jeu.horloge = jeu.jour * 240.0 - 240.0 * jeu.part_nuit - 3.0
	j.position = f.position + Vector2(0, 30)
	f.ajouter(6)
	var plus_pres := INF
	var vus := 0
	for i in 60:
		await _attendre(1.0)
		j.position = f.position + Vector2(0, 30)
		for b in jeu.get_tree().get_nodes_in_group("betes"):
			if b.role == "chasseur":
				vus = maxi(vus, 1)
				plus_pres = minf(plus_pres, b.position.distance_to(f.position) / f.rayon())
	verif(jeu.lumiere_du_jour() <= 0.0, "la nuit est tombée (%s)" % jeu.texte_horloge())
	verif(vus > 0, "des chasseurs viennent : %s" % ", ".join(PackedStringArray(jeu.get_tree().get_nodes_in_group("betes").filter(func(b): return b.role == "chasseur").map(func(b): return str(b.nom)))))
	verif(vus > 0 and plus_pres >= 0.78, "aucun n'entre dans la lumière du feu (au plus près : %.2f du rayon)" % plus_pres)
	verif(j.peur < 30.0, "dans la lumière, la peur reste basse (%d)" % int(j.peur))

	print("5. Le noir")
	var proie = jeu._creer(F["proies_jour"][0], "proie", j.position + Vector2(20, 0))
	proie.flair = 0.0
	for i in 12:
		if is_instance_valid(proie):
			proie.position = j.position + Vector2(20, 0)
			jeu.agir()
	# (douze coups dans la même image : la bête ne meurt qu'une fois, et n'est comptée qu'une fois)
	verif(jeu.chassees == 1 and int(j.inventaire["viande"]) > 0, "une bête chassée donne de la viande (%d), une seule fois (%d chassée)" % [int(j.inventaire["viande"]), jeu.chassees])
	verif(Orvane.en_cours() > 0, "ce qui est arrivé est compté pour Orvane (%d comptes)" % Orvane.en_cours())
	# (la nuit tire à sa fin : on revient à son début, pour que les quarante secondes suivantes soient toutes dans le noir)
	jeu.horloge = jeu.jour * 240.0 - 240.0 * jeu.part_nuit + 2.0
	j.position = f.position + Vector2(f.rayon() + 700.0, 0)
	var peur0: float = j.peur
	var peur_max := peur0
	var perdu := 0.0
	var echo := false
	for i in 40:
		j.sante = 100.0
		await _attendre(1.0)
		perdu += 100.0 - j.sante
		peur_max = maxf(peur_max, j.peur)
		for b in jeu.get_tree().get_nodes_in_group("betes"):
			if b.role == "echo":
				echo = true
	j.sante = 100.0
	verif(peur_max > peur0 + 40.0, "loin du feu, dans le noir, la peur monte (%d → %d)" % [int(peur0), int(peur_max)])
	verif(echo, "la peur haute, ce qu'on a tué revient en écho")
	verif(perdu > 0.0, "le noir coûte de la santé (%d points perdus en quarante secondes)" % int(perdu))

	print("6. L'aube, la fin")
	jeu.horloge = jeu.jour * 240.0 + 20.0
	await _attendre(2.0)
	verif(jeu.nuits == 1, "le jour revient : %d nuit%s tenue%s" % [jeu.nuits, "s" if jeu.nuits > 1 else "", "s" if jeu.nuits > 1 else ""])
	j.faim = 100.0
	j.peur = 0.0
	j.sante = 0.0
	# (elle tombe d'abord : l'écran de fin vient jeu.DUREE_MORT secondes après)
	for i in 40:
		await _attendre(0.25)
		if not jeu.en_partie:
			break
	verif(not jeu.en_partie, "la santé à zéro, la partie s'arrête sur l'écran de fin, même rassasiée et calme")
	print("\n%s (%d vérifications)" % ["tout passe" if ok else "ÉCHEC", n])
	# (des sons qui jouent encore quand Godot s'arrête, il dit qu'ils fuient : on les arrête, et l'on laisse au serveur audio
	# le temps de les lâcher)
	jeu.sons.arreter_brefs()
	for p in jeu.sons.find_children("*", "AudioStreamPlayer", false, false):
		p.stop()
	await get_tree().create_timer(0.3, true, false, true).timeout
	get_tree().quit(0 if ok else 1)
