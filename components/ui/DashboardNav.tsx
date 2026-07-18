"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, BarChart2, Settings, LogOut } from "lucide-react";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userEmail");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      // ignore silently for nav
    }
  };

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/wishlist", label: "Wishlist", icon: CheckSquare },
    { href: "/dashboard/clients", label: "Clients", icon: Users },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart2 },
  ];

  return (
    <nav className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-12 h-14 sm:h-16 flex items-center justify-between w-full">
        <div className="flex flex-1 items-center justify-around sm:justify-start gap-1 sm:gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/dashboard" 
              ? pathname === "/dashboard" || (!pathname.includes("/wishlist") && !pathname.includes("/clients") && !pathname.includes("/reports") && !pathname.includes("/settings"))
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none ${
                  isActive 
                    ? "bg-zinc-800/50 text-zinc-100" 
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30"
                }`}
                title={link.label}
              >
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="flex items-center justify-around sm:justify-end gap-1 sm:gap-2 pl-2 sm:pl-4 sm:border-l border-zinc-800 shrink-0">
          <Link
            href="/dashboard/settings"
            className={`flex flex-col sm:flex-row items-center justify-center p-2 sm:h-9 sm:w-9 rounded-lg transition-colors ${
              pathname === "/dashboard/settings" 
                ? "bg-zinc-800/50 text-zinc-100" 
                : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-100"
            }`}
            title="Settings"
          >
            <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col sm:flex-row items-center justify-center p-2 sm:h-9 sm:w-9 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
