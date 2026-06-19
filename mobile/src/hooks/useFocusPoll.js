import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/** Re-run callback on screen focus and every intervalMs while focused. */
export function useFocusPoll(callback, intervalMs = 15000) {
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const run = () => {
        if (cancelled) return;
        callback();
      };
      run();
      const timer = setInterval(run, intervalMs);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [callback, intervalMs]),
  );
}
