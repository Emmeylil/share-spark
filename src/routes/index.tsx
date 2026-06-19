import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Link2, BarChart3, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jumia Employee Advocacy — Share campaigns, track impact" },
      {
        name: "description",
        content:
          "Internal employee advocacy platform for staff to share campaign assets with tracked referral links.",
      },
      { property: "og:title", content: "Jumia Employee Advocacy" },
      {
        property: "og:description",
        content: "Share campaigns. Track impact. Built for the Jumia team.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-block h-7 w-7 rounded-md bg-primary" />
            Jumia Employee Advocacy
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Join the Program
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Employee Advocacy
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Every Employee Can Help Grow Jumia.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Share campaigns with friends, family, and your network using your
            unique referral link. Track your impact and see how your referrals
            contribute to Jumia's growth.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Join the Program
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {[
            {
              icon: Link2,
              title: "Personal Tracking Link",
              body: "Every referral is automatically attributed to you.",
            },
            {
              icon: Download,
              title: "Campaign Library",
              body: "Access approved content ready for sharing.",
            },
            {
              icon: BarChart3,
              title: "Impact Analytics",
              body: "Track clicks, registrations, purchases, and performance trends.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Restricted to @jumia.com accounts.
      </footer>
    </div>
  );
}

