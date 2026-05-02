import { ChevronDown, MapPin, Flame } from 'lucide-react';

export default function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="/Foto Sampul.jpg" alt="Makanan Padang" className="w-full h-full object-cover" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-b from-padang-950/70 via-padang-950/50 to-[#4a1808]/95" />
        <div
          className="absolute inset-x-0 bottom-0 h-28 sm:h-36"
          style={{
            background: 'linear-gradient(180deg, rgba(222, 93, 14, 0) 0%, rgba(147, 53, 19, 0.18) 42%, rgba(91, 28, 10, 0.8) 82%, #411507 100%)',
          }}
        />
        <div className="absolute inset-0 pattern-overlay" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-gold-400/20 backdrop-blur-sm border border-gold-400/30 rounded-full px-5 py-2 mb-8 animate-fade-in">
          <Flame className="w-4 h-4 text-gold-400" />
          <span className="text-gold-300 text-sm font-medium tracking-wider uppercase">Autentik Cita Rasa Minangkabau</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 text-shadow-lg leading-tight animate-slide-up">
          Citra <span className="animate-shimmer-gold drop-shadow-lg">Rasa</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light leading-relaxed animate-slide-up stagger-2">
          Nikmati keautentikan masakan Minangkabau yang diracik dengan rempah pilihan
          dan dihidangkan dengan penuh kasih sayang
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-3">
          <a href="#menu" className="btn-primary-landing">
            Lihat Menu Kami
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </a>
          <a href="#location" className="btn-outline-landing">
            <MapPin className="w-4 h-4" />
            Lokasi Restoran
          </a>
        </div>

        <div className="mt-16 flex items-center justify-center gap-8 sm:gap-12 animate-slide-up stagger-4">
          {[
            { value: '10+', label: 'Menu Pilihan' },
            { value: '50+', label: 'Pelanggan Setia' },
            { value: '⭐ 4.9', label: 'Rating' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-bold text-gold-400">{stat.value}</div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/40" />
      </div>
    </section>
  );
}
