"use client";

import * as React from "react";
import {
  Calendar,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DigitalBadgeMedallion } from "@/components/courses/digital-badge-medallion";

interface DigitalBadgeItem {
  id: string;
  name: string;
  issueDate: string;
  category: string;
  skills: string[];
  verificationId: string;
  iconBg: string;
}

const DIGITAL_BADGES: DigitalBadgeItem[] = [
  {
    id: "badge-cloud-architect",
    name: "Enterprise Cloud Solutions Architect Professional",
    issueDate: "October 12, 2026",
    category: "Cloud Systems & Architecture",
    skills: ["Multi-Region HA", "Microservices", "Terraform", "Distributed DBs"],
    verificationId: "CRED-ZAP-2026-8812-PRO",
    iconBg: "from-amber-500/20 to-yellow-500/5",
  },
  {
    id: "badge-cyber-defense",
    name: "Zero-Trust Security & Perimeter Defense Specialist",
    issueDate: "September 24, 2026",
    category: "Cyber Defense & Threat Intel",
    skills: ["Zero-Trust", "Ed25519 Cryptography", "Audit Trail", "Pen-testing"],
    verificationId: "CRED-ZAP-2026-6419-SEC",
    iconBg: "from-emerald-500/20 to-teal-500/5",
  },
  {
    id: "badge-redis-specialist",
    name: "High-Performance Redis Systems & Event Stream Architect",
    issueDate: "August 30, 2026",
    category: "Data Systems & Caching",
    skills: ["Redis Streams", "Lua Scripting", "Distributed Locks", "Outbox Pattern"],
    verificationId: "CRED-ZAP-2026-4192-DAT",
    iconBg: "from-blue-500/20 to-indigo-500/5",
  },
];

export function ProfileBadgesGallery() {
  const handleCopyVerification = (id: string) => {
    navigator.clipboard.writeText(`https://zapsters.academy/verify/${id}`);
    toast.success("Verification URL copied to clipboard!");
  };

  const handleShareLinkedIn = (badge: DigitalBadgeItem) => {
    const text = encodeURIComponent(
      `I just earned the official "${badge.name}" digital badge on Zapsters (Accredited under Zapsters Enterprise Standards)! Verification ID: ${badge.verificationId}`,
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        `https://zapsters.academy/verify/${badge.verificationId}`,
      )}&summary=${text}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" />
              Credly &amp; OpenBadges 3.0 Standard
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Total Badges: <strong className="text-foreground">{DIGITAL_BADGES.length}</strong>
            </span>
          </div>
          <h3 className="font-display text-base font-bold text-foreground">
            Verifiable Digital Credentials
          </h3>
          <p className="text-xs text-muted-foreground">
            Every badge is backed by a cryptographic audit trail, accredited under the Zapsters Enterprise Verified Standard. Share directly to LinkedIn or export verification metadata.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {DIGITAL_BADGES.map((badge) => (
          <Card
            key={badge.id}
            className="group relative flex flex-col justify-between overflow-hidden border border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_36px_rgba(245,158,11,0.1)]"
          >
            <div>
              {/* Top Hex Badge Visual */}
              <div
                className={cn(
                  "relative flex h-36 items-center justify-center border-b border-border/40 bg-gradient-to-br",
                  badge.iconBg,
                )}
              >
                {/* Hexagonal Credly Medallion */}
                <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105 py-2">
                  <DigitalBadgeMedallion
                    category={badge.category.split(" ")[0] ?? "Cloud"}
                    level="Specialist"
                    credentialId={badge.verificationId}
                    className="w-28 h-32"
                  />
                </div>
                <Badge
                  variant="outline"
                  className="absolute bottom-2.5 right-3 bg-background/90 text-[10px] font-mono border-primary/30 text-primary"
                >
                  Verified
                </Badge>
              </div>

              <div className="p-5 pb-3 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  {badge.category}
                </span>
                <h4 className="font-display font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors">
                  {badge.name}
                </h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Calendar className="size-3" />
                  Issued {badge.issueDate}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0 space-y-4">
              <div className="flex flex-wrap gap-1">
                {badge.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-surface-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] font-mono text-muted-foreground">
                <span className="truncate max-w-[140px] text-[10px]">{badge.verificationId}</span>
                <button
                  type="button"
                  onClick={() => handleCopyVerification(badge.verificationId)}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Copy className="size-3" />
                  Copy Link
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyVerification(badge.verificationId)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  Verify
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleShareLinkedIn(badge)}
                  className="h-8 text-xs font-semibold gap-1.5 text-blue-400 hover:text-blue-300"
                >
                  <Share2 className="size-3" />
                  Share
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
