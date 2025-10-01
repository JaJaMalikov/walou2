import React from 'react';
import { Rnd } from 'react-rnd';
import { MoveIcon, TrashIcon, ZoomInIcon, ExpandIcon } from './icons';

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
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ menuState, onMenuChange, selectedObjectId, onDelete }) => {
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
      minWidth={200}
      minHeight={52}
      bounds="parent"
      dragHandleClassName="drag-handle"
      className="z-20"
    >
      <div className="bg-gray-700/60 backdrop-blur-lg rounded-lg shadow-2xl h-full w-full flex items-center p-1 border border-gray-500/50" role="toolbar">
        <button className="drag-handle cursor-move p-2 text-gray-400 hover:text-white flex-shrink-0 rounded-full" aria-label="Move toolbar">
          <MoveIcon className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-gray-500/50 mx-1 flex-shrink-0"></div>
        <div className="flex items-center gap-1 px-1 flex-wrap">
            <button
                title="Delete Selected"
                aria-label="Delete Selected"
                onClick={selectedObjectId ? onDelete : undefined}
                disabled={!selectedObjectId}
                className="p-2 rounded-full transition-colors enabled:hover:bg-red-800/50 disabled:cursor-not-allowed disabled:text-gray-500 enabled:text-red-300"
            >
                <TrashIcon className="w-5 h-5"/>
            </button>
             <button
                title="Placeholder Tool 1"
                aria-label="Placeholder Tool 1"
                className="p-2 rounded-full text-gray-300 transition-colors hover:bg-gray-600/50 hover:text-white"
            >
                <ZoomInIcon className="w-5 h-5" />
            </button>
            <button
                title="Placeholder Tool 2"
                aria-label="Placeholder Tool 2"
                className="p-2 rounded-full text-gray-300 transition-colors hover:bg-gray-600/50 hover:text-white"
            >
                <ExpandIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </Rnd>
  );
};