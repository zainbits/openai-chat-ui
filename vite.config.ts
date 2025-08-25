/// <reference types="node" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Set base for GitHub Pages subpath deployments, e.g. /<repo-name>/
  base: process.env.BASE_PATH || "/",
  plugins: [reactRouter(), tsconfigPaths()],
});
