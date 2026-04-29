import { useState } from "react";
import type { SessionPlan } from "@/lib/types";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface TodayCardProps {
  session: SessionPlan;
  why?: string;
  welcomeBack?: string | null;
  onDismissWelcome?: () => void;
}

export function TodayCard({ session, why, welcomeBack, onDismissWelcome }: TodayCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [showExercises, setShowExercises] = useState(false);

  const focus = session.focus ?? session.type ?? "Today";
  const rationale =
    why?.trim() || "Today's session matches where you are this week.";

  return (
    <div className="flex flex-col gap-3">
      {welcomeBack && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-accent-warm/15 px-4 py-3 text-sm text-foreground/90">
          <span>{welcomeBack}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismissWelcome}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="rounded-2xl bg-card border border-border/60 px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-2xl leading-tight">{focus}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {session.duration_min} min
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWhy((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            Why this?
          </button>
        </div>
        {showWhy && (
          <p className="text-sm text-muted-foreground italic mt-3 leading-relaxed">
            {rationale}
          </p>
        )}
        {session.exercises && session.exercises.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowExercises((s) => !s)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showExercises ? (
                <>
                  Hide exercises <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  View exercises <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
            {showExercises && (
              <ul className="mt-2 space-y-1.5">
                {session.exercises.map((ex, i) => (
                  <li key={i} className="text-sm text-foreground/90">
                    <span className="text-foreground">{ex.name}</span>
                    <span className="text-muted-foreground"> — {ex.sets} × {ex.reps}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
