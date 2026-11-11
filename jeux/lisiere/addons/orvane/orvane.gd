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
#   Orvane.compter("dunvi", "savane", "rencontre")      # au moment où ça arrive, dans un biome d'Orvane (déjà traduit)
#   Orvane.clore(compte_opaque)                          # à un moment naturel : une sauvegarde, une fin de partie
#   Orvane.deposer(compte_opaque)                        # dépose le prochain lot ; un lot refusé reste en attente
#
# Un jeu ignore ce qu'il ne connaît pas (docs/43) : l'instantané reste un Dictionary, tel que le contrat le publie. Les lots pas
# encore déposés sont gardés dans user://orvane.json, et repris au lancement suivant.
extends Node

signal instantane_lu(inst: Dictionary)
signal lecture_ratee(erreur: String)
signal lot_depose(ok: bool, reponse: Dictionary)
signal silhouettes_lues(biome: String, silhouettes: Dictionary)
signal herbier_lu(biome: String, herbier: Dictionary)

const CONTRAT := "1.0"
const MAX_EVENEMENTS := 500
const SAUVEGARDE := "user://orvane.json"

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
	for b in index.get("biomes", []):
		var m = morceaux.get(str(b.get("id", "")))
		if typeof(m) != TYPE_DICTIONARY:
			continue
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
	for x in index.get("taxons", []):
		var id := str(x.get("id", ""))
		if vus.has(id):
			taxons.append(vus[id])
	return {"orvane": index.get("orvane", ""), "monde": index.get("monde", {}), "cycle": index.get("cycle", {}), "biomes": index.get("biomes", []),
		"catalogue": index.get("catalogue", {}), "taxons": taxons, "evenements": index.get("evenements", [])}


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


# une planche gardée dans le jeu (pour jouer hors ligne) : { lignée: { svg, yeux, sol } }
func ajouter_planche(biome: String, silhouettes: Dictionary) -> void:
	if not _planches.has(biome):
		_planches[biome] = {}
	_planches[biome].merge(silhouettes, true)


func a_une_planche(lignee: String, biome: String = "") -> bool:
	return not _silhouette(lignee, biome).is_empty()


# l'image d'une lignée, à cette largeur en pixels (null : pas de planche, ou un dessin illisible). Le pied de la bête est à 86/90
# de la hauteur de l'image quand elle tient debout (sol), au milieu sinon.
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


# --- compter ce que font les joueurs (docs/4) ---

func compter(taxon: String, biome: String, action: String, n: float = 1.0, phenotype: String = "", parcelle: String = "", age: String = "") -> void:
	if biome == "" or action == "" or n <= 0.0:
		return
	var cle := "|".join(PackedStringArray([taxon, phenotype, biome, parcelle, action, age]))
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
		var lot := {"orvane": CONTRAT, "monde": monde, "familles": familles, "source": source, "periode": {"debut": _debut, "fin": fin}, "evenements": evenements}
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


# dépose le prochain lot en attente ; accepté, il est oublié ; refusé ou sans réseau, il reste pour la prochaine fois
func deposer(compte: String) -> void:
	if _en_attente.is_empty() or _depot_en_cours:
		return
	if cle_jeu == "":
		lot_depose.emit(false, {"ok": false, "erreur": "pas de clé de jeu (Orvane.cle_jeu)"})
		return
	_depot_en_cours = true
	var r := HTTPRequest.new()
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
	lot_depose.emit(bool(rep.get("ok", false)), rep)


# --- garder ce qui n'est pas encore déposé ---

func _sauver() -> void:
	var f := FileAccess.open(SAUVEGARDE, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify({"lots": _en_attente, "evenements": _evenements.values(), "debut": _debut}))


func _charger() -> void:
	if not FileAccess.file_exists(SAUVEGARDE):
		return
	var s = JSON.parse_string(FileAccess.get_file_as_string(SAUVEGARDE))
	if typeof(s) != TYPE_DICTIONARY:
		return
	for l in s.get("lots", []):
		_en_attente.append(str(l))
	for e in s.get("evenements", []):
		if e.get("action") == "deplacement":
			deplacer(str(e.get("taxon", "")), str(e.get("biome", "")), str(e.get("vers", "")), float(e.get("n", 0)))
		else:
			compter(str(e.get("taxon", "")), str(e.get("biome", "")), str(e.get("action", "")), float(e.get("n", 0)), str(e.get("phenotype", "")), str(e.get("parcelle", "")), str(e.get("age", "")))
	if s.get("debut", "") != "":
		_debut = str(s["debut"])


func _maintenant() -> String:
	return Time.get_datetime_string_from_system(true) + "Z"
