import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-card transition-colors duration-150 ease-cinematic disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: cn(
          "border border-transparent bg-accent font-semibold text-accent-ink shadow-cta-md hover:bg-accent-hover",
          "disabled:border-white/7 disabled:bg-inset disabled:font-medium disabled:text-text-faint disabled:shadow-none",
        ),
        secondary:
          "border border-white/12 bg-elevated text-text hover:border-accent/50 hover:text-accent disabled:text-text-faint",
        ghost: "text-text-muted hover:text-text",
        danger:
          "border border-danger bg-danger font-semibold text-danger-ink shadow-danger hover:brightness-110 disabled:opacity-60",
      },
      size: {
        sm: "h-8 px-3 text-13",
        md: "h-11.5 px-5.5 text-[13.5px]",
        lg: "px-6.5 py-3.5 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return <Component className={cn(button({ variant, size }), className)} {...props} />;
}
