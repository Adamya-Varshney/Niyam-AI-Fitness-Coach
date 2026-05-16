import { Navigate } from "react-router-dom";
import { useUser } from "@/lib/user-context";
import { useOnboardingStatus } from "@/lib/use-onboarding-status";
import type { ReactNode } from "react";

export function RequireAuth({
  children,
  requireOnboarded = false,
}: {
  children: ReactNode;
  requireOnboarded?: boolean;
}) {
  const { userId, loading } = useUser();
  const onboarding = useOnboardingStatus();

  if (loading) return null;
  if (!userId) return <Navigate to="/auth" replace />;
  if (requireOnboarded) {
    if (onboarding === "loading") return null;
    if (onboarding === "pending") return <Navigate to="/onboard" replace />;
  }
  return <>{children}</>;
}
