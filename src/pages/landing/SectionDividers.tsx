/**
 * SectionDividers — Elegant SVG wave/curve transitions between landing page sections.
 * Colors are matched exactly to the tailwind.config.js palette.
 *
 * Section flow & backgrounds:
 * Hero (#411507 overlay) → DeliveryBanner (gradient #de5d0e → #ea5812 → #e73027 → #ef6711)
 * DeliveryBanner → Menu (#fef7ee → white)
 * Menu (white) → About (#411507)
 * About (#411507) → Location (white → #fef7ee)
 * Location (#fef7ee) → Payment (#411507)
 */

// ─── Hero → DeliveryBanner ───────────────────────────────────────
export function HeroToDeliveryDivider() {
  return (
    <div className="relative -mt-px z-[1]">
      <svg viewBox="0 0 1440 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '62px' }}>
        {/* Dark hero bg flowing down */}
        <path d="M0,0 L1440,0 L1440,18 Q1210,54 980,32 Q720,6 470,34 Q225,62 0,22 Z" fill="#411507" />
        {/* Warm gradient rising up, matched to DeliveryToMenuDivider */}
        <path d="M0,22 Q225,62 470,34 Q720,6 980,32 Q1210,54 1440,18 L1440,84 L0,84 Z" fill="url(#h2d)" />
        <defs>
          <linearGradient id="h2d" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#de5d0e" />
            <stop offset="24%" stopColor="#ea5812" />
            <stop offset="54%" stopColor="#e73027" />
            <stop offset="72%" stopColor="#ef6711" />
            <stop offset="100%" stopColor="#ef6711" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── DeliveryBanner → Menu ───────────────────────────────────────
export function DeliveryToMenuDivider() {
  return (
    <div className="relative -mt-px z-[1]">
      <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '70px' }}>
        {/* Gradient top from delivery banner */}
        <path d="M0,0 L1440,0 L1440,30 Q1080,70 720,30 Q360,-10 0,40 Z" fill="url(#d2m_top)" />
        {/* Main cream wave */}
        <path d="M0,40 Q360,-10 720,30 Q1080,70 1440,30 L1440,100 L0,100 Z" fill="#fef7ee" />
        <defs>
          <linearGradient id="d2m_top" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#de5d0e" />
            <stop offset="24%" stopColor="#ea5812" />
            <stop offset="54%" stopColor="#e73027" />
            <stop offset="72%" stopColor="#ef6711" />
            <stop offset="100%" stopColor="#ef6711" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Menu → About ────────────────────────────────────────────────
export function MenuToAboutDivider() {
  return (
    <div className="relative -mt-px z-[1]">
      <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '80px' }}>
        {/* White/cream bg from menu */}
        <rect width="1440" height="120" fill="white" />
        {/* Organic curve swooping into dark */}
        <path d="M0,70 C200,100 400,40 600,70 C800,100 1000,45 1200,80 C1350,100 1440,60 1440,60 L1440,120 L0,120 Z" fill="#411507" />
        {/* Warm spice accent line along the curve */}
        <path d="M0,72 C200,102 400,42 600,72 C800,102 1000,47 1200,82 L1200,78 C1000,43 800,98 600,68 C400,38 200,98 0,68 Z" fill="#de5d0e" opacity="0.15" />
        {/* Decorative gold dots along the curve */}
        <circle cx="200" cy="82" r="2.5" fill="#fbbf24" opacity="0.4" />
        <circle cx="500" cy="58" r="2" fill="#fbbf24" opacity="0.3" />
        <circle cx="800" cy="78" r="3" fill="#fbbf24" opacity="0.35" />
        <circle cx="1100" cy="62" r="2" fill="#fbbf24" opacity="0.25" />
      </svg>
    </div>
  );
}

// ─── About → Location ────────────────────────────────────────────
export function AboutToLocationDivider() {
  return (
    <div className="relative -mt-px z-[1]">
      <svg viewBox="0 0 1440 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '75px' }}>
        {/* Dark bg from about */}
        <rect width="1440" height="110" fill="#411507" />
        {/* Smooth wave transitioning to white */}
        <path d="M0,50 C320,90 640,20 960,60 C1150,85 1300,35 1440,55 L1440,110 L0,110 Z" fill="white" />
        {/* Gold shimmer accent */}
        <path d="M0,55 C320,95 640,25 960,65 L960,60 C640,20 320,90 0,50 Z" fill="#fbbf24" opacity="0.1" />
        {/* Decorative spice dots */}
        <circle cx="250" cy="65" r="2" fill="#fbbf24" opacity="0.5" />
        <circle cx="600" cy="38" r="1.5" fill="#fbbf24" opacity="0.35" />
        <circle cx="1000" cy="55" r="2.5" fill="#fbbf24" opacity="0.4" />
        <circle cx="1300" cy="42" r="1.5" fill="#fbbf24" opacity="0.3" />
      </svg>
    </div>
  );
}

// ─── Location → Payment ──────────────────────────────────────────
export function LocationToPaymentDivider() {
  return (
    <div className="relative -mt-px z-[1]">
      <svg viewBox="0 0 1440 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '75px' }}>
        {/* Light bg from location */}
        <path d="M0,0 L1440,0 L1440,110 L0,110 Z" fill="#fef7ee" />
        {/* Main wave transition into dark */}
        <path d="M0,40 C180,80 420,15 660,55 C900,95 1140,25 1440,65 L1440,110 L0,110 Z" fill="#411507" />
        {/* Layered depth wave */}
        <path d="M0,50 C240,85 480,30 720,65 C960,100 1200,38 1440,72 L1440,78 C1200,44 960,106 720,71 C480,36 240,91 0,56 Z" fill="#782d14" opacity="0.4" />
        {/* Sparkle dots */}
        <circle cx="360" cy="48" r="2" fill="#fbbf24" opacity="0.5" />
        <circle cx="720" cy="40" r="2.5" fill="#fbbf24" opacity="0.35" />
        <circle cx="1080" cy="45" r="2" fill="#fbbf24" opacity="0.45" />
      </svg>
    </div>
  );
}
