import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { endDemo } from "@/lib/demo";
import { getMyContext, type MyContext } from "@/lib/family.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMyContext(),
    enabled,
    staleTime: 15_000,
  });
}

/** Where a signed-in user belongs. */
export function homePathFor(me: MyContext): string {
  if (me.role === "admin") return "/admin";
  if (me.role === "child") return "/child";
  if (me.family && !me.family.approved) return "/join-family";
  if (me.role === "parent" && me.family) return "/parent";
  return "/onboarding";
}

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="טוען">
      <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

type Allowed = "admin" | "parent" | "child" | "newcomer";

/**
 * Client-side route guard. `newcomer` = signed in with no role yet (needs
 * onboarding). Real access control is RLS + server functions; this only routes.
 */
export function RequireAuth({
  allow,
  children,
}: {
  allow: Allowed[];
  children: (me: MyContext) => ReactNode;
}) {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const { data: me, isError } = useMe(!!session);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (!me) return;
    const kind: Allowed = me.role ?? "newcomer";
    if (!allow.includes(kind)) navigate({ to: homePathFor(me) });
  }, [loading, session, me, allow, navigate]);

  if (loading || !session) return <Spinner />;
  if (isError) {
    return (
      <p className="p-8 text-center text-destructive" role="alert">
        משהו השתבש בטעינה. רעננו את הדף.
      </p>
    );
  }
  if (!me) return <Spinner />;
  return <>{children(me)}</>;
}

export async function signOut() {
  endDemo();
  await supabase.auth.signOut();
}
