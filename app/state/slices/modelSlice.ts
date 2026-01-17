import type { StateCreator } from "zustand";
import type { CustomModel } from "../../types";
import type { AppStore } from "../types";
import {
  ModelsSyncClient,
  type SyncResult,
  type SingleModelResult,
} from "../../api/sync";
import { generateId } from "../utils";
import { STARTER_MODELS } from "../defaults";

export interface ModelSlice {
  models: CustomModel[];
  addModel: (model: Omit<CustomModel, "id">) => Promise<SingleModelResult>;
  updateModel: (
    modelId: string,
    updates: Partial<CustomModel>,
  ) => Promise<SingleModelResult>;
  deleteModel: (
    modelId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  setModels: (models: CustomModel[]) => void;
  syncModels: () => Promise<SyncResult>;
  isCloudConfigured: () => boolean;
  getSyncClient: () => ModelsSyncClient | null;
}

export const createModelSlice: StateCreator<AppStore, [], [], ModelSlice> = (
  set,
  get,
) => ({
  models: STARTER_MODELS,

  addModel: async (modelData) => {
    // Generate a secure random suffix for the model ID
    const randomSuffix = generateId().slice(0, 8);
    const id =
      modelData.name.toLowerCase().replace(/\s+/g, "-") + "-" + randomSuffix;
    const model: CustomModel = { ...modelData, id };

    const client = get().getSyncClient();
    if (client) {
      // Cloud-first: save to MongoDB, then update local cache
      const result = await client.upsertModel(model);
      if (result.success) {
        set((state) => ({
          models: [...state.models, result.model ?? model],
        }));
      }
      return result;
    } else {
      // Fallback: local-only mode
      set((state) => ({
        models: [...state.models, model],
      }));
      return { success: true, model };
    }
  },

  updateModel: async (modelId, updates) => {
    const state = get();
    const existing = state.models.find((m) => m.id === modelId);
    if (!existing) {
      return { success: false, error: "Model not found" };
    }

    const updatedModel: CustomModel = { ...existing, ...updates };
    const client = state.getSyncClient();

    if (client) {
      // Cloud-first: save to MongoDB, then update local cache
      const result = await client.upsertModel(updatedModel);
      if (result.success) {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === modelId ? (result.model ?? updatedModel) : m,
          ),
        }));
      }
      return result;
    } else {
      // Fallback: local-only mode
      set((state) => ({
        models: state.models.map((m) => (m.id === modelId ? updatedModel : m)),
      }));
      return { success: true, model: updatedModel };
    }
  },

  deleteModel: async (modelId) => {
    const client = get().getSyncClient();

    if (client) {
      // Cloud-first: delete from MongoDB, then update local cache
      const result = await client.deleteModel(modelId);
      if (result.success) {
        set((state) => ({
          models: state.models.filter((m) => m.id !== modelId),
        }));
      }
      return result;
    } else {
      // Fallback: local-only mode
      set((state) => ({
        models: state.models.filter((m) => m.id !== modelId),
      }));
      return { success: true };
    }
  },

  setModels: (models) => set({ models }),

  getSyncClient: () => {
    const { adminApiUrl, adminPassword } = get().settings;
    if (!adminApiUrl || !adminPassword) {
      return null;
    }
    return new ModelsSyncClient({ adminApiUrl, adminPassword });
  },

  isCloudConfigured: () => {
    const { adminApiUrl, adminPassword } = get().settings;
    return !!(adminApiUrl && adminPassword);
  },

  syncModels: async () => {
    const client = get().getSyncClient();

    if (!client) {
      return {
        success: false,
        models: [],
        error:
          "Cloud sync not configured. Set Admin API URL and Password in settings.",
      };
    }

    // Fetch from cloud (source of truth) and update local cache
    const result = await client.fetchModels();

    if (result.success) {
      set({ models: result.models });
    }

    return result;
  },
});
