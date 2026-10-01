import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthShell, FormError, GoogleIcon } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark, LogoSplash } from "@/components/brand";
import { endDemo } from "@/lib/demo";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "כניסה — MyMojo" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    endDemo();
    if (session) {
      const next = sessionStorage.getItem("mm-next");
      if (next === "/admin") {
        sessionStorage.removeItem("mm-next");
        navigate({ to: "/admin" });
        return;
      }
      navigate({ to: "/app" });
    }
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) setError("האימייל או הסיסמה לא נכונים");
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login`,
    });
    if (result.error) setError("הכניסה עם Google לא זמינה כרגע");
  }

  return (
    <>
      <LogoSplash />
      <AuthShell
      title="ברוכים השבים"
      subtitle="כניסה להורים"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">אימייל</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">סיסמה</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={busy || !email || !password}
          className="h-11 text-base font-bold"
        >
          {busy ? "נכנסים…" : "כניסה"}
        </Button>
        <Link
          to="/forgot-password"
          className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          שכחתי סיסמה
        </Link>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        או
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={google}
        className="h-11 w-full gap-3 text-base font-bold"
      >
        <GoogleIcon />
        כניסה עם Google
      </Button>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        <p className="text-muted-foreground">
          אין לכם חשבון?{" "}
          <Link to="/register" className="font-bold text-primary">
            הרשמה
          </Link>
        </p>
        <p className="text-muted-foreground">
          ילד/ה?{" "}
          <Link to="/join" className="font-bold text-primary">
            חיבור עם קוד
          </Link>
        </p>
      </div>
    </AuthShell>
    </>
  );
}
