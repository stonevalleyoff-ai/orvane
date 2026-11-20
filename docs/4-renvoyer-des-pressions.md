# 4. Renvoyer des pressions

Le jeu renvoie des **comptes bruts**, jamais des conclusions. Le tampon fait le jugement (chapitre 5). Un lot est validé par `schemas/pression.schema.json` :

```json
{ "orvane": "1.0", "monde": "sv-1", "instantane": 12, "id": "9b2e4f0c1a7d43e8b5c6d7e8f9a0b1c2",
  "source": { "jeu": "stone-valley", "compte": "h:2k9f1a", "zone": "ile:884120" },
  "periode": { "debut": "2026-10-27T18:02:11Z", "fin": "2026-10-27T19:40:03Z" },
  "evenements": [
    { "taxon": "crapaud", "biome": "tourbiere", "action": "rencontre", "n": 31 },
    { "taxon": "crapaud", "phenotype": "base", "biome": "tourbiere", "action": "prelevement", "n": 14, "age": "adulte" },
    { "taxon": "crapaud", "phenotype": "gigantisme", "biome": "tourbiere", "action": "capture", "n": 1 } ] }
```

## Quoi compter

| action | quand | pourquoi ça compte |
| --- | --- | --- |
| `rencontre` | une bête sauvage entre dans le champ du joueur (une fois par bête) | mesure l'**exposition** : 14 tués sur 31 croisés n'est pas 14 tués sur 300 |
| `prelevement` | une bête meurt **du fait du joueur** (arme, piège, tour, monture) ; avec `age: "oeuf"`, un œuf pris (docs/25) | retire des individus ; par phénotype, c'est la sélection |
| `capture` | apprivoisée, retirée du sauvage | comme un prélèvement, mais elle peut revenir |
| `liberation` | rendue au sauvage ; avec `genome`, née en élevage (docs/36) | l'inverse ; avec son génome, elle rejoint la population avec ses gènes |
| `nourrissage` | nourrie, soignée | aide la population (poids négatif) |
| `reproduction` | des petits nés en captivité puis relâchés, ou un élevage sélectif | aide, et oriente les phénotypes |
| `deplacement` (+ `vers`) | emportée sur un autre biome | fonde ou renforce une population ailleurs |
| `habitat_perdu` / `habitat_gagne` | surface détruite / créée (en unités de votre jeu : cases, arbres…) | la capacité du biome bouge |
| `defrichage`, `reboisement`, `assechement`, `irrigation`, `construction` ; `transformation` (+ `axe`, `sens`) | le joueur change le milieu, en `n` unités de surface ; sans `taxon` | dans un monde au milieu éveillé, les axes du lieu bougent ; construire retire aussi de l'habitat (docs/22) |
| `blessure`, `effarouchement`, `pillage`, `attaque`, `joueur_tombe` (+ `moyen`) | ce que les bêtes vivent des joueurs sans être retirées : frappée et survivante, arrêtée par un feu, servie dans les vivres ; un assaut sur un joueur, un joueur tombé | dans un monde à la mémoire éveillée (`monde.memoire`), la population l'apprend : l'attrait, la traque, la néophobie. **À n'envoyer qu'à un monde qui l'annonce** (docs/50) |

**La valeur des bêtes.** Si votre jeu tire les traits continus (chapitre 8), joignez à un prélèvement ou à une capture `q` : la valeur moyenne z, par trait, des bêtes de l'événement, telle qu'elles l'ont tirée à la naissance (`"q": { "taille": 1.3 }`). C'est ainsi qu'Orvane sait si vos joueurs prennent les plus grandes ou les plus audacieuses ; sans `q`, il suppose qu'ils prennent au hasard.

**Ne comptez pas** : les morts naturelles (faim, vieillesse), les proies d'autres bêtes, les bêtes d'un autre joueur (c'est son lot), les compagnons.

**Ne comptez que les membres du monde.** Une créature tirée d'une lignée est un membre de sa population : ce qui lui arrive compte, même transformée par le jeu (un animal infecté, une monture). Une créature propre au jeu (un humain, un monstre, un boss) ne compte pas, même si son allure vient d'une lignée : un humain infecté par une souche tirée d'une lignée animale n'est pas une bête de cette lignée. Et seulement les familles que le jeu joue : le lot les dit (`"familles": ["animale"]`, la valeur par défaut), le tampon ne lit pas les autres (`BRANCHER-UN-JEU.md`, Les familles).

## Comment ne pas compter deux fois

- Une rencontre par **individu**, pas par image : gardez un `WeakSet` des bêtes déjà vues ; un relevé toutes les dix secondes suffit.
- Comptez la mort **à l'événement** (la fonction qui tue), pas en observant `pv <= 0` à chaque image.
- En multijoueur partagé, c'est celui qui porte le coup qui compte le prélèvement — pas chaque client qui voit la bête tomber.
- Le `phenotype` est celui de la bête telle qu'elle est née (retrouvez-le depuis sa variante, chapitre 2). Si vous ne le savez pas, omettez le champ : le tampon répartira selon les fréquences réelles.
- Le `biome` est celui d'Orvane, déjà traduit — là où la bête était, ou à défaut là où est le joueur.

## Quand envoyer

Accumulez en mémoire **et** en `localStorage` (le lot survit à la fermeture), puis envoyez à un moment naturel : la sauvegarde, la déconnexion, le changement de zone. Un lot par période ; `instantane` = le cycle que le jeu utilisait pendant cette période (le tampon s'en sert pour dénormaliser avec les bonnes fréquences). `compte` est un identifiant **opaque** (un hachage) : il ne sert qu'aux plafonds par compte.

Où envoyer : `orvane_deposer(cle, compte, lot)`, dans le Supabase d'Orvane, avec la clé de votre jeu (`hebergement/LISEZ-MOI.md` : s'inscrire, recevoir sa clé). Un lot fait 500 événements et 64 Ko au plus ; un joueur dépose 48 lots par jour au plus. `lot.monde` vaut `orvane`. Le jeu ne relit jamais ses lots : c'est le cycle nocturne qui les lit, avec l'exposition que votre jeu a réglée (`orvane_regler_jeu`).

**Un lot n'est compté qu'une fois.** Quand la réponse d'un dépôt se perd, le jeu ne sait pas si le lot est entré ; le renvoyer risquait de le compter deux fois. Donnez à chaque lot un `id` tiré au hasard quand vous le clôturez (un UUID, 32 chiffres hexadécimaux ; 1 à 64 lettres, chiffres ou `. _ : -`), et gardez-le avec le lot tant qu'il n'est pas accepté. Un renvoi du même lot, avec le même `id`, répond `{ "ok": true, "deja": true }` : il est reconnu avant les quotas, et ne compte ni dans les 48 lots du joueur, ni dans le quota du jeu. Le même `id` sur un autre lot est refusé (`id du lot déjà pris…`), pour qu'une erreur du jeu ne passe pas en silence. Un renvoi est reconnu tant qu'Orvane garde le lot (quatorze jours), quel que soit le compte qui le renvoie : il n'écrit rien. L'`id` est propre à chaque jeu ; les kits Unity et Godot le donnent et le gardent, et le cycle de nuit écarte aussi, par défense, un second lot du même jeu et du même `id`.

**Depuis un serveur.** La clé du jeu est publique : qui la lit peut déposer en son nom. Un jeu qui a un serveur y dépose avec une clé de dépôt, que le client ne voit jamais (`orvane_cle_depot`), puis l'exige (`orvane_exiger_cle_depot`) : les dépôts sans elle sont refusés. `kits/serveur/depot.mjs` (Node, Deno) dépose avec elle, donne l'`id`, renvoie de lui-même quand le réseau flanche, et dit quand garder un lot pour plus tard (`plusTard`, `config` pour une clé à réparer) ou le mettre de côté (`BRANCHER-UN-JEU.md`, chapitre 6). Un lot refusé pour de bon (hors du contrat, un id déjà pris) ne doit pas bloquer les suivants : les kits le mettent de côté.

## Ce qui se passe ensuite (pour comprendre les chiffres)

Le tampon, pour chaque compte : ramène une activité excessive à `exposition_ref` rencontres ; **dénormalise** les prélèvements par phénotype — une variante montrée à 2 % mais réelle à 20 % voit ses pertes ×10, lissées par `pseudo_comptes` prélèvements fictifs pour qu'une seule bête rare tuée ne vaille pas une persécution ; plafonne par compte, par part d'un seul compte et d'un seul jeu, par jeu même seul (un jeu n'ôte pas plus de 5 % d'une population en un cycle : `part_max_population_jeu`, chapitre 5 ; ce qu'il rend n'a pas ce plafond), par part de population ; puis lisse sur `memoire_cycles`. À part, il compte ce que les bêtes ont vécu des joueurs (rencontres, prélèvements et captures, aide) : c'est ce qui les rend méfiantes ou les habitue (chapitre 12). Un joueur qui vide son île un soir pèse peu ; dix joueurs qui le font chaque soir finissent par éteindre une population.

## Le bilan de saison

À chaque saison, Orvane publie ce que chaque jeu a fait au monde : ce qu'il a ôté à chaque population, ce qu'il lui a rendu, et la part de l'effectif que cela représente. Le tampon le sait déjà, jeu par jeu ; le bilan le dit à tous. Un jeu s'en sert pour son propre bilan public : celui d'Orvane fait référence (Hors-Cordon s'est engagé à le relayer ; un jeu qui demande 20 000 lots par jour s'engage à le suivre, `hebergement/LISEZ-MOI.md`).

**Où le lire.** Dans le dossier du monde, `bilans/` :

```
https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/index.json      les saisons finies (la plus récente d'abord), et celle en cours
https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/en-cours.json   la saison en cours, refaite à chaque cycle
https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/an-0-ete.json   une saison finie : écrite une fois, elle ne change plus
```

Le format est `schemas/bilan.schema.json` (`schemas/bilan-index.schema.json` pour l'index) ; en TypeScript, `Bilan` et `BilanIndex` (`types/orvane.d.ts`). `node outils/verifier.js <bilan.json>` vérifie un bilan, et que ses comptes tiennent. L'Observatoire le montre (vue Bilans). Le cycle de nuit l'écrit (`hebergement/cycle.js`, `tampon/bilan.js`), et garde le cumul de la saison en cours dans `tampon.json` (`bilan`).

**La saison.** Celle du monde, telle que le moteur la nomme (`cycle.saison.nom` de l'instantané). Le monde d'Orvane a une année de 120 cycles, donc quatre saisons de 30 cycles. L'hiver est centré sur le début de l'année : `an-1-hiver` va du cycle 105 au cycle 134. Un monde sans année a des tranches de 30 cycles, comptées depuis le cycle 0 (`tranche-3` : cycles 90 à 119). Pourquoi la saison du monde, plutôt que des tranches comptées depuis sa naissance : les bêtes vivent selon les saisons (elles migrent, l'hiver est rude), les joueurs aussi, et un bilan « de l'hiver » dit ce qu'il couvre. Le premier bilan d'un monde commence en cours de saison : `compte` dit les cycles comptés (`de`, `a`, `cycles`), `saison` ceux de la saison entière.

**Ce qu'il dit.** Pour chaque jeu (son `id` et son nom public, ceux de `jeux.json`), lignée par lignée, biome par biome (le biome, même dans un monde à parcelles) :

| champ | ce que c'est |
| --- | --- |
| `ote.demande` | ce que ses lots demandaient : prélèvements, captures, déplacements, pesés (un adulte compte 1,2, un jeune 0,8, un œuf 0,3) et rapportés aux fréquences réelles (son exposition, chapitre 5) |
| `ote.applique` | ce qu'il en reste après tous les plafonds : ce que le jeu ajoute à la pression du monde |
| `ote.rabote` | ce que chaque plafond a ôté à la demande, dans l'ordre où le tampon les applique : `activite` (l'activité d'un compte ramenée à `exposition_ref` rencontres), `compte` (`par_compte_cycle`), `part_compte` (`part_max_compte`), `part_jeu` (`part_max_jeu`), `plafond_jeu` (`part_max_population_jeu`, 5 %), `population` (`part_max_population`, 20 %). Seuls ceux qui ont mordu sont dits |
| `ote.part` | `applique` rapporté à `effectif_moyen` : la part de l'effectif ôtée sur la saison |
| `ote.part_max_cycle`, `ote.cycle_max` | la part la plus forte ôtée en un seul cycle, et ce cycle. Jamais plus que le `plafond` du jeu |
| `rendu` | de même pour ce qui est rendu : libérations, nourrissages (0,2 bête chacun), bêtes d'élevage (docs/36). Il n'a pas le plafond d'un jeu, seulement celui d'une population |
| `effectif_moyen`, `cycles` | l'effectif de la population au début de chaque cycle où le jeu l'a touchée, en moyenne ; et ces cycles |

Et pour le jeu entier : ses `lots` (un lot renvoyé compte une fois), ses `evenements`, les `cycles` où il a déposé, ses totaux, son `plafond`, et `part_max_cycle` (la population où il a le plus pris en un cycle). Les lignées viennent par part de l'effectif ôtée, la plus forte d'abord. Un extrait, de la copie du monde du 20 novembre (docs/5 : un jeu d'essai qui demande trois fois son plafond, l'été de l'an 0) :

```json
{ "orvane": "1.0", "monde": { "id": "orvane", "ne": "2026-10-29T15:30:11.656Z" },
  "saison": { "id": "an-0-ete", "an": 0, "nom": "été", "de": 45, "a": 74 }, "en_cours": false,
  "compte": { "de": 61, "a": 74, "cycles": 14, "date_de": "2026-11-22T03:05:00.000Z", "date_a": "2026-12-05T03:05:00.000Z" },
  "plafonds": { "par_compte_cycle": 30, "part_max_compte": 0.15, "part_max_jeu": 0.5, "part_max_population": 0.2, "part_max_population_jeu": 0.05 }, "memoire_cycles": 5,
  "jeux": [
    { "id": "essai-vorace", "nom": null, "plafond": 0.05, "lots": 720, "evenements": 2160, "cycles": 12,
      "ote": { "demande": 18000, "applique": 3933.1, "rabote": { "plafond_jeu": 14066.9 } }, "rendu": { "demande": 1440, "applique": 1440, "rabote": {} },
      "part_max_cycle": { "part": 0.05, "cycle": 64, "taxon": "renbello", "biome": "steppe" },
      "lignees": [
        { "taxon": "renbello", "nom": "Renbello fouisseur de désert", "biome": "steppe", "cycles": 12, "effectif_moyen": 6555.2,
          "ote": { "demande": 18000, "applique": 3933.1, "rabote": { "plafond_jeu": 14066.9 }, "part": 0.6, "part_max_cycle": 0.05, "cycle_max": 64 },
          "rendu": { "demande": 0, "applique": 0, "rabote": {}, "part": 0 } },
        { "taxon": "jagra", "nom": "Jagra mangeur d'herbe de toundra", "biome": "toundra", "cycles": 12, "effectif_moyen": 14824.6,
          "ote": { "demande": 0, "applique": 0, "rabote": {}, "part": 0, "part_max_cycle": 0, "cycle_max": null },
          "rendu": { "demande": 1440, "applique": 1440, "rabote": {}, "part": 0.097136 } } ] },
    { "id": "lisiere", "nom": "Lisière", "plafond": 0.05, "lots": 48, "evenements": 192, "cycles": 12, … } ] }
```

Ce jeu demandait 18 000 renbello en douze cycles, environ un quart de la population chaque fois : il en a ôté 3 933, 5 % par cycle au plus ; son plafond a raboté le reste. Sur la saison, cela fait 60 % de l'effectif moyen, que les naissances de l'été ont remplacé (5 857 renbello en steppe au cycle 60, 7 990 au cycle 76).

**L'effectif de référence.** C'est celui sur lequel les plafonds se comptent : la population (la lignée dans le biome, toutes ses parcelles) au début du cycle, avant que le moteur ne la fasse vivre. La part d'un cycle se compare donc directement au plafond du jeu. Sur la saison, c'en est la moyenne aux cycles où le jeu a touché la population : pour un jeu qui chasse chaque jour, l'effectif moyen de la saison ; pour un jeu venu une seule fois, sa part de ce jour-là. La part de la saison peut dépasser 100 % : les naissances remplacent ce qui est pris (5 % par cycle pendant 30 cycles, c'est 150 %).

**Ce qu'il compte, et quand.** Chaque cycle compte ce que le tampon a retenu des lots lus ce cycle-là, plafonds compris, avant le lissage (`memoire_cycles`, 5), comme les plafonds eux-mêmes. Le lissage étale ensuite ce poids sur les cycles suivants, sans rien y ajouter ni en ôter : sur la durée, la pression que reçoit le moteur rejoint ce que compte le bilan. Mais ce qui est compté à la fin d'une saison pèse surtout au début de la suivante. Trois choses encore :
- un compte qui prend et relâche (ou nourrit) des bêtes d'une même variante, au même lieu, le même cycle, n'en garde que le solde : le tampon le lit ainsi, et le bilan aussi (dix prélèvements et dix nourrissages d'un même joueur font 8 bêtes ôtées, pas 10 ôtées et 2 rendues) ;
- ce qu'un jeu ôte et ce qu'un autre rend à une même population se compensent dans le monde ; le bilan, lui, dit chacun à son jeu ;
- une population qui n'a plus les bêtes demandées n'en perd pas plus qu'elle n'en a (c'est rare sous un plafond de 5 %).

**Ce qu'il ne dit pas.** Ni compte ni pseudonyme : seulement chaque jeu. Ni l'habitat ni le milieu, ni ce que les bêtes retiennent des joueurs (la méfiance, la mémoire) : seulement ce qui est ôté ou rendu à une population. Ni la parcelle : la chasse d'un jeu est posée là où ses lots l'ont dite, mais le lissage reporte sur les jours suivants une pression qui n'a plus de parcelle (docs/15). Les lots sans jeu (déposés à la main) ont leur entrée, d'`id` vide, en dernier.

**Un jeu suspendu, un monde né à nouveau.** Un jeu suspendu en cours de saison garde ce qu'il a fait, et son nom. Un monde né à nouveau (un autre `monde.ne`) repart de bilans neufs : ceux de l'autre monde ne sont plus publiés.

**Pour son propre bilan.** Un jeu lit l'index, prend la dernière saison finie et y cherche son `id` :

```js
const base = 'https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/';
const index = await (await fetch(base + 'index.json')).json();
const fini = index.saisons[0];                                  // la plus récente des saisons finies (en cours : index.en_cours)
const bilan = await (await fetch(base + fini.fichier)).json();
const moi = bilan.jeux.find(j => j.id === 'mon-jeu');          // absent : le jeu n'a rien déposé cette saison
for (const x of moi?.lignees || []) console.log(x.taxon, x.biome, x.ote.applique, x.ote.part, x.ote.rabote);
```

Il peut le relayer tel quel, ou le comparer à ce qu'il a compté lui-même : un écart entre `demande` et ses propres comptes dit un événement perdu ou compté deux fois ; un `rabote` qui revient chaque saison dit un plafond qu'il atteint (l'activité de ses joueurs, un compte qui force, son plafond de 5 %).
