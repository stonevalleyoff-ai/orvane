# Connect a game to Orvane

Orvane runs a single world, the world of Orvane, and every game plugs into it. A game **reads** the world (JSON files published once a day) and **reports** what its players do (batches of counts, sent to Orvane's Supabase). This guide gives the steps, the addresses and the exact calls. It is self-contained, for a developer or for an AI coding on their behalf. The field names are French; [docs/glossary.md](docs/glossary.md) translates every one of them. The French version is [BRANCHER-UN-JEU.md](BRANCHER-UN-JEU.md), and the chapters in [docs/](docs/LISEZ-MOI.md) (in French) go deeper into translation.

## In short

1. **Register** on the [sign-up page](https://stonevalleyoff-ai.github.io/orvane/inscription/), or with a call. You receive the **game key**, which is public, and the **admin key**, which is secret.
2. **Read the world**: `instantane.json` once a day from GitHub Pages, or only the biomes you play, piece by piece. No key is needed.
3. **Translate**: map the game's terrains to Orvane's 24 biomes, and turn each lineage into a creature.
4. **Set your exposure** (optional): tell Orvane what the game can show, with the admin key.
5. **Report pressures**: count what players do and send batches with `orvane_deposer` and the game key. `node outils/verifier.js my-batch.json` tells, before the first deposit, whether the batch will be accepted; `types/orvane.d.ts` gives every field to a TypeScript translator (docs/39).

## Addresses

| what | address |
| --- | --- |
| the world (read-only, open CORS) | `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/` |
| the sign-up page | `https://stonevalleyoff-ai.github.io/orvane/inscription/` |
| Orvane's Supabase | `https://rospodujiyltmxitykwc.supabase.co` |
| the project's public key (`apikey` header) | `sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8` |
| the observatory (watch the world live) | `https://stonevalleyoff-ai.github.io/orvane/` |

The project's public key may appear in a game's code. It only opens the five functions below, and no table can be read directly.

Every function is called the same way: `POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/<function>`, with the headers `apikey: <project public key>` and `Content-Type: application/json`, and a JSON body of `p_…` parameters. The answer is always a JSON object with `ok`: `{"ok": true, …}` or `{"ok": false, "erreur": "…"}`. The HTTP status is 200 in both cases: **read `ok`**.

| function | parameters | purpose |
| --- | --- | --- |
| `orvane_inscrire_jeu` | `p_nom` (2 to 60 characters), `p_contact` (optional, up to 200) | register a game, receive its keys |
| `orvane_regler_jeu` | `p_cle_admin`, `p_exposition` (object, up to 32 KB; `null` leaves it unchanged), `p_nom` (optional) | set what the game shows, rename the game |
| `orvane_deposer` | `p_cle`, `p_compte`, `p_lot` | send a batch of pressures |
| `orvane_nommer` | `p_cle`, `p_compte`, `p_monde`, `p_taxon`, `p_nom` (2 to 40 letters), `p_auteur` (optional) | a player proposes a lineage's common name; the first valid one wins at the next cycle (docs/37) |
| `orvane_jeu` | `p_cle` | check a key: what Orvane knows about the game |

## 1. Register

The easiest way is the [sign-up page](https://stonevalleyoff-ai.github.io/orvane/inscription/). Or with a call:

```sh
curl -X POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_inscrire_jeu \
  -H "apikey: sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8" -H "Content-Type: application/json" \
  -d '{"p_nom": "My game", "p_contact": "me@example.com"}'
```

```json
{ "ok": true, "jeu": "my-game", "cle": "orv_3f9c…", "cle_admin": "orvadm_8a21…", "note": "…" }
```

| field | what it is | where to keep it |
| --- | --- | --- |
| `jeu` | the game's id in Orvane (`jeux.json`, the batches) | in the code |
| `cle` | the game key: it signs the batches | in the game's code; it is public |
| `cle_admin` | the admin key: it configures the game | **never in the game**; in a password manager |

Orvane only keeps a hash of the admin key. If you lose it, it cannot be recovered, and you must register the game again. At most thirty registrations per hour, all games combined.

## 2. Read the world

Once a day, around 03:17 UTC, the cycle publishes to `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/`:

| file | what the game does with it |
| --- | --- |
| `instantane.json` | **today's world**: its biomes, its lineages, their populations per biome and their variants; with `precedent`, the previous cycle in light form, to spread a change over time |
| `morceaux/` | the same world in pieces: `index.json` (a few dozen KB), then one file per biome and one per lineage (see below) |
| `flore.json` | the plants, published separately (most games do not need them) |
| `generation-0.json` | the world at its birth: the reference for the relative mode |
| `jeux.json` | the connected games and each one's exposure |
| `historique.json` | the last cycles in light form (to draw curves) |

Read them when the game starts, with `cache: 'no-cache'`, and keep the last copy to play offline:

```js
const WORLD = 'https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/';
const inst = await (await fetch(WORLD + 'instantane.json', { cache: 'no-cache' })).json();
// the world's identity: its id and its birth. If monde.ne changes, the world was rebuilt from scratch:
// the game starts again from the new generation-0.json.
const identity = inst.monde.id + '@' + inst.monde.ne;
for (const t of inst.taxons) {
  if (t.eteint != null) continue;                     // extinct: still listed for ten cycles
  for (const p of t.populations) console.log(t.id, t.nom, p.biome, p.effectif);
}
```

**Only the biomes you play.** `instantane.json` is over a megabyte. With `tampon/morceaux.js`, a game reads the index and its own biomes, and gets an instantané with the same contract, reduced to those biomes:

```js
const inst = await OrvaneMorceaux.lire(WORLD, { biomes: ['prairie', 'foret'] });   // 50 lineages instead of 112
```

What a lineage carries (`inst.taxons[i]`):
- `id` is stable: it is the key of your mapping table. `nom` is its name. `parent` says which lineage it split from. `statut` is `croissance` (growing), `stable`, `declin` (declining), `menace` (threatened) or `eteint` (extinct).
- `plan`, the body plan:
  - `regime`, `masse_kg`, `taille_m` ;
  - `locomotion` (`marche` walk, `course` run, `vol` fly, `nage` swim, `grimpe` climb…) ;
  - `activite`, `temperament`, `sociabilite`, `vitesse_rel`, `perception`, `longevite` ;
  - `corps`, its silhouette: form, legs, proportions, organs, colours (`moteur/corps.js`).
- `populations`: per biome, `effectif` (head count), `tendance` (trend), and the continuous traits `quant` (size, speed, boldness, sociability: a mean and a variance).
- `phenotypes`: the variants, each with its `traits` and its `frequence` (overall and per biome).
- `origine` (rare): the lineage came from another world through a merger, and appears as a new lineage.
- `populations[].parcelles` (if the world has plots): how the population is spread across the plots of its biome. The list of plots is in `inst.parcelles`. A game can ignore it.
- **Machines** (if the Mother is awake, `inst.monde.mere`): a lineage whose `plan.regime` is `synthetique` is a machine.
  - Its `plan.modules` (panel, claw, armour, weapon…) say what it looks like and what it does; `plan.role` gives its role.
  - Each of its populations gives its `posture` towards players (`neutre`, `defensive`, `fuyante` fleeing, `hostile`) and its `energie`.
  - A destroyed machine is reported as a `prelevement`. A game that cannot play machines ignores them.

**A world that is not Earth.** A world may carry its own catalogue (`inst.catalogue.monde`): extra biome axes (magic), traits, organs and body forms. Their definitions are in the instantané. To draw its silhouettes, call `OrvaneCorps.etendre(inst.catalogue.monde)` once, when reading it. The world of Orvane has none.

**A world of your own, solo or offline.** `moteur/solo.js` runs a copy of the world inside the game, started from the instantané. It advances in real time (one cycle every ten minutes, say) or accelerated. What the player does weighs on it, and it can be saved. Nothing goes back to the shared world. A genre tunes it in one word (the genre ids are French: `horreur`, `cozy`, `collection`, `voxel`, `survie`, `strategie`, `mmo`). `OrvaneSolo.creer(instantane, { genre: 'horreur' })` makes a world that changes fast and unsettles, `'cozy'` a world that heals, `'collection'` a world rich in lineages (docs/41).

`cycle.n` is the cycle number, `cycle.saison` the world's season. Field by field: [docs/glossary.md](docs/glossary.md) and `schemas/instantane.schema.json`.

## 3. Translate

**Biomes.** The world has 24 biomes. Each terrain of the game must match one or more biomes; each biome gives its `milieu` and its `voisins` (neighbours).

| medium | biomes |
| --- | --- |
| land | `banquise` (pack ice) `toundra` `taiga` `steppe` `prairie` `foret` (forest) `jungle` `savane` `desert` `desert-froid` (cold desert) `maquis` (scrubland) `montagne` (mountain) `sommets` (peaks) `volcan` |
| underground | `grotte` (cave) |
| fresh water and shores | `marais` (marsh) `mangrove` `lac` (lake) `riviere` (river) |
| sea | `cote` (coast) `recif` (reef) `large` (open sea) `mer-froide` (cold sea) `abysses` (abyss) |

**Lineages.** A lineage lives where it has a head count. Spawn it in the terrains that match its biomes, in proportion to its head count.
- Take its behaviour from `plan.regime`, `temperament`, `sociabilite` and `activite`, its size from `masse_kg`, its movement from `locomotion`, its drawing from `plan.corps`.
- A lineage that disappears from the instantané, or whose `eteint` is no longer `null`, leaves the game.

**What a creature of the game represents.** This rule keeps the world fair:
- **A creature drawn from a lineage is a member of its population**, in the biome where it appears. What happens to it is reported: an encounter, a death, a capture. The game may transform it (an infected animal, a mount, a tamed beast): as long as it is that creature, what happens to it counts.
- **A creature that belongs to the game is not reported**: a human, a monster, a boss, a villager, even if the game takes its looks or traits from a lineage. A human infected by a strain taken from an animal lineage is not a member of that lineage. Its death is not a kill on the lineage: report nothing.
- **One event per real thing**, counted once, in the biome where it happened. No demos, no galleries, no test runs: only what players really did in the shared world.

**Families.** Every lineage belongs to a family:
- `animale` ;
- `synthetique`, a machine ;
- `vegetale`, a plant. Plants are published separately, in `flore.json`.

Among animals:
- `populations[].nourriture` says how much a grazer finds to eat, relative to when the flora awoke. A game can show it without playing the plants.
- `populations[].infection` gives, for each strain in circulation (`inst.monde.pathogenes`), the share of infected and immune animals. Enough to show sick animals.

A game says which families it can play, and does not receive the others: something new in the world only reaches a game that asks for it.
- **When reading**: `Tampon.filtrer(inst, { familles: ['animale'] })` returns the instantané without the lineages of the other families (and, with `biomes`, without the biomes the game never visits).
- **When sending**: the batch lists its families (`"familles": ["animale", "synthetique"]`), or the game's exposure lists them once and for all (`exposition.familles`). With neither, it is `animale` only, and the buffer ignores a game's events on a family it does not play.

**Variants.** The buffer (`tampon/tampon.js`, to copy into the game) turns real frequencies into displayed frequencies according to the game's exposure: it compresses rarities, spreads changes over several days, and hides what the game cannot draw.

**The full example.** Stone Valley's translator, end to end: `traducteurs/stone-valley/` (mappings, translator, bench) and [docs/6](docs/6-exemple-stone-valley.md).

## 4. Set your exposure (optional)

The exposure says what the game can show and how: rarity compression, how changes are spread, which traits are drawn. Without an exposure, the game's batches are read as they are. Set it on the sign-up page, or with a call:

```js
await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_regler_jeu', {
  method: 'POST', headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle_admin: 'orvadm_…', p_exposition: {
    compression: { defaut: 0.1 },          // a variant at 20 % in Orvane shows at 2.4 % in the game
    propagation_cycles: 3,                 // a change is spread over three cycles
    inertie_max: 0.05,                     // at most 5 frequency points per cycle
    traits_rendus: ['albinisme', 'melanisme', 'gigantisme']
  } }) });
```

Never call `orvane_regler_jeu` from the published game: the admin key has nothing to do there. The full schema is `schemas/profil.schema.json`, property `exposition`; the glossary translates its fields. Each game's exposure is published every day in `jeux.json`.

## 5. Report pressures

The game counts what its players do, without drawing conclusions, and sends these counts in batches:

```json
{ "orvane": "1.0", "monde": "orvane", "instantane": 41,
  "source": { "jeu": "my-game", "compte": "h:9c1e44", "zone": "map:3" },
  "periode": { "debut": "2026-10-29T18:02:11Z", "fin": "2026-10-29T19:40:03Z" },
  "evenements": [
    { "taxon": "dunvi", "biome": "savane", "action": "rencontre", "n": 12 },
    { "taxon": "dunvi", "phenotype": "base", "biome": "savane", "action": "prelevement", "n": 3, "age": "adulte", "q": { "taille": 0.8 } } ] }
```

- `instantane` is the `cycle.n` the game was using. `taxon` is the lineage's `id`, `biome` an Orvane biome, already translated.
- `action` is one of:
  - `rencontre` (encounter): the animal was seen, once per animal ;
  - `prelevement` (kill): the animal died because of the player ;
  - `capture`: it was tamed; `liberation`: it was released ;
  - `nourrissage` (feeding), `reproduction` (breeding): the player helped it ;
  - `deplacement` (relocation): it was carried elsewhere, with `vers` (to) ;
  - `habitat_perdu`, `habitat_gagne`: habitat was destroyed or created, in `n` units ;
  - `defrichage` (clearing), `reboisement` (reforesting), `assechement` (draining), `irrigation`, `construction` (building), or `transformation` with `axe` and `sens` (1 up, −1 down): the player changed the land, in `n` units of area. These actions have no `taxon`. Building also removes habitat ([docs/22](docs/22-milieu-transforme.md), in French).
- Do not count natural deaths, prey taken by other animals, or another player's animals. Count a death when the game causes it, not by watching hit points.
- `q` (optional) gives the mean value of the continuous traits of the animals taken: this tells Orvane whether players take the largest ones.
- `parcelle` (optional, if the world has plots): the plot where the event happened, taken from `inst.parcelles` among those of its biome.

Then send it:

```js
const r = await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_deposer', {
  method: 'POST', headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle: 'orv_…', p_compte: opaquePlayerId, p_lot: batch }) });
const answer = await r.json();
if (answer.ok) forgetBatch(); else keepForLater(answer.erreur);
```

- `p_compte` is an opaque player id, for example a hash of their account id. Orvane only keeps a pseudonym of it, and only uses it for the per-player caps.
- Keep the batch in memory and in local storage until `ok: true`, then send it at a natural moment: a save, a logout, a change of area.
- Limits: 500 events and 64 KB per batch; every event must follow the schema (a known action, `n` between 0 and 10,000); 48 batches per player per day; 500 batches per day for a new game (raised on request: Stone Valley has 20,000).

At the next cycle, the world reads the batches of every game and relates each to that game's exposure. It caps them: one player weighs no more than another, and a single game makes at most half of the pressure on a species. Then it smooths them and moves the world forward. The effect shows in the next instantané. Details: [docs/4](docs/4-renvoyer-des-pressions.md) and `schemas/pression.schema.json`.

## Answers and errors

The `erreur` strings are in French:

| `erreur` | meaning | what to do |
| --- | --- | --- |
| `nom de jeu : 2 à 60 caractères` | name too short or too long | fix the name |
| `trop d'inscriptions en ce moment, réessayez dans une heure` | thirty registrations within the hour | try again later |
| `clé d'administration inconnue` | wrong admin key | check the key; if lost, register again |
| `exposition : un objet de 32 Ko au plus` | exposure is not an object, or too large | fix the JSON |
| `clé de jeu inconnue` | wrong game key | check it with `orvane_jeu` |
| `ce jeu est suspendu` | game suspended by Orvane | write to the project |
| `compte : 1 à 128 caractères` | `p_compte` empty or too long | hash the player's id |
| `lot mal formé` | `p_lot` is not an object, or has no `evenements` array | follow the schema |
| `lot trop gros` | more than 500 events or 64 KB | split the batch |
| `trop de dépôts aujourd'hui pour ce joueur` | 48 batches in the last 24 hours | group them, keep the batch for tomorrow |
| `quota du jeu atteint pour aujourd'hui` | the game's quota in 24 hours (500 for a new game) | keep the batches for tomorrow; a game that needs more writes to the project |
| `événement mal formé (schemas/pression.schema.json)` | an event that is not an object, an unknown action, `n` missing, negative or above 10,000, a name that is not a string | follow the schema |

## Rules

- The admin key never goes into a published game, nor into a code repository. No Supabase service key is ever needed to connect a game.
- Orvane only receives counts ("14 killed, 31 met"), never conclusions, and no personal data: `p_compte` is opaque.
- The world belongs to every game: a game weighs on it in proportion to its players, and never makes more than half of the pressure on a species.
- **Licence.** Orvane is under [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0) (`LICENSE`).
  - **Allowed:** connecting any game, commercial or closed-source; copying `tampon/tampon.js`, `tampon/morceaux.js`, the schemas or a translator into the game, and adapting them. Keep the licence URL and the line `Required Notice: Copyright StoneValley (https://github.com/stonevalleyoff-ai/orvane)`, for instance as a comment at the top of each copied file.
  - **Not allowed:** using Orvane's code to provide a competing product (another ecosystem engine, another shared world for games to plug into, a renamed copy).
- **Versions.** The contract is versioned (`"orvane": "1.0"` in every snapshot). As long as the first number stays the same, nothing breaks, provided your game **ignores what it does not know** (a field, a value, a biome). A breaking change is announced ahead of time in [CHANGELOG.md](CHANGELOG.md) (docs/43). In JavaScript, the engine and the buffer install at a fixed version: `npm install github:stonevalleyoff-ai/orvane#v1.0.0`.

## Checklist

- [ ] The game key is in the code; the admin key is stored elsewhere.
- [ ] `orvane_jeu` with the game key answers `ok: true` and the game's name.
- [ ] The game reads `instantane.json` (or its biomes, piece by piece), keeps `monde.ne`, and starts again from `generation-0.json` when it changes.
- [ ] Each terrain of the game matches at least one Orvane biome.
- [ ] Lineages appear according to their head counts, and an extinct lineage leaves the game.
- [ ] Each event is counted once, in the Orvane biome where it happened, and only for a creature that is a member of its lineage (not for a human, a monster or a boss of the game).
- [ ] The game filters out the families it cannot play (`Tampon.filtrer`) and lists in its batches those it plays.
- [ ] A sent batch answers `ok: true`; otherwise it is kept and sent again later.
- [ ] The next day, `pressions_recues` rises in the instantané's `cycle`.
- [ ] The translator passes the generic test bench: `node outils/banc-traducteur.js my-translator.js` (docs/39; the model: `traducteurs/exemple/traducteur.js`).
