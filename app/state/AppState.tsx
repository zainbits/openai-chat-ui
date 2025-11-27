/**
 * @deprecated This file is maintained for backwards compatibility.
 * Use the Zustand store from './store' instead.
 *
 * @example
 * // New way (recommended):
 * import { useAppStore, selectActiveThread } from '../state/store';
 *
 * // Old way (deprecated):
 * import { useAppState } from '../state/AppState';
 */

export {
  useAppStore as useAppState,
  useAppStore,
  useThreads,
  selectActiveThread,
  selectActiveModel,
  selectChats,
  selectConnectionStatus,
  selectSettings,
} from "./store";

// Re-export the createThread function for backwards compatibility
import { useAppStore } from "./store";

export const createThreadForModel = (modelId: string) => {
  const { createThread } = useAppStore.getState();
  return createThread(modelId);
};

// Legacy provider component (no longer needed with Zustand)
import type { ReactNode } from "react";

/**
 * @deprecated No longer needed with Zustand. Just render children directly.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
