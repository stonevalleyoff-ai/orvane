extends RefCounted
# Lisière — ce que le jeu lit du monde (scripts/donnees.gd)
# Le monde d'Orvane en ligne, par morceaux, avec le kit (Orvane.lire_lieux, Orvane.lire_silhouettes) ; sans réseau, la copie
# gardée dans donnees/ (outils/secours.js). Puis la faune d'un lieu, rangée comme le jeu la joue : les proies du jour et de la
# nuit, les rôdeurs (des chasseurs qui vivent le jour), les chasseurs de la nuit. Rien n'est inventé : chaque bête est une
# lignée du monde, avec sa masse, sa vitesse, son caractère et son effectif dans ce lieu.

const SECOURS := "res://donnees/"
const TERRE := ["marche", "course", "saut", "fouissage", "grimpe", "reptation"]

var index: Dictionary = {}
var en_ligne := false
var hors_ligne_force := false
var _secours: Dictionary = {}


func charger_index() -> Dictionary:
	if not hors_ligne_force:
		var i = await Orvane.lire_json(Orvane.monde_url.trim_suffix("/") + "/morceaux/index.json")
		if typeof(i) == TYPE_DICTIONARY and i.has("biomes"):
			index = i
			en_ligne = true
			return index
	index = index_secours()
	en_ligne = false
	return index


func index_secours() -> Dictionary:
	if _secours.is_empty():
		_secours = local("index.json")
	return _secours


func local(chemin: String) -> Dictionary:
	var c := SECOURS + chemin
	if not FileAccess.file_exists(c):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(c))
	return d if typeof(d) == TYPE_DICTIONARY else {}


# les lieux où l'on peut jouer : sur la terre ferme, avec des bêtes ; hors ligne, ceux de la copie
func lieux() -> Array:
	var compte := {}
	for t in index.get("taxons", []):
		if str(t.get("famille", "animale")) != "animale" or str(t.get("statut", "")) == "eteint":
			continue
		for b in t.get("biomes", []):
			compte[b] = int(compte.get(b, 0)) + 1
	var gardes: Array = index_secours().get("secours", {}).get("lieux", [])
	var out := []
	for b in index.get("biomes", []):
		var id := str(b.get("id", ""))
		if str(b.get("milieu", "terrestre")) != "terrestre" or int(compte.get(id, 0)) == 0:
			continue
		if not en_ligne and not gardes.has(id):
			continue
		out.append({"id": id, "nom": str(b.get("nom", id)), "lignees": int(compte.get(id, 0)), "garde": gardes.has(id)})
	out.sort_custom(func(a, b): return str(a["nom"]).naturalnocasecmp_to(str(b["nom"])) < 0)
	return out


func biome(id: String) -> Dictionary:
	for b in index.get("biomes", []):
		if str(b.get("id", "")) == id:
			return b
	for b in index_secours().get("biomes", []):
		if str(b.get("id", "")) == id:
			return b
	return {"id": id, "nom": id, "axes": {}}


# un lieu : l'instantané réduit à ce lieu, et ses planches ; en ligne d'abord, la copie sinon ({} : ce lieu ne se lit pas)
func charger_lieu(id: String) -> Dictionary:
	var garde := local("silhouettes/%s.json" % id)
	if en_ligne:
		var inst: Dictionary = await Orvane.lire_lieux([id])
		if not inst.get("taxons", []).is_empty():
			var s: Dictionary = await Orvane.lire_silhouettes(id)
			if s.is_empty():
				# (le monde publié n'a pas encore ses planches : on prend celles de la copie, pour les lignées qu'elle connaît)
				Orvane.ajouter_planche(id, garde.get("silhouettes", {}))
			return inst
	var m := local("biomes/%s.json" % id)
	if m.is_empty():
		return {}
	var inst2: Dictionary = Orvane.assembler(index_secours(), {id: m})
	Orvane.instantane = inst2
	Orvane.ajouter_planche(id, garde.get("silhouettes", {}))
	return inst2


# la faune d'un lieu, comme le jeu la joue. Chaque entrée : { lignee, id, nom, masse, effectif, poids, sociable, activite }
func faune(inst: Dictionary, id: String) -> Dictionary:
	var F := {"proies_jour": [], "proies_nuit": [], "rodeurs": [], "chasseurs_nuit": []}
	var chasseurs := []
	for t in inst.get("taxons", []):
		if typeof(t.get("eteint")) != TYPE_NIL:
			continue
		var p = t.get("plan", {})
		if typeof(p) != TYPE_DICTIONARY:
			continue
		var regime := str(p.get("regime", ""))
		if regime == "vegetal" or regime == "synthetique" or str(p.get("famille", "animale")) == "vegetale":
			continue
		var masse := float(p.get("masse_kg", 0.0))
		if masse < 0.2:
			continue
		var terrestre := false
		for l in p.get("locomotion", []):
			if TERRE.has(l):
				terrestre = true
		if not terrestre:
			continue
		var effectif := 0.0
		for pop in t.get("populations", []):
			if str(pop.get("biome", "")) == id:
				effectif += float(pop.get("effectif", 0))
		if effectif < 1.0:
			continue
		var act := str(p.get("activite", "diurne"))
		var e := {"lignee": t, "id": str(t.get("id", "")), "nom": nom_court(t), "masse": masse, "effectif": effectif,
			"poids": log(effectif + 1.0) / log(10.0) + 0.5, "sociable": float(p.get("sociabilite", 0.3)), "activite": act}
		var chasseur := regime == "carnivore" or (regime == "omnivore" and masse >= 15.0)
		if chasseur:
			chasseurs.append(e)
			if act != "diurne":
				F["chasseurs_nuit"].append(e)
			elif masse >= 1.0:
				F["rodeurs"].append(e)
		else:
			if act != "nocturne":
				F["proies_jour"].append(e)
			if act != "diurne":
				F["proies_nuit"].append(e)
	if F["chasseurs_nuit"].is_empty():
		# (aucun chasseur de nuit ici : la faim fait sortir ceux du jour)
		F["chasseurs_nuit"] = chasseurs.filter(func(x): return float(x["masse"]) >= 1.0)
	return F


static func nom_de(t: Dictionary) -> String:
	var n := str(t.get("nom_commun", ""))
	if n == "":
		n = str(t.get("nom", t.get("id", "?")))
	return n


# le premier mot du nom (« Losilmé mangeur d'herbe de prairie » → « Losilmé »)
static func nom_court(t: Dictionary) -> String:
	return nom_de(t).split(" ")[0]
