# Orvane — v1

Un moteur d'écosystème et d'évolution, indépendant de tout jeu. Il fait vivre **un seul monde**, le monde d'Orvane, et tous les jeux s'y branchent : chacun le montre à sa façon et y renvoie ce que font ses joueurs, par un **traducteur** (côté jeu), le **tampon** (fourni ici) et le Supabase d'Orvane, sur un contrat en trois objets (`schemas/`). N'importe quel jeu peut s'inscrire et recevoir ses clés sur la **[page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/)** ; les étapes, les adresses et les appels sont dans **[BRANCHER-UN-JEU.md](BRANCHER-UN-JEU.md)**, et le fonctionnement de l'hébergement dans **[hebergement/](hebergement/LISEZ-MOI.md)**. Pour écrire son traducteur : **[docs/](docs/LISEZ-MOI.md)**.

```
moteur/orvane.js      le moteur : instantané + pressions → instantané suivant (Node ou navigateur, zéro dépendance)
moteur/catalogue.js   l'univers des traits : organe, coût, effet, écarts sur le plan corporel, contraintes, conduite (ce qu'il fait faire), ce qu'il fait devant les plantes ; un monde y ajoute les siens (catalogue.monde, docs/20)
moteur/corps.js       la silhouette d'une lignée (forme, proportions, organes, couleurs) et sa dérive à chaque séparation
moteur/genese.js      la genèse : des biomes, des ancêtres très simples, des milliers de cycles → un monde de lignées inventées, nommées (--milieux, --ancetres : une partie des biomes, d'autres ancêtres)
moteur/fusion.js      la fusion : verser un monde dans un autre, biome par biome (docs/14), ou le relier par quelques ponts, comme un continent (docs/23)
moteur/parcelles.js   les parcelles : chaque biome découpé en parcelles voisines, et la vue par biome que lisent les jeux (docs/15)
moteur/synthetique.js la vie synthétique : la Mère, ses machines, leur énergie, leur régulation, leur défense (docs/16)
moteur/flore.js       la flore : les plantes, ce que chaque brouteur atteint et supporte, la coévolution des défenses, la pollinisation (docs/17, 18)
moteur/pathogenes.js  les souches : des maladies qui circulent, sautent aux lignées apparentées, immunisent (docs/18)
moteur/milieu.js      le milieu transformé : le pâturage, les terriers, les barrages, et ce que les jeux font aux lieux (docs/22)
moteur/ponte.js       pondre ou mettre bas : les œufs, le froid, les nids pillés, les mangeurs d'œufs (docs/25)
moteur/stades.js      les cycles de vie : une larve puis un adulte, la métamorphose (docs/26)
moteur/invention.js   les traits inventés par le monde : la duplication, la fusion (docs/27)
moteur/natures.js     les lieux qui changent de nature : une forêt défrichée devient une prairie, un lac asséché une côte (docs/28)
moteur/derives.js     les dérives : des régimes qui changent, des plantes qui se séparent, des souches qui mutent, des insectes qui les portent (docs/29)
moteur/dietes.js      les régimes en spectre : feuilles, fruits, graines, nectar, insectes, viande, sang (docs/30)
moteur/climat.js      le climat et la géologie lente : les âges glaciaires, les ponts de terre, les îles des volcans (docs/31)
moteur/phenologie.js  les saisons des plantes : le feuillage caduc ou persistant, la pousse à la belle saison, le nectar, les fruits et les graines en leur saison, le stade de chaque plante (docs/46)
moteur/succession.js  les plantes sous le feu : les catastrophes et le sec leur prennent des pieds, l'herbe puis les buissons reprennent la place des arbres, le couvert suit les arbres (docs/47)
moteur/meteo.js       la météo : le temps du cycle dans chaque lieu, parcelle par parcelle (la pluie, la neige, le gel, les orages, les canicules) (docs/45)
moteur/grammaire.js   la grammaire des effets et des conduites : une lueur qui attire, une décharge qui foudroie, un musc qui repousse (docs/32)
moteur/castes.js      les castes : des colonies, une reine, des ouvrières, des soldats (docs/33)
moteur/formes.js      les formes nouvelles : le corps segmenté, rayonné, à tentacules (docs/33)
moteur/esprit.js      l'esprit : des savoirs qui s'apprennent, se transmettent, se perdent ; des outils ; la curiosité (docs/34)
moteur/chronique.js   l'histoire du monde : la chronique (ce qui compte, par année), le muséum (un spécimen par lignée, gardé après sa mort), les noms que donnent les joueurs (docs/37)
moteur/collectif.js   la vie en groupe : troupeaux, meutes, bancs, colonies, hiérarchie, migrations des saisons, lue dans l'état à la publication (docs/38)
moteur/solo.js        un monde solo, dans le jeu : parti de l'instantané publié, il avance en temps réel ou en accéléré (docs/19)
moteur/genres.js      les profils de genre : horreur, cozy, collection, voxel, survie, stratégie, monde partagé (docs/41)
moteur/biomes-universels.json  les 24 biomes neutres du monde d'Orvane : terre, eau douce, mer, sous-sol
tampon/tampon.js      exposer() Orvane → jeu ; agreger() jeu → Orvane (dénormalisation, plafonds, lissage)
tampon/directeur.js   le directeur de mise en scène : ce qu'un jeu devrait montrer au dernier cycle, selon son genre (docs/40)
tampon/individus.js   les individus : une bête tirée de la population réelle (son génotype, ses valeurs, ses savoirs), deux bêtes croisées, la parenté, le génome relâché (docs/35, 36)
tampon/morceaux.js    le monde par morceaux : découper l'instantané (l'index, chaque biome, chaque lignée), et lire seulement les biomes d'un jeu (docs/21)
monde/index.html      l’observatoire : ce que vit un monde (espèces, biomes, lignées, chaîne alimentaire, journal), et une simulation locale
monde/silhouette.js   les silhouettes de l'observatoire : chaque lignée dessinée d'après son corps et sa façon de vivre (masse, déplacements, régime, heure), chaque forme à son dessin, les machines d'après leurs modules ; un jeu peut le reprendre
BRANCHER-UN-JEU.md    brancher un jeu, pas à pas : s'inscrire, lire le monde, traduire, régler l'exposition, déposer des lots, les erreurs
CONNECT-A-GAME.md     le même guide, en anglais ; docs/glossary.md : chaque champ, traduit en anglais
inscription/          la page d'inscription : inscrire un jeu et recevoir ses clés, régler son exposition, vérifier une clé
index.html            la page d'accueil du site publié : ce qu'est Orvane, l'état du monde, l'observatoire, l'inscription, le guide ; mondes/liste.json : les mondes que l'observatoire propose
README.md, llms.txt   la présentation du dépôt (GitHub l'affiche en page d'accueil) et son résumé pour les IA (liens vers le guide et les schémas)
types/orvane.d.ts     les types TypeScript du contrat, tirés des schémas par outils/types.js (docs/39)
outils/verifier.js    vérifier un lot, un instantané ou un profil avant de le déposer : le schéma, et ce que le Supabase refusera (docs/39)
outils/bancs.js       tous les bancs d'un coup, en parallèle : les rapides à chaque PR, les longs la nuit (hebergement/LISEZ-MOI.md, « La fiabilité »)
outils/contrat.js     le garde-fou du contrat : ce qui casse un jeu, ce qui s'ajoute ; un changement cassant demande une version majeure (docs/43)
outils/vitesse.js     la vitesse du moteur sur un monde réel ; contre une autre version : plus vite ? le même monde, au caractère près ? (docs/44)
kits/unity/           le kit Unity : lire le monde en classes C#, compter, déposer les lots ; essayé avec .NET (kits/LISEZ-MOI.md)
kits/godot/           le kit Godot 4 : le singleton Orvane, lire, compter, déposer (kits/LISEZ-MOI.md)
package.json, index.js  le paquet : npm install github:stonevalleyoff-ai/orvane#v1.0.0, puis require('orvane') (docs/43)
CHANGELOG.md          le journal des versions : ce qui change pour un jeu, version après version
outils/banc-traducteur.js  le banc générique d'un traducteur : il lui fait lire sept mondes, un monde piège compris, et vérifie qu'il n'oublie aucune lignée et n'envoie que des lots conformes (docs/39)
schemas/              le contrat : instantane, pression, profil — avec exemples (crapaud buffle)
traducteurs/stone-valley/   le premier client, de bout en bout : correspondances, traducteur, génération 0, banc, SQL
traducteurs/exemple/  le plus petit traducteur qui se branche correctement : le modèle d'un jeu nouveau (docs/39)
bancs/stabilite.js    les bancs de stabilité : mille cycles sans joueurs et avec, le jour un, la réponse à la sélection, le déterminisme
bancs/fusion.js       le banc de la fusion : la mer d'Orvane versée dans le monde d'Orvane, contre un témoin sans fusion
bancs/parcelles.js    le banc des parcelles : le monde d'Orvane découpé, contre le même par biomes ; l'invasion de proche en proche, le défrichage
bancs/synthetique.js  le banc de la vie synthétique : la Mère éveillée, contre le même monde sans elle ; une espèce qui explose, des joueurs qui harcèlent
bancs/flore.js        le banc de la flore : la flore éveillée, contre le même monde sans elle ; la coévolution, une prairie surbroutée
bancs/pathogenes.js   le banc des souches et des symbioses : la contagion de proche en proche, les hôtes, l'immunité, le compromis, les butineurs
bancs/catalogues.js   le banc des catalogues ouverts : Lumen (bancs/lumen/), un monde imaginaire à ses axes, ses traits, ses organes, ses formes de corps
bancs/morceaux.js     le banc du monde par morceaux : le découpage, les biomes réunis, le navigateur, le cycle de nuit
bancs/ponts.js        le banc de la fusion par ponts : la genèse 7 devient un continent du monde d'Orvane, ses faunes passent les ponts de proche en proche
bancs/corps.js        le banc des corps assemblés : des mains chez les grimpeurs des forêts, une posture qui se redresse, des simiens
bancs/ponte.js        le banc de la ponte : le froid favorise les vivipares, les mangeurs d'œufs, la séparation, les œufs pris par les joueurs
bancs/stades.js       le banc des cycles de vie : la chenille et le papillon, la métamorphose qui gagne là où elle sert
bancs/invention.js    le banc des traits inventés : un trait neuf, sa naissance, la sélection, des noms qui ne se répètent pas
bancs/natures.js      le banc des natures : la forêt devenue prairie, le lac devenu côte, une nature inédite, le retour
bancs/derives.js      le banc des dérives : un pas de régime, une herbe épineuse qui se sépare, une souche que porte un insecte
bancs/dietes.js       le banc des régimes en spectre : le mangeur de fruits qui sème, le mangeur d'insectes, le buveur de sang
bancs/climat.js       le banc du climat : un âge glaciaire, un pont de terre, une île qui se peuple
bancs/phenologie.js   le banc des saisons des plantes : une forêt nue, en fleurs, en fruits ; les butineurs et les mangeurs de fruits au fil de l'année
bancs/succession.js   le banc de la succession : une forêt brûlée, l'herbe, les buissons, puis les arbres ; le couvert qui tombe et revient
bancs/meteo.js        le banc de la météo : des fronts qui passent, une sécheresse qui s'installe, la vie qui suit le temps
bancs/grammaire.js    le banc de la grammaire : qui peut dire quoi, où ça porte, des phrases variées, la sélection
bancs/formes.js       le banc des corps et des vies nouvelles : la colonie qui gagne, le mille-pattes, l'étoile, la pieuvre, la naïade
bancs/esprit.js       le banc de l'esprit : qui apprend, une tradition, la perte, chasser ensemble, la curiosité
bancs/individus.js    le banc des individus et de l'élevage : Mendel, les porteurs cachés, l'héritabilité, la parenté, les hybrides, l'élevage qui revient au monde
bancs/milieu.js       le banc du milieu transformé : la savane sans brouteurs, les terriers, les barrages, la forêt défrichée, les parcelles
bancs/tampon.js       le banc du tampon : chaque attaque de l'audit du 5 novembre (lot mal formé, n infini, déplacements sans plafond, mille comptes d'un jeu, allèle inventé) neutralisée, et le jour un
bancs/traducteur.js   le banc du banc générique : le traducteur d'exemple passe, six traducteurs fautifs sont attrapés
bancs/directeur.js    le banc du directeur : chaque genre met en avant ce qu'il doit, la dose, les moments déjà vus, le monde piège
bancs/monde.js        le monde d'Orvane vu par biome, pour les bancs qui parlent des lieux par leur nom (etat.json tourne par parcelles)
bancs/chronique.js    le banc de la chronique : rien ne change, ce qu'elle garde et laisse, le muséum et la cause d'une extinction, les noms, le cycle de nuit
bancs/collectif.js    le banc de la vie en groupe : qui vit comment, la taille des groupes, la hiérarchie, les troupeaux mêlés, les migrations et les visiteurs
bancs/genres.js       le banc des profils de genre : chaque promesse mesurée sur la genèse 7, contre le réglage neutre
bancs/temps.js        le banc du temps : le rythme de chaque monde (l'action horaire, le rattrapage), le monde solo (temps réel, accéléré, sauvegarde, navigateur)
hebergement/cycle.js  le cycle, chaque monde à son rythme (docs/19) : lots de tous les jeux → tampon → moteur → instantané publié (action GitHub .github/workflows/cycle.yml)
hebergement/publication.js  la branche publication : l'état de chaque monde repris au début de chaque passe, le site republié en un seul commit sans historique ; une sauvegarde restaurée (hebergement/LISEZ-MOI.md)
hebergement/rythme.js le rythme d'un monde hébergé : quand ses cycles sont dus (le cycle et la veille le lisent)
hebergement/veille.js la veille : un monde qui ne tourne plus, un site qui montre un vieux cycle (action .github/workflows/veille.yml, qui ouvre une issue)
hebergement/declencheur.sql  le cycle à l'heure : le Supabase d'Orvane lance l'action GitHub chaque heure (pg_cron, pg_net), un jeton limité dans son coffre (docs/19)
hebergement/supabase.sql  le Supabase d'Orvane : les jeux s'y inscrivent, y déposent les pressions de leurs joueurs et y proposent des noms
mondes/orvane/        le monde d'Orvane, où tous les jeux se branchent : né de la genèse universelle, Stone Valley y joue depuis le 29 octobre 2026
mondes/marin/         la mer d'Orvane : une genèse sur les seuls biomes d'eau (vingt ancêtres, 29 lignées), versée dans le monde d'Orvane par une fusion (profil.monde.fusions)
mondes/eaux-douces/   les eaux douces : une genèse sur dix lieux d'eau (dont le torrent, l'étang, le delta, les sources chaudes), 60 lignées, reliée au monde d'Orvane par trois ponts (docs/42)
mondes/sv-1/          le premier monde de Stone Valley (sa faune), archivé
mondes/genese-7/      un monde né de la genèse (graine 7, 3 000 cycles) : 97 lignées que personne n'a dessinées, archivé
mondes/genese-2026/   la genèse de l'équilibrage (graine 2026, les 24 biomes universels, 3 000 cycles, 5 novembre 2026), puis 175 cycles avec tous les mécanismes éveillés : 136 lignées (36 poissons, une méduse, une pieuvre, des mille-pattes), 81 plantes, 12 plans de machines ; figée ; genese.json garde les mesures de la genèse, que l'observatoire trace (docs/13)
docs/                 le mode d'emploi : brancher son jeu, écrire son traducteur, jouer les conduites, tirer les traits continus, l'hérédité, les hybrides, les organes, la méfiance, la stabilité, la fusion, les parcelles, la vie synthétique, la flore, les souches et les symbioses, le temps, les catalogues ouverts, le monde par morceaux, le milieu transformé, la fusion par ponts, les corps assemblés, la ponte, les cycles de vie, les traits inventés, les lieux qui changent de nature, les dérives, les régimes en spectre, le climat, la grammaire, les corps et les vies nouvelles, l'esprit, les individus, l'élevage, la chronique et les noms, la vie en groupe, le kit du traducteur (39 chapitres)
```

## Essayer

Dans le navigateur : https://stonevalleyoff-ai.github.io/orvane/ (ou `python3 -m http.server` à la racine, puis http://localhost:8000/). L’observatoire ouvre le monde d'Orvane ; le menu en haut change de monde (ceux de `mondes/liste.json`, l’exemple fictif, ou un fichier). La vue d’ensemble dit ce qui s’est passé au dernier cycle ; Espèces est un registre qu’on fouille (recherche, filtres) et dont chaque fiche montre populations, phénotypes (réels et **montrés au jeu**, d’après le profil du monde), hérédité, traits continus et traits portés ; Simuler fait tourner le moteur ici, sans toucher au monde publié, et peut rejouer un lot de pressions pour N joueurs. L’adresse garde le monde, la vue et l’espèce : `monde/?monde=genese-7&vue=especes&espece=…` se partage. La vue d’ensemble montre aussi les mécanismes éveillés du monde (climat, Mère, souches, natures, savoirs, inventions, ponte, régimes, vie en groupe, fusions) et, pour un monde né d’une genèse qui la publie (`fichiers: ["genese"]` dans `mondes/liste.json`), les courbes de sa naissance ; chaque fiche a une section « Sa vie » (pondre ou mettre bas, deux vies, colonie, régime, savoirs, maladies).

En ligne de commande :

```
node moteur/orvane.js schemas/exemples/instantane.json --cycles 30
node moteur/orvane.js schemas/exemples/instantane.json --cycles 40 \
     --lot schemas/exemples/pression.json --profil schemas/exemples/profil.json --comptes 10
```

Le premier fait vivre le monde seul ; le second rejoue chaque jour le même lot de pressions pour dix comptes (chacun tue 14 crapauds de base et 1 cracheur, capture un géant, nourrit, déplace, abîme l'habitat). `--sortie fichier.json` écrit l'instantané final.

## Ce que v0 fait

- Par taxon × biome : croissance logistique sur la capacité du biome, que les espèces se partagent d'autant plus qu'elles ont la même taille (une bête de 5 kg et une de 60 kg ne broutent pas la même chose) ; le taux de croissance suit la masse (loi de Fenchel) ; mortalité tirée de la longévité ; pénalité hors de la **niche**.
- La **chaîne alimentaire** : un prédateur mange ce qui est à sa portée (masse, vitesse, vol, groupe, heure), se reporte sur la proie abondante (la proie rare est relâchée), partage les proies avec ses concurrents ; sa **satiété** décide de sa faim et de ses départs, et ses petits sont faits de la viande mangée (conversion 25 % : l'énergie vient des plantes, un prédateur ne vit pas de prédateurs). Chez la proie, la **vulnérabilité** de chaque phénotype (carapace, camouflage, pattes longues…) décide qui est mangé : c'est la sélection naturelle, sans joueur.
- Les **catastrophes** : un incendie (couvert dense et sec, l'été), une crue (sols humides et bas, au printemps), une sécheresse ; la capacité du biome tombe et se refait lentement, et une part des bêtes qui ne peuvent fuir (ni vol, ni terrier, ni nage) meurt sur le coup.
- Les **phénotypes** : chaque combinaison de traits a son plan corporel (écarts) et son coût de reproduction. Un trait ne vaut que son coût et ses écarts ; ce sont les pressions extérieures qui lui donnent une valeur. Le moteur n'a aucune idée reçue sur « ce qui est fort ».
- Les **saisons**, si le profil donne une année : les biomes sont froids, sombres et pauvres en hiver, chauds, lumineux et riches en été ; la convenance et la place en suivent le rythme. Les **maladies** : une population entassée peut voir éclore une épidémie, qui frappe selon la résistance de chaque phénotype, gagne parfois les voisins, et s'éteint d'elle-même.
- Mutation entre phénotypes, apparition de nouveaux traits admissibles, migration vers les voisins en cas de saturation ou de faim, déplacements imposés, séparation de lignées (rare : hors de sa niche, installée depuis longtemps), habitat qui s'use et se regagne, extinction (un taxon éteint reste listé 10 cycles). La demande de chasse qu'un phénotype épuisé ne peut servir se reporte sur les autres.
- La **silhouette** (`plan.corps`, `moteur/corps.js`) : forme (quadrupède, hexapode, bipède, oiseau, serpent), pattes, proportions, une liste d'organes à leur place et à leur taille (cornes, défenses, crête, collerette, plaques, épines, massue, aiguillon, pinces…), motif et couleurs. Elle dérive à chaque séparation, vers ce que le biome favorise (le froid raccourcit oreilles et queue, le couvert allonge la queue, la robe glisse vers la teinte du sol), garde la marque d'un mode de déplacement gagné (le vol donne des ailes, le fouissage un museau), gagne rarement un organe neuf (des armes chez un chasseur, des défenses chez une proie) ou en perd un, et très rarement change de plan. Le catalogue des organes part avec l'instantané, avec les conduites qu'ils prêtent au jeu (docs/11-organes.md). Elle ne pèse pas sur la survie : c'est ce qui permet à un jeu de dessiner une lignée qu'il n'a jamais vue.
- Les **conduites** : chaque trait qui fait agir porte, au catalogue, une conduite dans un vocabulaire abstrait (riposte-distance, immobilite, alerte-groupe, defense-petits…) avec son présage — ce qu'un joueur attentif voit avant. Chaque jeu les joue à sa façon (docs/7-conduites.md).
- La **génétique continue** : par population, une moyenne et une variance de la taille, de la vitesse, de l'audace et de la sociabilité. La prédation, la maladie, les joueurs (le z moyen des bêtes qu'ils prennent), la fécondité et l'optimum du biome (plus grand au froid, plus vif à découvert) les déplacent selon l'équation de Lande ; la mutation et la dérive les entretiennent ; les migrants les mêlent ; une lignée qui se sépare garde ce qu'elle a acquis. Le jour un, rien ne change ; chaque jeu tire une valeur par bête (docs/8-genetique-continue.md).
- La **reproduction sexuée** : par population, la fréquence de l'allèle de chaque trait ; chaque petit en reçoit un de sa mère et un de son père. Un trait dominant se voit dès une copie, un récessif (albinisme, robe dorée, nanisme) se cache chez des porteurs et revient. Les pères sont choisis selon leur attrait (une robe voyante, une grande taille), et l'ordre du catalogue dit qui masque qui. Côté jeu, un petit ressemble à sa mère sans que les taux d'ensemble bougent (docs/9-reproduction.md).
- **L'isolement et les hybrides** : chaque population mesure le flux de gènes qu'elle reçoit et son écart génétique au reste de l'espèce ; une population isolée qui a divergé devient une lignée ; deux lignées apparentées qui partagent un biome se croisent d'autant moins qu'elles sont isolées (le temps, la masse, la silhouette, la niche), et leurs hybrides, moins viables, mêlent les gènes des deux (docs/10-isolement.md).
- La **méfiance et l'habituation** : chaque population apprend des joueurs. Les contacts qui finissent mal (prélèvements, captures) la rendent méfiante, les rencontres sans suite et l'aide l'habituent ; l'une et l'autre retombent avec le temps, et une population audacieuse s'habitue plus vite. Le moteur tient cette mémoire, le jeu la rend en distance de fuite (docs/12-mefiance.md).
- **Déterministe** : même instantané, même graine, mêmes pressions ⇒ même résultat, au bit près.

## Ce que le tampon fait des pressions

1. ramène l'activité d'un compte trop actif à une activité normale (`exposition_ref`) ;
2. **dénormalise** : les prélèvements par phénotype sont redistribués selon les fréquences réelles, à taux par tête constant (montré à 2 %, réel à 20 % ⇒ pertes ×10) ;
3. plafonne par compte, par part d'un compte, par part de population ;
4. lisse sur `memoire_cycles` (moyenne mobile exponentielle).

Dans l'autre sens, `exposer()` traduit les fréquences réelles en fréquences montrées par le jeu : par **compression** de la cote, ou en mode **relatif** (le jeu garde ses propres taux et ne suit que l'écart du monde depuis sa génération 0 — le jour un, rien ne change).

Résultat observé sur l'exemple, 10 comptes, 40 cycles : si les joueurs tuent 1 cracheur pour 14 crapauds de base alors que le jeu n'en montre que 2 %, les cracheurs sont sur-chassés et disparaissent, les cuirassés (jamais tués) prennent la place. S'ils n'en tuent aucun, les cracheurs passent de 20 % à plus de 30 % pendant que la population s’effondre sous 140 prélèvements par nuit. La chasse ne donne aucun bonus automatique : le résultat dépend des variants présents et de ce que les joueurs leur font.

Un monde publié part d'un **rodage** (`profil.monde.rodage`, 400 cycles pour Stone Valley) : il tourne seul jusqu'à son équilibre, et c'est cet équilibre qui devient la génération 0.

## La genèse

```
node moteur/genese.js moteur/biomes-universels.json --cycles 900 --graine 1 --lignees 200 --etage 30 --nom "Le monde d'Orvane" \
     --regles '{"omnivore_vegetal_base":0.6,"detritivore_vegetal":0.5,"viande_omnivore":0.3,"longevite_predateur":1.6,"omnivore_vegetal":0.2,"vers_carnivore":0.5}' --sortie amorce.json
node moteur/genese.js mondes/sv-1 --cycles 3000 --graine 7 --nom "Monde né d'Orvane" --sortie amorce.json
node moteur/genese.js moteur/biomes-universels.json --milieux marin,aquatique,amphibie --ancetres mondes/marin/ancetres.json --cycles 1200 --graine 23 …   # la mer d'Orvane (docs/14)
node moteur/genese.js mondes/eaux-douces/biomes.json --ancetres mondes/eaux-douces/ancetres.json --cycles 1200 --graine 31 --lignees 90 …     # les eaux douces (docs/42)
node moteur/fusion.js mondes/orvane/etat.json mondes/marin/amorce.json --part 0.5 --sortie essai.json                                   # une fusion à la main
```

Des biomes (ceux d'un monde existant, ou un fichier), des ancêtres très simples (sur terre un brouteur, un grand brouteur, un fouisseur, un rôdeur, un insecte, un oiseau, un serpent ; en eau douce un filtreur, un brouteur des berges, un chasseur ; en mer un filtreur, un brouteur des récifs, un chasseur du large, un crabe), chacun avec sa silhouette, et une évolution accélérée : les lignées se séparent et dérivent (masse, régime, locomotion, heure, eau douce ou salée, traits, silhouette — deux fois et demie plus vite que dans un monde qui tourne), la place se gagne par extinction, au plus cent lignées vivantes par défaut (`--lignees`). Une longue genèse se reprend là où elle s'est arrêtée (`--point 200`, puis `--reprise <sortie>.reprise.json`). Elle peut ne prendre qu'une partie des biomes (`--milieux`) et d'autres ancêtres (`--ancetres`) : un monde marin, qu'on verse ensuite dans un autre par une **fusion** (`moteur/fusion.js`, commandée par `profil.monde.fusions`, docs/14). À la fin, chaque lignée reçoit un nom inventé (« Angraume chasseur de prairie, 76 kg, nocturne »). Le résultat est une amorce de monde : `mondes/genese-7/` en est un, à ouvrir dans l'observatoire (`monde/?monde=genese-7`, onglets Lignées et Chaîne). C'est le mode « Orvane crée la vie » : un jeu qui sait assembler un corps par morceaux peut le dessiner — Stone Valley le fait (`lignees.js`, voir `traducteurs/stone-valley/`). L'observatoire montre la silhouette de chaque lignée à côté de celle de son parent (onglet Taxons).

## Pas encore

Le retour d'un taxon éteint depuis un biome voisin après extinction totale ; un deuxième jeu branché sur le monde d'Orvane ; une version anglaise du mode d'emploi.
