import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import "./ImageViewer.css";

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Full-screen image viewer with navigation for multiple images
 */
export default function ImageViewer({
  images,
  initialIndex,
  onClose,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const hasMultiple = images.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((i) => i - 1);
    }
  }, [canGoPrev]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((i) => i + 1);
    }
  }, [canGoNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrev, goToNext]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const content = (
    <div
      className="image-viewer-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Close button */}
      <button
        className="image-viewer-close"
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <IoClose />
      </button>

      {/* Navigation - Previous */}
      {hasMultiple && (
        <button
          className={`image-viewer-nav image-viewer-nav-prev ${!canGoPrev ? "disabled" : ""}`}
          onClick={goToPrev}
          disabled={!canGoPrev}
          aria-label="Previous image"
        >
          <IoChevronBack />
        </button>
      )}

      {/* Main image */}
      <div className="image-viewer-content">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="image-viewer-image"
        />
      </div>

      {/* Navigation - Next */}
      {hasMultiple && (
        <button
          className={`image-viewer-nav image-viewer-nav-next ${!canGoNext ? "disabled" : ""}`}
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next image"
        >
          <IoChevronForward />
        </button>
      )}

      {/* Image counter */}
      {hasMultiple && (
        <div className="image-viewer-counter">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="image-viewer-thumbnails">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={`image-viewer-thumbnail ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-current={idx === currentIndex ? "true" : undefined}
            >
              <img src={img} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Render in portal to escape any overflow constraints
  return createPortal(content, document.body);
}
