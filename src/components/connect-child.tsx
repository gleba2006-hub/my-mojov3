import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createLinkCode } from "@/lib/family.functions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth-shell";

/** QR + short code (15 min) that connects a child's device. */
export function ConnectChild({ childId, childName }: { childId: string; childName: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [qr, setQr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createLinkCode({ data: { childId } });
      setCode(res.code);
      setExpiresAt(new Date(res.expiresAt).getTime());
      const url = `${window.location.origin}/join?code=${res.code}`;
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 240 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "משהו השתבש");
    } finally {
      setBusy(false);
    }
  }, [childId]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const expired = !!code && left === 0;
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        במכשיר של {childName}: פותחים את MyMojo ובוחרים &quot;חיבור ילד&quot;, וסורקים או מקלידים את
        הקוד.
      </p>
      <FormError message={error} />
      {qr && !expired ? (
        <img
          src={qr}
          alt={`QR לחיבור המכשיר של ${childName}`}
          className="size-60 rounded-2xl border border-border bg-white p-2"
        />
      ) : null}
      {code && !expired ? (
        <>
          <p dir="ltr" className="select-all text-4xl font-black tracking-[0.3em] text-foreground">
            {code}
          </p>
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            תקף עוד {mmss}
          </p>
        </>
      ) : null}
      {expired ? <p className="text-sm font-bold text-destructive">הקוד פג תוקף</p> : null}
      <Button
        type="button"
        variant="outline"
        onClick={generate}
        disabled={busy}
        className="tap-target"
      >
        {busy ? "יוצר קוד…" : "קוד חדש"}
      </Button>
    </div>
  );
}
