"use client";
import { AboutModal } from "@/components/AboutModal";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, AudioLines, Bug, Info, ChevronLeft, ChevronRight, Menu, X, User, Wand2, Library } from "lucide-react";

const GenVoiceLogo = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sl-bg" cx="50%" cy="38%" r="75%">
        <stop offset="0%" stopColor="#232326"/>
        <stop offset="100%" stopColor="#0A0A0B"/>
      </radialGradient>
      <linearGradient id="sl-bar" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#C9C9CE"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="200" height="200" rx="44" fill="url(#sl-bg)"/>
    <rect x="1" y="1" width="198" height="198" rx="43" fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="2"/>
    <rect x="22"  y="75"  width="20" height="50"  rx="10" fill="url(#sl-bar)" opacity="0.55"/>
    <rect x="56"  y="55"  width="20" height="90"  rx="10" fill="url(#sl-bar)" opacity="0.80"/>
    <rect x="90"  y="35"  width="20" height="130" rx="10" fill="url(#sl-bar)" opacity="1"/>
    <rect x="124" y="55"  width="20" height="90"  rx="10" fill="url(#sl-bar)" opacity="0.80"/>
    <rect x="158" y="75"  width="20" height="50"  rx="10" fill="url(#sl-bar)" opacity="0.55"/>
  </svg>
);

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleOpenAbout = () => setShowAbout(true);
    window.addEventListener('open-architecture', handleOpenAbout);
    return () => window.removeEventListener('open-architecture', handleOpenAbout);
  }, []);

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

    useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (typeof window !== "undefined" && (window as any).isGenerating) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show confirmation dialog
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const navItems = [
    { name: "Generate Voice", href: "/", icon: Mic },
    { name: "Voice Design", href: "/voice-design", icon: Wand2 },
    { name: "Sound Effects", href: "/sfx", icon: AudioLines },
    { name: "Library", href: "/library", icon: Library }
  ];

  const bottomItems = [
    { name: "System Architecture", href: "#", icon: Info, onClick: (e: any) => { e.preventDefault(); window.dispatchEvent(new Event('open-architecture')); } },
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
        <div className={`h-16 flex items-center px-4 border-b border-border-color shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/" className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`} onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              setIsMobileOpen(false);
              return;
            }
            if (typeof window !== "undefined" && (window as any).isGenerating) {
              if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                e.preventDefault();
                return;
              }
            }
            setIsMobileOpen(false);
          }}>
            <GenVoiceLogo size={42} className={`shrink-0 text-text-primary ${isCollapsed ? "mx-auto" : ""}`} />
            {!isCollapsed && <span className="font-semibold text-lg tracking-tight whitespace-nowrap text-text-primary">GenVoice Studio</span>}
          </Link>
          
          <button 
            className="md:hidden p-1 text-text-muted hover:text-text-primary"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
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
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    setIsMobileOpen(false);
                    return;
                  }
                  if (typeof window !== "undefined" && (window as any).isGenerating) {
                    if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                      e.preventDefault();
                      return;
                    }
                  }
                  setIsMobileOpen(false);
                }}
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

        {/* User Profile */}
        <div className={`p-4 border-t border-border-color bg-bg-panel/50 flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-border-color/30 flex items-center justify-center shrink-0 border border-border-color/50">
            <User size={15} className="text-text-secondary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-text-primary truncate leading-tight">{username || 'Studio User'}</span>
              <span className="text-[10px] text-text-muted font-medium tracking-wide">Kaggle Authenticated</span>
            </div>
          )}
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
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 bg-bg-panel border-b border-border-color shrink-0 z-30 relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 -ml-1.5 text-text-primary hover:bg-bg-hover rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            >
              <Menu size={24} />
            </button>
            <span className="font-semibold text-text-primary text-sm">GenVoice Studio</span>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}
