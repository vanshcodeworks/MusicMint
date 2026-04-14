import { useWallet } from "../context/WalletContext";

function EmptyState() {
  return (
    <div className="text-center py-24 space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-white/3 border border-glass flex items-center justify-center mx-auto">
        <svg className="w-9 h-9 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <div>
        <p className="text-gray-500 font-display">No tracks in your collection yet.</p>
        <p className="text-sm text-gray-700 mt-1">Buy from the marketplace or mint your own tracks.</p>
      </div>
    </div>
  );
}

function NftCard({ nft }: { nft: import("../types").NftItem }) {
  const explorerUrl = (hash: string) =>
    `https://stellar.expert/explorer/testnet/tx/${hash}`;

  return (
    <article className="
      bg-surface/60 backdrop-blur-sm
      border border-glass hover:border-glass-hover
      rounded-2xl overflow-hidden
      hover:-translate-y-1 hover:shadow-card-hover
      transition-all duration-300 group
    ">
      {/* Waveform header */}
      <div className="h-28 bg-linear-to-br from-neon-purple/20 to-neon-pink/10 relative overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-20 group-hover:opacity-30 transition-opacity"
          viewBox="0 0 400 112"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 20 + Math.sin(i * 0.9 + nft.contractTokenId * 1.3) * 28 + Math.sin(i * 0.3) * 16;
            return (
              <rect key={i} x={i * 9} y={(112 - h) / 2} width="5" height={h} rx="2" fill="white" />
            );
          })}
        </svg>

        {/* Token ID */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-mono bg-black/50 backdrop-blur-sm border border-white/10 rounded px-2 py-0.5 text-gray-300">
            #{nft.contractTokenId}
          </span>
        </div>

        {/* Supply badge */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-mono bg-neon-purple/20 border border-neon-purple/30 rounded px-2 py-0.5 text-neon-purple">
            ×{nft.supply}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-white text-sm leading-tight truncate">
            {nft.title}
          </h3>
          <p className="text-xs text-neon-cyan/60 font-mono mt-0.5">{nft.genre}</p>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-neon-cyan/80">Owned x{nft.ownedBalance}</span>
          <span className="text-gray-600">Supply x{nft.supply}</span>
        </div>

        {nft.perks && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {nft.perks}
          </p>
        )}

        <div className="h-px bg-glass" />

        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-gray-600">
            {new Date(nft.createdAt).toLocaleDateString()}
          </span>
          {nft.txHash ? (
            <a
              href={explorerUrl(nft.txHash)}
              target="_blank"
              rel="noreferrer"
              className="
                flex items-center gap-1 text-neon-purple/70 hover:text-neon-purple
                font-mono transition-colors
              "
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              mint tx
            </a>
          ) : (
            <span className="text-gray-700 font-mono">no tx</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function CollectionPage() {
  const { account, dashboard, isConnected, connect, isConnecting } = useWallet();

  const owned = (dashboard?.nfts ?? []).filter(n => n.ownedBalance > 0);

  if (!isConnected) {
    return (
      <div className="pt-14 max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">Connect your wallet to see your collection.</p>
        <button
          type="button"
          onClick={() => void connect()}
          disabled={isConnecting}
          className="px-6 py-2.5 rounded-xl bg-linear-to-r from-neon-purple to-neon-pink text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isConnecting ? "Connecting…" : "Connect Freighter"}
        </button>
      </div>
    );
  }

  return (
    <div className="pt-14 max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <p className="text-xs font-mono text-neon-pink tracking-[0.2em] uppercase mb-2 mt-5">
          Fan Collection
        </p>
        <h1 className="font-display text-3xl font-bold text-white">My Tracks</h1>
        <p className="mt-2 text-gray-500 text-sm font-mono">
          {account?.slice(0, 8)}···{account?.slice(-6)} · {owned.length} track{owned.length !== 1 ? "s" : ""}
        </p>
      </div>

      {owned.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {owned.map(nft => <NftCard key={nft.id} nft={nft} />)}
        </div>
      )}
    </div>
  );
}