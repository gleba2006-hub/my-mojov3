import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthShell, FormError } from "@/components/auth-shell";
import { ConnectChild } from "@/components/connect-child";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addChild, createFamily, listChildren, type MyContext } from "@/lib/family.functions";
import { RequireAuth } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "הקמת משפחה — MyMojo" }] }),
  component: () => (
    <RequireAuth allow={["newcomer", "parent"]}>{(me) => <Onboarding me={me} />}</RequireAuth>
  ),
});

function Onboarding({ me }: { me: MyContext }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (me.family && !me.family.approved) navigate({ to: "/join-family" });
  }, [me, navigate]);

  if (me.family?.approved)
    return <ChildrenStep familyId={me.family.id} familyName={me.family.name} />;
  return <FamilyStep />;
}

function FamilyStep() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => createFamily({ data: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <AuthShell title="מקימים משפחה" subtitle="איך נקרא למשפחה?">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          create.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <FormError message={create.error instanceof Error ? create.error.message : null} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="family">שם המשפחה</Label>
          <Input
            id="family"
            required
            minLength={2}
            maxLength={60}
            placeholder="משפחת כהן"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={create.isPending || name.trim().length < 2}
          className="h-11 text-base font-bold"
        >
          {create.isPending ? "יוצרים…" : "המשך"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        כבר יש משפחה?{" "}
        <Link to="/join-family" className="font-bold text-primary">
          הצטרפות עם קוד הזמנה
        </Link>
      </p>
    </AuthShell>
  );
}

const THIS_YEAR = new Date().getFullYear();

function ChildrenStep({ familyId, familyName }: { familyId: string; familyName: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const children = useQuery({ queryKey: ["children"], queryFn: () => listChildren() });
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const [birthYear, setBirthYear] = useState(THIS_YEAR - 8);
  const [connecting, setConnecting] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => addChild({ data: { familyId, name, gender, birthYear } }),
    onSuccess: async (res) => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["children"] });
      setConnecting(res.childId);
    },
  });

  const list = children.data ?? [];
  const active = list.find((c) => c.id === connecting);

  return (
    <AuthShell title={familyName} subtitle="מוסיפים את הילדים, אחד-אחד" className="max-w-lg">
      {active ? (
        <div className="flex flex-col gap-5">
          <h2 className="text-center text-xl font-black">חיבור המכשיר של {active.name}</h2>
          <ConnectChild childId={active.id} childName={active.name} />
          <Button
            type="button"
            onClick={() => setConnecting(null)}
            className="h-11 text-base font-bold"
          >
            סיימתי עם {active.name}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {list.length > 0 ? (
            <ul className="flex flex-col gap-2" aria-label="הילדים במשפחה">
              {list.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3"
                >
                  <span className="font-bold">{c.name}</span>
                  {c.connected ? (
                    <span className="text-sm font-bold text-success-foreground">מחובר/ת</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConnecting(c.id)}
                      className="tap-target"
                    >
                      חיבור מכשיר
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              add.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-lg font-black">
              {list.length === 0 ? "הילד/ה הראשון/ה" : "עוד ילד/ה"}
            </h2>
            <FormError message={add.error instanceof Error ? add.error.message : null} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="child-name">שם</Label>
              <Input
                id="child-name"
                required
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">מין</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["girl", "boy"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={gender === g}
                    onClick={() => setGender(g)}
                    className={cn(
                      "tap-target rounded-2xl border-2 px-4 py-3 text-base font-bold transition-colors",
                      gender === g
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {g === "girl" ? "בת" : "בן"}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <Label htmlFor="birth-year">שנת לידה</Label>
              <select
                id="birth-year"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="h-11 rounded-md border border-input bg-background px-3 text-base"
              >
                {Array.from({ length: 19 }, (_, i) => THIS_YEAR - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={add.isPending || !name.trim()}
              className="h-11 text-base font-bold"
            >
              {add.isPending ? "מוסיפים…" : "הוספה וחיבור מכשיר"}
            </Button>
          </form>

          {list.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate({ to: "/parent" })}
              className="h-11 text-base font-bold"
            >
              סיום · לבחירת שיטת חינוך
            </Button>
          ) : null}
        </div>
      )}
    </AuthShell>
  );
}
