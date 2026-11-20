# Connect a game to Orvane

Orvane runs a single world, the world of Orvane, and every game plugs into it. A game **reads** the world (JSON files published once a day) and **reports** what its players do (batches of counts, sent to Orvane's Supabase). This guide gives the steps, the addresses and the exact calls. It is self-contained, for a developer or for an AI coding on their behalf. The field names are French; [docs/glossary.md](docs/glossary.md) translates every one of them. The French version is [BRANCHER-UN-JEU.md](BRANCHER-UN-JEU.md), and the chapters in [docs/](docs/LISEZ-MOI.md) (in French) go deeper into translation.

## In short

1. **Register** on the [sign-up page](https://stonevalleyoff-ai.github.io/orvane/inscription/), or with a call. You receive the **game key**, which is public, and the **admin key**, which is secret.
2. **Read the world**: `instantane.json` once a day from GitHub Pages, or only the biomes you play, piece by piece. No key is needed.
3. **Translate**: map the game's terrains to Orvane's biomes, and turn each lineage into a creature. In **Unity** or **Godot**, a kit reads the world, counts and sends the batches for you ([kits/LISEZ-MOI.md](kits/LISEZ-MOI.md)).
4. **Set your exposure** (optional): tell Orvane what the game can show, with the admin key.
5. **Report pressures**: count what players do and send batches with `orvane_deposer` and the game key. `node outils/verifier.js my-batch.json` tells, before the first deposit, whether the batch will be accepted; `types/orvane.d.ts` gives every field to a TypeScript translator (docs/39). A game that has a server can deposit from it, with a deposit key that only the server knows (section 6).
6. **Read your season report**: every season, Orvane publishes what each game removed from and gave back to each population, and the share of the head count it represents (section 8).

## Addresses

| what | address |
| --- | --- |
| the world (read-only, open CORS) | `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/` |
| the sign-up page | `https://stonevalleyoff-ai.github.io/orvane/inscription/` |
| Orvane's Supabase | `https://rospodujiyltmxitykwc.supabase.co` |
| the project's public key (`apikey` header) | `sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8` |
| the observatory (watch the world live) | `https://stonevalleyoff-ai.github.io/orvane/` |
| each game's season report (read-only) | `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/index.json` |

The project's public key may appear in a game's code. It only opens the functions below, and no table can be read directly.

Every function is called the same way: `POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/<function>`, with the headers `apikey: <project public key>` and `Content-Type: application/json`, and a JSON body of `p_…` parameters. The answer is always a JSON object with `ok`: `{"ok": true, …}` or `{"ok": false, "erreur": "…"}`. The HTTP status is 200 in both cases: **read `ok`**.

| function | parameters | purpose |
| --- | --- | --- |
| `orvane_inscrire_jeu` | `p_nom` (2 to 60 characters), `p_contact` (optional, up to 200) | register a game, receive its keys |
| `orvane_regler_jeu` | `p_cle_admin`, `p_exposition` (object, up to 32 KB; `null` leaves it unchanged), `p_nom` (optional) | set what the game shows, rename the game |
| `orvane_deposer` | `p_cle`, `p_compte`, `p_lot`, `p_cle_depot` (optional) | send a batch of pressures; a batch resent with the same `id` answers `{"ok": true, "deja": true}` |
| `orvane_cle_depot` | `p_cle_admin` | create or renew the game's deposit key, for its server only (section 6) |
| `orvane_exiger_cle_depot` | `p_cle_admin`, `p_exiger` (`true` or `false`) | accept only deposits that carry the deposit key |
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
| `cle_depot` (later, if the game has a server: `orvane_cle_depot`) | the deposit key: once required, only it can deposit | **never in the client**; in the server's secrets (section 6) |

Orvane only keeps a hash of the admin key. If you lose it, it cannot be recovered, and you must register the game again. At most thirty registrations per hour, all games combined.

## 2. Read the world

Once a day, around 03:05 UTC (the trigger in Orvane's Supabase, `hebergement/declencheur.sql`; failing that, the 03:17 GitHub action), the cycle publishes to `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/`:

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

**Biomes.** The published world has **47 biomes** at cycle 59 (24 at its birth), and it gains more: a place can change or be born (an island risen from a volcano, `ile-1`, docs/28 and 31), and a fusion brings others (docs/23). Each terrain of the game must match one or more biomes; each biome gives its `milieu` (medium), its five `axes` (docs/1) and its `voisins` (neighbours).

| `milieu` | biomes (cycle 59) |
| --- | --- |
| `terrestre` (land) | `banquise` (pack ice) `toundra` `taiga` `steppe` `prairie` `foret` (forest) `jungle` `savane` `desert` `desert-froid` (cold desert) `maquis` (scrubland) `montagne` (mountain) `sommets` (peaks) `volcan` `bois` (woods) `lande` (heath) `falaise` (cliff) `pierre` (stone) `neige` (snow) `canyon` `sylve` (deep forest) `cristal` (crystal fields) `caldeira` `braises` (embers) `ossuaire` (ossuary) `terres-creuses` (hollow lands) `cerisaie` (cherry grove) `ile-1` (ash island) |
| `souterrain` (underground) | `grotte` (cave) |
| `amphibie` (shore) | `marais` (marsh) `mangrove` `cote` (coast) `rivage` (shore) `tourbiere` (peat bog) `roseliere` (reed bed) `delta` |
| `aquatique` (fresh water) | `lac` (lake) `riviere` (river) `torrent` `lac-profond` (deep lake) `etang` (pond) `source-chaude` (hot spring) `grotte-inondee` (flooded cave) |
| `marin` (sea) | `recif` (reef) `large` (open sea) `mer-froide` (cold sea) `abysses` (abyss) |

**A translator ignores the places it does not know** (docs/43): a new biome must never crash the game. At best, it maps it to one of its terrains by its `milieu` and `axes`; otherwise it spawns nothing there and reports nothing for it. Today's list is always `inst.biomes`.

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
- `populations[].infection` gives, for each strain in circulation (`inst.monde.pathogenes`), the share of infected and immune animals. Enough to show sick animals. In every world with strains, a strain's events say which strain (`souche`) and what happens to it (`nature`: birth, host jump, mutation, vector, extinction; an extinction also gives its `nom` and its last `lieux`). In a world of plots, `populations[].infection_par_parcelle` gives the infection plot by plot, and an event gives its `parcelle`. The kits read them for the game (`Orvane.souches()`, `infection`, `foyers`, `evenements_souches`; docs/18).

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
{ "orvane": "1.0", "monde": "orvane", "instantane": 41, "id": "5f0c9e1a7b2d4c3e8f6a1b2c3d4e5f60",
  "source": { "jeu": "my-game", "compte": "h:9c1e44", "zone": "map:3" },
  "periode": { "debut": "2026-10-29T18:02:11Z", "fin": "2026-10-29T19:40:03Z" },
  "evenements": [
    { "taxon": "dunvi", "biome": "savane", "action": "rencontre", "n": 12 },
    { "taxon": "dunvi", "phenotype": "base", "biome": "savane", "action": "prelevement", "n": 3, "age": "adulte", "q": { "taille": 0.8 } } ] }
```

- `instantane` is the `cycle.n` the game was using. `taxon` is the lineage's `id`, `biome` an Orvane biome, already translated.
- `id` (optional, recommended): the batch's id, drawn at random when the game closes the batch (a UUID, 32 hex digits), and kept with it. If the answer to a deposit is lost, the game sends the same batch again with the same `id`: Orvane counts it only once, answers `{"ok": true, "deja": true}` (`deja`: already) and takes nothing from the quotas. 1 to 64 letters, digits or `. _ : -` (not first); it belongs to each game. The kits do it.
- `action` is one of:
  - `rencontre` (encounter): the animal was seen, once per animal ;
  - `prelevement` (kill): the animal died because of the player ;
  - `capture`: it was tamed; `liberation`: it was released ;
  - `nourrissage` (feeding), `reproduction` (breeding): the player helped it ;
  - `deplacement` (relocation): it was carried elsewhere, with `vers` (to) ;
  - `habitat_perdu`, `habitat_gagne`: habitat was destroyed or created, in `n` units ;
  - `defrichage` (clearing), `reboisement` (reforesting), `assechement` (draining), `irrigation`, `construction` (building), or `transformation` with `axe` and `sens` (1 up, −1 down): the player changed the land, in `n` units of area. These actions have no `taxon`. Building also removes habitat ([docs/22](docs/22-milieu-transforme.md), in French).
  - `blessure` (wounded, it survives), `effarouchement` (stopped without harm by a deterrent: a fire, a light, a noise), `pillage` (it helped itself to the player's food, crops or bait), `attaque` (it attacked a player, hit or miss), `joueur_tombe` (a player died or was knocked out because of it): what animals live through without being removed, with `moyen` (means) if the game knows how: `melee`, `distance` (ranged), `piege` (trap), `feu` (fire), `lumiere` (light), `bruit` (noise). The world turns them into the memory of its populations, each lineage according to its temperament: struck at close range (`melee`, or no means given), a combative lineage learns to stand its ground; struck from afar or by a trap it has no one to charge, and learns to flee. Say the means of a kill or a wound whenever the game knows it. **Send them only if the snapshot you read carries `monde.memoire`**: otherwise the server rejects the whole batch ([docs/50](docs/50-memoire.md), in French).
- Do not count natural deaths, prey taken by other animals, or another player's animals. Count a death when the game causes it, not by watching hit points.
- `q` (optional) gives the mean value of the continuous traits of the animals taken: this tells Orvane whether players take the largest ones.
- `parcelle` (optional, if the world has plots): the plot where the event happened, taken from `inst.parcelles` among those of its biome. The hunt is applied there instead of being spread over the whole biome. If the lineage does not live there, or too few of it do, what that plot cannot lose is taken from the plots where it does live: nothing is lost ([docs/15](docs/15-parcelles.md), in French).

Then send it:

```js
const r = await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_deposer', {
  method: 'POST', headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle: 'orv_…', p_compte: opaquePlayerId, p_lot: batch }) });
const answer = await r.json();
if (answer.ok) forgetBatch(); else keepForLater(answer.erreur);
```

- `p_compte` is an opaque player id, for example a hash of their account id. Orvane only keeps a pseudonym of it, and only uses it for the per-player caps.
- Keep the batch in memory and in local storage until `ok: true`, with its `id`, then send it at a natural moment: a save, a logout, a change of area. Without an answer, send it again as it is: `deja: true` says it was already in.
- Limits: 500 events and 64 KB per batch; every event must follow the schema (a known action, `n` between 0 and 10,000); 48 batches per player per day; 500 batches per day for a new game, raised in steps on request (2,000, 5,000, 20,000: the procedure and what it asks in return are in [hebergement/LISEZ-MOI.md](hebergement/LISEZ-MOI.md#relever-le-quota-dun-jeu), in French; Stone Valley has 20,000).

At the next cycle, the world reads the batches of every game and relates each to that game's exposure. It caps them: one player weighs no more than another; a single game does not make alone the pressure on a species that other games also show; and, even alone, a game removes no more than 5% of a population per cycle, counted before smoothing. In a world with plots, what it says it did in a plot takes no more than 5% of what the lineage counts there: the rest goes to the plots where it lives (except what smoothing carries over from past days, spread by head count). What it gives back (releases, feeding, breeding) has no such cap. A game can lower it in its exposure, never raise it (`part_max_population_jeu`, [docs/5](docs/5-profil-et-essais.md) and [docs/15](docs/15-parcelles.md), in French). Then it smooths them and moves the world forward. The effect shows in the next instantané. Details: [docs/4](docs/4-renvoyer-des-pressions.md) and `schemas/pression.schema.json`.

## 6. Deposit from a server

The game key is public: it sits in the client, and whoever reads it can deposit in the game's name, with a new player id for every batch. A game that has a server (a Supabase function, a Node server) can protect itself: it deposits from that server, with a **deposit key** the client never sees, then asks Orvane to **require** it. Batches without it are then refused. Nothing changes for a game that does not do this.

**1. Create the deposit key**, with the admin key (once; asking again renews it, and the old one stops working at once):

```sh
curl -X POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_cle_depot \
  -H "apikey: sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8" -H "Content-Type: application/json" \
  -d '{"p_cle_admin": "orvadm_…"}'
```

```json
{ "ok": true, "jeu": "my-game", "cle_depot": "orvdep_4b1f…", "exigee": false, "note": "…" }
```

It is shown only once: Orvane keeps only its hash. Store it in the server's secrets (for a Supabase function: `supabase secrets set ORVANE_CLE_DEPOT=orvdep_…`), never in the client, nor in a code repository.

**2. Deposit from the server**, with `kits/serveur/depot.mjs`: a small client with no dependency that only uses `fetch` (Node 18 or later, Deno). It gives the batch an `id` if it has none (and writes it into the batch), and resends it on its own when the network or Orvane fails (four tries, half a second then doubling): thanks to the `id`, a resend is never counted twice.

A Supabase function (Deno), to which the game's client sends its batch:

```ts
// supabase/functions/orvane-depot/index.ts — depot.mjs (and depot.d.ts) copied next to it, from kits/serveur/
import { deposer } from './depot.mjs';

// an opaque player id: a hash, never their id in clear
const opaque = async (id: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('my-game:' + id))),
  (o) => o.toString(16).padStart(2, '0')).join('').slice(0, 32);

Deno.serve(async (req) => {
  const player = await playerOfTheSession(req);   // yours: the player your game's session authenticates, not an id the client wrote
  if (!player) return new Response('no', { status: 401 });
  const batch = await req.json();                 // the batch the client closed, with its id
  const r = await deposer({ cle: Deno.env.get('ORVANE_CLE_JEU')!, cleDepot: Deno.env.get('ORVANE_CLE_DEPOT')! }, await opaque(player.id), batch);
  // r: { ok: true, id } · { ok: true, deja: true, id } · { ok: false, erreur, id, plusTard, config? }
  if (r.ok) return Response.json({ ok: true, id: r.id });                            // the game forgets the batch (accepted, or already in)
  console.error('Orvane deposit refused:', r.erreur, r.config ? '(configuration to fix: a key)' : '');   // for you, not for the player
  // plusTard: the game keeps the batch and sends it again later, as it is (the network, a quota, a renewed key); otherwise it sets it aside
  return Response.json({ ok: false, id: r.id, plusTard: r.plusTard }, { status: r.plusTard ? 503 : 422 });
});
```

A Node server:

```js
import { deposer } from 'orvane/serveur';          // npm install github:stonevalleyoff-ai/orvane#<version>; in CommonJS: require('orvane/serveur')
const options = { cle: process.env.ORVANE_CLE_JEU, cleDepot: process.env.ORVANE_CLE_DEPOT };
const r = await deposer(options, opaquePlayerId, batch);
if (r.ok) forget(batch.id);                       // accepted, or already in (r.deja)
else if (r.plusTard) keepForLater(batch);         // the network, a daily quota, a key to fix (r.config): the same batch, the same id, later
else setAside(batch, r.erreur);                   // the batch itself (outside the contract, an id already taken): resending it will not help
if (r.config) report(r.erreur);                   // a renewed, wrong or missing deposit key: to fix, the batches wait
```

Copying `depot.mjs` next to the function is safer than importing it from an address: the code that holds the deposit key does not change behind your back. To import it anyway, pin a published version, the first one that carries it or a later one (`CHANGELOG.md`), never a branch: `https://cdn.jsdelivr.net/gh/stonevalleyoff-ai/orvane@<version>/kits/serveur/depot.mjs`.

**3. Require it**, once the server deposits:

```sh
curl -X POST https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_exiger_cle_depot \
  -H "apikey: sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8" -H "Content-Type: application/json" \
  -d '{"p_cle_admin": "orvadm_…", "p_exiger": true}'
```

`orvane_jeu` then says so (`cle_depot_exigee: true`). `p_exiger: false` goes back. A wrong deposit key is refused even when it is not required.

**The game's client** counts and closes its batches as before, then sends them to its server instead of depositing them: with the Godot kit, `Orvane.prochain_lot()` returns the next pending batch (with its `id`) and `Orvane.oublier_lot(id)` removes it once the server has answered `ok` (`oublier_lot(id, true)` when it was refused for good: the batch is set aside, `lots_refuses()`); with the Unity kit, `compteur.Prochain()`, then `compteur.Depose()` or `compteur.Refuse()`. When the server answers `plusTard`, the batch stays at the head of the queue. A batch refused for good never blocks the next ones: when they deposit themselves (`Orvane.deposer`, `OrvaneUnity.Deposer`), the kits set it aside too. The server trusts only what it knows: the session's player, not a player id written in the batch.

**Renewing the key** (a leak, someone leaving): `orvane_cle_depot` gives a new key, and the old one stops working. Until the new one is in the server's secrets, its deposits are refused (`clé de dépôt invalide`): the client answers `plusTard` and `config`, the server and the game keep the batches, and send them again as they are, with their `id`, once the new key is in place. To refuse none, stop requiring it during the change, then require it again.

## 7. Try your batches on a copy of the world

The `essai` world keeps batches for fourteen days but no world reads them: it tells whether a deposit goes through, not what it does to the world. To see that, replay your batches on a copy of today's world, on your machine, without network: [docs/5](docs/5-profil-et-essais.md), "Rejouer ses lots" (in French; the commands are copy-paste).

## 8. Read your season report

The buffer knows what each game removed from each population. Every season (30 cycles in the world of Orvane, aligned on its seasons), the nightly cycle publishes it, game by game: this is the reference. A game that publishes its own report (Hors-Cordon has committed to it; a game asking for 20,000 batches a day commits to following it) relays this one, or compares itself to it.

- **Where**: `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/`: `index.json` (finished seasons, most recent first, and the current one), `en-cours.json` (the current season, rewritten every cycle), and one file per finished season (`an-0-ete.json`…), written once and never rewritten. The format: `schemas/bilan.schema.json` (TypeScript: `Bilan`, `BilanIndex`). In the observatory: the Bilans view.
- **What it says**, for each game (its `id` and public name, as in `jeux.json`), lineage by lineage and biome by biome: what its batches asked for (`demande`), what was applied after every cap (`applique`), and what each cap trimmed (`rabote`: `activite` a player's activity brought back to normal, `compte` the per-player cap, `part_compte` and `part_jeu` the share of one player or one game, `plafond_jeu` the 5% cap of a game, `population` the cap of a population), separately for what is removed (`ote`: kills, captures, moves) and given back (`rendu`: releases, feeding, bred animals). And the share of the head count: over the season (`part`, against the population's average head count over the cycles the game touched it) and the largest in a single cycle (`part_max_cycle`, never above the game's cap).
- **In animals**: those the engine removes or adds (an adult kill counts 1.2; a feeding gives back 0.2 animal). Each cycle counts what the buffer kept, caps included, before smoothing: what is counted at the end of a season weighs mostly at the start of the next one.
- **No player data**: no player id, no pseudonym, only games.

```js
const base = 'https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/bilans/';
const index = await (await fetch(base + 'index.json')).json();
const report = await (await fetch(base + index.saisons[0].fichier)).json();   // the last finished season
const mine = report.jeux.find(j => j.id === 'my-game');                     // missing: nothing deposited this season
```

The details (the season, the reference head count, what the report does not say, a real example): [docs/4](docs/4-renvoyer-des-pressions.md), « Le bilan de saison » (in French; field names in [docs/glossary.md](docs/glossary.md)).

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
| `quota du jeu atteint pour aujourd'hui` | the game's quota in 24 hours (500 for a new game) | keep the batches for tomorrow; a game that needs more opens a quota request (an issue, template « Relever le quota d'un jeu ») |
| `événement mal formé (schemas/pression.schema.json)` | an event that is not an object, an unknown action, `n` missing, negative or above 10,000, a name that is not a string | follow the schema |
| `id du lot : 1 à 64 lettres, chiffres, points, tirets, deux-points` | an `id` that is empty, too long, not a string, or has another sign | draw the `id` at random (a UUID, 32 hex digits) |
| `id du lot déjà pris par un autre lot de ce jeu` | the same `id` on another batch (the same batch resent, even by another player id, answers `deja`) | a new `id` for each batch; the same one only to resend the same batch; set this one aside |
| `ce jeu ne dépose que depuis son serveur : clé de dépôt manquante` | the game requires its deposit key, the deposit does not carry it | deposit from the server (section 6) |
| `clé de dépôt invalide` | a wrong or replaced deposit key | keep the batches; put the key from the last `orvane_cle_depot` in the server, then resend them |
| `pas encore de clé de dépôt : la créer d'abord (orvane_cle_depot)` | `orvane_exiger_cle_depot` before having a key | `orvane_cle_depot` first |

## Rules

- The admin key never goes into a published game, nor into a code repository; neither does the deposit key, nor into the client. No Supabase service key is ever needed to connect a game.
- Orvane only receives counts ("14 killed, 31 met"), never conclusions, and no personal data: `p_compte` is opaque.
- The world belongs to every game: a game weighs on it in proportion to its players; even alone, it removes no more than 5% of a population per cycle, and when several games hunt the same population, a single game's share is brought down to half of the pressure (section 5).
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
- [ ] A sent batch answers `ok: true`; otherwise it is kept and sent again later, with the same `id`.
- [ ] A game that deposits from its server keeps its deposit key in the server's secrets, and requires it (`orvane_exiger_cle_depot`).
- [ ] The next day, `pressions_recues` rises in the instantané's `cycle`.
- [ ] The game finds its `id` in the season report (`bilans/en-cours.json`), and what it reads there (`demande`) matches what it counted.
- [ ] The translator passes the generic test bench: `node outils/banc-traducteur.js my-translator.js` (docs/39; the model: `traducteurs/exemple/traducteur.js`).
