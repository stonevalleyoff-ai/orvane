#!/usr/bin/env python3
# Orvane — la Terre réelle : FABRIQUER mondes/europe/lieux.json (outils/terre/LISEZ-MOI.md)
#   python3 outils/terre/fabriquer.py --donnees <dossier> [--resolution 2] [--sortie mondes/europe/lieux.json]
# Une grille H3 sur l'Europe et ses mers. Chaque cellule donne plusieurs LIEUX, un par milieu qui y pèse assez : jusqu'à trois types
# terrestres (d'après la couverture du sol d'aujourd'hui, le climat et l'altitude), un lac, une rivière, un marais, une côte, une mer
# (haute mer ou mer froide) et des abysses. Une cellule à cheval sur un détroit (la Manche, le détroit de Messine) a un jeu de lieux par
# terre et par mer qui ne se touchent pas : l'Angleterre et la France n'y partagent pas leur prairie. Chaque lieu porte des valeurs
# PHYSIQUES (altitude, surface, couvert d'arbres, normales mensuelles 1991–2020) : le moteur les traduit en axes.
# Déterministe : mêmes données, même fichier. Environ une minute à la résolution 2.
import argparse, datetime, json, math, os, sys, time
from collections import Counter
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *

RACINE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
a = argparse.ArgumentParser(description="fabrique les lieux de l'Europe réelle")
a.add_argument('--donnees', required=True, help='le dossier rempli par telecharger.py')
a.add_argument('--resolution', type=int, default=2, help='la résolution H3 (2 : ~87 000 km² la cellule ; 3 : ~12 400)')
a.add_argument('--sortie', default=os.path.join(RACINE, 'mondes/europe/lieux.json'))
a.add_argument('--sources', default=os.path.join(RACINE, 'mondes/europe/sources.json'))
A = a.parse_args()
D, RESH = os.path.abspath(A.donnees), A.resolution
t0 = time.time()
def dire(m): print(f'[{time.time() - t0:5.0f} s] {m}', flush=True)

# --- les règles (toutes ici, pour qu'on les retrouve ; elles sont recopiées dans lieux.json) ---
R = dict(
  gradient=.0065,          # °C par mètre : la température d'un pixel est celle de sa case CRU, corrigée de l'écart d'altitude
  part_type=.15, types_max=3,   # un type terrestre fait un lieu s'il couvre 15 % des terres (d'un seul tenant) de la cellule ; au plus trois
  part_min=.02,            # un lieu qui couvre moins de 2 % de sa cellule est fondu dans le type dominant de sa terre (sauf une rivière)
  terre_min=300,           # km² (et 2 % de la cellule) : une terre d'un seul tenant plus petite dans la cellule (un îlot) n'a qu'une côte
  cote_bande=2,            # la côte : les terres à moins de 2 pixels (~3 km) de la mer
  cote_min=100,            # km² de bande côtière pour faire une côte
  lac_part=.015, lac_min=150,      # les lacs : 1,5 % des terres et 150 km²
  marais_part=.03, marais_min=150, # les zones humides : 3 % et 150 km²
  riviere_rang=5, riviere_min=100, riviere_largeur=.5,  # les fleuves de Natural Earth de rang ≤ 5 ; 100 km dans la cellule ; 0,5 km de large
  mer_km=400, mer_lon_max=60, mer_lat_max=82,           # les mers : le centre de la cellule à 400 km au plus des terres d'Europe
  mer_min=1000,            # km² de mer d'un seul tenant pour faire un lieu marin
  mer_froide=10.,          # °C : sous cette température annuelle de surface, la mer est froide
  abysses_prof=1000, abysses_part=.15, abysses_min=2000,  # plus de 1 000 m de fond sur 15 % de cette mer et 2 000 km²
  coupure_alt=1000,        # m : deux lieux terrestres de cellules voisines dont l'altitude diffère de plus ne se touchent pas
  montagne=(1000, 500, 150),   # montagne : au-dessus de 1 000 m, ou de 500 m avec un relief (écart-type local) de 150 m
  sommets=(2200, 1500),        # sommets : au-dessus de 2 200 m, ou de 1 500 m sur roche, glace ou mousses
  maquis_t=12.,            # °C : sous un été sec (Köppen Cs), les arbres, arbustes et herbes d'un lieu plus chaud sont un maquis
)
TERRE = ['toundra', 'taiga', 'foret', 'prairie', 'steppe', 'maquis', 'montagne', 'sommets', 'banquise', 'desert-froid']
EAUX, MERS = ['lac', 'riviere', 'marais', 'cote'], ['large', 'mer-froide', 'abysses']
SORTES = TERRE + EAUX + MERS; K = {s: i for i, s in enumerate(SORTES)}; NS = len(SORTES)
BIOMES = {b['id']: b for b in json.load(open(os.path.join(RACINE, 'moteur/biomes-universels.json'), encoding='utf-8'))}
JOURS = np.array([31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])
KM = math.pi * 6371.0088 / 180                                         # km par degré
HUIT = np.ones((3, 3), bool)

import h3, shapefile
import h3.api.numpy_int as h3i
from scipy import ndimage
from scipy.spatial import cKDTree
from rasterio.features import rasterize
from shapely.geometry import shape, box as boite
from affine import Affine

lat = LAT1 - (np.arange(NY) + .5) * RES; lon = LON0 + (np.arange(NX) + .5) * RES
AIRE = np.broadcast_to(((RES * KM) ** 2 * np.cos(np.radians(lat)))[:, None], (NY, NX))   # km² d'un pixel
LAT2, LON2 = lat[:, None], lon[None, :]
T = Affine(RES, 0, LON0, 0, -RES, LAT1)
CADRE = boite(LON0, LAT0, LON1, LAT1)
def xyz(la_, lo_): la_, lo_ = np.radians(la_), np.radians(lo_); return np.c_[np.cos(la_) * np.cos(lo_), np.cos(la_) * np.sin(lo_), np.sin(la_)]

# --- 1. les couches de Natural Earth, mises sur la grille ---
def couche(nom):
    r = shapefile.Reader(f'{D}/ne/{nom}/{nom}.shp', encoding='utf-8'); champs = [f[0] for f in r.fields[1:]]
    return [(shape(s.__geo_interface__), dict(zip(champs, x))) for s, x in zip(r.shapes(), r.records())]
def raster(formes, dtype='int16'):
    formes = [(g, v) for g, v in formes if g.intersects(CADRE)]
    return rasterize(formes, out_shape=(NY, NX), transform=T, fill=0, dtype=dtype) if formes else np.zeros((NY, NX), dtype)
z = np.load(f'{D}/etopo.npy'); wc = np.load(f'{D}/worldcover.npy')
terre = raster([(g, 1) for g, _ in couche('ne_10m_land')], 'uint8').astype(bool)
lacs_ne = raster([(g, 1) for g, _ in couche('ne_10m_lakes')], 'uint8').astype(bool)
PAYS = couche('ne_10m_admin_0_countries'); pays = raster([(g, i + 1) for i, (g, _) in enumerate(PAYS)])
REG = couche('ne_10m_admin_1_states_provinces'); reg = raster([(g, i + 1) for i, (g, _) in enumerate(REG)])
MARS = couche('ne_10m_geography_marine_polys'); ordre = sorted(range(len(MARS)), key=lambda i: -MARS[i][0].area)
mars = raster([(MARS[i][0], i + 1) for i in ordre])                      # (les petites mers par-dessus les grandes)
dire('Natural Earth sur la grille')

# --- 2. l'Europe : ses terres, ses lacs, ses zones humides, sa côte ; la mer ---
def iso_de(p):
    for k in ('ISO_A2_EH', 'ISO_A2'):
        if (p.get(k) or '-99') != '-99': return p[k]
    return 'CY' if 'Cyprus' in (p.get('ADMIN') or '') else ''         # (Chypre du Nord et la zone tampon : l'île de Chypre)
iso = np.array([''] + [iso_de(p) for _, p in PAYS])
euro = np.array([False] + [p.get('CONTINENT') == 'Europe' for _, p in PAYS])
nom_reg = np.array([''] + [p.get('name') or '' for _, p in REG])
eu = euro[pays] & (LON2 >= -25) & (LAT2 >= 34) & (LON2 <= 60)          # (ni les Açores, ni Madère, ni les Canaries, ni l'outre-mer)
eu |= (pays > 0) & (LON2 >= 32) & (LON2 <= 34.7) & (LAT2 >= 34.4) & (LAT2 <= 35.8)   # Chypre
nr = nom_reg[reg]
eu |= np.isin(nr, ['Edirne', 'Kirklareli', 'Tekirdag']) | ((nr == 'Istanbul') & (LON2 < 29.05)) | ((nr == 'Çanakkale') & (LAT2 >= 40.05) & (LON2 <= 26.75))   # la Thrace turque
del nr
mer = ~terre & ~lacs_ne
# l'eau que WorldCover voit au bord de la mer (estuaires, lagunes ouvertes, fjords que Natural Earth comble) est de la mer, pas un lac
eau = (wc == 80) & terre
pres = ndimage.binary_dilation(mer, iterations=10) & eau
mer_eau = ndimage.binary_propagation(ndimage.binary_dilation(mer, iterations=2) & eau, mask=pres)
mer |= mer_eau; terre &= ~mer_eau
lac = (lacs_ne & eu) | (terre & eu & (wc == 80))
humide = terre & eu & np.isin(wc, (90, 95)) & ~lac
sol = terre & eu & ~lac & ~humide                                    # les terres « sèches » d'Europe
bande = (sol | humide) & ndimage.binary_dilation(mer, structure=HUIT, iterations=R['cote_bande'])
europe = sol | lac | humide
del eau, pres, mer_eau
dire(f"Europe : {AIRE[europe].sum() / 1e6:.2f} M km² (dont lacs {AIRE[lac].sum() / 1e3:.0f} k, zones humides {AIRE[humide].sum() / 1e3:.0f} k)")

# --- 3. la cellule H3 de chaque pixel (de l'Europe ou de la mer) ; les terres et les mers d'un seul tenant ---
ii, jj = np.nonzero(europe | mer)
cel64 = np.fromiter((h3i.latlng_to_cell(a, b, RESH) for a, b in zip(lat[ii].tolist(), lon[jj].tolist())), np.uint64, len(ii))
CELLS, inv = np.unique(cel64, return_inverse=True)
cel = np.full((NY, NX), -1, np.int32); cel[ii, jj] = inv
NC = len(CELLS); HEX = [h3.int_to_str(int(c)) for c in CELLS]
del cel64, inv, ii, jj
masse, NM = ndimage.label(europe, structure=HUIT)                     # (les lacs relient leurs rives : une île de lac est de la terre ferme)
bassin, NB = ndimage.label(mer, structure=HUIT)
dire(f'H3 résolution {RESH} : {NC} cellules touchées ; {NM} terres et {NB} mers d’un seul tenant')

# --- 4. le climat de chaque pixel d'Europe : CRU TS 1991–2020 (0,5°), corrigé de l'altitude ---
C = np.load(f'{D}/cru.npz')
def remplir(x):            # les cases sans valeur (la mer) prennent celle de la case de terre la plus proche
    v = np.isfinite(x[0]); _, (a_, b_) = ndimage.distance_transform_edt(~v, return_indices=True); return x[:, a_, b_], (a_, b_)
tmp, (fa, fb) = remplir(C['tmp']); pre, _ = remplir(C['pre']); pet, _ = remplir(C['pet']); cld, _ = remplir(C['cld'])
nb_i, nb_j = tmp.shape[1:]
zt = np.where(terre, np.maximum(z, 0), np.nan)[:nb_i * 30, :nb_j * 30].reshape(nb_i, 30, nb_j, 30)
with np.errstate(all='ignore'): zcase = np.nan_to_num(np.nanmean(zt, axis=(1, 3)), nan=0.)[fa, fb]   # l'altitude moyenne des terres de chaque case
del zt
ei, ej = np.nonzero(europe); bi, bj = ei // 30, ej // 30; ae = AIRE[ei, ej]
zp = np.where(lac[ei, ej], zcase[bi, bj], np.maximum(z[ei, ej], 0))     # (un lac : l'altitude de sa case ; ETOPO y donne parfois le fond)
dz = R['gradient'] * (zcase[bi, bj] - zp)
tann = np.zeros(len(ei), np.float32); tchaud = np.full(len(ei), -99, np.float32); n10 = np.zeros(len(ei), np.int8)
for m in range(12):
    tm = tmp[m][bi, bj] + dz; tann += tm / 12; tchaud = np.maximum(tchaud, tm); n10 += tm >= 10
pann = pre[:, bi, bj].sum(0); etpann = (pet[:, bi, bj] * JOURS[:, None]).sum(0); ai = pann / np.maximum(etpann, 1)   # l'indice d'aridité P/ETP
sec = (pre[5:8, bi, bj].min(0) < 40) & (pre[5:8, bi, bj].min(0) < pre[[11, 0, 1]][:, bi, bj].max(0) / 3)   # un été sec (Köppen Cs)
dire('climat des pixels')

# --- 5. le type de chaque pixel de terre : la couverture du sol d'aujourd'hui (WorldCover 2021), le climat, l'altitude ---
m1, m2 = ndimage.uniform_filter(z.astype(np.float64), 7), ndimage.uniform_filter(z.astype(np.float64) ** 2, 7)
relief = np.sqrt(np.maximum(m2 - m1 ** 2, 0)).astype(np.float32); del m1, m2
def classer(w, zz, rel):
    # WorldCover : 10 arbres, 20 arbustes, 30 herbe, 40 cultures, 50 bâti, 60 sol nu, 70 neige et glace, 80 eau, 90 zone humide, 100 mousses
    t = np.full(w.shape, K['prairie'], np.int8)                     # les champs, les prés, le bâti : prairie
    t[np.isin(w, (0, 30, 50)) & (ai < .5)] = K['steppe']            # une prairie sèche est une steppe
    t[(w == 40) & (ai < .4)] = K['steppe']                          # des champs en climat semi-aride aussi
    x = w == 20                                                     # les arbustes : une steppe au sec, une lande (prairie) sinon, la taïga au froid
    t[x] = np.where(ai[x] < .5, K['steppe'], np.where(tann[x] < 4, K['taiga'], K['prairie']))
    x = w == 10                                                     # les arbres : la taïga au froid, la forêt sinon
    t[x] = np.where((tann[x] < 4) | (n10[x] <= 3), K['taiga'], K['foret'])
    t[np.isin(w, (10, 20, 30)) & sec & (tann >= R['maquis_t'])] = K['maquis']   # sous un été sec et chaud : maquis, garrigue, chênaies vertes
    x = w == 60                                                     # le sol nu : un désert froid très sec, une steppe sinon
    t[x] = np.where((ai[x] < .2) & (tann[x] < 12), K['desert-froid'], K['steppe'])
    t[(w == 100) | (tchaud < 10)] = K['toundra']                    # les mousses ; et sous 10 °C au mois le plus chaud, pas d'arbre
    t[w == 70] = K['banquise']                                      # la glace
    M, Mb, Mr = R['montagne']; S, Sb = R['sommets']
    t[(zz >= M) | ((zz >= Mb) & (rel >= Mr))] = K['montagne']
    t[(zz >= S) | ((zz >= Sb) & np.isin(w, (60, 70, 100)))] = K['sommets']
    return t
le_sol, le_lac, l_humide, la_bande = sol[ei, ej], lac[ei, ej], humide[ei, ej], bande[ei, ej]
w = wc[ei, ej].copy(); w[le_lac | l_humide] = 30                       # (un lac ou un marais rendu à la terre : le type d'une prairie de là)
typ = classer(w, zp, relief[ei, ej]); del w
dire('types des pixels : ' + ', '.join(f'{s} {np.count_nonzero(typ == K[s]) / len(typ):.1%}' for s in TERRE))

# --- 6. les groupes : dans chaque cellule, chaque terre d'un seul tenant de 300 km² au moins, chaque mer de 1 000 km² au moins ---
ce = cel[ei, ej]; mi, mj = np.nonzero(mer); cm = cel[mi, mj]; am = AIRE[mi, mj]; prof = -z[mi, mj]; profond = prof > R['abysses_prof']
ci_, cj_ = np.nonzero(europe & ndimage.binary_dilation(mer))
arbre_cote = cKDTree(xyz(lat[ci_], lon[cj_]))
centres = np.array([h3.cell_to_latlng(h) for h in HEX])
dist = 2 * 6371.0088 * np.arcsin(np.minimum(arbre_cote.query(xyz(centres[:, 0], centres[:, 1]))[0] / 2, 1))   # du centre de la cellule aux côtes d'Europe
GR = []                                                               # les groupes : (cellule, rang, 'terre' | 'mer' | 'ilots')
def grouper(cellule, morceau, poids_tri, aire_min, sorte):
    cle = cellule.astype(np.int64) * (int(morceau.max()) + 1) + morceau; u, inv_ = np.unique(cle, return_inverse=True)
    tri = np.bincount(inv_, weights=poids_tri); c_ = u // (int(morceau.max()) + 1); g = np.full(len(u), -1, np.int64)
    for c in np.unique(c_):
        k = np.flatnonzero(c_ == c); k = k[np.argsort(-tri[k], kind='stable')]; r = 0
        for x in k:
            if tri[x] >= aire_min(c): g[x] = len(GR); GR.append((int(c), r, sorte)); r += 1
    return g[inv_]
aire_cel = np.array([h3.cell_area(h, 'km^2') for h in HEX])
gp = grouper(ce, masse[ei, ej], ae * le_sol, lambda c: max(R['terre_min'], R['part_min'] * aire_cel[c]), 'terre')
marin = (dist <= R['mer_km']) & (centres[:, 1] <= R['mer_lon_max']) & (centres[:, 0] <= R['mer_lat_max'])
gm = grouper(cm, bassin[mi, mj], am, lambda c: max(R['mer_min'], R['part_min'] * aire_cel[c]) if marin[c] else np.inf, 'mer')
NGt = len(GR)
def par_groupe(g, masque, poids, sorte=None, n=None):
    k = masque & (g >= 0); n = n or len(GR)
    return np.bincount(g[k] * NS + (sorte[k] if sorte is not None else 0), weights=poids[k], minlength=n * NS).reshape(n, NS)
A_types = par_groupe(gp, le_sol, ae, typ); A_sol = A_types.sum(1)
A_lac, A_hum, A_bande = par_groupe(gp, le_lac, ae)[:, 0], par_groupe(gp, l_humide, ae)[:, 0], par_groupe(gp, la_bande, ae)[:, 0]
A_mer = par_groupe(gm, np.ones(len(gm), bool), am)[:, 0]; A_abysses = par_groupe(gm, profond, am)[:, 0]
O = np.load(f'{D}/oisst.npz'); sst = O['sst']; v = np.isfinite(sst[0]); _, (oa, ob) = ndimage.distance_transform_edt(~v, return_indices=True); sst = sst[:, oa, ob]
oi = np.clip(np.round((O['lat'][0] - lat[mi]) / .25).astype(int), 0, sst.shape[1] - 1); oj = np.clip(np.round((lon[mj] - O['lon'][0]) / .25).astype(int), 0, sst.shape[2] - 1)
SST_g = par_groupe(gm, np.ones(len(gm), bool), am * sst.mean(0)[oi, oj])[:, 0] / np.maximum(A_mer, 1e-9)
mer_de_cellule = {}
for g, (c, r, s) in enumerate(GR):
    if s == 'mer': mer_de_cellule.setdefault(c, []).append(g)

lieux = {}                                                            # (groupe, sorte) → n°
garde = {}                                                            # les types terrestres gardés de chaque groupe de terre
for g, (c, r, s) in enumerate(GR[:NGt]):
    if s == 'terre':
        tous = A_sol[g] + A_lac[g] + A_hum[g]; parts = A_types[g] / max(A_sol[g], 1e-9)
        L = [int(k) for k in np.argsort(-parts, kind='stable') if parts[k] >= R['part_type']][:R['types_max']] or [int(np.argmax(parts))]
        garde[g] = L
        for k in L: lieux[(g, k)] = None
        if A_lac[g] >= max(R['lac_min'], R['lac_part'] * tous): lieux[(g, K['lac'])] = None
        if A_hum[g] >= max(R['marais_min'], R['marais_part'] * tous): lieux[(g, K['marais'])] = None
        if A_bande[g] >= R['cote_min']: lieux[(g, K['cote'])] = None
    else:
        lieux[(g, K['mer-froide'] if SST_g[g] < R['mer_froide'] else K['large'])] = None
        if A_abysses[g] >= max(R['abysses_min'], R['abysses_part'] * A_mer[g]): lieux[(g, K['abysses'])] = None
# les îlots (une terre de moins de 300 km² dans la cellule) : la côte de la plus grande terre de la cellule qui en a une ; sinon, une côte à eux
ilot = (gp < 0) & la_bande.copy()
cible_ilots = {}
cel_ilots = np.unique(ce[(gp < 0)])
for c in cel_ilots.tolist():
    if not mer_de_cellule.get(c) and not (A_mer.size and False): pass
    gs = [g for g, (c2, r, s) in enumerate(GR[:NGt]) if c2 == c and s == 'terre' and (g, K['cote']) in lieux]
    if gs: cible_ilots[c] = gs[0]; continue
    aire_ilots = ae[(ce == c) & (gp < 0) & la_bande].sum()
    if aire_ilots > 0 and (mer_de_cellule.get(c) or np.any(cm == c)):
        g = len(GR); GR.append((c, sum(1 for x in GR if x[0] == c and x[2] != 'mer'), 'ilots')); lieux[(g, K['cote'])] = None; cible_ilots[c] = g
NG = len(GR); grp_ilot = np.array([cible_ilots.get(c, -1) for c in range(NC)])
gp_tout = np.where(gp >= 0, gp, grp_ilot[ce])                          # le groupe de chaque pixel d'Europe (les îlots : celui de leur côte)

# --- 7. les rivières : les grands fleuves de Natural Earth qui traversent un groupe ---
riv_pts, nl = [], 0                                                   # (groupe, i, j, n° du tronçon, n° du point sur le tronçon) ; km qu'il représente
EIDX = np.full((NY, NX), -1, np.int64); EIDX[ei, ej] = np.arange(len(ei))
for g_, p in couche('ne_10m_rivers_lake_centerlines'):
    if (p.get('scalerank') or 99) > R['riviere_rang'] or not g_.intersects(CADRE): continue
    for ligne in (g_.geoms if hasattr(g_, 'geoms') else [g_]):
        n = max(2, int(ligne.length / .01)); nl += 1
        P = np.array([ligne.interpolate(k / n, normalized=True).coords[0] for k in range(n + 1)])
        d = np.hypot(np.diff(P[:, 0]) * np.cos(np.radians(P[:-1, 1])), np.diff(P[:, 1])) * KM; d = (np.r_[0, d] + np.r_[d, 0]) / 2
        for k, ((x, y), dk) in enumerate(zip(P, d)):
            i, j = int((LAT1 - y) / RES), int((x - LON0) / RES)
            if 0 <= i < NY and 0 <= j < NX and EIDX[i, j] >= 0 and gp[EIDX[i, j]] >= 0: riv_pts.append((gp[EIDX[i, j]], i, j, nl, k, dk))
riv = np.array([x[:5] for x in riv_pts], np.int64).reshape(-1, 5); riv_km = np.array([x[5] for x in riv_pts])
long_riv = np.bincount(riv[:, 0], weights=riv_km, minlength=NG)
for g in garde:
    if long_riv[g] >= R['riviere_min']: lieux[(g, K['riviere'])] = None
del EIDX
# les numéros des lieux, et leurs identifiants : « type~h3 » ; une deuxième terre ou mer de la cellule : « type~h3-2 »
cles = sorted(lieux, key=lambda x: (HEX[GR[x[0]][0]], GR[x[0]][2] == 'mer', GR[x[0]][1], x[1]))
for n, k in enumerate(cles): lieux[k] = n
NL = len(cles); sorte_de = np.array([k[1] for k in cles]); grp_de = np.array([k[0] for k in cles]); cell_de = np.array([GR[k[0]][0] for k in cles])
dire(f'{NL} lieux dans {len(set(cell_de.tolist()))} cellules ({NG} groupes)')

# --- 8. chaque pixel à son lieu ---
TAB = np.full(NG * NS, -1, np.int64)
for (g, s), n in lieux.items(): TAB[g * NS + s] = n
def chercher(g, s): g = np.asarray(g); ok = g >= 0; out = np.full(g.shape, -1, np.int64); out[ok] = TAB[g[ok] * NS + (s if np.ndim(s) == 0 else np.asarray(s)[ok])]; return out
Le = np.full(len(ei), -1, np.int64)
def poser(masque, s):
    x = np.flatnonzero(masque & (Le < 0)); n = chercher(gp_tout[x], s if np.ndim(s) == 0 else s[x]); Le[x[n >= 0]] = n[n >= 0]
poser(la_bande, K['cote']); poser(le_lac & (gp >= 0), K['lac']); poser(l_humide & (gp >= 0), K['marais']); poser(gp >= 0, typ)
poser(gp < 0, K['cote'])                                               # (les îlots : tout à leur côte)
# une terre dont le type n'est pas gardé dans son groupe prend le lieu terrestre le plus proche du même groupe, sinon le plus grand
reste = (Le < 0) & (gp >= 0)
if reste.any():
    G = np.full((NY, NX), -1, np.int64); terr = (Le >= 0) & np.isin(sorte_de[np.maximum(Le, 0)], [K[s] for s in TERRE]); G[ei[terr], ej[terr]] = Le[terr]
    _, (pa, pb) = ndimage.distance_transform_edt(G < 0, return_indices=True)
    x = np.flatnonzero(reste); prop = G[pa[ei[x], ej[x]], pb[ei[x], ej[x]]]
    bon = (prop >= 0) & (grp_de[np.maximum(prop, 0)] == gp[x]); Le[x[bon]] = prop[bon]
    y = x[~bon]; Le[y] = chercher(gp[y], np.array([garde[g][0] for g in gp[y]], np.int64))
    del G, pa, pb
Lm = np.full(len(mi), -1, np.int64)
for s in ('large', 'mer-froide'): n = chercher(gm, K[s]); Lm[n >= 0] = n[n >= 0]
Lab = np.where(profond, chercher(gm, K['abysses']), -1)
# --- 8 bis. un lieu qui couvre moins de 2 % de sa cellule est fondu dans le type terrestre dominant de sa terre (ses pixels le rejoignent) ;
#     des abysses trop petites restent sous leur mer ; une côte d'îlots trop petite est laissée de côté. Les rivières, linéaires, restent.
aire_l = np.bincount(Le[Le >= 0], weights=ae[Le >= 0], minlength=NL) + np.bincount(Lm[Lm >= 0], weights=am[Lm >= 0], minlength=NL)
ab_ = sorte_de == K['abysses']; aire_l[ab_] = np.bincount(Lab[Lab >= 0], weights=am[Lab >= 0], minlength=NL)[ab_]
seuil = R['part_min'] * aire_cel[cell_de]; cible = np.arange(NL)
par_g = {}
for n, g in enumerate(grp_de): par_g.setdefault(int(g), []).append(n)
for g, Ls in par_g.items():
    terr = [n for n in Ls if SORTES[sorte_de[n]] in TERRE]; dom = max(terr, key=lambda n: aire_l[n]) if terr else -1
    for n in Ls:
        if sorte_de[n] == K['riviere'] or n == dom or aire_l[n] >= seuil[n]: continue
        cible[n] = -1 if GR[g][2] == 'mer' else dom
fondus = Counter(SORTES[sorte_de[n]] for n in range(NL) if cible[n] != n)
garder = cible == np.arange(NL); neuf = np.cumsum(garder) - 1
carte = np.where(cible >= 0, neuf[np.maximum(cible, 0)], -1); carte[~garder & (cible < 0)] = -1
def renum(x): y = np.full(x.shape, -1, np.int64); k = x >= 0; y[k] = carte[x[k]]; return y
Le, Lm = renum(Le), renum(Lm); Lab = np.where((Lab >= 0) & garder[np.maximum(Lab, 0)], renum(Lab), -1)
cles = [k for n, k in enumerate(cles) if garder[n]]; lieux = {k: n for n, k in enumerate(cles)}
NL = len(cles); sorte_de = np.array([k[1] for k in cles]); grp_de = np.array([k[0] for k in cles]); cell_de = np.array([GR[k[0]][0] for k in cles])
TAB = np.full(NG * NS, -1, np.int64)
for (g, s), n in lieux.items(): TAB[g * NS + s] = n
dire(f"lieux fondus (moins de {R['part_min']:.0%} de leur cellule) : {sum(fondus.values())} ({', '.join(f'{k} {v}' for k, v in fondus.most_common())}) ; il en reste {NL}")
L = np.full((NY, NX), -1, np.int32); L[ei, ej] = Le; L[mi, mj] = Lm
dire(f"pixels posés : {AIRE[ei[Le >= 0], ej[Le >= 0]].sum() / ae.sum():.2%} des terres d'Europe, {am[Lm >= 0].sum() / 1e6:.2f} M km² de mer")

# --- 9. ce que chaque lieu porte ---
def somme(idx, val, poids):
    k = idx >= 0; return np.bincount(idx[k], weights=(val[k] * poids[k]) if val is not None else poids[k], minlength=NL)
Wt, Wm, Wab = somme(Le, None, ae), somme(Lm, None, am), somme(Lab, None, am); W = Wt + Wm
SLAT = somme(Le, lat[ei], ae) + somme(Lm, lat[mi], am); SLON = somme(Le, lon[ej], ae) + somme(Lm, lon[mj], am)
SLAT_AB, SLON_AB = somme(Lab, lat[mi], am), somme(Lab, lon[mj], am)
zl = zp.astype(np.float64); SZ, SZ2 = somme(Le, zl, ae), somme(Le, zl ** 2, ae)
SARB = somme(Le, (wc[ei, ej] == 10).astype(float), ae)
SPROF, SPROF_AB = somme(Lm, prof.astype(float), am), somme(Lab, prof.astype(float), am)
Gp = np.load(f'{D}/gpcp.npz'); gpc = Gp['precip']; v = np.isfinite(gpc[0]); _, (ga, gb) = ndimage.distance_transform_edt(~v, return_indices=True); gpc = gpc[:, ga, gb]
gi = np.clip(np.round((Gp['lat'][0] - lat[mi]) / (Gp['lat'][0] - Gp['lat'][1])).astype(int), 0, gpc.shape[1] - 1)
gj = np.clip(np.round((lon[mj] - Gp['lon'][0]) / (Gp['lon'][1] - Gp['lon'][0])).astype(int), 0, gpc.shape[2] - 1)
mbi, mbj = np.clip(mi // 30, 0, nb_i - 1), np.clip(mj // 30, 0, nb_j - 1)
CT, CP, CE, CN, CT_ab = (np.zeros((NL, 12)) for _ in range(5))
for m in range(12):
    CT[:, m] = (somme(Le, tmp[m][bi, bj] + dz, ae) + somme(Lm, sst[m][oi, oj], am)) / np.maximum(W, 1e-9)
    CT_ab[:, m] = somme(Lab, sst[m][oi, oj], am) / np.maximum(Wab, 1e-9)
    CP[:, m] = (somme(Le, pre[m][bi, bj], ae) + somme(Lm, gpc[m][gi, gj] * JOURS[m], am)) / np.maximum(W, 1e-9)
    CE[:, m] = somme(Le, pet[m][bi, bj] * JOURS[m], ae) / np.maximum(Wt, 1e-9)
    CN[:, m] = (somme(Le, cld[m][bi, bj], ae) + somme(Lm, cld[m][mbi, mbj], am)) / np.maximum(W, 1e-9)
def dominant(idx, val, poids, nb):
    k = (idx >= 0) & (val > 0); M = np.bincount(idx[k] * nb + val[k], weights=poids[k], minlength=NL * nb).reshape(NL, nb)
    return np.where(M.max(1) > 0, M.argmax(1), 0)
pays_l = dominant(Le, pays[ei, ej].astype(np.int64), ae, len(PAYS) + 1)
reg_l = dominant(Le, reg[ei, ej].astype(np.int64), ae, len(REG) + 1)
mar_l = dominant(np.where(Lm >= 0, Lm, Lab), mars[mi, mj].astype(np.int64), am, len(MARS) + 1)
pi_, pj_ = np.nonzero(europe & (pays > 0) & (reg > 0)); arbre_eu = cKDTree(xyz(lat[pi_], lon[pj_]))
rl = chercher(riv[:, 0], K['riviere']) if len(riv) else np.zeros(0, np.int64)
R_z = np.maximum(z[riv[:, 1], riv[:, 2]], 0).astype(float)
dire('valeurs des lieux')

# --- 10. les voisins ---
voisins = [set() for _ in range(NL)]
TER = np.isin(sorte_de, [K[s] for s in TERRE]); SURF = np.isin(sorte_de, [K['large'], K['mer-froide']])
alt_l = np.where(Wt > 0, SZ / np.maximum(Wt, 1e-9), 0)
def lier(x, y):
    if x != y: voisins[x].add(y); voisins[y].add(x)
def permis(a_, b_):
    sa, sb = SORTES[sorte_de[a_]], SORTES[sorte_de[b_]]
    ta, tb = sa in TERRE, sb in TERRE; ma, mb = sa in ('large', 'mer-froide'), sb in ('large', 'mer-froide'); da, db_ = sa in ('lac', 'marais'), sb in ('lac', 'marais')
    if ta and tb: return grp_de[a_] == grp_de[b_] or abs(alt_l[a_] - alt_l[b_]) <= R['coupure_alt']   # (une crête et une plaine voisines ne se touchent pas)
    if ma or mb: return (ma and mb) or 'cote' in (sa, sb)               # la mer ne touche que la mer et la côte
    return (ta or da or sa == 'cote') and (tb or db_ or sb == 'cote')  # terre, eaux douces et côte se touchent
def paires(X, N):                                                     # ce qui se touche, pixel contre pixel (8 voisins), dans les deux sens
    P = []
    for A_, B_ in ((X[:, :-1], X[:, 1:]), (X[:-1, :], X[1:, :]), (X[:-1, :-1], X[1:, 1:]), (X[:-1, 1:], X[1:, :-1])):
        k = (A_ >= 0) & (B_ >= 0) & (A_ != B_)
        if k.any(): a_, b_ = A_[k].astype(np.int64), B_[k].astype(np.int64); P += [np.unique(a_ * N + b_), np.unique(b_ * N + a_)]
    U = np.unique(np.concatenate(P)) if P else np.zeros(0, np.int64)
    return list(zip((U // N).tolist(), (U % N).tolist()))
for x_, y_ in paires(L, NL):
    if permis(x_, y_): lier(x_, y_)
AB = np.full((NY, NX), -1, np.int32); AB[mi[Lab >= 0], mj[Lab >= 0]] = Lab[Lab >= 0]
for x_, y_ in paires(AB, NL): lier(x_, y_)
del AB
par_grp = {}
for n, g in enumerate(grp_de): par_grp.setdefault(int(g), []).append(n)
for g, Ls in par_grp.items():
    t_ = [n for n in Ls if TER[n]]; e_ = [n for n in Ls if SORTES[sorte_de[n]] in EAUX]
    douces = [n for n in e_ if sorte_de[n] != K['cote']]; cotes = [n for n in e_ if sorte_de[n] == K['cote']]
    for x_ in t_:
        for y_ in t_ + e_: lier(x_, y_)                                # dans un groupe : les terres entre elles, et leurs eaux douces et leur côte
    for x_ in douces:
        for y_ in douces: lier(x_, y_)                                 # lac, rivière et marais communiquent
        if sorte_de[x_] == K['riviere']:
            for y_ in cotes: lier(x_, y_)                              # la rivière gagne la côte
    if GR[g][2] == 'mer':
        for x_ in Ls:
            for y_ in Ls: lier(x_, y_)                                 # les abysses sous leur mer
# une côte qui ne touche aucune mer : la mer de sa cellule, sinon celle des cellules voisines dont l'eau touche la sienne
Mc = np.full((NY, NX), -1, np.int32); Mc[mi, mj] = cm
mer_vois = {}
for a_, b_ in paires(Mc, NC): mer_vois.setdefault(a_, set()).add(b_)
del Mc
surf_de_cel = {}
for n in np.flatnonzero(SURF): surf_de_cel.setdefault(int(cell_de[n]), []).append(int(n))
for n in np.flatnonzero(sorte_de == K['cote']):
    if any(SURF[y] for y in voisins[n]): continue
    cands = surf_de_cel.get(int(cell_de[n])) or [y for b_ in mer_vois.get(int(cell_de[n]), ()) for y in surf_de_cel.get(b_, [])]
    for y_ in cands: lier(int(n), y_)
# les rivières : d'un groupe au suivant, le long du fleuve (vers sa rivière, sinon son lac)
if len(riv):
    r_ = riv[np.lexsort((riv[:, 4], riv[:, 3]))]
    for k in range(1, len(r_)):
        if r_[k, 3] != r_[k - 1, 3] or r_[k, 0] == r_[k - 1, 0] or r_[k, 4] - r_[k - 1, 4] > 3: continue
        a_ = TAB[r_[k - 1, 0] * NS + K['riviere']]; b_ = TAB[r_[k, 0] * NS + K['riviere']]
        if a_ < 0: a_ = TAB[r_[k - 1, 0] * NS + K['lac']]
        if b_ < 0: b_ = TAB[r_[k, 0] * NS + K['lac']]
        if a_ >= 0 and b_ >= 0: lier(int(a_), int(b_))
dire(f"voisins : {sum(len(v) for v in voisins) // 2} liens")

# --- 11. les noms, les fuseaux, et le fichier ---
ZT = zones()
RUSSIE = {'Kaliningrad': 'Europe/Kaliningrad', 'Samara': 'Europe/Samara', 'Udmurt': 'Europe/Samara', 'Saratov': 'Europe/Saratov', "Ul'yanovsk": 'Europe/Ulyanovsk',
          "Astrakhan'": 'Europe/Astrakhan', 'Volgograd': 'Europe/Volgograd', 'Kirov': 'Europe/Kirov', 'Bashkortostan': 'Asia/Yekaterinburg', "Perm'": 'Asia/Yekaterinburg',
          'Orenburg': 'Asia/Yekaterinburg', 'Sverdlovsk': 'Asia/Yekaterinburg', 'Chelyabinsk': 'Asia/Yekaterinburg', 'Kurgan': 'Asia/Yekaterinburg',
          'Crimea': 'Europe/Simferopol', 'Sevastopol': 'Europe/Simferopol'}
def fuseau(iso2, region, la_, lo_):
    if region in RUSSIE: return RUSSIE[region]
    if iso2 == 'RU': return 'Europe/Moscow'
    if iso2 == 'UA': return 'Europe/Kyiv'
    if iso2 == 'NO' and la_ > 74: return 'Arctic/Longyearbyen'           # (le Svalbard)
    if iso2 == 'CY': return 'Asia/Famagusta' if lo_ > 33.4 and la_ > 35.1 else 'Asia/Nicosia'
    if iso2 == 'XK': return 'Europe/Belgrade'
    return (ZT.get(iso2) or ['Europe/London'])[0]                       # (le fuseau principal du pays : le premier de zone.tab)
REGION_PAR = {'FR', 'ES', 'IT', 'GB', 'PT'}                              # (ces pays-là : la région, plutôt que le département ou la province)
PREFIXES = ('voïvodie de ', "voïvodie d'", 'voïvodie des ', 'voblast de ', "voblast d'", 'oblast de ', "oblast d'", 'kraï de ', "d'", 'de ')
def nom_region(k):
    if k <= 0: return ''
    p = REG[k - 1][1]
    if (p.get('iso_a2') or '') in REGION_PAR and p.get('region'): return p['region']
    x = p.get('name_fr') or p.get('name') or ''
    for q in PREFIXES:
        if x.startswith(q): x = x[len(q):]; break
    return x[:1].upper() + x[1:]
def nom_mer(k):
    if k <= 0: return ''
    p = MARS[k - 1][1]; return p.get('name_fr') or p.get('name') or ''
r1 = lambda x: round(float(x), 1)
MOIS_J = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349]
def rayonnement(la_, nn):
    # le rayonnement hors atmosphère (FAO-56) à cette latitude, réduit par la nébulosité (Ångström : Rs = (0,25 + 0,5 n/N) Ra, n/N ≈ 1 − nébulosité)
    out = []
    for m, J in enumerate(MOIS_J):
        phi, dl = math.radians(la_), .409 * math.sin(2 * math.pi * J / 365 - 1.39); dr = 1 + .033 * math.cos(2 * math.pi * J / 365)
        ws = math.acos(max(-1, min(1, -math.tan(phi) * math.tan(dl))))
        Ra = 24 * 60 / math.pi * .0820 * dr * (ws * math.sin(phi) * math.sin(dl) + math.cos(phi) * math.cos(dl) * math.sin(ws))
        out.append(max(Ra, 0) * (.25 + .5 * (1 - nn[m] / 100)))
    return out
out, noms = [], {}
for n, (g, s) in enumerate(cles):
    S_ = SORTES[s]; c, rang, sorte_g = GR[g]; mer_ = S_ in MERS
    if S_ == 'riviere':
        k = rl == n; la_, lo_ = lat[riv[k, 1]].mean(), lon[riv[k, 2]].mean(); alt = R_z[k].mean(); rel = R_z[k].std(); surf = riv_km[k].sum() * R['riviere_largeur']
        bi_, bj_ = riv[k, 1] // 30, riv[k, 2] // 30; dzr = (R['gradient'] * (zcase[bi_, bj_] - R_z[k])).mean()
        t_ = [tmp[m][bi_, bj_].mean() + dzr for m in range(12)]; p_ = [pre[m][bi_, bj_].mean() for m in range(12)]
        e_ = [pet[m][bi_, bj_].mean() * JOURS[m] for m in range(12)]; nn = [cld[m][bi_, bj_].mean() for m in range(12)]
        arb = float(np.mean(wc[riv[k, 1], riv[k, 2]] == 10)); pk = np.bincount(pays[riv[k, 1], riv[k, 2]]).argmax(); rk = np.bincount(reg[riv[k, 1], riv[k, 2]]).argmax()
    elif S_ == 'abysses':
        la_, lo_ = SLAT_AB[n] / Wab[n], SLON_AB[n] / Wab[n]; surf = Wab[n]; alt = rel = arb = 0.; t_, p_, e_, nn = CT_ab[n], CP[TAB[g * NS + K['large']] if TAB[g * NS + K['large']] >= 0 else TAB[g * NS + K['mer-froide']]], None, CN[TAB[g * NS + K['large']] if TAB[g * NS + K['large']] >= 0 else TAB[g * NS + K['mer-froide']]]
        pk = rk = 0
    else:
        la_, lo_ = SLAT[n] / W[n], SLON[n] / W[n]; surf = W[n]
        alt = SZ[n] / Wt[n] if Wt[n] > 0 else 0.; rel = math.sqrt(max(SZ2[n] / Wt[n] - alt ** 2, 0)) if Wt[n] > 0 else 0.
        t_, p_, e_, nn = CT[n], CP[n], CE[n], CN[n]; arb = SARB[n] / Wt[n] if Wt[n] > 0 else 0.
        pk, rk = pays_l[n], reg_l[n]
    if pk == 0 or rk == 0:                                              # (la mer : la terre d'Europe la plus proche)
        q = arbre_eu.query(xyz(np.array([la_]), np.array([lo_])))[1][0]; pk = pk or pays[pi_[q], pj_[q]]; rk = rk or reg[pi_[q], pj_[q]]
    iso2 = iso[pk]; region = nom_region(rk); reg_brut = REG[rk - 1][1].get('name', '') if rk > 0 else ''
    h = HEX[c]
    lieu = {'lat': round(float(la_), 3), 'lon': round(float(lo_), 3), 'h3': h, 'pays': iso2, 'region': region, 'fuseau': fuseau(iso2, reg_brut, la_, lo_),
            'altitude_m': 0 if mer_ else round(alt), 'relief_m': None if mer_ else round(rel), 'surface_km2': round(float(surf), 1),
            'couvert_arbre': 0. if mer_ else round(float(arb), 3)}
    if mer_: lieu['profondeur_m'] = round(SPROF_AB[n] / Wab[n] if S_ == 'abysses' else SPROF[n] / max(Wm[n], 1e-9))
    climat = {'t': [r1(x) for x in t_], 'p': [r1(x) for x in p_], 'etp': None if e_ is None or mer_ else [r1(x) for x in e_], 'rad': [r1(x) for x in rayonnement(la_, nn)], 'npp': None}
    nm_ = nom_mer(mar_l[n]) if mer_ else ''
    titre = f"{BIOMES[S_]['nom']} — {nm_ + ', ' if nm_ else 'au large de '}{region} ({iso2})" if mer_ else f"{BIOMES[S_]['nom']} — {region} ({iso2})"
    noms.setdefault(titre, []).append(n)
    out.append({'id': f"{S_}~{h.rstrip('f')}" + (f'-{rang + 1}' if rang else ''), 'nom': titre, 'type': S_, 'milieu': BIOMES[S_]['milieu'], 'voisins': None, 'lieu': lieu, 'climat': climat})
for titre, L_ in noms.items():                                        # (deux lieux du même nom : numérotés du nord au sud)
    if len(L_) > 1:
        for k, n in enumerate(sorted(L_, key=lambda n: (-out[n]['lieu']['lat'], out[n]['lieu']['lon']))): out[n]['nom'] = f'{titre} {k + 1}'
for n in range(NL): out[n]['voisins'] = sorted(out[y]['id'] for y in voisins[n])
assert len({l['id'] for l in out}) == NL, 'identifiants en double'

os.makedirs(os.path.dirname(A.sortie), exist_ok=True)
tete = {'resolution': RESH, 'grille': 'H3', 'genere': datetime.date.today().isoformat(), 'normales': '1991–2020', 'sources': 'sources.json',
        'unites': {'t': '°C (la mer et les abysses : température de surface)', 'p': 'mm/mois', 'etp': 'mm/mois', 'rad': 'MJ/m²/jour', 'npp': 'g/m²/an (vide : à calculer)',
                   'altitude_m': 'm', 'relief_m': 'm (écart-type)', 'surface_km2': 'km²', 'profondeur_m': 'm', 'couvert_arbre': 'part (0–1)'},
        'regles': R}
with open(A.sortie, 'w', encoding='utf-8') as f:
    f.write(json.dumps(tete, ensure_ascii=False)[:-1] + ', "lieux": [\n' + ',\n'.join(json.dumps(l, ensure_ascii=False) for l in out) + '\n]}\n')
with open(A.sources, 'w', encoding='utf-8') as f:
    json.dump({'lieux': os.path.basename(A.sortie), 'outil': 'outils/terre/ (LISEZ-MOI.md)', 'sources': SOURCES}, f, ensure_ascii=False, indent=1); f.write('\n')
cnt = Counter(l['type'] for l in out); seuls = [l['id'] for l in out if not l['voisins']]
dire(f"{A.sortie} : {os.path.getsize(A.sortie) / 1e6:.2f} Mo, {NL} lieux, {len(set(cell_de.tolist()))} cellules")
print('  par type : ' + ', '.join(f'{s} {cnt[s]}' for s in SORTES if cnt[s]))
print(f"  surfaces : terres {sum(l['lieu']['surface_km2'] for l in out if l['type'] in TERRE + ['cote', 'lac', 'marais']) / 1e6:.2f} M km², mers {sum(l['lieu']['surface_km2'] for l in out if l['type'] in ('large', 'mer-froide')) / 1e6:.2f} M km²")
print(f"  lieux sans voisin : {len(seuls)} {seuls[:10]}")
