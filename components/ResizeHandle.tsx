
import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isVisible: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, isVisible, orientation = 'vertical' }) => {
  if (!isVisible) {
    return null;
  }

  const baseClasses = "bg-gray-700 hover:bg-blue-600 transition-colors duration-200 flex-shrink-0";
  const orientationClasses = orientation === 'vertical' 
    ? 'w-1.5 cursor-col-resize' 
    : 'h-1.5 cursor-row-resize';

  return (
    <div
      className={`${baseClasses} ${orientationClasses}`}
      onMouseDown={onMouseDown}
    />
  );
};
