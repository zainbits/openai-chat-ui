import type { Route } from "./+types/home";
import { AppStateProvider } from "../state/AppState";
import Sidebar from "../components/Sidebar";
import ModelChips from "../components/ModelChips";
import ChatArea from "../components/ChatArea";
import GlassButton from "../components/GlassButton";
import { GrMenu } from "react-icons/gr";
import { useAppState } from "../state/AppState";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CustomModels Chat" },
    { name: "description", content: "Customizable chat interface with models" },
  ];
}

function HomeContent() {
  const { data, setData } = useAppState();
  const toggleSidebar = () =>
    setData((d) => ({ ...d, ui: { ...d.ui, sidebarOpen: !d.ui.sidebarOpen } }));

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <GlassButton
          className={`mobile-toggle ${!data.ui.sidebarOpen ? "visible" : ""}`}
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          width={40}
          height={40}
          borderRadius={8}
        >
          <GrMenu className="w-6 h-6" />
        </GlassButton>

        <div className="flex-1 relative min-h-0">
          <ChatArea />
          <div
            className={`absolute top-0 left-0 right-0 z-10 ${
              !data.ui.sidebarOpen ? "model-chips-offset" : ""
            }`}
          >
            <ModelChips />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppStateProvider>
      <HomeContent />
    </AppStateProvider>
  );
}
