// Lisière — les flammes d'un feu de camp (shaders/feu_flamme.gdshader)
// Deux langues de feu l'une devant l'autre : derrière, une grande flamme rouge et orange, lente ; devant, un cœur jaune qui
// blanchit au plus chaud. Un bruit qui monte les déchire en langues, les pointes se détachent. Les bandes de couleur restent
// nettes (l'encre et la braise : dessiné, pas flou). Elle ne reçoit pas de lumière (unshaded) : l'obscurité du lieu (le
// CanvasModulate) ne la touche pas, elle brille d'elle-même. Au-dessus des pointes, l'air tremble : des ondes chaudes, à
// peine visibles, qui montent (sans relire l'écran : une copie d'écran coûte trop cher).
shader_type canvas_item;
render_mode blend_premul_alpha, unshaded;

uniform float force = 1.0;        // de 0 (un feu qui meurt) à 1,5 (un grand feu)
uniform float vent = 0.0;         // de -1 à 1 : la flamme penche
uniform float avive = 0.0;        // de 0 à 1 : une bûche vient d'y tomber
uniform float graine = 0.0;
uniform float opacite = 0.35;     // ce que la flamme cache de ce qui est derrière (le jour)
uniform float part = 0.69;        // la part du rectangle que prend la flamme (au-dessus : l'air chaud)
uniform float chaleur = 1.0;      // l'air qui tremble (0 : rien)
uniform vec4 rouge : source_color = vec4(0.77, 0.27, 0.16, 1.0);
uniform vec4 braise : source_color = vec4(0.95, 0.6, 0.28, 1.0);
uniform vec4 coeur : source_color = vec4(1.0, 0.85, 0.54, 1.0);

float hache(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hache(i), hache(i + vec2(1.0, 0.0)), f.x), mix(hache(i + vec2(0.0, 1.0)), hache(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * bruit(p);
		p = p * 2.07 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return v;
}

// une langue de feu, centrée en cx : son intensité en ce point (x de -0,5 à 0,5 ; y de 0 à la base à 1 en haut)
float langue(vec2 p, float t, float g, float cx, float large, float haut, float vitesse, float dechire) {
	// (elle respire : sa hauteur bat doucement)
	float y = p.y / (haut * (0.86 + 0.28 * bruit(vec2(g * 3.7, t * 1.4))));
	if (y >= 1.0) {
		return -1.0;
	}
	float n = fbm(vec2((p.x - cx) * 3.4 + g, p.y * 2.5 - t * vitesse));
	// elle penche au vent et ondule, d'autant plus qu'on monte
	float x = p.x - cx - vent * y * y * 0.22 - (n - 0.5) * 0.46 * y - sin(t * 2.1 + g + y * 3.0) * 0.03 * y;
	// large et ronde en bas, pointue en haut
	float w = large * pow(max(1.0 - y, 0.0), 0.7) * (0.6 + 0.4 * smoothstep(-0.05, 0.18, y));
	float s = 1.0 - abs(x) / max(w, 0.001);
	return max(s, -1.0) * (1.1 - y * 0.6) - (n - 0.42) * dechire * (0.2 + y * 1.1);
}

void fragment() {
	vec2 q = vec2(UV.x - 0.5, 1.0 - UV.y);
	vec2 p = vec2(q.x, q.y / part);
	float t = TIME + graine * 7.3;
	// un grand feu a des langues sur les côtés
	float cotes = smoothstep(0.35, 1.1, force);
	// derrière : la grande flamme, rouge et orange, et ses langues de côté
	float ib = langue(p, t * 0.9, graine, 0.0, 0.36, 0.98, 1.7, 0.95);
	ib = max(ib, langue(p, t * 1.05, graine + 5.0, -0.19, 0.2, 0.62 * cotes + 0.01, 2.0, 1.0));
	ib = max(ib, langue(p, t * 1.1, graine + 9.0, 0.2, 0.19, 0.55 * cotes + 0.01, 2.1, 1.0));
	// devant : le cœur, plus bas, plus étroit, plus vif
	float ic = langue(p + vec2(0.0, 0.02), t * 1.15, graine + 3.1, 0.0, 0.22, 0.62 + 0.06 * force, 2.3, 0.8);
	float mb = smoothstep(0.0, 0.04, ib);
	float mc = smoothstep(0.0, 0.04, ic);
	// (un liseré plus sombre au bord : la flamme est dessinée)
	vec3 cb = mix(rouge.rgb * 0.62, rouge.rgb, smoothstep(0.03, 0.07, ib));
	cb = mix(cb, braise.rgb, smoothstep(0.2, 0.27, ib));
	cb = mix(cb, coeur.rgb * 0.95, smoothstep(0.55, 0.62, ib) * 0.55);
	vec3 cc = mix(braise.rgb, coeur.rgb, smoothstep(0.08, 0.15, ic));
	cc = mix(cc, vec3(1.0, 0.96, 0.86), smoothstep(0.62, 0.74, ic));
	// le bas de la flamme, dans le bois, est plus sombre (les braises le relaient)
	float pied = smoothstep(0.0, 0.1, p.y);
	vec3 col = cb * (0.55 + 0.45 * pied);
	col = mix(col, cc, mc * pied);
	float couvre = max(mb, mc * pied);
	float eclat = 1.0 + avive * 0.35;
	// l'air chaud : des ondes qui montent, plus nettes juste au-dessus des pointes, qui s'effacent en haut et sur les côtés
	float hy = clamp((q.y - part * 0.6) / (1.0 - part * 0.6), 0.0, 1.0);
	float onde = sin(q.x * 30.0 + sin(q.y * 11.0 - t * 5.0) * 2.4 - t * 1.3);
	float trait = smoothstep(0.7, 1.0, onde) * smoothstep(0.4, 0.08, abs(q.x)) * smoothstep(0.0, 0.25, hy) * (1.0 - hy);
	vec3 air = braise.rgb * trait * 0.05 * chaleur * clamp(force, 0.3, 1.3);
	COLOR = vec4(col * eclat * couvre + air * (1.0 - couvre), couvre * opacite);
}
