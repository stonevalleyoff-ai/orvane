# 4. Renvoyer des pressions

Le jeu renvoie des **comptes bruts**, jamais des conclusions. Le tampon fait le jugement (chapitre 5). Un lot est validé par `schemas/pression.schema.json` :

```json
{ "orvane": "1.0", "monde": "sv-1", "instantane": 12,
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

## Ce qui se passe ensuite (pour comprendre les chiffres)

Le tampon, pour chaque compte : ramène une activité excessive à `exposition_ref` rencontres ; **dénormalise** les prélèvements par phénotype — une variante montrée à 2 % mais réelle à 20 % voit ses pertes ×10, lissées par `pseudo_comptes` prélèvements fictifs pour qu'une seule bête rare tuée ne vaille pas une persécution ; plafonne par compte, par part d'un seul compte, par part de population ; puis lisse sur `memoire_cycles`. À part, il compte ce que les bêtes ont vécu des joueurs (rencontres, prélèvements et captures, aide) : c'est ce qui les rend méfiantes ou les habitue (chapitre 12). Là aussi un compte est ramené à une activité normale, mesurée sur tous ses contacts : déclarer davantage ne pèse pas davantage. Il n'y a pas de part par jeu ici : un compte pèse le même poids sous n'importe quel jeu. Un joueur qui vide son île un soir pèse peu ; dix joueurs qui le font chaque soir finissent par éteindre une population.
