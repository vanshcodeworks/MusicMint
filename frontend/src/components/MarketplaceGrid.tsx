import { useState, useMemo } from "react";
import type { ListingItem } from "../types";
import { BuyModal } from "./BuyModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceGridProps {
  listings:       ListingItem[];
  account:        string | null;
  onPurchased?:   () => void;
}

type SortKey = "newest" | "price-asc" | "price-desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENRE_GRADIENTS: Record<string, string> = {
  "electronic":  "from-cyan-500/30  to-purple-600/20",
  "hip-hop":     "from-orange-500/30 to-pink-600/20",
  "ambient":     "from-teal-500/30   to-blue-600/20",
  "lo-fi":       "from-amber-500/30  to-orange-600/20",
  "jazz":        "from-yellow-500/30 to-red-600/20",
  "classical":   "from-blue-500/30   to-indigo-600/20",
  "pop":         "from-pink-500/30   to-rose-600/20",
  "rock":        "from-red-500/30    to-orange-600/20",
};

function genreGradient(genre: string): string {
  const key = genre.toLowerCase().trim();
  for (const [k, v] of Object.entries(GENRE_GRADIENTS)) {
    if (key.includes(k)) return v;
  }
  return "from-neon-purple/20 to-neon-pink/10";
}

function fmtXlm(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

interface CardProps {
  listing:     ListingItem;
  isSelf:      boolean;
  onBuy:       (listing: ListingItem) => void;
}

function ListingCard({ listing, isSelf, onBuy }: CardProps) {
  const gradient = genreGradient("electronic"); // replace with listing.genre if available

  return (
    <article className="
      group relative
      bg-surface/60 backdrop-blur-sm
      border border-glass hover:border-glass-hover
      rounded-2xl overflow-hidden
      hover:shadow-card-hover
      transition-all duration-300 ease-out
      hover:-translate-y-1
    ">
      {/* Gradient header */}
      <div className={`h-32 bg-linear-to-br ${gradient} relative overflow-hidden`}>
        {/* Decorative waveform SVG */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 400 128"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const h =
              20 +
              Math.sin(i * 0.8 + listing.contractListingId) * 30 +
              Math.sin(i * 1.7 + listing.contractListingId * 0.31) * 10;
            return (
              <rect
                key={i}
                x={i * 9}
                y={(128 - h) / 2}
                width="5"
                height={h}
                rx="2"
                fill="white"
              />
            );
          })}
        </svg>

        {/* Token ID badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-mono bg-black/40 backdrop-blur-sm border border-white/10 rounded px-2 py-0.5 text-gray-300">
            #{listing.contractListingId}
          </span>
        </div>

        {/* Status indicator */}
        <div className="absolute top-3 right-3">
          <span className={[
            "flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full",
            listing.status === "active"
              ? "bg-neon-green/20 border border-neon-green/30 text-neon-green"
              : "bg-gray-500/20 border border-gray-500/30 text-gray-400",
          ].join(" ")}>
            <span className={["w-1.5 h-1.5 rounded-full", listing.status === "active" ? "bg-neon-green animate-pulse" : "bg-gray-500"].join(" ")} />
            {listing.status}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Title & addresses */}
        <div>
          <h3 className="font-display font-semibold text-white text-base leading-tight truncate">
            {listing.nftTitle}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-gray-500 font-mono truncate">
              {listing.seller.slice(0,6)}···{listing.seller.slice(-4)}
            </span>
            {listing.seller !== listing.artist && (
              <>
                <span className="text-gray-700 text-xs">→</span>
                <span className="text-[11px] text-neon-cyan/60 font-mono truncate">
                  {listing.artist.slice(0,6)}···{listing.artist.slice(-4)}
                </span>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-white/4 border border-glass text-gray-500">
              listed x{listing.quantity}
            </span>
            <span className="px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan/80">
              remaining x{listing.remainingQuantity}
            </span>
          </div>
        </div>

        {/* Audio player (only if mediaUrl is an actual audio file) */}
        {/* Uncomment if your NFTs have audio URLs:
        <AudioPlayer src={listing.mediaUrl} trackId={listing.id} />
        */}

        {/* Divider */}
        <div className="h-px bg-glass" />

        {/* Price + buy row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-mono">Price</p>
            <p className="text-neon-cyan font-display font-semibold text-lg leading-none mt-0.5">
              {fmtXlm(listing.price)}
              <span className="text-xs ml-1 text-gray-500 font-mono">XLM</span>
            </p>
          </div>

          <button
            type="button"
            disabled={isSelf || listing.status !== "active"}
            onClick={() => onBuy(listing)}
            className="
              relative px-4 py-2 rounded-xl text-sm font-semibold
              bg-linear-to-r from-neon-purple/80 to-neon-pink/80
              hover:from-neon-purple hover:to-neon-pink
              text-white shadow-neon-purple/50
              transition-all duration-200 active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
              overflow-hidden group/btn
            "
          >
            <span className="
              absolute inset-0 -translate-x-full group-hover/btn:translate-x-full
              bg-linear-to-r from-transparent via-white/20 to-transparent
              transition-transform duration-500
            " />
            <span className="relative">
              {isSelf ? "Your listing" : listing.status === "active" ? "Buy" : "Sold"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Controls toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  total,
  sort,
  filter,
  onSort,
  onFilter,
}: {
  total:    number;
  sort:     SortKey;
  filter:   string;
  onSort:   (s: SortKey) => void;
  onFilter: (f: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm text-gray-400">
          {total} listing{total !== 1 ? "s" : ""}
        </span>
        <span className="w-1 h-1 rounded-full bg-gray-700" />
        <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow" />
        <span className="text-xs text-neon-green font-mono">live</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search/filter */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => onFilter(e.target.value)}
            placeholder="Filter tracks…"
            className="
              pl-9 pr-3 py-1.5 text-sm
              bg-white/4 border border-glass hover:border-glass-hover focus:border-neon-purple/50
              rounded-lg text-gray-300 placeholder-gray-700
              outline-none focus:ring-1 focus:ring-neon-purple/30
              transition-colors w-40
            "
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="
            px-3 py-1.5 text-sm
            bg-white/4 border border-glass hover:border-glass-hover
            rounded-lg text-gray-400
            outline-none focus:ring-1 focus:ring-neon-purple/30
            transition-colors cursor-pointer
          "
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MarketplaceGrid({ listings, account, onPurchased }: MarketplaceGridProps) {
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [sort,   setSort]   = useState<SortKey>("newest");
  const [filter, setFilter] = useState("");

  const activeListings = useMemo(() => {
    let items = listings.filter((l) => l.status === "active");

    if (filter.trim()) {
      const q = filter.toLowerCase();
      items = items.filter((l) => l.nftTitle.toLowerCase().includes(q));
    }

    switch (sort) {
      case "price-asc":  return [...items].sort((a, b) => a.price - b.price);
      case "price-desc": return [...items].sort((a, b) => b.price - a.price);
      default:           return [...items].sort((a, b) => b.contractListingId - a.contractListingId);
    }
  }, [listings, sort, filter]);

  function handleBuy(listing: ListingItem) {
    if (!account) return;
    setSelectedListing(listing);
  }

  function handlePurchased() {
    setSelectedListing(null);
    onPurchased?.();
  }

  return (
    <section>
      <Toolbar
        total={activeListings.length}
        sort={sort}
        filter={filter}
        onSort={setSort}
        onFilter={setFilter}
      />

      {activeListings.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/3 border border-glass flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">
            {filter ? "No tracks match your search." : "No active listings yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isSelf={listing.seller === account}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}

      {selectedListing && account && (
        <BuyModal
          listing={selectedListing}
          buyer={account}
          onSuccess={handlePurchased}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </section>
  );
}