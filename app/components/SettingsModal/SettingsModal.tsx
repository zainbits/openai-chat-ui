import React, { useState } from "react";
import { Modal, Button, TextInput, Switch, Select, Text, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAppState } from "../../state/AppState";
import { OpenAICompatibleClient } from "../../api/client";
import { exportJson, importJson, wipeAll } from "../../utils/storage";
import "./SettingsModal.css";

export default function SettingsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { data, setData } = useAppState();
  const [apiBaseUrl, setApiBaseUrl] = useState(data.settings.apiBaseUrl);
  const [apiKey, setApiKey] = useState(data.settings.apiKey ?? "");
  const [streamingEnabled, setStreamingEnabled] = useState(
    data.settings.streamingEnabled,
  );
  const [defaultModel, setDefaultModel] = useState(data.settings.defaultModel);
  const [verifying, setVerifying] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const verify = async () => {
    setVerifying(true);
    const client = new OpenAICompatibleClient({ apiBaseUrl, apiKey });
    const ok = await client.verify();
    if (ok) {
      try {
        // Also load models so the default model selector has options immediately
        const models = await client.listModels();
        setData((d) => ({ ...d, availableModels: models }));
      } catch {
        // ignore, AppState will try periodically as well
      }
      notifications.show({ message: "API verified", color: "green" });
    } else {
      notifications.show({ message: "Failed to verify API", color: "red" });
    }
    setVerifying(false);
  };

  const save = () => {
    setData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        apiBaseUrl,
        apiKey: apiKey || undefined,
        streamingEnabled,
        defaultModel,
      },
    }));
    onClose();
  };

  const exportData = () => {
    const json = exportJson(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custommodels-chat.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const next = importJson(text);
        setData(next);
        notifications.show({ message: "Data imported", color: "green" });
      } catch (e) {
        notifications.show({ message: "Invalid JSON", color: "red" });
      }
    };
    input.click();
  };

  const handleReset = () => {
    wipeAll();
    window.location.reload();
  };

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
          <TextInput
            label="API Base URL"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.currentTarget.value)}
            aria-describedby="api-url-description"
          />
          <TextInput
            label="API Key (optional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            type="password"
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
              (data.availableModels?.length ?? 0) > 0
                ? "Select a model"
                : "Verify API to load models"
            }
            searchable
            disabled={(data.availableModels?.length ?? 0) === 0}
            data={(data.availableModels ?? []).map((m) => ({
              value: m.id,
              label: m.id,
            }))}
            value={defaultModel}
            onChange={(val) => setDefaultModel(val || defaultModel)}
            aria-label="Select default AI model"
          />
          <div className="modal-actions">
            <div className="modal-actions-group">
              <Button variant="light" onClick={exportData} aria-label="Export settings as JSON file">
                Export JSON
              </Button>
              <Button variant="light" onClick={importData} aria-label="Import settings from JSON file">
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
              <Button variant="default" onClick={verify} loading={verifying} aria-label="Verify API connection">
                Verify API
              </Button>
              <Button onClick={save} aria-label="Save settings">Save</Button>
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
          Are you sure you want to erase all data? This will delete all your chats, models, and settings. This action cannot be undone.
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
