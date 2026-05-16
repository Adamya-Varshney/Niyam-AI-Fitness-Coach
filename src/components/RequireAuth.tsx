import { Navigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { userId, loading } = useUser();
  if (loading) return null;
  if (!userId) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
