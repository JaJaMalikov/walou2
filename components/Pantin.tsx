import React, { useRef, useEffect } from 'react';
import type { SvgObject } from '../types';

interface PantinProps {
  object: SvgObject;
}

const ARTICULABLE_PARTS = [
    'tete', 'haut_bras_droite', 'avant_bras_droite', 'main_droite',
    'haut_bras_gauche', 'avant_bras_gauche', 'main_gauche',
    'cuisse_droite', 'tibia_droite', 'pied_droite',
    'cuisse_gauche', 'tibia_gauche', 'pied_gauche',
];

export const Pantin: React.FC<PantinProps> = ({ object }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const findPivotCoords = (el: SVGElement | null): string | null => {
      if (!el || !el.parentNode) return null;
      const parent = el.parentNode as Element;
      const pivotCircle = parent.querySelector("circle.pivot") as SVGCircleElement | null;
      if (!pivotCircle) return null;

      const cx = parseFloat(pivotCircle.getAttribute("cx") || "");
      const cy = parseFloat(pivotCircle.getAttribute("cy") || "");
      if (isNaN(cx) || isNaN(cy)) return null;

      return `${cx}px ${cy}px`;
  };

  // Effect for initial setup: find pivots and set transform origins
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
  }, [object.content]); // Re-run if the SVG content itself changes

  // Effect for applying rotations when articulation props change
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !object.articulation) return;

    Object.entries(object.articulation).forEach(([partId, angle]) => {
      const el = container.querySelector(`#${partId}`) as SVGElement | null;
      if (el) {
        el.style.transform = `rotate(${angle}deg)`;
      }
    });

  }, [object.articulation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
      dangerouslySetInnerHTML={{ __html: object.content }}
    />
  );
};
