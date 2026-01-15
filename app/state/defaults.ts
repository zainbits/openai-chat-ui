import type { AppData, AppSettings, CustomModel, UiState } from "../types";
import { getModelColor } from "../theme/colors";
import { DEFAULT_SIDEBAR_WIDTH } from "../constants";

const DEFAULT_API_BASE_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env?.VITE_DEFAULT_API_BASE_URL
    ? import.meta.env.VITE_DEFAULT_API_BASE_URL
    : "http://localhost:3017/v1";

const DEFAULT_MODEL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_DEFAULT_MODEL
    ? import.meta.env.VITE_DEFAULT_MODEL
    : "qwen3-coder-plus";

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  defaultModel: DEFAULT_MODEL,
  streamingEnabled: true,
  glassEffectEnabled: false,
  showActiveModelIndicator: true,
  lowSpecBlur: 8,
};

export const STARTER_MODELS: CustomModel[] = [
  {
    id: "general",
    name: "General Chat",
    color: getModelColor("general"),
    system: "You are a helpful AI assistant.",
    model: "qwen3-coder-plus",
    temp: 0.7,
    thinkingEnabled: false,
  },
  {
    id: "linux",
    name: "Linux Expert",
    color: getModelColor("linux"),
    system:
      "You are an expert in Linux commands. Always include safety warnings and explain steps.",
    model: "qwen3-coder-plus",
    temp: 0.2,
    thinkingEnabled: false,
  },
];

export const DEFAULT_UI: UiState = {
  sidebarOpen: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  activeThread: null,
  searchQuery: "",
  selectedModel: "all",
};

export const DEFAULT_APP_DATA: AppData = {
  models: STARTER_MODELS,
  chats: {},
  ui: DEFAULT_UI,
  settings: DEFAULT_SETTINGS,
  availableModels: [],
};
