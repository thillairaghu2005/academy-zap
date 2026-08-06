import { PageContainer } from "@/components/shared/page-container";
import { SkeletonLines } from "@/components/shared/skeletons";

export default function MentorsLoading() {
  return (
    <PageContainer>
      <SkeletonLines count={2} className="max-w-xl" />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-5">
            <SkeletonLines count={6} />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
