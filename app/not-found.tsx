import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <p className="text-gradient-zap font-display text-7xl font-bold tracking-tight">
        404
      </p>
      <h1 className="mt-4 font-display text-xl font-semibold">
        This page hasn&apos;t been built yet
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Zapsters is scaffolded surface by surface — this route isn&apos;t one of
        them. Head back to the dashboard and pick a live surface.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </PageContainer>
  );
}
