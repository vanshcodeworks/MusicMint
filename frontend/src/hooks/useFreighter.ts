import { useState, useEffect, useCallback, useRef } from "react";
import {
  isConnected as freighterIsConnected,
  getAddress,
  getNetwork,
  requestAccess,
} from "@stellar/freighter-api";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPECTED_PASSPHRASE = "Test SDF Network ; September 2015";
const STORAGE_KEY         = "soundmint.wallet.v2";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface FreighterState {
  account:      string | null;
  status:       WalletStatus;
  error:        string | null;
  isConnected:  boolean;
  isConnecting: boolean;
  shortAddress: string;
  connect:      () => Promise<void>;
  disconnect:   () => void;
  clearError:   () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(address: string): string {
  if (!address || address.length <= 12) return address;
  return `${address.slice(0, 6)}···${address.slice(-4)}`;
}

function extractAddress(payload: unknown): string {
  if (typeof payload === "string" && payload.length > 0) return payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.address   === "string") return p.address;
    if (typeof p.publicKey === "string") return p.publicKey;
  }
  return "";
}

function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unknown error occurred.";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFreighter(): FreighterState {
  const [account,      setAccount]      = useState<string | null>(null);
  const [status,       setStatus]       = useState<WalletStatus>("idle");
  const [error,        setError]        = useState<string | null>(null);
  const restoredRef = useRef(false);

  // ── Validate Freighter is on Testnet ──

  const ensureTestnet = useCallback(async () => {
    const net = await getNetwork();
    if (net.error) {
      throw new Error(net.error.message || "Could not read Freighter network.");
    }
    if (net.networkPassphrase !== EXPECTED_PASSPHRASE) {
      throw new Error(
        "Freighter is on the wrong network. Please switch to Stellar Testnet and try again."
      );
    }
  }, []);

  // ── Core connect logic ────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      // 1. Is Freighter installed / unlocked?
      const connState = await freighterIsConnected();
      if (connState.error) throw new Error(connState.error.message);
      if (!connState.isConnected) {
        throw new Error(
          "Freighter wallet is not installed or is locked. " +
          "Install the Freighter extension and unlock it, then try again."
        );
      }

      // 2. Validate network
      await ensureTestnet();

      // 3. Get address (request access if needed)
      let addr = "";
      const addrRes = await getAddress();
      if (!addrRes.error) addr = extractAddress(addrRes);

      if (!addr) {
        const access = await requestAccess();
        if (access.error) throw new Error(access.error.message || "Access denied by user.");
        addr = extractAddress(access);
      }

      if (!addr) throw new Error("Freighter did not return a public key.");

      // 4. Persist + update state
      localStorage.setItem(STORAGE_KEY, addr);
      setAccount(addr);
      setStatus("connected");
    } catch (err) {
      const msg = normalizeError(err);
      setError(msg);
      setStatus("error");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [ensureTestnet]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setAccount(null);
    setStatus("disconnected");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ── Restore persisted session on mount ────────────────────────────────────

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    let cancelled = false;

    (async () => {
      try {
        const connState = await freighterIsConnected();
        if (!connState.isConnected || cancelled) return;
        await ensureTestnet();
        const addrRes = await getAddress();
        const addr = extractAddress(addrRes) || saved;
        if (!addr || cancelled) return;
        setAccount(addr);
        setStatus("connected");
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    })();

    return () => { cancelled = true; };
  }, [ensureTestnet]);

  return {
    account,
    status,
    error,
    isConnected:  status === "connected",
    isConnecting: status === "connecting",
    shortAddress: account ? truncate(account) : "",
    connect,
    disconnect,
    clearError,
  };
}