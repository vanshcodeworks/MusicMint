import { NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-neon-purple/50">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <span className="font-display font-semibold text-white tracking-tight">
        Sound<span className="text-neon-purple">Mint</span>
      </span>
    </div>
  );
}

// ─── Wallet button ────────────────────────────────────────────────────────────

function WalletButton() {
  const { isConnected, isConnecting, shortAddress, error, connect, disconnect, clearError } =
    useWallet();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="
          flex items-center gap-2 px-3 py-1.5
          bg-white/4 border border-glass rounded-lg
          text-sm font-mono text-gray-300
        ">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow" />
          {shortAddress}
        </div>
        <button
          type="button"
          onClick={disconnect}
          className="
            px-3 py-1.5 rounded-lg text-xs text-gray-500
            hover:text-red-400 hover:bg-red-500/10
            border border-transparent hover:border-red-500/20
            transition-all duration-200 font-mono
          "
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <button
          type="button"
          onClick={clearError}
          className="text-xs text-red-400/80 font-mono max-w-50 truncate hover:text-red-300"
          title={error}
        >
          ⚠ {error.slice(0, 30)}…
        </button>
      )}
      <button
        type="button"
        onClick={() => void connect()}
        disabled={isConnecting}
        className="
          relative px-4 py-2 rounded-xl text-sm font-semibold
          bg-linear-to-r from-neon-purple to-neon-pink
          hover:opacity-90 active:scale-[0.97]
          text-white shadow-neon-purple/40
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-wait
          overflow-hidden group
        "
      >
        <span className="
          absolute inset-0 -translate-x-full group-hover:translate-x-full
          bg-linear-to-r from-transparent via-white/20 to-transparent
          transition-transform duration-500
        " />
        <span className="relative flex items-center gap-2">
          {isConnecting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Connecting…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Freighter
            </>
          )}
        </span>
      </button>
    </div>
  );
}

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: "/marketplace", label: "Market" },
  { to: "/studio",    label: "Studio" },
  { to: "/collection", label: "Collection" },
] as const;

function NavLinks() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => [
            "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
            isActive
              ? "text-white bg-white/[0.08] border border-glass-hover"
              : "text-gray-500 hover:text-gray-200 hover:bg-white/4",
          ].join(" ")}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  return (
    <header className="
      fixed top-0 inset-x-0 z-40
      bg-abyss/80 backdrop-blur-xl
      border-b border-glass
    ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <NavLink to="/marketplace" className="shrink-0">
          <Logo />
        </NavLink>
        <NavLinks />
        <WalletButton />
      </div>
    </header>
  );
}