/**
 * Centralized color management for the chat app
 * All colors should be managed here for easy theme switching
 */

// Base color palette (trimmed to only what's used in the app)
export const colors = {
  // Primary brand colors (used: 400, 500)
  primary: {
    400: "#60a5fa",
    500: "#3b82f6",
  },

  // Semantic state colors (used: 400, 500)
  success: {
    400: "#34d399",
    500: "#10b981",
  },

  // Danger (used: 500)
  danger: {
    500: "#ef4444",
  },

  // Warning (used: 500)
  warning: {
    500: "#f59e0b",
  },

  // Neutral gray (used: 500)
  gray: {
    500: "#6b7280",
  },

  // Cool accent (used: 400)
  sky: {
    400: "#38bdf8",
  },

  // Dark theme base (used: 900)
  slate: {
    900: "#212121",
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
    secondary: "#FFFFFFE6", // 90%
    muted: "#FFFFFFB3", // 70%
    disabled: "#FFFFFF80", // 50%
    inverse: colors.black,
  },

  // Background colors for the app
  background: {
    body: colors.slate[900], // Main app background (solid, no gradient)
    surface: "#181818", // 10% General surfaces
    surfaceHover: "#FFFFFF26", // 15% Hovered surfaces
    surfaceActive: "#FFFFFF33", // 20% Active/selected surfaces
    overlay: "#00000080", // 50% Modal overlays
  },

  // Border colors for consistency
  border: {
    primary: "#FFFFFF1A", // 10%
    secondary: "#FFFFFF33", // 20%
    accent: "#FFFFFF66", // 40%
  },

  // Interactive states
  interactive: {
    hover: "#FFFFFF1A", // 10%
    pressed: "#FFFFFF26", // 15%
    focus: "#0A84FF", // Apple-style focus ring
    disabled: "#FFFFFF0D", // 5%
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
    thumb: "#FFFFFF33", // 20%
    thumbHover: "#FFFFFF4D", // 30%
  },

  // Glass surface colors (only component allowed gradients/special effects)
  glass: {
    light: {
      background: "#FFFFFF40", // 25%
      border: "#FFFFFF4D", // 30%
    },
    dark: {
      background: "#FFFFFF1A", // 10%
      border: "#FFFFFF33", // 20%
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
