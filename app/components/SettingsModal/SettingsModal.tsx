import React, { useState } from "react";
import { Modal, Button, TextInput, Switch } from "@mantine/core";
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
  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    setVerifying(true);
    const client = new OpenAICompatibleClient({ apiBaseUrl, apiKey });
    const ok = await client.verify();
    setVerifying(false);
    if (ok) notifications.show({ message: "API verified", color: "green" });
    else notifications.show({ message: "Failed to verify API", color: "red" });
  };

  const save = () => {
    setData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        apiBaseUrl,
        apiKey: apiKey || undefined,
        streamingEnabled,
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

  const resetAll = () => {
    if (!confirm("Erase all data?")) return;
    wipeAll();
    window.location.reload();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="lg">
      <div className="modal-content">
        <TextInput
          label="API Base URL"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.currentTarget.value)}
        />
        <TextInput
          label="API Key (optional)"
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
        />
        <Switch
          label="Streaming enabled"
          checked={streamingEnabled}
          onChange={(e) => setStreamingEnabled(e.currentTarget.checked)}
        />
        <div className="modal-actions">
          <div className="modal-actions-group">
            <Button variant="light" onClick={exportData}>
              Export JSON
            </Button>
            <Button variant="light" onClick={importData}>
              Import JSON
            </Button>
            <Button color="red" variant="light" onClick={resetAll}>
              Reset
            </Button>
          </div>
          <div className="modal-actions-group">
            <Button variant="default" onClick={verify} loading={verifying}>
              Verify API
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
