"use client";

import { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/hooks/useAuth";
import { formatAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, signMessage } = useWeb3();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleConnect = async () => {
    const connectedAddress = await connect();
    if (connectedAddress) {
      // Auto-login after connecting
      await login(connectedAddress, signMessage);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
    setShowDropdown(false);
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={cn(
          "px-4 py-2 rounded-lg font-medium transition-colors",
          "bg-primary-600 text-white hover:bg-primary-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
          "dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        )}
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>{user?.username || formatAddress(address || "")}</span>
        <svg
          className={cn("w-4 h-4 transition-transform", showDropdown && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border z-20 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-3 border-b dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Connected as</p>
              <p className="text-sm font-mono truncate">{formatAddress(address || "", 6)}</p>
            </div>
            <div className="p-2">
              <a
                href={`/profile/${address}`}
                className="block px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowDropdown(false)}
              >
                My Profile
              </a>
              <a
                href="/create"
                className="block px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowDropdown(false)}
              >
                Create NFT
              </a>
              {user?.is_admin && (
                <a
                  href="/admin"
                  className="block px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowDropdown(false)}
                >
                  Admin Panel
                </a>
              )}
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 text-sm rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
