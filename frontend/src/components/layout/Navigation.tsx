"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Stethoscope, MessageSquare, Bell, 
  Wallet, FileText, User, UserSquare2, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Hide nav on landing page or auth
  if (pathname === "/" || pathname === "/auth") return null;

  // Dynamic Navigation Items by Role
  const navItems = user?.role === "doctor" 
    ? [
        { label: "Dashboard", icon: Home, href: "/doctor-dashboard" },
        { label: "Records", icon: FileText, href: "/prescriptions" },
        { label: "Profile", icon: User, href: "/profile" },
      ]
    : [
        { label: "Home", icon: Home, href: "/dashboard" },
        { label: "Doctors", icon: Stethoscope, href: "/doctors" },
        { label: "Triage", icon: MessageSquare, href: "/triage" },
        { label: "Wallet", icon: Wallet, href: "/wallet" },
        { label: "Records", icon: FileText, href: "/prescriptions" },
        { label: "Profile", icon: User, href: "/profile" },
      ];

  return (
    <>
      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b items-center px-6 z-50 justify-between shadow-sm">
        <Link href={user?.role === "doctor" ? "/doctor-dashboard" : "/dashboard"} className="text-xl font-bold text-primary flex items-center gap-2">
          <Stethoscope className="w-6 h-6" />
          <span>GraminDoc AI</span>
        </Link>
        <div className="flex gap-8 h-full">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-semibold transition-all hover:text-primary flex items-center gap-2 px-1 relative",
                pathname === item.href 
                  ? "text-primary after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
                  : "text-slate-500"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative p-2 text-slate-500 hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Link>
          <div className="w-px h-6 bg-slate-200" />
          
          <div className="flex items-center gap-2">
            <Link 
              href="/profile" 
              className="flex items-center gap-2 p-1.5 px-3 rounded-full hover:bg-slate-50 transition-colors"
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white",
                user?.role === "doctor" ? "bg-accent" : "bg-primary"
              )}>
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <span className="text-xs font-bold text-slate-700 hidden lg:inline">
                {user?.full_name || "Profile"}
              </span>
            </Link>
            
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t h-18 md:h-20 flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[56px] py-2",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive 
                  ? (user?.role === "doctor" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary") 
                  : "bg-transparent"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
