import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useFreighter, type FreighterState } from "../hooks/useFreighter";
import { fetchDashboard } from "../api";
import type { DashboardResponse } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletContextValue extends FreighterState {
  dashboard:        DashboardResponse | null;
  isDashboardLoading: boolean;
  dashboardError:   string | null;
  refreshDashboard: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const freighter = useFreighter();
  const [dashboard,          setDashboard]          = useState<DashboardResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError,     setDashboardError]     = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await fetchDashboard(freighter.account ?? undefined);
      setDashboard(data);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setIsDashboardLoading(false);
    }
  }, [freighter.account]);

  return (
    <WalletContext.Provider
      value={{
        ...freighter,
        dashboard,
        isDashboardLoading,
        dashboardError,
        refreshDashboard,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}