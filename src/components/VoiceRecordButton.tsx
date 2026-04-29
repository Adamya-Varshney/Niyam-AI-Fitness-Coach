import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface VoiceRecordButtonProps {
  onComplete: (base64: string) => void;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the data URL prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function VoiceRecordButton({ onComplete }: VoiceRecordButtonProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  const cleanup = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => () => cleanup(), []);

  const start = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64 = await blobToBase64(blob);
        cleanup();
        if (base64) onComplete(base64);
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // mic permission denied or unavailable — fail silently
      cleanup();
      setRecording(false);
    }
  };

  const stop = () => {
    if (!recording) return;
    setRecording(false);
    try {
      recorderRef.current?.stop();
    } catch {
      cleanup();
    }
  };

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={() => recording && stop()}
      onTouchStart={(e) => {
        e.preventDefault();
        void start();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stop();
      }}
      aria-label={recording ? "Recording" : "Hold to record"}
      className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 ease-out ${
        recording
          ? "bg-destructive text-destructive-foreground"
          : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      {recording ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-destructive-foreground pulse-dot" />
          {seconds}s
        </span>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
