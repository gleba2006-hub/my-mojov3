import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FormError } from "@/components/auth-shell";
import { QrScanner } from "@/components/qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemLinkCode } from "@/lib/family.functions";

export const Route = createFileRoute("/join")({
  validateSearch: z.object({ code: z.string().max(16).optional() }),
  head: () => ({ meta: [{ title: "חיבור ילד/ה — MyMojo" }] }),
  component: JoinPage,
});

function extractCode(text: string): string {
  try {
    const fromUrl = new URL(text).searchParams.get("code");
    if (fromUrl) return fromUrl;
  } catch {
    /* not a URL */
  }
  return text;
}

function JoinPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [code, setCode] = useState((search.code ?? "").toUpperCase());
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The code is only redeemed on an explicit tap, never on page load, so link
  // previews and scanners cannot burn a single-use code.
  async function connect(value: string) {
    setBusy(true);
    setError(null);
    try {
      const creds = await redeemLinkCode({ data: { code: value } });
      const { error: err } = await supabase.auth.signInWithPassword(creds);
      if (err) throw new Error("לא הצלחנו להתחבר. בקשו קוד חדש מההורה.");
      navigate({ to: "/child" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "משהו השתבש");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="חיבור ילד/ה" subtitle="סורקים את ה-QR או מקלידים את הקוד שההורה קיבל">
      {scanning ? (
        <QrScanner
          onClose={() => setScanning(false)}
          onResult={(text) => {
            setScanning(false);
            setCode(extractCode(text).toUpperCase());
          }}
        />
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            connect(code);
          }}
          className="flex flex-col gap-4"
        >
          <FormError message={error} />
          <Button
            type="button"
            variant="outline"
            onClick={() => setScanning(true)}
            className="h-12 text-base font-bold"
          >
            סריקת QR במצלמה
          </Button>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">קוד חיבור</Label>
            <Input
              id="code"
              dir="ltr"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-14 text-center text-2xl font-black tracking-[0.3em]"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="h-12 text-base font-bold"
          >
            {busy ? "מתחברים…" : "חיבור"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        הורה?{" "}
        <Link to="/login" className="font-bold text-primary">
          כניסה
        </Link>
      </p>
    </AuthShell>
  );
}
