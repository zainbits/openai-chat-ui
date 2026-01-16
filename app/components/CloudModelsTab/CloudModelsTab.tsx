import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Text,
  Group,
  TextInput,
  PasswordInput,
  Loader,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiCloud,
  FiCloudOff,
} from "react-icons/fi";
import { useAppStore } from "../../state/store";
import ConfirmModal from "../ConfirmModal";
import type { CustomModel } from "../../types";
import "./CloudModelsTab.css";

interface CloudModelsTabProps {
  onEditModel: (modelId: string) => void;
}

/**
 * Cloud Models Tab - Lists all models from MongoDB (source of truth)
 * Provides sync, edit, and delete functionality
 */
export default function CloudModelsTab({ onEditModel }: CloudModelsTabProps) {
  const settings = useAppStore((s) => s.settings);
  const models = useAppStore((s) => s.models);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const syncModels = useAppStore((s) => s.syncModels);
  const deleteModel = useAppStore((s) => s.deleteModel);
  const isCloudConfigured = useAppStore((s) => s.isCloudConfigured);

  // Local state for settings form
  const [adminApiUrl, setAdminApiUrl] = useState(settings.adminApiUrl ?? "");
  const [adminPassword, setAdminPassword] = useState(
    settings.adminPassword ?? "",
  );
  const [syncing, setSyncing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<CustomModel | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Check if settings have changed
  const settingsChanged =
    adminApiUrl !== (settings.adminApiUrl ?? "") ||
    adminPassword !== (settings.adminPassword ?? "");

  /**
   * Save cloud sync settings
   */
  const saveSettings = useCallback(() => {
    updateSettings({ adminApiUrl, adminPassword });
    notifications.show({
      message: "Cloud settings saved",
      color: "green",
    });
  }, [adminApiUrl, adminPassword, updateSettings]);

  /**
   * Sync models from cloud (MongoDB is source of truth)
   */
  const handleSync = useCallback(async () => {
    // Save settings first if changed
    if (settingsChanged) {
      updateSettings({ adminApiUrl, adminPassword });
    }

    setSyncing(true);
    try {
      const result = await syncModels();
      if (result.success) {
        notifications.show({
          message: `Synced ${result.models.length} models from cloud`,
          color: "green",
        });
      } else {
        notifications.show({
          message: result.error || "Failed to sync models",
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : "Sync failed",
        color: "red",
      });
    } finally {
      setSyncing(false);
    }
  }, [adminApiUrl, adminPassword, settingsChanged, updateSettings, syncModels]);

  /**
   * Open delete confirmation modal
   */
  const confirmDelete = useCallback((model: CustomModel) => {
    setModelToDelete(model);
    setDeleteModalOpen(true);
  }, []);

  /**
   * Delete model from cloud
   */
  const handleDelete = useCallback(async () => {
    if (!modelToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteModel(modelToDelete.id);
      if (result.success) {
        notifications.show({
          message: `Deleted "${modelToDelete.name}"`,
          color: "green",
        });
      } else {
        notifications.show({
          message: result.error || "Failed to delete model",
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : "Delete failed",
        color: "red",
      });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setModelToDelete(null);
    }
  }, [modelToDelete, deleteModel]);

  // Auto-sync on mount if configured
  useEffect(() => {
    if (isCloudConfigured() && models.length === 0) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = !!(adminApiUrl && adminPassword);

  return (
    <div className="cloud-models-tab">
      {/* Cloud Settings Section */}
      <div className="cloud-settings-section">
        <div className="cloud-settings-header">
          <Text size="sm" fw={500}>
            Cloud Connection
          </Text>
          {configured ? (
            <Badge
              color="green"
              variant="light"
              leftSection={<FiCloud size={12} />}
            >
              Configured
            </Badge>
          ) : (
            <Badge
              color="gray"
              variant="light"
              leftSection={<FiCloudOff size={12} />}
            >
              Not Configured
            </Badge>
          )}
        </div>
        <Text size="xs" c="dimmed" mb="sm">
          Connect to your MongoDB backend. Cloud is the source of truth - local
          storage is just a cache.
        </Text>
        <TextInput
          label="Admin API URL"
          placeholder="http://localhost:3017/admin/api"
          value={adminApiUrl}
          onChange={(e) => setAdminApiUrl(e.currentTarget.value)}
          size="sm"
          mb="xs"
        />
        <PasswordInput
          label="Admin Password"
          placeholder="Your admin password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.currentTarget.value)}
          size="sm"
          mb="sm"
        />
        <Group gap="sm">
          {settingsChanged && (
            <Button size="xs" variant="light" onClick={saveSettings}>
              Save Settings
            </Button>
          )}
          <Button
            size="xs"
            variant="filled"
            onClick={handleSync}
            loading={syncing}
            disabled={!configured}
            leftSection={<FiRefreshCw size={14} />}
          >
            Sync from Cloud
          </Button>
        </Group>
      </div>

      {/* Models List Section */}
      <div className="cloud-models-section">
        <div className="cloud-models-header">
          <Text size="sm" fw={500}>
            Models ({models.length})
          </Text>
        </div>

        {syncing && models.length === 0 ? (
          <div className="cloud-models-loading">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading models...
            </Text>
          </div>
        ) : models.length === 0 ? (
          <div className="cloud-models-empty">
            <Text size="sm" c="dimmed">
              {configured
                ? "No models found. Click 'Sync from Cloud' to fetch models."
                : "Configure cloud connection to sync models."}
            </Text>
          </div>
        ) : (
          <div className="cloud-models-list">
            {models.map((model) => (
              <div key={model.id} className="cloud-model-item">
                <div className="cloud-model-info">
                  <div
                    className="cloud-model-color"
                    style={{ backgroundColor: model.color }}
                  />
                  <div className="cloud-model-details">
                    <Text size="sm" fw={500}>
                      {model.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Temp: {model.temp}
                      {model.thinkingEnabled && " • Thinking"}
                    </Text>
                  </div>
                </div>
                <div className="cloud-model-actions">
                  <Tooltip label="Edit model">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => onEditModel(model.id)}
                    >
                      <FiEdit2 size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete model">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="red"
                      onClick={() => confirmDelete(model)}
                    >
                      <FiTrash2 size={14} />
                    </ActionIcon>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setModelToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Model"
        message={`Are you sure you want to delete "${modelToDelete?.name}"? This will remove it from the cloud database.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        confirmColor="red"
      />
    </div>
  );
}
