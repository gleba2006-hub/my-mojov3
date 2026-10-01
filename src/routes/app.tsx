import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { homePathFor, RequireAuth, Spinner } from "@/lib/session";
import type { MyContext } from "@/lib/family.functions";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "MyMojo" }] }),
  component: () => (
    <RequireAuth allow={["admin", "parent", "child", "newcomer"]}>
      {(me) => <Redirect me={me} />}
    </RequireAuth>
  ),
});

function Redirect({ me }: { me: MyContext }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: homePathFor(me), replace: true });
  }, [me, navigate]);
  return <Spinner />;
}
