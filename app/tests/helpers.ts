import { DEFAULT_APP_DATA } from "../state/defaults";
import { useAppStore } from "../state/store";

export function resetStore(): void {
  useAppStore.setState({
    models: [...DEFAULT_APP_DATA.models],
    chats: {},
    ui: { ...DEFAULT_APP_DATA.ui },
    settings: { ...DEFAULT_APP_DATA.settings },
    availableModels: [...(DEFAULT_APP_DATA.availableModels ?? [])],
    connectionStatus: "unknown",
    isLoading: false,
    isRegenerating: false,
    _hydrated: true,
  });
}
