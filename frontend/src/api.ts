import { signTransaction } from "@stellar/freighter-api";
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  type xdr,
} from "@stellar/stellar-sdk";
import type {
  ContractCall,
  DashboardResponse,
  ListingItem,
  ListingPayload,
  MintPayload,
  NftItem,
  SaleItem,
} from "./types";
const STROOPS_PER_XLM = 10_000_000n;
const TX_CACHE_KEY = "soundmint.tx-cache.v1";
const readOnlySourceAccount =
  import.meta.env.VITE_SOROBAN_READ_ACCOUNT || Keypair.random().publicKey();

export const sorobanRpcUrl =
  import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const sorobanNetworkPassphrase =
  import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const musicNftContractId =
  import.meta.env.VITE_MUSIC_NFT_CONTRACT_ID ;
export const marketplaceContractId =
  import.meta.env.VITE_MARKETPLACE_CONTRACT_ID ;
export const testnetXlmTokenContractId =
  import.meta.env.VITE_TESTNET_XLM_CONTRACT_ID ;

const sorobanBaseFee = import.meta.env.VITE_SOROBAN_BASE_FEE;
const resolvedSorobanBaseFee =
  (typeof sorobanBaseFee === "string" && sorobanBaseFee.trim()) || String(BASE_FEE);
const sorobanPollAttempts = Number(
  import.meta.env.VITE_SOROBAN_POLL_ATTEMPTS || "25",
);

const server = new rpc.Server(sorobanRpcUrl);

type TxCacheSection = "nfts" | "listings" | "sales";

interface TxCache {
  nfts: Record<string, string>;
  listings: Record<string, string>;
  sales: Record<string, string>;
}

interface ChainToken {
  id: number;
  creator: string;
  title: string;
  genre: string;
  mediaUri: string;
  perks: string;
  supply: number;
  createdAt: number;
}

interface ChainListing {
  id: number;
  tokenId: number;
  nftContractId: string;
  seller: string;
  artist: string;
  paymentTokenContractId: string;
  priceStroops: bigint;
  quantity: number;
  remainingQuantity: number;
  active: boolean;
  createdAt: number;
}

interface ChainSale {
  id: number;
  listingId: number;
  tokenId: number;
  seller: string;
  buyer: string;
  amountBought: number;
  totalPriceStroops: bigint;
  soldAt: number;
}

function createEmptyTxCache(): TxCache {
  return {
    nfts: {},
    listings: {},
    sales: {},
  };
}

function isConfiguredValue(value: string) {
  return (
    Boolean(value) &&
    !value.includes("PENDING") &&
    !value.includes("REPLACE_WITH")
  );
}

function requireConfiguredValue(value: string, label: string) {
  if (!isConfiguredValue(value)) {
    throw new Error(`${label} is not configured`);
  }
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

function networkLabel() {
  if (sorobanNetworkPassphrase.includes("Test")) {
    return "testnet";
  }

  if (sorobanNetworkPassphrase.includes("Public")) {
    return "public";
  }

  return "custom";
}

function toRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} was not an object`);
  }

  return value as Record<string, unknown>;
}

function field(
  source: Record<string, unknown>,
  keys: string[],
  label: string,
): unknown {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  throw new Error(`${label} missing required field`);
}

function optionalField(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function unwrapContractRecord(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  let current: unknown = raw;

  // Different SDK/runtime versions can wrap Option-like values differently.
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return current;
    }

    const record = current as Record<string, unknown>;
    const keys = Object.keys(record);

    if (keys.length === 1 && keys[0] === "none") {
      return null;
    }

    if (keys.length === 1) {
      const wrappedKey = keys[0];
      if (["some", "value", "val", "ok", "result"].includes(wrappedKey)) {
        current = record[wrappedKey];
        continue;
      }
    }

    if ("status" in record) {
      const status = String(record.status || "").toLowerCase();

      if (status === "none") {
        return null;
      }

      if (status === "some" || status === "ok" || status === "success") {
        const wrapped = optionalField(record, ["value", "val", "result", "data"]);
        if (wrapped !== undefined) {
          current = wrapped;
          continue;
        }
      }
    }

    return current;
  }

  return current;
}

function toBigInt(value: unknown, label: string) {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error(`${label} was not an integer`);
}

function toNumber(value: unknown, label: string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} was not finite`);
    }

    return value;
  }

  const asBigInt = toBigInt(value, label);

  if (
    asBigInt > BigInt(Number.MAX_SAFE_INTEGER) ||
    asBigInt < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error(`${label} is outside safe numeric range`);
  }

  return Number(asBigInt);
}

function toStringValue(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new Error(`${label} was not a string`);
  }

  return value;
}

function toAddressString(value: unknown, label: string) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = value as { address?: string; publicKey?: string };

    if (typeof candidate.address === "string") {
      return candidate.address;
    }

    if (typeof candidate.publicKey === "string") {
      return candidate.publicKey;
    }
  }

  throw new Error(`${label} was not an address`);
}

function toBoolean(value: unknown, label: string) {
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`${label} was not a boolean`);
}

function secondsToIso(seconds: unknown, label: string) {
  const numeric = toNumber(seconds, label);
  return new Date(numeric * 1000).toISOString();
}

function xlmToStroops(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Price must be greater than zero");
  }

  return BigInt(Math.round(value * Number(STROOPS_PER_XLM)));
}

function stroopsToXlm(value: unknown, label: string) {
  const stroops = toBigInt(value, label);
  return Number(stroops) / Number(STROOPS_PER_XLM);
}

function loadTxCache(): TxCache {
  if (typeof window === "undefined") {
    return createEmptyTxCache();
  }

  const raw = window.localStorage.getItem(TX_CACHE_KEY);

  if (!raw) {
    return createEmptyTxCache();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TxCache>;
    return {
      nfts: parsed.nfts || {},
      listings: parsed.listings || {},
      sales: parsed.sales || {},
    };
  } catch {
    return createEmptyTxCache();
  }
}

function saveTxCache(cache: TxCache) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TX_CACHE_KEY, JSON.stringify(cache));
}

function setTxHash(section: TxCacheSection, id: string, txHash: string) {
  const cache = loadTxCache();
  cache[section][id] = txHash;
  saveTxCache(cache);
}

function txHashFromCache(cache: TxCache, section: TxCacheSection, id: string) {
  return cache[section][id] || "";
}

function createContractCall(action: string, contractId: string, txHash: string): ContractCall {
  return {
    action,
    contractId,
    network: networkLabel(),
    rpcUrl: sorobanRpcUrl,
    txHash,
    timestamp: new Date().toISOString(),
  };
}

async function signWithFreighter(transactionXdr: string, address: string) {
  const response = await signTransaction(transactionXdr, {
    networkPassphrase: sorobanNetworkPassphrase,
    address,
  });

  if (response.error) {
    throw new Error(response.error.message || "Freighter rejected signing request");
  }

  if (!response.signedTxXdr) {
    throw new Error("Freighter did not return a signed transaction");
  }

  return response.signedTxXdr;
}

async function submitContractCall(params: {
  address: string;
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}) {
  requireConfiguredValue(params.contractId, "Contract ID");

  const sourceAccount = await server.getAccount(params.address);
  const contract = new Contract(params.contractId);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: resolvedSorobanBaseFee,
    networkPassphrase: sorobanNetworkPassphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(transaction);
  const signedXdr = await signWithFreighter(prepared.toXDR(), params.address);
  const signedTransaction = TransactionBuilder.fromXDR(
    signedXdr,
    sorobanNetworkPassphrase,
  );

  const sent = await server.sendTransaction(signedTransaction);

  if (sent.status === "ERROR") {
    throw new Error("Soroban RPC rejected the transaction");
  }

  if (sent.status === "TRY_AGAIN_LATER") {
    throw new Error("Soroban RPC asked to retry transaction later");
  }

  const finalized = await server.pollTransaction(sent.hash, {
    attempts: sorobanPollAttempts,
  });

  if (finalized.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Transaction failed before reaching SUCCESS on-chain");
  }

  return {
    contractCall: createContractCall(params.method, params.contractId, sent.hash),
    returnValue:
      finalized.returnValue === undefined
        ? null
        : scValToNative(finalized.returnValue),
  };
}

async function simulateContractCall(params: {
  sourceAddress?: string;
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}) {
  requireConfiguredValue(params.contractId, "Contract ID");

  let source = new Account(readOnlySourceAccount, "0");

  if (params.sourceAddress) {
    try {
      source = await server.getAccount(params.sourceAddress);
    } catch {
      source = new Account(readOnlySourceAccount, "0");
    }
  }

  const contract = new Contract(params.contractId);
  const transaction = new TransactionBuilder(source, {
    fee: resolvedSorobanBaseFee,
    networkPassphrase: sorobanNetworkPassphrase,
  })
    .addOperation(contract.call(params.method, ...params.args))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error || "Soroban simulation failed");
  }

  if (!simulation.result) {
    return null;
  }

  return scValToNative(simulation.result.retval);
}

function parseChainToken(raw: unknown) {
  const normalized = unwrapContractRecord(raw);

  if (!normalized) {
    return null;
  }

  const record = toRecord(normalized, "music token");

  return {
    id: toNumber(field(record, ["id"], "music token"), "token id"),
    creator: toAddressString(
      field(record, ["creator"], "music token"),
      "token creator",
    ),
    title: toStringValue(field(record, ["title"], "music token"), "token title"),
    genre: toStringValue(field(record, ["genre"], "music token"), "token genre"),
    mediaUri: toStringValue(
      field(record, ["media_uri", "mediaUri"], "music token"),
      "token media uri",
    ),
    perks: toStringValue(field(record, ["perks"], "music token"), "token perks"),
    supply: toNumber(field(record, ["supply"], "music token"), "token supply"),
    createdAt: toNumber(
      field(record, ["created_at", "createdAt"], "music token"),
      "token created_at",
    ),
  } as ChainToken;
}

function parseChainListing(raw: unknown) {
  const normalized = unwrapContractRecord(raw);

  if (!normalized) {
    return null;
  }

  const record = toRecord(normalized, "listing");
  const quantityRaw = optionalField(record, [
    "quantity",
    "listed_quantity",
    "total_quantity",
  ]);
  const remainingRaw = optionalField(record, [
    "remaining_quantity",
    "remaining",
    "quantity_left",
    "available_quantity",
  ]);
  const quantity =
    quantityRaw === undefined
      ? 1
      : Math.max(0, toNumber(quantityRaw, "listing quantity"));
  const remainingQuantity =
    remainingRaw === undefined
      ? quantity
      : Math.max(0, toNumber(remainingRaw, "listing remaining quantity"));

  return {
    id: toNumber(field(record, ["id"], "listing"), "listing id"),
    tokenId: toNumber(field(record, ["token_id", "tokenId"], "listing"), "token id"),
    nftContractId: toAddressString(
      field(record, ["nft_contract", "nftContract", "nftContractId"], "listing"),
      "listing nft contract",
    ),
    seller: toAddressString(field(record, ["seller"], "listing"), "listing seller"),
    artist: toAddressString(field(record, ["artist"], "listing"), "listing artist"),
    paymentTokenContractId: toAddressString(
      field(
        record,
        ["payment_token", "paymentToken", "paymentTokenContractId"],
        "listing",
      ),
      "listing payment token",
    ),
    priceStroops: toBigInt(
      field(
        record,
        ["price_per_unit", "pricePerUnit", "price", "price_stroops", "priceStroops"],
        "listing",
      ),
      "listing price",
    ),
    quantity,
    remainingQuantity,
    active: toBoolean(field(record, ["active"], "listing"), "listing active flag"),
    createdAt: toNumber(
      field(record, ["created_at", "createdAt"], "listing"),
      "listing created_at",
    ),
  } as ChainListing;
}

function parseChainSale(raw: unknown) {
  const normalized = unwrapContractRecord(raw);

  if (!normalized) {
    return null;
  }

  const record = toRecord(normalized, "sale receipt");

  return {
    id: toNumber(field(record, ["id"], "sale receipt"), "sale id"),
    listingId: toNumber(
      field(record, ["listing_id", "listingId"], "sale receipt"),
      "sale listing_id",
    ),
    tokenId: toNumber(
      field(record, ["token_id", "tokenId"], "sale receipt"),
      "sale token_id",
    ),
    seller: toAddressString(field(record, ["seller"], "sale receipt"), "sale seller"),
    buyer: toAddressString(field(record, ["buyer"], "sale receipt"), "sale buyer"),
    amountBought: toNumber(
      field(record, ["amount_bought", "amountBought"], "sale receipt"),
      "sale amount_bought",
    ),
    totalPriceStroops: toBigInt(
      field(
        record,
        [
          "total_price",
          "totalPrice",
          "total_price_stroops",
          "totalPriceStroops",
          "sale_price",
          "salePrice",
        ],
        "sale receipt",
      ),
      "sale total price",
    ),
    soldAt: toNumber(
      field(record, ["sold_at", "soldAt"], "sale receipt"),
      "sold_at",
    ),
  } as ChainSale;
}

async function getTokenById(tokenId: number, sourceAddress?: string) {
  const raw = await simulateContractCall({
    sourceAddress,
    contractId: musicNftContractId,
    method: "get_token",
    args: [nativeToScVal(BigInt(tokenId), { type: "u64" })],
  });

  return parseChainToken(raw);
}

async function getBalanceOf(
  ownerAddress: string,
  tokenId: number,
  sourceAddress?: string,
) {
  const raw = await simulateContractCall({
    sourceAddress,
    contractId: musicNftContractId,
    method: "balance_of",
    args: [
      nativeToScVal(ownerAddress, { type: "address" }),
      nativeToScVal(BigInt(tokenId), { type: "u64" }),
    ],
  });

  if (raw === null) {
    return 0;
  }

  return Math.max(0, toNumber(raw, "token balance"));
}

async function getListingById(listingId: number, sourceAddress?: string) {
  const raw = await simulateContractCall({
    sourceAddress,
    contractId: marketplaceContractId,
    method: "get_listing",
    args: [nativeToScVal(BigInt(listingId), { type: "u64" })],
  });

  return parseChainListing(raw);
}

async function getSaleReceiptById(receiptId: number, sourceAddress?: string) {
  const raw = await simulateContractCall({
    sourceAddress,
    contractId: marketplaceContractId,
    method: "get_sale_receipt",
    args: [nativeToScVal(BigInt(receiptId), { type: "u64" })],
  });

  return parseChainSale(raw);
}

function toNftItem(token: ChainToken, txCache: TxCache, ownedBalance: number): NftItem {
  const id = String(token.id);

  return {
    id,
    tokenId: `token-${token.id}`,
    contractTokenId: token.id,
    title: token.title,
    genre: token.genre,
    mediaUrl: token.mediaUri,
    supply: token.supply,
    creator: token.creator,
    ownedBalance,
    perks: token.perks,
    txHash: txHashFromCache(txCache, "nfts", id),
    createdAt: secondsToIso(token.createdAt, "token created_at"),
    updatedAt: secondsToIso(token.createdAt, "token created_at"),
  };
}

function toListingItem(
  listing: ChainListing,
  tokenById: Map<number, ChainToken>,
  txCache: TxCache,
): ListingItem {
  const id = String(listing.id);
  const linkedToken = tokenById.get(listing.tokenId);

  return {
    id,
    contractListingId: listing.id,
    nftId: String(listing.tokenId),
    nftTitle: linkedToken?.title || `Track #${listing.tokenId}`,
    seller: listing.seller,
    artist: listing.artist,
    nftContractId: listing.nftContractId,
    paymentTokenContractId: listing.paymentTokenContractId,
    price: stroopsToXlm(listing.priceStroops, "listing price"),
    quantity: listing.quantity,
    remainingQuantity: listing.remainingQuantity,
    status: listing.active ? "active" : "sold",
    txHash: txHashFromCache(txCache, "listings", id),
    createdAt: secondsToIso(listing.createdAt, "listing created_at"),
    updatedAt: secondsToIso(listing.createdAt, "listing created_at"),
  };
}

function toSaleItem(
  sale: ChainSale,
  tokenById: Map<number, ChainToken>,
  listingById: Map<number, ChainListing>,
  txCache: TxCache,
  royaltyBps: number,
): SaleItem {
  const listingId = String(sale.listingId);
  const saleId = String(sale.id);
  const linkedListing = listingById.get(sale.listingId);
  const linkedToken = tokenById.get(sale.tokenId);
  const normalizedRoyaltyBps = Math.max(0, royaltyBps);
  const royaltyAmountStroops =
    (sale.totalPriceStroops * BigInt(normalizedRoyaltyBps)) / 10_000n;
  const sellerAmountStroops = sale.totalPriceStroops - royaltyAmountStroops;

  return {
    id: `sale-${saleId}`,
    listingId,
    nftId: String(sale.tokenId),
    nftTitle: linkedToken?.title || `Track #${sale.tokenId}`,
    buyer: sale.buyer,
    seller: sale.seller,
    artist: linkedListing?.artist || linkedToken?.creator || sale.seller,
    amountBought: sale.amountBought,
    salePrice: stroopsToXlm(sale.totalPriceStroops, "sale total price"),
    royaltyBps: normalizedRoyaltyBps,
    royaltyAmount: stroopsToXlm(royaltyAmountStroops, "royalty amount"),
    sellerAmount: stroopsToXlm(sellerAmountStroops, "seller amount"),
    txHash: txHashFromCache(txCache, "sales", saleId),
    createdAt: secondsToIso(sale.soldAt, "sale sold_at"),
  };
}


interface MintResponse {
  message: string;
  nft: NftItem;
  contractCall: ContractCall;
}

interface ListingResponse {
  message: string;
  listing: ListingItem;
  contractCall: ContractCall;
}

interface BuyResponse {
  message: string;
  sale: SaleItem;
  contractCall: ContractCall;
}

function emptyDashboardResponse(): DashboardResponse {
  return {
    nfts: [],
    listings: [],
    sales: [],
    totals: {
      minted: 0,
      activeListings: 0,
      completedSales: 0,
    },
    config: {
      royaltyBps: 1000,
      musicNftContractId,
      marketplaceContractId,
      paymentTokenContractId: testnetXlmTokenContractId,
      sorobanRpcUrl,
    },
  };
}

export async function fetchDashboard(sourceAddress?: string) {
  if (!isConfiguredValue(musicNftContractId) || !isConfiguredValue(marketplaceContractId)) {
    return emptyDashboardResponse();
  }

  try {
    const [royaltyRaw, totalTokensRaw, totalListingsRaw, totalSalesRaw] = await Promise.all([
      simulateContractCall({
        sourceAddress,
        contractId: marketplaceContractId,
        method: "royalty_bps",
        args: [],
      }),
      simulateContractCall({
        sourceAddress,
        contractId: musicNftContractId,
        method: "total_tokens",
        args: [],
      }),
      simulateContractCall({
        sourceAddress,
        contractId: marketplaceContractId,
        method: "total_listings",
        args: [],
      }),
      simulateContractCall({
        sourceAddress,
        contractId: marketplaceContractId,
        method: "total_sales",
        args: [],
      }).catch(() => null),
    ]);

    const royaltyBps = royaltyRaw === null ? 1000 : toNumber(royaltyRaw, "royalty bps");
    const totalTokens =
      totalTokensRaw === null ? 0 : Math.max(0, toNumber(totalTokensRaw, "total tokens"));
    const totalListings =
      totalListingsRaw === null
        ? 0
        : Math.max(0, toNumber(totalListingsRaw, "total listings"));
    const totalSales =
      totalSalesRaw === null
        ? totalListings
        : Math.max(0, toNumber(totalSalesRaw, "total sales"));

    const tokenIds = Array.from({ length: totalTokens }, (_, index) => index + 1);
    const tokenResults = await Promise.all(
      tokenIds.map((tokenId) => getTokenById(tokenId, sourceAddress)),
    );

    const tokenById = new Map<number, ChainToken>();
    for (const token of tokenResults) {
      if (token) {
        tokenById.set(token.id, token);
      }
    }

    const txCache = loadTxCache();
    const connectedAddress = sourceAddress?.trim();
    const balanceByTokenId = new Map<number, number>();

    if (connectedAddress) {
      const balanceResults = await Promise.all(
        [...tokenById.keys()].map(async (tokenId) => {
          const balance = await getBalanceOf(connectedAddress, tokenId, sourceAddress);
          return [tokenId, balance] as const;
        }),
      );

      for (const [tokenId, balance] of balanceResults) {
        balanceByTokenId.set(tokenId, balance);
      }
    }

    const nfts = [...tokenById.values()]
      .map((token) => toNftItem(token, txCache, balanceByTokenId.get(token.id) || 0))
      .sort((left, right) => right.contractTokenId - left.contractTokenId);

    const listingIds = Array.from({ length: totalListings }, (_, index) => index + 1);
    const listingResults = await Promise.all(
      listingIds.map((listingId) => getListingById(listingId, sourceAddress)),
    );

    const chainListings = listingResults.filter(
      (listing): listing is ChainListing => Boolean(listing),
    );
    const listingById = new Map<number, ChainListing>();
    for (const listing of chainListings) {
      listingById.set(listing.id, listing);
    }

    const listings = chainListings
      .map((listing) => toListingItem(listing, tokenById, txCache))
      .sort((left, right) => right.contractListingId - left.contractListingId);

    const cachedSaleIds = Object.keys(txCache.sales)
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const receiptIdSet = new Set<number>();
    for (let receiptId = 1; receiptId <= totalSales; receiptId += 1) {
      receiptIdSet.add(receiptId);
    }
    for (const receiptId of cachedSaleIds) {
      receiptIdSet.add(receiptId);
    }

    const receiptIds = [...receiptIdSet].sort((left, right) => left - right);
    const saleResults = await Promise.all(
      receiptIds.map((receiptId) => getSaleReceiptById(receiptId, sourceAddress)),
    );

    const sales = saleResults
      .filter((sale): sale is ChainSale => Boolean(sale))
      .map((sale) => toSaleItem(sale, tokenById, listingById, txCache, royaltyBps))
      .sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );

    return {
      nfts,
      listings,
      sales,
      totals: {
        minted: nfts.length,
        activeListings: listings.filter((listing) => listing.status === "active").length,
        completedSales: sales.length,
      },
      config: {
        royaltyBps,
        musicNftContractId,
        marketplaceContractId,
        paymentTokenContractId: testnetXlmTokenContractId,
        sorobanRpcUrl,
      },
    };
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Could not load dashboard from Soroban"));
  }
}

export async function mintMusicNft(payload: MintPayload) {
  requireConfiguredValue(musicNftContractId, "Music NFT contract ID");

  const trimmedTitle = payload.title.trim();
  const trimmedGenre = payload.genre.trim();
  const trimmedMediaUrl = payload.mediaUrl.trim();
  const trimmedPerks = (payload.perks || "").trim();
  const supply = Number(payload.supply);

  if (!trimmedTitle) {
    throw new Error("Title is required");
  }

  if (!trimmedGenre) {
    throw new Error("Genre is required");
  }

  if (!trimmedMediaUrl) {
    throw new Error("Media URL is required");
  }

  if (!Number.isInteger(supply) || supply <= 0) {
    throw new Error("Supply must be a positive whole number");
  }

  const { contractCall, returnValue } = await submitContractCall({
    address: payload.creator,
    contractId: musicNftContractId,
    method: "mint",
    args: [
      nativeToScVal(payload.creator, { type: "address" }),
      nativeToScVal(trimmedTitle, { type: "string" }),
      nativeToScVal(trimmedGenre, { type: "string" }),
      nativeToScVal(trimmedMediaUrl, { type: "string" }),
      nativeToScVal(supply, { type: "u32" }),
      nativeToScVal(trimmedPerks, { type: "string" }),
    ],
  });

  const mintedTokenId = toNumber(returnValue, "mint return value");
  setTxHash("nfts", String(mintedTokenId), contractCall.txHash);

  const token = await getTokenById(mintedTokenId, payload.creator);
  if (!token) {
    throw new Error("Mint succeeded but token lookup returned empty");
  }

  const ownedBalance = await getBalanceOf(payload.creator, mintedTokenId, payload.creator);

  return {
    message: "Minted successfully",
    nft: toNftItem(token, loadTxCache(), ownedBalance),
    contractCall,
  } satisfies MintResponse;
}

export async function createListing(payload: ListingPayload) {
  requireConfiguredValue(marketplaceContractId, "Marketplace contract ID");
  requireConfiguredValue(musicNftContractId, "Music NFT contract ID");
  requireConfiguredValue(testnetXlmTokenContractId, "Payment token contract ID");

  const contractTokenId = Number(payload.nftId);
  const price = Number(payload.price);
  const quantity = Number(payload.quantity);
  const artist = (payload.artist || payload.seller).trim();

  if (!Number.isInteger(contractTokenId) || contractTokenId <= 0) {
    throw new Error("Select a valid NFT before listing");
  }

  if (!artist) {
    throw new Error("Artist wallet is required");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Listing quantity must be a positive whole number");
  }

  if (quantity > 4_294_967_295) {
    throw new Error("Listing quantity exceeds u32 range");
  }

  const { contractCall, returnValue } = await submitContractCall({
    address: payload.seller,
    contractId: marketplaceContractId,
    method: "list",
    args: [
      nativeToScVal(payload.seller, { type: "address" }),
      nativeToScVal(artist, { type: "address" }),
      nativeToScVal(musicNftContractId, { type: "address" }),
      nativeToScVal(testnetXlmTokenContractId, { type: "address" }),
      nativeToScVal(BigInt(contractTokenId), { type: "u64" }),
      nativeToScVal(xlmToStroops(price), { type: "i128" }),
      nativeToScVal(quantity, { type: "u32" }),
    ],
  });

  const contractListingId = toNumber(returnValue, "list return value");
  setTxHash("listings", String(contractListingId), contractCall.txHash);

  const listing = await getListingById(contractListingId, payload.seller);
  if (!listing) {
    throw new Error("Listing succeeded but listing lookup returned empty");
  }

  const token = await getTokenById(contractTokenId, payload.seller);
  const tokenById = new Map<number, ChainToken>();
  if (token) {
    tokenById.set(token.id, token);
  }

  return {
    message: "Listing created successfully",
    listing: toListingItem(listing, tokenById, loadTxCache()),
    contractCall,
  } satisfies ListingResponse;
}

export async function buyListing(listingId: string, buyer: string, amountToBuy = 1) {
  requireConfiguredValue(marketplaceContractId, "Marketplace contract ID");

  const contractListingId = Number(listingId);
  const quantity = Number(amountToBuy);
  if (!Number.isInteger(contractListingId) || contractListingId <= 0) {
    throw new Error("Invalid listing selected for buy");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Amount to buy must be a positive whole number");
  }

  if (quantity > 4_294_967_295) {
    throw new Error("Amount to buy exceeds u32 range");
  }

  const listing = await getListingById(contractListingId, buyer);
  if (!listing) {
    throw new Error("Listing not found on-chain");
  }

  if (!listing.active) {
    throw new Error("Listing is no longer active");
  }

  if (listing.seller === buyer) {
    throw new Error("Seller cannot buy their own listing");
  }

  if (listing.remainingQuantity > 0 && quantity > listing.remainingQuantity) {
    throw new Error("Requested amount exceeds listing quantity remaining");
  }

  const { contractCall, returnValue } = await submitContractCall({
    address: buyer,
    contractId: marketplaceContractId,
    method: "buy",
    args: [
      nativeToScVal(buyer, { type: "address" }),
      nativeToScVal(BigInt(contractListingId), { type: "u64" }),
      nativeToScVal(quantity, { type: "u32" }),
    ],
  });

  const receiptId = toNumber(returnValue, "buy return value");
  setTxHash("sales", String(receiptId), contractCall.txHash);

  const sale = await getSaleReceiptById(receiptId, buyer);
  if (!sale) {
    throw new Error("Purchase succeeded but sale receipt was not found");
  }

  const royaltyRaw = await simulateContractCall({
    sourceAddress: buyer,
    contractId: marketplaceContractId,
    method: "royalty_bps",
    args: [],
  });
  const royaltyBps = royaltyRaw === null ? 1000 : toNumber(royaltyRaw, "royalty bps");

  const token = await getTokenById(sale.tokenId, buyer);
  const tokenById = new Map<number, ChainToken>();
  if (token) {
    tokenById.set(token.id, token);
  }
  const listingById = new Map<number, ChainListing>();
  listingById.set(listing.id, listing);

  return {
    message: "Purchase completed",
    sale: toSaleItem(sale, tokenById, listingById, loadTxCache(), royaltyBps),
    contractCall,
  } satisfies BuyResponse;
}
