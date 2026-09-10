"use client";

import * as React from "react";
import { Users, Star, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { toast } from "sonner";

const MOCK_MENTORS = [
  { id: "m1", name: "David Chen", rank: "Architect (L4)", rating: 4.9, tags: ["React", "System Design"], avatar: "https://i.pravatar.cc/150?u=12" },
  { id: "m2", name: "Sarah Taylor", rank: "Principal (L5)", rating: 5.0, tags: ["Cloud", "Go"], avatar: "https://i.pravatar.cc/150?u=24" }
];

export function MentorshipFlow() {
  const [step, setStep] = React.useState<"find" | "matching" | "matched" | "session" | "completed">("find");
  const [selectedMentor, setSelectedMentor] = React.useState<typeof MOCK_MENTORS[0] | null>(null);
  const announce = useAnnounce();

  const handleMatch = (mentor: typeof MOCK_MENTORS[0]) => {
    setSelectedMentor(mentor);
    setStep("matching");
    announce("Requesting mentorship session...");
    setTimeout(() => {
      setStep("matched");
      announce("Mentor accepted your request.");
      toast.success("Mentor accepted!");
    }, 1500);
  };

  const completeSession = () => {
    setStep("completed");
    announce("Session completed. You earned 250 XP!");
    toast.success("You earned 250 XP for completing a mentorship session!");
  };

  if (step === "completed") {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-success/5 border-success/20">
        <div className="rounded-full bg-success/20 p-4 text-success-strong">
          <CheckCircle2 className="size-10" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-success-strong">Session Complete!</h3>
          <p className="mt-2 text-muted-foreground">You and your mentor both earned 250 XP.</p>
        </div>
        <Button onClick={() => setStep("find")} variant="outline" className="mt-4">Find another mentor</Button>
      </Card>
    );
  }

  if (step === "matched" || step === "session") {
    return (
      <Card className="p-6 flex flex-col gap-6 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Avatar className="size-12">
            <AvatarImage src={selectedMentor?.avatar} />
            <AvatarFallback>{selectedMentor?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{selectedMentor?.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedMentor?.rank}</p>
          </div>
          <Badge className="bg-success text-success-foreground hover:bg-success">Active Session</Badge>
        </div>
        
        {step === "matched" ? (
          <div className="flex flex-col gap-4 items-center justify-center py-4">
             <MessageSquare className="size-12 text-primary/40 animate-pulse" />
             <p className="text-center text-sm font-medium">Your mentor is ready. Jump into the chat or video call.</p>
             <Button onClick={() => setStep("session")} className="w-full sm:w-auto">Start Session <ArrowRight className="size-4 ml-2"/></Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
             <div className="h-40 rounded-xl bg-surface-1 border border-border flex items-center justify-center text-muted-foreground">
               [Video / Chat Interface]
             </div>
             <Button onClick={completeSession} variant="default" className="w-full">End Session & Claim XP</Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-display font-semibold flex items-center gap-2">
             <Users className="size-5 text-primary" />
             Mentorship Hub
           </h2>
           <p className="text-sm text-muted-foreground mt-1">Get unblocked by pairing with a senior rank, or mentor others to earn massive XP.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MOCK_MENTORS.map((mentor) => (
          <Card key={mentor.id} className="p-5 flex flex-col justify-between">
            <div className="flex gap-4">
               <Avatar className="size-10 shrink-0">
                 <AvatarImage src={mentor.avatar} />
                 <AvatarFallback>{mentor.name.charAt(0)}</AvatarFallback>
               </Avatar>
               <div>
                  <h3 className="font-semibold">{mentor.name}</h3>
                  <p className="text-xs text-muted-foreground">{mentor.rank}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {mentor.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 h-4">{t}</Badge>)}
                  </div>
               </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
               <div className="flex items-center gap-1 text-sm font-medium">
                 <Star className="size-4 text-warning fill-warning" />
                 {mentor.rating}
               </div>
               <Button size="sm" onClick={() => handleMatch(mentor)} disabled={step === "matching"}>
                 {step === "matching" && selectedMentor?.id === mentor.id ? "Connecting..." : "Request Help"}
               </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
