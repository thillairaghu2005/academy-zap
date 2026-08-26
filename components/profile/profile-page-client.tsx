"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, BookOpen, Bookmark, FlaskConical, LoaderCircle, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

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
import { getInitials } from "@/lib/utils";

export function ProfilePageClient() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <motion.div 
          className="flex flex-col gap-6"
          initial={reducedMotion ? {} : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } } }}>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <motion.div 
                  className="relative size-16 overflow-hidden rounded-full border-2 border-transparent hover:border-dashed hover:border-ink transition-all duration-300 group cursor-default"
                  initial={false}
                >
                  <Avatar className="size-full">
                    {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                    <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
                  </Avatar>
                  {!reducedMotion && (
                    <motion.div 
                       className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 z-10"
                       animate={{ translateX: ["-100%", "200%"] }}
                       transition={{ duration: 0.8, delay: 0.5, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-h2">{profile.display_name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
                </div>
                 <EditProfileDialog
                   profile={profile}
                   onSaved={() => {
                     void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
                   }}
                 />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } } }}>
            <ProfileCompletion checklist={profile.checklist} />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } } }}>
            <Card>
              <CardHeader><CardTitle>Skill tags</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile.skill_tags.map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: reducedMotion ? 0 : index * 0.05, type: "spring", stiffness: 200, damping: 20 }}
                    whileHover={reducedMotion ? {} : { y: -2 }}
                    className="relative overflow-hidden rounded-md group"
                  >
                    <Badge variant="secondary" className="transition-colors group-hover:text-surface-inverse group-hover:bg-transparent relative z-10 pointer-events-none">{tag}</Badge>
                    <div className="absolute inset-0 bg-ink transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0 pointer-events-none" />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div 
          className="flex flex-col gap-4"
          initial={reducedMotion ? {} : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } } }}>
            <Card>
              <CardHeader><CardTitle>Learning preferences</CardTitle></CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <Info label="Learning path" value={profile.preferred_learning_path} />
                <Info label="Experience" value={profile.experience_level} />
                <Info label="Weekly goal" value={`${profile.weekly_goal_hours} hours`} />
                <div><p className="text-xs font-medium text-muted-foreground">Goals</p><div className="mt-2 flex flex-wrap gap-2">{profile.learning_goals.map((goal) => <Badge key={goal} variant="outline">{goal}</Badge>)}</div></div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } } }}>
            <OrderHistory />
          </motion.div>
          <ProfileEmptyItems profile={profile} savedCourseIds={savedCourseIds} bookmarkedLabIds={labBookmarkIds} />
        </motion.div>
      </div>
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const [displayedText, setDisplayedText] = React.useState("");
  const reducedMotion = useReducedMotion();
  React.useEffect(() => {
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayedText(value);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(value.slice(0, i + 1));
      i++;
      if (i >= value.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [value, reducedMotion]);
  return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm capitalize">{displayedText}</p></div>;
}

function LoadingAwareEmptyState({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SkeletonLines count={3} className="max-w-sm py-4 px-6" />;
  }
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>{children}</motion.div>;
}

function ProfileEmptyItems({
  profile,
  savedCourseIds,
  bookmarkedLabIds,
}: {
  profile: Awaited<ReturnType<typeof getProfile>>;
  savedCourseIds: string[];
  bookmarkedLabIds: string[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } } }}>
        <SavedCourses courseIds={savedCourseIds} />
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } } }}>
        <SavedLabs ids={bookmarkedLabIds} />
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } } }}>
        {profile.certificate_ids.length === 0 ? <LoadingAwareEmptyState><EmptyState icon={Award} title="No certificates yet" description="Finish a course to unlock your first completion certificate." primaryAction={<Button size="sm" variant="outline" className="transition-transform hover:-translate-y-0.5 hover:shadow-sm" asChild><Link href="/courses">Find a course</Link></Button>} /></LoadingAwareEmptyState> : null}
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 20 } } }}>
        {profile.achievement_ids.length === 0 ? <LoadingAwareEmptyState><EmptyState icon={Award} title="No achievements yet" description="Your first verified milestone will appear here after you start climbing." primaryAction={<Button size="sm" variant="outline" className="transition-transform hover:-translate-y-0.5 hover:shadow-sm" asChild><Link href="/rank">View the rank ladder</Link></Button>} /></LoadingAwareEmptyState> : null}
      </motion.div>
    </div>
  );
}

function SavedLabs({ ids }: { ids: string[] }) {
  return <Card><CardHeader><CardTitle>Bookmarked labs</CardTitle></CardHeader><CardContent>{ids.length === 0 ? <LoadingAwareEmptyState><EmptyState icon={FlaskConical} title="No bookmarked labs" description="Bookmark hands-on labs to keep your next practice session close." primaryAction={<Button size="sm" variant="outline" className="transition-transform hover:-translate-y-0.5 hover:shadow-sm" asChild><Link href="/labs">Explore labs</Link></Button>} className="border-0 bg-transparent px-0 py-8" /></LoadingAwareEmptyState> : <div className="flex flex-wrap gap-2">{ids.map((id) => <Link key={id} href={`/labs/${id}`} className="rounded-full border border-ink-muted/15 bg-surface-hover px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-surface-inverse">{id}</Link>)}</div>}</CardContent></Card>;
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
          <LoadingAwareEmptyState>
            <EmptyState
              icon={Bookmark}
              title="No saved courses"
              description="Save a course when you find a path worth returning to."
              primaryAction={<Button size="sm" className="transition-transform hover:-translate-y-0.5 hover:shadow-sm" asChild><Link href="/courses"><BookOpen /> Browse courses</Link></Button>}
              className="border-0 bg-transparent px-0 py-8"
            />
          </LoadingAwareEmptyState>
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
      className="rounded-2xl border border-border bg-surface-1 p-4 transition-all duration-300 hover:border-ink/30 hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring block"
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
        size="sm"
        className="transition-transform hover:-translate-y-0.5 hover:shadow-sm"
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
