import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useAppStore } from "../state/store";
import Sidebar from "../components/Sidebar";
import ModelChips from "../components/ModelChips";
import ChatArea from "../components/ChatArea";
import BlurButton from "../components/BlurButton";
import ErrorBoundary from "../components/ErrorBoundary";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { Menu } from "lucide-react";
import { CONNECTION_CHECK_INTERVAL_MS } from "../constants";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CustomModels Chat" },
    { name: "description", content: "Customizable chat interface with models" },
  ];
}

/**
 * Inline fallback component for sidebar errors
 */
function SidebarFallback() {
  return (
    <aside className="sidebar-fallback" role="alert">
      <p>Sidebar failed to load</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </aside>
  );
}

/**
 * Inline fallback component for chat area errors
 */
function ChatAreaFallback() {
  return (
    <div className="chat-fallback" role="alert">
      <p>Chat failed to load</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

/**
 * Inline fallback component for model chips errors
 */
function ModelChipsFallback() {
  return (
    <div className="model-chips-fallback" role="alert">
      <p>Models unavailable</p>
    </div>
  );
}

/**
 * Main home content component
 */
function HomeContent() {
  const sidebarOpen = useAppStore((s) => s.ui.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const hydrate = useAppStore((s) => s._hydrate);
  const hydrated = useAppStore((s) => s._hydrated);
  const checkConnection = useAppStore((s) => s.checkConnection);

  // Hydrate state from IndexedDB on mount
  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  // Check connection on mount and periodically
  useEffect(() => {
    if (!hydrated) return;

    // Initial check
    checkConnection();

    // Periodic check
    const interval = setInterval(checkConnection, CONNECTION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hydrated, checkConnection]);

  // Show loading skeleton until hydrated
  if (!hydrated) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ErrorBoundary fallback={<SidebarFallback />}>
        <Sidebar />
      </ErrorBoundary>
      <div className="main-content" id="main-content">
        <BlurButton
          className={`mobile-toggle ${!sidebarOpen ? "visible" : ""}`}
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          width={40}
          height={40}
          borderRadius={8}
        >
          <Menu className="menu-icon" aria-hidden="true" />
        </BlurButton>

        <div className="chat-wrapper">
          <ErrorBoundary fallback={<ChatAreaFallback />}>
            <ChatArea />
          </ErrorBoundary>
          <div
            className={`model-chips-container ${
              !sidebarOpen ? "model-chips-offset" : ""
            }`}
          >
            <ErrorBoundary fallback={<ModelChipsFallback />}>
              <ModelChips />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Home page component with error boundary
 */
export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
