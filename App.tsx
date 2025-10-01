
import React, { useState } from 'react';
import { SidePanel } from './components/SidePanel';
import { Dock } from './components/Dock';
import { Canvas } from './components/Canvas';
import { FloatingMenu } from './components/FloatingMenu';
import { ResizeHandle } from './components/ResizeHandle';
import { useResizable } from './hooks/useResizable';
import { PanelLeftIcon, PanelRightIcon, RowsIcon } from './components/icons';

const App: React.FC = () => {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);

  const [leftPanelWidth, leftResizeHandleProps] = useResizable({
    initialSize: 280,
    minSize: 200,
    maxSize: 500,
    axis: 'x',
    direction: 'right',
  });
  
  const [rightPanelWidth, rightResizeHandleProps] = useResizable({
    initialSize: 280,
    minSize: 200,
    maxSize: 500,
    axis: 'x',
    direction: 'left',
  });

  const [dockHeight, dockResizeHandleProps] = useResizable({
    initialSize: 150,
    minSize: 80,
    maxSize: 400,
    axis: 'y',
    direction: 'up',
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-800 overflow-hidden">
      <header className="absolute top-0 left-0 p-4 z-30 flex gap-2">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors"
          aria-label="Toggle left panel"
        >
          <PanelLeftIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors"
          aria-label="Toggle right panel"
        >
          <PanelRightIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setDockOpen(!dockOpen)}
          className="p-2 bg-gray-700/50 backdrop-blur-sm rounded-md hover:bg-gray-600/70 transition-colors"
          aria-label="Toggle dock panel"
        >
          <RowsIcon className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-row min-h-0">
        <SidePanel side="left" isOpen={leftPanelOpen} width={leftPanelWidth}>
          <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Navigator</h2>
            <ul className="space-y-2">
              <li className="p-2 bg-gray-700 rounded-md">Scene 1</li>
              <li className="p-2 bg-gray-600 rounded-md">Main Camera</li>
              <li className="p-2 bg-gray-600 rounded-md">Directional Light</li>
            </ul>
          </div>
        </SidePanel>

        <ResizeHandle isVisible={leftPanelOpen} {...leftResizeHandleProps} />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Canvas />
          <FloatingMenu />
        </div>

        <ResizeHandle isVisible={rightPanelOpen} {...rightResizeHandleProps} />
        
        <SidePanel side="right" isOpen={rightPanelOpen} width={rightPanelWidth}>
           <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Inspector</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Transform</label>
                <div className="p-2 bg-gray-700 rounded-md mt-1">
                  Position, Rotation, Scale...
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Material</label>
                 <div className="p-2 bg-gray-700 rounded-md mt-1">
                  Color, Texture...
                </div>
              </div>
            </div>
          </div>
        </SidePanel>
      </main>

      <ResizeHandle isVisible={dockOpen} orientation="horizontal" {...dockResizeHandleProps} />
      
      <Dock height={dockOpen ? dockHeight : 0}>
        <div className="p-4 h-full">
            <div className="flex items-center gap-2 border-b border-gray-600 pb-2 mb-2">
                <RowsIcon className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Asset Dock</h2>
            </div>
            <div className="text-gray-400 text-sm">
                Assets, console logs, or timelines can go here.
            </div>
        </div>
      </Dock>
    </div>
  );
};

export default App;
