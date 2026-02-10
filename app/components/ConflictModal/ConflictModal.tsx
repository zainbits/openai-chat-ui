import React from "react";
import { Modal, Button, Text, Group, Badge, ScrollArea } from "@mantine/core";
import { Monitor, Cloud } from "lucide-react";
import type { CustomModel } from "../../types";
import { useAppStore } from "../../state/store";
import "./ConflictModal.css";

interface ConflictModalProps {
  opened: boolean;
  onClose: () => void;
  localModel: CustomModel;
  serverModel: CustomModel;
  onKeepLocal: () => void;
  onKeepServer: () => void;
  saving?: boolean;
}

/**
 * Format a date string for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unknown";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return "Unknown";
  }
}

/**
 * Compare two values and return if they differ
 */
function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Modal for resolving conflicts between local and server versions of a model
 */
export default function ConflictModal({
  opened,
  onClose,
  localModel,
  serverModel,
  onKeepLocal,
  onKeepServer,
  saving = false,
}: ConflictModalProps) {
  const blurAmount = useAppStore((s) => s.settings.lowSpecBlur ?? 8);
  const modalBackdropFilter = blurAmount > 0 ? `blur(${blurAmount}px)` : "none";

  // Find which fields differ
  const differences = {
    name: isDifferent(localModel.name, serverModel.name),
    color: isDifferent(localModel.color, serverModel.color),
    system: isDifferent(localModel.system, serverModel.system),
    temp: isDifferent(localModel.temp, serverModel.temp),
    thinkingEnabled: isDifferent(
      localModel.thinkingEnabled,
      serverModel.thinkingEnabled,
    ),
    thinkingEffort: isDifferent(
      localModel.thinkingEffort,
      serverModel.thinkingEffort,
    ),
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="⚠️ Conflict Detected"
      size="xl"
      centered
      classNames={{
        overlay: "glass-modal-overlay",
        content: "glass-modal-content",
        header: "glass-modal-header",
        body: "glass-modal-body",
        title: "glass-modal-title",
      }}
      styles={{
        content: {
          backdropFilter: modalBackdropFilter,
          WebkitBackdropFilter: modalBackdropFilter,
        },
      }}
    >
      <Text size="sm" c="dimmed" mb="md">
        This model was modified on another device. Choose which version to keep:
      </Text>

      <div className="conflict-comparison">
        {/* Local Version */}
        <div className="conflict-version conflict-version-local">
          <div className="conflict-version-header">
            <Badge
              color="blue"
              variant="light"
              leftSection={<Monitor size={12} />}
            >
              Your Changes
            </Badge>
            <Text size="xs" c="dimmed">
              {formatDate(localModel.updatedAt)}
            </Text>
          </div>

          <ScrollArea h={300} className="conflict-version-content">
            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Name
              </Text>
              <Text
                size="sm"
                className={differences.name ? "conflict-changed" : ""}
              >
                {localModel.name}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Color
              </Text>
              <div className="conflict-color-row">
                <div
                  className="conflict-color-swatch"
                  style={{ backgroundColor: localModel.color }}
                />
                <Text
                  size="sm"
                  className={differences.color ? "conflict-changed" : ""}
                >
                  {localModel.color}
                </Text>
              </div>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Temperature
              </Text>
              <Text
                size="sm"
                className={differences.temp ? "conflict-changed" : ""}
              >
                {localModel.temp}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Thinking
              </Text>
              <Text
                size="sm"
                className={
                  differences.thinkingEnabled || differences.thinkingEffort
                    ? "conflict-changed"
                    : ""
                }
              >
                {localModel.thinkingEnabled
                  ? `Enabled (${localModel.thinkingEffort || "medium"})`
                  : "Disabled"}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                System Prompt
              </Text>
              <Text
                size="sm"
                className={`conflict-system-prompt ${differences.system ? "conflict-changed" : ""}`}
              >
                {localModel.system || "(empty)"}
              </Text>
            </div>
          </ScrollArea>

          <Button
            fullWidth
            variant="filled"
            color="blue"
            onClick={onKeepLocal}
            loading={saving}
            mt="sm"
          >
            Keep My Changes
          </Button>
        </div>

        {/* Server Version */}
        <div className="conflict-version conflict-version-server">
          <div className="conflict-version-header">
            <Badge
              color="green"
              variant="light"
              leftSection={<Cloud size={12} />}
            >
              Server Version
            </Badge>
            <Text size="xs" c="dimmed">
              {formatDate(serverModel.updatedAt)}
            </Text>
          </div>

          <ScrollArea h={300} className="conflict-version-content">
            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Name
              </Text>
              <Text
                size="sm"
                className={differences.name ? "conflict-changed" : ""}
              >
                {serverModel.name}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Color
              </Text>
              <div className="conflict-color-row">
                <div
                  className="conflict-color-swatch"
                  style={{ backgroundColor: serverModel.color }}
                />
                <Text
                  size="sm"
                  className={differences.color ? "conflict-changed" : ""}
                >
                  {serverModel.color}
                </Text>
              </div>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Temperature
              </Text>
              <Text
                size="sm"
                className={differences.temp ? "conflict-changed" : ""}
              >
                {serverModel.temp}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                Thinking
              </Text>
              <Text
                size="sm"
                className={
                  differences.thinkingEnabled || differences.thinkingEffort
                    ? "conflict-changed"
                    : ""
                }
              >
                {serverModel.thinkingEnabled
                  ? `Enabled (${serverModel.thinkingEffort || "medium"})`
                  : "Disabled"}
              </Text>
            </div>

            <div className="conflict-field">
              <Text size="xs" fw={500} c="dimmed">
                System Prompt
              </Text>
              <Text
                size="sm"
                className={`conflict-system-prompt ${differences.system ? "conflict-changed" : ""}`}
              >
                {serverModel.system || "(empty)"}
              </Text>
            </div>
          </ScrollArea>

          <Button
            fullWidth
            variant="filled"
            color="green"
            onClick={onKeepServer}
            loading={saving}
            mt="sm"
          >
            Keep Server Version
          </Button>
        </div>
      </div>

      <Group justify="center" mt="md">
        <Button variant="subtle" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
}
