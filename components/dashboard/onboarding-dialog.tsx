"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Compass, Sparkles } from "lucide-react";

import { getProfile } from "@/lib/data/demo/profile";
import { saveProfileOverrides } from "@/lib/demo/profile";
import { DEMO_STORAGE_KEYS, readDemoStorage, writeDemoStorage } from "@/lib/demo/storage";
import type { ExperienceLevel } from "@/lib/contracts/profile";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GOALS = ["Build security tools", "Prepare for interviews", "Learn web development", "Master cloud systems"];

export function OnboardingDialog() {
  const { user } = useSession();
  const [dismissed, setDismissed] = React.useState(false);
  const [goal, setGoal] = React.useState(GOALS[0] ?? "Build security tools");
  const [level, setLevel] = React.useState<ExperienceLevel>("beginner");
  const profileQuery = useQuery({ queryKey: ["onboarding-profile", user?.id], queryFn: () => getProfile(user?.id ?? ""), enabled: Boolean(user) });

  const open = Boolean(user) && !dismissed && !readDemoStorage<boolean>(DEMO_STORAGE_KEYS.onboarding, false);

  const finish = (save: boolean) => {
    if (save && profileQuery.data && user) {
      saveProfileOverrides(user.id, { display_name: profileQuery.data.display_name, bio: profileQuery.data.bio, skill_tags: profileQuery.data.skill_tags, learning_goals: [goal], experience_level: level, weekly_goal_hours: profileQuery.data.weekly_goal_hours });
      toast.success("Your learning path is ready.");
    }
    writeDemoStorage(DEMO_STORAGE_KEYS.onboarding, true);
    setDismissed(true);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) finish(false); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></div>
          <DialogTitle>Choose your starting line</DialogTitle>
          <DialogDescription>Two quick choices help your dashboard surface a more useful next step. You can change them from your profile later.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <fieldset className="grid gap-2"><legend className="text-sm font-semibold">What are you working toward?</legend><div className="grid gap-2 sm:grid-cols-2">{GOALS.map((item) => <button key={item} type="button" onClick={() => setGoal(item)} className={`rounded-xl border px-3 py-3 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${goal === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent"}`} aria-pressed={goal === item}>{item}</button>)}</div></fieldset>
          <fieldset className="grid gap-2"><legend className="text-sm font-semibold">How much experience do you have?</legend><div className="grid gap-2 sm:grid-cols-3">{(["beginner", "intermediate", "advanced"] as ExperienceLevel[]).map((item) => <button key={item} type="button" onClick={() => setLevel(item)} className={`rounded-xl border px-3 py-3 text-sm capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${level === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent"}`} aria-pressed={level === item}>{item}</button>)}</div></fieldset>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => finish(false)}>Skip for now</Button><Button variant="gradient" onClick={() => finish(true)}><Compass className="size-4" /> Personalize dashboard</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
