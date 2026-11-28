extends RefCounted
# Lisière — les règles du jeu, en un seul endroit (scripts/regles.gd)
# Tout ce qui se règle quand on équilibre le jeu est ici : la durée des jours, la faim, la peur, les feux, les bêtes.

# la clé du jeu Lisière (publique, « orv_… »), reçue à l'inscription sur Orvane ; vide, les lots restent dans le jeu
const CLE_JEU := ""
# où vont les lots : le bac à sable d'Orvane (gardés quatorze jours, lus par aucun monde) ; « orvane » pour peser sur le monde
const MONDE_DES_LOTS := "essai"

# le lieu : un carré de 4 200 pixels de côté, centré sur le réveil
const DEMI := 2100.0
const ZOOM := 1.35

# le temps : un jour entier dure quatre minutes ; la nuit en prend une part qui dépend de la saison du monde d'Orvane
const DUREE := 240.0
const TRANSITION := 14.0
const NUIT := {"printemps": 0.4, "été": 0.33, "automne": 0.42, "hiver": 0.5}
const NUIT_COULEUR := Color(0.03, 0.035, 0.07)

# le corps
const VITESSE := 165.0
const FAIM := 0.21            # par seconde : de rassasié à affamé en moins de deux jours
const FAMINE := 1.2           # la santé perdue par seconde, l'estomac vide
const SOIN := 0.35            # la santé regagnée par seconde, rassasié et calme
const PEUR_NOIR := 5.0        # la peur gagnée par seconde dans le noir, la nuit
const PEUR_LUMIERE := 4.0     # perdue par seconde dans la lumière, la nuit
const PEUR_JOUR := 3.0        # perdue par seconde, le jour
const PEUR_PRESENCE := 3.0    # gagnée par seconde, un chasseur à moins de 260 pixels
const PANIQUE := 2.5          # la santé perdue par seconde, la peur au comble

# les gestes
const CADENCE := 0.42         # secondes entre deux coups
const PORTEE_COUP := 46.0
const PORTEE_RECOLTE := 44.0
const PORTEE_FEU := 90.0
const DEGATS_POINGS := 8.0
const DEGATS_LANCE := 26.0
const USURE_LANCE := 30       # coups avant qu'elle se brise
const DUREE_TORCHE := 75.0
const RAYON_TORCHE := 175.0

# le feu : son bois se compte en secondes de feu
const FEU_DEPART := 60.0
const FEU_BUCHE := 25.0
const FEU_MAX := 150.0

# le temps qu'il fait dans le lieu, ce cycle du monde d'Orvane (docs/45) : ce qu'il fait au feu (son bois brûle plus vite sous
# l'eau et le vent) et à la marche (la neige au sol la ralentit)
const FEU_TEMPS := {"pluie": 1.4, "orage": 1.7, "tempete": 2.0, "neige": 1.25, "brouillard": 1.1}
const NEIGE_AU_SOL := 0.3     # à partir de ce manteau, on marche dans la neige
const ALLURE_NEIGE := 0.8
const TEMPS := {"clair": "temps clair", "couvert": "ciel couvert", "pluie": "pluie", "orage": "orage", "neige": "neige", "gel": "gel", "canicule": "canicule", "tempete": "tempête", "brouillard": "brouillard"}
const TEMPS_DIT := {"pluie": "Il pleut : le feu mange son bois plus vite.", "orage": "L'orage gronde : le feu mange son bois bien plus vite.", "tempete": "La tempête passe : un feu ne tiendra pas longtemps.",
	"neige": "Il neige : le feu mange son bois plus vite.", "brouillard": "Le brouillard est tombé.", "gel": "Il gèle.", "canicule": "La chaleur écrase le lieu."}

# les bêtes
const PROIES_JOUR := 12       # autour du joueur, le jour
const CHASSEURS_MAX := 10
const VAGUE := 20.0           # secondes entre deux venues de chasseurs, la nuit
const ECHOS_MAX := 3

const RECETTES := {
	"feu": {"nom": "Feu de camp", "touche": "1", "cout": {"bois": 4, "pierre": 2}},
	"torche": {"nom": "Torche", "touche": "2", "cout": {"bois": 2, "fibre": 1}},
	"lance": {"nom": "Lance", "touche": "3", "cout": {"bois": 2, "pierre": 1, "fibre": 2}},
}
const ORDRE_RECETTES := ["feu", "torche", "lance"]
const NOMS := {"bois": "bois", "pierre": "pierre", "fibre": "fibres", "baies": "baies", "viande": "viande crue", "viande_cuite": "viande cuite"}
const ORDRE_INVENTAIRE := ["bois", "pierre", "fibre", "baies", "viande", "viande_cuite"]


# un nom, accordé à son nombre (« 2 pierres », « 1 pierre ») : les autres noms ne changent pas
static func nom(k: String, n: int) -> String:
	return str(NOMS[k]) + ("s" if k == "pierre" and n > 1 else "")
