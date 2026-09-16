import Image from "next/image";
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
          "relative flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Image
          src="/favicon.png"
          alt=""
          fill
          sizes={compact ? "32px" : "40px"}
          className="object-contain"
          priority
        />
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
