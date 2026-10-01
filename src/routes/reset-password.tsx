import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FormError } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner, useSession } from "@/lib/session";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "סיסמה חדשה — MyMojo" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError("לא הצלחנו לעדכן את הסיסמה. בקשו קישור חדש.");
    else navigate({ to: "/app" });
  }

  if (loading) return <Spinner />;

  return (
    <AuthShell title="סיסמה חדשה" subtitle="בוחרים סיסמה חדשה לחשבון">
      {session ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormError message={error} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">סיסמה חדשה</Label>
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
          <Button type="submit" disabled={busy || !password} className="h-11 text-base font-bold">
            {busy ? "שומרים…" : "שמירה"}
          </Button>
        </form>
      ) : (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          הקישור לא תקין או שפג תוקפו. בקשו קישור חדש מעמוד &quot;שכחתי סיסמה&quot;.
        </p>
      )}
    </AuthShell>
  );
}
