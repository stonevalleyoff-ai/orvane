shader_type canvas_item;
// Lisière — les plantes de l'herbier, mises à l'encre (shaders/vegetation_planche.gdshader)
// Un arbre, un buisson, une touffe du monde d'Orvane arrivent dessinés par l'herbier (docs/49) : des aplats vifs, sans contour.
// Pour qu'ils vivent dans le même carnet que le reste (vegetation_feuillage), on les accorde : leurs couleurs vont vers celles
// du lieu (sans perdre leurs valeurs), un volume éclairé en haut à gauche, un contour d'encre, le grain du papier. Le vent est
// le même que celui des feuillages : la couronne plie, le pied non (VERTEX.y local : négatif vers le haut ; l'origine est le pied).

#include "res://shaders/vegetation_vent.gdshaderinc"

uniform float temps = 0.0;
uniform float souplesse = 1.0;
// la couleur du lieu pour cette plante (les feuilles, ou l'herbe), et combien on y ramène le dessin
uniform vec4 teinte : source_color = vec4(0.25, 0.35, 0.2, 1.0);
uniform float accord = 0.85;

varying vec2 v_local;
varying vec2 v_pied;
varying vec4 v_mod;

const vec3 ENCRE = vec3(0.086, 0.075, 0.059);

void vertex() {
	v_local = VERTEX;
	v_pied = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xy;
	v_mod = COLOR;
	float h = max(0.0, -VERTEX.y);
	float k = souplesse * smoothstep(4.0, 70.0, h) * (0.45 + h / 110.0);
	if (k > 0.0) {
		float phase = vent_hash(floor(v_pied * 0.37)) * 6.2831;
		VERTEX += vent_pli(v_pied, temps, phase) * k * 2.6;
	}
}

float luminance(vec3 c) {
	return dot(c, vec3(0.3, 0.59, 0.11));
}

void fragment() {
	vec4 tx = texture(TEXTURE, UV);
	// le contour : un pixel vide qui touche le dessin devient de l'encre (huit voisins, un peu plus d'un pixel)
	vec2 px = TEXTURE_PIXEL_SIZE * 1.35;
	float voisin = 0.0;
	for (int i = 0; i < 8; i++) {
		float a = float(i) * 0.7853982;
		voisin = max(voisin, texture(TEXTURE, UV + vec2(cos(a), sin(a)) * px).a);
	}
	float bord = clamp(voisin - tx.a, 0.0, 1.0);
	// les verts vont vers la couleur du lieu, à la valeur du lieu (le dessin dit seulement plus clair ou plus sombre) ; le reste
	// (un tronc, des baies) garde sa couleur, un peu moins vive
	float lum = luminance(tx.rgb);
	float rel = clamp(lum / 0.3, 0.45, 1.7);
	float vert = smoothstep(0.0, 0.08, tx.g - max(tx.r, tx.b));
	vec3 lieu = teinte.rgb * rel;
	vec3 c = mix(tx.rgb, lieu, accord * vert);
	c = mix(c, vec3(luminance(c)), 0.15);
	// des ombres froides, des lumières chaudes, comme les feuillages à l'encre
	c = mix(c * vec3(0.8, 0.86, 1.0), c * vec3(1.06, 1.02, 0.9), smoothstep(0.75, 1.3, rel));
	// le volume : la lumière vient d'en haut à gauche
	float l = (0.5 - UV.x) * 0.55 + (0.45 - UV.y) * 0.75;
	c *= 1.0 + 0.24 * l;
	// le grain du papier, très léger
	c *= 0.968 + 0.064 * vent_bruit(v_local * 0.83 + 41.0);
	c = mix(c, ENCRE, bord);
	float alpha = max(tx.a, bord * 0.9);
	COLOR = vec4(c * v_mod.rgb, alpha * v_mod.a);
}
