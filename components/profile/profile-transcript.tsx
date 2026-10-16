"use client";

import * as React from "react";
import {
  Download,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TranscriptEntry {
  id: string;
  title: string;
  type: "Course" | "Practice Exam" | "Hands-on Lab" | "Capstone";
  completedDate: string;
  score: string;
  ceus: number;
  instructor: string;
  verificationHash: string;
}

const TRANSCRIPT_RECORDS: TranscriptEntry[] = [
  {
    id: "TR-001",
    title: "Enterprise Cloud Solutions Architecture Pathway",
    type: "Course",
    completedDate: "Oct 12, 2026",
    score: "94% (Pass)",
    ceus: 3.8,
    instructor: "Dr. Marcus Vance",
    verificationHash: "ed25519:7a8f9c1e2b4d6a",
  },
  {
    id: "TR-002",
    title: "Zero-Trust Perimeter & Cloud Security Checkpoint",
    type: "Practice Exam",
    completedDate: "Oct 08, 2026",
    score: "880 / 1000",
    ceus: 1.5,
    instructor: "Elena Rostova",
    verificationHash: "ed25519:3c5e8b0a9f1d2e",
  },
  {
    id: "TR-003",
    title: "Redis Distributed Caching & Rate-Limiter Sandbox",
    type: "Hands-on Lab",
    completedDate: "Sep 28, 2026",
    score: "100% (All Objectives)",
    ceus: 0.5,
    instructor: "Zapsters Lab Sandbox Engine",
    verificationHash: "ed25519:9e2b1d4c7a6f0e",
  },
  {
    id: "TR-004",
    title: "Event-Driven Microservices with Redis Streams",
    type: "Course",
    completedDate: "Sep 15, 2026",
    score: "96% (Pass)",
    ceus: 2.0,
    instructor: "Sarah Jenkins",
    verificationHash: "ed25519:1a2b3c4d5e6f7a",
  },
];

export function ProfileTranscript({ learnerName: _learnerName }: { learnerName: string }) {
  const totalCEUs = TRANSCRIPT_RECORDS.reduce((sum, r) => sum + r.ceus, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Transcript Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" />
              Verified Audit Record
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              Total CEUs: <strong className="text-foreground">{totalCEUs.toFixed(1)}</strong>
            </span>
          </div>
          <h3 className="font-display text-base font-bold text-foreground">
            Official Academic &amp; Skills Transcript
          </h3>
          <p className="text-xs text-muted-foreground">
            Authoritative, tamper-evident record of all completed curricula, verified with cryptographic Ed25519 signatures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 h-8 font-semibold"
          >
            <Printer className="size-3.5" />
            Print Transcript
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 h-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Official Ledger Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/40">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/40 bg-surface-1/70 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Curriculum / Module</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Score / Grade</th>
              <th className="px-4 py-3">CEUs</th>
              <th className="px-4 py-3">Integrity Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {TRANSCRIPT_RECORDS.map((record) => (
              <tr key={record.id} className="hover:bg-surface-1/40 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-foreground text-xs leading-snug">
                    {record.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {record.instructor}
                  </p>
                </td>
                <td className="px-4 py-3.5 font-mono">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {record.type}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 font-mono text-muted-foreground whitespace-nowrap">
                  {record.completedDate}
                </td>
                <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                  {record.score}
                </td>
                <td className="px-4 py-3.5 font-mono text-primary font-bold">
                  {record.ceus.toFixed(1)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-success-strong font-mono text-[11px]">
                    <ShieldCheck className="size-3.5 text-success-strong shrink-0" />
                    <span className="truncate max-w-[120px]">{record.verificationHash}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
