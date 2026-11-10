extends RefCounted
# Lisière — la queue de l'écharpe (scripts/veilleuse_echarpe.gd)
# Une chaîne de points, simulée dans le monde : nouée au cou de la veilleuse, elle pend quand elle attend, se soulève au vent,
# et flotte derrière elle quand elle marche. Chaque point a sa vitesse ; l'air la freine et la tire vers le vent ; les liens
# gardent leur longueur, et un peu de raideur garde le tissu d'un seul tenant.

const N := 7
const LIEN := 2.1
const PLAFOND := 55.0
const DESSUS := 3.0

var points := PackedVector2Array()
var vitesses := PackedVector2Array()
var _avant := PackedVector2Array()
var _t := 0.0


# tout droit, pendue sous le nœud
func placer(ancre: Vector2) -> void:
	points.resize(N)
	vitesses.resize(N)
	_avant.resize(N)
	for i in N:
		points[i] = ancre + Vector2(0.0, LIEN * i)
		vitesses[i] = Vector2.ZERO


# un pas de la simulation : la pesanteur, l'air (qui va au vent, freine et fait claquer le tissu), les liens
func avancer(ancre: Vector2, dt: float, vent: Vector2, pesanteur: float, frein: float, iterations: int) -> void:
	if points.size() != N or ancre.distance_to(points[0]) > 60.0:
		placer(ancre)
	if dt <= 0.00001:
		return
	_t += dt
	# (l'air qui passe sur le tissu : le vent, moins ce que fait le nœud)
	var relatif := (vent - (ancre - points[0]) / dt).length()
	points[0] = ancre
	for i in range(1, N):
		var u := float(i) / (N - 1)
		# une onde qui court le long du tissu, en travers : il claque d'autant plus que l'air passe vite
		var le_long := (points[i] - points[i - 1]).normalized()
		var claque := Vector2(-le_long.y, le_long.x) * sin(_t * 10.0 - i * 1.1) * minf(relatif, 120.0) * 0.5 * u
		var air := vent + claque - vitesses[i]
		# (à l'écran, ce qui monte ou descend est surtout de la profondeur : l'air y pousse moins ; et le tissu n'est jamais
		# tendu comme un drapeau : la poussée a un plafond, la pesanteur le fait toujours retomber)
		air.y *= 0.2
		air = air.limit_length(PLAFOND)
		vitesses[i] += (Vector2(0.0, pesanteur) + air * frein) * dt
		_avant[i] = points[i]
		points[i] += vitesses[i] * dt
	for k in iterations:
		# un peu de raideur : chaque point se range un peu dans l'alignement des deux d'avant
		for i in range(2, N):
			points[i] = points[i].lerp(points[i - 1] * 2.0 - points[i - 2], 0.04)
		for i in range(1, N):
			var d := points[i] - points[i - 1]
			var l := d.length()
			if l > 0.0001:
				var corr := d * (1.0 - LIEN / l)
				if i == 1:
					points[i] -= corr
				else:
					points[i] -= corr * 0.5
					points[i - 1] += corr * 0.5
		points[0] = ancre
	# (elle ne monte pas plus haut que le cou : vers le bas de l'écran, elle file derrière elle, cachée par la capuche)
	for i in range(1, N):
		if points[i].y < ancre.y - DESSUS:
			points[i] = Vector2(points[i].x, ancre.y - DESSUS)
	# enfin, chaque lien reprend sa longueur exacte, du nœud au bout : le tissu ne s'étire pas
	for i in range(1, N):
		var d := points[i] - points[i - 1]
		var l := d.length()
		points[i] = points[i - 1] + (d / l * LIEN if l > 0.0001 else Vector2(0.0, LIEN))
	for i in range(1, N):
		vitesses[i] = (points[i] - _avant[i]) / dt
