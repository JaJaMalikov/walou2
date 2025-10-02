import React from 'react';
import { Rnd } from 'react-rnd';
import { 
  MoveIcon, 
  TrashIcon, 
  FitToScreenIcon, 
  ZoomInIcon, 
  ZoomOutIcon, 
  PanelLeftIcon,
  PanelRightIcon,
  RowsIcon
} from './icons';

interface MenuState {
  x: number;
  y: number;
  width: number | string;
  height: number | string;
}

interface FloatingMenuProps {
  menuState: MenuState;
  onMenuChange: (updates: Partial<MenuState>) => void;
  selectedObjectId: string | null;
  onDelete: () => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  dockOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleDock: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomPercent?: number;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ 
  menuState, onMenuChange, selectedObjectId, onDelete,
  leftPanelOpen, rightPanelOpen, dockOpen,
  onToggleLeftPanel, onToggleRightPanel, onToggleDock,
  onFitView, onZoomIn, onZoomOut, zoomPercent
}) => {
  return (
    <Rnd
      size={{ width: menuState.width, height: menuState.height }}
      position={{ x: menuState.x, y: menuState.y }}
      onDragStop={(_, d) => onMenuChange({ x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) => {
        onMenuChange({
          width: ref.style.width,
          height: ref.style.height,
          ...position,
        });
      }}
      minWidth={380}
      minHeight={52}
      bounds="parent"
      dragHandleClassName="drag-handle"
      className="floating-menu-rnd"
    >
      <div className="floating-menu-content" role="toolbar">
        <button className="drag-handle" aria-label="Move toolbar">
          <MoveIcon />
        </button>
        <div className="menu-divider"></div>
        <div className="menu-buttons">
            <button
                title="Delete Selected (Del)"
                aria-label="Delete Selected"
                aria-keyshortcuts="Del, Backspace"
                onClick={selectedObjectId ? onDelete : undefined}
                disabled={!selectedObjectId}
                className="menu-button delete-button"
            >
                <TrashIcon />
            </button>
            <div className="menu-divider"></div>
             <button
                title="Fit to Screen (Ctrl+F)"
                aria-label="Fit to Screen"
                aria-keyshortcuts="Ctrl+F"
                onClick={onFitView}
                className="menu-button"
            >
                <FitToScreenIcon />
            </button>
            <button title="Zoom In" aria-keyshortcuts="+" onClick={onZoomIn} className="menu-button">
                <ZoomInIcon />
            </button>
            <button title="Zoom Out" aria-keyshortcuts="-" onClick={onZoomOut} className="menu-button">
                <ZoomOutIcon />
            </button>
            {typeof zoomPercent === 'number' && (
              <span className="zoom-indicator" aria-live="polite" aria-atomic="true">{zoomPercent}%</span>
            )}
            <div className="menu-divider"></div>
             <button title="Toggle Left Panel (Ctrl+L)" aria-label="Toggle Left Panel" aria-keyshortcuts="Ctrl+L" onClick={onToggleLeftPanel} className={`menu-button ${leftPanelOpen ? 'active' : ''}`}>
                <PanelLeftIcon />
            </button>
            <button title="Toggle Right Panel (Ctrl+P)" aria-label="Toggle Right Panel" aria-keyshortcuts="Ctrl+P" onClick={onToggleRightPanel} className={`menu-button ${rightPanelOpen ? 'active' : ''}`}>
                <PanelRightIcon />
            </button>
             <button title="Toggle Dock (Ctrl+T)" aria-label="Toggle Dock" aria-keyshortcuts="Ctrl+T" onClick={onToggleDock} className={`menu-button ${dockOpen ? 'active' : ''}`}>
                <RowsIcon />
            </button>
        </div>
      </div>
    </Rnd>
  );
};
