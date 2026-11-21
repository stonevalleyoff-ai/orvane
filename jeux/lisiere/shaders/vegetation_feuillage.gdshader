shader_type canvas_item;
// Lisière — les feuillages, les écorces, les pierres (shaders/vegetation_feuillage.gdshader)
// Une seule peinture pour tout ce que l'environnement dessine (objet.gd, decor.gd), dans l'esprit des planches de naturaliste :
// des aplats à trois tons (l'ombre froide, le ton propre, la lumière chaude), éclairés en haut à gauche, aux bords un peu
// tremblés, et un grain de papier. Les UV de chaque aplat disent comment le peindre (decor_pinceau.gd) :
//   (0, 0)            la couleur telle quelle : l'encre, les détails ;
//   autour de 3       un feuillage : un dôme fait de touffes (UV - 3 : la place dans le dôme, de -1 à 1) ;
//   autour de 7       une pierre : un dôme à facettes ;
//   autour de 11      une écorce : un cylindre éclairé à gauche (UV.x - 11, de -1 à 1, en travers), des fibres ;
//   autour de 15      un dôme lisse : un chapeau de champignon, une baie, une congère ;
//   autour de 19      des aiguilles : un étage de sapin (UV.x - 19 en travers, UV.y - 19 du haut vers le bas).
// Le vent (vegetation_vent) plie ce qui est haut : la couronne bouge, le pied du tronc non (VERTEX.y local : négatif vers le
// haut ; l'origine du nœud est le pied). souplesse vaut 0 pour ce qui ne bouge pas (une matière à part, la même peinture).

#include "res://shaders/vegetation_vent.gdshaderinc"

uniform float temps = 0.0;
uniform float souplesse = 1.0;

varying vec2 v_local;
varying vec2 v_pied;

const vec3 LUMIERE = vec3(-0.5, -0.64, 0.58);

void vertex() {
	v_local = VERTEX;
	v_pied = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xy;
	float h = max(0.0, -VERTEX.y);
	float k = souplesse * smoothstep(4.0, 70.0, h) * (0.45 + h / 110.0);
	if (k > 0.0) {
		float phase = vent_hash(floor(v_pied * 0.37)) * 6.2831;
		VERTEX += vent_pli(v_pied, temps, phase) * k * 2.6;
	}
}

// les trois tons (et un éclat), d'après la lumière l (de -1, le dos, à 1, face au jour)
vec3 peindre(vec3 base, float l) {
	float aa = max(fwidth(l), 0.002) * 0.8;
	vec3 ombre = base * vec3(0.5, 0.56, 0.7);
	vec3 clair = mix(base * 1.32, vec3(0.98, 0.92, 0.72), 0.14);
	vec3 eclat = mix(base * 1.62, vec3(1.0, 0.95, 0.8), 0.32);
	vec3 c = mix(ombre, base, smoothstep(-aa, aa, l + 0.02));
	c = mix(c, clair, smoothstep(-aa, aa, l - 0.42));
	return mix(c, eclat, smoothstep(-aa, aa, l - 0.8) * 0.85);
}

// un pavage de cellules (Worley) : la distance au plus proche point, au second, et le chemin vers le plus proche
void cellules(vec2 p, out vec2 vers, out float d1, out float d2, out vec2 cle) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	d1 = 9.0;
	d2 = 9.0;
	vers = vec2(0.0);
	cle = i;
	for (int y = -1; y <= 1; y++) {
		for (int x = -1; x <= 1; x++) {
			vec2 o = vec2(float(x), float(y));
			vec2 pt = o + 0.15 + 0.7 * vec2(vent_hash(i + o), vent_hash(i + o + 19.7));
			vec2 d = pt - f;
			float dd = dot(d, d);
			if (dd < d1) {
				d2 = d1;
				d1 = dd;
				vers = d;
				cle = i + o;
			} else if (dd < d2) {
				d2 = dd;
			}
		}
	}
	d1 = sqrt(d1);
	d2 = sqrt(d2);
}

vec3 dome(vec2 q) {
	return vec3(q, sqrt(max(0.0, 1.0 - dot(q, q))));
}

void fragment() {
	vec3 base = COLOR.rgb;
	vec3 c = base;
	float n = vent_bruit(v_local * 0.31 + v_pied * 0.01) - 0.5;
	if (UV.x > 1.5 && UV.x < 4.5) {
		// un feuillage : le grand dôme, et ses touffes (des cellules d'environ 11 pixels), chacune éclairée en haut à gauche
		vec2 q = UV - vec2(3.0);
		float l0 = dot(normalize(dome(q * 0.92)), LUMIERE);
		vec2 vers;
		float d1;
		float d2;
		vec2 cle;
		cellules(v_local / 12.5 + v_pied * 0.017, vers, d1, d2, cle);
		vec2 o = -vers / 0.6;
		float l1 = dot(normalize(dome(o * 0.95)), LUMIERE);
		float creux = 1.0 - smoothstep(0.0, 0.13, d2 - d1);
		float l = l0 * 0.85 + l1 * 0.5 - 0.36 + n * 0.22 - creux * 0.5 * smoothstep(-0.7, 0.3, -l0);
		c = peindre(base * (0.93 + 0.14 * vent_hash(cle)), l);
	} else if (UV.x > 5.5 && UV.x < 8.5) {
		// une pierre : des facettes planes, chacune tournée un peu autrement, sur un dôme
		vec2 q = UV - vec2(7.0);
		vec2 vers;
		float d1;
		float d2;
		vec2 cle;
		cellules(q * 1.7 + v_pied * 0.03, vers, d1, d2, cle);
		vec3 nf = normalize(vec3(vent_hash(cle) - 0.5, vent_hash(cle + 3.1) - 0.5, 0.0) * 0.8 + dome(q * 0.9) * 1.2);
		float arete = 1.0 - smoothstep(0.0, 0.05, d2 - d1);
		float l = dot(nf, LUMIERE) - 0.12 + n * 0.12 + arete * 0.12;
		float grain = vent_hash(floor(v_local * 1.1));
		c = peindre(base * (0.96 + 0.08 * grain), l);
		c *= 1.0 - arete * 0.18 * smoothstep(0.0, -0.5, l);
	} else if (UV.x > 9.5 && UV.x < 12.5) {
		// une écorce : un cylindre éclairé à gauche, des fibres sombres en long
		float x = clamp(UV.x - 11.0, -1.0, 1.0);
		float l = dot(normalize(vec3(x, -0.15, sqrt(max(0.0, 1.0 - x * x)))), LUMIERE) - 0.2 + n * 0.15;
		float fibre = vent_bruit(vec2(v_local.x * 0.85, v_local.y * 0.09) + v_pied * 0.05);
		l -= (1.0 - smoothstep(0.2, 0.34, fibre)) * 0.5;
		c = peindre(base, l);
	} else if (UV.x > 13.5 && UV.x < 16.5) {
		// un dôme lisse
		vec2 q = UV - vec2(15.0);
		float l = dot(normalize(dome(q * 0.97)), LUMIERE) + n * 0.1;
		c = peindre(base, l);
	} else if (UV.x > 17.5 && UV.x < 20.5) {
		// des aiguilles : un étage de sapin, éclairé à gauche et plus sombre dessous, strié de traits
		float x = clamp(UV.x - 19.0, -1.0, 1.0);
		float y = UV.y - 19.0;
		float l = dot(normalize(vec3(x * 0.9, -0.35, 0.75)), LUMIERE) + 0.25 - y * 0.55 + n * 0.22;
		float trait = vent_bruit(vec2((v_local.x + v_local.y * 0.9) * 0.55, (v_local.y - v_local.x * 0.45) * 0.16) + v_pied * 0.03);
		l -= (1.0 - smoothstep(0.24, 0.36, trait)) * 0.38;
		c = peindre(base, l);
	}
	// le grain du papier, très léger
	c *= 0.968 + 0.064 * vent_bruit(v_local * 0.83 + 41.0);
	COLOR = vec4(c, COLOR.a);
}
