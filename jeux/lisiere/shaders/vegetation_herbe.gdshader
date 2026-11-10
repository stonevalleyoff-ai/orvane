shader_type canvas_item;
// Lisière — l'herbe, et ce qui pousse au ras du sol (shaders/vegetation_herbe.gdshader)
// Des milliers de touffes, de fougères, de roseaux, de fleurs, posées en MultiMesh (decor.gd) : chacune plie au vent du lieu
// (vegetation_vent, le même souffle que les feuillages), et s'écarte autour de la veilleuse.
// Le maillage dit, en chaque point : UV.y sa hauteur au-dessus du pied (en dizaines de pixels), UV.x s'il prend la couleur des
// pétales. Chaque instance dit (INSTANCE_CUSTOM) : sa place dans le monde (x, y), la couleur de ses pétales (z, de 0 à 1), sa
// phase (w, de 0 à 1 ; plus 2 si le dessin est retourné). Le vertex est encore dans l'espace du maillage : le déplacement
// passe ensuite par la transformation de l'instance (son échelle, son retournement).

#include "res://shaders/vegetation_vent.gdshaderinc"

uniform float temps = 0.0;
uniform vec2 veilleuse = vec2(100000.0);
uniform float ecart = 34.0;
uniform float souplesse = 1.0;
uniform vec3 petale_a = vec3(0.9, 0.86, 0.72);
uniform vec3 petale_b = vec3(0.85, 0.7, 0.3);
uniform vec3 petale_c = vec3(0.55, 0.45, 0.7);

void vertex() {
	vec2 pied = INSTANCE_CUSTOM.xy;
	if (UV.x > 0.5) {
		float t = INSTANCE_CUSTOM.z;
		COLOR.rgb *= t < 0.34 ? petale_a : (t < 0.67 ? petale_b : petale_c);
	}
	float h = UV.y;
	if (h > 0.0) {
		float w = INSTANCE_CUSTOM.w;
		float sens = w > 1.5 ? -1.0 : 1.0;
		vec2 dep = vent_pli(pied, temps, fract(w) * 6.2831) * souplesse * 1.7 * pow(h, 1.2);
		// la veilleuse passe : l'herbe s'écarte d'elle, et se couche un peu
		vec2 d = pied - veilleuse;
		float l = length(d);
		float pres = 1.0 - smoothstep(ecart * 0.3, ecart, l);
		dep += d / max(l, 1.0) * pres * 5.5 * min(h, 1.6);
		dep.y += pres * 2.5 * min(h, 1.6);
		dep.x *= sens;
		VERTEX += dep;
	}
}
