# 19. Le temps : un monde à son rythme

Jusqu'ici, tous les mondes tournaient une fois par nuit. Un jeu qui voulait voir l'évolution d'une heure à l'autre ne le pouvait pas, et un jeu solo, ou hors ligne, n'avait pas de monde à lui. Maintenant, chaque monde hébergé tourne à son propre rythme, de quelques minutes à plusieurs jours. Et un jeu peut faire vivre dans son propre code un monde solo, parti du monde d'Orvane, qui avance avec le temps réel ou en accéléré. C'est le deuxième des quatre points qui rendent Orvane universel (la feuille de route, étape 2.7).

## Ce qu'est un cycle

Un cycle est un pas du monde : les bêtes naissent, meurent, migrent, mutent, une fois. Le moteur ne connaît que des cycles. La durée réelle d'un cycle ne change rien à la biologie, seulement la fréquence des pas. Un monde réglé à une heure évolue 24 fois plus vite, en temps réel, qu'un monde réglé à un jour. Les saisons se comptent aussi en cycles (`monde.annee`, docs/5). Un monde à l'heure avec `annee: 24` a donc une année par jour.

## Le rythme d'un monde hébergé

```json
"monde": { "id": "orvane", …, "cycle": "24h", "heure": "03:00", "rattrapage": 3 }
```

- `cycle` : la durée réelle d'un cycle, par exemple `"24h"`, `"6h"`, `"1h"`, `"30min"`, `"10m"` ou `"7d"`. Sans réglage, c'est 24 heures.
- `heure` : l'heure de cycle, en UTC. Sans réglage, c'est `"03:00"`. Les heures de cycle partent de là et reviennent toutes les `cycle` : à 03:00 chaque jour pour un monde au jour, à 03:00, 09:00, 15:00 et 21:00 pour un monde à 6 heures, à chaque heure pleine pour un monde à l'heure, le lundi à 03:00 pour un monde à la semaine.
- `rattrapage` : le nombre maximal de cycles dus que le monde rattrape d'un coup après une absence. Sans réglage, c'est 3.

L'action GitHub (`.github/workflows/cycle.yml`) passe à la 17ᵉ minute de chaque heure. Pour chaque monde, elle compte les heures de cycle franchies depuis le dernier cycle (`hebergement/cycle.js --auto`) :
- si aucune n'est franchie, rien ne tourne et rien n'est lu : les lots attendent dans Supabase ;
- sinon, le monde fait un cycle par heure franchie, au plus `rattrapage`. Le reste est perdu : un monde qui a manqué une semaine ne la rattrape pas d'un coup ;
- le dernier cycle est daté de l'heure où l'action est partie, et les traducteurs s'y réfèrent.

Le monde d'Orvane tourne donc chaque jour vers 03:17 UTC. Une action en retard ne le fait pas dériver : le lendemain, il tourne de nouveau vers 03:17. Un monde à l'heure tourne à chaque passage. L'action ne passe qu'une fois par heure : un monde à dix minutes y fait 6 cycles d'un coup, s'il a un `rattrapage` d'au moins 6. Pour un rythme plus fin que l'heure, il vaut mieux un monde solo.

**À la main.** « Run workflow » fait tourner chaque monde du nombre de cycles demandé (1 par défaut), sans regarder l'heure. Le champ vide : les cycles que chaque monde doit. Pour essayer une heure donnée : `node hebergement/cycle.js <monde> --auto --maintenant 2026-11-05T03:17:00Z`.

## Un monde solo

`moteur/solo.js`. Le monde solo vit dans le jeu même : le navigateur du joueur, son téléphone, un serveur de jeu. Il part d'un instantané publié, le monde d'Orvane tel qu'il est ce jour-là, ou d'un monde à soi. C'est ensuite une copie qui vit sa vie, et rien n'en part vers le monde partagé.

```js
const S = OrvaneSolo.creer(instantane, { periode: '10m' });     // un monde solo, parti de l'instantané publié
OrvaneSolo.noter(S, { taxon, biome, action: 'prelevement', n: 1 });   // ce que fait le joueur (le format des lots, docs/4)
const evenements = OrvaneSolo.avancer(S, Date.now());           // les cycles dus depuis la dernière fois, et ce qui s'y est passé
OrvaneSolo.cycles(S, 5);                                        // cinq cycles tout de suite
localStorage.setItem('monde', OrvaneSolo.sauver(S));            // le garder…
const S2 = OrvaneSolo.charger(localStorage.getItem('monde'));   // … et le reprendre
const monde = OrvaneSolo.vue(S);                                // ce que le jeu lit : un instantané, comme instantane.json
```

**Les options de `creer`** :

| option | défaut | ce qu'elle fait |
| --- | --- | --- |
| `periode` | `'1h'` | la durée réelle d'un cycle (comme `monde.cycle`), ou un nombre de millisecondes |
| `acceleration` | 1 | le temps qui passe plus vite : à 60, une minute réelle compte pour une heure |
| `rattrapage` | 24 | le nombre maximal de cycles dus rattrapés d'un coup ; au-delà, le temps est perdu |
| `flore` | | `flore.json`, publié à côté de l'instantané : avec lui, le monde solo a ses plantes (docs/17) ; sans, il tourne sans flore |
| `id`, `nom`, `graine` | `<monde>-solo` | le nom du monde solo ; une autre graine, et il diverge autrement |
| `maintenant` | `Date.now()` | l'heure de départ |
| `profil` | `OrvaneSolo.PROFIL` | le profil du tampon (docs/5). Par défaut, c'est l'exposition neutre, et un seul joueur peut peser sans plafond par compte. Un cycle ne retire jamais plus de 30 % d'une population |

**`avancer`** fait les cycles que le temps doit depuis la dernière fois, au plus `rattrapage`. Il rend les événements de ces cycles (les naissances de lignées, les extinctions, les épidémies), que le jeu peut raconter. Le temps qui reste, une partie de cycle, est gardé pour la fois suivante.

**`noter`** retient ce que fait le joueur, au format des événements d'un lot (docs/4) : `taxon`, `biome`, `action`, `n`, avec `phenotype`, `q` et `parcelle` en option. Au cycle suivant, les notes passent par le même tampon que celles du monde partagé, puis sont effacées.

**Il est déterministe.** Le même monde, avec les mêmes notes et les mêmes cycles, donne le même résultat, sous Node comme dans un navigateur. Une partie sauvée et reprise continue exactement comme si elle ne s'était pas arrêtée.

**Dans un navigateur**, chargez les fichiers du moteur dans cet ordre, avant le vôtre :

```html
<script src="moteur/catalogue.js"></script> <script src="moteur/corps.js"></script>
<script src="moteur/synthetique.js"></script> <script src="moteur/flore.js"></script> <script src="moteur/pathogenes.js"></script>
<script src="moteur/orvane.js"></script> <script src="tampon/tampon.js"></script> <script src="moteur/parcelles.js"></script>
<script src="moteur/solo.js"></script>
```

**Ce qu'il coûte.** Le monde d'Orvane (112 lignées) prend environ 0,6 seconde par cycle sur un ordinateur, et 1 Mo une fois sauvé. Un monde sur un téléphone gagne à tourner peu de cycles à la fois : un `rattrapage` de 5 à 10, ou un `avancer` lancé pendant un écran de chargement.

**Ce qu'il porte.** `monde.solo` indique le monde partagé dont il est parti et le cycle de départ. Le monde solo est par biome, même s'il part d'un monde à parcelles : ce que l'instantané garde des parcelles n'est qu'un décompte. Il garde la Mère et ses machines (docs/16) et les souches (docs/18) du monde dont il part.

## Ce que le banc vérifie

`bancs/temps.js`, en moins d'une minute :

| | |
| --- | --- |
| un monde à l'heure, dernier cycle à 06:20, l'action à 09:18 | 3 cycles |
| le même, dernier cycle à 00:20, avec un rattrapage de 2, à 10:18 | 2 cycles |
| un monde à la demi-heure, d'une action à la suivante | 2 cycles |
| un monde à dix minutes, avec un rattrapage de 10, d'une action à la suivante | 6 cycles |
| un monde au jour, dernier cycle à 03:18, à 23:17 | rien : son heure n'est pas revenue |
| le même, après une action en retard (03:40), le lendemain à 03:17 | 1 cycle : il ne dérive pas |
| un monde au jour réglé à 18:00, à 18:17 | 1 cycle |
| à la main, `--cycles 2` | 2 cycles, quelle que soit l'heure |

Le dernier cycle est daté de l'heure où l'action est partie. Et le monde solo :
- **Le temps réel.** À 10 minutes par cycle, il fait 3 cycles à 35 minutes, toujours 3 à 39 minutes, et 4 à 40 minutes.
- **L'absence.** Après une semaine sans le jeu, avec un rattrapage de 5, il fait 5 cycles, puis plus rien n'est dû.
- **L'accéléré.** À × 60, un monde à l'heure fait 3 cycles en 3 minutes.
- **La chasse.** Un joueur prélève 5 % d'une population par cycle pendant 5 cycles. Il en reste 79 % de ce qu'il y aurait sans lui, et le monde partagé n'a pas changé.
- **La sauvegarde.** Sauvé, rechargé et relancé deux fois, il donne deux fois le même monde, et le même dans un navigateur qu'avec Node.
- **La flore.** Avec `flore.json`, ses brouteurs tournent comme dans le monde dont il part.
- **Le contrat.** Ce que le jeu lit respecte `schemas/instantane.schema.json`.

```
node bancs/temps.js
```

## Ce qui reste ouvert

- **Un monde solo qui rejoint le monde partagé.** Une partie hors ligne pourrait, de retour en ligne, envoyer au monde partagé ce que le joueur a fait, comme un lot en retard. Aujourd'hui, rien n'en revient.
- **Un rythme plus fin que l'heure pour un monde hébergé.** L'action GitHub ne passe qu'une fois par heure. Un hébergement à soi (un serveur, une fonction planifiée) peut lancer `cycle.js --auto` plus souvent.
