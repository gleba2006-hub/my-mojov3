import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/child")({
  head: () => ({ meta: [{ title: "MyMojo" }] }),
  component: () => (
    <RequireAuth allow={["child"]}>
      {() => (
        <AuthShell title="התחברת בהצלחה!" subtitle="מסך הבית של הילד/ה יגיע בשלב הבא">
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
