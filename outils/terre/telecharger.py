#!/usr/bin/env python3
# Orvane — la Terre réelle : TÉLÉCHARGER les données brutes (outils/terre/LISEZ-MOI.md)
#   python3 outils/terre/telecharger.py --donnees <dossier hors du dépôt>
# Ce qui est déjà là n'est pas refait. Les gros fichiers intermédiaires (CRU, OISST) sont effacés une fois réduits à l'Europe :
# le dossier pèse environ 200 Mo à la fin (environ 600 Mo au plus fort).
import argparse, gzip, os, shutil, sys, time, zipfile
from concurrent.futures import ThreadPoolExecutor
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *

a = argparse.ArgumentParser(description='télécharge les données de la Terre réelle (Europe)')
a.add_argument('--donnees', required=True, help='le dossier des données brutes (hors du dépôt)')
a.add_argument('--fils', type=int, default=8, help='téléchargements WorldCover en parallèle')
A = a.parse_args()
D = os.path.abspath(A.donnees); os.makedirs(D, exist_ok=True)
t0 = time.time()
def dire(m): print(f'[{time.time() - t0:6.0f} s] {m}', flush=True)

# 1. Natural Earth
for c in NE_COUCHES:
    nom = os.path.basename(c); dossier = f'{D}/ne/{nom}'
    if os.path.exists(f'{dossier}/{nom}.shp'): continue
    z = telecharger(NE + c + '.zip', f'{D}/ne/{nom}.zip')
    with zipfile.ZipFile(z) as f: f.extractall(dossier)
    os.remove(z); dire(f'Natural Earth : {nom}')

# 2. ETOPO 2022 : l'Europe seule, par OPeNDAP (80 Mo) ; à défaut, le fichier entier (480 Mo), réduit puis effacé
if not os.path.exists(f'{D}/etopo.npy'):
    import netCDF4
    i0, i1 = round((LAT0 + 90) * 60), round((LAT1 + 90) * 60)          # les lignes d'ETOPO (du sud au nord)
    j0, j1 = round((LON0 + 180) * 60), round((LON1 + 180) * 60)
    ca = os.environ.get('CURL_CA_BUNDLE') or os.environ.get('SSL_CERT_FILE')
    z = None
    try:
        ici = os.getcwd(); os.chdir(D)
        if ca: open('.ncrc', 'w').write(f'HTTP.SSL.CAINFO={ca}\n')       # (netCDF-C lit son certificat dans .ncrc)
        d = netCDF4.Dataset(ETOPO_DAP); z = np.empty((i1 - i0, j1 - j0), np.float32)
        for k in range(i0, i1, 540): z[k - i0:min(k + 540, i1) - i0] = d['z'][k:min(k + 540, i1), j0:j1]
        d.close()
    except Exception as e:
        dire(f'ETOPO par OPeNDAP impossible ({e}) : le fichier entier'); z = None
    finally:
        os.chdir(ici)
    if z is None:
        f = telecharger(ETOPO_HTTP, f'{D}/etopo-global.nc')
        with netCDF4.Dataset(f) as d: z = np.asarray(d['z'][i0:i1, j0:j1], np.float32)
        os.remove(f)
    np.save(f'{D}/etopo.npy', z[::-1].copy())                           # nord en haut, comme la grille
    dire(f'ETOPO 2022 : {z.shape}, de {z.min():.0f} à {z.max():.0f} m')

# 3. ESA WorldCover 2021 : la classe de chaque pixel de la grille, tirée de l'aperçu au 1/32 de chaque tuile de 3° qui a de la terre
if not os.path.exists(f'{D}/worldcover.npy'):
    import rasterio, shapefile
    from rasterio.features import rasterize
    from shapely.geometry import shape
    from affine import Affine
    T = Affine(RES, 0, LON0, 0, -RES, LAT1)
    terre = rasterize(((shape(s.__geo_interface__), 1) for s in shapefile.Reader(f'{D}/ne/ne_10m_land/ne_10m_land.shp').shapes()),
                      out_shape=(NY, NX), transform=T, dtype='uint8', all_touched=True)
    tuiles = []
    for la in range(33, 82, 3):
        for lo in range(-27, 60, 3):
            i0, j0 = round((LAT1 - la - 3) * 60), round((lo - LON0) * 60)
            if terre[max(i0, 0):max(i0 + 180, 0), max(j0, 0):j0 + 180].any(): tuiles.append((la, lo))
    wc = np.zeros((NY, NX), np.uint8)
    def lire(t):
        la, lo = t; nom = f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"
        for k in range(3):
            try:
                with rasterio.open('/vsicurl/' + WORLDCOVER.format(tuile=nom), overview_level=WORLDCOVER_NIVEAU) as r:
                    return t, r.read(1), r.transform
            except rasterio.errors.RasterioIOError as e:
                if 'does not exist' in str(e) or '404' in str(e): return t, None, None    # (une tuile de mer : pas de fichier)
                time.sleep(2)
        return t, None, None
    n = 0
    with ThreadPoolExecutor(A.fils) as ex:
        for (la, lo), img, tr in ex.map(lire, tuiles):
            n += 1
            if img is None: continue
            # chaque pixel de la grille prend la classe du pixel de l'aperçu sous son centre
            i0, j0 = round((LAT1 - la - 3) * 60), round((lo - LON0) * 60)
            I = np.arange(max(i0, 0), min(i0 + 180, NY)); J = np.arange(max(j0, 0), min(j0 + 180, NX))
            if not len(I) or not len(J): continue
            lat = LAT1 - (I + .5) * RES; lon = LON0 + (J + .5) * RES
            r = np.clip(((tr.f - lat) / -tr.e).astype(int), 0, img.shape[0] - 1); c = np.clip(((lon - tr.c) / tr.a).astype(int), 0, img.shape[1] - 1)
            wc[np.ix_(I, J)] = img[np.ix_(r, c)]
            if n % 25 == 0: dire(f'WorldCover : {n}/{len(tuiles)} tuiles')
    np.save(f'{D}/worldcover.npy', wc)
    dire(f'WorldCover : {len(tuiles)} tuiles lues, {np.count_nonzero(wc)} pixels classés')

# 4. CRU TS 4.09 : les normales mensuelles 1991–2020 (température, précipitations, ETP, nébulosité), réduites à la grille de 0,5°
if not os.path.exists(f'{D}/cru.npz'):
    import netCDF4
    out = {}
    for v in CRU_VARIABLES:
        S = C = None
        for (a0, a1) in CRU_DECENNIES:
            gz = telecharger(CRU.format(v=v, a=a0, b=a1), f'{D}/cru/{v}.{a0}.nc.gz'); nc = gz[:-3]
            with gzip.open(gz) as f, open(nc, 'wb') as g: shutil.copyfileobj(f, g, 1 << 20)
            os.remove(gz)
            with netCDF4.Dataset(nc) as d:
                la, lo = d['lat'][:], d['lon'][:]; I = np.where((la > LAT0) & (la < LAT1))[0]; J = np.where((lo > LON0) & (lo < LON1))[0]
                x = d[v][:, I[0]:I[-1] + 1, J[0]:J[-1] + 1]; m = np.ma.getmaskarray(x); x = np.ma.filled(x, 0).astype(np.float64)
                x[np.abs(x) > 1e30] = 0; m |= ~np.isfinite(x)
                if S is None: S = np.zeros((12,) + x.shape[1:]); C = np.zeros_like(S); out['lat'] = np.asarray(la[I]); out['lon'] = np.asarray(lo[J])
                for k in range(12): S[k] += np.where(m[k::12], 0, x[k::12]).sum(0); C[k] += (~m[k::12]).sum(0)
            os.remove(nc); dire(f'CRU TS : {v} {a0}–{a1}')
        out[v] = np.where(C > 0, S / np.maximum(C, 1), np.nan).astype(np.float32)
    out['lat'] = out['lat'][::-1].copy()
    for v in CRU_VARIABLES: out[v] = out[v][:, ::-1].copy()                   # nord en haut
    np.savez_compressed(f'{D}/cru.npz', **out)
    os.rmdir(f'{D}/cru') if os.path.isdir(f'{D}/cru') and not os.listdir(f'{D}/cru') else None

# 5. NOAA OISST : la température de surface de la mer, moyenne mensuelle 1991–2020
if not os.path.exists(f'{D}/oisst.npz'):
    import netCDF4
    f = telecharger(OISST, f'{D}/oisst.nc')
    with netCDF4.Dataset(f) as d:
        la, lo = d['lat'][:], d['lon'][:]; lo = np.where(lo > 180, lo - 360, lo)
        I = np.where((la > LAT0 - 1) & (la < LAT1 + 1))[0]; J = np.where((lo > LON0 - 1) & (lo < LON1 + 1))[0]; J = J[np.argsort(lo[J])]
        x = d['sst'][:, I[0]:I[-1] + 1, :][:, :, J]; x = np.ma.filled(x.astype(np.float32), np.nan); x[np.abs(x) > 100] = np.nan
        np.savez_compressed(f'{D}/oisst.npz', sst=x[:, ::-1], lat=np.asarray(la[I])[::-1], lon=np.asarray(lo[J]))
    os.remove(f); dire('OISST : fait')

# 6. GPCP : les précipitations (sur la mer), moyenne mensuelle 1991–2020
if not os.path.exists(f'{D}/gpcp.npz'):
    import netCDF4
    f = telecharger(GPCP, f'{D}/gpcp.nc')
    with netCDF4.Dataset(f) as d:
        lo = d['lon'][:]; lo = np.where(lo > 180, lo - 360, lo); o = np.argsort(lo)
        x = np.ma.filled(d['precip'][:].astype(np.float32), np.nan)[:, :, o]
        np.savez_compressed(f'{D}/gpcp.npz', precip=x, lat=np.asarray(d['lat'][:]), lon=np.asarray(lo[o]))   # mm/jour
    os.remove(f); dire('GPCP : fait')

tot = sum(os.path.getsize(os.path.join(r, f)) for r, _, F in os.walk(D) for f in F)
dire(f'tout est là : {tot / 1e6:.0f} Mo dans {D}')
