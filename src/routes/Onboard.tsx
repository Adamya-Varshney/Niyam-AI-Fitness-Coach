import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { ApiError, newId, postOnboard } from "@/lib/api";
import type { Goal, CurrentActivity, OnboardResponse } from "@/lib/types";
import { useUser } from "@/lib/user-context";
import { ChevronDown, ChevronUp } from "lucide-react";

type Step = "name" | "goal" | "activity" | "time" | "submitting" | "result" | "error";

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "build_strength", label: "Build strength" },
  { value: "get_lean", label: "Get lean" },
  { value: "feel_better", label: "Feel better" },
  { value: "move_more", label: "Move more" },
];

const ACTIVITY_OPTIONS: { value: CurrentActivity; label: string }[] = [
  { value: "rarely", label: "Rarely" },
  { value: "weekend_only", label: "Weekend only" },
  { value: "few_times_week", label: "A few times a week" },
  { value: "most_days", label: "Most days" },
];

export default function Onboard() {
  const navigate = useNavigate();
  const { setUserId } = useUser();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState<string>("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activity, setActivity] = useState<CurrentActivity | null>(null);
  const [time, setTime] = useState<number>(180);
  const [result, setResult] = useState<OnboardResponse | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const submit = async (timeMin: number, goalVal: Goal, activityVal: CurrentActivity) => {
    const userId = pendingUserId ?? newId();
    setPendingUserId(userId);
    setStep("submitting");
    setErrorMsg("");
    try {
      const res = await postOnboard({
        user_id: userId,
        name: "",
        goal: goalVal,
        current_activity: activityVal,
        time_per_week_min: timeMin,
        channel_preference: "in_app",
      });
      setResult(res);
      setStep("result");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? "We couldn't reach the setup service just yet. Try again in a moment."
          : err instanceof ApiError && err.kind === "timeout"
            ? "The setup service is still building your plan. Try again in a moment."
            : "Something went sideways setting things up. Try again?";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const finish = () => {
    if (pendingUserId) setUserId(pendingUserId);
    navigate("/chat");
  };

  const toggleExpanded = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background">
      {step === "goal" && (
        <QuestionCard
          heading="What's the result you're after?"
          options={GOAL_OPTIONS}
          onAnswer={(v) => {
            setGoal(v as Goal);
            setStep("activity");
          }}
        />
      )}
      {step === "activity" && (
        <QuestionCard
          heading="How active are you these days, honestly?"
          options={ACTIVITY_OPTIONS}
          onAnswer={(v) => {
            setActivity(v as CurrentActivity);
            setStep("time");
          }}
        />
      )}
      {step === "time" && (
        <QuestionCard
          heading="Realistically, how much time can you give per week?"
          slider={{ min: 60, max: 360, step: 15, defaultValue: 180 }}
          onAnswer={(v) => {
            const t = v as number;
            setTime(t);
            if (goal && activity) void submit(t, goal, activity);
          }}
        />
      )}
      {step === "submitting" && (
        <div className="mx-auto max-w-md px-6 py-24 fade-in">
          <div className="font-display text-2xl">Setting up your week…</div>
          <p className="text-sm text-muted-foreground mt-3">One moment.</p>
        </div>
      )}
      {step === "error" && (
        <div className="mx-auto max-w-md px-6 py-16 fade-in flex flex-col gap-4">
          <div className="font-display text-2xl">Almost there</div>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button
            onClick={() => goal && activity && submit(time, goal, activity)}
            className="rounded-2xl w-fit"
          >
            Try again
          </Button>
        </div>
      )}
      {step === "result" && result && (
        <div className="mx-auto max-w-md px-6 py-12 fade-in flex flex-col gap-6">
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="font-display text-2xl mb-2">Here's your week</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.welcome_message ?? "You're all set. Your plan will appear here as the system warms up."}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {(result.baseline_plan?.sessions ?? []).map((s, i) => {
                const focus = s.focus ?? s.type ?? "Session";
                const hasEx = s.exercises && s.exercises.length > 0;
                const open = expanded.has(i);
                return (
                  <div key={i} className="rounded-xl bg-secondary/40 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => hasEx && toggleExpanded(i)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          <span className="text-muted-foreground">{s.day}</span>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <span>{focus}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.duration_min} min
                        </div>
                      </div>
                      {hasEx &&
                        (open ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ))}
                    </button>
                    {open && hasEx && (
                      <ul className="mt-3 divide-y divide-border/40 rounded-lg bg-background/60 overflow-hidden">
                        {s.exercises!.map((ex, j) => (
                          <li
                            key={j}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <span className="text-sm text-foreground truncate">
                              {ex.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="inline-flex items-baseline gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs tabular-nums">
                                <span className="font-semibold text-foreground">{ex.sets}</span>
                                <span className="text-muted-foreground">sets</span>
                              </span>
                              <span className="inline-flex items-baseline gap-1 rounded-md bg-accent-warm/15 px-2 py-0.5 text-xs tabular-nums">
                                <span className="font-semibold text-foreground">{ex.reps}</span>
                                <span className="text-muted-foreground">reps</span>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              {(result.baseline_plan?.sessions ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Your detailed week will populate as the coach comes online.
                </p>
              )}
            </div>
          </div>
          <Button size="lg" onClick={finish} className="rounded-2xl">
            Let's go
          </Button>
        </div>
      )}
    </main>
  );
}
