import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, postProfile } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import type { DietaryPreference, Equipment, ExperienceLevel, WorkoutStyle } from "@/lib/types";

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "none", label: "None / bodyweight" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "resistance_bands", label: "Resistance bands" },
  { value: "cardio_machine", label: "Cardio machine" },
  { value: "full_gym", label: "Full gym" },
];

const STYLE_OPTIONS: { value: WorkoutStyle; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "mobility", label: "Mobility" },
  { value: "sports", label: "Sports" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to it — under 6 months of consistent practice" },
  { value: "intermediate", label: "Intermediate", description: "6 months to 2 years, comfortable with the basics" },
  { value: "advanced", label: "Advanced", description: "2+ years, training with structure and intent" },
  { value: "elite", label: "Elite", description: "Competitive or coaching-level mastery" },
];

const DIET_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
];

const profileSchema = z.object({
  injuries: z.string().trim().max(500, "Keep it under 500 characters."),
  equipment: z.array(z.string()).max(EQUIPMENT_OPTIONS.length),
  workout_styles: z.array(z.string()).max(STYLE_OPTIONS.length),
  experience_level: z.enum(["beginner", "intermediate", "advanced", "elite"], {
    required_error: "Pick the experience level that fits you best.",
    invalid_type_error: "Pick the experience level that fits you best.",
  }),
  dietary_preference: z.enum(["vegetarian", "non_vegetarian", "vegan"]).optional(),
});

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [injuries, setInjuries] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [styles, setStyles] = useState<WorkoutStyle[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel | undefined>(undefined);
  const [diet, setDiet] = useState<DietaryPreference | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggle = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = async () => {
    const parsed = profileSchema.safeParse({
      injuries,
      equipment,
      workout_styles: styles,
      experience_level: experience,
      dietary_preference: diet,
    });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Please review your inputs.");
      return;
    }
    if (!userId) {
      navigate("/onboard");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await postProfile({
        user_id: userId,
        ...parsed.data,
        equipment,
        workout_styles: styles,
        experience_level: parsed.data.experience_level!,
      });
    } catch (err) {
      // Non-blocking: persist locally so the UX is functional even if the workflow isn't wired yet.
      if (err instanceof ApiError) {
        try {
          localStorage.setItem(
            `profile_prefs:${userId}`,
            JSON.stringify(parsed.data),
          );
        } catch {
          // ignore storage errors
        }
      }
    } finally {
      setSubmitting(false);
      navigate("/chat");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="fade-in mx-auto w-full max-w-md flex flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            A few last details
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick your experience level so the coach calibrates intensity. Everything
            else is optional — skip what doesn't apply.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium">Injuries or physical limitations</label>
          <Textarea
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="e.g. left knee, mild lower back"
            maxLength={500}
            rows={3}
            className="rounded-2xl"
          />
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium">Available equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={equipment.includes(o.value)}
                onClick={() => setEquipment((prev) => toggle(prev, o.value))}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium">Workout style preferences</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={styles.includes(o.value)}
                onClick={() => setStyles((prev) => toggle(prev, o.value))}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium">
            Experience level <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {EXPERIENCE_OPTIONS.map((o) => {
              const active = experience === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setExperience(o.value)}
                  className={`text-left rounded-2xl border px-4 py-3 transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-foreground/40"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{o.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium">Dietary preference</label>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={diet === o.value}
                onClick={() => setDiet((prev) => (prev === o.value ? undefined : o.value))}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="rounded-2xl"
            onClick={save}
            disabled={submitting || !experience}
          >
            {submitting ? "Saving…" : "Save & continue to chat"}
          </Button>
        </div>
      </div>
    </main>
  );
}
