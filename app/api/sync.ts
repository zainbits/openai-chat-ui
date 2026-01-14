/**
 * API client for syncing custom models to cloud (MongoDB via openai-proxy-ts)
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

/**
 * Client for syncing custom models to the cloud backend
 */
export class ModelsSyncClient {
  private adminApiUrl: string;
  private adminPassword: string;

  constructor(options: SyncClientOptions) {
    this.adminApiUrl = options.adminApiUrl.replace(/\/$/, "");
    this.adminPassword = options.adminPassword;
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
   * Fetch all models from the cloud
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
   * Sync local models to cloud (upload all local models)
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
