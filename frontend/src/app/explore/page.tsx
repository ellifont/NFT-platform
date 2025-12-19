"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ListingGrid } from "@/components/ListingCard";
import type { Listing, TokenStandard } from "@/types";
import { cn } from "@/lib/utils";

export default function ExplorePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tokenStandard, setTokenStandard] = useState<TokenStandard | "all">("all");

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const params: { page: number; page_size: number; token_standard?: TokenStandard } = {
          page,
          page_size: 12,
        };
        if (tokenStandard !== "all") {
          params.token_standard = tokenStandard;
        }

        const response = await api.listListings(params);
        setListings(response.items);
        setTotalPages(response.pages);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [page, tokenStandard]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explore NFTs</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Discover unique digital artwork from talented creators
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Token Standard Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
          <div className="flex rounded-lg border dark:border-gray-700 overflow-hidden">
            {(["all", "ERC721", "ERC1155"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTokenStandard(type);
                  setPage(1);
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  tokenStandard === type
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <ListingGrid
        listings={listings}
        loading={loading}
        emptyMessage="No NFTs found matching your criteria"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              page === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                    page === pageNum
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              page === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
