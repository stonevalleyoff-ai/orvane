extends RefCounted
# Lisière — la palette (scripts/palette.gd)
# Les couleurs du jeu, en un seul endroit : « l'encre et la braise » (DIRECTION-ARTISTIQUE.md). Chaque département y puise ;
# une couleur qui n'est pas ici se tire de celles-ci (lerp, darkened, lightened), elle ne s'invente pas.

# l'encre et le papier : les planches de naturaliste
const ENCRE := Color("16130f")
const ENCRE_DOUCE := Color("2b2620")
const PAPIER := Color("e9dfc8")
const IVOIRE := Color("cfc3a6")

# la braise : le feu, la torche, la chaleur
const BRAISE := Color("f29a48")
const BRAISE_COEUR := Color("ffd88a")
const BRAISE_ROUGE := Color("c4462a")
const CENDRE := Color("3a3530")

# la nuit : le noir n'est jamais noir, il est bleu d'encre
const NUIT := Color("0a0d18")
const NUIT_BLEUE := Color("1b2440")
const LUNE := Color("6f86b8")

# le vivant
const MOUSSE := Color("4f6b3a")
const FEUILLE_SOMBRE := Color("24391f")
const TERRE := Color("5a4630")
const SANG := Color("7a1d1d")

# la veilleuse
const CAPE := Color("303645")
const ECHARPE := Color("9e4523")
const VISAGE := Color("dccdb3")

# ce qui se lit : la peur, les échos, les yeux
const PEUR := Color("8a6fd6")
const ECHO := Color("bfe3ff")
const OEIL_CHASSEUR := Color("ffc252")
const OEIL_PROIE := Color("b8e6ff")

# le jour qui passe : la couleur du monde à chaque moment (l'obscurité y multiplie tout)
const AUBE := Color("e8b9a0")
const JOUR := Color("ffffff")
const SOIR := Color("e59a63")
const CREPUSCULE := Color("6c5a8c")
