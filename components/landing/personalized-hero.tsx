"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { m as motion, useReducedMotion } from "framer-motion";

import { listMyLearning } from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import heroImage2 from "@/src/assets/images/hero_2.png";

function PersonalizedHeroSkeleton() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-5 h-14 w-full max-w-lg" />
          <Skeleton className="mt-3 h-14 w-4/5 max-w-md" />
          <Skeleton className="mt-6 h-5 w-full max-w-lg" />
          <Skeleton className="mt-2 h-5 w-3/4 max-w-md" />
        </div>
        <div className="flex items-end justify-center lg:justify-end">
          <Skeleton className="h-[420px] w-full max-w-[540px] rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

export function PersonalizedHero() {
  const { user, isLoading: sessionLoading } = useSession();
  const userId = user?.id ?? "";
  const learningQuery = useQuery({ queryKey: ["my-learning", userId], queryFn: () => listMyLearning(userId), enabled: Boolean(userId) });
  const resumeItem = learningQuery.data?.find((item) => item.enrollment.last_lesson_id !== null);
  const reducedMotion = useReducedMotion() ?? false;

  if (sessionLoading) return <PersonalizedHeroSkeleton />;
  if (!user) return null;

  const resumeHref = resumeItem ? `/courses/${resumeItem.course.id}/learn` : "/courses";

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-2xl motion-safe:animate-fade-up">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">Welcome back, {user.display_name.split(" ")[0]}</p>
          <h1
            className="mt-5 max-w-xl text-hero text-foreground"
            style={{ fontFamily: "'Geist Variable', sans-serif", fontWeight: 100, letterSpacing: "-0.03em" }}
          >
            Resume your active<br />
            <span>lab session.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">Dive back into your isolated environment, solve the challenge, and add verifiable skills to your record.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="default" size="lg" asChild><Link href={resumeHref}>{resumeItem ? "Resume lesson" : "Browse courses"}</Link></Button>
            <Button variant="outline" size="lg" asChild><Link href="/judge">Open the Judge</Link></Button>
          </div>
        </div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.99, x: 32, y: 16 }}
          animate={reducedMotion ? undefined : { opacity: 1, scale: 1.2, x: 0, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-center lg:justify-end"
        >
          <Image
            src={heroImage2}
            alt="A student sitting at a desk, focused on a laptop surrounded by books, plants, and study accessories"
            priority
            quality={90}
            className="w-full max-w-[420px] object-contain sm:max-w-[500px] lg:max-w-full"
            style={{ maxHeight: "520px" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
