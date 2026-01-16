import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Modal,
  Button,
  TextInput,
  Switch,
  Select,
  Text,
  Group,
  Tabs,
  Slider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import ConfirmModal from "../ConfirmModal";
import CloudModelsTab from "../CloudModelsTab";
import { useAppStore } from "../../state/store";
import { importJson } from "../../utils/storage";
import { exportJson, normalizePersistedAppData } from "../../utils/appData";
import {
  cleanupImageStore,
  isImageStoreReady,
  listImageIds,
} from "../../utils/imageStore";
import { API_PROVIDER_PRESETS, CUSTOM_PROVIDER_ID } from "../../constants";
import { createApiClient } from "../../api/client";
import type { AppData } from "../../types";
import "./SettingsModal.css";

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
  onEditModel?: (modelId: string) => void;
}

/**
 * Modal for managing application settings
 */
export default function SettingsModal({
  opened,
  onClose,
  onEditModel,
}: SettingsModalProps) {
  const settings = useAppStore((s) => s.settings);
  const availableModels = useAppStore((s) => s.availableModels);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setAvailableModels = useAppStore((s) => s.setAvailableModels);

  // Get full state for export
  const getFullState = (): AppData => {
    const state = useAppStore.getState();
    return {
      models: state.models,
      chats: state.chats,
      ui: state.ui,
      settings: state.settings,
      availableModels: state.availableModels,
    };
  };

  // Determine the initial provider from settings or URL
  const getProviderFromSettings = (): string => {
    // If provider is stored in settings, use it
    if (settings.apiProvider) {
      return settings.apiProvider;
    }
    // Fall back to detecting from URL for backwards compatibility
    const preset = API_PROVIDER_PRESETS.find(
      (p) => p.id !== CUSTOM_PROVIDER_ID && p.baseUrl === settings.apiBaseUrl,
    );
    return preset ? preset.id : CUSTOM_PROVIDER_ID;
  };

  const [selectedProvider, setSelectedProvider] = useState(() =>
    getProviderFromSettings(),
  );
  // Initialize custom base URL from settings if it differs from the preset
  const [customBaseUrl, setCustomBaseUrl] = useState(() => {
    const provider = getProviderFromSettings();
    const preset = API_PROVIDER_PRESETS.find((p) => p.id === provider);
    // If the saved URL differs from the preset, it's a custom override
    if (
      preset &&
      settings.apiBaseUrl &&
      settings.apiBaseUrl !== preset.baseUrl
    ) {
      return settings.apiBaseUrl;
    }
    // For custom provider, use the saved URL
    if (provider === CUSTOM_PROVIDER_ID) {
      return settings.apiBaseUrl;
    }
    return "";
  });
  // Track whether user wants to override the base URL
  const [useCustomUrl, setUseCustomUrl] = useState(() => {
    const provider = getProviderFromSettings();
    if (provider === CUSTOM_PROVIDER_ID) return true;
    const preset = API_PROVIDER_PRESETS.find((p) => p.id === provider);
    return !!(
      preset &&
      settings.apiBaseUrl &&
      settings.apiBaseUrl !== preset.baseUrl
    );
  });
  const [apiKey, setApiKey] = useState(settings.apiKey ?? "");
  const [streamingEnabled, setStreamingEnabled] = useState(
    settings.streamingEnabled,
  );
  const [glassEffectEnabled, setGlassEffectEnabled] = useState(
    settings.glassEffectEnabled ?? true,
  );
  const [lowSpecBlur, setLowSpecBlur] = useState(settings.lowSpecBlur ?? 5);
  const [verifying, setVerifying] = useState(false);
  const [nukeModalOpen, setNukeModalOpen] = useState(false);
  const [deleteChatsModalOpen, setDeleteChatsModalOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState("");
  const [imageStoreStatus, setImageStoreStatus] = useState<
    "checking" | "available" | "unavailable"
  >("checking");
  const [imageStoreCount, setImageStoreCount] = useState<number | null>(null);
  const [cleaningImages, setCleaningImages] = useState(false);

  const nukeAll = useAppStore((s) => s.nukeAll);
  const deleteAllChats = useAppStore((s) => s.deleteAllChats);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    const checkImageStore = async () => {
      setImageStoreStatus("checking");
      const available = await isImageStoreReady();
      if (cancelled) return;
      setImageStoreStatus(available ? "available" : "unavailable");

      if (!available) {
        setImageStoreCount(null);
        return;
      }

      try {
        const ids = await listImageIds();
        if (!cancelled) {
          setImageStoreCount(ids.length);
        }
      } catch {
        if (!cancelled) {
          setImageStoreCount(null);
        }
      }
    };

    void checkImageStore();

    return () => {
      cancelled = true;
    };
  }, [opened]);

  // Compute the actual API base URL based on provider selection
  const apiBaseUrl = useMemo(() => {
    // If custom URL is enabled or provider is "Custom", use customBaseUrl
    if (selectedProvider === CUSTOM_PROVIDER_ID || useCustomUrl) {
      return customBaseUrl;
    }
    const preset = API_PROVIDER_PRESETS.find((p) => p.id === selectedProvider);
    return preset?.baseUrl ?? "";
  }, [selectedProvider, customBaseUrl, useCustomUrl]);

  // Get the default URL for the selected provider (for placeholder)
  const defaultProviderUrl = useMemo(() => {
    const preset = API_PROVIDER_PRESETS.find((p) => p.id === selectedProvider);
    return preset?.baseUrl ?? "";
  }, [selectedProvider]);

  // Provider dropdown options
  const providerOptions = useMemo(
    () =>
      API_PROVIDER_PRESETS.map((p) => ({
        value: p.id,
        label: p.label,
      })),
    [],
  );

  // Handle provider change
  const handleProviderChange = useCallback((value: string | null) => {
    if (value) {
      setSelectedProvider(value);
      // Reset custom URL when switching to Custom provider
      if (value === CUSTOM_PROVIDER_ID) {
        setUseCustomUrl(true);
      } else {
        // For other providers, prefill the custom URL with their default
        const preset = API_PROVIDER_PRESETS.find((p) => p.id === value);
        if (preset) {
          setCustomBaseUrl(preset.baseUrl);
        }
        setUseCustomUrl(false);
      }
    }
  }, []);

  /**
   * Verifies the API connection
   */
  const verify = useCallback(async () => {
    if (apiKey.length === 0) return;
    setVerifying(true);

    try {
      const client = createApiClient({
        apiBaseUrl,
        apiKey,
        apiProvider: selectedProvider,
        streamingEnabled,
      });
      const ok = await client.verify();

      if (ok) {
        const models = await client.listModels();
        setAvailableModels(models);
        notifications.show({ message: "API verified", color: "green" });
      } else {
        notifications.show({ message: "Failed to verify API", color: "red" });
      }
    } catch {
      notifications.show({ message: "Failed to verify API", color: "red" });
    }

    setVerifying(false);
  }, [
    apiBaseUrl,
    apiKey,
    selectedProvider,
    streamingEnabled,
    setAvailableModels,
  ]);

  /**
   * Saves the settings
   */
  const save = useCallback(() => {
    if (apiKey.length === 0) return;
    updateSettings({
      apiBaseUrl,
      apiKey,
      apiProvider: selectedProvider,
      streamingEnabled,
      glassEffectEnabled,
      lowSpecBlur,
    });
    onClose();
  }, [
    apiBaseUrl,
    apiKey,
    selectedProvider,
    streamingEnabled,
    glassEffectEnabled,
    lowSpecBlur,
    updateSettings,
    onClose,
  ]);

  /**
   * Handles glass effect toggle - saves immediately
   */
  const handleGlassEffectChange = useCallback(
    (enabled: boolean) => {
      setGlassEffectEnabled(enabled);
      updateSettings({ glassEffectEnabled: enabled });
    },
    [updateSettings],
  );

  /**
   * Handles low spec blur change - saves immediately
   */
  const handleLowSpecBlurChange = useCallback(
    (value: number) => {
      setLowSpecBlur(value);
      updateSettings({ lowSpecBlur: value });
    },
    [updateSettings],
  );

  /**
   * Exports app data as JSON
   */
  const exportData = useCallback(() => {
    const json = exportJson(getFullState());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custommodels-chat.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Imports app data from JSON
   */
  const importData = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = importJson(text);
        const normalized = normalizePersistedAppData(data, getFullState());
        // Update the store with imported data
        useAppStore.setState({
          models: normalized.models,
          chats: normalized.chats,
          ui: normalized.ui,
          settings: normalized.settings,
          availableModels: normalized.availableModels,
        });
        notifications.show({ message: "Data imported", color: "green" });
      } catch {
        notifications.show({ message: "Invalid JSON", color: "red" });
      }
    };
    input.click();
  }, []);

  /**
   * Nukes all data (resets everything in state)
   */
  const handleNuke = useCallback(() => {
    nukeAll();
    setNukeModalOpen(false);
    setNukeConfirmText("");
    notifications.show({
      message: "All data has been wiped",
      color: "red",
    });
  }, [nukeAll]);

  /**
   * Deletes all chats
   */
  const handleDeleteChats = useCallback(() => {
    deleteAllChats();
    setDeleteChatsModalOpen(false);
    notifications.show({
      message: "All chats have been deleted",
      color: "green",
    });
  }, [deleteAllChats]);

  const handleCleanupImages = useCallback(async () => {
    if (imageStoreStatus !== "available") return;
    setCleaningImages(true);
    try {
      const chats = useAppStore.getState().chats;
      const referencedIds: string[] = [];
      Object.values(chats).forEach((thread) => {
        thread.messages.forEach((message) => {
          if (message.imageIds && message.imageIds.length > 0) {
            referencedIds.push(...message.imageIds);
          }
        });
      });

      const removedCount = await cleanupImageStore(referencedIds);
      const ids = await listImageIds();
      setImageStoreCount(ids.length);

      notifications.show({
        message:
          removedCount > 0
            ? `Removed ${removedCount} unused images`
            : "No unused images found",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to clean up images:", error);
      notifications.show({
        message: "Failed to clean up images",
        color: "red",
      });
    } finally {
      setCleaningImages(false);
    }
  }, [imageStoreStatus]);

  /**
   * Closes the nuke modal and resets confirmation text
   */
  const closeNukeModal = useCallback(() => {
    setNukeModalOpen(false);
    setNukeConfirmText("");
  }, []);

  /**
   * Handle edit model from CloudModelsTab
   */
  const handleEditModel = useCallback(
    (modelId: string) => {
      if (onEditModel) {
        onClose();
        onEditModel(modelId);
      }
    },
    [onClose, onEditModel],
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Settings"
        size="lg"
        aria-labelledby="settings-modal-title"
      >
        <Tabs defaultValue="api" classNames={{ root: "settings-tabs" }}>
          <Tabs.List className="settings-tabs-list">
            <Tabs.Tab value="api">API</Tabs.Tab>
            <Tabs.Tab value="interface">Interface</Tabs.Tab>
            <Tabs.Tab value="data">Data</Tabs.Tab>
            <Tabs.Tab value="cloud-models">Cloud Models</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="api" pt="md">
            <div className="modal-content">
              <Select
                label="API Provider"
                data={providerOptions}
                value={selectedProvider}
                onChange={handleProviderChange}
                aria-label="Select API provider"
              />
              {selectedProvider !== CUSTOM_PROVIDER_ID && (
                <Switch
                  label="Use custom base URL (for proxy)"
                  description={`Default: ${defaultProviderUrl}`}
                  checked={useCustomUrl}
                  onChange={(e) => setUseCustomUrl(e.currentTarget.checked)}
                />
              )}
              {(selectedProvider === CUSTOM_PROVIDER_ID || useCustomUrl) && (
                <TextInput
                  label="API Base URL"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.currentTarget.value)}
                  placeholder={
                    defaultProviderUrl || "https://api.example.com/v1"
                  }
                  aria-describedby="custom-api-url-description"
                />
              )}
              <TextInput
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value)}
                type="password"
                required
                withAsterisk
                error={apiKey.length === 0 ? "API key is required" : undefined}
                aria-describedby="api-key-description"
              />
              <Switch
                label="Streaming enabled"
                checked={streamingEnabled}
                onChange={(e) => setStreamingEnabled(e.currentTarget.checked)}
                aria-describedby="streaming-description"
              />
              <div className="modal-actions">
                <div className="modal-actions-group" />
                <div className="modal-actions-group">
                  <Button
                    variant="default"
                    onClick={verify}
                    loading={verifying}
                    disabled={apiKey.length === 0}
                    aria-label="Verify API connection"
                  >
                    Verify API
                  </Button>
                  <Button
                    onClick={save}
                    disabled={apiKey.length === 0}
                    aria-label="Save settings"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="interface" pt="md">
            <div className="modal-content">
              <div className="data-section">
                <Text size="sm" fw={500} mb="xs">
                  Visual Effects
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Adjust visual effects for better performance on lower-powered
                  devices.
                </Text>
                <Switch
                  label="Enable glass effects"
                  description="Disable for better performance on mobile devices"
                  checked={glassEffectEnabled}
                  onChange={(e) =>
                    handleGlassEffectChange(e.currentTarget.checked)
                  }
                  aria-describedby="glass-effect-description"
                />
                {!glassEffectEnabled && (
                  <div style={{ marginTop: "1rem" }}>
                    <Text size="xs" fw={500} mb={4}>
                      Background Blur Strength ({lowSpecBlur}px)
                    </Text>
                    <Text size="xs" c="dimmed" mb="xs">
                      Adjust the blur amount for non-glass elements to improve
                      readability.
                    </Text>
                    <Slider
                      value={lowSpecBlur}
                      onChange={handleLowSpecBlurChange}
                      min={0}
                      max={20}
                      step={1}
                      label={(value) => `${value}px`}
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="data" pt="md">
            <div className="modal-content">
              <div className="data-section">
                <Text size="sm" fw={500} mb="xs">
                  Export & Import
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Backup your data or restore from a previous export.
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Note: Exports do not include images stored in browser storage.
                </Text>
                <div className="modal-actions-group">
                  <Button
                    variant="light"
                    onClick={exportData}
                    aria-label="Export settings as JSON file"
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="light"
                    onClick={importData}
                    aria-label="Import settings from JSON file"
                  >
                    Import JSON
                  </Button>
                </div>
              </div>

              <div className="data-section">
                <Text size="sm" fw={500} mb="xs">
                  Image Storage
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Images are stored locally in your browser for performance and
                  privacy.
                </Text>
                <Group gap="sm">
                  <Text size="xs" c="dimmed">
                    Status:{" "}
                    {imageStoreStatus === "checking"
                      ? "Checking..."
                      : imageStoreStatus === "available"
                        ? "Available"
                        : "Unavailable"}
                  </Text>
                  {imageStoreStatus === "available" && (
                    <Text size="xs" c="dimmed">
                      Stored images: {imageStoreCount ?? "—"}
                    </Text>
                  )}
                </Group>
                {imageStoreStatus === "unavailable" && (
                  <Text size="xs" c="red" mt="xs">
                    Image persistence is unavailable in this browser.
                  </Text>
                )}
                <Group gap="sm" style={{ marginTop: "0.5rem" }}>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={handleCleanupImages}
                    loading={cleaningImages}
                    disabled={imageStoreStatus !== "available"}
                    aria-label="Clean up unused images"
                  >
                    Clean Up Unused Images
                  </Button>
                </Group>
              </div>

              <div className="data-section data-section-danger">
                <Text size="sm" fw={500} c="red" mb="xs">
                  Danger Zone
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Permanently delete chats or all data including models and
                  settings.
                </Text>
                <Group>
                  <Button
                    color="red"
                    variant="light"
                    onClick={() => setDeleteChatsModalOpen(true)}
                    aria-label="Delete all chats"
                  >
                    Delete All Chats
                  </Button>
                  <Button
                    color="red"
                    variant="light"
                    onClick={() => setNukeModalOpen(true)}
                    aria-label="Nuke all data"
                  >
                    Nuke All Data
                  </Button>
                </Group>
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="cloud-models" pt="md">
            <CloudModelsTab onEditModel={handleEditModel} />
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <ConfirmModal
        opened={deleteChatsModalOpen}
        onClose={() => setDeleteChatsModalOpen(false)}
        onConfirm={handleDeleteChats}
        title="Delete All Chats"
        message="Are you sure you want to delete all chats? This action cannot be undone."
        confirmLabel="Delete Chats"
        confirmColor="red"
      />

      {/* Nuke Confirmation Modal */}
      <Modal
        opened={nukeModalOpen}
        onClose={closeNukeModal}
        title="☢️ Nuke All Data"
        size="sm"
        centered
      >
        <Text size="sm" mb="md">
          This will permanently delete ALL your data including chats, messages,
          custom models, and settings. This cannot be undone!
        </Text>
        <TextInput
          label="Type CONFIRM to proceed"
          placeholder="CONFIRM"
          value={nukeConfirmText}
          onChange={(e) => setNukeConfirmText(e.currentTarget.value)}
          mb="lg"
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={closeNukeModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleNuke}
            disabled={nukeConfirmText !== "CONFIRM"}
          >
            Nuke Everything
          </Button>
        </Group>
      </Modal>
    </>
  );
}
