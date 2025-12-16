import React, { useState, useCallback } from "react";
import {
  useAppStore,
  selectActiveThread,
  selectActiveModel,
} from "../../state/store";
import ModelEditorModal from "../ModelEditorModal";
import GlassButton from "../GlassButton";
import "./ModelChips.css";

/**
 * Model selection chips displayed at the top of the chat area
 */
export default function ModelChips() {
  const models = useAppStore((s) => s.models);
  const createThread = useAppStore((s) => s.createThread);
  const updateThreadModel = useAppStore((s) => s.updateThreadModel);
  const activeThread = useAppStore(selectActiveThread);
  const activeModel = useAppStore(selectActiveModel);
  const showActiveModelIndicator = useAppStore(
    (s) => s.settings.showActiveModelIndicator ?? true,
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | undefined>(
    undefined,
  );

  /**
   * Selects a model - reuses empty active thread or creates a new one
   */
  const selectModel = useCallback(
    (modelId: string) => {
      // If there's an active thread with no messages, just switch its model
      if (activeThread && activeThread.messages.length === 0) {
        updateThreadModel(activeThread.id, modelId);
      } else {
        createThread(modelId);
      }
    },
    [activeThread, createThread, updateThreadModel],
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
    <div className="model-chips-wrapper">
      <div className="model-chips" role="toolbar" aria-label="Model selection">
        {models.map((m) => {
          const isActive = activeModel?.id === m.id;
          return (
            <div key={m.id} className="model-chip-container">
              <GlassButton
                onClick={() => selectModel(m.id)}
                width="auto"
                height={showActiveModelIndicator ? 44 : 32}
                borderRadius={20}
                title={`${m.name} (${m.model})`}
                customColor={m.color}
                className={isActive ? "model-chip-active" : ""}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openEditModelEditor(m.id);
                }}
                aria-label={`Start new chat with ${m.name} model. Right-click to edit.`}
                aria-pressed={isActive}
              >
                <div className="model-chip-content">
                  <div className="model-chip-main">
                    <span
                      className="model-indicator"
                      style={{ background: m.color }}
                      aria-hidden="true"
                    />
                    {m.name}
                    {isActive && (
                      <svg
                        className="active-check"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  {showActiveModelIndicator && (
                    <span className="chip-model-name" title={m.model}>
                      {m.model}
                    </span>
                  )}
                </div>
              </GlassButton>
            </div>
          );
        })}
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
      </div>
      <ModelEditorModal
        opened={editorOpen}
        onClose={() => setEditorOpen(false)}
        modelId={editingModelId}
      />
    </div>
  );
}
