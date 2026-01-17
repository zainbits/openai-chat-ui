import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../../state/store";
import BlurSurface from "../BlurSurface";
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
  const [dropdownPosition, setDropdownPosition] = useState<React.CSSProperties>(
    {},
  );
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
      // Check if click is inside the dropdown portal
      const dropdown = document.querySelector(".model-picker-dropdown");
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdown &&
        !dropdown.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the dropdown
      const dropdown = document.querySelector(".model-picker-dropdown");
      if (dropdown && dropdown.contains(event.target as Node)) {
        return;
      }
      // Only close if scrolling on body or main content area, not arbitrary elements
      const target = event.target as Element;
      if (
        target === document.documentElement ||
        target === document.body ||
        target.classList.contains("messages-container") ||
        target.classList.contains("chat-area")
      ) {
        setIsOpen(false);
      }
    };

    // On mobile/touch devices, don't close on resize - it's usually the keyboard
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const handleResize = () => {
      if (!isTouchDevice) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Close on scroll to avoid position issues (but not when scrolling inside dropdown)
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens (but not on mobile to prevent keyboard issues)
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Don't auto-focus on mobile/touch devices - the keyboard opening causes
      // a resize event which closes the dropdown immediately
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      if (!isMobile && !isTouchDevice) {
        // Use requestAnimationFrame to wait for portal to render
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
    }
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        position: "fixed",
        bottom: `${window.innerHeight - rect.top + 8}px`,
        left: `${rect.left}px`,
        zIndex: "var(--z-index-dropdown)" as unknown as number,
      });
    }
  }, []);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen, updatePosition]);

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

      {isOpen &&
        hasModels &&
        createPortal(
          <BlurSurface
            className="model-picker-dropdown"
            role="listbox"
            width="auto"
            height="auto"
            borderRadius={8}
            padding={0}
            style={dropdownPosition}
          >
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
          </BlurSurface>,
          document.body,
        )}
    </div>
  );
}
