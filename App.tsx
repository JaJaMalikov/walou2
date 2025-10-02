import React, { useState, useEffect, useRef } from 'react';
import { SidePanel } from './components/SidePanel';
import { Dock } from './components/Dock';
import { Canvas } from './components/Canvas';
import { ResizeHandle } from './components/ResizeHandle';
import { useResizable } from './hooks/useResizable';
import { AssetPanel } from './components/AssetPanel';
import { InspectorPanel } from './components/InspectorPanel';
import type { CanvasRef, SvgObject, AssetCategory } from './types';
import { RowsIcon } from './components/icons';

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
    console.error("Failed to load UI layout from localStorage", error);
  }
  return {
    leftPanelWidth: 280,
    rightPanelWidth: 280,
    dockHeight: 150,
  };
};


const App: React.FC = () => {
  const [initialLayout] = useState(loadUILayout);
  const canvasRef = useRef<CanvasRef>(null);
  
  const [selectedObject, setSelectedObject] = useState<SvgObject | null>(null);

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
      } catch (error) {
        console.error("Failed to save UI layout to localStorage", error);
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
            setLeftPanelOpen(prev => !prev);
            break;
          case 'p':
            e.preventDefault();
            setRightPanelOpen(prev => !prev);
            break;
          case 't':
            e.preventDefault();
            setDockOpen(prev => !prev);
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

  const handleAddObject = (svgContent: string, category: AssetCategory) => {
    canvasRef.current?.addObject(svgContent, category);
  };
  
  const handleSetBackground = (imageUrl: string) => {
    canvasRef.current?.setBackground(imageUrl);
  };
  
  const handleUpdateObject = (id: string, newProps: Partial<SvgObject>) => {
    const currentObject = selectedObject?.id === id ? selectedObject : null;
    let finalProps = newProps;

    // Deep merge articulation properties
    if (newProps.articulation && currentObject?.articulation) {
        finalProps = {
            ...newProps,
            articulation: {
                ...currentObject.articulation,
                ...newProps.articulation,
            },
        };
    }
    
    canvasRef.current?.updateObject(id, finalProps);
    setSelectedObject(prev => (prev && prev.id === id) ? { ...prev, ...finalProps } : prev);
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <SidePanel side="left" isOpen={leftPanelOpen} width={leftPanelWidth}>
          <AssetPanel onAddObject={handleAddObject} onSetBackground={handleSetBackground} />
        </SidePanel>

        <ResizeHandle isVisible={leftPanelOpen} {...leftResizeHandleProps} />

        <div className="canvas-wrapper">
          <Canvas 
            ref={canvasRef} 
            leftPanelOpen={leftPanelOpen}
            rightPanelOpen={rightPanelOpen}
            dockOpen={dockOpen}
            onToggleLeftPanel={() => setLeftPanelOpen(p => !p)}
            onToggleRightPanel={() => setRightPanelOpen(p => !p)}
            onToggleDock={() => setDockOpen(p => !p)}
            onObjectSelect={setSelectedObject}
          />
        </div>

        <ResizeHandle isVisible={rightPanelOpen} {...rightResizeHandleProps} />
        
        <SidePanel side="right" isOpen={rightPanelOpen} width={rightPanelWidth}>
           <InspectorPanel selectedObject={selectedObject} onUpdateObject={handleUpdateObject} />
        </SidePanel>
      </main>

      <ResizeHandle isVisible={dockOpen} orientation="horizontal" {...dockResizeHandleProps} />
      
      <Dock height={dockOpen ? dockHeight : 0}>
        <div className="dock-content">
            <div className="dock-header">
                <RowsIcon />
                <h2>Asset Dock</h2>
            </div>
            <div className="dock-text">
                Assets, console logs, or timelines can go here.
            </div>
        </div>
      </Dock>
    </div>
  );
};

export default App;