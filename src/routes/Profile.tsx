import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useStatePolling } from "@/lib/polling";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, User as UserIcon } from "lucide-react";
import type { BaselinePlan, ProfilePreferences } from "@/lib/types";

interface OnboardSeed {
  name?: string;
  welcome_message?: string;
  baseline_plan?: BaselinePlan;
  ts?: number;
}

function readSeed(): OnboardSeed | null {
  try {
    const raw = localStorage.getItem("fc_onboard_seed");
    return raw ? (JSON.parse(raw) as OnboardSeed) : null;
  } catch {
    return null;
  }
}

function readPrefs(userId: string | null): ProfilePreferences | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`profile_prefs:${userId}`);
    return raw ? (JSON.parse(raw) as ProfilePreferences) : null;
  } catch {
    return null;
  }
}

const GOAL_LABEL: Record<string, string> = {
  build_strength: "Build strength",
  get_lean: "Get lean",
  feel_better: "Feel better",
  move_more: "Move more",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-right text-foreground break-words">{value}</span>
    </div>
  );
}

export default function Profile() {
  const { userId } = useUser();
  const { state } = useStatePolling(userId);
  const seed = useMemo(() => readSeed(), []);
  const prefs = useMemo(() => readPrefs(userId), [userId]);

  const name = state?.profile?.name || seed?.name || "Friend";
  const goal = state?.profile?.goal ? GOAL_LABEL[state.profile.goal] : null;
  const week = state?.profile?.week_number ?? seed?.baseline_plan?.week_number;
  const adherence = state?.adherence_summary;
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasPrefs =
    prefs &&
    (prefs.injuries?.trim() ||
      (prefs.equipment && prefs.equipment.length > 0) ||
      (prefs.workout_styles && prefs.workout_styles.length > 0) ||
      prefs.experience_level ||
      prefs.beliefs_diet?.trim());

  const EXPERIENCE_LABEL: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    elite: "Elite",
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl">Your profile</h1>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/profile/setup">
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Link>
          </Button>
        </header>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-foreground font-display text-lg">
              {initials || <UserIcon className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-xl">{name}</CardTitle>
              {goal && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Goal: <span className="text-foreground">{goal}</span>
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Row label="Week" value={week ? `Week ${week}` : "—"} />
            <Row
              label="Adherence"
              value={
                adherence
                  ? `${adherence.last_7d} this week · ${adherence.streak_weeks}-week streak`
                  : "Tracking begins this week"
              }
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Preferences</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
              <Link to="/profile/setup">{hasPrefs ? "Update" : "Add details"}</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {hasPrefs ? (
              <>
                <Row
                  label="Injuries"
                  value={prefs?.injuries?.trim() || <span className="text-muted-foreground">None noted</span>}
                />
                <Row
                  label="Equipment"
                  value={
                    prefs?.equipment?.length ? (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {prefs.equipment.map((e) => (
                          <span key={e} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {e.replace(/_/g, " ")}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <Row
                  label="Styles"
                  value={
                    prefs?.workout_styles?.length ? (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {prefs.workout_styles.map((s) => (
                          <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {s}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <Row
                  label="Experience"
                  value={
                    prefs?.experience_level ? (
                      EXPERIENCE_LABEL[prefs.experience_level]
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
                <Row
                  label="Beliefs / diet"
                  value={prefs?.beliefs_diet?.trim() || <span className="text-muted-foreground">—</span>}
                />
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Add injuries, equipment, and workout style so your coach can tailor things further.
                </p>
                <Button asChild className="rounded-2xl">
                  <Link to="/profile/setup">Complete your profile</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/chat" className="hover:text-foreground">← Back to chat</Link>
          <span>ID: {userId ? userId.slice(0, 8) : "—"}</span>
        </div>
      </div>
    </main>
  );
}
