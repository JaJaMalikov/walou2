
import React from 'react';

interface DockProps {
  height: number;
  children: React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({ height, children }) => {
  return (
    <footer
      className="dock-container"
      style={{ height: `${height}px` }}
    >
        <div className="dock-content">
            {children}
        </div>
    </footer>
  );
};