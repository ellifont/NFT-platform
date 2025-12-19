"use client";

import Link from "next/link";
import Image from "next/image";
import type { NFT, Listing } from "@/types";
import { formatAddress, formatEth, getIPFSUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NFTCardProps {
  nft: NFT;
  listing?: Listing;
  showPrice?: boolean;
  className?: string;
}

export function NFTCard({ nft, listing, showPrice = true, className }: NFTCardProps) {
  const imageUrl = getIPFSUrl(nft.image_url || "");
  const hasListing = listing && listing.status === "active";

  return (
    <Link href={`/nft/${nft.id}`}>
      <div
        className={cn(
          "group rounded-xl border bg-white overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
          "dark:bg-gray-800 dark:border-gray-700",
          className
        )}
      >
        {/* Image */}
        <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={nft.name || "NFT"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-300 dark:text-gray-600"
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
          {/* Token Standard Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                nft.token_standard === "ERC721"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
              )}
            >
              {nft.token_standard}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {nft.name || `NFT #${nft.id}`}
          </h3>

          {/* Creator */}
          {nft.creator && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              by{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {nft.creator.username || formatAddress(nft.creator.wallet_address)}
              </span>
            </p>
          )}

          {/* Price */}
          {showPrice && (
            <div className="mt-3 pt-3 border-t dark:border-gray-700">
              {hasListing ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Price</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                    <span className="font-semibold">{formatEth(listing.price_eth)} ETH</span>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">Not listed</span>
              )}
            </div>
          )}

          {/* Edition info for ERC-1155 */}
          {nft.token_standard === "ERC1155" && nft.edition_size > 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Edition {nft.edition_number || "?"} of {nft.edition_size}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// Grid component for displaying multiple NFT cards
interface NFTGridProps {
  nfts: NFT[];
  listings?: Map<number, Listing>;
  loading?: boolean;
  emptyMessage?: string;
}

export function NFTGrid({ nfts, listings, loading, emptyMessage = "No NFTs found" }: NFTGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600"
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
        <p className="mt-4 text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {nfts.map((nft) => (
        <NFTCard key={nft.id} nft={nft} listing={listings?.get(nft.id)} />
      ))}
    </div>
  );
}
