"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

export function XpFlyout() {
  const [events, setEvents] = React.useState<Array<{ id: string; amount: number }>>([]);

  React.useEffect(() => {
    const onXp = (event: Event) => {
      const amount = (event as CustomEvent<{ amount?: number }>).detail?.amount ?? 25;
      const id = `${Date.now()}-${Math.random()}`;
      setEvents((current) => [...current, { id, amount }]);
      window.setTimeout(() => setEvents((current) => current.filter((item) => item.id !== id)), 1500);
    };
    window.addEventListener("zapsters:xp-earned", onXp);
    return () => window.removeEventListener("zapsters:xp-earned", onXp);
  }, []);

  return <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2" aria-live="polite">{events.map((event) => <div key={event.id} className="flex animate-fade-up items-center gap-2 rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-md"><Sparkles className="size-4" />+{event.amount} XP</div>)}</div>;
}
