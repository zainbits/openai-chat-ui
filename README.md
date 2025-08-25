# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
yarn install
```

### Development

Start the development server with HMR:

```bash
yarn dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
yarn build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

````
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets (deploy this to static hosting / Pages)
│   └── server/    # Server-side code
### GitHub Pages (manual)

You can deploy manually from the terminal without GitHub Actions.

Prereqs:
- One-time: enable Pages in your repo settings, branch: `gh-pages`, folder: `/`.
- Ensure you have permission to push to `gh-pages`.

Deploy (auto-detects base path `/<repo>/`, uses `/` for `<user>.github.io` repos):

```zsh
yarn deploy
````

Options:

- Set a custom subpath: `BASE_PATH=/custom/ yarn deploy`
- Skip install (faster): `SKIP_INSTALL=1 yarn deploy`
- Dry-run (no push): `DRY_RUN=1 yarn deploy`

What it does:

- Builds to `build/client` with the correct base path
- Publishes to `gh-pages` branch using a git worktree
- Adds `.nojekyll` and `404.html` fallback for SPA routing

```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
```
