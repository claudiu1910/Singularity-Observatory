"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const NAV = [
  { label: "Observatory", href: "/observatory" },
  { label: "Platform", href: "/#platform" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Access", href: "/access" },
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="6" fill="currentColor" />
      <ellipse cx="16" cy="16" rx="14" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

/** Fixed header that frosts once the page scrolls, plus a thin scroll-progress line. */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setScrolled(window.scrollY > 24);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-b border-white/10 bg-black/55 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-white">
          <LogoMark className="size-7 text-ember transition-transform duration-700 ease-out group-hover:rotate-180" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">Singularity</span>
        </Link>
        <ul className="hidden items-center gap-1 text-sm text-white/65 md:flex">
          {NAV.map((item) => {
            const active = !item.href.includes("#") && pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/8 hover:text-white",
                    active && "bg-white/10 text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/access"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "rounded-full border-white/15 bg-white/5 px-4 text-white backdrop-blur-md hover:bg-white/10 dark:bg-white/5",
          )}
        >
          Request access
        </Link>
      </nav>
      {/* Compact route switcher for small screens. */}
      <ul className="flex items-center gap-1 overflow-x-auto px-3 pb-2 text-xs text-white/65 md:hidden">
        {NAV.map((item) => {
          const active = !item.href.includes("#") && pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("block rounded-full px-3 py-1 whitespace-nowrap", active ? "bg-white/10 text-white" : "hover:text-white")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div
        ref={progressRef}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-ember/0 via-ember to-ember/0"
      />
    </header>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-border/60", className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5 text-ember" />
          <span>© {new Date().getFullYear()} Singularity Observatory</span>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs">Rendered in real time on your GPU</p>
      </div>
    </footer>
  );
}
