import Link from "next/link";
import { BadgeCheck, Clock3, ShieldCheck, Users } from "lucide-react";

import type { TrustSignalKind } from "@/lib/contracts/trust";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS: Record<TrustSignalKind, typeof BadgeCheck> = {
  verified: BadgeCheck,
  security: ShieldCheck,
  freshness: Clock3,
  community: Users,
};

export function TrustBadge({ kind = "verified", label, detail, href, className }: { kind?: TrustSignalKind; label: string; detail?: string; href?: string; className?: string }) {
  const Icon = ICONS[kind];
  const content = <><Icon className="size-3.5" />{label}</>;
  return href ? (
    <Link href={href} className={cn("inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} title={detail}>
      <Badge variant="outline" className="border-success/40 bg-success/5 text-success-strong">{content}</Badge>
    </Link>
  ) : <Badge variant="outline" className={cn("border-success/40 bg-success/5 text-success-strong", className)} title={detail}>{content}</Badge>;
}
