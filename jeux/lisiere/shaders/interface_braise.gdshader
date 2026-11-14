// Lisière — la braise dans les lettres (shaders/interface_braise.gdshader)
// Un titre gravé, chauffé par en dessous : l'ivoire du papier en haut des lettres, la braise en bas, et des points plus chauds
// qui rampent et montent, comme sur une bûche. « vif » suit l'éclat du feu. L'ombre des lettres passe aussi par ici : elle
// reste sombre (la couleur reçue est multipliée, pas remplacée).
shader_type canvas_item;

uniform vec4 froid : source_color = vec4(0.914, 0.875, 0.784, 1.0);
uniform vec4 chaud : source_color = vec4(0.949, 0.604, 0.282, 1.0);
uniform vec4 coeur : source_color = vec4(1.0, 0.847, 0.541, 1.0);
uniform float haut = 0.0;          // le haut des lettres, en unités du nœud
uniform float hauteur = 100.0;     // leur hauteur
uniform float depuis = 0.3;        // d'où la chaleur monte (en fraction de la hauteur, depuis le haut)
uniform float vif = 1.0;

varying vec2 local;

void vertex() {
	local = VERTEX;
}

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float bruit(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void fragment() {
	vec4 t = texture(TEXTURE, UV);
	float y = clamp((local.y - haut) / max(hauteur, 1.0), 0.0, 1.0);
	float n = bruit(vec2(local.x * 0.03 + TIME * 0.2, local.y * 0.045 + TIME * 0.8));
	float n2 = bruit(vec2(local.x * 0.09 - TIME * 0.35, local.y * 0.12 + TIME * 1.6));
	float chaleur = smoothstep(depuis, 1.05, y) * (0.6 + 0.6 * n) * vif;
	vec3 c = mix(froid.rgb, chaud.rgb, clamp(chaleur, 0.0, 1.0));
	c = mix(c, coeur.rgb, clamp((chaleur - 0.45) * 1.8, 0.0, 1.0) * n2);
	COLOR = vec4(c * COLOR.rgb, t.a * COLOR.a);
}
