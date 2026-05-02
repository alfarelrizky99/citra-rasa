import { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { AuthUser } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LogoSplash from './landing/LogoSplash';
import LandingNavbar from './landing/LandingNavbar';
import HeroSection from './landing/HeroSection';
import DeliveryBanner from './landing/DeliveryBanner';
import MenuSection, { type CartItem } from './landing/MenuSection';
import CartModal from './landing/CartModal';
import { HeroToDeliveryDivider, DeliveryToMenuDivider, MenuToAboutDivider, AboutToLocationDivider, LocationToPaymentDivider } from './landing/SectionDividers';
import { AboutSection, LocationSection, PaymentSection, Footer, ScrollToTop } from './landing/Sections';

interface LandingPageProps {
  user: AuthUser | null;
  onGoToCustomerLogin: () => void;
  onGoToDashboard: () => void;
  onLogout: () => void;
  onSecretClick?: () => void;
}

const DEFAULT_WA = '0881024753628';

export default function LandingPage({ user, onGoToCustomerLogin, onGoToDashboard, onLogout, onSecretClick }: LandingPageProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [waNumber, setWaNumber] = useState(DEFAULT_WA);
  const [freeShipping, setFreeShipping] = useState(false);

  // Determine which store to show menu from
  const storeId = user?.store_id || import.meta.env.VITE_DEFAULT_STORE_ID || '';

  // Fetch WA number and free shipping from store_settings
  useEffect(() => {
    if (!storeId) return;
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('setting_key, setting_value')
          .eq('store_id', storeId)
          .in('setting_key', ['whatsapp_number', 'free_shipping']);
        if (data) {
          const waRow = data.find(d => d.setting_key === 'whatsapp_number');
          if (waRow?.setting_value) setWaNumber(waRow.setting_value);
          const fsRow = data.find(d => d.setting_key === 'free_shipping');
          setFreeShipping(fsRow?.setting_value === 'true');
        }
      } catch {
        // Table may not exist yet, use default
      }
    };
    fetchSettings();
  }, [storeId]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.id !== id);
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.id !== id) return c;
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }).filter(c => c.quantity > 0);
    });
  };

  const deleteFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const clearCart = () => setCart([]);

  const totalCartItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Check if user is a pelanggan (customer)
  const isCustomer = user?.role === 'pelanggan';

  return (
    <div className="min-h-screen bg-white">
      <LogoSplash />
      <LandingNavbar
        user={user}
        onGoToLogin={onGoToCustomerLogin}
        onGoToDashboard={onGoToDashboard}
        onLogout={onLogout}
        cartCount={totalCartItems}
        onCartClick={() => setCartOpen(true)}
      />
      <HeroSection />
      <HeroToDeliveryDivider />
      <DeliveryBanner />
      <DeliveryToMenuDivider />
      <MenuSection
        storeId={storeId}
        cart={cart}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
      />
      <MenuToAboutDivider />
      <AboutSection />
      <AboutToLocationDivider />
      <LocationSection />
      <LocationToPaymentDivider />
      <PaymentSection />
      <Footer onSecretClick={onSecretClick} />
      <ScrollToTop />

      {/* Floating cart button (mobile) */}
      {totalCartItems > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 right-6 z-50 w-14 h-14 bg-gradient-to-br from-padang-600 to-spice-600 text-white rounded-full shadow-xl shadow-padang-600/40 flex items-center justify-center hover:scale-110 transition-all duration-300 sm:hidden"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-gold-400 text-padang-950 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {totalCartItems}
          </span>
        </button>
      )}

      <CartModal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={updateCartQty}
        onRemove={deleteFromCart}
        onClearCart={clearCart}
        waNumber={waNumber}
        freeShipping={freeShipping}
        customerId={isCustomer ? user?.id : undefined}
        storeId={storeId}
      />
    </div>
  );
}
