import React from "react";
import { Modal, Button, Text, Group } from "@mantine/core";
import { useAppStore } from "../../state/store";

export interface ConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Confirmation message to display */
  message: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Color for the confirm button (default: "red") */
  confirmColor?: string;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

/**
 * Reusable confirmation modal component
 * Used for delete confirmations and other destructive actions
 */
function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red",
  loading = false,
}: ConfirmModalProps) {
  const blurAmount = useAppStore((s) => s.settings.lowSpecBlur ?? 8);
  const modalBackdropFilter = blurAmount > 0 ? `blur(${blurAmount}px)` : "none";

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="sm"
      centered
      aria-labelledby="confirm-modal-title"
      classNames={{
        overlay: "glass-modal-overlay",
        content: "glass-modal-content",
        header: "glass-modal-header",
        body: "glass-modal-body",
        title: "glass-modal-title",
      }}
      styles={{
        content: {
          backdropFilter: modalBackdropFilter,
          WebkitBackdropFilter: modalBackdropFilter,
        },
      }}
    >
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button color={confirmColor} onClick={handleConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}

export default React.memo(ConfirmModal);
