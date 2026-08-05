"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle, ShoppingCart } from "lucide-react";

import { addToCart } from "@/lib/api/commerce";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared "Add to cart" action (Task 3) — used on product cards and detail
 * views. Signed-out users are routed to sign-in (guest checkout doesn't
 * exist). Invalidates the shared cart query so the nav badge updates
 * immediately.
 */
export function AddToCartButton({
  productId,
  size = "default",
  className,
}: {
  productId: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const mutation = useMutation({
    mutationFn: () => addToCart(userId, productId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      toast.success("Added to cart.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) {
    return (
      <Button variant="outline" size={size} asChild className={className}>
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
          <ShoppingCart className="size-4" />
          Add to cart
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      className={cn(className)}
    >
      {mutation.isPending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      {mutation.isPending ? "Adding…" : "Add to cart"}
    </Button>
  );
}
