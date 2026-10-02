# Nacre

Jouer : https://BrunoDal.github.io/nacre-clicker/

Un clicker PWA mobile-first où une cellule bioluminescente devient un océan vivant. Chaque ère propose une activité différente, tout en conservant la production automatique et hors ligne.

- **Noyau** : faites grandir la cellule et déclenchez la Résonance. Les Colonies s’ouvrent à 25 000 lueurs produites.
- **Colonies** : associez les espèces en symbioses et répartissez les courants entre lueurs, intuition et vitalité. Les ateliers cultivent les ressources. L’Archipel s’ouvre à 1 milliard de lueurs produites, sans conquête préalable.
- **Archipel** : préparez les expéditions, puis établissez six colonies en dépensant des lueurs, de la vitalité et des marées. Reliez les îles par des routes spécialisées et faites des découvertes qui orientent votre stratégie.
- **Océan souverain** : après 1 billion (1 T) de lueurs produites, six territoires colonisés et six nœuds activés, assemblez trois voix pour composer des chants. Les combinaisons offrent différents bonus. Un premier chant permet la renaissance.

À la renaissance, choisissez une lagune calme, une mer de tempête ou des abysses profonds. Chaque océan offre des compromis de production et de ressources, ainsi qu’un objectif particulier. Les Perles, améliorations d’Héritage et le journal survivent ; symbioses, colonies, routes, découvertes actives et chants recommencent. Nacre cosmique conserve son effet permanent.

La navigation sépare **Océan** (activité de l’ère et scène vivante), **Écosystème** (espèces, outils, mutations et courants), **Exploration** (colonies, routes, découvertes et journal) et **Héritage** (Perles et renaissance). Touchez une ressource pour connaître sa source et son usage. Les outils des anciennes ères restent accessibles dans des sections repliables.

La source de lueur reste au-dessus des objectifs dans toutes les ères. Les espèces futures, anciennes activités et statistiques sont repliables ; Exploration met la prochaine escale en avant et indique les ressources disponibles, requises et manquantes. Les sections ouvertes et le focus clavier sont conservés lors des mises à jour.

Les scènes évoluent avec les espèces et les ères. La Résonance illumine la source d’un halo lent et enrichit l’ambiance sonore lorsqu’elle est activée. Le son synthétisé reste facultatif et désactivé par défaut : il attend un geste utilisateur et s’arrête quand le jeu passe en arrière-plan. Les animations et vibrations restent réglables.

Les sauvegardes existantes sont migrées automatiquement sans effacer les ressources, les anciens territoires, spécialités, souvenirs ou améliorations permanentes.

Vérifiez la logique avec `node --test tests/*.test.js`.

Servez le dossier avec un serveur HTTP, par exemple `python -m http.server 4173`, puis ouvrez `http://localhost:4173`.

La progression est sauvegardée automatiquement. Le jeu fonctionne hors ligne après la première visite et peut être installé sur l’écran d’accueil d’un iPhone.

La publication GitHub Pages est automatisée depuis `dist/` par `.github/workflows/pages.yml` après chaque envoi sur `master`.
