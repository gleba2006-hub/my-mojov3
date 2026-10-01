import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FormError } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "איפוס סיסמה — MyMojo" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    // Same message either way, so the form can't be used to discover which emails exist.
    if (err && err.status !== 400 && err.status !== 422)
      setError("לא הצלחנו לשלוח. נסו שוב עוד רגע.");
    else setSent(true);
  }

  return (
    <AuthShell title="שכחתם סיסמה?" subtitle="נשלח קישור לאיפוס">
      {sent ? (
        <p
          role="status"
          className="rounded-xl bg-success/20 px-4 py-3 text-center text-sm font-bold text-success-foreground"
        >
          אם האימייל רשום אצלנו, נשלח אליו קישור לאיפוס הסיסמה.
        </p>
      ) : (
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
          <Button type="submit" disabled={busy || !email} className="h-11 text-base font-bold">
            {busy ? "שולחים…" : "שליחת קישור"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-bold text-primary">
          חזרה לכניסה
        </Link>
      </p>
    </AuthShell>
  );
}
