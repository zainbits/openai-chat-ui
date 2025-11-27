import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  ColorInput,
  Text,
  Group,
} from "@mantine/core";
import { useAppState } from "../../state/AppState";
import { getModelColor } from "../../theme/colors";
import "./ModelEditorModal.css";

export default function ModelEditorModal({
  opened,
  onClose,
  modelId,
}: {
  opened: boolean;
  onClose: () => void;
  modelId?: string;
}) {
  const { data, setData } = useAppState();
  const existing = useMemo(
    () => data.models.find((m) => m.id === modelId),
    [data.models, modelId],
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? getModelColor());
  const [system, setSystem] = useState(existing?.system ?? "");
  const [model, setModel] = useState(
    existing?.model ?? data.settings.defaultModel,
  );
  const [temp, setTemp] = useState(existing?.temp ?? 0.7);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    setName(existing?.name ?? "");
    setColor(existing?.color ?? getModelColor());
    setSystem(existing?.system ?? "");
    setModel(existing?.model ?? data.settings.defaultModel);
    setTemp(existing?.temp ?? 0.7);
  }, [existing, data.settings.defaultModel]);

  const available = data.availableModels ?? [];
  const options = available.map((m) => ({ value: m.id, label: m.id }));

  const save = () => {
    if (!name.trim()) return;
    if (existing) {
      setData((d) => ({
        ...d,
        models: d.models.map((mm) =>
          mm.id === existing.id
            ? { ...mm, name, color, system, model, temp }
            : mm,
        ),
      }));
    } else {
      const id =
        name.toLowerCase().replace(/\s+/g, "-") +
        "-" +
        Math.random().toString(36).slice(2, 5);
      setData((d) => ({
        ...d,
        models: [...d.models, { id, name, color, system, model, temp }],
      }));
    }
    onClose();
  };

  const handleDelete = () => {
    if (!existing) return;
    setData((d) => ({
      ...d,
      models: d.models.filter((m) => m.id !== existing.id),
    }));
    setDeleteModalOpen(false);
    onClose();
  };

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
            onChange={(val) => setModel(val || data.settings.defaultModel)}
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
              <Button onClick={save} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Model"
        size="sm"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to delete the model "{existing?.name}"? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
