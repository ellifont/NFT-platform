// User types
export interface User {
  id: number;
  wallet_address: string;
  username: string | null;
  bio: string | null;
  profile_image_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface UserBrief {
  id: number;
  wallet_address: string;
  username: string | null;
}

// NFT types
export type TokenStandard = "ERC721" | "ERC1155";

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface NFT {
  id: number;
  token_id: number | null;
  contract_address: string | null;
  token_standard: TokenStandard;
  name: string | null;
  description: string | null;
  image_url: string | null;
  metadata_uri: string | null;
  edition_number: number | null;
  edition_size: number;
  royalty_percentage: string;
  is_burned: boolean;
  created_at: string;
  owner: UserBrief | null;
  creator: UserBrief | null;
}

export interface NFTBrief {
  id: number;
  name: string | null;
  image_url: string | null;
  token_standard: TokenStandard;
}

export interface NFTListResponse {
  items: NFT[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// Listing types
export type ListingStatus = "active" | "sold" | "cancelled";

export interface Listing {
  id: number;
  listing_id: number | null;
  nft_id: number;
  price_eth: string;
  price_usd: string | null;
  amount: number;
  status: ListingStatus;
  list_tx_hash: string | null;
  sale_tx_hash: string | null;
  platform_fee_eth: string | null;
  royalty_fee_eth: string | null;
  seller_proceeds_eth: string | null;
  created_at: string;
  sold_at: string | null;
  cancelled_at: string | null;
  nft: NFTBrief | null;
  seller: UserBrief | null;
  buyer: UserBrief | null;
}

export interface ListingListResponse {
  items: Listing[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// Mint Request types
export type MintRequestStatus = "pending" | "approved" | "rejected" | "minted";

export interface MintRequest {
  id: number;
  title: string;
  description: string | null;
  artwork_url: string;
  token_standard: TokenStandard;
  edition_size: number;
  royalty_percentage: string;
  image_ipfs_uri: string | null;
  metadata_ipfs_uri: string | null;
  status: MintRequestStatus;
  admin_notes: string | null;
  mint_tx_hash: string | null;
  created_at: string;
  reviewed_at: string | null;
  minted_at: string | null;
  artist: UserBrief | null;
  reviewer: UserBrief | null;
  nft: NFTBrief | null;
}

export interface MintRequestListResponse {
  items: MintRequest[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// Auth types
export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// API Response types
export interface APIError {
  detail: string;
}

export interface UploadResponse {
  ipfs_url: string;
  gateway_url: string;
  ipfs_hash: string;
}

export interface MintResponse {
  metadata_uri: string;
  metadata_gateway_url: string;
  message: string;
  token_standard: string;
  edition_size: number;
}
