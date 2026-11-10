extends RefCounted
# Lisière — les lettres de l'interface (scripts/interface_theme.gd)
# Deux fontes libres (SIL Open Font License 1.1, gardées avec leur licence dans polices/) : IM Fell English, une gravure du
# XVIIe siècle, pour les titres ; Alegreya Sans, sobre et lisible en petit, pour le texte courant. Et le thème qui les pose sur
# toute l'interface, boutons tactiles compris. Une fonte qui ne se lit pas laisse la place à celle de Godot : rien ne plante.

const P := preload("res://scripts/palette.gd")
const FELL := "res://polices/im-fell-english/IMFeENrm28P.ttf"
const FELL_ITALIQUE := "res://polices/im-fell-english/IMFeENit28P.ttf"
const FELL_CAPITALES := "res://polices/im-fell-english/IMFeENsc28P.ttf"
const ALEGREYA := "res://polices/alegreya-sans/AlegreyaSans-Regular.ttf"
const ALEGREYA_MOYEN := "res://polices/alegreya-sans/AlegreyaSans-Medium.ttf"
const ALEGREYA_GRAS := "res://polices/alegreya-sans/AlegreyaSans-Bold.ttf"

static var _fontes := {}
static var _theme: Theme = null
static var _halo: Texture2D = null


# --- les fontes ---

static func titre() -> Font:
	return _fonte(FELL, false)


static func titre_italique() -> Font:
	return _fonte(FELL_ITALIQUE, false)


static func capitales() -> Font:
	return _fonte(FELL_CAPITALES, false)


static func texte() -> Font:
	return _fonte(ALEGREYA, true)


static func texte_moyen() -> Font:
	return _fonte(ALEGREYA_MOYEN, true)


static func texte_gras() -> Font:
	return _fonte(ALEGREYA_GRAS, true)


# une fonte, et ce qui la complète : les chiffres alignés (pour les nombres du HUD), et celle de Godot pour un signe qui manquerait
static func _fonte(chemin: String, chiffres: bool) -> Font:
	if _fontes.has(chemin):
		return _fontes[chemin]
	var base: Font = null
	if ResourceLoader.exists(chemin):
		base = load(chemin) as Font
	if base == null and FileAccess.file_exists(chemin):
		# (une copie neuve, pas encore importée : la fonte se lit telle quelle)
		var f := FontFile.new()
		if f.load_dynamic_font(chemin) == OK:
			base = f
	var v := FontVariation.new()
	v.base_font = base if base != null else ThemeDB.fallback_font
	if base != null:
		v.fallbacks = [ThemeDB.fallback_font]
	if chiffres:
		var ts := TextServerManager.get_primary_interface()
		v.opentype_features = {ts.name_to_tag("lnum"): 1, ts.name_to_tag("tnum"): 1}
	_fontes[chemin] = v
	return v


# une fonte espacée (l'interlettrage des titres, en pixels)
static func espacee(f: Font, espace: int) -> Font:
	var v := FontVariation.new()
	v.base_font = f
	v.spacing_glyph = espace
	return v


# --- le thème ---

static func theme() -> Theme:
	if _theme != null:
		return _theme
	var t := Theme.new()
	t.default_font = texte_moyen()
	t.default_font_size = 16
	t.set_color("font_color", "Label", P.IVOIRE)
	# (une ombre douce sous chaque lettre : on lit sur l'herbe du jour comme dans le noir)
	t.set_color("font_shadow_color", "Label", Color(P.ENCRE, 0.8))
	t.set_constant("shadow_offset_x", "Label", 0)
	t.set_constant("shadow_offset_y", "Label", 1)
	t.set_constant("shadow_outline_size", "Label", 5)
	t.set_constant("line_spacing", "Label", 1)
	for k in ["normal", "hover", "pressed", "focus", "disabled", "hover_pressed"]:
		t.set_stylebox(k, "Button", StyleBoxEmpty.new())
	t.set_font("font", "Button", titre())
	t.set_font_size("font_size", "Button", 22)
	t.set_color("font_color", "Button", P.IVOIRE)
	t.set_color("font_hover_color", "Button", P.BRAISE_COEUR)
	t.set_color("font_pressed_color", "Button", P.BRAISE)
	t.set_color("font_focus_color", "Button", P.BRAISE_COEUR)
	_theme = t
	return t


# une tache de lumière ronde, blanche au centre, nulle au bord : les halos, les lueurs, les fonds des notes
static func halo() -> Texture2D:
	if _halo != null:
		return _halo
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.35, Color(1, 1, 1, 0.55))
	g.add_point(0.7, Color(1, 1, 1, 0.12))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.width = 128
	t.height = 128
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	_halo = t
	return t


# un libellé dans ces fontes
static func libelle(texte_: String, f: Font, taille: int, c: Color) -> Label:
	var l := Label.new()
	l.text = texte_
	l.add_theme_font_override("font", f)
	l.add_theme_font_size_override("font_size", taille)
	l.add_theme_color_override("font_color", c)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l
