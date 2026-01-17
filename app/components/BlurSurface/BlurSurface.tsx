import React from "react";
import { useAppStore } from "../../state/store";
import "./BlurSurface.css";

export interface BlurSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  padding?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const BlurSurface: React.FC<BlurSurfaceProps> = ({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  padding = "0.5rem",
  className = "",
  style = {},
  ...props
}) => {
  const blurAmount = useAppStore((s) => s.settings.lowSpecBlur ?? 8);

  const containerStyle: React.CSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    backdropFilter: `blur(${blurAmount}px)`,
    WebkitBackdropFilter: `blur(${blurAmount}px)`,
  };

  return (
    <div
      className={`blur-surface ${className}`}
      style={containerStyle}
      {...props}
    >
      <div
        className="blur-surface__content"
        style={{
          padding: typeof padding === "number" ? `${padding}px` : padding,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default BlurSurface;
