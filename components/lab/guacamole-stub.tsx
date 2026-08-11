"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Lock,
  Monitor,
  Signal,
  Wifi,
} from "lucide-react";

/**
 * Guacamole GUI viewer stub (build.md F3, platform §2.5).
 *
 * The real Lab Engine serves desktop sessions through Apache Guacamole
 * (RDP/VNC over WebSocket). The frontend demo renders
 * the viewer chrome — connection bar, stream surface, status states — with a
 * scripted mock desktop behind it. Swapping in the real Guacamole client is
 * a component-body change; the chrome stays.
 */
export function GuacamoleStub({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = React.useState<"connecting" | "desktop">(
    "connecting",
  );

  React.useEffect(() => {
    const t = window.setTimeout(() => setPhase("desktop"), 2600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full bg-zinc-950">
      {/* Connection bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900 px-3 py-1.5 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Signal className="size-3 text-emerald-700" />
          guacamole · rdp-over-ws
        </span>
        <span className="flex items-center gap-1.5 font-mono">
          <Lock className="size-3" />
          {sessionId.slice(0, 8)}… enc
        </span>
      </div>

      {phase === "connecting" ? (
        <div className="flex h-[calc(100%-29px)] flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Monitor className="size-10 text-emerald-700/80" />
          </motion.div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            Connecting via Guacamole…
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/60">
            rdp://10.0.0.2:3389 · websocket handshake
          </p>
        </div>
      ) : (
        <div className="flex h-[calc(100%-29px)] flex-col p-3">
          {/* Mock desktop */}
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-white/10 bg-zinc-900">
            {/* Taskbar */}
            <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-900 px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-caption text-foreground/80">
                <Cpu className="size-3.5 text-emerald-700" />
                Blue Team Console
              </span>
              <span className="ml-auto flex items-center gap-1 text-caption text-muted-foreground">
                <Wifi className="size-3 text-emerald-700/70" />
                session-private net
              </span>
            </div>

            {/* Mock console surface */}
            <div className="flex flex-1 flex-col gap-2.5 p-3">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800 px-3 py-2">
                <span className="text-xs text-foreground/80">
                  SIEM · alert queue
                </span>
                <span className="rounded-full border border-primary-border bg-primary-light px-2 py-0.5 text-caption font-semibold text-primary">
                  3 CRITICAL
                </span>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {[
                    { label: "Auth failures", value: "1,204", tone: "text-primary" },
                  { label: "Egress attempts", value: "37", tone: "text-amber-700" },
                  { label: "Active sessions", value: "12", tone: "text-emerald-700" },
                    { label: "Flagged hosts", value: "2", tone: "text-primary" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col justify-center gap-1 rounded-lg border border-white/5 bg-zinc-800 px-3 py-2"
                  >
                    <span className="text-caption text-muted-foreground">
                      {s.label}
                    </span>
                    <span className={`font-mono text-lg font-semibold ${s.tone}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-caption text-muted-foreground/50">
                GUI stream is a mock; no remote desktop is provisioned.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
