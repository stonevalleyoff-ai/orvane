// Lisière — la brume (shaders/brume_sol.gdshader)
// Un bruit sans couture, lu en coordonnées du monde, qui dérive au vent : des nappes couchées sur le sol (aplaties, vues de
// biais), plus ou moins épaisses. Elle prend la couleur de ce qui l'éclaire : bleue dans le noir, chaude quand elle passe dans
// la lumière d'un feu ou d'une torche (elle n'en reçoit qu'une part : elle voile le cercle sans le salir).
// (Elle fait sa lumière elle-même, d'après les feux et la torche que les effets lui donnent, et son obscurité aussi : un
// grand rectangle éclairé par le moteur coûterait trop cher.)
shader_type canvas_item;
render_mode unshaded;

uniform sampler2D bruit : repeat_enable, filter_linear_mipmap;
uniform float densite = 0.2;
uniform float seuil = 0.42;
uniform float echelle = 0.0016;
uniform vec2 derive = vec2(0.0);
uniform vec4 couleur : source_color = vec4(0.75, 0.8, 0.9, 1.0);
uniform vec4 obscur : source_color = vec4(1.0);     // la couleur du monde (le CanvasModulate)
uniform vec4 c_feu : source_color = vec4(0.97, 0.66, 0.35, 1.0);
uniform vec4 feu0 = vec4(0.0);                      // xy : où, z : le rayon, w : la force (0 : rien)
uniform vec4 feu1 = vec4(0.0);
uniform vec4 torche = vec4(0.0);
uniform float lumiere_recue = 0.45;

varying vec2 monde;

void vertex() {
	monde = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

float lueur(vec4 l) {
	if (l.w <= 0.0) {
		return 0.0;
	}
	float d = length(monde - l.xy) / max(l.z, 1.0);
	return l.w * pow(clamp(1.0 - d, 0.0, 1.0), 0.8);
}

void fragment() {
	vec2 p = (monde + derive) * echelle * vec2(1.0, 1.9);
	float a = texture(bruit, p).r;
	float b = texture(bruit, p * 2.6 + vec2(0.37, 0.71) - derive * echelle * 0.7).r;
	float n = a * 0.66 + b * 0.34;
	float m = smoothstep(seuil - 0.08, seuil + 0.4, n);
	float e = lueur(feu0) + lueur(feu1) + lueur(torche);
	vec3 lumiere = obscur.rgb + c_feu.rgb * e * lumiere_recue;
	COLOR = vec4(couleur.rgb * lumiere, m * densite);
}
