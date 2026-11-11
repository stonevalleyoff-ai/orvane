// Lisière — le vent (shaders/vegetation_vent.gdshaderinc)
// Une seule respiration pour tout le lieu, que partagent l'herbe (vegetation_herbe) et les feuillages (vegetation_feuillage) :
// une houle lente (le lieu respire), et des rafales qui le traversent d'ouest en est. Le temps vient du monde (l'uniform temps,
// posé par monde.gd à chaque image), et monde.gd refait le même calcul (vent()) : le son peut souffler avec l'herbe.

float vent_hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float vent_bruit(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = vent_hash(i);
	float b = vent_hash(i + vec2(1.0, 0.0));
	float c = vent_hash(i + vec2(0.0, 1.0));
	float d = vent_hash(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// la houle : le lieu entier respire, lentement (0 à 1)
float vent_houle(float t) {
	return 0.5 + 0.5 * sin(t * 0.29) * sin(t * 0.11 + 1.3);
}

// la force du vent ici, maintenant : un fond (la houle), et une rafale quand une bande de vent passe (environ 0,2 à 1,3)
float vent_force(vec2 p, float t) {
	float houle = vent_houle(t);
	vec2 q = vec2((p.x + p.y * 0.35) / 520.0 - t * 0.31, (p.y - p.x * 0.35) / 900.0);
	float rafale = smoothstep(0.52, 0.92, vent_bruit(q) * (0.7 + 0.5 * houle));
	return 0.2 + 0.4 * houle + 0.75 * rafale;
}

// où penche la pointe d'une plante (par unité de souplesse) : vers l'est, d'autant plus que le vent force, et elle frémit
vec2 vent_pli(vec2 p, float t, float phase) {
	float f = vent_force(p, t);
	float frisson = sin(t * (1.6 + f * 1.9) + phase) * (0.12 + 0.2 * f) + sin(t * 3.7 + phase * 1.7) * 0.06;
	return vec2(f + frisson, 0.18 * f * f);
}
