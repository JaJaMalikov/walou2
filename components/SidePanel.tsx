import React from 'react';

interface SidePanelProps {
  side: 'left' | 'right';
  isOpen: boolean;
  width: number;
  children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({ side, isOpen, width, children }) => {
  return (
    <aside
      className={`side-panel ${side}`}
      style={{ width: isOpen ? `${width}px` : '0px' }}
      aria-hidden={!isOpen}
    >
      <div className="side-panel-content" style={{width: `${width}px`}}>
        {children}
      </div>
    </aside>
  );
};