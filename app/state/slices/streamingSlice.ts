import type { StateCreator } from "zustand";
import type { AppStore } from "../types";

export interface StreamingSlice {
  isLoading: boolean;
  isRegenerating: boolean;
  setIsLoading: (loading: boolean) => void;
  setIsRegenerating: (regenerating: boolean) => void;
}

export const createStreamingSlice: StateCreator<
  AppStore,
  [],
  [],
  StreamingSlice
> = (set) => ({
  isLoading: false,
  isRegenerating: false,

  setIsLoading: (loading) => set({ isLoading: loading }),

  setIsRegenerating: (regenerating) => set({ isRegenerating: regenerating }),
});
