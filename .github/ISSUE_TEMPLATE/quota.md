---
name: Relever le quota d'un jeu
about: Un jeu branché sur Orvane demande plus de lots par jour (la procédure : hebergement/LISEZ-MOI.md, « Relever le quota d'un jeu »)
title: "Quota : <identifiant du jeu>, de <quota présent> à <quota voulu>"
labels: quota
---

<!-- Ne mettez jamais de clé dans cette issue : ni la clé du jeu, ni la clé d'administration, ni la clé de dépôt. -->

**Le jeu** : son identifiant (`orvane_jeu` le rend) et son nom.

**Le quota** : aujourd'hui, et le palier demandé (2 000, 5 000 ou 20 000 lots par jour ; un palier à la fois).

**Les joueurs** : combien par jour aujourd'hui, combien attendus dans le mois.

**Les dépôts**
- combien de lots un joueur dépose par jour, et à quel moment (une sauvegarde, une fin de partie…) :
- `p_compte` : comment il est fait (un pseudonyme stable par joueur, par exemple un hachage de son identifiant) :
- les refus des 7 derniers jours, par raison (la réponse `erreur` de `orvane_deposer`) :
- depuis le client ou depuis un serveur ; avec un `id` de lot ; avec la clé de dépôt (exigée à partir de 5 000) :

**Le traducteur** : il passe le banc générique (`node outils/banc-traducteur.js mon-traducteur.js`, docs/39) : oui / non.

**Un contact** pour ce jeu (il répond sous une semaine) :
