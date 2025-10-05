import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { ReactNode } from 'react';

interface DockProps {
  height: number;
  children: ReactNode;
}

export const Dock = ({ height, children }: DockProps) => {
  const dockRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!dockRef.current || !contentRef.current) {
      return;
    }

    gsap.set(dockRef.current, { height });
    gsap.set(contentRef.current, {
      opacity: height > 0 ? 1 : 0,
      pointerEvents: height > 0 ? 'auto' : 'none',
    });
  }, []);

  useEffect(() => {
    if (!dockRef.current || !contentRef.current) {
      return;
    }

    const isVisible = height > 0;
    const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

    timeline.to(dockRef.current, { height, duration: 0.35 }, 0);
    timeline.to(contentRef.current, { opacity: isVisible ? 1 : 0, duration: 0.25 }, isVisible ? 0.1 : 0);
    timeline.set(contentRef.current, { pointerEvents: isVisible ? 'auto' : 'none' });

    return () => {
      timeline.kill();
    };
  }, [height]);

  return (
    <footer ref={dockRef} className="dock-container" aria-hidden={height <= 0}>
      <div ref={contentRef} className="dock-content">
        {children}
      </div>
    </footer>
  );
};
