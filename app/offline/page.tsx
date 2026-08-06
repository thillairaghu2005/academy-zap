import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";

export default function OfflinePage() {
  return (
    <PageContainer className="flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-h1">You are offline</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Reconnect to load new platform data. Courses saved for offline reading
        remain available from this device.
      </p>
      <Button asChild className="mt-6">
        <Link href="/courses">Back to courses</Link>
      </Button>
    </PageContainer>
  );
}
