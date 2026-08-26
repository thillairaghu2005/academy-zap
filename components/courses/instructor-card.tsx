"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock3, Languages, MessageCircle, ShieldCheck, Star, Users } from "lucide-react";

import type { InstructorProfile } from "@/lib/contracts/instructor";
import { getInstructor } from "@/lib/data/demo/instructors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonLines } from "@/components/shared/skeletons";
import { getInitials } from "@/lib/utils";

export function InstructorCard({ instructorId, initialInstructor }: { instructorId: string; initialInstructor?: InstructorProfile }) {
  const query = useQuery({ queryKey: ["instructor", instructorId], queryFn: () => getInstructor(instructorId), enabled: !initialInstructor, retry: false });
  const instructor = initialInstructor ?? query.data;

  if (query.isLoading && !instructor) return <Card><CardContent className="p-5"><SkeletonLines count={5} /></CardContent></Card>;
  if (!instructor) return null;

  return (
    <Card id="instructor-profile" className="overflow-hidden">
      <CardHeader className="border-b border-border bg-secondary/20">
        <div className="flex items-start gap-3">
          <Avatar className="size-12"><AvatarFallback>{getInitials(instructor.name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">{instructor.name}{instructor.verified ? <Badge variant="success" className="text-caption"><ShieldCheck className="size-3" /> Verified Mentor</Badge> : null}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{instructor.role} · {instructor.company}</p>
            <p className="mt-1 text-xs text-muted-foreground">{instructor.years_experience} years experience</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{instructor.bio}</p>
        <div className="flex flex-wrap gap-1.5">{instructor.skill_tags.map((tag) => <Badge key={tag} variant="outline" className="text-caption">{tag}</Badge>)}</div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {instructor.students_taught.toLocaleString()} students</span>
          <span className="flex items-center gap-1.5"><Star className="size-3.5 fill-amber-400 text-warning-strong" /> {instructor.average_rating.toFixed(1)} average</span>
          <span className="flex items-center gap-1.5"><Languages className="size-3.5" /> {instructor.languages.join(", ")}</span>
          <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {instructor.response_time}</span>
        </div>
        <p className="text-xs text-muted-foreground">Office hours: <span className="font-medium text-foreground">{instructor.office_hours}</span></p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button size="sm" asChild><Link href={`/support/new?mentor=${encodeURIComponent(instructor.name)}`}><MessageCircle /> Ask Instructor</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href={`/mentors/${instructor.id}`}>View Profile</Link></Button>
          <Button size="sm" variant="outline" asChild><Link href={`/courses?q=${encodeURIComponent(instructor.name)}`}>More Courses</Link></Button>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground"><span>{instructor.courses_taught} courses taught</span></div>
      </CardContent>
    </Card>
  );
}
