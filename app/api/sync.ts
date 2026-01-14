/**
 * API client for syncing custom models to cloud (MongoDB via openai-proxy-ts)
 * Cloud is the source of truth, localStorage is just a cache layer.
 * @module api/sync
 */
import type { CustomModel } from "../types";

export interface SyncClientOptions {
  /** Admin API base URL (e.g., "http://localhost:3017/admin/api") */
  adminApiUrl: string;
  /** Admin password for authentication */
  adminPassword: string;
}

export interface SyncResult {
  success: boolean;
  models: CustomModel[];
  error?: string;
}

export interface SingleModelResult {
  success: boolean;
  model?: CustomModel;
  error?: string;
}

/**
 * Client for syncing custom models to the cloud backend.
 * MongoDB is the source of truth - all operations go to cloud first,
 * then update local cache.
 */
export class ModelsSyncClient {
  private adminApiUrl: string;
  private adminPassword: string;

  constructor(options: SyncClientOptions) {
    this.adminApiUrl = options.adminApiUrl.replace(/\/$/, "");
    this.adminPassword = options.adminPassword;
  }

  /**
   * Check if cloud sync is configured
   */
  isConfigured(): boolean {
    return !!(this.adminApiUrl && this.adminPassword);
  }

  /**
   * Builds authorization headers for admin API
   */
  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.adminPassword}`,
    };
  }

  /**
   * Fetch all models from the cloud (source of truth)
   */
  async fetchModels(): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.adminApiUrl}/custom-models`, {
        method: "GET",
        headers: this.headers(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          models: [],
          error: error.error || `Failed to fetch models: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        models: data.models || [],
      };
    } catch (err) {
      return {
        success: false,
        models: [],
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Sync local models to cloud (bulk upsert)
   * This performs an upsert - existing models are updated, new ones are created
   */
  async syncModels(models: CustomModel[]): Promise<SyncResult> {
    try {
      const response = await fetch(`${this.adminApiUrl}/custom-models/sync`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ models }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          models: [],
          error: error.error || `Failed to sync models: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        models: data.models || [],
      };
    } catch (err) {
      return {
        success: false,
        models: [],
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Create or update a single model in the cloud
   * Used for immediate sync when user edits a model
   */
  async upsertModel(model: CustomModel): Promise<SingleModelResult> {
    try {
      const response = await fetch(`${this.adminApiUrl}/custom-models`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          id: model.id,
          name: model.name,
          color: model.color,
          system: model.system,
          model: model.model,
          temp: model.temp,
          thinkingEnabled: model.thinkingEnabled,
          thinkingEffort: model.thinkingEffort,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || `Failed to save model: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        model: data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Fetch a single model from the cloud by ID
   * Used for conflict detection before saving
   */
  async fetchModel(modelId: string): Promise<SingleModelResult> {
    try {
      const response = await fetch(
        `${this.adminApiUrl}/custom-models/${encodeURIComponent(modelId)}`,
        {
          method: "GET",
          headers: this.headers(),
        },
      );

      if (response.status === 404) {
        // Model doesn't exist on server - not an error, just no conflict possible
        return { success: true, model: undefined };
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || `Failed to fetch model: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        model: data,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  /**
   * Delete a model from the cloud
   */
  async deleteModel(
    modelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.adminApiUrl}/custom-models/${encodeURIComponent(modelId)}`,
        {
          method: "DELETE",
          headers: this.headers(),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || `Failed to delete model: ${response.status}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}
