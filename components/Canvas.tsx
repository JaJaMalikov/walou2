import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { Rnd } from 'react-rnd';
import { ZoomInIcon, ZoomOutIcon, ExpandIcon, UploadCloudIcon, TrashIcon, FitToScreenIcon } from './icons';
import { FloatingMenu } from './FloatingMenu';
import type { CanvasRef } from '../types';

interface SvgObject {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

const Controls = ({ fitView }: { fitView: () => void }) => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
            <button onClick={() => zoomIn()} className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors" aria-label="Zoom In"><ZoomInIcon/></button>
            <button onClick={() => zoomOut()} className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors" aria-label="Zoom Out"><ZoomOutIcon/></button>
            <button onClick={() => resetTransform()} className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors" aria-label="Reset Transform"><ExpandIcon/></button>
            <button onClick={fitView} className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors" aria-label="Fit to Screen"><FitToScreenIcon /></button>
        </div>
    );
};

export const Canvas = forwardRef<CanvasRef, {}>((props, ref) => {
  const [svgObjects, setSvgObjects] = useState<SvgObject[]>([]);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number, height: number} | null>(null);
  const [transformState, setTransformState] = useState<CanvasState['transformState'] | null>(null);
  const [menuState, setMenuState] = useState<MenuState>({ x: 50, y: 80, width: 220, height: 52 });
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
        setMenuState(savedState.menuState || { x: 50, y: 80, width: 220, height: 52 });
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
  }, [selectedObjectId]);

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
  
  useImperativeHandle(ref, () => ({
    addObject: (svgContent: string) => {
      const wrapperComponent = transformWrapperRef.current?.instance.wrapperComponent;
      if (!wrapperComponent || !transformState) return;
      
      const viewRect = wrapperComponent.getBoundingClientRect();
      const dimensions = getSvgDimensions(svgContent);

      // Calculate center of the viewport in canvas coordinates
      const centerX = (viewRect.width / 2 - transformState.positionX) / transformState.scale;
      const centerY = (viewRect.height / 2 - transformState.positionY) / transformState.scale;

      const newSvg: SvgObject = {
        id: `svg-${Date.now()}`,
        content: processSvg(svgContent),
        x: centerX - dimensions.width / 2,
        y: centerY - dimensions.height / 2,
        ...dimensions,
      };
      setSvgObjects(prev => [...prev, newSvg]);
    }
  }));

  const handleFileDrop = useCallback((file: File) => {
    setError(null);
    if (file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          if (!backgroundImageUrl) {
            setBackgroundImageUrl(dataUrl);
            setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          } else {
            setError("Please reset the canvas to add a new background.");
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const dimensions = getSvgDimensions(text);
        const newSvg: SvgObject = {
          id: `svg-${Date.now()}`,
          content: processSvg(text),
          x: (canvasDimensions?.width || 800) / 2 - dimensions.width / 2,
          y: (canvasDimensions?.height || 600) / 2 - dimensions.height / 2,
          ...dimensions,
        };
        setSvgObjects(prev => [...prev, newSvg]);
      };
      reader.readAsText(file);
    } else {
      setError('Invalid file type. Please drop a PNG or SVG file.');
    }
  }, [processSvg, backgroundImageUrl, canvasDimensions]);

  const handleDragStop = (id: string, d: { x: number; y: number }) => {
    setSvgObjects(prev => prev.map(obj => obj.id === id ? { ...obj, x: d.x, y: d.y } : obj));
  };

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
    setTransformState({ scale: 1, positionX: 0, positionY: 0 });
  };

  const handleMenuChange = (updates: Partial<MenuState>) => {
    setMenuState(prev => ({ ...prev, ...updates }));
  };

  const hasContent = svgObjects.length > 0 || backgroundImageUrl;
  
  if (!transformState) return <div className="flex-1 bg-gray-900 relative w-full h-full" />;

  return (
    <div className="flex-1 bg-gray-900 relative w-full h-full" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
       <FloatingMenu 
        menuState={menuState}
        onMenuChange={handleMenuChange}
        selectedObjectId={selectedObjectId} 
        onDelete={deleteSelectedObject} 
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
        {({ setTransform }) => (
          <>
            <Controls fitView={() => {
              const wrapperComponent = transformWrapperRef.current?.instance.wrapperComponent;
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
            }} />
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                {hasContent && (
                     <button onClick={resetCanvas} className="p-2 bg-red-800/50 backdrop-blur-sm rounded-md hover:bg-red-700/70 transition-colors" aria-label="Reset Canvas">
                        <TrashIcon />
                    </button>
                )}
            </div>
            <TransformComponent wrapperClass="!w-full !h-full">
              <div
                id="canvas-area"
                onMouseDown={() => setSelectedObjectId(null)}
                className={`relative bg-cover bg-center transition-all duration-300 ${!hasContent ? `border-2 border-dashed rounded-lg ${isDragging ? 'border-blue-400 bg-blue-900/50' : 'border-gray-600'}` : 'shadow-2xl bg-gray-900/50'}`}
                style={canvasDimensions ? { width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none' } : {}}
              >
                {!canvasDimensions && <div className="w-[60vw] h-[60vh]"></div>}
                
                {svgObjects.map(obj => (
                  <Rnd
                    key={obj.id}
                    scale={transformState.scale}
                    size={{ width: obj.width, height: obj.height }}
                    position={{ x: obj.x, y: obj.y }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedObjectId(obj.id);
                    }}
                    onDragStart={() => setIsObjectInteracting(true)}
                    onDragStop={(_, d) => {
                      setIsObjectInteracting(false);
                      handleDragStop(obj.id, d);
                    }}
                    onResizeStart={() => setIsObjectInteracting(true)}
                    onResizeStop={(_, __, ref, ___, position) => {
                      setIsObjectInteracting(false);
                      setSvgObjects(prev =>
                        prev.map(o =>
                          o.id === obj.id
                            ? {
                                ...o,
                                width: parseInt(ref.style.width, 10),
                                height: parseInt(ref.style.height, 10),
                                ...position,
                              }
                            : o
                        )
                      );
                    }}
                    bounds="parent"
                    className={`box-border border-2 ${selectedObjectId === obj.id ? 'border-blue-500' : 'border-transparent hover:border-blue-500/50'}`}
                  >
                    <div
                      className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: obj.content }}
                    />
                  </Rnd>
                ))}

                {!hasContent && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <h3 className="text-xl font-semibold text-gray-300">Drop PNG background or SVG file</h3>
                        <p className="text-gray-500 mt-2">The first PNG will set the canvas size</p>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                     </div>
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      {isDragging && (
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none transition-opacity duration-300" aria-hidden="true">
          <UploadCloudIcon className="w-20 h-20 text-blue-400 animate-pulse mb-4" />
          <p className="text-2xl font-bold tracking-wide text-gray-100">Drop your PNG or SVG file</p>
        </div>
      )}
    </div>
  );
});