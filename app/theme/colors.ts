/**
 * Centralized color management for the chat app
 * All colors should be managed here for easy theme switching
 */

// Base color palette
export const colors = {
  // Primary brand colors
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

  // Semantic state colors
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

  // Neutral grays for UI elements
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

  // Cool accent colors
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },

  // Dark theme base colors
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  // Pure colors for maximum contrast
  white: "#ffffff",
  black: "#000000",
} as const;

// Semantic theme assignments with intuitive naming
export const appTheme = {
  // Text colors for different contexts
  text: {
    primary: colors.white,
    secondary: "rgba(255, 255, 255, 0.9)",
    muted: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.5)",
    inverse: colors.black,
  },

  // Background colors for the app
  background: {
    body: colors.slate[900], // Main app background (solid, no gradient)
    surface: "rgba(255, 255, 255, 0.1)", // General surfaces
    surfaceHover: "rgba(255, 255, 255, 0.15)", // Hovered surfaces
    surfaceActive: "rgba(255, 255, 255, 0.2)", // Active/selected surfaces
    overlay: "rgba(0, 0, 0, 0.5)", // Modal overlays
  },

  // Border colors for consistency
  border: {
    primary: "rgba(255, 255, 255, 0.1)",
    secondary: "rgba(255, 255, 255, 0.2)",
    accent: "rgba(255, 255, 255, 0.4)",
  },

  // Interactive states
  interactive: {
    hover: "rgba(255, 255, 255, 0.1)",
    pressed: "rgba(255, 255, 255, 0.15)",
    focus: "#0A84FF", // Apple-style focus ring
    disabled: "rgba(255, 255, 255, 0.05)",
  },

  // Status indicators with actual color values
  status: {
    connected: colors.success[500], // Green
    connecting: colors.warning[500], // Yellow/Orange
    error: colors.danger[500], // Red
    unknown: colors.gray[500], // Gray
  },

  // Model type indicators
  models: {
    default: colors.primary[400], // Blue
    general: colors.primary[400], // Blue
    linux: colors.success[400], // Green
    creative: colors.sky[400], // Light blue
  },

  // Scrollbar styling
  scrollbar: {
    track: "transparent",
    thumb: "rgba(255, 255, 255, 0.2)",
    thumbHover: "rgba(255, 255, 255, 0.3)",
  },

  // Glass surface colors (only component allowed gradients/special effects)
  glass: {
    light: {
      background: "rgba(255, 255, 255, 0.25)",
      border: "rgba(255, 255, 255, 0.3)",
    },
    dark: {
      background: "rgba(255, 255, 255, 0.1)",
      border: "rgba(255, 255, 255, 0.2)",
    },
  },
} as const;

// Generate CSS custom properties for use in CSS files
export const generateCSSCustomProperties = () => {
  const cssVars: Record<string, string> = {};

  // Flatten appTheme into CSS custom properties
  Object.entries(appTheme).forEach(([category, values]) => {
    if (typeof values === "object" && values !== null) {
      Object.entries(values).forEach(([key, value]) => {
        if (typeof value === "string") {
          cssVars[`--color-${category}-${key}`] = value;
        } else if (typeof value === "object") {
          Object.entries(value).forEach(([subKey, subValue]) => {
            cssVars[`--color-${category}-${key}-${subKey}`] =
              subValue as string;
          });
        }
      });
    }
  });

  // Add base color palette
  Object.entries(colors).forEach(([colorName, colorValues]) => {
    if (typeof colorValues === "string") {
      cssVars[`--color-${colorName}`] = colorValues;
    } else if (typeof colorValues === "object") {
      Object.entries(colorValues).forEach(([shade, value]) => {
        cssVars[`--color-${colorName}-${shade}`] = value;
      });
    }
  });

  return cssVars;
};

// Helper functions for component usage
export const getStatusColor = (
  status: "connected" | "error" | "connecting" | "unknown",
) => {
  return appTheme.status[status];
};

export const getModelColor = (modelType?: keyof typeof appTheme.models) => {
  if (modelType && appTheme.models[modelType]) {
    return appTheme.models[modelType];
  }
  return appTheme.models.default;
};

export const getFocusColor = () => {
  return appTheme.interactive.focus;
};

// Utility to get theme values with fallback
export const getThemeValue = (path: string, fallback?: string) => {
  const keys = path.split(".");
  let current: any = appTheme;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return fallback || "";
    }
  }

  return typeof current === "string" ? current : fallback || "";
};

// Legacy compatibility exports (for existing components)
export const getConnectionStatusClass = getStatusColor;
export type ColorVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info";

export const getButtonClasses = (variant: ColorVariant) => {
  const variantMap = {
    primary: colors.primary[500],
    secondary: colors.primary[500],
    success: colors.success[500],
    danger: colors.danger[500],
    warning: colors.warning[500],
    info: colors.sky[400],
  };
  return variantMap[variant];
};

// Export types for TypeScript usage
export type AppTheme = typeof appTheme;
export type StatusType = keyof typeof appTheme.status;
export type ModelType = keyof typeof appTheme.models;
