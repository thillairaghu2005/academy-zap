"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, BookOpen, Bookmark, FlaskConical, LoaderCircle, UserRound, Sparkles, Trophy, Medal } from "lucide-react";

import type { ExperienceLevel, Profile, ProfileEditorValues } from "@/lib/contracts/profile";
import type { CourseSummary } from "@/lib/contracts/content";
import { getProfile } from "@/lib/data/demo/profile";
import { searchCatalog } from "@/lib/data/demo/content";
import { normalizeProfileEditorValues, saveProfileOverrides } from "@/lib/demo/profile";
import { listBookmarkedCourseIds } from "@/lib/demo/course-notes";
import { listBookmarkedLabIds } from "@/lib/demo/lab-bookmarks";
import { subscribeDemoStorage } from "@/lib/demo/storage";
import { useSession } from "@/components/providers/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";
import { ProfileCompletion } from "@/components/profile/profile-completion";
import { OrderHistory } from "@/components/commerce/order-history";
import { cn, getInitials } from "@/lib/utils";

export function ProfilePageClient() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [bookmarkIds, setBookmarkIds] = React.useState<string[] | null>(null);
  const [labBookmarkIds, setLabBookmarkIds] = React.useState<string[]>([]);
  const profileQuery = useQuery({
    queryKey: ["profile", user?.id ?? "anonymous"],
    queryFn: () => getProfile(user?.id ?? ""),
    enabled: Boolean(user),
    retry: false,
  });

  React.useEffect(() => {
    const syncBookmarks = () => setBookmarkIds(listBookmarkedCourseIds());
    const syncLabs = () => setLabBookmarkIds(listBookmarkedLabIds());
    syncBookmarks();
    syncLabs();
    return subscribeDemoStorage(() => { syncBookmarks(); syncLabs(); });
  }, []);

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
  const savedCourseIds = bookmarkIds ?? profile.saved_course_ids;
  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Your learning identity</p>
        <h1 className="font-display text-h1">Profile</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Tune the signals that shape your recommendations and show the community what you are working toward.</p>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-4">
          {/* Profile Card */}
          <Card className="flex flex-col">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Avatar className="size-24 border-4 border-background shadow-md">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                <AvatarFallback className="text-xl">{getInitials(profile.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-h2 leading-tight">{profile.display_name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              </div>
              <div className="w-full mt-2">
                 <EditProfileDialog
                   profile={profile}
                   onSaved={() => {
                     void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
                   }}
                 />
              </div>
            </CardContent>
          </Card>

          {/* Learning Preferences */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3"><CardTitle>Learning preferences</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Info label="Learning path" value={profile.preferred_learning_path} />
              <Info label="Experience" value={profile.experience_level} />
              <Info label="Weekly goal" value={`${profile.weekly_goal_hours} hours`} />
            </CardContent>
          </Card>

          {/* Skill Tags */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3"><CardTitle>Skill tags & Goals</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap content-start gap-2">
              {profile.skill_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              {profile.learning_goals.map((goal) => <Badge key={goal} variant="outline">{goal}</Badge>)}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Profile Completion */}
          <div className="w-full">
            <ProfileCompletion checklist={profile.checklist} />
          </div>

          {/* Gamified Badges Area */}
          <div className="w-full">
            <GamifiedBadges achievements={profile.achievement_ids} certificates={profile.certificate_ids} />
          </div>

          {/* History and Saved items */}
          <div className="w-full">
            <ActivityTabs savedCourseIds={savedCourseIds} labBookmarkIds={labBookmarkIds} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function ActivityTabs({ savedCourseIds, labBookmarkIds }: { savedCourseIds: string[], labBookmarkIds: string[] }) {
  const [activeTab, setActiveTab] = React.useState<"saved" | "orders">("saved");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 border-b border-border/50 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab("saved")}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap",
            activeTab === "saved" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Saved Learning
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap",
            activeTab === "orders" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Order History
        </button>
      </div>

      <div className="pt-2">
        {activeTab === "saved" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <SavedCourses courseIds={savedCourseIds} />
            <SavedLabs ids={labBookmarkIds} />
          </div>
        )}
        {activeTab === "orders" && (
          <div className="max-w-4xl">
            <OrderHistory />
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 font-medium capitalize">{value}</p></div>;
}

function GamifiedBadges({ achievements, certificates }: { achievements: string[], certificates: string[] }) {
  const hasAchievements = achievements.length > 0;
  const hasCertificates = certificates.length > 0;

  if (!hasAchievements && !hasCertificates) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <EmptyState icon={Award} title="No certificates yet" description="Finish a course to unlock your first completion certificate." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/courses">Find a course</Link></Button>} />
        <EmptyState icon={Trophy} title="No achievements yet" description="Your first verified milestone will appear here after you start climbing." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/rank">View the rank ladder</Link></Button>} />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 shadow-inner">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-purple-500" />
          <span>Trophies & Badges</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {certificates.map((cert) => (
            <div key={cert} className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-black/40">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg">
                <Medal className="size-7" />
              </div>
              <p className="relative text-center text-xs font-semibold capitalize text-foreground">{cert.replace(/-/g, " ")}</p>
            </div>
          ))}
          {achievements.map((ach) => (
            <div key={ach} className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-black/40">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-500/20 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Trophy className="size-7" />
              </div>
              <p className="relative text-center text-xs font-semibold capitalize text-foreground">{ach.replace(/-/g, " ")}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SavedLabs({ ids }: { ids: string[] }) {
  return <Card><CardHeader><CardTitle>Bookmarked labs</CardTitle></CardHeader><CardContent>{ids.length === 0 ? <EmptyState icon={FlaskConical} title="No bookmarked labs" description="Bookmark hands-on labs to keep your next practice session close." primaryAction={<Button size="sm" variant="outline" asChild><Link href="/labs">Explore labs</Link></Button>} className="border-0 bg-transparent px-0 py-8" /> : <div className="flex flex-wrap gap-2">{ids.map((id) => <Link key={id} href={`/labs/${id}`} className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">{id}</Link>)}</div>}</CardContent></Card>;
}

function SavedCourses({ courseIds }: { courseIds: string[] }) {
  const coursesQuery = useQuery({
    queryKey: ["saved-courses", courseIds],
    queryFn: () => searchCatalog({ page: 1, pageSize: 100, sort: "popular" }),
    enabled: courseIds.length > 0,
  });

   const courseIdSet = new Set(courseIds);
   const courses = coursesQuery.data?.hits.filter((course) => courseIdSet.has(course.id)) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle>Saved courses</CardTitle></CardHeader>
      <CardContent>
        {courseIds.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No saved courses"
            description="Save a course when you find a path worth returning to."
            primaryAction={<Button size="sm" asChild><Link href="/courses"><BookOpen /> Browse courses</Link></Button>}
            className="border-0 bg-transparent px-0 py-8"
          />
        ) : coursesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading saved courses...
          </div>
        ) : coursesQuery.isError ? (
          <p className="py-4 text-sm text-muted-foreground">Saved courses are temporarily unavailable.</p>
        ) : courses.length > 0 ? (
          <div className="grid gap-3">
            {courses.map((course) => <SavedCourseRow key={course.id} course={course} />)}
          </div>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">These saved courses are no longer available.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SavedCourseRow({ course }: { course: CourseSummary }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="rounded-2xl border border-border bg-surface-1 p-4 transition-colors hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold leading-tight">{course.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
        </div>
        <Badge variant="outline" className="shrink-0">{course.level}</Badge>
      </div>
    </Link>
  );
}

interface ProfileFormState {
  display_name: string;
  bio: string;
  skill_tags: string;
  learning_goals: string;
  experience_level: ExperienceLevel;
  weekly_goal_hours: string;
}

function profileToFormState(profile: Profile): ProfileFormState {
  return {
    display_name: profile.display_name,
    bio: profile.bio,
    skill_tags: profile.skill_tags.join(", "),
    learning_goals: profile.learning_goals.join(", "),
    experience_level: profile.experience_level,
    weekly_goal_hours: String(profile.weekly_goal_hours),
  };
}

function splitFormList(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function EditProfileDialog({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<ProfileFormState>(() => profileToFormState(profile));

  const updateField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.display_name.trim()) {
      toast.error("Display name is required.");
      return;
    }

    const weeklyGoal = Number(form.weekly_goal_hours);
    if (!Number.isFinite(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > 40) {
      toast.error("Weekly goal must be between 1 and 40 hours.");
      return;
    }

    const values = normalizeProfileEditorValues({
      display_name: form.display_name,
      bio: form.bio,
      skill_tags: splitFormList(form.skill_tags),
      learning_goals: splitFormList(form.learning_goals),
      experience_level: form.experience_level,
      weekly_goal_hours: weeklyGoal,
    } satisfies ProfileEditorValues);
    saveProfileOverrides(profile.user_id, values);
    onSaved();
    setOpen(false);
    toast.success("Profile updated.");
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full font-medium"
        onClick={() => {
          setForm(profileToFormState(profile));
          setOpen(true);
        }}
      >
        Edit profile
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the details that shape your learning identity.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input id="profile-display-name" value={form.display_name} onChange={(event) => updateField("display_name", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea id="profile-bio" value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-skills">Skill tags</Label>
              <Input id="profile-skills" value={form.skill_tags} onChange={(event) => updateField("skill_tags", event.target.value)} placeholder="Python, Linux, TypeScript" />
              <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-goals">Learning goals</Label>
              <Textarea id="profile-goals" value={form.learning_goals} onChange={(event) => updateField("learning_goals", event.target.value)} rows={3} placeholder="Build security tools, prepare for interviews" />
              <p className="text-xs text-muted-foreground">Separate goals with commas.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-experience">Experience level</Label>
                <select id="profile-experience" value={form.experience_level} onChange={(event) => updateField("experience_level", event.target.value as ExperienceLevel)} className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-weekly-goal">Weekly goal (hours)</Label>
                <Input id="profile-weekly-goal" type="number" min={1} max={40} step={1} value={form.weekly_goal_hours} onChange={(event) => updateField("weekly_goal_hours", event.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="gradient">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
