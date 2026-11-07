# Orvane — le kit Godot 4 (kits/godot/addons/orvane/orvane.gd) — docs/44
# Lire le monde (l'instantané), compter ce que font les joueurs, déposer les lots dans le Supabase d'Orvane.
# Activer l'extension « Orvane » (Projet › Paramètres du projet › Extensions) : ce script devient le singleton Orvane.
#
#   Orvane.cle_jeu = "orv_…"           # la clé du jeu, reçue à l'inscription (jamais la clé d'administration)
#   Orvane.jeu = "mon-jeu"
#   Orvane.instantane_lu.connect(func(inst): print(Orvane.vivantes().size(), " lignées vivantes"))
#   Orvane.lire()
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
