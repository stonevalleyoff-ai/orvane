# Orvane — LE CATALOGUE DES ESPÈCES D'EUROPE (outils/terre/especes-catalogue.py)
# La liste tenue à la main : les espèces jouées une à une, les guildes (avec leurs espèces réelles, la couche d'affichage) et la
# flore. Ce fichier ne contient que des choix et des estimations : les traits mesurés (masse, régime, longévité, maturité, portée,
# activité) viennent des bases ouvertes (outils/terre/especes-construire.py) et l'emportent sur ce qui est écrit ici, sauf
# quand un champ est forcé (« force »).
#
# Ce qui est écrit ici est une ESTIMATION, sauf mention :
#   densite   : bêtes par km² dans un habitat favorable (ordre de grandeur, d'après la littérature générale)
#   vit       : vitesse de pointe, en m/s (sur terre, en vol de croisière rapide, ou dans l'eau)
#   soc, tem, per : sociabilité, tempérament (0 fuit toujours, 1 riposte), perception — de 0 à 1
#   coul      : la robe (une couleur hexadécimale) ; le dos et le ventre s'en déduisent
# Les habitats sont les types de lieux de moteur/biomes-universels.json (foret, prairie, taiga, toundra, steppe, maquis, montagne,
# sommets, marais, cote, lac, riviere, large, mer-froide, grotte). Une carte qui en définit d'autres les relie dans HABITATS_CARTE.
# Ce fichier se lit avec especes-construire.py (importlib) : il ne fait rien seul.

# ---------------------------------------------------------------------------------------------------------------------------
# LES GABARITS DE CORPS : une silhouette par famille (moteur/corps.js). Les proportions vont de 0 à 1 ; les organes sont des
# tuples (type, taille, nombre, place, forme). « L » : le rapport longueur / masse^(1/3) pour estimer la taille quand aucune base
# ne la donne (mammifères 0,33, oiseaux 0,55, poissons 0,45…).
# ---------------------------------------------------------------------------------------------------------------------------
GABARITS = {
  # mammifères
  'cervide':    dict(forme='quadrupede', long=.55, haut=.72, cou=.55, tete=.4, museau=.45, oreilles=.5, queue=.12, L=.33, per=.6, loco=['marche', 'course', 'saut', 'nage'], repro='vivipare'),
  'bovide':     dict(forme='quadrupede', long=.62, haut=.55, cou=.3, tete=.55, museau=.4, oreilles=.25, queue=.3, L=.33, per=.5, loco=['marche', 'course'], repro='vivipare'),
  'caprin':     dict(forme='quadrupede', long=.45, haut=.6, cou=.4, tete=.4, museau=.4, oreilles=.35, queue=.1, L=.33, per=.65, loco=['marche', 'course', 'saut', 'grimpe'], repro='vivipare'),
  'suide':      dict(forme='quadrupede', long=.58, haut=.4, cou=.15, tete=.55, museau=.72, oreilles=.4, queue=.2, L=.33, per=.45, loco=['marche', 'course', 'nage', 'fouissage'], repro='vivipare'),
  'canide':     dict(forme='quadrupede', long=.55, haut=.55, cou=.35, tete=.45, museau=.65, oreilles=.6, queue=.55, L=.33, per=.75, loco=['marche', 'course', 'nage'], repro='vivipare'),
  'felide':     dict(forme='quadrupede', long=.55, haut=.5, cou=.3, tete=.45, museau=.3, oreilles=.55, queue=.55, L=.33, per=.8, loco=['marche', 'course', 'grimpe', 'saut'], repro='vivipare'),
  'ursid':      dict(forme='quadrupede', long=.5, haut=.45, cou=.25, tete=.55, museau=.5, oreilles=.3, queue=.05, L=.33, per=.6, loco=['marche', 'course', 'grimpe', 'nage'], repro='vivipare'),
  'mustelide':  dict(forme='quadrupede', long=.8, haut=.2, cou=.4, tete=.35, museau=.4, oreilles=.2, queue=.45, L=.33, per=.65, loco=['marche', 'course', 'grimpe'], repro='vivipare'),
  'blaireau':   dict(forme='quadrupede', long=.6, haut=.2, cou=.2, tete=.4, museau=.55, oreilles=.15, queue=.15, L=.33, per=.45, loco=['marche', 'fouissage'], repro='vivipare'),
  'leporide':   dict(forme='quadrupede', long=.45, haut=.5, cou=.2, tete=.4, museau=.3, oreilles=.9, queue=.1, L=.33, per=.6, loco=['marche', 'course', 'saut'], repro='vivipare'),
  'rongeur':    dict(forme='quadrupede', long=.5, haut=.2, cou=.15, tete=.45, museau=.35, oreilles=.45, queue=.7, L=.33, per=.5, loco=['marche', 'course', 'grimpe', 'fouissage'], repro='vivipare'),
  'campagnol':  dict(forme='quadrupede', long=.45, haut=.15, cou=.1, tete=.4, museau=.3, oreilles=.2, queue=.25, L=.33, per=.45, loco=['marche', 'fouissage'], repro='vivipare'),
  'ecureuil':   dict(forme='quadrupede', long=.45, haut=.3, cou=.2, tete=.4, museau=.3, oreilles=.5, queue=.9, L=.33, per=.6, loco=['marche', 'grimpe', 'saut'], repro='vivipare', organes=[('panache', .6, 1, 'queue', 'touffe')]),
  'marmotte':   dict(forme='quadrupede', long=.55, haut=.25, cou=.15, tete=.45, museau=.3, oreilles=.2, queue=.3, L=.33, per=.6, loco=['marche', 'fouissage'], repro='vivipare'),
  'castor':     dict(forme='quadrupede', long=.6, haut=.15, cou=.15, tete=.45, museau=.35, oreilles=.15, queue=.5, L=.33, per=.4, loco=['marche', 'nage', 'fouissage'], repro='vivipare'),
  'herisson':   dict(forme='quadrupede', long=.4, haut=.15, cou=.1, tete=.35, museau=.6, oreilles=.2, queue=.05, L=.33, per=.4, loco=['marche'], repro='vivipare', organes=[('epines', .55, 12, 'dos', 'fines')]),
  'taupe':      dict(forme='quadrupede', long=.5, haut=.05, cou=.05, tete=.4, museau=.7, oreilles=0, queue=.1, L=.33, per=.2, loco=['fouissage', 'marche'], repro='vivipare'),
  'musaraigne': dict(forme='quadrupede', long=.5, haut=.12, cou=.1, tete=.4, museau=.75, oreilles=.15, queue=.5, L=.33, per=.4, loco=['marche', 'fouissage'], repro='vivipare'),
  'chiroptere': dict(forme='quadrupede', long=.35, haut=.3, cou=.1, tete=.45, museau=.3, oreilles=.7, queue=.3, L=.33, per=.85, loco=['vol', 'grimpe'], repro='vivipare', organes=[('ailes', .9, 2, 'flancs', 'membranes')]),
  'phoque':     dict(forme='quadrupede', long=.9, haut=.05, cou=.3, tete=.4, museau=.35, oreilles=0, queue=.1, L=.33, per=.6, loco=['nage', 'reptation'], repro='vivipare', organes=[('nageoires', .5, 2, 'flancs', 'courtes')]),
  'cetace':     dict(forme='serpent', long=.75, haut=.3, cou=0, tete=.45, museau=.55, oreilles=0, queue=.6, L=.35, per=.75, loco=['nage'], repro='vivipare', organes=[('nageoires', .45, 1, 'dos', 'courtes'), ('nageoires', .4, 2, 'flancs', 'courtes')]),
  # oiseaux
  'passereau':  dict(forme='oiseau', long=.4, haut=.4, cou=.2, tete=.45, museau=.3, oreilles=0, queue=.5, L=.55, per=.7, loco=['marche', 'vol', 'saut'], repro='ovipare', organes=[('ailes', .6, 2, 'flancs', 'plumes')]),
  'corvide':    dict(forme='oiseau', long=.5, haut=.45, cou=.25, tete=.45, museau=.5, oreilles=0, queue=.55, L=.55, per=.75, loco=['marche', 'vol', 'saut'], repro='ovipare', organes=[('ailes', .7, 2, 'flancs', 'plumes')]),
  'rapace':     dict(forme='oiseau', long=.5, haut=.4, cou=.25, tete=.45, museau=.4, oreilles=0, queue=.5, L=.55, per=.9, loco=['marche', 'vol'], repro='ovipare', organes=[('ailes', .9, 2, 'flancs', 'plumes')]),
  'strigide':   dict(forme='oiseau', long=.45, haut=.35, cou=.1, tete=.65, museau=.2, oreilles=.35, queue=.3, L=.55, per=.95, loco=['marche', 'vol'], repro='ovipare', organes=[('ailes', .8, 2, 'flancs', 'plumes')]),
  'galliforme': dict(forme='oiseau', long=.55, haut=.4, cou=.3, tete=.35, museau=.25, oreilles=0, queue=.5, L=.55, per=.6, loco=['marche', 'course', 'vol'], repro='ovipare', organes=[('ailes', .4, 2, 'flancs', 'plumes')]),
  'anatide':    dict(forme='oiseau', long=.6, haut=.2, cou=.5, tete=.4, museau=.5, oreilles=0, queue=.2, L=.55, per=.6, loco=['marche', 'vol', 'nage'], repro='ovipare', organes=[('ailes', .6, 2, 'flancs', 'plumes')]),
  'echassier':  dict(forme='oiseau', long=.5, haut=.95, cou=.85, tete=.35, museau=.8, oreilles=0, queue=.3, L=.55, per=.75, loco=['marche', 'vol'], repro='ovipare', organes=[('ailes', .8, 2, 'flancs', 'plumes')]),
  'laride':     dict(forme='oiseau', long=.5, haut=.35, cou=.3, tete=.4, museau=.45, oreilles=0, queue=.45, L=.55, per=.75, loco=['marche', 'vol', 'nage'], repro='ovipare', organes=[('ailes', .9, 2, 'flancs', 'plumes')]),
  'alcide':     dict(forme='oiseau', long=.55, haut=.25, cou=.2, tete=.5, museau=.4, oreilles=0, queue=.15, L=.55, per=.7, loco=['marche', 'vol', 'nage'], repro='ovipare', organes=[('ailes', .5, 2, 'flancs', 'plumes')]),
  'pigeon':     dict(forme='oiseau', long=.5, haut=.3, cou=.3, tete=.35, museau=.2, oreilles=0, queue=.5, L=.55, per=.65, loco=['marche', 'vol'], repro='ovipare', organes=[('ailes', .7, 2, 'flancs', 'plumes')]),
  'pic':        dict(forme='oiseau', long=.45, haut=.3, cou=.3, tete=.5, museau=.6, oreilles=0, queue=.5, L=.55, per=.7, loco=['vol', 'grimpe'], repro='ovipare', organes=[('ailes', .6, 2, 'flancs', 'plumes')]),
  'aerien':     dict(forme='oiseau', long=.45, haut=.1, cou=.1, tete=.4, museau=.15, oreilles=0, queue=.7, L=.55, per=.8, loco=['vol'], repro='ovipare', organes=[('ailes', 1, 2, 'flancs', 'plumes')]),
  'cormoran':   dict(forme='oiseau', long=.65, haut=.35, cou=.6, tete=.4, museau=.55, oreilles=0, queue=.45, L=.55, per=.7, loco=['marche', 'vol', 'nage'], repro='ovipare', organes=[('ailes', .75, 2, 'flancs', 'plumes')]),
  # reptiles et amphibiens
  'serpent':    dict(forme='serpent', long=1, haut=0, cou=.1, tete=.3, museau=.3, oreilles=0, queue=.8, L=1.6, per=.5, loco=['reptation'], repro='ovipare'),
  'lezard':     dict(forme='quadrupede', long=.8, haut=.1, cou=.15, tete=.4, museau=.5, oreilles=0, queue=.9, L=.6, per=.6, loco=['marche', 'course', 'grimpe'], repro='ovipare'),
  'tortue':     dict(forme='quadrupede', long=.45, haut=.2, cou=.3, tete=.3, museau=.3, oreilles=0, queue=.1, L=.3, per=.4, loco=['marche'], repro='ovipare', organes=[('carapace', .9, 1, 'dos', 'bombee')]),
  'grenouille': dict(forme='quadrupede', long=.35, haut=.3, cou=.05, tete=.5, museau=.3, oreilles=0, queue=0, L=.45, per=.5, loco=['saut', 'nage', 'marche'], repro='ovipare'),
  'urodele':    dict(forme='quadrupede', long=.75, haut=.1, cou=.1, tete=.4, museau=.3, oreilles=0, queue=.75, L=.55, per=.35, loco=['marche', 'nage'], repro='ovipare'),
  # poissons
  'poisson':    dict(forme='serpent', long=.7, haut=.35, cou=0, tete=.4, museau=.5, oreilles=0, queue=.6, L=.45, per=.55, loco=['nage'], repro='ovipare', organes=[('nageoires', .4, 1, 'dos', 'courtes'), ('nageoires', .3, 2, 'flancs', 'courtes')]),
  'anguille':   dict(forme='serpent', long=1, haut=.1, cou=0, tete=.3, museau=.4, oreilles=0, queue=.9, L=.8, per=.5, loco=['nage', 'reptation'], repro='ovipare'),
  # invertébrés (les guildes)
  'abeille':    dict(forme='hexapode', pattes=6, long=.4, haut=.3, cou=0, tete=.35, museau=.1, oreilles=0, queue=.3, L=.06, per=.6, loco=['vol', 'marche'], repro='ovipare', organes=[('ailes', .6, 4, 'flancs', 'membranes'), ('antennes', .4, 2, 'tete', 'fines'), ('aiguillon', .3, 1, 'queue', 'droit')]),
  'papillon':   dict(forme='hexapode', pattes=6, long=.4, haut=.3, cou=0, tete=.3, museau=.2, oreilles=0, queue=.2, L=.08, per=.5, loco=['vol', 'marche'], repro='ovipare', organes=[('ailes', 1, 4, 'flancs', 'membranes'), ('antennes', .5, 2, 'tete', 'fines'), ('trompe', .4, 1, 'tete', 'longue')]),
  'mouche':     dict(forme='hexapode', pattes=6, long=.4, haut=.3, cou=0, tete=.4, museau=.2, oreilles=0, queue=.2, L=.06, per=.6, loco=['vol', 'marche'], repro='ovipare', organes=[('ailes', .6, 2, 'flancs', 'membranes'), ('antennes', .2, 2, 'tete', 'fines')]),
  'chenille':   dict(forme='hexapode', pattes=6, long=.9, haut=.1, cou=0, tete=.3, museau=.1, oreilles=0, queue=.3, L=.12, per=.2, loco=['marche'], repro='ovipare'),
  'insecte':    dict(forme='hexapode', pattes=6, long=.5, haut=.3, cou=0, tete=.35, museau=.2, oreilles=0, queue=.3, L=.07, per=.4, loco=['marche', 'saut'], repro='ovipare', organes=[('antennes', .5, 2, 'tete', 'fines')]),
  'coleoptere': dict(forme='hexapode', pattes=6, long=.5, haut=.25, cou=0, tete=.3, museau=.2, oreilles=0, queue=.1, L=.07, per=.35, loco=['marche', 'vol', 'fouissage'], repro='ovipare', organes=[('carapace', .7, 1, 'dos', 'segmentee'), ('antennes', .35, 2, 'tete', 'fines')]),
  'araignee':   dict(forme='hexapode', pattes=8, long=.4, haut=.35, cou=0, tete=.35, museau=.1, oreilles=0, queue=.4, L=.07, per=.55, loco=['marche', 'grimpe'], repro='ovipare'),
  'libellule':  dict(forme='hexapode', pattes=6, long=.9, haut=.2, cou=0, tete=.4, museau=.1, oreilles=0, queue=.9, L=.15, per=.9, loco=['vol'], repro='ovipare', organes=[('ailes', .9, 4, 'flancs', 'membranes')]),
  'larve':      dict(forme='hexapode', pattes=6, long=.7, haut=.1, cou=0, tete=.3, museau=.1, oreilles=0, queue=.5, L=.08, per=.3, loco=['nage', 'marche'], repro='ovipare'),
  'ver':        dict(forme='serpent', long=1, haut=0, cou=0, tete=.2, museau=.2, oreilles=0, queue=.5, L=1.2, per=.1, loco=['fouissage', 'reptation'], repro='ovipare'),
  'escargot':   dict(forme='serpent', long=.5, haut=.2, cou=0, tete=.3, museau=.1, oreilles=0, queue=.3, L=.15, per=.2, loco=['reptation'], repro='ovipare', organes=[('carapace', .7, 1, 'dos', 'bombee'), ('antennes', .3, 2, 'tete', 'fines')]),
  'crustace':   dict(forme='hexapode', pattes=8, long=.55, haut=.2, cou=0, tete=.35, museau=.2, oreilles=0, queue=.4, L=.1, per=.4, loco=['marche', 'nage'], repro='ovipare', organes=[('pinces', .5, 2, 'avant', 'fines'), ('antennes', .5, 2, 'tete', 'fines'), ('carapace', .5, 1, 'dos', 'segmentee')]),
  'plancton':   dict(forme='hexapode', pattes=6, long=.5, haut=.2, cou=0, tete=.4, museau=.1, oreilles=0, queue=.4, L=.05, per=.2, loco=['nage'], repro='ovipare', organes=[('antennes', .8, 2, 'tete', 'plumeuses')]),
  'bivalve':    dict(forme='serpent', long=.4, haut=.3, cou=0, tete=.1, museau=0, oreilles=0, queue=0, L=.12, per=.05, loco=['reptation'], repro='ovipare', organes=[('carapace', .9, 1, 'dos', 'bombee')]),
  'meduse':     dict(forme='radiaire', repli='serpent', pattes=8, long=.4, haut=.4, cou=0, tete=.2, museau=0, oreilles=0, queue=0, L=.5, per=.1, loco=['nage'], repro='ovipare'),
}

# ---------------------------------------------------------------------------------------------------------------------------
# LES ESPÈCES JOUÉES UNE À UNE
#   A(id, nom, nom scientifique, gabarit, habitats, densité (/km²), couleur, …)
#   options : soc, tem, vit, per, act ('diurne'…), loco, eau ('douce', 'salee', 'mixte'), regime, diete, masse (kg), taille (m),
#             longevite / maturite (en ans : convertis en jours), portee (petits par femelle et par an), repro, organes, motif,
#             force (liste des champs qui l'emportent sur les bases), dsrc (la source de la densité), note
# ---------------------------------------------------------------------------------------------------------------------------
ESPECES = []
def A(id, nom, sci, gab, habitats, densite, coul, **kw):
    ESPECES.append(dict(id=id, nom=nom, sci=sci, gabarit=gab, habitats=habitats, densite=densite, couleur=coul, **kw))

# --- les ongulés ---
A('cerf-elaphe', 'Cerf élaphe', 'Cervus elaphus', 'cervide', ['foret', 'montagne', 'prairie', 'taiga'], 5, '#8a5a3a', soc=.75, tem=.3, vit=17, organes=[('cornes', .85, 2, 'tete', 'ramifiees')])
A('chevreuil', 'Chevreuil', 'Capreolus capreolus', 'cervide', ['foret', 'prairie', 'taiga'], 15, '#9a6a44', soc=.35, tem=.1, vit=19, organes=[('cornes', .35, 2, 'tete', 'ramifiees')])
A('daim', 'Daim', 'Dama dama', 'cervide', ['foret', 'prairie'], 8, '#a8743e', soc=.7, tem=.15, vit=18, motif='taches', organes=[('cornes', .6, 2, 'tete', 'ramifiees')])
A('cerf-sika', 'Cerf sika', 'Cervus nippon', 'cervide', ['foret', 'marais'], 6, '#6e4f36', soc=.6, tem=.2, vit=17, motif='taches', organes=[('cornes', .55, 2, 'tete', 'ramifiees')], note='introduit (Asie)')
A('elan', 'Élan', 'Alces alces', 'cervide', ['taiga', 'marais', 'foret'], .8, '#4a3a2c', soc=.15, tem=.45, vit=15, organes=[('cornes', .9, 2, 'tete', 'ramifiees')])
A('renne', 'Renne', 'Rangifer tarandus', 'cervide', ['toundra', 'taiga', 'montagne'], 1.5, '#8c8478', soc=.95, tem=.15, vit=17, organes=[('cornes', .8, 2, 'tete', 'ramifiees')], note='sauvage et semi-domestique')
A('bison-europe', "Bison d'Europe", 'Bison bonasus', 'bovide', ['foret', 'prairie'], .8, '#5a4030', soc=.7, tem=.5, vit=15, organes=[('cornes', .3, 2, 'tete', 'recourbees')])
A('sanglier', 'Sanglier', 'Sus scrofa', 'suide', ['foret', 'maquis', 'prairie', 'marais'], 5, '#4a3e34', soc=.65, tem=.6, vit=11, organes=[('defenses', .3, 2, 'tete', 'recourbees')])
A('chamois', 'Chamois', 'Rupicapra rupicapra', 'caprin', ['montagne', 'sommets'], 6, '#6b5440', soc=.6, tem=.2, vit=14, motif='masque', organes=[('cornes', .25, 2, 'tete', 'recourbees')])
A('isard', 'Isard', 'Rupicapra pyrenaica', 'caprin', ['montagne', 'sommets'], 6, '#7a5c40', soc=.6, tem=.2, vit=14, motif='masque', organes=[('cornes', .22, 2, 'tete', 'recourbees')])
A('bouquetin-alpes', 'Bouquetin des Alpes', 'Capra ibex', 'caprin', ['sommets', 'montagne'], 3, '#7d6e5c', soc=.6, tem=.35, vit=11, organes=[('cornes', .9, 2, 'tete', 'recourbees')])
A('bouquetin-iberique', 'Bouquetin ibérique', 'Capra pyrenaica', 'caprin', ['montagne', 'maquis'], 3, '#8a7458', soc=.6, tem=.3, vit=11, organes=[('cornes', .8, 2, 'tete', 'recourbees')])
A('mouflon', 'Mouflon', 'Ovis gmelini musimon', 'caprin', ['montagne', 'maquis', 'foret'], 5, '#7a4a2c', soc=.7, tem=.25, vit=15, organes=[('cornes', .7, 2, 'tete', 'recourbees')], sous_espece=True, note='la sous-espèce seule (le mouton domestique est exclu)')
A('boeuf-musque', 'Bœuf musqué', 'Ovibos moschatus', 'bovide', ['toundra', 'montagne'], .1, '#3a2e26', soc=.8, tem=.6, vit=11, organes=[('cornes', .5, 2, 'tete', 'recourbees')], note='réintroduit (Dovrefjell)')
# --- les carnivores ---
A('loup', 'Loup gris', 'Canis lupus', 'canide', ['foret', 'montagne', 'taiga', 'prairie', 'steppe'], .025, '#8a8278', soc=.8, tem=.55, vit=16)
A('chacal-dore', 'Chacal doré', 'Canis aureus', 'canide', ['prairie', 'marais', 'maquis'], .5, '#a88a5a', soc=.5, tem=.4, vit=14)
A('renard-roux', 'Renard roux', 'Vulpes vulpes', 'canide', ['foret', 'prairie', 'montagne', 'maquis', 'steppe'], 2, '#c0682c', soc=.2, tem=.35, vit=13)
A('renard-polaire', 'Renard polaire', 'Vulpes lagopus', 'canide', ['toundra', 'sommets'], .05, '#d8d8d4', soc=.3, tem=.35, vit=13)
A('chien-viverrin', 'Chien viverrin', 'Nyctereutes procyonoides', 'canide', ['foret', 'marais'], .7, '#7a6a58', soc=.35, tem=.3, vit=8, motif='masque', note='introduit (Asie)')
A('ours-brun', 'Ours brun', 'Ursus arctos', 'ursid', ['foret', 'montagne', 'taiga'], .03, '#5a4030', soc=.05, tem=.6, vit=13)
A('lynx-boreal', 'Lynx boréal', 'Lynx lynx', 'felide', ['foret', 'montagne', 'taiga'], .015, '#a08060', soc=.05, tem=.45, vit=15, motif='taches', force_corps=dict(queue=.12, oreilles=.75))
A('lynx-pardelle', 'Lynx pardelle', 'Lynx pardinus', 'felide', ['maquis', 'foret'], .05, '#a8845a', soc=.05, tem=.45, vit=15, motif='taches', force_corps=dict(queue=.12, oreilles=.75))
A('chat-forestier', 'Chat forestier', 'Felis silvestris', 'felide', ['foret', 'maquis'], .3, '#8a7a64', soc=.05, tem=.5, vit=13, motif='rayures')
A('genette', 'Genette commune', 'Genetta genetta', 'felide', ['maquis', 'foret'], .5, '#9a9080', soc=.05, tem=.4, vit=9, motif='taches', force_corps=dict(long=.8, haut=.3, queue=.9), note='introduite anciennement (Afrique)')
A('blaireau', 'Blaireau européen', 'Meles meles', 'blaireau', ['foret', 'prairie'], 3, '#6e6a66', soc=.5, tem=.55, vit=7, motif='masque')
A('loutre', "Loutre d'Europe", 'Lutra lutra', 'mustelide', ['riviere', 'lac', 'cote', 'marais', 'foret'], .1, '#5a4232', soc=.15, tem=.45, vit=8, eau='mixte', loco=['marche', 'nage'], force_corps=dict(queue=.6))
A('martre', 'Martre des pins', 'Martes martes', 'mustelide', ['foret', 'taiga'], .5, '#5a3e2a', soc=.05, tem=.5, vit=9)
A('fouine', 'Fouine', 'Martes foina', 'mustelide', ['foret', 'prairie', 'montagne'], 1, '#6a5240', soc=.05, tem=.5, vit=9)
A('hermine', 'Hermine', 'Mustela erminea', 'mustelide', ['prairie', 'foret', 'toundra', 'montagne'], 2, '#8a6440', soc=.05, tem=.6, vit=9, force_corps=dict(queue=.35))
A('belette', 'Belette', 'Mustela nivalis', 'mustelide', ['prairie', 'foret', 'toundra'], 3, '#8a5e3a', soc=.05, tem=.6, vit=7, force_corps=dict(queue=.2))
A('putois', "Putois d'Europe", 'Mustela putorius', 'mustelide', ['foret', 'marais', 'prairie'], 1, '#3e342c', soc=.05, tem=.6, vit=7, motif='masque')
A('vison-amerique', "Vison d'Amérique", 'Neovison vison', 'mustelide', ['riviere', 'lac', 'marais'], .5, '#2e241e', soc=.05, tem=.55, vit=7, eau='douce', loco=['marche', 'nage'], note='introduit (Amérique)')
A('glouton', 'Glouton', 'Gulo gulo', 'mustelide', ['taiga', 'toundra', 'montagne'], .004, '#3a2e24', soc=.05, tem=.8, vit=12, force_corps=dict(long=.55, haut=.35, queue=.25))
A('raton-laveur', 'Raton laveur', 'Procyon lotor', 'ursid', ['foret', 'riviere', 'marais'], 2, '#7a7470', soc=.2, tem=.45, vit=7, motif='masque', force_corps=dict(queue=.5, oreilles=.4), note='introduit (Amérique)')
# --- les petits mammifères ---
A('lievre-europe', "Lièvre d'Europe", 'Lepus europaeus', 'leporide', ['prairie', 'steppe', 'foret'], 15, '#9a7a56', soc=.15, tem=.05, vit=19)
A('lievre-variable', 'Lièvre variable', 'Lepus timidus', 'leporide', ['toundra', 'taiga', 'montagne'], 5, '#a8a49a', soc=.15, tem=.05, vit=17)
A('lapin', 'Lapin de garenne', 'Oryctolagus cuniculus', 'leporide', ['prairie', 'maquis', 'cote'], 50, '#8a7660', soc=.75, tem=.05, vit=11, loco=['marche', 'course', 'saut', 'fouissage'], force_corps=dict(oreilles=.75))
A('ecureuil-roux', 'Écureuil roux', 'Sciurus vulgaris', 'ecureuil', ['foret', 'taiga'], 50, '#b0562a', soc=.1, tem=.2, vit=5)
A('ecureuil-gris', 'Écureuil gris', 'Sciurus carolinensis', 'ecureuil', ['foret'], 200, '#8a8a86', soc=.15, tem=.25, vit=5, note='introduit (Amérique)')
A('marmotte', 'Marmotte des Alpes', 'Marmota marmota', 'marmotte', ['sommets', 'montagne'], 20, '#8a7050', soc=.75, tem=.15, vit=4)
A('castor', "Castor d'Europe", 'Castor fiber', 'castor', ['riviere', 'lac', 'marais', 'foret', 'taiga'], .5, '#6a4a30', soc=.6, tem=.3, vit=2, eau='douce')
A('herisson', "Hérisson d'Europe", 'Erinaceus europaeus', 'herisson', ['prairie', 'foret'], 10, '#7a6a58', soc=.05, tem=.3, vit=2)
A('taupe', "Taupe d'Europe", 'Talpa europaea', 'taupe', ['prairie', 'foret'], 500, '#2e2a28', soc=.05, tem=.3, vit=1)
A('loir', 'Loir gris', 'Glis glis', 'rongeur', ['foret'], 300, '#8a8680', soc=.3, tem=.3, vit=3, force_corps=dict(queue=.8))
A('surmulot', 'Surmulot', 'Rattus norvegicus', 'rongeur', ['prairie', 'riviere', 'cote'], 50, '#6a5a4a', soc=.7, tem=.45, vit=3, loco=['marche', 'course', 'nage', 'fouissage'], note='introduit (Asie), commensal')
A('rat-noir', 'Rat noir', 'Rattus rattus', 'rongeur', ['maquis', 'foret', 'cote'], 20, '#3a3430', soc=.6, tem=.4, vit=3, note='introduit, commensal')
A('mulot-sylvestre', 'Mulot sylvestre', 'Apodemus sylvaticus', 'rongeur', ['foret', 'prairie', 'maquis'], 2000, '#8a6a4a', soc=.3, tem=.1, vit=3, force_corps=dict(oreilles=.55))
A('mulot-collier', 'Mulot à collier', 'Apodemus flavicollis', 'rongeur', ['foret'], 2000, '#8e6440', soc=.3, tem=.1, vit=3, force_corps=dict(oreilles=.55))
A('souris-grise', 'Souris grise', 'Mus musculus', 'rongeur', ['prairie'], 100, '#7a7268', soc=.6, tem=.15, vit=3, note='commensale')
A('campagnol-champs', 'Campagnol des champs', 'Microtus arvalis', 'campagnol', ['prairie', 'steppe'], 5000, '#7a6a52', soc=.6, tem=.1, vit=2, note='pullulations cycliques')
A('campagnol-roussatre', 'Campagnol roussâtre', 'Clethrionomys glareolus', 'campagnol', ['foret', 'taiga'], 3000, '#8a5a3a', soc=.3, tem=.1, vit=2)
A('campagnol-terrestre', 'Campagnol terrestre', 'Arvicola amphibius', 'campagnol', ['prairie', 'riviere', 'marais'], 500, '#5a4a3a', soc=.4, tem=.15, vit=2, loco=['marche', 'nage', 'fouissage'], eau='douce')
A('lemming', 'Lemming des toundras', 'Lemmus lemmus', 'campagnol', ['toundra', 'sommets'], 1000, '#8a6a40', soc=.4, tem=.4, vit=2, motif='bandes', note='pullulations cycliques')
A('ragondin', 'Ragondin', 'Myocastor coypus', 'castor', ['riviere', 'marais', 'lac'], 10, '#6a5440', soc=.5, tem=.3, vit=3, eau='douce', force_corps=dict(queue=.6), note='introduit (Amérique)')
A('rat-musque', 'Rat musqué', 'Ondatra zibethicus', 'castor', ['marais', 'riviere', 'lac'], 20, '#5a4434', soc=.4, tem=.3, vit=2, eau='douce', note='introduit (Amérique)')
# --- les chauves-souris ---
A('pipistrelle', 'Pipistrelle commune', 'Pipistrellus pipistrellus', 'chiroptere', ['foret', 'prairie', 'riviere'], 50, '#6a5444', soc=.8, tem=.1, vit=10, act='nocturne')
A('grand-murin', 'Grand murin', 'Myotis myotis', 'chiroptere', ['foret', 'prairie', 'grotte'], 2, '#7a6a5a', soc=.85, tem=.1, vit=10, act='nocturne')
A('noctule', 'Noctule commune', 'Nyctalus noctula', 'chiroptere', ['foret', 'lac', 'riviere'], 5, '#8a5a34', soc=.7, tem=.1, vit=14, act='nocturne')
A('grand-rhinolophe', 'Grand rhinolophe', 'Rhinolophus ferrumequinum', 'chiroptere', ['prairie', 'foret', 'grotte'], 1, '#8a7a68', soc=.85, tem=.1, vit=8, act='nocturne')
A('oreillard-roux', 'Oreillard roux', 'Plecotus auritus', 'chiroptere', ['foret'], 10, '#8a7058', soc=.6, tem=.1, vit=6, act='nocturne', force_corps=dict(oreilles=1))
# --- les mammifères marins ---
A('phoque-veau-marin', 'Phoque veau-marin', 'Phoca vitulina', 'phoque', ['cote', 'mer-froide'], .5, '#7a7a74', soc=.6, tem=.2, vit=7, eau='salee', motif='taches')
A('phoque-gris', 'Phoque gris', 'Halichoerus grypus', 'phoque', ['cote', 'mer-froide'], .3, '#6a6a6a', soc=.6, tem=.3, vit=7, eau='salee', motif='taches')
A('phoque-moine', 'Phoque moine de Méditerranée', 'Monachus monachus', 'phoque', ['cote', 'large'], .002, '#4a4440', soc=.3, tem=.2, vit=6, eau='salee')
A('marsouin', 'Marsouin commun', 'Phocoena phocoena', 'cetace', ['mer-froide', 'cote', 'large'], .5, '#4a4e54', soc=.3, tem=.1, vit=6, eau='salee')
A('grand-dauphin', 'Grand dauphin', 'Tursiops truncatus', 'cetace', ['large', 'cote'], .02, '#6a7076', soc=.75, tem=.35, vit=9, eau='salee')
A('dauphin-commun', 'Dauphin commun', 'Delphinus delphis', 'cetace', ['large'], .5, '#3e444c', soc=.9, tem=.2, vit=11, eau='salee')
A('petit-rorqual', 'Petit rorqual', 'Balaenoptera acutorostrata', 'cetace', ['mer-froide', 'large'], .02, '#3a3e44', soc=.1, tem=.1, vit=9, eau='salee', regime='filtreur', diete=None)
A('rorqual-commun', 'Rorqual commun', 'Balaenoptera physalus', 'cetace', ['large', 'mer-froide'], .005, '#4a4e56', soc=.2, tem=.1, vit=11, eau='salee', regime='filtreur', diete=None)
A('orque', 'Orque', 'Orcinus orca', 'cetace', ['mer-froide', 'large'], .0005, '#1e1e22', soc=.85, tem=.7, vit=15, eau='salee', motif='masque')

# --- les oiseaux : gibier ---
A('faisan', 'Faisan de Colchide', 'Phasianus colchicus', 'galliforme', ['prairie', 'foret'], 20, '#9a4a2a', soc=.3, tem=.15, vit=15, force_corps=dict(queue=.9), note='introduit, lâché pour la chasse')
A('perdrix-grise', 'Perdrix grise', 'Perdix perdix', 'galliforme', ['prairie', 'steppe'], 10, '#8a7a64', soc=.75, tem=.1, vit=14)
A('perdrix-rouge', 'Perdrix rouge', 'Alectoris rufa', 'galliforme', ['maquis', 'prairie'], 10, '#9a8270', soc=.75, tem=.1, vit=14)
A('caille', 'Caille des blés', 'Coturnix coturnix', 'galliforme', ['prairie', 'steppe'], 5, '#8a7454', soc=.2, tem=.1, vit=15)
A('grand-tetras', 'Grand tétras', 'Tetrao urogallus', 'galliforme', ['taiga', 'foret', 'montagne'], 3, '#2e2e2c', soc=.2, tem=.45, vit=15, organes=[('panache', .6, 1, 'queue', 'eventail')])
A('tetras-lyre', 'Tétras lyre', 'Lyrurus tetrix', 'galliforme', ['taiga', 'montagne', 'marais'], 5, '#24242a', soc=.4, tem=.3, vit=15, organes=[('panache', .5, 1, 'queue', 'eventail')])
A('lagopede-alpin', 'Lagopède alpin', 'Lagopus muta', 'galliforme', ['sommets', 'toundra'], 5, '#c8c4bc', soc=.5, tem=.1, vit=15)
A('pigeon-ramier', 'Pigeon ramier', 'Columba palumbus', 'pigeon', ['foret', 'prairie'], 50, '#7a7a86', soc=.8, tem=.1, vit=20)
A('tourterelle-turque', 'Tourterelle turque', 'Streptopelia decaocto', 'pigeon', ['prairie'], 30, '#b8a898', soc=.5, tem=.1, vit=18, note='arrivée au XXᵉ siècle')
A('pigeon-biset', 'Pigeon biset', 'Columba livia', 'pigeon', ['cote', 'prairie', 'montagne'], 100, '#7a7c88', soc=.9, tem=.1, vit=20, note='surtout féral')
A('becasse', 'Bécasse des bois', 'Scolopax rusticola', 'echassier', ['foret'], 5, '#8a6a48', soc=.05, tem=.1, vit=15, force_corps=dict(haut=.35, cou=.3, museau=.9))
A('colvert', 'Canard colvert', 'Anas platyrhynchos', 'anatide', ['lac', 'riviere', 'marais'], 20, '#6a6050', soc=.7, tem=.15, vit=18, eau='douce')
A('sarcelle', "Sarcelle d'hiver", 'Anas crecca', 'anatide', ['marais', 'lac'], 10, '#7a6a5a', soc=.8, tem=.1, vit=20, eau='douce')
A('fuligule-morillon', 'Fuligule morillon', 'Aythya fuligula', 'anatide', ['lac'], 10, '#2a2a30', soc=.8, tem=.1, vit=20, eau='douce')
A('eider', 'Eider à duvet', 'Somateria mollissima', 'anatide', ['cote', 'mer-froide'], 10, '#5a4a3a', soc=.85, tem=.1, vit=20, eau='salee')
A('oie-cendree', 'Oie cendrée', 'Anser anser', 'anatide', ['marais', 'lac', 'prairie'], 5, '#8a8478', soc=.85, tem=.35, vit=18, eau='douce')
A('bernache-nonnette', 'Bernache nonnette', 'Branta leucopsis', 'anatide', ['cote', 'prairie', 'toundra'], 5, '#3a3a3c', soc=.9, tem=.2, vit=17, eau='mixte', motif='masque')
A('bernache-canada', 'Bernache du Canada', 'Branta canadensis', 'anatide', ['lac', 'prairie'], 5, '#6a5e52', soc=.85, tem=.4, vit=18, eau='douce', note='introduite (Amérique)')
A('cygne-tubercule', 'Cygne tuberculé', 'Cygnus olor', 'anatide', ['lac', 'riviere', 'cote'], 2, '#ecebe6', soc=.4, tem=.65, vit=20, eau='mixte', force_corps=dict(cou=.95))
A('foulque', 'Foulque macroule', 'Fulica atra', 'anatide', ['lac', 'marais'], 30, '#26262a', soc=.7, tem=.4, vit=15, eau='douce', force_corps=dict(cou=.3, museau=.3))
# --- les rapaces ---
A('aigle-royal', 'Aigle royal', 'Aquila chrysaetos', 'rapace', ['montagne', 'sommets', 'taiga'], .02, '#5a4028', soc=.1, tem=.75, vit=30)
A('buse-variable', 'Buse variable', 'Buteo buteo', 'rapace', ['foret', 'prairie'], .5, '#7a5a3e', soc=.1, tem=.5, vit=18)
A('autour', 'Autour des palombes', 'Accipiter gentilis', 'rapace', ['foret', 'taiga'], .1, '#6a6660', soc=.05, tem=.7, vit=20)
A('epervier', "Épervier d'Europe", 'Accipiter nisus', 'rapace', ['foret', 'prairie'], .3, '#6a6a70', soc=.05, tem=.55, vit=18)
A('faucon-crecerelle', 'Faucon crécerelle', 'Falco tinnunculus', 'rapace', ['prairie', 'steppe'], .5, '#a8643a', soc=.1, tem=.45, vit=18)
A('faucon-pelerin', 'Faucon pèlerin', 'Falco peregrinus', 'rapace', ['montagne', 'cote', 'prairie'], .01, '#4a4e58', soc=.05, tem=.7, vit=30, note='piqué bien plus rapide')
A('milan-royal', 'Milan royal', 'Milvus milvus', 'rapace', ['prairie', 'foret'], .1, '#a0522d', soc=.4, tem=.4, vit=18)
A('pygargue', 'Pygargue à queue blanche', 'Haliaeetus albicilla', 'rapace', ['cote', 'marais', 'foret', 'taiga'], .01, '#6a5440', soc=.15, tem=.6, vit=20)
A('balbuzard', 'Balbuzard pêcheur', 'Pandion haliaetus', 'rapace', ['cote', 'marais', 'foret', 'taiga'], .02, '#5a4632', soc=.1, tem=.5, vit=20)
A('vautour-fauve', 'Vautour fauve', 'Gyps fulvus', 'rapace', ['montagne', 'maquis'], .05, '#a08460', soc=.8, tem=.3, vit=20, regime='detritivore', diete=None, force_corps=dict(cou=.5))
A('grand-duc', "Grand-duc d'Europe", 'Bubo bubo', 'strigide', ['montagne', 'foret'], .02, '#8a6440', soc=.05, tem=.7, vit=15)
A('chouette-hulotte', 'Chouette hulotte', 'Strix aluco', 'strigide', ['foret'], 1, '#7a5a3e', soc=.05, tem=.5, vit=12, force_corps=dict(oreilles=0))
A('effraie', 'Effraie des clochers', 'Tyto alba', 'strigide', ['prairie'], .3, '#d8b88a', soc=.05, tem=.35, vit=12, force_corps=dict(oreilles=0))
A('cheveche', "Chevêche d'Athéna", 'Athene noctua', 'strigide', ['prairie', 'maquis'], .5, '#8a7660', soc=.1, tem=.35, vit=10, force_corps=dict(oreilles=0))
# --- les grands oiseaux d'eau ---
A('cigogne-blanche', 'Cigogne blanche', 'Ciconia ciconia', 'echassier', ['prairie', 'marais'], .5, '#ecebe6', soc=.6, tem=.25, vit=15)
A('grue-cendree', 'Grue cendrée', 'Grus grus', 'echassier', ['marais', 'prairie', 'taiga'], .5, '#8a8c90', soc=.85, tem=.3, vit=17)
A('heron-cendre', 'Héron cendré', 'Ardea cinerea', 'echassier', ['marais', 'cote', 'prairie'], .5, '#8a909a', soc=.3, tem=.35, vit=13)
A('flamant-rose', 'Flamant rose', 'Phoenicopterus roseus', 'echassier', ['marais', 'cote'], 50, '#eab4b0', soc=.95, tem=.1, vit=15, regime='filtreur', diete=None)
A('grand-cormoran', 'Grand cormoran', 'Phalacrocorax carbo', 'cormoran', ['lac', 'riviere', 'cote'], 1, '#202226', soc=.75, tem=.3, vit=15, eau='mixte')
# --- les oiseaux marins ---
A('goeland-argente', 'Goéland argenté', 'Larus argentatus', 'laride', ['cote', 'mer-froide'], 10, '#d8dade', soc=.8, tem=.55, vit=15, eau='salee')
A('mouette-rieuse', 'Mouette rieuse', 'Chroicocephalus ridibundus', 'laride', ['lac', 'cote', 'prairie'], 20, '#e4e4e2', soc=.85, tem=.4, vit=14, eau='mixte', motif='masque')
A('sterne-pierregarin', 'Sterne pierregarin', 'Sterna hirundo', 'laride', ['cote', 'lac'], 5, '#e8e8ea', soc=.85, tem=.55, vit=13, eau='mixte')
A('macareux', 'Macareux moine', 'Fratercula arctica', 'alcide', ['mer-froide', 'cote'], 5, '#24242a', soc=.95, tem=.15, vit=20, eau='salee')
A('guillemot', 'Guillemot de Troïl', 'Uria aalge', 'alcide', ['mer-froide', 'cote'], 10, '#30302f', soc=.95, tem=.15, vit=20, eau='salee')
A('fou-bassan', 'Fou de Bassan', 'Morus bassanus', 'laride', ['mer-froide', 'large'], 1, '#efefea', soc=.95, tem=.3, vit=18, eau='salee')
# --- les passereaux et autres oiseaux communs ---
A('moineau-domestique', 'Moineau domestique', 'Passer domesticus', 'passereau', ['prairie'], 200, '#8a6a4a', soc=.85, tem=.2, vit=11, note='commensal')
A('merle-noir', 'Merle noir', 'Turdus merula', 'passereau', ['foret', 'prairie'], 100, '#1e1e1e', soc=.1, tem=.3, vit=12)
A('rouge-gorge', 'Rougegorge familier', 'Erithacus rubecula', 'passereau', ['foret'], 100, '#7a6a4a', soc=.05, tem=.45, vit=10)
A('mesange-charbonniere', 'Mésange charbonnière', 'Parus major', 'passereau', ['foret', 'prairie'], 80, '#5a7a3a', soc=.4, tem=.35, vit=10, motif='masque')
A('mesange-bleue', 'Mésange bleue', 'Cyanistes caeruleus', 'passereau', ['foret', 'prairie'], 80, '#5a86b4', soc=.4, tem=.3, vit=10, motif='masque')
A('pinson', 'Pinson des arbres', 'Fringilla coelebs', 'passereau', ['foret', 'prairie'], 150, '#9a6a5a', soc=.5, tem=.2, vit=12)
A('etourneau', 'Étourneau sansonnet', 'Sturnus vulgaris', 'passereau', ['prairie'], 100, '#2a2a30', soc=.95, tem=.3, vit=20, motif='taches')
A('alouette', 'Alouette des champs', 'Alauda arvensis', 'passereau', ['prairie', 'steppe'], 40, '#8a7860', soc=.4, tem=.1, vit=12)
A('hirondelle-rustique', 'Hirondelle rustique', 'Hirundo rustica', 'aerien', ['prairie', 'lac'], 30, '#22304a', soc=.75, tem=.1, vit=15, loco=['vol', 'marche'])
A('martinet-noir', 'Martinet noir', 'Apus apus', 'aerien', ['prairie', 'montagne'], 30, '#26221e', soc=.85, tem=.1, vit=30)
A('corneille-noire', 'Corneille noire', 'Corvus corone', 'corvide', ['prairie', 'foret'], 20, '#141416', soc=.5, tem=.55, vit=14)
A('grand-corbeau', 'Grand corbeau', 'Corvus corax', 'corvide', ['montagne', 'taiga', 'cote'], .5, '#101014', soc=.3, tem=.6, vit=17)
A('pie-bavarde', 'Pie bavarde', 'Pica pica', 'corvide', ['prairie'], 20, '#18181c', soc=.4, tem=.5, vit=12, force_corps=dict(queue=.85))
A('geai', 'Geai des chênes', 'Garrulus glandarius', 'corvide', ['foret'], 10, '#a08070', soc=.2, tem=.45, vit=12)
A('pic-epeiche', 'Pic épeiche', 'Dendrocopos major', 'pic', ['foret', 'taiga'], 10, '#2a2a2c', soc=.05, tem=.3, vit=12)
A('coucou', 'Coucou gris', 'Cuculus canorus', 'pigeon', ['foret', 'prairie', 'marais'], 2, '#7a7e86', soc=.05, tem=.2, vit=15, portee=12, force=['portee'], note='parasite des couvées')

# --- les reptiles ---
A('vipere-peliade', 'Vipère péliade', 'Vipera berus', 'serpent', ['prairie', 'foret', 'marais', 'montagne', 'taiga'], 10, '#7a6a5a', soc=.05, tem=.6, vit=1, motif='bandes', repro='vivipare', masse=.1, taille=.6, maturite=4, regime='carnivore', diete={'viande': 1})
A('vipere-aspic', 'Vipère aspic', 'Vipera aspis', 'serpent', ['maquis', 'montagne', 'prairie'], 10, '#8a6a4a', soc=.05, tem=.6, vit=1, motif='bandes', repro='vivipare', masse=.12, taille=.65, regime='carnivore', diete={'viande': 1})
A('couleuvre-collier', 'Couleuvre à collier', 'Natrix natrix', 'serpent', ['marais', 'riviere', 'lac', 'prairie'], 10, '#5a6448', soc=.05, tem=.3, vit=2, loco=['reptation', 'nage'], eau='douce', masse=.3, taille=1, regime='carnivore', diete={'viande': 1})
A('lezard-vert', 'Lézard vert occidental', 'Lacerta bilineata', 'lezard', ['maquis', 'prairie'], 50, '#4a8a3a', soc=.05, tem=.4, vit=3, masse=.03, taille=.35, regime='carnivore', diete={'insectes': .95, 'fruits': .05})
A('lezard-murailles', 'Lézard des murailles', 'Podarcis muralis', 'lezard', ['maquis', 'montagne', 'prairie'], 300, '#7a6e5c', soc=.05, tem=.3, vit=3, masse=.006, taille=.2, regime='carnivore', diete={'insectes': 1})
A('lezard-vivipare', 'Lézard vivipare', 'Zootoca vivipara', 'lezard', ['marais', 'prairie', 'toundra', 'montagne', 'taiga'], 200, '#6a5a44', soc=.05, tem=.2, vit=2, repro='vivipare', masse=.004, taille=.15, regime='carnivore', diete={'insectes': 1})
A('tortue-hermann', "Tortue d'Hermann", 'Testudo hermanni', 'tortue', ['maquis'], 10, '#a08a50', soc=.05, tem=.2, vit=.2, masse=1.2, taille=.18, regime='herbivore', diete={'feuilles': .8, 'fruits': .2})
A('cistude', "Cistude d'Europe", 'Emys orbicularis', 'tortue', ['marais', 'lac', 'riviere'], 20, '#2e3226', soc=.3, tem=.2, vit=.5, loco=['marche', 'nage'], eau='douce', masse=.5, taille=.15, regime='carnivore', diete={'insectes': .7, 'viande': .2, 'feuilles': .1}, motif='taches')
A('tortue-caouanne', 'Tortue caouanne', 'Caretta caretta', 'tortue', ['large', 'cote'], .01, '#8a5a34', soc=.05, tem=.3, vit=4, loco=['nage', 'reptation'], eau='salee', masse=100, taille=.9, regime='carnivore', diete={'insectes': .8, 'viande': .2}, organes=[('carapace', .9, 1, 'dos', 'bombee'), ('nageoires', .5, 2, 'flancs', 'courtes')], note='« insectes » = invertébrés : méduses, crabes')
# --- les amphibiens ---
A('grenouille-rousse', 'Grenouille rousse', 'Rana temporaria', 'grenouille', ['foret', 'prairie', 'marais', 'montagne', 'taiga'], 500, '#8a6a46', soc=.4, tem=.05, vit=2, eau='douce', masse=.03)
A('grenouille-rieuse', 'Grenouille rieuse', 'Pelophylax ridibundus', 'grenouille', ['lac', 'riviere', 'marais'], 500, '#5a7a3e', soc=.5, tem=.1, vit=2, eau='douce', masse=.07)
A('crapaud-commun', 'Crapaud commun', 'Bufo bufo', 'grenouille', ['foret', 'prairie', 'marais'], 300, '#7a5e40', soc=.3, tem=.1, vit=.5, loco=['marche', 'saut', 'nage'], eau='douce', motif='taches', masse=.06)
A('rainette', 'Rainette verte', 'Hyla arborea', 'grenouille', ['marais', 'foret', 'prairie'], 100, '#4a9a3a', soc=.4, tem=.05, vit=2, loco=['saut', 'grimpe', 'nage'], eau='douce', masse=.007)
A('salamandre', 'Salamandre tachetée', 'Salamandra salamandra', 'urodele', ['foret', 'montagne'], 200, '#141414', soc=.1, tem=.1, vit=.2, loco=['marche'], repro='vivipare', motif='taches', masse=.03)
A('triton-crete', 'Triton crêté', 'Triturus cristatus', 'urodele', ['marais', 'lac', 'prairie'], 100, '#3a3430', soc=.2, tem=.1, vit=.3, eau='douce', organes=[('crete', .5, 1, 'dos', 'dentelee')], masse=.01)

# --- les poissons (pas de FishBase : traits saisis, marqués estimés ; AnAge, CC-BY, quand il les a) ---
P = dict(soc=.3, tem=.2)
A('truite', 'Truite commune', 'Salmo trutta', 'poisson', ['riviere', 'lac'], 20000, '#8a7a5a', vit=4, eau='mixte', masse=1, taille=.4, longevite=8, maturite=3, portee=2000, regime='carnivore', diete={'insectes': .7, 'viande': .3}, motif='taches', **P)
A('saumon-atlantique', 'Saumon atlantique', 'Salmo salar', 'poisson', ['riviere', 'mer-froide', 'large'], 5, '#8a8c90', vit=8, eau='mixte', masse=5, taille=.8, longevite=6, maturite=4, portee=7000, regime='carnivore', diete={'insectes': .3, 'viande': .7}, note='migrateur : rivière natale, mer')
A('brochet', 'Brochet', 'Esox lucius', 'poisson', ['lac', 'riviere', 'marais'], 2000, '#5a6a3a', vit=7, eau='douce', masse=3, taille=.7, longevite=10, maturite=2.5, portee=30000, regime='carnivore', diete={'viande': 1}, motif='taches', soc=.05, tem=.6)
A('carpe', 'Carpe commune', 'Cyprinus carpio', 'poisson', ['lac', 'riviere', 'marais'], 3000, '#8a7038', vit=3, eau='douce', masse=4, taille=.6, longevite=20, maturite=4, portee=300000, regime='omnivore', diete={'insectes': .5, 'feuilles': .3, 'graines': .2}, soc=.6, tem=.1, note='introduite anciennement (Asie)')
A('anguille', "Anguille d'Europe", 'Anguilla anguilla', 'anguille', ['riviere', 'lac', 'cote', 'large'], 5000, '#4a4a30', vit=2, eau='mixte', masse=1, taille=.8, longevite=15, maturite=10, portee=1000000, regime='carnivore', diete={'insectes': .6, 'viande': .4}, soc=.1, tem=.3, note='se reproduit une fois, en mer des Sargasses')
A('perche', 'Perche commune', 'Perca fluviatilis', 'poisson', ['lac', 'riviere'], 20000, '#6a7a3a', vit=3, eau='douce', masse=.3, taille=.25, longevite=8, maturite=2.5, portee=30000, regime='carnivore', diete={'insectes': .6, 'viande': .4}, motif='bandes', soc=.7, tem=.4)
A('gardon', 'Gardon', 'Rutilus rutilus', 'poisson', ['lac', 'riviere'], 50000, '#a8a8a0', vit=2, eau='douce', masse=.2, taille=.2, longevite=8, maturite=3, portee=20000, regime='omnivore', diete={'insectes': .5, 'feuilles': .5}, soc=.8, tem=.05)
A('silure', 'Silure glane', 'Silurus glanis', 'anguille', ['riviere', 'lac'], 200, '#3a3a34', vit=3, eau='douce', masse=30, taille=1.6, longevite=30, maturite=4, portee=100000, regime='carnivore', diete={'viande': .8, 'insectes': .2}, soc=.05, tem=.6, organes=[('antennes', .5, 2, 'tete', 'fines')], note='« antennes » : les barbillons ; introduit hors de l\'Est')
A('sandre', 'Sandre', 'Sander lucioperca', 'poisson', ['lac', 'riviere'], 2000, '#7a7e6a', vit=4, eau='douce', masse=2, taille=.5, longevite=12, maturite=3.5, portee=200000, regime='carnivore', diete={'viande': .9, 'insectes': .1}, motif='bandes', soc=.4, tem=.5)
A('ombre', 'Ombre commun', 'Thymallus thymallus', 'poisson', ['riviere'], 5000, '#7a8088', vit=4, eau='douce', masse=.5, taille=.35, longevite=7, maturite=3, portee=5000, regime='carnivore', diete={'insectes': 1}, organes=[('nageoires', .7, 1, 'dos', 'voiles'), ('nageoires', .3, 2, 'flancs', 'courtes')], **P)
A('esturgeon', 'Esturgeon européen', 'Acipenser sturio', 'poisson', ['riviere', 'cote', 'large'], .1, '#6a6a60', vit=2, eau='mixte', masse=60, taille=2, longevite=60, maturite=12, portee=500000, regime='carnivore', diete={'insectes': .9, 'viande': .1}, organes=[('plaques', .5, 5, 'dos', 'rondes'), ('nageoires', .3, 2, 'flancs', 'courtes')], note='au bord de l\'extinction (Gironde)', **P)
A('hareng', 'Hareng atlantique', 'Clupea harengus', 'poisson', ['mer-froide', 'large', 'cote'], 25000, '#9aa4b0', vit=3, eau='salee', masse=.2, taille=.25, longevite=12, maturite=3, portee=40000, regime='filtreur', diete=None, soc=.95, tem=.05)
A('sprat', 'Sprat', 'Sprattus sprattus', 'poisson', ['mer-froide', 'cote'], 200000, '#a0aab4', vit=2, eau='salee', masse=.015, taille=.12, longevite=5, maturite=1.5, portee=10000, regime='filtreur', diete=None, soc=.95, tem=.05)
A('sardine', 'Sardine', 'Sardina pilchardus', 'poisson', ['large', 'cote'], 100000, '#8a9aac', vit=3, eau='salee', masse=.08, taille=.2, longevite=8, maturite=1.5, portee=50000, regime='filtreur', diete=None, soc=.95, tem=.05)
A('anchois', 'Anchois européen', 'Engraulis encrasicolus', 'poisson', ['large', 'cote'], 100000, '#9aa8b0', vit=2, eau='salee', masse=.03, taille=.15, longevite=4, maturite=1, portee=20000, regime='filtreur', diete=None, soc=.95, tem=.05)
A('capelan', 'Capelan', 'Mallotus villosus', 'poisson', ['mer-froide'], 100000, '#8aa0a0', vit=2, eau='salee', masse=.03, taille=.17, longevite=4, maturite=3, portee=10000, regime='filtreur', diete=None, soc=.95, tem=.05)
A('cabillaud', 'Cabillaud', 'Gadus morhua', 'poisson', ['mer-froide', 'large'], 250, '#8a8462', vit=3, eau='salee', masse=8, taille=.9, longevite=20, maturite=4, portee=1000000, regime='carnivore', diete={'viande': .6, 'insectes': .4}, motif='taches', soc=.6, tem=.3, note='« insectes » = invertébrés : crevettes, vers')
A('eglefin', 'Églefin', 'Melanogrammus aeglefinus', 'poisson', ['mer-froide'], 1000, '#7a7a74', vit=3, eau='salee', masse=1.5, taille=.5, longevite=15, maturite=3, portee=300000, regime='carnivore', diete={'insectes': .8, 'viande': .2}, soc=.7, tem=.2)
A('maquereau', 'Maquereau commun', 'Scomber scombrus', 'poisson', ['large', 'mer-froide', 'cote'], 20000, '#3a6a7a', vit=6, eau='salee', masse=.5, taille=.35, longevite=12, maturite=2, portee=300000, regime='carnivore', diete={'insectes': .6, 'viande': .4}, motif='bandes', soc=.9, tem=.2)
A('thon-rouge', "Thon rouge de l'Atlantique", 'Thunnus thynnus', 'poisson', ['large'], 3, '#1e2e4a', vit=20, eau='salee', masse=200, taille=2.2, longevite=20, maturite=4, portee=5000000, regime='carnivore', diete={'viande': .9, 'insectes': .1}, soc=.7, tem=.4)
A('bar', 'Bar commun', 'Dicentrarchus labrax', 'poisson', ['cote', 'large'], 200, '#9aa0a4', vit=5, eau='salee', masse=2, taille=.5, longevite=15, maturite=4, portee=300000, regime='carnivore', diete={'viande': .6, 'insectes': .4}, soc=.5, tem=.3)
A('plie', "Plie d'Europe", 'Pleuronectes platessa', 'poisson', ['cote', 'mer-froide'], 2000, '#8a7a5a', vit=1.5, eau='salee', masse=.8, taille=.4, longevite=20, maturite=4, portee=100000, regime='carnivore', diete={'insectes': 1}, motif='taches', soc=.2, tem=.1, force_corps=dict(long=.5, haut=.7, queue=.3))
A('aiguillat', 'Aiguillat commun', 'Squalus acanthias', 'poisson', ['mer-froide', 'large'], 50, '#6a6e72', vit=3, eau='salee', masse=4, taille=1, longevite=40, maturite=15, portee=3, repro='vivipare', regime='carnivore', diete={'viande': .7, 'insectes': .3}, soc=.7, tem=.4, organes=[('nageoires', .5, 2, 'dos', 'courtes'), ('nageoires', .45, 2, 'flancs', 'courtes')], note='petit requin ; portée tous les deux ans')

# ---------------------------------------------------------------------------------------------------------------------------
# LES GUILDES : une unité simulée, des espèces réelles affichées. « especes » : (nom scientifique, nom français, part estimée) ;
# la part est corrigée ensuite par les observations GBIF (racine carrée des comptes, pour tempérer le biais des observateurs) quand
# il y en a assez. Les traits d'une guilde de vertébrés sont la moyenne pondérée de ses espèces (EltonTraits, Amniote) ; ceux
# d'une guilde d'invertébrés sont estimés (« estime »).
#   G(id, nom, gabarit, habitats, densite, couleur, especes, masse, taille, longevite (ans), maturite (ans), portee, regime, diete, …)
# ---------------------------------------------------------------------------------------------------------------------------
GUILDES = []
def G(id, nom, gab, habitats, densite, coul, especes, **kw):
    GUILDES.append(dict(id=id, nom=nom, gabarit=gab, habitats=habitats, densite=densite, couleur=coul, especes=especes, **kw))

TER = ['foret', 'prairie', 'maquis', 'steppe', 'montagne', 'taiga']
G('abeilles-bourdons', 'Abeilles et bourdons', 'abeille', TER + ['marais'], 500000, '#a07a2a', [
    ('Apis mellifera', 'Abeille domestique', .35), ('Bombus terrestris', 'Bourdon terrestre', .15), ('Bombus lapidarius', 'Bourdon des pierres', .08),
    ('Bombus pascuorum', 'Bourdon des champs', .1), ('Andrena flavipes', 'Andrène à pattes jaunes', .06), ('Osmia bicornis', 'Osmie rousse', .06),
    ('Lasioglossum calceatum', 'Halicte', .08), ('Xylocopa violacea', 'Abeille charpentière', .04), ('Bombus lucorum', 'Bourdon des saules', .08)],
  masse=.0001, taille=.013, longevite=.15, maturite=.08, portee=30, regime='herbivore', diete={'nectar': 1}, soc=.9, tem=.4, vit=7, act='diurne', role='pollinisateurs')
G('papillons-jour', 'Papillons de jour', 'papillon', TER + ['marais'], 20000, '#d8a040', [
    ('Pieris rapae', 'Piéride de la rave', .2), ('Pieris brassicae', 'Piéride du chou', .1), ('Aglais io', 'Paon-du-jour', .1), ('Vanessa atalanta', 'Vulcain', .08),
    ('Maniola jurtina', 'Myrtil', .15), ('Polyommatus icarus', "Azuré de la bugrane", .1), ('Gonepteryx rhamni', 'Citron', .08),
    ('Coenonympha pamphilus', 'Fadet commun', .1), ('Aglais urticae', 'Petite tortue', .09)],
  masse=.0003, taille=.05, longevite=.1, maturite=.15, portee=200, regime='herbivore', diete={'nectar': .6, 'feuilles': .4}, soc=.1, tem=.05, vit=4, act='diurne', role='pollinisateurs (adultes), phytophages (chenilles)')
G('syrphes', 'Syrphes et mouches des fleurs', 'mouche', TER + ['marais'], 50000, '#c89a2a', [
    ('Episyrphus balteatus', 'Syrphe ceinturé', .35), ('Eristalis tenax', 'Éristale gluante', .2), ('Syrphus ribesii', 'Syrphe du groseillier', .15),
    ('Sphaerophoria scripta', 'Sphérophorie', .15), ('Helophilus pendulus', 'Hélophile suspendu', .15)],
  masse=.00005, taille=.012, longevite=.08, maturite=.1, portee=300, regime='omnivore', diete={'nectar': .7, 'insectes': .3}, soc=.1, tem=.05, vit=5, act='diurne', role='pollinisateurs ; larves mangeuses de pucerons')
G('chenilles-defoliatrices', 'Chenilles défoliatrices', 'chenille', ['foret', 'taiga', 'maquis'], 2000000, '#6a8a3a', [
    ('Operophtera brumata', 'Cheimatobie hiémale', .3), ('Tortrix viridana', 'Tordeuse verte du chêne', .2), ('Lymantria dispar', 'Bombyx disparate', .1),
    ('Thaumetopoea processionea', 'Processionnaire du chêne', .1), ('Thaumetopoea pityocampa', 'Processionnaire du pin', .15), ('Erannis defoliaria', 'Hibernie défeuillante', .15)],
  masse=.0002, taille=.03, longevite=.2, maturite=.6, portee=150, regime='herbivore', diete={'feuilles': 1}, soc=.5, tem=.05, vit=.01, act='continue', role='phytophages des arbres ; pullulations')
G('pucerons', 'Pucerons', 'insecte', ['prairie', 'foret', 'maquis', 'steppe'], 500000000, '#6a9a4a', [
    ('Aphis fabae', 'Puceron noir de la fève', .3), ('Myzus persicae', 'Puceron vert du pêcher', .2), ('Acyrthosiphon pisum', 'Puceron du pois', .15),
    ('Sitobion avenae', 'Puceron des épis', .2), ('Rhopalosiphum padi', 'Puceron du merisier', .15)],
  masse=.000001, taille=.002, longevite=.08, maturite=.03, portee=600, regime='herbivore', diete={'feuilles': 1}, soc=.9, tem=0, vit=.001, act='continue', role='phytophages (sève) ; proies des coccinelles et des syrphes')
G('criquets-sauterelles', 'Criquets et sauterelles', 'insecte', ['prairie', 'steppe', 'maquis', 'montagne'], 3000000, '#7a8a3a', [
    ('Chorthippus parallelus', 'Criquet des pâtures', .3), ('Chorthippus brunneus', 'Criquet duettiste', .2), ('Roeseliana roeselii', 'Decticelle bariolée', .15),
    ('Tettigonia viridissima', 'Grande sauterelle verte', .1), ('Gryllus campestris', 'Grillon champêtre', .15), ('Calliptamus italicus', 'Criquet italien', .1)],
  masse=.0008, taille=.025, longevite=.4, maturite=.4, portee=100, regime='herbivore', diete={'feuilles': .9, 'insectes': .1}, soc=.3, tem=.05, vit=1, act='diurne', role='phytophages des herbes ; proies des oiseaux')
G('coleopteres-phytophages', 'Hannetons, doryphores et chrysomèles', 'coleoptere', ['prairie', 'foret', 'steppe'], 2000000, '#8a5a2a', [
    ('Melolontha melolontha', 'Hanneton commun', .3), ('Leptinotarsa decemlineata', 'Doryphore', .2), ('Phyllopertha horticola', 'Hanneton horticole', .2),
    ('Oulema melanopus', 'Criocère des céréales', .2), ('Chrysolina americana', 'Chrysomèle du romarin', .1)],
  masse=.0005, taille=.015, longevite=.5, maturite=1, portee=60, regime='herbivore', diete={'feuilles': 1}, soc=.2, tem=.05, vit=.1, act='crepusculaire', role='phytophages ; larves dans le sol')
G('scolytes', 'Scolytes', 'coleoptere', ['taiga', 'foret', 'montagne'], 1000000, '#5a3a24', [
    ('Ips typographus', 'Typographe', .5), ('Pityogenes chalcographus', 'Chalcographe', .25), ('Tomicus piniperda', 'Hylésine du pin', .25)],
  masse=.00001, taille=.005, longevite=.5, maturite=.15, portee=60, regime='herbivore', diete={'feuilles': 1}, soc=.8, tem=0, vit=.01, act='diurne', role='ravageurs des résineux (sous l\'écorce) ; pullulent après les sécheresses')
G('fourmis', 'Fourmis', 'insecte', TER, 300000000, '#5a2e1e', [
    ('Lasius niger', 'Fourmi noire des jardins', .35), ('Formica rufa', 'Fourmi rousse des bois', .15), ('Myrmica rubra', 'Myrmique rouge', .2),
    ('Formica polyctena', 'Fourmi des bois', .1), ('Lasius flavus', 'Fourmi jaune', .2)],
  masse=.000005, taille=.005, longevite=1, maturite=.15, portee=50, regime='omnivore', diete={'insectes': .4, 'nectar': .4, 'graines': .2}, soc=1, tem=.6, vit=.05, act='diurne', role='prédatrices, éleveuses de pucerons, disperseuses de graines')
G('carabes', 'Carabes et coléoptères prédateurs du sol', 'coleoptere', ['foret', 'prairie', 'taiga', 'montagne'], 3000000, '#2a3a2a', [
    ('Carabus nemoralis', 'Carabe des bois', .2), ('Pterostichus melanarius', 'Ptérostique noir', .3), ('Poecilus cupreus', 'Poecile cuivré', .2),
    ('Nebria brevicollis', 'Nébrie', .15), ('Carabus auratus', 'Carabe doré', .15)],
  masse=.0003, taille=.02, longevite=1.5, maturite=1, portee=40, regime='carnivore', diete={'insectes': 1}, soc=.05, tem=.5, vit=.2, act='nocturne', role='prédateurs des limaces et des larves')
G('araignees', 'Araignées', 'araignee', TER + ['marais'], 5000000, '#5a4a3a', [
    ('Araneus diadematus', 'Épeire diadème', .25), ('Pisaura mirabilis', 'Pisaure admirable', .15), ('Pardosa amentata', 'Lycose', .2),
    ('Eratigena atrica', 'Tégénaire noire', .1), ('Linyphia triangularis', 'Linyphie', .3)],
  masse=.0001, taille=.01, longevite=1, maturite=.8, portee=200, regime='carnivore', diete={'insectes': 1}, soc=.05, tem=.4, vit=.3, act='continue', role='prédatrices des insectes')
G('coccinelles', 'Coccinelles', 'coleoptere', ['prairie', 'foret', 'maquis'], 100000, '#c02a1e', [
    ('Coccinella septempunctata', 'Coccinelle à sept points', .4), ('Harmonia axyridis', 'Coccinelle asiatique', .3), ('Adalia bipunctata', 'Coccinelle à deux points', .15),
    ('Propylea quatuordecimpunctata', 'Coccinelle à damier', .15)],
  masse=.00003, taille=.007, longevite=1, maturite=.1, portee=400, regime='carnivore', diete={'insectes': 1}, soc=.4, tem=.2, vit=.05, act='diurne', motif='taches', role='mangeuses de pucerons ; l\'asiatique est invasive')
G('coprophages-necrophages', 'Bousiers et nécrophores', 'coleoptere', ['prairie', 'foret', 'montagne', 'steppe'], 100000, '#2a2a3a', [
    ('Geotrupes stercorarius', 'Géotrupe du fumier', .25), ('Anoplotrupes stercorosus', 'Géotrupe des bois', .25), ('Nicrophorus vespilloides', 'Nécrophore', .2),
    ('Aphodius fimetarius', 'Aphodie', .2), ('Silpha atrata', 'Silphe noir', .1)],
  masse=.0005, taille=.015, longevite=1, maturite=1, portee=20, regime='detritivore', diete=None, soc=.1, tem=.1, vit=.1, act='crepusculaire', role='décomposeurs des bouses et des cadavres')
G('cloportes-mille-pattes', 'Cloportes et mille-pattes', 'crustace', ['foret', 'prairie', 'maquis', 'grotte'], 50000000, '#5a5650', [
    ('Oniscus asellus', 'Cloporte commun', .3), ('Porcellio scaber', 'Cloporte rugueux', .25), ('Armadillidium vulgare', 'Cloporte boule', .2),
    ('Glomeris marginata', 'Gloméris', .15), ('Tachypodoiulus niger', 'Iule à pattes blanches', .1)],
  masse=.00005, taille=.012, longevite=2, maturite=1, portee=40, regime='detritivore', diete=None, soc=.6, tem=0, vit=.02, act='nocturne', role='décomposeurs de la litière', force_corps=dict(organes=[]))
G('vers-de-terre', 'Vers de terre', 'ver', ['prairie', 'foret', 'maquis', 'montagne'], 50000000, '#a0645a', [
    ('Lumbricus terrestris', 'Lombric commun', .3), ('Aporrectodea caliginosa', 'Ver gris', .3), ('Allolobophora chlorotica', 'Ver vert', .15),
    ('Lumbricus rubellus', 'Ver rouge', .15), ('Eisenia fetida', 'Ver du fumier', .1)],
  masse=.001, taille=.1, longevite=4, maturite=.5, portee=30, regime='detritivore', diete=None, soc=.3, tem=0, vit=.005, act='nocturne', role='décomposeurs, laboureurs du sol')
G('limaces-escargots', 'Limaces et escargots', 'escargot', ['foret', 'prairie', 'maquis'], 2000000, '#8a6a4a', [
    ('Arion vulgaris', 'Loche espagnole', .3), ('Deroceras reticulatum', 'Limace grise', .25), ('Cepaea nemoralis', 'Escargot des haies', .2),
    ('Cornu aspersum', 'Petit-gris', .15), ('Helix pomatia', 'Escargot de Bourgogne', .1)],
  masse=.005, taille=.05, longevite=2, maturite=1, portee=200, regime='herbivore', diete={'feuilles': 1}, soc=.1, tem=0, vit=.002, act='nocturne', role='phytophages, détritivores ; proies des hérissons, des grives')
G('moustiques', 'Moustiques', 'mouche', ['marais', 'riviere', 'lac', 'prairie', 'foret', 'taiga', 'toundra'], 10000000, '#5a5048', [
    ('Culex pipiens', 'Moustique commun', .45), ('Aedes vexans', 'Moustique des inondations', .2), ('Aedes albopictus', 'Moustique tigre', .15),
    ('Anopheles maculipennis', 'Anophèle', .1), ('Ochlerotatus cantans', 'Moustique des bois', .1)],
  masse=.000003, taille=.006, longevite=.05, maturite=.03, portee=600, regime='omnivore', diete={'nectar': .6, 'sang': .4}, soc=.4, tem=.6, vit=.5, act='crepusculaire', eau='douce', role='piqueurs, vecteurs ; larves aquatiques ; le tigre est invasif')
G('tiques', 'Tiques', 'araignee', ['foret', 'prairie', 'maquis'], 100000, '#5a3424', [
    ('Ixodes ricinus', 'Tique du mouton', .85), ('Dermacentor reticulatus', 'Dermacentor', .15)],
  masse=.00001, taille=.004, longevite=2.5, maturite=2, portee=2000, regime='carnivore', diete={'sang': 1}, soc=.1, tem=.8, vit=.001, act='continue', role='piqueurs, vecteurs (maladie de Lyme, encéphalite à tiques)')
G('libellules', 'Libellules et demoiselles', 'libellule', ['marais', 'prairie', 'foret'], 20000, '#2a6a8a', [
    ('Anax imperator', 'Anax empereur', .1), ('Libellula depressa', 'Libellule déprimée', .15), ('Sympetrum striolatum', 'Sympétrum strié', .2),
    ('Calopteryx splendens', 'Caloptéryx éclatant', .2), ('Ischnura elegans', 'Agrion élégant', .25), ('Aeshna cyanea', 'Aeschne bleue', .1)],
  masse=.0004, taille=.05, longevite=1, maturite=1, portee=500, regime='carnivore', diete={'insectes': 1}, soc=.1, tem=.6, vit=10, act='diurne', role='chasseuses d\'insectes ; larves aquatiques')
G('larves-aquatiques', 'Éphémères, trichoptères et chironomes', 'larve', ['riviere', 'lac', 'marais'], 500000000, '#6a5a3a', [
    ('Baetis rhodani', 'Éphémère', .2), ('Ephemera danica', 'Mouche de mai', .15), ('Hydropsyche angustipennis', 'Trichoptère', .2),
    ('Chironomus plumosus', 'Chironome', .3), ('Limnephilus lunatus', 'Phrygane', .15)],
  masse=.00002, taille=.012, longevite=1, maturite=.8, portee=1000, regime='omnivore', diete={'feuilles': .75, 'insectes': .25}, soc=.6, tem=0, vit=.05, act='continue', eau='douce', role='décomposeurs et brouteurs des cours d\'eau ; nourriture des truites')
G('crustaces-eau-douce', "Gammares et écrevisses", 'crustace', ['riviere', 'lac', 'marais'], 20000000, '#7a6a5a', [
    ('Gammarus pulex', 'Gammare', .45), ('Asellus aquaticus', 'Aselle', .3), ('Astacus astacus', 'Écrevisse à pattes rouges', .05),
    ('Pacifastacus leniusculus', 'Écrevisse signal', .1), ('Procambarus clarkii', 'Écrevisse de Louisiane', .1)],
  masse=.0002, taille=.02, longevite=1.5, maturite=1, portee=50, regime='detritivore', diete=None, soc=.5, tem=.2, vit=.1, act='nocturne', eau='douce', role='décomposeurs des feuilles mortes ; deux écrevisses américaines invasives')
G('zooplancton-eau-douce', "Zooplancton d'eau douce", 'plancton', ['lac', 'marais'], 50000000000, '#c8b89a', [
    ('Daphnia pulex', 'Daphnie', .3), ('Daphnia magna', 'Grande daphnie', .15), ('Cyclops strenuus', 'Cyclope', .2),
    ('Bosmina longirostris', 'Bosmine', .2), ('Eudiaptomus gracilis', 'Diaptome', .15)],
  masse=.0000001, taille=.002, longevite=.1, maturite=.02, portee=200, regime='filtreur', diete=None, soc=.9, tem=0, vit=.005, act='continue', eau='douce', role='mangent le phytoplancton ; nourriture des alevins')
G('zooplancton-marin', 'Zooplancton marin et krill', 'plancton', ['large', 'mer-froide', 'cote'], 10000000000, '#d8a890', [
    ('Calanus finmarchicus', 'Calanus', .35), ('Calanus helgolandicus', 'Calanus du sud', .15), ('Temora longicornis', 'Témora', .15),
    ('Acartia clausi', 'Acartia', .15), ('Meganyctiphanes norvegica', 'Krill nordique', .1), ('Oithona similis', 'Oithona', .1)],
  masse=.000001, taille=.004, longevite=.4, maturite=.15, portee=500, regime='filtreur', diete=None, soc=.9, tem=0, vit=.01, act='continue', eau='salee', role='base de la chaîne marine : harengs, maquereaux, baleines')
G('coquillages-filtreurs', 'Moules, huîtres et coques', 'bivalve', ['cote'], 1000000, '#2a2a3a', [
    ('Mytilus edulis', 'Moule commune', .4), ('Mytilus galloprovincialis', 'Moule méditerranéenne', .2), ('Cerastoderma edule', 'Coque', .2),
    ('Magallana gigas', 'Huître creuse', .15), ('Ostrea edulis', 'Huître plate', .05)],
  masse=.02, taille=.06, longevite=10, maturite=1.5, portee=1000000, regime='filtreur', diete=None, soc=.9, tem=0, vit=0, act='continue', eau='salee', role='filtreurs de l\'estran ; proies des eiders et des goélands')
G('benthos-estran', "Vers, crevettes et crabes de l'estran", 'crustace', ['cote'], 2000000, '#8a6a4a', [
    ('Arenicola marina', 'Arénicole', .3), ('Hediste diversicolor', 'Néréis', .2), ('Crangon crangon', 'Crevette grise', .25),
    ('Carcinus maenas', 'Crabe vert', .2), ('Littorina littorea', 'Bigorneau', .05)],
  masse=.005, taille=.06, longevite=3, maturite=1, portee=2000, regime='detritivore', diete=None, soc=.5, tem=.2, vit=.2, act='continue', eau='salee', role='décomposeurs et petits prédateurs de la vase ; proies des limicoles et des poissons plats')
G('meduses', 'Méduses', 'meduse', ['large', 'cote', 'mer-froide'], 1000, '#d8c8e8', [
    ('Aurelia aurita', 'Méduse commune', .5), ('Pelagia noctiluca', 'Pélagie', .2), ('Rhizostoma pulmo', 'Rhizostome', .15), ('Cyanea capillata', 'Cyanée chevelue', .15)],
  masse=.2, taille=.25, longevite=.5, maturite=.3, portee=10000, regime='carnivore', diete={'insectes': 1}, soc=.6, tem=.3, vit=.05, act='continue', eau='salee', role='prédatrices du zooplancton ; proies des tortues caouannes', note='« insectes » = petits invertébrés (zooplancton)')
G('petits-passereaux-insectivores', 'Petits passereaux insectivores', 'passereau', ['foret', 'prairie', 'maquis', 'taiga'], 300, '#7a7a4a', [
    ('Phylloscopus collybita', 'Pouillot véloce', .2), ('Regulus regulus', 'Roitelet huppé', .1), ('Troglodytes troglodytes', 'Troglodyte mignon', .15),
    ('Sylvia atricapilla', 'Fauvette à tête noire', .2), ('Ficedula hypoleuca', 'Gobemouche noir', .05), ('Phylloscopus trochilus', 'Pouillot fitis', .1),
    ('Aegithalos caudatus', 'Mésange à longue queue', .07), ('Motacilla alba', 'Bergeronnette grise', .08), ('Prunella modularis', 'Accenteur mouchet', .05)],
  soc=.3, tem=.2, vit=10, role='insectivores des feuillages ; beaucoup migrent')
G('petits-passereaux-granivores', 'Petits passereaux granivores', 'passereau', ['prairie', 'steppe', 'maquis', 'foret'], 150, '#9a7a4a', [
    ('Carduelis carduelis', 'Chardonneret élégant', .2), ('Carduelis chloris', "Verdier d'Europe", .2), ('Linaria cannabina', 'Linotte mélodieuse', .15),
    ('Emberiza citrinella', 'Bruant jaune', .15), ('Passer montanus', 'Moineau friquet', .15), ('Pyrrhula pyrrhula', 'Bouvreuil pivoine', .05), ('Spinus spinus', 'Tarin des aulnes', .1)],
  soc=.7, tem=.15, vit=12, role='granivores des friches et des champs')
G('grives', 'Grives', 'passereau', ['foret', 'prairie', 'taiga'], 40, '#8a6a4a', [
    ('Turdus philomelos', 'Grive musicienne', .4), ('Turdus viscivorus', 'Grive draine', .15), ('Turdus pilaris', 'Grive litorne', .3), ('Turdus iliacus', 'Grive mauvis', .15)],
  soc=.5, tem=.25, vit=14, motif='taches', role='mangeuses de vers, d\'escargots et de baies ; gibier')
G('musaraignes', 'Musaraignes', 'musaraigne', ['foret', 'prairie', 'marais', 'taiga', 'toundra'], 1500, '#4a3e36', [
    ('Sorex araneus', 'Musaraigne carrelet', .4), ('Sorex minutus', 'Musaraigne pygmée', .15), ('Crocidura russula', 'Crocidure musette', .3),
    ('Neomys fodiens', 'Musaraigne aquatique', .05), ('Crocidura leucodon', 'Crocidure leucode', .1)],
  soc=.05, tem=.6, vit=1, role='insectivores du sol ; proies des chouettes')
G('petits-poissons-eau-douce', "Petits poissons d'eau douce", 'poisson', ['riviere', 'lac', 'marais'], 100000, '#8a9078', [
    ('Phoxinus phoxinus', 'Vairon', .25), ('Gasterosteus aculeatus', 'Épinoche', .2), ('Gobio gobio', 'Goujon', .15), ('Alburnus alburnus', 'Ablette', .2),
    ('Barbatula barbatula', 'Loche franche', .1), ('Cottus gobio', 'Chabot', .1)],
  masse=.01, taille=.08, longevite=4, maturite=1.5, portee=1000, regime='omnivore', diete={'insectes': .8, 'feuilles': .2}, soc=.8, tem=.05, vit=1, act='diurne', eau='douce', role='fourrage des brochets, des hérons, des martins-pêcheurs')
G('poissons-fourrage-marins', 'Lançons et gobies', 'anguille', ['cote', 'mer-froide'], 200000, '#a0a890', [
    ('Ammodytes tobianus', 'Lançon', .35), ('Ammodytes marinus', 'Lançon du nord', .3), ('Pomatoschistus minutus', 'Gobie buhotte', .2), ('Pomatoschistus microps', 'Gobie tacheté', .15)],
  masse=.01, taille=.12, longevite=4, maturite=1.5, portee=5000, regime='filtreur', diete=None, soc=.9, tem=.05, vit=1, act='diurne', eau='salee', role='fourrage des macareux, des sternes, des phoques')

G('collemboles-acariens', 'Collemboles et acariens du sol', 'insecte', TER + ['marais', 'toundra'], 100000000000, '#8a7a6a', [
    ('Folsomia candida', 'Folsomie', .15), ('Isotoma viridis', 'Isotome verte', .12), ('Orchesella cincta', 'Orchésella', .1), ('Lepidocyrtus lanuginosus', 'Lépidocyrte', .12),
    ('Tomocerus minor', 'Tomocère', .08), ('Sminthurus viridis', 'Sminthure vert', .08), ('Protaphorura armata', 'Onychiure', .1),
    ('Oppiella nova', 'Oppie', .1), ('Platynothrus peltifer', 'Platynothre', .08), ('Steganacarus magnus', 'Stéganacare', .07)],
  masse=.00000001, taille=.0015, longevite=.5, maturite=.1, portee=100, regime='detritivore', diete=None, soc=.8, tem=0, vit=.05, act='continue', role='mangeurs de champignons et de litière ; la proie des araignées, des carabes et des fourmis')

# les densités des guildes d'invertébrés (en un habitat favorable, par km²) : la littérature, et non plus des nombres ronds. Avec les premiers
# nombres, il y avait dans le monde autant d'araignées que d'insectes à manger (0,15 g/m² contre 0,36), quand le monde réel en a des
# dizaines de fois plus (docs/53). Les autres guildes gardent une densité estimée
SOURCES_DENSITE = {
    'fourmis': 'Schultheiss et al. 2022, PNAS 119:e2201550119 (~2·10^16 fourmis sur Terre ; des centaines par m² au sol des forêts et des prairies tempérées)',
    'collemboles-acariens': 'Petersen & Luxton 1982, Oikos 39:288-388 (collemboles et acariens : 10^4 à 10^5 par m² chacun dans les sols tempérés)',
    'cloportes-mille-pattes': 'Petersen & Luxton 1982, Oikos 39:288-388 (des dizaines à des centaines par m² dans la litière)',
    'carabes': 'Lövei & Sunderland 1996, Annu. Rev. Entomol. 41:231-256 (quelques-uns à quelques dizaines par m²)',
    'pucerons': 'ordre de grandeur des comptages en prairie et en culture (des centaines à des milliers par m² en saison ; Dixon 1998, Aphid Ecology)',
    'criquets-sauterelles': 'ordre de grandeur des relevés en prairie (un à vingt orthoptères par m² en été)',
    'coleopteres-phytophages': 'ordre de grandeur (des adultes et des larves du sol : quelques-uns par m²)',
    'moustiques': 'ordre de grandeur (des petits diptères piqueurs : une dizaine par m²)',
    'larves-aquatiques': 'Allan & Castillo 2007, Stream Ecology (des centaines à des milliers de larves par m² de fond)',
    'crustaces-eau-douce': 'ordre de grandeur (les gammares : des dizaines à des centaines par m² de fond)',
    'zooplancton-eau-douce': "ordre de grandeur (quelques dizaines par litre sur quelques mètres d'eau : ~5·10^4 par m² de lac)",
    'zooplancton-marin': "Moriarty & O'Brien 2013, Earth Syst. Sci. Data 5:45-55 (COPEPOD : quelques grammes à quelques dizaines de grammes de mésozooplancton par m² de mer)",
}

# ---------------------------------------------------------------------------------------------------------------------------
# LA FLORE : des espèces dominantes, ou des groupes (« especes ») quand une seule ne dit rien (les graminées des prés, le
# phytoplancton). « forme » : une forme de moteur/diversite.js (ou une des huit d'origine de moteur/flore.js) ; le port s'en
# déduit. « h » : la hauteur adulte (m) ; « feuillage » : caduc ou persistant ; « rendement » : ce qu'elle donne aux bêtes (docs/48) ;
# « car » : ses caractères (docs/48) ; « defense » : toxique et/ou epineux (docs/17), avec la part des pieds qui la portent ;
# « vie » / « mat » : durée de vie et âge de la première graine, en ans ; « part » : la part de la place de son port qu'elle prend
# dans ses habitats (estimée).
# ---------------------------------------------------------------------------------------------------------------------------
PLANTES = []
def V(id, nom, sci, forme, habitats, h, part, coul, **kw):
    PLANTES.append(dict(id=id, nom=nom, sci=sci, forme=forme, habitats=habitats, h=h, part=part, couleur=coul, **kw))

# les arbres
V('chene-pedoncule', 'Chêne pédonculé', 'Quercus robur', 'arbre', ['foret', 'prairie'], 30, .25, '#4a6a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .8, 'nectar': 0}, car=['vent'], vie=500, mat=40)
V('chene-sessile', 'Chêne sessile', 'Quercus petraea', 'arbre', ['foret', 'montagne'], 30, .2, '#4a6a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .8, 'nectar': 0}, car=['vent'], vie=500, mat=40)
V('hetre', 'Hêtre commun', 'Fagus sylvatica', 'arbre', ['foret', 'montagne'], 35, .3, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .6, 'nectar': 0}, car=['vent'], vie=250, mat=40)
V('charme', 'Charme', 'Carpinus betulus', 'arbre', ['foret'], 20, .1, '#5a7a32', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': 0}, car=['vent'], vie=150, mat=20)
V('frene', 'Frêne élevé', 'Fraxinus excelsior', 'arbre', ['foret', 'riviere'], 30, .08, '#5a7a3a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': 0}, car=['vent'], vie=200, mat=25, note='décimé par la chalarose (champignon)')
V('erable-sycomore', 'Érable sycomore', 'Acer pseudoplatanus', 'arbre', ['foret', 'montagne'], 30, .06, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': .4}, vie=250, mat=25)
V('chataignier', 'Châtaignier', 'Castanea sativa', 'arbre', ['foret', 'maquis'], 25, .08, '#5a6a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': 1, 'nectar': .5}, car=['mellifere'], vie=500, mat=25)
V('tilleul', 'Tilleul à petites feuilles', 'Tilia cordata', 'arbre', ['foret'], 25, .05, '#6a8a32', feuillage='caduc', rendement={'feuilles': 1, 'graines': .2, 'nectar': .8}, car=['mellifere'], vie=500, mat=25)
V('aulne', 'Aulne glutineux', 'Alnus glutinosa', 'arbre', ['marais', 'foret', 'riviere'], 20, .3, '#4a6a32', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': 0}, car=['vent', 'echasses'], vie=120, mat=15)
V('saule-blanc', 'Saule blanc', 'Salix alba', 'arbre', ['marais', 'foret', 'prairie'], 20, .25, '#8a9a6a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .1, 'nectar': .6}, car=['rapide'], vie=100, mat=10)
V('bouleau-verruqueux', 'Bouleau verruqueux', 'Betula pendula', 'pionnier', ['foret', 'taiga', 'marais'], 25, .12, '#7a9a4a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': 0}, car=['vent', 'rapide'], vie=100, mat=10)
V('bouleau-pubescent', 'Bouleau pubescent', 'Betula pubescens', 'pionnier', ['taiga', 'toundra', 'marais'], 15, .2, '#7a9a4a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .4, 'nectar': 0}, car=['vent', 'rapide'], vie=100, mat=10)
V('tremble', 'Peuplier tremble', 'Populus tremula', 'pionnier', ['foret', 'taiga'], 20, .08, '#7a9a3a', feuillage='caduc', rendement={'feuilles': 1, 'graines': .1, 'nectar': 0}, car=['vent', 'rapide'], vie=100, mat=10)
V('sorbier', 'Sorbier des oiseleurs', 'Sorbus aucuparia', 'fruitier', ['foret', 'taiga', 'montagne'], 12, .04, '#6a8a32', feuillage='caduc', rendement={'feuilles': 1, 'fruits': 1, 'nectar': .5}, car=['fruits_charnus'], vie=100, mat=15)
V('chene-vert', 'Chêne vert', 'Quercus ilex', 'arbre', ['maquis', 'foret'], 20, .35, '#3a5a2a', feuillage='persistant', rendement={'feuilles': .8, 'graines': .8, 'nectar': 0}, car=['vent', 'coriace'], vie=500, mat=20)
V('chene-liege', 'Chêne-liège', 'Quercus suber', 'arbre', ['maquis', 'foret'], 20, .15, '#3a5a2a', feuillage='persistant', rendement={'feuilles': .8, 'graines': .8, 'nectar': 0}, car=['vent', 'pyrophyte', 'coriace'], vie=300, mat=20)
V('olivier', 'Olivier', 'Olea europaea', 'fruitier', ['maquis'], 10, .2, '#6a7a5a', feuillage='persistant', rendement={'feuilles': .7, 'fruits': 1, 'nectar': 0}, car=['vent', 'racines_profondes', 'coriace'], vie=1000, mat=10, note='sauvage et cultivé')
V('pin-sylvestre', 'Pin sylvestre', 'Pinus sylvestris', 'conifere', ['taiga', 'foret', 'montagne'], 30, .35, '#3a5a3a', feuillage='persistant', rendement={'feuilles': .6, 'graines': .5}, car=['vent'], vie=300, mat=15)
V('epicea', 'Épicéa commun', 'Picea abies', 'conifere', ['taiga', 'montagne', 'foret'], 40, .4, '#2a4a32', feuillage='persistant', rendement={'feuilles': .6, 'graines': .5}, car=['vent'], vie=300, mat=30)
V('sapin-blanc', 'Sapin blanc', 'Abies alba', 'conifere', ['montagne', 'foret'], 40, .2, '#2a4a3a', feuillage='persistant', rendement={'feuilles': .6, 'graines': .4}, car=['vent'], vie=500, mat=30)
V('meleze', "Mélèze d'Europe", 'Larix decidua', 'conifere', ['montagne', 'sommets'], 35, .15, '#5a7a3a', feuillage='caduc', rendement={'feuilles': .7, 'graines': .4}, car=['vent'], vie=500, mat=15)
V('pin-alep', "Pin d'Alep", 'Pinus halepensis', 'conifere', ['maquis'], 20, .25, '#4a6a3a', feuillage='persistant', rendement={'feuilles': .5, 'graines': .5}, car=['vent', 'pyrophyte'], vie=150, mat=15)
V('pin-maritime', 'Pin maritime', 'Pinus pinaster', 'conifere', ['foret', 'maquis', 'cote'], 30, .2, '#3a5a32', feuillage='persistant', rendement={'feuilles': .5, 'graines': .5}, car=['vent', 'pyrophyte'], vie=200, mat=15)
# les buissons et les lianes
V('noisetier', 'Noisetier', 'Corylus avellana', 'buisson', ['foret', 'prairie'], 5, .2, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'graines': 1, 'nectar': 0}, car=['vent'], vie=80, mat=8)
V('aubepine', 'Aubépine', 'Crataegus monogyna', 'epine', ['prairie', 'foret'], 6, .15, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': .8, 'nectar': .6}, defense={'epineux': .9}, vie=200, mat=8)
V('prunellier', 'Prunellier', 'Prunus spinosa', 'epine', ['prairie', 'foret', 'maquis'], 3, .15, '#4a6a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': .7, 'nectar': .6}, defense={'epineux': .95}, vie=60, mat=4)
V('ronce', 'Ronce commune', 'Rubus fruticosus', 'ronce', ['foret', 'prairie', 'maquis'], 1.5, .25, '#4a6a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': 1, 'nectar': .5}, defense={'epineux': .95}, vie=10, mat=2)
V('sureau', 'Sureau noir', 'Sambucus nigra', 'baies', ['foret', 'prairie', 'riviere'], 6, .08, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': 1, 'nectar': .5}, defense={'toxique': .5}, vie=60, mat=4)
V('lierre', 'Lierre grimpant', 'Hedera helix', 'liane', ['foret'], 20, .1, '#2a4a2a', feuillage='persistant', rendement={'feuilles': 1, 'fruits': .6, 'nectar': .8}, car=['mellifere'], defense={'toxique': .8}, vie=400, mat=10)
V('callune', 'Callune', 'Calluna vulgaris', 'bruyere', ['prairie', 'marais', 'montagne', 'taiga'], .5, .5, '#8a4a7a', feuillage='persistant', rendement={'feuilles': .8, 'nectar': 1, 'graines': .2}, car=['mellifere', 'pyrophyte'], vie=30, mat=2)
V('myrtille', 'Myrtille', 'Vaccinium myrtillus', 'baies', ['taiga', 'foret', 'montagne'], .4, .4, '#3a5a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': 1, 'nectar': .4}, car=['fruits_charnus'], vie=30, mat=3)
V('genevrier', 'Genévrier commun', 'Juniperus communis', 'baies', ['montagne', 'prairie', 'taiga', 'toundra'], 3, .1, '#3a5a3a', feuillage='persistant', rendement={'feuilles': .6, 'fruits': .6}, car=['vent', 'coriace'], defense={'epineux': .9}, vie=200, mat=10)
V('bruyere-arborescente', 'Bruyère arborescente', 'Erica arborea', 'bruyere', ['maquis'], 3, .3, '#5a7a3a', feuillage='persistant', rendement={'feuilles': .8, 'nectar': 1, 'graines': .2}, car=['pyrophyte'], vie=60, mat=4)
V('ciste', 'Ciste de Montpellier', 'Cistus monspeliensis', 'aromatique', ['maquis'], 1, .35, '#5a6a3a', feuillage='persistant', rendement={'feuilles': .8, 'nectar': .9, 'graines': .3}, car=['pyrophyte', 'coriace'], defense={'toxique': .6}, vie=15, mat=2)
V('romarin', 'Romarin', 'Salvia rosmarinus', 'aromatique', ['maquis'], 1, .2, '#5a6a4a', feuillage='persistant', rendement={'feuilles': .8, 'nectar': 1, 'graines': .2}, car=['coriace', 'mellifere'], defense={'toxique': .4}, vie=20, mat=2)
V('lentisque', 'Pistachier lentisque', 'Pistacia lentiscus', 'buisson', ['maquis', 'cote'], 3, .25, '#3a5a2a', feuillage='persistant', rendement={'feuilles': .8, 'fruits': .7}, car=['vent', 'coriace'], vie=100, mat=5)
V('saule-nain', 'Saule herbacé', 'Salix herbacea', 'coussin', ['toundra', 'sommets'], .05, .3, '#6a8a3a', feuillage='caduc', rendement={'feuilles': 1, 'nectar': .3}, vie=50, mat=5)
# les herbes
V('graminees-prairie', 'Graminées des prés', 'Poaceae', 'herbe', ['prairie', 'steppe', 'montagne'], .8, .6, '#7a9a3a', groupe=[('Dactylis glomerata', 'Dactyle aggloméré', .2), ('Lolium perenne', 'Ray-grass anglais', .2), ('Festuca rubra', 'Fétuque rouge', .15),
    ('Arrhenatherum elatius', 'Fromental', .15), ('Poa pratensis', 'Pâturin des prés', .1), ('Holcus lanatus', 'Houlque laineuse', .1), ('Anthoxanthum odoratum', 'Flouve odorante', .1)],
  rendement={'feuilles': 1, 'graines': .6}, car=['vent'], vie=10, mat=1)
V('fleurs-des-pres', 'Fleurs des prés', 'Magnoliopsida', 'fleur', ['prairie', 'montagne', 'steppe'], .5, .25, '#d8c040', groupe=[('Taraxacum officinale', 'Pissenlit', .25), ('Ranunculus acris', 'Bouton d\'or', .2), ('Leucanthemum vulgare', 'Marguerite', .15),
    ('Plantago lanceolata', 'Plantain lancéolé', .15), ('Achillea millefolium', 'Achillée millefeuille', .15), ('Centaurea jacea', 'Centaurée jacée', .1)],
  rendement={'feuilles': .7, 'nectar': 1, 'graines': .3}, vie=5, mat=1)
V('trefle', 'Trèfle blanc', 'Trifolium repens', 'legumineuse', ['prairie'], .2, .1, '#6a9a3a', rendement={'feuilles': 1.2, 'nectar': .6, 'graines': .3}, car=['mellifere'], vie=5, mat=1)
V('ortie', 'Grande ortie', 'Urtica dioica', 'herbe', ['foret', 'prairie', 'riviere'], 1.2, .1, '#4a6a2a', rendement={'feuilles': 1, 'graines': .4}, car=['vent'], defense={'toxique': .9}, vie=10, mat=1, note='« toxique » : les poils urticants')
V('fougere-aigle', 'Fougère aigle', 'Pteridium aquilinum', 'fougere', ['foret', 'prairie', 'montagne'], 1.5, .3, '#5a7a2a', rendement={'feuilles': 1}, defense={'toxique': .95}, vie=50, mat=3)
V('ail-ours', 'Ail des ours', 'Allium ursinum', 'bulbe', ['foret'], .3, .1, '#4a8a3a', rendement={'feuilles': .6, 'nectar': .6}, car=['bulbe'], vie=10, mat=3)
V('stipe', 'Stipe à feuilles de jonc', 'Stipa capillata', 'herbe', ['steppe'], .8, .4, '#b0a868', rendement={'feuilles': .9, 'graines': .5}, car=['vent', 'racines_profondes'], vie=20, mat=2)
V('silene-acaule', 'Silène acaule', 'Silene acaulis', 'coussin', ['sommets', 'toundra'], .05, .2, '#d878a8', rendement={'feuilles': .8, 'nectar': .6}, car=['coriace'], vie=100, mat=10)
V('mousses-forestieres', 'Mousses des forêts', 'Bryophyta', 'mousse', ['taiga', 'foret', 'montagne'], .05, .3, '#4a7a2a', groupe=[('Hylocomium splendens', 'Hylocomie brillante', .35), ('Pleurozium schreberi', 'Hypne de Schreber', .35), ('Hypnum cupressiforme', 'Hypne cyprès', .3)],
  rendement={'feuilles': .7}, vie=20, mat=1)
V('sphaignes', 'Sphaignes', 'Sphagnum', 'sphaigne', ['marais', 'taiga', 'toundra'], .1, .5, '#8a9a3a', groupe=[('Sphagnum magellanicum', 'Sphaigne de Magellan', .3), ('Sphagnum fuscum', 'Sphaigne brune', .3), ('Sphagnum capillifolium', 'Sphaigne capillaire', .2), ('Sphagnum fallax', 'Sphaigne trompeuse', .2)],
  rendement={'feuilles': .5}, car=['coriace'], vie=50, mat=1)
# les plantes d'eau et les algues
V('roseau-commun', 'Roseau commun', 'Phragmites australis', 'roseau', ['marais', 'lac', 'riviere', 'cote'], 3, .5, '#8a9a5a', rendement={'feuilles': 1, 'graines': .3}, car=['vent'], vie=20, mat=2)
V('massette', 'Massette à larges feuilles', 'Typha latifolia', 'roseau', ['marais', 'lac'], 2, .2, '#7a8a4a', rendement={'feuilles': 1, 'graines': .3}, car=['vent'], vie=10, mat=1)
V('jonc', 'Jonc épars', 'Juncus effusus', 'jonc', ['marais', 'prairie'], .8, .3, '#5a7a3a', rendement={'feuilles': 1, 'graines': .3}, car=['vent'], vie=10, mat=1)
V('nenuphar', 'Nénuphar blanc', 'Nymphaea alba', 'nenuphar', ['lac', 'marais'], .3, .2, '#3a6a3a', rendement={'feuilles': 1, 'nectar': .6, 'graines': .3}, vie=30, mat=3)
V('lentille-eau', "Petite lentille d'eau", 'Lemna minor', 'lentille', ['lac', 'marais'], .01, .2, '#6aaa3a', rendement={'feuilles': 1}, car=['rapide'], vie=.5, mat=.05)
V('posidonie', 'Posidonie', 'Posidonia oceanica', 'herbier', ['cote'], .8, .4, '#3a6a4a', rendement={'feuilles': 1, 'graines': .1}, vie=50, mat=5, note='endémique de Méditerranée')
V('zostere', 'Zostère marine', 'Zostera marina', 'herbier', ['cote'], .6, .3, '#3a6a3a', rendement={'feuilles': 1, 'graines': .2}, vie=10, mat=1)
V('laminaires', 'Laminaires', 'Laminariaceae', 'varech', ['cote', 'mer-froide'], 3, .5, '#6a5a2a', groupe=[('Laminaria hyperborea', 'Laminaire rugueuse', .5), ('Laminaria digitata', 'Laminaire digitée', .3), ('Saccharina latissima', 'Laminaire sucrée', .2)],
  rendement={'feuilles': 1}, vie=15, mat=2)
V('fucus', 'Fucus', 'Fucus', 'algue', ['cote', 'mer-froide'], .6, .4, '#7a6a2a', groupe=[('Fucus vesiculosus', 'Fucus vésiculeux', .5), ('Fucus serratus', 'Fucus denté', .3), ('Ascophyllum nodosum', 'Ascophylle', .2)],
  rendement={'feuilles': 1}, vie=5, mat=1)
V('phytoplancton-marin', 'Phytoplancton marin', 'Bacillariophyceae', 'plancton', ['large', 'mer-froide', 'cote'], .01, 1, '#5a9a7a', groupe=[('Skeletonema costatum', 'Skeletonema (diatomée)', .25), ('Chaetoceros socialis', 'Chaetoceros (diatomée)', .2), ('Emiliania huxleyi', 'Emiliania (coccolithophore)', .2),
    ('Tripos fusus', 'Ceratium (dinoflagellé)', .15), ('Phaeocystis globosa', 'Phaeocystis', .2)],
  rendement={'feuilles': 1}, car=['rapide'], vie=.02, mat=.005)
V('phytoplancton-eau-douce', "Phytoplancton d'eau douce", 'Chlorophyceae', 'plancton', ['lac', 'marais', 'riviere'], .01, 1, '#6aaa5a', groupe=[('Asterionella formosa', 'Asterionella (diatomée)', .3), ('Microcystis aeruginosa', 'Microcystis (cyanobactérie)', .25), ('Scenedesmus quadricauda', 'Scenedesmus (algue verte)', .25),
    ('Aulacoseira granulata', 'Aulacoseira (diatomée)', .2)],
  rendement={'feuilles': 1}, car=['rapide'], vie=.02, mat=.005)
# les lichens
V('lichens-rennes', 'Lichens des rennes', 'Cladonia', 'lichen_rennes', ['toundra', 'taiga', 'sommets'], .08, .6, '#c8c8a8', groupe=[('Cladonia rangiferina', 'Cladonie des rennes', .4), ('Cladonia stellaris', 'Cladonie étoilée', .35), ('Cladonia arbuscula', 'Cladonie arbuscule', .25)],
  rendement={'feuilles': 1.2}, vie=100, mat=5)
V('lichen-geographique', 'Lichen géographique', 'Rhizocarpon geographicum', 'lichen_croute', ['sommets', 'toundra', 'montagne'], .005, .4, '#b8c040', rendement={'feuilles': .6}, car=['coriace'], vie=1000, mat=20)
# les cultures
V('ble', 'Blé tendre', 'Triticum aestivum', 'cereale', ['prairie', 'steppe'], 1, .3, '#c8b060', rendement={'feuilles': .8, 'graines': 1.5}, car=['vent'], vie=1, mat=.8, culture=True)
V('mais', 'Maïs', 'Zea mays', 'cereale', ['prairie'], 2.5, .15, '#8aaa3a', rendement={'feuilles': 1, 'graines': 1.5}, car=['vent'], vie=.5, mat=.4, culture=True)
V('colza', 'Colza', 'Brassica napus', 'fleur', ['prairie', 'steppe'], 1.5, .08, '#e0d040', rendement={'feuilles': 1, 'graines': 1, 'nectar': 1.2}, car=['mellifere'], vie=1, mat=.9, culture=True)
V('vigne', 'Vigne', 'Vitis vinifera', 'liane', ['maquis', 'prairie'], 2, .05, '#5a7a2a', feuillage='caduc', rendement={'feuilles': 1, 'fruits': 1.2, 'nectar': .1}, vie=80, mat=3, culture=True)
# les champignons (au port « champignon » ; comestibilité : Wikidata P789)
V('cepe', 'Cèpe de Bordeaux', 'Boletus edulis', 'champignon', ['foret', 'taiga'], .2, .2, '#8a5a34', rendement={'feuilles': 1}, vie=.05, mat=.03, champignon='mycorhizien')
V('girolle', 'Girolle', 'Cantharellus cibarius', 'champignon', ['foret', 'taiga'], .08, .2, '#e0a030', rendement={'feuilles': 1}, vie=.1, mat=.05, champignon='mycorhizien')
V('amanite-tue-mouches', 'Amanite tue-mouches', 'Amanita muscaria', 'champignon', ['foret', 'taiga'], .2, .15, '#d0281e', rendement={'feuilles': 1}, vie=.05, mat=.03, champignon='mycorhizien', defense={'toxique': 1})
V('chalarose', 'Chalarose du frêne', 'Hymenoscyphus fraxineus', 'moisissure', ['foret', 'riviere'], .005, .05, '#e8e0d0', rendement={'feuilles': .1}, vie=.1, mat=.05, champignon='pathogène du frêne', note='invasif (Asie) depuis les années 1990')

# L'OCCUPATION : la part de ses habitats que l'espèce occupe vraiment dans ses cellules de présence (une cellule H3 de résolution 2
# fait ~80 000 km² : une espèce n'en tient pas toute la forêt). La densité posée (densite_km2) est la densité d'un habitat favorable
# × cette part. Par défaut, la médiane de celles que donnent les espèces dont on connaît l'effectif européen (especes-controle.py) ;
# pour elles, la leur, calée sur ce chiffre (le monde tel que l'assembleur le pose, hors Russie, Biélorussie et Ukraine).
OCCUPATION_DEFAUT = .4
OCCUPATION = {'chevreuil': .38, 'sanglier': .53, 'cerf-elaphe': .19, 'loup': .25, 'ours-brun': .45, 'lynx-boreal': .41, 'glouton': .5}
# des aires très morcelées (des réserves, des parcs, des massifs) : une part estimée, pour approcher les effectifs connus en gros
# (bison d'Europe : ~7 000 en liberté ; bouquetin des Alpes : ~55 000 ; daim : de l'ordre du million — ordres de grandeur, non vérifiés)
OCCUPATION_ESTIMEE = {'bison-europe': .015, 'bouquetin-alpes': .12, 'daim': .06}

# Les habitats des fichiers d'une carte qui n'auraient pas les noms de moteur/biomes-universels.json : { 'cultures': 'prairie', … }
HABITATS_CARTE = {}
