import { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Clock, CreditCard, QrCode, Banknote, Star, Flame, UtensilsCrossed, Heart, ArrowUp, Instagram, Facebook, MessageCircle, X } from 'lucide-react';
import { APP_VERSION } from '../../version';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function AboutSection() {
  const { ref, inView } = useInView();
  return (
    <section id="about" className="py-20 sm:py-28 bg-padang-950 relative overflow-hidden">
      <div className="absolute inset-0 pattern-overlay opacity-30" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div ref={ref} className={`grid md:grid-cols-2 gap-12 lg:gap-20 items-center ${inView ? 'animate-slide-up' : 'opacity-0'}`}>
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img src="https://images.pexels.com/photos/262047/pexels-photo-262047.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Suasana Restoran" className="w-full h-80 sm:h-96 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-padang-950/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-gold-400 to-padang-600 rounded-2xl p-6 shadow-2xl animate-float">
              <div className="text-center text-white">
                <div className="font-display text-3xl font-bold">⭐</div>
                <div className="text-sm font-light">4.9 Rating</div>
              </div>
            </div>
            <div className="absolute -top-4 -left-4 bg-white rounded-2xl p-4 shadow-xl animate-float-delayed">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (<Star key={i} className="w-4 h-4 text-gold-400 fill-gold-400" />))}
                </div>
                <span className="text-sm font-semibold text-padang-800">4.9</span>
              </div>
            </div>
          </div>
          <div>
            <span className="inline-block text-gold-400 font-semibold text-sm tracking-widest uppercase mb-3">Cerita Kami</span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Warisan Rasa dari <span className="text-gold-400">Minangkabau</span>
            </h2>
            <p className="text-white/70 leading-relaxed mb-6">
              Citra Rasa hadir membawa cita rasa autentik Minangkabau ke setiap sudut Nusantara. Setiap rempah berkualitas, dan setiap resep dijaga keasliannya melalui generasi juru masak keluarga.
            </p>
            <p className="text-white/70 leading-relaxed mb-8">
              Kami percaya bahwa masakan Padang bukan sekadar makanan — ia adalah warisan budaya, pengikat tali silaturahmi, dan ungkapan cinta yang dihidangkan di atas piring.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Flame, label: 'Rempah', value: 'Berkualitas' },
                { icon: UtensilsCrossed, label: 'Koki Berpengalaman', value: 'Resep Turun-temurun' },
                { icon: Heart, label: 'Dengan Cinta', value: 'Setiap Hidangan' },
                { icon: Star, label: 'Rating', value: '4.9 / 5.0' },
              ].map((item) => (
                <div key={item.label} className="glass-card p-4">
                  <item.icon className="w-5 h-5 text-gold-400 mb-2" />
                  <div className="text-white font-semibold text-sm">{item.label}</div>
                  <div className="text-white/50 text-xs mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LocationSection() {
  const { ref, inView } = useInView();
  return (
    <section id="location" className="py-20 sm:py-28 bg-gradient-to-b from-white to-padang-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center mb-14 ${inView ? 'animate-slide-up' : 'opacity-0'}`}>
          <span className="inline-block text-padang-600 font-semibold text-sm tracking-widest uppercase mb-3">Kunjungi Kami</span>
          <h2 className="section-title-landing">Lokasi <span className="text-spice-600">Restoran</span></h2>
          <p className="section-subtitle-landing max-w-xl mx-auto">Temukan kami di lokasi yang strategis dan mudah dijangkau</p>
          <div className="spice-divider" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="rounded-3xl overflow-hidden shadow-xl h-80 md:h-auto">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1636776692544!2d106.474137!3d-6.2421481!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69ffe0bd8c8ec9%3A0x97597b9fae24ebd0!2sCitra%20Rasa%20Padang!5e0!3m2!1sid!2sid!4v1777628632653!5m2!1sid!2sid" width="600" height="450" style={{ border: 0, minHeight: '320px' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Lokasi Citra Rasa" />
          </div>
          <div className="flex flex-col gap-5">
            {[
              { icon: MapPin, title: 'Alamat', lines: ['Perum Mustika Tigaraksa blok B2 no 4, Pasir Nangka, Kec. Tigaraksa, Kabupaten Tangerang', 'Banten'] },
              { icon: Phone, title: 'Telepon', lines: ['0857-5391-6487 (WhatsApp)', '08810-2475-3628 (WhatsApp)'] },
              { icon: Clock, title: 'Jam Operasional', lines: ['Senin - Jumat: 10.00 - 22.00 WIB', 'Sabtu - Minggu: 09.00 - 22.00 WIB'] },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-padang-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-padang-100 to-gold-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-padang-700" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-padang-900 text-lg mb-1">{item.title}</h3>
                    {item.lines.map((line) => (<p key={line} className="text-padang-700/70 text-sm leading-relaxed">{line}</p>))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PaymentSection() {
  const { ref, inView } = useInView();
  const [selectedPayment, setSelectedPayment] = useState<{ title: string, type: string } | null>(null);

  const payments = [
    { type: 'cash', icon: Banknote, title: 'Tunai', desc: 'Bayar langsung di kasir dengan uang tunai.', color: 'from-leaf-500/20 to-leaf-700/20', border: 'border-leaf-500/30', iconBg: 'bg-leaf-500/20', iconColor: 'text-leaf-400' },
    { type: 'qris', icon: QrCode, title: 'QRIS', desc: 'Scan kode QR dari aplikasi e-wallet Anda.', color: 'from-blue-500/20 to-blue-700/20', border: 'border-blue-500/30', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
    { type: 'ewallet', icon: QrCode, title: 'E-Wallet', desc: 'Bayar Lewat Dompet Digital (DANA).', color: 'from-indigo-500/20 to-indigo-700/20', border: 'border-indigo-500/30', iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
    { type: 'bank', icon: CreditCard, title: 'Transfer Bank', desc: 'Terima transfer bank BJB.', color: 'from-gold-400/20 to-gold-600/20', border: 'border-gold-400/30', iconBg: 'bg-gold-400/20', iconColor: 'text-gold-400' },
  ];

  return (
    <section id="payment" className="py-20 sm:py-28 bg-padang-950 relative overflow-hidden">
      <div className="absolute inset-0 pattern-overlay opacity-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div ref={ref} className={`text-center mb-14 ${inView ? 'animate-slide-up' : 'opacity-0'}`}>
          <span className="inline-block text-gold-400 font-semibold text-sm tracking-widest uppercase mb-3">Metode Pembayaran</span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-2">Bayar dengan <span className="text-gold-400">Mudah</span></h2>
          <p className="text-white/60 text-lg font-light max-w-xl mx-auto">Pilih metode pembayaran yang paling nyaman untuk Anda</p>
          <div className="spice-divider" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {payments.map((m) => (
            <div
              key={m.title}
              onClick={() => m.type !== 'cash' ? setSelectedPayment({ title: m.title, type: m.type }) : null}
              className={`glass-card p-8 text-center transition-all duration-500 border ${m.border} bg-gradient-to-b ${m.color} ${m.type !== 'cash' ? 'cursor-pointer hover:scale-105' : 'hover:scale-105'}`}
            >
              <div className={`w-16 h-16 ${m.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <m.icon className={`w-8 h-8 ${m.iconColor}`} />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-3">{m.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modals */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative p-6 bg-gradient-to-br from-padang-50 to-white border-b border-padang-100">
              <button
                onClick={() => setSelectedPayment(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-padang-100 text-padang-600 hover:bg-padang-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-display text-2xl font-bold text-padang-900 pr-8">{selectedPayment.title}</h3>
            </div>

            <div className="p-6">
              {selectedPayment.type === 'qris' && (
                <div className="text-center">
                  <p className="text-padang-600 mb-6">Scan QR Code di bawah ini menggunakan aplikasi e-wallet atau mobile banking Anda.</p>
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-padang-100 inline-block mb-4">
                    <img src="/qris.png" alt="QRIS" className="w-64 h-64 object-contain mx-auto" />
                  </div>
                  <p className="text-sm text-padang-500 font-medium">Atas Nama: Alfarel Rizqi I</p>
                </div>
              )}

              {selectedPayment.type === 'ewallet' && (
                <div className="text-center space-y-6">
                  <img src="/Logo_dana_blue.svg" alt="DANA" className="h-16 mx-auto object-contain" />
                  <div className="bg-padang-50 rounded-2xl p-6 border border-padang-100">
                    <p className="text-padang-500 text-sm mb-2 font-medium">Nomor DANA</p>
                    <p className="text-3xl font-display font-bold text-padang-900 mb-1 tracking-wider">0881024753628</p>
                    <p className="text-padang-600 font-medium">A.n Alfarel Rizqi</p>
                  </div>
                  <p className="text-sm text-padang-500">Silakan lakukan transfer ke nomor di atas.</p>
                </div>
              )}

              {selectedPayment.type === 'bank' && (
                <div className="text-center space-y-6">
                  <img src="/logo bjb.png" alt="Bank BJB" className="h-16 mx-auto object-contain" />
                  <div className="bg-padang-50 rounded-2xl p-6 border border-padang-100">
                    <p className="text-padang-500 text-sm mb-2 font-medium">Nomor Rekening</p>
                    <p className="text-3xl font-display font-bold text-padang-900 mb-1 tracking-wider">06522113810004</p>
                    <p className="text-padang-600 font-medium">A.n Rustinih</p>
                  </div>
                  <p className="text-sm text-padang-500">Silakan lakukan transfer ke rekening di atas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function Footer({ onSecretClick }: { onSecretClick?: () => void }) {
  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      if (onSecretClick) onSecretClick();
      setClickCount(0); // Reset after trigger
    }
  };

  return (
    <footer className="bg-padang-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo-citrarasa.png" alt="Citra Rasa" className="h-14 w-auto object-contain drop-shadow-md" />
              {/* <span className="font-display text-xl font-bold text-white">Citra Rasa</span> */}
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-5">Menyajikan autentik masakan Minangkabau. Setiap suapan adalah perjalanan ke ranah Minang.</p>
            <div className="flex gap-3">
              {[Instagram, Facebook, MessageCircle].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-gold-400/20 hover:text-gold-400 transition-all text-white/60">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display font-bold text-white mb-4">Menu</h4>
            <ul className="space-y-2.5">
              {['Rendang', 'Lauk-Pauk', 'Sayur-Sayuran', 'Sambal', 'Minuman'].map((item) => (
                <li key={item}><a href="#menu" className="text-white/50 hover:text-gold-400 transition-colors text-sm">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-white mb-4">Informasi</h4>
            <ul className="space-y-2.5">
              {['Tentang Kami', 'Lokasi', 'Pembayaran', 'Reservasi'].map((item) => (
                <li key={item}><a href="#" className="text-white/50 hover:text-gold-400 transition-colors text-sm">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-white mb-4">Jam Buka</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex justify-between text-white/50"><span>Senin - Sabtu</span><span className="text-white/70">10:00 - 22:00</span></li>
              <li className="flex justify-between text-white/50"><span>Minggu</span><span className="text-white/70">09:00 - 22:00</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">&copy; 2025 Citra Rasa. Hak cipta dilindungi.</p>
          <div className="text-right">
            <p className="text-white/30 text-xs mb-1">Dibuat dengan <Heart className="w-3 h-3 inline text-spice-500 fill-spice-500" /> oleh <span onClick={handleSecretClick} className="cursor-pointer select-none">Oneto Group</span></p>
            <p className="text-white/20 text-[10px]">Versi {APP_VERSION}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-padang-600 to-spice-600 text-white rounded-full shadow-xl shadow-padang-600/30 flex items-center justify-center hover:scale-110 transition-all duration-300" aria-label="Scroll to top">
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
