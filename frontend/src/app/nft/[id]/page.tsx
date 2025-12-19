"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/hooks/useAuth";
import { formatAddress, formatEth, formatDate, getIPFSUrl, cn } from "@/lib/utils";
import type { NFT, Listing } from "@/types";

export default function NFTDetailPage() {
  const params = useParams();
  const nftId = parseInt(params.id as string);
  const { address, isConnected } = useWeb3();
  const { user, isAuthenticated } = useAuth();

  const [nft, setNft] = useState<NFT | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // List modal state
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState("");

  const isOwner = nft?.owner?.wallet_address.toLowerCase() === address?.toLowerCase();
  const isCreator = nft?.creator?.wallet_address.toLowerCase() === address?.toLowerCase();
  const hasActiveListing = listing && listing.status === "active";

  useEffect(() => {
    async function fetchNFT() {
      try {
        const nftData = await api.getNFT(nftId);
        setNft(nftData);

        // Check for active listing
        const listings = await api.listListings({ page_size: 100 });
        const activeListing = listings.items.find(
          (l) => l.nft_id === nftId && l.status === "active"
        );
        if (activeListing) {
          setListing(activeListing);
        }
      } catch (err) {
        console.error("Failed to fetch NFT:", err);
        toast.error("Failed to load NFT");
      } finally {
        setLoading(false);
      }
    }

    fetchNFT();
  }, [nftId]);

  const handleList = async () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setActionLoading(true);
    try {
      const newListing = await api.createListing({
        nft_id: nftId,
        price_eth: listPrice,
      });
      setListing(newListing);
      setShowListModal(false);
      setListPrice("");
      toast.success("NFT listed successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelListing = async () => {
    if (!listing) return;

    setActionLoading(true);
    try {
      await api.cancelListing(listing.id);
      setListing(null);
      toast.success("Listing cancelled");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!listing) return;

    setActionLoading(true);
    try {
      const result = await api.buyListing(listing.id);
      toast.success(result.message);
      // Refresh NFT data
      const nftData = await api.getNFT(nftId);
      setNft(nftData);
      setListing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NFT not found</h1>
        <Link href="/explore" className="text-primary-600 mt-4 inline-block">
          Back to Explore
        </Link>
      </div>
    );
  }

  const imageUrl = getIPFSUrl(nft.image_url || "");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={nft.name || "NFT"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-24 h-24 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {/* Token Standard Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-full",
                nft.token_standard === "ERC721"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
              )}
            >
              {nft.token_standard}
            </span>
            {nft.token_standard === "ERC1155" && nft.edition_size > 1 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Edition {nft.edition_number || "?"} of {nft.edition_size}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {nft.name || `NFT #${nft.id}`}
          </h1>

          {/* Creator & Owner */}
          <div className="mt-4 flex flex-wrap gap-6">
            {nft.creator && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Creator</p>
                <Link
                  href={`/profile/${nft.creator.wallet_address}`}
                  className="text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {nft.creator.username || formatAddress(nft.creator.wallet_address)}
                </Link>
              </div>
            )}
            {nft.owner && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Owner</p>
                <Link
                  href={`/profile/${nft.owner.wallet_address}`}
                  className="text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {nft.owner.username || formatAddress(nft.owner.wallet_address)}
                </Link>
              </div>
            )}
          </div>

          {/* Description */}
          {nft.description && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Description</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {nft.description}
              </p>
            </div>
          )}

          {/* Listing / Price */}
          <div className="mt-6 p-4 border rounded-xl dark:border-gray-700">
            {hasActiveListing ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatEth(listing.price_eth)} ETH
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-3">
                  {isOwner ? (
                    <button
                      onClick={handleCancelListing}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? "Processing..." : "Cancel Listing"}
                    </button>
                  ) : isAuthenticated ? (
                    <button
                      onClick={handleBuy}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? "Processing..." : "Buy Now"}
                    </button>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Connect wallet to purchase
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 dark:text-gray-400">This NFT is not listed for sale</p>
                {isOwner && (
                  <button
                    onClick={() => setShowListModal(true)}
                    className="mt-3 w-full px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                  >
                    List for Sale
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h2>
            <dl className="mt-2 space-y-2 text-sm">
              {nft.contract_address && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Contract</dt>
                  <dd className="text-gray-900 dark:text-white font-mono">
                    {formatAddress(nft.contract_address, 6)}
                  </dd>
                </div>
              )}
              {nft.token_id !== null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Token ID</dt>
                  <dd className="text-gray-900 dark:text-white">{nft.token_id}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Royalty</dt>
                <dd className="text-gray-900 dark:text-white">{nft.royalty_percentage}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(nft.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* List Modal */}
      {showListModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowListModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">List NFT for Sale</h2>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowListModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium border dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleList}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {actionLoading ? "Listing..." : "List NFT"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
