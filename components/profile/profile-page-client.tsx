"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Award, Bookmark, FlaskConical, UserRound } from "lucide-react";

import { getProfile } from "@/lib/api/profile";
import { useSession } from "@/components/providers/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { getInitials } from "@/lib/utils";

export function ProfilePageClient() {
  const { user } = useSession();
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id ?? "anonymous"],
    queryFn: () => getProfile(user?.id ?? ""),
    enabled: Boolean(user),
    retry: false,
  });

  if (!user) {
    return (
      <PageContainer narrow>
        <EmptyState
          icon={UserRound}
          title="Sign in to build your profile"
          description="Your learning goals, skill signals, and completion checklist live here."
          primaryAction={<Button variant="gradient" asChild><Link href="/login">Sign in</Link></Button>}
          secondaryAction={<Button variant="outline" asChild><Link href="/register">Create account</Link></Button>}
        />
      </PageContainer>
    );
  }

  if (profileQuery.isLoading) {
    return <PageContainer><SkeletonLines count={5} className="max-w-2xl" /></PageContainer>;
  }
  if (profileQuery.isError || !profileQuery.data) {
    return <PageContainer><ErrorState title="Profile unavailable" message="Your profile could not be loaded." onRetry={() => profileQuery.refetch()} /></PageContainer>;
  }

  const profile = profileQuery.data;
  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Your learning identity</p>
        <h1 className="font-display text-h1">Profile</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Tune the signals that shape your recommendations and show the community what you are working toward.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <Avatar className="size-16">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-h2">{profile.display_name}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              </div>
              <Button variant="outline" size="sm" disabled>Edit profile</Button>
            </CardContent>
          </Card>
          <ProfileCompletion checklist={profile.checklist} />
          <Card>
            <CardHeader><CardTitle>Skill tags</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {profile.skill_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Learning preferences</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Info label="Learning path" value={profile.preferred_learning_path} />
              <Info label="Experience" value={profile.experience_level} />
              <Info label="Weekly goal" value={`${profile.weekly_goal_hours} hours`} />
              <div><p className="text-xs font-medium text-muted-foreground">Goals</p><div className="mt-2 flex flex-wrap gap-2">{profile.learning_goals.map((goal) => <Badge key={goal} variant="outline">{goal}</Badge>)}</div></div>
            </CardContent>
          </Card>
          <ProfileEmptyItems profile={profile} />
        </div>
      </div>
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 font-medium capitalize">{value}</p></div>;
}

function ProfileEmptyItems({ profile }: { profile: Awaited<ReturnType<typeof getProfile>> }) {
  return (
    <div className="flex flex-col gap-4">
      <EmptyState icon={Bookmark} title="No saved courses" description="Save a course when you find a path worth returning to." primaryAction={<Button size="sm" asChild><Link href="/courses"><BookOpen /> Browse courses</Link></Button>} />
      <EmptyState icon={FlaskConical} title="No bookmarked labs" description="Bookmark hands-on labs to keep your next practice session close." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/labs">Explore labs</Link></Button>} />
      {profile.certificate_ids.length === 0 ? <EmptyState icon={Award} title="No certificates yet" description="Finish a course to unlock your first completion certificate." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/courses">Find a course</Link></Button>} /> : null}
      {profile.achievement_ids.length === 0 ? <EmptyState icon={Award} title="No achievements yet" description="Your first verified milestone will appear here after you start climbing." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/rank">View the rank ladder</Link></Button>} /> : null}
    </div>
  );
}
