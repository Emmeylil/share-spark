import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/admin", label: "Analytics" },
    { to: "/admin/campaigns", label: "Campaigns" },
    { to: "/admin/assets", label: "Assets" },
  ];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Manage campaigns, assets, and analytics.</p>
      </div>
      <div className="mb-8 flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = t.to === "/admin" ? pathname === "/admin" : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </main>
  );
}
