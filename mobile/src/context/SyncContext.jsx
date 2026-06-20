import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCompatibility } from './CompatibilityContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { flushOutbox, getOutboxSyncSnapshot, startOutboxSync } from '../lib/outboxSync';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { user } = useAuth();
  const { canRemoteWrite } = useCompatibility();
  const [snapshot, setSnapshot] = useState(getOutboxSyncSnapshot);

  const refreshSnapshot = useCallback(() => {
    setSnapshot(getOutboxSyncSnapshot());
  }, []);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      refreshSnapshot();
      return undefined;
    }
    return startOutboxSync(refreshSnapshot);
  }, [user?.id, refreshSnapshot]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    flushOutbox()
      .then(refreshSnapshot)
      .catch(() => {});
  }, [canRemoteWrite, user?.id, refreshSnapshot]);

  const syncNow = useCallback(async () => {
    await flushOutbox();
    refreshSnapshot();
  }, [refreshSnapshot]);

  const value = useMemo(
    () => ({
      pendingCount: snapshot.pendingCount,
      isSyncing: snapshot.isSyncing,
      lastError: snapshot.lastError,
      syncNow,
      refreshSyncStatus: refreshSnapshot,
    }),
    [snapshot, syncNow, refreshSnapshot],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return ctx;
}
