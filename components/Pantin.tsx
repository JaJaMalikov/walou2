import React, { useRef, useEffect, useMemo, useState } from 'react';
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

const ARTICULABLE_PARTS = [
    'tete', 'haut_bras_droite', 'avant_bras_droite', 'main_droite',
    'haut_bras_gauche', 'avant_bras_gauche', 'main_gauche',
    'cuisse_droite', 'tibia_droite', 'pied_droite',
    'cuisse_gauche', 'tibia_gauche', 'pied_gauche',
];

interface SvgNode {
    type: string;
    props: { [key: string]: any };
    children: SvgNode[];
}

const findPivotCoords = (el: Element | null): string | null => {
    if (!el) return null;
    const pivotCircle = el.querySelector(":scope > circle.pivot") as SVGCircleElement | null;
    if (!pivotCircle) return null;

    const cx = parseFloat(pivotCircle.getAttribute("cx") || "");
    const cy = parseFloat(pivotCircle.getAttribute("cy") || "");
    if (isNaN(cx) || isNaN(cy)) return null;

    return `${cx}px ${cy}px`;
};

// Recursive component to render SVG nodes
const SvgPart: React.FC<{ node: SvgNode; articulation: { [key: string]: number }, pivots: { [key: string]: string } }> = ({ node, articulation, pivots }) => {
    const { type, props, children } = node;
    const style: React.CSSProperties = { ...props.style };

    const partId = props.id;
    if (partId && ARTICULABLE_PARTS.includes(partId)) {
        const pivot = pivots[partId];
        if (pivot) {
            style.transformOrigin = pivot;
            (style as any).transformBox = "view-box";
        }
        
        const angle = articulation[partId] || 0;
        style.transform = `rotate(${angle}deg)`;
    }

    return React.createElement(
        type,
        { ...props, style },
        children.map((child, index) => <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} />)
    );
};

export const Pantin: React.FC<PantinProps> = ({ object }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    const parsedSvg = useMemo(() => {
        if (!object.content) return null;
        const parser = new DOMParser();
        const doc = parser.parseFromString(object.content, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');
        if (!svgElement) return null;

        const parseNode = (node: Element): SvgNode => {
            const props: { [key: string]: any } = {};
            for (const attr of Array.from(node.attributes)) {
                if (attr.name === 'class') {
                    props.className = attr.value;
                } else if (attr.name.includes('-')) {
                    // Convert kebab-case to camelCase for React style props, e.g., fill-rule -> fillRule
                    const camelCaseName = attr.name.replace(/-([a-z])/g, g => g[1].toUpperCase());
                    props[camelCaseName] = attr.value;
                } else {
                    props[attr.name] = attr.value;
                }
            }

            const children = Array.from(node.children).map(parseNode);
            return { type: node.tagName.toLowerCase(), props, children };
        };
        
        const pivots: { [key: string]: string } = {};
        ARTICULABLE_PARTS.forEach(partId => {
            const el = svgElement.querySelector(`#${partId}`);
            if (el) {
                const pivot = findPivotCoords(el.parentElement);
                if (pivot) {
                    pivots[partId] = pivot;
                }
            }
        });

        const rootNode = parseNode(svgElement);

        return { root: rootNode, pivots };
    }, [object.content]);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const sendToBack = (el: Element | null) => {
            if (el && el.parentNode) {
                el.parentNode.insertBefore(el, el.parentNode.firstChild);
            }
        };

        // Z-order adjustments on mount
        ["poignet_droite", "poignet_gauche", "hanche_droite", "hanche_gauche"].forEach((id) => {
            const node = svg.querySelector(`#${id}`);
            if (node) sendToBack(node);
        });
    }, [parsedSvg]); // Rerun only when the SVG content changes

    if (!parsedSvg) {
        return <div className="pantin-error"><p>Error parsing SVG</p></div>;
    }
    
    const { root, pivots } = parsedSvg;
    const articulation = object.articulation || {};

    return (
        <svg ref={svgRef} {...root.props} className="pantin-container">
            {root.children.map((child, index) => (
                <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} />
            ))}
        </svg>
    );
};