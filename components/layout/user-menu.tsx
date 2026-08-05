"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChartColumn,
  ChevronDown,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/components/providers/session-provider";
import { getInitials } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useSession();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.display_name} />
            ) : (
              <AvatarFallback className="text-[10px]">
                {getInitials(user.display_name)}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="hidden text-sm font-medium text-foreground sm:block">
            {user.display_name.split(" ")[0] ?? user.display_name}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{user.display_name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/rank">
            <Trophy />
            Rank ladder
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/leaderboards">
            <ChartColumn />
            Leaderboards
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/guilds">
            <Users />
            Guilds
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/support">
            <LifeBuoy />
            Support
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck />
                Admin console
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
