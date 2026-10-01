import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FormError, GoogleIcon } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "הרשמה — MyMojo" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/app" });
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setBusy(false);
    if (err) {
      setError("לא הצלחנו להירשם. ייתכן שהאימייל כבר רשום.");
      return;
    }
    if (!data.session) setNotice("שלחנו אליכם מייל אימות. אחרי האישור אפשר להיכנס.");
  }

  async function google() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (err) setError("ההרשמה עם Google לא זמינה כרגע");
  }

  return (
    <AuthShell title="יוצאים להרפתקה" subtitle="פותחים חשבון הורה">
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-success/20 px-4 py-3 text-center text-sm font-bold text-success-foreground"
        >
          {notice}
        </p>
      ) : (
        <>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormError message={error} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">שם</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
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
              <Label htmlFor="password">סיסמה (8 תווים לפחות)</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !name || !email || !password}
              className="h-11 text-base font-bold"
            >
              {busy ? "פותחים חשבון…" : "הרשמה"}
            </Button>
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
            הרשמה עם Google
          </Button>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        כבר יש חשבון?{" "}
        <Link to="/login" className="font-bold text-primary">
          כניסה
        </Link>
      </p>
    </AuthShell>
  );
}
