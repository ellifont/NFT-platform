"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (walletAddress: string, signMessage: (msg: string) => Promise<string>) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (walletAddress: string, signMessage: (msg: string) => Promise<string>) => {
        set({ isLoading: true, error: null });

        try {
          // Step 1: Get nonce
          const nonceResponse = await api.getNonce(walletAddress);

          // Step 2: Sign the message
          const signature = await signMessage(nonceResponse.message);

          // Step 3: Login with signature
          const loginResponse = await api.login(walletAddress, signature);

          set({
            user: loginResponse.user,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        api.logout();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchUser: async () => {
        if (!api.getToken()) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });

        try {
          const user = await api.getMe();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token invalid, clear auth state
          api.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        // Only persist user data, not loading/error states
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook for components
export function useAuth() {
  const store = useAuthStore();
  return store;
}
