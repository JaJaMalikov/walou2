import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Rnd } from 'react-rnd';
import { UploadCloudIcon, TrashIcon } from './icons';
import { FloatingMenu } from './FloatingMenu';
import type { CanvasRef, SvgObject, AssetCategory } from '../types';
import { Pantin } from './Pantin';
import { processSvg, getSvgDimensions } from './utils';

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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isObjectInteracting, setIsObjectInteracting] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'rotate'>('select');
  
  const transformWrapperRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
      } else {
        setTransformState({ scale: 1, positionX: 0, positionY: 0 });
      }
    } catch (err) {
      console.error("Failed to load canvas state from localStorage", err);
      setError("Could not load saved state.");
      setTransformState({ scale: 1, positionX: 0, positionY: 0 });
    }
  }, []);

  useEffect(() => {
    if (transformState === null) return;
    try {
      const stateToSave: CanvasLocalState = {
        backgroundImageUrl,
        canvasDimensions,
        transformState,
        menuState,
      };
      localStorage.setItem('canvasLocalState', JSON.stringify(stateToSave));
    } catch (err) {
      console.error("Failed to save canvas state to localStorage", err);
    }
  }, [backgroundImageUrl, canvasDimensions, transformState, menuState]);

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
    setTransform(newPositionX, newPositionY, newScale);
  }, [canvasDimensions]);

  const spawnAndAddObject = useCallback((svgContent: string, category: AssetCategory) => {
    const viewportEl = containerRef.current;
    if (!viewportEl || !transformState) return;
    
    const viewRect = viewportEl.getBoundingClientRect();
    const dimensions = getSvgDimensions(svgContent);

    const centerX = (viewRect.width / 2 - transformState.positionX) / transformState.scale;
    const centerY = (viewRect.height / 2 - transformState.positionY) / transformState.scale;

    const newSvg: SvgObject = {
      id: `svg-${Date.now()}`,
      content: processSvg(svgContent),
      x: centerX - dimensions.width / 2,
      y: centerY - dimensions.height / 2,
      ...dimensions,
      category,
      flipped: false,
    };
    onAddObject(newSvg);
  }, [transformState, onAddObject]);

  const setBackground = useCallback((imageUrl: string) => {
    setError(null);
    const img = new Image();
    img.onload = () => {
      setBackgroundImageUrl(imageUrl);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setTimeout(fitView, 100);
    };
    img.onerror = () => {
      setError("Failed to load the background image.");
    };
    img.src = imageUrl;
  }, [fitView]);

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
  }));

  const handleFileDrop = useCallback((file: File) => {
    setError(null);
    if (file.type.startsWith('image/png')) {
        const fileUrl = URL.createObjectURL(file);
        setBackground(fileUrl);
    } else if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        spawnAndAddObject(text, 'objets');
      };
      reader.readAsText(file);
    } else {
      setError('Invalid file type. Please drop a PNG or SVG file.');
    }
  }, [spawnAndAddObject, setBackground]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileDrop(file);
      e.currentTarget.value = '';
    }
  }, [handleFileDrop]);

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


  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFileDrop]);
  
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
  
  if (!transformState) return <div className="canvas-container" />;

  return (
    <div ref={containerRef} className="canvas-container" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
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
        panning={{ disabled: isObjectInteracting }}
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
                className={`canvas-area ${!hasContent ? 'empty' : ''} ${isDragging ? 'dragging' : ''}`}
                style={canvasDimensions ? { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none' } : { width: '100%', height: '100%' }}
              >
                {svgObjects.filter(obj => !obj.attachmentInfo).map(obj => (
                  <Rnd
                    key={obj.id}
                    scale={transformState.scale}
                    size={{ width: obj.width, height: obj.height }}
                    position={{ x: obj.x, y: obj.y }}
                    disableDragging={interactionMode === 'rotate'}
                    enableResizing={interactionMode !== 'rotate'}
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
      {isDragging && (
        <div className="drop-overlay" aria-hidden="true">
          <UploadCloudIcon />
          <p>Drop your PNG or SVG file</p>
        </div>
      )}
    </div>
  );
});
