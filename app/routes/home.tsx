import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useAppStore } from "../state/store";
import Sidebar from "../components/Sidebar";
import ModelChips from "../components/ModelChips";
import ChatArea from "../components/ChatArea";
import GlassButton from "../components/GlassButton";
import ErrorBoundary from "../components/ErrorBoundary";
import { GrMenu } from "react-icons/gr";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CustomModels Chat" },
    { name: "description", content: "Customizable chat interface with models" },
  ];
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

  // Hydrate state from localStorage on mount
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

    // Periodic check every 2 minutes
    const interval = setInterval(checkConnection, 120000);

    return () => clearInterval(interval);
  }, [hydrated, checkConnection]);

  // Don't render until hydrated to prevent flash
  if (!hydrated) {
    return null;
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <Sidebar />
      <div className="main-content" id="main-content">
        <GlassButton
          className={`mobile-toggle ${!sidebarOpen ? "visible" : ""}`}
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          width={40}
          height={40}
          borderRadius={8}
        >
          <GrMenu className="w-6 h-6" aria-hidden="true" />
        </GlassButton>

        <div className="flex-1 relative min-h-0">
          <ChatArea />
          <div
            className={`absolute top-0 left-0 right-0 z-10 ${
              !sidebarOpen ? "model-chips-offset" : ""
            }`}
          >
            <ModelChips />
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
