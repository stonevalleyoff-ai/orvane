// Lisière — la brume qui passe (shaders/interface_brume.gdshader)
// Une bande de brume entre deux plans de forêt, à l'écran-titre : un bruit qui se tord lentement et glisse avec le vent,
// effacé en haut et en bas de sa bande. Peu de calcul : quatre octaves, rien qui lise l'écran.
shader_type canvas_item;

uniform vec4 couleur : source_color = vec4(0.435, 0.525, 0.722, 1.0);
uniform float densite = 0.35;
uniform float vitesse = 0.012;
uniform vec2 echelle = vec2(4.0, 1.0);
uniform float graine = 0.0;
uniform float fondu_haut = 0.45;
uniform float fondu_bas = 0.35;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float s = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		s += a * bruit(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return s;
}

void fragment() {
	vec2 p = UV * echelle + vec2(TIME * vitesse + graine, graine * 0.37);
	float tord = fbm(p * 1.3 + vec2(-TIME * vitesse * 0.7, 0.0));
	float n = fbm(p + vec2(tord * 0.9, tord * 0.3));
	float bande = smoothstep(0.0, fondu_haut, UV.y) * (1.0 - smoothstep(1.0 - fondu_bas, 1.0, UV.y));
	float a = smoothstep(0.32, 0.82, n) * bande * densite;
	COLOR = vec4(couleur.rgb, a * COLOR.a);
}
