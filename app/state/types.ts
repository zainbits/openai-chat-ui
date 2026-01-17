import type { ChatSlice } from "./slices/chatSlice";
import type { ConnectionSlice } from "./slices/connectionSlice";
import type { ModelSlice } from "./slices/modelSlice";
import type { PersistenceSlice } from "./slices/persistenceSlice";
import type { SettingsSlice } from "./slices/settingsSlice";
import type { StreamingSlice } from "./slices/streamingSlice";
import type { UiSlice } from "./slices/uiSlice";

export type AppStore = UiSlice &
  ChatSlice &
  ModelSlice &
  SettingsSlice &
  ConnectionSlice &
  StreamingSlice &
  PersistenceSlice;
