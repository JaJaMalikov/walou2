import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Rnd } from 'react-rnd';
import { UploadCloudIcon, TrashIcon } from './icons';
import { FloatingMenu } from './FloatingMenu';
import type { CanvasRef, SvgObject, AssetCategory } from '../types';
import { Pantin } from './Pantin';

interface MenuState {
  x: number;
  y: number;
  width: number | string;
  height: number | string;
}

interface CanvasState {
  svgObjects: SvgObject[];
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
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  dockOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleDock: () => void;
  onObjectSelect: (object: SvgObject | null) => void;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(({ 
  leftPanelOpen, rightPanelOpen, dockOpen,
  onToggleLeftPanel, onToggleRightPanel, onToggleDock, 
  onObjectSelect
}, ref) => {
  const [svgObjects, setSvgObjects] = useState<SvgObject[]>([]);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number, height: number} | null>(null);
  const [transformState, setTransformState] = useState<CanvasState['transformState'] | null>(null);
  const [menuState, setMenuState] = useState<MenuState>({ x: 50, y: 80, width: 420, height: 52 });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isObjectInteracting, setIsObjectInteracting] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  
  const transformWrapperRef = useRef<any>(null);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('canvasState');
      if (savedStateJSON) {
        const savedState: CanvasState = JSON.parse(savedStateJSON);
        setSvgObjects(savedState.svgObjects || []);
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
      const stateToSave: CanvasState = {
        svgObjects,
        backgroundImageUrl,
        canvasDimensions,
        transformState,
        menuState,
      };
      localStorage.setItem('canvasState', JSON.stringify(stateToSave));
    } catch (err) {
      console.error("Failed to save canvas state to localStorage", err);
      setError("Could not save progress.");
    }
  }, [svgObjects, backgroundImageUrl, canvasDimensions, transformState, menuState]);

  const deleteSelectedObject = useCallback(() => {
    if (!selectedObjectId) return;
    setSvgObjects(prev => prev.filter(obj => obj.id !== selectedObjectId));
    setSelectedObjectId(null);
    onObjectSelect(null);
  }, [selectedObjectId, onObjectSelect]);

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

  const processSvg = useCallback((svgString: string): string => {
    return svgString.replace(/<svg[^>]*>/, match => 
      match.replace(/ width="[^"]*"/, '').replace(/ height="[^"]*"/, '')
    );
  }, []);

  const getSvgDimensions = (svgString: string): { width: number; height: number } => {
    const viewBoxMatch = svgString.match(/viewBox="([^"]*)"/);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(' ');
      if (parts.length === 4) return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
    }
    const widthMatch = svgString.match(/width="([^"]*)"/);
    const heightMatch = svgString.match(/height="([^"]*)"/);
    if (widthMatch && heightMatch && !widthMatch[1].includes('%') && !heightMatch[1].includes('%')) {
      return { width: parseFloat(widthMatch[1]), height: parseFloat(heightMatch[1]) };
    }
    return { width: 200, height: 200 }; // Fallback
  };
  
  const fitView = useCallback(() => {
    const transformWrapper = transformWrapperRef.current;
    if (!transformWrapper) return;

    const { setTransform } = transformWrapper;
    const wrapperComponent = transformWrapper.instance.wrapperComponent;
    if (!wrapperComponent) return;

    const viewRect = wrapperComponent.getBoundingClientRect();
    
    let contentBounds = {
      minX: Infinity, minY: Infinity,
      maxX: -Infinity, maxY: -Infinity,
    };

    if (canvasDimensions) {
      contentBounds = { minX: 0, minY: 0, maxX: canvasDimensions.width, maxY: canvasDimensions.height };
    } else if (svgObjects.length > 0) {
        svgObjects.forEach(obj => {
          contentBounds.minX = Math.min(contentBounds.minX, obj.x);
          contentBounds.minY = Math.min(contentBounds.minY, obj.y);
          contentBounds.maxX = Math.max(contentBounds.maxX, obj.x + obj.width);
          contentBounds.maxY = Math.max(contentBounds.maxY, obj.y + obj.height);
      });
    } else {
      return; // No content to fit
    }
    
    const contentWidth = contentBounds.maxX - contentBounds.minX;
    const contentHeight = contentBounds.maxY - contentBounds.minY;
    
    if (contentWidth <= 0 || contentHeight <= 0) return;
    
    const marginFactor = 0.9;
    
    const scaleX = viewRect.width / contentWidth;
    const scaleY = viewRect.height / contentHeight;
    const newScale = Math.min(scaleX, scaleY) * marginFactor;

    const newPositionX = (viewRect.width - (contentWidth * newScale)) / 2 - (contentBounds.minX * newScale);
    const newPositionY = (viewRect.height - (contentHeight * newScale)) / 2 - (contentBounds.minY * newScale);

    setTransform(newPositionX, newPositionY, newScale, 300, 'easeOut');
  }, [canvasDimensions, svgObjects]);

  const addObject = useCallback((svgContent: string, category: AssetCategory) => {
    const wrapperComponent = transformWrapperRef.current?.instance.wrapperComponent;
    if (!wrapperComponent || !transformState) return;
    
    const viewRect = wrapperComponent.getBoundingClientRect();
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
      ...(category === 'pantins' && { articulation: {} }),
    };
    setSvgObjects(prev => [...prev, newSvg]);
  }, [processSvg, transformState]);

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

  useImperativeHandle(ref, () => ({
    addObject: addObject,
    setBackground: setBackground,
    fitView: fitView,
    updateObject: (id: string, newProps: Partial<SvgObject>) => {
      setSvgObjects(prev =>
        prev.map(obj =>
          obj.id === id ? { ...obj, ...newProps } : obj
        )
      );
    },
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
        addObject(text, 'objets'); // Default to 'objets' for dropped SVGs
      };
      reader.readAsText(file);
    } else {
      setError('Invalid file type. Please drop a PNG or SVG file.');
    }
  }, [addObject, setBackground]);

  const handleDragStop = (id: string, d: { x: number; y: number }) => {
    setIsObjectInteracting(false);
    setSvgObjects(prev =>
        prev.map(obj => (obj.id === id ? { ...obj, x: d.x, y: d.y } : obj))
    );
  };
  
  // This effect safely synchronizes the selected object state with the parent component.
  useEffect(() => {
    if (selectedObjectId) {
        const selected = svgObjects.find(obj => obj.id === selectedObjectId);
        onObjectSelect(selected || null);
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
  
  const resetCanvas = () => {
    setSvgObjects([]);
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
    <div className="canvas-container" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
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
      />
      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={transformState.scale}
        initialPositionX={transformState.positionX}
        initialPositionY={transformState.positionY}
        onTransformed={(_, state) => setTransformState(state)}
        minScale={0.1}
        limitToBounds={!!canvasDimensions}
        doubleClick={{ disabled: true }}
        centerZoomedOut={true}
        panning={{ disabled: isObjectInteracting }}
      >
        <>
            <div className="reset-button-container">
                {hasContent && (
                     <button onClick={resetCanvas} className="reset-button" aria-label="Reset Canvas">
                        <TrashIcon />
                    </button>
                )}
            </div>
            <TransformComponent wrapperClass="!w-full !h-full">
              <div
                id="canvas-area"
                onMouseDown={handleDeselect}
                className={`canvas-area ${!hasContent ? 'empty' : ''} ${isDragging ? 'dragging' : ''}`}
                style={canvasDimensions ? { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none' } : {}}
              >
                {!canvasDimensions && <div style={{width: '60vw', height: '60vh'}}></div>}
                
                {svgObjects.map(obj => (
                  <Rnd
                    key={obj.id}
                    scale={transformState.scale}
                    size={{ width: obj.width, height: obj.height }}
                    position={{ x: obj.x, y: obj.y }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelectObject(obj);
                    }}
                    onDragStart={() => setIsObjectInteracting(true)}
                    onDragStop={(_, d) => handleDragStop(obj.id, d)}
                    onResizeStart={() => setIsObjectInteracting(true)}
                    onResizeStop={(_, __, ref, ___, position) => {
                      setIsObjectInteracting(false);
                      setSvgObjects(prev => prev.map(o => {
                          if (o.id === obj.id) {
                            return {
                              ...o,
                              width: parseInt(ref.style.width, 10),
                              height: parseInt(ref.style.height, 10),
                              ...position,
                            };
                          }
                          return o;
                        }));
                    }}
                    bounds="parent"
                    className={`resizable-object ${selectedObjectId === obj.id ? 'selected' : ''}`}
                  >
                   {obj.category === 'pantins' ? (
                      <Pantin object={obj} />
                    ) : (
                       <div
                        className="pantin-container"
                        dangerouslySetInnerHTML={{ __html: obj.content.replace(/<svg[^>]*>/, '$& style="width: 100%; height: 100%;"') }}
                      />
                    )}
                  </Rnd>
                ))}

                {!hasContent && (
                     <div className="canvas-placeholder">
                        <h3>Drop PNG background or SVG file</h3>
                        <p>The first PNG will set the canvas size</p>
                        {error && <p className="error">{error}</p>}
                     </div>
                )}
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