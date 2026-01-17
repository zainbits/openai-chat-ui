import React from "react";
import "./LoadingSkeleton.css";

/**
 * Loading skeleton displayed while the app is hydrating
 * Provides visual feedback and prevents layout shift
 */
function LoadingSkeleton() {
  return (
    <div
      className="loading-skeleton"
      role="status"
      aria-label="Loading application"
    >
      <div className="skeleton-sidebar">
        <div className="skeleton-header">
          <div className="skeleton-title" />
          <div className="skeleton-subtitle" />
        </div>
        <div className="skeleton-search" />
        <div className="skeleton-threads">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-thread">
              <div className="skeleton-thread-header">
                <div className="skeleton-indicator" />
                <div className="skeleton-thread-title" />
              </div>
              <div className="skeleton-thread-preview" />
            </div>
          ))}
        </div>
      </div>
      <div className="skeleton-main">
        <div className="skeleton-chips">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-chip" />
          ))}
        </div>
        <div className="skeleton-messages">
          <div className="skeleton-empty-state">
            <div className="skeleton-spinner" aria-hidden="true" />
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LoadingSkeleton);
