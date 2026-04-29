import { forwardRef, useImperativeHandle, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { VoiceRecordButton } from "./VoiceRecordButton";

interface ComposerProps {
  onSend: (text: string) => void;
  onVoice: (base64: string) => void;
  disabledHintMs?: number;
}

export interface ComposerHandle {
  focus: () => void;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSend, onVoice },
  ref,
) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-border/60 bg-background/95 backdrop-blur px-3 py-2.5">
      <div className="mx-auto max-w-2xl flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Type a message"
          className="flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm leading-snug placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 max-h-32"
        />
        {text.trim().length > 0 ? (
          <button
            type="button"
            onClick={send}
            aria-label="Send"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <VoiceRecordButton onComplete={onVoice} />
        )}
      </div>
    </div>
  );
});
