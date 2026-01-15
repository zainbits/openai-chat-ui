import type {
  AppData,
  AppSettings,
  ChatMessage,
  ChatThread,
  ChatsById,
  CustomModel,
  DiscoveredModel,
  UiState,
} from "../types";

export const APP_DATA_VERSION = 1;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isRole = (value: unknown): value is ChatMessage["role"] =>
  value === "user" || value === "assistant";

const isThinkingEffort = (
  value: unknown,
): value is CustomModel["thinkingEffort"] =>
  value === "low" || value === "medium" || value === "high";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) return false;
  if (!isRole(value.role)) return false;
  if (!isString(value.content)) return false;
  if (!isNumber(value.ts)) return false;
  if (value.thinking !== undefined && !isString(value.thinking)) return false;
  if (value.images !== undefined && !isStringArray(value.images)) return false;
  if (value.imageIds !== undefined && !isStringArray(value.imageIds)) {
    return false;
  }
  return true;
};

const isChatThread = (value: unknown): value is ChatThread => {
  if (!isRecord(value)) return false;
  if (!isString(value.id)) return false;
  if (!isString(value.modelId)) return false;
  if (!isString(value.title)) return false;
  if (!isBoolean(value.isPinned)) return false;
  if (!Array.isArray(value.messages) || !value.messages.every(isChatMessage)) {
    return false;
  }
  if (!isNumber(value.createdAt)) return false;
  if (!isNumber(value.updatedAt)) return false;
  if (!isString(value.preview)) return false;
  return true;
};

const isCustomModel = (value: unknown): value is CustomModel => {
  if (!isRecord(value)) return false;
  if (!isString(value.id)) return false;
  if (!isString(value.name)) return false;
  if (!isString(value.color)) return false;
  if (!isString(value.system)) return false;
  if (!isString(value.model)) return false;
  if (!isNumber(value.temp)) return false;
  if (
    value.thinkingEnabled !== undefined &&
    !isBoolean(value.thinkingEnabled)
  ) {
    return false;
  }
  if (
    value.thinkingEffort !== undefined &&
    !isThinkingEffort(value.thinkingEffort)
  ) {
    return false;
  }
  if (value.updatedAt !== undefined && !isString(value.updatedAt)) return false;
  return true;
};

const isDiscoveredModel = (value: unknown): value is DiscoveredModel => {
  if (!isRecord(value)) return false;
  if (!isString(value.id)) return false;
  if (value.object !== undefined && !isString(value.object)) return false;
  if (value.created !== undefined && !isNumber(value.created)) return false;
  if (value.owned_by !== undefined && !isString(value.owned_by)) return false;
  return true;
};

const normalizeUiState = (value: unknown, defaults: UiState): UiState => {
  if (!isRecord(value)) return defaults;

  const activeThread =
    value.activeThread === null || isString(value.activeThread)
      ? value.activeThread
      : defaults.activeThread;

  return {
    ...defaults,
    sidebarOpen: isBoolean(value.sidebarOpen)
      ? value.sidebarOpen
      : defaults.sidebarOpen,
    sidebarWidth: isNumber(value.sidebarWidth)
      ? value.sidebarWidth
      : defaults.sidebarWidth,
    activeThread,
    searchQuery: isString(value.searchQuery)
      ? value.searchQuery
      : defaults.searchQuery,
    selectedModel: isString(value.selectedModel)
      ? value.selectedModel
      : defaults.selectedModel,
  };
};

const normalizeSettings = (
  value: unknown,
  defaults: AppSettings,
): AppSettings => {
  if (!isRecord(value)) return defaults;

  return {
    ...defaults,
    apiBaseUrl: isString(value.apiBaseUrl)
      ? value.apiBaseUrl
      : defaults.apiBaseUrl,
    apiKey: isString(value.apiKey) ? value.apiKey : defaults.apiKey,
    apiProvider: isString(value.apiProvider)
      ? value.apiProvider
      : defaults.apiProvider,
    defaultModel: isString(value.defaultModel)
      ? value.defaultModel
      : defaults.defaultModel,
    streamingEnabled: isBoolean(value.streamingEnabled)
      ? value.streamingEnabled
      : defaults.streamingEnabled,
    glassEffectEnabled: isBoolean(value.glassEffectEnabled)
      ? value.glassEffectEnabled
      : defaults.glassEffectEnabled,
    showActiveModelIndicator: isBoolean(value.showActiveModelIndicator)
      ? value.showActiveModelIndicator
      : defaults.showActiveModelIndicator,
    lowSpecBlur: isNumber(value.lowSpecBlur)
      ? value.lowSpecBlur
      : defaults.lowSpecBlur,
    cloudSyncEnabled: isBoolean(value.cloudSyncEnabled)
      ? value.cloudSyncEnabled
      : defaults.cloudSyncEnabled,
    adminApiUrl: isString(value.adminApiUrl)
      ? value.adminApiUrl
      : defaults.adminApiUrl,
    adminPassword: isString(value.adminPassword)
      ? value.adminPassword
      : defaults.adminPassword,
  };
};

const normalizeChats = (value: unknown, defaults: ChatsById): ChatsById => {
  if (!isRecord(value)) return defaults;
  const entries = Object.entries(value).filter(([, thread]) =>
    isChatThread(thread),
  );
  return Object.fromEntries(entries) as ChatsById;
};

const normalizeModels = (
  value: unknown,
  defaults: CustomModel[],
): CustomModel[] => {
  if (!Array.isArray(value)) return defaults;
  return value.filter(isCustomModel);
};

const normalizeAvailableModels = (
  value: unknown,
  defaults?: DiscoveredModel[],
): DiscoveredModel[] | undefined => {
  if (!Array.isArray(value)) return defaults;
  return value.filter(isDiscoveredModel);
};

export function normalizeAppData(input: unknown, defaults: AppData): AppData {
  if (!isRecord(input)) {
    return defaults;
  }

  const models = normalizeModels(input.models, defaults.models);
  const chats = normalizeChats(input.chats, defaults.chats);
  let ui = normalizeUiState(input.ui, defaults.ui);
  const settings = normalizeSettings(input.settings, defaults.settings);
  const availableModels = normalizeAvailableModels(
    input.availableModels,
    defaults.availableModels,
  );

  const activeThread =
    ui.activeThread && chats[ui.activeThread] ? ui.activeThread : null;

  const selectedModel =
    ui.selectedModel === "all" ||
    models.some((model) => model.id === ui.selectedModel)
      ? ui.selectedModel
      : "all";

  ui = { ...ui, activeThread, selectedModel };

  return {
    models,
    chats,
    ui,
    settings,
    availableModels,
  };
}

export function normalizePersistedAppData(
  input: unknown,
  defaults: AppData,
): AppData {
  if (!isRecord(input)) {
    return defaults;
  }

  const version = isNumber(input.version) ? input.version : 0;

  if (version > APP_DATA_VERSION) {
    return normalizeAppData(input, defaults);
  }

  return normalizeAppData(input, defaults);
}
