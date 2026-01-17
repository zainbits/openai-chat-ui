/**
 * Design Token System - TypeScript Integration
 *
 * This file provides type-safe access to CSS custom properties defined in variables.css.
 * The source of truth for colors is variables.css - this file provides:
 * 1. TypeScript types for color tokens
 * 2. Helper functions to access CSS variables
 * 3. Semantic color getters for common use cases
 *
 * IMPORTANT: When adding new colors, add them to variables.css first, then add the
 * corresponding CSS variable reference here.
 */

// =============================================================================
// CSS Variable Accessors
// =============================================================================

/**
 * Get a CSS variable value. Useful for inline styles in React components.
 * Returns the var() syntax for use in CSS-in-JS.
 */
export const cssVar = (name: string, fallback?: string): string => {
  if (fallback) {
    return `var(--${name}, ${fallback})`;
  }
  return `var(--${name})`;
};

/**
 * Get the computed value of a CSS variable at runtime.
 * Useful when you need the actual color value (e.g., for canvas operations).
 */
export const getCSSVarValue = (name: string): string => {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
};

// =============================================================================
// Primitive Color Tokens (Direct Values)
// These mirror the CSS variables for use in JavaScript when needed.
// =============================================================================

export const primitiveColors = {
  white: "#ffffff",
  black: "#000000",

  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },

  success: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },

  danger: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },

  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },

  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },

  sky: {
    400: "#38bdf8",
    500: "#0ea5e9",
  },

  slate: {
    900: "#212121",
  },
} as const;

// =============================================================================
// Semantic Token Getters (CSS Variable References)
// These return CSS var() syntax for use in inline styles.
// =============================================================================

export const tokens = {
  // Text colors
  text: {
    primary: cssVar("text-primary"),
    secondary: cssVar("text-secondary"),
    muted: cssVar("text-muted"),
    disabled: cssVar("text-disabled"),
    inverse: cssVar("text-inverse"),
  },

  // Background colors
  bg: {
    body: cssVar("bg-body"),
    surface: cssVar("bg-surface"),
    surfaceHover: cssVar("bg-surface-hover"),
    surfaceActive: cssVar("bg-surface-active"),
    overlay: cssVar("bg-overlay"),
    elevated: cssVar("bg-elevated"),
  },

  // Border colors
  border: {
    primary: cssVar("border-primary"),
    secondary: cssVar("border-secondary"),
    accent: cssVar("border-accent"),
  },

  // Interactive states
  interactive: {
    hover: cssVar("interactive-hover"),
    pressed: cssVar("interactive-pressed"),
    focus: cssVar("interactive-focus"),
    disabled: cssVar("interactive-disabled"),
  },

  // Status indicators
  status: {
    connected: cssVar("status-connected"),
    connecting: cssVar("status-connecting"),
    error: cssVar("status-error"),
    unknown: cssVar("status-unknown"),
  },

  // Model indicators
  model: {
    default: cssVar("model-default"),
    general: cssVar("model-general"),
    linux: cssVar("model-linux"),
    creative: cssVar("model-creative"),
  },

  // Scrollbar
  scrollbar: {
    track: cssVar("scrollbar-track"),
    thumb: cssVar("scrollbar-thumb"),
    thumbHover: cssVar("scrollbar-thumb-hover"),
  },

  // Shadows
  shadow: {
    light: cssVar("shadow-color-light"),
    medium: cssVar("shadow-color-medium"),
    heavy: cssVar("shadow-color-heavy"),
    primaryGlow: cssVar("shadow-primary-glow"),
    primarySubtle: cssVar("shadow-primary-subtle"),
  },

  // Accent colors
  accent: {
    primary: cssVar("accent-primary"),
    primaryLight: cssVar("accent-primary-light"),
    danger: cssVar("accent-danger"),
    dangerLight: cssVar("accent-danger-light"),
    dangerBg: cssVar("accent-danger-bg"),
  },
} as const;

// =============================================================================
// Status Type Definitions
// =============================================================================

export type StatusType = "connected" | "connecting" | "error" | "unknown";
export type ModelType = "default" | "general" | "linux" | "creative";
export type ColorVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info";

// =============================================================================
// Semantic Helper Functions
// =============================================================================

/**
 * Get the color for a connection status indicator.
 * Returns the actual hex color value for inline styles.
 */
export const getStatusColor = (status: StatusType): string => {
  const statusColors: Record<StatusType, string> = {
    connected: primitiveColors.success[500],
    connecting: primitiveColors.warning[500],
    error: primitiveColors.danger[500],
    unknown: primitiveColors.gray[500],
  };
  return statusColors[status];
};

/**
 * Get the CSS variable for a connection status indicator.
 * Use this when you want the CSS variable reference instead of the raw value.
 */
export const getStatusCSSVar = (status: StatusType): string => {
  return cssVar(`status-${status}`);
};

/**
 * Get the color for a model type indicator.
 * Returns the actual hex color value for inline styles.
 */
export const getModelColor = (modelType?: ModelType): string => {
  const modelColors: Record<ModelType, string> = {
    default: primitiveColors.primary[400],
    general: primitiveColors.primary[400],
    linux: primitiveColors.success[400],
    creative: primitiveColors.sky[400],
  };
  return modelType ? modelColors[modelType] : modelColors.default;
};

/**
 * Get the color for button variants.
 * Returns the actual hex color value for inline styles.
 */
export const getButtonColor = (variant: ColorVariant): string => {
  const variantMap: Record<ColorVariant, string> = {
    primary: primitiveColors.primary[500],
    secondary: primitiveColors.primary[500],
    success: primitiveColors.success[500],
    danger: primitiveColors.danger[500],
    warning: primitiveColors.warning[500],
    info: primitiveColors.sky[500],
  };
  return variantMap[variant];
};

/**
 * Get the focus ring color.
 */
export const getFocusColor = (): string => {
  return "#0a84ff"; // Apple-style focus ring
};

// =============================================================================
// Legacy Compatibility Exports
// These maintain backwards compatibility with existing code.
// TODO: Migrate usages to new naming, then remove these.
// =============================================================================

/** @deprecated Use primitiveColors instead */
export const colors = primitiveColors;

/** @deprecated Use tokens instead */
export const appTheme = {
  text: {
    primary: primitiveColors.white,
    secondary: "rgba(255, 255, 255, 0.9)",
    muted: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.5)",
    inverse: primitiveColors.black,
  },
  background: {
    body: primitiveColors.slate[900],
    surface: "#181818",
    surfaceHover: "rgba(255, 255, 255, 0.15)",
    surfaceActive: "rgba(255, 255, 255, 0.2)",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  border: {
    primary: "rgba(255, 255, 255, 0.1)",
    secondary: "rgba(255, 255, 255, 0.2)",
    accent: "rgba(255, 255, 255, 0.4)",
  },
  interactive: {
    hover: "rgba(255, 255, 255, 0.1)",
    pressed: "rgba(255, 255, 255, 0.15)",
    focus: "#0a84ff",
    disabled: "rgba(255, 255, 255, 0.05)",
  },
  status: {
    connected: primitiveColors.success[500],
    connecting: primitiveColors.warning[500],
    error: primitiveColors.danger[500],
    unknown: primitiveColors.gray[500],
  },
  models: {
    default: primitiveColors.primary[400],
    general: primitiveColors.primary[400],
    linux: primitiveColors.success[400],
    creative: primitiveColors.sky[400],
  },
  scrollbar: {
    track: "transparent",
    thumb: "rgba(255, 255, 255, 0.2)",
    thumbHover: "rgba(255, 255, 255, 0.3)",
  },
} as const;

/** @deprecated Use getStatusColor instead */
export const getConnectionStatusClass = getStatusColor;

/** @deprecated Use getButtonColor instead */
export const getButtonClasses = getButtonColor;

/**
 * Generate CSS custom properties from the theme.
 * This is used to inject CSS variables into the document root.
 * @deprecated CSS variables are now defined directly in variables.css
 */
export const generateCSSCustomProperties = (): Record<string, string> => {
  // Return empty since variables.css is the source of truth
  // This function is kept for backwards compatibility
  return {};
};

/**
 * Get a theme value by path.
 * @deprecated Use tokens object or specific getter functions instead
 */
export const getThemeValue = (path: string, fallback?: string): string => {
  const keys = path.split(".");
  let current: unknown = appTheme;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return fallback || "";
    }
  }

  return typeof current === "string" ? current : fallback || "";
};

// =============================================================================
// Type Exports
// =============================================================================

export type AppTheme = typeof appTheme;
export type PrimitiveColors = typeof primitiveColors;
export type Tokens = typeof tokens;
