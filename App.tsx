import React, { useState, useEffect, useRef } from 'react';
import { SidePanel } from './components/SidePanel';
import { Dock } from './components/Dock';
import { Canvas } from './components/Canvas';
import { ResizeHandle } from './components/ResizeHandle';
import { useResizable } from './components/icons/useResizable';
import { AssetPanel } from './components/AssetPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { ContextMenu } from './components/ContextMenu';
import type { CanvasRef, SvgObject, AssetCategory } from './types';
import { findAdjacentKeyframe } from './components/timelineUtils';
import { Timeline } from './components/Timeline';
import { useTimelineStore } from './stores/timelineStore';
import { useEditorStore } from './stores/editorStore';

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
  const svgObjects = useEditorStore(s => s.svgObjects);
  const [contextMenuState, setContextMenuState] = useState<{ x: number, y: number, targetId: string | null }>({ x: 0, y: 0, targetId: null });

  // State persistence handled by zustand stores (editor + timeline)


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

  // Object add/update/delete handled via stores or Canvas ref

  const handleAddObject = (svgContent: string, category: AssetCategory) => {
    canvasRef.current?.spawnAndAddObject(svgContent, category);
  };
  
  const handleSetBackground = (imageUrl: string) => {
    canvasRef.current?.setBackground(imageUrl);
  };
  const handleAddSpotlight = () => {
    canvasRef.current?.addSpotlight();
  };
  
  // Legacy object handlers removed (stores are used directly)

  const handleResetCanvas = () => {
    useTimelineStore.getState().clear();
    useEditorStore.getState().reset();
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
        const t = useTimelineStore.getState();
        if (t.isPlaying) t.pause(); else t.play();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const t = useTimelineStore.getState();
        t.scrubTo(t.currentFrame + step);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const t = useTimelineStore.getState();
        t.scrubTo(t.currentFrame - step);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'arrowright') {
        e.preventDefault();
        const t = useTimelineStore.getState();
        const f = findAdjacentKeyframe(t.tracks, t.currentFrame, 'next');
        if (f != null) t.scrubTo(f);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'arrowleft') {
        e.preventDefault();
        const t = useTimelineStore.getState();
        const f = findAdjacentKeyframe(t.tracks, t.currentFrame, 'prev');
        if (f != null) t.scrubTo(f);
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
            leftPanelOpen={leftPanelOpen}
            rightPanelOpen={rightPanelOpen}
            dockOpen={dockOpen}
            onToggleLeftPanel={handleToggleLeftPanel}
            onToggleRightPanel={handleToggleRightPanel}
            onToggleDock={handleToggleDock}
            onObjectContextMenu={handleObjectContextMenu}
          />
        </div>

        <ResizeHandle isVisible={rightPanelOpen} {...rightResizeHandleProps} />
        
        <SidePanel side="right" isOpen={rightPanelOpen} width={rightPanelWidth}>
           <InspectorPanel onDetachObject={handleDetachObject} compact={rightPanelWidth <= 220} />
        </SidePanel>
      </main>

      <ResizeHandle isVisible={dockOpen} orientation="horizontal" {...dockResizeHandleProps} />
      
      <Dock height={dockOpen ? dockHeight : 0}>
        <div className="dock-timeline-area">
          <Timeline />
        </div>
      </Dock>

      {contextMenuState.targetId && (
        <>
          <div className="context-menu-backdrop" onClick={handleCloseContextMenu} onContextMenu={handleCloseContextMenu} />
          <ContextMenu
            x={contextMenuState.x}
            y={contextMenuState.y}
            targetId={contextMenuState.targetId}
            onAttach={handleAttachObject}
            onDetach={handleDetachObject}
            onClose={handleCloseContextMenu}
          />
        </>
      )}
    </div>
  );
};

export default App;
