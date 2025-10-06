# Documentation des Attributs `data-*` pour les Pantins SVG

Ce document formalise un ensemble d'attributs `data-*` à utiliser dans les fichiers SVG des pantins. L'objectif est d'enrichir le SVG avec des métadonnées sémantiques pour faciliter leur manipulation et leur animation par l'application.

## 1. Identification et Hiérarchie

Ces attributs permettent de construire un "squelette" logique et hiérarchique du pantin.

-   `data-pantin-part="[type]"` : (Obligatoire) Définit le type de la pièce.
    -   **Valeurs possibles :** `head`, `torso`, `arm`, `forearm`, `hand`, `leg`, `shin`, `foot`, `eye`, `mouth`, etc.

-   `data-pantin-side="[side]"` : Spécifie le côté pour les membres symétriques.
    -   **Valeurs possibles :** `left`, `right`.

-   `data-pantin-anchor` : Attribut booléen (`true`/`false`) qui marque un groupe (`<g>`) ou un élément (`<circle>`) comme étant le point de pivot pour sa pièce parente. La transformation (rotation) se fera par rapport à la position de cet élément.

## 2. Contrôle de l'Animation

Ces attributs fournissent les contraintes et les informations nécessaires à l'animation.

-   `data-rotation-min="[degrés]"` et `data-rotation-max="[degrés]"` : Définissent les limites de rotation (en degrés) d'une articulation pour éviter des mouvements irréalistes.

-   `data-z-index="[nombre]"` : Gère l'ordre de superposition des pièces (similaire au `z-index` CSS). Un nombre plus élevé place la pièce au-dessus. Peut être négatif.

## 3. Variations et États

Idéal pour gérer les expressions faciales, les phonèmes, ou d'autres états visuels d'une même pièce.

-   `data-variant-group="[nom_groupe]"` : Assigne une pièce à un groupe de variations. Toutes les variations d'une même partie (ex: les différentes bouches) partagent le même `nom_groupe`.
    -   **Exemple :** `mouth`, `eyes`.

-   `data-variant-name="[nom_variation]"` : Nom unique de la variation au sein de son groupe.
    -   **Exemple :** `default`, `smile`, `sad`, `phoneme-a`.

-   `data-variant-default` : Attribut booléen (`true`/`false`) qui indique la variation à afficher par défaut au sein d'un `data-variant-group`.

## 4. Interactivité dans l'Éditeur

Ces attributs indiquent à l'interface comment l'utilisateur peut interagir avec les pièces du pantin.

-   `data-interactive="true|false"` : Attribut général pour marquer une pièce comme étant manipulable.
-   `data-draggable="true|false"` : Permet de rendre une pièce déplaçable dans la scène.
-   `data-rotatable="true|false"` : Permet la rotation de la pièce autour de son ancre.

---

## Exemple d'Implémentation

Voici à quoi pourrait ressembler une partie du SVG du bras gauche avec ces attributs :

```xml
<!-- Dans le SVG du pantin -->

<g id="bras_gauche" data-pantin-part="arm" data-pantin-side="left" data-z-index="10">
    
    <g id="haut_bras_gauche" data-pantin-part="upper_arm" data-rotatable="true" data-rotation-min="-90" data-rotation-max="90">
        <path id="path100_2" d="..."/>
        <g id="epaule_gauche" data-pantin-anchor="true">
            <!-- Ce cercle définit le point de pivot de tout le bras -->
            <circle cx="348" cy="167.048" r="2" fill="transparent" />
        </g>
    </g>

    <g id="avant_bras_gauche" data-pantin-part="forearm" data-rotatable="true" data-rotation-min="0" data-rotation-max="150">
        <path id="path100" d="..."/>
        <g id="coude_gauche" data-pantin-anchor="true">
            <circle cx="428" cy="167.048" r="2" fill="transparent" />
        </g>
    </g>

    <g id="main_gauche" data-pantin-part="hand">
        <!-- ... contenu de la main ... -->
    </g>
</g>

<!-- Pour les variations de bouche -->
<g id="var_bouche">
    <g id="bouche" data-variant-group="mouth" data-variant-name="default" data-variant-default="true">
        <!-- SVG de la bouche par défaut -->
    </g>
    <g id="bouche_a" data-variant-group="mouth" data-variant-name="a" style="display: none;">
        <!-- SVG de la bouche "a" -->
    </g>
    <g id="bouche_f" data-variant-group="mouth" data-variant-name="f" style="display: none;">
        <!-- SVG de la bouche "f" -->
    </g>
</g>
```
