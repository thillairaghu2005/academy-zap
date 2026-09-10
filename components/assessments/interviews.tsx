"use client";

import { m as motion, useReducedMotion } from "framer-motion";
import { CalendarClock, Users, Database, Code, MessageSquare, Video, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Badge } from "@/components/ui/badge";

const MOCK_INTERVIEWS = [
  {
    id: "int-1",
    type: "Data Structures & Algorithms",
    description: "45-minute live coding session. Focus on problem-solving, code quality, and communication.",
    icon: Code,
    duration: "45 min",
    format: "Video + Code Editor",
    availability: "Next available: Today, 3:00 PM",
  },
  {
    id: "int-2",
    type: "System Design",
    description: "60-minute architecture discussion. Focus on scalability, trade-offs, and component design.",
    icon: Database,
    duration: "60 min",
    format: "Video + Whiteboard",
    availability: "Next available: Tomorrow, 10:00 AM",
  },
  {
    id: "int-3",
    type: "Behavioral & Leadership",
    description: "30-minute culture fit and past experience discussion. Focus on STAR method responses.",
    icon: MessageSquare,
    duration: "30 min",
    format: "Video only",
    availability: "Next available: Thursday, 1:00 PM",
  }
];

export function Interviews() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <div className="mb-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            <Users className="size-3.5" />
            1-on-1 Sessions
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Mock Interviews
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Prepare for the real thing with peer-to-peer and mentor-led mock interviews. Get actionable feedback on your technical and communication skills.
        </p>
      </div>

      <div className="mb-12 rounded-2xl border border-border bg-surface-1 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Upcoming Scheduled Interview</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground font-medium"><CalendarClock className="size-4" /> Tomorrow, 2:00 PM EST</span>
            <span className="hidden sm:inline text-border">•</span>
            <span>System Design with Senior Engineer</span>
          </div>
        </div>
        <div className="relative z-10 shrink-0 w-full md:w-auto flex gap-3">
          <Button variant="outline" className="flex-1 md:flex-none">Reschedule</Button>
          <Button className="flex-1 md:flex-none gap-2">
            <Video className="size-4" />
            Join Room
          </Button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-6">Schedule a New Session</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_INTERVIEWS.map((interview, idx) => {
          const Icon = interview.icon;
          return (
            <motion.div
              key={interview.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.4, delay: idx * 0.1 }}
              className="h-full"
            >
              <Card className="h-full flex flex-col transition-[border-color,box-shadow,transform] hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary mb-4">
                    <Icon className="size-5 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{interview.type}</CardTitle>
                  <CardDescription>{interview.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Clock className="size-4" /> Duration</span>
                      <span className="font-medium">{interview.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Video className="size-4" /> Format</span>
                      <span className="font-medium">{interview.format}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex-col items-stretch gap-3 border-t border-border mt-auto pt-4">
                  <p className="text-xs text-muted-foreground text-center font-medium">
                    {interview.availability}
                  </p>
                  <Button variant="default" className="w-full gap-2 group/btn">
                    Find a Partner
                    <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </PageContainer>
  );
}
