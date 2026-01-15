import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./app/tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
