# Orvane — le kit Godot 4 (kits/godot/addons/orvane/orvane.gd) — docs/44
# Lire le monde (l'instantané), compter ce que font les joueurs, déposer les lots dans le Supabase d'Orvane.
# Activer l'extension « Orvane » (Projet › Paramètres du projet › Extensions) : ce script devient le singleton Orvane.
#
#   Orvane.cle_jeu = "orv_…"           # la clé du jeu, reçue à l'inscription (jamais la clé d'administration)
#   Orvane.jeu = "mon-jeu"
#   Orvane.instantane_lu.connect(func(inst): print(Orvane.vivantes().size(), " lignées vivantes"))
#   Orvane.lire()
#   var inst = await Orvane.lire_lieux(["foret"])        # ou seulement les lieux qu'on joue (le monde par morceaux, docs/21)
#   await Orvane.lire_silhouettes("foret")               # les planches : chaque bête du lieu dessinée, et ses yeux
#   sprite.texture = Orvane.texture("dunvi", 96.0)       # l'image d'une lignée, à 96 pixels de large ; Orvane.yeux("dunvi")
#   var p = Orvane.parties("dunvi", "foret", 96.0)       # ses parties, dans cette image : p.pattes[0].points, p.tete.pivot…
#   Orvane.compter("dunvi", "savane", "rencontre")      # au moment où ça arrive, dans un biome d'Orvane (déjà traduit)
#   Orvane.compter("dunvi", "savane", "prelevement", 1.0, "", "", "", "melee")   # … et par quel moyen (melee, distance, piege, feu…)
#   Orvane.compter("dunvi", "savane", "attaque")        # la mémoire (docs/50) : blessure, effarouchement, pillage, attaque,
#                                                        # joueur_tombe ; comptées seulement si le monde lu la tient (memoire_eveillee)
#   var d = Orvane.dispositions("dunvi", "savane")      # ce que cette population a appris des joueurs : { mefiance, habituation,
#                                                        # attrait, traque, neophobie, agressivite, attitude } (absente : neutre)
#   var moi = Orvane.individu(d, randfn(0.0, 1.0))      # … et ce qu'en a retenu une de ses bêtes : plus hardie, elle ose plus
#   var c = Orvane.caractere("dunvi")                   # le caractère de la lignée : { hardiesse, combativite, opportunisme }
#   for s in Orvane.souches(): print(s.nom, " : ", s.infectes, " bêtes infectées")   # les souches vivantes (docs/18)
#   var I = Orvane.infection("pheva", "mangrove~2")     # { "souche-3": { "i": 0.157, "r": 0.0996 } }, dans un biome ou une parcelle
#   for f in Orvane.foyers("souche-3"): print(f.parcelle, " : ", f.infectes)   # où elle frappe, parcelle par parcelle
#   for e in Orvane.evenements_souches(): print(e.nature, " ", e.souche)       # ce qui leur est arrivé au dernier cycle
#   Orvane.garder()                                      # à chaque sauvegarde du jeu : ce qui est compté se garde, sans clore
#   Orvane.clore(compte_opaque)                          # à un moment naturel : une sauvegarde, une fin de partie
#   Orvane.deposer(compte_opaque)                        # dépose le prochain lot ; un lot refusé reste en attente
#
# Un jeu ignore ce qu'il ne connaît pas (docs/43) : l'instantané reste un Dictionary, tel que le contrat le publie. Les lots pas
# encore déposés sont gardés dans user://orvane.json, et repris au lancement suivant ; ce qui est compté et pas encore clos
# aussi, dès que le jeu appelle garder() (ou clore, ou oublier).
extends Node

signal instantane_lu(inst: Dictionary)
signal lecture_ratee(erreur: String)
signal lot_depose(ok: bool, reponse: Dictionary)
signal silhouettes_lues(biome: String, silhouettes: Dictionary)
signal herbier_lu(biome: String, herbier: Dictionary)

const CONTRAT := "1.0"
const MAX_EVENEMENTS := 500
const SAUVEGARDE := "user://orvane.json"
# la mémoire (docs/50) : ce que les bêtes font aux joueurs, et ce que les joueurs leur font sans les tuer. Un monde qui ne la tient
# pas encore refuserait le lot entier pour une action qu'il ne connaît pas : le kit ne les compte que si le monde lu l'annonce
const ACTIONS_MEMOIRE := ["blessure", "effarouchement", "pillage", "attaque", "joueur_tombe"]
# par quel moyen (facultatif, sur un événement qui porte une lignée) ; un moyen inconnu n'est pas écrit
const MOYENS := ["melee", "distance", "piege", "feu", "lumiere", "bruit"]
# ce que vaut une disposition qu'une population ne porte pas (la néophobie est neutre au milieu : en dessous, la bête s'est
# accoutumée aux choses des joueurs ; au-dessus, elle les craint)
const DISPOSITIONS_NEUTRES := {"mefiance": 0.0, "habituation": 0.0, "attrait": 0.0, "traque": 0.0, "neophobie": 0.5, "agressivite": 0.0, "attitude": ""}

@export var monde_url := "https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/"
@export var supabase_url := "https://rospodujiyltmxitykwc.supabase.co"
@export var cle_publique := "sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8"
@export var cle_jeu := ""
@export var jeu := ""
@export var monde := "orvane"
@export var familles: Array[String] = ["animale"]
var zone := ""
var instantane: Dictionary = {}

var _evenements: Dictionary = {}
var _en_attente: Array[String] = []
var _refuses: Array[String] = []        # les lots refusés pour de bon (hors du contrat, un id déjà pris) : gardés à part, ils ne bloquent rien
var _debut := ""
var _depot_en_cours := false
var _planches: Dictionary = {}
var _textures: Dictionary = {}
var _herbiers: Dictionary = {}


func _ready() -> void:
	_debut = _maintenant()
	_charger()


# --- lire le monde ---

func lire(url: String = "") -> void:
	var r := HTTPRequest.new()
	# dans un navigateur, la page reçoit le document déjà décompressé : Godot ne doit pas le décompresser une seconde fois. Sinon,
	# quand le jeu est servi du même site que le monde (le navigateur lui montre alors l'en-tête Content-Encoding), la lecture
	# échoue, et le jeu se croit hors ligne. Ailleurs, Godot décompresse lui-même, comme avant.
	r.accept_gzip = not OS.has_feature("web")
	add_child(r)
	r.request_completed.connect(_lu.bind(r))
	var e := r.request(url if url != "" else monde_url.trim_suffix("/") + "/instantane.json", PackedStringArray(["Cache-Control: no-cache"]))
	if e != OK:
		r.queue_free()
		lecture_ratee.emit("requête impossible (%d)" % e)


func _lu(resultat: int, code: int, _entetes: PackedStringArray, corps: PackedByteArray, r: HTTPRequest) -> void:
	r.queue_free()
	if resultat != HTTPRequest.RESULT_SUCCESS or code != 200:
		lecture_ratee.emit("HTTP %d (résultat %d)" % [code, resultat])
		return
	var inst = JSON.parse_string(corps.get_string_from_utf8())
	if typeof(inst) != TYPE_DICTIONARY:
		lecture_ratee.emit("instantané illisible")
		return
	instantane = inst
	instantane_lu.emit(inst)


# --- lire seulement les lieux qu'on joue (le monde par morceaux, docs/21) ---

# l'index du monde, puis les seuls biomes demandés : un instantané au même contrat, réduit à ces biomes ({} si la lecture échoue).
# Quelques centaines de Ko au lieu de plusieurs Mo. S'attend : var inst = await Orvane.lire_lieux(["foret", "prairie"])
func lire_lieux(biomes: Array) -> Dictionary:
	var index = await lire_json(_base() + "morceaux/index.json")
	if typeof(index) != TYPE_DICTIONARY:
		lecture_ratee.emit("l'index du monde ne se lit pas")
		return {}
	var morceaux := {}
	for b in biomes:
		var m = await lire_json(_base() + "morceaux/biomes/" + str(b).uri_encode() + ".json")
		if typeof(m) == TYPE_DICTIONARY:
			morceaux[str(b)] = m
	instantane = assembler(index, morceaux)
	instantane_lu.emit(instantane)
	return instantane


# l'index et des morceaux de biomes (lus en ligne, ou gardés dans le jeu) → l'instantané réduit à ces biomes, comme tampon/morceaux.js
func assembler(index: Dictionary, morceaux: Dictionary) -> Dictionary:
	var vus := {}
	var lus := {}
	var bids := {}
	for b in index.get("biomes", []):
		bids[str(b.get("id", ""))] = true
		var m = morceaux.get(str(b.get("id", "")))
		if typeof(m) != TYPE_DICTIONARY:
			continue
		lus[str(b.get("id", ""))] = true
		for t in m.get("taxons", []):
			var id := str(t.get("id", ""))
			if not vus.has(id):
				vus[id] = t.duplicate(true)
				continue
			var deja: Dictionary = vus[id]
			deja["populations"].append_array(t.get("populations", []))
			var ph: Array = t.get("phenotypes", [])
			var vu_ph: Array = deja.get("phenotypes", [])
			for i in mini(ph.size(), vu_ph.size()):
				if typeof(vu_ph[i].get("frequence_par_biome")) == TYPE_DICTIONARY and typeof(ph[i].get("frequence_par_biome")) == TYPE_DICTIONARY:
					vu_ph[i]["frequence_par_biome"].merge(ph[i]["frequence_par_biome"], true)
	var taxons := []
	var ids := {}
	for x in index.get("taxons", []):
		var id := str(x.get("id", ""))
		if vus.has(id):
			taxons.append(vus[id])
			ids[id] = true
	# les événements : ceux des lignées lues, des lieux, les éveils ; une souche qui s'éteint, si l'un de ses derniers lieux est lu
	# (docs/18) — la règle de tampon/morceaux.js
	var evenements := []
	for e in index.get("evenements", []):
		if typeof(e) == TYPE_DICTIONARY and _evenement_lu(e, ids, bids, lus):
			evenements.append(e)
	var out := {"orvane": index.get("orvane", ""), "monde": index.get("monde", {}), "cycle": index.get("cycle", {}), "biomes": index.get("biomes", []),
		"catalogue": index.get("catalogue", {}), "taxons": taxons, "evenements": evenements}
	if typeof(index.get("parcelles")) == TYPE_ARRAY:
		out["parcelles"] = index["parcelles"]     # (un monde à parcelles : leur biome, leur nom, leurs voisines, comme tampon/morceaux.js)
	return out


func _evenement_lu(e: Dictionary, ids: Dictionary, bids: Dictionary, lus: Dictionary) -> bool:
	var t = e.get("taxon")
	if str(e.get("type", "")) == "eveil" or typeof(t) == TYPE_NIL or str(t) == "" or ids.has(str(t)) or bids.has(str(t)):
		return true
	var L = e.get("lieux")
	if typeof(L) == TYPE_ARRAY:
		for l in L:
			if lus.has(str(l)):
				return true
	return false


# --- dessiner les bêtes : les planches (morceaux/silhouettes/<biome>.json, docs/21) ---

# chaque bête d'un biome dessinée de profil, la tête à droite, dans un cadre de 170 × 90, et ses yeux ({} si la lecture échoue)
func lire_silhouettes(biome: String) -> Dictionary:
	var p = await lire_json(_base() + "morceaux/silhouettes/" + biome.uri_encode() + ".json")
	var s := {}
	if typeof(p) == TYPE_DICTIONARY and typeof(p.get("silhouettes")) == TYPE_DICTIONARY:
		s = p["silhouettes"]
		ajouter_planche(biome, s)
	silhouettes_lues.emit(biome, s)
	return s


# une planche gardée dans le jeu (pour jouer hors ligne) : { lignée: { svg, yeux, sol, parties } }
func ajouter_planche(biome: String, silhouettes: Dictionary) -> void:
	if not _planches.has(biome):
		_planches[biome] = {}
	_planches[biome].merge(silhouettes, true)


func a_une_planche(lignee: String, biome: String = "") -> bool:
	return not _silhouette(lignee, biome).is_empty()


# l'image d'une lignée, à cette largeur en pixels (null : pas de planche, ou un dessin illisible). Le bas du dessin est à 86/90
# de la hauteur de l'image quand elle tient debout (sol), le milieu du dessin au milieu sinon ; ses pieds sont sur la ligne de
# parties(…).contact, qu'une queue lourde peut dépasser vers le bas.
func texture(lignee: String, largeur: float = 170.0, biome: String = "") -> ImageTexture:
	var cle := "%s|%s|%d" % [lignee, biome, int(largeur)]
	if _textures.has(cle):
		return _textures[cle]
	var s := _silhouette(lignee, biome)
	if str(s.get("svg", "")) == "":
		return null
	var img := Image.new()
	if img.load_svg_from_string(str(s["svg"]), maxf(0.1, largeur / 170.0)) != OK:
		return null
	var tex := ImageTexture.create_from_image(img)
	_textures[cle] = tex
	return tex


# où sont ses yeux, dans le cadre de 170 × 90 de son dessin : [Vector3(x, y, rayon), …]
func yeux(lignee: String, biome: String = "") -> Array:
	var out := []
	for e in _silhouette(lignee, biome).get("yeux", []):
		if typeof(e) == TYPE_ARRAY and e.size() >= 3:
			out.append(Vector3(float(e[0]), float(e[1]), float(e[2])))
	return out


# les parties du corps d'une lignée, pour l'animer (docs/21) : { dessin, corps, tete, cou, queue, pattes, bras, organes, yeux,
# contact, bas, boite, groupe }, dans l'image de cette largeur (170 : le cadre de la planche, comme yeux). Chaque point est un
# Vector2 ; une chaîne, un PackedVector2Array (points : d'un bout à l'autre, une patte de la hanche au pied ; courbe : début,
# contrôle, bout) ; une boîte, un Rect2 ; une épaisseur, un rayon, à la même échelle ; les yeux et les anneaux, des Vector3 (x, y,
# rayon) ; groupe, le Transform2D qui pose le groupe du SVG dans l'image ; svg, les éléments de la partie dans ce groupe.
# Un champ que le kit ne connaît pas reste tel qu'il est publié. {} : pas de planche, ou une planche d'avant les parties.
func parties(lignee: String, biome: String = "", largeur: float = 170.0) -> Dictionary:
	var p = _silhouette(lignee, biome).get("parties")
	if typeof(p) != TYPE_DICTIONARY:
		return {}
	return _partie(p, maxf(0.001, largeur / 170.0), "")


func _partie(v, s: float, cle: String) -> Variant:
	if typeof(v) == TYPE_DICTIONARY:
		var o := {}
		for c in v:
			o[c] = _partie(v[c], s, str(c))
		return o
	if (typeof(v) == TYPE_FLOAT or typeof(v) == TYPE_INT) and (cle == "epaisseur" or cle == "rayon"):
		return float(v) * s
	if typeof(v) != TYPE_ARRAY:
		return v
	match cle:
		"points", "courbe":
			var pts := PackedVector2Array()
			for q in v:
				pts.append(_point(q, s))
			return pts
		"epaisseurs":
			var w := PackedFloat32Array()
			for x in v:
				w.append(float(x) * s)
			return w
		"centre", "museau", "pivot", "attache", "contact", "bas":
			return _point(v, s)
		"boite":
			if v.size() >= 4:
				return Rect2(_point(v, s), _point([float(v[2]) - float(v[0]), float(v[3]) - float(v[1])], s))
		"groupe":
			if v.size() >= 3:
				return Transform2D(0.0, Vector2(float(v[2]), float(v[2])) * s, 0.0, _point(v, s))
		"yeux", "anneaux":
			var out := []
			for e in v:
				if typeof(e) == TYPE_ARRAY and e.size() >= 3:
					out.append(Vector3(float(e[0]) * s, float(e[1]) * s, float(e[2]) * s))
			return out
		"svg":
			return v
		_:
			var out := []
			for x in v:
				out.append(_partie(x, s, ""))
			return out
	return v


func _point(q, s: float) -> Vector2:
	return Vector2(float(q[0]), float(q[1])) * s if typeof(q) == TYPE_ARRAY and q.size() >= 2 else Vector2.ZERO


func _silhouette(lignee: String, biome: String) -> Dictionary:
	if biome != "" and _planches.has(biome) and _planches[biome].has(lignee):
		return _planches[biome][lignee]
	for b in _planches:
		if _planches[b].has(lignee):
			return _planches[b][lignee]
	return {}


# --- dessiner les plantes, lire le temps qu'il fait : l'herbier (morceaux/herbier/<biome>.json, docs/49) ---

# chaque plante d'un biome dessinée dans un cadre de 120 × 150, le pied en bas, dans son stade du cycle, et le temps qu'il y fait
# ({} si la lecture échoue, ou si le monde n'a pas de flore)
func lire_herbier(biome: String) -> Dictionary:
	var p = await lire_json(_base() + "morceaux/herbier/" + biome.uri_encode() + ".json")
	var h := {}
	if typeof(p) == TYPE_DICTIONARY and typeof(p.get("plantes")) == TYPE_DICTIONARY:
		h = p
		ajouter_herbier(biome, h)
	herbier_lu.emit(biome, h)
	return h


# un herbier gardé dans le jeu (pour jouer hors ligne) : { plantes: { lignée: { svg, forme, port, hauteur_m, part, stade… } }, meteo }
func ajouter_herbier(biome: String, herbier: Dictionary) -> void:
	_herbiers[biome] = herbier


# les plantes d'un biome, les plus lourdes d'abord : [{ id, nom, forme, port, hauteur_m, part, stade, feuillage… }] (sans leur dessin)
func plantes(biome: String) -> Array:
	var out := []
	var P = _herbiers.get(biome, {}).get("plantes", {})
	if typeof(P) != TYPE_DICTIONARY:
		return out
	for id in P:
		var e: Dictionary = P[id].duplicate()
		e.erase("svg")
		e["id"] = id
		out.append(e)
	out.sort_custom(func(a, b): return float(a.get("part", 0.0)) > float(b.get("part", 0.0)))
	return out


# l'image d'une plante, à cette largeur en pixels (null : pas d'herbier, ou un dessin illisible). Son pied est à 144/150 de la
# hauteur de l'image, au milieu de sa largeur.
func texture_plante(lignee: String, largeur: float = 120.0, biome: String = "") -> ImageTexture:
	var cle := "plante|%s|%s|%d" % [lignee, biome, int(largeur)]
	if _textures.has(cle):
		return _textures[cle]
	var s := {}
	if biome != "" and _herbiers.get(biome, {}).get("plantes", {}).has(lignee):
		s = _herbiers[biome]["plantes"][lignee]
	else:
		for b in _herbiers:
			if _herbiers[b].get("plantes", {}).has(lignee):
				s = _herbiers[b]["plantes"][lignee]
				break
	if str(s.get("svg", "")) == "":
		return null
	var img := Image.new()
	if img.load_svg_from_string(str(s["svg"]), maxf(0.1, largeur / 120.0)) != OK:
		return null
	var tex := ImageTexture.create_from_image(img)
	_textures[cle] = tex
	return tex


# le temps qu'il fait dans un biome ce cycle (docs/45) : { temps, t, e, vent, neige, secheresse, eaux, production } ; {} : un monde
# sans météo, ou un lieu sans temps. Lu dans l'instantané, sinon dans l'herbier du biome.
func meteo(biome: String) -> Dictionary:
	for b in instantane.get("biomes", []):
		if str(b.get("id", "")) == biome and typeof(b.get("meteo")) == TYPE_DICTIONARY:
			return b["meteo"]
	var m = _herbiers.get(biome, {}).get("meteo", {})
	return m if typeof(m) == TYPE_DICTIONARY else {}


# le temps nommé : clair, couvert, pluie, orage, neige, gel, canicule, tempete, brouillard ("" : pas de météo)
func temps(biome: String) -> String:
	return str(meteo(biome).get("temps", ""))


func _base() -> String:
	return monde_url.trim_suffix("/") + "/"


# un document JSON (null s'il ne se lit pas) ; sans en-tête particulier, pour qu'un navigateur le lise d'un autre site.
# S'attend : var index = await Orvane.lire_json(Orvane.monde_url + "morceaux/index.json")
func lire_json(url: String) -> Variant:
	var r := HTTPRequest.new()
	r.accept_gzip = not OS.has_feature("web")     # (voir lire)
	r.timeout = 20.0
	add_child(r)
	var sep := "&" if url.contains("?") else "?"
	var e := r.request(url + sep + "v=" + str(int(Time.get_unix_time_from_system() / 600.0)))
	if e != OK:
		r.queue_free()
		return null
	var res: Array = await r.request_completed
	r.queue_free()
	if int(res[0]) != HTTPRequest.RESULT_SUCCESS or int(res[1]) != 200:
		return null
	return JSON.parse_string((res[3] as PackedByteArray).get_string_from_utf8())


# le premier chiffre de la version du contrat : tant qu'il est celui que le jeu connaît, rien ne casse
func majeur(inst: Dictionary = {}) -> int:
	var i := inst if not inst.is_empty() else instantane
	return int(str(i.get("orvane", "0")).split(".")[0])


# l'identité du monde : si elle change, le monde a été refait de zéro (le jeu repart de generation-0.json)
func identite(inst: Dictionary = {}) -> String:
	var i := inst if not inst.is_empty() else instantane
	var m: Dictionary = i.get("monde", {})
	return "%s@%s" % [m.get("id", ""), m.get("ne", "")]


# les lignées vivantes (une lignée éteinte reste listée dix cycles)
func vivantes(inst: Dictionary = {}) -> Array:
	var i := inst if not inst.is_empty() else instantane
	var out := []
	for t in i.get("taxons", []):
		if typeof(t.get("eteint")) == TYPE_NIL:
			out.append(t)
	return out


# les lignées vivantes d'un biome, chacune avec sa population : [{ "lignee": …, "population": … }]
func dans(biome: String, inst: Dictionary = {}) -> Array:
	var out := []
	for t in vivantes(inst):
		for p in t.get("populations", []):
			if p.get("biome") == biome:
				out.append({"lignee": t, "population": p})
	return out


func effectif(lignee: Dictionary, biome: String = "") -> float:
	var n := 0.0
	for p in lignee.get("populations", []):
		if biome == "" or p.get("biome") == biome:
			n += float(p.get("effectif", 0))
	return n


# --- la mémoire : ce qu'une population a appris des joueurs (docs/50) ---

# le monde lu tient-il la mémoire ? (instantane.monde.memoire) Sans elle, les actions de ACTIONS_MEMOIRE ne sont pas comptées.
func memoire_eveillee(inst: Dictionary = {}) -> bool:
	var i := inst if not inst.is_empty() else instantane
	var m = i.get("monde", {})
	if typeof(m) != TYPE_DICTIONARY or not m.has("memoire"):
		return false
	return typeof(m["memoire"]) != TYPE_NIL and not (typeof(m["memoire"]) == TYPE_BOOL and not m["memoire"])


# les dispositions d'une lignée dans un biome : { mefiance, habituation, attrait, traque, neophobie, agressivite (de 0 à 1),
# attitude (un mot, "" si neutre) }. lignee : la lignée (un taxon de l'instantané) ou son identifiant. Une disposition absente, une lignée ou un
# lieu inconnus : les valeurs neutres. Plusieurs populations dans le biome (des parcelles) : leur moyenne, pesée par l'effectif.
func dispositions(lignee, biome: String) -> Dictionary:
	var t = lignee
	if typeof(t) == TYPE_STRING or typeof(t) == TYPE_STRING_NAME:
		t = null
		for x in instantane.get("taxons", []):
			if typeof(x) == TYPE_DICTIONARY and str(x.get("id", "")) == str(lignee):
				t = x
				break
	var d: Dictionary = DISPOSITIONS_NEUTRES.duplicate()
	if typeof(t) != TYPE_DICTIONARY:
		return d
	var poids := 0.0
	var plus_grande := -1.0
	var somme := {}
	for p in t.get("populations", []):
		if typeof(p) != TYPE_DICTIONARY or str(p.get("biome", "")) != biome:
			continue
		var une := dispositions_de(p)
		var n := maxf(_nombre(p.get("effectif"), 0.0), 0.0) + 1.0
		poids += n
		for k in une:
			if k != "attitude":
				somme[k] = float(somme.get(k, 0.0)) + float(une[k]) * n
		if n > plus_grande:
			plus_grande = n
			d["attitude"] = une["attitude"]
	if poids > 0.0:
		for k in somme:
			d[k] = float(somme[k]) / poids
	return d


# les mêmes, pour une population de l'instantané (celle de Orvane.dans(biome), par exemple)
func dispositions_de(population: Dictionary) -> Dictionary:
	var d: Dictionary = DISPOSITIONS_NEUTRES.duplicate()
	var m = population.get("memoire", {})
	for k in d:
		if k == "attitude":
			if typeof(population.get(k)) == TYPE_STRING:
				d[k] = population[k]
		elif k == "mefiance" or k == "habituation":
			d[k] = clampf(_nombre(population.get(k), d[k]), 0.0, 1.0)
		elif typeof(m) == TYPE_DICTIONARY:
			d[k] = clampf(_nombre(m.get(k), d[k]), 0.0, 1.0)
	return d


# une bête n'est pas sa population : les dispositions d'une bête dont l'audace s'écarte de « ecart » écarts-types de celle de sa
# population (ecart > 0 : plus hardie). À tirer une fois par bête, d'une loi normale : randfn(0.0, 1.0). Plus hardie, elle craint
# moins (mefiance, neophobie) et ose plus (habituation, attrait, traque, agressivite). Chaque disposition est déplacée en logit,
# de ce que dit le monde (catalogue.memoire.individu.ecart ; 0,7 sinon) : une disposition nulle le reste, rien d'appris, rien à
# déplacer. Dans un troupeau qui fuit, la plus hardie peut ainsi faire front. Le mot « attitude » reste celui de la population.
func individu(d: Dictionary, ecart: float) -> Dictionary:
	var pas := 0.7
	var c = instantane.get("catalogue", {})
	if typeof(c) == TYPE_DICTIONARY and typeof(c.get("memoire")) == TYPE_DICTIONARY and typeof(c["memoire"].get("individu")) == TYPE_DICTIONARY:
		pas = _nombre(c["memoire"]["individu"].get("ecart"), pas)
	var k := pas * clampf(ecart, -3.0, 3.0)
	var o: Dictionary = DISPOSITIONS_NEUTRES.duplicate()
	for cle in o:
		if cle == "attitude":
			o[cle] = str(d.get(cle, ""))
			continue
		var x := clampf(_nombre(d.get(cle), float(DISPOSITIONS_NEUTRES[cle])), 0.0, 1.0)
		var sens := -1.0 if (cle == "mefiance" or cle == "neophobie") else 1.0
		o[cle] = x if (x <= 0.0 or x >= 1.0) else 1.0 / (1.0 + exp(-(log(x / (1.0 - x)) + sens * k)))
	return o


# le caractère d'une lignée : { hardiesse, combativite, opportunisme }, de 0 à 1 — ce qu'elle est avant d'avoir rien appris des
# joueurs, lu par le monde sur son corps et son tempérament (taxons[].caractere, dans un monde à la mémoire éveillée). Craintive
# ou hardie, fuyarde ou combative, difficile ou opportuniste : deux lignées ne tirent pas la même leçon des mêmes joueurs.
# lignee : la lignée (un taxon de l'instantané) ou son identifiant. Un monde sans mémoire, une lignée inconnue : {}.
func caractere(lignee) -> Dictionary:
	var t = lignee
	if typeof(t) == TYPE_STRING or typeof(t) == TYPE_STRING_NAME:
		t = null
		for x in instantane.get("taxons", []):
			if typeof(x) == TYPE_DICTIONARY and str(x.get("id", "")) == str(lignee):
				t = x
				break
	var o := {}
	if typeof(t) != TYPE_DICTIONARY or typeof(t.get("caractere")) != TYPE_DICTIONARY:
		return o
	for k in t["caractere"]:
		o[str(k)] = clampf(_nombre(t["caractere"][k], 0.0), 0.0, 1.0)
	return o


func _nombre(x, defaut: float) -> float:
	return float(x) if (typeof(x) == TYPE_FLOAT or typeof(x) == TYPE_INT) and is_finite(float(x)) else defaut


# --- les souches : les maladies du monde, où elles frappent, ce qui leur arrive (docs/18) ---
# Une lecture de l'instantané, comme moteur/pathogenes.js (souches, souche, infection, infectes, foyers, evenements) : les mêmes
# réponses. lignee : une lignée (un taxon de l'instantané) ou son identifiant ; lieu : un biome (« mangrove »), ou une parcelle
# (« mangrove~2 ») dans un monde à parcelles. Ce qui manque (une lignée, un lieu, une souche inconnus, un monde sans souches) donne
# une réponse vide, jamais une erreur.

# le monde lu a-t-il ses souches ? (instantane.monde.pathogenes)
func souches_eveillees(inst: Dictionary = {}) -> bool:
	var i := inst if not inst.is_empty() else instantane
	var m = i.get("monde", {})
	return typeof(m) == TYPE_DICTIONARY and typeof(m.get("pathogenes")) == TYPE_DICTIONARY


# les souches vivantes, les plus répandues d'abord (à égalité, la plus ancienne) : [{ id, nom, virulence, transmission, origine,
# apparu, hotes, infectes }], et parent (un mutant : la souche dont il est né), vecteur (la lignée d'insectes qui la porte) s'il y en a.
# virulence : la part des infectés qui meurent chaque cycle ; infectes : combien de bêtes elle infecte dans le monde
func souches(inst: Dictionary = {}) -> Array:
	var out := []
	var S := _souches_de(inst)
	for id in S:
		if typeof(S[id]) == TYPE_DICTIONARY:
			var x: Dictionary = S[id].duplicate(true)
			x["id"] = str(id)
			out.append(x)
	out.sort_custom(_avant_souche)
	return out


# une souche par son identifiant (une clé de monde.pathogenes.souches) : { id, nom, virulence, transmission, origine, apparu, hotes,
# infectes, parent, vecteur } ; {} : inconnue, ou éteinte (son extinction est dans evenements_souches(), au cycle où elle a lieu)
func souche(id: String, inst: Dictionary = {}) -> Dictionary:
	var S := _souches_de(inst)
	if not S.has(id) or typeof(S[id]) != TYPE_DICTIONARY:
		return {}
	var x: Dictionary = S[id].duplicate(true)
	x["id"] = id
	return x


# l'infection d'une lignée dans un lieu, par souche : { "souche-3": { "i": 0.157, "r": 0.0996 } } — i : la part des bêtes infectées,
# r : celle des immunisées, de 0 à 1. {} : aucune souche là. Une parcelle : son infection à elle (populations[].infection_par_parcelle) ;
# dans un instantané d'avant l'infection par parcelle, celle de son biome. Plusieurs populations dans le lieu : leur moyenne, pesée par l'effectif.
func infection(lignee, lieu: String, inst: Dictionary = {}) -> Dictionary:
	var x := _ici(_lignee_de(lignee, inst), lieu)
	if x.is_empty():
		return {}
	if x.has("population"):
		var p: Dictionary = x["population"]
		var ip = p.get("infection_par_parcelle")
		return _parts(ip.get(lieu) if typeof(ip) == TYPE_DICTIONARY else p.get("infection"))
	var P: Array = x["populations"]
	if P.size() == 1:
		return _parts(P[0].get("infection"))
	var poids := []
	var total := 0.0
	for p in P:
		var w := maxf(_nombre(p.get("effectif"), 0.0), 1e-9)
		poids.append(w)
		total += w
	var out := {}
	for k in P.size():
		var I := _parts(P[k].get("infection"))
		for s in I:
			if not out.has(s):
				out[s] = {"i": 0.0, "r": 0.0}
			out[s]["i"] += float(I[s]["i"]) * float(poids[k]) / total
			out[s]["r"] += float(I[s]["r"]) * float(poids[k]) / total
	return out


# combien de bêtes d'une lignée sont infectées dans un lieu (un biome ou une parcelle) : par une souche, ou par toutes (souche "")
func infectes(lignee, lieu: String, souche_id: String = "", inst: Dictionary = {}) -> float:
	var t = _lignee_de(lignee, inst)
	var x := _ici(t, lieu)
	if x.is_empty():
		return 0.0
	var n := 0.0
	if x.has("population"):
		n = float(x["effectif"])
	else:
		for p in x["populations"]:
			n += _nombre(p.get("effectif"), 0.0)
	var part := 0.0
	var I := infection(t, lieu, inst)
	for s in I:
		if souche_id == "" or s == souche_id:
			part += float(I[s]["i"])
	return n * part


# où une souche frappe : chaque parcelle (chaque biome, dans un monde sans parcelles ou un instantané d'avant) où des bêtes vivantes
# l'ont, les plus touchées d'abord : [{ taxon, biome, parcelle ("" : le biome entier), effectif, i, r, infectes }]
func foyers(souche_id: String, inst: Dictionary = {}) -> Array:
	var out := []
	for t in vivantes(inst):
		for p in t.get("populations", []):
			if typeof(p) != TYPE_DICTIONARY or typeof(p.get("infection")) != TYPE_DICTIONARY or not p["infection"].has(souche_id):
				continue
			var ip = p.get("infection_par_parcelle")
			var pc = p.get("parcelles")
			var lieux := []
			if typeof(ip) == TYPE_DICTIONARY:
				for q in ip:
					lieux.append([str(q), ip[q], _nombre(pc.get(q) if typeof(pc) == TYPE_DICTIONARY else null, 0.0)])
			else:
				lieux.append(["", p["infection"], _nombre(p.get("effectif"), 0.0)])
			for l in lieux:
				var I := _parts(l[1])
				if not I.has(souche_id) or float(I[souche_id]["i"]) <= 0.0:
					continue
				var y: Dictionary = I[souche_id]
				out.append({"taxon": str(t.get("id", "")), "biome": str(p.get("biome", "")), "parcelle": l[0], "effectif": float(l[2]),
					"i": y["i"], "r": y["r"], "infectes": float(y["i"]) * float(l[2])})
	out.sort_custom(_avant_foyer)
	return out


# ce qui est arrivé aux souches au dernier cycle : [{ type, nature, souche, nom, taxon, biome, parcelle, lieux, hotes, detail }] —
# nature : naissance (une souche nouvelle), saut_hote (elle gagne une lignée, taxon), mutation (un mutant naît), vecteur (un mutant que
# porte un insecte), extinction (elle s'éteint ; taxon : sa lignée d'origine ; lieux : les biomes où elle avait encore des malades au
# début du cycle ; hotes : les lignées où elle avait pris). nom : celui de la souche ; parcelle : où l'événement est né (un monde à
# parcelles). Ce qui manque vaut null ([] pour lieux et hotes). Une seule souche, si on la nomme. Un instantané d'avant ces champs n'en dit rien.
func evenements_souches(souche_id: String = "", inst: Dictionary = {}) -> Array:
	var i := inst if not inst.is_empty() else instantane
	var out := []
	for e in i.get("evenements", []):
		if typeof(e) != TYPE_DICTIONARY or typeof(e.get("souche")) != TYPE_STRING:
			continue
		if souche_id != "" and e["souche"] != souche_id:
			continue
		var nom = e.get("nom")
		if typeof(nom) != TYPE_STRING:
			var s := souche(str(e["souche"]), i)
			nom = s["nom"] if typeof(s.get("nom")) == TYPE_STRING else null
		out.append({"type": str(e.get("type", "")), "nature": _texte(e.get("nature")), "souche": e["souche"], "nom": nom, "taxon": _texte(e.get("taxon")),
			"biome": _texte(e.get("biome")), "parcelle": _texte(e.get("parcelle")), "lieux": _textes(e.get("lieux")), "hotes": _textes(e.get("hotes")),
			"detail": str(e.get("detail", ""))})
	return out


# un texte du contrat, ou null s'il n'y est pas ; une liste de textes, ou [] (ce que rendent moteur/pathogenes.js et le kit Unity)
func _texte(x) -> Variant:
	return x if typeof(x) == TYPE_STRING else null


func _textes(x) -> Array:
	var out := []
	if typeof(x) == TYPE_ARRAY:
		for y in x:
			if typeof(y) == TYPE_STRING:
				out.append(y)
	return out


func _souches_de(inst: Dictionary) -> Dictionary:
	var i := inst if not inst.is_empty() else instantane
	var m = i.get("monde", {})
	if typeof(m) != TYPE_DICTIONARY or typeof(m.get("pathogenes")) != TYPE_DICTIONARY:
		return {}
	var S = m["pathogenes"].get("souches", {})
	return S if typeof(S) == TYPE_DICTIONARY else {}


func _lignee_de(lignee, inst: Dictionary) -> Variant:
	if typeof(lignee) == TYPE_DICTIONARY:
		return lignee
	var i := inst if not inst.is_empty() else instantane
	for x in i.get("taxons", []):
		if typeof(x) == TYPE_DICTIONARY and str(x.get("id", "")) == str(lignee):
			return x
	return null


# où vit une lignée dans un lieu : { populations: [celles du biome] }, ou { population, effectif } pour une parcelle ({} : nulle part)
func _ici(t, lieu: String) -> Dictionary:
	if typeof(t) != TYPE_DICTIONARY:
		return {}
	var P := []
	for p in t.get("populations", []):
		if typeof(p) == TYPE_DICTIONARY and str(p.get("biome", "")) == lieu:
			P.append(p)
	if not P.is_empty():
		return {"populations": P}
	for p in t.get("populations", []):
		if typeof(p) != TYPE_DICTIONARY:
			continue
		var ip = p.get("infection_par_parcelle")
		var pc = p.get("parcelles")
		if (typeof(ip) == TYPE_DICTIONARY and ip.has(lieu)) or (typeof(pc) == TYPE_DICTIONARY and pc.has(lieu)):
			return {"population": p, "effectif": _nombre(pc.get(lieu) if typeof(pc) == TYPE_DICTIONARY else null, 0.0)}
	return {}


# une infection telle que le contrat la publie, recopiée : { souche: { i, r } }, chaque part entre 0 et 1
func _parts(I) -> Dictionary:
	var out := {}
	if typeof(I) != TYPE_DICTIONARY:
		return out
	for s in I:
		var x = I[s]
		if typeof(x) == TYPE_DICTIONARY:
			out[str(s)] = {"i": clampf(_nombre(x.get("i"), 0.0), 0.0, 1.0), "r": clampf(_nombre(x.get("r"), 0.0), 0.0, 1.0)}
		elif typeof(x) == TYPE_FLOAT or typeof(x) == TYPE_INT:
			out[str(s)] = {"i": clampf(_nombre(x, 0.0), 0.0, 1.0), "r": 0.0}
	return out


func _avant_souche(a: Dictionary, b: Dictionary) -> bool:
	var ia := _nombre(a.get("infectes"), 0.0)
	var ib := _nombre(b.get("infectes"), 0.0)
	if ia != ib:
		return ia > ib
	var pa := _nombre(a.get("apparu"), 0.0)
	var pb := _nombre(b.get("apparu"), 0.0)
	if pa != pb:
		return pa < pb
	return str(a.get("id", "")) < str(b.get("id", ""))


func _avant_foyer(a: Dictionary, b: Dictionary) -> bool:
	if float(a["infectes"]) != float(b["infectes"]):
		return float(a["infectes"]) > float(b["infectes"])
	return "%s|%s|%s" % [a["taxon"], a["biome"], a["parcelle"]] < "%s|%s|%s" % [b["taxon"], b["biome"], b["parcelle"]]


# --- compter ce que font les joueurs (docs/4) ---

# moyen (facultatif) : par quoi c'est arrivé (MOYENS : melee, distance, piege, feu, lumiere, bruit). Les actions de la mémoire
# (ACTIONS_MEMOIRE) ne sont comptées que si le monde lu la tient (memoire_eveillee) : sinon elles sont ignorées, sans bruit.
func compter(taxon: String, biome: String, action: String, n: float = 1.0, phenotype: String = "", parcelle: String = "", age: String = "", moyen: String = "") -> void:
	if ACTIONS_MEMOIRE.has(action) and not memoire_eveillee():
		return
	_compter(taxon, biome, action, n, phenotype, parcelle, age, moyen)


func _compter(taxon: String, biome: String, action: String, n: float, phenotype: String, parcelle: String, age: String, moyen: String) -> void:
	if biome == "" or action == "" or n <= 0.0:
		return
	if taxon == "" or not MOYENS.has(moyen):
		moyen = ""
	var cle := "|".join(PackedStringArray([taxon, phenotype, biome, parcelle, action, age, moyen]))
	if _evenements.has(cle):
		_evenements[cle]["n"] += n
		return
	var e := {"biome": biome, "action": action, "n": n}
	if taxon != "":
		e["taxon"] = taxon
	if phenotype != "":
		e["phenotype"] = phenotype
	if parcelle != "":
		e["parcelle"] = parcelle
	if age != "":
		e["age"] = age
	if moyen != "":
		e["moyen"] = moyen
	_evenements[cle] = e


# ce que le joueur a fait au milieu (défricher, assécher, construire…) : sans lignée, en unités de surface
func milieu(biome: String, action: String, n: float, parcelle: String = "") -> void:
	compter("", biome, action, n, "", parcelle)


# une bête emportée d'un biome à un autre
func deplacer(taxon: String, depuis: String, vers: String, n: float = 1.0) -> void:
	if n <= 0.0:
		return
	var cle := "|".join(PackedStringArray([taxon, depuis, "deplacement", vers]))
	if _evenements.has(cle):
		_evenements[cle]["n"] += n
	else:
		_evenements[cle] = {"taxon": taxon, "biome": depuis, "action": "deplacement", "vers": vers, "n": n}


func en_cours() -> int:
	return _evenements.size()


func lots_en_attente() -> int:
	return _en_attente.size()


# clôt ce qui a été compté en lots (pour ce joueur) et les met en attente de dépôt
func clore(compte: String) -> void:
	if _evenements.is_empty():
		return
	var fin := _maintenant()
	var tous: Array = _evenements.values()
	var i := 0
	while i < tous.size():
		var evenements := []
		for e in tous.slice(i, i + MAX_EVENEMENTS):
			e["n"] = minf(10000.0, snappedf(float(e["n"]), 0.001))
			evenements.append(e)
		var source := {"jeu": jeu, "compte": compte}
		if zone != "":
			source["zone"] = zone
		# (l'id du lot : gardé avec lui dans la file, il revient tel quel à chaque essai ; Orvane ne compte qu'une fois un lot renvoyé)
		var lot := {"orvane": CONTRAT, "monde": monde, "id": _nouvel_id(), "familles": familles, "source": source, "periode": {"debut": _debut, "fin": fin}, "evenements": evenements}
		var cycle = instantane.get("cycle", {})
		if typeof(cycle) == TYPE_DICTIONARY and cycle.has("n"):
			lot["instantane"] = int(cycle["n"])
		_en_attente.append(JSON.stringify(lot))
		i += MAX_EVENEMENTS
	_evenements.clear()
	_debut = fin
	_sauver()


# oublie ce qui a été compté et pas encore clos (un jeu qui n'envoie rien, une partie d'essai)
func oublier() -> void:
	_evenements.clear()
	_debut = _maintenant()
	_sauver()


# dépose le prochain lot en attente ; accepté, il est oublié ; refusé ou sans réseau, il reste pour la prochaine fois. Chaque lot
# porte son id : si la réponse se perd, le renvoyer ne le compte pas deux fois (Orvane répond { ok: true, deja: true }).
# La clé du jeu (cle_jeu) est publique : elle peut être dans le client. La clé de DÉPÔT (orvane_cle_depot), elle, ne va JAMAIS dans
# le client, ni dans ce kit, ni dans un export du jeu : quiconque l'extrairait déposerait au nom du jeu. Un jeu qui exige sa clé de
# dépôt dépose depuis son serveur (kits/serveur/depot.mjs, BRANCHER-UN-JEU.md, « Déposer depuis un serveur ») : le jeu envoie à
# SON serveur le lot que rend prochain_lot(), puis l'oublie (oublier_lot) quand le serveur répond ok, au lieu d'appeler deposer.
func deposer(compte: String) -> void:
	if _en_attente.is_empty() or _depot_en_cours:
		return
	if cle_jeu == "":
		lot_depose.emit(false, {"ok": false, "erreur": "pas de clé de jeu (Orvane.cle_jeu)"})
		return
	_depot_en_cours = true
	var r := HTTPRequest.new()
	r.accept_gzip = not OS.has_feature("web")     # (voir lire)
	add_child(r)
	r.request_completed.connect(_depose.bind(r))
	var corps := '{"p_cle":%s,"p_compte":%s,"p_lot":%s}' % [JSON.stringify(cle_jeu), JSON.stringify(compte), _en_attente[0]]
	var entetes := PackedStringArray(["Content-Type: application/json", "apikey: " + cle_publique])
	var e := r.request(supabase_url.trim_suffix("/") + "/rest/v1/rpc/orvane_deposer", entetes, HTTPClient.METHOD_POST, corps)
	if e != OK:
		r.queue_free()
		_depot_en_cours = false
		lot_depose.emit(false, {"ok": false, "erreur": "requête impossible (%d)" % e})


func _depose(resultat: int, code: int, _entetes: PackedStringArray, corps: PackedByteArray, r: HTTPRequest) -> void:
	r.queue_free()
	_depot_en_cours = false
	var rep = JSON.parse_string(corps.get_string_from_utf8()) if resultat == HTTPRequest.RESULT_SUCCESS else null
	if typeof(rep) != TYPE_DICTIONARY:
		rep = {"ok": false, "erreur": "HTTP %d (résultat %d)" % [code, resultat]}
	if rep.get("ok", false):
		_en_attente.pop_front()
		_sauver()
	elif refus_definitif(str(rep.get("erreur", ""))):
		# le lot lui-même est refusé (le renvoyer n'y changerait rien) : il sort de la file, gardé à part (lots_refuses), et les
		# suivants partent ; les autres refus (le réseau, un quota du jour, une clé) le laissent en tête de file, pour plus tard
		_refuses.append(_en_attente.pop_front())
		_sauver()
		rep["mis_de_cote"] = true
	lot_depose.emit(bool(rep.get("ok", false)), rep)


# les refus d'Orvane qui tiennent au lot lui-même (hebergement/supabase.sql, orvane_deposer) : le renvoyer n'y changerait rien
const REFUS_DEFINITIFS := ["lot mal formé", "lot trop gros", "événement mal formé", "id du lot"]


func refus_definitif(erreur: String) -> bool:
	for x in REFUS_DEFINITIFS:
		if erreur.contains(x):
			return true
	return false


# les lots mis de côté (en JSON), pour les montrer au développeur ou les corriger ; oublier_refuses() les efface
func lots_refuses() -> Array[String]:
	return _refuses.duplicate()


func oublier_refuses() -> void:
	_refuses.clear()
	_sauver()


# un jeu qui dépose depuis son serveur : le prochain lot en attente, en JSON, avec son id ("" s'il n'y en a pas), à envoyer au
# serveur du jeu, qui le dépose avec la clé de dépôt. Il reste en attente (et sur l'appareil) jusqu'à oublier_lot : renvoyé après
# une coupure, il garde son id, et Orvane ne le compte qu'une fois.
func prochain_lot() -> String:
	return "" if _en_attente.is_empty() else _en_attente[0]


# le serveur du jeu a répondu ok (ou deja) pour ce lot : il quitte la file. refuse = true : Orvane l'a refusé pour de bon
# (refus_definitif) ; il quitte la file aussi, mais il est gardé à part (lots_refuses), pour ne pas bloquer les suivants
func oublier_lot(id: String, refuse: bool = false) -> void:
	for i in _en_attente.size():
		var l = JSON.parse_string(_en_attente[i])
		if typeof(l) == TYPE_DICTIONARY and str(l.get("id", "")) == id:
			var lot: String = _en_attente[i]
			_en_attente.remove_at(i)
			if refuse:
				_refuses.append(lot)
			_sauver()
			return


# un id au hasard pour un lot : 32 chiffres hexadécimaux (128 bits, du générateur du système : deux joueurs n'auront pas le même)
func _nouvel_id() -> String:
	return Crypto.new().generate_random_bytes(16).hex_encode()


# un lot gardé par une version du kit qui ne donnait pas d'id en reçoit un, une fois : il le garde ensuite d'un essai à l'autre
func _avec_id(texte: String) -> String:
	var lot = JSON.parse_string(texte)
	if typeof(lot) != TYPE_DICTIONARY or (typeof(lot.get("id")) == TYPE_STRING and str(lot["id"]) != ""):
		return texte
	lot["id"] = _nouvel_id()
	return JSON.stringify(lot)


# --- garder ce qui n'est pas encore déposé ---

# garde sur l'appareil ce qui est compté et pas encore clos, avec les lots en attente (user://orvane.json), sans clore de lot :
# à chaque sauvegarde du jeu, quand il passe derrière une autre application. Fermé d'un coup, il le retrouve au lancement
# suivant. Clore à chaque sauvegarde ferait un lot à chaque fois (48 par joueur et par jour au plus) ; garder n'en fait aucun.
func garder() -> void:
	_sauver()


func _sauver() -> void:
	var f := FileAccess.open(SAUVEGARDE, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify({"lots": _en_attente, "refuses": _refuses, "evenements": _evenements.values(), "debut": _debut}))


func _charger() -> void:
	if not FileAccess.file_exists(SAUVEGARDE):
		return
	var s = JSON.parse_string(FileAccess.get_file_as_string(SAUVEGARDE))
	if typeof(s) != TYPE_DICTIONARY:
		return
	var sans_id := false
	for l in s.get("lots", []):
		var avec := _avec_id(str(l))
		sans_id = sans_id or avec != str(l)
		_en_attente.append(avec)
	for l in s.get("refuses", []):
		_refuses.append(str(l))
	for e in s.get("evenements", []):
		if e.get("action") == "deplacement":
			deplacer(str(e.get("taxon", "")), str(e.get("biome", "")), str(e.get("vers", "")), float(e.get("n", 0)))
		else:
			# (ce qui était compté le reste : le monde n'est pas encore lu, au lancement, pour redemander s'il tient la mémoire)
			_compter(str(e.get("taxon", "")), str(e.get("biome", "")), str(e.get("action", "")), float(e.get("n", 0)), str(e.get("phenotype", "")), str(e.get("parcelle", "")), str(e.get("age", "")), str(e.get("moyen", "")))
	if s.get("debut", "") != "":
		_debut = str(s["debut"])
	if sans_id:
		_sauver()                     # (l'id donné tient dès maintenant : fermé d'un coup, le jeu le retrouve)


func _maintenant() -> String:
	return Time.get_datetime_string_from_system(true) + "Z"
