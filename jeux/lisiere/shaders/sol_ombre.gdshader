shader_type canvas_item;
// Lisière — les ombres au sol (shaders/sol_ombre.gdshader)
// Sous chaque objet, une ombre de contact, douce ; sous ce qui est haut, une ombre portée, plus nette, qui suit le soleil au fil
// du jour et s'efface la nuit. Dessinées une fois, en éventails (monde.gd) ; le soleil passe par les uniforms.
// La couleur de chaque point porte ses données : r, 1 pour une ombre portée (0 : de contact) ; g, la hauteur de l'objet (en
// centaines de pixels) ; b, 1 au cœur de l'ombre et 0 au bord ; a, son opacité.

uniform vec2 soleil = vec2(0.42, 0.2);
uniform float jour = 1.0;
uniform vec3 teinte = vec3(0.07, 0.075, 0.12);

varying float v_portee;
varying vec2 v_monde;

float ombre_hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float ombre_bruit(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(ombre_hash(i), ombre_hash(i + vec2(1.0, 0.0)), u.x), mix(ombre_hash(i + vec2(0.0, 1.0)), ombre_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void vertex() {
	v_portee = COLOR.r;
	VERTEX += soleil * COLOR.g * 100.0 * COLOR.r;
	v_monde = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

void fragment() {
	float coeur = COLOR.b;
	float douce = smoothstep(0.0, 0.85, coeur);
	// (l'ombre portée a un bord plus net, un peu tremblé, comme une tache d'encre diluée)
	float bord = coeur + (ombre_bruit(v_monde * 0.09) - 0.5) * 0.35;
	float nette = smoothstep(0.2, 0.42, bord) * (0.75 + 0.25 * smoothstep(0.4, 0.9, coeur));
	float a = mix(douce, nette, v_portee) * COLOR.a * mix(1.0, jour, v_portee);
	COLOR = vec4(teinte, a);
}
