import { useState, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuestionCardProps {
  heading: string;
  options?: { value: string; label: string }[];
  slider?: { min: number; max: number; step: number; defaultValue: number };
  input?: {
    placeholder?: string;
    maxLength?: number;
    autoComplete?: string;
    defaultValue?: string;
  };
  onAnswer: (value: string | number) => void;
  /** Optional content rendered below the heading (e.g. helper text). */
  children?: ReactNode;
}

export function QuestionCard({ heading, options, slider, input, onAnswer, children }: QuestionCardProps) {
  const [sliderValue, setSliderValue] = useState<number>(slider?.defaultValue ?? 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [textValue, setTextValue] = useState<string>(input?.defaultValue ?? "");
  const [error, setError] = useState<string>("");

  const handlePick = (value: string) => {
    if (picked) return;
    setPicked(value);
    window.setTimeout(() => onAnswer(value), 400);
  };

  const handleSubmitText = () => {
    const trimmed = textValue.trim();
    if (!trimmed) {
      setError("Please enter your name to continue.");
      return;
    }
    if (trimmed.length > (input?.maxLength ?? 80)) {
      setError(`Keep it under ${input?.maxLength ?? 80} characters.`);
      return;
    }
    setError("");
    onAnswer(trimmed);
  };

  return (
    <div className="fade-in mx-auto w-full max-w-md flex flex-col gap-8 px-6 py-12">
      <h1 className="font-display text-3xl sm:text-4xl leading-tight text-foreground">{heading}</h1>
      {children}
      {input && (
        <div className="flex flex-col gap-4">
          <Input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmitText();
              }
            }}
            placeholder={input.placeholder}
            maxLength={input.maxLength ?? 80}
            autoComplete={input.autoComplete ?? "given-name"}
            autoFocus
            className="h-12 rounded-2xl text-base"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="rounded-2xl" onClick={handleSubmitText}>
            Continue
          </Button>
        </div>
      )}
      {options && (
        <div className="flex flex-col gap-3">
          {options.map((o) => {
            const isPicked = picked === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => handlePick(o.value)}
                className={`text-left rounded-2xl border px-5 py-5 text-base transition-all duration-300 ease-out
                  ${
                    isPicked
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-foreground/40 hover:bg-secondary/60"
                  }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      {slider && (
        <div className="flex flex-col gap-6">
          <div>
            <Slider
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={[sliderValue]}
              onValueChange={(v) => setSliderValue(v[0])}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{sliderValue} min/week</span>{" "}
              (~{Math.round(sliderValue / 60)}h)
            </div>
          </div>
          <Button
            size="lg"
            className="rounded-2xl"
            onClick={() => onAnswer(sliderValue)}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

