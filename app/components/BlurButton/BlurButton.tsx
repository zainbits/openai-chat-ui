import React from "react";
import { useAppStore } from "../../state/store";
import { getButtonClasses, type ColorVariant } from "../../theme/colors";
import "./BlurButton.css";

interface BlurButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "round";
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  blurClassName?: string;
  color?: ColorVariant;
  customColor?: string;
}

export default function BlurButton({
  children,
  variant = "default",
  width,
  height,
  borderRadius,
  className = "",
  blurClassName = "",
  color,
  customColor,
  ...buttonProps
}: BlurButtonProps) {
  const blurAmount = useAppStore((s) => s.settings.lowSpecBlur ?? 8);

  const isRound = variant === "round";

  // Determine the final color to use - customColor overrides color variant
  const finalColor = customColor || (color ? getButtonClasses(color) : null);

  const dimensions = isRound
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

  const buttonStyle: React.CSSProperties = {
    width:
      typeof dimensions.width === "number"
        ? `${dimensions.width}px`
        : dimensions.width,
    height:
      typeof dimensions.height === "number"
        ? `${dimensions.height}px`
        : dimensions.height,
    borderRadius: `${dimensions.borderRadius}px`,
    ...(finalColor ? { backgroundColor: `${finalColor}1A` } : {}),
    backdropFilter: `blur(${blurAmount}px)`,
    WebkitBackdropFilter: `blur(${blurAmount}px)`,
  };

  const buttonClasses = `blur-button ${className}`;

  return (
    <button className={buttonClasses} style={buttonStyle} {...buttonProps}>
      <span className={`blur-button-content ${blurClassName}`}>{children}</span>
    </button>
  );
}
