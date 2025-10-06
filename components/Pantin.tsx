import React, { useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { SvgObject } from '../types';

interface PantinProps {
  object: SvgObject;
  svgObjects: SvgObject[]; // All objects on the scene
  attachmentRefs: React.MutableRefObject<{[key: string]: SVGGElement | null}>;
  rotateMode?: boolean;
  onArticulationChange?: (partName: string, angle: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onAttachedObjectContextMenu?: (e: React.MouseEvent, objectId: string) => void;
}

interface SvgNode {
    type: string;
    props: { [key: string]: any };
    children: SvgNode[];
}

// Extract pivot from a `data-pivot="x, y"` attribute, either on the element
// itself or on one of its descendants. No legacy fallback.
const findPivotCoords = (el: Element | null): string | null => {
    if (!el) return null;

    // 1) Preferred: data-pivot on the element itself
    const selfPivot = el.getAttribute('data-pivot');
    if (selfPivot) {
        const match = selfPivot.match(/(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/);
        if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            if (!Number.isNaN(x) && !Number.isNaN(y)) return `${x}px ${y}px`;
        }
    }

    // 2) data-pivot on a descendant (e.g. path inside a group)
    const descendantWithPivot = el.querySelector('[data-pivot]') as Element | null;
    if (descendantWithPivot) {
        const pivotAttr = descendantWithPivot.getAttribute('data-pivot');
        if (pivotAttr) {
            const match = pivotAttr.match(/(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/);
            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                if (!Number.isNaN(x) && !Number.isNaN(y)) return `${x}px ${y}px`;
            }
        }
    }

    // 3) Legacy: <circle class="pivot"> immediate child
    const pivotCircle = el.querySelector(":scope > circle.pivot") as SVGCircleElement | null;
    if (pivotCircle) {
        const cx = parseFloat(pivotCircle.getAttribute("cx") || "");
        const cy = parseFloat(pivotCircle.getAttribute("cy") || "");
        if (!isNaN(cx) && !isNaN(cy)) return `${cx}px ${cy}px`;
    }

    return null;
};

const getSvgContentOnly = (svgString: string): string => {
    const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match ? match[1] : svgString;
};

const SvgPart: React.FC<{ 
    node: SvgNode; 
    articulation: { [key: string]: number }; 
    pivots: { [key: string]: string };
    attachedChildren: { [limbId: string]: SvgObject[] };
    attachmentRefs: React.MutableRefObject<{[key: string]: SVGGElement | null}>;
    onAttachmentContextMenu?: (e: React.MouseEvent, objectId: string) => void;
}> = ({ node, articulation, pivots, attachedChildren, attachmentRefs, onAttachmentContextMenu }) => {
    const { type, props, children } = node;
    const style: React.CSSProperties = { ...props.style };

    const partId = props.id;
    const isInteractive = (props['data-interactive'] === 'true');
    if (partId && isInteractive) {
        const pivot = pivots[partId];
        if (pivot) {
            style.transformOrigin = pivot;
            (style as any).transformBox = "view-box";
        }
        
        const angle = articulation[partId] || 0;
        style.transform = `rotate(${angle}deg)`;
    }

    const childrenToRender = children.map((child, index) => 
        <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} attachedChildren={attachedChildren} attachmentRefs={attachmentRefs} onAttachmentContextMenu={onAttachmentContextMenu} />
    );

    const attachments = partId ? attachedChildren[partId] : undefined;
    if (attachments) {
        attachments.forEach(att => {
            if (!att.attachmentInfo) return;
            childrenToRender.push(
                <g 
                    key={att.id} 
                    transform={att.attachmentInfo.transform}
                    ref={el => { attachmentRefs.current[att.id] = el; }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onAttachmentContextMenu && onAttachmentContextMenu(e, att.id); }}
                >
                    <g dangerouslySetInnerHTML={{ __html: getSvgContentOnly(att.content) }} />
                </g>
            );
        });
    }

    return React.createElement(
        type,
        { ...props, style },
        ...childrenToRender
    );
};

const PantinComponent: React.ForwardRefRenderFunction<SVGSVGElement, PantinProps> = 
  ({ object, svgObjects, attachmentRefs, rotateMode = false, onArticulationChange, onInteractionStart, onInteractionEnd, onAttachedObjectContextMenu }, ref) => {

    const svgInternalRef = useRef<SVGSVGElement>(null);
    useImperativeHandle(ref, () => svgInternalRef.current as SVGSVGElement, []);

    const attachedChildren = useMemo(() => {
        const children: { [limbId: string]: SvgObject[] } = {};
        svgObjects.forEach(obj => {
            if (obj.attachmentInfo?.parentId === object.id && !obj.hidden) {
                const limbId = obj.attachmentInfo.limbId;
                if (!children[limbId]) {
                    children[limbId] = [];
                }
                children[limbId].push(obj);
            }
        });
        return children;
    }, [svgObjects, object.id]);

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
                } else if (attr.name.startsWith('data-')) {
                    // Preserve real data-* attributes as-is for downstream logic
                    props[attr.name] = attr.value;
                } else if (attr.name.includes('-')) {
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
        // Only parts explicitly marked interactive, keyed by their ids
        const interactiveNodes = svgElement.querySelectorAll('[data-interactive="true"]');
        interactiveNodes.forEach((n) => {
            const el = n as Element;
            const id = el.getAttribute('id');
            if (!id) return;
            const pivot = findPivotCoords(el);
            if (pivot) pivots[id] = pivot;
        });

        const rootNode = parseNode(svgElement);

        return { root: rootNode, pivots };
    }, [object.content]);

    useEffect(() => {
        const svg = svgInternalRef.current;
        if (!svg) return;

        const sendToBack = (el: Element | null) => {
            if (el && el.parentNode) {
                el.parentNode.insertBefore(el, el.parentNode.firstChild);
            }
        };

        // Generic reordering: any element marked as behind its parent
        const behindNodes = svg.querySelectorAll('[data-isbehindparent]');
        behindNodes.forEach((node) => sendToBack(node));
    }, [parsedSvg, object.flipped]);

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
        const svg = svgInternalRef.current;
        while (el && el !== svg) {
            const id = el.id;
            if (id && (el.getAttribute('data-interactive') === 'true')) return id;
            el = el.parentElement;
        }
        return null;
    };

    const clientToSvgPoint = (clientX: number, clientY: number) => {
        const svg = svgInternalRef.current!;
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
        const svg = svgInternalRef.current;
        if (!svg) return null;
        const partNode = svg.querySelector(`#${partId}`) as Element | null;
        if (!partNode) return null;

        // Only data-pivot (on self or descendant)
        const pivotSource = ((): Element | null => {
            if (partNode.getAttribute('data-pivot')) return partNode;
            const d = partNode.querySelector('[data-pivot]');
            if (d) return d as Element;
            return null;
        })();
        if (!pivotSource) return null;

        const pivotAttr = pivotSource.getAttribute('data-pivot');
        if (!pivotAttr) return null;
        const match = pivotAttr.match(/(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/);
        if (!match) return null;
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (Number.isNaN(x) || Number.isNaN(y)) return null;
        // data-pivot is in the SVG/viewBox coordinate space already
        return { x, y };
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!rotatingRef.current) return;
        const activePart = activePartRef.current;
        if (!activePart) return;
        const pivot = findPivotForPart(activePart);
        if (!pivot) return;
        const { x, y } = clientToSvgPoint(e.clientX, e.clientY);
        const ang = Math.atan2(y - pivot.y, x - pivot.x) * 180 / Math.PI;
        const newAngle = ang + baseAngleRef.current;
        let final = ((newAngle + 180) % 360 + 360) % 360 - 180;
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

    const attachHandlers = useCallback(() => {
        const svg = svgInternalRef.current;
        if (!svg) return;
        const onPointerDown = (e: PointerEvent) => {
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
            const widthAttr = root.props && (root.props.width as string | number | undefined);
            if (typeof widthAttr === 'string') w = parseFloat(widthAttr);
            if (typeof widthAttr === 'number') w = widthAttr;
        }
        if (w && !Number.isNaN(w)) {
            flipTransform = `translate(${w},0) scale(-1,1)`;
        } else {
            flipTransform = `scale(-1,1)`;
        }
    }

    return (
        <svg ref={svgInternalRef} {...root.props} style={{ overflow: 'visible' }} className="pantin-container">
            {flipTransform ? (
                <g transform={flipTransform}>
                    {root.children.map((child, index) => (
                        <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} attachedChildren={attachedChildren} attachmentRefs={attachmentRefs} onAttachmentContextMenu={onAttachedObjectContextMenu} />
                    ))}
                </g>
             ) : (
                <>
                    {root.children.map((child, index) => (
                        <SvgPart key={index} node={child} articulation={articulation} pivots={pivots} attachedChildren={attachedChildren} attachmentRefs={attachmentRefs} onAttachmentContextMenu={onAttachedObjectContextMenu} />
                    ))}
                </>
             )}
        </svg>
    );
};

export const Pantin = forwardRef(PantinComponent);
