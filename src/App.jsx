import { useState } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { StatsProvider, useStats } from "./context/StatsContext";

import TopBar      from "./components/layout/TopBar";
import BottomNav   from "./components/layout/BottomNav";
import HomeScreen  from "./screens/HomeScreen";
import StudyScreen from "./screens/StudyScreen";
import GameScreen  from "./screens/GameScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AIAssistant from "./screens/AIAssistant";
import UpdatePopup from "./components/ui/UpdatePopup";

const TABS = ["home", "study", "game"];

function LoadingScreen({ dark }) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
      <span style={{ fontSize: 64 }}>🇮🇱</span>
      <div className={`text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>Загружаем прогресс...</div>
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
            style={{ animation: `bounce 1s ${i*0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

function AppShell() {
  const { dark, toggle } = useTheme();
  const { ready } = useStats();
  const [tab, setTab] = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const [studySection, setStudySection] = useState(null); // 'alphabet'|'nikud'|'words'

  function openProfile() { setShowProfile(true); }
  function closeProfile() { setShowProfile(false); }

  function navigateToStudy(section) {
    setStudySection(section);
    setTab("study");
  }

  const [studyKey, setStudyKey] = useState(0);

  function handleSetTab(t) {
    if (t === tab && t === "study") {
      // Already on study tab — reset to root
      setStudyKey(k => k + 1);
      setStudySection(null);
    } else {
      setTab(t);
      if (t !== "study") setStudySection(null);
    }
  }

  if (!ready) return <LoadingScreen dark={dark} />;

  // Profile — modal overlay
  if (showProfile) return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <ProfileScreen onBack={closeProfile} />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <TopBar onToggleTheme={toggle} />

      <main style={{ minHeight: "calc(100vh - 56px)" }}>
        {TABS.map(t => (
          <div key={t} style={{ display: tab === t ? "block" : "none" }}>
            {t === "home"  && <HomeScreen onOpenProfile={openProfile} onNavigateStudy={navigateToStudy} />}
            {t === "study" && <StudyScreen key={studyKey} initialSection={studySection} onClearSection={() => setStudySection(null)} />}
            {t === "game"  && <GameScreen />}
          </div>
        ))}
      </main>

      <BottomNav tab={tab} setTab={handleSetTab} />
      <AIAssistant />
      <UpdatePopup dark={dark} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StatsProvider>
        <AppShell />
      </StatsProvider>
    </ThemeProvider>
  );
}
