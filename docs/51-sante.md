# 51. La santé du moteur : le rapport de chaque semaine

Le monde d'Orvane tourne chaque nuit, et personne ne le regarde tourner. Le rapport de santé est ce regard, une fois par semaine : ce que le monde porte, ce que les joueurs lui envoient et ce qu'il en fait, ce que les bêtes en retiennent, ses souches, le rythme de ses cycles, ce que l'année et le climat lui réservent. Tout le monde le lit dans l'Observatoire, vue **Santé** (`monde/?monde=orvane&vue=sante`).

Un rapport a deux étages :
- **les mesures**, calculées par `outils/sante.js` sur les fichiers publiés du monde. Elles sont déterministes : les mêmes fichiers donnent le même rapport ;
- **le récit**, écrit au-dessus des mesures : un titre, un résumé, les constats, quelques paragraphes par partie, ce qu'il faut faire. Il est écrit chaque lundi par une tâche planifiée (Claude), qui lit les mesures, compare avec le rapport d'avant, vérifie ce qui l'étonne dans le code, et écrit.

Un rapport sans récit s'affiche quand même : les constats sont alors les alertes des mesures.

## Où il vit

Les rapports ne sont pas dans `main`. Ils sont sur la branche `sante`, qui ne contient qu'un dossier :

```
sante/<monde>/
  index.json          la liste des rapports, le plus récent d'abord (outils/sante.js --indexer)
  AAAA-MM-JJ.json     un rapport : { titre, resume, chiffres, constats, notes, actions, auteur, mesures }
```

Le cycle (`.github/workflows/cycle.yml`, étape « les rapports de santé ») recopie ce dossier dans le site à chaque passe. Un rapport poussé sur `sante` est donc en ligne à la passe suivante, dans l'heure, sans toucher à `main`. Sans branche `sante`, le site se publie comme avant, et la vue Santé dit qu'il n'y a pas encore de rapport.

## Les mesures

```
node outils/sante.js <dossier d'un monde publié> [--precedent <rapport.json>] [--sortie <rapport.json>] [--date AAAA-MM-JJ]
node outils/sante.js --indexer sante/<monde>
```

Le dossier est `mondes/<id>/` tel que la branche `publication` le publie : `instantane.json`, `historique.json`, `tampon.json`, `jeux.json`, `profil.json`, `chronique/index.json`. Avec `--sortie`, un récit déjà écrit dans le fichier est gardé : on peut refaire les mesures sans perdre le texte.

| partie | ce qu'elle mesure |
| --- | --- |
| `monde`, `effectifs` | le cycle, la saison, les lignées animales, les machines, les plantes, les bêtes, les lieux, les parcelles, les statuts, les lignées menacées, les extinctions de la fenêtre et leur cause |
| `serie`, `groupes` | pour chaque cycle de l'historique : les bêtes, les événements de joueurs, la production, et chaque groupe (régime × origine : « carnivores · la genèse 7 ») ; pour chaque groupe, sa variation, ses dernières pentes, sa satiété |
| `pressions` | les événements de joueurs, les cycles qui en ont reçu, les jeux inscrits, chaque retrait lissé du tampon et s'il a fait des morts (`applique`), ce que les joueurs prennent (la valeur z moyenne des bêtes prises) |
| `memoire` | les populations qui portent une trace des joueurs, les plus marquées, les attitudes, le caractère des lignées |
| `souches` | chaque souche vivante, ses hôtes, ses infectés ; les populations les plus infectées |
| `vivant` | les savoirs, les hybrides, les formes de vie en groupe, les populations migratrices, les machines et la Mère |
| `rythme` | la date de chaque cycle, les trous de plus de 30 heures, les jours à deux cycles, l'heure habituelle |
| `calendrier`, `climat` | les changements de saison à venir et leurs dates prévues ; la part prévisible du climat (ses ondes) et ses repères : les ponts de terre, le plus froid, le plus chaud |
| `alertes` | ce que les règles ci-dessous relèvent |
| `comparaison` | avec `--precedent` : l'écart au rapport d'avant |

Les dates à venir supposent que le monde garde son rythme (`profil.monde.cycle`).

## Les règles des alertes

Elles sont simples et dites ici ; leurs seuils sont dans `SEUILS` (`outils/sante.js`) et publiés dans chaque rapport.

| niveau | quand |
| --- | --- |
| alerte | un groupe d'au moins cinq lignées a perdu 20 % sur la fenêtre, et a reculé à chacun des cinq derniers cycles |
| alerte | un retrait lissé d'au moins un vingtième de bête n'a fait aucune mort (la population n'a pas de champ `pression`) |
| à surveiller | un groupe d'au moins cinq lignées a doublé sur la fenêtre |
| à surveiller | les machines croissent de plus de 10 % par cycle |
| à surveiller | une souche dépasse 35 % de virulence, ou passe par un insecte |
| à surveiller | plus de lignées menacées qu'au rapport précédent |
| à savoir | une lignée s'est éteinte ; des populations ont pris une attitude ; aucun événement de joueur depuis sept cycles ; un trou dans le rythme des cycles |

Le récit peut dire autre chose que les alertes : c'est son rôle. Il peut aussi dire qu'une alerte n'en est pas une, et pourquoi.

## La tâche de chaque semaine

Chaque lundi, après le cycle de la nuit, une session de Claude :
1. lit le monde publié (`git fetch origin publication`) et le dernier rapport (`git fetch origin sante`) ;
2. fait les mesures, avec le rapport d'avant (`--precedent`) ;
3. lit les alertes et les écarts, vérifie dans le code et dans les données ce qui l'étonne ;
4. écrit le récit dans le rapport, met l'index à jour (`--indexer`) ;
5. pousse le tout sur la branche `sante`, et rien d'autre.

Elle ne touche ni à `main`, ni au monde, ni aux issues.

## À la main

```
git fetch origin publication sante
mkdir -p /tmp/monde /tmp/sante && git archive origin/publication mondes/orvane | tar -x -C /tmp/monde
git archive origin/sante sante | tar -x -C /tmp/sante
node outils/sante.js /tmp/monde/mondes/orvane --precedent /tmp/sante/sante/orvane/<dernier>.json --sortie /tmp/sante/sante/orvane/<aujourd'hui>.json
```

Puis écrire le récit dans le fichier, `node outils/sante.js --indexer /tmp/sante/sante/orvane`, et pousser `sante/` sur la branche `sante`.

## Ce que le banc vérifie

`bancs/sante.js` : les mesures se calculent sur la genèse 2026 et sont les mêmes deux fois ; chaque partie est là ; un retrait sans mort, un groupe qui recule à chaque cycle et une extinction lèvent leur alerte ; un récit déjà écrit est gardé quand on refait les mesures ; l'index met le plus récent d'abord ; l'Observatoire charge la vue.

```
node bancs/sante.js
```
