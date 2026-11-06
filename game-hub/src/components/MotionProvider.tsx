import { useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { effectiveMotion } from '../settings/store';
import { useSettings } from '../settings/useSettings';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Applies the motion setting: CSS rules via data-motion, framer-motion via MotionConfig. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  const { motion } = useSettings();
  const [prefersReduced, setPrefersReduced] = useState(() => window.matchMedia?.(QUERY).matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setPrefersReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mode = effectiveMotion(motion, prefersReduced);
  useEffect(() => { document.documentElement.dataset.motion = mode; }, [mode]);

  return <MotionConfig reducedMotion={mode === 'full' ? 'never' : 'always'}>{children}</MotionConfig>;
}
