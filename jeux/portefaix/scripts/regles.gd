extends RefCounted
# Portefaix — les règles du jeu, en un seul endroit (scripts/regles.gd)
# Tout ce qui se règle quand on équilibre le jeu est ici : la nuit, le corps, le portage, le bruit, la casse, la chose, le chat, le mobilier.

# le réseau : l'hôte ouvre ce port (UDP), les autres le rejoignent par son adresse
const PORT := 24680
const JOUEURS_MAX := 6

# la nuit : dix minutes de 22 h à 6 h ; la chose dort pendant le répit du début
const DUREE_NUIT := 600.0
const REPIT := 35.0
const HAUTEUR := 2.8          # sous plafond ; les portes font 2,2 m

# le corps (mètres, secondes)
const MARCHE := 3.4
const COURSE := 5.6
const ACCROUPI := 1.6
const SAUT := 4.3
const GRAVITE := 12.0
const YEUX := 1.6
const YEUX_ACCROUPI := 1.0
const SOURIS := 0.0025
const FANTOME := 5.0          # la vitesse d'un mort
const FANTOME_MASSE := 12.0   # ce qu'un mort peut pousser, au plus (kg)

# porter : chaque porteur donne au plus cette force ; seul on soulève 45 kg, à deux 90, à trois 135. Le reste se traîne.
const PORTEE := 3.0
const FORCE_PORTEUR := 450.0
const PORT_RAIDEUR := 7.0
const PORT_VITESSE := 5.0
const PORT_GAIN := 10.0
const PORT_RUPTURE := 4.0     # plus loin que ça de la main, l'objet échappe
const LANCER := 7.0           # la vitesse donnée à un objet lancé…
const LANCER_MAX := 70.0      # … tant que l'élan ne dépasse pas ça (les lourds tombent aux pieds)
const FREIN := 45.0           # les kilos portés qui divisent la marche par deux

# le bruit : le rayon, en mètres, où la chose l'entend
const BRUIT_ACCROUPI := 1.5
const BRUIT_PAS := 5.0
const BRUIT_COURSE := 11.0
const BRUIT_CRI := 17.0
const BRUIT_MICRO := 18.0     # le vrai micro, à pleine voix
const MICRO_SEUIL := -38.0    # dB : en dessous, le micro ne compte pas
const MICRO_PLEIN := -8.0
const BRUIT_KLAXON := 30.0

# la casse : un choc, c'est la vitesse perdue d'un coup (m/s)
const CHOC_SEUIL := 2.2
const CHOC_PLEIN := 9.0

# la chose
const CHOSE_RODE := 1.5
const CHOSE_ENQUETE := 2.9
const CHOSE_CHASSE := 4.5     # plus vite qu'on ne marche, moins qu'on ne court
const CHOSE_VUE := 11.0
const CHOSE_VUE_ACCROUPI := 0.6
const CHOSE_PERTE := 4.0      # sans voir sa proie tout ce temps, elle renonce
const CHOSE_ALLONGE := 1.2

# le chat : un vote toutes les 40 secondes, 15 secondes pour voter (1, 2 ou 3)
const VOTE_PAUSE := 40.0
const VOTE_DUREE := 15.0
const SABOTAGES := {
	"noir": {"nom": "Couper le courant", "duree": 25.0},
	"porte": {"nom": "Claquer une porte", "duree": 25.0},
	"vacarme": {"nom": "Faire du vacarme", "duree": 0.0},
	"torches": {"nom": "Griller les torches", "duree": 15.0},
	"plume": {"nom": "Meubles en apesanteur", "duree": 15.0},
}

# le quota : la part de la maison à charger, selon le nombre de porteurs
const QUOTA := 0.3
const QUOTA_PAR_JOUEUR := 0.06
const QUOTA_MAX := 0.6

# le mobilier : taille (m), masse (kg), valeur (€), fragile (la part de la valeur qu'un grand choc emporte)
const CATALOGUE := {
	"carton": {"nom": "un carton", "taille": Vector3(0.5, 0.4, 0.5), "masse": 5.0, "valeur": 40, "fragile": 0.2, "couleur": Color(0.6, 0.46, 0.28)},
	"chaise": {"nom": "une chaise", "taille": Vector3(0.45, 0.9, 0.45), "masse": 6.0, "valeur": 60, "fragile": 0.3, "couleur": Color(0.45, 0.3, 0.18)},
	"lampe": {"nom": "un lampadaire", "taille": Vector3(0.35, 1.5, 0.35), "masse": 4.0, "valeur": 90, "fragile": 0.7, "couleur": Color(0.75, 0.7, 0.55)},
	"vase": {"nom": "un vase", "taille": Vector3(0.3, 0.5, 0.3), "masse": 2.0, "valeur": 150, "fragile": 0.95, "couleur": Color(0.55, 0.7, 0.85)},
	"tableau": {"nom": "un tableau", "taille": Vector3(0.9, 0.7, 0.12), "masse": 4.0, "valeur": 220, "fragile": 0.6, "couleur": Color(0.7, 0.55, 0.2)},
	"table": {"nom": "une table", "taille": Vector3(1.4, 0.75, 0.8), "masse": 35.0, "valeur": 180, "fragile": 0.25, "couleur": Color(0.4, 0.27, 0.16)},
	"fauteuil": {"nom": "un fauteuil", "taille": Vector3(0.9, 0.9, 0.85), "masse": 25.0, "valeur": 200, "fragile": 0.15, "couleur": Color(0.5, 0.2, 0.2)},
	"tele": {"nom": "une télé", "taille": Vector3(1.0, 0.65, 0.25), "masse": 10.0, "valeur": 320, "fragile": 0.85, "couleur": Color(0.08, 0.08, 0.1)},
	"horloge": {"nom": "une horloge comtoise", "taille": Vector3(0.5, 2.0, 0.4), "masse": 40.0, "valeur": 450, "fragile": 0.6, "couleur": Color(0.35, 0.22, 0.12)},
	"canape": {"nom": "un canapé", "taille": Vector3(2.0, 0.85, 0.9), "masse": 60.0, "valeur": 400, "fragile": 0.15, "couleur": Color(0.25, 0.38, 0.35)},
	"armoire": {"nom": "une armoire", "taille": Vector3(1.2, 2.0, 0.6), "masse": 80.0, "valeur": 500, "fragile": 0.3, "couleur": Color(0.3, 0.19, 0.1)},
	"piano": {"nom": "un piano", "taille": Vector3(1.5, 1.2, 0.65), "masse": 120.0, "valeur": 900, "fragile": 0.5, "couleur": Color(0.06, 0.06, 0.07)},
}
# ce qu'il y a dans la maison, à chaque partie (placé au hasard de la graine)
const MOBILIER := ["piano", "armoire", "canape", "horloge", "table", "fauteuil", "fauteuil", "tele", "tele", "vase", "vase", "vase",
	"lampe", "lampe", "tableau", "tableau", "chaise", "chaise", "chaise", "chaise", "carton", "carton", "carton"]


static func quota(total: int, joueurs: int) -> int:
	var part: float = minf(QUOTA + QUOTA_PAR_JOUEUR * float(maxi(joueurs, 1) - 1), QUOTA_MAX)
	return int(round(float(total) * part / 10.0)) * 10
