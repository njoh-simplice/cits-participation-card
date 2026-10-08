# Générateur de card de participation · CITS26

Site statique (HTML, CSS et JavaScript vanilla, sans framework, sans backend, sans build) qui permet de générer une card « Je serai au CITS26 ! » pour le Cameroon International Tech Summit (15-17 octobre 2026, Palais des Congrès, Yaoundé).

La card est dessinée avec l'API Canvas 2D : l'aperçu et le PNG exporté utilisent exactement le même code. La photo ne quitte jamais le navigateur (aucun envoi, aucune sauvegarde).

## Structure

```
index.html
css/styles.css         tokens en variables CSS, mise en page de l'interface
js/config.js           couleurs, textes FR/EN, données de l'événement, URLs, LAYOUT par format
js/logo-inline.js      copie du logo en data URI (mode file:// uniquement)
js/render.js           dessin de la card sur le canvas
js/photo.js            import, orientation EXIF, recadrage, zoom
js/app.js              état, formulaire, actions, partage, copie
assets/logo-cits.png   logo officiel (utilisé en priorité)
assets/logo-cits.svg   repère de repli, affiché seulement si le PNG est introuvable
```

## Remplacer le logo

Remplacez `assets/logo-cits.png` par le fichier officiel (fond transparent, texte clair : la card est sur fond violet). Il est ajusté automatiquement dans la zone de 270×96 px, en haut à gauche. L'en-tête de la page (`index.html`) référence aussi `assets/logo-cits.png`.

Pour le mode `file://`, régénérez aussi la copie intégrée :

```bash
node -e "const fs=require('fs');fs.writeFileSync('js/logo-inline.js','window.CITS_LOGO_INLINE = \'data:image/png;base64,'+fs.readFileSync('assets/logo-cits.png').toString('base64')+'\';\n')"
```

Pour utiliser un autre nom ou un SVG, modifiez `EVENT.logoSources` dans `js/config.js`.

## Modifier les couleurs, textes et mises en page

Tout est dans `js/config.js` :

| À changer                                                 | Objet                                          |
| --------------------------------------------------------- | ---------------------------------------------- |
| Couleurs de la charte, couleurs de cadre                  | `PALETTE`, `FRAME_COLORS`                      |
| Couleurs de badge par type de participation               | `TYPES`                                        |
| Date, lieu, titre, libellés des pastilles, bouton (FR/EN) | `CARD_TEXT`                                    |
| Légendes à copier                                         | `CAPTIONS`                                     |
| URL des billets, chiffres 50+ et 90+, hashtag             | `EVENT`                                        |
| Positions, tailles, rotations de chaque format            | `LAYOUT.post`, `LAYOUT.story`, `LAYOUT.square` |
| Contours, trame de points, dégradé, étoiles, curseur      | `STYLE`                                        |
| Limites (28/40 caractères, poids max, zoom)               | `LIMITS`                                       |
| Textes de l'interface (FR/EN)                             | `UI`                                           |

Les couleurs de `PALETTE` sont recopiées dans les variables CSS au démarrage (`syncPalette` dans `app.js`) : `config.js` fait foi. Les valeurs déclarées dans `css/styles.css` ne servent que de secours avant l'exécution du script, gardez-les alignées.

Les polices (Raleway 800, DM Sans 400/500/700) sont chargées par le lien Google Fonts de `index.html` et listées dans `FONTS.toLoad`.

## Déployer

Il n'y a rien à compiler : publiez le contenu du dossier tel quel.

- **GitHub Pages** : poussez le dépôt, puis Settings → Pages → Deploy from a branch → branche `main`, dossier `/ (root)`.
- **Netlify** : glissez-déposez le dossier dans Netlify Drop, ou connectez le dépôt avec une commande de build vide et `.` comme dossier de publication.

## Remarques

- Le dossier `public/` (fichiers vides et copie du logo) date de la création du dépôt et n'est pas utilisé : vous pouvez le supprimer.
- Le bouton « Partager » n'apparaît que si le navigateur supporte le partage de fichiers (Web Share API), principalement sur mobile.
- Formats d'export : Post 1080×1350, Story 1080×1920, Carré 1080×1080.
