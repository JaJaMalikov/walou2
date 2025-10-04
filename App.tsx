import React, { useState, useEffect, useRef } from 'react';
import { SidePanel } from './components/SidePanel';
import { Dock } from './components/Dock';
import { Canvas } from './components/Canvas';
import { ResizeHandle } from './components/ResizeHandle';
import { useResizable } from './components/icons/useResizable';
import { AssetPanel } from './components/AssetPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { ContextMenu } from './components/ContextMenu';
import type { CanvasRef, SvgObject, AssetCategory, TimelineState, SvgOverrides } from './types';
import { addKeyframesFromUpdate, clampFrame, findAdjacentKeyframe } from './components/timelineUtils';
import { RowsIcon } from './components/icons';
import { Timeline, makeEmptyTimeline } from './components/Timeline';

const UI_LAYOUT_STORAGE_KEY = 'uiLayoutState';

interface UiLayout {
  leftPanelWidth: number;
  rightPanelWidth: number;
  dockHeight: number;
}

const loadUILayout = (): UiLayout => {
  try {
    const saved = localStorage.getItem(UI_LAYOUT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.leftPanelWidth && parsed.rightPanelWidth && parsed.dockHeight) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Échec du chargement de la disposition UI depuis localStorage", error);
  }
  return {
    leftPanelWidth: 200,
    rightPanelWidth: 200,
    dockHeight: 150,
  };
};


const App: React.FC = () => {
  const [initialLayout] = useState(loadUILayout);
  const canvasRef = useRef<CanvasRef>(null);
  const isInitialMount = useRef(true);
  const saveObjectsTimerRef = useRef<number | null>(null);

  const [svgObjects, setSvgObjects] = useState<SvgObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<SvgObject | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{ x: number, y: number, targetId: string | null }>({ x: 0, y: 0, targetId: null });
  const [timeline, setTimeline] = useState<TimelineState>(makeEmptyTimeline());
  const [timelineOverrides, setTimelineOverrides] = useState<SvgOverrides>({});

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('canvasState');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        setSvgObjects(savedState.svgObjects || []);
      }
      const savedTimeline = localStorage.getItem('timelineState');
      if (savedTimeline) {
        const parsed = JSON.parse(savedTimeline);
        if (parsed && parsed.tracks) {
          setTimeline({ ...makeEmptyTimeline(), ...parsed, isPlaying: false });
        }
      }
    } catch (err) {
      console.error("Échec du chargement de l'état du canvas depuis localStorage", err);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    if (saveObjectsTimerRef.current) {
      window.clearTimeout(saveObjectsTimerRef.current);
    }
    saveObjectsTimerRef.current = window.setTimeout(() => {
      try {
        const stateToSave = {
          svgObjects,
        };
        localStorage.setItem('canvasState', JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Échec de l'enregistrement de l'état du canvas dans localStorage", err);
      }
    }, 300);
  }, [svgObjects]);

  // Persist timeline (except volatile play state)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const { isPlaying, ...rest } = timeline;
        localStorage.setItem('timelineState', JSON.stringify(rest));
      } catch (e) {
        console.error("Échec de l'enregistrement de la timeline", e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [timeline]);

  useEffect(() => {
    return () => {
      if (saveObjectsTimerRef.current) {
        window.clearTimeout(saveObjectsTimerRef.current);
      }
    };
  }, []);


  const handleObjectContextMenu = (e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    setContextMenuState({ x: e.clientX, y: e.clientY, targetId: objectId });
  };

  const handleCloseContextMenu = () => {
    setContextMenuState({ x: 0, y: 0, targetId: null });
  };

  const handleAttachObject = (childId: string, parentId: string, limbId: string) => {
    canvasRef.current?.calculateAndSetAttachment(childId, parentId, limbId);
    handleCloseContextMenu();
  };

  const handleDetachObject = (childId: string) => {
    canvasRef.current?.calculateAndDetachObject(childId);
  };

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);

  const [leftPanelWidth, leftResizeHandleProps] = useResizable({
    initialSize: initialLayout.leftPanelWidth,
    minSize: 200,
    maxSize: 500,
    axis: 'x',
    direction: 'right',
  });
  
  const [rightPanelWidth, rightResizeHandleProps] = useResizable({
    initialSize: initialLayout.rightPanelWidth,
    minSize: 200,
    maxSize: 500,
    axis: 'x',
    direction: 'left',
  });

  const [dockHeight, dockResizeHandleProps] = useResizable({
    initialSize: initialLayout.dockHeight,
    minSize: 80,
    maxSize: 400,
    axis: 'y',
    direction: 'up',
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const layout: UiLayout = {
          leftPanelWidth,
          rightPanelWidth,
          dockHeight,
        };
        localStorage.setItem(UI_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
        canvasRef.current?.fitView();
      } catch (error) {
        console.error("Échec de l'enregistrement de la disposition UI dans localStorage", error);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [leftPanelWidth, rightPanelWidth, dockHeight]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).nodeName === 'INPUT' || (e.target as HTMLElement).nodeName === 'TEXTAREA') {
        return;
      }
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault();
            handleToggleLeftPanel();
            break;
          case 'p':
            e.preventDefault();
            handleToggleRightPanel();
            break;
          case 't':
            e.preventDefault();
            handleToggleDock();
            break;
          case 'f':
            e.preventDefault();
            canvasRef.current?.fitView();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const onAddObject = (newObject: SvgObject) => {
    setSvgObjects(prev => [...prev, newObject]);
  };

  const handleAddObject = (svgContent: string, category: AssetCategory) => {
    canvasRef.current?.spawnAndAddObject(svgContent, category);
  };
  
  const handleSetBackground = (imageUrl: string) => {
    canvasRef.current?.setBackground(imageUrl);
  };
  const handleAddSpotlight = () => {
    canvasRef.current?.addSpotlight();
  };
  
  const handleUpdateObject = (id: string, newProps: Partial<SvgObject>) => {
    // Auto-keyframe capture before state mutation
    if (timeline.autoKeyframe && !timeline.isPlaying) {
      const prevObj = svgObjects.find(o => o.id === id);
      if (prevObj) {
        setTimeline(t => addKeyframesFromUpdate(t, prevObj, newProps));
      }
    }

    setSvgObjects(prevObjects => prevObjects.map(obj => (obj.id === id ? { ...obj, ...newProps } : obj)));
    
    const currentObject = selectedObject?.id === id ? selectedObject : null;
    if (currentObject) {
        let finalProps = newProps;
        if (newProps.articulation && currentObject.articulation) {
            finalProps = {
                ...newProps,
                articulation: {
                    ...currentObject.articulation,
                    ...newProps.articulation,
                },
            };
        }
        setSelectedObject(prev => (prev && prev.id === id) ? { ...prev, ...finalProps } : prev);
    }
  };

  const handleDeleteObject = (id: string) => {
    setSvgObjects(prev => prev.filter(obj => obj.id !== id));
  };

  const handleResetCanvas = () => {
    setSvgObjects([]);
    setTimeline(makeEmptyTimeline());
    setTimelineOverrides({});
  };

  const scheduleFitView = () => {
    requestAnimationFrame(() => canvasRef.current?.fitView());
  };

  const handleToggleLeftPanel = () => {
    setLeftPanelOpen(p => !p);
    scheduleFitView();
  };

  const handleToggleRightPanel = () => {
    setRightPanelOpen(p => !p);
    scheduleFitView();
  };

  const handleToggleDock = () => {
    setDockOpen(p => !p);
    scheduleFitView();
  };

  // Timeline keyboard shortcuts: Space play/pause, arrows step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.nodeName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        setTimeline(t => ({ ...t, isPlaying: !t.isPlaying }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setTimeline(t => ({ ...t, currentFrame: clampFrame(t.currentFrame + step, 0, t.duration) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setTimeline(t => ({ ...t, currentFrame: clampFrame(t.currentFrame - step, 0, t.duration) }));
      } else if (e.ctrlKey && e.key.toLowerCase() === 'arrowright') {
        e.preventDefault();
        setTimeline(t => {
          const f = findAdjacentKeyframe(t.tracks, t.currentFrame, 'next');
          return f == null ? t : { ...t, currentFrame: f };
        });
      } else if (e.ctrlKey && e.key.toLowerCase() === 'arrowleft') {
        e.preventDefault();
        setTimeline(t => {
          const f = findAdjacentKeyframe(t.tracks, t.currentFrame, 'prev');
          return f == null ? t : { ...t, currentFrame: f };
        });
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="app-container">
      <main className="main-content">
        <SidePanel side="left" isOpen={leftPanelOpen} width={leftPanelWidth}>
          <AssetPanel 
            onAddObject={handleAddObject} 
            onSetBackground={handleSetBackground} 
            canAddObjects={() => !!canvasRef.current?.hasBackground()} 
          />
        </SidePanel>

        <ResizeHandle isVisible={leftPanelOpen} {...leftResizeHandleProps} />

        <div className="canvas-wrapper">
          <Canvas 
            ref={canvasRef}
            svgObjects={svgObjects}
            overrides={timelineOverrides}
            disableInteractions={timeline.isPlaying}
            leftPanelOpen={leftPanelOpen}
            rightPanelOpen={rightPanelOpen}
            dockOpen={dockOpen}
            onToggleLeftPanel={handleToggleLeftPanel}
            onToggleRightPanel={handleToggleRightPanel}
            onToggleDock={handleToggleDock}
            onObjectSelect={setSelectedObject}
            onObjectContextMenu={handleObjectContextMenu}
            onAddObject={onAddObject}
            onUpdateObject={handleUpdateObject}
            onDeleteObject={handleDeleteObject}
            onResetCanvas={handleResetCanvas}
          />
        </div>

        <ResizeHandle isVisible={rightPanelOpen} {...rightResizeHandleProps} />
        
        <SidePanel side="right" isOpen={rightPanelOpen} width={rightPanelWidth}>
           <InspectorPanel 
            selectedObject={selectedObject} 
            svgObjects={svgObjects}
            onUpdateObject={handleUpdateObject} 
            onDetachObject={handleDetachObject}
            compact={rightPanelWidth <= 220}
          />
        </SidePanel>
      </main>

      <ResizeHandle isVisible={dockOpen} orientation="horizontal" {...dockResizeHandleProps} />
      
      <Dock height={dockOpen ? dockHeight : 0}>
        <div className="dock-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          <div style={{ flex: 1, minHeight: 0 }}>
            <Timeline
              svgObjects={svgObjects}
              selectedObject={selectedObject}
              value={timeline}
              onChange={setTimeline}
              onComputedOverrides={setTimelineOverrides}
            />
          </div>
        </div>
      </Dock>

      {contextMenuState.targetId && (
        <>
          <div className="context-menu-backdrop" onClick={handleCloseContextMenu} onContextMenu={handleCloseContextMenu} />
          <ContextMenu
            x={contextMenuState.x}
            y={contextMenuState.y}
            targetId={contextMenuState.targetId}
            svgObjects={svgObjects}
            onAttach={handleAttachObject}
            onDetach={handleDetachObject}
            onClose={handleCloseContextMenu}
            onUpdateObject={handleUpdateObject}
            onDelete={handleDeleteObject}
          />
        </>
      )}
    </div>
  );
};

export default App;
