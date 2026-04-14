import { useState, useCallback, useEffect } from "react";
import type { ListingItem } from "../types";
import { buyListing } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuyModalProps {
  listing:    ListingItem;
  buyer:      string;
  onSuccess?: (txHash: string) => void;
  onClose:    () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function explorerUrl(txHash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

function fmtXlm(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EqBars() {
  return (
    <div className="flex items-end gap-0.75 h-5">
      {[0.3, 0.7, 0.5, 1, 0.6, 0.9, 0.4].map((h, i) => (
        <div
          key={i}
          className="w-0.75 rounded-sm bg-neon-purple animate-eq-bar origin-bottom"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "sold" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono tracking-wide",
        status === "active"
          ? "bg-neon-green/10 text-neon-green border border-neon-green/25"
          : "bg-gray-500/10 text-gray-400 border border-gray-500/25",
      ].join(" ")}
    >
      <span
        className={[
          "w-1.5 h-1.5 rounded-full",
          status === "active" ? "bg-neon-green animate-pulse" : "bg-gray-500",
        ].join(" ")}
      />
      {status}
    </span>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function BuyModal({ listing, buyer, onSuccess, onClose }: BuyModalProps) {
  const [isBuying,   setIsBuying]   = useState(false);
  const [txHash,     setTxHash]     = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [royaltyPaid, setRoyaltyPaid] = useState<number | null>(null);
  const [amountToBuy, setAmountToBuy] = useState(1);
  const maxAmount = Math.max(1, listing.remainingQuantity || listing.quantity || 1);
  const totalCost = listing.price * amountToBuy;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBuy = useCallback(async () => {
    if (isBuying) return;

    if (!Number.isInteger(amountToBuy) || amountToBuy <= 0) {
      setError("Amount to buy must be a positive whole number.");
      return;
    }

    if (amountToBuy > maxAmount) {
      setError(`Maximum available to buy is ${maxAmount} unit(s).`);
      return;
    }

    setIsBuying(true);
    setError(null);

    try {
      const result = await buyListing(listing.id, buyer, amountToBuy);
      setTxHash(result.contractCall.txHash);
      setRoyaltyPaid(result.sale.royaltyAmount);
      onSuccess?.(result.contractCall.txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed.");
    } finally {
      setIsBuying(false);
    }
  }, [listing.id, buyer, isBuying, onSuccess, amountToBuy, maxAmount]);

  const isSeller    = listing.seller === buyer;
  const isCompleted = Boolean(txHash);

  return (
    /* ── Backdrop ─────────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Buy ${listing.nftTitle}`}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="
          bg-surface/90 backdrop-blur-xl
          border border-glass rounded-2xl
          shadow-glass-lg overflow-hidden
        ">
          {/* ── Top accent line ── */}
          <div className="h-px bg-linear-to-r from-transparent via-neon-purple to-transparent" />

          {/* ── Header ── */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              <p className="text-xs font-mono text-neon-cyan tracking-[0.2em] uppercase mb-1">
                confirm purchase
              </p>
              <h2 className="font-display text-xl font-semibold text-white">
                {listing.nftTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Body ── */}
          <div className="px-6 pb-6 space-y-4">

            {/* Track summary card */}
            {!isCompleted && (
              <div className="bg-white/3 border border-glass rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Track icon */}
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-neon-purple/30 to-neon-pink/20 flex items-center justify-center border border-neon-purple/20">
                      <EqBars />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white leading-tight">
                        {listing.nftTitle}
                      </p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        listing #{listing.contractListingId}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-glass text-xs">
                  <div>
                    <p className="text-gray-500 mb-0.5">Seller</p>
                    <p className="font-mono text-gray-300">
                      {listing.seller.slice(0,6)}···{listing.seller.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Artist</p>
                    <p className="font-mono text-gray-300">
                      {listing.artist.slice(0,6)}···{listing.artist.slice(-4)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-glass text-xs">
                  <div>
                    <p className="text-gray-500 mb-0.5">Listed units</p>
                    <p className="font-mono text-gray-300">{listing.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Units remaining</p>
                    <p className="font-mono text-gray-300">{listing.remainingQuantity}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Price breakdown */}
            {!isCompleted && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 font-mono mb-1.5 uppercase tracking-wider">
                    Amount To Buy
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAmount}
                    value={amountToBuy}
                    onChange={(event) => setAmountToBuy(Number(event.target.value))}
                    className="w-full rounded-lg bg-white/4 border border-glass hover:border-glass-hover focus:border-neon-purple/60 focus:ring-1 focus:ring-neon-purple/20 px-3 py-2 text-sm text-white outline-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-600 font-mono">Max available: {maxAmount}</p>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Price per unit</span>
                  <span className="text-white font-mono font-medium">
                    {fmtXlm(listing.price)} XLM
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-gray-500 font-mono">x{amountToBuy}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Network fee</span>
                  <span className="text-gray-500 font-mono">~0.0001 XLM</span>
                </div>
                <div className="h-px bg-glass" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300 font-medium">Total</span>
                  <div className="text-right">
                    <p className="text-neon-cyan font-display text-lg font-semibold">
                      {fmtXlm(totalCost)} XLM
                    </p>
                    <p className="text-[11px] text-gray-600 font-mono">
                      10% royalty to original artist
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Success state ── */}
            {isCompleted && (
              <div className="text-center py-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-display text-lg font-semibold text-white mb-1">
                  Purchase complete!
                </p>
                {royaltyPaid !== null && (
                  <p className="text-sm text-gray-400 mb-4">
                    Royalty paid to artist:{" "}
                    <span className="text-neon-cyan font-mono">{fmtXlm(royaltyPaid)} XLM</span>
                  </p>
                )}
                {txHash && (
                  <a
                    href={explorerUrl(txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      inline-flex items-center gap-2 px-4 py-2
                      bg-neon-purple/10 hover:bg-neon-purple/20
                      border border-neon-purple/30 hover:border-neon-purple/60
                      text-neon-purple text-sm font-mono rounded-lg
                      transition-all duration-200
                    "
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {txHash.slice(0, 12)}···{txHash.slice(-6)}
                  </a>
                )}
              </div>
            )}

            {/* ── Error state ── */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/25 rounded-lg animate-fade-in">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* ── Seller warning ── */}
            {isSeller && !isCompleted && (
              <div className="flex items-center gap-2 p-3 bg-neon-amber/5 border border-neon-amber/20 rounded-lg">
                <svg className="w-4 h-4 text-neon-amber shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-neon-amber/80">You are the seller of this listing.</p>
              </div>
            )}

            {/* ── Actions ── */}
            {!isCompleted ? (
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    flex-1 py-2.5 px-4 rounded-xl text-sm font-medium
                    bg-white/4 hover:bg-white/8
                    border border-glass hover:border-glass-hover
                    text-gray-400 hover:text-white
                    transition-all duration-200
                  "
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleBuy()}
                  disabled={isSeller || isBuying}
                  className="
                    flex-1 relative py-2.5 px-4 rounded-xl text-sm font-semibold
                    bg-linear-to-r from-neon-purple to-neon-pink
                    hover:opacity-90 active:scale-[0.98]
                    text-white shadow-neon-purple
                    transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                    overflow-hidden group
                  "
                >
                  {/* Shine sweep */}
                  <span className="
                    absolute inset-0 -translate-x-full group-hover:translate-x-full
                    bg-linear-to-r from-transparent via-white/15 to-transparent
                    transition-transform duration-700
                  " />
                  <span className="relative flex items-center justify-center gap-2">
                    {isBuying ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in Freighter…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Buy Now — {fmtXlm(totalCost)} XLM
                      </>
                    )}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="
                  w-full py-2.5 rounded-xl text-sm font-medium
                  bg-neon-green/10 hover:bg-neon-green/20
                  border border-neon-green/30 text-neon-green
                  transition-all duration-200
                "
              >
                Done
              </button>
            )}
          </div>

          {/* ── Bottom accent line ── */}
          <div className="h-px bg-linear-to-r from-transparent via-neon-cyan/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}