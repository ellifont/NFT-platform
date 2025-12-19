"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ListingGrid } from "@/components/ListingCard";
import type { Listing, NFT } from "@/types";

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [recentNFTs, setRecentNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingsRes, nftsRes] = await Promise.all([
          api.listListings({ page_size: 8 }),
          api.listNFTs({ page_size: 4 }),
        ]);
        setListings(listingsRes.items);
        setRecentNFTs(nftsRes.items);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-purple-600/20 dark:from-primary-900/40 dark:to-purple-900/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Discover, Collect, and Sell
              <span className="block text-primary-600 dark:text-primary-400">
                Extraordinary NFTs
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The leading marketplace for NFT artwork. Create, buy, and sell unique digital art pieces
              with full ownership on the blockchain.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/explore"
                className="px-8 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Explore NFTs
              </Link>
              <Link
                href="/create"
                className="px-8 py-3 rounded-lg font-medium border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Create NFT
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Artworks", value: "10K+" },
              { label: "Artists", value: "500+" },
              { label: "Sales", value: "5K+" },
              { label: "Volume", value: "1.2K ETH" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Featured Listings
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Discover the latest NFTs available for purchase
            </p>
          </div>
          <Link
            href="/explore"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
          >
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <ListingGrid
          listings={listings}
          loading={loading}
          emptyMessage="No listings yet. Be the first to list an NFT!"
        />
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 dark:bg-gray-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                ),
                title: "Connect Wallet",
                description:
                  "Connect your MetaMask wallet to get started. No signup required - just authenticate with your wallet.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                ),
                title: "Create or Collect",
                description:
                  "Upload your artwork to mint new NFTs, or browse the marketplace to discover and collect unique pieces.",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                title: "Trade & Earn",
                description:
                  "List your NFTs for sale, earn royalties on secondary sales, and build your collection.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700"
              >
                <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="mt-4 text-primary-600 dark:text-primary-400">{step.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-purple-600 p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Start Creating?</h2>
          <p className="mt-4 text-primary-100 max-w-xl mx-auto">
            Join our community of artists and collectors. Mint your first NFT today and share your
            art with the world.
          </p>
          <Link
            href="/create"
            className="mt-8 inline-block px-8 py-3 rounded-lg font-medium bg-white text-primary-600 hover:bg-gray-100 transition-colors"
          >
            Start Creating
          </Link>
        </div>
      </section>
    </div>
  );
}
