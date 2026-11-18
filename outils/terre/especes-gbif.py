# Orvane — LES ESPÈCES D'EUROPE, CÔTÉ GBIF ET WIKIDATA (outils/terre/especes-gbif.py)
# Trois choses, gardées en cache dans le dossier des données brutes (jamais dans le dépôt) :
#  1. la correspondance de chaque nom scientifique du catalogue (especes-catalogue.py) avec l'épine dorsale taxonomique de GBIF
#     (GBIF Backbone Taxonomy, CC-BY 4.0) : sa clé, sa classe, son ordre, sa famille ;
#  2. son élément Wikidata (CC0) par la propriété P846 (la clé GBIF) : son identifiant, son nom français, et pour un champignon sa
#     comestibilité (P789) ;
#  3. sa présence en Europe par cellule H3 de résolution 2 : le nombre d'observations GBIF depuis 2000, sous licence CC0 ou CC-BY
#     seulement (jamais CC-BY-NC), sans problème géographique signalé, ni fossiles ni bêtes de zoo. Une requête par cellule et par
#     paquet de cent espèces, avec une facette par espèce (l'API de recherche le permet : quelques centaines de requêtes en tout).
# Les cellules : celles de mondes/europe/lieux.json s'il existe (les lieux s'appellent `${type}~${h3 sans les f de fin}`), sinon
# celles dont le centre tombe dans le cadre de l'Europe (25° O – 45° E, 34° N – 72° N).
#   python3 outils/terre/especes-gbif.py [--donnees <dossier>] [--fils 6]
# Il faut le module h3 (pip install h3). Relancé, il reprend où il s'était arrêté (chaque réponse est gardée).
import argparse, concurrent.futures as cf, hashlib, importlib.util, json, os, sys, time, urllib.parse, urllib.request
import h3

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
ap = argparse.ArgumentParser()
ap.add_argument('--donnees', default=os.environ.get('TERRE_DONNEES', os.path.join('/tmp', 'donnees-terre')))
ap.add_argument('--fils', type=int, default=6)
ap.add_argument('--cadre', default='-25,34,45,72', help='ouest,sud,est,nord')
args = ap.parse_args()
D = args.donnees
os.makedirs(os.path.join(D, 'gbif-cellules'), exist_ok=True)

def charger_catalogue():
    spec = importlib.util.spec_from_file_location('especes_catalogue', os.path.join(ICI, 'especes-catalogue.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
CAT = charger_catalogue()

def lire(url, essais=6):
    for k in range(essais):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'orvane-terre/0.1', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)
        except Exception as e:
            if k == essais - 1: raise
            time.sleep(2 * (k + 1))

# --- 1. les noms ---
def noms_du_catalogue():
    N = {}
    for e in CAT.ESPECES: N[e['sci']] = 'espece'
    for g in CAT.GUILDES:
        for s, _, _ in g['especes']: N.setdefault(s, 'guilde')
    for p in CAT.PLANTES:
        N.setdefault(p['sci'], 'plante')
        for s, _, _ in p.get('groupe', []): N.setdefault(s, 'plante')
    return N

f_corr = os.path.join(D, 'gbif-correspondances.json')
corr = json.load(open(f_corr)) if os.path.exists(f_corr) else {}
noms = noms_du_catalogue()
manque = [n for n in noms if n not in corr or not corr[n]['cle'] or corr[n]['type'] in ('NONE', 'HIGHERRANK')]
print(f'{len(noms)} noms, {len(manque)} à faire correspondre')
def correspondre(nom):
    # sans règne d'abord ; un homonyme (Laminaria, Salix…) rend NONE : on retente règne par règne
    for regne in [None, 'Plantae', 'Animalia', 'Fungi', 'Chromista', 'Bacteria', 'Protozoa']:
        q = {'name': nom, 'verbose': 'false', **({'kingdom': regne} if regne else {})}
        r = lire('https://api.gbif.org/v1/species/match?' + urllib.parse.urlencode(q))
        if r.get('matchType') in ('EXACT', 'FUZZY') and (not regne or r.get('kingdom') == regne): break
    cle = r.get('acceptedUsageKey') or r.get('usageKey')
    if cle and r.get('acceptedUsageKey'):   # un synonyme : la fiche du nom accepté
        a = lire(f'https://api.gbif.org/v1/species/{cle}')
        r = {**r, 'species': a.get('species'), 'class': a.get('class'), 'order': a.get('order'), 'family': a.get('family'), 'canonicalName': a.get('canonicalName'), 'rank': a.get('rank')}
    return nom, {'cle': cle, 'rang': r.get('rank'), 'statut': r.get('status'), 'confiance': r.get('confidence'), 'type': r.get('matchType'),
                 'nom_accepte': r.get('canonicalName') if not r.get('acceptedUsageKey') else r.get('canonicalName'), 'regne': r.get('kingdom'),
                 'classe': r.get('class'), 'ordre': r.get('order'), 'famille': r.get('family'), 'cle_espece': r.get('speciesKey')}
with cf.ThreadPoolExecutor(args.fils) as ex:
    for nom, v in ex.map(correspondre, manque): corr[nom] = v
json.dump(corr, open(f_corr, 'w'), ensure_ascii=False, indent=1)
mauvais = [(n, v) for n, v in corr.items() if n in noms and (not v['cle'] or v['type'] not in ('EXACT',))]
for n, v in mauvais: print('  à vérifier :', n, '→', v['nom_accepte'], v['type'], v['rang'])

# --- 2. Wikidata ---
f_wd = os.path.join(D, 'wikidata.json')
wd = json.load(open(f_wd)) if os.path.exists(f_wd) else {}
cles = sorted({str(v['cle']) for n, v in corr.items() if n in noms and v['cle']} - set(wd))
for i in range(0, len(cles), 250):
    lot = cles[i:i + 250]
    q = ('SELECT ?g ?item ?fr ?en ?comest WHERE { VALUES ?g { ' + ' '.join(f'"{c}"' for c in lot) + ' } ?item wdt:P846 ?g . '
         'OPTIONAL { ?item rdfs:label ?fr FILTER(LANG(?fr) = "fr") } OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") } '
         'OPTIONAL { ?item wdt:P789 ?e . ?e rdfs:label ?comest FILTER(LANG(?comest) = "fr") } }')
    if i: time.sleep(65)   # (le service SPARQL limite parfois à une requête par minute)
    for k in range(5):
        try: r = lire('https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'}), essais=1); break
        except Exception as e: print('  Wikidata attend :', str(e)[:80]); time.sleep(70)
    for b in r['results']['bindings']:
        g = b['g']['value']; x = wd.setdefault(g, {'qid': b['item']['value'].rsplit('/', 1)[-1]})
        if 'fr' in b: x['fr'] = b['fr']['value']
        if 'comest' in b: x.setdefault('comestibilite', []); x['comestibilite'] = sorted(set(x['comestibilite'] + [b['comest']['value']]))
    for c in lot: wd.setdefault(c, {})
json.dump(wd, open(f_wd, 'w'), ensure_ascii=False, indent=1)
print(f'Wikidata : {sum(1 for v in wd.values() if v.get("qid"))} éléments sur {len(wd)} clés')

# --- 3. les cellules ---
def cellules():
    lj = os.path.join(RACINE, 'mondes', 'europe', 'lieux.json')
    if os.path.exists(lj):
        L = json.load(open(lj)); L = L.get('lieux', L.get('biomes', L)) if isinstance(L, dict) else L
        ids = set()
        for l in L:
            i = l.get('h3') or (l.get('id', '').split('~', 1)[1] if '~' in l.get('id', '') else None)
            if i: ids.add(i.ljust(15, 'f'))
        if ids: return sorted(ids), 'mondes/europe/lieux.json'
    o, s, e, n = map(float, args.cadre.split(','))
    poly = h3.LatLngPoly([(s, o), (s, e), (n, e), (n, o)])
    return sorted(h3.polygon_to_cells(poly, 2)), f'cadre {args.cadre}'
CELLS, source_cellules = cellules()
print(f'{len(CELLS)} cellules H3 de résolution 2 ({source_cellules})')

def wkt(c):
    pts = [(lng, lat) for lat, lng in h3.cell_to_boundary(c)]
    aire = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if aire < 0: pts = pts[::-1]   # GBIF veut le sens inverse des aiguilles d'une montre
    return 'POLYGON((' + ','.join(f'{x:.4f} {y:.4f}' for x, y in pts + [pts[0]]) + '))'
FILTRES = [('license', 'CC0_1_0'), ('license', 'CC_BY_4_0'), ('occurrenceStatus', 'PRESENT'), ('hasGeospatialIssue', 'false'), ('year', '2000,2026')] + \
          [('basisOfRecord', b) for b in ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN', 'MATERIAL_SAMPLE', 'OCCURRENCE']]

# les clés à compter : les espèces (facette speciesKey) ; les sous-espèces (le mouflon) se comptent à part
sous = {e['sci'] for e in CAT.ESPECES if e.get('sous_espece')}
cles_esp = sorted({v['cle'] for n, v in corr.items() if n in noms and v['cle'] and n not in sous and v['rang'] in ('SPECIES', 'SUBSPECIES', 'VARIETY')})
cles_sous = sorted({corr[n]['cle'] for n in sous if corr.get(n, {}).get('cle')})
LOTS = [cles_esp[i:i + 100] for i in range(0, len(cles_esp), 100)]
print(f'{len(cles_esp)} espèces en {len(LOTS)} paquets, {len(cles_sous)} sous-espèce(s) à part')

def compter(c, lot, facette=True):
    h = hashlib.sha1((c + ','.join(map(str, lot)) + str(facette)).encode()).hexdigest()[:12]
    f = os.path.join(D, 'gbif-cellules', f'{c}-{h}.json')
    if os.path.exists(f): return c, json.load(open(f))
    q = [('geometry', wkt(c))] + FILTRES + [('taxonKey', str(k)) for k in lot] + [('limit', '0')]
    if facette: q += [('facet', 'speciesKey'), ('facetLimit', '1000')]
    r = lire('https://api.gbif.org/v1/occurrence/search?' + urllib.parse.urlencode(q))
    res = {str(x['name']): x['count'] for x in (r.get('facets') or [{}])[0].get('counts', [])} if facette else {str(lot[0]): r['count']}
    json.dump(res, open(f, 'w')); return c, res

taches = [(c, lot, True) for c in CELLS for lot in LOTS] + [(c, [k], False) for c in CELLS for k in cles_sous]
presence = {}
t0 = time.time()
with cf.ThreadPoolExecutor(args.fils) as ex:
    for i, (c, res) in enumerate(ex.map(lambda t: compter(*t), taches)):
        for k, n in res.items():
            if n: presence.setdefault(k, {})[h3.int_to_str(h3.str_to_int(c)).rstrip('f')] = n
        if i % 200 == 0: print(f'  {i}/{len(taches)} requêtes ({time.time() - t0:.0f} s)', flush=True)
json.dump({'cellules': [c.rstrip('f') for c in CELLS], 'source_cellules': source_cellules, 'filtres': dict((k, v) for k, v in FILTRES if k != 'basisOfRecord'),
           'presence': presence, 'date': time.strftime('%Y-%m-%d')}, open(os.path.join(D, 'gbif-presence.json'), 'w'))
print(f'présence : {len(presence)} espèces observées, en {time.time() - t0:.0f} s')
