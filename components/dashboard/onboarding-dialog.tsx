"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Clock3, Compass, GraduationCap, Sparkles, Users } from "lucide-react";

import { getProfile } from "@/lib/data/demo/profile";
import { saveProfileOverrides } from "@/lib/demo/profile";
import { DEMO_STORAGE_KEYS, readDemoStorage, writeDemoStorage } from "@/lib/demo/storage";
import type { ExperienceLevel } from "@/lib/contracts/profile";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["Choose your goal", "Set your level", "Choose your rhythm", "Your path is ready"];

type Role = "student" | "professional" | "team-admin";
type Draft = { goal: string; level: ExperienceLevel; weeklyHours: number; role: Role };

const GOALS = ["Build security tools", "Prepare for interviews", "Learn web development", "Master cloud systems"];
const ROLES: Array<{ value: Role; label: string; description: string; icon: typeof GraduationCap }> = [
  { value: "student", label: "Student", description: "Build a strong practical foundation.", icon: GraduationCap },
  { value: "professional", label: "Professional", description: "Sharpen skills for the work ahead.", icon: BriefcaseBusiness },
  { value: "team-admin", label: "Team admin", description: "Create a shared practice rhythm.", icon: Users },
];
const HOURS = [2, 5, 8, 12];

export function OnboardingDialog() {
  const { user } = useSession();
  const [step, setStep] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>({ goal: GOALS[0] ?? "Build security tools", level: "beginner", weeklyHours: 5, role: "student" });
  const profileQuery = useQuery({ queryKey: ["onboarding-profile", user?.id], queryFn: () => getProfile(user?.id ?? ""), enabled: Boolean(user) });

  React.useEffect(() => {
    const saved = readDemoStorage<Partial<Draft>>(DEMO_STORAGE_KEYS.onboardingDraft, {});
    React.startTransition(() => {
      setDraft((current) => ({ ...current, ...saved }));
      setHydrated(true);
    });
  }, []);

  const open = Boolean(user) && hydrated && !dismissed && !readDemoStorage<boolean>(DEMO_STORAGE_KEYS.onboarding, false);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    writeDemoStorage(DEMO_STORAGE_KEYS.onboardingDraft, next);
  };

  const finish = (save: boolean) => {
    if (save && profileQuery.data && user) {
      saveProfileOverrides(user.id, { display_name: profileQuery.data.display_name, bio: profileQuery.data.bio, skill_tags: profileQuery.data.skill_tags, learning_goals: [draft.goal], experience_level: draft.level, weekly_goal_hours: draft.weeklyHours });
      toast.success("Your learning path is ready.", { description: `${draft.weeklyHours} hours per week focused on ${draft.goal.toLowerCase()}.` });
    }
    writeDemoStorage(DEMO_STORAGE_KEYS.onboarding, true);
    setDismissed(true);
  };

  const next = () => setStep((current) => Math.min(3, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) finish(false); }}><DialogContent className="sm:max-w-xl"><DialogHeader><div className="mb-1 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span><div><DialogTitle>{STEP_TITLES[step]}</DialogTitle><DialogDescription className="mt-1">A few choices make the dashboard more useful from day one.</DialogDescription></div></div><div className="mt-3"><div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground"><span>Step {step + 1} of 4</span><span>{Math.round(((step + 1) / 4) * 100)}%</span></div><Progress value={((step + 1) / 4) * 100} className="h-1.5" /></div></DialogHeader>
    <div className="min-h-52 py-2">
      {step === 0 ? <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">What would make the next month feel useful?</legend>{GOALS.map((goal) => <button key={goal} type="button" onClick={() => update("goal", goal)} aria-pressed={draft.goal === goal} className={cn("flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", draft.goal === goal ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border hover:bg-primary/5")}>{goal}{draft.goal === goal ? <Check className="size-4" /> : null}</button>)}</fieldset> : null}
      {step === 1 ? <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">Where are you starting?</legend>{(["beginner", "intermediate", "advanced"] as ExperienceLevel[]).map((level) => <button key={level} type="button" onClick={() => update("level", level)} aria-pressed={draft.level === level} className={cn("rounded-xl border px-4 py-4 text-left capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", draft.level === level ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-primary/5")}><span className="font-semibold">{level}</span><span className="mt-1 block text-xs text-muted-foreground">{level === "beginner" ? "I am building the fundamentals." : level === "intermediate" ? "I know the basics and want depth." : "I want advanced patterns and challenge."}</span></button>)}</fieldset> : null}
      {step === 2 ? <fieldset className="grid gap-4"><legend className="text-sm font-semibold">How much time can you protect each week?</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{HOURS.map((hours) => <button key={hours} type="button" onClick={() => update("weeklyHours", hours)} aria-pressed={draft.weeklyHours === hours} className={cn("grid place-items-center rounded-xl border px-3 py-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", draft.weeklyHours === hours ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-primary/5")}><Clock3 className="mb-2 size-5" /><span className="font-semibold">{hours}h</span><span className="mt-1 text-[11px] text-muted-foreground">per week</span></button>)}</div><div className="grid gap-2"><p className="text-sm font-semibold">What is your role?</p>{ROLES.map((role) => { const Icon = role.icon; return <button key={role.value} type="button" onClick={() => update("role", role.value)} aria-pressed={draft.role === role.value} className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", draft.role === role.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-primary/5")}><Icon className="size-4" /><span><span className="block text-sm font-semibold">{role.label}</span><span className="block text-xs text-muted-foreground">{role.description}</span></span></button>; })}</div></fieldset> : null}
      {step === 3 ? <div className="grid gap-5"><div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your recommended path</p><h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">{draft.goal}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">A {draft.level} path for a {ROLES.find((role) => role.value === draft.role)?.label.toLowerCase()} with {draft.weeklyHours} focused hours each week.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border p-3"><Compass className="size-4 text-primary" /><p className="mt-3 text-sm font-semibold">Learn</p><p className="mt-1 text-xs text-muted-foreground">A focused lesson shelf</p></div><div className="rounded-xl border border-border p-3"><Check className="size-4 text-success" /><p className="mt-3 text-sm font-semibold">Practice</p><p className="mt-1 text-xs text-muted-foreground">Judge and lab prompts</p></div><div className="rounded-xl border border-border p-3"><Sparkles className="size-4 text-primary" /><p className="mt-3 text-sm font-semibold">Climb</p><p className="mt-1 text-xs text-muted-foreground">XP, streak, and rank</p></div></div></div> : null}
    </div>
    <DialogFooter className="flex-row justify-between sm:justify-between"><Button variant="ghost" onClick={() => finish(false)}>Skip</Button><div className="flex gap-2">{step > 0 ? <Button variant="outline" onClick={back}><ArrowLeft /> Back</Button> : null}{step < 3 ? <Button onClick={next}>Continue <ArrowRight /></Button> : <Button onClick={() => finish(true)}><Sparkles /> Build my path</Button>}</div></DialogFooter>
  </DialogContent></Dialog>;
}
