import React, { useState, useCallback, useMemo } from "react";
import {
  Modal,
  Button,
  TextInput,
  Switch,
  Select,
  Text,
  Group,
  Tabs,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAppStore } from "../../state/store";
import { exportJson, importJson } from "../../utils/storage";
import { API_PROVIDER_PRESETS, CUSTOM_PROVIDER_ID } from "../../constants";
import type { AppData } from "../../types";
import "./SettingsModal.css";

interface SettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Modal for managing application settings
 */
export default function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const settings = useAppStore((s) => s.settings);
  const availableModels = useAppStore((s) => s.availableModels);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setAvailableModels = useAppStore((s) => s.setAvailableModels);
  const getClient = useAppStore((s) => s.getClient);

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
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel);
  const [glassEffectEnabled, setGlassEffectEnabled] = useState(
    settings.glassEffectEnabled ?? true,
  );
  const [showActiveModelIndicator, setShowActiveModelIndicator] = useState(
    settings.showActiveModelIndicator ?? true,
  );
  const [verifying, setVerifying] = useState(false);
  const [nukeModalOpen, setNukeModalOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState("");

  const nukeAll = useAppStore((s) => s.nukeAll);

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

    // Temporarily update settings to test the connection (include provider)
    updateSettings({ apiBaseUrl, apiKey, apiProvider: selectedProvider });

    try {
      const client = getClient();
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
    updateSettings,
    getClient,
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
      defaultModel,
      glassEffectEnabled,
    });
    onClose();
  }, [
    apiBaseUrl,
    apiKey,
    selectedProvider,
    streamingEnabled,
    defaultModel,
    glassEffectEnabled,
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
   * Handles active model indicator toggle - saves immediately
   */
  const handleActiveModelIndicatorChange = useCallback(
    (enabled: boolean) => {
      setShowActiveModelIndicator(enabled);
      updateSettings({ showActiveModelIndicator: enabled });
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
        // Update the store with imported data
        useAppStore.setState({
          models: data.models,
          chats: data.chats,
          ui: data.ui,
          settings: data.settings,
          availableModels: data.availableModels,
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
   * Closes the nuke modal and resets confirmation text
   */
  const closeNukeModal = useCallback(() => {
    setNukeModalOpen(false);
    setNukeConfirmText("");
  }, []);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Settings"
        size="lg"
        aria-labelledby="settings-modal-title"
      >
        <Tabs defaultValue="models" classNames={{ root: "settings-tabs" }}>
          <Tabs.List className="settings-tabs-list">
            <Tabs.Tab value="models">Models</Tabs.Tab>
            <Tabs.Tab value="interface">Interface</Tabs.Tab>
            <Tabs.Tab value="data">Data</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="models" pt="md">
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
              <Select
                label="Default remote model (used for titles & new models)"
                placeholder={
                  (availableModels?.length ?? 0) > 0
                    ? "Select a model"
                    : "Verify API to load models"
                }
                searchable
                disabled={(availableModels?.length ?? 0) === 0}
                data={(availableModels ?? []).map((m) => ({
                  value: m.id,
                  label: m.id,
                }))}
                value={defaultModel}
                onChange={(val) => setDefaultModel(val || defaultModel)}
                aria-label="Select default AI model"
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
              </div>

              <div className="data-section">
                <Text size="sm" fw={500} mb="xs">
                  Model Display
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Configure how model information is displayed.
                </Text>
                <Switch
                  label="Show remote model names"
                  description="Display the remote model name below each model chip"
                  checked={showActiveModelIndicator}
                  onChange={(e) =>
                    handleActiveModelIndicatorChange(e.currentTarget.checked)
                  }
                  aria-describedby="active-model-indicator-description"
                />
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

              <div className="data-section data-section-danger">
                <Text size="sm" fw={500} c="red" mb="xs">
                  Danger Zone
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Permanently delete all data including chats, models, and
                  settings.
                </Text>
                <Button
                  color="red"
                  variant="light"
                  onClick={() => setNukeModalOpen(true)}
                  aria-label="Nuke all data"
                >
                  Nuke All Data
                </Button>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs>
      </Modal>

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
