
import React from 'react';

interface DockProps {
  height: number;
  children: React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({ height, children }) => {
  return (
    <footer
      className="bg-gray-800 border-t border-gray-700 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{ height: `${height}px` }}
    >
        <div className="h-full overflow-auto">
            {children}
        </div>
    </footer>
  );
};
