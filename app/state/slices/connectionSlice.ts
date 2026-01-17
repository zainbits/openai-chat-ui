import type { StateCreator } from "zustand";
import type { ConnectionStatus, DiscoveredModel } from "../../types";
import type { AppStore } from "../types";

export interface ConnectionSlice {
  availableModels: DiscoveredModel[];
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAvailableModels: (models: DiscoveredModel[]) => void;
  checkConnection: () => Promise<void>;
}

export const createConnectionSlice: StateCreator<
  AppStore,
  [],
  [],
  ConnectionSlice
> = (set, get) => ({
  availableModels: [],
  connectionStatus: "unknown",

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setAvailableModels: (models) => set({ availableModels: models }),

  checkConnection: async () => {
    const { setConnectionStatus, setAvailableModels, getClient } = get();

    setConnectionStatus("connecting");

    try {
      const client = getClient();
      const models = await client.listModels();
      setConnectionStatus("connected");
      setAvailableModels(models);
    } catch {
      setConnectionStatus("error");
    }
  },
});
