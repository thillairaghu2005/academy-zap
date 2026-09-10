"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Unlock, LoaderCircle, Zap } from "lucide-react";
import { requestHint } from "@/lib/data/demo/lab";
import { useSession } from "@/components/providers/session-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HintsPanel({ sessionId, hintsUsed }: { sessionId: string; hintsUsed: number }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [hint, setHint] = React.useState<string | null>(null);

  const hintMutation = useMutation({
    mutationFn: () => requestHint(sessionId, user?.id ?? "demo-user"),
    onSuccess: (newHint) => {
      setHint(newHint);
      void queryClient.invalidateQueries({ queryKey: ["lab-session", sessionId] });
    },
  });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-small font-semibold">
          <Lightbulb className="size-4 text-muted-foreground" />
          Hints
        </h2>
        <span className="text-xs text-muted-foreground">{hintsUsed} used</span>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        {hint ? (
          <div className="text-sm">
            <span className="font-semibold text-primary">Hint {hintsUsed}: </span>
            <span className="text-muted-foreground">{hint}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center">
            Stuck? Unlock a hint.
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => hintMutation.mutate()} 
          disabled={hintMutation.isPending}
          className="w-full mt-1"
        >
          {hintMutation.isPending ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          ) : (
            <Unlock className="mr-2 size-4" />
          )}
          Unlock Next Hint (-50 XP)
        </Button>
      </div>
    </Card>
  );
}
