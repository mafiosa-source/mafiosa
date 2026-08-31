// Logged-in application user (name, role, module permissions).
// Additive layer: finance logic and data are untouched.
import { createContext, useContext, type ReactNode } from "react";
import type { AppUser, ModuleKey } from "@/lib/permissions";
import { canAccess } from "@/lib/permissions";

type Ctx = {
  user: AppUser | null;
  isAdmin: boolean;
  can: (module: ModuleKey | "admin" | null) => boolean;
  refresh: () => void;
};

const AppUserContext = createContext<Ctx>({
  user: null,
  isAdmin: false,
  can: () => false,
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
    refresh,
  };
  return <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>;
}

export function useAppUser() {
  return useContext(AppUserContext);
}
