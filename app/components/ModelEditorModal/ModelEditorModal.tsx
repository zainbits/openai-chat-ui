import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  ColorInput,
} from "@mantine/core";
import { useAppStore } from "../../state/store";
import { getModelColor } from "../../theme/colors";
import { DEFAULT_CHAT_TEMPERATURE } from "../../constants";
import ConfirmModal from "../ConfirmModal";
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
  const availableModels = useAppStore((s) => s.availableModels);
  const defaultModel = useAppStore((s) => s.settings.defaultModel);
  const addModel = useAppStore((s) => s.addModel);
  const updateModel = useAppStore((s) => s.updateModel);
  const deleteModel = useAppStore((s) => s.deleteModel);

  const existing = useMemo(
    () => models.find((m) => m.id === modelId),
    [models, modelId],
  );

  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? getModelColor());
  const [system, setSystem] = useState(existing?.system ?? "");
  const [model, setModel] = useState(existing?.model ?? defaultModel);
  const [temp, setTemp] = useState(existing?.temp ?? DEFAULT_CHAT_TEMPERATURE);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Reset form when modal opens or model changes
  useEffect(() => {
    setName(existing?.name ?? "");
    setColor(existing?.color ?? getModelColor());
    setSystem(existing?.system ?? "");
    setModel(existing?.model ?? defaultModel);
    setTemp(existing?.temp ?? DEFAULT_CHAT_TEMPERATURE);
  }, [existing, defaultModel]);

  const options = (availableModels ?? []).map((m) => ({
    value: m.id,
    label: m.id,
  }));

  /**
   * Saves the model (creates new or updates existing)
   */
  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    if (existing) {
      updateModel(existing.id, { name, color, system, model, temp });
    } else {
      addModel({ name, color, system, model, temp });
    }
    onClose();
  }, [
    name,
    color,
    system,
    model,
    temp,
    existing,
    addModel,
    updateModel,
    onClose,
  ]);

  /**
   * Deletes the model
   */
  const handleDelete = useCallback(() => {
    if (!existing) return;
    deleteModel(existing.id);
    onClose();
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
            minRows={3}
            value={system}
            onChange={(e) => setSystem(e.currentTarget.value)}
            aria-describedby="system-prompt-description"
          />
          <Select
            label="Remote Model"
            searchable
            data={options}
            value={model}
            onChange={(val) => setModel(val || defaultModel)}
            aria-label="Select the remote AI model to use"
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
          <div className="modal-actions">
            {existing ? (
              <Button
                color="red"
                variant="light"
                onClick={() => setDeleteModalOpen(true)}
                aria-label="Delete this model"
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="modal-actions-group">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                Save
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
    </>
  );
}
