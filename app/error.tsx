"use client";

import * as React from "react";

import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer narrow>
      <ErrorState
        title="This surface is unavailable"
        message="Something interrupted the page. Retry to request the latest state."
        onRetry={unstable_retry}
      />
    </PageContainer>
  );
}
