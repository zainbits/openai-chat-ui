import React, { useMemo, useState } from "react";
import { useAppStore, useThreads } from "../../state/store";
import { groupByDateBucket } from "../../utils/time";
import SettingsModal from "../SettingsModal";
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
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (sortBy === "date") return b.updatedAt - a.updatedAt;
        if (sortBy === "name") return a.title.localeCompare(b.title);
        if (sortBy === "model") return a.modelId.localeCompare(b.modelId);
        return 0;
      });
  }, [threads, searchQuery, selectedModel, sortBy]);

  // Group threads by date bucket
  const grouped = useMemo(() => {
    const map = new Map<string, ChatThread[]>();
    for (const t of filtered) {
      const bucket = groupByDateBucket(t.updatedAt);
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

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
          {grouped.map(([bucket, items]) => (
            <div
              key={bucket}
              className="thread-group"
              role="group"
              aria-label={`${bucket} threads`}
            >
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
    </>
  );
}
