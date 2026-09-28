"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, AudioLines, Bug, Info, ChevronLeft, ChevronRight, Menu, X, User } from "lucide-react";

const GenVoiceLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
    <rect x="2" y="2" width="96" height="96" rx="16" fill="#F8F3E9" stroke="#C2BFD0" strokeWidth="4" />
    <rect x="22" y="36" width="14" height="8" rx="4" fill="#A6C1A9" />
    <rect x="22" y="46" width="14" height="8" rx="4" fill="#ACDEB8" />
    <rect x="22" y="56" width="14" height="8" rx="4" fill="#CFE98F" />
    <rect x="22" y="66" width="14" height="8" rx="4" fill="#A5D6EE" />
    <rect x="22" y="76" width="14" height="8" rx="4" fill="#8FBEEC" />
    <rect x="43" y="26" width="14" height="8" rx="4" fill="#D78B95" />
    <rect x="43" y="36" width="14" height="8" rx="4" fill="#E1A2AA" />
    <rect x="43" y="46" width="14" height="8" rx="4" fill="#ECA194" />
    <rect x="43" y="56" width="14" height="8" rx="4" fill="#EEAF81" />
    <rect x="43" y="66" width="14" height="8" rx="4" fill="#F4CD83" />
    <rect x="43" y="76" width="14" height="8" rx="4" fill="#F9E493" />
    <rect x="64" y="36" width="14" height="8" rx="4" fill="#A6C1A9" />
    <rect x="64" y="46" width="14" height="8" rx="4" fill="#ACDEB8" />
    <rect x="64" y="56" width="14" height="8" rx="4" fill="#CFE98F" />
    <rect x="64" y="66" width="14" height="8" rx="4" fill="#A5D6EE" />
    <rect x="64" y="76" width="14" height="8" rx="4" fill="#8FBEEC" />
  </svg>
);

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [username, setUsername] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const u = localStorage.getItem("kaggleUsername");
    if (u) setUsername(u);
    
    // Poll for username changes (simple sync across tabs/components)
    const interval = setInterval(() => {
      const current = localStorage.getItem("kaggleUsername");
      if (current !== username) setUsername(current || "");
    }, 2000);
    return () => clearInterval(interval);
  }, [username]);

  const navItems = [
    { name: "Generate Voice", href: "/", icon: Mic },
    { name: "Sound Effects", href: "/sfx", icon: AudioLines }
  ];

  const bottomItems = [
    { name: "System Architecture", href: "#", icon: Info, onClick: () => window.dispatchEvent(new Event('open-architecture')) },
    { name: "Report Bug", href: "https://github.com/pundhiranshul/GenVoiceStudio/issues/new", icon: Bug, external: true }
  ];

  return (
    <div className="flex h-[100dvh] md:h-screen w-full bg-bg-base overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-50 flex flex-col h-full bg-bg-panel border-r border-border-color transition-all duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-color shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden" onClick={() => setIsMobileOpen(false)}>
            <GenVoiceLogo size={32} className="shrink-0 text-text-primary" />
            {!isCollapsed && <span className="font-semibold text-lg tracking-tight whitespace-nowrap text-text-primary">GenVoice Studio</span>}
          </Link>
          
          <button 
            className="md:hidden p-1 text-text-muted hover:text-text-primary"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Greeting */}
        <div className={`p-4 border-b border-border-color/50 flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-accent-bg/10 flex items-center justify-center shrink-0">
            <User size={16} className="text-accent-bg" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Welcome</span>
              <span className="text-sm font-medium text-text-primary truncate">{username || 'Studio User'}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors outline-none
                  ${isActive 
                    ? "bg-accent-bg text-accent-text font-medium shadow-sm" 
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Area (About & Report Bug) */}
        <div className="p-3 border-t border-border-color flex flex-col gap-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.name}</span>}
              </>
            );

            const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-text-secondary hover:bg-bg-hover hover:text-text-primary outline-none ${isCollapsed ? "justify-center" : ""}`;
            
            if (item.external) {
              return (
                <a key={item.name} href={item.href} target="_blank" rel="noreferrer" className={className} title={isCollapsed ? item.name : undefined}>
                  {content}
                </a>
              );
            }

            return (
              <button key={item.name} onClick={item.onClick} className={className} title={isCollapsed ? item.name : undefined}>
                {content}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-bg-panel border border-border-color rounded-full items-center justify-center text-text-muted hover:text-text-primary shadow-sm z-50 transition-transform hover:scale-110"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Header Trigger */}
        <div className="md:hidden absolute top-0 left-0 h-16 w-16 flex items-center justify-center z-[60]">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-text-primary hover:bg-bg-hover rounded-lg transition-colors bg-bg-base/80 backdrop-blur-sm"
          >
            <Menu size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
