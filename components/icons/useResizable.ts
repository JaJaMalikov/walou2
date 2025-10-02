
import React, { useState, useCallback } from 'react';
import type { Axis, Direction } from '@/types.ts';

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
}: UseResizableProps): [
  number,
  {
    onMouseDown: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: 'separator';
    'aria-orientation': 'vertical' | 'horizontal';
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    tabIndex: number;
  }
] => {
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isVertical = axis === 'y';
      const step = e.shiftKey ? 50 : 10;

      let delta = 0;
      if (isVertical) {
        if (e.key === 'ArrowUp') delta = direction === 'up' ? step : -step;
        if (e.key === 'ArrowDown') delta = direction === 'up' ? -step : step;
      } else {
        if (e.key === 'ArrowLeft') delta = direction === 'left' ? step : -step;
        if (e.key === 'ArrowRight') delta = direction === 'left' ? -step : step;
      }

      if (delta !== 0) {
        e.preventDefault();
        setSize(prev => Math.max(minSize, Math.min(maxSize, prev + delta)));
      }
    },
    [axis, direction, maxSize, minSize]
  );

  return [
    size,
    {
      onMouseDown: handleMouseDown,
      onKeyDown: handleKeyDown,
      role: 'separator',
      'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
      'aria-valuenow': size,
      'aria-valuemin': minSize,
      'aria-valuemax': maxSize,
      tabIndex: 0,
    },
  ];
};