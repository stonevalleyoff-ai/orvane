#!/usr/bin/env python3
# Le banc d'essai de la passerelle Cataclysm : un faux dossier de jeu, de fausses sauvegardes,
# et tout ce que la passerelle en fait, sans réseau.
#
#   python3 traducteurs/cataclysm/banc.py
#   python3 traducteurs/cataclysm/banc.py --cdda-source CHEMIN   (le code source du jeu 0.I :
#                                                  vérifie aussi le mod contre ses données)
#
# Licence : PolyForm Shield 1.0.0, https://polyformproject.org/licenses/shield/1.0.0
# Required Notice: Copyright StoneValley (https://github.com/stonevalleyoff-ai/orvane)

import argparse
import copy
import ctypes
import ctypes.util
import glob
import io
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from contextlib import redirect_stdout

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
sys.path.insert(0, ICI)
import passerelle as P  # noqa: E402

INSTANTANE = os.path.join(RACINE, 'mondes', 'orvane', 'instantane.json')
GENERATION_0 = os.path.join(RACINE, 'mondes', 'orvane', 'generation-0.json')

echecs = []


def ok(condition, message):
    print(('  ✓ ' if condition else '  ✗ ') + message)
    if not condition:
        echecs.append(message)


def lancer(*args):
    """La passerelle comme en ligne de commande ; rend ce qu'elle a écrit."""
    tampon = io.StringIO()
    with redirect_stdout(tampon):
        P.main(list(args))
    return tampon.getvalue()


# --- Fabriquer des sauvegardes -------------------------------------------------------------------


def trame_brute(contenu):
    """Une trame zstd valide faite de blocs non compressés (RFC 8878)."""
    out = bytearray(struct.pack('<I', P.ZSTD_MAGIC))
    out.append((2 << 6) | (1 << 5))                    # taille sur 4 octets, segment unique
    out += struct.pack('<I', len(contenu))
    morceaux = [contenu[i:i + 100000] for i in range(0, len(contenu), 100000)] or [b'']
    for i, m in enumerate(morceaux):
        dernier = 1 if i == len(morceaux) - 1 else 0
        h = dernier | (0 << 1) | (len(m) << 3)
        out += bytes((h & 0xFF, (h >> 8) & 0xFF, (h >> 16) & 0xFF)) + m
    return bytes(out)


def libzstd():
    for nom in [ctypes.util.find_library('zstd'), 'libzstd.so.1']:
        if not nom:
            continue
        try:
            lib = ctypes.CDLL(nom)
        except OSError:
            continue
        lib.ZSTD_compressBound.restype = ctypes.c_size_t
        lib.ZSTD_compressBound.argtypes = [ctypes.c_size_t]
        lib.ZSTD_compress.restype = ctypes.c_size_t
        lib.ZSTD_compress.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_size_t,
                                      ctypes.c_int]
        lib.ZSTD_findFrameCompressedSize.restype = ctypes.c_size_t
        lib.ZSTD_findFrameCompressedSize.argtypes = [ctypes.c_char_p, ctypes.c_size_t]
        return lib
    return None


def trame_compressee(contenu, lib):
    dst = ctypes.create_string_buffer(lib.ZSTD_compressBound(len(contenu)))
    n = lib.ZSTD_compress(dst, len(dst), contenu, len(contenu), 3)
    return dst.raw[:n]


def sautable(variante, charge):
    return struct.pack('<II', P.SAUTABLE_MIN + variante, len(charge)) + charge


def zzip(entrees):
    """Une archive à la façon du jeu : l'en-tête, les entrées (nom, empreinte, trame), du vide,
    puis un index de fin (ici du bruit : la passerelle ne le lit pas)."""
    out = sautable(15, b'\x00' * 12)
    for nom, trame in entrees:
        out += sautable(0, nom.encode()) + sautable(1, b'\x11' * 8) + trame
    return out + b'\x00' * 300 + b'\xde\xad\xbe\xef index flexbuffer'


def texte_sauvegarde(kills):
    corps = {'savegame_loading_version': 36, 'turn': 1234,
             'kill_tracker': {'kills': kills, 'npc_kills': ['Bandit']},
             'stats_tracker': {}, 'player': {'name': 'Essai'}}
    return ('# version 36\n' + json.dumps(corps)).encode('utf-8')


def ecrire(chemin, octets):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, 'wb') as f:
        f.write(octets)


def lots(dossier):
    return [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(dossier, '*.json')))
            if not f.endswith('.erreur.json')]


def comptes_des(liste):
    out = {}
    for lot in liste:
        for e in lot['evenements']:
            out[(e['taxon'], e['biome'])] = out.get((e['taxon'], e['biome']), 0) + e['n']
    return out


def verifier_avec_node(chemins):
    if not shutil.which('node'):
        print('  (node absent : lots non passés au vérificateur d\'Orvane)')
        return
    for c in chemins:
        r = subprocess.run(['node', os.path.join(RACINE, 'outils', 'verifier.js'), '--lot', c],
                           capture_output=True, text=True)
        ok(r.returncode == 0, 'outils/verifier.js accepte %s' % os.path.basename(c)
           + ('' if r.returncode == 0 else ' :\n' + r.stdout + r.stderr))


# --- Le mod contre les données du jeu ---------------------------------------------------------


def verifier_contre_le_jeu(source, creatures, groupes):
    print('\nLe mod contre les données du jeu (%s)' % source)
    donnees = os.path.join(source, 'data', 'json')
    mons, grp = {}, {}
    for f in glob.glob(os.path.join(donnees, '**', '*.json'), recursive=True):
        try:
            contenu = json.load(open(f, encoding='utf-8'))
        except (ValueError, UnicodeDecodeError):
            continue
        for o in contenu if isinstance(contenu, list) else [contenu]:
            if not isinstance(o, dict):
                continue
            if o.get('type') == 'MONSTER':
                for i in (o.get('id') or o.get('abstract'),):
                    for j in (i if isinstance(i, list) else [i]):
                        mons[j] = o
            elif o.get('type') == 'monstergroup':
                grp[o.get('id') or o.get('name')] = o

    def resolu(i, n=0):
        o = mons[i]
        if 'copy-from' in o and n < 10:
            base = dict(resolu(o['copy-from'], n + 1))
            base.update(o)
            return base
        return o

    modeles = {m for paliers in P.MODELES.values() for _, m in paliers}
    manquants = sorted(m for m in modeles if m not in mons)
    ok(not manquants, 'les %d modèles existent dans le jeu %s' % (len(modeles), manquants or ''))
    feconds = {m for m in modeles if m in mons and resolu(m).get('reproduction')}
    ok(feconds == P.MODELES_FECONDS,
       'MODELES_FECONDS suit le jeu (en trop : %s, oubliés : %s)'
       % (sorted(P.MODELES_FECONDS - feconds), sorted(feconds - P.MODELES_FECONDS)))
    sauvages = [m for m in modeles if m in mons and 'WILDLIFE' not in (resolu(m).get('categories') or [])
                and resolu(m).get('species') not in (['INSECT'], ['SPIDER'], ['FISH'], ['REPTILE'], ['BIRD'])]
    ok(not sauvages, 'chaque modèle est un animal sauvage %s' % (sauvages or ''))
    for g in P.GROUPES:
        o = grp.get(g['groupe'])
        ok(o is not None, '%s existe dans le jeu' % g['groupe'])
        if o:
            somme = sum(m.get('weight', m.get('freq', 1)) for m in o.get('monsters', []))
            ok(somme == g['poids_jeu'], '%s : poids du jeu %d (passerelle : %d)'
               % (g['groupe'], somme, g['poids_jeu']))
            ok(o.get('is_animal') is True, '%s est un groupe d\'animaux' % g['groupe'])
    deja = [c['id'] for c in creatures if c['id'] in mons]
    ok(not deja, 'aucune créature ne prend l\'identifiant d\'un monstre du jeu')
    deja = [g['id'] for g in groupes if g['id'].startswith('GROUP_ORVANE') and g['id'] in grp]
    ok(not deja, 'aucun groupe Orvane ne prend l\'identifiant d\'un groupe du jeu')
    with open(os.path.join(source, 'src', 'color.cpp'), encoding='utf-8') as f:
        couleurs = set(re.findall(r'"c_([a-z_]+)"', f.read()))
    ok(set(P.COULEURS) <= couleurs, 'les couleurs existent dans le jeu %s' % sorted(set(P.COULEURS) - couleurs))


# --- Le banc ---------------------------------------------------------------------------------------


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cdda-source', help='le code source du jeu 0.I, pour vérifier le mod contre ses données')
    a = ap.parse_args()

    inst = json.load(open(INSTANTANE, encoding='utf-8'))
    tmp = tempfile.mkdtemp(prefix='banc-cataclysm-')
    cdda = os.path.join(tmp, 'cdda')
    try:
        for monde in ('Monde-A', 'Monde-B'):
            ecrire(os.path.join(cdda, 'save', monde, 'mods.json'), b'["dda"]')

        print('Les identifiants')
        tous = [t['id'] for t in inst['taxons']]
        ok(all(P.relire_id(P.id_creature(b, t)) == (b, t) for t in tous for b in P.BIOMES),
           'chaque lignée se relit depuis l\'identifiant de sa créature (%d lignées, dont %s)'
           % (len(tous), ', '.join(t for t in tous if not re.fullmatch(r'[a-z0-9-]+', t))[:60]))
        ok(all(re.fullmatch(r'[a-z0-9_\-]+', P.id_creature(b, t)) for t in tous for b in P.BIOMES),
           'les identifiants n\'ont que des lettres, des chiffres, _ et -')
        ok(P.relire_id('mon_zombie') is None and P.relire_id('mon_orvane_mer_x') is None,
           'un monstre du jeu ou un biome inconnu ne se relit pas')

        print('\npreparer')
        sortie = lancer('--cdda', cdda, 'preparer', '--instantane', INSTANTANE,
                        '--generation-0', GENERATION_0, '--hors-ligne', '--activer', 'Monde-A')
        print('    ' + sortie.strip().replace('\n', '\n    '))
        dm = os.path.join(cdda, 'mods', 'orvane')
        info = json.load(open(os.path.join(dm, 'modinfo.json'), encoding='utf-8'))
        creatures = json.load(open(os.path.join(dm, 'creatures.json'), encoding='utf-8'))
        groupes = json.load(open(os.path.join(dm, 'groupes.json'), encoding='utf-8'))
        ok(info[0]['id'] == 'orvane' and info[0]['dependencies'] == ['dda'], 'modinfo.json : le mod « orvane »')
        ids = [c['id'] for c in creatures]
        ok(len(ids) == len(set(ids)) and len(ids) > 50, '%d créatures, sans doublon' % len(ids))
        definies = set(ids)
        membres = [m['monster'] for g in groupes if g['id'].startswith('GROUP_ORVANE') for m in g['monsters']]
        ok(all(m in definies for m in membres), 'chaque créature d\'un groupe est définie')
        sous = {g['id'] for g in groupes if g['id'].startswith('GROUP_ORVANE')}
        ext = [g for g in groupes if not g['id'].startswith('GROUP_ORVANE')]
        ok(all(m['group'] in sous for g in ext for m in g['monsters']), 'les groupes du jeu reçoivent des groupes Orvane')
        ok(all(g['is_animal'] is True and 'override' not in g for g in ext),
           'les groupes du jeu sont complétés, pas remplacés, et restent des groupes d\'animaux')
        ok({g['id'] for g in ext} <= {g['groupe'] for g in P.GROUPES}, 'seulement les groupes de faune prévus')
        ok(all(re.fullmatch(r'\d+ g', c['weight']) and re.fullmatch(r'\d+ ml', c['volume']) for c in creatures),
           'poids et volumes au format du jeu (« 350 g », « 350 ml »)')
        ok(all(c['upgrades'] is False for c in creatures), 'aucune créature ne grandit en monstre du jeu')
        ok(all(c['reproduction']['baby_type']['baby_monster'] == c['id'] for c in creatures if 'reproduction' in c),
           'les petits sont de la même lignée')
        ok(all(c['color'] in P.COULEURS for c in creatures), 'des couleurs connues')
        eau = [c for c in creatures if c['copy-from'].startswith('mon_fish_')]
        ok(all(P.nageuse(next(t for t in inst['taxons'] if P.id_creature(P.relire_id(c['id'])[0], t['id']) == c['id']))
               for c in eau), 'seules les lignées d\'eau deviennent des poissons')
        mods_a = json.load(open(os.path.join(cdda, 'save', 'Monde-A', 'mods.json')))
        mods_b = json.load(open(os.path.join(cdda, 'save', 'Monde-B', 'mods.json')))
        ok(mods_a == ['dda', 'orvane'] and mods_b == ['dda'], 'le mod activé dans Monde-A seulement')
        etat = json.load(open(os.path.join(cdda, 'orvane-passerelle', 'etat.json'), encoding='utf-8'))
        ok(etat['cycle'] == inst['cycle']['n'] and etat['compte'].startswith('h:'),
           'l\'état retient le cycle %s et un compte anonyme' % etat['cycle'])

        # Des bêtes dans les sauvegardes.
        foret = [c['id'] for c in creatures if c['id'].startswith('mon_orvane_foret_')]
        marais = [c['id'] for c in creatures if c['id'].startswith('mon_orvane_marais_')]
        x, y, z = foret[0], foret[1], marais[0]
        tx, ty, tz = P.relire_id(x), P.relire_id(y), P.relire_id(z)
        dA = os.path.join(cdda, 'save', 'Monde-A')
        ecrire(os.path.join(dA, '#RXNzYWk=.sav'), texte_sauvegarde({x: 3, 'mon_zombie': 40, y: 1}))
        lib = libzstd()
        ancienne = trame_brute(texte_sauvegarde({z: 1}))
        nouvelle = trame_compressee(texte_sauvegarde({z: 4, x: 2}), lib) if lib else \
            trame_brute(texte_sauvegarde({z: 4, x: 2}))
        ecrire(os.path.join(dA, '#QXV0cmU=.sav.zzip'),
               zzip([('#QXV0cmU=.sav', ancienne), ('#QXV0cmU=.log', trame_brute(b'journal')),
                     ('#QXV0cmU=.sav', nouvelle)]))
        ecrire(os.path.join(cdda, 'save', 'Monde-B', '#Qg==.sav'), texte_sauvegarde({x: 9}))

        print('\nLire les sauvegardes')
        ok(P.tues(P.lire_sauvegarde(os.path.join(dA, '#RXNzYWk=.sav'))) == {x: 3, 'mon_zombie': 40, y: 1},
           'une sauvegarde en clair (« # version 36 » puis le JSON)')
        dec = P.decompresseur_zstd()
        ok(dec is not None, 'un décompresseur zstd est disponible ici')
        lu = P.tues(P.lire_sauvegarde(os.path.join(dA, '#QXV0cmU=.sav.zzip'), dec))
        ok(lu == {z: 4, x: 2}, 'une sauvegarde compressée : la dernière version de la fiche (%s)'
           % ('trame compressée par libzstd' if lib else 'trame brute'))
        if lib:
            t = trame_compressee(b'x' * 5000 + bytes(range(256)) * 50, lib)
            ok(P.longueur_trame(t + b'reste', 0) == lib.ZSTD_findFrameCompressedSize(t, len(t)),
               'la longueur d\'une trame est celle que donne libzstd')

        print('\ncompter --essai')
        sortie = lancer('--cdda', cdda, 'compter', '--essai')
        print('    ' + sortie.strip().replace('\n', '\n    '))
        de = os.path.join(cdda, 'orvane-passerelle')
        essais = lots(os.path.join(de, 'essais'))
        attendu = {tx[::-1]: 5, ty[::-1]: 1, tz[::-1]: 4}
        ok(comptes_des(essais) == attendu, 'les bêtes d\'Orvane tuées dans Monde-A, ni zombies ni Monde-B')
        ok(all(e['action'] == 'prelevement' for l in essais for e in l['evenements']), 'des prélèvements')
        ok(all(l['source']['jeu'] == 'cataclysm-dark-days-ahead' and l['monde'] == 'orvane'
               and l['instantane'] == inst['cycle']['n'] and l['familles'] == ['animale'] for l in essais),
           'le lot dit le jeu, le monde, le cycle et la famille')
        ok(not os.path.isdir(os.path.join(de, 'lots')), 'un essai ne laisse rien à envoyer')
        verifier_avec_node(sorted(glob.glob(os.path.join(de, 'essais', '*.json'))))
        lancer('--cdda', cdda, 'compter', '--essai')
        ok(comptes_des(lots(os.path.join(de, 'essais'))) == {k: 2 * v for k, v in attendu.items()},
           'un essai ne retient rien : le suivant compte pareil')

        print('\ncompter')
        lancer('--cdda', cdda, 'compter')
        ok(comptes_des(lots(os.path.join(de, 'lots'))) == attendu, 'le premier compte')
        verifier_avec_node(sorted(glob.glob(os.path.join(de, 'lots', '*.json'))))
        lancer('--cdda', cdda, 'compter')
        ok(comptes_des(lots(os.path.join(de, 'lots'))) == attendu, 'rien de neuf : pas de nouveau lot')
        ecrire(os.path.join(dA, '#RXNzYWk=.sav'), texte_sauvegarde({x: 5, 'mon_zombie': 41, y: 1}))
        lancer('--cdda', cdda, 'compter')
        ok(comptes_des(lots(os.path.join(de, 'lots'))) == {**attendu, tx[::-1]: 7},
           'seulement les bêtes tuées depuis (2 de plus)')
        ecrire(os.path.join(dA, '#RXNzYWk=.sav'), texte_sauvegarde({x: 4, y: 1}))
        n_avant = len(lots(os.path.join(de, 'lots')))
        lancer('--cdda', cdda, 'compter')
        ok(len(lots(os.path.join(de, 'lots'))) == n_avant, 'une sauvegarde plus ancienne rechargée ne renvoie rien')

        print('\nenvoyer (sans réseau : Orvane est imité)')
        attente = sorted(glob.glob(os.path.join(de, 'lots', '*.json')))
        ok(len(attente) == 2, 'deux lots en attente')
        shutil.copy(attente[0], os.path.join(de, 'lots', 'zz-troisieme.json'))
        reponses = [{'ok': True}, {'ok': False, 'erreur': 'lot mal formé'},
                    {'ok': False, 'erreur': 'quota du jeu atteint pour aujourd\'hui'}]
        appels = []

        def faux_depot(lot, compte, cle=P.CLE_JEU, delai=60):
            appels.append((lot, compte, cle))
            return reponses[len(appels) - 1] if len(appels) <= len(reponses) else {'ok': True}
        vrai, P.deposer = P.deposer, faux_depot
        try:
            lancer('--cdda', cdda, 'envoyer')
        finally:
            P.deposer = vrai
        ok(len(appels) == 3, 'trois dépôts tentés, puis l\'arrêt sur le quota')
        ok(all(c == P.CLE_JEU and not c.startswith('orvadm_') for _, _, c in appels), 'avec la clé du jeu')
        ok(all(cpt == l['source']['compte'] for l, cpt, _ in appels), 'le compte du dépôt est celui du lot')
        ok(len(lots(os.path.join(de, 'envoyes'))) == 1, 'un lot accepté rangé dans envoyes/')
        ok(len(lots(os.path.join(de, 'refuses'))) == 1, 'un lot refusé mis de côté dans refuses/')
        ok(len(lots(os.path.join(de, 'lots'))) == 1, 'le lot arrêté par le quota attend')

        print('\nUn monde refait de zéro')
        autre = copy.deepcopy(inst)
        autre['monde']['ne'] = '2030-01-01T00:00:00Z'
        autre['taxons'] = [t for t in autre['taxons'] if t['id'] != tx[1]]
        chemin = os.path.join(tmp, 'autre.json')
        json.dump(autre, open(chemin, 'w', encoding='utf-8'))
        lancer('--cdda', cdda, 'preparer', '--instantane', chemin, '--hors-ligne')
        creatures2 = json.load(open(os.path.join(dm, 'creatures.json'), encoding='utf-8'))
        groupes2 = json.load(open(os.path.join(dm, 'groupes.json'), encoding='utf-8'))
        ok(x in {c['id'] for c in creatures2}, 'la créature d\'une lignée disparue reste définie')
        ok(x not in {m.get('monster') for g in groupes2 for m in g['monsters']}, '… mais n\'apparaît plus')
        shutil.rmtree(os.path.join(de, 'lots'))
        ecrire(os.path.join(dA, '#RXNzYWk=.sav'), texte_sauvegarde({x: 9, y: 1}))
        lancer('--cdda', cdda, 'compter')
        ok(not lots(os.path.join(de, 'lots')), 'ses bêtes tuées ne sont plus renvoyées')

        if a.cdda_source:
            verifier_contre_le_jeu(a.cdda_source, creatures, groupes)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print('\n%s' % ('Tout passe.' if not echecs else '%d échec(s).' % len(echecs)))
    sys.exit(1 if echecs else 0)


if __name__ == '__main__':
    main()
