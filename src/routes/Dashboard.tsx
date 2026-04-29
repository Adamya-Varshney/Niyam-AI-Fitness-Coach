import { Link } from "react-router-dom";
import { useStatePolling } from "@/lib/polling";
import { useUser } from "@/lib/user-context";
import { TodayCard } from "@/components/TodayCard";
import { BackendPlaceholder } from "@/components/BackendPlaceholder";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { userId } = useUser();
  const { state, firstAttemptDone, neverLoaded } = useStatePolling(userId);

  const todaySession = state?.today_session;
  const sessions = state?.current_plan?.sessions ?? [];
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
              message="Live updates coming soon — your onboarding plan is saved and will appear here when the system is fully online."
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
                const status = s.status ?? "pending";
                return (
                  <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
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
              Your weekly view will populate as the system goes live.
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
