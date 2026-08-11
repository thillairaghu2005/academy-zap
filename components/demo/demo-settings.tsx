"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Database,
  Download,
  ExternalLink,
  FlaskConical,
  Gauge,
  LoaderCircle,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  WifiOff,
  Upload,
} from "lucide-react";

import {
  clearDemoAnalytics,
  getAnalyticsSummary,
  trackDemoEvent,
} from "@/lib/demo/analytics";
import { getDemoActivity } from "@/lib/demo/activity";
import { downloadDemoBackup, importDemoBackup } from "@/lib/demo/backup";
import {
  resetDemoStorage,
  subscribeDemoStorage,
} from "@/lib/demo/storage";
import {
  useDemoPreferences,
} from "@/components/providers/demo-preferences-provider";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Demo settings — the frontend demo's control surface.              */
/*                                                                    */
/*  Everything here is local, persisted browser state:                */
/*   - Reset demo data   → wipes cart/progress/attempts/notifications */
/*   - Display prefs     → compact density + reduce-data mode         */
/*   - Local analytics   → page views / lesson / lab / assessment     */
/*     / judge events tracked in the browser (see lib/demo/analytics) */
/*   - Recent activity   → the last demo activity feed entries        */
/*                                                                    */
/*  There is no server: "reset" reloads the page after clearing the   */
/*  demo stores, restoring every seeded fixture.                      */
/* ------------------------------------------------------------------ */

const DEMO_STATE_LINKS = [
  {
    href: "/checkout/cs-expired-demo",
    label: "Expired checkout",
    description: "A checkout session past its 30-minute validity.",
  },
  {
    href: "/checkout/cs-fail-demo",
    label: "Declined payment",
    description: "Provider-side decline at the webhook step.",
  },
  {
    href: "/checkout/cs-paid-demo",
    label: "Already paid",
    description: "Paid session with fulfillment + idempotency replay.",
  },
  {
    href: "/judge/p-boom",
    label: "Judge outage",
    description: "503 simulated judge-queue failure on submit.",
  },
  {
    href: "/labs/lab-boom",
    label: "Lab outage",
    description: "503 simulated orchestrator failure on provision.",
  },
] as const;

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-transparent bg-primary"
            : "border-border bg-secondary",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function DemoSettings() {
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const online = useOnlineStatus();
  const { compactMode, reduceData, setCompactMode, setReduceData } =
    useDemoPreferences();

  const [resetting, setResetting] = React.useState(false);
  const [summary, setSummary] = React.useState(() => getAnalyticsSummary());
  const [activity, setActivity] = React.useState(() =>
    getDemoActivity().slice(-8).reverse(),
  );
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  // Keep the analytics + activity readouts live when other tabs mutate the
  // demo stores (or this dialog stays open across events).
  React.useEffect(() => {
    return subscribeDemoStorage(() => {
      setSummary(getAnalyticsSummary());
      setActivity(getDemoActivity().slice(-8).reverse());
    });
  }, []);

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    // Flush the tracker one last time BEFORE wiping the store.
    trackDemoEvent("demo_reset");
    window.setTimeout(() => {
      resetDemoStorage();
      queryClient.clear();
      announce("Demo data has been reset");
      toast.success("Demo data reset — reloading with fresh fixtures ⚡");
      window.location.reload();
    }, 250);
  };

  const stats = [
    { label: "Pages visited", value: summary.pages, icon: BarChart3 },
    { label: "Lessons completed", value: summary.completedLessons, icon: Gauge },
    { label: "Lab sessions", value: summary.labStarts, icon: FlaskConical },
    { label: "Assessments", value: summary.assessmentSubmissions, icon: Trophy },
    { label: "Judge submits", value: summary.judgeSubmissions, icon: Activity },
    { label: "Total events", value: summary.total, icon: Database },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start px-2">
          <Settings2 className="size-4" />
          Demo settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,44rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demo settings</DialogTitle>
          <DialogDescription>
            Everything on Zapsters runs locally in your browser. Tune the demo,
            inspect your local analytics, and reset the seeded fixtures.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Connection + tour */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm">
              {online ? (
                <span className="flex items-center gap-1.5 font-medium text-success-strong">
                  <span className="size-2 rounded-full bg-success" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-warning-strong">
                  <WifiOff className="size-4" />
                  Offline — saved courses remain readable
                </span>
              )}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard?tour=1">
                <Sparkles className="size-3.5" />
                Take the tour
              </Link>
            </Button>
          </div>

          {/* Display preferences */}
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              Display preferences
            </p>
            <div className="flex flex-col gap-2">
              <Toggle
                checked={compactMode}
                onChange={setCompactMode}
                label="Compact density"
                description="Tightens spacing and radii across the whole app. Persisted in the browser."
              />
              <Toggle
                checked={reduceData}
                onChange={setReduceData}
                label="Reduce data mode"
                description="Hides decorative gradients and heavy effects for low-power viewing."
              />
            </div>
          </div>

          <Separator />

          {/* Local analytics */}
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              <BarChart3 className="size-3.5" />
              Local analytics
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <stat.icon className="size-4 text-primary" />
                  <p className="mt-2 font-display text-h3 tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => {
                clearDemoAnalytics();
                setSummary(getAnalyticsSummary());
                announce("Local analytics cleared");
                toast.info("Local analytics cleared.");
              }}
            >
              Clear analytics
            </Button>
          </div>

          {/* Recent activity */}
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              <Activity className="size-3.5" />
              Recent activity
            </p>
            {activity.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                No demo activity yet — complete a lesson, run a lab, or submit
                to a judge problem and it will appear here.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
                {activity.map((entry) => (
                  <li key={`${entry.created_at}-${entry.label}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Activity className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {entry.label}
                    </span>
                    <span className="shrink-0 text-caption text-muted-foreground">
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              <Database className="size-3.5" />
              Local backup
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Move your progress, notes, bookmarks, preferences, and demo activity between browsers. No data leaves this device.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadDemoBackup(); toast.success("Demo backup downloaded."); }}>
                <Download className="size-3.5" /> Export data
              </Button>
              <Button variant="outline" size="sm" onClick={() => backupInputRef.current?.click()}>
                <Upload className="size-3.5" /> Import data
              </Button>
              <input
                ref={backupInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    importDemoBackup(await file.text());
                    queryClient.clear();
                    announce("Demo backup imported");
                    toast.success("Demo backup imported — reloading.");
                    window.setTimeout(() => window.location.reload(), 400);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not import that backup.");
                  }
                }}
              />
            </div>
          </div>

          {/* Demo-state quick links */}
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold uppercase tracking-widest text-muted-foreground/60">
              Demo states
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_STATE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5 outline-none transition-colors hover:border-primary/30 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{link.label}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {link.description}
                    </span>
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reset */}
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <RotateCcw className="size-4" />
              Reset demo data
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Clears the persisted cart, course progress, assessment attempts,
              lab sessions, notifications, analytics, and preferences — then
              reloads with the original seeded fixtures.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-fit"
              disabled={resetting}
              onClick={handleReset}
            >
              {resetting ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Resetting…
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" />
                  Reset everything
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
