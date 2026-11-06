# L'hébergement : un monde pour tous les jeux, sans serveur

Orvane fait vivre **un seul monde**, `mondes/orvane/`, et tous les jeux s'y branchent. Chaque jeu le montre à sa façon (ses espèces, ses sols, ses variantes) et y renvoie ce que font ses joueurs. Chaque heure, l'action GitHub `cycle` regarde chaque monde : celui dont l'heure est venue avance (une fois par jour pour le monde d'Orvane, `monde.cycle`, docs/19), et le résultat est commité ; GitHub Pages le sert, avec CORS ouvert, à tous les traducteurs. Les pressions des joueurs passent par **le Supabase d'Orvane**, qui n'appartient à aucun jeu.

```
mondes/orvane/
  profil.json         le profil du monde : où lire les pressions, comment elles pèsent (influence)
  amorce.json         le monde né de la genèse (moteur/genese.js sur moteur/biomes-universels.json)
  generation-0.json   l'amorce, publiée telle quelle au premier cycle : les traducteurs s'y comparent
  etat.json           l'instantané courant, complet : le moteur repart de là
  instantane.json     le même, compact, avec le cycle d'avant allégé (precedent) : ce que les traducteurs lisent
  historique.json     les derniers cycles allégés (profil.monde.historique) : ce que l'observatoire trace
  jeux.json           les jeux branchés et ce que chacun montre (exposition) : chaque traducteur y lit la sienne
  tampon.json         la mémoire du tampon (lissage) et la dernière ligne lue
  lots/               des lots déposés à la main (lus puis rangés dans lots/traites/)
  chronique/          l'histoire du monde (docs/37) : index.json (les dernières entrées, les années, les records) et <année>.json
  museum.json         un spécimen par lignée, gardé après son extinction, avec sa cause et son nom commun (docs/37)
  noms/               des noms proposés à la main (lus puis rangés dans noms/traites/) ; noms-refuses.json : la modération
```

## Le monde

Il est né de la genèse « universelle » : 24 biomes neutres (de la banquise aux abysses, la terre, l'eau douce, la mer, le sous-sol), 19 ancêtres très simples (des brouteurs, un fouisseur, un insecte, un oiseau ; des prédateurs à chaque étage de taille, du mangeur d'insectes au grand rôdeur, un rapace, un serpent, une grenouille ; des filtreurs, des chasseurs d'eau douce, des récifs et du large, un crabe), 900 cycles d'évolution accélérée : 112 lignées, dont 13 vrais carnivores. L'eau douce et la mer sont distinctes : une bête nageuse porte `plan.eau` (`douce`, `salee` ou `mixte`), et un poisson de lac ne vit pas au large. Le monde a ses propres règles (`monde.regles`, docs/13) : un omnivore tire moins des plantes qu'un herbivore et ne dispute aux carnivores qu'une part de leurs proies. Aucun jeu n'en a dessiné la faune : chaque jeu la traduit (pour Stone Valley, `traducteurs/stone-valley/correspondance.js` : ses sols deviennent des biomes du monde, ses gabarits rendent les lignées).

## Le chemin d'une pression

1. Le joueur chasse, lie, croise des bêtes : le traducteur du jeu accumule un lot (`schemas/pression.schema.json`).
2. De temps en temps (pour Stone Valley, à une sauvegarde, une fois par demi-heure au plus), le jeu appelle `orvane_deposer(cle, compte, lot)` sur le Supabase d'Orvane, avec la clé publique du projet et **la clé de son jeu**. Le compte est l'identifiant du joueur dans le jeu ; Orvane n'en garde qu'une empreinte.
3. Quand le cycle du monde est dû (l'action passe à la 17ᵉ minute de chaque heure ; le monde d'Orvane, réglé à `24h`, tourne chaque jour vers 03:17 UTC), `hebergement/cycle.js --auto` lit les jeux (`orvane_lire_jeux`) et les lots nouveaux (`orvane_lire_lots`), avec le secret de lecture d'Orvane. Le tampon lit chaque lot avec **l'exposition de son jeu** : une variante que le jeu montre à 2 % mais qui vit à 20 % voit ses pertes redressées, et un jeu qui montre tout tel quel n'est pas redressé. Puis les plafonds (par compte, part d'un seul compte, **part d'un seul jeu**, part d'une population), le lissage, le moteur ; `instantane.json`, `historique.json` et `jeux.json` sont écrits, puis commités.
4. Au prochain lancement du jeu, le traducteur lit `instantane.json` et `jeux.json`, et étale le changement sur `propagation_cycles`.

## Le Supabase d'Orvane

`hebergement/supabase.sql`, collé une fois dans l'éditeur SQL du projet (il peut être recollé). Aucune table n'est lisible directement ; tout passe par huit fonctions :

| fonction | qui l'appelle | ce qu'elle fait |
| --- | --- | --- |
| `orvane_inscrire_jeu(nom, contact)` | n'importe qui | inscrit un jeu ; rend son identifiant, **sa clé** (publique : elle va dans le code du jeu) et **sa clé d'administration** (secrète). 30 inscriptions par heure au plus |
| `orvane_regler_jeu(cle_admin, exposition, nom)` | l'auteur du jeu | ce que le jeu sait montrer (`schemas/profil.schema.json`, `exposition` ; 32 Ko au plus) |
| `orvane_deposer(cle, compte, lot)` | le jeu | un lot : 64 Ko et 500 événements au plus, chacun au contrat (une action connue, `n` de 0 à 10 000), 48 lots par joueur et par jour, et le quota du jeu (500 lots par jour pour un jeu neuf, relevé à la main ; 20 000 pour Stone Valley) |
| `orvane_nommer(cle, compte, monde, taxon, nom, auteur)` | le jeu | un joueur propose le nom commun d'une lignée (docs/37) : 2 à 40 lettres, dix par jour et par joueur ; `deja` dit si quelqu'un l'a devancé |
| `orvane_jeu(cle)` | le jeu | ce qu'Orvane sait du jeu |
| `orvane_lire_lots(secret, monde, après)` | l'action nocturne | les lots, par pages de 1000, comptes pseudonymisés |
| `orvane_lire_jeux(secret)` | l'action nocturne | les jeux et leur exposition |
| `orvane_lire_noms(secret, monde, après)` | l'action nocturne | les noms proposés, dans l'ordre d'arrivée ; le cycle retient le premier valable de chaque lignée (docs/37) |

Les lectures de l'action ne voient que les jeux actifs (suspendre un jeu écarte aussi ses lots en attente), et seulement ce qui est arrivé depuis plus de deux minutes (un dépôt encore en cours n'est jamais sauté). Avec pg_cron, les lots de plus de 14 jours et les noms de plus de 90 jours sont effacés chaque jour ; sans lui, la requête est dans le script, à lancer à la main.

Le secret de lecture n'est gardé que par son empreinte, dans un schéma que l'API ne sert pas. Orvane n'a la clé de service d'aucun jeu, et aucun jeu n'a la sienne.

## Brancher un jeu

Le guide pas à pas, avec les adresses, les appels et les erreurs : [BRANCHER-UN-JEU.md](../BRANCHER-UN-JEU.md). Pour s'inscrire sans écrire de code : la page `inscription/` du site publié (`https://<compte>.github.io/orvane/inscription/`).

1. **S'inscrire** : appeler `orvane_inscrire_jeu` (`POST https://<projet>.supabase.co/rest/v1/rpc/orvane_inscrire_jeu`, en-tête `apikey` : la clé publique du projet, corps `{"p_nom": "Mon jeu"}`). Garder la clé d'administration.
2. **Dire ce qu'on montre** : `orvane_regler_jeu` avec l'exposition du jeu. Sans exposition, le jeu est lu « tel quel ».
3. **Lire le monde** : `https://<compte>.github.io/orvane/mondes/orvane/instantane.json` (docs/1), `generation-0.json` pour le mode relatif, `jeux.json` pour son exposition.
4. **Renvoyer des pressions** : `orvane_deposer` (docs/4), `lot.monde = "orvane"`.

## Mettre en place

- **Supabase** : coller `hebergement/supabase.sql`, puis le script d'installation (qu'on ne publie pas : il pose l'empreinte du secret de lecture, et peut inscrire les premiers jeux). Le profil du monde dit où lire : `monde.pressions` (l'adresse du projet, sa clé **publique**, les deux fonctions de lecture).
- **Secret du dépôt** (Settings › Secrets and variables › Actions) : `ORVANE_LECTURE_SECRET`, le secret de lecture. Il n'ouvre que la lecture des lots et des jeux.
- **L'action** : `.github/workflows/cycle.yml`, qui fait tourner chaque dossier de `mondes/` dont le profil ne dit pas `monde.nocturne = false`, à son rythme (`monde.cycle` et `monde.heure`, au plus `monde.rattrapage` cycles d'un coup : docs/19). « Run workflow » fait tourner chaque monde du nombre de cycles demandé (1 par défaut), sans regarder l'heure. Un dossier qui commence par un point ne passe pas par « Add files › Upload files » : créer le fichier par « Add file › Create new file », en tapant le chemin `.github/workflows/cycle.yml`.
- **Pages** : Settings › Pages, « Deploy from a branch », branche **`publication`**, dossier `/`.

### La branche de publication

Le site (l'accueil, l'observatoire, et les mondes que lisent les jeux) est servi depuis la branche `publication`, que l'action réécrit à chaque passe en **un seul commit, sans historique** : le code de `main`, et l'état de chaque monde. Quand l'état du monde vivait dans `main`, chaque cycle y ajoutait l'état entier (27 Mo réécrits), et le dépôt aurait dépassé le gigaoctet en moins d'un an. Les adresses que lisent les jeux ne changent pas.

- Au début de chaque passe, l'action reprend l'état de chaque monde dans la branche `publication` (`hebergement/publication.js`) : ce que le cycle écrit (`etat.json`, `instantane.json`, `historique.json`, la chronique, le muséum, les morceaux…) vient de la publication ; ce qu'on écrit à la main (`profil.json`, `amorce.json`, `ancetres.json`, `genese.json`, les lots et les noms déposés dans `lots/` et `noms/`) vient de `main`.
- `main` l'emporte quand il porte un état plus récent (un cycle plus avancé) ou un monde né à nouveau (un autre `monde.ne`).
- Un changement poussé sur `main` (le code, un profil) est publié dans la foulée ; un monde ne tourne pas pour autant avant son heure. Une passe sans rien de neuf ne publie rien.
- Les fichiers de `mondes/` que `main` garde sont l'état au moment du passage à la publication : le monde vivant est dans la branche `publication` (`git fetch origin publication`).
- Le premier passage : fusionner, attendre que l'action ait créé la branche `publication` (l'onglet Actions, quelques minutes après la fusion), puis choisir cette branche dans Settings › Pages. Tant que Pages sert `main`, le site garde le monde du dernier cycle publié dans `main`.

## La fiabilité

Trois gardes, qui ne demandent rien d'autre que le dépôt.

### Les vérifications

`.github/workflows/verifications.yml` tourne à chaque PR et à chaque changement de `main` :
- **le contrat** (une minute) : chaque fichier JavaScript se lit ; les types (`types/orvane.d.ts`) sont bien ceux des schémas, et passent `tsc --strict` ; chaque profil, chaque amorce et chaque instantané du dépôt respecte le contrat (`outils/verifier.js`) ;
- **les bancs** : tous, chacun dans sa version courte, en quatre parts de durées à peu près égales, sur quatre machines à la fois (`outils/bancs.js --part k/4`) : une vingtaine de minutes.

Chaque nuit, à 05:23 UTC, elle fait tourner dans leur version entière les bancs qui en ont une courte (le monde à parcelles sur 200 cycles, la stabilité sur 1 000, la fusion, les ponts, la flore, les souches, les machines, les corps). « Run workflow » les lance à la demande (`rapides`, `longs` ou `tous`). Le bilan, banc par banc, est dans le résumé de chaque passe.

Une vérification qu'on sait en échec, et pourquoi, s'affiche « ⚠ connue » : elle ne fait pas échouer son banc, et dit quand elle repasse. Il y en a une, le 6 novembre : la minoritaire de sa bande ne tient plus mieux avec la flore (docs/17).

Pour qu'une PR en échec ne puisse pas être fusionnée : Settings › Branches › « Add branch ruleset » (ou « Add rule ») pour `main`, « Require status checks to pass », et choisir `contrat` et les quatre `bancs (k/4)` (ils n'apparaissent dans la liste qu'après une première passe).

À la main :

```
node outils/bancs.js                  # les bancs rapides (versions courtes)
node outils/bancs.js corps tampon     # ceux-là seulement
node outils/bancs.js --longs          # les bancs longs, entiers
node outils/bancs.js --part 1/4 --liste   # ce que ferait la première des quatre parts, sans rien lancer
```

Un banc nouveau est pris tout seul : il suffit qu'il finisse par `process.exit` (0 s'il passe). S'il est long, qu'il ait une version courte (`--court`) : c'est elle qui tourne à chaque PR, l'entière la nuit. Sa durée se note dans `DUREES` d'`outils/bancs.js`, pour que les quatre parts restent égales.

Les bancs qui partent du monde d'Orvane partent du monde d'avant le mécanisme qu'ils vérifient (`bancs/monde.js`, `etat(['climat'])`) : le monde vivant a depuis éveillé presque tous ses mécanismes, et un banc du « jour de l'éveil » ne vérifiait plus rien (neuf bancs échouaient ainsi le 6 novembre).

### La veille

`.github/workflows/veille.yml` regarde toutes les trois heures si chaque monde qui tourne a eu son dernier cycle (`hebergement/veille.js`, au même rythme que le cycle : `hebergement/rythme.js`). Le monde d'Orvane tourne une fois par jour, à 03:00 UTC : si le cycle d'une heure passée depuis plus de quatre heures n'a pas eu lieu, c'est un retard. Elle regarde aussi ce que montre le site : un site qui montre un cycle plus vieux que la publication n'est pas servi depuis la branche `publication`.

Au premier retard, elle ouvre une issue « veille » (GitHub l'envoie par courriel à qui suit le dépôt), qu'elle tient à jour ; quand tout repart, elle la ferme.

```
node hebergement/veille.js <la branche publication extraite> [--site https://…/] [--maintenant 2026-11-07T09:00:00Z]
```

### Les sauvegardes

La branche `publication` n'a pas d'historique : sans sauvegarde, un état abîmé ne se rattraperait pas. Chaque passe du cycle où un monde a tourné garde donc l'état de ce monde dans un artefact de la passe, « etat-mondes », pendant 30 jours (quelques mégaoctets compressés).

Pour revenir en arrière :
1. Actions › cycle : ouvrir la passe dont on veut l'état. Son numéro est le nombre à la fin de l'adresse de sa page (`…/actions/runs/19234567890`).
2. Actions › cycle › « Run workflow », et dans « restaurer », ce numéro.
3. La passe repart de cet état (`node hebergement/publication.js restaurer`), puis fait les cycles dus (au plus `monde.rattrapage`), et publie.

Ce qu'on écrit à la main (le profil, l'amorce) vient toujours de `main`. Une sauvegarde d'un autre monde (une autre naissance) n'est pas restaurée.

## À la main

```
node hebergement/cycle.js orvane --sans-reseau          # un cycle, lots du dossier seulement (expositions du dernier jeux.json)
node hebergement/cycle.js orvane --cycles 7             # rattraper une semaine (lots en ligne + dossier)
```

Le premier cycle part de l'amorce du profil (`monde.amorce`), et pose la naissance du monde (`monde.ne`). Une **fusion** se commande dans le profil (`monde.fusions : [{ id, source, part }]`) : le cycle de la nuit suivante verse la source dans le monde, une seule fois (docs/14). C'est ainsi que la mer d'Orvane (`mondes/marin/`) rejoint le monde d'Orvane (`mer-1`). Avec `ponts` (`{ id, source, ponts: 3 }`), la source devient plutôt un continent du monde, relié par quelques ponts (docs/23). De même, `monde.parcelles : { par: 4 }` découpe le monde en parcelles au cycle suivant, une fois pour toutes (docs/15) : l'état tourne alors par parcelle, l'instantané publié et l'historique restent par biome. Et `monde.synthetique : true` éveille la Mère au cycle suivant, une fois pour toutes : la vie synthétique (docs/16) ; `monde.flore : true`, la flore (docs/17), dont les plantes sont publiées à part (`flore.json`) ; `monde.pathogenes : true`, les souches (docs/18). Pour repartir de zéro : supprimer `etat.json`, `generation-0.json`, `instantane.json`, `historique.json`, `tampon.json`, et poser dans le profil `monde.renaitre` (une date, `"2026-11-06"`) : la passe suivante repart de `main` au lieu de la branche `publication`, une fois ; une autre date, une autre renaissance. Les traducteurs verront un monde neuf (autre naissance) et repartiront de sa génération 0.

## Les mondes d'avant

`mondes/sv-1/` (le monde fait pour Stone Valley, ses lots dans le Supabase du jeu) et `mondes/genese-7/` (une genèse à observer) restent publiés, mais ne tournent plus (`monde.nocturne = false`). Un lot sans jeu (déposé à la main) est lu avec l'exposition du profil du monde s'il en a une, sinon tel quel.
