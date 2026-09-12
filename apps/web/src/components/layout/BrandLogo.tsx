import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  compact = false,
  admin = false,
}: {
  href?: string;
  compact?: boolean;
  admin?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center", compact ? "gap-2" : "gap-2.5")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden border leading-none shadow-stamp transition-transform duration-200 group-hover:-translate-y-0.5",
          compact ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl",
          admin
            ? "border-secondary/50 bg-secondary text-base"
            : "border-primary/50 bg-primary text-base",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={compact ? "h-4 w-4" : "h-5 w-5"}
        >
          <path
            d="M4 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          compact ? "text-base" : "text-lg",
        )}
      >
        X2<span className={admin ? "text-secondary" : "text-primary"}>Factor</span>
      </span>
      {admin && <span className="sr-only">Admin console</span>}
    </Link>
  );
}
