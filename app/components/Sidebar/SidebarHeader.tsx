import React from "react";
import { Button } from "@mantine/core";
import { Settings } from "lucide-react";
import { useAppStore } from "../../state/store";
import { getConnectionStatusClass } from "../../theme/colors";
import type { ConnectionStatus } from "../../types";

/**
 * Returns display properties for a connection status
 */
function getConnectionDisplay(status?: ConnectionStatus) {
  switch (status) {
    case "connected":
      return {
        color: getConnectionStatusClass("connected"),
        text: "Connected",
        title: "API connection is working",
      };
    case "error":
      return {
        color: getConnectionStatusClass("error"),
        text: "Disconnected",
        title: "API connection failed",
      };
    case "connecting":
      return {
        color: getConnectionStatusClass("connecting"),
        text: "Connecting...",
        title: "Checking API connection",
      };
    default:
      return {
        color: getConnectionStatusClass("unknown"),
        text: "Unknown",
        title: "Connection status unknown",
      };
  }
}

interface SidebarHeaderProps {
  onSettingsClick: () => void;
}

export default function SidebarHeader({ onSettingsClick }: SidebarHeaderProps) {
  const apiBaseUrl = useAppStore((s) => s.settings.apiBaseUrl);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const { color, text, title } = getConnectionDisplay(connectionStatus);
  const statusClass = color.includes("green")
    ? "connected"
    : color.includes("red")
      ? "error"
      : color.includes("yellow")
        ? "connecting"
        : "unknown";

  return (
    <div className="sidebar-header">
      <div className="app-title">
        <h1>CustomModels Chat</h1>
        <div className="url" aria-label={`Connected to ${apiBaseUrl}`}>
          {apiBaseUrl}
        </div>
      </div>
      <div className="sidebar-controls">
        <Button
          variant="light"
          size="xs"
          onClick={onSettingsClick}
          className="settings-button"
          aria-label="Open settings"
        >
          <Settings size={16} />
        </Button>
        <div className="connection-status" role="status" aria-live="polite">
          <span
            className={`status-dot ${statusClass}`}
            title={title}
            aria-hidden="true"
          />
          <span
            className="status-text"
            aria-label={`Connection status: ${text}`}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
