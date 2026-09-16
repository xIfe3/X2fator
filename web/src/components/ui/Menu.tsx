"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("Menu.* components must be used inside <Menu>");
  return ctx;
}

interface MenuProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Menu({ children, open: controlledOpen, onOpenChange }: MenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    if (controlledOpen === undefined) setUncontrolledOpen(next);
  }

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen, rootRef }}>
      <div className="relative" ref={rootRef}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function MenuTrigger({
  children,
}: {
  children: (props: { onClick: () => void; "aria-expanded": boolean }) => ReactNode;
}) {
  const { open, setOpen } = useMenuContext();
  return (
    <>{children({ onClick: () => setOpen(!open), "aria-expanded": open })}</>
  );
}

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const { open } = useMenuContext();
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute top-11 z-50 w-52 animate-fade-up rounded-xl border border-base-border bg-base-surface p-1.5 shadow-panel",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2">{children}</div>;
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-base-border" />;
}

interface MenuItemProps {
  children: ReactNode;
  icon?: LucideIcon;
  href?: string;
  variant?: "default" | "danger";
  onSelect?: () => void;
}

export function MenuItem({
  children,
  icon: Icon,
  href,
  variant = "default",
  onSelect,
}: MenuItemProps) {
  const { setOpen } = useMenuContext();

  const className = cn(
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
    variant === "danger"
      ? "text-danger hover:bg-danger-soft"
      : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
  );

  function handleSelect() {
    setOpen(false);
    onSelect?.();
  }

  if (href) {
    return (
      <Link href={href} className={className} onClick={handleSelect}>
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={handleSelect}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
