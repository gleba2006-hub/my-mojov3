import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthShell, FormError } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJoinFamily, type MyContext } from "@/lib/family.functions";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/join-family")({
  head: () => ({ meta: [{ title: "הצטרפות למשפחה — MyMojo" }] }),
  component: () => <RequireAuth allow={["newcomer"]}>{(me) => <JoinFamily me={me} />}</RequireAuth>,
});

function JoinFamily({ me }: { me: MyContext }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const join = useMutation({
    mutationFn: () => requestJoinFamily({ data: { code } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  if (me.family && !me.family.approved) {
    return (
      <AuthShell title="הבקשה נשלחה" subtitle="מחכים לאישור">
        <p role="status" className="text-center text-base text-muted-foreground">
          ההורה השני צריך לאשר את ההצטרפות מתוך האפליקציה שלו. אחרי האישור רעננו את הדף.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => signOut()}
          className="mt-6 h-11 w-full font-bold"
        >
          יציאה
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="הצטרפות למשפחה" subtitle="מקלידים את קוד ההזמנה שההורה השני יצר">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          join.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <FormError message={join.error instanceof Error ? join.error.message : null} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite">קוד הזמנה</Label>
          <Input
            id="invite"
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-14 text-center text-2xl font-black tracking-[0.25em]"
          />
        </div>
        <Button
          type="submit"
          disabled={join.isPending || code.trim().length < 4}
          className="h-12 text-base font-bold"
        >
          {join.isPending ? "שולחים…" : "שליחת בקשה"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/onboarding" className="font-bold text-primary">
          פותחים משפחה חדשה במקום
        </Link>
      </p>
    </AuthShell>
  );
}
