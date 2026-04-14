export interface ContractCall {
  action: string;
  contractId: string;
  network: string;
  rpcUrl: string;
  txHash: string;
  timestamp: string;
}

export interface NftItem {
  id: string;
  tokenId: string;
  contractTokenId: number;
  title: string;
  genre: string;
  mediaUrl: string;
  supply: number;
  creator: string;
  ownedBalance: number;
  perks?: string;
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingItem {
  id: string;
  contractListingId: number;
  nftId: string;
  nftTitle: string;
  seller: string;
  artist: string;
  nftContractId: string;
  paymentTokenContractId: string;
  price: number;
  quantity: number;
  remainingQuantity: number;
  status: "active" | "sold";
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  listingId: string;
  nftId: string;
  nftTitle: string;
  buyer: string;
  seller: string;
  artist: string;
  amountBought: number;
  salePrice: number;
  royaltyBps: number;
  royaltyAmount: number;
  sellerAmount: number;
  txHash: string;
  createdAt: string;
}

export interface DashboardResponse {
  nfts: NftItem[];
  listings: ListingItem[];
  sales: SaleItem[];
  totals: {
    minted: number;
    activeListings: number;
    completedSales: number;
  };
  config: {
    royaltyBps: number;
    musicNftContractId: string;
    marketplaceContractId: string;
    paymentTokenContractId: string;
    sorobanRpcUrl: string;
  };
}

export interface MintPayload {
  creator: string;
  title: string;
  genre: string;
  mediaUrl: string;
  supply: number;
  perks?: string;
}

export interface ListingPayload {
  seller: string;
  artist?: string;
  nftId: string;
  price: number;
  quantity: number;
}
