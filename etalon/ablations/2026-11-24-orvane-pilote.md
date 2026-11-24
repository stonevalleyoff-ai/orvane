## Les ablations : orvane, cycle 64 (10 cycles, 2 graines)

Le témoin : 300 lignées animales (écart entre graines 0), 86 carnivores, 19 231 t, Shannon 2,196, 100 % de lignées stables, 0 éteintes, 0 nées ; un cycle en 16,33 s. Lu selon le plan 2 (b76dcd77d84e…), les essais faits selon le plan 1 (7306c2ee85b3…).

| essai | nature | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | coût | lecture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mutation | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien de mesurable en 10 cycles (chaque cycle, dans un monde clonal (sans reproduction sexuée)) |
| nouveau_trait | mecanisme | +0,5 | +0,5 | +0 % | -0 | 0 | 0 | +0,5 | ≈ | rien de mesurable en 10 cycles (chaque cycle) |
| migration | mecanisme | +2,5 | +1 | -0 % | -0,006 | +0,002 | 0 | +2,5 | ≈ | elle tient : sans elle, lignees, nees bougent |
| seuil_surpeuple = 0.7 | constante | 0 | 0 | -0 % | +0,061 | -0,003 | 0 | 0 | -21 % | elle compte : à cette valeur, shannon bouge |
| seuil_surpeuple = 0.95 | constante | +1,5 | +0,5 | -0 % | -0,015 | +0,002 | 0 | +1,5 | ≈ | rien de mesurable à cette valeur en 10 cycles |
| separation | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien de mesurable en 10 cycles (chaque cycle (rarement)) |
| memoire_eteint | comptable | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien ne change aux bêtes, comme attendu |
| regain_habitat | mecanisme | 0 | 0 | -0,3 % | -0,005 | 0 | 0 | 0 | ≈ | rien de mesurable en 10 cycles (chaque cycle) |
| effondrement | comptable | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien ne change aux bêtes, comme attendu |
| explosion | comptable | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien ne change aux bêtes, comme attendu |
| menace | comptable | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien ne change aux bêtes, comme attendu |
| max_phenotypes = 10 | constante | +0,5 | 0 | +0,1 % | -0,002 | 0 | 0 | +0,5 | +13 % | rien de mesurable à cette valeur en 10 cycles |
| max_phenotypes = 40 | constante | 0 | 0 | -0,1 % | 0 | +0,002 | 0 | 0 | -14 % | rien de mesurable à cette valeur en 10 cycles |
| besoin ×0.5 | constante | +0,5 | 0 | +1,5 % | -0,027 | -0,002 | 0 | +0,5 | ≈ | elle compte : à cette valeur, shannon bouge |
| besoin ×2 | constante | +2 | +0,5 | -2,1 % | +0,01 | 0 | 0 | +2 | ≈ | elle compte : à cette valeur, biomasse_t bouge |
| conversion ×0.5 | constante | +2 | +1,5 | -0,8 % | -0,023 | 0 | 0 | +2 | ≈ | rien de mesurable à cette valeur en 10 cycles |
| conversion ×2 | constante | 0 | 0 | +1,4 % | +0,026 | +0,002 | 0 | 0 | ≈ | rien de mesurable à cette valeur en 10 cycles |
| demi_satiete ×0.5 | constante | +0,5 | 0 | -0,6 % | -0,004 | -0,002 | 0 | +0,5 | ≈ | rien de mesurable à cette valeur en 10 cycles |
| demi_satiete ×2 | constante | +0,5 | 0 | +0,4 % | -0,012 | -0,008 | 0 | +0,5 | ≈ | rien de mesurable à cette valeur en 10 cycles |
| predation_max | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien de mesurable en 10 cycles (chaque cycle) |
| chasse_omnivore | mecanisme | +1 | +0,5 | +0,1 % | -0,001 | 0 | 0 | +1 | ≈ | rien de mesurable en 10 cycles (chaque cycle) |
| omnivore_vegetal | mecanisme | +1 | +0,5 | +0,9 % | +0,07 | -0,02 | 0 | +1 | ≈ | elle tient : sans elle, shannon bouge |
| omnivore_vegetal_base | mecanisme | +1,5 | +0,5 | +3,2 % | -0,008 | -0,018 | 0 | +1,5 | ≈ | elle tient : sans elle, biomasse_t bouge |
| longevite_predateur | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | ≈ | rien de mesurable en 10 cycles (aux séparations) |
| viande_omnivore | mecanisme | 0 | 0 | -0,5 % | -0,006 | +0,002 | 0 | 0 | +10 % | rien de mesurable en 10 cycles (chaque cycle) |
| faim_carnivore | mecanisme | +0,5 | +0,5 | +0,2 % | -0,003 | 0 | 0 | +0,5 | +12 % | rien de mesurable en 10 cycles (chaque cycle) |
| detritivore_vegetal | mecanisme | 0 | 0 | +0,2 % | -0,004 | -0,003 | 0 | 0 | +13 % | rien de mesurable en 10 cycles (chaque cycle) |
| vers_carnivore | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | +14 % | rien de mesurable en 10 cycles (aux séparations, si le régime dérive) |
| faim_migration | mecanisme | +0,5 | 0 | +0 % | -0,014 | +0,002 | 0 | +0,5 | +13 % | rien de mesurable en 10 cycles (chaque cycle) |
| hivernage | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | +13 % | rien de mesurable en 10 cycles (aux saisons) |
| dispersion | mecanisme | +1 | 0 | +0 % | +0,001 | +0,002 | 0 | +1 | +16 % | rien de mesurable en 10 cycles (chaque cycle, dans un monde à parcelles) |
| fuite | mecanisme | +0,5 | 0 | +0 % | -0,013 | +0,002 | 0 | +0,5 | +14 % | rien de mesurable en 10 cycles (chaque cycle, dans un monde à parcelles) |
| report_proies | mecanisme | +1,5 | +0,5 | +0,1 % | -0,033 | -0,012 | 0 | +1,5 | +15 % | elle tient : sans elle, shannon bouge |
| saisons | mecanisme | 0 | 0 | -7,5 % | +0,047 | -0,012 | 0 | 0 | +25 % | elle tient : sans elle, biomasse_t, shannon bougent |
| maladie | mecanisme | +0,5 | 0 | +0 % | -0 | 0 | 0 | +0,5 | +17 % | rien de mesurable en 10 cycles (chaque cycle) |
| catastrophes | mecanisme | 0 | 0 | +0,1 % | +0,005 | 0 | 0 | 0 | +17 % | rien de mesurable en 10 cycles (chaque cycle) |
| derive | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | +18 % | rien de mesurable en 10 cycles (aux séparations) |
| vol_masse_max | mecanisme | 0 | 0 | 0 % | 0 | 0 | 0 | 0 | +18 % | rien de mesurable en 10 cycles (aux séparations) |
| genetique | mecanisme | 0 | 0 | -1,1 % | -0,002 | -0,002 | 0 | 0 | +20 % | rien de mesurable en 10 cycles (chaque cycle) |
| hybride | mecanisme | +0,5 | +0,5 | +0,1 % | -0,004 | 0 | 0 | +0,5 | +20 % | rien de mesurable en 10 cycles (chaque cycle) |
| sexe | mecanisme | +1 | 0 | +0,3 % | -0,005 | +0,002 | 0 | +1 | +66 % | rien de mesurable en 10 cycles (chaque cycle) |
| concurrence_masse | mecanisme | +0,5 | 0 | +0,2 % | +0,002 | -0,018 | 0 | +0,5 | +15 % | rien de mesurable en 10 cycles (chaque cycle) |
| viande_part | mecanisme | +0,5 | 0 | -0,7 % | +0,001 | +0,002 | 0 | +0,5 | +16 % | rien de mesurable en 10 cycles (chaque cycle) |
| domination | mecanisme | +0,5 | 0 | -0 % | +0 | +0,002 | 0 | +0,5 | +18 % | rien de mesurable en 10 cycles (chaque cycle) |
| petites_proies | mecanisme | +0,5 | 0 | -0,3 % | +0,001 | +0,002 | 0 | +0,5 | +22 % | rien de mesurable en 10 cycles (chaque cycle) |

Les écarts sont ceux de l'essai au témoin, en moyenne sur les graines (la biomasse, en part de celle du témoin). Le coût : la part d'un cycle qu'on gagne sans la règle, au-delà du bruit des durées (≈ : dans ce bruit).

Non essayées : max_taxons (la règle ne fait rien par défaut (la genèse s'en sert) ; rien à retirer dans un monde hébergé) ; cadavres (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; mefiance (la règle ne vit que de ce que font les joueurs ; sans pressions, rien à mesurer) ; naissances (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; colonisation (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; diapause (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; renouvellement (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; recouvrement (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; charognes (déjà retirée dans ce monde : sa valeur est celle qui l'éteint) ; meute_proie (déjà retirée dans ce monde : sa valeur est celle qui l'éteint).
