import React, { useState, useCallback, useEffect } from "react";
import { Menu, Button, Modal, TextInput, Group } from "@mantine/core";
import { useAppStore } from "../../state/store";
import { toRelativeTime } from "../../utils/time";
import ConfirmModal from "../ConfirmModal";
import type { ChatThread } from "../../types";

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
// Menu Button
// ============================================================================

interface MenuButtonProps {
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
  pinned: boolean;
}

const MenuButton = React.memo(function MenuButton({
  onPin,
  onRename,
  onDelete,
  pinned,
}: MenuButtonProps) {
  return (
    <Menu shadow="md" width={144} position="bottom-end" withArrow>
      <Menu.Target>
        <button className="thread-menu-button" aria-label="Thread menu">
          •••
        </button>
      </Menu.Target>

      <Menu.Dropdown className="thread-menu-dropdown">
        <Menu.Item
          className="thread-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
        >
          {pinned ? "Unpin" : "Pin"}
        </Menu.Item>
        <Menu.Item
          className="thread-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
        >
          Rename
        </Menu.Item>
        <Menu.Item
          className="thread-menu-item thread-menu-item-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const activate = useCallback(() => {
    setActiveThread(thread.id);
  }, [setActiveThread, thread.id]);

  const handleRename = useCallback(
    (newName: string) => {
      renameThread(thread.id, newName);
    },
    [renameThread, thread.id],
  );

  const handleDelete = useCallback(() => {
    deleteThread(thread.id);
  }, [deleteThread, thread.id]);

  const handleTogglePin = useCallback(() => {
    togglePinThread(thread.id);
  }, [togglePinThread, thread.id]);

  return (
    <>
      <button
        onClick={activate}
        className={`thread-item ${activeThreadId === thread.id ? "active" : ""}`}
        aria-label={`Chat thread: ${thread.title}`}
        aria-pressed={activeThreadId === thread.id}
      >
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
            <MenuButton
              onPin={handleTogglePin}
              onRename={() => setRenameModalOpen(true)}
              onDelete={() => setDeleteModalOpen(true)}
              pinned={thread.isPinned}
            />
          </div>
        </div>
        <div className="thread-preview">{thread.preview || ""}</div>
      </button>

      <RenameModal
        opened={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        onSave={handleRename}
        initialValue={thread.title}
      />

      <ConfirmModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Thread"
        message="Are you sure you want to delete this thread? This action cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}

export default React.memo(ThreadListItem);
