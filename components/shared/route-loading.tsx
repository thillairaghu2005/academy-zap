import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import {
  CodeEditorSkeleton,
  SkeletonGrid,
  SkeletonLines,
  TerminalSkeleton,
} from "@/components/shared/skeletons";

export function JudgeListLoading() {
  return (
    <PageContainer className="max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <Card className="h-72 overflow-hidden rounded-[20px] border-slate-200 bg-slate-950 p-8">
        <SkeletonLines count={3} className="max-w-xl [&>div]:bg-white/10" />
      </Card>
      <Card className="mt-8 p-5">
        <SkeletonLines count={2} className="max-w-full" />
      </Card>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <SkeletonGrid count={6} className="col-span-2 grid-cols-1 md:grid-cols-2" />
      </div>
    </PageContainer>
  );
}

export function JudgeDetailLoading() {
  return (
    <PageContainer>
      <SkeletonLines count={2} className="max-w-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonLines count={8} />
        <Card className="h-[520px] overflow-hidden p-0">
          <CodeEditorSkeleton />
        </Card>
      </div>
    </PageContainer>
  );
}

export function LabsListLoading() {
  return (
    <PageContainer>
      <SkeletonLines count={2} className="max-w-xl" />
      <div className="mt-6">
        <SkeletonGrid count={6} />
      </div>
    </PageContainer>
  );
}

export function LabDetailLoading() {
  return (
    <PageContainer>
      <SkeletonLines count={2} className="max-w-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <SkeletonLines count={8} />
        <Card className="h-64 p-4">
          <SkeletonLines count={4} />
        </Card>
      </div>
    </PageContainer>
  );
}

export function LabSessionLoading() {
  return (
    <PageContainer>
      <SkeletonLines count={2} className="max-w-md" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="h-[420px] overflow-hidden p-0">
          <TerminalSkeleton />
        </Card>
        <div className="flex flex-col gap-4">
          <SkeletonLines count={5} />
          <SkeletonLines count={3} />
        </div>
      </div>
    </PageContainer>
  );
}
