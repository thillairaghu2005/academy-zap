"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center text-center" as="main" id="main-content">
      <p className="font-mono text-sm font-medium tracking-widest text-primary">
        404
      </p>
      <h1 className="mt-4 font-display text-h3">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        We couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button asChild size="lg">
          <Link href="/">Return home</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </div>
      <div className="mt-12 w-full max-w-md border-t pt-8">
        <p className="text-sm text-muted-foreground mb-4">Looking for something specific?</p>
        <Button variant="secondary" className="w-full justify-start text-muted-foreground" onClick={() => window.dispatchEvent(new CustomEvent("zapsters:open-search"))}>
          <Search className="mr-2 size-4" />
          Search Zapsters...
        </Button>
      </div>
    </PageContainer>
  );
}
