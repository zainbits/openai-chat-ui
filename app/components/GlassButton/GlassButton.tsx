import React from "react";
import GlassSurface from "../GlassSurface";
import { useAppStore } from "../../state/store";
import { getButtonClasses, type ColorVariant } from "../../theme/colors";
import "./GlassButton.css";

interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "round";
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  glassClassName?: string;
  color?: ColorVariant;
  customColor?: string;
}

export default function GlassButton({
  children,
  variant = "default",
  width,
  height,
  borderRadius,
  className = "",
  glassClassName = "",
  color,
  customColor,
  ...buttonProps
}: GlassButtonProps) {
  const glassEffectEnabled = useAppStore(
    (s) => s.settings.glassEffectEnabled ?? true,
  );
  const isRound = variant === "round";

  // Determine the final color to use - customColor overrides color variant
  const finalColor = customColor || (color ? getButtonClasses(color) : null);

  const glassProps = isRound
    ? {
        borderRadius: borderRadius || 99,
        width: width || 50,
        height: width || 50, // Use width for both dimensions in round variant
      }
    : {
        borderRadius: borderRadius || 8,
        width: width || 100,
        height: height || 50,
      };

  // Make button dimensions exactly match GlassSurface
  const buttonStyle: React.CSSProperties = {
    width:
      typeof glassProps.width === "number"
        ? `${glassProps.width}px`
        : glassProps.width,
    height:
      typeof glassProps.height === "number"
        ? `${glassProps.height}px`
        : glassProps.height,
    borderRadius: `${glassProps.borderRadius}px`,
  };

  // Simple fallback when glass effect is disabled
  if (!glassEffectEnabled) {
    const simpleButtonClasses = `glass-button glass-button--simple ${className}`;
    const simpleStyle: React.CSSProperties = {
      ...buttonStyle,
      ...(finalColor ? { backgroundColor: `${finalColor}1A` } : {}),
    };

    return (
      <button
        className={simpleButtonClasses}
        style={simpleStyle}
        {...buttonProps}
      >
        <span className={`glass-button-content--simple ${glassClassName}`}>
          {children}
        </span>
      </button>
    );
  }

  // Prepare props based on variant
  const buttonClasses = `glass-button ${className}`;

  return (
    <button className={buttonClasses} style={buttonStyle} {...buttonProps}>
      <GlassSurface
        {...glassProps}
        backgroundOpacity={finalColor ? 0.1 : 0}
        className={`glass-button-content ${glassClassName}`}
        style={
          finalColor
            ? ({
                backgroundColor: `${finalColor}1A`, // 10% opacity
              } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </GlassSurface>
    </button>
  );
}
