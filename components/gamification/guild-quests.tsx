"use client";

import * as React from "react";
import { Shield, Target, Zap, Check, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { toast } from "sonner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

const ACTIVE_QUESTS = [
  {
    id: "q1",
    title: "The Great Refactor",
    description: "Your guild must resolve 50 Code Smell challenges collectively.",
    progress: 35,
    target: 50,
    rewardXP: 1000,
    timeLeft: "2d 14h",
    participants: ["https://i.pravatar.cc/150?u=a", "https://i.pravatar.cc/150?u=b", "https://i.pravatar.cc/150?u=c"]
  },
  {
    id: "q2",
    title: "Algorithm Week",
    description: "Achieve an average execution time under O(N log N) on Sorting challenges.",
    progress: 12,
    target: 20,
    rewardXP: 500,
    timeLeft: "5d 02h",
    participants: ["https://i.pravatar.cc/150?u=d", "https://i.pravatar.cc/150?u=e"]
  }
];

export function GuildQuests() {
  const [contributed, setContributed] = React.useState<Set<string>>(new Set());
  const announce = useAnnounce();

  const handleContribute = (questId: string) => {
    setContributed(prev => {
      const next = new Set(prev);
      next.add(questId);
      return next;
    });
    announce("Contributed to guild quest!");
    toast.success("Contribution recorded! Your guild is one step closer.");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-display font-semibold flex items-center gap-2">
             <Shield className="size-5 text-primary" />
             Guild Quests
           </h2>
           <p className="text-sm text-muted-foreground mt-1">Co-op challenges. Work with your guild to unlock massive XP bonuses.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {ACTIVE_QUESTS.map((quest) => {
          const isContributed = contributed.has(quest.id);
          const percent = (quest.progress / quest.target) * 100;
          
          return (
            <Card key={quest.id} className="p-5 flex flex-col gap-4 border-2 transition-colors hover:border-primary/20">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{quest.title}</h3>
                    {isContributed && <Badge className="bg-success text-success-foreground hover:bg-success">Contributed</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed pr-4">{quest.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 bg-accent/50 p-2 rounded-lg">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reward</span>
                  <span className="flex items-center gap-1 font-display font-bold text-primary">
                    <Zap className="size-4" /> {quest.rewardXP} XP
                  </span>
                </div>
              </div>
              
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Target className="size-4" /> {quest.progress} / {quest.target} completed
                  </span>
                  <span className="flex items-center gap-1 text-warning">
                    <Clock className="size-4" /> {quest.timeLeft}
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {quest.participants.map((p, i) => (
                      <Avatar key={i} className="size-8 border-2 border-card">
                        <AvatarImage src={p} />
                      </Avatar>
                    ))}
                  </div>
                  <span className="ml-3 text-xs text-muted-foreground font-medium">Active Members</span>
                </div>
                
                <Button 
                  onClick={() => handleContribute(quest.id)} 
                  variant={isContributed ? "outline" : "default"}
                  disabled={isContributed}
                >
                  {isContributed ? <><Check className="size-4 mr-2" /> Done</> : "Contribute Now"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
