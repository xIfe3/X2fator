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
          "relative flex shrink-0 items-center justify-center overflow-hidden border font-mono font-semibold leading-none shadow-stamp transition-transform duration-200 group-hover:-translate-y-0.5",
          compact
            ? "h-8 w-8 rounded-lg text-[11px]"
            : "h-10 w-10 rounded-xl text-xs",
          admin
            ? "border-amber/50 bg-amber text-base"
            : "border-mint/50 bg-mint text-base",
        )}
      >
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-current opacity-30" />
        <span className="relative tracking-[-0.12em]">X2</span>
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          compact ? "text-base" : "text-lg",
        )}
      >
        X2<span className={admin ? "text-amber" : "text-mint"}>Factor</span>
      </span>
      {admin && <span className="sr-only">Admin console</span>}
    </Link>
  );
}
