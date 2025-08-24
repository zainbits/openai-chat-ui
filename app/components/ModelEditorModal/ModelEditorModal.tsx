import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  ColorInput,
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

  const remove = () => {
    if (!existing) return;
    if (!confirm("Delete this model?")) return;
    setData((d) => ({
      ...d,
      models: d.models.filter((m) => m.id !== existing.id),
    }));
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={existing ? "Edit Model" : "New Model"}
      size="lg"
    >
      <div className="modal-content">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
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
        />
        <Select
          label="Remote Model"
          searchable
          data={options}
          value={model}
          onChange={(val) => setModel(val || data.settings.defaultModel)}
        />
        <NumberInput
          label="Temperature"
          value={temp}
          onChange={(v) => setTemp(Number(v) || 0)}
          min={0}
          max={2}
          step={0.1}
          decimalScale={2}
        />
        <div className="modal-actions">
          {existing ? (
            <Button color="red" variant="light" onClick={remove}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="modal-actions-group">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
