"use client";
import { SignOutModal } from "@/components/SignOutModal";
import { FeedbackModal } from "@/components/FeedbackModal";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mic, AudioLines, Bug, ChevronLeft, ChevronRight, Menu, X, Wand2, Library, LogOut, MessageSquareHeart } from "lucide-react";
import { getAuthInfo, handleSignOut } from "@/lib/auth";

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
  const [authInfo, setAuthInfo] = useState<{ isAuthenticated: boolean; username: string; authType: 'kaggle' | 'admin' | null }>({
    isAuthenticated: false,
    username: '',
    authType: null,
  });
  const [showSignOut, setShowSignOut] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<'poll' | 'report'>('report');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'suggestion' | 'other'>('bug');
  const [feedbackTrigger, setFeedbackTrigger] = useState<'generation' | 'exit' | 'manual' | 'bug'>('bug');
  const [feedbackAutoSubmit, setFeedbackAutoSubmit] = useState(false);
  const [isFeedbackDocked, setIsFeedbackDocked] = useState(false);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const submitted = Boolean(localStorage.getItem('genvoice_feedback_submitted'));
    setIsFeedbackSubmitted(submitted);
    if (!submitted) {
      setIsFeedbackDocked(localStorage.getItem('genvoice_feedback_docked') === 'true');
    } else {
      setIsFeedbackDocked(false);
    }
  }, []);

  const handleOpenReportBug = () => {
    setFeedbackMode('report');
    setFeedbackCategory('bug');
    setFeedbackTrigger('bug');
    setShowFeedback(true);
  };

  useEffect(() => {
    const handleOpenSignOut = () => setShowSignOut(true);
    const handleOpenFeedback = (e: any) => {
      const detail = e.detail || {};
      if (detail.mode === 'report' || detail.trigger === 'bug') {
        setFeedbackMode('report');
        setFeedbackCategory(detail.category || 'bug');
        setFeedbackTrigger(detail.trigger || 'bug');
        setShowFeedback(true);
        return;
      }
      if (typeof window !== "undefined" && localStorage.getItem('genvoice_feedback_submitted')) return;
      setFeedbackMode('poll');
      setFeedbackTrigger(detail.trigger || 'manual');
      setFeedbackAutoSubmit(Boolean(detail.autoSubmit));
      setShowFeedback(true);
    };
    const handleFeedbackSubmitted = () => {
      setIsFeedbackSubmitted(true);
      setIsFeedbackDocked(false);
      setShowFeedback(false);
    };
    const handleFeedbackDocked = () => {
      setIsFeedbackDocked(true);
    };

    window.addEventListener('open-signout', handleOpenSignOut);
    window.addEventListener('open-feedback', handleOpenFeedback);
    window.addEventListener('open-report-bug', handleOpenReportBug);
    window.addEventListener('feedback-submitted', handleFeedbackSubmitted);
    window.addEventListener('feedback-docked-changed', handleFeedbackDocked);

    return () => {
      window.removeEventListener('open-signout', handleOpenSignOut);
      window.removeEventListener('open-feedback', handleOpenFeedback);
      window.removeEventListener('open-report-bug', handleOpenReportBug);
      window.removeEventListener('feedback-submitted', handleFeedbackSubmitted);
      window.removeEventListener('feedback-docked-changed', handleFeedbackDocked);
    };
  }, []);

  const handleCloseFeedback = () => {
    setShowFeedback(false);
    if (feedbackMode === 'poll' && typeof window !== "undefined" && !localStorage.getItem('genvoice_feedback_submitted')) {
      setIsFeedbackDocked(true);
      localStorage.setItem('genvoice_feedback_docked', 'true');
    }
  };

  const handleOpenManualFeedback = () => {
    setFeedbackMode('report');
    setFeedbackCategory('suggestion');
    setFeedbackTrigger('manual');
    setShowFeedback(true);
  };

  // Close mobile sidebar when pathname changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      setAuthInfo(getAuthInfo());
    };
    update();
    const interval = setInterval(update, 2000);
    window.addEventListener('auth-changed', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('auth-changed', update);
    };
  }, []);

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

  const bottomItems: Array<{
    name: string;
    href: string;
    icon: any;
    onClick?: (e: any) => void;
    external?: boolean;
  }> = [
    { name: "Report Bug", href: "#", icon: Bug, onClick: (e: any) => { e.preventDefault(); handleOpenReportBug(); } }
  ];

  return (
    <div className="flex h-[100dvh] md:h-screen w-full bg-bg-base overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-[100] flex flex-col h-full bg-bg-panel border-r border-border-color transition-all duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border-color shrink-0 overflow-hidden">
          <Link 
            href="/" 
            className="flex items-center h-12 w-full rounded-xl px-1.5 overflow-hidden" 
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                setIsMobileOpen(false);
                window.location.reload();
                return;
              }
              if (typeof window !== "undefined" && (window as any).isGenerating) {
                if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                  e.preventDefault();
                  return;
                }
              }
            }}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <GenVoiceLogo size={40} className="shrink-0 text-text-primary" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[180px] opacity-100 ml-1.5"}`}>
              <span className="font-semibold text-lg tracking-tight whitespace-nowrap text-text-primary">GenVoice Studio</span>
            </div>
          </Link>
          
          <button 
            className="md:hidden p-1 text-text-muted hover:text-text-primary"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3 overflow-x-hidden">
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
                    // Force a hard navigation to reset the page state if they click the active tab
                    window.location.reload();
                    return;
                  }
                  if (typeof window !== "undefined" && (window as any).isGenerating) {
                    if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                      e.preventDefault();
                      return;
                    }
                  }
                  // If navigating away from voice generation tab without generating voice
                  if (pathname === "/" && item.href !== "/") {
                    const hasGen = typeof window !== "undefined" ? localStorage.getItem('genvoice_has_generated_voice') : null;
                    const hasFeedback = typeof window !== "undefined" ? localStorage.getItem('genvoice_feedback_submitted') : null;
                    const exitShown = typeof window !== "undefined" ? sessionStorage.getItem('genvoice_exit_feedback_shown') : null;
                    if (!hasGen && !hasFeedback && !exitShown) {
                      e.preventDefault();
                      sessionStorage.setItem('genvoice_exit_feedback_shown', 'true');
                      setFeedbackTrigger('exit');
                      setFeedbackAutoSubmit(true);
                      setShowFeedback(true);
                      return;
                    }
                  }
                }}
                className={`flex items-center h-11 w-full px-1.5 rounded-xl transition-colors outline-none shrink-0 group ${
                  isActive 
                    ? "bg-accent-bg text-accent-text font-medium shadow-sm" 
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="w-11 h-11 flex items-center justify-center shrink-0">
                  <Icon size={18} className="shrink-0" />
                </div>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
                    isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[180px] opacity-100 ml-1.5"
                  }`}
                >
                  <span className="whitespace-nowrap text-sm font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Docked Feedback Button in Left Panel */}
        {isFeedbackDocked && !isFeedbackSubmitted && (
          <div className="px-3 pb-2 pt-1 border-t border-border-color shrink-0 overflow-hidden">
            <button
              onClick={handleOpenManualFeedback}
              className="w-full h-11 flex items-center px-1.5 rounded-xl transition-all outline-none border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium group cursor-pointer shrink-0"
              title="Give Feedback"
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <MessageSquareHeart size={18} className="shrink-0 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center justify-between min-w-0 ${
                  isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "flex-1 opacity-100 ml-1.5 pr-2"
                }`}
              >
                <span className="text-sm font-semibold truncate">Give Feedback</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-1" />
              </div>
            </button>
          </div>
        )}

        {/* Bottom Area (About & Report Bug) */}
        <div className="p-3 border-t border-border-color flex flex-col gap-1 shrink-0 overflow-hidden">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <div className="w-11 h-11 flex items-center justify-center shrink-0">
                  <Icon size={18} className="shrink-0" />
                </div>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
                    isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[180px] opacity-100 ml-1.5"
                  }`}
                >
                  <span className="whitespace-nowrap text-sm">{item.name}</span>
                </div>
              </>
            );

            const className = "flex items-center h-11 w-full px-1.5 rounded-xl transition-colors text-text-secondary hover:bg-bg-hover hover:text-text-primary outline-none shrink-0";
            
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

        {/* User Profile / Status */}
        <div className={`p-3 border-t border-border-color bg-bg-panel/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} overflow-hidden min-h-[56px] shrink-0`}>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col justify-center ${
              isCollapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[170px] opacity-100 pl-1.5 pr-1"
            }`}
          >
            <span className="text-xs font-semibold text-text-primary truncate leading-tight">
              {authInfo.username || 'Studio User'}
            </span>
            <span className="text-[10px] text-text-muted font-medium tracking-wide truncate">
              {authInfo.authType === 'kaggle' ? 'Kaggle Authenticated' : authInfo.authType === 'admin' ? 'Admin Access' : 'Not Signed In'}
            </span>
          </div>
          {authInfo.isAuthenticated && (
            <button
              onClick={() => setShowSignOut(true)}
              className={`${
                isCollapsed ? "w-11 h-11" : "p-2"
              } flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-bg-hover rounded-xl transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring-color`}
              title="Sign Out (flushes auth, keeps your generated items)"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-bg-panel border border-border-color rounded-full items-center justify-center text-text-muted hover:text-text-primary shadow-sm z-[100] transition-transform hover:scale-110"
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
      {showSignOut && <SignOutModal onClose={() => setShowSignOut(false)} />}
      <FeedbackModal
        isOpen={showFeedback}
        mode={feedbackMode}
        initialCategory={feedbackCategory}
        trigger={feedbackTrigger}
        autoSubmit={feedbackAutoSubmit}
        onClose={handleCloseFeedback}
        onSubmitSuccess={() => {
          if (feedbackMode === 'poll') {
            setIsFeedbackSubmitted(true);
            setIsFeedbackDocked(false);
          }
        }}
      />
    </div>
  );
}
