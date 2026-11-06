import { useCallback, useEffect, useState } from 'react';
import './legacy';

const read = (key: string) => {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
};

/** Best score kept in localStorage. 0 means "no record yet". */
export function useBestScore(name: string, lowerIsBetter = false) {
  const key = `bekgames:${name}`;
  const [best, setBest] = useState(() => read(key));
  useEffect(() => setBest(read(key)), [key]);
  const submit = useCallback((score: number) => {
    const cur = read(key);
    if (score <= 0 || (cur && (lowerIsBetter ? score >= cur : score <= cur))) return;
    try { localStorage.setItem(key, String(score)); } catch { /* storage unavailable */ }
    setBest(score);
  }, [key, lowerIsBetter]);
  return [best, submit] as const;
}
