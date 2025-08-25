export default {
  // Config options...
  // GitHub Pages is static hosting, so use SPA mode (no SSR)
  ssr: false,
  // Ensure routes resolve under a sub-path like /<repo>/ on GitHub Pages
  basename: process.env.BASE_PATH || "/",
  future: {
    unstable_viteEnvironmentApi: true,
  },
};
