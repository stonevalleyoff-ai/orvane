# 52. La fiche de créature : chaque lignée décrite pour la DA 2D et 3D

Orvane aura une direction artistique à lui : pour chaque lignée, un modèle 2D et un modèle 3D, fidèles à ce qu'elle est. Un essai a été fait le 18 novembre sur le Kaume, avec des modèles ouverts (une IA d'image, puis une IA qui fait de la 3D). Le résultat était bon dans l'ensemble, mais l'IA a ajouté ce que les données ne lui disaient pas d'éviter : des oreilles (le Kaume n'en a pas), des défenses courbes (elles sont droites), des pattes trop hautes (il rampe), une robe gris rosé (elle est mauve). La description, écrite à la main, était trop courte, et ne disait pas ce que la bête **n'a pas**.

La fiche de créature répond à ce manque. Elle est tirée de l'instantané, pour chaque lignée, sans rien écrire à la main : une description profonde, prête pour un dessinateur, un modeleur 3D ou une IA d'image. Chaque phrase dit d'où elle vient : d'une donnée, ou d'une règle de la direction artistique.

`monde/fiche.js`, à côté de la silhouette (`monde/silhouette.js`), et dans le même esprit : un dessin, pas le monde. Rien ne change dans le moteur ni dans le contrat.

## Ce qu'elle rend

```js
const Fiche = require('orvane/monde/fiche.js');      // ou require('orvane').Fiche
// dans un navigateur : <script src="moteur/corps.js"> puis <script src="monde/fiche.js"> : globalThis.OrvaneFiche
const f = Fiche.ecrire(inst.taxons.find(t => t.id === 'kaume'), inst);
f.famille   // "pelage" : la famille visuelle
f.humain    // la fiche en Markdown, en français, en treize sections
f.ia        // { prompt_2d, prompt_3d, negatif, palette, decor, variantes, style }, en anglais
f.champs    // la même chose en JSON, pour un outil ; champs.sections : chaque phrase, section par section
```

- **`ecrire(taxon, instantane, { style })`** : la fiche d'une lignée. L'instantané donne la mère, les filles, les biomes, le catalogue des organes et des traits. `style` remplace la place réservée au style de la DA, `[STYLE ORVANE]`.
- **`famille(taxon, instantane)`** : la famille seule, la règle qui l'a choisie, et ce que la règle a lu (le plan visuel).
- **`table()`** : la table des familles en JSON, avec sa version (`VERSION`, aujourd'hui `1.0`).
- Une plante n'a pas de fiche de créature : `ecrire` la refuse, et renvoie à l'herbier (docs/49).

La fiche est **pure** et **déterministe** : la même lignée dans le même instantané donne toujours la même fiche, au caractère près, sous Node comme dans un navigateur ; rien n'est modifié. Elle ne dépend que de `moteur/corps.js`, qui normalise le corps (et que la fiche remet dans son état après usage).

Toutes les fiches d'un instantané, dans un dossier (un `.md` et un `.json` par lignée, et un `index.json`) :

```
node outils/fiches.js                                  le monde d'Orvane, dans fiches/orvane/
node outils/fiches.js mondes/genese-7/instantane.json --dossier /tmp/fiches [--style "…"] [--lignees kaume,firtis]
```

## Les familles visuelles

Orvane ne dit jamais « mammifère », « insecte » ni « poisson » : ses bêtes sont inventées par l'évolution. Il donne un plan de corps, un mode de reproduction, des organes et des façons de se déplacer. Une IA d'image choisit alors seule la peau (poil, écailles, chitine, plumes), et pas toujours la même. La **famille visuelle** tranche, une fois pour toutes : une même lignée a toujours la même peau, dans tous les jeux.

Les familles restent proches de la Terre, parce qu'un humain comme une IA les lit sans ambiguïté. Leurs identifiants sont à Orvane, et la table est **versionnée** : une règle qui change fait une version nouvelle de la table (`OrvaneFiche.VERSION`), et chaque fiche dit la version qui l'a écrite.

La famille ne lit que le **plan visuel** de la lignée : sa forme (et son allure, docs/11 : un corps de serpent qui ne fait que nager est un poisson), son mode de reproduction (docs/25), la présence d'un organe `carapace`, et la nage. Rien d'autre : ni la masse, ni les couleurs. Les règles, dans l'ordre (la première qui convient choisit) :

| famille | règle | tégument | au cycle 44 |
| --- | --- | --- | --- |
| `machine` | régime synthétique : une machine de la Mère | panneaux et métal, d'après ses modules | 2 |
| `gelee` | corps rayonné ou à tentacules | corps mou, translucide par endroits | 0 |
| `chitine` | corps segmenté (un mille-pattes) | cuticule, en anneaux | 0 |
| `plumage` | forme oiseau | plumes | 4 |
| `ecailles` | un poisson (allure) | écailles fines et brillantes, nageoires ordinaires | 31 |
| `chitine` | hexapode, quelle que soit sa taille | cuticule ; élytres si la carapace dépasse 0,3 | 74 |
| `ecailles` | serpent qui ne fait pas que nager | écailles lisses, plaques ventrales | 10 |
| `pelage` | quadrupède ou bipède vivipare | poil | 89 |
| `cuirasse` | quadrupède ou bipède ovipare à carapace | carapace, peau écailleuse | 30 |
| `peau-nue` | quadrupède ou bipède ovipare sans carapace, qui nage | peau nue, lisse et humide | 1 |
| `ecailles` | quadrupède ou bipède ovipare sans carapace, qui ne nage pas | écailles de lézard | 2 |

Soit 89 lignées à poil, 74 à chitine, 43 à écailles, 30 à cuirasse, 4 à plumes, 2 machines et une à peau nue, sur les 243 du cycle 44.

### Les cas ambigus, tranchés

Chaque décision est écrite dans la table, avec sa raison (`REGLES[].pourquoi`), et vérifiée sur les données du cycle 44 :

- **Quadrupède ovipare à carapace → `cuirasse`.** Pondre et porter une carapace, c'est une tortue ou un pangolin plutôt qu'un crabe : la fiche ne lui donne jamais de pinces qu'il n'a pas (au cycle 44, aucune n'en a). Chez un nageur, la carapace est basse, lisse et profilée, comme une tortue d'eau (`cuirasse-nageur`) ; sinon haute, en plaques jointives, comme une tortue terrestre ou un pangolin (`cuirasse-terre`). Des 27 que l'issue comptait, 14 nagent et 13 non ; des 30 cuirasses du cycle 44 (avec `anrogra` et les deux bipèdes), 16 nagent et 14 non.
- **Quadrupède ovipare sans carapace → `peau-nue` s'il nage, sinon `ecailles`** (un lézard). Au cycle 44 : `talo` et `anloro` (des lézards, ils ne nagent pas), `visiltor` (il nage : peau nue). Le quatrième que l'issue citait, `anrogra`, porte une carapace de 0,3 : l'issue ne comptait une carapace qu'au-delà de 0,3, la fiche compte l'organe (moteur/corps.js le garde dès 0,2). `anrogra` est donc une `cuirasse`, nageuse.
- **Serpent ovipare terrestre → `ecailles`** (un serpent, et non la peau nue d'un ver) : les 10 du cycle 44, dont 2 qui nagent aussi. Un corps de serpent qui ne fait que nager reste aussi `ecailles`, comme un poisson (31 lignées).
- **Bipède vivipare → `pelage`** (`phebel`) ; **bipède ovipare à carapace → `cuirasse`** (`umeouro` sur terre, `rososil` qui nage).
- **Quadrupède vivipare ailé (`renel`) → `pelage`.** L'issue pensait à une chauve-souris ; ses organes disent autre chose : **trois ailes de plumes** (`forme: "plumes"`, `nombre: 3`). La fiche le dit tel quel : un corps à poil, les plumes seulement aux ailes, et « membranous bat wings » au négatif.
- **Quadrupède vivipare à carapace → `pelage`**, une carapace de tatou sur le dos, le poil au ventre, aux pattes et à la tête (`pelage-carapace`). Quatre lignées au cycle 44 (`dunlinro`, `toran`, `silvamu`, `ounou`), que l'issue comptait parmi les 87 quadrupèdes vivipares. Mettre bas est ce qui ressemble le plus à un mammifère, et la famille ne change pas quand une carapace vient ou se perd.
- **Les hexapodes géants gardent la chitine.** Mais à partir de 1 kg, la cuticule devient épaisse, mate, en plaques jointives, les articulations larges, les pattes épaisses (`chitine-geant`, 14 lignées) ; à partir de 10 kg, des pattes comme des piliers (`chitine-colosse` : `silouor`, 17,7 kg, et `katorgra`, 21,8 kg). Le seuil : les plus lourds insectes de la Terre pèsent moins de 100 g. À 1 kg, dix fois plus, une cuticule fine et luisante ferait un jouet ; le prompt le dit (« not toy-like »).
- **Synthétique sans corps → `machine`**, décrite d'après ses `modules`, comme sur les planches : un châssis sur quatre pattes articulées, un œil-lentille, un panneau solaire, une pince, une foreuse… selon ce qui dépasse les seuils des planches.

### Les détails du tégument

Dans une famille, la DA décide encore quelques détails, chacun avec sa raison (`DETAILS`) :

| détail | quand | ce qu'il donne |
| --- | --- | --- |
| `pelage-nageur` | elle nage | poil ras, serré et lustré, comme une loutre |
| `pelage-froid` | niche froide (`temperature` < 0,3), elle ne rampe ni ne fouit | poil long et épais |
| `pelage-froid-ras` | niche froide, elle rampe ou fouit | poil court et dense |
| `pelage-chaud` | niche chaude (`temperature` ≥ 0,7) | poil ras et clairsemé |
| `pelage-tempere` | le reste | poil court |
| `pelage-carapace` | une vivipare à carapace | une carapace de tatou sur le dos |
| `chitine-elytres`, `chitine-bouclier` | une carapace de plus de 0,3, ou moins | deux élytres qui couvrent l'abdomen, ou une plaque dorsale courte |
| `chitine-geant`, `chitine-colosse` | 1 kg et plus, 10 kg et plus | une cuticule épaisse et mate ; des pattes comme des piliers |
| `chitine-nageur` | elle nage | les pattes arrière en rames |
| `cuirasse-nageur`, `cuirasse-terre` | elle nage, ou non | basse, lisse et profilée ; haute, en plaques |
| `ecailles-poisson`, `-serpent`, `-lezard` | selon le corps | écailles de poisson et nageoires ordinaires ; écailles lisses et plaques ventrales ; écailles sèches de lézard |
| `plumage-froid`, `-nageur`, `-lisse` | froid, nageur, le reste | duveteux ; serré et imperméable ; lisse |
| `gelee-meduse`, `-etoile`, `-pieuvre` | rayonné qui nage, rayonné du fond, à tentacules | une cloche ; une étoile ; un manteau et des bras |
| `parade-accent` | un organe de parade ou d'avertissement (crête, collerette, panache, plaques) | la teinte d'accent des planches, la robe tournée de 150° |
| `robe-du-plan` | plus de la moitié des bêtes portent une robe d'allèle | le modèle garde la robe du plan ; la robe d'allèle est une variante |

## Les treize sections

1. **Identité** : le nom, l'identifiant, la mère, le cycle d'apparition (une date de la genèse est dite comme telle, comme le fait l'Observatoire ; une lignée venue d'une fusion dit d'où), le statut, l'effectif total et par biome, du plus peuplé au moins peuplé.
2. **Famille visuelle et tégument** : la famille, la règle qui l'a choisie et pourquoi, les détails du tégument, la version de la table.
3. **Silhouette** : la forme et les pattes, la phrase de `OrvaneCorps.decrire`, la longueur et la masse vraies (`taille_m`, `masse_kg`), la **carrure** (la masse pour la longueur, rapportée à ce qu'est une bête ordinaire de cette allure), les proportions du corps traduites en mots, la posture. Ce qui ne compte pas pour ce corps (le cou d'un insecte) est dit « sans objet ».
4. **Tête** : la taille de la tête, le museau (le bec d'un oiseau), les oreilles et leur forme, les yeux (grands chez une bête de nuit), la bouche d'après le régime.
5. **Organes** : chacun avec son nombre, sa forme, sa place, sa taille, sa fonction et sa conduite (tirées de `catalogue.organes` de l'instantané), comment il se montre, et sa teinte. Une machine : ses modules.
6. **Couleurs** : les quatre couleurs en hexadécimal, avec leur rôle (robe, sombre, ventre, œil) et un nom en mots ; le motif, et où il se pose ; les teintes de la DA (l'accent, l'ivoire) quand un organe les prend.
7. **Posture et mouvement** : chaque façon de se déplacer et ce qu'elle donne au corps, la vitesse de pointe en longueurs par seconde et en m/s, ce que les traits de la plupart des bêtes y changent.
8. **Comportement** : l'heure, la vie en groupe, le tempérament (fuir ou faire front, et avec quoi), ce qu'elle mange, la reproduction, la maturité et la longévité (en cycles), les traits de la plupart des bêtes et leur présage ; la colonie et le caractère, s'il y en a.
9. **Milieu** : la niche (`altitude`, `temperature`, `humidite`, `lumiere`, `couvert`, `tolerance`) traduite en mots, le lieu principal, l'eau ; puis un décor et une lumière pour une image.
10. **Variations** : les traits d'une partie des bêtes, la part qui les montre (`phenotypes`) ou, quand aucune ne les montre, la fréquence de l'allèle (pondérée par l'effectif), avec ce qu'ils changent à l'aspect. Ce sont les variantes qu'un jeu peut montrer.
11. **Parenté** : ce qui a changé depuis la mère (voir plus bas), et les filles.
12. **Interdits** : tout ce que la bête n'a pas (voir plus bas).
13. **Prompts** : 2D, 3D, négatif, décor, palette.

## Donnée ou interprétation

Chaque phrase dit sa source, et le banc le vérifie pour les quinze mille phrases du monde :

- **une donnée** : le champ et sa valeur, entre parenthèses, en code : `(haut: 0.13)`, `(couleurs.robe: [166, 96, 125])`. Une valeur absente de l'instantané est dite absente, avec celle que lui donne `moteur/corps.js` (« `posture` absente : 0, la valeur d'un quadrupède ») ;
- **une règle de DA** : en italique, *(règle `pelage-froid-ras` : …)*, une décision de la table, la même pour toutes les lignées ;
- **une interprétation** : en italique, *(interprété : …)*, ce que la fiche lit dans les données pour les rendre visibles. Ce sont : les mots des proportions (0,13 de pattes : « très courtes »), la carrure, les repères terrestres (« presque une belette aplatie »), la forme des oreilles et de la bouche (celles des planches), la taille des yeux, ce qu'une façon de se déplacer donne au corps, le décor et la lumière, les teintes de la DA.

Les seuils des mots sont des paliers fixes (0,2, 0,35, 0,55, 0,75 pour les pattes, par exemple) : une valeur extrême (0,2 et moins, 0,8 et plus) est en gras. La carrure compare la masse au cube de la longueur à une bête ordinaire de la même allure : de 15 à 45 pour un quadrupède, de 60 à 130 pour un insecte, de 1 à 3 pour un serpent, de 6 à 45 pour un poisson, de 4 à 12 pour un oiseau.

Les durées (`maturite`, `longevite`) sont en **cycles** du monde, comme dans tout le contrat (docs/1, glossaire), et non en années.

Les traits que montrent **plus de la moitié des bêtes** font partie de la bête : le métabolisme lent du Kaume (99 % des bêtes) entre dans son mouvement, la crépuscularité d'une lignée entre dans ses yeux et sa lumière, le nanisme dans sa taille vraie. Une **robe d'allèle** (mélanisme, albinisme, robe dorée, camouflage) reste une variante, même portée par la plupart : le modèle garde la robe du plan, celle des planches et celle que compare la parenté, et la variante se fait en le recolorant (`robe-du-plan`). La fiche le dit en tête des couleurs.

## Les interdits

C'est ce qui manquait à l'essai. Chaque interdit est dans la fiche, avec sa source, et au négatif, en anglais :

- **ce que les données mettent à zéro** : une partie à 0 (`oreilles: 0` : « pas d'oreilles », *ears, ear flaps*) ;
- **ce que ce corps n'a pas** : un insecte n'a ni oreilles, ni museau, ni queue de mammifère, quoi que disent ses proportions ;
- **les organes absents du plan** : chaque organe du catalogue que la lignée ne porte pas (les seize de `catalogue.organes`, et ceux que le monde ajoute) ;
- **les formes que ses organes n'ont pas** : des défenses droites interdisent les défenses recourbées ;
- **ce que ses proportions excluent** : des pattes très courtes interdisent les longues pattes, une tête énorme la petite tête ;
- **sa posture** : à quatre pattes, pas debout ; et son nombre de pattes, pas une de plus ;
- **le tégument d'une autre famille** : une bête à poil n'a ni écailles ni plumes (sauf les plumes de ses ailes, si elle en a) ;
- **son motif** : une robe unie n'a ni rayures ni taches.

Les modèles d'image qui n'ont pas de négatif (FLUX, par exemple) lisent mal une négation. Le prompt 2D dit donc aussi les absences en positif, quand il le peut : *earless*, *tailless*, *no neck, head set directly on the shoulders*, *no legs*.

## La parenté

Une fille se dessine en modifiant l'image de sa mère : c'est l'air de famille. La section Parenté compare chaque lignée à sa mère, chiffres à l'appui :

- la famille : la même, ou une autre, et le changement de plan qui l'explique (une forme, une reproduction, une carapace, la nage) ;
- les organes nouveaux, perdus, et ceux qui ont changé de forme, de nombre ou de taille (de 0,05 et plus) ;
- les proportions qui ont bougé de 0,05 et plus, les plus grands écarts d'abord : « un peu » sous 0,15, « nettement » à partir de 0,3 ;
- la taille et la masse, si elles ont bougé de 10 % (25 % pour la masse) ;
- ce qui est resté : une proportion extrême, un organe, la robe (si elle a bougé de moins de 8 %), le motif ;
- les déplacements gagnés ou perdus, le régime, l'heure, la niche (les axes qui ont bougé de 0,2 et plus) ;
- l'écart de silhouette (`OrvaneCorps.distance`) : jusqu'à 0,35, la fille doit ressembler à sa mère au premier coup d'œil ; au-delà, elle s'en distingue, et l'air de famille tient à ce qui n'a pas changé.

Une lignée sans mère est dite fondatrice ; une mère absente de l'instantané (éteinte depuis plus de dix cycles, ou restée dans son monde) est dite absente, sans comparaison inventée ; une mère éteinte est comparée quand même. Les filles sont listées, chacune avec sa famille.

## S'en servir

**Un dessinateur, un modeleur.** Lire la fiche humaine de haut en bas : la famille dit la peau, la silhouette et la tête la forme, les organes ce qu'il faut ajouter et comment, les couleurs ce qu'il faut peindre (en hexadécimal), les interdits ce qu'il ne faut pas dessiner. Pour une fille, partir du dessin de sa mère et n'appliquer que la section Parenté.

**Une IA, en 2D.** Remplacer `[STYLE ORVANE]` par le style de la DA (`ecrire(t, inst, { style })`), donner `ia.prompt_2d` et `ia.negatif`. Le prompt montre la bête entière, de trois quarts, sur un fond neutre : l'image de référence. Pour une image en situation, remplacer « neutral background » par `ia.decor`.

**Une IA, en 3D.** `ia.prompt_3d` décrit la même bête pour un modèle 3D : une seule bête, en pose neutre (ses pattes visibles et détachées du corps, la gueule fermée), centrée, sur un fond gris uni, sans ombre portée ni sol, à sa taille vraie. Il sert à générer l'image qu'une IA de 3D convertit, ou à guider une IA qui fait la 3D d'après un texte. Mettre ensuite le modèle à l'échelle d'après `taille_m`.

**Les variantes.** `ia.variantes` donne, en anglais, ce que chaque trait change à l'aspect (« albino variant: white coat, pale pinkish eyes », la teinte du sol pour le camouflage) : partir de l'image de la lignée et n'y changer que cela.

**Un outil.** `champs` donne tout en JSON : la famille et sa clé, les proportions (valeur, mots, en anglais), les organes, les couleurs, la parenté, les interdits, et chaque phrase de chaque section.

## Le Kaume

La fiche du Kaume, telle que `monde/fiche.js` l'écrit, est plus de trois fois plus longue que l'exemple écrit à la main dans l'issue 39 (près de 14 000 caractères, contre 3 600), et juste là où l'essai s'était trompé. Son début, et ses prompts :

> **Tête.** Tête **énorme pour le corps** (`tete: 0.9`), museau court (`museau: 0.28`), **aucune oreille visible** (`oreilles: 0`), yeux de taille moyenne *(interprété : une bête de jour, `activite: "diurne"`)*, bouche de brouteur *(interprété : `regime: "herbivore"`, 80 % de feuilles et 20 % de graines)*.
>
> **Organes.** Deux organes (`organes`) :
> - **Deux défenses droites**, à la tête, de taille moyenne (`defenses`, `nombre: 2`, `forme: "droites"`, `place: "tete"`, `taille: 0.42`). Fonction : combat (`catalogue.organes.defenses.fonction: "combat"`), conduite `charge` : « relève ses défenses » (`conduite.presage`). Elles pointent droit vers l'avant depuis le museau ; teinte ivoire `#EFE7D2` *(interprété : comme sur les planches)*. […]

```
[STYLE ORVANE], a small low-slung quadruped creature, 42 cm long and very light (142 g), very slender elongated body, very short
legs splayed close to the ground, crawling belly-low like a skink. Oversized broad head, short snout, visible neck, earless,
grazer's mouth. Two straight tusks pointing forward. Short thin tail ending in a single fluffy tuft in contrasting sage green
#60A666. Short dense fur, dusty mauve #A6607D with dark plum stripes #5B3A47 across back and flanks, pale pinkish-grey belly
#BCA2A6, red eyes #B65757. Full body, side three-quarter view, neutral background.
```

```
ears, ear flaps, horns, antlers, crest, wings, shell, carapace, antennae, neck frill, trunk, proboscis, dorsal plates, spines,
quills, pincers, crab claws, hands, fingers, tail club, stinger, fins, curved tusks, fan-shaped plume, long legs, long tail,
small head, long snout, short compact body, standing tall, upright, bipedal, extra legs, extra limbs, scales, feathers, spots,
text, signature, watermark
```

La fiche entière : `node outils/fiches.js --lignees kaume`, puis `fiches/orvane/kaume.md`.

## Ce que le banc vérifie

`bancs/fiche.js`, en quatre secondes :
- **Une fiche par lignée.** Les 243 lignées du cycle 44 ont leur fiche, sans erreur ni trou (`undefined`, `NaN`), en treize sections, chacune de 6 600 à 15 600 caractères ; ses quinze mille phrases disent toutes leur source.
- **La même entrée, la même fiche.** Deux fois, sur une copie, la liste des lignées à l'envers : les mêmes empreintes ; l'instantané ne bouge pas ; `moteur/corps.js` retrouve son état ; dans un navigateur (`globalThis`, sans `require`), les mêmes 243 fiches que dans Node.
- **La table des familles.** Versionnée, chaque règle et chaque détail justifiés ; la répartition, ligne à ligne avec la table de l'issue (les onze lignes ont le compte de l'issue), et chaque cas ambigu tranché comme ci-dessus ; les hexapodes géants ; sans `reproduction`, la même déduction que `moteur/ponte.js`.
- **La famille suit le plan visuel.** 21 plans visuels, une famille chacun. Sur 182 lignées et leur mère, 161 ont la même famille ; les 21 autres ont changé de plan, et leur fiche dit lequel.
- **Tout est couvert.** Les 18 champs du corps sont cités avec leur valeur dans chaque fiche ; les 269 organes présents sont dans la fiche (avec leur fonction tirée du catalogue) et dans le prompt ; les 96 parties à 0 et les 3 587 organes absents sont interdits, dans la fiche et au négatif ; la parenté de 182 lignées est chiffrée ; les couleurs sont en hexadécimal et en mots (63 noms sur le monde) ; les unités sont réelles ; les effectifs triés.
- **Le Kaume, point par point** avec l'exemple de l'issue : 106 points, les 18 morceaux du prompt 2D et les 13 termes du négatif de l'issue, et juste là où l'essai s'était trompé.
- **Les cas limites** : une lignée sans mère, une mère absente ou éteinte, une lignée éteinte, un organe inconnu du catalogue, un organe propre au monde, un corps rayonné (qui nage, ou du fond), à tentacules, segmenté à 60 pattes, une forme inconnue, une machine à module inconnu, des couleurs manquantes, un corps vide, une reproduction absente, une colonie qui se métamorphose, une plante.
- **Le paquet** emporte `monde/fiche.js` (`files`, `exports`, `require('orvane').Fiche`), et `outils/fiches.js` écrit les 243 fiches.

```
node bancs/fiche.js
```

## Les limites

- **Le style** (`[STYLE ORVANE]`) n'est pas choisi : il le sera sur une planche d'essais. La génération des 243 lignées en 2D et en 3D, le recalage des couleurs et la mise en cache viendront ensuite, comme l'affichage de la fiche dans l'Observatoire.
- **Les planches et la fiche diffèrent sur deux points.** Les planches de l'Observatoire dessinent de courtes antennes à tout insecte et des nageoires à tout poisson. La fiche suit les données : sans organe `antennes`, pas d'antennes ; un poisson garde ses nageoires ordinaires, mais pas de grandes nageoires sans organe `nageoires`.
- **La teinte d'accent** des organes de parade (le panache vert du Kaume) vient des planches, pas des données. Elle est une règle de DA (`parade-accent`), qu'une version prochaine de la table peut changer.
- **La robe d'allèle majoritaire** (le mélanisme chez 91 % des bêtes d'une lignée, par exemple) reste une variante : la référence garde la robe du plan (`robe-du-plan`). Une autre DA pourrait choisir l'inverse.
- **Les noms de couleur** viennent d'une petite table de teintes : ils aident l'œil, l'hexadécimal fait foi.
- **Les repères terrestres** (une belette, un scinque, une gerboise) sont des comparaisons pour l'œil, jamais des modèles ; ils ne vont pas dans les prompts, sauf l'allure (« like a skink »).
- **Ce qui est propre à un monde** (un organe, une forme, un trait inventé) est décrit d'après son catalogue, mais son anglais reste générique (« a single lueur organ »).
- **La larve** d'une lignée qui se métamorphose, **la reine et les soldats** d'une colonie sont d'autres silhouettes : la fiche les signale, sans les décrire.
- **Une tête à 0** est la plus petite tête, pas une tête absente.
