import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { Navbar }          from "./components/Navbar";
import { MarketplacePage } from "./pages/MarketplacePage";
import { StudioPage }      from "./pages/StudioPage";
import { CollectionPage }  from "./pages/CollectionPage";

// ─── Ambient background ────────────────────────────────────────────────────────

function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base dark */}
      <div className="absolute inset-0 bg-void" />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top purple glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-200 h-125 bg-neon-purple/8 rounded-full blur-[160px]" />
      {/* Bottom cyan glow */}
      <div className="absolute -bottom-40 right-0 w-125 h-100 bg-neon-cyan/5 rounded-full blur-[120px]" />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <Background />

        {/* Google Fonts – loaded in index.html or here via style tag */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          html { color-scheme: dark; }
          body { background: #07070f; font-family: 'DM Sans', sans-serif; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 9999px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }
          ::selection { background: rgba(168,85,247,0.3); color: white; }
        `}</style>

        <Navbar />

        <main className="min-h-screen text-white antialiased">
          <Routes>
            <Route path="/"            element={<MarketplacePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/studio"      element={<StudioPage />}      />
            <Route path="/collection"  element={<CollectionPage />}  />
            <Route path="*"            element={<MarketplacePage />} />
          </Routes>
        </main>
      </WalletProvider>
    </BrowserRouter>
  );
}