import React, { useMemo, useState } from "react";
import { Menu, Button } from "@mantine/core";
import { useAppState } from "../../state/AppState";
import { toRelativeTime, groupByDateBucket } from "../../utils/time";
import SettingsModal from "../SettingsModal";
import { getConnectionStatusClass } from "../../theme/colors";
import { GrClose } from "react-icons/gr";
import "./Sidebar.css";

import type { ChatThread, SortOption, ConnectionStatus } from "../../types";

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
    <aside className={`sidebar ${data.ui.sidebarOpen ? "open" : ""}`}>
      <nav className="sidebar-nav">
        <div className="sidebar-header">
          <div className="app-title">
            <h1>CustomModels Chat</h1>
            <div className="url">{data.settings.apiBaseUrl}</div>
          </div>
          <div className="sidebar-controls">
            <Button
              variant="light"
              size="xs"
              onClick={() => setSettingsOpen(true)}
              className="settings-button"
              aria-label="Settings"
            >
              ⚙️
            </Button>
            <div className="connection-status">
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
                    />
                    <span className="status-text">{text}</span>
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
            <GrClose />
          </button>
          <input
            className="search-input"
            placeholder="Search..."
            value={data.ui.searchQuery}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                ui: { ...d.ui, searchQuery: e.target.value },
              }))
            }
          />
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Sort:</label>
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="model">Model</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Model:</label>
            <select
              className="filter-select model-select"
              value={data.ui.selectedModel}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  ui: { ...d.ui, selectedModel: e.target.value },
                }))
              }
            >
              <option value="all">All</option>
              {data.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="thread-count" title={`${filtered.length} threads`}>
            {filtered.length} threads
          </div>
        </div>
        <div className="thread-list">
          {grouped.map(([bucket, items]) => (
            <div key={bucket} className="thread-group">
              <div className="thread-group-title">{bucket}</div>
              <div className="thread-items">
                {items.map((t) => (
                  <div key={t.id}>
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

  const activate = () =>
    setData((d) => ({ ...d, ui: { ...d.ui, activeThread: thread.id } }));
  const rename = () => {
    const name = prompt("Rename thread", thread.title);
    if (!name) return;
    setData((d) => ({
      ...d,
      chats: {
        ...d.chats,
        [thread.id]: {
          ...d.chats[thread.id],
          title: name,
          updatedAt: Date.now(),
        },
      },
    }));
  };
  const remove = () => {
    if (!confirm("Delete this thread?")) return;
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
  };
  const togglePin = () =>
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
    }));

  return (
    <button
      onClick={activate}
      className={`thread-item ${data.ui.activeThread === thread.id ? "active" : ""}`}
    >
      <div className="thread-header">
        <div className="thread-info">
          <span
            className="model-indicator"
            style={{ background: model?.color }}
          />
          <span className="thread-title">{thread.title}</span>
        </div>
        <div className="thread-meta">
          <span>{toRelativeTime(thread.updatedAt)}</span>
          <MenuButton
            onPin={togglePin}
            onRename={rename}
            onDelete={remove}
            pinned={thread.isPinned}
          />
        </div>
      </div>
      <div className="thread-preview">{thread.preview || ""}</div>
    </button>
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
