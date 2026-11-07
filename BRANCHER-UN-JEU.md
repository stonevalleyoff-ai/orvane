# Brancher un jeu sur Orvane

Orvane fait vivre un seul monde, le monde d'Orvane, et tous les jeux s'y branchent. Un jeu **lit** le monde (des fichiers JSON publiés chaque nuit) et **renvoie** ce que font ses joueurs (des lots de comptes, déposés dans le Supabase d'Orvane). Ce guide donne les étapes, les adresses et les appels exacts. Il se suffit à lui-même, pour un développeur comme pour une IA qui code à sa place ; les chapitres de [docs/](docs/LISEZ-MOI.md) approfondissent la traduction.

## En bref

1. **S'inscrire** sur la [page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/) (ou par un appel) : on reçoit la **clé du jeu**, publique, et la **clé d'administration**, secrète.
2. **Lire le monde** : `instantane.json`, une fois par jour, depuis GitHub Pages. Aucune clé n'est nécessaire.
3. **Traduire** : relier les terrains du jeu aux biomes d'Orvane, et faire de chaque lignée une créature. En TypeScript, `types/orvane.d.ts` donne chaque champ (docs/39).
4. **Régler l'exposition** (facultatif) : dire à Orvane ce que le jeu sait montrer, avec la clé d'administration.
5. **Renvoyer des pressions** : compter ce que font les joueurs et déposer des lots avec `orvane_deposer` et la clé du jeu. `node outils/verifier.js mon-lot.json` dit, avant le premier dépôt, si le lot sera accepté.

## Les adresses

| quoi | adresse |
| --- | --- |
| le monde (lecture, CORS ouvert) | `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/` |
| la page d'inscription | `https://stonevalleyoff-ai.github.io/orvane/inscription/` |
| le Supabase d'Orvane | `https://rospodujiyltmxitykwc.supabase.co` |
| la clé publique du projet (en-tête `apikey`) | `sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8` |
| l'observatoire (voir le monde vivre) | `https://stonevalleyoff-ai.github.io/orvane/` |

La clé publique du projet peut figurer dans le code d'un jeu : elle n'ouvre que les cinq fonctions ci-dessous, et aucune table n'est lisible directement.

Toutes les fonctions s'appellent de la même façon : `POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/<fonction>`, avec les en-têtes `apikey: <clé publique du projet>` et `Content-Type: application/json`, et pour corps un objet JSON de paramètres `p_…`. La réponse est toujours un objet JSON avec `ok` : `{"ok": true, …}` ou `{"ok": false, "erreur": "…"}`. Le code HTTP est 200 dans les deux cas : **c'est `ok` qu'il faut lire**.

| fonction | paramètres | sert à |
| --- | --- | --- |
| `orvane_inscrire_jeu` | `p_nom` (2 à 60 caractères), `p_contact` (facultatif, 200 au plus) | inscrire un jeu, recevoir ses clés |
| `orvane_regler_jeu` | `p_cle_admin`, `p_exposition` (objet, 32 Ko au plus ; `null` le laisse tel quel), `p_nom` (facultatif) | régler ce que le jeu montre, renommer le jeu |
| `orvane_deposer` | `p_cle`, `p_compte`, `p_lot` | déposer un lot de pressions |
| `orvane_jeu` | `p_cle` | vérifier une clé : ce qu'Orvane sait du jeu |
| `orvane_nommer` | `p_cle`, `p_compte`, `p_monde`, `p_taxon`, `p_nom` (2 à 40 lettres), `p_auteur` (facultatif) | un joueur propose le nom commun d'une lignée ; le premier valable l'emporte au cycle suivant (docs/37) |

## 1. S'inscrire

Le plus simple : la [page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/). Ou par un appel :

```sh
curl -X POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_inscrire_jeu \
  -H "apikey: sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8" -H "Content-Type: application/json" \
  -d '{"p_nom": "Mon jeu", "p_contact": "moi@exemple.fr"}'
```

```json
{ "ok": true, "jeu": "mon-jeu", "cle": "orv_3f9c…", "cle_admin": "orvadm_8a21…",
  "note": "la clé va dans le code du jeu ; la clé d'administration se garde secrète (orvane_regler_jeu)" }
```

| champ | ce que c'est | où le garder |
| --- | --- | --- |
| `jeu` | l'identifiant du jeu dans Orvane (`jeux.json`, les lots) | dans le code |
| `cle` | la clé du jeu : elle signe les dépôts | dans le code du jeu, elle est publique |
| `cle_admin` | la clé d'administration : elle règle le jeu | **jamais dans le jeu** ; dans un gestionnaire de mots de passe |

Orvane ne garde que l'empreinte de la clé d'administration : perdue, elle ne se retrouve pas, et il faut inscrire le jeu à nouveau. Trente inscriptions par heure au plus, tous jeux confondus.

## 2. Lire le monde

Le cycle nocturne tourne à 03:17 UTC, puis publie dans `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/` :

| fichier | ce que le jeu en fait |
| --- | --- |
| `instantane.json` | **le monde du jour** : ses biomes, ses lignées, leurs populations par biome et leurs variantes ; avec `precedent`, le cycle d'avant allégé, pour étaler un changement |
| `morceaux/` | le même monde par morceaux : `index.json` (quelques dizaines de Ko), puis un fichier par biome et un par lignée (ci-dessous) |
| `generation-0.json` | le monde à sa naissance : la référence du mode relatif (chapitre 5) |
| `jeux.json` | les jeux branchés et l'exposition de chacun |
| `historique.json` | les derniers cycles allégés (pour tracer des courbes) |

Lisez-les au lancement du jeu, avec `cache: 'no-cache'`, et gardez la dernière copie pour jouer hors ligne :

```js
const MONDE = 'https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/';
const inst = await (await fetch(MONDE + 'instantane.json', { cache: 'no-cache' })).json();
// l'identité du monde : son id et sa naissance. Si monde.ne change, le monde a été refait de zéro :
// le jeu repart de la nouvelle generation-0.json.
const identite = inst.monde.id + '@' + inst.monde.ne;
for (const t of inst.taxons) {
  if (t.eteint != null) continue;                     // éteint : il reste listé dix cycles
  for (const p of t.populations) console.log(t.id, t.nom, p.biome, p.effectif);
}
```

**Seulement les biomes qu'on joue.** `instantane.json` fait plus d'un mégaoctet. Avec `tampon/morceaux.js`, un jeu lit l'index et ses biomes, et reçoit un instantané au même contrat, réduit à ces biomes ([docs/21](docs/21-morceaux-et-anglais.md)) :

```js
const inst = await OrvaneMorceaux.lire(MONDE, { biomes: ['prairie', 'foret'] });   // 50 lignées au lieu de 112
```

Ce que porte une lignée (`inst.taxons[i]`) :
- `id` est stable : c'est la clé de votre table de correspondance. `nom` est son nom. `parent` dit de quelle lignée elle s'est séparée. `statut` vaut `croissance`, `stable`, `declin`, `menace` ou `eteint`.
- `plan` : `regime`, `masse_kg`, `taille_m`, `locomotion` (`marche`, `course`, `vol`, `nage`, `grimpe`…), `activite`, `temperament`, `sociabilite`, `vitesse_rel`, `perception`, `longevite`, et `corps`, sa silhouette : forme, pattes, proportions, organes, couleurs (`moteur/corps.js`).
- `populations` : par biome, `effectif`, `tendance` et les traits continus `quant` (taille, vitesse, audace, sociabilité : une moyenne et une variance, chapitre 8).
- `phenotypes` : les variantes, chacune avec ses `traits` et sa `frequence` (globale et par biome).
- `origine` (rare) : la lignée est arrivée d'un autre monde par une fusion ; elle paraît comme une lignée nouvelle ([docs/14](docs/14-fusion.md)).
- `populations[].parcelles` (si le monde a des parcelles) : la répartition de la population entre les parcelles de son biome ; la liste des parcelles est dans `inst.parcelles` ([docs/15](docs/15-parcelles.md)). Un jeu peut l'ignorer.
- **les machines** (si la Mère est éveillée, `inst.monde.mere`) : une lignée dont `plan.regime` vaut `synthetique` est une machine. Ses `plan.modules` (panneau, pince, blindage, arme…) disent à quoi elle ressemble et ce qu'elle fait, `plan.role` son rôle (`regulateur`, `foreuse`, `recycleur`, `capteur`) ; chaque population dit sa `posture` face aux joueurs (`neutre`, `defensive`, `fuyante`, `hostile`) et son `energie`. Chez les bêtes, `populations[].regulation` dit la part de leurs morts que les machines ont faites : c'est ce qu'un régulateur chasse. Une machine détruite se renvoie comme un prélèvement. Un jeu qui ne sait pas jouer une machine l'ignore ([docs/16](docs/16-vie-synthetique.md)).

**Un monde qui n'est pas la Terre.** Un monde peut porter son propre catalogue (`inst.catalogue.monde`) : des axes de biome (la magie), des traits, des organes et des formes de corps à lui. Leurs définitions sont dans l'instantané ; pour dessiner ses silhouettes, appelez `OrvaneCorps.etendre(inst.catalogue.monde)` une fois, à la lecture ([docs/20](docs/20-catalogues-ouverts.md)). Le monde d'Orvane n'en a pas.

**Un monde à soi, solo ou hors ligne.** `moteur/solo.js` fait vivre dans le jeu une copie du monde, partie de l'instantané : elle avance avec le temps réel (un cycle toutes les dix minutes, par exemple) ou en accéléré, ce que fait le joueur y pèse, et elle se sauvegarde. Rien n'en part vers le monde partagé ([docs/19](docs/19-le-temps.md)). Un genre la règle d'un mot : `OrvaneSolo.creer(instantane, { genre: 'horreur' })` fait un monde qui change vite et dérange, `'cozy'` un monde qui se répare, `'collection'` un monde riche en lignées ([docs/41](docs/41-profils-de-genre.md)).

`cycle.n` est le numéro du cycle, `cycle.saison` la saison du monde. Le détail champ par champ : [docs/1](docs/1-lire-un-instantane.md) et `schemas/instantane.schema.json`.

## 3. Traduire

**Les biomes.** Le monde a 24 biomes. Chaque terrain du jeu doit correspondre à un ou plusieurs biomes ; chaque biome dit son `milieu` et ses `voisins`.

| milieu | biomes |
| --- | --- |
| terre | `banquise` `toundra` `taiga` `steppe` `prairie` `foret` `jungle` `savane` `desert` `desert-froid` `maquis` `montagne` `sommets` `volcan` |
| sous-sol | `grotte` |
| eau douce et bords | `marais` `mangrove` `lac` `riviere` |
| mer | `cote` `recif` `large` `mer-froide` `abysses` |

**Les lignées.** Une lignée vit là où elle a un effectif. Faites-la apparaître dans les terrains qui correspondent à ses biomes, en proportion de son effectif ; tirez son comportement de `plan.regime`, `temperament`, `sociabilite` et `activite`, sa taille de `masse_kg`, ses déplacements de `locomotion`, son dessin de `plan.corps`. Une lignée qui disparaît de l'instantané, ou dont `eteint` n'est plus `null`, quitte le jeu.

**Ce que représente une créature du jeu.** C'est la règle qui garde le monde juste :
- **Une créature tirée d'une lignée est un membre de sa population**, dans le biome où elle paraît. Ce qui lui arrive se renvoie : une rencontre, une mort, une capture. Elle peut être transformée par le jeu (un animal infecté, une monture, une bête dressée) : tant que c'est elle, ce qui lui arrive compte.
- **Une créature propre au jeu ne se renvoie pas** : un humain, un monstre, un boss, un villageois, même si le jeu tire son allure ou ses traits d'une lignée (un humain infecté par une souche tirée d'une lignée animale n'est pas une bête de cette lignée). Sa mort n'est pas un prélèvement sur la lignée : au plus, ne renvoyez rien.
- **Un événement par chose réelle**, compté une fois, dans le biome où il a eu lieu. Ni démonstration, ni galerie, ni partie d'essai : seulement ce que les joueurs ont vraiment fait dans le monde partagé.

**Les familles.** Une lignée est d'une famille : `animale`, `synthetique` (une machine, [docs/16](docs/16-vie-synthetique.md)) ou `vegetale` (une plante, [docs/17](docs/17-flore.md) ; les plantes sont publiées à part, dans `flore.json`, à côté de l'instantané). Chez les bêtes, `populations[].nourriture` dit ce qu'un brouteur trouve à brouter, rapporté à l'éveil de la flore : un jeu peut le montrer sans jouer les plantes. Et `populations[].infection` dit, pour chaque souche qui circule (`inst.monde.pathogenes`), la part des bêtes infectées et immunisées : de quoi montrer des bêtes malades ([docs/18](docs/18-souches-et-symbioses.md)). Un jeu dit les familles qu'il sait jouer, et ne reçoit pas les autres : une nouveauté du monde n'arrive chez lui que s'il la demande.
- **à la lecture** : `Tampon.filtrer(inst, { familles: ['animale'] })` rend l'instantané sans les lignées des autres familles (et, avec `biomes`, sans les biomes où le jeu ne va pas) ;
- **à l'envoi** : le lot dit ses familles (`"familles": ["animale", "synthetique"]`), ou l'exposition du jeu les dit une fois pour toutes (`exposition.familles`). Sans rien, c'est `animale` seule, et le tampon ne lit pas les événements d'un jeu sur une famille qu'il ne joue pas.

**Les variantes.** Le tampon (`tampon/tampon.js`, à copier dans le jeu) transforme les fréquences réelles en fréquences montrées selon l'exposition du jeu : il comprime les raretés, étale les changements sur plusieurs jours et masque ce que le jeu ne sait pas dessiner.

**L'exemple complet.** Le traducteur de Stone Valley, de bout en bout : `traducteurs/stone-valley/` (correspondances, traducteur, banc) et [docs/6](docs/6-exemple-stone-valley.md). Pour faire d'un corps des statistiques de jeu : [docs/3](docs/3-traduire-un-phenotype.md) ; pour ce que les traits font faire aux bêtes : [docs/7](docs/7-conduites.md).

## 4. Régler l'exposition (facultatif)

L'exposition dit ce que le jeu sait montrer et comment : la compression des raretés, l'étalement des changements, les traits rendus. Sans exposition, les lots du jeu sont lus tels quels. Elle se règle sur la page d'inscription, ou par un appel :

```js
await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_regler_jeu', {
  method: 'POST', headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle_admin: 'orvadm_…', p_exposition: {
    compression: { defaut: 0.1 },          // une variante à 20 % dans Orvane en fait 2,4 % dans le jeu
    propagation_cycles: 3,                 // un changement s'étale sur trois cycles
    inertie_max: 0.05,                     // 5 points de fréquence au plus par cycle
    traits_rendus: ['albinisme', 'melanisme', 'gigantisme']
  } }) });
```

N'appelez jamais `orvane_regler_jeu` depuis le jeu publié : la clé d'administration n'a rien à y faire. Le schéma complet est `schemas/profil.schema.json`, propriété `exposition`, et il est expliqué dans [docs/5](docs/5-profil-et-essais.md). L'exposition d'un jeu est publiée chaque nuit dans `jeux.json`.

## 5. Renvoyer des pressions

Le jeu compte ce que font ses joueurs, sans rien conclure, et dépose ces comptes par lots :

```json
{ "orvane": "1.0", "monde": "orvane", "instantane": 41,
  "source": { "jeu": "mon-jeu", "compte": "h:9c1e44", "zone": "carte:3" },
  "periode": { "debut": "2026-10-29T18:02:11Z", "fin": "2026-10-29T19:40:03Z" },
  "evenements": [
    { "taxon": "dunvi", "biome": "savane", "action": "rencontre", "n": 12 },
    { "taxon": "dunvi", "phenotype": "base", "biome": "savane", "action": "prelevement", "n": 3, "age": "adulte", "q": { "taille": 0.8 } } ] }
```

- `instantane` est le `cycle.n` que le jeu utilisait. `taxon` est l'`id` de la lignée, `biome` un biome d'Orvane, déjà traduit.
- `action` vaut :
  - `rencontre` : la bête a été vue, une fois par bête ;
  - `prelevement` : la bête est morte du fait du joueur ;
  - `capture` : elle a été apprivoisée ; `liberation` : elle a été relâchée ;
  - `nourrissage`, `reproduction` : le joueur l'a aidée ;
  - `deplacement` : elle a été emportée ailleurs, avec `vers` ;
  - `habitat_perdu`, `habitat_gagne` : de l'habitat a été détruit ou créé, en `n` unités ;
  - `defrichage`, `reboisement`, `assechement`, `irrigation`, `construction`, ou `transformation` avec `axe` et `sens` : le joueur a changé le milieu, en `n` unités de surface. Ces actions n'ont pas de `taxon`. Construire retire aussi de l'habitat ([docs/22](docs/22-milieu-transforme.md)).
- Ne comptez ni les morts naturelles, ni les proies des autres bêtes, ni les bêtes d'un autre joueur. Comptez une mort au moment où le jeu la cause, pas en surveillant les points de vie.
- `q` (facultatif) donne la valeur moyenne des traits continus des bêtes prises : c'est ce qui dit à Orvane si les joueurs prennent les plus grandes.
- `parcelle` (facultatif, si le monde a des parcelles) : la parcelle où l'événement a eu lieu, prise dans `inst.parcelles` parmi celles de son biome. La chasse y est posée, au lieu d'être répartie sur tout le biome ([docs/15](docs/15-parcelles.md)).

Puis le dépôt :

```js
const r = await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_deposer', {
  method: 'POST', headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle: 'orv_…', p_compte: compteOpaque, p_lot: lot }) });
const rep = await r.json();
if (rep.ok) oublierLeLot(); else garderPourPlusTard(rep.erreur);
```

- `p_compte` est un identifiant opaque du joueur, par exemple un hachage de son identifiant de compte. Orvane n'en garde qu'un pseudonyme et ne s'en sert que pour les plafonds par joueur.
- Gardez le lot en mémoire et dans le stockage local jusqu'à `ok: true`, puis envoyez-le à un moment naturel : une sauvegarde, une déconnexion, un changement de zone.
- Limites : 500 événements et 64 Ko par lot ; chaque événement au contrat (une action connue, `n` entre 0 et 10 000) ; 48 lots par joueur et par jour ; 500 lots par jour pour un jeu neuf (relevé sur demande : Stone Valley en a 20 000).

La nuit suivante, le cycle lit les lots de tous les jeux et les rapporte à l'exposition de chacun. Il les plafonne : un joueur ne pèse pas plus qu'un autre, et un même jeu ne fait au plus que la moitié de la pression sur une espèce. Puis il les lisse et fait avancer le monde. L'effet se lit dans l'instantané du lendemain. Le détail est dans [docs/4](docs/4-renvoyer-des-pressions.md) et `schemas/pression.schema.json`.

## Réponses et erreurs

| `erreur` | cause | que faire |
| --- | --- | --- |
| `nom de jeu : 2 à 60 caractères` | nom trop court ou trop long | corriger le nom |
| `trop d'inscriptions en ce moment, réessayez dans une heure` | trente inscriptions dans l'heure | réessayer plus tard |
| `clé d'administration inconnue` | mauvaise clé d'administration | vérifier la clé ; perdue, réinscrire le jeu |
| `exposition : un objet de 32 Ko au plus` | exposition qui n'est pas un objet, ou trop grosse | corriger le JSON |
| `clé de jeu inconnue` | mauvaise clé du jeu | vérifier avec `orvane_jeu` |
| `ce jeu est suspendu` | jeu suspendu par Orvane | écrire au projet |
| `compte : 1 à 128 caractères` | `p_compte` vide ou trop long | hacher l'identifiant du joueur |
| `lot mal formé` | `p_lot` n'est pas un objet, ou n'a pas de tableau `evenements` | suivre le schéma |
| `lot trop gros` | plus de 500 événements ou de 64 Ko | couper le lot |
| `événement mal formé (schemas/pression.schema.json)` | un événement qui n'est pas un objet, une action inconnue, un `n` négatif, absent ou au-delà de 10 000, un nom qui n'est pas une chaîne | suivre le schéma |
| `nom : 2 à 40 lettres, espaces, apostrophes ou traits d'union` | un nom commun qui n'en est pas un (`orvane_nommer`) | corriger le nom |
| `dix noms par jour et par joueur` | `orvane_nommer` | attendre demain |
| `trop de dépôts aujourd'hui pour ce joueur` | 48 lots dans les 24 dernières heures | regrouper, garder le lot pour demain |
| `quota du jeu atteint pour aujourd'hui` | le quota du jeu en 24 heures (500 pour un jeu neuf) | garder les lots pour demain ; un jeu qui a besoin de plus écrit au projet |

## Règles

- La clé d'administration ne va jamais dans un jeu publié, ni dans un dépôt de code. Aucune clé de service Supabase ne sert à brancher un jeu.
- Orvane ne reçoit que des comptes (« 14 tués, 31 croisés »), jamais des conclusions, et aucune donnée personnelle : `p_compte` est opaque.
- Le monde appartient à tous les jeux : un jeu n'y pèse qu'en proportion de ses joueurs, et jamais plus de la moitié de la pression sur une espèce.
- **Les versions.** Le contrat est versionné (`"orvane": "1.0"` dans chaque instantané). Tant que le premier chiffre ne change pas, rien ne casse : il suffit que le jeu **ignore ce qu'il ne connaît pas** (un champ, une valeur, un biome). Un changement qui casserait un jeu est annoncé à l'avance dans [CHANGELOG.md](CHANGELOG.md) (docs/43). En JavaScript, le moteur et le tampon s'installent à une version précise : `npm install github:stonevalleyoff-ai/orvane#v1.0.0`.
- **La licence.** Orvane est sous [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0) (`LICENSE`). Brancher un jeu, même commercial ou au code fermé, est permis, de même que copier dans le jeu `tampon/tampon.js`, les schémas ou un traducteur et les adapter. Joignez alors l'adresse de la licence et la ligne `Required Notice: Copyright StoneValley (https://github.com/stonevalleyoff-ai/orvane)`, par exemple en commentaire en tête du fichier copié. Ce qui n'est pas permis : se servir du code d'Orvane pour fournir un produit qui lui fait concurrence (un autre moteur d'écosystème, un autre monde partagé où brancher des jeux, une copie renommée).

## Liste de vérification

- [ ] La clé du jeu est dans le code, la clé d'administration est rangée ailleurs.
- [ ] `orvane_jeu` avec la clé du jeu répond `ok: true` et le nom du jeu.
- [ ] Le jeu lit `instantane.json`, garde `monde.ne` et repart de `generation-0.json` quand il change.
- [ ] Chaque terrain du jeu correspond à au moins un biome d'Orvane.
- [ ] Les lignées apparaissent selon leurs effectifs, et une lignée éteinte quitte le jeu.
- [ ] Chaque événement est compté une seule fois, dans le biome d'Orvane où il a eu lieu, et seulement pour une créature qui est un membre de sa lignée (pas pour un humain, un monstre ou un boss du jeu).
- [ ] Le jeu filtre les familles qu'il ne sait pas jouer (`Tampon.filtrer`) et dit dans ses lots celles qu'il joue.
- [ ] Un lot déposé répond `ok: true` ; sinon, il est gardé et renvoyé plus tard.
- [ ] Le lendemain, `pressions_recues` monte dans `cycle` de l'instantané.
- [ ] Le jeu ignore les champs, les valeurs et les biomes qu'il ne connaît pas (docs/43).
- [ ] Le traducteur passe le banc générique : `node outils/banc-traducteur.js mon-traducteur.js` (docs/39 ; le modèle : `traducteurs/exemple/traducteur.js`).

## In English, briefly

Orvane runs one shared ecosystem world that any game can plug into. **The full guide in English is [CONNECT-A-GAME.md](CONNECT-A-GAME.md)**, and every French field name is translated in [docs/glossary.md](docs/glossary.md).
1. **Register** on the [sign-up page](https://stonevalleyoff-ai.github.io/orvane/inscription/), or call the `orvane_inscrire_jeu` RPC described below. You get a public **game key** (`orv_…`, it goes in your game) and a secret **admin key** (`orvadm_…`, never ship it).
2. **Read** the world once a day from `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/instantane.json`: its 24 biomes, and lineages (`taxons`) with a body plan (`plan`), populations per biome (`populations[].effectif`) and variants (`phenotypes`). It is published nightly at 03:17 UTC.
   A world may carry its own catalogue (`catalogue.monde`: extra biome axes, traits, organs, body forms); their definitions are in the snapshot, and `OrvaneCorps.etendre(inst.catalogue.monde)` lets `corps.js` draw them (docs/20).
   For a solo or offline game, `moteur/solo.js` runs a private copy of the world inside the game, in real time or accelerated, and nothing goes back to the shared world (docs/19).
3. **Translate**: map your terrains to Orvane biomes, and spawn each lineage where it lives, in proportion to its population. The reference translator is `traducteurs/stone-valley/`. A creature drawn from a lineage is a member of that population: report what happens to it. A creature that belongs to your game (a human, a monster, a boss), even if its looks come from a lineage, is not: report nothing for it. Lineages come in families (`animale`, `synthetique` for machines); keep only those your game can play with `Tampon.filtrer(inst, { familles: ['animale'] })`, and list them in each batch (`"familles": [...]`). By default a game plays animals only, so new kinds of life never reach it unasked.
4. **Report** what players do as raw counts (encounters, kills, captures…) in batches. Use `orvane_deposer(p_cle, p_compte, p_lot)`, where `p_compte` is an opaque player id. A batch holds at most 500 events and 64 KB, and each player can send 48 batches a day. The batch format is in `schemas/pression.schema.json`.

Every RPC is `POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/<function>`, with headers `apikey: sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8` and `Content-Type: application/json`. The JSON body holds the `p_…` parameters. Every answer is `{"ok": true, …}` or `{"ok": false, "erreur": "…"}`, with HTTP 200 in both cases.

Licence: [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0). Plugging in any game, commercial or closed-source, is allowed, and so is copying `tampon/tampon.js`, the schemas or a translator into it. Keep the licence URL and the line `Required Notice: Copyright StoneValley (https://github.com/stonevalleyoff-ai/orvane)` with the copied files. Using Orvane's code to provide a competing product is not allowed.
