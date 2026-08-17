import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Thank You",
  description: "Thank you for joining Zapsters.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <PageContainer className="flex items-center justify-center min-h-[70vh]" as="main" id="main-content">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
          <Sparkles className="size-8" />
        </div>
        <h1 className="font-display text-4xl font-bold">You&apos;re all set!</h1>
        <p className="mt-4 text-muted-foreground max-w-sm mx-auto">
          Thank you for signing up or completing your purchase. Your journey with Zapsters starts now.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
