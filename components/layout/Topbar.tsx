"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

export function Topbar() {
  const pathname = usePathname();

  // Extract friendly title from path
  const title =
    pathname === "/" || pathname === "/inbox"
      ? "Inbox"
      : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Search */}
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search threads, contacts..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>

        {/* Notification Icon */}
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User avatar indicator */}
        <div className="h-8 w-8 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black flex items-center justify-center text-xs font-semibold">
          A
        </div>
      </div>
    </header>
  );
}

