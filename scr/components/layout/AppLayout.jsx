import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Target, Users, Settings, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

export default function AppLayout() {
  const location = useLocation();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { path: "/", labelKey: "dashboard", icon: LayoutDashboard },
    { path: "/entries", labelKey: "entries", icon: CalendarDays },
    { path: "/goals", labelKey: "goals", icon: Target },
    { path: "/compare", labelKey: "compare", icon: Users },
    { path: "/history", labelKey: "history", icon: TrendingUp },
    { path: "/settings", labelKey: "settings", icon: Settings },
  ];

  return (
    <div
      className="min-h-screen bg-background flex"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-sm fixed h-full z-30">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            StatTracker
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 select-none ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content desktop */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 select-none transition-colors duration-150 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="w-1 h-1 rounded-full bg-primary mt-0.5"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}