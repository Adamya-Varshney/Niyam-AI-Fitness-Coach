import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, newId, postOnboard } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type {
  CurrentActivity,
  DietaryPreference,
  Equipment,
  ExperienceLevel,
  Goal,
  OnboardResponse,
  WorkoutStyle,
} from "@/lib/types";
import { useUser } from "@/lib/user-context";
import { markOnboardedLocally } from "@/lib/use-onboarding-status";
import { ChevronDown, ChevronUp } from "lucide-react";

type Step =
  | "name"
  | "goal"
  | "activity"
  | "time"
  | "experience"
  | "style"
  | "equipment"
  | "injuries"
  | "diet"
  | "submitting"
  | "result"
  | "error";

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "build_strength", label: "Build strength" },
  { value: "get_lean", label: "Get lean" },
  { value: "feel_better", label: "Feel better" },
  { value: "move_more", label: "Move more" },
];

const ACTIVITY_OPTIONS: { value: CurrentActivity; label: string }[] = [
  { value: "rarely", label: "Rarely" },
  { value: "weekend_only", label: "Weekend only" },
  { value: "a_few_times", label: "A few times a week" },
  { value: "most_days", label: "Most days" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to it — under 6 months of consistent practice" },
  { value: "intermediate", label: "Intermediate", description: "6 months to 2 years, comfortable with the basics" },
  { value: "advanced", label: "Advanced", description: "2+ years, training with structure and intent" },
  { value: "elite", label: "Elite", description: "Competitive or coaching-level mastery" },
];

const STYLE_OPTIONS: { value: WorkoutStyle; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "mobility", label: "Mobility" },
  { value: "sports", label: "Sports" },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "bodyweight", label: "None / bodyweight only" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "resistance_bands", label: "Resistance bands" },
  { value: "cardio_machine", label: "Cardio machine (treadmill, bike, rower, etc.)" },
  { value: "full_gym", label: "Full gym access" },
];

const DIET_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
];

// Step → progress index (1..8). Non-question steps hide the indicator.
const STEP_INDEX: Partial<Record<Step, number>> = {
  goal: 1,
  activity: 2,
  time: 3,
  experience: 4,
  style: 5,
  equipment: 6,
  injuries: 7,
  diet: 8,
};

function ProgressBar({ step }: { step: Step }) {
  const idx = STEP_INDEX[step];
  if (!idx) return null;
  return (
    <div className="mx-auto w-full max-w-md px-6 pt-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Step {idx} of 8</span>
        <span>{Math.round((idx / 8) * 100)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(idx / 8) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function Onboard() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState<string>("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activity, setActivity] = useState<CurrentActivity | null>(null);
  const [time, setTime] = useState<number>(180);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [style, setStyle] = useState<WorkoutStyle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [injuries, setInjuries] = useState<string>("");
  const [diet, setDiet] = useState<DietaryPreference | null>(null);
  const [result, setResult] = useState<OnboardResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const submit = async (overrides?: { injuries?: string; diet?: DietaryPreference }) => {
    const finalDiet = overrides?.diet ?? diet;
    const finalInjuries = overrides?.injuries ?? injuries;
    if (!goal || !activity || !experience || !style || !equipment || !finalDiet) {
      setErrorMsg("Please complete all questions to continue.");
      setStep("error");
      return;
    }
    if (!userId) {
      setErrorMsg("Please sign in to continue.");
      setStep("error");
      return;
    }
    setStep("submitting");
    setErrorMsg("");
    try {
      const res = await postOnboard({
        user_id: userId,
        name: name.trim(),
        goal,
        current_activity: activity,
        time_per_week_min: time,
        experience_level: experience,
        workout_style: style,
        equipment,
        injuries: finalInjuries.trim(),
        dietary_preference: finalDiet,
        channel_preference: "in_app",
      });
      // Persist prefs so the Profile page reflects onboarding answers.
      try {
        localStorage.setItem(
          `profile_prefs:${userId}`,
          JSON.stringify({
            injuries: finalInjuries.trim(),
            equipment: [equipment],
            workout_styles: [style],
            experience_level: experience,
            dietary_preference: finalDiet,
          }),
        );
      } catch {
        /* ignore */
      }
      // Persist the same answers to the database at the user level.
      try {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              display_name: name.trim() || null,
              goal,
              current_activity: activity,
              time_per_week_min: time,
              experience_level: experience,
              workout_styles: [style],
              equipment: [equipment],
              injuries: finalInjuries.trim(),
              dietary_preference: finalDiet,
              onboarded_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );
      } catch {
        /* non-blocking */
      }
      setResult(res);
      setStep("result");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? "We couldn't reach the setup service just yet. Try again in a moment."
          : err instanceof ApiError && err.kind === "timeout"
            ? "The setup service is still building your plan. Try again in a moment."
            : "We hit a snag setting up your plan. Tap to retry.";
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const finish = () => {
    // userId already set via auth session.
    if (result) {
      try {
        window.localStorage.setItem(
          "fc_onboard_seed",
          JSON.stringify({
            name: name.trim(),
            welcome_message: result.welcome_message,
            baseline_plan: result.baseline_plan,
            ts: Date.now(),
          }),
        );
      } catch {
        /* ignore quota */
      }
    }
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
      <ProgressBar step={step} />

      {step === "name" && (
        <QuestionCard
          heading="First — what should we call you?"
          input={{ placeholder: "Your first name", maxLength: 60, autoComplete: "given-name", defaultValue: name }}
          onAnswer={(v) => {
            setName(String(v));
            setStep("goal");
          }}
        />
      )}

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
          slider={{ min: 60, max: 360, step: 15, defaultValue: time }}
          onAnswer={(v) => {
            setTime(v as number);
            setStep("experience");
          }}
        />
      )}

      {step === "experience" && (
        <div className="fade-in mx-auto w-full max-w-md flex flex-col gap-6 px-6 py-12">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            How experienced are you with structured training?
          </h1>
          <div className="flex flex-col gap-3">
            {EXPERIENCE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setExperience(o.value);
                  setTimeout(() => setStep("style"), 350);
                }}
                className={`text-left rounded-2xl border px-5 py-4 transition-all duration-300 ${
                  experience === o.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-foreground/40 hover:bg-secondary/60"
                }`}
              >
                <div className="text-base font-medium text-foreground">{o.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{o.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "style" && (
        <QuestionCard
          heading="What style do you enjoy most?"
          options={STYLE_OPTIONS}
          onAnswer={(v) => {
            setStyle(v as WorkoutStyle);
            setStep("equipment");
          }}
        />
      )}

      {step === "equipment" && (
        <QuestionCard
          heading="What equipment do you have access to?"
          options={EQUIPMENT_OPTIONS}
          onAnswer={(v) => {
            setEquipment(v as Equipment);
            setStep("injuries");
          }}
        />
      )}

      {step === "injuries" && (
        <div className="fade-in mx-auto w-full max-w-md flex flex-col gap-6 px-6 py-12">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            Any injuries or physical limitations?
          </h1>
          <Textarea
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="e.g., lower back pain, bad knees, shoulder issues. Leave blank if none."
            rows={3}
            maxLength={500}
            className="rounded-2xl text-base"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            If you have none, type "none" so we know you've considered it.
          </p>
          <Button
            size="lg"
            className="rounded-2xl"
            disabled={!injuries.trim()}
            onClick={() => setStep("diet")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "diet" && (
        <QuestionCard
          heading="Dietary preference?"
          options={DIET_OPTIONS}
          onAnswer={(v) => {
            const d = v as DietaryPreference;
            setDiet(d);
            void submit({ diet: d });
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
          <Button onClick={() => void submit()} className="rounded-2xl w-fit">
            Retry
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
                        <div className="text-xs text-muted-foreground mt-0.5">{s.duration_min} min</div>
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
                          <li key={j} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <span className="text-sm text-foreground truncate">{ex.name}</span>
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
            Start chatting with your coach
          </Button>
        </div>
      )}
    </main>
  );
}
