import React, { useMemo, useState, useCallback } from "react";
import { useAppStore, useThreads } from "../../state/store";
import { groupByDateBucket } from "../../utils/time";
import SettingsModal from "../SettingsModal";
import ModelEditorModal from "../ModelEditorModal";
import SidebarHeader from "./SidebarHeader";
import ThreadFilters from "./ThreadFilters";
import ThreadListItem from "./ThreadListItem";
import "./Sidebar.css";

import type { ChatThread, SortOption } from "../../types";

/**
 * Main sidebar component displaying chat threads and navigation
 */
export default function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.ui.sidebarOpen);
  const closeSidebar = useAppStore((s) => s.closeSidebar);
  const searchQuery = useAppStore((s) => s.ui.searchQuery);
  const selectedModel = useAppStore((s) => s.ui.selectedModel);
  const threads = useThreads();

  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelEditorOpen, setModelEditorOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | undefined>(
    undefined,
  );
  // Track if we came from settings to return there after editing
  const [returnToSettings, setReturnToSettings] = useState(false);

  /**
   * Handle edit model request from SettingsModal's CloudModelsTab
   */
  const handleEditModel = useCallback((modelId: string) => {
    setReturnToSettings(true);
    setSettingsOpen(false);
    setEditingModelId(modelId);
    setModelEditorOpen(true);
  }, []);

  /**
   * Handle closing the model editor - return to settings if we came from there
   */
  const handleModelEditorClose = useCallback(() => {
    setModelEditorOpen(false);
    setEditingModelId(undefined);
    if (returnToSettings) {
      setReturnToSettings(false);
      setSettingsOpen(true);
    }
  }, [returnToSettings]);

  // Filter and sort threads
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

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
        if (sortBy === "date") return b.updatedAt - a.updatedAt;
        if (sortBy === "name") return a.title.localeCompare(b.title);
        if (sortBy === "model") return a.modelId.localeCompare(b.modelId);
        return 0;
      });
  }, [threads, searchQuery, selectedModel, sortBy]);

  // Separate pinned and unpinned threads
  const { pinned, unpinned } = useMemo(() => {
    const pinned: ChatThread[] = [];
    const unpinned: ChatThread[] = [];
    for (const t of filtered) {
      if (t.isPinned) {
        pinned.push(t);
      } else {
        unpinned.push(t);
      }
    }
    return { pinned, unpinned };
  }, [filtered]);

  // Group unpinned threads by date bucket
  const grouped = useMemo(() => {
    const map = new Map<string, ChatThread[]>();
    for (const t of unpinned) {
      const bucket = groupByDateBucket(t.updatedAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(t);
    }
    return Array.from(map.entries());
  }, [unpinned]);

  return (
    <>
      {/* Mobile overlay - closes sidebar when clicking outside */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Chat sidebar"
        role="complementary"
      >
        <nav className="sidebar-nav" aria-label="Chat navigation">
          <SidebarHeader onSettingsClick={() => setSettingsOpen(true)} />

          <ThreadFilters
            sortBy={sortBy}
            onSortChange={setSortBy}
            filteredCount={filtered.length}
          />

          <div className="thread-list" role="list" aria-label="Chat threads">
            {pinned.length > 0 && (
              <div
                className="thread-group thread-group-pinned"
                role="group"
                aria-label="Pinned threads"
              >
                <div
                  className="thread-group-title"
                  role="heading"
                  aria-level={2}
                >
                  Pinned
                </div>
                <div className="thread-items" role="list">
                  {pinned.map((t) => (
                    <div key={t.id} role="listitem">
                      <ThreadListItem thread={t} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {grouped.map(([bucket, items]) => (
              <div
                key={bucket}
                className="thread-group"
                role="group"
                aria-label={`${bucket} threads`}
              >
                <div
                  className="thread-group-title"
                  role="heading"
                  aria-level={2}
                >
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
          onEditModel={handleEditModel}
        />

        <ModelEditorModal
          opened={modelEditorOpen}
          onClose={handleModelEditorClose}
          modelId={editingModelId}
        />
      </aside>
    </>
  );
}
