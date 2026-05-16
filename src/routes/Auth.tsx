import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "forgot";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1A6.2 6.2 0 1 1 12 5.8a5.6 5.6 0 0 1 4 1.55l2.7-2.6A9.6 9.6 0 0 0 12 2.2 9.8 9.8 0 1 0 21.8 12c0-.66-.07-1.16-.17-1.8H12z" />
  </svg>
);

export default function Auth() {
  const { userId, loading } = useUser();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // After session updates, redirect.
  useEffect(() => {
    if (userId) navigate("/", { replace: true });
  }, [userId, navigate]);

  if (loading) return null;
  if (userId) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("signin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result?.error) throw result.error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          <h1 className="font-display text-2xl">
            {mode === "signup"
              ? "Create your account"
              : mode === "forgot"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start your coaching journey"
              : mode === "forgot"
                ? "We'll email you a reset link"
                : "Sign in to continue"}
          </p>
        </header>

        {mode !== "forgot" && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onGoogle}
              disabled={busy}
            >
              <GoogleIcon /> Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          {mode === "signin" && (
            <>
              <button className="hover:text-foreground underline-offset-4 hover:underline" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
              <div>
                Don't have an account?{" "}
                <button className="text-foreground hover:underline" onClick={() => setMode("signup")}>
                  Sign up
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <button className="text-foreground hover:underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <button className="text-foreground hover:underline" onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
