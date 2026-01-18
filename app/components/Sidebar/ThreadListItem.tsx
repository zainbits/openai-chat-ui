import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button, Modal, TextInput, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "../../state/store";
import { toRelativeTime } from "../../utils/time";
import type { ChatThread } from "../../types";

/** Grace period for undo in milliseconds */
const UNDO_GRACE_PERIOD_MS = 5000;

// ============================================================================
// Rename Modal
// ============================================================================

interface RenameModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  initialValue: string;
}

const RenameModal = React.memo(function RenameModal({
  opened,
  onClose,
  onSave,
  initialValue,
}: RenameModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (opened) {
      setValue(initialValue);
    }
  }, [opened, initialValue]);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Rename Thread"
      size="sm"
      centered
    >
      <TextInput
        label="Thread name"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
        mb="lg"
      />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!value.trim()}>
          Save
        </Button>
      </Group>
    </Modal>
  );
});

// ============================================================================
// Thread Actions
// ============================================================================

interface ThreadActionsProps {
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
  pinned: boolean;
}

const ThreadActions = React.memo(function ThreadActions({
  onPin,
  onRename,
  onDelete,
  pinned,
}: ThreadActionsProps) {
  return (
    <div className="thread-actions" onClick={(e) => e.stopPropagation()}>
      <button
        className="thread-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        aria-label="Rename thread"
        title="Rename"
      >
        <Pencil size={14} />
      </button>

      <button
        className="thread-action-btn thread-action-btn-danger"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete thread"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>

      <button
        className="thread-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
        aria-label={pinned ? "Unpin thread" : "Pin thread"}
        title={pinned ? "Unpin" : "Pin"}
      >
        {pinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>
    </div>
  );
});

// ============================================================================
// Thread List Item
// ============================================================================

interface ThreadListItemProps {
  thread: ChatThread;
}

function ThreadListItem({ thread }: ThreadListItemProps) {
  const models = useAppStore((s) => s.models);
  const activeThreadId = useAppStore((s) => s.ui.activeThread);
  const setActiveThread = useAppStore((s) => s.setActiveThread);
  const renameThread = useAppStore((s) => s.renameThread);
  const deleteThread = useAppStore((s) => s.deleteThread);
  const togglePinThread = useAppStore((s) => s.togglePinThread);

  const model = models.find((m) => m.id === thread.modelId);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [isPendingDelete, setIsPendingDelete] = useState(false);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const activate = useCallback(() => {
    if (isPendingDelete) return; // Don't activate if pending delete
    setActiveThread(thread.id);
  }, [setActiveThread, thread.id, isPendingDelete]);

  const handleRename = useCallback(
    (newName: string) => {
      renameThread(thread.id, newName);
    },
    [renameThread, thread.id],
  );

  /**
   * Cancels the pending delete
   */
  const cancelDelete = useCallback(() => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    if (notificationIdRef.current) {
      notifications.hide(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    setIsPendingDelete(false);
  }, []);

  /**
   * Initiates delete with undo grace period
   */
  const handleDelete = useCallback(() => {
    // Mark as pending delete
    setIsPendingDelete(true);

    // If this thread is active, deselect it
    if (activeThreadId === thread.id) {
      setActiveThread(null);
    }

    // Generate a unique notification ID
    const notificationId = `delete-${thread.id}-${Date.now()}`;
    notificationIdRef.current = notificationId;

    // Show undo notification
    notifications.show({
      id: notificationId,
      title: "Thread deleted",
      message: (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ flex: 1 }}>
            "{thread.title}" will be permanently deleted
          </span>
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              cancelDelete();
              notifications.show({
                message: "Deletion cancelled",
                color: "green",
                autoClose: 2000,
              });
            }}
          >
            Undo
          </Button>
        </div>
      ),
      color: "red",
      autoClose: UNDO_GRACE_PERIOD_MS,
      withCloseButton: true,
      onClose: () => {
        // Only proceed if still pending (not cancelled)
        if (notificationIdRef.current === notificationId) {
          notificationIdRef.current = null;
        }
      },
    });

    // Set timeout to actually delete after grace period
    deleteTimeoutRef.current = setTimeout(() => {
      deleteThread(thread.id);
      deleteTimeoutRef.current = null;
      notificationIdRef.current = null;
    }, UNDO_GRACE_PERIOD_MS);
  }, [
    thread.id,
    thread.title,
    activeThreadId,
    setActiveThread,
    deleteThread,
    cancelDelete,
  ]);

  const handleTogglePin = useCallback(() => {
    togglePinThread(thread.id);
  }, [togglePinThread, thread.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    },
    [activate],
  );

  // Don't render if pending delete
  if (isPendingDelete) {
    return (
      <div
        className="thread-item thread-item-pending-delete"
        aria-hidden="true"
      >
        <div className="thread-header">
          <div className="thread-info">
            <span className="thread-title thread-title-deleted">
              {thread.title}
            </span>
          </div>
          <div className="thread-meta">
            <button
              className="undo-delete-btn"
              onClick={cancelDelete}
              aria-label="Undo delete"
            >
              Undo
            </button>
          </div>
        </div>
        <div className="thread-preview thread-preview-deleted">
          Deleting in 5 seconds...
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={handleKeyDown}
        className={`thread-item ${activeThreadId === thread.id ? "active" : ""}`}
        aria-label={`Chat thread: ${thread.title}`}
        aria-pressed={activeThreadId === thread.id}
      >
        <div className="thread-content-wrapper">
          <div className="thread-header">
            <div className="thread-info">
              <span
                className="model-indicator"
                style={{ background: model?.color }}
                aria-hidden="true"
              />
              <span className="thread-title">{thread.title}</span>
            </div>
            <div className="thread-meta">
              <span
                aria-label={`Last updated ${toRelativeTime(thread.updatedAt)}`}
              >
                {toRelativeTime(thread.updatedAt)}
              </span>
            </div>
          </div>
          <div className="thread-preview">{thread.preview || ""}</div>
        </div>

        <ThreadActions
          onPin={handleTogglePin}
          onRename={() => setRenameModalOpen(true)}
          onDelete={handleDelete}
          pinned={thread.isPinned}
        />
      </div>

      <RenameModal
        opened={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        onSave={handleRename}
        initialValue={thread.title}
      />
    </>
  );
}

export default React.memo(ThreadListItem);
