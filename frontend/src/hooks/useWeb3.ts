"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

interface UseWeb3Return {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  error: string | null;
}

// Hardhat local network chain ID
const REQUIRED_CHAIN_ID = 31337;

export function useWeb3(): UseWeb3Return {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;

  // Initialize provider
  const initProvider = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    const browserProvider = new BrowserProvider(window.ethereum);
    setProvider(browserProvider);
    return browserProvider;
  }, []);

  // Connect wallet
  const connect = useCallback(async (): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const browserProvider = await initProvider();
      if (!browserProvider) {
        throw new Error("Failed to initialize provider");
      }

      // Request accounts
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const userAddress = accounts[0];
      setAddress(userAddress);

      // Get signer
      const userSigner = await browserProvider.getSigner();
      setSigner(userSigner);

      // Get chain ID
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));

      return userAddress;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [initProvider]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  }, []);

  // Sign message
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!signer) {
        throw new Error("Wallet not connected");
      }
      return await signer.signMessage(message);
    },
    [signer]
  );

  // Switch network
  const switchNetwork = useCallback(async (targetChainId: number): Promise<boolean> => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      return true;
    } catch (err) {
      // Chain not added, try to add it
      if ((err as { code: number }).code === 4902) {
        if (targetChainId === 31337) {
          // Add Hardhat local network
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x7A69",
                chainName: "Hardhat Local",
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["http://127.0.0.1:8545"],
              },
            ],
          });
          return true;
        }
      }
      return false;
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountsList = accounts as string[];
      if (accountsList.length === 0) {
        disconnect();
      } else if (accountsList[0] !== address) {
        setAddress(accountsList[0]);
        initProvider().then(async (p) => {
          if (p) {
            const s = await p.getSigner();
            setSigner(s);
          }
        });
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const newChainId = parseInt(chainIdHex as string, 16);
      setChainId(newChainId);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [address, disconnect, initProvider]);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (accounts && accounts.length > 0) {
          const browserProvider = await initProvider();
          if (browserProvider) {
            setAddress(accounts[0]);
            const s = await browserProvider.getSigner();
            setSigner(s);
            const network = await browserProvider.getNetwork();
            setChainId(Number(network.chainId));
          }
        }
      } catch (err) {
        console.error("Failed to check connection:", err);
      }
    };

    checkConnection();
  }, [initProvider]);

  return {
    address,
    chainId,
    isConnected,
    isConnecting,
    provider,
    signer,
    connect,
    disconnect,
    signMessage,
    switchNetwork,
    error,
  };
}
