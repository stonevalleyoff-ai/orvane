# 51. Les carnivores de la genèse 7 : des règles qui ne sont pas les leurs

Depuis que la genèse 7 a rejoint le monde d'Orvane par trois ponts (docs/23, cycle 42, 4 novembre), ses carnivores reculent à chaque cycle, alors que ses herbivores triplent. Ce chapitre dit pourquoi, chiffres à l'appui, et la règle qui l'arrête.

**Ce ne sont pas les proies qui manquent.** Les « carnivores » de la genèse 7 sont des omnivores de fait. Presque toutes leurs naissances venaient des plantes, sous des règles qui ont changé le lendemain de leur genèse. Le monde d'Orvane ne leur laisse qu'un cinquième de ce qu'ils en tiraient.

## Ce qu'on voit

Le monde publié (branche `publication`, `historique.json` et `instantane.json`), les lignées groupées par `plan.regime` et `origine.nom` :

| groupe | cycle 42 | cycle 57 |
| --- | --- | --- |
| carnivores de la genèse 7 (40 lignées) | 3 094 171 | 1 531 565 (−50 %) |
| herbivores de la genèse 7 (21) | 4 212 486 | 12 806 517 (× 3,0) |
| omnivores de la genèse 7 (37) | 17 808 126 | 16 643 097 (−6,5 %) |
| carnivores d'Orvane (16) | 222 013 | 227 145 (+2 %) |

Les carnivores de la genèse 7 perdent 5,7 % au cycle 42, puis un peu moins à chaque cycle : 3,9 % au cycle 57. Leur satiété moyenne (pondérée par l'effectif) est de 0,23, contre 0,54 chez ceux d'Orvane. Deux petites lignées sont déjà menacées : `vacor` (21 bêtes) et `angraume.ossuaire` (16). Les joueurs n'y sont pour rien : ils retirent environ six bêtes par cycle, dans tout le monde.

La saison rend le constat plus net. Chez elle, sous le moteur de sa genèse, la genèse 7 voit ses carnivores suivre l'année : de 3,0 millions en hiver à 5,8 millions en été, de −2,2 % par cycle à la fin de l'automne à +1,4 % au printemps. Aux phases des cycles 42 à 57 (de la fin du printemps au cœur de l'été), ils gagnaient de 1,2 % à 0,4 % par cycle. Dans le monde d'Orvane, à la même saison, ils perdent de 5,7 % à 3,9 %. Pour juger d'une règle, on compare donc deux mondes au même cycle, ou un monde à lui-même un an plus tard.

Toutes les mesures qui suivent viennent de ces fichiers, ou d'un cycle refait sur la machine depuis l'état publié (`etat.json`, par parcelle, cycle 57). Le moteur est déterministe, et un cycle refait depuis cet état continue la tendance publiée : −3,9 % au cycle 58.

## Ce que ce n'est pas

**Des proies hors de portée.** Les herbivores qui croissent sont à la portée de ces carnivores :

| herbivore | masse | gagné depuis le cycle 42 | dans les parcelles des carnivores de la genèse 7 | à la portée de… |
| --- | --- | --- | --- | --- |
| `outa` | 76 g | +1,92 million | 100 % | 93 % d'entre eux |
| `yslintor` | 32 g | +1,36 million | 100 % | 94 % |
| `vatorou` | 45 g | +1,23 million | 100 % | 94 % |
| `pherolin` | 37 g | +1,21 million | 100 % | 94 % |
| `kisoel` | 37 g | +1,18 million | 100 % | 94 % |
| `orvalo` | 99 g | +0,58 million | 100 % | 87 % |
| `oucor` | 161 g | +0,33 million | 100 % | 84 % |

« À la portée » : l'appétence (`appetence`, moteur/orvane.js : la masse, la vitesse, le vol, le groupe, l'heure) n'est pas nulle, en part de l'effectif des 40 lignées. Pour `sotisnou` (443 g, la lignée médiane), elle vaut de 0,64 à 1,38 : ce sont de bonnes proies. Sur tout ce que ces carnivores ont à portée (l'appétence × la biomasse, lieu par lieu), 61 % sont des herbivores de la genèse 7, 33 % des omnivores de la genèse 7, 2 % des herbivores d'Orvane. Leurs premières proies sont `outa` (25 %) et `linsilki`, un omnivore de 25 g (22 %).

**Des parcelles différentes.** 98,5 % des carnivores de la genèse 7 vivent sur les parcelles du continent (1 509 288 sur 1 531 565), et les herbivores de la genèse 7 qui croissent y vivent tous. Seuls les herbivores d'ailleurs croissent loin d'eux : `umeja`, des eaux douces (+8,5 millions), et quelques herbivores d'Orvane.

**Les insectes, les régimes en spectre, les saisons des plantes.** Le recul commence au cycle 42, le premier cycle sous les règles du monde d'Orvane. Les régimes en spectre (docs/30) s'éveillent au cycle 44, les saisons des plantes et la flore riche (docs/46, docs/48) au cycle 51. Rien ne casse à ces cycles :

| cycle | 42 | 43 | 44 | 45 | … | 50 | 51 | 52 | … | 57 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| les carnivores de la genèse 7 | −5,7 % | −5,5 % | −5,3 % | −5,1 % | | −4,6 % | −4,4 % | −4,4 % | | −3,9 % |

Le spectre de ces lignées est celui que leur a donné l'éveil (`diete0`), et il n'a pas glissé. Leur appétence pour les insectes et pour la viande ne change donc pas (`Dietes.appetence` la rapporte à l'éveil). Les onze lignées qui ne mangent que des insectes reculent un peu plus vite que les autres (−6,3 % contre −4,6 % au cycle 43), mais l'écart est là dès le cycle 43, avant les spectres : ce sont les plus petites (de 30 à 191 g), qui vivent le moins longtemps.

**La faim.** Ces carnivores mangent mieux qu'avant. Leur satiété était de 0,086 chez eux, dans le monde de la genèse 7 (cycle 3004). Elle est de 0,23 au cycle 57. Ce qu'ils doivent à la viande a presque triplé (0,009 petit par tête et par cycle chez eux, 0,025 au cycle 57). Une petite part en vient d'une règle d'Orvane : les omnivores n'y cherchent en viande que 30 % de ce qu'ils mangent (`viande_omnivore`), ce qui fait passer leur satiété de 0,086 à 0,107. Le reste vient du monde : ils sont deux fois moins nombreux, et les herbivores, leurs premières proies, trois fois plus. Ils mangent bien les proies qui abondent.

**Les maladies.** Elles tuaient 1,5 % d'entre eux par cycle chez eux, 0,02 % au cycle 57.

## Ce que c'est : des omnivores de fait

Le trait `estomac-large` fait digérer les plantes à un carnivore : il le rend omnivore (`fixe: { regime: 'omnivore' }`, moteur/catalogue.js). **100 % des carnivores de la genèse 7 le portent** (99,8 % chez eux, au cycle 3004). Le tampon le savait déjà : pour lui, ces 40 lignées sont des omnivores (`Tampon.regimeDe`, docs/13). Seul leur plan dit encore « carnivore ».

Le moteur fait naître une bête selon le régime de son phénotype. Un carnivore porteur du trait naît donc comme un omnivore :
- des plantes, selon la place qu'il trouve, multipliée par `omnivore_vegetal` (une part de ce qu'en tire un herbivore) ;
- de la viande, au plus `0,3 × r × satiété` (r : son taux de croissance) ;
- et il ne meurt pas de faim : la mort des carnivores affamés (`faim_carnivore`) ne le touche pas.

Chez eux, **90 % de leurs naissances venaient des plantes**. La viande ne les remplace pas : sa part grandit avec la satiété, et pour combler ce que les plantes ne donnent plus au cycle 57, il leur faudrait une satiété de 0,60, soit près de cinq fois plus de proies par tête (un prédateur est rassasié à moitié quand il a trente fois son besoin à portée, `demi_satiete`).

docs/13 le disait déjà : « Les carnivores de genese-7 ont faim. […] Ce sont en fait des omnivores (`estomac-large`) ». La correction est venue après eux.

## Des règles nées après eux

La genèse 7 a été faite le 28 octobre. Le moteur d'alors faisait tirer des plantes à un carnivore porteur d'`estomac-large` autant qu'à un herbivore, et le trait coûtait 5 % de fécondité. Le lendemain, deux corrections sont arrivées (docs/13) :

| quand | ce qui change | où |
| --- | --- | --- |
| 28 octobre (`a0aa297`, le premier moteur du dépôt) | la genèse 7 est publiée : un carnivore porteur tire des plantes autant qu'un herbivore ; le trait coûte 5 % | le moteur |
| 29 octobre (`01fe4eb`) | il n'en tire plus que 40 % (`omnivore_vegetal`) | le moteur, pour tous les mondes |
| 29 octobre (`5558676`) | le trait coûte 20 % de fécondité | le catalogue, pour tous les mondes |
| la genèse du monde d'Orvane | `omnivore_vegetal` 0,2 ; un omnivore de naissance, 60 % (`omnivore_vegetal_base`) ; 30 % de viande (`viande_omnivore`) | `monde.regles` du monde d'Orvane |

La genèse 7 n'a pas de `monde.regles` : elle a vécu ses 3 000 cycles sous le moteur d'avant. Les eaux douces et la mer d'Orvane, elles, sont nées sous les règles du monde d'Orvane (leurs genèses ont reçu ses règles, docs/42). Leurs carnivores sont aussi des omnivores de fait (`estomac-large` chez 99,9 % et 63 % d'entre eux), et ils croissent : +7,5 % et +2 % depuis leur arrivée. C'est la genèse 7 qui fait exception, pas les omnivores de fait.

**Chez elle, avec les moteurs successifs.** L'état de la genèse 7 au cycle 3004, quatre cycles, sans rien du monde d'Orvane :

| moteur | les carnivores, par cycle |
| --- | --- |
| 28 octobre (`a0aa297`), celui de sa genèse | +0,4 %, +0,5 %, +0,5 %, +0,7 % |
| 29 octobre (`01fe4eb`) : 40 % des plantes | −6,5 %, −5,9 %, −5,4 %, −5,0 % |
| 29 octobre (`5558676`) : le trait à 20 % | −7,3 %, −6,6 %, −6,1 %, −5,8 % |
| aujourd'hui (`625cc90`) | −7,2 %, −6,6 %, −6,1 %, −5,8 % |

**Ce que chaque règle leur prend.** Le même état, un cycle, les naissances par tête (les morts : 0,114, dont 0,015 de maladie) :

| règles | des plantes | de la viande | naissances |
| --- | --- | --- | --- |
| celles de sa genèse : tout des plantes, le trait à 5 % | 0,098 | 0,010 | **0,108** |
| tout des plantes, le trait à 20 % | 0,082 | 0,009 | 0,090 |
| celles du moteur aujourd'hui : 40 %, le trait à 20 % | 0,033 | 0,009 | 0,041 |
| celles du monde d'Orvane : 20 %, le trait à 20 % | 0,016 | 0,009 | **0,025** |

Leurs naissances tombent au quart. La part des plantes en fait les quatre cinquièmes, le coût du trait le reste.

**Les règles seules suffisent.** Chez elle, sans fusion, sans parcelles, sans flore ni spectres, la genèse 7 sous les règles du monde d'Orvane refait ce qu'on voit, en six cycles :
- ses carnivores perdent de 8,6 % à 6,6 % par cycle ;
- ses omnivores, de 6,5 % à 2,4 % (`omnivore_vegetal_base` à 0,6 au lieu de 1) ;
- ses herbivores gagnent de plus en plus vite, jusqu'à 5,5 % par cycle : les deux autres brouteurs perdent leurs petits, et la place leur revient.

**L'essor des herbivores est donc une suite, pas une cause.**

## Dans le monde d'Orvane

L'état publié du cycle 57, un cycle, les carnivores de la genèse 7 (par tête) :

| `omnivore_vegetal` | des plantes | de la viande | naissances | morts | par cycle |
| --- | --- | --- | --- | --- | --- |
| 0,2 (le monde d'Orvane) | 0,026 | 0,025 | 0,050 | 0,088 | −3,8 % |
| 0,4 (le moteur) | 0,052 | 0,025 | 0,076 | 0,088 | −1,2 % |
| 1 (leur genèse) | 0,130 | 0,025 | 0,154 | 0,088 | +6,6 % |

La viande compte presque autant que les plantes, mais elle a déjà donné ce qu'elle pouvait. Le recul ralentit parce qu'ils sont moins nombreux : chacun a plus de place et plus de proies. Il ne s'arrête qu'une fois tombé très bas.

## Où cela mène

Le même monde, sans rien changer, un an de plus : 120 cycles depuis l'état du cycle 57, jusqu'au cycle 177, à la même saison.
- **Les carnivores de la genèse 7 perdent encore 81 %.** Ils sont 290 000 au cycle 177, contre 3,09 millions au cycle 42 et 3,28 millions chez eux. Ils reculent de 3 % par cycle jusqu'à l'hiver, touchent 239 000 au cycle 140, puis regagnent 0,4 % par cycle au printemps : ils sont alors si peu que leurs proies abondent (satiété 0,65). Ils s'installent à moins d'un dixième de ce qu'ils étaient chez eux.
- **Les omnivores de la genèse 7 suivent** : −51 % en un an, −66 % au cœur de l'hiver.
- **Aucune lignée ne s'éteint dans l'année**, mais les plus petites n'en sont pas loin : au cycle 96, `vacor` et `angraume.ossuaire` comptaient chacune 16 bêtes.

Le recul ralentit en tombant. Il ne trouve un plancher que très bas.

## Les règles d'origine

Une règle de plus au moteur, `REGLES.origines`, vide par défaut. **Sur les parcelles de leur continent**, les lignées venues d'une fusion par ponts (docs/23) et leurs filles tirent des plantes ce que leur donnait le monde où elles sont nées : `omnivore_vegetal` (un carnivore porteur d'`estomac-large`) et `omnivore_vegetal_base` (un omnivore de naissance). Ailleurs, et pour les autres lignées, rien ne change. Le monde d'Orvane la reçoit par son profil (`mondes/orvane/profil.json`), comme `derive` et `hivernage` (docs/13) :

```json
"regles": { …, "origines": { "genese-7": { "omnivore_vegetal": 1, "omnivore_vegetal_base": 1 } } }
```

- **Ces deux règles seulement.** Elles ne valent que pour les naissances d'une lignée, sur sa propre place. Ce que les lignées se disputent reste réglé par le monde : la viande que cherchent les omnivores (`viande_omnivore`), la chasse. Deux lignées qui chassent la même proie la chassent sous la même règle.
- **La valeur 1.** C'est ce que donnait le moteur sous lequel la genèse 7 s'est faite. Le coût du trait (20 %) reste celui du catalogue.
- **Sur le continent seulement.** Une lignée de la genèse 7 qui passe un pont vit, de l'autre côté, sous les règles du monde d'Orvane, comme les lignées d'Orvane qu'elle y rencontre. Une première version suivait les lignées partout : elles l'emportaient alors sur les lignées d'Orvane, chez elles (plus bas).
- **Le continent.** Ses parcelles portent la marque de la fusion (`prairie~genese-7-4`) ; le moteur la lit sur un de ses ponts (`monde.fusions[].ponts`). Une fusion biome par biome (docs/14), qui n'a pas de continent, ne s'en sert pas.
- **Les filles.** Une lignée née d'une lignée de la genèse 7 suit sa mère : le moteur remonte sa parenté jusqu'à la première ancêtre venue d'ailleurs.
- **Les autres fusions.** Les eaux douces et la mer d'Orvane n'ont pas d'entrée : elles gardent les règles du monde d'Orvane, qui étaient déjà celles de leur genèse.

Le contrat ne change pas : `monde.regles` est un objet libre (`schemas/instantane.schema.json`, `schemas/profil.schema.json`), et le cycle de nuit y verse déjà les règles du profil. Dans le moteur, treize lignes (`moteur/orvane.js`) :

```diff
   faim_migration: .4,        // satiété sous laquelle un prédateur s'en va chercher ailleurs
+  // (docs/51) les règles d'origine : sur les parcelles d'un continent relié par des ponts (docs/23), ses lignées et leurs filles tirent des
+  // plantes ce que leur donnait le monde où elles sont nées : { [fusion]: { omnivore_vegetal?, omnivore_vegetal_base? } } ; ailleurs, et
+  // pour les autres, les règles du monde ; vide, rien ne change
+  origines: {},
@@ cycleBrut
   const prT = pressions.taxons || {}, prB = pressions.biomes || {};
+  // (docs/51) les règles d'origine : la fusion dont vient une lignée (la sienne, ou celle de sa plus proche ancêtre venue d'ailleurs), et
+  // les parcelles de son continent (leur marque, lue sur un pont : « prairie~genese-7-4 » → « ~genese-7- »)
+  const RO = REGLES.origines && typeof REGLES.origines === 'object' && Object.keys(REGLES.origines).length ? REGLES.origines : null, TO = RO ? new Map(tousT.map(t => [t.id, t])) : null;
+  const origineDe = t => { if (RO) for (let id = t.id, k = 0; id && k < 60; id = parentDe(id, TO), k++) { const f = TO.get(id)?.origine?.fusion; if (!f) continue;
+      const o = RO[f], p = o && typeof o === 'object' ? (inst.monde.fusions || []).find(x => x.id === f)?.ponts?.[0]?.[0] : null;
+      return p && p.includes('~') ? { sur: '~' + p.slice(p.indexOf('~') + 1).replace(/-\d+b*$/, '') + '-', omnivore_vegetal: o.omnivore_vegetal ?? REGLES.omnivore_vegetal, omnivore_vegetal_base: o.omnivore_vegetal_base ?? REGLES.omnivore_vegetal_base } : null; }
+    return null; };
@@ 4. la dynamique, taxon par taxon
-    const E = etat.get(t.id), K = t.phenotypes.length;
+    const E = etat.get(t.id), K = t.phenotypes.length, OR = origineDe(t);
     for (const [bid, pop] of Object.entries(E.pops)) {
       const b = biomes[bid]; if (!b) { delete E.pops[bid]; continue; }
+      const RV = OR && bid.includes(OR.sur) ? OR : REGLES;   // (docs/51) ce que ses plantes lui donnent, ici
@@ les naissances d'un omnivore
-        … * (t.plan.regime === 'carnivore' ? REGLES.omnivore_vegetal ?? 1 : REGLES.omnivore_vegetal_base ?? 1) * …
+        … * (t.plan.regime === 'carnivore' ? RV.omnivore_vegetal ?? 1 : RV.omnivore_vegetal_base ?? 1) * …
```

Sans `origines`, le moteur donne le même monde au caractère près (la genèse 7, cinq cycles ; sv-1, vingt cycles : même empreinte SHA-256).

### Ce qu'elle donne

Le monde vivant, depuis l'état publié du cycle 57, pendant un an. Les saisons pèsent plus que la règle d'un cycle à l'autre : chaque monde est donc comparé au monde sans la règle, au même cycle (entre parenthèses, le rapport). Le cycle 116 est le cœur de l'hiver, le cycle 177 la même saison que le cycle 57.

| groupe | cycle 57 | sans la règle, cycle 116 | règles d'origine, cycle 116 | première version, cycle 116 | sans la règle, cycle 177 | règles d'origine, cycle 177 |
| --- | --- | --- | --- | --- | --- | --- |
| carnivores de la genèse 7 | 1,53 M | −81 % | −30 % (× 3,66) | −23 % (× 4,03) | −81 % | +123 % (× 11,77) |
| omnivores de la genèse 7 | 16,64 M | −66 % | +6 % (× 3,08) | +18 % (× 3,44) | −51 % | +9 % (× 2,22) |
| herbivores de la genèse 7 | 12,81 M | +25 % | −44 % (× 0,45) | −40 % (× 0,48) | +33 % | −33 % (× 0,51) |
| herbivores d'Orvane | 52,63 M | −31 % | −32 % (× 0,98) | −33 % (× 0,97) | +32 % | +30 % (× 0,99) |
| carnivores d'Orvane | 0,23 M | −14 % | −14 % (× 1,00) | −15 % (× 0,99) | −19 % | −28 % (× 0,90) |
| omnivores d'Orvane | 2,89 M | −43 % | −43 % (× 1,01) | −42 % (× 1,02) | −88 % | −87 % (× 1,08) |
| herbivores de la mer d'Orvane | 1,00 M | −6 % | −7 % (× 0,99) | −15 % (× 0,90) | +45 % | +35 % (× 0,93) |
| carnivores de la mer d'Orvane | 0,05 M | +3 % | +1 % (× 0,98) | +1 % (× 0,98) | +3 % | +33 % (× 1,29) |
| carnivores des eaux douces | 0,08 M | −4 % | −5 % (× 0,99) | −4 % (× 1,01) | +17 % | +18 % (× 1,01) |
| herbivores des eaux douces | 9,74 M | +3 % | +3 % (× 1,00) | +4 % (× 1,01) | +76 % | +76 % (× 1,00) |

- **Le recul s'arrête.** Les carnivores de la genèse 7 perdent 30 % de l'été à l'hiver (chez eux, sous le moteur de leur genèse, l'hiver leur en prenait 48 %), puis regagnent ce qu'ils avaient perdu depuis la fusion : 3,41 millions au cycle 177, onze fois plus que sans la règle. Ils restent sous ce qu'ils étaient chez eux au même moment de l'année (de 4,9 à 5,8 millions), et ne gagnent plus que de 0,2 % à 0,8 % par cycle, comme chez eux en été.
- **Le continent se refait.** Ses omnivores reviennent (× 2,2), ses herbivores redescendent vers ce qu'ils étaient chez eux (× 0,51). Aucune lignée ne se perd : les deux seules lignées perdues dans l'année, `beltor` et `phenouel`, sont des herbivores d'Orvane, perdues aussi sans la règle.
- **Ce qu'il en coûte au reste du monde.** Les eaux douces ne voient rien (× 1,00). Les herbivores d'Orvane et de la mer d'Orvane perdent un peu (× 0,99 et × 0,93), les omnivores d'Orvane et les carnivores de la mer d'Orvane gagnent (× 1,08 et × 1,29). **Les carnivores d'Orvane perdent 28 % en un an au lieu de 19 % (× 0,90)** : c'est le prix le plus net. La règle ne change que les naissances des lignées de la genèse 7 sur leur continent : ce qui arrive aux carnivores d'Orvane passe donc par les bêtes du continent qui passent les ponts. Par où exactement (les proies qu'ils partagent, la place des omnivores), nous ne l'avons pas mesuré : c'est à suivre, cycle après cycle.

### Une première version : la règle partout

La première version suivait les lignées de la genèse 7 où qu'elles aillent. Elle arrêtait aussi le recul, mais le continent passait les ponts avec ses règles : sur une parcelle d'Orvane, un omnivore de la genèse 7 tirait des plantes 100 % de ce qu'en tire un herbivore, un omnivore d'Orvane 60 %. Le premier l'emportait.

Au cycle 116, elle sauvait un peu plus de carnivores de la genèse 7 (× 4,03 contre × 3,66), mais les herbivores de la mer d'Orvane y perdaient 10 % au lieu de 1 %, et ceux d'Orvane 3 % au lieu de 2 % (la table plus haut). Sur le banc des ponts, le continent gagnait 37 parcelles d'Orvane en 80 cycles, au lieu de 12 sans la règle et de 16 avec la règle sur le continent seulement (plus bas).

Elle faisait aussi échouer une vérification de `bancs/ponts.js`, sans que la règle y soit pour rien :
- au cycle 116, `jadunou`, un carnivore du continent de 3,6 kg, se sépare dans la forêt d'Orvane (`foret~3`, au bout du pont bois-forêt) ;
- sa fille, `jadunou.foret~3`, n'est pas dans la liste des lignées du continent que le banc dresse le jour de la fusion, et elle ne porte pas d'`origine` (une séparation ne la transmet pas) ;
- le banc la compte donc parmi les lignées d'Orvane, et trouve deux zones hybrides « entre les deux mondes » (avec `orkifir`, du continent) et deux paires apparentées (avec sa mère). Les deux côtés sont du continent.

Rangée avec le continent, cette fille ne fait plus rien échouer. Le défaut est dans le banc et attend la première lignée du continent qui se séparera de l'autre côté d'un pont (plus bas, ce qui reste ouvert).

### Les bancs

Les deux bancs ne lisent pas le profil : pour les juger avec la règle, on la pose dans les mondes qu'ils lisent (`regles.origines` dans `mondes/orvane/generation-0.json` pour `bancs/ponts.js`, dans `mondes/orvane/instantane.json` pour la section 3 de `bancs/stabilite.js`).

**`bancs/ponts.js` passe tel quel.** Avec la règle, les douze vérifications passent, sans rien changer au banc. Le continent gagne un peu plus vite les parcelles d'Orvane : il est mieux portant, il a plus de bêtes à envoyer. Mais de l'autre côté des ponts, ses lignées vivent sous les règles d'Orvane :

| `bancs/ponts.js`, 80 cycles | sans la règle | règles d'origine (sur le continent) | première version (partout) |
| --- | --- | --- | --- |
| lignées du continent qui gagnent Orvane en 10 cycles | 53 | 54 | 55 |
| parcelles d'Orvane gagnées par le continent | 12 | 16 | 37 |
| présences à un pas des ponts, cycles 20 et 80 | 27, 51 | 39, 85 | 52, 144 |
| zones hybrides ; entre les deux mondes | 2 966 ; aucune | 2 991 ; aucune | 3 030 ; aucune |

**`bancs/stabilite.js` ne change pas.** Ses sections 1, 2, 4, 5 et 6 font tourner sv-1, qui n'a pas de fusion. Sa section 3 fait tourner le monde d'Orvane vu par biome (`instantane.json`), qui n'a pas de parcelles : la règle n'y trouve pas de continent, et le monde est le même au caractère près, cinq cycles plus tard. Tout passe. (La première version, qui ne regardait pas la parcelle, passait aussi : 243 → 272 lignées au lieu de 266, le monde entre 0,95 et 1,66 fois son effectif au lieu de 0,89 et 1,51, 0,15 % de sursauts par cycle au lieu de 0,11 %.) Ce banc ne peut donc pas juger la règle : seul le monde par parcelles le peut, plus haut.

## Pour refaire les mesures

L'état publié :

```
git fetch origin publication
git show origin/publication:mondes/orvane/etat.json > etat-57.json
git show origin/publication:mondes/genese-7/etat.json > genese-7.json
```

Un cycle, et ce que chaque part donne aux carnivores de la genèse 7 (`bilan.js`, à la racine du dépôt) :

```js
// node bilan.js <etat.json> ['{"omnivore_vegetal": 1}']
const O = require(require('path').resolve('moteur/orvane.js')), fs = require('fs');
const [etat, regles = '{}'] = process.argv.slice(2), bilan = R => {
  const I = JSON.parse(fs.readFileSync(etat, 'utf8')); I.monde.regles = { ...I.monde.regles, ...JSON.parse(regles), ...R };
  const ids = new Set(I.taxons.filter(t => t.plan.regime === 'carnivore' && (t.origine?.fusion === 'genese-7' || I.monde.id === 'genese')).map(t => t.id)), b = { N: 0, s: 0, nais: 0, morts: 0 };
  O.cycle(I, {}, { trace: x => { if (!ids.has(x.taxon)) return; b.N += x.N; b.s += x.satiete * x.N; b.nais += x.nais; b.morts += x.mortsNat + x.mortsPred + x.mortsMal; } });
  return b; };
const a = bilan({}), v = bilan({ omnivore_vegetal: 0, omnivore_vegetal_base: 0 }), f = x => (x / a.N).toFixed(3);
console.log(`satiété ${f(a.s)} · naissances ${f(a.nais)} (plantes ${f(a.nais - v.nais)}, viande ${f(v.nais)}) · morts ${f(a.morts)} · ${(100 * (a.nais - a.morts) / a.N).toFixed(1)} % par cycle`);
```

```
node bilan.js genese-7.json                              # chez elle : −7,2 % par cycle
node bilan.js genese-7.json '{"omnivore_vegetal": 1}'    # −2,3 %
node bilan.js etat-57.json                               # le monde d'Orvane, cycle 57 : −3,9 % (40 secondes)
```

La part des plantes est l'écart avec un cycle où elles ne donnent rien. Le script compte les naissances après la ponte et les hybrides (docs/25, docs/10) : à un millième près, ce sont celles des tables. Un moteur d'avant se prend dans l'historique, et le script le lit dans le dossier d'où on le lance :

```
mkdir ancien && git archive a0aa297 moteur | tar -x -C ancien
cd ancien && node ../bilan.js ../genese-7.json           # le moteur du 28 octobre : +0,5 % par cycle
```

(Ce moteur-là n'a pas `omnivore_vegetal` : la part des plantes ne s'y lit pas, seules les naissances et les morts.)

## Ce qui reste ouvert

- **Les règles changent, les mondes figés non.** La genèse 7 est la première à vivre sous une règle venue après elle. Ce ne sera pas la dernière : chaque correction du moteur touche aussi les mondes déjà faits. Une fusion pourrait écrire elle-même les règles d'origine de ce qu'elle apporte, en lisant le `monde.regles` de sa source. Pour la genèse 7, il faut les écrire à la main : elle n'en a pas, ses règles étaient celles du moteur d'alors.
- **Le coût d'`estomac-large`.** Il est passé de 5 % à 20 % pour tous les mondes (le catalogue). Les règles d'origine ne le rendent pas aux carnivores de la genèse 7, et ils tiennent sans cela.
- **Le régime affiché.** Les 40 lignées disent encore « carnivore » dans leur plan. Les jeux voient des omnivores (`Tampon.regimeDe`), mais un compte par `plan.regime`, comme le tableau du début, cherche des carnivores qui n'en sont pas. Les compter par leur régime de fait le dirait d'emblée.
- **Le banc des ponts et les filles du continent.** `bancs/ponts.js` range les lignées d'après la liste du jour de la fusion. La première fille du continent née de l'autre côté d'un pont (avec ou sans règle : il suffit d'une séparation) le fera échouer, à tort. La correction, une vérification à changer :

  ```diff
  -{ const hy = …, croises = hy.filter(([a, b]) => b && src.has(a) !== src.has(b));
  -  const M = new Map(X.taxons.map(t => [t.id, t])), A = X.taxons.filter(t => src.has(t.id)), B = X.taxons.filter(t => !src.has(t.id)); let liees = 0;
  +{ // une lignée née après la fusion d'une lignée du continent est du continent : sa fille n'est pas dans src, et ne porte pas d'origine
  +  const M = new Map(X.taxons.map(t => [t.id, t])), venue = id => { for (let k = 0; id && k < 60; k++) { if (src.has(id)) return true; id = M.get(id)?.parent || (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null); } return false; };
  +  const hy = …, croises = hy.filter(([a, b]) => b && venue(a) !== venue(b));
  +  const A = X.taxons.filter(t => venue(t.id)), B = X.taxons.filter(t => !venue(t.id)); let liees = 0;
  ```

  Avec elle, la première version passe aussi tout le banc.
- **Revenir en arrière.** Le cycle de nuit complète les règles du monde par celles du profil, d'un niveau, et l'état les garde : retirer la ligne du profil ne suffit pas. On écrit `"origines": { "genese-7": {} }`, et la genèse 7 retrouve les règles du monde d'Orvane.
