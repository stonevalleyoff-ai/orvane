// Lisière — une page de carnet (shaders/interface_papier.gdshader)
// Le papier des planches de naturaliste : un grain fin, des fibres couchées, des taches douces, le bord un peu déchiré et roussi.
// « taille » : la taille de la page en unités, pour que le grain ne s'étire pas.
shader_type canvas_item;

uniform vec4 papier : source_color = vec4(0.914, 0.875, 0.784, 1.0);
uniform vec4 roussi : source_color = vec4(0.62, 0.46, 0.3, 1.0);
uniform vec2 taille = vec2(800.0, 500.0);
uniform float graine = 3.0;
uniform float dechire = 7.0;       // la profondeur des déchirures du bord, en unités

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
		p = p * 2.07 + vec2(3.1, 7.7);
		a *= 0.5;
	}
	return s;
}

void fragment() {
	vec2 px = UV * taille;
	float grain = hash(floor(px * 1.5) + graine) - 0.5;
	float fibres = bruit(vec2(px.x * 0.05, px.y * 0.9) + graine) - 0.5;
	float fibres2 = bruit(vec2(px.x * 0.9, px.y * 0.06) + graine * 2.0) - 0.5;
	float taches = fbm(px * 0.005 + graine) - 0.5;
	vec3 c = papier.rgb * (1.0 + grain * 0.045 + fibres * 0.018 + fibres2 * 0.012 + taches * 0.15);
	// (le bord : déchiré, puis roussi vers l'intérieur)
	vec2 d2 = min(px, taille - px);
	float d = min(d2.x, d2.y);
	float bord = d - fbm(px * 0.045 + graine * 5.0) * dechire;
	float vieux = 1.0 - smoothstep(0.0, 34.0, bord + taches * 30.0);
	c = mix(c, roussi.rgb * c * 1.25, vieux * 0.7);
	float a = smoothstep(0.0, 1.2, bord);
	COLOR = vec4(c, a * COLOR.a);
}
