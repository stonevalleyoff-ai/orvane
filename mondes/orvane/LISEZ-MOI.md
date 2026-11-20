# Le monde d'Orvane

Le monde où tous les jeux se branchent. **Le monde vivant est sur la branche `publication`**, que le site sert : `https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/instantane.json`. Le cycle la réécrit chaque nuit, vers 03:05 UTC (`hebergement/publication.js`, docs/19).

**Sur la branche `main`, ce dossier n'est pas le monde du jour.** Ce que le cycle écrit (`etat.json`, `instantane.json`, `historique.json`, `tampon.json`, `flore.json`, `jeux.json`, `generation-0.json`, `chronique/`, `museum.json`, `morceaux/`) y est une copie figée au cycle 44 (5 novembre 2026), qui ne suit plus le monde : ses effectifs sont anciens, et 94 de ses lignées y portent un `apparu` postérieur à son propre cycle (jusqu'à 973). Ne branchez pas un jeu sur cette copie, et ne vous en servez pas pour juger le monde : lisez le site, ou `git show origin/publication:mondes/orvane/instantane.json`. Le bilan de chaque saison, jeu par jeu (`bilans/`, docs/4), n'est que dans la publication.

Ce qui vient de `main`, et seulement de lui, c'est ce qu'on écrit à la main : `profil.json` (les règles du monde, ce qu'il éveille, ce que pèsent les jeux), `amorce.json`, et les lots ou les noms déposés à la main (`lots/`, `noms/`).
