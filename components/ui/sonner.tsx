"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:shadow-[0_12px_32px_rgb(23_23_23_/_10%)] group-[.toaster]:backdrop-blur-sm group-[.toaster]:px-4 group-[.toaster]:py-3",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-primary group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-caption group-[.toast]:font-medium group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary-hover",
          cancelButton:
            "group-[.toast]:rounded-md group-[.toast]:bg-muted group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-caption group-[.toast]:font-medium group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-secondary",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
