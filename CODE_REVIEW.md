# Revue de Code : Optimisation et Maintenabilité

Cette revue se concentre sur l'amélioration de la clarté, de la maintenabilité et des performances du code de l'application.

## 1. Clarté et Maintenabilité

### 1.1. `App.tsx` - Centralisation de la logique

Le composant `App` est actuellement responsable de beaucoup de choses : gestion de l'état des panneaux, gestion des raccourcis clavier, et communication entre les composants.

*   **Recommandation :** Extraire la logique dans des hooks personnalisés.
    *   Créer un hook `useUILayout` qui gérerait l'état des panneaux (largeur, état ouvert/fermé) et la sauvegarde dans le `localStorage` (avec un `debounce`).
    *   Créer un hook `useKeyboardShortcuts` pour gérer les raccourcis clavier de l'application.

    **Exemple (conceptuel) :**
    ```typescript
    // hooks/useUILayout.ts
    const useUILayout = () => {
      // ... logique de useResizable et de sauvegarde
      return { leftPanel, rightPanel, dock, ... };
    }

    // App.tsx
    const { leftPanel, rightPanel, dock } = useUILayout();
    ```

### 1.2. `Canvas.tsx` - Gestion de l'état complexe

Ce composant est le cœur de l'application et gère un état très complexe avec de nombreux `useState`.

*   **Recommandation :** Utiliser `useReducer` pour gérer l'état du canvas. Cela centralise la logique de transition d'état, rend les mises à jour plus prévisibles et facilite le débogage.

    **Exemple (conceptuel) :**
    ```typescript
    const initialState = { svgObjects: [], ... };

    function canvasReducer(state, action) {
      switch (action.type) {
        case 'ADD_OBJECT':
          // ...
        case 'UPDATE_OBJECT':
          // ...
        default:
          return state;
      }
    }

    // Dans le composant Canvas
    const [state, dispatch] = useReducer(canvasReducer, initialState);
    ```

### 1.3. `Pantin.tsx` - Complexité du parsing SVG

Le composant parse une chaîne de caractères SVG en utilisant `DOMParser` et la transforme en éléments React. C'est une approche intelligente mais qui a quelques inconvénients :

*   **Performance :** Le parsing XML peut être lent.
*   **Maintenabilité :** Le code qui parcourt le DOM et en déduit la structure est fragile et dépendant de la structure exacte du SVG.
*   **Convention implicite :** L'utilisation de `circle.pivot` pour trouver les points de rotation est une convention qui n'est pas évidente sans lire le code.

*   **Recommandations :**
    1.  **Documentation :** Documenter clairement la convention de nommage et de structure attendue pour les SVGs (ex: la nécessité d'un `<circle class="pivot">`).
    2.  **(Optimisation de performance)** Voir la section performance pour une recommandation de pré-calcul.

### 1.4. `InspectorPanel.tsx` - Logique de "flip"

La logique de gestion de l'état "flipped" est répartie dans le rendu des sliders, ce qui la rend un peu difficile à suivre.

*   **Recommandation :** Centraliser la logique de calcul de l'angle. Créer une fonction helper qui prend l'objet et le nom de la partie, et retourne l'angle à afficher en tenant compte de l'état `flipped`.

## 2. Optimisation des Performances

### 2.1. Sauvegarde dans le `localStorage`

Dans `Canvas.tsx`, `localStorage.setItem` est appelé à chaque modification de l'état, ce qui peut être très fréquent (ex: pendant un glisser-déposer).

*   **Recommandation :** "Débouncer" l'appel à `localStorage.setItem`. Utiliser un `useEffect` avec un `setTimeout` (ou un hook `useDebounce`) pour ne sauvegarder l'état que lorsque l'utilisateur a terminé son interaction (par exemple, 500ms après la dernière modification).

### 2.2. Re-rendus React (`React Rendering`)

Le `Canvas` et ses enfants peuvent se re-rendre fréquemment, en particulier lors du panoramique ou du zoom.

*   **Recommandations :**
    *   **`React.memo` :** Envelopper les composants qui sont rendus dans la boucle `.map()` (comme `Pantin` ou le conteneur d'objet générique) avec `React.memo` pour éviter les re-rendus si leurs props n'ont pas changé.
    *   **`useCallback` :** Envelopper les fonctions passées en props (comme `onDragStop`, `onResizeStop`) dans `useCallback` pour éviter de créer de nouvelles fonctions à chaque rendu du `Canvas`.
    *   **Séparation de l'état :** L'état de la transformation (`transformState`) change constamment lors du panoramique/zoom. Si possible, isoler cet état pour qu'il ne provoque pas le re-rendu de toute la liste d'objets. Des bibliothèques comme `zustand` ou `jotai` peuvent aider à s'abonner à des parties spécifiques de l'état.

### 2.3. Parsing SVG dans `Pantin.tsx`

Comme mentionné précédemment, le parsing SVG à la volée est coûteux.

*   **Recommandation :** Pré-calculer la structure des SVGs. Modifier le script `scripts/generate-assets-manifest.js` pour qu'il ne se contente pas de lister les fichiers, mais qu'il lise également les SVGs, les parse, et extraie une représentation JSON de leur structure (et des pivots). Le `manifest.json` contiendrait alors cette structure JSON, éliminant le besoin de `DOMParser` dans le navigateur.

### 2.4. Chargement des Assets

`AssetPanel.tsx` charge le contenu de tous les SVGs au démarrage.

*   **Recommandation :** Mettre en place un chargement à la demande ("lazy loading"). Le panel lirait le manifeste pour afficher les miniatures, mais le contenu complet du SVG ne serait chargé (via `fetch`) que lorsque l'utilisateur commence à glisser un asset vers le canvas.

## Conclusion

Le projet est bien structuré et fonctionnel. Les recommandations ci-dessus visent à améliorer la maintenabilité à long terme et à garantir que l'application reste performante à mesure qu'elle gagne en complexité et en contenu. L'utilisation de hooks personnalisés comme `useResizable` est un excellent point de départ à généraliser.
