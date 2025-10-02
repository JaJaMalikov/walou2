import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import type { SvgObject } from '../types';

interface PantinProps {
  object: SvgObject;
  rotateMode?: boolean;
  onArticulationChange?: (partName: string, angle: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

// Defines the parent-child relationships for rotation calculation
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

export const Pantin: React.FC<PantinProps> = ({ object, rotateMode = false, onArticulationChange, onInteractionStart, onInteractionEnd }) => {
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
    }, [parsedSvg, object.flipped]); // Re-apply when SVG content or flip state changes

    // DnD rotation handlers
    const activePartRef = useRef<string | null>(null);
    const baseAngleRef = useRef<number>(0);
    const rotatingRef = useRef<boolean>(false);

    const MIRROR_MAP: { [key: string]: string } = {
        'haut_bras_droite': 'haut_bras_gauche', 'haut_bras_gauche': 'haut_bras_droite',
        'avant_bras_droite': 'avant_bras_gauche', 'avant_bras_gauche': 'avant_bras_droite',
        'main_droite': 'main_gauche', 'main_gauche': 'main_droite',
        'cuisse_droite': 'cuisse_gauche', 'cuisse_gauche': 'cuisse_droite',
        'tibia_droite': 'tibia_gauche', 'tibia_gauche': 'tibia_droite',
        'pied_droite': 'pied_gauche', 'pied_gauche': 'pied_droite',
    };

    const getPartFromEvent = (target: Element | null): string | null => {
        let el: Element | null = target;
        while (el && el !== svgRef.current) {
            const id = (el as Element).id;
            if (id && ARTICULABLE_PARTS.includes(id)) return id;
            el = el.parentElement;
        }
        return null;
    };

    const clientToSvgPoint = (clientX: number, clientY: number) => {
        const svg = svgRef.current!;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const inv = ctm.inverse();
        const p = pt.matrixTransform(inv);
        return { x: p.x, y: p.y };
    };

    const findPivotForPart = (partId: string): { x: number; y: number } | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const partNode = svg.querySelector(`#${partId}`);
        const pivotCircle = partNode?.parentElement?.querySelector('circle.pivot') as SVGCircleElement | null;
        if (!pivotCircle) return null;
        const cx = parseFloat(pivotCircle.getAttribute('cx') || '');
        const cy = parseFloat(pivotCircle.getAttribute('cy') || '');
        if (isNaN(cx) || isNaN(cy)) return null;
        const pt = svg.createSVGPoint();
        pt.x = cx;
        pt.y = cy;
        const m = pivotCircle.getCTM();
        if (!m) return { x: cx, y: cy };
        const p = pt.matrixTransform(m);
        return { x: p.x, y: p.y };
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!rotatingRef.current || !svgRef.current) return;
        const activePart = activePartRef.current;
        if (!activePart) return;
        const pivot = findPivotForPart(activePart);
        if (!pivot) return;
        const { x, y } = clientToSvgPoint(e.clientX, e.clientY);
        const ang = Math.atan2(y - pivot.y, x - pivot.x) * 180 / Math.PI;
        const newAngle = ang + baseAngleRef.current;
        // normalize to [-180,180]
        let final = ((newAngle + 180) % 360 + 360) % 360 - 180;
        // handle flip + mirror mapping for storage
        const isFlipped = !!object.flipped;
        const controlledPart = (isFlipped && MIRROR_MAP[activePart]) ? MIRROR_MAP[activePart] : activePart;
        if (isFlipped) final = -final;
        if (onArticulationChange) onArticulationChange(controlledPart, final);
    }, [object, onArticulationChange]);

    const stopRotation = useCallback(() => {
        if (!rotatingRef.current) return;
        rotatingRef.current = false;
        activePartRef.current = null;
        if (onInteractionEnd) onInteractionEnd();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopRotation);
        window.removeEventListener('pointercancel', stopRotation);
    }, [handlePointerMove, onInteractionEnd]);

    // Actual event handler attaching with rotateMode awareness
    const attachHandlers = useCallback(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const onPointerDown = (e: PointerEvent) => {
            // Only left button
            if (e.button !== 0) return;
            if (!rotateMode) return;
            const target = e.target as Element | null;
            const part = getPartFromEvent(target);
            if (!part) return;
            e.preventDefault();

            const pivot = findPivotForPart(part);
            if (!pivot) return;

            const { x, y } = clientToSvgPoint(e.clientX, e.clientY);
            const startAng = Math.atan2(y - pivot.y, x - pivot.x) * 180 / Math.PI;
            // current stored angle for controlled part
            const isFlipped = !!object.flipped;
            const ctrl = (isFlipped && MIRROR_MAP[part]) ? MIRROR_MAP[part] : part;
            let current = (object.articulation && object.articulation[ctrl]) || 0;
            if (isFlipped) current = -current;

            rotatingRef.current = true;
            activePartRef.current = part;
            baseAngleRef.current = current - startAng;

            if (onInteractionStart) onInteractionStart();

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', stopRotation);
            window.addEventListener('pointercancel', stopRotation);
        };
        svg.addEventListener('pointerdown', onPointerDown);
        return () => {
            svg.removeEventListener('pointerdown', onPointerDown);
        };
    }, [handlePointerMove, stopRotation, object, rotateMode, onInteractionStart]);

    useEffect(() => {
        return attachHandlers();
    }, [attachHandlers]);

    if (!parsedSvg) {
        return <div className="pantin-error"><p>Error parsing SVG</p></div>;
    }
    
    const { root, pivots } = parsedSvg;
    const articulation = object.articulation || {};

    // compute flip transform inside SVG to keep pointer math consistent
    let flipTransform: string | undefined;
    if (object.flipped) {
        const vb = (root.props && root.props.viewBox) ? String(root.props.viewBox) : undefined;
        let w: number | undefined;
        if (vb) {
            const parts = vb.trim().split(/\s+/);
            if (parts.length === 4) {
                w = parseFloat(parts[2]);
            }
        }
        if (!w) {
            // fallback: try width attribute
            const widthAttr = root.props && (root.props.width as string | number | undefined);
            if (typeof widthAttr === 'string') w = parseFloat(widthAttr);
            if (typeof widthAttr === 'number') w = widthAttr;
        }
        if (w && !Number.isNaN(w)) {
            flipTransform = `translate(${w},0) scale(-1,1)`;
        } else {
            // best-effort flip around origin
            flipTransform = `scale(-1,1)`;
        }
    }

    return (
        <svg ref={svgRef} {...root.props} style={{ overflow: 'visible' }} className="pantin-container">
            {flipTransform ? (
                <g transform={flipTransform}>
                    {root.children.map((child, index) => (
                        <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} />
                    ))}
                </g>
             ) : (
                <>
                    {root.children.map((child, index) => (
                        <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} />
                    ))}
                </>
             )}
        </svg>
    );
};
