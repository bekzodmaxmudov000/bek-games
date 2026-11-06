import { useEffect, useRef, type RefObject } from 'react';

export type Dir = 'up' | 'down' | 'left' | 'right';

/** Window key handler. Return true from the handler to stop the page from scrolling. */
export function useKeys(handler: (e: KeyboardEvent) => boolean | void) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (h.current(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Swipe detection on an element (touch only). */
export function useSwipe(ref: RefObject<HTMLElement>, onSwipe: (d: Dir) => void) {
  const h = useRef(onSwipe);
  h.current = onSwipe;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sx = 0, sy = 0;
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      h.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchmove', block);
    };
  }, [ref]);
}
