interface BackendPlaceholderProps {
  title?: string;
  message: string;
}

export function BackendPlaceholder({ title, message }: BackendPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5 text-secondary-foreground/90">
      {title && <div className="font-display text-lg mb-1">{title}</div>}
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </div>
  );
}
