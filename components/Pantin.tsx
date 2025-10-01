import React, { useRef, useEffect } from 'react';
import type { SvgObject } from '../types';

interface PantinProps {
  object: SvgObject;
}

// Defines the parent-child relationships for rotation calculation
const PUPPET_HIERARCHY: { [key: string]: string | null } = {
    'tete': 'cou',
    'haut_bras_droite': 'epaule_droite',
    'avant_bras_droite': 'haut_bras_droite',
    'main_droite': 'avant_bras_droite',
    'haut_bras_gauche': 'epaule_gauche',
    'avant_bras_gauche': 'haut_bras_gauche',
    'main_gauche': 'avant_bras_gauche',
    'cuisse_droite': 'hanche_droite',
    'tibia_droite': 'cuisse_droite',
    'pied_droite': 'tibia_droite',
    'cuisse_gauche': 'hanche_gauche',
    'tibia_gauche': 'cuisse_gauche',
    'pied_gauche': 'tibia_gauche',
    // Parts without parents in this hierarchy
    'cou': null, 'epaule_droite': null, 'epaule_gauche': null,
    'hanche_droite': null, 'hanche_gauche': null,
};

const ARTICULABLE_PARTS = Object.keys(PUPPET_HIERARCHY).filter(key => PUPPET_HIERARCHY[key] !== undefined);

export const Pantin: React.FC<PantinProps> = ({ object }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sendToBack = (el: Element | null) => {
      if (el && el.parentNode) {
          el.parentNode.insertBefore(el, el.parentNode.firstChild);
      }
  };

  const findPivotCoords = (el: SVGElement | null): string | null => {
      if (!el || !el.parentNode) return null;
      const parent = el.parentNode as Element;
      const pivotCircle = parent.querySelector(":scope > circle.pivot") as SVGCircleElement | null;
      if (!pivotCircle) return null;

      const cx = parseFloat(pivotCircle.getAttribute("cx") || "");
      const cy = parseFloat(pivotCircle.getAttribute("cy") || "");
      if (isNaN(cx) || isNaN(cy)) return null;

      return `${cx}px ${cy}px`;
  };

  // Effect for initial setup: z-ordering, find pivots and set transform origins
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Z-order adjustments
    ["poignet_droite", "poignet_gauche", "hanche_droite", "hanche_gauche"].forEach((id) => {
        const node = container.querySelector(`#${id}`);
        if (node) sendToBack(node);
    });

    ARTICULABLE_PARTS.forEach(partId => {
      const el = container.querySelector(`#${partId}`) as SVGElement | null;
      if (el) {
        const pivot = findPivotCoords(el);
        if (pivot) {
          el.style.transformOrigin = pivot;
          (el.style as any).transformBox = "view-box";
        }
      }
    });
  }, [object.content]);

  // Effect for applying rotations when articulation props change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const appliedRotations: { [key: string]: number } = {};
    const articulationState = object.articulation || {};

    const getRotation = (partId: string): number => {
        return articulationState[partId] || 0;
    };
    
    // Function to calculate final rotation including parents'
    const getAbsoluteRotation = (partId: string): number => {
        let totalAngle = 0;
        let currentPart: string | null = partId;
        while(currentPart && PUPPET_HIERARCHY[currentPart] !== undefined) {
            totalAngle += getRotation(currentPart);
            currentPart = PUPPET_HIERARCHY[currentPart];
        }
        return totalAngle;
    };

    ARTICULABLE_PARTS.forEach(partId => {
        const el = container.querySelector(`#${partId}`) as SVGElement | null;
        if (el) {
            const angle = getRotation(partId);
            el.style.transform = `rotate(${angle}deg)`;
        }
    });

  }, [object.articulation, object.content]);
  

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: object.content }}
    />
  );
};
