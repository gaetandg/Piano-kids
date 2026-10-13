# 🚀 Piano Cosmos

Une application web pour apprendre le piano en s’amusant, pour les enfants de 6 à 10 ans qui débutent.
Cosmo, un petit extraterrestre, les guide de planète en planète : chaque planète apprend de nouvelles notes,
avec des mini-jeux, des chansons et des autocollants à collectionner.

**Jouer :** https://gaetandg.github.io/Piano-kids/

## Ce que fait l’app

- **Écoute le vrai piano** grâce au micro du téléphone (aucun câble) : l’app reconnaît la note jouée.
  On peut aussi jouer directement sur le clavier de l’écran (bouton en haut à droite de chaque jeu).
- **Un profil par enfant**, avec sa progression, ses étoiles et son album d’autocollants (enregistrés sur le téléphone).
- **Le voyage** :
  1. 🌍 Planète Clavier : grave et aigu, groupes de 2 et 3 touches noires
  2. 🔴 Planète Do : trouver les Do, le Do du milieu, premier rythme
  3. 🟠 Planète Ré-Mi : nommer et jouer Do Ré Mi, numéros des doigts, premières chansons
  4. 🟢 Planète Fa-Sol : les 5 doigts, rythme avec croches, chansons
  5. 🔵 Planète La-Si : toute la gamme
  6. 🟤 Planète Grave : les notes sous le Do du milieu
  7. ✋ Main gauche et 🎼 partitions : bientôt
- **Mini-jeux** : grave ou aigu, trouve la touche, comment s’appelle cette note, la fusée (joue la note),
  le code des Martiens (mémoire), le tambour martien (rythme), chansons qui défilent.
- **Chansons** : Au clair de la lune, Frère Jacques, Ah ! vous dirai-je maman, Vive le vent,
  Joyeux anniversaire (avec le prénom de l’enfant !), Hymne à la joie…
- **Piano libre** : sons de piano, xylophone, spatial ou robot, et un mode « écoute mon piano »
  qui affiche le nom de chaque note jouée sur le vrai piano.
- **Gommettes** : chaque note a une couleur (Do rouge, Ré orange, Mi jaune, Fa vert, Sol bleu clair,
  La bleu foncé, Si violet). Un guide explique où coller les gommettes sur le piano.
- **Espace parents** (⚙️ sur l’écran d’accueil) : modèle de piano, test et sensibilité du micro,
  voix de Cosmo, tout débloquer, gestion des profils.

## Technique

Site statique sans dépendance ni étape de compilation : HTML, CSS et JavaScript (modules ES).

- `js/pitchcore.js` : détection de la hauteur (algorithme YIN) et des attaques de notes
- `js/audio.js` : sons synthétisés avec Web Audio (rien à télécharger)
- `js/curriculum.js` : planètes et missions ; `js/songs.js` : chansons
- `js/games/` : un fichier par mini-jeu ; `js/screens/` : les écrans
- `sw.js` : fonctionne hors connexion après la première visite

Tests :

```sh
node tests/pitch.test.mjs                   # détection des notes sur des sons synthétiques
npx http-server -p 8080 -c-1 &              # puis, avec Playwright :
node tests/smoke.cjs                        # parcourt tous les écrans (portrait et paysage)
node tests/play.cjs                         # joue plusieurs missions et vérifie les étoiles
```
