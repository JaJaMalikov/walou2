import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { ReactNode } from 'react';

interface SidePanelProps {
  side: 'left' | 'right';
  isOpen: boolean;
  width: number;
  children: ReactNode;
}

export const SidePanel = ({ side, isOpen, width, children }: SidePanelProps) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!panelRef.current || !contentRef.current) {
      return;
    }
    const initialWidth = isOpen ? width : 0;
    gsap.set(panelRef.current, { width: initialWidth });
    gsap.set(contentRef.current, {
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
    });
  }, []);

  useEffect(() => {
    if (!panelRef.current || !contentRef.current) {
      return;
    }

    const targetWidth = isOpen ? width : 0;
    const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

    timeline.to(panelRef.current, { width: targetWidth, duration: 0.35 }, 0);
    timeline.to(contentRef.current, { opacity: isOpen ? 1 : 0, duration: 0.25 }, isOpen ? 0 : 0);
    timeline.set(contentRef.current, { pointerEvents: isOpen ? 'auto' : 'none' });

    return () => {
      timeline.kill();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!panelRef.current || !isOpen) {
      return;
    }

    gsap.to(panelRef.current, {
      width,
      duration: 0.18,
      ease: 'power1.out',
    });
  }, [width, isOpen]);

  return (
    <aside
      ref={panelRef}
      className={`side-panel ${side}`}
      aria-hidden={!isOpen}
    >
      <div ref={contentRef} className="side-panel-content">
        {children}
      </div>
    </aside>
  );
};
