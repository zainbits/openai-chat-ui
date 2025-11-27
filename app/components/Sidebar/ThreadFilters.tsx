import React from "react";
import { useAppStore } from "../../state/store";
import { GrClose } from "react-icons/gr";
import type { SortOption } from "../../types";

interface ThreadFiltersProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filteredCount: number;
}

export default function ThreadFilters({
  sortBy,
  onSortChange,
  filteredCount,
}: ThreadFiltersProps) {
  const searchQuery = useAppStore((s) => s.ui.searchQuery);
  const selectedModel = useAppStore((s) => s.ui.selectedModel);
  const models = useAppStore((s) => s.models);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const closeSidebar = useAppStore((s) => s.closeSidebar);

  return (
    <>
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
            onChange={(e) => onSortChange(e.target.value as SortOption)}
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
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            aria-label="Filter by model"
          >
            <option value="all">All</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div
          className="thread-count"
          title={`${filteredCount} threads`}
          role="status"
          aria-live="polite"
        >
          {filteredCount} thread{filteredCount !== 1 ? "s" : ""}
        </div>
      </div>
    </>
  );
}
