shader_type canvas_item;
// Lisière — le sol peint (shaders/sol_peint.gdshader)
// La terre du lieu, peinte en coordonnées du monde, dans les couleurs de son biome (monde.gd, couleurs) : de grandes plaques
// (trois bruits lents, cuits une fois dans de petites textures, que le décor lit aussi : decor.gd), où se mêlent la terre, la
// mousse, l'herbe rase, la litière de feuilles mortes (une à une, avec leur ombre), des cailloux ; la neige et le givre s'il fait
// froid, la boue s'il est humide, des fentes s'il est sec. Une clairière de terre battue autour du réveil, là où l'on campe.
// Au-delà du carré jouable, le sol s'enfonce dans le noir du bois. Un grain de papier très léger par-dessus.
// Ce shader ne tourne pas à chaque image : il peint des tuiles, une fois, quand la caméra en approche (scripts/decor_sol.gd).
// (« fin » : les feuilles et les cailloux au pixel, qu'on peut éteindre.)

uniform sampler2D plaques : filter_linear, repeat_disable;
uniform sampler2D taches : filter_linear, repeat_disable;
uniform sampler2D voiles : filter_linear, repeat_disable;
uniform sampler2D motif_a : filter_linear, repeat_enable;
uniform sampler2D motif_b : filter_linear, repeat_enable;
uniform float etendue = 5400.0;

uniform vec3 terre = vec3(0.35, 0.27, 0.19);
uniform vec3 terre_claire = vec3(0.45, 0.36, 0.25);
uniform vec3 terre_sombre = vec3(0.24, 0.19, 0.14);
uniform vec3 mousse = vec3(0.31, 0.42, 0.23);
uniform vec3 mousse_claire = vec3(0.42, 0.52, 0.3);
uniform vec3 herbe = vec3(0.34, 0.42, 0.22);
uniform vec3 litiere_a = vec3(0.55, 0.27, 0.14);
uniform vec3 litiere_b = vec3(0.6, 0.45, 0.22);
uniform vec3 litiere_c = vec3(0.36, 0.25, 0.16);
uniform vec3 caillou = vec3(0.5, 0.48, 0.45);
uniform vec3 neige = vec3(0.88, 0.9, 0.94);
uniform vec3 neige_ombre = vec3(0.6, 0.68, 0.82);
uniform vec3 boue = vec3(0.17, 0.15, 0.13);
uniform vec3 usure = vec3(0.47, 0.39, 0.28);
uniform vec3 encre = vec3(0.086, 0.075, 0.059);
uniform vec3 sous_bois = vec3(0.04, 0.05, 0.05);

uniform float part_mousse = 0.4;
uniform float part_herbe = 0.3;
uniform float part_litiere = 0.4;
uniform float part_cailloux = 0.2;
uniform float part_neige = 0.0;
uniform float part_boue = 0.0;
uniform float part_fentes = 0.0;
uniform float demi = 2100.0;
uniform float clairiere = 250.0;
uniform bool fin = true;

varying vec2 monde;

const vec3 LUMIERE = vec3(-0.5, -0.64, 0.58);

void vertex() {
	monde = VERTEX;
}

float h21(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

// un masque aux bords nets mais tremblés : 1 au-dessus du seuil
float masque(float v, float seuil, float aa) {
	return smoothstep(seuil - aa, seuil + aa, v);
}

void fragment() {
	vec2 uv = monde / etendue + 0.5;
	float px = max(fwidth(monde.x), 0.3);
	float A = texture(plaques, uv).r;
	float B = texture(taches, uv).r;
	float C = texture(voiles, uv).r;
	// les bruits fins, lus dans deux motifs sans couture à des échelles qui ne tombent pas juste
	float d1 = texture(motif_a, monde / 310.0).r;
	float d2 = texture(motif_b, monde / 97.0 + 0.37).r;
	float d3 = texture(motif_a, monde / 31.0 + 0.71).r;
	float g1 = texture(motif_b, monde / 13.0).r;
	float g2 = texture(motif_a, monde * vec2(1.0 / 40.0, 1.0 / 4.5)).r;
	float aa = 0.018;

	// la clairière du réveil : la terre battue, sans mousse ni litière
	float r0 = length(monde * vec2(1.0, 1.25)) + (d2 - 0.5) * 90.0 + (d3 - 0.5) * 26.0;
	float use = 1.0 - smoothstep(clairiere * 0.8 - 6.0, clairiere * 0.8 + 6.0, r0);
	float pietine = 1.0 - smoothstep(0.0, clairiere * 0.75, r0);

	// la terre, marbrée
	float t = A * 0.45 + d1 * 0.35 + d3 * 0.2;
	vec3 col = mix(terre_sombre, terre, smoothstep(0.25, 0.55, t));
	col = mix(col, terre_claire, smoothstep(0.6, 0.85, t) * 0.7);

	// l'herbe rase, par grandes nappes
	float mh = masque(B * 0.5 + A * 0.25 + d2 * 0.25 + (d3 - 0.5) * 0.12, 1.0 - part_herbe * 0.95 - 0.05, aa * 2.0) * (1.0 - use * 0.85);
	vec3 herbe_ici = herbe * (0.82 + 0.3 * d3) * (0.9 + 0.12 * g1);
	col = mix(col, herbe_ici, mh * 0.9);

	// la mousse : des coussins, plus sombres au bord, piquetés de clair
	float vm = B * 0.45 + d2 * 0.5 + (d3 - 0.5) * 0.07 - 0.025;
	float sm = 1.0 - part_mousse * 0.9 - 0.1;
	float mm = masque(vm, sm, 0.006) * (1.0 - use);
	float bord_m = mm * (1.0 - masque(vm, sm + 0.022, 0.006));
	float coussin = smoothstep(sm, sm + 0.12, vm);
	vec3 mousse_ici = mix(mousse * 0.86, mousse_claire, coussin * 0.55 + smoothstep(0.6, 0.7, g1) * 0.35) * (0.92 + 0.12 * d3);
	col = mix(col, mousse_ici, mm);
	col = mix(col, mousse * 0.58, bord_m * 0.75);

	// la boue, dans les creux
	float mb = masque(1.0 - A * 0.7 - d2 * 0.3 + (d3 - 0.5) * 0.15, 1.0 - part_boue * 0.7, aa) * (1.0 - use * 0.5);
	col = mix(col, boue * (0.85 + 0.25 * g2), mb * 0.92);
	col += vec3(0.05, 0.06, 0.08) * mb * smoothstep(0.7, 0.9, g2) * 0.8;

	// les fentes de la terre sèche
	if (part_fentes > 0.01) {
		vec2 g = monde / vec2(38.0, 30.0);
		vec2 gi = floor(g);
		vec2 gf = fract(g);
		float e1 = 9.0;
		float e2 = 9.0;
		for (int y = -1; y <= 1; y++) {
			for (int x = -1; x <= 1; x++) {
				vec2 o = vec2(float(x), float(y));
				vec2 pt = o + 0.2 + 0.6 * vec2(h21(gi + o), h21(gi + o + 7.7)) - gf;
				float dd = dot(pt, pt);
				if (dd < e1) {
					e2 = e1;
					e1 = dd;
				} else if (dd < e2) {
					e2 = dd;
				}
			}
		}
		float fente = 1.0 - smoothstep(0.0, 0.035 + px * 0.02, sqrt(e2) - sqrt(e1));
		float ou = masque(A * 0.6 + d2 * 0.4, 1.0 - part_fentes * 0.8, 0.04) * (1.0 - mh) * (1.0 - mm);
		col = mix(col, col * 0.55, fente * ou * 0.8);
	}

	// la litière : des feuilles mortes, une à une, chacune avec son ombre, plus serrées sous le couvert
	float ml = clamp((C * 0.55 + A * 0.2 + d2 * 0.25 + (d3 - 0.5) * 0.2 - (1.0 - part_litiere * 0.9 - 0.1)) * 3.0, 0.0, 1.0) * (1.0 - use * 0.95) * (1.0 - mb);
	col = mix(col, col * 0.84, ml * 0.45);
	if (fin && ml > 0.01) {
		for (int k = 0; k < 2; k++) {
			vec2 dec = k == 0 ? vec2(0.0) : vec2(6.7, 4.3);
			vec2 g = (monde + dec) / 14.0;
			vec2 gi = floor(g) + float(k) * 31.0;
			vec2 gf = fract(g);
			if (h21(gi) < ml * 0.62) {
				float ang = h21(gi + 2.3) * 6.2831;
				vec2 c = vec2(0.5) + (vec2(h21(gi + 3.1), h21(gi + 4.9)) - 0.5) * 0.2;
				float L = 0.27 + 0.11 * h21(gi + 5.5);
				float W = L * (0.42 + 0.14 * h21(gi + 6.1));
				float bord = px / 14.0;
				float ca = cos(ang);
				float sa = sin(ang);
				// (l'ombre de la feuille, posée en bas à droite)
				vec2 o = gf - c - vec2(0.03, 0.04);
				o = vec2(o.x * ca + o.y * sa, (-o.x * sa + o.y * ca) * 1.3);
				float xo = o.x / L;
				float ombre = (1.0 - smoothstep(0.85, 1.05, abs(xo))) * (1.0 - smoothstep(W * (1.0 - xo * xo), W * (1.0 - xo * xo) + 0.05, abs(o.y)));
				col = mix(col, col * 0.62, ombre * 0.55);
				vec2 d = gf - c;
				d = vec2(d.x * ca + d.y * sa, (-d.x * sa + d.y * ca) * 1.3);
				float x = d.x / L;
				float largeur = W * (1.0 - x * x);
				float dedans = (1.0 - smoothstep(0.9, 1.0, abs(x))) * (1.0 - smoothstep(largeur - bord, largeur + bord, abs(d.y)));
				float hk = h21(gi + 8.8);
				vec3 f = hk < 0.22 ? litiere_a : (hk < 0.62 ? litiere_b : litiere_c);
				f = mix(f, col, 0.22) * (0.85 + 0.28 * h21(gi + 1.7));
				f *= d.y > 0.0 ? 0.84 : 1.05;
				float nervure = 1.0 - smoothstep(0.0, 0.018 + bord, abs(d.y));
				f = mix(f, f * 0.62, nervure * 0.65 * step(abs(x), 0.85));
				float lisere = smoothstep(largeur - bord * 2.5 - 0.02, largeur, abs(d.y));
				f = mix(f, encre, lisere * 0.45);
				col = mix(col, f, dedans);
			}
		}
	}

	// la neige, en plaques, bleutée sur son bord d'ombre ; le givre, en grains
	float vs = C * 0.55 + A * 0.25 + d2 * 0.2 + (d3 - 0.5) * 0.05;
	float ss = 1.0 - part_neige * 0.9;
	float ms = masque(vs, ss, aa);
	float creux_s = 1.0 - masque(vs, ss + 0.06, aa * 2.0);
	vec3 neige_ici = mix(neige, neige_ombre, creux_s * 0.75 + (1.0 - d3) * 0.15);
	col = mix(col, neige_ici, ms);
	if (part_neige > 0.01) {
		float givre = masque(vs + 0.07, ss, 0.05) * (1.0 - ms) * part_neige;
		col = mix(col, mix(col, neige_ombre, 0.55), givre * 0.4);
		col += vec3(0.18) * step(0.992, h21(floor(monde / 2.0))) * givre;
	}

	// les cailloux, un par case de 22 pixels, quand le sort le veut
	if (fin) {
		vec2 g = monde / 22.0;
		vec2 gi = floor(g);
		vec2 gf = fract(g);
		float dens = part_cailloux * (0.35 + 0.65 * A) * (1.0 + use * 1.5) * (1.0 - ms) * (1.0 - mm * 0.7);
		if (h21(gi + 3.1) < dens) {
			float rr = 0.08 + 0.15 * h21(gi + 9.7);
			vec2 c = vec2(rr) + (1.0 - 2.0 * vec2(rr)) * vec2(h21(gi + 1.3), h21(gi + 5.9));
			vec2 d = (gf - c) / vec2(rr, rr * 0.7);
			float r = length(d);
			float bord = px / (22.0 * rr);
			// l'ombre du caillou, posée en bas à droite
			float o = 1.0 - smoothstep(0.7, 1.25, length(d - vec2(0.3, 0.35)));
			col = mix(col, col * 0.62, o * 0.6);
			float dedans = 1.0 - smoothstep(1.0 - bord, 1.0 + bord, r);
			float l = dot(normalize(vec3(d, sqrt(max(0.0, 1.0 - r * r)) + 0.15)), LUMIERE);
			vec3 pc = caillou * (0.75 + 0.4 * h21(gi + 4.4));
			vec3 pcol = mix(pc * 0.6, pc, smoothstep(-0.05, 0.05, l));
			pcol = mix(pcol, pc * 1.3, smoothstep(0.5, 0.6, l));
			pcol = mix(pcol, encre, smoothstep(0.7, 0.98, r) * 0.7);
			col = mix(col, pcol, dedans);
		}
	}

	// la clairière : la terre battue, plus claire au cœur, piquetée de graviers ; un liseré plus sombre à son bord
	vec3 battue = usure * (0.84 + 0.2 * d3 + 0.08 * pietine) * (0.94 + 0.09 * g2);
	vec2 gc = monde / 3.4;
	vec2 gci = floor(gc);
	float grain_c = 1.0 - smoothstep(0.2, 0.2 + px / 3.4, length(fract(gc) - 0.5 - (vec2(h21(gci + 1.1), h21(gci + 2.2)) - 0.5) * 0.4));
	battue = mix(battue, battue * 0.68, grain_c * step(0.9, h21(gci)) * 0.8);
	col = mix(col, battue, use);
	float bord_c = (1.0 - smoothstep(clairiere * 0.8 + 4.0, clairiere * 0.8 + 22.0, r0)) * (1.0 - use);
	col = mix(col, col * 0.78, bord_c * 0.5);

	// au-delà du lieu, le sol s'enfonce dans le noir
	float e = max(abs(monde.x), abs(monde.y)) - demi;
	float noir = smoothstep(-60.0, 300.0, e + (d2 - 0.5) * 160.0 + (d1 - 0.5) * 120.0);
	col = mix(col, sous_bois, noir * 0.92);
	col = mix(col, sous_bois * 0.5, smoothstep(250.0, 650.0, e));

	// le grain du papier
	col *= 0.965 + 0.05 * g1 + 0.025 * g2;
	COLOR = vec4(col, 1.0);
}
