import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthShell, FormError } from "@/components/auth-shell";
import { ConnectChild } from "@/components/connect-child";
import { Button } from "@/components/ui/button";
import {
  createInviteCode,
  decideJoinRequest,
  listChildren,
  listJoinRequests,
  type MyContext,
} from "@/lib/family.functions";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/parent")({
  head: () => ({ meta: [{ title: "המשפחה שלי — MyMojo" }] }),
  component: () => <RequireAuth allow={["parent"]}>{(me) => <ParentHome me={me} />}</RequireAuth>,
});

function ParentHome({ me }: { me: MyContext }) {
  const familyId = me.family!.id;
  const children = useQuery({ queryKey: ["children"], queryFn: () => listChildren() });
  const [connecting, setConnecting] = useState<string | null>(null);
  const active = children.data?.find((c) => c.id === connecting);

  return (
    <AuthShell
      title={me.family!.name}
      subtitle="מסך הבית של ההורה (המשך בנייה בשלבים הבאים)"
      className="max-w-lg"
    >
      <div className="flex flex-col gap-8">
        <section aria-labelledby="kids-title" className="flex flex-col gap-3">
          <h2 id="kids-title" className="text-lg font-black">
            הילדים
          </h2>
          {active ? (
            <div className="flex flex-col gap-4">
              <ConnectChild childId={active.id} childName={active.name} />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConnecting(null)}
                className="h-11 font-bold"
              >
                חזרה
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {(children.data ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3"
                >
                  <span className="font-bold">{c.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConnecting(c.id)}
                    className="tap-target"
                  >
                    {c.connected ? "חיבור מכשיר נוסף" : "חיבור מכשיר"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <InviteSection familyId={familyId} />
        <JoinRequests familyId={familyId} />

        <Button
          type="button"
          variant="outline"
          onClick={() => signOut()}
          className="h-11 font-bold"
        >
          יציאה
        </Button>
      </div>
    </AuthShell>
  );
}

function InviteSection({ familyId }: { familyId: string }) {
  const invite = useMutation({ mutationFn: () => createInviteCode({ data: { familyId } }) });
  return (
    <section aria-labelledby="invite-title" className="flex flex-col gap-3">
      <h2 id="invite-title" className="text-lg font-black">
        הורה נוסף
      </h2>
      <p className="text-sm text-muted-foreground">
        ההורה השני נרשם, בוחר &quot;הצטרפות עם קוד הזמנה&quot; ומקליד את הקוד. אתם תאשרו את הבקשה
        כאן.
      </p>
      <FormError message={invite.error instanceof Error ? invite.error.message : null} />
      {invite.data ? (
        <p
          dir="ltr"
          className="select-all rounded-2xl bg-muted py-3 text-center text-3xl font-black tracking-[0.25em]"
        >
          {invite.data.code}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={() => invite.mutate()}
        disabled={invite.isPending}
        className="h-11 font-bold"
      >
        {invite.data ? "קוד הזמנה חדש" : "יצירת קוד הזמנה"}
      </Button>
    </section>
  );
}

function JoinRequests({ familyId }: { familyId: string }) {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ["join-requests", familyId],
    queryFn: () => listJoinRequests({ data: { familyId } }),
    refetchInterval: 15_000,
  });
  const decide = useMutation({
    mutationFn: (v: { memberId: string; approve: boolean }) => decideJoinRequest({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests", familyId] }),
  });

  if (!requests.data || requests.data.length === 0) return null;
  return (
    <section aria-labelledby="requests-title" className="flex flex-col gap-3">
      <h2 id="requests-title" className="text-lg font-black">
        בקשות הצטרפות
      </h2>
      <FormError message={decide.error instanceof Error ? decide.error.message : null} />
      <ul className="flex flex-col gap-2">
        {requests.data.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3"
          >
            <span className="font-bold">{r.name}</span>
            <span className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ memberId: r.id, approve: true })}
                className="tap-target"
              >
                אישור
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ memberId: r.id, approve: false })}
                className="tap-target"
              >
                דחייה
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
