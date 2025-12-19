"use client";

import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/types";
import { formatAddress, formatEth, formatRelativeTime, getIPFSUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className }: ListingCardProps) {
  const imageUrl = listing.nft ? getIPFSUrl(listing.nft.image_url || "") : "";

  return (
    <Link href={`/nft/${listing.nft_id}`}>
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
              alt={listing.nft?.name || "NFT"}
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

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                listing.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                  : listing.status === "sold"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
              )}
            >
              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
            </span>
          </div>

          {/* Token Standard Badge */}
          {listing.nft && (
            <div className="absolute top-2 right-2">
              <span
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  listing.nft.token_standard === "ERC721"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                )}
              >
                {listing.nft.token_standard}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {listing.nft?.name || `NFT #${listing.nft_id}`}
          </h3>

          {/* Seller */}
          {listing.seller && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              by{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {listing.seller.username || formatAddress(listing.seller.wallet_address)}
              </span>
            </p>
          )}

          {/* Price and Time */}
          <div className="mt-3 pt-3 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Price</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" viewBox="0 0 320 512" fill="currentColor">
                    <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" />
                  </svg>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatEth(listing.price_eth)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Listed</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {formatRelativeTime(listing.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Grid component for displaying multiple listing cards
interface ListingGridProps {
  listings: Listing[];
  loading?: boolean;
  emptyMessage?: string;
}

export function ListingGrid({ listings, loading, emptyMessage = "No listings found" }: ListingGridProps) {
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

  if (listings.length === 0) {
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="mt-4 text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
