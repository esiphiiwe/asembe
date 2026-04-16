import { useRef, useCallback } from 'react';

/**
 * Returns a throttled version of `fn` that silently drops calls made within
 * `delayMs` of the previous successful invocation.
 */
export function useThrottle<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs: number,
) {
  const lastCall = useRef(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current < delayMs) return;
      lastCall.current = now;
      return fn(...args);
    },
    [fn, delayMs],
  ) as (...args: Parameters<T>) => ReturnType<T> | undefined;
}
