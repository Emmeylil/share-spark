import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Link2, BarChart3, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Referral Hub — Share campaigns, track impact" },
      {
        name: "description",
        content:
          "Internal referral platform for staff to share campaign assets with tracked, branded UTM links.",
      },
      { property: "og:title", content: "Referral Hub" },
      {
        property: "og:description",
        content: "Share campaigns. Track impact. Built for the team.",
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
            Referral Hub
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Internal employee advocacy
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Turn every teammate into a campaign channel.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Generate branded referral links, share campaign creatives, and track
            who's driving real impact — all from one dashboard.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {[
            {
              icon: Link2,
              title: "Personal referral links",
              body: "Each user gets a unique UTM link auto-built from the active campaign.",
            },
            {
              icon: Download,
              title: "Campaign creatives",
              body: "Download approved banners and videos in one click — no asking marketing.",
            },
            {
              icon: BarChart3,
              title: "Admin analytics",
              body: "See top departments, top creatives, and who's actively sharing.",
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
