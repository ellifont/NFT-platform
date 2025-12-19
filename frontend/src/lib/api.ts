import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  User,
  NFT,
  NFTListResponse,
  Listing,
  ListingListResponse,
  MintRequest,
  MintRequestListResponse,
  NonceResponse,
  LoginResponse,
  UploadResponse,
  MintResponse,
  NFTAttribute,
  TokenStandard,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Load token from localStorage on init (client-side only)
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // ==================== Auth ====================

  async getNonce(walletAddress: string): Promise<NonceResponse> {
    const response = await this.client.post<NonceResponse>("/auth/nonce", {
      wallet_address: walletAddress,
    });
    return response.data;
  }

  async login(walletAddress: string, signature: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>("/auth/login", {
      wallet_address: walletAddress,
      signature: signature,
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>("/auth/me");
    return response.data;
  }

  async updateMe(data: {
    username?: string;
    bio?: string;
    profile_image_url?: string;
  }): Promise<User> {
    const params = new URLSearchParams();
    if (data.username) params.append("username", data.username);
    if (data.bio) params.append("bio", data.bio);
    if (data.profile_image_url) params.append("profile_image_url", data.profile_image_url);

    const response = await this.client.put<User>(`/auth/me?${params.toString()}`);
    return response.data;
  }

  logout() {
    this.setToken(null);
  }

  // ==================== NFTs ====================

  async listNFTs(params?: {
    page?: number;
    page_size?: number;
    owner?: string;
    creator?: string;
    token_standard?: TokenStandard;
  }): Promise<NFTListResponse> {
    const response = await this.client.get<NFTListResponse>("/nft", { params });
    return response.data;
  }

  async getNFT(id: number): Promise<NFT> {
    const response = await this.client.get<NFT>(`/nft/${id}`);
    return response.data;
  }

  async getNFTByToken(contractAddress: string, tokenId: number): Promise<NFT> {
    const response = await this.client.get<NFT>(`/nft/token/${contractAddress}/${tokenId}`);
    return response.data;
  }

  async getUserNFTs(
    walletAddress: string,
    params?: {
      owned?: boolean;
      created?: boolean;
      page?: number;
      page_size?: number;
    }
  ): Promise<NFTListResponse> {
    const response = await this.client.get<NFTListResponse>(`/nft/user/${walletAddress}`, {
      params,
    });
    return response.data;
  }

  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<UploadResponse>("/nft/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async mintNFT(data: {
    name: string;
    description?: string;
    image_url: string;
    token_standard?: TokenStandard;
    edition_size?: number;
    royalty_percentage?: number;
    attributes?: NFTAttribute[];
  }): Promise<MintResponse> {
    const response = await this.client.post<MintResponse>("/nft/mint", data);
    return response.data;
  }

  async syncNFT(contractAddress: string, tokenId: number): Promise<NFT> {
    const response = await this.client.post<NFT>(`/nft/sync/${contractAddress}/${tokenId}`);
    return response.data;
  }

  // ==================== Marketplace ====================

  async listListings(params?: {
    page?: number;
    page_size?: number;
    status_filter?: string;
    seller?: string;
    token_standard?: TokenStandard;
    min_price?: string;
    max_price?: string;
  }): Promise<ListingListResponse> {
    const response = await this.client.get<ListingListResponse>("/marketplace", { params });
    return response.data;
  }

  async getListing(id: number): Promise<Listing> {
    const response = await this.client.get<Listing>(`/marketplace/${id}`);
    return response.data;
  }

  async createListing(data: {
    nft_id: number;
    price_eth: string;
    amount?: number;
  }): Promise<Listing> {
    const response = await this.client.post<Listing>("/marketplace/list", data);
    return response.data;
  }

  async buyListing(listingId: number): Promise<{ listing_id: number; status: string; message: string }> {
    const response = await this.client.post("/marketplace/buy", { listing_id: listingId });
    return response.data;
  }

  async cancelListing(listingId: number): Promise<Listing> {
    const response = await this.client.post<Listing>(`/marketplace/cancel/${listingId}`);
    return response.data;
  }

  // ==================== Mint Requests ====================

  async createMintRequest(data: {
    title: string;
    description?: string;
    artwork_url: string;
    token_standard?: TokenStandard;
    edition_size?: number;
    royalty_percentage?: number;
    attributes?: NFTAttribute[];
  }): Promise<MintRequest> {
    const response = await this.client.post<MintRequest>("/mint-request", data);
    return response.data;
  }

  async listMyMintRequests(params?: {
    page?: number;
    page_size?: number;
    status_filter?: string;
  }): Promise<MintRequestListResponse> {
    const response = await this.client.get<MintRequestListResponse>("/mint-request", { params });
    return response.data;
  }

  async getMintRequest(id: number): Promise<MintRequest> {
    const response = await this.client.get<MintRequest>(`/mint-request/${id}`);
    return response.data;
  }

  async updateMintRequest(
    id: number,
    data: {
      title?: string;
      description?: string;
      artwork_url?: string;
      edition_size?: number;
      royalty_percentage?: number;
    }
  ): Promise<MintRequest> {
    const response = await this.client.put<MintRequest>(`/mint-request/${id}`, data);
    return response.data;
  }

  async deleteMintRequest(id: number): Promise<void> {
    await this.client.delete(`/mint-request/${id}`);
  }
}

// Export singleton instance
export const api = new APIClient();

// Export error helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail: string }>;
    return axiosError.response?.data?.detail || axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
