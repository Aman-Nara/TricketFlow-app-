import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY, User } from "@/src/api/client";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: "user" | "organizer") => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (!token) { setUser(null); return; }
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch {
      await storage.secureRemove(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/login", { email, password });
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const signup = async (email: string, password: string, name: string, role: "user" | "organizer") => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/signup", { email, password, name, role });
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
