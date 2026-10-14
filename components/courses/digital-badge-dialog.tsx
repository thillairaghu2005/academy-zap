"use client";

import * as React from "react";
import { formatLongEnglishDate } from "@/lib/format";
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Check,
} from "lucide-react";

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}
import type { Course } from "@/lib/contracts/content";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCourseSkillBuildMeta } from "@/lib/courses/skillbuild-helpers";

interface DigitalBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  learnerName: string;
}

export function DigitalBadgeDialog({
  open,
  onOpenChange,
  course,
  learnerName,
}: DigitalBadgeDialogProps) {
  const announce = useAnnounce();
  const certificateRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = React.useState<"badge" | "certificate">("badge");
  const [copiedLink, setCopiedLink] = React.useState(false);

  const meta = React.useMemo(() => getCourseSkillBuildMeta(course), [course]);
  const badge = meta.badgeInfo;
  const completedDate = formatLongEnglishDate(new Date());

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(badge.verificationUrl);
      setCopiedLink(true);
      announce("Credential verification link copied");
      toast.success("Credential verification link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = () => {
    const shareText = `I just earned the official "${badge.name}" on Zapsters (Accredited by AWS Skill Builder & IBM SkillsBuild Pathway)! Verify here: ${badge.verificationUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: badge.name, text: shareText, url: badge.verificationUrl });
    } else {
      handleCopyLink();
    }
  };

  const handleLinkedInShare = () => {
    // Official LinkedIn certification URL format
    const certName = encodeURIComponent(badge.name);
    const orgName = encodeURIComponent("Zapsters Enterprise Academy");
    const certUrl = encodeURIComponent(badge.verificationUrl);
    const certId = encodeURIComponent(badge.id);
    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${orgName}&certUrl=${certUrl}&certId=${certId}`;
    if (typeof window !== "undefined") {
      window.open(linkedInUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening LinkedIn Add Certification...");
    }
  };

  const handleDownload = () => {
    announce("Downloading certificate");
    const text = [
      "==================================================================",
      "            ZAPSTERS ENTERPRISE ACADEMY — DIGITAL CREDENTIAL      ",
      "      ACCREDITED BY AWS SKILL BUILDER & IBM SKILLSBUILD PATHWAY   ",
      "==================================================================",
      "",
      `RECIPIENT:         ${learnerName}`,
      `CREDENTIAL:        ${badge.name}`,
      `COURSE CODE:       ${meta.courseCode}`,
      `CREDENTIAL ID:     ${badge.id}`,
      `ISSUED:            ${completedDate}`,
      `CEU CREDITS:       ${badge.ceuCredits} Continuing Education Units`,
      `VERIFICATION URL:  ${badge.verificationUrl}`,
      "",
      "SKILLS VALIDATED:",
      ...badge.skillsValidated.map((s) => `  * ${s}`),
      "",
      "CRITERIA MET:",
      ...badge.criteria.map((c) => `  [COMPLETED] ${c}`),
      "",
      "==================================================================",
      "Signature: Dr. Aris Thorne, Academic Director · Zapsters Academy",
      "==================================================================",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${badge.id}-digital-credential.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Credential record downloaded!");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border bg-card">
        <DialogTitle className="sr-only">Verifiable Digital Skill Credential</DialogTitle>
        <DialogDescription className="sr-only">View and verify your official digital skill badge and certificate.</DialogDescription>
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-primary-deep/80 p-6 text-white border-b border-border/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-deep text-white font-bold shadow-lg shadow-primary/25">
                <ShieldCheck className="size-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light bg-primary/20 px-2 py-0.5 rounded border border-primary/30">
                    Credly-Compatible Badge
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {meta.courseCode}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-display text-white mt-1">
                  Verifiable Digital Skill Credential
                </h2>
              </div>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("badge")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-colors",
                  activeTab === "badge"
                    ? "bg-primary text-primary-foreground font-semibold shadow"
                    : "text-slate-300 hover:text-white"
                )}
              >
                Digital Badge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("certificate")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-colors",
                  activeTab === "certificate"
                    ? "bg-primary text-primary-foreground font-semibold shadow"
                    : "text-slate-300 hover:text-white"
                )}
              >
                Official Certificate
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Credly / AWS Skill Builder / IBM SkillsBuild Hexagonal Digital Badge */}
        {activeTab === "badge" ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid md:grid-cols-[280px_1fr] gap-8 items-center">
              {/* 3D Hexagonal Credly Medallion */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl relative group">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary-deep/20 to-primary/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Hexagon SVG Medallion */}
                <div className="relative z-10 w-48 h-56 flex items-center justify-center">
                  <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-[0_15px_25px_rgba(217,38,64,0.35)]">
                    <defs>
                      <linearGradient id="badgeBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="50%" stopColor="#be123c" />
                        <stop offset="100%" stopColor="#9f1239" />
                      </linearGradient>
                      <linearGradient id="badgeFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="50%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#020617" />
                      </linearGradient>
                      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#e11d48" />
                      </linearGradient>
                    </defs>

                    {/* Outer Hexagon */}
                    <polygon
                      points="100,5 190,57 190,163 100,215 10,163 10,57"
                      fill="url(#badgeBorderGrad)"
                      stroke="#fb7185"
                      strokeWidth="2"
                    />

                    {/* Inner Hexagon */}
                    <polygon
                      points="100,15 180,62 180,158 100,205 20,158 20,62"
                      fill="url(#badgeFillGrad)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />

                    {/* Inner Accent Ring */}
                    <polygon
                      points="100,22 173,65 173,153 100,196 27,153 27,65"
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />

                    {/* Top Ribbon text */}
                    <text x="100" y="52" textAnchor="middle" fill="#fb7185" fontSize="9" fontWeight="bold" letterSpacing="2">
                      ZAPSTERS · SKILL
                    </text>

                    {/* Emblem Icon: Star & Shield */}
                    <circle cx="100" cy="98" r="30" fill="#1e293b" stroke="#e11d48" strokeWidth="2" />
                    <path
                      d="M100 80 L105 92 L118 94 L108 103 L111 116 L100 109 L89 116 L92 103 L82 94 L95 92 Z"
                      fill="url(#goldGrad)"
                    />

                    {/* Category Label */}
                    <text x="100" y="142" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                      {course.category.toUpperCase()}
                    </text>

                    {/* Level Label */}
                    <rect x="55" y="152" width="90" height="18" rx="4" fill="#e11d48" />
                    <text x="100" y="165" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" letterSpacing="1">
                      {badge.level.toUpperCase()}
                    </text>

                    {/* Bottom Verification Label */}
                    <text x="100" y="188" textAnchor="middle" fill="#94a3b8" fontSize="7" letterSpacing="1">
                      VERIFIED CREDENTIAL
                    </text>
                  </svg>
                </div>

                <div className="mt-3 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary-light text-xs">
                    <Sparkles className="size-3 mr-1" />
                    Issued & Verified
                  </Badge>
                  <p className="text-[11px] font-mono text-muted-foreground mt-2">
                    {badge.id}
                  </p>
                </div>
              </div>

              {/* Credential Details & Standards */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                      {badge.issuer}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {badge.partner}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
                    {badge.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {badge.tagline}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-surface-1">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Level</span>
                    <span className="text-sm font-semibold text-foreground">{badge.level}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Credits</span>
                    <span className="text-sm font-semibold text-foreground">{badge.ceuCredits} CEU</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Validity</span>
                    <span className="text-sm font-semibold text-emerald-500">Permanent</span>
                  </div>
                </div>

                {/* Skills Measured */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Skills Measured & Validated
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {badge.skillsValidated.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Earning Criteria */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Earning Criteria
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {badge.criteria.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sharing and Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="text-xs gap-1.5"
                >
                  {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedLink ? "Link Copied!" : "Copy Verification URL"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  className="text-xs gap-1.5"
                >
                  <Share2 className="size-3.5" />
                  Share
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleLinkedInShare}
                  className="bg-[#0a66c2] hover:bg-[#004182] text-white text-xs gap-1.5 font-medium"
                >
                  <LinkedInIcon className="size-3.5 fill-white" />
                  Add to LinkedIn Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("certificate")}
                  className="text-xs gap-1.5"
                >
                  <Award className="size-3.5 text-primary" />
                  View Certificate
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: High-Resolution Formal Certificate */
          <div className="p-6 sm:p-8 space-y-6">
            <div
              ref={certificateRef}
              className="relative overflow-hidden rounded-2xl border-4 border-double border-primary/40 bg-slate-950 p-8 sm:p-12 text-center shadow-2xl"
            >
              {/* Background watermark */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e11d48_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-primary/15 blur-3xl" />

              <div className="relative z-10 space-y-6 max-w-xl mx-auto">
                {/* Institution Heading */}
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary-light">
                    Zapsters Enterprise Academy
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    In Partnership with AWS Skill Builder & IBM SkillsBuild Framework
                  </p>
                </div>

                <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />

                {/* Certificate Title */}
                <div>
                  <h3 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    Certificate of Competency
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                    Official Continuing Professional Education Record
                  </p>
                </div>

                {/* Recipient */}
                <div className="py-2">
                  <p className="text-xs text-slate-400 uppercase tracking-widest">This certifies that</p>
                  <h4 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                    {learnerName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2">
                    has successfully demonstrated hands-on technical proficiency and fulfilled all curriculum requirements for:
                  </p>
                  <p className="font-display text-xl font-semibold text-primary-light mt-2">
                    {course.title}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Course Code</span>
                    <span className="font-mono font-medium text-slate-200">{meta.courseCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Issue Date</span>
                    <span className="font-medium text-slate-200">{completedDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">CEU Credits</span>
                    <span className="font-medium text-primary-light">{badge.ceuCredits} Units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Credential ID</span>
                    <span className="font-mono text-[11px] text-slate-300">{badge.id}</span>
                  </div>
                </div>

                {/* Signatures & Seal */}
                <div className="pt-6 flex items-end justify-between border-t border-slate-800 gap-4">
                  <div className="text-left">
                    <p className="font-serif italic text-lg text-primary-light">Aris Thorne</p>
                    <div className="h-px w-32 bg-slate-700 my-1" />
                    <p className="text-[10px] font-medium text-slate-400">Dr. Aris Thorne</p>
                    <p className="text-[9px] text-slate-500">Director of Academic Affairs</p>
                  </div>

                  {/* Red/Crimson Seal Medallion */}
                  <div className="grid size-16 place-items-center rounded-full border-2 border-primary bg-gradient-to-br from-primary to-primary-deep text-white font-bold shadow-lg shadow-primary/30">
                    <div className="text-center">
                      <Star className="size-4 mx-auto fill-white text-white" />
                      <span className="text-[8px] font-black uppercase tracking-tighter block">VERIFIED</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-serif italic text-lg text-primary-light">Priya Nair</p>
                    <div className="h-px w-32 bg-slate-700 my-1 ml-auto" />
                    <p className="text-[10px] font-medium text-slate-400">Priya Nair</p>
                    <p className="text-[9px] text-slate-500">Lead Curriculum Architect</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("badge")}
                className="text-xs gap-1.5"
              >
                Back to Digital Badge
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="text-xs gap-1.5"
                >
                  <Printer className="size-3.5" />
                  Print
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="font-semibold text-xs gap-1.5"
                >
                  <Download className="size-3.5" />
                  Download Certificate (.txt)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
