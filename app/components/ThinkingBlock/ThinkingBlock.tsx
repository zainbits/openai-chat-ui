import React, { useState, useCallback } from "react";
import { Brain, ChevronDown } from "lucide-react";
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
          <Brain size={16} />
        </span>
        <span className="thinking-label">Thinking</span>
        <span className="thinking-toggle">
          <ChevronDown
            className={`chevron ${isExpanded ? "rotated" : ""}`}
            size={16}
          />
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
