
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

  return (
    <div
      className={`resize-handle ${orientation}`}
      onMouseDown={onMouseDown}
    />
  );
};