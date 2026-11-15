# Aventure Pixel Card (FR)

Petit jeu de plateforme en pixels pour Home Assistant, avec deux héros originaux :

- **`dino`** : un petit dinosaure dans la jungle — il ramasse des os, et le piment caché dans les caisses lui donne un souffle de feu ;
- **`cube`** : un aventurier tout en cubes dans un monde de blocs — il ramasse des gemmes, et la pioche cachée dans les caisses se lance sur les ennemis.

Niveaux générés à l'infini et de plus en plus difficiles, sauts sur les ennemis, caisses surprises, drapeau d'arrivée, vies, score et meilleur score. Commandes tactiles (boutons sous le jeu, balayage vers le haut pour sauter) et clavier. Le jeu se met en pause tout seul quand la carte n'est plus visible. Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → l'URL de ce dépôt, catégorie **Tableau de bord**. Puis recharger le navigateur (Ctrl+Maj+R).

## Exemples
```yaml
type: custom:aventure-pixel-card
hero: dino
player: Shaun
nuance: foret
```
```yaml
type: custom:aventure-pixel-card
hero: cube
player: Logan
difficulty: difficile
best_score_entity: input_number.record_logan   # facultatif
light_entity: light.chambre_logan              # facultatif
```

## Options
| Option | Défaut | Description |
|---|---|---|
| `hero` | `dino` | `dino` (petit dinosaure) ou `cube` (aventurier en cubes) |
| `player` | | Prénom du joueur, affiché sous le titre (le meilleur score est gardé par joueur) |
| `name` | titre du monde | Titre de la carte |
| `difficulty` | `normal` | `facile`, `normal` ou `difficile` |
| `lives` | `3` | Nombre de vies (1 à 9) |
| `sound` | `true` | Petits sons |
| `best_score_entity` | | `input_number` (ou `number`) où enregistrer le meilleur score — prévoir un maximum de 99999 |
| `light_entity` | | Lumière qui clignote à chaque niveau réussi |
| `theme` | `auto` | `auto`, `light`, `dark` |

Le bloc « Nuance de couleur » est identique à celui des autres cartes.

## Commandes
- Téléphone / tablette : ◀ ▶ pour avancer, ▲ pour sauter, ✸ pour tirer ; balayer l'écran vers le haut = sauter.
- Clavier : ← → (ou Q / D), Espace ou ↑ pour sauter, X pour tirer, P pour la pause.
