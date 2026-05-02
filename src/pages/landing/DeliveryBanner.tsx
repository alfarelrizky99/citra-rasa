import { Gift, Sparkles } from 'lucide-react';

export default function DeliveryBanner() {
  return (
    <section
      className="relative isolate overflow-hidden py-5 sm:py-6"
      style={{
        background: `
          radial-gradient(circle at 50% 18%, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0.07) 28%, rgba(239, 68, 68, 0) 58%),
          linear-gradient(90deg, #de5d0e 0%, #ea5812 24%, #e73027 54%, #ef6711 72%, #ef6711 100%)
        `,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(222, 93, 14, 0.08) 0%, rgba(239, 103, 17, 0.04) 18%, rgba(239, 103, 17, 0) 42%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.035) 0%, rgba(251, 191, 36, 0.012) 26%, rgba(251, 191, 36, 0) 52%)',
        }}
      />

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-delivery-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
          {/* Left sparkle */}
          <Sparkles className="hidden sm:block w-5 h-5 text-gold-200 animate-pulse" />
          
          {/* Main text */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-gold-200 animate-bounce" />
              <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-wide">
                🎉 Pesan Antar <span className="text-gold-200 animate-pulse">GRATIS Ongkir!</span>
              </h3>
              <Gift className="w-5 h-5 text-gold-200 animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">
              Siap Melayani Pesanan Catering & Delivery — Cita Rasa Padang Langsung ke Pintu Rumah Anda! 🏠
            </p>
          </div>

          <Sparkles className="hidden sm:block w-5 h-5 text-gold-200 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Animated motorcycle delivery from left to right */}
        <div className="relative h-14 sm:h-16 mt-3 overflow-hidden">
          {/* Road line */}
          <div className="absolute bottom-2 left-0 right-0 h-[2px] bg-white/20 rounded-full" />
          <div className="absolute bottom-2 left-0 right-0 flex items-center gap-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-6 h-[2px] bg-white/30 rounded-full flex-shrink-0 animate-road-dash" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          
          {/* Motorcycle SVG Animation */}
          <div className="animate-delivery-ride absolute bottom-3">
            <svg width="120" height="55" viewBox="0 0 120 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
              {/* Delivery box on the back */}
              <rect x="68" y="4" width="28" height="22" rx="3" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5"/>
              <text x="82" y="18" textAnchor="middle" fill="#411507" fontSize="7" fontWeight="bold">CITRA</text>
              <text x="82" y="24" textAnchor="middle" fill="#411507" fontSize="5" fontWeight="bold">RASA</text>
              {/* Steam / hot food indicators */}
              <path d="M74 4 Q75 0 76 4" stroke="#fff" strokeWidth="1" opacity="0.6" className="animate-steam-1"/>
              <path d="M80 2 Q81 -2 82 2" stroke="#fff" strokeWidth="1" opacity="0.5" className="animate-steam-2"/>
              <path d="M88 4 Q89 0 90 4" stroke="#fff" strokeWidth="1" opacity="0.4" className="animate-steam-3"/>
              
              {/* Motorcycle body */}
              <path d="M30 28 L55 18 L70 20 L75 28 L68 32 L35 32 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1"/>
              {/* Engine */}
              <rect x="42" y="28" width="14" height="8" rx="2" fill="#7F1D1D"/>
              {/* Seat */}
              <path d="M44 18 Q52 12 65 16 L65 20 L44 22 Z" fill="#1E293B"/>
              {/* Handlebar */}
              <line x1="30" y1="28" x2="22" y2="20" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="21" cy="18" r="2" fill="#94A3B8"/>
              {/* Front light */}
              <circle cx="25" cy="30" r="2.5" fill="#FBBF24" className="animate-headlight"/>
              
              {/* Rider */}
              {/* Body */}
              <path d="M48 18 L50 8 L56 8 L58 18" fill="#16A34A" stroke="#15803D" strokeWidth="0.8"/>
              {/* Head with helmet */}
              <circle cx="53" cy="5" r="5" fill="#DC2626"/>
              <path d="M48 5 Q48 0 53 -1 Q58 0 58 5" fill="#991B1B"/>
              {/* Visor */}
              <path d="M50 5 L56 5 L55 7 L51 7 Z" fill="#0EA5E9" opacity="0.8"/>
              {/* Arms on handlebar */}
              <line x1="48" y1="14" x2="30" y2="24" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"/>
              
              {/* Back wheel */}
              <circle cx="70" cy="40" r="10" fill="#1E293B" stroke="#334155" strokeWidth="2"/>
              <circle cx="70" cy="40" r="6" fill="#334155"/>
              <circle cx="70" cy="40" r="2" fill="#64748B"/>
              {/* Spokes */}
              <line x1="70" y1="32" x2="70" y2="48" stroke="#475569" strokeWidth="0.8"/>
              <line x1="62" y1="40" x2="78" y2="40" stroke="#475569" strokeWidth="0.8"/>
              
              {/* Front wheel */}
              <circle cx="25" cy="40" r="10" fill="#1E293B" stroke="#334155" strokeWidth="2"/>
              <circle cx="25" cy="40" r="6" fill="#334155"/>
              <circle cx="25" cy="40" r="2" fill="#64748B"/>
              {/* Spokes */}
              <line x1="25" y1="32" x2="25" y2="48" stroke="#475569" strokeWidth="0.8"/>
              <line x1="17" y1="40" x2="33" y2="40" stroke="#475569" strokeWidth="0.8"/>
              
              {/* Exhaust smoke */}
              <circle cx="82" cy="36" r="2" fill="white" opacity="0.3" className="animate-exhaust-1"/>
              <circle cx="88" cy="34" r="1.5" fill="white" opacity="0.2" className="animate-exhaust-2"/>
              <circle cx="93" cy="32" r="1" fill="white" opacity="0.15" className="animate-exhaust-3"/>
              
              {/* Front fork */}
              <line x1="30" y1="28" x2="25" y2="32" stroke="#64748B" strokeWidth="2.5"/>
              {/* Rear suspension */}
              <line x1="68" y1="28" x2="70" y2="32" stroke="#64748B" strokeWidth="2"/>
              
              {/* Mudguard front */}
              <path d="M17 35 Q25 28 33 35" fill="none" stroke="#DC2626" strokeWidth="1.5"/>
              {/* Mudguard back */}
              <path d="M62 35 Q70 28 78 35" fill="none" stroke="#DC2626" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
