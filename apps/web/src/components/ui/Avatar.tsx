"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

interface AvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  src?: string | null;
  size?: Size;
  className?: string;
}

export function Avatar({
  firstName,
  lastName,
  src,
  size = "md",
  className,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);

  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${firstName ?? ""} ${lastName ?? ""}`.trim() || "Avatar"}
        onError={() => setErrored(true)}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-base-surface2 font-semibold text-ink",
        sizeClasses[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
