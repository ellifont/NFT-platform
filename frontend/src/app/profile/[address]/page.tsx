"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { NFTGrid } from "@/components/NFTCard";
import { useWeb3 } from "@/hooks/useWeb3";
import { formatAddress, cn } from "@/lib/utils";
import type { NFT, User } from "@/types";

type Tab = "owned" | "created";

export default function ProfilePage() {
  const params = useParams();
  const walletAddress = params.address as string;
  const { address: currentAddress } = useWeb3();

  const [user, setUser] = useState<User | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [createdNFTs, setCreatedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("owned");

  const isOwnProfile = currentAddress?.toLowerCase() === walletAddress?.toLowerCase();

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        // Fetch owned NFTs
        const ownedRes = await api.getUserNFTs(walletAddress, { owned: true, created: false });
        setOwnedNFTs(ownedRes.items);

        // Fetch created NFTs
        const createdRes = await api.getUserNFTs(walletAddress, { owned: false, created: true });
        setCreatedNFTs(createdRes.items);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }

    if (walletAddress) {
      fetchProfile();
    }
  }, [walletAddress]);

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 h-48" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 flex flex-col sm:flex-row sm:items-end sm:space-x-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-900 flex items-center justify-center overflow-hidden">
            <span className="text-4xl font-bold text-gray-400">
              {walletAddress?.slice(2, 4).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="mt-4 sm:mt-0 sm:pb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.username || formatAddress(walletAddress || "", 6)}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
              {walletAddress}
            </p>
            {user?.bio && (
              <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-xl">{user.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 sm:mt-0 sm:ml-auto sm:pb-4 flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{ownedNFTs.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Owned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {createdNFTs.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b dark:border-gray-700">
          <nav className="flex gap-8">
            {(["owned", "created"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-4 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-primary-600 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                {tab === "owned" ? `Owned (${ownedNFTs.length})` : `Created (${createdNFTs.length})`}
              </button>
            ))}
          </nav>
        </div>

        {/* NFT Grid */}
        <div className="py-8">
          {activeTab === "owned" ? (
            <NFTGrid
              nfts={ownedNFTs}
              loading={loading}
              emptyMessage="No NFTs owned yet"
            />
          ) : (
            <NFTGrid
              nfts={createdNFTs}
              loading={loading}
              emptyMessage="No NFTs created yet"
            />
          )}
        </div>
      </div>
    </div>
  );
}
