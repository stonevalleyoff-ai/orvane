// Lisière — la passe d'écran, en qualité haute (shaders/ecran_post.gdshader)
// Elle lit l'image du lieu (seulement sur un ordinateur, et seulement quand il le faut : elle coûte une copie de l'écran) et en
// retire la couleur : la peur qui monte (et la refroidit), le frisson d'un écho, la fin (le monde se décolore) ; au comble de
// la peur et sous une morsure, l'image se dédouble un peu (les couleurs se décalent vers les bords). Le voile
// (shaders/ecran_voile.gdshader) passe ensuite par-dessus.
shader_type canvas_item;

uniform sampler2D ecran : hint_screen_texture, filter_linear;
uniform float peur = 0.0;
uniform float echo = 0.0;
uniform float fin = 0.0;
uniform float aberration = 0.0;
uniform vec4 c_peur : source_color = vec4(0.54, 0.44, 0.84, 1.0);
uniform vec4 c_echo : source_color = vec4(0.75, 0.89, 1.0, 1.0);

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 c = uv - 0.5;
	float re = length(c) * 1.4142;
	float ab = aberration * re * re;
	vec3 col;
	if (ab > 0.0005) {
		vec2 dir = c * ab * 0.016;
		col = vec3(texture(ecran, uv + dir).r, texture(ecran, uv).g, texture(ecran, uv - dir).b);
	} else {
		col = texture(ecran, uv).rgb;
	}
	float lum = dot(col, vec3(0.299, 0.587, 0.114));
	float sat = clamp(1.0 - 0.6 * smoothstep(0.3, 1.0, peur) - 0.4 * echo - 0.88 * fin, 0.0, 1.0);
	col = mix(vec3(lum), col, sat);
	col = mix(col, col * (0.75 + c_peur.rgb * 0.45), smoothstep(0.55, 1.0, peur) * 0.6);
	col = mix(col, col * vec3(0.78, 0.92, 1.15) + c_echo.rgb * 0.04, echo * 0.55);
	COLOR = vec4(col, 1.0);
}
