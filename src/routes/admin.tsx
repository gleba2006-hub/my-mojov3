import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "ניהול — MyMojo" }] }),
  component: () => (
    <RequireAuth allow={["admin"]}>
      {() => (
        <AuthShell title="ניהול" subtitle="לוח הניהול ייבנה בשלב 6">
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut()}
            className="h-11 w-full font-bold"
          >
            יציאה
          </Button>
        </AuthShell>
      )}
    </RequireAuth>
  ),
});
