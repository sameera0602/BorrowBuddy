import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "../types";
import { api } from "../services/api";

export type NavTab =
  | "home"
  | "borrow"
  | "share"
  | "borrowings"
  | "lending"
  | "help"
  | "my-help"
  | "chats"
  | "profile"
  | "admin";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  currentTab: NavTab;
  activeChatId: number | null;
  setUser: (user: User | null) => void;
  setCurrentTab: (tab: NavTab) => void;
  openChat: (conversationId: number) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<NavTab>("home");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  // Check existing session on mount / page refresh
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        if (res.user.role === "admin") {
          setCurrentTab("admin");
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn("Could not refresh user session", err);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setUser(null);
      setCurrentTab("home");
      setActiveChatId(null);
    }
  }

  function openChat(conversationId: number) {
    setActiveChatId(conversationId);
    setCurrentTab("chats");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        currentTab,
        activeChatId,
        setUser,
        setCurrentTab,
        openChat,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
