
import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { MoveIcon, ChevronsRightLeftIcon, MinusIcon, TrashIcon } from './icons';

interface FloatingMenuProps {
  selectedObjectId: string | null;
  onDelete: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ selectedObjectId, onDelete }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Rnd
      default={{
        x: 50,
        y: 80,
        width: 220,
        height: 'auto',
      }}
      minWidth={200}
      minHeight={50}
      bounds="parent"
      dragHandleClassName="drag-handle"
      className="z-20"
    >
      <div className="bg-gray-700/60 backdrop-blur-lg rounded-lg shadow-2xl h-full flex flex-col border border-gray-500/50">
        <header className="drag-handle cursor-move p-2 flex justify-between items-center border-b border-gray-500/50">
          <div className="flex items-center gap-2">
            <MoveIcon className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-sm">Tools</h3>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-600/50 rounded"
            aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            {isCollapsed ? <ChevronsRightLeftIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
          </button>
        </header>

        {!isCollapsed && (
          <div className="p-3">
            <ul className="space-y-2 text-sm">
                <li
                  className={`flex items-center gap-2 p-2 rounded ${selectedObjectId ? 'hover:bg-red-800/50 cursor-pointer text-red-300' : 'cursor-not-allowed text-gray-500'}`}
                  onClick={selectedObjectId ? onDelete : undefined}
                  aria-disabled={!selectedObjectId}
                >
                    <TrashIcon className="w-4 h-4"/>
                    <span>Delete Selected</span>
                </li>
                <hr className="border-gray-600 my-2" />
                <li className="flex items-center gap-2 p-2 rounded hover:bg-gray-600/50 cursor-pointer">Tool Option 1</li>
                <li className="flex items-center gap-2 p-2 rounded hover:bg-gray-600/50 cursor-pointer">Tool Option 2</li>
                <li className="flex items-center gap-2 p-2 rounded bg-blue-600/30 text-blue-200 cursor-pointer">Active Tool</li>
                <li className="flex items-center gap-2 p-2 rounded hover:bg-gray-600/50 cursor-pointer">Another Tool</li>
            </ul>
          </div>
        )}
      </div>
    </Rnd>
  );
};
