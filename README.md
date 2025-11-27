# CustomModels Chat

A beautiful, customizable chat interface for OpenAI-compatible APIs with glassmorphism UI, streaming responses, and custom model configurations.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Mantine](https://img.shields.io/badge/Mantine-8.2-violet)

## Features

- 🎨 **Beautiful Glass Morphism UI** - Stunning visual effects with SVG-based glass surfaces and fallbacks
- 🔄 **Streaming Responses** - Real-time token streaming from AI models
- 🎯 **Custom Model Presets** - Create and manage multiple model configurations with custom system prompts
- 💬 **Thread Management** - Organize conversations with search, filtering, and pinning
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔒 **Local Storage** - All data persisted locally in your browser
- ⚡ **Auto-Generated Titles** - AI-powered chat titles generated automatically
- 🎛️ **Configurable Settings** - Connect to any OpenAI-compatible API endpoint

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

## Architecture

### Tech Stack

- **React 19** with React Router 7
- **TypeScript 5.8** for type safety
- **Mantine UI** for components and notifications
- **DOMPurify** for XSS protection in markdown rendering
- **Marked** for markdown parsing
- **Vite** for blazing fast builds

### Project Structure

```
app/
├── api/           # OpenAI-compatible API client
├── components/    # React components with co-located CSS
│   ├── ChatArea/     # Main chat message display
│   ├── Composer/     # Message input with quick actions
│   ├── GlassButton/  # Glass morphism button component
│   ├── GlassSurface/ # SVG-based glass effect component
│   ├── ModelChips/   # Model selector chips
│   ├── ModelEditorModal/  # Create/edit model presets
│   ├── SettingsModal/     # API and app settings
│   └── Sidebar/      # Thread list and navigation
├── state/         # React context state management
├── styles/        # Global CSS and variables
├── theme/         # Centralized color/theme system
├── types.ts       # TypeScript type definitions
└── utils/         # Utility functions (markdown, storage, time)
```

### Key Features

#### Glass Morphism Effect

The `GlassSurface` component uses SVG filters with displacement maps to create a realistic glass refraction effect, with proper fallbacks for browsers that don't support advanced backdrop filters.

#### Streaming Chat

The API client handles Server-Sent Events (SSE) for real-time token streaming with proper abort handling for cancellation.

#### Theming System

All colors are managed centrally in `theme/colors.ts` and automatically generate CSS custom properties for consistent styling.

## Keyboard Shortcuts

| Shortcut                   | Action       |
| -------------------------- | ------------ |
| `Ctrl+Enter` / `Cmd+Enter` | Send message |

## Deployment

### Docker

```bash
docker build -t custommodels-chat .
docker run -p 3000:3000 custommodels-chat
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
