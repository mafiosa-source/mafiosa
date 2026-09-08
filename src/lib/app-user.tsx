// Logged-in application user (name, role, module permissions, agent scope).
// Additive layer: finance logic and data are untouched.
import { createContext, useContext, type ReactNode } from "react";
import type { AppUser, ModuleKey } from "@/lib/permissions";
import { canAccess, canUseAgent } from "@/lib/permissions";

type Ctx = {
  user: AppUser | null;
  isAdmin: boolean;
  can: (module: ModuleKey | "admin" | null) => boolean;
  /** Agent ids this user is limited to; empty means all agents. */
  agentScope: string[];
  canUseAgent: (agentId?: string | null) => boolean;
  refresh: () => void;
};

const AppUserContext = createContext<Ctx>({
  user: null,
  isAdmin: false,
  can: () => false,
  agentScope: [],
  canUseAgent: () => false,
  refresh: () => {},
});

export function AppUserProvider({
  user,
  refresh,
  children,
}: {
  user: AppUser | null;
  refresh: () => void;
  children: ReactNode;
}) {
  const value: Ctx = {
    user,
    isAdmin: user?.role === "admin",
    can: (module) => canAccess(user, module),
    agentScope: user?.agentScope ?? [],
    canUseAgent: (agentId) => canUseAgent(user, agentId),
    refresh,
  };
  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>;
}

export function useAppUser() {
  return useContext(AppUserContext);
}
