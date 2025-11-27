import React, { useState, useCallback } from "react";
import { useAppStore } from "../../state/store";
import ModelEditorModal from "../ModelEditorModal";
import GlassButton from "../GlassButton";
import "./ModelChips.css";

/**
 * Model selection chips displayed at the top of the chat area
 */
export default function ModelChips() {
  const models = useAppStore((s) => s.models);
  const createThread = useAppStore((s) => s.createThread);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | undefined>(
    undefined,
  );

  /**
   * Creates a new chat thread for the selected model
   */
  const selectModel = useCallback(
    (modelId: string) => {
      createThread(modelId);
    },
    [createThread],
  );

  /**
   * Opens the model editor for creating a new model
   */
  const openNewModelEditor = useCallback(() => {
    setEditingModelId(undefined);
    setEditorOpen(true);
  }, []);

  /**
   * Opens the model editor for editing an existing model
   */
  const openEditModelEditor = useCallback((modelId: string) => {
    setEditingModelId(modelId);
    setEditorOpen(true);
  }, []);

  return (
    <div className="model-chips" role="toolbar" aria-label="Model selection">
      {models.map((m) => (
        <div key={m.id} className="model-chip-container">
          <GlassButton
            onClick={() => selectModel(m.id)}
            width="auto"
            height={32}
            borderRadius={20}
            title={`${m.name} (${m.model})`}
            customColor={m.color}
            onContextMenu={(e) => {
              e.preventDefault();
              openEditModelEditor(m.id);
            }}
            aria-label={`Start new chat with ${m.name} model. Right-click to edit.`}
          >
            <span
              className="model-indicator"
              style={{ background: m.color }}
              aria-hidden="true"
            />
            {m.name}
          </GlassButton>
        </div>
      ))}
      <div style={{ flexGrow: 1 }} aria-hidden="true" />
      <div className="add-model-button">
        <GlassButton
          variant="round"
          width={32}
          onClick={openNewModelEditor}
          aria-label="Add new model"
        >
          <span aria-hidden="true">+</span>
        </GlassButton>
      </div>
      <ModelEditorModal
        opened={editorOpen}
        onClose={() => setEditorOpen(false)}
        modelId={editingModelId}
      />
    </div>
  );
}
