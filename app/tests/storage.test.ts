import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppData } from "../types";
import { exportJson } from "../utils/appData";
import { DEFAULT_APP_DATA } from "../state/defaults";

describe("exportJson", () => {
  it("strips base64 images when imageIds are present", () => {
    const data = {
      ...DEFAULT_APP_DATA,
      chats: {
        t1: {
          id: "t1",
          modelId: DEFAULT_APP_DATA.models[0].id,
          title: "Images",
          isPinned: false,
          messages: [
            {
              role: "user" as const,
              content: "hello",
              ts: Date.now(),
              images: ["data:image/png;base64,AAA"],
              imageIds: ["img-1"],
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          preview: "hello",
        },
      },
    };

    const exported = JSON.parse(exportJson(data));
    const message = exported.chats.t1.messages[0];
    expect(message.images).toBeUndefined();
    expect(message.imageIds).toEqual(["img-1"]);
  });
});

describe("debounced persistence", () => {
  const saveAppDataToDb = vi.fn<(_: AppData) => Promise<boolean>>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    saveAppDataToDb.mockReset();
    saveAppDataToDb.mockResolvedValue(true);
    vi.doMock("../utils/appDataStore", () => ({
      saveAppDataToDb,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("../utils/appDataStore");
  });

  function createAppData(threadId: string, content: string): AppData {
    const now = Date.now();
    return {
      models: [...DEFAULT_APP_DATA.models],
      chats: {
        [threadId]: {
          id: threadId,
          modelId: DEFAULT_APP_DATA.models[0].id,
          title: "Thread",
          isPinned: false,
          messages: [{ role: "user", content, ts: now }],
          createdAt: now,
          updatedAt: now,
          preview: content,
        },
      },
      ui: { ...DEFAULT_APP_DATA.ui },
      settings: { ...DEFAULT_APP_DATA.settings },
      availableModels: [...(DEFAULT_APP_DATA.availableModels ?? [])],
    };
  }

  it("batches rapid saves and persists the latest snapshot", async () => {
    const { scheduleAppDataSave } = await import("../utils/storage");
    const first = createAppData("t1", "first");
    const latest = createAppData("t2", "latest");

    scheduleAppDataSave(first, 300);
    scheduleAppDataSave(latest, 300);

    await vi.advanceTimersByTimeAsync(299);
    expect(saveAppDataToDb).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(saveAppDataToDb).toHaveBeenCalledTimes(1);
    expect(saveAppDataToDb).toHaveBeenCalledWith(latest);
  });

  it("flushes pending writes immediately", async () => {
    const { flushScheduledAppDataSave, scheduleAppDataSave } = await import(
      "../utils/storage"
    );
    const data = createAppData("t3", "flush");

    scheduleAppDataSave(data, 5_000);
    const didFlush = await flushScheduledAppDataSave();

    expect(didFlush).toBe(true);
    expect(saveAppDataToDb).toHaveBeenCalledTimes(1);
    expect(saveAppDataToDb).toHaveBeenCalledWith(data);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(saveAppDataToDb).toHaveBeenCalledTimes(1);
  });
});
