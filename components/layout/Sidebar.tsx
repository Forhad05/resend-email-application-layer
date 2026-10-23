"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  PenSquare,
  FileText,
  Users,
  BarChart2,
  Settings,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnreadCountAction } from "@/lib/email/inbox-actions";

const navigation = [
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Compose", href: "/compose", icon: PenSquare },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchUnread = async () => {
      try {
        const count = await getUnreadCountAction();
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch {
        // Silently catch background errors
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 5000);
    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <aside className="w-64 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between h-screen sticky top-0 shrink-0">
      <div>
        {/* Logo / Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="h-9 w-9 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Internal Mail
            </h1>
            <p className="text-xs text-zinc-500">Support & Transactional</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>

                {item.name === "Inbox" && unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
        <span>Resend + Postgres</span>
        <span
          className="flex h-2 w-2 rounded-full bg-emerald-500"
          title="DB Connected"
        />
      </div>
    </aside>
  );
}
