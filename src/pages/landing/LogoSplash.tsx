import { useState, useEffect } from 'react';

export default function LogoSplash() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('splash_shown');
    if (shown) { setVisible(false); return; }
    const t1 = setTimeout(() => setFadeOut(true), 2200);
    const t2 = setTimeout(() => { setVisible(false); sessionStorage.setItem('splash_shown', '1'); }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-padang-950 flex flex-col items-center justify-center ${fadeOut ? 'animate-splash-out' : ''}`}>
      <div className="absolute inset-0 pattern-overlay opacity-20" />
      <img
        src="/logo-citrarasa.png"
        alt="Citra Rasa"
        className="h-40 sm:h-52 w-auto object-contain animate-logo-zoom animate-logo-pulse relative z-10 drop-shadow-2xl"
      />
    </div>
  );
}
