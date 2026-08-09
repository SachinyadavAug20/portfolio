"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

const Toaster = ({ ...props }: React.ComponentProps<typeof Sonner>) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-(--toast-bg) group-[.toaster]:text-(--toast-text) group-[.toaster]:border-(--toast-border) group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-(--toast-muted)",
          actionButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-900",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
