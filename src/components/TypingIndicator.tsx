export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-agent-bubble text-agent-bubble-foreground bubble-radius px-4 py-3">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground pulse-dot" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground pulse-dot"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground pulse-dot"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
