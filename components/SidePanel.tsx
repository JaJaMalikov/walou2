import React from 'react';

interface SidePanelProps {
  side: 'left' | 'right';
  isOpen: boolean;
  width: number;
  children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({ side, isOpen, width, children }) => {
  const sideClasses = side === 'left' ? 'border-r' : 'border-l';

  return (
    <aside
      className={`bg-gray-800 border-gray-700 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${sideClasses}`}
      style={{ width: isOpen ? `${width}px` : '0px' }}
      aria-hidden={!isOpen}
    >
      <div className="h-full overflow-y-auto" style={{width: `${width}px`}}>
        {children}
      </div>
    </aside>
  );
};