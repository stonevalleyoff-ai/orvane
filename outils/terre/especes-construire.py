# Orvane — LES ESPÈCES D'EUROPE (outils/terre/especes-construire.py)
# Fait mondes/europe/especes.json : les espèces jouées une à une, les guildes et la flore du catalogue (especes-catalogue.py), leurs
# traits tirés des bases ouvertes, leur nom (GBIF, Wikidata) et leur présence par cellule H3 (especes-gbif.py).
#   python3 outils/terre/especes-construire.py [--donnees <dossier>] [--sortie mondes/europe/especes.json]
# Les unités (docs/52) : plan.longevite et plan.maturite en JOURS ; plan.portee en petits par femelle et par AN.
#  - longevite : la moitié de la longévité record (Amniote, AnAge, PanTHERIA, AmphiBIO) : une durée de vie typique, celle qui fait
#    la mort naturelle de 1 / longevite par jour (le cerf : 31 ans au plus, 15 ans et demi ici) ;
#  - maturite : l'âge de la femelle à sa première reproduction ;
#  - portee : la taille d'une portée (ou d'une ponte) × leur nombre par an (ou 1 / l'intervalle entre deux portées) ;
#  - diete : les parts d'EltonTraits (mammifères, oiseaux) dans les sept de docs/30 (Diet-PlantO → feuilles, Fruit → fruits,
#    Seed → graines, Nect → nectar, Inv → insectes, Vend + Vect + Vfish + Vunk + Scav → viande) ; le régime s'en déduit (docs/30) ;
#  - activite : celle d'EltonTraits ou d'AmphiBIO (de nuit, au crépuscule, de jour ; de jour et de nuit : continue) ;
#  - masse, taille : Amniote, EltonTraits, PanTHERIA (la longueur tête-corps), AmphiBIO ; sinistre, une taille estimée de la masse ;
#  - ce que nul ne mesure (la sociabilité, le tempérament, la vitesse, la perception, la silhouette, la densité) vient du
#    catalogue : estimé, et dit (« estimes » : la liste de ces champs, par espèce).
# Les poissons (pas de FishBase, licence non commerciale) : AnAge quand il les a, sinon le catalogue ; marqués « estime ».
import argparse, csv, importlib.util, json, math, os, subprocess, sys, time

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
ap = argparse.ArgumentParser()
ap.add_argument('--donnees', default=os.environ.get('TERRE_DONNEES', os.path.join('/tmp', 'donnees-terre')))
ap.add_argument('--sortie', default=os.path.join(RACINE, 'mondes', 'europe', 'especes.json'))
ap.add_argument('--seuil', type=int, default=3, help='observations au moins pour qu\'une cellule compte')
args = ap.parse_args()
D = args.donnees
spec = importlib.util.spec_from_file_location('especes_catalogue', os.path.join(ICI, 'especes-catalogue.py'))
CAT = importlib.util.module_from_spec(spec); spec.loader.exec_module(CAT)
JOUR = 365.25

def num(x):
    try:
        v = float(x)
        return None if v in (-999, -999.0, -9999) or math.isnan(v) else v
    except (TypeError, ValueError): return None
def table(chemin, sep=',', enc='utf-8'):
    with open(chemin, encoding=enc, errors='replace', newline='') as f: return list(csv.DictReader(f, delimiter=sep))

# --- les bases ---
ELTON_M = {r['Scientific']: r for r in table(os.path.join(D, 'elton', 'MamFuncDat.txt'), '\t', 'latin-1')}
ELTON_B = {r['Scientific']: r for r in table(os.path.join(D, 'elton', 'BirdFuncDat.txt'), '\t', 'latin-1')}
AMNIOTE = {f"{r['genus']} {r['species']}": r for r in table(os.path.join(D, 'amniote', 'x', 'Data_Files', 'Amniote_Database_Aug_2015.csv'))}
PANTH = {r['MSW05_Binomial']: r for r in table(os.path.join(D, 'pantheria', 'x', 'PanTHERIA_1-0_WR05_Aug2008.txt'), '\t', 'latin-1')}
AMPHI = {r['Species']: r for r in table(os.path.join(D, 'amphibio', 'x', 'AmphiBIO_v1.csv'), ',', 'latin-1')}
ANAGE = {f"{r['Genus']} {r['Species']}": r for r in table(os.path.join(D, 'anage', 'x', 'anage_data.txt'), '\t', 'latin-1')}
CORR = json.load(open(os.path.join(D, 'gbif-correspondances.json')))
WD = json.load(open(os.path.join(D, 'wikidata.json')))
PRES = json.load(open(os.path.join(D, 'gbif-presence.json')))
# les formes et les caractères des plantes : ceux du moteur (moteur/diversite.js, moteur/flore.js), lus tels quels
FLORE = json.loads(subprocess.check_output(['node', '-e', '''
const D = require(process.argv[1] + "/moteur/diversite.js"), F = require(process.argv[1] + "/moteur/flore.js");
const formes = {}; for (const [k, f] of Object.entries(D.FORMES)) formes[k] = { port: f.port, h: f.h, m: f.m, r: f.r, feuillage: f.feuillage || null, rendement: f.rendement || null, car: f.car || [] };
for (const [k, f] of Object.entries(F.FORMES)) formes[k] = { port: k, h: f.h, m: f.m, r: f.r, feuillage: null, rendement: null, car: [] };
const car = {}; for (const [k, c] of Object.entries(D.CARACTERES)) car[k] = { croissance: c.croissance || 1, appetence: c.appetence || 1, sinistres: c.sinistres || {}, vent: !!c.vent, hauteur: c.hauteur || 1, masse: c.masse || 1, ports: c.ports || null };
process.stdout.write(JSON.stringify({ formes, car }));''', RACINE]))

# les noms d'avant, sous lesquels les bases connaissent certaines espèces
SYNONYMES = {
  'Clethrionomys glareolus': ['Myodes glareolus'], 'Lyrurus tetrix': ['Tetrao tetrix'], 'Chroicocephalus ridibundus': ['Larus ridibundus'],
  'Cyanistes caeruleus': ['Parus caeruleus'], 'Neovison vison': ['Mustela vison'], 'Linaria cannabina': ['Carduelis cannabina'],
  'Spinus spinus': ['Carduelis spinus'], 'Carduelis chloris': ['Chloris chloris'], 'Ovis gmelini musimon': ['Ovis orientalis', 'Ovis aries'],
  'Zootoca vivipara': ['Lacerta vivipara'], 'Pelophylax ridibundus': ['Rana ridibunda'], 'Rupicapra pyrenaica': ['Rupicapra rupicapra'],
  'Phoenicopterus roseus': ['Phoenicopterus ruber'], 'Lacerta bilineata': ['Lacerta viridis'], 'Rangifer tarandus': [], 'Morus bassanus': ['Sula bassana'],
  'Vulpes lagopus': ['Alopex lagopus'], 'Dendrocopos major': ['Picoides major'], 'Apus apus': [], 'Arvicola amphibius': ['Arvicola terrestris'],
  'Natrix natrix': [], 'Tetrao urogallus': [], 'Glis glis': ['Myoxus glis'], 'Sorex araneus': [], 'Salvia rosmarinus': ['Rosmarinus officinalis'],
}
def chercher(T, sci):
    for n in [sci] + SYNONYMES.get(sci, []) + [CORR.get(sci, {}).get('nom_accepte') or '']:
        if n and n in T: return T[n], n
    return None, None

def rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def couleurs(hexa, ventre=None):
    r = rgb(hexa)
    return {'robe': r, 'sombre': [round(v * .62) for v in r], 'ventre': rgb(ventre) if ventre else [round(v + (255 - v) * .45) for v in r], 'oeil': [36, 30, 26]}
def corps(gab, e):
    G = CAT.GABARITS[gab]
    c = {k: G[k] for k in ('forme', 'long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue') if k in G}
    if 'pattes' in G: c['pattes'] = G['pattes']
    if 'repli' in G: c['repli'] = G['repli']
    org = list(G.get('organes', []))
    for o in e.get('organes', []):
        org = [x for x in org if not (x[0] == o[0] and x[3] == o[3])] + [o]
    fc = dict(e.get('force_corps') or {})
    if 'organes' in fc: org = fc.pop('organes')
    c.update(fc)
    c['organes'] = [{'type': t, 'taille': ta, 'nombre': n, 'place': p, 'forme': f} for t, ta, n, p, f in org]
    c['motif'] = e.get('motif', 'uni')
    c['couleurs'] = couleurs(e['couleur'])
    return c

def diete_elton(r):
    n = lambda k: num(r.get(k)) or 0
    d = {'feuilles': n('Diet-PlantO'), 'fruits': n('Diet-Fruit'), 'graines': n('Diet-Seed'), 'nectar': n('Diet-Nect'), 'insectes': n('Diet-Inv'),
         'viande': n('Diet-Vend') + n('Diet-Vect') + n('Diet-Vfish') + n('Diet-Vunk') + n('Diet-Scav')}
    s = sum(d.values())
    return {k: round(v / s, 2) for k, v in d.items() if v > 0} if s else None
def diete_amphibio(r):
    f = lambda k: (num(r.get(k)) or 0) > 0
    d = {}
    if f('Arthro'): d['insectes'] = .8 if f('Vert') else 1
    if f('Vert'): d['viande'] = .2 if f('Arthro') else 1
    for k, v in (('Leaves', 'feuilles'), ('Flowers', 'nectar'), ('Seeds', 'graines'), ('Fruits', 'fruits')):
        if f(k): d[v] = .1
    s = sum(d.values()); return {k: round(v / s, 2) for k, v in d.items()} if s else None
def regime_de(d):
    if not d: return None
    chair = d.get('insectes', 0) + d.get('viande', 0) + d.get('sang', 0)
    return 'herbivore' if chair <= .1 else 'carnivore' if chair >= .9 else 'omnivore'
def activite(noc, cre, diu):
    if noc and diu: return 'continue'
    if noc: return 'crepusculaire' if cre else 'nocturne'
    if diu: return 'diurne'
    return 'crepusculaire' if cre else None

# --- les traits d'une espèce, base par base (chaque valeur garde sa source) ---
def traits(sci, classe):
    V, S = {}, {}
    def mettre(k, v, src):
        if v is not None and v > 0 and k not in V: V[k] = v; S[k] = src
    am, _ = chercher(AMNIOTE, sci); el, _ = chercher(ELTON_M if classe == 'Mammalia' else ELTON_B, sci) if classe in ('Mammalia', 'Aves') else (None, None)
    pa, _ = chercher(PANTH, sci) if classe == 'Mammalia' else (None, None)
    amph, _ = chercher(AMPHI, sci) if classe == 'Amphibia' else (None, None)
    an, _ = chercher(ANAGE, sci)
    # la masse (kg)
    if am: mettre('masse_kg', (num(am['adult_body_mass_g']) or 0) / 1000, 'Amniote')
    if el: mettre('masse_kg', (num(el.get('BodyMass-Value')) or 0) / 1000, 'EltonTraits')
    if pa: mettre('masse_kg', (num(pa['5-1_AdultBodyMass_g']) or 0) / 1000, 'PanTHERIA')
    if amph: mettre('masse_kg', (num(amph['Body_mass_g']) or 0) / 1000, 'AmphiBIO')
    if an: mettre('masse_kg', (num(an['Adult weight (g)']) or 0) / 1000, 'AnAge')
    # la taille (m)
    if pa: mettre('taille_m', (num(pa['13-1_AdultHeadBodyLen_mm']) or 0) / 1000, 'PanTHERIA')
    if am and classe == 'Reptilia': mettre('taille_m', (num(am['adult_svl_cm']) or num(am['no_sex_svl_cm']) or 0) / 100, 'Amniote')
    if amph: mettre('taille_m', (num(amph['Body_size_mm']) or 0) / 1000, 'AmphiBIO')
    # la longévité record (ans)
    if am: mettre('longevite_max', num(am['maximum_longevity_y']) or num(am['longevity_y']), 'Amniote')
    if an: mettre('longevite_max', num(an['Maximum longevity (yrs)']), 'AnAge')
    if pa: mettre('longevite_max', (num(pa['17-1_MaxLongevity_m']) or 0) / 12, 'PanTHERIA')
    if amph: mettre('longevite_max', num(amph['Longevity_max_y']), 'AmphiBIO')
    # la maturité de la femelle (jours)
    if am: mettre('maturite', num(am['female_maturity_d']) or num(am['no_sex_maturity_d']), 'Amniote')
    if an: mettre('maturite', num(an['Female maturity (days)']), 'AnAge')
    if pa: mettre('maturite', num(pa['23-1_SexualMaturityAge_d']), 'PanTHERIA')
    if amph:
        lo, hi = num(amph['Age_at_maturity_min_y']), num(amph['Age_at_maturity_max_y'])
        if lo or hi: mettre('maturite', ((lo or hi) + (hi or lo)) / 2 * JOUR, 'AmphiBIO')
    # la portée par an
    def par_an(taille, nb, intervalle):
        if not taille: return None
        return taille * (nb if nb else (1 / intervalle if intervalle and intervalle > 1 else 1))
    if am: mettre('portee', par_an(num(am['litter_or_clutch_size_n']), num(am['litters_or_clutches_per_y']), num(am['inter_litter_or_interbirth_interval_y'])), 'Amniote')
    if an: mettre('portee', par_an(num(an['Litter/Clutch size']), num(an['Litters/Clutches per year']), (num(an['Inter-litter/Interbirth interval']) or 0) / JOUR), 'AnAge')
    if pa: mettre('portee', par_an(num(pa['15-1_LitterSize']), num(pa['16-1_LittersPerYear']), (num(pa['14-1_InterbirthInterval_d']) or 0) / JOUR), 'PanTHERIA')
    if amph:
        lo, hi = num(amph['Litter_size_min_n']), num(amph['Litter_size_max_n'])
        if lo or hi: mettre('portee', ((lo or hi) + (hi or lo)) / 2 * (num(amph['Reproductive_output_y']) or 1), 'AmphiBIO')
    # le régime, l'activité
    if el:
        d = diete_elton(el)
        if d: V['diete'] = d; S['diete'] = 'EltonTraits'
        sc = num(el.get('Diet-Scav')) or 0   # (docs/52) la part de charogne, comptée aussi dans la viande : le glouton, le vautour, le milan
        if sc > 0: V['charogne'] = round(sc / 100, 2); S['charogne'] = 'EltonTraits'
        a = activite(el.get('Activity-Nocturnal') == '1', el.get('Activity-Crepuscular') == '1', el.get('Activity-Diurnal') == '1') if classe == 'Mammalia' else ('nocturne' if el.get('Nocturnal') == '1' else 'diurne')
        if a: V['activite'] = a; S['activite'] = 'EltonTraits'
    if amph:
        d = diete_amphibio(amph)
        if d: V['diete'] = d; S['diete'] = 'AmphiBIO'
        a = activite(amph['Noc'] == '1', amph['Crepu'] == '1', amph['Diu'] == '1')
        if a: V['activite'] = a; S['activite'] = 'AmphiBIO'
    return V, S

# --- la présence ---
def presence_de(*cles):
    tot = {}
    for k in cles:
        for c, n in PRES['presence'].get(str(k), {}).items(): tot[c] = tot.get(c, 0) + n
    return {c: n for c, n in sorted(tot.items()) if n >= args.seuil}
SRC_PRES = f"GBIF, observations depuis 2000 sous licence CC0 ou CC-BY, sans problème géographique, ni fossiles ni bêtes captives ; une cellule compte à partir de {args.seuil} observations ({PRES['date']})"

# --- les habitats : ceux du catalogue, ramenés aux types de la carte ---
LIEUX = json.load(open(os.path.join(RACINE, 'mondes', 'europe', 'lieux.json')))['lieux']
TYPES = {l['type'] for l in LIEUX}
MILIEU = {l['type']: l['milieu'] for l in LIEUX}
EQUIV = {'maquis': ['prairie', 'foret'], 'sommets': ['montagne'], 'grotte': ['montagne', 'foret'], **getattr(CAT, 'HABITATS_CARTE', {})}
def habitats_de(H, plan, vegetal=False):
    out = []
    for h in H:
        for x in [h] + (EQUIV.get(h, []) if (h not in TYPES or sum(1 for l in LIEUX if l['type'] == h) < 10) else []):
            if x in TYPES and x not in out: out.append(x)
    if vegetal: return out
    loco, eau = plan.get('locomotion', []), plan.get('eau')
    def ok(t):   # ce que le moteur permet (moteur/orvane.js, convenance) : l'eau douce aux nageurs d'eau douce, la mer aux nageurs de mer
        m = MILIEU[t]
        if m == 'aquatique': return 'nage' in loco and eau != 'salee'
        if m == 'marin': return 'nage' in loco and eau in ('salee', 'mixte')
        if plan.get('regime') == 'filtreur' and m not in ('aquatique', 'marin', 'amphibie'): return False
        return True
    return [t for t in out if ok(t)]

def eau_de(H, plan):
    if 'nage' not in plan['locomotion']: return None
    douce = any(MILIEU.get(h) == 'aquatique' or h in ('lac', 'riviere') for h in H); mer = any(MILIEU.get(h) == 'marin' or h in ('large', 'mer-froide') for h in H)
    if not douce and not mer: return 'douce' if plan['locomotion'] == ['nage'] else None   # (un nageur de terre ferme n'a pas d'eau à lui)
    return 'mixte' if douce and mer else 'salee' if mer else 'douce'

def reel_de(sci, classe_def=None):
    c = CORR.get(sci) or {}
    w = WD.get(str(c.get('cle')), {}) if c.get('cle') else {}
    r = {'nom_scientifique': c.get('nom_accepte') or sci}
    if (c.get('nom_accepte') or sci) != sci: r['nom_catalogue'] = sci
    r.update({'gbif': c.get('cle'), 'rang': (c.get('rang') or '').lower() or None, 'classe': c.get('classe') or classe_def, 'ordre': c.get('ordre'), 'famille': c.get('famille')})
    if w.get('qid'): r['wikidata'] = w['qid']
    if w.get('fr'): r['nom_wikidata'] = w['fr']
    if w.get('comestibilite'): r['comestibilite'] = w['comestibilite']
    return {k: v for k, v in r.items() if v is not None}

# la densité posée : celle d'un habitat favorable × la part de ses habitats que l'espèce occupe (especes-catalogue.py, OCCUPATION)
def densite(id, d, src=None):
    E_ = getattr(CAT, 'OCCUPATION_ESTIMEE', {})
    occ = CAT.OCCUPATION.get(id, E_.get(id, CAT.OCCUPATION_DEFAUT))
    quoi = 'occupation calée sur l\'effectif européen connu' if id in CAT.OCCUPATION else 'occupation estimée (aire morcelée)' if id in E_ else 'occupation par défaut'
    return {'densite_km2': float(f'{d * occ:.3g}'), 'densite_favorable_km2': d, 'occupation': occ, 'densite_source': (src or 'estime') + ' ; ' + quoi}
ESTIMES_TOUJOURS = ['sociabilite', 'temperament', 'vitesse_rel', 'perception', 'corps', 'densite_km2']
def animal(e, groupe=None):
    sci, gab = e['sci'], CAT.GABARITS[e['gabarit']]
    reel = reel_de(sci)
    if not reel.get('classe') and e['gabarit'] in ('poisson', 'anguille'): reel['classe'] = 'Elasmobranchii' if reel.get('ordre') == 'Squaliformes' else 'Actinopterygii'
    classe = reel.get('classe')
    poisson = classe in ('Actinopterygii', 'Elasmobranchii', 'Chondrichthyes', 'Petromyzonti') or e['gabarit'] in ('poisson', 'anguille') and classe not in ('Mammalia', 'Aves', 'Reptilia', 'Amphibia')
    V, S = traits(sci, classe)
    # le catalogue l'emporte sur les bases pour les champs forcés, et pour les poissons : AnAge y donne des records (la masse du plus
    # gros brochet pêché, la plus longue vie connue), pas une bête ordinaire
    for k_cat, k in (('masse', 'masse_kg'), ('longevite', 'longevite_max'), ('maturite', 'maturite'), ('portee', 'portee')):
        if e.get(k_cat) is not None and (poisson or k_cat in e.get('force', [])) and k in V:
            reel_anage = V.pop(k); S.pop(k, None)
    est = list(ESTIMES_TOUJOURS)
    def val(k, cat_k=None, conv=1):
        if k in V: return V[k]
        if e.get(cat_k or k) is not None: est.append(k); return e[cat_k or k] * conv
        return None
    masse = val('masse_kg', 'masse')
    if masse is None: raise SystemExit(f'{e["id"]} : pas de masse (ni dans les bases, ni dans le catalogue)')
    taille = V.get('taille_m') or e.get('taille')
    if not taille: taille = gab['L'] * masse ** (1 / 3); est.append('taille_m')
    elif 'taille_m' not in V: est.append('taille_m')
    if 'longevite_max' in V: longevite = V['longevite_max'] / 2 * JOUR
    elif e.get('longevite'): longevite = e['longevite'] * JOUR; est.append('longevite')
    else: longevite = 2 * JOUR; est.append('longevite')
    maturite = V.get('maturite') or (e['maturite'] * JOUR if e.get('maturite') else None)
    if 'maturite' not in V: est.append('maturite')
    if not maturite: maturite = min(longevite / 4, JOUR)
    portee = V.get('portee') or e.get('portee') or 2
    if 'portee' not in V: est.append('portee')
    # le régime : le catalogue l'emporte quand il le dit (filtreur, charognard, ou un régime saisi)
    if 'regime' in e and e.get('diete', 0) is None: regime, diete = e['regime'], None; est.append('regime')
    elif e.get('diete') and 'diete' not in V: diete = e['diete']; regime = e.get('regime') or regime_de(diete); est += ['diete', 'regime']
    else: diete = V.get('diete') or e.get('diete'); regime = regime_de(diete) or e.get('regime')
    loco = list(e.get('loco') or gab['loco'])
    plan = {'regime': regime, 'masse_kg': round(masse, 6 if masse < .01 else 3), 'taille_m': round(taille, 4 if taille < .05 else 3), 'locomotion': loco,
            'longevite': round(longevite), 'maturite': round(maturite), 'portee': round(portee, 2),
            'sociabilite': e.get('soc', .3), 'temperament': e.get('tem', .3), 'activite': e.get('act') or V.get('activite') or ('continue' if poisson else 'diurne'),
            'vitesse_rel': round((e.get('vit') or 1) / taille, 2), 'perception': e.get('per', gab['per']), 'reproduction': e.get('repro') or gab['repro']}
    if 'activite' not in V and not e.get('act'): est.append('activite')
    if diete: plan['diete'] = diete
    if V.get('charogne'): plan['charogne'] = V['charogne']
    eau = e.get('eau') or eau_de(e['habitats'], plan)
    if eau: plan['eau'] = eau
    if e.get('meute'): plan['meute'] = e['meute']
    # la natalité : pour les grandes pontes (poissons, amphibiens, invertébrés), la formule de l'assembleur (une part fixe des petits
    # passe l'année) en ferait des milliers par tête ; ici, ce qu'il faut pour remplacer ses morts, avec de la marge (estimée)
    if portee > 50: plan['natalite'] = round(2 * JOUR / longevite, 4); est.append('natalite')
    plan['corps'] = corps(e['gabarit'], e)
    plan['niche'] = {}
    H = habitats_de(e['habitats'], plan)
    sources = sorted({v for v in S.values()})
    reel['traits'] = {k: S[k] for k in sorted(S)}
    if e.get('vit'): reel['vitesse_pointe_ms'] = e['vit']
    if e.get('note'): reel['note'] = e['note']
    out = {'id': e['id'], 'nom': e['nom'], 'reel': reel, 'plan': plan, 'phenotypes': [{'id': 'base', 'frequence': 1, 'traits': []}],
           'habitats': H, **densite(e['id'], e['densite'], e.get('dsrc')), 'estimes': sorted(set(est))}
    if poisson or not sources: out['estime'] = True
    return out

def guilde(g):
    gab = CAT.GABARITS[g['gabarit']]
    membres = []
    for sci, nom, part in g['especes']:
        c = CORR.get(sci) or {}
        membres.append({'sci': sci, 'nom': nom, 'part0': part, 'cle': c.get('cle'), 'n': sum(PRES['presence'].get(str(c.get('cle')), {}).values()) if c.get('cle') else 0})
    # les parts : moitié celles du catalogue, moitié la racine carrée des observations (qui tempère le biais des observateurs)
    N = sum(m['n'] for m in membres); R = sum(math.sqrt(m['n']) for m in membres)
    for m in membres: m['part'] = round(.5 * m['part0'] / sum(x['part0'] for x in membres) + .5 * (math.sqrt(m['n']) / R if N >= 50 else m['part0'] / sum(x['part0'] for x in membres)), 3)
    especes = [{'nom_scientifique': (CORR.get(m['sci']) or {}).get('nom_accepte') or m['sci'], 'nom': m['nom'], 'part': m['part'], 'gbif': m['cle'],
                **({'wikidata': WD[str(m['cle'])]['qid']} if m['cle'] and WD.get(str(m['cle']), {}).get('qid') else {}), 'observations': m['n']} for m in membres]
    # les traits : une guilde de vertébrés prend la moyenne de ses espèces (pesée par leur part), une d'invertébrés ceux du catalogue
    vert = [(m, traits(m['sci'], (CORR.get(m['sci']) or {}).get('classe'))) for m in membres]
    mesure = [(m, V) for m, (V, S) in vert if 'masse_kg' in V]
    est = list(ESTIMES_TOUJOURS); S_all = set()
    if mesure and g.get('masse') is None:
        W = sum(m['part'] for m, _ in mesure)
        moy = lambda k, f=lambda x: x: sum(m['part'] * f(V[k]) for m, V in mesure if k in V) / max(1e-9, sum(m['part'] for m, V in mesure if k in V)) if any(k in V for _, V in mesure) else None
        masse = math.exp(moy('masse_kg', math.log)); taille = gab['L'] * masse ** (1 / 3)
        lm = moy('longevite_max'); longevite = (lm / 2 if lm else 3) * JOUR; maturite = moy('maturite') or JOUR; portee = moy('portee') or 5
        D_ = {}
        for m, V in mesure:
            for k, v in (V.get('diete') or {}).items(): D_[k] = D_.get(k, 0) + m['part'] * v / W
        diete = {k: round(v, 2) for k, v in D_.items() if v >= .01} or None
        regime = regime_de(diete); act = next((V['activite'] for _, V in mesure if 'activite' in V), 'diurne')
        for _, (V, S) in vert: S_all |= set(S.values())
        est.append('taille_m')
    else:
        masse, taille, longevite, maturite, portee = g['masse'], g['taille'], g['longevite'] * JOUR, g['maturite'] * JOUR, g['portee']
        diete, regime, act = g.get('diete'), g['regime'], g.get('act', 'diurne')
        est += ['masse_kg', 'taille_m', 'longevite', 'maturite', 'portee', 'diete', 'regime', 'activite']
    plan = {'regime': regime, 'masse_kg': float(f'{masse:.3g}'), 'taille_m': float(f'{taille:.3g}'), 'locomotion': list(g.get('loco') or gab['loco']),
            'longevite': round(longevite), 'maturite': round(maturite), 'portee': round(portee, 2), 'sociabilite': g.get('soc', .3), 'temperament': g.get('tem', .2),
            'activite': act, 'vitesse_rel': round((g.get('vit') or 1) / taille, 2), 'perception': g.get('per', gab['per']), 'reproduction': g.get('repro') or gab['repro']}
    if diete: plan['diete'] = diete
    eau = g.get('eau') or eau_de(g['habitats'], plan)
    if eau: plan['eau'] = eau
    if portee > 50: plan['natalite'] = round(2 * JOUR / longevite, 4); est.append('natalite')
    plan['corps'] = corps(g['gabarit'], g); plan['niche'] = {}
    cl = [(CORR.get(m['sci']) or {}) for m in membres]
    reel = {'groupe': ', '.join(sorted({f"{c.get('classe')} {c.get('ordre')}" for c in cl if c.get('classe')})), 'role': g.get('role')}
    if S_all: reel['traits'] = sorted(S_all)
    if g.get('note'): reel['note'] = g['note']
    return {'id': g['id'], 'nom': g['nom'], 'guilde': True, 'reel': {k: v for k, v in reel.items() if v}, 'especes': especes, 'plan': plan,
            'phenotypes': [{'id': 'base', 'frequence': 1, 'traits': []}], 'habitats': habitats_de(g['habitats'], plan), **densite(g['id'], g['densite'], getattr(CAT, 'SOURCES_DENSITE', {}).get(g['id'])), 'estimes': sorted(set(est)), **({} if S_all else {'estime': True}),
            '_cles': [m['cle'] for m in membres if m['cle']]}

PHENOS = [('base', []), ('toxique', ['toxique']), ('epineux', ['epineux']), ('epineux+toxique', ['epineux', 'toxique'])]
def plante(p):
    F = FLORE['formes'][p['forme']]; port = F['port']
    car = sorted(set(p.get('car', []) + [c for c in F['car'] if c not in ('vent',) or 'vent' in p.get('car', [])]))
    r, ap, sin, vent = F['r'], 1, {}, False
    for c in car:
        K = FLORE['car'][c]; r *= K['croissance']; ap *= K['appetence']; vent = vent or K['vent']
        for k, v in K['sinistres'].items(): sin[k] = round(sin.get(k, 1) * v, 3)
    rend = {k: v for k, v in (p.get('rendement') or F['rendement'] or {'feuilles': 1}).items() if v and not (vent and k == 'nectar')}
    h = p['h']; m = F['m'] * (h / F['h']) ** 2.5 if F['h'] else F['m']
    plan = {'regime': 'vegetal', 'famille': 'vegetale', 'forme': p['forme'], 'port': port, 'hauteur_m': h, 'taille_m': h, 'masse_kg': float(f'{m:.3g}'),
            'croissance': round(r, 3), 'rendement': rend, 'locomotion': [], 'longevite': round(p['vie'] * JOUR), 'maturite': round(p['mat'] * JOUR),
            'sociabilite': 0, 'temperament': 0, 'activite': 'continue', 'niche': {}}
    fe = p.get('feuillage') or F['feuillage']
    if fe: plan['feuillage'] = fe
    if car: plan['caracteres'] = car
    if sin: plan['sinistres'] = sin
    if ap != 1: plan['appetence'] = round(ap, 3)
    if vent: plan['vent'] = True
    if F['feuillage'] is None and p['forme'] in ('arbre', 'buisson'): pass
    plan['cle'] = '|'.join([port, str(round(h, 3)), str(plan.get('appetence', 1))] + [k[:2] + str(rend[k]) for k in sorted(rend)])
    dfz = p.get('defense') or {}
    tx, ep = dfz.get('toxique', 0), dfz.get('epineux', 0)
    fr = [(1 - tx) * (1 - ep), tx * (1 - ep), ep * (1 - tx), tx * ep]
    phen = [{'id': i, 'frequence': round(f, 4), 'traits': t} for (i, t), f in zip(PHENOS, fr) if f > 0] if dfz else [{'id': 'base', 'frequence': 1, 'traits': []}]
    groupe = p.get('groupe', [])
    cles = [CORR.get(s, {}).get('cle') for s, _, _ in groupe] if groupe else [CORR.get(p['sci'], {}).get('cle')]
    out = {'id': p['id'], 'nom': p['nom'], 'reel': reel_de(p['sci']), 'plan': plan, 'phenotypes': phen, 'habitats': habitats_de(p['habitats'], plan, True),
           'part': {h: p['part'] for h in habitats_de(p['habitats'], plan, True)}, 'estimes': ['hauteur_m', 'masse_kg', 'longevite', 'maturite', 'rendement', 'part'],
           '_cles': [c for c in cles if c]}
    if groupe:
        out['guilde'] = True
        n = {s: sum(PRES['presence'].get(str(CORR.get(s, {}).get('cle')), {}).values()) for s, _, _ in groupe}
        R = sum(math.sqrt(v) for v in n.values()) or 1; P0 = sum(x for _, _, x in groupe)
        out['especes'] = [{'nom_scientifique': CORR.get(s, {}).get('nom_accepte') or s, 'nom': nm, 'part': round(.5 * pt / P0 + .5 * (math.sqrt(n[s]) / R if sum(n.values()) >= 50 else pt / P0), 3),
                           'gbif': CORR.get(s, {}).get('cle'), 'observations': n[s]} for s, nm, pt in groupe]
    if p.get('culture'): out['culture'] = True
    if p.get('champignon'): out['champignon'] = p['champignon']
    if p.get('note'): out['reel']['note'] = p['note']
    return out

# --- l'assemblage ---
taxons = []
for e in CAT.ESPECES:
    t = animal(e); c = CORR.get(e['sci'], {}).get('cle'); t['_cles'] = [c] if c else []; taxons.append(t)
for g in CAT.GUILDES: taxons.append(guilde(g))
for p in CAT.PLANTES: taxons.append(plante(p))
vides = []
for t in taxons:
    cel = presence_de(*t.pop('_cles'))
    if cel: t['presence'] = {'source': SRC_PRES, 'resolution': 2, 'cellules': cel, 'observations': sum(cel.values())}
    elif t.get('culture') or (t['plan'].get('forme') == 'plancton') or t['id'].startswith('zooplancton'):
        t['presence'] = {'source': 'estime : partout où vit son habitat', 'resolution': 2, 'cellules': {c: 1 for c in PRES['cellules']}}; t['estimes'] = sorted(set(t['estimes'] + ['presence']))
    else: vides.append(t['id'])
    if not t['habitats']: print(f'  {t["id"]} : aucun habitat de la carte ne lui convient')
ids = [t['id'] for t in taxons]
assert len(ids) == len(set(ids)), 'des identifiants en double'
anim = [t for t in taxons if t['plan']['regime'] != 'vegetal']
sortie = {'orvane': '1.0', 'monde': 'europe', 'genere': time.strftime('%Y-%m-%d'), 'outil': 'outils/terre/especes-construire.py (LISEZ-MOI.md, « Les espèces »)',
          'unites': {'longevite': 'jours (la moitié de la longévité record : une durée de vie typique)', 'maturite': 'jours (la première reproduction de la femelle)',
                     'portee': 'petits (ou œufs) par femelle et par an', 'masse_kg': 'kg', 'taille_m': 'm (longueur tête-corps, ou totale pour un oiseau, un poisson)',
                     'densite_km2': 'bêtes par km² de ses habitats dans ses cellules de présence : densite_favorable_km2 (un habitat favorable) × occupation (la part de ces habitats qu\'elle tient vraiment)', 'vitesse_rel': 'longueurs de corps par seconde, à la vitesse de pointe',
                     'croissance': 'la repousse d\'une plante par cycle de référence d\'Orvane (le pas de temps du moteur la ramène au jour)',
                     'presence.cellules': 'H3 de résolution 2, sans les f de fin : le nombre d\'observations GBIF'},
          'compte': {'especes': sum(1 for t in anim if not t.get('guilde')), 'guildes': sum(1 for t in anim if t.get('guilde')),
                     'plantes': sum(1 for t in taxons if t['plan']['regime'] == 'vegetal')},
          'especes': taxons}
os.makedirs(os.path.dirname(args.sortie), exist_ok=True)
with open(args.sortie, 'w') as f: json.dump(sortie, f, ensure_ascii=False, separators=(',', ':'))
print(f"{sortie['compte']} → {os.path.relpath(args.sortie, RACINE)} ({os.path.getsize(args.sortie) / 1e6:.2f} Mo)")
if vides: print(f'  sans présence : {", ".join(vides)}')
