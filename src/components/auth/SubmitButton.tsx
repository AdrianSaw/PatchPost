import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  pendingText: string;
  icon: ReactNode;
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SubmitButton({
  pendingText,
  icon,
  children,
  pending: pendingOverride,
  disabled = false,
  className,
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingOverride ?? formPending;

  return (
    <Button
      type="submit"
      variant="ghost"
      disabled={pending || disabled}
      className={cn("btn-cosmic-primary w-full px-4 py-2.5 font-semibold disabled:opacity-60", className)}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {pendingText}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon}
          {children}
        </span>
      )}
    </Button>
  );
}
