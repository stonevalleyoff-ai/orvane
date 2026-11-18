# Orvane

**Un moteur d'écosystème et d'évolution, et un monde vivant que tous les jeux partagent.**

Orvane fait vivre un seul monde, le monde d'Orvane : 24 biomes, de la banquise aux abysses, et plus d'une centaine de lignées inventées par l'évolution, pas par un dessinateur. Elles naissent, se nourrissent, se chassent, migrent, mutent et se séparent en espèces nouvelles. Le monde avance d'un cycle chaque nuit.

N'importe quel jeu peut s'y brancher. Il lit le monde et en fait ses créatures, chacune à sa façon. Puis il renvoie ce que font ses joueurs (les bêtes croisées, chassées, apprivoisées), et le monde en tient compte la nuit suivante. Une espèce trop chassée se raréfie, devient méfiante, rapetisse si l'on prend toujours les plus grandes, et cela dans tous les jeux à la fois.

- **Voir le monde vivre** : [l'observatoire](https://stonevalleyoff-ai.github.io/orvane/monde/?monde=orvane), [la démo](https://stonevalleyoff-ai.github.io/orvane/demo/) : un jeu minuscule branché sur le monde, et [le simulateur](https://stonevalleyoff-ai.github.io/orvane/simulateur/) : des joueurs fictifs, et ce que les bêtes en retiennent
- **Pour les studios** : [ce qu'Orvane apporte à un jeu](https://stonevalleyoff-ai.github.io/orvane/studios/), et [se brancher en une heure](EN-UNE-HEURE.md)
- **Brancher un jeu** : [le guide pas à pas](BRANCHER-UN-JEU.md) et [la page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/) ; in English: [CONNECT-A-GAME.md](CONNECT-A-GAME.md) and [the field glossary](docs/glossary.md)
- **Écrire son traducteur** : [le mode d'emploi en 39 chapitres](docs/LISEZ-MOI.md)
- **Le fonctionnement, fichier par fichier** : [LISEZ-MOI.md](LISEZ-MOI.md) et [l'hébergement](hebergement/LISEZ-MOI.md)

## Comment ça marche

```
            chaque nuit, 03:17 UTC
   lots des joueurs ──► tampon ──► moteur ──► instantané publié (GitHub Pages)
          ▲                                          │
          │                                          ▼
   le Supabase d'Orvane ◄── orvane_deposer ── chaque jeu (son traducteur)
```

- **Le moteur** (`moteur/`) fait évoluer des populations : effectifs par biome, chaîne alimentaire, génétique continue, reproduction, hybrides, organes, méfiance. Il est déterministe, sans dépendance, et tourne sous Node ou dans le navigateur.
- **Le tampon** (`tampon/`) se place entre le monde et chaque jeu. Il adoucit ce que le jeu montre et plafonne ce que les joueurs pèsent : un seul jeu ne fait jamais plus de la moitié de la pression sur une espèce.
- **Le contrat** (`schemas/`) tient en trois objets JSON : l'instantané, le lot de pressions, le profil. Il est versionné (1.0) et ne casse pas sans prévenir ; ce qui change est dans [le journal](CHANGELOG.md) (docs/43).
- **Le paquet** : `npm install github:stonevalleyoff-ai/orvane#v1.0.0`, puis `const { Orvane, Tampon, Solo } = require('orvane')`.
- **Le premier client** est Stone Valley. Son traducteur complet est dans `traducteurs/stone-valley/`.

## Licence

Orvane est sous la **licence de branchement Orvane** ([LICENSE](LICENSE)). Le code est publié pour être lu et pour brancher un jeu, pas pour être réutilisé. N'importe qui peut brancher son jeu, même commercial ou au code fermé, s'en servir des lignées du monde et copier dans son jeu les pièces de branchement (les schémas, les types, le tampon, les kits, le traducteur d'exemple). En échange, un jeu branché **renvoie les pressions de ses joueurs** au monde qu'il lit. Le reste (le moteur, la genèse, l'hébergement, l'observatoire, les mondes) ne se réutilise pas sans l'accord écrit de StoneValley. Ce qui a été publié avant le 18 novembre 2026 l'a été sous PolyForm Shield 1.0.0. Copyright StoneValley.

## In English

Orvane is an ecosystem and evolution engine running **one shared living world**: 24 biomes and over a hundred lineages invented by evolution. The world advances one cycle every night. Any game can plug in:
1. register on the [sign-up page](https://stonevalleyoff-ai.github.io/orvane/inscription/) to get a game key;
2. read the world from `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/instantane.json` and turn its lineages into creatures;
3. report what players do (encounters, kills, captures) through the `orvane_deposer` RPC.

Over-hunted species become rarer, warier or smaller, in every connected game. The step-by-step guide, with endpoints and examples, is [CONNECT-A-GAME.md](CONNECT-A-GAME.md), and [docs/glossary.md](docs/glossary.md) translates every field name; the rest of the documentation is in French. A game can read only the biomes it plays, piece by piece (`tampon/morceaux.js`). Licence: the Orvane Connection Licence ([LICENSE](LICENSE), French text binding, English translation included). Any game, commercial or closed-source, may connect to the world and ship the connection pieces (schemas, types, buffer, kits, example translator), provided it sends its players' pressures back to the world it reads. The rest of the code is not reusable without StoneValley's written consent.
