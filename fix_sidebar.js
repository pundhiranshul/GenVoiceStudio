const fs = require('fs');

function updateSidebar() {
  let content = fs.readFileSync('src/components/SidebarLayout.tsx', 'utf8');

  // Add beforeunload hook
  const hookCode = `  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (typeof window !== "undefined" && (window as any).isGenerating) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show confirmation dialog
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);\n`;

  const insertPoint = 'const navItems = [';
  if (!content.includes('beforeunload')) {
    content = content.replace(insertPoint, hookCode + '\n  ' + insertPoint);
  }

  // Update logo onClick
  const oldLogoClick = `onClick={(e) => {
            if (typeof window !== "undefined" && (window as any).isGenerating) {
              if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                e.preventDefault();
                return;
              }
            }
            setIsMobileOpen(false);
          }}`;
  
  const newLogoClick = `onClick={(e) => {
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
          }}`;
  
  content = content.replace(oldLogoClick, newLogoClick);

  // Update navItem onClick
  const oldNavClick = `onClick={(e) => {
                  if (typeof window !== "undefined" && (window as any).isGenerating) {
                    if (!confirm("You have an active generation running. Are you sure you want to navigate away? Progress will be lost.")) {
                      e.preventDefault();
                      return;
                    }
                  }
                  setIsMobileOpen(false);
                }}`;
  
  const newNavClick = `onClick={(e) => {
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
                }}`;

  content = content.replace(oldNavClick, newNavClick);

  fs.writeFileSync('src/components/SidebarLayout.tsx', content);
}

updateSidebar();
