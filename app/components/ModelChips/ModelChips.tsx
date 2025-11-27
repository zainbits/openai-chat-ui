import React, { useState } from "react";
import { useAppState, createThreadForModel } from "../../state/AppState";
import ModelEditorModal from "../ModelEditorModal";
import GlassButton from "../GlassButton";
import "./ModelChips.css";

export default function ModelChips() {
  const { data, setData } = useAppState();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | undefined>(
    undefined,
  );

  const selectModel = (modelId: string) => {
    // Create a new thread for selected model
    const thread = createThreadForModel(modelId);
    setData((d) => ({
      ...d,
      chats: { ...d.chats, [thread.id]: thread },
      ui: { ...d.ui, activeThread: thread.id, sidebarOpen: true },
    }));
  };

  return (
    <div className="model-chips" role="toolbar" aria-label="Model selection">
      {data.models.map((m) => (
        <div key={m.id} className="model-chip-container">
          <GlassButton
            onClick={() => selectModel(m.id)}
            width="auto"
            height={32}
            borderRadius={20}
            title={`${m.name} (${m.model})`}
            customColor={m.color}
            onContextMenu={(e) => {
              // Prevent context menu on long press for mobile
              e.preventDefault();
              setEditingModelId(m.id);
              setEditorOpen(true);
            }}
            aria-label={`Start new chat with ${m.name} model. Right-click to edit.`}
          >
            <span className="model-indicator" style={{ background: m.color }} aria-hidden="true" />
            {m.name}
          </GlassButton>
        </div>
      ))}
      <div style={{ flexGrow: 1 }} aria-hidden="true" />
      <div className="add-model-button">
        <GlassButton
          variant="round"
          width={32}
          onClick={() => {
            setEditingModelId(undefined);
            setEditorOpen(true);
          }}
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
