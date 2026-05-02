import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight, Sparkles, Search, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CartItem } from './landing/MenuSection';
import CartModal from './landing/CartModal';

interface PromoBanner {
  id: string;
  title: string;
  image_url: string;
}

interface Product {
  id: string;
  store_id?: string;
  name: string;
  description: string | null;
  selling_price: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

const defaultBanners = [
  { id: 'default-1', title: 'Promo Spesial Hari Ini!', image_url: 'https://images.pexels.com/photos/6287527/pexels-photo-6287527.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'default-2', title: 'Gratis Ongkir Pesan Antar', image_url: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'default-3', title: 'Rendang Asli Minang', image_url: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const categoryIcons: Record<string, string> = {
  rendang: '🥩', 'lauk-pauk': '🍗', lauk: '🍗', sayur: '🥬', sayuran: '🥬',
  sambal: '🌶️', minuman: '🥤', nasi: '🍚', semua: '🍽️', default: '🍽️',
};

function getIcon(category: string | null) {
  const key = (category || '').toLowerCase();
  return categoryIcons[key] || categoryIcons.default;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [banners, setBanners] = useState<PromoBanner[]>(defaultBanners);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [waNumber, setWaNumber] = useState('0881024753628');
  const [freeShipping, setFreeShipping] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const storeId = user?.store_id || import.meta.env.VITE_DEFAULT_STORE_ID || '';

  useEffect(() => {
    fetchBanners();
    fetchProducts();
    fetchSettings();
  }, [storeId]);

  // Auto-play carousel
  useEffect(() => {
    if (banners.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [banners.length]);

  const fetchBanners = async () => {
    let query = supabase
      .from('promo_banners')
      .select('id, title, image_url')
      .eq('is_active', true)
      .order('sort_order');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    let { data } = await query;

    // Fallback to any store if none found
    if ((!data || data.length === 0) && storeId) {
      const { data: fallbackData } = await supabase
        .from('promo_banners')
        .select('id, title, image_url')
        .eq('is_active', true)
        .order('sort_order');
      data = fallbackData;
    }

    if (data && data.length > 0) {
      setBanners(data);
    } else {
      setBanners(defaultBanners);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    // First try with user's store_id
    let query = supabase.from('products').select('id, name, description, selling_price, category, image_url, is_active, store_id').eq('is_active', true).order('category').order('name');
    if (storeId) query = query.eq('store_id', storeId);
    let { data } = await query;

    // If no products found with user's store, fetch from all stores
    if ((!data || data.length === 0) && storeId) {
      const { data: allData } = await supabase
        .from('products')
        .select('id, name, description, selling_price, category, image_url, is_active, store_id')
        .eq('is_active', true)
        .order('category')
        .order('name');
      data = allData;
    }

    if (data) {
      setProducts(data);
      const cats = [...new Set(data.map(p => p.category || 'Lainnya'))];
      setCategories(['Semua', ...cats]);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      // Try customer's store first, then fallback to any store with settings
      let storeIdToUse = storeId;
      
      if (storeIdToUse) {
        const { data } = await supabase
          .from('store_settings')
          .select('setting_key, setting_value')
          .eq('store_id', storeIdToUse)
          .in('setting_key', ['whatsapp_number', 'free_shipping']);
        if (data && data.length > 0) {
          const waRow = data.find(d => d.setting_key === 'whatsapp_number');
          if (waRow?.setting_value) setWaNumber(waRow.setting_value);
          const fsRow = data.find(d => d.setting_key === 'free_shipping');
          setFreeShipping(fsRow?.setting_value === 'true');
          return;
        }
      }

      // Fallback: get settings from any store
      const { data: fallbackData } = await supabase
        .from('store_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whatsapp_number', 'free_shipping'])
        .limit(10);
      if (fallbackData) {
        const waRow = fallbackData.find(d => d.setting_key === 'whatsapp_number');
        if (waRow?.setting_value) setWaNumber(waRow.setting_value);
        const fsRow = fallbackData.find(d => d.setting_key === 'free_shipping');
        setFreeShipping(fsRow?.setting_value === 'true');
      }
    } catch { /* ignore */ }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'Semua' ? true : (p.category || 'Lainnya') === activeCategory;
    const matchSearch = search ? p.name.toLowerCase().includes(search.toLowerCase()) : true;
    return matchCategory && matchSearch;
  });

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (existing && existing.quantity > 1) return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter(c => c.id !== id);
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }).filter(c => c.quantity > 0));
  };

  const deleteFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));
  const clearCart = () => setCart([]);
  const totalCartItems = cart.reduce((sum, c) => sum + c.quantity, 0);
  const getCartQty = (id: string) => cart.find(c => c.id === id)?.quantity || 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-padang-900">
            Halo, <span className="text-spice-600">{user?.name || 'Pelanggan'}!</span> 👋
          </h1>
          <p className="text-padang-600/70 text-sm mt-1">Mau pesan apa hari ini?</p>
        </div>
        {totalCartItems > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-gradient-to-r from-padang-600 to-spice-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-padang-600/20 hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Keranjang</span>
            <span className="bg-gold-400 text-padang-950 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ml-1">
              {totalCartItems}
            </span>
          </button>
        )}
      </div>

      {/* Promo Banner Carousel */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl">
        <div
          ref={bannerRef}
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentBanner * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <div key={banner.id} className="w-full flex-shrink-0 relative">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full aspect-[12/5] object-cover select-none pointer-events-none"
                draggable={false}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === 0 ? "high" : "auto"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-padang-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white drop-shadow-lg">{banner.title}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel controls */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentBanner(prev => prev === 0 ? banners.length - 1 : prev - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentBanner ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Menu Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <h2 className="font-display text-xl font-bold text-padang-900">Menu Tersedia</h2>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-padang-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu favorit..."
            className="w-full pl-10 pr-4 py-2.5 border border-padang-200 rounded-xl text-sm focus:ring-2 focus:ring-padang-500 focus:border-padang-500 outline-none bg-white"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-padang-600 to-spice-600 text-white shadow-md shadow-padang-600/20 scale-105'
                  : 'bg-white text-padang-700 border border-padang-200 hover:bg-padang-50'
              }`}
            >
              <span>{getIcon(cat)}</span> {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-padang-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-padang-500">Tidak ada menu di kategori ini</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((item) => {
              const qty = getCartQty(item.id);
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-md border border-padang-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="relative h-32 sm:h-40 overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy" 
                        decoding="async" 
                      />
                    ) : (
                      <div className="w-full h-full bg-padang-100 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-padang-300" />
                      </div>
                    )}
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-padang-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                        <ShoppingCart className="w-3 h-3" /> {qty}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-padang-900 text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-padang-500/70 mt-0.5 truncate">{item.description || 'Menu Citra Rasa'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-spice-600 font-bold text-sm">{formatPrice(item.selling_price)}</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-spice-100 text-spice-600 rounded-lg flex items-center justify-center hover:bg-spice-200 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-padang-900 text-sm w-5 text-center">{qty}</span>
                          <button onClick={() => addToCart({ id: item.id, name: item.name, price: item.selling_price, quantity: 1, category: item.category || '', storeId: item.store_id })} className="w-7 h-7 bg-padang-100 text-padang-600 rounded-lg flex items-center justify-center hover:bg-padang-200 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ id: item.id, name: item.name, price: item.selling_price, quantity: 1, category: item.category || '', storeId: item.store_id })}
                          className="flex items-center gap-1 bg-gold-400 text-padang-950 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gold-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Pesan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart for mobile */}
      {totalCartItems > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:hidden bg-gradient-to-r from-padang-600 to-spice-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl shadow-padang-600/40 flex items-center gap-3 hover:scale-105 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Keranjang ({totalCartItems})</span>
          <span className="bg-gold-400 text-padang-950 text-xs font-bold px-2 py-0.5 rounded-full">
            {formatPrice(cart.reduce((sum, c) => sum + c.price * c.quantity, 0))}
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
        customerId={user?.id}
        storeId={storeId}
      />
    </div>
  );
}
