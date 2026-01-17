# CustomModels Chat

A beautiful, customizable chat interface for OpenAI-compatible APIs with modern blur effects, streaming responses, and custom model configurations.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Mantine](https://img.shields.io/badge/Mantine-8.2-violet)

## Features

- 🎨 **Modern Blur UI** - Clean visual effects with configurable backdrop blur
- 🔄 **Streaming Responses** - Real-time token streaming from AI models
- 🎯 **Custom Model Presets** - Create and manage multiple model configurations with custom system prompts
- 💬 **Thread Management** - Organize conversations with search, filtering, and pinning
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔒 **Local Storage** - All data persisted locally in your browser (IndexedDB for images)
- ⚡ **Auto-Generated Titles** - AI-powered chat titles generated automatically
- 🎛️ **Configurable Settings** - Connect to any OpenAI-compatible API endpoint
- 🖼️ **Multimodal Support** - Attach images to messages (JPEG, PNG, GIF, WebP; up to 4 per message)
- 🧠 **AI Reasoning Display** - Collapsible thinking blocks for models with extended reasoning
- 🌐 **Multiple API Providers** - Built-in support for OpenAI, Anthropic, Groq, Cerebras, OpenRouter, or custom endpoints
- ☁️ **Cloud Sync** - Optional sync of custom models to a cloud backend
- 📦 **Export/Import** - Backup and restore your data as JSON

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager

### Installation

```bash
yarn install
```

### Environment Variables (Optional)

Create a `.env` file to customize defaults:

```bash
VITE_DEFAULT_API_BASE_URL=http://localhost:3017/v1
VITE_DEFAULT_MODEL=qwen3-coder-plus
```

### Development

Start the development server with HMR:

```bash
yarn dev
```

Your application will be available at `http://localhost:5173`.

### Production Build

```bash
yarn build
```

### Start Production Server

```bash
yarn start
```

### Run Tests

```bash
yarn test        # Watch mode
yarn test:run    # Single run
```

## Architecture

### Tech Stack

- **React 19** with React Router 7
- **TypeScript 5.8** for type safety
- **Mantine UI** for components and notifications
- **Zustand** for state management
- **DOMPurify** for XSS protection in markdown rendering
- **Marked** for markdown parsing
- **Vite** for blazing fast builds
- **Vitest** for testing

### Project Structure

```
app/
├── api/           # API clients (OpenAI-compatible, cloud sync)
├── components/    # React components with co-located CSS
│   ├── BlurButton/       # Blur effect button component
│   ├── BlurSurface/      # Backdrop blur surface component
│   ├── ChatArea/         # Main chat message display
│   ├── CloudModelsTab/   # Cloud sync management UI
│   ├── Composer/         # Message input with image attachments
│   ├── ConfirmModal/     # Reusable confirmation dialogs
│   ├── ConflictModal/    # Cloud sync conflict resolution
│   ├── ErrorBoundary/    # React error boundary
│   ├── ImageViewer/      # Full-screen image viewer
│   ├── LoadingSkeleton/  # Loading state placeholders
│   ├── ModelChips/       # Model selector chips
│   ├── ModelEditorModal/ # Create/edit model presets
│   ├── ModelPicker/      # LLM model dropdown selector
│   ├── SettingsModal/    # API and app settings (tabbed)
│   ├── Sidebar/          # Thread list and navigation
│   └── ThinkingBlock/    # Collapsible AI reasoning display
├── hooks/         # Custom React hooks
├── state/         # Zustand store and slices
├── styles/        # Global CSS and variables
├── tests/         # Vitest test files
├── theme/         # Centralized color/theme system
├── types.ts       # TypeScript type definitions
└── utils/         # Utility functions (markdown, storage, IndexedDB)
```

### Key Features

#### Streaming Chat

The API client handles Server-Sent Events (SSE) for real-time token streaming with proper abort handling for cancellation.

#### Theming System

All colors are managed centrally in `theme/colors.ts` and automatically generate CSS custom properties for consistent styling.

## Supported API Providers

The app includes built-in presets for popular AI providers:

| Provider   | Base URL                         |
| ---------- | -------------------------------- |
| OpenAI     | `https://api.openai.com/v1`      |
| Anthropic  | `https://api.anthropic.com/v1`   |
| Groq       | `https://api.groq.com/openai/v1` |
| Cerebras   | `https://api.cerebras.ai/v1`     |
| OpenRouter | `https://openrouter.ai/api/v1`   |
| Custom     | Any OpenAI-compatible endpoint   |

You can also override the base URL for any provider to use a proxy server.

## Keyboard Shortcuts

| Shortcut                   | Action       |
| -------------------------- | ------------ |
| `Ctrl+Enter` / `Cmd+Enter` | Send message |

## Deployment

### Docker

```bash
docker build -t custommodels-chat .
docker run -p 4111:4111 custommodels-chat
```

### GitHub Pages

```bash
yarn deploy
```

Options:

- `BASE_PATH=/custom/ yarn deploy` - Set a custom subpath
- `SKIP_INSTALL=1 yarn deploy` - Skip yarn install (faster)
- `DRY_RUN=1 yarn deploy` - Dry-run without pushing

## Security

- **XSS Protection**: All markdown content is sanitized using DOMPurify
- **API Keys**: Stored locally in browser storage only
- **No Server Storage**: All data remains on your device

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ using React Router and Mantine UI.
