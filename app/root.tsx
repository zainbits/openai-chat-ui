import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { generateCSSCustomProperties } from "./theme/colors";
import { useEffect, useMemo } from "react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  // Prepare CSS variables from centralized theme
  const cssVars = useMemo(() => generateCSSCustomProperties(), []);
  const cssVarsString = useMemo(() => {
    const entries = Object.entries(cssVars)
      .map(([k, v]) => `${k}: ${v};`)
      .join("");
    return `:root{${entries}}`;
  }, [cssVars]);

  // Ensure variables take precedence over static CSS by applying inline to :root
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
  }, [cssVars]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Fallback so variables exist before hydration; runtime inline styles will override if needed */}
        <style
          id="app-theme-vars"
          dangerouslySetInnerHTML={{ __html: cssVarsString }}
        />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          {children}
          <Notifications position="top-right" />
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      style={{
        paddingTop: "4rem",
        padding: "1rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre
          style={{
            width: "100%",
            padding: "1rem",
            overflowX: "auto",
            background: "#FFFFFF1A",
            borderRadius: "8px",
          }}
        >
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
