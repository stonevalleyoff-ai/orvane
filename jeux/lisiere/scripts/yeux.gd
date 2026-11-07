extends Node2D
# Lisière — ce qui brille dans le noir (scripts/yeux.gd)
# Une couche au-dessus de l'obscurité (une CanvasLayer qui suit la caméra) : la nuit, les yeux des bêtes restées hors de la
# lumière brillent, là où leur planche dit qu'ils sont. Ambre pour un chasseur, pâles pour une proie : on apprend à les lire.
# Ils clignent, de temps en temps. Les échos vivent aussi dans cette couche : la nuit ne les cache pas.

var jeu
var _t := 0.0


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _draw() -> void:
	if jeu == null or not jeu.en_partie:
		return
	var nuit: float = 1.0 - jeu.lumiere_du_jour()
	if nuit < 0.2:
		return
	for b in jeu.get_tree().get_nodes_in_group("betes"):
		if not is_instance_valid(b) or b.role == "echo":
			continue
		var p: Vector2 = b.point_oeil()
		var l: float = jeu.eclairage(p)
		var a := clampf((0.45 - l) / 0.45, 0.0, 1.0) * nuit
		if a <= 0.02:
			continue
		# un clignement, de temps en temps, jamais tous ensemble
		if fmod(_t + float(b.get_instance_id() % 97) * 0.37, 5.5) < 0.13:
			continue
		var c := Color(1.0, 0.76, 0.32) if b.role == "chasseur" or b.role == "rodeur" else Color(0.72, 0.9, 1.0)
		var r: float = b.rayon_oeil()
		var ecart := maxf(2.4, r * 2.4) * 0.5
		var g := p - Vector2(ecart, 0)
		var d := p + Vector2(ecart, 0)
		draw_circle(g, r * 2.4, Color(c.r, c.g, c.b, a * 0.16))
		draw_circle(d, r * 2.4, Color(c.r, c.g, c.b, a * 0.16))
		draw_circle(g, r, Color(c.r, c.g, c.b, a))
		draw_circle(d, r, Color(c.r, c.g, c.b, a))
