import React, { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../../state/store";
import "./ContextRing.css";

/**
 * Default context window sizes for common models (in tokens)
 * These are used when we can't determine the actual context window
 */
const DEFAULT_CONTEXT_WINDOW = 128000;

/**
 * Context window sizes by model pattern
 */
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // GPT models
  "gpt-4o": 128000,
  "gpt-4-turbo": 128000,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 16385,
  // Claude models
  claude: 200000,
  // Gemini models
  gemini: 1000000,
  // Default for unknown models
  default: DEFAULT_CONTEXT_WINDOW,
};

/**
 * Get the context window size for a model
 */
function getContextWindowForModel(modelId: string | null): number {
  if (!modelId) return DEFAULT_CONTEXT_WINDOW;

  const lowerModel = modelId.toLowerCase();

  // Check for model patterns
  for (const [pattern, size] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (lowerModel.includes(pattern)) {
      return size;
    }
  }

  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Format token count for display
 */
function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

interface ContextRingProps {
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
}

/**
 * Circular ring component showing context window usage
 * Shows a progress ring with tooltip on hover (desktop) or click (mobile)
 */
export default function ContextRing({
  size = 32,
  strokeWidth = 3,
}: ContextRingProps) {
  // Read token usage from the active thread (persisted) with fallback to streaming state
  const activeThreadId = useAppStore((s) => s.ui.activeThread);
  const activeThread = useAppStore((s) =>
    activeThreadId ? s.chats[activeThreadId] : null,
  );
  const streamingTokenUsage = useAppStore((s) => s.tokenUsage);
  // Prefer persisted thread token usage, fallback to streaming state for live updates
  const tokenUsage = activeThread?.tokenUsage ?? streamingTokenUsage;
  const selectedLlmModel = useAppStore((s) => s.ui.selectedLlmModel);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const ringRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update tooltip position when showing
  useEffect(() => {
    if (showTooltip && ringRef.current) {
      const rect = ringRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 16, // 16px gap above the ring
        left: rect.left + rect.width / 2,
      });
    }
  }, [showTooltip]);

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !showTooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        ringRef.current &&
        !ringRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMobile, showTooltip]);

  const handleInteraction = useCallback(() => {
    if (isMobile) {
      setShowTooltip((prev) => !prev);
    }
  }, [isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setShowTooltip(true);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setShowTooltip(false);
    }
  }, [isMobile]);

  // Calculate ring values
  const contextWindow = getContextWindowForModel(selectedLlmModel);
  const usedTokens = tokenUsage?.total_tokens ?? 0;
  const percentage = Math.min((usedTokens / contextWindow) * 100, 100);

  // SVG circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on usage percentage
  const getProgressColor = (pct: number): string => {
    if (pct >= 90) return "var(--color-danger-500)";
    if (pct >= 75) return "var(--color-warning-500)";
    return "var(--color-white-alpha-20)";
  };

  const progressColor = getProgressColor(percentage);

  // Don't render if no usage data yet
  if (!tokenUsage) {
    return (
      <div
        className="context-ring-container"
        style={{ width: size, height: size }}
      >
        <svg
          className="context-ring-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            className="context-ring-background"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={ringRef}
      className="context-ring-container"
      style={{ width: size, height: size }}
      onClick={handleInteraction}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Context usage: ${formatTokenCount(usedTokens)} of ${formatTokenCount(contextWindow)} tokens (${percentage.toFixed(0)}%)`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleInteraction();
        }
      }}
    >
      <svg
        className="context-ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          className="context-ring-background"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          className="context-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={progressColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      {/* Tooltip rendered via portal */}
      {showTooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className="context-ring-tooltip"
            style={{
              position: "fixed",
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="context-ring-tooltip-header">Context Usage</div>
            <div className="context-ring-tooltip-stats">
              <div className="context-ring-tooltip-row">
                <span className="context-ring-tooltip-label">Prompt</span>
                <span className="context-ring-tooltip-value">
                  {formatTokenCount(tokenUsage.prompt_tokens)}
                </span>
              </div>
              <div className="context-ring-tooltip-row">
                <span className="context-ring-tooltip-label">Completion</span>
                <span className="context-ring-tooltip-value">
                  {formatTokenCount(tokenUsage.completion_tokens)}
                </span>
              </div>
              <div className="context-ring-tooltip-divider" />
              <div className="context-ring-tooltip-row context-ring-tooltip-total">
                <span className="context-ring-tooltip-label">Total</span>
                <span className="context-ring-tooltip-value">
                  {formatTokenCount(usedTokens)} /{" "}
                  {formatTokenCount(contextWindow)}
                </span>
              </div>
              <div className="context-ring-tooltip-percentage">
                {percentage.toFixed(1)}% used
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
