
import React from 'react';

interface ResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  isVisible: boolean;
  orientation?: 'vertical' | 'horizontal';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ isVisible, orientation = 'vertical', ...rest }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`resize-handle ${orientation}`}
      {...rest}
    />
  );
};
