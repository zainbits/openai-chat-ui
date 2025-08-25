import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  AppSettings,
  ChatThread,
  CustomModel,
  UiState,
  ConnectionStatus,
} from "../types";
import { OpenAICompatibleClient } from "../api/client";
import { loadAppData, saveAppData } from "../utils/storage";
import { getModelColor } from "../theme/colors";

const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: "http://localhost:3017/v1",
  defaultModel: "qwen3-coder-plus",
  streamingEnabled: true,
};

const STARTER_MODELS: CustomModel[] = [
  {
    id: "general",
    name: "General Chat",
    color: getModelColor("general"),
    system: "You are a helpful AI assistant.",
    model: "qwen3-coder-plus",
    temp: 0.7,
  },
  {
    id: "linux",
    name: "Linux Expert",
    color: getModelColor("linux"),
    system:
      "You are an expert in Linux commands. Always include safety warnings and explain steps.",
    model: "qwen3-coder-plus",
    temp: 0.2,
  },
];

const DEFAULT_UI: UiState = {
  sidebarOpen: false,
  sidebarWidth: 320,
  activeThread: null,
  searchQuery: "",
  selectedModel: "all",
};

function initialData(): AppData {
  const saved = loadAppData();
  if (saved) {
    return {
      ...saved,
      // Always recompute sidebarOpen based on responsive defaults (handled by CSS)
      ui: { ...DEFAULT_UI, ...saved.ui, sidebarOpen: false },
      connectionStatus: "unknown",
    };
  }
  return {
    models: STARTER_MODELS,
    chats: {},
    ui: DEFAULT_UI,
    settings: DEFAULT_SETTINGS,
    availableModels: [],
    connectionStatus: "unknown",
  };
}

interface AppStateContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => initialData());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Check connection on initial load and when settings change
  useEffect(() => {
    console.log("[Effect] useEffect running with deps:", {
      apiBaseUrl: data.settings.apiBaseUrl,
      apiKey: data.settings.apiKey ? "[REDACTED]" : undefined,
    });
    const checkConnection = async (apiBaseUrl: string, apiKey?: string) => {
      // Prevent duplicate calls
      if (isCheckingRef.current) {
        console.log(
          "[API Call] checkConnection already in progress, skipping...",
        );
        return;
      }

      console.log("[API Call] checkConnection called with:", {
        apiBaseUrl,
        apiKey: apiKey ? "[REDACTED]" : undefined,
      });
      isCheckingRef.current = true;
      setData((d) => ({ ...d, connectionStatus: "connecting" }));

      try {
        const client = new OpenAICompatibleClient({ apiBaseUrl, apiKey });
        // Use listModels() instead of verify() - it hits the same endpoint but gives us the models too
        console.log("[API Call] About to call listModels...");
        const models = await client.listModels();
        console.log(
          "[API Call] listModels success, got",
          models.length,
          "models",
        );
        // If listModels succeeds, we know the connection is working
        setData((d) => ({
          ...d,
          connectionStatus: "connected",
          availableModels: models,
        }));
      } catch (error) {
        console.log("[API Call] listModels failed:", error);
        // If listModels fails, the connection is not working
        setData((d) => ({ ...d, connectionStatus: "error" }));
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Use current values from data
    const { apiBaseUrl, apiKey } = data.settings;
    checkConnection(apiBaseUrl, apiKey);

    // Set up periodic connection checking every 2 minutes (less frequent to reduce API usage)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(
      () => checkConnection(apiBaseUrl, apiKey),
      120000,
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data.settings.apiBaseUrl, data.settings.apiKey]);

  const value = useMemo(() => ({ data, setData }), [data]);
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export function createThreadForModel(modelId: string): ChatThread {
  // Polyfill for crypto.randomUUID if not available
  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback implementation for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  };

  const now = Date.now();
  return {
    id: generateUUID(),
    modelId,
    title: "New chat",
    isPinned: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
    preview: "",
  };
}
