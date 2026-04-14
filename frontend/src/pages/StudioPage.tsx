import { useState, type FormEvent } from "react";
import { useWallet } from "../context/WalletContext";
import { mintMusicNft, createListing } from "../api";
import type { MintPayload, ListingPayload } from "../types";

// ─── Shared input style ────────────────────────────────────────────────────────

const inputCls = `
  w-full px-3.5 py-2.5 rounded-xl text-sm
  bg-white/4 border border-glass hover:border-glass-hover
  focus:border-neon-purple/60 focus:ring-1 focus:ring-neon-purple/20
  text-white placeholder-gray-700 outline-none
  transition-colors duration-200 font-body
`.trim();

const labelCls = "block text-xs font-mono text-gray-500 uppercase tracking-wider mb-1.5";

// ─── Mint Panel ────────────────────────────────────────────────────────────────

function MintPanel() {
  const { account, refreshDashboard } = useWallet();
  const [form, setForm] = useState<MintPayload>({
    creator: account || "",
    title:   "",
    genre:   "",
    mediaUrl: "",
    supply:  1,
    perks:   "",
  });
  const [busy,   setBusy]   = useState(false);
  const [notice, setNotice] = useState("");
  const [error,  setError]  = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    setBusy(true); setNotice(""); setError("");
    try {
      const res = await mintMusicNft({ ...form, creator: account });
      setNotice(`✓ Minted "${res.nft.title}" — tx ${res.contractCall.txHash.slice(0,12)}…`);
      setForm({ creator: account, title: "", genre: "", mediaUrl: "", supply: 1, perks: "" });
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="
      bg-surface/60 backdrop-blur-sm
      border border-glass rounded-2xl overflow-hidden
    ">
      <div className="h-px bg-linear-to-r from-transparent via-neon-purple/60 to-transparent" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-base">Mint a Track</h2>
            <p className="text-xs text-gray-600">Deploy your music as an NFT on Soroban</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Track Title</label>
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="My Track" required minLength={2} maxLength={100} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Genre</label>
              <input className={inputCls} value={form.genre} onChange={e => setForm(f => ({...f, genre: e.target.value}))} placeholder="Electronic" required minLength={2} maxLength={40} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Audio / Metadata URL</label>
            <input type="url" className={inputCls} value={form.mediaUrl} onChange={e => setForm(f => ({...f, mediaUrl: e.target.value}))} placeholder="https://arweave.net/…" required />
          </div>

          <div>
            <label className={labelCls}>Limited Supply</label>
            <input type="number" className={inputCls} value={form.supply} onChange={e => setForm(f => ({...f, supply: Number(e.target.value)}))} min={1} max={10000} required />
          </div>

          <div>
            <label className={labelCls}>Collector Perks <span className="normal-case text-gray-700">(optional)</span></label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.perks}
              onChange={e => setForm(f => ({...f, perks: e.target.value}))}
              placeholder="Unreleased stems, Discord access, early demos…"
              maxLength={180}
            />
          </div>

          {notice && (
            <div className="flex items-start gap-2 p-3 bg-neon-green/5 border border-neon-green/20 rounded-lg text-xs text-neon-green font-mono">
              {notice}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !account}
            className="
              w-full py-3 rounded-xl font-semibold text-sm
              bg-linear-to-r from-neon-purple to-neon-pink
              hover:opacity-90 active:scale-[0.98]
              text-white shadow-neon-purple/30
              transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed
              relative overflow-hidden group
            "
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700" />
            <span className="relative">
              {busy ? "Minting on Soroban…" : !account ? "Connect wallet first" : "Mint Track"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── List Panel ────────────────────────────────────────────────────────────────

function ListPanel() {
  const { account, dashboard, refreshDashboard } = useWallet();
  const [form, setForm] = useState({ nftId: "", price: "20", quantity: "1" });
  const [busy,   setBusy]   = useState(false);
  const [notice, setNotice] = useState("");
  const [error,  setError]  = useState("");

  const ownedNfts = (dashboard?.nfts ?? []).filter(n => n.ownedBalance > 0);
  const selectedNft = ownedNfts.find((n) => n.id === form.nftId);
  const maxListableUnits = Math.max(1, selectedNft?.ownedBalance || 1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    setBusy(true); setNotice(""); setError("");

    const quantityToList = Number(form.quantity);
    if (!Number.isInteger(quantityToList) || quantityToList <= 0) {
      setBusy(false);
      setError("Listing quantity must be a positive whole number.");
      return;
    }

    if (selectedNft && quantityToList > selectedNft.ownedBalance) {
      setBusy(false);
      setError(`You only own ${selectedNft.ownedBalance} unit(s) of this track.`);
      return;
    }

    const payload: ListingPayload = {
      seller: account,
      artist: account,
      nftId:  form.nftId,
      price:  Number(form.price),
      quantity: quantityToList,
    };
    try {
      const res = await createListing(payload);
      setNotice(`✓ Listed ${quantityToList} unit(s) of "${res.listing.nftTitle}" at ${form.price} XLM each`);
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Listing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="
      bg-surface/60 backdrop-blur-sm
      border border-glass rounded-2xl overflow-hidden
    ">
      <div className="h-px bg-linear-to-r from-transparent via-neon-cyan/60 to-transparent" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-base">List a Track</h2>
            <p className="text-xs text-gray-600">Create a marketplace listing from owned NFTs</p>
          </div>
        </div>

        {ownedNfts.length === 0 && account && (
          <div className="p-3 mb-4 bg-white/2 border border-glass rounded-lg text-xs text-gray-600 text-center">
            Mint a track first to create listings.
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className={labelCls}>Select Track</label>
            <select
              className={`${inputCls} cursor-pointer`}
              value={form.nftId}
              onChange={e => setForm(f => ({...f, nftId: e.target.value}))}
              required
              disabled={ownedNfts.length === 0}
            >
              <option value="">Select owned NFT…</option>
              {ownedNfts.map(n => (
                <option key={n.id} value={n.id}>#{n.contractTokenId} — {n.title} (x{n.ownedBalance})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Listing Price (XLM)</label>
            <div className="relative">
              <input
                type="number"
                className={inputCls}
                value={form.price}
                onChange={e => setForm(f => ({...f, price: e.target.value}))}
                min={0.1}
                step={0.1}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono pointer-events-none">XLM</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Quantity To List</label>
            <div className="relative">
              <input
                type="number"
                className={inputCls}
                value={form.quantity}
                onChange={e => setForm(f => ({...f, quantity: e.target.value}))}
                min={1}
                max={maxListableUnits}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono pointer-events-none">
                max {maxListableUnits}
              </span>
            </div>
            {selectedNft && (
              <p className="mt-1 text-[11px] text-gray-600 font-mono">
                You own x{selectedNft.ownedBalance} units of this track.
              </p>
            )}
          </div>

          {notice && (
            <div className="p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg text-xs text-neon-cyan font-mono">
              {notice}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !account || ownedNfts.length === 0}
            className="
              w-full py-3 rounded-xl font-semibold text-sm
              bg-linear-to-r from-neon-cyan/80 to-neon-purple/80
              hover:from-neon-cyan hover:to-neon-purple
              text-white shadow-neon-cyan/20
              transition-all duration-200 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {busy ? "Creating listing…" : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StudioPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pt-20">
      <div className="mb-8">
        <p className="text-xs font-mono text-neon-purple tracking-[0.2em] uppercase mb-2">
          Artist Studio
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          Create & Sell
        </h1>
        <p className="mt-2 text-gray-500 text-sm">
          Mint original tracks as on-chain NFTs, then list them directly to your fans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MintPanel />
        <ListPanel />
      </div>
    </div>
  );
}