import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, LayoutDashboard, User, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";

const TABS = [
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/dashboard", label: "Plan", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userId, signOut } = useUser();
  // Hide nav during onboarding / setup / auth flows
  if (
    pathname.startsWith("/onboard") ||
    pathname.startsWith("/profile/setup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 h-12">
        <NavLink to="/chat" className="flex items-center gap-1.5 font-display text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>FitCoach</span>
        </NavLink>
        <ul className="flex items-center gap-1">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
          {userId && (
            <li>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
