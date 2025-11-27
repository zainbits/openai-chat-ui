import React, { useState, useCallback, useMemo } from "react";
import {
  Modal,
  Button,
  TextInput,
  Switch,
  Select,
  Text,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAppStore } from "../../state/store";
import { exportJson, importJson, wipeAll } from "../../utils/storage";
import { API_PROVIDER_PRESETS, CUSTOM_PROVIDER_ID } from "../../constants";
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
  const getFullState = () => {
    const state = useAppStore.getState();
    return {
      models: state.models,
      chats: state.chats,
      ui: state.ui,
      settings: state.settings,
      availableModels: state.availableModels,
    };
  };

  // Determine the initial provider from the current base URL
  const getProviderFromUrl = (url: string): string => {
    const preset = API_PROVIDER_PRESETS.find(
      (p) => p.id !== CUSTOM_PROVIDER_ID && p.baseUrl === url,
    );
    return preset ? preset.id : CUSTOM_PROVIDER_ID;
  };

  const [selectedProvider, setSelectedProvider] = useState(() =>
    getProviderFromUrl(settings.apiBaseUrl),
  );
  const [customBaseUrl, setCustomBaseUrl] = useState(() =>
    getProviderFromUrl(settings.apiBaseUrl) === CUSTOM_PROVIDER_ID
      ? settings.apiBaseUrl
      : "",
  );
  const [apiKey, setApiKey] = useState(settings.apiKey ?? "");
  const [streamingEnabled, setStreamingEnabled] = useState(
    settings.streamingEnabled,
  );
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel);
  const [verifying, setVerifying] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Compute the actual API base URL based on provider selection
  const apiBaseUrl = useMemo(() => {
    if (selectedProvider === CUSTOM_PROVIDER_ID) {
      return customBaseUrl;
    }
    const preset = API_PROVIDER_PRESETS.find((p) => p.id === selectedProvider);
    return preset?.baseUrl ?? "";
  }, [selectedProvider, customBaseUrl]);

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
    }
  }, []);

  /**
   * Verifies the API connection
   */
  const verify = useCallback(async () => {
    if (apiKey.length === 0) return;
    setVerifying(true);

    // Temporarily update settings to test the connection
    updateSettings({ apiBaseUrl, apiKey });

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
  }, [apiBaseUrl, apiKey, updateSettings, getClient, setAvailableModels]);

  /**
   * Saves the settings
   */
  const save = useCallback(() => {
    if (apiKey.length === 0) return;
    updateSettings({
      apiBaseUrl,
      apiKey,
      streamingEnabled,
      defaultModel,
    });
    onClose();
  }, [
    apiBaseUrl,
    apiKey,
    streamingEnabled,
    defaultModel,
    updateSettings,
    onClose,
  ]);

  /**
   * Exports app data as JSON
   */
  const exportData = useCallback(() => {
    const json = exportJson(getFullState() as any);
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
   * Resets all app data
   */
  const handleReset = useCallback(() => {
    wipeAll();
    window.location.reload();
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
        <div className="modal-content">
          <Select
            label="API Provider"
            data={providerOptions}
            value={selectedProvider}
            onChange={handleProviderChange}
            aria-label="Select API provider"
          />
          {selectedProvider === CUSTOM_PROVIDER_ID && (
            <TextInput
              label="Custom API Base URL"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.currentTarget.value)}
              placeholder="https://api.example.com/v1"
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
              <Button
                color="red"
                variant="light"
                onClick={() => setResetModalOpen(true)}
                aria-label="Reset all data"
              >
                Reset
              </Button>
            </div>
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
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        opened={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset All Data"
        size="sm"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to erase all data? This will delete all your
          chats, models, and settings. This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setResetModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleReset}>
            Reset Everything
          </Button>
        </Group>
      </Modal>
    </>
  );
}
