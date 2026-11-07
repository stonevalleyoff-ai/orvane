extends Node
# Lisière — les effets (scripts/effets.gd)
# Ce qui donne du poids à ce qui arrive : la caméra qui tremble, l'image qui s'arrête un instant sur un coup, les éclats, la
# poussière, la braise, la couleur du monde à chaque heure, et tout ce qui couvre l'écran (la peur, la blessure, le grain).
# Le jeu (principal.gd) appelle ces fonctions ; elles ne changent rien aux règles. Département : lumière et effets
# (DIRECTION-ARTISTIQUE.md). Ce fichier est le point de départ : chaque fonction a sa place, à remplir.

const R := preload("res://scripts/regles.gd")
const P := preload("res://scripts/palette.gd")

var jeu
var scene: Node2D
var camera: Camera2D
var obscurite: CanvasModulate


# une partie commence : la scène du lieu, sa caméra, son obscurité
func nouvelle_partie(s: Node2D, c: Camera2D, o: CanvasModulate) -> void:
	scene = s
	camera = c
	obscurite = o


# la partie s'efface (retour au titre, nouvelle partie)
func vider() -> void:
	scene = null
	camera = null
	obscurite = null


# chaque image de la partie
func maj(_delta: float) -> void:
	pass


# la couleur du monde à ce moment (l : la lumière du jour, de 0 la nuit à 1 en plein jour)
func teinter(o: CanvasModulate, l: float) -> void:
	var c := R.NUIT_COULEUR.lerp(Color(1, 1, 1), l)
	var tiede := sin(l * PI) if l < 1.0 else 0.0
	o.color = c.lerp(Color(c.r, c.g * 0.78, c.b * 0.6), tiede * 0.7)


# la caméra tremble (force : 0 à 1)
func secousse(_force: float) -> void:
	pass


# l'image s'arrête un instant (en secondes) : le poids d'un coup
func arret(_duree: float) -> void:
	pass


# un coup porté à une bête, à ce point (la couleur de sa robe)
func impact(_p: Vector2, _couleur: Color) -> void:
	pass


# une bête meurt ici (sa robe, sa largeur en pixels)
func mort(_p: Vector2, _couleur: Color, _largeur: float) -> void:
	pass


# un geste de récolte sur un objet du lieu (son genre : arbre, sapin, rocher, buisson, touffe, brindille)
func recolte(_p: Vector2, _genre: String) -> void:
	pass


# un feu de camp prend
func allumage(_p: Vector2) -> void:
	pass


# la veilleuse est mordue
func blessure() -> void:
	pass


# un écho la traverse
func echo(_p: Vector2) -> void:
	pass


# la nuit tombe ; le jour revient
func tombee() -> void:
	pass


func aube() -> void:
	pass


# la veilleuse tombe : la partie va finir (l'écran de fin vient après jeu.DUREE_MORT secondes)
func fin() -> void:
	pass
