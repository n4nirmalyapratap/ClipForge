import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Film, Video, Share2, Settings } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Jobs", href: "/jobs", icon: Film },
    { name: "Clips", href: "/clips", icon: Video },
    { name: "Accounts", href: "/accounts", icon: Share2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-border bg-sidebar h-screen flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tighter">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">C</div>
          CLIPFORGE
        </div>
      </div>
      <div className="flex-1 py-6 px-3 flex flex-col gap-1">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Menu</div>
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="p-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs border border-border">
            US
          </div>
          <div className="text-sm font-medium">Creator Mode</div>
        </div>
      </div>
    </aside>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col min-h-screen relative">
        {children}
      </main>
    </div>
  );
}
