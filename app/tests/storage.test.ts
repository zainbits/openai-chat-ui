import { describe, expect, it } from "vitest";
import { exportJson } from "../utils/storage";
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
