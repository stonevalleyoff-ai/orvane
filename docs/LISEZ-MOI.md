# Brancher son jeu sur Orvane — le mode d'emploi

Orvane fait vivre un monde : des espèces, des biomes, des populations qui naissent, meurent, migrent, mutent et se séparent. Il ne sait rien de votre jeu. Pour l'y brancher, vous écrivez un **traducteur** : un petit fichier, côté client, qui lit ce qu'Orvane publie et le rend jouable, puis qui renvoie ce que vos joueurs font. Ce guide explique comment, chapitre par chapitre, avec le traducteur de Stone Valley comme exemple de bout en bout.

Pour s'inscrire, recevoir ses clés et faire ses premiers appels au Supabase d'Orvane : [BRANCHER-UN-JEU.md](../BRANCHER-UN-JEU.md) et la [page d'inscription](https://stonevalleyoff-ai.github.io/orvane/inscription/).

| chapitre | ce que vous saurez faire |
| --- | --- |
| [1. Lire un instantané](1-lire-un-instantane.md) | comprendre le fichier qu'Orvane publie chaque nuit |
| [2. Les correspondances](2-correspondances.md) | relier vos biomes, vos espèces, vos variantes à ceux d'Orvane |
| [3. Traduire un phénotype](3-traduire-un-phenotype.md) | faire d'un corps biologique des statistiques de jeu : physique, mouvement, comportement, attaque, objets, apprivoisement |
| [4. Renvoyer des pressions](4-renvoyer-des-pressions.md) | compter ce que font les joueurs, sans tricher ni compter deux fois |
| [5. Le profil et les essais](5-profil-et-essais.md) | régler le tampon pour votre jeu et tout vérifier hors ligne |
| [6. L'exemple Stone Valley](6-exemple-stone-valley.md) | le traducteur complet, commenté |
| [7. Les conduites](7-conduites.md) | ce que l'évolution fait faire aux bêtes : le vocabulaire abstrait, un phénotype par bête, trois règles pour les jouer, et ce qui vient ensuite |
| [8. La génétique continue](8-genetique-continue.md) | taille, vitesse, audace, sociabilité : une moyenne et une variance par population, une valeur par bête, ce que la sélection en fait |
| [9. La reproduction sexuée](9-reproduction.md) | des allèles par population, dominants ou récessifs, des pères choisis, et des petits qui ressemblent à leur mère |
| [10. L'isolement et les hybrides](10-isolement.md) | le flux de gènes, l'écart génétique, la spéciation par isolement, les zones hybrides entre lignées apparentées |
| [11. Les organes](11-organes.md) | une liste ouverte d'organes à leur place et à leur taille, une innovation rare, leurs dessins et les conduites qu'ils prêtent au jeu |
| [12. La méfiance et l'habituation](12-mefiance.md) | ce qu'une population apprend des joueurs, comment elle l'oublie, et comment le jeu le rend en distance de fuite |
| [13. La stabilité](13-stabilite.md) | ce que le moteur tient sur mille cycles, avec et sans joueurs ; ce que les bancs ont corrigé ; comment les relancer |
| [14. La fusion de mondes](14-fusion.md) | verser un monde dans un autre : une genèse sur une partie des biomes, la fusion biome par biome, sa commande dans le profil, ce que le monde en fait |
| [15. Les parcelles](15-parcelles.md) | un monde qui a une géographie : chaque biome en parcelles voisines, la dispersion et la fuite, un contrat inchangé pour les jeux, ce que le monde en fait |
| [16. La vie synthétique](16-vie-synthetique.md) | des machines et leur Mère : l'énergie, l'assemblage, la régulation des espèces qui débordent, ce que la Mère conçoit, la défense face aux joueurs, ce que le monde en fait |
| [17. La flore](17-flore.md) | les plantes deviennent des lignées : ce que chaque brouteur atteint et supporte, sa nourriture à lui, la coévolution des défenses et des résistances, ce que le monde en fait |
| [18. Les souches et les symbioses](18-souches-et-symbioses.md) | des maladies qui ont une identité : la contagion, les sauts entre lignées apparentées, l'immunité, le compromis entre virulence et contagion ; les butineurs et les fleurs ; ce que le monde en fait |
| [19. Le temps](19-le-temps.md) | un monde à son rythme : la durée d'un cycle, de dix minutes à une semaine ; l'action horaire et le rattrapage ; un monde solo, dans le jeu, en temps réel ou en accéléré |
| [20. Les catalogues ouverts](20-catalogues-ouverts.md) | un monde qui n'est pas la Terre : ses axes de biome, ses traits, ses organes et ses formes de corps, qui s'ajoutent à ceux du moteur ; Lumen, le monde imaginaire du banc |
| [21. Le monde par morceaux, et en anglais](21-morceaux-et-anglais.md) | lire seulement les biomes qu'on joue (l'index, un fichier par biome, un par lignée, `tampon/morceaux.js`) ; le guide en anglais et le glossaire des champs |
| [22. Le milieu transformé](22-milieu-transforme.md) | le pâturage, les terriers, les barrages des bâtisseurs ; défricher, reboiser, assécher, irriguer, construire ; les axes de chaque lieu bougent, la flore et la niche suivent |
| [23. La fusion par ponts](23-fusion-par-ponts.md) | un monde devient un continent d'un autre : ses parcelles, quelques ponts, et chaque faune gagne l'autre de proche en proche |
| [24. Les corps assemblés](24-corps-assembles.md) | la vie dans les arbres donne des mains, un porteur de mains se redresse, et debout devient bipède : des simiens ; la posture |
| [25. Pondre ou mettre bas](25-pondre-ou-mettre-bas.md) | des œufs nombreux qui craignent le froid et les pillards, des petits moins nombreux à l'abri ; les mangeurs d'œufs ; le froid favorise les vivipares |
| [26. Les cycles de vie](26-cycles-de-vie.md) | une larve puis un adulte : la chenille et le papillon, le têtard et la grenouille ; la métamorphose gagne là où les jeunes disputaient la nourriture des adultes |
| [27. Les traits inventés](27-traits-inventes.md) | le monde invente ses propres traits : un organe qui en accentue un autre, deux traits qui fusionnent ; un nom, une définition, une naissance |
| [28. Les lieux qui changent de nature](28-lieux-qui-changent.md) | une forêt défrichée devient une prairie, un lac asséché une côte, et ses poissons en pâtissent ; un lieu qui ne ressemble à rien en invente la nature |
| [29. Les dérives](29-derives.md) | des régimes qui changent à la séparation, des plantes qui se séparent, des souches qui mutent, des insectes qui les portent |
| [30. Les régimes en spectre](30-regimes-en-spectre.md) | feuilles, fruits, graines, nectar, insectes, viande, sang : un mangeur de fruits laisse les feuilles et sème les arbres, un buveur de sang pique sans tuer |
| [31. Le climat et la géologie lente](31-climat-et-geologie.md) | le monde se refroidit et se réchauffe de lui-même, la mer baisse et des ponts de terre émergent, des volcans font des îles |
| [32. La grammaire des effets et des conduites](32-grammaire.md) | le monde compose des traits comme des phrases : une lueur qui attire dans le noir, une décharge dans l'eau, un cri, un musc ; avec un repli pour les jeux qui ne savent pas |
| [33. Les corps et les vies nouvelles](33-corps-et-vies-nouvelles.md) | des colonies (une reine, des ouvrières, des soldats), des mille-pattes, des étoiles, des pieuvres, la naïade et le polype |
| [34. L'esprit](34-esprit.md) | des savoirs qui naissent, se répandent, voyagent et se perdent ; des traditions locales ; des outils ; la curiosité, que la sélection fait gagner là où savoir paie |
| [35. Les individus](35-individus.md) | `tampon/individus.js` : une bête tirée de la population réelle, avec son génotype (ce qu'elle porte sans le montrer), ses valeurs, ses savoirs, un sexe et un nom ; deux bêtes croisées (Mendel, l'héritabilité, la consanguinité, les hybrides) ; le pedigree |
| [36. L'élevage](36-elevage.md) | les bêtes nées en élevage, relâchées avec leur génome, rejoignent la population avec leurs gènes ; les plafonds ; Stone Valley croise ses compagnes au campement |
| [37. La chronique, le muséum, les noms](37-chronique-museum-noms.md) | l'histoire du monde : un journal de ce qui compte, par année ; un spécimen par lignée, gardé après sa mort, avec sa cause ; le nom commun que donne le premier joueur qui décrit une lignée (`orvane_nommer`) |
| [38. La vie en groupe](38-comportements-collectifs.md) | troupeaux, meutes, bancs, colonies : la taille des groupes, la hiérarchie, qui les mène ; les migrations des saisons et les visiteurs de l'hiver ; l'hivernage, quand les bêtes partent vraiment (regles.hivernage) |
| [39. Le kit du traducteur](39-kit-traducteur.md) | les types TypeScript du contrat (`types/orvane.d.ts`, tirés des schémas) ; vérifier un lot, un instantané, un profil avant le premier dépôt (`outils/verifier.js`) |
| [40. Le directeur de mise en scène](40-directeur.md) | ce qu'un jeu devrait montrer à ses joueurs au dernier cycle, selon son genre (horreur, cozy, collection, survie…) : des moments classés, chacun avec sa raison |
| [41. Les profils de genre](41-profils-de-genre.md) | horreur, cozy, collection, voxel, survie, stratégie, monde partagé : les règles du moteur, le poids des joueurs et le rythme de chaque genre, tout prêts ; chaque promesse mesurée par un banc |
| [42. Les eaux douces](42-eaux-douces.md) | une genèse sur dix lieux d'eau, dont sept nouveaux (le torrent, le lac profond, l'étang, la roselière, le delta, les sources chaudes, la grotte inondée) : 60 lignées, reliées au monde d'Orvane par trois ponts |
| [43. Les versions](43-versions.md) | un contrat qui ne casse pas sans prévenir : ce qui casse un jeu et ce qui ne casse pas, le garde-fou de chaque PR, le journal, le paquet à installer |
| [44. La vitesse et les kits](44-vitesse-et-kits.md) | le cycle 17 % plus vite, le même monde au caractère près ; mesurer une optimisation ; les kits Unity et Godot pour lire le monde, compter, déposer |
| [45. La météo](45-meteo.md) | le temps qu'il fait dans chaque lieu, parcelle par parcelle : la pluie, la neige, le gel, les orages, les canicules ; des fronts qui passent, un sec qui dure ; ce qu'il fait à la température, à l'humidité et à la production du cycle |
| [46. Les saisons des plantes](46-saisons-des-plantes.md) | les arbres caducs ou persistants ; la pousse à la belle saison ; le nectar au printemps, les fruits à la fin de l'été, les graines à l'automne ; le stade de chaque plante, pour montrer une forêt nue, en fleurs, en fruits |
| [47. Les plantes sous le feu](47-succession.md) | les catastrophes et le sec prennent des pieds aux plantes ; la succession : l'herbe, puis les buissons, puis les arbres ; le couvert d'un lieu suit ses arbres, une forêt brûlée s'ouvre puis se referme |
| [48. La flore riche](48-flore-riche.md) | quarante-sept formes de plantes de plus, chacune avec son port, sa hauteur, ce qu'elle donne et les lieux où elle se plaît ; douze caractères hérités ; la radiation de l'éveil ; la concurrence pour la place, les séparations, la colonisation, les extinctions |
| [49. L'herbier](49-herbier.md) | chaque plante de chaque biome dessinée à chaque cycle, selon sa forme, son stade, son feuillage, ce qu'elle a subi ; `morceaux/herbier/<biome>.json`, avec le temps qu'il fait |

## En une page

1. **Orvane publie un instantané** (`mondes/<id>/instantane.json`) : pour chaque taxon, un plan corporel, des populations par biome, des phénotypes (des combinaisons de traits avec leur fréquence). Les biomes sont décrits par cinq axes de 0 à 1, pas par des noms.
2. **Votre traducteur lit l'instantané** et en tire, pour chaque créature de votre jeu : combien en font apparaître, avec quelles variantes, quelles stats. Le **tampon** (fourni) lui donne des fréquences *exposées* : compressées (une variante à 20 % dans Orvane peut n'en faire que 2 % à l'écran), étalées dans le temps, et limitées aux traits que votre jeu sait rendre.
3. **Votre traducteur compte** les rencontres, les prélèvements, les captures, les déplacements, l'habitat gagné ou perdu, et envoie des **lots de pressions** bruts. Le tampon les rapporte à l'activité, les dénormalise, les plafonne et les lisse avant que le moteur ne les intègre.
4. **Le profil** (`profil.json`) règle tout cela pour votre jeu, sans toucher à la biologie.
5. **Chaque nuit**, l'hébergement fait tourner un cycle et publie l'instantané suivant.

Trois règles pour que ça reste juste :
- Orvane ne reçoit jamais de conclusions, seulement des comptes : « 14 tués, 31 croisés », pas « ils sont trop chassés ».
- Un trait n'est jamais une stat. C'est un organe, un coût, un effet. C'est *vous* qui décidez ce qu'une glande qui crache vaut en dégâts.
- Ce que votre jeu ne sait pas rendre continue d'évoluer dans Orvane ; vous l'exposerez le jour où vous saurez le dessiner.

Les fichiers de référence : `schemas/` (le contrat, avec un exemple rempli), `moteur/catalogue.js` (tous les traits possibles, et les traits continus), `moteur/corps.js` (la silhouette d'une lignée et le catalogue de ses organes), `tampon/tampon.js` (`exposer()` et `agreger()`).
