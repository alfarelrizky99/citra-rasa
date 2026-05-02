import { useState, TouchEvent, ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pullDistance = isPulling ? Math.max(0, currentY - startY) : 0;
  
  // Gojek style is compact and native-like.
  const maxPull = 100; 
  const triggerDistance = 60; 

  const pullPercentage = Math.min(100, (pullDistance / triggerDistance) * 100);

  const handleTouchStart = (e: TouchEvent) => {
    if (isRefreshing) return;

    // Hanya aktif jika menyentuh header atau nav
    const target = e.target as HTMLElement | null;
    if (!target?.closest('header') && !target?.closest('nav')) {
      return;
    }

    // Check if any ancestor scroll container is scrolled down
    let isScrolled = false;
    let current = target;
    
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.scrollTop > 0) {
        isScrolled = true;
        break;
      }
      current = current.parentElement;
    }

    // Also check window scroll
    if (window.scrollY > 0) {
      isScrolled = true;
    }

    if (!isScrolled) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const y = e.touches[0].clientY;
    if (y > startY) {
      setCurrentY(y);
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (pullDistance >= triggerDistance && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        // Give time for animation before resetting
        setTimeout(() => {
          setIsRefreshing(false);
          setStartY(0);
          setCurrentY(0);
        }, 500);
      }
    } else {
      setStartY(0);
      setCurrentY(0);
    }
  };

  // Determine indicator position
  let translateY = 0;
  if (isRefreshing) {
    translateY = 60; // Fixed position while refreshing
  } else if (isPulling) {
    translateY = Math.min(maxPull, pullDistance * 0.5); // Resistance feel
  }

  // Gojek style indicator: White circle with shadow and a spinner/arrow that rotates as you pull
  return (
    <div 
      className="min-h-screen relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating Indicator (Native/Gojek style) */}
      <div 
        className="fixed top-0 left-0 right-0 flex justify-center z-[100] pointer-events-none transition-transform"
        style={{ 
          transform: `translateY(${translateY - 50}px)`, // starts hidden at -50px
          transitionDuration: isPulling ? '0ms' : '300ms',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <div 
          className="w-10 h-10 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden"
          style={{
            opacity: translateY > 10 ? 1 : 0,
            transform: `scale(${isRefreshing ? 1 : Math.min(1, pullPercentage / 100)})`,
            transition: isPulling ? 'none' : 'all 300ms ease-out'
          }}
        >
          {isRefreshing ? (
            <Loader2 className="w-6 h-6 text-padang-600 animate-spin" />
          ) : (
            <div 
              className="text-padang-600"
              style={{ transform: `rotate(${pullPercentage * 3.6}deg)` }} // Rotates as you pull
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Main Content wrapper */}
      <div className="h-full w-full bg-white relative">
        {children}
      </div>
    </div>
  );
}
