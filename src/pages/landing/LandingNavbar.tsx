import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, LogIn, ShoppingCart, Shield } from 'lucide-react';
import type { AuthUser } from '../../contexts/AuthContext';

interface NavbarProps {
  user: AuthUser | null;
  onGoToLogin: () => void;
  onGoToDashboard: () => void;
  onLogout: () => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function LandingNavbar({ user, onGoToLogin, onGoToDashboard, onLogout, cartCount, onCartClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Beranda', href: '#hero' },
    { label: 'Menu', href: '#menu' },
    { label: 'Tentang', href: '#about' },
    { label: 'Lokasi', href: '#location' },
    { label: 'Pembayaran', href: '#payment' },
  ];

  const roleBadgeMap: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    member: 'Anggota',
    pelanggan: 'Pelanggan',
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-padang-950/95 backdrop-blur-xl shadow-2xl py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-3 group">
          <img src="/logo-citrarasa.png" alt="Citra Rasa" className="h-14 w-auto group-hover:scale-110 transition-transform duration-300 object-contain drop-shadow-lg" />
          {/* <span className="font-display text-xl font-bold text-white tracking-wide">Citra Rasa</span> */}
        </a>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link-landing text-sm tracking-wide">{l.label}</a>
          ))}

          {/* Cart button */}
          <button onClick={onCartClick} className="relative text-white/80 hover:text-white transition-colors p-2">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-spice-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-cart-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
                <Shield className="w-3.5 h-3.5 text-gold-400" />
                <span className="text-white text-sm font-medium">{user.name || user.email}</span>
                <span className="text-gold-400 text-xs">• {roleBadgeMap[user.role] || user.role}</span>
              </div>
              <button onClick={onGoToDashboard} className="flex items-center gap-1.5 bg-gradient-to-r from-padang-600 to-spice-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5">
                <LayoutDashboard className="w-4 h-4" /> {user.role === 'pelanggan' ? 'Pesanan Saya' : 'Dashboard'}
              </button>
              <button onClick={onLogout} className="flex items-center gap-1.5 border border-white/30 text-white/80 hover:text-white hover:border-white/60 px-3 py-2 rounded-full text-sm transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={onGoToLogin} className="flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-500 text-padang-950 px-5 py-2 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-gold-400/30 transition-all hover:-translate-y-0.5 ml-2">
              <LogIn className="w-4 h-4" /> Masuk / Daftar
            </button>
          )}
        </div>

        {/* Mobile buttons */}
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={onCartClick} className="relative text-white p-2">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-spice-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Toggle menu">
            <div className="w-6 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-padang-950/98 backdrop-blur-xl border-t border-white/10 mt-2 animate-fade-in">
          <div className="px-4 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-white/80 hover:text-gold-400 transition-colors py-2 text-sm font-medium">{l.label}</a>
            ))}
            <hr className="border-white/10" />
            {user ? (
              <>
                <div className="flex items-center gap-2 py-2">
                  <Shield className="w-4 h-4 text-gold-400" />
                  <span className="text-white text-sm">{user.name || user.email}</span>
                  <span className="text-gold-400 text-xs">• {roleBadgeMap[user.role] || user.role}</span>
                </div>
                <button onClick={() => { onGoToDashboard(); setMobileOpen(false); }} className="flex items-center gap-2 text-gold-400 py-2 text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => { onLogout(); setMobileOpen(false); }} className="flex items-center gap-2 text-red-400 py-2 text-sm font-medium">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <button onClick={() => { onGoToLogin(); setMobileOpen(false); }} className="flex items-center gap-2 text-gold-400 py-2 text-sm font-bold">
                <LogIn className="w-4 h-4" /> Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
