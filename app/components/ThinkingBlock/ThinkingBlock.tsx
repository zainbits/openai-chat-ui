import React, { useState, useCallback } from "react";
import { useAppStore } from "../../state/store";
import { renderMarkdown } from "../../utils/markdown";
import "./ThinkingBlock.css";

interface ThinkingBlockProps {
  thinking: string;
}

/**
 * Collapsible block for displaying AI thinking/reasoning content
 * Respects the user's preference for expanded/collapsed default state
 */
export default function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const showThinkingExpanded = useAppStore(
    (s) => s.settings.showThinkingExpanded ?? true,
  );
  const [isExpanded, setIsExpanded] = useState(showThinkingExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (!thinking) return null;

  return (
    <div className={`thinking-block ${isExpanded ? "expanded" : "collapsed"}`}>
      <button
        className="thinking-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls="thinking-content"
      >
        <span className="thinking-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </span>
        <span className="thinking-label">Thinking</span>
        <span className="thinking-toggle">
          <svg
            className={`chevron ${isExpanded ? "rotated" : ""}`}
            width="16"
            height="16"
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
      {isExpanded && (
        <div
          id="thinking-content"
          className="thinking-content"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(thinking),
          }}
        />
      )}
    </div>
  );
}
