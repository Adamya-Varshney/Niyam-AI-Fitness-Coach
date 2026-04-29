import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface UserContextValue {
  userId: string | null;
  setUserId: (id: string | null) => void;
}

const STORAGE_KEY = "fc_user_id";
const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (userId) window.localStorage.setItem(STORAGE_KEY, userId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, setUserId: setUserIdState }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
