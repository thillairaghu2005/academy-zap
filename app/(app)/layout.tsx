import { AppShell } from "@/components/layout/app-shell";

/**
 * Route group `(app)` wraps every surface under the global shell.
 * Group parentheses keep the URL flat: /courses, /judge, /rank, ...
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
