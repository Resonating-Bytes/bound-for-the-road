import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchBackendCompatibility,
  setCachedCompatibility,
  canUseRemoteWrite,
} from '../lib/compatibility';

const CompatibilityContext = createContext({
  compatibility: { ok: true, skipped: true },
  loading: false,
  refresh: async () => {},
  canRemoteWrite: true,
});

export function CompatibilityProvider({ children }) {
  const [compatibility, setCompatibility] = useState({ ok: true, skipped: true });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchBackendCompatibility();
      setCachedCompatibility(result);
      setCompatibility(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canRemoteWrite = canUseRemoteWrite(compatibility);

  const value = useMemo(
    () => ({
      compatibility,
      loading,
      refresh,
      canRemoteWrite,
    }),
    [compatibility, loading, refresh, canRemoteWrite],
  );

  return <CompatibilityContext.Provider value={value}>{children}</CompatibilityContext.Provider>;
}

export function useCompatibility() {
  return useContext(CompatibilityContext);
}
