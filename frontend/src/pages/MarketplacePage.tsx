import { useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { MarketplaceGrid } from "../components/MarketplaceGrid";

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { isConnected, connect, isConnecting } = useWallet();
  return (
    <div className="relative text-center py-24 px-4 overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-100 bg-neon-purple/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-neon-cyan/8 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] bg-neon-pink/8 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-purple/10 border border-neon-purple/25 rounded-full text-xs font-mono text-neon-purple mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
          Stellar Soroban Testnet
        </div>

        <h1 className="font-display text-5xl sm:text-6xl font-bold text-white leading-[1.05] mb-5">
          Own the music.<br />
          <span className="bg-linear-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent">
            Own the master.
          </span>
        </h1>

        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          Mint limited-edition music NFTs, sell direct to your fans, and earn royalties
          on every secondary sale — forever.
        </p>

        {!isConnected && (
          <button
            type="button"
            onClick={() => void connect()}
            disabled={isConnecting}
            className="
              inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl
              font-display font-semibold text-base
              bg-linear-to-r from-neon-purple to-neon-pink
              hover:opacity-90 active:scale-[0.97]
              text-white shadow-neon-purple
              transition-all duration-200
              disabled:opacity-50
            "
          >
            {isConnecting ? "Connecting…" : "Connect Freighter to Start"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mt-12 text-center">
          {[
            { label: "Decentralized", icon: "🔗" },
            { label: "10% Royalties", icon: "💜" },
            { label: "Direct to Fan", icon: "🎵" },
          ].map(({ label, icon }) => (
            <div key={label} className="text-xs font-mono text-gray-600">
              <span className="text-base mr-1.5">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard stats bar ───────────────────────────────────────────────────────

function StatsBar() {
  const { dashboard } = useWallet();
  if (!dashboard) return null;

  const stats = [
    { label: "Tracks Minted",   value: dashboard.totals.minted },
    { label: "Active Listings", value: dashboard.totals.activeListings },
    { label: "Sales Completed", value: dashboard.totals.completedSales },
    { label: "Creator Royalty", value: `${(dashboard.config.royaltyBps / 100).toFixed(0)}%` },
  ];

  return (
    <div className="border-y border-glass bg-surface/30 backdrop-blur-sm px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="font-display text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-600 font-mono mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MarketplacePage() {
  const { isConnected, dashboard, isDashboardLoading, dashboardError, refreshDashboard, account } =
    useWallet();

  useEffect(() => {
    void refreshDashboard();
  }, [isConnected, refreshDashboard]);

  return (
    <div className="pt-14">
      <Hero />
      {isConnected && <StatsBar />}

      {isConnected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-mono text-neon-cyan tracking-[0.2em] uppercase mb-1">Marketplace</p>
              <h2 className="font-display text-2xl font-bold text-white">Active Listings</h2>
            </div>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={isDashboardLoading}
              className="
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
                bg-white/4 border border-glass hover:border-glass-hover
                text-gray-500 hover:text-gray-300
                transition-all duration-200
                disabled:opacity-50
              "
            >
              <svg className={`w-3.5 h-3.5 ${isDashboardLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isDashboardLoading ? "Syncing…" : "Refresh"}
            </button>
          </div>

          {dashboardError && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 font-mono">
              {dashboardError}
            </div>
          )}

          <MarketplaceGrid
            listings={dashboard?.listings ?? []}
            account={account}
            onPurchased={() => void refreshDashboard()}
          />
        </div>
      )}
    </div>
  );
}