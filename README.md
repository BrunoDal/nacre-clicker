# Nacre

Jouer : https://BrunoDal.github.io/nacre-clicker/

Un clicker PWA mobile-first où une cellule bioluminescente part d’une petite anse et conquiert peu à peu un océan entier.

Produisez des lueurs, développez des espèces et prenez six territoires. Chaque conquête propose une voie sûre mais coûteuse, ou une percée moins chère avec une chance de réussite affichée. Les expéditions permettent ensuite d’engager des lueurs pour tenter d’en gagner davantage. Un échec ne retire jamais de territoire. Les courants, mutations et renaissances prolongent la progression.

Chaque ère enrichit la colonie sans imposer une course : les ateliers cultivent intuition et vitalité, les balises récoltent des marées pour construire des voiliers, puis les chœurs produisent de l’harmonie pour composer des accords. La reconnaissance permet aussi de dépenser des lueurs pour améliorer les chances d’une conquête avant de prendre un risque. Les achats affichent le coût précis et le gain réel de production, y compris en mode Max.

Servez le dossier avec un serveur HTTP, par exemple `python -m http.server 4173`, puis ouvrez `http://localhost:4173`.

La progression est sauvegardée automatiquement. Le jeu fonctionne hors ligne après la première visite et peut être installé sur l’écran d’accueil d’un iPhone.

La publication GitHub Pages est automatisée depuis `dist/` par `.github/workflows/pages.yml` après chaque envoi sur `master`.
