import type { StateCreator } from "zustand";
import type { AppStore } from "../types";
import type { TokenUsage } from "../../types";

export interface StreamingSlice {
  isLoading: boolean;
  isRegenerating: boolean;
  /** Token usage from the last API response */
  tokenUsage: TokenUsage | null;
  setIsLoading: (loading: boolean) => void;
  setIsRegenerating: (regenerating: boolean) => void;
  setTokenUsage: (usage: TokenUsage | null) => void;
}

export const createStreamingSlice: StateCreator<
  AppStore,
  [],
  [],
  StreamingSlice
> = (set) => ({
  isLoading: false,
  isRegenerating: false,
  tokenUsage: null,

  setIsLoading: (loading) => set({ isLoading: loading }),

  setIsRegenerating: (regenerating) => set({ isRegenerating: regenerating }),

  setTokenUsage: (usage) => set({ tokenUsage: usage }),
});
