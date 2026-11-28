# Orvane — la Terre réelle : ce que partagent telecharger.py et fabriquer.py (outils/terre/LISEZ-MOI.md)
# La grille de travail, les adresses des données et leurs licences. Import hors ligne : le moteur ne lit que lieux.json.
import os, ssl, urllib.request

# --- la grille de travail : celle d'ETOPO 2022 à 1 minute d'arc (1/60°), nord en haut ---
# Elle couvre l'Europe et les mers à 400 km de ses côtes : de 40° O à 62° E, de 30° N à 84° N.
RES = 1 / 60
LON0, LON1, LAT0, LAT1 = -40.0, 62.0, 30.0, 84.0
NX, NY = round((LON1 - LON0) / RES), round((LAT1 - LAT0) / RES)   # 6120 × 3240

def lon_col(j): return LON0 + (j + .5) * RES      # centre de la colonne j
def lat_lig(i): return LAT1 - (i + .5) * RES      # centre de la ligne i (0 : au nord)

# --- les données ---
NE = 'https://naciscdn.org/naturalearth/10m/'
NE_COUCHES = ['physical/ne_10m_land', 'physical/ne_10m_lakes', 'physical/ne_10m_rivers_lake_centerlines',
              'physical/ne_10m_geography_marine_polys', 'cultural/ne_10m_admin_0_countries', 'cultural/ne_10m_admin_1_states_provinces']
ETOPO_DAP = 'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
ETOPO_HTTP = 'https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
WORLDCOVER = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tuile}_Map.tif'
WORLDCOVER_NIVEAU = 4          # l'aperçu au 1/32 des tuiles (~300 m) : de quoi tirer la classe de chaque pixel de la grille
CRU = 'https://crudata.uea.ac.uk/cru/data/hrg/cru_ts_4.09/cruts.2503051245.v4.09/{v}/cru_ts4.09.{a}.{b}.{v}.dat.nc.gz'
CRU_VARIABLES = ['tmp', 'pre', 'pet', 'cld']
CRU_DECENNIES = [(1991, 2000), (2001, 2010), (2011, 2020)]   # les normales 1991–2020
OISST = 'https://downloads.psl.noaa.gov/Datasets/noaa.oisst.v2.highres/sst.mon.ltm.1991-2020.nc'
GPCP = 'https://downloads.psl.noaa.gov/Datasets/gpcp/precip.mon.ltm.1991-2020.nc'
ZONES = '/usr/share/zoneinfo/zone.tab'   # la base tz (IANA), domaine public ; à défaut, celle du paquet Python tzdata

def zones():
    """zone.tab : pour chaque pays (ISO-2), ses fuseaux, le principal d'abord."""
    try: texte = open(ZONES, encoding='utf-8').read()
    except OSError:
        import importlib.resources
        texte = (importlib.resources.files('tzdata') / 'zoneinfo' / 'zone.tab').read_text(encoding='utf-8')
    Z = {}
    for l in texte.splitlines():
        if l.startswith('#') or not l.strip(): continue
        c, _, tz = l.split('\t')[:3]; Z.setdefault(c, []).append(tz)
    return Z

# Ce que lieux.json doit à chacun (écrit dans mondes/europe/sources.json par fabriquer.py)
SOURCES = [
  {'nom': 'Natural Earth 1:10m (v5.1.1) : terres, lacs, fleuves, mers nommées, pays, régions (admin-1)', 'url': 'https://www.naturalearthdata.com/',
   'licence': 'domaine public', 'usage': "le trait de côte (terre/mer), les lacs, les grands fleuves (rang ≤ 6), le pays et la région de chaque lieu, le nom des mers"},
  {'nom': 'ETOPO 2022, 60 secondes d’arc, élévation de surface (NOAA NCEI)', 'url': 'https://www.ncei.noaa.gov/products/etopo-global-relief-model',
   'licence': 'domaine public (œuvre du gouvernement des États-Unis)', 'usage': "l'altitude, le relief (écart-type), la profondeur de la mer, les montagnes et les sommets, les abysses (> 1 000 m)"},
  {'nom': 'ESA WorldCover 10 m 2021 v200', 'url': 'https://esa-worldcover.org/', 'licence': 'CC BY 4.0 (© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium)',
   'usage': "la couverture du sol d'aujourd'hui (arbres, arbustes, prairies, cultures, bâti, sol nu, neige, eau, zones humides, mousses) : le type de chaque lieu terrestre, les lacs, les marais, la part couverte d'arbres"},
  {'nom': 'CRU TS 4.09 (Climatic Research Unit, University of East Anglia), 0,5°, mensuel', 'url': 'https://crudata.uea.ac.uk/cru/data/hrg/cru_ts_4.09/',
   'licence': 'Open Government Licence v3 (Harris et al. 2020, Scientific Data 7:109)', 'usage': "les normales mensuelles 1991–2020 des terres : température (corrigée de l'altitude), précipitations, évapotranspiration potentielle (Penman-Monteith), nébulosité (pour le rayonnement)"},
  {'nom': 'NOAA OISST v2.1, moyenne mensuelle 1991–2020, 0,25° (NOAA PSL)', 'url': 'https://psl.noaa.gov/data/gridded/data.noaa.oisst.v2.highres.html',
   'licence': 'domaine public (NOAA ; citation demandée)', 'usage': 'la température de surface de la mer, mois par mois (lieux marins) ; large ou mer froide'},
  {'nom': 'GPCP v2.3, moyenne mensuelle 1991–2020, 2,5° (NOAA PSL)', 'url': 'https://psl.noaa.gov/data/gridded/data.gpcp.html',
   'licence': 'domaine public (NOAA ; citation demandée)', 'usage': 'les précipitations sur la mer'},
  {'nom': 'Base de données des fuseaux horaires (tz, IANA), zone.tab', 'url': 'https://www.iana.org/time-zones', 'licence': 'domaine public',
   'usage': 'le fuseau de chaque lieu : parmi les fuseaux de son pays, celui dont le point de référence est le plus proche'},
  {'nom': 'H3 (Uber), bibliothèque de grille hexagonale', 'url': 'https://h3geo.org/', 'licence': 'Apache 2.0 (logiciel)', 'usage': 'les cellules et leurs voisines'},
]

def contexte_ssl():
    """Le certificat d'un mandataire (proxy) qui intercepte HTTPS, s'il est dit par SSL_CERT_FILE ou CURL_CA_BUNDLE."""
    ca = os.environ.get('SSL_CERT_FILE') or os.environ.get('CURL_CA_BUNDLE')
    return ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()

def telecharger(url, chemin, essais=3):
    """Télécharge url dans chemin (en passant par un .part), sauf s'il est déjà là."""
    if os.path.exists(chemin) and os.path.getsize(chemin) > 0: return chemin
    os.makedirs(os.path.dirname(chemin) or '.', exist_ok=True)
    for k in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'orvane-terre/1'}), context=contexte_ssl(), timeout=300) as r, open(chemin + '.part', 'wb') as f:
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    f.write(b)
            os.replace(chemin + '.part', chemin); return chemin
        except Exception as e:
            if k == essais - 1: raise
            print(f'  nouvel essai ({e})')
