import { useEffect, useRef, useState } from 'react';

/** True for ~0.9 s after `value` changes (not on first render). Pair with the `animate-flash` class to show a live update. */
export function useFlash(value: unknown, ms = 900): boolean {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return on;
}
