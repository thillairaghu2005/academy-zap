import {
  MOCK_LABS_BY_ID,
  mockLabSessions,
  nextHintServerSide,
} from "@/lib/mocks/labs";
import type { StoredLabSession } from "@/lib/mocks/labs";

/**
 * Mock terminal bridge — the frontend's stand-in for the real ttyd
 * WebSocket-to-TTY bridge (§2.5, §6.4).
 *
 * The real flow: browser <-> authenticated WebSocket proxy <-> ttyd <-> the
 * session's shell. Here we reproduce the SHAPE (a WebSocket-like object with
 * onopen/onmessage/send/close and a scripted transcript) without a network.
 *
 * CRITICAL DISCIPLINE: objective/flag state is derived SERVER-SIDE. When the
 * user runs a command that "reads" a flag in the mock sandbox, the bridge
 * writes `discovered` into the session store (lib/mocks/labs.ts) — the same
 * store `check_objective` reads. The terminal UI never decides an objective
 * is complete; it just renders what the API returns. This mirrors §6's
 * "check_objective() runs a scoped read against the session's state, NEVER
 * by trusting a value the user's browser sends".
 */

export type MockSocketState = "connecting" | "open" | "closed";

/**
 * WebSocket-shaped object. The terminal component uses exactly the browser
 * WebSocket surface (addEventListener/onmessage/send/close) so the swap to
 * the real ttyd endpoint is a constructor change, nothing else.
 */
export class MockLabSocket {
  readyState: MockSocketState = "connecting";

  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;

  private session: StoredLabSession;
  private bootIndex = 0;
  private history: string[] = [];

  constructor(private sessionId: string) {
    const session = mockLabSessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown lab session ${sessionId}`);
    }
    this.session = session;
  }

  /** Simulates the authenticated WS handshake + boot transcript. */
  connect(): void {
    // globalThis.setTimeout: the bridge must be runnable in Node (logic
    // tests) as well as the browser — it never touches the DOM itself.
    globalThis.setTimeout(() => {
      this.readyState = "open";
      this.onopen?.();
      // Stream the boot banner line-by-line, like a real shell coming up.
      const boot = this.bootTranscript();
      const tick = () => {
        if (this.readyState !== "open" || this.bootIndex >= boot.length) return;
        this.onmessage?.({ data: boot[this.bootIndex]! });
        this.bootIndex += 1;
        globalThis.setTimeout(tick, 90 + Math.random() * 140);
      };
      globalThis.setTimeout(tick, 250);
    }, 350);
  }

  /** Sends a raw command line to the mock shell. */
  send(data: string): void {
    if (this.readyState !== "open") return;
    const line = data.replace(/\r?\n$/, "").trim();
    if (line === "") {
      this.onmessage?.({ data: "\r\n" });
      return;
    }
    this.history.unshift(line);
    if (this.history.length > 50) this.history.pop();

    const out = this.interpret(line);
    // Write the typed line (echo) + its output + a fresh prompt.
    this.onmessage?.({ data: `\r\n$ ${line}\r\n${out}` });
  }

  close(): void {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    this.onclose?.();
  }

  /* ---------------- mock sandbox ---------------- */

  private bootTranscript(): string[] {
    const lab = MOCK_LABS_BY_ID.get(this.session.lab_id);
    const labTitle = lab?.title ?? "Unknown Lab";
    return [
      `\x1b[1;32mZapsters Virtual Lab\x1b[0m — ${labTitle}`,
      `Session \x1b[2m${this.session.session_id}\x1b[0m · isolated network · egress denied`,
      `Type \x1b[1mhelp\x1b[0m for available commands. Objectives are checked by the demo service.`,
      ``,
    ];
  }

  /**
   * Interprets one command against the mock sandbox. When a command reads a
   * flag, it marks the objective discovered in the local session store
   * derivation) — never reports completion to the browser directly.
   */
  private interpret(line: string): string {
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "help":
        return [
          "\x1b[1mCommands:\x1b[0m",
          "  help                     show this help",
          "  whoami                   current user",
          "  pwd                      print working directory",
          "  ls [path]                list directory",
          "  cat <file>               print a file",
          "  sudo -l                  list permitted sudo commands",
          "  nmap [args]              port scan the session network",
          "  curl [url]               fetch an HTTP resource",
          "  hint                     show the next hint for an objective",
          "  history                  your command history",
          "",
        ].join("\r\n");
      case "whoami":
        // The "Get a shell" objective completes on the first real command.
        this.discover("linux-shell");
        return `user@zapster-lab\r\n`;
      case "pwd":
        return `/home/user\r\n`;
      case "ls": {
        const path = arg || ".";
        const listing = this.listingFor(path);
        return listing ? `${listing}\r\n` : `ls: cannot access '${path}': No such file or directory\r\n`;
      }
      case "cat": {
        if (!arg) return `cat: missing operand\r\n`;
        return this.readFile(arg);
      }
      case "sudo": {
        if (rest.join(" ") === "-l") {
          this.discover("linux-sudo");
          return `Matching Defaults entries for user on zapster-lab:\r\n    env_reset\r\n\r\nUser user may run the following commands on zapster-lab:\r\n    (ALL) NOPASSWD: /usr/bin/cat\r\n\r\n`;
        }
        return `sudo: command not found in the mock sandbox\r\n`;
      }
      case "nmap": {
        const scan = this.nmapResult(arg);
        return scan ? `${scan}\r\n` : `nmap: no target specified\r\n`;
      }
      case "curl": {
        return this.curlResult(arg);
      }
      case "hint": {
        return this.nextHint();
      }
      case "history":
        return this.history.length
          ? this.history.map((h, i) => `  ${i + 1}  ${h}`).join("\r\n") + "\r\n"
          : `(no history)\r\n`;
      case "clear":
      case "reset":
        return "";
      default:
        return `bash: ${cmd}: command not found\r\n`;
    }
  }

  private listingFor(path: string): string | null {
    if (path === "." || path === "/home/user" || path === "~") {
      return `drwxr-xr-x  user user  4096 documents\r\n-rw-r--r--  user user   176 README.txt\r\n`;
    }
    if (path === "documents" || path === "/home/user/documents") {
      return `drwxr-xr-x  user user  4096 notes\r\n-rw-r--r--  user user   233 budget.csv\r\n`;
    }
    if (path === "/" || path === "/root") {
      return `drwx------  root root  4096 .\r\n-rw-------  root root    64 flag.txt\r\n`;
    }
    if (path === "/etc") {
      return `-rw-r--r--  root root  2401 passwd\r\n-rw-r--r--  root root   533 hostname\r\n`;
    }
    return null;
  }

  private readFile(path: string): string {
    const flagLabFiles: Record<string, string> = {
      "/root/flag.txt": `FLAG{${this.session.lab_id.toUpperCase()}-${this.session.session_id.slice(0, 8)}}\r\n`,
      "/home/user/README.txt": `Welcome to the lab. Type 'help' to get started.\r\n`,
    };
    const flagFile = flagLabFiles[path];
    if (flagFile) {
      this.discover(this.objectiveIdForFlag(path));
      return flagFile;
    }
    if (path === "/etc/passwd") {
      return `root:x:0:0:root:/root:/bin/bash\r\nuser:x:1000:1000:user:/home/user:/bin/bash\r\n`;
    }
    if (path === "/etc/hostname") {
      return `zapster-lab\r\n`;
    }
    return `cat: ${path}: No such file or directory\r\n`;
  }

  /** Maps a flag file path to the objective it satisfies (lab manifest). */
  private objectiveIdForFlag(path: string): string {
    if (path === "/root/flag.txt") {
      switch (this.session.lab_id) {
        case "lab-linux-fundamentals":
          return "linux-flag";
        case "lab-race-the-clock":
          return "clock-flag";
        default:
          return "linux-flag";
      }
    }
    return "";
  }

  private nmapResult(args: string): string {
    const target = args.split(/\s+/).pop() ?? "";
    if (target.includes("10.0.0.0/24") || target === "10.0.0.0/24") {
      this.discover("net-ping-sweep");
      return [
        `Starting Nmap 7.94 ( https://nmap.org )`,
        `Nmap scan report for 10.0.0.1 (session gateway)`,
        `Nmap scan report for 10.0.0.2 (target box)`,
        `Nmap scan report for 10.0.0.3 (web app)`,
        `Nmap done: 256 IP addresses (3 hosts up)`,
      ].join("\r\n") + "\r\n";
    }
    if (target === "10.0.0.2" || target === "10.0.0.3") {
      this.discover("net-service");
      this.discover("web-recon");
      return [
        `Starting Nmap 7.94`,
        `PORT     STATE SERVICE  VERSION`,
        `22/tcp   open  ssh      OpenSSH 8.9p1`,
        `80/tcp   open  http     Apache httpd 2.4.57`,
        `Service detection performed.`,
      ].join("\r\n") + "\r\n";
    }
    return `Nmap done: 0 hosts up.\r\n`;
  }

  private curlResult(url: string): string {
    if (url.includes("10.0.0.2") || url.includes("10.0.0.3")) {
      const payload = url.includes("' OR '1'='1") || url.includes("1=1");
      if (payload) {
        this.discover("web-sqli");
        return [
          `HTTP/1.1 200 OK`,
          `Demo marker: flag-admin-${this.session.session_id.slice(0, 8)} (local simulation)`,
          ``,
          `<h1>Welcome back, admin!</h1>`,
          `<p>Session escalated. Objective complete.</p>`,
        ].join("\r\n") + "\r\n";
      }
      this.discover("web-recon");
      return [
        `HTTP/1.1 200 OK`,
        ``,
        `<!doctype html><title>Acme Bank</title>`,
        `<form action="/login">username: <input name="u"></form>`,
      ].join("\r\n") + "\r\n";
    }
    if (url.includes("net-flag") || url.includes("flag")) {
      this.discover("net-flag");
      return `FLAG{NET-${this.session.session_id.slice(0, 8)}}\r\n`;
    }
    return `curl: (6) Could not resolve host: ${url}\r\n`;
  }

  private nextHint(): string {
    // Shared derivation — the objectives panel's "Request hint"
    // button calls the same store function, so hints_used stays consistent.
    const hint = nextHintServerSide(this.session);
    return `\x1b[1;33mHint\x1b[0m: ${hint}\r\n`;
  }

  /** Server-side derivation: writes discovery into the session store. */
  private discover(objectiveId: string): void {
    if (!objectiveId) return;
    // Only record objectives that exist in this lab's manifest — a shared
    // command (e.g. whoami) must not complete an objective of another lab.
    const lab = MOCK_LABS_BY_ID.get(this.session.lab_id);
    if (!lab?.objectives.some((o) => o.id === objectiveId)) return;
    this.session.discovered.add(objectiveId);
    this.session.objectives_completed = [...this.session.discovered];
  }
}
