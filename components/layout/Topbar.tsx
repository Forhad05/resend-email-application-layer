"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, LogOut, Settings, User as UserIcon, Shield } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      // Fallback redirect
      window.location.href = "/login";
    }
  };

  // Extract friendly title from path
  const title =
    pathname === "/" || pathname === "/inbox"
      ? "Inbox"
      : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2);

  const userName = session?.user?.name || "Admin User";
  const userEmail = session?.user?.email || "admin@mail.systemdevify.com";
  const avatarLetter = userName.charAt(0).toUpperCase() || "A";

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
          className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* User Profile Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-700 transition"
          >
            <div className="h-8 w-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black flex items-center justify-center text-xs font-semibold shadow-sm">
              {avatarLetter}
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 py-2 z-50">
              {/* User Identity Details */}
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {userName}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {userEmail}
                </p>
              </div>

              {/* Navigation Options */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <span>Account & Sender Settings</span>
                </Link>
                <Link
                  href="/contacts"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <UserIcon className="h-4 w-4 text-zinc-400" />
                  <span>Team & Contacts</span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
