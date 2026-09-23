"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

type RouteLoaderContextValue = {
  start: () => void;
};

const RouteLoaderContext = createContext<RouteLoaderContextValue>({
  start: () => {},
});

export function useRouteLoader() {
  return useContext(RouteLoaderContext);
}

// Once shown, the loader stays up at least this long — a route that
// resolves instantly (already-cached client navigation) would otherwise
// make it flash for a single frame, which reads as a glitch rather than
// a loading state.
const MIN_VISIBLE_MS = 3000;
const SAFETY_TIMEOUT_MS = 8000;

export function RouteLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const prevPathname = useRef(pathname);
  const shownAt = useRef<number | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    setActive(true);
    shownAt.current = Date.now();
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    safetyTimer.current = setTimeout(() => setActive(false), SAFETY_TIMEOUT_MS);
  }

  function hide() {
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    const elapsed = shownAt.current ? Date.now() - shownAt.current : MIN_VISIBLE_MS;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (remaining === 0) {
      setActive(false);
    } else {
      hideTimer.current = setTimeout(() => setActive(false), remaining);
    }
  }

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Catches every in-app navigation — sidebar links, tab bar, "View all"
  // links, etc. — without requiring each one to call `start()` manually.
  // Listens in the capture phase so it fires before Next's own Link
  // click handler does its (synchronous) navigation.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      start();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RouteLoaderContext.Provider value={{ start }}>
      {children}
      {active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base/80 backdrop-blur-sm">
          <div className="spin-gradient-ring flex h-20 w-20 items-center justify-center rounded-full">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-base-raised">
              <Image
                src="/favicon.png"
                alt=""
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </RouteLoaderContext.Provider>
  );
}
