import { passwordStrength } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/**
 * Three bulbs that come on as a new password gets stronger, the newest one
 * flaring, with the verdict in words beside them so it's never colour alone.
 */
export function PasswordStrength({ password, id, className }: { password: string; id: string; className?: string }) {
  const { score, label } = passwordStrength(password);

  return (
    <div className={cn("mt-2.25 flex items-center gap-2.5", className)}>
      <span aria-hidden className="flex gap-1.25">
        {[1, 2, 3].map((bulb) => (
          <span
            // A new key on the newest bulb replays its flare each time the score rises to it.
            key={bulb === score ? `lit-${bulb}` : bulb}
            className={cn(
              "size-1.5 rounded-full transition-[background-color,box-shadow] duration-300",
              bulb <= score ? "bg-accent shadow-bulb-low" : "bg-white/14",
              bulb === score && "animate-bulb-flare lite:animate-none",
            )}
          />
        ))}
      </span>
      <span id={id} aria-live="polite" className="text-[11.5px] text-text-muted">
        {label}
      </span>
    </div>
  );
}
