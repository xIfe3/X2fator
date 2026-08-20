"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordChecks, scorePassword } from "@/lib/password";

const segmentTone = ["bg-base-border", "bg-danger", "bg-danger", "bg-amber", "bg-mint"];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, passed } = scorePassword(password);

  return (
    <div className="mt-2 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < score ? segmentTone[score] : "bg-base-border",
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "text-[11px] font-medium",
            score <= 1 ? "text-danger" : score <= 3 ? "text-amber" : "text-mint",
          )}
        >
          {label}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {passwordChecks.map((c) => {
          const ok = passed.includes(c.key);
          return (
            <li key={c.key} className={cn("flex items-center gap-1.5 text-[11px]", ok ? "text-ink-dim" : "text-ink-faint")}>
              {ok ? <Check className="h-3 w-3 text-mint" /> : <X className="h-3 w-3 text-ink-faint" />}
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
