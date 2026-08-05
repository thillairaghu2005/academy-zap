import Link from "next/link";

import logoSource from "@/src/assets/images/zapsters-logo.png";
import { cn } from "@/lib/utils";

export type LogoProps = {
  variant?: "default" | "light" | "dark" | "icon-only";
  size?: "sm" | "md" | "lg" | number;
  linkTo?: string | null;
  className?: string;
  eager?: boolean;
};

const sizeClasses = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-12 w-auto",
} as const;

/** Branded logo primitive. The PNG is currently the only supplied variant. */
export function Logo({
  variant = "default",
  size = "md",
  linkTo = "/",
  className,
  eager = false,
}: LogoProps) {
  const imageClassName =
    typeof size === "number" ? "w-auto" : sizeClasses[size];
  const imageStyle = typeof size === "number" ? { height: size } : undefined;

  const image = (
    /* The product requirement explicitly calls for a native img element. */
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logoSource.src}
      width={logoSource.width}
      height={logoSource.height}
      alt="Zapsters Logo"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      data-variant={variant}
      className={cn("block object-contain", imageClassName)}
      style={imageStyle}
    />
  );

  if (linkTo === null) {
    return <span className={cn("inline-flex shrink-0", className)}>{image}</span>;
  }

  return (
    <Link
      href={linkTo}
      aria-label="Zapsters - Home"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {image}
    </Link>
  );
}
