# Brancher un jeu sur Orvane, en une heure

Ce parcours mène un développeur, en une heure, de « je découvre Orvane » à « mon jeu lit le monde et lui renvoie ce que font ses joueurs ». On commence dans un **monde bac à sable** : rien de ce que vous déposez n'y touche au monde partagé. On passe au vrai monde à la fin.

Pour voir le résultat avant de commencer, ouvrez [la démo](https://stonevalleyoff-ai.github.io/orvane/demo/) : un jeu minuscule qui fait exactement ce qui suit.

## 0 – 5 min · S'inscrire

Sur la [page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/), le nom du jeu suffit. Vous recevez deux clés :
- **la clé du jeu** (`orv_…`), publique : elle va dans le code du jeu ;
- **la clé d'administration**, secrète : elle ne va jamais dans un jeu publié, ni dans un dépôt de code.

## 5 – 15 min · Lire le monde

Le monde est un fichier JSON, publié chaque jour, sans clé :

```
https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/instantane.json
```

| votre moteur | lire le monde |
| --- | --- |
| JavaScript | `const inst = await (await fetch(MONDE + 'instantane.json', { cache: 'no-cache' })).json();` |
| Unity | `StartCoroutine(OrvaneUnity.Lire(new Branchement(), inst => …));` ([le kit](kits/LISEZ-MOI.md)) |
| Godot 4 | `Orvane.instantane_lu.connect(…); Orvane.lire()` ([le kit](kits/LISEZ-MOI.md)) |
| autre | une requête HTTP, un lecteur JSON |

Pour ne lire que les lieux que vous jouez : `OrvaneMorceaux.lire(MONDE, { biomes: ['prairie'] })` (`tampon/morceaux.js`, quelques dizaines de Ko au lieu de plusieurs Mo).

Ce que vous y trouvez : des **lieux** (`biomes`) et des **lignées** (`taxons`). Chaque lignée a un `id` stable, un `nom`, un `plan` (`regime`, `masse_kg`, `locomotion`, `activite`, `corps` : sa silhouette) et des `populations` par lieu, avec leur `effectif`. [Le chapitre 1](docs/1-lire-un-instantane.md) dit tout le reste.

**Une règle, une seule** : ignorez ce que vous ne connaissez pas (un champ, une valeur, un lieu). C'est ce qui permet à Orvane de grandir sans casser votre jeu ([docs/43](docs/43-versions.md)).

## 15 – 35 min · Traduire

C'est votre part : faire du monde d'Orvane le monde de votre jeu.

1. **Les lieux.** Reliez chaque terrain de votre jeu à un ou plusieurs lieux d'Orvane (`prairie`, `foret`, `lac`…). Ceux que vous ne jouez pas, ignorez-les.
2. **Les créatures.** Pour chaque lignée vivante d'un lieu que vous jouez, faites une créature. Prenez sa taille de `masse_kg`, son comportement de `regime` et `activite`, son apparence de `plan.corps` (ou d'un modèle par `corps.forme` : quadrupède, oiseau, poisson…). Montrez-en d'autant plus que son `effectif` est grand.
3. **Partez du modèle.** `traducteurs/exemple/traducteur.js` est le plus petit traducteur qui se branche correctement : copiez-le, changez la liste des lieux et la façon de faire une créature.

## 35 – 50 min · Renvoyer ce que font les joueurs

Comptez au moment où ça arrive, dans le lieu d'Orvane où ça arrive :
- une **rencontre** par bête vue ;
- un **prélèvement** par bête tuée ;
- une **capture** par bête apprivoisée ;
- un **défrichage**, un **assèchement**, une **construction**, en unités de surface (sans lignée).

Puis déposez ces comptes par lots, à un moment naturel (une sauvegarde, une fin de partie). Les kits Unity et Godot le font pour vous ; en JavaScript :

```js
const lot = { orvane: '1.0', monde: 'essai', instantane: inst.cycle.n,
  source: { jeu: 'mon-jeu', compte: compteOpaque },
  periode: { debut: '2026-11-07T18:00:00Z', fin: '2026-11-07T19:00:00Z' },
  evenements: [{ taxon: 'dunvi', biome: 'savane', action: 'rencontre', n: 12 },
               { taxon: 'dunvi', biome: 'savane', action: 'prelevement', n: 1 }] };
const r = await fetch('https://rospodujiyltmxitykwc.supabase.co/rest/v1/rpc/orvane_deposer', { method: 'POST',
  headers: { apikey: 'sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_cle: 'orv_…', p_compte: compteOpaque, p_lot: lot }) });
console.log(await r.json());   // { ok: true }
```

- **Le bac à sable : `monde: 'essai'`.** Orvane garde le lot quatorze jours, puis l'efface ; aucun monde ne le lit. C'est là qu'on essaie.
- `compteOpaque` : un identifiant du joueur qu'Orvane ne peut pas relire, par exemple un hachage de son identifiant.
- Avant le premier dépôt, `node outils/verifier.js mon-lot.json` dit si le lot sera accepté.
- Un lot refusé, ou sans réseau : gardez-le, renvoyez-le plus tard.

## 50 – 60 min · Vérifier, puis passer au vrai monde

```
node outils/banc-traducteur.js mon-traducteur.js
```

Le banc fait lire sept mondes à votre traducteur, dont un monde piège : une forme et un organe inconnus, une lignée éteinte, un lieu que nul jeu ne connaît. Il vérifie :
- que votre traducteur n'oublie aucune lignée et n'invente aucune créature ;
- qu'il lit toujours de la même façon ;
- que ses lots seront acceptés.

Quand tout passe, remplacez `monde: 'essai'` par `monde: 'orvane'`. Le lendemain, après le cycle de 03:00 UTC, `cycle.pressions_recues` monte dans l'instantané, et vos joueurs pèsent sur le monde.

## Et ensuite

- [La liste de vérification complète](BRANCHER-UN-JEU.md#liste-de-vérification), et le guide pas à pas ([BRANCHER-UN-JEU.md](BRANCHER-UN-JEU.md), en anglais : [CONNECT-A-GAME.md](CONNECT-A-GAME.md)).
- Montrer ce qui compte, selon votre genre : [le directeur de mise en scène](docs/40-directeur.md) et [les profils de genre](docs/41-profils-de-genre.md).
- Un monde à soi, dans le jeu, hors ligne ou en accéléré : [le monde solo](docs/19-le-temps.md) (en JavaScript).
- Une question : [ouvrez une discussion](https://github.com/stonevalleyoff-ai/orvane/issues/new?title=Brancher%20mon%20jeu%20sur%20Orvane).
