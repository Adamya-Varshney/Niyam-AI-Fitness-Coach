import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { path: string; label: string }[] = [
  { path: "/chat", label: "Chat" },
  { path: "/dashboard", label: "Plan" },
  { path: "/profile", label: "Profile" },
];

const HIDDEN_ON_PATHS = ["/onboard", "/profile/setup"];

const HIDDEN_PREFIXES = ["/auth", "/reset-password"];

export function SectionPager() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (
    pathname === "/" ||
    HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) ||
    HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return null;
  }

  // Match the most specific section (so /profile/setup beats /profile)
  const idx = [...SECTIONS]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.path.length - a.s.path.length)
    .find(({ s }) => pathname === s.path || pathname.startsWith(s.path + "/"))?.i;

  if (idx === undefined) return null;

  const prev = SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length];
  const next = SECTIONS[(idx + 1) % SECTIONS.length];

  const btn =
    "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/85 backdrop-blur px-2.5 py-2 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground hover:bg-secondary transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(prev.path)}
        aria-label={`Previous section: ${prev.label}`}
        className={cn(btn, "left-3 sm:left-4")}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{prev.label}</span>
      </button>
      <button
        type="button"
        onClick={() => navigate(next.path)}
        aria-label={`Next section: ${next.label}`}
        className={cn(btn, "right-3 sm:right-4")}
      >
        <span className="hidden sm:inline">{next.label}</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
}
