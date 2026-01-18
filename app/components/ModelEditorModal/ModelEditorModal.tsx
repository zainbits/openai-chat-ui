import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  ColorInput,
  Switch,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAppStore } from "../../state/store";
import { getModelColor } from "../../theme/colors";
import { DEFAULT_CHAT_TEMPERATURE } from "../../constants";
import type { CustomModel, ThinkingEffort } from "../../types";
import ConfirmModal from "../ConfirmModal";
import ConflictModal from "../ConflictModal";
import "./ModelEditorModal.css";

interface ModelEditorModalProps {
  opened: boolean;
  onClose: () => void;
  modelId?: string;
}

/**
 * Modal for creating and editing custom model configurations
 */
export default function ModelEditorModal({
  opened,
  onClose,
  modelId,
}: ModelEditorModalProps) {
  const models = useAppStore((s) => s.models);
  const addModel = useAppStore((s) => s.addModel);
  const updateModel = useAppStore((s) => s.updateModel);
  const deleteModel = useAppStore((s) => s.deleteModel);
  const getSyncClient = useAppStore((s) => s.getSyncClient);
  const setModels = useAppStore((s) => s.setModels);

  const existing = useMemo(
    () => models.find((m) => m.id === modelId),
    [models, modelId],
  );

  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? getModelColor());
  const [system, setSystem] = useState(existing?.system ?? "");
  const [temp, setTemp] = useState(existing?.temp ?? DEFAULT_CHAT_TEMPERATURE);
  const [thinkingEnabled, setThinkingEnabled] = useState(
    existing?.thinkingEnabled ?? false,
  );
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>(
    existing?.thinkingEffort ?? "medium",
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Conflict resolution state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [serverModel, setServerModel] = useState<CustomModel | null>(null);
  const [localModelSnapshot, setLocalModelSnapshot] =
    useState<CustomModel | null>(null);

  // Track the original updatedAt when we started editing
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState<
    string | undefined
  >(existing?.updatedAt);

  // Reset form when modal opens or model changes
  useEffect(() => {
    setName(existing?.name ?? "");
    setColor(existing?.color ?? getModelColor());
    setSystem(existing?.system ?? "");
    setTemp(existing?.temp ?? DEFAULT_CHAT_TEMPERATURE);
    setThinkingEnabled(existing?.thinkingEnabled ?? false);
    setThinkingEffort(existing?.thinkingEffort ?? "medium");
    // Track original timestamp for conflict detection
    setOriginalUpdatedAt(existing?.updatedAt);
  }, [existing]);

  /**
   * Build the current local model from form state
   */
  const buildLocalModel = useCallback((): CustomModel => {
    return {
      id: existing?.id ?? "",
      name,
      color,
      system,
      temp,
      thinkingEnabled,
      thinkingEffort,
      updatedAt: new Date().toISOString(),
    };
  }, [
    existing?.id,
    name,
    color,
    system,
    temp,
    thinkingEnabled,
    thinkingEffort,
  ]);

  /**
   * Force save the model (skip conflict check - used after user chooses to keep local)
   */
  const forceSave = useCallback(
    async (modelToSave?: CustomModel) => {
      const saveData = modelToSave ?? buildLocalModel();

      setSaving(true);
      try {
        let result;
        if (existing) {
          result = await updateModel(existing.id, {
            name: saveData.name,
            color: saveData.color,
            system: saveData.system,
            temp: saveData.temp,
            thinkingEnabled: saveData.thinkingEnabled,
            thinkingEffort: saveData.thinkingEffort,
          });
        } else {
          result = await addModel({
            name: saveData.name,
            color: saveData.color,
            system: saveData.system,
            temp: saveData.temp,
            thinkingEnabled: saveData.thinkingEnabled,
            thinkingEffort: saveData.thinkingEffort,
          });
        }

        if (result.success) {
          notifications.show({
            message: existing ? "Model updated" : "Model created",
            color: "green",
          });
          setConflictModalOpen(false);
          onClose();
        } else {
          notifications.show({
            message: result.error || "Failed to save model",
            color: "red",
          });
        }
      } catch (err) {
        notifications.show({
          message: err instanceof Error ? err.message : "Failed to save model",
          color: "red",
        });
      } finally {
        setSaving(false);
      }
    },
    [existing, addModel, updateModel, onClose, buildLocalModel],
  );

  /**
   * Saves the model (creates new or updates existing)
   * Cloud-first: checks for conflicts, then saves to MongoDB
   */
  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    // For new models, no conflict check needed
    if (!existing) {
      await forceSave();
      return;
    }

    // Check for conflicts by fetching the current server version
    const client = getSyncClient();
    if (client) {
      setSaving(true);
      try {
        const serverResult = await client.fetchModel(existing.id);

        if (serverResult.success && serverResult.model) {
          const serverVersion = serverResult.model;

          // Check if server version is newer than when we started editing
          if (
            serverVersion.updatedAt &&
            originalUpdatedAt &&
            serverVersion.updatedAt !== originalUpdatedAt
          ) {
            // Conflict detected! Show resolution modal
            setServerModel(serverVersion);
            setLocalModelSnapshot(buildLocalModel());
            setConflictModalOpen(true);
            setSaving(false);
            return;
          }
        }
      } catch (err) {
        // If conflict check fails, proceed with save anyway
        console.warn("Conflict check failed, proceeding with save:", err);
      }
    }

    // No conflict or cloud not configured - proceed with save
    await forceSave();
  }, [
    name,
    existing,
    getSyncClient,
    originalUpdatedAt,
    buildLocalModel,
    forceSave,
  ]);

  /**
   * Handle keeping local version (overwrite server)
   */
  const handleKeepLocal = useCallback(async () => {
    if (localModelSnapshot) {
      await forceSave(localModelSnapshot);
    }
  }, [localModelSnapshot, forceSave]);

  /**
   * Handle keeping server version (discard local changes)
   */
  const handleKeepServer = useCallback(() => {
    if (serverModel) {
      // Update local cache with server version
      setModels(models.map((m) => (m.id === serverModel.id ? serverModel : m)));
      notifications.show({
        message: "Kept server version",
        color: "green",
      });
      setConflictModalOpen(false);
      onClose();
    }
  }, [serverModel, models, setModels, onClose]);

  /**
   * Deletes the model from cloud
   */
  const handleDelete = useCallback(async () => {
    if (!existing) return;

    setDeleting(true);
    try {
      const result = await deleteModel(existing.id);
      if (result.success) {
        notifications.show({
          message: `Deleted "${existing.name}"`,
          color: "green",
        });
        onClose();
      } else {
        notifications.show({
          message: result.error || "Failed to delete model",
          color: "red",
        });
      }
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : "Failed to delete model",
        color: "red",
      });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }, [existing, deleteModel, onClose]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={existing ? "Edit Model" : "New Model"}
        size="lg"
        aria-labelledby="model-editor-title"
      >
        <div className="modal-content">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
            aria-required="true"
          />
          <ColorInput
            label="Color"
            value={color}
            onChange={setColor}
            format="hex"
            disallowInput
          />
          <Textarea
            label="System Prompt"
            minRows={4}
            maxRows={12}
            autosize
            value={system}
            onChange={(e) => setSystem(e.currentTarget.value)}
            aria-describedby="system-prompt-description"
            classNames={{ input: "system-prompt-textarea" }}
          />
          <NumberInput
            label="Temperature"
            value={temp}
            onChange={(v) => setTemp(Number(v) || 0)}
            min={0}
            max={2}
            step={0.1}
            decimalScale={2}
            aria-describedby="temperature-description"
          />
          <Switch
            label="Thinking"
            description="Enable reasoning/thinking mode (only works for models/APIs that support it)"
            checked={thinkingEnabled}
            onChange={(e) => setThinkingEnabled(e.currentTarget.checked)}
          />
          {thinkingEnabled && (
            <Select
              label="Thinking Effort"
              description="Controls thinking depth (maps to budget_tokens for Anthropic/Gemini, reasoning_effort for OpenAI)"
              data={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={thinkingEffort}
              onChange={(val) =>
                setThinkingEffort((val as ThinkingEffort) || "medium")
              }
            />
          )}
          <div className="modal-actions">
            {existing ? (
              <Button
                color="red"
                variant="light"
                onClick={() => setDeleteModalOpen(true)}
                disabled={saving || deleting}
                aria-label="Delete this model"
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="modal-actions-group">
              <Button variant="default" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                loading={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Model"
        message={`Are you sure you want to delete the model "${existing?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* Conflict Resolution Modal */}
      {localModelSnapshot && serverModel && (
        <ConflictModal
          opened={conflictModalOpen}
          onClose={() => setConflictModalOpen(false)}
          localModel={localModelSnapshot}
          serverModel={serverModel}
          onKeepLocal={handleKeepLocal}
          onKeepServer={handleKeepServer}
          saving={saving}
        />
      )}
    </>
  );
}
