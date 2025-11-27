import React, { useMemo, useState, useCallback } from "react";
import { Menu, Button, Modal, TextInput, Text, Group } from "@mantine/core";
import { useAppState } from "../../state/AppState";
import { toRelativeTime, groupByDateBucket } from "../../utils/time";
import SettingsModal from "../SettingsModal";
import { getConnectionStatusClass } from "../../theme/colors";
import { GrClose } from "react-icons/gr";
import "./Sidebar.css";

import type { ChatThread, SortOption, ConnectionStatus } from "../../types";

// Confirmation Modal Component
function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={() => { onConfirm(); onClose(); }}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}

// Rename Modal Component
function RenameModal({
  opened,
  onClose,
  onSave,
  initialValue,
}: {
  opened: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);

  // Reset value when modal opens with new initial value
  React.useEffect(() => {
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
    <Modal opened={opened} onClose={onClose} title="Rename Thread" size="sm" centered>
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
}

function getConnectionDisplay(status?: ConnectionStatus) {
  switch (status) {
    case "connected":
      return {
        color: getConnectionStatusClass("connected"),
        text: "Connected",
        title: "API connection is working",
      };
    case "error":
      return {
        color: getConnectionStatusClass("error"),
        text: "Disconnected",
        title: "API connection failed",
      };
    case "connecting":
      return {
        color: getConnectionStatusClass("connecting"),
        text: "Connecting...",
        title: "Checking API connection",
      };
    default:
      return {
        color: getConnectionStatusClass("unknown"),
        text: "Unknown",
        title: "Connection status unknown",
      };
  }
}

export default function Sidebar() {
  const { data, setData } = useAppState();
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const threads = useMemo(() => Object.values(data.chats), [data.chats]);

  const filtered = useMemo(() => {
    const q = data.ui.searchQuery.trim().toLowerCase();
    const selectedModel = data.ui.selectedModel;
    return threads
      .filter((t) =>
        selectedModel === "all" ? true : t.modelId === selectedModel,
      )
      .filter((t) =>
        q
          ? t.title.toLowerCase().includes(q) ||
            t.preview.toLowerCase().includes(q) ||
            t.messages.some((m) => m.content.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (sortBy === "date") return b.updatedAt - a.updatedAt;
        if (sortBy === "name") return a.title.localeCompare(b.title);
        if (sortBy === "model") return a.modelId.localeCompare(b.modelId);
        return 0;
      });
  }, [threads, data.ui.searchQuery, data.ui.selectedModel, sortBy]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChatThread[]>();
    for (const t of filtered) {
      const bucket = groupByDateBucket(t.updatedAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const closeSidebar = () =>
    setData((d) => ({ ...d, ui: { ...d.ui, sidebarOpen: false } }));

  // Sidebar is collapsible only; no resizing

  return (
    <aside
      className={`sidebar ${data.ui.sidebarOpen ? "open" : ""}`}
      aria-label="Chat sidebar"
      role="complementary"
    >
      <nav className="sidebar-nav" aria-label="Chat navigation">
        <div className="sidebar-header">
          <div className="app-title">
            <h1>CustomModels Chat</h1>
            <div className="url" aria-label={`Connected to ${data.settings.apiBaseUrl}`}>
              {data.settings.apiBaseUrl}
            </div>
          </div>
          <div className="sidebar-controls">
            <Button
              variant="light"
              size="xs"
              onClick={() => setSettingsOpen(true)}
              className="settings-button"
              aria-label="Open settings"
            >
              ⚙️
            </Button>
            <div className="connection-status" role="status" aria-live="polite">
              {(() => {
                const { color, text, title } = getConnectionDisplay(
                  data.connectionStatus,
                );
                const statusClass = color.includes("green")
                  ? "connected"
                  : color.includes("red")
                    ? "error"
                    : color.includes("yellow")
                      ? "connecting"
                      : "unknown";
                return (
                  <>
                    <span
                      className={`status-dot ${statusClass}`}
                      title={title}
                      aria-hidden="true"
                    />
                    <span className="status-text" aria-label={`Connection status: ${text}`}>
                      {text}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="search-section">
          <button
            className="mobile-close"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <GrClose aria-hidden="true" />
          </button>
          <input
            className="search-input"
            placeholder="Search threads..."
            value={data.ui.searchQuery}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                ui: { ...d.ui, searchQuery: e.target.value },
              }))
            }
            aria-label="Search chat threads"
            type="search"
          />
        </div>
        <div className="filter-controls" role="group" aria-label="Thread filters">
          <div className="filter-group">
            <label htmlFor="sort-select">Sort:</label>
            <select
              id="sort-select"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort threads by"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="model">Model</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="model-filter">Model:</label>
            <select
              id="model-filter"
              className="filter-select model-select"
              value={data.ui.selectedModel}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  ui: { ...d.ui, selectedModel: e.target.value },
                }))
              }
              aria-label="Filter by model"
            >
              <option value="all">All</option>
              {data.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div
            className="thread-count"
            title={`${filtered.length} threads`}
            role="status"
            aria-live="polite"
          >
            {filtered.length} thread{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="thread-list" role="list" aria-label="Chat threads">
          {grouped.map(([bucket, items]) => (
            <div key={bucket} className="thread-group" role="group" aria-label={`${bucket} threads`}>
              <div className="thread-group-title" role="heading" aria-level={2}>
                {bucket}
              </div>
              <div className="thread-items" role="list">
                {items.map((t) => (
                  <div key={t.id} role="listitem">
                    <ThreadListItem thread={t} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
      <SettingsModal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  );
}

function ThreadListItem({ thread }: { thread: ChatThread }) {
  const { data, setData } = useAppState();
  const model = data.models.find((m) => m.id === thread.modelId);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const activate = useCallback(() =>
    setData((d) => ({ ...d, ui: { ...d.ui, activeThread: thread.id } })),
    [setData, thread.id]
  );

  const handleRename = useCallback((newName: string) => {
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [thread.id]: {
          ...d.chats[thread.id],
          title: newName,
          updatedAt: Date.now(),
        },
      },
    }));
  }, [setData, thread.id]);

  const handleDelete = useCallback(() => {
    setData((d) => {
      const next = { ...d.chats };
      delete next[thread.id];
      const isActive = d.ui.activeThread === thread.id;
      return {
        ...d,
        chats: next,
        ui: { ...d.ui, activeThread: isActive ? null : d.ui.activeThread },
      };
    });
  }, [setData, thread.id]);

  const togglePin = useCallback(() =>
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [thread.id]: {
          ...d.chats[thread.id],
          isPinned: !d.chats[thread.id].isPinned,
          updatedAt: Date.now(),
        },
      },
    })),
    [setData, thread.id]
  );

  return (
    <>
      <button
        onClick={activate}
        className={`thread-item ${data.ui.activeThread === thread.id ? "active" : ""}`}
        aria-label={`Chat thread: ${thread.title}`}
        aria-pressed={data.ui.activeThread === thread.id}
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
            <span aria-label={`Last updated ${toRelativeTime(thread.updatedAt)}`}>
              {toRelativeTime(thread.updatedAt)}
            </span>
            <MenuButton
              onPin={togglePin}
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
      />
    </>
  );
}

function MenuButton({
  onPin,
  onRename,
  onDelete,
  pinned,
}: {
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
  pinned: boolean;
}) {
  return (
    <Menu shadow="md" width={144} position="bottom-end" withArrow>
      <Menu.Target>
        <button className="thread-menu-button" aria-label="Thread menu">
          •••
        </button>
      </Menu.Target>

      <Menu.Dropdown className="bg-slate-900/90 backdrop-blur-sm border border-white/10">
        <Menu.Item
          className="text-white hover:bg-white/10 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
        >
          {pinned ? "Unpin" : "Pin"}
        </Menu.Item>
        <Menu.Item
          className="text-white hover:bg-white/10 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
        >
          Rename
        </Menu.Item>
        <Menu.Item
          className="text-red-300 hover:bg-white/10 text-sm"
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
}
