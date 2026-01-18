# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
yarn dev          # Start development server (port 5173)
yarn build        # Production build
yarn start        # Run production server (port 4111)
yarn test         # Run tests in watch mode
yarn test:run     # Run tests once
yarn typecheck    # TypeScript check + generate React Router types
yarn format       # Format with Prettier
```

Package manager: Yarn 1.22.22+

## Architecture Overview

This is a React 19 chat UI for OpenAI-compatible APIs with local-first storage.

### State Management (Zustand)

Single store (`useAppStore`) with 7 slices in `app/state/slices/`:

- **chatSlice** - Thread/message CRUD
- **modelSlice** - Custom model presets
- **uiSlice** - Sidebar, search, sorting state
- **settingsSlice** - API config, preferences
- **connectionSlice** - API connection status
- **streamingSlice** - Streaming message state
- **persistenceSlice** - IndexedDB hydration/persistence

Access state via selectors:

```typescript
const thread = useAppStore(selectActiveThread);
const chats = useAppStore(selectChats);
```

### Data Flow

User input → `Composer` → `useChat()` hook → `app/api/client.ts` (SSE streaming) → Store update → `ChatArea` re-render

### Persistence

- **IndexedDB**: Main app state (`appData` store) and images (`images` store)
- Data migrations handled in `app/utils/appData.ts`
- Auto-persists on state changes via store subscription

### API Client (`app/api/client.ts`)

- Supports OpenAI-compatible and Anthropic APIs
- SSE streaming with callbacks: `onToken()`, `onThinking()`, `onDone()`, `onError()`
- Retry logic: 3 attempts, exponential backoff (1-10s) with jitter
- Handles extended thinking/reasoning parameters

### Component Structure

Components use co-located CSS (`ComponentName/index.tsx` + `ComponentName.css`).

Key components:

- `ChatArea` - Message display with markdown rendering
- `Composer` - Input with image attachments (max 4)
- `Sidebar` - Thread list with search/sort
- `ModelChips` - Model preset selector
- `SettingsModal` - Tabbed settings (API, models, cloud sync)
- `ThinkingBlock` - Collapsible AI reasoning display

### Type Definitions

Core types in `app/types.ts`:

- `ChatThread`, `ChatMessage` - Chat data structures
- `CustomModel` - Model preset with system prompt, temperature, thinking settings
- `UiState`, `AppSettings` - UI and configuration state

## Key Implementation Details

- **Streaming**: Uses Server-Sent Events, AbortController for cancellation
- **Images**: Stored as base64 in IndexedDB, limited to JPEG/PNG/GIF/WebP
- **XSS Protection**: DOMPurify sanitizes markdown output
- **Error Boundaries**: Wrap Sidebar, ChatArea, ModelChips for graceful recovery
- **Path Alias**: `~/*` maps to `./app/*`

## Testing

Vitest with jsdom. Tests in `app/tests/`:

- `store.test.ts` - Store behavior
- `storage.test.ts` - IndexedDB operations
- `appData.test.ts` - Data validation/migration

## Environment Variables

- `VITE_DEFAULT_API_BASE_URL` - Default API endpoint
- `VITE_DEFAULT_MODEL` - Default model ID
- `BASE_PATH` - For GitHub Pages deployment
