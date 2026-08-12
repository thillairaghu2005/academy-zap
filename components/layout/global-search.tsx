"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ClipboardList,
  CodeXml,
  CheckCircle2,
  LayoutDashboard,
  FlaskConical,
  LoaderCircle,
  MessageCircle,
  PlayCircle,
  Search,
  Settings,
  Trophy,
  UserRound,
} from "lucide-react";

import type { UnifiedSearchHit } from "@/lib/contracts/search";
import { searchAll } from "@/lib/data/demo/search";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  course: BookOpen,
  problem: CodeXml,
  lab: FlaskConical,
  assessment: ClipboardList,
  mentor: UserRound,
} as const;

function SearchResult({
  hit,
  onSelect,
}: {
  hit: UnifiedSearchHit;
  onSelect: () => void;
}) {
  const Icon = KIND_ICON[hit.kind];

  return (
    <CommandItem
      value={`${hit.title} ${hit.meta}`}
      onSelect={onSelect}
      className="group"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{hit.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {hit.meta}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100" />
    </CommandItem>
  );
}

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 220);

  React.useEffect(() => {
    const openSearch = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("zapsters:open-search", openSearch);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("zapsters:open-search", openSearch);
    };
  }, []);

  const search = useQuery({
    queryKey: ["unified-search", debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: open,
    retry: false,
  });

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const selectResult = (href: string) => {
    close();
    router.push(href);
  };

  const runAction = (action: "tutor" | "complete") => {
    close();
    if (action === "tutor") window.dispatchEvent(new CustomEvent("zapsters:open-tutor"));
    if (action === "complete") window.dispatchEvent(new CustomEvent("zapsters:mark-lesson-complete"));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn("text-muted-foreground", className)}
        onClick={() => setOpen(true)}
        aria-label="Search courses, problems, labs, assessments, and mentors"
      >
        <Search />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-1 hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K / Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}>
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search courses, coding problems, labs, assessments, and mentors..."
        />
        <CommandList>
          {!query.trim() && !search.isLoading ? (
            <CommandGroup heading="Quick actions">
               <CommandItem value="Continue learning resume course" onSelect={() => selectResult("/dashboard#next-move")}><PlayCircle className="size-4 text-primary" /> Resume course <CommandShortcut>Continue</CommandShortcut></CommandItem>
               <CommandItem value="Start a lab" onSelect={() => selectResult("/labs")}><FlaskConical className="size-4 text-primary" /> Start a lab <CommandShortcut>Open</CommandShortcut></CommandItem>
               <CommandItem value="Saved items" onSelect={() => selectResult("/saved")}><Bookmark className="size-4 text-primary" /> Open saved items <CommandShortcut>Open</CommandShortcut></CommandItem>
               <CommandItem value="View rank" onSelect={() => selectResult("/rank")}><Trophy className="size-4 text-primary" /> View rank <CommandShortcut>Open</CommandShortcut></CommandItem>
               <CommandItem value="Dashboard" onSelect={() => selectResult("/dashboard")}><LayoutDashboard className="size-4 text-primary" /> Dashboard <CommandShortcut>Open</CommandShortcut></CommandItem>
              <CommandItem value="Settings profile" onSelect={() => selectResult("/profile")}><Settings className="size-4 text-primary" /> Profile & settings <CommandShortcut>Open</CommandShortcut></CommandItem>
              <CommandItem value="AI Tutor" onSelect={() => runAction("tutor")}><MessageCircle className="size-4 text-primary" /> Ask AI Tutor <CommandShortcut>Open</CommandShortcut></CommandItem>
              <CommandItem value="Mark lesson complete" onSelect={() => runAction("complete")}><CheckCircle2 className="size-4 text-primary" /> Mark current lesson complete <CommandShortcut>Action</CommandShortcut></CommandItem>
            </CommandGroup>
          ) : search.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Searching...
            </div>
          ) : search.isError ? (
            <div className="px-3 py-12 text-center" role="alert">
              <p className="text-sm font-medium">Search unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The unified search service is not responding.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void search.refetch()}>
                Try again
              </Button>
            </div>
          ) : search.data?.hits.length ? (
            <CommandGroup heading="Results">
              {search.data.hits.map((hit) => (
                <SearchResult
                  key={`${hit.kind}-${hit.id}`}
                  hit={hit}
                  onSelect={() => selectResult(hit.href)}
                />
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>
              <p>No matches found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a course topic, problem title, lab skill, assessment, or mentor.
              </p>
            </CommandEmpty>
          )}
        </CommandList>
        <CommandSeparator />
        <div className="flex items-center justify-between bg-muted/40 px-5 py-3 text-caption text-muted-foreground">
          <span>Search across courses, problems, labs, assessments, and mentors</span>
          <span className="font-mono">
            {search.data?.estimatedTotalHits ?? 0} results
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
