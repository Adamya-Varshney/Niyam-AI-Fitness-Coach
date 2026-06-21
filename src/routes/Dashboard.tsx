import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useStatePolling } from "@/lib/polling";
import { useUser } from "@/lib/user-context";
import { useCloudUserData } from "@/lib/user-data";
import { TodayCard } from "@/components/TodayCard";
import { BackendPlaceholder } from "@/components/BackendPlaceholder";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { BaselinePlan, SessionPlan } from "@/lib/types";

interface OnboardSeed {
  name?: string;
  welcome_message?: string;
  baseline_plan?: BaselinePlan;
  ts?: number;
}

const DAY_ALIASES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function dayIndex(day?: string): number | null {
  if (!day) return null;
  const k = day.trim().toLowerCase().replace(/\.$/, "");
  return DAY_ALIASES[k] ?? null;
}

export default function Dashboard() {
  const { userId } = useUser();
  const { state, firstAttemptDone, neverLoaded } = useStatePolling(userId);
  const { baselinePlan: cloudPlan, loading: cloudLoading } = useCloudUserData(userId);
  const [seed, setSeed] = useState<OnboardSeed | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("fc_onboard_seed");
      if (raw) setSeed(JSON.parse(raw) as OnboardSeed);
    } catch {
      /* ignore */
    }
  }, []);

  const sessions: SessionPlan[] = useMemo(() => {
    const cp = state?.current_plan as
      | (BaselinePlan & { plan_json?: string | BaselinePlan })
      | undefined;
    if (cp) {
      if (Array.isArray(cp.sessions) && cp.sessions.length > 0) return cp.sessions;
      const raw = cp.plan_json;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as BaselinePlan;
          if (parsed?.sessions?.length) return parsed.sessions;
        } catch { /* ignore */ }
      } else if (raw && typeof raw === "object" && Array.isArray(raw.sessions)) {
        return raw.sessions;
      }
    }
    if (cloudPlan?.sessions?.length) return cloudPlan.sessions;
    return seed?.baseline_plan?.sessions ?? [];
  }, [state, cloudPlan, seed]);

  const todaySession: SessionPlan | undefined = useMemo(() => {
    if (state?.today_session) return state.today_session;
    if (sessions.length === 0) return undefined;
    const todayIdx = new Date().getDay();
    const match = sessions.find((s) => dayIndex(s.day) === todayIdx);
    if (match) return match;
    const flagged = sessions.find((s) => s.status === "today");
    return flagged ?? sessions[0];
  }, [state, sessions]);

  const todayIdx = new Date().getDay();
  const adherence = state?.adherence_summary;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl">Your dashboard</h1>
          <Link
            to="/chat"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Chat →
          </Link>
        </header>

        {/* Today */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Today</h2>
          {todaySession ? (
            <>
              <TodayCard session={todaySession} />
              <Button asChild className="rounded-2xl w-fit">
                <Link to="/chat">
                  Start <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </>
          ) : firstAttemptDone && neverLoaded ? (
            <BackendPlaceholder
              title="Your week"
              message="Complete onboarding to see today's session here."
            />
          ) : (
            <div className="h-24 rounded-2xl bg-secondary/40" />
          )}
        </section>

        {/* This week */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">This week</h2>
          {sessions.length > 0 ? (
            <ul className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
              {sessions.map((s, i) => {
                const focus = s.focus ?? s.type ?? "Session";
                const isToday = dayIndex(s.day) === todayIdx;
                const status = s.status ?? (isToday ? "today" : "pending");
                return (
                  <li
                    key={i}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${
                      isToday ? "bg-accent-warm/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground w-10 shrink-0">{s.day}</span>
                      <span className="truncate">{focus}</span>
                      <span className="text-muted-foreground shrink-0">· {s.duration_min} min</span>
                    </div>
                    <span
                      className={`text-xs shrink-0 ml-3 ${
                        status === "completed"
                          ? "text-accent-cool"
                          : status === "today"
                            ? "text-accent-warm"
                            : "text-muted-foreground"
                      }`}
                    >
                      {status}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : firstAttemptDone && neverLoaded ? (
            <p className="text-sm text-muted-foreground">
              Your weekly plan will appear here once onboarding completes.
            </p>
          ) : (
            <div className="h-32 rounded-2xl bg-secondary/40" />
          )}
        </section>

        {/* How it's going — omitted entirely if state unavailable */}
        {adherence && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">How it's going</h2>
            <p className="text-sm">
              <span className="text-foreground">{adherence.last_7d}</span>{" "}
              <span className="text-muted-foreground">sessions this week ·</span>{" "}
              <span className="text-foreground">{adherence.streak_weeks}-week</span>{" "}
              <span className="text-muted-foreground">streak</span>
            </p>
          </section>
        )}

        <div className="pt-4 border-t border-border/60">
          <Link
            to="/chat"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Talk it over →
          </Link>
        </div>
      </div>
    </main>
  );
}
