import React, { Component, type ErrorInfo, type ReactNode } from "react";
import GlassButton from "../GlassButton";
import GlassSurface from "../GlassSurface";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <GlassSurface
            width={400}
            height="auto"
            borderRadius={16}
            className="error-boundary-container"
          >
            <div className="error-boundary-content">
              <div className="error-boundary-icon" aria-hidden="true">
                ⚠️
              </div>
              <h2 className="error-boundary-title">Something went wrong</h2>
              <p className="error-boundary-message">
                An unexpected error occurred. You can try again or reload the
                page.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="error-boundary-details">
                  <summary>Error details (dev only)</summary>
                  <pre className="error-boundary-stack">
                    <code>
                      {this.state.error.message}
                      {"\n\n"}
                      {this.state.errorInfo?.componentStack}
                    </code>
                  </pre>
                </details>
              )}

              <div className="error-boundary-actions">
                <GlassButton
                  onClick={this.handleReset}
                  color="primary"
                  width="auto"
                  height={40}
                  borderRadius={8}
                  glassClassName="glass-button-px-4"
                  aria-label="Try again"
                >
                  Try Again
                </GlassButton>
                <GlassButton
                  onClick={this.handleReload}
                  color="secondary"
                  width="auto"
                  height={40}
                  borderRadius={8}
                  glassClassName="glass-button-px-4"
                  aria-label="Reload page"
                >
                  Reload Page
                </GlassButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      );
    }

    return this.props.children;
  }
}
