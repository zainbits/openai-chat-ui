import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import { useAppStore } from "../../state/store";
import "./ModelPicker.css";

/**
 * Compact model picker for the composer area.
 * Displays the currently selected LLM model and allows quick selection from available models.
 */
export default function ModelPicker() {
  const availableModels = useAppStore((s) => s.availableModels);
  const selectedLlmModel = useAppStore((s) => s.ui.selectedLlmModel);
  const defaultModel = useAppStore((s) => s.settings.defaultModel);
  const setSelectedLlmModel = useAppStore((s) => s.setSelectedLlmModel);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Current effective model (selected or default)
  const currentModel = selectedLlmModel || defaultModel || null;

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!availableModels || availableModels.length === 0) return [];
    if (!searchQuery) return availableModels;
    const query = searchQuery.toLowerCase();
    return availableModels.filter((m) => m.id.toLowerCase().includes(query));
  }, [availableModels, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (modelId: string) => {
      setSelectedLlmModel(modelId);
      setIsOpen(false);
      setSearchQuery("");
    },
    [setSelectedLlmModel],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      } else if (e.key === "Enter" && filteredModels.length === 1) {
        handleSelect(filteredModels[0].id);
      }
    },
    [filteredModels, handleSelect],
  );

  // Truncate model name for display
  const displayName = useMemo(() => {
    if (!currentModel) return "Select model";
    // Show last 20 chars if too long
    if (currentModel.length > 24) {
      return "..." + currentModel.slice(-21);
    }
    return currentModel;
  }, [currentModel]);

  const hasModels = availableModels && availableModels.length > 0;

  return (
    <div className="model-picker" ref={containerRef}>
      <button
        type="button"
        className={`model-picker-trigger ${isOpen ? "open" : ""}`}
        onClick={handleToggle}
        disabled={!hasModels}
        title={currentModel || "No model selected"}
        aria-label={`Selected model: ${currentModel || "None"}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="model-picker-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
          </svg>
        </span>
        <span className="model-picker-name">{displayName}</span>
        <span className="model-picker-chevron">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && hasModels && (
        <div className="model-picker-dropdown" role="listbox">
          <div className="model-picker-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="model-picker-search-input"
              aria-label="Search models"
            />
          </div>
          <div className="model-picker-list">
            {filteredModels.length === 0 ? (
              <div className="model-picker-empty">No models found</div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`model-picker-option ${model.id === currentModel ? "selected" : ""}`}
                  onClick={() => handleSelect(model.id)}
                  role="option"
                  aria-selected={model.id === currentModel}
                >
                  <span className="model-picker-option-name">{model.id}</span>
                  {model.id === currentModel && (
                    <span className="model-picker-check">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
