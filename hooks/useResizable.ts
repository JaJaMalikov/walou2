
import { useState, useCallback } from 'react';
import type { Axis, Direction } from '../types';

interface UseResizableProps {
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  axis: Axis;
  direction: Direction;
}

export const useResizable = ({
  initialSize,
  minSize = 0,
  maxSize = Infinity,
  axis,
  direction,
}: UseResizableProps): [number, { onMouseDown: (e: React.MouseEvent) => void }] => {
  const [size, setSize] = useState(initialSize);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = axis === 'x' ? e.clientX : e.clientY;
    const startSize = size;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
      let delta = currentPos - startPos;

      if (direction === 'left' || direction === 'up') {
        delta = -delta;
      }
      
      const newSize = Math.max(minSize, Math.min(maxSize, startSize + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [axis, direction, maxSize, minSize, size]);

  return [size, { onMouseDown: handleMouseDown }];
};
