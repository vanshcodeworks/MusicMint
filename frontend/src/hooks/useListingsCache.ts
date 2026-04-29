import { useEffect, useState } from "react";

const CACHE_KEY = "marketplace_listings_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes

export function useListingsCache(incomingListings: any[] | null | undefined) {
  const [listings, setListings] = useState<any[] | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.ts || 0) > CACHE_TTL_MS) return null;
      return parsed.data || null;
    } catch {
      return null;
    }
  });

  // When new data arrives, persist it and use it.
  useEffect(() => {
    if (incomingListings && incomingListings.length > 0) {
      setListings(incomingListings);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: incomingListings }));
      } catch {
        // ignore
      }
    }
  }, [incomingListings]);

  // Provide a manual invalidation helper
  function invalidate() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    setListings(null);
  }

  return { listings, invalidate };
}
