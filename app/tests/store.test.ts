import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../state/store";
import { STARTER_MODELS } from "../state/defaults";
import { MAX_PREVIEW_LENGTH, MAX_THREAD_TITLE_LENGTH } from "../constants";
import { resetStore } from "./helpers";

describe("app store slices", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it("creates a thread and activates it", () => {
    const thread = useAppStore.getState().createThread(STARTER_MODELS[0].id);
    const state = useAppStore.getState();

    expect(state.ui.activeThread).toBe(thread.id);
    expect(state.ui.sidebarOpen).toBe(true);
    expect(state.chats[thread.id]).toBeDefined();
  });

  it("truncates previews and titles", () => {
    const { createThread, addUserMessage, updateThreadTitle } =
      useAppStore.getState();
    const thread = createThread(STARTER_MODELS[0].id);

    const longPreview = "a".repeat(MAX_PREVIEW_LENGTH + 10);
    addUserMessage(thread.id, longPreview);
    const updated = useAppStore.getState().chats[thread.id];
    expect(updated.preview.length).toBe(MAX_PREVIEW_LENGTH);

    const longTitle = "b".repeat(MAX_THREAD_TITLE_LENGTH + 10);
    updateThreadTitle(thread.id, longTitle);
    const updatedTitle = useAppStore.getState().chats[thread.id].title;
    expect(updatedTitle.length).toBe(MAX_THREAD_TITLE_LENGTH);
  });
});
