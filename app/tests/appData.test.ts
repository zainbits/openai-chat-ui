import { describe, expect, it } from "vitest";
import { APP_DATA_VERSION, normalizePersistedAppData } from "../utils/appData";
import { DEFAULT_APP_DATA } from "../state/defaults";

describe("normalizePersistedAppData", () => {
  it("returns defaults for invalid payloads", () => {
    const result = normalizePersistedAppData(null, DEFAULT_APP_DATA);
    expect(result).toEqual(DEFAULT_APP_DATA);
  });

  it("cleans invalid active selections", () => {
    const input = {
      version: APP_DATA_VERSION,
      models: DEFAULT_APP_DATA.models,
      chats: {},
      ui: {
        ...DEFAULT_APP_DATA.ui,
        activeThread: "missing",
        selectedModel: "x",
      },
      settings: DEFAULT_APP_DATA.settings,
      availableModels: [],
    };

    const result = normalizePersistedAppData(input, DEFAULT_APP_DATA);

    expect(result.ui.activeThread).toBeNull();
    expect(result.ui.selectedModel).toBe("all");
  });

  it("preserves imageIds on messages", () => {
    const input = {
      version: APP_DATA_VERSION,
      models: DEFAULT_APP_DATA.models,
      chats: {
        t1: {
          id: "t1",
          modelId: DEFAULT_APP_DATA.models[0].id,
          title: "Test",
          isPinned: false,
          messages: [
            {
              role: "user",
              content: "hello",
              ts: Date.now(),
              imageIds: ["img-1", "img-2"],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          preview: "hello",
        },
      },
      ui: DEFAULT_APP_DATA.ui,
      settings: DEFAULT_APP_DATA.settings,
      availableModels: [],
    };

    const result = normalizePersistedAppData(input, DEFAULT_APP_DATA);
    expect(result.chats.t1.messages[0].imageIds).toEqual(["img-1", "img-2"]);
  });
});
