import React, { useCallback, useState, useRef, useEffect } from "react";
import { useAppStore, selectActiveThread } from "../../state/store";
import { useChat } from "../../hooks";
import BlurSurface from "../BlurSurface";
import BlurButton from "../BlurButton";
import ModelPicker from "../ModelPicker";
import { X, ArrowUp, Image } from "lucide-react";
import type { ImageAttachment } from "../../types";
import "./Composer.css";

/** Min and max heights for the textarea */
const TEXTAREA_MIN_HEIGHT = 48;
const TEXTAREA_MAX_HEIGHT = 200;

/** Supported image MIME types */
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/** Max image file size (10MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Max number of images per message */
const MAX_IMAGES_PER_MESSAGE = 4;

/**
 * Converts a File to a base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Message composer component with quick actions and send functionality
 */
export default function Composer() {
  const thread = useAppStore(selectActiveThread);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textareaHeight, setTextareaHeight] = useState(TEXTAREA_MIN_HEIGHT);

  const { isLoading, isRegenerating, sendMessage, cancelStream } = useChat();

  /**
   * Update CSS custom property for composer height so messages container can adjust padding
   */
  useEffect(() => {
    const updateComposerHeight = () => {
      if (composerRef.current) {
        const height = composerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--composer-height",
          `${height}px`,
        );
      }
    };

    updateComposerHeight();

    // Use ResizeObserver to track composer height changes
    const resizeObserver = new ResizeObserver(updateComposerHeight);
    if (composerRef.current) {
      resizeObserver.observe(composerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [textareaHeight]);

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight for shrinking content
    textarea.style.height = "auto";

    // Calculate new height
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, TEXTAREA_MIN_HEIGHT),
      TEXTAREA_MAX_HEIGHT,
    );

    textarea.style.height = `${newHeight}px`;
    setTextareaHeight(newHeight);
  }, []);

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Show stop button when either loading or regenerating
  const isStreaming = isLoading || isRegenerating;

  /**
   * Handles image file selection
   */
  const handleImageSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newImages: ImageAttachment[] = [];
      const currentCount = images.length;

      for (let i = 0; i < files.length; i++) {
        if (currentCount + newImages.length >= MAX_IMAGES_PER_MESSAGE) {
          break;
        }

        const file = files[i];

        // Validate file type
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          console.warn(`Unsupported image type: ${file.type}`);
          continue;
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
          console.warn(`Image too large: ${file.size} bytes`);
          continue;
        }

        // Create preview URL and convert to base64
        const previewUrl = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);

        newImages.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          base64,
        });
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
    },
    [images.length],
  );

  /**
   * Removes an image from the attachments
   */
  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  }, []);

  /**
   * Opens the file picker
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handles file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleImageSelect(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleImageSelect],
  );

  /**
   * Handles paste events to capture images from clipboard
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((f) => dataTransfer.items.add(f));
        handleImageSelect(dataTransfer.files);
      }
    },
    [handleImageSelect],
  );

  /**
   * Handles drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleImageSelect(e.dataTransfer.files);
    },
    [handleImageSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handles sending the message
   */
  const handleSend = useCallback(async () => {
    const hasContent = input.trim() || images.length > 0;
    if (!hasContent || !thread || isStreaming) return;

    const message = input;
    const imageBase64s = images.map((img) => img.base64!).filter(Boolean);

    // Clear inputs
    setInput("");
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });

    // Reset textarea height after sending
    setTextareaHeight(TEXTAREA_MIN_HEIGHT);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    }

    await sendMessage(
      message,
      imageBase64s.length > 0 ? imageBase64s : undefined,
    );
  }, [input, images, thread, isStreaming, sendMessage]);

  /**
   * Handles keyboard shortcuts (Enter to send, Shift+Enter for new line)
   * Enter-to-send is disabled on mobile devices (touch-primary)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Skip Enter-to-send on mobile/touch devices
        const isMobile = window.matchMedia("(pointer: coarse)").matches;
        if (isMobile) return;

        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasContent = input.trim() || images.length > 0;
  const canAddMoreImages = images.length < MAX_IMAGES_PER_MESSAGE;

  return (
    <footer
      ref={composerRef}
      className="composer"
      role="region"
      aria-label="Message composer"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(",")}
        multiple
        onChange={handleFileInputChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <div className="composer-content">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="composer-image-previews">
            {images.map((img) => (
              <div key={img.id} className="composer-image-preview">
                <img
                  src={img.previewUrl}
                  alt="Attachment preview"
                  className="composer-preview-image"
                />
                <button
                  type="button"
                  className="composer-remove-image"
                  onClick={() => removeImage(img.id)}
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="composer-input-area">
          <BlurSurface width="100%" height="auto" padding={0}>
            <div className="composer-input-container">
              <div className="composer-textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  className="composer-textarea"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  aria-label="Message input"
                  style={{ height: `${textareaHeight}px` }}
                />
              </div>
              <div className="composer-bottom-row">
                {/* Model Picker */}
                <div className="composer-model-picker-container">
                  <ModelPicker />
                </div>

                <div className="composer-actions">
                  {/* Image upload button */}
                  <BlurButton
                    variant="round"
                    width={32}
                    height={32}
                    blurClassName="composer-action-button-blur"
                    disabled={!canAddMoreImages || !thread}
                    onClick={openFilePicker}
                    aria-label="Attach image"
                    title={
                      canAddMoreImages
                        ? "Attach image"
                        : `Max ${MAX_IMAGES_PER_MESSAGE} images`
                    }
                  >
                    <Image className="composer-icon" aria-hidden="true" />
                  </BlurButton>

                  {/* Send/Stop button */}
                  <BlurButton
                    variant="round"
                    width={32}
                    height={32}
                    blurClassName="composer-send-button-blur"
                    disabled={(!hasContent && !isStreaming) || !thread}
                    onClick={isStreaming ? cancelStream : handleSend}
                    aria-label={
                      isStreaming ? "Stop generation" : "Send message"
                    }
                  >
                    {isStreaming ? (
                      <X className="composer-icon" aria-hidden="true" />
                    ) : (
                      <ArrowUp className="composer-icon" aria-hidden="true" />
                    )}
                  </BlurButton>
                </div>
              </div>
            </div>
          </BlurSurface>
        </div>
      </div>
    </footer>
  );
}
