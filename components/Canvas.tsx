import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Rnd } from 'react-rnd';
import { TrashIcon } from './icons';
import { FloatingMenu } from './FloatingMenu';
import { EffectsPanel } from './EffectsPanel';
import type { CanvasRef, SvgObject, AssetCategory } from '../types';
import { Pantin } from './Pantin';
import { processSvg, getSvgDimensions, generateSpotlightSvg } from './utils';

interface MenuState {
  x: number;
  y: number;
  width: number | string;
  height: number | string;
}

interface CanvasLocalState {
  backgroundImageUrl: string | null;
  canvasDimensions: { width: number; height: number } | null;
  transformState: {
    scale: number;
    positionX: number;
    positionY: number;
  };
  menuState?: MenuState;
  effectsOpen?: boolean;
  effectsPanelState?: MenuState;
}

interface CanvasProps {
  svgObjects: SvgObject[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  dockOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleDock: () => void;
  onObjectSelect: (object: SvgObject | null) => void;
  onObjectContextMenu: (e: React.MouseEvent, objectId: string) => void;
  onAddObject: (newObject: SvgObject) => void;
  onUpdateObject: (id: string, newProps: Partial<SvgObject>) => void;
  onDeleteObject: (id: string) => void;
  onResetCanvas: () => void;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(({ 
  svgObjects,
  leftPanelOpen, rightPanelOpen, dockOpen,
  onToggleLeftPanel, onToggleRightPanel, onToggleDock, 
  onObjectSelect,
  onObjectContextMenu,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onResetCanvas
}, ref) => {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number, height: number} | null>(null);
  const [transformState, setTransformState] = useState<CanvasLocalState['transformState'] | null>(null);
  const [menuState, setMenuState] = useState<MenuState>({ x: 50, y: 80, width: 420, height: 52 });
  const [effectsOpen, setEffectsOpen] = useState<boolean>(false);
  const [effectsPanelState, setEffectsPanelState] = useState<{x:number;y:number;width:number|string;height:number|string}>({ x: 60, y: 150, width: 360, height: 280 });
  const [error, setError] = useState<string | null>(null);
  const [isObjectInteracting, setIsObjectInteracting] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'rotate'>('select');
  const saveTimerRef = useRef<number | null>(null);
  const fitTimerRef = useRef<number | null>(null);
  
  const transformWrapperRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformStateRef = useRef<typeof transformState>(null);
  const pantinRefs = useRef<{[key: string]: SVGSVGElement | null}>({});
  const objectWrapperRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const attachmentRefs = useRef<{[key: string]: SVGGElement | null}>({});

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('canvasLocalState');
      if (savedStateJSON) {
        const savedState: CanvasLocalState = JSON.parse(savedStateJSON);
        setBackgroundImageUrl(savedState.backgroundImageUrl || null);
        setCanvasDimensions(savedState.canvasDimensions || null);
        setTransformState(savedState.transformState || { scale: 1, positionX: 0, positionY: 0 });
        setMenuState(savedState.menuState || { x: 50, y: 80, width: 420, height: 52 });
        if (typeof savedState.effectsOpen === 'boolean') setEffectsOpen(savedState.effectsOpen);
        if (savedState.effectsPanelState) setEffectsPanelState(savedState.effectsPanelState as any);
      } else {
        setTransformState({ scale: 1, positionX: 0, positionY: 0 });
      }
    } catch (err) {
      console.error("Échec du chargement de l'état du canvas depuis localStorage", err);
      setError("Impossible de charger l'état enregistré.");
      setTransformState({ scale: 1, positionX: 0, positionY: 0 });
    }
  }, []);

  useEffect(() => {
    if (transformState === null) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const stateToSave: CanvasLocalState = {
          backgroundImageUrl,
          canvasDimensions,
          transformState,
          menuState,
          effectsOpen,
          effectsPanelState: effectsPanelState as any,
        };
        localStorage.setItem('canvasLocalState', JSON.stringify(stateToSave));
      } catch (err) {
      console.error("Échec de l'enregistrement de l'état du canvas dans localStorage", err);
      }
    }, 300);
  }, [backgroundImageUrl, canvasDimensions, transformState, menuState, effectsOpen, effectsPanelState]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 3000);
    return () => window.clearTimeout(t);
  }, [error]);

  const deleteSelectedObject = useCallback(() => {
    if (!selectedObjectId) return;
    onDeleteObject(selectedObjectId);
    setSelectedObjectId(null);
    onObjectSelect(null);
  }, [selectedObjectId, onObjectSelect, onDeleteObject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if((e.target as HTMLElement).nodeName !== 'INPUT' && (e.target as HTMLElement).nodeName !== 'TEXTAREA') {
            deleteSelectedObject();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteSelectedObject]);
  
  const fitView = useCallback(() => {
    const transformWrapper = transformWrapperRef.current;
    const container = containerRef.current;
    if (!transformWrapper || !canvasDimensions || !container) return;
    const { setTransform } = transformWrapper;
    const viewRect = container.getBoundingClientRect();
    const contentWidth = canvasDimensions.width;
    const contentHeight = canvasDimensions.height;
    if (contentWidth <= 0 || contentHeight <= 0) return;
    const scaleX = viewRect.width / contentWidth;
    const scaleY = viewRect.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY);
    const newPositionX = (viewRect.width - contentWidth * newScale) / 2;
    const newPositionY = (viewRect.height - contentHeight * newScale) / 2;
    // Apply instantly (no animation)
    setTransform(newPositionX, newPositionY, newScale, 0 as any);
  }, [canvasDimensions]);

  const spawnAndAddObject = useCallback((svgContent: string, category: AssetCategory) => {
    // Prevent adding objects if no background is defined
    if (!backgroundImageUrl || !canvasDimensions) {
      console.warn('Background not set. Cannot add objects yet.');
      setError(prev => prev ?? 'Définissez un décor avant d’ajouter des objets.');
      return;
    }

    const viewportEl = containerRef.current;
    if (!viewportEl || !transformState) return;
    
    const viewRect = viewportEl.getBoundingClientRect();
    const dimensions = getSvgDimensions(svgContent);

    const centerX = (viewRect.width / 2 - transformState.positionX) / transformState.scale;
    const centerY = (viewRect.height / 2 - transformState.positionY) / transformState.scale;

    const maxZ = Math.max(0, ...svgObjects.map(o => (o.zIndex ?? 0)));
    const newSvg: SvgObject = {
      id: `svg-${Date.now()}`,
      content: processSvg(svgContent),
      x: centerX - dimensions.width / 2,
      y: centerY - dimensions.height / 2,
      ...dimensions,
      category,
      zIndex: maxZ + 1,
      flipped: false,
    };
    onAddObject(newSvg);
  }, [transformState, onAddObject, backgroundImageUrl, canvasDimensions, svgObjects]);

  const addSpotlight = useCallback(() => {
    if (!backgroundImageUrl || !canvasDimensions) {
      setError(prev => prev ?? 'Définissez un décor avant d’ajouter des spots.');
      return;
    }
    const viewportEl = containerRef.current;
    if (!viewportEl || !transformState) return;
    const viewRect = viewportEl.getBoundingClientRect();
    const centerX = (viewRect.width / 2 - transformState.positionX) / transformState.scale;
    const centerY = (viewRect.height / 2 - transformState.positionY) / transformState.scale;

    const w = Math.round((canvasDimensions.width || 1000) * 0.25);
    const h = Math.round((canvasDimensions.height || 800) * 0.2);
    const spotlight = { color: '#ffffff', intensity: 80, softness: 60, shape: 'ellipse' as const, coneAngle: 45, offsetX: 0, offsetY: 0, range: 100 };
    const svg = generateSpotlightSvg(w, h, spotlight);

    const newObj: SvgObject = {
      id: `spot-${Date.now()}`,
      name: 'Spot',
      content: processSvg(svg),
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: w,
      height: h,
      category: 'objets',
      rotation: 0,
      zIndex: Math.max(0, ...svgObjects.map(o => o.zIndex ?? 0)) + 5,
      spotlight,
    };
    onAddObject(newObj);
  }, [backgroundImageUrl, canvasDimensions, containerRef, transformState, onAddObject, svgObjects]);

  const setBackground = useCallback((imageUrl: string) => {
    setError(null);
    const img = new Image();
    img.onload = () => {
      setBackgroundImageUrl(imageUrl);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setError("Échec du chargement de l'image de décor.");
    };
    img.src = imageUrl;
  }, [fitView]);

  // After background and dimensions are ready, fit the view deterministically
  useLayoutEffect(() => {
    if (backgroundImageUrl && canvasDimensions) {
      fitView();
    }
  }, [backgroundImageUrl, canvasDimensions, fitView]);

  // Observe container resize and trigger fitView when background is set
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scheduleFit = () => {
      if (!backgroundImageUrl || !canvasDimensions) return;
      if (fitTimerRef.current) window.clearTimeout(fitTimerRef.current);
      fitTimerRef.current = window.setTimeout(() => {
        fitView();
      }, 100);
    };

    const observer = new ResizeObserver(() => {
      scheduleFit();
    });
    observer.observe(el);

    const onWindowResize = () => scheduleFit();
    window.addEventListener('resize', onWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onWindowResize);
      if (fitTimerRef.current) window.clearTimeout(fitTimerRef.current);
    };
  }, [backgroundImageUrl, canvasDimensions, fitView]);

  const calculateAndSetAttachment = (childId: string, parentId: string, limbId: string) => {
    const childWrapperElement = objectWrapperRefs.current[childId];
    const parentPantinSvg = pantinRefs.current[parentId];

    if (!childWrapperElement || !parentPantinSvg) {
        console.error("Could not find elements for attachment calculation");
        return;
    }

    const childSvgElement = childWrapperElement.querySelector('svg');
    if (!childSvgElement) {
        console.error(`Could not find SVG inside child object wrapper #${childId}`);
        return;
    }

    const limbElement = parentPantinSvg.querySelector(`#${limbId}`);
    if (!limbElement) {
        console.error(`Could not find limb #${limbId} in parent`);
        return;
    }

    const childMatrix = childSvgElement.getScreenCTM();
    const limbMatrix = (limbElement as SVGGraphicsElement).getScreenCTM();

    if (!childMatrix || !limbMatrix) {
        console.error("Could not get CTM for elements");
        return;
    }

    const relativeMatrix = limbMatrix.inverse().multiply(childMatrix);
    const { a, b, c, d, e, f } = relativeMatrix;
    const transformString = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;

    onUpdateObject(childId, { 
        attachmentInfo: { parentId, limbId, transform: transformString },
        x: 0, // Reset position as it's now relative
        y: 0,
    });
  };

  const calculateAndDetachObject = (childId: string) => {
    const attachedElement = attachmentRefs.current[childId];
    const childObject = svgObjects.find(o => o.id === childId);

    if (!attachedElement || !childObject || !transformState) {
        console.error("Could not find elements for detachment calculation");
        return;
    }

    const container = containerRef.current;
    if (!container) {
        console.error("Could not find canvas container for detachment calculation");
        return;
    }

    // Use the element's on-screen bounding box to preserve visual position
    const rect = (attachedElement as Element).getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Convert from screen pixels to canvas-space coordinates using the visual center
    // Then place the standalone wrapper so its center matches, reducing rounding drift
    const centerScreenX = rect.left + rect.width / 2;
    const centerScreenY = rect.top + rect.height / 2;
    const centerCanvasX = (centerScreenX - containerRect.left - transformState.positionX) / transformState.scale;
    const centerCanvasY = (centerScreenY - containerRect.top - transformState.positionY) / transformState.scale;

    // Translate from center to top-left of the standalone object's wrapper
    const newX = Math.round(centerCanvasX - childObject.width / 2);
    const newY = Math.round(centerCanvasY - childObject.height / 2);

    // Extract current rotation angle from the element's CTM so we preserve orientation
    let newRotation: number | undefined = undefined;
    const worldMatrix = (attachedElement as SVGGraphicsElement).getScreenCTM?.();
    if (worldMatrix) {
        const angleRad = Math.atan2(worldMatrix.b, worldMatrix.a);
        let angleDeg = angleRad * 180 / Math.PI;
        // Normalize to [-180, 180)
        angleDeg = ((angleDeg + 180) % 360 + 360) % 360 - 180;
        newRotation = Math.round(angleDeg);
    }

    onUpdateObject(childId, {
        attachmentInfo: undefined,
        x: newX,
        y: newY,
        rotation: newRotation,
    });
  };

  useImperativeHandle(ref, () => ({
    spawnAndAddObject: spawnAndAddObject,
    setBackground: setBackground,
    fitView: fitView,
    calculateAndSetAttachment: calculateAndSetAttachment,
    calculateAndDetachObject: calculateAndDetachObject,
    hasBackground: () => !!backgroundImageUrl,
    addSpotlight: addSpotlight,
  }));

  

  

  const handleDragStop = (id: string, d: { x: number; y: number }) => {
    setIsObjectInteracting(false);
    onUpdateObject(id, { x: d.x, y: d.y });
  };
  
  useEffect(() => {
    if (selectedObjectId) {
        const selected = svgObjects.find(obj => obj.id === selectedObjectId);
        onObjectSelect(selected || null);
    } else {
        onObjectSelect(null);
    }
  }, [svgObjects, selectedObjectId, onObjectSelect]);


  
  
  const handleReset = () => {
    onResetCanvas();
    setBackgroundImageUrl(null);
    setCanvasDimensions(null);
    setError(null);
    setSelectedObjectId(null);
    onObjectSelect(null);
    if (transformWrapperRef.current) {
        transformWrapperRef.current.resetTransform();
    }
  };

  const handleMenuChange = (updates: Partial<MenuState>) => {
    setMenuState(prev => ({ ...prev, ...updates }));
  };
  
  const handleSelectObject = (obj: SvgObject) => {
    setSelectedObjectId(obj.id);
    onObjectSelect(obj);
  };
  
  const handleDeselect = () => {
    setSelectedObjectId(null);
    onObjectSelect(null);
  }

  const hasContent = svgObjects.length > 0 || backgroundImageUrl;

  // Keep a ref of the latest transform state for smooth interactions
  useEffect(() => { transformStateRef.current = transformState; }, [transformState]);

  // Custom wheel handling: Ctrl+wheel zooms, plain wheel pans (with RAF smoothing)
  useEffect(() => {
    const el = containerRef.current;
    const wrapper = transformWrapperRef.current;
    if (!el || !wrapper) return;

    let rafId: number | null = null;
    let accPanX = 0;
    let accPanY = 0;
    let accZoomLog = 0; // accumulate in log space
    let zoomCx = 0;
    let zoomCy = 0;

    const ZOOM_SENSITIVITY = 0.0010; // lower = less sensitive
    const PAN_SENSITIVITY = 0.7; // lower = less sensitive

    const applyFrame = () => {
      rafId = null;
      const ts = transformStateRef.current;
      if (!ts) return;
      let { positionX, positionY, scale } = ts;

      if (accZoomLog !== 0) {
        const rect = el.getBoundingClientRect();
        const px = zoomCx - rect.left;
        const py = zoomCy - rect.top;
        const worldX = (px - positionX) / scale;
        const worldY = (py - positionY) / scale;
        const factor = Math.exp(accZoomLog);
        const targetScale = Math.max(0.05, Math.min(10, scale * factor));
        positionX = px - worldX * targetScale;
        positionY = py - worldY * targetScale;
        scale = targetScale;
        accZoomLog = 0;
      }

      if (accPanX !== 0 || accPanY !== 0) {
        positionX -= accPanX;
        positionY -= accPanY;
        accPanX = 0;
        accPanY = 0;
      }

      // Apply instantly (no animation)
      wrapper.setTransform(positionX, positionY, scale, 0 as any);
    };

    const schedule = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(applyFrame);
    };

    const onWheel = (e: WheelEvent) => {
      if (isObjectInteracting) return; // Don't interfere during object manipulation
      // Ignore wheel when interacting with floating overlays (panels/menus)
      const targetEl = e.target as Element | null;
      if (targetEl && (targetEl.closest('.effects-panel') || targetEl.closest('.floating-menu-rnd') || targetEl.closest('.context-menu'))) {
        return; // let the overlay scroll naturally
      }
      // Only act within the canvas; prevent page scroll
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey) {
        // Accumulate zoom in log space for smoothness
        accZoomLog += e.deltaY * -ZOOM_SENSITIVITY;
        zoomCx = e.clientX;
        zoomCy = e.clientY;
      } else {
        // Two-finger scroll pans the scene (accumulate deltas)
        accPanX += e.deltaX * PAN_SENSITIVITY;
        accPanY += e.deltaY * PAN_SENSITIVITY;
      }
      schedule();
    };

    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel as EventListener, true);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [isObjectInteracting, transformState]);

  if (!transformState) return <div className="canvas-container" />;

  return (
    <div ref={containerRef} className="canvas-container" style={{ overscrollBehavior: 'contain' }}>
      <FloatingMenu 
        menuState={menuState}
        onMenuChange={handleMenuChange}
        selectedObjectId={selectedObjectId} 
        onDelete={deleteSelectedObject}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        dockOpen={dockOpen}
        onToggleLeftPanel={onToggleLeftPanel}
        onToggleRightPanel={onToggleRightPanel}
        onToggleDock={onToggleDock}
        onFitView={fitView}
        onZoomIn={() => transformWrapperRef.current?.zoomIn()}
        onZoomOut={() => transformWrapperRef.current?.zoomOut()}
        zoomPercent={Math.round(transformState.scale * 100)}
        interactionMode={interactionMode}
        onChangeInteractionMode={setInteractionMode}
        onAddSpotlight={addSpotlight}
        onToggleEffects={() => setEffectsOpen(v => !v)}
      />
      <EffectsPanel
        open={effectsOpen}
        panelState={effectsPanelState}
        onPanelChange={u => setEffectsPanelState(p => ({ ...p, ...u }))}
        svgObjects={svgObjects}
        onUpdateObject={onUpdateObject}
        onDeleteObject={onDeleteObject}
        onAddSpotlight={addSpotlight}
        onClose={() => setEffectsOpen(false)}
      />
      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={transformState.scale}
        initialPositionX={transformState.positionX}
        initialPositionY={transformState.positionY}
        onTransformed={(_, state) => setTransformState(state)}
        minScale={0.1}
        limitToBounds={false}
        centerOnInit={true}
        doubleClick={{ disabled: true }}
        centerZoomedOut={false}
        wheel={{ disabled: true }}
        panning={{ disabled: true }}
      >
        <>
            <div className="reset-button-container">
                {hasContent && (
                     <button onClick={handleReset} className="reset-button" aria-label="Reset Canvas">
                        <TrashIcon />
                    </button>
                )}
            </div>
            <TransformComponent>
              <div
                id="canvas-area"
                onMouseDown={handleDeselect}
                className={`canvas-area ${!hasContent ? 'empty' : ''}`}
                style={canvasDimensions ? { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none' } : { width: '100%', height: '100%' }}
              >
                {svgObjects
                  .filter(obj => !obj.attachmentInfo && !obj.hidden)
                  .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                  .map(obj => (
                  <Rnd
                    key={obj.id}
                    scale={transformState.scale}
                    size={{ width: obj.width, height: obj.height }}
                    position={{ x: obj.x, y: obj.y }}
                    disableDragging={interactionMode === 'rotate' || !!obj.locked}
                    enableResizing={interactionMode !== 'rotate' && !obj.locked}
                    style={{ zIndex: obj.zIndex ?? 0 }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelectObject(obj);
                    }}
                    onContextMenu={(e) => onObjectContextMenu(e, obj.id)}
                    onDragStart={() => setIsObjectInteracting(true)}
                    onDragStop={(_, d) => handleDragStop(obj.id, d)}
                    onResizeStart={() => setIsObjectInteracting(true)}
                    onResizeStop={(_, __, ref, ___, position) => {
                      setIsObjectInteracting(false);
                      onUpdateObject(obj.id, {
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        ...position,
                      });
                    }}
                    bounds="parent"
                    className={`resizable-object ${selectedObjectId === obj.id ? 'selected' : ''}`}
                  >
                   <div 
                      id={obj.id} 
                      style={{ width: '100%', height: '100%' }} 
                      ref={el => { objectWrapperRefs.current[obj.id] = el; }}
                    >
                    {obj.category === 'pantins' ? (
                        <Pantin 
                          object={obj} 
                          svgObjects={svgObjects}
                          attachmentRefs={attachmentRefs}
                          rotateMode={interactionMode === 'rotate'}
                          onInteractionStart={() => setIsObjectInteracting(true)}
                          onInteractionEnd={() => setIsObjectInteracting(false)}
                          onArticulationChange={(partName, angle) => {
                            const currentArticulation = obj.articulation || {};
                            onUpdateObject(obj.id, { 
                                articulation: { ...currentArticulation, [partName]: angle } 
                            });
                          }}
                          onAttachedObjectContextMenu={(e, id) => onObjectContextMenu(e as any, id)}
                          ref={el => { pantinRefs.current[obj.id] = el; }}
                        />
                      ) : (
                        <div
                          className="pantin-container"
                          style={obj.rotation !== undefined ? { width: '100%', height: '100%', transform: `rotate(${obj.rotation}deg)`, transformOrigin: 'center center' } : { width: '100%', height: '100%' }}
                          dangerouslySetInnerHTML={{ __html: obj.content.replace(/<svg[^>]*>/, '$& style="width: 100%; height: 100%;"') }}
                        />
                      )}
                    </div>
                  </Rnd>
                ))}
              </div>
            </TransformComponent>
          </>
      </TransformWrapper>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="error-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            background: 'rgba(220, 53, 69, 0.95)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 1000,
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Close error"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
});
